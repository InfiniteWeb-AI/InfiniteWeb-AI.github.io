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

  // --------- Storage helpers ---------

  _initStorage() {
    const tableKeys = [
      'job_positions',
      'job_applications',
      'clubs',
      'audition_slots',
      'audition_bookings',
      'workshops',
      'workshop_enrollments',
      'message_threads',
      'messages',
      'candidate_profiles',
      'favorites_lists',
      'favorite_list_items',
      'earnings_estimates',
      'help_faq_entries',
      'contact_requests'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Object-style storages
    if (!localStorage.getItem('static_pages')) {
      localStorage.setItem('static_pages', JSON.stringify({}));
    }
    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          support_email: '',
          business_address: '',
          response_time_estimate: '',
          show_recruiter_messaging_hint: true
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  }

  _getObjectFromStorage(key, defaultValue = {}) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : defaultValue;
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

  _nowISO() {
    return new Date().toISOString();
  }

  // --------- Formatting helpers ---------

  _formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    return '$' + amount.toFixed(2);
  }

  _formatDistance(distanceMiles) {
    if (typeof distanceMiles !== 'number' || isNaN(distanceMiles)) return '';
    return distanceMiles.toFixed(1).replace(/\.0$/, '') + ' mi';
  }

  _formatDateLabel(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _parseTimeToMinutes(timeStr) {
    // timeStr in 'HH:MM' 24h format
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _isWithinNextDays(dateString, days) {
    if (!dateString) return false;
    const now = new Date();
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return false;
    const diffMs = target.getTime() - now.getTime();
    if (diffMs < 0) return false;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  }

  _summarizeAvailableDays(job) {
    const days = [];
    if (job.available_monday) days.push('Mon');
    if (job.available_tuesday) days.push('Tue');
    if (job.available_wednesday) days.push('Wed');
    if (job.available_thursday) days.push('Thu');
    if (job.available_friday) days.push('Fri');
    if (job.available_saturday) days.push('Sat');
    if (job.available_sunday) days.push('Sun');
    return days.join('/');
  }

  _scheduleTypeLabel(value) {
    const map = {
      weekend_only: 'Weekend only',
      weekday_evenings: 'Weekday evenings',
      weekday_days: 'Weekday days',
      mixed: 'Mixed schedule',
      flexible: 'Flexible',
      other: 'Other'
    };
    return map[value] || '';
  }

  // --------- Required internal helpers from spec ---------

  _resolveLocationToCoordinates(location_query) {
    // Stub implementation; real geocoding is out of scope.
    // We do NOT persist or mock distance data here; this is only a helper.
    if (!location_query) return null;
    return { lat: 0, lng: 0 };
  }

  _getOrCreateDefaultFavoritesList() {
    let lists = this._getFromStorage('favorites_lists');
    let defaultList = lists.find((l) => l.is_default);
    if (!defaultList) {
      defaultList = {
        id: this._generateId('favlist'),
        name: 'Favorites',
        is_default: true,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(defaultList);
      this._saveToStorage('favorites_lists', lists);
    }
    return { lists, defaultList };
  }

  _calculateWeeklyEarningsAfterCommission(club, base_hourly_rate, shifts_per_week, tips_per_shift, average_shift_length_hours) {
    const hoursPerWeek = average_shift_length_hours * shifts_per_week;
    const hourlyIncome = base_hourly_rate * hoursPerWeek;
    const tipsPerWeek = tips_per_shift * shifts_per_week;
    const weekly_before = hourlyIncome + tipsPerWeek;

    let commissionPercent = 0;
    if (club && club.commission_type === 'percentage') {
      commissionPercent = club.commission_rate_percent || 0;
    }
    // For flat_fee or none, we treat commission as 0% here; more complex logic could be added.

    const weekly_commission_amount = weekly_before * (commissionPercent / 100);
    const weekly_after = weekly_before - weekly_commission_amount;

    return {
      club_id: club ? club.id : null,
      base_hourly_rate,
      shifts_per_week,
      tips_per_shift,
      average_shift_length_hours,
      commission_rate_percent: commissionPercent,
      weekly_income_before_commission: weekly_before,
      weekly_commission_amount,
      weekly_income_after_commission: weekly_after
    };
  }

  _getOrCreateCandidateProfileRecord() {
    let profiles = this._getFromStorage('candidate_profiles');
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('candidate'),
        stage_name: '',
        years_experience: 0,
        experience_range: 'less_than_1',
        availability_monday: false,
        availability_tuesday: false,
        availability_wednesday: false,
        availability_thursday: false,
        availability_friday: false,
        availability_saturday: false,
        availability_sunday: false,
        preferred_shift_time: 'flexible',
        prefers_music_rnb: false,
        prefers_music_hip_hop: false,
        prefers_music_pop: false,
        prefers_music_edm: false,
        prefers_music_rock: false,
        prefers_music_latin: false,
        prefers_music_other: false,
        travel_preference: 'up_to_10_miles',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      profiles.push(profile);
      this._saveToStorage('candidate_profiles', profiles);
    }
    return { profiles, profile };
  }

  // --------- Interface implementations ---------

  // getHomeOverview
  getHomeOverview() {
    const jobPositions = this._getFromStorage('job_positions');
    const clubs = this._getFromStorage('clubs');
    const auditions = this._getFromStorage('audition_slots');
    const workshops = this._getFromStorage('workshops');
    const candidateProfiles = this._getFromStorage('candidate_profiles');

    const weekendJobs = jobPositions
      .filter((j) => j.is_active && j.schedule_type === 'weekend_only')
      .sort((a, b) => (b.base_hourly_rate || 0) - (a.base_hourly_rate || 0))
      .slice(0, 5)
      .map((job) => {
        const club = clubs.find((c) => c.id === job.club_id) || null;
        const distanceLabel = this._formatDistance(job.distance_miles);
        return {
          job_id: job.id,
          title: job.title,
          club_name: club ? club.name : '',
          location_display: [job.location_neighborhood, job.location_city, job.location_region]
            .filter(Boolean)
            .join(', '),
          base_hourly_rate: job.base_hourly_rate,
          base_hourly_rate_formatted: this._formatCurrency(job.base_hourly_rate),
          schedule_type_label: this._scheduleTypeLabel(job.schedule_type),
          min_shifts_per_week: job.min_shifts_per_week,
          distance_label: distanceLabel,
          // Foreign key resolution for convenience
          job,
          club
        };
      });

    const auditions_available_count = auditions.filter((s) => !s.is_booked).length;
    const clubs_count = clubs.length;
    const workshops_beginner_soon_count = workshops.filter((w) => {
      return (
        w.is_active &&
        w.skill_level === 'beginner' &&
        this._isWithinNextDays(w.start_datetime, 30)
      );
    }).length;

    const has_candidate_profile = candidateProfiles.length > 0;

    const primary_ctas = [
      { cta_id: 'cta_jobs', label: 'Explore open positions', target_page: 'jobs_listing' },
      { cta_id: 'cta_auditions', label: 'Book an audition', target_page: 'auditions' },
      { cta_id: 'cta_clubs', label: 'Browse clubs', target_page: 'clubs_directory' },
      { cta_id: 'cta_workshops', label: 'Training & workshops', target_page: 'workshops' },
      { cta_id: 'cta_profile', label: 'Set up your profile', target_page: 'candidate_profile' }
    ];

    return {
      featuredWeekendJobs: weekendJobs,
      auditions_available_count,
      clubs_count,
      workshops_beginner_soon_count,
      has_candidate_profile,
      primary_ctas
    };
  }

  // getJobSearchFilterOptions
  getJobSearchFilterOptions() {
    const schedule_types = [
      { value: 'weekend_only', label: 'Weekend only' },
      { value: 'weekday_evenings', label: 'Weekday evenings' },
      { value: 'weekday_days', label: 'Weekday days' },
      { value: 'mixed', label: 'Mixed' },
      { value: 'flexible', label: 'Flexible' },
      { value: 'other', label: 'Other' }
    ];

    const day_options = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const min_shifts_per_week_options = [1, 2, 3, 4, 5, 6, 7];

    const radius_options_miles = [5, 10, 15, 25, 50];

    const sort_options = [
      { value: 'hourly_base_pay_desc', label: 'Hourly base pay – High to Low' },
      { value: 'hourly_base_pay_asc', label: 'Hourly base pay – Low to High' },
      { value: 'rating_desc', label: 'Rating – High to Low' },
      { value: 'relevance', label: 'Best match' }
    ];

    return {
      schedule_types,
      day_options,
      min_shifts_per_week_options,
      radius_options_miles,
      sort_options
    };
  }

  // searchJobPositions
  searchJobPositions(
    location_query,
    max_distance_miles,
    days_of_week,
    require_weekdays,
    require_weekends,
    require_evening_shifts,
    require_late_evening_shifts,
    schedule_type,
    min_shifts_per_week,
    supports_quick_application_only,
    sort_by,
    page,
    page_size
  ) {
    const jobs = this._getFromStorage('job_positions');
    const clubs = this._getFromStorage('clubs');

    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const daysFilter = Array.isArray(days_of_week) ? days_of_week : [];

    let filtered = jobs.filter((job) => job.is_active);

    if (location_query && typeof location_query === 'string') {
      const q = location_query.toLowerCase();
      filtered = filtered.filter((job) => {
        const parts = [job.location_city, job.location_region, job.location_neighborhood]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        return parts.some((p) => p.indexOf(q) !== -1);
      });
    }

    if (typeof max_distance_miles === 'number') {
      filtered = filtered.filter((job) => {
        if (typeof job.distance_miles !== 'number') return true; // unknown distance, keep
        return job.distance_miles <= max_distance_miles;
      });
    }

    if (daysFilter.length > 0) {
      filtered = filtered.filter((job) => {
        return daysFilter.every((d) => {
          switch (d) {
            case 'monday':
              return !!job.available_monday;
            case 'tuesday':
              return !!job.available_tuesday;
            case 'wednesday':
              return !!job.available_wednesday;
            case 'thursday':
              return !!job.available_thursday;
            case 'friday':
              return !!job.available_friday;
            case 'saturday':
              return !!job.available_saturday;
            case 'sunday':
              return !!job.available_sunday;
            default:
              return true;
          }
        });
      });
    }

    if (require_weekdays) {
      filtered = filtered.filter((job) => !!job.offers_weekday_shifts);
    }

    if (require_weekends) {
      filtered = filtered.filter((job) => !!job.offers_weekend_shifts);
    }

    if (require_evening_shifts) {
      filtered = filtered.filter((job) => !!job.offers_evening_shifts);
    }

    if (require_late_evening_shifts) {
      filtered = filtered.filter((job) => !!job.offers_late_evening_shifts);
    }

    if (schedule_type) {
      filtered = filtered.filter((job) => job.schedule_type === schedule_type);
    }

    if (typeof min_shifts_per_week === 'number') {
      filtered = filtered.filter((job) => job.min_shifts_per_week >= min_shifts_per_week);
    }

    if (supports_quick_application_only) {
      filtered = filtered.filter((job) => !!job.supports_quick_application);
    }

    // Sorting
    const sortMode = sort_by || 'relevance';
    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'hourly_base_pay_desc':
          return (b.base_hourly_rate || 0) - (a.base_hourly_rate || 0);
        case 'hourly_base_pay_asc':
          return (a.base_hourly_rate || 0) - (b.base_hourly_rate || 0);
        case 'rating_desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'relevance':
        default: {
          const aCreated = new Date(a.created_at || 0).getTime();
          const bCreated = new Date(b.created_at || 0).getTime();
          return bCreated - aCreated;
        }
      }
    });

    const total_count = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end);

    const results = paged.map((job) => {
      const club = clubs.find((c) => c.id === job.club_id) || null;
      const distanceLabel = this._formatDistance(job.distance_miles);
      return {
        job_id: job.id,
        title: job.title,
        club_name: club ? club.name : '',
        location_city: job.location_city,
        location_region: job.location_region,
        location_neighborhood: job.location_neighborhood,
        base_hourly_rate: job.base_hourly_rate,
        base_hourly_rate_formatted: this._formatCurrency(job.base_hourly_rate),
        schedule_type: job.schedule_type,
        schedule_type_label: this._scheduleTypeLabel(job.schedule_type),
        min_shifts_per_week: job.min_shifts_per_week,
        available_days_summary: this._summarizeAvailableDays(job),
        offers_evening_shifts: !!job.offers_evening_shifts,
        offers_late_evening_shifts: !!job.offers_late_evening_shifts,
        supports_quick_application: !!job.supports_quick_application,
        rating: job.rating,
        distance_miles: job.distance_miles,
        distance_label: distanceLabel,
        // Foreign key resolution
        job,
        club
      };
    });

    return {
      results,
      total_count,
      page: pageNum,
      page_size: size
    };
  }

  // getJobPositionDetail
  getJobPositionDetail(job_id) {
    const jobs = this._getFromStorage('job_positions');
    const clubs = this._getFromStorage('clubs');

    const job = jobs.find((j) => j.id === job_id) || null;
    if (!job) {
      return {
        job: null,
        club_summary: null,
        application_options: {
          supports_quick_application: false,
          supports_full_application: false,
          default_application_type: 'quick'
        }
      };
    }

    const club = clubs.find((c) => c.id === job.club_id) || null;

    const jobDetail = {
      id: job.id,
      title: job.title,
      description: job.description,
      location_city: job.location_city,
      location_region: job.location_region,
      location_neighborhood: job.location_neighborhood,
      base_hourly_rate: job.base_hourly_rate,
      base_hourly_rate_formatted: this._formatCurrency(job.base_hourly_rate),
      schedule_type: job.schedule_type,
      min_shifts_per_week: job.min_shifts_per_week,
      available_monday: job.available_monday,
      available_tuesday: job.available_tuesday,
      available_wednesday: job.available_wednesday,
      available_thursday: job.available_thursday,
      available_friday: job.available_friday,
      available_saturday: job.available_saturday,
      available_sunday: job.available_sunday,
      offers_evening_shifts: job.offers_evening_shifts,
      offers_late_evening_shifts: job.offers_late_evening_shifts,
      supports_quick_application: job.supports_quick_application
    };

    const club_summary = club
      ? {
          club_id: club.id,
          club_name: club.name,
          rating_overall: club.rating_overall,
          reviews_count: club.reviews_count,
          base_hourly_rate: club.base_hourly_rate,
          commission_rate_percent: club.commission_rate_percent,
          commission_type: club.commission_type,
          location_city: club.location_city,
          location_region: club.location_region
        }
      : null;

    const supports_quick = !!job.supports_quick_application;
    const application_options = {
      supports_quick_application: supports_quick,
      supports_full_application: true,
      default_application_type: supports_quick ? 'quick' : 'full'
    };

    return {
      job: jobDetail,
      club_summary,
      application_options
    };
  }

  // submitJobApplication
  submitJobApplication(
    job_id,
    application_type,
    stage_name,
    email,
    years_experience,
    experience_range,
    availability_description,
    motivation_text
  ) {
    const jobs = this._getFromStorage('job_positions');
    const job = jobs.find((j) => j.id === job_id) || null;
    if (!job) {
      return {
        success: false,
        application_id: null,
        status: 'error',
        message: 'Job not found'
      };
    }

    const applications = this._getFromStorage('job_applications');
    const id = this._generateId('jobapp');
    const now = this._nowISO();

    const appRecord = {
      id,
      job_id,
      stage_name,
      email,
      years_experience,
      experience_range: experience_range || null,
      availability_text: availability_description || null,
      motivation_text: motivation_text || null,
      application_type: application_type === 'full' ? 'full' : 'quick',
      status: 'submitted',
      submitted_at: now,
      created_at: now,
      updated_at: now
    };

    applications.push(appRecord);
    this._saveToStorage('job_applications', applications);

    return {
      success: true,
      application_id: id,
      status: 'submitted',
      message: 'Application submitted'
    };
  }

  // getClubSearchFilterOptions
  getClubSearchFilterOptions() {
    const rating_min_options = [3, 3.5, 4, 4.5, 5];
    const base_hourly_rate_min_options = [40, 50, 60, 70, 80, 100];

    const commission_rate_options = [
      { percent: 10, label: '10% commission' },
      { percent: 15, label: '15% commission' },
      { percent: 20, label: '20% commission' },
      { percent: 25, label: '25% commission' }
    ];

    const commission_type_options = [
      { value: 'percentage', label: 'Percentage' },
      { value: 'flat_fee', label: 'Flat fee' },
      { value: 'none', label: 'No commission' }
    ];

    const feature_filters = {
      private_rooms_label: 'Private rooms',
      no_house_fee_label: 'No house fee',
      transportation_support_label: 'Transportation or parking support'
    };

    const closing_time_friday_options = [
      { value: 'after_3am', label: 'Closes after 3:00 AM' },
      { value: 'before_3am', label: 'Closes by 3:00 AM' }
    ];

    const audition_bonus_min_options = [50, 100, 150, 200, 300];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating – High to Low' },
      { value: 'base_hourly_rate_desc', label: 'Base pay – High to Low' },
      { value: 'distance_asc', label: 'Distance – Closest first' },
      { value: 'audition_bonus_desc', label: 'Audition bonus – High to Low' }
    ];

    return {
      rating_min_options,
      base_hourly_rate_min_options,
      commission_rate_options,
      commission_type_options,
      feature_filters,
      closing_time_friday_options,
      audition_bonus_min_options,
      sort_options
    };
  }

  // searchClubs
  searchClubs(
    location_query,
    max_distance_miles,
    min_base_hourly_rate,
    min_rating,
    commission_rate_percent,
    commission_type,
    has_private_rooms,
    has_no_house_fee,
    requires_transportation_support,
    closes_after_3am_friday,
    min_audition_bonus_amount,
    accepts_auditions_only,
    sort_by,
    page,
    page_size
  ) {
    const clubs = this._getFromStorage('clubs');

    let filtered = clubs.slice();

    if (location_query && typeof location_query === 'string') {
      const q = location_query.toLowerCase();
      filtered = filtered.filter((club) => {
        const parts = [club.location_city, club.location_region, club.address]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        return parts.some((p) => p.indexOf(q) !== -1);
      });
    }

    // Note: Club entity does not have distance_miles; we cannot filter precisely by distance.
    // We therefore ignore max_distance_miles here to avoid mocking distance data.

    if (typeof min_base_hourly_rate === 'number') {
      filtered = filtered.filter((club) => club.base_hourly_rate >= min_base_hourly_rate);
    }

    if (typeof min_rating === 'number') {
      filtered = filtered.filter((club) => club.rating_overall >= min_rating);
    }

    if (typeof commission_rate_percent === 'number') {
      filtered = filtered.filter(
        (club) => club.commission_rate_percent === commission_rate_percent
      );
    }

    if (commission_type) {
      filtered = filtered.filter((club) => club.commission_type === commission_type);
    }

    if (has_private_rooms) {
      filtered = filtered.filter((club) => !!club.has_private_rooms);
    }

    if (has_no_house_fee) {
      filtered = filtered.filter((club) => !!club.has_no_house_fee);
    }

    if (requires_transportation_support) {
      filtered = filtered.filter((club) => !!club.offers_transportation_support);
    }

    if (typeof closes_after_3am_friday === 'boolean') {
      filtered = filtered.filter(
        (club) => !!club.closes_after_3am_friday === closes_after_3am_friday
      );
    }

    if (typeof min_audition_bonus_amount === 'number') {
      filtered = filtered.filter(
        (club) => club.audition_bonus_amount >= min_audition_bonus_amount
      );
    }

    if (accepts_auditions_only) {
      filtered = filtered.filter((club) => !!club.accepts_auditions);
    }

    const sortMode = sort_by || 'rating_desc';
    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'base_hourly_rate_desc':
          return (b.base_hourly_rate || 0) - (a.base_hourly_rate || 0);
        case 'distance_asc':
          // No distance data on Club; keep original order
          return 0;
        case 'audition_bonus_desc':
          return (b.audition_bonus_amount || 0) - (a.audition_bonus_amount || 0);
        case 'rating_desc':
        default:
          return (b.rating_overall || 0) - (a.rating_overall || 0);
      }
    });

    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_count = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end);

    const results = paged.map((club) => {
      return {
        club_id: club.id,
        name: club.name,
        description: club.description,
        location_city: club.location_city,
        location_region: club.location_region,
        base_hourly_rate: club.base_hourly_rate,
        base_hourly_rate_formatted: this._formatCurrency(club.base_hourly_rate),
        commission_rate_percent: club.commission_rate_percent,
        commission_type: club.commission_type,
        rating_overall: club.rating_overall,
        reviews_count: club.reviews_count,
        has_private_rooms: club.has_private_rooms,
        has_no_house_fee: club.has_no_house_fee,
        offers_transportation_support: club.offers_transportation_support,
        closing_time_friday: club.closing_time_friday,
        closes_after_3am_friday: club.closes_after_3am_friday,
        audition_bonus_amount: club.audition_bonus_amount,
        accepts_auditions: club.accepts_auditions,
        distance_miles: null,
        distance_label: '',
        // Foreign key resolution is trivial here (club itself).
        club
      };
    });

    return {
      results,
      total_count,
      page: pageNum,
      page_size: size
    };
  }

  // getClubDetail
  getClubDetail(club_id) {
    const clubs = this._getFromStorage('clubs');
    const favoritesLists = this._getFromStorage('favorites_lists');
    const favoriteItems = this._getFromStorage('favorite_list_items');

    const club = clubs.find((c) => c.id === club_id) || null;
    if (!club) {
      return {
        club: null,
        is_favorited: false,
        favorite_list_names: []
      };
    }

    const itemsForClub = favoriteItems.filter((item) => item.club_id === club_id);
    const listIds = itemsForClub.map((item) => item.list_id);
    const listNames = favoritesLists
      .filter((list) => listIds.indexOf(list.id) !== -1)
      .map((list) => list.name);

    return {
      club: {
        id: club.id,
        name: club.name,
        description: club.description,
        location_city: club.location_city,
        location_region: club.location_region,
        address: club.address,
        base_hourly_rate: club.base_hourly_rate,
        commission_rate_percent: club.commission_rate_percent,
        commission_type: club.commission_type,
        rating_overall: club.rating_overall,
        reviews_count: club.reviews_count,
        has_private_rooms: club.has_private_rooms,
        has_no_house_fee: club.has_no_house_fee,
        offers_transportation_support: club.offers_transportation_support,
        closing_time_friday: club.closing_time_friday,
        closes_after_3am_friday: club.closes_after_3am_friday,
        audition_bonus_amount: club.audition_bonus_amount,
        accepts_auditions: club.accepts_auditions,
        earnings_calculator_enabled: club.earnings_calculator_enabled,
        default_audition_slot_length_minutes: club.default_audition_slot_length_minutes
      },
      is_favorited: itemsForClub.length > 0,
      favorite_list_names: listNames
    };
  }

  // getAvailableAuditionSlots
  getAvailableAuditionSlots(club_id, date) {
    const slots = this._getFromStorage('audition_slots');
    const clubs = this._getFromStorage('clubs');
    const club = clubs.find((c) => c.id === club_id) || null;

    const targetDate = date;

    const filteredSlots = slots.filter((slot) => {
      if (slot.club_id !== club_id) return false;
      if (slot.is_booked) return false;
      const start = new Date(slot.start_datetime);
      if (isNaN(start.getTime())) return false;
      const year = String(start.getFullYear());
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      const ymd = year + '-' + month + '-' + day;
      return ymd === targetDate;
    });

    const slotsResult = filteredSlots.map((slot) => {
      const start = new Date(slot.start_datetime);
      const end = new Date(slot.end_datetime);
      const display_time_range =
        this._formatTimeRange(start, end) || (slot.start_datetime + ' - ' + slot.end_datetime);
      return {
        audition_slot_id: slot.id,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        is_booked: slot.is_booked,
        display_time_range,
        // Foreign key resolution
        audition_slot: slot
      };
    });

    return {
      club_id,
      date: targetDate,
      slots: slotsResult,
      club
    };
  }

  _formatTimeRange(start, end) {
    if (!(start instanceof Date) || isNaN(start.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const startLabel = pad(start.getHours()) + ':' + pad(start.getMinutes());
    let endLabel = '';
    if (end instanceof Date && !isNaN(end.getTime())) {
      endLabel = pad(end.getHours()) + ':' + pad(end.getMinutes());
    }
    return endLabel ? startLabel + '–' + endLabel : startLabel;
  }

  // bookAuditionSlot
  bookAuditionSlot(audition_slot_id, candidate_name, email) {
    const slots = this._getFromStorage('audition_slots');
    const clubs = this._getFromStorage('clubs');
    const bookings = this._getFromStorage('audition_bookings');

    const slot = slots.find((s) => s.id === audition_slot_id) || null;
    if (!slot) {
      return {
        success: false,
        booking_id: null,
        club_id: null,
        club_name: '',
        start_datetime: null,
        end_datetime: null,
        status: 'error',
        message: 'Audition slot not found'
      };
    }
    if (slot.is_booked) {
      const clubExisting = clubs.find((c) => c.id === slot.club_id) || null;
      return {
        success: false,
        booking_id: null,
        club_id: slot.club_id,
        club_name: clubExisting ? clubExisting.name : '',
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        status: 'error',
        message: 'Audition slot is already booked'
      };
    }

    const club = clubs.find((c) => c.id === slot.club_id) || null;
    const now = this._nowISO();
    const booking_id = this._generateId('audition');

    const booking = {
      id: booking_id,
      club_id: slot.club_id,
      audition_slot_id: slot.id,
      candidate_name,
      email,
      status: 'booked',
      booked_at: now,
      updated_at: now
    };

    bookings.push(booking);

    // Mark slot as booked
    slot.is_booked = true;

    this._saveToStorage('audition_bookings', bookings);
    this._saveToStorage('audition_slots', slots);

    return {
      success: true,
      booking_id,
      club_id: slot.club_id,
      club_name: club ? club.name : '',
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      status: 'booked',
      message: 'Audition booked'
    };
  }

  // searchAuditionClubs
  searchAuditionClubs(
    has_private_rooms,
    has_no_house_fee,
    target_date,
    time_window_start,
    time_window_end,
    page,
    page_size
  ) {
    const clubs = this._getFromStorage('clubs');
    const slots = this._getFromStorage('audition_slots');

    let filteredClubs = clubs.filter((c) => c.accepts_auditions);

    if (has_private_rooms) {
      filteredClubs = filteredClubs.filter((c) => !!c.has_private_rooms);
    }

    if (has_no_house_fee) {
      filteredClubs = filteredClubs.filter((c) => !!c.has_no_house_fee);
    }

    const startMinutes = this._parseTimeToMinutes(time_window_start);
    const endMinutes = this._parseTimeToMinutes(time_window_end);

    // Filter clubs by slot availability
    const clubHasMatchingSlot = (club) => {
      const clubSlots = slots.filter((s) => s.club_id === club.id && !s.is_booked);
      if (!target_date && startMinutes == null && endMinutes == null) {
        return clubSlots.length > 0;
      }
      return clubSlots.some((slot) => {
        const start = new Date(slot.start_datetime);
        if (isNaN(start.getTime())) return false;
        const year = String(start.getFullYear());
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const day = String(start.getDate()).padStart(2, '0');
        const slotDate = year + '-' + month + '-' + day;
        if (target_date && slotDate !== target_date) return false;

        if (startMinutes != null || endMinutes != null) {
          const minutes = start.getUTCHours() * 60 + start.getUTCMinutes();
          if (startMinutes != null && minutes < startMinutes) return false;
          if (endMinutes != null && minutes > endMinutes) return false;
        }
        return true;
      });
    };

    filteredClubs = filteredClubs.filter(clubHasMatchingSlot);

    const results = filteredClubs.map((club) => {
      const clubSlots = slots.filter((s) => s.club_id === club.id && !s.is_booked);
      let nextSlot = null;
      if (clubSlots.length > 0) {
        nextSlot = clubSlots
          .slice()
          .sort(
            (a, b) =>
              new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          )[0];
      }
      return {
        club_id: club.id,
        name: club.name,
        location_city: club.location_city,
        base_hourly_rate: club.base_hourly_rate,
        rating_overall: club.rating_overall,
        has_private_rooms: club.has_private_rooms,
        has_no_house_fee: club.has_no_house_fee,
        audition_bonus_amount: club.audition_bonus_amount,
        next_available_audition_datetime: nextSlot ? nextSlot.start_datetime : null,
        club
      };
    });

    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_count = results.length;
    const start = (pageNum - 1) * size;
    const end = start + size;

    return {
      results: results.slice(start, end),
      total_count
    };
  }

  // calculateEarningsPreview
  calculateEarningsPreview(
    club_id,
    base_hourly_rate,
    shifts_per_week,
    tips_per_shift,
    average_shift_length_hours
  ) {
    const clubs = this._getFromStorage('clubs');
    const club = clubs.find((c) => c.id === club_id) || null;
    const calc = this._calculateWeeklyEarningsAfterCommission(
      club,
      base_hourly_rate,
      shifts_per_week,
      tips_per_shift,
      average_shift_length_hours
    );
    return calc;
  }

  // saveEarningsEstimate
  saveEarningsEstimate(
    club_id,
    base_hourly_rate,
    shifts_per_week,
    tips_per_shift,
    average_shift_length_hours,
    label
  ) {
    const clubs = this._getFromStorage('clubs');
    const club = clubs.find((c) => c.id === club_id) || null;
    const calculations = this._calculateWeeklyEarningsAfterCommission(
      club,
      base_hourly_rate,
      shifts_per_week,
      tips_per_shift,
      average_shift_length_hours
    );

    const estimates = this._getFromStorage('earnings_estimates');
    const id = this._generateId('earn');
    const now = this._nowISO();

    const record = {
      id,
      club_id,
      base_hourly_rate,
      shifts_per_week,
      tips_per_shift,
      average_shift_length_hours,
      weekly_income_estimate: calculations.weekly_income_after_commission,
      label: label || null,
      saved_to_profile: true,
      created_at: now
    };

    estimates.push(record);
    this._saveToStorage('earnings_estimates', estimates);

    return {
      success: true,
      estimate_id: id,
      weekly_income_estimate: record.weekly_income_estimate,
      saved_to_profile: true
    };
  }

  // getSavedEarningsEstimates
  getSavedEarningsEstimates() {
    const estimates = this._getFromStorage('earnings_estimates');
    const clubs = this._getFromStorage('clubs');

    return estimates.map((e) => {
      const club = clubs.find((c) => c.id === e.club_id) || null;
      return {
        estimate_id: e.id,
        club_id: e.club_id,
        club_name: club ? club.name : '',
        base_hourly_rate: e.base_hourly_rate,
        shifts_per_week: e.shifts_per_week,
        tips_per_shift: e.tips_per_shift,
        average_shift_length_hours: e.average_shift_length_hours,
        weekly_income_estimate: e.weekly_income_estimate,
        label: e.label,
        created_at: e.created_at,
        club
      };
    });
  }

  // getWorkshopFilterOptions
  getWorkshopFilterOptions() {
    const skill_levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const price_max_options = [25, 50, 75, 100, 150, 200];

    const date_range_presets = [
      { value: 'next_7_days', label: 'Next 7 days' },
      { value: 'next_30_days', label: 'Next 30 days' }
    ];

    const sort_options = [
      { value: 'start_date_asc', label: 'Start date – Soonest first' },
      { value: 'price_asc', label: 'Price – Low to High' },
      { value: 'popularity_desc', label: 'Popularity' }
    ];

    return {
      skill_levels,
      price_max_options,
      date_range_presets,
      sort_options
    };
  }

  // searchWorkshops
  searchWorkshops(
    skill_level,
    start_date_min,
    start_date_max,
    max_price,
    sort_by,
    page,
    page_size
  ) {
    const workshops = this._getFromStorage('workshops');

    let filtered = workshops.filter((w) => w.is_active);

    if (skill_level) {
      filtered = filtered.filter((w) => w.skill_level === skill_level);
    }

    if (start_date_min) {
      const minDate = new Date(start_date_min);
      filtered = filtered.filter((w) => {
        const start = new Date(w.start_datetime);
        return !isNaN(start.getTime()) && start >= minDate;
      });
    }

    if (start_date_max) {
      const maxDate = new Date(start_date_max);
      filtered = filtered.filter((w) => {
        const start = new Date(w.start_datetime);
        return !isNaN(start.getTime()) && start <= maxDate;
      });
    }

    if (typeof max_price === 'number') {
      filtered = filtered.filter((w) => w.price <= max_price);
    }

    const sortMode = sort_by || 'start_date_asc';
    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'popularity_desc':
          // No popularity metric available; fall back to soonest first
          return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
        case 'start_date_asc':
        default:
          return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
      }
    });

    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_count = filtered.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;

    const results = filtered.slice(startIdx, endIdx).map((w) => ({
      workshop_id: w.id,
      title: w.title,
      description: w.description,
      skill_level: w.skill_level,
      start_datetime: w.start_datetime,
      start_date_label: this._formatDateLabel(w.start_datetime),
      price: w.price,
      price_formatted: this._formatCurrency(w.price),
      location_type: w.location_type,
      workshop: w
    }));

    return {
      results,
      total_count
    };
  }

  // getWorkshopDetail
  getWorkshopDetail(workshop_id) {
    const workshops = this._getFromStorage('workshops');
    const w = workshops.find((x) => x.id === workshop_id) || null;
    if (!w) {
      return { workshop: null };
    }
    return {
      workshop: {
        id: w.id,
        title: w.title,
        description: w.description,
        skill_level: w.skill_level,
        start_datetime: w.start_datetime,
        end_datetime: w.end_datetime,
        start_date_label: this._formatDateLabel(w.start_datetime),
        price: w.price,
        price_formatted: this._formatCurrency(w.price),
        location_type: w.location_type,
        location_city: w.location_city
      }
    };
  }

  // enrollInWorkshop
  enrollInWorkshop(workshop_id, participant_name, email) {
    const workshops = this._getFromStorage('workshops');
    const workshop = workshops.find((w) => w.id === workshop_id) || null;
    if (!workshop) {
      return {
        success: false,
        enrollment_id: null,
        status: 'error',
        message: 'Workshop not found'
      };
    }

    const enrollments = this._getFromStorage('workshop_enrollments');
    const id = this._generateId('ws_enroll');
    const now = this._nowISO();

    const record = {
      id,
      workshop_id,
      participant_name,
      email,
      status: 'confirmed',
      enrolled_at: now,
      updated_at: now
    };

    enrollments.push(record);
    this._saveToStorage('workshop_enrollments', enrollments);

    return {
      success: true,
      enrollment_id: id,
      status: 'confirmed',
      message: 'Enrollment confirmed'
    };
  }

  // getMessageThreadsList
  getMessageThreadsList() {
    const threads = this._getFromStorage('message_threads');
    const clubs = this._getFromStorage('clubs');

    return threads.map((t) => {
      const club = clubs.find((c) => c.id === t.club_id) || null;
      return {
        thread_id: t.id,
        club_id: t.club_id,
        club_name: club ? club.name : '',
        subject: t.subject,
        topic: t.topic,
        last_message_preview: t.last_message_preview,
        unread_recruiter_messages_count: t.unread_recruiter_messages_count,
        updated_at: t.updated_at,
        club
      };
    });
  }

  // getThreadMessages
  getThreadMessages(thread_id) {
    const threads = this._getFromStorage('message_threads');
    const messages = this._getFromStorage('messages');
    const clubs = this._getFromStorage('clubs');

    const thread = threads.find((t) => t.id === thread_id) || null;
    if (!thread) {
      return {
        thread: null,
        messages: []
      };
    }

    const club = clubs.find((c) => c.id === thread.club_id) || null;

    const threadSummary = {
      thread_id: thread.id,
      club_id: thread.club_id,
      club_name: club ? club.name : '',
      subject: thread.subject,
      topic: thread.topic,
      club
    };

    const threadMessages = messages
      .filter((m) => m.thread_id === thread_id)
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
      .map((m) => ({
        message_id: m.id,
        sender_type: m.sender_type,
        body: m.body,
        sent_at: m.sent_at,
        is_read: m.is_read
      }));

    return {
      thread: threadSummary,
      messages: threadMessages
    };
  }

  // sendNewMessageToRecruiter
  sendNewMessageToRecruiter(club_id, subject, topic, body) {
    const clubs = this._getFromStorage('clubs');
    const club = clubs.find((c) => c.id === club_id) || null;
    if (!club) {
      return {
        success: false,
        thread_id: null,
        message_id: null,
        created_new_thread: false
      };
    }

    const threads = this._getFromStorage('message_threads');
    const messages = this._getFromStorage('messages');

    const now = this._nowISO();
    const thread_id = this._generateId('thread');
    const message_id = this._generateId('msg');

    const threadRecord = {
      id: thread_id,
      club_id,
      subject,
      topic: topic || 'general_questions',
      last_message_preview: body.slice(0, 200),
      unread_recruiter_messages_count: 0,
      created_at: now,
      updated_at: now
    };

    const messageRecord = {
      id: message_id,
      thread_id,
      sender_type: 'candidate',
      body,
      sent_at: now,
      is_read: false
    };

    threads.push(threadRecord);
    messages.push(messageRecord);

    this._saveToStorage('message_threads', threads);
    this._saveToStorage('messages', messages);

    return {
      success: true,
      thread_id,
      message_id,
      created_new_thread: true
    };
  }

  // sendMessageReply
  sendMessageReply(thread_id, body) {
    const threads = this._getFromStorage('message_threads');
    const messages = this._getFromStorage('messages');

    const thread = threads.find((t) => t.id === thread_id) || null;
    if (!thread) {
      return {
        success: false,
        message_id: null
      };
    }

    const now = this._nowISO();
    const message_id = this._generateId('msg');

    const messageRecord = {
      id: message_id,
      thread_id,
      sender_type: 'candidate',
      body,
      sent_at: now,
      is_read: false
    };

    messages.push(messageRecord);

    thread.last_message_preview = body.slice(0, 200);
    thread.updated_at = now;

    this._saveToStorage('message_threads', threads);
    this._saveToStorage('messages', messages);

    return {
      success: true,
      message_id
    };
  }

  // getCandidateProfile
  getCandidateProfile() {
    const profiles = this._getFromStorage('candidate_profiles');
    const profile = profiles[0] || null;

    if (!profile) {
      return {
        exists: false,
        profile: null
      };
    }

    const availability_days = [];
    if (profile.availability_monday) availability_days.push('monday');
    if (profile.availability_tuesday) availability_days.push('tuesday');
    if (profile.availability_wednesday) availability_days.push('wednesday');
    if (profile.availability_thursday) availability_days.push('thursday');
    if (profile.availability_friday) availability_days.push('friday');
    if (profile.availability_saturday) availability_days.push('saturday');
    if (profile.availability_sunday) availability_days.push('sunday');

    const preferred_music_styles = [];
    if (profile.prefers_music_rnb) preferred_music_styles.push('rnb');
    if (profile.prefers_music_hip_hop) preferred_music_styles.push('hip_hop');
    if (profile.prefers_music_pop) preferred_music_styles.push('pop');
    if (profile.prefers_music_edm) preferred_music_styles.push('edm');
    if (profile.prefers_music_rock) preferred_music_styles.push('rock');
    if (profile.prefers_music_latin) preferred_music_styles.push('latin');
    if (profile.prefers_music_other) preferred_music_styles.push('other');

    return {
      exists: true,
      profile: {
        stage_name: profile.stage_name,
        years_experience: profile.years_experience,
        experience_range: profile.experience_range,
        availability_days,
        preferred_shift_time: profile.preferred_shift_time,
        preferred_music_styles,
        travel_preference: profile.travel_preference
      }
    };
  }

  // saveCandidateProfile
  saveCandidateProfile(
    stage_name,
    years_experience,
    experience_range,
    availability_days,
    preferred_shift_time,
    preferred_music_styles,
    travel_preference
  ) {
    const { profiles, profile } = this._getOrCreateCandidateProfileRecord();

    profile.stage_name = stage_name;
    profile.years_experience = years_experience;
    profile.experience_range = experience_range || profile.experience_range;

    // Reset availability
    profile.availability_monday = false;
    profile.availability_tuesday = false;
    profile.availability_wednesday = false;
    profile.availability_thursday = false;
    profile.availability_friday = false;
    profile.availability_saturday = false;
    profile.availability_sunday = false;

    (availability_days || []).forEach((d) => {
      switch (d) {
        case 'monday':
          profile.availability_monday = true;
          break;
        case 'tuesday':
          profile.availability_tuesday = true;
          break;
        case 'wednesday':
          profile.availability_wednesday = true;
          break;
        case 'thursday':
          profile.availability_thursday = true;
          break;
        case 'friday':
          profile.availability_friday = true;
          break;
        case 'saturday':
          profile.availability_saturday = true;
          break;
        case 'sunday':
          profile.availability_sunday = true;
          break;
      }
    });

    profile.preferred_shift_time = preferred_shift_time;

    // Reset music preferences
    profile.prefers_music_rnb = false;
    profile.prefers_music_hip_hop = false;
    profile.prefers_music_pop = false;
    profile.prefers_music_edm = false;
    profile.prefers_music_rock = false;
    profile.prefers_music_latin = false;
    profile.prefers_music_other = false;

    (preferred_music_styles || []).forEach((style) => {
      switch (style) {
        case 'rnb':
          profile.prefers_music_rnb = true;
          break;
        case 'hip_hop':
          profile.prefers_music_hip_hop = true;
          break;
        case 'pop':
          profile.prefers_music_pop = true;
          break;
        case 'edm':
          profile.prefers_music_edm = true;
          break;
        case 'rock':
          profile.prefers_music_rock = true;
          break;
        case 'latin':
          profile.prefers_music_latin = true;
          break;
        case 'other':
          profile.prefers_music_other = true;
          break;
      }
    });

    profile.travel_preference = travel_preference;
    profile.updated_at = this._nowISO();

    this._saveToStorage('candidate_profiles', profiles);

    // Build response shape
    const availability_days_out = [];
    if (profile.availability_monday) availability_days_out.push('monday');
    if (profile.availability_tuesday) availability_days_out.push('tuesday');
    if (profile.availability_wednesday) availability_days_out.push('wednesday');
    if (profile.availability_thursday) availability_days_out.push('thursday');
    if (profile.availability_friday) availability_days_out.push('friday');
    if (profile.availability_saturday) availability_days_out.push('saturday');
    if (profile.availability_sunday) availability_days_out.push('sunday');

    const preferred_music_styles_out = [];
    if (profile.prefers_music_rnb) preferred_music_styles_out.push('rnb');
    if (profile.prefers_music_hip_hop) preferred_music_styles_out.push('hip_hop');
    if (profile.prefers_music_pop) preferred_music_styles_out.push('pop');
    if (profile.prefers_music_edm) preferred_music_styles_out.push('edm');
    if (profile.prefers_music_rock) preferred_music_styles_out.push('rock');
    if (profile.prefers_music_latin) preferred_music_styles_out.push('latin');
    if (profile.prefers_music_other) preferred_music_styles_out.push('other');

    return {
      success: true,
      profile: {
        stage_name: profile.stage_name,
        years_experience: profile.years_experience,
        experience_range: profile.experience_range,
        availability_days: availability_days_out,
        preferred_shift_time: profile.preferred_shift_time,
        preferred_music_styles: preferred_music_styles_out,
        travel_preference: profile.travel_preference
      }
    };
  }

  // getFavoritesOverview
  getFavoritesOverview() {
    const lists = this._getFromStorage('favorites_lists');
    const items = this._getFromStorage('favorite_list_items');
    const clubs = this._getFromStorage('clubs');

    const resultLists = lists.map((list) => {
      const listItems = items.filter((i) => i.list_id === list.id);
      const clubsForList = listItems.map((item) => {
        const club = clubs.find((c) => c.id === item.club_id) || null;
        return {
          favorite_item_id: item.id,
          club_id: item.club_id,
          club_name: club ? club.name : '',
          rating_overall: club ? club.rating_overall : null,
          reviews_count: club ? club.reviews_count : null,
          base_hourly_rate: club ? club.base_hourly_rate : null,
          audition_bonus_amount: club ? club.audition_bonus_amount : null,
          closing_time_friday: club ? club.closing_time_friday : null,
          club
        };
      });

      return {
        list_id: list.id,
        name: list.name,
        is_default: list.is_default,
        clubs: clubsForList
      };
    });

    return { lists: resultLists };
  }

  // createFavoritesList
  createFavoritesList(name, is_default) {
    const lists = this._getFromStorage('favorites_lists');
    const now = this._nowISO();
    const id = this._generateId('favlist');

    const listRecord = {
      id,
      name,
      is_default: !!is_default,
      created_at: now,
      updated_at: now
    };

    if (is_default) {
      // Ensure only one default
      lists.forEach((l) => {
        if (l.is_default) l.is_default = false;
      });
    }

    lists.push(listRecord);
    this._saveToStorage('favorites_lists', lists);

    return {
      success: true,
      list_id: id,
      is_default: !!is_default
    };
  }

  // renameFavoritesList
  renameFavoritesList(list_id, new_name) {
    const lists = this._getFromStorage('favorites_lists');
    const list = lists.find((l) => l.id === list_id) || null;
    if (!list) {
      return { success: false };
    }
    list.name = new_name;
    list.updated_at = this._nowISO();
    this._saveToStorage('favorites_lists', lists);
    return { success: true };
  }

  // deleteFavoritesList
  deleteFavoritesList(list_id, delete_clubs_from_favorites, move_clubs_to_list_id) {
    let lists = this._getFromStorage('favorites_lists');
    let items = this._getFromStorage('favorite_list_items');

    const list = lists.find((l) => l.id === list_id) || null;
    if (!list) {
      return { success: false, message: 'List not found' };
    }

    if (delete_clubs_from_favorites) {
      items = items.filter((i) => i.list_id !== list_id);
    } else if (move_clubs_to_list_id) {
      const target = lists.find((l) => l.id === move_clubs_to_list_id) || null;
      if (!target) {
        return { success: false, message: 'Target list not found' };
      }
      items.forEach((i) => {
        if (i.list_id === list_id) {
          i.list_id = move_clubs_to_list_id;
        }
      });
    }

    lists = lists.filter((l) => l.id !== list_id);

    this._saveToStorage('favorites_lists', lists);
    this._saveToStorage('favorite_list_items', items);

    return { success: true, message: 'List deleted' };
  }

  // addClubToFavorites
  addClubToFavorites(club_id, list_id, new_list_name, make_new_list_default) {
    const clubs = this._getFromStorage('clubs');
    const club = clubs.find((c) => c.id === club_id) || null;
    if (!club) {
      return {
        success: false,
        favorite_item_id: null,
        list_id: null,
        created_new_list: false
      };
    }

    let lists = this._getFromStorage('favorites_lists');
    let usedListId = list_id || null;
    let created_new_list = false;

    if (!usedListId) {
      if (new_list_name) {
        const createResult = this.createFavoritesList(
          new_list_name,
          !!make_new_list_default
        );
        usedListId = createResult.list_id;
        lists = this._getFromStorage('favorites_lists');
        created_new_list = true;
      } else {
        const helper = this._getOrCreateDefaultFavoritesList();
        lists = helper.lists;
        usedListId = helper.defaultList.id;
        created_new_list = !helper.defaultList; // though helper always returns one
      }
    }

    const items = this._getFromStorage('favorite_list_items');
    const now = this._nowISO();
    const favorite_item_id = this._generateId('favitem');

    const record = {
      id: favorite_item_id,
      list_id: usedListId,
      club_id,
      added_at: now
    };

    items.push(record);
    this._saveToStorage('favorite_list_items', items);

    return {
      success: true,
      favorite_item_id,
      list_id: usedListId,
      created_new_list
    };
  }

  // moveFavoriteClubToList
  moveFavoriteClubToList(favorite_item_id, target_list_id) {
    const items = this._getFromStorage('favorite_list_items');
    const lists = this._getFromStorage('favorites_lists');

    const item = items.find((i) => i.id === favorite_item_id) || null;
    if (!item) {
      return { success: false };
    }

    const targetList = lists.find((l) => l.id === target_list_id) || null;
    if (!targetList) {
      return { success: false };
    }

    item.list_id = target_list_id;
    this._saveToStorage('favorite_list_items', items);

    return { success: true };
  }

  // removeClubFromFavorites
  removeClubFromFavorites(favorite_item_id) {
    let items = this._getFromStorage('favorite_list_items');
    const before = items.length;
    items = items.filter((i) => i.id !== favorite_item_id);
    this._saveToStorage('favorite_list_items', items);
    return { success: items.length < before };
  }

  // getStaticPageContent
  getStaticPageContent(page_key) {
    const pages = this._getObjectFromStorage('static_pages', {});
    const entry = pages[page_key];
    if (!entry) {
      return {
        title: '',
        sections: []
      };
    }
    return {
      title: entry.title || '',
      sections: Array.isArray(entry.sections) ? entry.sections : []
    };
  }

  // getHelpFaqEntries
  getHelpFaqEntries() {
    const faqs = this._getFromStorage('help_faq_entries');
    return faqs.map((f) => ({
      faq_id: f.faq_id || f.id || this._generateId('faq'),
      question: f.question,
      answer_html: f.answer_html,
      related_pages: f.related_pages || [],
      related_tasks: f.related_tasks || []
    }));
  }

  // getContactInfo
  getContactInfo() {
    const info = this._getObjectFromStorage('contact_info', {
      support_email: '',
      business_address: '',
      response_time_estimate: '',
      show_recruiter_messaging_hint: true
    });
    return info;
  }

  // submitContactRequest
  submitContactRequest(name, email, subject, category, body) {
    const requests = this._getFromStorage('contact_requests');
    const ticket_id = this._generateId('ticket');
    const now = this._nowISO();

    const record = {
      id: ticket_id,
      name,
      email,
      subject,
      category: category || 'other',
      body,
      created_at: now
    };

    requests.push(record);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      ticket_id,
      message: 'Request submitted'
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