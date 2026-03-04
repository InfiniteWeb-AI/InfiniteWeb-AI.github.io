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
    this.idCounter = this._getNextIdCounter(); // advance counter once
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const keysWithDefaults = {
      support_groups: [],
      support_plan_groups: [],
      donations: [],
      events: [],
      event_registrations: [],
      resources: [],
      reading_list_items: [],
      volunteer_opportunities: [],
      volunteer_saved_opportunities: [],
      financial_assistance_programs: [],
      resource_plan_programs: [],
      care_task_templates: [],
      care_roadmaps: [],
      care_roadmap_tasks: [],
      product_categories: [],
      products: [],
      cart_items: [],
      emotional_support_channels: [],
      channel_availability_slots: [],
      counseling_requests: []
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(keysWithDefaults[key]));
      }
    });

    // Single cart object for current session; store as JSON, may be null initially
    if (localStorage.getItem('cart') === null) {
      localStorage.setItem('cart', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed === null ? defaultValue : parsed;
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

  // ---------------------- Label / formatting helpers ----------------------

  _labelSupportGroupFocus(focus) {
    switch (focus) {
      case 'breast_cancer': return 'Breast cancer';
      case 'lung_cancer': return 'Lung cancer';
      case 'all_cancers': return 'All cancers';
      case 'caregivers': return 'Caregivers';
      case 'family_members': return 'Family members';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelSupportGroupFormat(format) {
    switch (format) {
      case 'in_person': return 'In-person';
      case 'virtual': return 'Virtual';
      case 'hybrid': return 'Hybrid';
      default: return '';
    }
  }

  _labelGroupType(groupType) {
    switch (groupType) {
      case 'support_group': return 'Support group';
      case 'education_class': return 'Education class';
      case 'workshop': return 'Workshop';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelDayOfWeek(d) {
    switch (d) {
      case 'monday': return 'Monday';
      case 'tuesday': return 'Tuesday';
      case 'wednesday': return 'Wednesday';
      case 'thursday': return 'Thursday';
      case 'friday': return 'Friday';
      case 'saturday': return 'Saturday';
      case 'sunday': return 'Sunday';
      case 'varies': return 'Varies';
      default: return '';
    }
  }

  _labelMeetingTimeOfDay(v) {
    switch (v) {
      case 'morning': return 'Morning';
      case 'afternoon': return 'Afternoon';
      case 'evening_5_9_pm': return 'Evening (5–9 pm)';
      case 'evening_after_5_pm': return 'Evening (after 5 pm)';
      case 'varies': return 'Varies';
      default: return '';
    }
  }

  _labelEventFormat(format) {
    switch (format) {
      case 'online_webinar': return 'Online webinar';
      case 'in_person': return 'In-person';
      case 'hybrid': return 'Hybrid';
      default: return '';
    }
  }

  _labelEventTopic(topic) {
    switch (topic) {
      case 'nutrition_diet': return 'Nutrition & Diet';
      case 'treatment_options': return 'Treatment options';
      case 'coping_emotionally': return 'Coping emotionally';
      case 'finances_practical_support': return 'Finances & practical support';
      case 'caregiving': return 'Caregiving';
      case 'exercise_rehab': return 'Exercise & rehabilitation';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelTimeOfDay(v) {
    switch (v) {
      case 'morning': return 'Morning';
      case 'afternoon': return 'Afternoon';
      case 'evening_after_5_pm': return 'Evening (after 5 pm)';
      case 'evening': return 'Evening';
      case 'all_day': return 'All day';
      default: return '';
    }
  }

  _labelPrice(price_type, price_amount, currency) {
    if (price_type === 'free') return 'Free';
    if (price_type === 'donation_based') return 'Donation-based';
    if (price_type === 'paid') {
      if (currency === 'usd' && typeof price_amount === 'number') {
        return '$' + price_amount.toFixed(2);
      }
      return String(price_amount || '');
    }
    return '';
  }

  _labelContentType(content_type) {
    switch (content_type) {
      case 'article': return 'Article';
      case 'video': return 'Video';
      case 'podcast': return 'Podcast';
      case 'guide': return 'Guide';
      case 'checklist': return 'Checklist';
      case 'webinar_recording': return 'Webinar recording';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelVolunteerRoleType(role_type) {
    switch (role_type) {
      case 'driver_transportation': return 'Driver / Transportation';
      case 'office_support': return 'Office support';
      case 'event_support': return 'Event support';
      case 'fundraising': return 'Fundraising';
      case 'peer_support': return 'Peer support';
      case 'administrative': return 'Administrative';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelProgramType(program_type) {
    switch (program_type) {
      case 'financial_aid': return 'Financial aid';
      case 'medication_assistance': return 'Medication assistance';
      case 'transportation_support': return 'Transportation support';
      case 'lodging_support': return 'Lodging support';
      case 'counseling_support': return 'Counseling support';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelFundingType(funding_type) {
    switch (funding_type) {
      case 'grants_no_repayment': return 'Grants (no repayment)';
      case 'loan_repayment_required': return 'Loans (repayment required)';
      case 'discount_program': return 'Discount program';
      case 'reimbursement': return 'Reimbursement';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelPersona(persona) {
    switch (persona) {
      case 'newly_diagnosed_patient': return 'Newly diagnosed patient';
      case 'long_term_patient': return 'Long-term patient';
      case 'caregiver': return 'Caregiver';
      case 'survivor': return 'Survivor';
      case 'bereaved': return 'Bereaved';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelTaskCategory(category) {
    switch (category) {
      case 'medical_preparation': return 'Medical preparation';
      case 'self_care': return 'Self-care';
      case 'support_connection': return 'Support & connection';
      case 'physical_activity': return 'Physical activity';
      case 'planning_paperwork': return 'Planning & paperwork';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelProductCategoryKey(key) {
    switch (key) {
      case 'comfort_kits': return 'Comfort kits';
      case 'awareness_accessories': return 'Awareness accessories';
      case 'apparel': return 'Apparel';
      case 'home_goods': return 'Home goods';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _labelProductType(product_type) {
    switch (product_type) {
      case 'comfort_kit': return 'Comfort kit';
      case 'wristband': return 'Wristband';
      case 'pin': return 'Pin';
      case 'ribbon': return 'Ribbon';
      case 'mug': return 'Mug';
      case 't_shirt': return 'T-shirt';
      case 'hat': return 'Hat';
      case 'other': return 'Other';
      default: return '';
    }
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (
      weekdays[d.getDay()] + ', ' +
      months[d.getMonth()] + ' ' +
      d.getDate()
    );
  }

  _formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  _formatDateTimeLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return this._formatDate(dateStr) + '  b7 ' + this._formatTime(dateStr);
  }

  _todayIsoDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  _getDayOfWeekFromDateString(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const idx = d.getDay(); // 0-6, Sunday=0
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[idx];
  }

  _caseInsensitiveIncludes(haystack, needle) {
    if (!haystack || !needle) return false;
    return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
  }

  // ---------------------- Helper functions required by spec ----------------------

  _getOrCreateCart() {
    const raw = localStorage.getItem('cart');
    let cart = null;
    if (raw && raw !== 'null') {
      try {
        cart = JSON.parse(raw);
      } catch (e) {
        cart = null;
      }
    }
    if (!cart || cart.status !== 'open') {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: now,
        updated_at: now
      };
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    return cart;
  }

  _setCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  _getCurrentSupportPlan() {
    return this._getFromStorage('support_plan_groups', []);
  }

  _getCurrentReadingList() {
    return this._getFromStorage('reading_list_items', []);
  }

  _getCurrentVolunteerSavedList() {
    return this._getFromStorage('volunteer_saved_opportunities', []);
  }

  _getCurrentResourcePlan() {
    return this._getFromStorage('resource_plan_programs', []);
  }

  _getOrCreateCareRoadmap() {
    const roadmaps = this._getFromStorage('care_roadmaps', []);
    if (roadmaps.length > 0) {
      return roadmaps[0];
    }
    const now = new Date().toISOString();
    const roadmap = {
      id: this._generateId('roadmap'),
      persona: 'other',
      priorities: [],
      title: 'My Care Roadmap',
      notes: '',
      created_at: now,
      updated_at: now
    };
    const updated = [roadmap];
    this._saveToStorage('care_roadmaps', updated);
    return roadmap;
  }

  _getCurrentDonationDraft() {
    const donations = this._getFromStorage('donations', []);
    let draft = donations.find((d) => d.status === 'draft');
    if (!draft) {
      const now = new Date().toISOString();
      draft = {
        id: this._generateId('donation'),
        amount: 0,
        currency: 'usd',
        frequency: 'one_time',
        fund_designation: 'general_support_fund',
        cover_processing_fees: false,
        payment_method: 'credit_card',
        donor_first_name: '',
        donor_last_name: '',
        donor_email: '',
        donor_address_line1: '',
        donor_address_line2: '',
        donor_city: '',
        donor_state: '',
        donor_postal_code: '',
        donor_country: '',
        is_anonymous: false,
        wants_email_updates: true,
        status: 'draft',
        created_at: now,
        updated_at: now
      };
      donations.push(draft);
      this._saveToStorage('donations', donations);
    }
    return draft;
  }

  _computeChannelNextAvailableTime(channel_key, timezone, dateStr, slots) {
    // slots: array of {day_of_week, start_time_local, end_time_local, is_open}
    if (!Array.isArray(slots) || slots.length === 0) return null;
    const todayIso = dateStr || this._todayIsoDate();

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let candidate = null;

    slots
      .filter((s) => s.is_open)
      .forEach((slot) => {
        const [sh, sm] = slot.start_time_local.split(':').map((x) => parseInt(x, 10));
        const [eh, em] = slot.end_time_local.split(':').map((x) => parseInt(x, 10));
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        let slotStartDateTime = null;
        if (nowMinutes <= startMinutes) {
          // upcoming slot today
          slotStartDateTime = new Date(`${todayIso}T${slot.start_time_local}:00`);
        } else if (nowMinutes > startMinutes && nowMinutes < endMinutes) {
          // currently open, so next available is now
          slotStartDateTime = new Date();
        }

        if (slotStartDateTime) {
          if (!candidate || slotStartDateTime < candidate) {
            candidate = slotStartDateTime;
          }
        }
      });

    return candidate ? candidate.toISOString() : null;
  }

  // ---------------------- Core interface implementations ----------------------

  // getHomepageFeaturedContent
  getHomepageFeaturedContent() {
    const supportGroups = this._getFromStorage('support_groups', []);
    const events = this._getFromStorage('events', []);
    const resources = this._getFromStorage('resources', []);

    const services_overview = [
      {
        key: 'support_groups',
        title: 'Find support groups',
        summary: 'Connect with others through in-person and online cancer support groups.'
      },
      {
        key: 'emotional_support',
        title: 'Talk to someone',
        summary: 'Reach trained counselors by phone, chat, or email for emotional support.'
      },
      {
        key: 'financial_help',
        title: 'Financial & practical help',
        summary: 'Explore grants and assistance programs for treatment, transportation, and more.'
      }
    ];

    const activeGroups = supportGroups.filter((g) => g.is_active);
    activeGroups.sort((a, b) => {
      const ad = a.next_meeting_datetime ? new Date(a.next_meeting_datetime).getTime() : Infinity;
      const bd = b.next_meeting_datetime ? new Date(b.next_meeting_datetime).getTime() : Infinity;
      return ad - bd;
    });

    const featured_support_groups = activeGroups.slice(0, 3).map((g) => ({
      id: g.id,
      title: g.title,
      focus_label: this._labelSupportGroupFocus(g.focus),
      format_label: this._labelSupportGroupFormat(g.format),
      city: g.city || '',
      state: g.state || '',
      next_meeting_datetime: g.next_meeting_datetime || null,
      next_meeting_label: this._formatDateTimeLabel(g.next_meeting_datetime)
    }));

    const upcomingEventsRaw = events.filter((e) => e.status === 'scheduled');
    upcomingEventsRaw.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const upcoming_events = upcomingEventsRaw.slice(0, 3).map((e) => ({
      id: e.id,
      title: e.title,
      start_datetime: e.start_datetime,
      format_label: this._labelEventFormat(e.format),
      topic_label: this._labelEventTopic(e.topic),
      price_label: this._labelPrice(e.price_type, e.price_amount, e.currency)
    }));

    const popularResourcesRaw = resources.slice().filter((r) => typeof r.rating === 'number');
    popularResourcesRaw.sort((a, b) => {
      const ra = a.rating || 0;
      const rb = b.rating || 0;
      if (rb !== ra) return rb - ra;
      const ca = a.rating_count || 0;
      const cb = b.rating_count || 0;
      if (cb !== ca) return cb - ca;
      const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
      const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
      return db - da;
    });

    const popular_resources = popularResourcesRaw.slice(0, 5).map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary || '',
      content_type_label: this._labelContentType(r.content_type),
      rating: typeof r.rating === 'number' ? r.rating : null,
      rating_count: typeof r.rating_count === 'number' ? r.rating_count : 0
    }));

    return {
      services_overview,
      featured_support_groups,
      upcoming_events,
      popular_resources
    };
  }

  // globalSearch
  globalSearch(query, types, limit_per_type = 5) {
    const q = (query || '').trim();
    const includeAll = !Array.isArray(types) || types.length === 0;
    const typeSet = includeAll ? null : new Set(types);

    const result = {
      support_groups: [],
      events: [],
      resources: [],
      volunteer_opportunities: [],
      financial_programs: []
    };

    if (!q) {
      return result;
    }

    if (includeAll || typeSet.has('support_groups')) {
      const groups = this._getFromStorage('support_groups', []);
      const filtered = groups.filter((g) => {
        if (!g.is_active) return false;
        return this._caseInsensitiveIncludes(g.title, q) || this._caseInsensitiveIncludes(g.description, q);
      });
      result.support_groups = filtered.slice(0, limit_per_type).map((g) => ({
        id: g.id,
        title: g.title,
        focus_label: this._labelSupportGroupFocus(g.focus)
      }));
    }

    if (includeAll || typeSet.has('events')) {
      const events = this._getFromStorage('events', []);
      const filtered = events.filter((e) => {
        if (e.status !== 'scheduled') return false;
        return this._caseInsensitiveIncludes(e.title, q) || this._caseInsensitiveIncludes(e.description, q);
      });
      filtered.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      result.events = filtered.slice(0, limit_per_type).map((e) => ({
        id: e.id,
        title: e.title,
        start_datetime: e.start_datetime
      }));
    }

    if (includeAll || typeSet.has('resources')) {
      const resources = this._getFromStorage('resources', []);
      const filtered = resources.filter((r) => {
        const inTitle = this._caseInsensitiveIncludes(r.title, q);
        const inSummary = this._caseInsensitiveIncludes(r.summary, q);
        const inTags = Array.isArray(r.tags) && r.tags.some((t) => this._caseInsensitiveIncludes(t, q));
        return inTitle || inSummary || inTags;
      });
      result.resources = filtered.slice(0, limit_per_type).map((r) => ({
        id: r.id,
        title: r.title,
        content_type_label: this._labelContentType(r.content_type)
      }));
    }

    if (includeAll || typeSet.has('volunteer_opportunities')) {
      const opps = this._getFromStorage('volunteer_opportunities', []);
      const filtered = opps.filter((o) => {
        if (o.status !== 'open') return false;
        return this._caseInsensitiveIncludes(o.title, q) || this._caseInsensitiveIncludes(o.description, q);
      });
      result.volunteer_opportunities = filtered.slice(0, limit_per_type).map((o) => ({
        id: o.id,
        title: o.title,
        role_type_label: this._labelVolunteerRoleType(o.role_type)
      }));
    }

    if (includeAll || typeSet.has('financial_programs')) {
      const progs = this._getFromStorage('financial_assistance_programs', []);
      const filtered = progs.filter((p) => {
        if (!p.is_active) return false;
        const inName = this._caseInsensitiveIncludes(p.name, q);
        const inDesc = this._caseInsensitiveIncludes(p.description, q);
        const inNeeds = Array.isArray(p.needs_supported) && p.needs_supported.some((n) => this._caseInsensitiveIncludes(n, q));
        return inName || inDesc || inNeeds;
      });
      result.financial_programs = filtered.slice(0, limit_per_type).map((p) => ({
        id: p.id,
        name: p.name,
        program_type_label: this._labelProgramType(p.program_type)
      }));
    }

    return result;
  }

  // getCommonQuickLinksTopics
  getCommonQuickLinksTopics() {
    return [
      {
        key: 'chemotherapy_side_effects',
        label: 'Chemotherapy side effects',
        recommended_search_query: 'chemotherapy side effects'
      },
      {
        key: 'transportation_support',
        label: 'Help with transportation',
        recommended_search_query: 'transportation assistance'
      },
      {
        key: 'financial_assistance',
        label: 'Financial assistance',
        recommended_search_query: 'financial assistance grants'
      },
      {
        key: 'nutrition',
        label: 'Nutrition during treatment',
        recommended_search_query: 'nutrition and cancer treatment'
      }
    ];
  }

  // ---------------------- Support Groups (task_1) ----------------------

  getSupportGroupFilterOptions() {
    return {
      format_options: [
        { value: 'in_person', label: 'In-person' },
        { value: 'virtual', label: 'Virtual' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      focus_options: [
        { value: 'breast_cancer', label: 'Breast cancer' },
        { value: 'lung_cancer', label: 'Lung cancer' },
        { value: 'all_cancers', label: 'All cancers' },
        { value: 'caregivers', label: 'Caregivers' },
        { value: 'family_members', label: 'Family members' },
        { value: 'other', label: 'Other' }
      ],
      day_of_week_options: [
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'varies'
      ].map((v) => ({ value: v, label: this._labelDayOfWeek(v) })),
      time_of_day_options: [
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening_5_9_pm', label: 'Evening (5–9 pm)' },
        { value: 'evening_after_5_pm', label: 'Evening (after 5 pm)' },
        { value: 'varies', label: 'Varies' }
      ],
      radius_miles_options: [5, 10, 15, 20, 25, 50, 100],
      sort_options: [
        { value: 'next_meeting_date_soonest_first', label: 'Next meeting date (soonest first)' },
        { value: 'distance', label: 'Distance' },
        { value: 'relevance', label: 'Relevance' }
      ]
    };
  }

  searchSupportGroups(
    postal_code,
    radius_miles = 25,
    focus,
    format,
    meeting_day_of_week,
    meeting_time_of_day,
    sort_by = 'next_meeting_date_soonest_first',
    page = 1,
    page_size = 10
  ) {
    let groups = this._getFromStorage('support_groups', []);

    groups = groups.filter((g) => g.is_active);

    if (postal_code) {
      groups = groups.filter((g) => g.postal_code === postal_code);
    }

    if (focus) {
      groups = groups.filter((g) => g.focus === focus);
    }

    if (format) {
      groups = groups.filter((g) => g.format === format);
    }

    if (meeting_day_of_week) {
      groups = groups.filter((g) => g.meeting_day_of_week === meeting_day_of_week);
    }

    if (meeting_time_of_day) {
      groups = groups.filter((g) => {
        if (!g.meeting_time_of_day) return false;
        if (g.meeting_time_of_day === meeting_time_of_day) return true;
        // Hierarchical: evening_after_5_pm includes evening_5_9_pm
        if (
          meeting_time_of_day === 'evening_after_5_pm' &&
          (g.meeting_time_of_day === 'evening_5_9_pm' || g.meeting_time_of_day === 'evening_after_5_pm')
        ) {
          return true;
        }
        return false;
      });
    }

    if (sort_by === 'next_meeting_date_soonest_first') {
      groups.sort((a, b) => {
        const ad = a.next_meeting_datetime ? new Date(a.next_meeting_datetime).getTime() : Infinity;
        const bd = b.next_meeting_datetime ? new Date(b.next_meeting_datetime).getTime() : Infinity;
        return ad - bd;
      });
    }

    const total_results = groups.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = groups.slice(start, end);

    const results = pageItems.map((g) => ({
      id: g.id,
      title: g.title,
      focus_label: this._labelSupportGroupFocus(g.focus),
      format_label: this._labelSupportGroupFormat(g.format),
      city: g.city || '',
      state: g.state || '',
      distance_miles: null, // distance not computed; radius filter approximated by ZIP
      meeting_day_of_week_label: this._labelDayOfWeek(g.meeting_day_of_week),
      meeting_time_of_day_label: this._labelMeetingTimeOfDay(g.meeting_time_of_day),
      next_meeting_datetime: g.next_meeting_datetime || null,
      next_meeting_label: this._formatDateTimeLabel(g.next_meeting_datetime),
      is_active: !!g.is_active
    }));

    return { results, total_results, page, page_size };
  }

  getSupportGroupDetail(support_group_id) {
    const groups = this._getFromStorage('support_groups', []);
    const group = groups.find((g) => g.id === support_group_id);
    if (!group) return null;

    const planItems = this._getCurrentSupportPlan();
    const is_saved = planItems.some((i) => i.support_group_id === support_group_id);

    return {
      id: group.id,
      title: group.title,
      description: group.description || '',
      focus_label: this._labelSupportGroupFocus(group.focus),
      format_label: this._labelSupportGroupFormat(group.format),
      group_type_label: this._labelGroupType(group.group_type),
      address_line1: group.address_line1 || '',
      address_line2: group.address_line2 || '',
      city: group.city || '',
      state: group.state || '',
      postal_code: group.postal_code || '',
      country: group.country || '',
      latitude: group.latitude || null,
      longitude: group.longitude || null,
      meeting_day_of_week_label: this._labelDayOfWeek(group.meeting_day_of_week),
      meeting_time_of_day_label: this._labelMeetingTimeOfDay(group.meeting_time_of_day),
      meeting_start_time: group.meeting_start_time || '',
      meeting_end_time: group.meeting_end_time || '',
      next_meeting_datetime: group.next_meeting_datetime || null,
      next_meeting_label: this._formatDateTimeLabel(group.next_meeting_datetime),
      accessibility_notes: group.accessibility_notes || '',
      facilitator_name: group.facilitator_name || '',
      facilitator_email: group.facilitator_email || '',
      facilitator_phone: group.facilitator_phone || '',
      contact_notes: group.contact_notes || '',
      is_active: !!group.is_active,
      is_saved_to_support_plan: is_saved
    };
  }

  saveSupportGroupToPlan(support_group_id, notes) {
    const groups = this._getFromStorage('support_groups', []);
    const group = groups.find((g) => g.id === support_group_id);
    if (!group) {
      return {
        saved_item: null,
        already_existed: false,
        message: 'Support group not found.'
      };
    }

    const planItems = this._getCurrentSupportPlan();
    const existing = planItems.find((i) => i.support_group_id === support_group_id);
    if (existing) {
      return {
        saved_item: existing,
        already_existed: true,
        message: 'Support group is already in your support plan.'
      };
    }

    const item = {
      id: this._generateId('support_plan_group'),
      support_group_id,
      added_at: new Date().toISOString(),
      notes: notes || ''
    };
    planItems.push(item);
    this._saveToStorage('support_plan_groups', planItems);

    return {
      saved_item: item,
      already_existed: false,
      message: 'Support group saved to your support plan.'
    };
  }

  getSavedSupportPlanGroups() {
    const items = this._getCurrentSupportPlan();
    const groups = this._getFromStorage('support_groups', []);

    return items.map((item) => {
      const group = groups.find((g) => g.id === item.support_group_id) || null;
      return {
        support_plan_item_id: item.id,
        support_group_id: item.support_group_id,
        title: group ? group.title : '',
        focus_label: group ? this._labelSupportGroupFocus(group.focus) : '',
        format_label: group ? this._labelSupportGroupFormat(group.format) : '',
        next_meeting_label: group ? this._formatDateTimeLabel(group.next_meeting_datetime) : '',
        notes: item.notes || '',
        added_at: item.added_at,
        support_group: group
      };
    });
  }

  // ---------------------- Donations (task_2) ----------------------

  getDonationPageOptions() {
    return {
      frequency_options: [
        { value: 'one_time', label: 'One-time' },
        { value: 'recurring', label: 'Monthly' }
      ],
      fund_designation_options: [
        { value: 'patient_transportation_fund', label: 'Patient Transportation Fund', description: 'Help patients get to and from treatment appointments.' },
        { value: 'general_support_fund', label: 'General Support Fund', description: 'Support the area of greatest need.' },
        { value: 'research_fund', label: 'Research Fund', description: 'Advance cancer research and innovation.' },
        { value: 'pediatric_support_fund', label: 'Pediatric Support Fund', description: 'Support children and families facing cancer.' }
      ],
      payment_method_options: [
        { value: 'credit_card', label: 'Credit card' },
        { value: 'bank_transfer', label: 'Bank transfer' },
        { value: 'digital_wallet', label: 'Digital wallet' },
        { value: 'check', label: 'Check' }
      ],
      default_currency: 'usd',
      suggested_amounts: [25, 35, 50, 100]
    };
  }

  reviewDonation(
    amount,
    currency,
    frequency,
    fund_designation,
    cover_processing_fees,
    payment_method,
    donor_first_name,
    donor_last_name,
    donor_email,
    donor_address_line1,
    donor_address_line2,
    donor_city,
    donor_state,
    donor_postal_code,
    donor_country,
    is_anonymous,
    wants_email_updates
  ) {
    const donations = this._getFromStorage('donations', []);
    let draft = donations.find((d) => d.status === 'draft');
    const now = new Date().toISOString();

    if (!draft) {
      draft = {
        id: this._generateId('donation'),
        created_at: now
      };
      donations.push(draft);
    }

    Object.assign(draft, {
      amount,
      currency,
      frequency,
      fund_designation,
      cover_processing_fees: !!cover_processing_fees,
      payment_method,
      donor_first_name,
      donor_last_name,
      donor_email: donor_email || '',
      donor_address_line1: donor_address_line1 || '',
      donor_address_line2: donor_address_line2 || '',
      donor_city: donor_city || '',
      donor_state: donor_state || '',
      donor_postal_code: donor_postal_code || '',
      donor_country: donor_country || '',
      is_anonymous: !!is_anonymous,
      wants_email_updates: !!wants_email_updates,
      status: 'draft',
      updated_at: now
    });

    this._saveToStorage('donations', donations);

    const amount_display = currency === 'usd'
      ? '$' + Number(amount || 0).toFixed(2)
      : String(amount);

    let fund_label = 'General Support Fund';
    switch (fund_designation) {
      case 'patient_transportation_fund': fund_label = 'Patient Transportation Fund'; break;
      case 'general_support_fund': fund_label = 'General Support Fund'; break;
      case 'research_fund': fund_label = 'Research Fund'; break;
      case 'pediatric_support_fund': fund_label = 'Pediatric Support Fund'; break;
    }

    const frequency_label = frequency === 'recurring' ? 'Monthly' : 'One-time';

    const donor_display_name = is_anonymous
      ? 'Anonymous'
      : ((donor_first_name || '').trim() + ' ' + (donor_last_name || '').trim()).trim();

    return {
      donation_id: draft.id,
      status: 'draft',
      review_summary: {
        amount_display,
        fund_label,
        frequency_label,
        processing_fees_included: !!cover_processing_fees,
        donor_display_name,
        is_anonymous: !!is_anonymous,
        wants_email_updates: !!wants_email_updates
      },
      message: 'Donation saved for review. No payment has been processed yet.'
    };
  }

  // ---------------------- Events (task_3) ----------------------

  getEventFilterOptions() {
    return {
      format_options: [
        { value: 'online_webinar', label: 'Online webinar' },
        { value: 'in_person', label: 'In-person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      topic_options: [
        { value: 'nutrition_diet', label: 'Nutrition & Diet' },
        { value: 'treatment_options', label: 'Treatment options' },
        { value: 'coping_emotionally', label: 'Coping emotionally' },
        { value: 'finances_practical_support', label: 'Finances & practical support' },
        { value: 'caregiving', label: 'Caregiving' },
        { value: 'exercise_rehab', label: 'Exercise & rehabilitation' },
        { value: 'other', label: 'Other' }
      ],
      time_of_day_options: [
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening_after_5_pm', label: 'Evening (after 5 pm)' },
        { value: 'evening', label: 'Evening' },
        { value: 'all_day', label: 'All day' }
      ],
      sort_options: [
        { value: 'date_soonest_first', label: 'Date – Soonest first' },
        { value: 'relevance', label: 'Relevance' }
      ]
    };
  }

  searchEvents(
    format,
    topic,
    start_date,
    end_date,
    time_of_day,
    sort_by = 'date_soonest_first',
    page = 1,
    page_size = 10
  ) {
    let events = this._getFromStorage('events', []);

    if (format) {
      events = events.filter((e) => e.format === format);
    }

    if (topic) {
      events = events.filter((e) => e.topic === topic);
    }

    if (start_date) {
      const start = new Date(start_date);
      events = events.filter((e) => new Date(e.start_datetime) >= start);
    }

    if (end_date) {
      const end = new Date(end_date);
      events = events.filter((e) => new Date(e.start_datetime) <= end);
    }

    if (time_of_day) {
      events = events.filter((e) => {
        if (!e.time_of_day) return false;
        if (e.time_of_day === time_of_day) return true;
        // Hierarchical: evening_after_5_pm covers evening
        if (time_of_day === 'evening_after_5_pm' &&
          (e.time_of_day === 'evening' || e.time_of_day === 'evening_after_5_pm')) {
          return true;
        }
        return false;
      });
    }

    if (sort_by === 'date_soonest_first') {
      events.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    const total_results = events.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageItems = events.slice(startIndex, endIndex);

    const results = pageItems.map((e) => ({
      id: e.id,
      title: e.title,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime || null,
      format_label: this._labelEventFormat(e.format),
      topic_label: this._labelEventTopic(e.topic),
      price_label: this._labelPrice(e.price_type, e.price_amount, e.currency),
      price_type: e.price_type,
      status: e.status,
      is_free: e.price_type === 'free'
    }));

    return { results, total_results, page, page_size };
  }

  getEventDetail(event_id) {
    const events = this._getFromStorage('events', []);
    const e = events.find((ev) => ev.id === event_id);
    if (!e) return null;

    return {
      id: e.id,
      title: e.title,
      description: e.description || '',
      format_label: this._labelEventFormat(e.format),
      topic_label: this._labelEventTopic(e.topic),
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime || null,
      time_of_day_label: this._labelTimeOfDay(e.time_of_day),
      price_type: e.price_type,
      price_amount: e.price_amount || null,
      price_label: this._labelPrice(e.price_type, e.price_amount, e.currency),
      status: e.status,
      registration_required: !!e.registration_required,
      registration_deadline: e.registration_deadline || null,
      capacity: typeof e.capacity === 'number' ? e.capacity : null,
      remaining_capacity: typeof e.remaining_capacity === 'number' ? e.remaining_capacity : null,
      speaker_names: Array.isArray(e.speaker_names) ? e.speaker_names : [],
      location_description: e.location_description || '',
      access_url: e.access_url || '',
      is_free: e.price_type === 'free'
    };
  }

  registerForEvent(event_id, registrant_name, registrant_email, number_of_attendees, heard_about) {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);
    const event = events.find((e) => e.id === event_id);

    if (!event) {
      return {
        registration_id: null,
        status: 'cancelled',
        event_title: '',
        start_datetime: null,
        access_instructions: '',
        message: 'Event not found.'
      };
    }

    const now = new Date().toISOString();
    let status = 'confirmed';

    if (event.status === 'cancelled') {
      status = 'cancelled';
    } else if (typeof event.capacity === 'number' && typeof event.remaining_capacity === 'number') {
      if (event.remaining_capacity < number_of_attendees || event.status === 'full') {
        status = 'waitlisted';
      } else {
        status = 'confirmed';
        event.remaining_capacity -= number_of_attendees;
        if (event.remaining_capacity <= 0) {
          event.remaining_capacity = 0;
          event.status = 'full';
        }
        this._saveToStorage('events', events);
      }
    }

    const registration = {
      id: this._generateId('event_reg'),
      event_id,
      registrant_name,
      registrant_email,
      number_of_attendees,
      heard_about: heard_about || null,
      status,
      created_at: now
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    let access_instructions = '';
    if (event.access_url) {
      access_instructions = 'Join using this link at the event start time: ' + event.access_url;
    }

    return {
      registration_id: registration.id,
      status,
      event_title: event.title,
      start_datetime: event.start_datetime,
      access_instructions,
      message: status === 'confirmed' ? 'Registration confirmed.' : (status === 'waitlisted' ? 'You have been added to the waitlist.' : 'Registration could not be completed.')
    };
  }

  // ---------------------- Resource Library (task_4) ----------------------

  getResourceFilterOptions() {
    return {
      content_type_options: [
        { value: 'article', label: 'Articles' },
        { value: 'video', label: 'Videos' },
        { value: 'podcast', label: 'Podcasts' },
        { value: 'guide', label: 'Guides' },
        { value: 'checklist', label: 'Checklists' },
        { value: 'webinar_recording', label: 'Webinar recordings' },
        { value: 'other', label: 'Other' }
      ],
      rating_filter_options: [
        { min_rating: 4, label: '4 stars and up' },
        { min_rating: 4.5, label: '4.5 stars and up' }
      ],
      sort_options: [
        { value: 'rating_highest_first', label: 'Rating – Highest first' },
        { value: 'newest_first', label: 'Newest first' },
        { value: 'relevance', label: 'Relevance' }
      ]
    };
  }

  searchResources(
    query,
    content_types,
    published_start_date,
    published_end_date,
    min_rating,
    sort_by = 'relevance',
    page = 1,
    page_size = 10
  ) {
    const q = (query || '').trim();
    let resources = this._getFromStorage('resources', []);

    if (q) {
      resources = resources.filter((r) => {
        const inTitle = this._caseInsensitiveIncludes(r.title, q);
        const inSummary = this._caseInsensitiveIncludes(r.summary, q);
        const inTags = Array.isArray(r.tags) && r.tags.some((t) => this._caseInsensitiveIncludes(t, q));
        return inTitle || inSummary || inTags;
      });
    }

    if (Array.isArray(content_types) && content_types.length > 0) {
      const set = new Set(content_types);
      resources = resources.filter((r) => set.has(r.content_type));
    }

    if (published_start_date) {
      const start = new Date(published_start_date);
      resources = resources.filter((r) => new Date(r.publication_date) >= start);
    }

    if (published_end_date) {
      const end = new Date(published_end_date);
      resources = resources.filter((r) => new Date(r.publication_date) <= end);
    }

    if (typeof min_rating === 'number') {
      resources = resources.filter((r) => typeof r.rating === 'number' && r.rating >= min_rating);
    }

    if (sort_by === 'rating_highest_first') {
      resources.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const ca = a.rating_count || 0;
        const cb = b.rating_count || 0;
        if (cb !== ca) return cb - ca;
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return db - da;
      });
    } else if (sort_by === 'newest_first') {
      resources.sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date));
    } else if (sort_by === 'relevance') {
      // simple relevance: prioritize title matches, then rating
      resources.sort((a, b) => {
        const aTitleMatch = this._caseInsensitiveIncludes(a.title, q) ? 1 : 0;
        const bTitleMatch = this._caseInsensitiveIncludes(b.title, q) ? 1 : 0;
        if (bTitleMatch !== aTitleMatch) return bTitleMatch - aTitleMatch;
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return db - da;
      });
    }

    const total_results = resources.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageItems = resources.slice(startIndex, endIndex);

    const results = pageItems.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary || '',
      content_type_label: this._labelContentType(r.content_type),
      publication_date: r.publication_date,
      rating: typeof r.rating === 'number' ? r.rating : null,
      rating_count: typeof r.rating_count === 'number' ? r.rating_count : 0,
      tags: Array.isArray(r.tags) ? r.tags : []
    }));

    return { results, total_results, page, page_size };
  }

  getResourceDetail(resource_id) {
    const resources = this._getFromStorage('resources', []);
    const r = resources.find((res) => res.id === resource_id);
    if (!r) return null;

    const readingList = this._getCurrentReadingList();
    const is_in_reading_list = readingList.some((item) => item.resource_id === resource_id);

    return {
      id: r.id,
      title: r.title,
      summary: r.summary || '',
      content_type_label: this._labelContentType(r.content_type),
      publication_date: r.publication_date,
      author_name: r.author_name || '',
      estimated_reading_time_minutes: typeof r.estimated_reading_time_minutes === 'number' ? r.estimated_reading_time_minutes : null,
      rating: typeof r.rating === 'number' ? r.rating : null,
      rating_count: typeof r.rating_count === 'number' ? r.rating_count : 0,
      tags: Array.isArray(r.tags) ? r.tags : [],
      body_html: r.body_html || '',
      is_in_reading_list
    };
  }

  saveResourceToReadingList(resource_id, notes) {
    const resources = this._getFromStorage('resources', []);
    const res = resources.find((r) => r.id === resource_id);
    if (!res) {
      return {
        reading_list_item_id: null,
        resource_id,
        saved_at: null,
        already_existed: false,
        message: 'Resource not found.'
      };
    }

    const list = this._getCurrentReadingList();
    const existing = list.find((i) => i.resource_id === resource_id);
    if (existing) {
      return {
        reading_list_item_id: existing.id,
        resource_id,
        saved_at: existing.saved_at,
        already_existed: true,
        message: 'Resource is already in your reading list.'
      };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      resource_id,
      saved_at: new Date().toISOString(),
      notes: notes || ''
    };
    list.push(item);
    this._saveToStorage('reading_list_items', list);

    return {
      reading_list_item_id: item.id,
      resource_id,
      saved_at: item.saved_at,
      already_existed: false,
      message: 'Resource saved to your reading list.'
    };
  }

  getReadingList() {
    const items = this._getCurrentReadingList();
    const resources = this._getFromStorage('resources', []);

    return items.map((item) => {
      const res = resources.find((r) => r.id === item.resource_id) || null;
      return {
        reading_list_item_id: item.id,
        resource_id: item.resource_id,
        title: res ? res.title : '',
        content_type_label: res ? this._labelContentType(res.content_type) : '',
        publication_date: res ? res.publication_date : null,
        rating: res && typeof res.rating === 'number' ? res.rating : null,
        saved_at: item.saved_at,
        notes: item.notes || '',
        resource: res
      };
    });
  }

  // ---------------------- Volunteer opportunities (task_5) ----------------------

  getVolunteerFilterOptions() {
    return {
      role_type_options: [
        { value: 'driver_transportation', label: 'Driver / Transportation' },
        { value: 'office_support', label: 'Office support' },
        { value: 'event_support', label: 'Event support' },
        { value: 'fundraising', label: 'Fundraising' },
        { value: 'peer_support', label: 'Peer support' },
        { value: 'administrative', label: 'Administrative' },
        { value: 'other', label: 'Other' }
      ],
      days_of_week_options: [
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
      ].map((v) => ({ value: v, label: this._labelDayOfWeek(v) })),
      sort_options: [
        { value: 'start_date_soonest_first', label: 'Start date – Soonest first' },
        { value: 'most_needed', label: 'Most needed' }
      ]
    };
  }

  searchVolunteerOpportunities(
    postal_code,
    radius_miles = 25,
    role_type,
    min_weekly_hours,
    days_of_week,
    sort_by = 'start_date_soonest_first',
    page = 1,
    page_size = 10
  ) {
    let opps = this._getFromStorage('volunteer_opportunities', []);

    opps = opps.filter((o) => o.status === 'open');

    if (postal_code) {
      opps = opps.filter((o) => o.postal_code === postal_code);
    }

    if (role_type) {
      opps = opps.filter((o) => o.role_type === role_type);
    }

    if (typeof min_weekly_hours === 'number') {
      opps = opps.filter((o) => {
        const min = typeof o.min_weekly_hours === 'number' ? o.min_weekly_hours : null;
        const max = typeof o.max_weekly_hours === 'number' ? o.max_weekly_hours : null;
        if (min !== null) return min >= min_weekly_hours;
        if (max !== null) return max >= min_weekly_hours;
        return false;
      });
    }

    if (Array.isArray(days_of_week) && days_of_week.length > 0) {
      const set = new Set(days_of_week);
      opps = opps.filter((o) => {
        if (!Array.isArray(o.days_of_week) || o.days_of_week.length === 0) return false;
        return o.days_of_week.some((d) => set.has(d));
      });
    }

    if (sort_by === 'start_date_soonest_first') {
      opps.sort((a, b) => {
        const ad = a.start_date ? new Date(a.start_date).getTime() : Infinity;
        const bd = b.start_date ? new Date(b.start_date).getTime() : Infinity;
        return ad - bd;
      });
    }

    const total_results = opps.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageItems = opps.slice(startIndex, endIndex);

    const results = pageItems.map((o) => ({
      id: o.id,
      title: o.title,
      role_type_label: this._labelVolunteerRoleType(o.role_type),
      city: o.city || '',
      state: o.state || '',
      distance_miles: null,
      min_weekly_hours: typeof o.min_weekly_hours === 'number' ? o.min_weekly_hours : null,
      max_weekly_hours: typeof o.max_weekly_hours === 'number' ? o.max_weekly_hours : null,
      days_of_week_labels: Array.isArray(o.days_of_week) ? o.days_of_week.map((d) => this._labelDayOfWeek(d)) : [],
      start_date: o.start_date || null,
      status: o.status
    }));

    return { results, total_results, page, page_size };
  }

  getVolunteerOpportunityDetail(volunteer_opportunity_id) {
    const opps = this._getFromStorage('volunteer_opportunities', []);
    const o = opps.find((op) => op.id === volunteer_opportunity_id);
    if (!o) return null;

    const savedList = this._getCurrentVolunteerSavedList();
    const is_saved = savedList.some((s) => s.volunteer_opportunity_id === volunteer_opportunity_id);

    return {
      id: o.id,
      title: o.title,
      description: o.description || '',
      role_type_label: this._labelVolunteerRoleType(o.role_type),
      location_address_line1: o.location_address_line1 || '',
      location_address_line2: o.location_address_line2 || '',
      city: o.city || '',
      state: o.state || '',
      postal_code: o.postal_code || '',
      min_weekly_hours: typeof o.min_weekly_hours === 'number' ? o.min_weekly_hours : null,
      max_weekly_hours: typeof o.max_weekly_hours === 'number' ? o.max_weekly_hours : null,
      days_of_week_labels: Array.isArray(o.days_of_week) ? o.days_of_week.map((d) => this._labelDayOfWeek(d)) : [],
      start_date: o.start_date || null,
      end_date: o.end_date || null,
      schedule_notes: o.schedule_notes || '',
      status: o.status,
      requirements: Array.isArray(o.requirements) ? o.requirements : [],
      contact_name: o.contact_name || '',
      contact_email: o.contact_email || '',
      contact_phone: o.contact_phone || '',
      is_saved
    };
  }

  saveVolunteerOpportunity(volunteer_opportunity_id, notes) {
    const opps = this._getFromStorage('volunteer_opportunities', []);
    const o = opps.find((op) => op.id === volunteer_opportunity_id);
    if (!o) {
      return {
        saved_item_id: null,
        volunteer_opportunity_id,
        saved_at: null,
        already_existed: false,
        message: 'Volunteer opportunity not found.'
      };
    }

    const savedList = this._getCurrentVolunteerSavedList();
    const existing = savedList.find((s) => s.volunteer_opportunity_id === volunteer_opportunity_id);
    if (existing) {
      return {
        saved_item_id: existing.id,
        volunteer_opportunity_id,
        saved_at: existing.saved_at,
        already_existed: true,
        message: 'Volunteer opportunity is already saved.'
      };
    }

    const item = {
      id: this._generateId('volunteer_saved'),
      volunteer_opportunity_id,
      saved_at: new Date().toISOString(),
      notes: notes || ''
    };
    savedList.push(item);
    this._saveToStorage('volunteer_saved_opportunities', savedList);

    return {
      saved_item_id: item.id,
      volunteer_opportunity_id,
      saved_at: item.saved_at,
      already_existed: false,
      message: 'Volunteer opportunity saved.'
    };
  }

  getSavedVolunteerOpportunities() {
    const savedList = this._getCurrentVolunteerSavedList();
    const opps = this._getFromStorage('volunteer_opportunities', []);

    return savedList.map((item) => {
      const opp = opps.find((o) => o.id === item.volunteer_opportunity_id) || null;
      return {
        saved_item_id: item.id,
        volunteer_opportunity_id: item.volunteer_opportunity_id,
        title: opp ? opp.title : '',
        role_type_label: opp ? this._labelVolunteerRoleType(opp.role_type) : '',
        city: opp ? (opp.city || '') : '',
        state: opp ? (opp.state || '') : '',
        start_date: opp ? (opp.start_date || null) : null,
        saved_at: item.saved_at,
        notes: item.notes || '',
        volunteer_opportunity: opp
      };
    });
  }

  // ---------------------- Financial assistance / guided help (task_6) ----------------------

  getGuidedHelpQuestionOptions() {
    return {
      role_options: [
        { value: 'patient', label: 'Patient' },
        { value: 'caregiver', label: 'Caregiver' },
        { value: 'healthcare_provider', label: 'Healthcare provider' },
        { value: 'other', label: 'Other' }
      ],
      age_group_options: [
        { value: 'adult', label: 'Adult' },
        { value: 'child', label: 'Child' },
        { value: 'adolescent', label: 'Adolescent' },
        { value: 'all_ages', label: 'All ages' }
      ],
      cancer_type_options: [
        { value: 'lung_cancer', label: 'Lung cancer' },
        { value: 'breast_cancer', label: 'Breast cancer' },
        { value: 'any_cancer', label: 'Any cancer' }
      ],
      need_options: [
        { value: 'help_paying_for_medications', label: 'Help paying for medications' },
        { value: 'financial_assistance', label: 'Financial assistance' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'lodging', label: 'Lodging during treatment' },
        { value: 'counseling', label: 'Counseling & emotional support' }
      ],
      state_options: [
        { value: 'CA', label: 'California' },
        { value: 'NY', label: 'New York' },
        { value: 'TX', label: 'Texas' },
        { value: 'FL', label: 'Florida' }
      ],
      funding_type_filter_options: [
        { value: 'grants_no_repayment', label: 'Grants (no repayment)' },
        { value: 'loan_repayment_required', label: 'Loans (repayment required)' },
        { value: 'discount_program', label: 'Discount programs' },
        { value: 'reimbursement', label: 'Reimbursement' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  getMatchingFinancialAssistancePrograms(role, age_group, cancer_type, needs, state, funding_type_filter) {
    const programs = this._getFromStorage('financial_assistance_programs', []);
    const needsSet = new Set(Array.isArray(needs) ? needs : []);
    const savedItems = this._getCurrentResourcePlan();

    const filtered = programs.filter((p) => {
      if (!p.is_active) return false;

      // role
      if (Array.isArray(p.eligible_roles) && p.eligible_roles.length > 0) {
        const rset = new Set(p.eligible_roles);
        if (!(rset.has(role) || rset.has('any') || rset.has('all_roles'))) return false;
      }

      // age group
      if (Array.isArray(p.eligible_age_groups) && p.eligible_age_groups.length > 0) {
        const aset = new Set(p.eligible_age_groups);
        if (!(aset.has(age_group) || aset.has('all_ages'))) return false;
      }

      // cancer type
      if (Array.isArray(p.eligible_cancer_types) && p.eligible_cancer_types.length > 0) {
        const cset = new Set(p.eligible_cancer_types);
        if (!(cset.has(cancer_type) || cset.has('any_cancer'))) return false;
      }

      // state
      if (Array.isArray(p.eligible_states) && p.eligible_states.length > 0) {
        if (!p.eligible_states.includes(state) && !p.eligible_states.includes('All')) return false;
      }

      // needs
      if (needsSet.size > 0 && Array.isArray(p.needs_supported) && p.needs_supported.length > 0) {
        const pNeeds = new Set(p.needs_supported);
        const overlap = Array.from(needsSet).some((n) => pNeeds.has(n));
        if (!overlap) return false;
      }

      // funding type
      if (funding_type_filter && p.funding_type !== funding_type_filter) return false;

      return true;
    });

    const results = filtered.map((p) => {
      const is_saved_to_resource_plan = savedItems.some((item) => item.program_id === p.id);
      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        program_type_label: this._labelProgramType(p.program_type),
        funding_type_label: this._labelFundingType(p.funding_type),
        eligible_roles_labels: Array.isArray(p.eligible_roles) ? p.eligible_roles.map((r) => {
          switch (r) {
            case 'patient': return 'Patient';
            case 'caregiver': return 'Caregiver';
            case 'healthcare_provider': return 'Healthcare provider';
            case 'other': return 'Other';
            case 'any': return 'Any role';
            case 'all_roles': return 'All roles';
            default: return r;
          }
        }) : [],
        eligible_age_groups_labels: Array.isArray(p.eligible_age_groups) ? p.eligible_age_groups.map((a) => {
          switch (a) {
            case 'adult': return 'Adult';
            case 'child': return 'Child';
            case 'adolescent': return 'Adolescent';
            case 'all_ages': return 'All ages';
            default: return a;
          }
        }) : [],
        eligible_cancer_types_labels: Array.isArray(p.eligible_cancer_types) ? p.eligible_cancer_types.map((c) => {
          switch (c) {
            case 'lung_cancer': return 'Lung cancer';
            case 'breast_cancer': return 'Breast cancer';
            case 'any_cancer': return 'Any cancer';
            default: return c;
          }
        }) : [],
        eligible_states: Array.isArray(p.eligible_states) ? p.eligible_states : [],
        needs_supported_labels: Array.isArray(p.needs_supported) ? p.needs_supported.map((n) => {
          switch (n) {
            case 'help_paying_for_medications': return 'Help paying for medications';
            case 'financial_assistance': return 'Financial assistance';
            case 'transportation': return 'Transportation';
            case 'lodging': return 'Lodging';
            case 'counseling': return 'Counseling';
            default: return n;
          }
        }) : [],
        application_url: p.application_url || '',
        phone: p.phone || '',
        email: p.email || '',
        is_active: !!p.is_active,
        is_saved_to_resource_plan
      };
    });

    return {
      programs: results,
      total_results: results.length
    };
  }

  saveProgramToResourcePlan(program_id, notes) {
    const programs = this._getFromStorage('financial_assistance_programs', []);
    const p = programs.find((prog) => prog.id === program_id);
    if (!p) {
      return {
        resource_plan_item_id: null,
        program_id,
        added_at: null,
        already_existed: false,
        message: 'Program not found.'
      };
    }

    const plan = this._getCurrentResourcePlan();
    const existing = plan.find((i) => i.program_id === program_id);
    if (existing) {
      return {
        resource_plan_item_id: existing.id,
        program_id,
        added_at: existing.added_at,
        already_existed: true,
        message: 'Program is already in your resource plan.'
      };
    }

    const item = {
      id: this._generateId('resource_plan_program'),
      program_id,
      added_at: new Date().toISOString(),
      notes: notes || ''
    };
    plan.push(item);
    this._saveToStorage('resource_plan_programs', plan);

    return {
      resource_plan_item_id: item.id,
      program_id,
      added_at: item.added_at,
      already_existed: false,
      message: 'Program saved to your resource plan.'
    };
  }

  getResourcePlanSummary() {
    const plan = this._getCurrentResourcePlan();
    const programs = this._getFromStorage('financial_assistance_programs', []);

    const items = plan.map((item) => {
      const p = programs.find((prog) => prog.id === item.program_id) || null;
      return {
        resource_plan_item_id: item.id,
        program_id: item.program_id,
        name: p ? p.name : '',
        program_type_label: p ? this._labelProgramType(p.program_type) : '',
        funding_type_label: p ? this._labelFundingType(p.funding_type) : '',
        application_url: p ? (p.application_url || '') : '',
        phone: p ? (p.phone || '') : '',
        email: p ? (p.email || '') : '',
        notes: item.notes || '',
        added_at: item.added_at,
        program: p
      };
    });

    const general_next_steps = [
      'Review each program’s eligibility details and application steps.',
      'Gather required documentation (such as income verification or diagnosis details).',
      'Contact program phone numbers or visit application links to apply.'
    ];

    return {
      programs: items,
      general_next_steps
    };
  }

  // ---------------------- Care planner / roadmap (task_7) ----------------------

  getCarePlannerOptions() {
    return {
      persona_options: [
        { value: 'newly_diagnosed_patient', label: 'Newly diagnosed patient', description: 'Just starting treatment or newly diagnosed.' },
        { value: 'long_term_patient', label: 'Long-term patient', description: 'In treatment or follow-up for a while.' },
        { value: 'caregiver', label: 'Caregiver', description: 'Supporting a loved one with cancer.' },
        { value: 'survivor', label: 'Survivor', description: 'Finished treatment and adjusting to life after cancer.' },
        { value: 'bereaved', label: 'Bereaved', description: 'Grieving the loss of someone to cancer.' },
        { value: 'other', label: 'Other', description: 'Another situation.' }
      ],
      priority_options: [
        { value: 'understanding_treatment_options', label: 'Understanding treatment options' },
        { value: 'managing_side_effects', label: 'Managing side effects' },
        { value: 'emotional_wellbeing', label: 'Emotional wellbeing' },
        { value: 'practical_planning', label: 'Practical planning & paperwork' }
      ]
    };
  }

  getSuggestedCareTasks(persona, priorities) {
    const personaVal = persona;
    const prioritySet = new Set(Array.isArray(priorities) ? priorities : []);
    const templates = this._getFromStorage('care_task_templates', []);

    const filtered = templates.filter((t) => {
      if (Array.isArray(t.persona_tags) && t.persona_tags.length > 0) {
        if (!t.persona_tags.includes(personaVal)) return false;
      }
      if (prioritySet.size > 0 && Array.isArray(t.priority_tags) && t.priority_tags.length > 0) {
        // Do not filter out tasks based on priorities alone; allow all persona-matching tasks
      }
      return true;
    });

    return filtered.map((t) => ({
      task_template_id: t.id,
      title: t.title,
      description: t.description || '',
      category_label: this._labelTaskCategory(t.category),
      recommended_personas_labels: Array.isArray(t.persona_tags) ? t.persona_tags.map((p) => this._labelPersona(p)) : []
    }));
  }

  saveCareRoadmap(persona, priorities, title, notes, tasks) {
    const roadmaps = this._getFromStorage('care_roadmaps', []);
    let roadmap = roadmaps[0];
    const now = new Date().toISOString();

    if (!roadmap) {
      roadmap = {
        id: this._generateId('roadmap'),
        created_at: now
      };
      roadmaps.push(roadmap);
    }

    roadmap.persona = persona;
    roadmap.priorities = Array.isArray(priorities) ? priorities : [];
    roadmap.title = title || roadmap.title || 'My Care Roadmap';
    roadmap.notes = notes || '';
    roadmap.updated_at = now;

    this._saveToStorage('care_roadmaps', roadmaps);

    // Replace tasks for this roadmap
    let roadmapTasks = this._getFromStorage('care_roadmap_tasks', []);
    roadmapTasks = roadmapTasks.filter((t) => t.roadmap_id !== roadmap.id);

    const newTasks = Array.isArray(tasks) ? tasks : [];
    const createdTasks = [];

    newTasks.forEach((t) => {
      const taskId = this._generateId('care_task');
      const task = {
        id: taskId,
        roadmap_id: roadmap.id,
        task_template_id: t.task_template_id || null,
        title: t.title,
        description: t.description || '',
        due_date: t.due_date || null,
        start_date: t.start_date || null,
        recurrence: t.recurrence || 'none',
        reminder_method: t.reminder_method || 'on_site_only',
        reminder_enabled: typeof t.reminder_enabled === 'boolean' ? t.reminder_enabled : true,
        status: 'not_started',
        created_at: now,
        updated_at: now
      };
      roadmapTasks.push(task);
      createdTasks.push(task);
    });

    this._saveToStorage('care_roadmap_tasks', roadmapTasks);

    const tasksForReturn = createdTasks.map((t) => ({
      care_roadmap_task_id: t.id,
      title: t.title,
      due_date: t.due_date,
      start_date: t.start_date,
      recurrence: t.recurrence,
      reminder_method: t.reminder_method,
      reminder_enabled: t.reminder_enabled,
      status: t.status
    }));

    return {
      roadmap_id: roadmap.id,
      created_at: roadmap.created_at,
      updated_at: roadmap.updated_at,
      tasks: tasksForReturn,
      message: 'Care roadmap saved.'
    };
  }

  getCareRoadmap() {
    const roadmaps = this._getFromStorage('care_roadmaps', []);
    const roadmap = roadmaps[0];
    if (!roadmap) {
      return {
        roadmap_id: null,
        persona_label: '',
        priorities_labels: [],
        title: '',
        notes: '',
        created_at: null,
        updated_at: null,
        tasks: []
      };
    }

    const tasksAll = this._getFromStorage('care_roadmap_tasks', []);
    const templates = this._getFromStorage('care_task_templates', []);
    const tasks = tasksAll.filter((t) => t.roadmap_id === roadmap.id);

    const tasksMapped = tasks.map((t) => {
      const template = t.task_template_id
        ? (templates.find((tpl) => tpl.id === t.task_template_id) || null)
        : null;
      return {
        care_roadmap_task_id: t.id,
        title: t.title,
        description: t.description || '',
        due_date: t.due_date,
        start_date: t.start_date,
        recurrence: t.recurrence,
        reminder_method: t.reminder_method,
        reminder_enabled: t.reminder_enabled,
        status: t.status,
        task_template_id: t.task_template_id || null,
        task_template: template
      };
    });

    return {
      roadmap_id: roadmap.id,
      persona_label: this._labelPersona(roadmap.persona),
      priorities_labels: Array.isArray(roadmap.priorities) ? roadmap.priorities.map((p) => {
        switch (p) {
          case 'understanding_treatment_options': return 'Understanding treatment options';
          case 'managing_side_effects': return 'Managing side effects';
          case 'emotional_wellbeing': return 'Emotional wellbeing';
          case 'practical_planning': return 'Practical planning & paperwork';
          default: return p;
        }
      }) : [],
      title: roadmap.title || '',
      notes: roadmap.notes || '',
      created_at: roadmap.created_at || null,
      updated_at: roadmap.updated_at || null,
      tasks: tasksMapped
    };
  }

  // ---------------------- Fundraising shop & cart (task_8) ----------------------

  getShopCategories() {
    const categories = this._getFromStorage('product_categories', []);
    const active = categories.filter((c) => c.is_active);
    active.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : 0;
      const bo = typeof b.display_order === 'number' ? b.display_order : 0;
      return ao - bo;
    });
    return active.map((c) => ({
      key: c.key,
      name: c.name,
      description: c.description || '',
      display_order: typeof c.display_order === 'number' ? c.display_order : null
    }));
  }

  getShopFilterOptions(category_key) {
    const products = this._getFromStorage('products', []);
    const inCategory = products.filter((p) => p.category_key === category_key && p.is_active);

    let min_price = null;
    let max_price = null;
    inCategory.forEach((p) => {
      if (typeof p.price === 'number') {
        if (min_price === null || p.price < min_price) min_price = p.price;
        if (max_price === null || p.price > max_price) max_price = p.price;
      }
    });

    return {
      price_filter: {
        min_price: min_price !== null ? min_price : 0,
        max_price: max_price !== null ? max_price : 0,
        currency: 'usd'
      },
      rating_filter_options: [
        { min_rating: 4, label: '4 stars and up' },
        { min_rating: 4.5, label: '4.5 stars and up' }
      ],
      sort_options: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'price_low_to_high', label: 'Price – Low to high' },
        { value: 'price_high_to_low', label: 'Price – High to low' },
        { value: 'rating_highest_first', label: 'Rating – Highest first' }
      ]
    };
  }

  listProductsForShop(
    category_key,
    max_price,
    min_rating,
    sort_by = 'relevance',
    page = 1,
    page_size = 12
  ) {
    let products = this._getFromStorage('products', []);

    products = products.filter((p) => p.category_key === category_key && p.is_active);

    if (typeof max_price === 'number') {
      products = products.filter((p) => typeof p.price === 'number' && p.price <= max_price);
    }

    if (typeof min_rating === 'number') {
      products = products.filter((p) => typeof p.rating === 'number' && p.rating >= min_rating);
    }

    if (sort_by === 'price_low_to_high') {
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_high_to_low') {
      products.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort_by === 'rating_highest_first') {
      products.sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        const ca = a.rating_count || 0;
        const cb = b.rating_count || 0;
        return cb - ca;
      });
    }

    const total_results = products.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageItems = products.slice(startIndex, endIndex);

    const productsMapped = pageItems.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      category_key: p.category_key,
      category_label: this._labelProductCategoryKey(p.category_key),
      product_type_label: this._labelProductType(p.product_type),
      price: p.price,
      currency: p.currency,
      rating: typeof p.rating === 'number' ? p.rating : null,
      rating_count: typeof p.rating_count === 'number' ? p.rating_count : 0,
      image_url: p.image_url || '',
      is_active: !!p.is_active
    }));

    return { products: productsMapped, total_results, page, page_size };
  }

  getProductDetail(product_id) {
    const products = this._getFromStorage('products', []);
    const p = products.find((prod) => prod.id === product_id);
    if (!p) return null;

    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      category_key: p.category_key,
      category_label: this._labelProductCategoryKey(p.category_key),
      product_type_label: this._labelProductType(p.product_type),
      price: p.price,
      currency: p.currency,
      rating: typeof p.rating === 'number' ? p.rating : null,
      rating_count: typeof p.rating_count === 'number' ? p.rating_count : 0,
      image_url: p.image_url || '',
      tags: Array.isArray(p.tags) ? p.tags : [],
      inventory_quantity: typeof p.inventory_quantity === 'number' ? p.inventory_quantity : null
    };
  }

  addToCart(product_id, quantity = 1) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === product_id && p.is_active);
    if (!product) {
      return {
        cart_id: null,
        cart_item_id: null,
        quantity: 0,
        message: 'Product not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items', []);

    let item = cart_items.find((ci) => ci.cart_id === cart.id && ci.product_id === product_id);

    if (item) {
      item.quantity += quantity;
      item.unit_price = product.price;
      item.added_at = item.added_at || new Date().toISOString();
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id,
        quantity: quantity,
        unit_price: product.price,
        added_at: new Date().toISOString()
      };
      cart_items.push(item);
    }

    cart.updated_at = new Date().toISOString();
    this._setCart(cart);
    this._saveToStorage('cart_items', cart_items);

    return {
      cart_id: cart.id,
      cart_item_id: item.id,
      quantity: item.quantity,
      message: 'Product added to cart.'
    };
  }

  getCartSummary() {
    const rawCart = localStorage.getItem('cart');
    let cart = null;
    if (rawCart && rawCart !== 'null') {
      try {
        cart = JSON.parse(rawCart);
      } catch (e) {
        cart = null;
      }
    }

    if (!cart) {
      return {
        cart_id: null,
        status: 'open',
        items: [],
        subtotal: 0,
        currency: 'usd',
        estimated_total: 0
      };
    }

    const cart_items = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForCart = cart_items
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => {
        const product = products.find((p) => p.id === ci.product_id) || null;
        const price = ci.unit_price;
        const subtotal = price * ci.quantity;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: product ? product.name : '',
          category_label: product ? this._labelProductCategoryKey(product.category_key) : '',
          price,
          currency: product ? product.currency : 'usd',
          quantity: ci.quantity,
          subtotal,
          product,
          cart
        };
      });

    const subtotal = itemsForCart.reduce((sum, i) => sum + i.subtotal, 0);

    return {
      cart_id: cart.id,
      status: cart.status,
      items: itemsForCart,
      subtotal,
      currency: 'usd',
      estimated_total: subtotal
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    let cart_items = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const rawCart = localStorage.getItem('cart');
    let cart = null;
    if (rawCart && rawCart !== 'null') {
      try {
        cart = JSON.parse(rawCart);
      } catch (e) {
        cart = null;
      }
    }

    const itemIndex = cart_items.findIndex((ci) => ci.id === cart_item_id);
    if (itemIndex === -1 || !cart) {
      return {
        cart_id: cart ? cart.id : null,
        cart_item_id,
        quantity: 0,
        item_subtotal: 0,
        cart_subtotal: 0,
        message: 'Cart item not found.'
      };
    }

    if (quantity <= 0) {
      cart_items.splice(itemIndex, 1);
    } else {
      cart_items[itemIndex].quantity = quantity;
    }

    this._saveToStorage('cart_items', cart_items);

    const itemsForCart = cart_items.filter((ci) => ci.cart_id === cart.id).map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const price = ci.unit_price;
      return {
        id: ci.id,
        subtotal: price * ci.quantity
      };
    });

    const itemObj = itemsForCart.find((i) => i.id === cart_item_id);
    const item_subtotal = itemObj ? itemObj.subtotal : 0;
    const cart_subtotal = itemsForCart.reduce((sum, i) => sum + i.subtotal, 0);

    return {
      cart_id: cart.id,
      cart_item_id,
      quantity: quantity > 0 ? quantity : 0,
      item_subtotal,
      cart_subtotal,
      message: quantity <= 0 ? 'Item removed from cart.' : 'Cart item updated.'
    };
  }

  removeCartItem(cart_item_id) {
    let cart_items = this._getFromStorage('cart_items', []);
    const rawCart = localStorage.getItem('cart');
    let cart = null;
    if (rawCart && rawCart !== 'null') {
      try {
        cart = JSON.parse(rawCart);
      } catch (e) {
        cart = null;
      }
    }

    if (!cart) {
      return {
        cart_id: null,
        removed: false,
        cart_subtotal: 0,
        message: 'Cart not found.'
      };
    }

    const index = cart_items.findIndex((ci) => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (index === -1) {
      const itemsForCart = cart_items.filter((ci) => ci.cart_id === cart.id);
      const cart_subtotal = itemsForCart.reduce((sum, ci) => sum + ci.unit_price * ci.quantity, 0);
      return {
        cart_id: cart.id,
        removed: false,
        cart_subtotal,
        message: 'Cart item not found.'
      };
    }

    cart_items.splice(index, 1);
    this._saveToStorage('cart_items', cart_items);

    const remainingForCart = cart_items.filter((ci) => ci.cart_id === cart.id);
    const cart_subtotal = remainingForCart.reduce((sum, ci) => sum + ci.unit_price * ci.quantity, 0);

    return {
      cart_id: cart.id,
      removed: true,
      cart_subtotal,
      message: 'Item removed from cart.'
    };
  }

  // ---------------------- Emotional support channels (task_9) ----------------------

  getEmotionalSupportChannelsOverview() {
    const channels = this._getFromStorage('emotional_support_channels', []);
    return channels.map((c) => ({
      key: c.key,
      name: c.name,
      description: c.description || '',
      pros: Array.isArray(c.pros) ? c.pros : [],
      cons: Array.isArray(c.cons) ? c.cons : [],
      is_active: !!c.is_active
    }));
  }

  getChannelAvailabilityForDate(timezone, date) {
    const tz = timezone;
    const dateStr = date || this._todayIsoDate();
    const dayOfWeek = this._getDayOfWeekFromDateString(dateStr);

    const channels = this._getFromStorage('emotional_support_channels', []);
    const slotsAll = this._getFromStorage('channel_availability_slots', []);

    const channelEntries = channels.map((ch) => {
      const slots = slotsAll.filter((s) => s.channel_key === ch.key && s.timezone === tz && s.day_of_week === dayOfWeek);
      const mappedSlots = slots.map((s) => ({
        day_of_week: s.day_of_week,
        start_time_local: s.start_time_local,
        end_time_local: s.end_time_local,
        is_open: !!s.is_open
      }));
      const next_available_start_time = this._computeChannelNextAvailableTime(ch.key, tz, dateStr, slots);
      return {
        channel_key: ch.key,
        channel_name: ch.name,
        slots: mappedSlots,
        next_available_start_time
      };
    });

    return {
      timezone: tz,
      date: dateStr,
      channels: channelEntries
    };
  }

  submitCounselingRequest(channel_key, reason, session_preference, first_name, approximate_age) {
    const channels = this._getFromStorage('emotional_support_channels', []);
    const channel = channels.find((c) => c.key === channel_key) || { name: '' };

    const requests = this._getFromStorage('counseling_requests', []);
    const request = {
      id: this._generateId('counseling_request'),
      channel_key,
      reason,
      session_preference,
      first_name,
      approximate_age,
      status: 'submitted',
      notes: '',
      created_at: new Date().toISOString()
    };
    requests.push(request);
    this._saveToStorage('counseling_requests', requests);

    let estimated_wait_time_minutes = 10;
    let instructions = '';
    if (channel_key === 'phone_helpline') {
      instructions = 'A counselor will connect with you by phone shortly based on the helpline schedule.';
    } else if (channel_key === 'online_chat') {
      instructions = 'You will be connected to an online counselor in the chat window when they become available.';
    } else if (channel_key === 'email_support') {
      instructions = 'A counselor will reply to your email within the stated response time.';
    } else if (channel_key === 'in_person_counseling') {
      instructions = 'A staff member will contact you to schedule an in-person appointment.';
    }

    return {
      counseling_request_id: request.id,
      status: request.status,
      channel_key,
      channel_name: channel.name || '',
      estimated_wait_time_minutes,
      instructions,
      message: 'Your counseling request has been submitted.'
    };
  }

  // ---------------------- Organization content (About/FAQ/Policies) ----------------------

  getOrganizationOverview() {
    return {
      mission: 'To provide compassionate support, reliable information, and practical resources to anyone affected by cancer.',
      vision: 'A world where everyone facing cancer has access to the emotional, practical, and financial support they need.',
      impact_highlights: [
        'Thousands of counseling sessions provided each year.',
        'Patients and families supported through transportation, lodging, and financial assistance programs.',
        'Evidence-based educational resources reviewed by oncology professionals.'
      ],
      how_donations_help: 'Donations help sustain free counseling, support groups, transportation assistance, and educational resources for people impacted by cancer.',
      how_shop_supports: 'Proceeds from shop purchases directly support our cancer support programs and services.'
    };
  }

  getContactInformation() {
    return {
      phone_numbers: [
        { label: 'Main office', number: '1-800-000-0000' },
        { label: 'Emotional support helpline', number: '1-800-111-2222' }
      ],
      emails: [
        { label: 'General information', email: 'info@examplecancersupport.org' },
        { label: 'Support services', email: 'support@examplecancersupport.org' }
      ],
      mailing_address: 'Cancer Support Organization, 123 Hope Street, Anytown, ST 00000',
      office_hours: 'Monday–Friday, 9 am–5 pm (local time). Helpline hours may vary by channel.'
    };
  }

  getFaqList() {
    return [
      {
        question: 'Who can use your services?',
        answer_html: '<p>Our services are available to anyone affected by cancer, including patients, survivors, caregivers, family members, and friends.</p>',
        category: 'services'
      },
      {
        question: 'Do I need a referral from my doctor?',
        answer_html: '<p>No referral is required. You can contact us directly to access support groups, counseling, and educational resources.</p>',
        category: 'services'
      },
      {
        question: 'Are your services free?',
        answer_html: '<p>Many of our core services, such as support groups, counseling, and educational resources, are offered at no cost thanks to generous donors and volunteers.</p>',
        category: 'eligibility'
      },
      {
        question: 'Are my donations tax-deductible?',
        answer_html: '<p>In many cases, donations are tax-deductible as allowed by law. Please consult your tax adviser for guidance specific to your situation.</p>',
        category: 'donations'
      }
    ];
  }

  getPolicySummaries() {
    return {
      privacy_policy_summary_html: '<p>We are committed to protecting your privacy. We collect only the information needed to provide our services and never sell your personal data.</p>',
      terms_of_use_summary_html: '<p>By using our website and services, you agree to use them for lawful purposes and understand that our content is not a substitute for professional medical advice.</p>',
      data_handling_and_confidentiality_html: '<p>Information you share with our counselors and support staff is kept confidential within the limits of the law and our duty to protect your safety.</p>'
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