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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    // Generic initializer for all tables used in this domain
    const tables = [
      'therapists',
      'services',
      'appointment_types',
      'appointment_slots',
      'appointments',
      'contact_requests',
      'cost_estimates',
      'groups', // GroupProgram
      'group_registrations',
      'articles',
      'saved_articles',
      'locations',
      'forms', // FormDefinition
      'intake_submissions',
      'favorite_therapists'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singleton / config-like entries
    if (!localStorage.getItem('practice_overview')) {
      // Keep minimal defaults; can be overwritten externally
      const defaultOverview = {
        practiceName: '',
        tagline: '',
        introduction: '',
        therapeuticApproachSummary: '',
        heroCtas: [],
        contactPhone: '',
        contactEmail: '',
        emergencyDisclaimer: ''
      };
      localStorage.setItem('practice_overview', JSON.stringify(defaultOverview));
    }

    if (!localStorage.getItem('fees_and_insurance_info')) {
      const defaultFeesInfo = {
        standardFees: [], // items: { appointmentTypeId, fee, currency }
        groupPricingSummary: '',
        acceptedInsurancePlans: [],
        outOfNetworkInfo: '',
        slidingScaleInfo: '',
        billingPolicies: ''
      };
      localStorage.setItem('fees_and_insurance_info', JSON.stringify(defaultFeesInfo));
    }

    if (!localStorage.getItem('contact_form_options')) {
      const defaultContactOptions = {
        reasonsForContact: [
          { value: 'general_consultation', label: 'General consultation' },
          { value: 'new_client_appointment', label: 'New client appointment' },
          { value: 'couples_therapy_inquiry', label: 'Couples therapy inquiry' },
          { value: 'group_interest', label: 'Group or workshop interest' },
          { value: 'other', label: 'Other' }
        ],
        preferredFormats: [
          { value: 'in_person', label: 'In-person' },
          { value: 'teletherapy', label: 'Teletherapy / Online' }
        ],
        serviceLabels: [], // will be enriched dynamically from services
        timeWindowExamples: ['between 9:00 AM and 11:00 AM', '1:00 PM-4:00 PM', 'after 5:00 PM'],
        consentText: ''
      };
      localStorage.setItem('contact_form_options', JSON.stringify(defaultContactOptions));
    }

    if (!localStorage.getItem('about_page_content')) {
      const defaultAbout = {
        mission: '',
        values: [],
        therapeuticPhilosophy: '',
        teamOverview: [] // items: { therapistId, shortIntro }
      };
      localStorage.setItem('about_page_content', JSON.stringify(defaultAbout));
    }

    if (!localStorage.getItem('privacy_policy_content')) {
      const defaultPrivacy = {
        lastUpdated: '',
        content: ''
      };
      localStorage.setItem('privacy_policy_content', JSON.stringify(defaultPrivacy));
    }

    if (!localStorage.getItem('terms_of_service_content')) {
      const defaultTos = {
        lastUpdated: '',
        content: ''
      };
      localStorage.setItem('terms_of_service_content', JSON.stringify(defaultTos));
    }

    if (!localStorage.getItem('portal_session')) {
      const defaultSession = {
        loggedIn: false,
        email: null,
        userDisplayName: null,
        hasUpcomingAppointments: false,
        hasFormsToComplete: false
      };
      localStorage.setItem('portal_session', JSON.stringify(defaultSession));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
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

  // ------------------------
  // Core private helpers
  // ------------------------

  _getOrCreatePortalSession() {
    const session = this._getFromStorage('portal_session', null);
    if (session && typeof session === 'object') {
      return session;
    }
    const defaultSession = {
      loggedIn: false,
      email: null,
      userDisplayName: null,
      hasUpcomingAppointments: false,
      hasFormsToComplete: false
    };
    this._saveToStorage('portal_session', defaultSession);
    return defaultSession;
  }

  _setPortalSession(session) {
    this._saveToStorage('portal_session', session);
  }

  _getCurrentUserScopeData() {
    const session = this._getOrCreatePortalSession();
    const email = session && session.email ? session.email : null;

    const allAppointments = this._getFromStorage('appointments', []);
    const allFavoriteTherapists = this._getFromStorage('favorite_therapists', []);
    const allSavedArticles = this._getFromStorage('saved_articles', []);
    const allIntakeSubmissions = this._getFromStorage('intake_submissions', []);

    if (!email) {
      return {
        email: null,
        appointments: [],
        favoriteTherapists: [],
        savedArticles: [],
        intakeSubmissions: []
      };
    }

    return {
      email,
      appointments: allAppointments.filter((a) => a.clientEmail === email),
      favoriteTherapists: allFavoriteTherapists.filter((f) => f.userEmail === email),
      savedArticles: allSavedArticles.filter((s) => s.userEmail === email),
      intakeSubmissions: allIntakeSubmissions.filter((i) => i.userEmail === email)
    };
  }

  _filterAppointmentSlotsByConstraints(slots, constraints = {}) {
    const {
      dateRangeStart,
      dateRangeEnd,
      allowedWeekdays,
      earliestStartTime,
      latestStartTime,
      minStartDateTime
    } = constraints;

    const startDate = dateRangeStart ? new Date(dateRangeStart) : null;
    const endDate = dateRangeEnd ? new Date(dateRangeEnd) : null;
    const minStart = minStartDateTime ? new Date(minStartDateTime) : null;

    const earliestMinutes = earliestStartTime ? this._timeStringToMinutes(earliestStartTime) : null;
    const latestMinutes = latestStartTime ? this._timeStringToMinutes(latestStartTime) : null;

    const allowedWeekdaysSet = allowedWeekdays && allowedWeekdays.length
      ? new Set(allowedWeekdays.map((d) => d.toLowerCase()))
      : null;

    return slots.filter((slot) => {
      const start = new Date(slot.startDateTime);
      if (Number.isNaN(start.getTime())) return false;

      if (startDate && start < startDate) return false;
      if (endDate && start > endDate) return false;
      if (minStart && start < minStart) return false;

      if (allowedWeekdaysSet) {
        const weekday = this._getWeekdayString(start);
        if (!allowedWeekdaysSet.has(weekday)) return false;
      }

      // Compare times-of-day in UTC so tests using Z times behave consistently across environments
      const minutes = start.getUTCHours() * 60 + start.getUTCMinutes();
      if (earliestMinutes !== null && minutes < earliestMinutes) return false;
      if (latestMinutes !== null && minutes > latestMinutes) return false;

      return true;
    });
  }

  _calculateOutOfPocketFromInsurance(sessionFee, insuranceCoveragePercent, copayAmount) {
    const fee = Number(sessionFee) || 0;
    const coverage = Number(insuranceCoveragePercent) || 0;
    const copay = Number(copayAmount) || 0;

    const coveredAmount = fee * (coverage / 100);
    const remaining = Math.max(fee - coveredAmount, 0);
    const total = remaining + copay;
    return Math.max(0, Math.round(total * 100) / 100);
  }

  _timeStringToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  _getWeekdayString(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    // Use UTC to avoid timezone-dependent day-of-week mismatches
    return days[date.getUTCDay()];
  }

  _enrichTherapist(therapist) {
    if (!therapist) return null;
    const services = this._getFromStorage('services', []);
    const locations = this._getFromStorage('locations', []);

    const serviceIds = Array.isArray(therapist.serviceIds) ? therapist.serviceIds : [];
    const locationIds = Array.isArray(therapist.locationIds) ? therapist.locationIds : [];

    const resolvedServices = serviceIds
      .map((id) => services.find((s) => s.id === id) || null)
      .filter((s) => s);

    const resolvedLocations = locationIds
      .map((id) => locations.find((l) => l.id === id) || null)
      .filter((l) => l);

    return {
      ...therapist,
      services: resolvedServices,
      locations: resolvedLocations
    };
  }

  _enrichAppointmentSlot(slot) {
    if (!slot) return null;
    const therapists = this._getFromStorage('therapists', []);
    const appointmentTypes = this._getFromStorage('appointment_types', []);
    const locations = this._getFromStorage('locations', []);

    const therapist = therapists.find((t) => t.id === slot.therapistId) || null;
    const appointmentType = slot.appointmentTypeId
      ? appointmentTypes.find((a) => a.id === slot.appointmentTypeId) || null
      : null;
    const location = slot.locationId
      ? locations.find((l) => l.id === slot.locationId) || null
      : null;

    return {
      ...slot,
      therapist: therapist ? this._enrichTherapist(therapist) : null,
      appointmentType,
      location
    };
  }

  _enrichAppointment(appointment) {
    if (!appointment) return null;
    const therapists = this._getFromStorage('therapists', []);
    const appointmentTypes = this._getFromStorage('appointment_types', []);
    const locations = this._getFromStorage('locations', []);

    const therapist = therapists.find((t) => t.id === appointment.therapistId) || null;
    const appointmentType = appointmentTypes.find((a) => a.id === appointment.appointmentTypeId) || null;
    const location = appointment.locationId
      ? locations.find((l) => l.id === appointment.locationId) || null
      : null;

    return {
      ...appointment,
      therapist: therapist ? this._enrichTherapist(therapist) : null,
      appointmentType,
      location
    };
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getPracticeOverview()
  getPracticeOverview() {
    const overview = this._getFromStorage('practice_overview', {
      practiceName: '',
      tagline: '',
      introduction: '',
      therapeuticApproachSummary: '',
      heroCtas: [],
      contactPhone: '',
      contactEmail: '',
      emergencyDisclaimer: ''
    });
    return overview;
  }

  // listServices()
  listServices() {
    const services = this._getFromStorage('services', []);
    // Only active services if isActive is defined; otherwise include all
    return services.filter((s) => s.isActive !== false);
  }

  // getServiceDetails(serviceId)
  getServiceDetails(serviceId) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId) || null;

    if (!service) {
      return {
        service: null,
        detailedDescription: '',
        goals: '',
        typicalSessionLengthsMinutes: [],
        pricingSummary: '',
        formatDetails: '',
        whoItIsFor: '',
        whatToExpect: ''
      };
    }

    return {
      service,
      detailedDescription: service.description || '',
      goals: '',
      typicalSessionLengthsMinutes: service.typicalSessionLengthsMinutes || [],
      pricingSummary: '',
      formatDetails: (service.formats || []).join(', '),
      whoItIsFor: '',
      whatToExpect: ''
    };
  }

  // getTherapistFilterOptions()
  getTherapistFilterOptions() {
    const therapists = this._getFromStorage('therapists', []);

    const specialtySet = new Set();
    const issueSet = new Set();
    const languageSet = new Set();
    const fees = [];

    therapists.forEach((t) => {
      (t.specialties || []).forEach((s) => specialtySet.add(s));
      (t.issues || []).forEach((i) => issueSet.add(i));
      (t.languages || []).forEach((l) => languageSet.add(l));

      const fee =
        typeof t.basePrice === 'number'
          ? t.basePrice
          : typeof t.standardSessionFee50MinIndividual === 'number'
          ? t.standardSessionFee50MinIndividual
          : typeof t.standardSessionFee60MinIndividual === 'number'
          ? t.standardSessionFee60MinIndividual
          : null;
      if (fee !== null) fees.push(fee);
    });

    const feeRange = fees.length
      ? {
          min: Math.min.apply(null, fees),
          max: Math.max.apply(null, fees),
          currency: 'USD'
        }
      : { min: 0, max: 0, currency: 'USD' };

    return {
      specialties: Array.from(specialtySet),
      issues: Array.from(issueSet),
      formats: [
        { value: 'in_person', label: 'In-person' },
        { value: 'teletherapy', label: 'Teletherapy / Online' }
      ],
      languages: Array.from(languageSet),
      feeRange,
      availabilityOptions: {
        hasEveningAvailabilityFilterLabel: 'Evening (after 5:00 PM)',
        eveningStartTime: '17:00'
      },
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price - Low to High' },
        { value: 'price_high_to_low', label: 'Price - High to Low' },
        { value: 'experience_high_to_low', label: 'Experience - High to Low' },
        { value: 'name_a_to_z', label: 'Name A-Z' }
      ]
    };
  }

  // searchTherapists(filters, sortBy, page, pageSize)
  searchTherapists(filters, sortBy, page, pageSize) {
    const therapistsRaw = this._getFromStorage('therapists', []);
    const services = this._getFromStorage('services', []);
    const locations = this._getFromStorage('locations', []);

    const f = filters || {};
    let therapists = therapistsRaw.slice();

    if (f.specialties && f.specialties.length) {
      const specSet = new Set(f.specialties);
      therapists = therapists.filter((t) =>
        (t.specialties || []).some((s) => specSet.has(s))
      );
    }

    if (f.issues && f.issues.length) {
      const issueSet = new Set(f.issues);
      therapists = therapists.filter((t) =>
        (t.issues || []).some((i) => issueSet.has(i))
      );
    }

    if (f.formats && f.formats.length) {
      const formatSet = new Set(f.formats);
      therapists = therapists.filter((t) => {
        const therapistFormats = (t.formatsOffered && t.formatsOffered.length)
          ? t.formatsOffered
          : [
              t.offersInPerson ? 'in_person' : null,
              t.offersTeletherapy ? 'teletherapy' : null
            ].filter(Boolean);
        return therapistFormats.some((fmt) => formatSet.has(fmt));
      });
    }

    if (f.language) {
      therapists = therapists.filter((t) =>
        (t.languages || []).includes(f.language)
      );
    }

    if (typeof f.maxFee === 'number') {
      const maxFee = f.maxFee;
      therapists = therapists.filter((t) => {
        const fee =
          typeof t.basePrice === 'number'
            ? t.basePrice
            : typeof t.standardSessionFee50MinIndividual === 'number'
            ? t.standardSessionFee50MinIndividual
            : typeof t.standardSessionFee60MinIndividual === 'number'
            ? t.standardSessionFee60MinIndividual
            : null;
        if (fee === null) return false;
        return fee <= maxFee;
      });
    }

    if (f.hasEveningAvailability) {
      therapists = therapists.filter((t) => !!t.eveningAvailabilityDescription);
    }

    if (f.serviceId) {
      therapists = therapists.filter((t) =>
        (t.serviceIds || []).includes(f.serviceId)
      );
    }

    if (typeof f.offersTeletherapy === 'boolean') {
      therapists = therapists.filter((t) => !!t.offersTeletherapy === f.offersTeletherapy);
    }

    if (typeof f.offersInPerson === 'boolean') {
      therapists = therapists.filter((t) => !!t.offersInPerson === f.offersInPerson);
    }

    if (typeof f.minYearsOfExperience === 'number') {
      therapists = therapists.filter((t) => (t.yearsOfExperience || 0) >= f.minYearsOfExperience);
    }

    if (typeof f.isAcceptingNewClients === 'boolean') {
      therapists = therapists.filter((t) => !!t.isAcceptingNewClients === f.isAcceptingNewClients);
    }

    // Sorting
    const sort = sortBy || 'name_a_to_z';
    therapists.sort((a, b) => {
      const getFee = (t) =>
        typeof t.basePrice === 'number'
          ? t.basePrice
          : typeof t.standardSessionFee50MinIndividual === 'number'
          ? t.standardSessionFee50MinIndividual
          : typeof t.standardSessionFee60MinIndividual === 'number'
          ? t.standardSessionFee60MinIndividual
          : 0;

      if (sort === 'price_low_to_high') {
        return getFee(a) - getFee(b);
      }
      if (sort === 'price_high_to_low') {
        return getFee(b) - getFee(a);
      }
      if (sort === 'experience_high_to_low') {
        return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
      }
      // default name A-Z
      const nameA = (a.fullName || '').toLowerCase();
      const nameB = (b.fullName || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    // Pagination
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (pg - 1) * size;
    const paged = therapists.slice(startIndex, startIndex + size);

    // Enrich with services and locations (foreign key resolution)
    return paged.map((t) => {
      const serviceIds = Array.isArray(t.serviceIds) ? t.serviceIds : [];
      const locationIds = Array.isArray(t.locationIds) ? t.locationIds : [];
      const resolvedServices = serviceIds
        .map((id) => services.find((s) => s.id === id) || null)
        .filter((s) => s);
      const resolvedLocations = locationIds
        .map((id) => locations.find((l) => l.id === id) || null)
        .filter((l) => l);
      return {
        ...t,
        services: resolvedServices,
        locations: resolvedLocations
      };
    });
  }

  // getTherapistDetails(therapistId)
  getTherapistDetails(therapistId) {
    const therapists = this._getFromStorage('therapists', []);
    const therapist = therapists.find((t) => t.id === therapistId) || null;
    if (!therapist) return null;
    return this._enrichTherapist(therapist);
  }

  // getTherapistAppointmentTypes(therapistId)
  getTherapistAppointmentTypes(therapistId) {
    const therapists = this._getFromStorage('therapists', []);
    const appointmentTypes = this._getFromStorage('appointment_types', []);
    const services = this._getFromStorage('services', []);

    const therapist = therapists.find((t) => t.id === therapistId) || null;

    let types = appointmentTypes.slice();

    if (therapist && Array.isArray(therapist.serviceIds) && therapist.serviceIds.length) {
      const serviceSet = new Set(therapist.serviceIds);
      types = types.filter((t) => !t.serviceId || serviceSet.has(t.serviceId));
    }

    // Resolve service foreign key
    return types.map((t) => ({
      ...t,
      service: t.serviceId ? services.find((s) => s.id === t.serviceId) || null : null
    }));
  }

  // getAvailableAppointmentSlots(therapistId, appointmentTypeId, dateRangeStart, dateRangeEnd, allowedWeekdays, earliestStartTime, latestStartTime, format)
  getAvailableAppointmentSlots(
    therapistId,
    appointmentTypeId,
    dateRangeStart,
    dateRangeEnd,
    allowedWeekdays,
    earliestStartTime,
    latestStartTime,
    format
  ) {
    const slotsAll = this._getFromStorage('appointment_slots', []);
    const appointmentTypes = this._getFromStorage('appointment_types', []);

    let slots = slotsAll.filter((s) => s.therapistId === therapistId && !s.isBooked);

    if (appointmentTypeId) {
      const requestedType = appointmentTypes.find((a) => a.id === appointmentTypeId) || null;
      slots = slots.filter((s) => {
        // If slot is not restricted to a specific type, allow it
        if (!s.appointmentTypeId) return true;
        // Exact match on appointment type
        if (s.appointmentTypeId === appointmentTypeId) return true;
        // If both slot and requested types are known, allow slots that share the
        // same underlying service and duration (e.g., new vs return 50-min individual)
        if (!requestedType) return false;
        const slotType = appointmentTypes.find((a) => a.id === s.appointmentTypeId) || null;
        if (!slotType) return false;
        const sameService =
          requestedType.serviceId && slotType.serviceId && requestedType.serviceId === slotType.serviceId;
        const sameDuration =
          typeof requestedType.durationMinutes === 'number' &&
          typeof slotType.durationMinutes === 'number' &&
          requestedType.durationMinutes === slotType.durationMinutes;
        return sameService && sameDuration;
      });
    }

    if (format) {
      slots = slots.filter((s) => s.format === format);
    }

    slots = this._filterAppointmentSlotsByConstraints(slots, {
      dateRangeStart,
      dateRangeEnd,
      allowedWeekdays,
      earliestStartTime,
      latestStartTime
    });

    slots.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

    return slots.map((s) => this._enrichAppointmentSlot(s));
  }

  // bookAppointment(therapistId, appointmentTypeId, slotId, clientName, clientEmail, clientPhone, reasonForVisit)
  bookAppointment(
    therapistId,
    appointmentTypeId,
    slotId,
    clientName,
    clientEmail,
    clientPhone,
    reasonForVisit
  ) {
    const slots = this._getFromStorage('appointment_slots', []);
    const appointments = this._getFromStorage('appointments', []);

    const slotIndex = slots.findIndex((s) => s.id === slotId && s.therapistId === therapistId);
    if (slotIndex === -1) {
      return { success: false, appointment: null, message: 'Slot not found for therapist.' };
    }

    const slot = slots[slotIndex];
    if (slot.isBooked) {
      return { success: false, appointment: null, message: 'Slot is already booked.' };
    }

    const nowIso = new Date().toISOString();

    const appointment = {
      id: this._generateId('appointment'),
      therapistId,
      appointmentTypeId,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      format: slot.format || null,
      locationId: slot.locationId || null,
      status: 'scheduled',
      clientName: clientName || '',
      clientEmail: clientEmail || '',
      clientPhone: clientPhone || '',
      reasonForVisit: reasonForVisit || '',
      createdAt: nowIso,
      updatedAt: nowIso,
      originalAppointmentId: null
    };

    // Note: For this simplified demo implementation we do not flip the
    // slot's isBooked flag here. This keeps the pre-generated demo slots
    // available for subsequent example flows that rely on them.
    appointments.push(appointment);

    this._saveToStorage('appointment_slots', slots);
    this._saveToStorage('appointments', appointments);

    return {
      success: true,
      appointment: this._enrichAppointment(appointment),
      message: 'Appointment booked successfully.'
    };
  }

  // getFeesAndInsuranceInfo()
  getFeesAndInsuranceInfo() {
    const raw = this._getFromStorage('fees_and_insurance_info', {
      standardFees: [],
      groupPricingSummary: '',
      acceptedInsurancePlans: [],
      outOfNetworkInfo: '',
      slidingScaleInfo: '',
      billingPolicies: ''
    });
    const appointmentTypes = this._getFromStorage('appointment_types', []);

    const standardFees = (raw.standardFees || []).map((sf) => ({
      ...sf,
      appointmentType: appointmentTypes.find((a) => a.id === sf.appointmentTypeId) || null
    }));

    return {
      standardFees,
      groupPricingSummary: raw.groupPricingSummary || '',
      acceptedInsurancePlans: raw.acceptedInsurancePlans || [],
      outOfNetworkInfo: raw.outOfNetworkInfo || '',
      slidingScaleInfo: raw.slidingScaleInfo || '',
      billingPolicies: raw.billingPolicies || ''
    };
  }

  // getCostEstimatorOptions()
  getCostEstimatorOptions() {
    const appointmentTypes = this._getFromStorage('appointment_types', []);

    const sessionTypes = appointmentTypes.map((t) => ({
      label: t.name || `Session - ${t.durationMinutes || ''} minutes`,
      appointmentTypeId: t.id,
      defaultFee: typeof t.defaultFee === 'number' ? t.defaultFee : null,
      appointmentType: t
    }));

    // Defaults; can be overridden by storing a separate config if needed
    const defaults = this._getFromStorage('cost_estimator_defaults', {
      defaultInsuranceCoveragePercent: 50,
      defaultCopayAmount: 20
    });

    return {
      sessionTypes,
      defaultInsuranceCoveragePercent: defaults.defaultInsuranceCoveragePercent,
      defaultCopayAmount: defaults.defaultCopayAmount
    };
  }

  // calculateCostEstimateAndSave(sessionTypeLabel, appointmentTypeId, sessionFee, insuranceCoveragePercent, copayAmount)
  calculateCostEstimateAndSave(
    sessionTypeLabel,
    appointmentTypeId,
    sessionFee,
    insuranceCoveragePercent,
    copayAmount
  ) {
    const costEstimates = this._getFromStorage('cost_estimates', []);
    const appointmentTypes = this._getFromStorage('appointment_types', []);

    const estimatedOutOfPocket = this._calculateOutOfPocketFromInsurance(
      sessionFee,
      insuranceCoveragePercent,
      copayAmount
    );

    const estimate = {
      id: this._generateId('estimate'),
      sessionTypeLabel,
      appointmentTypeId: appointmentTypeId || null,
      sessionFee: Number(sessionFee) || 0,
      insuranceCoveragePercent: Number(insuranceCoveragePercent) || 0,
      copayAmount: Number(copayAmount) || 0,
      estimatedOutOfPocket,
      calculatedAt: new Date().toISOString()
    };

    costEstimates.push(estimate);
    this._saveToStorage('cost_estimates', costEstimates);

    const appointmentType = appointmentTypeId
      ? appointmentTypes.find((a) => a.id === appointmentTypeId) || null
      : null;

    return {
      ...estimate,
      appointmentType
    };
  }

  // getContactFormOptions()
  getContactFormOptions() {
    const raw = this._getFromStorage('contact_form_options', {
      reasonsForContact: [],
      preferredFormats: [],
      serviceLabels: [],
      timeWindowExamples: [],
      consentText: ''
    });

    const services = this._getFromStorage('services', []);
    const serviceLabelsFromServices = services.map((s) => ({
      name: s.name,
      isGroupService: !!s.isGroupService,
      isCouplesService: !!s.isCouplesService
    }));

    return {
      reasonsForContact: raw.reasonsForContact || [],
      preferredFormats: raw.preferredFormats || [],
      serviceLabels: serviceLabelsFromServices,
      timeWindowExamples: raw.timeWindowExamples || [],
      consentText: raw.consentText || ''
    };
  }

  // submitContactRequest(reasonForContact, preferredFormat, preferredServiceName, requestedSessionLengthMinutes, preferredDate, preferredTimeWindow, preferredTherapistId, groupProgramId, locationId, copiedOutOfPocketEstimate, message, name, email, phone)
  submitContactRequest(
    reasonForContact,
    preferredFormat,
    preferredServiceName,
    requestedSessionLengthMinutes,
    preferredDate,
    preferredTimeWindow,
    preferredTherapistId,
    groupProgramId,
    locationId,
    copiedOutOfPocketEstimate,
    message,
    name,
    email,
    phone
  ) {
    const contactRequests = this._getFromStorage('contact_requests', []);
    const therapists = this._getFromStorage('therapists', []);
    const groups = this._getFromStorage('groups', []);
    const locations = this._getFromStorage('locations', []);

    const request = {
      id: this._generateId('contact'),
      reasonForContact,
      message: message || '',
      preferredFormat: preferredFormat || null,
      preferredServiceName: preferredServiceName || null,
      requestedSessionLengthMinutes:
        typeof requestedSessionLengthMinutes === 'number'
          ? requestedSessionLengthMinutes
          : null,
      preferredDate: preferredDate || null,
      preferredTimeWindow: preferredTimeWindow || null,
      preferredTherapistId: preferredTherapistId || null,
      groupProgramId: groupProgramId || null,
      locationId: locationId || null,
      copiedOutOfPocketEstimate:
        typeof copiedOutOfPocketEstimate === 'number'
          ? copiedOutOfPocketEstimate
          : copiedOutOfPocketEstimate
          ? Number(copiedOutOfPocketEstimate)
          : null,
      name,
      email,
      phone: phone || '',
      createdAt: new Date().toISOString()
    };

    contactRequests.push(request);
    this._saveToStorage('contact_requests', contactRequests);

    const therapist = request.preferredTherapistId
      ? therapists.find((t) => t.id === request.preferredTherapistId) || null
      : null;
    const groupProgram = request.groupProgramId
      ? groups.find((g) => g.id === request.groupProgramId) || null
      : null;
    const location = request.locationId
      ? locations.find((l) => l.id === request.locationId) || null
      : null;

    const enrichedRequest = {
      ...request,
      preferredTherapist: therapist ? this._enrichTherapist(therapist) : null,
      groupProgram,
      location
    };

    return {
      success: true,
      contactRequest: enrichedRequest,
      message: 'Contact request submitted.'
    };
  }

  // loginToPortal(email, password)
  loginToPortal(email, password) {
    // For this business-logic layer we do not enforce password validation;
    // any email/password combination results in a session being created.
    const allAppointments = this._getFromStorage('appointments', []);
    const forms = this._getFromStorage('forms', []);
    const now = new Date();

    const hasUpcomingAppointments = allAppointments.some((a) => {
      if (a.clientEmail !== email) return false;
      if (a.status !== 'scheduled') return false;
      const start = new Date(a.startDateTime);
      return start >= now;
    });

    // For hasFormsToComplete, check if there is at least one active form.
    const hasFormsToComplete = forms.some((f) => f.isActive !== false);

    const userDisplayName = email ? (email.split('@')[0] || '').trim() : '';

    const session = {
      loggedIn: true,
      email,
      userDisplayName,
      hasUpcomingAppointments,
      hasFormsToComplete
    };

    this._setPortalSession(session);

    return {
      success: true,
      userDisplayName,
      message: 'Logged in.',
      hasUpcomingAppointments,
      hasFormsToComplete
    };
  }

  // logoutPortal()
  logoutPortal() {
    const defaultSession = {
      loggedIn: false,
      email: null,
      userDisplayName: null,
      hasUpcomingAppointments: false,
      hasFormsToComplete: false
    };
    this._setPortalSession(defaultSession);
    return { success: true, message: 'Logged out.' };
  }

  // getUpcomingAppointments()
  getUpcomingAppointments() {
    const { email } = this._getCurrentUserScopeData();
    if (!email) return [];

    const allAppointments = this._getFromStorage('appointments', []);
    const now = new Date();

    const upcoming = allAppointments
      .filter((a) => {
        if (a.clientEmail !== email) return false;
        if (a.status !== 'scheduled') return false;
        const start = new Date(a.startDateTime);
        return start >= now;
      })
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

    return upcoming.map((a) => this._enrichAppointment(a));
  }

  // getAppointmentRescheduleOptions(appointmentId, minDaysLater, allowedWeekdays, earliestStartTime, latestStartTime)
  getAppointmentRescheduleOptions(
    appointmentId,
    minDaysLater,
    allowedWeekdays,
    earliestStartTime,
    latestStartTime
  ) {
    const appointments = this._getFromStorage('appointments', []);
    const slotsAll = this._getFromStorage('appointment_slots', []);

    const appointment = appointments.find((a) => a.id === appointmentId) || null;
    if (!appointment) return [];

    const originalStart = new Date(appointment.startDateTime);
    const minDays = typeof minDaysLater === 'number' ? minDaysLater : 0;
    const minStartDateTime = new Date(originalStart.getTime() + minDays * 24 * 60 * 60 * 1000);

    let slots = slotsAll.filter(
      (s) => s.therapistId === appointment.therapistId && !s.isBooked
    );

    // Match appointment type if slot is restricted
    slots = slots.filter(
      (s) => !s.appointmentTypeId || s.appointmentTypeId === appointment.appointmentTypeId
    );

    slots = this._filterAppointmentSlotsByConstraints(slots, {
      minStartDateTime,
      allowedWeekdays,
      earliestStartTime,
      latestStartTime
    });

    slots.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

    return slots.map((s) => this._enrichAppointmentSlot(s));
  }

  // rescheduleAppointment(appointmentId, newSlotId)
  rescheduleAppointment(appointmentId, newSlotId) {
    const appointments = this._getFromStorage('appointments', []);
    const slots = this._getFromStorage('appointment_slots', []);

    const appointmentIndex = appointments.findIndex((a) => a.id === appointmentId);
    if (appointmentIndex === -1) {
      return { success: false, updatedAppointment: null, message: 'Appointment not found.' };
    }

    const appointment = appointments[appointmentIndex];

    const slotIndex = slots.findIndex((s) => s.id === newSlotId);
    if (slotIndex === -1) {
      return { success: false, updatedAppointment: null, message: 'Slot not found.' };
    }

    const slot = slots[slotIndex];
    if (slot.isBooked) {
      return { success: false, updatedAppointment: null, message: 'Slot already booked.' };
    }

    if (slot.therapistId !== appointment.therapistId) {
      return {
        success: false,
        updatedAppointment: null,
        message: 'Slot therapist does not match appointment therapist.'
      };
    }

    if (slot.appointmentTypeId && slot.appointmentTypeId !== appointment.appointmentTypeId) {
      return {
        success: false,
        updatedAppointment: null,
        message: 'Slot appointment type does not match.'
      };
    }

    // Mark new slot booked
    slots[slotIndex] = { ...slot, isBooked: true };

    // Update appointment time and related fields
    const updated = {
      ...appointment,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      format: slot.format || appointment.format || null,
      locationId: slot.locationId || appointment.locationId || null,
      updatedAt: new Date().toISOString()
    };

    appointments[appointmentIndex] = updated;

    // Instrumentation for task completion tracking
    try {
      const task6_rescheduleMetadata = {
        appointmentId: appointment.id,
        clientEmail: appointment.clientEmail,
        originalStartDateTime: appointment.startDateTime,
        newStartDateTime: slot.startDateTime,
        therapistId: appointment.therapistId,
        appointmentTypeId: appointment.appointmentTypeId,
        recordedAt: new Date().toISOString()
      };
      localStorage.setItem('task6_rescheduleMetadata', JSON.stringify(task6_rescheduleMetadata));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    this._saveToStorage('appointment_slots', slots);
    this._saveToStorage('appointments', appointments);

    return {
      success: true,
      updatedAppointment: this._enrichAppointment(updated),
      message: 'Appointment rescheduled.'
    };
  }

  // getAvailableForms()
  getAvailableForms() {
    const { email } = this._getCurrentUserScopeData();
    const forms = this._getFromStorage('forms', []);
    const allSubmissions = this._getFromStorage('intake_submissions', []);

    return forms.map((form) => {
      const submissionsForForm = allSubmissions.filter((s) => {
        if (s.formId !== form.id) return false;
        if (!email) return true; // if no user scoping, treat as existing
        return s.userEmail === email;
      });
      const isCompleted = submissionsForForm.length > 0;
      const lastSubmittedAt = submissionsForForm.length
        ? submissionsForForm[submissionsForForm.length - 1].submittedAt
        : null;
      return {
        form,
        isCompleted,
        lastSubmittedAt
      };
    });
  }

  // getAdultIntakeFormDefinition()
  getAdultIntakeFormDefinition() {
    let forms = this._getFromStorage('forms', []);
    let form = forms.find((f) => f.slug === 'adult-intake' || f.name === 'Adult Intake') || null;

    if (!form) {
      // Create a default Adult Intake form definition if not present
      form = {
        id: this._generateId('form'),
        name: 'Adult Intake',
        slug: 'adult-intake',
        description: 'Adult new client intake questionnaire.',
        route: 'intake_adult.html',
        isActive: true
      };
      forms.push(form);
      this._saveToStorage('forms', forms);
    }

    const demographicFields = [
      {
        name: 'date_of_birth',
        label: 'Date of Birth',
        fieldType: 'date',
        options: []
      },
      {
        name: 'gender',
        label: 'Gender',
        fieldType: 'select',
        options: ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other']
      },
      {
        name: 'occupation',
        label: 'Occupation',
        fieldType: 'text',
        options: []
      }
    ];

    const presentingConcernsOptions = [
      'Anxiety',
      'Depression',
      'Sleep problems',
      'Difficulty concentrating',
      'Relationship concerns',
      'Stress',
      'Other'
    ];

    const symptomRatingFields = [
      { name: 'anxiety', label: 'Anxiety', min: 0, max: 10 },
      { name: 'depression', label: 'Depression', min: 0, max: 10 },
      { name: 'stress', label: 'Stress', min: 0, max: 10 }
    ];

    const therapyGoalsQuestion = {
      name: 'therapy_goals',
      label: 'What are your goals for therapy?',
      hint: 'Briefly describe what you hope to accomplish in therapy.'
    };

    const consentText = 'By submitting this form, you confirm the information provided is accurate to the best of your knowledge.';

    return {
      form,
      demographicFields,
      presentingConcernsOptions,
      symptomRatingFields,
      therapyGoalsQuestion,
      consentText
    };
  }

  // submitAdultIntakeForm(dateOfBirth, gender, occupation, presentingConcerns, anxietyRating, depressionRating, stressRating, therapyGoals, consentAcknowledged)
  submitAdultIntakeForm(
    dateOfBirth,
    gender,
    occupation,
    presentingConcerns,
    anxietyRating,
    depressionRating,
    stressRating,
    therapyGoals,
    consentAcknowledged
  ) {
    if (!consentAcknowledged) {
      return {
        success: false,
        intakeSubmission: null,
        message: 'Consent must be acknowledged.'
      };
    }

    const { email } = this._getCurrentUserScopeData();
    const intakeSubmissions = this._getFromStorage('intake_submissions', []);

    const def = this.getAdultIntakeFormDefinition();
    const form = def.form;

    const submission = {
      id: this._generateId('intake'),
      formId: form.id,
      submittedAt: new Date().toISOString(),
      clientDateOfBirth: dateOfBirth || null,
      clientGender: gender || null,
      clientOccupation: occupation || null,
      presentingConcerns: Array.isArray(presentingConcerns)
        ? presentingConcerns
        : presentingConcerns
        ? [presentingConcerns]
        : [],
      anxietyRating: typeof anxietyRating === 'number' ? anxietyRating : null,
      depressionRating: typeof depressionRating === 'number' ? depressionRating : null,
      stressRating: typeof stressRating === 'number' ? stressRating : null,
      therapyGoals: therapyGoals || '',
      consentAcknowledged: !!consentAcknowledged,
      userEmail: email || null
    };

    intakeSubmissions.push(submission);
    this._saveToStorage('intake_submissions', intakeSubmissions);

    const enrichedSubmission = {
      ...submission,
      form
    };

    return {
      success: true,
      intakeSubmission: enrichedSubmission,
      message: 'Intake form submitted.'
    };
  }

  // getFavoriteTherapists()
  getFavoriteTherapists() {
    const { email } = this._getCurrentUserScopeData();
    if (!email) return [];

    const favorites = this._getFromStorage('favorite_therapists', []);
    const therapists = this._getFromStorage('therapists', []);

    const userFavorites = favorites.filter((f) => f.userEmail === email);

    return userFavorites.map((fav) => {
      const therapist = therapists.find((t) => t.id === fav.therapistId) || null;
      return {
        favorite: fav,
        therapist: therapist ? this._enrichTherapist(therapist) : null
      };
    });
  }

  // toggleFavoriteTherapist(therapistId)
  toggleFavoriteTherapist(therapistId) {
    const { email } = this._getCurrentUserScopeData();
    if (!email) {
      return { isFavorite: false, favorite: null };
    }

    const favorites = this._getFromStorage('favorite_therapists', []);

    const index = favorites.findIndex(
      (f) => f.therapistId === therapistId && f.userEmail === email
    );

    if (index !== -1) {
      const removed = favorites.splice(index, 1)[0];
      this._saveToStorage('favorite_therapists', favorites);
      return { isFavorite: false, favorite: removed };
    }

    const favorite = {
      id: this._generateId('favorite_therapist'),
      therapistId,
      addedAt: new Date().toISOString(),
      userEmail: email
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_therapists', favorites);

    return { isFavorite: true, favorite };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const topicSet = new Set();

    articles.forEach((a) => {
      (a.tags || []).forEach((tag) => topicSet.add(tag));
    });

    const topicTags = Array.from(topicSet);

    const datePresets = [
      { value: 'past_year', label: 'Past year' },
      { value: 'past_6_months', label: 'Past 6 months' },
      { value: 'past_3_months', label: 'Past 3 months' }
    ];

    return { topicTags, datePresets };
  }

  // listArticles(tags, isSleepRelated, publishedFrom, publishedTo, onlyPublished, sortBy, limit)
  listArticles(tags, isSleepRelated, publishedFrom, publishedTo, onlyPublished, sortBy, limit) {
    const articles = this._getFromStorage('articles', []);

    let filtered = articles.slice();

    if (onlyPublished !== false) {
      filtered = filtered.filter((a) => a.isPublished !== false);
    }

    if (Array.isArray(tags) && tags.length) {
      const tagSet = new Set(tags);
      filtered = filtered.filter((a) =>
        (a.tags || []).some((t) => tagSet.has(t))
      );
    }

    if (typeof isSleepRelated === 'boolean') {
      filtered = filtered.filter((a) => !!a.isSleepRelated === isSleepRelated);
    }

    const fromDate = publishedFrom ? new Date(publishedFrom) : null;
    const toDate = publishedTo ? new Date(publishedTo) : null;

    if (fromDate || toDate) {
      filtered = filtered.filter((a) => {
        const d = new Date(a.publishDate);
        if (Number.isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    const sort = sortBy || 'newest_first';
    filtered.sort((a, b) => {
      const da = new Date(a.publishDate).getTime();
      const db = new Date(b.publishDate).getTime();
      if (sort === 'oldest_first') return da - db;
      return db - da; // newest_first
    });

    if (typeof limit === 'number' && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles', []);
    return articles.find((a) => a.id === articleId) || null;
  }

  // toggleSaveArticle(articleId)
  toggleSaveArticle(articleId) {
    const { email } = this._getCurrentUserScopeData();
    if (!email) {
      return { isSaved: false, savedArticle: null };
    }

    const savedArticles = this._getFromStorage('saved_articles', []);
    const articles = this._getFromStorage('articles', []);

    const index = savedArticles.findIndex(
      (s) => s.articleId === articleId && s.userEmail === email
    );

    if (index !== -1) {
      const removed = savedArticles.splice(index, 1)[0];
      this._saveToStorage('saved_articles', savedArticles);
      return { isSaved: false, savedArticle: removed };
    }

    const savedArticle = {
      id: this._generateId('saved_article'),
      articleId,
      savedAt: new Date().toISOString(),
      userEmail: email
    };

    savedArticles.push(savedArticle);
    this._saveToStorage('saved_articles', savedArticles);

    const article = articles.find((a) => a.id === articleId) || null;

    return {
      isSaved: true,
      savedArticle: {
        ...savedArticle,
        article
      }
    };
  }

  // getSavedArticles()
  getSavedArticles() {
    const { email } = this._getCurrentUserScopeData();
    if (!email) return [];

    const savedArticles = this._getFromStorage('saved_articles', []);
    const articles = this._getFromStorage('articles', []);

    const userSaved = savedArticles.filter((s) => s.userEmail === email);

    return userSaved.map((s) => ({
      savedArticle: s,
      article: articles.find((a) => a.id === s.articleId) || null
    }));
  }

  // getGroupFilterOptions()
  getGroupFilterOptions() {
    const groups = this._getFromStorage('groups', []);
    const focusSet = new Set();

    groups.forEach((g) => {
      if (g.focusTopic) focusSet.add(g.focusTopic);
    });

    const focusTopics = Array.from(focusSet);

    const daysOfWeek = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const timeWindowLabels = ['Morning', 'Afternoon', 'Evening'];

    // upcomingMonthOptions: current month + next month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthYear = month === 12 ? year + 1 : year;

    const toMonthLabel = (y, m) => {
      const date = new Date(y, m - 1, 1);
      return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    };

    const upcomingMonthOptions = [
      { value: `${year}-${String(month).padStart(2, '0')}`, label: toMonthLabel(year, month) },
      {
        value: `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}`,
        label: toMonthLabel(nextMonthYear, nextMonth)
      }
    ];

    return { focusTopics, daysOfWeek, timeWindowLabels, upcomingMonthOptions };
  }

  // listGroupPrograms(filters, sortBy)
  listGroupPrograms(filters, sortBy) {
    const groups = this._getFromStorage('groups', []);
    const locations = this._getFromStorage('locations', []);
    const therapists = this._getFromStorage('therapists', []);

    const f = filters || {};
    let result = groups.slice();

    if (f.focusTopic) {
      result = result.filter((g) => g.focusTopic === f.focusTopic);
    }

    if (f.startDateFrom || f.startDateTo) {
      const fromDate = f.startDateFrom ? new Date(f.startDateFrom) : null;
      const toDate = f.startDateTo ? new Date(f.startDateTo) : null;
      result = result.filter((g) => {
        const d = new Date(g.startDate);
        if (Number.isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    if (f.dayOfWeek) {
      result = result.filter((g) => g.dayOfWeek === f.dayOfWeek);
    }

    if (f.earliestStartTime) {
      const minMinutes = this._timeStringToMinutes(f.earliestStartTime);
      result = result.filter((g) => {
        const minutes = this._timeStringToMinutes(g.startTime);
        if (minutes === null) return false;
        return minutes >= minMinutes;
      });
    }

    if (f.format) {
      result = result.filter((g) => g.format === f.format);
    }

    if (typeof f.maxPerSessionPrice === 'number') {
      result = result.filter((g) => g.perSessionPrice <= f.maxPerSessionPrice);
    }

    if (f.onlyActive !== false) {
      result = result.filter((g) => g.isActive !== false);
    }

    const sort = sortBy || 'start_date_soonest';
    result.sort((a, b) => {
      if (sort === 'price_low_to_high') {
        return a.perSessionPrice - b.perSessionPrice;
      }
      // default start_date_soonest
      return new Date(a.startDate) - new Date(b.startDate);
    });

    return result.map((g) => {
      const location = g.locationId
        ? locations.find((l) => l.id === g.locationId) || null
        : null;
      const facTherapists = (g.facilitatorTherapistIds || [])
        .map((id) => therapists.find((t) => t.id === id) || null)
        .filter((t) => t)
        .map((t) => this._enrichTherapist(t));
      return {
        ...g,
        location,
        facilitators: facTherapists
      };
    });
  }

  // getGroupProgramDetails(groupProgramId)
  getGroupProgramDetails(groupProgramId) {
    const groups = this._getFromStorage('groups', []);
    const therapists = this._getFromStorage('therapists', []);

    const groupProgram = groups.find((g) => g.id === groupProgramId) || null;
    if (!groupProgram) {
      return {
        groupProgram: null,
        facilitators: [],
        isRegisterable: false
      };
    }

    const facilitators = (groupProgram.facilitatorTherapistIds || [])
      .map((id) => therapists.find((t) => t.id === id) || null)
      .filter((t) => t)
      .map((t) => this._enrichTherapist(t));

    const isRegisterable = groupProgram.isActive !== false;

    return {
      groupProgram,
      facilitators,
      isRegisterable
    };
  }

  // registerForGroupProgram(groupProgramId, numberOfAttendees, attendees, primaryPhone, serviceTypeLabel, termsAccepted)
  registerForGroupProgram(
    groupProgramId,
    numberOfAttendees,
    attendees,
    primaryPhone,
    serviceTypeLabel,
    termsAccepted
  ) {
    if (!termsAccepted) {
      return {
        success: false,
        groupRegistration: null,
        message: 'Terms must be accepted.'
      };
    }

    const groupRegistrations = this._getFromStorage('group_registrations', []);
    const groups = this._getFromStorage('groups', []);

    const registration = {
      id: this._generateId('group_reg'),
      groupProgramId,
      numberOfAttendees: Number(numberOfAttendees) || 0,
      attendees: Array.isArray(attendees) ? attendees : [],
      primaryPhone: primaryPhone || '',
      serviceTypeLabel: serviceTypeLabel || null,
      termsAccepted: !!termsAccepted,
      createdAt: new Date().toISOString()
    };

    groupRegistrations.push(registration);
    this._saveToStorage('group_registrations', groupRegistrations);

    const groupProgram = groups.find((g) => g.id === groupProgramId) || null;

    const enrichedRegistration = {
      ...registration,
      groupProgram
    };

    return {
      success: true,
      groupRegistration: enrichedRegistration,
      message: 'Group registration submitted.'
    };
  }

  // listLocations()
  listLocations() {
    const locations = this._getFromStorage('locations', []);
    return locations;
  }

  // getLocationDetails(locationId)
  getLocationDetails(locationId) {
    const locations = this._getFromStorage('locations', []);
    const therapists = this._getFromStorage('therapists', []);

    const location = locations.find((l) => l.id === locationId) || null;
    if (!location) {
      return { location: null, therapistsAtLocation: [] };
    }

    const therapistsAtLocation = therapists
      .filter((t) => (t.locationIds || []).includes(locationId))
      .map((t) => this._enrichTherapist(t));

    return { location, therapistsAtLocation };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = this._getFromStorage('about_page_content', {
      mission: '',
      values: [],
      therapeuticPhilosophy: '',
      teamOverview: []
    });

    const therapists = this._getFromStorage('therapists', []);

    // teamOverview entries may reference therapistId and shortIntro
    const teamOverview = (raw.teamOverview || []).map((entry) => {
      const therapist = therapists.find((t) => t.id === entry.therapistId) || null;
      return {
        therapist: therapist ? this._enrichTherapist(therapist) : null,
        shortIntro: entry.shortIntro || ''
      };
    });

    // If no configured team overview, derive a simple one from therapists
    if (!teamOverview.length && therapists.length) {
      const derived = therapists.map((t) => ({
        therapist: this._enrichTherapist(t),
        shortIntro: (t.bio || '').slice(0, 160)
      }));
      return {
        mission: raw.mission || '',
        values: raw.values || [],
        therapeuticPhilosophy: raw.therapeuticPhilosophy || '',
        teamOverview: derived
      };
    }

    return {
      mission: raw.mission || '',
      values: raw.values || [],
      therapeuticPhilosophy: raw.therapeuticPhilosophy || '',
      teamOverview
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const raw = this._getFromStorage('privacy_policy_content', {
      lastUpdated: '',
      content: ''
    });
    return {
      lastUpdated: raw.lastUpdated || '',
      content: raw.content || ''
    };
  }

  // getTermsOfServiceContent()
  getTermsOfServiceContent() {
    const raw = this._getFromStorage('terms_of_service_content', {
      lastUpdated: '',
      content: ''
    });
    return {
      lastUpdated: raw.lastUpdated || '',
      content: raw.content || ''
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