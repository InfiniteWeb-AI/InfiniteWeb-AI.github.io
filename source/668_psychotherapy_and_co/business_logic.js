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

  // ----------------------
  // Initialization & Basics
  // ----------------------

  _initStorage() {
    const tables = [
      'therapists',
      'therapist_availability_slots',
      'appointment_types',
      'appointment_requests',
      'therapy_groups',
      'group_waitlist_entries',
      'service_fees',
      'fee_estimates',
      'contact_messages',
      'intake_requests',
      'newsletter_subscriptions',
      'resources',
      'toolkits',
      'toolkit_items',
      'therapist_lists',
      'therapist_list_items',
      'workshops',
      'workshop_quote_requests',
      'cancellation_policies'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('single_user_state')) {
      localStorage.setItem('single_user_state', JSON.stringify({}));
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

  _toDisplayLabel(id) {
    if (!id || typeof id !== 'string') return '';
    return id
      .split('_')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _formatDateTimeDisplay(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minStr = minutes < 10 ? '0' + minutes : String(minutes);
    return `${month} ${day}, ${year} ${hours}:${minStr} ${ampm}`;
  }

  _arraysIntersect(arr, targetArr) {
    if (!Array.isArray(arr) || !Array.isArray(targetArr) || !arr.length || !targetArr.length) return false;
    const set = new Set(arr);
    return targetArr.some(v => set.has(v));
  }

  // ----------------------
  // Helper functions (private)
  // ----------------------

  _getOrCreateDefaultToolkit() {
    const state = JSON.parse(localStorage.getItem('single_user_state') || '{}');
    let toolkits = this._getFromStorage('toolkits');

    if (state.default_toolkit_id) {
      const existing = toolkits.find(t => t.id === state.default_toolkit_id);
      if (existing) return existing;
    }

    const toolkit = {
      id: this._generateId('toolkit'),
      name: 'My Toolkit',
      created_at: this._nowIso(),
      updated_at: null
    };
    toolkits.push(toolkit);
    this._saveToStorage('toolkits', toolkits);

    this._persistSingleUserState({ default_toolkit_id: toolkit.id });

    return toolkit;
  }

  _getOrCreateDefaultTherapistList() {
    const state = JSON.parse(localStorage.getItem('single_user_state') || '{}');
    let lists = this._getFromStorage('therapist_lists');

    if (state.default_therapist_list_id) {
      const existing = lists.find(l => l.id === state.default_therapist_list_id);
      if (existing) return existing;
    }

    const list = {
      id: this._generateId('tlist'),
      name: 'Saved Therapists',
      created_at: this._nowIso(),
      updated_at: null
    };
    lists.push(list);
    this._saveToStorage('therapist_lists', lists);

    this._persistSingleUserState({ default_therapist_list_id: list.id });

    return list;
  }

  _persistSingleUserState(patch) {
    const current = JSON.parse(localStorage.getItem('single_user_state') || '{}');
    const next = Object.assign({}, current, patch || {});
    localStorage.setItem('single_user_state', JSON.stringify(next));
  }

  _parsePreferredDateRange(text) {
    // Very simple parser for strings like "Between May 10 and May 20" or "May 10 - May 20"
    if (!text || typeof text !== 'string') {
      return { startDate: null, endDate: null };
    }
    const lower = text.toLowerCase().trim();

    let rangePart = lower;
    if (lower.startsWith('between ')) {
      rangePart = lower.replace(/^between\s+/, '');
    } else if (lower.startsWith('from ')) {
      rangePart = lower.replace(/^from\s+/, '');
    }

    let parts = rangePart.split(/\s+and\s+|\s*-\s*/i);
    parts = parts.map(p => p.trim()).filter(Boolean);

    if (!parts.length) return { startDate: null, endDate: null };

    const year = new Date().getFullYear();

    function parsePart(p) {
      // Try native Date.parse with current year if no year present
      let candidate = p;
      if (!/\d{4}/.test(p)) {
        candidate = p + ' ' + year;
      }
      const d = new Date(candidate);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    }

    const startDate = parsePart(parts[0]);
    const endDate = parts[1] ? parsePart(parts[1]) : null;

    return { startDate, endDate };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageOverview
  getHomePageOverview() {
    const therapists = this._getFromStorage('therapists');
    const groups = this._getFromStorage('therapy_groups');

    const config = JSON.parse(localStorage.getItem('home_page_overview_config') || 'null') || {};

    const practice_name = config.practice_name || '';
    const tagline = config.tagline || '';
    const intro_text = config.intro_text || '';
    const telehealth_overview = config.telehealth_overview || '';
    const fees_overview = config.fees_overview || '';
    const sliding_scale_overview = config.sliding_scale_overview || '';
    const emergency_help_note = config.emergency_help_note || '';

    const core_services = Array.isArray(config.core_services) ? config.core_services : [];

    // Featured therapists: first few who accept new clients
    const featured_therapists = therapists
      .filter(t => t.accepts_new_clients !== false)
      .slice(0, 3);

    // Featured groups: upcoming or waitlist_only, earliest start dates
    const now = new Date();
    const featured_groups = groups
      .filter(g => {
        if (!g || !g.start_date) return false;
        const d = new Date(g.start_date);
        if (isNaN(d.getTime())) return false;
        if (d < now) return false;
        return g.status === 'upcoming' || g.status === 'waitlist_only';
      })
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 3);

    return {
      practice_name,
      tagline,
      intro_text,
      core_services,
      telehealth_overview,
      fees_overview,
      sliding_scale_overview,
      emergency_help_note,
      featured_therapists,
      featured_groups
    };
  }

  // getTherapistFilterOptions
  getTherapistFilterOptions() {
    return {
      specialties: [
        { id: 'anxiety', label: 'Anxiety' },
        { id: 'trauma', label: 'Trauma & PTSD' },
        { id: 'work_stress', label: 'Work Stress' },
        { id: 'insomnia', label: 'Sleep & Insomnia' },
        { id: 'couples', label: 'Couples' },
        { id: 'teens', label: 'Teens' }
      ],
      age_groups: [
        { id: 'children', label: 'Children' },
        { id: 'teens', label: 'Teens (13-17)' },
        { id: 'adults', label: 'Adults (18+)' }
      ],
      formats: [
        { id: 'online_telehealth', label: 'Online / Telehealth' },
        { id: 'in_person', label: 'In-Person' }
      ],
      languages: [
        { id: 'english', label: 'English' },
        { id: 'spanish', label: 'Spanish' }
      ],
      payment_options: [
        { id: 'self_pay', label: 'Self-Pay' },
        { id: 'insurance', label: 'Insurance' },
        { id: 'sliding_scale', label: 'Sliding Scale' }
      ],
      sort_options: [
        { id: 'next_available', label: 'Next Available Appointment', default: true },
        { id: 'name', label: 'Name', default: false },
        { id: 'years_experience', label: 'Years of Experience', default: false }
      ]
    };
  }

  // searchTherapists
  searchTherapists(specialtyIds, ageGroupIds, formatIds, languageIds, paymentOptionIds, acceptsNewClientsOnly, sortBy, page, pageSize) {
    const therapists = this._getFromStorage('therapists');

    if (typeof acceptsNewClientsOnly === 'undefined') acceptsNewClientsOnly = true;
    if (typeof sortBy === 'undefined' || !sortBy) sortBy = 'next_available';
    if (!page || page < 1) page = 1;
    if (!pageSize || pageSize < 1) pageSize = 20;

    specialtyIds = Array.isArray(specialtyIds) ? specialtyIds : [];
    ageGroupIds = Array.isArray(ageGroupIds) ? ageGroupIds : [];
    formatIds = Array.isArray(formatIds) ? formatIds : [];
    languageIds = Array.isArray(languageIds) ? languageIds : [];
    paymentOptionIds = Array.isArray(paymentOptionIds) ? paymentOptionIds : [];

    let filtered = therapists.filter(t => {
      if (!t) return false;

      if (acceptsNewClientsOnly && t.accepts_new_clients === false) return false;

      if (specialtyIds.length) {
        const specialties = Array.isArray(t.specialties) ? t.specialties : [];
        if (!this._arraysIntersect(specialtyIds, specialties)) return false;
      }

      if (ageGroupIds.length) {
        const ages = Array.isArray(t.age_groups) ? t.age_groups : [];
        if (!this._arraysIntersect(ageGroupIds, ages)) return false;
      }

      if (formatIds.length) {
        const formats = Array.isArray(t.formats_offered) ? t.formats_offered : [];
        const extra = [];
        if (t.telehealth_offered) extra.push('online_telehealth');
        if (t.in_person_offered) extra.push('in_person');
        const allFormats = Array.from(new Set(formats.concat(extra)));
        if (!this._arraysIntersect(formatIds, allFormats)) return false;
      }

      if (languageIds.length) {
        const langs = Array.isArray(t.languages) ? t.languages : [];
        if (!this._arraysIntersect(languageIds, langs)) return false;
      }

      if (paymentOptionIds.length) {
        let payment = Array.isArray(t.payment_options) ? t.payment_options.slice() : [];
        if (t.offers_sliding_scale && !payment.includes('sliding_scale')) {
          payment.push('sliding_scale');
        }
        if (!this._arraysIntersect(paymentOptionIds, payment)) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const n1 = (a.full_name || '').toLowerCase();
        const n2 = (b.full_name || '').toLowerCase();
        if (n1 < n2) return -1;
        if (n1 > n2) return 1;
        return 0;
      }
      if (sortBy === 'years_experience') {
        const y1 = typeof a.years_experience === 'number' ? a.years_experience : -Infinity;
        const y2 = typeof b.years_experience === 'number' ? b.years_experience : -Infinity;
        return y2 - y1;
      }
      // default next_available
      const d1 = a.next_available_appointment ? new Date(a.next_available_appointment) : null;
      const d2 = b.next_available_appointment ? new Date(b.next_available_appointment) : null;
      const v1 = d1 && !isNaN(d1.getTime()) ? d1.getTime() : Infinity;
      const v2 = d2 && !isNaN(d2.getTime()) ? d2.getTime() : Infinity;
      return v1 - v2;
    });

    const total_results = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const resultsPage = filtered.slice(startIndex, startIndex + pageSize);

    const results = resultsPage.map(t => {
      const specialties_display = Array.isArray(t.specialties) ? t.specialties.map(id => this._toDisplayLabel(id)) : [];
      const age_groups_display = Array.isArray(t.age_groups) ? t.age_groups.map(id => this._toDisplayLabel(id)) : [];
      const languages_display = Array.isArray(t.languages) ? t.languages.map(id => this._toDisplayLabel(id)) : [];
      const formats_display = Array.isArray(t.formats_offered) ? t.formats_offered.map(id => this._toDisplayLabel(id)) : [];

      const payment = Array.isArray(t.payment_options) ? t.payment_options.slice() : [];
      if (t.offers_sliding_scale && !payment.includes('sliding_scale')) payment.push('sliding_scale');
      const payment_options_display = payment.map(id => this._toDisplayLabel(id));

      const next_available_display = t.next_available_appointment
        ? this._formatDateTimeDisplay(t.next_available_appointment)
        : null;

      return {
        therapist: t,
        specialties_display,
        age_groups_display,
        languages_display,
        formats_display,
        payment_options_display,
        next_available_display
      };
    });

    return {
      total_results,
      page,
      page_size: pageSize,
      results
    };
  }

  // getTherapistProfile
  getTherapistProfile(therapistId) {
    const therapists = this._getFromStorage('therapists');
    const therapist = therapists.find(t => t.id === therapistId) || null;

    if (!therapist) {
      return {
        therapist: null,
        specialties_display: [],
        age_groups_display: [],
        languages_display: [],
        formats_display: [],
        payment_options_display: [],
        fee_display: {
          individual_fee: '',
          couples_fee: '',
          sliding_scale_note: ''
        },
        is_saved_to_any_list: false
      };
    }

    const specialties_display = Array.isArray(therapist.specialties)
      ? therapist.specialties.map(id => this._toDisplayLabel(id))
      : [];
    const age_groups_display = Array.isArray(therapist.age_groups)
      ? therapist.age_groups.map(id => this._toDisplayLabel(id))
      : [];
    const languages_display = Array.isArray(therapist.languages)
      ? therapist.languages.map(id => this._toDisplayLabel(id))
      : [];
    const formats_display = Array.isArray(therapist.formats_offered)
      ? therapist.formats_offered.map(id => this._toDisplayLabel(id))
      : [];

    const payment = Array.isArray(therapist.payment_options) ? therapist.payment_options.slice() : [];
    if (therapist.offers_sliding_scale && !payment.includes('sliding_scale')) payment.push('sliding_scale');
    const payment_options_display = payment.map(id => this._toDisplayLabel(id));

    const individual_fee = typeof therapist.base_individual_fee === 'number'
      ? `$${therapist.base_individual_fee.toFixed(0)} per session`
      : '';
    const couples_fee = typeof therapist.base_couples_fee === 'number'
      ? `$${therapist.base_couples_fee.toFixed(0)} per session`
      : '';
    const sliding_scale_note = therapist.offers_sliding_scale
      ? 'Sliding scale fees available.'
      : '';

    const listItems = this._getFromStorage('therapist_list_items');
    const is_saved_to_any_list = listItems.some(item => item.therapist_id === therapistId);

    return {
      therapist,
      specialties_display,
      age_groups_display,
      languages_display,
      formats_display,
      payment_options_display,
      fee_display: {
        individual_fee,
        couples_fee,
        sliding_scale_note
      },
      is_saved_to_any_list
    };
  }

  // getTherapistAppointmentOptions
  getTherapistAppointmentOptions(therapistId, serviceType) {
    const appointmentTypes = this._getFromStorage('appointment_types');
    const therapist = this._getFromStorage('therapists').find(t => t.id === therapistId) || null;

    let filtered = appointmentTypes.filter(at => at.active !== false);
    if (serviceType) {
      filtered = filtered.filter(at => at.service_type === serviceType);
    }

    const defaultType = filtered[0] || null;

    let instructions = '';
    if (therapist) {
      instructions = 'Select an appointment type and time that works for you.';
    }

    return {
      appointment_types: filtered,
      default_appointment_type_id: defaultType ? defaultType.id : null,
      instructions
    };
  }

  // getTherapistAvailabilitySlots
  getTherapistAvailabilitySlots(therapistId, startDate, endDate, sessionFormat, appointmentTypeId) {
    const slots = this._getFromStorage('therapist_availability_slots');
    const therapists = this._getFromStorage('therapists');
    const appointmentTypes = this._getFromStorage('appointment_types');

    const start = new Date(startDate);
    const end = new Date(endDate);

    const filtered = slots.filter(slot => {
      if (!slot || slot.therapist_id !== therapistId) return false;
      if (slot.is_booked) return false;

      const st = new Date(slot.start_time);
      if (isNaN(st.getTime())) return false;
      if (st < start || st > end) return false;

      if (sessionFormat && slot.session_format !== sessionFormat) return false;

      if (appointmentTypeId && slot.appointment_type_id && slot.appointment_type_id !== appointmentTypeId) {
        return false;
      }

      return true;
    });

    // Foreign key resolution: therapist_id, appointment_type_id
    return filtered.map(slot => {
      const therapist = therapists.find(t => t.id === slot.therapist_id) || null;
      const appointment_type = slot.appointment_type_id
        ? (appointmentTypes.find(a => a.id === slot.appointment_type_id) || null)
        : null;
      return Object.assign({}, slot, { therapist, appointment_type });
    });
  }

  // submitAppointmentRequest
  submitAppointmentRequest(therapistId, appointmentTypeId, availabilitySlotId, requestedStartTime, clientFullName, clientEmail, clientPhone, clientMessage) {
    const appointmentRequests = this._getFromStorage('appointment_requests');
    const appointmentTypes = this._getFromStorage('appointment_types');
    const slots = this._getFromStorage('therapist_availability_slots');

    const at = appointmentTypes.find(a => a.id === appointmentTypeId) || null;

    let requested_end_time = null;
    if (at && typeof at.duration_minutes === 'number') {
      const start = new Date(requestedStartTime);
      if (!isNaN(start.getTime())) {
        const endDate = new Date(start.getTime() + at.duration_minutes * 60000);
        requested_end_time = endDate.toISOString();
      }
    }

    const request = {
      id: this._generateId('apptreq'),
      therapist_id: therapistId,
      appointment_type_id: appointmentTypeId,
      availability_slot_id: availabilitySlotId || null,
      requested_start_time: requestedStartTime,
      requested_end_time,
      status: 'pending',
      client_full_name: clientFullName,
      client_email: clientEmail,
      client_phone: clientPhone,
      client_message: clientMessage || '',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    appointmentRequests.push(request);
    this._saveToStorage('appointment_requests', appointmentRequests);

    if (availabilitySlotId) {
      const slotIndex = slots.findIndex(s => s.id === availabilitySlotId);
      if (slotIndex >= 0) {
        slots[slotIndex].is_booked = true;
        this._saveToStorage('therapist_availability_slots', slots);
      }
    }

    return {
      appointment_request: request,
      success: true,
      message: 'Appointment request submitted.'
    };
  }

  // saveTherapistToList
  saveTherapistToList(therapistId, listName) {
    let lists = this._getFromStorage('therapist_lists');
    let items = this._getFromStorage('therapist_list_items');

    let list = null;
    let was_created = false;

    if (listName && typeof listName === 'string') {
      list = lists.find(l => l.name === listName) || null;
      if (!list) {
        list = {
          id: this._generateId('tlist'),
          name: listName,
          created_at: this._nowIso(),
          updated_at: null
        };
        lists.push(list);
        was_created = true;
      }
    } else {
      list = this._getOrCreateDefaultTherapistList();
    }

    // Ensure default list id persisted if this is the first or named list
    this._persistSingleUserState({ default_therapist_list_id: list.id });

    let item = items.find(i => i.therapist_list_id === list.id && i.therapist_id === therapistId) || null;
    if (!item) {
      item = {
        id: this._generateId('tlistitem'),
        therapist_list_id: list.id,
        therapist_id: therapistId,
        added_at: this._nowIso()
      };
      items.push(item);
    }

    this._saveToStorage('therapist_lists', lists);
    this._saveToStorage('therapist_list_items', items);

    return {
      therapist_list: list,
      therapist_list_item: item,
      was_created
    };
  }

  // getSavedTherapistLists
  getSavedTherapistLists() {
    const lists = this._getFromStorage('therapist_lists');
    return lists;
  }

  // getSavedTherapistsForList
  getSavedTherapistsForList(therapistListId) {
    const items = this._getFromStorage('therapist_list_items');
    const therapists = this._getFromStorage('therapists');
    const lists = this._getFromStorage('therapist_lists');

    const list = lists.find(l => l.id === therapistListId) || null;

    const filteredItems = items.filter(i => i.therapist_list_id === therapistListId);

    return filteredItems.map(i => {
      const therapist = therapists.find(t => t.id === i.therapist_id) || null;
      // Foreign key resolution: therapist_list_id, therapist_id
      return {
        therapist_list_item: i,
        therapist,
        therapist_list: list
      };
    });
  }

  // renameTherapistList
  renameTherapistList(therapistListId, newName) {
    const lists = this._getFromStorage('therapist_lists');
    const idx = lists.findIndex(l => l.id === therapistListId);
    if (idx === -1) return null;

    lists[idx].name = newName;
    lists[idx].updated_at = this._nowIso();

    this._saveToStorage('therapist_lists', lists);
    return lists[idx];
  }

  // removeTherapistFromSavedList
  removeTherapistFromSavedList(therapistListId, therapistId) {
    let items = this._getFromStorage('therapist_list_items');
    const before = items.length;
    items = items.filter(i => !(i.therapist_list_id === therapistListId && i.therapist_id === therapistId));
    const after = items.length;
    this._saveToStorage('therapist_list_items', items);
    return { success: after < before };
  }

  // getTherapyGroupFilterOptions
  getTherapyGroupFilterOptions() {
    return {
      focus_tags: [
        { id: 'trauma', label: 'Trauma' },
        { id: 'ptsd', label: 'PTSD' },
        { id: 'anxiety', label: 'Anxiety' }
      ],
      categories: [
        { id: 'trauma_support', label: 'Trauma Support' },
        { id: 'anxiety_support', label: 'Anxiety Support' },
        { id: 'general_support', label: 'General Support' },
        { id: 'other', label: 'Other' }
      ],
      formats: [
        { id: 'online_telehealth', label: 'Online / Telehealth' },
        { id: 'in_person', label: 'In-Person' }
      ],
      status_options: [
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'ongoing', label: 'Ongoing' },
        { id: 'completed', label: 'Completed' },
        { id: 'waitlist_only', label: 'Waitlist Only' }
      ],
      sort_options: [
        { id: 'start_date_asc', label: 'Start Date (Earliest First)' },
        { id: 'start_date_desc', label: 'Start Date (Latest First)' }
      ],
      price_filter: {
        min: 0,
        max: 200,
        step: 5
      }
    };
  }

  // searchTherapyGroups
  searchTherapyGroups(focusTagIds, categoryIds, startDateFrom, startDateTo, maxPerSessionFee, formatIds, statusIds, upcomingOnly, sortBy) {
    const groups = this._getFromStorage('therapy_groups');

    focusTagIds = Array.isArray(focusTagIds) ? focusTagIds : [];
    categoryIds = Array.isArray(categoryIds) ? categoryIds : [];
    formatIds = Array.isArray(formatIds) ? formatIds : [];
    statusIds = Array.isArray(statusIds) ? statusIds : [];
    if (typeof upcomingOnly === 'undefined') upcomingOnly = true;
    if (!sortBy) sortBy = 'start_date_asc';

    const fromDate = startDateFrom ? new Date(startDateFrom) : null;
    const toDate = startDateTo ? new Date(startDateTo) : null;
    const now = new Date();

    let filtered = groups.filter(g => {
      if (!g || !g.start_date) return false;

      const sd = new Date(g.start_date);
      if (isNaN(sd.getTime())) return false;

      if (fromDate && sd < fromDate) return false;
      if (toDate && sd > toDate) return false;

      if (typeof maxPerSessionFee === 'number') {
        if (typeof g.per_session_fee !== 'number') return false;
        if (g.per_session_fee > maxPerSessionFee) return false;
      }

      if (focusTagIds.length) {
        const tags = Array.isArray(g.focus_tags) ? g.focus_tags : [];
        if (!this._arraysIntersect(focusTagIds, tags)) return false;
      }

      if (categoryIds.length) {
        if (!categoryIds.includes(g.category_id)) return false;
      }

      if (formatIds.length) {
        if (!formatIds.includes(g.session_format)) return false;
      }

      if (statusIds.length) {
        if (!statusIds.includes(g.status)) return false;
      }

      if (upcomingOnly) {
        if (!(g.status === 'upcoming' || g.status === 'waitlist_only')) return false;
        if (sd < now) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const da = new Date(a.start_date);
      const db = new Date(b.start_date);
      if (sortBy === 'start_date_desc') {
        return db - da;
      }
      return da - db;
    });

    return filtered;
  }

  // getTherapyGroupDetail
  getTherapyGroupDetail(groupId) {
    const groups = this._getFromStorage('therapy_groups');
    const therapists = this._getFromStorage('therapists');

    const group = groups.find(g => g.id === groupId) || null;
    if (!group) {
      return {
        group: null,
        focus_tags_display: [],
        facilitators: [],
        fee_display: '',
        format_display: '',
        can_join_waitlist: false
      };
    }

    const focus_tags_display = Array.isArray(group.focus_tags)
      ? group.focus_tags.map(id => this._toDisplayLabel(id))
      : [];

    const facilitator_ids = Array.isArray(group.facilitator_ids) ? group.facilitator_ids : [];
    const facilitators = facilitator_ids
      .map(id => therapists.find(t => t.id === id) || null)
      .filter(Boolean);

    const fee_display = typeof group.per_session_fee === 'number'
      ? `$${group.per_session_fee.toFixed(0)} per session`
      : '';

    const format_display = group.session_format === 'online_telehealth'
      ? 'Online / Telehealth'
      : (group.session_format === 'in_person' ? 'In-Person' : '');

    const can_join_waitlist = group.status === 'upcoming' || group.status === 'waitlist_only';

    return {
      group,
      focus_tags_display,
      facilitators,
      fee_display,
      format_display,
      can_join_waitlist
    };
  }

  // submitGroupWaitlistEntry
  submitGroupWaitlistEntry(groupId, fullName, email, preferredFormat, notes) {
    const entries = this._getFromStorage('group_waitlist_entries');

    const entry = {
      id: this._generateId('gwait'),
      group_id: groupId,
      full_name: fullName,
      email: email,
      preferred_format: preferredFormat,
      status: 'active',
      notes: notes || '',
      created_at: this._nowIso()
    };

    entries.push(entry);
    this._saveToStorage('group_waitlist_entries', entries);

    return {
      waitlist_entry: entry,
      success: true,
      message: 'You have been added to the waitlist.'
    };
  }

  // getServiceFees
  getServiceFees() {
    const service_fees = this._getFromStorage('service_fees');
    const insurance_overview = localStorage.getItem('insurance_overview_text') || '';
    const sliding_scale_overview = localStorage.getItem('sliding_scale_overview_text') || '';

    return {
      service_fees,
      insurance_overview,
      sliding_scale_overview
    };
  }

  // estimateServiceFees
  estimateServiceFees(serviceFeeId, numberOfSessions, budgetAmount) {
    const serviceFees = this._getFromStorage('service_fees');
    const estimates = this._getFromStorage('fee_estimates');

    const fee = serviceFees.find(sf => sf.id === serviceFeeId) || null;

    let total_cost = 0;
    if (fee && typeof fee.standard_fee_per_session === 'number') {
      total_cost = fee.standard_fee_per_session * numberOfSessions;
    }

    let fits_budget = null;
    if (typeof budgetAmount === 'number') {
      fits_budget = total_cost <= budgetAmount;
    }

    const estimate = {
      id: this._generateId('feeest'),
      service_fee_id: serviceFeeId,
      number_of_sessions: numberOfSessions,
      budget_amount: typeof budgetAmount === 'number' ? budgetAmount : null,
      total_cost,
      fits_budget,
      created_at: this._nowIso()
    };

    estimates.push(estimate);
    this._saveToStorage('fee_estimates', estimates);

    return estimate;
  }

  // getNewClientInfo
  getNewClientInfo() {
    const stored = JSON.parse(localStorage.getItem('new_client_info') || 'null');
    if (stored) return stored;

    return {
      process_overview: '',
      eligibility_info: '',
      telehealth_info: '',
      what_to_expect: ''
    };
  }

  // getIntakeFormOptions
  getIntakeFormOptions() {
    return {
      client_types: [
        { id: 'adult', label: 'Adult' },
        { id: 'teen', label: 'Teen' },
        { id: 'child', label: 'Child' },
        { id: 'couple', label: 'Couple' },
        { id: 'family', label: 'Family' }
      ],
      payment_methods: [
        { id: 'self_pay', label: 'Self-Pay' },
        { id: 'insurance', label: 'Insurance' },
        { id: 'sliding_scale', label: 'Sliding Scale' },
        { id: 'employee_assistance_program', label: 'Employee Assistance Program (EAP)' },
        { id: 'other', label: 'Other' }
      ],
      session_formats: [
        { id: 'online_telehealth', label: 'Online / Telehealth' },
        { id: 'in_person', label: 'In-Person' },
        { id: 'either', label: 'Either' }
      ],
      time_of_day_options: [
        { id: 'morning', label: 'Morning' },
        { id: 'afternoon', label: 'Afternoon' },
        { id: 'evening', label: 'Evening' },
        { id: 'flexible', label: 'Flexible' }
      ],
      weekday_options: [
        { id: 'monday', label: 'Monday' },
        { id: 'tuesday', label: 'Tuesday' },
        { id: 'wednesday', label: 'Wednesday' },
        { id: 'thursday', label: 'Thursday' },
        { id: 'friday', label: 'Friday' }
      ]
    };
  }

  // submitIntakeRequest
  submitIntakeRequest(clientType, concerns, paymentMethod, sessionFormatPreference, preferredTimeOfDay, preferredDays, clientFullName, email, phone, zipCode) {
    const intakeRequests = this._getFromStorage('intake_requests');

    const request = {
      id: this._generateId('intake'),
      client_type: clientType,
      concerns: concerns,
      payment_method: paymentMethod,
      session_format_preference: sessionFormatPreference,
      preferred_time_of_day: preferredTimeOfDay || null,
      preferred_days: Array.isArray(preferredDays) ? preferredDays : [],
      client_full_name: clientFullName,
      email: email,
      phone: phone,
      zip_code: zipCode,
      status: 'new',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    intakeRequests.push(request);
    this._saveToStorage('intake_requests', intakeRequests);

    return {
      intake_request: request,
      success: true,
      message: 'Intake request submitted.'
    };
  }

  // getResourceFilterOptions
  getResourceFilterOptions() {
    return {
      categories: [
        { id: 'panic_attacks', label: 'Panic Attacks' },
        { id: 'anxiety', label: 'Anxiety' },
        { id: 'work_stress', label: 'Work Stress' },
        { id: 'sleep', label: 'Sleep' },
        { id: 'trauma_support', label: 'Trauma Support' },
        { id: 'general_mental_health', label: 'General Mental Health' },
        { id: 'other', label: 'Other' }
      ],
      topics: [
        { id: 'panic_attacks', label: 'Panic Attacks' },
        { id: 'panic_disorder', label: 'Panic Disorder' },
        { id: 'work_stress', label: 'Work Stress' }
      ],
      content_types: [
        { id: 'article', label: 'Article' },
        { id: 'worksheet', label: 'Worksheet' },
        { id: 'video', label: 'Video' },
        { id: 'audio', label: 'Audio' },
        { id: 'link', label: 'External Link' }
      ]
    };
  }

  // searchResources
  searchResources(query, categoryIds, topicIds, contentTypeIds, page, pageSize) {
    const resources = this._getFromStorage('resources');

    if (!page || page < 1) page = 1;
    if (!pageSize || pageSize < 1) pageSize = 20;

    categoryIds = Array.isArray(categoryIds) ? categoryIds : [];
    topicIds = Array.isArray(topicIds) ? topicIds : [];
    contentTypeIds = Array.isArray(contentTypeIds) ? contentTypeIds : [];

    const q = (query || '').trim().toLowerCase();

    let filtered = resources.filter(r => {
      if (!r || r.is_published === false) return false;

      if (q) {
        const haystack = ((r.title || '') + ' ' + (r.summary || '') + ' ' + (r.content || '')).toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (categoryIds.length && !categoryIds.includes(r.category_id)) return false;

      if (topicIds.length) {
        const topics = Array.isArray(r.topics) ? r.topics : [];
        if (!this._arraysIntersect(topicIds, topics)) return false;
      }

      if (contentTypeIds.length && !contentTypeIds.includes(r.content_type)) return false;

      return true;
    });

    const total_results = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const resultsPage = filtered.slice(startIndex, startIndex + pageSize);

    return {
      total_results,
      page,
      page_size: pageSize,
      results: resultsPage
    };
  }

  // getResourceDetail
  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(r => r.id === resourceId) || null;

    const topics_display = resource && Array.isArray(resource.topics)
      ? resource.topics.map(id => this._toDisplayLabel(id))
      : [];

    // Related resources: same category or overlapping topics
    let related_resources = [];
    if (resource) {
      related_resources = resources
        .filter(r => r.id !== resource.id && r.is_published !== false)
        .filter(r => {
          if (r.category_id && resource.category_id && r.category_id === resource.category_id) return true;
          const t1 = Array.isArray(r.topics) ? r.topics : [];
          const t2 = Array.isArray(resource.topics) ? resource.topics : [];
          return this._arraysIntersect(t1, t2);
        })
        .slice(0, 5);
    }

    // is_in_toolkit: check default toolkit items
    let is_in_toolkit = false;
    if (resource) {
      const toolkit = this._getOrCreateDefaultToolkit();
      const items = this._getFromStorage('toolkit_items');
      is_in_toolkit = items.some(i => i.toolkit_id === toolkit.id && i.resource_id === resource.id);
    }

    return {
      resource,
      topics_display,
      related_resources,
      is_in_toolkit
    };
  }

  // addResourceToToolkit
  addResourceToToolkit(resourceId) {
    const toolkit = this._getOrCreateDefaultToolkit();
    let items = this._getFromStorage('toolkit_items');

    let existing = items.find(i => i.toolkit_id === toolkit.id && i.resource_id === resourceId) || null;
    if (existing) {
      return {
        toolkit,
        toolkit_item: existing,
        success: true,
        message: 'Resource already in toolkit.'
      };
    }

    const item = {
      id: this._generateId('tkititem'),
      toolkit_id: toolkit.id,
      resource_id: resourceId,
      added_at: this._nowIso(),
      notes: ''
    };

    items.push(item);
    this._saveToStorage('toolkit_items', items);

    this._persistSingleUserState({ default_toolkit_id: toolkit.id });

    return {
      toolkit,
      toolkit_item: item,
      success: true,
      message: 'Resource added to toolkit.'
    };
  }

  // getMyToolkit
  getMyToolkit(topicId) {
    const toolkit = this._getOrCreateDefaultToolkit();
    const items = this._getFromStorage('toolkit_items');
    const resources = this._getFromStorage('resources');

    const filteredItems = items.filter(i => i.toolkit_id === toolkit.id);

    const entries = [];
    const topicCounts = {};

    for (const item of filteredItems) {
      const resource = resources.find(r => r.id === item.resource_id) || null;
      if (!resource) continue;

      const topics = Array.isArray(resource.topics) ? resource.topics : [];
      for (const t of topics) {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      }
    }

    for (const item of filteredItems) {
      const resource = resources.find(r => r.id === item.resource_id) || null;
      if (!resource) continue;

      if (topicId) {
        const topics = Array.isArray(resource.topics) ? resource.topics : [];
        if (!topics.includes(topicId)) continue;
      }

      entries.push({ toolkit_item: item, resource });
    }

    const available_topics = Object.keys(topicCounts).map(id => ({
      id,
      label: this._toDisplayLabel(id),
      count: topicCounts[id]
    }));

    return {
      toolkit,
      items: entries,
      available_topics
    };
  }

  // removeResourceFromToolkit
  removeResourceFromToolkit(toolkitItemId) {
    let items = this._getFromStorage('toolkit_items');
    const before = items.length;
    items = items.filter(i => i.id !== toolkitItemId);
    const after = items.length;
    this._saveToStorage('toolkit_items', items);
    return { success: after < before };
  }

  // getOrganizationalServicesOverview
  getOrganizationalServicesOverview() {
    const workshops = this._getFromStorage('workshops');

    const workplaceWorkshops = workshops.filter(w => w.category === 'workplace_mental_health' && w.is_active !== false);
    const highlighted_workshop = workplaceWorkshops[0] || null;

    const overview_text = localStorage.getItem('organizational_services_overview_text') || '';

    const services = [
      {
        category: 'workplace_mental_health',
        title: 'Workplace Mental Health Workshops',
        short_description: ''
      }
    ];

    return {
      overview_text,
      services,
      highlighted_workshop
    };
  }

  // getWorkplaceWorkshops
  getWorkplaceWorkshops() {
    const workshops = this._getFromStorage('workshops');
    return workshops.filter(w => w.category === 'workplace_mental_health' && w.is_active !== false);
  }

  // getWorkshopDetail
  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const workshop = workshops.find(w => w.id === workshopId) || null;

    const detailsKey = `workshop_detail_${workshopId}`;
    const storedDetails = JSON.parse(localStorage.getItem(detailsKey) || 'null') || {};

    return {
      workshop,
      objectives: Array.isArray(storedDetails.objectives) ? storedDetails.objectives : [],
      topics_covered: Array.isArray(storedDetails.topics_covered) ? storedDetails.topics_covered : [],
      typical_agenda: storedDetails.typical_agenda || '',
      configuration_notes: storedDetails.configuration_notes || ''
    };
  }

  // getWorkshopConfigurationOptions
  getWorkshopConfigurationOptions(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const workshop = workshops.find(w => w.id === workshopId) || null;

    const formats = [];
    if (workshop) {
      if (workshop.is_virtual_available) {
        formats.push({ id: 'virtual', label: 'Virtual' });
      }
      if (workshop.is_in_person_available) {
        formats.push({ id: 'in_person', label: 'In-Person' });
      }
      // hybrid is optional; only include if both are available
      if (workshop.is_virtual_available && workshop.is_in_person_available) {
        formats.push({ id: 'hybrid', label: 'Hybrid' });
      }
    }

    const durations = [];
    const default_durations = workshop && Array.isArray(workshop.default_durations)
      ? workshop.default_durations
      : ['half_day', 'full_day'];

    for (const d of default_durations) {
      durations.push({ id: d, label: this._toDisplayLabel(d) });
    }

    return {
      formats,
      durations
    };
  }

  // submitWorkshopQuoteRequest
  submitWorkshopQuoteRequest(workshopId, organizationName, contactName, contactEmail, teamSize, format, duration, preferredStartDate, preferredEndDate, notes) {
    const requests = this._getFromStorage('workshop_quote_requests');

    let startDate = preferredStartDate || null;
    let endDate = preferredEndDate || null;

    const isoPattern = /^\d{4}-\d{2}-\d{2}/;
    if (startDate && !isoPattern.test(startDate) && !endDate) {
      // Try parsing a human-readable range in preferredStartDate
      const parsed = this._parsePreferredDateRange(startDate);
      startDate = parsed.startDate;
      endDate = parsed.endDate;
    } else {
      // leave as-is; caller is expected to pass ISO strings
    }

    const request = {
      id: this._generateId('wq'),
      workshop_id: workshopId,
      organization_name: organizationName,
      contact_name: contactName,
      contact_email: contactEmail || null,
      team_size: typeof teamSize === 'number' ? teamSize : null,
      format: format,
      duration: duration,
      preferred_start_date: startDate,
      preferred_end_date: endDate,
      notes: notes || '',
      created_at: this._nowIso(),
      status: 'new'
    };

    requests.push(request);
    this._saveToStorage('workshop_quote_requests', requests);

    return {
      workshop_quote_request: request,
      success: true,
      message: 'Workshop quote request submitted.'
    };
  }

  // getContactSubjectsAndInfo
  getContactSubjectsAndInfo() {
    const info = JSON.parse(localStorage.getItem('contact_info') || 'null') || {};

    const subject_options = [
      { id: 'couples_counseling', label: 'Couples Counseling' },
      { id: 'service_inquiry', label: 'Service Inquiry' },
      { id: 'appointment_cancellation', label: 'Appointment Cancellation' },
      { id: 'workplace_services', label: 'Workplace / Organizational Services' },
      { id: 'other', label: 'Other' }
    ];

    return {
      subject_options,
      contact_phone: info.contact_phone || '',
      contact_address: info.contact_address || '',
      contact_email: info.contact_email || '',
      usage_guidance: info.usage_guidance || ''
    };
  }

  // submitContactMessage
  submitContactMessage(fullName, email, subjectType, relatedServiceType, message) {
    const messages = this._getFromStorage('contact_messages');

    const msg = {
      id: this._generateId('contact'),
      full_name: fullName,
      email: email,
      subject_type: subjectType,
      related_service_type: relatedServiceType || null,
      message: message,
      created_at: this._nowIso(),
      status: 'new'
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      contact_message: msg,
      success: true,
      message: 'Message sent.'
    };
  }

  // getNewsletterOptions
  getNewsletterOptions() {
    const stored = JSON.parse(localStorage.getItem('newsletter_options') || 'null') || {};

    const topics = Array.isArray(stored.topics) && stored.topics.length
      ? stored.topics
      : [
        { id: 'anxiety', label: 'Anxiety' },
        { id: 'work_stress', label: 'Work Stress' },
        { id: 'panic_attacks', label: 'Panic Attacks' },
        { id: 'sleep', label: 'Sleep & Insomnia' },
        { id: 'general_mental_health', label: 'General Mental Health' }
      ];

    const frequencies = Array.isArray(stored.frequencies) && stored.frequencies.length
      ? stored.frequencies
      : [
        { id: 'weekly', label: 'Weekly', recommended: false },
        { id: 'twice_per_month', label: 'Twice per month', recommended: true },
        { id: 'monthly', label: 'Monthly', recommended: false },
        { id: 'quarterly', label: 'Quarterly', recommended: false }
      ];

    const consent_text = stored.consent_text || 'I agree to receive email updates and understand I can unsubscribe at any time.';

    return {
      topics,
      frequencies,
      consent_text
    };
  }

  // submitNewsletterSubscription
  submitNewsletterSubscription(email, fullName, topicIds, frequency, consentGiven) {
    const subs = this._getFromStorage('newsletter_subscriptions');

    const sub = {
      id: this._generateId('news'),
      email: email,
      full_name: fullName || null,
      topics: Array.isArray(topicIds) ? topicIds : [],
      frequency: frequency,
      consent_given: !!consentGiven,
      created_at: this._nowIso(),
      is_active: !!consentGiven
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return sub;
  }

  // getPoliciesAndFaq
  getPoliciesAndFaq() {
    const policies = JSON.parse(localStorage.getItem('policies') || 'null') || [];
    const faqs = JSON.parse(localStorage.getItem('faqs') || 'null') || [];

    const cancellationPolicies = this._getFromStorage('cancellation_policies');
    let cancellation_policy = cancellationPolicies.find(p => p.is_default) || cancellationPolicies[0] || null;

    return {
      policies,
      faqs,
      cancellation_policy
    };
  }

  // getCancellationPolicyDetail
  getCancellationPolicyDetail() {
    const policies = this._getFromStorage('cancellation_policies');
    const policy = policies.find(p => p.is_default) || policies[0] || null;
    return policy;
  }

  // getAboutPracticeContent
  getAboutPracticeContent() {
    const stored = JSON.parse(localStorage.getItem('about_practice_content') || 'null');
    if (stored) return stored;

    return {
      mission: '',
      approach: '',
      values: '',
      team_overview: '',
      multilingual_and_cultural_competence: '',
      accessibility_and_sliding_scale: '',
      next_steps_cta_text: ''
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
