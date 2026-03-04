// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  // ---------------------- STORAGE HELPERS ----------------------

  _initStorage() {
    const keys = [
      'counselors',
      'session_offerings',
      'availability_slots',
      'bookings',
      'webinars',
      'webinar_registrations',
      'family_schedules',
      'schedule_activities',
      'assessments',
      'assessment_questions',
      'assessment_options',
      'assessment_results',
      'assessment_recommended_articles',
      'articles',
      'reading_lists',
      'reading_list_items',
      'programs',
      'program_enrollments',
      'learning_resources',
      'learning_paths',
      'learning_path_items',
      'carts',
      'cart_items',
      'discount_codes',
      'contact_requests'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  // ---------------------- HOMEPAGE & GLOBAL SEARCH ----------------------

  getHomepageContent() {
    const counselors = this._getFromStorage('counselors');
    const webinars = this._getFromStorage('webinars');
    const programs = this._getFromStorage('programs');
    const articles = this._getFromStorage('articles');
    const assessments = this._getFromStorage('assessments');

    const featured_counselors = counselors
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    const upcomingWebinars = webinars
      .slice()
      .filter(w => this._parseDate(w.start_datetime) && this._parseDate(w.start_datetime) >= new Date())
      .sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime));
    const featured_webinars = upcomingWebinars.slice(0, 3);

    const featured_programs = programs
      .slice()
      .filter(p => p.status === 'active')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    const featured_articles = articles
      .slice()
      .filter(a => a.is_published)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);

    const featured_assessments = assessments
      .slice()
      .filter(a => a.status === 'active')
      .slice(0, 3);

    const quick_actions = [
      {
        id: 'qa_book_couples_session',
        label: 'Book Couples Counseling',
        description: 'Find an online couples counselor and book a session.',
        target_page: 'counselors_search'
      },
      {
        id: 'qa_parenting_webinars',
        label: 'Parenting Workshops & Webinars',
        description: 'See upcoming live workshops for parents.',
        target_page: 'workshops_webinars'
      },
      {
        id: 'qa_family_planner',
        label: 'Weekly Family Planner',
        description: 'Plan time together with a weekly family schedule.',
        target_page: 'family_planner'
      },
      {
        id: 'qa_learning_paths',
        label: 'Guided Learning Paths',
        description: 'Follow step-by-step paths for key family topics.',
        target_page: 'learning_paths'
      },
      {
        id: 'qa_articles',
        label: 'Articles & Resources',
        description: 'Browse practical articles for common family challenges.',
        target_page: 'articles_resources'
      }
    ];

    return {
      quick_actions,
      featured_counselors,
      featured_webinars,
      featured_programs,
      featured_articles,
      featured_assessments
    };
  }

  globalSearch(query, limit_per_type) {
    const q = (query || '').trim().toLowerCase();
    const limit = typeof limit_per_type === 'number' && limit_per_type > 0 ? limit_per_type : 5;

    const counselors = this._getFromStorage('counselors');
    const programs = this._getFromStorage('programs');
    const articles = this._getFromStorage('articles');
    const webinars = this._getFromStorage('webinars');

    if (!q) {
      return {
        counselors: counselors.slice(0, limit),
        programs: programs.slice(0, limit),
        articles: articles.slice(0, limit),
        webinars: webinars.slice(0, limit)
      };
    }

    function matchText(text) {
      return text && text.toLowerCase().indexOf(q) !== -1;
    }

    const matchedCounselors = counselors.filter(c =>
      matchText(c.full_name) || matchText(c.bio || '')
    ).slice(0, limit);

    const matchedPrograms = programs.filter(p =>
      matchText(p.title) || matchText(p.short_description || '') || matchText(p.long_description || '')
    ).slice(0, limit);

    const matchedArticles = articles.filter(a => {
      const inTags = Array.isArray(a.tags) && a.tags.some(t => matchText(t));
      return matchText(a.title) || matchText(a.short_description || '') || inTags;
    }).slice(0, limit);

    const matchedWebinars = webinars.filter(w =>
      matchText(w.title) || matchText(w.short_description || '')
    ).slice(0, limit);

    return {
      counselors: matchedCounselors,
      programs: matchedPrograms,
      articles: matchedArticles,
      webinars: matchedWebinars
    };
  }

  // ---------------------- COUNSELORS & BOOKINGS ----------------------

  getCounselorSearchFilterOptions() {
    const service_types = [
      { value: 'couples_counseling', label: 'Couples Counseling' },
      { value: 'premarital_counseling', label: 'Premarital Counseling' },
      { value: 'individual_counseling', label: 'Individual Counseling' },
      { value: 'family_counseling', label: 'Family Counseling' },
      { value: 'group_counseling', label: 'Group Counseling' }
    ];

    const specializations = [
      { value: 'blended_families', label: 'Blended Families' },
      { value: 'parenting_teens', label: 'Parenting Teens' },
      { value: 'anger_management', label: 'Anger Management' },
      { value: 'conflict_resolution', label: 'Conflict Resolution' },
      { value: 'communication_skills', label: 'Communication Skills' },
      { value: 'sibling_relationships', label: 'Sibling Relationships' },
      { value: 'general_family_issues', label: 'General Family Issues' }
    ];

    const session_formats = [
      { value: 'online_video', label: 'Online / Video' },
      { value: 'in_person', label: 'In-Person' },
      { value: 'phone_call', label: 'Phone Call' }
    ];

    const session_types = [
      { value: 'standard_session', label: 'Standard Session' },
      { value: 'introductory_call', label: 'Introductory Call' },
      { value: 'initial_consultation', label: 'Initial Consultation' }
    ];

    const rating_thresholds = [
      { value: 3.0, label: '3.0 stars & up' },
      { value: 4.0, label: '4.0 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];

    const session_lengths_minutes = [30, 45, 50, 60, 75, 90];

    const time_of_day_presets = [
      { id: 'morning', label: 'Morning (8 AM - 12 PM)', start_hour: 8, end_hour: 12 },
      { id: 'afternoon', label: 'Afternoon (1 PM - 9 PM)', start_hour: 13, end_hour: 21 },
      { id: 'early_evening', label: 'Early Evening (6 PM - 9 PM)', start_hour: 18, end_hour: 21 }
    ];

    const sort_options = [
      { value: 'earliest_available', label: 'Earliest Available' },
      { value: 'soonest_appointment', label: 'Soonest Appointment' },
      { value: 'highest_rated', label: 'Highest Rated' },
      { value: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    return {
      service_types,
      specializations,
      session_formats,
      session_types,
      rating_thresholds,
      session_lengths_minutes,
      time_of_day_presets,
      sort_options
    };
  }

  searchCounselors(filters, sort_by, page, page_size) {
    const counselors = this._getFromStorage('counselors');
    const offerings = this._getFromStorage('session_offerings');
    const slots = this._getFromStorage('availability_slots');

    const f = filters || {};
    const sortBy = sort_by || 'earliest_available';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;

    let timePresetMap = {};
    const presets = this.getCounselorSearchFilterOptions().time_of_day_presets;
    for (let i = 0; i < presets.length; i++) {
      timePresetMap[presets[i].id] = presets[i];
    }

    const startDate = f.available_start_date ? new Date(f.available_start_date + 'T00:00:00') : null;
    const endDate = f.available_end_date ? new Date(f.available_end_date + 'T23:59:59') : null;
    const preset = f.time_of_day_preset_id ? timePresetMap[f.time_of_day_preset_id] : null;

    const results = [];

    for (let i = 0; i < counselors.length; i++) {
      const c = counselors[i];

      if (typeof f.min_rating === 'number' && (c.rating || 0) < f.min_rating) {
        continue;
      }

      if (f.specialization && c.specialization !== f.specialization) {
        continue;
      }

      // Find offerings for this counselor that match filters
      const counselorOfferings = offerings.filter(o => {
        if (o.counselor_id !== c.id) return false;
        if (!o.is_active) return false;
        if (f.service_type && o.service_type !== f.service_type) return false;
        if (f.session_format && o.session_format !== f.session_format) return false;
        if (f.session_type && o.session_type !== f.session_type) return false;
        if (typeof f.session_length_minutes === 'number' && o.duration_minutes !== f.session_length_minutes) return false;
        if (typeof f.max_price === 'number' && o.price > f.max_price) return false;
        if (f.is_free_only && !o.is_free) return false;
        return true;
      });

      if (counselorOfferings.length === 0) {
        continue;
      }

      // Compute min price among matched offerings
      let minPriceForFilters = counselorOfferings.reduce((min, o) => {
        return o.price < min ? o.price : min;
      }, counselorOfferings[0].price);

      // Find earliest matching availability slot
      let earliestSlot = null;
      for (let j = 0; j < counselorOfferings.length; j++) {
        const off = counselorOfferings[j];
        for (let k = 0; k < slots.length; k++) {
          const s = slots[k];
          if (s.counselor_id !== c.id) continue;
          if (s.session_offering_id !== off.id) continue;
          if (s.is_booked) continue;
          const sd = this._parseDate(s.start_datetime);
          if (!sd) continue;
          if (startDate && sd < startDate) continue;
          if (endDate && sd > endDate) continue;
          if (preset) {
            const hour = sd.getUTCHours();
            if (hour < preset.start_hour || hour >= preset.end_hour) continue;
          }
          if (!earliestSlot || sd < this._parseDate(earliestSlot.start_datetime)) {
            earliestSlot = s;
          }
        }
      }

      // If availability date filters were provided and no matching slot, skip counselor
      if ((startDate || endDate || preset) && !earliestSlot) {
        continue;
      }

      results.push({
        counselor: c,
        primary_service_label: c.primary_service_type,
        specialization_label: c.specialization,
        min_price_for_filters: minPriceForFilters,
        available_soonest_slot_start: earliestSlot ? earliestSlot.start_datetime : null
      });
    }

    // Sorting
    results.sort((a, b) => {
      if (sortBy === 'highest_rated') {
        return (b.counselor.rating || 0) - (a.counselor.rating || 0);
      }
      if (sortBy === 'price_low_to_high') {
        return (a.min_price_for_filters || 0) - (b.min_price_for_filters || 0);
      }
      if (sortBy === 'soonest_appointment' || sortBy === 'earliest_available') {
        const da = a.available_soonest_slot_start ? this._parseDate(a.available_soonest_slot_start) : null;
        const db = b.available_soonest_slot_start ? this._parseDate(b.available_soonest_slot_start) : null;
        if (da && db) return da - db;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      }
      return 0;
    });

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  getCounselorDetails(counselorId) {
    const counselors = this._getFromStorage('counselors');
    const offerings = this._getFromStorage('session_offerings');

    const counselor = counselors.find(c => c.id === counselorId) || null;
    const active_session_offerings = offerings
      .filter(o => o.counselor_id === counselorId && o.is_active)
      .map(o => Object.assign({}, o, { counselor }));

    return { counselor, active_session_offerings };
  }

  getCounselorAvailability(counselorId, filters) {
    const offerings = this._getFromStorage('session_offerings');
    const slots = this._getFromStorage('availability_slots');
    const counselors = this._getFromStorage('counselors');

    const f = filters || {};
    const counselor = counselors.find(c => c.id === counselorId) || null;

    const startDt = f.start_datetime ? new Date(f.start_datetime) : null;
    const endDt = f.end_datetime ? new Date(f.end_datetime) : null;

    const result = [];

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.counselor_id !== counselorId) continue;
      if (s.is_booked) continue;

      const offering = offerings.find(o => o.id === s.session_offering_id);
      if (!offering) continue;

      if (f.session_offering_id && s.session_offering_id !== f.session_offering_id) continue;
      if (f.service_type && offering.service_type !== f.service_type) continue;
      if (f.session_type && offering.session_type !== f.session_type) continue;
      if (f.session_format && offering.session_format !== f.session_format) continue;
      if (typeof f.max_price === 'number' && offering.price > f.max_price) continue;
      if (typeof f.duration_minutes === 'number' && offering.duration_minutes !== f.duration_minutes) continue;

      const sd = this._parseDate(s.start_datetime);
      if (startDt && sd < startDt) continue;
      if (endDt && sd > endDt) continue;

      if (typeof f.time_of_day_start_hour === 'number' || typeof f.time_of_day_end_hour === 'number') {
        const hour = sd.getUTCHours();
        if (typeof f.time_of_day_start_hour === 'number' && hour < f.time_of_day_start_hour) continue;
        if (typeof f.time_of_day_end_hour === 'number' && hour >= f.time_of_day_end_hour) continue;
      }

      const enriched = Object.assign({}, s, {
        counselor,
        session_offering: offering
      });
      result.push(enriched);
    }

    result.sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime));
    return result;
  }

  bookCounselorSlot(availabilitySlotId, client_full_name, client_phone, contact_method, notes) {
    let slots = this._getFromStorage('availability_slots');
    let bookings = this._getFromStorage('bookings');
    const counselors = this._getFromStorage('counselors');
    const offerings = this._getFromStorage('session_offerings');

    const slotIndex = slots.findIndex(s => s.id === availabilitySlotId);
    if (slotIndex === -1) {
      return { booking: null, counselor: null, session_offering: null, message: 'Availability slot not found.' };
    }

    const slot = slots[slotIndex];
    if (slot.is_booked) {
      return { booking: null, counselor: null, session_offering: null, message: 'This time slot is already booked.' };
    }

    const counselor = counselors.find(c => c.id === slot.counselor_id) || null;
    const offering = offerings.find(o => o.id === slot.session_offering_id) || null;

    const booking = {
      id: this._generateId('booking'),
      counselor_id: slot.counselor_id,
      session_offering_id: slot.session_offering_id,
      availability_slot_id: slot.id,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      client_full_name,
      client_phone,
      contact_method,
      status: 'booked',
      price: offering ? offering.price : 0,
      is_introductory: offering ? (offering.session_type === 'introductory_call' || offering.session_type === 'initial_consultation') : false,
      notes: notes || '',
      created_at: this._nowIso()
    };

    bookings.push(booking);
    slots[slotIndex] = Object.assign({}, slot, { is_booked: true, updated_at: this._nowIso() });

    this._saveToStorage('bookings', bookings);
    this._saveToStorage('availability_slots', slots);

    return {
      booking,
      counselor,
      session_offering: offering,
      message: 'Booking confirmed.'
    };
  }

  // ---------------------- WEBINARS ----------------------

  getWebinarFilterOptions() {
    const topic_categories = [
      { value: 'parenting_teens', label: 'Parenting Teens' },
      { value: 'couples_communication', label: 'Couples Communication' },
      { value: 'anger_management', label: 'Anger Management' },
      { value: 'parenting_skills', label: 'Parenting Skills' },
      { value: 'general_relationships', label: 'General Relationships' },
      { value: 'general_parenting', label: 'General Parenting' }
    ];

    const price_options = [
      { id: 'free_only', label: 'Free Only' },
      { id: 'paid_only', label: 'Paid Only' }
    ];

    const format_options = [
      { value: 'online_webinar', label: 'Online / Webinar' },
      { value: 'in_person', label: 'In-Person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const sort_options = [
      { value: 'soonest_date', label: 'Soonest Date' },
      { value: 'date_ascending', label: 'Date: Ascending' },
      { value: 'most_popular', label: 'Most Popular' }
    ];

    return {
      topic_categories,
      price_options,
      format_options,
      sort_options
    };
  }

  searchWebinars(filters, sort_by, page, page_size) {
    const webinars = this._getFromStorage('webinars');
    const f = filters || {};
    const sortBy = sort_by || 'soonest_date';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;

    const startDate = f.start_date ? new Date(f.start_date + 'T00:00:00') : null;
    const endDate = f.end_date ? new Date(f.end_date + 'T23:59:59') : null;

    let results = webinars.filter(w => {
      const sd = this._parseDate(w.start_datetime);
      if (!sd) return false;
      if (f.topic_category && w.topic_category !== f.topic_category) return false;
      if (f.is_free_only && !w.is_free) return false;
      if (f.format && w.format !== f.format) return false;
      if (startDate && sd < startDate) return false;
      if (endDate && sd > endDate) return false;
      return true;
    });

    results.sort((a, b) => {
      if (sortBy === 'most_popular') {
        return (b.rating || 0) - (a.rating || 0);
      }
      // soonest_date / date_ascending
      const da = this._parseDate(a.start_datetime);
      const db = this._parseDate(b.start_datetime);
      return da - db;
    });

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  getWebinarDetails(webinarId) {
    const webinars = this._getFromStorage('webinars');
    return webinars.find(w => w.id === webinarId) || null;
  }

  registerForWebinar(webinarId, registrant_name, registrant_phone, format_selection, reminder_method, num_participants, notes) {
    const webinars = this._getFromStorage('webinars');
    let registrations = this._getFromStorage('webinar_registrations');

    const webinar = webinars.find(w => w.id === webinarId) || null;
    if (!webinar) {
      return { registration: null, webinar: null, message: 'Webinar not found.' };
    }

    const registration = {
      id: this._generateId('webinar_reg'),
      webinar_id: webinarId,
      registrant_name,
      registrant_phone,
      format_selection,
      reminder_method,
      num_participants: typeof num_participants === 'number' && num_participants > 0 ? num_participants : 1,
      status: 'registered',
      notes: notes || '',
      created_at: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('webinar_registrations', registrations);

    return {
      registration,
      webinar,
      message: 'Registration completed.'
    };
  }

  // ---------------------- FAMILY SCHEDULES ----------------------

  getFamilySchedules() {
    return this._getFromStorage('family_schedules');
  }

  createFamilySchedule(name, description, week_start_date) {
    let schedules = this._getFromStorage('family_schedules');
    const now = this._nowIso();

    const schedule = {
      id: this._generateId('schedule'),
      name,
      description: description || '',
      week_start_date: week_start_date || null,
      created_at: now,
      updated_at: now
    };

    schedules.push(schedule);
    this._saveToStorage('family_schedules', schedules);
    return schedule;
  }

  getFamilyScheduleDetail(scheduleId) {
    const schedules = this._getFromStorage('family_schedules');
    const activities = this._getFromStorage('schedule_activities');

    const schedule = schedules.find(s => s.id === scheduleId) || null;
    const scheduleActivities = activities
      .filter(a => a.schedule_id === scheduleId)
      .map(a => Object.assign({}, a, { schedule }));

    return { schedule, activities: scheduleActivities };
  }

  addOrUpdateScheduleActivity(scheduleId, activityId, day_of_week, title, start_time, duration_minutes, category, notes) {
    let activities = this._getFromStorage('schedule_activities');
    const now = this._nowIso();

    let activity;
    if (activityId) {
      const index = activities.findIndex(a => a.id === activityId);
      if (index === -1) {
        // Create new if not found
        activity = {
          id: this._generateId('activity'),
          schedule_id: scheduleId,
          day_of_week,
          title,
          start_time,
          duration_minutes,
          category: category || null,
          notes: notes || ''
        };
        activities.push(activity);
      } else {
        activity = Object.assign({}, activities[index], {
          schedule_id: scheduleId,
          day_of_week,
          title,
          start_time,
          duration_minutes,
          category: category || null,
          notes: notes || ''
        });
        activities[index] = activity;
      }
    } else {
      activity = {
        id: this._generateId('activity'),
        schedule_id: scheduleId,
        day_of_week,
        title,
        start_time,
        duration_minutes,
        category: category || null,
        notes: notes || ''
      };
      activities.push(activity);
    }

    this._saveToStorage('schedule_activities', activities);
    const schedule = this._updateFamilyScheduleTimestamps(scheduleId) || null;

    return Object.assign({}, activity, { schedule });
  }

  deleteScheduleActivity(activityId) {
    let activities = this._getFromStorage('schedule_activities');
    const before = activities.length;
    const activity = activities.find(a => a.id === activityId) || null;
    activities = activities.filter(a => a.id !== activityId);
    this._saveToStorage('schedule_activities', activities);
    if (activity && activity.schedule_id) {
      this._updateFamilyScheduleTimestamps(activity.schedule_id);
    }
    return { success: activities.length < before };
  }

  saveFamilySchedule(scheduleId) {
    const schedule = this._updateFamilyScheduleTimestamps(scheduleId);
    const activities = this._getFromStorage('schedule_activities')
      .filter(a => a.schedule_id === scheduleId)
      .map(a => Object.assign({}, a, { schedule }));

    return {
      schedule,
      activities,
      message: 'Family schedule saved.'
    };
  }

  _updateFamilyScheduleTimestamps(scheduleId) {
    let schedules = this._getFromStorage('family_schedules');
    const index = schedules.findIndex(s => s.id === scheduleId);
    if (index === -1) return null;

    const now = this._nowIso();
    const schedule = schedules[index];
    if (!schedule.created_at) {
      schedule.created_at = now;
    }
    schedule.updated_at = now;
    schedules[index] = schedule;
    this._saveToStorage('family_schedules', schedules);
    return schedule;
  }

  // ---------------------- ASSESSMENTS ----------------------

  getAssessmentsList(topic_category) {
    const assessments = this._getFromStorage('assessments');
    return assessments.filter(a => {
      if (a.status !== 'active') return false;
      if (topic_category && a.topic_category !== topic_category) return false;
      return true;
    });
  }

  getAssessmentDetailForTaking(assessmentId) {
    const assessments = this._getFromStorage('assessments');
    const questions = this._getFromStorage('assessment_questions');
    const options = this._getFromStorage('assessment_options');

    const assessment = assessments.find(a => a.id === assessmentId) || null;
    const assessmentQuestions = questions
      .filter(q => q.assessment_id === assessmentId)
      .sort((a, b) => a.order - b.order)
      .map(q => {
        let qOptions = options
          .filter(o => o.question_id === q.id)
          .sort((a, b) => a.order - b.order);
        if (!qOptions || qOptions.length === 0) {
          qOptions = [
            {
              id: q.id + '_opt_a',
              question_id: q.id,
              order: 1,
              option_label: 'A',
              option_text: 'Option A',
              score_value: 1
            },
            {
              id: q.id + '_opt_b',
              question_id: q.id,
              order: 2,
              option_label: 'B',
              option_text: 'Option B',
              score_value: 2
            },
            {
              id: q.id + '_opt_c',
              question_id: q.id,
              order: 3,
              option_label: 'C',
              option_text: 'Option C',
              score_value: 3
            }
          ];
        }
        return { question: q, options: qOptions };
      });

    return { assessment, questions: assessmentQuestions };
  }

  submitAssessmentResponses(assessmentId, responses) {
    return this._createAssessmentResultFromResponses(assessmentId, responses || []);
  }

  _createAssessmentResultFromResponses(assessmentId, responses) {
    const assessments = this._getFromStorage('assessments');
    const questions = this._getFromStorage('assessment_questions');
    const options = this._getFromStorage('assessment_options');
    let results = this._getFromStorage('assessment_results');
    const mappings = this._getFromStorage('assessment_recommended_articles');
    const articles = this._getFromStorage('articles');

    const assessment = assessments.find(a => a.id === assessmentId) || null;

    // Build option score lookup
    const optionScoreMap = {};
    for (let i = 0; i < options.length; i++) {
      optionScoreMap[options[i].id] = options[i].score_value || 0;
    }

    let score_total = 0;
    for (let rIndex = 0; rIndex < responses.length; rIndex++) {
      const resp = responses[rIndex];
      const ids = resp.selected_option_ids || [];
      for (let j = 0; j < ids.length; j++) {
        const val = optionScoreMap[ids[j]] || 0;
        score_total += val;
      }
    }

    // Compute max possible score to derive interpretation
    let max_score = 0;
    const assessmentQuestions = questions.filter(q => q.assessment_id === assessmentId);
    for (let i = 0; i < assessmentQuestions.length; i++) {
      const q = assessmentQuestions[i];
      const qOpts = options.filter(o => o.question_id === q.id);
      let maxForQ = 0;
      for (let j = 0; j < qOpts.length; j++) {
        const val = qOpts[j].score_value || 0;
        if (val > maxForQ) maxForQ = val;
      }
      max_score += maxForQ;
    }

    let interpretation_level = null;
    if (max_score > 0) {
      const ratio = score_total / max_score;
      if (ratio < 0.33) interpretation_level = 'low';
      else if (ratio < 0.66) interpretation_level = 'medium';
      else interpretation_level = 'high';
    }

    const result = {
      id: this._generateId('assessment_result'),
      assessment_id: assessmentId,
      completed_at: this._nowIso(),
      score_total,
      summary_text: '',
      detail_text: '',
      interpretation_level
    };

    results.push(result);
    this._saveToStorage('assessment_results', results);

    // Recommended articles
    const recMappings = mappings
      .filter(m => m.assessment_id === assessmentId)
      .sort((a, b) => a.order - b.order);

    let allArticles = articles.slice();
    const recommended_articles = recMappings.map(m => {
      let article = allArticles.find(a => a.id === m.article_id) || null;
      if (!article) {
        article = {
          id: m.article_id,
          title: m.note || (assessment ? assessment.title + ' Resource' : 'Recommended Resource'),
          short_description: m.note || '',
          content_html: '',
          author_name: '',
          publication_date: this._nowIso(),
          topic_category: assessment ? assessment.topic_category : null,
          tags: [],
          reading_time_minutes: 5,
          rating: 0,
          rating_count: 0,
          is_published: true,
          is_featured: false
        };
        allArticles.push(article);
      }
      return {
        article,
        note: m.note || '',
        order: m.order
      };
    });
    this._saveToStorage('articles', allArticles);

    return { result, recommended_articles };
  }

  // ---------------------- ARTICLES & READING LIST ----------------------

  getArticleFilterOptions() {
    const topic_categories = [
      { value: 'sibling_relationships', label: 'Sibling Relationships' },
      { value: 'conflict_resolution', label: 'Conflict Resolution' },
      { value: 'couples_communication', label: 'Couples Communication' },
      { value: 'parenting_teens', label: 'Parenting Teens' },
      { value: 'anger_management', label: 'Anger Management' },
      { value: 'blended_families', label: 'Blended Families' },
      { value: 'general_parenting', label: 'General Parenting' },
      { value: 'general_relationships', label: 'General Relationships' }
    ];

    const reading_time_presets = [
      { max_minutes: 10, label: 'Under 10 minutes' },
      { max_minutes: 5, label: 'Under 5 minutes' },
      { max_minutes: 20, label: 'Under 20 minutes' }
    ];

    const sort_options = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'top_rated', label: 'Top Rated' },
      { value: 'newest_first', label: 'Newest First' }
    ];

    return {
      topic_categories,
      reading_time_presets,
      sort_options
    };
  }

  searchArticles(query, filters, sort_by, page, page_size) {
    const articles = this._getFromStorage('articles');
    const f = filters || {};
    const q = (query || '').trim().toLowerCase();
    const sortBy = sort_by || 'most_popular';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;

    function matchText(text, qstr) {
      if (!text) return false;
      const lower = text.toLowerCase();
      const query = (qstr || '').toLowerCase();
      if (lower.indexOf(query) !== -1) return true;
      const parts = query.split(/\s+/).filter(Boolean);
      if (parts.length === 0) return false;
      return parts.every(part => lower.indexOf(part) !== -1);
    }

    let results = articles.filter(a => {
      if (!a.is_published) return false;
      if (f.topic_category) {
        if (a.topic_category !== f.topic_category) {
          const tagsLower = Array.isArray(a.tags) ? a.tags.map(t => String(t).toLowerCase()) : [];
          const filterVal = String(f.topic_category).toLowerCase();
          if (!tagsLower.includes(filterVal)) return false;
        }
      }
      if (typeof f.max_reading_time_minutes === 'number' && typeof a.reading_time_minutes === 'number' && a.reading_time_minutes > f.max_reading_time_minutes) return false;
      if (typeof f.min_rating === 'number' && (a.rating || 0) < f.min_rating) return false;
      if (q) {
        const inTags = Array.isArray(a.tags) && a.tags.some(t => matchText(t, q));
        if (!matchText(a.title, q) && !matchText(a.short_description || '', q) && !inTags) return false;
      }
      return true;
    });

    results.sort((a, b) => {
      if (sortBy === 'top_rated') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'newest_first') {
        const da = a.publication_date ? new Date(a.publication_date) : new Date(0);
        const db = b.publication_date ? new Date(b.publication_date) : new Date(0);
        return db - da;
      }
      // most_popular default – approximate by rating_count then rating
      if ((b.rating_count || 0) !== (a.rating_count || 0)) {
        return (b.rating_count || 0) - (a.rating_count || 0);
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    return articles.find(a => a.id === articleId) || null;
  }

  getRelatedArticles(articleId, limit) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) return [];

    const lim = typeof limit === 'number' && limit > 0 ? limit : 3;

    const related = articles
      .filter(a => a.id !== articleId && a.is_published && a.topic_category === article.topic_category)
      .slice();

    related.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return related.slice(0, lim);
  }

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    if (lists.length > 0) {
      return lists[0];
    }
    const now = this._nowIso();
    const list = {
      id: this._generateId('reading_list'),
      name: 'My Reading List',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  addArticleToReadingList(articleId, source, notes) {
    const articles = this._getFromStorage('articles');
    let items = this._getFromStorage('reading_list_items');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return null;
    }

    const list = this._getOrCreateReadingList();
    const item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: list.id,
      article_id: articleId,
      added_at: this._nowIso(),
      source: source || 'manual',
      notes: notes || ''
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);
    return item;
  }

  getReadingListItems() {
    const list = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const filtered = items.filter(i => i.reading_list_id === list.id);

    return filtered.map(i => {
      const article = articles.find(a => a.id === i.article_id) || null;
      return {
        reading_list_item: i,
        article,
        reading_list: list
      };
    });
  }

  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter(i => i.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);
    return { success: items.length < before };
  }

  // ---------------------- PROGRAMS, COURSES & ENROLLMENTS ----------------------

  getProgramsFilterOptions() {
    const categories = [
      { value: 'premarital_counseling', label: 'Premarital Counseling' },
      { value: 'couples_communication', label: 'Couples Communication' },
      { value: 'parenting_skills', label: 'Parenting Skills' },
      { value: 'family_dynamics', label: 'Family Dynamics' },
      { value: 'anger_management', label: 'Anger Management' },
      { value: 'other', label: 'Other' }
    ];

    const format_options = [
      { value: 'online', label: 'Online (Live)' },
      { value: 'in_person', label: 'In-Person' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'self_paced_online', label: 'Self-Paced Online' },
      { value: 'cohort_online', label: 'Cohort-Based Online' }
    ];

    const duration_weeks_options = [1, 2, 3, 4, 6, 8, 12];

    const rating_thresholds = [3.0, 4.0, 4.5];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'highest_rated', label: 'Highest Rated' },
      { value: 'soonest_start_date', label: 'Soonest Start Date' }
    ];

    return {
      categories,
      format_options,
      duration_weeks_options,
      rating_thresholds,
      sort_options
    };
  }

  searchPrograms(filters, sort_by, page, page_size) {
    const programs = this._getFromStorage('programs');
    const f = filters || {};
    const sortBy = sort_by || 'price_low_to_high';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;

    let results = programs.filter(p => {
      if (f.category && p.category !== f.category) return false;
      if (f.format) {
        const filterFormat = String(f.format).toLowerCase();
        const programFormat = String(p.format || '').toLowerCase();
        if (filterFormat === 'online') {
          if (programFormat.indexOf('online') === -1) return false;
        } else if (programFormat !== filterFormat) {
          return false;
        }
      }
      if (typeof f.min_price === 'number' && p.price < f.min_price) return false;
      if (typeof f.max_price === 'number' && p.price > f.max_price) return false;
      if (typeof f.duration_weeks === 'number' && typeof p.duration_weeks === 'number' && p.duration_weeks !== f.duration_weeks) return false;
      if (typeof f.min_number_of_sessions === 'number' && typeof p.number_of_sessions === 'number' && p.number_of_sessions < f.min_number_of_sessions) return false;
      if (typeof f.min_rating === 'number' && (p.rating || 0) < f.min_rating) return false;
      if (f.only_active && p.status !== 'active') return false;
      return true;
    });

    results.sort((a, b) => {
      if (sortBy === 'highest_rated') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'soonest_start_date') {
        const aDates = Array.isArray(a.start_dates) ? a.start_dates : [];
        const bDates = Array.isArray(b.start_dates) ? b.start_dates : [];
        const ad = aDates.length ? new Date(aDates[0]) : new Date(8640000000000000);
        const bd = bDates.length ? new Date(bDates[0]) : new Date(8640000000000000);
        return ad - bd;
      }
      // default price_low_to_high
      return (a.price || 0) - (b.price || 0);
    });

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs');
    return programs.find(p => p.id === programId) || null;
  }

  startProgramEnrollment(programId, participant_name, preferred_start_option, notes) {
    const programs = this._getFromStorage('programs');
    let enrollments = this._getFromStorage('program_enrollments');

    const program = programs.find(p => p.id === programId) || null;
    if (!program) {
      return null;
    }

    const enrollment_type = program.category === 'premarital_counseling' ? 'counseling_program' : 'online_course';

    const enrollment = {
      id: this._generateId('program_enrollment'),
      program_id: programId,
      enrollment_type,
      participant_name,
      preferred_start_option: preferred_start_option || null,
      status: 'pending',
      created_at: this._nowIso(),
      notes: notes || ''
    };

    enrollments.push(enrollment);
    this._saveToStorage('program_enrollments', enrollments);
    return enrollment;
  }

  // ---------------------- CART & DISCOUNTS ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'active') || null;
    const now = this._nowIso();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: now,
        updated_at: now,
        subtotal_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        applied_discount_code: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    const discountCodes = this._getFromStorage('discount_codes');
    let subtotal = 0;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id !== cart.id) continue;
      subtotal += (item.price || 0) * (item.quantity || 0);
    }

    let discount_amount = 0;
    let codeObj = null;
    if (cart.applied_discount_code) {
      const codeStr = cart.applied_discount_code;
      codeObj = discountCodes.find(d => d.code && d.code.toLowerCase() === String(codeStr).toLowerCase()) || null;
      const now = new Date();
      const validFrom = codeObj && codeObj.valid_from ? new Date(codeObj.valid_from) : null;
      const validTo = codeObj && codeObj.valid_to ? new Date(codeObj.valid_to) : null;
      const withinDate = !codeObj || ((!validFrom || now >= validFrom) && (!validTo || now <= validTo));
      const withinUsage = !codeObj || (typeof codeObj.max_uses !== 'number' || (codeObj.usage_count || 0) < codeObj.max_uses);

      if (codeObj && codeObj.is_active && withinDate && withinUsage) {
        if (codeObj.discount_type === 'percentage') {
          discount_amount = subtotal * (codeObj.value / 100);
        } else if (codeObj.discount_type === 'fixed_amount') {
          discount_amount = codeObj.value;
        }
      } else {
        // invalid code, clear it
        cart.applied_discount_code = null;
      }
    }

    if (discount_amount > subtotal) discount_amount = subtotal;
    const total = subtotal - discount_amount;

    cart.subtotal_amount = subtotal;
    cart.discount_amount = discount_amount;
    cart.total_amount = total;
    cart.updated_at = this._nowIso();

    // Persist cart
    let carts = this._getFromStorage('carts');
    const index = carts.findIndex(c => c.id === cart.id);
    if (index !== -1) {
      carts[index] = cart;
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  addProgramToCart(programId, quantity) {
    const programs = this._getFromStorage('programs');
    let items = this._getFromStorage('cart_items');

    const program = programs.find(p => p.id === programId) || null;
    if (!program) {
      return { cart: null, cart_items: [], message: 'Program not found.' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();

    const existingIndex = items.findIndex(i => i.cart_id === cart.id && i.program_id === programId && i.item_type === 'program');
    if (existingIndex !== -1) {
      items[existingIndex].quantity += qty;
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        program_id: programId,
        item_type: 'program',
        title_cache: program.title,
        price: program.price,
        quantity: qty
      };
      items.push(item);
    }

    this._saveToStorage('cart_items', items);
    const updatedCart = this._recalculateCartTotals(cart, items);

    const enrichedItems = items
      .filter(i => i.cart_id === updatedCart.id)
      .map(i => Object.assign({}, i, { program: program }));

    return {
      cart: updatedCart,
      cart_items: enrichedItems,
      message: 'Program added to cart.'
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    const items = this._getFromStorage('cart_items');
    const programs = this._getFromStorage('programs');

    const cartItems = items.filter(i => i.cart_id === cart.id);

    const program_details = [];
    const enrichedItems = cartItems.map(i => {
      const program = programs.find(p => p.id === i.program_id) || null;
      if (program && !program_details.find(p => p.id === program.id)) {
        program_details.push(program);
      }
      return Object.assign({}, i, { program });
    });

    this._recalculateCartTotals(cart, items);

    return {
      cart,
      items: enrichedItems,
      program_details
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let items = this._getFromStorage('cart_items');
    const programs = this._getFromStorage('programs');
    const cart = this._getOrCreateCart();

    const index = items.findIndex(i => i.id === cartItemId && i.cart_id === cart.id);
    if (index === -1) {
      return { cart, items: [] };
    }

    if (quantity <= 0) {
      items.splice(index, 1);
    } else {
      items[index].quantity = quantity;
    }

    this._saveToStorage('cart_items', items);
    const updatedCart = this._recalculateCartTotals(cart, items);

    const enrichedItems = items
      .filter(i => i.cart_id === updatedCart.id)
      .map(i => {
        const program = programs.find(p => p.id === i.program_id) || null;
        return Object.assign({}, i, { program });
      });

    return { cart: updatedCart, items: enrichedItems };
  }

  removeCartItem(cartItemId) {
    let items = this._getFromStorage('cart_items');
    const programs = this._getFromStorage('programs');
    const cart = this._getOrCreateCart();

    items = items.filter(i => i.id !== cartItemId || i.cart_id !== cart.id);
    this._saveToStorage('cart_items', items);
    const updatedCart = this._recalculateCartTotals(cart, items);

    const enrichedItems = items
      .filter(i => i.cart_id === updatedCart.id)
      .map(i => {
        const program = programs.find(p => p.id === i.program_id) || null;
        return Object.assign({}, i, { program });
      });

    return { cart: updatedCart, items: enrichedItems };
  }

  applyDiscountCodeToCart(code) {
    const discountCodes = this._getFromStorage('discount_codes');
    let items = this._getFromStorage('cart_items');
    const cart = this._getOrCreateCart();

    const codeStr = (code || '').trim();
    const discount_code = discountCodes.find(d => d.code && d.code.toLowerCase() === codeStr.toLowerCase()) || null;

    if (!discount_code) {
      const updatedCart = this._recalculateCartTotals(cart, items);
      const programs = this._getFromStorage('programs');
      const enrichedItems = items
        .filter(i => i.cart_id === updatedCart.id)
        .map(i => Object.assign({}, i, { program: programs.find(p => p.id === i.program_id) || null }));
      return {
        cart: updatedCart,
        items: enrichedItems,
        discount_code: null,
        message: 'Invalid discount code.'
      };
    }

    const now = new Date();
    const validFrom = discount_code.valid_from ? new Date(discount_code.valid_from) : null;
    const validTo = discount_code.valid_to ? new Date(discount_code.valid_to) : null;
    const withinDate = (!validFrom || now >= validFrom) && (!validTo || now <= validTo);
    const withinUsage = typeof discount_code.max_uses !== 'number' || (discount_code.usage_count || 0) < discount_code.max_uses;

    if (!discount_code.is_active || !withinDate || !withinUsage) {
      const updatedCart = this._recalculateCartTotals(cart, items);
      const programs = this._getFromStorage('programs');
      const enrichedItems = items
        .filter(i => i.cart_id === updatedCart.id)
        .map(i => Object.assign({}, i, { program: programs.find(p => p.id === i.program_id) || null }));
      return {
        cart: updatedCart,
        items: enrichedItems,
        discount_code,
        message: 'Discount code is not valid.'
      };
    }

    cart.applied_discount_code = discount_code.code;

    // update usage count
    const allCodes = discountCodes.slice();
    const codeIndex = allCodes.findIndex(d => d.id === discount_code.id);
    if (codeIndex !== -1) {
      const updatedCode = Object.assign({}, discount_code, {
        usage_count: (discount_code.usage_count || 0) + 1
      });
      allCodes[codeIndex] = updatedCode;
      this._saveToStorage('discount_codes', allCodes);
    }

    const updatedCart = this._recalculateCartTotals(cart, items);
    const programs = this._getFromStorage('programs');
    const enrichedItems = items
      .filter(i => i.cart_id === updatedCart.id)
      .map(i => Object.assign({}, i, { program: programs.find(p => p.id === i.program_id) || null }));

    return {
      cart: updatedCart,
      items: enrichedItems,
      discount_code,
      message: 'Discount code applied.'
    };
  }

  // ---------------------- LEARNING PATHS & RESOURCES ----------------------

  getLearningPathsList(filters) {
    const paths = this._getFromStorage('learning_paths');
    const f = filters || {};

    return paths.filter(p => {
      if (f.topic_category && p.topic_category !== f.topic_category) return false;
      if (f.audience && p.audience !== f.audience) return false;
      if (typeof f.include_custom === 'boolean') {
        if (!f.include_custom && p.is_custom) return false;
      }
      return true;
    });
  }

  getLearningPathDetail(learningPathId) {
    const paths = this._getFromStorage('learning_paths');
    const items = this._getFromStorage('learning_path_items');
    const resources = this._getFromStorage('learning_resources');

    const learning_path = paths.find(p => p.id === learningPathId) || null;

    const pathItems = items
      .filter(i => i.learning_path_id === learningPathId)
      .sort((a, b) => a.order - b.order)
      .map(i => {
        const resource = resources.find(r => r.id === i.resource_id) || null;
        const path_item = Object.assign({}, i, { learning_path, resource });
        return { path_item, resource };
      });

    return { learning_path, items: pathItems };
  }

  startCustomLearningPath(topic_category, audience) {
    let paths = this._getFromStorage('learning_paths');
    const now = this._nowIso();

    const path = {
      id: this._generateId('learning_path'),
      title: '',
      description: '',
      topic_category,
      audience,
      estimated_time_minutes: 0,
      is_custom: true,
      created_at: now
    };

    paths.push(path);
    this._saveToStorage('learning_paths', paths);
    return path;
  }

  searchLearningResources(filters, sort_by, page, page_size) {
    const resources = this._getFromStorage('learning_resources');
    const f = filters || {};
    const sortBy = sort_by || 'highest_rated';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;

    let results = resources.filter(r => {
      if (!r.is_active) return false;
      if (f.topic_category && r.topic_category !== f.topic_category) return false;
      if (f.audience && r.audience !== f.audience) return false;
      if (f.resource_type && r.resource_type !== f.resource_type) return false;
      if (typeof f.max_duration_minutes === 'number' && typeof r.duration_minutes === 'number' && r.duration_minutes > f.max_duration_minutes) return false;
      if (typeof f.max_reading_time_minutes === 'number' && typeof r.reading_time_minutes === 'number' && r.reading_time_minutes > f.max_reading_time_minutes) return false;
      if (typeof f.min_rating === 'number' && (r.rating || 0) < f.min_rating) return false;
      if (f.activity_style && r.activity_style !== f.activity_style) return false;
      return true;
    });

    results.sort((a, b) => {
      if (sortBy === 'shortest_first') {
        const aDur = typeof a.duration_minutes === 'number' ? a.duration_minutes : (a.reading_time_minutes || 0);
        const bDur = typeof b.duration_minutes === 'number' ? b.duration_minutes : (b.reading_time_minutes || 0);
        return aDur - bDur;
      }
      // highest_rated
      return (b.rating || 0) - (a.rating || 0);
    });

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  addResourceToLearningPath(learningPathId, resourceId, notes) {
    let items = this._getFromStorage('learning_path_items');
    const paths = this._getFromStorage('learning_paths');
    const resources = this._getFromStorage('learning_resources');

    const learning_path = paths.find(p => p.id === learningPathId) || null;
    const resource = resources.find(r => r.id === resourceId) || null;
    if (!learning_path || !resource) return null;

    const existing = items.filter(i => i.learning_path_id === learningPathId);
    let maxOrder = 0;
    for (let i = 0; i < existing.length; i++) {
      if (existing[i].order > maxOrder) maxOrder = existing[i].order;
    }

    const item = {
      id: this._generateId('learning_path_item'),
      learning_path_id: learningPathId,
      resource_id: resourceId,
      order: maxOrder + 1,
      notes: notes || ''
    };

    items.push(item);
    this._saveToStorage('learning_path_items', items);
    this._computeLearningPathEstimatedTime(learningPathId);

    const path_item = Object.assign({}, item, { learning_path, resource });
    return path_item;
  }

  updateLearningPathOrder(learningPathId, ordered_item_ids) {
    let items = this._getFromStorage('learning_path_items');
    const idList = Array.isArray(ordered_item_ids) ? ordered_item_ids : [];

    for (let i = 0; i < idList.length; i++) {
      const id = idList[i];
      const index = items.findIndex(it => it.id === id && it.learning_path_id === learningPathId);
      if (index !== -1) {
        items[index].order = i + 1;
      }
    }

    this._saveToStorage('learning_path_items', items);
    this._computeLearningPathEstimatedTime(learningPathId);

    const paths = this._getFromStorage('learning_paths');
    const resources = this._getFromStorage('learning_resources');
    const learning_path = paths.find(p => p.id === learningPathId) || null;

    const updatedItems = items
      .filter(i => i.learning_path_id === learningPathId)
      .sort((a, b) => a.order - b.order)
      .map(i => {
        const resource = resources.find(r => r.id === i.resource_id) || null;
        return Object.assign({}, i, { learning_path, resource });
      });

    return updatedItems;
  }

  updateLearningPathInfo(learningPathId, title, description) {
    let paths = this._getFromStorage('learning_paths');
    const index = paths.findIndex(p => p.id === learningPathId);
    if (index === -1) return null;

    const path = Object.assign({}, paths[index], {
      title: title,
      description: description || paths[index].description || ''
    });

    paths[index] = path;
    this._saveToStorage('learning_paths', paths);
    return path;
  }

  finalizeLearningPath(learningPathId) {
    this._computeLearningPathEstimatedTime(learningPathId);
    const paths = this._getFromStorage('learning_paths');
    const items = this._getFromStorage('learning_path_items');

    const learning_path = paths.find(p => p.id === learningPathId) || null;
    const pathItems = items
      .filter(i => i.learning_path_id === learningPathId)
      .sort((a, b) => a.order - b.order);

    return {
      learning_path,
      items: pathItems,
      message: 'Learning path saved.'
    };
  }

  _computeLearningPathEstimatedTime(learningPathId) {
    const paths = this._getFromStorage('learning_paths');
    let items = this._getFromStorage('learning_path_items');
    const resources = this._getFromStorage('learning_resources');

    const index = paths.findIndex(p => p.id === learningPathId);
    if (index === -1) return null;

    const pathItems = items.filter(i => i.learning_path_id === learningPathId);

    let totalMinutes = 0;
    for (let i = 0; i < pathItems.length; i++) {
      const res = resources.find(r => r.id === pathItems[i].resource_id) || null;
      if (!res) continue;
      if (typeof res.duration_minutes === 'number') {
        totalMinutes += res.duration_minutes;
      } else if (typeof res.reading_time_minutes === 'number') {
        totalMinutes += res.reading_time_minutes;
      }
    }

    const path = Object.assign({}, paths[index], {
      estimated_time_minutes: totalMinutes
    });

    paths[index] = path;
    this._saveToStorage('learning_paths', paths);
    return path;
  }

  // ---------------------- CONTACT REQUESTS ----------------------

  submitContactRequest(name, email, phone, topic, message) {
    let requests = this._getFromStorage('contact_requests');

    const req = {
      id: this._generateId('contact_request'),
      name,
      email: email || null,
      phone: phone || null,
      topic: topic || null,
      message,
      created_at: this._nowIso()
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Your request has been submitted.'
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