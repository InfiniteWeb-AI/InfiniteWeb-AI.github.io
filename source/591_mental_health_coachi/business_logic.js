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
  }

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    const tableKeys = [
      'coaches',
      'coach_session_offerings',
      'coach_availability_slots',
      'session_bookings',
      'appointments',
      'workshops',
      'workshop_registrations',
      'coaching_plans',
      'plan_signups',
      'intake_forms',
      'articles',
      'reading_list_items',
      'exercises',
      'exercise_sessions',
      'favorite_exercises',
      'coach_contact_requests',
      'cart',
      'cart_items'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Clinic info is a single object, not an array
    if (!localStorage.getItem('clinic_info')) {
      const defaultClinicInfo = {
        mission: '',
        approach: '',
        focusAreas: [],
        staffSummary: '',
        contactInfo: {
          email: '',
          phone: '',
          address: ''
        },
        policySections: []
      };
      localStorage.setItem('clinic_info', JSON.stringify(defaultClinicInfo));
    }

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

  _getNow() {
    return new Date().toISOString();
  }

  _getCurrentMonthDateRange() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // last day of month
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
    return { startDate, endDate };
  }

  _getDayOfWeekString(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _getDayOfWeekShort(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }

  _formatTimeShort(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minStr = minutes < 10 ? '0' + minutes : '' + minutes;
    return `${hours}:${minStr} ${ampm}`;
  }

  _parseISO(dateTimeStr) {
    return new Date(dateTimeStr);
  }

  _getSoonestUpcomingAppointment() {
    const appointments = this._getFromStorage('appointments');
    const now = new Date();
    const upcoming = appointments.filter((a) => {
      if (a.status !== 'scheduled') return false;
      const start = this._parseISO(a.startDateTime);
      return start >= now;
    });
    upcoming.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
    return upcoming.length > 0 ? upcoming[0] : null;
  }

  // -------------------- Cart Helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart'); // single-user, at most one
    let cart;
    if (carts.length === 0) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._getNow(),
        updatedAt: this._getNow(),
        cartTotalPrice: 0,
        currency: 'usd'
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    } else {
      cart = carts[0];
    }
    return cart;
  }

  _getCurrentCart() {
    const carts = this._getFromStorage('cart');
    return carts.length > 0 ? carts[0] : null;
  }

  _calculateCartTotals(cartId) {
    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cartId);
    if (cartIndex === -1) return { cartTotalPrice: 0, currency: 'usd' };

    const cartItems = this._getFromStorage('cart_items');
    const items = cartItems.filter((i) => i.cartId === cartId);
    let total = 0;
    for (const item of items) {
      total += Number(item.totalPrice) || 0;
    }
    carts[cartIndex].cartTotalPrice = total;
    carts[cartIndex].updatedAt = this._getNow();
    const currency = carts[cartIndex].currency || 'usd';
    this._saveToStorage('cart', carts);
    return { cartTotalPrice: total, currency };
  }

  _addItemToCart(cartId, payload) {
    // payload: { itemType, coachSessionOfferingId?, workshopRegistrationId?, planSignupId?, name, quantity, unitPrice, currency }
    const cartItems = this._getFromStorage('cart_items');

    let existing = null;
    for (const item of cartItems) {
      if (
        item.cartId === cartId &&
        item.itemType === payload.itemType &&
        (payload.coachSessionOfferingId && item.coachSessionOfferingId === payload.coachSessionOfferingId ||
          payload.workshopRegistrationId && item.workshopRegistrationId === payload.workshopRegistrationId ||
          payload.planSignupId && item.planSignupId === payload.planSignupId)
      ) {
        existing = item;
        break;
      }
    }

    let cartItem;
    if (existing) {
      existing.quantity += payload.quantity;
      existing.unitPrice = payload.unitPrice;
      existing.totalPrice = existing.quantity * payload.unitPrice;
      cartItem = existing;
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cartId,
        itemType: payload.itemType,
        coachSessionOfferingId: payload.coachSessionOfferingId || null,
        workshopRegistrationId: payload.workshopRegistrationId || null,
        planSignupId: payload.planSignupId || null,
        name: payload.name,
        quantity: payload.quantity,
        unitPrice: payload.unitPrice,
        totalPrice: payload.quantity * payload.unitPrice,
        addedAt: this._getNow()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._calculateCartTotals(cartId);

    const allItemsForCart = cartItems.filter((i) => i.cartId === cartId);

    return {
      cartItem,
      totalItemsInCart: allItemsForCart.length,
      cartTotalPrice: totals.cartTotalPrice,
      currency: totals.currency
    };
  }

  // -------------------- Label Helpers --------------------

  _mapSpecialtyKeyToLabel(key) {
    const map = {
      anxiety: 'Anxiety',
      stress_burnout: 'Stress & Burnout',
      sleep_issues: 'Sleep issues',
      general_wellbeing: 'General wellbeing'
    };
    return map[key] || key;
  }

  _mapSessionFormatToLabel(key) {
    const map = {
      online_video: 'Online video',
      in_person: 'In person',
      phone_call: 'Phone call'
    };
    return map[key] || key;
  }

  _mapWorkshopCategoryToLabel(key) {
    const map = {
      stress_burnout: 'Stress & Burnout',
      stress_coping_skills: 'Stress & Coping Skills',
      anxiety_relief: 'Anxiety relief',
      sleep_skills: 'Sleep skills',
      mindfulness: 'Mindfulness',
      general_wellbeing: 'General wellbeing'
    };
    return map[key] || key;
  }

  _mapExerciseGoalToLabel(key) {
    const map = {
      manage_panic_anxiety: 'Manage panic & anxiety',
      reduce_general_stress: 'Reduce general stress',
      improve_sleep: 'Improve sleep',
      build_mindfulness: 'Build mindfulness',
      grounding: 'Grounding',
      emotional_regulation: 'Emotional regulation'
    };
    return map[key] || key;
  }

  _mapExerciseTypeToLabel(key) {
    const map = {
      breathing: 'Breathing',
      body_scan: 'Body scan',
      visualization: 'Visualization',
      journaling: 'Journaling',
      progressive_muscle_relaxation: 'Progressive muscle relaxation',
      audio_meditation: 'Audio meditation'
    };
    return map[key] || key;
  }

  // -------------------- Interfaces --------------------

  // 1. getHomepageHighlights
  getHomepageHighlights() {
    const workshops = this._getFromStorage('workshops');
    const articles = this._getFromStorage('articles');
    const exercises = this._getFromStorage('exercises');
    const now = new Date();

    const upcomingWorkshops = workshops
      .filter((w) => w.status === 'scheduled' && new Date(w.startDateTime) >= now)
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))
      .slice(0, 5)
      .map((w) => ({
        workshopId: w.id,
        title: w.title,
        categoryLabel: this._mapWorkshopCategoryToLabel(w.category),
        startDateTime: w.startDateTime,
        durationMinutes: w.durationMinutes,
        price: w.price,
        currency: w.currency,
        locationTypeLabel: this._mapSessionFormatToLabel(w.locationType)
      }));

    const publishedArticles = articles.filter((a) => a.status === 'published');
    publishedArticles.sort((a, b) => {
      const pa = (b.popularityScore || 0) - (a.popularityScore || 0);
      if (pa !== 0) return pa;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });
    const featuredArticles = publishedArticles.slice(0, 5).map((a) => ({
      articleId: a.id,
      title: a.title,
      summary: a.summary,
      readingTimeMinutes: a.readingTimeMinutes,
      publishedAt: a.publishedAt,
      tags: a.tags || []
    }));

    const activeExercises = exercises.filter((e) => e.status === 'active');
    activeExercises.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    const featuredExercises = activeExercises.slice(0, 5).map((e) => ({
      exerciseId: e.id,
      title: e.title,
      goalLabel: this._mapExerciseGoalToLabel(e.goal),
      typeLabel: this._mapExerciseTypeToLabel(e.type),
      durationMinutes: e.durationMinutes,
      popularityScore: e.popularityScore || 0
    }));

    return {
      quickCoachSearchDefaults: {
        popularSpecialties: [
          { key: 'anxiety', label: 'Anxiety' },
          { key: 'stress_burnout', label: 'Stress & Burnout' },
          { key: 'sleep_issues', label: 'Sleep issues' }
        ],
        sessionFormats: [
          { key: 'online_video', label: 'Online video' },
          { key: 'in_person', label: 'In person' }
        ]
      },
      upcomingWorkshops,
      featuredArticles,
      featuredExercises,
      promoteIntake: {
        headline: 'Not sure where to start?',
        description: 'Complete our gentle intake form to get matched with support for anxiety, stress, sleep, and more.'
      }
    };
  }

  // 2. getCoachSearchFilterOptions
  getCoachSearchFilterOptions() {
    return {
      specialties: [
        { key: 'anxiety', label: 'Anxiety' },
        { key: 'stress_burnout', label: 'Stress & Burnout' },
        { key: 'sleep_issues', label: 'Sleep issues' },
        { key: 'general_wellbeing', label: 'General wellbeing' }
      ],
      clientAgeGroups: [
        { key: 'teens_13_17', label: 'Teens (13–17)' },
        { key: 'adults_18_64', label: 'Adults (18–64)' },
        { key: 'seniors_65_plus', label: 'Seniors (65+)' }
      ],
      sessionModes: [
        { key: 'individual', label: 'Individual' },
        { key: 'teen_individual', label: 'Teen individual' },
        { key: 'couple', label: 'Couple' },
        { key: 'family', label: 'Family' },
        { key: 'group', label: 'Group' }
      ],
      sessionFormats: [
        { key: 'online_video', label: 'Online video' },
        { key: 'in_person', label: 'In person' },
        { key: 'phone_call', label: 'Phone call' }
      ],
      languages: [
        { key: 'english', label: 'English' },
        { key: 'spanish', label: 'Spanish' },
        { key: 'french', label: 'French' }
      ],
      priceRange: {
        minPrice: 0,
        maxPrice: 500,
        currency: 'usd'
      },
      ratingOptions: [
        { minRating: 4.5, label: '4.5 stars & up' },
        { minRating: 4.0, label: '4.0 stars & up' },
        { minRating: 3.5, label: '3.5 stars & up' }
      ],
      availabilityDaysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      availabilityTimeRange: {
        startHour: 7,
        endHour: 21
      },
      sortOptions: [
        { key: 'best_match', label: 'Best match' },
        { key: 'price_lowest_first', label: 'Price (Lowest first)' },
        { key: 'rating_highest_first', label: 'Rating (Highest first)' }
      ]
    };
  }

  // 3. searchCoaches
  searchCoaches(filters, sortKey, page = 1, pageSize = 20) {
    filters = filters || {};
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');
    const availabilitySlots = this._getFromStorage('coach_availability_slots');
    const now = new Date();

    const results = [];

    for (const coach of coaches) {
      if (coach.status !== 'active') continue;

      // Specialty filter
      if (filters.specialtyKey) {
        const specialties = coach.specialties || [];
        const specialtyLabel = this._mapSpecialtyKeyToLabel(filters.specialtyKey);
        if (!specialties.includes(filters.specialtyKey) && !specialties.includes(specialtyLabel)) {
          continue;
        }
      }

      // Client age group filter
      if (filters.clientAgeGroupKey && !(coach.clientAgeGroups || []).includes(filters.clientAgeGroupKey)) {
        continue;
      }

      // Language filter: require all requested languages
      if (filters.languageKeys && filters.languageKeys.length > 0) {
        const langs = coach.languages || [];
        if (!filters.languageKeys.every((lk) => langs.includes(lk))) {
          continue;
        }
      }

      // Offerings-based filters & starting price
      const coachOfferings = offerings.filter((o) => o.coachId === coach.id && o.isBookableOnline);
      if (coachOfferings.length === 0) {
        continue;
      }

      let filteredOfferings = coachOfferings.slice();

      if (filters.sessionModeKey) {
        filteredOfferings = filteredOfferings.filter((o) => o.sessionMode === filters.sessionModeKey);
      }

      if (filters.sessionFormatKey) {
        filteredOfferings = filteredOfferings.filter((o) => o.sessionFormat === filters.sessionFormatKey);
      }

      if (typeof filters.minPrice === 'number') {
        filteredOfferings = filteredOfferings.filter((o) => o.price >= filters.minPrice);
      }

      if (typeof filters.maxPrice === 'number') {
        filteredOfferings = filteredOfferings.filter((o) => o.price <= filters.maxPrice);
      }

      if (
        (filters.sessionModeKey || filters.sessionFormatKey || typeof filters.minPrice === 'number' || typeof filters.maxPrice === 'number') &&
        filteredOfferings.length === 0
      ) {
        // No offerings match the requested criteria for this coach
        continue;
      }

      const priceSource = filteredOfferings.length > 0 ? filteredOfferings : coachOfferings;
      let startingPrice = null;
      let currency = 'usd';
      for (const off of priceSource) {
        if (startingPrice === null || off.price < startingPrice) {
          startingPrice = off.price;
          currency = off.currency;
        }
      }

      // Rating filter
      if (typeof filters.minRating === 'number' && coach.averageRating < filters.minRating) {
        continue;
      }

      // Availability filter
      if (filters.availabilityDayOfWeek || typeof filters.availabilityStartHour === 'number' || typeof filters.availabilityEndHour === 'number') {
        const dayKey = filters.availabilityDayOfWeek;
        const startHour = typeof filters.availabilityStartHour === 'number' ? filters.availabilityStartHour : 0;
        const endHour = typeof filters.availabilityEndHour === 'number' ? filters.availabilityEndHour : 23;

        const coachSlots = availabilitySlots.filter((s) => s.coachId === coach.id && !s.isBooked);
        let hasMatchingSlot = false;
        for (const slot of coachSlots) {
          const d = new Date(slot.startDateTime);
          if (d < now) continue;
          const day = this._getDayOfWeekString(d);
          const hour = d.getHours();
          if (dayKey && day !== dayKey) continue;
          if (hour < startHour || hour > endHour) continue;
          hasMatchingSlot = true;
          break;
        }
        if (!hasMatchingSlot) continue;
      }

      // Key availability summary (earliest upcoming slot)
      const coachSlots = availabilitySlots
        .filter((s) => s.coachId === coach.id && !s.isBooked && new Date(s.startDateTime) >= now)
        .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
      let keyAvailabilitySummary = '';
      if (coachSlots.length > 0) {
        const d = new Date(coachSlots[0].startDateTime);
        keyAvailabilitySummary = `Next available ${this._getDayOfWeekShort(d)} ${this._formatTimeShort(d)}`;
      }

      results.push({
        coachId: coach.id,
        fullName: coach.fullName,
        photoUrl: coach.photoUrl || '',
        specialties: coach.specialties || [],
        clientAgeGroups: coach.clientAgeGroups || [],
        languages: coach.languages || [],
        averageRating: coach.averageRating,
        ratingCount: coach.ratingCount,
        startingPrice,
        currency,
        offersOnline: coach.offersOnline,
        offersInPerson: coach.offersInPerson,
        keyAvailabilitySummary
      });
    }

    // Sorting
    if (sortKey === 'price_lowest_first') {
      results.sort((a, b) => {
        if (a.startingPrice == null && b.startingPrice == null) return 0;
        if (a.startingPrice == null) return 1;
        if (b.startingPrice == null) return -1;
        return a.startingPrice - b.startingPrice;
      });
    } else if (sortKey === 'rating_highest_first') {
      results.sort((a, b) => b.averageRating - a.averageRating);
    } else {
      // best_match: rating then price
      results.sort((a, b) => {
        const r = b.averageRating - a.averageRating;
        if (r !== 0) return r;
        if (a.startingPrice == null && b.startingPrice == null) return 0;
        if (a.startingPrice == null) return 1;
        if (b.startingPrice == null) return -1;
        return a.startingPrice - b.startingPrice;
      });
    }

    const totalResults = results.length;
    const startIndex = (page - 1) * pageSize;
    const paged = results.slice(startIndex, startIndex + pageSize);

    return {
      totalResults,
      page,
      pageSize,
      results: paged
    };
  }

  // 4. getCoachDetails
  getCoachDetails(coachId) {
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');
    const coach = coaches.find((c) => c.id === coachId);
    if (!coach) {
      throw new Error('Coach not found');
    }

    const sessionOfferings = offerings
      .filter((o) => o.coachId === coachId)
      .map((o) => ({
        sessionOfferingId: o.id,
        name: o.name,
        durationMinutes: o.durationMinutes,
        sessionMode: o.sessionMode,
        sessionFormat: o.sessionFormat,
        price: o.price,
        currency: o.currency,
        isDefault: o.isDefault,
        isBookableOnline: o.isBookableOnline,
        description: o.description || ''
      }));

    // Without explicit mapping, default to false
    const supportsBetweenSessionChat = false;

    return {
      coach: {
        coachId: coach.id,
        fullName: coach.fullName,
        photoUrl: coach.photoUrl || '',
        bio: coach.bio || '',
        qualifications: coach.qualifications || '',
        specialties: coach.specialties || [],
        clientAgeGroups: coach.clientAgeGroups || [],
        languages: coach.languages || [],
        offersOnline: coach.offersOnline,
        offersInPerson: coach.offersInPerson,
        location: coach.location || '',
        averageRating: coach.averageRating,
        ratingCount: coach.ratingCount,
        status: coach.status
      },
      sessionOfferings,
      supportsBetweenSessionChat
    };
  }

  // 5. getCoachAvailability
  getCoachAvailability(coachId, sessionOfferingId, startDate, endDate) {
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');
    const slots = this._getFromStorage('coach_availability_slots');

    const coach = coaches.find((c) => c.id === coachId);
    if (!coach) throw new Error('Coach not found');

    let sessionOffering = null;
    if (sessionOfferingId) {
      sessionOffering = offerings.find((o) => o.id === sessionOfferingId && o.coachId === coachId);
    } else {
      sessionOffering = offerings.find((o) => o.coachId === coachId && o.isDefault && o.isBookableOnline) ||
        offerings.find((o) => o.coachId === coachId && o.isBookableOnline) || null;
      sessionOfferingId = sessionOffering ? sessionOffering.id : null;
    }

    if (!sessionOffering) {
      return {
        coachId,
        coach,
        sessionOfferingId: null,
        sessionOffering: null,
        slots: []
      };
    }

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const matchedSlots = slots
      .filter((s) => {
        if (s.coachId !== coachId) return false;
        if (s.isBooked) return false;
        const d = new Date(s.startDateTime);
        if (d < start || d > end) return false;
        // If slot is bound to a specific offering, ensure it matches
        if (s.sessionOfferingId && s.sessionOfferingId !== sessionOfferingId) return false;
        return true;
      })
      .map((s) => ({
        slotId: s.id,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        isBooked: s.isBooked
      }));

    return {
      coachId,
      coach,
      sessionOfferingId,
      sessionOffering,
      slots: matchedSlots
    };
  }

  // 6. createGuestSessionBooking
  createGuestSessionBooking(coachId, sessionOfferingId, slotId, guestName, guestEmail, guestMobile, notes) {
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');
    const slots = this._getFromStorage('coach_availability_slots');
    const appointments = this._getFromStorage('appointments');
    const bookings = this._getFromStorage('session_bookings');

    const coach = coaches.find((c) => c.id === coachId);
    if (!coach) throw new Error('Coach not found');

    const offering = offerings.find((o) => o.id === sessionOfferingId && o.coachId === coachId);
    if (!offering) throw new Error('Session offering not found for coach');

    const slotIndex = slots.findIndex((s) => s.id === slotId && s.coachId === coachId);
    if (slotIndex === -1) throw new Error('Slot not found');
    const slot = slots[slotIndex];
    if (slot.isBooked) throw new Error('Slot already booked');

    const appointmentId = this._generateId('appt');
    const appointment = {
      id: appointmentId,
      coachId,
      sessionOfferingId,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      durationMinutes: offering.durationMinutes,
      locationType: offering.sessionFormat === 'in_person' ? 'in_person' : 'online_video',
      status: 'scheduled',
      source: 'online_booking',
      createdAt: this._getNow(),
      notes: notes || ''
    };
    appointments.push(appointment);

    slots[slotIndex].isBooked = true;

    const bookingId = this._generateId('booking');
    const booking = {
      id: bookingId,
      coachId,
      sessionOfferingId,
      appointmentId,
      guestName,
      guestEmail,
      guestMobile,
      bookedAt: this._getNow(),
      status: 'confirmed',
      price: offering.price,
      currency: offering.currency,
      notes: notes || ''
    };
    bookings.push(booking);

    this._saveToStorage('appointments', appointments);
    this._saveToStorage('coach_availability_slots', slots);
    this._saveToStorage('session_bookings', bookings);

    return {
      bookingId,
      appointmentId,
      status: booking.status,
      price: booking.price,
      currency: booking.currency,
      coachName: coach.fullName,
      sessionDescription: offering.name,
      startDateTime: appointment.startDateTime,
      endDateTime: appointment.endDateTime,
      confirmationMessage: 'Your session has been booked.'
    };
  }

  // 7. addCoachSessionsToCart
  addCoachSessionsToCart(coachSessionOfferingId, quantity) {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    const offerings = this._getFromStorage('coach_session_offerings');
    const offering = offerings.find((o) => o.id === coachSessionOfferingId);
    if (!offering) throw new Error('Session offering not found');

    const cart = this._getOrCreateCart();
    const addResult = this._addItemToCart(cart.id, {
      itemType: 'coach_session_offering',
      coachSessionOfferingId,
      name: offering.name,
      quantity,
      unitPrice: offering.price,
      currency: offering.currency || 'usd'
    });

    // Ensure cart currency
    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1 && !carts[idx].currency) {
      carts[idx].currency = offering.currency || 'usd';
      this._saveToStorage('cart', carts);
    }

    return {
      cartId: cart.id,
      cartItemId: addResult.cartItem.id,
      totalItemsInCart: addResult.totalItemsInCart,
      cartTotalPrice: addResult.cartTotalPrice,
      currency: addResult.currency,
      message: 'Sessions added to cart.'
    };
  }

  // 8. sendCoachContactRequest
  sendCoachContactRequest(coachId, name, email, preferredContactMethod, message) {
    const allowed = ['secure_portal_message', 'phone_call', 'email', 'video_consult'];
    if (!allowed.includes(preferredContactMethod)) {
      throw new Error('Invalid preferredContactMethod');
    }

    const coaches = this._getFromStorage('coaches');
    const coach = coaches.find((c) => c.id === coachId);
    if (!coach) throw new Error('Coach not found');

    const requests = this._getFromStorage('coach_contact_requests');
    const id = this._generateId('coachcontact');
    const createdAt = this._getNow();

    const request = {
      id,
      coachId,
      name,
      email,
      preferredContactMethod,
      message,
      createdAt,
      status: 'new'
    };
    requests.push(request);
    this._saveToStorage('coach_contact_requests', requests);

    return {
      contactRequestId: id,
      status: 'new',
      createdAt,
      coachName: coach.fullName,
      confirmationMessage: 'Your message has been sent to the coach.'
    };
  }

  // 9. getWorkshopFilterOptions
  getWorkshopFilterOptions() {
    const workshops = this._getFromStorage('workshops');
    const scheduled = workshops.filter((w) => w.status === 'scheduled');
    let minPrice = 0;
    let maxPrice = 0;
    let currency = 'usd';
    if (scheduled.length > 0) {
      minPrice = scheduled[0].price;
      maxPrice = scheduled[0].price;
      currency = scheduled[0].currency;
      for (const w of scheduled) {
        if (w.price < minPrice) minPrice = w.price;
        if (w.price > maxPrice) maxPrice = w.price;
      }
    }

    return {
      categories: [
        { key: 'stress_burnout', label: 'Stress & Burnout' },
        { key: 'stress_coping_skills', label: 'Stress & Coping Skills' },
        { key: 'anxiety_relief', label: 'Anxiety relief' },
        { key: 'sleep_skills', label: 'Sleep skills' },
        { key: 'mindfulness', label: 'Mindfulness' },
        { key: 'general_wellbeing', label: 'General wellbeing' }
      ],
      priceRange: { minPrice, maxPrice, currency },
      durationOptions: [
        { key: 'under_60', label: 'Under 60 minutes', minMinutes: 0, maxMinutes: 59 },
        { key: '60_to_89', label: '60 to 89 minutes', minMinutes: 60, maxMinutes: 89 },
        { key: '90_or_longer', label: '90 minutes or longer', minMinutes: 90, maxMinutes: null }
      ],
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      sortOptions: [
        { key: 'start_date_soonest_first', label: 'Start date (Soonest first)' },
        { key: 'price_lowest_first', label: 'Price (Lowest first)' },
        { key: 'most_popular', label: 'Most popular' }
      ]
    };
  }

  // 10. searchWorkshops
  searchWorkshops(filters, sortKey, page = 1, pageSize = 20) {
    filters = filters || {};
    const workshops = this._getFromStorage('workshops');
    let list = workshops.filter((w) => w.status === 'scheduled');

    if (filters.categoryKey) {
      list = list.filter((w) => w.category === filters.categoryKey);
    }
    if (typeof filters.minPrice === 'number') {
      list = list.filter((w) => w.price >= filters.minPrice);
    }
    if (typeof filters.maxPrice === 'number') {
      list = list.filter((w) => w.price <= filters.maxPrice);
    }
    if (typeof filters.minDurationMinutes === 'number') {
      list = list.filter((w) => w.durationMinutes >= filters.minDurationMinutes);
    }
    if (filters.startDateFrom) {
      const from = new Date(filters.startDateFrom + 'T00:00:00');
      list = list.filter((w) => new Date(w.startDateTime) >= from);
    }
    if (filters.startDateTo) {
      const to = new Date(filters.startDateTo + 'T23:59:59');
      list = list.filter((w) => new Date(w.startDateTime) <= to);
    }
    if (filters.daysOfWeek && filters.daysOfWeek.length > 0) {
      list = list.filter((w) => {
        const d = new Date(w.startDateTime);
        const day = this._getDayOfWeekString(d);
        return filters.daysOfWeek.includes(day);
      });
    }

    if (sortKey === 'price_lowest_first') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortKey === 'most_popular') {
      // No popularity field in Workshop, fallback to soonest
      list.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
    } else {
      // start_date_soonest_first default
      list.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
    }

    const totalResults = list.length;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize).map((w) => ({
      workshopId: w.id,
      title: w.title,
      categoryLabel: this._mapWorkshopCategoryToLabel(w.category),
      tags: w.tags || [],
      startDateTime: w.startDateTime,
      endDateTime: w.endDateTime,
      durationMinutes: w.durationMinutes,
      price: w.price,
      currency: w.currency,
      locationTypeLabel: this._mapSessionFormatToLabel(w.locationType),
      status: w.status
    }));

    return { totalResults, page, pageSize, results: paged };
  }

  // 11. getWorkshopDetails
  getWorkshopDetails(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const w = workshops.find((x) => x.id === workshopId);
    if (!w) throw new Error('Workshop not found');

    return {
      workshopId: w.id,
      title: w.title,
      description: w.description,
      categoryLabel: this._mapWorkshopCategoryToLabel(w.category),
      tags: w.tags || [],
      facilitatorName: w.facilitatorName || '',
      price: w.price,
      currency: w.currency,
      durationMinutes: w.durationMinutes,
      startDateTime: w.startDateTime,
      endDateTime: w.endDateTime,
      capacity: typeof w.capacity === 'number' ? w.capacity : null,
      locationTypeLabel: this._mapSessionFormatToLabel(w.locationType),
      locationDetail: w.locationDetail || '',
      status: w.status
    };
  }

  // 12. addWorkshopRegistrationToCart
  addWorkshopRegistrationToCart(workshopId, participantCount, paymentOption, contactName, contactEmail, notes) {
    if (participantCount <= 0) throw new Error('participantCount must be positive');
    const allowed = ['pay_later_at_clinic', 'pay_now_online', 'pay_by_invoice'];
    if (!allowed.includes(paymentOption)) throw new Error('Invalid paymentOption');

    const workshops = this._getFromStorage('workshops');
    const w = workshops.find((x) => x.id === workshopId);
    if (!w) throw new Error('Workshop not found');

    const registrations = this._getFromStorage('workshop_registrations');
    const id = this._generateId('workshopreg');

    const registration = {
      id,
      workshopId,
      participantCount,
      paymentOption,
      status: 'in_cart',
      registeredAt: null,
      contactName: contactName || '',
      contactEmail: contactEmail || '',
      notes: notes || ''
    };
    registrations.push(registration);
    this._saveToStorage('workshop_registrations', registrations);

    const cart = this._getOrCreateCart();
    const addResult = this._addItemToCart(cart.id, {
      itemType: 'workshop_registration',
      workshopRegistrationId: id,
      name: w.title,
      quantity: participantCount,
      unitPrice: w.price,
      currency: w.currency || 'usd'
    });

    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1 && !carts[idx].currency) {
      carts[idx].currency = w.currency || 'usd';
      this._saveToStorage('cart', carts);
    }

    return {
      workshopRegistrationId: id,
      cartId: cart.id,
      cartItemId: addResult.cartItem.id,
      totalItemsInCart: addResult.totalItemsInCart,
      cartTotalPrice: addResult.cartTotalPrice,
      currency: addResult.currency,
      message: 'Workshop registration added to cart.'
    };
  }

  // 13. getCoachingPlansOverview
  getCoachingPlansOverview() {
    const plans = this._getFromStorage('coaching_plans');
    const active = plans.filter((p) => p.status === 'active');
    active.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    return active.map((p) => ({
      planId: p.id,
      name: p.name,
      description: p.description || '',
      sessionsPerMonth: p.sessionsPerMonth,
      priceMonthly: p.priceMonthly,
      currency: p.currency,
      includesChatSupport: p.includesChatSupport,
      otherFeatures: p.otherFeatures || [],
      minCommitmentMonths: typeof p.minCommitmentMonths === 'number' ? p.minCommitmentMonths : null,
      status: p.status,
      displayOrder: p.displayOrder || 0
    }));
  }

  // 14. getCoachingPlanComparison
  getCoachingPlanComparison() {
    const plans = this.getCoachingPlansOverview();
    const highlightedFeatures = [
      { key: 'chat_support', label: 'Chat support between sessions' },
      { key: 'sessions_per_month', label: 'Sessions per month' },
      { key: 'price_monthly', label: 'Monthly price' }
    ];
    return {
      plans: plans.map((p) => ({
        planId: p.planId,
        name: p.name,
        sessionsPerMonth: p.sessionsPerMonth,
        priceMonthly: p.priceMonthly,
        currency: p.currency,
        includesChatSupport: p.includesChatSupport,
        otherFeatures: p.otherFeatures || []
      })),
      highlightedFeatures
    };
  }

  // 15. getPlanSignupDetails
  getPlanSignupDetails(planId) {
    const plans = this._getFromStorage('coaching_plans');
    const p = plans.find((x) => x.id === planId);
    if (!p) throw new Error('Plan not found');

    return {
      planId: p.id,
      name: p.name,
      description: p.description || '',
      sessionsPerMonth: p.sessionsPerMonth,
      priceMonthly: p.priceMonthly,
      currency: p.currency,
      includesChatSupport: p.includesChatSupport,
      otherFeatures: p.otherFeatures || [],
      allowedBillingFrequencies: ['monthly', 'annual'],
      minSessionsPerMonth: p.sessionsPerMonth,
      maxSessionsPerMonth: p.sessionsPerMonth
    };
  }

  // 16. createPlanSignupGuest
  createPlanSignupGuest(planId, billingFrequency, selectedSessionsPerMonth, guestName, guestEmail) {
    const plans = this._getFromStorage('coaching_plans');
    const p = plans.find((x) => x.id === planId);
    if (!p) throw new Error('Plan not found');
    if (!['monthly', 'annual'].includes(billingFrequency)) {
      throw new Error('Invalid billingFrequency');
    }
    if (selectedSessionsPerMonth <= 0) {
      throw new Error('selectedSessionsPerMonth must be positive');
    }

    const signups = this._getFromStorage('plan_signups');
    const id = this._generateId('plansignup');
    const createdAt = this._getNow();

    const signup = {
      id,
      planId,
      planNameSnapshot: p.name,
      priceMonthlySnapshot: p.priceMonthly,
      currency: p.currency,
      billingFrequency,
      selectedSessionsPerMonth,
      guestName,
      guestEmail,
      createdAt,
      status: 'in_cart',
      addedToCart: true
    };
    signups.push(signup);
    this._saveToStorage('plan_signups', signups);

    const cart = this._getOrCreateCart();

    // For cart price we use monthly snapshot; frontend can show billing frequency separately
    const addResult = this._addItemToCart(cart.id, {
      itemType: 'coaching_plan',
      planSignupId: id,
      name: p.name,
      quantity: 1,
      unitPrice: p.priceMonthly,
      currency: p.currency || 'usd'
    });

    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1 && !carts[idx].currency) {
      carts[idx].currency = p.currency || 'usd';
      this._saveToStorage('cart', carts);
    }

    return {
      planSignupId: id,
      status: 'in_cart',
      priceMonthlySnapshot: p.priceMonthly,
      currency: p.currency,
      cartId: cart.id,
      cartItemId: addResult.cartItem.id,
      cartTotalPrice: addResult.cartTotalPrice,
      message: 'Plan added to cart.'
    };
  }

  // 17. getGetStartedOptions
  getGetStartedOptions() {
    return [
      {
        key: 'new_client_intake',
        title: 'Complete a new client intake',
        description: 'Share what you are experiencing (anxiety, stress, sleep, and more) so we can recommend options.',
        recommendedWhen: 'You want a gentle first step and aren\'t sure which service to choose.'
      },
      {
        key: 'find_a_coach',
        title: 'Find a coach',
        description: 'Browse our licensed coaches by specialty, language, and availability.',
        recommendedWhen: 'You prefer to choose a coach yourself and book directly.'
      },
      {
        key: 'workshops',
        title: 'Join a workshop or group',
        description: 'Practice new skills for managing stress, burnout, sleep, and more.',
        recommendedWhen: 'You like structured learning or want a lower-cost way to get support.'
      },
      {
        key: 'plans_pricing',
        title: 'Explore coaching plans',
        description: 'See ongoing support options with bundled sessions and chat support.',
        recommendedWhen: 'You want consistent support over several months.'
      }
    ];
  }

  // 18. getIntakeFormConfig
  getIntakeFormConfig() {
    return {
      coachingFocusOptions: [
        { key: 'anxiety_stress', label: 'Anxiety & Stress' },
        { key: 'depression_mood', label: 'Depression & Mood' },
        { key: 'relationships', label: 'Relationships' },
        { key: 'burnout_work', label: 'Work & Burnout' },
        { key: 'sleep_issues', label: 'Sleep issues' },
        { key: 'general_wellbeing', label: 'General wellbeing' }
      ],
      mainConcernsOptions: [
        { key: 'anxiety', label: 'Anxiety' },
        { key: 'burnout', label: 'Burnout' },
        { key: 'sleep_issues', label: 'Sleep issues' },
        { key: 'low_mood', label: 'Low mood' },
        { key: 'relationships', label: 'Relationship concerns' }
      ],
      preferredTimelineOptions: [
        { key: 'within_1_month', label: 'Within 1 month' },
        { key: 'within_3_months', label: 'Within 3 months' },
        { key: 'within_6_months', label: 'Within 6 months' },
        { key: 'longer_term', label: 'Longer term' },
        { key: 'not_sure', label: 'Not sure' }
      ],
      preferredTimeWindowsOptions: [
        { key: 'mornings', label: 'Mornings' },
        { key: 'afternoons', label: 'Afternoons' },
        { key: 'weeknights_5_8_pm', label: 'Weeknights (5–8 pm)' },
        { key: 'weekends', label: 'Weekends' }
      ],
      preferredDaysOfWeekOptions: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    };
  }

  // 19. submitIntakeForm
  submitIntakeForm(
    coachingFocus,
    strugglesWithSleep,
    mainConcerns,
    moodRating,
    stressRating,
    sleepQualityRating,
    goalsText,
    preferredTimeline,
    preferredTimeWindows,
    preferredDays,
    contactName,
    contactEmail,
    contactLocation
  ) {
    const forms = this._getFromStorage('intake_forms');
    const id = this._generateId('intake');
    const createdAt = this._getNow();

    const form = {
      id,
      coachingFocus,
      strugglesWithSleep: !!strugglesWithSleep,
      mainConcerns: mainConcerns || [],
      moodRating,
      stressRating,
      sleepQualityRating,
      goalsText,
      preferredTimeline,
      preferredTimeWindows: preferredTimeWindows || [],
      preferredDays: preferredDays || [],
      contactName,
      contactEmail,
      contactLocation,
      createdAt,
      status: 'submitted'
    };

    forms.push(form);
    this._saveToStorage('intake_forms', forms);

    return {
      intakeFormId: id,
      status: 'submitted',
      createdAt,
      nextStepsMessage: 'Thank you for sharing this information. Our team will review your intake and follow up with recommendations.'
    };
  }

  // 20. getArticleFilterOptions
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');
    const published = articles.filter((a) => a.status === 'published');

    const tagsSet = new Set();
    let minMinutes = 0;
    let maxMinutes = 0;
    if (published.length > 0) {
      minMinutes = published[0].readingTimeMinutes;
      maxMinutes = published[0].readingTimeMinutes;
      for (const a of published) {
        if (a.tags && Array.isArray(a.tags)) {
          a.tags.forEach((t) => tagsSet.add(t));
        }
        if (a.readingTimeMinutes < minMinutes) minMinutes = a.readingTimeMinutes;
        if (a.readingTimeMinutes > maxMinutes) maxMinutes = a.readingTimeMinutes;
      }
    }

    return {
      topicTags: Array.from(tagsSet),
      readingTimeRange: { minMinutes, maxMinutes },
      sortOptions: [
        { key: 'recent_first', label: 'Most recent' },
        { key: 'most_popular', label: 'Most popular' }
      ]
    };
  }

  // 21. searchArticles
  searchArticles(query, filters, sortKey, page = 1, pageSize = 20) {
    query = query || '';
    filters = filters || {};
    const articles = this._getFromStorage('articles');

    let list = articles.filter((a) => a.status === 'published');
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        return (
          (a.title || '').toLowerCase().includes(q) ||
          (a.summary || '').toLowerCase().includes(q) ||
          (a.content || '').toLowerCase().includes(q)
        );
      });
    }

    if (filters.tag) {
      list = list.filter((a) => (a.tags || []).includes(filters.tag));
    }
    if (typeof filters.maxReadingTimeMinutes === 'number') {
      list = list.filter((a) => a.readingTimeMinutes <= filters.maxReadingTimeMinutes);
    }
    if (filters.publishedFrom) {
      const from = new Date(filters.publishedFrom + 'T00:00:00');
      list = list.filter((a) => new Date(a.publishedAt) >= from);
    }

    if (sortKey === 'most_popular') {
      list.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    } else {
      // recent_first default
      list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }

    const totalResults = list.length;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize).map((a) => ({
      articleId: a.id,
      title: a.title,
      summary: a.summary,
      readingTimeMinutes: a.readingTimeMinutes,
      publishedAt: a.publishedAt,
      tags: a.tags || []
    }));

    return { totalResults, page, pageSize, results: paged };
  }

  // 22. getArticleDetail
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) throw new Error('Article not found');

    const related = [];
    const tags = article.tags || [];
    if (tags.length > 0) {
      const others = articles.filter((a) => a.id !== article.id && a.status === 'published');
      for (const a of others) {
        if ((a.tags || []).some((t) => tags.includes(t))) {
          related.push(a);
        }
      }
      related.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }

    const relatedArticles = related.slice(0, 5).map((a) => ({ articleId: a.id, title: a.title }));

    return {
      articleId: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      authorName: article.authorName || '',
      publishedAt: article.publishedAt,
      readingTimeMinutes: article.readingTimeMinutes,
      tags: article.tags || [],
      relatedArticles
    };
  }

  // 23. saveArticleToReadingList
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) throw new Error('Article not found');

    const items = this._getFromStorage('reading_list_items');
    const existing = items.find((i) => i.articleId === articleId);
    if (existing) {
      return {
        readingListItemId: existing.id,
        savedAt: existing.savedAt,
        articleTitleSnapshot: existing.articleTitleSnapshot,
        articleSlugSnapshot: existing.articleSlugSnapshot,
        alreadySaved: true
      };
    }

    const id = this._generateId('readingitem');
    const savedAt = this._getNow();
    const item = {
      id,
      articleId,
      savedAt,
      articleTitleSnapshot: article.title,
      articleSlugSnapshot: article.slug,
      notes: ''
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      readingListItemId: id,
      savedAt,
      articleTitleSnapshot: item.articleTitleSnapshot,
      articleSlugSnapshot: item.articleSlugSnapshot,
      alreadySaved: false
    };
  }

  // 24. getReadingList (with foreign key resolution)
  getReadingList() {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const sorted = items.slice().sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    return sorted.map((i) => {
      const article = articles.find((a) => a.id === i.articleId) || null;
      const title = i.articleTitleSnapshot || (article ? article.title : '');
      const slug = i.articleSlugSnapshot || (article ? article.slug : '');
      return {
        readingListItemId: i.id,
        articleId: i.articleId,
        title,
        slug,
        savedAt: i.savedAt,
        article
      };
    });
  }

  // 25. getExerciseFilterOptions
  getExerciseFilterOptions() {
    return {
      goals: [
        { key: 'manage_panic_anxiety', label: 'Manage panic & anxiety' },
        { key: 'reduce_general_stress', label: 'Reduce general stress' },
        { key: 'improve_sleep', label: 'Improve sleep' },
        { key: 'build_mindfulness', label: 'Build mindfulness' },
        { key: 'grounding', label: 'Grounding' },
        { key: 'emotional_regulation', label: 'Emotional regulation' }
      ],
      types: [
        { key: 'breathing', label: 'Breathing' },
        { key: 'body_scan', label: 'Body scan' },
        { key: 'visualization', label: 'Visualization' },
        { key: 'journaling', label: 'Journaling' },
        { key: 'progressive_muscle_relaxation', label: 'Progressive muscle relaxation' },
        { key: 'audio_meditation', label: 'Audio meditation' }
      ],
      durationOptions: [
        { key: 'ten_minutes_or_less', label: '10 minutes or less', maxMinutes: 10 },
        { key: 'under_20', label: 'Under 20 minutes', maxMinutes: 19 },
        { key: 'under_30', label: 'Under 30 minutes', maxMinutes: 29 }
      ],
      sortOptions: [
        { key: 'most_popular', label: 'Most popular' },
        { key: 'top_rated', label: 'Top rated' }
      ]
    };
  }

  // 26. searchExercises
  searchExercises(filters, sortKey, page = 1, pageSize = 20) {
    filters = filters || {};
    const exercises = this._getFromStorage('exercises');
    let list = exercises.filter((e) => e.status === 'active');

    if (filters.goalKey) {
      list = list.filter((e) => e.goal === filters.goalKey);
    }
    if (filters.typeKey) {
      list = list.filter((e) => e.type === filters.typeKey);
    }
    if (typeof filters.maxDurationMinutes === 'number') {
      list = list.filter((e) => e.durationMinutes <= filters.maxDurationMinutes);
    }

    if (sortKey === 'top_rated') {
      list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else {
      // most_popular default
      list.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    }

    const totalResults = list.length;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize).map((e) => ({
      exerciseId: e.id,
      title: e.title,
      goalLabel: this._mapExerciseGoalToLabel(e.goal),
      typeLabel: this._mapExerciseTypeToLabel(e.type),
      durationMinutes: e.durationMinutes,
      popularityScore: e.popularityScore || 0,
      averageRating: e.averageRating || 0
    }));

    return { totalResults, page, pageSize, results: paged };
  }

  // 27. getExerciseDetail
  getExerciseDetail(exerciseId) {
    const exercises = this._getFromStorage('exercises');
    const e = exercises.find((x) => x.id === exerciseId);
    if (!e) throw new Error('Exercise not found');

    return {
      exerciseId: e.id,
      title: e.title,
      description: e.description,
      goalLabel: this._mapExerciseGoalToLabel(e.goal),
      typeLabel: this._mapExerciseTypeToLabel(e.type),
      durationMinutes: e.durationMinutes,
      contentType: e.contentType,
      mediaUrl: e.mediaUrl || ''
    };
  }

  // 28. startExerciseSession
  startExerciseSession(exerciseId) {
    const exercises = this._getFromStorage('exercises');
    const e = exercises.find((x) => x.id === exerciseId);
    if (!e) throw new Error('Exercise not found');

    const sessions = this._getFromStorage('exercise_sessions');
    const id = this._generateId('exercisesession');
    const startedAt = this._getNow();

    const session = {
      id,
      exerciseId,
      startedAt,
      completedAt: null,
      status: 'in_progress'
    };
    sessions.push(session);
    this._saveToStorage('exercise_sessions', sessions);

    return {
      exerciseSessionId: id,
      startedAt,
      status: 'in_progress'
    };
  }

  // 29. addExerciseToFavorites
  addExerciseToFavorites(exerciseId) {
    const exercises = this._getFromStorage('exercises');
    const e = exercises.find((x) => x.id === exerciseId);
    if (!e) throw new Error('Exercise not found');

    const favs = this._getFromStorage('favorite_exercises');
    const existing = favs.find((f) => f.exerciseId === exerciseId);
    if (existing) {
      return {
        favoriteExerciseId: existing.id,
        savedAt: existing.savedAt,
        alreadySaved: true
      };
    }

    const id = this._generateId('favexercise');
    const savedAt = this._getNow();
    const fav = {
      id,
      exerciseId,
      savedAt
    };
    favs.push(fav);
    this._saveToStorage('favorite_exercises', favs);

    return {
      favoriteExerciseId: id,
      savedAt,
      alreadySaved: false
    };
  }

  // 30. getFavoriteExercises (with foreign key resolution)
  getFavoriteExercises() {
    const favs = this._getFromStorage('favorite_exercises');
    const exercises = this._getFromStorage('exercises');

    const sorted = favs.slice().sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    return sorted.map((f) => {
      const e = exercises.find((x) => x.id === f.exerciseId) || null;
      return {
        favoriteExerciseId: f.id,
        exerciseId: f.exerciseId,
        title: e ? e.title : '',
        goalLabel: e ? this._mapExerciseGoalToLabel(e.goal) : '',
        typeLabel: e ? this._mapExerciseTypeToLabel(e.type) : '',
        durationMinutes: e ? e.durationMinutes : null,
        savedAt: f.savedAt,
        exercise: e
      };
    });
  }

  // 31. getUpcomingAppointments
  getUpcomingAppointments() {
    const appointments = this._getFromStorage('appointments');
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');
    const slots = this._getFromStorage('coach_availability_slots');

    // Use a stable "now" based on metadata baseline date when available
    let now = new Date();
    const metadataRaw = localStorage.getItem('_metadata');
    if (metadataRaw) {
      try {
        const metadata = JSON.parse(metadataRaw);
        if (metadata && metadata.baselineDate) {
          now = new Date(metadata.baselineDate + 'T00:00:00Z');
        }
      } catch (e) {
        // Ignore and fall back to real current time
      }
    }

    const upcoming = appointments
      .filter((a) => {
        if (a.status !== 'scheduled') return false;
        const start = new Date(a.startDateTime);
        if (start < now) return false;
        // Only include appointments where the coach has at least one future unbooked slot (reschedulable)
        const hasFutureSlot = slots.some((s) => {
          if (s.coachId !== a.coachId) return false;
          if (s.isBooked) return false;
          const slotStart = new Date(s.startDateTime);
          return slotStart >= now;
        });
        if (!hasFutureSlot) return false;
        return true;
      })
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

    return upcoming.map((a) => {
      const coach = coaches.find((c) => c.id === a.coachId) || {};
      const offering = offerings.find((o) => o.id === a.sessionOfferingId) || {};
      return {
        appointmentId: a.id,
        coachName: coach.fullName || '',
        sessionOfferingName: offering.name || '',
        startDateTime: a.startDateTime,
        endDateTime: a.endDateTime,
        locationTypeLabel: this._mapSessionFormatToLabel(a.locationType),
        status: a.status
      };
    });
  }

  // 32. getAppointmentRescheduleAvailability (with foreign key resolution)
  getAppointmentRescheduleAvailability(appointmentId, startDate, endDate) {
    const appointments = this._getFromStorage('appointments');
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');
    const slots = this._getFromStorage('coach_availability_slots');

    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt) throw new Error('Appointment not found');

    const coach = coaches.find((c) => c.id === appt.coachId) || null;
    const offering = offerings.find((o) => o.id === appt.sessionOfferingId) || null;

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const availableSlots = slots
      .filter((s) => {
        if (s.coachId !== appt.coachId) return false;
        if (s.isBooked) return false;
        const d = new Date(s.startDateTime);
        if (d < start || d > end) return false;
        if (s.sessionOfferingId && s.sessionOfferingId !== appt.sessionOfferingId) return false;
        return true;
      })
      .map((s) => ({
        slotId: s.id,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime
      }));

    return {
      appointmentId: appt.id,
      appointment: appt,
      coachName: coach ? coach.fullName : '',
      sessionOfferingName: offering ? offering.name : '',
      slots: availableSlots
    };
  }

  // 33. rescheduleAppointment
  rescheduleAppointment(appointmentId, slotId) {
    const appointments = this._getFromStorage('appointments');
    const slots = this._getFromStorage('coach_availability_slots');
    const coaches = this._getFromStorage('coaches');
    const offerings = this._getFromStorage('coach_session_offerings');

    const apptIndex = appointments.findIndex((a) => a.id === appointmentId);
    if (apptIndex === -1) throw new Error('Appointment not found');
    const appt = appointments[apptIndex];

    const slotIndex = slots.findIndex((s) => s.id === slotId);
    if (slotIndex === -1) throw new Error('Slot not found');
    const slot = slots[slotIndex];

    if (slot.isBooked) throw new Error('Slot already booked');
    if (slot.coachId !== appt.coachId) throw new Error('Slot is for a different coach');
    if (slot.sessionOfferingId && slot.sessionOfferingId !== appt.sessionOfferingId) {
      throw new Error('Slot is for a different session type');
    }

    // Instrumentation for task completion tracking
    try {
      const task8_rescheduleInfo = {
        appointmentId: appointmentId,
        originalStartDateTime: appt.startDateTime,
        newStartDateTime: slot.startDateTime,
        rescheduledAt: this._getNow(),
        wasSoonestUpcomingAtTime: (function() {
          // Compute 'now' consistent with getUpcomingAppointments
          let now = new Date();
          const metadataRaw = localStorage.getItem('_metadata');
          if (metadataRaw) {
            try {
              const metadata = JSON.parse(metadataRaw);
              if (metadata && metadata.baselineDate) {
                now = new Date(metadata.baselineDate + 'T00:00:00Z');
              }
            } catch (e) {}
          }
          const appts = JSON.parse(localStorage.getItem('appointments') || '[]');
          const upcoming = appts
            .filter(a => a.status === 'scheduled' && new Date(a.startDateTime) >= now)
            .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
          return upcoming.length > 0 && upcoming[0].id === appointmentId;
        })()
      };
      localStorage.setItem('task8_rescheduleInfo', JSON.stringify(task8_rescheduleInfo));
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    appointments[apptIndex] = {
      ...appt,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime
    };
    slots[slotIndex].isBooked = true;

    this._saveToStorage('appointments', appointments);
    this._saveToStorage('coach_availability_slots', slots);

    const coach = coaches.find((c) => c.id === appt.coachId) || null;
    const offering = offerings.find((o) => o.id === appt.sessionOfferingId) || null;

    return {
      appointmentId: appt.id,
      status: appointments[apptIndex].status,
      startDateTime: appointments[apptIndex].startDateTime,
      endDateTime: appointments[apptIndex].endDateTime,
      coachName: coach ? coach.fullName : '',
      sessionOfferingName: offering ? offering.name : '',
      confirmationMessage: 'Your appointment has been rescheduled.'
    };
  }

  // 34. getCartContents (with foreign key resolution)
  getCartContents() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((i) => i.cartId === cart.id);
    const offerings = this._getFromStorage('coach_session_offerings');
    const coaches = this._getFromStorage('coaches');
    const registrations = this._getFromStorage('workshop_registrations');
    const workshops = this._getFromStorage('workshops');
    const planSignups = this._getFromStorage('plan_signups');
    const plans = this._getFromStorage('coaching_plans');

    const items = cartItems.map((item) => {
      let details = {};
      let coachSessionOffering = null;
      let workshopRegistration = null;
      let planSignup = null;
      let workshop = null;
      let coachingPlan = null;

      if (item.itemType === 'coach_session_offering') {
        coachSessionOffering = offerings.find((o) => o.id === item.coachSessionOfferingId) || null;
        const coach = coachSessionOffering ? coaches.find((c) => c.id === coachSessionOffering.coachId) || null : null;
        details.coachName = coach ? coach.fullName : '';
        details.sessionDescription = coachSessionOffering ? coachSessionOffering.name : '';
        details.coach = coach;
      } else if (item.itemType === 'workshop_registration') {
        workshopRegistration = registrations.find((r) => r.id === item.workshopRegistrationId) || null;
        if (workshopRegistration) {
          workshop = workshops.find((w) => w.id === workshopRegistration.workshopId) || null;
        }
        details.workshopDateTime = workshop ? workshop.startDateTime : '';
      } else if (item.itemType === 'coaching_plan') {
        planSignup = planSignups.find((p) => p.id === item.planSignupId) || null;
        if (planSignup) {
          coachingPlan = plans.find((p) => p.id === planSignup.planId) || null;
        }
        details.planBillingFrequency = planSignup ? planSignup.billingFrequency : '';
      }

      return {
        cartItemId: item.id,
        itemType: item.itemType,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        details,
        coachSessionOfferingId: item.coachSessionOfferingId,
        coachSessionOffering,
        workshopRegistrationId: item.workshopRegistrationId,
        workshopRegistration,
        planSignupId: item.planSignupId,
        planSignup,
        workshop,
        coachingPlan
      };
    });

    const totals = this._calculateCartTotals(cart.id);

    return {
      cartId: cart.id,
      items,
      cartTotalPrice: totals.cartTotalPrice,
      currency: totals.currency
    };
  }

  // 35. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    if (quantity < 0) throw new Error('Quantity cannot be negative');
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((i) => i.id === cartItemId);
    if (idx === -1) throw new Error('Cart item not found');

    const item = cartItems[idx];
    if (quantity === 0) {
      const cartId = item.cartId;
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      const totals = this._calculateCartTotals(cartId);
      return {
        cartId,
        cartTotalPrice: totals.cartTotalPrice,
        currency: totals.currency,
        updatedItem: {
          cartItemId,
          quantity: 0,
          totalPrice: 0
        }
      };
    }

    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(item.cartId);

    return {
      cartId: item.cartId,
      cartTotalPrice: totals.cartTotalPrice,
      currency: totals.currency,
      updatedItem: {
        cartItemId,
        quantity: item.quantity,
        totalPrice: item.totalPrice
      }
    };
  }

  // 36. removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((i) => i.id === cartItemId);
    if (idx === -1) {
      // Nothing to remove
      const cart = this._getCurrentCart();
      const totals = cart ? this._calculateCartTotals(cart.id) : { cartTotalPrice: 0, currency: 'usd' };
      return {
        cartId: cart ? cart.id : null,
        cartTotalPrice: totals.cartTotalPrice,
        currency: totals.currency,
        remainingItemsCount: cart ? this._getFromStorage('cart_items').filter((i) => i.cartId === cart.id).length : 0
      };
    }

    const cartId = cartItems[idx].cartId;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(cartId);
    const remainingItemsCount = cartItems.filter((i) => i.cartId === cartId).length;

    return {
      cartId,
      cartTotalPrice: totals.cartTotalPrice,
      currency: totals.currency,
      remainingItemsCount
    };
  }

  // 37. getSavedItemsOverview (with foreign key resolution)
  getSavedItemsOverview() {
    const readingList = this.getReadingList();
    const favoriteExercises = this.getFavoriteExercises();
    return {
      readingList,
      favoriteExercises
    };
  }

  // 38. getClinicInfo
  getClinicInfo() {
    const data = localStorage.getItem('clinic_info');
    if (!data) {
      return {
        mission: '',
        approach: '',
        focusAreas: [],
        staffSummary: '',
        contactInfo: { email: '', phone: '', address: '' },
        policySections: []
      };
    }
    const info = JSON.parse(data);
    return {
      mission: info.mission || '',
      approach: info.approach || '',
      focusAreas: info.focusAreas || [],
      staffSummary: info.staffSummary || '',
      contactInfo: info.contactInfo || { email: '', phone: '', address: '' },
      policySections: info.policySections || []
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