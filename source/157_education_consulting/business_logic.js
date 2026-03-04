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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const entityKeys = [
      'consultation_categories',
      'consultation_time_slots',
      'consultation_bookings',
      'programs',
      'program_package_options',
      'scholarships',
      'saved_scholarships',
      'study_plans',
      'study_plan_subjects',
      'study_plan_schedule_entries',
      'advisors',
      'advisor_consultation_requests',
      'events',
      'event_registrations',
      'service_options',
      'custom_bundles',
      'custom_bundle_items',
      'cart',
      'cart_items',
      'articles',
      'saved_articles',
      'contact_messages'
    ];

    for (let i = 0; i < entityKeys.length; i++) {
      const key = entityKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const t = Date.parse(value);
    if (isNaN(t)) return null;
    return new Date(t);
  }

  _toLabelCase(value) {
    if (!value || typeof value !== 'string') return '';
    const upperSpecial = {
      sat: 'SAT',
      act: 'ACT',
      psat: 'PSAT',
      ap: 'AP'
    };
    if (upperSpecial[value]) return upperSpecial[value];
    return value
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals() {
    const carts = this._getFromStorage('cart');
    const cart = carts[0] || null;
    const cartItems = this._getFromStorage('cart_items');

    if (!cart) {
      return { cart: null, totalItems: 0, subtotal: 0 };
    }

    const itemsForCart = cartItems.filter(item => item.cartId === cart.id);
    let totalItems = 0;
    let subtotal = 0;

    for (let i = 0; i < itemsForCart.length; i++) {
      const item = itemsForCart[i];
      const qty = typeof item.quantity === 'number' ? item.quantity : 0;
      const unit = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      item.totalPrice = qty * unit;
      totalItems += qty;
      subtotal += item.totalPrice;
    }

    cart.updatedAt = this._nowISO();

    // Save back updated cart and items
    const updatedCartItems = cartItems.map(item => {
      const found = itemsForCart.find(ci => ci.id === item.id);
      return found || item;
    });

    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', updatedCartItems);

    return { cart, totalItems, subtotal };
  }

  // -------------------- Other helpers --------------------

  _getSingleUserContext() {
    // Aggregated view of single-user state
    const favoriteScholarships = this.getFavoriteScholarships();
    const savedArticles = this.getSavedArticles();
    const studyPlans = this._getFromStorage('study_plans');
    const cartSummary = this.getCartSummary();
    return {
      favoriteScholarships,
      savedArticles,
      studyPlans,
      cartSummary
    };
  }

  _applyProgramFilters(programs, filters, sortBy) {
    // Generic helper mainly for test prep programs
    const f = filters || {};
    let results = programs.slice();

    if (f.examType) {
      results = results.filter(p => p.examType === f.examType);
    }

    if (f.subject) {
      results = results.filter(p => p.subject === f.subject);
    }

    if (f.format) {
      results = results.filter(p => p.format === f.format);
    }

    if (typeof f.minRating === 'number') {
      results = results.filter(p => typeof p.rating === 'number' && p.rating >= f.minRating);
    }

    if (typeof f.minPrice === 'number') {
      results = results.filter(p => typeof p.basePrice === 'number' && p.basePrice >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(p => typeof p.basePrice === 'number' && p.basePrice <= f.maxPrice);
    }

    if (typeof f.maxHourlyRate === 'number') {
      results = results.filter(p => typeof p.hourlyRate === 'number' && p.hourlyRate <= f.maxHourlyRate);
    }

    if (sortBy === 'price_asc') {
      results.sort((a, b) => {
        const pa = typeof a.basePrice === 'number' ? a.basePrice : Number.POSITIVE_INFINITY;
        const pb = typeof b.basePrice === 'number' ? b.basePrice : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sortBy === 'price_desc') {
      results.sort((a, b) => {
        const pa = typeof a.basePrice === 'number' ? a.basePrice : 0;
        const pb = typeof b.basePrice === 'number' ? b.basePrice : 0;
        return pb - pa;
      });
    } else if (sortBy === 'rating_desc') {
      results.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    }

    return results;
  }

  _enforceBundleBudget(totalPrice, maxTotalPrice) {
    if (typeof maxTotalPrice === 'number' && totalPrice > maxTotalPrice) {
      return {
        ok: false,
        message: 'Bundle total exceeds maximum allowed price.'
      };
    }
    return { ok: true, message: '' };
  }

  _matchesGradeLevel(programGradeLevels, filterGradeLevel) {
    if (!filterGradeLevel) return true;
    if (!Array.isArray(programGradeLevels) || programGradeLevels.length === 0) return false;

    // Direct match
    if (programGradeLevels.indexOf(filterGradeLevel) !== -1) return true;

    const hsGrades = ['9th_grade', '10th_grade', '11th_grade', '12th_grade'];

    const pgSet = new Set(programGradeLevels);

    // If program is for grades_9_12, match any specific high school grade
    if (pgSet.has('grades_9_12') && hsGrades.indexOf(filterGradeLevel) !== -1) {
      return true;
    }

    // If filter is grades_9_12, match if any of the program's grades are HS grades
    if (filterGradeLevel === 'grades_9_12') {
      for (let i = 0; i < hsGrades.length; i++) {
        if (pgSet.has(hsGrades[i])) return true;
      }
    }

    return false;
  }

  _getEffectiveHourlyRate(option) {
    if (typeof option.hourlyRate === 'number') return option.hourlyRate;
    if (typeof option.price === 'number' && typeof option.totalHours === 'number' && option.totalHours > 0) {
      return option.price / option.totalHours;
    }
    return null;
  }

  // Resolve foreign keys for a CartItem (used in getCartSummary and related returns)
  _resolveCartItemForeignKeys(item, cart, programPackageOptions, programs, customBundles, bundleItems, serviceOptions) {
    const resolved = Object.assign({}, item);

    if (cart && item.cartId === cart.id) {
      resolved.cart = cart;
    } else {
      resolved.cart = null;
    }

    if (resolved.itemType === 'program_package_option' && resolved.programPackageOptionId) {
      const opt = programPackageOptions.find(o => o.id === resolved.programPackageOptionId) || null;
      if (opt) {
        const optWithProgram = Object.assign({}, opt);
        if (opt.programId) {
          optWithProgram.program = programs.find(p => p.id === opt.programId) || null;
        } else {
          optWithProgram.program = null;
        }
        resolved.programPackageOption = optWithProgram;
      } else {
        resolved.programPackageOption = null;
      }
      resolved.customBundle = null;
    } else if (resolved.itemType === 'custom_bundle' && resolved.customBundleId) {
      const bundle = customBundles.find(b => b.id === resolved.customBundleId) || null;
      if (bundle) {
        const bundleCopy = Object.assign({}, bundle);
        const itemsForBundle = bundleItems.filter(bi => bi.customBundleId === bundle.id);
        bundleCopy.items = itemsForBundle.map(bi => {
          const biCopy = Object.assign({}, bi);
          biCopy.serviceOption = serviceOptions.find(s => s.id === bi.serviceOptionId) || null;
          return biCopy;
        });
        resolved.customBundle = bundleCopy;
      } else {
        resolved.customBundle = null;
      }
      resolved.programPackageOption = null;
    } else {
      resolved.programPackageOption = null;
      resolved.customBundle = null;
    }

    return resolved;
  }

  // -------------------- Interface implementations --------------------

  // getHomeOverview
  getHomeOverview() {
    const categories = this._getFromStorage('consultation_categories').filter(c => c.isActive);
    const programs = this._getFromStorage('programs').filter(p => p.isActive);
    const events = this._getFromStorage('events').filter(e => e.isActive);

    const now = new Date();

    const featuredConsultationCategories = categories.slice(0, 3).map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      description: c.description || ''
    }));

    const featuredPrograms = programs.slice(0, 5).map(p => ({
      programId: p.id,
      name: p.name,
      programType: p.programType,
      subject: p.subject || null,
      subSubject: p.subSubject || null,
      examType: p.examType || null,
      format: p.format || null,
      rating: typeof p.rating === 'number' ? p.rating : null,
      ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : 0,
      basePrice: typeof p.basePrice === 'number' ? p.basePrice : null,
      hourlyRate: typeof p.hourlyRate === 'number' ? p.hourlyRate : null,
      currency: p.currency || 'USD',
      numPracticeTests: typeof p.numPracticeTests === 'number' ? p.numPracticeTests : null
    }));

    const upcomingEvents = events
      .filter(e => {
        const d = this._parseDate(e.startDatetime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDatetime) || new Date(0);
        const db = this._parseDate(b.startDatetime) || new Date(0);
        return da - db;
      })
      .slice(0, 5)
      .map(e => ({
        eventId: e.id,
        title: e.title,
        topicCategory: e.topicCategory,
        startDatetime: e.startDatetime,
        endDatetime: e.endDatetime,
        dayOfWeek: e.dayOfWeek,
        price: e.price,
        isFree: e.isFree
      }));

    const quickStartShortcuts = [
      {
        code: 'book_consultation',
        label: 'Book a Consultation',
        description: 'Quickly schedule a one-on-one consultation.',
        primaryInterface: 'getConsultationCategories'
      },
      {
        code: 'find_scholarships',
        label: 'Find Scholarships',
        description: 'Search scholarships and save your favorites.',
        primaryInterface: 'getScholarshipFilterOptions'
      },
      {
        code: 'create_study_plan',
        label: 'Create Study Plan',
        description: 'Build a personalized study plan.',
        primaryInterface: 'getStudyPlanBuilderOptions'
      },
      {
        code: 'explore_test_prep',
        label: 'Explore Test Prep',
        description: 'Compare SAT and ACT prep options.',
        primaryInterface: 'getTestPrepFilterOptions'
      }
    ];

    return {
      featuredConsultationCategories,
      featuredPrograms,
      upcomingEvents,
      quickStartShortcuts
    };
  }

  // -------------------- Consultations --------------------

  getConsultationCategories() {
    const categories = this._getFromStorage('consultation_categories');
    return categories.filter(c => c.isActive);
  }

  getConsultationDurationOptions() {
    const slots = this._getFromStorage('consultation_time_slots');
    const durationsSet = new Set();
    for (let i = 0; i < slots.length; i++) {
      const d = slots[i].durationMinutes;
      if (typeof d === 'number' && d > 0) durationsSet.add(d);
    }
    const durations = Array.from(durationsSet).sort((a, b) => a - b);
    const result = durations.map((d, idx) => ({
      durationMinutes: d,
      label: d + ' minutes',
      isDefault: idx === 0
    }));
    return result;
  }

  searchConsultationTimeSlots(categoryId, minStartDatetime, maxStartDatetime, durationMinutes, isOnline, limit, sortOrder) {
    const slots = this._getFromStorage('consultation_time_slots');
    const categories = this._getFromStorage('consultation_categories');

    const minDate = this._parseDate(minStartDatetime);
    const maxDate = maxStartDatetime ? this._parseDate(maxStartDatetime) : null;

    let results = slots.filter(s => !s.isBooked);

    if (categoryId) {
      results = results.filter(s => s.categoryId === categoryId);
    }

    if (minDate) {
      results = results.filter(s => {
        const d = this._parseDate(s.startDatetime);
        return d && d >= minDate;
      });
    }

    if (maxDate) {
      results = results.filter(s => {
        const d = this._parseDate(s.startDatetime);
        return d && d <= maxDate;
      });
    }

    if (typeof durationMinutes === 'number') {
      results = results.filter(s => s.durationMinutes === durationMinutes);
    }

    if (typeof isOnline === 'boolean') {
      results = results.filter(s => s.isOnline === isOnline);
    }

    if (sortOrder === 'start_desc') {
      results.sort((a, b) => {
        const da = this._parseDate(a.startDatetime) || new Date(0);
        const db = this._parseDate(b.startDatetime) || new Date(0);
        return db - da;
      });
    } else {
      // default start_asc
      results.sort((a, b) => {
        const da = this._parseDate(a.startDatetime) || new Date(0);
        const db = this._parseDate(b.startDatetime) || new Date(0);
        return da - db;
      });
    }

    const lim = typeof limit === 'number' && limit > 0 ? limit : 50;
    results = results.slice(0, lim);

    return results.map(s => {
      const category = categories.find(c => c.id === s.categoryId) || null;
      return {
        id: s.id,
        categoryId: s.categoryId,
        categoryName: category ? category.name : null,
        startDatetime: s.startDatetime,
        endDatetime: s.endDatetime,
        durationMinutes: s.durationMinutes,
        timezone: s.timezone,
        isOnline: s.isOnline,
        isBooked: s.isBooked,
        notes: s.notes || null,
        category: category
      };
    });
  }

  createConsultationBooking(categoryId, timeSlotId, studentName, studentEmail, studentPhone, studentGradeLevel, notes) {
    const slots = this._getFromStorage('consultation_time_slots');
    const categories = this._getFromStorage('consultation_categories');
    const bookings = this._getFromStorage('consultation_bookings');

    const slot = slots.find(s => s.id === timeSlotId) || null;
    if (!slot) {
      return { success: false, message: 'Selected time slot not found.', booking: null };
    }

    if (slot.isBooked) {
      return { success: false, message: 'Selected time slot is already booked.', booking: null };
    }

    const category = categories.find(c => c.id === (categoryId || slot.categoryId)) || null;

    const booking = {
      id: this._generateId('consultation_booking'),
      categoryId: category ? category.id : slot.categoryId,
      timeSlotId: slot.id,
      scheduledStart: slot.startDatetime,
      scheduledEnd: slot.endDatetime,
      durationMinutes: slot.durationMinutes,
      studentName: studentName,
      studentEmail: studentEmail,
      studentPhone: studentPhone || null,
      studentGradeLevel: studentGradeLevel || null,
      notes: notes || null,
      status: 'pending',
      createdAt: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    // Mark slot as booked
    const updatedSlots = slots.map(s => {
      if (s.id === slot.id) {
        const copy = Object.assign({}, s);
        copy.isBooked = true;
        return copy;
      }
      return s;
    });
    this._saveToStorage('consultation_time_slots', updatedSlots);

    const bookingResponse = Object.assign({}, booking, {
      categoryName: category ? category.name : null,
      category: category,
      timeSlot: slot
    });

    return {
      success: true,
      message: 'Consultation booking created.',
      booking: bookingResponse
    };
  }

  // -------------------- Tutoring --------------------

  getTutoringFilterOptions() {
    const programs = this._getFromStorage('programs').filter(p => p.isActive && p.programType === 'tutoring');
    const packageOptions = this._getFromStorage('program_package_options').filter(o => o.isActive);

    const subjectsSet = new Set();
    const subSubjectsSet = new Set();
    const gradeSet = new Set();
    const formatSet = new Set();

    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      if (p.subject) subjectsSet.add(p.subject);
      if (p.subSubject) subSubjectsSet.add(p.subSubject + '::' + (p.subject || ''));
      if (Array.isArray(p.targetGradeLevels)) {
        for (let j = 0; j < p.targetGradeLevels.length; j++) {
          gradeSet.add(p.targetGradeLevels[j]);
        }
      }
      if (p.format) formatSet.add(p.format);
    }

    const subjects = Array.from(subjectsSet).map(v => ({ value: v, label: this._toLabelCase(v) }));
    const subSubjects = Array.from(subSubjectsSet).map(v => {
      const parts = v.split('::');
      const sub = parts[0];
      const parent = parts[1] || '';
      return {
        value: sub,
        label: this._toLabelCase(sub),
        parentSubject: parent || null
      };
    });
    const gradeLevels = Array.from(gradeSet).map(v => ({ value: v, label: this._toLabelCase(v) }));
    const formats = Array.from(formatSet).map(v => ({ value: v, label: this._toLabelCase(v) }));

    const ratingThresholds = [
      { value: 4.0, label: '4.0+' },
      { value: 4.5, label: '4.5+' },
      { value: 4.8, label: '4.8+' },
      { value: 5.0, label: '5.0' }
    ];

    const packageDurationRanges = [
      { minHours: 1, maxHours: 4, label: '1-4 hours' },
      { minHours: 5, maxHours: 10, label: '5-10 hours' },
      { minHours: 11, maxHours: 20, label: '11-20 hours' }
    ];

    const hourlyRateRanges = [
      { maxHourlyRate: 40, label: 'Up to $40/hour' },
      { maxHourlyRate: 60, label: 'Up to $60/hour' },
      { maxHourlyRate: 100, label: 'Up to $100/hour' }
    ];

    return {
      subjects,
      subSubjects,
      gradeLevels,
      formats,
      ratingThresholds,
      packageDurationRanges,
      hourlyRateRanges
    };
  }

  searchTutoringPrograms(filters, sortBy, limit) {
    const f = filters || {};
    const programs = this._getFromStorage('programs').filter(p => p.isActive && p.programType === 'tutoring');
    const packageOptions = this._getFromStorage('program_package_options').filter(o => o.isActive);

    let results = [];

    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];

      if (f.subject && p.subject !== f.subject) continue;
      if (f.subSubject && p.subSubject !== f.subSubject) continue;
      if (f.format && p.format !== f.format) continue;
      if (typeof f.minRating === 'number') {
        if (typeof p.rating !== 'number' || p.rating < f.minRating) continue;
      }
      if (f.gradeLevel && !this._matchesGradeLevel(p.targetGradeLevels || [], f.gradeLevel)) {
        continue;
      }

      const optionsForProgram = packageOptions.filter(o => o.programId === p.id);
      let filteredOptions = optionsForProgram;

      if (typeof f.minTotalHours === 'number') {
        filteredOptions = filteredOptions.filter(o => typeof o.totalHours === 'number' && o.totalHours >= f.minTotalHours);
      }
      if (typeof f.maxTotalHours === 'number') {
        filteredOptions = filteredOptions.filter(o => typeof o.totalHours === 'number' && o.totalHours <= f.maxTotalHours);
      }
      if (typeof f.maxHourlyRate === 'number') {
        filteredOptions = filteredOptions.filter(o => {
          const rate = this._getEffectiveHourlyRate(o);
          return rate !== null && rate <= f.maxHourlyRate;
        });
      }

      if (filteredOptions.length === 0) {
        // No package option that fits filters; skip this program
        continue;
      }

      // Choose best package option (lowest effective hourly rate, then lowest price)
      filteredOptions.sort((a, b) => {
        const ra = this._getEffectiveHourlyRate(a);
        const rb = this._getEffectiveHourlyRate(b);
        if (ra !== null && rb !== null && ra !== rb) return ra - rb;
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return pa - pb;
      });

      const bestOption = filteredOptions[0];
      const bestRate = this._getEffectiveHourlyRate(bestOption);

      const resultItem = {
        programId: p.id,
        name: p.name,
        subject: p.subject || null,
        subSubject: p.subSubject || null,
        format: p.format || null,
        targetGradeLevels: Array.isArray(p.targetGradeLevels) ? p.targetGradeLevels.slice() : [],
        rating: typeof p.rating === 'number' ? p.rating : null,
        ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : 0,
        basePrice: typeof p.basePrice === 'number' ? p.basePrice : null,
        hourlyRate: typeof p.hourlyRate === 'number' ? p.hourlyRate : bestRate,
        currency: p.currency || 'USD',
        bestPackageOption: {
          packageOptionId: bestOption.id,
          name: bestOption.name,
          totalHours: typeof bestOption.totalHours === 'number' ? bestOption.totalHours : null,
          price: bestOption.price,
          hourlyRate: bestRate,
          isDefault: !!bestOption.isDefault,
          packageOption: Object.assign({}, bestOption)
        },
        program: Object.assign({}, p)
      };

      results.push(resultItem);
    }

    if (sortBy === 'rating_desc') {
      results.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    } else if (sortBy === 'price_asc') {
      results.sort((a, b) => {
        const ra = typeof a.bestPackageOption.hourlyRate === 'number' ? a.bestPackageOption.hourlyRate : Number.POSITIVE_INFINITY;
        const rb = typeof b.bestPackageOption.hourlyRate === 'number' ? b.bestPackageOption.hourlyRate : Number.POSITIVE_INFINITY;
        return ra - rb;
      });
    } else if (sortBy === 'price_desc') {
      results.sort((a, b) => {
        const ra = typeof a.bestPackageOption.hourlyRate === 'number' ? a.bestPackageOption.hourlyRate : 0;
        const rb = typeof b.bestPackageOption.hourlyRate === 'number' ? b.bestPackageOption.hourlyRate : 0;
        return rb - ra;
      });
    }

    const lim = typeof limit === 'number' && limit > 0 ? limit : 50;
    return results.slice(0, lim);
  }

  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs');
    const packageOptionsAll = this._getFromStorage('program_package_options');

    const program = programs.find(p => p.id === programId) || null;
    if (!program) {
      return {
        program: null,
        packageOptions: [],
        features: []
      };
    }

    const packageOptions = packageOptionsAll
      .filter(o => o.programId === program.id && o.isActive)
      .map(o => {
        const optCopy = Object.assign({}, o);
        optCopy.program = Object.assign({}, program);
        return optCopy;
      });

    const features = [];
    if (program.description) {
      features.push(program.description);
    }

    // Instrumentation for task completion tracking
    try {
      if (
        program &&
        program.programType === 'test_prep' &&
        (program.examType === 'sat' || program.examType === 'act') &&
        typeof program.basePrice === 'number' &&
        program.basePrice <= 500
      ) {
        let existingRaw = localStorage.getItem('task3_comparedPrograms');
        let existing;
        try {
          existing = existingRaw ? JSON.parse(existingRaw) : [];
        } catch (e) {
          existing = [];
        }
        if (!Array.isArray(existing)) {
          existing = [];
        }

        const entry = {
          programId: program.id,
          examType: program.examType,
          basePrice: program.basePrice,
          numPracticeTests: typeof program.numPracticeTests === 'number' ? program.numPracticeTests : null
        };

        const idx = existing.findIndex(p => p && p.programId === program.id);
        if (idx === -1) {
          existing.push(entry);
        } else {
          existing[idx] = entry;
        }

        localStorage.setItem('task3_comparedPrograms', JSON.stringify(existing));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      program: program,
      packageOptions: packageOptions,
      features: features
    };
  }

  addProgramPackageToCart(programPackageOptionId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const packageOptions = this._getFromStorage('program_package_options');
    const programs = this._getFromStorage('programs');
    const programOption = packageOptions.find(o => o.id === programPackageOptionId) || null;

    if (!programOption) {
      return { success: false, cartId: null, message: 'Program package option not found.', cartItem: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const unitPrice = typeof programOption.price === 'number' ? programOption.price : 0;
    const existing = cartItems.find(
      ci => ci.cartId === cart.id && ci.itemType === 'program_package_option' && ci.programPackageOptionId === programPackageOptionId
    );

    let cartItem;

    if (existing) {
      existing.quantity += qty;
      existing.totalPrice = existing.quantity * existing.unitPrice;
      cartItem = existing;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'program_package_option',
        programPackageOptionId: programPackageOptionId,
        customBundleId: null,
        displayName: programOption.name,
        quantity: qty,
        unitPrice: unitPrice,
        totalPrice: unitPrice * qty,
        addedAt: this._nowISO()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    const resolvedCartItem = this._resolveCartItemForeignKeys(
      cartItem,
      totals.cart,
      packageOptions,
      programs,
      this._getFromStorage('custom_bundles'),
      this._getFromStorage('custom_bundle_items'),
      this._getFromStorage('service_options')
    );

    // Instrumentation for task completion tracking
    try {
      const program = programs.find(p => p.id === programOption.programId) || null;
      if (
        program &&
        program.programType === 'test_prep' &&
        (program.examType === 'sat' || program.examType === 'act') &&
        typeof program.basePrice === 'number' &&
        program.basePrice <= 500
      ) {
        const instrumentationValue = {
          programPackageOptionId: programOption.id,
          programId: program.id,
          examType: program.examType,
          basePrice: program.basePrice,
          numPracticeTests: typeof program.numPracticeTests === 'number' ? program.numPracticeTests : null,
          addedAt: this._nowISO()
        };
        localStorage.setItem('task3_selectedProgramPackage', JSON.stringify(instrumentationValue));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      cartId: cart.id,
      message: 'Program package added to cart.',
      cartItem: resolvedCartItem
    };
  }

  // -------------------- Test Prep --------------------

  getTestPrepFilterOptions() {
    const programs = this._getFromStorage('programs').filter(p => p.isActive && p.programType === 'test_prep');

    const examTypeSet = new Set();
    const formatSet = new Set();

    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      if (p.examType) examTypeSet.add(p.examType);
      if (p.format) formatSet.add(p.format);
    }

    const examTypes = Array.from(examTypeSet).map(v => ({ value: v, label: this._toLabelCase(v) }));
    const formats = Array.from(formatSet).map(v => ({ value: v, label: this._toLabelCase(v) }));

    const priceRanges = [
      { minPrice: 0, maxPrice: 500, label: 'Under $500' },
      { minPrice: 0, maxPrice: 1000, label: 'Under $1,000' },
      { minPrice: 500, maxPrice: 1500, label: '$500 - $1,500' }
    ];

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return {
      examTypes,
      priceRanges,
      formats,
      sortOptions
    };
  }

  searchTestPrepPrograms(filters, sortBy, limit) {
    const f = filters || {};
    let programs = this._getFromStorage('programs').filter(p => p.isActive && p.programType === 'test_prep');

    programs = this._applyProgramFilters(programs, {
      examType: f.examType,
      format: f.format,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice
    }, sortBy);

    if (sortBy === 'price_asc') {
      programs.sort((a, b) => {
        const pa = typeof a.basePrice === 'number' ? a.basePrice : Number.POSITIVE_INFINITY;
        const pb = typeof b.basePrice === 'number' ? b.basePrice : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sortBy === 'price_desc') {
      programs.sort((a, b) => {
        const pa = typeof a.basePrice === 'number' ? a.basePrice : 0;
        const pb = typeof b.basePrice === 'number' ? b.basePrice : 0;
        return pb - pa;
      });
    } else if (sortBy === 'rating_desc') {
      programs.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    }

    const lim = typeof limit === 'number' && limit > 0 ? limit : 50;

    return programs.slice(0, lim).map(p => ({
      programId: p.id,
      name: p.name,
      examType: p.examType || null,
      subject: p.subject || null,
      format: p.format || null,
      basePrice: typeof p.basePrice === 'number' ? p.basePrice : null,
      currency: p.currency || 'USD',
      numPracticeTests: typeof p.numPracticeTests === 'number' ? p.numPracticeTests : null,
      rating: typeof p.rating === 'number' ? p.rating : null,
      ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : 0,
      program: Object.assign({}, p)
    }));
  }

  // -------------------- Scholarships --------------------

  getScholarshipFilterOptions() {
    const scholarships = this._getFromStorage('scholarships');

    const eduSet = new Set();
    const countrySet = new Set();

    for (let i = 0; i < scholarships.length; i++) {
      const s = scholarships[i];
      if (s.educationLevel) eduSet.add(s.educationLevel);
      if (s.country) countrySet.add(s.country);
    }

    const educationLevels = Array.from(eduSet).map(v => ({ value: v, label: this._toLabelCase(v) }));
    const countries = Array.from(countrySet).map(v => ({ value: v, label: this._toLabelCase(v) }));

    const minAwardPresets = [
      { amount: 500, label: '$500+' },
      { amount: 1000, label: '$1,000+' },
      { amount: 5000, label: '$5,000+' }
    ];

    const year = new Date().getFullYear();
    const deadlinePresets = [
      {
        code: 'after_june_1',
        label: 'Deadlines after June 1',
        deadlineAfter: year + '-06-01',
        deadlineBefore: null
      },
      {
        code: 'this_month',
        label: 'Deadlines this month',
        deadlineAfter: null,
        deadlineBefore: null
      }
    ];

    return {
      educationLevels,
      countries,
      minAwardPresets,
      deadlinePresets
    };
  }

  searchScholarships(filters, sortBy, limit) {
    const f = filters || {};
    const scholarships = this._getFromStorage('scholarships').filter(s => s.isActive);
    const saved = this._getFromStorage('saved_scholarships');

    let results = scholarships;

    if (f.educationLevel) {
      results = results.filter(s => s.educationLevel === f.educationLevel);
    }

    if (f.country) {
      results = results.filter(s => s.country === f.country);
    }

    if (typeof f.minAwardAmount === 'number') {
      results = results.filter(s => {
        const min = typeof s.minimumAwardAmount === 'number' ? s.minimumAwardAmount : 0;
        const max = typeof s.maximumAwardAmount === 'number' ? s.maximumAwardAmount : min;
        return max >= f.minAwardAmount;
      });
    }

    if (typeof f.maxAwardAmount === 'number') {
      results = results.filter(s => {
        const min = typeof s.minimumAwardAmount === 'number' ? s.minimumAwardAmount : 0;
        return min <= f.maxAwardAmount;
      });
    }

    if (f.deadlineAfter) {
      const dAfter = this._parseDate(f.deadlineAfter);
      if (dAfter) {
        results = results.filter(s => {
          const d = this._parseDate(s.applicationDeadline);
          return d && d >= dAfter;
        });
      }
    }

    if (f.deadlineBefore) {
      const dBefore = this._parseDate(f.deadlineBefore);
      if (dBefore) {
        results = results.filter(s => {
          const d = this._parseDate(s.applicationDeadline);
          return d && d <= dBefore;
        });
      }
    }

    if (sortBy === 'deadline_asc') {
      results.sort((a, b) => {
        const da = this._parseDate(a.applicationDeadline) || new Date(8640000000000000);
        const db = this._parseDate(b.applicationDeadline) || new Date(8640000000000000);
        return da - db;
      });
    } else if (sortBy === 'award_desc') {
      results.sort((a, b) => {
        const ma = typeof a.maximumAwardAmount === 'number' ? a.maximumAwardAmount : 0;
        const mb = typeof b.maximumAwardAmount === 'number' ? b.maximumAwardAmount : 0;
        return mb - ma;
      });
    }

    const lim = typeof limit === 'number' && limit > 0 ? limit : 50;

    return results.slice(0, lim).map(s => {
      const isSaved = !!saved.find(x => x.scholarshipId === s.id);
      return {
        scholarshipId: s.id,
        title: s.title,
        providerName: s.providerName || null,
        educationLevel: s.educationLevel,
        country: s.country,
        minimumAwardAmount: typeof s.minimumAwardAmount === 'number' ? s.minimumAwardAmount : null,
        maximumAwardAmount: typeof s.maximumAwardAmount === 'number' ? s.maximumAwardAmount : null,
        awardAmountDisplay: s.awardAmountDisplay || null,
        applicationDeadline: s.applicationDeadline,
        isRenewable: !!s.isRenewable,
        isSaved: isSaved,
        scholarship: Object.assign({}, s)
      };
    });
  }

  saveScholarshipToFavorites(scholarshipId) {
    const scholarships = this._getFromStorage('scholarships');
    const scholarship = scholarships.find(s => s.id === scholarshipId) || null;
    if (!scholarship) {
      return { success: false, savedScholarshipId: null, savedAt: null };
    }

    const saved = this._getFromStorage('saved_scholarships');
    const existing = saved.find(s => s.scholarshipId === scholarshipId);
    if (existing) {
      return { success: true, savedScholarshipId: existing.id, savedAt: existing.savedAt };
    }

    const record = {
      id: this._generateId('saved_scholarship'),
      scholarshipId: scholarshipId,
      savedAt: this._nowISO()
    };

    saved.push(record);
    this._saveToStorage('saved_scholarships', saved);

    return {
      success: true,
      savedScholarshipId: record.id,
      savedAt: record.savedAt
    };
  }

  getFavoriteScholarships() {
    const saved = this._getFromStorage('saved_scholarships');
    const scholarships = this._getFromStorage('scholarships');

    return saved.map(s => ({
      savedScholarshipId: s.id,
      savedAt: s.savedAt,
      scholarship: scholarships.find(sc => sc.id === s.scholarshipId) || null
    }));
  }

  removeScholarshipFromFavorites(savedScholarshipId) {
    const saved = this._getFromStorage('saved_scholarships');
    const beforeLen = saved.length;
    const updated = saved.filter(s => s.id !== savedScholarshipId);
    this._saveToStorage('saved_scholarships', updated);
    return { success: updated.length !== beforeLen };
  }

  // -------------------- Study Plans --------------------

  getStudyPlansList() {
    const plans = this._getFromStorage('study_plans');
    // Could sort by createdAt desc
    plans.sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date(0);
      const db = this._parseDate(b.createdAt) || new Date(0);
      return db - da;
    });
    return plans;
  }

  getStudyPlanBuilderOptions() {
    const examTypes = [
      { value: 'sat', label: 'SAT' },
      { value: 'act', label: 'ACT' },
      { value: 'psat', label: 'PSAT' },
      { value: 'ap', label: 'AP' },
      { value: 'other', label: 'Other' }
    ];

    const subjects = [
      { value: 'math', label: 'Math' },
      { value: 'reading', label: 'Reading' },
      { value: 'writing', label: 'Writing' },
      { value: 'science', label: 'Science' },
      { value: 'english', label: 'English' },
      { value: 'essay', label: 'Essay' },
      { value: 'other', label: 'Other' }
    ];

    const weekdays = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const suggestedDurationsWeeks = [4, 6, 8, 12];

    return {
      examTypes,
      subjects,
      weekdays,
      suggestedDurationsWeeks
    };
  }

  createStudyPlanWithSchedule(name, examType, durationWeeks, startDate, endDate, dailyTimeMinHours, dailyTimeMaxHours, prioritizedSubjects, scheduleEntries, notes) {
    const plans = this._getFromStorage('study_plans');
    const subjectsTable = this._getFromStorage('study_plan_subjects');
    const scheduleTable = this._getFromStorage('study_plan_schedule_entries');

    let start = startDate || null;
    let end = endDate || null;

    if (durationWeeks && start && !end) {
      const d = this._parseDate(start);
      if (d) {
        const ms = d.getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000;
        end = new Date(ms).toISOString();
      }
    }

    const plan = {
      id: this._generateId('study_plan'),
      name: name,
      examType: examType,
      durationWeeks: durationWeeks,
      startDate: start,
      endDate: end,
      dailyTimeMinHours: dailyTimeMinHours,
      dailyTimeMaxHours: dailyTimeMaxHours,
      notes: notes || null,
      createdAt: this._nowISO(),
      updatedAt: null
    };

    plans.push(plan);
    this._saveToStorage('study_plans', plans);

    const createdSubjects = [];
    if (Array.isArray(prioritizedSubjects)) {
      for (let i = 0; i < prioritizedSubjects.length; i++) {
        const s = prioritizedSubjects[i];
        const subj = {
          id: this._generateId('study_plan_subject'),
          studyPlanId: plan.id,
          subject: s.subject,
          priority: s.priority,
          targetHoursPerWeek: typeof s.targetHoursPerWeek === 'number' ? s.targetHoursPerWeek : null
        };
        subjectsTable.push(subj);
        createdSubjects.push(subj);
      }
    }

    const createdScheduleEntries = [];
    if (Array.isArray(scheduleEntries)) {
      for (let i = 0; i < scheduleEntries.length; i++) {
        const se = scheduleEntries[i];
        const entry = {
          id: this._generateId('study_plan_schedule_entry'),
          studyPlanId: plan.id,
          dayOfWeek: se.dayOfWeek,
          focus: se.focus,
          durationHours: typeof se.durationHours === 'number' ? se.durationHours : null,
          notes: se.notes || null
        };
        scheduleTable.push(entry);
        createdScheduleEntries.push(entry);
      }
    }

    this._saveToStorage('study_plan_subjects', subjectsTable);
    this._saveToStorage('study_plan_schedule_entries', scheduleTable);

    return {
      success: true,
      studyPlan: plan,
      subjects: createdSubjects,
      scheduleEntries: createdScheduleEntries
    };
  }

  // -------------------- Advisors --------------------

  getAdvisorFilterOptions() {
    const advisors = this._getFromStorage('advisors').filter(a => a.isActive);

    const specializationSet = new Set();
    for (let i = 0; i < advisors.length; i++) {
      const a = advisors[i];
      if (Array.isArray(a.specializationAreas)) {
        for (let j = 0; j < a.specializationAreas.length; j++) {
          specializationSet.add(a.specializationAreas[j]);
        }
      }
    }

    const specializationAreas = Array.from(specializationSet).map(v => ({ value: v, label: this._toLabelCase(v) }));

    const experienceRanges = [
      { minYears: 0, label: 'All experience levels' },
      { minYears: 3, label: '3+ years' },
      { minYears: 5, label: '5+ years' },
      { minYears: 10, label: '10+ years' }
    ];

    const ratingThresholds = [
      { value: 4.0, label: '4.0+' },
      { value: 4.5, label: '4.5+' },
      { value: 4.8, label: '4.8+' },
      { value: 5.0, label: '5.0' }
    ];

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'experience_desc', label: 'Experience: High to Low' }
    ];

    return {
      specializationAreas,
      experienceRanges,
      ratingThresholds,
      sortOptions
    };
  }

  searchAdvisors(filters, sortBy, limit) {
    const f = filters || {};
    let advisors = this._getFromStorage('advisors').filter(a => a.isActive);

    if (f.specializationArea) {
      advisors = advisors.filter(a => Array.isArray(a.specializationAreas) && a.specializationAreas.indexOf(f.specializationArea) !== -1);
    }

    if (typeof f.minYearsExperience === 'number') {
      advisors = advisors.filter(a => typeof a.yearsExperience === 'number' && a.yearsExperience >= f.minYearsExperience);
    }

    if (typeof f.minRating === 'number') {
      advisors = advisors.filter(a => typeof a.rating === 'number' && a.rating >= f.minRating);
    }

    if (sortBy === 'rating_desc') {
      advisors.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    } else if (sortBy === 'experience_desc') {
      advisors.sort((a, b) => {
        const ea = typeof a.yearsExperience === 'number' ? a.yearsExperience : 0;
        const eb = typeof b.yearsExperience === 'number' ? b.yearsExperience : 0;
        return eb - ea;
      });
    } else if (sortBy === 'price_asc') {
      advisors.sort((a, b) => {
        const pa = typeof a.hourlyRate === 'number' ? a.hourlyRate : Number.POSITIVE_INFINITY;
        const pb = typeof b.hourlyRate === 'number' ? b.hourlyRate : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    }

    const lim = typeof limit === 'number' && limit > 0 ? limit : 50;

    return advisors.slice(0, lim).map(a => ({
      advisorId: a.id,
      name: a.name,
      specializationAreas: Array.isArray(a.specializationAreas) ? a.specializationAreas.slice() : [],
      yearsExperience: a.yearsExperience,
      rating: a.rating,
      ratingCount: typeof a.ratingCount === 'number' ? a.ratingCount : 0,
      hourlyRate: a.hourlyRate,
      shortBio: a.bio || '',
      profileImage: a.profileImage || null,
      advisor: Object.assign({}, a)
    }));
  }

  getAdvisorProfile(advisorId) {
    const advisors = this._getFromStorage('advisors');
    return advisors.find(a => a.id === advisorId) || null;
  }

  submitAdvisorConsultationRequest(advisorId, requesterName, requesterEmail, message, preferredTimeWindow) {
    const advisors = this._getFromStorage('advisors');
    const advisor = advisors.find(a => a.id === advisorId) || null;
    if (!advisor) {
      return { success: false, request: null };
    }

    const requests = this._getFromStorage('advisor_consultation_requests');

    const req = {
      id: this._generateId('advisor_consultation_request'),
      advisorId: advisorId,
      requesterName: requesterName,
      requesterEmail: requesterEmail,
      message: message,
      preferredTimeWindow: preferredTimeWindow || null,
      createdAt: this._nowISO(),
      status: 'submitted'
    };

    requests.push(req);
    this._saveToStorage('advisor_consultation_requests', requests);

    const reqWithAdvisor = Object.assign({}, req, { advisor: advisor });

    return {
      success: true,
      request: reqWithAdvisor
    };
  }

  // -------------------- Events & Webinars --------------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events').filter(e => e.isActive);

    const topicSet = new Set();
    const monthSet = new Set();

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.topicCategory) topicSet.add(e.topicCategory);
      const d = this._parseDate(e.startDatetime);
      if (d) {
        const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        monthSet.add(ym);
      }
    }

    const topicCategories = Array.from(topicSet).map(v => ({ value: v, label: this._toLabelCase(v) }));

    const monthSelectors = Array.from(monthSet).sort().map(ym => {
      const parts = ym.split('-');
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const label = (monthNames[monthIdx] || ym) + ' ' + year;
      return {
        yearMonth: ym,
        label: label
      };
    });

    const priceFilters = [
      { code: 'free_only', label: 'Free only' },
      { code: 'all_prices', label: 'All prices' }
    ];

    return {
      topicCategories,
      monthSelectors,
      priceFilters
    };
  }

  searchEvents(filters, limit) {
    const f = filters || {};
    let events = this._getFromStorage('events').filter(e => e.isActive);

    if (f.topicCategory) {
      events = events.filter(e => e.topicCategory === f.topicCategory);
    }

    if (f.yearMonth) {
      events = events.filter(e => {
        const d = this._parseDate(e.startDatetime);
        if (!d) return false;
        const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        return ym === f.yearMonth;
      });
    }

    if (typeof f.isFreeOnly === 'boolean' && f.isFreeOnly) {
      events = events.filter(e => e.isFree || e.price === 0);
    }

    if (f.dayOfWeek) {
      events = events.filter(e => e.dayOfWeek === f.dayOfWeek);
    }

    if (f.startTimeAfter) {
      const minMinutes = this._parseTimeToMinutes(f.startTimeAfter);
      if (minMinutes !== null) {
        events = events.filter(e => {
          const d = this._parseDate(e.startDatetime);
          if (!d) return false;
          const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
          return minutes >= minMinutes;
        });
      }
    }

    if (f.minStartDate) {
      const dMin = this._parseDate(f.minStartDate);
      if (dMin) {
        events = events.filter(e => {
          const d = this._parseDate(e.startDatetime);
          return d && d >= dMin;
        });
      }
    }

    if (f.maxStartDate) {
      const dMax = this._parseDate(f.maxStartDate);
      if (dMax) {
        events = events.filter(e => {
          const d = this._parseDate(e.startDatetime);
          return d && d <= dMax;
        });
      }
    }

    events.sort((a, b) => {
      const da = this._parseDate(a.startDatetime) || new Date(0);
      const db = this._parseDate(b.startDatetime) || new Date(0);
      return da - db;
    });

    const lim = typeof limit === 'number' && limit > 0 ? limit : 50;
    return events.slice(0, lim);
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    return events.find(e => e.id === eventId) || null;
  }

  registerForEvent(eventId, attendeeName, attendeeEmail, attendeeRole) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { success: false, registration: null };
    }

    const registrations = this._getFromStorage('event_registrations');

    const reg = {
      id: this._generateId('event_registration'),
      eventId: eventId,
      attendeeName: attendeeName,
      attendeeEmail: attendeeEmail,
      attendeeRole: attendeeRole || null,
      registeredAt: this._nowISO(),
      status: 'registered'
    };

    registrations.push(reg);
    this._saveToStorage('event_registrations', registrations);

    const regWithEvent = Object.assign({}, reg, { event: event });

    return {
      success: true,
      registration: regWithEvent
    };
  }

  // -------------------- Custom Bundles & Cart --------------------

  getBundleBuilderOptions() {
    const serviceOptions = this._getFromStorage('service_options').filter(s => s.isActive);
    return { serviceOptions };
  }

  createCustomBundleAndAddToCart(name, items, maxTotalPrice) {
    const serviceOptions = this._getFromStorage('service_options').filter(s => s.isActive);
    const bundles = this._getFromStorage('custom_bundles');
    const bundleItemsTable = this._getFromStorage('custom_bundle_items');

    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, message: 'No items provided for bundle.', customBundle: null, cartItem: null };
    }

    let totalPrice = 0;
    const validItems = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 0;
      if (!it.serviceOptionId || qty <= 0) continue;
      const opt = serviceOptions.find(s => s.id === it.serviceOptionId);
      if (!opt) continue;
      const lineTotal = qty * opt.price;
      totalPrice += lineTotal;
      validItems.push({ serviceOption: opt, quantity: qty, lineTotal: lineTotal });
    }

    if (validItems.length === 0) {
      return { success: false, message: 'No valid service options provided.', customBundle: null, cartItem: null };
    }

    const budgetCheck = this._enforceBundleBudget(totalPrice, maxTotalPrice);
    if (!budgetCheck.ok) {
      return { success: false, message: budgetCheck.message, customBundle: null, cartItem: null };
    }

    const bundle = {
      id: this._generateId('custom_bundle'),
      name: name,
      totalPrice: totalPrice,
      notes: null,
      createdAt: this._nowISO()
    };

    bundles.push(bundle);
    this._saveToStorage('custom_bundles', bundles);

    for (let i = 0; i < validItems.length; i++) {
      const vi = validItems[i];
      const bundleItem = {
        id: this._generateId('custom_bundle_item'),
        customBundleId: bundle.id,
        serviceOptionId: vi.serviceOption.id,
        quantity: vi.quantity,
        price: vi.serviceOption.price,
        lineTotal: vi.lineTotal
      };
      bundleItemsTable.push(bundleItem);
    }

    this._saveToStorage('custom_bundle_items', bundleItemsTable);

    // Add bundle to cart
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'custom_bundle',
      programPackageOptionId: null,
      customBundleId: bundle.id,
      displayName: name,
      quantity: 1,
      unitPrice: bundle.totalPrice,
      totalPrice: bundle.totalPrice,
      addedAt: this._nowISO()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    const resolvedCartItem = this._resolveCartItemForeignKeys(
      cartItem,
      totals.cart,
      this._getFromStorage('program_package_options'),
      this._getFromStorage('programs'),
      bundles,
      bundleItemsTable,
      serviceOptions
    );

    return {
      success: true,
      message: 'Custom bundle created and added to cart.',
      customBundle: bundle,
      cartItem: resolvedCartItem
    };
  }

  getCartSummary() {
    const carts = this._getFromStorage('cart');
    const cart = carts[0] || null;
    const cartItems = this._getFromStorage('cart_items');

    if (!cart) {
      return { cart: null, items: [], totalItems: 0, subtotal: 0 };
    }

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    const totals = this._recalculateCartTotals();

    const programPackageOptions = this._getFromStorage('program_package_options');
    const programs = this._getFromStorage('programs');
    const bundles = this._getFromStorage('custom_bundles');
    const bundleItems = this._getFromStorage('custom_bundle_items');
    const serviceOptions = this._getFromStorage('service_options');

    const resolvedItems = itemsForCart.map(ci =>
      this._resolveCartItemForeignKeys(ci, cart, programPackageOptions, programs, bundles, bundleItems, serviceOptions)
    );

    return {
      cart: cart,
      items: resolvedItems,
      totalItems: totals.totalItems,
      subtotal: totals.subtotal
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cartItem: null, cart: null, totalItems: 0, subtotal: 0 };
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx].quantity = quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    const updatedItem = cartItems.find(ci => ci.id === cartItemId) || null;

    const programPackageOptions = this._getFromStorage('program_package_options');
    const programs = this._getFromStorage('programs');
    const bundles = this._getFromStorage('custom_bundles');
    const bundleItems = this._getFromStorage('custom_bundle_items');
    const serviceOptions = this._getFromStorage('service_options');

    const resolvedItem = updatedItem
      ? this._resolveCartItemForeignKeys(
          updatedItem,
          totals.cart,
          programPackageOptions,
          programs,
          bundles,
          bundleItems,
          serviceOptions
        )
      : null;

    return {
      success: true,
      cartItem: resolvedItem,
      cart: totals.cart,
      totalItems: totals.totalItems,
      subtotal: totals.subtotal
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const filtered = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', filtered);
    const totals = this._recalculateCartTotals();
    return {
      success: cartItems.length !== filtered.length,
      cart: totals.cart,
      totalItems: totals.totalItems,
      subtotal: totals.subtotal
    };
  }

  // -------------------- Articles & Resources --------------------

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles').filter(a => a.isActive);

    const topicSet = new Set();
    const tagSet = new Set();

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.topic) topicSet.add(a.topic);
      if (Array.isArray(a.tags)) {
        for (let j = 0; j < a.tags.length; j++) {
          tagSet.add(a.tags[j]);
        }
      }
    }

    const topics = Array.from(topicSet).map(v => ({ value: v, label: this._toLabelCase(v) }));
    const tagSuggestions = Array.from(tagSet);

    return {
      topics,
      tagSuggestions
    };
  }

  searchArticles(query, topic, sortBy, limit) {
    const q = query ? String(query).toLowerCase() : '';
    const articles = this._getFromStorage('articles').filter(a => a.isActive);
    const saved = this._getFromStorage('saved_articles');

    let results = articles;

    if (topic) {
      results = results.filter(a => a.topic === topic);
    }

    if (q) {
      results = results.filter(a => {
        const title = (a.title || '').toLowerCase();
        const desc = (a.description || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return title.indexOf(q) !== -1 || desc.indexOf(q) !== -1 || content.indexOf(q) !== -1 || tags.indexOf(q) !== -1;
      });
    }

    if (sortBy === 'recent') {
      results.sort((a, b) => {
        const da = this._parseDate(a.publishedAt || a.updatedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt || b.updatedAt) || new Date(0);
        return db - da;
      });
    }

    const lim = typeof limit === 'number' && limit > 0 ? limit : 50;

    return results.slice(0, lim).map(a => ({
      articleId: a.id,
      title: a.title,
      description: a.description || '',
      topic: a.topic || null,
      publishedAt: a.publishedAt || null,
      isSaved: !!saved.find(s => s.articleId === a.id),
      article: Object.assign({}, a)
    }));
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    return articles.find(a => a.id === articleId) || null;
  }

  saveArticleToMyResources(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { success: false, savedArticleId: null, savedAt: null };
    }

    const saved = this._getFromStorage('saved_articles');
    const existing = saved.find(s => s.articleId === articleId);
    if (existing) {
      return { success: true, savedArticleId: existing.id, savedAt: existing.savedAt };
    }

    const rec = {
      id: this._generateId('saved_article'),
      articleId: articleId,
      savedAt: this._nowISO()
    };

    saved.push(rec);
    this._saveToStorage('saved_articles', saved);

    return {
      success: true,
      savedArticleId: rec.id,
      savedAt: rec.savedAt
    };
  }

  getSavedArticles() {
    const saved = this._getFromStorage('saved_articles');
    const articles = this._getFromStorage('articles');

    return saved.map(s => ({
      savedArticleId: s.id,
      savedAt: s.savedAt,
      article: articles.find(a => a.id === s.articleId) || null
    }));
  }

  // -------------------- Contact / Support --------------------

  getContactTopics() {
    return [
      {
        value: 'financial_aid',
        label: 'Financial Aid',
        description: 'Questions about FAFSA, loans, and grants.'
      },
      {
        value: 'scholarships_aid',
        label: 'Scholarships & Aid',
        description: 'Help finding and applying for scholarships.'
      },
      {
        value: 'consultations',
        label: 'Consultations',
        description: 'Scheduling or changing consultations.'
      },
      {
        value: 'tutoring',
        label: 'Tutoring & Academic Support',
        description: 'Questions about tutoring services.'
      },
      {
        value: 'test_prep',
        label: 'Test Prep',
        description: 'Questions about SAT/ACT and other exams.'
      },
      {
        value: 'technical_support',
        label: 'Technical Support',
        description: 'Issues with using the website.'
      },
      {
        value: 'general',
        label: 'General',
        description: 'Other questions or feedback.'
      }
    ];
  }

  submitContactMessage(topic, name, email, message) {
    const messages = this._getFromStorage('contact_messages');

    const rec = {
      id: this._generateId('contact_message'),
      topic: topic,
      name: name,
      email: email,
      message: message,
      createdAt: this._nowISO(),
      status: 'submitted'
    };

    messages.push(rec);
    this._saveToStorage('contact_messages', messages);

    return rec;
  }

  // -------------------- About Page --------------------

  getAboutPageContent() {
    const mission = 'To provide accessible, high-quality education consulting and support services that help students navigate admissions, testing, and financial aid with confidence.';

    const background = 'Our team of former admissions officers, educators, and advisors brings years of experience across college admissions, test preparation, and academic tutoring. We work with students and families to create personalized strategies that fit their goals, timelines, and budgets.';

    const expertiseAreas = [
      'College admissions strategy',
      'Standardized test preparation (SAT, ACT, and more)',
      'Academic tutoring across core subjects',
      'Scholarship and financial aid guidance',
      'Study skills and long-term planning'
    ];

    const serviceAreas = [
      {
        code: 'consultations',
        label: 'Consultations',
        description: 'One-on-one strategy sessions for admissions, majors, and academic planning.'
      },
      {
        code: 'tutoring',
        label: 'Tutoring & Academic Support',
        description: 'Targeted tutoring in math, reading, writing, science, and more.'
      },
      {
        code: 'test_prep',
        label: 'Test Prep',
        description: 'Structured SAT, ACT, and other exam prep programs with practice tests.'
      },
      {
        code: 'scholarships_support',
        label: 'Scholarships & Financial Aid',
        description: 'Resources and guidance to help families understand costs and funding options.'
      }
    ];

    const ctaSections = [
      {
        sectionCode: 'advisors_directory',
        label: 'Meet Our Advisors',
        description: 'Browse STEM, humanities, and specialized advisors to find a strong fit.'
      },
      {
        sectionCode: 'consultations_page',
        label: 'Schedule a Consultation',
        description: 'Book a time to discuss admissions, testing, or academic planning.'
      },
      {
        sectionCode: 'contact_page',
        label: 'Contact Us',
        description: 'Have a question about services or packages? Reach out to our team.'
      }
    ];

    return {
      mission,
      background,
      expertiseAreas,
      serviceAreas,
      ctaSections
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