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

  _initStorage() {
    const tables = [
      'coaches',
      'coach_session_offerings',
      'coach_availability_slots',
      'coach_session_bookings',
      'favorite_coaches',
      'coach_messages',
      'courses',
      'learning_plans',
      'course_enrollments',
      'activity_templates',
      'weekly_plans',
      'weekly_plan_items',
      'assessments',
      'assessment_questions',
      'assessment_runs',
      'wellness_goals',
      'articles',
      'saved_articles',
      'reading_lists',
      'reading_list_items',
      'groups',
      'group_memberships',
      'group_meetings',
      'meeting_rsvps',
      'meditation_tracks',
      'playlists',
      'playlist_items',
      'challenge_templates',
      'challenge_template_days',
      'challenge_template_activities',
      'challenge_instances',
      'challenge_instance_days',
      'challenge_instance_activities'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
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

  _labelizeIdentifier(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); })
      .join(' ');
  }

  _sessionTypeLabel(session_type) {
    // e.g., 'video_60_min' -> '60-minute video session'
    if (!session_type) return '';
    const parts = session_type.split('_');
    if (parts.length !== 3) return this._labelizeIdentifier(session_type);
    const modality = parts[0];
    const minutes = parts[1];
    const unit = parts[2]; // 'min'
    let duration = minutes;
    if (minutes === '30' || minutes === '45' || minutes === '60' || minutes === '90') {
      duration = minutes + '-minute';
    }
    const modalityLabel = this._labelizeIdentifier(modality).toLowerCase();
    return duration + ' ' + modalityLabel + ' session';
  }

  _parseDateOnly(isoDateString) {
    // Expects 'YYYY-MM-DD' or full ISO; returns Date for date-only comparisons
    if (!isoDateString) return null;
    if (isoDateString.length <= 10) {
      return new Date(isoDateString + 'T00:00:00.000Z');
    }
    return new Date(isoDateString);
  }

  _dateToYMD(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _resolveUpcomingMonday() {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
    // upcoming Monday (strictly in the future)
    let offset = (8 - day) % 7; // if Monday (1) -> 7 days
    if (offset === 0) offset = 7;
    const nextMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
    return this._dateToYMD(nextMonday);
  }

  _getOrCreateUserContext() {
    // Single-user implicit context
    return { userId: 'single_user' };
  }

  _getOrCreateWeeklyPlanDraft(week_start_date) {
    const weekly_plans = this._getFromStorage('weekly_plans');
    const targetDate = this._parseDateOnly(week_start_date);
    const targetYMD = this._dateToYMD(targetDate);

    let plan = null;
    for (let i = 0; i < weekly_plans.length; i++) {
      const p = weekly_plans[i];
      const pDate = this._parseDateOnly(p.week_start_date);
      if (this._dateToYMD(pDate) === targetYMD && (!p.name || p.name === '')) {
        plan = p;
        break;
      }
    }

    if (!plan) {
      plan = {
        id: this._generateId('weeklyplan'),
        name: '',
        week_start_date: new Date(targetYMD + 'T00:00:00.000Z').toISOString(),
        total_duration_minutes: 0,
        created_at: this._nowIso()
      };
      weekly_plans.push(plan);
      this._saveToStorage('weekly_plans', weekly_plans);
    }

    return plan;
  }

  _calculateWeeklyPlanTotalDuration(weeklyPlanId) {
    const weekly_plan_items = this._getFromStorage('weekly_plan_items');
    let total = 0;
    for (let i = 0; i < weekly_plan_items.length; i++) {
      const item = weekly_plan_items[i];
      if (item.weeklyPlanId === weeklyPlanId) {
        total += item.duration_minutes || 0;
      }
    }
    const weekly_plans = this._getFromStorage('weekly_plans');
    for (let j = 0; j < weekly_plans.length; j++) {
      if (weekly_plans[j].id === weeklyPlanId) {
        weekly_plans[j].total_duration_minutes = total;
        break;
      }
    }
    this._saveToStorage('weekly_plans', weekly_plans);
    return total;
  }

  _ensureLearningPlanExists() {
    let learning_plans = this._getFromStorage('learning_plans');
    for (let i = 0; i < learning_plans.length; i++) {
      const lp = learning_plans[i];
      if (lp.plan_type === 'current_month_plan' && lp.is_active) {
        return lp;
      }
    }
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const plan = {
      id: this._generateId('learningplan'),
      name: 'Current Month Plan (' + monthName + ')',
      description: '',
      plan_type: 'current_month_plan',
      is_active: true,
      created_at: this._nowIso()
    };
    learning_plans.push(plan);
    this._saveToStorage('learning_plans', learning_plans);
    return plan;
  }

  _createChallengeInstanceFromTemplate(challengeTemplateId) {
    const templates = this._getFromStorage('challenge_templates');
    const template_days = this._getFromStorage('challenge_template_days');
    const template_activities = this._getFromStorage('challenge_template_activities');
    const activity_templates = this._getFromStorage('activity_templates');

    let template = null;
    for (let i = 0; i < templates.length; i++) {
      if (templates[i].id === challengeTemplateId) {
        template = templates[i];
        break;
      }
    }
    if (!template) {
      return null;
    }

    const challenge_instances = this._getFromStorage('challenge_instances');
    const challenge_instance_days = this._getFromStorage('challenge_instance_days');
    const challenge_instance_activities = this._getFromStorage('challenge_instance_activities');

    const instanceId = this._generateId('challengeinstance');
    const instance = {
      id: instanceId,
      challengeTemplateId: challengeTemplateId,
      name: template.title,
      start_date: '',
      duration_days: template.duration_days,
      status: 'draft',
      created_at: this._nowIso()
    };
    challenge_instances.push(instance);

    // Map templateDayId -> instanceDayId
    const templateDayToInstanceDay = {};

    for (let i = 0; i < template_days.length; i++) {
      const td = template_days[i];
      if (td.challengeTemplateId === challengeTemplateId) {
        const instanceDayId = this._generateId('challengeinstanceday');
        const instDay = {
          id: instanceDayId,
          challengeInstanceId: instanceId,
          day_number: td.day_number,
          date: '',
          notes: ''
        };
        challenge_instance_days.push(instDay);
        templateDayToInstanceDay[td.id] = instanceDayId;
      }
    }
    // Ensure we have an instance day for every day in the challenge duration,
    // even if some days are missing in the template definition.
    const existingDayNumbers = {};
    for (let i = 0; i < challenge_instance_days.length; i++) {
      const d = challenge_instance_days[i];
      if (d.challengeInstanceId === instanceId) {
        existingDayNumbers[d.day_number] = true;
      }
    }
    const totalDays = template.duration_days || 0;
    for (let dn = 1; dn <= totalDays; dn++) {
      if (!existingDayNumbers[dn]) {
        const instanceDayId = this._generateId('challengeinstanceday');
        const instDay = {
          id: instanceDayId,
          challengeInstanceId: instanceId,
          day_number: dn,
          date: '',
          notes: ''
        };
        challenge_instance_days.push(instDay);
      }
    }

    for (let j = 0; j < template_activities.length; j++) {
      const ta = template_activities[j];
      const instDayId = templateDayToInstanceDay[ta.challengeTemplateDayId];
      if (!instDayId) continue;
      const cia = {
        id: this._generateId('challengeinstanceactivity'),
        challengeInstanceDayId: instDayId,
        activityTemplateId: ta.activityTemplateId,
        order_index: ta.order_index
      };
      challenge_instance_activities.push(cia);
    }

    this._saveToStorage('challenge_instances', challenge_instances);
    this._saveToStorage('challenge_instance_days', challenge_instance_days);
    this._saveToStorage('challenge_instance_activities', challenge_instance_activities);

    // Build response structure
    const days = [];
    for (let i = 0; i < challenge_instance_days.length; i++) {
      const d = challenge_instance_days[i];
      if (d.challengeInstanceId !== instanceId) continue;
      const activities = [];
      for (let j = 0; j < challenge_instance_activities.length; j++) {
        const a = challenge_instance_activities[j];
        if (a.challengeInstanceDayId !== d.id) continue;
        let actTemplate = null;
        for (let k = 0; k < activity_templates.length; k++) {
          if (activity_templates[k].id === a.activityTemplateId) {
            actTemplate = activity_templates[k];
            break;
          }
        }
        activities.push({
          challenge_instance_activity_id: a.id,
          activity_template_id: a.activityTemplateId,
          activity_name: actTemplate ? actTemplate.name : '',
          order_index: a.order_index
        });
      }
      days.push({
        challenge_instance_day_id: d.id,
        day_number: d.day_number,
        date: d.date || '',
        activities: activities
      });
    }

    return {
      challenge_instance_id: instanceId,
      challenge_template_id: challengeTemplateId,
      name: instance.name,
      duration_days: instance.duration_days,
      status: instance.status,
      days: days
    };
  }

  // =========================
  // Core interface implementations
  // =========================

  // Homepage
  getHomepageOverview() {
    const coaches = this._getFromStorage('coaches');
    const courses = this._getFromStorage('courses');
    const articles = this._getFromStorage('articles');
    const meditation_tracks = this._getFromStorage('meditation_tracks');
    const challenge_templates = this._getFromStorage('challenge_templates');

    const quick_access_sections = [
      { section_key: 'find_a_coach', title: 'Find a Coach', subtitle: 'Work with a certified coach' },
      { section_key: 'courses', title: 'Courses', subtitle: 'Learn at your own pace' },
      { section_key: 'planner', title: 'Planner', subtitle: 'Plan your self-care week' },
      { section_key: 'assessments', title: 'Assessments', subtitle: 'Check in with yourself' },
      { section_key: 'articles', title: 'Articles', subtitle: 'Read wellness insights' },
      { section_key: 'groups', title: 'Groups', subtitle: 'Connect with peers' },
      { section_key: 'meditations', title: 'Meditations', subtitle: 'Find calm and focus' },
      { section_key: 'challenges', title: 'Challenges', subtitle: 'Build new habits' }
    ];

    const featured_coaches = coaches
      .filter(function (c) { return c.is_active; })
      .sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); })
      .slice(0, 5)
      .map(function (c) {
        return {
          coach_id: c.id,
          full_name: c.full_name,
          primary_specialization_label: c.specializations && c.specializations.length > 0 ? c.specializations[0] : '',
          rating: c.rating,
          review_count: c.review_count,
          profile_image_url: c.profile_image_url || ''
        };
      });

    const featured_courses = courses
      .slice()
      .sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); })
      .slice(0, 5)
      .map(function (c) {
        return {
          course_id: c.id,
          title: c.title,
          short_description: c.short_description || '',
          duration_minutes: c.duration_minutes,
          rating: c.rating,
          review_count: c.review_count
        };
      });

    const featured_articles = articles
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.published_at);
        const db = new Date(b.published_at);
        return db - da;
      })
      .slice(0, 5)
      .map(function (a) {
        return {
          article_id: a.id,
          title: a.title,
          summary: a.summary || '',
          read_time_minutes: a.read_time_minutes,
          published_at: a.published_at
        };
      });

    const featured_meditations = meditation_tracks
      .slice()
      .sort(function (a, b) { return a.duration_minutes - b.duration_minutes; })
      .slice(0, 5)
      .map(function (t) {
        return {
          track_id: t.id,
          title: t.title,
          duration_minutes: t.duration_minutes,
          level: t.level,
          tags: t.tags || []
        };
      });

    const featured_challenges = challenge_templates
      .filter(function (c) { return c.is_active; })
      .slice(0, 5)
      .map(function (c) {
        return {
          challenge_template_id: c.id,
          title: c.title,
          duration_days: c.duration_days,
          tags: c.tags || []
        };
      });

    return {
      quick_access_sections: quick_access_sections,
      featured_coaches: featured_coaches,
      featured_courses: featured_courses,
      featured_articles: featured_articles,
      featured_meditations: featured_meditations,
      featured_challenges: featured_challenges
    };
  }

  // Coach search filters
  getCoachSearchFilterOptions() {
    const coaches = this._getFromStorage('coaches');
    const coach_session_offerings = this._getFromStorage('coach_session_offerings');

    const specSet = {};
    for (let i = 0; i < coaches.length; i++) {
      const sps = coaches[i].specializations || [];
      for (let j = 0; j < sps.length; j++) {
        specSet[sps[j]] = true;
      }
    }
    const specializations = Object.keys(specSet).map((value) => ({
      value: value,
      label: this._labelizeIdentifier(value)
    }), this);

    const sessionTypeMap = {};
    for (let k = 0; k < coach_session_offerings.length; k++) {
      const o = coach_session_offerings[k];
      if (!sessionTypeMap[o.session_type]) {
        sessionTypeMap[o.session_type] = o.duration_minutes;
      }
    }
    const session_types = Object.keys(sessionTypeMap).map((value) => ({
      value: value,
      label: this._sessionTypeLabel(value),
      duration_minutes: sessionTypeMap[value]
    }), this);

    const rating_thresholds = [3, 3.5, 4, 4.5, 4.7, 5];

    const price_presets = [
      { max_price: 50, label: 'Up to $50' },
      { max_price: 75, label: 'Up to $75' },
      { max_price: 100, label: 'Up to $100' },
      { max_price: 120, label: 'Up to $120' },
      { max_price: 150, label: 'Up to $150' },
      { max_price: 200, label: 'Up to $200' }
    ];

    return {
      specializations: specializations,
      session_types: session_types,
      rating_thresholds: rating_thresholds,
      price_presets: price_presets,
      default_sort_by: 'relevance'
    };
  }

  // Search coaches
  searchCoaches(query, specialization, session_type, min_rating, max_price, date_range, sort_by, page, page_size) {
    const coaches = this._getFromStorage('coaches');
    const coach_session_offerings = this._getFromStorage('coach_session_offerings');
    const coach_availability_slots = this._getFromStorage('coach_availability_slots');

    const sortMode = sort_by || 'relevance';
    const pageNum = page || 1;
    const size = page_size || 20;

    const startDate = date_range && date_range.start_date ? this._parseDateOnly(date_range.start_date) : null;
    const endDate = date_range && date_range.end_date ? this._parseDateOnly(date_range.end_date) : null;

    const lowerQuery = query ? query.toLowerCase() : null;

    const resultsArray = [];

    for (let i = 0; i < coaches.length; i++) {
      const coach = coaches[i];
      if (!coach.is_active) continue;

      if (specialization && (!coach.specializations || coach.specializations.indexOf(specialization) === -1)) {
        continue;
      }

      if (typeof min_rating === 'number' && coach.rating < min_rating) {
        continue;
      }

      if (lowerQuery) {
        const text = (coach.full_name || '') + ' ' + (coach.bio || '');
        if (text.toLowerCase().indexOf(lowerQuery) === -1) {
          continue;
        }
      }

      // Find offering matching session_type (if provided)
      let offeringForCoach = null;
      let minPriceForCoach = null;
      let currencyForCoach = '';

      for (let j = 0; j < coach_session_offerings.length; j++) {
        const off = coach_session_offerings[j];
        if (off.coachId !== coach.id || !off.is_active) continue;
        if (session_type && off.session_type !== session_type) continue;
        if (typeof max_price === 'number' && off.price > max_price) continue;
        if (!offeringForCoach) {
          offeringForCoach = off;
          minPriceForCoach = off.price;
          currencyForCoach = off.currency || '';
        } else if (off.price < minPriceForCoach) {
          offeringForCoach = off;
          minPriceForCoach = off.price;
          currencyForCoach = off.currency || '';
        }
      }

      if (session_type && !offeringForCoach) {
        // When session_type is specified, require an offering
        continue;
      }

      // Determine next available datetime within date_range for that session_type (if provided)
      let nextAvailable = null;
      if (session_type && startDate && endDate) {
        for (let k = 0; k < coach_availability_slots.length; k++) {
          const slot = coach_availability_slots[k];
          if (slot.coachId !== coach.id) continue;
          // ensure slot's offering matches session_type
          let off = null;
          for (let m = 0; m < coach_session_offerings.length; m++) {
            if (coach_session_offerings[m].id === slot.sessionOfferingId) {
              off = coach_session_offerings[m];
              break;
            }
          }
          if (!off || off.session_type !== session_type) continue;

          const start = new Date(slot.start_datetime);
          if (startDate && start < startDate) continue;
          if (endDate && start > endDate) continue;
          if (slot.is_booked) continue;
          if (!nextAvailable || start < nextAvailable) {
            nextAvailable = start;
          }
        }
      } else if (session_type) {
        // Fallback: earliest unbooked availability for this coach & session_type
        for (let k = 0; k < coach_availability_slots.length; k++) {
          const slot = coach_availability_slots[k];
          if (slot.coachId !== coach.id || slot.is_booked) continue;
          let off = null;
          for (let m = 0; m < coach_session_offerings.length; m++) {
            if (coach_session_offerings[m].id === slot.sessionOfferingId) {
              off = coach_session_offerings[m];
              break;
            }
          }
          if (!off || off.session_type !== session_type) continue;
          const start = new Date(slot.start_datetime);
          if (!nextAvailable || start < nextAvailable) {
            nextAvailable = start;
          }
        }
      }

      resultsArray.push({
        coach_id: coach.id,
        full_name: coach.full_name,
        profile_image_url: coach.profile_image_url || '',
        specializations: coach.specializations || [],
        primary_specialization_label: coach.specializations && coach.specializations.length > 0 ? this._labelizeIdentifier(coach.specializations[0]) : '',
        rating: coach.rating,
        review_count: coach.review_count,
        session_type: offeringForCoach ? offeringForCoach.session_type : (session_type || ''),
        price: typeof minPriceForCoach === 'number' ? minPriceForCoach : null,
        currency: currencyForCoach,
        next_available_datetime: nextAvailable ? nextAvailable.toISOString() : null
      });
    }

    // Sorting
    resultsArray.sort((a, b) => {
      if (sortMode === 'earliest_available') {
        const da = a.next_available_datetime ? new Date(a.next_available_datetime) : null;
        const db = b.next_available_datetime ? new Date(b.next_available_datetime) : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      }
      if (sortMode === 'price') {
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return pa - pb;
      }
      if (sortMode === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      // relevance: sort by rating desc then review_count desc
      const cmp = (b.rating || 0) - (a.rating || 0);
      if (cmp !== 0) return cmp;
      return (b.review_count || 0) - (a.review_count || 0);
    });

    const total_count = resultsArray.length;
    const startIndex = (pageNum - 1) * size;
    const paged = resultsArray.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_count: total_count
    };
  }

  // Coach profile
  getCoachProfile(coachId) {
    const coaches = this._getFromStorage('coaches');
    const coach_session_offerings = this._getFromStorage('coach_session_offerings');

    let coach = null;
    for (let i = 0; i < coaches.length; i++) {
      if (coaches[i].id === coachId) {
        coach = coaches[i];
        break;
      }
    }
    if (!coach) {
      return null;
    }

    const session_offerings = [];
    for (let j = 0; j < coach_session_offerings.length; j++) {
      const o = coach_session_offerings[j];
      if (o.coachId === coachId && o.is_active) {
        session_offerings.push({
          session_offering_id: o.id,
          session_type: o.session_type,
          duration_minutes: o.duration_minutes,
          price: o.price,
          currency: o.currency || '',
          label: this._sessionTypeLabel(o.session_type)
        });
      }
    }

    const specializations = (coach.specializations || []).map((value) => ({
      value: value,
      label: this._labelizeIdentifier(value)
    }), this);

    return {
      coach_id: coach.id,
      full_name: coach.full_name,
      bio: coach.bio || '',
      profile_image_url: coach.profile_image_url || '',
      specializations: specializations,
      rating: coach.rating,
      review_count: coach.review_count,
      session_offerings: session_offerings
    };
  }

  // Coach availability
  getCoachAvailability(coachId, session_type, date_range) {
    const coach_session_offerings = this._getFromStorage('coach_session_offerings');
    const coach_availability_slots = this._getFromStorage('coach_availability_slots');
    const coaches = this._getFromStorage('coaches');

    const startDate = date_range && date_range.start_date ? this._parseDateOnly(date_range.start_date) : null;
    const endDate = date_range && date_range.end_date ? this._parseDateOnly(date_range.end_date) : null;

    const offeringIds = [];
    for (let i = 0; i < coach_session_offerings.length; i++) {
      const off = coach_session_offerings[i];
      if (off.coachId === coachId && off.session_type === session_type && off.is_active) {
        offeringIds.push(off.id);
      }
    }

    const slots = [];
    for (let j = 0; j < coach_availability_slots.length; j++) {
      const slot = coach_availability_slots[j];
      if (slot.coachId !== coachId) continue;
      // If we have known offeringIds, restrict to them; otherwise accept all slots for this coach
      if (offeringIds.length > 0 && offeringIds.indexOf(slot.sessionOfferingId) === -1) continue;
      const start = new Date(slot.start_datetime);
      if (startDate && start < startDate) continue;
      if (endDate && start > endDate) continue;
      slots.push({
        availability_slot_id: slot.id,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        is_booked: slot.is_booked,
        // foreign key resolution for availabilitySlotId
        availability_slot: slot
      });
    }

    // Fallback: if no explicit availability slots exist for this coach/session_type,
    // synthesize one from the coach's next_available_datetime if possible.
    if (slots.length === 0) {
      let coach = null;
      for (let c = 0; c < coaches.length; c++) {
        if (coaches[c].id === coachId) {
          coach = coaches[c];
          break;
        }
      }
      if (coach && coach.next_available_datetime) {
        const start = new Date(coach.next_available_datetime);
        if ((!startDate || start >= startDate) && (!endDate || start <= endDate)) {
          let offering = null;
          for (let o = 0; o < coach_session_offerings.length; o++) {
            const off = coach_session_offerings[o];
            if (off.coachId === coachId && off.session_type === session_type && off.is_active) {
              offering = off;
              break;
            }
          }
          const durationMinutes = offering && typeof offering.duration_minutes === 'number'
            ? offering.duration_minutes
            : 60;
          const end = new Date(start.getTime() + durationMinutes * 60000);
          const slotId = this._generateId('availabilityslot');
          const slotRecord = {
            id: slotId,
            coachId: coachId,
            sessionOfferingId: offering ? offering.id : null,
            start_datetime: start.toISOString(),
            end_datetime: end.toISOString(),
            is_booked: false
          };
          coach_availability_slots.push(slotRecord);
          this._saveToStorage('coach_availability_slots', coach_availability_slots);

          slots.push({
            availability_slot_id: slotId,
            start_datetime: slotRecord.start_datetime,
            end_datetime: slotRecord.end_datetime,
            is_booked: slotRecord.is_booked,
            availability_slot: slotRecord
          });
        }
      }
    }

    slots.sort(function (a, b) {
      const da = new Date(a.start_datetime);
      const db = new Date(b.start_datetime);
      return da - db;
    });

    return {
      coach_id: coachId,
      session_type: session_type,
      slots: slots
    };
  }

  // Booking
  createCoachSessionBooking(availabilitySlotId, client_name, notes) {
    const coach_availability_slots = this._getFromStorage('coach_availability_slots');
    const coach_session_offerings = this._getFromStorage('coach_session_offerings');
    const coaches = this._getFromStorage('coaches');
    const coach_session_bookings = this._getFromStorage('coach_session_bookings');

    let slot = null;
    for (let i = 0; i < coach_availability_slots.length; i++) {
      if (coach_availability_slots[i].id === availabilitySlotId) {
        slot = coach_availability_slots[i];
        break;
      }
    }
    if (!slot) {
      return {
        success: false,
        booking_id: null,
        coach_id: null,
        session_offering_id: null,
        availability_slot_id: availabilitySlotId,
        start_datetime: null,
        end_datetime: null,
        client_name: client_name,
        notes: notes || '',
        status: null,
        message: 'Availability slot not found.'
      };
    }
    if (slot.is_booked) {
      return {
        success: false,
        booking_id: null,
        coach_id: slot.coachId,
        session_offering_id: slot.sessionOfferingId,
        availability_slot_id: availabilitySlotId,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        client_name: client_name,
        notes: notes || '',
        status: 'booked',
        message: 'Slot is already booked.'
      };
    }

    let coach = null;
    for (let j = 0; j < coaches.length; j++) {
      if (coaches[j].id === slot.coachId) {
        coach = coaches[j];
        break;
      }
    }

    let offering = null;
    for (let k = 0; k < coach_session_offerings.length; k++) {
      if (coach_session_offerings[k].id === slot.sessionOfferingId) {
        offering = coach_session_offerings[k];
        break;
      }
    }

    const bookingId = this._generateId('coachbooking');
    const booking = {
      id: bookingId,
      coachId: slot.coachId,
      sessionOfferingId: slot.sessionOfferingId,
      availabilitySlotId: slot.id,
      client_name: client_name,
      notes: notes || '',
      status: 'booked',
      booked_at: this._nowIso()
    };
    coach_session_bookings.push(booking);

    // Mark slot as booked
    for (let i = 0; i < coach_availability_slots.length; i++) {
      if (coach_availability_slots[i].id === availabilitySlotId) {
        coach_availability_slots[i].is_booked = true;
        break;
      }
    }

    this._saveToStorage('coach_session_bookings', coach_session_bookings);
    this._saveToStorage('coach_availability_slots', coach_availability_slots);

    return {
      success: true,
      booking_id: bookingId,
      coach_id: booking.coachId,
      session_offering_id: booking.sessionOfferingId,
      availability_slot_id: booking.availabilitySlotId,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      client_name: booking.client_name,
      notes: booking.notes,
      status: booking.status,
      message: 'Session booked successfully.'
    };
  }

  // Favorites
  addCoachToFavorites(coachId) {
    const coaches = this._getFromStorage('coaches');
    const favorite_coaches = this._getFromStorage('favorite_coaches');

    let coach = null;
    for (let i = 0; i < coaches.length; i++) {
      if (coaches[i].id === coachId) {
        coach = coaches[i];
        break;
      }
    }
    if (!coach) {
      return {
        success: false,
        favorite_id: null,
        coach_id: coachId,
        created_at: null
      };
    }

    for (let j = 0; j < favorite_coaches.length; j++) {
      if (favorite_coaches[j].coachId === coachId) {
        return {
          success: true,
          favorite_id: favorite_coaches[j].id,
          coach_id: coachId,
          created_at: favorite_coaches[j].created_at
        };
      }
    }

    const favoriteId = this._generateId('favoritecoach');
    const created_at = this._nowIso();
    favorite_coaches.push({
      id: favoriteId,
      coachId: coachId,
      created_at: created_at
    });
    this._saveToStorage('favorite_coaches', favorite_coaches);

    return {
      success: true,
      favorite_id: favoriteId,
      coach_id: coachId,
      created_at: created_at
    };
  }

  // Messaging
  sendCoachMessage(coachId, message_text) {
    const coaches = this._getFromStorage('coaches');
    const coach_messages = this._getFromStorage('coach_messages');

    let coach = null;
    for (let i = 0; i < coaches.length; i++) {
      if (coaches[i].id === coachId) {
        coach = coaches[i];
        break;
      }
    }
    if (!coach) {
      return {
        success: false,
        message_id: null,
        coach_id: coachId,
        direction: 'outbound',
        sent_at: null
      };
    }

    const messageId = this._generateId('coachmessage');
    const sent_at = this._nowIso();
    coach_messages.push({
      id: messageId,
      coachId: coachId,
      message_text: message_text,
      direction: 'outbound',
      sent_at: sent_at
    });
    this._saveToStorage('coach_messages', coach_messages);

    return {
      success: true,
      message_id: messageId,
      coach_id: coachId,
      direction: 'outbound',
      sent_at: sent_at
    };
  }

  // Courses filter options
  getCoursesFilterOptions() {
    return {
      duration_presets_minutes: [30, 60, 90, 120, 180],
      rating_thresholds: [3, 3.5, 4, 4.5, 4.7, 5],
      review_count_thresholds: [10, 50, 100, 500],
      sort_options: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'highest_rated', label: 'Highest Rated' },
        { value: 'most_reviewed', label: 'Most Reviewed' },
        { value: 'newest', label: 'Newest' }
      ]
    };
  }

  // Search courses
  searchCourses(query, max_duration_minutes, min_rating, min_review_count, sort_by, page, page_size) {
    const courses = this._getFromStorage('courses');
    const lowerQuery = query ? query.toLowerCase() : null;
    const sortMode = sort_by || 'relevance';
    const pageNum = page || 1;
    const size = page_size || 20;

    let results = [];
    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];
      if (typeof max_duration_minutes === 'number' && c.duration_minutes > max_duration_minutes) continue;
      if (typeof min_rating === 'number' && c.rating < min_rating) continue;
      if (typeof min_review_count === 'number' && c.review_count < min_review_count) continue;
      if (lowerQuery) {
        const text = (c.title || '') + ' ' + (c.short_description || '') + ' ' + (c.full_description || '');
        let topicsText = '';
        if (c.topics && c.topics.length) topicsText = ' ' + c.topics.join(' ');
        if ((text + topicsText).toLowerCase().indexOf(lowerQuery) === -1) continue;
      }
      results.push({
        course_id: c.id,
        title: c.title,
        short_description: c.short_description || '',
        duration_minutes: c.duration_minutes,
        rating: c.rating,
        review_count: c.review_count,
        topics: c.topics || [],
        created_at: c.created_at
      });
    }

    results.sort(function (a, b) {
      if (sortMode === 'highest_rated') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortMode === 'most_reviewed') {
        return (b.review_count || 0) - (a.review_count || 0);
      }
      if (sortMode === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      // relevance
      const cmp = (b.rating || 0) - (a.rating || 0);
      if (cmp !== 0) return cmp;
      return (b.review_count || 0) - (a.review_count || 0);
    });

    const total_count = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_count: total_count
    };
  }

  // Course detail
  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses');
    let course = null;
    for (let i = 0; i < courses.length; i++) {
      if (courses[i].id === courseId) {
        course = courses[i];
        break;
      }
    }
    if (!course) return null;

    return {
      course_id: course.id,
      title: course.title,
      short_description: course.short_description || '',
      full_description: course.full_description || '',
      duration_minutes: course.duration_minutes,
      rating: course.rating,
      review_count: course.review_count,
      topics: course.topics || [],
      created_at: course.created_at,
      curriculum_items: []
    };
  }

  // Learning plans overview
  getLearningPlansOverview() {
    const ensured = this._ensureLearningPlanExists();
    const learning_plans = this._getFromStorage('learning_plans');
    const overview = learning_plans.map(function (lp) {
      return {
        learning_plan_id: lp.id,
        name: lp.name,
        plan_type: lp.plan_type,
        is_active: lp.is_active
      };
    });
    return {
      learning_plans: overview
    };
  }

  // Enroll in course
  enrollInCourse(courseId, enrollment_mode, learningPlanId) {
    const courses = this._getFromStorage('courses');
    const course_enrollments = this._getFromStorage('course_enrollments');
    const learning_plans = this._getFromStorage('learning_plans');

    const mode = enrollment_mode || 'course_only';

    let course = null;
    for (let i = 0; i < courses.length; i++) {
      if (courses[i].id === courseId) {
        course = courses[i];
        break;
      }
    }
    if (!course) {
      return {
        success: false,
        enrollment_id: null,
        course_id: courseId,
        learning_plan_id: null,
        learning_plan_name: null,
        status: null,
        enrolled_at: null,
        message: 'Course not found.'
      };
    }

    let planId = null;
    let planName = null;

    if (mode === 'add_to_learning_plan') {
      if (learningPlanId) {
        for (let j = 0; j < learning_plans.length; j++) {
          if (learning_plans[j].id === learningPlanId) {
            planId = learning_plans[j].id;
            planName = learning_plans[j].name;
            break;
          }
        }
      } else {
        const ensured = this._ensureLearningPlanExists();
        planId = ensured.id;
        planName = ensured.name;
      }
    }

    const enrollmentId = this._generateId('courseenrollment');
    const enrolled_at = this._nowIso();
    const enrollment = {
      id: enrollmentId,
      courseId: courseId,
      learningPlanId: planId || null,
      status: 'enrolled',
      enrolled_at: enrolled_at,
      completed_at: null
    };
    course_enrollments.push(enrollment);
    this._saveToStorage('course_enrollments', course_enrollments);

    return {
      success: true,
      enrollment_id: enrollmentId,
      course_id: courseId,
      learning_plan_id: planId,
      learning_plan_name: planName,
      status: 'enrolled',
      enrolled_at: enrolled_at,
      message: 'Enrolled successfully.'
    };
  }

  // Weekly plan draft
  createWeeklyPlanDraft(week_start_date) {
    const startDateYMD = week_start_date || this._resolveUpcomingMonday();
    const plan = this._getOrCreateWeeklyPlanDraft(startDateYMD);

    const weekly_plan_items = this._getFromStorage('weekly_plan_items');
    const activity_templates = this._getFromStorage('activity_templates');

    const items = [];
    for (let i = 0; i < weekly_plan_items.length; i++) {
      const item = weekly_plan_items[i];
      if (item.weeklyPlanId !== plan.id) continue;
      let act = null;
      for (let j = 0; j < activity_templates.length; j++) {
        if (activity_templates[j].id === item.activityTemplateId) {
          act = activity_templates[j];
          break;
        }
      }
      items.push({
        weekly_plan_item_id: item.id,
        day_of_week: item.day_of_week,
        activity_template_id: item.activityTemplateId,
        activity_name: act ? act.name : '',
        duration_minutes: item.duration_minutes
      });
    }

    const total = this._calculateWeeklyPlanTotalDuration(plan.id);

    return {
      weekly_plan_id: plan.id,
      week_start_date: this._dateToYMD(plan.week_start_date),
      name: plan.name || '',
      items: items,
      total_duration_minutes: total
    };
  }

  // Activity templates
  getActivityTemplates(category, query) {
    const activity_templates = this._getFromStorage('activity_templates');
    const lowerQuery = query ? query.toLowerCase() : null;
    const activities = [];

    for (let i = 0; i < activity_templates.length; i++) {
      const a = activity_templates[i];
      if (category && a.category !== category) continue;
      if (lowerQuery && a.name.toLowerCase().indexOf(lowerQuery) === -1) continue;
      activities.push({
        activity_template_id: a.id,
        name: a.name,
        category: a.category,
        default_duration_minutes: a.default_duration_minutes,
        description: a.description || ''
      });
    }

    return {
      activities: activities
    };
  }

  // Add activity to weekly plan
  addActivityToWeeklyPlan(weeklyPlanId, activityTemplateId, day_of_week, duration_minutes) {
    const weekly_plans = this._getFromStorage('weekly_plans');
    const activity_templates = this._getFromStorage('activity_templates');
    const weekly_plan_items = this._getFromStorage('weekly_plan_items');

    let planExists = false;
    for (let i = 0; i < weekly_plans.length; i++) {
      if (weekly_plans[i].id === weeklyPlanId) {
        planExists = true;
        break;
      }
    }
    if (!planExists) {
      return null;
    }

    let act = null;
    for (let j = 0; j < activity_templates.length; j++) {
      if (activity_templates[j].id === activityTemplateId) {
        act = activity_templates[j];
        break;
      }
    }
    if (!act) {
      return null;
    }

    const itemId = this._generateId('weeklyplanitem');
    const item = {
      id: itemId,
      weeklyPlanId: weeklyPlanId,
      activityTemplateId: activityTemplateId,
      day_of_week: day_of_week,
      duration_minutes: duration_minutes,
      custom_label: null
    };
    weekly_plan_items.push(item);
    this._saveToStorage('weekly_plan_items', weekly_plan_items);

    const total = this._calculateWeeklyPlanTotalDuration(weeklyPlanId);

    return {
      weekly_plan_id: weeklyPlanId,
      weekly_plan_item_id: itemId,
      day_of_week: day_of_week,
      activity_template_id: activityTemplateId,
      activity_name: act.name,
      duration_minutes: duration_minutes,
      total_duration_minutes: total
    };
  }

  // Update weekly plan item
  updateWeeklyPlanItem(weeklyPlanItemId, duration_minutes, custom_label) {
    const weekly_plan_items = this._getFromStorage('weekly_plan_items');
    const activity_templates = this._getFromStorage('activity_templates');
    let item = null;

    for (let i = 0; i < weekly_plan_items.length; i++) {
      if (weekly_plan_items[i].id === weeklyPlanItemId) {
        if (typeof duration_minutes === 'number') {
          weekly_plan_items[i].duration_minutes = duration_minutes;
        }
        if (typeof custom_label === 'string') {
          weekly_plan_items[i].custom_label = custom_label;
        }
        item = weekly_plan_items[i];
        break;
      }
    }

    if (!item) {
      return null;
    }

    this._saveToStorage('weekly_plan_items', weekly_plan_items);

    const total = this._calculateWeeklyPlanTotalDuration(item.weeklyPlanId);

    let act = null;
    for (let j = 0; j < activity_templates.length; j++) {
      if (activity_templates[j].id === item.activityTemplateId) {
        act = activity_templates[j];
        break;
      }
    }

    return {
      weekly_plan_id: item.weeklyPlanId,
      weekly_plan_item_id: item.id,
      day_of_week: item.day_of_week,
      activity_template_id: item.activityTemplateId,
      activity_name: act ? act.name : '',
      duration_minutes: item.duration_minutes,
      custom_label: item.custom_label || null,
      total_duration_minutes: total
    };
  }

  // Finalize weekly plan
  finalizeWeeklyPlan(weeklyPlanId, name) {
    const weekly_plans = this._getFromStorage('weekly_plans');
    let plan = null;
    for (let i = 0; i < weekly_plans.length; i++) {
      if (weekly_plans[i].id === weeklyPlanId) {
        weekly_plans[i].name = name;
        plan = weekly_plans[i];
        break;
      }
    }
    if (!plan) {
      return {
        success: false,
        weekly_plan_id: weeklyPlanId,
        name: null,
        week_start_date: null,
        total_duration_minutes: 0,
        created_at: null,
        message: 'Weekly plan not found.'
      };
    }

    const total = this._calculateWeeklyPlanTotalDuration(weeklyPlanId);
    plan.total_duration_minutes = total;
    this._saveToStorage('weekly_plans', weekly_plans);

    return {
      success: true,
      weekly_plan_id: weeklyPlanId,
      name: name,
      week_start_date: this._dateToYMD(plan.week_start_date),
      total_duration_minutes: total,
      created_at: plan.created_at,
      message: 'Weekly plan saved.'
    };
  }

  // Assessments list
  getAssessmentsList() {
    const assessments = this._getFromStorage('assessments');
    const list = assessments.map(function (a) {
      return {
        assessment_id: a.id,
        name: a.name,
        description: a.description || '',
        estimated_time_minutes: a.estimated_time_minutes || null
      };
    });
    return {
      assessments: list
    };
  }

  // Start assessment
  startAssessment(assessmentId) {
    const assessments = this._getFromStorage('assessments');
    const assessment_questions = this._getFromStorage('assessment_questions');
    const assessment_runs = this._getFromStorage('assessment_runs');

    let assessment = null;
    for (let i = 0; i < assessments.length; i++) {
      if (assessments[i].id === assessmentId) {
        assessment = assessments[i];
        break;
      }
    }
    if (!assessment) return null;

    const runId = this._generateId('assessmentrun');
    const started_at = this._nowIso();
    const run = {
      id: runId,
      assessmentId: assessmentId,
      started_at: started_at,
      completed_at: null,
      responses: [],
      score: null,
      summary_text: ''
    };
    assessment_runs.push(run);
    this._saveToStorage('assessment_runs', assessment_runs);

    const questions = [];
    for (let j = 0; j < assessment_questions.length; j++) {
      const q = assessment_questions[j];
      if (q.assessmentId === assessmentId) {
        questions.push(q);
      }
    }
    questions.sort(function (a, b) { return a.order_index - b.order_index; });

    let first_question = null;
    if (questions.length > 0) {
      const fq = questions[0];
      first_question = {
        question_id: fq.id,
        question_text: fq.question_text,
        response_type: fq.response_type,
        scale_min: fq.scale_min,
        scale_max: fq.scale_max,
        scale_min_label: fq.scale_min_label,
        scale_max_label: fq.scale_max_label,
        order_index: fq.order_index
      };
    }

    return {
      assessment_run_id: runId,
      assessment_id: assessmentId,
      name: assessment.name,
      description: assessment.description || '',
      started_at: started_at,
      first_question: first_question
    };
  }

  // Submit assessment response
  submitAssessmentResponse(assessmentRunId, questionId, response) {
    const assessment_runs = this._getFromStorage('assessment_runs');
    const assessment_questions = this._getFromStorage('assessment_questions');

    let run = null;
    for (let i = 0; i < assessment_runs.length; i++) {
      if (assessment_runs[i].id === assessmentRunId) {
        run = assessment_runs[i];
        break;
      }
    }
    if (!run) {
      return {
        assessment_run_id: assessmentRunId,
        completed: false,
        next_question: null
      };
    }

    // upsert response
    if (!run.responses) run.responses = [];
    let found = false;
    for (let r = 0; r < run.responses.length; r++) {
      if (run.responses[r].questionId === questionId) {
        run.responses[r] = {
          questionId: questionId,
          value_number: typeof response.value_number === 'number' ? response.value_number : null,
          value_text: response.value_text || null
        };
        found = true;
        break;
      }
    }
    if (!found) {
      run.responses.push({
        questionId: questionId,
        value_number: typeof response.value_number === 'number' ? response.value_number : null,
        value_text: response.value_text || null
      });
    }

    // Determine next question
    const questions = [];
    for (let j = 0; j < assessment_questions.length; j++) {
      const q = assessment_questions[j];
      if (q.assessmentId === run.assessmentId) {
        questions.push(q);
      }
    }
    questions.sort(function (a, b) { return a.order_index - b.order_index; });

    let currentIndex = -1;
    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      if (questions[qIndex].id === questionId) {
        currentIndex = qIndex;
        break;
      }
    }

    let completed = false;
    let next_question = null;

    if (currentIndex === -1 || currentIndex === questions.length - 1) {
      // completed
      completed = true;
      run.completed_at = this._nowIso();
      // simple numeric score: average of numeric responses
      let sum = 0;
      let count = 0;
      for (let r = 0; r < run.responses.length; r++) {
        const v = run.responses[r].value_number;
        if (typeof v === 'number') {
          sum += v;
          count++;
        }
      }
      run.score = count > 0 ? sum / count : null;
      run.summary_text = '';
    } else {
      const nq = questions[currentIndex + 1];
      next_question = {
        question_id: nq.id,
        question_text: nq.question_text,
        response_type: nq.response_type,
        scale_min: nq.scale_min,
        scale_max: nq.scale_max,
        scale_min_label: nq.scale_min_label,
        scale_max_label: nq.scale_max_label,
        order_index: nq.order_index
      };
    }

    this._saveToStorage('assessment_runs', assessment_runs);

    return {
      assessment_run_id: assessmentRunId,
      completed: completed,
      next_question: next_question
    };
  }

  // Assessment results
  getAssessmentResults(assessmentRunId) {
    const assessment_runs = this._getFromStorage('assessment_runs');
    const assessments = this._getFromStorage('assessments');

    let run = null;
    for (let i = 0; i < assessment_runs.length; i++) {
      if (assessment_runs[i].id === assessmentRunId) {
        run = assessment_runs[i];
        break;
      }
    }
    if (!run) return null;

    let assessment = null;
    for (let j = 0; j < assessments.length; j++) {
      if (assessments[j].id === run.assessmentId) {
        assessment = assessments[j];
        break;
      }
    }

    return {
      assessment_run_id: run.id,
      assessment_id: run.assessmentId,
      name: assessment ? assessment.name : '',
      completed_at: run.completed_at,
      score: run.score,
      summary_text: run.summary_text || ''
    };
  }

  // Wellness goal from assessment
  createWellnessGoalFromAssessment(assessmentRunId, name, goal_type, duration_days, start_date, reminder_time, reminder_type) {
    const assessment_runs = this._getFromStorage('assessment_runs');
    const wellness_goals = this._getFromStorage('wellness_goals');

    let run = null;
    for (let i = 0; i < assessment_runs.length; i++) {
      if (assessment_runs[i].id === assessmentRunId) {
        run = assessment_runs[i];
        break;
      }
    }
    if (!run) {
      return {
        success: false,
        goal_id: null,
        name: name,
        goal_type: goal_type,
        start_date: start_date,
        duration_days: duration_days,
        reminder_time: reminder_time,
        reminder_type: reminder_type,
        status: null,
        created_at: null,
        message: 'Assessment run not found.'
      };
    }

    const goalId = this._generateId('wellnessgoal');
    const created_at = this._nowIso();
    const goal = {
      id: goalId,
      name: name,
      goal_type: goal_type,
      source_type: 'assessment_result',
      sourceAssessmentRunId: assessmentRunId,
      start_date: start_date,
      duration_days: duration_days,
      reminder_time: reminder_time,
      reminder_type: reminder_type,
      status: 'active',
      created_at: created_at
    };
    wellness_goals.push(goal);
    this._saveToStorage('wellness_goals', wellness_goals);

    return {
      success: true,
      goal_id: goalId,
      name: name,
      goal_type: goal_type,
      start_date: start_date,
      duration_days: duration_days,
      reminder_time: reminder_time,
      reminder_type: reminder_type,
      status: 'active',
      created_at: created_at,
      message: 'Goal created.'
    };
  }

  // Article filter options
  getArticlesFilterOptions() {
    return {
      min_read_time_presets_minutes: [1, 3, 4, 5, 10, 15],
      publication_date_ranges: [
        { value: 'last_6_months', label: 'Last 6 months' },
        { value: 'last_1_year', label: 'Last 1 year' },
        { value: 'last_2_years', label: 'Last 2 years' },
        { value: 'all_time', label: 'All time' }
      ]
    };
  }

  // Search articles
  searchArticles(query, min_read_time_minutes, publication_date_range, page, page_size) {
    const articles = this._getFromStorage('articles');
    const lowerQuery = query ? query.toLowerCase() : null;
    const pageNum = page || 1;
    const size = page_size || 20;

    let cutoff = null;
    const now = new Date();
    if (publication_date_range === 'last_6_months') {
      cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate()));
    } else if (publication_date_range === 'last_1_year') {
      cutoff = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()));
    } else if (publication_date_range === 'last_2_years') {
      cutoff = new Date(Date.UTC(now.getUTCFullYear() - 2, now.getUTCMonth(), now.getUTCDate()));
    }

    const results = [];
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (typeof min_read_time_minutes === 'number' && a.read_time_minutes < min_read_time_minutes) continue;
      if (cutoff) {
        const pubDate = new Date(a.published_at);
        if (pubDate < cutoff) continue;
      }
      if (lowerQuery) {
        const text = (a.title || '') + ' ' + (a.summary || '');
        let tagsText = '';
        if (a.topic_tags && a.topic_tags.length) tagsText = ' ' + a.topic_tags.join(' ');
        if ((text + tagsText).toLowerCase().indexOf(lowerQuery) === -1) continue;
      }
      results.push({
        article_id: a.id,
        title: a.title,
        summary: a.summary || '',
        read_time_minutes: a.read_time_minutes,
        published_at: a.published_at,
        topic_tags: a.topic_tags || [],
        is_saved: false
      });
    }

    // mark saved
    const saved_articles = this._getFromStorage('saved_articles');
    const savedSet = {};
    for (let s = 0; s < saved_articles.length; s++) {
      savedSet[saved_articles[s].articleId] = true;
    }
    for (let r = 0; r < results.length; r++) {
      if (savedSet[results[r].article_id]) {
        results[r].is_saved = true;
      }
    }

    results.sort(function (a, b) {
      return new Date(b.published_at) - new Date(a.published_at);
    });

    const total_count = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_count: total_count
    };
  }

  // Save article
  saveArticle(articleId) {
    const articles = this._getFromStorage('articles');
    const saved_articles = this._getFromStorage('saved_articles');

    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }
    if (!article) {
      return {
        success: false,
        saved_article_id: null,
        article_id: articleId,
        saved_at: null
      };
    }

    for (let j = 0; j < saved_articles.length; j++) {
      if (saved_articles[j].articleId === articleId) {
        return {
          success: true,
          saved_article_id: saved_articles[j].id,
          article_id: articleId,
          saved_at: saved_articles[j].saved_at
        };
      }
    }

    const savedId = this._generateId('savedarticle');
    const saved_at = this._nowIso();
    saved_articles.push({
      id: savedId,
      articleId: articleId,
      saved_at: saved_at
    });
    this._saveToStorage('saved_articles', saved_articles);

    return {
      success: true,
      saved_article_id: savedId,
      article_id: articleId,
      saved_at: saved_at
    };
  }

  // Get saved articles (FK resolution)
  getSavedArticles() {
    const saved_articles = this._getFromStorage('saved_articles');
    const articles = this._getFromStorage('articles');

    const list = [];
    for (let i = 0; i < saved_articles.length; i++) {
      const sa = saved_articles[i];
      let article = null;
      for (let j = 0; j < articles.length; j++) {
        if (articles[j].id === sa.articleId) {
          article = articles[j];
          break;
        }
      }
      if (!article) continue;
      list.push({
        saved_article_id: sa.id,
        article_id: sa.articleId,
        title: article.title,
        summary: article.summary || '',
        read_time_minutes: article.read_time_minutes,
        published_at: article.published_at,
        topic_tags: article.topic_tags || [],
        article: article
      });
    }

    return {
      saved_articles: list
    };
  }

  // Reading lists overview
  getReadingListsOverview() {
    const reading_lists = this._getFromStorage('reading_lists');
    const reading_list_items = this._getFromStorage('reading_list_items');

    const counts = {};
    for (let i = 0; i < reading_list_items.length; i++) {
      const item = reading_list_items[i];
      counts[item.readingListId] = (counts[item.readingListId] || 0) + 1;
    }

    const list = reading_lists.map(function (rl) {
      return {
        reading_list_id: rl.id,
        name: rl.name,
        description: rl.description || '',
        article_count: counts[rl.id] || 0,
        created_at: rl.created_at
      };
    });

    return {
      reading_lists: list
    };
  }

  // Create reading list
  createReadingList(name, description, articleIds) {
    const reading_lists = this._getFromStorage('reading_lists');
    const reading_list_items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const listId = this._generateId('readinglist');
    const created_at = this._nowIso();
    const rl = {
      id: listId,
      name: name,
      description: description || '',
      created_at: created_at
    };
    reading_lists.push(rl);

    let count = 0;
    if (articleIds && articleIds.length) {
      for (let i = 0; i < articleIds.length; i++) {
        const articleId = articleIds[i];
        let exists = false;
        for (let j = 0; j < articles.length; j++) {
          if (articles[j].id === articleId) {
            exists = true;
            break;
          }
        }
        if (!exists) continue;
        const itemId = this._generateId('readinglistitem');
        reading_list_items.push({
          id: itemId,
          readingListId: listId,
          articleId: articleId,
          added_at: this._nowIso(),
          order_index: count
        });
        count++;
      }
    }

    this._saveToStorage('reading_lists', reading_lists);
    this._saveToStorage('reading_list_items', reading_list_items);

    return {
      success: true,
      reading_list_id: listId,
      name: name,
      article_count: count,
      created_at: created_at,
      message: 'Reading list created.'
    };
  }

  // Groups filter options
  getGroupsFilterOptions() {
    const groups = this._getFromStorage('groups');

    const focusSet = {};
    const langSet = {};
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const tags = g.focus_tags || [];
      for (let j = 0; j < tags.length; j++) {
        focusSet[tags[j]] = true;
      }
      if (g.language) langSet[g.language] = true;
    }

    const focus_tags = Object.keys(focusSet).map((value) => ({
      value: value,
      label: this._labelizeIdentifier(value)
    }), this);

    const languages = Object.keys(langSet).map((value) => ({
      value: value,
      label: this._labelizeIdentifier(value)
    }), this);

    const group_size_ranges = [
      { min_members: 1, max_members: 10, label: '1-10 members' },
      { min_members: 10, max_members: 30, label: '10-30 members' },
      { min_members: 30, max_members: 100, label: '30-100 members' }
    ];

    const meeting_time_presets = [
      { day_pattern: 'weekdays', start_time: '17:00', end_time: '21:00', label: 'Weekdays evenings (5-9 PM)' },
      { day_pattern: 'weekends', start_time: '09:00', end_time: '12:00', label: 'Weekends mornings' }
    ];

    return {
      focus_tags: focus_tags,
      languages: languages,
      group_size_ranges: group_size_ranges,
      meeting_time_presets: meeting_time_presets
    };
  }

  // Search groups
  searchGroups(focus_tag, language, min_members, max_members, meeting_day_pattern, meeting_time_range) {
    const groups = this._getFromStorage('groups');

    const results = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (focus_tag) {
        const tags = g.focus_tags || [];
        if (tags.indexOf(focus_tag) === -1) continue;
      }
      if (language && g.language !== language) continue;
      if (typeof min_members === 'number' && g.member_count < min_members) continue;
      if (typeof max_members === 'number' && g.member_count > max_members) continue;
      if (meeting_day_pattern && g.meeting_day_pattern !== meeting_day_pattern) continue;
      if (meeting_time_range && meeting_time_range.start_time && meeting_time_range.end_time) {
        const startTime = g.meeting_time_start || '00:00';
        const endTime = g.meeting_time_end || '23:59';
        if (startTime < meeting_time_range.start_time || endTime > meeting_time_range.end_time) continue;
      }
      results.push({
        group_id: g.id,
        name: g.name,
        description: g.description || '',
        focus_tags: g.focus_tags || [],
        language: g.language,
        member_count: g.member_count,
        meeting_day_pattern: g.meeting_day_pattern,
        meeting_time_start: g.meeting_time_start || '',
        meeting_time_end: g.meeting_time_end || '',
        is_open: g.is_open
      });
    }

    return {
      results: results,
      total_count: results.length
    };
  }

  // Group detail
  getGroupDetail(groupId) {
    const groups = this._getFromStorage('groups');
    const group_meetings = this._getFromStorage('group_meetings');
    const meeting_rsvps = this._getFromStorage('meeting_rsvps');
    const group_memberships = this._getFromStorage('group_memberships');

    let group = null;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id === groupId) {
        group = groups[i];
        break;
      }
    }
    if (!group) return null;

    let is_member = false;
    for (let m = 0; m < group_memberships.length; m++) {
      if (group_memberships[m].groupId === groupId && group_memberships[m].status === 'member') {
        is_member = true;
        break;
      }
    }

    const upcoming_meetings_raw = [];
    const now = new Date();
    for (let j = 0; j < group_meetings.length; j++) {
      const gm = group_meetings[j];
      if (gm.groupId !== groupId) continue;
      const start = new Date(gm.start_datetime);
      if (start < now) continue;
      upcoming_meetings_raw.push(gm);
    }

    upcoming_meetings_raw.sort(function (a, b) {
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });

    const upcoming_meetings = [];
    for (let k = 0; k < upcoming_meetings_raw.length; k++) {
      const gm = upcoming_meetings_raw[k];
      let status = 'none';
      for (let r = 0; r < meeting_rsvps.length; r++) {
        if (meeting_rsvps[r].groupMeetingId === gm.id) {
          status = meeting_rsvps[r].status;
          break;
        }
      }
      upcoming_meetings.push({
        group_meeting_id: gm.id,
        title: gm.title || '',
        description: gm.description || '',
        start_datetime: gm.start_datetime,
        end_datetime: gm.end_datetime,
        location_type: gm.location_type,
        meeting_url: gm.meeting_url || '',
        capacity: gm.capacity || null,
        user_rsvp_status: status
      });
    }

    return {
      group_id: group.id,
      name: group.name,
      description: group.description || '',
      focus_tags: group.focus_tags || [],
      language: group.language,
      member_count: group.member_count,
      meeting_day_pattern: group.meeting_day_pattern,
      meeting_time_start: group.meeting_time_start || '',
      meeting_time_end: group.meeting_time_end || '',
      is_open: group.is_open,
      is_member: is_member,
      upcoming_meetings: upcoming_meetings
    };
  }

  // Join group
  joinGroup(groupId) {
    const groups = this._getFromStorage('groups');
    const group_memberships = this._getFromStorage('group_memberships');

    let group = null;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id === groupId) {
        group = groups[i];
        break;
      }
    }
    if (!group) {
      return {
        success: false,
        group_membership_id: null,
        group_id: groupId,
        status: null,
        joined_at: null,
        message: 'Group not found.'
      };
    }

    for (let j = 0; j < group_memberships.length; j++) {
      if (group_memberships[j].groupId === groupId && group_memberships[j].status === 'member') {
        return {
          success: true,
          group_membership_id: group_memberships[j].id,
          group_id: groupId,
          status: 'member',
          joined_at: group_memberships[j].joined_at,
          message: 'Already a member.'
        };
      }
    }

    const membershipId = this._generateId('groupmembership');
    const joined_at = this._nowIso();
    group_memberships.push({
      id: membershipId,
      groupId: groupId,
      status: 'member',
      joined_at: joined_at
    });
    this._saveToStorage('group_memberships', group_memberships);

    return {
      success: true,
      group_membership_id: membershipId,
      group_id: groupId,
      status: 'member',
      joined_at: joined_at,
      message: 'Joined group.'
    };
  }

  // RSVP to group meeting
  rsvpToGroupMeeting(groupMeetingId, status) {
    const group_meetings = this._getFromStorage('group_meetings');
    const meeting_rsvps = this._getFromStorage('meeting_rsvps');

    let meeting = null;
    for (let i = 0; i < group_meetings.length; i++) {
      if (group_meetings[i].id === groupMeetingId) {
        meeting = group_meetings[i];
        break;
      }
    }
    if (!meeting) {
      return {
        success: false,
        meeting_rsvp_id: null,
        group_meeting_id: groupMeetingId,
        status: null,
        responded_at: null,
        message: 'Meeting not found.'
      };
    }

    let rsvp = null;
    for (let j = 0; j < meeting_rsvps.length; j++) {
      if (meeting_rsvps[j].groupMeetingId === groupMeetingId) {
        rsvp = meeting_rsvps[j];
        break;
      }
    }

    const responded_at = this._nowIso();
    if (rsvp) {
      rsvp.status = status;
      rsvp.responded_at = responded_at;
    } else {
      const rsvpId = this._generateId('meetingrsvp');
      rsvp = {
        id: rsvpId,
        groupMeetingId: groupMeetingId,
        status: status,
        responded_at: responded_at
      };
      meeting_rsvps.push(rsvp);
    }

    this._saveToStorage('meeting_rsvps', meeting_rsvps);

    return {
      success: true,
      meeting_rsvp_id: rsvp.id,
      group_meeting_id: groupMeetingId,
      status: status,
      responded_at: responded_at,
      message: 'RSVP updated.'
    };
  }

  // Meditation filter options
  getMeditationFilterOptions() {
    const meditation_tracks = this._getFromStorage('meditation_tracks');

    const levelSet = { beginner: true, intermediate: true, advanced: true };
    const tagSet = {};

    for (let i = 0; i < meditation_tracks.length; i++) {
      const t = meditation_tracks[i];
      if (t.level) levelSet[t.level] = true;
      const tags = t.tags || [];
      for (let j = 0; j < tags.length; j++) {
        tagSet[tags[j]] = true;
      }
    }

    const levels = Object.keys(levelSet).map((value) => ({
      value: value,
      label: this._labelizeIdentifier(value)
    }), this);

    const max_duration_presets_minutes = [5, 10, 12, 15, 20];

    const common_tags = Object.keys(tagSet).map((value) => ({
      value: value,
      label: this._labelizeIdentifier(value)
    }), this);

    return {
      levels: levels,
      max_duration_presets_minutes: max_duration_presets_minutes,
      common_tags: common_tags
    };
  }

  // Search meditation tracks
  searchMeditationTracks(level, max_duration_minutes, tags, page, page_size) {
    const meditation_tracks = this._getFromStorage('meditation_tracks');
    const pageNum = page || 1;
    const size = page_size || 20;
    const tagList = tags || [];

    const results = [];
    for (let i = 0; i < meditation_tracks.length; i++) {
      const t = meditation_tracks[i];
      if (level && t.level !== level) continue;
      if (typeof max_duration_minutes === 'number' && t.duration_minutes > max_duration_minutes) continue;
      if (tagList.length) {
        const trackTags = t.tags || [];
        let hasAny = false;
        for (let j = 0; j < tagList.length; j++) {
          if (trackTags.indexOf(tagList[j]) !== -1) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) continue;
      }
      results.push({
        track_id: t.id,
        title: t.title,
        description: t.description || '',
        level: t.level,
        duration_minutes: t.duration_minutes,
        tags: t.tags || []
      });
    }

    results.sort(function (a, b) {
      return a.duration_minutes - b.duration_minutes;
    });

    const total_count = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_count: total_count
    };
  }

  // Add track to playlist
  addTrackToPlaylist(meditationTrackId, playlistId, newPlaylistName) {
    const meditation_tracks = this._getFromStorage('meditation_tracks');
    const playlists = this._getFromStorage('playlists');
    const playlist_items = this._getFromStorage('playlist_items');

    let track = null;
    for (let i = 0; i < meditation_tracks.length; i++) {
      if (meditation_tracks[i].id === meditationTrackId) {
        track = meditation_tracks[i];
        break;
      }
    }
    if (!track) {
      return {
        success: false,
        playlist_id: null,
        playlist_name: null,
        playlist_item_id: null,
        message: 'Track not found.'
      };
    }

    let playlist = null;
    if (playlistId) {
      for (let j = 0; j < playlists.length; j++) {
        if (playlists[j].id === playlistId) {
          playlist = playlists[j];
          break;
        }
      }
    } else if (newPlaylistName) {
      const pid = this._generateId('playlist');
      playlist = {
        id: pid,
        name: newPlaylistName,
        is_favorite: false,
        created_at: this._nowIso(),
        updated_at: null
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    } else {
      return {
        success: false,
        playlist_id: null,
        playlist_name: null,
        playlist_item_id: null,
        message: 'Playlist not specified.'
      };
    }

    let maxOrder = -1;
    for (let k = 0; k < playlist_items.length; k++) {
      if (playlist_items[k].playlistId === playlist.id) {
        if (typeof playlist_items[k].order_index === 'number' && playlist_items[k].order_index > maxOrder) {
          maxOrder = playlist_items[k].order_index;
        }
      }
    }
    const order = maxOrder + 1;
    const itemId = this._generateId('playlistitem');
    playlist_items.push({
      id: itemId,
      playlistId: playlist.id,
      meditationTrackId: meditationTrackId,
      order_index: order,
      added_at: this._nowIso()
    });

    this._saveToStorage('playlist_items', playlist_items);

    return {
      success: true,
      playlist_id: playlist.id,
      playlist_name: playlist.name,
      playlist_item_id: itemId,
      message: 'Track added to playlist.'
    };
  }

  // Playlists overview
  getPlaylistsOverview() {
    const playlists = this._getFromStorage('playlists');
    const playlist_items = this._getFromStorage('playlist_items');

    const counts = {};
    for (let i = 0; i < playlist_items.length; i++) {
      const item = playlist_items[i];
      counts[item.playlistId] = (counts[item.playlistId] || 0) + 1;
    }

    const overview = playlists.map(function (p) {
      return {
        playlist_id: p.id,
        name: p.name,
        is_favorite: !!p.is_favorite,
        track_count: counts[p.id] || 0,
        created_at: p.created_at
      };
    });

    return {
      playlists: overview
    };
  }

  // Playlist detail
  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlist_items = this._getFromStorage('playlist_items');
    const meditation_tracks = this._getFromStorage('meditation_tracks');

    let playlist = null;
    for (let i = 0; i < playlists.length; i++) {
      if (playlists[i].id === playlistId) {
        playlist = playlists[i];
        break;
      }
    }
    if (!playlist) return null;

    const tracks = [];
    for (let j = 0; j < playlist_items.length; j++) {
      const item = playlist_items[j];
      if (item.playlistId !== playlistId) continue;
      let track = null;
      for (let k = 0; k < meditation_tracks.length; k++) {
        if (meditation_tracks[k].id === item.meditationTrackId) {
          track = meditation_tracks[k];
          break;
        }
      }
      if (!track) continue;
      tracks.push({
        playlist_item_id: item.id,
        track_id: track.id,
        title: track.title,
        duration_minutes: track.duration_minutes,
        level: track.level,
        tags: track.tags || [],
        order_index: item.order_index,
        track: track
      });
    }

    tracks.sort(function (a, b) {
      return (a.order_index || 0) - (b.order_index || 0);
    });

    return {
      playlist_id: playlist.id,
      name: playlist.name,
      is_favorite: !!playlist.is_favorite,
      tracks: tracks
    };
  }

  // Set playlist favorite
  setPlaylistFavorite(playlistId, is_favorite) {
    const playlists = this._getFromStorage('playlists');
    let playlist = null;
    for (let i = 0; i < playlists.length; i++) {
      if (playlists[i].id === playlistId) {
        playlists[i].is_favorite = !!is_favorite;
        playlists[i].updated_at = this._nowIso();
        playlist = playlists[i];
        break;
      }
    }
    this._saveToStorage('playlists', playlists);
    return {
      playlist_id: playlistId,
      is_favorite: playlist ? !!playlist.is_favorite : !!is_favorite
    };
  }

  // Rename playlist
  renamePlaylist(playlistId, new_name) {
    const playlists = this._getFromStorage('playlists');
    let playlist = null;
    for (let i = 0; i < playlists.length; i++) {
      if (playlists[i].id === playlistId) {
        playlists[i].name = new_name;
        playlists[i].updated_at = this._nowIso();
        playlist = playlists[i];
        break;
      }
    }
    this._saveToStorage('playlists', playlists);
    return {
      playlist_id: playlistId,
      name: playlist ? playlist.name : new_name
    };
  }

  // Delete playlist
  deletePlaylist(playlistId) {
    let playlists = this._getFromStorage('playlists');
    let playlist_items = this._getFromStorage('playlist_items');

    const newPlaylists = [];
    let deleted = false;
    for (let i = 0; i < playlists.length; i++) {
      if (playlists[i].id === playlistId) {
        deleted = true;
      } else {
        newPlaylists.push(playlists[i]);
      }
    }

    const newItems = [];
    for (let j = 0; j < playlist_items.length; j++) {
      if (playlist_items[j].playlistId !== playlistId) {
        newItems.push(playlist_items[j]);
      }
    }

    this._saveToStorage('playlists', newPlaylists);
    this._saveToStorage('playlist_items', newItems);

    return {
      success: deleted,
      message: deleted ? 'Playlist deleted.' : 'Playlist not found.'
    };
  }

  // Search challenges
  searchChallenges(query, duration_days) {
    const challenge_templates = this._getFromStorage('challenge_templates');
    const lowerQuery = query ? query.toLowerCase() : null;

    const results = [];
    for (let i = 0; i < challenge_templates.length; i++) {
      const c = challenge_templates[i];
      if (!c.is_active) continue;
      if (typeof duration_days === 'number' && c.duration_days !== duration_days) continue;
      if (lowerQuery) {
        const text = (c.title || '') + ' ' + (c.description || '');
        let tagsText = '';
        if (c.tags && c.tags.length) tagsText = ' ' + c.tags.join(' ');
        if ((text + tagsText).toLowerCase().indexOf(lowerQuery) === -1) continue;
      }
      results.push({
        challenge_template_id: c.id,
        title: c.title,
        description: c.description || '',
        duration_days: c.duration_days,
        tags: c.tags || []
      });
    }

    return {
      results: results
    };
  }

  // Challenge template detail
  getChallengeTemplateDetail(challengeTemplateId) {
    const challenge_templates = this._getFromStorage('challenge_templates');
    const challenge_template_days = this._getFromStorage('challenge_template_days');
    const challenge_template_activities = this._getFromStorage('challenge_template_activities');
    const activity_templates = this._getFromStorage('activity_templates');

    let template = null;
    for (let i = 0; i < challenge_templates.length; i++) {
      if (challenge_templates[i].id === challengeTemplateId) {
        template = challenge_templates[i];
        break;
      }
    }
    if (!template) return null;

    const daysMap = {};
    for (let j = 0; j < challenge_template_days.length; j++) {
      const d = challenge_template_days[j];
      if (d.challengeTemplateId === challengeTemplateId) {
        daysMap[d.id] = {
          day_number: d.day_number,
          title: d.title || '',
          description: d.description || '',
          default_activities: []
        };
      }
    }

    for (let k = 0; k < challenge_template_activities.length; k++) {
      const a = challenge_template_activities[k];
      const day = daysMap[a.challengeTemplateDayId];
      if (!day) continue;
      let actTemplate = null;
      for (let t = 0; t < activity_templates.length; t++) {
        if (activity_templates[t].id === a.activityTemplateId) {
          actTemplate = activity_templates[t];
          break;
        }
      }
      day.default_activities.push({
        activity_template_id: a.activityTemplateId,
        activity_name: actTemplate ? actTemplate.name : '',
        order_index: a.order_index
      });
    }

    const days = Object.keys(daysMap)
      .map(function (key) { return daysMap[key]; })
      .sort(function (a, b) { return a.day_number - b.day_number; });

    return {
      challenge_template_id: template.id,
      title: template.title,
      description: template.description || '',
      duration_days: template.duration_days,
      tags: template.tags || [],
      days: days
    };
  }

  // Start challenge customization
  startChallengeCustomization(challengeTemplateId) {
    const res = this._createChallengeInstanceFromTemplate(challengeTemplateId);
    if (!res) return null;
    return res;
  }

  // Set challenge day activities
  setChallengeDayActivities(challengeInstanceId, day_number, activityTemplateIds) {
    const challenge_instance_days = this._getFromStorage('challenge_instance_days');
    const challenge_instance_activities = this._getFromStorage('challenge_instance_activities');
    const activity_templates = this._getFromStorage('activity_templates');

    let day = null;
    for (let i = 0; i < challenge_instance_days.length; i++) {
      if (challenge_instance_days[i].challengeInstanceId === challengeInstanceId && challenge_instance_days[i].day_number === day_number) {
        day = challenge_instance_days[i];
        break;
      }
    }
    if (!day) {
      return {
        challenge_instance_id: challengeInstanceId,
        day_number: day_number,
        activities: []
      };
    }

    // Remove existing activities for this day
    const remaining = [];
    for (let j = 0; j < challenge_instance_activities.length; j++) {
      if (challenge_instance_activities[j].challengeInstanceDayId !== day.id) {
        remaining.push(challenge_instance_activities[j]);
      }
    }

    const newActivities = [];
    for (let idx = 0; idx < activityTemplateIds.length; idx++) {
      const atId = activityTemplateIds[idx];
      const id = this._generateId('challengeinstanceactivity');
      const cia = {
        id: id,
        challengeInstanceDayId: day.id,
        activityTemplateId: atId,
        order_index: idx
      };
      remaining.push(cia);
      let actTemplate = null;
      for (let t = 0; t < activity_templates.length; t++) {
        if (activity_templates[t].id === atId) {
          actTemplate = activity_templates[t];
          break;
        }
      }
      newActivities.push({
        challenge_instance_activity_id: id,
        activity_template_id: atId,
        activity_name: actTemplate ? actTemplate.name : '',
        order_index: idx
      });
    }

    this._saveToStorage('challenge_instance_activities', remaining);

    return {
      challenge_instance_id: challengeInstanceId,
      day_number: day_number,
      activities: newActivities
    };
  }

  // Update challenge instance settings
  updateChallengeInstanceSettings(challengeInstanceId, name, start_date, status) {
    const challenge_instances = this._getFromStorage('challenge_instances');
    const challenge_instance_days = this._getFromStorage('challenge_instance_days');

    let instance = null;
    for (let i = 0; i < challenge_instances.length; i++) {
      if (challenge_instances[i].id === challengeInstanceId) {
        if (typeof name === 'string' && name !== '') challenge_instances[i].name = name;
        if (typeof start_date === 'string' && start_date !== '') challenge_instances[i].start_date = start_date;
        if (typeof status === 'string' && status !== '') challenge_instances[i].status = status;
        instance = challenge_instances[i];
        break;
      }
    }

    if (!instance) {
      return null;
    }

    // If start_date set, compute dates for days
    if (instance.start_date) {
      const baseDate = this._parseDateOnly(instance.start_date);
      for (let j = 0; j < challenge_instance_days.length; j++) {
        const d = challenge_instance_days[j];
        if (d.challengeInstanceId === challengeInstanceId) {
          const date = new Date(baseDate.getTime());
          date.setUTCDate(date.getUTCDate() + (d.day_number - 1));
          d.date = this._dateToYMD(date) + 'T00:00:00.000Z';
        }
      }
      this._saveToStorage('challenge_instance_days', challenge_instance_days);
    }

    this._saveToStorage('challenge_instances', challenge_instances);

    return {
      challenge_instance_id: instance.id,
      name: instance.name,
      start_date: instance.start_date,
      duration_days: instance.duration_days,
      status: instance.status
    };
  }

  // About & Help content
  getAboutAndHelpContent() {
    return {
      mission_text: 'We help you build emotional resilience and clarity through coaching, learning, and daily practices.',
      how_it_works: 'Explore coaches, courses, meditations, and challenges. Create plans and goals that fit your life, and track your progress over time.',
      faq_items: [
        {
          question: 'Is this platform a substitute for therapy?',
          answer: 'No. Our content and coaches focus on wellness, skills, and personal growth and are not a replacement for clinical mental health treatment.'
        },
        {
          question: 'Do I need an account?',
          answer: 'Your data is stored locally in your browser or device. No separate login is required in this demo implementation.'
        }
      ],
      contact_methods: [
        {
          type: 'email',
          label: 'Support Email',
          value: 'support@example.com'
        }
      ],
      legal_sections: [
        {
          key: 'terms_of_use',
          title: 'Terms of Use',
          summary: 'Use this platform for personal wellness and learning only. Do not share harmful or illegal content.'
        },
        {
          key: 'privacy_policy',
          title: 'Privacy Policy',
          summary: 'In this implementation, your data is stored only in your localStorage and is not transmitted to any server.'
        }
      ]
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
