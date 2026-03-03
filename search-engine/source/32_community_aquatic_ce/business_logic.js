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
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Legacy example keys (not used but kept for compatibility)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Entity tables from data models
    var entityKeys = [
      'programs',
      'program_registrations',
      'lap_lane_slots',
      'lap_lane_reservations',
      'membership_plans',
      'membership_purchases',
      'party_packages',
      'party_reservations',
      'pools',
      'pool_schedule_sessions',
      'my_schedule_items',
      'pass_products',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'contact_messages'
    ];

    for (var i = 0; i < entityKeys.length; i++) {
      var key = entityKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Content/config style keys (left empty by default; can be populated externally)
    var contentKeys = [
      'home_quick_tiles',
      'home_announcements',
      'home_alerts',
      'home_audience_entry_points',
      'program_categories',
      'about_content',
      'contact_info',
      'policies_content',
      'faq_sections'
    ];
    for (var j = 0; j < contentKeys.length; j++) {
      var ckey = contentKeys[j];
      if (!localStorage.getItem(ckey)) {
        // Use sensible empty defaults (object or array)
        if (ckey === 'about_content' || ckey === 'contact_info' || ckey === 'policies_content') {
          localStorage.setItem(ckey, JSON.stringify({}));
        } else {
          localStorage.setItem(ckey, JSON.stringify([]));
        }
      }
    }
  }

  _getFromStorage(key, defaultValue) {
    var data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    var raw = localStorage.getItem('idCounter');
    var current = parseInt(raw || '1000', 10);
    if (isNaN(current)) {
      current = 1000;
    }
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _parseDateOnly(dateStr) {
    if (!dateStr) return null;
    // Parse as local date at midnight
    return new Date(dateStr + 'T00:00:00');
  }

  _sameDate(dateStrOrIso, targetDateStr) {
    if (!dateStrOrIso || !targetDateStr) return false;
    var d1 = new Date(dateStrOrIso);
    var d2 = this._parseDateOnly(targetDateStr);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  _compareTimes(t1, t2) {
    if (!t1 && !t2) return 0;
    if (!t1) return -1;
    if (!t2) return 1;
    if (t1 < t2) return -1;
    if (t1 > t2) return 1;
    return 0;
  }

  _getDayOfWeekId(date) {
    var d = date instanceof Date ? date : new Date(date);
    var day = d.getDay(); // 0-6, Sunday=0
    var map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[day];
  }

  // ---------------------- Helper functions from spec ----------------------

  // _getOrCreateCart: single-user Cart in storage
  _getOrCreateCart() {
    var cartsArr = this._getFromStorage('cart');
    if (!Array.isArray(cartsArr)) {
      cartsArr = [];
    }
    var cart = cartsArr[0];
    var now = this._now();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now
      };
      cartsArr.push(cart);
      this._saveToStorage('cart', cartsArr);
    }
    return cart;
  }

  // _getCartWithItems: load cart + items and compute subtotal
  _getCartWithItems() {
    var cartsArr = this._getFromStorage('cart');
    var cart = Array.isArray(cartsArr) && cartsArr.length > 0 ? cartsArr[0] : null;
    var items = this._getFromStorage('cart_items');
    var programs = this._getFromStorage('programs');
    var passProducts = this._getFromStorage('pass_products');
    var membershipPlans = this._getFromStorage('membership_plans');

    var subtotal = 0;
    var itemCount = 0;
    var enrichedItems = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      subtotal += it.total_price || 0;
      itemCount += it.quantity || 0;
      var copy = Object.assign({}, it);
      if (it.program_id) {
        copy.program = programs.find(function (p) { return p.id === it.program_id; }) || null;
      }
      if (it.pass_product_id) {
        copy.pass_product = passProducts.find(function (p) { return p.id === it.pass_product_id; }) || null;
      }
      if (it.membership_plan_id) {
        copy.membership_plan = membershipPlans.find(function (p) { return p.id === it.membership_plan_id; }) || null;
      }
      enrichedItems.push(copy);
    }

    return {
      cart: cart,
      items: enrichedItems,
      subtotal: subtotal,
      itemCount: itemCount
    };
  }

  // _getOrCreateMySchedule: ensure storage exists
  _getOrCreateMySchedule() {
    var existing = localStorage.getItem('my_schedule_items');
    if (!existing) {
      this._saveToStorage('my_schedule_items', []);
    }
    return true;
  }

  // _calculatePartyTotalPrice based on package and party size
  _calculatePartyTotalPrice(partyPackage, partySizeChildren) {
    if (!partyPackage) return 0;
    var base = partyPackage.base_price || 0;
    var included = partyPackage.included_children_count || 0;
    var fee = partyPackage.additional_child_fee || 0;
    var size = partySizeChildren || 0;
    var extraChildren = 0;
    if (size > included) {
      extraChildren = size - included;
    }
    return base + extraChildren * fee;
  }

  // ---------------------- Home page interfaces ----------------------

  getHomeQuickTiles() {
    var tiles = this._getFromStorage('home_quick_tiles');
    if (!Array.isArray(tiles)) tiles = [];
    return { tiles: tiles };
  }

  getHomeAnnouncementsAndAlerts() {
    var announcements = this._getFromStorage('home_announcements');
    var alerts = this._getFromStorage('home_alerts');
    if (!Array.isArray(announcements)) announcements = [];
    if (!Array.isArray(alerts)) alerts = [];
    return {
      announcements: announcements,
      alerts: alerts
    };
  }

  getHomeAudienceEntryPoints() {
    var audiences = this._getFromStorage('home_audience_entry_points');
    if (!Array.isArray(audiences)) audiences = [];
    return { audiences: audiences };
  }

  // ---------------------- Programs & Classes ----------------------

  getProgramCategories() {
    var categories = this._getFromStorage('program_categories');
    if (!Array.isArray(categories)) categories = [];

    // Provide sensible defaults if no categories have been configured
    if (categories.length === 0) {
      categories = [
        { categoryId: 'swim_lessons_kids', name: 'Swim Lessons for Kids' },
        { categoryId: 'fitness_classes', name: 'Fitness Classes' },
        { categoryId: 'training_certifications', name: 'Training & Certifications' }
      ];
    }

    return categories;
  }

  getProgramFilterOptions(categoryId) {
    // Static options derived from data model enums
    var ageRanges = [
      { label: 'Ages 0-5', min: 0, max: 5 },
      { label: 'Ages 6-8', min: 6, max: 8 },
      { label: 'Ages 9-12', min: 9, max: 12 },
      { label: 'Teens', min: 13, max: 17 },
      { label: 'Adults', min: 18, max: 120 }
    ];

    var skillLevels = [
      { value: 'beginner_1', label: 'Beginner 1' },
      { value: 'beginner_2', label: 'Beginner 2' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'none', label: 'No Skill Level' }
    ];

    var dayOfWeekOptions = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];

    var timeOfDayOptions = [
      { id: 'morning', label: 'Morning', startTimeFrom: '06:00', startTimeTo: '11:59' },
      { id: 'afternoon', label: 'Afternoon', startTimeFrom: '12:00', startTimeTo: '16:59' },
      { id: 'evening', label: 'Evening', startTimeFrom: '17:00', startTimeTo: '21:59' }
    ];

    var priceRanges = [
      { label: 'Up to $50', minPrice: 0, maxPrice: 50 },
      { label: 'Up to $100', minPrice: 0, maxPrice: 100 },
      { label: 'Up to $200', minPrice: 0, maxPrice: 200 }
    ];

    var featureFlags = {
      includesCprFirstAid: categoryId === 'training_certifications',
      weekendsOnly: categoryId === 'training_certifications',
      locationPoolTypeFilter: categoryId === 'swim_lessons_kids' || categoryId === 'fitness_classes',
      aquaFitnessOnly: categoryId === 'fitness_classes'
    };

    var sortOptions = [
      { value: 'start_date_soonest', label: 'Start Date - Soonest First' },
      { value: 'start_date_latest', label: 'Start Date - Latest First' },
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'total_duration_shortest', label: 'Total Duration - Shortest First' },
      { value: 'total_duration_longest', label: 'Total Duration - Longest First' }
    ];

    return {
      ageRanges: ageRanges,
      skillLevels: skillLevels,
      dayOfWeekOptions: dayOfWeekOptions,
      timeOfDayOptions: timeOfDayOptions,
      priceRanges: priceRanges,
      featureFlags: featureFlags,
      sortOptions: sortOptions
    };
  }

  searchPrograms(
    categoryId,
    subcategory,
    ageMin,
    ageMax,
    skillLevel,
    dayOfWeek,
    startTimeFrom,
    startTimeTo,
    maxPrice,
    includesCprFirstAid,
    weekendsOnly,
    locationPoolType,
    status,
    sortBy,
    page,
    pageSize
  ) {
    var programs = this._getFromStorage('programs');

    status = status || 'active';
    sortBy = sortBy || 'start_date_soonest';
    page = page || 1;
    pageSize = pageSize || 20;

    var filtered = programs.filter(function (p) {
      if (status && p.status !== status) return false;
      if (categoryId && p.category_id !== categoryId) return false;
      if (subcategory && p.subcategory !== subcategory) return false;

      if (typeof ageMin === 'number' || typeof ageMax === 'number') {
        var pMin = typeof p.age_min === 'number' ? p.age_min : null;
        var pMax = typeof p.age_max === 'number' ? p.age_max : null;
        var qMin = typeof ageMin === 'number' ? ageMin : ageMax;
        var qMax = typeof ageMax === 'number' ? ageMax : ageMin;
        if (pMin === null || pMax === null) {
          // If program has no age bounds, treat as not matching specific age query
          return false;
        }
        // Require overlapping ranges
        if (pMin > qMax || pMax < qMin) return false;
      }

      if (skillLevel && p.skill_level !== skillLevel) return false;

      if (dayOfWeek && Array.isArray(p.meeting_days)) {
        if (p.meeting_days.indexOf(dayOfWeek) === -1) return false;
      } else if (dayOfWeek && !Array.isArray(p.meeting_days)) {
        return false;
      }

      if (startTimeFrom && p.start_time && p.start_time < startTimeFrom) return false;
      if (startTimeTo && p.start_time && p.start_time > startTimeTo) return false;

      if (typeof maxPrice === 'number') {
        var basePrice = typeof p.price === 'number' ? p.price : 0;
        if (basePrice > maxPrice) return false;
      }

      if (typeof includesCprFirstAid === 'boolean') {
        if (!!p.includes_cpr_first_aid !== includesCprFirstAid) return false;
      }

      if (typeof weekendsOnly === 'boolean') {
        if (!!p.is_weekends_only !== weekendsOnly) return false;
      }

      if (locationPoolType) {
        if (p.location_pool_type !== locationPoolType && p.location_pool_type !== 'mixed') return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'start_date_soonest' || sortBy === 'start_date_latest') {
        var da = new Date(a.start_date || 0).getTime();
        var db = new Date(b.start_date || 0).getTime();
        if (sortBy === 'start_date_soonest') return da - db;
        return db - da;
      }
      if (sortBy === 'price_low_to_high' || sortBy === 'price_high_to_low') {
        var pa = typeof a.price === 'number' ? a.price : 0;
        var pb = typeof b.price === 'number' ? b.price : 0;
        if (sortBy === 'price_low_to_high') return pa - pb;
        return pb - pa;
      }
      if (sortBy === 'total_duration_shortest' || sortBy === 'total_duration_longest') {
        var ta = typeof a.total_duration_hours === 'number' ? a.total_duration_hours : Number.POSITIVE_INFINITY;
        var tb = typeof b.total_duration_hours === 'number' ? b.total_duration_hours : Number.POSITIVE_INFINITY;
        if (sortBy === 'total_duration_shortest') return ta - tb;
        return tb - ta;
      }
      return 0;
    });

    var totalCount = filtered.length;
    var startIndex = (page - 1) * pageSize;
    var pageItems = filtered.slice(startIndex, startIndex + pageSize);

    return {
      programs: pageItems,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      appliedSort: sortBy
    };
  }

  getProgramDetail(programId) {
    var programs = this._getFromStorage('programs');
    var program = programs.find(function (p) { return p.id === programId; }) || null;

    var categoryName = '';
    var subcategoryName = '';
    var skillLevelLabel = '';
    var ageRangeLabel = '';
    var locationDescription = '';
    var registrationAllowed = false;
    var canAddToCart = false;
    var policies = '';
    var waiverRequired = false;

    if (program) {
      if (program.category_id === 'swim_lessons_kids') categoryName = 'Swim Lessons for Kids';
      else if (program.category_id === 'fitness_classes') categoryName = 'Fitness Classes';
      else if (program.category_id === 'training_certifications') categoryName = 'Training & Certifications';
      else categoryName = 'Other Programs';

      if (program.subcategory === 'aqua_fitness') subcategoryName = 'Aqua Fitness';
      else if (program.subcategory === 'lifeguard_certification') subcategoryName = 'Lifeguard Certification';
      else if (program.subcategory === 'kids_group_lesson') subcategoryName = 'Kids Group Lesson';
      else if (program.subcategory === 'kids_private_lesson') subcategoryName = 'Kids Private Lesson';
      else subcategoryName = 'Other';

      if (program.skill_level === 'beginner_1') skillLevelLabel = 'Beginner 1';
      else if (program.skill_level === 'beginner_2') skillLevelLabel = 'Beginner 2';
      else if (program.skill_level === 'intermediate') skillLevelLabel = 'Intermediate';
      else if (program.skill_level === 'advanced') skillLevelLabel = 'Advanced';
      else skillLevelLabel = 'All Levels';

      if (typeof program.age_min === 'number' && typeof program.age_max === 'number') {
        ageRangeLabel = 'Ages ' + program.age_min + '-' + program.age_max;
      }

      if (program.location_pool_type === 'indoor') locationDescription = 'Indoor Pool';
      else if (program.location_pool_type === 'outdoor') locationDescription = 'Outdoor Pool';
      else if (program.location_pool_type === 'mixed') locationDescription = 'Indoor/Outdoor';
      else locationDescription = '';

      registrationAllowed =
        (program.category_id === 'swim_lessons_kids' || program.category_id === 'training_certifications') &&
        program.status === 'active';
      canAddToCart = !!program.can_add_to_cart;

      // Basic heuristic: lifeguard certifications or programs requiring CPR likely have waiver
      waiverRequired = !!program.includes_cpr_first_aid || program.category_id === 'training_certifications';
    }

    return {
      program: program,
      categoryName: categoryName,
      subcategoryName: subcategoryName,
      skillLevelLabel: skillLevelLabel,
      ageRangeLabel: ageRangeLabel,
      locationDescription: locationDescription,
      registrationAllowed: registrationAllowed,
      canAddToCart: canAddToCart,
      policies: policies,
      waiverRequired: waiverRequired
    };
  }

  registerForProgram(
    programId,
    participantName,
    participantDateOfBirth,
    pricingOption,
    contactPhone,
    contactEmail,
    acceptWaiver
  ) {
    var programs = this._getFromStorage('programs');
    var program = programs.find(function (p) { return p.id === programId; });
    if (!program || program.status !== 'active') {
      return { success: false, message: 'Program not found or not active.', registration: null };
    }

    var detail = this.getProgramDetail(programId);
    if (detail.waiverRequired && !acceptWaiver) {
      return { success: false, message: 'Waiver must be accepted.', registration: null };
    }

    var registrationType = 'other';
    if (program.category_id === 'swim_lessons_kids') registrationType = 'swim_lesson';
    else if (program.category_id === 'training_certifications') registrationType = 'lifeguard_certification';
    else if (program.category_id === 'fitness_classes') registrationType = 'fitness_class';

    var basePrice = typeof program.price === 'number' ? program.price : 0;
    var pricePaid = basePrice;
    if (pricingOption === 'resident' && typeof program.price_resident === 'number') {
      pricePaid = program.price_resident;
    } else if (pricingOption === 'non_resident' && typeof program.price_non_resident === 'number') {
      pricePaid = program.price_non_resident;
    }

    var registration = {
      id: this._generateId('program_registration'),
      program_id: programId,
      registration_type: registrationType,
      participant_name: participantName,
      participant_date_of_birth: participantDateOfBirth ? new Date(participantDateOfBirth + 'T00:00:00').toISOString() : null,
      pricing_option: pricingOption || 'standard',
      price_paid: pricePaid,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      waiver_accepted: !!acceptWaiver,
      created_at: this._now(),
      status: 'confirmed'
    };

    var regs = this._getFromStorage('program_registrations');
    regs.push(registration);
    this._saveToStorage('program_registrations', regs);

    return {
      success: true,
      message: 'Registration completed.',
      registration: registration
    };
  }

  getProgramRegistrationSummary(registrationId) {
    var regs = this._getFromStorage('program_registrations');
    var programs = this._getFromStorage('programs');
    var registration = regs.find(function (r) { return r.id === registrationId; }) || null;
    var program = null;
    if (registration) {
      program = programs.find(function (p) { return p.id === registration.program_id; }) || null;
      // Foreign key resolution on registration itself
      registration = Object.assign({}, registration, { program: program });
    }
    return {
      registration: registration,
      program: program
    };
  }

  addProgramToCart(programId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    var programs = this._getFromStorage('programs');
    var program = programs.find(function (p) { return p.id === programId; });
    if (!program) {
      return { success: false, message: 'Program not found.', cart: null, cartItems: [] };
    }

    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items');

    var existing = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.item_type === 'program' && ci.program_id === programId;
    });

    var unitPrice = typeof program.price === 'number' ? program.price : 0;

    if (existing) {
      existing.quantity += quantity;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      var newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'program',
        item_ref_id: programId,
        program_id: programId,
        pass_product_id: null,
        membership_plan_id: null,
        name: program.name,
        unit_price: unitPrice,
        quantity: quantity,
        total_price: unitPrice * quantity,
        added_at: this._now()
      };
      cartItems.push(newItem);
    }

    cart.updated_at = this._now();
    this._saveToStorage('cart', [cart]);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      message: 'Program added to cart.',
      cart: cart,
      cartItems: cartItems
    };
  }

  // ---------------------- Lap Lane Reservations ----------------------

  getLapLaneFilterOptions() {
    var slots = this._getFromStorage('lap_lane_slots');
    var poolTypes = ['indoor', 'outdoor'];
    var maxPrice = 0;
    for (var i = 0; i < slots.length; i++) {
      var price = typeof slots[i].price === 'number' ? slots[i].price : 0;
      if (price > maxPrice) maxPrice = price;
    }

    var timeRanges = [
      { label: 'Early Morning (5-8 AM)', startTime: '05:00', endTime: '08:00' },
      { label: 'Morning (8-12)', startTime: '08:00', endTime: '12:00' },
      { label: 'Afternoon (12-5)', startTime: '12:00', endTime: '17:00' },
      { label: 'Evening (5-9)', startTime: '17:00', endTime: '21:00' }
    ];

    return {
      poolTypes: poolTypes,
      timeRanges: timeRanges,
      defaultMaxPrice: maxPrice
    };
  }

  searchLapLaneSlots(
    date,
    startTime,
    endTime,
    poolType,
    poolId,
    maxPrice,
    includeReserved,
    sortBy
  ) {
    var slots = this._getFromStorage('lap_lane_slots');
    var pools = this._getFromStorage('pools');
    sortBy = sortBy || 'time_earliest';
    includeReserved = !!includeReserved;

    var targetDateStr = date;

    var filtered = slots.filter(function (s) {
      if (!targetDateStr) return false;
      if (!s.slot_date) return false;
      var sameDate = false;
      var sd = new Date(s.slot_date);
      var td = new Date(targetDateStr + 'T00:00:00');
      if (
        sd.getFullYear() === td.getFullYear() &&
        sd.getMonth() === td.getMonth() &&
        sd.getDate() === td.getDate()
      ) {
        sameDate = true;
      }
      if (!sameDate) return false;

      if (!includeReserved && s.is_reserved) return false;
      if (poolType && s.pool_type !== poolType) return false;
      if (poolId && s.pool_id !== poolId) return false;
      if (typeof maxPrice === 'number' && typeof s.price === 'number' && s.price > maxPrice) return false;

      if (startTime) {
        var start = new Date(s.start_datetime || s.slot_date);
        var startStr = (start.getHours() < 10 ? '0' : '') + start.getHours() + ':' + (start.getMinutes() < 10 ? '0' : '') + start.getMinutes();
        if (startStr < startTime) return false;
      }
      if (endTime) {
        var end = new Date(s.end_datetime || s.slot_date);
        var endStr = (end.getHours() < 10 ? '0' : '') + end.getHours() + ':' + (end.getMinutes() < 10 ? '0' : '') + end.getMinutes();
        if (endStr > endTime) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      if (sortBy === 'price_low_to_high' || sortBy === 'price_high_to_low') {
        var pa = typeof a.price === 'number' ? a.price : 0;
        var pb = typeof b.price === 'number' ? b.price : 0;
        if (sortBy === 'price_low_to_high') return pa - pb;
        return pb - pa;
      }
      var ta = new Date(a.start_datetime || a.slot_date).getTime();
      var tb = new Date(b.start_datetime || b.slot_date).getTime();
      if (sortBy === 'time_latest') return tb - ta;
      return ta - tb;
    });

    // Foreign key resolution: attach pool to each slot
    var enrichedSlots = filtered.map(function (s) {
      var pool = pools.find(function (p) { return p.id === s.pool_id; }) || null;
      var copy = Object.assign({}, s);
      copy.pool = pool;
      return copy;
    });

    return { slots: enrichedSlots };
  }

  getLapLaneSlotDetail(lapLaneSlotId) {
    var slots = this._getFromStorage('lap_lane_slots');
    var pools = this._getFromStorage('pools');
    var slot = slots.find(function (s) { return s.id === lapLaneSlotId; }) || null;
    var pool = null;
    if (slot) {
      pool = pools.find(function (p) { return p.id === slot.pool_id; }) || null;
      slot = Object.assign({}, slot, { pool: pool });
    }
    return {
      slot: slot,
      pool: pool
    };
  }

  reserveLapLaneSlot(lapLaneSlotId, swimmerName, swimmersCount, contactPhone) {
    var slots = this._getFromStorage('lap_lane_slots');
    var slot = slots.find(function (s) { return s.id === lapLaneSlotId; });
    if (!slot) {
      return { success: false, message: 'Lap lane slot not found.', reservation: null, updatedSlot: null };
    }
    if (slot.is_reserved) {
      return { success: false, message: 'Lap lane slot already reserved.', reservation: null, updatedSlot: slot };
    }

    var reservation = {
      id: this._generateId('lap_lane_reservation'),
      lap_lane_slot_id: lapLaneSlotId,
      swimmer_name: swimmerName,
      swimmers_count: swimmersCount,
      contact_phone: contactPhone || null,
      created_at: this._now(),
      status: 'reserved'
    };

    var reservations = this._getFromStorage('lap_lane_reservations');
    reservations.push(reservation);
    this._saveToStorage('lap_lane_reservations', reservations);

    slot.is_reserved = true;
    this._saveToStorage('lap_lane_slots', slots);

    return {
      success: true,
      message: 'Lap lane reserved.',
      reservation: reservation,
      updatedSlot: slot
    };
  }

  getLapLaneReservationSummary(reservationId) {
    var reservations = this._getFromStorage('lap_lane_reservations');
    var slots = this._getFromStorage('lap_lane_slots');
    var pools = this._getFromStorage('pools');

    var reservation = reservations.find(function (r) { return r.id === reservationId; }) || null;
    var slot = null;
    var pool = null;

    if (reservation) {
      slot = slots.find(function (s) { return s.id === reservation.lap_lane_slot_id; }) || null;
      if (slot) {
        pool = pools.find(function (p) { return p.id === slot.pool_id; }) || null;
        slot = Object.assign({}, slot, { pool: pool });
      }
      // foreign key resolution on reservation
      reservation = Object.assign({}, reservation, { lap_lane_slot: slot });
    }

    return {
      reservation: reservation,
      slot: slot,
      pool: pool
    };
  }

  // ---------------------- Memberships ----------------------

  getMembershipFilterOptions() {
    var membershipTypes = ['family', 'individual', 'senior', 'youth', 'other'];
    var durations = ['one_month', 'three_month', 'six_month', 'annual', 'other'];

    var accessOptions = {
      poolAccessLabel: 'Pool Access',
      fitnessCenterLabel: 'Fitness Center'
    };

    var plans = this._getFromStorage('membership_plans');
    var minPrice = null;
    var maxPrice = null;
    for (var i = 0; i < plans.length; i++) {
      var price = typeof plans[i].price === 'number' ? plans[i].price : 0;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    var priceRanges = [
      { label: 'Up to $50', minPrice: 0, maxPrice: 50 },
      { label: 'Up to $100', minPrice: 0, maxPrice: 100 },
      { label: 'Up to $200', minPrice: 0, maxPrice: 200 },
      { label: 'All Available', minPrice: minPrice, maxPrice: maxPrice }
    ];

    var sortOptions = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'weekday_close_time_latest', label: 'Latest Weekday Closing' },
      { value: 'weekday_close_time_earliest', label: 'Earliest Weekday Closing' }
    ];

    return {
      membershipTypes: membershipTypes,
      durations: durations,
      accessOptions: accessOptions,
      priceRanges: priceRanges,
      sortOptions: sortOptions
    };
  }

  searchMembershipPlans(
    membershipType,
    duration,
    poolAccessIncluded,
    fitnessCenterIncluded,
    maxPrice,
    status,
    sortBy
  ) {
    var plans = this._getFromStorage('membership_plans');
    status = status || 'active';
    sortBy = sortBy || 'price_low_to_high';

    var filtered = plans.filter(function (p) {
      if (status && p.status !== status) return false;
      if (membershipType && p.membership_type !== membershipType) return false;
      if (duration && p.duration !== duration) return false;
      if (typeof poolAccessIncluded === 'boolean') {
        if (!!p.pool_access_included !== poolAccessIncluded) return false;
      }
      if (typeof fitnessCenterIncluded === 'boolean') {
        if (!!p.fitness_center_included !== fitnessCenterIncluded) return false;
      }
      if (typeof maxPrice === 'number' && typeof p.price === 'number' && p.price > maxPrice) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'price_low_to_high' || sortBy === 'price_high_to_low') {
        var pa = typeof a.price === 'number' ? a.price : 0;
        var pb = typeof b.price === 'number' ? b.price : 0;
        if (sortBy === 'price_low_to_high') return pa - pb;
        return pb - pa;
      }
      if (sortBy === 'weekday_close_time_latest' || sortBy === 'weekday_close_time_earliest') {
        var ca = a.weekday_close_time || '00:00';
        var cb = b.weekday_close_time || '00:00';
        if (sortBy === 'weekday_close_time_latest') {
          if (ca < cb) return 1;
          if (ca > cb) return -1;
          // tie-breaker: cheaper first
          var pa2 = typeof a.price === 'number' ? a.price : 0;
          var pb2 = typeof b.price === 'number' ? b.price : 0;
          return pa2 - pb2;
        } else {
          if (ca < cb) return -1;
          if (ca > cb) return 1;
          var pa3 = typeof a.price === 'number' ? a.price : 0;
          var pb3 = typeof b.price === 'number' ? b.price : 0;
          return pa3 - pb3;
        }
      }
      return 0;
    });

    return { plans: filtered };
  }

  getMembershipPlanDetail(membershipPlanId) {
    var plans = this._getFromStorage('membership_plans');
    var plan = plans.find(function (p) { return p.id === membershipPlanId; }) || null;

    var benefitsSummary = '';
    var guestPolicies = '';
    var operatingHoursSummary = '';
    var termsAndConditions = '';

    if (plan) {
      benefitsSummary = 'Includes ' + (plan.pool_access_included ? 'pool access' : '') + (plan.pool_access_included && plan.fitness_center_included ? ' and ' : '') + (plan.fitness_center_included ? 'fitness center access' : '') + '.';
      if (plan.weekday_open_time || plan.weekday_close_time) {
        operatingHoursSummary = 'Weekday Hours: ' + (plan.weekday_open_time || '') + ' - ' + (plan.weekday_close_time || '');
      }
    }

    // Instrumentation for task completion tracking
    try {
      if (
        plan &&
        plan.status === 'active' &&
        plan.membership_type === 'family' &&
        plan.duration === 'one_month' &&
        plan.pool_access_included === true &&
        plan.fitness_center_included === true &&
        typeof plan.price === 'number' &&
        plan.price <= 120
      ) {
        var existingRaw = localStorage.getItem('task3_comparedPlanIds');
        var comparedIds = [];
        if (existingRaw) {
          try {
            var parsed = JSON.parse(existingRaw);
            if (Array.isArray(parsed)) {
              comparedIds = parsed;
            }
          } catch (e2) {
            // ignore JSON parse errors for instrumentation
          }
        }
        if (comparedIds.indexOf(membershipPlanId) === -1) {
          comparedIds.push(membershipPlanId);
        }
        localStorage.setItem('task3_comparedPlanIds', JSON.stringify(comparedIds));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e3) {}
    }

    return {
      plan: plan,
      benefitsSummary: benefitsSummary,
      guestPolicies: guestPolicies,
      operatingHoursSummary: operatingHoursSummary,
      termsAndConditions: termsAndConditions
    };
  }

  purchaseMembership(membershipPlanId, primaryAdultName, startDate, contactEmail) {
    var plans = this._getFromStorage('membership_plans');
    var plan = plans.find(function (p) { return p.id === membershipPlanId; });
    if (!plan || plan.status !== 'active') {
      return { success: false, message: 'Membership plan not found or inactive.', purchase: null };
    }

    var purchase = {
      id: this._generateId('membership_purchase'),
      membership_plan_id: membershipPlanId,
      primary_adult_name: primaryAdultName,
      start_date: startDate ? new Date(startDate + 'T00:00:00').toISOString() : this._now(),
      contact_email: contactEmail,
      created_at: this._now(),
      price_paid: typeof plan.price === 'number' ? plan.price : 0,
      status: 'active'
    };

    var purchases = this._getFromStorage('membership_purchases');
    purchases.push(purchase);
    this._saveToStorage('membership_purchases', purchases);

    return {
      success: true,
      message: 'Membership purchased.',
      purchase: purchase
    };
  }

  getMembershipPurchaseSummary(membershipPurchaseId) {
    var purchases = this._getFromStorage('membership_purchases');
    var plans = this._getFromStorage('membership_plans');

    var purchase = purchases.find(function (p) { return p.id === membershipPurchaseId; }) || null;
    var plan = null;
    if (purchase) {
      plan = plans.find(function (pl) { return pl.id === purchase.membership_plan_id; }) || null;
      purchase = Object.assign({}, purchase, { membership_plan: plan });
    }

    return {
      purchase: purchase,
      plan: plan
    };
  }

  // ---------------------- Parties & Rentals ----------------------

  getPartyCategories() {
    var categories = this._getFromStorage('party_categories', []);
    if (!Array.isArray(categories)) categories = [];

    // Provide default party categories if none are configured
    if (categories.length === 0) {
      categories = [
        { category: 'birthday_party', name: 'Birthday Parties' }
      ];
    }

    return categories;
  }

  getPartyFilterOptions() {
    var amenities = [
      { id: 'private_party_room', label: 'Private Party Room' },
      { id: 'pizza_included', label: 'Pizza Included' }
    ];

    var partySizeRanges = [
      { label: 'Up to 10 kids', minChildren: 1, maxChildren: 10 },
      { label: '11-20 kids', minChildren: 11, maxChildren: 20 },
      { label: '21-30 kids', minChildren: 21, maxChildren: 30 }
    ];

    var packages = this._getFromStorage('party_packages');
    var minPrice = null;
    var maxPrice = null;
    for (var i = 0; i < packages.length; i++) {
      var p = packages[i];
      var base = typeof p.base_price === 'number' ? p.base_price : 0;
      if (minPrice === null || base < minPrice) minPrice = base;
      if (maxPrice === null || base > maxPrice) maxPrice = base;
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    var priceHints = { minPrice: minPrice, maxPrice: maxPrice };

    var availableDaysOfWeek = ['saturday', 'sunday'];

    var sortOptions = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' }
    ];

    return {
      amenities: amenities,
      partySizeRanges: partySizeRanges,
      priceHints: priceHints,
      availableDaysOfWeek: availableDaysOfWeek,
      sortOptions: sortOptions
    };
  }

  searchPartyPackages(
    category,
    selectedDate,
    partySizeChildren,
    includesPrivatePartyRoom,
    includesPizza,
    maxTotalPrice,
    sortBy
  ) {
    category = category || 'birthday_party';
    sortBy = sortBy || 'price_low_to_high';
    var packages = this._getFromStorage('party_packages');

    var selected = this._parseDateOnly(selectedDate);
    var dayId = selected ? this._getDayOfWeekId(selected) : null;

    var results = [];

    for (var i = 0; i < packages.length; i++) {
      var pkg = packages[i];
      if (pkg.status !== 'active') continue;
      if (pkg.category !== category) continue;

      if (typeof partySizeChildren === 'number') {
        if (typeof pkg.min_children === 'number' && partySizeChildren < pkg.min_children) continue;
        if (typeof pkg.max_children === 'number' && partySizeChildren > pkg.max_children) continue;
      }

      if (typeof includesPrivatePartyRoom === 'boolean') {
        if (!!pkg.includes_private_party_room !== includesPrivatePartyRoom) continue;
      }
      if (typeof includesPizza === 'boolean') {
        if (!!pkg.includes_pizza !== includesPizza) continue;
      }

      var isAvailableOnSelectedDate = true;
      if (dayId && Array.isArray(pkg.available_days_of_week) && pkg.available_days_of_week.length > 0) {
        isAvailableOnSelectedDate = pkg.available_days_of_week.indexOf(dayId) !== -1;
      }

      var computedTotalPrice = this._calculatePartyTotalPrice(pkg, partySizeChildren);

      if (typeof maxTotalPrice === 'number' && computedTotalPrice > maxTotalPrice) continue;

      results.push({
        partyPackage: pkg,
        computedTotalPrice: computedTotalPrice,
        isAvailableOnSelectedDate: isAvailableOnSelectedDate
      });
    }

    results.sort(function (a, b) {
      if (sortBy === 'price_high_to_low') {
        return b.computedTotalPrice - a.computedTotalPrice;
      }
      return a.computedTotalPrice - b.computedTotalPrice;
    });

    return { results: results };
  }

  getPartyPackageDetail(partyPackageId, selectedDate, partySizeChildren) {
    var packages = this._getFromStorage('party_packages');
    var pkg = packages.find(function (p) { return p.id === partyPackageId; }) || null;

    var computedTotalPrice = null;
    var availabilityMessage = '';
    var rulesAndPolicies = '';

    if (pkg) {
      if (typeof partySizeChildren === 'number') {
        computedTotalPrice = this._calculatePartyTotalPrice(pkg, partySizeChildren);
      }

      if (selectedDate) {
        var selected = this._parseDateOnly(selectedDate);
        var dayId = selected ? this._getDayOfWeekId(selected) : null;
        var available = true;
        if (dayId && Array.isArray(pkg.available_days_of_week) && pkg.available_days_of_week.length > 0) {
          available = pkg.available_days_of_week.indexOf(dayId) !== -1;
        }
        availabilityMessage = available ? 'Available on selected date.' : 'Not available on selected date.';
      }
    }

    return {
      partyPackage: pkg,
      computedTotalPrice: computedTotalPrice,
      availabilityMessage: availabilityMessage,
      rulesAndPolicies: rulesAndPolicies
    };
  }

  createPartyReservation(
    partyPackageId,
    selectedDate,
    partySizeChildren,
    organizerName,
    organizerPhone,
    organizerEmail,
    preferredStartTime
  ) {
    var packages = this._getFromStorage('party_packages');
    var pkg = packages.find(function (p) { return p.id === partyPackageId; });
    if (!pkg || pkg.status !== 'active') {
      return { success: false, message: 'Party package not found or inactive.', reservation: null };
    }

    var reservation = {
      id: this._generateId('party_reservation'),
      party_package_id: partyPackageId,
      selected_date: selectedDate ? new Date(selectedDate + 'T00:00:00').toISOString() : this._now(),
      party_size_children: partySizeChildren,
      organizer_name: organizerName,
      organizer_phone: organizerPhone || null,
      organizer_email: organizerEmail || null,
      preferred_start_time: preferredStartTime || null,
      created_at: this._now(),
      total_price: this._calculatePartyTotalPrice(pkg, partySizeChildren),
      status: 'requested'
    };

    var reservations = this._getFromStorage('party_reservations');
    reservations.push(reservation);
    this._saveToStorage('party_reservations', reservations);

    return {
      success: true,
      message: 'Party reservation requested.',
      reservation: reservation
    };
  }

  getPartyReservationSummary(partyReservationId) {
    var reservations = this._getFromStorage('party_reservations');
    var packages = this._getFromStorage('party_packages');

    var reservation = reservations.find(function (r) { return r.id === partyReservationId; }) || null;
    var partyPackage = null;

    if (reservation) {
      partyPackage = packages.find(function (p) { return p.id === reservation.party_package_id; }) || null;
      reservation = Object.assign({}, reservation, { party_package: partyPackage });
    }

    return {
      reservation: reservation,
      partyPackage: partyPackage
    };
  }

  // ---------------------- Pool Schedule & My Schedule ----------------------

  getPoolScheduleFilters() {
    var activityTypes = ['open_swim', 'lap_swim', 'class', 'event', 'other'];
    var poolTypes = ['indoor', 'outdoor'];

    var timeOfDayOptions = [
      { id: 'morning', label: 'Morning', startTimeFrom: '06:00', startTimeTo: '11:59' },
      { id: 'afternoon', label: 'Afternoon', startTimeFrom: '12:00', startTimeTo: '16:59' },
      { id: 'evening', label: 'Evening', startTimeFrom: '17:00', startTimeTo: '21:59' }
    ];

    return {
      activityTypes: activityTypes,
      poolTypes: poolTypes,
      timeOfDayOptions: timeOfDayOptions
    };
  }

  getPoolScheduleWeek(
    weekStartDate,
    activityType,
    poolType,
    startTimeFrom,
    startTimeTo
  ) {
    var sessions = this._getFromStorage('pool_schedule_sessions');
    var pools = this._getFromStorage('pools');
    var programs = this._getFromStorage('programs');

    var monday = this._parseDateOnly(weekStartDate);
    if (!monday) {
      return { weekStartDate: weekStartDate, sessions: [] };
    }
    var sunday = new Date(monday.getTime());
    sunday.setDate(sunday.getDate() + 6);

    var filtered = sessions.filter(function (s) {
      var d = new Date(s.session_date);
      if (d < monday || d > sunday) return false;
      if (activityType && s.activity_type !== activityType) return false;
      if (poolType && s.pool_type !== poolType) return false;
      if (startTimeFrom) {
        var sd = new Date(s.start_datetime);
        var hh = (sd.getHours() < 10 ? '0' : '') + sd.getHours();
        var mm = (sd.getMinutes() < 10 ? '0' : '') + sd.getMinutes();
        var tStr = hh + ':' + mm;
        if (tStr < startTimeFrom) return false;
      }
      if (startTimeTo) {
        var sd2 = new Date(s.start_datetime);
        var hh2 = (sd2.getHours() < 10 ? '0' : '') + sd2.getHours();
        var mm2 = (sd2.getMinutes() < 10 ? '0' : '') + sd2.getMinutes();
        var tStr2 = hh2 + ':' + mm2;
        if (tStr2 > startTimeTo) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      var da = new Date(a.start_datetime).getTime();
      var db = new Date(b.start_datetime).getTime();
      return da - db;
    });

    // Foreign key resolution: attach pool and related_program
    var enriched = filtered.map(function (s) {
      var pool = pools.find(function (p) { return p.id === s.pool_id; }) || null;
      var program = s.related_program_id ? programs.find(function (pr) { return pr.id === s.related_program_id; }) || null : null;
      var copy = Object.assign({}, s);
      copy.pool = pool;
      copy.program = program;
      return copy;
    });

    return {
      weekStartDate: weekStartDate,
      sessions: enriched
    };
  }

  addSessionToMySchedule(poolScheduleSessionId) {
    this._getOrCreateMySchedule();
    var sessions = this._getFromStorage('pool_schedule_sessions');
    var session = sessions.find(function (s) { return s.id === poolScheduleSessionId; });
    if (!session) {
      return { success: false, message: 'Session not found.', myScheduleItem: null };
    }

    var itemType = 'other';
    if (session.activity_type === 'open_swim') {
      itemType = 'open_swim_session';
    }

    var myItems = this._getFromStorage('my_schedule_items');

    var item = {
      id: this._generateId('my_schedule_item'),
      item_type: itemType,
      title: session.title,
      date: session.session_date,
      start_datetime: session.start_datetime,
      end_datetime: session.end_datetime,
      pool_schedule_session_id: poolScheduleSessionId,
      lap_lane_reservation_id: null,
      program_registration_id: null,
      party_reservation_id: null,
      membership_purchase_id: null,
      created_at: this._now()
    };

    myItems.push(item);
    this._saveToStorage('my_schedule_items', myItems);

    return {
      success: true,
      message: 'Session added to My Schedule.',
      myScheduleItem: item
    };
  }

  getMyScheduleItems() {
    this._getOrCreateMySchedule();
    var items = this._getFromStorage('my_schedule_items');
    var sessions = this._getFromStorage('pool_schedule_sessions');
    var pools = this._getFromStorage('pools');
    var lapReservations = this._getFromStorage('lap_lane_reservations');
    var lapSlots = this._getFromStorage('lap_lane_slots');
    var programs = this._getFromStorage('programs');
    var programRegs = this._getFromStorage('program_registrations');
    var partyReservations = this._getFromStorage('party_reservations');
    var partyPackages = this._getFromStorage('party_packages');
    var membershipPurchases = this._getFromStorage('membership_purchases');
    var membershipPlans = this._getFromStorage('membership_plans');

    var enriched = items.map(function (it) {
      var copy = Object.assign({}, it);

      if (it.pool_schedule_session_id) {
        var session = sessions.find(function (s) { return s.id === it.pool_schedule_session_id; }) || null;
        if (session) {
          var pool = pools.find(function (p) { return p.id === session.pool_id; }) || null;
          var program = session.related_program_id ? programs.find(function (pp) { return pp.id === session.related_program_id; }) || null : null;
          session = Object.assign({}, session, { pool: pool, program: program });
        }
        copy.pool_schedule_session = session;
      }

      if (it.lap_lane_reservation_id) {
        var res = lapReservations.find(function (r) { return r.id === it.lap_lane_reservation_id; }) || null;
        if (res) {
          var slot = lapSlots.find(function (s) { return s.id === res.lap_lane_slot_id; }) || null;
          var pool2 = slot ? pools.find(function (p) { return p.id === slot.pool_id; }) || null : null;
          if (slot) slot = Object.assign({}, slot, { pool: pool2 });
          res = Object.assign({}, res, { lap_lane_slot: slot });
        }
        copy.lap_lane_reservation = res;
      }

      if (it.program_registration_id) {
        var pr = programRegs.find(function (r) { return r.id === it.program_registration_id; }) || null;
        if (pr) {
          var prog = programs.find(function (p) { return p.id === pr.program_id; }) || null;
          pr = Object.assign({}, pr, { program: prog });
        }
        copy.program_registration = pr;
      }

      if (it.party_reservation_id) {
        var partyRes = partyReservations.find(function (r) { return r.id === it.party_reservation_id; }) || null;
        if (partyRes) {
          var pkg = partyPackages.find(function (p) { return p.id === partyRes.party_package_id; }) || null;
          partyRes = Object.assign({}, partyRes, { party_package: pkg });
        }
        copy.party_reservation = partyRes;
      }

      if (it.membership_purchase_id) {
        var mp = membershipPurchases.find(function (m) { return m.id === it.membership_purchase_id; }) || null;
        if (mp) {
          var plan = membershipPlans.find(function (p) { return p.id === mp.membership_plan_id; }) || null;
          mp = Object.assign({}, mp, { membership_plan: plan });
        }
        copy.membership_purchase = mp;
      }

      return copy;
    });

    return enriched;
  }

  removeMyScheduleItem(myScheduleItemId) {
    var items = this._getFromStorage('my_schedule_items');
    var initialLen = items.length;
    items = items.filter(function (it) { return it.id !== myScheduleItemId; });
    this._saveToStorage('my_schedule_items', items);
    var removed = items.length < initialLen;
    return {
      success: removed,
      message: removed ? 'Item removed from My Schedule.' : 'Item not found.'
    };
  }

  // ---------------------- Passes & Cart & Checkout ----------------------

  getPassFilterOptions() {
    var passTypes = ['guest_passes', 'membership_addon', 'other'];
    var formats = ['digital_pass', 'physical_pass'];
    var sortOptions = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' }
    ];
    return {
      passTypes: passTypes,
      formats: formats,
      sortOptions: sortOptions
    };
  }

  searchPassProducts(
    passType,
    format,
    desiredTotalVisits,
    maxTotalPrice,
    sortBy,
    isActive
  ) {
    var products = this._getFromStorage('pass_products');
    sortBy = sortBy || 'price_low_to_high';
    if (typeof isActive !== 'boolean') isActive = true;

    var filtered = products.filter(function (p) {
      if (isActive && !p.is_active) return false;
      if (passType && p.pass_type !== passType) return false;
      if (format && p.format !== format) return false;

      if (typeof desiredTotalVisits === 'number' && typeof maxTotalPrice === 'number') {
        // Keep only products that can reach exactly desiredTotalVisits with integer quantity under maxTotalPrice
        if (!p.visits_per_pass || p.visits_per_pass <= 0) return false;
        if (desiredTotalVisits % p.visits_per_pass !== 0) return false;
        var qty = desiredTotalVisits / p.visits_per_pass;
        var totalCost = (p.price || 0) * qty;
        if (totalCost > maxTotalPrice) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      if (sortBy === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === 'visits_high_to_low') {
        return (b.visits_per_pass || 0) - (a.visits_per_pass || 0);
      }
      return (a.price || 0) - (b.price || 0);
    });

    return { passProducts: filtered };
  }

  getPassProductDetail(passProductId) {
    var products = this._getFromStorage('pass_products');
    var passProduct = products.find(function (p) { return p.id === passProductId; }) || null;

    var usageRules = '';
    var expirationPolicy = '';
    var deliveryDetails = '';

    return {
      passProduct: passProduct,
      usageRules: usageRules,
      expirationPolicy: expirationPolicy,
      deliveryDetails: deliveryDetails
    };
  }

  addPassProductToCart(passProductId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    var products = this._getFromStorage('pass_products');
    var passProduct = products.find(function (p) { return p.id === passProductId; });
    if (!passProduct) {
      return { success: false, message: 'Pass product not found.', cart: null, cartItems: [] };
    }

    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items');

    var existing = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.item_type === 'pass_product' && ci.pass_product_id === passProductId;
    });

    var unitPrice = typeof passProduct.price === 'number' ? passProduct.price : 0;

    if (existing) {
      existing.quantity += quantity;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      var newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'pass_product',
        item_ref_id: passProductId,
        program_id: null,
        pass_product_id: passProductId,
        membership_plan_id: null,
        name: passProduct.name,
        unit_price: unitPrice,
        quantity: quantity,
        total_price: unitPrice * quantity,
        added_at: this._now()
      };
      cartItems.push(newItem);
    }

    cart.updated_at = this._now();
    this._saveToStorage('cart', [cart]);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      message: 'Pass product added to cart.',
      cart: cart,
      cartItems: cartItems
    };
  }

  getCartSummary() {
    var summary = this._getCartWithItems();
    return {
      cart: summary.cart,
      items: summary.items,
      subtotal: summary.subtotal,
      itemCount: summary.itemCount
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    var cart = this._getOrCreateCart();
    var items = this._getFromStorage('cart_items');
    var changed = false;

    for (var i = 0; i < items.length; i++) {
      if (items[i].id === cartItemId && items[i].cart_id === cart.id) {
        changed = true;
        if (quantity <= 0) {
          items.splice(i, 1);
        } else {
          items[i].quantity = quantity;
          items[i].total_price = items[i].unit_price * quantity;
        }
        break;
      }
    }

    if (changed) {
      cart.updated_at = this._now();
      this._saveToStorage('cart', [cart]);
      this._saveToStorage('cart_items', items);
    }

    var summary = this._getCartWithItems();
    return {
      cart: summary.cart,
      items: summary.items,
      subtotal: summary.subtotal,
      itemCount: summary.itemCount
    };
  }

  removeCartItem(cartItemId) {
    var cart = this._getOrCreateCart();
    var items = this._getFromStorage('cart_items');
    var initialLen = items.length;
    items = items.filter(function (it) {
      return !(it.id === cartItemId && it.cart_id === cart.id);
    });

    if (items.length !== initialLen) {
      cart.updated_at = this._now();
      this._saveToStorage('cart', [cart]);
      this._saveToStorage('cart_items', items);
    }

    var summary = this._getCartWithItems();
    return {
      cart: summary.cart,
      items: summary.items,
      subtotal: summary.subtotal,
      itemCount: summary.itemCount
    };
  }

  getCheckoutSummary() {
    var summary = this._getCartWithItems();
    var taxAmount = 0; // Facility may not charge tax; kept zero by default
    var totalAmount = summary.subtotal + taxAmount;
    return {
      cart: summary.cart,
      items: summary.items,
      subtotal: summary.subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount
    };
  }

  submitCheckout(purchaserName, purchaserEmail, purchaserPhone, paymentMethod) {
    var checkout = this.getCheckoutSummary();
    if (!checkout.cart || checkout.itemCount === 0) {
      return { success: false, message: 'Cart is empty.', order: null, orderItems: [] };
    }

    var order = {
      id: this._generateId('order'),
      created_at: this._now(),
      purchaser_name: purchaserName,
      purchaser_email: purchaserEmail,
      purchaser_phone: purchaserPhone || null,
      payment_method: paymentMethod,
      total_amount: checkout.totalAmount,
      status: 'paid'
    };

    var orders = this._getFromStorage('orders');
    orders.push(order);
    this._saveToStorage('orders', orders);

    var orderItems = this._getFromStorage('order_items');
    var newOrderItems = [];

    for (var i = 0; i < checkout.items.length; i++) {
      var ci = checkout.items[i];
      var oi = {
        id: this._generateId('order_item'),
        order_id: order.id,
        item_type: ci.item_type,
        item_ref_id: ci.item_ref_id,
        program_id: ci.program_id || null,
        pass_product_id: ci.pass_product_id || null,
        membership_plan_id: ci.membership_plan_id || null,
        name: ci.name,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        total_price: ci.total_price
      };
      orderItems.push(oi);
      newOrderItems.push(oi);
    }

    this._saveToStorage('order_items', orderItems);

    // Clear cart for single-user scenario
    this._saveToStorage('cart', []);
    this._saveToStorage('cart_items', []);

    return {
      success: true,
      message: 'Checkout completed.',
      order: order,
      orderItems: newOrderItems
    };
  }

  // ---------------------- Content / Informational ----------------------

  getAboutContent() {
    var content = this._getFromStorage('about_content', {});
    return {
      mission: content.mission || '',
      history: content.history || '',
      facilitiesOverview: content.facilitiesOverview || '',
      generalHours: content.generalHours || '',
      locationDescription: content.locationDescription || '',
      amenities: content.amenities || []
    };
  }

  getContactInfo() {
    var info = this._getFromStorage('contact_info', {});
    return {
      mainPhone: info.mainPhone || '',
      emailAddresses: info.emailAddresses || [],
      physicalAddress: info.physicalAddress || '',
      directionsSummary: info.directionsSummary || ''
    };
  }

  submitContactForm(topic, name, email, phone, message) {
    var messages = this._getFromStorage('contact_messages');
    var entry = {
      id: this._generateId('contact_message'),
      topic: topic || 'general',
      name: name,
      email: email,
      phone: phone || null,
      message: message,
      created_at: this._now()
    };
    messages.push(entry);
    this._saveToStorage('contact_messages', messages);
    return {
      success: true,
      message: 'Contact message submitted.'
    };
  }

  getPoliciesContent() {
    var content = this._getFromStorage('policies_content', {});
    return {
      poolAndFacilityRules: content.poolAndFacilityRules || '',
      safetyGuidelines: content.safetyGuidelines || '',
      membershipTerms: content.membershipTerms || '',
      cancellationAndRefundPolicy: content.cancellationAndRefundPolicy || '',
      waiverInformation: content.waiverInformation || ''
    };
  }

  getFaqSections() {
    var sections = this._getFromStorage('faq_sections');
    if (!Array.isArray(sections)) sections = [];
    return sections;
  }

  // ---------------------- Specialized Searches ----------------------

  searchLifeguardCertificationPrograms(maxEndDate, maxPrice, requiresCprFirstAid) {
    if (typeof requiresCprFirstAid !== 'boolean') requiresCprFirstAid = true;
    var programs = this._getFromStorage('programs');

    var maxEnd = maxEndDate ? new Date(maxEndDate + 'T23:59:59') : null;

    var filtered = programs.filter(function (p) {
      if (p.status !== 'active') return false;
      if (p.category_id !== 'training_certifications') return false;
      if (p.subcategory !== 'lifeguard_certification') return false;
      if (requiresCprFirstAid && !p.includes_cpr_first_aid) return false;
      if (typeof maxPrice === 'number' && typeof p.price === 'number' && p.price > maxPrice) return false;
      if (maxEnd && p.end_date) {
        var end = new Date(p.end_date);
        if (end > maxEnd) return false;
      }
      if (!p.is_weekends_only) return false;
      return true;
    });

    filtered.sort(function (a, b) {
      var da = typeof a.total_duration_hours === 'number' ? a.total_duration_hours : Number.POSITIVE_INFINITY;
      var db = typeof b.total_duration_hours === 'number' ? b.total_duration_hours : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return { programs: filtered };
  }

  searchAquaFitnessEveningClasses(maxPricePerClass) {
    var programs = this._getFromStorage('programs');

    var filtered = programs.filter(function (p) {
      if (p.status !== 'active') return false;
      if (p.category_id !== 'fitness_classes') return false;
      if (p.subcategory !== 'aqua_fitness') return false;
      var start = p.start_time || '';
      if (start < '18:00' || start > '20:00') return false;
      if (typeof maxPricePerClass === 'number' && typeof p.price === 'number' && p.price > maxPricePerClass) return false;
      return true;
    });

    return { programs: filtered };
  }

  // ---------------------- Legacy example from template (not used by tasks) ----------------------

  // Generic example addToCart (kept minimal for compatibility; uses legacy keys)
  addToCart(userId, productId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    var carts = this._getFromStorage('carts');
    var cartItems = this._getFromStorage('cartItems');

    var cart = carts.find(function (c) { return c.userId === userId; });
    if (!cart) {
      cart = { id: this._generateId('legacy_cart'), userId: userId, created_at: this._now(), updated_at: this._now() };
      carts.push(cart);
    }

    var existing = cartItems.find(function (ci) { return ci.cartId === cart.id && ci.productId === productId; });
    if (existing) {
      existing.quantity += quantity;
    } else {
      cartItems.push({
        id: this._generateId('legacy_cart_item'),
        cartId: cart.id,
        productId: productId,
        quantity: quantity
      });
    }

    cart.updated_at = this._now();
    this._saveToStorage('carts', carts);
    this._saveToStorage('cartItems', cartItems);

    return { success: true, cartId: cart.id };
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