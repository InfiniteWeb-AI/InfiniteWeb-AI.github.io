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
  }

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    // Legacy example keys from template (kept for compatibility, unused here)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Domain-specific storage tables (arrays)
    const tables = [
      'service_offerings',
      'booking_slots',
      'service_bookings',
      'garage_door_models',
      'door_quote_requests',
      'maintenance_plans',
      'maintenance_plan_enrollments',
      'coupons',
      'service_packages',
      'help_categories',
      'help_articles',
      'help_requests',
      'branches',
      'branch_coverages',
      'estimator_service_options',
      'price_estimate_sessions',
      'reviews',
      'contact_inquiries',
      // optional config-like tables
      'contact_topics_config',
      'policies_privacy_html',
      'policies_terms_html',
      'policies_booking_policies_html'
    ];

    tables.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        // For HTML content keys we store a string, not an array
        if (
          key === 'policies_privacy_html' ||
          key === 'policies_terms_html' ||
          key === 'policies_booking_policies_html'
        ) {
          localStorage.setItem(key, JSON.stringify(''));
        } else if (key === 'contact_topics_config') {
          // store an object with topics and contact info, default empty
          localStorage.setItem(
            key,
            JSON.stringify({ topics: [], primary_phone: '', sales_phone: '', emergency_phone: '', primary_email: '', business_hours: '', response_time_message: '' })
          );
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
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

  _nowIso() {
    return new Date().toISOString();
  }

  _toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  _unique(arr) {
    return Array.from(new Set(arr));
  }

  _caseInsensitiveEquals(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    return a.toLowerCase() === b.toLowerCase();
  }

  _stringIncludes(haystack, needle) {
    if (!haystack || !needle) return false;
    return haystack.toLowerCase().includes(needle.toLowerCase());
  }

  _parseDateOnly(dateStr) {
    if (!dateStr) return null;
    // Expecting 'YYYY-MM-DD' or ISO; extract first 10 chars
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  _formatTwoDigits(num) {
    return num < 10 ? '0' + num : String(num);
  }

  // ------------------------
  // Foreign key resolution helpers
  // ------------------------

  _resolveHelpArticle(article, categories) {
    if (!article) return null;
    const cat = categories.find((c) => c.id === article.category_id) || null;
    return { ...article, category: cat };
  }

  _resolveBookingSlot(slot, serviceOfferings, branches) {
    if (!slot) return null;
    const service = serviceOfferings.find((s) => s.id === slot.service_offering_id) || null;
    const branch = branches.find((b) => b.id === slot.branch_id) || null;
    return { ...slot, service_offering: service, branch: branch };
  }

  _resolveEstimatorOptionsForSession(session, options) {
    if (!session) return null;
    const selected = (session.selected_service_option_ids || []).map(
      (id) => options.find((o) => o.id === id) || null
    );
    return { ...session, selected_service_options: selected };
  }

  // ------------------------
  // Helper functions from spec
  // ------------------------

  // Internal helper to get or create the current PriceEstimateSession
  _getOrCreateCurrentEstimateSession() {
    const sessions = this._getFromStorage('price_estimate_sessions', []);
    if (sessions.length === 0) {
      const newSession = {
        id: this._generateId('est'),
        selected_service_option_ids: [],
        zip: '',
        door_configuration: 'single_door',
        appointment_day_of_week: 'monday',
        appointment_time_window: 'morning',
        estimated_total: 0,
        linked_booking_id: null,
        contact_name: '',
        contact_phone: '',
        created_at: this._nowIso()
      };
      sessions.push(newSession);
      this._saveToStorage('price_estimate_sessions', sessions);
      return newSession;
    }

    // Return the most recently created session (last in array)
    return sessions[sessions.length - 1];
  }

  // Internal helper to recalculate PriceEstimateSession.estimated_total
  _updateEstimateTotal(session) {
    if (!session) return session;
    const options = this._getFromStorage('estimator_service_options', []);
    const selectedIds = session.selected_service_option_ids || [];

    let total = 0;
    selectedIds.forEach((id) => {
      const opt = options.find((o) => o.id === id);
      if (opt) {
        total += this._toNumber(opt.base_price, 0);
      }
    });

    // Simple adjustment rules (example logic only):
    // - Evening appointments: +10%
    // - Weekend days (saturday/sunday): +15%
    const day = session.appointment_day_of_week;
    const window = session.appointment_time_window;

    if (window === 'evening') {
      total *= 1.1;
    }
    if (day === 'saturday' || day === 'sunday') {
      total *= 1.15;
    }

    // Round to 2 decimals
    session.estimated_total = Math.round(total * 100) / 100;

    // Persist update
    const sessions = this._getFromStorage('price_estimate_sessions', []);
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = session;
      this._saveToStorage('price_estimate_sessions', sessions);
    }

    return session;
  }

  // Internal helper to validate coupon and compute discount
  _applyCouponToServicePackage(coupon, serviceCode, pkg, priceBefore, callOutFee) {
    if (!coupon || !coupon.is_active) {
      return {
        coupon_applied: false,
        discount_amount: 0,
        price_after_coupon: priceBefore,
        estimated_total_with_call_out: priceBefore + callOutFee
      };
    }

    const now = new Date();
    if (coupon.start_date) {
      const start = new Date(coupon.start_date);
      if (!Number.isNaN(start.getTime()) && now < start) {
        return {
          coupon_applied: false,
          discount_amount: 0,
          price_after_coupon: priceBefore,
          estimated_total_with_call_out: priceBefore + callOutFee
        };
      }
    }
    if (coupon.end_date) {
      const end = new Date(coupon.end_date);
      if (!Number.isNaN(end.getTime()) && now > end) {
        return {
          coupon_applied: false,
          discount_amount: 0,
          price_after_coupon: priceBefore,
          estimated_total_with_call_out: priceBefore + callOutFee
        };
      }
    }

    // Check applicable service codes if present
    if (Array.isArray(coupon.applicable_service_codes) && coupon.applicable_service_codes.length > 0) {
      if (!coupon.applicable_service_codes.includes(serviceCode)) {
        return {
          coupon_applied: false,
          discount_amount: 0,
          price_after_coupon: priceBefore,
          estimated_total_with_call_out: priceBefore + callOutFee
        };
      }
    }

    // Minimum order total check
    if (typeof coupon.min_order_total === 'number' && priceBefore < coupon.min_order_total) {
      return {
        coupon_applied: false,
        discount_amount: 0,
        price_after_coupon: priceBefore,
        estimated_total_with_call_out: priceBefore + callOutFee
      };
    }

    let discount = 0;
    if (coupon.discount_type === 'percent') {
      discount = (priceBefore * this._toNumber(coupon.discount_value, 0)) / 100;
    } else if (coupon.discount_type === 'amount') {
      discount = this._toNumber(coupon.discount_value, 0);
    } else if (coupon.discount_type === 'fixed_price') {
      // fixed price for the service total
      const target = this._toNumber(coupon.discount_value, priceBefore);
      discount = Math.max(0, priceBefore - target);
    }

    // Cap discount if max_discount_amount specified
    if (typeof coupon.max_discount_amount === 'number' && discount > coupon.max_discount_amount) {
      discount = coupon.max_discount_amount;
    }

    const priceAfter = Math.max(0, priceBefore - discount);
    const estimatedWithCallOut = priceAfter + callOutFee;

    return {
      coupon_applied: true,
      discount_amount: Math.round(discount * 100) / 100,
      price_after_coupon: Math.round(priceAfter * 100) / 100,
      estimated_total_with_call_out: Math.round(estimatedWithCallOut * 100) / 100
    };
  }

  // Internal helper to compute deposit details
  _calculateDepositFromTotal(serviceCode, total, paymentPreference, serviceOffering) {
    const result = {
      deposit_required: false,
      deposit_percentage: 0,
      deposit_amount: 0
    };

    if (!total || !Number.isFinite(total)) return result;

    if (paymentPreference !== 'online_deposit') return result;

    // Simple rule: if service supports online deposit, require 20%
    const supportsDeposit = serviceOffering && serviceOffering.supports_online_deposit;
    if (!supportsDeposit) return result;

    const percentage = 20; // 20%
    const amount = Math.round((total * percentage) ) / 100; // careful: percentage is percent, will adjust below

    return {
      deposit_required: true,
      deposit_percentage: percentage,
      deposit_amount: Math.round((total * percentage) / 100 * 100) / 100
    };
  }

  // Internal helper to look up branches by ZIP
  _findNearestBranchesForZip(zip) {
    const coverages = this._getFromStorage('branch_coverages', []);
    const branches = this._getFromStorage('branches', []);

    const matches = coverages.filter((c) => c.zip === zip);
    matches.sort((a, b) => this._toNumber(a.distance_miles, 0) - this._toNumber(b.distance_miles, 0));

    return matches.map((coverage) => {
      const branch = branches.find((b) => b.id === coverage.branch_id) || null;
      return { coverage, branch };
    });
  }

  // Internal helper to link estimate session to a booking
  _linkEstimateSessionToBooking(session, contactName, contactPhone) {
    if (!session) return null;

    const options = this._getFromStorage('estimator_service_options', []);
    const serviceOfferings = this._getFromStorage('service_offerings', []);

    // Determine service offering from first selected estimator option
    let serviceOffering = null;
    for (let i = 0; i < session.selected_service_option_ids.length; i++) {
      const opt = options.find((o) => o.id === session.selected_service_option_ids[i]);
      if (opt) {
        serviceOffering = serviceOfferings.find((s) => s.id === opt.service_offering_id) || null;
        if (serviceOffering) break;
      }
    }

    const serviceCode = serviceOffering ? serviceOffering.code : 'general_repair';

    // Derive a concrete date-time from day_of_week + time_window (next occurrence)
    const now = new Date();
    const currentDow = now.getDay(); // 0=Sunday

    const dayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };
    const targetDow = dayMap[session.appointment_day_of_week] ?? 1;
    let diff = targetDow - currentDow;
    if (diff <= 0) diff += 7; // schedule for next week if today or past

    const serviceDateObj = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diff,
      0,
      0,
      0,
      0
    );

    // Map time window to an approximate hour
    let hour = 9;
    if (session.appointment_time_window === 'mid_day') hour = 12;
    else if (session.appointment_time_window === 'afternoon' || session.appointment_time_window === 'two_to_four_pm') hour = 14;
    else if (session.appointment_time_window === 'evening') hour = 18;

    serviceDateObj.setHours(hour, 0, 0, 0);
    const serviceDateIso = serviceDateObj.toISOString();

    // Create booking with minimal address (ZIP from estimate, others empty)
    const bookingResult = this.createServiceBooking(
      serviceCode,
      serviceOffering ? serviceOffering.id : undefined,
      null,
      serviceDateIso,
      undefined,
      undefined,
      undefined,
      '', // serviceStreet
      '', // serviceCity
      '', // serviceState
      session.zip || '',
      contactName,
      contactPhone,
      undefined,
      'pay_at_service',
      undefined,
      undefined,
      'estimator_page'
    );

    // Attach booking to session
    const sessions = this._getFromStorage('price_estimate_sessions', []);
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx].linked_booking_id = bookingResult.booking_id;
      sessions[idx].contact_name = contactName;
      sessions[idx].contact_phone = contactPhone;
      this._saveToStorage('price_estimate_sessions', sessions);
    }

    return bookingResult;
  }

  // ------------------------
  // Core interface implementations
  // ------------------------

  // getHomeOverview()
  getHomeOverview() {
    const serviceOfferings = this._getFromStorage('service_offerings', []);
    const bookingSlots = this._getFromStorage('booking_slots', []);
    const coupons = this._getFromStorage('coupons', []);
    const branches = this._getFromStorage('branches', []);

    // Emergency highlight
    const emergencyOfferings = serviceOfferings.filter(
      (s) => s.is_emergency && s.supports_same_day && s.is_bookable
    );
    const isAvailableToday = emergencyOfferings.length > 0;
    const sameDayCutoffTime = '17:00';
    const emergencyMessage = isAvailableToday
      ? 'Same-day emergency garage door repair may be available before 17:00. Call or book online to confirm.'
      : 'Online booking is available; please call to check emergency repair availability in your area.';

    // Typical call-out fee range from booking slots, fallback to service offerings
    let fees = bookingSlots
      .filter((s) => typeof s.base_call_out_fee === 'number')
      .map((s) => s.base_call_out_fee);

    if (fees.length === 0) {
      fees = serviceOfferings
        .filter((s) => typeof s.base_call_out_fee === 'number')
        .map((s) => s.base_call_out_fee);
    }

    let feeMin = null;
    let feeMax = null;
    if (fees.length > 0) {
      feeMin = Math.min(...fees);
      feeMax = Math.max(...fees);
    }

    // Today's business hours (aggregate across branches)
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekdayLabel = dayNames[today.getDay()];
    const isWeekend = weekdayLabel === 'saturday' || weekdayLabel === 'sunday';

    let opensAt = null;
    let closesAt = null;
    const openTimes = [];
    const closeTimes = [];

    branches.forEach((b) => {
      if (isWeekend) {
        if (b.weekend_open_time) openTimes.push(b.weekend_open_time);
        if (b.weekend_close_time) closeTimes.push(b.weekend_close_time);
      } else {
        if (b.weekday_open_time) openTimes.push(b.weekday_open_time);
        if (b.weekday_close_time) closeTimes.push(b.weekday_close_time);
      }
    });

    if (openTimes.length > 0) {
      opensAt = openTimes.sort()[0];
    }
    if (closeTimes.length > 0) {
      closesAt = closeTimes.sort()[closeTimes.length - 1];
    }

    // Featured service offerings: choose bookable ones, prioritize emergency/same-day
    const featuredServices = serviceOfferings
      .filter((s) => s.is_bookable)
      .sort((a, b) => {
        const aScore = (a.is_emergency ? -2 : 0) + (a.supports_same_day ? -1 : 0);
        const bScore = (b.is_emergency ? -2 : 0) + (b.supports_same_day ? -1 : 0);
        return aScore - bScore;
      })
      .slice(0, 5);

    // Featured coupons: use active coupons; mark is_featured derived flag
    const now = new Date();
    const activeCoupons = coupons.filter((c) => {
      if (!c.is_active) return false;
      if (c.start_date) {
        const sd = new Date(c.start_date);
        if (!Number.isNaN(sd.getTime()) && now < sd) return false;
      }
      if (c.end_date) {
        const ed = new Date(c.end_date);
        if (!Number.isNaN(ed.getTime()) && now > ed) return false;
      }
      return true;
    });

    const featuredCoupons = activeCoupons.slice(0, 5).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description || '',
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      max_discount_amount: c.max_discount_amount || null,
      applies_to: c.applies_to,
      is_spring_repair_only: !!c.is_spring_repair_only,
      min_order_total: typeof c.min_order_total === 'number' ? c.min_order_total : null,
      start_date: c.start_date || null,
      end_date: c.end_date || null,
      is_active: c.is_active,
      terms: c.terms || '',
      is_featured: true // derived; all returned here are considered featured
    }));

    return {
      emergency_highlight: {
        is_available_today: isAvailableToday,
        same_day_cutoff_time: sameDayCutoffTime,
        message: emergencyMessage
      },
      typical_call_out_fee_range: {
        min: feeMin,
        max: feeMax,
        currency: 'USD'
      },
      today_business_hours: {
        weekday_label: weekdayLabel,
        opens_at: opensAt,
        closes_at: closesAt
      },
      featured_service_offerings: featuredServices,
      featured_coupons: featuredCoupons
    };
  }

  // getBookableServiceOfferings(isEmergency?, supportsSameDay?, serviceCodes?)
  getBookableServiceOfferings(isEmergency, supportsSameDay, serviceCodes) {
    const offerings = this._getFromStorage('service_offerings', []);

    let result = offerings.filter((s) => s.is_bookable);

    if (typeof isEmergency === 'boolean') {
      result = result.filter((s) => !!s.is_emergency === isEmergency);
    }

    if (typeof supportsSameDay === 'boolean') {
      result = result.filter((s) => !!s.supports_same_day === supportsSameDay);
    }

    if (Array.isArray(serviceCodes) && serviceCodes.length > 0) {
      result = result.filter((s) => serviceCodes.includes(s.code));
    }

    return result;
  }

  // checkZipCoverage(zip)
  checkZipCoverage(zip) {
    const nearest = this._findNearestBranchesForZip(zip);

    const branchesInfo = nearest.map(({ coverage, branch }) => ({
      branch_id: coverage.branch_id,
      branch_name: branch ? branch.name : null,
      city: branch ? branch.city : null,
      state: branch ? branch.state || null : null,
      zip: branch ? branch.zip : null,
      distance_miles: coverage.distance_miles,
      in_service_radius: !!coverage.in_service_radius,
      offers_emergency_service: branch ? !!branch.offers_emergency_service : false,
      weekday_open_time: branch ? branch.weekday_open_time || null : null,
      weekday_close_time: branch ? branch.weekday_close_time || null : null
    }));

    const isCovered = branchesInfo.some((b) => b.in_service_radius);

    // Instrumentation for task completion tracking
    try {
      const nearestWithin15 = branchesInfo.find(
        (b) => this._toNumber(b.distance_miles, Infinity) <= 15
      );
      localStorage.setItem(
        'task6_zipCoverageCheck',
        JSON.stringify({
          zip: zip,
          checkedAt: this._nowIso(),
          // nearest branch within 15 miles, based on current data
          nearestBranchIdWithin15: nearestWithin15 ? nearestWithin15.branch_id : null,
          nearestBranchDistanceMiles: nearestWithin15 ? nearestWithin15.distance_miles : null
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      zip,
      is_covered: isCovered,
      branches: branchesInfo
    };
  }

  // getAvailableBookingSlots(serviceCode, zip, date, filters)
  getAvailableBookingSlots(serviceCode, zip, date, filters) {
    const offerings = this._getFromStorage('service_offerings', []);
    const slots = this._getFromStorage('booking_slots', []);
    const branches = this._getFromStorage('branches', []);

    const serviceOfferingIds = offerings
      .filter((s) => s.code === serviceCode)
      .map((s) => s.id);

    const targetDateStr = date && date.length >= 10 ? date.slice(0, 10) : null;

    const f = filters || {};

    const results = slots
      .filter((slot) => {
        if (!slot.is_available) return false;
        if (!serviceOfferingIds.includes(slot.service_offering_id)) return false;
        if (slot.zip !== zip) return false;

        // Match calendar date (compare first 10 chars of ISO date strings)
        const slotDateStr = slot.date && slot.date.slice(0, 10);
        if (targetDateStr && slotDateStr !== targetDateStr) return false;

        if (typeof f.isSameDay === 'boolean' && !!slot.is_same_day !== f.isSameDay) return false;
        if (typeof f.weekdayOnly === 'boolean' && f.weekdayOnly && !slot.is_weekday) return false;
        if (f.timeOfDay && slot.time_of_day !== f.timeOfDay) return false;

        // Time filters
        if (f.startTimeBefore || f.startTimeAfter) {
          const start = slot.start_datetime ? new Date(slot.start_datetime) : null;
          if (!start || Number.isNaN(start.getTime())) return false;
          const hh = this._formatTwoDigits(start.getHours());
          const mm = this._formatTwoDigits(start.getMinutes());
          const timeStr = hh + ':' + mm;

          if (f.startTimeBefore && timeStr >= f.startTimeBefore) return false;
          if (f.startTimeAfter && timeStr < f.startTimeAfter) return false;
        }

        if (typeof f.maxCallOutFee === 'number') {
          if (this._toNumber(slot.base_call_out_fee, Infinity) > f.maxCallOutFee) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const t1 = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const t2 = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return t1 - t2;
      })
      .map((slot) => {
        const resolvedSlot = this._resolveBookingSlot(slot, offerings, branches);
        const branch = resolvedSlot.branch;
        const service = resolvedSlot.service_offering;
        return {
          slot: resolvedSlot,
          branch_name: branch ? branch.name : null,
          branch_city: branch ? branch.city : null,
          branch_phone: branch ? branch.phone_number : null,
          service_display_name: service ? service.display_name : null
        };
      });

    return results;
  }

  // getServicePackagesForBooking(serviceCode, zip, timeSlotId?, couponCode?)
  getServicePackagesForBooking(serviceCode, zip, timeSlotId, couponCode) {
    const serviceOfferings = this._getFromStorage('service_offerings', []);
    const packages = this._getFromStorage('service_packages', []);
    const coupons = this._getFromStorage('coupons', []);
    const slots = this._getFromStorage('booking_slots', []);

    const serviceOfferingIds = serviceOfferings
      .filter((s) => s.code === serviceCode)
      .map((s) => s.id);

    const basePackages = packages.filter(
      (p) => p.is_active && serviceOfferingIds.includes(p.service_offering_id)
    );

    let appliedCoupon = null;
    if (couponCode) {
      appliedCoupon = coupons.find((c) => this._caseInsensitiveEquals(c.code, couponCode));
    }

    let callOutFee = 0;
    if (timeSlotId) {
      const slot = slots.find((s) => s.id === timeSlotId);
      if (slot) {
        callOutFee = this._toNumber(slot.base_call_out_fee, 0);
      }
    }

    const results = basePackages.map((pkg) => {
      const priceBefore = this._toNumber(pkg.base_price, 0);
      const couponResult = this._applyCouponToServicePackage(
        appliedCoupon,
        serviceCode,
        pkg,
        priceBefore,
        callOutFee
      );

      return {
        package_id: pkg.id,
        name: pkg.name,
        description: pkg.description || '',
        base_price: priceBefore,
        includes_parts: !!pkg.includes_parts,
        includes_warranty: !!pkg.includes_warranty,
        estimated_duration_minutes: pkg.estimated_duration_minutes || null,
        price_before_coupon: priceBefore,
        coupon_applied: couponResult.coupon_applied,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        discount_amount: couponResult.discount_amount,
        price_after_coupon: couponResult.price_after_coupon,
        estimated_total_with_call_out: couponResult.estimated_total_with_call_out,
        currency: 'USD'
      };
    });

    return results;
  }

  // getPaymentOptionsForService(serviceCode, totalEstimate?)
  getPaymentOptionsForService(serviceCode, totalEstimate) {
    const serviceOfferings = this._getFromStorage('service_offerings', []);
    const offering = serviceOfferings.find((s) => s.code === serviceCode) || null;
    const total = this._toNumber(totalEstimate, 0);

    // Base payment options
    const baseOptions = [
      { code: 'pay_at_service', label: 'Pay at Service' },
      { code: 'pay_on_arrival', label: 'Pay on Arrival' },
      { code: 'pay_later', label: 'Pay Later' },
      { code: 'online_deposit', label: 'Pay Deposit Online' },
      { code: 'pay_in_full_online', label: 'Pay in Full Online' }
    ];

    const paymentOptions = baseOptions.map((opt) => {
      const depositInfo = this._calculateDepositFromTotal(
        serviceCode,
        total,
        opt.code,
        offering
      );
      return {
        code: opt.code,
        label: opt.label,
        supports_deposit: opt.code === 'online_deposit' && depositInfo.deposit_required,
        deposit_percentage: depositInfo.deposit_percentage,
        deposit_amount_estimate: depositInfo.deposit_amount
      };
    });

    return {
      service_code: serviceCode,
      payment_options: paymentOptions
    };
  }

  // createServiceBooking(...)
  createServiceBooking(
    serviceCode,
    serviceOfferingId,
    timeSlotId,
    serviceDate,
    numDoors,
    problemDescription,
    propertyType,
    serviceStreet,
    serviceCity,
    serviceState,
    serviceZip,
    contactName,
    contactPhone,
    contactEmail,
    paymentPreference,
    couponCode,
    servicePackageId,
    bookingSource
  ) {
    const serviceOfferings = this._getFromStorage('service_offerings', []);
    const bookings = this._getFromStorage('service_bookings', []);
    const coupons = this._getFromStorage('coupons', []);
    const slots = this._getFromStorage('booking_slots', []);
    const branches = this._getFromStorage('branches', []);
    const packages = this._getFromStorage('service_packages', []);

    // Determine service offering
    let offering = null;
    if (serviceOfferingId) {
      offering = serviceOfferings.find((s) => s.id === serviceOfferingId) || null;
    }
    if (!offering) {
      offering = serviceOfferings.find((s) => s.code === serviceCode) || null;
    }

    const slot = timeSlotId ? slots.find((s) => s.id === timeSlotId) : null;
    const branch = slot ? branches.find((b) => b.id === slot.branch_id) : null;
    const pkg = servicePackageId ? packages.find((p) => p.id === servicePackageId) : null;

    // Resolve coupon
    let coupon = null;
    if (couponCode) {
      coupon = coupons.find((c) => this._caseInsensitiveEquals(c.code, couponCode)) || null;
    }

    // Calculate base total
    let total = 0;
    if (pkg) {
      total += this._toNumber(pkg.base_price, 0);
    }
    if (slot && typeof slot.base_call_out_fee === 'number') {
      total += this._toNumber(slot.base_call_out_fee, 0);
    } else if (!pkg && slot && typeof slot.estimated_total === 'number') {
      total += this._toNumber(slot.estimated_total, 0);
    }

    // Apply coupon if any, using generic rules (similar to _applyCouponToServicePackage)
    if (coupon) {
      const couponApplication = this._applyCouponToServicePackage(
        coupon,
        serviceCode,
        pkg || {},
        total,
        0
      );
      total = couponApplication.estimated_total_with_call_out;
    }

    const depositInfo = this._calculateDepositFromTotal(
      serviceCode,
      total,
      paymentPreference,
      offering
    );

    const bookingId = this._generateId('sb');

    const bookingRecord = {
      id: bookingId,
      service_code: serviceCode,
      service_offering_id: offering ? offering.id : serviceOfferingId || null,
      branch_id: branch ? branch.id : null,
      time_slot_id: timeSlotId || null,
      booking_source: bookingSource || 'other',
      service_date: serviceDate,
      num_doors: typeof numDoors === 'number' ? numDoors : null,
      problem_description: problemDescription || null,
      property_type: propertyType || null,
      service_street: serviceStreet || '',
      service_city: serviceCity || '',
      service_state: serviceState || '',
      service_zip: serviceZip || '',
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      payment_preference: paymentPreference,
      deposit_required: depositInfo.deposit_required,
      deposit_percentage: depositInfo.deposit_percentage,
      deposit_amount: depositInfo.deposit_amount,
      deposit_paid: false,
      coupon_id: coupon ? coupon.id : null,
      service_package_id: pkg ? pkg.id : null,
      final_estimated_total: Math.round(total * 100) / 100,
      status: 'pending',
      created_at: this._nowIso()
    };

    bookings.push(bookingRecord);
    this._saveToStorage('service_bookings', bookings);

    // Optionally mark slot as no longer available
    if (slot) {
      const slotIdx = slots.findIndex((s) => s.id === slot.id);
      if (slotIdx !== -1) {
        slots[slotIdx].is_available = false;
        this._saveToStorage('booking_slots', slots);
      }
    }

    const serviceDisplayName = offering ? offering.display_name : serviceCode;

    return {
      booking_id: bookingRecord.id,
      status: bookingRecord.status,
      service_summary: {
        service_code: bookingRecord.service_code,
        service_display_name: serviceDisplayName
      },
      scheduled_start: bookingRecord.service_date,
      branch_name: branch ? branch.name : null,
      branch_phone: branch ? branch.phone_number : null,
      final_estimated_total: bookingRecord.final_estimated_total,
      deposit_required: bookingRecord.deposit_required,
      deposit_percentage: bookingRecord.deposit_percentage,
      deposit_amount: bookingRecord.deposit_amount,
      confirmation_message: 'Your booking has been created and is currently pending confirmation.'
    };
  }

  // getGarageDoorFilterOptions()
  getGarageDoorFilterOptions() {
    const models = this._getFromStorage('garage_door_models', []);

    const materials = this._unique(models.map((m) => m.material).filter(Boolean));
    const sizeCategories = this._unique(models.map((m) => m.size_category).filter(Boolean));
    const insulationRValues = this._unique(
      models
        .map((m) => (typeof m.insulation_r_value === 'number' ? m.insulation_r_value : null))
        .filter((v) => v !== null)
    );
    const standardWidths = this._unique(
      models
        .map((m) => (typeof m.standard_width_feet === 'number' ? m.standard_width_feet : null))
        .filter((v) => v !== null)
    );
    const styles = this._unique(models.map((m) => m.style).filter(Boolean));

    const colorOptions = this._unique(
      models.reduce((acc, m) => {
        if (Array.isArray(m.color_options)) {
          m.color_options.forEach((c) => acc.push(c));
        }
        return acc;
      }, [])
    );

    return {
      materials,
      size_categories: sizeCategories,
      insulation_r_value_options: insulationRValues,
      standard_width_options: standardWidths,
      style_options: styles,
      color_options: colorOptions
    };
  }

  // listGarageDoorModels(filters?, sort?)
  listGarageDoorModels(filters, sort) {
    const models = this._getFromStorage('garage_door_models', []);
    const f = filters || {};

    let result = models.slice();

    if (f.material) {
      result = result.filter((m) => m.material === f.material);
    }

    if (f.sizeCategory) {
      result = result.filter((m) => m.size_category === f.sizeCategory);
    }

    if (typeof f.minWidthFeet === 'number') {
      result = result.filter((m) => {
        const w =
          typeof m.standard_width_feet === 'number'
            ? m.standard_width_feet
            : typeof m.max_width_feet === 'number'
            ? m.max_width_feet
            : null;
        return w === null ? false : w >= f.minWidthFeet;
      });
    }

    if (typeof f.minInsulationRValue === 'number') {
      result = result.filter((m) => {
        const r = typeof m.insulation_r_value === 'number' ? m.insulation_r_value : 0;
        return r >= f.minInsulationRValue;
      });
    }

    if (typeof f.isInsulated === 'boolean') {
      result = result.filter((m) => !!m.is_insulated === f.isInsulated);
    }

    if (f.style) {
      result = result.filter((m) => m.style === f.style);
    }

    if (f.color) {
      result = result.filter((m) => Array.isArray(m.color_options) && m.color_options.includes(f.color));
    }

    if (f.status) {
      result = result.filter((m) => m.status === f.status);
    }

    const s = sort || {};
    if (s.sortBy) {
      const dir = s.direction === 'desc' ? -1 : 1;
      if (s.sortBy === 'price') {
        result.sort((a, b) => (this._toNumber(a.base_price, 0) - this._toNumber(b.base_price, 0)) * dir);
      } else if (s.sortBy === 'name') {
        result.sort((a, b) => {
          const an = (a.name || '').toLowerCase();
          const bn = (b.name || '').toLowerCase();
          if (an < bn) return -1 * dir;
          if (an > bn) return 1 * dir;
          return 0;
        });
      } else if (s.sortBy === 'insulation_r_value') {
        result.sort(
          (a, b) =>
            (this._toNumber(a.insulation_r_value, 0) - this._toNumber(b.insulation_r_value, 0)) * dir
        );
      }
    }

    return result;
  }

  // getGarageDoorDetails(doorModelId)
  getGarageDoorDetails(doorModelId) {
    const models = this._getFromStorage('garage_door_models', []);
    return models.find((m) => m.id === doorModelId) || null;
  }

  // createDoorQuoteRequest(...)
  createDoorQuoteRequest(
    doorModelId,
    selectedWidthFeet,
    selectedHeightFeet,
    notes,
    contactName,
    contactPhone,
    contactEmail,
    serviceStreet,
    serviceCity,
    serviceState,
    serviceZip,
    preferredInstallStartDate,
    preferredInstallEndDate
  ) {
    const requests = this._getFromStorage('door_quote_requests', []);

    const requestId = this._generateId('dq');

    const record = {
      id: requestId,
      door_model_id: doorModelId,
      selected_width_feet:
        typeof selectedWidthFeet === 'number' ? selectedWidthFeet : null,
      selected_height_feet:
        typeof selectedHeightFeet === 'number' ? selectedHeightFeet : null,
      notes: notes || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      service_street: serviceStreet || '',
      service_city: serviceCity || '',
      service_state: serviceState || '',
      service_zip: serviceZip || '',
      preferred_install_start_date: preferredInstallStartDate || null,
      preferred_install_end_date: preferredInstallEndDate || null,
      status: 'new',
      created_at: this._nowIso()
    };

    requests.push(record);
    this._saveToStorage('door_quote_requests', requests);

    return {
      quote_request_id: record.id,
      status: record.status,
      confirmation_message: 'Your quote request has been received. We will contact you with pricing and availability.'
    };
  }

  // getActiveMaintenancePlans(includeCommercial?)
  getActiveMaintenancePlans(includeCommercial) {
    const plans = this._getFromStorage('maintenance_plans', []);
    const includeComm = !!includeCommercial;

    return plans.filter((p) => {
      if (!p.is_active) return false;
      if (!includeComm && p.plan_code === 'commercial') return false;
      return true;
    });
  }

  // enrollInMaintenancePlan(...)
  enrollInMaintenancePlan(
    maintenancePlanId,
    billingFrequency,
    numDoors,
    contactName,
    contactPhone,
    contactEmail,
    serviceStreet,
    serviceCity,
    serviceState,
    serviceZip,
    planStartDate
  ) {
    const plans = this._getFromStorage('maintenance_plans', []);
    const enrollments = this._getFromStorage('maintenance_plan_enrollments', []);

    const plan = plans.find((p) => p.id === maintenancePlanId) || null;

    const enrollmentId = this._generateId('mp');

    const record = {
      id: enrollmentId,
      maintenance_plan_id: maintenancePlanId,
      plan_code: plan ? plan.plan_code : 'basic',
      billing_frequency: billingFrequency,
      num_doors: this._toNumber(numDoors, 1),
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      service_street: serviceStreet || '',
      service_city: serviceCity || '',
      service_state: serviceState || '',
      service_zip: serviceZip || '',
      plan_start_date: planStartDate,
      status: 'pending',
      created_at: this._nowIso()
    };

    enrollments.push(record);
    this._saveToStorage('maintenance_plan_enrollments', enrollments);

    return {
      enrollment_id: record.id,
      status: record.status,
      plan_name: plan ? plan.name : 'Maintenance Plan',
      billing_frequency: record.billing_frequency,
      price_monthly: plan ? this._toNumber(plan.price_monthly, 0) : 0,
      confirmation_message: 'Your maintenance plan enrollment has been submitted and is pending activation.'
    };
  }

  // getActiveCoupons(serviceCode?, isSpringRepairOnly?)
  getActiveCoupons(serviceCode, isSpringRepairOnly) {
    const coupons = this._getFromStorage('coupons', []);
    const now = new Date();

    const result = coupons.filter((c) => {
      if (!c.is_active) return false;
      if (typeof isSpringRepairOnly === 'boolean' && isSpringRepairOnly && !c.is_spring_repair_only) {
        return false;
      }
      if (serviceCode && Array.isArray(c.applicable_service_codes) && c.applicable_service_codes.length > 0) {
        if (!c.applicable_service_codes.includes(serviceCode)) return false;
      }
      if (c.start_date) {
        const sd = new Date(c.start_date);
        if (!Number.isNaN(sd.getTime()) && now < sd) return false;
      }
      if (c.end_date) {
        const ed = new Date(c.end_date);
        if (!Number.isNaN(ed.getTime()) && now > ed) return false;
      }
      return true;
    });

    return result.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description || '',
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      max_discount_amount: c.max_discount_amount || null,
      applies_to: c.applies_to,
      is_spring_repair_only: !!c.is_spring_repair_only,
      min_order_total: typeof c.min_order_total === 'number' ? c.min_order_total : null,
      start_date: c.start_date || null,
      end_date: c.end_date || null,
      is_active: c.is_active,
      terms: c.terms || ''
    }));
  }

  // getCouponDetails(couponCode)
  getCouponDetails(couponCode) {
    const coupons = this._getFromStorage('coupons', []);
    const coupon = coupons.find((c) => this._caseInsensitiveEquals(c.code, couponCode)) || null;

    if (!coupon) {
      return {
        coupon: null,
        formatted_discount: ''
      };
    }

    let desc = '';
    if (coupon.discount_type === 'percent') {
      desc = `${coupon.discount_value}% off`;
    } else if (coupon.discount_type === 'amount') {
      desc = `$${this._toNumber(coupon.discount_value, 0).toFixed(2)} off`;
    } else if (coupon.discount_type === 'fixed_price') {
      desc = `Special price $${this._toNumber(coupon.discount_value, 0).toFixed(2)}`;
    }

    if (coupon.is_spring_repair_only) {
      desc += ' spring repair';
    }

    if (typeof coupon.max_discount_amount === 'number') {
      desc += ` (up to $${coupon.max_discount_amount.toFixed(2)})`;
    }

    return {
      coupon,
      formatted_discount: desc
    };
  }

  // searchHelpArticles(query)
  searchHelpArticles(query) {
    const articles = this._getFromStorage('help_articles', []);
    const categories = this._getFromStorage('help_categories', []);
    const q = (query || '').trim();

    if (!q) {
      return articles
        .filter((a) => a.is_published)
        .map((a) => this._resolveHelpArticle(a, categories));
    }

    const lower = q.toLowerCase();

    const results = articles.filter((a) => {
      if (!a.is_published) return false;
      if (this._stringIncludes(a.title || '', lower)) return true;
      if (this._stringIncludes(a.summary || '', lower)) return true;
      if (this._stringIncludes(a.content_html || '', lower)) return true;
      if (Array.isArray(a.keywords) && a.keywords.some((k) => this._stringIncludes(k, lower))) return true;
      if (
        Array.isArray(a.related_issue_keywords) &&
        a.related_issue_keywords.some((k) => this._stringIncludes(k, lower))
      )
        return true;
      return false;
    });

    return results.map((a) => this._resolveHelpArticle(a, categories));
  }

  // getHelpCategories()
  getHelpCategories() {
    return this._getFromStorage('help_categories', []);
  }

  // listHelpArticlesByCategory(categoryId)
  listHelpArticlesByCategory(categoryId) {
    const articles = this._getFromStorage('help_articles', []);
    const categories = this._getFromStorage('help_categories', []);

    const filtered = articles.filter(
      (a) => a.category_id === categoryId && a.is_published
    );

    return filtered.map((a) => this._resolveHelpArticle(a, categories));
  }

  // getHelpArticleDetail(articleId)
  getHelpArticleDetail(articleId) {
    const articles = this._getFromStorage('help_articles', []);
    const categories = this._getFromStorage('help_categories', []);

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) return null;

    return this._resolveHelpArticle(article, categories);
  }

  // submitHelpRequest(...)
  submitHelpRequest(
    articleId,
    issueCategory,
    troubleshootingTried,
    message,
    contactName,
    contactPhone,
    contactEmail,
    preferredContactMethod
  ) {
    const requests = this._getFromStorage('help_requests', []);

    const recordId = this._generateId('hr');

    const record = {
      id: recordId,
      article_id: articleId || null,
      issue_category: issueCategory,
      troubleshooting_tried: !!troubleshootingTried,
      message: message,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      preferred_contact_method: preferredContactMethod,
      status: 'new',
      created_at: this._nowIso()
    };

    requests.push(record);
    this._saveToStorage('help_requests', requests);

    return {
      help_request_id: record.id,
      status: record.status,
      confirmation_message: 'Your help request has been submitted. Our team will reach out to you shortly.'
    };
  }

  // getBranchDetails(branchId)
  getBranchDetails(branchId) {
    const branches = this._getFromStorage('branches', []);
    const branch = branches.find((b) => b.id === branchId) || null;

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task6_branchDetailsViewed',
        JSON.stringify({
          branchId: branchId,
          viewedAt: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!branch) {
      return {
        branch: null,
        full_address: '',
        weekday_hours: '',
        weekend_hours: ''
      };
    }

    const fullAddress = `${branch.street}, ${branch.city}${branch.state ? ', ' + branch.state : ''} ${
      branch.zip
    }`;

    const weekdayHours = branch.weekday_open_time && branch.weekday_close_time
      ? `${branch.weekday_open_time} - ${branch.weekday_close_time}`
      : '';

    const weekendHours = branch.weekend_open_time && branch.weekend_close_time
      ? `${branch.weekend_open_time} - ${branch.weekend_close_time}`
      : '';

    return {
      branch,
      full_address: fullAddress,
      weekday_hours: weekdayHours,
      weekend_hours: weekendHours
    };
  }

  // getEstimatorServiceOptions(serviceCategory)
  getEstimatorServiceOptions(serviceCategory) {
    const options = this._getFromStorage('estimator_service_options', []);
    const offerings = this._getFromStorage('service_offerings', []);

    const filtered = options.filter((o) => o.category === serviceCategory);

    // Resolve service_offering_id
    return filtered.map((opt) => {
      const svc = offerings.find((s) => s.id === opt.service_offering_id) || null;
      return { ...opt, service_offering: svc };
    });
  }

  // configureRepairEstimateBundle(...)
  configureRepairEstimateBundle(
    selectedServiceOptionIds,
    zip,
    doorConfiguration,
    appointmentDayOfWeek,
    appointmentTimeWindow
  ) {
    let session = this._getOrCreateCurrentEstimateSession();

    session.selected_service_option_ids = Array.isArray(selectedServiceOptionIds)
      ? selectedServiceOptionIds
      : [];
    session.zip = zip || '';
    session.door_configuration = doorConfiguration;
    session.appointment_day_of_week = appointmentDayOfWeek;
    session.appointment_time_window = appointmentTimeWindow;

    session = this._updateEstimateTotal(session);

    const options = this._getFromStorage('estimator_service_options', []);

    return this._resolveEstimatorOptionsForSession(session, options);
  }

  // continueEstimateToBooking(contactName, contactPhone)
  continueEstimateToBooking(contactName, contactPhone) {
    const session = this._getOrCreateCurrentEstimateSession();

    // Update session with latest contact info
    const sessions = this._getFromStorage('price_estimate_sessions', []);
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx].contact_name = contactName;
      sessions[idx].contact_phone = contactPhone;
      this._saveToStorage('price_estimate_sessions', sessions);
    }

    const bookingResult = this._linkEstimateSessionToBooking(session, contactName, contactPhone);

    return {
      success: !!bookingResult,
      estimate_session_id: session.id,
      linked_booking_id: bookingResult ? bookingResult.booking_id : null,
      booking_source: 'estimator_page',
      message: bookingResult
        ? 'Your estimate has been saved and a booking record has been created.'
        : 'Unable to create booking from estimate.'
    };
  }

  // getReviews(serviceType?, minRating?, maxResults?)
  getReviews(serviceType, minRating, maxResults) {
    const reviews = this._getFromStorage('reviews', []);

    let result = reviews.filter((r) => r.status === 'published' || r.status === 'pending');

    if (serviceType) {
      result = result.filter((r) => r.service_type === serviceType);
    }

    if (typeof minRating === 'number') {
      result = result.filter((r) => this._toNumber(r.rating, 0) >= minRating);
    }

    const limit = typeof maxResults === 'number' ? maxResults : 50;
    return result.slice(0, limit);
  }

  // submitReview(...)
  submitReview(
    rating,
    serviceType,
    serviceDate,
    reviewerName,
    reviewerZip,
    comment,
    isRealCustomerConfirmed
  ) {
    const reviews = this._getFromStorage('reviews', []);

    const reviewId = this._generateId('rv');

    const record = {
      id: reviewId,
      rating: this._toNumber(rating, 0),
      service_type: serviceType,
      service_date: serviceDate,
      reviewer_name: reviewerName,
      reviewer_zip: reviewerZip || null,
      comment: comment,
      is_real_customer_confirmed: !!isRealCustomerConfirmed,
      status: 'pending',
      created_at: this._nowIso()
    };

    reviews.push(record);
    this._saveToStorage('reviews', reviews);

    return {
      review_id: record.id,
      status: record.status,
      thank_you_message: 'Thank you for your review! It will appear on our site once it has been approved.'
    };
  }

  // getContactTopics()
  getContactTopics() {
    const config = this._getFromStorage('contact_topics_config', {
      topics: [],
      primary_phone: '',
      sales_phone: '',
      emergency_phone: '',
      primary_email: '',
      business_hours: '',
      response_time_message: ''
    });

    return {
      topics: Array.isArray(config.topics) ? config.topics : [],
      primary_phone: config.primary_phone || '',
      sales_phone: config.sales_phone || '',
      emergency_phone: config.emergency_phone || '',
      primary_email: config.primary_email || '',
      business_hours: config.business_hours || '',
      response_time_message: config.response_time_message || ''
    };
  }

  // submitContactInquiry(...)
  submitContactInquiry(
    topic,
    message,
    contactName,
    contactPhone,
    contactEmail,
    preferredContactMethod,
    source,
    branchId,
    articleId
  ) {
    const inquiries = this._getFromStorage('contact_inquiries', []);

    const inquiryId = this._generateId('ci');

    const record = {
      id: inquiryId,
      source: source,
      topic: topic,
      branch_id: branchId || null,
      article_id: articleId || null,
      message: message,
      contact_name: contactName,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      preferred_contact_method: preferredContactMethod || null,
      status: 'new',
      created_at: this._nowIso()
    };

    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      contact_inquiry_id: record.id,
      status: record.status,
      confirmation_message: 'Your message has been sent. We will get back to you as soon as possible.'
    };
  }

  // getPoliciesContent(policyType?)
  getPoliciesContent(policyType) {
    const privacy = this._getFromStorage('policies_privacy_html', '');
    const terms = this._getFromStorage('policies_terms_html', '');
    const booking = this._getFromStorage('policies_booking_policies_html', '');

    const contactConfig = this._getFromStorage('contact_topics_config', {
      primary_email: '',
      primary_phone: ''
    });

    const type = policyType || 'all';

    return {
      privacy_html: type === 'privacy' || type === 'all' ? privacy : '',
      terms_html: type === 'terms' || type === 'all' ? terms : '',
      booking_policies_html:
        type === 'booking_cancellation' || type === 'all' ? booking : '',
      contact_for_questions: {
        phone: contactConfig.primary_phone || '',
        email: contactConfig.primary_email || ''
      }
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
