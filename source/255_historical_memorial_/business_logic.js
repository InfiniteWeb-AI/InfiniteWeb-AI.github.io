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
    const arrayKeys = [
      'historical_events',
      'event_collections',
      'custom_timelines',
      'site_locations',
      'visit_plans',
      'tours',
      'tour_registrations',
      'teaching_resources',
      'reading_lists',
      'testimonies',
      'saved_testimonies_lists',
      'program_events',
      'visit_schedules',
      'support_pledges'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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

  _nowIso() {
    return new Date().toISOString();
  }

  _getDatePart(isoString) {
    if (!isoString) return null;
    try {
      return new Date(isoString).toISOString().slice(0, 10);
    } catch (e) {
      return null;
    }
  }

  _parseTimeToMinutes(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const parts = hhmm.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _safeLower(str) {
    return (str || '').toString().toLowerCase();
  }

  // ------------------------
  // Internal domain helpers
  // ------------------------

  _getOrCreateEventCollection() {
    const collections = this._getFromStorage('event_collections');
    if (collections.length > 0) {
      return collections[0];
    }
    const now = this._nowIso();
    const collection = {
      id: this._generateId('event_collection'),
      name: 'My Collection',
      event_ids: [],
      created_at: now,
      updated_at: now
    };
    collections.push(collection);
    this._saveToStorage('event_collections', collections);
    return collection;
  }

  _getOrCreateReadingList() {
    const lists = this._getFromStorage('reading_lists');
    if (lists.length > 0) return lists[0];
    const now = this._nowIso();
    const list = {
      id: this._generateId('reading_list'),
      name: 'My Reading List',
      resource_ids: [],
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  _getOrCreateSavedTestimoniesList() {
    const lists = this._getFromStorage('saved_testimonies_lists');
    if (lists.length > 0) return lists[0];
    const now = this._nowIso();
    const list = {
      id: this._generateId('saved_testimonies'),
      name: 'Saved Testimonies',
      testimony_ids: [],
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('saved_testimonies_lists', lists);
    return list;
  }

  _getOrCreateCurrentVisitPlan() {
    const raw = localStorage.getItem('current_visit_plan');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to recreate
      }
    }
    const now = this._nowIso();
    const plan = {
      id: this._generateId('current_visit_plan'),
      name: '',
      visit_plan_type: 'route',
      location_ids: [],
      total_estimated_duration_minutes: 0,
      created_at: now,
      updated_at: now
    };
    localStorage.setItem('current_visit_plan', JSON.stringify(plan));
    return plan;
  }

  _saveCurrentVisitPlan(plan) {
    plan.updated_at = this._nowIso();
    localStorage.setItem('current_visit_plan', JSON.stringify(plan));
  }

  _recalculateVisitPlanDuration(plan) {
    const locations = this._getFromStorage('site_locations');
    const byId = {};
    locations.forEach((l) => {
      byId[l.id] = l;
    });
    let total = 0;
    let previousId = null;
    plan.location_ids.forEach((locId) => {
      const loc = byId[locId];
      if (loc) {
        const visit = typeof loc.default_visit_duration_minutes === 'number' && loc.default_visit_duration_minutes > 0
          ? loc.default_visit_duration_minutes
          : 20; // default visit duration
        total += visit;
        if (previousId !== null) {
          // simple fixed walking time between consecutive sites
          total += 5;
        }
        previousId = locId;
      }
    });
    plan.total_estimated_duration_minutes = total;
    return plan;
  }

  _getOrCreateCurrentCustomTimeline() {
    const raw = localStorage.getItem('current_custom_timeline');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    const now = this._nowIso();
    const timeline = {
      id: this._generateId('current_custom_timeline'),
      title: '',
      description: '',
      event_ids: [],
      created_at: now,
      updated_at: now
    };
    localStorage.setItem('current_custom_timeline', JSON.stringify(timeline));
    return timeline;
  }

  _saveCurrentCustomTimeline(timeline) {
    timeline.updated_at = this._nowIso();
    localStorage.setItem('current_custom_timeline', JSON.stringify(timeline));
  }

  _getOrCreateVisitScheduleForDate(dateString) {
    const schedules = this._getFromStorage('visit_schedules');
    let schedule = schedules.find((s) => s.date === dateString);
    if (!schedule) {
      const now = this._nowIso();
      schedule = {
        id: this._generateId('visit_schedule'),
        date: dateString,
        program_event_ids: [],
        created_at: now,
        updated_at: now
      };
      schedules.push(schedule);
      this._saveToStorage('visit_schedules', schedules);
    }
    return schedule;
  }

  _getOrCreateSupportPledgeRecord(data) {
    const pledges = this._getFromStorage('support_pledges');
    const now = this._nowIso();
    const pledge = {
      id: this._generateId('support_pledge'),
      amount: data.amount,
      currency: data.currency, // e.g., 'pln'
      frequency: data.frequency, // e.g., 'monthly'
      designation: data.designation, // e.g., 'educational_programs'
      donor_name: data.donorName,
      donor_email: data.donorEmail,
      status: 'active',
      message: data.message || '',
      created_at: now
    };
    pledges.push(pledge);
    this._saveToStorage('support_pledges', pledges);
    return pledge;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomepageContent()
  getHomepageContent() {
    let heroTitle = '';
    let heroSubtitle = '';
    let introText = '';

    const cfgRaw = localStorage.getItem('homepage_content');
    if (cfgRaw) {
      try {
        const cfg = JSON.parse(cfgRaw);
        heroTitle = cfg.heroTitle || '';
        heroSubtitle = cfg.heroSubtitle || '';
        introText = cfg.introText || '';
      } catch (e) {}
    }

    // featured WWII event
    const events = this._getFromStorage('historical_events');
    const wwiiEvents = events.filter((e) => e.is_wwii_related === true);
    const featuredEvent = wwiiEvents[0] || null;
    const featuredWwiiEvent = featuredEvent
      ? {
          id: featuredEvent.id,
          title: featuredEvent.title,
          summary: featuredEvent.summary || '',
          startDate: featuredEvent.start_date || null,
          endDate: featuredEvent.end_date || null,
          locationName: featuredEvent.location_name || '',
          tags: featuredEvent.tags || []
        }
      : null;

    // featured testimony: newest recording_date
    const testimonies = this._getFromStorage('testimonies');
    let featuredTestimonyObj = null;
    if (testimonies.length > 0) {
      const sorted = testimonies.slice().sort((a, b) => {
        const da = a.recording_date ? new Date(a.recording_date).getTime() : 0;
        const db = b.recording_date ? new Date(b.recording_date).getTime() : 0;
        return db - da;
      });
      const t = sorted[0];
      featuredTestimonyObj = {
        id: t.id,
        personName: t.person_name,
        summary: t.summary || '',
        recordingDate: t.recording_date || null,
        ageCategory: t.age_category || null
      };
    }

    // featured program event: next upcoming or first
    const programEvents = this._getFromStorage('program_events');
    let featuredProgramEventObj = null;
    if (programEvents.length > 0) {
      const now = Date.now();
      const upcoming = programEvents
        .map((e) => ({
          raw: e,
          start: e.start_datetime ? new Date(e.start_datetime).getTime() : 0
        }))
        .filter((x) => x.start >= now);
      let chosen;
      if (upcoming.length > 0) {
        upcoming.sort((a, b) => a.start - b.start);
        chosen = upcoming[0].raw;
      } else {
        chosen = programEvents[0];
      }
      featuredProgramEventObj = {
        id: chosen.id,
        title: chosen.title,
        eventType: chosen.event_type,
        startDatetime: chosen.start_datetime || null,
        endDatetime: chosen.end_datetime || null,
        locationName: chosen.location_name || ''
      };
    }

    return {
      heroTitle,
      heroSubtitle,
      heroSubtitle: heroSubtitle,
      introText,
      featuredWwiiEvent,
      featuredTestimony: featuredTestimonyObj,
      featuredProgramEvent: featuredProgramEventObj
    };
  }

  // getHomepageUserPanels()
  getHomepageUserPanels() {
    // My Collection
    const collections = this._getFromStorage('event_collections');
    const events = this._getFromStorage('historical_events');
    const collection = collections[0] || null;
    let totalEvents = 0;
    let lastAddedEventTitle = '';
    if (collection && Array.isArray(collection.event_ids)) {
      totalEvents = collection.event_ids.length;
      if (totalEvents > 0) {
        const lastId = collection.event_ids[collection.event_ids.length - 1];
        const ev = events.find((e) => e.id === lastId);
        lastAddedEventTitle = ev ? ev.title : '';
      }
    }

    // Reading List
    const rlists = this._getFromStorage('reading_lists');
    const resources = this._getFromStorage('teaching_resources');
    const rlist = rlists[0] || null;
    let totalResources = 0;
    let lastAddedResourceTitle = '';
    if (rlist && Array.isArray(rlist.resource_ids)) {
      totalResources = rlist.resource_ids.length;
      if (totalResources > 0) {
        const lastId = rlist.resource_ids[rlist.resource_ids.length - 1];
        const res = resources.find((r) => r.id === lastId);
        lastAddedResourceTitle = res ? res.title : '';
      }
    }

    // Saved Testimonies
    const slists = this._getFromStorage('saved_testimonies_lists');
    const testimonies = this._getFromStorage('testimonies');
    const slist = slists[0] || null;
    let totalTestimonies = 0;
    let lastSavedTestimonyName = '';
    if (slist && Array.isArray(slist.testimony_ids)) {
      totalTestimonies = slist.testimony_ids.length;
      if (totalTestimonies > 0) {
        const lastId = slist.testimony_ids[slist.testimony_ids.length - 1];
        const t = testimonies.find((tt) => tt.id === lastId);
        lastSavedTestimonyName = t ? t.person_name : '';
      }
    }

    // Visit Planning
    const plans = this._getFromStorage('visit_plans');
    let totalVisitPlans = plans.length;
    let lastVisitPlanName = '';
    if (plans.length > 0) {
      const lastPlan = plans[plans.length - 1];
      lastVisitPlanName = lastPlan.name || '';
    }

    return {
      myCollection: {
        totalEvents,
        lastAddedEventTitle
      },
      myReadingList: {
        totalResources,
        lastAddedResourceTitle
      },
      savedTestimonies: {
        totalTestimonies,
        lastSavedTestimonyName
      },
      visitPlanning: {
        totalVisitPlans,
        lastVisitPlanName
      }
    };
  }

  // searchHistoricalEvents(query, filters, sortBy, page, pageSize)
  searchHistoricalEvents(query, filters, sortBy, page, pageSize) {
    const events = this._getFromStorage('historical_events');
    const q = this._safeLower(query);
    const f = filters || {};
    const startYear = typeof f.startYear === 'number' ? f.startYear : null;
    const endYear = typeof f.endYear === 'number' ? f.endYear : null;
    const isWwiiRelated = typeof f.isWwiiRelated === 'boolean' ? f.isWwiiRelated : null;
    const tagsFilter = Array.isArray(f.tags) ? f.tags.map((t) => t.toString()) : null;
    const categoriesFilter = Array.isArray(f.categories) ? f.categories.map((c) => c.toString()) : null;

    let result = events.filter((e) => {
      // keyword
      if (q) {
        const text = [e.title, e.summary, e.description, (e.tags || []).join(' ')]
          .filter(Boolean)
          .join(' ');
        if (!this._safeLower(text).includes(q)) return false;
      }

      // year range
      if (startYear !== null || endYear !== null) {
        const d = e.start_date ? new Date(e.start_date) : null;
        const year = d ? d.getUTCFullYear() : null;
        if (year === null) return false;
        if (startYear !== null && year < startYear) return false;
        if (endYear !== null && year > endYear) return false;
      }

      // WWII flag
      if (isWwiiRelated !== null) {
        const flag = e.is_wwii_related === true;
        if (isWwiiRelated && !flag) return false;
        if (!isWwiiRelated && flag) return false;
      }

      // tags
      if (tagsFilter && tagsFilter.length > 0) {
        const etags = (e.tags || []).map((t) => t.toString());
        const allMatch = tagsFilter.every((t) => etags.includes(t));
        if (!allMatch) return false;
      }

      // categories
      if (categoriesFilter && categoriesFilter.length > 0) {
        const ecats = (e.categories || []).map((c) => c.toString());
        const allMatch = categoriesFilter.every((c) => ecats.includes(c));
        if (!allMatch) return false;
      }

      return true;
    });

    const sort = sortBy || 'start_date_asc';
    result.sort((a, b) => {
      if (sort === 'start_date_desc') {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return db - da;
      }
      if (sort === 'title_asc') {
        return this._safeLower(a.title).localeCompare(this._safeLower(b.title));
      }
      if (sort === 'title_desc') {
        return this._safeLower(b.title).localeCompare(this._safeLower(a.title));
      }
      // default start_date_asc
      const da = a.start_date ? new Date(a.start_date).getTime() : 0;
      const db = b.start_date ? new Date(b.start_date).getTime() : 0;
      return da - db;
    });

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = result.length;
    const startIdx = (p - 1) * ps;
    const paged = result.slice(startIdx, startIdx + ps).map((e) => ({
      id: e.id,
      title: e.title,
      summary: e.summary || '',
      startDate: e.start_date || null,
      endDate: e.end_date || null,
      locationName: e.location_name || '',
      tags: e.tags || [],
      categories: e.categories || [],
      isWwiiRelated: e.is_wwii_related === true
    }));

    return {
      results: paged,
      total,
      page: p,
      pageSize: ps
    };
  }

  // getHistoricalEventDetail(eventId)
  getHistoricalEventDetail(eventId) {
    const events = this._getFromStorage('historical_events');
    const e = events.find((x) => x.id === eventId);
    if (!e) return null;

    const collections = this._getFromStorage('event_collections');
    const collection = collections[0];
    let inCollection = false;
    if (collection && Array.isArray(collection.event_ids)) {
      inCollection = collection.event_ids.includes(eventId);
    }

    return {
      id: e.id,
      title: e.title,
      summary: e.summary || '',
      description: e.description || '',
      startDate: e.start_date || null,
      endDate: e.end_date || null,
      locationName: e.location_name || '',
      tags: e.tags || [],
      categories: e.categories || [],
      imageUrls: e.image_urls || [],
      isWwiiRelated: e.is_wwii_related === true,
      inCollection
    };
  }

  // addEventToCollection(eventId)
  addEventToCollection(eventId) {
    const events = this._getFromStorage('historical_events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', collection: null };
    }

    const collections = this._getFromStorage('event_collections');
    let collection = this._getOrCreateEventCollection();

    if (!collection.event_ids.includes(eventId)) {
      collection.event_ids.push(eventId);
      collection.updated_at = this._nowIso();
      // persist back into array
      const idx = collections.findIndex((c) => c.id === collection.id);
      if (idx >= 0) {
        collections[idx] = collection;
      } else {
        collections.push(collection);
      }
      this._saveToStorage('event_collections', collections);
    }

    const resolvedEvents = collection.event_ids
      .map((id, idx) => {
        const ev = events.find((e) => e.id === id);
        if (!ev) return null;
        return {
          id: ev.id,
          title: ev.title,
          summary: ev.summary || '',
          startDate: ev.start_date || null,
          endDate: ev.end_date || null,
          locationName: ev.location_name || ''
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Event added to collection',
      collection: {
        id: collection.id,
        name: collection.name,
        createdAt: collection.created_at,
        updatedAt: collection.updated_at,
        totalEvents: collection.event_ids.length,
        events: resolvedEvents
      }
    };
  }

  // removeEventFromCollection(eventId)
  removeEventFromCollection(eventId) {
    const collections = this._getFromStorage('event_collections');
    if (collections.length === 0) {
      return { success: false, message: 'Collection not found', collection: null };
    }
    const events = this._getFromStorage('historical_events');
    let collection = collections[0];
    const before = collection.event_ids.length;
    collection.event_ids = collection.event_ids.filter((id) => id !== eventId);
    const after = collection.event_ids.length;
    if (before === after) {
      return { success: false, message: 'Event not in collection', collection: null };
    }
    collection.updated_at = this._nowIso();
    collections[0] = collection;
    this._saveToStorage('event_collections', collections);

    const resolvedEvents = collection.event_ids
      .map((id) => {
        const ev = events.find((e) => e.id === id);
        if (!ev) return null;
        return {
          id: ev.id,
          title: ev.title,
          startDate: ev.start_date || null
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Event removed from collection',
      collection: {
        id: collection.id,
        name: collection.name,
        updatedAt: collection.updated_at,
        totalEvents: collection.event_ids.length,
        events: resolvedEvents
      }
    };
  }

  // getMyCollection()
  getMyCollection() {
    const collections = this._getFromStorage('event_collections');
    let collection;
    if (collections.length === 0) {
      // Do not create automatically here; just return empty structure

      // Instrumentation for task completion tracking (task_1)
      try {
        localStorage.setItem('task1_myCollectionViewed', 'true');
      } catch (e) {
        console.error('Instrumentation error:', e);
      }

      return {
        id: null,
        name: 'My Collection',
        createdAt: null,
        updatedAt: null,
        totalEvents: 0,
        events: []
      };
    } else {
      collection = collections[0];
    }

    const events = this._getFromStorage('historical_events');
    const resolvedEvents = collection.event_ids
      .map((id, index) => {
        const ev = events.find((e) => e.id === id);
        if (!ev) return null;
        return {
          id: ev.id,
          title: ev.title,
          summary: ev.summary || '',
          startDate: ev.start_date || null,
          endDate: ev.end_date || null,
          locationName: ev.location_name || '',
          orderIndex: index
        };
      })
      .filter(Boolean);

    // Instrumentation for task completion tracking (task_1)
    try {
      localStorage.setItem('task1_myCollectionViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      id: collection.id,
      name: collection.name,
      createdAt: collection.created_at,
      updatedAt: collection.updated_at,
      totalEvents: collection.event_ids.length,
      events: resolvedEvents
    };
  }

  // updateMyCollectionOrder(eventIds)
  updateMyCollectionOrder(eventIds) {
    const collections = this._getFromStorage('event_collections');
    if (collections.length === 0) {
      return { success: false, message: 'Collection not found', collection: null };
    }
    const collection = collections[0];
    const currentSet = new Set(collection.event_ids);
    const newOrder = Array.isArray(eventIds)
      ? eventIds.filter((id) => currentSet.has(id))
      : collection.event_ids.slice();

    collection.event_ids = newOrder;
    collection.updated_at = this._nowIso();
    collections[0] = collection;
    this._saveToStorage('event_collections', collections);

    const events = this._getFromStorage('historical_events');
    const resolved = collection.event_ids
      .map((id, idx) => {
        const ev = events.find((e) => e.id === id);
        if (!ev) return null;
        return {
          id: ev.id,
          title: ev.title,
          orderIndex: idx
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Collection order updated',
      collection: {
        id: collection.id,
        name: collection.name,
        updatedAt: collection.updated_at,
        events: resolved
      }
    };
  }

  // getMyCollectionPrintableView()
  getMyCollectionPrintableView() {
    const col = this.getMyCollection();
    const lines = [];
    lines.push('<html><body>');
    lines.push('<h1>' + (col.name || 'My Collection') + '</h1>');
    lines.push('<ul>');
    (col.events || []).forEach((e) => {
      lines.push(
        '<li><strong>' +
          (e.title || '') +
          '</strong> (' +
          (e.startDate || '') +
          ')</li>'
      );
    });
    lines.push('</ul>');
    lines.push('</body></html>');
    return {
      html: lines.join(''),
      generatedAt: this._nowIso()
    };
  }

  // getTimelineEvents(startYear, endYear, categories, isWwiiRelated)
  getTimelineEvents(startYear, endYear, categories, isWwiiRelated) {
    const events = this._getFromStorage('historical_events');
    const catsFilter = Array.isArray(categories) ? categories.map((c) => c.toString()) : null;
    const wwiiFlag = typeof isWwiiRelated === 'boolean' ? isWwiiRelated : null;

    const filtered = events.filter((e) => {
      const d = e.start_date ? new Date(e.start_date) : null;
      const year = d ? d.getUTCFullYear() : null;
      if (year === null) return false;
      if (typeof startYear === 'number' && year < startYear) return false;
      if (typeof endYear === 'number' && year > endYear) return false;

      if (catsFilter && catsFilter.length > 0) {
        const ecats = (e.categories || []).map((c) => c.toString());
        const any = catsFilter.some((c) => ecats.includes(c));
        if (!any) return false;
      }

      if (wwiiFlag !== null) {
        const flag = e.is_wwii_related === true;
        if (wwiiFlag && !flag) return false;
        if (!wwiiFlag && flag) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const da = a.start_date ? new Date(a.start_date).getTime() : 0;
      const db = b.start_date ? new Date(b.start_date).getTime() : 0;
      return da - db;
    });

    return {
      events: filtered.map((e) => ({
        id: e.id,
        title: e.title,
        summary: e.summary || '',
        startDate: e.start_date || null,
        endDate: e.end_date || null,
        categories: e.categories || [],
        tags: e.tags || []
      }))
    };
  }

  // addEventToCurrentCustomTimeline(eventId)
  addEventToCurrentCustomTimeline(eventId) {
    const events = this._getFromStorage('historical_events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', currentTimeline: null };
    }
    let timeline = this._getOrCreateCurrentCustomTimeline();
    if (!timeline.event_ids.includes(eventId)) {
      timeline.event_ids.push(eventId);
      this._saveCurrentCustomTimeline(timeline);
    }

    const resolvedEvents = timeline.event_ids
      .map((id) => {
        const ev = events.find((e) => e.id === id);
        if (!ev) return null;
        return {
          id: ev.id,
          title: ev.title,
          startDate: ev.start_date || null
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Event added to current custom timeline',
      currentTimeline: {
        id: timeline.id,
        title: timeline.title,
        description: timeline.description || '',
        eventCount: timeline.event_ids.length,
        events: resolvedEvents
      }
    };
  }

  // getCurrentCustomTimeline()
  getCurrentCustomTimeline() {
    const timeline = this._getOrCreateCurrentCustomTimeline();
    const events = this._getFromStorage('historical_events');
    const resolvedEvents = timeline.event_ids
      .map((id) => {
        const ev = events.find((e) => e.id === id);
        if (!ev) return null;
        return {
          id: ev.id,
          title: ev.title,
          startDate: ev.start_date || null
        };
      })
      .filter(Boolean);

    return {
      id: timeline.id,
      title: timeline.title,
      description: timeline.description || '',
      eventCount: timeline.event_ids.length,
      events: resolvedEvents
    };
  }

  // saveCurrentCustomTimeline(title, description)
  saveCurrentCustomTimeline(title, description) {
    const current = this._getOrCreateCurrentCustomTimeline();
    current.title = title;
    current.description = description || '';
    this._saveCurrentCustomTimeline(current);

    const customTimelines = this._getFromStorage('custom_timelines');
    const now = this._nowIso();
    const timeline = {
      id: this._generateId('custom_timeline'),
      title: current.title,
      description: current.description,
      event_ids: current.event_ids.slice(),
      created_at: now,
      updated_at: now
    };
    customTimelines.push(timeline);
    this._saveToStorage('custom_timelines', customTimelines);

    const events = this._getFromStorage('historical_events');
    const resolvedEvents = timeline.event_ids
      .map((id) => {
        const ev = events.find((e) => e.id === id);
        if (!ev) return null;
        return {
          id: ev.id,
          title: ev.title,
          startDate: ev.start_date || null
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Custom timeline saved',
      timeline: {
        id: timeline.id,
        title: timeline.title,
        description: timeline.description,
        createdAt: timeline.created_at,
        updatedAt: timeline.updated_at,
        eventCount: timeline.event_ids.length,
        events: resolvedEvents
      }
    };
  }

  // getCustomTimelinesList()
  getCustomTimelinesList() {
    const customTimelines = this._getFromStorage('custom_timelines');
    return customTimelines.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      eventCount: Array.isArray(t.event_ids) ? t.event_ids.length : 0,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
  }

  // getCustomTimelineDetail(customTimelineId)
  getCustomTimelineDetail(customTimelineId) {
    const customTimelines = this._getFromStorage('custom_timelines');
    const timeline = customTimelines.find((t) => t.id === customTimelineId);
    if (!timeline) return null;

    const events = this._getFromStorage('historical_events');
    const resolvedEvents = (timeline.event_ids || [])
      .map((id) => {
        const ev = events.find((e) => e.id === id);
        if (!ev) return null;
        return {
          id: ev.id,
          title: ev.title,
          summary: ev.summary || '',
          startDate: ev.start_date || null
        };
      })
      .filter(Boolean);

    return {
      id: timeline.id,
      title: timeline.title,
      description: timeline.description || '',
      createdAt: timeline.created_at,
      updatedAt: timeline.updated_at,
      events: resolvedEvents
    };
  }

  // updateCustomTimeline(customTimelineId, title, description, eventIds)
  updateCustomTimeline(customTimelineId, title, description, eventIds) {
    const customTimelines = this._getFromStorage('custom_timelines');
    const timeline = customTimelines.find((t) => t.id === customTimelineId);
    if (!timeline) {
      return { success: false, message: 'Custom timeline not found', timeline: null };
    }

    if (typeof title === 'string') timeline.title = title;
    if (typeof description === 'string') timeline.description = description;

    if (Array.isArray(eventIds)) {
      const events = this._getFromStorage('historical_events');
      const validIds = new Set(events.map((e) => e.id));
      timeline.event_ids = eventIds.filter((id) => validIds.has(id));
    }

    timeline.updated_at = this._nowIso();
    this._saveToStorage('custom_timelines', customTimelines);

    return {
      success: true,
      message: 'Custom timeline updated',
      timeline: {
        id: timeline.id,
        title: timeline.title,
        description: timeline.description || '',
        eventCount: Array.isArray(timeline.event_ids) ? timeline.event_ids.length : 0
      }
    };
  }

  // getCustomTimelinePrintableView(customTimelineId)
  getCustomTimelinePrintableView(customTimelineId) {
    const detail = this.getCustomTimelineDetail(customTimelineId);
    if (!detail) {
      return {
        html: '<html><body><p>Timeline not found</p></body></html>',
        generatedAt: this._nowIso()
      };
    }
    const lines = [];
    lines.push('<html><body>');
    lines.push('<h1>' + (detail.title || '') + '</h1>');
    if (detail.description) {
      lines.push('<p>' + detail.description + '</p>');
    }
    lines.push('<ol>');
    (detail.events || []).forEach((e) => {
      lines.push(
        '<li><strong>' +
          (e.title || '') +
          '</strong> (' +
          (e.startDate || '') +
          ')</li>'
      );
    });
    lines.push('</ol>');
    lines.push('</body></html>');
    return {
      html: lines.join(''),
      generatedAt: this._nowIso()
    };
  }

  // getVisitOverview()
  getVisitOverview() {
    const raw = localStorage.getItem('visit_overview');
    let introText = '';
    let openingHours = '';
    let accessibilityNotes = '';
    let directionsSummary = '';
    let sections = [];
    if (raw) {
      try {
        const cfg = JSON.parse(raw);
        introText = cfg.introText || '';
        openingHours = cfg.openingHours || '';
        accessibilityNotes = cfg.accessibilityNotes || '';
        directionsSummary = cfg.directionsSummary || '';
        sections = Array.isArray(cfg.sections) ? cfg.sections : [];
      } catch (e) {}
    }
    return {
      introText,
      openingHours,
      accessibilityNotes,
      directionsSummary,
      sections
    };
  }

  // searchMapReferencePoints(query)
  searchMapReferencePoints(query) {
    const q = this._safeLower(query);
    const sites = this._getFromStorage('site_locations');
    if (!q) {
      return [];
    }
    return sites
      .filter((s) => this._safeLower(s.name).includes(q))
      .map((s) => ({
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        type: 'site_location',
        description: s.description || ''
      }));
  }

  // getMapSiteLocations(category, isJewishHeritage, maxDistanceFromOldMarketSquareMeters)
  getMapSiteLocations(category, isJewishHeritage, maxDistanceFromOldMarketSquareMeters) {
    const sites = this._getFromStorage('site_locations');
    const cat = category || null;
    const isJ = typeof isJewishHeritage === 'boolean' ? isJewishHeritage : null;
    const maxDist = typeof maxDistanceFromOldMarketSquareMeters === 'number'
      ? maxDistanceFromOldMarketSquareMeters
      : null;

    return sites
      .filter((s) => {
        if (cat && s.category !== cat) return false;
        if (isJ !== null) {
          const flag = s.is_jewish_heritage === true || s.category === 'jewish_heritage';
          if (isJ && !flag) return false;
          if (!isJ && flag) return false;
        }
        if (maxDist !== null) {
          const dist = typeof s.distance_from_old_market_square_meters === 'number'
            ? s.distance_from_old_market_square_meters
            : null;
          if (dist === null || dist > maxDist) return false;
        }
        return true;
      })
      .map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        category: s.category,
        address: s.address || '',
        latitude: s.latitude,
        longitude: s.longitude,
        defaultVisitDurationMinutes: s.default_visit_duration_minutes || 0,
        distanceFromOldMarketSquareMeters: s.distance_from_old_market_square_meters || null,
        isJewishHeritage: s.is_jewish_heritage === true || s.category === 'jewish_heritage'
      }));
  }

  // addLocationToCurrentVisitPlan(locationId)
  addLocationToCurrentVisitPlan(locationId) {
    const locations = this._getFromStorage('site_locations');
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) {
      return { success: false, message: 'Location not found', visitPlan: null };
    }

    let plan = this._getOrCreateCurrentVisitPlan();
    if (!plan.location_ids.includes(locationId)) {
      plan.location_ids.push(locationId);
      plan = this._recalculateVisitPlanDuration(plan);
      this._saveCurrentVisitPlan(plan);
    }

    const resolvedLocations = plan.location_ids
      .map((id, idx) => {
        const l = locations.find((x) => x.id === id);
        if (!l) return null;
        return {
          id: l.id,
          name: l.name,
          category: l.category,
          defaultVisitDurationMinutes: l.default_visit_duration_minutes || 0,
          orderIndex: idx
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Location added to current visit plan',
      visitPlan: {
        id: plan.id,
        name: plan.name,
        visitPlanType: plan.visit_plan_type,
        totalEstimatedDurationMinutes: plan.total_estimated_duration_minutes,
        locationCount: plan.location_ids.length,
        locations: resolvedLocations
      }
    };
  }

  // removeLocationFromCurrentVisitPlan(locationId)
  removeLocationFromCurrentVisitPlan(locationId) {
    let plan = this._getOrCreateCurrentVisitPlan();
    const before = plan.location_ids.length;
    plan.location_ids = plan.location_ids.filter((id) => id !== locationId);
    const after = plan.location_ids.length;
    if (before === after) {
      return { success: false, message: 'Location not in current plan', visitPlan: null };
    }
    plan = this._recalculateVisitPlanDuration(plan);
    this._saveCurrentVisitPlan(plan);

    const locations = this._getFromStorage('site_locations');
    const resolvedLocations = plan.location_ids
      .map((id, idx) => {
        const l = locations.find((x) => x.id === id);
        if (!l) return null;
        return {
          id: l.id,
          name: l.name,
          orderIndex: idx
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Location removed from current visit plan',
      visitPlan: {
        id: plan.id,
        name: plan.name,
        visitPlanType: plan.visit_plan_type,
        totalEstimatedDurationMinutes: plan.total_estimated_duration_minutes,
        locationCount: plan.location_ids.length,
        locations: resolvedLocations
      }
    };
  }

  // getCurrentVisitPlan()
  getCurrentVisitPlan() {
    const plan = this._getOrCreateCurrentVisitPlan();
    const locations = this._getFromStorage('site_locations');
    const resolvedLocations = plan.location_ids
      .map((id, idx) => {
        const l = locations.find((x) => x.id === id);
        if (!l) return null;
        return {
          id: l.id,
          name: l.name,
          category: l.category,
          defaultVisitDurationMinutes: l.default_visit_duration_minutes || 0,
          orderIndex: idx
        };
      })
      .filter(Boolean);

    return {
      id: plan.id,
      name: plan.name,
      visitPlanType: plan.visit_plan_type,
      totalEstimatedDurationMinutes: plan.total_estimated_duration_minutes,
      locationCount: plan.location_ids.length,
      locations: resolvedLocations
    };
  }

  // saveCurrentVisitPlan(name, visitPlanType)
  saveCurrentVisitPlan(name, visitPlanType) {
    const current = this._getOrCreateCurrentVisitPlan();
    const plans = this._getFromStorage('visit_plans');
    const now = this._nowIso();
    const plan = {
      id: this._generateId('visit_plan'),
      name: name,
      visit_plan_type: visitPlanType,
      location_ids: current.location_ids.slice(),
      total_estimated_duration_minutes: current.total_estimated_duration_minutes,
      created_at: now,
      updated_at: now
    };
    plans.push(plan);
    this._saveToStorage('visit_plans', plans);

    return {
      success: true,
      message: 'Visit plan saved',
      visitPlan: {
        id: plan.id,
        name: plan.name,
        visitPlanType: plan.visit_plan_type,
        totalEstimatedDurationMinutes: plan.total_estimated_duration_minutes,
        locationCount: plan.location_ids.length
      }
    };
  }

  // getVisitPlanPrintableSummary(visitPlanId)
  getVisitPlanPrintableSummary(visitPlanId) {
    let plan = null;
    let locations = this._getFromStorage('site_locations');

    if (visitPlanId) {
      const plans = this._getFromStorage('visit_plans');
      plan = plans.find((p) => p.id === visitPlanId) || null;
    } else {
      plan = this._getOrCreateCurrentVisitPlan();
    }

    if (!plan) {
      return {
        html: '<html><body><p>Visit plan not found</p></body></html>',
        generatedAt: this._nowIso()
      };
    }

    const resolvedLocations = (plan.location_ids || [])
      .map((id, idx) => {
        const l = locations.find((x) => x.id === id);
        if (!l) return null;
        return { index: idx + 1, name: l.name, category: l.category };
      })
      .filter(Boolean);

    const lines = [];
    lines.push('<html><body>');
    lines.push('<h1>' + (plan.name || 'Visit Plan') + '</h1>');
    lines.push('<p>Total estimated duration: ' + (plan.total_estimated_duration_minutes || 0) + ' minutes</p>');
    lines.push('<ol>');
    resolvedLocations.forEach((l) => {
      lines.push('<li><strong>' + l.name + '</strong> (' + (l.category || '') + ')</li>');
    });
    lines.push('</ol>');
    lines.push('</body></html>');

    // Instrumentation for task completion tracking (task_8)
    try {
      localStorage.setItem('task8_printSummaryOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      html: lines.join(''),
      generatedAt: this._nowIso()
    };
  }

  // getVisitPlansList()
  getVisitPlansList() {
    const plans = this._getFromStorage('visit_plans');
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      visitPlanType: p.visit_plan_type,
      totalEstimatedDurationMinutes: p.total_estimated_duration_minutes || 0,
      locationCount: Array.isArray(p.location_ids) ? p.location_ids.length : 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
  }

  // getToursCalendarMonth(year, month)
  getToursCalendarMonth(year, month) {
    const tours = this._getFromStorage('tours');
    const y = year;
    const m = month; // 1-12
    const counts = {};

    tours.forEach((t) => {
      if (!t.start_datetime) return;
      const d = new Date(t.start_datetime);
      if (d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m) {
        const dateStr = d.toISOString().slice(0, 10);
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      }
    });

    const days = Object.keys(counts)
      .sort()
      .map((date) => ({ date, totalTours: counts[date] }));

    return { days };
  }

  // getToursForDate(date, language, timeOfDay, startTimeBefore, startTimeAfter)
  getToursForDate(date, language, timeOfDay, startTimeBefore, startTimeAfter) {
    const tours = this._getFromStorage('tours');
    const lang = language || null;
    const tod = timeOfDay || null;
    const beforeMinutes = this._parseTimeToMinutes(startTimeBefore);
    const afterMinutes = this._parseTimeToMinutes(startTimeAfter);

    const results = tours.filter((t) => {
      if (!t.start_datetime) return false;
      const d = new Date(t.start_datetime);
      const datePart = d.toISOString().slice(0, 10);
      if (datePart !== date) return false;

      if (lang && t.language !== lang) return false;

      const minutes = d.getHours() * 60 + d.getMinutes();

      if (tod === 'morning') {
        if (minutes >= 12 * 60) return false;
      } else if (tod === 'afternoon') {
        if (minutes < 12 * 60 || minutes >= 17 * 60) return false;
      } else if (tod === 'evening') {
        if (minutes < 17 * 60) return false;
      }

      if (beforeMinutes !== null && minutes >= beforeMinutes) return false;
      if (afterMinutes !== null && minutes < afterMinutes) return false;

      return true;
    });

    return results.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      startDatetime: t.start_datetime || null,
      endDatetime: t.end_datetime || null,
      language: t.language,
      tourType: t.tour_type,
      meetingPoint: t.meeting_point || '',
      maxParticipants: t.max_participants || null
    }));
  }

  // getTourDetail(tourId)
  getTourDetail(tourId) {
    const tours = this._getFromStorage('tours');
    const t = tours.find((x) => x.id === tourId);
    if (!t) return null;
    let durationMinutes = null;
    if (t.start_datetime && t.end_datetime) {
      const sd = new Date(t.start_datetime);
      const ed = new Date(t.end_datetime);
      durationMinutes = Math.round((ed.getTime() - sd.getTime()) / 60000);
    }
    return {
      id: t.id,
      title: t.title,
      description: t.description || '',
      startDatetime: t.start_datetime || null,
      endDatetime: t.end_datetime || null,
      language: t.language,
      tourType: t.tour_type,
      meetingPoint: t.meeting_point || '',
      maxParticipants: t.max_participants || null,
      durationMinutes
    };
  }

  // registerForTour(tourId, numParticipants, ticketType, contactName, contactEmail, contactPhone, notes)
  registerForTour(tourId, numParticipants, ticketType, contactName, contactEmail, contactPhone, notes) {
    const tours = this._getFromStorage('tours');
    const tour = tours.find((t) => t.id === tourId);
    if (!tour) {
      return { success: false, message: 'Tour not found', registration: null };
    }

    const regs = this._getFromStorage('tour_registrations');
    const now = this._nowIso();
    const reg = {
      id: this._generateId('tour_registration'),
      tour_id: tourId,
      num_participants: numParticipants,
      ticket_type: ticketType,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      status: 'pending',
      created_at: now,
      notes: notes || ''
    };
    regs.push(reg);
    this._saveToStorage('tour_registrations', regs);

    const registration = {
      id: reg.id,
      tourId: reg.tour_id,
      numParticipants: reg.num_participants,
      ticketType: reg.ticket_type,
      contactName: reg.contact_name,
      contactEmail: reg.contact_email,
      status: reg.status,
      createdAt: reg.created_at,
      // foreign key resolution
      tour: {
        id: tour.id,
        title: tour.title,
        description: tour.description || '',
        startDatetime: tour.start_datetime || null,
        endDatetime: tour.end_datetime || null,
        language: tour.language,
        tourType: tour.tour_type,
        meetingPoint: tour.meeting_point || '',
        maxParticipants: tour.max_participants || null
      }
    };

    return {
      success: true,
      message: 'Tour registration created',
      registration
    };
  }

  // searchTeachingResources(query, audienceLevel, period, contentType, page, pageSize)
  searchTeachingResources(query, audienceLevel, period, contentType, page, pageSize) {
    const resources = this._getFromStorage('teaching_resources');
    const q = this._safeLower(query);
    const aud = audienceLevel || null;
    const per = period || null;
    const ct = contentType || null;

    let result = resources.filter((r) => {
      if (q) {
        const text = [r.title, r.description].filter(Boolean).join(' ');
        if (!this._safeLower(text).includes(q)) return false;
      }
      if (aud && r.audience_level !== aud) return false;
      if (per && r.period !== per) return false;
      if (ct && r.content_type !== ct) return false;
      return true;
    });

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = result.length;
    const startIdx = (p - 1) * ps;
    const paged = result.slice(startIdx, startIdx + ps).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      audienceLevel: r.audience_level,
      period: r.period,
      contentType: r.content_type,
      estimatedDurationMinutes: r.estimated_duration_minutes || null
    }));

    return {
      results: paged,
      total,
      page: p,
      pageSize: ps
    };
  }

  // getTeachingResourceDetail(resourceId)
  getTeachingResourceDetail(resourceId) {
    const resources = this._getFromStorage('teaching_resources');
    const r = resources.find((x) => x.id === resourceId);
    if (!r) return null;
    return {
      id: r.id,
      title: r.title,
      description: r.description || '',
      audienceLevel: r.audience_level,
      period: r.period,
      contentType: r.content_type,
      subjectTags: r.subject_tags || [],
      estimatedDurationMinutes: r.estimated_duration_minutes || null,
      resourceUrl: r.resource_url || '',
      objectives: r.objectives || '',
      backgroundInformation: r.background_information || '',
      suggestedActivities: r.suggested_activities || ''
    };
  }

  // addResourceToReadingList(resourceId)
  addResourceToReadingList(resourceId) {
    const resources = this._getFromStorage('teaching_resources');
    const res = resources.find((r) => r.id === resourceId);
    if (!res) {
      return { success: false, message: 'Resource not found', readingList: null };
    }

    const lists = this._getFromStorage('reading_lists');
    let list = this._getOrCreateReadingList();

    if (!list.resource_ids.includes(resourceId)) {
      list.resource_ids.push(resourceId);
      list.updated_at = this._nowIso();
      const idx = lists.findIndex((l) => l.id === list.id);
      if (idx >= 0) {
        lists[idx] = list;
      } else {
        lists.push(list);
      }
      this._saveToStorage('reading_lists', lists);
    }

    const resolvedResources = list.resource_ids
      .map((id) => {
        const r = resources.find((rr) => rr.id === id);
        if (!r) return null;
        return {
          id: r.id,
          title: r.title,
          audienceLevel: r.audience_level,
          period: r.period,
          contentType: r.content_type
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Resource added to reading list',
      readingList: {
        id: list.id,
        name: list.name,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
        totalResources: list.resource_ids.length,
        resources: resolvedResources
      }
    };
  }

  // removeResourceFromReadingList(resourceId)
  removeResourceFromReadingList(resourceId) {
    const lists = this._getFromStorage('reading_lists');
    if (lists.length === 0) {
      return { success: false, message: 'Reading list not found', readingList: null };
    }
    let list = lists[0];
    const before = list.resource_ids.length;
    list.resource_ids = list.resource_ids.filter((id) => id !== resourceId);
    const after = list.resource_ids.length;
    if (before === after) {
      return { success: false, message: 'Resource not in reading list', readingList: null };
    }
    list.updated_at = this._nowIso();
    lists[0] = list;
    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      message: 'Resource removed from reading list',
      readingList: {
        id: list.id,
        name: list.name,
        updatedAt: list.updated_at,
        totalResources: list.resource_ids.length
      }
    };
  }

  // getReadingList()
  getReadingList() {
    const lists = this._getFromStorage('reading_lists');
    if (lists.length === 0) {

      // Instrumentation for task completion tracking (task_4)
      try {
        localStorage.setItem('task4_readingListViewed', 'true');
      } catch (e) {
        console.error('Instrumentation error:', e);
      }

      return {
        id: null,
        name: 'My Reading List',
        createdAt: null,
        updatedAt: null,
        totalResources: 0,
        resources: []
      };
    }
    const list = lists[0];
    const resources = this._getFromStorage('teaching_resources');

    const resolved = list.resource_ids
      .map((id) => {
        const r = resources.find((rr) => rr.id === id);
        if (!r) return null;
        return {
          id: r.id,
          title: r.title,
          description: r.description || '',
          audienceLevel: r.audience_level,
          period: r.period,
          contentType: r.content_type
        };
      })
      .filter(Boolean);

    // Instrumentation for task completion tracking (task_4)
    try {
      localStorage.setItem('task4_readingListViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      id: list.id,
      name: list.name,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
      totalResources: list.resource_ids.length,
      resources: resolved
    };
  }

  // getReadingListPrintableView()
  getReadingListPrintableView() {
    const list = this.getReadingList();
    const lines = [];
    lines.push('<html><body>');
    lines.push('<h1>' + (list.name || 'My Reading List') + '</h1>');
    lines.push('<ul>');
    (list.resources || []).forEach((r) => {
      lines.push('<li><strong>' + r.title + '</strong> (' + (r.period || '') + ')</li>');
    });
    lines.push('</ul>');
    lines.push('</body></html>');
    return {
      html: lines.join(''),
      generatedAt: this._nowIso()
    };
  }

  // getTestimonies(query, ageCategory, minAgeAtWarStart, maxAgeAtWarStart, sortBy, page, pageSize)
  getTestimonies(query, ageCategory, minAgeAtWarStart, maxAgeAtWarStart, sortBy, page, pageSize) {
    const testimonies = this._getFromStorage('testimonies');
    const q = this._safeLower(query);
    const ageCat = ageCategory || null;
    const minAge = typeof minAgeAtWarStart === 'number' ? minAgeAtWarStart : null;
    const maxAge = typeof maxAgeAtWarStart === 'number' ? maxAgeAtWarStart : null;

    let result = testimonies.filter((t) => {
      if (q) {
        const text = [t.person_name, t.summary, (t.locations || []).join(' ')]
          .filter(Boolean)
          .join(' ');
        if (!this._safeLower(text).includes(q)) return false;
      }
      if (ageCat && t.age_category !== ageCat) return false;
      if (minAge !== null && typeof t.age_at_war_start === 'number' && t.age_at_war_start < minAge) return false;
      if (maxAge !== null && typeof t.age_at_war_start === 'number' && t.age_at_war_start > maxAge) return false;
      return true;
    });

    const sort = sortBy || 'recording_date_desc';
    result.sort((a, b) => {
      if (sort === 'recording_date_asc') {
        const da = a.recording_date ? new Date(a.recording_date).getTime() : 0;
        const db = b.recording_date ? new Date(b.recording_date).getTime() : 0;
        return da - db;
      }
      if (sort === 'person_name_asc') {
        return this._safeLower(a.person_name).localeCompare(this._safeLower(b.person_name));
      }
      // default recording_date_desc
      const da = a.recording_date ? new Date(a.recording_date).getTime() : 0;
      const db = b.recording_date ? new Date(b.recording_date).getTime() : 0;
      return db - da;
    });

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = result.length;
    const startIdx = (p - 1) * ps;
    const paged = result.slice(startIdx, startIdx + ps).map((t) => ({
      id: t.id,
      personName: t.person_name,
      summary: t.summary || '',
      ageAtWarStart: typeof t.age_at_war_start === 'number' ? t.age_at_war_start : null,
      ageCategory: t.age_category,
      recordingDate: t.recording_date || null,
      locations: t.locations || [],
      hasAudio: t.has_audio === true,
      hasVideo: t.has_video === true
    }));

    return {
      results: paged,
      total,
      page: p,
      pageSize: ps
    };
  }

  // getTestimonyDetail(testimonyId)
  getTestimonyDetail(testimonyId) {
    const testimonies = this._getFromStorage('testimonies');
    const t = testimonies.find((x) => x.id === testimonyId);
    if (!t) return null;

    const slists = this._getFromStorage('saved_testimonies_lists');
    const list = slists[0] || null;
    let isSaved = false;
    if (list && Array.isArray(list.testimony_ids)) {
      isSaved = list.testimony_ids.includes(testimonyId);
    }

    return {
      id: t.id,
      personName: t.person_name,
      summary: t.summary || '',
      ageAtWarStart: typeof t.age_at_war_start === 'number' ? t.age_at_war_start : null,
      ageCategory: t.age_category,
      recordingDate: t.recording_date || null,
      locations: t.locations || [],
      hasAudio: t.has_audio === true,
      hasVideo: t.has_video === true,
      transcriptUrl: t.transcript_url || '',
      languages: t.languages || [],
      isSaved
    };
  }

  // addTestimonyToSaved(testimonyId)
  addTestimonyToSaved(testimonyId) {
    const testimonies = this._getFromStorage('testimonies');
    const t = testimonies.find((x) => x.id === testimonyId);
    if (!t) {
      return { success: false, message: 'Testimony not found', savedList: null };
    }

    const lists = this._getFromStorage('saved_testimonies_lists');
    let list = this._getOrCreateSavedTestimoniesList();

    if (!list.testimony_ids.includes(testimonyId)) {
      list.testimony_ids.push(testimonyId);
      list.updated_at = this._nowIso();
      const idx = lists.findIndex((l) => l.id === list.id);
      if (idx >= 0) {
        lists[idx] = list;
      } else {
        lists.push(list);
      }
      this._saveToStorage('saved_testimonies_lists', lists);
    }

    const resolved = list.testimony_ids
      .map((id) => {
        const tt = testimonies.find((x) => x.id === id);
        if (!tt) return null;
        return {
          id: tt.id,
          personName: tt.person_name,
          recordingDate: tt.recording_date || null
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Testimony added to saved list',
      savedList: {
        id: list.id,
        name: list.name,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
        totalTestimonies: list.testimony_ids.length,
        testimonies: resolved
      }
    };
  }

  // removeTestimonyFromSaved(testimonyId)
  removeTestimonyFromSaved(testimonyId) {
    const lists = this._getFromStorage('saved_testimonies_lists');
    if (lists.length === 0) {
      return { success: false, message: 'Saved testimonies list not found', savedList: null };
    }
    let list = lists[0];
    const before = list.testimony_ids.length;
    list.testimony_ids = list.testimony_ids.filter((id) => id !== testimonyId);
    const after = list.testimony_ids.length;
    if (before === after) {
      return { success: false, message: 'Testimony not in saved list', savedList: null };
    }
    list.updated_at = this._nowIso();
    lists[0] = list;
    this._saveToStorage('saved_testimonies_lists', lists);

    return {
      success: true,
      message: 'Testimony removed from saved list',
      savedList: {
        id: list.id,
        name: list.name,
        updatedAt: list.updated_at,
        totalTestimonies: list.testimony_ids.length
      }
    };
  }

  // getSavedTestimonies()
  getSavedTestimonies() {
    const lists = this._getFromStorage('saved_testimonies_lists');
    if (lists.length === 0) {
      return {
        id: null,
        name: 'Saved Testimonies',
        createdAt: null,
        updatedAt: null,
        totalTestimonies: 0,
        testimonies: []
      };
    }
    const list = lists[0];
    const testimonies = this._getFromStorage('testimonies');

    const resolved = list.testimony_ids
      .map((id) => {
        const t = testimonies.find((tt) => tt.id === id);
        if (!t) return null;
        return {
          id: t.id,
          personName: t.person_name,
          recordingDate: t.recording_date || null,
          ageCategory: t.age_category
        };
      })
      .filter(Boolean);

    return {
      id: list.id,
      name: list.name,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
      totalTestimonies: list.testimony_ids.length,
      testimonies: resolved
    };
  }

  // getSavedTestimoniesPrintableView()
  getSavedTestimoniesPrintableView() {
    const list = this.getSavedTestimonies();
    const lines = [];
    lines.push('<html><body>');
    lines.push('<h1>' + (list.name || 'Saved Testimonies') + '</h1>');
    lines.push('<ul>');
    (list.testimonies || []).forEach((t) => {
      lines.push('<li><strong>' + t.personName + '</strong> (' + (t.recordingDate || '') + ')</li>');
    });
    lines.push('</ul>');
    lines.push('</body></html>');
    return {
      html: lines.join(''),
      generatedAt: this._nowIso()
    };
  }

  // getEventsCalendarMonth(year, month)
  getEventsCalendarMonth(year, month) {
    const events = this._getFromStorage('program_events');
    const y = year;
    const m = month;
    const counts = {};

    events.forEach((e) => {
      if (!e.start_datetime) return;
      const d = new Date(e.start_datetime);
      if (d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m) {
        const dateStr = d.toISOString().slice(0, 10);
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      }
    });

    const days = Object.keys(counts)
      .sort()
      .map((date) => ({ date, totalEvents: counts[date] }));

    return { days };
  }

  // getProgramEventsForDate(date, eventType, topicTag)
  getProgramEventsForDate(date, eventType, topicTag) {
    const events = this._getFromStorage('program_events');
    const etype = eventType || null;
    const tag = topicTag || null;

    return events
      .filter((e) => {
        if (!e.start_datetime) return false;
        const d = new Date(e.start_datetime);
        const datePart = d.toISOString().slice(0, 10);
        if (datePart !== date) return false;
        if (etype && e.event_type !== etype) return false;
        if (tag) {
          const tags = e.topic_tags || [];
          if (!tags.includes(tag)) return false;
        }
        return true;
      })
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description || '',
        startDatetime: e.start_datetime || null,
        endDatetime: e.end_datetime || null,
        eventType: e.event_type,
        topicTags: e.topic_tags || [],
        locationName: e.location_name || '',
        isRegistrationRequired: e.is_registration_required === true
      }));
  }

  // addProgramEventToSchedule(programEventId)
  addProgramEventToSchedule(programEventId) {
    const events = this._getFromStorage('program_events');
    const e = events.find((x) => x.id === programEventId);
    if (!e) {
      return { success: false, message: 'Program event not found', schedule: null };
    }

    const dateStr = this._getDatePart(e.start_datetime);
    if (!dateStr) {
      return { success: false, message: 'Invalid event date', schedule: null };
    }

    const schedules = this._getFromStorage('visit_schedules');
    let schedule = this._getOrCreateVisitScheduleForDate(dateStr);

    if (!schedule.program_event_ids.includes(programEventId)) {
      schedule.program_event_ids.push(programEventId);
      schedule.updated_at = this._nowIso();
      const idx = schedules.findIndex((s) => s.id === schedule.id);
      if (idx >= 0) {
        schedules[idx] = schedule;
      } else {
        schedules.push(schedule);
      }
      this._saveToStorage('visit_schedules', schedules);
    }

    const resolvedEvents = schedule.program_event_ids
      .map((id) => {
        const ev = events.find((x) => x.id === id);
        if (!ev) return null;
        return {
          id: ev.id,
          title: ev.title,
          startDatetime: ev.start_datetime || null,
          endDatetime: ev.end_datetime || null,
          eventType: ev.event_type
        };
      })
      .filter(Boolean);

    return {
      success: true,
      message: 'Program event added to schedule',
      schedule: {
        id: schedule.id,
        date: schedule.date,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at,
        programEvents: resolvedEvents,
        totalEvents: schedule.program_event_ids.length
      }
    };
  }

  // removeProgramEventFromSchedule(programEventId)
  removeProgramEventFromSchedule(programEventId) {
    const schedules = this._getFromStorage('visit_schedules');
    let schedule = null;
    let idx = -1;
    for (let i = 0; i < schedules.length; i++) {
      if (Array.isArray(schedules[i].program_event_ids) && schedules[i].program_event_ids.includes(programEventId)) {
        schedule = schedules[i];
        idx = i;
        break;
      }
    }
    if (!schedule) {
      return { success: false, message: 'Program event not found in any schedule', schedule: null };
    }

    const before = schedule.program_event_ids.length;
    schedule.program_event_ids = schedule.program_event_ids.filter((id) => id !== programEventId);
    const after = schedule.program_event_ids.length;
    if (before === after) {
      return { success: false, message: 'Program event not in schedule', schedule: null };
    }
    schedule.updated_at = this._nowIso();
    schedules[idx] = schedule;
    this._saveToStorage('visit_schedules', schedules);

    return {
      success: true,
      message: 'Program event removed from schedule',
      schedule: {
        id: schedule.id,
        date: schedule.date,
        updatedAt: schedule.updated_at,
        totalEvents: schedule.program_event_ids.length
      }
    };
  }

  // getVisitScheduleForDate(date)
  getVisitScheduleForDate(date) {
    const schedules = this._getFromStorage('visit_schedules');
    const schedule = schedules.find((s) => s.date === date);
    if (!schedule) {

      // Instrumentation for task completion tracking (task_6)
      try {
        localStorage.setItem('task6_scheduleViewed', 'true');
      } catch (e) {
        console.error('Instrumentation error:', e);
      }

      return {
        id: null,
        date,
        createdAt: null,
        updatedAt: null,
        programEvents: [],
        totalEvents: 0
      };
    }

    const events = this._getFromStorage('program_events');
    const resolvedEvents = schedule.program_event_ids
      .map((id) => {
        const e = events.find((x) => x.id === id);
        if (!e) return null;
        return {
          id: e.id,
          title: e.title,
          startDatetime: e.start_datetime || null,
          endDatetime: e.end_datetime || null,
          eventType: e.event_type
        };
      })
      .filter(Boolean);

    // Instrumentation for task completion tracking (task_6)
    try {
      localStorage.setItem('task6_scheduleViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      id: schedule.id,
      date: schedule.date,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
      programEvents: resolvedEvents,
      totalEvents: schedule.program_event_ids.length
    };
  }

  // getVisitSchedulePrintableView(date)
  getVisitSchedulePrintableView(date) {
    let schedule = null;
    if (date) {
      schedule = this.getVisitScheduleForDate(date);
      if (!schedule || !schedule.id) {
        return {
          html: '<html><body><p>No schedule for this date</p></body></html>',
          generatedAt: this._nowIso()
        };
      }
    } else {
      const schedules = this._getFromStorage('visit_schedules');
      if (schedules.length === 0) {
        return {
          html: '<html><body><p>No schedules found</p></body></html>',
          generatedAt: this._nowIso()
        };
      }
      schedules.sort((a, b) => {
        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return db - da;
      });
      const latest = schedules[0];
      schedule = this.getVisitScheduleForDate(latest.date);
    }

    const lines = [];
    lines.push('<html><body>');
    lines.push('<h1>Visit Schedule for ' + (schedule.date || '') + '</h1>');
    lines.push('<ul>');
    (schedule.programEvents || []).forEach((e) => {
      lines.push('<li><strong>' + e.title + '</strong> (' + (e.startDatetime || '') + ')</li>');
    });
    lines.push('</ul>');
    lines.push('</body></html>');
    return {
      html: lines.join(''),
      generatedAt: this._nowIso()
    };
  }

  // getSupportOverview()
  getSupportOverview() {
    const raw = localStorage.getItem('support_overview');
    let introText = '';
    let supportOptions = [];
    let designationOptions = [];
    let suggestedAmounts = [];

    if (raw) {
      try {
        const cfg = JSON.parse(raw);
        introText = cfg.introText || '';
        supportOptions = Array.isArray(cfg.supportOptions) ? cfg.supportOptions : [];
        designationOptions = Array.isArray(cfg.designationOptions) ? cfg.designationOptions : [];
        suggestedAmounts = Array.isArray(cfg.suggestedAmounts) ? cfg.suggestedAmounts : [];
      } catch (e) {}
    }

    return {
      introText,
      supportOptions,
      designationOptions,
      suggestedAmounts
    };
  }

  // createSupportPledge(amount, currency, frequency, designation, donorName, donorEmail, message)
  createSupportPledge(amount, currency, frequency, designation, donorName, donorEmail, message) {
    const pledgeEntity = this._getOrCreateSupportPledgeRecord({
      amount,
      currency,
      frequency,
      designation,
      donorName,
      donorEmail,
      message
    });

    const pledge = {
      id: pledgeEntity.id,
      amount: pledgeEntity.amount,
      currency: pledgeEntity.currency,
      frequency: pledgeEntity.frequency,
      designation: pledgeEntity.designation,
      donorName: pledgeEntity.donor_name,
      donorEmail: pledgeEntity.donor_email,
      status: pledgeEntity.status,
      createdAt: pledgeEntity.created_at
    };

    return {
      success: true,
      message: 'Support pledge created',
      pledge
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    let missionText = '';
    let historicalBackgroundText = '';
    let curatorialApproachText = '';
    let contact = { email: '', postalAddress: '', phone: '' };
    let accessibilitySummary = '';
    let legal = { privacyText: '', termsText: '', copyrightText: '' };

    if (raw) {
      try {
        const cfg = JSON.parse(raw);
        missionText = cfg.missionText || '';
        historicalBackgroundText = cfg.historicalBackgroundText || '';
        curatorialApproachText = cfg.curatorialApproachText || '';
        if (cfg.contact) {
          contact = {
            email: cfg.contact.email || '',
            postalAddress: cfg.contact.postalAddress || '',
            phone: cfg.contact.phone || ''
          };
        }
        accessibilitySummary = cfg.accessibilitySummary || '';
        if (cfg.legal) {
          legal = {
            privacyText: cfg.legal.privacyText || '',
            termsText: cfg.legal.termsText || '',
            copyrightText: cfg.legal.copyrightText || ''
          };
        }
      } catch (e) {}
    }

    return {
      missionText,
      historicalBackgroundText,
      curatorialApproachText,
      contact,
      accessibilitySummary,
      legal
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
