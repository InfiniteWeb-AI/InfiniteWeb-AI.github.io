// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  // ---- Storage helpers ----

  _initStorage() {
    const defaults = [
      { key: 'appointment_types', defaultValue: [] },
      { key: 'therapists', defaultValue: [] },
      { key: 'therapist_notes', defaultValue: [] },
      { key: 'appointment_slots', defaultValue: [] },
      { key: 'appointments', defaultValue: [] },
      { key: 'treatment_packages', defaultValue: [] },
      { key: 'cart', defaultValue: null },
      { key: 'cart_items', defaultValue: [] },
      { key: 'class_sessions', defaultValue: [] },
      { key: 'class_registrations', defaultValue: [] },
      { key: 'insurance_plans', defaultValue: [] },
      { key: 'session_rates', defaultValue: [] },
      { key: 'cost_estimate_notes', defaultValue: [] },
      { key: 'blog_articles', defaultValue: [] },
      { key: 'reading_list_items', defaultValue: [] },
      { key: 'contact_requests', defaultValue: [] },
      { key: 'newsletter_subscriptions', defaultValue: [] },
      { key: 'exercises', defaultValue: [] },
      { key: 'favorite_exercises', defaultValue: [] },
      {
        key: 'clinic_contact_info',
        defaultValue: {
          addressLines: [],
          phone: '',
          email: '',
          businessHours: [],
          mapEmbedCode: ''
        }
      },
      {
        key: 'about_clinic_content',
        defaultValue: {
          mission: '',
          values: [],
          history: '',
          facilities: '',
          certifications: []
        }
      },
      { key: 'faq_entries', defaultValue: [] },
      {
        key: 'legal_content_privacy_policy',
        defaultValue: {
          title: '',
          body: '',
          lastUpdated: null
        }
      },
      {
        key: 'legal_content_terms_of_use',
        defaultValue: {
          title: '',
          body: '',
          lastUpdated: null
        }
      }
    ];

    defaults.forEach((def) => {
      if (localStorage.getItem(def.key) === null) {
        localStorage.setItem(def.key, JSON.stringify(def.defaultValue));
      }
    });

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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

  _getCurrentDateTime() {
    return new Date().toISOString();
  }

  _calculateOutOfPocket(coveragePercent, sessionRateValue) {
    const coverage = Math.max(0, Math.min(100, Number(coveragePercent) || 0));
    const rate = Number(sessionRateValue) || 0;
    const estimated = rate * (1 - coverage / 100);
    return Math.max(0, Math.round(estimated * 100) / 100);
  }

  // ---- Label helpers ----

  _mapFocusAreaLabel(value) {
    switch (value) {
      case 'knee_pain':
        return 'Knee Pain';
      case 'back_pain':
        return 'Back Pain';
      case 'shoulder_pain':
        return 'Shoulder Pain';
      case 'posture_core':
        return 'Posture & Core';
      case 'running_injuries':
        return 'Running Injuries';
      case 'general_rehab':
        return 'General Rehab';
      default:
        return value || '';
    }
  }

  _mapTherapistSpecialtyLabel(value) {
    switch (value) {
      case 'back_pain_spine':
        return 'Back Pain / Spine';
      case 'knee_pain':
        return 'Knee Pain';
      case 'shoulder_pain':
        return 'Shoulder Pain';
      case 'sports_rehab':
        return 'Sports Rehab';
      case 'posture_core':
        return 'Posture & Core';
      case 'running_injuries':
        return 'Running Injuries';
      case 'general_orthopedics':
        return 'General Orthopedics';
      case 'pelvic_health':
        return 'Pelvic Health';
      default:
        return value || '';
    }
  }

  _mapClassTypeLabel(value) {
    switch (value) {
      case 'posture_core':
        return 'Posture & Core';
      case 'yoga':
        return 'Yoga';
      case 'pilates':
        return 'Pilates';
      case 'balance_training':
        return 'Balance Training';
      case 'strength_training':
        return 'Strength Training';
      case 'flexibility_mobility':
        return 'Flexibility & Mobility';
      default:
        return value || '';
    }
  }

  _mapClassLocationLabel(value) {
    switch (value) {
      case 'main_clinic_studio':
        return 'Main Clinic Studio';
      case 'secondary_studio':
        return 'Secondary Studio';
      case 'virtual':
        return 'Virtual';
      default:
        return value || '';
    }
  }

  _mapAppointmentLocationLabel(value) {
    switch (value) {
      case 'main_clinic':
        return 'Main Clinic';
      case 'satellite_clinic_1':
        return 'Satellite Clinic 1';
      case 'virtual':
        return 'Virtual';
      default:
        return value || '';
    }
  }

  _mapTimeOfDayLabel(value) {
    switch (value) {
      case 'morning':
        return 'Morning';
      case 'afternoon':
        return 'Afternoon';
      case 'evening':
        return 'Evening';
      case 'other':
        return 'Other';
      default:
        return value || '';
    }
  }

  _mapBodyPartLabel(value) {
    switch (value) {
      case 'knee':
        return 'Knee';
      case 'shoulder':
        return 'Shoulder';
      case 'back':
        return 'Back';
      case 'hip':
        return 'Hip';
      case 'ankle':
        return 'Ankle';
      case 'neck':
        return 'Neck';
      case 'core':
        return 'Core';
      case 'full_body':
        return 'Full Body';
      default:
        return value || '';
    }
  }

  _mapEquipmentLabel(value) {
    switch (value) {
      case 'no_equipment':
        return 'No Equipment';
      case 'resistance_band':
        return 'Resistance Band';
      case 'dumbbells':
        return 'Dumbbells';
      case 'chair':
        return 'Chair';
      case 'foam_roller':
        return 'Foam Roller';
      case 'other':
        return 'Other';
      default:
        return value || '';
    }
  }

  _mapDifficultyLabel(value) {
    switch (value) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      default:
        return value || '';
    }
  }

  _formatCurrency(value) {
    const num = Number(value) || 0;
    return '$' + num.toFixed(2);
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _isSameDate(dateTimeString, isoDateString) {
    const dt = this._parseDate(dateTimeString);
    const d = this._parseDate(isoDateString);
    if (!dt || !d) return false;
    return (
      dt.getUTCFullYear() === d.getUTCFullYear() &&
      dt.getUTCMonth() === d.getUTCMonth() &&
      dt.getUTCDate() === d.getUTCDate()
    );
  }

  _formatTimeDisplay(dateTimeString) {
    const d = this._parseDate(dateTimeString);
    if (!d) return '';
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    const mm = minutes < 10 ? '0' + minutes : String(minutes);
    return h12 + ':' + mm + ' ' + ampm;
  }

  // ---- Cart helpers ----

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      const now = this._getCurrentDateTime();
      cart = {
        id: this._generateId('cart'),
        items: [],
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { cart: null, items: [], subtotal: 0 };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const packages = this._getFromStorage('treatment_packages', []);

    let subtotal = 0;
    const updatedCartItems = cartItems.map((item) => {
      if (item.cartId !== cart.id) return item;
      const pkg = packages.find((p) => p.id === item.packageId) || null;
      const unitPrice = pkg ? Number(pkg.price) || 0 : Number(item.unitPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;
      return Object.assign({}, item, { unitPrice: unitPrice, lineTotal: lineTotal });
    });

    this._saveToStorage('cart_items', updatedCartItems);

    const itemsForCart = updatedCartItems.filter((i) => i.cartId === cart.id);

    return { cart: cart, items: itemsForCart, subtotal: subtotal };
  }

  // ---- Interface implementations ----

  // getHomePageHighlights
  getHomePageHighlights() {
    const appointmentTypes = this._getFromStorage('appointment_types', []);
    const classSessions = this._getFromStorage('class_sessions', []);
    const packages = this._getFromStorage('treatment_packages', []);
    const blogArticles = this._getFromStorage('blog_articles', []);

    const now = new Date();

    const featuredAppointmentTypes = appointmentTypes
      .filter((t) => t && t.isActive)
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        durationMinutes: t.durationMinutes,
        defaultRate: t.defaultRate
      }));

    const upcomingClasses = classSessions
      .filter((c) => c && c.isActive)
      .filter((c) => {
        const sd = this._parseDate(c.startDateTime);
        return sd && sd >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || now;
        const db = this._parseDate(b.startDateTime) || now;
        return da - db;
      })
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title,
        classType: c.classType,
        classTypeLabel: this._mapClassTypeLabel(c.classType),
        startDateTime: c.startDateTime,
        endDateTime: c.endDateTime,
        location: c.location,
        locationLabel: this._mapClassLocationLabel(c.location),
        spotsRemaining: c.spotsRemaining
      }));

    const activePackages = packages
      .filter((p) => p && p.isActive)
      .sort((a, b) => (a.price || 0) - (b.price || 0))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        focusArea: p.focusArea,
        focusAreaLabel: this._mapFocusAreaLabel(p.focusArea),
        numberOfSessions: p.numberOfSessions,
        price: p.price
      }));

    const recentBlogArticles = blogArticles
      .filter((a) => a && a.isPublished)
      .sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || now;
        const db = this._parseDate(b.publishedAt) || now;
        return db - da;
      })
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        summary: a.summary || '',
        publishedAt: a.publishedAt,
        heroImageUrl: a.heroImageUrl || ''
      }));

    return {
      featuredAppointmentTypes: featuredAppointmentTypes,
      featuredClasses: upcomingClasses,
      featuredPackages: activePackages,
      recentBlogArticles: recentBlogArticles
    };
  }

  // subscribeToNewsletter(email, topics, frequency, smsOptIn)
  subscribeToNewsletter(email, topics, frequency, smsOptIn) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const now = this._getCurrentDateTime();

    let existing = subscriptions.find((s) => s.email === email) || null;
    if (existing) {
      existing.topics = Array.isArray(topics) ? topics : [];
      existing.frequency = frequency;
      existing.smsOptIn = !!smsOptIn;
      // keep original createdAt
    } else {
      existing = {
        id: this._generateId('newsletter'),
        email: email,
        topics: Array.isArray(topics) ? topics : [],
        frequency: frequency,
        smsOptIn: !!smsOptIn,
        createdAt: now
      };
      subscriptions.push(existing);
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);
    return existing;
  }

  // getAppointmentTypesForBooking()
  getAppointmentTypesForBooking() {
    const appointmentTypes = this._getFromStorage('appointment_types', []);
    return appointmentTypes.filter((t) => t && t.isActive);
  }

  // getAvailableAppointmentSlots(appointmentTypeId, date, timeOfDay, therapistId, location)
  getAvailableAppointmentSlots(appointmentTypeId, date, timeOfDay, therapistId, location) {
    let slots = this._getFromStorage('appointment_slots', []);
    const therapists = this._getFromStorage('therapists', []);
    const appointmentTypes = this._getFromStorage('appointment_types', []);

    // Instrumentation for task completion tracking
    try {
      if (therapistId != null && appointmentTypeId != null) {
        localStorage.setItem(
          'task3_bookingStarted',
          JSON.stringify({
            therapistId: therapistId,
            appointmentTypeId: appointmentTypeId,
            requestedDate: date || null,
            timeOfDay: timeOfDay || null,
            startedAt: this._getCurrentDateTime()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const buildResults = () => {
      return slots
        .filter((s) => s && !s.isBooked && s.appointmentTypeId === appointmentTypeId)
        .filter((s) => this._isSameDate(s.startDateTime, date))
        .filter((s) => {
          if (timeOfDay) {
            if (s.timeOfDay !== timeOfDay) return false;
          }
          if (therapistId) {
            if (s.therapistId !== therapistId) return false;
          }
          if (location) {
            if (s.location !== location) return false;
          }
          return true;
        })
        .sort((a, b) => {
          const da = this._parseDate(a.startDateTime) || 0;
          const db = this._parseDate(b.startDateTime) || 0;
          return da - db;
        })
        .map((slot) => {
          const therapist = therapists.find((t) => t.id === slot.therapistId) || null;
          const apptType = appointmentTypes.find((a) => a.id === slot.appointmentTypeId) || null;
          return {
            slot: Object.assign({}, slot, {
              therapist: therapist,
              appointmentType: apptType
            }),
            therapistName: therapist ? therapist.fullName : null,
            appointmentTypeName: apptType ? apptType.name : null,
            timeDisplay: this._formatTimeDisplay(slot.startDateTime),
            locationLabel: this._mapAppointmentLocationLabel(slot.location)
          };
        });
    };

    let results = buildResults();

    // If no matching slots exist for the requested date, generate a default future slot
    if (!results.length && appointmentTypeId && date) {
      const requestedDate = this._parseDate(date);
      const metadata = this._getFromStorage('_metadata', null);
      const baselineDate = metadata && metadata.baselineDate ? this._parseDate(metadata.baselineDate) : null;
      const referenceDate = baselineDate || new Date();

      if (requestedDate && requestedDate >= referenceDate) {
        // Choose therapist: prefer the one specified, otherwise any accepting new patients
        let generatedTherapistId = therapistId || null;
        if (!generatedTherapistId && therapists.length) {
          const accepting = therapists.filter((t) => t && t.isAcceptingNewPatients);
          generatedTherapistId = (accepting[0] || therapists[0]).id;
        }

        if (generatedTherapistId) {
          const loc = location || 'main_clinic';
          let slotTimeOfDay = timeOfDay || 'morning';
          let startHour = 9;
          if (timeOfDay === 'afternoon') {
            startHour = 13;
          } else if (timeOfDay === 'evening') {
            startHour = 17;
          }

          const pad = (n) => (n < 10 ? '0' + n : String(n));
          const startIso = date + 'T' + pad(startHour) + ':00:00Z';

          // Determine end time based on appointment type duration when available (default 60 min)
          const apptType = appointmentTypes.find((a) => a && a.id === appointmentTypeId) || null;
          const durationMinutes = (apptType && apptType.durationMinutes) || 60;
          const endHour = startHour + Math.ceil(durationMinutes / 60);
          const endIso = date + 'T' + pad(endHour) + ':00:00Z';

          const newSlot = {
            id: this._generateId('slot'),
            therapistId: generatedTherapistId,
            appointmentTypeId: appointmentTypeId,
            startDateTime: startIso,
            endDateTime: endIso,
            timeOfDay: slotTimeOfDay,
            location: loc,
            notes: '',
            isBooked: false
          };

          slots.push(newSlot);
          this._saveToStorage('appointment_slots', slots);
          results = buildResults();
        }
      }
    }

    return results;
  }

  // scheduleAppointment(appointmentSlotId, appointmentTypeId, therapistId, patientFullName, patientPhone, patientEmail, reasonForVisit)
  scheduleAppointment(appointmentSlotId, appointmentTypeId, therapistId, patientFullName, patientPhone, patientEmail, reasonForVisit) {
    const slots = this._getFromStorage('appointment_slots', []);
    const appointmentTypes = this._getFromStorage('appointment_types', []);
    const appointments = this._getFromStorage('appointments', []);

    const slot = slots.find((s) => s.id === appointmentSlotId) || null;
    if (!slot || slot.isBooked) {
      return {
        appointment: null,
        message: 'Selected appointment slot is not available.'
      };
    }

    const apptType = appointmentTypes.find((a) => a.id === appointmentTypeId) || null;
    if (!apptType || !apptType.isActive) {
      return {
        appointment: null,
        message: 'Selected appointment type is not available.'
      };
    }

    const now = this._getCurrentDateTime();

    const appointment = {
      id: this._generateId('appointment'),
      appointmentTypeId: appointmentTypeId,
      therapistId: therapistId || slot.therapistId || null,
      appointmentSlotId: appointmentSlotId,
      patientFullName: patientFullName,
      patientPhone: patientPhone,
      patientEmail: patientEmail,
      reasonForVisit: reasonForVisit || '',
      createdAt: now,
      status: 'scheduled',
      confirmationCode: 'CONF-' + this._getNextIdCounter()
    };

    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    // Mark slot as booked
    slot.isBooked = true;
    this._saveToStorage('appointment_slots', slots);

    return {
      appointment: appointment,
      message: 'Appointment scheduled successfully.'
    };
  }

  // getTreatmentPackageFilterOptions()
  getTreatmentPackageFilterOptions() {
    const packages = this._getFromStorage('treatment_packages', []);
    const active = packages.filter((p) => p && p.isActive);

    const focusAreaValues = ['knee_pain', 'back_pain', 'shoulder_pain', 'posture_core', 'running_injuries', 'general_rehab'];
    const focusAreas = focusAreaValues.map((v) => ({ value: v, label: this._mapFocusAreaLabel(v) }));

    const numberOfSessionsSet = {};
    active.forEach((p) => {
      if (typeof p.numberOfSessions === 'number') {
        numberOfSessionsSet[p.numberOfSessions] = true;
      }
    });
    const numberOfSessionsOptions = Object.keys(numberOfSessionsSet)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);

    let min = 0;
    let max = 0;
    if (active.length > 0) {
      min = active.reduce((acc, p) => (p.price < acc ? p.price : acc), active[0].price || 0);
      max = active.reduce((acc, p) => (p.price > acc ? p.price : acc), active[0].price || 0);
    }

    const sortOptions = ['price_low_to_high', 'price_high_to_low', 'sessions_high_to_low'];

    return {
      focusAreas: focusAreas,
      numberOfSessionsOptions: numberOfSessionsOptions,
      priceRange: { min: min, max: max },
      sortOptions: sortOptions
    };
  }

  // searchTreatmentPackages(focusArea, numberOfSessions, maxPrice, sortBy)
  searchTreatmentPackages(focusArea, numberOfSessions, maxPrice, sortBy) {
    const packages = this._getFromStorage('treatment_packages', []);
    let results = packages.filter((p) => p && p.isActive);

    if (focusArea) {
      results = results.filter((p) => p.focusArea === focusArea);
    }
    if (typeof numberOfSessions === 'number') {
      results = results.filter((p) => p.numberOfSessions === numberOfSessions);
    }
    if (typeof maxPrice === 'number') {
      results = results.filter((p) => (p.price || 0) <= maxPrice);
    }

    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'sessions_high_to_low') {
      results.sort((a, b) => (b.numberOfSessions || 0) - (a.numberOfSessions || 0));
    }

    const mapped = results.map((p) => ({
      id: p.id,
      name: p.name,
      focusArea: p.focusArea,
      focusAreaLabel: this._mapFocusAreaLabel(p.focusArea),
      numberOfSessions: p.numberOfSessions,
      price: p.price,
      priceDisplay: this._formatCurrency(p.price),
      isActive: p.isActive
    }));

    return {
      results: mapped,
      totalCount: mapped.length
    };
  }

  // getTreatmentPackageDetails(packageId)
  getTreatmentPackageDetails(packageId) {
    const packages = this._getFromStorage('treatment_packages', []);
    return packages.find((p) => p.id === packageId) || null;
  }

  // addPackageToCart(packageId, quantity)
  addPackageToCart(packageId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const packages = this._getFromStorage('treatment_packages', []);
    const pkg = packages.find((p) => p.id === packageId && p.isActive) || null;
    if (!pkg) {
      return { success: false, message: 'Treatment package not found or inactive.', cart: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const now = this._getCurrentDateTime();

    let existingItem = cartItems.find((ci) => ci.cartId === cart.id && ci.packageId === packageId) || null;
    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 0) + qty;
      existingItem.unitPrice = pkg.price;
      existingItem.lineTotal = existingItem.unitPrice * existingItem.quantity;
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        packageId: packageId,
        quantity: qty,
        unitPrice: pkg.price,
        lineTotal: pkg.price * qty,
        addedAt: now
      };
      cartItems.push(newItem);
      cart.items = cart.items || [];
      cart.items.push(newItem.id);
    }

    cart.updatedAt = now;

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    return { success: true, message: 'Package added to cart.', cart: cart };
  }

  // getCart()
  getCart() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        subtotalDisplay: this._formatCurrency(0)
      };
    }

    const recalc = this._recalculateCartTotals();
    const packages = this._getFromStorage('treatment_packages', []);

    const items = recalc.items.map((ci) => {
      const pkg = packages.find((p) => p.id === ci.packageId) || null;
      const extendedCartItem = Object.assign({}, ci, {
        cart: cart,
        package: pkg
      });
      return {
        cartItem: extendedCartItem,
        packageName: pkg ? pkg.name : null,
        focusAreaLabel: pkg ? this._mapFocusAreaLabel(pkg.focusArea) : null
      };
    });

    return {
      cart: cart,
      items: items,
      subtotal: recalc.subtotal,
      subtotalDisplay: this._formatCurrency(recalc.subtotal)
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        subtotalDisplay: this._formatCurrency(0)
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (idx === -1) {
      const recalcEmpty = this._recalculateCartTotals();
      return {
        cart: recalcEmpty.cart,
        items: recalcEmpty.items,
        subtotal: recalcEmpty.subtotal,
        subtotalDisplay: this._formatCurrency(recalcEmpty.subtotal)
      };
    }

    if (!quantity || quantity <= 0) {
      // Remove item
      const removed = cartItems[idx];
      cartItems.splice(idx, 1);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== removed.id);
      }
    } else {
      cartItems[idx].quantity = quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    const recalc = this._recalculateCartTotals();
    const packages = this._getFromStorage('treatment_packages', []);

    const items = recalc.items.map((ci) => {
      const pkg = packages.find((p) => p.id === ci.packageId) || null;
      return Object.assign({}, ci, {
        cart: cart,
        package: pkg
      });
    });

    return {
      cart: cart,
      items: items,
      subtotal: recalc.subtotal,
      subtotalDisplay: this._formatCurrency(recalc.subtotal)
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        subtotalDisplay: this._formatCurrency(0)
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId && ci.cartId === cart.id) || null;
    if (item) {
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== cartItemId);
      }
      this._saveToStorage('cart_items', cartItems);
      this._saveToStorage('cart', cart);
    }

    const recalc = this._recalculateCartTotals();
    const packages = this._getFromStorage('treatment_packages', []);

    const items = recalc.items.map((ci) => {
      const pkg = packages.find((p) => p.id === ci.packageId) || null;
      return Object.assign({}, ci, {
        cart: cart,
        package: pkg
      });
    });

    return {
      cart: cart,
      items: items,
      subtotal: recalc.subtotal,
      subtotalDisplay: this._formatCurrency(recalc.subtotal)
    };
  }

  // getTherapistSpecialtyOptions()
  getTherapistSpecialtyOptions() {
    const values = [
      'back_pain_spine',
      'knee_pain',
      'shoulder_pain',
      'sports_rehab',
      'posture_core',
      'running_injuries',
      'general_orthopedics',
      'pelvic_health'
    ];
    return values.map((v) => ({ value: v, label: this._mapTherapistSpecialtyLabel(v) }));
  }

  // searchTherapists(specialty, sortBy)
  searchTherapists(specialty, sortBy) {
    const therapists = this._getFromStorage('therapists', []);
    let results = therapists.slice();

    if (specialty) {
      results = results.filter((t) => t.primarySpecialty === specialty);
    }

    if (sortBy === 'experience_high_to_low') {
      results.sort((a, b) => (b.yearsExperience || 0) - (a.yearsExperience || 0));
    } else if (sortBy === 'rating_high_to_low') {
      results.sort((a, b) => (b.starRating || 0) - (a.starRating || 0));
    } else if (sortBy === 'featured') {
      results.sort((a, b) => {
        const ra = a.starRating || 0;
        const rb = b.starRating || 0;
        if (rb !== ra) return rb - ra;
        const ea = a.yearsExperience || 0;
        const eb = b.yearsExperience || 0;
        return eb - ea;
      });
    }

    const mapped = results.map((t) => ({
      id: t.id,
      fullName: t.fullName,
      photoUrl: t.photoUrl || '',
      primarySpecialty: t.primarySpecialty,
      primarySpecialtyLabel: this._mapTherapistSpecialtyLabel(t.primarySpecialty),
      yearsExperience: t.yearsExperience,
      starRating: t.starRating,
      isAcceptingNewPatients: t.isAcceptingNewPatients
    }));

    return { results: mapped, totalCount: mapped.length };
  }

  // getFeaturedTherapists()
  getFeaturedTherapists() {
    const therapists = this._getFromStorage('therapists', []);
    return therapists
      .slice()
      .sort((a, b) => {
        const rb = b.starRating || 0;
        const ra = a.starRating || 0;
        if (rb !== ra) return rb - ra;
        const eb = b.yearsExperience || 0;
        const ea = a.yearsExperience || 0;
        return eb - ea;
      })
      .slice(0, 5);
  }

  // getTherapistDetails(therapistId)
  getTherapistDetails(therapistId) {
    const therapists = this._getFromStorage('therapists', []);
    return therapists.find((t) => t.id === therapistId) || null;
  }

  // getTherapistNote(therapistId)
  getTherapistNote(therapistId) {
    const notes = this._getFromStorage('therapist_notes', []);
    const therapists = this._getFromStorage('therapists', []);
    const therapist = therapists.find((t) => t.id === therapistId) || null;
    const note = notes.find((n) => n.therapistId === therapistId) || null;
    if (!note) return null;
    return Object.assign({}, note, { therapist: therapist });
  }

  // saveTherapistNote(therapistId, noteText)
  saveTherapistNote(therapistId, noteText) {
    const notes = this._getFromStorage('therapist_notes', []);
    const therapists = this._getFromStorage('therapists', []);
    const therapist = therapists.find((t) => t.id === therapistId) || null;

    const now = this._getCurrentDateTime();
    let note = notes.find((n) => n.therapistId === therapistId) || null;
    if (note) {
      note.noteText = noteText;
      note.updatedAt = now;
    } else {
      note = {
        id: this._generateId('therapist_note'),
        therapistId: therapistId,
        noteText: noteText,
        updatedAt: now
      };
      notes.push(note);
    }

    this._saveToStorage('therapist_notes', notes);
    return Object.assign({}, note, { therapist: therapist });
  }

  // getTherapistAppointmentTypes(therapistId)
  getTherapistAppointmentTypes(therapistId) {
    const appointmentTypes = this._getFromStorage('appointment_types', []);
    const slots = this._getFromStorage('appointment_slots', []);

    const typeIds = {};
    slots.forEach((s) => {
      if (s.therapistId === therapistId) {
        typeIds[s.appointmentTypeId] = true;
      }
    });

    const ids = Object.keys(typeIds);
    let results = appointmentTypes.filter((t) => t && t.isActive);
    if (ids.length > 0) {
      results = results.filter((t) => ids.indexOf(t.id) !== -1);
    }

    return results;
  }

  // getClassFilterOptions()
  getClassFilterOptions() {
    const classTypesValues = ['posture_core', 'yoga', 'pilates', 'balance_training', 'strength_training', 'flexibility_mobility'];
    const classTypes = classTypesValues.map((v) => ({ value: v, label: this._mapClassTypeLabel(v) }));

    const timeOfDayOptions = ['morning', 'afternoon', 'evening', 'other'];

    const locationValues = ['main_clinic_studio', 'secondary_studio', 'virtual'];
    const locationOptions = locationValues.map((v) => ({ value: v, label: this._mapClassLocationLabel(v) }));

    return {
      classTypes: classTypes,
      timeOfDayOptions: timeOfDayOptions,
      locationOptions: locationOptions
    };
  }

  // searchClassSessions(startDate, endDate, classType, timeOfDay, location)
  searchClassSessions(startDate, endDate, classType, timeOfDay, location) {
    const sessions = this._getFromStorage('class_sessions', []);
    const therapists = this._getFromStorage('therapists', []);

    let results = sessions.filter((s) => s && s.isActive);

    const start = startDate ? this._parseDate(startDate) : null;
    const end = endDate ? this._parseDate(endDate) : null;

    if (start || end) {
      results = results.filter((s) => {
        const sd = this._parseDate(s.startDateTime);
        if (!sd) return false;
        if (start && sd < start) return false;
        if (end && sd > end) return false;
        return true;
      });
    }

    if (classType) {
      results = results.filter((s) => s.classType === classType);
    }
    if (timeOfDay) {
      results = results.filter((s) => s.timeOfDay === timeOfDay);
    }
    if (location) {
      results = results.filter((s) => s.location === location);
    }

    return results.map((s) => {
      const instructor = s.instructorTherapistId
        ? therapists.find((t) => t.id === s.instructorTherapistId) || null
        : null;
      return Object.assign({}, s, { instructorTherapist: instructor });
    });
  }

  // getClassSessionDetails(classSessionId)
  getClassSessionDetails(classSessionId) {
    const sessions = this._getFromStorage('class_sessions', []);
    const therapists = this._getFromStorage('therapists', []);
    const session = sessions.find((s) => s.id === classSessionId) || null;
    if (!session) return null;
    const instructor = session.instructorTherapistId
      ? therapists.find((t) => t.id === session.instructorTherapistId) || null
      : null;
    return Object.assign({}, session, { instructorTherapist: instructor });
  }

  // registerForClass(classSessionId, numParticipants, contactName, contactEmail, contactPhone, notes)
  registerForClass(classSessionId, numParticipants, contactName, contactEmail, contactPhone, notes) {
    const sessions = this._getFromStorage('class_sessions', []);
    const registrations = this._getFromStorage('class_registrations', []);
    const therapists = this._getFromStorage('therapists', []);

    const session = sessions.find((s) => s.id === classSessionId) || null;
    if (!session || !session.isActive) {
      return {
        registration: null,
        updatedClassSession: null,
        message: 'Class session not found or inactive.'
      };
    }

    const spotsRemaining = Number(session.spotsRemaining) || 0;
    const count = Number(numParticipants) || 0;
    if (count <= 0 || count > spotsRemaining) {
      return {
        registration: null,
        updatedClassSession: Object.assign({}, session, {
          instructorTherapist: session.instructorTherapistId
            ? therapists.find((t) => t.id === session.instructorTherapistId) || null
            : null
        }),
        message: 'Not enough spots remaining for the requested number of participants.'
      };
    }

    const now = this._getCurrentDateTime();
    const registration = {
      id: this._generateId('class_reg'),
      classSessionId: classSessionId,
      numParticipants: count,
      contactName: contactName,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      notes: notes || '',
      createdAt: now
    };

    registrations.push(registration);
    session.spotsRemaining = spotsRemaining - count;

    this._saveToStorage('class_registrations', registrations);
    this._saveToStorage('class_sessions', sessions);

    const instructor = session.instructorTherapistId
      ? therapists.find((t) => t.id === session.instructorTherapistId) || null
      : null;

    return {
      registration: Object.assign({}, registration, { classSession: session }),
      updatedClassSession: Object.assign({}, session, { instructorTherapist: instructor }),
      message: 'Class registration completed.'
    };
  }

  // searchInsurancePlans(query)
  searchInsurancePlans(query) {
    const plans = this._getFromStorage('insurance_plans', []);
    const q = (query || '').toLowerCase();
    let results = plans.filter((p) => p && p.isActive);

    if (q) {
      results = results.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const provider = (p.providerName || '').toLowerCase();
        return name.indexOf(q) !== -1 || provider.indexOf(q) !== -1;
      });
    }

    return results;
  }

  // getInsurancePlanDetails(insurancePlanId)
  getInsurancePlanDetails(insurancePlanId) {
    const plans = this._getFromStorage('insurance_plans', []);
    return plans.find((p) => p.id === insurancePlanId) || null;
  }

  // getSessionRates()
  getSessionRates() {
    const rates = this._getFromStorage('session_rates', []);
    return rates.filter((r) => r && r.isActive);
  }

  // calculateCostEstimate(coveragePercent, sessionRateId, sessionRateValue)
  calculateCostEstimate(coveragePercent, sessionRateId, sessionRateValue) {
    const estimatedOutOfPocket = this._calculateOutOfPocket(coveragePercent, sessionRateValue);
    return {
      coveragePercent: Number(coveragePercent) || 0,
      sessionRateValue: Number(sessionRateValue) || 0,
      estimatedOutOfPocket: estimatedOutOfPocket
    };
  }

  // saveCostEstimateNote(insurancePlanId, sessionRateId, coveragePercent, sessionRateValue, estimatedOutOfPocket, noteText)
  saveCostEstimateNote(insurancePlanId, sessionRateId, coveragePercent, sessionRateValue, estimatedOutOfPocket, noteText) {
    const notes = this._getFromStorage('cost_estimate_notes', []);
    const now = this._getCurrentDateTime();

    const note = {
      id: this._generateId('cost_estimate'),
      insurancePlanId: insurancePlanId || null,
      sessionRateId: sessionRateId || null,
      coveragePercent: Number(coveragePercent) || 0,
      sessionRateValue: Number(sessionRateValue) || 0,
      estimatedOutOfPocket: Number(estimatedOutOfPocket) || 0,
      noteText: noteText || '',
      createdAt: now
    };

    notes.push(note);
    this._saveToStorage('cost_estimate_notes', notes);
    return note;
  }

  // searchBlogArticles(query, publishedFrom, publishedTo, sortBy)
  searchBlogArticles(query, publishedFrom, publishedTo, sortBy) {
    const articles = this._getFromStorage('blog_articles', []);
    const q = (query || '').toLowerCase();
    let results = articles.filter((a) => a && a.isPublished);

    if (q) {
      results = results.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return title.indexOf(q) !== -1 || body.indexOf(q) !== -1 || tags.indexOf(q) !== -1;
      });
    }

    const fromDate = publishedFrom ? this._parseDate(publishedFrom) : null;
    const toDate = publishedTo ? this._parseDate(publishedTo) : null;
    if (fromDate || toDate) {
      results = results.filter((a) => {
        const pd = this._parseDate(a.publishedAt);
        if (!pd) return false;
        if (fromDate && pd < fromDate) return false;
        if (toDate && pd > toDate) return false;
        return true;
      });
    }

    if (sortBy === 'newest_first') {
      results.sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || 0;
        const db = this._parseDate(b.publishedAt) || 0;
        return db - da;
      });
    } else if (sortBy === 'oldest_first') {
      results.sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || 0;
        const db = this._parseDate(b.publishedAt) || 0;
        return da - db;
      });
    }

    return { results: results, totalCount: results.length };
  }

  // getBlogArticleDetails(articleId)
  getBlogArticleDetails(articleId) {
    const articles = this._getFromStorage('blog_articles', []);
    return articles.find((a) => a.id === articleId) || null;
  }

  // getRelatedBlogArticles(articleId, limit)
  getRelatedBlogArticles(articleId, limit) {
    const articles = this._getFromStorage('blog_articles', []);
    const main = articles.find((a) => a.id === articleId) || null;
    if (!main) return [];

    const tags = Array.isArray(main.tags) ? main.tags : [];
    const now = new Date();

    let related = articles.filter((a) => a.id !== articleId && a.isPublished);
    if (tags.length > 0) {
      related = related.filter((a) => {
        const atags = Array.isArray(a.tags) ? a.tags : [];
        return atags.some((t) => tags.indexOf(t) !== -1);
      });
    }

    related.sort((a, b) => {
      const da = this._parseDate(a.publishedAt) || now;
      const db = this._parseDate(b.publishedAt) || now;
      return db - da;
    });

    const lim = typeof limit === 'number' && limit > 0 ? limit : 3;
    return related.slice(0, lim);
  }

  // addArticleToReadingList(blogArticleId, notes)
  addArticleToReadingList(blogArticleId, notes) {
    const list = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('blog_articles', []);
    const now = this._getCurrentDateTime();

    const item = {
      id: this._generateId('reading_list'),
      blogArticleId: blogArticleId,
      savedAt: now,
      notes: notes || ''
    };

    list.push(item);
    this._saveToStorage('reading_list_items', list);

    const article = articles.find((a) => a.id === blogArticleId) || null;
    return Object.assign({}, item, { blogArticle: article });
  }

  // getReadingList()
  getReadingList() {
    const list = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('blog_articles', []);
    return list.map((item) => {
      const article = articles.find((a) => a.id === item.blogArticleId) || null;
      return Object.assign({}, item, { blogArticle: article });
    });
  }

  // getClinicContactInfo()
  getClinicContactInfo() {
    const info = this._getFromStorage('clinic_contact_info', {
      addressLines: [],
      phone: '',
      email: '',
      businessHours: [],
      mapEmbedCode: ''
    });
    return info;
  }

  // submitContactRequest(requestType, patientType, preferredDate, preferredTimeWindow, reasonForVisit, name, email, phone, preferredContactMethod, allowSms)
  submitContactRequest(requestType, patientType, preferredDate, preferredTimeWindow, reasonForVisit, name, email, phone, preferredContactMethod, allowSms) {
    const requests = this._getFromStorage('contact_requests', []);
    const now = this._getCurrentDateTime();

    let preferredDateTime = null;
    if (preferredDate) {
      // Store as ISO date-only at midnight
      preferredDateTime = preferredDate + 'T00:00:00.000Z';
    }

    const req = {
      id: this._generateId('contact_request'),
      requestType: requestType,
      patientType: patientType,
      preferredDate: preferredDateTime,
      preferredTimeWindow: preferredTimeWindow || null,
      reasonForVisit: reasonForVisit || '',
      name: name,
      email: email,
      phone: phone,
      preferredContactMethod: preferredContactMethod,
      allowSms: !!allowSms,
      createdAt: now
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);
    return req;
  }

  // getExerciseFilterOptions()
  getExerciseFilterOptions() {
    const bodyPartsValues = ['knee', 'shoulder', 'back', 'hip', 'ankle', 'neck', 'core', 'full_body'];
    const equipmentValues = ['no_equipment', 'resistance_band', 'dumbbells', 'chair', 'foam_roller', 'other'];
    const difficultyValues = ['beginner', 'intermediate', 'advanced'];
    const sortOptions = ['most_popular', 'newest_first'];

    const bodyParts = bodyPartsValues.map((v) => ({ value: v, label: this._mapBodyPartLabel(v) }));
    const equipmentOptions = equipmentValues.map((v) => ({ value: v, label: this._mapEquipmentLabel(v) }));
    const difficultyLevels = difficultyValues.map((v) => ({ value: v, label: this._mapDifficultyLabel(v) }));

    return {
      bodyParts: bodyParts,
      equipmentOptions: equipmentOptions,
      difficultyLevels: difficultyLevels,
      sortOptions: sortOptions
    };
  }

  // searchExercises(bodyPart, equipment, difficulty, sortBy)
  searchExercises(bodyPart, equipment, difficulty, sortBy) {
    const exercises = this._getFromStorage('exercises', []);
    let results = exercises.filter((e) => e && e.isActive);

    if (bodyPart) {
      results = results.filter((e) => e.bodyPart === bodyPart);
    }
    if (equipment) {
      results = results.filter((e) => e.equipment === equipment);
    }
    if (difficulty) {
      results = results.filter((e) => e.difficulty === difficulty);
    }

    if (sortBy === 'most_popular') {
      results.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    }

    return { results: results, totalCount: results.length };
  }

  // getExerciseDetails(exerciseId)
  getExerciseDetails(exerciseId) {
    const exercises = this._getFromStorage('exercises', []);
    return exercises.find((e) => e.id === exerciseId) || null;
  }

  // addExerciseToFavorites(exerciseId)
  addExerciseToFavorites(exerciseId) {
    const favorites = this._getFromStorage('favorite_exercises', []);
    const exercises = this._getFromStorage('exercises', []);
    const now = this._getCurrentDateTime();

    const fav = {
      id: this._generateId('favorite_exercise'),
      exerciseId: exerciseId,
      savedAt: now
    };

    favorites.push(fav);
    this._saveToStorage('favorite_exercises', favorites);

    const exercise = exercises.find((e) => e.id === exerciseId) || null;
    return Object.assign({}, fav, { exercise: exercise });
  }

  // getFavoriteExercises()
  getFavoriteExercises() {
    const favorites = this._getFromStorage('favorite_exercises', []);
    const exercises = this._getFromStorage('exercises', []);
    return favorites.map((fav) => {
      const exercise = exercises.find((e) => e.id === fav.exerciseId) || null;
      return Object.assign({}, fav, { exercise: exercise });
    });
  }

  // getAboutClinicContent()
  getAboutClinicContent() {
    const content = this._getFromStorage('about_clinic_content', {
      mission: '',
      values: [],
      history: '',
      facilities: '',
      certifications: []
    });
    return content;
  }

  // getFaqEntries()
  getFaqEntries() {
    const faqs = this._getFromStorage('faq_entries', []);
    return faqs;
  }

  // getLegalContent(pageType)
  getLegalContent(pageType) {
    let key = null;
    if (pageType === 'privacy_policy') {
      key = 'legal_content_privacy_policy';
    } else if (pageType === 'terms_of_use') {
      key = 'legal_content_terms_of_use';
    }
    if (!key) {
      return {
        title: '',
        body: '',
        lastUpdated: null
      };
    }
    const content = this._getFromStorage(key, {
      title: '',
      body: '',
      lastUpdated: null
    });
    return content;
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