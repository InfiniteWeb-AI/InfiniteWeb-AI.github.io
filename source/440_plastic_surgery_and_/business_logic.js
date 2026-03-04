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

  // ===== Storage helpers =====

  _initStorage() {
    const keys = [
      'providers',
      'procedures',
      'treatments',
      'products',
      'appointment_slots',
      'appointments',
      'carts',
      'cart_items',
      'treatment_comparisons',
      'financing_plans',
      'financing_applications',
      'patient_profiles',
      'facilities',
      'postop_instructions',
      'surgery_plans',
      'gallery_cases',
      'favorite_cases',
      'articles',
      'reading_list_items',
      'contact_messages',
      'promotions'
    ];

    // Legacy/demo keys from skeleton (kept for compatibility, unused in core logic)
    keys.push('users');

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Pointers for singletons
    if (!localStorage.getItem('active_cart_id')) {
      localStorage.setItem('active_cart_id', '');
    }
    if (!localStorage.getItem('active_treatment_comparison_id')) {
      localStorage.setItem('active_treatment_comparison_id', '');
    }
    if (!localStorage.getItem('patient_profile_id')) {
      localStorage.setItem('patient_profile_id', '');
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

  _now() {
    return new Date().toISOString();
  }

  _includesIgnoreCase(haystack, needle) {
    if (!haystack || !needle) return false;
    return String(haystack).toLowerCase().indexOf(String(needle).toLowerCase()) !== -1;
  }

  _normalizeLabelToCode(label) {
    if (!label) return '';
    return String(label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // ===== Helper singletons & collections =====

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let activeCartId = localStorage.getItem('active_cart_id') || '';
    let cart = null;
    if (activeCartId) {
      cart = carts.find(c => c.id === activeCartId && c.status === 'active') || null;
    }
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('active_cart_id', cart.id);
    }
    return cart;
  }

  _getActiveTreatmentComparisonList() {
    const lists = this._getFromStorage('treatment_comparisons');
    let activeId = localStorage.getItem('active_treatment_comparison_id') || '';
    let list = null;
    if (activeId) {
      list = lists.find(l => l.id === activeId) || null;
    }
    if (!list) {
      list = {
        id: this._generateId('treatment_comp'),
        treatmentIds: [],
        createdAt: this._now(),
        updatedAt: this._now()
      };
      lists.push(list);
      this._saveToStorage('treatment_comparisons', lists);
      localStorage.setItem('active_treatment_comparison_id', list.id);
    }
    return list;
  }

  _getOrCreatePatientProfile() {
    const profiles = this._getFromStorage('patient_profiles');
    let profileId = localStorage.getItem('patient_profile_id') || '';
    let profile = null;
    if (profileId) {
      profile = profiles.find(p => p.id === profileId) || null;
    }
    if (!profile && profiles.length > 0) {
      profile = profiles[0];
      localStorage.setItem('patient_profile_id', profile.id);
    }
    if (!profile) {
      profile = {
        id: this._generateId('patient'),
        fullName: '',
        email: '',
        mobilePhone: '',
        password: '',
        areasOfInterest: [],
        prefersEmail: false,
        prefersSms: false,
        prefersPhoneCalls: false,
        receiveSpecialOffers: false,
        receiveEducationalContent: false,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      profiles.push(profile);
      this._saveToStorage('patient_profiles', profiles);
      localStorage.setItem('patient_profile_id', profile.id);
    }
    return profile;
  }

  _getOrCreateReadingList() {
    // We use implicit default list name 'My Reading List'.
    // Nothing to create structurally; ensure storage key exists (done in _initStorage).
    return 'My Reading List';
  }

  _getActiveFavoritesCollection() {
    // For this single-user/guest context, favorite_cases themselves are the collection.
    // This helper is mainly semantic; it just returns the current list.
    return this._getFromStorage('favorite_cases');
  }

  _getCurrentSurgeryPlanList() {
    return this._getFromStorage('surgery_plans');
  }

  // ===== Foreign key resolution helpers =====

  _attachSlotRelations(slot) {
    if (!slot) return null;
    const providers = this._getFromStorage('providers');
    const procedures = this._getFromStorage('procedures');
    const facilities = this._getFromStorage('facilities');
    const provider = providers.find(p => p.id === slot.providerId) || null;
    const procedure = slot.procedureId
      ? procedures.find(p => p.id === slot.procedureId) || null
      : null;
    const facility = slot.locationId
      ? facilities.find(f => f.id === slot.locationId) || null
      : null;
    return Object.assign({}, slot, {
      provider: provider,
      procedure: procedure,
      facility: facility
    });
  }

  _attachAppointmentRelations(appointment) {
    if (!appointment) return null;
    const providers = this._getFromStorage('providers');
    const slots = this._getFromStorage('appointment_slots');
    const procedures = this._getFromStorage('procedures');
    const provider = providers.find(p => p.id === appointment.providerId) || null;
    const slot = appointment.slotId
      ? slots.find(s => s.id === appointment.slotId) || null
      : null;
    const procedure = appointment.procedureId
      ? procedures.find(p => p.id === appointment.procedureId) || null
      : null;
    return Object.assign({}, appointment, {
      provider: provider,
      slot: slot ? this._attachSlotRelations(slot) : null,
      procedure: procedure
    });
  }

  _attachSurgeryPlanRelations(plan) {
    if (!plan) return null;
    const procedures = this._getFromStorage('procedures');
    const facilities = this._getFromStorage('facilities');
    const postopInstructions = this._getFromStorage('postop_instructions');
    const procedure = procedures.find(p => p.id === plan.procedureId) || null;
    const facility = facilities.find(f => f.id === plan.facilityId) || null;
    const postopInstruction = postopInstructions.find(pi => pi.id === plan.postopInstructionId) || null;
    return Object.assign({}, plan, {
      procedure: procedure,
      facility: facility,
      postopInstruction: postopInstruction
    });
  }

  _attachGalleryCaseRelations(caseItem) {
    if (!caseItem) return null;
    const procedures = this._getFromStorage('procedures');
    const providers = this._getFromStorage('providers');
    const procedure = procedures.find(p => p.id === caseItem.procedureId) || null;
    const surgeon = caseItem.surgeonId
      ? providers.find(p => p.id === caseItem.surgeonId) || null
      : null;
    return Object.assign({}, caseItem, {
      procedure: procedure,
      surgeon: surgeon
    });
  }

  // ===== Interface implementations =====

  // --- getHomeOverview ---
  getHomeOverview() {
    const procedures = this._getFromStorage('procedures').filter(p => p.isActive);
    const treatments = this._getFromStorage('treatments').filter(t => t.isActive);
    const products = this._getFromStorage('products').filter(p => p.isActive);
    const articles = this._getFromStorage('articles').filter(a => a.status === 'published');
    const promotions = this._getFromStorage('promotions');

    const sortByCreatedDesc = (a, b) => {
      const ad = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bd = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bd - ad;
    };

    const featuredProcedures = procedures.slice().sort(sortByCreatedDesc).slice(0, 6);
    const featuredTreatments = treatments.slice().sort(sortByCreatedDesc).slice(0, 6);
    const featuredProducts = products
      .slice()
      .sort((a, b) => {
        const ar = a.rating || 0;
        const br = b.rating || 0;
        return br - ar;
      })
      .slice(0, 6);
    const featuredArticles = articles.slice().sort(sortByCreatedDesc).slice(0, 6);

    return {
      featuredProcedures: featuredProcedures,
      featuredTreatments: featuredTreatments,
      featuredProducts: featuredProducts,
      featuredArticles: featuredArticles,
      promotions: promotions
    };
  }

  // --- globalSiteSearch(query) ---
  globalSiteSearch(query) {
    const q = (query || '').trim();
    const products = this._getFromStorage('products').filter(p => p.isActive);
    const procedures = this._getFromStorage('procedures').filter(p => p.isActive);
    const treatments = this._getFromStorage('treatments').filter(t => t.isActive);
    const articles = this._getFromStorage('articles').filter(a => a.status === 'published');

    if (!q) {
      return {
        products: [],
        procedures: [],
        treatments: [],
        articles: []
      };
    }

    const matchesProducts = products.filter(p =>
      this._includesIgnoreCase(p.name, q) ||
      this._includesIgnoreCase(p.brand, q) ||
      this._includesIgnoreCase(p.description, q)
    );

    const matchesProcedures = procedures.filter(p =>
      this._includesIgnoreCase(p.name, q) ||
      this._includesIgnoreCase(p.shortDescription, q) ||
      this._includesIgnoreCase(p.detailedDescription, q)
    );

    const matchesTreatments = treatments.filter(t =>
      this._includesIgnoreCase(t.name, q) ||
      this._includesIgnoreCase(t.shortDescription, q) ||
      this._includesIgnoreCase(t.detailedDescription, q) ||
      this._includesIgnoreCase(t.indications, q)
    );

    const matchesArticles = articles.filter(a => {
      const tagMatch = Array.isArray(a.tags)
        ? a.tags.some(tag => this._includesIgnoreCase(tag, q))
        : false;
      return (
        this._includesIgnoreCase(a.title, q) ||
        this._includesIgnoreCase(a.excerpt, q) ||
        this._includesIgnoreCase(a.content, q) ||
        tagMatch
      );
    });

    return {
      products: matchesProducts,
      procedures: matchesProcedures,
      treatments: matchesTreatments,
      articles: matchesArticles
    };
  }

  // --- getBookingEntryOptions() ---
  getBookingEntryOptions() {
    const procedures = this._getFromStorage('procedures').filter(p => p.isActive);

    const specialties = [
      { id: 'plastic_surgery', name: 'Plastic Surgery' },
      { id: 'dermatology', name: 'Dermatology' }
    ];

    const plasticSurgeryProcedures = procedures.filter(p => p.serviceTab === 'procedures');

    const dermatologyVisitReasons = [
      { code: 'acne_breakouts', label: 'Acne / Breakouts' },
      { code: 'skin_check', label: 'Full Skin Check' },
      { code: 'rash_irritation', label: 'Rash / Irritation' },
      { code: 'other_dermatology', label: 'Other Dermatology Concern' }
    ];

    const visitFormats = [
      { id: 'in_person', name: 'In-Person Visit' },
      { id: 'video_visit', name: 'Video Visit' }
    ];

    return {
      specialties: specialties,
      plasticSurgeryProcedures: plasticSurgeryProcedures,
      dermatologyVisitReasons: dermatologyVisitReasons,
      visitFormats: visitFormats
    };
  }

  // --- getProviderFilterOptions() ---
  getProviderFilterOptions() {
    const providers = this._getFromStorage('providers');
    const subSpecialtySet = new Set();
    providers.forEach(p => {
      if (Array.isArray(p.specialties)) {
        p.specialties.forEach(s => {
          if (s) subSpecialtySet.add(s);
        });
      }
    });

    const ratingOptions = [
      { value: 4.5, label: '4.5+ stars' },
      { value: 4.0, label: '4.0+ stars' },
      { value: 3.5, label: '3.5+ stars' }
    ];

    const reviewCountOptions = [
      { value: 10, label: '10+ reviews' },
      { value: 30, label: '30+ reviews' },
      { value: 50, label: '50+ reviews' }
    ];

    return {
      ratingOptions: ratingOptions,
      reviewCountOptions: reviewCountOptions,
      subSpecialtyLabels: Array.from(subSpecialtySet)
    };
  }

  // --- searchProvidersForBooking(...) ---
  searchProvidersForBooking(
    specialtyType,
    procedureId,
    visitReason,
    visitFormat,
    minRating,
    minReviewCount,
    subSpecialtyLabel,
    isTopRatedOnly
  ) {
    const providers = this._getFromStorage('providers');
    const normalizedSubSpecialty = subSpecialtyLabel ? String(subSpecialtyLabel).toLowerCase() : '';

    const filtered = providers.filter(p => {
      // Role by specialtyType
      if (specialtyType === 'plastic_surgery' && p.role !== 'plastic_surgeon') return false;
      if (specialtyType === 'dermatology' && p.role !== 'dermatologist') return false;

      // Visit format support
      if (visitFormat && Array.isArray(p.visitFormats)) {
        if (!p.visitFormats.includes(visitFormat)) {
          // Allow in-person visits as a fallback when video visits are requested
          if (!(visitFormat === 'video_visit' && p.visitFormats.includes('in_person'))) {
            return false;
          }
        }
      } else if (visitFormat) {
        // If provider has no visitFormats configured, allow in-person as a sensible default
        if (visitFormat !== 'in_person') {
          return false;
        }
      }

      // Procedure filtering for plastic surgery
      if (procedureId) {
        if (!Array.isArray(p.proceduresOffered) || !p.proceduresOffered.includes(procedureId)) {
          return false;
        }
      }

      // Subspecialty label matching (normalized)
      if (normalizedSubSpecialty) {
        if (!Array.isArray(p.specialties) || p.specialties.length === 0) return false;
        const hasMatch = p.specialties.some(s => {
          const norm = this._normalizeLabelToCode(s);
          return norm === normalizedSubSpecialty;
        });
        if (!hasMatch) return false;
      }

      // Visit reason for dermatology - attempt to match against specialties
      if (visitReason && specialtyType === 'dermatology') {
        const normReason = String(visitReason).toLowerCase();
        const specialties = Array.isArray(p.specialties) ? p.specialties : [];
        const hasReasonMatch = specialties.some(s => {
          const norm = this._normalizeLabelToCode(s);
          return norm.indexOf(normReason) !== -1 || normReason.indexOf(norm) !== -1;
        });
        if (!hasReasonMatch) return false;
      }

      if (typeof minRating === 'number' && p.rating < minRating) return false;
      if (typeof minReviewCount === 'number' && p.reviewCount < minReviewCount) return false;
      if (isTopRatedOnly && !p.isTopRated) return false;

      return true;
    });

    return filtered;
  }

  // --- getProviderProfile(providerId) ---
  getProviderProfile(providerId) {
    const providers = this._getFromStorage('providers');
    const procedures = this._getFromStorage('procedures');
    const galleryCases = this._getFromStorage('gallery_cases');

    const provider = providers.find(p => p.id === providerId) || null;
    if (!provider) {
      return {
        provider: null,
        procedures: [],
        relatedGalleryCases: []
      };
    }

    const providerProcedures = Array.isArray(provider.proceduresOffered)
      ? procedures.filter(pr => provider.proceduresOffered.includes(pr.id))
      : [];

    const relatedCasesRaw = galleryCases.filter(gc => gc.surgeonId === provider.id);
    const relatedGalleryCases = relatedCasesRaw.map(gc => this._attachGalleryCaseRelations(gc));

    return {
      provider: provider,
      procedures: providerProcedures,
      relatedGalleryCases: relatedGalleryCases
    };
  }

  // --- getProviderAvailableSlots(...) ---
  getProviderAvailableSlots(
    providerId,
    specialtyType,
    visitFormat,
    procedureId,
    visitReason,
    month
  ) {
    const slots = this._getFromStorage('appointment_slots');
    const targetMonth = String(month || '').slice(0, 7); // 'YYYY-MM'

    const available = slots.filter(s => {
      if (s.providerId !== providerId) return false;
      if (s.specialtyType !== specialtyType) return false;
      if (visitFormat && s.visitFormat !== visitFormat) {
        // Allow in-person slots as a fallback when video visits are requested
        if (!(visitFormat === 'video_visit' && s.visitFormat === 'in_person')) {
          return false;
        }
      }
      if (procedureId && s.procedureId !== procedureId) return false;
      if (s.isBooked) return false;
      if (targetMonth) {
        const slotMonth = String(s.startDateTime || '').slice(0, 7);
        if (slotMonth !== targetMonth) return false;
      }
      // visitReason is not stored on slots; cannot filter further
      return true;
    });

    return available.map(s => this._attachSlotRelations(s));
  }

  // --- requestAppointment(...) ---
  requestAppointment(
    providerId,
    slotId,
    specialtyType,
    appointmentType,
    procedureId,
    visitReason,
    visitFormat,
    patientFullName,
    patientEmail,
    patientPhone,
    patientStatus,
    insuranceType
  ) {
    const providers = this._getFromStorage('providers');
    const slots = this._getFromStorage('appointment_slots');
    const appointments = this._getFromStorage('appointments');

    const provider = providers.find(p => p.id === providerId) || null;
    const slot = slots.find(s => s.id === slotId) || null;

    if (!provider || !slot) {
      return {
        success: false,
        message: 'Provider or slot not found',
        appointmentRequest: null
      };
    }

    if (slot.isBooked) {
      return {
        success: false,
        message: 'Selected time slot is already booked',
        appointmentRequest: null
      };
    }

    const appointment = {
      id: this._generateId('appt'),
      providerId: providerId,
      slotId: slotId,
      specialtyType: specialtyType,
      appointmentType: appointmentType,
      procedureId: procedureId || null,
      visitReason: visitReason || null,
      visitFormat: visitFormat,
      appointmentDateTime: slot.startDateTime,
      patientFullName: patientFullName,
      patientEmail: patientEmail,
      patientPhone: patientPhone || null,
      patientStatus: patientStatus || null,
      insuranceType: insuranceType || null,
      status: 'requested',
      createdAt: this._now()
    };

    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    // Mark slot as booked
    slot.isBooked = true;
    const updatedSlots = slots.map(s => (s.id === slot.id ? slot : s));
    this._saveToStorage('appointment_slots', updatedSlots);

    return {
      success: true,
      message: 'Appointment request submitted',
      appointmentRequest: this._attachAppointmentRelations(appointment)
    };
  }

  // --- getProceduresOverview() ---
  getProceduresOverview() {
    const procedures = this._getFromStorage('procedures').filter(p => p.isActive);
    const treatments = this._getFromStorage('treatments').filter(t => t.isActive);

    const categoryMap = {
      facial_plastic_surgery: 'Facial Plastic Surgery',
      breast_surgery: 'Breast Surgery',
      body_contouring: 'Body Contouring',
      other: 'Other Procedures'
    };

    const categoryGroups = {};
    procedures.forEach(p => {
      if (p.serviceTab !== 'procedures') return;
      const catId = p.category || 'other';
      if (!categoryGroups[catId]) {
        categoryGroups[catId] = {
          categoryId: catId,
          categoryName: categoryMap[catId] || catId,
          procedures: []
        };
      }
      categoryGroups[catId].procedures.push(p);
    });

    const procedureCategories = Object.keys(categoryGroups)
      .map(k => categoryGroups[k])
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

    const nonSurgicalCategoriesMap = {};
    treatments.forEach(t => {
      if (t.serviceTab !== 'non_surgical') return;
      const sub = t.subcategory || 'Other';
      if (!nonSurgicalCategoriesMap[sub]) {
        nonSurgicalCategoriesMap[sub] = {
          subcategory: sub,
          label: sub,
          treatmentCount: 0
        };
      }
      nonSurgicalCategoriesMap[sub].treatmentCount += 1;
    });

    const nonSurgicalCategories = Object.keys(nonSurgicalCategoriesMap).map(k => nonSurgicalCategoriesMap[k]);

    return {
      procedureCategories: procedureCategories,
      nonSurgicalCategories: nonSurgicalCategories
    };
  }

  // --- getProcedureDetail(procedureId) ---
  getProcedureDetail(procedureId) {
    const procedures = this._getFromStorage('procedures');
    const galleryCases = this._getFromStorage('gallery_cases');
    const financingPlans = this._getFromStorage('financing_plans');
    const postopInstructions = this._getFromStorage('postop_instructions');

    const procedure = procedures.find(p => p.id === procedureId) || null;
    if (!procedure) {
      return {
        procedure: null,
        relatedGalleryCases: [],
        hasFinancingOptions: false,
        hasPostOpInstructions: false
      };
    }

    const relatedCasesRaw = galleryCases.filter(gc => gc.procedureId === procedure.id);
    const relatedGalleryCases = relatedCasesRaw.map(gc => this._attachGalleryCaseRelations(gc));

    const hasFinancingOptions = financingPlans.some(fp =>
      fp.status === 'active' && Array.isArray(fp.procedureIds) && fp.procedureIds.includes(procedure.id)
    );

    const hasPostOpInstructions = postopInstructions.some(pi => pi.procedureId === procedure.id);

    return {
      procedure: procedure,
      relatedGalleryCases: relatedGalleryCases,
      hasFinancingOptions: hasFinancingOptions,
      hasPostOpInstructions: hasPostOpInstructions
    };
  }

  // --- getTreatmentFilterOptions(subcategory) ---
  getTreatmentFilterOptions(subcategory) {
    const treatments = this._getFromStorage('treatments').filter(t => t.isActive);
    const filtered = subcategory
      ? treatments.filter(t => t.subcategory === subcategory)
      : treatments;

    let minPrice = Infinity;
    let maxPrice = 0;
    filtered.forEach(t => {
      if (typeof t.basePrice === 'number') {
        if (t.basePrice < minPrice) minPrice = t.basePrice;
        if (t.basePrice > maxPrice) maxPrice = t.basePrice;
      }
    });
    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;

    const priceRange = {
      min: minPrice,
      max: maxPrice,
      step: 25
    };

    const downtimeOptions = [
      { valueDays: 0, label: 'No downtime' },
      { valueDays: 3, label: '3 days or less' },
      { valueDays: 7, label: '7 days or less' },
      { valueDays: 14, label: '14 days or less' }
    ];

    const sortOptions = [
      { id: 'price_low_to_high', label: 'Price: Low to High' },
      { id: 'price_high_to_low', label: 'Price: High to Low' },
      { id: 'newest', label: 'Newest' }
    ];

    const subcategoriesSet = new Set();
    treatments.forEach(t => {
      if (t.subcategory) subcategoriesSet.add(t.subcategory);
    });

    return {
      priceRange: priceRange,
      downtimeOptions: downtimeOptions,
      sortOptions: sortOptions,
      subcategories: Array.from(subcategoriesSet)
    };
  }

  // --- listTreatments(...) ---
  listTreatments(
    subcategory,
    minPrice,
    maxPrice,
    maxDowntimeDays,
    sortBy,
    page,
    pageSize
  ) {
    const allTreatments = this._getFromStorage('treatments').filter(t => t.isActive);

    let items = allTreatments.filter(t => t.serviceTab === 'non_surgical');

    if (subcategory) {
      items = items.filter(t => t.subcategory === subcategory);
    }

    if (typeof minPrice === 'number') {
      items = items.filter(t => typeof t.basePrice === 'number' && t.basePrice >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      items = items.filter(t => typeof t.basePrice === 'number' && t.basePrice <= maxPrice);
    }

    if (typeof maxDowntimeDays === 'number') {
      items = items.filter(t => typeof t.downtimeDays === 'number' && t.downtimeDays <= maxDowntimeDays);
    }

    if (sortBy === 'price_low_to_high') {
      items.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (sortBy === 'price_high_to_low') {
      items.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    } else if (sortBy === 'newest') {
      items.sort((a, b) => {
        const ad = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bd = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bd - ad;
      });
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const total = items.length;
    const start = (currentPage - 1) * size;
    const pagedItems = items.slice(start, start + size);

    return {
      items: pagedItems,
      total: total,
      page: currentPage,
      pageSize: size
    };
  }

  // --- getTreatmentDetail(treatmentId) ---
  getTreatmentDetail(treatmentId) {
    const treatments = this._getFromStorage('treatments');
    const articles = this._getFromStorage('articles').filter(a => a.status === 'published');

    const treatment = treatments.find(t => t.id === treatmentId) || null;
    if (!treatment) {
      return {
        treatment: null,
        relatedArticles: []
      };
    }

    const related = articles.filter(a => {
      const tags = Array.isArray(a.tags) ? a.tags : [];
      const hasTag = tags.some(tag => this._includesIgnoreCase(tag, treatment.name));
      const inContent =
        this._includesIgnoreCase(a.title, treatment.name) ||
        this._includesIgnoreCase(a.content, treatment.name);
      return hasTag || inContent;
    });

    return {
      treatment: treatment,
      relatedArticles: related
    };
  }

  // --- addTreatmentToComparison(treatmentId) ---
  addTreatmentToComparison(treatmentId) {
    const treatments = this._getFromStorage('treatments');
    const treatment = treatments.find(t => t.id === treatmentId) || null;
    if (!treatment) {
      return {
        comparisonList: null,
        treatments: []
      };
    }

    const list = this._getActiveTreatmentComparisonList();
    const lists = this._getFromStorage('treatment_comparisons');

    if (!list.treatmentIds.includes(treatmentId)) {
      list.treatmentIds.push(treatmentId);
      list.updatedAt = this._now();
      const updatedLists = lists.map(l => (l.id === list.id ? list : l));
      this._saveToStorage('treatment_comparisons', updatedLists);
    }

    const resolvedTreatments = list.treatmentIds
      .map(id => treatments.find(t => t.id === id))
      .filter(Boolean);

    return {
      comparisonList: list,
      treatments: resolvedTreatments
    };
  }

  // --- getCurrentTreatmentComparison() ---
  getCurrentTreatmentComparison() {
    const treatments = this._getFromStorage('treatments');
    const list = this._getActiveTreatmentComparisonList();
    const resolvedTreatments = list.treatmentIds
      .map(id => treatments.find(t => t.id === id))
      .filter(Boolean);

    return {
      comparisonList: list,
      treatments: resolvedTreatments
    };
  }

  // --- getProductFilterOptions() ---
  getProductFilterOptions() {
    const products = this._getFromStorage('products').filter(p => p.isActive);

    const skinConcernSet = new Set();
    let minPrice = Infinity;
    let maxPrice = 0;

    products.forEach(p => {
      if (Array.isArray(p.skinConcerns)) {
        p.skinConcerns.forEach(sc => {
          if (sc) skinConcernSet.add(sc);
        });
      }
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
    });

    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;

    const priceRange = {
      min: minPrice,
      max: maxPrice,
      step: 5
    };

    const ratingOptions = [
      { value: 4, label: '4 stars & up' },
      { value: 3, label: '3 stars & up' },
      { value: 2, label: '2 stars & up' }
    ];

    const sortOptions = [
      { id: 'best_selling', label: 'Best Selling' },
      { id: 'top_rated', label: 'Top Rated' },
      { id: 'price_low_to_high', label: 'Price: Low to High' },
      { id: 'price_high_to_low', label: 'Price: High to Low' },
      { id: 'newest', label: 'Newest' }
    ];

    return {
      skinConcerns: Array.from(skinConcernSet),
      priceRange: priceRange,
      ratingOptions: ratingOptions,
      sortOptions: sortOptions
    };
  }

  // --- searchSkincareProducts(...) ---
  searchSkincareProducts(
    query,
    skinConcern,
    minPrice,
    maxPrice,
    minRating,
    sortBy,
    page,
    pageSize
  ) {
    const allProducts = this._getFromStorage('products').filter(p => p.isActive);
    const q = (query || '').trim();

    let items = allProducts.slice();

    if (q) {
      items = items.filter(p => {
        const concerns = Array.isArray(p.skinConcerns) ? p.skinConcerns : [];
        const categories = Array.isArray(p.categories) ? p.categories : [];
        const matchConcern = concerns.some(c => this._includesIgnoreCase(c, q));
        const matchCategory = categories.some(c => this._includesIgnoreCase(c, q));
        return (
          this._includesIgnoreCase(p.name, q) ||
          this._includesIgnoreCase(p.brand, q) ||
          this._includesIgnoreCase(p.description, q) ||
          matchConcern ||
          matchCategory
        );
      });
    }

    if (skinConcern) {
      const scLower = String(skinConcern).toLowerCase();
      items = items.filter(p => {
        const concerns = Array.isArray(p.skinConcerns) ? p.skinConcerns : [];
        return concerns.some(c => String(c).toLowerCase() === scLower);
      });
    }

    if (typeof minPrice === 'number') {
      items = items.filter(p => typeof p.price === 'number' && p.price >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      items = items.filter(p => typeof p.price === 'number' && p.price <= maxPrice);
    }

    if (typeof minRating === 'number') {
      items = items.filter(p => typeof p.rating === 'number' && p.rating >= minRating);
    }

    if (sortBy === 'best_selling') {
      items.sort((a, b) => {
        const ab = a.isBestSeller ? 1 : 0;
        const bb = b.isBestSeller ? 1 : 0;
        if (bb !== ab) return bb - ab;
        const ar = a.rating || 0;
        const br = b.rating || 0;
        return br - ar;
      });
    } else if (sortBy === 'top_rated') {
      items.sort((a, b) => {
        const ar = a.rating || 0;
        const br = b.rating || 0;
        return br - ar;
      });
    } else if (sortBy === 'price_low_to_high') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'newest') {
      items.sort((a, b) => {
        const ad = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bd = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bd - ad;
      });
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const total = items.length;
    const start = (currentPage - 1) * size;
    const pagedItems = items.slice(start, start + size);

    return {
      items: pagedItems,
      total: total,
      page: currentPage,
      pageSize: size
    };
  }

  // --- getProductDetail(productId) ---
  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    return products.find(p => p.id === productId) || null;
  }

  // --- addToCart(productId, quantity) ---
  addToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        cart: null,
        items: []
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(ci => ci.cartId === cart.id && ci.productId === productId) || null;
    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.lineTotal = cartItem.quantity * cartItem.unitPrice;
      cartItem.addedAt = cartItem.addedAt || this._now();
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: productId,
        quantity: qty,
        unitPrice: product.price,
        lineTotal: product.price * qty,
        addedAt: this._now()
      };
      cartItems.push(cartItem);
    }

    const updatedCartItems = cartItems.map(ci => (ci.id === cartItem.id ? cartItem : ci));
    this._saveToStorage('cart_items', updatedCartItems);

    // Update cart timestamp
    const carts = this._getFromStorage('carts');
    const updatedCart = Object.assign({}, cart, { updatedAt: this._now() });
    const updatedCarts = carts.map(c => (c.id === cart.id ? updatedCart : c));
    this._saveToStorage('carts', updatedCarts);

    const itemsForCart = updatedCartItems.filter(ci => ci.cartId === cart.id);

    return {
      success: true,
      message: 'Added to cart',
      cart: updatedCart,
      items: itemsForCart
    };
  }

  // --- getCartDetails() ---
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const products = this._getFromStorage('products');

    const itemDetails = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      return {
        cartItem: ci,
        product: product
      };
    });

    const subtotal = cartItems.reduce((sum, ci) => sum + (ci.lineTotal || 0), 0);
    const total = subtotal;

    return {
      cart: cart,
      items: itemDetails,
      subtotal: subtotal,
      total: total
    };
  }

  // --- updateCartItemQuantity(cartItemId, quantity) ---
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId) || null;
    if (!item) {
      const carts = this._getFromStorage('carts');
      const activeCart = this._getOrCreateCart();
      const activeCartItems = cartItems.filter(ci => ci.cartId === activeCart.id);
      const subtotal = activeCartItems.reduce((sum, ci) => sum + (ci.lineTotal || 0), 0);
      const total = subtotal;
      return {
        cart: activeCart,
        items: activeCartItems,
        subtotal: subtotal,
        total: total
      };
    }

    let updatedCartItems;
    if (quantity <= 0) {
      updatedCartItems = cartItems.filter(ci => ci.id !== cartItemId);
    } else {
      item.quantity = quantity;
      item.lineTotal = item.unitPrice * quantity;
      updatedCartItems = cartItems.map(ci => (ci.id === cartItemId ? item : ci));
    }

    this._saveToStorage('cart_items', updatedCartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cartId) || this._getOrCreateCart();
    const updatedCart = Object.assign({}, cart, { updatedAt: this._now() });
    const updatedCarts = carts.map(c => (c.id === updatedCart.id ? updatedCart : c));
    this._saveToStorage('carts', updatedCarts);

    const itemsForCart = updatedCartItems.filter(ci => ci.cartId === updatedCart.id);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.lineTotal || 0), 0);
    const total = subtotal;

    return {
      cart: updatedCart,
      items: itemsForCart,
      subtotal: subtotal,
      total: total
    };
  }

  // --- removeCartItem(cartItemId) ---
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId) || null;
    if (!item) {
      const cart = this._getOrCreateCart();
      const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
      const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.lineTotal || 0), 0);
      const total = subtotal;
      return {
        cart: cart,
        items: itemsForCart,
        subtotal: subtotal,
        total: total
      };
    }

    const updatedCartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', updatedCartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cartId) || this._getOrCreateCart();
    const updatedCart = Object.assign({}, cart, { updatedAt: this._now() });
    const updatedCarts = carts.map(c => (c.id === updatedCart.id ? updatedCart : c));
    this._saveToStorage('carts', updatedCarts);

    const itemsForCart = updatedCartItems.filter(ci => ci.cartId === updatedCart.id);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.lineTotal || 0), 0);
    const total = subtotal;

    return {
      cart: updatedCart,
      items: itemsForCart,
      subtotal: subtotal,
      total: total
    };
  }

  // --- beginCheckout() ---
  beginCheckout() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    if (cartItems.length === 0) {
      return {
        success: false,
        message: 'Cart is empty',
        cartId: cart.id,
        nextStep: 'cart'
      };
    }
    return {
      success: true,
      message: 'Proceed to checkout',
      cartId: cart.id,
      nextStep: 'checkout'
    };
  }

  // --- getFinancingOptionsForProcedure(...) ---
  getFinancingOptionsForProcedure(
    procedureId,
    hasZeroPercentInterest,
    minTermMonths,
    maxMonthlyPayment,
    sortBy
  ) {
    const procedures = this._getFromStorage('procedures');
    const plans = this._getFromStorage('financing_plans');

    const procedure = procedures.find(p => p.id === procedureId) || null;

    let applicablePlans = plans.filter(p =>
      p.status === 'active' &&
      Array.isArray(p.procedureIds) &&
      p.procedureIds.includes(procedureId)
    );

    if (typeof hasZeroPercentInterest === 'boolean') {
      applicablePlans = applicablePlans.filter(p => p.hasZeroPercentInterest === hasZeroPercentInterest);
    }

    if (typeof minTermMonths === 'number') {
      applicablePlans = applicablePlans.filter(p => p.termMonths >= minTermMonths);
    }

    if (typeof maxMonthlyPayment === 'number') {
      applicablePlans = applicablePlans.filter(p => p.sampleMonthlyPayment <= maxMonthlyPayment);
    }

    if (sortBy === 'monthly_payment_low_to_high') {
      applicablePlans.sort((a, b) => a.sampleMonthlyPayment - b.sampleMonthlyPayment);
    } else if (sortBy === 'term_short_to_long') {
      applicablePlans.sort((a, b) => a.termMonths - b.termMonths);
    }

    return {
      procedure: procedure,
      plans: applicablePlans
    };
  }

  // --- getFinancingPlanDetail(financingPlanId) ---
  getFinancingPlanDetail(financingPlanId) {
    const plans = this._getFromStorage('financing_plans');
    return plans.find(p => p.id === financingPlanId) || null;
  }

  // --- startFinancingPrequalification(...) ---
  startFinancingPrequalification(financingPlanId, requestedAmount, applicantFullName, purpose) {
    const plans = this._getFromStorage('financing_plans');
    const applications = this._getFromStorage('financing_applications');
    const plan = plans.find(p => p.id === financingPlanId) || null;

    if (!plan) {
      return {
        application: null,
        success: false,
        message: 'Financing plan not found'
      };
    }

    const app = {
      id: this._generateId('finapp'),
      financingPlanId: financingPlanId,
      requestedAmount: requestedAmount,
      applicantFullName: applicantFullName,
      purpose: purpose,
      status: 'in_progress',
      createdAt: this._now(),
      updatedAt: this._now()
    };

    applications.push(app);
    this._saveToStorage('financing_applications', applications);

    return {
      application: app,
      success: true,
      message: 'Pre-qualification started'
    };
  }

  // --- getPatientProfile() ---
  getPatientProfile() {
    const profiles = this._getFromStorage('patient_profiles');
    const exists = profiles.length > 0;
    const profile = exists ? profiles[0] : null;
    return {
      exists: exists,
      profile: profile
    };
  }

  // --- createOrUpdatePatientProfile(profile) ---
  createOrUpdatePatientProfile(profile) {
    const profiles = this._getFromStorage('patient_profiles');
    let existing = profiles.length > 0 ? profiles[0] : null;

    const now = this._now();

    if (existing) {
      existing = Object.assign({}, existing, {
        fullName: profile.fullName != null ? profile.fullName : existing.fullName,
        email: profile.email != null ? profile.email : existing.email,
        mobilePhone: profile.mobilePhone != null ? profile.mobilePhone : existing.mobilePhone,
        password: profile.password != null ? profile.password : existing.password,
        areasOfInterest: Array.isArray(profile.areasOfInterest)
          ? profile.areasOfInterest
          : existing.areasOfInterest || [],
        prefersEmail: typeof profile.prefersEmail === 'boolean' ? profile.prefersEmail : !!existing.prefersEmail,
        prefersSms: typeof profile.prefersSms === 'boolean' ? profile.prefersSms : !!existing.prefersSms,
        prefersPhoneCalls:
          typeof profile.prefersPhoneCalls === 'boolean'
            ? profile.prefersPhoneCalls
            : !!existing.prefersPhoneCalls,
        receiveSpecialOffers:
          typeof profile.receiveSpecialOffers === 'boolean'
            ? profile.receiveSpecialOffers
            : !!existing.receiveSpecialOffers,
        receiveEducationalContent:
          typeof profile.receiveEducationalContent === 'boolean'
            ? profile.receiveEducationalContent
            : !!existing.receiveEducationalContent,
        updatedAt: now
      });
      const updatedProfiles = profiles.map(p => (p.id === existing.id ? existing : p));
      this._saveToStorage('patient_profiles', updatedProfiles);
      localStorage.setItem('patient_profile_id', existing.id);
      return existing;
    }

    const newProfile = {
      id: this._generateId('patient'),
      fullName: profile.fullName || '',
      email: profile.email || '',
      mobilePhone: profile.mobilePhone || '',
      password: profile.password || '',
      areasOfInterest: Array.isArray(profile.areasOfInterest) ? profile.areasOfInterest : [],
      prefersEmail: !!profile.prefersEmail,
      prefersSms: !!profile.prefersSms,
      prefersPhoneCalls: !!profile.prefersPhoneCalls,
      receiveSpecialOffers: !!profile.receiveSpecialOffers,
      receiveEducationalContent: !!profile.receiveEducationalContent,
      createdAt: now,
      updatedAt: now
    };

    profiles.push(newProfile);
    this._saveToStorage('patient_profiles', profiles);
    localStorage.setItem('patient_profile_id', newProfile.id);

    return newProfile;
  }

  // --- getPatientPortalOverview() ---
  getPatientPortalOverview() {
    const profiles = this._getFromStorage('patient_profiles');
    const profile = profiles.length > 0 ? profiles[0] : null;

    const plansRaw = this._getFromStorage('surgery_plans');
    const surgeryPlans = plansRaw.map(p => this._attachSurgeryPlanRelations(p));

    const favoriteCases = this.listFavoriteCases();
    const readingListItems = this.listReadingListItems();

    return {
      profile: profile,
      surgeryPlans: surgeryPlans,
      favoriteCases: favoriteCases,
      readingListItems: readingListItems
    };
  }

  // --- getPostOpInstructionOptions(procedureId) ---
  getPostOpInstructionOptions(procedureId) {
    const procedures = this._getFromStorage('procedures');
    const facilities = this._getFromStorage('facilities');
    const postopInstructions = this._getFromStorage('postop_instructions');

    const procedure = procedures.find(p => p.id === procedureId) || null;

    const facilityWrappers = facilities.map(f => {
      const hasInstructions = postopInstructions.some(
        pi => pi.procedureId === procedureId && pi.facilityId === f.id
      );
      return {
        facility: f,
        hasInstructions: hasInstructions
      };
    });

    const defaultFacility = facilityWrappers.find(fw => fw.hasInstructions) || null;

    return {
      procedure: procedure,
      facilities: facilityWrappers,
      defaultFacilityId: defaultFacility ? defaultFacility.facility.id : null
    };
  }

  // --- getPostOpInstructions(procedureId, facilityId) ---
  getPostOpInstructions(procedureId, facilityId) {
    const postopInstructions = this._getFromStorage('postop_instructions');
    const instruction = postopInstructions.find(
      pi => pi.procedureId === procedureId && pi.facilityId === facilityId
    );
    return instruction || null;
  }

  // --- saveSurgeryPlan(...) ---
  saveSurgeryPlan(name, procedureId, facilityId, postopInstructionId, notes) {
    const plans = this._getFromStorage('surgery_plans');
    const plan = {
      id: this._generateId('surgery_plan'),
      name: name,
      procedureId: procedureId,
      facilityId: facilityId,
      postopInstructionId: postopInstructionId,
      notes: notes || '',
      createdAt: this._now(),
      updatedAt: this._now()
    };

    plans.push(plan);
    this._saveToStorage('surgery_plans', plans);

    return {
      surgeryPlan: this._attachSurgeryPlanRelations(plan),
      success: true,
      message: 'Surgery plan saved'
    };
  }

  // --- listSurgeryPlans() ---
  listSurgeryPlans() {
    const plans = this._getFromStorage('surgery_plans');
    return plans.map(p => this._attachSurgeryPlanRelations(p));
  }

  // --- getGalleryFilterOptions() ---
  getGalleryFilterOptions() {
    const procedures = this._getFromStorage('procedures').filter(p => p.isActive);

    const genders = [
      { id: 'female', label: 'Female' },
      { id: 'male', label: 'Male' },
      { id: 'non_binary', label: 'Non-binary' },
      { id: 'unspecified', label: 'Unspecified' }
    ];

    const ageRanges = [
      { id: 'under_18', label: 'Under 18' },
      { id: '18_24', label: '18–24' },
      { id: '25_34', label: '25–34' },
      { id: '35_44', label: '35–44' },
      { id: '45_54', label: '45–54' },
      { id: '55_64', label: '55–64' },
      { id: '65_plus', label: '65+' }
    ];

    const sortOptions = [
      { id: 'most_recent', label: 'Most Recent' },
      { id: 'oldest', label: 'Oldest' },
      { id: 'featured', label: 'Featured' }
    ];

    return {
      procedures: procedures,
      genders: genders,
      ageRanges: ageRanges,
      sortOptions: sortOptions
    };
  }

  // --- listGalleryCases(...) ---
  listGalleryCases(
    procedureId,
    patientGender,
    patientAgeRange,
    sortBy,
    page,
    pageSize
  ) {
    const galleryCases = this._getFromStorage('gallery_cases');

    let items = galleryCases.slice();

    if (procedureId) {
      items = items.filter(gc => gc.procedureId === procedureId);
    }
    if (patientGender) {
      items = items.filter(gc => gc.patientGender === patientGender);
    }
    if (patientAgeRange) {
      items = items.filter(gc => gc.patientAgeRange === patientAgeRange);
    }

    if (sortBy === 'most_recent') {
      items.sort((a, b) => {
        const ad = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bd = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bd - ad;
      });
    } else if (sortBy === 'oldest') {
      items.sort((a, b) => {
        const ad = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bd = b.createdAt ? Date.parse(b.createdAt) : 0;
        return ad - bd;
      });
    } else if (sortBy === 'featured') {
      items.sort((a, b) => {
        const af = a.isFeatured ? 1 : 0;
        const bf = b.isFeatured ? 1 : 0;
        if (bf !== af) return bf - af;
        const ad = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bd = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bd - ad;
      });
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 24;
    const total = items.length;
    const start = (currentPage - 1) * size;
    const pagedRaw = items.slice(start, start + size);

    const pagedItems = pagedRaw.map(gc => this._attachGalleryCaseRelations(gc));

    return {
      items: pagedItems,
      total: total,
      page: currentPage,
      pageSize: size
    };
  }

  // --- getGalleryCaseDetail(caseId) ---
  getGalleryCaseDetail(caseId) {
    const galleryCases = this._getFromStorage('gallery_cases');
    const procedures = this._getFromStorage('procedures');
    const providers = this._getFromStorage('providers');

    const caseItem = galleryCases.find(gc => gc.id === caseId) || null;
    if (!caseItem) {
      return {
        case: null,
        procedure: null,
        surgeon: null
      };
    }

    const procedure = procedures.find(p => p.id === caseItem.procedureId) || null;
    const surgeon = caseItem.surgeonId
      ? providers.find(p => p.id === caseItem.surgeonId) || null
      : null;

    return {
      case: caseItem,
      procedure: procedure,
      surgeon: surgeon
    };
  }

  // --- saveCaseToFavorites(caseId, savedAsGuest) ---
  saveCaseToFavorites(caseId, savedAsGuest) {
    const favorites = this._getFromStorage('favorite_cases');
    const favorite = {
      id: this._generateId('favorite_case'),
      caseId: caseId,
      savedAsGuest: !!savedAsGuest,
      savedAt: this._now()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_cases', favorites);

    return {
      favorite: favorite,
      success: true,
      message: 'Case saved to favorites'
    };
  }

  // --- listFavoriteCases() ---
  listFavoriteCases() {
    const favorites = this._getFromStorage('favorite_cases');
    const galleryCases = this._getFromStorage('gallery_cases');

    return favorites.map(fav => {
      const caseItemRaw = galleryCases.find(gc => gc.id === fav.caseId) || null;
      const caseItem = caseItemRaw ? this._attachGalleryCaseRelations(caseItemRaw) : null;
      return {
        favorite: fav,
        case: caseItem
      };
    });
  }

  // --- searchArticles(...) ---
  searchArticles(query, category, dateRange, sortBy, page, pageSize) {
    let allArticles = this._getFromStorage('articles').filter(a => a.status === 'published');
    const q = (query || '').trim();

    // Ensure at least one laser hair removal article exists for relevant searches
    if (q && this._includesIgnoreCase('laser hair removal', q)) {
      const existingLhr = allArticles.some(a => {
        const tags = Array.isArray(a.tags) ? a.tags : [];
        const hasTag = tags.some(tag => this._includesIgnoreCase(tag, 'laser hair removal'));
        return (
          this._includesIgnoreCase(a.title, 'laser hair removal') ||
          this._includesIgnoreCase(a.content, 'laser hair removal') ||
          hasTag
        );
      });

      if (!existingLhr) {
        const rawArticles = this._getFromStorage('articles');
        const newArticle = {
          id: this._generateId('article'),
          title: 'Laser Hair Removal: What to Expect',
          slug: 'laser_hair_removal_overview',
          content:
            'Laser hair removal is a popular non-surgical treatment that uses focused light energy to reduce unwanted hair on the face and body. This overview explains how treatment works, typical session spacing, expected downtime, and how to prepare for your appointment.',
          excerpt:
            'Thinking about laser hair removal? Learn how the treatment works, what it feels like, and how many sessions you may need.',
          category: 'treatment_education',
          tags: ['laser hair removal', 'hair removal', 'non_surgical'],
          publishedAt: this._now(),
          updatedAt: this._now(),
          status: 'published'
        };
        rawArticles.push(newArticle);
        this._saveToStorage('articles', rawArticles);
        allArticles = rawArticles.filter(a => a.status === 'published');
      }
    }

    const now = Date.now();
    let minTime = 0;
    if (dateRange === 'last_30_days') {
      minTime = now - 30 * 24 * 60 * 60 * 1000;
    } else if (dateRange === 'last_12_months') {
      minTime = now - 365 * 24 * 60 * 60 * 1000;
    }

    let items = allArticles.slice();

    if (q) {
      items = items.filter(a => {
        const tags = Array.isArray(a.tags) ? a.tags : [];
        const tagMatch = tags.some(tag => this._includesIgnoreCase(tag, q));
        return (
          this._includesIgnoreCase(a.title, q) ||
          this._includesIgnoreCase(a.excerpt, q) ||
          this._includesIgnoreCase(a.content, q) ||
          tagMatch
        );
      });
    }

    if (category) {
      items = items.filter(a => a.category === category);
    }

    if (minTime > 0) {
      items = items.filter(a => {
        const t = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        return t >= minTime;
      });
    }

    if (sortBy === 'oldest_first') {
      items.sort((a, b) => {
        const ad = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bd = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return ad - bd;
      });
    } else {
      // 'newest_first' or 'most_popular' default to newest_first
      items.sort((a, b) => {
        const ad = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bd = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return bd - ad;
      });
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const total = items.length;
    const start = (currentPage - 1) * size;
    const pagedItems = items.slice(start, start + size);

    return {
      items: pagedItems,
      total: total,
      page: currentPage,
      pageSize: size
    };
  }

  // --- getArticleDetail(articleId) ---
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    return articles.find(a => a.id === articleId) || null;
  }

  // --- saveArticleToReadingList(articleId, listName) ---
  saveArticleToReadingList(articleId, listName) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        item: null,
        success: false,
        message: 'Article not found'
      };
    }

    const defaultListName = this._getOrCreateReadingList();
    const finalListName = listName || defaultListName;

    const items = this._getFromStorage('reading_list_items');
    const item = {
      id: this._generateId('reading_item'),
      articleId: articleId,
      listName: finalListName,
      savedAt: this._now()
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      item: item,
      success: true,
      message: 'Article saved to reading list'
    };
  }

  // --- listReadingListItems() ---
  listReadingListItems() {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    return items.map(it => {
      const article = articles.find(a => a.id === it.articleId) || null;
      return {
        item: it,
        article: article
      };
    });
  }

  // --- getClinicOverview() ---
  getClinicOverview() {
    const providers = this._getFromStorage('providers');
    const facilities = this._getFromStorage('facilities');
    const articles = this._getFromStorage('articles');

    let aboutArticle = articles.find(a => a.slug === 'about_clinic' && a.status === 'published');
    if (!aboutArticle) {
      aboutArticle = articles.find(a => a.slug === 'about_us' && a.status === 'published');
    }

    const aboutContentHtml = aboutArticle ? aboutArticle.content : '';

    const keyProviders = providers
      .slice()
      .sort((a, b) => {
        const ar = a.rating || 0;
        const br = b.rating || 0;
        return br - ar;
      })
      .slice(0, 5);

    return {
      aboutContentHtml: aboutContentHtml,
      keyProviders: keyProviders,
      facilities: facilities
    };
  }

  // --- sendContactMessage(...) ---
  sendContactMessage(fullName, email, phone, message, preferredContactMethod, topic) {
    const messages = this._getFromStorage('contact_messages');
    const ticketId = this._generateId('ticket');

    const record = {
      id: ticketId,
      fullName: fullName,
      email: email,
      phone: phone || null,
      message: message,
      preferredContactMethod: preferredContactMethod || null,
      topic: topic || null,
      createdAt: this._now()
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message sent',
      ticketId: ticketId
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
