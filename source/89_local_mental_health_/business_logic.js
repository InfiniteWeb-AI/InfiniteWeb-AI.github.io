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

  // =====================
  // Storage helpers
  // =====================

  _initStorage() {
    const keys = [
      'therapists',
      'appointment_types',
      'appointment_slots',
      'appointments',
      'therapist_comparison_lists',
      'therapist_search_filters',
      'insurance_plans',
      'contact_messages',
      'group_programs',
      'group_sessions',
      'group_registrations',
      'assessments',
      'assessment_questions',
      'assessment_options',
      'assessment_sessions',
      'assessment_responses',
      'assessment_results',
      'articles',
      'reading_lists',
      'newsletter_subscriptions',
      'crisis_hotlines',
      'safety_plans'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
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

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _getISODate(date) {
    return date.toISOString().split('T')[0];
  }

  _slugify(value) {
    if (!value) return '';
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  _getTherapistById(id) {
    const therapists = this._getFromStorage('therapists');
    return therapists.find((t) => t.id === id) || null;
  }

  _getAppointmentTypeById(id) {
    const types = this._getFromStorage('appointment_types');
    return types.find((t) => t.id === id) || null;
  }

  _getAppointmentTypeByCode(code) {
    const types = this._getFromStorage('appointment_types');
    return types.find((t) => t.code === code) || null;
  }

  _getInsurancePlanById(id) {
    const plans = this._getFromStorage('insurance_plans');
    return plans.find((p) => p.id === id) || null;
  }

  _getGroupProgramById(id) {
    const groups = this._getFromStorage('group_programs');
    return groups.find((g) => g.id === id) || null;
  }

  _getGroupSessionById(id) {
    const sessions = this._getFromStorage('group_sessions');
    return sessions.find((s) => s.id === id) || null;
  }

  _getAssessmentById(id) {
    const assessments = this._getFromStorage('assessments');
    return assessments.find((a) => a.id === id) || null;
  }

  _getAssessmentByCode(code) {
    const assessments = this._getFromStorage('assessments');
    return assessments.find((a) => a.code === code) || null;
  }

  _getArticleById(id) {
    const articles = this._getFromStorage('articles');
    return articles.find((a) => a.id === id) || null;
  }

  // =====================
  // Helper functions (private)
  // =====================

  // Therapist comparison list (single-user)
  _getOrCreateTherapistComparisonList() {
    const key = 'therapist_comparison_lists';
    let lists = this._getFromStorage(key);
    let list = lists[0] || null;
    const now = this._nowISO();

    if (!list) {
      list = {
        id: 'therapist_comparison_default',
        therapist_ids: [],
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage(key, lists);
    }

    return list;
  }

  // Reading list (single-user)
  _getOrCreateReadingList() {
    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    let list = lists[0] || null;
    const now = this._nowISO();

    if (!list) {
      list = {
        id: 'reading_list_default',
        article_ids: [],
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage(key, lists);
    }

    return list;
  }

  // Safety plan (single-user)
  _getOrCreateSafetyPlan() {
    const key = 'safety_plans';
    let plans = this._getFromStorage(key);
    let plan = plans[0] || null;
    const now = this._nowISO();
    let createdNew = false;

    if (!plan) {
      plan = {
        id: 'safety_plan_default',
        crisis_contacts: [],
        warning_signs: [],
        coping_strategies: [],
        created_at: now,
        updated_at: now
      };
      plans.push(plan);
      this._saveToStorage(key, plans);
      createdNew = true;
    }

    return { plan, createdNew };
  }

  // Assessment session (single-user per assessment)
  _getOrCreateAssessmentSession(assessmentId) {
    const key = 'assessment_sessions';
    let sessions = this._getFromStorage(key);
    let session = sessions.find(
      (s) => s.assessment_id === assessmentId && !s.is_completed
    );

    const now = this._nowISO();

    if (!session) {
      session = {
        id: this._generateId('assess_session'),
        assessment_id: assessmentId,
        started_at: now,
        completed_at: null,
        is_completed: false
      };
      sessions.push(session);
      this._saveToStorage(key, sessions);
    }

    return session;
  }

  // Therapist search filter state (single-user)
  _getOrCreateTherapistSearchFilterState() {
    const key = 'therapist_search_filters';
    let filters = this._getFromStorage(key);
    let state = filters[0] || null;
    const now = this._nowISO();

    if (!state) {
      state = {
        id: 'therapist_search_default',
        specialty_filters: [],
        sliding_scale_only: false,
        max_fee: null,
        format_filters: [],
        zip_code: null,
        rating_min: null,
        availability_days: [],
        sort_by: null,
        updated_at: now
      };
      filters.push(state);
      this._saveToStorage(key, filters);
    }

    return state;
  }

  // Internal helper to query AppointmentSlot records based on filters
  _findMatchingAppointmentSlots(appointmentTypeId, filters) {
    const slots = this._getFromStorage('appointment_slots');
    const therapists = this._getFromStorage('therapists');
    const therapistById = {};
    therapists.forEach((t) => {
      therapistById[t.id] = t;
    });

    const {
      specialtyFilters,
      formatFilters,
      zipCode,
      dateRangeStart,
      dateRangeEnd,
      timeOfDay,
      requireInPersonWithinZip
    } = filters || {};

    const startDate = dateRangeStart ? new Date(dateRangeStart + 'T00:00:00') : null;
    const endDate = dateRangeEnd ? new Date(dateRangeEnd + 'T23:59:59') : null;

    const desiredSpecialties = (specialtyFilters || []).map((s) => this._slugify(s));

    const filtered = slots
      .filter((slot) => {
        if (slot.is_booked) return false;
        if (slot.appointment_type_id !== appointmentTypeId) return false;

        const therapist = therapistById[slot.therapist_id];
        if (!therapist || !therapist.is_active) return false;

        // Specialty filter via therapist.specialties
        if (desiredSpecialties.length > 0) {
          const therapistSpecialties = (therapist.specialties || []).map((sp) =>
            this._slugify(sp)
          );
          const matchesSpecialty = desiredSpecialties.some((code) =>
            therapistSpecialties.includes(code)
          );
          if (!matchesSpecialty) return false;
        }

        // Format filters
        if (formatFilters && formatFilters.length > 0) {
          if (!formatFilters.includes(slot.session_format)) return false;
        }

        // ZIP handling
        if (requireInPersonWithinZip && zipCode) {
          if (
            slot.session_format !== 'in_person' ||
            slot.location_zip !== zipCode
          ) {
            return false;
          }
        } else if (zipCode && slot.session_format === 'in_person') {
          // If zipCode is specified but not strict, prefer matching ZIPs by filtering
          if (slot.location_zip !== zipCode) return false;
        }

        // Date range filter
        const slotStart = new Date(slot.start_datetime);
        if (startDate && slotStart < startDate) return false;
        if (endDate && slotStart > endDate) return false;

        // Time-of-day filter
        if (timeOfDay && timeOfDay !== 'any') {
          const hour = slotStart.getHours();
          if (timeOfDay === 'evening') {
            if (!slot.is_evening && hour < 17) return false;
          } else if (timeOfDay === 'morning') {
            if (hour < 6 || hour >= 12) return false;
          } else if (timeOfDay === 'afternoon') {
            if (hour < 12 || hour >= 17) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      });

    // Foreign key resolution for slots
    return filtered.map((slot) => ({
      ...slot,
      therapist: therapistById[slot.therapist_id] || null,
      appointmentType: this._getAppointmentTypeById(slot.appointment_type_id)
    }));
  }

  // Compute assessment result from responses
  _computeAssessmentResultFromResponses(assessmentSessionId) {
    const assessmentSessions = this._getFromStorage('assessment_sessions');
    const responses = this._getFromStorage('assessment_responses');
    const results = this._getFromStorage('assessment_results');

    const session = assessmentSessions.find((s) => s.id === assessmentSessionId);
    if (!session) {
      return null;
    }

    const assessment = this._getAssessmentById(session.assessment_id);

    const sessionResponses = responses.filter(
      (r) => r.assessment_session_id === assessmentSessionId
    );

    const totalScore = sessionResponses.reduce(
      (sum, r) => sum + (r.numeric_value || 0),
      0
    );

    let severity_level = 'minimal';
    if (totalScore <= 4) severity_level = 'minimal';
    else if (totalScore <= 9) severity_level = 'mild';
    else if (totalScore <= 14) severity_level = 'moderate';
    else if (totalScore <= 19) severity_level = 'moderately_severe';
    else severity_level = 'severe';

    const articles = this._getFromStorage('articles');
    const recommendedArticles = articles.filter((a) => {
      const arr = a.recommended_for_assessment_ids || [];
      return arr.includes(session.assessment_id);
    });

    const recommended_article_ids = recommendedArticles
      .slice(0, 10)
      .map((a) => a.id);

    let result = results.find((r) => r.assessment_session_id === assessmentSessionId);

    if (!result) {
      result = {
        id: this._generateId('assess_result'),
        assessment_session_id: assessmentSessionId,
        total_score: totalScore,
        severity_level,
        summary: '',
        recommended_article_ids
      };
      results.push(result);
    } else {
      result.total_score = totalScore;
      result.severity_level = severity_level;
      result.recommended_article_ids = recommended_article_ids;
    }

    // Optionally add a simple summary
    if (assessment) {
      result.summary =
        'Your score on ' +
        assessment.name +
        ' is ' +
        totalScore +
        ' (' +
        severity_level.replace('_', ' ') +
        ').';
    }

    // Mark session as completed
    const now = this._nowISO();
    session.is_completed = true;
    session.completed_at = now;

    this._saveToStorage('assessment_results', results);
    this._saveToStorage('assessment_sessions', assessmentSessions);

    return result;
  }

  // Helper: next available slot summary for therapist
  _getNextAvailableSlotSummaryForTherapist(therapistId) {
    const slots = this._getFromStorage('appointment_slots');
    const futureSlots = slots
      .filter((s) => s.therapist_id === therapistId && !s.is_booked)
      .sort((a, b) => {
        return (
          new Date(a.start_datetime).getTime() -
          new Date(b.start_datetime).getTime()
        );
      });

    if (!futureSlots.length) return null;
    const first = futureSlots[0];
    const dt = new Date(first.start_datetime);
    const date = this._getISODate(dt);
    const time = dt.toTimeString().slice(0, 5);
    return {
      date,
      time,
      isWeekend: !!first.is_weekend,
      isEvening: !!first.is_evening
    };
  }

  // =====================
  // Core interface implementations
  // =====================

  // 1. getHomePageContent
  getHomePageContent() {
    return {
      heroTitle: 'Local mental health counseling in your community',
      heroSubtitle:
        'In-person and online counseling for individuals, couples, and families in a warm, trauma-informed practice.',
      primaryActions: [
        {
          code: 'book_appointment',
          label: 'Book an Appointment',
          targetPage: 'book_appointment'
        },
        {
          code: 'find_therapist',
          label: 'Find a Therapist',
          targetPage: 'therapists'
        },
        {
          code: 'group_programs',
          label: 'Group Therapy',
          targetPage: 'group_programs'
        },
        {
          code: 'self_assessments',
          label: 'Self-Assessments',
          targetPage: 'self_assessments'
        }
      ],
      keyServices: [
        {
          code: 'individual_counseling',
          title: 'Individual Counseling',
          summary: 'One-on-one support for anxiety, depression, trauma, and life transitions.'
        },
        {
          code: 'telehealth',
          title: 'Secure Telehealth',
          summary: 'Meet with your therapist online from home with encrypted video sessions.'
        },
        {
          code: 'group_therapy',
          title: 'Group Therapy',
          summary: 'Connect with others in structured groups for social anxiety, parenting, and more.'
        }
      ],
      trustMessages: [
        'Licensed, trauma-informed clinicians',
        'Sliding-scale options for qualifying clients',
        'Evening and weekend appointments available'
      ],
      crisisCallout: {
        headline: 'If you are in crisis, please reach out now.',
        body:
          'If you are thinking about harming yourself or others, call 988 or your local emergency number, or go to the nearest emergency room.',
        primaryHotlineLabel: '988 Suicide & Crisis Lifeline',
        primaryHotlinePhone: '988'
      },
      showNewsletterSignup: true
    };
  }

  // 2. getNewsletterOptions
  getNewsletterOptions() {
    return {
      availableFrequencies: [
        {
          value: 'monthly',
          label: 'Monthly',
          description: 'A gentle monthly roundup of articles and practice updates.'
        },
        {
          value: 'weekly',
          label: 'Weekly',
          description: 'Short weekly emails with timely tips and resources.'
        },
        {
          value: 'biweekly',
          label: 'Every other week',
          description: 'A balance between staying current and inbox space.'
        },
        {
          value: 'quarterly',
          label: 'Quarterly',
          description: 'Occasional highlights and big announcements.'
        }
      ],
      availableTopics: [
        {
          value: 'parenting_families',
          label: 'Parenting & Families',
          description:
            'Strategies and stories about parenting, family communication, and supporting kids.'
        },
        {
          value: 'general_mental_health',
          label: 'General Mental Health',
          description: 'Articles on stress, resilience, and emotional wellbeing.'
        },
        {
          value: 'anxiety',
          label: 'Anxiety',
          description: 'Tools for worry, panic, social anxiety, and more.'
        },
        {
          value: 'depression',
          label: 'Depression',
          description: 'Resources for low mood, motivation, and self-compassion.'
        }
      ]
    };
  }

  // 3. subscribeToNewsletter
  subscribeToNewsletter(email, firstName, lastName, frequency, topics) {
    const key = 'newsletter_subscriptions';
    const subs = this._getFromStorage(key);
    const now = this._nowISO();

    let subscription = subs.find((s) => s.email === email);

    if (!subscription) {
      subscription = {
        id: this._generateId('nl_sub'),
        email,
        first_name: firstName || '',
        last_name: lastName || '',
        frequency: frequency,
        topics: topics || [],
        subscribed_at: now,
        is_active: true
      };
      subs.push(subscription);
    } else {
      subscription.first_name = firstName || subscription.first_name || '';
      subscription.last_name = lastName || subscription.last_name || '';
      subscription.frequency = frequency;
      subscription.topics = topics || subscription.topics || [];
      subscription.is_active = true;
      // subscribed_at remains when first subscribed
    }

    this._saveToStorage(key, subs);

    return {
      success: true,
      message: 'Subscription saved.',
      subscription
    };
  }

  // 4. getTherapistDirectoryFilterOptions
  getTherapistDirectoryFilterOptions() {
    const therapists = this._getFromStorage('therapists');

    // Derive specialties from therapists
    const specialtyMap = {};
    therapists.forEach((t) => {
      (t.specialties || []).forEach((label) => {
        const value = this._slugify(label);
        if (!specialtyMap[value]) {
          specialtyMap[value] = label;
        }
      });
    });

    const specialties = Object.keys(specialtyMap).map((value) => ({
      value,
      label: specialtyMap[value]
    }));

    const formats = [
      { value: 'in_person', label: 'In-person' },
      { value: 'online', label: 'Online / Telehealth' }
    ];

    const ratingMinimumOptions = [
      { value: 0, label: 'Any rating' },
      { value: 4.0, label: '4.0 stars & up' },
      { value: 4.5, label: '4.5 stars & up' },
      { value: 5.0, label: '5 stars only' }
    ];

    const availabilityDayOptions = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    let minFee = null;
    let maxFee = null;
    therapists.forEach((t) => {
      if (typeof t.standard_session_fee === 'number') {
        if (minFee === null || t.standard_session_fee < minFee) minFee = t.standard_session_fee;
        if (maxFee === null || t.standard_session_fee > maxFee) maxFee = t.standard_session_fee;
      }
      if (t.sliding_scale_min_fee != null) {
        if (minFee === null || t.sliding_scale_min_fee < minFee)
          minFee = t.sliding_scale_min_fee;
      }
      if (t.sliding_scale_max_fee != null) {
        if (maxFee === null || t.sliding_scale_max_fee > maxFee)
          maxFee = t.sliding_scale_max_fee;
      }
    });

    return {
      specialties,
      formats,
      ratingMinimumOptions,
      availabilityDayOptions,
      priceRangeSuggestedMin: minFee != null ? minFee : 0,
      priceRangeSuggestedMax: maxFee != null ? maxFee : 0,
      supportsSlidingScaleFilter: true
    };
  }

  // 5. searchTherapists
  searchTherapists(filters, sortBy, limit = 20, offset = 0) {
    const therapists = this._getFromStorage('therapists').filter(
      (t) => t.is_active !== false
    );
    const slots = this._getFromStorage('appointment_slots');

    const {
      specialtyFilters,
      slidingScaleOnly,
      maxFee,
      formatFilters,
      zipCode,
      ratingMin,
      availabilityDays
    } = filters || {};

    const desiredSpecialties = (specialtyFilters || []).map((s) => this._slugify(s));

    const results = therapists
      .filter((t) => {
        // Specialty filter
        if (desiredSpecialties.length > 0) {
          const therapistSpecialties = (t.specialties || []).map((sp) =>
            this._slugify(sp)
          );
          const matchesSpecialty = desiredSpecialties.some((code) =>
            therapistSpecialties.includes(code)
          );
          if (!matchesSpecialty) return false;
        }

        // Sliding scale
        if (slidingScaleOnly && !t.sliding_scale_available) return false;

        // Max fee
        if (typeof maxFee === 'number') {
          const effectiveFee =
            t.sliding_scale_min_fee != null
              ? t.sliding_scale_min_fee
              : t.standard_session_fee;
          if (effectiveFee > maxFee) return false;
        }

        // Format filters
        if (formatFilters && formatFilters.length > 0) {
          const requiresInPerson = formatFilters.includes('in_person');
          const requiresOnline = formatFilters.includes('online');
          if (requiresInPerson && !t.offers_in_person) return false;
          if (requiresOnline && !t.offers_online) return false;
        }

        // ZIP filter (matches therapist office zip)
        if (zipCode && t.office_zip && t.office_zip !== zipCode) return false;

        // Rating filter
        if (typeof ratingMin === 'number' && t.rating != null) {
          if (t.rating < ratingMin) return false;
        }

        // Availability days (only weekends we can reliably infer)
        if (availabilityDays && availabilityDays.length > 0) {
          const wantsWeekend =
            availabilityDays.includes('saturday') ||
            availabilityDays.includes('sunday');
          if (wantsWeekend && !t.has_weekend_availability) return false;
        }

        return true;
      })
      .map((t) => {
        // Fee summary
        let minFee = t.standard_session_fee || null;
        let maxFee = t.standard_session_fee || null;
        if (t.sliding_scale_available) {
          if (t.sliding_scale_min_fee != null) {
            minFee = Math.min(
              minFee != null ? minFee : t.sliding_scale_min_fee,
              t.sliding_scale_min_fee
            );
          }
          if (t.sliding_scale_max_fee != null) {
            maxFee = Math.max(
              maxFee != null ? maxFee : t.sliding_scale_max_fee,
              t.sliding_scale_max_fee
            );
          }
        }

        const nextAvailableSlotSummary =
          this._getNextAvailableSlotSummaryForTherapist(t.id);

        return {
          therapist: t,
          nextAvailableSlotSummary,
          minFee,
          maxFee,
          offersSlidingScale: !!t.sliding_scale_available,
          averageRating: t.rating != null ? t.rating : null,
          ratingCount: t.rating_count != null ? t.rating_count : 0
        };
      });

    // Persist filter state
    const state = this._getOrCreateTherapistSearchFilterState();
    state.specialty_filters = specialtyFilters || [];
    state.sliding_scale_only = !!slidingScaleOnly;
    state.max_fee = typeof maxFee === 'number' ? maxFee : null;
    state.format_filters = formatFilters || [];
    state.zip_code = zipCode || null;
    state.rating_min = typeof ratingMin === 'number' ? ratingMin : null;
    state.availability_days = availabilityDays || [];
    state.sort_by = sortBy || null;
    state.updated_at = this._nowISO();
    this._saveToStorage('therapist_search_filters', [state]);

    // Sorting
    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => {
        const aFee = a.minFee != null ? a.minFee : Number.MAX_SAFE_INTEGER;
        const bFee = b.minFee != null ? b.minFee : Number.MAX_SAFE_INTEGER;
        return aFee - bFee;
      });
    } else if (sortBy === 'rating_high_to_low') {
      results.sort((a, b) => {
        const aRating = a.averageRating != null ? a.averageRating : 0;
        const bRating = b.averageRating != null ? b.averageRating : 0;
        return bRating - aRating;
      });
    } else if (sortBy === 'next_available') {
      results.sort((a, b) => {
        const ad = a.nextAvailableSlotSummary
          ? new Date(a.nextAvailableSlotSummary.date + 'T' + a.nextAvailableSlotSummary.time)
              .getTime()
          : Number.MAX_SAFE_INTEGER;
        const bd = b.nextAvailableSlotSummary
          ? new Date(b.nextAvailableSlotSummary.date + 'T' + b.nextAvailableSlotSummary.time)
              .getTime()
          : Number.MAX_SAFE_INTEGER;
        return ad - bd;
      });
    }

    return results.slice(offset, offset + limit);
  }

  // 6. getAppointmentTypeOptionsForBooking
  getAppointmentTypeOptionsForBooking() {
    const types = this._getFromStorage('appointment_types');
    return types;
  }

  // 7. searchTherapistsForAppointment
  searchTherapistsForAppointment(
    appointmentTypeCode,
    filters,
    sortBy,
    limit = 20,
    offset = 0
  ) {
    const appointmentType = this._getAppointmentTypeByCode(appointmentTypeCode);
    if (!appointmentType) {
      return [];
    }

    const slots = this._findMatchingAppointmentSlots(appointmentType.id, filters || {});

    // Group by therapist and pick earliest slot per therapist
    const grouped = {};
    slots.forEach((slot) => {
      const tId = slot.therapist_id;
      if (!grouped[tId]) {
        grouped[tId] = slot;
      } else {
        const existing = grouped[tId];
        if (
          new Date(slot.start_datetime).getTime() <
          new Date(existing.start_datetime).getTime()
        ) {
          grouped[tId] = slot;
        }
      }
    });

    const therapists = this._getFromStorage('therapists');
    const therapistById = {};
    therapists.forEach((t) => {
      therapistById[t.id] = t;
    });

    let results = Object.keys(grouped).map((therapistId) => {
      const firstMatchingSlot = grouped[therapistId];
      const therapist = therapistById[therapistId];
      const slotObj = {
        ...firstMatchingSlot,
        therapist,
        appointmentType
      };

      return {
        therapist,
        firstMatchingSlot: slotObj,
        matchesEveningRequirement: !!firstMatchingSlot.is_evening,
        matchesWeekendRequirement: !!firstMatchingSlot.is_weekend
      };
    });

    // Sorting
    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => {
        const aFee = a.therapist.standard_session_fee || Number.MAX_SAFE_INTEGER;
        const bFee = b.therapist.standard_session_fee || Number.MAX_SAFE_INTEGER;
        return aFee - bFee;
      });
    } else if (sortBy === 'rating_high_to_low') {
      results.sort((a, b) => {
        const aRating = a.therapist.rating != null ? a.therapist.rating : 0;
        const bRating = b.therapist.rating != null ? b.therapist.rating : 0;
        return bRating - aRating;
      });
    } else if (sortBy === 'next_available') {
      results.sort((a, b) => {
        const ad = new Date(a.firstMatchingSlot.start_datetime).getTime();
        const bd = new Date(b.firstMatchingSlot.start_datetime).getTime();
        return ad - bd;
      });
    }

    return results.slice(offset, offset + limit);
  }

  // 8. getTherapistAvailabilityForAppointment
  getTherapistAvailabilityForAppointment(
    therapistId,
    appointmentTypeCode,
    dateRangeStart,
    dateRangeEnd,
    sessionFormat,
    locationZip,
    timeOfDay,
    weekendsOnly = false
  ) {
    const therapist = this._getTherapistById(therapistId);
    const appointmentType = this._getAppointmentTypeByCode(appointmentTypeCode);
    if (!therapist || !appointmentType) {
      return { therapist: therapist || null, appointmentType: appointmentType || null, slots: [] };
    }

    const slotsAll = this._getFromStorage('appointment_slots');
    const startDate = dateRangeStart ? new Date(dateRangeStart + 'T00:00:00') : null;
    const endDate = dateRangeEnd ? new Date(dateRangeEnd + 'T23:59:59') : null;

    let slots = slotsAll.filter((s) => {
      if (s.therapist_id !== therapistId) return false;
      if (s.appointment_type_id !== appointmentType.id) return false;
      if (s.is_booked) return false;

      if (sessionFormat && s.session_format !== sessionFormat) return false;

      if (locationZip && s.session_format === 'in_person') {
        if (s.location_zip !== locationZip) return false;
      }

      const d = new Date(s.start_datetime);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;

      if (weekendsOnly && !s.is_weekend) return false;

      if (timeOfDay && timeOfDay !== 'any') {
        const hour = d.getHours();
        if (timeOfDay === 'evening') {
          if (!s.is_evening && hour < 17) return false;
        } else if (timeOfDay === 'morning') {
          if (hour < 6 || hour >= 12) return false;
        } else if (timeOfDay === 'afternoon') {
          if (hour < 12 || hour >= 17) return false;
        }
      }

      return true;
    });

    slots = slots
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .map((s) => ({
        ...s,
        therapist,
        appointmentType
      }));

    return { therapist, appointmentType, slots };
  }

  // 9. createDraftAppointmentFromSlot
  createDraftAppointmentFromSlot(appointmentSlotId) {
    const slots = this._getFromStorage('appointment_slots');
    const slot = slots.find((s) => s.id === appointmentSlotId);
    if (!slot || slot.is_booked) {
      return {
        success: false,
        message: 'Appointment slot not available.',
        appointment: null
      };
    }

    const appointments = this._getFromStorage('appointments');
    const now = this._nowISO();

    const appointment = {
      id: this._generateId('appt'),
      therapist_id: slot.therapist_id,
      appointment_slot_id: slot.id,
      appointment_type_id: slot.appointment_type_id,
      client_first_name: '',
      client_last_name: '',
      client_phone: '',
      client_email: '',
      created_at: now,
      status: 'draft'
    };

    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    const therapist = this._getTherapistById(appointment.therapist_id);
    const appointmentType = this._getAppointmentTypeById(
      appointment.appointment_type_id
    );

    const enrichedAppointment = {
      ...appointment,
      therapist,
      appointmentSlot: slot,
      appointmentType
    };

    return {
      success: true,
      message: 'Draft appointment created.',
      appointment: enrichedAppointment
    };
  }

  // 10. getAppointmentDraftDetails
  getAppointmentDraftDetails(appointmentId) {
    const appointments = this._getFromStorage('appointments');
    const appointment = appointments.find((a) => a.id === appointmentId) || null;

    if (!appointment) {
      return {
        appointment: null,
        therapist: null,
        appointmentType: null,
        appointmentSlot: null
      };
    }

    const therapist = this._getTherapistById(appointment.therapist_id);
    const appointmentType = this._getAppointmentTypeById(
      appointment.appointment_type_id
    );
    const slots = this._getFromStorage('appointment_slots');
    const appointmentSlot = slots.find((s) => s.id === appointment.appointment_slot_id) || null;

    // Foreign key resolution inside appointment as well
    const enrichedAppointment = {
      ...appointment,
      therapist,
      appointmentSlot,
      appointmentType
    };

    return {
      appointment: enrichedAppointment,
      therapist,
      appointmentType,
      appointmentSlot
    };
  }

  // 11. confirmAppointment
  confirmAppointment(
    appointmentId,
    clientFirstName,
    clientLastName,
    clientPhone,
    clientEmail
  ) {
    const appointments = this._getFromStorage('appointments');
    const slots = this._getFromStorage('appointment_slots');
    const apptIndex = appointments.findIndex((a) => a.id === appointmentId);

    if (apptIndex === -1) {
      return { success: false, message: 'Appointment not found.', appointment: null };
    }

    const appointment = appointments[apptIndex];

    appointment.client_first_name = clientFirstName;
    appointment.client_last_name = clientLastName;
    appointment.client_phone = clientPhone;
    appointment.client_email = clientEmail;
    appointment.status = 'confirmed';

    // Mark slot as booked
    const slotIndex = slots.findIndex((s) => s.id === appointment.appointment_slot_id);
    if (slotIndex !== -1) {
      slots[slotIndex].is_booked = true;
    }

    appointments[apptIndex] = appointment;

    this._saveToStorage('appointments', appointments);
    this._saveToStorage('appointment_slots', slots);

    const therapist = this._getTherapistById(appointment.therapist_id);
    const appointmentType = this._getAppointmentTypeById(
      appointment.appointment_type_id
    );
    const slot = slots[slotIndex] || null;

    const enrichedAppointment = {
      ...appointment,
      therapist,
      appointmentSlot: slot,
      appointmentType
    };

    return {
      success: true,
      message: 'Appointment confirmed.',
      appointment: enrichedAppointment
    };
  }

  // 12. getTherapistComparisonState
  getTherapistComparisonState() {
    const list = this._getOrCreateTherapistComparisonList();
    const therapists = this._getFromStorage('therapists');

    const selectedTherapists = list.therapist_ids
      .map((id) => therapists.find((t) => t.id === id) || null)
      .filter((t) => t !== null);

    return {
      therapistIds: list.therapist_ids.slice(),
      therapists: selectedTherapists,
      maxSelectable: 2,
      canCompare: selectedTherapists.length === 2
    };
  }

  // 13. toggleTherapistInComparison
  toggleTherapistInComparison(therapistId) {
    const key = 'therapist_comparison_lists';
    const lists = this._getFromStorage(key);
    const now = this._nowISO();

    let list = lists[0];
    if (!list) {
      list = this._getOrCreateTherapistComparisonList();
    }

    const idx = list.therapist_ids.indexOf(therapistId);
    if (idx !== -1) {
      list.therapist_ids.splice(idx, 1);
    } else {
      if (list.therapist_ids.length >= 2) {
        // Remove the oldest selection (first)
        list.therapist_ids.shift();
      }
      list.therapist_ids.push(therapistId);
    }

    list.updated_at = now;
    lists[0] = list;
    this._saveToStorage(key, lists);

    const therapists = this._getFromStorage('therapists');
    const selectedTherapists = list.therapist_ids
      .map((id) => therapists.find((t) => t.id === id) || null)
      .filter((t) => t !== null);

    return {
      therapistIds: list.therapist_ids.slice(),
      therapists: selectedTherapists,
      maxSelectable: 2,
      canCompare: selectedTherapists.length === 2
    };
  }

  // 14. getTherapistComparisonDetails
  getTherapistComparisonDetails() {
    const list = this._getOrCreateTherapistComparisonList();
    const therapists = this._getFromStorage('therapists');

    const details = list.therapist_ids
      .map((id) => therapists.find((t) => t.id === id) || null)
      .filter((t) => t !== null)
      .map((therapist) => {
        const feesSummary = {
          standardSessionFee: therapist.standard_session_fee || null,
          slidingScaleAvailable: !!therapist.sliding_scale_available,
          slidingScaleMinFee: therapist.sliding_scale_min_fee || null,
          slidingScaleMaxFee: therapist.sliding_scale_max_fee || null
        };

        const formatsAvailable = [];
        if (therapist.offers_in_person) formatsAvailable.push('in_person');
        if (therapist.offers_online) formatsAvailable.push('online');

        const locationSummary = [
          therapist.office_city,
          therapist.office_state,
          therapist.office_zip
        ]
          .filter(Boolean)
          .join(', ');

        return {
          therapist,
          feesSummary,
          formatsAvailable,
          rating: therapist.rating != null ? therapist.rating : null,
          hasWeekendAvailability: !!therapist.has_weekend_availability,
          locationSummary
        };
      });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task2_comparisonViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { therapists: details };
  }

  // 15. getTherapistDetails
  getTherapistDetails(therapistId) {
    const therapist = this._getTherapistById(therapistId);
    if (!therapist) {
      return {
        therapist: null,
        specialtiesDisplay: [],
        sessionFormatsAvailable: [],
        feesSummary: {
          standardSessionFee: null,
          slidingScaleAvailable: false,
          slidingScaleRangeLabel: ''
        },
        ratingSummary: {
          averageRating: null,
          ratingCount: 0
        },
        scheduleOverview: {
          nextInPersonSlot: null,
          nextOnlineSlot: null
        }
      };
    }

    const specialtiesDisplay = therapist.specialties || [];

    const sessionFormatsAvailable = [];
    if (therapist.offers_in_person) sessionFormatsAvailable.push('in_person');
    if (therapist.offers_online) sessionFormatsAvailable.push('online');

    let slidingScaleRangeLabel = '';
    if (therapist.sliding_scale_available) {
      const min = therapist.sliding_scale_min_fee;
      const max = therapist.sliding_scale_max_fee;
      if (min != null && max != null) {
        slidingScaleRangeLabel = '$' + min + '–$' + max + ' (sliding scale)';
      } else if (min != null) {
        slidingScaleRangeLabel = 'From $' + min + ' (sliding scale)';
      }
    }

    const feesSummary = {
      standardSessionFee: therapist.standard_session_fee || null,
      slidingScaleAvailable: !!therapist.sliding_scale_available,
      slidingScaleRangeLabel
    };

    const ratingSummary = {
      averageRating: therapist.rating != null ? therapist.rating : null,
      ratingCount: therapist.rating_count != null ? therapist.rating_count : 0
    };

    const slots = this._getFromStorage('appointment_slots');
    const futureSlots = slots
      .filter((s) => s.therapist_id === therapistId && !s.is_booked)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    let nextInPersonSlot = null;
    let nextOnlineSlot = null;

    for (const s of futureSlots) {
      if (!nextInPersonSlot && s.session_format === 'in_person') {
        nextInPersonSlot = {
          ...s,
          therapist,
          appointmentType: this._getAppointmentTypeById(s.appointment_type_id)
        };
      }
      if (!nextOnlineSlot && s.session_format === 'online') {
        nextOnlineSlot = {
          ...s,
          therapist,
          appointmentType: this._getAppointmentTypeById(s.appointment_type_id)
        };
      }
      if (nextInPersonSlot && nextOnlineSlot) break;
    }

    const scheduleOverview = {
      nextInPersonSlot,
      nextOnlineSlot
    };

    return {
      therapist,
      specialtiesDisplay,
      sessionFormatsAvailable,
      feesSummary,
      ratingSummary,
      scheduleOverview
    };
  }

  // 16. getTherapistAppointmentTypes
  getTherapistAppointmentTypes(therapistId) {
    const slots = this._getFromStorage('appointment_slots');
    const types = this._getFromStorage('appointment_types');

    const typeIds = new Set();
    slots.forEach((s) => {
      if (s.therapist_id === therapistId) {
        typeIds.add(s.appointment_type_id);
      }
    });

    return types.filter((t) => typeIds.has(t.id));
  }

  // 17. getPricingOverview
  getPricingOverview() {
    const therapists = this._getFromStorage('therapists');
    const groupPrograms = this._getFromStorage('group_programs');

    let indivMin = null;
    let indivMax = null;

    therapists.forEach((t) => {
      if (typeof t.standard_session_fee === 'number') {
        if (indivMin === null || t.standard_session_fee < indivMin)
          indivMin = t.standard_session_fee;
        if (indivMax === null || t.standard_session_fee > indivMax)
          indivMax = t.standard_session_fee;
      }
      if (t.sliding_scale_min_fee != null) {
        if (indivMin === null || t.sliding_scale_min_fee < indivMin)
          indivMin = t.sliding_scale_min_fee;
      }
      if (t.sliding_scale_max_fee != null) {
        if (indivMax === null || t.sliding_scale_max_fee > indivMax)
          indivMax = t.sliding_scale_max_fee;
      }
    });

    const individualSessionFeeRange = {
      min: indivMin != null ? indivMin : 0,
      max: indivMax != null ? indivMax : 0,
      currency: 'USD'
    };

    // For telehealth, approximate using same range (or subset of therapists offering online)
    let teleMin = null;
    let teleMax = null;
    therapists
      .filter((t) => t.offers_online)
      .forEach((t) => {
        if (typeof t.standard_session_fee === 'number') {
          if (teleMin === null || t.standard_session_fee < teleMin)
            teleMin = t.standard_session_fee;
          if (teleMax === null || t.standard_session_fee > teleMax)
            teleMax = t.standard_session_fee;
        }
      });

    const telehealthSessionFeeRange = {
      min: teleMin != null ? teleMin : individualSessionFeeRange.min,
      max: teleMax != null ? teleMax : individualSessionFeeRange.max,
      currency: 'USD'
    };

    let groupMin = null;
    let groupMax = null;
    groupPrograms.forEach((g) => {
      if (typeof g.fee_per_session === 'number') {
        if (groupMin === null || g.fee_per_session < groupMin)
          groupMin = g.fee_per_session;
        if (groupMax === null || g.fee_per_session > groupMax)
          groupMax = g.fee_per_session;
      }
    });

    const groupSessionFeeRange = {
      min: groupMin != null ? groupMin : 0,
      max: groupMax != null ? groupMax : 0,
      currency: 'USD'
    };

    // Sliding-scale example from therapists
    let slideMin = null;
    let slideMax = null;
    therapists
      .filter((t) => t.sliding_scale_available)
      .forEach((t) => {
        if (t.sliding_scale_min_fee != null) {
          if (slideMin === null || t.sliding_scale_min_fee < slideMin)
            slideMin = t.sliding_scale_min_fee;
        }
        if (t.sliding_scale_max_fee != null) {
          if (slideMax === null || t.sliding_scale_max_fee > slideMax)
            slideMax = t.sliding_scale_max_fee;
        }
      });

    const slidingScaleDescription =
      'We reserve a limited number of sliding-scale spots based on household income and financial need.';

    const slidingScaleExample = {
      minFee: slideMin != null ? slideMin : 0,
      maxFee: slideMax != null ? slideMax : 0,
      notes:
        'Actual sliding-scale fees vary by therapist availability and financial screening.'
    };

    const insuranceOverviewText =
      'We are in-network with select plans and can provide superbills for out-of-network reimbursement. Copays and coverage vary by plan.';

    return {
      individualSessionFeeRange,
      telehealthSessionFeeRange,
      groupSessionFeeRange,
      slidingScaleDescription,
      slidingScaleExample,
      insuranceOverviewText
    };
  }

  // 18. getInsurancePlans
  getInsurancePlans(sortBy, onlyActive = true) {
    let plans = this._getFromStorage('insurance_plans');

    if (onlyActive) {
      plans = plans.filter((p) => p.is_active !== false);
    }

    if (sortBy === 'copay_low_to_high') {
      plans.sort((a, b) => a.copay_amount - b.copay_amount);
    } else if (sortBy === 'copay_high_to_low') {
      plans.sort((a, b) => b.copay_amount - a.copay_amount);
    } else if (sortBy === 'name_az') {
      plans.sort((a, b) => a.name.localeCompare(b.name));
    }

    return plans;
  }

  // 19. getContactReasonOptions
  getContactReasonOptions() {
    return [
      {
        value: 'general_question',
        label: 'General question',
        description: 'Ask about our services, therapists, or how we work.'
      },
      {
        value: 'scheduling',
        label: 'Scheduling',
        description: 'Questions about appointments, rescheduling, or cancellations.'
      },
      {
        value: 'insurance_billing',
        label: 'Insurance or billing',
        description: 'Questions about fees, insurance coverage, or superbills.'
      },
      {
        value: 'feedback',
        label: 'Feedback',
        description: 'Share feedback about your experience with our practice.'
      },
      {
        value: 'technical_issue',
        label: 'Technical issue',
        description: 'Report an issue with the website or telehealth platform.'
      },
      {
        value: 'crisis_support',
        label: 'Crisis support',
        description:
          'If you are in crisis, please also use crisis resources listed on our Crisis Support page.'
      }
    ];
  }

  // 20. submitContactMessage
  submitContactMessage(
    reason,
    name,
    email,
    phone,
    message,
    insurancePlanId,
    referencedCopayAmount
  ) {
    const key = 'contact_messages';
    const messages = this._getFromStorage(key);
    const now = this._nowISO();

    const contactMessage = {
      id: this._generateId('contact'),
      reason,
      name,
      email,
      phone: phone || '',
      message,
      created_at: now,
      status: 'new',
      insurance_plan_id: insurancePlanId || null,
      referenced_copay_amount:
        typeof referencedCopayAmount === 'number' ? referencedCopayAmount : null
    };

    messages.push(contactMessage);
    this._saveToStorage(key, messages);

    // Foreign key resolution
    const plan = insurancePlanId ? this._getInsurancePlanById(insurancePlanId) : null;
    const enriched = {
      ...contactMessage,
      insurancePlan: plan
    };

    return {
      success: true,
      message: 'Message submitted.',
      contactMessage: enriched
    };
  }

  // 21. getGroupFilterOptions
  getGroupFilterOptions() {
    const now = new Date();
    const upcomingMonths = [];

    // Next 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const value = year + '-' + month;
      const startDate = value + '-01';
      // Last day of month
      const end = new Date(year, d.getMonth() + 1, 0);
      const endDate = this._getISODate(end);
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });

      upcomingMonths.push({ value, label, startDate, endDate });
    }

    const topics = [
      { value: 'social_anxiety', label: 'Social Anxiety' },
      { value: 'general_anxiety', label: 'General Anxiety' },
      { value: 'depression_support', label: 'Depression Support' },
      { value: 'parenting', label: 'Parenting & Families' },
      { value: 'trauma_recovery', label: 'Trauma Recovery' },
      { value: 'teens', label: 'Teens & Young Adults' },
      { value: 'lgbtq', label: 'LGBTQ+ Support' },
      { value: 'other', label: 'Other Groups' }
    ];

    const formats = [
      { value: 'in_person', label: 'In-person' },
      { value: 'online', label: 'Online' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    return {
      topics,
      formats,
      upcomingMonths
    };
  }

  // 22. searchGroupPrograms
  searchGroupPrograms(filters) {
    const { topic, startDateFrom, startDateTo, format } = filters || {};

    const programs = this._getFromStorage('group_programs').filter(
      (g) => g.is_active !== false
    );
    const sessions = this._getFromStorage('group_sessions').filter(
      (s) => s.is_active !== false
    );

    const startFrom = startDateFrom ? new Date(startDateFrom + 'T00:00:00') : null;
    const startTo = startDateTo ? new Date(startDateTo + 'T23:59:59') : null;

    const results = programs
      .filter((g) => {
        if (topic && g.topic !== topic) return false;
        if (format && g.format !== format) return false;

        const gStart = new Date(g.start_date);
        if (startFrom && gStart < startFrom) return false;
        if (startTo && gStart > startTo) return false;

        return true;
      })
      .map((g) => {
        const programSessions = sessions.filter(
          (s) => s.group_program_id === g.id
        );

        let firstSessionStartDate = null;
        let hasEveningSession = false;

        programSessions.forEach((s) => {
          if (s.start_date) {
            const d = new Date(s.start_date);
            if (
              !firstSessionStartDate ||
              d < new Date(firstSessionStartDate)
            ) {
              firstSessionStartDate = this._getISODate(d);
            }
          }
          if (s.is_evening) hasEveningSession = true;
        });

        if (!firstSessionStartDate) {
          firstSessionStartDate = this._getISODate(new Date(g.start_date));
        }

        return {
          groupProgram: g,
          firstSessionStartDate,
          hasEveningSession
        };
      });

    return results;
  }

  // 23. getGroupDetails
  getGroupDetails(groupProgramId) {
    const program = this._getGroupProgramById(groupProgramId);
    const allSessions = this._getFromStorage('group_sessions');

    const sessions = allSessions
      .filter((s) => s.group_program_id === groupProgramId)
      .map((s) => ({
        ...s,
        groupProgram: program
      }));

    return {
      groupProgram: program,
      sessions
    };
  }

  // 24. getGroupRegistrationContext
  getGroupRegistrationContext(groupSessionId) {
    const session = this._getGroupSessionById(groupSessionId);
    const program = session ? this._getGroupProgramById(session.group_program_id) : null;

    return {
      groupProgram: program,
      groupSession: session,
      defaultNumParticipants: 1,
      allowedPaymentOptions: ['pay_now', 'pay_later', 'pay_at_first_session']
    };
  }

  // 25. submitGroupRegistration
  submitGroupRegistration(
    groupSessionId,
    participantFirstName,
    participantLastName,
    participantEmail,
    numParticipants,
    paymentOption
  ) {
    const sessions = this._getFromStorage('group_sessions');
    const programs = this._getFromStorage('group_programs');
    const registrations = this._getFromStorage('group_registrations');

    const sessionIndex = sessions.findIndex((s) => s.id === groupSessionId);
    if (sessionIndex === -1) {
      return {
        success: false,
        message: 'Group session not found.',
        registration: null
      };
    }

    const session = sessions[sessionIndex];
    const program = programs.find((g) => g.id === session.group_program_id) || null;

    const capacity = session.capacity != null ? session.capacity : null;
    const current = session.registered_count != null ? session.registered_count : 0;

    if (capacity != null && current + numParticipants > capacity) {
      return {
        success: false,
        message: 'This group session is already full.',
        registration: null
      };
    }

    const now = this._nowISO();
    const registration = {
      id: this._generateId('group_reg'),
      group_program_id: session.group_program_id,
      group_session_id: groupSessionId,
      participant_first_name: participantFirstName,
      participant_last_name: participantLastName,
      participant_email: participantEmail,
      num_participants: numParticipants,
      payment_option: paymentOption,
      status: 'pending',
      created_at: now
    };

    registrations.push(registration);

    // Update session registered count
    session.registered_count = current + numParticipants;
    sessions[sessionIndex] = session;

    this._saveToStorage('group_registrations', registrations);
    this._saveToStorage('group_sessions', sessions);

    const enriched = {
      ...registration,
      groupProgram: program,
      groupSession: session
    };

    return {
      success: true,
      message: 'Registration submitted.',
      registration: enriched
    };
  }

  // 26. getAssessmentList
  getAssessmentList() {
    const assessments = this._getFromStorage('assessments');
    return assessments;
  }

  // 27. startAssessmentSession
  startAssessmentSession(assessmentCode) {
    const assessment = this._getAssessmentByCode(assessmentCode);
    if (!assessment) {
      return {
        assessmentSession: null,
        assessment: null,
        questions: []
      };
    }

    const session = this._getOrCreateAssessmentSession(assessment.id);

    const questionsAll = this._getFromStorage('assessment_questions');
    const optionsAll = this._getFromStorage('assessment_options');

    const questionsWithOptions = questionsAll
      .filter((q) => q.assessment_id === assessment.id)
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        let options = optionsAll
          .filter((o) => o.assessment_question_id === q.id)
          .sort((a, b) => a.order - b.order);

        // Fallback: if no options are defined for this question, reuse a shared option set
        // from other questions in the same assessment (e.g., PHQ-9 uses the same scale
        // for every item). This ensures every question has options even if the seed
        // data only attaches options to one question.
        if (options.length === 0) {
          options = optionsAll
            .filter((o) => {
              const parentQuestion = questionsAll.find(
                (pq) => pq.id === o.assessment_question_id
              );
              return parentQuestion && parentQuestion.assessment_id === assessment.id;
            })
            .sort((a, b) => a.order - b.order);
        }

        return { question: q, options };
      });

    return {
      assessmentSession: session,
      assessment,
      questions: questionsWithOptions
    };
  }

  // 28. submitAssessmentSession
  submitAssessmentSession(assessmentSessionId, responses) {
    const sessions = this._getFromStorage('assessment_sessions');
    const optionsAll = this._getFromStorage('assessment_options');
    let responsesAll = this._getFromStorage('assessment_responses');

    const session = sessions.find((s) => s.id === assessmentSessionId);
    if (!session) {
      return {
        success: false,
        message: 'Assessment session not found.',
        assessmentResult: null
      };
    }

    // Remove existing responses for this session
    responsesAll = responsesAll.filter(
      (r) => r.assessment_session_id !== assessmentSessionId
    );

    // Add new responses
    responses.forEach((r) => {
      const opt = optionsAll.find((o) => o.id === r.assessmentOptionId);
      if (!opt) return;
      const response = {
        id: this._generateId('assess_resp'),
        assessment_session_id: assessmentSessionId,
        assessment_question_id: r.assessmentQuestionId,
        assessment_option_id: r.assessmentOptionId,
        numeric_value: opt.value
      };
      responsesAll.push(response);
    });

    this._saveToStorage('assessment_responses', responsesAll);

    const assessmentResult = this._computeAssessmentResultFromResponses(
      assessmentSessionId
    );

    if (!assessmentResult) {
      return {
        success: false,
        message: 'Unable to compute assessment result.',
        assessmentResult: null
      };
    }

    return {
      success: true,
      message: 'Assessment submitted.',
      assessmentResult
    };
  }

  // 29. getAssessmentResultDetails
  getAssessmentResultDetails(assessmentResultId) {
    const results = this._getFromStorage('assessment_results');
    const sessions = this._getFromStorage('assessment_sessions');
    const assessments = this._getFromStorage('assessments');
    const articles = this._getFromStorage('articles');

    const assessmentResult = results.find((r) => r.id === assessmentResultId) || null;
    if (!assessmentResult) {
      return {
        assessmentResult: null,
        assessment: null,
        severityDescription: '',
        recommendationsText: '',
        recommendedArticlesPreview: []
      };
    }

    const session = sessions.find(
      (s) => s.id === assessmentResult.assessment_session_id
    );
    const assessment = session
      ? assessments.find((a) => a.id === session.assessment_id) || null
      : null;

    let severityDescription = '';
    switch (assessmentResult.severity_level) {
      case 'minimal':
        severityDescription =
          'Minimal symptoms. Still, if you are struggling, it may help to talk with someone.';
        break;
      case 'mild':
        severityDescription =
          'Mild symptoms. Consider self-care strategies and monitoring changes over time.';
        break;
      case 'moderate':
        severityDescription =
          'Moderate symptoms. Many people in this range benefit from counseling support.';
        break;
      case 'moderately_severe':
        severityDescription =
          'Moderately severe symptoms. We encourage reaching out to a therapist soon.';
        break;
      case 'severe':
        severityDescription =
          'Severe symptoms. Please consider seeking support promptly and use crisis resources if needed.';
        break;
    }

    const recommendedArticlesPreview = (assessmentResult.recommended_article_ids || [])
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => a !== null)
      .slice(0, 3);

    const recommendationsText =
      'These results are not a diagnosis. They can be a starting point for a conversation with a mental health professional.';

    return {
      assessmentResult,
      assessment,
      severityDescription,
      recommendationsText,
      recommendedArticlesPreview
    };
  }

  // 30. getRecommendedArticlesForAssessmentResult
  getRecommendedArticlesForAssessmentResult(assessmentResultId) {
    const results = this._getFromStorage('assessment_results');
    const articles = this._getFromStorage('articles');

    const result = results.find((r) => r.id === assessmentResultId);
    if (!result) return [];

    const recommended = (result.recommended_article_ids || [])
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => a !== null);

    return recommended;
  }

  // 31. getArticlesByTopic
  getArticlesByTopic(topic, limit = 20, offset = 0) {
    let articles = this._getFromStorage('articles');
    if (topic) {
      articles = articles.filter((a) => (a.topics || []).includes(topic));
    }

    return articles.slice(offset, offset + limit);
  }

  // 32. getSavedReadingList
  getSavedReadingList() {
    const readingList = this._getOrCreateReadingList();
    const articles = this._getFromStorage('articles');

    const savedArticles = (readingList.article_ids || [])
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => a !== null);

    const privacyNote =
      'Your reading list is private and stored only for your personal reference on this device.';

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task7_readingListViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      readingList,
      articles: savedArticles,
      privacyNote
    };
  }

  // 33. saveArticleToReadingList
  saveArticleToReadingList(articleId) {
    const key = 'reading_lists';
    const lists = this._getFromStorage(key);
    let list = lists[0];

    if (!list) {
      list = this._getOrCreateReadingList();
    }

    if (!list.article_ids.includes(articleId)) {
      list.article_ids.push(articleId);
    }

    list.updated_at = this._nowISO();
    lists[0] = list;
    this._saveToStorage(key, lists);

    return {
      success: true,
      message: 'Article saved to reading list.',
      readingList: list
    };
  }

  // 34. removeArticleFromReadingList
  removeArticleFromReadingList(articleId) {
    const key = 'reading_lists';
    const lists = this._getFromStorage(key);
    let list = lists[0];

    if (!list) {
      list = this._getOrCreateReadingList();
    }

    list.article_ids = (list.article_ids || []).filter((id) => id !== articleId);
    list.updated_at = this._nowISO();
    lists[0] = list;
    this._saveToStorage(key, lists);

    return {
      success: true,
      message: 'Article removed from reading list.',
      readingList: list
    };
  }

  // 35. getCrisisSupportContent
  getCrisisSupportContent() {
    const hotlines = this._getFromStorage('crisis_hotlines');

    const localHotlines = hotlines.filter(
      (h) => h.hotline_type === 'local' || h.is_local
    );
    const nationalHotlines = hotlines.filter(
      (h) => h.hotline_type === 'national'
    );
    const specializedHotlines = hotlines.filter(
      (h) => h.hotline_type === 'specialized'
    );

    const introText =
      'If you are in immediate danger, please call your local emergency number or go to the nearest emergency room.';
    const emergencyInstructions =
      'These crisis lines are for urgent support. If you are not in crisis but would like counseling, you can request an appointment from our homepage.';

    return {
      introText,
      emergencyInstructions,
      localHotlines,
      nationalHotlines,
      specializedHotlines
    };
  }

  // 36. getSafetyPlan
  getSafetyPlan() {
    const { plan, createdNew } = this._getOrCreateSafetyPlan();

    const warningSignsExamples = [
      'I isolate and stop answering messages.',
      'My sleep changes a lot (too much or very little).',
      'I feel numb or disconnected from people around me.'
    ];

    const copingStrategiesExamples = [
      'Go for a 10-minute walk and notice my surroundings.',
      'Call or text a trusted friend or family member.',
      'Use a grounding exercise (5 things I can see, 4 I can touch, etc.).'
    ];

    return {
      safetyPlan: plan,
      hasExistingPlan: !createdNew,
      warningSignsExamples,
      copingStrategiesExamples
    };
  }

  // 37. saveSafetyPlan
  saveSafetyPlan(crisisContacts, warningSigns, copingStrategies) {
    const key = 'safety_plans';
    const data = this._getFromStorage(key);
    const now = this._nowISO();

    let plan = data[0];
    if (!plan) {
      const res = this._getOrCreateSafetyPlan();
      plan = res.plan;
    }

    plan.crisis_contacts = crisisContacts || [];
    plan.warning_signs = warningSigns || [];
    plan.coping_strategies = copingStrategies || [];
    plan.updated_at = now;

    data[0] = plan;
    this._saveToStorage(key, data);

    return {
      success: true,
      message: 'Safety plan saved.',
      safetyPlan: plan
    };
  }

  // 38. getCrisisHotlines
  getCrisisHotlines(hotlineType, isLocal) {
    let hotlines = this._getFromStorage('crisis_hotlines');

    if (hotlineType) {
      hotlines = hotlines.filter((h) => h.hotline_type === hotlineType);
    }

    if (typeof isLocal === 'boolean') {
      hotlines = hotlines.filter((h) => !!h.is_local === isLocal);
    }

    return hotlines;
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