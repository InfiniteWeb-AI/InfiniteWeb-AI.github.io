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
    const tables = [
      'programs',
      'program_reviews',
      'program_form_submissions',
      'insurance_providers',
      'support_group_sessions',
      'support_group_registrations',
      'articles',
      'reading_list_entries',
      'helplines',
      'callback_requests',
      'centers',
      'admission_inquiries',
      'pre_admission_questionnaire_sessions',
      'assessment_questions',
      'assessment_sessions'
    ];

    for (const key of tables) {
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

  _getEntityById(storageKey, id) {
    const arr = this._getFromStorage(storageKey);
    return arr.find((x) => x.id === id) || null;
  }

  // -------------------- Helper functions (required) --------------------

  // Single-user reading list helper
  _getOrCreateReadingList() {
    // Storage is already initialized as an array
    return this._getFromStorage('reading_list_entries');
  }

  // Assessment session helper (single-user)
  _getOrCreateAssessmentSession() {
    const sessions = this._getFromStorage('assessment_sessions');
    let session = sessions.find((s) => s.status === 'in_progress');
    if (!session) {
      session = {
        id: this._generateId('assessment_session'),
        started_at: this._nowIso(),
        completed_at: null,
        status: 'in_progress',
        answers: [],
        recommended_program_ids: []
      };
      sessions.push(session);
      this._saveToStorage('assessment_sessions', sessions);
    }
    return session;
  }

  // Pre-admission questionnaire helper
  _getOrCreatePreAdmissionQuestionnaireSession(program_id) {
    const sessions = this._getFromStorage('pre_admission_questionnaire_sessions');
    let session = sessions.find(
      (s) => s.program_id === program_id && s.status === 'in_progress'
    );
    if (!session) {
      session = {
        id: this._generateId('pre_admission'),
        program_id,
        started_at: this._nowIso(),
        current_step: 1,
        completed_first_page: false,
        name: null,
        date_of_birth: null,
        primary_substance_of_concern: null,
        treatment_preference: null,
        status: 'in_progress'
      };
      sessions.push(session);
      this._saveToStorage('pre_admission_questionnaire_sessions', sessions);
    }
    return session;
  }

  // Generic distance calculator between two ZIP codes (very approximate)
  _calculateDistanceFromZip(zipA, zipB) {
    if (!zipA || !zipB) return null;
    if (zipA === zipB) return 0;
    // Simple deterministic pseudo-distance: based on numeric difference, capped
    const numA = parseInt(String(zipA).slice(0, 5).replace(/[^0-9]/g, '') || '0', 10);
    const numB = parseInt(String(zipB).slice(0, 5).replace(/[^0-9]/g, '') || '0', 10);
    if (Number.isNaN(numA) || Number.isNaN(numB)) return 50;
    const diff = Math.abs(numA - numB);
    // Rough scaling
    const miles = Math.min(100, Math.max(5, diff / 10));
    return miles;
  }

  // Required helper: calculate program distance from ZIP
  _calculateProgramDistanceFromZip(program, zip) {
    if (!program || !program.zip) return null;
    return this._calculateDistanceFromZip(program.zip, zip);
  }

  // Length preset resolver
  _getLengthPreset(key) {
    const presets = {
      '28_30_days': { min_days: 28, max_days: 30 },
      '40_45_days': { min_days: 40, max_days: 45 },
      '45_days': { min_days: 45, max_days: 45 },
      '60_days': { min_days: 60, max_days: 60 }
    };
    return presets[key] || null;
  }

  // Filter and sort programs consistently
  _filterAndSortPrograms(programs, options) {
    const {
      query,
      program_type,
      primary_issue,
      gender_restriction,
      length_min_days,
      length_max_days,
      length_preset_key,
      price_max,
      has_private_room,
      has_gym_access,
      amenities,
      has_evening_sessions,
      min_evening_sessions_per_week,
      min_average_rating,
      min_review_count,
      state,
      zip,
      radius_miles,
      accepted_insurance_provider_id,
      insurance_provider_id,
      sort_by
    } = options || {};

    let result = programs.filter((p) => p.is_active !== false);

    // Text query
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const issues = (p.primary_issues || []).join(' ').toLowerCase();
        return name.includes(q) || desc.includes(q) || issues.includes(q);
      });
    }

    if (program_type) {
      result = result.filter((p) => p.program_type === program_type);
    }

    if (primary_issue) {
      result = result.filter((p) => Array.isArray(p.primary_issues) && p.primary_issues.includes(primary_issue));
    }

    if (gender_restriction) {
      result = result.filter((p) => p.gender_restriction === gender_restriction);
    }

    let lenMin = length_min_days;
    let lenMax = length_max_days;
    if (length_preset_key) {
      const preset = this._getLengthPreset(length_preset_key);
      if (preset) {
        lenMin = preset.min_days;
        lenMax = preset.max_days;
      }
    }
    if (typeof lenMin === 'number') {
      result = result.filter((p) => (p.length_min_days || 0) >= lenMin);
    }
    if (typeof lenMax === 'number') {
      result = result.filter((p) => (p.length_max_days || 0) <= lenMax);
    }

    if (typeof price_max === 'number') {
      result = result.filter((p) => typeof p.price_total === 'number' && p.price_total <= price_max);
    }

    if (typeof has_private_room === 'boolean') {
      result = result.filter((p) => {
        const flag = !!p.has_private_room;
        const roomTypes = Array.isArray(p.room_types) ? p.room_types : [];
        const am = Array.isArray(p.amenities) ? p.amenities : [];
        const derived = roomTypes.includes('private') || am.includes('private_room');
        return has_private_room ? (flag || derived) : !flag;
      });
    }

    if (typeof has_gym_access === 'boolean') {
      result = result.filter((p) => {
        const flag = !!p.has_gym_access;
        const am = Array.isArray(p.amenities) ? p.amenities : [];
        const derived = am.includes('gym_access') || am.includes('fitness_center');
        return has_gym_access ? (flag || derived) : !flag;
      });
    }

    if (Array.isArray(amenities) && amenities.length) {
      result = result.filter((p) => {
        const am = Array.isArray(p.amenities) ? p.amenities : [];
        return amenities.every((a) => am.includes(a));
      });
    }

    if (typeof has_evening_sessions === 'boolean') {
      result = result.filter((p) => !!p.has_evening_sessions === has_evening_sessions);
    }

    if (typeof min_evening_sessions_per_week === 'number') {
      result = result.filter((p) => (p.evening_sessions_per_week || 0) >= min_evening_sessions_per_week);
    }

    if (typeof min_average_rating === 'number') {
      result = result.filter((p) => (p.average_rating || 0) >= min_average_rating);
    }

    if (typeof min_review_count === 'number') {
      result = result.filter((p) => (p.review_count || 0) >= min_review_count);
    }

    if (state) {
      result = result.filter((p) => (p.state || '').toLowerCase() === state.toLowerCase());
    }

    const providerId = accepted_insurance_provider_id || insurance_provider_id;
    if (providerId) {
      result = result.filter(
        (p) => Array.isArray(p.accepted_insurance_provider_ids) && p.accepted_insurance_provider_ids.includes(providerId)
      );
    }

    // Distance filter
    if (zip && typeof radius_miles === 'number') {
      result = result
        .map((p) => {
          const distance = this._calculateProgramDistanceFromZip(p, zip);
          return { program: p, distance_miles: distance };
        })
        .filter((wrap) => wrap.distance_miles === null || wrap.distance_miles <= radius_miles)
        .map((wrap) => {
          const cloned = { ...wrap.program };
          if (wrap.distance_miles !== null) cloned.distance_miles = wrap.distance_miles;
          return cloned;
        });
    }

    // Sorting
    const sortKey = sort_by || 'relevance';
    result = result.slice();
    if (sortKey === 'price_low_to_high') {
      result.sort((a, b) => (a.price_total || 0) - (b.price_total || 0));
    } else if (sortKey === 'price_high_to_low') {
      result.sort((a, b) => (b.price_total || 0) - (a.price_total || 0));
    } else if (sortKey === 'rating_high_to_low') {
      result.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortKey === 'length_short_to_long') {
      result.sort((a, b) => (a.length_min_days || 0) - (b.length_min_days || 0));
    } else if (sortKey === 'length_long_to_short') {
      result.sort((a, b) => (b.length_min_days || 0) - (a.length_min_days || 0));
    }

    return result;
  }

  // -------------------- Interface implementations --------------------

  // 1. getHomepageContent
  getHomepageContent() {
    const helplines = this._getFromStorage('helplines');
    const programs = this._getFromStorage('programs').filter((p) => p.is_active !== false);
    const centers = this._getFromStorage('centers');

    let primary_helpline = null;
    if (helplines.length) {
      primary_helpline = helplines.find((h) => h.is_24_7) || helplines[0];
    }

    const featuredPrograms = programs.slice(0, 6).map((p) => {
      const center = centers.find((c) => c.id === p.center_id) || null;
      return {
        program_id: p.id,
        name: p.name,
        program_type: p.program_type,
        primary_issues: p.primary_issues || [],
        gender_restriction: p.gender_restriction,
        length_min_days: p.length_min_days,
        length_max_days: p.length_max_days,
        price_total: p.price_total,
        price_currency: p.price_currency || 'usd',
        has_private_room: !!p.has_private_room,
        has_gym_access: !!p.has_gym_access,
        average_rating: p.average_rating || 0,
        review_count: p.review_count || 0,
        center_name: center ? center.name : null,
        city: p.city || (center ? center.city : null),
        state: p.state || (center ? center.state : null),
        // Foreign key resolution
        center
      };
    });

    const program_categories = [
      { key: 'inpatient', label: 'Inpatient', description: '24/7 medically supported care.' },
      { key: 'residential', label: 'Residential', description: 'Live-in treatment in a home-like setting.' },
      { key: 'outpatient', label: 'Outpatient', description: 'Flexible treatment while living at home.' },
      { key: 'detox', label: 'Detox', description: 'Medically supervised withdrawal management.' }
    ];

    const primary_actions = [
      { key: 'find_programs', label: 'Find a Program', description: 'Browse detox, inpatient, and outpatient options.' },
      { key: 'take_assessment', label: 'Take Assessment', description: 'Get a personalized level-of-care recommendation.' },
      { key: 'verify_insurance', label: 'Verify Insurance', description: 'Check your coverage in minutes.' },
      { key: 'support_groups', label: 'Support Groups', description: 'Find support for you and your loved ones.' },
      { key: 'locations', label: 'Our Locations', description: 'Explore treatment centers near you.' }
    ];

    const trust_sections = [
      {
        title: 'Compassionate, Evidence-Based Care',
        body: 'Our multidisciplinary teams specialize in addiction, mental health, and co-occurring disorders using proven, evidence-based approaches.',
        type: 'overview'
      },
      {
        title: 'Accredited Treatment Centers',
        body: 'All programs adhere to strict quality and safety standards, with licensing and accreditation where applicable.',
        type: 'accreditation'
      },
      {
        title: 'Family Involvement & Aftercare',
        body: 'We support families throughout treatment and provide structured aftercare planning to support long-term recovery.',
        type: 'success_stories'
      }
    ];

    return {
      primary_helpline: primary_helpline || null,
      primary_actions,
      program_categories,
      featured_programs: featuredPrograms,
      trust_sections
    };
  }

  // 2. getProgramFilterOptions
  getProgramFilterOptions() {
    const programs = this._getFromStorage('programs');

    const program_types = ['inpatient', 'residential', 'outpatient', 'intensive_outpatient', 'detox'];
    const primary_issues = [
      'alcohol',
      'opioids',
      'opioid_use_disorder',
      'benzodiazepines',
      'mental_health',
      'anxiety',
      'co_occurring_disorders',
      'other_substance'
    ];
    const gender_restrictions = ['coed', 'women_only', 'men_only', 'lgbtq_only'];

    const length_presets = [
      { key: '28_30_days', label: '28–30 days', min_days: 28, max_days: 30 },
      { key: '40_45_days', label: '40–45 days', min_days: 40, max_days: 45 },
      { key: '60_days', label: '60 days', min_days: 60, max_days: 60 }
    ];

    const price_range_defaults = { min: 0, max: 50000, step: 500 };

    // Collect amenities from programs
    const amenitySet = new Set();
    for (const p of programs) {
      (p.amenities || []).forEach((a) => amenitySet.add(a));
    }
    // Ensure common amenities are present
    ['private_room', 'gym_access', 'pool', 'fitness_center'].forEach((a) => amenitySet.add(a));

    const amenities = Array.from(amenitySet);

    const schedule_options = ['evening_sessions', 'weekday_mornings', 'weekday_afternoons', 'weekday_evenings'];

    const sort_options = [
      { key: 'relevance', label: 'Relevance' },
      { key: 'price_low_to_high', label: 'Price: Low to High' },
      { key: 'price_high_to_low', label: 'Price: High to Low' },
      { key: 'rating_high_to_low', label: 'Rating: High to Low' },
      { key: 'length_short_to_long', label: 'Length: Short to Long' },
      { key: 'length_long_to_short', label: 'Length: Long to Short' }
    ];

    return {
      program_types,
      primary_issues,
      gender_restrictions,
      length_presets,
      price_range_defaults,
      amenities,
      schedule_options,
      sort_options
    };
  }

  // 3. searchPrograms
  searchPrograms(
    query,
    program_type,
    primary_issue,
    gender_restriction,
    length_min_days,
    length_max_days,
    length_preset_key,
    price_max,
    has_private_room,
    has_gym_access,
    amenities,
    has_evening_sessions,
    min_evening_sessions_per_week,
    min_average_rating,
    min_review_count,
    state,
    zip,
    radius_miles,
    accepted_insurance_provider_id,
    sort_by
  ) {
    const programs = this._getFromStorage('programs');
    const centers = this._getFromStorage('centers');

    const filtered = this._filterAndSortPrograms(programs, {
      query,
      program_type,
      primary_issue,
      gender_restriction,
      length_min_days,
      length_max_days,
      length_preset_key,
      price_max,
      has_private_room,
      has_gym_access,
      amenities,
      has_evening_sessions,
      min_evening_sessions_per_week,
      min_average_rating,
      min_review_count,
      state,
      zip,
      radius_miles,
      accepted_insurance_provider_id,
      sort_by
    });

    // Instrumentation for task completion tracking (tasks 1, 2, 7)
    try {
      // Task 1: inpatient/residential, alcohol, private room, ~30 days, price <= 15000
      const isTask1LengthPreset =
        length_preset_key === '28_30_days';
      const isTask1LengthRange =
        typeof length_min_days === 'number' &&
        typeof length_max_days === 'number' &&
        length_min_days >= 25 &&
        length_min_days <= 35 &&
        length_max_days >= 25 &&
        length_max_days <= 35;
      if (
        (program_type === 'inpatient' || program_type === 'residential') &&
        primary_issue === 'alcohol' &&
        has_private_room === true &&
        typeof price_max === 'number' &&
        price_max <= 15000 &&
        (isTask1LengthPreset || isTask1LengthRange)
      ) {
        localStorage.setItem(
          'task1_programSearchContext',
          JSON.stringify({
            params: {
              query: query,
              program_type: program_type,
              primary_issue: primary_issue,
              length_min_days: length_min_days,
              length_max_days: length_max_days,
              length_preset_key: length_preset_key,
              price_max: price_max,
              has_private_room: has_private_room
            },
            timestamp: this._nowIso(),
            result_program_ids: filtered.map((p) => p.id)
          })
        );
      }

      // Task 2: outpatient/intensive_outpatient opioid programs with evening sessions and high reviews
      const isTask2ProgramType =
        program_type === 'outpatient' || program_type === 'intensive_outpatient';
      const isTask2PrimaryIssue =
        primary_issue === 'opioids' || primary_issue === 'opioid_use_disorder';
      const isTask2Evening =
        has_evening_sessions === true ||
        (typeof min_evening_sessions_per_week === 'number' &&
          min_evening_sessions_per_week >= 3);
      const isTask2Rating =
        typeof min_average_rating === 'number' &&
        min_average_rating >= 4.5;
      const isTask2ReviewCount =
        typeof min_review_count === 'number' &&
        min_review_count >= 20;
      if (
        isTask2ProgramType &&
        isTask2PrimaryIssue &&
        isTask2Evening &&
        isTask2Rating &&
        isTask2ReviewCount
      ) {
        localStorage.setItem(
          'task2_programSearchContext',
          JSON.stringify({
            params: {
              query: query,
              program_type: program_type,
              primary_issue: primary_issue,
              has_evening_sessions: has_evening_sessions,
              min_evening_sessions_per_week: min_evening_sessions_per_week,
              min_average_rating: min_average_rating,
              min_review_count: min_review_count
            },
            timestamp: this._nowIso(),
            result_program_ids: filtered.map((p) => p.id)
          })
        );
      }

      // Task 7: residential/inpatient, women_only, gym access, ~45 days
      const isTask7ProgramType =
        program_type === 'residential' || program_type === 'inpatient';
      const isTask7LengthPreset =
        length_preset_key === '40_45_days' || length_preset_key === '45_days';
      const isTask7LengthRange =
        typeof length_min_days === 'number' &&
        typeof length_max_days === 'number' &&
        length_min_days >= 40 &&
        length_min_days <= 50 &&
        length_max_days >= 40 &&
        length_max_days <= 50;
      if (
        isTask7ProgramType &&
        gender_restriction === 'women_only' &&
        has_gym_access === true &&
        (isTask7LengthPreset || isTask7LengthRange)
      ) {
        localStorage.setItem(
          'task7_programSearchContext',
          JSON.stringify({
            params: {
              query: query,
              program_type: program_type,
              gender_restriction: gender_restriction,
              length_min_days: length_min_days,
              length_max_days: length_max_days,
              length_preset_key: length_preset_key,
              has_gym_access: has_gym_access
            },
            timestamp: this._nowIso(),
            result_program_ids: filtered.map((p) => p.id)
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error in searchPrograms:', e);
    }

    return filtered.map((p) => {
      const center = centers.find((c) => c.id === p.center_id) || null;
      const distance = typeof p.distance_miles === 'number' ? p.distance_miles : (zip ? this._calculateProgramDistanceFromZip(p, zip) : undefined);
      return {
        program_id: p.id,
        center_id: p.center_id,
        name: p.name,
        short_name: p.short_name || null,
        program_type: p.program_type,
        primary_issues: p.primary_issues || [],
        gender_restriction: p.gender_restriction,
        description: p.description || '',
        length_min_days: p.length_min_days,
        length_max_days: p.length_max_days,
        price_total: p.price_total,
        price_currency: p.price_currency || 'usd',
        has_private_room: !!p.has_private_room,
        room_types: p.room_types || [],
        amenities: p.amenities || [],
        has_gym_access: !!p.has_gym_access,
        has_evening_sessions: !!p.has_evening_sessions,
        evening_sessions_per_week: p.evening_sessions_per_week || 0,
        average_rating: p.average_rating || 0,
        review_count: p.review_count || 0,
        city: p.city || (center ? center.city : null),
        state: p.state || (center ? center.state : null),
        zip: p.zip || (center ? center.zip : null),
        center_name: center ? center.name : null,
        distance_miles: typeof distance === 'number' ? distance : undefined,
        // Foreign key resolution
        center
      };
    });
  }

  // 4. getProgramDetails
  getProgramDetails(program_id) {
    const programs = this._getFromStorage('programs');
    const centers = this._getFromStorage('centers');
    const reviews = this._getFromStorage('program_reviews');

    const program = programs.find((p) => p.id === program_id) || null;
    if (!program) {
      return { program: null, center: null, rating_summary: { average_rating: 0, review_count: 0 } };
    }

    // Instrumentation for task 2 compared programs
    try {
      const issues = Array.isArray(program.primary_issues)
        ? program.primary_issues
        : [];
      const hasOpioidIssue =
        issues.includes('opioids') || issues.includes('opioid_use_disorder');
      if (
        (program.program_type === 'outpatient' ||
          program.program_type === 'intensive_outpatient') &&
        hasOpioidIssue
      ) {
        let existingIds = [];
        const existingRaw = localStorage.getItem('task2_comparedProgramIds');
        if (existingRaw) {
          try {
            const parsed = JSON.parse(existingRaw);
            if (
              parsed &&
              Array.isArray(parsed.compared_program_ids)
            ) {
              existingIds = parsed.compared_program_ids;
            }
          } catch (e) {
            // ignore parse error, start fresh
          }
        }
        if (!existingIds.includes(program.id)) {
          existingIds = [...existingIds, program.id];
        }
        localStorage.setItem(
          'task2_comparedProgramIds',
          JSON.stringify({
            compared_program_ids: [...existingIds],
            last_updated_at: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error in getProgramDetails:', e);
    }

    const center = centers.find((c) => c.id === program.center_id) || null;
    const programReviews = reviews.filter((r) => r.program_id === program_id);
    let average_rating = program.average_rating || 0;
    let review_count = program.review_count || 0;
    if (programReviews.length) {
      const sum = programReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      average_rating = sum / programReviews.length;
      review_count = programReviews.length;
    }

    return {
      program: {
        id: program.id,
        center_id: program.center_id,
        name: program.name,
        short_name: program.short_name || null,
        program_type: program.program_type,
        primary_issues: program.primary_issues || [],
        gender_restriction: program.gender_restriction,
        description: program.description || '',
        length_min_days: program.length_min_days,
        length_max_days: program.length_max_days,
        price_total: program.price_total,
        price_currency: program.price_currency || 'usd',
        has_private_room: !!program.has_private_room,
        room_types: program.room_types || [],
        amenities: program.amenities || [],
        has_gym_access: !!program.has_gym_access,
        schedule_summary: program.schedule_summary || '',
        has_evening_sessions: !!program.has_evening_sessions,
        evening_sessions_per_week: program.evening_sessions_per_week || 0,
        average_rating,
        review_count,
        city: program.city || (center ? center.city : null),
        state: program.state || (center ? center.state : null),
        zip: program.zip || (center ? center.zip : null)
      },
      center: center
        ? {
            id: center.id,
            name: center.name,
            city: center.city,
            state: center.state,
            address_line1: center.address_line1 || null,
            phone: center.phone || null,
            email: center.email || null
          }
        : null,
      rating_summary: {
        average_rating,
        review_count
      }
    };
  }

  // 5. getProgramReviews
  getProgramReviews(program_id, page = 1, page_size = 10) {
    const reviews = this._getFromStorage('program_reviews');
    const all = reviews
      .filter((r) => r.program_id === program_id)
      .sort((a, b) => {
        const da = a.created_at || '';
        const db = b.created_at || '';
        return db.localeCompare(da);
      });

    const start = (page - 1) * page_size;
    const paged = all.slice(start, start + page_size);

    let average_rating = 0;
    if (all.length) {
      const sum = all.reduce((acc, r) => acc + (r.rating || 0), 0);
      average_rating = sum / all.length;
    }

    // Foreign key resolution: include program object
    const program = this._getEntityById('programs', program_id);

    return {
      reviews: paged.map((r) => ({
        id: r.id,
        reviewer_name: r.reviewer_name || null,
        rating: r.rating,
        title: r.title || '',
        body: r.body || '',
        created_at: r.created_at,
        program_id: r.program_id,
        program: program || null
      })),
      average_rating,
      review_count: all.length
    };
  }

  // 6. submitProgramRequestInformation
  submitProgramRequestInformation(program_id, name, phone, email, preferred_contact_method, message) {
    const submissions = this._getFromStorage('program_form_submissions');
    const submitted_at = this._nowIso();

    const record = {
      id: this._generateId('program_form'),
      program_id,
      submission_type: 'request_information',
      submitted_at,
      name,
      phone: phone || null,
      email: email || null,
      preferred_contact_method: preferred_contact_method || null,
      preferred_time_window: null,
      date_of_birth: null,
      insurance_member_id: null,
      message: message || ''
    };

    submissions.push(record);
    this._saveToStorage('program_form_submissions', submissions);

    return {
      success: true,
      submission_id: record.id,
      submitted_at,
      confirmation_message: 'Your information request has been received. Our admissions team will contact you shortly.'
    };
  }

  // 7. scheduleProgramConsultation
  scheduleProgramConsultation(program_id, name, email, phone, preferred_time_window, additional_notes) {
    const submissions = this._getFromStorage('program_form_submissions');
    const submitted_at = this._nowIso();

    const record = {
      id: this._generateId('program_form'),
      program_id,
      submission_type: 'schedule_consultation',
      submitted_at,
      name,
      phone,
      email,
      preferred_contact_method: null,
      preferred_time_window: preferred_time_window || null,
      date_of_birth: null,
      insurance_member_id: null,
      message: additional_notes || ''
    };

    submissions.push(record);
    this._saveToStorage('program_form_submissions', submissions);

    return {
      success: true,
      submission_id: record.id,
      submitted_at,
      confirmation_message: 'Your consultation request has been submitted. We will reach out to confirm your appointment.'
    };
  }

  // 8. checkProgramInsurance
  checkProgramInsurance(program_id, name, date_of_birth, insurance_member_id) {
    const submissions = this._getFromStorage('program_form_submissions');
    const submitted_at = this._nowIso();

    const record = {
      id: this._generateId('program_form'),
      program_id,
      submission_type: 'check_insurance',
      submitted_at,
      name,
      phone: null,
      email: null,
      preferred_contact_method: null,
      preferred_time_window: null,
      date_of_birth,
      insurance_member_id,
      message: ''
    };

    submissions.push(record);
    this._saveToStorage('program_form_submissions', submissions);

    return {
      success: true,
      submission_id: record.id,
      submitted_at,
      preliminary_eligibility: 'Your insurance information has been submitted for review.',
      notes: 'A benefits specialist will contact you to discuss coverage and any out-of-pocket costs.'
    };
  }

  // 9. requestProgramCall
  requestProgramCall(program_id, name, phone, email, preferred_contact_time_window, message) {
    const submissions = this._getFromStorage('program_form_submissions');
    const submitted_at = this._nowIso();

    const record = {
      id: this._generateId('program_form'),
      program_id,
      submission_type: 'request_call',
      submitted_at,
      name,
      phone,
      email: email || null,
      preferred_contact_method: 'phone',
      preferred_time_window: preferred_contact_time_window || null,
      date_of_birth: null,
      insurance_member_id: null,
      message: message || ''
    };

    submissions.push(record);
    this._saveToStorage('program_form_submissions', submissions);

    return {
      success: true,
      submission_id: record.id,
      submitted_at,
      confirmation_message: 'Your call request has been received. We will contact you in your preferred time window whenever possible.'
    };
  }

  // 10. startPreAdmissionQuestionnaireSession
  startPreAdmissionQuestionnaireSession(program_id) {
    const session = this._getOrCreatePreAdmissionQuestionnaireSession(program_id);
    const program = this._getEntityById('programs', program_id);

    const program_summary = program
      ? {
          program_id: program.id,
          name: program.name,
          program_type: program.program_type,
          length_min_days: program.length_min_days,
          length_max_days: program.length_max_days
        }
      : {
          program_id,
          name: null,
          program_type: null,
          length_min_days: null,
          length_max_days: null
        };

    const first_page_fields = {
      requires_name: true,
      requires_date_of_birth: true,
      requires_primary_substance_of_concern: true,
      requires_treatment_preference: true,
      treatment_preference_options: [
        'residential_45_days',
        'residential_30_days',
        'inpatient_30_days',
        'outpatient',
        'detox',
        'other'
      ]
    };

    return {
      questionnaire_session_id: session.id,
      started_at: session.started_at,
      current_step: session.current_step,
      program_summary,
      first_page_fields
    };
  }

  // 11. getPreAdmissionQuestionnaireFirstPage
  getPreAdmissionQuestionnaireFirstPage(questionnaire_session_id) {
    const sessions = this._getFromStorage('pre_admission_questionnaire_sessions');
    const session = sessions.find((s) => s.id === questionnaire_session_id) || null;
    if (!session) {
      return {
        questionnaire_session_id: null,
        current_step: 0,
        completed_first_page: false,
        program_summary: null,
        saved_values: {
          name: null,
          date_of_birth: null,
          primary_substance_of_concern: null,
          treatment_preference: null
        }
      };
    }

    const program = this._getEntityById('programs', session.program_id);
    const program_summary = program
      ? {
          program_id: program.id,
          name: program.name,
          program_type: program.program_type,
          length_min_days: program.length_min_days,
          length_max_days: program.length_max_days
        }
      : {
          program_id: session.program_id,
          name: null,
          program_type: null,
          length_min_days: null,
          length_max_days: null
        };

    return {
      questionnaire_session_id: session.id,
      current_step: session.current_step,
      completed_first_page: !!session.completed_first_page,
      program_summary,
      saved_values: {
        name: session.name || null,
        date_of_birth: session.date_of_birth || null,
        primary_substance_of_concern: session.primary_substance_of_concern || null,
        treatment_preference: session.treatment_preference || null
      }
    };
  }

  // 12. submitPreAdmissionFirstPage
  submitPreAdmissionFirstPage(
    questionnaire_session_id,
    name,
    date_of_birth,
    primary_substance_of_concern,
    treatment_preference
  ) {
    const sessions = this._getFromStorage('pre_admission_questionnaire_sessions');
    const idx = sessions.findIndex((s) => s.id === questionnaire_session_id);
    if (idx === -1) {
      return { success: false, questionnaire_session_id, next_step: 0, completed_first_page: false };
    }

    const session = sessions[idx];
    session.name = name;
    session.date_of_birth = date_of_birth;
    session.primary_substance_of_concern = primary_substance_of_concern;
    session.treatment_preference = treatment_preference;
    session.completed_first_page = true;
    session.current_step = Math.max(session.current_step || 1, 2);

    sessions[idx] = session;
    this._saveToStorage('pre_admission_questionnaire_sessions', sessions);

    return {
      success: true,
      questionnaire_session_id,
      next_step: session.current_step,
      completed_first_page: true
    };
  }

  // 13. getInsurancePageContent
  getInsurancePageContent() {
    const providers = this._getFromStorage('insurance_providers');

    return {
      intro_text:
        'We work with many major insurance plans to help make treatment more affordable. Use our verification tool to understand your coverage.',
      payment_options_text:
        'In addition to insurance, we accept self-pay and may offer payment plans or financial assistance for those who qualify.',
      financial_assistance_text:
        'If cost is a concern, our admissions team can review sliding-scale options and community resources with you.',
      how_insurance_works_text:
        'After you submit your insurance information, our team will verify your benefits, estimate any out-of-pocket costs, and review options with you before you commit to treatment.',
      insurance_providers: providers.map((p) => ({ id: p.id, code: p.code, name: p.name }))
    };
  }

  // 14. getInsuranceProviders
  getInsuranceProviders() {
    const providers = this._getFromStorage('insurance_providers');
    return providers.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      phone: p.phone || null,
      website: p.website || null
    }));
  }

  // 15. searchProgramsByInsurance
  searchProgramsByInsurance(
    insurance_provider_id,
    zip,
    radius_miles,
    program_type,
    length_preset_key,
    length_min_days,
    length_max_days,
    sort_by
  ) {
    const programs = this._getFromStorage('programs');
    const centers = this._getFromStorage('centers');

    const filtered = this._filterAndSortPrograms(programs, {
      program_type,
      length_preset_key,
      length_min_days,
      length_max_days,
      zip,
      radius_miles,
      insurance_provider_id,
      sort_by
    }).filter(
      (p) =>
        Array.isArray(p.accepted_insurance_provider_ids) &&
        p.accepted_insurance_provider_ids.includes(insurance_provider_id)
    );

    // Instrumentation for task 3 insurance-based search context
    try {
      const hasInsurance = insurance_provider_id != null;
      const hasZip =
        typeof zip === 'string' && zip.trim() !== '';
      const radiusOk =
        typeof radius_miles === 'number' &&
        radius_miles <= 25;
      const isResOrInpatient =
        program_type === 'residential' || program_type === 'inpatient';
      const is60DayPreset =
        length_preset_key === '60_days';
      const is60DayRange =
        typeof length_min_days === 'number' &&
        typeof length_max_days === 'number' &&
        length_min_days >= 55 &&
        length_min_days <= 65 &&
        length_max_days >= 55 &&
        length_max_days <= 65;
      if (
        hasInsurance &&
        hasZip &&
        radiusOk &&
        isResOrInpatient &&
        (is60DayPreset || is60DayRange)
      ) {
        localStorage.setItem(
          'task3_insuranceSearchContext',
          JSON.stringify({
            params: {
              insurance_provider_id: insurance_provider_id,
              zip: zip,
              radius_miles: radius_miles,
              program_type: program_type,
              length_min_days: length_min_days,
              length_max_days: length_max_days,
              length_preset_key: length_preset_key,
              sort_by: sort_by
            },
            timestamp: this._nowIso(),
            result_program_ids: filtered.map((p) => p.id)
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error in searchProgramsByInsurance:', e);
    }

    return filtered.map((p) => {
      const center = centers.find((c) => c.id === p.center_id) || null;
      const distance = typeof p.distance_miles === 'number' ? p.distance_miles : this._calculateProgramDistanceFromZip(p, zip);
      const is_residential = p.program_type === 'residential' || p.program_type === 'inpatient';
      return {
        program_id: p.id,
        center_id: p.center_id,
        name: p.name,
        program_type: p.program_type,
        length_min_days: p.length_min_days,
        length_max_days: p.length_max_days,
        price_total: p.price_total,
        price_currency: p.price_currency || 'usd',
        city: p.city || (center ? center.city : null),
        state: p.state || (center ? center.state : null),
        zip: p.zip || (center ? center.zip : null),
        center_name: center ? center.name : null,
        distance_miles: typeof distance === 'number' ? distance : undefined,
        is_residential,
        // Foreign key resolution
        center
      };
    });
  }

  // 16. getSupportGroupFilterOptions
  getSupportGroupFilterOptions() {
    return {
      group_types: ['family_support', 'patient', 'alumni', 'open_community', 'other'],
      days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      times_of_day: ['morning', 'afternoon', 'evening', 'late_night'],
      location_types: ['in_person', 'online', 'hybrid'],
      default_radius_miles: 20
    };
  }

  // 17. searchSupportGroupSessions
  searchSupportGroupSessions(group_type, zip, radius_miles, day_of_week, time_of_day, date_from, date_to) {
    const sessions = this._getFromStorage('support_group_sessions');

    let result = sessions.slice();

    if (group_type) {
      result = result.filter((s) => s.group_type === group_type);
    }

    if (day_of_week) {
      result = result.filter((s) => s.day_of_week === day_of_week);
    }

    if (time_of_day) {
      result = result.filter((s) => s.time_of_day === time_of_day);
    }

    if (date_from) {
      result = result.filter((s) => (s.session_start || '') >= date_from);
    }

    if (date_to) {
      result = result.filter((s) => (s.session_start || '') <= date_to);
    }

    if (zip && typeof radius_miles === 'number') {
      result = result
        .map((s) => {
          const distance = this._calculateDistanceFromZip(zip, s.zip || '');
          return { session: s, distance_miles: distance };
        })
        .filter((wrap) => wrap.distance_miles === null || wrap.distance_miles <= radius_miles)
        .map((wrap) => ({ ...wrap.session, distance_miles: wrap.distance_miles }));
    }

    // Instrumentation for task 4 support group search context
    try {
      const isFamilySupport = group_type === 'family_support';
      const isZip90001 = zip === '90001';
      const radiusOk =
        typeof radius_miles === 'number' &&
        radius_miles <= 20;
      const isWednesday = day_of_week === 'wednesday';
      const isEvening = time_of_day === 'evening';
      if (
        isFamilySupport &&
        isZip90001 &&
        radiusOk &&
        isWednesday &&
        isEvening
      ) {
        localStorage.setItem(
          'task4_supportGroupSearchContext',
          JSON.stringify({
            params: {
              group_type: group_type,
              zip: zip,
              radius_miles: radius_miles,
              day_of_week: day_of_week,
              time_of_day: time_of_day,
              date_from: date_from,
              date_to: date_to
            },
            timestamp: this._nowIso(),
            result_session_ids: result.map((s) => s.session_id)
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error in searchSupportGroupSessions:', e);
    }

    return result.map((s) => ({
      session_id: s.id,
      title: s.title,
      description: s.description || '',
      group_type: s.group_type,
      audience: s.audience || null,
      session_start: s.session_start,
      session_end: s.session_end || null,
      day_of_week: s.day_of_week,
      time_of_day: s.time_of_day,
      location_type: s.location_type,
      address_line1: s.address_line1 || null,
      city: s.city || null,
      state: s.state || null,
      zip: s.zip || null,
      distance_miles: typeof s.distance_miles === 'number' ? s.distance_miles : undefined,
      registration_required: !!s.registration_required
    }));
  }

  // 18. getSupportGroupSessionDetails
  getSupportGroupSessionDetails(session_id) {
    const sessions = this._getFromStorage('support_group_sessions');
    const centers = this._getFromStorage('centers');
    const session = sessions.find((s) => s.id === session_id) || null;

    if (!session) {
      return { session: null, center: null };
    }

    const center = centers.find((c) => c.id === session.center_id) || null;

    return {
      session: {
        id: session.id,
        center_id: session.center_id || null,
        title: session.title,
        description: session.description || '',
        group_type: session.group_type,
        audience: session.audience || null,
        is_recurring: !!session.is_recurring,
        recurrence_pattern: session.recurrence_pattern || null,
        session_start: session.session_start,
        session_end: session.session_end || null,
        day_of_week: session.day_of_week,
        time_of_day: session.time_of_day,
        location_type: session.location_type,
        address_line1: session.address_line1 || null,
        city: session.city || null,
        state: session.state || null,
        zip: session.zip || null,
        registration_required: !!session.registration_required,
        max_capacity: session.max_capacity || null
      },
      center: center
        ? {
            id: center.id,
            name: center.name,
            address_line1: center.address_line1 || null,
            city: center.city,
            state: center.state
          }
        : null
    };
  }

  // 19. registerForSupportGroupSession
  registerForSupportGroupSession(session_id, participant_name, contact_email, contact_phone, selected_attendance_type, notes) {
    const registrations = this._getFromStorage('support_group_registrations');
    const registered_at = this._nowIso();

    const record = {
      id: this._generateId('sg_reg'),
      session_id,
      registered_at,
      participant_name,
      contact_email,
      contact_phone: contact_phone || null,
      selected_attendance_type: selected_attendance_type || null,
      notes: notes || ''
    };

    registrations.push(record);
    this._saveToStorage('support_group_registrations', registrations);

    return {
      success: true,
      registration_id: record.id,
      registered_at,
      confirmation_message: 'You are registered for this support group session. We look forward to seeing you.'
    };
  }

  // 20. getAssessmentIntroAndQuestions
  getAssessmentIntroAndQuestions() {
    const questions = this._getFromStorage('assessment_questions').filter((q) => q.is_active !== false);
    questions.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Ensure an assessment session exists (in-progress)
    this._getOrCreateAssessmentSession();

    return {
      intro_text:
        'This brief assessment helps our clinical team understand your needs and recommend an appropriate level of care. It is not a diagnosis.',
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        help_text: q.help_text || null,
        order: q.order || 0,
        answer_type: q.answer_type,
        options: q.options || []
      }))
    };
  }

  // 21. submitAssessmentResponses
  submitAssessmentResponses(answers) {
    const programs = this._getFromStorage('programs').filter((p) => p.is_active !== false);
    const sessions = this._getFromStorage('assessment_sessions');

    const session = this._getOrCreateAssessmentSession();
    session.answers = Array.isArray(answers) ? answers : [];
    session.status = 'completed';
    session.completed_at = this._nowIso();

    // Simple recommendation logic: all active programs
    const recommended_program_ids = programs.map((p) => p.id);
    session.recommended_program_ids = recommended_program_ids;

    // Persist changes
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx === -1) {
      sessions.push(session);
    } else {
      sessions[idx] = session;
    }
    this._saveToStorage('assessment_sessions', sessions);

    // Build recommended_programs array with resolved centers
    const centers = this._getFromStorage('centers');
    const recommended_programs = programs.map((p) => {
      const center = centers.find((c) => c.id === p.center_id) || null;
      return {
        program_id: p.id,
        center_id: p.center_id,
        name: p.name,
        program_type: p.program_type,
        primary_issues: p.primary_issues || [],
        gender_restriction: p.gender_restriction,
        length_min_days: p.length_min_days,
        length_max_days: p.length_max_days,
        price_total: p.price_total,
        price_currency: p.price_currency || 'usd',
        has_private_room: !!p.has_private_room,
        has_gym_access: !!p.has_gym_access,
        average_rating: p.average_rating || 0,
        review_count: p.review_count || 0,
        city: p.city || (center ? center.city : null),
        state: p.state || (center ? center.state : null),
        zip: p.zip || (center ? center.zip : null),
        // Foreign key resolution
        center
      };
    });

    return {
      assessment_session_id: session.id,
      status: session.status,
      recommended_programs
    };
  }

  // 22. getResourceFilterOptions
  getResourceFilterOptions() {
    const now = new Date();
    const to = now.toISOString();
    const twoYearsAgo = new Date(now.getTime());
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const date_presets = [
      {
        key: 'last_30_days',
        label: 'Last 30 days',
        from: last30.toISOString(),
        to
      },
      {
        key: 'last_2_years',
        label: 'Last 2 years',
        from: twoYearsAgo.toISOString(),
        to
      }
    ];

    return {
      content_types: ['article', 'blog_post', 'video', 'podcast'],
      date_presets
    };
  }

  // 23. searchArticles
  searchArticles(query, content_types, published_from, published_to, sort_by) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_entries');

    let result = articles.slice();

    if (Array.isArray(content_types) && content_types.length) {
      result = result.filter((a) => content_types.includes(a.content_type));
    }

    if (published_from) {
      result = result.filter((a) => (a.published_at || '') >= published_from);
    }

    if (published_to) {
      result = result.filter((a) => (a.published_at || '') <= published_to);
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const tags = (a.tags || []).join(' ').toLowerCase();
        return title.includes(q) || content.includes(q) || tags.includes(q);
      });
    }

    const sortKey = sort_by || 'newest_first';
    if (sortKey === 'newest_first') {
      result.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    }

    // Instrumentation for task 6 article search context
    try {
      let queryOk = false;
      if (typeof query === 'string') {
        const qLower = query.toLowerCase();
        if (
          qLower.includes('benzodiazepine') &&
          qLower.includes('withdrawal')
        ) {
          queryOk = true;
        }
      }
      const contentTypesOk =
        Array.isArray(content_types) &&
        content_types.some(
          (ct) => ct === 'article' || ct === 'blog_post'
        );
      if (queryOk && contentTypesOk) {
        localStorage.setItem(
          'task6_articleSearchContext',
          JSON.stringify({
            params: {
              query: query,
              content_types: content_types,
              published_from: published_from,
              published_to: published_to,
              sort_by: sort_by
            },
            timestamp: this._nowIso(),
            result_article_ids: result.map((a) => a.article_id)
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error in searchArticles:', e);
    }

    return result.map((a) => {
      const is_saved = !!readingList.find((e) => e.article_id === a.id);
      return {
        article_id: a.id,
        title: a.title,
        slug: a.slug || null,
        excerpt: a.excerpt || '',
        published_at: a.published_at,
        author: a.author || null,
        content_type: a.content_type,
        tags: a.tags || [],
        is_saved
      };
    });
  }

  // 24. getArticleDetails
  getArticleDetails(article_id) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_entries');

    const article = articles.find((a) => a.id === article_id) || null;
    if (!article) {
      return { article: null, is_saved: false, related_articles: [] };
    }

    const is_saved = !!readingList.find((e) => e.article_id === article_id);

    // Simple related articles: first few that share any tag
    const tags = new Set(article.tags || []);
    const related_articles = articles
      .filter((a) => a.id !== article.id)
      .filter((a) => {
        if (!Array.isArray(a.tags) || !a.tags.length || !tags.size) return false;
        return a.tags.some((t) => tags.has(t));
      })
      .slice(0, 5)
      .map((a) => ({ article_id: a.id, title: a.title, slug: a.slug || null }));

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug || null,
        content: article.content,
        excerpt: article.excerpt || '',
        author: article.author || null,
        published_at: article.published_at,
        content_type: article.content_type,
        tags: article.tags || [],
        topics: article.topics || []
      },
      is_saved,
      related_articles
    };
  }

  // 25. saveArticleToReadingList
  saveArticleToReadingList(article_id) {
    const entries = this._getOrCreateReadingList();
    const existing = entries.find((e) => e.article_id === article_id);
    if (existing) {
      return {
        success: true,
        reading_list_entry_id: existing.id,
        saved_at: existing.saved_at
      };
    }

    const saved_at = this._nowIso();
    const entry = {
      id: this._generateId('reading_list'),
      article_id,
      saved_at
    };

    entries.push(entry);
    this._saveToStorage('reading_list_entries', entries);

    return {
      success: true,
      reading_list_entry_id: entry.id,
      saved_at
    };
  }

  // 26. removeArticleFromReadingList
  removeArticleFromReadingList(article_id) {
    const entries = this._getFromStorage('reading_list_entries');
    const filtered = entries.filter((e) => e.article_id !== article_id);
    this._saveToStorage('reading_list_entries', filtered);
    return { success: true };
  }

  // 27. getReadingList
  getReadingList() {
    const entries = this._getFromStorage('reading_list_entries');
    const articles = this._getFromStorage('articles');

    return entries.map((e) => {
      const article = articles.find((a) => a.id === e.article_id) || null;
      return {
        reading_list_entry_id: e.id,
        article_id: e.article_id,
        title: article ? article.title : null,
        excerpt: article ? article.excerpt || '' : '',
        published_at: article ? article.published_at : null,
        author: article ? article.author || null : null,
        tags: article ? article.tags || [] : [],
        // Foreign key resolution
        article
      };
    });
  }

  // 28. getContactPageContent
  getContactPageContent() {
    const helplines = this._getFromStorage('helplines');
    let primary_helpline = null;
    let other_helplines = [];

    if (helplines.length) {
      primary_helpline = helplines.find((h) => h.is_24_7) || helplines[0];
      other_helplines = helplines.filter((h) => h.id !== primary_helpline.id);
    }

    return {
      primary_helpline: primary_helpline || null,
      other_helplines,
      contact_email: 'info@exampletreatmentcenter.com',
      physical_address: 'Treatment Center Network, 123 Recovery Way, Anytown, USA',
      general_contact_text:
        'If you or a loved one is struggling with addiction or mental health concerns, call our 24/7 helpline or request a confidential callback.'
    };
  }

  // 29. submitCallbackRequest
  submitCallbackRequest(
    name,
    phone,
    email,
    preferred_callback_time_window,
    preferred_time_range_text,
    reason_text,
    topics_of_concern
  ) {
    const requests = this._getFromStorage('callback_requests');
    const submitted_at = this._nowIso();

    const record = {
      id: this._generateId('callback'),
      helpline_id: null,
      submitted_at,
      name,
      phone,
      email: email || null,
      preferred_callback_time_window: preferred_callback_time_window || null,
      preferred_time_range_text: preferred_time_range_text || null,
      reason_text: reason_text || null,
      topics_of_concern: Array.isArray(topics_of_concern) ? topics_of_concern : []
    };

    requests.push(record);
    this._saveToStorage('callback_requests', requests);

    return {
      success: true,
      callback_request_id: record.id,
      submitted_at,
      confirmation_message: 'Your callback request has been submitted. Our team will reach out as soon as possible.'
    };
  }

  // 30. getLocationFilterOptions
  getLocationFilterOptions() {
    const centers = this._getFromStorage('centers');
    const stateSet = new Set();
    centers.forEach((c) => {
      if (c.state) stateSet.add(c.state);
    });

    const states = Array.from(stateSet).map((code) => ({ code, label: code }));

    return { states };
  }

  // 31. searchCenters
  searchCenters(state, city, services, family_friendly_only) {
    const centers = this._getFromStorage('centers');

    let result = centers.filter((c) => c.is_active !== false);

    if (state) {
      const s = state.toLowerCase();
      result = result.filter((c) => (c.state || '').toLowerCase() === s);
    }

    if (city) {
      const ci = city.toLowerCase();
      result = result.filter((c) => (c.city || '').toLowerCase() === ci);
    }

    if (Array.isArray(services) && services.length) {
      result = result.filter((c) => {
        const offered = c.services_offered || [];
        return services.every((s) => offered.includes(s));
      });
    }

    if (family_friendly_only) {
      result = result.filter((c) => {
        const days = c.visitation_days_allowed || [];
        const hasWeekend = days.includes('saturday') && days.includes('sunday');
        const counseling = !!c.family_counseling_offered;
        return hasWeekend && counseling;
      });
    }

    return result.map((c) => ({
      center_id: c.id,
      name: c.name,
      city: c.city,
      state: c.state,
      services_offered: c.services_offered || [],
      visitation_days_allowed: c.visitation_days_allowed || [],
      family_counseling_offered: !!c.family_counseling_offered,
      family_counseling_sessions_per_week: c.family_counseling_sessions_per_week || 0
    }));
  }

  // 32. getCenterDetails
  getCenterDetails(center_id) {
    const center = this._getEntityById('centers', center_id);
    if (!center) {
      return {
        center: null
      };
    }

    // Instrumentation for task 9 compared centers
    try {
      let existingIds = [];
      const existingRaw = localStorage.getItem('task9_comparedCenterIds');
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (
            parsed &&
            Array.isArray(parsed.compared_center_ids)
          ) {
            existingIds = parsed.compared_center_ids;
          }
        } catch (e) {
          // ignore parse error, start fresh
        }
      }
      if (!existingIds.includes(center.id)) {
        existingIds = [...existingIds, center.id];
      }
      localStorage.setItem(
        'task9_comparedCenterIds',
        JSON.stringify({
          compared_center_ids: [...existingIds],
          last_updated_at: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error in getCenterDetails:', e);
    }

    return {
      center: {
        id: center.id,
        name: center.name,
        description: center.description || '',
        address_line1: center.address_line1 || null,
        city: center.city,
        state: center.state,
        zip: center.zip || null,
        phone: center.phone || null,
        email: center.email || null,
        services_offered: center.services_offered || [],
        visitation_policy_text: center.visitation_policy_text || '',
        visitation_days_allowed: center.visitation_days_allowed || [],
        family_counseling_offered: !!center.family_counseling_offered,
        family_counseling_sessions_per_week: center.family_counseling_sessions_per_week || 0,
        family_services_description: center.family_services_description || ''
      }
    };
  }

  // 33. getCenterPrograms
  getCenterPrograms(center_id) {
    const programs = this._getFromStorage('programs').filter((p) => p.center_id === center_id && p.is_active !== false);
    return programs.map((p) => ({
      program_id: p.id,
      name: p.name,
      short_name: p.short_name || null,
      program_type: p.program_type,
      primary_issues: p.primary_issues || [],
      length_min_days: p.length_min_days,
      length_max_days: p.length_max_days,
      price_total: p.price_total,
      price_currency: p.price_currency || 'usd'
    }));
  }

  // 34. submitAdmissionInquiry
  submitAdmissionInquiry(center_id, name, phone, email, relationship_to_patient, message) {
    const inquiries = this._getFromStorage('admission_inquiries');
    const submitted_at = this._nowIso();

    const record = {
      id: this._generateId('admission_inquiry'),
      center_id,
      submitted_at,
      name,
      phone,
      email: email || null,
      relationship_to_patient: relationship_to_patient || null,
      message: message || ''
    };

    inquiries.push(record);
    this._saveToStorage('admission_inquiries', inquiries);

    return {
      success: true,
      admission_inquiry_id: record.id,
      submitted_at,
      confirmation_message: 'Your admission inquiry has been received. An admissions specialist will contact you shortly.'
    };
  }

  // 35. getAboutPageContent
  getAboutPageContent() {
    return {
      mission:
        'Our mission is to provide compassionate, evidence-based addiction and mental health treatment that honors the dignity of every person and family we serve.',
      values:
        'We value compassion, integrity, clinical excellence, inclusivity, and long-term recovery support.',
      treatment_philosophy:
        'We believe recovery is possible for everyone. Our integrated treatment model addresses substance use, mental health, trauma, and family systems through individualized care plans.',
      services_overview:
        'Our continuum of care includes medical detox, residential and inpatient treatment, intensive outpatient programs, outpatient services, and family and alumni support.',
      leadership: [],
      accreditations: []
    };
  }

  // 36. getFaqEntries
  getFaqEntries(category) {
    // No persistent FAQ entity specified; return a minimal static set.
    const allFaqs = [
      {
        faq_id: 'faq_1',
        question: 'Is detox required before treatment?',
        answer:
          'Detox is recommended when there is a risk of dangerous withdrawal. Our admissions team and medical staff can help determine whether detox is appropriate for you.',
        category: 'detox'
      },
      {
        faq_id: 'faq_2',
        question: 'Do you accept insurance?',
        answer:
          'We work with many major insurance providers. Use our online verification tool or call our helpline to check your coverage.',
        category: 'insurance'
      },
      {
        faq_id: 'faq_3',
        question: 'Are family members involved in treatment?',
        answer:
          'Yes. When clinically appropriate, we offer family education, family therapy, and dedicated family support groups.',
        category: 'family_support'
      }
    ];

    if (category) {
      const cat = category.toLowerCase();
      return allFaqs.filter((f) => (f.category || '').toLowerCase() === cat);
    }
    return allFaqs;
  }

  // 37. getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    return {
      last_updated: '2024-01-01',
      introduction:
        'We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services.',
      information_collected:
        'We may collect information that you voluntarily provide (such as contact details and health-related information submitted through forms) as well as certain technical information automatically (such as IP address and browser type).',
      use_of_information:
        'We use your information to respond to your inquiries, coordinate care and admissions, improve our services, and comply with legal obligations.',
      cookies_and_tracking:
        'We may use cookies and similar technologies to improve website performance and understand how visitors use the site. You can control cookies through your browser settings.',
      data_sharing:
        'We do not sell your personal information. We may share it with trusted partners involved in your care or as required by law, always in compliance with applicable privacy regulations such as HIPAA where applicable.',
      contact_for_privacy:
        'If you have questions about this Privacy Policy or our privacy practices, please contact us at privacy@exampletreatmentcenter.com.'
    };
  }

  // 38. getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    return {
      last_updated: '2024-01-01',
      introduction:
        'These Terms & Conditions govern your use of this website. By accessing or using the site, you agree to be bound by these terms.',
      acceptable_use:
        'You agree not to misuse the site, attempt to gain unauthorized access, or post content that is unlawful, harmful, or abusive.',
      medical_disclaimer:
        'Information on this website is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.',
      limitations_of_liability:
        'To the fullest extent permitted by law, we are not liable for any damages arising from your use of or inability to use the site or any information provided on it.',
      user_responsibilities:
        'You are responsible for ensuring that the information you provide is accurate and for using the site in a way that complies with applicable laws and these terms.'
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