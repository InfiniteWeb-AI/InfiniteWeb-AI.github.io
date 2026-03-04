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
    this._initStorage();
  }

  // ------------------------------
  // Storage & ID helpers
  // ------------------------------
  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keys = [
      'bulls',
      'embryo_packages',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'shipping_addresses',
      'shipping_methods',
      'breeding_plans',
      'breeding_plan_items',
      'comparison_lists',
      'comparison_items',
      'favorite_bulls',
      'articles',
      'reading_lists',
      'reading_list_items',
      'consultation_time_slots',
      'consultation_bookings',
      'herd_genetic_scenarios',
      'herd_genetic_recommendations',
      'breeding_season_plans',
      'breeding_season_protocols',
      'contact_messages'
    ];

    for (const key of keys) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ------------------------------
  // Label / formatting helpers
  // ------------------------------
  _capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  _formatBreedLabel(code) {
    switch (code) {
      case 'angus': return 'Angus';
      case 'holstein': return 'Holstein';
      case 'hereford': return 'Hereford';
      case 'wagyu': return 'Wagyu';
      case 'other': return 'Other';
      default: return this._capitalize(String(code).replace(/_/g, ' '));
    }
  }

  _formatProductionTypeLabel(code) {
    switch (code) {
      case 'beef': return 'Beef';
      case 'dairy': return 'Dairy';
      case 'dual_purpose': return 'Dual-purpose';
      default: return this._capitalize(String(code).replace(/_/g, ' '));
    }
  }

  _formatHornStatusLabel(code) {
    switch (code) {
      case 'polled': return 'Polled';
      case 'horned': return 'Horned';
      case 'scurred': return 'Scurred';
      case 'unknown': return 'Unknown';
      default: return this._capitalize(String(code).replace(/_/g, ' '));
    }
  }

  // ------------------------------
  // Cart helpers
  // ------------------------------
  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        subtotal: 0,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getOpenCart() {
    const carts = this._getFromStorage('carts');
    return carts.find(c => c.status === 'open') || null;
  }

  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const cart = carts.find(c => c.id === cartId);
    if (!cart) return null;

    const itemsForCart = cartItems.filter(i => i.cartId === cart.id);
    const subtotal = itemsForCart.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);

    cart.subtotal = subtotal;
    cart.updatedAt = this._nowIso();

    this._saveToStorage('carts', carts);
    return cart;
  }

  // ------------------------------
  // Breeding plan helpers
  // ------------------------------
  _getOrCreateBreedingPlan() {
    const plans = this._getFromStorage('breeding_plans');
    let plan = plans[0];
    if (!plan) {
      plan = {
        id: this._generateId('breedingplan'),
        name: 'Current Breeding Plan',
        notes: '',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      plans.push(plan);
      this._saveToStorage('breeding_plans', plans);
    }
    return plan;
  }

  // ------------------------------
  // Comparison helpers
  // ------------------------------
  _getOrCreateComparisonList() {
    const lists = this._getFromStorage('comparison_lists');
    let list = lists[0];
    if (!list) {
      list = {
        id: this._generateId('comparison'),
        name: 'Current Comparison',
        createdAt: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('comparison_lists', lists);
    }
    return list;
  }

  // ------------------------------
  // Reading list helpers
  // ------------------------------
  _getOrCreateReadingList() {
    const lists = this._getFromStorage('reading_lists');
    let list = lists[0];
    if (!list) {
      list = {
        id: this._generateId('readinglist'),
        name: 'Saved Articles',
        createdAt: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  // ------------------------------
  // Order / checkout helpers
  // ------------------------------
  _getOrCreateDraftOrder() {
    const cart = this._getOrCreateCart();
    const orders = this._getFromStorage('orders');
    let order = orders.find(o => o.cartId === cart.id && o.status === 'draft');
    if (!order) {
      order = {
        id: this._generateId('order'),
        orderNumber: null,
        cartId: cart.id,
        status: 'draft',
        customerName: null,
        customerEmail: null,
        customerPhone: null,
        shippingMethodId: null,
        subtotal: cart.subtotal || 0,
        shippingTotal: 0,
        total: cart.subtotal || 0,
        createdAt: this._nowIso()
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
    }
    return order;
  }

  // ------------------------------
  // Embryo helpers
  // ------------------------------
  _calculateEmbryoPricePerUnit(totalPrice, numberOfEmbryos) {
    const total = Number(totalPrice);
    const count = Number(numberOfEmbryos);
    if (!count || !isFinite(count) || count <= 0) return null;
    if (!isFinite(total)) return null;
    return total / count;
  }

  // ------------------------------
  // Herd genetic calculator helpers
  // ------------------------------
  _generateHerdGeneticRecommendations(scenario) {
    const recommendations = this._getFromStorage('herd_genetic_recommendations');
    const bulls = this._getFromStorage('bulls').filter(b => b.status === 'active');

    let scoredBulls = [];
    if (scenario.targetTrait === 'weaning_weight') {
      scoredBulls = bulls
        .filter(b => typeof b.weaningWeightIndex === 'number')
        .sort((a, b) => (b.weaningWeightIndex || 0) - (a.weaningWeightIndex || 0));
    } else if (scenario.targetTrait === 'milk_yield') {
      scoredBulls = bulls
        .filter(b => typeof b.milkYieldIndex === 'number')
        .sort((a, b) => (b.milkYieldIndex || 0) - (a.milkYieldIndex || 0));
    } else if (scenario.targetTrait === 'calving_ease') {
      scoredBulls = bulls
        .filter(b => typeof b.calvingEaseScore === 'number')
        .sort((a, b) => (b.calvingEaseScore || 0) - (a.calvingEaseScore || 0));
    } else {
      // Fallback: sort by geneticMeritIndex if available
      scoredBulls = bulls
        .filter(b => typeof b.geneticMeritIndex === 'number')
        .sort((a, b) => (b.geneticMeritIndex || 0) - (a.geneticMeritIndex || 0));
    }

    const newRecs = [];
    scoredBulls.forEach((bull, index) => {
      const rec = {
        id: this._generateId('hgrec'),
        scenarioId: scenario.id,
        bullId: bull.id,
        rank: index + 1,
        expectedImprovementValue: null,
        weaningWeightIndex: bull.weaningWeightIndex || null,
        milkYieldIndex: bull.milkYieldIndex || null,
        calvingEaseScore: bull.calvingEaseScore || null,
        notes: null
      };
      recommendations.push(rec);
      newRecs.push(rec);
    });

    this._saveToStorage('herd_genetic_recommendations', recommendations);
    return newRecs;
  }

  // ------------------------------
  // Breeding season helpers
  // ------------------------------
  _computeBreedingSeasonEndDate(startDate, lengthDays) {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return null;
    const days = Number(lengthDays) || 0;
    const endMs = start.getTime() + days * 24 * 60 * 60 * 1000;
    return new Date(endMs).toISOString();
  }

  // ------------------------------
  // Consultation helpers
  // ------------------------------
  _findAvailableConsultationTimeSlots(serviceType, startDate, endDate, earliestTimeOfDay) {
    const slots = this._getFromStorage('consultation_time_slots');
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T23:59:59Z');

    let earliestMinutes = null;
    if (earliestTimeOfDay) {
      const parts = earliestTimeOfDay.split(':');
      if (parts.length === 2) {
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        earliestMinutes = h * 60 + m;
      }
    }

    return slots.filter(slot => {
      if (slot.serviceType !== serviceType) return false;
      if (slot.isBooked) return false;
      const startDt = new Date(slot.startDateTime);
      if (startDt < start || startDt > end) return false;
      if (earliestMinutes != null) {
        const minutes = startDt.getUTCHours() * 60 + startDt.getUTCMinutes();
        if (minutes < earliestMinutes) return false;
      }
      return true;
    }).sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
  }

  // ==========================================================
  // Interface implementations
  // ==========================================================

  // ------------------------------
  // Homepage
  // ------------------------------
  getHomepageContent() {
    const bulls = this._getFromStorage('bulls').filter(b => b.status === 'active');
    const embryoPackages = this._getFromStorage('embryo_packages').filter(p => p.status === 'available');
    const articles = this._getFromStorage('articles').filter(a => a.isPublished);

    const featuredBulls = bulls.slice(0, 4).map(bull => {
      const traits = [];
      if (typeof bull.calvingEaseScore === 'number') traits.push('Calving ease ' + bull.calvingEaseScore);
      if (typeof bull.weaningWeightIndex === 'number') traits.push('WW index ' + bull.weaningWeightIndex);
      if (typeof bull.milkYieldIndex === 'number') traits.push('Milk index ' + bull.milkYieldIndex);
      return {
        bull,
        displayName: bull.name,
        breedLabel: this._formatBreedLabel(bull.breed),
        productionTypeLabel: this._formatProductionTypeLabel(bull.productionType),
        pricePerStraw: bull.pricePerStraw,
        keyTraitsSummary: traits.join(' · '),
        imageUrl: bull.imageUrl || null
      };
    });

    const featuredEmbryoPackages = embryoPackages.slice(0, 4).map(pkg => {
      const pricePerEmbryo = this._calculateEmbryoPricePerUnit(pkg.totalPrice, pkg.numberOfEmbryos);
      return {
        embryoPackage: pkg,
        displayName: pkg.name,
        breedLabel: this._formatBreedLabel(pkg.breed),
        embryosPerPackage: pkg.numberOfEmbryos,
        totalPrice: pkg.totalPrice,
        geneticMeritIndex: pkg.geneticMeritIndex,
        pricePerEmbryo,
        imageUrl: pkg.imageUrl || null
      };
    });

    const popularArticles = articles
      .sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate))
      .slice(0, 3);

    const quickActions = [
      {
        id: 'qa_semen_catalog',
        label: 'Order bull semen',
        description: 'Browse beef and dairy sires by trait and price.',
        targetPage: 'semen_catalog',
        workflowType: 'order_semen'
      },
      {
        id: 'qa_breeding_plan',
        label: 'Build a breeding plan',
        description: 'Save and organize sires for your next breeding season.',
        targetPage: 'breeding_plan',
        workflowType: 'build_breeding_plan'
      },
      {
        id: 'qa_consultation',
        label: 'Book a genetic consultation',
        description: 'Schedule time with a genetics specialist.',
        targetPage: 'consultation_booking',
        workflowType: 'book_consultation'
      },
      {
        id: 'qa_education',
        label: 'Learn genetics basics',
        description: 'Short articles and guides on breeding and selection.',
        targetPage: 'articles',
        workflowType: 'learn_basics'
      }
    ];

    return {
      featuredBulls,
      featuredEmbryoPackages,
      popularArticles,
      quickActions
    };
  }

  // ------------------------------
  // Semen catalog
  // ------------------------------
  getSemenCatalogFilterOptions() {
    const bulls = this._getFromStorage('bulls');

    const breeds = [
      { value: 'angus', label: 'Angus' },
      { value: 'holstein', label: 'Holstein' },
      { value: 'hereford', label: 'Hereford' },
      { value: 'wagyu', label: 'Wagyu' },
      { value: 'other', label: 'Other' }
    ];

    const productionTypes = [
      { value: 'beef', label: 'Beef' },
      { value: 'dairy', label: 'Dairy' },
      { value: 'dual_purpose', label: 'Dual-purpose' }
    ];

    const hornStatuses = [
      { value: 'polled', label: 'Polled' },
      { value: 'horned', label: 'Horned' },
      { value: 'scurred', label: 'Scurred' },
      { value: 'unknown', label: 'Unknown' }
    ];

    const numericRange = (arr, field) => {
      const values = arr.map(x => x[field]).filter(v => typeof v === 'number');
      if (!values.length) return { min: null, max: null };
      return { min: Math.min(...values), max: Math.max(...values) };
    };

    const priceRangeVals = numericRange(bulls, 'pricePerStraw');
    const calvingRangeVals = numericRange(bulls, 'calvingEaseScore');
    const milkRangeVals = numericRange(bulls, 'milkYieldIndex');
    const scsRangeVals = numericRange(bulls, 'somaticCellScore');
    const wwRangeVals = numericRange(bulls, 'weaningWeightIndex');

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'milk_yield_desc', label: 'Milk Yield Index: High to Low' },
      { value: 'weaning_weight_desc', label: 'Weaning Weight Index: High to Low' }
    ];

    return {
      breeds,
      productionTypes,
      hornStatuses,
      priceRange: { ...priceRangeVals, currency: 'USD' },
      calvingEaseRange: calvingRangeVals,
      milkYieldIndexRange: milkRangeVals,
      somaticCellScoreRange: scsRangeVals,
      weaningWeightIndexRange: wwRangeVals,
      sortOptions
    };
  }

  listBulls(searchTerm, filters, sort, page, pageSize) {
    sort = sort || 'relevance';
    page = page || 1;
    pageSize = pageSize || 20;
    filters = filters || {};

    let bulls = this._getFromStorage('bulls');

    // Default to active bulls if status not explicitly provided
    if (!filters.status) {
      bulls = bulls.filter(b => b.status === 'active');
    } else {
      bulls = bulls.filter(b => b.status === filters.status);
    }

    if (searchTerm) {
      const term = String(searchTerm).toLowerCase();
      bulls = bulls.filter(b => {
        const inName = (b.name || '').toLowerCase().includes(term);
        const inReg = (b.registrationNumber || '').toLowerCase().includes(term);
        const inTags = Array.isArray(b.tags) && b.tags.some(t => String(t).toLowerCase().includes(term));
        return inName || inReg || inTags;
      });
    }

    if (filters.breeds && filters.breeds.length) {
      const set = new Set(filters.breeds);
      bulls = bulls.filter(b => set.has(b.breed));
    }

    if (filters.productionTypes && filters.productionTypes.length) {
      const set = new Set(filters.productionTypes);
      bulls = bulls.filter(b => set.has(b.productionType));
    }

    if (typeof filters.minPricePerStraw === 'number') {
      bulls = bulls.filter(b => typeof b.pricePerStraw === 'number' && b.pricePerStraw >= filters.minPricePerStraw);
    }

    if (typeof filters.maxPricePerStraw === 'number') {
      bulls = bulls.filter(b => typeof b.pricePerStraw === 'number' && b.pricePerStraw <= filters.maxPricePerStraw);
    }

    if (typeof filters.minCalvingEaseScore === 'number') {
      bulls = bulls.filter(b => typeof b.calvingEaseScore === 'number' && b.calvingEaseScore >= filters.minCalvingEaseScore);
    }

    if (typeof filters.minDocilityScore === 'number') {
      bulls = bulls.filter(b => typeof b.docilityScore === 'number' && b.docilityScore >= filters.minDocilityScore);
    }

    if (filters.hornStatuses && filters.hornStatuses.length) {
      const set = new Set(filters.hornStatuses);
      bulls = bulls.filter(b => set.has(b.hornStatus));
    }

    if (filters.heiferSafeOnly) {
      bulls = bulls.filter(b => b.heiferSafe === true);
    }

    if (typeof filters.minMilkYieldIndex === 'number') {
      bulls = bulls.filter(b => typeof b.milkYieldIndex === 'number' && b.milkYieldIndex >= filters.minMilkYieldIndex);
    }

    if (typeof filters.maxSomaticCellScore === 'number') {
      bulls = bulls.filter(b => typeof b.somaticCellScore === 'number' && b.somaticCellScore <= filters.maxSomaticCellScore);
    }

    if (typeof filters.minWeaningWeightIndex === 'number') {
      bulls = bulls.filter(b => typeof b.weaningWeightIndex === 'number' && b.weaningWeightIndex >= filters.minWeaningWeightIndex);
    }

    if (filters.tags && filters.tags.length) {
      const tagsSet = new Set(filters.tags.map(t => String(t).toLowerCase()));
      bulls = bulls.filter(b => Array.isArray(b.tags) && b.tags.some(t => tagsSet.has(String(t).toLowerCase())));
    }

    // Sorting
    const byNumberFieldDesc = field => (a, b) => (b[field] || 0) - (a[field] || 0);
    const byPriceAsc = (a, b) => {
      const pa = typeof a.pricePerStraw === 'number' ? a.pricePerStraw : Number.POSITIVE_INFINITY;
      const pb = typeof b.pricePerStraw === 'number' ? b.pricePerStraw : Number.POSITIVE_INFINITY;
      return pa - pb;
    };
    const byPriceDesc = (a, b) => {
      const pa = typeof a.pricePerStraw === 'number' ? a.pricePerStraw : Number.NEGATIVE_INFINITY;
      const pb = typeof b.pricePerStraw === 'number' ? b.pricePerStraw : Number.NEGATIVE_INFINITY;
      return pb - pa;
    };

    if (sort === 'price_asc') {
      bulls.sort(byPriceAsc);
    } else if (sort === 'price_desc') {
      bulls.sort(byPriceDesc);
    } else if (sort === 'milk_yield_desc') {
      bulls.sort(byNumberFieldDesc('milkYieldIndex'));
    } else if (sort === 'weaning_weight_desc') {
      bulls.sort(byNumberFieldDesc('weaningWeightIndex'));
    } else {
      // relevance fallback: name ascending
      bulls.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const totalCount = bulls.length;
    const start = (page - 1) * pageSize;
    const paged = bulls.slice(start, start + pageSize);

    const results = paged.map(bull => ({
      bull,
      displayName: bull.name,
      breedLabel: this._formatBreedLabel(bull.breed),
      productionTypeLabel: this._formatProductionTypeLabel(bull.productionType),
      pricePerStraw: bull.pricePerStraw,
      calvingEaseScore: bull.calvingEaseScore,
      docilityScore: bull.docilityScore,
      hornStatusLabel: this._formatHornStatusLabel(bull.hornStatus),
      milkYieldIndex: bull.milkYieldIndex,
      somaticCellScore: bull.somaticCellScore,
      weaningWeightIndex: bull.weaningWeightIndex,
      heiferSafe: bull.heiferSafe,
      geneticMeritIndex: bull.geneticMeritIndex,
      imageUrl: bull.imageUrl || null,
      tags: Array.isArray(bull.tags) ? bull.tags : []
    }));

    return { results, totalCount, page, pageSize };
  }

  getBullDetails(bullId) {
    const bulls = this._getFromStorage('bulls');
    const bull = bulls.find(b => b.id === bullId) || null;

    if (!bull) {
      return {
        bull: null,
        breedLabel: null,
        productionTypeLabel: null,
        hornStatusLabel: null,
        isFavorite: false,
        inBreedingPlan: false,
        comparisonSelected: false,
        pedigreeSummary: null,
        traitDetails: {},
        marketingDescription: null
      };
    }

    const favorites = this._getFromStorage('favorite_bulls');
    const breedingPlanItems = this._getFromStorage('breeding_plan_items');
    const comparisonItems = this._getFromStorage('comparison_items');

    const isFavorite = favorites.some(f => f.bullId === bullId);
    const inBreedingPlan = breedingPlanItems.some(i => i.bullId === bullId);
    const comparisonSelected = comparisonItems.some(i => i.bullId === bullId);

    return {
      bull,
      breedLabel: this._formatBreedLabel(bull.breed),
      productionTypeLabel: this._formatProductionTypeLabel(bull.productionType),
      hornStatusLabel: this._formatHornStatusLabel(bull.hornStatus),
      isFavorite,
      inBreedingPlan,
      comparisonSelected,
      pedigreeSummary: bull.description || null,
      traitDetails: {
        calvingEaseScore: bull.calvingEaseScore,
        docilityScore: bull.docilityScore,
        milkYieldIndex: bull.milkYieldIndex,
        somaticCellScore: bull.somaticCellScore,
        weaningWeightIndex: bull.weaningWeightIndex,
        geneticMeritIndex: bull.geneticMeritIndex
      },
      marketingDescription: bull.description || null
    };
  }

  addBullStrawsToCart(bullId, quantity) {
    quantity = Number(quantity) || 0;
    if (quantity <= 0) {
      return { success: false, cart: null, cartItems: [], message: 'Quantity must be greater than 0.' };
    }

    const bulls = this._getFromStorage('bulls');
    const bull = bulls.find(b => b.id === bullId);
    if (!bull || bull.status !== 'active') {
      return { success: false, cart: null, cartItems: [], message: 'Bull not found or inactive.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(i => i.cartId === cart.id && i.itemType === 'semen' && i.bullId === bullId);
    if (item) {
      item.quantity = (Number(item.quantity) || 0) + quantity;
      item.lineTotal = (Number(item.unitPrice) || 0) * item.quantity;
    } else {
      item = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        itemType: 'semen',
        bullId: bull.id,
        embryoPackageId: null,
        name: bull.name,
        quantity: quantity,
        unitPrice: bull.pricePerStraw || 0,
        lineTotal: (bull.pricePerStraw || 0) * quantity,
        createdAt: this._nowIso()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    const itemsForCart = cartItems.filter(i => i.cartId === updatedCart.id);

    return { success: true, cart: updatedCart, cartItems: itemsForCart, message: 'Added to cart.' };
  }

  // ------------------------------
  // Breeding plan
  // ------------------------------
  addBullToBreedingPlan(bullId, source, notes) {
    source = source || 'catalog';
    const plan = this._getOrCreateBreedingPlan();
    const items = this._getFromStorage('breeding_plan_items');

    let existing = items.find(i => i.breedingPlanId === plan.id && i.bullId === bullId);
    if (!existing) {
      existing = {
        id: this._generateId('bpitem'),
        breedingPlanId: plan.id,
        bullId,
        source,
        notes: notes || null,
        createdAt: this._nowIso()
      };
      items.push(existing);
    } else if (notes) {
      existing.notes = notes;
    }

    plan.updatedAt = this._nowIso();
    const plans = this._getFromStorage('breeding_plans');
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx >= 0) {
      plans[idx] = plan;
      this._saveToStorage('breeding_plans', plans);
    }

    this._saveToStorage('breeding_plan_items', items);

    const itemsForPlan = items.filter(i => i.breedingPlanId === plan.id);
    return { breedingPlan: plan, items: itemsForPlan, message: 'Bull added to breeding plan.' };
  }

  getBreedingPlanSummary() {
    const plan = this._getOrCreateBreedingPlan();
    const items = this._getFromStorage('breeding_plan_items').filter(i => i.breedingPlanId === plan.id);
    const bulls = this._getFromStorage('bulls');

    const enrichedItems = items.map(planItem => {
      const bull = bulls.find(b => b.id === planItem.bullId) || null;
      let keyTraitsSummary = '';
      if (bull) {
        const parts = [];
        if (typeof bull.weaningWeightIndex === 'number') parts.push('WW ' + bull.weaningWeightIndex);
        if (typeof bull.milkYieldIndex === 'number') parts.push('Milk ' + bull.milkYieldIndex);
        if (typeof bull.calvingEaseScore === 'number') parts.push('CE ' + bull.calvingEaseScore);
        keyTraitsSummary = parts.join(' · ');
      }
      return {
        planItem,
        bull,
        breedLabel: bull ? this._formatBreedLabel(bull.breed) : null,
        productionTypeLabel: bull ? this._formatProductionTypeLabel(bull.productionType) : null,
        keyTraitsSummary
      };
    });

    return { breedingPlan: plan, items: enrichedItems };
  }

  removeBullFromBreedingPlan(breedingPlanItemId) {
    const items = this._getFromStorage('breeding_plan_items');
    const idx = items.findIndex(i => i.id === breedingPlanItemId);
    let planId = null;
    if (idx >= 0) {
      planId = items[idx].breedingPlanId;
      items.splice(idx, 1);
      this._saveToStorage('breeding_plan_items', items);
    }
    const plan = planId ? this._getFromStorage('breeding_plans').find(p => p.id === planId) || this._getOrCreateBreedingPlan() : this._getOrCreateBreedingPlan();
    const remaining = this._getFromStorage('breeding_plan_items').filter(i => i.breedingPlanId === plan.id);
    return { breedingPlan: plan, items: remaining };
  }

  // ------------------------------
  // Comparison & favorites
  // ------------------------------
  addBullToComparison(bullId) {
    const list = this._getOrCreateComparisonList();
    const items = this._getFromStorage('comparison_items');

    let existing = items.find(i => i.comparisonListId === list.id && i.bullId === bullId);
    if (!existing) {
      existing = {
        id: this._generateId('cmpitem'),
        comparisonListId: list.id,
        bullId,
        addedAt: this._nowIso()
      };
      items.push(existing);
      this._saveToStorage('comparison_items', items);
    }

    const itemsForList = items.filter(i => i.comparisonListId === list.id);
    return { comparisonList: list, items: itemsForList, message: 'Bull added to comparison.' };
  }

  getComparisonView() {
    const list = this._getOrCreateComparisonList();
    const items = this._getFromStorage('comparison_items').filter(i => i.comparisonListId === list.id);
    const bulls = this._getFromStorage('bulls');
    const favorites = this._getFromStorage('favorite_bulls');

    const enriched = items.map(comparisonItem => {
      const bull = bulls.find(b => b.id === comparisonItem.bullId) || null;
      const isFavorite = favorites.some(f => f.bullId === comparisonItem.bullId);
      return {
        comparisonItem,
        bull,
        breedLabel: bull ? this._formatBreedLabel(bull.breed) : null,
        pricePerStraw: bull ? bull.pricePerStraw : null,
        docilityScore: bull ? bull.docilityScore : null,
        hornStatusLabel: bull ? this._formatHornStatusLabel(bull.hornStatus) : null,
        weaningWeightIndex: bull ? bull.weaningWeightIndex : null,
        isFavorite
      };
    });

    return { comparisonList: list, bulls: enriched };
  }

  removeBullFromComparison(comparisonItemId) {
    const items = this._getFromStorage('comparison_items');
    const idx = items.findIndex(i => i.id === comparisonItemId);
    if (idx >= 0) {
      items.splice(idx, 1);
      this._saveToStorage('comparison_items', items);
    }
    const list = this._getOrCreateComparisonList();
    const remaining = items.filter(i => i.comparisonListId === list.id);
    return { comparisonList: list, items: remaining };
  }

  toggleFavoriteBull(bullId, favorite) {
    const favorites = this._getFromStorage('favorite_bulls');
    const existingIndex = favorites.findIndex(f => f.bullId === bullId);
    let favoriteRecord = null;

    if (favorite) {
      if (existingIndex === -1) {
        favoriteRecord = {
          id: this._generateId('favbull'),
          bullId,
          createdAt: this._nowIso(),
          notes: null
        };
        favorites.push(favoriteRecord);
        this._saveToStorage('favorite_bulls', favorites);
      } else {
        favoriteRecord = favorites[existingIndex];
      }
      return { isFavorite: true, favoriteRecord };
    } else {
      if (existingIndex !== -1) {
        favoriteRecord = favorites[existingIndex];
        favorites.splice(existingIndex, 1);
        this._saveToStorage('favorite_bulls', favorites);
      }
      return { isFavorite: false, favoriteRecord: null };
    }
  }

  // ------------------------------
  // Embryo catalog & cart
  // ------------------------------
  getEmbryoCatalogFilterOptions() {
    const packages = this._getFromStorage('embryo_packages');

    const breeds = [
      { value: 'angus', label: 'Angus' },
      { value: 'holstein', label: 'Holstein' },
      { value: 'hereford', label: 'Hereford' },
      { value: 'wagyu', label: 'Wagyu' },
      { value: 'other', label: 'Other' }
    ];

    const numericRange = (arr, field) => {
      const values = arr.map(x => x[field]).filter(v => typeof v === 'number');
      if (!values.length) return { min: null, max: null };
      return { min: Math.min(...values), max: Math.max(...values) };
    };

    const embryosRange = numericRange(packages, 'numberOfEmbryos');
    const totalPriceRangeVals = numericRange(packages, 'totalPrice');
    const gmiRange = numericRange(packages, 'geneticMeritIndex');

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'genetic_merit_desc', label: 'Genetic Merit: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' }
    ];

    return {
      breeds,
      numberOfEmbryosRange: embryosRange,
      totalPriceRange: { ...totalPriceRangeVals, currency: 'USD' },
      geneticMeritIndexRange: gmiRange,
      sortOptions
    };
  }

  listEmbryoPackages(filters, sort, page, pageSize) {
    sort = sort || 'relevance';
    page = page || 1;
    pageSize = pageSize || 20;
    filters = filters || {};

    let packages = this._getFromStorage('embryo_packages');

    if (!filters.status) {
      packages = packages.filter(p => p.status === 'available');
    } else {
      packages = packages.filter(p => p.status === filters.status);
    }

    if (filters.breeds && filters.breeds.length) {
      const set = new Set(filters.breeds);
      packages = packages.filter(p => set.has(p.breed));
    }

    if (typeof filters.minNumberOfEmbryos === 'number') {
      packages = packages.filter(p => typeof p.numberOfEmbryos === 'number' && p.numberOfEmbryos >= filters.minNumberOfEmbryos);
    }

    if (typeof filters.maxNumberOfEmbryos === 'number') {
      packages = packages.filter(p => typeof p.numberOfEmbryos === 'number' && p.numberOfEmbryos <= filters.maxNumberOfEmbryos);
    }

    if (typeof filters.minTotalPrice === 'number') {
      packages = packages.filter(p => typeof p.totalPrice === 'number' && p.totalPrice >= filters.minTotalPrice);
    }

    if (typeof filters.maxTotalPrice === 'number') {
      packages = packages.filter(p => typeof p.totalPrice === 'number' && p.totalPrice <= filters.maxTotalPrice);
    }

    if (typeof filters.minGeneticMeritIndex === 'number') {
      packages = packages.filter(p => typeof p.geneticMeritIndex === 'number' && p.geneticMeritIndex >= filters.minGeneticMeritIndex);
    }

    if (sort === 'genetic_merit_desc') {
      packages.sort((a, b) => (b.geneticMeritIndex || 0) - (a.geneticMeritIndex || 0));
    } else if (sort === 'price_asc') {
      packages.sort((a, b) => (a.totalPrice || Number.POSITIVE_INFINITY) - (b.totalPrice || Number.POSITIVE_INFINITY));
    } else {
      packages.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const totalCount = packages.length;
    const start = (page - 1) * pageSize;
    const paged = packages.slice(start, start + pageSize);

    const results = paged.map(pkg => ({
      embryoPackage: pkg,
      displayName: pkg.name,
      breedLabel: this._formatBreedLabel(pkg.breed),
      embryosPerPackage: pkg.numberOfEmbryos,
      totalPrice: pkg.totalPrice,
      pricePerEmbryo: this._calculateEmbryoPricePerUnit(pkg.totalPrice, pkg.numberOfEmbryos),
      geneticMeritIndex: pkg.geneticMeritIndex,
      imageUrl: pkg.imageUrl || null
    }));

    return { results, totalCount, page, pageSize };
  }

  getEmbryoPackageDetails(embryoPackageId) {
    const packages = this._getFromStorage('embryo_packages');
    const pkg = packages.find(p => p.id === embryoPackageId) || null;

    if (!pkg) {
      return {
        embryoPackage: null,
        breedLabel: null,
        donorDamDescription: null,
        sireBull: null,
        pricePerEmbryo: null,
        geneticHighlights: null,
        marketingDescription: null
      };
    }

    const bulls = this._getFromStorage('bulls');
    const sireBull = pkg.sireBullId ? (bulls.find(b => b.id === pkg.sireBullId) || null) : null;
    const pricePerEmbryo = this._calculateEmbryoPricePerUnit(pkg.totalPrice, pkg.numberOfEmbryos);

    const donorDamDescription = pkg.donorDamName ? 'Donor dam: ' + pkg.donorDamName : null;
    const geneticHighlights = pkg.geneticMeritIndex != null ? 'Genetic merit index ' + pkg.geneticMeritIndex : null;

    return {
      embryoPackage: pkg,
      breedLabel: this._formatBreedLabel(pkg.breed),
      donorDamDescription,
      sireBull,
      pricePerEmbryo,
      geneticHighlights,
      marketingDescription: pkg.description || null
    };
  }

  addEmbryoPackageToCart(embryoPackageId, quantity) {
    quantity = Number(quantity) || 0;
    if (quantity <= 0) {
      return { success: false, cart: null, cartItems: [], message: 'Quantity must be greater than 0.' };
    }

    const packages = this._getFromStorage('embryo_packages');
    const pkg = packages.find(p => p.id === embryoPackageId);
    if (!pkg || pkg.status !== 'available') {
      return { success: false, cart: null, cartItems: [], message: 'Embryo package not found or unavailable.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(i => i.cartId === cart.id && i.itemType === 'embryo' && i.embryoPackageId === embryoPackageId);
    if (item) {
      item.quantity = (Number(item.quantity) || 0) + quantity;
      item.lineTotal = (Number(item.unitPrice) || 0) * item.quantity;
    } else {
      item = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        itemType: 'embryo',
        bullId: null,
        embryoPackageId: pkg.id,
        name: pkg.name,
        quantity: quantity,
        unitPrice: pkg.totalPrice || 0,
        lineTotal: (pkg.totalPrice || 0) * quantity,
        createdAt: this._nowIso()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart.id) || cart;
    const itemsForCart = cartItems.filter(i => i.cartId === updatedCart.id);

    return { success: true, cart: updatedCart, cartItems: itemsForCart, message: 'Embryo package added to cart.' };
  }

  // ------------------------------
  // Cart summary & updates
  // ------------------------------
  getCartSummary() {
    const cart = this._getOpenCart();
    if (!cart) {
      return { cart: null, items: [], subtotal: 0, currency: 'USD' };
    }

    const cartItems = this._getFromStorage('cart_items').filter(i => i.cartId === cart.id);
    const bulls = this._getFromStorage('bulls');
    const embryoPackages = this._getFromStorage('embryo_packages');

    const items = cartItems.map(cartItem => {
      const bull = cartItem.bullId ? (bulls.find(b => b.id === cartItem.bullId) || null) : null;
      const embryoPackage = cartItem.embryoPackageId ? (embryoPackages.find(p => p.id === cartItem.embryoPackageId) || null) : null;
      return {
        cartItem,
        itemType: cartItem.itemType,
        bull,
        embryoPackage
      };
    });

    return {
      cart,
      items,
      subtotal: cart.subtotal || 0,
      currency: 'USD'
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    quantity = Number(quantity) || 0;
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(i => i.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOpenCart();
      return {
        cart,
        items: cart ? cartItems.filter(i => i.cartId === cart.id) : [],
        subtotal: cart ? cart.subtotal || 0 : 0
      };
    }

    const cartId = cartItems[idx].cartId;

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.lineTotal = (Number(item.unitPrice) || 0) * quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cartId);
    const itemsForCart = cartItems.filter(i => i.cartId === cartId);

    return {
      cart: updatedCart,
      items: itemsForCart,
      subtotal: updatedCart ? updatedCart.subtotal || 0 : 0
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(i => i.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOpenCart();
      return {
        cart,
        items: cart ? cartItems.filter(i => i.cartId === cart.id) : [],
        subtotal: cart ? cart.subtotal || 0 : 0
      };
    }

    const cartId = cartItems[idx].cartId;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cartId);
    const itemsForCart = cartItems.filter(i => i.cartId === cartId);

    return {
      cart: updatedCart,
      items: itemsForCart,
      subtotal: updatedCart ? updatedCart.subtotal || 0 : 0
    };
  }

  // ------------------------------
  // Checkout & orders
  // ------------------------------
  initiateCheckout() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(i => i.cartId === cart.id);
    const order = this._getOrCreateDraftOrder();

    // Snapshot cart items into order_items if none exist yet for this order
    let orderItems = this._getFromStorage('order_items');
    const existingForOrder = orderItems.filter(oi => oi.orderId === order.id);

    if (!existingForOrder.length) {
      cartItems.forEach(ci => {
        const oi = {
          id: this._generateId('orderitem'),
          orderId: order.id,
          itemType: ci.itemType,
          bullId: ci.bullId || null,
          embryoPackageId: ci.embryoPackageId || null,
          name: ci.name || null,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
          lineTotal: ci.lineTotal
        };
        orderItems.push(oi);
      });
      this._saveToStorage('order_items', orderItems);
      orderItems = orderItems.filter(oi => oi.orderId === order.id);
    } else {
      orderItems = existingForOrder;
    }

    // Ensure order totals align with cart subtotal
    order.subtotal = cart.subtotal || 0;
    order.total = (order.subtotal || 0) + (order.shippingTotal || 0);
    const orders = this._getFromStorage('orders');
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
      this._saveToStorage('orders', orders);
    }

    return {
      order,
      items: orderItems,
      cart
    };
  }

  updateCheckoutContactAndShipping(orderId, customerName, customerEmail, customerPhone, shippingAddress, checkoutMode) {
    checkoutMode = checkoutMode || 'guest';
    const orders = this._getFromStorage('orders');
    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return { order: null, shippingAddress: null };
    }

    order.customerName = customerName;
    order.customerEmail = customerEmail;
    order.customerPhone = customerPhone;
    // checkoutMode currently not stored, but could be used in future

    this._saveToStorage('orders', orders);

    // Create or update ShippingAddress
    const addresses = this._getFromStorage('shipping_addresses');
    let addr = addresses.find(a => a.orderId === orderId);
    if (!addr) {
      addr = {
        id: this._generateId('shipaddr'),
        orderId,
        fullName: shippingAddress.fullName,
        email: shippingAddress.email,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || null,
        city: shippingAddress.city,
        stateRegion: shippingAddress.stateRegion || null,
        postalCode: shippingAddress.postalCode || null,
        country: shippingAddress.country || null
      };
      addresses.push(addr);
    } else {
      addr.fullName = shippingAddress.fullName;
      addr.email = shippingAddress.email;
      addr.phone = shippingAddress.phone;
      addr.addressLine1 = shippingAddress.addressLine1;
      addr.addressLine2 = shippingAddress.addressLine2 || null;
      addr.city = shippingAddress.city;
      addr.stateRegion = shippingAddress.stateRegion || null;
      addr.postalCode = shippingAddress.postalCode || null;
      addr.country = shippingAddress.country || null;
    }

    this._saveToStorage('shipping_addresses', addresses);

    return { order, shippingAddress: addr };
  }

  getAvailableShippingMethods(orderId) {
    const orders = this._getFromStorage('orders');
    const order = orders.find(o => o.id === orderId) || null;
    const shippingMethods = this._getFromStorage('shipping_methods').filter(m => m.isActive);
    const defaultMethod = shippingMethods.find(m => m.isDefault) || shippingMethods[0] || null;

    return {
      shippingMethods,
      defaultShippingMethodId: defaultMethod ? defaultMethod.id : null,
      order
    };
  }

  selectShippingMethod(orderId, shippingMethodId) {
    const orders = this._getFromStorage('orders');
    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return { order: null, shippingMethod: null };
    }

    const methods = this._getFromStorage('shipping_methods');
    const method = methods.find(m => m.id === shippingMethodId) || null;
    if (!method || !method.isActive) {
      return { order, shippingMethod: null };
    }

    order.shippingMethodId = method.id;
    order.shippingTotal = method.price || 0;
    order.total = (order.subtotal || 0) + (order.shippingTotal || 0);

    this._saveToStorage('orders', orders);

    return { order, shippingMethod: method };
  }

  confirmOrder(orderId) {
    const orders = this._getFromStorage('orders');
    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return { order: null, success: false, message: 'Order not found.' };
    }

    if (order.status === 'canceled') {
      return { order, success: false, message: 'Order is canceled and cannot be confirmed.' };
    }

    order.status = 'pending';
    this._saveToStorage('orders', orders);

    // Mark cart as checked_out
    if (order.cartId) {
      const carts = this._getFromStorage('carts');
      const cart = carts.find(c => c.id === order.cartId);
      if (cart) {
        cart.status = 'checked_out';
        cart.updatedAt = this._nowIso();
        this._saveToStorage('carts', carts);
      }
    }

    return { order, success: true, message: 'Order confirmed.' };
  }

  // ------------------------------
  // Articles & reading list
  // ------------------------------
  getArticleFilterOptions() {
    const experienceLevels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const timeframeOptions = [
      { value: 'last_6_months', label: 'Last 6 months', days: 180 },
      { value: 'last_1_year', label: 'Last 1 year', days: 365 },
      { value: 'last_2_years', label: 'Last 2 years', days: 730 }
    ];

    const readingTimeOptions = [
      { value: 'under_10_minutes', label: 'Under 10 minutes', maxMinutes: 10 },
      { value: '10_to_20_minutes', label: '10–20 minutes', maxMinutes: 20 }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'shortest_first', label: 'Shortest reading time' }
    ];

    return { experienceLevels, timeframeOptions, readingTimeOptions, sortOptions };
  }

  searchArticles(query, filters, sort, page, pageSize) {
    sort = sort || 'relevance';
    page = page || 1;
    pageSize = pageSize || 20;
    filters = filters || {};

    let articles = this._getFromStorage('articles');

    if (typeof filters.isPublished === 'boolean') {
      articles = articles.filter(a => a.isPublished === filters.isPublished);
    } else {
      articles = articles.filter(a => a.isPublished);
    }

    if (query) {
      const term = String(query).toLowerCase();
      const terms = term.split(/\s+/).filter(Boolean);
      articles = articles.filter(a => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        const tagsText = Array.isArray(a.tags)
          ? a.tags.map(t => String(t).toLowerCase()).join(' ')
          : '';
        const haystack = [title, summary, body, tagsText].join(' ');
        const matchesPhrase = haystack.includes(term);
        const matchesAllWords = terms.every(t => haystack.includes(t));
        return matchesPhrase || matchesAllWords;
      });
    }

    if (filters.experienceLevel) {
      articles = articles.filter(a => a.experienceLevel === filters.experienceLevel);
    }

    if (filters.minPublicationDate) {
      const minDate = new Date(filters.minPublicationDate);
      articles = articles.filter(a => new Date(a.publicationDate) >= minDate);
    }

    if (typeof filters.maxReadingTimeMinutes === 'number') {
      articles = articles.filter(a => typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes <= filters.maxReadingTimeMinutes);
    }

    if (filters.tags && filters.tags.length) {
      const tagSet = new Set(filters.tags.map(t => String(t).toLowerCase()));
      articles = articles.filter(a => Array.isArray(a.tags) && a.tags.some(t => tagSet.has(String(t).toLowerCase())));
    }

    if (sort === 'newest_first') {
      articles.sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));
    } else if (sort === 'shortest_first') {
      articles.sort((a, b) => (a.readingTimeMinutes || Number.POSITIVE_INFINITY) - (b.readingTimeMinutes || Number.POSITIVE_INFINITY));
    } else {
      // relevance fallback: newest_first
      articles.sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));
    }

    const totalCount = articles.length;
    const start = (page - 1) * pageSize;
    const paged = articles.slice(start, start + pageSize);

    return { results: paged, totalCount, page, pageSize };
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;

    if (!article) {
      return { article: null, isSaved: false, relatedArticles: [] };
    }

    const readingList = this._getOrCreateReadingList();
    const rlItems = this._getFromStorage('reading_list_items').filter(i => i.readingListId === readingList.id);
    const isSaved = rlItems.some(i => i.articleId === articleId);

    // Related articles: same tags or topics
    const tags = Array.isArray(article.tags) ? article.tags.map(t => String(t).toLowerCase()) : [];
    const topics = Array.isArray(article.topics) ? article.topics.map(t => String(t).toLowerCase()) : [];

    const related = articles
      .filter(a => a.id !== article.id)
      .filter(a => {
        const atags = Array.isArray(a.tags) ? a.tags.map(t => String(t).toLowerCase()) : [];
        const atopics = Array.isArray(a.topics) ? a.topics.map(t => String(t).toLowerCase()) : [];
        const tagOverlap = tags.length && atags.some(t => tags.includes(t));
        const topicOverlap = topics.length && atopics.some(t => topics.includes(t));
        return tagOverlap || topicOverlap;
      })
      .slice(0, 3);

    return { article, isSaved, relatedArticles: related };
  }

  saveArticleToReadingList(articleId) {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');

    let existing = items.find(i => i.readingListId === readingList.id && i.articleId === articleId);
    if (!existing) {
      existing = {
        id: this._generateId('rlitem'),
        readingListId: readingList.id,
        articleId,
        savedAt: this._nowIso()
      };
      items.push(existing);
      this._saveToStorage('reading_list_items', items);
    }

    const itemsForList = items.filter(i => i.readingListId === readingList.id);
    return { readingList, items: itemsForList, message: 'Article saved to reading list.' };
  }

  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items').filter(i => i.readingListId === readingList.id);
    const articles = this._getFromStorage('articles');

    const enriched = items.map(readingListItem => {
      const article = articles.find(a => a.id === readingListItem.articleId) || null;
      return { readingListItem, article };
    });

    return { readingList, items: enriched };
  }

  removeArticleFromReadingList(readingListItemId) {
    const items = this._getFromStorage('reading_list_items');
    const idx = items.findIndex(i => i.id === readingListItemId);
    if (idx >= 0) {
      items.splice(idx, 1);
      this._saveToStorage('reading_list_items', items);
    }
    const readingList = this._getOrCreateReadingList();
    const remaining = items.filter(i => i.readingListId === readingList.id);
    return { readingList, items: remaining };
  }

  // ------------------------------
  // Herd genetic progress calculator
  // ------------------------------
  runHerdGeneticProgressCalculator(
    herdType,
    herdSize,
    replacementRatePercent,
    averageSireReliability,
    targetTrait,
    targetImprovementValue,
    targetImprovementUnit,
    timeframeYears,
    description
  ) {
    const scenarios = this._getFromStorage('herd_genetic_scenarios');
    const scenario = {
      id: this._generateId('hgs'),
      herdType,
      herdSize,
      replacementRatePercent,
      averageSireReliability: typeof averageSireReliability === 'number' ? averageSireReliability : null,
      targetTrait,
      targetImprovementValue,
      targetImprovementUnit,
      timeframeYears,
      description: description || null,
      createdAt: this._nowIso()
    };
    scenarios.push(scenario);
    this._saveToStorage('herd_genetic_scenarios', scenarios);

    const newRecs = this._generateHerdGeneticRecommendations(scenario);
    const bulls = this._getFromStorage('bulls');

    const recommendations = newRecs.map(recommendation => {
      const bull = bulls.find(b => b.id === recommendation.bullId) || null;
      return { recommendation, bull };
    });

    return { scenario, recommendations };
  }

  getHerdGeneticRecommendations(scenarioId, filters) {
    filters = filters || {};
    const recs = this._getFromStorage('herd_genetic_recommendations').filter(r => r.scenarioId === scenarioId);
    const bulls = this._getFromStorage('bulls');

    let combined = recs.map(recommendation => {
      const bull = bulls.find(b => b.id === recommendation.bullId) || null;
      return { recommendation, bull };
    });

    if (typeof filters.minWeaningWeightIndex === 'number') {
      combined = combined.filter(x => {
        const value = x.recommendation.weaningWeightIndex != null ? x.recommendation.weaningWeightIndex : (x.bull ? x.bull.weaningWeightIndex : null);
        return typeof value === 'number' && value >= filters.minWeaningWeightIndex;
      });
    }

    if (typeof filters.minMilkYieldIndex === 'number') {
      combined = combined.filter(x => {
        const value = x.recommendation.milkYieldIndex != null ? x.recommendation.milkYieldIndex : (x.bull ? x.bull.milkYieldIndex : null);
        return typeof value === 'number' && value >= filters.minMilkYieldIndex;
      });
    }

    if (typeof filters.minCalvingEaseScore === 'number') {
      combined = combined.filter(x => {
        const value = x.recommendation.calvingEaseScore != null ? x.recommendation.calvingEaseScore : (x.bull ? x.bull.calvingEaseScore : null);
        return typeof value === 'number' && value >= filters.minCalvingEaseScore;
      });
    }

    if (typeof filters.maxSomaticCellScore === 'number') {
      combined = combined.filter(x => {
        const value = x.bull ? x.bull.somaticCellScore : null;
        return typeof value === 'number' && value <= filters.maxSomaticCellScore;
      });
    }

    combined.sort((a, b) => (a.recommendation.rank || 0) - (b.recommendation.rank || 0));

    return combined;
  }

  // ------------------------------
  // Breeding season planner
  // ------------------------------
  saveBreedingSeasonPlan(planId, name, startDate, lengthDays, notes, protocols) {
    const plans = this._getFromStorage('breeding_season_plans');
    let plan = null;

    if (planId) {
      plan = plans.find(p => p.id === planId) || null;
    }

    if (!plan) {
      plan = {
        id: this._generateId('bsplan'),
        name,
        startDate: new Date(startDate).toISOString(),
        lengthDays,
        endDate: this._computeBreedingSeasonEndDate(startDate, lengthDays),
        notes: notes || null,
        createdAt: this._nowIso()
      };
      plans.push(plan);
    } else {
      plan.name = name;
      plan.startDate = new Date(startDate).toISOString();
      plan.lengthDays = lengthDays;
      plan.endDate = this._computeBreedingSeasonEndDate(startDate, lengthDays);
      plan.notes = notes || null;
    }

    this._saveToStorage('breeding_season_plans', plans);

    // Replace protocols for this plan
    const protos = this._getFromStorage('breeding_season_protocols');
    const remaining = protos.filter(p => p.breedingSeasonPlanId !== plan.id);

    const newProtocols = Array.isArray(protocols) ? protocols.map(p => ({
      id: this._generateId('bsproto'),
      breedingSeasonPlanId: plan.id,
      animalGroup: p.animalGroup,
      protocolType: p.protocolType,
      animalsCount: p.animalsCount,
      startDate: new Date(p.startDate).toISOString(),
      endDate: p.endDate ? new Date(p.endDate).toISOString() : null,
      notes: p.notes || null
    })) : [];

    const allProtocols = remaining.concat(newProtocols);
    this._saveToStorage('breeding_season_protocols', allProtocols);

    return { plan, protocols: newProtocols };
  }

  getBreedingSeasonPlanDetails(planId) {
    const plans = this._getFromStorage('breeding_season_plans');
    const plan = plans.find(p => p.id === planId) || null;
    const protocols = this._getFromStorage('breeding_season_protocols').filter(p => p.breedingSeasonPlanId === planId);
    return { plan, protocols };
  }

  // ------------------------------
  // Consultation booking
  // ------------------------------
  getConsultationServiceInfo() {
    return {
      serviceType: 'genetic_consultation',
      title: 'Genetic Consultation',
      description: 'Work with a genetics specialist to design breeding and selection strategies tailored to your herd goals.',
      benefits: [
        'Optimize sire selection for your breeding objectives',
        'Balance calving ease, growth, fertility, and carcass traits',
        'Plan synchronized breeding and replacement strategies',
        'Review current herd genetic trends and opportunities'
      ],
      applicableHerdTypes: ['beef', 'dairy', 'mixed', 'other']
    };
  }

  getAvailableConsultationTimeSlots(serviceType, startDate, endDate, earliestTimeOfDay) {
    return this._findAvailableConsultationTimeSlots(serviceType, startDate, endDate, earliestTimeOfDay);
  }

  createConsultationBooking(timeSlotId, contactName, contactEmail, contactPhone, herdType, herdSizeRange, notes) {
    const slots = this._getFromStorage('consultation_time_slots');
    const slot = slots.find(s => s.id === timeSlotId) || null;
    if (!slot || slot.isBooked) {
      return {
        booking: null,
        timeSlot: slot,
        confirmationMessage: 'Selected time slot is not available.'
      };
    }

    const bookings = this._getFromStorage('consultation_bookings');
    const booking = {
      id: this._generateId('consult'),
      timeSlotId,
      serviceType: 'genetic_consultation',
      contactName,
      contactEmail,
      contactPhone,
      herdType,
      herdSizeRange,
      notes: notes || null,
      status: 'pending',
      createdAt: this._nowIso()
    };
    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    // Mark slot as booked
    slot.isBooked = true;
    this._saveToStorage('consultation_time_slots', slots);

    return {
      booking,
      timeSlot: slot,
      confirmationMessage: 'Consultation booked successfully.'
    };
  }

  getConsultationBookingDetails(bookingId) {
    const bookings = this._getFromStorage('consultation_bookings');
    const booking = bookings.find(b => b.id === bookingId) || null;
    const slots = this._getFromStorage('consultation_time_slots');
    const timeSlot = booking ? (slots.find(s => s.id === booking.timeSlotId) || null) : null;
    return { booking, timeSlot };
  }

  // ------------------------------
  // Static pages & contact
  // ------------------------------
  getAboutPageContent() {
    return {
      mission: 'To accelerate herd genetic progress by providing high-quality semen, embryos, and decision tools for cattle producers.',
      background: 'Our team combines decades of experience in cattle breeding, reproductive technologies, and genetic evaluation to help beef and dairy operations make data-driven selection decisions.',
      teamMembers: [
        {
          name: 'Dr. Jane Geneticist',
          role: 'Lead Geneticist',
          bio: 'Specialist in beef and dairy genetic evaluation and genomic selection.'
        },
        {
          name: 'Mark Herdsman',
          role: 'Reproductive Specialist',
          bio: 'Focused on synchronization protocols, AI programs, and on-farm implementation.'
        }
      ],
      qualityStandards: 'All sires and donors are sourced from programs with rigorous health testing, accurate pedigrees, and independent genetic evaluations where available.',
      dataSources: 'Genetic evaluations, breed association data, and reputable international evaluation centers.',
      animalWelfareCommitments: 'We prioritize animal welfare in donor and sire management and support customers in implementing low-stress handling and humane breeding practices.'
    };
  }

  getContactInfo() {
    return {
      phoneNumbers: ['+1-555-000-1234'],
      emailAddresses: ['support@cattlegenetics.example.com'],
      physicalAddress: '123 Genetics Lane, Cowtown, USA',
      supportHours: 'Monday–Friday, 8:00 AM–5:00 PM (local time)'
    };
  }

  submitContactForm(name, email, phone, topic, message) {
    const messages = this._getFromStorage('contact_messages');
    const record = {
      id: this._generateId('contactmsg'),
      name,
      email,
      phone: phone || null,
      topic: topic || 'general',
      message,
      createdAt: this._nowIso()
    };
    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return { success: true, message: 'Your inquiry has been submitted.' };
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