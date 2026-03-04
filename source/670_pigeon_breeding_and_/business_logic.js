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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const keys = [
      'pigeons',
      'breeding_plans',
      'breeding_plan_birds',
      'teams',
      'bird_team_assignments',
      'races',
      'race_registrations',
      'training_plans',
      'training_sessions',
      'shop_categories',
      'products',
      'cart_items',
      'membership_plans',
      'coupons',
      'membership_orders',
      'articles',
      'saved_articles',
      'reading_lists',
      'reading_list_items',
      'marketplace_listings',
      'consultation_types',
      'consultation_bookings'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single cart object for single-user site
    if (localStorage.getItem('cart') === null) {
      localStorage.setItem('cart', JSON.stringify(null));
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _parseIsoDateTime(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _raceCategoryLabel(cat) {
    if (!cat) return '';
    const map = {
      sprint: 'Sprint',
      middle_distance: 'Middle Distance',
      long_distance: 'Long Distance',
      marathon: 'Marathon',
      young_bird: 'Young Bird',
      old_bird: 'Old Bird',
      stock: 'Stock'
    };
    return map[cat] || cat;
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object' || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cartItemIds
        subtotal: 0,
        currency: 'usd',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    const relevantItems = cartItems.filter((ci) => ci.cartId === cart.id);
    const subtotal = relevantItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    cart.subtotal = subtotal;
    cart.updatedAt = this._nowIso();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);
    return cart;
  }

  // ---------------------- Coupon / membership helpers ----------------------

  _getMembershipPlanById(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    return plans.find((p) => p.id === membershipPlanId) || null;
  }

  _getCouponByCode(couponCode) {
    if (!couponCode) return null;
    const coupons = this._getFromStorage('coupons', []);
    const codeLower = String(couponCode).toLowerCase();
    return (
      coupons.find((c) => String(c.code).toLowerCase() === codeLower) || null
    );
  }

  _applyCouponToPrice(plan, coupon) {
    if (!plan) return { basePrice: 0, discountAmount: 0, totalPrice: 0 };
    const basePrice = Number(plan.price) || 0;
    if (!coupon || !coupon.isActive) {
      return {
        basePrice,
        discountAmount: 0,
        totalPrice: basePrice
      };
    }

    const now = new Date();
    if (coupon.validFrom) {
      const from = this._parseIsoDateTime(coupon.validFrom);
      if (from && now < from) {
        return { basePrice, discountAmount: 0, totalPrice: basePrice };
      }
    }
    if (coupon.validTo) {
      const to = this._parseIsoDateTime(coupon.validTo);
      if (to && now > to) {
        return { basePrice, discountAmount: 0, totalPrice: basePrice };
      }
    }

    if (Array.isArray(coupon.applicablePlanLevels) && coupon.applicablePlanLevels.length) {
      if (!coupon.applicablePlanLevels.includes(plan.planLevel)) {
        return { basePrice, discountAmount: 0, totalPrice: basePrice };
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (basePrice * (Number(coupon.discountValue) || 0)) / 100;
    } else if (coupon.discountType === 'fixed_amount') {
      discountAmount = Number(coupon.discountValue) || 0;
    }

    if (discountAmount < 0) discountAmount = 0;
    if (discountAmount > basePrice) discountAmount = basePrice;

    const totalPrice = basePrice - discountAmount;
    return {
      basePrice,
      discountAmount,
      totalPrice
    };
  }

  // ---------------------- Training helpers ----------------------

  _validateTrainingSessionMonth(trainingPlan, startDateTime) {
    if (!trainingPlan || !trainingPlan.scheduleMonth || !startDateTime) return false;
    const date = this._parseIsoDateTime(startDateTime);
    if (!date) return false;
    const ym = date.toISOString().slice(0, 7); // 'YYYY-MM'
    return ym === trainingPlan.scheduleMonth;
  }

  // ---------------------- Homepage helper ----------------------

  _findUpcomingFeaturedRace() {
    const races = this._getFromStorage('races', []);
    const upcoming = races.filter((r) => r.status === 'upcoming');
    if (!upcoming.length) return null;

    const targetName = 'Spring Classic 150km';
    let featured = null;

    // Prefer a race with the specific name if present and upcoming
    const specific = upcoming.find((r) => r.name === targetName);
    if (specific) {
      featured = specific;
    } else {
      // Otherwise, pick the upcoming race with the nearest date in the future
      const now = new Date();
      upcoming.sort((a, b) => {
        const da = this._parseIsoDateTime(a.date) || now;
        const db = this._parseIsoDateTime(b.date) || now;
        return da - db;
      });
      featured = upcoming[0];
    }

    if (!featured) return null;
    return {
      id: featured.id,
      name: featured.name,
      distanceKm: featured.distanceKm,
      date: featured.date,
      status: featured.status
    };
  }

  // ====================== CORE INTERFACES ======================

  // ---------------------- Homepage ----------------------

  getHomeOverview() {
    const sections = [
      {
        id: 'breeding_loft',
        name: 'Breeding Loft',
        description: 'Manage breeding plans, sprint pairs, and pedigree performance.'
      },
      {
        id: 'racing',
        name: 'Racing',
        description: 'View the race calendar, register birds, and track race entries.'
      },
      {
        id: 'training',
        name: 'Training',
        description: 'Plan progressive training tosses for all race teams.'
      },
      {
        id: 'shop',
        name: 'Shop',
        description: 'Order feed, supplements, and loft supplies for your birds.'
      },
      {
        id: 'membership',
        name: 'Membership',
        description: 'Upgrade to Loft Pro for advanced tools and online pedigree access.'
      },
      {
        id: 'learning_center',
        name: 'Learning Center',
        description: 'Read articles on winter breeding, race prep, and loft management.'
      },
      {
        id: 'marketplace',
        name: 'Marketplace',
        description: 'List young birds, breeders, and race teams for sale.'
      },
      {
        id: 'consultations',
        name: 'Consultations',
        description: 'Book 1:1 loft management and race strategy consultations.'
      }
    ];

    const featuredRace = this._findUpcomingFeaturedRace();

    // Membership summary, loosely based on available plans
    const plans = this._getFromStorage('membership_plans', []);
    let membershipHeadline = 'Loft Memberships';
    let membershipDescription = 'Manage your loft with online tools for breeding, racing, and training.';
    const loftProPlan = plans.find((p) => p.planLevel === 'loft_pro' && p.term === 'one_year');
    if (loftProPlan) {
      membershipHeadline = 'Loft Pro Membership';
      membershipDescription = 'Unlock online pedigree access, advanced breeding tools, and race analytics for your loft.';
    }

    const consultationTypes = this._getFromStorage('consultation_types', []);
    let consultationHeadline = 'Consultations';
    let consultationDescription = 'Book a 1:1 consultation for loft management, health, or race strategy.';
    const loftMgmt = consultationTypes.find((c) => c.name === 'Loft Management Consultation');
    if (loftMgmt) {
      consultationHeadline = 'Loft Management Consultations';
      consultationDescription = 'Schedule a 60-minute loft management consultation to optimize ventilation, hygiene, and routines.';
    }

    const shortcuts = [
      {
        id: 'view_bird_directory',
        label: 'Bird Directory',
        targetPage: 'bird_directory',
        description: 'Browse all pigeons in your loft by category and performance.'
      },
      {
        id: 'open_training_planner',
        label: 'Training Planner',
        targetPage: 'training_planner',
        description: 'Create progressive training schedules for race teams.'
      },
      {
        id: 'open_feed_shop',
        label: 'Feed & Supplements',
        targetPage: 'feed_supplements',
        description: 'Order grain mixes and vitamin supplements for the season.'
      }
    ];

    return {
      sections,
      featuredRace,
      shortcuts,
      membershipSummary: {
        headline: membershipHeadline,
        description: membershipDescription
      },
      consultationSummary: {
        headline: consultationHeadline,
        description: consultationDescription
      }
    };
  }

  // ---------------------- Bird Directory & Performance ----------------------

  getBirdDirectoryFilters() {
    const pigeons = this._getFromStorage('pigeons', []);

    const raceCatSet = new Set();
    const sexSet = new Set();
    let top10Min = null;
    let top10Max = null;
    let winsMin = null;
    let winsMax = null;

    pigeons.forEach((p) => {
      if (p.raceCategory) raceCatSet.add(p.raceCategory);
      if (p.sex) sexSet.add(p.sex);
      if (typeof p.top10FinishesCount === 'number') {
        if (top10Min === null || p.top10FinishesCount < top10Min) top10Min = p.top10FinishesCount;
        if (top10Max === null || p.top10FinishesCount > top10Max) top10Max = p.top10FinishesCount;
      }
      if (typeof p.winsCount === 'number') {
        if (winsMin === null || p.winsCount < winsMin) winsMin = p.winsCount;
        if (winsMax === null || p.winsCount > winsMax) winsMax = p.winsCount;
      }
    });

    const raceCategories = Array.from(raceCatSet).map((value) => ({
      value,
      label: this._raceCategoryLabel(value)
    }));

    const sexLabelMap = {
      cock: 'Cock',
      hen: 'Hen',
      unknown: 'Unknown'
    };
    const sexOptions = Array.from(sexSet).map((value) => ({
      value,
      label: sexLabelMap[value] || value
    }));

    const sortableFields = [
      { value: 'wins_desc', label: 'Wins - High to Low' },
      { value: 'return_rate_desc', label: 'Return Rate - High to Low' },
      { value: 'name_asc', label: 'Name A-Z' }
    ];

    return {
      raceCategories,
      sexOptions,
      sortableFields,
      performanceRanges: {
        top10FinishesMin: top10Min !== null ? top10Min : 0,
        top10FinishesMax: top10Max !== null ? top10Max : 0,
        winsMin: winsMin !== null ? winsMin : 0,
        winsMax: winsMax !== null ? winsMax : 0
      }
    };
  }

  searchPigeons(
    raceCategory,
    sex,
    minTop10Finishes,
    minWins,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const pigeons = this._getFromStorage('pigeons', []);

    let results = pigeons.filter((p) => {
      if (raceCategory && p.raceCategory !== raceCategory) return false;
      if (sex && p.sex !== sex) return false;
      if (
        typeof minTop10Finishes === 'number' &&
        (typeof p.top10FinishesCount !== 'number' || p.top10FinishesCount < minTop10Finishes)
      ) {
        return false;
      }
      if (
        typeof minWins === 'number' &&
        (typeof p.winsCount !== 'number' || p.winsCount < minWins)
      ) {
        return false;
      }
      return true;
    });

    if (sortBy === 'wins_desc') {
      results.sort((a, b) => (b.winsCount || 0) - (a.winsCount || 0));
    } else if (sortBy === 'return_rate_desc') {
      results.sort((a, b) => (b.returnRatePercent || 0) - (a.returnRatePercent || 0));
    } else if (sortBy === 'name_asc') {
      results.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const mapped = paged.map((p) => ({
      id: p.id,
      name: p.name,
      ringNumber: p.ringNumber,
      sex: p.sex,
      raceCategory: p.raceCategory,
      raceCategoryLabel: this._raceCategoryLabel(p.raceCategory),
      birthYear: p.birthYear,
      top10FinishesCount: p.top10FinishesCount || 0,
      winsCount: p.winsCount || 0,
      returnRatePercent: p.returnRatePercent || 0,
      averageRaceDistanceKm: p.averageRaceDistanceKm || 0,
      conditionScore: p.conditionScore || 0,
      tags: Array.isArray(p.tags) ? p.tags : []
    }));

    return {
      total,
      page,
      pageSize,
      results: mapped
    };
  }

  getPigeonDetails(pigeonId) {
    const pigeons = this._getFromStorage('pigeons', []);
    const pigeon = pigeons.find((p) => p.id === pigeonId);
    if (!pigeon) return null;

    const assignments = this._getFromStorage('bird_team_assignments', []);
    const teams = this._getFromStorage('teams', []);

    const teamEntries = assignments
      .filter((a) => a.pigeonId === pigeonId && a.isActive)
      .map((a) => {
        const team = teams.find((t) => t.id === a.teamId) || {};
        return {
          teamId: team.id,
          teamName: team.name,
          teamType: team.teamType
        };
      });

    return {
      id: pigeon.id,
      name: pigeon.name,
      ringNumber: pigeon.ringNumber,
      sex: pigeon.sex,
      raceCategory: pigeon.raceCategory,
      raceCategoryLabel: this._raceCategoryLabel(pigeon.raceCategory),
      birthYear: pigeon.birthYear,
      top10FinishesCount: pigeon.top10FinishesCount || 0,
      winsCount: pigeon.winsCount || 0,
      returnRatePercent: pigeon.returnRatePercent || 0,
      averageRaceDistanceKm: pigeon.averageRaceDistanceKm || 0,
      conditionScore: pigeon.conditionScore || 0,
      maxProvenDistanceKm: pigeon.maxProvenDistanceKm || 0,
      isForSale: !!pigeon.isForSale,
      tags: Array.isArray(pigeon.tags) ? pigeon.tags : [],
      teams: teamEntries
    };
  }

  listBreedingPlans() {
    const plans = this._getFromStorage('breeding_plans', []);
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      createdAt: p.createdAt
    }));
  }

  createBreedingPlan(name, description, notes) {
    const plans = this._getFromStorage('breeding_plans', []);
    const plan = {
      id: this._generateId('breeding_plan'),
      name,
      description: description || '',
      notes: notes || '',
      createdAt: this._nowIso()
    };
    plans.push(plan);
    this._saveToStorage('breeding_plans', plans);
    return plan;
  }

  addPigeonToBreedingPlan(breedingPlanId, pigeonId, role) {
    const plans = this._getFromStorage('breeding_plans', []);
    const pigeons = this._getFromStorage('pigeons', []);
    const plan = plans.find((p) => p.id === breedingPlanId);
    const pigeon = pigeons.find((p) => p.id === pigeonId);

    if (!plan || !pigeon) {
      return {
        success: false,
        breedingPlanBirdId: null,
        message: 'Breeding plan or pigeon not found.'
      };
    }

    const bpBirds = this._getFromStorage('breeding_plan_birds', []);
    const entry = {
      id: this._generateId('breeding_plan_bird'),
      breedingPlanId,
      pigeonId,
      role: role || 'unknown',
      addedAt: this._nowIso()
    };
    bpBirds.push(entry);
    this._saveToStorage('breeding_plan_birds', bpBirds);

    return {
      success: true,
      breedingPlanBirdId: entry.id,
      message: 'Pigeon added to breeding plan.'
    };
  }

  addPigeonTag(pigeonId, tag) {
    const pigeons = this._getFromStorage('pigeons', []);
    const index = pigeons.findIndex((p) => p.id === pigeonId);
    if (index === -1) {
      return {
        success: false,
        tags: [],
        message: 'Pigeon not found.'
      };
    }
    const pigeon = pigeons[index];
    const tags = Array.isArray(pigeon.tags) ? pigeon.tags.slice() : [];
    if (!tags.includes(tag)) {
      tags.push(tag);
      pigeon.tags = tags;
      pigeons[index] = pigeon;
      this._saveToStorage('pigeons', pigeons);
    }
    return {
      success: true,
      tags,
      message: 'Tag added.'
    };
  }

  getPerformanceSearchFilters() {
    const pigeons = this._getFromStorage('pigeons', []);
    const typeSet = new Set();
    let rrMin = null;
    let rrMax = null;
    let distMin = null;
    let distMax = null;

    pigeons.forEach((p) => {
      if (p.raceCategory) typeSet.add(p.raceCategory);
      if (typeof p.returnRatePercent === 'number') {
        if (rrMin === null || p.returnRatePercent < rrMin) rrMin = p.returnRatePercent;
        if (rrMax === null || p.returnRatePercent > rrMax) rrMax = p.returnRatePercent;
      }
      if (typeof p.averageRaceDistanceKm === 'number') {
        if (distMin === null || p.averageRaceDistanceKm < distMin) distMin = p.averageRaceDistanceKm;
        if (distMax === null || p.averageRaceDistanceKm > distMax) distMax = p.averageRaceDistanceKm;
      }
    });

    const typeOptions = Array.from(typeSet).map((value) => ({
      value,
      label: this._raceCategoryLabel(value)
    }));

    const sortableFields = [
      { value: 'return_rate_desc', label: 'Return Rate - High to Low' },
      { value: 'wins_desc', label: 'Wins - High to Low' },
      { value: 'top10_desc', label: 'Top-10 Finishes - High to Low' }
    ];

    return {
      typeOptions,
      returnRateRange: {
        min: rrMin !== null ? rrMin : 0,
        max: rrMax !== null ? rrMax : 0
      },
      averageDistanceRange: {
        min: distMin !== null ? distMin : 0,
        max: distMax !== null ? distMax : 0
      },
      sortableFields
    };
  }

  searchPigeonsByPerformance(
    type,
    minReturnRatePercent,
    minAverageDistanceKm,
    maxAverageDistanceKm,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const pigeons = this._getFromStorage('pigeons', []);

    let results = pigeons.filter((p) => {
      if (type && p.raceCategory !== type) return false;
      if (
        typeof minReturnRatePercent === 'number' &&
        (typeof p.returnRatePercent !== 'number' || p.returnRatePercent < minReturnRatePercent)
      ) {
        return false;
      }
      if (
        typeof minAverageDistanceKm === 'number' &&
        (typeof p.averageRaceDistanceKm !== 'number' || p.averageRaceDistanceKm < minAverageDistanceKm)
      ) {
        return false;
      }
      if (
        typeof maxAverageDistanceKm === 'number' &&
        (typeof p.averageRaceDistanceKm !== 'number' || p.averageRaceDistanceKm > maxAverageDistanceKm)
      ) {
        return false;
      }
      return true;
    });

    if (sortBy === 'return_rate_desc') {
      results.sort((a, b) => (b.returnRatePercent || 0) - (a.returnRatePercent || 0));
    } else if (sortBy === 'wins_desc') {
      results.sort((a, b) => (b.winsCount || 0) - (a.winsCount || 0));
    } else if (sortBy === 'top10_desc') {
      results.sort((a, b) => (b.top10FinishesCount || 0) - (a.top10FinishesCount || 0));
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const mapped = paged.map((p) => ({
      id: p.id,
      name: p.name,
      ringNumber: p.ringNumber,
      raceCategory: p.raceCategory,
      raceCategoryLabel: this._raceCategoryLabel(p.raceCategory),
      returnRatePercent: p.returnRatePercent || 0,
      averageRaceDistanceKm: p.averageRaceDistanceKm || 0,
      winsCount: p.winsCount || 0,
      top10FinishesCount: p.top10FinishesCount || 0,
      conditionScore: p.conditionScore || 0,
      tags: Array.isArray(p.tags) ? p.tags : []
    }));

    return {
      total,
      page,
      pageSize,
      results: mapped
    };
  }

  getPigeonComparison(pigeonIds) {
    if (!Array.isArray(pigeonIds) || !pigeonIds.length) return [];
    const pigeons = this._getFromStorage('pigeons', []);
    const selected = pigeons.filter((p) => pigeonIds.includes(p.id));

    return selected.map((p) => ({
      id: p.id,
      name: p.name,
      ringNumber: p.ringNumber,
      raceCategory: p.raceCategory,
      raceCategoryLabel: this._raceCategoryLabel(p.raceCategory),
      returnRatePercent: p.returnRatePercent || 0,
      averageRaceDistanceKm: p.averageRaceDistanceKm || 0,
      winsCount: p.winsCount || 0,
      top10FinishesCount: p.top10FinishesCount || 0,
      conditionScore: p.conditionScore || 0,
      maxProvenDistanceKm: p.maxProvenDistanceKm || 0,
      tags: Array.isArray(p.tags) ? p.tags : []
    }));
  }

  // ---------------------- Shop / Cart ----------------------

  getShopCategoryDetails(categoryId) {
    const categories = this._getFromStorage('shop_categories', []);
    let cat = categories.find((c) => c.urlParam === categoryId);
    if (!cat) {
      cat = categories.find((c) => c.id === categoryId);
    }
    if (!cat) return null;
    return {
      id: cat.id,
      name: cat.name,
      description: cat.description || ''
    };
  }

  getShopFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []).filter(
      (p) => p.categoryId === categoryId
    );

    const feedTypesSet = new Set();
    const bagSizeSet = new Set();
    let proteinMin = null;
    let proteinMax = null;
    let priceMin = null;
    let priceMax = null;

    products.forEach((p) => {
      if (p.feedType) feedTypesSet.add(p.feedType);
      if (typeof p.bagSizeKg === 'number') bagSizeSet.add(p.bagSizeKg);
      if (typeof p.proteinPercent === 'number') {
        if (proteinMin === null || p.proteinPercent < proteinMin) proteinMin = p.proteinPercent;
        if (proteinMax === null || p.proteinPercent > proteinMax) proteinMax = p.proteinPercent;
      }
      if (typeof p.price === 'number') {
        if (priceMin === null || p.price < priceMin) priceMin = p.price;
        if (priceMax === null || p.price > priceMax) priceMax = p.price;
      }
    });

    const feedTypes = Array.from(feedTypesSet).map((value) => ({
      value,
      label:
        value === 'grain_mix'
          ? 'Grain Mix'
          : value === 'pellet'
          ? 'Pellet'
          : value === 'seed_mix'
          ? 'Seed Mix'
          : 'Other'
    }));

    const bagSizeOptionsKg = Array.from(bagSizeSet).sort((a, b) => a - b);

    const ratingOptions = [
      { value: 3, label: '3 stars & up' },
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];

    const sortableFields = [
      { value: 'price_asc', label: 'Price - Low to High' },
      { value: 'price_desc', label: 'Price - High to Low' },
      { value: 'rating_desc', label: 'Rating - High to Low' }
    ];

    return {
      feedTypes,
      bagSizeOptionsKg,
      proteinPercentRange: {
        min: proteinMin !== null ? proteinMin : 0,
        max: proteinMax !== null ? proteinMax : 0
      },
      priceRange: {
        min: priceMin !== null ? priceMin : 0,
        max: priceMax !== null ? priceMax : 0
      },
      ratingOptions,
      sortableFields
    };
  }

  searchProductsInCategory(
    categoryId,
    productType,
    feedType,
    bagSizeKg,
    minProteinPercent,
    minPrice,
    maxPrice,
    minRating,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const products = this._getFromStorage('products', []);

    let results = products.filter((p) => {
      if (p.categoryId !== categoryId) return false;
      if (productType && p.productType !== productType) return false;
      if (feedType && p.feedType !== feedType) return false;
      if (typeof bagSizeKg === 'number' && p.bagSizeKg !== bagSizeKg) return false;
      if (
        typeof minProteinPercent === 'number' &&
        (typeof p.proteinPercent !== 'number' || p.proteinPercent < minProteinPercent)
      ) {
        return false;
      }
      if (
        typeof minPrice === 'number' &&
        (typeof p.price !== 'number' || p.price < minPrice)
      ) {
        return false;
      }
      if (
        typeof maxPrice === 'number' &&
        (typeof p.price !== 'number' || p.price > maxPrice)
      ) {
        return false;
      }
      if (
        typeof minRating === 'number' &&
        (typeof p.rating !== 'number' || p.rating < minRating)
      ) {
        return false;
      }
      if (p.isAvailable === false) return false;
      return true;
    });

    if (sortBy === 'price_asc') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const categories = this._getFromStorage('shop_categories', []);

    const mapped = paged.map((p) => {
      let cat = categories.find((c) => c.id === p.categoryId || c.urlParam === p.categoryId);
      return {
        id: p.id,
        name: p.name,
        productType: p.productType,
        feedType: p.feedType,
        bagSizeKg: p.bagSizeKg,
        proteinPercent: p.proteinPercent,
        price: p.price,
        currency: p.currency,
        rating: p.rating,
        isAvailable: p.isAvailable,
        categoryName: cat ? cat.name : ''
      };
    });

    return {
      total,
      page,
      pageSize,
      results: mapped
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) return null;

    const categories = this._getFromStorage('shop_categories', []);
    const cat = categories.find(
      (c) => c.id === product.categoryId || c.urlParam === product.categoryId
    );

    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      productType: product.productType,
      feedType: product.feedType,
      bagSizeKg: product.bagSizeKg,
      proteinPercent: product.proteinPercent,
      price: product.price,
      currency: product.currency,
      rating: product.rating,
      isAvailable: product.isAvailable,
      categoryId: product.categoryId,
      categoryName: cat ? cat.name : '',
      createdAt: product.createdAt
    };
  }

  addToCart(productId, quantity = 1) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId && p.isAvailable !== false);

    if (!product) {
      return {
        success: false,
        cartId: null,
        subtotal: 0,
        currency: 'usd',
        message: 'Product not found or unavailable.'
      };
    }

    if (!quantity || quantity <= 0) {
      return {
        success: false,
        cartId: null,
        subtotal: 0,
        currency: 'usd',
        message: 'Quantity must be greater than zero.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = Number(product.price) || 0;
    const lineTotal = unitPrice * quantity;

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      productId: product.id,
      quantity,
      unitPrice,
      lineTotal,
      addedAt: this._nowIso()
    };

    cartItems.push(cartItem);
    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    const updatedCart = this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      cartId: updatedCart.id,
      subtotal: updatedCart.subtotal,
      currency: updatedCart.currency,
      message: 'Item added to cart.'
    };
  }

  getCart() {
    const cart = this._getFromStorage('cart', null) || this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.productId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: product ? product.name : '',
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        lineTotal: ci.lineTotal,
        currency: product ? product.currency : cart.currency,
        product
      };
    });

    return {
      cartId: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      currency: cart.currency || 'usd'
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null) || this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const index = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (index === -1) {
      return {
        success: false,
        subtotal: cart.subtotal || 0,
        currency: cart.currency || 'usd',
        message: 'Cart item not found.'
      };
    }

    if (quantity <= 0) {
      const removed = cartItems[index];
      cartItems.splice(index, 1);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== removed.id);
      }
      const updatedCart = this._recalculateCartTotals(cart, cartItems);
      return {
        success: true,
        subtotal: updatedCart.subtotal,
        currency: updatedCart.currency,
        message: 'Cart item removed.'
      };
    }

    const item = cartItems[index];
    item.quantity = quantity;
    item.lineTotal = (Number(item.unitPrice) || 0) * quantity;
    cartItems[index] = item;

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    return {
      success: true,
      subtotal: updatedCart.subtotal,
      currency: updatedCart.currency,
      message: 'Cart item updated.'
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null) || this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const index = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (index === -1) {
      return {
        success: false,
        subtotal: cart.subtotal || 0,
        currency: cart.currency || 'usd',
        message: 'Cart item not found.'
      };
    }

    const removed = cartItems[index];
    cartItems.splice(index, 1);
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== removed.id);
    }

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    return {
      success: true,
      subtotal: updatedCart.subtotal,
      currency: updatedCart.currency,
      message: 'Cart item removed.'
    };
  }

  // ---------------------- Race Calendar & Registration ----------------------

  getRaceCalendarFilters() {
    const races = this._getFromStorage('races', []);
    let distMin = null;
    let distMax = null;
    let dateMin = null;
    let dateMax = null;

    races.forEach((r) => {
      if (typeof r.distanceKm === 'number') {
        if (distMin === null || r.distanceKm < distMin) distMin = r.distanceKm;
        if (distMax === null || r.distanceKm > distMax) distMax = r.distanceKm;
      }
      const d = this._parseIsoDateTime(r.date);
      if (d) {
        if (!dateMin || d < dateMin) dateMin = d;
        if (!dateMax || d > dateMax) dateMax = d;
      }
    });

    return {
      distanceRange: {
        min: distMin !== null ? distMin : 0,
        max: distMax !== null ? distMax : 0
      },
      dateRange: {
        start: dateMin ? dateMin.toISOString() : null,
        end: dateMax ? dateMax.toISOString() : null
      }
    };
  }

  listUpcomingRaces(minDistanceKm, maxDistanceKm, fromDate, toDate, searchTerm) {
    const races = this._getFromStorage('races', []);
    const from = fromDate ? this._parseIsoDateTime(fromDate) : null;
    const to = toDate ? this._parseIsoDateTime(toDate) : null;
    const term = searchTerm ? searchTerm.toLowerCase() : '';

    return races
      .filter((r) => r.status === 'upcoming')
      .filter((r) => {
        if (typeof minDistanceKm === 'number' && r.distanceKm < minDistanceKm) return false;
        if (typeof maxDistanceKm === 'number' && r.distanceKm > maxDistanceKm) return false;
        const d = this._parseIsoDateTime(r.date);
        if (from && d && d < from) return false;
        if (to && d && d > to) return false;
        if (term && (!r.name || r.name.toLowerCase().indexOf(term) === -1)) return false;
        return true;
      })
      .map((r) => ({
        id: r.id,
        name: r.name,
        distanceKm: r.distanceKm,
        date: r.date,
        status: r.status,
        location: r.location || ''
      }));
  }

  getRaceDetails(raceId) {
    const races = this._getFromStorage('races', []);
    const r = races.find((race) => race.id === raceId);
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      distanceKm: r.distanceKm,
      date: r.date,
      status: r.status,
      location: r.location || '',
      description: r.description || '',
      entryRules: r.entryRules || ''
    };
  }

  getTeamsForSelection(teamType) {
    const teams = this._getFromStorage('teams', []);
    return teams
      .filter((t) => {
        if (teamType && t.teamType !== teamType) return false;
        return true;
      })
      .map((t) => ({
        id: t.id,
        name: t.name,
        teamType: t.teamType,
        seasonYear: t.seasonYear
      }));
  }

  getEligibleBirdsForRace(raceId, teamId) {
    // raceId is not used for additional filtering currently, but is accepted for future rules
    void raceId;
    const assignments = this._getFromStorage('bird_team_assignments', []);
    const pigeons = this._getFromStorage('pigeons', []);

    const assigned = assignments.filter((a) => a.teamId === teamId && a.isActive);

    return assigned.map((a) => {
      const p = pigeons.find((x) => x.id === a.pigeonId) || {};
      return {
        pigeonId: p.id,
        name: p.name,
        ringNumber: p.ringNumber,
        sex: p.sex,
        conditionScore: p.conditionScore || 0,
        raceCategory: p.raceCategory,
        raceCategoryLabel: this._raceCategoryLabel(p.raceCategory)
      };
    });
  }

  registerBirdsForRace(raceId, teamId, pigeonIds) {
    const races = this._getFromStorage('races', []);
    const teams = this._getFromStorage('teams', []);
    const pigeons = this._getFromStorage('pigeons', []);

    const race = races.find((r) => r.id === raceId);
    const team = teams.find((t) => t.id === teamId);
    if (!race || !team) {
      return {
        success: false,
        registrations: [],
        message: 'Race or team not found.'
      };
    }

    const regs = this._getFromStorage('race_registrations', []);
    const registrations = [];
    const now = this._nowIso();

    (pigeonIds || []).forEach((pid) => {
      const pigeon = pigeons.find((p) => p.id === pid);
      if (!pigeon) return;
      const reg = {
        id: this._generateId('race_reg'),
        raceId,
        pigeonId: pid,
        teamId,
        status: 'confirmed',
        registeredAt: now
      };
      regs.push(reg);
      registrations.push({
        raceRegistrationId: reg.id,
        pigeonId: pid,
        status: reg.status
      });
    });

    this._saveToStorage('race_registrations', regs);

    return {
      success: true,
      registrations,
      message: 'Birds registered for race.'
    };
  }

  // ---------------------- Training Planner ----------------------

  getTrainingPlannerContext() {
    const teams = this._getFromStorage('teams', []);
    const suitable = teams.filter((t) => {
      return (
        t.teamType === 'young_birds' ||
        t.teamType === 'old_birds' ||
        t.teamType === 'race_team' ||
        t.teamType === 'training'
      );
    });
    return {
      teams: suitable.map((t) => ({
        id: t.id,
        name: t.name,
        teamType: t.teamType
      }))
    };
  }

  createTrainingPlan(name, teamId, scheduleMonth, description) {
    const teams = this._getFromStorage('teams', []);
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      throw new Error('Team not found for training plan.');
    }
    const plans = this._getFromStorage('training_plans', []);
    const plan = {
      id: this._generateId('training_plan'),
      name,
      teamId,
      scheduleMonth,
      description: description || '',
      createdAt: this._nowIso()
    };
    plans.push(plan);
    this._saveToStorage('training_plans', plans);
    return plan;
  }

  addTrainingSession(trainingPlanId, distanceKm, startDateTime) {
    const plans = this._getFromStorage('training_plans', []);
    const plan = plans.find((p) => p.id === trainingPlanId);
    if (!plan) {
      throw new Error('Training plan not found.');
    }
    if (!this._validateTrainingSessionMonth(plan, startDateTime)) {
      throw new Error('Training session date must fall within the plan scheduleMonth.');
    }

    const sessions = this._getFromStorage('training_sessions', []);
    const session = {
      id: this._generateId('training_session'),
      trainingPlanId,
      distanceKm,
      startDateTime
    };
    sessions.push(session);
    this._saveToStorage('training_sessions', sessions);
    return session;
  }

  getTrainingPlanDetails(trainingPlanId) {
    const plans = this._getFromStorage('training_plans', []);
    const sessions = this._getFromStorage('training_sessions', []);
    const teams = this._getFromStorage('teams', []);

    const plan = plans.find((p) => p.id === trainingPlanId);
    if (!plan) return null;

    const team = teams.find((t) => t.id === plan.teamId) || null;
    const planSessions = sessions
      .filter((s) => s.trainingPlanId === trainingPlanId)
      .slice()
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    return {
      id: plan.id,
      name: plan.name,
      teamId: plan.teamId,
      teamName: team ? team.name : '',
      team,
      scheduleMonth: plan.scheduleMonth,
      description: plan.description || '',
      sessions: planSessions.map((s) => ({
        id: s.id,
        distanceKm: s.distanceKm,
        startDateTime: s.startDateTime
      }))
    };
  }

  // ---------------------- Membership & Coupons ----------------------

  getMembershipPlans() {
    const plans = this._getFromStorage('membership_plans', []);
    return plans
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        planLevel: p.planLevel,
        term: p.term,
        durationMonths: p.durationMonths,
        price: p.price,
        currency: p.currency,
        includesOnlinePedigreeAccess: !!p.includesOnlinePedigreeAccess,
        description: p.description || ''
      }));
  }

  getMembershipPlanDetails(membershipPlanId) {
    const plan = this._getMembershipPlanById(membershipPlanId);
    if (!plan) return null;
    return {
      id: plan.id,
      name: plan.name,
      planLevel: plan.planLevel,
      term: plan.term,
      durationMonths: plan.durationMonths,
      price: plan.price,
      currency: plan.currency,
      includesOnlinePedigreeAccess: !!plan.includesOnlinePedigreeAccess,
      description: plan.description || ''
    };
  }

  applyMembershipCoupon(membershipPlanId, couponCode) {
    const plan = this._getMembershipPlanById(membershipPlanId);
    if (!plan) {
      return {
        valid: false,
        couponId: null,
        couponCode,
        discountAmount: 0,
        basePrice: 0,
        totalPrice: 0,
        currency: 'usd',
        message: 'Membership plan not found.'
      };
    }

    const coupon = this._getCouponByCode(couponCode);
    if (!coupon || !coupon.isActive) {
      return {
        valid: false,
        couponId: coupon ? coupon.id : null,
        couponCode,
        discountAmount: 0,
        basePrice: plan.price,
        totalPrice: plan.price,
        currency: plan.currency,
        message: 'Invalid or inactive coupon.'
      };
    }

    const pricing = this._applyCouponToPrice(plan, coupon);
    const valid = pricing.discountAmount > 0;

    return {
      valid,
      couponId: coupon.id,
      couponCode: coupon.code,
      discountAmount: pricing.discountAmount,
      basePrice: pricing.basePrice,
      totalPrice: pricing.totalPrice,
      currency: plan.currency,
      message: valid ? 'Coupon applied.' : 'Coupon not applicable to this plan.'
    };
  }

  createMembershipOrder(
    membershipPlanId,
    couponCode,
    email,
    password,
    paymentMethod,
    cardNumber,
    cardExpiry,
    cardCvv
  ) {
    const plan = this._getMembershipPlanById(membershipPlanId);
    if (!plan) {
      return {
        orderId: null,
        status: 'failed',
        planName: '',
        term: '',
        basePrice: 0,
        discountAmount: 0,
        totalPrice: 0,
        currency: 'usd',
        couponCode: couponCode || null,
        message: 'Membership plan not found.'
      };
    }

    let appliedCoupon = null;
    if (couponCode) {
      appliedCoupon = this._getCouponByCode(couponCode);
    }

    const pricing = this._applyCouponToPrice(plan, appliedCoupon);

    // Basic paymentMethod validation
    const allowedMethods = ['credit_card', 'paypal', 'bank_transfer'];
    if (!allowedMethods.includes(paymentMethod)) {
      return {
        orderId: null,
        status: 'failed',
        planName: plan.name,
        term: plan.term,
        basePrice: pricing.basePrice,
        discountAmount: pricing.discountAmount,
        totalPrice: pricing.totalPrice,
        currency: plan.currency,
        couponCode: couponCode || null,
        message: 'Unsupported payment method.'
      };
    }

    if (paymentMethod === 'credit_card') {
      if (!cardNumber || !cardExpiry || !cardCvv) {
        return {
          orderId: null,
          status: 'failed',
          planName: plan.name,
          term: plan.term,
          basePrice: pricing.basePrice,
          discountAmount: pricing.discountAmount,
          totalPrice: pricing.totalPrice,
          currency: plan.currency,
          couponCode: couponCode || null,
          message: 'Missing credit card details.'
        };
      }
    }

    const orders = this._getFromStorage('membership_orders', []);
    const orderId = this._generateId('membership_order');

    const order = {
      id: orderId,
      membershipPlanId: plan.id,
      planName: plan.name,
      term: plan.term,
      basePrice: pricing.basePrice,
      couponId: appliedCoupon ? appliedCoupon.id : null,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      discountAmount: pricing.discountAmount,
      totalPrice: pricing.totalPrice,
      currency: plan.currency,
      email,
      password,
      paymentMethod,
      cardNumber: paymentMethod === 'credit_card' ? cardNumber : null,
      cardExpiry: paymentMethod === 'credit_card' ? cardExpiry : null,
      cardCvv: paymentMethod === 'credit_card' ? cardCvv : null,
      status: 'completed',
      createdAt: this._nowIso()
    };

    orders.push(order);
    this._saveToStorage('membership_orders', orders);

    return {
      orderId,
      status: order.status,
      planName: plan.name,
      term: plan.term,
      basePrice: pricing.basePrice,
      discountAmount: pricing.discountAmount,
      totalPrice: pricing.totalPrice,
      currency: plan.currency,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      message: 'Membership order created.'
    };
  }

  // ---------------------- Articles & Reading Lists ----------------------

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []);

    let minDate = null;
    let maxDate = null;
    let minRt = null;
    let maxRt = null;

    articles.forEach((a) => {
      const d = this._parseIsoDateTime(a.publishDate);
      if (d) {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
      if (typeof a.readingTimeMinutes === 'number') {
        if (minRt === null || a.readingTimeMinutes < minRt) minRt = a.readingTimeMinutes;
        if (maxRt === null || a.readingTimeMinutes > maxRt) maxRt = a.readingTimeMinutes;
      }
    });

    const sortableFields = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' }
    ];

    return {
      minPublishDate: minDate ? minDate.toISOString() : null,
      maxPublishDate: maxDate ? maxDate.toISOString() : null,
      readingTimeRange: {
        min: minRt !== null ? minRt : 0,
        max: maxRt !== null ? maxRt : 0
      },
      sortableFields
    };
  }

  searchArticles(
    query,
    publishedAfter,
    minReadingTimeMinutes,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const articles = this._getFromStorage('articles', []);

    const term = query ? query.toLowerCase() : '';
    const after = publishedAfter ? this._parseIsoDateTime(publishedAfter) : null;

    let results = articles.filter((a) => {
      if (term) {
        const text = (
          (a.title || '') + ' ' + (a.excerpt || '') + ' ' + (Array.isArray(a.tags) ? a.tags.join(' ') : '')
        ).toLowerCase();
        if (text.indexOf(term) === -1) return false;
      }
      if (after) {
        const d = this._parseIsoDateTime(a.publishDate);
        if (!d || d <= after) return false;
      }
      if (
        typeof minReadingTimeMinutes === 'number' &&
        (typeof a.readingTimeMinutes !== 'number' || a.readingTimeMinutes < minReadingTimeMinutes)
      ) {
        return false;
      }
      return true;
    });

    if (sortBy === 'newest_first') {
      results.sort((a, b) => {
        const da = this._parseIsoDateTime(a.publishDate) || new Date(0);
        const db = this._parseIsoDateTime(b.publishDate) || new Date(0);
        return db - da;
      });
    } else if (sortBy === 'oldest_first') {
      results.sort((a, b) => {
        const da = this._parseIsoDateTime(a.publishDate) || new Date(0);
        const db = this._parseIsoDateTime(b.publishDate) || new Date(0);
        return da - db;
      });
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const mapped = paged.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt || '',
      publishDate: a.publishDate,
      readingTimeMinutes: a.readingTimeMinutes || 0,
      tags: Array.isArray(a.tags) ? a.tags : []
    }));

    return {
      total,
      page,
      pageSize,
      results: mapped
    };
  }

  saveArticle(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        savedArticleId: null,
        success: false,
        message: 'Article not found.'
      };
    }

    const saved = this._getFromStorage('saved_articles', []);
    const existing = saved.find((s) => s.articleId === articleId);
    if (existing) {
      return {
        savedArticleId: existing.id,
        success: true,
        message: 'Article already saved.'
      };
    }

    const savedArticle = {
      id: this._generateId('saved_article'),
      articleId,
      savedAt: this._nowIso()
    };
    saved.push(savedArticle);
    this._saveToStorage('saved_articles', saved);

    return {
      savedArticleId: savedArticle.id,
      success: true,
      message: 'Article saved.'
    };
  }

  getSavedArticles() {
    const saved = this._getFromStorage('saved_articles', []);
    const articles = this._getFromStorage('articles', []);

    return saved.map((s) => {
      const article = articles.find((a) => a.id === s.articleId) || {};
      return {
        savedArticleId: s.id,
        articleId: s.articleId,
        title: article.title || '',
        excerpt: article.excerpt || '',
        publishDate: article.publishDate || null,
        readingTimeMinutes: article.readingTimeMinutes || 0,
        tags: Array.isArray(article.tags) ? article.tags : [],
        article
      };
    });
  }

  getReadingLists() {
    const lists = this._getFromStorage('reading_lists', []);
    const listItems = this._getFromStorage('reading_list_items', []);

    return lists.map((l) => {
      const articleCount = listItems.filter((i) => i.readingListId === l.id).length;
      return {
        id: l.id,
        name: l.name,
        description: l.description || '',
        createdAt: l.createdAt,
        articleCount
      };
    });
  }

  createReadingList(name, description) {
    const lists = this._getFromStorage('reading_lists', []);
    const list = {
      id: this._generateId('reading_list'),
      name,
      description: description || '',
      createdAt: this._nowIso()
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  addArticlesToReadingList(readingListId, articleIds) {
    const lists = this._getFromStorage('reading_lists', []);
    const list = lists.find((l) => l.id === readingListId);
    if (!list) {
      return {
        success: false,
        addedCount: 0,
        message: 'Reading list not found.'
      };
    }

    const articles = this._getFromStorage('articles', []);
    const items = this._getFromStorage('reading_list_items', []);
    const now = this._nowIso();
    let addedCount = 0;

    (articleIds || []).forEach((aid) => {
      const article = articles.find((a) => a.id === aid);
      if (!article) return;
      const existing = items.find((i) => i.readingListId === readingListId && i.articleId === aid);
      if (existing) return;

      const item = {
        id: this._generateId('reading_list_item'),
        readingListId,
        articleId: aid,
        addedAt: now
      };
      items.push(item);
      addedCount += 1;
    });

    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      addedCount,
      message: 'Articles added to reading list.'
    };
  }

  // ---------------------- Marketplace ----------------------

  getMarketplaceListingFormOptions() {
    const teams = this._getFromStorage('teams', []);
    const categories = [
      { value: 'young_birds', label: 'Young Birds' },
      { value: 'old_birds', label: 'Old Birds' },
      { value: 'breeding_pair', label: 'Breeding Pair' },
      { value: 'stock', label: 'Stock Birds' },
      { value: 'other', label: 'Other' }
    ];

    const saleTeams = teams.filter((t) => t.teamType === 'sale_team');

    return {
      categories,
      teams: saleTeams.map((t) => ({
        id: t.id,
        name: t.name,
        teamType: t.teamType
      }))
    };
  }

  createMarketplaceListing(
    category,
    teamId,
    quantity,
    pricingType,
    totalPrice,
    depositAmount,
    maxProvenDistanceKm,
    title,
    description
  ) {
    const listings = this._getFromStorage('marketplace_listings', []);
    const listing = {
      id: this._generateId('marketplace_listing'),
      category,
      teamId: teamId || null,
      quantity,
      pricingType,
      totalPrice,
      depositAmount: depositAmount || null,
      maxProvenDistanceKm: maxProvenDistanceKm || null,
      title,
      description: description || '',
      status: 'published',
      createdAt: this._nowIso()
    };
    listings.push(listing);
    this._saveToStorage('marketplace_listings', listings);

    return {
      listingId: listing.id,
      status: listing.status,
      message: 'Marketplace listing created.'
    };
  }

  // ---------------------- Consultations ----------------------

  getConsultationTypes() {
    const types = this._getFromStorage('consultation_types', []);
    return types.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      defaultDurationMinutes: t.defaultDurationMinutes || null
    }));
  }

  createConsultationBooking(
    consultationTypeId,
    startDateTime,
    durationMinutes,
    message,
    loftPigeonCount,
    contactName,
    contactEmail
  ) {
    const types = this._getFromStorage('consultation_types', []);
    const type = types.find((t) => t.id === consultationTypeId);
    if (!type) {
      return {
        bookingId: null,
        status: 'pending',
        message: 'Consultation type not found.'
      };
    }

    const bookings = this._getFromStorage('consultation_bookings', []);
    const booking = {
      id: this._generateId('consultation_booking'),
      consultationTypeId,
      startDateTime,
      durationMinutes,
      message: message || '',
      loftPigeonCount: typeof loftPigeonCount === 'number' ? loftPigeonCount : null,
      contactName,
      contactEmail,
      status: 'pending',
      createdAt: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    return {
      bookingId: booking.id,
      status: booking.status,
      message: 'Consultation booking created.'
    };
  }

  // ---------------------- About content ----------------------

  getAboutContent() {
    return {
      headline: 'About the Loft',
      body:
        'This single-user pigeon loft management app helps you organise breeding, racing, training, and sales. All loft data, including pigeons, teams, training plans, and reading lists, is stored locally in your browser or Node.js environment via localStorage. No external services are required.',
      servicesOverview: [
        {
          serviceId: 'breeding_plans',
          title: 'Breeding Plans',
          description: 'Create sprint, middle-distance, and marathon breeding plans with detailed performance history.'
        },
        {
          serviceId: 'race_management',
          title: 'Race Management',
          description: 'Plan upcoming races, register birds by team, and track distance classes.'
        },
        {
          serviceId: 'training_planner',
          title: 'Training Planner',
          description: 'Design progressive toss schedules per team and month to condition your racers.'
        },
        {
          serviceId: 'shop_feed_supplements',
          title: 'Feed & Supplements Shop',
          description: 'Maintain an in-app shopping cart for grain mixes, vitamins, and health products.'
        },
        {
          serviceId: 'learning_center',
          title: 'Learning Center',
          description: 'Save winter breeding and race-prep articles into custom reading lists for later review.'
        },
        {
          serviceId: 'marketplace',
          title: 'Marketplace',
          description: 'Publish fixed-price listings for young birds, breeders, and race teams from your loft.'
        }
      ],
      contactInfo: {
        email: 'info@loft.local',
        phone: ''
      },
      dataHandlingSummary:
        'All data for this loft (pigeons, breeding plans, race registrations, training schedules, cart contents, membership orders, reading lists, and consultation bookings) is persisted in localStorage under structured keys. The app does not sync data to external servers; backups and exports should be handled by copying or exporting this localStorage data as needed.'
    };
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
