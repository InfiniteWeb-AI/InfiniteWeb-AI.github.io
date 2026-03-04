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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tableDefaults = {
      therapists: [
        {
          id: 't_hannah_stone',
          full_name: 'Hannah Stone',
          credentials: 'LCSW',
          bio:
            'Hannah Stone is a licensed clinical social worker specializing in trauma, depression, and anxiety for adults. She offers individual and group therapy with a warm, collaborative style.',
          issues_treated: ['trauma', 'depression', 'anxiety', 'stress'],
          specialties: ['trauma', 'depression'],
          services_offered: ['individual_therapy', 'group_therapy'],
          session_types: ['online', 'in_person'],
          client_types: ['adults'],
          languages: ['english'],
          standard_session_length_minutes: 50,
          other_session_lengths_minutes: [30, 75],
          standard_session_fee: 120,
          currency: 'usd',
          offers_sliding_scale: true,
          sliding_scale_min_fee: 90,
          sliding_scale_max_fee: 120,
          consultation_offered: true,
          consultation_is_free: true,
          consultation_duration_minutes: 20,
          accepts_out_of_network_benefits: true,
          insurance_accepted: [],
          payment_options: ['private_pay', 'sliding_scale', 'out_of_network_benefits', 'hsa_fsa'],
          rating: 4.8,
          review_count: 35,
          client_status: 'accepting_new_clients',
          location_address_line1: '100 Market St, Suite 500',
          location_city: 'San Francisco',
          location_state: 'CA',
          location_zip: '94103',
          location_latitude: 37.789,
          location_longitude: -122.401,
          is_featured: false,
          createdAt: '2025-01-01T09:00:00Z',
          updatedAt: '2025-01-01T09:00:00Z'
        },
        {
          id: 't_priya_patel',
          full_name: 'Priya Patel',
          credentials: 'LCSW',
          bio:
            'Priya Patel is a trauma-informed therapist who works with adults dealing with complex trauma and depression. She offers both individual therapy and small process groups.',
          issues_treated: ['trauma', 'depression', 'anxiety'],
          specialties: ['trauma', 'depression'],
          services_offered: ['individual_therapy', 'group_therapy'],
          session_types: ['online'],
          client_types: ['adults'],
          languages: ['english'],
          standard_session_length_minutes: 50,
          other_session_lengths_minutes: [75],
          standard_session_fee: 140,
          currency: 'usd',
          offers_sliding_scale: true,
          sliding_scale_min_fee: 100,
          sliding_scale_max_fee: 140,
          consultation_offered: true,
          consultation_is_free: false,
          consultation_duration_minutes: 20,
          accepts_out_of_network_benefits: true,
          insurance_accepted: [],
          payment_options: ['private_pay', 'sliding_scale', 'out_of_network_benefits'],
          rating: 4.9,
          review_count: 48,
          client_status: 'accepting_new_clients',
          location_address_line1: '200 Main St, Suite 300',
          location_city: 'Chicago',
          location_state: 'IL',
          location_zip: '60606',
          location_latitude: 41.88,
          location_longitude: -87.634,
          is_featured: false,
          createdAt: '2025-01-02T09:00:00Z',
          updatedAt: '2025-01-02T09:00:00Z'
        }
      ],
      therapist_availability_slots: [
        {
          id: 'slot_jordan_20260308_1800_online',
          therapist_id: 't_jordan_lee',
          start_datetime: '2026-03-08T18:00:00Z',
          end_datetime: '2026-03-08T18:50:00Z',
          session_length_minutes: 50,
          session_type: 'online',
          createdAt: '2026-02-20T10:15:00Z',
          is_booked: false
        }
      ],
      appointments: [],
      favorite_therapists: [],
      therapist_comparisons: [],
      intake_form_submissions: [],
      groups: [],
      group_registrations: [],
      service_pricings: [],
      cost_plans: [],
      articles: [],
      reading_list_items: [],
      newsletter_subscriptions: [],
      contact_requests: [],
      general_contact_requests: []
    };

    Object.keys(tableDefaults).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(tableDefaults[key]));
      }
    });

    // Static content defaults
    if (!localStorage.getItem('home_page_content')) {
      const defaultHome = {
        hero_title: 'Counseling & Psychotherapy for Real Life',
        hero_subtitle: 'Find support for anxiety, trauma, depression, relationships, and more.',
        hero_ctas: [
          { label: 'Find a Therapist', target_page: 'find_therapist' },
          { label: 'Groups & Workshops', target_page: 'groups' }
        ],
        intro_sections: [
          {
            heading: 'Therapy tailored to you',
            body: 'Browse licensed therapists offering individual, couples, and group sessions online and in person.'
          }
        ],
        urgent_support_block: {
          headline: 'If you are in crisis',
          body: 'This site is not a crisis service. If you are in immediate danger, please call your local emergency number.',
          actions: [
            { label: 'Find a therapist', target_page: 'find_therapist' }
          ]
        }
      };
      localStorage.setItem('home_page_content', JSON.stringify(defaultHome));
    }

    if (!localStorage.getItem('about_page_content')) {
      const defaultAbout = {
        mission: 'To make thoughtful, evidence-based therapy and group support accessible and human.',
        values: ['Compassion', 'Inclusivity', 'Evidence-based care', 'Respect for your lived experience'],
        therapeutic_orientation: 'We draw from CBT, ACT, psychodynamic, and trauma-informed approaches.',
        privacy_and_ethics_summary: 'We follow strict confidentiality and professional ethics guidelines.',
        clinicians: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(defaultAbout));
    }

    if (!localStorage.getItem('contact_page_info')) {
      const defaultContact = {
        email: 'hello@exampletherapy.com',
        phone: '(000) 000-0000',
        address: '123 Example Street, Suite 100, Example City, EX 00000',
        map_embed_enabled: false,
        directions_text: 'Located in central downtown, accessible by public transit.',
        response_time_expectation: 'We typically respond within 1-2 business days.',
        emergency_note: 'Do not use this form for emergencies. Call your local emergency number instead.'
      };
      localStorage.setItem('contact_page_info', JSON.stringify(defaultContact));
    }

    if (!localStorage.getItem('policies_and_faqs')) {
      const defaultPolicies = {
        privacy_policy_html: '<p>Your privacy is important to us. We store only what we need to provide services.</p>',
        terms_of_service_html: '<p>Use of this site does not constitute a therapeutic relationship until you sign informed consent.</p>',
        faqs: []
      };
      localStorage.setItem('policies_and_faqs', JSON.stringify(defaultPolicies));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      return fallback !== undefined ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _dateOnlyIso(date) {
    if (!(date instanceof Date)) return null;
    return date.toISOString().slice(0, 10);
  }

  _getDayOfWeekString(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _timeOfDayFromDate(date) {
    const h = date.getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  _labelFromKey(key) {
    if (!key || typeof key !== 'string') return '';
    return key
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _estimateDistanceMiles(therapist, filters) {
    // Without geocoding, approximate: 0 miles if same ZIP, otherwise null
    if (!therapist) return null;
    if (filters && filters.location_zip && therapist.location_zip) {
      if (filters.location_zip === therapist.location_zip) {
        return 0;
      }
    }
    return null;
  }

  _findNextMatchingSlotForTherapist(therapistId, availabilitySlots, filters) {
    const availability = (filters && filters.availability) || {};
    const sessionTypesFilter = (filters && filters.session_types) || null;

    const dateFrom = availability.date_from ? this._parseDate(availability.date_from) : null;
    const dateTo = availability.date_to ? this._parseDate(availability.date_to) : null;
    const daysOfWeek = availability.days_of_week || null;
    const timeOfDay = availability.time_of_day || null;
    const startNotBefore = availability.start_time_not_before || null; // 'HH:MM'

    let candidate = null;

    for (let i = 0; i < availabilitySlots.length; i++) {
      const slot = availabilitySlots[i];
      if (slot.therapist_id !== therapistId) continue;
      if (slot.is_booked) continue;

      if (sessionTypesFilter && sessionTypesFilter.length && sessionTypesFilter.indexOf(slot.session_type) === -1) {
        continue;
      }

      const start = this._parseDate(slot.start_datetime);
      if (!start) continue;

      if (dateFrom && start < dateFrom) continue;
      if (dateTo && start > dateTo) continue;

      if (daysOfWeek && daysOfWeek.length) {
        const dayStr = this._getDayOfWeekString(start);
        if (daysOfWeek.indexOf(dayStr) === -1) continue;
      }

      if (timeOfDay) {
        const tod = this._timeOfDayFromDate(start);
        if (tod !== timeOfDay) continue;
      }

      if (startNotBefore) {
        const parts = startNotBefore.split(':');
        const hStr = parts[0] || '0';
        const mStr = parts[1] || '0';
        const minMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
        const slotMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
        if (slotMinutes < minMinutes) continue;
      }

      if (!candidate || this._parseDate(candidate.start_datetime) > start) {
        candidate = slot;
      }
    }

    if (!candidate) return null;

    return {
      availability_slot_id: candidate.id,
      start_datetime: candidate.start_datetime,
      end_datetime: candidate.end_datetime,
      session_type: candidate.session_type,
      session_length_minutes: candidate.session_length_minutes
    };
  }

  _getOrCreateCurrentBookingDraft() {
    const raw = localStorage.getItem('current_booking_draft');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to recreate
      }
    }
    const draft = null;
    return draft;
  }

  _saveCurrentBookingDraft(draft) {
    if (draft) {
      localStorage.setItem('current_booking_draft', JSON.stringify(draft));
    } else {
      localStorage.removeItem('current_booking_draft');
    }
  }

  _getOrCreateCurrentComparisonSet() {
    const comparisons = this._getFromStorage('therapist_comparisons', []);
    const currentId = localStorage.getItem('current_comparison_id');
    let comparison = null;
    if (currentId) {
      comparison = comparisons.find((c) => c.id === currentId) || null;
    }
    if (!comparison) {
      comparison = {
        id: this._generateId('cmp'),
        therapist_ids: [],
        title: null,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      comparisons.push(comparison);
      this._saveToStorage('therapist_comparisons', comparisons);
      localStorage.setItem('current_comparison_id', comparison.id);
    }
    return comparison;
  }

  _saveCurrentComparisonSet(comparison) {
    const comparisons = this._getFromStorage('therapist_comparisons', []);
    const idx = comparisons.findIndex((c) => c.id === comparison.id);
    if (idx >= 0) {
      comparisons[idx] = comparison;
    } else {
      comparisons.push(comparison);
    }
    this._saveToStorage('therapist_comparisons', comparisons);
    localStorage.setItem('current_comparison_id', comparison.id);
  }

  _getOrCreateIntakeFormForTherapist(therapistId) {
    const forms = this._getFromStorage('intake_form_submissions', []);
    let form = forms.find((f) => f.therapist_id === therapistId && f.status === 'in_progress');
    if (!form) {
      form = {
        id: this._generateId('intake'),
        therapist_id: therapistId,
        status: 'in_progress',
        current_step: 1,
        client_full_name: null,
        client_email: null,
        client_phone: null,
        preferred_contact_method: null,
        services_of_interest: [],
        presenting_concerns: [],
        goals_for_therapy: null,
        additional_details: null,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      forms.push(form);
      this._saveToStorage('intake_form_submissions', forms);
    }
    return form;
  }

  _recalculateCostPlanTotal(config) {
    const pricing = this._getFromStorage('service_pricings', []);
    const getFee = (serviceType) => {
      const sp = pricing.find((p) => p.service_type === serviceType);
      return sp ? sp.standard_fee_per_session : 0;
    };
    const individualCount = config.individual_sessions_per_month || 0;
    const couplesCount = config.couples_sessions_per_month || 0;
    const groupCount = config.group_sessions_per_month || 0;

    const individualFee = getFee('individual_therapy');
    const couplesFee = getFee('couples_therapy');
    const groupFee = getFee('group_therapy');

    const total = individualCount * individualFee + couplesCount * couplesFee + groupCount * groupFee;
    const currency = (pricing[0] && pricing[0].currency) || 'usd';

    return {
      monthly_total: total,
      currency
    };
  }

  _loadClientDashboardState() {
    const appointments = this._getFromStorage('appointments', []);
    const therapists = this._getFromStorage('therapists', []);
    const groupRegistrations = this._getFromStorage('group_registrations', []);
    const groups = this._getFromStorage('groups', []);
    const favorites = this._getFromStorage('favorite_therapists', []);
    const readingList = this._getFromStorage('reading_list_items', []);
    const costPlans = this._getFromStorage('cost_plans', []);

    const now = new Date();

    const upcoming_appointments = appointments
      .filter((a) => a.status === 'scheduled' && this._parseDate(a.start_datetime) && this._parseDate(a.start_datetime) >= now)
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime).getTime();
        const db = this._parseDate(b.start_datetime).getTime();
        return da - db;
      })
      .map((appointment) => {
        const therapist = therapists.find((t) => t.id === appointment.therapist_id) || null;
        return { appointment, therapist };
      });

    const group_registrations = groupRegistrations.map((registration) => {
      const group = groups.find((g) => g.id === registration.group_id) || null;
      return { registration, group };
    });

    const counts = {
      favorite_therapists_count: favorites.length,
      reading_list_count: readingList.length,
      saved_cost_plans_count: costPlans.length
    };

    return { upcoming_appointments, group_registrations, counts };
  }

  // ============================
  // Core interface implementations
  // ============================

  // getHomePageContent
  getHomePageContent() {
    return this._getFromStorage('home_page_content', {
      hero_title: '',
      hero_subtitle: '',
      hero_ctas: [],
      intro_sections: [],
      urgent_support_block: null
    });
  }

  // getTherapistFilterOptions
  getTherapistFilterOptions() {
    const therapists = this._getFromStorage('therapists', []);

    const concernSet = new Set();
    const sessionTypeSet = new Set();
    const sessionLengthsSet = new Set();
    const languageSet = new Set();
    const insuranceSet = new Set();
    const paymentOptionsSet = new Set();
    const clientTypeSet = new Set();

    let minFee = null;
    let maxFee = null;

    therapists.forEach((t) => {
      (t.issues_treated || []).forEach((c) => concernSet.add(c));
      (t.session_types || []).forEach((s) => sessionTypeSet.add(s));
      if (typeof t.standard_session_length_minutes === 'number') {
        sessionLengthsSet.add(t.standard_session_length_minutes);
      }
      (t.other_session_lengths_minutes || []).forEach((len) => sessionLengthsSet.add(len));
      (t.languages || []).forEach((l) => languageSet.add(l));
      (t.insurance_accepted || []).forEach((ins) => insuranceSet.add(ins));
      (t.payment_options || []).forEach((po) => paymentOptionsSet.add(po));
      (t.client_types || []).forEach((ct) => clientTypeSet.add(ct));
      if (typeof t.standard_session_fee === 'number') {
        if (minFee === null || t.standard_session_fee < minFee) minFee = t.standard_session_fee;
        if (maxFee === null || t.standard_session_fee > maxFee) maxFee = t.standard_session_fee;
      }
    });

    const concerns = Array.from(concernSet).map((key) => ({ key, label: this._labelFromKey(key) }));
    const session_types = Array.from(sessionTypeSet).map((key) => ({ key, label: this._labelFromKey(key) }));
    const session_lengths_minutes = Array.from(sessionLengthsSet).sort((a, b) => a - b);
    const languages = Array.from(languageSet).sort();
    const insurance_providers = Array.from(insuranceSet).sort();
    const payment_options = Array.from(paymentOptionsSet).sort();
    const client_types = Array.from(clientTypeSet).sort();

    const price_range = {
      min_fee: minFee !== null ? minFee : 0,
      max_fee: maxFee !== null ? maxFee : 0,
      currency: 'usd'
    };

    const ratings = [3, 4, 4.5, 5];
    const time_of_day_options = ['morning', 'afternoon', 'evening'];
    const availability_presets = ['next_7_days', 'this_week', 'evenings_only'];
    const sort_options = [
      { key: 'earliest_available', label: 'Earliest available' },
      { key: 'rating_desc', label: 'Rating: High to Low' },
      { key: 'price_asc', label: 'Price: Low to High' }
    ];

    return {
      concerns,
      session_types,
      session_lengths_minutes,
      price_range,
      languages,
      insurance_providers,
      payment_options,
      ratings,
      client_types,
      time_of_day_options,
      availability_presets,
      sort_options
    };
  }

  // searchTherapists
  searchTherapists(query, filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || null;
    page = page || 1;
    page_size = page_size || 20;

    const therapists = this._getFromStorage('therapists', []);
    const favorites = this._getFromStorage('favorite_therapists', []);
    const availabilitySlots = this._getFromStorage('therapist_availability_slots', []);
    const comparison = this._getOrCreateCurrentComparisonSet();

    const q = (query || '').trim().toLowerCase();

    const filtered = therapists
      .filter((t) => {
        if (q) {
          const haystackParts = [t.full_name, t.bio]
            .concat(t.specialties || [])
            .concat(t.issues_treated || []);
          const haystack = haystackParts
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (haystack.indexOf(q) === -1) return false;
        }

        if (filters.concerns && filters.concerns.length) {
          const issues = t.issues_treated || [];
          const matches = filters.concerns.some((c) => issues.indexOf(c) !== -1);
          if (!matches) return false;
        }

        if (filters.services_offered && filters.services_offered.length) {
          const services = t.services_offered || [];
          const allMatch = filters.services_offered.every((s) => services.indexOf(s) !== -1);
          if (!allMatch) return false;
        }

        if (filters.session_types && filters.session_types.length) {
          const sessTypes = t.session_types || [];
          const hasType = filters.session_types.some((s) => sessTypes.indexOf(s) !== -1);
          if (!hasType) return false;
        }

        if (typeof filters.session_length_minutes === 'number') {
          const len = filters.session_length_minutes;
          const lengths = [t.standard_session_length_minutes].concat(t.other_session_lengths_minutes || []);
          if (lengths.indexOf(len) === -1) return false;
        }

        if (typeof filters.price_max === 'number') {
          if (typeof t.standard_session_fee !== 'number' || t.standard_session_fee > filters.price_max) {
            return false;
          }
        }

        if (filters.language) {
          const langs = t.languages || [];
          if (langs.indexOf(filters.language) === -1) return false;
        }

        if (filters.insurance_provider) {
          const ins = (t.insurance_accepted || []).map((v) =>
            typeof v === 'string' ? v.toLowerCase() : v
          );
          const targetIns =
            typeof filters.insurance_provider === 'string'
              ? filters.insurance_provider.toLowerCase()
              : filters.insurance_provider;
          if (ins.indexOf(targetIns) === -1) return false;
        }

        if (typeof filters.accepts_out_of_network_benefits === 'boolean') {
          if (!!t.accepts_out_of_network_benefits !== filters.accepts_out_of_network_benefits) return false;
        }

        if (filters.payment_options && filters.payment_options.length) {
          const pay = t.payment_options || [];
          const allMatch = filters.payment_options.every((p) => pay.indexOf(p) !== -1);
          if (!allMatch) return false;
        }

        if (typeof filters.rating_min === 'number') {
          if (typeof t.rating !== 'number' || t.rating < filters.rating_min) return false;
        }

        if (filters.client_type) {
          const ct = t.client_types || [];
          if (ct.indexOf(filters.client_type) === -1) return false;
        }

        if (filters.client_status) {
          if (t.client_status !== filters.client_status) return false;
        }

        if (filters.location_zip) {
          if (!t.location_zip) return false;
          if (t.location_zip !== filters.location_zip) {
            if (filters.location_radius_miles && filters.location_radius_miles <= 5) {
              return false;
            }
          }
        }

        if (filters.consultation_free_15_minutes) {
          if (!t.consultation_offered || !t.consultation_is_free || t.consultation_duration_minutes < 15) {
            return false;
          }
        }

        return true;
      })
      .map((t) => {
        const nextSlot = this._findNextMatchingSlotForTherapist(t.id, availabilitySlots, filters);
        return { therapist: t, next_matching_slot: nextSlot };
      })
      .filter((entry) => {
        const availability = filters.availability || {};
        const availabilityRequested = !!(
          availability.date_from ||
          availability.date_to ||
          (availability.days_of_week && availability.days_of_week.length) ||
          availability.time_of_day ||
          availability.start_time_not_before
        );
        if (availabilityRequested) {
          return !!entry.next_matching_slot;
        }
        return true;
      });

    if (sort_by === 'earliest_available') {
      filtered.sort((a, b) => {
        const da = a.next_matching_slot ? this._parseDate(a.next_matching_slot.start_datetime).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.next_matching_slot ? this._parseDate(b.next_matching_slot.start_datetime).getTime() : Number.MAX_SAFE_INTEGER;
        if (da === db) return 0;
        return da < db ? -1 : 1;
      });
    } else if (sort_by === 'rating_desc') {
      filtered.sort((a, b) => {
        const ra = typeof a.therapist.rating === 'number' ? a.therapist.rating : 0;
        const rb = typeof b.therapist.rating === 'number' ? b.therapist.rating : 0;
        if (ra === rb) return 0;
        return ra > rb ? -1 : 1;
      });
    } else if (sort_by === 'price_asc') {
      filtered.sort((a, b) => {
        const pa = typeof a.therapist.standard_session_fee === 'number' ? a.therapist.standard_session_fee : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.therapist.standard_session_fee === 'number' ? b.therapist.standard_session_fee : Number.MAX_SAFE_INTEGER;
        if (pa === pb) return 0;
        return pa < pb ? -1 : 1;
      });
    }

    const total_results = filtered.length;
    const total_pages = total_results === 0 ? 0 : Math.ceil(total_results / page_size);
    const startIndex = (page - 1) * page_size;
    const pageItems = filtered.slice(startIndex, startIndex + page_size);

    const results = pageItems.map((entry) => {
      const therapist = entry.therapist;
      const is_favorite = favorites.some((f) => f.therapist_id === therapist.id);
      const in_comparison = comparison && comparison.therapist_ids && comparison.therapist_ids.indexOf(therapist.id) !== -1;
      const distance_miles = this._estimateDistanceMiles(therapist, filters);
      return {
        therapist,
        distance_miles,
        next_matching_slot: entry.next_matching_slot,
        is_favorite,
        in_comparison
      };
    });

    return {
      results,
      pagination: {
        page,
        page_size,
        total_results,
        total_pages
      }
    };
  }

  // getTherapistProfile
  getTherapistProfile(therapistId) {
    const therapists = this._getFromStorage('therapists', []);
    const favorites = this._getFromStorage('favorite_therapists', []);
    const comparison = this._getOrCreateCurrentComparisonSet();

    const therapist = therapists.find((t) => t.id === therapistId) || null;
    if (!therapist) {
      return {
        therapist: null,
        services_display: [],
        fees_display: {},
        consultation_details: { offered: false, is_free: false, duration_minutes: 0 },
        is_favorite: false,
        in_comparison: false
      };
    }

    const services_display = (therapist.services_offered || []).map((s) => this._labelFromKey(s));

    let standardLabel = '';
    if (typeof therapist.standard_session_fee === 'number') {
      const len = therapist.standard_session_length_minutes || 50;
      standardLabel = '$' + therapist.standard_session_fee + ' / ' + len + '-minute session';
    }
    let slidingLabel = '';
    if (therapist.offers_sliding_scale) {
      const min = therapist.sliding_scale_min_fee;
      const max = therapist.sliding_scale_max_fee;
      if (typeof min === 'number' && typeof max === 'number') {
        slidingLabel = 'Sliding scale: $' + min + ' - $' + max + ' per session';
      } else {
        slidingLabel = 'Sliding scale available';
      }
    }

    const fees_display = {
      standard_session_label: standardLabel,
      sliding_scale_label: slidingLabel
    };

    const consultation_details = {
      offered: !!therapist.consultation_offered,
      is_free: !!therapist.consultation_is_free,
      duration_minutes: therapist.consultation_duration_minutes || 0
    };

    const is_favorite = favorites.some((f) => f.therapist_id === therapist.id);
    const in_comparison = comparison && comparison.therapist_ids && comparison.therapist_ids.indexOf(therapist.id) !== -1;

    return {
      therapist,
      services_display,
      fees_display,
      consultation_details,
      is_favorite,
      in_comparison
    };
  }

  // getTherapistAvailabilitySlots
  getTherapistAvailabilitySlots(therapistId, date_from, date_to, session_type) {
    const slots = this._getFromStorage('therapist_availability_slots', []);
    const therapists = this._getFromStorage('therapists', []);
    const therapist = therapists.find((t) => t.id === therapistId) || null;

    const fromDate = date_from ? this._parseDate(date_from) : null;
    const toDate = date_to ? this._parseDate(date_to) : null;

    return slots
      .filter((s) => {
        if (s.therapist_id !== therapistId) return false;
        const start = this._parseDate(s.start_datetime);
        if (!start) return false;
        if (fromDate && start < fromDate) return false;
        if (toDate && start > toDate) return false;
        if (session_type && s.session_type !== session_type) return false;
        return true;
      })
      .map((s) => {
        // Foreign key resolution: include therapist
        return Object.assign({}, s, {
          therapist
        });
      });
  }

  // createAppointmentDraftFromAvailabilitySlot
  createAppointmentDraftFromAvailabilitySlot(availabilitySlotId) {
    const slots = this._getFromStorage('therapist_availability_slots', []);
    const therapists = this._getFromStorage('therapists', []);

    const slot = slots.find((s) => s.id === availabilitySlotId) || null;
    if (!slot) {
      return { success: false, booking_summary: null, message: 'Availability slot not found.' };
    }
    const therapist = therapists.find((t) => t.id === slot.therapist_id) || null;
    if (!therapist) {
      return { success: false, booking_summary: null, message: 'Therapist not found for this slot.' };
    }

    const fee = typeof therapist.standard_session_fee === 'number' ? therapist.standard_session_fee : 0;

    const draft = {
      therapist_id: therapist.id,
      availability_slot_id: slot.id,
      session_type: slot.session_type,
      session_length_minutes: slot.session_length_minutes,
      fee,
      currency: therapist.currency || 'usd',
      client_name: null,
      client_email: null,
      client_phone: null,
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    this._saveCurrentBookingDraft(draft);

    const booking_summary = {
      therapist,
      availability_slot: slot,
      session_type: draft.session_type,
      session_length_minutes: draft.session_length_minutes,
      fee: draft.fee,
      currency: draft.currency
    };

    return { success: true, booking_summary, message: 'Appointment draft created.' };
  }

  // getCurrentBookingSummary
  getCurrentBookingSummary() {
    const draft = this._getOrCreateCurrentBookingDraft();
    if (!draft) {
      return { has_draft: false, booking_summary: null };
    }
    const therapists = this._getFromStorage('therapists', []);
    const slots = this._getFromStorage('therapist_availability_slots', []);

    const therapist = therapists.find((t) => t.id === draft.therapist_id) || null;
    const availability_slot = slots.find((s) => s.id === draft.availability_slot_id) || null;

    const booking_summary = {
      therapist,
      availability_slot,
      session_type: draft.session_type,
      session_length_minutes: draft.session_length_minutes,
      fee: draft.fee,
      currency: draft.currency,
      client_name: draft.client_name || '',
      client_email: draft.client_email || '',
      client_phone: draft.client_phone || ''
    };

    return { has_draft: true, booking_summary };
  }

  // updateCurrentBookingClientDetails
  updateCurrentBookingClientDetails(client_name, client_email, client_phone) {
    const draft = this._getOrCreateCurrentBookingDraft();
    if (!draft) {
      return { success: false, booking_summary: null, message: 'No booking draft to update.' };
    }
    draft.client_name = client_name;
    draft.client_email = client_email;
    draft.client_phone = client_phone || null;
    draft.updatedAt = this._nowIso();
    this._saveCurrentBookingDraft(draft);

    return {
      success: true,
      booking_summary: {
        client_name: draft.client_name,
        client_email: draft.client_email,
        client_phone: draft.client_phone
      },
      message: 'Booking draft updated.'
    };
  }

  // confirmCurrentAppointmentBooking
  confirmCurrentAppointmentBooking() {
    const draft = this._getOrCreateCurrentBookingDraft();
    if (!draft) {
      return { success: false, appointment: null, message: 'No booking draft to confirm.', next_steps: '' };
    }

    const slots = this._getFromStorage('therapist_availability_slots', []);
    const therapists = this._getFromStorage('therapists', []);
    const appointments = this._getFromStorage('appointments', []);

    const slot = slots.find((s) => s.id === draft.availability_slot_id) || null;
    const therapist = therapists.find((t) => t.id === draft.therapist_id) || null;
    if (!slot || !therapist) {
      return { success: false, appointment: null, message: 'Unable to confirm appointment due to missing data.', next_steps: '' };
    }

    const appointment = {
      id: this._generateId('appt'),
      therapist_id: therapist.id,
      availability_slot_id: slot.id,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      session_length_minutes: slot.session_length_minutes,
      session_type: slot.session_type,
      fee: draft.fee,
      currency: draft.currency,
      status: 'scheduled',
      is_group_appointment: false,
      group_id: null,
      client_name: draft.client_name,
      client_email: draft.client_email,
      client_phone: draft.client_phone,
      sms_reminder_enabled: false,
      sms_reminder_phone: null,
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    const slotIdx = slots.findIndex((s) => s.id === slot.id);
    if (slotIdx >= 0) {
      slots[slotIdx].is_booked = true;
      this._saveToStorage('therapist_availability_slots', slots);
    }

    this._saveCurrentBookingDraft(null);

    const next_steps = 'Your appointment is scheduled. You will receive a confirmation email with details and a link to reschedule if needed.';

    return { success: true, appointment, message: 'Appointment confirmed.', next_steps };
  }

  // setTherapistFavoriteStatus
  setTherapistFavoriteStatus(therapistId, is_favorite) {
    let favorites = this._getFromStorage('favorite_therapists', []);
    const now = this._nowIso();
    let favorite_entry = null;

    if (is_favorite) {
      favorite_entry = favorites.find((f) => f.therapist_id === therapistId) || null;
      if (!favorite_entry) {
        favorite_entry = {
          id: this._generateId('fav'),
          therapist_id: therapistId,
          addedAt: now
        };
        favorites.push(favorite_entry);
        this._saveToStorage('favorite_therapists', favorites);
      }
    } else {
      const beforeLen = favorites.length;
      favorites = favorites.filter((f) => f.therapist_id !== therapistId);
      if (favorites.length !== beforeLen) {
        this._saveToStorage('favorite_therapists', favorites);
      }
    }

    return { is_favorite, favorite_entry: is_favorite ? favorite_entry : null };
  }

  // getFavoriteTherapists
  getFavoriteTherapists() {
    const favorites = this._getFromStorage('favorite_therapists', []);
    const therapists = this._getFromStorage('therapists', []);
    return favorites.map((favorite) => {
      const therapist = therapists.find((t) => t.id === favorite.therapist_id) || null;
      return { favorite, therapist };
    });
  }

  // addTherapistToComparison
  addTherapistToComparison(therapistId) {
    const therapists = this._getFromStorage('therapists', []);
    const comparison = this._getOrCreateCurrentComparisonSet();

    if (comparison.therapist_ids.indexOf(therapistId) === -1) {
      comparison.therapist_ids.push(therapistId);
      comparison.updatedAt = this._nowIso();
      this._saveCurrentComparisonSet(comparison);
    }

    const therapistsInComparison = therapists.filter((t) => comparison.therapist_ids.indexOf(t.id) !== -1);

    return {
      comparison,
      therapists: therapistsInComparison
    };
  }

  // removeTherapistFromComparison
  removeTherapistFromComparison(therapistId) {
    const therapists = this._getFromStorage('therapists', []);
    const comparison = this._getOrCreateCurrentComparisonSet();

    const idx = comparison.therapist_ids.indexOf(therapistId);
    if (idx !== -1) {
      comparison.therapist_ids.splice(idx, 1);
      comparison.updatedAt = this._nowIso();
      if (comparison.primary_therapist_id === therapistId) {
        delete comparison.primary_therapist_id;
      }
      this._saveCurrentComparisonSet(comparison);
    }

    const therapistsInComparison = therapists.filter((t) => comparison.therapist_ids.indexOf(t.id) !== -1);

    return {
      comparison,
      therapists: therapistsInComparison
    };
  }

  // getCurrentTherapistComparison
  getCurrentTherapistComparison() {
    const comparison = this._getOrCreateCurrentComparisonSet();
    const therapists = this._getFromStorage('therapists', []);
    const favorites = this._getFromStorage('favorite_therapists', []);

    const entries = (comparison.therapist_ids || []).map((id) => {
      const therapist = therapists.find((t) => t.id === id) || null;
      const services = (therapist && therapist.services_offered) || [];
      const offers_individual_and_group = services.indexOf('individual_therapy') !== -1 && services.indexOf('group_therapy') !== -1;
      const standard_session_fee = therapist && typeof therapist.standard_session_fee === 'number' ? therapist.standard_session_fee : null;
      const consultation_free_15_minutes = !!(
        therapist && therapist.consultation_offered && therapist.consultation_is_free && therapist.consultation_duration_minutes >= 15
      );
      const accepts_out_of_network_benefits = !!(therapist && therapist.accepts_out_of_network_benefits);
      const is_favorite = favorites.some((f) => f.therapist_id === id);

      return {
        therapist,
        offers_individual_and_group,
        standard_session_fee,
        consultation_free_15_minutes,
        accepts_out_of_network_benefits,
        is_favorite
      };
    });

    return {
      comparison,
      entries,
      primary_therapist_id: comparison.primary_therapist_id || null
    };
  }

  // setComparisonPrimaryTherapist
  setComparisonPrimaryTherapist(therapistId) {
    const comparison = this._getOrCreateCurrentComparisonSet();
    if (comparison.therapist_ids.indexOf(therapistId) === -1) {
      // therapist not in comparison; return current state
      return { comparison, primary_therapist_id: comparison.primary_therapist_id || null };
    }
    comparison.primary_therapist_id = therapistId;
    comparison.updatedAt = this._nowIso();
    this._saveCurrentComparisonSet(comparison);
    return { comparison, primary_therapist_id: therapistId };
  }

  // createTherapistComparisonFromFavorites
  createTherapistComparisonFromFavorites(therapistIds) {
    therapistIds = therapistIds || [];
    const therapists = this._getFromStorage('therapists', []);

    const comparison = {
      id: this._generateId('cmp'),
      therapist_ids: therapistIds.slice(),
      title: null,
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    this._saveCurrentComparisonSet(comparison);

    const therapistsInComparison = therapists.filter((t) => comparison.therapist_ids.indexOf(t.id) !== -1);

    return {
      comparison,
      therapists: therapistsInComparison
    };
  }

  // startIntakeForm
  startIntakeForm(therapistId) {
    const intake_form = this._getOrCreateIntakeFormForTherapist(therapistId);
    const steps = [
      { step_number: 1, title: 'Your details', description: 'Tell us how to contact you.' },
      { step_number: 2, title: 'What brings you to therapy', description: 'Share your concerns and goals.' },
      { step_number: 3, title: 'Background and preferences', description: 'Any additional context you want us to know.' }
    ];
    return { intake_form, steps };
  }

  // updateIntakeFormStep
  updateIntakeFormStep(intakeFormId, step_number, fields) {
    const forms = this._getFromStorage('intake_form_submissions', []);
    const idx = forms.findIndex((f) => f.id === intakeFormId);
    if (idx === -1) {
      return { intake_form: null, next_step_number: step_number };
    }
    const form = forms[idx];

    const allowedKeys = [
      'client_full_name',
      'client_email',
      'client_phone',
      'preferred_contact_method',
      'services_of_interest',
      'presenting_concerns',
      'goals_for_therapy',
      'additional_details'
    ];
    allowedKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        form[key] = fields[key];
      }
    });

    const nextStep = step_number + 1;
    if (typeof form.current_step !== 'number' || nextStep > form.current_step) {
      form.current_step = nextStep;
    }
    form.updatedAt = this._nowIso();

    forms[idx] = form;
    this._saveToStorage('intake_form_submissions', forms);

    return { intake_form: form, next_step_number: form.current_step };
  }

  // submitIntakeForm
  submitIntakeForm(intakeFormId) {
    const forms = this._getFromStorage('intake_form_submissions', []);
    const idx = forms.findIndex((f) => f.id === intakeFormId);
    if (idx === -1) {
      return { success: false, intake_form: null, message: 'Intake form not found.', next_steps: '' };
    }
    const form = forms[idx];
    form.status = 'submitted';
    form.updatedAt = this._nowIso();
    forms[idx] = form;
    this._saveToStorage('intake_form_submissions', forms);

    const next_steps = 'Your therapist will review your intake and reach out with next steps.';

    return { success: true, intake_form: form, message: 'Intake form submitted.', next_steps };
  }

  // getIntakeFormState
  getIntakeFormState(intakeFormId) {
    const forms = this._getFromStorage('intake_form_submissions', []);
    let intake_form = forms.find((f) => f.id === intakeFormId) || null;
    if (!intake_form) {
      return { intake_form: null };
    }
    const therapists = this._getFromStorage('therapists', []);
    const therapist = therapists.find((t) => t.id === intake_form.therapist_id) || null;
    intake_form = Object.assign({}, intake_form, { therapist });
    return { intake_form };
  }

  // getGroupFilterOptions
  getGroupFilterOptions() {
    const groups = this._getFromStorage('groups', []);

    const groupTypeSet = new Set();
    const topicSet = new Set();
    const timeOfDaySet = new Set();
    let minPrice = null;
    let maxPrice = null;

    groups.forEach((g) => {
      if (g.group_type) groupTypeSet.add(g.group_type);
      if (g.topic) topicSet.add(g.topic);
      if (g.time_of_day) timeOfDaySet.add(g.time_of_day);
      if (typeof g.price_per_session === 'number') {
        if (minPrice === null || g.price_per_session < minPrice) minPrice = g.price_per_session;
        if (maxPrice === null || g.price_per_session > maxPrice) maxPrice = g.price_per_session;
      }
    });

    const group_types = Array.from(groupTypeSet);
    const topics = Array.from(topicSet);
    const time_of_day_options = Array.from(timeOfDaySet);

    const price_range = {
      min_price_per_session: minPrice !== null ? minPrice : 0,
      max_price_per_session: maxPrice !== null ? maxPrice : 0
    };

    const session_count_options = ['single_session', '4_sessions', '6_plus_sessions'];

    const sort_options = [
      { key: 'start_date_asc', label: 'Start date: Soonest' },
      { key: 'most_popular', label: 'Most popular' }
    ];

    return {
      group_types,
      topics,
      time_of_day_options,
      price_range,
      session_count_options,
      sort_options
    };
  }

  // searchGroups
  searchGroups(filters, sort_by) {
    filters = filters || {};
    sort_by = sort_by || null;
    const groups = this._getFromStorage('groups', []);

    const fromDate = filters.date_from ? this._parseDate(filters.date_from) : null;
    const toDate = filters.date_to ? this._parseDate(filters.date_to) : null;

    let results = groups.filter((g) => {
      if (filters.group_type && g.group_type !== filters.group_type) return false;
      if (filters.topic && g.topic !== filters.topic) return false;

      const startDate = this._parseDate(g.start_date);
      if (fromDate && (!startDate || startDate < fromDate)) return false;
      if (toDate && (!startDate || startDate > toDate)) return false;

      if (typeof filters.price_per_session_max === 'number') {
        if (typeof g.price_per_session !== 'number' || g.price_per_session > filters.price_per_session_max) return false;
      }

      if (filters.time_of_day && g.time_of_day && g.time_of_day !== filters.time_of_day) return false;

      if (typeof filters.sessions_count_min === 'number') {
        if (typeof g.sessions_count !== 'number' || g.sessions_count < filters.sessions_count_min) return false;
      }

      if (filters.location_zip) {
        if (!g.location_zip || g.location_zip !== filters.location_zip) {
          if (filters.location_radius_miles && filters.location_radius_miles <= 5) {
            return false;
          }
        }
      }

      return true;
    });

    if (sort_by === 'start_date_asc') {
      results.sort((a, b) => {
        const da = this._parseDate(a.start_date);
        const db = this._parseDate(b.start_date);
        const ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
        const tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
      });
    }

    return results;
  }

  // getGroupDetail
  getGroupDetail(groupId) {
    const groups = this._getFromStorage('groups', []);
    const therapists = this._getFromStorage('therapists', []);
    const group = groups.find((g) => g.id === groupId) || null;
    if (!group) {
      return { group: null, schedule_summary: '', pricing_summary: '', faqs: [] };
    }

    const facilitator_therapists = (group.facilitator_therapist_ids || []).map((id) => therapists.find((t) => t.id === id) || null);

    const start = this._parseDate(group.start_date);
    const end = this._parseDate(group.end_date);
    let schedule_summary = '';
    if (start) {
      schedule_summary = 'Starts ' + start.toDateString();
      if (end) {
        schedule_summary += ', ends ' + end.toDateString();
      }
      if (group.days_of_week && group.days_of_week.length) {
        schedule_summary += ' on ' + group.days_of_week.join(', ');
      }
      if (group.session_time_start) {
        schedule_summary += ' at ' + group.session_time_start;
      }
    }

    let pricing_summary = '';
    if (typeof group.price_per_session === 'number') {
      pricing_summary = '$' + group.price_per_session + ' per session';
      if (typeof group.sessions_count === 'number') {
        pricing_summary += ' for ' + group.sessions_count + ' sessions';
      }
      if (group.total_price) {
        pricing_summary += ' (total $' + group.total_price + ')';
      }
    }

    const faqs = [];

    const groupWithFacilitators = Object.assign({}, group, {
      facilitator_therapists
    });

    return { group: groupWithFacilitators, schedule_summary, pricing_summary, faqs };
  }

  // createGroupRegistration
  createGroupRegistration(groupId, participant_name, participant_email, participant_phone, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const groups = this._getFromStorage('groups', []);
    const registrations = this._getFromStorage('group_registrations', []);

    const group = groups.find((g) => g.id === groupId) || null;
    if (!group) {
      return { registration: null, group: null, message: 'Group not found.', next_steps: '' };
    }

    let total_cost = null;
    if (typeof group.price_per_session === 'number' && typeof group.sessions_count === 'number') {
      total_cost = group.price_per_session * group.sessions_count * quantity;
    } else if (typeof group.total_price === 'number') {
      total_cost = group.total_price * quantity;
    }

    const registration = {
      id: this._generateId('grpreg'),
      group_id: groupId,
      participant_name,
      participant_email,
      participant_phone: participant_phone || null,
      quantity,
      total_cost,
      currency: group.currency || 'usd',
      status: 'reserved',
      registeredAt: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('group_registrations', registrations);

    const message = 'Your spot has been reserved.';
    const next_steps = 'You will receive an email with group details and payment instructions.';

    return { registration, group, message, next_steps };
  }

  // getServicePricingConfig
  getServicePricingConfig() {
    return this._getFromStorage('service_pricings', []);
  }

  // calculateMonthlyCostEstimate
  calculateMonthlyCostEstimate(individual_sessions_per_month, couples_sessions_per_month, group_sessions_per_month, budget_cap) {
    const pricing = this._getFromStorage('service_pricings', []);

    const getFee = (serviceType) => {
      const sp = pricing.find((p) => p.service_type === serviceType);
      return sp ? sp.standard_fee_per_session : 0;
    };

    const individualCount = individual_sessions_per_month || 0;
    const couplesCount = couples_sessions_per_month || 0;
    const groupCount = group_sessions_per_month || 0;

    const individualFee = getFee('individual_therapy');
    const couplesFee = getFee('couples_therapy');
    const groupFee = getFee('group_therapy');

    const line_items = [];
    if (individualCount > 0 && individualFee > 0) {
      line_items.push({
        service_type: 'individual_therapy',
        sessions_per_month: individualCount,
        fee_per_session: individualFee,
        subtotal: individualCount * individualFee
      });
    }
    if (couplesCount > 0 && couplesFee > 0) {
      line_items.push({
        service_type: 'couples_therapy',
        sessions_per_month: couplesCount,
        fee_per_session: couplesFee,
        subtotal: couplesCount * couplesFee
      });
    }
    if (groupCount > 0 && groupFee > 0) {
      line_items.push({
        service_type: 'group_therapy',
        sessions_per_month: groupCount,
        fee_per_session: groupFee,
        subtotal: groupCount * groupFee
      });
    }

    const monthly_total =
      individualCount * individualFee + couplesCount * couplesFee + groupCount * groupFee;
    const currency = (pricing[0] && pricing[0].currency) || 'usd';

    const within_budget = typeof budget_cap === 'number' ? monthly_total <= budget_cap : true;

    return {
      monthly_total,
      currency,
      within_budget,
      line_items
    };
  }

  // saveCostPlan
  saveCostPlan(name, individual_sessions_per_month, couples_sessions_per_month, group_sessions_per_month) {
    const config = {
      individual_sessions_per_month: individual_sessions_per_month || 0,
      couples_sessions_per_month: couples_sessions_per_month || 0,
      group_sessions_per_month: group_sessions_per_month || 0
    };
    const totals = this._recalculateCostPlanTotal(config);

    const plans = this._getFromStorage('cost_plans', []);

    const cost_plan = {
      id: this._generateId('costplan'),
      name,
      individual_sessions_per_month: config.individual_sessions_per_month,
      couples_sessions_per_month: config.couples_sessions_per_month,
      group_sessions_per_month: config.group_sessions_per_month,
      monthly_total: totals.monthly_total,
      currency: totals.currency,
      notes: null,
      createdAt: this._nowIso(),
      updatedAt: null
    };

    plans.push(cost_plan);
    this._saveToStorage('cost_plans', plans);

    return { cost_plan };
  }

  // getSavedCostPlans
  getSavedCostPlans() {
    return this._getFromStorage('cost_plans', []);
  }

  // getArticleFilterOptions
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []);

    const contentTypeSet = new Set();
    const readingTimeCategorySet = new Set();
    const topicSet = new Set();

    articles.forEach((a) => {
      if (a.content_type) contentTypeSet.add(a.content_type);
      if (a.reading_time_category) readingTimeCategorySet.add(a.reading_time_category);
      (a.topics || []).forEach((t) => topicSet.add(t));
    });

    const content_types = Array.from(contentTypeSet).map((key) => ({ key, label: this._labelFromKey(key) }));
    const reading_time_categories = Array.from(readingTimeCategorySet).map((key) => ({
      key,
      label: this._labelFromKey(key)
    }));
    const topics = Array.from(topicSet);

    return {
      content_types,
      reading_time_categories,
      topics
    };
  }

  // searchArticles
  searchArticles(query, filters, page, page_size) {
    filters = filters || {};
    page = page || 1;
    page_size = page_size || 20;

    const articles = this._getFromStorage('articles', []);
    const q = (query || '').trim().toLowerCase();

    let results = articles.filter((a) => {
      if (q) {
        const haystackParts = [a.title, a.subtitle, a.content];
        const haystack = haystackParts
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);
        const matchesAllTokens = tokens.every((token) => haystack.indexOf(token) !== -1);
        if (!matchesAllTokens) return false;
      }

      if (filters.content_types && filters.content_types.length) {
        if (filters.content_types.indexOf(a.content_type) === -1) return false;
      }

      if (filters.reading_time_category) {
        if (a.reading_time_category !== filters.reading_time_category) return false;
      }

      if (filters.topics && filters.topics.length) {
        const articleTopics = a.topics || [];
        const matches = filters.topics.some((t) => articleTopics.indexOf(t) !== -1);
        if (!matches) return false;
      }

      return true;
    });

    const total_results = results.length;
    const total_pages = total_results === 0 ? 0 : Math.ceil(total_results / page_size);
    const startIndex = (page - 1) * page_size;
    results = results.slice(startIndex, startIndex + page_size);

    return {
      results,
      pagination: {
        page,
        page_size,
        total_results,
        total_pages
      }
    };
  }

  // getArticleDetail
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const readingList = this._getFromStorage('reading_list_items', []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { article: null, is_in_reading_list: false };
    }
    const is_in_reading_list = readingList.some((r) => r.article_id === articleId);
    return { article, is_in_reading_list };
  }

  // toggleReadingListItem
  toggleReadingListItem(articleId, save) {
    let items = this._getFromStorage('reading_list_items', []);
    let reading_list_item = null;
    if (save) {
      reading_list_item = items.find((i) => i.article_id === articleId) || null;
      if (!reading_list_item) {
        reading_list_item = {
          id: this._generateId('rli'),
          article_id: articleId,
          addedAt: this._nowIso()
        };
        items.push(reading_list_item);
        this._saveToStorage('reading_list_items', items);
      }
      return { is_saved: true, reading_list_item };
    } else {
      const beforeLen = items.length;
      items = items.filter((i) => i.article_id !== articleId);
      if (items.length !== beforeLen) {
        this._saveToStorage('reading_list_items', items);
      }
      return { is_saved: false, reading_list_item: null };
    }
  }

  // getReadingList
  getReadingList() {
    const items = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);
    return items.map((reading_list_item) => {
      const article = articles.find((a) => a.id === reading_list_item.article_id) || null;
      return { reading_list_item, article };
    });
  }

  // getRelatedArticles
  getRelatedArticles(articleId, max_results) {
    max_results = typeof max_results === 'number' ? max_results : 5;
    const articles = this._getFromStorage('articles', []);
    const current = articles.find((a) => a.id === articleId) || null;
    if (!current) return [];
    const currentTopics = current.topics || [];

    const scored = articles
      .filter((a) => a.id !== articleId)
      .map((a) => {
        const topics = a.topics || [];
        const overlap = topics.filter((t) => currentTopics.indexOf(t) !== -1).length;
        return { article: a, score: overlap };
      })
      .sort((x, y) => {
        if (x.score === y.score) return 0;
        return x.score > y.score ? -1 : 1;
      });

    return scored.slice(0, max_results).map((s) => s.article);
  }

  // createOrUpdateNewsletterSubscription
  createOrUpdateNewsletterSubscription(email, name, topics, frequency) {
    topics = topics || [];
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    let subscription = subs.find((s) => s.email === email) || null;
    if (!subscription) {
      subscription = {
        id: this._generateId('nls'),
        email,
        name: name || null,
        topics,
        frequency,
        subscribedAt: this._nowIso(),
        is_active: true
      };
      subs.push(subscription);
    } else {
      subscription.name = name || subscription.name;
      subscription.topics = topics;
      subscription.frequency = frequency;
      subscription.is_active = true;
      const idx = subs.findIndex((s) => s.id === subscription.id);
      subs[idx] = subscription;
    }
    this._saveToStorage('newsletter_subscriptions', subs);
    return { subscription };
  }

  // submitTherapistContactRequest
  submitTherapistContactRequest(therapistId, name, email, phone, preferred_datetime, preferred_contact_method, message) {
    const requests = this._getFromStorage('contact_requests', []);

    const request = {
      id: this._generateId('creq'),
      therapist_id: therapistId,
      name,
      email,
      phone: phone || null,
      preferred_datetime: preferred_datetime || null,
      message: message || null,
      preferred_contact_method: preferred_contact_method || null,
      status: 'new',
      createdAt: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('contact_requests', requests);

    return { contact_request: request, message: 'Your message has been sent to the therapist.' };
  }

  // getClientDashboardOverview
  getClientDashboardOverview() {
    return this._loadClientDashboardState();
  }

  // getAppointmentDetails
  getAppointmentDetails(appointmentId) {
    const appointments = this._getFromStorage('appointments', []);
    const therapists = this._getFromStorage('therapists', []);
    const appointment = appointments.find((a) => a.id === appointmentId) || null;
    if (!appointment) {
      return { appointment: null, therapist: null };
    }
    const therapist = therapists.find((t) => t.id === appointment.therapist_id) || null;
    return { appointment, therapist };
  }

  // getReschedulableSlotsForAppointment
  getReschedulableSlotsForAppointment(appointmentId, date_from, date_to) {
    const appointments = this._getFromStorage('appointments', []);
    const slots = this._getFromStorage('therapist_availability_slots', []);
    const therapists = this._getFromStorage('therapists', []);

    const appointment = appointments.find((a) => a.id === appointmentId) || null;
    if (!appointment) return [];

    const therapist = therapists.find((t) => t.id === appointment.therapist_id) || null;

    const fromDate = this._parseDate(date_from);
    const toDate = this._parseDate(date_to);

    return slots
      .filter((s) => {
        if (s.therapist_id !== appointment.therapist_id) return false;
        if (s.id === appointment.availability_slot_id) return false;
        if (s.is_booked) return false;
        const start = this._parseDate(s.start_datetime);
        if (!start) return false;
        if (fromDate && start < fromDate) return false;
        if (toDate && start > toDate) return false;
        return true;
      })
      .map((s) => Object.assign({}, s, { therapist }));
  }

  // rescheduleAppointment
  rescheduleAppointment(appointmentId, newAvailabilitySlotId) {
    const appointments = this._getFromStorage('appointments', []);
    const slots = this._getFromStorage('therapist_availability_slots', []);

    const apptIdx = appointments.findIndex((a) => a.id === appointmentId);
    if (apptIdx === -1) {
      return { appointment: null, message: 'Appointment not found.' };
    }

    const appointment = appointments[apptIdx];
    const newSlot = slots.find((s) => s.id === newAvailabilitySlotId) || null;
    if (!newSlot) {
      return { appointment: null, message: 'New availability slot not found.' };
    }
    if (newSlot.is_booked) {
      return { appointment: null, message: 'Selected slot is already booked.' };
    }
    if (newSlot.therapist_id !== appointment.therapist_id) {
      return { appointment: null, message: 'New slot must be with the same therapist.' };
    }

    const oldSlotIdx = slots.findIndex((s) => s.id === appointment.availability_slot_id);
    if (oldSlotIdx >= 0) {
      slots[oldSlotIdx].is_booked = false;
    }

    const newSlotIdx = slots.findIndex((s) => s.id === newSlot.id);
    if (newSlotIdx >= 0) {
      slots[newSlotIdx].is_booked = true;
    }

    this._saveToStorage('therapist_availability_slots', slots);

    // Instrumentation for task completion tracking (task_8)
    try {
      localStorage.setItem(
        'task8_rescheduleSnapshot',
        JSON.stringify({
          "appointment_id": appointment.id,
          "therapist_id": appointment.therapist_id,
          "original_availability_slot_id": appointment.availability_slot_id,
          "original_start_datetime": appointment.start_datetime,
          "original_end_datetime": appointment.end_datetime,
          "new_availability_slot_id": newSlot.id,
          "new_start_datetime": newSlot.start_datetime,
          "new_end_datetime": newSlot.end_datetime,
          "rescheduledAt": this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    appointment.availability_slot_id = newSlot.id;
    appointment.start_datetime = newSlot.start_datetime;
    appointment.end_datetime = newSlot.end_datetime;
    appointment.session_length_minutes = newSlot.session_length_minutes;
    appointment.session_type = newSlot.session_type;
    appointment.updatedAt = this._nowIso();

    appointments[apptIdx] = appointment;
    this._saveToStorage('appointments', appointments);

    return { appointment, message: 'Appointment rescheduled.' };
  }

  // updateAppointmentNotifications
  updateAppointmentNotifications(appointmentId, sms_reminder_enabled, sms_reminder_phone) {
    const appointments = this._getFromStorage('appointments', []);
    const idx = appointments.findIndex((a) => a.id === appointmentId);
    if (idx === -1) {
      return { appointment: null };
    }
    const appointment = appointments[idx];
    appointment.sms_reminder_enabled = !!sms_reminder_enabled;
    if (sms_reminder_enabled) {
      appointment.sms_reminder_phone = sms_reminder_phone || appointment.sms_reminder_phone || null;
    }
    appointment.updatedAt = this._nowIso();
    appointments[idx] = appointment;
    this._saveToStorage('appointments', appointments);
    return { appointment };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return this._getFromStorage('about_page_content', {
      mission: '',
      values: [],
      therapeutic_orientation: '',
      privacy_and_ethics_summary: '',
      clinicians: []
    });
  }

  // getContactPageInfo
  getContactPageInfo() {
    return this._getFromStorage('contact_page_info', {
      email: '',
      phone: '',
      address: '',
      map_embed_enabled: false,
      directions_text: '',
      response_time_expectation: '',
      emergency_note: ''
    });
  }

  // submitGeneralContactRequest
  submitGeneralContactRequest(name, email, phone, message, preferred_contact_method) {
    const requests = this._getFromStorage('general_contact_requests', []);
    const req = {
      id: this._generateId('gcreq'),
      name,
      email,
      phone: phone || null,
      message,
      preferred_contact_method: preferred_contact_method || null,
      createdAt: this._nowIso()
    };
    requests.push(req);
    this._saveToStorage('general_contact_requests', requests);
    return { success: true, message: 'Your message has been sent.' };
  }

  // getPoliciesAndFaqs
  getPoliciesAndFaqs() {
    return this._getFromStorage('policies_and_faqs', {
      privacy_policy_html: '',
      terms_of_service_html: '',
      faqs: []
    });
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