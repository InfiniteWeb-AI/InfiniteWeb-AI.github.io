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
  }

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    const tableKeys = [
      'counselors',
      'counselor_session_offerings',
      'counselor_availability_slots',
      'counseling_bookings',
      'counselor_reviews',
      'ritual_services',
      'ritual_leaders',
      'ritual_service_leader_assignments',
      'ritual_leader_availability_slots',
      'ritual_service_booking_requests',
      'baby_naming_ceremony_requests',
      'courses',
      'class_payment_options',
      'class_enrollments',
      'store_categories',
      'product_subcategories',
      'products',
      'product_reviews',
      'cart',
      'cart_items',
      'support_groups',
      'group_meetings',
      'group_registrations',
      'funds',
      'donations',
      'newsletter_topics',
      'newsletter_subscriptions',
      'contact_inquiries',
      'about_page_content',
      'contact_form_options'
    ];

    for (const key of tableKeys) {
      if (localStorage.getItem(key) === null) {
        // about_page_content & contact_form_options are objects, others arrays
        if (key === 'about_page_content') {
          localStorage.setItem(key, JSON.stringify({
            mission: '',
            values: [],
            spiritual_orientation: '',
            integration_description: '',
            impact_highlights: [],
            staff_profiles: []
          }));
        } else if (key === 'contact_form_options') {
          localStorage.setItem(key, JSON.stringify({
            topics: [
              { key: 'counseling', label: 'Spiritual Counseling', description: '' },
              { key: 'ritual_services', label: 'Ritual Services', description: '' },
              { key: 'classes_workshops', label: 'Classes & Workshops', description: '' },
              { key: 'support_groups', label: 'Support Groups', description: '' },
              { key: 'donations', label: 'Donations', description: '' },
              { key: 'other', label: 'Other', description: '' }
            ],
            primary_contact: {
              phone: '',
              email: '',
              address: ''
            },
            expected_response_time: ''
          }));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return Array.isArray(raw) ? [] : (key.endsWith('_content') ? {} : []);
    try {
      return JSON.parse(raw);
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

  // -------------------- Generic Utility Helpers --------------------

  _truncate(text, length) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= length) return text;
    return text.slice(0, length - 1) + '…';
  }

  _paginate(items, page = 1, page_size = 20) {
    const p = Math.max(1, page || 1);
    const size = Math.max(1, page_size || 20);
    const start = (p - 1) * size;
    const end = start + size;
    return items.slice(start, end);
  }

  _humanizeKey(key) {
    if (!key) return '';
    return key
      .split('_')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _parseDateOnly(dateStr) {
    // dateStr: 'YYYY-MM-DD'
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00.000Z');
  }

  _dateToISODateString(date) {
    return date.toISOString().slice(0, 10);
  }

  _getDayOfWeekString(date) {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    return days[date.getUTCDay()];
  }

  _timeStringToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(v => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  _getTimePartFromISO(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return null;
    // Expect 'YYYY-MM-DDTHH:MM:SS' or similar
    return isoStr.slice(11, 16); // 'HH:MM'
  }

  _compareISO(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  }

  // -------------------- Date Range Helpers --------------------

  _getNextCalendarMonthRange() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const firstNextMonth = new Date(Date.UTC(month === 11 ? year + 1 : year, (month + 1) % 12, 1));
    const firstFollowing = new Date(Date.UTC(firstNextMonth.getUTCFullYear(), firstNextMonth.getUTCMonth() + 1, 1));
    const lastNextMonth = new Date(firstFollowing.getTime() - 1); // last ms of month
    return {
      start_date: this._dateToISODateString(firstNextMonth),
      end_date: this._dateToISODateString(lastNextMonth)
    };
  }

  _getCurrentMonthRange() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const first = new Date(Date.UTC(year, month, 1));
    const firstNext = new Date(Date.UTC(year, month + 1, 1));
    const last = new Date(firstNext.getTime() - 1);
    return {
      start_date: this._dateToISODateString(first),
      end_date: this._dateToISODateString(last)
    };
  }

  // -------------------- Cart Helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) carts = [];
    if (carts.length > 0) {
      return carts[0];
    }
    const now = new Date().toISOString();
    const cart = {
      id: this._generateId('cart'),
      created_at: now,
      updated_at: now
    };
    carts.push(cart);
    this._saveToStorage('cart', carts);
    return cart;
  }

  _getCurrentCartId() {
    const carts = this._getFromStorage('cart');
    if (Array.isArray(carts) && carts.length > 0) return carts[0].id;
    return null;
  }

  _calculateCartTotals(cartItems) {
    let subtotal = 0;
    let item_count = 0;
    for (const item of cartItems) {
      subtotal += Number(item.line_subtotal || 0);
      item_count += Number(item.quantity || 0);
    }
    return {
      subtotal,
      item_count,
      currency: 'usd'
    };
  }

  // -------------------- Homepage Highlights --------------------

  getHomepageHighlights() {
    const counselors = this._getFromStorage('counselors');
    const sessionOfferings = this._getFromStorage('counselor_session_offerings');
    const ritualServices = this._getFromStorage('ritual_services');
    const supportGroups = this._getFromStorage('support_groups');
    const groupMeetings = this._getFromStorage('group_meetings');
    const products = this._getFromStorage('products');
    const storeCategories = this._getFromStorage('store_categories');
    const productSubcategories = this._getFromStorage('product_subcategories');
    const courses = this._getFromStorage('courses');
    const funds = this._getFromStorage('funds');

    // Top counselors
    const activeTopCounselors = counselors
      .filter(c => c.status === 'active' && c.is_top_rated)
      .map(c => {
        const offerings = sessionOfferings.filter(o => o.counselor_id === c.id && o.is_active);
        const startingOffering = offerings.reduce((min, o) => {
          if (!min) return o;
          return o.price < min.price ? o : min;
        }, null);
        const starting_price = startingOffering ? startingOffering.price : null;
        const currency = startingOffering ? startingOffering.currency : 'usd';
        return {
          counselor_id: c.id,
          name: c.name,
          title: c.title || '',
          photo_url: c.photo_url || '',
          rating_average: c.rating_average || 0,
          rating_count: c.rating_count || 0,
          is_top_rated: !!c.is_top_rated,
          starting_price,
          currency,
          counselor: c
        };
      });

    // Featured ritual services (first few active)
    const featuredServices = ritualServices
      .filter(s => s.is_active)
      .slice(0, 5)
      .map(s => ({
        ritual_service_id: s.id,
        slug: s.slug,
        name: s.name,
        category: s.category,
        description_snippet: this._truncate(s.description || '', 160),
        allowed_formats: Array.isArray(s.allowed_formats) ? s.allowed_formats : [],
        is_active: !!s.is_active,
        ritual_service: s
      }));

    // Featured classes (upcoming/ongoing, pick a few cheapest)
    const activeCourses = courses.filter(c => c.status === 'upcoming' || c.status === 'ongoing');
    activeCourses.sort((a, b) => (a.price || 0) - (b.price || 0));
    const featuredClasses = activeCourses.slice(0, 5).map(c => ({
      course_id: c.id,
      title: c.title,
      schedule_summary: c.schedule_summary || '',
      price: c.price,
      currency: c.currency || 'usd',
      format: c.format,
      course: c
    }));

    // Featured support groups with next meeting
    const nowISO = new Date().toISOString();
    const featuredSupportGroups = supportGroups
      .filter(g => g.status === 'upcoming' || g.status === 'ongoing')
      .map(g => {
        const meetings = groupMeetings
          .filter(m => m.support_group_id === g.id && !m.is_canceled && (!m.start_datetime || m.start_datetime >= nowISO))
          .sort((a, b) => this._compareISO(a.start_datetime, b.start_datetime));
        const nextMeeting = meetings[0] || null;
        return {
          support_group_id: g.id,
          title: g.title,
          theme: g.theme,
          format: g.format,
          next_meeting_datetime: nextMeeting ? nextMeeting.start_datetime : null,
          schedule_summary: g.schedule_summary || '',
          support_group: g
        };
      })
      .filter(item => !!item.next_meeting_datetime)
      .slice(0, 5);

    // Featured store products (active, best rated)
    const activeProducts = products.filter(p => p.status === 'active');
    activeProducts.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    const featuredStoreProducts = activeProducts.slice(0, 8).map(p => {
      const category = storeCategories.find(c => c.id === p.category_id) || null;
      const subcat = productSubcategories.find(s => s.id === p.subcategory_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        category_name: category ? category.name : '',
        subcategory_name: subcat ? subcat.name : '',
        price: p.price,
        currency: p.currency || 'usd',
        rating_average: p.rating_average || 0,
        rating_count: p.rating_count || 0,
        image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '',
        product: p,
        category,
        subcategory: subcat
      };
    });

    // Donation CTA (first active fund if exists)
    const activeFunds = funds.filter(f => f.is_active);
    const highlightedFund = activeFunds[0] || null;

    return {
      spiritual_counseling_cta: {
        headline: 'Spiritual Counseling',
        subheadline: 'Connect with a compassionate, top-rated spiritual counselor.',
        top_counselors: activeTopCounselors
      },
      ritual_services_cta: {
        headline: 'Ritual Services',
        featured_services: featuredServices
      },
      featured_classes: featuredClasses,
      featured_support_groups: featuredSupportGroups,
      featured_store_products: featuredStoreProducts,
      donation_cta: {
        headline: 'Support Our Community',
        highlighted_fund_id: highlightedFund ? highlightedFund.id : null,
        highlighted_fund_name: highlightedFund ? highlightedFund.name : '',
        suggested_monthly_amounts: [18, 36, 72]
      }
    };
  }

  // -------------------- Spiritual Counseling --------------------

  getSpiritualCounselingFilterOptions() {
    return {
      modalities: [
        { value: 'online_video', label: 'Online (Video)' },
        { value: 'in_person', label: 'In Person' }
      ],
      session_lengths: [
        { minutes: 30, label: '30 minutes' },
        { minutes: 60, label: '60 minutes' },
        { minutes: 90, label: '90 minutes' }
      ],
      price_ranges: [
        { min: 0, max: 100, label: 'Up to $100' },
        { min: 0, max: 120, label: 'Up to $120' },
        { min: 0, max: 150, label: 'Up to $150' }
      ],
      rating_options: [
        { min_rating: 4.0, label: '4.0 stars & up' },
        { min_rating: 4.5, label: '4.5 stars & up' }
      ],
      sort_options: [
        { value: 'soonest_available', label: 'Soonest available' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'highest_rated', label: 'Highest Rated' }
      ]
    };
  }

  searchCounselorsForSessions(
    modality,
    session_length_minutes,
    max_price,
    min_rating,
    min_reviews,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const counselors = this._getFromStorage('counselors');
    const offerings = this._getFromStorage('counselor_session_offerings');
    const slots = this._getFromStorage('counselor_availability_slots');
    const nowISO = new Date().toISOString();

    let filtered = counselors.filter(c => c.status === 'active');

    if (modality) {
      filtered = filtered.filter(c => Array.isArray(c.modalities) && c.modalities.includes(modality));
    }
    if (typeof min_rating === 'number') {
      filtered = filtered.filter(c => (c.rating_average || 0) >= min_rating);
    }
    if (typeof min_reviews === 'number') {
      filtered = filtered.filter(c => (c.rating_count || 0) >= min_reviews);
    }

    const nextMonthRange = this._getNextCalendarMonthRange();
    const eveningStart = this._timeStringToMinutes('18:00');
    const eveningEnd = this._timeStringToMinutes('21:00');

    const mapped = [];

    for (const c of filtered) {
      const off = offerings.find(o =>
        o.counselor_id === c.id &&
        o.is_active &&
        (!modality || o.modality === modality) &&
        (!session_length_minutes || o.session_length_minutes === session_length_minutes)
      );
      if (!off) continue;
      if (typeof max_price === 'number' && off.price > max_price) continue;

      const counselorSlots = slots.filter(s =>
        s.counselor_id === c.id &&
        (!modality || s.modality === modality) &&
        (!session_length_minutes || s.session_length_minutes === session_length_minutes) &&
        !s.is_booked
      );

      const futureSlots = counselorSlots
        .filter(s => !s.start_datetime || s.start_datetime >= nowISO)
        .sort((a, b) => this._compareISO(a.start_datetime, b.start_datetime));

      const nextAvailable = futureSlots[0] || null;

      // Evening availability next month
      const eveningSlotsNextMonth = counselorSlots.filter(s => {
        if (s.is_booked) return false;
        if (!s.is_weekday) return false;
        if (!s.start_datetime) return false;
        const datePart = s.start_datetime.slice(0, 10);
        if (datePart < nextMonthRange.start_date || datePart > nextMonthRange.end_date) return false;
        const timeStr = this._getTimePartFromISO(s.start_datetime);
        const mins = this._timeStringToMinutes(timeStr);
        if (mins == null) return false;
        return mins >= eveningStart && mins <= eveningEnd;
      });

      mapped.push({
        counselor_id: c.id,
        name: c.name,
        title: c.title || '',
        photo_url: c.photo_url || '',
        bio_snippet: this._truncate(c.bio || '', 160),
        modalities: Array.isArray(c.modalities) ? c.modalities : [],
        rating_average: c.rating_average || 0,
        rating_count: c.rating_count || 0,
        is_top_rated: !!c.is_top_rated,
        price_for_selected_session: off.price,
        currency: off.currency || 'usd',
        next_available_slot_datetime: nextAvailable ? nextAvailable.start_datetime : null,
        has_evening_availability_next_month: eveningSlotsNextMonth.length > 0,
        counselor: c
      });
    }

    // Sorting
    if (sort_by === 'price_low_to_high') {
      mapped.sort((a, b) => (a.price_for_selected_session || 0) - (b.price_for_selected_session || 0));
    } else if (sort_by === 'highest_rated') {
      mapped.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sort_by === 'soonest_available') {
      mapped.sort((a, b) => this._compareISO(a.next_available_slot_datetime, b.next_available_slot_datetime));
    }

    const total_results = mapped.length;
    const paged = this._paginate(mapped, page, page_size);

    return {
      results: paged,
      page: page || 1,
      page_size: page_size || 20,
      total_results
    };
  }

  getCounselorProfile(counselorId) {
    const counselors = this._getFromStorage('counselors');
    const offerings = this._getFromStorage('counselor_session_offerings');
    const c = counselors.find(x => x.id === counselorId);
    if (!c) {
      return {};
    }
    const session_offerings = offerings
      .filter(o => o.counselor_id === counselorId)
      .map(o => ({
        modality: o.modality,
        session_length_minutes: o.session_length_minutes,
        price: o.price,
        currency: o.currency || 'usd',
        is_active: !!o.is_active
      }));

    return {
      counselor_id: c.id,
      name: c.name,
      title: c.title || '',
      bio: c.bio || '',
      photo_url: c.photo_url || '',
      areas_of_focus: Array.isArray(c.areas_of_focus) ? c.areas_of_focus : [],
      modalities: Array.isArray(c.modalities) ? c.modalities : [],
      rating_average: c.rating_average || 0,
      rating_count: c.rating_count || 0,
      is_top_rated: !!c.is_top_rated,
      session_offerings
    };
  }

  getCounselorAvailabilitySlots(
    counselorId,
    modality,
    session_length_minutes,
    start_date,
    end_date,
    weekdays_only = false,
    earliest_start_time,
    latest_start_time
  ) {
    const slots = this._getFromStorage('counselor_availability_slots');
    const startISO = start_date + 'T00:00:00.000Z';
    const endISO = end_date + 'T23:59:59.999Z';
    const earliestMins = this._timeStringToMinutes(earliest_start_time);
    const latestMins = this._timeStringToMinutes(latest_start_time);

    const filtered = slots
      .filter(s =>
        s.counselor_id === counselorId &&
        s.modality === modality &&
        s.session_length_minutes === session_length_minutes &&
        !s.is_booked &&
        s.start_datetime >= startISO &&
        s.start_datetime <= endISO &&
        (!weekdays_only || s.is_weekday)
      )
      .filter(s => {
        if (!earliest_start_time && !latest_start_time) return true;
        let mins = null;
        try {
          const date = new Date(s.start_datetime);
          if (s.timezone && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
            const formatter = new Intl.DateTimeFormat('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: s.timezone
            });
            const parts = formatter.formatToParts(date);
            const hourPart = parts.find(p => p.type === 'hour');
            const minutePart = parts.find(p => p.type === 'minute');
            if (hourPart && minutePart) {
              const h = parseInt(hourPart.value, 10);
              const m = parseInt(minutePart.value, 10);
              if (!Number.isNaN(h) && !Number.isNaN(m)) {
                mins = h * 60 + m;
              }
            }
          }
          if (mins == null) {
            const t = this._getTimePartFromISO(s.start_datetime);
            mins = this._timeStringToMinutes(t);
          }
        } catch (e) {
          const tFallback = this._getTimePartFromISO(s.start_datetime);
          mins = this._timeStringToMinutes(tFallback);
        }
        if (mins == null) return false;
        if (earliestMins != null && mins < earliestMins) return false;
        if (latestMins != null && mins > latestMins) return false;
        return true;
      })
      .sort((a, b) => this._compareISO(a.start_datetime, b.start_datetime));

    return filtered.map(s => ({
      availability_slot_id: s.id,
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      is_weekday: !!s.is_weekday,
      is_booked: !!s.is_booked,
      timezone: s.timezone || ''
    }));
  }

  bookCounselingSession(
    counselorId,
    availabilitySlotId,
    modality,
    session_length_minutes,
    price,
    currency,
    client_name,
    client_email,
    client_phone,
    notes
  ) {
    let slots = this._getFromStorage('counselor_availability_slots');
    const counselors = this._getFromStorage('counselors');
    let bookings = this._getFromStorage('counseling_bookings');

    const slot = slots.find(s => s.id === availabilitySlotId);
    if (!slot) {
      return { success: false, booking: null, message: 'Availability slot not found.' };
    }
    if (slot.counselor_id !== counselorId) {
      return { success: false, booking: null, message: 'Slot does not belong to counselor.' };
    }
    if (slot.is_booked) {
      return { success: false, booking: null, message: 'Slot already booked.' };
    }
    if (slot.modality !== modality || slot.session_length_minutes !== session_length_minutes) {
      return { success: false, booking: null, message: 'Slot details mismatch.' };
    }

    const nowISO = new Date().toISOString();
    const bookingId = this._generateId('counseling_booking');
    const bookingRecord = {
      id: bookingId,
      counselor_id: counselorId,
      availability_slot_id: availabilitySlotId,
      modality,
      session_length_minutes,
      price,
      currency: currency || 'usd',
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      status: 'pending',
      client_name: client_name || '',
      client_email: client_email || '',
      client_phone: client_phone || '',
      notes: notes || '',
      created_at: nowISO
    };
    bookings.push(bookingRecord);

    // Mark slot as booked
    slots = slots.map(s => (s.id === availabilitySlotId ? { ...s, is_booked: true } : s));

    this._saveToStorage('counseling_bookings', bookings);
    this._saveToStorage('counselor_availability_slots', slots);

    const counselor = counselors.find(c => c.id === counselorId) || null;

    return {
      success: true,
      booking: {
        booking_id: bookingId,
        counselor_id: counselorId,
        availability_slot_id: availabilitySlotId,
        modality,
        session_length_minutes,
        price,
        currency: currency || 'usd',
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        status: 'pending',
        counselor,
        availability_slot: slot
      },
      message: 'Booking created in pending status.'
    };
  }

  // -------------------- Ritual Services (Overview & Detail) --------------------

  getRitualServiceCategories() {
    const ritualServices = this._getFromStorage('ritual_services');
    const categoryMap = new Map();
    for (const s of ritualServices) {
      if (!s.category) continue;
      if (!categoryMap.has(s.category)) {
        categoryMap.set(s.category, {
          key: s.category,
          name: this._humanizeKey(s.category),
          description: ''
        });
      }
    }

    // Ensure known categories exist even if no services yet
    const knownCategories = ['shabbat_holidays', 'life_cycle_ceremonies', 'shiva_mourning_support', 'other'];
    for (const key of knownCategories) {
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          key,
          name: this._humanizeKey(key),
          description: ''
        });
      }
    }

    return Array.from(categoryMap.values());
  }

  getRitualServicesOverview(category) {
    const ritualServices = this._getFromStorage('ritual_services');
    let list = ritualServices.filter(s => s.is_active);
    if (category) {
      list = list.filter(s => s.category === category);
    }
    return list.map(s => ({
      ritual_service_id: s.id,
      slug: s.slug,
      name: s.name,
      category: s.category,
      description_snippet: this._truncate(s.description || '', 160),
      allowed_formats: Array.isArray(s.allowed_formats) ? s.allowed_formats : [],
      is_active: !!s.is_active,
      ritual_service: s
    }));
  }

  getRitualServiceDetail(ritualServiceSlug) {
    const ritualServices = this._getFromStorage('ritual_services');
    const s = ritualServices.find(x => x.slug === ritualServiceSlug);
    if (!s) {
      return {};
    }
    return {
      ritual_service_id: s.id,
      slug: s.slug,
      name: s.name,
      category: s.category,
      description: s.description || '',
      default_duration_minutes: s.default_duration_minutes || null,
      allowed_formats: Array.isArray(s.allowed_formats) ? s.allowed_formats : [],
      is_active: !!s.is_active
    };
  }

  // -------------------- Ritual Leaders Search & Booking Requests --------------------

  searchRitualLeadersWithAvailability(
    ritualServiceId,
    format,
    location_zip,
    radius_miles,
    start_date,
    end_date,
    days_of_week,
    time_window_start,
    time_window_end,
    max_travel_fee,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const leaders = this._getFromStorage('ritual_leaders');
    const assignments = this._getFromStorage('ritual_service_leader_assignments');
    const slots = this._getFromStorage('ritual_leader_availability_slots');

    const startISO = start_date + 'T00:00:00.000Z';
    const endISO = end_date + 'T23:59:59.999Z';
    const daysFilter = Array.isArray(days_of_week) && days_of_week.length > 0 ? days_of_week : null;
    const startMins = this._timeStringToMinutes(time_window_start);
    const endMins = this._timeStringToMinutes(time_window_end);

    // Active assignments for the requested service
    const relevantAssignments = assignments.filter(a =>
      a.ritual_service_id === ritualServiceId &&
      a.is_active &&
      (typeof max_travel_fee !== 'number' || a.travel_fee <= max_travel_fee)
    );

    const resultsMap = new Map(); // leader_id -> result object

    for (const a of relevantAssignments) {
      const leader = leaders.find(l => l.id === a.leader_id && l.is_active);
      if (!leader) continue;

      const leaderSlots = slots
        .filter(s =>
          s.leader_id === leader.id &&
          s.ritual_service_id === ritualServiceId &&
          s.format === format &&
          !s.is_booked &&
          s.start_datetime >= startISO &&
          s.start_datetime <= endISO
        )
        .filter(s => {
          if (!daysFilter && startMins == null && endMins == null) return true;
          const dt = new Date(s.start_datetime);
          const dow = this._getDayOfWeekString(dt);
          if (daysFilter && !daysFilter.includes(dow)) return false;
          if (startMins != null || endMins != null) {
            let mins = null;
            try {
              if (s.timezone && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
                const formatter = new Intl.DateTimeFormat('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: s.timezone
                });
                const parts = formatter.formatToParts(dt);
                const hourPart = parts.find(p => p.type === 'hour');
                const minutePart = parts.find(p => p.type === 'minute');
                if (hourPart && minutePart) {
                  const h = parseInt(hourPart.value, 10);
                  const m = parseInt(minutePart.value, 10);
                  if (!Number.isNaN(h) && !Number.isNaN(m)) {
                    mins = h * 60 + m;
                  }
                }
              }
              if (mins == null) {
                const t = this._getTimePartFromISO(s.start_datetime);
                mins = this._timeStringToMinutes(t);
              }
            } catch (e) {
              const tFallback = this._getTimePartFromISO(s.start_datetime);
              mins = this._timeStringToMinutes(tFallback);
            }
            if (mins == null) return false;
            if (startMins != null && mins < startMins) return false;
            if (endMins != null && mins > endMins) return false;
          }
          return true;
        })
        .sort((x, y) => this._compareISO(x.start_datetime, y.start_datetime));

      if (leaderSlots.length === 0) continue;

      const nextSlot = leaderSlots[0];
      const within_travel_radius = !radius_miles || !a.max_radius_miles || radius_miles <= a.max_radius_miles;

      // If leader already added from another assignment, choose better (lower travel fee or earlier slot)
      const existing = resultsMap.get(leader.id);
      const travel_fee_for_request = a.travel_fee;

      if (existing) {
        const betterByFee = travel_fee_for_request < existing.travel_fee_for_request;
        const betterByTime = !betterByFee && this._compareISO(nextSlot.start_datetime, existing.next_available_slot.start_datetime) < 0;
        if (!betterByFee && !betterByTime) {
          continue;
        }
      }

      resultsMap.set(leader.id, {
        leader_id: leader.id,
        name: leader.name,
        title: leader.title || '',
        photo_url: leader.photo_url || '',
        bio_snippet: this._truncate(leader.bio || '', 160),
        base_travel_fee: leader.base_travel_fee != null ? leader.base_travel_fee : a.travel_fee,
        travel_fee_for_request,
        currency: a.currency || 'usd',
        max_radius_miles: a.max_radius_miles != null ? a.max_radius_miles : leader.max_travel_radius_miles,
        rating_average: leader.rating_average || 0,
        rating_count: leader.rating_count || 0,
        next_available_slot: {
          availability_slot_id: nextSlot.id,
          start_datetime: nextSlot.start_datetime,
          end_datetime: nextSlot.end_datetime,
          timezone: nextSlot.timezone || ''
        },
        within_travel_radius,
        leader,
        ritual_service_id: ritualServiceId
      });
    }

    let results = Array.from(resultsMap.values());

    if (sort_by === 'travel_fee_low_to_high') {
      results.sort((a, b) => (a.travel_fee_for_request || 0) - (b.travel_fee_for_request || 0));
    } else if (sort_by === 'earliest_available_time') {
      results.sort((a, b) => this._compareISO(a.next_available_slot.start_datetime, b.next_available_slot.start_datetime));
    }

    const total_results = results.length;
    results = this._paginate(results, page, page_size);

    return {
      results,
      page: page || 1,
      page_size: page_size || 20,
      total_results
    };
  }

  createRitualServiceBookingRequest(
    ritualServiceId,
    leaderId,
    format,
    location_zip,
    location_radius_miles,
    full_address,
    requested_date,
    start_datetime,
    end_datetime,
    travel_fee,
    currency,
    requester_name,
    requester_mobile_phone,
    requester_email,
    notes
  ) {
    const ritualServices = this._getFromStorage('ritual_services');
    const leaders = this._getFromStorage('ritual_leaders');
    let requests = this._getFromStorage('ritual_service_booking_requests');

    const service = ritualServices.find(s => s.id === ritualServiceId);
    const leader = leaders.find(l => l.id === leaderId);

    if (!service) {
      return { success: false, booking_request: null, message: 'Ritual service not found.' };
    }
    if (!leader) {
      return { success: false, booking_request: null, message: 'Leader not found.' };
    }

    const nowISO = new Date().toISOString();
    const id = this._generateId('ritual_booking');

    const record = {
      id,
      ritual_service_id: ritualServiceId,
      ritual_service_name_cache: service.name,
      leader_id: leaderId,
      format,
      location_zip: location_zip || '',
      location_radius_miles: location_radius_miles != null ? location_radius_miles : null,
      full_address: full_address || '',
      requested_date: requested_date ? requested_date + 'T00:00:00.000Z' : null,
      start_datetime,
      end_datetime,
      travel_fee: travel_fee != null ? travel_fee : null,
      currency: currency || 'usd',
      requester_name,
      requester_mobile_phone,
      requester_email: requester_email || '',
      notes: notes || '',
      status: 'pending',
      created_at: nowISO
    };

    requests.push(record);
    this._saveToStorage('ritual_service_booking_requests', requests);

    return {
      success: true,
      booking_request: {
        booking_request_id: id,
        ritual_service_id: ritualServiceId,
        leader_id: leaderId,
        format,
        start_datetime,
        end_datetime,
        travel_fee: travel_fee != null ? travel_fee : null,
        currency: currency || 'usd',
        status: 'pending',
        ritual_service: service,
        leader
      },
      message: 'Booking request submitted.'
    };
  }

  // -------------------- Baby Naming Ceremony --------------------

  getBabyNamingCeremonyInfo(ritualServiceSlug) {
    const ritualServices = this._getFromStorage('ritual_services');
    const service = ritualServices.find(s => s.slug === ritualServiceSlug);
    if (!service) {
      return {
        ritual_service_id: null,
        name: '',
        description: '',
        location_options: [],
        morning_time_slots: []
      };
    }

    const formatToLocationOption = format => {
      if (format === 'at_synagogue') return { value: 'at_synagogue', label: 'At the synagogue' };
      if (format === 'at_our_center') return { value: 'at_our_center', label: 'At our center' };
      if (format === 'in_home_visit') return { value: 'in_home_visit', label: 'In-home visit' };
      if (format === 'online') return { value: 'online', label: 'Online' };
      return null;
    };

    const location_options = Array.isArray(service.allowed_formats)
      ? service.allowed_formats.map(formatToLocationOption).filter(Boolean)
      : [];

    const morning_time_slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];

    return {
      ritual_service_id: service.id,
      name: service.name,
      description: service.description || '',
      location_options,
      morning_time_slots
    };
  }

  submitBabyNamingCeremonyRequest(
    ritualServiceId,
    location_option,
    ceremony_date,
    ceremony_time,
    parent_guardian_name,
    baby_name,
    phone,
    email,
    notes
  ) {
    const ritualServices = this._getFromStorage('ritual_services');
    let requests = this._getFromStorage('baby_naming_ceremony_requests');

    const service = ritualServices.find(s => s.id === ritualServiceId);
    if (!service) {
      return { success: false, ceremony_request: null, message: 'Ritual service not found.' };
    }

    const ceremonyDateTimeISO = ceremony_date + 'T' + (ceremony_time || '09:00') + ':00.000Z';
    const nowISO = new Date().toISOString();
    const id = this._generateId('baby_naming');

    const record = {
      id,
      ritual_service_id: ritualServiceId,
      location_option,
      ceremony_datetime: ceremonyDateTimeISO,
      parent_guardian_name,
      baby_name,
      phone,
      email,
      notes: notes || '',
      status: 'pending',
      created_at: nowISO
    };

    requests.push(record);
    this._saveToStorage('baby_naming_ceremony_requests', requests);

    return {
      success: true,
      ceremony_request: {
        request_id: id,
        ritual_service_id: ritualServiceId,
        ceremony_datetime: ceremonyDateTimeISO,
        status: 'pending',
        ritual_service: service
      },
      message: 'Baby naming ceremony request submitted.'
    };
  }

  // -------------------- Classes & Workshops --------------------

  getClassSearchFilterOptions() {
    return {
      duration_options: [
        { min_weeks: 1, label: '1+ weeks' },
        { min_weeks: 4, label: '4+ weeks' },
        { min_weeks: 8, label: '8+ weeks' }
      ],
      time_of_day_options: [
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening_after_6_00_pm', label: 'Evening (after 6:00 pm)' },
        { value: 'evening_after_7_00_pm', label: 'Evening (after 7:00 pm)' },
        { value: 'various', label: 'Various times' }
      ],
      format_options: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      price_ranges: [
        { max_price: 100, label: 'Up to $100' },
        { max_price: 250, label: 'Up to $250' },
        { max_price: 500, label: 'Up to $500' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'soonest_start_date', label: 'Soonest start date' }
      ]
    };
  }

  searchCourses(
    query,
    min_duration_weeks,
    time_of_day,
    max_price,
    format,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const courses = this._getFromStorage('courses');
    let list = courses.filter(c => c.status !== 'canceled');

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(c =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }
    if (typeof min_duration_weeks === 'number') {
      list = list.filter(c => (c.duration_weeks || 0) >= min_duration_weeks);
    }
    if (time_of_day) {
      list = list.filter(c => c.time_of_day === time_of_day);
    }
    if (typeof max_price === 'number') {
      list = list.filter(c => (c.price || 0) <= max_price);
    }
    if (format) {
      list = list.filter(c => c.format === format);
    }

    if (sort_by === 'price_low_to_high') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'soonest_start_date') {
      list.sort((a, b) => this._compareISO(a.start_date || '', b.start_date || ''));
    }

    const total_results = list.length;
    const paged = this._paginate(list, page, page_size).map(c => ({
      course_id: c.id,
      title: c.title,
      slug: c.slug || '',
      description_snippet: this._truncate(c.description || '', 160),
      duration_weeks: c.duration_weeks,
      format: c.format,
      time_of_day: c.time_of_day || '',
      schedule_summary: c.schedule_summary || '',
      start_date: c.start_date || null,
      price: c.price,
      currency: c.currency || 'usd',
      level: c.level || '',
      status: c.status,
      course: c
    }));

    return {
      results: paged,
      page: page || 1,
      page_size: page_size || 20,
      total_results
    };
  }

  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses');
    const paymentOptions = this._getFromStorage('class_payment_options');
    const c = courses.find(x => x.id === courseId);
    if (!c) {
      return {};
    }

    const payment_options = paymentOptions
      .filter(p => p.course_id === courseId && p.is_active)
      .map(p => ({
        payment_option_id: p.id,
        name: p.name,
        key: p.key,
        amount: p.amount,
        currency: p.currency || 'usd',
        is_active: !!p.is_active,
        is_default: !!p.is_default
      }));

    return {
      course_id: c.id,
      title: c.title,
      description: c.description || '',
      syllabus: c.syllabus || '',
      duration_weeks: c.duration_weeks,
      format: c.format,
      time_of_day: c.time_of_day || '',
      schedule_summary: c.schedule_summary || '',
      start_date: c.start_date || null,
      end_date: c.end_date || null,
      meeting_days: Array.isArray(c.meeting_days) ? c.meeting_days : [],
      price: c.price,
      currency: c.currency || 'usd',
      level: c.level || '',
      status: c.status,
      payment_options
    };
  }

  enrollInCourse(courseId, paymentOptionId, participant_name, participant_email) {
    const courses = this._getFromStorage('courses');
    const paymentOptions = this._getFromStorage('class_payment_options');
    let enrollments = this._getFromStorage('class_enrollments');

    const course = courses.find(c => c.id === courseId);
    if (!course) {
      return { success: false, enrollment: null, message: 'Course not found.' };
    }

    let selectedPayment = null;
    if (paymentOptionId) {
      selectedPayment = paymentOptions.find(p => p.id === paymentOptionId && p.course_id === courseId && p.is_active);
      if (!selectedPayment) {
        return { success: false, enrollment: null, message: 'Invalid payment option.' };
      }
    } else {
      const optionsForCourse = paymentOptions.filter(p => p.course_id === courseId && p.is_active);
      selectedPayment = optionsForCourse.find(p => p.key === 'pay_in_full') || optionsForCourse.find(p => p.is_default) || optionsForCourse[0] || null;
    }

    const nowISO = new Date().toISOString();
    const id = this._generateId('class_enrollment');

    const record = {
      id,
      course_id: courseId,
      payment_option_id: selectedPayment ? selectedPayment.id : null,
      participant_name,
      participant_email,
      enrollment_date: nowISO,
      payment_status: 'pending',
      status: 'active'
    };

    enrollments.push(record);
    this._saveToStorage('class_enrollments', enrollments);

    return {
      success: true,
      enrollment: {
        enrollment_id: id,
        course_id: courseId,
        payment_option_id: selectedPayment ? selectedPayment.id : null,
        participant_name,
        participant_email,
        enrollment_date: nowISO,
        payment_status: 'pending',
        status: 'active',
        course,
        payment_option: selectedPayment
      },
      message: 'Enrollment created.'
    };
  }

  // -------------------- Store / Shop --------------------

  getStoreCategories() {
    const categories = this._getFromStorage('store_categories');
    return categories.map(c => ({
      category_id: c.id,
      key: c.key,
      name: c.name,
      description: c.description || ''
    }));
  }

  getStoreCategoryDetail(categoryId) {
    const categories = this._getFromStorage('store_categories');
    const subcategories = this._getFromStorage('product_subcategories');
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      return {};
    }
    const subs = subcategories
      .filter(s => s.category_id === categoryId)
      .map(s => ({
        subcategory_id: s.id,
        key: s.key,
        name: s.name,
        description: s.description || ''
      }));
    return {
      category_id: category.id,
      key: category.key,
      name: category.name,
      description: category.description || '',
      subcategories: subs
    };
  }

  getProductFilterOptions(categoryId, subcategoryId) {
    const products = this._getFromStorage('products');
    let list = products.filter(p => p.status === 'active');
    if (categoryId) list = list.filter(p => p.category_id === categoryId);
    if (subcategoryId) list = list.filter(p => p.subcategory_id === subcategoryId);

    // Dyn rating options
    const rating_options = [
      { min_rating: 4.0, label: '4.0 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    // Dyn price ranges (simple buckets based on actual products)
    const prices = list.map(p => p.price || 0).sort((a, b) => a - b);
    const price_ranges = [];
    if (prices.length) {
      price_ranges.push({ max_price: 20, label: 'Up to $20' });
      price_ranges.push({ max_price: 30, label: 'Up to $30' });
      price_ranges.push({ max_price: 50, label: 'Up to $50' });
    }

    const materialSet = new Set();
    for (const p of list) {
      if (p.material) materialSet.add(p.material);
    }
    const material_options = Array.from(materialSet);

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return { rating_options, price_ranges, material_options, sort_options };
  }

  searchStoreProducts(
    categoryId,
    subcategoryId,
    min_price,
    max_price,
    min_rating,
    material,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('store_categories');
    const subcategories = this._getFromStorage('product_subcategories');

    let list = products.filter(p => p.status === 'active');
    if (categoryId) list = list.filter(p => p.category_id === categoryId);
    if (subcategoryId) list = list.filter(p => p.subcategory_id === subcategoryId);
    if (typeof min_price === 'number') list = list.filter(p => (p.price || 0) >= min_price);
    if (typeof max_price === 'number') list = list.filter(p => (p.price || 0) <= max_price);
    if (typeof min_rating === 'number') list = list.filter(p => (p.rating_average || 0) >= min_rating);
    if (material) list = list.filter(p => p.material === material);

    if (sort_by === 'price_low_to_high') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'rating_high_to_low') {
      list.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    }

    const total_results = list.length;
    const paged = this._paginate(list, page, page_size).map(p => {
      const cat = categories.find(c => c.id === p.category_id) || null;
      const sub = subcategories.find(s => s.id === p.subcategory_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : '',
        subcategory_name: sub ? sub.name : '',
        price: p.price,
        currency: p.currency || 'usd',
        rating_average: p.rating_average || 0,
        rating_count: p.rating_count || 0,
        main_image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '',
        stock_quantity: p.stock_quantity != null ? p.stock_quantity : null,
        product: p,
        category: cat,
        subcategory: sub
      };
    });

    return {
      results: paged,
      page: page || 1,
      page_size: page_size || 20,
      total_results
    };
  }

  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('store_categories');
    const subcategories = this._getFromStorage('product_subcategories');
    const p = products.find(x => x.id === productId);
    if (!p) {
      return {};
    }
    const cat = categories.find(c => c.id === p.category_id) || null;
    const sub = subcategories.find(s => s.id === p.subcategory_id) || null;
    return {
      product_id: p.id,
      name: p.name,
      description: p.description || '',
      category_name: cat ? cat.name : '',
      subcategory_name: sub ? sub.name : '',
      price: p.price,
      currency: p.currency || 'usd',
      rating_average: p.rating_average || 0,
      rating_count: p.rating_count || 0,
      images: Array.isArray(p.images) ? p.images : [],
      stock_quantity: p.stock_quantity != null ? p.stock_quantity : null,
      burn_time_hours: p.burn_time_hours != null ? p.burn_time_hours : null,
      material: p.material || '',
      capacity_oz: p.capacity_oz != null ? p.capacity_oz : null
    };
  }

  // -------------------- Cart --------------------

  addToCart(productId, quantity = 1) {
    const products = this._getFromStorage('products');
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('cart');

    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product) {
      return {
        success: false,
        cart_id: null,
        cart_item: null,
        cart_totals: { subtotal: 0, item_count: 0, currency: 'usd' },
        message: 'Product not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    carts = this._getFromStorage('cart'); // refresh after potential creation

    let existingItem = cartItems.find(ci => ci.cart_id === cart.id && ci.product_id === productId);
    const qty = Math.max(1, quantity || 1);

    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.line_subtotal = existingItem.quantity * existingItem.unit_price;
      cartItems = cartItems.map(ci => (ci.id === existingItem.id ? existingItem : ci));
    } else {
      const id = this._generateId('cart_item');
      const unit_price = product.price;
      const line_subtotal = unit_price * qty;
      existingItem = {
        id,
        cart_id: cart.id,
        product_id: product.id,
        product_name_cache: product.name,
        product_image_url: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '',
        quantity: qty,
        unit_price,
        line_subtotal
      };
      cartItems.push(existingItem);
    }

    const nowISO = new Date().toISOString();
    carts = carts.map(c => (c.id === cart.id ? { ...c, updated_at: nowISO } : c));

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const totals = this._calculateCartTotals(itemsForCart);

    return {
      success: true,
      cart_id: cart.id,
      cart_item: {
        cart_item_id: existingItem.id,
        product_id: existingItem.product_id,
        product_name: existingItem.product_name_cache,
        product_image_url: existingItem.product_image_url,
        quantity: existingItem.quantity,
        unit_price: existingItem.unit_price,
        line_subtotal: existingItem.line_subtotal,
        product
      },
      cart_totals: totals,
      message: 'Item added to cart.'
    };
  }

  getCartSummary() {
    const cartId = this._getCurrentCartId();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    if (!cartId) {
      return {
        cart_id: null,
        items: [],
        totals: { subtotal: 0, item_count: 0, currency: 'usd' }
      };
    }

    const items = cartItems
      .filter(ci => ci.cart_id === cartId)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: ci.product_name_cache,
          product_image_url: ci.product_image_url,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_subtotal: ci.line_subtotal,
          product
        };
      });

    const totals = this._calculateCartTotals(items);
    return {
      cart_id: cartId,
      items,
      totals
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const cartId = this._getCurrentCartId();
    if (!cartId) {
      return {
        success: false,
        cart_id: null,
        items: [],
        totals: { subtotal: 0, item_count: 0, currency: 'usd' },
        message: 'No cart.'
      };
    }

    const item = cartItems.find(ci => ci.id === cartItemId && ci.cart_id === cartId);
    if (!item) {
      const items = [];
      const totals = { subtotal: 0, item_count: 0, currency: 'usd' };
      return { success: false, cart_id: cartId, items, totals, message: 'Cart item not found.' };
    }

    if (quantity <= 0) {
      cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    } else {
      item.quantity = quantity;
      item.line_subtotal = item.unit_price * item.quantity;
      cartItems = cartItems.map(ci => (ci.id === cartItemId ? item : ci));
    }

    this._saveToStorage('cart_items', cartItems);

    const items = cartItems
      .filter(ci => ci.cart_id === cartId)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: ci.product_name_cache,
          product_image_url: ci.product_image_url,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_subtotal: ci.line_subtotal,
          product
        };
      });

    const totals = this._calculateCartTotals(items);

    return {
      success: true,
      cart_id: cartId,
      items,
      totals,
      message: 'Cart updated.'
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const cartId = this._getCurrentCartId();

    if (!cartId) {
      return {
        success: false,
        cart_id: null,
        items: [],
        totals: { subtotal: 0, item_count: 0, currency: 'usd' },
        message: 'No cart.'
      };
    }

    cartItems = cartItems.filter(ci => !(ci.id === cartItemId && ci.cart_id === cartId));
    this._saveToStorage('cart_items', cartItems);

    const items = cartItems
      .filter(ci => ci.cart_id === cartId)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: ci.product_name_cache,
          product_image_url: ci.product_image_url,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_subtotal: ci.line_subtotal,
          product
        };
      });

    const totals = this._calculateCartTotals(items);

    return {
      success: true,
      cart_id: cartId,
      items,
      totals,
      message: 'Item removed from cart.'
    };
  }

  // -------------------- Support Groups --------------------

  getSupportGroupFilterOptions() {
    return {
      theme_options: [
        { value: 'grief_support', label: 'Grief Support' },
        { value: 'mindfulness', label: 'Mindfulness' },
        { value: 'parenting_support', label: 'Parenting Support' },
        { value: 'other', label: 'Other' }
      ],
      format_options: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      day_options: ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],
      time_of_day_options: ['morning','afternoon','evening_after_6_00_pm','evening_after_7_00_pm','various'],
      level_options: ['beginner','intermediate','advanced','open_to_newcomers','all_levels'],
      sort_options: [
        { value: 'date_soonest_first', label: 'Date: Soonest first' },
        { value: 'title_az', label: 'Title A–Z' }
      ]
    };
  }

  searchSupportGroupsWithNextMeeting(
    theme,
    format,
    days_of_week,
    time_of_day,
    level,
    date_range_start,
    date_range_end,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const groups = this._getFromStorage('support_groups');
    const meetings = this._getFromStorage('group_meetings');
    const now = new Date();
    const nowISO = now.toISOString();

    let startDate = date_range_start ? this._parseDateOnly(date_range_start) : now;
    const monthRange = this._getCurrentMonthRange();
    let endDate = date_range_end ? this._parseDateOnly(date_range_end) : this._parseDateOnly(monthRange.end_date);

    const startISO = startDate.toISOString();
    const endISO = new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

    let list = groups.filter(g => g.status !== 'completed');

    if (theme) list = list.filter(g => g.theme === theme);
    if (format) list = list.filter(g => g.format === format);
    if (time_of_day) list = list.filter(g => g.time_of_day === time_of_day);
    if (level) list = list.filter(g => g.level === level);

    const dayFilter = Array.isArray(days_of_week) && days_of_week.length > 0 ? days_of_week : null;

    const results = [];
    for (const g of list) {
      let groupMeetings = meetings.filter(m =>
        m.support_group_id === g.id &&
        !m.is_canceled &&
        m.start_datetime >= startISO &&
        m.start_datetime <= endISO &&
        m.start_datetime >= nowISO
      );

      if (dayFilter) {
        groupMeetings = groupMeetings.filter(m => {
          const dt = new Date(m.start_datetime);
          const dow = this._getDayOfWeekString(dt);
          return dayFilter.includes(dow);
        });
      }

      groupMeetings.sort((a, b) => this._compareISO(a.start_datetime, b.start_datetime));
      const next = groupMeetings[0];
      if (!next) continue;

      results.push({
        support_group_id: g.id,
        title: g.title,
        theme: g.theme,
        description_snippet: this._truncate(g.description || '', 160),
        format: g.format,
        level: g.level || '',
        time_of_day: g.time_of_day || '',
        schedule_summary: g.schedule_summary || '',
        status: g.status,
        next_meeting: {
          group_meeting_id: next.id,
          start_datetime: next.start_datetime,
          end_datetime: next.end_datetime,
          is_canceled: !!next.is_canceled
        },
        support_group: g
      });
    }

    if (sort_by === 'title_az') {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort_by === 'date_soonest_first') {
      results.sort((a, b) => this._compareISO(a.next_meeting.start_datetime, b.next_meeting.start_datetime));
    }

    const total_results = results.length;
    const paged = this._paginate(results, page, page_size);

    return {
      results: paged,
      page: page || 1,
      page_size: page_size || 20,
      total_results
    };
  }

  getSupportGroupDetailWithMeetings(supportGroupId) {
    const groups = this._getFromStorage('support_groups');
    const meetings = this._getFromStorage('group_meetings');
    const g = groups.find(x => x.id === supportGroupId);
    if (!g) {
      return {};
    }
    const nowISO = new Date().toISOString();
    const upcoming = meetings
      .filter(m => m.support_group_id === supportGroupId && !m.is_canceled && m.start_datetime >= nowISO)
      .sort((a, b) => this._compareISO(a.start_datetime, b.start_datetime))
      .map(m => ({
        group_meeting_id: m.id,
        start_datetime: m.start_datetime,
        end_datetime: m.end_datetime,
        is_canceled: !!m.is_canceled
      }));

    return {
      support_group_id: g.id,
      title: g.title,
      theme: g.theme,
      description: g.description || '',
      format: g.format,
      level: g.level || '',
      time_of_day: g.time_of_day || '',
      days_of_week: Array.isArray(g.days_of_week) ? g.days_of_week : [],
      schedule_summary: g.schedule_summary || '',
      facilitator_name: g.facilitator_name || '',
      status: g.status,
      upcoming_meetings: upcoming
    };
  }

  registerForSupportGroupMeeting(
    supportGroupId,
    groupMeetingId,
    participant_name,
    participant_email,
    attendees_count = 1
  ) {
    const groups = this._getFromStorage('support_groups');
    const meetings = this._getFromStorage('group_meetings');
    let registrations = this._getFromStorage('group_registrations');

    const group = groups.find(g => g.id === supportGroupId);
    if (!group) {
      return { success: false, registration: null, message: 'Support group not found.' };
    }

    let meeting = null;
    if (groupMeetingId) {
      meeting = meetings.find(m => m.id === groupMeetingId && m.support_group_id === supportGroupId);
      if (!meeting || meeting.is_canceled) {
        return { success: false, registration: null, message: 'Invalid or canceled meeting.' };
      }
    }

    const nowISO = new Date().toISOString();
    const id = this._generateId('group_registration');

    const record = {
      id,
      support_group_id: supportGroupId,
      group_meeting_id: meeting ? meeting.id : null,
      participant_name,
      participant_email,
      attendees_count: attendees_count || 1,
      registration_datetime: nowISO,
      status: 'confirmed'
    };

    registrations.push(record);
    this._saveToStorage('group_registrations', registrations);

    return {
      success: true,
      registration: {
        registration_id: id,
        support_group_id: supportGroupId,
        group_meeting_id: meeting ? meeting.id : null,
        participant_name,
        participant_email,
        attendees_count: attendees_count || 1,
        registration_datetime: nowISO,
        status: 'confirmed',
        support_group: group,
        group_meeting: meeting
      },
      message: 'Registration completed.'
    };
  }

  // -------------------- Donations --------------------

  getDonationFormOptions() {
    const funds = this._getFromStorage('funds');
    const frequencies = ['one_time', 'monthly_recurring'];
    const dedication_types = ['none', 'in_honor_of', 'in_memory_of'];

    const fundsOut = funds.map(f => ({
      fund_id: f.id,
      key: f.key,
      name: f.name,
      description: f.description || '',
      is_active: !!f.is_active
    }));

    return {
      frequencies,
      funds: fundsOut,
      dedication_types
    };
  }

  createOrUpdateDonationDraft(
    donationId,
    amount,
    currency,
    frequency,
    fundId,
    start_date,
    dedication_type,
    dedication_honoree_name,
    donor_name,
    donor_email,
    donor_zip
  ) {
    const funds = this._getFromStorage('funds');
    let donations = this._getFromStorage('donations');

    const fund = funds.find(f => f.id === fundId);
    if (!fund) {
      return { success: false, donation: null, message: 'Fund not found.' };
    }

    let donation = null;
    if (donationId) {
      donation = donations.find(d => d.id === donationId);
    }

    const nowISO = new Date().toISOString();

    if (!donation) {
      const id = this._generateId('donation');
      donation = {
        id,
        amount,
        currency: currency || 'usd',
        frequency,
        fund_id: fundId,
        start_date: start_date ? start_date + 'T00:00:00.000Z' : null,
        created_at: nowISO,
        dedication_type,
        dedication_honoree_name: dedication_honoree_name || '',
        donor_name,
        donor_email,
        donor_zip,
        status: 'draft'
      };
      donations.push(donation);
    } else {
      donation.amount = amount;
      donation.currency = currency || 'usd';
      donation.frequency = frequency;
      donation.fund_id = fundId;
      donation.start_date = start_date ? start_date + 'T00:00:00.000Z' : donation.start_date;
      donation.dedication_type = dedication_type;
      donation.dedication_honoree_name = dedication_honoree_name || '';
      donation.donor_name = donor_name;
      donation.donor_email = donor_email;
      donation.donor_zip = donor_zip;
      // keep status as is if already draft/submitted
      donations = donations.map(d => (d.id === donation.id ? donation : d));
    }

    this._saveToStorage('donations', donations);

    return {
      success: true,
      donation: {
        donation_id: donation.id,
        amount: donation.amount,
        currency: donation.currency,
        frequency: donation.frequency,
        fund_id: donation.fund_id,
        fund_name: fund.name,
        start_date: donation.start_date,
        dedication_type: donation.dedication_type,
        dedication_honoree_name: donation.dedication_honoree_name,
        donor_name: donation.donor_name,
        donor_email: donation.donor_email,
        donor_zip: donation.donor_zip,
        status: donation.status,
        fund
      },
      message: 'Donation draft saved.'
    };
  }

  getDonationReviewSummary(donationId) {
    const donations = this._getFromStorage('donations');
    const funds = this._getFromStorage('funds');
    const donation = donations.find(d => d.id === donationId);
    if (!donation) {
      return {};
    }
    const fund = funds.find(f => f.id === donation.fund_id) || null;

    let dedication_display = '';
    if (donation.dedication_type === 'in_memory_of' && donation.dedication_honoree_name) {
      dedication_display = 'In memory of ' + donation.dedication_honoree_name;
    } else if (donation.dedication_type === 'in_honor_of' && donation.dedication_honoree_name) {
      dedication_display = 'In honor of ' + donation.dedication_honoree_name;
    }

    return {
      donation_id: donation.id,
      amount: donation.amount,
      currency: donation.currency,
      frequency: donation.frequency,
      fund_name: fund ? fund.name : '',
      start_date: donation.start_date,
      dedication_type: donation.dedication_type,
      dedication_display,
      donor_name: donation.donor_name,
      donor_email: donation.donor_email,
      donor_zip: donation.donor_zip,
      status: donation.status,
      fund
    };
  }

  confirmDonation(donationId) {
    let donations = this._getFromStorage('donations');
    const donation = donations.find(d => d.id === donationId);
    if (!donation) {
      return { success: false, donation: null, message: 'Donation not found.' };
    }
    donation.status = 'submitted';
    donations = donations.map(d => (d.id === donationId ? donation : d));
    this._saveToStorage('donations', donations);

    return {
      success: true,
      donation: {
        donation_id: donation.id,
        status: donation.status
      },
      message: 'Donation submitted.'
    };
  }

  // -------------------- Newsletter --------------------

  getNewsletterSignupOptions() {
    const topics = this._getFromStorage('newsletter_topics');
    const frequency_options = ['weekly', 'monthly'];
    const content_format_options = ['article_summaries', 'full_articles'];

    const topicsOut = topics.map(t => ({
      topic_id: t.id,
      key: t.key,
      name: t.name,
      description: t.description || '',
      default_frequency: t.default_frequency
    }));

    return {
      topics: topicsOut,
      frequency_options,
      content_format_options
    };
  }

  subscribeToNewsletter(email, first_name, topics, frequency, content_format) {
    let subs = this._getFromStorage('newsletter_subscriptions');
    let sub = subs.find(s => s.email === email);
    const nowISO = new Date().toISOString();

    if (!Array.isArray(topics)) topics = [];

    if (!sub) {
      const id = this._generateId('newsletter_sub');
      sub = {
        id,
        email,
        first_name: first_name || '',
        topics,
        frequency,
        content_format,
        created_at: nowISO,
        status: 'active'
      };
      subs.push(sub);
    } else {
      sub.first_name = first_name || sub.first_name;
      sub.topics = topics;
      sub.frequency = frequency;
      sub.content_format = content_format;
      sub.status = 'active';
      subs = subs.map(s => (s.id === sub.id ? sub : s));
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription: {
        subscription_id: sub.id,
        email: sub.email,
        first_name: sub.first_name,
        topics: sub.topics,
        frequency: sub.frequency,
        content_format: sub.content_format,
        status: sub.status
      },
      message: 'Subscription saved.'
    };
  }

  // -------------------- About & Contact --------------------

  getAboutPageContent() {
    // Content is stored in localStorage so it can be managed externally.
    const content = this._getFromStorage('about_page_content');
    return {
      mission: content.mission || '',
      values: Array.isArray(content.values) ? content.values : [],
      spiritual_orientation: content.spiritual_orientation || '',
      integration_description: content.integration_description || '',
      impact_highlights: Array.isArray(content.impact_highlights) ? content.impact_highlights : [],
      staff_profiles: Array.isArray(content.staff_profiles) ? content.staff_profiles : []
    };
  }

  getContactFormOptions() {
    const stored = this._getFromStorage('contact_form_options');
    return {
      topics: Array.isArray(stored.topics) ? stored.topics : [],
      primary_contact: stored.primary_contact || { phone: '', email: '', address: '' },
      expected_response_time: stored.expected_response_time || ''
    };
  }

  submitContactInquiry(topic, name, email, phone, message) {
    let inquiries = this._getFromStorage('contact_inquiries');
    const id = this._generateId('contact');
    const nowISO = new Date().toISOString();

    const record = {
      id,
      topic,
      name,
      email,
      phone: phone || '',
      message,
      created_at: nowISO
    };

    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      tracking_id: id,
      message: 'Inquiry submitted.'
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
