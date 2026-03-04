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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'studios',
      'studio_bikes',
      'instructors',
      'class_sessions',
      'bookings',
      'class_pack_plans',
      'owned_class_packs',
      'membership_plans',
      'membership_subscriptions',
      'guest_pass_plans',
      'owned_guest_passes',
      'promo_codes',
      'orders',
      'order_items',
      'profiles',
      'recommended_classes',
      'contact_tickets'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('current_checkout')) {
      localStorage.setItem('current_checkout', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue !== undefined ? defaultValue : [];
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

  // ----------------------
  // Common data helpers
  // ----------------------

  _getStudiosMap() {
    const studios = this._getFromStorage('studios', []);
    const map = {};
    for (const s of studios) {
      map[s.id] = s;
    }
    return map;
  }

  _getStudiosResolved() {
    // Studios have no foreign keys to resolve further
    return this._getFromStorage('studios', []);
  }

  _getInstructorsResolved() {
    const instructors = this._getFromStorage('instructors', []);
    const studiosMap = this._getStudiosMap();
    return instructors.map((ins) => ({
      ...ins,
      primary_studio: ins.primary_studio_id ? studiosMap[ins.primary_studio_id] || null : null
    }));
  }

  _timeStrToMinutes(timeStr) {
    // timeStr 'HH:MM'
    if (!timeStr || typeof timeStr !== 'string') return null;
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  _getMinutesFromIsoDateTime(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return null;
    const t = isoStr.split('T')[1] || '';
    const [h, m] = t.split(':');
    const hh = parseInt(h, 10);
    const mm = parseInt(m, 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  }

  _isSameDateIso(isoStr, ymd) {
    if (!isoStr || !ymd) return false;
    return isoStr.slice(0, 10) === ymd;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _parseIso(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _daysFromNow(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  _dateToYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // ----------------------
  // Checkout helpers
  // ----------------------

  _getOrCreateCheckoutSession(reset = false) {
    let checkout = this._getFromStorage('current_checkout', null);
    if (reset || !checkout || typeof checkout !== 'object') {
      checkout = {
        checkoutId: this._generateId('chk'),
        items: [],
        promo_code_id: null,
        subtotal_amount: 0,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        currency: 'USD',
        applied_promo_code: null,
        payment_method_type: 'none',
        requires_payment_details: false
      };
    }
    this._saveToStorage('current_checkout', checkout);
    return checkout;
  }

  _calculateOrderTotals(checkout) {
    let subtotal = 0;
    let currency = checkout.currency || 'USD';
    for (const item of checkout.items || []) {
      const qty = item.quantity != null ? item.quantity : 1;
      const price = item.unit_price != null ? item.unit_price : 0;
      subtotal += price * qty;
      if (item.currency) currency = item.currency;
    }

    // Load promo if set
    const promoCodes = this._getFromStorage('promo_codes', []);
    let discount = 0;
    let appliedPromo = null;
    if (checkout.promo_code_id) {
      const promo = promoCodes.find((p) => p.id === checkout.promo_code_id && p.is_active);
      if (promo) {
        // Basic validation against date and min_order_total
        const now = new Date();
        let valid = true;
        if (promo.valid_from && now < new Date(promo.valid_from)) valid = false;
        if (promo.valid_to && now > new Date(promo.valid_to)) valid = false;
        if (promo.min_order_total != null && subtotal < promo.min_order_total) valid = false;

        if (valid) {
          if (promo.discount_type === 'amount') {
            discount = promo.discount_value || 0;
          } else if (promo.discount_type === 'percentage') {
            discount = (subtotal * (promo.discount_value || 0)) / 100;
          }
          if (promo.max_discount_amount != null && discount > promo.max_discount_amount) {
            discount = promo.max_discount_amount;
          }
          if (discount > subtotal) discount = subtotal;
          appliedPromo = {
            code: promo.code,
            discount_amount: discount,
            description: promo.description || ''
          };
        }
      }
    }

    const tax = 0; // Simulate no tax logic for now
    const total = subtotal - discount + tax;

    checkout.subtotal_amount = subtotal;
    checkout.discount_amount = discount;
    checkout.tax_amount = tax;
    checkout.total_amount = total;
    checkout.currency = currency;
    checkout.applied_promo_code = appliedPromo;

    checkout.payment_method_type = total > 0 ? 'card' : 'none';
    checkout.requires_payment_details = total > 0;

    this._saveToStorage('current_checkout', checkout);
    return checkout;
  }

  _loadUserProfileWithEntitlements() {
    let profiles = this._getFromStorage('profiles', []);
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('profile'),
        full_name: '',
        email: '',
        phone: '',
        preferred_studio_id: null,
        favorite_instructor_id: null,
        marketing_opt_in: false,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      profiles.push(profile);
      this._saveToStorage('profiles', profiles);
    }

    const ownedClassPacks = this._getFromStorage('owned_class_packs', []);
    const membershipSubscriptions = this._getFromStorage('membership_subscriptions', []);
    const ownedGuestPasses = this._getFromStorage('owned_guest_passes', []);

    return { profile, ownedClassPacks, membershipSubscriptions, ownedGuestPasses };
  }

  _filterAndSortClassSessions(classSessions, filters, sort) {
    const instructors = this._getFromStorage('instructors', []);
    const instructorMap = {};
    for (const ins of instructors) instructorMap[ins.id] = ins;

    let result = classSessions.slice();

    if (filters) {
      if (filters.difficulty) {
        result = result.filter((c) => c.difficulty === filters.difficulty);
      }
      if (filters.studioId) {
        result = result.filter((c) => c.studio_id === filters.studioId);
      }
      if (filters.instructorId) {
        result = result.filter((c) => c.instructor_id === filters.instructorId);
      }
      if (filters.minInstructorRating != null) {
        result = result.filter((c) => {
          const ins = instructorMap[c.instructor_id];
          return ins && (ins.average_rating || 0) >= filters.minInstructorRating;
        });
      }

      // Time of day filtering
      const startMinutesFilter =
        filters.startTime != null ? this._timeStrToMinutes(filters.startTime) : null;
      const endMinutesFilter =
        filters.endTime != null ? this._timeStrToMinutes(filters.endTime) : null;

      let windowStart = startMinutesFilter;
      let windowEnd = endMinutesFilter;

      if (filters.timeOfDay && (windowStart == null || windowEnd == null)) {
        if (filters.timeOfDay === 'morning') {
          windowStart = 6 * 60;
          windowEnd = 12 * 60;
        } else if (filters.timeOfDay === 'afternoon') {
          windowStart = 12 * 60;
          windowEnd = 17 * 60;
        } else if (filters.timeOfDay === 'evening') {
          windowStart = 17 * 60;
          windowEnd = 21 * 60;
        }
      }

      if (windowStart != null && windowEnd != null) {
        result = result.filter((c) => {
          const mins = this._getMinutesFromIsoDateTime(c.start_datetime);
          if (mins == null) return false;
          return mins >= windowStart && mins <= windowEnd;
        });
      }

      if (filters.dayType) {
        // Assuming all sessions share same date; interpret based on their start date
        result = result.filter((c) => {
          const d = this._parseIso(c.start_datetime);
          if (!d) return false;
          const day = d.getDay(); // 0 Sunday, 6 Saturday
          const isWeekend = day === 0 || day === 6;
          return filters.dayType === 'weekend' ? isWeekend : !isWeekend;
        });
      }
    }

    if (sort) {
      if (sort === 'time_asc') {
        result.sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''));
      } else if (sort === 'time_desc') {
        result.sort((a, b) => (b.start_datetime || '').localeCompare(a.start_datetime || ''));
      } else if (sort === 'price_low_to_high') {
        result.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
      } else if (sort === 'price_high_to_low') {
        result.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
      } else if (sort === 'instructor_rating_high_to_low') {
        result.sort((a, b) => {
          const ra = (instructorMap[a.instructor_id] || {}).average_rating || 0;
          const rb = (instructorMap[b.instructor_id] || {}).average_rating || 0;
          return rb - ra;
        });
      }
    }

    return result;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const { profile } = this._loadUserProfileWithEntitlements();
    const recommendedRaw = this._getFromStorage('recommended_classes', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const studios = this._getFromStorage('studios', []);
    const instructors = this._getFromStorage('instructors', []);
    const membershipPlans = this._getFromStorage('membership_plans', []);
    const classPackPlans = this._getFromStorage('class_pack_plans', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const classMap = {};
    for (const c of classSessions) classMap[c.id] = c;
    const studioMap = {};
    for (const s of studios) studioMap[s.id] = s;
    const instructorMap = {};
    for (const i of instructors) instructorMap[i.id] = i;

    let recommended_classes = recommendedRaw
      .slice()
      .sort((a, b) => {
        const ra = a.rank != null ? a.rank : Number.MAX_SAFE_INTEGER;
        const rb = b.rank != null ? b.rank : Number.MAX_SAFE_INTEGER;
        return ra - rb;
      })
      .map((rec) => {
        const cls = classMap[rec.class_session_id];
        if (!cls) return null;
        const studio = studioMap[cls.studio_id] || {};
        const ins = instructorMap[cls.instructor_id] || {};
        return {
          recommended_item_id: rec.id,
          reason: rec.reason || '',
          matches_preferred_studio: !!rec.is_match_preferred_studio,
          matches_favorite_instructor: !!rec.is_match_favorite_instructor,
          class_session_id: cls.id,
          class_session: cls,
          class_name: cls.name,
          start_datetime: cls.start_datetime,
          end_datetime: cls.end_datetime,
          studio_name: studio.name || '',
          instructor_name: ins.name || '',
          difficulty: cls.difficulty,
          instructor_rating: ins.average_rating || 0,
          price: cls.base_price || 0,
          currency: cls.currency || 'USD',
          available_bikes_count: cls.available_bikes_count || 0,
          is_featured: !!cls.is_featured
        };
      })
      .filter(Boolean);

    // Fallback: if no valid recommended classes from storage, build recommendations from class sessions
    if (!recommended_classes.length) {
      const fallbackClasses = classSessions
        .slice()
        .sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''));
      recommended_classes = fallbackClasses.map((cls) => {
        const studio = studioMap[cls.studio_id] || {};
        const ins = instructorMap[cls.instructor_id] || {};
        const matches_preferred_studio =
          !!profile.preferred_studio_id && cls.studio_id === profile.preferred_studio_id;
        const matches_favorite_instructor =
          !!profile.favorite_instructor_id && cls.instructor_id === profile.favorite_instructor_id;
        return {
          recommended_item_id: cls.id,
          reason: 'Recommended upcoming class',
          matches_preferred_studio,
          matches_favorite_instructor,
          class_session_id: cls.id,
          class_session: cls,
          class_name: cls.name,
          start_datetime: cls.start_datetime,
          end_datetime: cls.end_datetime,
          studio_name: studio.name || '',
          instructor_name: ins.name || '',
          difficulty: cls.difficulty,
          instructor_rating: ins.average_rating || 0,
          price: cls.base_price || 0,
          currency: cls.currency || 'USD',
          available_bikes_count: cls.available_bikes_count || 0,
          is_featured: !!cls.is_featured
        };
      });
    }

    const featured_classes = classSessions
      .filter((c) => c.is_featured && c.status === 'scheduled')
      .map((c) => {
        const studio = studioMap[c.studio_id] || {};
        const ins = instructorMap[c.instructor_id] || {};
        return {
          class_session_id: c.id,
          class_session: c,
          class_name: c.name,
          start_datetime: c.start_datetime,
          studio_name: studio.name || '',
          instructor_name: ins.name || '',
          difficulty: c.difficulty,
          instructor_rating: ins.average_rating || 0,
          price: c.base_price || 0,
          currency: c.currency || 'USD',
          available_bikes_count: c.available_bikes_count || 0
        };
      });

    const highlighted_membership_offers = membershipPlans
      .filter((p) => p.status === 'active' && p.is_visible_on_pricing)
      .map((p) => ({
        membership_plan_id: p.id,
        membership_plan: p,
        name: p.name,
        plan_type: p.plan_type,
        duration_days: p.duration_days || 0,
        price: p.price || 0,
        currency: p.currency || 'USD',
        is_unlimited: p.plan_type === 'unlimited',
        summary: p.terms_summary || p.description || ''
      }));

    const highlighted_class_pack_offers = classPackPlans
      .filter((cp) => cp.status === 'active' && cp.is_visible_on_pricing)
      .map((cp) => ({
        class_pack_plan_id: cp.id,
        class_pack_plan: cp,
        name: cp.name,
        number_of_rides: cp.number_of_rides,
        price: cp.price || 0,
        currency: cp.currency || 'USD',
        validity_days: cp.validity_days || null,
        per_ride_price:
          cp.number_of_rides && cp.price != null && cp.number_of_rides > 0
            ? cp.price / cp.number_of_rides
            : 0,
        summary: cp.terms_summary || cp.description || ''
      }));

    const active_promotions = promoCodes
      .filter((p) => p.is_active)
      .map((p) => ({
        promo_code: p.code,
        description: p.description || '',
        discount_type: p.discount_type,
        discount_value: p.discount_value || 0,
        applies_to: (function () {
          const parts = [];
          if (p.applies_to_class_bookings) parts.push('classes');
          if (p.applies_to_packs) parts.push('packs');
          if (p.applies_to_memberships) parts.push('memberships');
          if (p.applies_to_guest_passes) parts.push('guest_passes');
          return parts.join(', ');
        })()
      }));

    return {
      hero_title: 'Ride stronger. Together.',
      hero_subtitle: 'Indoor cycling classes that fit your life.',
      hero_description:
        'Book high-energy cycling classes across our studio locations, with flexible packs and memberships.',
      recommended_classes,
      featured_classes,
      highlighted_membership_offers,
      highlighted_class_pack_offers,
      active_promotions
    };
  }

  // getScheduleFilterOptions()
  getScheduleFilterOptions() {
    const difficulties = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    const time_of_day_options = [
      { id: 'morning', label: 'Morning (6am-12pm)', start_time: '06:00', end_time: '12:00' },
      { id: 'afternoon', label: 'Afternoon (12pm-5pm)', start_time: '12:00', end_time: '17:00' },
      { id: 'evening', label: 'Evening (5pm-9pm)', start_time: '17:00', end_time: '21:00' }
    ];
    const day_type_options = ['weekday', 'weekend'];
    const studios = this._getStudiosResolved();
    const instructors = this._getInstructorsResolved();
    const rating_thresholds = [0, 3, 3.5, 4, 4.5, 5];
    const sort_options = [
      'time_asc',
      'time_desc',
      'price_low_to_high',
      'price_high_to_low',
      'instructor_rating_high_to_low'
    ];

    return {
      difficulties,
      time_of_day_options,
      day_type_options,
      studios,
      instructors,
      rating_thresholds,
      sort_options
    };
  }

  // getClassSchedule(date, filters, sort)
  getClassSchedule(date, filters, sort) {
    const classSessions = this._getFromStorage('class_sessions', []);
    const studios = this._getFromStorage('studios', []);
    const instructors = this._getFromStorage('instructors', []);
    const studioMap = {};
    for (const s of studios) studioMap[s.id] = s;
    const instructorMap = {};
    for (const ins of instructors) instructorMap[ins.id] = ins;

    const forDate = classSessions.filter((c) => this._isSameDateIso(c.start_datetime, date));
    const filteredSorted = this._filterAndSortClassSessions(forDate, filters || {}, sort || 'time_asc');

    const classes = filteredSorted.map((c) => {
      const studio = studioMap[c.studio_id] || {};
      const ins = instructorMap[c.instructor_id] || {};
      return {
        class_session_id: c.id,
        class_session: c,
        class_name: c.name,
        start_datetime: c.start_datetime,
        end_datetime: c.end_datetime,
        duration_minutes: c.duration_minutes || null,
        studio_name: studio.name || '',
        studio_city: studio.city || '',
        instructor_name: ins.name || '',
        instructor_rating: ins.average_rating || 0,
        difficulty: c.difficulty,
        base_price: c.base_price || 0,
        currency: c.currency || 'USD',
        available_bikes_count: c.available_bikes_count || 0,
        total_bikes_count: c.total_bikes_count || 0,
        is_featured: !!c.is_featured,
        status: c.status
      };
    });

    return {
      date,
      filters_applied: {
        difficulty: filters && filters.difficulty ? filters.difficulty : undefined,
        timeOfDay: filters && filters.timeOfDay ? filters.timeOfDay : undefined,
        startTime: filters && filters.startTime ? filters.startTime : undefined,
        endTime: filters && filters.endTime ? filters.endTime : undefined,
        dayType: filters && filters.dayType ? filters.dayType : undefined,
        studioId: filters && filters.studioId ? filters.studioId : undefined,
        instructorId: filters && filters.instructorId ? filters.instructorId : undefined,
        minInstructorRating:
          filters && filters.minInstructorRating != null ? filters.minInstructorRating : undefined
      },
      sort_applied: sort || 'time_asc',
      classes
    };
  }

  // getClassSessionDetail(classSessionId)
  getClassSessionDetail(classSessionId) {
    const classSessions = this._getFromStorage('class_sessions', []);
    const classSession = classSessions.find((c) => c.id === classSessionId) || null;
    if (!classSession) {
      return {
        class_session: null,
        instructor: null,
        studio: null,
        bike_map: { bikes: [], booked_bike_ids: [], user_booked_bike_id: null },
        pricing_options: {
          single_ride_price: 0,
          currency: 'USD',
          can_use_active_membership: false,
          applicable_owned_class_packs: [],
          applicable_owned_guest_passes: []
        },
        user_booking: {
          has_booking: false
        }
      };
    }

    const instructors = this._getFromStorage('instructors', []);
    const studios = this._getFromStorage('studios', []);
    const studioBikes = this._getFromStorage('studio_bikes', []);
    const bookings = this._getFromStorage('bookings', []);

    const instructor = instructors.find((i) => i.id === classSession.instructor_id) || null;
    const studio = studios.find((s) => s.id === classSession.studio_id) || null;
    const bikes = studioBikes.filter((b) => b.studio_id === classSession.studio_id);

    const classBookings = bookings.filter((b) => b.class_session_id === classSession.id);
    const booked_bike_ids = classBookings
      .filter((b) => b.booking_status === 'booked' && b.bike_id)
      .map((b) => b.bike_id);

    const primaryBooking = classBookings.find(
      (b) => b.booking_status === 'booked' && b.rider_type === 'primary'
    );

    const bike_map = {
      bikes,
      booked_bike_ids,
      user_booked_bike_id: primaryBooking ? primaryBooking.bike_id || null : null
    };

    const { ownedClassPacks, membershipSubscriptions, ownedGuestPasses } =
      this._loadUserProfileWithEntitlements();

    const classDate = this._parseIso(classSession.start_datetime);

    const membershipPlans = this._getFromStorage('membership_plans', []);
    const membershipPlanMap = {};
    for (const p of membershipPlans) membershipPlanMap[p.id] = p;

    const can_use_active_membership = membershipSubscriptions.some((sub) => {
      if (sub.status !== 'active') return false;
      if (sub.start_date && classDate && classDate < new Date(sub.start_date)) return false;
      if (sub.end_date && classDate && classDate > new Date(sub.end_date)) return false;
      const plan = membershipPlanMap[sub.membership_plan_id];
      if (!plan) return false;
      const included = plan.included_studio_ids || [];
      return !included.length || included.includes(classSession.studio_id);
    });

    const applicable_owned_class_packs = ownedClassPacks
      .filter((cp) => {
        if (cp.status !== 'active') return false;
        if (cp.remaining_rides != null && cp.remaining_rides <= 0) return false;
        if (cp.expiration_date && classDate && classDate > new Date(cp.expiration_date))
          return false;
        return true;
      })
      .map((cp) => {
        const plan = this._getFromStorage('class_pack_plans', []).find(
          (p) => p.id === cp.class_pack_plan_id
        );
        return {
          owned_class_pack_id: cp.id,
          plan_name: plan ? plan.name : '',
          remaining_rides: cp.remaining_rides != null ? cp.remaining_rides : null,
          expiration_date: cp.expiration_date || null
        };
      });

    const applicable_owned_guest_passes = ownedGuestPasses
      .filter((gp) => {
        if (gp.status !== 'active') return false;
        if (gp.remaining_uses != null && gp.remaining_uses <= 0) return false;
        if (gp.expiration_date && classDate && classDate > new Date(gp.expiration_date))
          return false;
        return true;
      })
      .map((gp) => {
        const plan = this._getFromStorage('guest_pass_plans', []).find(
          (p) => p.id === gp.guest_pass_plan_id
        );
        return {
          owned_guest_pass_id: gp.id,
          plan_name: plan ? plan.name : '',
          remaining_uses: gp.remaining_uses != null ? gp.remaining_uses : null,
          expiration_date: gp.expiration_date || null
        };
      });

    let user_booking;
    if (primaryBooking) {
      const bike = primaryBooking.bike_id
        ? bikes.find((b) => b.id === primaryBooking.bike_id)
        : null;
      user_booking = {
        has_booking: true,
        booking_id: primaryBooking.id,
        booking_status: primaryBooking.booking_status,
        rider_type: primaryBooking.rider_type,
        bike_label: bike ? bike.label : null,
        payment_source_type: primaryBooking.payment_source_type,
        price_paid: primaryBooking.price_paid || 0,
        currency: primaryBooking.currency || 'USD',
        cancelable: primaryBooking.booking_status === 'booked' &&
          classDate &&
          classDate > new Date()
      };
    } else {
      user_booking = { has_booking: false };
    }

    const pricing_options = {
      single_ride_price: classSession.base_price || 0,
      currency: classSession.currency || 'USD',
      can_use_active_membership,
      applicable_owned_class_packs,
      applicable_owned_guest_passes
    };

    return {
      class_session: classSession,
      instructor: instructor
        ? {
            id: instructor.id,
            name: instructor.name,
            bio: instructor.bio || '',
            photo_url: instructor.photo_url || '',
            average_rating: instructor.average_rating || 0,
            rating_count: instructor.rating_count || 0,
            primary_studio_name:
              (studios.find((s) => s.id === instructor.primary_studio_id) || {}).name || ''
          }
        : null,
      studio,
      bike_map,
      pricing_options,
      user_booking
    };
  }

  // createCheckoutForClassBooking(classSessionId, primaryRider, guests)
  createCheckoutForClassBooking(classSessionId, primaryRider, guests) {
    guests = guests || [];
    const classSessions = this._getFromStorage('class_sessions', []);
    const classSession = classSessions.find((c) => c.id === classSessionId);
    if (!classSession) {
      return { success: false, checkoutId: null, message: 'Class not available for booking.' };
    }

    const bookings = this._getFromStorage('bookings', []);
    const existingBookedBikeIds = bookings
      .filter((b) => b.class_session_id === classSessionId && b.booking_status === 'booked')
      .map((b) => b.bike_id)
      .filter(Boolean);

    const studioBikes = this._getFromStorage('studio_bikes', []);
    const bikeExists = (bikeId) => !bikeId || studioBikes.some((b) => b.id === bikeId);

    const allRequestedBikeIds = [];
    if (primaryRider && primaryRider.bikeId) allRequestedBikeIds.push(primaryRider.bikeId);
    for (const g of guests) {
      if (g.bikeId) allRequestedBikeIds.push(g.bikeId);
    }

    // Check for double-booked bikes
    for (const bikeId of allRequestedBikeIds) {
      if (!bikeExists(bikeId)) {
        return {
          success: false,
          checkoutId: null,
          message: 'Selected bike does not exist.'
        };
      }
      if (existingBookedBikeIds.includes(bikeId)) {
        return {
          success: false,
          checkoutId: null,
          message: 'One of the selected bikes is already booked.'
        };
      }
    }

    const checkout = this._getOrCreateCheckoutSession(true); // reset checkout
    const items = [];

    const addBookingItem = (options) => {
      const {
        riderType,
        bikeId,
        guestName,
        paymentMethod,
        ownedClassPackId,
        membershipSubscriptionId,
        ownedGuestPassId,
        guestPassPlanId
      } = options;

      let price = 0;
      let currency = classSession.currency || 'USD';

      if (paymentMethod === 'single_ride') {
        price = classSession.base_price || 0;
      } else {
        // class_pack, membership, guest_pass, free -> price 0 at checkout
        price = 0;
      }

      const metadata = {
        class_session_id: classSession.id,
        rider_type: riderType,
        bike_id: bikeId || null,
        guest_name: guestName || null,
        payment_method: paymentMethod,
        ownedClassPackId: ownedClassPackId || null,
        membershipSubscriptionId: membershipSubscriptionId || null,
        ownedGuestPassId: ownedGuestPassId || null,
        guestPassPlanId: guestPassPlanId || null
      };

      items.push({
        id: this._generateId('chk_item'),
        item_type: 'class_booking',
        description:
          (riderType === 'primary' ? 'Class booking' : 'Guest class booking') +
          ' - ' +
          classSession.name,
        unit_price: price,
        quantity: 1,
        total_price: price,
        currency,
        metadata
      });
    };

    // Primary rider
    if (primaryRider) {
      addBookingItem({
        riderType: 'primary',
        bikeId: primaryRider.bikeId,
        guestName: null,
        paymentMethod: primaryRider.paymentMethod || 'single_ride',
        ownedClassPackId: primaryRider.ownedClassPackId,
        membershipSubscriptionId: primaryRider.membershipSubscriptionId,
        ownedGuestPassId: primaryRider.ownedGuestPassId,
        guestPassPlanId: primaryRider.guestPassPlanId
      });
    }

    // Guests
    for (const g of guests) {
      addBookingItem({
        riderType: 'guest',
        bikeId: g.bikeId,
        guestName: g.guestName || 'Guest',
        paymentMethod: g.paymentMethod || 'single_ride',
        ownedClassPackId: g.ownedClassPackId,
        membershipSubscriptionId: null,
        ownedGuestPassId: g.ownedGuestPassId,
        guestPassPlanId: g.guestPassPlanId
      });
    }

    checkout.items = items;
    this._calculateOrderTotals(checkout);

    return {
      success: true,
      checkoutId: checkout.checkoutId,
      message: 'Checkout created for class booking.'
    };
  }

  // cancelClassBooking(bookingId)
  cancelClassBooking(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking || booking.booking_status !== 'booked') {
      return {
        success: false,
        booking_id: bookingId,
        new_status: booking ? booking.booking_status : null,
        refund_amount: 0,
        currency: booking ? booking.currency || 'USD' : 'USD',
        message: 'Booking not found or not cancelable.'
      };
    }

    booking.booking_status = 'canceled';
    booking.canceled_at = this._nowIso();

    // Restore entitlements if used
    if (booking.payment_source_type === 'class_pack' && booking.payment_source_id) {
      const ownedClassPacks = this._getFromStorage('owned_class_packs', []);
      const pack = ownedClassPacks.find((p) => p.id === booking.payment_source_id);
      if (pack && pack.remaining_rides != null) {
        pack.remaining_rides += 1;
        this._saveToStorage('owned_class_packs', ownedClassPacks);
      }
    } else if (booking.payment_source_type === 'guest_pass' && booking.payment_source_id) {
      const ownedGuestPasses = this._getFromStorage('owned_guest_passes', []);
      const gp = ownedGuestPasses.find((g) => g.id === booking.payment_source_id);
      if (gp && gp.remaining_uses != null) {
        gp.remaining_uses += 1;
        this._saveToStorage('owned_guest_passes', ownedGuestPasses);
      }
    }

    // Update class availability
    const classSessions = this._getFromStorage('class_sessions', []);
    const cls = classSessions.find((c) => c.id === booking.class_session_id);
    if (cls) {
      cls.available_bikes_count = (cls.available_bikes_count || 0) + 1;
      this._saveToStorage('class_sessions', classSessions);
    }

    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      booking_id: bookingId,
      new_status: booking.booking_status,
      refund_amount: 0,
      currency: booking.currency || 'USD',
      message: 'Booking canceled.'
    };
  }

  // getCheckoutState()
  getCheckoutState() {
    const checkout = this._getFromStorage('current_checkout', null) || {
      checkoutId: null,
      items: [],
      subtotal_amount: 0,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 0,
      currency: 'USD',
      applied_promo_code: null,
      payment_method_type: 'none',
      requires_payment_details: false
    };

    const { profile } = this._loadUserProfileWithEntitlements();
    const classSessions = this._getFromStorage('class_sessions', []);
    const studios = this._getFromStorage('studios', []);
    const instructors = this._getFromStorage('instructors', []);
    const studioBikes = this._getFromStorage('studio_bikes', []);

    const classMap = {};
    for (const c of classSessions) classMap[c.id] = c;
    const studioMap = {};
    for (const s of studios) studioMap[s.id] = s;
    const instructorMap = {};
    for (const i of instructors) instructorMap[i.id] = i;
    const bikeMap = {};
    for (const b of studioBikes) bikeMap[b.id] = b;

    const items = (checkout.items || []).map((it) => {
      if (it.item_type === 'class_booking' && it.metadata && it.metadata.class_session_id) {
        const cls = classMap[it.metadata.class_session_id] || {};
        const studio = studioMap[cls.studio_id] || {};
        const ins = instructorMap[cls.instructor_id] || {};
        const bike = it.metadata.bike_id ? bikeMap[it.metadata.bike_id] : null;
        const riderName =
          it.metadata.rider_type === 'guest' && it.metadata.guest_name
            ? it.metadata.guest_name
            : profile.full_name || 'You';
        return {
          item_type: it.item_type,
          description: it.description,
          unit_price: it.unit_price,
          quantity: it.quantity,
          total_price: it.total_price,
          metadata: {
            class_session_id: cls.id,
            class_session: cls,
            class_name: cls.name,
            start_datetime: cls.start_datetime,
            studio_name: studio.name || '',
            instructor_name: ins.name || '',
            bike_label: bike ? bike.label : null,
            rider_name: riderName
          }
        };
      }
      // Non-class items (packs, memberships, etc.) just echo basic fields
      return {
        item_type: it.item_type,
        description: it.description,
        unit_price: it.unit_price,
        quantity: it.quantity,
        total_price: it.total_price,
        metadata: it.metadata || {}
      };
    });

    const required_customer_fields = {
      full_name: !profile.full_name,
      email: !profile.email,
      password: !profile.email // require password only if creating an account
    };

    const existing_customer_info = {
      full_name: profile.full_name || '',
      email: profile.email || ''
    };

    return {
      checkoutId: checkout.checkoutId,
      items,
      subtotal_amount: checkout.subtotal_amount || 0,
      discount_amount: checkout.discount_amount || 0,
      tax_amount: checkout.tax_amount || 0,
      total_amount: checkout.total_amount || 0,
      currency: checkout.currency || 'USD',
      applied_promo_code: checkout.applied_promo_code || null,
      payment_method_type: checkout.payment_method_type || 'none',
      requires_payment_details: !!checkout.requires_payment_details,
      required_customer_fields,
      existing_customer_info
    };
  }

  // applyPromoCodeToCheckout(code)
  applyPromoCodeToCheckout(code) {
    let checkout = this._getFromStorage('current_checkout', null);
    if (!checkout || !checkout.items || checkout.items.length === 0) {
      return {
        success: false,
        message: 'No active checkout to apply promo code to.',
        checkout: null
      };
    }

    const promoCodes = this._getFromStorage('promo_codes', []);
    const promo = promoCodes.find(
      (p) => p.is_active && p.code && p.code.toLowerCase() === String(code || '').toLowerCase()
    );

    if (!promo) {
      return {
        success: false,
        message: 'Promo code not found or inactive.',
        checkout: null
      };
    }

    // Determine if promo applies based on items
    const hasClassBooking = checkout.items.some((it) => it.item_type === 'class_booking');
    const hasPack = checkout.items.some((it) => it.item_type === 'class_pack_purchase');
    const hasMembership = checkout.items.some((it) => it.item_type === 'membership_purchase');
    const hasGuestPass = checkout.items.some((it) => it.item_type === 'guest_pass_purchase');

    let applicable = false;
    if (promo.applies_to_class_bookings && hasClassBooking) applicable = true;
    if (promo.applies_to_packs && hasPack) applicable = true;
    if (promo.applies_to_memberships && hasMembership) applicable = true;
    if (promo.applies_to_guest_passes && hasGuestPass) applicable = true;

    if (!applicable) {
      return {
        success: false,
        message: 'Promo code not applicable to items in checkout.',
        checkout: null
      };
    }

    checkout.promo_code_id = promo.id;
    checkout = this._calculateOrderTotals(checkout);

    return {
      success: true,
      message: 'Promo code applied.',
      checkout: {
        checkoutId: checkout.checkoutId,
        subtotal_amount: checkout.subtotal_amount,
        discount_amount: checkout.discount_amount,
        tax_amount: checkout.tax_amount,
        total_amount: checkout.total_amount,
        currency: checkout.currency,
        applied_promo_code: checkout.applied_promo_code
      }
    };
  }

  // completeCheckout(customerInfo, paymentDetails)
  completeCheckout(customerInfo, paymentDetails) {
    let checkout = this._getFromStorage('current_checkout', null);
    if (!checkout || !checkout.items || checkout.items.length === 0) {
      return {
        success: false,
        order: null,
        order_items: [],
        created_bookings: [],
        created_owned_class_packs: [],
        created_membership_subscriptions: [],
        created_owned_guest_passes: [],
        redirect_suggestion: 'home',
        message: 'No active checkout.'
      };
    }

    checkout = this._calculateOrderTotals(checkout);

    const requiresPaymentDetails = checkout.requires_payment_details;
    if (requiresPaymentDetails) {
      if (!paymentDetails || !paymentDetails.cardNumber) {
        return {
          success: false,
          order: null,
          order_items: [],
          created_bookings: [],
          created_owned_class_packs: [],
          created_membership_subscriptions: [],
          created_owned_guest_passes: [],
          redirect_suggestion: 'checkout',
          message: 'Payment details are required.'
        };
      }
    }

    const { profile } = this._loadUserProfileWithEntitlements();

    // Update profile with customer info if provided
    if (customerInfo) {
      const profiles = this._getFromStorage('profiles', []);
      const idx = profiles.findIndex((p) => p.id === profile.id);
      if (idx >= 0) {
        if (customerInfo.fullName) profiles[idx].full_name = customerInfo.fullName;
        if (customerInfo.email) profiles[idx].email = customerInfo.email;
        profiles[idx].updated_at = this._nowIso();
        this._saveToStorage('profiles', profiles);
      }
    }

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const bookings = this._getFromStorage('bookings', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const membershipPlans = this._getFromStorage('membership_plans', []);
    const classPackPlans = this._getFromStorage('class_pack_plans', []);
    const guestPassPlans = this._getFromStorage('guest_pass_plans', []);
    const ownedClassPacks = this._getFromStorage('owned_class_packs', []);
    const ownedGuestPasses = this._getFromStorage('owned_guest_passes', []);
    const membershipSubscriptions = this._getFromStorage('membership_subscriptions', []);

    const classSessionMap = {};
    for (const c of classSessions) classSessionMap[c.id] = c;
    const membershipPlanMap = {};
    for (const p of membershipPlans) membershipPlanMap[p.id] = p;
    const classPackPlanMap = {};
    for (const p of classPackPlans) classPackPlanMap[p.id] = p;
    const guestPassPlanMap = {};
    for (const p of guestPassPlans) guestPassPlanMap[p.id] = p;

    const orderId = this._generateId('ord');

    const order = {
      id: orderId,
      created_at: this._nowIso(),
      completed_at: this._nowIso(),
      status: 'completed',
      subtotal_amount: checkout.subtotal_amount || 0,
      discount_amount: checkout.discount_amount || 0,
      tax_amount: checkout.tax_amount || 0,
      total_amount: checkout.total_amount || 0,
      currency: checkout.currency || 'USD',
      promo_code_id: checkout.promo_code_id || null,
      payment_method_type: checkout.payment_method_type || 'none',
      card_brand: requiresPaymentDetails ? 'card' : null,
      card_last4: requiresPaymentDetails
        ? String(paymentDetails.cardNumber).slice(-4)
        : null,
      card_expiry_month: requiresPaymentDetails ? paymentDetails.cardExpiryMonth || null : null,
      card_expiry_year: requiresPaymentDetails ? paymentDetails.cardExpiryYear || null : null,
      billing_name: (paymentDetails && paymentDetails.billingName) || profile.full_name || '',
      billing_email: (paymentDetails && paymentDetails.billingEmail) || profile.email || '',
      notes: ''
    };

    const created_bookings = [];
    const created_owned_class_packs = [];
    const created_membership_subscriptions = [];
    const created_owned_guest_passes = [];

    // Map for guest pass plan purchases created in this order
    const newGuestPassPerPlan = {};

    for (const item of checkout.items) {
      if (item.item_type === 'class_pack_purchase') {
        const plan = classPackPlanMap[item.metadata.class_pack_plan_id];
        if (!plan) continue;
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          const ownedId = this._generateId('ocp');
          const now = new Date();
          const exp = plan.validity_days
            ? new Date(now.getTime() + plan.validity_days * 24 * 60 * 60 * 1000)
            : null;
          const owned = {
            id: ownedId,
            class_pack_plan_id: plan.id,
            purchased_at: now.toISOString(),
            expiration_date: exp ? exp.toISOString() : null,
            original_number_of_rides: plan.number_of_rides,
            remaining_rides: plan.number_of_rides,
            can_use_for_guests: !!plan.can_use_for_guests,
            status: 'active',
            order_id: orderId,
            notes: ''
          };
          ownedClassPacks.push(owned);
          created_owned_class_packs.push(owned);

          const oi = {
            id: this._generateId('oi'),
            order_id: orderId,
            item_type: 'class_pack',
            reference_id: owned.id,
            description: plan.name,
            unit_price: plan.price || 0,
            quantity: 1,
            total_price: plan.price || 0
          };
          orderItems.push(oi);
        }
      } else if (item.item_type === 'membership_purchase') {
        const plan = membershipPlanMap[item.metadata.membership_plan_id];
        if (!plan) continue;
        const now = new Date();
        const start = now;
        const end = plan.duration_days
          ? new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000)
          : null;
        const sub = {
          id: this._generateId('ms'),
          membership_plan_id: plan.id,
          status: 'active',
          start_date: start.toISOString(),
          end_date: end ? end.toISOString() : null,
          next_renewal_date:
            plan.billing_frequency === 'recurring' && end ? end.toISOString() : null,
          auto_renew_enabled: plan.auto_renew_default != null ? plan.auto_renew_default : true,
          price_per_period: plan.price || 0,
          currency: plan.currency || 'USD',
          last_billed_at: start.toISOString(),
          order_id: orderId,
          cancel_at: null,
          notes: ''
        };
        membershipSubscriptions.push(sub);
        created_membership_subscriptions.push(sub);

        const oi = {
          id: this._generateId('oi'),
          order_id: orderId,
          item_type: 'membership',
          reference_id: sub.id,
          description: plan.name,
          unit_price: plan.price || 0,
          quantity: 1,
          total_price: plan.price || 0
        };
        orderItems.push(oi);
      } else if (item.item_type === 'guest_pass_purchase') {
        const plan = guestPassPlanMap[item.metadata.guest_pass_plan_id];
        if (!plan) continue;
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          const ownedId = this._generateId('ogp');
          const now = new Date();
          const exp = plan.validity_days
            ? new Date(now.getTime() + plan.validity_days * 24 * 60 * 60 * 1000)
            : null;
          const owned = {
            id: ownedId,
            guest_pass_plan_id: plan.id,
            purchased_at: now.toISOString(),
            expiration_date: exp ? exp.toISOString() : null,
            remaining_uses: plan.max_guests_per_use || 1,
            status: 'active',
            order_id: orderId,
            notes: ''
          };
          ownedGuestPasses.push(owned);
          created_owned_guest_passes.push(owned);
          newGuestPassPerPlan[plan.id] = owned;

          const oi = {
            id: this._generateId('oi'),
            order_id: orderId,
            item_type: 'guest_pass',
            reference_id: owned.id,
            description: plan.name,
            unit_price: plan.price || 0,
            quantity: 1,
            total_price: plan.price || 0
          };
          orderItems.push(oi);
        }
      }
    }

    // Bookings created last so that guest passes purchased inline can be associated
    for (const item of checkout.items) {
      if (item.item_type !== 'class_booking' || !item.metadata) continue;
      const meta = item.metadata;
      const cls = classSessionMap[meta.class_session_id];
      if (!cls) continue;

      let payment_source_type = 'single_ride';
      let payment_source_id = null;
      let price_paid = item.total_price || 0;

      if (meta.payment_method === 'class_pack' && meta.ownedClassPackId) {
        payment_source_type = 'class_pack';
        payment_source_id = meta.ownedClassPackId;
        price_paid = 0;

        const pack = ownedClassPacks.find((p) => p.id === meta.ownedClassPackId);
        if (pack && pack.remaining_rides != null && pack.remaining_rides > 0) {
          pack.remaining_rides -= 1;
          if (pack.remaining_rides === 0) pack.status = 'consumed';
        }
      } else if (meta.payment_method === 'membership') {
        payment_source_type = 'membership';
        payment_source_id = meta.membershipSubscriptionId || null;
        price_paid = 0;
      } else if (meta.payment_method === 'guest_pass') {
        payment_source_type = 'guest_pass';
        let ownedGp = null;
        if (meta.ownedGuestPassId) {
          ownedGp = ownedGuestPasses.find((g) => g.id === meta.ownedGuestPassId) || null;
        } else if (meta.guestPassPlanId && newGuestPassPerPlan[meta.guestPassPlanId]) {
          ownedGp = newGuestPassPerPlan[meta.guestPassPlanId];
        }
        if (ownedGp) {
          payment_source_id = ownedGp.id;
          if (ownedGp.remaining_uses != null && ownedGp.remaining_uses > 0) {
            ownedGp.remaining_uses -= 1;
            if (ownedGp.remaining_uses === 0) ownedGp.status = 'consumed';
          }
          price_paid = 0;
        } else {
          // Fallback to single ride if no guest pass actually available
          payment_source_type = 'single_ride';
          payment_source_id = null;
          price_paid = item.total_price || 0;
        }
      } else if (meta.payment_method === 'free') {
        payment_source_type = 'free';
        payment_source_id = null;
        price_paid = 0;
      }

      const bookingId = this._generateId('bk');
      const booking = {
        id: bookingId,
        class_session_id: cls.id,
        bike_id: meta.bike_id || null,
        rider_type: meta.rider_type || 'primary',
        guest_name: meta.guest_name || null,
        booking_group_id: null, // could be grouped, omitted for simplicity
        price_paid,
        currency: cls.currency || 'USD',
        booking_status: 'booked',
        payment_source_type,
        payment_source_id,
        order_id: orderId,
        created_at: this._nowIso(),
        canceled_at: null,
        notes: ''
      };
      bookings.push(booking);
      created_bookings.push(booking);

      // Update class availability
      cls.available_bikes_count = Math.max((cls.available_bikes_count || 0) - 1, 0);

      const oi = {
        id: this._generateId('oi'),
        order_id: orderId,
        item_type: 'class_booking',
        reference_id: booking.id,
        description: item.description,
        unit_price: item.unit_price || 0,
        quantity: item.quantity || 1,
        total_price: item.total_price || 0
      };
      orderItems.push(oi);
    }

    // Persist all changes
    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('bookings', bookings);
    this._saveToStorage('class_sessions', classSessions);
    this._saveToStorage('owned_class_packs', ownedClassPacks);
    this._saveToStorage('membership_subscriptions', membershipSubscriptions);
    this._saveToStorage('owned_guest_passes', ownedGuestPasses);

    // Clear checkout
    this._saveToStorage('current_checkout', null);

    return {
      success: true,
      order,
      order_items: orderItems.filter((oi) => oi.order_id === orderId),
      created_bookings,
      created_owned_class_packs,
      created_membership_subscriptions,
      created_owned_guest_passes,
      redirect_suggestion: 'my_schedule',
      message: 'Checkout completed successfully.'
    };
  }

  // getInstructorFilterOptions()
  getInstructorFilterOptions() {
    const studios = this._getStudiosResolved();
    const rating_thresholds = [0, 3, 3.5, 4, 4.5, 5];
    return { studios, rating_thresholds };
  }

  // getInstructors(searchQuery, studioId, minRating, sort)
  getInstructors(searchQuery, studioId, minRating, sort) {
    let instructors = this._getInstructorsResolved();

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      instructors = instructors.filter((i) => i.name && i.name.toLowerCase().includes(q));
    }
    if (studioId) {
      instructors = instructors.filter((i) => i.primary_studio_id === studioId);
    }
    if (minRating != null) {
      instructors = instructors.filter((i) => (i.average_rating || 0) >= minRating);
    }

    if (sort === 'name_asc') {
      instructors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort === 'rating_desc') {
      instructors.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    return instructors.map((i) => ({
      instructor_id: i.id,
      name: i.name,
      photo_url: i.photo_url || '',
      primary_studio_name: (i.primary_studio && i.primary_studio.name) || '',
      average_rating: i.average_rating || 0,
      rating_count: i.rating_count || 0
    }));
  }

  // getInstructorDetail(instructorId)
  getInstructorDetail(instructorId) {
    const instructors = this._getFromStorage('instructors', []);
    const studios = this._getFromStorage('studios', []);
    const instructor = instructors.find((i) => i.id === instructorId) || null;
    const primary_studio = instructor
      ? studios.find((s) => s.id === instructor.primary_studio_id) || null
      : null;

    const { profile } = this._loadUserProfileWithEntitlements();
    const is_favorite = profile.favorite_instructor_id === instructorId;

    const classSessions = this._getFromStorage('class_sessions', []);
    const now = new Date();
    const upcoming = classSessions
      .filter((c) => c.instructor_id === instructorId && new Date(c.start_datetime) >= now)
      .sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''))
      .slice(0, 5)
      .map((c) => ({
        class_session_id: c.id,
        class_session: c,
        class_name: c.name,
        start_datetime: c.start_datetime,
        studio_name: (studios.find((s) => s.id === c.studio_id) || {}).name || '',
        difficulty: c.difficulty,
        base_price: c.base_price || 0,
        currency: c.currency || 'USD'
      }));

    return {
      instructor,
      primary_studio,
      is_favorite,
      upcoming_classes_preview: upcoming
    };
  }

  // getInstructorUpcomingClasses(instructorId, startDate, endDate)
  getInstructorUpcomingClasses(instructorId, startDate, endDate) {
    const classSessions = this._getFromStorage('class_sessions', []);
    const studios = this._getFromStorage('studios', []);

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const classes = classSessions
      .filter((c) => {
        if (c.instructor_id !== instructorId) return false;
        const d = new Date(c.start_datetime);
        return d >= start && d <= end;
      })
      .sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''))
      .map((c) => ({
        class_session_id: c.id,
        class_session: c,
        class_name: c.name,
        start_datetime: c.start_datetime,
        end_datetime: c.end_datetime,
        studio_name: (studios.find((s) => s.id === c.studio_id) || {}).name || '',
        difficulty: c.difficulty,
        base_price: c.base_price || 0,
        currency: c.currency || 'USD',
        available_bikes_count: c.available_bikes_count || 0
      }));

    return classes;
  }

  // getPricingOverview()
  getPricingOverview() {
    const classSessions = this._getFromStorage('class_sessions', []);
    let base_price = 0;
    let currency = 'USD';
    if (classSessions.length) {
      const min = classSessions.reduce((acc, c) => {
        const price = c.base_price || 0;
        return acc == null || price < acc ? price : acc;
      }, null);
      base_price = min != null ? min : 0;
      currency = classSessions[0].currency || 'USD';
    }

    return {
      single_ride_summary: {
        base_price,
        currency,
        description: 'Single-ride drop-in pricing varies by class and studio.'
      },
      class_pack_filters_supported: {
        min_rides_range: [1, 5, 10, 20, 50],
        max_price_range: [50, 100, 200, 500],
        sort_options: ['price_low_to_high', 'price_high_to_low', 'rides_high_to_low']
      },
      membership_filters_supported: {
        plan_types: ['unlimited', 'limited'],
        min_duration_days_options: [0, 30, 90, 180, 365]
      }
    };
  }

  // getClassPacks(minRides, maxPrice, sort)
  getClassPacks(minRides, maxPrice, sort) {
    let plans = this._getFromStorage('class_pack_plans', []);

    plans = plans.filter((p) => p.status === 'active');

    if (minRides != null) {
      plans = plans.filter((p) => (p.number_of_rides || 0) >= minRides);
    }
    if (maxPrice != null) {
      plans = plans.filter((p) => (p.price || 0) <= maxPrice);
    }

    if (sort === 'price_low_to_high') {
      plans.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      plans.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rides_high_to_low') {
      plans.sort((a, b) => (b.number_of_rides || 0) - (a.number_of_rides || 0));
    }

    const class_packs = plans.map((p) => ({
      class_pack_plan_id: p.id,
      name: p.name,
      description: p.description || '',
      number_of_rides: p.number_of_rides || 0,
      price: p.price || 0,
      currency: p.currency || 'USD',
      validity_days: p.validity_days || null,
      can_use_for_guests: !!p.can_use_for_guests,
      terms_summary: p.terms_summary || ''
    }));

    return {
      filters_applied: {
        minRides: minRides != null ? minRides : undefined,
        maxPrice: maxPrice != null ? maxPrice : undefined,
        sort: sort || undefined
      },
      class_packs
    };
  }

  // getClassPackPlanDetail(classPackPlanId)
  getClassPackPlanDetail(classPackPlanId) {
    const plans = this._getFromStorage('class_pack_plans', []);
    const plan = plans.find((p) => p.id === classPackPlanId) || null;
    if (!plan) {
      return {
        class_pack_plan: null,
        per_ride_price: 0,
        valid_studios: [],
        can_use_for_guests: false,
        terms_summary: '',
        highlighted_benefits: []
      };
    }

    const per_ride_price =
      plan.price != null && plan.number_of_rides
        ? plan.price / plan.number_of_rides
        : 0;

    return {
      class_pack_plan: plan,
      per_ride_price,
      valid_studios: this._getStudiosResolved(),
      can_use_for_guests: !!plan.can_use_for_guests,
      terms_summary: plan.terms_summary || '',
      highlighted_benefits: [
        plan.number_of_rides ? plan.number_of_rides + ' rides included' : 'Multi-ride value',
        plan.validity_days ? 'Valid for ' + plan.validity_days + ' days' : 'Flexible validity'
      ]
    };
  }

  // createCheckoutForClassPackPurchase(classPackPlanId, quantity)
  createCheckoutForClassPackPurchase(classPackPlanId, quantity) {
    const plans = this._getFromStorage('class_pack_plans', []);
    const plan = plans.find((p) => p.id === classPackPlanId && p.status === 'active');
    if (!plan) {
      return {
        success: false,
        checkoutId: null,
        message: 'Class pack not found or inactive.'
      };
    }

    const qty = quantity != null ? quantity : 1;
    const checkout = this._getOrCreateCheckoutSession(true);

    const unit_price = plan.price || 0;
    const total_price = unit_price * qty;

    checkout.items = [
      {
        id: this._generateId('chk_item'),
        item_type: 'class_pack_purchase',
        description: plan.name,
        unit_price,
        quantity: qty,
        total_price,
        currency: plan.currency || 'USD',
        metadata: {
          class_pack_plan_id: plan.id
        }
      }
    ];

    this._calculateOrderTotals(checkout);

    return {
      success: true,
      checkoutId: checkout.checkoutId,
      message: 'Checkout created for class pack purchase.'
    };
  }

  // getMembershipPlans(planType, minDurationDays, sort)
  getMembershipPlans(planType, minDurationDays, sort) {
    let plans = this._getFromStorage('membership_plans', []);
    plans = plans.filter((p) => p.status === 'active');

    if (planType) {
      plans = plans.filter((p) => p.plan_type === planType);
    }
    if (minDurationDays != null) {
      plans = plans.filter((p) => (p.duration_days || 0) >= minDurationDays);
    }

    if (sort === 'price_low_to_high') {
      plans.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'duration_high_to_low') {
      plans.sort((a, b) => (b.duration_days || 0) - (a.duration_days || 0));
    }

    return {
      filters_applied: {
        planType: planType || undefined,
        minDurationDays: minDurationDays != null ? minDurationDays : undefined,
        sort: sort || undefined
      },
      membership_plans: plans
    };
  }

  // getMembershipPlanDetail(membershipPlanId)
  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan) {
      return {
        membership_plan: null,
        included_studios: [],
        is_unlimited: false,
        auto_renew_default: false,
        highlighted_terms: []
      };
    }

    const studios = this._getFromStorage('studios', []);
    const included_studios = (plan.included_studio_ids || []).map(
      (id) => studios.find((s) => s.id === id)
    ).filter(Boolean);

    return {
      membership_plan: plan,
      included_studios,
      is_unlimited: plan.plan_type === 'unlimited',
      auto_renew_default: plan.auto_renew_default != null ? plan.auto_renew_default : true,
      highlighted_terms: [
        plan.duration_days ? 'Duration: ' + plan.duration_days + ' days' : 'Flexible term',
        plan.plan_type === 'unlimited' ? 'Unlimited rides' : 'Limited rides per period'
      ]
    };
  }

  // createCheckoutForMembershipPurchase(membershipPlanId)
  createCheckoutForMembershipPurchase(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === membershipPlanId && p.status === 'active');
    if (!plan) {
      return {
        success: false,
        checkoutId: null,
        message: 'Membership plan not found or inactive.'
      };
    }

    const checkout = this._getOrCreateCheckoutSession(true);
    const unit_price = plan.price || 0;

    checkout.items = [
      {
        id: this._generateId('chk_item'),
        item_type: 'membership_purchase',
        description: plan.name,
        unit_price,
        quantity: 1,
        total_price: unit_price,
        currency: plan.currency || 'USD',
        metadata: {
          membership_plan_id: plan.id
        }
      }
    ];

    this._calculateOrderTotals(checkout);

    return {
      success: true,
      checkoutId: checkout.checkoutId,
      message: 'Checkout created for membership purchase.'
    };
  }

  // getGuestPassOptions()
  getGuestPassOptions() {
    const plans = this._getFromStorage('guest_pass_plans', []);
    return plans.filter((p) => p.status === 'active');
  }

  // getMySchedule(timeframe)
  getMySchedule(timeframe) {
    const bookings = this._getFromStorage('bookings', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const studios = this._getFromStorage('studios', []);
    const instructors = this._getFromStorage('instructors', []);
    const studioBikes = this._getFromStorage('studio_bikes', []);

    const classMap = {};
    for (const c of classSessions) classMap[c.id] = c;
    const studioMap = {};
    for (const s of studios) studioMap[s.id] = s;
    const instructorMap = {};
    for (const i of instructors) instructorMap[i.id] = i;
    const bikeMap = {};
    for (const b of studioBikes) bikeMap[b.id] = b;

    const now = new Date();
    const nowIso = now.toISOString();
    const plus7 = this._daysFromNow(7);

    const primaryBookings = bookings.filter((b) => b.rider_type === 'primary');

    let upcoming = [];
    let past = [];

    for (const b of primaryBookings) {
      const cls = classMap[b.class_session_id] || null;
      const start = cls && cls.start_datetime ? new Date(cls.start_datetime) : now;

      let inUpcoming = false;
      let inPast = false;

      if (!timeframe || timeframe === 'upcoming') {
        inUpcoming = start >= now && b.booking_status === 'booked';
        inPast = start < now;
      } else if (timeframe === 'past') {
        inPast = start < now;
      } else if (timeframe === 'next_7_days') {
        inUpcoming = start >= now && start <= plus7 && b.booking_status === 'booked';
      } else if (timeframe === 'next_30_days') {
        const plus30 = this._daysFromNow(30);
        inUpcoming = start >= now && start <= plus30 && b.booking_status === 'booked';
      }

      const studio = cls ? studioMap[cls.studio_id] || {} : {};
      const ins = cls ? instructorMap[cls.instructor_id] || {} : {};
      const bike = b.bike_id ? bikeMap[b.bike_id] : null;

      const entry = {
        booking_id: b.id,
        booking_status: b.booking_status,
        class_session_id: cls ? cls.id : b.class_session_id,
        class_session: cls,
        class_name: cls ? cls.name : '',
        start_datetime: cls ? cls.start_datetime : b.created_at || '',
        end_datetime: cls ? cls.end_datetime : null,
        studio_name: studio.name || '',
        instructor_name: ins.name || '',
        bike_label: bike ? bike.label : null,
        price_paid: b.price_paid || 0,
        currency: b.currency || 'USD',
        cancelable:
          b.booking_status === 'booked' &&
          (cls ? cls.start_datetime > nowIso : true)
      };

      if (inUpcoming) upcoming.push(entry);
      if (inPast) past.push(entry);
    }

    upcoming.sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''));
    past.sort((a, b) => (b.start_datetime || '').localeCompare(a.start_datetime || ''));

    return {
      timeframe: timeframe || 'upcoming',
      upcoming_bookings: upcoming,
      past_bookings: past
    };
  }

  // getProfile()
  getProfile() {
    const studios = this._getFromStorage('studios', []);
    const instructors = this._getFromStorage('instructors', []);
    let profiles = this._getFromStorage('profiles', []);
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('profile'),
        full_name: '',
        email: '',
        phone: '',
        preferred_studio_id: null,
        favorite_instructor_id: null,
        marketing_opt_in: false,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      profiles.push(profile);
      this._saveToStorage('profiles', profiles);
    }

    const preferred_studio = profile.preferred_studio_id
      ? studios.find((s) => s.id === profile.preferred_studio_id) || null
      : null;
    const favorite_instructor = profile.favorite_instructor_id
      ? instructors.find((i) => i.id === profile.favorite_instructor_id) || null
      : null;

    return {
      profile: {
        ...profile,
        preferred_studio,
        favorite_instructor
      }
    };
  }

  // updateProfile(profileUpdates)
  updateProfile(profileUpdates) {
    let profiles = this._getFromStorage('profiles', []);
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('profile'),
        full_name: '',
        email: '',
        phone: '',
        preferred_studio_id: null,
        favorite_instructor_id: null,
        marketing_opt_in: false,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      profiles.push(profile);
    }

    if (profileUpdates.fullName != null) profile.full_name = profileUpdates.fullName;
    if (profileUpdates.email != null) profile.email = profileUpdates.email;
    if (profileUpdates.phone != null) profile.phone = profileUpdates.phone;
    if (profileUpdates.preferredStudioId != null)
      profile.preferred_studio_id = profileUpdates.preferredStudioId;
    if (profileUpdates.favoriteInstructorId != null)
      profile.favorite_instructor_id = profileUpdates.favoriteInstructorId;
    if (profileUpdates.marketingOptIn != null)
      profile.marketing_opt_in = !!profileUpdates.marketingOptIn;

    profile.updated_at = this._nowIso();

    profiles[0] = profile;
    this._saveToStorage('profiles', profiles);

    const studios = this._getFromStorage('studios', []);
    const instructors = this._getFromStorage('instructors', []);
    const preferred_studio = profile.preferred_studio_id
      ? studios.find((s) => s.id === profile.preferred_studio_id) || null
      : null;
    const favorite_instructor = profile.favorite_instructor_id
      ? instructors.find((i) => i.id === profile.favorite_instructor_id) || null
      : null;

    return {
      success: true,
      profile: {
        ...profile,
        preferred_studio,
        favorite_instructor
      },
      message: 'Profile updated.'
    };
  }

  // getPreferenceOptions()
  getPreferenceOptions() {
    return {
      studios: this._getStudiosResolved(),
      instructors: this._getInstructorsResolved()
    };
  }

  // getBillingSummary()
  getBillingSummary() {
    const owned_class_packs = this._getFromStorage('owned_class_packs', []);
    const owned_guest_passes = this._getFromStorage('owned_guest_passes', []);
    const membership_subscriptions = this._getFromStorage('membership_subscriptions', []);
    const class_pack_plans = this._getFromStorage('class_pack_plans', []);
    const membership_plans = this._getFromStorage('membership_plans', []);
    const guest_pass_plans = this._getFromStorage('guest_pass_plans', []);
    const orders = this._getFromStorage('orders', []);

    const classPackPlanMap = {};
    for (const p of class_pack_plans) classPackPlanMap[p.id] = p;
    const membershipPlanMap = {};
    for (const p of membership_plans) membershipPlanMap[p.id] = p;
    const guestPassPlanMap = {};
    for (const p of guest_pass_plans) guestPassPlanMap[p.id] = p;

    const ocp = owned_class_packs.map((o) => ({
      owned_class_pack: o,
      plan: classPackPlanMap[o.class_pack_plan_id] || null
    }));

    const msubs = membership_subscriptions.map((s) => ({
      subscription: s,
      plan: membershipPlanMap[s.membership_plan_id] || null
    }));

    const ogp = owned_guest_passes.map((g) => ({
      owned_guest_pass: g,
      plan: guestPassPlanMap[g.guest_pass_plan_id] || null
    }));

    return {
      owned_class_packs: ocp,
      membership_subscriptions: msubs,
      owned_guest_passes: ogp,
      billing_history: orders
    };
  }

  // updateMembershipAutoRenew(subscriptionId, autoRenewEnabled)
  updateMembershipAutoRenew(subscriptionId, autoRenewEnabled) {
    const membership_subscriptions = this._getFromStorage('membership_subscriptions', []);
    const sub = membership_subscriptions.find((s) => s.id === subscriptionId) || null;
    if (!sub) {
      return { success: false, subscription: null, message: 'Subscription not found.' };
    }

    sub.auto_renew_enabled = !!autoRenewEnabled;
    if (!autoRenewEnabled) {
      sub.cancel_at = this._nowIso();
    } else {
      sub.cancel_at = null;
    }

    this._saveToStorage('membership_subscriptions', membership_subscriptions);

    return { success: true, subscription: sub, message: 'Auto-renew updated.' };
  }

  // getStudiosList()
  getStudiosList() {
    return this._getStudiosResolved();
  }

  // getStudioDetail(studioId)
  getStudioDetail(studioId) {
    const studios = this._getFromStorage('studios', []);
    const studio = studios.find((s) => s.id === studioId) || null;
    return {
      studio,
      amenities: studio && studio.amenities ? studio.amenities : []
    };
  }

  // getAboutContent()
  getAboutContent() {
    return {
      story:
        'Our indoor cycling studio was founded to bring high-energy, inclusive fitness to every rider.',
      mission: 'To build stronger communities through movement, music, and mindful training.',
      values: [
        'Community first',
        'Evidence-based coaching',
        'Inclusive for all levels',
        'Sustainable progress'
      ],
      instructor_team_overview:
        'Our instructor team blends performance coaching with rhythm riding to keep every class engaging.'
    };
  }

  // getContactInfo()
  getContactInfo() {
    const studios = this._getStudiosResolved();
    return {
      support_email: 'support@example-cycling.com',
      support_phone: '+1 (555) 000-0000',
      studio_addresses: studios
    };
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    if (!name || !email || !message) {
      return {
        success: false,
        ticket_id: null,
        message: 'Name, email, and message are required.'
      };
    }

    const tickets = this._getFromStorage('contact_tickets', []);
    const ticket_id = this._generateId('ticket');
    tickets.push({
      id: ticket_id,
      name,
      email,
      topic: topic || 'other',
      message,
      created_at: this._nowIso()
    });
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticket_id,
      message: 'Your message has been received.'
    };
  }

  // getFaqContent()
  getFaqContent() {
    return {
      booking_questions: [
        {
          question: 'How do I book a class?',
          answer: 'Browse the schedule, choose a class, select a bike, and complete checkout.'
        },
        {
          question: 'Can I bring a guest?',
          answer:
            'Yes, you can add a guest rider during booking when seats and guest passes are available.'
        }
      ],
      cancellation_policy:
        'Classes may generally be canceled up to 12 hours before start time. Late cancellations may forfeit the credit.',
      class_pack_terms:
        'Class packs are non-refundable and expire after their listed validity period. Remaining rides are forfeited after expiration.',
      membership_terms:
        'Memberships renew according to their billing frequency unless auto-renew is disabled. Missed classes are not refunded.',
      guest_pass_usage:
        'Guest passes may be applied to eligible classes and are subject to availability and expiration dates.'
    };
  }

  // getTermsOfServiceContent()
  getTermsOfServiceContent() {
    return {
      last_updated: '2024-01-01',
      content:
        'These Terms of Service govern your use of the indoor cycling booking platform. By creating an account or booking a class, you agree to these terms...'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      last_updated: '2024-01-01',
      content:
        'We respect your privacy and are committed to protecting your personal data. This policy explains what we collect, how we use it, and your rights...'
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
