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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all entity tables as empty arrays if they do not exist
    const arrayKeys = [
      'courses',
      'class_enrollments',
      'membership_plans',
      'membership_subscriptions',
      'events',
      'scheduled_events',
      'photos',
      'favorite_photos',
      'photo_collections',
      'photo_collection_items',
      'resource_articles',
      'camera_models',
      'article_gear_recommendations',
      'gear_wishlist_items',
      'forum_categories',
      'forum_profiles',
      'forum_topics',
      'meetings',
      'notes',
      'newsletter_topics',
      'communication_profiles',
      'mentor_profiles',
      'mentorship_requests'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    // Generic config-like entries
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Optional site-wide content; kept minimal and editable via localStorage
    if (!localStorage.getItem('about_content')) {
      const about = {
        title: 'About Our Photography Club',
        body: 'Welcome to our community photography club.',
        leadership: []
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('contact_info')) {
      const contact = {
        email: '',
        phone: '',
        address: '',
        social_links: []
      };
      localStorage.setItem('contact_info', JSON.stringify(contact));
    }

    if (!localStorage.getItem('club_address')) {
      localStorage.setItem('club_address', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
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

  // Generic relation resolver (used where convenient)
  // relationConfigs: [{ localKey, foreignCollectionKey, foreignIdKey, as }]
  _resolveEntityRelations(items, relationConfigs) {
    if (!Array.isArray(items) || !Array.isArray(relationConfigs) || relationConfigs.length === 0) {
      return items;
    }

    const cache = {};

    const getCollection = (key) => {
      if (!cache[key]) {
        cache[key] = this._getFromStorage(key);
      }
      return cache[key];
    };

    return items.map((item) => {
      let result = { ...item };
      for (const cfg of relationConfigs) {
        const localVal = item[cfg.localKey];
        if (localVal == null) {
          result[cfg.as] = null;
          continue;
        }
        const collection = getCollection(cfg.foreignCollectionKey);
        const found = collection.find((f) => f[cfg.foreignIdKey || 'id'] === localVal) || null;
        result[cfg.as] = found;
      }
      return result;
    });
  }

  // Helper: single-user schedule abstraction (wraps scheduled_events array)
  _getOrCreateUserSchedule() {
    // For a single-user site, scheduled_events array itself is the schedule.
    // Ensure it exists via _initStorage, then just return it.
    return this._getFromStorage('scheduled_events');
  }

  // Helper: communication profile (single user)
  _getOrCreateCommunicationProfile(ensureExists, defaults) {
    let profiles = this._getFromStorage('communication_profiles');
    if (profiles.length > 0) {
      return profiles[0];
    }
    if (!ensureExists) {
      return null;
    }
    const profile = {
      id: this._generateId('comm'),
      full_name: defaults && defaults.full_name ? defaults.full_name : '',
      email: defaults && defaults.email ? defaults.email : '',
      email_frequency: defaults && defaults.email_frequency ? defaults.email_frequency : 'monthly_summary',
      topics: (defaults && defaults.topics) || [],
      preferred_format: (defaults && defaults.preferred_format) || 'highlights_only',
      is_subscribed: defaults && typeof defaults.is_subscribed === 'boolean' ? defaults.is_subscribed : true,
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };
    profiles.push(profile);
    this._saveToStorage('communication_profiles', profiles);
    return profile;
  }

  // Helper: forum profile (single user)
  _getOrCreateForumProfile(ensureExists) {
    let profiles = this._getFromStorage('forum_profiles');
    if (profiles.length > 0) {
      return profiles[0];
    }
    if (!ensureExists) {
      return null;
    }
    const profile = {
      id: this._generateId('forum_profile'),
      username: 'GuestUser',
      email: '',
      skill_level: 'all_levels',
      password: '',
      created_at: this._nowISO()
    };
    profiles.push(profile);
    this._saveToStorage('forum_profiles', profiles);
    return profile;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeOverview()
  getHomeOverview() {
    const now = new Date();

    const courses = this._getFromStorage('courses').filter((c) => c && c.is_published);
    const events = this._getFromStorage('events').filter((e) => e && e.is_published);
    const photos = this._getFromStorage('photos');
    const membershipPlans = this._getFromStorage('membership_plans').filter((p) => p && p.is_active);

    // Upcoming workshops
    const upcoming_workshops = courses
      .filter((c) => c.course_type === 'workshop')
      .filter((c) => {
        const d = this._parseDate(c.start_datetime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });

    // Upcoming events
    const upcoming_events = events
      .filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });

    // Featured photos: highest rated, newest first
    const featured_photos = [...photos].sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const da = this._parseDate(a.created_at) || new Date(0);
      const db = this._parseDate(b.created_at) || new Date(0);
      return db - da;
    });

    // Highlighted membership plans: by sort_order then name
    const highlighted_membership_plans = [...membershipPlans].sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
      return (a.name || '').localeCompare(b.name || '');
    });

    return {
      upcoming_workshops,
      upcoming_events,
      featured_photos,
      highlighted_membership_plans
    };
  }

  // searchCourses(course_type, date_range_start, date_range_end, skill_levels, max_price, days_of_week, min_start_time, min_duration_weeks, sort_by, page, page_size)
  searchCourses(
    course_type,
    date_range_start,
    date_range_end,
    skill_levels,
    max_price,
    days_of_week,
    min_start_time,
    min_duration_weeks,
    sort_by,
    page,
    page_size
  ) {
    let results = this._getFromStorage('courses').filter((c) => c && c.is_published);

    if (course_type) {
      results = results.filter((c) => c.course_type === course_type);
    }

    if (date_range_start) {
      const start = new Date(date_range_start + 'T00:00:00Z');
      results = results.filter((c) => {
        const d = this._parseDate(c.start_datetime);
        return d && d >= start;
      });
    }

    if (date_range_end) {
      const end = new Date(date_range_end + 'T23:59:59Z');
      results = results.filter((c) => {
        const d = this._parseDate(c.start_datetime);
        return d && d <= end;
      });
    }

    if (Array.isArray(skill_levels) && skill_levels.length > 0) {
      results = results.filter((c) => {
        if (!c.skill_level) return false;
        if (skill_levels.includes(c.skill_level)) return true;
        // Include all_levels as matching any requested level
        if (c.skill_level === 'all_levels') return true;
        return false;
      });
    }

    if (typeof max_price === 'number') {
      results = results.filter((c) => typeof c.price === 'number' && c.price <= max_price);
    }

    if (Array.isArray(days_of_week) && days_of_week.length > 0) {
      results = results.filter((c) => !!c.day_of_week && days_of_week.includes(c.day_of_week));
    }

    if (min_start_time) {
      results = results.filter((c) => {
        if (!c.start_time) return false;
        // Times in HH:MM; string comparison works if zero-padded
        return c.start_time >= min_start_time;
      });
    }

    if (typeof min_duration_weeks === 'number') {
      results = results.filter((c) => typeof c.duration_weeks === 'number' && c.duration_weeks >= min_duration_weeks);
    }

    if (sort_by === 'start_date_asc') {
      results.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    } else if (sort_by === 'start_date_desc') {
      results.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return db - da;
      });
    } else if (sort_by === 'price_asc') {
      results.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    } else if (sort_by === 'price_desc') {
      results.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    }

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : results.length;
    const startIndex = (p - 1) * size;
    const endIndex = startIndex + size;

    return results.slice(startIndex, endIndex);
  }

  // getCourseDetail(courseId)
  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses');
    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) {
      return {
        course: null,
        is_full: true,
        spots_remaining: 0
      };
    }

    let is_full = false;
    let spots_remaining = null;

    if (typeof course.remaining_spots === 'number') {
      spots_remaining = course.remaining_spots;
      is_full = course.remaining_spots <= 0;
    } else if (typeof course.max_participants === 'number') {
      // If remaining_spots not tracked, consider course not full by default
      is_full = false;
      spots_remaining = null;
    }

    return {
      course,
      is_full,
      spots_remaining
    };
  }

  // registerForCourse(courseId, attendee_name, attendee_email, attendee_experience_level, preferred_contact_method)
  registerForCourse(courseId, attendee_name, attendee_email, attendee_experience_level, preferred_contact_method) {
    const courses = this._getFromStorage('courses');
    const enrollments = this._getFromStorage('class_enrollments');

    const courseIndex = courses.findIndex((c) => c.id === courseId);
    if (courseIndex === -1) {
      return {
        success: false,
        enrollment: null,
        updated_course: null,
        message: 'Course not found.'
      };
    }

    const course = courses[courseIndex];
    if (!course.is_published) {
      return {
        success: false,
        enrollment: null,
        updated_course: course,
        message: 'Course is not open for registration.'
      };
    }

    if (typeof course.remaining_spots === 'number' && course.remaining_spots <= 0) {
      return {
        success: false,
        enrollment: null,
        updated_course: course,
        message: 'Course is full.'
      };
    }

    const enrollment = {
      id: this._generateId('enroll'),
      course_id: courseId,
      attendee_name,
      attendee_email,
      attendee_experience_level: attendee_experience_level || null,
      preferred_contact_method: preferred_contact_method || null,
      created_at: this._nowISO()
    };

    enrollments.push(enrollment);

    if (typeof course.remaining_spots === 'number') {
      course.remaining_spots = Math.max(0, course.remaining_spots - 1);
    }
    course.updated_at = this._nowISO();
    courses[courseIndex] = course;

    this._saveToStorage('class_enrollments', enrollments);
    this._saveToStorage('courses', courses);

    return {
      success: true,
      enrollment,
      updated_course: course,
      message: 'Registration successful.'
    };
  }

  // getMembershipPlans()
  getMembershipPlans() {
    const plans = this._getFromStorage('membership_plans').filter((p) => p && p.is_active);
    return plans.sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  // createMembershipSubscription(planId, full_name, email, billing_frequency, experience_level)
  createMembershipSubscription(planId, full_name, email, billing_frequency, experience_level) {
    const plans = this._getFromStorage('membership_plans');
    const subs = this._getFromStorage('membership_subscriptions');

    const plan = plans.find((p) => p.id === planId && p.is_active);
    if (!plan) {
      return {
        success: false,
        subscription: null,
        message: 'Selected membership plan not found or inactive.'
      };
    }

    if (billing_frequency !== 'monthly' && billing_frequency !== 'annual') {
      return {
        success: false,
        subscription: null,
        message: 'Invalid billing frequency.'
      };
    }

    const subscription = {
      id: this._generateId('member_sub'),
      plan_id: planId,
      full_name,
      email,
      billing_frequency,
      experience_level: experience_level || null,
      started_at: this._nowISO()
    };

    subs.push(subscription);
    this._saveToStorage('membership_subscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'Membership subscription created.'
    };
  }

  // getEventsForMonth(year, month, max_price, event_types, sort_by)
  getEventsForMonth(year, month, max_price, event_types, sort_by) {
    const events = this._getFromStorage('events').filter((e) => e && e.is_published);
    const y = Number(year);
    const m = Number(month);

    const filtered = events.filter((e) => {
      const d = this._parseDate(e.start_datetime);
      if (!d) return false;
      if (d.getUTCFullYear() !== y) return false;
      if (d.getUTCMonth() + 1 !== m) return false;
      if (typeof max_price === 'number' && !(typeof e.price === 'number' && e.price <= max_price)) {
        return false;
      }
      if (Array.isArray(event_types) && event_types.length > 0) {
        if (!event_types.includes(e.event_type)) return false;
      }
      return true;
    });

    if (sort_by === 'start_date_desc') {
      filtered.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return db - da;
      });
    } else {
      // default or 'start_date_asc'
      filtered.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    }

    return filtered;
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    return { event };
  }

  // addEventToMySchedule(eventId)
  addEventToMySchedule(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return {
        success: false,
        scheduled_event: null,
        message: 'Event not found.'
      };
    }

    let scheduledEvents = this._getFromStorage('scheduled_events');
    const existing = scheduledEvents.find((s) => s.event_id === eventId);
    if (existing) {
      return {
        success: true,
        scheduled_event: existing,
        message: 'Event already in schedule.'
      };
    }

    const scheduled_event = {
      id: this._generateId('sched'),
      event_id: eventId,
      added_at: this._nowISO()
    };

    scheduledEvents.push(scheduled_event);
    this._saveToStorage('scheduled_events', scheduledEvents);

    return {
      success: true,
      scheduled_event,
      message: 'Event added to schedule.'
    };
  }

  // getMySchedule(sort_order)
  getMySchedule(sort_order) {
    const scheduledEvents = this._getFromStorage('scheduled_events');
    const events = this._getFromStorage('events');

    let combined = scheduledEvents.map((s) => {
      const evt = events.find((e) => e.id === s.event_id) || null;
      return { scheduled_event: s, event: evt };
    });

    if (sort_order === 'date_desc') {
      combined.sort((a, b) => {
        const da =
          a.event && a.event.start_datetime
            ? this._parseDate(a.event.start_datetime)
            : this._parseDate(a.scheduled_event.added_at);
        const db =
          b.event && b.event.start_datetime
            ? this._parseDate(b.event.start_datetime)
            : this._parseDate(b.scheduled_event.added_at);
        return (db || new Date(0)) - (da || new Date(0));
      });
    } else if (sort_order === 'date_asc') {
      combined.sort((a, b) => {
        const da =
          a.event && a.event.start_datetime
            ? this._parseDate(a.event.start_datetime)
            : this._parseDate(a.scheduled_event.added_at);
        const db =
          b.event && b.event.start_datetime
            ? this._parseDate(b.event.start_datetime)
            : this._parseDate(b.scheduled_event.added_at);
        return (da || new Date(0)) - (db || new Date(0));
      });
    }

    // Instrumentation for task completion tracking
    try {
      if (sort_order === 'date_asc' && Array.isArray(combined) && combined.length > 0) {
        localStorage.setItem('task3_scheduleSortedAsc', 'true');
      }
    } catch (e) {}

    return combined;
  }

  // removeScheduledEvent(scheduledEventId)
  removeScheduledEvent(scheduledEventId) {
    let scheduledEvents = this._getFromStorage('scheduled_events');
    const before = scheduledEvents.length;
    scheduledEvents = scheduledEvents.filter((s) => s.id !== scheduledEventId);
    const after = scheduledEvents.length;
    this._saveToStorage('scheduled_events', scheduledEvents);

    return {
      success: after < before,
      message: after < before ? 'Scheduled event removed.' : 'Scheduled event not found.'
    };
  }

  // searchGalleryPhotos(tags, location, min_rating, sort_by, page_size, page_cursor)
  searchGalleryPhotos(tags, location, min_rating, sort_by, page_size, page_cursor) {
    let photos = this._getFromStorage('photos');

    if (Array.isArray(tags) && tags.length > 0) {
      photos = photos.filter((p) => {
        if (!Array.isArray(p.tags)) return false;
        return p.tags.some((t) => tags.includes(t));
      });
    }

    if (location) {
      photos = photos.filter((p) => p.location === location);
    }

    if (typeof min_rating === 'number') {
      photos = photos.filter((p) => typeof p.rating === 'number' && p.rating >= min_rating);
    }

    if (sort_by === 'rating_desc') {
      photos.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    } else if (sort_by === 'newest_first') {
      photos.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    }

    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const startIndex = page_cursor ? parseInt(page_cursor, 10) || 0 : 0;
    const endIndex = startIndex + size;

    const pageItems = photos.slice(startIndex, endIndex);
    const has_more = endIndex < photos.length;
    const next_cursor = has_more ? String(endIndex) : null;

    return {
      photos: pageItems,
      has_more,
      next_cursor
    };
  }

  // getPhotoDetail(photoId)
  getPhotoDetail(photoId) {
    const photos = this._getFromStorage('photos');
    const photo = photos.find((p) => p.id === photoId) || null;
    return { photo };
  }

  // addPhotoToFavorites(photoId)
  addPhotoToFavorites(photoId) {
    const photos = this._getFromStorage('photos');
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) {
      return {
        success: false,
        favorite: null,
        message: 'Photo not found.'
      };
    }

    let favorites = this._getFromStorage('favorite_photos');
    const existing = favorites.find((f) => f.photo_id === photoId);
    if (existing) {
      return {
        success: true,
        favorite: existing,
        message: 'Photo already in favorites.'
      };
    }

    const favorite = {
      id: this._generateId('fav'),
      photo_id: photoId,
      favorited_at: this._nowISO()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_photos', favorites);

    return {
      success: true,
      favorite,
      message: 'Photo added to favorites.'
    };
  }

  // removePhotoFromFavorites(photoId)
  removePhotoFromFavorites(photoId) {
    let favorites = this._getFromStorage('favorite_photos');
    const before = favorites.length;
    favorites = favorites.filter((f) => f.photo_id !== photoId);
    const after = favorites.length;
    this._saveToStorage('favorite_photos', favorites);

    return {
      success: after < before,
      message: after < before ? 'Photo removed from favorites.' : 'Favorite photo not found.'
    };
  }

  // getMyFavoritePhotos()
  getMyFavoritePhotos() {
    const favorites = this._getFromStorage('favorite_photos');
    const photos = this._getFromStorage('photos');

    return favorites.map((f) => {
      const photo = photos.find((p) => p.id === f.photo_id) || null;
      return { favorite: f, photo };
    });
  }

  // getMyCollections()
  getMyCollections() {
    const collections = this._getFromStorage('photo_collections');
    const items = this._getFromStorage('photo_collection_items');

    return collections.map((c) => {
      const photo_count = items.filter((i) => i.collection_id === c.id).length;
      return { collection: c, photo_count };
    });
  }

  // createPhotoCollection(name, description)
  createPhotoCollection(name, description) {
    const collections = this._getFromStorage('photo_collections');
    const now = this._nowISO();

    const collection = {
      id: this._generateId('pcol'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };

    collections.push(collection);
    this._saveToStorage('photo_collections', collections);

    return {
      success: true,
      collection,
      message: 'Photo collection created.'
    };
  }

  // renamePhotoCollection(collectionId, new_name)
  renamePhotoCollection(collectionId, new_name) {
    const collections = this._getFromStorage('photo_collections');
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) {
      return {
        success: false,
        collection: null,
        message: 'Collection not found.'
      };
    }

    collections[idx].name = new_name;
    collections[idx].updated_at = this._nowISO();
    this._saveToStorage('photo_collections', collections);

    return {
      success: true,
      collection: collections[idx],
      message: 'Collection renamed.'
    };
  }

  // deletePhotoCollection(collectionId)
  deletePhotoCollection(collectionId) {
    let collections = this._getFromStorage('photo_collections');
    let items = this._getFromStorage('photo_collection_items');

    const before = collections.length;
    collections = collections.filter((c) => c.id !== collectionId);
    const after = collections.length;

    if (after < before) {
      items = items.filter((i) => i.collection_id !== collectionId);
      this._saveToStorage('photo_collections', collections);
      this._saveToStorage('photo_collection_items', items);
      return { success: true, message: 'Collection deleted.' };
    }

    return { success: false, message: 'Collection not found.' };
  }

  // addPhotosToCollection(collectionId, photoIds)
  addPhotosToCollection(collectionId, photoIds) {
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return {
        success: false,
        added_items: [],
        message: 'No photo IDs provided.'
      };
    }

    const collections = this._getFromStorage('photo_collections');
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      return {
        success: false,
        added_items: [],
        message: 'Collection not found.'
      };
    }

    let items = this._getFromStorage('photo_collection_items');
    const existingSet = new Set(items.filter((i) => i.collection_id === collectionId).map((i) => i.photo_id));

    const added_items = [];
    const now = this._nowISO();

    for (const photoId of photoIds) {
      if (existingSet.has(photoId)) continue;
      const item = {
        id: this._generateId('pcol_item'),
        collection_id: collectionId,
        photo_id: photoId,
        added_at: now
      };
      items.push(item);
      added_items.push(item);
      existingSet.add(photoId);
    }

    this._saveToStorage('photo_collection_items', items);

    return {
      success: added_items.length > 0,
      added_items,
      message: added_items.length > 0 ? 'Photos added to collection.' : 'No new photos were added (duplicates skipped).'
    };
  }

  // removePhotoFromCollection(collectionId, photoId)
  removePhotoFromCollection(collectionId, photoId) {
    let items = this._getFromStorage('photo_collection_items');
    const before = items.length;
    items = items.filter((i) => !(i.collection_id === collectionId && i.photo_id === photoId));
    const after = items.length;
    this._saveToStorage('photo_collection_items', items);

    return {
      success: after < before,
      message: after < before ? 'Photo removed from collection.' : 'Photo not found in collection.'
    };
  }

  // searchResourceArticles(resource_type, experience_level, published_since, sort_by, page, page_size)
  searchResourceArticles(resource_type, experience_level, published_since, sort_by, page, page_size) {
    let articles = this._getFromStorage('resource_articles').filter((a) => a && a.is_published);

    if (resource_type) {
      articles = articles.filter((a) => a.resource_type === resource_type);
    }

    if (experience_level) {
      articles = articles.filter((a) => {
        if (!a.experience_level) return true; // treat missing as all levels
        if (a.experience_level === 'all_levels') return true;
        return a.experience_level === experience_level;
      });
    }

    if (published_since) {
      const since = new Date(published_since);
      articles = articles.filter((a) => {
        const d = this._parseDate(a.published_date);
        return d && d >= since;
      });
    }

    if (sort_by === 'published_date_asc') {
      articles.sort((a, b) => {
        const da = this._parseDate(a.published_date) || new Date(0);
        const db = this._parseDate(b.published_date) || new Date(0);
        return da - db;
      });
    } else {
      // default or 'published_date_desc'
      articles.sort((a, b) => {
        const da = this._parseDate(a.published_date) || new Date(0);
        const db = this._parseDate(b.published_date) || new Date(0);
        return db - da;
      });
    }

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : articles.length;
    const startIndex = (p - 1) * size;
    const endIndex = startIndex + size;

    return articles.slice(startIndex, endIndex);
  }

  // getGearGuideArticle(articleId)
  getGearGuideArticle(articleId) {
    const articles = this._getFromStorage('resource_articles');
    const article = articles.find((a) => a.id === articleId) || null;

    const allRecs = this._getFromStorage('article_gear_recommendations');
    const cameras = this._getFromStorage('camera_models');

    const gear_recommendations = allRecs
      .filter((r) => r.article_id === articleId)
      .map((recommendation) => {
        const camera = cameras.find((c) => c.id === recommendation.camera_id) || null;
        return { recommendation, camera };
      });

    return {
      article,
      gear_recommendations
    };
  }

  // addCameraToGearWishlist(cameraId, notes)
  addCameraToGearWishlist(cameraId, notes) {
    const cameras = this._getFromStorage('camera_models');
    const camera = cameras.find((c) => c.id === cameraId);
    if (!camera) {
      return {
        success: false,
        wishlist_item: null,
        message: 'Camera not found.'
      };
    }

    let wishlist = this._getFromStorage('gear_wishlist_items');
    const existing = wishlist.find((w) => w.camera_id === cameraId);
    if (existing) {
      if (typeof notes === 'string' && notes.length > 0) {
        existing.notes = notes;
        this._saveToStorage('gear_wishlist_items', wishlist);
      }
      return {
        success: true,
        wishlist_item: existing,
        message: 'Camera already in wishlist.'
      };
    }

    const wishlist_item = {
      id: this._generateId('gwl'),
      camera_id: cameraId,
      added_at: this._nowISO(),
      notes: notes || ''
    };

    wishlist.push(wishlist_item);
    this._saveToStorage('gear_wishlist_items', wishlist);

    return {
      success: true,
      wishlist_item,
      message: 'Camera added to wishlist.'
    };
  }

  // getMyGearWishlist()
  getMyGearWishlist() {
    const wishlist = this._getFromStorage('gear_wishlist_items');
    const cameras = this._getFromStorage('camera_models');

    return wishlist.map((w) => {
      const camera = cameras.find((c) => c.id === w.camera_id) || null;
      return { wishlist_item: w, camera };
    });
  }

  // updateGearWishlistItem(wishlistItemId, notes)
  updateGearWishlistItem(wishlistItemId, notes) {
    let wishlist = this._getFromStorage('gear_wishlist_items');
    const idx = wishlist.findIndex((w) => w.id === wishlistItemId);
    if (idx === -1) {
      return {
        success: false,
        wishlist_item: null,
        message: 'Wishlist item not found.'
      };
    }

    if (typeof notes === 'string') {
      wishlist[idx].notes = notes;
    }

    this._saveToStorage('gear_wishlist_items', wishlist);

    return {
      success: true,
      wishlist_item: wishlist[idx],
      message: 'Wishlist item updated.'
    };
  }

  // reorderGearWishlist(orderedWishlistItemIds)
  reorderGearWishlist(orderedWishlistItemIds) {
    if (!Array.isArray(orderedWishlistItemIds)) {
      return {
        success: false,
        message: 'orderedWishlistItemIds must be an array.'
      };
    }

    const wishlist = this._getFromStorage('gear_wishlist_items');
    const idToItem = new Map();
    for (const item of wishlist) {
      idToItem.set(item.id, item);
    }

    const newOrder = [];
    const used = new Set();

    for (const id of orderedWishlistItemIds) {
      const item = idToItem.get(id);
      if (item && !used.has(id)) {
        newOrder.push(item);
        used.add(id);
      }
    }

    // Append items that were not specified, in original order
    for (const item of wishlist) {
      if (!used.has(item.id)) {
        newOrder.push(item);
      }
    }

    this._saveToStorage('gear_wishlist_items', newOrder);

    return {
      success: true,
      message: 'Wishlist reordered.'
    };
  }

  // removeGearWishlistItem(wishlistItemId)
  removeGearWishlistItem(wishlistItemId) {
    let wishlist = this._getFromStorage('gear_wishlist_items');
    const before = wishlist.length;
    wishlist = wishlist.filter((w) => w.id !== wishlistItemId);
    const after = wishlist.length;
    this._saveToStorage('gear_wishlist_items', wishlist);

    return {
      success: after < before,
      message: after < before ? 'Wishlist item removed.' : 'Wishlist item not found.'
    };
  }

  // getForumCategories()
  getForumCategories() {
    return this._getFromStorage('forum_categories');
  }

  // createForumProfile(username, email, skill_level, password)
  createForumProfile(username, email, skill_level, password) {
    let profiles = this._getFromStorage('forum_profiles');

    if (profiles.length > 0) {
      // Update existing single-user profile
      const profile = profiles[0];
      profile.username = username;
      profile.email = email;
      profile.skill_level = skill_level || profile.skill_level;
      profile.password = password || profile.password;
      this._saveToStorage('forum_profiles', profiles);
      return {
        success: true,
        profile,
        message: 'Forum profile updated.'
      };
    }

    const profile = {
      id: this._generateId('forum_profile'),
      username,
      email,
      skill_level: skill_level || null,
      password,
      created_at: this._nowISO()
    };

    profiles.push(profile);
    this._saveToStorage('forum_profiles', profiles);

    return {
      success: true,
      profile,
      message: 'Forum profile created.'
    };
  }

  // getForumTopics(categoryId, page, page_size, sort_by)
  getForumTopics(categoryId, page, page_size, sort_by) {
    const topicsAll = this._getFromStorage('forum_topics');
    const categories = this._getFromStorage('forum_categories');
    const profiles = this._getFromStorage('forum_profiles');

    let topics = topicsAll.filter((t) => t.category_id === categoryId);

    if (sort_by === 'created_at_asc') {
      topics.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return da - db;
      });
    } else {
      // default or 'created_at_desc'
      topics.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    }

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : topics.length;
    const startIndex = (p - 1) * size;
    const endIndex = startIndex + size;

    const pageTopics = topics.slice(startIndex, endIndex);

    // Foreign key resolution: category and forum_profile
    return pageTopics.map((t) => {
      const category = categories.find((c) => c.id === t.category_id) || null;
      const forum_profile = t.forum_profile_id
        ? profiles.find((fp) => fp.id === t.forum_profile_id) || null
        : null;
      return { ...t, category, forum_profile };
    });
  }

  // createForumTopic(categoryId, title, body, tags, sub_category)
  createForumTopic(categoryId, title, body, tags, sub_category) {
    const categories = this._getFromStorage('forum_categories');
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      return {
        success: false,
        topic: null,
        message: 'Forum category not found.'
      };
    }

    const profile = this._getOrCreateForumProfile(false);

    let topics = this._getFromStorage('forum_topics');

    const topic = {
      id: this._generateId('topic'),
      category_id: categoryId,
      forum_profile_id: profile ? profile.id : null,
      title,
      body,
      tags: Array.isArray(tags) ? tags : [],
      sub_category: sub_category || null,
      created_at: this._nowISO()
    };

    topics.push(topic);
    this._saveToStorage('forum_topics', topics);

    return {
      success: true,
      topic,
      message: 'Forum topic created.'
    };
  }

  // getMeetingTimesOverview()
  getMeetingTimesOverview() {
    const club_address = localStorage.getItem('club_address') || '';
    const meetings = this._getFromStorage('meetings');
    return { club_address, meetings };
  }

  // getMeetingDetail(meetingId)
  getMeetingDetail(meetingId) {
    const meetings = this._getFromStorage('meetings');
    const meeting = meetings.find((m) => m.id === meetingId) || null;
    return { meeting };
  }

  // createNoteFromMeeting(meetingId, title, body)
  createNoteFromMeeting(meetingId, title, body) {
    const meetings = this._getFromStorage('meetings');
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) {
      return {
        success: false,
        note: null,
        message: 'Meeting not found.'
      };
    }

    let notes = this._getFromStorage('notes');
    const now = this._nowISO();

    const note = {
      id: this._generateId('note'),
      title,
      body,
      source_type: 'meeting',
      source_id: meetingId,
      created_at: now,
      updated_at: now
    };

    notes.push(note);
    this._saveToStorage('notes', notes);

    return {
      success: true,
      note,
      message: 'Note created from meeting.'
    };
  }

  // getMyNotes()
  getMyNotes() {
    const notes = this._getFromStorage('notes');
    const meetings = this._getFromStorage('meetings');

    return notes.map((n) => {
      if (n.source_type === 'meeting' && n.source_id) {
        const meeting = meetings.find((m) => m.id === n.source_id) || null;
        return { ...n, meeting };
      }
      return n;
    });
  }

  // getNoteDetail(noteId)
  getNoteDetail(noteId) {
    const notes = this._getFromStorage('notes');
    const note = notes.find((n) => n.id === noteId) || null;
    if (!note) {
      return { note: null };
    }

    if (note.source_type === 'meeting' && note.source_id) {
      const meetings = this._getFromStorage('meetings');
      const meeting = meetings.find((m) => m.id === note.source_id) || null;
      return { note: { ...note, meeting } };
    }

    return { note };
  }

  // updateNote(noteId, title, body)
  updateNote(noteId, title, body) {
    let notes = this._getFromStorage('notes');
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) {
      return {
        success: false,
        note: null,
        message: 'Note not found.'
      };
    }

    notes[idx].title = title;
    notes[idx].body = body;
    notes[idx].updated_at = this._nowISO();

    this._saveToStorage('notes', notes);

    return {
      success: true,
      note: notes[idx],
      message: 'Note updated.'
    };
  }

  // deleteNote(noteId)
  deleteNote(noteId) {
    let notes = this._getFromStorage('notes');
    const before = notes.length;
    notes = notes.filter((n) => n.id !== noteId);
    const after = notes.length;
    this._saveToStorage('notes', notes);

    return {
      success: after < before,
      message: after < before ? 'Note deleted.' : 'Note not found.'
    };
  }

  // getNewsletterTopics()
  getNewsletterTopics() {
    return this._getFromStorage('newsletter_topics');
  }

  // subscribeToNewsletter(full_name, email, contact_frequency, topics, preferred_format)
  subscribeToNewsletter(full_name, email, contact_frequency, topics, preferred_format) {
    // Map contact_frequency to internal email_frequency
    let email_frequency = 'monthly_summary';
    if (contact_frequency === 'once_a_week') {
      email_frequency = 'weekly_digest';
    } else if (contact_frequency === 'real_time') {
      email_frequency = 'real_time';
    } else if (contact_frequency === 'once_a_month') {
      email_frequency = 'monthly_summary';
    }

    let profiles = this._getFromStorage('communication_profiles');
    let profile;

    if (profiles.length > 0) {
      profile = profiles[0];
      profile.full_name = full_name;
      profile.email = email;
      profile.email_frequency = email_frequency;
      profile.topics = Array.isArray(topics) ? topics : [];
      profile.preferred_format = preferred_format;
      profile.is_subscribed = true;
      profile.updated_at = this._nowISO();
      profiles[0] = profile;
    } else {
      profile = {
        id: this._generateId('comm'),
        full_name,
        email,
        email_frequency,
        topics: Array.isArray(topics) ? topics : [],
        preferred_format,
        is_subscribed: true,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      profiles.push(profile);
    }

    this._saveToStorage('communication_profiles', profiles);

    return {
      success: true,
      communication_profile: profile,
      message: 'Subscribed to newsletter.'
    };
  }

  // getCommunicationPreferences()
  getCommunicationPreferences() {
    const profiles = this._getFromStorage('communication_profiles');
    const communication_profile = profiles.length > 0 ? profiles[0] : null;
    return { communication_profile };
  }

  // updateCommunicationPreferences(email_frequency, topics, preferred_format, is_subscribed)
  updateCommunicationPreferences(email_frequency, topics, preferred_format, is_subscribed) {
    let profiles = this._getFromStorage('communication_profiles');
    let profile;

    if (profiles.length > 0) {
      profile = profiles[0];
      profile.email_frequency = email_frequency;
      if (Array.isArray(topics)) {
        profile.topics = topics;
      }
      profile.preferred_format = preferred_format;
      profile.is_subscribed = !!is_subscribed;
      profile.updated_at = this._nowISO();
      profiles[0] = profile;
    } else {
      profile = {
        id: this._generateId('comm'),
        full_name: '',
        email: '',
        email_frequency,
        topics: Array.isArray(topics) ? topics : [],
        preferred_format,
        is_subscribed: !!is_subscribed,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      profiles.push(profile);
    }

    this._saveToStorage('communication_profiles', profiles);

    return {
      success: true,
      communication_profile: profile,
      message: 'Communication preferences updated.'
    };
  }

  // searchMentors(primary_genre, accepting_status, accepted_experience_level, sort_by)
  searchMentors(primary_genre, accepting_status, accepted_experience_level, sort_by) {
    let mentors = this._getFromStorage('mentor_profiles');

    if (primary_genre) {
      mentors = mentors.filter((m) => m.primary_genre === primary_genre);
    }

    if (accepting_status) {
      mentors = mentors.filter((m) => m.accepting_mentees_status === accepting_status);
    }

    if (accepted_experience_level) {
      mentors = mentors.filter((m) => {
        if (!Array.isArray(m.accepted_experience_levels) || m.accepted_experience_levels.length === 0) {
          return true; // treat as accepting all
        }
        return m.accepted_experience_levels.includes(accepted_experience_level);
      });
    }

    if (sort_by === 'review_count_desc') {
      mentors.sort((a, b) => {
        const ra = typeof a.review_count === 'number' ? a.review_count : 0;
        const rb = typeof b.review_count === 'number' ? b.review_count : 0;
        if (rb !== ra) return rb - ra;
        const raa = typeof a.rating === 'number' ? a.rating : 0;
        const rbb = typeof b.rating === 'number' ? b.rating : 0;
        return rbb - raa;
      });
    } else if (sort_by === 'rating_desc') {
      mentors.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.review_count === 'number' ? a.review_count : 0;
        const cb = typeof b.review_count === 'number' ? b.review_count : 0;
        return cb - ca;
      });
    }

    return mentors;
  }

  // getMentorDetail(mentorId)
  getMentorDetail(mentorId) {
    const mentors = this._getFromStorage('mentor_profiles');
    const mentor = mentors.find((m) => m.id === mentorId) || null;
    return { mentor };
  }

  // sendMentorshipRequest(mentorId, subject, message_body)
  sendMentorshipRequest(mentorId, subject, message_body) {
    const mentors = this._getFromStorage('mentor_profiles');
    const mentor = mentors.find((m) => m.id === mentorId);
    if (!mentor) {
      return {
        success: false,
        request: null,
        message: 'Mentor not found.'
      };
    }

    let requests = this._getFromStorage('mentorship_requests');

    const request = {
      id: this._generateId('ment_req'),
      mentor_id: mentorId,
      subject,
      message_body,
      status: 'sent',
      created_at: this._nowISO()
    };

    requests.push(request);
    this._saveToStorage('mentorship_requests', requests);

    return {
      success: true,
      request,
      message: 'Mentorship request sent.'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    if (!raw) {
      return {
        title: '',
        body: '',
        leadership: []
      };
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) {
      return {
        title: '',
        body: '',
        leadership: []
      };
    }
  }

  // getContactInfo()
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    if (!raw) {
      return {
        email: '',
        phone: '',
        address: '',
        social_links: []
      };
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) {
      return {
        email: '',
        phone: '',
        address: '',
        social_links: []
      };
    }
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    // Simulate submission by writing a minimal log entry
    const key = 'contact_messages_log';
    const existingRaw = localStorage.getItem(key);
    let log = [];
    if (existingRaw) {
      try {
        log = JSON.parse(existingRaw) || [];
      } catch (e) {
        log = [];
      }
    }

    const message_id = this._generateId('contact');
    const entry = {
      id: message_id,
      name,
      email,
      subject,
      message,
      created_at: this._nowISO()
    };

    log.push(entry);
    localStorage.setItem(key, JSON.stringify(log));

    return {
      success: true,
      message_id,
      message: 'Contact form submitted.'
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