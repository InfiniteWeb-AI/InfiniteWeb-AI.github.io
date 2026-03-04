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
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const tables = [
      'dj_packages',
      'dj_add_ons',
      'dj_booking_requests',
      'custom_dj_packages',
      'dj_package_quote_requests',
      'dance_classes',
      'class_interest_registrations',
      'gallery_media',
      'calendar_slots',
      'private_lesson_requests',
      'online_tutorials',
      'tutorial_bundles',
      'tutorial_bundle_items',
      'testimonials',
      'faq_categories',
      'faq_items',
      'contact_inquiries',
      'newsletter_subscriptions',
      'sessions'
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

  // -------------------- Formatting helpers --------------------

  _formatPrice(value) {
    if (typeof value !== 'number' || isNaN(value)) return '';
    try {
      return '$' + value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    } catch (e) {
      return '$' + value.toFixed(2);
    }
  }

  _formatDurationHours(hours) {
    if (typeof hours !== 'number' || isNaN(hours)) return '';
    return hours + ' hour' + (hours === 1 ? '' : 's');
  }

  _formatDurationSeconds(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '';
    const total = Math.max(0, Math.round(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return mins + ':' + (secs < 10 ? '0' + secs : secs);
  }

  _capitalizeWords(str) {
    if (!str) return '';
    return str
      .split(/[_\s]+/)
      .map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');
  }

  _formatStyle(style) {
    if (!style) return '';
    switch (style) {
      case 'salsa': return 'Salsa';
      case 'bachata': return 'Bachata';
      case 'hip_hop': return 'Hip-Hop';
      case 'latin_fusion': return 'Latin Fusion';
      case 'wedding': return 'Wedding';
      case 'corporate_event': return 'Corporate Event';
      case 'party_birthday': return 'Party & Birthday';
      default: return this._capitalizeWords(style);
    }
  }

  _formatLevel(level) {
    if (!level) return '';
    switch (level) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      case 'all_levels': return 'All levels';
      default: return this._capitalizeWords(level);
    }
  }

  _formatDayOfWeek(day) {
    if (!day) return '';
    switch (day) {
      case 'monday': return 'Monday';
      case 'tuesday': return 'Tuesday';
      case 'wednesday': return 'Wednesday';
      case 'thursday': return 'Thursday';
      case 'friday': return 'Friday';
      case 'saturday': return 'Saturday';
      case 'sunday': return 'Sunday';
      default: return this._capitalizeWords(day);
    }
  }

  _formatEventType(eventType) {
    if (!eventType) return '';
    switch (eventType) {
      case 'wedding': return 'Wedding';
      case 'corporate_event': return 'Corporate event';
      case 'party_birthday': return 'Party / Birthday';
      case 'private_lesson': return 'Private lesson';
      default: return this._capitalizeWords(eventType);
    }
  }

  _formatDateLabel(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    try {
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return date.toISOString().slice(0, 10);
    }
  }

  // -------------------- Date & time helpers --------------------

  _parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const s = String(dateStr).trim();
    let m;
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) {
      const month = parseInt(m[1], 10) - 1;
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      return isNaN(d.getTime()) ? null : d;
    }
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  _parseDateToISOString(dateStr) {
    const d = this._parseDate(dateStr);
    return d ? d.toISOString() : null;
  }

  _timeStringToMinutes(timeStr) {
    if (!timeStr) return null;
    const s = String(timeStr).trim().toUpperCase();
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(s);
    if (!m) return null;
    let hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    const ampm = m[3];
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  _getDayOfWeekNameFromDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const day = date.getUTCDay(); // 0 = Sunday
    switch (day) {
      case 0: return 'sunday';
      case 1: return 'monday';
      case 2: return 'tuesday';
      case 3: return 'wednesday';
      case 4: return 'thursday';
      case 5: return 'friday';
      case 6: return 'saturday';
      default: return '';
    }
  }

  // -------------------- Session helpers --------------------

  _getCurrentUserSession() {
    let sessionId = localStorage.getItem('current_session_id');
    let sessions = this._getFromStorage('sessions');
    if (!sessionId) {
      sessionId = this._generateId('sess');
      const now = new Date().toISOString();
      sessions.push({ id: sessionId, created_at: now });
      this._saveToStorage('sessions', sessions);
      localStorage.setItem('current_session_id', sessionId);
    } else {
      const exists = sessions.some(function (s) { return s.id === sessionId; });
      if (!exists) {
        const now = new Date().toISOString();
        sessions.push({ id: sessionId, created_at: now });
        this._saveToStorage('sessions', sessions);
      }
    }
    return { id: sessionId };
  }

  // -------------------- Custom DJ package helpers --------------------

  _getOrCreateCustomDJPackageDraft(sessionId, basePackageId, budgetLimit) {
    const now = new Date().toISOString();
    let customs = this._getFromStorage('custom_dj_packages');
    const djPackages = this._getFromStorage('dj_packages');
    const basePackage = djPackages.find(function (p) { return p.id === basePackageId; }) || null;
    if (!basePackage) return null;

    let draft = customs.find(function (c) {
      return c.session_id === sessionId && c.base_package_id === basePackageId;
    });

    if (!draft) {
      draft = {
        id: this._generateId('cdjpkg'),
        session_id: sessionId,
        base_package_id: basePackageId,
        selected_add_on_ids: [],
        computed_duration_hours: basePackage.duration_hours || 0,
        base_price: basePackage.base_price || 0,
        add_ons_total_price: 0,
        total_price: basePackage.base_price || 0,
        budget_limit: typeof budgetLimit === 'number' ? budgetLimit : null,
        is_under_budget: true,
        created_at: now
      };
      customs.push(draft);
      this._saveToStorage('custom_dj_packages', customs);
    } else if (typeof budgetLimit === 'number') {
      draft.budget_limit = budgetLimit;
      const updated = this._calculateCustomDJPackageTotals(draft, basePackage, draft.selected_add_on_ids);
      draft.add_ons_total_price = updated.add_ons_total_price;
      draft.total_price = updated.total_price;
      draft.computed_duration_hours = updated.computed_duration_hours;
      draft.is_under_budget = updated.is_under_budget;
      this._saveToStorage('custom_dj_packages', customs);
    }

    return draft;
  }

  _calculateCustomDJPackageTotals(customPackage, basePackage, selectedAddOnIds) {
    const djAddOns = this._getFromStorage('dj_add_ons');
    const allowedIds = Array.isArray(basePackage.allowed_add_on_ids) ? basePackage.allowed_add_on_ids : [];
    const selected = (selectedAddOnIds || []).filter(function (id) {
      return allowedIds.indexOf(id) !== -1;
    });

    let addOnsTotal = 0;
    for (let i = 0; i < selected.length; i++) {
      const addOn = djAddOns.find(function (a) { return a.id === selected[i]; });
      if (addOn && addOn.is_active) {
        addOnsTotal += addOn.price || 0;
      }
    }

    const basePrice = basePackage.base_price || 0;
    const totalPrice = basePrice + addOnsTotal;
    const budgetLimit = typeof customPackage.budget_limit === 'number' ? customPackage.budget_limit : null;
    const isUnderBudget = budgetLimit == null ? true : totalPrice <= budgetLimit;

    return {
      computed_duration_hours: basePackage.duration_hours || 0,
      base_price: basePrice,
      add_ons_total_price: addOnsTotal,
      total_price: totalPrice,
      is_under_budget: isUnderBudget
    };
  }

  // -------------------- Tutorial bundle helpers --------------------

  _getOrCreateCurrentTutorialBundle(sessionId) {
    let bundles = this._getFromStorage('tutorial_bundles');
    const now = new Date().toISOString();
    let bundle = bundles.find(function (b) {
      return b.session_id === sessionId && b.status === 'draft';
    });

    if (!bundle) {
      bundle = {
        id: this._generateId('tbndl'),
        session_id: sessionId,
        status: 'draft',
        total_price: 0,
        payment_preference: 'pay_at_first_in_person_lesson',
        created_at: now
      };
      bundles.push(bundle);
      this._saveToStorage('tutorial_bundles', bundles);
    }

    return bundle;
  }

  _recalculateTutorialBundleTotals(bundleId) {
    let bundles = this._getFromStorage('tutorial_bundles');
    let items = this._getFromStorage('tutorial_bundle_items');
    const tutorials = this._getFromStorage('online_tutorials');

    const bundle = bundles.find(function (b) { return b.id === bundleId; });
    if (!bundle) {
      return { totalItems: 0, totalPrice: 0 };
    }

    const bundleItems = items.filter(function (it) { return it.bundle_id === bundleId; });
    let totalPrice = 0;
    for (let i = 0; i < bundleItems.length; i++) {
      const tut = tutorials.find(function (t) { return t.id === bundleItems[i].tutorial_id; });
      if (tut && tut.is_active) {
        totalPrice += tut.price || 0;
      }
    }

    bundle.total_price = totalPrice;
    this._saveToStorage('tutorial_bundles', bundles);

    return { totalItems: bundleItems.length, totalPrice: totalPrice };
  }

  // -------------------- Calendar helpers --------------------

  _filterCalendarSlots(slots, startDateStr, endDateStr, dayOfWeekFilter, timeRange) {
    const startDate = this._parseDate(startDateStr);
    const endDate = this._parseDate(endDateStr);
    const dayFilter = Array.isArray(dayOfWeekFilter) ? dayOfWeekFilter.map(function (d) { return String(d).toLowerCase(); }) : null;
    const startMinutes = timeRange && timeRange.startTime ? this._timeStringToMinutes(timeRange.startTime) : null;
    const endMinutes = timeRange && timeRange.endTime ? this._timeStringToMinutes(timeRange.endTime) : null;

    const result = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot.is_available) continue;
      const d = this._parseDate(slot.date);
      if (!d) continue;
      if (startDate && d < startDate) continue;
      if (endDate && d > endDate) continue;

      const dayName = this._getDayOfWeekNameFromDate(d);
      if (dayFilter && dayFilter.length > 0 && dayFilter.indexOf(dayName) === -1) continue;

      const slotStartMinutes = this._timeStringToMinutes(slot.start_time);
      if (startMinutes != null && slotStartMinutes != null && slotStartMinutes < startMinutes) continue;
      if (endMinutes != null && slotStartMinutes != null && slotStartMinutes > endMinutes) continue;

      result.push(slot);
    }
    return result;
  }

  // ============================================================
  // Core interface implementations
  // ============================================================

  // -------------------- Homepage / DJ packages --------------------

  getFeaturedDJPackages() {
    const djPackages = this._getFromStorage('dj_packages');
    const active = djPackages.filter(function (p) { return p.status === 'active'; });

    const sectionsMap = {};
    for (let i = 0; i < active.length; i++) {
      const pkg = active[i];
      const category = pkg.category || 'other';
      const sectionLabel = pkg.section_label || this._formatStyle(category) + ' DJ Packages';
      const key = category + '::' + sectionLabel;
      if (!sectionsMap[key]) {
        sectionsMap[key] = {
          category: category,
          section_label: sectionLabel,
          packages: []
        };
      }
      sectionsMap[key].packages.push({
        id: pkg.id,
        name: pkg.name,
        duration_hours: pkg.duration_hours,
        duration_label: this._formatDurationHours(pkg.duration_hours),
        base_price: pkg.base_price,
        price_label: this._formatPrice(pkg.base_price),
        includes_dance_floor_lighting: !!pkg.includes_dance_floor_lighting,
        is_customizable: !!pkg.is_customizable,
        highlight_badge: ''
      });
    }

    const sections = [];
    for (const key in sectionsMap) {
      if (Object.prototype.hasOwnProperty.call(sectionsMap, key)) {
        sections.push(sectionsMap[key]);
      }
    }

    return { sections: sections };
  }

  getUpcomingGroupClasses(maxItems) {
    const limit = typeof maxItems === 'number' ? maxItems : 4;
    const classes = this._getFromStorage('dance_classes');

    const filtered = classes.filter(function (c) {
      return c.is_active && c.is_group_class;
    });

    filtered.sort(function (a, b) {
      const order = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      const ai = order.indexOf(a.day_of_week);
      const bi = order.indexOf(b.day_of_week);
      if (ai !== bi) return ai - bi;
      const at = a.start_time || '';
      const bt = b.start_time || '';
      const am = at ? a.start_time : '';
      const bm = bt ? b.start_time : '';
      const amins = am ? this._timeStringToMinutes(am) : 0;
      const bmins = bm ? this._timeStringToMinutes(bm) : 0;
      return amins - bmins;
    }.bind(this));

    const result = [];
    for (let i = 0; i < filtered.length && result.length < limit; i++) {
      const cls = filtered[i];
      result.push({
        id: cls.id,
        title: cls.title,
        style: cls.style,
        style_label: this._formatStyle(cls.style),
        level: cls.level,
        level_label: this._formatLevel(cls.level),
        day_of_week: cls.day_of_week,
        day_of_week_label: this._formatDayOfWeek(cls.day_of_week),
        start_time: cls.start_time,
        end_time: cls.end_time,
        price_per_class: cls.price_per_class,
        price_label: this._formatPrice(cls.price_per_class),
        location: cls.location
      });
    }

    return result;
  }

  getFeaturedGalleryItems(type, maxItems) {
    const limit = typeof maxItems === 'number' ? maxItems : 6;
    const media = this._getFromStorage('gallery_media');

    const filtered = media.filter(function (m) {
      if (m.visibility && m.visibility !== 'public') return false;
      if (type && m.type !== type) return false;
      return m.is_featured === true;
    });

    filtered.sort(function (a, b) {
      const ad = a.created_at || '';
      const bd = b.created_at || '';
      if (ad === bd) return 0;
      return ad > bd ? -1 : 1;
    });

    const result = [];
    for (let i = 0; i < filtered.length && result.length < limit; i++) {
      const item = filtered[i];
      result.push({
        id: item.id,
        type: item.type,
        title: item.title || '',
        style: item.style || '',
        style_label: this._formatStyle(item.style),
        thumbnail_url: item.thumbnail_url || '',
        duration_seconds: item.duration_seconds || 0,
        duration_label: item.type === 'video' && item.duration_seconds ? this._formatDurationSeconds(item.duration_seconds) : '',
        is_featured: !!item.is_featured
      });
    }

    return result;
  }

  getFeaturedTestimonials(maxItems) {
    const limit = typeof maxItems === 'number' ? maxItems : 3;
    const testimonials = this._getFromStorage('testimonials');

    const visible = testimonials.filter(function (t) {
      return t.status === 'visible' && t.is_featured;
    });

    visible.sort(function (a, b) {
      if (b.rating !== a.rating) return b.rating - a.rating;
      const ad = a.created_at || '';
      const bd = b.created_at || '';
      if (ad === bd) return 0;
      return ad > bd ? -1 : 1;
    });

    const result = [];
    for (let i = 0; i < visible.length && result.length < limit; i++) {
      const t = visible[i];
      const excerpt = t.content ? (t.content.length > 200 ? t.content.slice(0, 197) + '...' : t.content) : '';
      result.push({
        id: t.id,
        title: t.title || '',
        rating: t.rating,
        excerpt: excerpt,
        client_name: t.client_name || '',
        client_company_name: t.client_company_name || '',
        event_type: t.event_type,
        event_type_label: this._formatEventType(t.event_type)
      });
    }

    return result;
  }

  // -------------------- DJ Services page / packages --------------------

  getDJPackagesForServicesPage() {
    const djPackages = this._getFromStorage('dj_packages');
    const active = djPackages.filter(function (p) { return p.status === 'active'; });

    const sectionsMap = {};
    for (let i = 0; i < active.length; i++) {
      const pkg = active[i];
      const category = pkg.category || 'other';
      const sectionLabel = pkg.section_label || this._formatStyle(category) + ' DJ Packages';
      const key = category + '::' + sectionLabel;
      if (!sectionsMap[key]) {
        sectionsMap[key] = {
          category: category,
          section_label: sectionLabel,
          packages: []
        };
      }

      const description = pkg.description || '';
      const descriptionShort = description.length > 160 ? description.slice(0, 157) + '...' : description;

      sectionsMap[key].packages.push({
        id: pkg.id,
        name: pkg.name,
        duration_hours: pkg.duration_hours,
        duration_label: this._formatDurationHours(pkg.duration_hours),
        base_price: pkg.base_price,
        price_label: this._formatPrice(pkg.base_price),
        includes_dance_floor_lighting: !!pkg.includes_dance_floor_lighting,
        description_short: descriptionShort,
        is_customizable: !!pkg.is_customizable,
        show_customize_button: !!pkg.is_customizable,
        highlight_badge: ''
      });
    }

    const sections = [];
    for (const key in sectionsMap) {
      if (Object.prototype.hasOwnProperty.call(sectionsMap, key)) {
        sections.push(sectionsMap[key]);
      }
    }

    return { sections: sections };
  }

  getDJPackageDetail(packageId) {
    const djPackages = this._getFromStorage('dj_packages');
    const addOns = this._getFromStorage('dj_add_ons');

    const pkg = djPackages.find(function (p) { return p.id === packageId; });
    if (!pkg) {
      return null;
    }

    const allowedIds = Array.isArray(pkg.allowed_add_on_ids) ? pkg.allowed_add_on_ids : [];
    const addOnNames = [];
    for (let i = 0; i < allowedIds.length; i++) {
      const ao = addOns.find(function (a) { return a.id === allowedIds[i]; });
      if (ao && ao.is_active) {
        addOnNames.push(ao.name);
      }
    }

    const eligibility = {
      meets_wedding_under_1200_with_lighting_4h:
        pkg.category === 'wedding' &&
        !!pkg.includes_dance_floor_lighting &&
        (pkg.duration_hours || 0) >= 4 &&
        (pkg.base_price || 0) <= 1200
    };

    return {
      id: pkg.id,
      name: pkg.name,
      category: pkg.category,
      category_label: this._formatEventType(pkg.category),
      section_label: pkg.section_label || '',
      duration_hours: pkg.duration_hours,
      duration_label: this._formatDurationHours(pkg.duration_hours),
      base_price: pkg.base_price,
      price_label: this._formatPrice(pkg.base_price),
      includes_dance_floor_lighting: !!pkg.includes_dance_floor_lighting,
      description: pkg.description || '',
      is_customizable: !!pkg.is_customizable,
      add_on_names: addOnNames,
      eligibility_flags: eligibility
    };
  }

  submitDJBookingRequest(
    packageId,
    eventType,
    eventDate,
    eventStartTime,
    eventEndTime,
    eventLocation,
    guestCountTier,
    notes,
    contactName,
    contactEmail
  ) {
    const djPackages = this._getFromStorage('dj_packages');
    const pkg = djPackages.find(function (p) { return p.id === packageId; });
    if (!pkg) {
      return {
        success: false,
        booking_request_id: null,
        status: 'error',
        message: 'Selected DJ package not found.'
      };
    }

    const bookingRequests = this._getFromStorage('dj_booking_requests');
    const id = this._generateId('djbook');
    const eventDateIso = this._parseDateToISOString(eventDate);
    const now = new Date().toISOString();

    const record = {
      id: id,
      package_id: packageId,
      event_type: eventType || pkg.category || 'other',
      event_date: eventDateIso,
      event_start_time: eventStartTime,
      event_end_time: eventEndTime,
      event_location: eventLocation,
      guest_count_tier: guestCountTier || null,
      notes: notes || '',
      contact_email: contactEmail || '',
      contact_name: contactName || '',
      status: 'pending',
      created_at: now
    };

    bookingRequests.push(record);
    this._saveToStorage('dj_booking_requests', bookingRequests);

    return {
      success: true,
      booking_request_id: id,
      status: 'pending',
      message: 'Your DJ booking request has been submitted.'
    };
  }

  startDJPackageCustomization(basePackageId, budgetLimit) {
    const session = this._getCurrentUserSession();
    const draft = this._getOrCreateCustomDJPackageDraft(session.id, basePackageId, budgetLimit);
    if (!draft) {
      return {
        draft_custom_package_id: null,
        budget_limit: typeof budgetLimit === 'number' ? budgetLimit : null,
        base_package: null,
        available_add_ons: [],
        current_selection: {
          selected_add_on_ids: [],
          computed_duration_hours: 0,
          base_price: 0,
          add_ons_total_price: 0,
          total_price: 0,
          total_price_label: this._formatPrice(0),
          is_under_budget: true
        }
      };
    }

    const djPackages = this._getFromStorage('dj_packages');
    const addOns = this._getFromStorage('dj_add_ons');
    const basePackage = djPackages.find(function (p) { return p.id === basePackageId; });

    const allowedIds = Array.isArray(basePackage.allowed_add_on_ids) ? basePackage.allowed_add_on_ids : [];
    const availableAddOns = [];
    for (let i = 0; i < allowedIds.length; i++) {
      const ao = addOns.find(function (a) { return a.id === allowedIds[i]; });
      if (ao && ao.is_active) {
        availableAddOns.push({
          id: ao.id,
          name: ao.name,
          description: ao.description || '',
          price: ao.price,
          price_label: this._formatPrice(ao.price),
          category: ao.category
        });
      }
    }

    const currentTotals = this._calculateCustomDJPackageTotals(draft, basePackage, draft.selected_add_on_ids);

    return {
      draft_custom_package_id: draft.id,
      budget_limit: draft.budget_limit,
      base_package: {
        id: basePackage.id,
        name: basePackage.name,
        duration_hours: basePackage.duration_hours,
        duration_label: this._formatDurationHours(basePackage.duration_hours),
        base_price: basePackage.base_price,
        price_label: this._formatPrice(basePackage.base_price),
        description: basePackage.description || ''
      },
      available_add_ons: availableAddOns,
      current_selection: {
        selected_add_on_ids: draft.selected_add_on_ids.slice(),
        computed_duration_hours: currentTotals.computed_duration_hours,
        base_price: currentTotals.base_price,
        add_ons_total_price: currentTotals.add_ons_total_price,
        total_price: currentTotals.total_price,
        total_price_label: this._formatPrice(currentTotals.total_price),
        is_under_budget: currentTotals.is_under_budget
      }
    };
  }

  updateDJPackageCustomizationSelection(selectedAddOnIds, budgetLimit) {
    const session = this._getCurrentUserSession();
    let customs = this._getFromStorage('custom_dj_packages');
    const djPackages = this._getFromStorage('dj_packages');
    const addOns = this._getFromStorage('dj_add_ons');

    let draft = null;
    for (let i = customs.length - 1; i >= 0; i--) {
      if (customs[i].session_id === session.id) {
        draft = customs[i];
        break;
      }
    }

    if (!draft) {
      return {
        budget_limit: typeof budgetLimit === 'number' ? budgetLimit : null,
        selected_add_ons: [],
        computed_duration_hours: 0,
        base_price: 0,
        add_ons_total_price: 0,
        total_price: 0,
        total_price_label: this._formatPrice(0),
        is_under_budget: true
      };
    }

    const basePackage = djPackages.find(function (p) { return p.id === draft.base_package_id; });
    if (!basePackage) {
      return {
        budget_limit: typeof budgetLimit === 'number' ? budgetLimit : null,
        selected_add_ons: [],
        computed_duration_hours: 0,
        base_price: 0,
        add_ons_total_price: 0,
        total_price: 0,
        total_price_label: this._formatPrice(0),
        is_under_budget: true
      };
    }

    if (typeof budgetLimit === 'number') {
      draft.budget_limit = budgetLimit;
    }

    const allowedIds = Array.isArray(basePackage.allowed_add_on_ids) ? basePackage.allowed_add_on_ids : [];
    const safeSelected = (selectedAddOnIds || []).filter(function (id) {
      return allowedIds.indexOf(id) !== -1;
    });

    draft.selected_add_on_ids = safeSelected;

    const totals = this._calculateCustomDJPackageTotals(draft, basePackage, safeSelected);
    draft.computed_duration_hours = totals.computed_duration_hours;
    draft.base_price = totals.base_price;
    draft.add_ons_total_price = totals.add_ons_total_price;
    draft.total_price = totals.total_price;
    draft.is_under_budget = totals.is_under_budget;

    this._saveToStorage('custom_dj_packages', customs);

    const selectedAddOns = [];
    for (let i = 0; i < safeSelected.length; i++) {
      const ao = addOns.find(function (a) { return a.id === safeSelected[i]; });
      if (ao && ao.is_active) {
        selectedAddOns.push({
          id: ao.id,
          name: ao.name,
          price: ao.price,
          price_label: this._formatPrice(ao.price)
        });
      }
    }

    return {
      budget_limit: draft.budget_limit,
      selected_add_ons: selectedAddOns,
      computed_duration_hours: totals.computed_duration_hours,
      base_price: totals.base_price,
      add_ons_total_price: totals.add_ons_total_price,
      total_price: totals.total_price,
      total_price_label: this._formatPrice(totals.total_price),
      is_under_budget: totals.is_under_budget
    };
  }

  getCurrentCustomDJPackageSummary() {
    const session = this._getCurrentUserSession();
    const customs = this._getFromStorage('custom_dj_packages');
    const djPackages = this._getFromStorage('dj_packages');
    const addOns = this._getFromStorage('dj_add_ons');

    let draft = null;
    for (let i = customs.length - 1; i >= 0; i--) {
      if (customs[i].session_id === session.id) {
        draft = customs[i];
        break;
      }
    }

    if (!draft) {
      return {
        custom_package_id: null,
        base_package: null,
        selected_add_ons: [],
        computed_duration_hours: 0,
        add_ons_total_price: 0,
        add_ons_total_price_label: this._formatPrice(0),
        total_price: 0,
        total_price_label: this._formatPrice(0),
        budget_limit: null,
        is_under_budget: true
      };
    }

    const basePackage = djPackages.find(function (p) { return p.id === draft.base_package_id; }) || null;
    const selectedAddOns = [];
    const selectedIds = Array.isArray(draft.selected_add_on_ids) ? draft.selected_add_on_ids : [];
    for (let i = 0; i < selectedIds.length; i++) {
      const ao = addOns.find(function (a) { return a.id === selectedIds[i]; });
      if (ao && ao.is_active) {
        selectedAddOns.push({
          id: ao.id,
          name: ao.name,
          price: ao.price,
          price_label: this._formatPrice(ao.price)
        });
      }
    }

    return {
      custom_package_id: draft.id,
      base_package: basePackage ? {
        id: basePackage.id,
        name: basePackage.name,
        duration_hours: basePackage.duration_hours,
        duration_label: this._formatDurationHours(basePackage.duration_hours),
        base_price: basePackage.base_price,
        price_label: this._formatPrice(basePackage.base_price)
      } : null,
      selected_add_ons: selectedAddOns,
      computed_duration_hours: draft.computed_duration_hours || (basePackage ? basePackage.duration_hours : 0),
      add_ons_total_price: draft.add_ons_total_price || 0,
      add_ons_total_price_label: this._formatPrice(draft.add_ons_total_price || 0),
      total_price: draft.total_price || 0,
      total_price_label: this._formatPrice(draft.total_price || 0),
      budget_limit: draft.budget_limit != null ? draft.budget_limit : null,
      is_under_budget: draft.is_under_budget
    };
  }

  submitDJPackageQuoteRequest(
    eventType,
    eventDate,
    eventLocation,
    guestCountTier,
    contactName,
    contactEmail,
    notes
  ) {
    const session = this._getCurrentUserSession();
    const customs = this._getFromStorage('custom_dj_packages');

    let draft = null;
    for (let i = customs.length - 1; i >= 0; i--) {
      if (customs[i].session_id === session.id) {
        draft = customs[i];
        break;
      }
    }

    const djPackages = this._getFromStorage('dj_packages');
    const customPackageId = draft ? draft.id : null;
    const packageId = draft ? draft.base_package_id : null;

    if (!eventType) {
      eventType = draft && djPackages.find(function (p) { return p.id === draft.base_package_id; }) ?
        djPackages.find(function (p) { return p.id === draft.base_package_id; }).category : 'other';
    }

    const quoteRequests = this._getFromStorage('dj_package_quote_requests');
    const id = this._generateId('djquote');
    const eventDateIso = this._parseDateToISOString(eventDate);
    const now = new Date().toISOString();

    const record = {
      id: id,
      custom_package_id: customPackageId,
      package_id: packageId,
      event_type: eventType,
      event_date: eventDateIso,
      event_location: eventLocation,
      guest_count_tier: guestCountTier || null,
      contact_name: contactName,
      contact_email: contactEmail,
      notes: notes || '',
      status: 'pending',
      created_at: now
    };

    quoteRequests.push(record);
    this._saveToStorage('dj_package_quote_requests', quoteRequests);

    return {
      success: true,
      quote_request_id: id,
      status: 'pending',
      message: 'Your quote request has been submitted.'
    };
  }

  // -------------------- Dance classes --------------------

  getDanceClassFilterOptions() {
    const styleOptions = [
      { value: 'salsa', label: 'Salsa' },
      { value: 'bachata', label: 'Bachata' },
      { value: 'hip_hop', label: 'Hip-Hop' },
      { value: 'latin_fusion', label: 'Latin Fusion' },
      { value: 'other', label: 'Other' }
    ];

    const levelOptions = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const dayOfWeekOptions = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const timeFilterPresets = [
      { value: 'after_5pm', label: 'Starting at or after 5:00 PM', start_time: '5:00 PM' },
      { value: 'after_6pm', label: 'Starting at or after 6:00 PM', start_time: '6:00 PM' },
      { value: 'after_7pm', label: 'Starting at or after 7:00 PM', start_time: '7:00 PM' }
    ];

    return { styleOptions, levelOptions, dayOfWeekOptions, timeFilterPresets };
  }

  searchGroupDanceClasses(filters) {
    filters = filters || {};
    const style = filters.style;
    const dayOfWeek = filters.dayOfWeek;
    const minStartTime = filters.minStartTime;
    const maxPricePerClass = filters.maxPricePerClass;
    const level = filters.level;

    const classes = this._getFromStorage('dance_classes');

    const result = [];
    const thresholdMinutes = minStartTime ? this._timeStringToMinutes(minStartTime) : null;

    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      if (!cls.is_active || !cls.is_group_class) continue;
      if (style && cls.style !== style) continue;
      if (dayOfWeek && cls.day_of_week !== dayOfWeek) continue;
      if (typeof maxPricePerClass === 'number' && cls.price_per_class > maxPricePerClass) continue;
      if (level && cls.level !== level) continue;
      if (thresholdMinutes != null) {
        const clsMinutes = this._timeStringToMinutes(cls.start_time);
        if (clsMinutes != null && clsMinutes < thresholdMinutes) continue;
      }

      result.push({
        id: cls.id,
        title: cls.title,
        style: cls.style,
        style_label: this._formatStyle(cls.style),
        level: cls.level,
        level_label: this._formatLevel(cls.level),
        day_of_week: cls.day_of_week,
        day_of_week_label: this._formatDayOfWeek(cls.day_of_week),
        start_time: cls.start_time,
        end_time: cls.end_time,
        price_per_class: cls.price_per_class,
        price_label: this._formatPrice(cls.price_per_class),
        location: cls.location,
        is_group_class: !!cls.is_group_class
      });
    }

    return result;
  }

  getDanceClassDetail(classId) {
    const classes = this._getFromStorage('dance_classes');
    const cls = classes.find(function (c) { return c.id === classId; });
    if (!cls) return null;

    return {
      id: cls.id,
      title: cls.title,
      style: cls.style,
      style_label: this._formatStyle(cls.style),
      level: cls.level,
      level_label: this._formatLevel(cls.level),
      day_of_week: cls.day_of_week,
      day_of_week_label: this._formatDayOfWeek(cls.day_of_week),
      start_time: cls.start_time,
      end_time: cls.end_time,
      price_per_class: cls.price_per_class,
      price_label: this._formatPrice(cls.price_per_class),
      location: cls.location,
      instructor_name: cls.instructor_name || '',
      description: cls.description || '',
      is_group_class: !!cls.is_group_class
    };
  }

  submitClassInterestRegistration(classId, fullName, email, preferredStartDate, message) {
    const classes = this._getFromStorage('dance_classes');
    const cls = classes.find(function (c) { return c.id === classId; });
    if (!cls) {
      return {
        success: false,
        registration_id: null,
        status: 'error',
        message: 'Selected class not found.'
      };
    }

    const registrations = this._getFromStorage('class_interest_registrations');
    const id = this._generateId('classreg');
    const preferredDateIso = this._parseDateToISOString(preferredStartDate);
    const now = new Date().toISOString();

    const record = {
      id: id,
      class_id: classId,
      full_name: fullName,
      email: email,
      preferred_start_date: preferredDateIso,
      message: message || '',
      status: 'pending',
      created_at: now
    };

    registrations.push(record);
    this._saveToStorage('class_interest_registrations', registrations);

    return {
      success: true,
      registration_id: id,
      status: 'pending',
      message: 'Your class interest has been submitted.'
    };
  }

  // -------------------- Private lessons / calendar --------------------

  getPrivateLessonCalendarSlots(startDate, endDate, dayOfWeekFilter, timeRange) {
    const slots = this._getFromStorage('calendar_slots');
    const filtered = this._filterCalendarSlots(slots, startDate, endDate, dayOfWeekFilter, timeRange || {});

    const result = [];
    for (let i = 0; i < filtered.length; i++) {
      const slot = filtered[i];
      const d = this._parseDate(slot.date);
      result.push({
        id: slot.id,
        date: d ? d.toISOString().slice(0, 10) : String(slot.date),
        date_label: d ? this._formatDateLabel(d) : String(slot.date),
        day_of_week: d ? this._getDayOfWeekNameFromDate(d) : '',
        day_of_week_label: d ? this._formatDayOfWeek(this._getDayOfWeekNameFromDate(d)) : '',
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: !!slot.is_available,
        location_type: slot.location_type || null,
        notes: slot.notes || ''
      });
    }

    return result;
  }

  submitPrivateLessonRequestFreeForm(
    requestedDate,
    durationMinutes,
    lessonLocationType,
    locationDetails,
    name,
    email,
    message,
    referencedMediaId,
    referencedVideoUrl
  ) {
    const requests = this._getFromStorage('private_lesson_requests');
    const id = this._generateId('plreq');
    const requestedDateIso = this._parseDateToISOString(requestedDate);
    const now = new Date().toISOString();

    const record = {
      id: id,
      calendar_slot_id: null,
      requested_date: requestedDateIso,
      duration_minutes: durationMinutes,
      lesson_location_type: lessonLocationType,
      location_details: locationDetails || '',
      name: name,
      email: email,
      message: message || '',
      referenced_video_url: referencedVideoUrl || '',
      referenced_media_id: referencedMediaId || null,
      status: 'pending',
      created_at: now
    };

    requests.push(record);
    this._saveToStorage('private_lesson_requests', requests);

    return {
      success: true,
      private_lesson_request_id: id,
      status: 'pending',
      message: 'Your private lesson request has been submitted.'
    };
  }

  submitPrivateLessonRequestForSlot(
    calendarSlotId,
    durationMinutes,
    lessonLocationType,
    name,
    email,
    message
  ) {
    const slots = this._getFromStorage('calendar_slots');
    const slot = slots.find(function (s) { return s.id === calendarSlotId; });
    if (!slot || !slot.is_available) {
      return {
        success: false,
        private_lesson_request_id: null,
        status: 'error',
        message: 'Selected calendar slot is not available.'
      };
    }

    const requests = this._getFromStorage('private_lesson_requests');
    const id = this._generateId('plreq');
    const now = new Date().toISOString();

    const record = {
      id: id,
      calendar_slot_id: calendarSlotId,
      requested_date: null,
      duration_minutes: durationMinutes,
      lesson_location_type: lessonLocationType,
      location_details: '',
      name: name,
      email: email,
      message: message || '',
      referenced_video_url: '',
      referenced_media_id: null,
      status: 'pending',
      created_at: now
    };

    requests.push(record);

    // Mark slot as no longer available
    slot.is_available = false;
    this._saveToStorage('calendar_slots', slots);
    this._saveToStorage('private_lesson_requests', requests);

    return {
      success: true,
      private_lesson_request_id: id,
      status: 'pending',
      message: 'Your private lesson request has been submitted.'
    };
  }

  // -------------------- Online tutorials & bundles --------------------

  getOnlineTutorialFilterOptions() {
    const styleOptions = [
      { value: 'salsa', label: 'Salsa' },
      { value: 'bachata', label: 'Bachata' },
      { value: 'hip_hop', label: 'Hip-Hop' },
      { value: 'latin_fusion', label: 'Latin Fusion' },
      { value: 'other', label: 'Other' }
    ];

    const levelOptions = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const ratingFilterOptions = [
      { value: 3.0, label: '3+ stars' },
      { value: 4.0, label: '4+ stars' },
      { value: 4.5, label: '4.5+ stars' }
    ];

    const priceFilterPresets = [
      { maxPrice: 10, label: 'Up to $10' },
      { maxPrice: 20, label: 'Up to $20' },
      { maxPrice: 30, label: 'Up to $30' }
    ];

    return { styleOptions, levelOptions, ratingFilterOptions, priceFilterPresets };
  }

  searchOnlineTutorials(filters) {
    filters = filters || {};
    const style = filters.style;
    const minRating = typeof filters.minRating === 'number' ? filters.minRating : null;
    const maxPrice = typeof filters.maxPrice === 'number' ? filters.maxPrice : null;
    const level = filters.level;

    const tutorials = this._getFromStorage('online_tutorials');
    const result = [];

    for (let i = 0; i < tutorials.length; i++) {
      const t = tutorials[i];
      if (!t.is_active) continue;
      if (style && t.style !== style) continue;
      if (minRating != null && t.rating < minRating) continue;
      if (maxPrice != null && t.price > maxPrice) continue;
      if (level && t.level !== level) continue;

      result.push({
        id: t.id,
        title: t.title,
        style: t.style,
        style_label: this._formatStyle(t.style),
        level: t.level,
        level_label: this._formatLevel(t.level),
        duration_minutes: t.duration_minutes,
        rating: t.rating,
        price: t.price,
        price_label: this._formatPrice(t.price),
        is_active: !!t.is_active
      });
    }

    return result;
  }

  addTutorialToCurrentBundle(tutorialId) {
    const tutorials = this._getFromStorage('online_tutorials');
    const tutorial = tutorials.find(function (t) { return t.id === tutorialId; });
    if (!tutorial || !tutorial.is_active) {
      return {
        success: false,
        bundle_id: null,
        total_items: 0,
        total_price: 0,
        total_price_label: this._formatPrice(0),
        message: 'Tutorial not found or inactive.'
      };
    }

    const session = this._getCurrentUserSession();
    const bundle = this._getOrCreateCurrentTutorialBundle(session.id);

    let items = this._getFromStorage('tutorial_bundle_items');

    const already = items.find(function (it) {
      return it.bundle_id === bundle.id && it.tutorial_id === tutorialId;
    });
    if (!already) {
      const id = this._generateId('titem');
      const now = new Date().toISOString();
      items.push({
        id: id,
        bundle_id: bundle.id,
        tutorial_id: tutorialId,
        added_at: now
      });
      this._saveToStorage('tutorial_bundle_items', items);
    }

    const totals = this._recalculateTutorialBundleTotals(bundle.id);

    return {
      success: true,
      bundle_id: bundle.id,
      total_items: totals.totalItems,
      total_price: totals.totalPrice,
      total_price_label: this._formatPrice(totals.totalPrice),
      message: 'Tutorial added to bundle.'
    };
  }

  removeTutorialFromCurrentBundle(tutorialId) {
    const session = this._getCurrentUserSession();
    const bundles = this._getFromStorage('tutorial_bundles');
    const bundle = bundles.find(function (b) { return b.session_id === session.id && b.status === 'draft'; });
    if (!bundle) {
      return {
        success: false,
        bundle_id: null,
        total_items: 0,
        total_price: 0,
        total_price_label: this._formatPrice(0),
        message: 'No active bundle found.'
      };
    }

    let items = this._getFromStorage('tutorial_bundle_items');
    const before = items.length;
    items = items.filter(function (it) {
      return !(it.bundle_id === bundle.id && it.tutorial_id === tutorialId);
    });
    this._saveToStorage('tutorial_bundle_items', items);

    const totals = this._recalculateTutorialBundleTotals(bundle.id);

    return {
      success: before !== items.length,
      bundle_id: bundle.id,
      total_items: totals.totalItems,
      total_price: totals.totalPrice,
      total_price_label: this._formatPrice(totals.totalPrice),
      message: 'Tutorial removed from bundle.'
    };
  }

  getCurrentTutorialBundleSummary() {
    const session = this._getCurrentUserSession();
    const bundles = this._getFromStorage('tutorial_bundles');
    const items = this._getFromStorage('tutorial_bundle_items');
    const tutorials = this._getFromStorage('online_tutorials');

    const bundle = bundles.find(function (b) { return b.session_id === session.id && b.status === 'draft'; });
    if (!bundle) {
      return {
        bundle_id: null,
        status: 'draft',
        items: [],
        total_price: 0,
        total_price_label: this._formatPrice(0),
        payment_preference: 'pay_at_first_in_person_lesson'
      };
    }

    const bundleItems = items.filter(function (it) { return it.bundle_id === bundle.id; });
    const resultItems = [];
    for (let i = 0; i < bundleItems.length; i++) {
      const it = bundleItems[i];
      const tut = tutorials.find(function (t) { return t.id === it.tutorial_id; });
      if (!tut) continue;
      const item = {
        tutorial_id: tut.id,
        title: tut.title,
        style: tut.style,
        style_label: this._formatStyle(tut.style),
        level: tut.level,
        level_label: this._formatLevel(tut.level),
        rating: tut.rating,
        price: tut.price,
        price_label: this._formatPrice(tut.price)
      };
      // Foreign-key resolution: include full tutorial object
      item.tutorial = tut;
      resultItems.push(item);
    }

    const totalPrice = bundle.total_price || 0;

    return {
      bundle_id: bundle.id,
      status: bundle.status,
      items: resultItems,
      total_price: totalPrice,
      total_price_label: this._formatPrice(totalPrice),
      payment_preference: bundle.payment_preference || 'pay_at_first_in_person_lesson'
    };
  }

  confirmTutorialBundleRequest(paymentPreference) {
    const session = this._getCurrentUserSession();
    const bundles = this._getFromStorage('tutorial_bundles');
    const items = this._getFromStorage('tutorial_bundle_items');

    const bundle = bundles.find(function (b) { return b.session_id === session.id && b.status === 'draft'; });
    if (!bundle) {
      return {
        success: false,
        bundle_id: null,
        status: 'draft',
        message: 'No active bundle to confirm.'
      };
    }

    const bundleItems = items.filter(function (it) { return it.bundle_id === bundle.id; });
    if (bundleItems.length === 0) {
      return {
        success: false,
        bundle_id: bundle.id,
        status: bundle.status,
        message: 'Bundle is empty.'
      };
    }

    bundle.payment_preference = paymentPreference;
    bundle.status = 'submitted';
    this._saveToStorage('tutorial_bundles', bundles);

    return {
      success: true,
      bundle_id: bundle.id,
      status: bundle.status,
      message: 'Your tutorial bundle request has been submitted.'
    };
  }

  // -------------------- Gallery --------------------

  getGalleryFilterOptions() {
    const typeOptions = [
      { value: 'all', label: 'All' },
      { value: 'photo', label: 'Photos' },
      { value: 'video', label: 'Videos' }
    ];

    const styleOptions = [
      { value: 'hip_hop', label: 'Hip-Hop' },
      { value: 'salsa', label: 'Salsa' },
      { value: 'bachata', label: 'Bachata' },
      { value: 'wedding', label: 'Wedding' },
      { value: 'corporate_event', label: 'Corporate events' },
      { value: 'other', label: 'Other' }
    ];

    return { typeOptions, styleOptions };
  }

  searchGalleryMedia(filters) {
    filters = filters || {};
    const type = filters.type;
    const style = filters.style;
    const minDurationSeconds = typeof filters.minDurationSeconds === 'number' ? filters.minDurationSeconds : null;
    const onlyPublic = !!filters.onlyPublic;

    const media = this._getFromStorage('gallery_media');
    const result = [];

    for (let i = 0; i < media.length; i++) {
      const m = media[i];
      if (onlyPublic && m.visibility && m.visibility !== 'public') continue;
      if (type && m.type !== type) continue;
      if (style && m.style !== style) continue;
      if (m.type === 'video' && minDurationSeconds != null) {
        const dur = m.duration_seconds || 0;
        if (dur < minDurationSeconds) continue;
      }

      result.push({
        id: m.id,
        type: m.type,
        title: m.title || '',
        style: m.style || '',
        style_label: this._formatStyle(m.style),
        duration_seconds: m.duration_seconds || 0,
        duration_label: m.type === 'video' && m.duration_seconds ? this._formatDurationSeconds(m.duration_seconds) : '',
        thumbnail_url: m.thumbnail_url || '',
        is_featured: !!m.is_featured
      });
    }

    return result;
  }

  getGalleryMediaDetail(mediaId) {
    const media = this._getFromStorage('gallery_media');
    const m = media.find(function (x) { return x.id === mediaId; });
    if (!m) return null;

    return {
      id: m.id,
      type: m.type,
      title: m.title || '',
      description: m.description || '',
      style: m.style || '',
      style_label: this._formatStyle(m.style),
      duration_seconds: m.duration_seconds || 0,
      duration_label: m.type === 'video' && m.duration_seconds ? this._formatDurationSeconds(m.duration_seconds) : '',
      media_url: m.media_url,
      thumbnail_url: m.thumbnail_url || '',
      is_featured: !!m.is_featured,
      created_at: m.created_at || ''
    };
  }

  getGalleryMediaShareLink(mediaId) {
    // Simulate canonical share URL without using window/document
    const baseUrl = 'https://example.com/gallery/';
    return {
      media_id: mediaId,
      share_url: baseUrl + encodeURIComponent(mediaId)
    };
  }

  // -------------------- Testimonials & corporate bookings --------------------

  getTestimonialFilterOptions() {
    const eventTypeOptions = [
      { value: 'wedding', label: 'Weddings' },
      { value: 'corporate_event', label: 'Corporate events' },
      { value: 'party_birthday', label: 'Parties & birthdays' },
      { value: 'private_lesson', label: 'Private lessons' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'rating_asc', label: 'Rating: Low to High' },
      { value: 'date_desc', label: 'Most recent' }
    ];

    return { eventTypeOptions, sortOptions };
  }

  searchTestimonials(filters, sortBy) {
    filters = filters || {};
    const eventType = filters.eventType;
    const minRating = typeof filters.minRating === 'number' ? filters.minRating : null;

    const testimonials = this._getFromStorage('testimonials');
    let list = testimonials.filter(function (t) {
      if (t.status !== 'visible') return false;
      if (eventType && t.event_type !== eventType) return false;
      if (minRating != null && t.rating < minRating) return false;
      return true;
    });

    const sort = sortBy || 'rating_high_to_low';
    list.sort(function (a, b) {
      if (sort === 'rating_low_to_high' || sort === 'rating_asc') {
        if (a.rating !== b.rating) return a.rating - b.rating;
      } else if (sort === 'date_desc') {
        const ad = a.event_date || a.created_at || '';
        const bd = b.event_date || b.created_at || '';
        if (ad === bd) return 0;
        return ad > bd ? -1 : 1;
      } else { // rating_high_to_low
        if (a.rating !== b.rating) return b.rating - a.rating;
      }
      const ad2 = a.created_at || '';
      const bd2 = b.created_at || '';
      if (ad2 === bd2) return 0;
      return ad2 > bd2 ? -1 : 1;
    });

    const result = [];
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const excerpt = t.content ? (t.content.length > 200 ? t.content.slice(0, 197) + '...' : t.content) : '';
      result.push({
        id: t.id,
        title: t.title || '',
        rating: t.rating,
        content_excerpt: excerpt,
        client_name: t.client_name || '',
        client_company_name: t.client_company_name || '',
        event_type: t.event_type,
        event_type_label: this._formatEventType(t.event_type),
        is_featured: !!t.is_featured
      });
    }

    return result;
  }

  getTestimonialDetail(testimonialId) {
    const testimonials = this._getFromStorage('testimonials');
    const t = testimonials.find(function (x) { return x.id === testimonialId; });
    if (!t) return null;

    return {
      id: t.id,
      client_name: t.client_name || '',
      client_company_name: t.client_company_name || '',
      event_type: t.event_type,
      event_type_label: this._formatEventType(t.event_type),
      rating: t.rating,
      title: t.title || '',
      content: t.content || '',
      event_date: t.event_date || '',
      is_featured: !!t.is_featured
    };
  }

  // -------------------- FAQ & travel --------------------

  getFAQCategories() {
    const categories = this._getFromStorage('faq_categories');
    categories.sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    return categories.map(function (c) {
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        sort_order: c.sort_order
      };
    });
  }

  getFAQsByCategory(categorySlug) {
    const categories = this._getFromStorage('faq_categories');
    const items = this._getFromStorage('faq_items');

    const cat = categories.find(function (c) { return c.slug === categorySlug; });
    if (!cat) return [];

    const filtered = items.filter(function (it) {
      return it.category_id === cat.id && it.is_active;
    });

    filtered.sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    return filtered.map(function (it) {
      return {
        id: it.id,
        question: it.question,
        answer: it.answer,
        key: it.key || '',
        included_miles: typeof it.included_miles === 'number' ? it.included_miles : null,
        extra_fee_per_mile: typeof it.extra_fee_per_mile === 'number' ? it.extra_fee_per_mile : null,
        sort_order: it.sort_order || 0
      };
    });
  }

  getFAQItemByKey(key) {
    const items = this._getFromStorage('faq_items');
    const it = items.find(function (x) { return x.key === key && x.is_active; });
    if (!it) return null;

    return {
      id: it.id,
      question: it.question,
      answer: it.answer,
      included_miles: typeof it.included_miles === 'number' ? it.included_miles : null,
      extra_fee_per_mile: typeof it.extra_fee_per_mile === 'number' ? it.extra_fee_per_mile : null
    };
  }

  submitContactInquiry(
    sourcePage,
    inquiryType,
    eventType,
    eventDate,
    eventLocation,
    guestCountTier,
    message,
    contactName,
    contactEmail,
    relatedTestimonialId
  ) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const id = this._generateId('contact');
    const eventDateIso = this._parseDateToISOString(eventDate);
    const now = new Date().toISOString();

    const record = {
      id: id,
      source_page: sourcePage,
      inquiry_type: inquiryType,
      event_type: eventType || null,
      event_date: eventDateIso,
      event_location: eventLocation || '',
      guest_count_tier: guestCountTier || null,
      message: message,
      contact_name: contactName,
      contact_email: contactEmail,
      related_testimonial_id: relatedTestimonialId || null,
      created_at: now,
      status: 'pending'
    };

    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      inquiry_id: id,
      status: 'pending',
      message: 'Your inquiry has been sent.'
    };
  }

  // -------------------- Newsletter --------------------

  getNewsletterOptions() {
    const topicOptions = [
      {
        value: 'wedding_dj_tips',
        label: 'Wedding DJ tips',
        description: 'Advice for planning music, timelines, and playlists for your wedding.'
      },
      {
        value: 'latin_dance_tutorials',
        label: 'Latin dance tutorials',
        description: 'Salsa, bachata, and Latin fusion lesson content.'
      },
      {
        value: 'general_updates',
        label: 'General updates',
        description: 'News, events, and other updates.'
      }
    ];

    const emailFrequencyOptions = [
      { value: 'once_per_month', label: 'Once per month' },
      { value: 'twice_per_month', label: 'Twice per month' },
      { value: 'once_per_week', label: 'Once per week' }
    ];

    return { topicOptions, emailFrequencyOptions };
  }

  submitNewsletterSubscription(firstName, email, topics, emailFrequency, preferencesMessage) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    const id = this._generateId('nls');
    const now = new Date().toISOString();

    const record = {
      id: id,
      first_name: firstName,
      email: email,
      topics: Array.isArray(topics) ? topics.slice() : [],
      email_frequency: emailFrequency,
      preferences_message: preferencesMessage || '',
      is_active: true,
      created_at: now
    };

    subs.push(record);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription_id: id,
      is_active: true,
      message: 'You have been subscribed to the newsletter.'
    };
  }

  // -------------------- About profile --------------------

  getAboutProfile() {
    const raw = localStorage.getItem('about_profile');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        return obj;
      } catch (e) {}
    }
    // If no stored profile, return an empty structure (no mock content)
    return {
      name: '',
      stage_name: '',
      bio_html: '',
      experience_years: 0,
      specialties: [],
      notable_venues: [],
      notable_corporate_clients: [],
      call_to_action_text: ''
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
