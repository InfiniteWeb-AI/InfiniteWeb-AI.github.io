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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'studies',
      'study_sessions',
      'study_signups',
      'child_study_registrations',
      'interested_study_items',
      'outreach_mailing_list_subscriptions',
      'publications',
      'reading_list_items',
      'events',
      'event_rsvps',
      'schedule_items',
      'research_assistant_applications',
      'measures',
      'measurement_toolkit_items',
      'people',
      'person_contact_messages',
      'about_page_sections',
      'join_lab_sections',
      'general_contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('site_settings')) {
      localStorage.setItem(
        'site_settings',
        JSON.stringify({ mission_summary: '' })
      );
    }

    if (!localStorage.getItem('contact_page_info')) {
      localStorage.setItem(
        'contact_page_info',
        JSON.stringify({
          lab_email: '',
          phone_number: '',
          physical_location: '',
          office_hours: ''
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
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

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // -------------------- Private stores helpers --------------------

  _getOrCreateInterestedStudiesStore() {
    const items = this._getFromStorage('interested_study_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('interested_study_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateReadingListStore() {
    const items = this._getFromStorage('reading_list_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('reading_list_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateMeasurementToolkitStore() {
    const items = this._getFromStorage('measurement_toolkit_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('measurement_toolkit_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateScheduleStore() {
    const items = this._getFromStorage('schedule_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('schedule_items', []);
      return [];
    }
    return items;
  }

  // -------------------- Generic helpers --------------------

  _toTitleCase(str) {
    if (!str) return '';
    return str
      .replace(/_/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  _stringContains(haystack, needle) {
    if (!haystack || !needle) return false;
    return String(haystack).toLowerCase().indexOf(String(needle).toLowerCase()) !== -1;
  }

  _compareDateTimeStrings(a, b) {
    const ta = a ? Date.parse(a) : NaN;
    const tb = b ? Date.parse(b) : NaN;
    const aValid = !Number.isNaN(ta);
    const bValid = !Number.isNaN(tb);
    if (!aValid && !bValid) return 0;
    if (!aValid) return 1;
    if (!bValid) return -1;
    return ta - tb;
  }

  _formatAgeRangeLabel(minYears, maxYears) {
    if (minYears != null && maxYears != null) {
      return String(minYears) + '\u2013' + String(maxYears) + ' years';
    }
    if (minYears != null) {
      return String(minYears) + '+ years';
    }
    if (maxYears != null) {
      return 'Up to ' + String(maxYears) + ' years';
    }
    return '';
  }

  _intersectsArray(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
      return false;
    }
    const setB = new Set(b);
    for (let i = 0; i < a.length; i++) {
      if (setB.has(a[i])) return true;
    }
    return false;
  }

  // -------------------- Options for enums --------------------

  _getParticipantGroupsOptions() {
    return [
      { value: 'adult_studies', label: 'Adult Studies' },
      { value: 'child_studies', label: 'Child Studies' }
    ];
  }

  _getStudyFormatsOptions() {
    return [
      { value: 'online', label: 'Online' },
      { value: 'in_person_at_campus_lab', label: 'In-person at campus lab' },
      { value: 'phone', label: 'Phone' }
    ];
  }

  _getStudyTopicsOptions() {
    return [
      { value: 'language_development', label: 'Language Development' },
      { value: 'social_anxiety', label: 'Social Anxiety' },
      { value: 'emotion_regulation', label: 'Emotion Regulation' },
      { value: 'sleep', label: 'Sleep' },
      { value: 'memory', label: 'Memory' },
      { value: 'mindfulness', label: 'Mindfulness' },
      { value: 'cognitive_psychology', label: 'Cognitive Psychology' },
      { value: 'developmental_psychology', label: 'Developmental Psychology' },
      { value: 'college_preparation', label: 'College Preparation' },
      { value: 'social_cognition', label: 'Social Cognition' },
      { value: 'other', label: 'Other' }
    ];
  }

  _getCompensationTypesOptions() {
    return [
      { value: 'cash', label: 'Cash' },
      { value: 'gift_card', label: 'Gift Card' },
      { value: 'toy', label: 'Toy' },
      { value: 'course_credit', label: 'Course Credit' },
      { value: 'other', label: 'Other' }
    ];
  }

  _getPublicationResearchAreasOptions() {
    return [
      { value: 'developmental_psychology', label: 'Developmental Psychology' },
      { value: 'cognitive_psychology', label: 'Cognitive Psychology' },
      { value: 'social_psychology', label: 'Social Psychology' },
      { value: 'clinical_psychology', label: 'Clinical Psychology' },
      { value: 'neuroscience', label: 'Neuroscience' },
      { value: 'emotion_regulation', label: 'Emotion Regulation' },
      { value: 'language_development', label: 'Language Development' },
      { value: 'other', label: 'Other' }
    ];
  }

  _getEventTypesOptions() {
    return [
      { value: 'research_talk_colloquium', label: 'Research talk / Colloquium' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'outreach_event', label: 'Outreach Event' },
      { value: 'lab_meeting', label: 'Lab Meeting' },
      { value: 'other', label: 'Other' }
    ];
  }

  _getMeasuresTopicsOptions() {
    return [
      { value: 'mindfulness', label: 'Mindfulness' },
      { value: 'emotion_regulation', label: 'Emotion Regulation' },
      { value: 'social_anxiety', label: 'Social Anxiety' },
      { value: 'sleep', label: 'Sleep' },
      { value: 'memory', label: 'Memory' },
      { value: 'language_development', label: 'Language Development' },
      { value: 'cognitive_psychology', label: 'Cognitive Psychology' },
      { value: 'developmental_psychology', label: 'Developmental Psychology' },
      { value: 'social_cognition', label: 'Social Cognition' },
      { value: 'other', label: 'Other' }
    ];
  }

  _getPeopleRolesOptions() {
    return [
      { value: 'principal_investigator', label: 'Principal Investigator' },
      { value: 'graduate_student', label: 'Graduate Student' },
      { value: 'postdoc', label: 'Postdoctoral Scholar' },
      { value: 'staff', label: 'Staff' },
      { value: 'research_assistant', label: 'Research Assistant' },
      { value: 'undergraduate_student', label: 'Undergraduate Student' },
      { value: 'collaborator', label: 'Collaborator' },
      { value: 'other', label: 'Other' }
    ];
  }

  // -------------------- Interface implementations --------------------
  // 1) getHomePageContent

  getHomePageContent() {
    const siteSettings = this._getFromStorage('site_settings', { mission_summary: '' });
    const mission_summary = siteSettings.mission_summary || '';

    const studies = this._getFromStorage('studies', []);
    const measures = this._getFromStorage('measures', []);
    const publications = this._getFromStorage('publications', []);
    const events = this._getFromStorage('events', []);

    const areaKeys = new Set();
    studies.forEach((s) => {
      if (s.topic) areaKeys.add(s.topic);
    });
    measures.forEach((m) => {
      if (m.topic) areaKeys.add(m.topic);
      if (Array.isArray(m.keywords)) {
        // keywords not used as keys
      }
    });
    publications.forEach((p) => {
      if (p.primary_research_area) areaKeys.add(p.primary_research_area);
      if (Array.isArray(p.research_area_tags)) {
        p.research_area_tags.forEach((t) => areaKeys.add(t));
      }
    });

    const research_area_summaries = Array.from(areaKeys).map((key) => ({
      key: key,
      name: this._toTitleCase(key),
      short_description: ''
    }));

    const primary_audiences = [
      {
        key: 'participants',
        label: 'Participants',
        description: 'Adults and families interested in taking part in our research.'
      },
      {
        key: 'students',
        label: 'Students',
        description: 'Undergraduate and graduate students looking for research experience.'
      },
      {
        key: 'community',
        label: 'Community & Schools',
        description: 'Educators, clinicians, and community partners collaborating with the lab.'
      }
    ];

    const nowMs = Date.now();

    const featured_studies = studies
      .filter((s) => s.is_active && s.participant_group === 'adult_studies')
      .sort((a, b) => this._compareDateTimeStrings(a.next_session_datetime, b.next_session_datetime))
      .slice(0, 3);

    const featured_child_studies = studies
      .filter((s) => s.is_active && s.participant_group === 'child_studies')
      .sort((a, b) => this._compareDateTimeStrings(a.next_session_datetime, b.next_session_datetime))
      .slice(0, 3);

    const featured_events = events
      .filter((e) => {
        if (!e.start_datetime) return false;
        const t = Date.parse(e.start_datetime);
        if (Number.isNaN(t)) return false;
        return t >= nowMs;
      })
      .sort((a, b) => this._compareDateTimeStrings(a.start_datetime, b.start_datetime))
      .slice(0, 3);

    const calls_to_action = [
      {
        target_page_key: 'studies',
        label: 'Participate in Adult Studies',
        description: 'Browse current studies for adults.'
      },
      {
        target_page_key: 'child_studies',
        label: 'Studies for Children & Families',
        description: 'Learn about child and family research opportunities.'
      },
      {
        target_page_key: 'events',
        label: 'Events & Talks',
        description: 'See upcoming talks and outreach events.'
      },
      {
        target_page_key: 'outreach',
        label: 'High School Outreach',
        description: 'Programs and resources for schools and teens.'
      },
      {
        target_page_key: 'join_lab',
        label: 'Join the Lab',
        description: 'Research assistantships and other roles.'
      }
    ];

    return {
      mission_summary,
      research_area_summaries,
      primary_audiences,
      featured_studies,
      featured_child_studies,
      featured_events,
      calls_to_action
    };
  }

  // 2) getStudiesFilterOptions

  getStudiesFilterOptions(participant_group) {
    const allStudies = this._getFromStorage('studies', []);
    const studies = participant_group
      ? allStudies.filter((s) => s.participant_group === participant_group)
      : allStudies;

    const participant_groups = this._getParticipantGroupsOptions();
    const formats = this._getStudyFormatsOptions();
    const topics = this._getStudyTopicsOptions();
    const compensation_types = this._getCompensationTypesOptions();

    let minComp = null;
    let maxComp = null;
    studies.forEach((s) => {
      if (typeof s.compensation_amount === 'number') {
        if (minComp === null || s.compensation_amount < minComp) minComp = s.compensation_amount;
        if (maxComp === null || s.compensation_amount > maxComp) maxComp = s.compensation_amount;
      }
    });

    const compensation_amount_range = {
      min_available: minComp,
      max_available: maxComp
    };

    const duration_buckets = [
      { key: 'up_to_45', label: 'Up to 45 minutes', max_minutes: 45 },
      { key: 'up_to_90', label: 'Up to 90 minutes', max_minutes: 90 },
      { key: 'over_90', label: 'Over 90 minutes', max_minutes: null }
    ];

    const ageRangeMap = {};
    studies.forEach((s) => {
      const label =
        s.age_eligibility_label || this._formatAgeRangeLabel(s.age_min_years, s.age_max_years);
      if (!label) return;
      if (!ageRangeMap[label]) {
        ageRangeMap[label] = {
          label,
          min_years: s.age_min_years != null ? s.age_min_years : null,
          max_years: s.age_max_years != null ? s.age_max_years : null
        };
      }
    });
    const age_ranges = Object.values(ageRangeMap);

    const sort_options = [
      { value: 'next_session_datetime', label: 'Next available session date' },
      { value: 'compensation_high_to_low', label: 'Compensation  High to Low' },
      { value: 'compensation_amount', label: 'Compensation  Low to High' },
      { value: 'duration_short_to_long', label: 'Duration  Short to Long' },
      { value: 'duration_long_to_short', label: 'Duration  Long to Short' }
    ];

    return {
      participant_groups,
      formats,
      topics,
      compensation_types,
      compensation_amount_range,
      duration_buckets,
      age_ranges,
      sort_options
    };
  }

  // 3) searchStudies

  searchStudies(
    participant_group,
    formats,
    compensation_types,
    min_compensation_amount,
    max_compensation_amount,
    min_duration_minutes,
    max_duration_minutes,
    min_age_years,
    max_age_years,
    topics,
    keyword,
    is_active_only = true,
    sort_by,
    sort_direction,
    limit,
    offset
  ) {
    let studies = this._getFromStorage('studies', []);

    if (participant_group) {
      studies = studies.filter((s) => s.participant_group === participant_group);
    }

    if (Array.isArray(formats) && formats.length > 0) {
      const formatSet = new Set(formats);
      studies = studies.filter((s) => formatSet.has(s.format));
    }

    if (Array.isArray(compensation_types) && compensation_types.length > 0) {
      const compSet = new Set(compensation_types);
      studies = studies.filter((s) => compSet.has(s.compensation_type));
    }

    if (typeof min_compensation_amount === 'number') {
      studies = studies.filter(
        (s) =>
          typeof s.compensation_amount === 'number' &&
          s.compensation_amount >= min_compensation_amount
      );
    }

    if (typeof max_compensation_amount === 'number') {
      studies = studies.filter(
        (s) =>
          typeof s.compensation_amount === 'number' &&
          s.compensation_amount <= max_compensation_amount
      );
    }

    if (typeof min_duration_minutes === 'number') {
      studies = studies.filter(
        (s) =>
          typeof s.duration_minutes === 'number' &&
          s.duration_minutes >= min_duration_minutes
      );
    }

    if (typeof max_duration_minutes === 'number') {
      studies = studies.filter(
        (s) =>
          typeof s.duration_minutes === 'number' &&
          s.duration_minutes <= max_duration_minutes
      );
    }

    if (typeof min_age_years === 'number' || typeof max_age_years === 'number') {
      const minAge = typeof min_age_years === 'number' ? min_age_years : null;
      const maxAge = typeof max_age_years === 'number' ? max_age_years : null;
      studies = studies.filter((s) => {
        const sMin = typeof s.age_min_years === 'number' ? s.age_min_years : null;
        const sMax = typeof s.age_max_years === 'number' ? s.age_max_years : null;
        if (minAge == null && maxAge == null) return true;
        if (sMin == null && sMax == null) return true;
        const lower = sMin != null ? sMin : -Infinity;
        const upper = sMax != null ? sMax : Infinity;
        const filterMin = minAge != null ? minAge : -Infinity;
        const filterMax = maxAge != null ? maxAge : Infinity;
        return upper >= filterMin && lower <= filterMax;
      });
    }

    if (Array.isArray(topics) && topics.length > 0) {
      const topicSet = new Set(topics);
      studies = studies.filter((s) => s.topic && topicSet.has(s.topic));
    }

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      studies = studies.filter((s) => {
        if (this._stringContains(s.title, kw)) return true;
        if (this._stringContains(s.short_description, kw)) return true;
        if (this._stringContains(s.detailed_description, kw)) return true;
        if (Array.isArray(s.keywords)) {
          return s.keywords.some((k) => this._stringContains(k, kw));
        }
        return false;
      });
    }

    const activeOnly = is_active_only !== false;
    if (activeOnly) {
      studies = studies.filter((s) => s.is_active);
    }

    if (sort_by) {
      let direction = sort_direction === 'desc' ? -1 : 1;
      if (sort_by === 'compensation_high_to_low') {
        sort_by = 'compensation_amount';
        direction = -1;
      }
      if (sort_by === 'duration_short_to_long') {
        sort_by = 'duration_minutes';
        direction = 1;
      }
      if (sort_by === 'duration_long_to_short') {
        sort_by = 'duration_minutes';
        direction = -1;
      }

      studies = studies.slice().sort((a, b) => {
        if (sort_by === 'next_session_datetime') {
          return (
            this._compareDateTimeStrings(a.next_session_datetime, b.next_session_datetime) *
            direction
          );
        }
        if (sort_by === 'compensation_amount') {
          const av =
            typeof a.compensation_amount === 'number' ? a.compensation_amount : -Infinity;
          const bv =
            typeof b.compensation_amount === 'number' ? b.compensation_amount : -Infinity;
          if (av === bv) return 0;
          return av < bv ? -1 * direction : 1 * direction;
        }
        if (sort_by === 'duration_minutes') {
          const av = typeof a.duration_minutes === 'number' ? a.duration_minutes : Infinity;
          const bv = typeof b.duration_minutes === 'number' ? b.duration_minutes : Infinity;
          if (av === bv) return 0;
          return av < bv ? -1 * direction : 1 * direction;
        }
        return 0;
      });
    }

    const start = typeof offset === 'number' && offset > 0 ? offset : 0;
    let end;
    if (typeof limit === 'number' && limit >= 0) {
      end = start + limit;
    }
    return typeof end === 'number' ? studies.slice(start, end) : studies.slice(start);
  }

  // 4) getStudyDetailWithSessions

  getStudyDetailWithSessions(studyId) {
    const studies = this._getFromStorage('studies', []);
    const study = studies.find((s) => s.id === studyId) || null;

    const allSessions = this._getFromStorage('study_sessions', []);
    let sessions = allSessions.filter((ss) => ss.study_id === studyId);
    sessions = sessions.filter(
      (ss) =>
        ss.is_available &&
        (typeof ss.spots_remaining !== 'number' || ss.spots_remaining > 0)
    );
    sessions = sessions.sort((a, b) =>
      this._compareDateTimeStrings(a.start_datetime, b.start_datetime)
    );

    const interestedItems = this._getOrCreateInterestedStudiesStore();
    const is_saved_to_interested = !!interestedItems.find((it) => it.study_id === studyId);

    // Foreign key resolution: attach study to each session
    const sessionsWithStudy = sessions.map((session) => ({
      ...session,
      study: study
    }));

    return {
      study,
      sessions: sessionsWithStudy,
      is_saved_to_interested
    };
  }

  // 5) createStudySignup

  createStudySignup(
    studyId,
    sessionId,
    participant_full_name,
    participant_age_years,
    participant_email,
    participant_phone,
    preferred_contact_method
  ) {
    const studies = this._getFromStorage('studies', []);
    const study = studies.find((s) => s.id === studyId);
    if (!study) {
      return { success: false, signup: null, message: 'Study not found.' };
    }

    const sessions = this._getFromStorage('study_sessions', []);
    const sessionIndex = sessions.findIndex(
      (ss) => ss.id === sessionId && ss.study_id === studyId
    );
    if (sessionIndex === -1) {
      return { success: false, signup: null, message: 'Session not found for this study.' };
    }

    const session = sessions[sessionIndex];
    if (
      !session.is_available ||
      (typeof session.spots_remaining === 'number' && session.spots_remaining <= 0)
    ) {
      return {
        success: false,
        signup: null,
        message: 'Selected session is no longer available.'
      };
    }

    if (preferred_contact_method !== 'email' && preferred_contact_method !== 'phone') {
      return { success: false, signup: null, message: 'Invalid preferred contact method.' };
    }

    const signup = {
      id: this._generateId('studysignup'),
      study_id: studyId,
      session_id: sessionId,
      participant_full_name,
      participant_age_years,
      participant_email,
      participant_phone,
      preferred_contact_method,
      created_at: this._getCurrentTimestamp()
    };

    const signups = this._getFromStorage('study_signups', []);
    signups.push(signup);
    this._saveToStorage('study_signups', signups);

    if (typeof session.spots_remaining === 'number') {
      sessions[sessionIndex] = {
        ...session,
        spots_remaining: session.spots_remaining - 1,
        is_available: session.spots_remaining - 1 > 0
      };
      this._saveToStorage('study_sessions', sessions);
    }

    return { success: true, signup, message: 'Signup submitted.' };
  }

  // 6) createChildStudyRegistration

  createChildStudyRegistration(
    studyId,
    sessionId,
    parent_name,
    parent_email,
    parent_phone,
    child_name,
    child_age_years,
    child_age_label
  ) {
    const studies = this._getFromStorage('studies', []);
    const study = studies.find((s) => s.id === studyId);
    if (!study) {
      return { success: false, registration: null, message: 'Study not found.' };
    }
    if (study.participant_group !== 'child_studies') {
      return {
        success: false,
        registration: null,
        message: 'Selected study is not a child study.'
      };
    }

    let sessions = this._getFromStorage('study_sessions', []);
    let sessionIndex = -1;
    if (sessionId) {
      sessionIndex = sessions.findIndex(
        (ss) => ss.id === sessionId && ss.study_id === studyId
      );
      if (sessionIndex === -1) {
        return { success: false, registration: null, message: 'Session not found for this study.' };
      }
      const session = sessions[sessionIndex];
      if (
        !session.is_available ||
        (typeof session.spots_remaining === 'number' && session.spots_remaining <= 0)
      ) {
        return {
          success: false,
          registration: null,
          message: 'Selected session is no longer available.'
        };
      }
    }

    const registration = {
      id: this._generateId('childreg'),
      study_id: studyId,
      session_id: sessionId || null,
      parent_name,
      parent_email,
      parent_phone,
      child_name,
      child_age_years,
      child_age_label:
        child_age_label || (child_age_years != null ? child_age_years + ' years' : ''),
      created_at: this._getCurrentTimestamp()
    };

    const regs = this._getFromStorage('child_study_registrations', []);
    regs.push(registration);
    this._saveToStorage('child_study_registrations', regs);

    if (sessionId && sessionIndex !== -1) {
      const session = sessions[sessionIndex];
      if (typeof session.spots_remaining === 'number') {
        sessions[sessionIndex] = {
          ...session,
          spots_remaining: session.spots_remaining - 1,
          is_available: session.spots_remaining - 1 > 0
        };
        this._saveToStorage('study_sessions', sessions);
      }
    }

    return { success: true, registration, message: 'Child registration submitted.' };
  }

  // 7) addStudyToInterestedList

  addStudyToInterestedList(studyId, notes) {
    const studies = this._getFromStorage('studies', []);
    const study = studies.find((s) => s.id === studyId);
    if (!study) {
      return {
        success: false,
        item: null,
        total_count: this._getOrCreateInterestedStudiesStore().length,
        message: 'Study not found.'
      };
    }

    const store = this._getOrCreateInterestedStudiesStore();
    const existing = store.find((it) => it.study_id === studyId);
    if (existing) {
      return {
        success: true,
        item: existing,
        total_count: store.length,
        message: 'Study already in Interested list.'
      };
    }

    const item = {
      id: this._generateId('interested'),
      study_id: studyId,
      saved_at: this._getCurrentTimestamp(),
      notes: notes || ''
    };
    store.push(item);
    this._saveToStorage('interested_study_items', store);

    return {
      success: true,
      item,
      total_count: store.length,
      message: 'Study added to Interested list.'
    };
  }

  // 8) removeStudyFromInterestedList

  removeStudyFromInterestedList(interestedItemId) {
    const store = this._getOrCreateInterestedStudiesStore();
    const index = store.findIndex((it) => it.id === interestedItemId);
    if (index === -1) {
      return { success: false, remaining_count: store.length, message: 'Item not found.' };
    }
    store.splice(index, 1);
    this._saveToStorage('interested_study_items', store);
    return {
      success: true,
      remaining_count: store.length,
      message: 'Item removed from Interested list.'
    };
  }

  // 9) getInterestedStudies (foreign key resolution)

  getInterestedStudies() {
    const items = this._getOrCreateInterestedStudiesStore();
    const studies = this._getFromStorage('studies', []);
    const result = items.map((item) => ({
      interested_item: item,
      study: studies.find((s) => s.id === item.study_id) || null
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_interestedListViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // 10) getOutreachPageContent

  getOutreachPageContent(audience) {
    const audience_options = [
      {
        key: 'high_school_students',
        label: 'High school students (ages 14 18)',
        description: 'Programs, opportunities, and resources for high school students.'
      },
      {
        key: 'teachers',
        label: 'Teachers & counselors',
        description: 'Resources and collaborations for educators.'
      },
      {
        key: 'community',
        label: 'Community partners',
        description: 'Public talks, workshops, and community engagement.'
      },
      {
        key: 'other',
        label: 'Other',
        description: 'Other outreach inquiries.'
      }
    ];

    const selected_audience = audience || 'high_school_students';

    const sections = [
      {
        section_key: 'overview',
        title: 'Outreach Overview',
        content_html:
          '<p>Our lab partners with schools and community organizations to share research and support students interested in psychology.</p>'
      },
      {
        section_key: 'programs',
        title: 'Programs for High School Students',
        content_html:
          '<p>We offer virtual and in-person lab visits, Q&A sessions, and classroom presentations focused on psychology and research careers.</p>'
      },
      {
        section_key: 'mailing_list',
        title: 'Outreach Mailing List',
        content_html:
          '<p>Join our mailing list to receive updates about new programs, events, and resources for high school students.</p>'
      }
    ];

    return {
      audience_options,
      selected_audience,
      sections
    };
  }

  // 11) subscribeToOutreachMailingList

  subscribeToOutreachMailingList(
    full_name,
    email,
    school_organization,
    grade_level,
    audience,
    areas_of_interest,
    email_frequency
  ) {
    const subscription = {
      id: this._generateId('outreachsub'),
      full_name,
      email,
      school_organization,
      grade_level,
      audience,
      areas_of_interest: Array.isArray(areas_of_interest) ? areas_of_interest : [],
      email_frequency,
      created_at: this._getCurrentTimestamp()
    };

    const subs = this._getFromStorage('outreach_mailing_list_subscriptions', []);
    subs.push(subscription);
    this._saveToStorage('outreach_mailing_list_subscriptions', subs);

    return { success: true, subscription, message: 'Subscribed to outreach mailing list.' };
  }

  // 12) getPublicationsFilterOptions

  getPublicationsFilterOptions() {
    const publications = this._getFromStorage('publications', []);
    const people = this._getFromStorage('people', []);

    let min_year = null;
    let max_year = null;
    const yearSet = new Set();

    publications.forEach((p) => {
      if (typeof p.year === 'number') {
        yearSet.add(p.year);
        if (min_year === null || p.year < min_year) min_year = p.year;
        if (max_year === null || p.year > max_year) max_year = p.year;
      }
    });

    const available_years = Array.from(yearSet).sort((a, b) => a - b);

    const year_range = { min_year, max_year, available_years };

    const research_areas = this._getPublicationResearchAreasOptions();

    const authorMap = new Map();
    publications.forEach((p) => {
      if (Array.isArray(p.author_person_ids)) {
        p.author_person_ids.forEach((pid) => {
          if (!authorMap.has(pid)) {
            const person = people.find((pe) => pe.id === pid);
            if (person) {
              authorMap.set(pid, {
                person_id: person.id,
                name: person.full_name,
                is_pi: person.role === 'principal_investigator'
              });
            }
          }
        });
      }
    });

    const authors = Array.from(authorMap.values());

    const sort_options = [
      { value: 'year_desc', label: 'Year \u2013 Newest first' },
      { value: 'year_asc', label: 'Year \u2013 Oldest first' },
      { value: 'created_at_desc', label: 'Added to site \u2013 Newest first' }
    ];

    return { year_range, research_areas, authors, sort_options };
  }

  // 13) searchPublications

  searchPublications(
    authorPersonId,
    is_pi_author_only,
    year_start,
    year_end,
    primary_research_area,
    research_area_tags,
    sort_by,
    limit,
    offset
  ) {
    let publications = this._getFromStorage('publications', []);

    if (authorPersonId) {
      publications = publications.filter(
        (p) =>
          Array.isArray(p.author_person_ids) &&
          p.author_person_ids.indexOf(authorPersonId) !== -1
      );
    }

    if (is_pi_author_only) {
      publications = publications.filter((p) => p.is_pi_author === true);
    }

    if (typeof year_start === 'number') {
      publications = publications.filter(
        (p) => typeof p.year === 'number' && p.year >= year_start
      );
    }

    if (typeof year_end === 'number') {
      publications = publications.filter(
        (p) => typeof p.year === 'number' && p.year <= year_end
      );
    }

    if (primary_research_area) {
      publications = publications.filter(
        (p) => p.primary_research_area === primary_research_area
      );
    }

    if (Array.isArray(research_area_tags) && research_area_tags.length > 0) {
      publications = publications.filter((p) =>
        this._intersectsArray(p.research_area_tags || [], research_area_tags)
      );
    }

    if (sort_by) {
      publications = publications.slice().sort((a, b) => {
        if (sort_by === 'year_desc') {
          const av = typeof a.year === 'number' ? a.year : -Infinity;
          const bv = typeof b.year === 'number' ? b.year : -Infinity;
          if (av === bv) return 0;
          return av < bv ? 1 : -1;
        }
        if (sort_by === 'year_asc') {
          const av = typeof a.year === 'number' ? a.year : Infinity;
          const bv = typeof b.year === 'number' ? b.year : Infinity;
          if (av === bv) return 0;
          return av < bv ? -1 : 1;
        }
        if (sort_by === 'created_at_desc') {
          return this._compareDateTimeStrings(b.created_at, a.created_at);
        }
        return 0;
      });
    }

    const start = typeof offset === 'number' && offset > 0 ? offset : 0;
    let end;
    if (typeof limit === 'number' && limit >= 0) {
      end = start + limit;
    }
    return typeof end === 'number' ? publications.slice(start, end) : publications.slice(start);
  }

  // 14) addPublicationsToReadingList

  addPublicationsToReadingList(publicationIds, notes) {
    const pubs = this._getFromStorage('publications', []);
    const store = this._getOrCreateReadingListStore();
    const existingByPubId = new Set(store.map((it) => it.publication_id));

    const added_items = [];
    const noteValue = notes || '';

    if (Array.isArray(publicationIds)) {
      publicationIds.forEach((pid) => {
        if (!pid) return;
        if (existingByPubId.has(pid)) return;
        const pub = pubs.find((p) => p.id === pid);
        if (!pub) return;
        const item = {
          id: this._generateId('reading'),
          publication_id: pid,
          added_at: this._getCurrentTimestamp(),
          notes: noteValue
        };
        store.push(item);
        added_items.push(item);
        existingByPubId.add(pid);
      });
    }

    this._saveToStorage('reading_list_items', store);

    return {
      success: true,
      added_items,
      total_count: store.length,
      message:
        added_items.length > 0
          ? 'Publications added to Reading List.'
          : 'No new publications were added.'
    };
  }

  // 15) getReadingListItems (foreign key resolution)

  getReadingListItems() {
    const items = this._getOrCreateReadingListStore();
    const pubs = this._getFromStorage('publications', []);
    const result = items.map((item) => ({
      reading_list_item: item,
      publication: pubs.find((p) => p.id === item.publication_id) || null
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_readingListViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // 16) removeReadingListItem

  removeReadingListItem(readingListItemId) {
    const store = this._getOrCreateReadingListStore();
    const index = store.findIndex((it) => it.id === readingListItemId);
    if (index === -1) {
      return {
        success: false,
        remaining_count: store.length,
        message: 'Reading list item not found.'
      };
    }
    store.splice(index, 1);
    this._saveToStorage('reading_list_items', store);
    return {
      success: true,
      remaining_count: store.length,
      message: 'Reading list item removed.'
    };
  }

  // 17) getEventsFilterOptions

  getEventsFilterOptions() {
    const events = this._getFromStorage('events', []);
    const event_types = this._getEventTypesOptions();

    const monthMap = new Map();
    events.forEach((e) => {
      if (!e.start_datetime) return;
      const d = new Date(e.start_datetime);
      if (Number.isNaN(d.getTime())) return;
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-12
      const key = year + '-' + month;
      if (!monthMap.has(key)) {
        const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        monthMap.set(key, { year, month, label });
      }
    });

    const supported_months = Array.from(monthMap.values()).sort((a, b) => {
      if (a.year === b.year) return a.month - b.month;
      return a.year - b.year;
    });

    const sort_options = [
      { value: 'start_time_earliest_first', label: 'Start time  Earliest first' },
      { value: 'start_time_latest_first', label: 'Start time  Latest first' }
    ];

    return { event_types, sort_options, supported_months };
  }

  // 18) getEventsByMonth

  getEventsByMonth(year, month, keyword, event_type, sort_by, limit, offset) {
    const events = this._getFromStorage('events', []);

    let filtered = events.filter((e) => {
      if (!e.start_datetime) return false;
      const d = new Date(e.start_datetime);
      if (Number.isNaN(d.getTime())) return false;
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      filtered = filtered.filter((e) => {
        if (this._stringContains(e.title, kw)) return true;
        if (this._stringContains(e.description, kw)) return true;
        if (Array.isArray(e.keywords)) {
          return e.keywords.some((k) => this._stringContains(k, kw));
        }
        return false;
      });
    }

    if (event_type) {
      filtered = filtered.filter((e) => e.event_type === event_type);
    }

    const sortKey = sort_by || 'start_time_earliest_first';
    filtered = filtered.slice().sort((a, b) => {
      if (sortKey === 'start_time_latest_first') {
        return this._compareDateTimeStrings(b.start_datetime, a.start_datetime);
      }
      return this._compareDateTimeStrings(a.start_datetime, b.start_datetime);
    });

    const start = typeof offset === 'number' && offset > 0 ? offset : 0;
    let end;
    if (typeof limit === 'number' && limit >= 0) {
      end = start + limit;
    }
    return typeof end === 'number' ? filtered.slice(start, end) : filtered.slice(start);
  }

  // 19) getEventDetail

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;

    const people = this._getFromStorage('people', []);
    let speakers = [];
    if (event && Array.isArray(event.speaker_person_ids)) {
      speakers = event.speaker_person_ids
        .map((pid) => people.find((p) => p.id === pid))
        .filter((p) => !!p);
    }

    const rsvps = this._getFromStorage('event_rsvps', []);
    const existing_rsvp = rsvps.find((r) => r.event_id === eventId) || null;

    const scheduleItems = this._getOrCreateScheduleStore();
    const is_in_schedule = !!scheduleItems.find((s) => s.event_id === eventId);

    return {
      event,
      speakers,
      existing_rsvp,
      is_in_schedule
    };
  }

  // 20) submitEventRSVP

  submitEventRSVP(eventId, attendee_name, attendee_email, attendance_mode, guest_count) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, rsvp: null, message: 'Event not found.' };
    }

    if (
      attendance_mode !== 'in_person' &&
      attendance_mode !== 'remote' &&
      attendance_mode !== 'hybrid'
    ) {
      return { success: false, rsvp: null, message: 'Invalid attendance mode.' };
    }

    const gc = typeof guest_count === 'number' && guest_count >= 0 ? guest_count : 0;

    const rsvps = this._getFromStorage('event_rsvps', []);
    let rsvp = rsvps.find((r) => r.event_id === eventId) || null;

    if (rsvp) {
      rsvp = {
        ...rsvp,
        attendee_name: attendee_name || rsvp.attendee_name || '',
        attendee_email: attendee_email || rsvp.attendee_email || '',
        attendance_mode,
        guest_count: gc,
        status: 'submitted',
        created_at: this._getCurrentTimestamp()
      };
      const idx = rsvps.findIndex((r) => r.id === rsvp.id);
      rsvps[idx] = rsvp;
    } else {
      rsvp = {
        id: this._generateId('eventrsvp'),
        event_id: eventId,
        attendee_name: attendee_name || '',
        attendee_email: attendee_email || '',
        attendance_mode,
        guest_count: gc,
        status: 'submitted',
        created_at: this._getCurrentTimestamp()
      };
      rsvps.push(rsvp);
    }

    this._saveToStorage('event_rsvps', rsvps);

    return { success: true, rsvp, message: 'RSVP submitted.' };
  }

  // 21) addEventToSchedule

  addEventToSchedule(eventId, notes) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, schedule_item: null, message: 'Event not found.' };
    }

    const store = this._getOrCreateScheduleStore();
    const existing = store.find((s) => s.event_id === eventId);
    if (existing) {
      return { success: true, schedule_item: existing, message: 'Event already in schedule.' };
    }

    const schedule_item = {
      id: this._generateId('schedule'),
      event_id: eventId,
      added_at: this._getCurrentTimestamp(),
      notes: notes || ''
    };

    store.push(schedule_item);
    this._saveToStorage('schedule_items', store);

    return { success: true, schedule_item, message: 'Event added to schedule.' };
  }

  // 22) getScheduleItems (foreign key resolution)

  getScheduleItems() {
    const items = this._getOrCreateScheduleStore();
    const events = this._getFromStorage('events', []);
    const result = items.map((item) => ({
      schedule_item: item,
      event: events.find((e) => e.id === item.event_id) || null
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task5_scheduleViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // 23) removeScheduleItem

  removeScheduleItem(scheduleItemId) {
    const store = this._getOrCreateScheduleStore();
    const index = store.findIndex((it) => it.id === scheduleItemId);
    if (index === -1) {
      return { success: false, remaining_count: store.length, message: 'Schedule item not found.' };
    }
    store.splice(index, 1);
    this._saveToStorage('schedule_items', store);
    return {
      success: true,
      remaining_count: store.length,
      message: 'Schedule item removed.'
    };
  }

  // 24) getJoinLabSections

  getJoinLabSections() {
    return this._getFromStorage('join_lab_sections', []);
  }

  // 25) submitResearchAssistantApplication

  submitResearchAssistantApplication(
    full_name,
    email,
    phone,
    major,
    academic_year,
    gpa,
    primary_research_interest,
    additional_research_interests,
    availability_semesters,
    weekly_hours,
    motivation_text
  ) {
    const application = {
      id: this._generateId('raapp'),
      full_name,
      email,
      phone,
      major,
      academic_year,
      gpa: typeof gpa === 'number' ? gpa : parseFloat(gpa),
      primary_research_interest,
      additional_research_interests: Array.isArray(additional_research_interests)
        ? additional_research_interests
        : [],
      availability_semesters: Array.isArray(availability_semesters)
        ? availability_semesters
        : [],
      weekly_hours: typeof weekly_hours === 'number' ? weekly_hours : parseFloat(weekly_hours),
      motivation_text,
      status: 'submitted',
      submitted_at: this._getCurrentTimestamp()
    };

    const apps = this._getFromStorage('research_assistant_applications', []);
    apps.push(application);
    this._saveToStorage('research_assistant_applications', apps);

    return { success: true, application, message: 'Research assistant application submitted.' };
  }

  // 26) getMeasuresFilterOptions

  getMeasuresFilterOptions() {
    const measures = this._getFromStorage('measures', []);
    let min_minutes = null;
    let max_minutes = null;

    measures.forEach((m) => {
      if (typeof m.estimated_completion_minutes === 'number') {
        if (min_minutes === null || m.estimated_completion_minutes < min_minutes) {
          min_minutes = m.estimated_completion_minutes;
        }
        if (max_minutes === null || m.estimated_completion_minutes > max_minutes) {
          max_minutes = m.estimated_completion_minutes;
        }
      }
    });

    const duration_range = { min_minutes, max_minutes };
    const topics = this._getMeasuresTopicsOptions();

    const sort_options = [
      { value: 'duration_shortest_first', label: 'Duration  Shortest first' },
      { value: 'duration_longest_first', label: 'Duration  Longest first' },
      { value: 'name_asc', label: 'Name A\u2013Z' }
    ];

    return { topics, duration_range, sort_options };
  }

  // 27) searchMeasures

  searchMeasures(keyword, topic, max_estimated_completion_minutes, sort_by, limit, offset) {
    let measures = this._getFromStorage('measures', []);

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      measures = measures.filter((m) => {
        if (this._stringContains(m.name, kw)) return true;
        if (this._stringContains(m.description, kw)) return true;
        if (Array.isArray(m.keywords)) {
          return m.keywords.some((k) => this._stringContains(k, kw));
        }
        return false;
      });
    }

    if (topic) {
      measures = measures.filter((m) => m.topic === topic);
    }

    if (typeof max_estimated_completion_minutes === 'number') {
      measures = measures.filter(
        (m) =>
          typeof m.estimated_completion_minutes === 'number' &&
          m.estimated_completion_minutes <= max_estimated_completion_minutes
      );
    }

    if (sort_by) {
      measures = measures.slice().sort((a, b) => {
        if (sort_by === 'duration_shortest_first') {
          const av =
            typeof a.estimated_completion_minutes === 'number'
              ? a.estimated_completion_minutes
              : Infinity;
          const bv =
            typeof b.estimated_completion_minutes === 'number'
              ? b.estimated_completion_minutes
              : Infinity;
          if (av === bv) return 0;
          return av < bv ? -1 : 1;
        }
        if (sort_by === 'duration_longest_first') {
          const av =
            typeof a.estimated_completion_minutes === 'number'
              ? a.estimated_completion_minutes
              : -Infinity;
          const bv =
            typeof b.estimated_completion_minutes === 'number'
              ? b.estimated_completion_minutes
              : -Infinity;
          if (av === bv) return 0;
          return av < bv ? 1 : -1;
        }
        if (sort_by === 'name_asc') {
          const an = (a.name || '').toLowerCase();
          const bn = (b.name || '').toLowerCase();
          if (an === bn) return 0;
          return an < bn ? -1 : 1;
        }
        return 0;
      });
    }

    const start = typeof offset === 'number' && offset > 0 ? offset : 0;
    let end;
    if (typeof limit === 'number' && limit >= 0) {
      end = start + limit;
    }
    return typeof end === 'number' ? measures.slice(start, end) : measures.slice(start);
  }

  // 28) addMeasureToToolkit

  addMeasureToToolkit(measureId, notes) {
    const measures = this._getFromStorage('measures', []);
    const measure = measures.find((m) => m.id === measureId);
    if (!measure) {
      return {
        success: false,
        toolkit_item: null,
        total_count: this._getOrCreateMeasurementToolkitStore().length,
        message: 'Measure not found.'
      };
    }

    const store = this._getOrCreateMeasurementToolkitStore();
    const existing = store.find((it) => it.measure_id === measureId);
    if (existing) {
      return {
        success: true,
        toolkit_item: existing,
        total_count: store.length,
        message: 'Measure already in toolkit.'
      };
    }

    const toolkit_item = {
      id: this._generateId('toolkit'),
      measure_id: measureId,
      added_at: this._getCurrentTimestamp(),
      notes: notes || ''
    };
    store.push(toolkit_item);
    this._saveToStorage('measurement_toolkit_items', store);

    return {
      success: true,
      toolkit_item,
      total_count: store.length,
      message: 'Measure added to toolkit.'
    };
  }

  // 29) getMeasurementToolkitItems (foreign key resolution)

  getMeasurementToolkitItems() {
    const items = this._getOrCreateMeasurementToolkitStore();
    const measures = this._getFromStorage('measures', []);
    const result = items.map((item) => ({
      toolkit_item: item,
      measure: measures.find((m) => m.id === item.measure_id) || null
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_toolkitViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // 30) removeMeasurementToolkitItem

  removeMeasurementToolkitItem(measurementToolkitItemId) {
    const store = this._getOrCreateMeasurementToolkitStore();
    const index = store.findIndex((it) => it.id === measurementToolkitItemId);
    if (index === -1) {
      return { success: false, remaining_count: store.length, message: 'Toolkit item not found.' };
    }
    store.splice(index, 1);
    this._saveToStorage('measurement_toolkit_items', store);
    return {
      success: true,
      remaining_count: store.length,
      message: 'Toolkit item removed.'
    };
  }

  // 31) getPeopleFilterOptions

  getPeopleFilterOptions() {
    return {
      roles: this._getPeopleRolesOptions()
    };
  }

  // 32) searchPeople

  searchPeople(role, keyword, research_area_tags) {
    let people = this._getFromStorage('people', []);

    if (role) {
      people = people.filter((p) => p.role === role);
    }

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      people = people.filter((p) => {
        if (this._stringContains(p.full_name, kw)) return true;
        if (this._stringContains(p.bio, kw)) return true;
        if (this._stringContains(p.research_summary, kw)) return true;
        if (Array.isArray(p.keywords) && p.keywords.some((k) => this._stringContains(k, kw)))
          return true;
        return false;
      });
    }

    if (Array.isArray(research_area_tags) && research_area_tags.length > 0) {
      people = people.filter((p) =>
        this._intersectsArray(p.research_area_tags || [], research_area_tags)
      );
    }

    return people;
  }

  // 33) getPersonDetail

  getPersonDetail(personId) {
    const people = this._getFromStorage('people', []);
    const person = people.find((p) => p.id === personId) || null;

    const publications = this._getFromStorage('publications', []);
    const selected_publications = publications.filter(
      (pub) =>
        Array.isArray(pub.author_person_ids) &&
        pub.author_person_ids.indexOf(personId) !== -1
    );

    const current_projects_summary =
      person && person.research_summary ? person.research_summary : '';

    return {
      person,
      selected_publications,
      current_projects_summary
    };
  }

  // 34) sendPersonContactMessage

  sendPersonContactMessage(personId, sender_name, sender_email, reason_for_contact, message) {
    const people = this._getFromStorage('people', []);
    const person = people.find((p) => p.id === personId);
    if (!person) {
      return { success: false, contact_message: null, message: 'Person not found.' };
    }

    const contact_message = {
      id: this._generateId('personmsg'),
      person_id: personId,
      sender_name,
      sender_email,
      reason_for_contact,
      message,
      created_at: this._getCurrentTimestamp()
    };

    const messages = this._getFromStorage('person_contact_messages', []);
    messages.push(contact_message);
    this._saveToStorage('person_contact_messages', messages);

    return { success: true, contact_message, message: 'Message sent to lab member.' };
  }

  // 35) getAboutPageSections

  getAboutPageSections(section_key) {
    const sections = this._getFromStorage('about_page_sections', []);
    if (!section_key) return sections;
    return sections.filter((s) => s.section_key === section_key);
  }

  // 36) getContactPageInfo

  getContactPageInfo() {
    const info = this._getFromStorage('contact_page_info', {
      lab_email: '',
      phone_number: '',
      physical_location: '',
      office_hours: ''
    });
    return {
      lab_email: info.lab_email || '',
      phone_number: info.phone_number || '',
      physical_location: info.physical_location || '',
      office_hours: info.office_hours || ''
    };
  }

  // 37) sendGeneralContactMessage

  sendGeneralContactMessage(sender_name, sender_email, topic, message) {
    const msg = {
      id: this._generateId('contactmsg'),
      sender_name,
      sender_email,
      topic: topic || '',
      message,
      created_at: this._getCurrentTimestamp()
    };

    const messages = this._getFromStorage('general_contact_messages', []);
    messages.push(msg);
    this._saveToStorage('general_contact_messages', messages);

    return {
      success: true,
      message_id: msg.id,
      confirmation_message: 'Your message has been sent to the lab.'
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