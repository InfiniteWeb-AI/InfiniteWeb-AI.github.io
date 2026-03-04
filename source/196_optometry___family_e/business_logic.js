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
    this._getNextIdCounter(); // prime counter
  }

  // ---------- Storage helpers ----------

  _initStorage() {
    const keys = [
      'users',
      'clinic_locations',
      'insurance_plans',
      'doctors',
      'exam_types',
      'appointment_slots',
      'appointments',
      'brands',
      'lens_options',
      'products',
      'product_reviews',
      'carts',
      'cart_items',
      'orders',
      'offers',
      'add_on_options',
      'offer_estimates',
      'newsletter_topics',
      'newsletter_subscriptions',
      'tags',
      'articles',
      'doctor_reviews',
      'accessibility_settings',
      'contact_messages'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------- Foreign key attachment helpers ----------

  _attachDoctorRelations(doctor) {
    if (!doctor) return null;
    const locations = this._getFromStorage('clinic_locations');
    const insurance_plans = this._getFromStorage('insurance_plans');
    const exam_types = this._getFromStorage('exam_types');

    const primary_location = doctor.primary_location_id
      ? locations.find(l => l.id === doctor.primary_location_id) || null
      : null;

    const doctor_locations = Array.isArray(doctor.location_ids)
      ? locations.filter(l => doctor.location_ids.includes(l.id))
      : [];

    const accepted_insurance_plans = Array.isArray(doctor.accepted_insurance_plan_ids)
      ? insurance_plans.filter(p => doctor.accepted_insurance_plan_ids.includes(p.id))
      : [];

    const doctor_exam_types = Array.isArray(doctor.exam_type_ids)
      ? exam_types.filter(e => doctor.exam_type_ids.includes(e.id))
      : [];

    return {
      ...doctor,
      primary_location,
      locations: doctor_locations,
      accepted_insurance_plans,
      exam_types: doctor_exam_types
    };
  }

  _attachProductRelations(product) {
    if (!product) return null;
    const brands = this._getFromStorage('brands');
    const lens_options = this._getFromStorage('lens_options');

    const brand = product.brand_id
      ? brands.find(b => b.id === product.brand_id) || null
      : null;

    const available_lens_options = Array.isArray(product.lens_option_ids)
      ? lens_options.filter(l => product.lens_option_ids.includes(l.id))
      : [];

    return {
      ...product,
      brand,
      available_lens_options
    };
  }

  _attachArticleRelations(article) {
    if (!article) return null;
    const tags = this._getFromStorage('tags');
    const article_tags = Array.isArray(article.tag_ids)
      ? tags.filter(t => article.tag_ids.includes(t.id))
      : [];
    return {
      ...article,
      tags: article_tags
    };
  }

  // ---------- Cart helpers (required private helpers) ----------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.is_active !== false) || null;

    if (!cart) {
      const now = this._nowIso();
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        subtotal: 0,
        discount_total: 0,
        tax_total: 0,
        shipping_total: 0,
        grand_total: 0,
        created_at: now,
        updated_at: now,
        is_active: true
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  _getCartItemsForCart(cartId) {
    const cart_items = this._getFromStorage('cart_items');
    return cart_items.filter(ci => ci.cart_id === cartId);
  }

  _recalculateCartTotals(cart) {
    if (!cart) return { cart: null, items: [] };
    const carts = this._getFromStorage('carts');
    const cart_items = this._getCartItemsForCart(cart.id);

    const subtotal = cart_items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const discount_total = cart.discount_total || 0;
    const tax_total = cart.tax_total || 0;
    const shipping_total = cart.shipping_total || 0;
    const grand_total = subtotal - discount_total + tax_total + shipping_total;

    const updated_cart = {
      ...cart,
      subtotal,
      discount_total,
      tax_total,
      shipping_total,
      grand_total,
      updated_at: this._nowIso()
    };

    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = updated_cart;
      this._saveToStorage('carts', carts);
    }

    return { cart: updated_cart, items: cart_items };
  }

  // ---------- Appointment slot helper ----------

  _filterAndSortAppointmentSlots(slots, date, timeRangeStart, timeRangeEnd, sortBy) {
    let filtered = slots;

    if (date) {
      filtered = filtered.filter(slot => {
        const d = new Date(slot.starts_at);
        const iso = d.toISOString().slice(0, 10);
        return iso === date;
      });
    }

    const parseTimeToMinutes = t => {
      if (!t) return null;
      const parts = t.split(':');
      if (parts.length < 2) return null;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    };

    const startMin = parseTimeToMinutes(timeRangeStart);
    const endMin = parseTimeToMinutes(timeRangeEnd);

    if (startMin !== null || endMin !== null) {
      filtered = filtered.filter(slot => {
        const d = new Date(slot.starts_at);
        const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
        if (startMin !== null && minutes < startMin) return false;
        if (endMin !== null && minutes > endMin) return false;
        return true;
      });
    }

    const sortKey = sortBy || 'time_earliest_first';
    filtered.sort((a, b) => {
      const tA = new Date(a.starts_at).getTime();
      const tB = new Date(b.starts_at).getTime();
      if (sortKey === 'time_latest_first') return tB - tA;
      return tA - tB;
    });

    return filtered;
  }

  // ---------- Offer pricing helper ----------

  _calculateOfferPricing(offer, numAdultExams, numChildExams, framesLevel, selectedAddOns) {
    const adults = numAdultExams || 0;
    const children = numChildExams || 0;
    const totalPatients = adults + children;

    const adultPrice = offer.base_adult_exam_price || 0;
    const childPrice = offer.base_child_exam_price || 0;

    let subtotal = adults * adultPrice + children * childPrice;

    let framesCost = 0;
    switch (framesLevel) {
      case 'standard_frames':
        framesCost = 50 * totalPatients;
        break;
      case 'premium_frames':
        framesCost = 100 * totalPatients;
        break;
      case 'basic_frames_included':
      case 'no_frames':
      default:
        framesCost = 0;
        break;
    }
    subtotal += framesCost;

    const addOnTotal = (selectedAddOns || []).reduce((sum, addOn) => sum + (addOn.price || 0), 0);
    subtotal += addOnTotal;

    let discount = 0;
    if (offer.offer_type === 'family_package') {
      discount = subtotal * 0.1;
    }

    const total = subtotal - discount;
    return {
      subtotal,
      discount_amount: discount,
      total_price: total
    };
  }

  // ---------- Accessibility helpers ----------

  _getCurrentAccessibilitySettings() {
    let settingsArr = this._getFromStorage('accessibility_settings');
    if (!Array.isArray(settingsArr)) settingsArr = [];

    let settings = settingsArr[0] || null;
    if (!settings) {
      settings = {
        id: this._generateId('accessibility'),
        text_size_scale: 1.0,
        high_contrast_enabled: false,
        updated_at: this._nowIso()
      };
      settingsArr = [settings];
      this._saveToStorage('accessibility_settings', settingsArr);
    }
    return settings;
  }

  _saveAccessibilitySettings(settings) {
    const arr = [settings];
    this._saveToStorage('accessibility_settings', arr);
    return settings;
  }

  // ---------- Location distance helper ----------

  _calculateLocationDistances(zipCode, locations) {
    const baseZip = parseInt(zipCode || '0', 10);
    const distances = {};
    locations.forEach(loc => {
      const locZip = parseInt(loc.zip_code || '0', 10);
      let distance = 0;
      if (!isNaN(baseZip) && !isNaN(locZip)) {
        distance = Math.abs(baseZip - locZip) / 10;
      }
      distances[loc.id] = distance;
    });
    return distances;
  }

  // =============================================================
  // Interface implementations
  // =============================================================

  // ---------- Home page ----------

  getHomePageData() {
    const clinic_locations = this._getFromStorage('clinic_locations');
    const doctors = this._getFromStorage('doctors');
    const offers = this._getFromStorage('offers');
    const products = this._getFromStorage('products');
    const exam_types = this._getFromStorage('exam_types');
    const articles = this._getFromStorage('articles').filter(a => a.status === 'published');

    const featuredClinicLocations = clinic_locations.slice(0, 3);
    const featuredDoctors = doctors.slice(0, 3).map(d => this._attachDoctorRelations(d));

    const activeOffers = offers.filter(o => o.is_active);
    const featuredOffers = activeOffers.slice(0, 3);

    const frameProducts = products.filter(p => p.product_type === 'frame' && p.is_active);
    const contactLensProducts = products.filter(p => p.product_type === 'contact_lens' && p.is_active);

    const featuredFrameProducts = frameProducts.slice(0, 4).map(p => this._attachProductRelations(p));
    const featuredContactLensProducts = contactLensProducts
      .slice(0, 4)
      .map(p => this._attachProductRelations(p));

    const highlightedExamTypes = exam_types.slice(0, 4);

    const eyeHealthLibraryHighlightArticles = articles
      .slice()
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, 3)
      .map(a => this._attachArticleRelations(a));

    return {
      featuredClinicLocations,
      featuredDoctors,
      featuredOffers,
      featuredFrameProducts,
      featuredContactLensProducts,
      highlightedExamTypes,
      eyeHealthLibraryHighlightArticles
    };
  }

  // ---------- Appointment scheduling ----------

  getAppointmentSchedulingOptions() {
    const examTypes = this._getFromStorage('exam_types');
    const clinicLocations = this._getFromStorage('clinic_locations');

    const doctorSpecialtyOptions = [
      { specialtyCode: 'comprehensive_eye_care', label: 'Comprehensive eye care' },
      { specialtyCode: 'pediatric_eye_care', label: 'Pediatric eye care' },
      { specialtyCode: 'contact_lens_specialist', label: 'Contact lens specialist' }
    ];

    return {
      examTypes,
      clinicLocations,
      doctorSpecialtyOptions
    };
  }

  getAvailableAppointmentSlots(
    examTypeId,
    locationId,
    doctorId,
    date,
    timeRangeStart,
    timeRangeEnd,
    sortBy
  ) {
    // Instrumentation for task completion tracking
    try {
      if (locationId && !doctorId) {
        localStorage.setItem('task5_startedSchedulingLocationId', locationId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const allSlots = this._getFromStorage('appointment_slots');
    const locations = this._getFromStorage('clinic_locations');
    const doctors = this._getFromStorage('doctors');
    const examTypes = this._getFromStorage('exam_types');

    let slots = allSlots.filter(s => s.is_available && s.exam_type_id === examTypeId);

    if (locationId) {
      slots = slots.filter(s => s.location_id === locationId);
    }

    if (doctorId) {
      slots = slots.filter(s => s.doctor_id === doctorId);
    }

    slots = this._filterAndSortAppointmentSlots(slots, date, timeRangeStart, timeRangeEnd, sortBy);

    const enrichedSlots = slots.map(s => {
      const location = locations.find(l => l.id === s.location_id) || null;
      const doctor = doctors.find(d => d.id === s.doctor_id) || null;
      const examType = examTypes.find(e => e.id === s.exam_type_id) || null;
      return {
        ...s,
        location,
        doctor,
        examType
      };
    });

    const location = locationId ? locations.find(l => l.id === locationId) || null : null;
    const doctor = doctorId ? doctors.find(d => d.id === doctorId) || null : null;

    return {
      slots: enrichedSlots,
      location,
      doctor
    };
  }

  createAppointmentRequest(appointmentSlotId, patientFullName, patientPhone, patientEmail, notes) {
    const appointment_slots = this._getFromStorage('appointment_slots');
    const appointments = this._getFromStorage('appointments');
    const locations = this._getFromStorage('clinic_locations');
    const doctors = this._getFromStorage('doctors');

    const slot = appointment_slots.find(s => s.id === appointmentSlotId && s.is_available);

    if (!slot) {
      return {
        appointment: null,
        slot: null,
        location: null,
        doctor: null,
        success: false,
        message: 'Selected appointment slot is not available.'
      };
    }

    const appointment = {
      id: this._generateId('appt'),
      appointment_slot_id: slot.id,
      location_id: slot.location_id,
      doctor_id: slot.doctor_id || null,
      exam_type_id: slot.exam_type_id,
      patient_full_name: patientFullName,
      patient_phone: patientPhone,
      patient_email: patientEmail,
      status: 'requested',
      created_at: this._nowIso(),
      notes: notes || ''
    };

    appointments.push(appointment);

    // mark slot unavailable
    const updated_slots = appointment_slots.map(s =>
      s.id === slot.id
        ? { ...s, is_available: false }
        : s
    );

    this._saveToStorage('appointments', appointments);
    this._saveToStorage('appointment_slots', updated_slots);

    const location = locations.find(l => l.id === slot.location_id) || null;
    const doctor = slot.doctor_id ? doctors.find(d => d.id === slot.doctor_id) || null : null;

    return {
      appointment,
      slot,
      location,
      doctor,
      success: true,
      message: 'Appointment request created.'
    };
  }

  // ---------- Doctors listing & profile ----------

  getDoctorsFilterOptions() {
    const insurancePlans = this._getFromStorage('insurance_plans').filter(p => p.is_active);

    const specialtyOptions = [
      { code: 'comprehensive_eye_care', label: 'Comprehensive eye care' },
      { code: 'pediatric_eye_care', label: 'Pediatric eye care' },
      { code: 'contact_lens_specialist', label: 'Contact lens specialist' }
    ];

    const ratingThresholdOptions = [
      { minRating: 4.5, label: '4.5 stars & up' },
      { minRating: 4.0, label: '4.0 stars & up' },
      { minRating: 3.0, label: '3.0 stars & up' }
    ];

    const availableSortOptions = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'distance_low_to_high', label: 'Distance: Closest first' },
      { value: 'availability_soonest_first', label: 'Availability: Soonest first' }
    ];

    const defaultRadiusMiles = 10;

    return {
      specialtyOptions,
      ratingThresholdOptions,
      insurancePlans,
      defaultRadiusMiles,
      availableSortOptions
    };
  }

  searchDoctors(
    specialtyCode,
    minRating,
    insurancePlanId,
    zipCode,
    radiusMiles,
    sortBy
  ) {
    const doctorsRaw = this._getFromStorage('doctors');
    const clinic_locations = this._getFromStorage('clinic_locations');
    const appointment_slots = this._getFromStorage('appointment_slots');

    let doctors = doctorsRaw.slice();

    if (specialtyCode) {
      doctors = doctors.filter(d => Array.isArray(d.specialties) && d.specialties.includes(specialtyCode));
    }

    if (typeof minRating === 'number') {
      doctors = doctors.filter(d => (d.average_rating || 0) >= minRating);
    }

    if (insurancePlanId) {
      doctors = doctors.filter(d =>
        Array.isArray(d.accepted_insurance_plan_ids) &&
        d.accepted_insurance_plan_ids.includes(insurancePlanId)
      );
    }

    let distances = {};
    if (zipCode) {
      distances = this._calculateLocationDistances(zipCode, clinic_locations);
    }

    const radius = typeof radiusMiles === 'number' && radiusMiles > 0 ? radiusMiles : null;

    const results = [];

    for (const d of doctors) {
      let primaryLocation = null;
      if (d.primary_location_id) {
        primaryLocation = clinic_locations.find(l => l.id === d.primary_location_id) || null;
      } else if (Array.isArray(d.location_ids) && d.location_ids.length > 0) {
        primaryLocation = clinic_locations.find(l => d.location_ids.includes(l.id)) || null;
      }

      // Fallback: if no matching primary location record exists, infer from appointment slots
      if (!primaryLocation && Array.isArray(appointment_slots)) {
        const slotForDoctor = appointment_slots.find(s => s.doctor_id === d.id);
        if (slotForDoctor) {
          primaryLocation = clinic_locations.find(l => l.id === slotForDoctor.location_id) || null;
        }
      }

      if (!primaryLocation) continue;

      let distanceMiles = null;
      if (zipCode && primaryLocation) {
        distanceMiles = distances[primaryLocation.id];
      }

      if (radius !== null && distanceMiles !== null && distanceMiles > radius) {
        continue;
      }

      results.push({
        doctor: this._attachDoctorRelations(d),
        primaryLocation,
        distanceMiles
      });
    }

    const sortKey = sortBy || 'rating_high_to_low';

    results.sort((a, b) => {
      if (sortKey === 'distance_low_to_high') {
        const da = a.distanceMiles == null ? Number.POSITIVE_INFINITY : a.distanceMiles;
        const db = b.distanceMiles == null ? Number.POSITIVE_INFINITY : b.distanceMiles;
        if (da !== db) return da - db;
        const ra = a.doctor.average_rating || 0;
        const rb = b.doctor.average_rating || 0;
        return rb - ra;
      }

      if (sortKey === 'availability_soonest_first') {
        const ra = a.doctor.average_rating || 0;
        const rb = b.doctor.average_rating || 0;
        return rb - ra;
      }

      const ra = a.doctor.average_rating || 0;
      const rb = b.doctor.average_rating || 0;
      if (rb !== ra) return rb - ra;
      const da = a.distanceMiles == null ? Number.POSITIVE_INFINITY : a.distanceMiles;
      const db = b.distanceMiles == null ? Number.POSITIVE_INFINITY : b.distanceMiles;
      return da - db;
    });

    return {
      doctors: results,
      totalCount: results.length
    };
  }

  getDoctorProfile(doctorId) {
    const doctors = this._getFromStorage('doctors');
    const clinic_locations = this._getFromStorage('clinic_locations');
    const exam_types = this._getFromStorage('exam_types');
    const doctor_reviews = this._getFromStorage('doctor_reviews');

    const doctorRaw = doctors.find(d => d.id === doctorId) || null;
    if (!doctorRaw) {
      return {
        doctor: null,
        locations: [],
        examTypes: [],
        reviews: []
      };
    }

    const doctor = this._attachDoctorRelations(doctorRaw);

    const locations = Array.isArray(doctor.location_ids)
      ? clinic_locations.filter(l => doctor.location_ids.includes(l.id))
      : [];

    const examTypes = Array.isArray(doctor.exam_type_ids)
      ? exam_types.filter(e => doctor.exam_type_ids.includes(e.id))
      : [];

    const reviews = doctor_reviews
      .filter(r => r.doctor_id === doctorId)
      .map(r => ({ ...r, doctor }));

    return {
      doctor,
      locations,
      examTypes,
      reviews
    };
  }

  // ---------- Locations search ----------

  getLocationsFilterOptions() {
    const insurancePlans = this._getFromStorage('insurance_plans').filter(p => p.is_active);

    const hoursFilterOptions = [
      {
        code: 'evening_hours_2_days_min',
        label: 'Evening hours (after 6 pm) at least 2 days per week',
        requiresEveningHours2DaysMin: true
      }
    ];

    const availableSortOptions = [
      { value: 'distance_low_to_high', label: 'Distance: Closest first' },
      { value: 'name_a_to_z', label: 'Name: A to Z' }
    ];

    const defaultRadiusMiles = 10;

    return {
      insurancePlans,
      hoursFilterOptions,
      defaultRadiusMiles,
      availableSortOptions
    };
  }

  searchClinicLocations(
    zipCode,
    radiusMiles,
    insurancePlanId,
    requireEveningHours2DaysMin,
    sortBy
  ) {
    const locationsRaw = this._getFromStorage('clinic_locations');

    let locations = locationsRaw.slice();

    if (insurancePlanId) {
      locations = locations.filter(l =>
        Array.isArray(l.accepted_insurance_plan_ids) &&
        l.accepted_insurance_plan_ids.includes(insurancePlanId)
      );
    }

    if (requireEveningHours2DaysMin) {
      locations = locations.filter(l => l.has_evening_hours_2_days_min);
    }

    const radius = typeof radiusMiles === 'number' && radiusMiles > 0 ? radiusMiles : null;

    let distances = {};
    if (zipCode) {
      distances = this._calculateLocationDistances(zipCode, locations);
    }

    if (zipCode && radius !== null) {
      locations = locations.filter(l => {
        const d = distances[l.id];
        return d == null ? true : d <= radius;
      });
    }

    const sortKey = sortBy || 'distance_low_to_high';

    locations.sort((a, b) => {
      if (sortKey === 'name_a_to_z') {
        return (a.name || '').localeCompare(b.name || '');
      }

      const da = distances[a.id] == null ? Number.POSITIVE_INFINITY : distances[a.id];
      const db = distances[b.id] == null ? Number.POSITIVE_INFINITY : distances[b.id];
      if (da !== db) return da - db;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_locationSearch',
        JSON.stringify({
          zipCode,
          radiusMiles,
          insurancePlanId,
          requireEveningHours2DaysMin,
          sortBy,
          resultLocationIds: locations.map(l => l.id)
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      locations,
      totalCount: locations.length
    };
  }

  getClinicLocationDetail(locationId) {
    const clinic_locations = this._getFromStorage('clinic_locations');
    const doctorsRaw = this._getFromStorage('doctors');
    const insurance_plans = this._getFromStorage('insurance_plans');

    const location = clinic_locations.find(l => l.id === locationId) || null;

    if (!location) {
      return {
        location: null,
        doctors: [],
        acceptedInsurancePlans: []
      };
    }

    const doctors = doctorsRaw
      .filter(d => Array.isArray(d.location_ids) && d.location_ids.includes(locationId))
      .map(d => this._attachDoctorRelations(d));

    const acceptedInsurancePlans = Array.isArray(location.accepted_insurance_plan_ids)
      ? insurance_plans.filter(p => location.accepted_insurance_plan_ids.includes(p.id))
      : [];

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task5_selectedLocationId', locationId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      location,
      doctors,
      acceptedInsurancePlans
    };
  }

  // ---------- Frame shopping ----------

  getFrameFilterOptions() {
    const genderOptions = [
      { value: 'men', label: 'Men' },
      { value: 'women', label: 'Women' },
      { value: 'unisex', label: 'Unisex' },
      { value: 'kids', label: 'Kids' }
    ];

    const shapeOptions = [
      { value: 'rectangular', label: 'Rectangular' },
      { value: 'round', label: 'Round' },
      { value: 'square', label: 'Square' },
      { value: 'cat_eye', label: 'Cat-eye' },
      { value: 'aviator', label: 'Aviator' },
      { value: 'browline', label: 'Browline' },
      { value: 'geometric', label: 'Geometric' },
      { value: 'oval', label: 'Oval' },
      { value: 'other', label: 'Other' }
    ];

    const priceRangePresets = [
      { min: 0, max: 50, label: 'Up to $50' },
      { min: 50, max: 100, label: '$50 to $100' },
      { min: 100, max: 150, label: '$100 to $150' },
      { min: 150, max: 9999, label: '$150 & up' }
    ];

    const ratingThresholdOptions = [
      { minRating: 4.5, minReviewCount: 10, label: '4.5+ stars, 10+ reviews' },
      { minRating: 4.0, minReviewCount: 5, label: '4.0+ stars, 5+ reviews' },
      { minRating: 3.5, minReviewCount: 1, label: '3.5+ stars' }
    ];

    const availableSortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'popularity', label: 'Most popular' }
    ];

    return {
      genderOptions,
      shapeOptions,
      priceRangePresets,
      ratingThresholdOptions,
      availableSortOptions
    };
  }

  searchFrameProducts(
    gender,
    shape,
    minPrice,
    maxPrice,
    minRating,
    minReviewCount,
    sortBy,
    page,
    pageSize
  ) {
    const productsRaw = this._getFromStorage('products');

    let products = productsRaw.filter(p => p.product_type === 'frame' && p.is_active);

    if (gender) {
      products = products.filter(p => Array.isArray(p.genders) && p.genders.includes(gender));
    }

    if (shape) {
      products = products.filter(p => p.frame_shape === shape);
    }

    if (typeof minPrice === 'number') {
      products = products.filter(p => (p.price || 0) >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      products = products.filter(p => (p.price || 0) <= maxPrice);
    }

    if (typeof minRating === 'number') {
      products = products.filter(p => (p.rating_average || 0) >= minRating);
    }

    if (typeof minReviewCount === 'number') {
      products = products.filter(p => (p.review_count || 0) >= minReviewCount);
    }

    const sortKey = sortBy || 'price_low_to_high';

    products.sort((a, b) => {
      if (sortKey === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortKey === 'rating_high_to_low') {
        const ra = a.rating_average || 0;
        const rb = b.rating_average || 0;
        if (rb !== ra) return rb - ra;
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        return rcb - rca;
      }
      if (sortKey === 'popularity') {
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        if (rcb !== rca) return rcb - rca;
        const ra = a.rating_average || 0;
        const rb = b.rating_average || 0;
        return rb - ra;
      }
      return (a.price || 0) - (b.price || 0);
    });

    const totalCount = products.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const paged = products.slice(start, start + size).map(p => this._attachProductRelations(p));

    return {
      products: paged,
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // ---------- Contact lens shopping ----------

  getContactLensFilterOptions() {
    const brands = this._getFromStorage('brands').filter(
      b => b.brand_type === 'contact_lens_brand' || b.brand_type === 'multi_category'
    );

    const modalityOptions = [
      { value: 'daily', label: 'Daily' },
      { value: 'biweekly', label: 'Bi-weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annual', label: 'Annual' }
    ];

    const priceRangePresets = [
      { min: 0, max: 40, label: 'Up to $40/box' },
      { min: 40, max: 60, label: '$40 to $60/box' },
      { min: 60, max: 200, label: '$60 & up' }
    ];

    const shippingOptions = [
      { code: 'any', label: 'Any shipping' },
      { code: 'free_shipping', label: 'Free shipping only' }
    ];

    const availableSortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'popularity', label: 'Most popular' }
    ];

    return {
      brandOptions: brands,
      modalityOptions,
      priceRangePresets,
      shippingOptions,
      availableSortOptions
    };
  }

  searchContactLensProducts(
    brandId,
    minPricePerBox,
    maxPricePerBox,
    requireFreeShipping,
    sortBy,
    page,
    pageSize
  ) {
    const productsRaw = this._getFromStorage('products');

    let products = productsRaw.filter(p => p.product_type === 'contact_lens' && p.is_active);

    if (brandId) {
      products = products.filter(p => p.brand_id === brandId);
    }

    if (typeof minPricePerBox === 'number') {
      products = products.filter(p => (p.price || 0) >= minPricePerBox);
    }

    if (typeof maxPricePerBox === 'number') {
      products = products.filter(p => (p.price || 0) <= maxPricePerBox);
    }

    if (requireFreeShipping) {
      products = products.filter(p => !!p.is_free_shipping);
    }

    const sortKey = sortBy || 'price_low_to_high';

    products.sort((a, b) => {
      if (sortKey === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortKey === 'popularity') {
        const rca = a.review_count || 0;
        const rcb = b.review_count || 0;
        if (rcb !== rca) return rcb - rca;
        const ra = a.rating_average || 0;
        const rb = b.rating_average || 0;
        return rb - ra;
      }
      return (a.price || 0) - (b.price || 0);
    });

    const totalCount = products.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const paged = products.slice(start, start + size).map(p => this._attachProductRelations(p));

    return {
      products: paged,
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const lens_options = this._getFromStorage('lens_options');
    const product_reviews = this._getFromStorage('product_reviews');

    const product = products.find(p => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        brand: null,
        availableLensOptions: [],
        productReviews: []
      };
    }

    const brand = product.brand_id
      ? brands.find(b => b.id === product.brand_id) || null
      : null;

    const availableLensOptions = Array.isArray(product.lens_option_ids)
      ? lens_options.filter(l => product.lens_option_ids.includes(l.id))
      : [];

    const productReviews = product_reviews
      .filter(r => r.product_id === productId)
      .map(r => ({ ...r, product }));

    return {
      product,
      brand,
      availableLensOptions,
      productReviews
    };
  }

  // ---------- Cart: frames ----------

  addFrameToCart(productId, frameColor, frameSize, lensOptionId, quantity) {
    const products = this._getFromStorage('products');
    const lens_options = this._getFromStorage('lens_options');
    const cart_items = this._getFromStorage('cart_items');

    const product = products.find(p => p.id === productId && p.product_type === 'frame');
    if (!product) {
      return { success: false, message: 'Frame product not found.', cart: null, items: [] };
    }

    const lensOption = lens_options.find(l => l.id === lensOptionId);
    if (!lensOption) {
      return { success: false, message: 'Lens option not found.', cart: null, items: [] };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const unit_price = (product.price || 0) + (lensOption.price_adjustment || 0);
    const line_total = unit_price * qty;

    const cart = this._getOrCreateCart();

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      product_id: product.id,
      product_type: 'frame',
      quantity: qty,
      unit_price,
      line_total,
      frame_color: frameColor,
      frame_size: frameSize,
      lens_option_id: lensOption.id,
      eye: 'none',
      base_curve: null,
      power: null,
      purchase_type: 'one_time',
      created_at: this._nowIso(),
      updated_at: null
    };

    cart_items.push(cartItem);
    this._saveToStorage('cart_items', cart_items);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      const item_ids = Array.isArray(carts[idx].item_ids) ? carts[idx].item_ids.slice() : [];
      item_ids.push(cartItem.id);
      carts[idx] = { ...carts[idx], item_ids };
      this._saveToStorage('carts', carts);
    }

    const { cart: updatedCart, items } = this._recalculateCartTotals(cart);

    const itemsWithProduct = items.map(ci => {
      const p = products.find(pp => pp.id === ci.product_id) || null;
      return {
        cartItem: ci,
        product: this._attachProductRelations(p)
      };
    });

    return {
      success: true,
      message: 'Frame added to cart.',
      cart: updatedCart,
      items: itemsWithProduct
    };
  }

  // ---------- Cart: contact lenses ----------

  addContactLensesToCart(
    productId,
    rightEyeBaseCurve,
    rightEyePower,
    rightEyeQuantityBoxes,
    leftEyeBaseCurve,
    leftEyePower,
    leftEyeQuantityBoxes,
    purchaseType
  ) {
    const products = this._getFromStorage('products');
    const cart_items = this._getFromStorage('cart_items');

    const product = products.find(p => p.id === productId && p.product_type === 'contact_lens');
    if (!product) {
      return { success: false, message: 'Contact lens product not found.', cart: null, items: [] };
    }

    const validPurchaseType = purchaseType === 'subscription' ? 'subscription' : 'one_time';

    const cart = this._getOrCreateCart();
    const now = this._nowIso();

    let createdItems = [];

    const addEye = (eye, baseCurve, power, qtyBoxes) => {
      if (qtyBoxes && qtyBoxes > 0 && typeof baseCurve === 'number' && typeof power === 'number') {
        const unit_price = product.price || 0;
        const line_total = unit_price * qtyBoxes;
        const item = {
          id: this._generateId('cartitem'),
          cart_id: cart.id,
          product_id: product.id,
          product_type: 'contact_lens',
          quantity: qtyBoxes,
          unit_price,
          line_total,
          frame_color: null,
          frame_size: null,
          lens_option_id: null,
          eye,
          base_curve: baseCurve,
          power,
          purchase_type: validPurchaseType,
          created_at: now,
          updated_at: null
        };
        cart_items.push(item);
        createdItems.push(item);
      }
    };

    addEye('right', rightEyeBaseCurve, rightEyePower, rightEyeQuantityBoxes);
    addEye('left', leftEyeBaseCurve, leftEyePower, leftEyeQuantityBoxes);

    if (createdItems.length === 0) {
      return { success: false, message: 'No valid eye configurations provided.', cart: null, items: [] };
    }

    this._saveToStorage('cart_items', cart_items);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      const item_ids = Array.isArray(carts[idx].item_ids) ? carts[idx].item_ids.slice() : [];
      for (const ci of createdItems) {
        item_ids.push(ci.id);
      }
      carts[idx] = { ...carts[idx], item_ids };
      this._saveToStorage('carts', carts);
    }

    const { cart: updatedCart, items } = this._recalculateCartTotals(cart);

    const itemsWithProduct = items.map(ci => {
      const p = products.find(pp => pp.id === ci.product_id) || null;
      return {
        cartItem: ci,
        product: this._attachProductRelations(p)
      };
    });

    return {
      success: true,
      message: 'Contact lenses added to cart.',
      cart: updatedCart,
      items: itemsWithProduct
    };
  }

  // ---------- Cart getters & mutations ----------

  getCartDetails() {
    const products = this._getFromStorage('products');
    const cart = this._getOrCreateCart();
    const itemsRaw = this._getCartItemsForCart(cart.id);

    const items = itemsRaw.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cartItem: ci,
        product: this._attachProductRelations(product)
      };
    });

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      cart: updatedCart,
      items
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart_items = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const carts = this._getFromStorage('carts');

    const idxItem = cart_items.findIndex(ci => ci.id === cartItemId);
    if (idxItem === -1) {
      return { success: false, cart: null, items: [] };
    }

    const item = cart_items[idxItem];

    if (quantity <= 0) {
      cart_items.splice(idxItem, 1);
      this._saveToStorage('cart_items', cart_items);

      const cart = carts.find(c => c.id === item.cart_id) || null;
      if (!cart) {
        return { success: true, cart: null, items: [] };
      }

      const newItemIds = (cart.item_ids || []).filter(id => id !== cartItemId);
      const cartIdx = carts.findIndex(c => c.id === cart.id);
      if (cartIdx !== -1) {
        carts[cartIdx] = { ...cart, item_ids: newItemIds };
        this._saveToStorage('carts', carts);
      }

      const { cart: updatedCart, items: itemsRaw } = this._recalculateCartTotals(cart);
      const items = itemsRaw.map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        return { cartItem: ci, product: this._attachProductRelations(product) };
      });

      return { success: true, cart: updatedCart, items };
    }

    const updatedItem = {
      ...item,
      quantity,
      line_total: (item.unit_price || 0) * quantity,
      updated_at: this._nowIso()
    };
    cart_items[idxItem] = updatedItem;
    this._saveToStorage('cart_items', cart_items);

    const cart = carts.find(c => c.id === updatedItem.cart_id) || null;
    if (!cart) {
      return { success: true, cart: null, items: [] };
    }

    const { cart: updatedCart, items: itemsRaw } = this._recalculateCartTotals(cart);
    const items = itemsRaw.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return { cartItem: ci, product: this._attachProductRelations(product) };
    });

    return {
      success: true,
      cart: updatedCart,
      items
    };
  }

  removeCartItem(cartItemId) {
    const cart_items = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const carts = this._getFromStorage('carts');

    const idxItem = cart_items.findIndex(ci => ci.id === cartItemId);
    if (idxItem === -1) {
      return { success: false, cart: null, items: [] };
    }

    const item = cart_items[idxItem];
    cart_items.splice(idxItem, 1);
    this._saveToStorage('cart_items', cart_items);

    const cart = carts.find(c => c.id === item.cart_id) || null;
    if (!cart) {
      return { success: true, cart: null, items: [] };
    }

    const newItemIds = (cart.item_ids || []).filter(id => id !== cartItemId);
    const cartIdx = carts.findIndex(c => c.id === cart.id);
    if (cartIdx !== -1) {
      carts[cartIdx] = { ...cart, item_ids: newItemIds };
      this._saveToStorage('carts', carts);
    }

    const { cart: updatedCart, items: itemsRaw } = this._recalculateCartTotals(cart);
    const items = itemsRaw.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return { cartItem: ci, product: this._attachProductRelations(product) };
    });

    return {
      success: true,
      cart: updatedCart,
      items
    };
  }

  // ---------- Checkout & orders ----------

  getCheckoutSummary() {
    const products = this._getFromStorage('products');
    const cart = this._getOrCreateCart();
    const itemsRaw = this._getCartItemsForCart(cart.id);
    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    const items = itemsRaw.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return { cartItem: ci, product: this._attachProductRelations(product) };
    });

    const availableShippingMethods = [
      { method: 'standard', label: 'Standard shipping', cost: 0, estimatedDays: 5 },
      { method: 'expedited', label: 'Expedited shipping', cost: 9.99, estimatedDays: 2 },
      { method: 'overnight', label: 'Overnight shipping', cost: 19.99, estimatedDays: 1 },
      { method: 'pickup', label: 'In-clinic pickup', cost: 0, estimatedDays: 3 }
    ];

    const availablePaymentMethods = [
      'credit_card',
      'debit_card',
      'hsa_fsa_card',
      'paypal',
      'apple_pay',
      'google_pay',
      'other'
    ];

    // Instrumentation for task completion tracking
    try {
      if (cart && Array.isArray(itemsRaw) && itemsRaw.some(ci => ci.product_type === 'contact_lens')) {
        localStorage.setItem('task4_checkoutViewed', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      cart: updatedCart,
      items,
      availableShippingMethods,
      availablePaymentMethods
    };
  }

  submitOrder(
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    shippingMethod,
    paymentMethod,
    notes
  ) {
    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.is_active !== false) || null;

    if (!cart) {
      return {
        order: null,
        success: false,
        message: 'No active cart to submit.'
      };
    }

    const cart_items = this._getCartItemsForCart(cart.id);
    if (cart_items.length === 0) {
      return {
        order: null,
        success: false,
        message: 'Cart is empty.'
      };
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    const orders = this._getFromStorage('orders');
    const now = this._nowIso();

    const order = {
      id: this._generateId('order'),
      cart_id: updatedCart.id,
      order_number: 'O-' + Date.now(),
      status: 'pending',
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || '',
      shipping_address_line1: shippingAddress && shippingAddress.line1 ? shippingAddress.line1 : '',
      shipping_address_line2: shippingAddress && shippingAddress.line2 ? shippingAddress.line2 : '',
      shipping_city: shippingAddress && shippingAddress.city ? shippingAddress.city : '',
      shipping_state: shippingAddress && shippingAddress.state ? shippingAddress.state : '',
      shipping_zip_code: shippingAddress && shippingAddress.zipCode ? shippingAddress.zipCode : '',
      shipping_method: shippingMethod,
      shipping_cost: updatedCart.shipping_total || 0,
      tax_amount: updatedCart.tax_total || 0,
      order_subtotal: updatedCart.subtotal || 0,
      order_discount_total: updatedCart.discount_total || 0,
      order_total: updatedCart.grand_total || 0,
      payment_method: paymentMethod,
      created_at: now,
      notes: notes || ''
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    const cartIdx = carts.findIndex(c => c.id === updatedCart.id);
    if (cartIdx !== -1) {
      carts[cartIdx] = { ...updatedCart, is_active: false };
      this._saveToStorage('carts', carts);
    }

    return {
      order,
      success: true,
      message: 'Order submitted.'
    };
  }

  // ---------- Insurance & payments ----------

  getInsurancePlansByName(query) {
    const plansRaw = this._getFromStorage('insurance_plans');
    const q = (query || '').toLowerCase();

    const plans = plansRaw.filter(p => p.is_active && p.name && p.name.toLowerCase().includes(q));

    return { plans };
  }

  getAcceptedInsurancePlans() {
    const plans = this._getFromStorage('insurance_plans').filter(p => p.is_active);
    return plans;
  }

  getPaymentAndFinancingInfo() {
    const offers = this._getFromStorage('offers');

    const acceptedPaymentMethods = [
      'credit_card',
      'debit_card',
      'hsa_fsa_card',
      'paypal',
      'apple_pay',
      'google_pay',
      'other'
    ];

    const hsaFsaInfo = 'You can use eligible HSA/FSA funds for eye exams, glasses, and contact lenses. Check with your plan for specific coverage.';

    const financingPromotions = offers.filter(o => o.is_active);

    return {
      acceptedPaymentMethods,
      hsaFsaInfo,
      financingPromotions
    };
  }

  // ---------- Special offers & Family Value Package ----------

  getActiveOffers(offerType) {
    const offers = this._getFromStorage('offers');
    let active = offers.filter(o => o.is_active);
    if (offerType) {
      active = active.filter(o => o.offer_type === offerType);
    }
    return active;
  }

  getOfferDetail(offerId) {
    const offers = this._getFromStorage('offers');
    const add_on_options = this._getFromStorage('add_on_options');

    const offer = offers.find(o => o.id === offerId) || null;

    if (!offer) {
      return {
        offer: null,
        addOnOptions: []
      };
    }

    const addOnOptions = Array.isArray(offer.add_on_option_ids)
      ? add_on_options.filter(a => offer.add_on_option_ids.includes(a.id))
      : [];

    return {
      offer,
      addOnOptions
    };
  }

  calculateOfferEstimate(offerId, numAdultExams, numChildExams, framesLevel, selectedAddOnOptionIds) {
    const offers = this._getFromStorage('offers');
    const add_on_options = this._getFromStorage('add_on_options');
    const offer_estimates = this._getFromStorage('offer_estimates');

    const offer = offers.find(o => o.id === offerId) || null;
    if (!offer) {
      return { offerEstimate: null };
    }

    const selectedAddOns = Array.isArray(selectedAddOnOptionIds)
      ? add_on_options.filter(a => selectedAddOnOptionIds.includes(a.id))
      : [];

    const pricing = this._calculateOfferPricing(
      offer,
      numAdultExams,
      numChildExams,
      framesLevel,
      selectedAddOns
    );

    const estimate = {
      id: this._generateId('offerest'),
      offer_id: offer.id,
      num_adult_exams: numAdultExams,
      num_child_exams: numChildExams,
      frames_level: framesLevel,
      selected_add_on_option_ids: Array.isArray(selectedAddOnOptionIds) ? selectedAddOnOptionIds : [],
      subtotal: pricing.subtotal,
      discount_amount: pricing.discount_amount,
      total_price: pricing.total_price,
      created_at: this._nowIso()
    };

    offer_estimates.push(estimate);
    this._saveToStorage('offer_estimates', offer_estimates);

    return {
      offerEstimate: estimate
    };
  }

  getOfferEstimatePrintView(offerEstimateId) {
    const offer_estimates = this._getFromStorage('offer_estimates');
    const offers = this._getFromStorage('offers');
    const add_on_options = this._getFromStorage('add_on_options');

    const estimate = offer_estimates.find(e => e.id === offerEstimateId) || null;
    if (!estimate) {
      return {
        estimate: null,
        printableSummaryText: ''
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task6_printViewOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const offer = offers.find(o => o.id === estimate.offer_id) || null;
    const selectedAddOns = Array.isArray(estimate.selected_add_on_option_ids)
      ? add_on_options.filter(a => estimate.selected_add_on_option_ids.includes(a.id))
      : [];

    const addOnText = selectedAddOns.length
      ? 'Add-ons: ' + selectedAddOns.map(a => a.name + ' ($' + a.price.toFixed(2) + ')').join(', ')
      : 'Add-ons: None';

    const printableSummaryText = [
      'Offer: ' + (offer ? offer.name : 'Unknown Offer'),
      'Adult exams: ' + estimate.num_adult_exams,
      'Child exams: ' + estimate.num_child_exams,
      'Frames level: ' + estimate.frames_level,
      addOnText,
      'Subtotal: $' + (estimate.subtotal || 0).toFixed(2),
      'Discount: $' + (estimate.discount_amount || 0).toFixed(2),
      'Total price: $' + (estimate.total_price || 0).toFixed(2)
    ].join('\n');

    return {
      estimate,
      printableSummaryText
    };
  }

  // ---------- Eye Health Library ----------

  getEyeHealthLibraryFilterOptions() {
    const tags = this._getFromStorage('tags');

    const dateRangePresets = [
      { value: 'last_6_months', label: 'Last 6 months' },
      { value: 'last_1_year', label: 'Last 1 year' },
      { value: 'last_2_years', label: 'Last 2 years' },
      { value: 'all_time', label: 'All time' }
    ];

    const availableSortOptions = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' },
      { value: 'most_popular', label: 'Most popular' },
      { value: 'relevance', label: 'Most relevant' }
    ];

    return {
      tags,
      dateRangePresets,
      availableSortOptions
    };
  }

  searchArticles(
    query,
    dateRangePreset,
    tagIds,
    sortBy,
    page,
    pageSize
  ) {
    const articlesRaw = this._getFromStorage('articles');

    let articles = articlesRaw.filter(a => a.status === 'published');

    const q = (query || '').toLowerCase();
    if (q) {
      articles = articles.filter(a => {
        const text = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
        return text.includes(q);
      });
    }

    const preset = dateRangePreset || 'all_time';
    if (preset !== 'all_time') {
      const now = new Date();
      let fromDate = null;
      if (preset === 'last_6_months') {
        fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      } else if (preset === 'last_1_year') {
        fromDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      } else if (preset === 'last_2_years') {
        fromDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      }
      if (fromDate) {
        articles = articles.filter(a => new Date(a.published_at) >= fromDate);
      }
    }

    if (Array.isArray(tagIds) && tagIds.length > 0) {
      articles = articles.filter(a => {
        if (!Array.isArray(a.tag_ids)) return false;
        return a.tag_ids.some(id => tagIds.includes(id));
      });
    }

    const sortKey = sortBy || 'newest_first';

    articles.sort((a, b) => {
      if (sortKey === 'oldest_first') {
        return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
      }
      if (sortKey === 'most_popular') {
        const va = a.view_count || 0;
        const vb = b.view_count || 0;
        return vb - va;
      }
      if (sortKey === 'relevance') {
        const va = a.view_count || 0;
        const vb = b.view_count || 0;
        if (vb !== va) return vb - va;
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      }
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task8_articleSearch',
        JSON.stringify({
          query,
          dateRangePreset,
          tagIds,
          sortBy,
          resultArticleIds: articles.map(a => a.id)
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const totalCount = articles.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const paged = articles.slice(start, start + size).map(a => this._attachArticleRelations(a));

    return {
      articles: paged,
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  getArticleDetail(articleId) {
    const articlesRaw = this._getFromStorage('articles');

    const articleRaw = articlesRaw.find(a => a.id === articleId) || null;
    if (!articleRaw) {
      return {
        article: null,
        relatedArticles: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_openedArticleId', articleId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const article = this._attachArticleRelations(articleRaw);

    let related = articlesRaw.filter(a => a.id !== articleId && a.status === 'published');

    if (Array.isArray(article.tag_ids) && article.tag_ids.length > 0) {
      related = related.filter(a => {
        if (!Array.isArray(a.tag_ids)) return false;
        return a.tag_ids.some(id => article.tag_ids.includes(id));
      });
    }

    related = related
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, 3)
      .map(a => this._attachArticleRelations(a));

    return {
      article,
      relatedArticles: related
    };
  }

  // ---------- Newsletter ----------

  getNewsletterOptions() {
    const topics = this._getFromStorage('newsletter_topics').filter(t => t.is_active);
    const frequencyOptions = ['daily', 'weekly', 'monthly', 'quarterly'];
    const smsAvailable = true;

    return {
      topics,
      frequencyOptions,
      smsAvailable
    };
  }

  createNewsletterSubscription(
    subscriberName,
    email,
    topicIds,
    frequency,
    smsOptIn,
    mobilePhone
  ) {
    const allowedFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
    const freq = allowedFrequencies.includes(frequency) ? frequency : 'weekly';

    const newsletter_subscriptions = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('nlsub'),
      subscriber_name: subscriberName || '',
      email,
      topic_ids: Array.isArray(topicIds) ? topicIds : [],
      frequency: freq,
      sms_opt_in: !!smsOptIn,
      mobile_phone: smsOptIn ? (mobilePhone || '') : '',
      created_at: this._nowIso(),
      is_confirmed: false
    };

    newsletter_subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', newsletter_subscriptions);

    return {
      subscription,
      success: true,
      message: 'Subscription created.'
    };
  }

  // ---------- Accessibility ----------

  getAccessibilitySettings() {
    const settings = this._getCurrentAccessibilitySettings();
    return {
      settings
    };
  }

  updateAccessibilitySettings(textSizeScale, highContrastEnabled) {
    let settings = this._getCurrentAccessibilitySettings();

    settings = {
      ...settings,
      text_size_scale: textSizeScale,
      high_contrast_enabled: !!highContrastEnabled,
      updated_at: this._nowIso()
    };

    this._saveAccessibilitySettings(settings);

    return {
      settings,
      success: true
    };
  }

  // ---------- Contact form ----------

  getContactFormOptions() {
    const subjectOptions = [
      { value: 'general_question_services', label: 'General question about services' },
      { value: 'billing_and_insurance', label: 'Billing & insurance' },
      { value: 'feedback_website', label: 'Website feedback' },
      { value: 'appointment_request', label: 'Appointment request' },
      { value: 'medical_question', label: 'Medical question' },
      { value: 'other', label: 'Other' }
    ];

    const expectedResponseTimeText = 'We typically respond within 1–2 business days.';
    const urgentContactInstructions = 'If this is an eye emergency, please call your local clinic directly or dial emergency services. Do not use this form for urgent medical issues.';

    return {
      subjectOptions,
      expectedResponseTimeText,
      urgentContactInstructions
    };
  }

  submitContactMessage(subjectType, name, email, phone, message) {
    const allowed = [
      'general_question_services',
      'billing_and_insurance',
      'feedback_website',
      'appointment_request',
      'medical_question',
      'other'
    ];

    const subject = allowed.includes(subjectType) ? subjectType : 'other';

    const contact_messages = this._getFromStorage('contact_messages');

    const contactMessage = {
      id: this._generateId('contact'),
      subject_type: subject,
      name,
      email,
      phone: phone || '',
      message,
      status: 'new',
      created_at: this._nowIso()
    };

    contact_messages.push(contactMessage);
    this._saveToStorage('contact_messages', contact_messages);

    return {
      contactMessage,
      success: true,
      message: 'Message submitted.'
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