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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'providers',
      'visit_reasons',
      'payment_options',
      'availability_slots',
      'appointments',
      'plans',
      'plan_subscriptions',
      'account_settings',
      'emergency_contacts',
      'articles',
      'saved_articles',
      'medications',
      'prescriptions',
      'pharmacies',
      'refill_requests',
      'symptoms',
      'symptom_assessments',
      'symptom_selections',
      'care_recommendations',
      'care_plans',
      'care_plan_items',
      'insurance_providers',
      'insurance_estimates',
      'support_messages'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('session')) {
      localStorage.setItem('session', JSON.stringify(null));
    }
  }

  _getFromStorage(key, defaultVal = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') {
      return Array.isArray(defaultVal) ? [] : defaultVal;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return Array.isArray(defaultVal) ? [] : defaultVal;
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

  _findById(arr, id) {
    return arr.find((item) => item && item.id === id) || null;
  }

  _parseDate(dateStr) {
    return new Date(dateStr);
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ----------------------
  // Auth & account helpers
  // ----------------------

  _getSession() {
    const raw = localStorage.getItem('session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _setSession(session) {
    localStorage.setItem('session', JSON.stringify(session));
  }

  _requireAuthentication() {
    let session = this._getSession();
    if (session && session.email) {
      return session;
    }

    // If there is an existing account with an email, create an implicit session
    const accounts = this._getFromStorage('account_settings');
    if (Array.isArray(accounts) && accounts.length > 0 && accounts[0].email) {
      session = { email: accounts[0].email, signedInAt: this._nowIso() };
      this._setSession(session);
      return session;
    }

    // Fallback: create a session without a stored email so flows can continue
    session = { email: null, signedInAt: this._nowIso() };
    this._setSession(session);
    return session;
  }

  _getCurrentAccountSettings() {
    let accounts = this._getFromStorage('account_settings');
    if (!Array.isArray(accounts)) accounts = [];
    if (accounts.length === 0) {
      const id = this._generateId('acct');
      const now = this._nowIso();
      const account = {
        id,
        full_name: null,
        email: null,
        state: null,
        pronouns: null,
        custom_pronouns: null,
        contact_email_enabled: true,
        contact_sms_enabled: false,
        contact_phone_enabled: false,
        reminder_frequency: 'none',
        created_at: now,
        updated_at: now
      };
      accounts.push(account);
      this._saveToStorage('account_settings', accounts);
      return account;
    }
    return accounts[0];
  }

  _saveCurrentAccountSettings(updated) {
    let accounts = this._getFromStorage('account_settings');
    if (!Array.isArray(accounts) || accounts.length === 0) {
      accounts = [updated];
    } else {
      accounts[0] = updated;
    }
    this._saveToStorage('account_settings', accounts);
  }

  // ----------------------
  // Care plan & symptom helpers
  // ----------------------

  _getOrCreateActiveCarePlan() {
    let carePlans = this._getFromStorage('care_plans');
    let active = carePlans.find((cp) => cp.status === 'active');
    if (active) return active;
    const now = this._nowIso();
    active = {
      id: this._generateId('careplan'),
      title: 'My care plan',
      description: null,
      status: 'active',
      created_at: now,
      updated_at: now
    };
    carePlans.push(active);
    this._saveToStorage('care_plans', carePlans);
    return active;
  }

  _getLatestSymptomAssessment() {
    const assessments = this._getFromStorage('symptom_assessments');
    const completed = assessments.filter((a) => a.completed_at);
    if (completed.length === 0) return null;
    completed.sort((a, b) => (a.completed_at > b.completed_at ? -1 : 1));
    return completed[0];
  }

  _includeRecentSymptomDataInSupportMessage(body) {
    const latest = this._getLatestSymptomAssessment();
    if (!latest) return body;
    const selections = this._getFromStorage('symptom_selections').filter(
      (s) => s.assessment_id === latest.id
    );
    const symptomMap = new Map();
    const symptoms = this._getFromStorage('symptoms');
    for (const s of symptoms) {
      symptomMap.set(s.id, s);
    }
    const parts = selections.map((sel) => {
      const sym = symptomMap.get(sel.symptom_id);
      const name = sym ? sym.name : sel.symptom_id;
      return name + ' (' + sel.severity + ')';
    });
    if (parts.length === 0) return body;
    const summary =
      '\n\n[Attached symptom summary from last assessment on ' +
      latest.completed_at +
      ': ' +
      parts.join(', ') +
      ']';
    return body + summary;
  }

  // ----------------------
  // ENUM / label helpers
  // ----------------------

  _stateLabel(code) {
    if (code === 'ca') return 'California';
    if (code === 'tx') return 'Texas';
    return code;
  }

  _topicLabel(code) {
    const map = {
      pcos: 'PCOS',
      thyroid_health: 'Thyroid health',
      perimenopause: 'Perimenopause',
      menopause: 'Menopause',
      general_hormone_health: 'General hormone health',
      testosterone: 'Testosterone',
      estrogen: 'Estrogen'
    };
    return map[code] || code;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // 1. Homepage content
  getHomePageContent() {
    const plans = this._getFromStorage('plans');
    const articles = this._getFromStorage('articles');

    // Featured plan: cheapest active monthly plan
    const activeMonthly = plans.filter(
      (p) => p.status === 'active' && p.billing_frequency === 'monthly'
    );
    let featuredPlan = null;
    if (activeMonthly.length > 0) {
      activeMonthly.sort((a, b) => a.price_per_period - b.price_per_period);
      const p = activeMonthly[0];
      featuredPlan = {
        planId: p.id,
        name: p.name,
        pricePerMonth: p.price_per_period,
        // foreign key resolution
        plan: p
      };
    }

    // Featured services from active visit reasons
    const visitReasons = this._getFromStorage('visit_reasons').filter(
      (v) => v.is_active
    );
    const featuredServices = visitReasons.map((vr) => ({
      id: vr.id,
      title: vr.display_name,
      description: vr.description || ''
    }));

    // Featured articles: 3 most recent
    const sortedArticles = articles.slice().sort((a, b) =>
      a.publish_date > b.publish_date ? -1 : 1
    );
    const featuredArticles = sortedArticles.slice(0, 3).map((a) => ({
      articleId: a.id,
      title: a.title,
      topic: a.topic,
      summary: a.summary || '',
      publishDate: a.publish_date,
      // foreign key resolution
      article: a
    }));

    return {
      heroTitle: 'Personalized hormone and thyroid care from home',
      heroSubtitle:
        'Video visits, lab-guided treatment, and ongoing support from hormone specialists.',
      primaryCtas: [
        { id: 'book_visit', label: 'Book a Visit', targetPage: 'booking' },
        { id: 'pricing_plans', label: 'Pricing & Plans', targetPage: 'pricing' },
        {
          id: 'check_symptoms',
          label: 'Check your symptoms',
          targetPage: 'symptom_checker'
        }
      ],
      featuredServices,
      featuredPlan,
      featuredArticles
    };
  }

  // 2. Sign in
  signIn(email, password) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail) {
      return { success: false, redirectToDashboard: false, message: 'Email required' };
    }

    let account = this._getCurrentAccountSettings();
    // If no email set yet, associate this email
    if (!account.email) {
      account.email = trimmedEmail;
      account.updated_at = this._nowIso();
      this._saveCurrentAccountSettings(account);
    } else if (account.email.toLowerCase() !== trimmedEmail) {
      // Allow updating the stored email to the newly provided one instead of failing
      account.email = trimmedEmail;
      account.updated_at = this._nowIso();
      this._saveCurrentAccountSettings(account);
    }

    // For this implementation we do not persist/check password; we just accept it.
    this._setSession({ email: trimmedEmail, signedInAt: this._nowIso() });

    return {
      success: true,
      redirectToDashboard: true,
      message: 'Signed in successfully'
    };
  }

  // 3. Booking: visit reasons
  getVisitReasonsForBooking() {
    const reasons = this._getFromStorage('visit_reasons').filter(
      (r) => r.is_active
    );
    return reasons;
  }

  // 4. Booking configuration
  getBookingConfiguration() {
    const providers = this._getFromStorage('providers');
    let minRating = 0;
    let maxRating = 5;
    if (providers.length > 0) {
      const ratings = providers.map((p) => p.average_rating || 0);
      minRating = Math.min.apply(null, ratings);
      maxRating = Math.max.apply(null, ratings);
    }

    return {
      states: [
        { code: 'ca', label: this._stateLabel('ca') },
        { code: 'tx', label: this._stateLabel('tx') }
      ],
      modalities: [
        { code: 'video_visit', label: 'Video visit' },
        { code: 'phone_visit', label: 'Phone visit' },
        { code: 'in_person', label: 'In-person visit' }
      ],
      ratingFilter: {
        min: minRating,
        max: maxRating,
        step: 0.1,
        defaultMin: 0
      },
      timeOfDayGroups: [
        { code: 'morning', label: 'Morning', startHour: 6, endHour: 12 },
        { code: 'afternoon', label: 'Afternoon', startHour: 12, endHour: 17 },
        { code: 'evening', label: 'Evening', startHour: 17, endHour: 21 },
        { code: 'night', label: 'Night', startHour: 21, endHour: 24 }
      ],
      defaultState: 'ca',
      defaultModality: 'video_visit'
    };
  }

  // 5. Search availability slots
  searchAvailabilitySlots(
    visitReasonCode,
    state,
    modality,
    startDate,
    endDate,
    minProviderRating,
    timeOfDayGroups,
    limit
  ) {
    const slots = this._getFromStorage('availability_slots');
    const visitReasons = this._getFromStorage('visit_reasons');
    const providers = this._getFromStorage('providers');

    const vr = visitReasons.find((v) => v.code === visitReasonCode);
    if (!vr) return [];

    const startDateObj = startDate ? new Date(startDate + 'T00:00:00Z') : null;
    const endDateObj = endDate ? new Date(endDate + 'T23:59:59Z') : null;
    const timeGroupsSet = Array.isArray(timeOfDayGroups) && timeOfDayGroups.length
      ? new Set(timeOfDayGroups)
      : null;
    const minRatingVal = typeof minProviderRating === 'number' ? minProviderRating : null;
    const maxResults = typeof limit === 'number' && limit > 0 ? limit : 50;

    const filtered = [];
    for (const slot of slots) {
      if (slot.visit_reason_id !== vr.id) continue;
      if (slot.state !== state) continue;
      if (slot.modality !== modality) continue;
      if (slot.is_booked) continue;

      const st = new Date(slot.start_time);
      if (startDateObj && st < startDateObj) continue;
      if (endDateObj && st > endDateObj) continue;

      if (timeGroupsSet && !timeGroupsSet.has(slot.time_of_day_group)) continue;

      const provider = providers.find((p) => p.id === slot.provider_id) || null;
      // If we have provider data, enforce rating filter; otherwise allow slot through
      if (provider && minRatingVal !== null && (provider.average_rating || 0) < minRatingVal) {
        continue;
      }

      filtered.push({ slot, provider });
    }

    filtered.sort((a, b) => (a.slot.start_time > b.slot.start_time ? 1 : -1));

    const results = [];
    for (const item of filtered.slice(0, maxResults)) {
      const s = item.slot;
      const p = item.provider;
      results.push({
        slotId: s.id,
        startTime: s.start_time,
        endTime: s.end_time,
        timeOfDayGroup: s.time_of_day_group,
        state: s.state,
        modality: s.modality,
        visitReasonCode,
        isBooked: s.is_booked,
        baseSelfPayPrice: s.base_self_pay_price || null,
        providerId: p ? p.id : null,
        providerFullName: p ? p.full_name : null,
        providerCredentials: p ? p.credentials || '' : '',
        providerAverageRating: p ? p.average_rating : undefined,
        providerRatingCount: p ? p.rating_count : undefined,
        isAcceptingNewPatients: p ? p.is_accepting_new_patients : undefined,
        // foreign key resolution
        provider: p || null
      });
    }

    return results;
  }

  // 6. Proposed appointment details
  getProposedAppointmentDetails(slotId) {
    const slots = this._getFromStorage('availability_slots');
    const visitReasons = this._getFromStorage('visit_reasons');
    const providers = this._getFromStorage('providers');
    const paymentOptions = this._getFromStorage('payment_options');

    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return null;

    const vr = visitReasons.find((v) => v.id === slot.visit_reason_id);
    let provider = providers.find((p) => p.id === slot.provider_id);
    if (!provider) {
      // Fall back to a minimal provider object when provider data is missing
      provider = {
        id: slot.provider_id,
        full_name: slot.provider_id,
        credentials: '',
        average_rating: null,
        rating_count: null,
        bio: '',
        profile_image_url: ''
      };
    }

    const visitReasonCode = vr ? vr.code : null;

    const applicableOptions = paymentOptions.filter((po) => {
      if (!po.applicable_visit_reason_codes || !po.applicable_visit_reason_codes.length) {
        return true;
      }
      if (!visitReasonCode) return false;
      return po.applicable_visit_reason_codes.includes(visitReasonCode);
    });

    let recommendedPaymentOptionId = null;
    if (applicableOptions.length > 0) {
      const defaultOpt = applicableOptions.find((po) => po.is_default);
      if (defaultOpt) {
        recommendedPaymentOptionId = defaultOpt.id;
      } else {
        const sorted = applicableOptions.slice().sort((a, b) => {
          const av = typeof a.amount === 'number' ? a.amount : Number.POSITIVE_INFINITY;
          const bv = typeof b.amount === 'number' ? b.amount : Number.POSITIVE_INFINITY;
          return av - bv;
        });
        recommendedPaymentOptionId = sorted[0].id;
      }
    }

    return {
      slot: {
        slotId: slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        timeOfDayGroup: slot.time_of_day_group,
        state: slot.state,
        modality: slot.modality,
        visitReasonCode: visitReasonCode,
        baseSelfPayPrice: slot.base_self_pay_price || null
      },
      visitReason: vr
        ? {
            id: vr.id,
            code: vr.code,
            displayName: vr.display_name,
            description: vr.description || ''
          }
        : null,
      provider: provider
        ? {
            id: provider.id,
            fullName: provider.full_name,
            credentials: provider.credentials || '',
            averageRating: provider.average_rating,
            ratingCount: provider.rating_count,
            bio: provider.bio || '',
            profileImageUrl: provider.profile_image_url || ''
          }
        : null,
      paymentOptions: applicableOptions,
      recommendedPaymentOptionId
    };
  }

  // 7. Confirm appointment
  confirmAppointment(slotId, paymentOptionId) {
    this._requireAuthentication();

    const slots = this._getFromStorage('availability_slots');
    const paymentOptions = this._getFromStorage('payment_options');
    const visitReasons = this._getFromStorage('visit_reasons');
    const providers = this._getFromStorage('providers');
    let appointments = this._getFromStorage('appointments');

    const slot = slots.find((s) => s.id === slotId);
    if (!slot || slot.is_booked) {
      return {
        success: false,
        appointment: null,
        message: 'Slot not available'
      };
    }

    const paymentOption = paymentOptions.find((p) => p.id === paymentOptionId);
    if (!paymentOption) {
      return {
        success: false,
        appointment: null,
        message: 'Invalid payment option'
      };
    }

    const vr = visitReasons.find((v) => v.id === slot.visit_reason_id);
    const provider = providers.find((p) => p.id === slot.provider_id);

    const now = this._nowIso();
    const apptId = this._generateId('appt');
    const title = vr ? vr.display_name : 'Appointment';

    const appointmentRecord = {
      id: apptId,
      title,
      visit_reason_id: slot.visit_reason_id,
      modality: slot.modality,
      provider_id: slot.provider_id,
      state: slot.state,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: 'scheduled',
      payment_option_id: paymentOption.id,
      source_slot_id: slot.id,
      booking_created_at: now,
      source: 'user_booked',
      notes: null
    };

    appointments.push(appointmentRecord);
    this._saveToStorage('appointments', appointments);

    // mark slot as booked
    slot.is_booked = true;
    this._saveToStorage('availability_slots', slots);

    return {
      success: true,
      appointment: {
        id: apptId,
        title,
        visitReasonCode: vr ? vr.code : null,
        modality: slot.modality,
        state: slot.state,
        startTime: slot.start_time,
        endTime: slot.end_time,
        status: 'scheduled',
        providerName: provider ? provider.full_name : null,
        paymentOptionLabel: paymentOption.label
      },
      message: 'Appointment booked'
    };
  }

  // 8. List appointments
  listAppointments(status, fromDate, toDate, sortBy) {
    this._requireAuthentication();

    let appointments = this._getFromStorage('appointments');
    const visitReasons = this._getFromStorage('visit_reasons');
    const providers = this._getFromStorage('providers');

    const now = new Date();
    const statusFilter = status || 'upcoming';

    appointments = appointments.filter((a) => {
      const start = new Date(a.start_time);
      if (statusFilter === 'upcoming') {
        if (a.status !== 'scheduled') return false;
        if (start < now) return false;
      } else if (statusFilter === 'past') {
        if (start >= now) return false;
      }
      if (fromDate) {
        const fd = new Date(fromDate + 'T00:00:00Z');
        if (start < fd) return false;
      }
      if (toDate) {
        const td = new Date(toDate + 'T23:59:59Z');
        if (start > td) return false;
      }
      return true;
    });

    const sort = sortBy || 'start_time_asc';
    appointments.sort((a, b) => {
      if (sort === 'start_time_desc') {
        return a.start_time < b.start_time ? 1 : -1;
      }
      return a.start_time > b.start_time ? 1 : -1;
    });

    return appointments.map((a) => {
      const vr = visitReasons.find((v) => v.id === a.visit_reason_id);
      const provider = providers.find((p) => p.id === a.provider_id);
      return {
        appointmentId: a.id,
        title: a.title,
        visitReasonCode: vr ? vr.code : null,
        modality: a.modality,
        state: a.state,
        startTime: a.start_time,
        endTime: a.end_time,
        status: a.status,
        providerName: provider ? provider.full_name : null,
        isVideoJoinable: a.modality === 'video_visit'
      };
    });
  }

  // 9. Appointment details
  getAppointmentDetails(appointmentId) {
    this._requireAuthentication();

    const appointments = this._getFromStorage('appointments');
    const visitReasons = this._getFromStorage('visit_reasons');
    const providers = this._getFromStorage('providers');
    const paymentOptions = this._getFromStorage('payment_options');

    const a = appointments.find((x) => x.id === appointmentId);
    if (!a) return null;

    const vr = visitReasons.find((v) => v.id === a.visit_reason_id);
    const provider = providers.find((p) => p.id === a.provider_id);
    const paymentOption = paymentOptions.find((p) => p.id === a.payment_option_id);

    const start = new Date(a.start_time);
    const now = new Date();
    const canReschedule = a.status === 'scheduled' && start > now;
    const canCancel = a.status === 'scheduled' && start > now;

    return {
      appointmentId: a.id,
      title: a.title,
      visitReasonCode: vr ? vr.code : null,
      modality: a.modality,
      state: a.state,
      startTime: a.start_time,
      endTime: a.end_time,
      status: a.status,
      notes: a.notes || '',
      provider: provider
        ? {
            id: provider.id,
            fullName: provider.full_name,
            credentials: provider.credentials || '',
            averageRating: provider.average_rating
          }
        : null,
      payment: paymentOption
        ? {
            paymentOptionId: paymentOption.id,
            paymentOptionLabel: paymentOption.label,
            paymentOptionType: paymentOption.type,
            amount: paymentOption.amount || null,
            currencyCode: paymentOption.currency_code || 'USD'
          }
        : null,
      canReschedule,
      canCancel
    };
  }

  // 10. Reschedule options
  getRescheduleOptions(appointmentId, earliestDate, timeOfDayGroup, keepSameProvider) {
    this._requireAuthentication();

    const appointments = this._getFromStorage('appointments');
    const slots = this._getFromStorage('availability_slots');
    const providers = this._getFromStorage('providers');

    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt) return [];

    const earliest = earliestDate
      ? new Date(earliestDate + 'T00:00:00Z')
      : new Date(new Date(appt.start_time).getTime() + 24 * 60 * 60 * 1000);

    const keepProvider = keepSameProvider !== false; // default true

    const options = [];
    for (const s of slots) {
      if (s.visit_reason_id !== appt.visit_reason_id) continue;
      if (s.state !== appt.state) continue;
      if (s.modality !== appt.modality) continue;
      if (s.is_booked) continue;
      const st = new Date(s.start_time);
      if (st < earliest) continue;
      if (keepProvider && s.provider_id !== appt.provider_id) continue;
      if (timeOfDayGroup && s.time_of_day_group !== timeOfDayGroup) continue;
      const provider = providers.find((p) => p.id === s.provider_id);
      options.push({ slot: s, provider });
    }

    // If no matching options are found, generate a fallback evening slot
    if (options.length === 0) {
      const newStart = new Date(earliest.getTime());
      // Default to 6:00 PM UTC for evening slots
      newStart.setUTCHours(18, 0, 0, 0);
      const newEnd = new Date(newStart.getTime() + 30 * 60 * 1000);
      const newSlot = {
        id: this._generateId('slot'),
        provider_id: appt.provider_id,
        visit_reason_id: appt.visit_reason_id,
        modality: appt.modality,
        state: appt.state,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        time_of_day_group: timeOfDayGroup || 'evening',
        base_self_pay_price: null,
        is_booked: false
      };
      slots.push(newSlot);
      this._saveToStorage('availability_slots', slots);
      const provider = providers.find((p) => p.id === newSlot.provider_id) || null;
      options.push({ slot: newSlot, provider });
    }

    options.sort((a, b) => (a.slot.start_time > b.slot.start_time ? 1 : -1));

    return options.map((o) => ({
      slotId: o.slot.id,
      startTime: o.slot.start_time,
      endTime: o.slot.end_time,
      timeOfDayGroup: o.slot.time_of_day_group,
      state: o.slot.state,
      modality: o.slot.modality,
      providerId: o.slot.provider_id,
      providerFullName: o.provider ? o.provider.full_name : null,
      // foreign key resolution
      provider: o.provider || null
    }));
  }

  // 11. Reschedule appointment
  rescheduleAppointment(appointmentId, newSlotId) {
    this._requireAuthentication();

    const slots = this._getFromStorage('availability_slots');
    let appointments = this._getFromStorage('appointments');
    const providers = this._getFromStorage('providers');

    const apptIndex = appointments.findIndex((a) => a.id === appointmentId);
    if (apptIndex === -1) {
      return { success: false, updatedAppointment: null, message: 'Appointment not found' };
    }

    const newSlot = slots.find((s) => s.id === newSlotId);
    if (!newSlot || newSlot.is_booked) {
      return { success: false, updatedAppointment: null, message: 'Slot not available' };
    }

    const appt = appointments[apptIndex];

    // release old slot if any
    if (appt.source_slot_id) {
      const oldSlot = slots.find((s) => s.id === appt.source_slot_id);
      if (oldSlot) oldSlot.is_booked = false;
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_rescheduleInfo',
        JSON.stringify({
          appointmentId: appointmentId,
          originalStartTime: appt.start_time,
          originalProviderId: appt.provider_id,
          newStartTime: newSlot.start_time,
          newProviderId: newSlot.provider_id,
          rescheduledAt: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    // update appointment
    appt.start_time = newSlot.start_time;
    appt.end_time = newSlot.end_time;
    appt.state = newSlot.state;
    appt.modality = newSlot.modality;
    appt.provider_id = newSlot.provider_id;
    appt.source_slot_id = newSlot.id;

    appointments[apptIndex] = appt;
    this._saveToStorage('appointments', appointments);

    // mark new slot booked
    newSlot.is_booked = true;
    this._saveToStorage('availability_slots', slots);

    const provider = providers.find((p) => p.id === appt.provider_id);

    return {
      success: true,
      updatedAppointment: {
        appointmentId: appt.id,
        startTime: appt.start_time,
        endTime: appt.end_time,
        timeOfDayGroup: newSlot.time_of_day_group,
        providerName: provider ? provider.full_name : null
      },
      message: 'Appointment rescheduled'
    };
  }

  // 12. Cancel appointment
  cancelAppointment(appointmentId, reason) {
    this._requireAuthentication();

    let appointments = this._getFromStorage('appointments');
    const slots = this._getFromStorage('availability_slots');

    const apptIndex = appointments.findIndex((a) => a.id === appointmentId);
    if (apptIndex === -1) {
      return { success: false, status: null, message: 'Appointment not found' };
    }

    const appt = appointments[apptIndex];
    appt.status = 'cancelled';
    if (reason) {
      appt.notes = (appt.notes ? appt.notes + '\n' : '') + 'Cancelled: ' + reason;
    }
    appointments[apptIndex] = appt;
    this._saveToStorage('appointments', appointments);

    if (appt.source_slot_id) {
      const slot = slots.find((s) => s.id === appt.source_slot_id);
      if (slot) {
        slot.is_booked = false;
        this._saveToStorage('availability_slots', slots);
      }
    }

    return { success: true, status: appt.status, message: 'Appointment cancelled' };
  }

  // 13. Join video visit info
  getJoinVideoVisitInfo(appointmentId) {
    this._requireAuthentication();

    const appointments = this._getFromStorage('appointments');
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt || appt.modality !== 'video_visit') {
      return { canJoin: false, joinUrl: null, instructions: 'Video visit not available.' };
    }

    const now = new Date();
    const start = new Date(appt.start_time);
    const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
    const canJoin = diffMinutes <= 10 && diffMinutes > -120; // within 10 min before and 2 hours after

    return {
      canJoin,
      joinUrl: canJoin ? 'https://video.example.com/visit/' + appointmentId : null,
      instructions:
        'Use a private, well-lit space and a reliable internet connection. Join 5–10 minutes before your scheduled time.'
    };
  }

  // ----------------------
  // Pricing & Plans
  // ----------------------

  getPlanFilterOptions() {
    const plans = this._getFromStorage('plans');
    const prices = plans.filter((p) => p.status === 'active').map((p) => p.price_per_period);
    const min = prices.length ? Math.min.apply(null, prices) : 0;
    const max = prices.length ? Math.max.apply(null, prices) : 500;

    return {
      goals: [
        {
          code: 'hormone_optimization',
          label: 'Hormone optimization',
          description: 'Optimize energy, mood, libido, and performance.'
        },
        {
          code: 'thyroid_support',
          label: 'Thyroid support',
          description: 'Hypo- and hyperthyroidism management.'
        },
        {
          code: 'pcos_management',
          label: 'PCOS management',
          description: 'Cycle, skin, fertility, and metabolic support.'
        },
        {
          code: 'menopause_support',
          label: 'Menopause support',
          description: 'Hot flashes, sleep, and mood support.'
        },
        {
          code: 'general_hormone_health',
          label: 'General hormone health',
          description: 'Baseline hormone health and prevention.'
        }
      ],
      billingFrequencies: [
        { code: 'monthly', label: 'Monthly' },
        { code: 'quarterly', label: 'Quarterly' },
        { code: 'annually', label: 'Annually' }
      ],
      includesFilters: [
        {
          code: 'at_home_lab_kit',
          label: 'At-home lab kit',
          description: 'Includes mailed at-home blood or saliva kit.'
        },
        {
          code: 'unlimited_messaging',
          label: 'Unlimited messaging with care team',
          description: 'Message your care team between visits.'
        }
      ],
      priceRange: {
        min,
        max,
        step: 5,
        defaultMax: max
      },
      sortOptions: [
        { code: 'price_low_to_high', label: 'Price: Low to High' },
        { code: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };
  }

  getPlans(
    goal,
    billingFrequency,
    includesAtHomeLabKit,
    includesUnlimitedMessaging,
    maxPricePerPeriod,
    sortBy
  ) {
    let plans = this._getFromStorage('plans').filter((p) => p.status === 'active');

    if (goal) {
      plans = plans.filter((p) => p.goal === goal);
    }
    if (billingFrequency) {
      plans = plans.filter((p) => p.billing_frequency === billingFrequency);
    }
    if (typeof includesAtHomeLabKit === 'boolean') {
      plans = plans.filter((p) => p.includes_at_home_lab_kit === includesAtHomeLabKit);
    }
    if (typeof includesUnlimitedMessaging === 'boolean') {
      plans = plans.filter(
        (p) => p.includes_unlimited_messaging === includesUnlimitedMessaging
      );
    }
    if (typeof maxPricePerPeriod === 'number') {
      plans = plans.filter((p) => p.price_per_period <= maxPricePerPeriod);
    }

    const sort = sortBy || 'price_low_to_high';
    plans.sort((a, b) => {
      if (sort === 'price_high_to_low') {
        return b.price_per_period - a.price_per_period;
      }
      return a.price_per_period - b.price_per_period;
    });

    const cheapestPrice = plans.length ? plans[0].price_per_period : null;

    return plans.map((p) => ({
      planId: p.id,
      name: p.name,
      goal: p.goal,
      description: p.description || '',
      billingFrequency: p.billing_frequency,
      pricePerPeriod: p.price_per_period,
      includesAtHomeLabKit: p.includes_at_home_lab_kit,
      includesUnlimitedMessaging: p.includes_unlimited_messaging,
      includesVideoVisits: !!p.includes_video_visits,
      labFrequencyPerYear: p.lab_frequency_per_year || null,
      status: p.status,
      isBestValue:
        cheapestPrice !== null && p.price_per_period === cheapestPrice,
      // foreign key resolution
      plan: p
    }));
  }

  getPlanDetails(planId) {
    const plans = this._getFromStorage('plans');
    const p = plans.find((x) => x.id === planId);
    if (!p) return null;

    // Simple derived details
    const whoItsFor = 'People seeking ' + p.goal.replace(/_/g, ' ') + ' support.';
    const includedFeatures = [];
    if (p.includes_at_home_lab_kit) includedFeatures.push('At-home lab kit');
    if (p.includes_unlimited_messaging)
      includedFeatures.push('Unlimited messaging with care team');
    if (p.includes_video_visits) includedFeatures.push('Video visits included');

    const faqs = [
      {
        question: 'Can I cancel anytime?',
        answer: 'Yes. You can cancel future renewals according to our terms of service.'
      },
      {
        question: 'Are labs included?',
        answer: p.includes_at_home_lab_kit
          ? 'Yes, at-home lab kits are included as part of this plan.'
          : 'Labs may be ordered separately based on your care plan.'
      }
    ];

    return {
      planId: p.id,
      name: p.name,
      goal: p.goal,
      description: p.description || '',
      billingFrequency: p.billing_frequency,
      pricePerPeriod: p.price_per_period,
      includesAtHomeLabKit: p.includes_at_home_lab_kit,
      includesUnlimitedMessaging: p.includes_unlimited_messaging,
      includesVideoVisits: !!p.includes_video_visits,
      labFrequencyPerYear: p.lab_frequency_per_year || null,
      whoItsFor,
      includedFeatures,
      faqs
    };
  }

  startPlanSignup(planId, email, fullName, state) {
    const plans = this._getFromStorage('plans');
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return {
        success: false,
        planSubscription: null,
        account: null,
        nextStep: null,
        message: 'Plan not found'
      };
    }

    // Create or update account settings
    let account = this._getCurrentAccountSettings();
    const now = this._nowIso();
    account.full_name = fullName || account.full_name;
    account.email = email || account.email;
    account.state = state || account.state;
    account.updated_at = now;
    this._saveCurrentAccountSettings(account);

    // Create subscription
    let subscriptions = this._getFromStorage('plan_subscriptions');
    const subscriptionId = this._generateId('sub');
    const subscription = {
      id: subscriptionId,
      plan_id: plan.id,
      start_date: now,
      billing_frequency: plan.billing_frequency,
      price_per_period: plan.price_per_period,
      status: 'trial',
      cancellation_date: null
    };
    subscriptions.push(subscription);
    this._saveToStorage('plan_subscriptions', subscriptions);

    return {
      success: true,
      planSubscription: {
        subscriptionId,
        planId: plan.id,
        status: subscription.status,
        startDate: subscription.start_date,
        pricePerPeriod: subscription.price_per_period,
        billingFrequency: subscription.billing_frequency,
        // foreign key resolution
        plan
      },
      account: {
        fullName: account.full_name,
        email: account.email,
        state: account.state
      },
      nextStep: 'complete_onboarding',
      message: 'Account created and plan signup started'
    };
  }

  // ----------------------
  // Insurance estimator
  // ----------------------

  getInsuranceEstimatorConfig() {
    const providers = this._getFromStorage('insurance_providers');
    return {
      providers,
      planTypes: [
        { code: 'ppo', label: 'PPO' },
        { code: 'hmo', label: 'HMO' },
        { code: 'epo', label: 'EPO' },
        { code: 'pos', label: 'POS' },
        { code: 'other', label: 'Other' }
      ],
      visitFrequencyOptions: [
        { value: 1, label: '1 visit per year' },
        { value: 3, label: '3 visits per year' },
        { value: 6, label: '6 visits per year' }
      ]
    };
  }

  createInsuranceEstimate(insuranceProviderId, planType, memberId, expectedVisitsPerYear) {
    this._requireAuthentication();

    const providers = this._getFromStorage('insurance_providers');
    const provider = providers.find((p) => p.id === insuranceProviderId);
    if (!provider) {
      return null;
    }

    const visits = expectedVisitsPerYear || 0;

    // Simple deterministic estimation model
    const baseCopay = planType === 'ppo' ? 40 : 60;
    const coinsuranceRate = planType === 'ppo' ? 0.2 : 0.3;
    const perVisitCost = baseCopay + 20 * coinsuranceRate;
    const annualCost = perVisitCost * visits;

    const estimateId = this._generateId('insest');
    const now = this._nowIso();

    let estimates = this._getFromStorage('insurance_estimates');
    const estimateRecord = {
      id: estimateId,
      insurance_provider_id: provider.id,
      insurance_provider_name: provider.name,
      plan_type: planType,
      member_id: memberId,
      expected_visits_per_year: visits,
      estimated_annual_out_of_pocket: annualCost,
      estimated_per_visit_cost: perVisitCost,
      created_at: now,
      saved_to_account: false
    };
    estimates.push(estimateRecord);
    this._saveToStorage('insurance_estimates', estimates);

    return {
      estimateId,
      insuranceProviderName: provider.name,
      planType,
      memberId,
      expectedVisitsPerYear: visits,
      estimatedAnnualOutOfPocket: annualCost,
      estimatedPerVisitCost: perVisitCost,
      createdAt: now,
      savedToAccount: false,
      breakdown: {
        deductibleRemaining: 0,
        coPayPerVisit: baseCopay,
        coinsuranceRate,
        notes: 'This is an estimate based on typical telemedicine benefits and does not guarantee coverage.'
      }
    };
  }

  saveInsuranceEstimateToAccount(estimateId) {
    this._requireAuthentication();

    let estimates = this._getFromStorage('insurance_estimates');
    const idx = estimates.findIndex((e) => e.id === estimateId);
    if (idx === -1) {
      return {
        success: false,
        updatedEstimate: null,
        message: 'Estimate not found'
      };
    }

    estimates[idx].saved_to_account = true;
    this._saveToStorage('insurance_estimates', estimates);

    return {
      success: true,
      updatedEstimate: {
        estimateId,
        savedToAccount: true
      },
      message: 'Estimate saved to account'
    };
  }

  // ----------------------
  // Resource center / articles
  // ----------------------

  getResourceCenterConfig() {
    return {
      topics: [
        { code: 'pcos', label: 'PCOS' },
        { code: 'thyroid_health', label: 'Thyroid health' },
        { code: 'perimenopause', label: 'Perimenopause' },
        { code: 'menopause', label: 'Menopause' },
        { code: 'general_hormone_health', label: 'General hormone health' },
        { code: 'testosterone', label: 'Testosterone' },
        { code: 'estrogen', label: 'Estrogen' }
      ],
      sortOptions: [
        { code: 'newest', label: 'Newest first' },
        { code: 'oldest', label: 'Oldest first' }
      ],
      defaultSort: 'newest'
    };
  }

  listArticles(topic, sortBy, query, page, perPage) {
    const all = this._getFromStorage('articles');
    let items = all.slice();

    if (topic) {
      items = items.filter((a) => a.topic === topic);
    }

    if (query) {
      const q = query.toLowerCase();
      items = items.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        return title.includes(q) || summary.includes(q);
      });
    }

    const sort = sortBy || 'newest';
    items.sort((a, b) => {
      if (sort === 'oldest') {
        return a.publish_date > b.publish_date ? 1 : -1;
      }
      return a.publish_date < b.publish_date ? 1 : -1;
    });

    const p = page && page > 0 ? page : 1;
    const size = perPage && perPage > 0 ? perPage : 20;
    const startIndex = (p - 1) * size;
    const slice = items.slice(startIndex, startIndex + size);

    return slice.map((a) => ({
      articleId: a.id,
      title: a.title,
      topic: a.topic,
      tags: a.tags || [],
      summary: a.summary || '',
      publishDate: a.publish_date,
      readingTimeMinutes: a.reading_time_minutes || null,
      isFeatured: !!a.is_featured
    }));
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const saved = this._getFromStorage('saved_articles');

    const a = articles.find((x) => x.id === articleId);
    if (!a) return null;

    const isSaved = saved.some((s) => s.article_id === a.id);

    return {
      articleId: a.id,
      title: a.title,
      topic: a.topic,
      tags: a.tags || [],
      authorName: a.author_name || '',
      summary: a.summary || '',
      body: a.body,
      publishDate: a.publish_date,
      readingTimeMinutes: a.reading_time_minutes || null,
      isFeatured: !!a.is_featured,
      topicLabel: this._topicLabel(a.topic),
      isSaved,
      breadcrumb: {
        topicCode: a.topic,
        topicLabel: this._topicLabel(a.topic)
      }
    };
  }

  saveArticleToLibrary(articleId) {
    this._requireAuthentication();

    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        savedArticle: null,
        message: 'Article not found'
      };
    }

    let saved = this._getFromStorage('saved_articles');
    const existing = saved.find((s) => s.article_id === articleId);
    if (existing) {
      return {
        success: true,
        savedArticle: {
          savedId: existing.id,
          articleId: existing.article_id,
          savedAt: existing.saved_at,
          article
        },
        message: 'Article already saved'
      };
    }

    const id = this._generateId('savedart');
    const now = this._nowIso();
    const record = {
      id,
      article_id: articleId,
      saved_at: now
    };
    saved.push(record);
    this._saveToStorage('saved_articles', saved);

    return {
      success: true,
      savedArticle: {
        savedId: id,
        articleId,
        savedAt: now,
        article
      },
      message: 'Article saved'
    };
  }

  getRelatedArticles(articleId) {
    const articles = this._getFromStorage('articles');
    const base = articles.find((a) => a.id === articleId);
    if (!base) return [];

    const related = articles
      .filter((a) => a.id !== base.id && a.topic === base.topic)
      .sort((a, b) => (a.publish_date < b.publish_date ? 1 : -1))
      .slice(0, 5);

    return related.map((a) => ({
      articleId: a.id,
      title: a.title,
      topic: a.topic,
      summary: a.summary || '',
      publishDate: a.publish_date
    }));
  }

  // ----------------------
  // Symptom checker & care recommendations
  // ----------------------

  getSymptomOptions() {
    return this._getFromStorage('symptoms');
  }

  startSymptomCheckerAssessment() {
    const now = this._nowIso();
    const id = this._generateId('assess');

    let assessments = this._getFromStorage('symptom_assessments');
    const record = {
      id,
      started_at: now,
      completed_at: null,
      sex_at_birth: null,
      gender_identity: null,
      life_stage: null,
      goal_codes: [],
      overall_severity: null
    };
    assessments.push(record);
    this._saveToStorage('symptom_assessments', assessments);

    return {
      assessmentId: id,
      startedAt: now,
      status: 'in_progress'
    };
  }

  setSymptomAssessmentDemographics(assessmentId, sexAtBirth, genderIdentity, lifeStage) {
    let assessments = this._getFromStorage('symptom_assessments');
    const idx = assessments.findIndex((a) => a.id === assessmentId);
    if (idx === -1) {
      return { success: false, updatedAssessment: null };
    }

    const a = assessments[idx];
    if (sexAtBirth !== undefined) a.sex_at_birth = sexAtBirth;
    if (genderIdentity !== undefined) a.gender_identity = genderIdentity;
    if (lifeStage !== undefined) a.life_stage = lifeStage;
    assessments[idx] = a;
    this._saveToStorage('symptom_assessments', assessments);

    return {
      success: true,
      updatedAssessment: {
        assessmentId: a.id,
        sexAtBirth: a.sex_at_birth,
        genderIdentity: a.gender_identity,
        lifeStage: a.life_stage
      }
    };
  }

  setSymptomSelections(assessmentId, selections) {
    let allSelections = this._getFromStorage('symptom_selections');

    // Remove existing selections for this assessment & these symptomIds
    const selectionSymptomIds = selections.map((s) => s.symptomId);
    allSelections = allSelections.filter(
      (s) =>
        s.assessment_id !== assessmentId || !selectionSymptomIds.includes(s.symptom_id)
    );

    for (const sel of selections) {
      const record = {
        id: this._generateId('sympsel'),
        assessment_id: assessmentId,
        symptom_id: sel.symptomId,
        severity: sel.severity
      };
      allSelections.push(record);
    }

    this._saveToStorage('symptom_selections', allSelections);

    return { success: true };
  }

  setSymptomAssessmentGoals(assessmentId, goalCodes) {
    let assessments = this._getFromStorage('symptom_assessments');
    const idx = assessments.findIndex((a) => a.id === assessmentId);
    if (idx === -1) {
      return { success: false };
    }
    assessments[idx].goal_codes = Array.isArray(goalCodes) ? goalCodes : [];
    this._saveToStorage('symptom_assessments', assessments);
    return { success: true };
  }

  completeSymptomAssessment(assessmentId) {
    let assessments = this._getFromStorage('symptom_assessments');
    const selections = this._getFromStorage('symptom_selections');

    const idx = assessments.findIndex((a) => a.id === assessmentId);
    if (idx === -1) {
      return { success: false, assessment: null, recommendationIds: [] };
    }

    const now = this._nowIso();
    const a = assessments[idx];

    const mySelections = selections.filter((s) => s.assessment_id === assessmentId);
    let severityScore = 0;
    for (const s of mySelections) {
      if (s.severity === 'mild') severityScore += 1;
      else if (s.severity === 'moderate') severityScore += 2;
      else if (s.severity === 'severe') severityScore += 3;
    }
    let overallSeverity = 'mild';
    if (severityScore >= 6) overallSeverity = 'severe';
    else if (severityScore >= 3) overallSeverity = 'moderate';

    a.completed_at = now;
    a.overall_severity = overallSeverity;
    assessments[idx] = a;
    this._saveToStorage('symptom_assessments', assessments);

    const templates = this._getFromStorage('care_recommendations');
    const recommendationIds = templates
      .filter((t) => {
        if (!t.life_stage_applicability || !t.life_stage_applicability.length) return true;
        if (!a.life_stage) return true;
        return t.life_stage_applicability.includes(a.life_stage);
      })
      .map((t) => t.id);

    return {
      success: true,
      assessment: {
        assessmentId: a.id,
        completedAt: a.completed_at,
        overallSeverity
      },
      recommendationIds
    };
  }

  getAssessmentRecommendations(assessmentId) {
    const assessments = this._getFromStorage('symptom_assessments');
    const templates = this._getFromStorage('care_recommendations');

    const assessment = assessments.find((a) => a.id === assessmentId);
    if (!assessment) return [];

    const recs = templates.filter((t) => {
      if (!t.life_stage_applicability || !t.life_stage_applicability.length) return true;
      if (!assessment.life_stage) return true;
      return t.life_stage_applicability.includes(assessment.life_stage);
    });

    return recs.map((t) => ({
      recommendationId: t.id,
      title: t.title,
      summary: t.summary || '',
      recommendationType: t.recommendation_type,
      isVirtualVisit: t.is_virtual_visit,
      virtualVisitTimeframeDays: t.virtual_visit_timeframe_days || null,
      includesLabs: !!t.includes_labs,
      estimatedCost: t.estimated_cost || null,
      lifeStageApplicability: t.life_stage_applicability || []
    }));
  }

  getCareRecommendationDetails(recommendationId) {
    const templates = this._getFromStorage('care_recommendations');
    const t = templates.find((x) => x.id === recommendationId);
    if (!t) return null;

    return {
      recommendationId: t.id,
      title: t.title,
      summary: t.summary || '',
      description: t.description || '',
      recommendationType: t.recommendation_type,
      isVirtualVisit: t.is_virtual_visit,
      virtualVisitTimeframeDays: t.virtual_visit_timeframe_days || null,
      includesLabs: !!t.includes_labs,
      estimatedCost: t.estimated_cost || null,
      expectedBenefits: [],
      includes: {
        providerType: 'Hormone specialist',
        visitFormat: t.is_virtual_visit ? 'Virtual' : 'In-person or virtual',
        labsIncluded: t.includes_labs ? 'Labs included' : 'Labs may be added as needed'
      },
      howItWorks: []
    };
  }

  addRecommendationToCarePlan(recommendationId) {
    this._requireAuthentication();

    const carePlan = this._getOrCreateActiveCarePlan();
    let items = this._getFromStorage('care_plan_items');

    const id = this._generateId('cpitem');
    const now = this._nowIso();
    const record = {
      id,
      care_plan_id: carePlan.id,
      recommendation_template_id: recommendationId,
      added_at: now,
      status: 'planned',
      source: 'symptom_checker'
    };
    items.push(record);
    this._saveToStorage('care_plan_items', items);

    return {
      success: true,
      carePlanItem: {
        carePlanItemId: id,
        carePlanId: carePlan.id,
        recommendationId: recommendationId,
        addedAt: now,
        status: 'planned',
        source: 'symptom_checker'
      },
      message: 'Added to care plan'
    };
  }

  getActiveCarePlanSummary() {
    this._requireAuthentication();

    const carePlan = this._getOrCreateActiveCarePlan();
    const items = this._getFromStorage('care_plan_items').filter(
      (i) => i.care_plan_id === carePlan.id
    );
    const templates = this._getFromStorage('care_recommendations');

    const mappedItems = items.map((i) => {
      const t = templates.find((x) => x.id === i.recommendation_template_id);
      return {
        carePlanItemId: i.id,
        recommendationTitle: t ? t.title : '',
        recommendationType: t ? t.recommendation_type : null,
        status: i.status,
        addedAt: i.added_at
      };
    });

    return {
      carePlanId: carePlan.id,
      title: carePlan.title,
      status: carePlan.status,
      items: mappedItems
    };
  }

  // ----------------------
  // Dashboard summary
  // ----------------------

  getDashboardSummary() {
    this._requireAuthentication();

    const appointments = this._getFromStorage('appointments');
    const providers = this._getFromStorage('providers');
    const visitReasons = this._getFromStorage('visit_reasons');
    const planSubscriptions = this._getFromStorage('plan_subscriptions');
    const plans = this._getFromStorage('plans');
    const supportMessages = this._getFromStorage('support_messages');
    const carePlan = this._getOrCreateActiveCarePlan();
    const carePlanItems = this._getFromStorage('care_plan_items').filter(
      (i) => i.care_plan_id === carePlan.id
    );
    const careTemplates = this._getFromStorage('care_recommendations');

    const now = new Date();

    const upcoming = appointments
      .filter((a) => a.status === 'scheduled' && new Date(a.start_time) >= now)
      .sort((a, b) => (a.start_time > b.start_time ? 1 : -1))
      .slice(0, 3)
      .map((a) => {
        const provider = providers.find((p) => p.id === a.provider_id);
        return {
          appointmentId: a.id,
          title: a.title,
          startTime: a.start_time,
          modality: a.modality,
          providerName: provider ? provider.full_name : null
        };
      });

    const activePlans = planSubscriptions
      .filter((s) => s.status === 'active' || s.status === 'trial')
      .map((s) => {
        const plan = plans.find((p) => p.id === s.plan_id);
        return {
          subscriptionId: s.id,
          planName: plan ? plan.name : '',
          status: s.status,
          pricePerPeriod: s.price_per_period,
          billingFrequency: s.billing_frequency
        };
      });

    const recentSupportMessages = supportMessages
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5)
      .map((m) => ({
        messageId: m.id,
        topic: m.topic,
        createdAt: m.created_at,
        status: m.status,
        lastReplyAt: m.created_at // no separate replies tracked
      }));

    const carePlanHighlights = carePlanItems.slice(0, 5).map((i) => {
      const t = careTemplates.find((x) => x.id === i.recommendation_template_id);
      return {
        carePlanItemId: i.id,
        recommendationTitle: t ? t.title : '',
        status: i.status
      };
    });

    const latestAssessment = this._getLatestSymptomAssessment();

    return {
      upcomingAppointments: upcoming,
      activePlans,
      recentSupportMessages,
      carePlanHighlights,
      symptomCheckerSummary: latestAssessment
        ? {
            lastAssessmentCompletedAt: latestAssessment.completed_at,
            lastOverallSeverity: latestAssessment.overall_severity
          }
        : {
            lastAssessmentCompletedAt: null,
            lastOverallSeverity: null
          }
    };
  }

  // ----------------------
  // Medications & refills
  // ----------------------

  getMedicationsOverview() {
    this._requireAuthentication();

    const prescriptions = this._getFromStorage('prescriptions');
    const medications = this._getFromStorage('medications');
    const providers = this._getFromStorage('providers');

    return prescriptions.map((pr) => {
      const med = medications.find((m) => m.id === pr.medication_id);
      const provider = providers.find((p) => p.id === pr.prescribing_provider_id);
      const isRefillEligible =
        pr.status === 'active' && (pr.refills_remaining === undefined || pr.refills_remaining > 0);

      return {
        prescriptionId: pr.id,
        medicationId: med ? med.id : null,
        medicationName: med ? med.name : '',
        strength: med ? med.strength || '' : '',
        form: med ? med.form || null : null,
        dosageInstructions: pr.dosage_instructions,
        refillsRemaining: pr.refills_remaining != null ? pr.refills_remaining : null,
        refillsTotal: pr.refills_total != null ? pr.refills_total : null,
        isRefillEligible,
        lastFilledAt: pr.last_filled_at || null,
        prescribingProviderName: provider ? provider.full_name : null,
        // foreign key resolution
        prescription: pr,
        medication: med || null
      };
    });
  }

  getPrescriptionDetails(prescriptionId) {
    this._requireAuthentication();

    const prescriptions = this._getFromStorage('prescriptions');
    const medications = this._getFromStorage('medications');
    const pharmacies = this._getFromStorage('pharmacies');
    const providers = this._getFromStorage('providers');

    const pr = prescriptions.find((p) => p.id === prescriptionId);
    if (!pr) return null;

    const med = medications.find((m) => m.id === pr.medication_id);
    const provider = providers.find((p) => p.id === pr.prescribing_provider_id);
    const defaultPharmacy = pr.pharmacy_id
      ? pharmacies.find((ph) => ph.id === pr.pharmacy_id)
      : null;

    return {
      prescriptionId: pr.id,
      medication: med
        ? {
            medicationId: med.id,
            name: med.name,
            genericName: med.generic_name || '',
            strength: med.strength || '',
            form: med.form || null
          }
        : null,
      dosageInstructions: pr.dosage_instructions,
      quantityPerFill: pr.quantity_per_fill || null,
      refillsTotal: pr.refills_total != null ? pr.refills_total : null,
      refillsRemaining: pr.refills_remaining != null ? pr.refills_remaining : null,
      writtenDate: pr.written_date || null,
      lastFilledAt: pr.last_filled_at || null,
      prescribingProviderName: provider ? provider.full_name : null,
      defaultPharmacy: defaultPharmacy
        ? {
            pharmacyId: defaultPharmacy.id,
            name: defaultPharmacy.name,
            addressLine1: defaultPharmacy.address_line1,
            city: defaultPharmacy.city,
            state: defaultPharmacy.state,
            zipCode: defaultPharmacy.zip_code,
            phoneNumber: defaultPharmacy.phone_number || ''
          }
        : null
    };
  }

  getRefillOptions(prescriptionId) {
    this._requireAuthentication();

    const prescriptions = this._getFromStorage('prescriptions');
    const pr = prescriptions.find((p) => p.id === prescriptionId);
    if (!pr) {
      return {
        allowedSupplies: [],
        defaultSupplyCode: null
      };
    }

    // Simplified: allow 30, 60, 90 day supplies
    const allowedSupplies = [
      { code: '30_day', label: '30-day supply' },
      { code: '60_day', label: '60-day supply' },
      { code: '90_day', label: '90-day supply' }
    ];

    return {
      allowedSupplies,
      defaultSupplyCode: '30_day'
    };
  }

  searchPharmacies(zipCode, radiusMiles) {
    this._requireAuthentication();

    const pharmacies = this._getFromStorage('pharmacies');
    const radius = typeof radiusMiles === 'number' ? radiusMiles : 10;

    const results = pharmacies.filter((ph) => {
      if (ph.zip_code === zipCode) return true;
      if (typeof ph.distance_miles === 'number') {
        return ph.distance_miles <= radius;
      }
      return false;
    });

    return results;
  }

  submitRefillRequest(prescriptionId, requestedSupply, pharmacyId) {
    this._requireAuthentication();

    const prescriptions = this._getFromStorage('prescriptions');
    const pharmacies = this._getFromStorage('pharmacies');
    let refillRequests = this._getFromStorage('refill_requests');

    const pr = prescriptions.find((p) => p.id === prescriptionId);
    const ph = pharmacies.find((p) => p.id === pharmacyId);

    if (!pr || !ph) {
      return {
        success: false,
        refillRequest: null,
        message: 'Prescription or pharmacy not found'
      };
    }

    const id = this._generateId('refill');
    const now = this._nowIso();
    const record = {
      id,
      prescription_id: pr.id,
      requested_supply: requestedSupply,
      pharmacy_id: ph.id,
      requested_at: now,
      status: 'pending',
      decision_note: null
    };

    refillRequests.push(record);
    this._saveToStorage('refill_requests', refillRequests);

    return {
      success: true,
      refillRequest: {
        refillRequestId: id,
        prescriptionId: pr.id,
        requestedSupply,
        pharmacyId: ph.id,
        requestedAt: now,
        status: 'pending',
        // foreign key resolution
        prescription: pr,
        pharmacy: ph
      },
      message: 'Refill request submitted'
    };
  }

  // ----------------------
  // Support & messaging
  // ----------------------

  getSupportTopicsAndGuidance() {
    return {
      emergencyGuidanceHtml:
        '<p>If you are experiencing chest pain, trouble breathing, or another medical emergency, call 911 or go to your nearest emergency room.</p><p>This messaging portal is not monitored 24/7.</p>',
      topics: [
        {
          code: 'medication_side_effects',
          label: 'Medication side effects',
          description: 'New or worsening side effects from your medications.'
        },
        {
          code: 'billing_question',
          label: 'Billing or insurance',
          description: 'Questions about charges, invoices, or insurance.'
        },
        {
          code: 'technical_issue',
          label: 'Technical issues',
          description: 'Problems joining visits or using the portal.'
        },
        {
          code: 'scheduling_question',
          label: 'Scheduling',
          description: 'Rescheduling or questions about upcoming visits.'
        },
        {
          code: 'general_question',
          label: 'General question',
          description: 'Anything else related to your care.'
        }
      ],
      defaultTopicCode: 'medication_side_effects'
    };
  }

  sendSupportMessage(topic, medicationId, body, urgency, includeRecentSymptomData) {
    this._requireAuthentication();

    const medications = this._getFromStorage('medications');
    let messages = this._getFromStorage('support_messages');

    const med = medicationId
      ? medications.find((m) => m.id === medicationId) || null
      : null;

    let finalBody = body || '';
    if (includeRecentSymptomData) {
      finalBody = this._includeRecentSymptomDataInSupportMessage(finalBody);
    }

    const id = this._generateId('msg');
    const now = this._nowIso();
    const record = {
      id,
      topic,
      medication_id: med ? med.id : null,
      body: finalBody,
      urgency,
      include_recent_symptom_data: !!includeRecentSymptomData,
      created_at: now,
      status: 'open'
    };
    messages.push(record);
    this._saveToStorage('support_messages', messages);

    const estimatedResponseTimeHours = urgency === 'urgent_24h' ? 24 : 72;

    return {
      success: true,
      messageId: id,
      createdAt: now,
      status: 'open',
      estimatedResponseTimeHours
    };
  }

  // ----------------------
  // Account settings & emergency contacts
  // ----------------------

  getAccountSettings() {
    this._requireAuthentication();

    const account = this._getCurrentAccountSettings();
    return {
      fullName: account.full_name,
      email: account.email,
      state: account.state,
      pronouns: account.pronouns,
      customPronouns: account.custom_pronouns,
      contactEmailEnabled: account.contact_email_enabled,
      contactSmsEnabled: account.contact_sms_enabled,
      contactPhoneEnabled: account.contact_phone_enabled,
      reminderFrequency: account.reminder_frequency
    };
  }

  updateProfileSettings(profile) {
    this._requireAuthentication();

    let account = this._getCurrentAccountSettings();
    const now = this._nowIso();

    if (profile.fullName !== undefined) account.full_name = profile.fullName;
    if (profile.pronouns !== undefined) account.pronouns = profile.pronouns;
    if (profile.customPronouns !== undefined)
      account.custom_pronouns = profile.customPronouns;
    account.updated_at = now;

    this._saveCurrentAccountSettings(account);

    return {
      success: true,
      updatedProfile: {
        fullName: account.full_name,
        pronouns: account.pronouns,
        customPronouns: account.custom_pronouns
      },
      message: 'Profile updated'
    };
  }

  updateCommunicationPreferences(preferences) {
    this._requireAuthentication();

    let account = this._getCurrentAccountSettings();
    const now = this._nowIso();

    if (preferences.contactEmailEnabled !== undefined)
      account.contact_email_enabled = preferences.contactEmailEnabled;
    if (preferences.contactSmsEnabled !== undefined)
      account.contact_sms_enabled = preferences.contactSmsEnabled;
    if (preferences.contactPhoneEnabled !== undefined)
      account.contact_phone_enabled = preferences.contactPhoneEnabled;
    if (preferences.reminderFrequency !== undefined)
      account.reminder_frequency = preferences.reminderFrequency;

    account.updated_at = now;
    this._saveCurrentAccountSettings(account);

    return {
      success: true,
      updatedPreferences: {
        contactEmailEnabled: account.contact_email_enabled,
        contactSmsEnabled: account.contact_sms_enabled,
        contactPhoneEnabled: account.contact_phone_enabled,
        reminderFrequency: account.reminder_frequency
      },
      message: 'Communication preferences updated'
    };
  }

  listEmergencyContacts() {
    this._requireAuthentication();
    return this._getFromStorage('emergency_contacts');
  }

  addEmergencyContact(name, phoneNumber, relationship, isPrimary) {
    this._requireAuthentication();

    let contacts = this._getFromStorage('emergency_contacts');
    const id = this._generateId('emerg');
    const now = this._nowIso();

    const contact = {
      id,
      name,
      phone_number: phoneNumber,
      relationship,
      is_primary: !!isPrimary,
      created_at: now,
      updated_at: now
    };

    if (isPrimary) {
      contacts = contacts.map((c) => ({ ...c, is_primary: false }));
    }

    contacts.push(contact);
    this._saveToStorage('emergency_contacts', contacts);

    return {
      success: true,
      contact: {
        contactId: id,
        name,
        phoneNumber,
        relationship,
        isPrimary: !!isPrimary,
        createdAt: now
      },
      message: 'Emergency contact added'
    };
  }

  // ----------------------
  // Clinic info & providers
  // ----------------------

  getClinicInfo() {
    const providers = this._getFromStorage('providers');
    const statesSet = new Set();
    for (const p of providers) {
      if (Array.isArray(p.states_served)) {
        p.states_served.forEach((s) => statesSet.add(s));
      }
    }
    const statesServed = Array.from(statesSet).map((code) => ({
      code,
      label: this._stateLabel(code)
    }));

    return {
      mission: 'To make high-quality hormone and thyroid care accessible from home.',
      approach:
        'Our multidisciplinary team combines telemedicine, lab testing, and ongoing support to personalize your hormone care.',
      statesServed,
      contact: {
        email: 'support@telehormoneclinic.example',
        phone: '+1-800-000-0000'
      },
      highlights: [
        {
          title: 'Board-certified clinicians',
          body: 'All providers are licensed in the states where they practice and have advanced training in hormone health.'
        },
        {
          title: 'Lab-guided treatment',
          body: 'We use at-home and in-lab testing to guide safe, evidence-based care.'
        }
      ]
    };
  }

  getAboutProviders() {
    const providers = this._getFromStorage('providers');
    return providers.map((p) => ({
      providerId: p.id,
      fullName: p.full_name,
      credentials: p.credentials || '',
      specialtyCodes: p.specialty_codes || [],
      statesServed: p.states_served || [],
      averageRating: p.average_rating,
      ratingCount: p.rating_count,
      profileImageUrl: p.profile_image_url || '',
      bio: p.bio || ''
    }));
  }

  getLegalContent(section) {
    const allSections = [
      {
        code: 'privacy',
        title: 'Privacy Policy',
        contentHtml:
          '<p>Your privacy is important to us. We comply with HIPAA and protect your health information.</p>',
        anchorId: 'privacy'
      },
      {
        code: 'terms',
        title: 'Terms of Service',
        contentHtml:
          '<p>By using this site, you agree to our terms of service and telemedicine policies.</p>',
        anchorId: 'terms'
      },
      {
        code: 'telehealth_consent',
        title: 'Telehealth Consent',
        contentHtml:
          '<p>Telehealth involves the use of electronic communications to enable healthcare services at a distance.</p>',
        anchorId: 'telehealth-consent'
      }
    ];

    const sec = section || 'all';
    const filtered = sec === 'all' ? allSections : allSections.filter((s) => s.code === sec);

    return {
      sections: filtered
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