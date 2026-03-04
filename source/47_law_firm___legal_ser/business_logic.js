// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'practice_areas',
      'services',
      'service_fee_estimates',
      'lawyers',
      'availability_slots',
      'consultation_bookings',
      'lawyer_shortlists',
      'articles',
      'reading_lists',
      'estate_document_templates',
      'estate_add_on_options',
      'estate_packages',
      'contact_inquiries',
      'offices',
      'office_directions',
      'legal_tools',
      'nda_drafts'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

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

  _findById(collectionKey, id) {
    const items = this._getFromStorage(collectionKey);
    return items.find((i) => i.id === id) || null;
  }

  // ----------------------
  // Helper functions (private)
  // ----------------------

  // Lawyer shortlist
  _getOrCreateLawyerShortlist() {
    const key = 'lawyer_shortlists';
    let shortlists = this._getFromStorage(key);
    if (shortlists.length > 0) {
      return shortlists[0];
    }
    const now = new Date().toISOString();
    const shortlist = {
      id: this._generateId('shortlist'),
      lawyer_ids: [],
      created_at: now,
      updated_at: now
    };
    shortlists.push(shortlist);
    this._saveToStorage(key, shortlists);
    return shortlist;
  }

  // Reading list
  _getOrCreateReadingList() {
    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    if (lists.length > 0) {
      return lists[0];
    }
    const now = new Date().toISOString();
    const readingList = {
      id: this._generateId('reading_list'),
      article_ids: [],
      created_at: now,
      updated_at: now
    };
    lists.push(readingList);
    this._saveToStorage(key, lists);
    return readingList;
  }

  // Estate package
  _getOrCreateEstatePackage() {
    const key = 'estate_packages';
    let packages = this._getFromStorage(key);
    let pkg = packages.find((p) => p.status === 'in_progress');
    if (pkg) {
      return pkg;
    }
    const now = new Date().toISOString();
    pkg = {
      id: this._generateId('estate_package'),
      client_type: 'individual',
      state: '',
      selected_document_ids: [],
      selected_add_on_ids: [],
      total_price: 0,
      currency: 'usd',
      status: 'in_progress',
      label: '',
      created_at: now,
      updated_at: now
    };
    packages.push(pkg);
    this._saveToStorage(key, packages);
    return pkg;
  }

  _calculateEstatePackageTotal(selected_document_ids, selected_add_on_ids) {
    const docs = this._getFromStorage('estate_document_templates');
    const addOns = this._getFromStorage('estate_add_on_options');

    const docTotal = (selected_document_ids || []).reduce((sum, id) => {
      const d = docs.find((doc) => doc.id === id);
      return sum + (d && typeof d.base_price === 'number' ? d.base_price : 0);
    }, 0);

    const addOnTotal = (selected_add_on_ids || []).reduce((sum, id) => {
      const a = addOns.find((opt) => opt.id === id);
      return sum + (a && typeof a.price === 'number' ? a.price : 0);
    }, 0);

    return docTotal + addOnTotal;
  }

  // Service fee estimate internal calculator
  _calculateServiceFeeEstimate(service, state, children_option, property_complexity, max_budget) {
    // Basic heuristic: start from base_price if available, else 1000
    let base = typeof service.base_price === 'number' && service.base_price > 0 ? service.base_price : 1000;

    let complexityMultiplier = 1;
    if (property_complexity === 'contested_property') {
      complexityMultiplier = 1.25;
    } else if (property_complexity === 'complex_property') {
      complexityMultiplier = 1.5;
    }

    let childrenMultiplier = 1;
    if (children_option === 'with_minor_children') {
      childrenMultiplier = 1.2;
    }

    const estimated = Math.round(base * complexityMultiplier * childrenMultiplier);
    const within_budget = typeof max_budget === 'number' ? estimated <= max_budget : true;

    return {
      estimated_fee: estimated,
      within_budget
    };
  }

  // NDA draft
  _getOrCreateNdaDraft() {
    const key = 'nda_drafts';
    let drafts = this._getFromStorage(key);
    if (drafts.length > 0) {
      return drafts[0];
    }
    const now = new Date().toISOString();
    const draft = {
      id: this._generateId('nda_draft'),
      nda_type: 'mutual_nda',
      party_1_name: '',
      party_2_name: '',
      governing_law_state: '',
      term_years: 1,
      include_non_solicitation_clause: false,
      generated_preview_html: '',
      created_at: now,
      last_updated_at: now
    };
    drafts.push(draft);
    this._saveToStorage(key, drafts);
    return draft;
  }

  // Reserve an availability slot atomically
  _reserveAvailabilitySlot(availability_slot_id) {
    let slots = this._getFromStorage('availability_slots');
    const idx = slots.findIndex((s) => s.id === availability_slot_id);
    if (idx === -1) {
      return { success: false, message: 'Selected time slot is no longer available.', slot: null };
    }
    const slot = slots[idx];
    if (slot.status !== 'available') {
      return { success: false, message: 'Selected time slot is already booked or blocked.', slot: null };
    }
    const current = typeof slot.current_bookings === 'number' ? slot.current_bookings : 0;
    const max = typeof slot.max_bookings === 'number' ? slot.max_bookings : 1;
    if (current >= max) {
      slot.status = 'booked';
      slots[idx] = slot;
      this._saveToStorage('availability_slots', slots);
      return { success: false, message: 'Selected time slot has just been booked.', slot: null };
    }

    slot.current_bookings = current + 1;
    if (slot.current_bookings >= max) {
      slot.status = 'booked';
    }
    slots[idx] = slot;
    this._saveToStorage('availability_slots', slots);
    return { success: true, message: 'Time slot reserved.', slot };
  }

  // Geocode & distance (very simplified; uses lat/lng if available)
  _geocodeOriginAndComputeDistances(origin_input) {
    const offices = this._getFromStorage('offices');

    let originLat = null;
    let originLng = null;

    // If origin_input looks like "lat,lng" use that; otherwise we fall back
    if (typeof origin_input === 'string' && origin_input.includes(',')) {
      const parts = origin_input.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        originLat = parts[0];
        originLng = parts[1];
      }
    }

    const toRad = (val) => (val * Math.PI) / 180;

    const updated = offices.map((office) => {
      let distance = office.distance_miles || null;
      if (originLat != null && originLng != null && typeof office.latitude === 'number' && typeof office.longitude === 'number') {
        const R = 3958.8; // miles
        const dLat = toRad(office.latitude - originLat);
        const dLon = toRad(office.longitude - originLng);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(originLat)) *
            Math.cos(toRad(office.latitude)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = R * c;
      }
      return { ...office, distance_miles: distance };
    });

    this._saveToStorage('offices', updated);
    return updated;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // 1) Homepage overview
  getHomeOverview() {
    const practiceAreas = this._getFromStorage('practice_areas').filter((p) => p.is_active);
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const legalTools = this._getFromStorage('legal_tools').filter((t) => t.is_active);

    const featured_practice_areas = practiceAreas.slice(0, 4);
    const featured_services = services.slice(0, 4);
    const featured_legal_tools = legalTools.slice(0, 3);

    const headline_message = 'Trusted legal guidance for families, businesses, and individuals.';

    const supporting_messages = [
      {
        id: 'experienced_attorneys',
        title: 'Experienced attorneys, practical advice',
        body: 'Connect with lawyers who focus on Family Law, Employment Law, Estate Planning, Business Law, and Landlord-Tenant matters.'
      },
      {
        id: 'transparent_pricing',
        title: 'Transparent pricing tools',
        body: 'Use our fee calculators and planning tools to understand costs before you commit.'
      },
      {
        id: 'convenient_consultations',
        title: 'Convenient consultations',
        body: 'Schedule phone, video, or in-person consultations on a schedule that works for you.'
      }
    ];

    return {
      featured_practice_areas,
      featured_services,
      featured_legal_tools,
      headline_message,
      supporting_messages
    };
  }

  // 2) Practice Areas overview
  getPracticeAreasOverview() {
    const practiceAreas = this._getFromStorage('practice_areas').filter((p) => p.is_active);
    return practiceAreas;
  }

  // 3) Practice Area detail
  getPracticeAreaDetail(practice_area_key) {
    const practiceAreas = this._getFromStorage('practice_areas');
    const services = this._getFromStorage('services');

    const practice_area =
      practiceAreas.find((p) => p.key === practice_area_key && p.is_active) || null;

    const relatedServices = services.filter(
      (s) => s.practice_area_key === practice_area_key && s.is_active
    );

    let recommended_cta_label = 'Schedule a Consultation';
    switch (practice_area_key) {
      case 'estate_planning':
        recommended_cta_label = 'Customize Your Estate Plan';
        break;
      case 'family_law':
        recommended_cta_label = 'Schedule a Family Law Consultation';
        break;
      case 'employment_law':
        recommended_cta_label = 'Talk to an Employment Lawyer';
        break;
      case 'business_law':
        recommended_cta_label = 'Meet with a Business Attorney';
        break;
      case 'landlord_tenant':
        recommended_cta_label = 'Get Landlord-Tenant Help';
        break;
      default:
        break;
    }

    return {
      practice_area,
      services: relatedServices,
      recommended_cta_label
    };
  }

  // 4) Service detail
  getServiceDetail(service_id) {
    const services = this._getFromStorage('services');
    const practiceAreas = this._getFromStorage('practice_areas');

    const service = services.find((s) => s.id === service_id) || null;

    let practice_area_name = '';
    if (service) {
      const pa = practiceAreas.find((p) => p.key === service.practice_area_key);
      practice_area_name = pa ? pa.name : '';
    }

    const related_services = service
      ? services.filter(
          (s) =>
            s.practice_area_key === service.practice_area_key &&
            s.id !== service_id &&
            s.is_active
        )
      : [];

    return {
      service,
      practice_area_name,
      related_services
    };
  }

  // 5) Service fee estimator config
  getServiceFeeEstimatorConfig(service_id) {
    const estimates = this._getFromStorage('service_fee_estimates').filter(
      (e) => e.service_id === service_id
    );
    const stateSet = new Set();
    estimates.forEach((e) => {
      if (e.state) stateSet.add(e.state);
    });
    let available_states = Array.from(stateSet);
    if (available_states.length === 0) {
      // Minimal fallback to keep the tool usable
      available_states = ['California', 'New York', 'Texas'];
    }

    const children_options = [
      { value: 'no_minor_children', label: 'No minor children' },
      { value: 'with_minor_children', label: 'With minor children' }
    ];

    const property_complexity_options = [
      { value: 'no_contested_property', label: 'No contested property' },
      { value: 'contested_property', label: 'Some contested property' },
      { value: 'complex_property', label: 'Complex property / assets' }
    ];

    return {
      supports_state_selection: true,
      available_states,
      supports_children_option: true,
      children_options,
      supports_property_complexity: true,
      property_complexity_options,
      currency: 'usd',
      min_budget: 0,
      max_budget: 100000
    };
  }

  // 6) Calculate service fee estimate
  calculateServiceFeeEstimate(
    service_id,
    state,
    children_option,
    property_complexity,
    max_budget
  ) {
    const services = this._getFromStorage('services');
    const service = services.find((s) => s.id === service_id);
    if (!service) {
      return {
        fee_estimate: null,
        message: 'Service not found.'
      };
    }

    const { estimated_fee, within_budget } = this._calculateServiceFeeEstimate(
      service,
      state,
      children_option,
      property_complexity,
      max_budget
    );

    const now = new Date().toISOString();
    const fee_estimate = {
      id: this._generateId('fee_estimate'),
      service_id,
      state,
      children_option: children_option || null,
      property_complexity: property_complexity || null,
      max_budget,
      estimated_fee,
      within_budget,
      currency: 'usd',
      created_at: now
    };

    const estimates = this._getFromStorage('service_fee_estimates');
    estimates.push(fee_estimate);
    this._saveToStorage('service_fee_estimates', estimates);

    const message = within_budget
      ? `Estimated fee is $${estimated_fee}, which is within your budget of $${max_budget}.`
      : `Estimated fee is $${estimated_fee}, which is above your budget of $${max_budget}.`;

    return {
      fee_estimate,
      message
    };
  }

  // 7) Lawyer search filters
  getLawyerSearchFilters(mode) {
    const practiceAreas = this._getFromStorage('practice_areas').filter((p) => p.is_active);
    const offices = this._getFromStorage('offices');
    const lawyers = this._getFromStorage('lawyers');
    const slots = this._getFromStorage('availability_slots');

    const consultationTypeSet = new Set();
    slots.forEach((s) => {
      if (s.consultation_type) consultationTypeSet.add(s.consultation_type);
    });
    const consultation_types = Array.from(consultationTypeSet);

    let hourly_min = null;
    let hourly_max = null;
    lawyers.forEach((l) => {
      if (typeof l.hourly_rate === 'number') {
        if (hourly_min === null || l.hourly_rate < hourly_min) hourly_min = l.hourly_rate;
        if (hourly_max === null || l.hourly_rate > hourly_max) hourly_max = l.hourly_rate;
      }
    });
    if (hourly_min === null) {
      hourly_min = 0;
      hourly_max = 0;
    }

    let rating_min = null;
    let rating_max = null;
    lawyers.forEach((l) => {
      if (typeof l.rating === 'number') {
        if (rating_min === null || l.rating < rating_min) rating_min = l.rating;
        if (rating_max === null || l.rating > rating_max) rating_max = l.rating;
      }
    });
    if (rating_min === null) {
      rating_min = 0;
      rating_max = 5;
    }

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'hourly_rate_asc', label: 'Hourly Rate: Low to High' },
      { value: 'hourly_rate_desc', label: 'Hourly Rate: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'experience_desc', label: 'Experience: Most to Least' }
    ];

    return {
      practice_areas: practiceAreas,
      offices,
      consultation_types,
      hourly_rate_range: { min: hourly_min, max: hourly_max },
      rating_range: { min: rating_min, max: rating_max },
      sort_options
    };
  }

  // 8) Search lawyers
  searchLawyers(
    practice_area_key,
    office_id,
    consultation_type,
    mode,
    max_hourly_rate,
    min_rating,
    require_free_consultation,
    min_free_consultation_minutes,
    sort_by
  ) {
    const lawyers = this._getFromStorage('lawyers');
    const offices = this._getFromStorage('offices');
    const slots = this._getFromStorage('availability_slots');

    const modeValue = mode || 'our_lawyers';
    const sortValue = sort_by || 'relevance';
    const requireFree = !!require_free_consultation;

    let filtered = lawyers.slice();

    if (practice_area_key) {
      filtered = filtered.filter((l) => Array.isArray(l.practice_areas) && l.practice_areas.includes(practice_area_key));
    }

    if (office_id) {
      filtered = filtered.filter((l) => l.primary_office_id === office_id);
    }

    if (consultation_type) {
      filtered = filtered.filter((l) => {
        if (Array.isArray(l.consultation_types) && l.consultation_types.length > 0) {
          return l.consultation_types.includes(consultation_type);
        }
        // Fallback: check availability slots
        return slots.some(
          (s) => s.lawyer_id === l.id && s.consultation_type === consultation_type
        );
      });
    }

    if (typeof max_hourly_rate === 'number') {
      filtered = filtered.filter(
        (l) => typeof l.hourly_rate === 'number' && l.hourly_rate <= max_hourly_rate
      );
    }

    if (typeof min_rating === 'number') {
      filtered = filtered.filter(
        (l) => typeof l.rating === 'number' && l.rating >= min_rating
      );
    }

    if (requireFree) {
      const minMinutes =
        typeof min_free_consultation_minutes === 'number'
          ? min_free_consultation_minutes
          : 0;
      filtered = filtered.filter((l) => {
        return slots.some((s) => {
          if (s.lawyer_id !== l.id) return false;
          if (!s.is_free) return false;
          if (consultation_type && s.consultation_type !== consultation_type) return false;
          if (typeof s.duration_minutes === 'number' && s.duration_minutes < minMinutes) return false;
          return s.status === 'available';
        });
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortValue === 'hourly_rate_asc') {
        return (a.hourly_rate || 0) - (b.hourly_rate || 0);
      }
      if (sortValue === 'hourly_rate_desc') {
        return (b.hourly_rate || 0) - (a.hourly_rate || 0);
      }
      if (sortValue === 'rating_desc') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortValue === 'experience_desc') {
        return (b.years_of_experience || 0) - (a.years_of_experience || 0);
      }
      // relevance: use display_order if available, then rating
      const aOrder = typeof a.display_order === 'number' ? a.display_order : 0;
      const bOrder = typeof b.display_order === 'number' ? b.display_order : 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.rating || 0) - (a.rating || 0);
    });

    const results = filtered.map((l) => {
      const office = offices.find((o) => o.id === l.primary_office_id) || null;
      const short_bio = l.bio ? String(l.bio).slice(0, 200) : '';
      return {
        lawyer_id: l.id,
        // foreign key resolution helper
        lawyer: l,
        full_name: l.full_name,
        primary_practice_areas: Array.isArray(l.practice_areas) ? l.practice_areas : [],
        primary_office_name: office ? office.name : '',
        primary_office_city: office ? office.city : '',
        primary_office_state: office ? office.state : '',
        hourly_rate: l.hourly_rate,
        rating: l.rating,
        num_reviews: l.num_reviews || 0,
        years_of_experience: l.years_of_experience,
        is_accepting_new_clients: !!l.is_accepting_new_clients,
        short_bio
      };
    });

    return {
      total_results: results.length,
      results,
      applied_filters: {
        practice_area_key: practice_area_key || null,
        office_id: office_id || null,
        consultation_type: consultation_type || null,
        mode: modeValue,
        max_hourly_rate: typeof max_hourly_rate === 'number' ? max_hourly_rate : null,
        min_rating: typeof min_rating === 'number' ? min_rating : null,
        require_free_consultation: requireFree,
        min_free_consultation_minutes:
          typeof min_free_consultation_minutes === 'number'
            ? min_free_consultation_minutes
            : null,
        sort_by: sortValue
      }
    };
  }

  // 9) Lawyer profile
  getLawyerProfile(lawyer_id) {
    const lawyers = this._getFromStorage('lawyers');
    const offices = this._getFromStorage('offices');

    const lawyer = lawyers.find((l) => l.id === lawyer_id);
    if (!lawyer) {
      return {
        lawyer_id: null,
        full_name: '',
        slug: '',
        profile_image_url: '',
        practice_areas: [],
        years_of_experience: 0,
        hourly_rate: 0,
        rating: 0,
        num_reviews: 0,
        is_accepting_new_clients: false,
        bio: '',
        specialties: [],
        consultation_types: [],
        min_consultation_length_minutes: 0,
        primary_office: null
      };
    }

    const office = offices.find((o) => o.id === lawyer.primary_office_id) || null;

    return {
      lawyer_id: lawyer.id,
      full_name: lawyer.full_name,
      slug: lawyer.slug || '',
      profile_image_url: lawyer.profile_image_url || '',
      practice_areas: Array.isArray(lawyer.practice_areas) ? lawyer.practice_areas : [],
      years_of_experience: lawyer.years_of_experience,
      hourly_rate: lawyer.hourly_rate,
      rating: lawyer.rating,
      num_reviews: lawyer.num_reviews || 0,
      is_accepting_new_clients: !!lawyer.is_accepting_new_clients,
      bio: lawyer.bio || '',
      specialties: Array.isArray(lawyer.specialties) ? lawyer.specialties : [],
      consultation_types: Array.isArray(lawyer.consultation_types)
        ? lawyer.consultation_types
        : [],
      min_consultation_length_minutes:
        lawyer.min_consultation_length_minutes || 0,
      primary_office: office
        ? {
            office_id: office.id,
            name: office.name,
            address_line1: office.address_line1,
            address_line2: office.address_line2 || '',
            city: office.city,
            state: office.state,
            zip: office.zip,
            phone: office.phone || '',
            email: office.email || ''
          }
        : null
    };
  }

  // 10) Lawyer availability
  getLawyerAvailability(lawyer_id, consultation_type, start_date, end_date) {
    const slots = this._getFromStorage('availability_slots');
    const lawyers = this._getFromStorage('lawyers');
    const lawyer = lawyers.find((l) => l.id === lawyer_id) || null;

    let filtered = slots.filter((s) => s.lawyer_id === lawyer_id);

    // Fallback: if this lawyer has no explicit availability slots, use all slots
    if (filtered.length === 0) {
      filtered = slots.slice();
    }

    if (consultation_type) {
      filtered = filtered.filter((s) => s.consultation_type === consultation_type);
    }

    if (start_date) {
      const start = new Date(start_date + 'T00:00:00Z').getTime();
      filtered = filtered.filter((s) => {
        const t = new Date(s.start_datetime).getTime();
        return t >= start;
      });
    }

    if (end_date) {
      const end = new Date(end_date + 'T23:59:59Z').getTime();
      filtered = filtered.filter((s) => {
        const t = new Date(s.start_datetime).getTime();
        return t <= end;
      });
    }

    // Typically we only want available slots
    filtered = filtered.filter((s) => s.status === 'available');

    // Attach foreign key resolution (lawyer)
    const result = filtered.map((s) => ({
      ...s,
      lawyer
    }));

    return result;
  }

  // 11) Create consultation booking
  createConsultationBooking(
    lawyer_id,
    availability_slot_id,
    consultation_type,
    client_full_name,
    client_email,
    client_phone,
    notes
  ) {
    const lawyers = this._getFromStorage('lawyers');
    const lawyer = lawyers.find((l) => l.id === lawyer_id);
    if (!lawyer) {
      return {
        booking: null,
        success: false,
        message: 'Lawyer not found.'
      };
    }

    const reserveResult = this._reserveAvailabilitySlot(availability_slot_id);
    if (!reserveResult.success || !reserveResult.slot) {
      return {
        booking: null,
        success: false,
        message: reserveResult.message
      };
    }

    const slot = reserveResult.slot;
    if (consultation_type && slot.consultation_type !== consultation_type) {
      return {
        booking: null,
        success: false,
        message: 'Selected time slot does not support the requested consultation type.'
      };
    }

    const now = new Date().toISOString();
    const booking = {
      id: this._generateId('consultation_booking'),
      lawyer_id,
      availability_slot_id,
      consultation_type: slot.consultation_type,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      client_full_name,
      client_email,
      client_phone,
      created_at: now,
      status: 'pending',
      notes: notes || ''
    };

    const bookings = this._getFromStorage('consultation_bookings');
    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    // Attach resolved foreign keys
    const resultBooking = {
      ...booking,
      lawyer,
      availability_slot: slot
    };

    return {
      booking: resultBooking,
      success: true,
      message: 'Your consultation request has been created.'
    };
  }

  // 12) Add lawyer to shortlist
  addLawyerToShortlist(lawyer_id) {
    const lawyers = this._getFromStorage('lawyers');
    const lawyer = lawyers.find((l) => l.id === lawyer_id);
    if (!lawyer) {
      return {
        shortlist: null,
        success: false,
        message: 'Lawyer not found.'
      };
    }

    const key = 'lawyer_shortlists';
    let shortlists = this._getFromStorage(key);
    let shortlist = this._getOrCreateLawyerShortlist();

    if (!shortlist.lawyer_ids.includes(lawyer_id)) {
      shortlist.lawyer_ids.push(lawyer_id);
      shortlist.updated_at = new Date().toISOString();
      shortlists = shortlists.map((s) => (s.id === shortlist.id ? shortlist : s));
      this._saveToStorage(key, shortlists);
    }

    return {
      shortlist,
      success: true,
      message: 'Lawyer added to shortlist.'
    };
  }

  // 13) Get lawyer shortlist
  getLawyerShortlist() {
    const shortlist = this._getOrCreateLawyerShortlist();
    const lawyers = this._getFromStorage('lawyers');
    const offices = this._getFromStorage('offices');

    const resultLawyers = shortlist.lawyer_ids
      .map((id) => lawyers.find((l) => l.id === id))
      .filter((l) => !!l)
      .map((l) => {
        const office = offices.find((o) => o.id === l.primary_office_id) || null;
        return {
          lawyer_id: l.id,
          full_name: l.full_name,
          primary_office_name: office ? office.name : '',
          primary_office_city: office ? office.city : '',
          primary_office_state: office ? office.state : '',
          practice_areas: Array.isArray(l.practice_areas) ? l.practice_areas : [],
          hourly_rate: l.hourly_rate,
          years_of_experience: l.years_of_experience,
          rating: l.rating
        };
      });

    return {
      shortlist_id: shortlist.id,
      lawyers: resultLawyers
    };
  }

  // 14) Article search filters
  getArticleSearchFilters() {
    const practiceAreas = this._getFromStorage('practice_areas').filter((p) => p.is_active);

    const content_types = ['articles', 'guides', 'faqs'];

    const time_ranges = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    const sort_options = [
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'oldest_first', label: 'Oldest First' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      topics: practiceAreas,
      content_types,
      time_ranges,
      sort_options
    };
  }

  // 15) Search articles
  searchArticles(query, topic, time_range, sort_order, content_type) {
    const articles = this._getFromStorage('articles');

    const q = query ? String(query).toLowerCase() : '';
    const timeRange = time_range || 'all_time';
    const sortOrder = sort_order || 'most_recent';
    const type = content_type || 'articles';

    const now = new Date();
    let cutoff = null;
    if (timeRange === 'last_30_days') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'last_12_months') {
      cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    let filtered = articles.slice();

    if (type) {
      filtered = filtered.filter((a) => a.content_type === type);
    }

    if (topic) {
      filtered = filtered.filter((a) => a.topic === topic);
    }

    if (q) {
      filtered = filtered.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const content = (a.content_html || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return (
          title.includes(q) ||
          summary.includes(q) ||
          content.includes(q) ||
          tags.includes(q)
        );
      });
    }

    if (cutoff) {
      filtered = filtered.filter((a) => {
        const d = new Date(a.publish_date);
        return d >= cutoff;
      });
    }

    filtered.sort((a, b) => {
      if (sortOrder === 'oldest_first') {
        return new Date(a.publish_date) - new Date(b.publish_date);
      }
      if (sortOrder === 'relevance' && q) {
        // simple relevance: title match > summary > content
        const score = (art) => {
          const title = (art.title || '').toLowerCase();
          const summary = (art.summary || '').toLowerCase();
          const content = (art.content_html || '').toLowerCase();
          let s = 0;
          if (title.includes(q)) s += 3;
          if (summary.includes(q)) s += 2;
          if (content.includes(q)) s += 1;
          return s;
        };
        return score(b) - score(a);
      }
      // default most_recent
      return new Date(b.publish_date) - new Date(a.publish_date);
    });

    return {
      total_results: filtered.length,
      results: filtered
    };
  }

  // 16) Article detail
  getArticleDetail(article_id) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getOrCreateReadingList();

    const article = articles.find((a) => a.id === article_id) || null;

    let related_articles = [];
    if (article) {
      related_articles = articles
        .filter((a) => a.id !== article.id && a.topic === article.topic)
        .sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date))
        .slice(0, 3);
    }

    const is_saved_to_reading_list = readingList.article_ids.includes(article_id);

    return {
      article,
      related_articles,
      is_saved_to_reading_list
    };
  }

  // 17) Save article to reading list
  saveArticleToReadingList(article_id) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === article_id);
    if (!article) {
      return {
        reading_list: null,
        success: false,
        message: 'Article not found.'
      };
    }

    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    let readingList = this._getOrCreateReadingList();

    if (!readingList.article_ids.includes(article_id)) {
      readingList.article_ids.push(article_id);
      readingList.updated_at = new Date().toISOString();
      lists = lists.map((l) => (l.id === readingList.id ? readingList : l));
      this._saveToStorage(key, lists);
    }

    return {
      reading_list: readingList,
      success: true,
      message: 'Article saved to your reading list.'
    };
  }

  // 18) Get reading list
  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const articles = this._getFromStorage('articles');

    const savedArticles = readingList.article_ids
      .map((id) => articles.find((a) => a.id === id))
      .filter((a) => !!a);

    return {
      reading_list_id: readingList.id,
      articles: savedArticles
    };
  }

  // 19) Estate package builder config
  getEstatePackageBuilderConfig() {
    const document_templates = this._getFromStorage('estate_document_templates').filter(
      (d) => d.is_active
    );
    const add_on_options = this._getFromStorage('estate_add_on_options').filter(
      (o) => o.is_active
    );

    const offices = this._getFromStorage('offices');
    const stateSet = new Set();
    offices.forEach((o) => {
      if (o.state) stateSet.add(o.state);
    });
    const supported_states = Array.from(stateSet);

    const supported_client_types = ['individual', 'couple'];

    return {
      document_templates,
      add_on_options,
      supported_client_types,
      supported_states,
      currency: 'usd'
    };
  }

  // 20) Create or update estate package
  createOrUpdateEstatePackage(
    client_type,
    state,
    selected_document_ids,
    selected_add_on_ids,
    max_budget
  ) {
    const validClientTypes = ['individual', 'couple'];
    const ct = validClientTypes.includes(client_type) ? client_type : 'individual';
    const docs = Array.isArray(selected_document_ids) ? selected_document_ids : [];
    const addOns = Array.isArray(selected_add_on_ids) ? selected_add_on_ids : [];

    let pkg = this._getOrCreateEstatePackage();
    const total = this._calculateEstatePackageTotal(docs, addOns);

    pkg.client_type = ct;
    pkg.state = state || '';
    pkg.selected_document_ids = docs;
    pkg.selected_add_on_ids = addOns;
    pkg.total_price = total;
    pkg.currency = pkg.currency || 'usd';
    pkg.status = pkg.status === 'saved' || pkg.status === 'submitted' ? pkg.status : 'in_progress';
    pkg.updated_at = new Date().toISOString();

    const packages = this._getFromStorage('estate_packages').map((p) =>
      p.id === pkg.id ? pkg : p
    );
    this._saveToStorage('estate_packages', packages);

    let within_budget = false;
    let budget_message = '';
    if (typeof max_budget === 'number') {
      within_budget = total <= max_budget;
      budget_message = within_budget
        ? `Your package total of $${total} is within your budget of $${max_budget}.`
        : `Your package total of $${total} exceeds your budget of $${max_budget}.`;
    }

    return {
      estate_package: pkg,
      within_budget,
      budget_message
    };
  }

  // 21) Get estate package summary
  getEstatePackageSummary() {
    const pkg = this._getOrCreateEstatePackage();
    const docs = this._getFromStorage('estate_document_templates');
    const addOns = this._getFromStorage('estate_add_on_options');

    const documents = pkg.selected_document_ids
      .map((id) => docs.find((d) => d.id === id))
      .filter((d) => !!d);

    const add_ons = (pkg.selected_add_on_ids || [])
      .map((id) => addOns.find((o) => o.id === id))
      .filter((o) => !!o);

    return {
      estate_package: pkg,
      documents,
      add_ons
    };
  }

  // 22) Finalize estate package quote
  finalizeEstatePackageQuote(label, submit) {
    let pkg = this._getOrCreateEstatePackage();
    const doSubmit = !!submit;

    if (label) {
      pkg.label = label;
    }
    pkg.status = doSubmit ? 'submitted' : 'saved';
    pkg.updated_at = new Date().toISOString();

    const packages = this._getFromStorage('estate_packages').map((p) =>
      p.id === pkg.id ? pkg : p
    );
    this._saveToStorage('estate_packages', packages);

    return {
      estate_package: pkg,
      success: true,
      message: doSubmit
        ? 'Your estate package quote has been submitted.'
        : 'Your estate package quote has been saved.'
    };
  }

  // 23) Contact form options
  getContactFormOptions() {
    const offices = this._getFromStorage('offices');
    const stateSet = new Set();
    offices.forEach((o) => {
      if (o.state) stateSet.add(o.state);
    });
    const states = Array.from(stateSet);

    const issue_types = [
      { value: 'landlord_tenant_dispute', label: 'Landlord-Tenant Dispute' },
      { value: 'family_law_matter', label: 'Family Law Matter' },
      { value: 'employment_law_issue', label: 'Employment Law Issue' },
      { value: 'estate_planning_question', label: 'Estate Planning Question' },
      { value: 'business_law_issue', label: 'Business Law Issue' },
      { value: 'other', label: 'Other' }
    ];

    const user_roles = [
      { value: 'tenant', label: 'Tenant' },
      { value: 'landlord', label: 'Landlord' },
      { value: 'employee', label: 'Employee' },
      { value: 'employer', label: 'Employer' },
      { value: 'individual', label: 'Individual' },
      { value: 'business', label: 'Business' },
      { value: 'other', label: 'Other' }
    ];

    const preferred_contact_methods = [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' }
    ];

    return {
      issue_types,
      user_roles,
      preferred_contact_methods,
      states
    };
  }

  // 24) Submit contact inquiry
  submitContactInquiry(
    type_of_issue,
    user_role,
    amount_in_dispute,
    state,
    full_name,
    email,
    phone,
    message,
    preferred_contact_method
  ) {
    const now = new Date().toISOString();

    const inquiry = {
      id: this._generateId('contact_inquiry'),
      type_of_issue,
      user_role,
      amount_in_dispute:
        typeof amount_in_dispute === 'number' ? amount_in_dispute : undefined,
      state,
      full_name,
      email,
      phone: phone || '',
      message,
      preferred_contact_method,
      created_at: now,
      status: 'received'
    };

    const inquiries = this._getFromStorage('contact_inquiries');
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      contact_inquiry: inquiry,
      success: true,
      confirmation_message:
        'Thank you for contacting us. A member of our team will review your inquiry and respond shortly.'
    };
  }

  // 25) Search offices
  searchOffices(origin_input, distance_radius_miles, has_weekend_hours, sort_by) {
    const radius = typeof distance_radius_miles === 'number' ? distance_radius_miles : null;
    const weekend = !!has_weekend_hours;
    const sortBy = sort_by || 'distance_nearest_first';

    let offices = this._geocodeOriginAndComputeDistances(origin_input);

    if (weekend) {
      offices = offices.filter((o) => o.has_weekend_hours);
    }

    if (radius != null) {
      offices = offices.filter(
        (o) => typeof o.distance_miles === 'number' && o.distance_miles <= radius
      );
    }

    if (sortBy === 'distance_nearest_first') {
      offices.sort((a, b) => {
        const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.MAX_VALUE;
        const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.MAX_VALUE;
        return da - db;
      });
    }

    return offices;
  }

  // 26) Office detail
  getOfficeDetail(office_id) {
    const office = this._findById('offices', office_id);
    return {
      office: office || null
    };
  }

  // 27) Office directions
  getOfficeDirections(office_id, origin_input) {
    const office = this._findById('offices', office_id);
    const now = new Date().toISOString();

    const route_instructions = [];
    if (office) {
      route_instructions.push(`Start at ${origin_input}.`);
      route_instructions.push(
        `Travel towards ${office.city}, ${office.state}.`
      );
      route_instructions.push(
        `Arrive at ${office.address_line1}$${office.address_line2 ? ', ' + office.address_line2 : ''}, ${office.city}, ${office.state} ${office.zip}.`.replace(
          '$',
          ''
        )
      );
    } else {
      route_instructions.push('Destination office not found.');
    }

    const printable_html = office
      ? `<html><body><h1>Directions to ${office.name}</h1><ol>${route_instructions
          .map((s) => `<li>${s}</li>`)
          .join('')}</ol></body></html>`
      : `<html><body><p>Office not found.</p></body></html>`;

    const directions = {
      id: this._generateId('office_directions'),
      office_id,
      origin_input,
      generated_at: now,
      route_instructions,
      printable_html
    };

    const list = this._getFromStorage('office_directions');
    list.push(directions);
    this._saveToStorage('office_directions', list);

    // Attach office resolution
    const office_directions = {
      ...directions,
      office: office || null
    };

    return {
      office_directions
    };
  }

  // 28) Legal tools overview
  getLegalToolsOverview() {
    const tools = this._getFromStorage('legal_tools').filter((t) => t.is_active);
    return tools;
  }

  // 29) NDA generator config
  getNdaGeneratorConfig() {
    const drafts = this._getFromStorage('nda_drafts');
    const offices = this._getFromStorage('offices');

    const stateSet = new Set();
    drafts.forEach((d) => {
      if (d.governing_law_state) stateSet.add(d.governing_law_state);
    });
    offices.forEach((o) => {
      if (o.state) stateSet.add(o.state);
    });

    const supported_states = Array.from(stateSet);

    const nda_types = [
      { value: 'mutual_nda', label: 'Mutual NDA (both parties disclose)' },
      { value: 'unilateral_nda', label: 'Unilateral NDA (one-way disclosure)' }
    ];

    const disclaimer_html =
      '<p>This NDA generator provides a general template for informational purposes only and does not constitute legal advice. You should consult with a licensed attorney before signing any legal agreement.</p>';

    return {
      nda_types,
      supported_states,
      default_term_years: 3,
      supports_non_solicitation_clause: true,
      disclaimer_html
    };
  }

  // 30) Create or update NDA draft
  createOrUpdateNdaDraft(
    nda_type,
    party_1_name,
    party_2_name,
    governing_law_state,
    term_years,
    include_non_solicitation_clause
  ) {
    const validTypes = ['mutual_nda', 'unilateral_nda'];
    const type = validTypes.includes(nda_type) ? nda_type : 'mutual_nda';

    let draft = this._getOrCreateNdaDraft();
    draft.nda_type = type;
    draft.party_1_name = party_1_name;
    draft.party_2_name = party_2_name;
    draft.governing_law_state = governing_law_state;
    draft.term_years = term_years;
    draft.include_non_solicitation_clause = !!include_non_solicitation_clause;

    const now = new Date().toISOString();
    draft.last_updated_at = now;
    if (!draft.created_at) draft.created_at = now;

    const nsClause = draft.include_non_solicitation_clause
      ? `<h3>Non-Solicitation</h3>
<p>During the term of this Agreement and for a period of ${draft.term_years} year(s) thereafter, neither party shall, directly or indirectly, solicit for employment any employee of the other party with whom they had contact in connection with this Agreement, without the other party's prior written consent.</p>`
      : '';

    const mutualText =
      draft.nda_type === 'mutual_nda'
        ? '<p>Each party expects to disclose certain confidential and proprietary information to the other for the Purpose, and both parties desire to protect the confidentiality of such information.</p>'
        : `<p>${draft.party_1_name} expects to disclose certain confidential and proprietary information to ${draft.party_2_name} for the Purpose, and desires to protect the confidentiality of such information.</p>`;

    draft.generated_preview_html = `
<html>
  <body>
    <h1>Non-Disclosure Agreement</h1>
    <p>This Non-Disclosure Agreement ("Agreement") is entered into between <strong>${draft.party_1_name}</strong> and <strong>${draft.party_2_name}</strong>.</p>

    <h3>1. Purpose</h3>
    ${mutualText}

    <h3>2. Confidential Information</h3>
    <p>"Confidential Information" means any non-public information disclosed by a party to the other, whether orally or in writing, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information.</p>

    <h3>3. Term</h3>
    <p>The obligations of confidentiality under this Agreement shall commence on the Effective Date and continue for a period of ${draft.term_years} year(s) after the last disclosure of Confidential Information.</p>

    <h3>4. Governing Law</h3>
    <p>This Agreement shall be governed by and construed in accordance with the laws of the State of ${draft.governing_law_state}.</p>

    ${nsClause}

    <h3>5. Miscellaneous</h3>
    <p>This is a preview generated by the NDA tool and does not constitute legal advice. The parties should consult with counsel before executing this Agreement.</p>
  </body>
</html>`;

    const drafts = this._getFromStorage('nda_drafts').map((d) =>
      d.id === draft.id ? draft : d
    );
    this._saveToStorage('nda_drafts', drafts);

    return {
      nda_draft: draft,
      success: true,
      message: 'NDA preview generated.'
    };
  }

  // 31) About page content
  getAboutPageContent() {
    const lawyers = this._getFromStorage('lawyers');
    const key_attorneys = lawyers.slice(0, 3).map((l) => ({
      lawyer_id: l.id,
      full_name: l.full_name,
      title: 'Attorney',
      practice_area_key: Array.isArray(l.practice_areas) && l.practice_areas.length > 0
        ? l.practice_areas[0]
        : ''
    }));

    const history_html =
      '<p>Our firm was founded with a focus on delivering practical, business-minded legal advice to individuals and organizations of all sizes. Over the years, we have expanded our practice to cover family law, employment law, estate planning, business law, and landlord-tenant matters.</p>';

    const mission_html =
      '<p>Our mission is to provide clear, responsive, and cost-effective legal services, empowering clients to make informed decisions at every stage of their matter.</p>';

    const values_html =
      '<ul><li>Client-centered service</li><li>Clear communication</li><li>Integrity and professionalism</li><li>Practical, results-oriented advice</li></ul>';

    const awards_html =
      '<p>Our attorneys have been recognized by various professional organizations and publications for their commitment to client service and legal excellence.</p>';

    const community_involvement_html =
      '<p>We support local organizations through pro bono work, community education, and sponsorship of events that promote access to justice.</p>';

    return {
      history_html,
      mission_html,
      values_html,
      awards_html,
      community_involvement_html,
      key_attorneys
    };
  }

  // 32) Privacy Policy content
  getPrivacyPolicyContent() {
    const last_updated = '2024-01-01';
    const content_html = `
<h1>Privacy Policy</h1>
<p>Your privacy is important to us. This Privacy Policy explains how we collect, use, and safeguard information when you use our website and legal tools.</p>
<h2>Information We Collect</h2>
<p>We collect information that you provide through contact forms, consultation bookings, document generators, and other interactive features. We may also collect limited technical information such as your browser type and pages visited.</p>
<h2>How We Use Information</h2>
<p>We use your information to respond to inquiries, provide legal services, improve our website, and comply with legal obligations.</p>
<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us through the Contact page.</p>`;

    return {
      last_updated,
      content_html
    };
  }

  // 33) Terms of Use content
  getTermsOfUseContent() {
    const last_updated = '2024-01-01';
    const content_html = `
<h1>Terms of Use</h1>
<p>By accessing or using this website, you agree to these Terms of Use.</p>
<h2>No Legal Advice</h2>
<p>The content on this site, including automated tools and resources, is provided for informational purposes only and does not constitute legal advice. Using this site does not create an attorney-client relationship.</p>
<h2>Use of Tools</h2>
<p>Any documents generated using our tools are templates and should be reviewed by a qualified attorney before use.</p>
<h2>Limitation of Liability</h2>
<p>To the fullest extent permitted by law, we disclaim all liability arising from your use of this site and its tools.</p>`;

    return {
      last_updated,
      content_html
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
