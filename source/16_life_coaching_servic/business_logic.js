/* eslint-disable no-var */

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
  }

  // ==========================
  // Storage & ID helpers
  // ==========================
  _initStorage() {
    const keys = [
      'coaches',
      'coach_reviews',
      'coach_availability_slots',
      'session_bookings',
      'coach_contact_messages',
      'coaching_packages',
      'cart',
      'cart_items',
      'blog_articles',
      'saved_articles',
      'reading_lists',
      'reading_list_items',
      'challenges',
      'challenge_enrollments',
      'assessments',
      'assessment_questions',
      'assessment_instances',
      'worksheets',
      'saved_worksheets',
      'individual_session_offerings',
      'group_workshops',
      'custom_plans',
      'custom_plan_items',
      // extra internal tables
      'general_contact_messages'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ==========================
  // Helper functions (private)
  // ==========================

  // Internal helper to get or create the single-user cart
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cartItem IDs
        subtotal: 0,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  // Internal helper to recalculate cart subtotal and update the Cart entity
  _recalculateCartTotals(cart) {
    if (!cart) return { cart: null, subtotal: 0 };
    const cartId = cart.id;
    const cartItems = this._getFromStorage('cart_items');
    const packages = this._getFromStorage('coaching_packages');

    let subtotal = 0;
    const itemIds = [];

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cartId === cartId) {
        const lineTotal = (item.unit_price || 0) * (item.quantity || 0);
        subtotal += lineTotal;
        itemIds.push(item.id);
      }
    }

    let carts = this._getFromStorage('cart');
    let updatedCart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cartId) {
        carts[i].subtotal = subtotal;
        carts[i].items = itemIds;
        carts[i].updated_at = this._nowISO();
        updatedCart = carts[i];
        break;
      }
    }
    if (updatedCart) {
      this._saveToStorage('cart', carts);
    }

    // Resolve items with packages for convenience
    const resolvedItems = [];
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cartId === cartId) {
        const pkg = packages.find(p => p.id === item.packageId) || null;
        resolvedItems.push({ cartItem: item, package: pkg });
      }
    }

    return { cart: updatedCart || cart, subtotal, items: resolvedItems };
  }

  // Internal helper to compute an assessment score and summary
  _calculateAssessmentScore(assessmentId, responses) {
    const questions = this._getFromStorage('assessment_questions').filter(q => q.assessmentId === assessmentId);

    // Simple scoring: average of normalized scale values (1-10) where available;
    // multiple choice questions are ignored for numeric score.
    let total = 0;
    let count = 0;

    const responseMap = {};
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      responseMap[r.questionId] = r.response || {};
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const r = responseMap[q.id];
      if (!r) continue;

      if (q.response_type === 'scale_1_10' && typeof r.scaleValue === 'number') {
        const min = typeof q.min_value === 'number' ? q.min_value : 1;
        const max = typeof q.max_value === 'number' ? q.max_value : 10;
        const val = r.scaleValue;
        if (val >= min && val <= max) {
          // Normalize to 0-10
          const normalized = ((val - min) / (max - min || 1)) * 10;
          total += normalized;
          count += 1;
        }
      }
    }

    const score = count > 0 ? Number((total / count).toFixed(2)) : 0;

    let summary = 'Your overall score is ' + score + ' / 10.';
    if (score >= 8) {
      summary += ' This suggests strong balance overall.';
    } else if (score >= 5) {
      summary += ' This suggests a moderate level with room for improvement.';
    } else {
      summary += ' This suggests there may be significant areas to work on.';
    }

    return { score, summary };
  }

  // Internal helper to sum prices of CustomPlanItems and update CustomPlan.total_cost
  _calculateCustomPlanTotal(planId) {
    const plans = this._getFromStorage('custom_plans');
    const items = this._getFromStorage('custom_plan_items');

    const plan = plans.find(p => p.id === planId) || null;
    if (!plan) return null;

    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.planId === planId) {
        total += it.price_snapshot || 0;
      }
    }

    plan.total_cost = total;
    plan.updated_at = this._nowISO();
    this._saveToStorage('custom_plans', plans);
    return plan;
  }

  // ==========================
  // Core interface implementations
  // ==========================

  // getHomePageOverview()
  getHomePageOverview() {
    const coaches = this._getFromStorage('coaches').filter(c => c.is_active);
    const packages = this._getFromStorage('coaching_packages').filter(p => p.is_active);
    const challenges = this._getFromStorage('challenges').filter(c => c.is_active);
    const articles = this._getFromStorage('blog_articles');

    const featuredCoaches = coaches
      .slice()
      .sort((a, b) => {
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        if (br !== ar) return br - ar;
        const av = a.review_count || 0;
        const bv = b.review_count || 0;
        return bv - av;
      })
      .slice(0, 3);

    const popularPackages = packages
      .slice()
      .sort((a, b) => {
        const ap = a.popularity_score || 0;
        const bp = b.popularity_score || 0;
        if (bp !== ap) return bp - ap;
        const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 3);

    const now = Date.now();
    const currentChallenges = challenges
      .slice()
      .sort((a, b) => {
        const asd = a.start_date ? new Date(a.start_date).getTime() : now;
        const bsd = b.start_date ? new Date(b.start_date).getTime() : now;
        return asd - bsd;
      })
      .slice(0, 5);

    const recentArticles = articles
      .slice()
      .sort((a, b) => {
        const ad = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const bd = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 5);

    const heroMessage = 'Design a balanced life with coaching, challenges, and practical tools.';

    return {
      heroMessage,
      featuredCoaches,
      popularPackages,
      currentChallenges,
      recentArticles
    };
  }

  // searchAllContent(query, limitPerType = 5)
  searchAllContent(query, limitPerType) {
    const q = (query || '').toLowerCase().trim();
    const limit = typeof limitPerType === 'number' && limitPerType > 0 ? limitPerType : 5;

    function matches(str) {
      if (!q) return true;
      if (!str) return false;
      return String(str).toLowerCase().indexOf(q) !== -1;
    }

    const coachesAll = this._getFromStorage('coaches');
    const packagesAll = this._getFromStorage('coaching_packages');
    const challengesAll = this._getFromStorage('challenges');
    const worksheetsAll = this._getFromStorage('worksheets');
    const articlesAll = this._getFromStorage('blog_articles');

    const coaches = coachesAll.filter(c => {
      if (!q) return true;
      if (matches(c.name) || matches(c.bio)) return true;
      if (Array.isArray(c.specialties)) {
        for (let i = 0; i < c.specialties.length; i++) {
          if (matches(c.specialties[i])) return true;
        }
      }
      return false;
    }).slice(0, limit);

    const packages = packagesAll.filter(p => {
      if (!q) return true;
      if (matches(p.name) || matches(p.description) || matches(p.topic)) return true;
      return false;
    }).slice(0, limit);

    const challenges = challengesAll.filter(ch => {
      if (!q) return true;
      if (matches(ch.title) || matches(ch.description) || matches(ch.topic) || matches(ch.goals_overview)) return true;
      return false;
    }).slice(0, limit);

    const worksheets = worksheetsAll.filter(w => {
      if (!q) return true;
      if (matches(w.title) || matches(w.description) || matches(w.topic) || matches(w.audience)) return true;
      return false;
    }).slice(0, limit);

    const articles = articlesAll.filter(a => {
      if (!q) return true;
      if (matches(a.title) || matches(a.excerpt) || matches(a.body)) return true;
      if (Array.isArray(a.topic_tags)) {
        for (let i = 0; i < a.topic_tags.length; i++) {
          if (matches(a.topic_tags[i])) return true;
        }
      }
      return false;
    }).slice(0, limit);

    return { coaches, packages, challenges, worksheets, articles };
  }

  // ==========================
  // Coaches & Sessions
  // ==========================

  // getCoachFilterOptions()
  getCoachFilterOptions() {
    const coaches = this._getFromStorage('coaches');

    const specialtySet = new Set();
    const sessionLengthSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < coaches.length; i++) {
      const c = coaches[i];
      if (Array.isArray(c.specialties)) {
        for (let j = 0; j < c.specialties.length; j++) {
          specialtySet.add(c.specialties[j]);
        }
      }
      if (Array.isArray(c.session_lengths_minutes)) {
        for (let j = 0; j < c.session_lengths_minutes.length; j++) {
          sessionLengthSet.add(c.session_lengths_minutes[j]);
        }
      }
      const price = c.price_per_session;
      if (typeof price === 'number') {
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
      }
    }

    const specialties = Array.from(specialtySet).map(v => ({ value: v, label: v }));
    const sessionLengthsMinutes = Array.from(sessionLengthSet).sort((a, b) => a - b);

    const priceRange = {
      minPrice: minPrice === null ? 0 : minPrice,
      maxPrice: maxPrice === null ? 0 : maxPrice,
      currency: 'USD'
    };

    const ratingOptions = [
      { minRating: 0, label: 'Any rating' },
      { minRating: 4, label: '4+ stars' },
      { minRating: 4.5, label: '4.5+ stars' },
      { minRating: 5, label: '5 stars' }
    ];

    const reviewCountOptions = [
      { minReviews: 0, label: 'Any number of reviews' },
      { minReviews: 5, label: '5+ reviews' },
      { minReviews: 10, label: '10+ reviews' },
      { minReviews: 25, label: '25+ reviews' }
    ];

    const offerOptions = [
      { value: 'free_consultation', label: 'Free Consultation' }
    ];

    const sortOptions = [
      { value: 'highest_rated', label: 'Highest Rated' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'most_reviews', label: 'Most Reviews' }
    ];

    return {
      specialties,
      priceRange,
      sessionLengthsMinutes,
      ratingOptions,
      reviewCountOptions,
      offerOptions,
      sortOptions
    };
  }

  // searchCoaches(filters, sortBy, page = 1, pageSize = 20)
  searchCoaches(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    let results = this._getFromStorage('coaches');

    if (f.onlyActive !== false) {
      results = results.filter(c => c.is_active);
    }

    if (f.specialty) {
      const sp = String(f.specialty).toLowerCase();
      results = results.filter(c => {
        if (!Array.isArray(c.specialties)) return false;
        for (let i = 0; i < c.specialties.length; i++) {
          if (String(c.specialties[i]).toLowerCase() === sp) return true;
        }
        return false;
      });
    }

    if (typeof f.minPrice === 'number') {
      results = results.filter(c => typeof c.price_per_session === 'number' && c.price_per_session >= f.minPrice);
    }

    if (typeof f.maxPrice === 'number') {
      results = results.filter(c => typeof c.price_per_session === 'number' && c.price_per_session <= f.maxPrice);
    }

    if (typeof f.sessionLengthMinutes === 'number') {
      const sl = f.sessionLengthMinutes;
      results = results.filter(c => Array.isArray(c.session_lengths_minutes) && c.session_lengths_minutes.indexOf(sl) !== -1);
    }

    if (typeof f.minRating === 'number') {
      results = results.filter(c => typeof c.average_rating === 'number' && c.average_rating >= f.minRating);
    }

    if (typeof f.minReviewCount === 'number') {
      results = results.filter(c => typeof c.review_count === 'number' && c.review_count >= f.minReviewCount);
    }

    if (typeof f.offersFreeConsultation === 'boolean') {
      results = results.filter(c => !!c.offers_free_consultation === f.offersFreeConsultation);
    }

    const sort = sortBy || 'highest_rated';
    results = results.slice();

    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.price_per_session || 0) - (b.price_per_session || 0));
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.price_per_session || 0) - (a.price_per_session || 0));
    } else if (sort === 'most_reviews') {
      results.sort((a, b) => {
        const ar = a.review_count || 0;
        const br = b.review_count || 0;
        if (br !== ar) return br - ar;
        const arat = a.average_rating || 0;
        const brat = b.average_rating || 0;
        return brat - arat;
      });
    } else {
      // highest_rated default
      results.sort((a, b) => {
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        if (br !== ar) return br - ar;
        const av = a.review_count || 0;
        const bv = b.review_count || 0;
        return bv - av;
      });
    }

    const totalCount = results.length;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    return { results: paged, totalCount };
  }

  // getCoachProfile(coachId)
  getCoachProfile(coachId) {
    const coaches = this._getFromStorage('coaches');
    const coach = coaches.find(c => c.id === coachId) || null;

    const reviewsAll = this._getFromStorage('coach_reviews');
    const reviewsForCoach = reviewsAll.filter(r => r.coachId === coachId);

    // Resolve foreign key coachId -> coach
    const reviews = reviewsForCoach.map(r => ({
      ...r,
      coach: coach
    }));

    const averageRating = coach && typeof coach.average_rating === 'number' ? coach.average_rating : 0;
    const reviewCount = coach && typeof coach.review_count === 'number' ? coach.review_count : reviewsForCoach.length;
    const availableSessionLengthsMinutes = coach && Array.isArray(coach.session_lengths_minutes)
      ? coach.session_lengths_minutes.slice()
      : [];

    return {
      coach,
      reviews,
      averageRating,
      reviewCount,
      availableSessionLengthsMinutes
    };
  }

  // getCoachAvailability(coachId, startDate, endDate, sessionLengthMinutes)
  getCoachAvailability(coachId, startDate, endDate, sessionLengthMinutes) {
    const slots = this._getFromStorage('coach_availability_slots');
    const coaches = this._getFromStorage('coaches');
    const coach = coaches.find(c => c.id === coachId) || null;

    const start = this._parseDate(startDate);
    const end = this._parseDate(endDate);

    let filtered = slots.filter(s => s.coachId === coachId && !s.is_booked);

    if (start) {
      filtered = filtered.filter(s => {
        const d = this._parseDate(s.start_datetime);
        return d && d >= start;
      });
    }

    if (end) {
      filtered = filtered.filter(s => {
        const d = this._parseDate(s.start_datetime);
        return d && d <= end;
      });
    }

    if (typeof sessionLengthMinutes === 'number') {
      filtered = filtered.filter(s => {
        const sd = this._parseDate(s.start_datetime);
        const ed = this._parseDate(s.end_datetime);
        if (!sd || !ed) return false;
        const dur = (ed.getTime() - sd.getTime()) / 60000;
        return dur >= sessionLengthMinutes;
      });
    }

    // Resolve coach foreign key
    const resolved = filtered.map(s => ({
      ...s,
      coach: coach
    }));

    return resolved;
  }

  // bookCoachSession(coachId, availabilitySlotId, sessionLengthMinutes, topic, clientName, clientEmail, goalsNotes)
  bookCoachSession(coachId, availabilitySlotId, sessionLengthMinutes, topic, clientName, clientEmail, goalsNotes) {
    const coaches = this._getFromStorage('coaches');
    const slots = this._getFromStorage('coach_availability_slots');
    const bookings = this._getFromStorage('session_bookings');

    const coach = coaches.find(c => c.id === coachId) || null;
    if (!coach) {
      return { success: false, booking: null, message: 'Coach not found.' };
    }

    const slotIndex = slots.findIndex(s => s.id === availabilitySlotId && s.coachId === coachId);
    if (slotIndex === -1) {
      return { success: false, booking: null, message: 'Availability slot not found for this coach.' };
    }

    const slot = slots[slotIndex];
    if (slot.is_booked) {
      return { success: false, booking: null, message: 'This time slot is already booked.' };
    }

    const sd = this._parseDate(slot.start_datetime);
    const ed = this._parseDate(slot.end_datetime);
    if (!sd || !ed) {
      return { success: false, booking: null, message: 'Invalid slot time information.' };
    }

    const dur = (ed.getTime() - sd.getTime()) / 60000;
    if (typeof sessionLengthMinutes === 'number' && sessionLengthMinutes > dur) {
      return { success: false, booking: null, message: 'Requested session length exceeds available slot duration.' };
    }

    const price = coach.price_per_session || 0;

    const booking = {
      id: this._generateId('session_booking'),
      coachId: coachId,
      availabilitySlotId: availabilitySlotId,
      session_length_minutes: sessionLengthMinutes,
      topic: topic || null,
      start_datetime: slot.start_datetime,
      price: price,
      client_name: clientName,
      client_email: clientEmail,
      goals_notes: goalsNotes || null,
      status: 'confirmed',
      created_at: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('session_bookings', bookings);

    // Mark slot as booked
    slots[slotIndex].is_booked = true;
    this._saveToStorage('coach_availability_slots', slots);

    const bookingResolved = {
      ...booking,
      coach: coach,
      availabilitySlot: slot
    };

    return { success: true, booking: bookingResolved, message: 'Session booked successfully.' };
  }

  // sendCoachContactMessage(coachId, name, email, preferredTimeOfDay, message, isFreeConsultationRequest = false)
  sendCoachContactMessage(coachId, name, email, preferredTimeOfDay, message, isFreeConsultationRequest) {
    const coaches = this._getFromStorage('coaches');
    const coach = coaches.find(c => c.id === coachId) || null;
    if (!coach) {
      return { success: false, contactMessage: null, messageText: 'Coach not found.' };
    }

    const validTimes = ['morning', 'afternoon', 'evening', 'anytime'];
    let pTime = preferredTimeOfDay || null;
    if (pTime && validTimes.indexOf(pTime) === -1) {
      pTime = 'anytime';
    }

    const messages = this._getFromStorage('coach_contact_messages');

    const contactMessage = {
      id: this._generateId('coach_contact'),
      coachId: coachId,
      name: name,
      email: email,
      preferred_time_of_day: pTime,
      message: message,
      is_free_consultation_request: !!isFreeConsultationRequest,
      created_at: this._nowISO()
    };

    messages.push(contactMessage);
    this._saveToStorage('coach_contact_messages', messages);

    const resolved = { ...contactMessage, coach: coach };

    return {
      success: true,
      contactMessage: resolved,
      messageText: 'Your message has been sent to the coach.'
    };
  }

  // ==========================
  // Coaching Packages & Cart
  // ==========================

  // getPackageFilterOptions()
  getPackageFilterOptions() {
    const packages = this._getFromStorage('coaching_packages');

    const topicSet = new Set();
    const sessionsSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (p.topic) topicSet.add(p.topic);
      if (typeof p.sessions_count === 'number') sessionsSet.add(p.sessions_count);
      const price = p.price;
      if (typeof price === 'number') {
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
      }
    }

    const topics = Array.from(topicSet).map(v => ({ value: v, label: v }));
    const sessionCountOptions = Array.from(sessionsSet).sort((a, b) => a - b);

    const priceRange = {
      minPrice: minPrice === null ? 0 : minPrice,
      maxPrice: maxPrice === null ? 0 : maxPrice,
      currency: 'USD'
    };

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' }
    ];

    return {
      topics,
      sessionCountOptions,
      priceRange,
      sortOptions
    };
  }

  // searchCoachingPackages(filters, sortBy, page = 1, pageSize = 20)
  searchCoachingPackages(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    let results = this._getFromStorage('coaching_packages');

    if (f.onlyActive !== false) {
      results = results.filter(p => p.is_active);
    }

    if (f.topic) {
      const topic = String(f.topic);
      results = results.filter(p => p.topic === topic);
    }

    if (typeof f.minSessionsCount === 'number') {
      results = results.filter(p => typeof p.sessions_count === 'number' && p.sessions_count >= f.minSessionsCount);
    }

    if (typeof f.maxSessionsCount === 'number') {
      results = results.filter(p => typeof p.sessions_count === 'number' && p.sessions_count <= f.maxSessionsCount);
    }

    if (typeof f.exactSessionsCount === 'number') {
      results = results.filter(p => p.sessions_count === f.exactSessionsCount);
    }

    if (typeof f.minPrice === 'number') {
      results = results.filter(p => typeof p.price === 'number' && p.price >= f.minPrice);
    }

    if (typeof f.maxPrice === 'number') {
      results = results.filter(p => typeof p.price === 'number' && p.price <= f.maxPrice);
    }

    const sort = sortBy || 'price_low_to_high';
    results = results.slice();

    if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'popularity_desc') {
      results.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else {
      // price_low_to_high default
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    const totalCount = results.length;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    return { results: paged, totalCount };
  }

  // getCoachingPackageDetail(packageId)
  getCoachingPackageDetail(packageId) {
    const packages = this._getFromStorage('coaching_packages');
    const pkg = packages.find(p => p.id === packageId) || null;

    if (!pkg) {
      return { package: null, relatedPackages: [] };
    }

    const sameTopic = packages.filter(p => p.id !== pkg.id && p.topic === pkg.topic && p.is_active);
    const relatedPackages = sameTopic
      .slice()
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 3);

    return { package: pkg, relatedPackages };
  }

  // getCart()
  getCart() {
    const carts = this._getFromStorage('cart');
    const cart = carts[0] || null;
    if (!cart) {
      return { cart: null, items: [], subtotal: 0 };
    }

    const recalc = this._recalculateCartTotals(cart);
    return {
      cart: recalc.cart,
      items: recalc.items,
      subtotal: recalc.subtotal
    };
  }

  // addPackageToCart(packageId, quantity = 1)
  addPackageToCart(packageId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const packages = this._getFromStorage('coaching_packages');
    const pkg = packages.find(p => p.id === packageId && p.is_active) || null;
    if (!pkg) {
      return { success: false, cart: null, items: [], message: 'Package not found or inactive.' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let existingIndex = -1;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cartId === cart.id && cartItems[i].packageId === packageId) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex !== -1) {
      cartItems[existingIndex].quantity += qty;
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        packageId: packageId,
        name_snapshot: pkg.name,
        unit_price: pkg.price || 0,
        quantity: qty,
        added_at: this._nowISO()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);

    const recalc = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: recalc.cart,
      items: recalc.items,
      message: 'Package added to cart.'
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);

    if (itemIndex === -1) {
      const current = this.getCart();
      return {
        cart: current.cart,
        items: current.items,
        subtotal: current.subtotal
      };
    }

    const cartId = cartItems[itemIndex].cartId;

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      cartItems[itemIndex].quantity = quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find(c => c.id === cartId) || null;
    if (!cart) {
      return { cart: null, items: [], subtotal: 0 };
    }

    const recalc = this._recalculateCartTotals(cart);

    return {
      cart: recalc.cart,
      items: recalc.items,
      subtotal: recalc.subtotal
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      const current = this.getCart();
      return {
        cart: current.cart,
        items: current.items,
        subtotal: current.subtotal
      };
    }

    const cartId = cartItems[itemIndex].cartId;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const cart = carts.find(c => c.id === cartId) || null;
    if (!cart) {
      return { cart: null, items: [], subtotal: 0 };
    }

    const recalc = this._recalculateCartTotals(cart);
    return {
      cart: recalc.cart,
      items: recalc.items,
      subtotal: recalc.subtotal
    };
  }

  // ==========================
  // Blog & Reading Lists
  // ==========================

  // getBlogFilterOptions()
  getBlogFilterOptions() {
    const articles = this._getFromStorage('blog_articles');

    const topicSet = new Set();
    const audienceSet = new Set();

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (Array.isArray(a.topic_tags)) {
        for (let j = 0; j < a.topic_tags.length; j++) {
          topicSet.add(a.topic_tags[j]);
        }
      }
      if (Array.isArray(a.audience_tags)) {
        for (let j = 0; j < a.audience_tags.length; j++) {
          audienceSet.add(a.audience_tags[j]);
        }
      }
    }

    const topicTags = Array.from(topicSet).map(v => ({ value: v, label: v }));
    const audienceTags = Array.from(audienceSet).map(v => ({ value: v, label: v }));

    const dateRanges = [
      { value: 'last_7_days', label: 'Last 7 days', daysBack: 7 },
      { value: 'last_30_days', label: 'Last 30 days', daysBack: 30 },
      { value: 'last_6_months', label: 'Last 6 months', daysBack: 182 },
      { value: 'last_12_months', label: 'Last 12 months', daysBack: 365 }
    ];

    const readTimeOptions = [
      { minMinutes: 0, label: 'Any length' },
      { minMinutes: 2, label: '2+ minutes' },
      { minMinutes: 4, label: '4+ minutes' },
      { minMinutes: 8, label: '8+ minutes' }
    ];

    const sortOptions = [
      { value: 'newest', label: 'Newest first' },
      { value: 'oldest', label: 'Oldest first' },
      { value: 'read_time_asc', label: 'Shortest to longest' },
      { value: 'read_time_desc', label: 'Longest to shortest' }
    ];

    return {
      topicTags,
      audienceTags,
      dateRanges,
      readTimeOptions,
      sortOptions
    };
  }

  // searchBlogArticles(query, filters, sortBy, page = 1, pageSize = 20)
  searchBlogArticles(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase().trim();
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    const articlesAll = this._getFromStorage('blog_articles');

    let results = articlesAll;

    if (q) {
      results = results.filter(a => {
        const fields = [a.title, a.excerpt, a.body];
        for (let i = 0; i < fields.length; i++) {
          if (fields[i] && String(fields[i]).toLowerCase().indexOf(q) !== -1) return true;
        }
        if (Array.isArray(a.topic_tags)) {
          for (let i = 0; i < a.topic_tags.length; i++) {
            const tag = String(a.topic_tags[i]).toLowerCase();
            if (tag.indexOf(q) !== -1) return true;
            // Also handle common separator variations like spaces vs underscores/hyphens
            const normalizedTag = tag.replace(/[_-]+/g, ' ');
            const normalizedQuery = q.replace(/[_-]+/g, ' ');
            if (normalizedTag.indexOf(normalizedQuery) !== -1) return true;
          }
        }
        return false;
      });
    }

    if (Array.isArray(f.topicTags) && f.topicTags.length > 0) {
      const tagSet = new Set(f.topicTags.map(t => String(t)));
      results = results.filter(a => {
        if (!Array.isArray(a.topic_tags)) return false;
        for (let i = 0; i < a.topic_tags.length; i++) {
          if (tagSet.has(a.topic_tags[i])) return true;
        }
        return false;
      });
    }

    if (Array.isArray(f.audienceTags) && f.audienceTags.length > 0) {
      const tagSet = new Set(f.audienceTags.map(t => String(t)));
      results = results.filter(a => {
        if (!Array.isArray(a.audience_tags)) return false;
        for (let i = 0; i < a.audience_tags.length; i++) {
          if (tagSet.has(a.audience_tags[i])) return true;
        }
        return false;
      });
    }

    if (f.dateFrom) {
      const df = this._parseDate(f.dateFrom);
      if (df) {
        results = results.filter(a => {
          const d = this._parseDate(a.publish_date);
          return d && d >= df;
        });
      }
    }

    if (f.dateTo) {
      const dt = this._parseDate(f.dateTo);
      if (dt) {
        results = results.filter(a => {
          const d = this._parseDate(a.publish_date);
          return d && d <= dt;
        });
      }
    }

    if (typeof f.minReadTimeMinutes === 'number') {
      results = results.filter(a => typeof a.read_time_minutes === 'number' && a.read_time_minutes >= f.minReadTimeMinutes);
    }

    if (typeof f.maxReadTimeMinutes === 'number') {
      results = results.filter(a => typeof a.read_time_minutes === 'number' && a.read_time_minutes <= f.maxReadTimeMinutes);
    }

    const sort = sortBy || 'newest';
    results = results.slice();

    if (sort === 'oldest') {
      results.sort((a, b) => {
        const ad = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const bd = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return ad - bd;
      });
    } else if (sort === 'read_time_asc') {
      results.sort((a, b) => (a.read_time_minutes || 0) - (b.read_time_minutes || 0));
    } else if (sort === 'read_time_desc') {
      results.sort((a, b) => (b.read_time_minutes || 0) - (a.read_time_minutes || 0));
    } else {
      // newest
      results.sort((a, b) => {
        const ad = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const bd = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return bd - ad;
      });
    }

    const totalCount = results.length;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    return { results: paged, totalCount };
  }

  // getBlogArticleDetail(articleId)
  getBlogArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(a => a.id === articleId) || null;

    if (!article) {
      return { article: null, isBookmarked: false, relatedArticles: [] };
    }

    const saved = this._getFromStorage('saved_articles');
    const isBookmarked = saved.some(sa => sa.articleId === articleId);

    const related = articles.filter(a => a.id !== article.id);
    let relatedArticles = [];
    if (Array.isArray(article.topic_tags) && article.topic_tags.length > 0) {
      const tags = new Set(article.topic_tags.map(t => String(t)));
      relatedArticles = related.filter(a => {
        if (!Array.isArray(a.topic_tags)) return false;
        for (let i = 0; i < a.topic_tags.length; i++) {
          if (tags.has(a.topic_tags[i])) return true;
        }
        return false;
      });
    } else {
      relatedArticles = related;
    }

    relatedArticles = relatedArticles
      .slice()
      .sort((a, b) => {
        const ad = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const bd = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 5);

    return { article, isBookmarked, relatedArticles };
  }

  // bookmarkArticle(articleId)
  bookmarkArticle(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { success: false, savedArticle: null };
    }

    const saved = this._getFromStorage('saved_articles');
    const existing = saved.find(sa => sa.articleId === articleId) || null;
    if (existing) {
      return { success: true, savedArticle: existing };
    }

    const savedArticle = {
      id: this._generateId('saved_article'),
      articleId: articleId,
      saved_at: this._nowISO()
    };

    saved.push(savedArticle);
    this._saveToStorage('saved_articles', saved);

    return { success: true, savedArticle };
  }

  // unbookmarkArticle(articleId)
  unbookmarkArticle(articleId) {
    let saved = this._getFromStorage('saved_articles');
    const before = saved.length;
    saved = saved.filter(sa => sa.articleId !== articleId);
    this._saveToStorage('saved_articles', saved);
    const success = saved.length !== before;
    return { success };
  }

  // getReadingLists()
  getReadingLists() {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    const result = [];
    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      const count = items.filter(it => it.readingListId === list.id).length;
      result.push({ readingList: list, articleCount: count });
    }
    return result;
  }

  // getReadingListDetail(readingListId)
  getReadingListDetail(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const list = lists.find(l => l.id === readingListId) || null;
    if (!list) {
      return { readingList: null, articles: [] };
    }

    const items = this._getFromStorage('reading_list_items').filter(it => it.readingListId === readingListId);
    const articles = this._getFromStorage('blog_articles');

    const resultArticles = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const article = articles.find(a => a.id === item.articleId);
      if (article) resultArticles.push(article);
    }

    return { readingList: list, articles: resultArticles };
  }

  // createReadingList(name, description)
  createReadingList(name, description) {
    const lists = this._getFromStorage('reading_lists');
    const list = {
      id: this._generateId('reading_list'),
      name: name,
      description: description || null,
      created_at: this._nowISO(),
      updated_at: null
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  // renameReadingList(readingListId, newName)
  renameReadingList(readingListId, newName) {
    const lists = this._getFromStorage('reading_lists');
    const idx = lists.findIndex(l => l.id === readingListId);
    if (idx === -1) return null;
    lists[idx].name = newName;
    lists[idx].updated_at = this._nowISO();
    this._saveToStorage('reading_lists', lists);
    return lists[idx];
  }

  // deleteReadingList(readingListId)
  deleteReadingList(readingListId) {
    let lists = this._getFromStorage('reading_lists');
    const before = lists.length;
    lists = lists.filter(l => l.id !== readingListId);
    this._saveToStorage('reading_lists', lists);

    let items = this._getFromStorage('reading_list_items');
    items = items.filter(it => it.readingListId !== readingListId);
    this._saveToStorage('reading_list_items', items);

    const success = lists.length !== before;
    return { success };
  }

  // addArticleToReadingList(readingListId, articleId)
  addArticleToReadingList(readingListId, articleId) {
    const lists = this._getFromStorage('reading_lists');
    const list = lists.find(l => l.id === readingListId) || null;
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(a => a.id === articleId) || null;

    if (!list || !article) {
      return { success: false, item: null };
    }

    const items = this._getFromStorage('reading_list_items');
    const existing = items.find(it => it.readingListId === readingListId && it.articleId === articleId) || null;
    if (existing) {
      return { success: true, item: existing };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      readingListId: readingListId,
      articleId: articleId,
      added_at: this._nowISO()
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return { success: true, item };
  }

  // removeArticleFromReadingList(readingListId, articleId)
  removeArticleFromReadingList(readingListId, articleId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter(it => !(it.readingListId === readingListId && it.articleId === articleId));
    this._saveToStorage('reading_list_items', items);
    const success = items.length !== before;
    return { success };
  }

  // ==========================
  // Challenges
  // ==========================

  // getChallengeFilterOptions()
  getChallengeFilterOptions() {
    const challenges = this._getFromStorage('challenges');

    const topicSet = new Set();
    const durationSet = new Set();

    for (let i = 0; i < challenges.length; i++) {
      const ch = challenges[i];
      if (ch.topic) topicSet.add(ch.topic);
      if (typeof ch.duration_days === 'number') durationSet.add(ch.duration_days);
    }

    const topics = Array.from(topicSet).map(v => ({ value: v, label: v }));
    const durationOptions = Array.from(durationSet)
      .sort((a, b) => a - b)
      .map(d => ({ days: d, label: d + ' days' }));

    const startDateRanges = [
      { value: 'next_7_days', label: 'Starting in next 7 days', daysAhead: 7 },
      { value: 'next_14_days', label: 'Starting in next 14 days', daysAhead: 14 },
      { value: 'next_30_days', label: 'Starting in next 30 days', daysAhead: 30 }
    ];

    const sortOptions = [
      { value: 'start_date_asc', label: 'Start date: Soonest first' },
      { value: 'start_date_desc', label: 'Start date: Latest first' },
      { value: 'popularity_desc', label: 'Most popular' }
    ];

    return {
      topics,
      durationOptions,
      startDateRanges,
      sortOptions
    };
  }

  // searchChallenges(filters, sortBy, page = 1, pageSize = 20)
  searchChallenges(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    let results = this._getFromStorage('challenges');

    if (f.onlyActive !== false) {
      results = results.filter(ch => ch.is_active);
    }

    if (f.topic) {
      const topic = String(f.topic);
      results = results.filter(ch => ch.topic === topic);
    }

    if (typeof f.minDurationDays === 'number') {
      results = results.filter(ch => typeof ch.duration_days === 'number' && ch.duration_days >= f.minDurationDays);
    }

    if (typeof f.maxDurationDays === 'number') {
      results = results.filter(ch => typeof ch.duration_days === 'number' && ch.duration_days <= f.maxDurationDays);
    }

    if (f.startDateFrom) {
      const df = this._parseDate(f.startDateFrom);
      if (df) {
        results = results.filter(ch => {
          const d = this._parseDate(ch.start_date);
          return d && d >= df;
        });
      }
    }

    if (f.startDateTo) {
      const dt = this._parseDate(f.startDateTo);
      if (dt) {
        results = results.filter(ch => {
          const d = this._parseDate(ch.start_date);
          return d && d <= dt;
        });
      }
    }

    const sort = sortBy || 'start_date_asc';
    results = results.slice();

    if (sort === 'start_date_desc') {
      results.sort((a, b) => {
        const ad = a.start_date ? new Date(a.start_date).getTime() : 0;
        const bd = b.start_date ? new Date(b.start_date).getTime() : 0;
        return bd - ad;
      });
    } else if (sort === 'popularity_desc') {
      results.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else {
      // start_date_asc default
      results.sort((a, b) => {
        const ad = a.start_date ? new Date(a.start_date).getTime() : 0;
        const bd = b.start_date ? new Date(b.start_date).getTime() : 0;
        return ad - bd;
      });
    }

    const totalCount = results.length;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    return { results: paged, totalCount };
  }

  // getChallengeDetail(challengeId)
  getChallengeDetail(challengeId) {
    const challenges = this._getFromStorage('challenges');
    const challenge = challenges.find(ch => ch.id === challengeId) || null;
    return challenge;
  }

  // enrollInChallenge(challengeId, name, email, reminderEmailEnabled, reminderSmsEnabled, reminderFrequency, reminderTime)
  enrollInChallenge(challengeId, name, email, reminderEmailEnabled, reminderSmsEnabled, reminderFrequency, reminderTime) {
    const challenges = this._getFromStorage('challenges');
    const challenge = challenges.find(ch => ch.id === challengeId) || null;

    if (!challenge) {
      return { success: false, enrollment: null };
    }

    const validFreq = ['none', 'daily', 'weekly'];
    let freq = reminderFrequency;
    if (validFreq.indexOf(freq) === -1) freq = 'none';

    const enrollments = this._getFromStorage('challenge_enrollments');

    const enrollment = {
      id: this._generateId('challenge_enrollment'),
      challengeId: challengeId,
      name: name,
      email: email,
      reminder_email_enabled: !!reminderEmailEnabled,
      reminder_sms_enabled: !!reminderSmsEnabled,
      reminder_frequency: freq,
      reminder_time: reminderTime || null,
      enrolled_at: this._nowISO(),
      status: 'active'
    };

    enrollments.push(enrollment);
    this._saveToStorage('challenge_enrollments', enrollments);

    const resolved = { ...enrollment, challenge: challenge };

    return { success: true, enrollment: resolved };
  }

  // ==========================
  // Assessments & Dashboard
  // ==========================

  // getAssessmentFilterOptions()
  getAssessmentFilterOptions() {
    const assessments = this._getFromStorage('assessments');

    const catSet = new Set();
    let minQuestions = null;
    let maxQuestions = null;

    for (let i = 0; i < assessments.length; i++) {
      const a = assessments[i];
      if (a.category) catSet.add(a.category);
      if (typeof a.question_count === 'number') {
        if (minQuestions === null || a.question_count < minQuestions) minQuestions = a.question_count;
        if (maxQuestions === null || a.question_count > maxQuestions) maxQuestions = a.question_count;
      }
    }

    const categories = Array.from(catSet).map(v => ({ value: v, label: v }));

    const questionCountRange = {
      minQuestions: minQuestions === null ? 0 : minQuestions,
      maxQuestions: maxQuestions === null ? 0 : maxQuestions
    };

    const sortOptions = [
      { value: 'recommended', label: 'Recommended' },
      { value: 'question_count_asc', label: 'Fewest questions' },
      { value: 'question_count_desc', label: 'Most questions' }
    ];

    return {
      categories,
      questionCountRange,
      sortOptions
    };
  }

  // searchAssessments(filters, sortBy, page = 1, pageSize = 20)
  searchAssessments(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    let results = this._getFromStorage('assessments');

    if (f.onlyActive !== false) {
      results = results.filter(a => a.is_active);
    }

    if (f.category) {
      const cat = String(f.category);
      results = results.filter(a => a.category === cat);
    }

    if (typeof f.minQuestions === 'number') {
      results = results.filter(a => typeof a.question_count === 'number' && a.question_count >= f.minQuestions);
    }

    if (typeof f.maxQuestions === 'number') {
      results = results.filter(a => typeof a.question_count === 'number' && a.question_count <= f.maxQuestions);
    }

    const sort = sortBy || 'recommended';
    results = results.slice();

    if (sort === 'question_count_asc') {
      results.sort((a, b) => (a.question_count || 0) - (b.question_count || 0));
    } else if (sort === 'question_count_desc') {
      results.sort((a, b) => (b.question_count || 0) - (a.question_count || 0));
    } else {
      // recommended: keep insertion order
    }

    const totalCount = results.length;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    return { results: paged, totalCount };
  }

  // getAssessmentDetail(assessmentId)
  getAssessmentDetail(assessmentId) {
    const assessments = this._getFromStorage('assessments');
    const assessment = assessments.find(a => a.id === assessmentId) || null;
    const questionsAll = this._getFromStorage('assessment_questions');
    const questions = questionsAll
      .filter(q => q.assessmentId === assessmentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return { assessment, questions };
  }

  // startAssessment(assessmentId)
  startAssessment(assessmentId) {
    const assessments = this._getFromStorage('assessments');
    const assessment = assessments.find(a => a.id === assessmentId) || null;
    if (!assessment) return null;

    const instances = this._getFromStorage('assessment_instances');

    const instance = {
      id: this._generateId('assessment_instance'),
      assessmentId: assessmentId,
      started_at: this._nowISO(),
      completed_at: null,
      responses: [],
      score: null,
      result_summary: null,
      saved_to_dashboard: false
    };

    instances.push(instance);
    this._saveToStorage('assessment_instances', instances);
    return instance;
  }

  // completeAssessment(assessmentInstanceId, responses)
  completeAssessment(assessmentInstanceId, responses) {
    const instances = this._getFromStorage('assessment_instances');
    const idx = instances.findIndex(i => i.id === assessmentInstanceId);
    if (idx === -1) {
      return { success: false, instance: null };
    }

    const instance = instances[idx];
    const resArray = Array.isArray(responses) ? responses : [];

    instance.responses = resArray;
    instance.completed_at = this._nowISO();

    const scoreRes = this._calculateAssessmentScore(instance.assessmentId, resArray);
    instance.score = scoreRes.score;
    instance.result_summary = scoreRes.summary;

    instances[idx] = instance;
    this._saveToStorage('assessment_instances', instances);

    return { success: true, instance };
  }

  // saveAssessmentResultToDashboard(assessmentInstanceId)
  saveAssessmentResultToDashboard(assessmentInstanceId) {
    const instances = this._getFromStorage('assessment_instances');
    const idx = instances.findIndex(i => i.id === assessmentInstanceId);
    if (idx === -1) return null;
    instances[idx].saved_to_dashboard = true;
    this._saveToStorage('assessment_instances', instances);
    return instances[idx];
  }

  // getDashboardOverview()
  getDashboardOverview() {
    const instances = this._getFromStorage('assessment_instances');
    const assessments = this._getFromStorage('assessments');
    const plans = this._getFromStorage('custom_plans');
    const savedWorksheets = this._getFromStorage('saved_worksheets');
    const worksheets = this._getFromStorage('worksheets');

    const savedAssessmentsRaw = instances.filter(i => i.saved_to_dashboard);
    const savedAssessments = savedAssessmentsRaw.map(i => ({
      ...i,
      assessment: assessments.find(a => a.id === i.assessmentId) || null
    }));

    const savedPlans = plans.slice();

    const savedWorksheetsResolved = [];
    for (let i = 0; i < savedWorksheets.length; i++) {
      const sw = savedWorksheets[i];
      const w = worksheets.find(wk => wk.id === sw.worksheetId) || null;
      savedWorksheetsResolved.push({ savedWorksheet: sw, worksheet: w });
    }

    const stats = {
      assessmentCount: savedAssessments.length,
      planCount: savedPlans.length,
      worksheetCount: savedWorksheetsResolved.length
    };

    return {
      savedAssessments,
      savedPlans,
      savedWorksheets: savedWorksheetsResolved,
      stats
    };
  }

  // getAssessmentResultDetail(assessmentInstanceId)
  getAssessmentResultDetail(assessmentInstanceId) {
    const instances = this._getFromStorage('assessment_instances');
    const instance = instances.find(i => i.id === assessmentInstanceId) || null;
    if (!instance) {
      return { instance: null, assessment: null };
    }
    const assessments = this._getFromStorage('assessments');
    const assessment = assessments.find(a => a.id === instance.assessmentId) || null;
    return { instance, assessment };
  }

  // ==========================
  // Worksheets & Resources
  // ==========================

  // getWorksheetFilterOptions()
  getWorksheetFilterOptions() {
    const worksheets = this._getFromStorage('worksheets');

    const topicSet = new Set();
    const audienceSet = new Set();

    for (let i = 0; i < worksheets.length; i++) {
      const w = worksheets[i];
      if (w.topic) topicSet.add(w.topic);
      if (w.audience) audienceSet.add(w.audience);
    }

    const topics = Array.from(topicSet).map(v => ({ value: v, label: v }));
    const audiences = Array.from(audienceSet).map(v => ({ value: v, label: v }));

    const pageCountOptions = [
      { maxPages: 5, label: 'Up to 5 pages' },
      { maxPages: 10, label: 'Up to 10 pages' },
      { maxPages: 20, label: 'Up to 20 pages' }
    ];

    return {
      topics,
      audiences,
      pageCountOptions
    };
  }

  // searchWorksheets(filters, sortBy, page = 1, pageSize = 20)
  searchWorksheets(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    let results = this._getFromStorage('worksheets');

    if (f.onlyActive !== false) {
      results = results.filter(w => w.is_active);
    }

    if (f.topic) {
      const topic = String(f.topic);
      results = results.filter(w => w.topic === topic);
    }

    if (f.audience) {
      const aud = String(f.audience);
      results = results.filter(w => w.audience === aud);
    }

    if (typeof f.minPages === 'number') {
      results = results.filter(w => typeof w.page_count === 'number' && w.page_count >= f.minPages);
    }

    if (typeof f.maxPages === 'number') {
      results = results.filter(w => typeof w.page_count === 'number' && w.page_count <= f.maxPages);
    }

    if (f.format) {
      const fmt = String(f.format);
      results = results.filter(w => w.format === fmt);
    }

    const sort = sortBy || 'page_count_asc';
    results = results.slice();

    if (sort === 'page_count_desc') {
      results.sort((a, b) => (b.page_count || 0) - (a.page_count || 0));
    } else if (sort === 'newest') {
      // No explicit date field; use idCounter as proxy (lexicographic fallback)
      results.sort((a, b) => {
        const aid = a.id || '';
        const bid = b.id || '';
        if (aid === bid) return 0;
        return aid < bid ? 1 : -1;
      });
    } else {
      // page_count_asc default
      results.sort((a, b) => (a.page_count || 0) - (b.page_count || 0));
    }

    const totalCount = results.length;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    return { results: paged, totalCount };
  }

  // getWorksheetDetail(worksheetId)
  getWorksheetDetail(worksheetId) {
    const worksheets = this._getFromStorage('worksheets');
    const worksheet = worksheets.find(w => w.id === worksheetId) || null;
    if (!worksheet) {
      return { worksheet: null, isSaved: false };
    }
    const saved = this._getFromStorage('saved_worksheets');
    const isSaved = saved.some(sw => sw.worksheetId === worksheetId);
    return { worksheet, isSaved };
  }

  // saveWorksheet(worksheetId, source)
  saveWorksheet(worksheetId, source) {
    const worksheets = this._getFromStorage('worksheets');
    const worksheet = worksheets.find(w => w.id === worksheetId) || null;
    if (!worksheet) {
      return { success: false, savedWorksheet: null };
    }

    const saved = this._getFromStorage('saved_worksheets');
    const existing = saved.find(sw => sw.worksheetId === worksheetId) || null;
    if (existing) {
      return { success: true, savedWorksheet: existing };
    }

    const savedWorksheet = {
      id: this._generateId('saved_worksheet'),
      worksheetId: worksheetId,
      source: source || 'worksheet_detail',
      saved_at: this._nowISO()
    };

    saved.push(savedWorksheet);
    this._saveToStorage('saved_worksheets', saved);

    return { success: true, savedWorksheet };
  }

  // ==========================
  // Custom Plans (Plan Builder)
  // ==========================

  // getCustomPlanBuilderOptions()
  getCustomPlanBuilderOptions() {
    const individualSessions = this._getFromStorage('individual_session_offerings');
    const groupWorkshops = this._getFromStorage('group_workshops');

    let sumInd = 0;
    let countInd = 0;
    for (let i = 0; i < individualSessions.length; i++) {
      if (typeof individualSessions[i].price === 'number') {
        sumInd += individualSessions[i].price;
        countInd += 1;
      }
    }
    const avgInd = countInd > 0 ? sumInd / countInd : 0;

    let sumGrp = 0;
    let countGrp = 0;
    for (let i = 0; i < groupWorkshops.length; i++) {
      if (typeof groupWorkshops[i].price === 'number') {
        sumGrp += groupWorkshops[i].price;
        countGrp += 1;
      }
    }
    const avgGrp = countGrp > 0 ? sumGrp / countGrp : 0;

    const pricingGuidance = {
      suggestedMaxIndividualSessionPrice: Math.round(avgInd || 0),
      suggestedMaxWorkshopPrice: Math.round(avgGrp || 0)
    };

    return {
      individualSessions,
      groupWorkshops,
      pricingGuidance
    };
  }

  // searchIndividualSessions(filters, sortBy)
  searchIndividualSessions(filters, sortBy) {
    const f = filters || {};
    let results = this._getFromStorage('individual_session_offerings');

    if (f.topic) {
      const topic = String(f.topic);
      results = results.filter(s => s.topic === topic);
    }

    if (typeof f.maxPrice === 'number') {
      results = results.filter(s => typeof s.price === 'number' && s.price <= f.maxPrice);
    }

    if (typeof f.durationMinutes === 'number') {
      results = results.filter(s => typeof s.duration_minutes === 'number' && s.duration_minutes === f.durationMinutes);
    }

    const sort = sortBy || 'price_asc';
    results = results.slice();

    if (sort === 'price_desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'duration_asc') {
      results.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
    } else if (sort === 'duration_desc') {
      results.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
    } else {
      // price_asc default
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    return { results };
  }

  // searchGroupWorkshops(filters, sortBy)
  searchGroupWorkshops(filters, sortBy) {
    const f = filters || {};
    let results = this._getFromStorage('group_workshops');

    if (f.topic) {
      const topic = String(f.topic);
      results = results.filter(w => w.topic === topic);
    }

    if (typeof f.maxPrice === 'number') {
      results = results.filter(w => typeof w.price === 'number' && w.price <= f.maxPrice);
    }

    if (typeof f.durationMinutes === 'number') {
      results = results.filter(w => typeof w.duration_minutes === 'number' && w.duration_minutes === f.durationMinutes);
    }

    const sort = sortBy || 'price_asc';
    results = results.slice();

    if (sort === 'price_desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'duration_asc') {
      results.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
    } else if (sort === 'duration_desc') {
      results.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
    } else {
      // price_asc default
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    return { results };
  }

  // saveCustomPlan(name, items)
  saveCustomPlan(name, items) {
    const itemDefs = Array.isArray(items) ? items : [];
    if (!name || itemDefs.length === 0) {
      return { success: false, plan: null };
    }

    const sessions = this._getFromStorage('individual_session_offerings');
    const workshops = this._getFromStorage('group_workshops');

    const resolvedItems = [];

    for (let i = 0; i < itemDefs.length; i++) {
      const def = itemDefs[i];
      if (!def || !def.item_type) continue;

      if (def.item_type === 'individual_session' && def.individualSessionId) {
        const ses = sessions.find(s => s.id === def.individualSessionId) || null;
        if (!ses) continue;
        resolvedItems.push({
          type: 'individual_session',
          entity: ses,
          individualSessionId: ses.id,
          groupWorkshopId: null
        });
      } else if (def.item_type === 'group_workshop' && def.groupWorkshopId) {
        const ws = workshops.find(w => w.id === def.groupWorkshopId) || null;
        if (!ws) continue;
        resolvedItems.push({
          type: 'group_workshop',
          entity: ws,
          individualSessionId: null,
          groupWorkshopId: ws.id
        });
      }
    }

    if (resolvedItems.length === 0) {
      return { success: false, plan: null };
    }

    const plans = this._getFromStorage('custom_plans');
    const plan = {
      id: this._generateId('custom_plan'),
      name: name,
      itemIds: [],
      total_cost: 0,
      created_at: this._nowISO(),
      updated_at: null
    };

    plans.push(plan);
    this._saveToStorage('custom_plans', plans);

    const planItems = this._getFromStorage('custom_plan_items');
    const now = this._nowISO();

    for (let i = 0; i < resolvedItems.length; i++) {
      const ri = resolvedItems[i];
      const ent = ri.entity;
      const planItem = {
        id: this._generateId('custom_plan_item'),
        planId: plan.id,
        item_type: ri.type,
        individualSessionId: ri.individualSessionId,
        groupWorkshopId: ri.groupWorkshopId,
        title_snapshot: ent.title,
        price_snapshot: ent.price || 0,
        added_at: now
      };
      planItems.push(planItem);
      plan.itemIds.push(planItem.id);
    }

    this._saveToStorage('custom_plan_items', planItems);
    this._saveToStorage('custom_plans', plans);

    const updatedPlan = this._calculateCustomPlanTotal(plan.id) || plan;

    return { success: true, plan: updatedPlan };
  }

  // getCustomPlans()
  getCustomPlans() {
    const plans = this._getFromStorage('custom_plans');
    // Plans themselves have no direct foreign keys (itemIds is an array), so we return as-is
    return plans;
  }

  // getCustomPlanDetail(planId)
  getCustomPlanDetail(planId) {
    const plans = this._getFromStorage('custom_plans');
    const plan = plans.find(p => p.id === planId) || null;
    if (!plan) {
      return { plan: null, items: [] };
    }

    const planItems = this._getFromStorage('custom_plan_items').filter(pi => pi.planId === planId);
    const sessions = this._getFromStorage('individual_session_offerings');
    const workshops = this._getFromStorage('group_workshops');

    const items = [];
    for (let i = 0; i < planItems.length; i++) {
      const pi = planItems[i];
      const individualSession = pi.individualSessionId
        ? sessions.find(s => s.id === pi.individualSessionId) || null
        : null;
      const groupWorkshop = pi.groupWorkshopId
        ? workshops.find(w => w.id === pi.groupWorkshopId) || null
        : null;
      items.push({
        planItem: pi,
        individualSession,
        groupWorkshop
      });
    }

    return { plan, items };
  }

  // ==========================
  // About & General Contact
  // ==========================

  // getAboutPageContent()
  getAboutPageContent() {
    const title = 'About Our Life Coaching Hub';
    const body = 'We bring together coaching, challenges, and practical tools to help you build a balanced, intentional life. This content is static and not stored as part of the main data entities.';
    const highlights = [
      {
        heading: 'Whole-life focus',
        text: 'From stress management and relationships to career transitions and productivity, you can find coaches, programs, and tools for every area of life.'
      },
      {
        heading: 'Actionable tools',
        text: 'Assessments, worksheets, and custom coaching plans turn insight into concrete next steps.'
      },
      {
        heading: 'Flexible support',
        text: 'Book individual sessions, join group challenges, or follow self-paced tools at your own rhythm.'
      }
    ];

    return { title, body, highlights };
  }

  // sendGeneralContactMessage(name, email, message, topic)
  sendGeneralContactMessage(name, email, message, topic) {
    const messages = this._getFromStorage('general_contact_messages');
    const entry = {
      id: this._generateId('general_contact'),
      name: name,
      email: email,
      message: message,
      topic: topic || null,
      created_at: this._nowISO()
    };
    messages.push(entry);
    this._saveToStorage('general_contact_messages', messages);

    return {
      success: true,
      message: 'Your inquiry has been received.'
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
