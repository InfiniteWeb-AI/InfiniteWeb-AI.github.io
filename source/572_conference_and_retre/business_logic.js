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

  // ------------------------------
  // Storage helpers
  // ------------------------------

  _initStorage() {
    const keys = [
      'retreat_packages',
      'retreat_bookings',
      'event_spaces',
      'event_space_bookings',
      'lodging_room_types',
      'room_bookings',
      'catering_menu_items',
      'catering_orders',
      'catering_order_items',
      'gift_certificate_templates',
      'gift_certificate_purchases',
      'wedding_quote_requests',
      'agendas',
      'agenda_sessions',
      'carts',
      'cart_items',
      'orders'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('currentCartId')) {
      localStorage.setItem('currentCartId', '');
    }

    if (!localStorage.getItem('currentCateringOrderId')) {
      localStorage.setItem('currentCateringOrderId', '');
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

  _updateCart(cart) {
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    const currentCartId = localStorage.getItem('currentCartId') || '';
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        itemIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('currentCartId', cart.id);
    }

    return cart;
  }

  _addBookingOrOrderToCart(itemType, referenceId, displayName, quantity, totalPrice) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: itemType,
      referenceId: referenceId,
      displayName: displayName || '',
      quantity: quantity != null ? quantity : 1,
      totalPrice: typeof totalPrice === 'number' ? totalPrice : 0
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.itemIds = cart.itemIds || [];
    cart.itemIds.push(cartItem.id);
    cart.updatedAt = new Date().toISOString();
    this._updateCart(cart);

    const cartTotal = cartItems
      .filter((ci) => ci.cartId === cart.id)
      .reduce((sum, ci) => sum + (ci.totalPrice || 0), 0);

    return {
      cartItemId: cartItem.id,
      cartTotal: cartTotal,
      currency: 'USD'
    };
  }

  // ------------------------------
  // Date/time helpers
  // ------------------------------

  _toISODate(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  _calculateNights(checkInDate, checkOutDate) {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffMs = end.getTime() - start.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  }

  _calculateHoursDifference(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(':').map((v) => parseInt(v, 10));
    const [eh, em] = endTime.split(':').map((v) => parseInt(v, 10));
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const diffMinutes = endMinutes - startMinutes;
    const hours = diffMinutes / 60;
    return hours > 0 ? hours : 0;
  }

  // ------------------------------
  // Pricing helpers
  // ------------------------------

  _calculateRetreatTotalPrice(pkg, checkInDate, checkOutDate, attendeeCount) {
    const attendees = attendeeCount && attendeeCount > 0 ? attendeeCount : 1;
    let nights = 0;

    if (checkInDate && checkOutDate) {
      nights = this._calculateNights(checkInDate, checkOutDate);
      if (nights <= 0) nights = 1;
    } else if (pkg && typeof pkg.durationDays === 'number' && pkg.durationDays > 0) {
      nights = pkg.durationDays >= 1 ? pkg.durationDays - 1 : 1;
    } else {
      nights = 1;
    }

    let perPerson = 0;
    let total = 0;

    if (!pkg || !pkg.pricingModel) {
      return { nights: nights, perPersonPrice: 0, totalPrice: 0 };
    }

    if (pkg.pricingModel === 'per_person_per_night') {
      const base = pkg.pricePerPersonPerNight || 0;
      perPerson = base * nights;
      total = perPerson * attendees;
    } else if (pkg.pricingModel === 'per_person_flat') {
      perPerson = pkg.pricePerPersonFlat || 0;
      total = perPerson * attendees;
    } else if (pkg.pricingModel === 'per_group_flat') {
      total = pkg.pricePerGroupFlat || 0;
      perPerson = attendees > 0 ? total / attendees : 0;
    }

    return { nights: nights, perPersonPrice: perPerson, totalPrice: total };
  }

  _calculateEventSpaceRateAmount(space, startTime, endTime, rateTypePreference) {
    if (!space) {
      return { rateTypeUsed: 'full_day', rateAmount: 0 };
    }

    const fullDayRate = space.fullDayRate || 0;
    const halfDayRate = space.halfDayRate || 0;
    const hourlyRate = space.hourlyRate || 0;

    let rateTypeUsed = null;
    let amount = 0;

    const pickHourly = () => {
      if (hourlyRate > 0 && startTime && endTime) {
        rateTypeUsed = 'hourly';
        const hours = this._calculateHoursDifference(startTime, endTime);
        amount = hourlyRate * (hours || 1);
      }
    };

    if (rateTypePreference === 'full_day' && space.supportsFullDayRate && fullDayRate > 0) {
      rateTypeUsed = 'full_day';
      amount = fullDayRate;
    } else if (rateTypePreference === 'half_day' && halfDayRate > 0) {
      rateTypeUsed = 'half_day';
      amount = halfDayRate;
    } else if (rateTypePreference === 'hourly') {
      pickHourly();
    }

    if (!rateTypeUsed) {
      if (space.supportsFullDayRate && fullDayRate > 0) {
        rateTypeUsed = 'full_day';
        amount = fullDayRate;
      } else if (halfDayRate > 0) {
        rateTypeUsed = 'half_day';
        amount = halfDayRate;
      } else if (hourlyRate > 0) {
        pickHourly();
      } else {
        rateTypeUsed = 'full_day';
        amount = 0;
      }
    }

    return { rateTypeUsed: rateTypeUsed, rateAmount: amount };
  }

  // ------------------------------
  // Catering helpers
  // ------------------------------

  _getCurrentCateringOrder() {
    const currentId = localStorage.getItem('currentCateringOrderId') || '';
    if (!currentId) return null;
    const orders = this._getFromStorage('catering_orders');
    return orders.find((o) => o.id === currentId) || null;
  }

  _saveCateringOrder(order) {
    const orders = this._getFromStorage('catering_orders');
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx === -1) {
      orders.push(order);
    } else {
      orders[idx] = order;
    }
    this._saveToStorage('catering_orders', orders);
  }

  _recalculateCateringOrderTotals(order) {
    if (!order) return null;

    const orderItems = this._getFromStorage('catering_order_items');
    const menuItems = this._getFromStorage('catering_menu_items');
    const relevantItems = orderItems.filter((oi) => oi.cateringOrderId === order.id);

    let total = 0;
    const guestCount = order.guestCount || 0;

    relevantItems.forEach((oi) => {
      const menuItem = menuItems.find((m) => m.id === oi.menuItemId);
      const pricePerPerson = menuItem ? menuItem.pricePerPerson || 0 : 0;
      oi.pricePerPersonAtOrder = pricePerPerson;
      const lineTotal = pricePerPerson * guestCount * (oi.quantity || 0);
      total += lineTotal;
    });

    order.calculatedTotalCost = total;
    order.calculatedPerPersonCost = guestCount > 0 ? total / guestCount : 0;

    this._saveToStorage('catering_order_items', orderItems);
    this._saveCateringOrder(order);

    return order;
  }

  _buildCateringOrderResponse(order) {
    if (!order) {
      return {
        cateringOrderId: null,
        guestCount: 0,
        calculatedTotalCost: 0,
        calculatedPerPersonCost: 0,
        items: []
      };
    }

    this._recalculateCateringOrderTotals(order);

    const orderItems = this._getFromStorage('catering_order_items');
    const menuItems = this._getFromStorage('catering_menu_items');

    const items = orderItems
      .filter((oi) => oi.cateringOrderId === order.id)
      .map((oi) => {
        const menuItem = menuItems.find((m) => m.id === oi.menuItemId) || null;
        const pricePerPerson = menuItem ? menuItem.pricePerPerson || 0 : 0;
        const lineTotal = pricePerPerson * (order.guestCount || 0) * (oi.quantity || 0);
        return {
          orderItemId: oi.id,
          menuItemId: oi.menuItemId,
          name: menuItem ? menuItem.name : '',
          mealType: menuItem ? menuItem.mealType : '',
          courseType: menuItem ? menuItem.courseType : '',
          isVegetarian: menuItem ? !!menuItem.isVegetarian : false,
          pricePerPerson: pricePerPerson,
          quantity: oi.quantity,
          lineTotal: lineTotal,
          menuItem: menuItem
        };
      });

    return {
      cateringOrderId: order.id,
      guestCount: order.guestCount,
      calculatedTotalCost: order.calculatedTotalCost || 0,
      calculatedPerPersonCost: order.calculatedPerPersonCost || 0,
      items: items
    };
  }

  // ------------------------------
  // Agenda helpers
  // ------------------------------

  _getOrCreateAgendaForDate(date) {
    const agendas = this._getFromStorage('agendas');
    const isoDate = this._toISODate(date);
    let agenda = agendas.find((a) => this._toISODate(a.date) === isoDate) || null;

    if (!agenda) {
      agenda = {
        id: this._generateId('agenda'),
        title: '',
        date: isoDate,
        sessionIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      agendas.push(agenda);
      this._saveToStorage('agendas', agendas);
    }

    return agenda;
  }

  _saveAgenda(agenda) {
    const agendas = this._getFromStorage('agendas');
    const idx = agendas.findIndex((a) => a.id === agenda.id);
    if (idx === -1) {
      agendas.push(agenda);
    } else {
      agendas[idx] = agenda;
    }
    this._saveToStorage('agendas', agendas);
  }

  // ------------------------------
  // Home / Overview Interfaces
  // ------------------------------

  getHomeOverview() {
    const retreatPackages = this._getFromStorage('retreat_packages').filter((p) => p.isActive !== false);
    const eventSpaces = this._getFromStorage('event_spaces').filter((s) => s.isActive !== false);
    const roomTypes = this._getFromStorage('lodging_room_types').filter((r) => r.isActive !== false);
    const giftTemplates = this._getFromStorage('gift_certificate_templates').filter((t) => t.isActive !== false);

    const featuredRetreatCategoriesMap = {};
    retreatPackages.forEach((p) => {
      if (!p.retreatType) return;
      if (!featuredRetreatCategoriesMap[p.retreatType]) {
        featuredRetreatCategoriesMap[p.retreatType] = p;
      }
    });

    const featuredRetreatCategories = Object.keys(featuredRetreatCategoriesMap).map((type) => {
      const pkg = featuredRetreatCategoriesMap[type];
      let title = '';
      if (type === 'corporate') title = 'Corporate Retreats';
      else if (type === 'wellness_yoga') title = 'Wellness & Yoga Retreats';
      else title = 'Retreats';
      return {
        retreatType: type,
        title: title,
        description: pkg.description || '',
        imageUrl: pkg.imageUrl || ''
      };
    });

    const featuredMeetingSpaces = eventSpaces
      .filter((s) => s.spaceType === 'meeting_room' || s.spaceType === 'main_hall')
      .slice(0, 6)
      .map((s) => ({
        eventSpaceId: s.id,
        name: s.name,
        spaceType: s.spaceType,
        capacity: s.capacity,
        imageUrl: s.imageUrl || '',
        eventSpace: s
      }));

    const featuredLodgingRoomTypes = roomTypes.slice(0, 6).map((r) => ({
      roomTypeId: r.id,
      name: r.name,
      baseNightlyRate: r.baseNightlyRate,
      guestRating: r.guestRating,
      imageUrl: r.imageUrl || '',
      roomType: r
    }));

    const featuredGiftTemplatesMapped = giftTemplates.slice(0, 6).map((t) => ({
      templateId: t.id,
      name: t.name,
      templateType: t.templateType,
      defaultAmount: t.defaultAmount || 0,
      imageUrl: t.imageUrl || '',
      template: t
    }));

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return {
      hero: {
        headline: 'Welcome to Our Conference & Retreat Center',
        subheadline: 'Retreats, meetings, weddings, and stays in one peaceful destination.',
        backgroundImageUrl: ''
      },
      featuredRetreatCategories: featuredRetreatCategories,
      featuredMeetingSpaces: featuredMeetingSpaces,
      featuredLodgingRoomTypes: featuredLodgingRoomTypes,
      featuredGiftTemplates: featuredGiftTemplatesMapped,
      quickSearchDefaults: {
        retreats: {
          defaultCheckInDate: this._toISODate(today),
          defaultCheckOutDate: this._toISODate(tomorrow)
        },
        meetings: {
          defaultEventDate: this._toISODate(today),
          defaultStartTime: '09:00',
          defaultEndTime: '17:00'
        },
        lodging: {
          defaultCheckInDate: this._toISODate(today),
          defaultCheckOutDate: this._toISODate(tomorrow)
        }
      }
    };
  }

  // ------------------------------
  // Retreat search & booking
  // ------------------------------

  getRetreatSearchFilterOptions() {
    return {
      retreatTypes: [
        { value: 'corporate', label: 'Corporate Retreats' },
        { value: 'wellness_yoga', label: 'Wellness & Yoga' },
        { value: 'other', label: 'Other Retreats' }
      ],
      schedulingTypes: [
        { value: 'flexible_dates', label: 'Flexible Dates' },
        { value: 'fixed_dates', label: 'Fixed Dates' }
      ],
      durationOptions: [
        { value: 'weekend_2_3_days', label: 'Weekend (2-3 days)', minDays: 2, maxDays: 3 },
        { value: '4_plus_days', label: '4+ days', minDays: 4, maxDays: 365 }
      ],
      amenityFilters: {
        includesTeamBuilding: {
          label: 'Team-building activities included',
          description: 'Packages that include structured team-building experiences.'
        },
        includesVegetarianMeals: {
          label: 'Vegetarian meals included',
          description: 'Packages that offer vegetarian meal options.'
        },
        includesMeals: {
          label: 'Meals included',
          description: 'Packages that include some or all meals.'
        }
      },
      budgetFilter: {
        currency: 'USD',
        minAllowed: 0,
        maxAllowed: 100000,
        supportsPerPerson: true,
        supportsTotal: true
      },
      sortOptions: [
        { value: 'total_price_asc', label: 'Total Price: Low to High', description: 'Sort by lowest total price first.' },
        { value: 'total_price_desc', label: 'Total Price: High to Low', description: 'Sort by highest total price first.' },
        { value: 'start_date_asc', label: 'Start Date: Soonest First', description: 'Sort by earliest start date.' },
        { value: 'start_date_desc', label: 'Start Date: Latest First', description: 'Sort by latest start date.' }
      ]
    };
  }

  searchRetreatPackagesForBooking(
    retreatType,
    schedulingType,
    dateRangeStart,
    dateRangeEnd,
    checkInDate,
    checkOutDate,
    attendeeCount,
    minDurationDays,
    maxDurationDays,
    maxPerPersonPrice,
    maxTotalPrice,
    includesTeamBuilding,
    includesVegetarianMeals,
    sortBy
  ) {
    const packages = this._getFromStorage('retreat_packages').filter((p) => p.isActive !== false);
    const results = [];

    const drStart = dateRangeStart ? new Date(dateRangeStart) : null;
    const drEnd = dateRangeEnd ? new Date(dateRangeEnd) : null;
    const minDur = typeof minDurationDays === 'number' ? minDurationDays : null;
    const maxDur = typeof maxDurationDays === 'number' ? maxDurationDays : null;

    packages.forEach((pkg) => {
      if (retreatType && pkg.retreatType !== retreatType) return;
      if (schedulingType && pkg.schedulingType !== schedulingType) return;

      // Capacity
      if (typeof attendeeCount === 'number') {
        // Allow single-attendee registrations even if package minAttendees is higher
        if (attendeeCount > 1 && typeof pkg.minAttendees === 'number' && attendeeCount < pkg.minAttendees) return;
        if (typeof pkg.maxAttendees === 'number' && attendeeCount > pkg.maxAttendees) return;
      }

      // Amenities
      if (includesTeamBuilding === true && !pkg.includesTeamBuilding) return;
      if (includesVegetarianMeals === true && !pkg.includesVegetarianMeals) return;

      let effectiveCheckIn = checkInDate;
      let effectiveCheckOut = checkOutDate;
      let durationDays = pkg.durationDays || null;
      let fixedStartDate = pkg.startDate ? new Date(pkg.startDate) : null;
      let fixedEndDate = pkg.endDate ? new Date(pkg.endDate) : null;

      if (pkg.schedulingType === 'flexible_dates') {
        // Availability window
        if (pkg.availableStartDate && effectiveCheckIn) {
          const avStart = new Date(pkg.availableStartDate);
          const ci = new Date(effectiveCheckIn);
          if (ci < avStart) return;
        }
        if (pkg.availableEndDate && effectiveCheckOut) {
          const avEnd = new Date(pkg.availableEndDate);
          const co = new Date(effectiveCheckOut);
          if (co > avEnd) return;
        }
      } else if (pkg.schedulingType === 'fixed_dates') {
        if (!fixedStartDate || !fixedEndDate) return;
        durationDays = Math.round((fixedEndDate.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24)) || pkg.durationDays || 0;

        if (drStart && fixedStartDate < drStart) return;
        if (drEnd && fixedStartDate > drEnd) return;

        if (minDur !== null && durationDays < minDur) return;
        if (maxDur !== null && durationDays > maxDur) return;

        effectiveCheckIn = this._toISODate(fixedStartDate);
        effectiveCheckOut = this._toISODate(fixedEndDate);
      }

      const pricing = this._calculateRetreatTotalPrice(pkg, effectiveCheckIn, effectiveCheckOut, attendeeCount || 1);
      const perPersonPrice = pricing.perPersonPrice;
      const totalPrice = pricing.totalPrice;

      let isWithinBudget = true;
      if (typeof maxPerPersonPrice === 'number' && perPersonPrice > maxPerPersonPrice) isWithinBudget = false;
      if (typeof maxTotalPrice === 'number' && totalPrice > maxTotalPrice) isWithinBudget = false;

      if ((typeof maxPerPersonPrice === 'number' || typeof maxTotalPrice === 'number') && !isWithinBudget) {
        return;
      }

      results.push({
        retreatPackageId: pkg.id,
        name: pkg.name,
        retreatType: pkg.retreatType,
        schedulingType: pkg.schedulingType,
        shortDescription: pkg.description || '',
        imageUrl: pkg.imageUrl || '',
        pricingModel: pkg.pricingModel,
        pricePerPersonPerNight: pkg.pricePerPersonPerNight || 0,
        pricePerPersonFlat: pkg.pricePerPersonFlat || 0,
        pricePerGroupFlat: pkg.pricePerGroupFlat || 0,
        includesTeamBuilding: !!pkg.includesTeamBuilding,
        includesMeals: !!pkg.includesMeals,
        includesVegetarianMeals: !!pkg.includesVegetarianMeals,
        minAttendees: pkg.minAttendees,
        maxAttendees: pkg.maxAttendees,
        availableStartDate: pkg.availableStartDate || null,
        availableEndDate: pkg.availableEndDate || null,
        startDate: pkg.startDate || null,
        endDate: pkg.endDate || null,
        durationDays: durationDays,
        nights: pricing.nights,
        attendeeCountUsed: attendeeCount || 1,
        computedPerPersonPrice: perPersonPrice,
        computedTotalPrice: totalPrice,
        currency: 'USD',
        isWithinBudget: isWithinBudget,
        retreatPackage: pkg
      });
    });

    const sort = sortBy || 'total_price_asc';
    results.sort((a, b) => {
      if (sort === 'total_price_desc') return (b.computedTotalPrice || 0) - (a.computedTotalPrice || 0);
      if (sort === 'start_date_asc') {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        return da - db;
      }
      if (sort === 'start_date_desc') {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        return db - da;
      }
      // default total_price_asc
      return (a.computedTotalPrice || 0) - (b.computedTotalPrice || 0);
    });

    // Instrumentation for task completion tracking - task_1
    try {
      localStorage.setItem(
        'task1_retreatSearchParams',
        JSON.stringify({
          params: {
            retreatType,
            schedulingType,
            dateRangeStart,
            dateRangeEnd,
            checkInDate,
            checkOutDate,
            attendeeCount,
            minDurationDays,
            maxDurationDays,
            maxPerPersonPrice,
            maxTotalPrice,
            includesTeamBuilding,
            includesVegetarianMeals,
            sortBy: sortBy || 'total_price_asc'
          },
          results: results.map((r) => ({
            retreatPackageId: r.retreatPackageId,
            computedTotalPrice: r.computedTotalPrice
          }))
        })
      );
    } catch (e) {
      try {
        console.error('Instrumentation error (task1_retreatSearchParams):', e);
      } catch (e2) {}
    }

    // Instrumentation for task completion tracking - task_3
    try {
      localStorage.setItem(
        'task3_retreatSearchParams',
        JSON.stringify({
          params: {
            retreatType,
            schedulingType,
            dateRangeStart,
            dateRangeEnd,
            checkInDate,
            checkOutDate,
            attendeeCount,
            minDurationDays,
            maxDurationDays,
            maxPerPersonPrice,
            maxTotalPrice,
            includesTeamBuilding,
            includesVegetarianMeals,
            sortBy: sortBy || 'start_date_asc'
          },
          results: results.map((r) => ({
            retreatPackageId: r.retreatPackageId,
            durationDays: r.durationDays,
            computedPerPersonPrice: r.computedPerPersonPrice,
            computedTotalPrice: r.computedTotalPrice,
            startDate: r.startDate
          }))
        })
      );
    } catch (e) {
      try {
        console.error('Instrumentation error (task3_retreatSearchParams):', e);
      } catch (e2) {}
    }

    return results;
  }

  getRetreatPackageDetails(retreatPackageId) {
    const packages = this._getFromStorage('retreat_packages');
    const pkg = packages.find((p) => p.id === retreatPackageId) || null;
    if (!pkg) return null;

    return {
      retreatPackageId: pkg.id,
      name: pkg.name,
      heroImageUrl: pkg.imageUrl || '',
      retreatType: pkg.retreatType,
      schedulingType: pkg.schedulingType,
      description: pkg.description || '',
      itineraryHtml: '',
      inclusions: [],
      policiesHtml: '',
      pricingModel: pkg.pricingModel,
      pricePerPersonPerNight: pkg.pricePerPersonPerNight || 0,
      pricePerPersonFlat: pkg.pricePerPersonFlat || 0,
      pricePerGroupFlat: pkg.pricePerGroupFlat || 0,
      minAttendees: pkg.minAttendees,
      maxAttendees: pkg.maxAttendees,
      minNights: pkg.minNights,
      maxNights: pkg.maxNights,
      startDate: pkg.startDate || null,
      endDate: pkg.endDate || null,
      durationDays: pkg.durationDays || null,
      includesTeamBuilding: !!pkg.includesTeamBuilding,
      includesMeals: !!pkg.includesMeals,
      includesVegetarianMeals: !!pkg.includesVegetarianMeals
    };
  }

  quoteRetreatBookingPrice(retreatPackageId, checkInDate, checkOutDate, attendeeCount) {
    const packages = this._getFromStorage('retreat_packages');
    const pkg = packages.find((p) => p.id === retreatPackageId) || null;
    if (!pkg) {
      return null;
    }

    const pricing = this._calculateRetreatTotalPrice(pkg, checkInDate, checkOutDate, attendeeCount || 1);

    return {
      retreatPackageId: retreatPackageId,
      checkInDate: checkInDate || null,
      checkOutDate: checkOutDate || null,
      nights: pricing.nights,
      attendeeCount: attendeeCount || 1,
      pricingModel: pkg.pricingModel,
      pricePerPerson: pricing.perPersonPrice,
      totalPrice: pricing.totalPrice,
      currency: 'USD',
      retreatPackage: pkg
    };
  }

  createRetreatBookingAndAddToCart(retreatPackageId, checkInDate, checkOutDate, attendeeCount) {
    const packages = this._getFromStorage('retreat_packages');
    const pkg = packages.find((p) => p.id === retreatPackageId) || null;
    if (!pkg) {
      return { success: false, message: 'Retreat package not found', cartItemId: null, cartTotal: 0, currency: 'USD' };
    }

    const pricing = this._calculateRetreatTotalPrice(pkg, checkInDate, checkOutDate, attendeeCount || 1);

    const bookings = this._getFromStorage('retreat_bookings');
    const booking = {
      id: this._generateId('retreat_booking'),
      retreatPackageId: retreatPackageId,
      checkInDate: checkInDate || null,
      checkOutDate: checkOutDate || null,
      nights: pricing.nights,
      attendeeCount: attendeeCount || 1,
      pricingModel: pkg.pricingModel,
      pricePerPerson: pricing.perPersonPrice,
      totalPrice: pricing.totalPrice,
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('retreat_bookings', bookings);

    const cartResult = this._addBookingOrOrderToCart('retreat_booking', booking.id, pkg.name, 1, booking.totalPrice);

    return {
      success: true,
      message: 'Retreat booking added to cart',
      cartItemId: cartResult.cartItemId,
      cartTotal: cartResult.cartTotal,
      currency: cartResult.currency
    };
  }

  // ------------------------------
  // Meetings & Event Spaces
  // ------------------------------

  getMeetingsOverviewContent() {
    const eventSpaces = this._getFromStorage('event_spaces').filter((s) => s.isActive !== false);

    const featuredMeetingRooms = eventSpaces
      .filter((s) => s.spaceType === 'meeting_room')
      .slice(0, 6)
      .map((s) => ({
        eventSpaceId: s.id,
        name: s.name,
        capacity: s.capacity,
        hasProjector: !!s.hasProjector,
        hasNaturalLight: !!s.hasNaturalLight,
        supportsFullDayRate: !!s.supportsFullDayRate,
        fullDayRateFrom: s.fullDayRate || 0,
        imageUrl: s.imageUrl || '',
        eventSpace: s
      }));

    const featuredEventSpaces = eventSpaces.slice(0, 6).map((s) => ({
      eventSpaceId: s.id,
      name: s.name,
      spaceType: s.spaceType,
      capacity: s.capacity,
      imageUrl: s.imageUrl || '',
      eventSpace: s
    }));

    return {
      hero: {
        headline: 'Meetings & Conferences',
        subheadline: 'Flexible spaces for productive gatherings.',
        backgroundImageUrl: ''
      },
      featuredMeetingRooms: featuredMeetingRooms,
      featuredEventSpaces: featuredEventSpaces
    };
  }

  getMeetingRoomFilterOptions() {
    return {
      capacityPresets: [
        { label: 'Up to 10', minCapacity: 1, maxCapacity: 10 },
        { label: '11-25', minCapacity: 11, maxCapacity: 25 },
        { label: '26-50', minCapacity: 26, maxCapacity: 50 },
        { label: '51-100', minCapacity: 51, maxCapacity: 100 }
      ],
      amenityOptions: {
        projectorLabel: 'Projector',
        naturalLightLabel: 'Natural Light'
      },
      rateTypeOptions: [
        { value: 'any', label: 'Any rate type' },
        { value: 'full_day_only', label: 'Full-day rate only' }
      ],
      sortOptions: [
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' }
      ]
    };
  }

  searchMeetingRooms(
    eventDate,
    startTime,
    endTime,
    minCapacity,
    requiresProjector,
    requiresNaturalLight,
    rateTypeFilter,
    sortBy
  ) {
    const eventSpaces = this._getFromStorage('event_spaces').filter((s) => s.isActive !== false);
    const rateFilter = rateTypeFilter || 'any';
    const results = [];

    eventSpaces.forEach((s) => {
      if (s.spaceType !== 'meeting_room') return;
      if (typeof minCapacity === 'number' && s.capacity < minCapacity) return;
      if (requiresProjector && !s.hasProjector) return;
      if (requiresNaturalLight && !s.hasNaturalLight) return;
      if (rateFilter === 'full_day_only' && !s.supportsFullDayRate) return;

      const rateInfo = this._calculateEventSpaceRateAmount(s, startTime, endTime, rateFilter === 'full_day_only' ? 'full_day' : null);

      results.push({
        eventSpaceId: s.id,
        name: s.name,
        spaceType: s.spaceType,
        capacity: s.capacity,
        hasProjector: !!s.hasProjector,
        hasNaturalLight: !!s.hasNaturalLight,
        supportsFullDayRate: !!s.supportsFullDayRate,
        fullDayRate: s.fullDayRate || 0,
        halfDayRate: s.halfDayRate || 0,
        hourlyRate: s.hourlyRate || 0,
        rateTypeUsed: rateInfo.rateTypeUsed,
        rateAmountForSelection: rateInfo.rateAmount,
        currency: 'USD',
        imageUrl: s.imageUrl || '',
        eventSpace: s
      });
    });

    const sort = sortBy || 'price_asc';
    results.sort((a, b) => {
      if (sort === 'price_desc') return (b.rateAmountForSelection || 0) - (a.rateAmountForSelection || 0);
      return (a.rateAmountForSelection || 0) - (b.rateAmountForSelection || 0);
    });

    // Instrumentation for task completion tracking - task_2
    try {
      localStorage.setItem(
        'task2_meetingRoomSearchParams',
        JSON.stringify({
          params: {
            eventDate,
            startTime,
            endTime,
            minCapacity,
            requiresProjector,
            requiresNaturalLight,
            rateTypeFilter: rateTypeFilter || 'any',
            sortBy: sortBy || 'price_asc'
          },
          results: results.map((r) => ({
            eventSpaceId: r.eventSpaceId,
            capacity: r.capacity,
            hasProjector: r.hasProjector,
            hasNaturalLight: r.hasNaturalLight,
            supportsFullDayRate: r.supportsFullDayRate,
            rateTypeUsed: r.rateTypeUsed,
            rateAmountForSelection: r.rateAmountForSelection
          }))
        })
      );
    } catch (e) {
      try {
        console.error('Instrumentation error (task2_meetingRoomSearchParams):', e);
      } catch (e2) {}
    }

    return results;
  }

  getEventSpaceFilterOptions() {
    return {
      spaceTypeOptions: [
        { value: 'main_hall', label: 'Main Halls' },
        { value: 'breakout_room', label: 'Breakout Rooms' },
        { value: 'ceremony_garden', label: 'Ceremony Gardens' },
        { value: 'reception_hall_indoor', label: 'Indoor Reception Halls' },
        { value: 'meeting_room', label: 'Meeting Rooms' },
        { value: 'multi_purpose', label: 'Multi-purpose Spaces' }
      ],
      capacityPresets: [
        { label: 'Up to 20', minCapacity: 1, maxCapacity: 20 },
        { label: '21-50', minCapacity: 21, maxCapacity: 50 },
        { label: '51-100', minCapacity: 51, maxCapacity: 100 },
        { label: '101-200', minCapacity: 101, maxCapacity: 200 }
      ],
      amenityOptions: {
        projectorLabel: 'Projector',
        naturalLightLabel: 'Natural Light'
      },
      sortOptions: [
        { value: 'rate_asc', label: 'Rate: Low to High' },
        { value: 'rate_desc', label: 'Rate: High to Low' },
        { value: 'capacity_desc', label: 'Capacity: High to Low' }
      ]
    };
  }

  searchEventSpacesForDate(
    eventDate,
    startTime,
    endTime,
    spaceTypes,
    minCapacity,
    maxCapacity,
    requiresProjector,
    requiresNaturalLight,
    supportsFullDayOnly,
    sortBy
  ) {
    const eventSpaces = this._getFromStorage('event_spaces').filter((s) => s.isActive !== false);
    const types = Array.isArray(spaceTypes) && spaceTypes.length ? spaceTypes : null;
    const results = [];

    eventSpaces.forEach((s) => {
      if (types && types.indexOf(s.spaceType) === -1) return;
      if (typeof minCapacity === 'number' && s.capacity < minCapacity) return;
      if (typeof maxCapacity === 'number' && s.capacity > maxCapacity) return;
      if (requiresProjector && !s.hasProjector) return;
      if (requiresNaturalLight && !s.hasNaturalLight) return;
      if (supportsFullDayOnly && !s.supportsFullDayRate) return;

      const rateInfo = this._calculateEventSpaceRateAmount(s, startTime, endTime, supportsFullDayOnly ? 'full_day' : null);

      results.push({
        eventSpaceId: s.id,
        name: s.name,
        spaceType: s.spaceType,
        capacity: s.capacity,
        hasProjector: !!s.hasProjector,
        hasNaturalLight: !!s.hasNaturalLight,
        isGarden: !!s.isGarden,
        isOutdoor: !!s.isOutdoor,
        isCeremonySpace: !!s.isCeremonySpace,
        isReceptionSpace: !!s.isReceptionSpace,
        supportsFullDayRate: !!s.supportsFullDayRate,
        fullDayRate: s.fullDayRate || 0,
        halfDayRate: s.halfDayRate || 0,
        hourlyRate: s.hourlyRate || 0,
        rateTypeUsed: rateInfo.rateTypeUsed,
        rateAmountForSelection: rateInfo.rateAmount,
        currency: 'USD',
        imageUrl: s.imageUrl || '',
        eventSpace: s
      });
    });

    const sort = sortBy || 'rate_asc';
    results.sort((a, b) => {
      if (sort === 'capacity_desc') return (b.capacity || 0) - (a.capacity || 0);
      if (sort === 'rate_desc') return (b.rateAmountForSelection || 0) - (a.rateAmountForSelection || 0);
      return (a.rateAmountForSelection || 0) - (b.rateAmountForSelection || 0);
    });

    return results;
  }

  createEventSpaceBookingAndAddToCart(eventSpaceId, eventDate, startTime, endTime, rateType) {
    const eventSpaces = this._getFromStorage('event_spaces');
    const space = eventSpaces.find((s) => s.id === eventSpaceId) || null;
    if (!space) {
      return { success: false, message: 'Event space not found', cartItemId: null, cartTotal: 0, currency: 'USD' };
    }

    const rateInfo = this._calculateEventSpaceRateAmount(space, startTime, endTime, rateType || null);

    const bookings = this._getFromStorage('event_space_bookings');
    const bookingDateIso = this._toISODate(eventDate);
    const startDateTime = bookingDateIso + 'T' + (startTime || '09:00');
    const endDateTime = bookingDateIso + 'T' + (endTime || '17:00');

    const booking = {
      id: this._generateId('event_space_booking'),
      eventSpaceId: eventSpaceId,
      bookingDate: bookingDateIso,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      rateType: rateInfo.rateTypeUsed,
      rateAmount: rateInfo.rateAmount,
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('event_space_bookings', bookings);

    const displayName = 'Event Space: ' + space.name;
    const cartResult = this._addBookingOrOrderToCart('event_space_booking', booking.id, displayName, 1, booking.rateAmount);

    return {
      success: true,
      message: 'Event space booking added to cart',
      cartItemId: cartResult.cartItemId,
      cartTotal: cartResult.cartTotal,
      currency: cartResult.currency
    };
  }

  // ------------------------------
  // Agenda planner
  // ------------------------------

  getAgendaForDate(date) {
    const agenda = this._getOrCreateAgendaForDate(date);
    const sessionsAll = this._getFromStorage('agenda_sessions');
    const eventSpaces = this._getFromStorage('event_spaces');

    const sessions = sessionsAll
      .filter((s) => s.agendaId === agenda.id)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((s) => {
        const space = eventSpaces.find((es) => es.id === s.eventSpaceId) || null;
        return {
          sessionId: s.id,
          title: s.title,
          startDateTime: s.startDateTime,
          endDateTime: s.endDateTime,
          eventSpaceId: s.eventSpaceId,
          eventSpaceName: space ? space.name : '',
          sortOrder: s.sortOrder,
          description: s.description || '',
          eventSpace: space
        };
      });

    return {
      agendaId: agenda.id,
      title: agenda.title || '',
      date: agenda.date,
      sessions: sessions
    };
  }

  getAgendaPlannerRoomOptions() {
    const eventSpaces = this._getFromStorage('event_spaces').filter((s) => s.isActive !== false);
    return eventSpaces
      .filter((s) => ['main_hall', 'breakout_room', 'meeting_room', 'multi_purpose'].indexOf(s.spaceType) !== -1)
      .map((s) => ({
        eventSpaceId: s.id,
        name: s.name,
        spaceType: s.spaceType,
        capacity: s.capacity,
        eventSpace: s
      }));
  }

  createOrUpdateAgenda(agendaId, date, title) {
    let agenda = null;
    const agendas = this._getFromStorage('agendas');

    if (agendaId) {
      agenda = agendas.find((a) => a.id === agendaId) || null;
    }

    if (!agenda) {
      agenda = this._getOrCreateAgendaForDate(date);
    }

    if (title != null) {
      agenda.title = title;
    }
    agenda.date = this._toISODate(date);
    agenda.updatedAt = new Date().toISOString();
    this._saveAgenda(agenda);

    return {
      agendaId: agenda.id,
      title: agenda.title || '',
      date: agenda.date
    };
  }

  addAgendaSession(agendaId, title, startDateTime, endDateTime, eventSpaceId, description) {
    const agendas = this._getFromStorage('agendas');
    const agenda = agendas.find((a) => a.id === agendaId) || null;
    if (!agenda) {
      return null;
    }

    const sessions = this._getFromStorage('agenda_sessions');

    const session = {
      id: this._generateId('agenda_session'),
      agendaId: agendaId,
      title: title,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      eventSpaceId: eventSpaceId,
      sortOrder: 0,
      description: description || '',
      createdAt: new Date().toISOString()
    };

    sessions.push(session);

    // recompute sortOrder based on start time
    const agendaSessions = sessions.filter((s) => s.agendaId === agendaId);
    agendaSessions
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
      .forEach((s, index) => {
        s.sortOrder = index;
      });

    this._saveToStorage('agenda_sessions', sessions);

    agenda.sessionIds = agenda.sessionIds || [];
    if (agenda.sessionIds.indexOf(session.id) === -1) {
      agenda.sessionIds.push(session.id);
    }
    agenda.updatedAt = new Date().toISOString();
    this._saveAgenda(agenda);

    return {
      sessionId: session.id,
      agendaId: agendaId,
      title: session.title,
      startDateTime: session.startDateTime,
      endDateTime: session.endDateTime,
      eventSpaceId: session.eventSpaceId,
      sortOrder: session.sortOrder
    };
  }

  updateAgendaSessionOrder(agendaId, sessionOrder) {
    const agenda = this._getFromStorage('agendas').find((a) => a.id === agendaId) || null;
    if (!agenda) {
      return { agendaId: null, sessionOrder: [] };
    }

    const sessions = this._getFromStorage('agenda_sessions');
    sessionOrder.forEach((sessionId, index) => {
      const s = sessions.find((sess) => sess.id === sessionId && sess.agendaId === agendaId);
      if (s) {
        s.sortOrder = index;
      }
    });

    this._saveToStorage('agenda_sessions', sessions);

    agenda.sessionIds = sessionOrder.slice();
    agenda.updatedAt = new Date().toISOString();
    this._saveAgenda(agenda);

    return {
      agendaId: agendaId,
      sessionOrder: sessionOrder
    };
  }

  saveAgenda(agendaId) {
    const agenda = this._getFromStorage('agendas').find((a) => a.id === agendaId) || null;
    if (!agenda) {
      return { success: false, message: 'Agenda not found' };
    }
    // Already persisted during modifications
    return { success: true, message: 'Agenda saved' };
  }

  // ------------------------------
  // Lodging
  // ------------------------------

  getLodgingFilterOptions() {
    const roomTypes = this._getFromStorage('lodging_room_types').filter((r) => r.isActive !== false);
    let minRate = null;
    let maxRate = null;
    roomTypes.forEach((r) => {
      const rate = r.baseNightlyRate || 0;
      if (minRate === null || rate < minRate) minRate = rate;
      if (maxRate === null || rate > maxRate) maxRate = rate;
    });

    return {
      priceFilter: {
        currency: 'USD',
        minAllowed: minRate !== null ? minRate : 0,
        maxAllowed: maxRate !== null ? maxRate : 0
      },
      sortOptions: [
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'rating_asc', label: 'Rating: Low to High' }
      ]
    };
  }

  searchLodgingRoomTypes(checkInDate, checkOutDate, maxNightlyRate, sortBy) {
    const roomTypes = this._getFromStorage('lodging_room_types').filter((r) => r.isActive !== false);
    const nights = this._calculateNights(checkInDate, checkOutDate) || 1;
    const results = [];

    roomTypes.forEach((r) => {
      const effectiveNightlyRate = r.baseNightlyRate || 0;
      if (typeof maxNightlyRate === 'number' && effectiveNightlyRate > maxNightlyRate) return;
      const total = effectiveNightlyRate * nights;
      results.push({
        roomTypeId: r.id,
        name: r.name,
        description: r.description || '',
        baseNightlyRate: r.baseNightlyRate || 0,
        effectiveNightlyRate: effectiveNightlyRate,
        totalPriceForStay: total,
        currency: 'USD',
        maxOccupancy: r.maxOccupancy,
        bedType: r.bedType || '',
        guestRating: r.guestRating,
        ratingCount: r.ratingCount,
        imageUrl: r.imageUrl || '',
        roomType: r
      });
    });

    const sort = sortBy || 'price_asc';
    results.sort((a, b) => {
      if (sort === 'price_desc') return (b.effectiveNightlyRate || 0) - (a.effectiveNightlyRate || 0);
      if (sort === 'rating_desc') return (b.guestRating || 0) - (a.guestRating || 0);
      if (sort === 'rating_asc') return (a.guestRating || 0) - (b.guestRating || 0);
      return (a.effectiveNightlyRate || 0) - (b.effectiveNightlyRate || 0);
    });

    // Instrumentation for task completion tracking - task_5 (lodging search)
    try {
      localStorage.setItem(
        'task5_lodgingSearchParams',
        JSON.stringify({
          params: {
            checkInDate,
            checkOutDate,
            maxNightlyRate,
            sortBy: sortBy || 'price_asc'
          },
          results: results.map((r) => ({
            roomTypeId: r.roomTypeId,
            effectiveNightlyRate: r.effectiveNightlyRate,
            guestRating: r.guestRating,
            totalPriceForStay: r.totalPriceForStay
          }))
        })
      );
    } catch (e) {
      try {
        console.error('Instrumentation error (task5_lodgingSearchParams):', e);
      } catch (e2) {}
    }

    return results;
  }

  getLodgingRoomTypeDetails(roomTypeId, checkInDate, checkOutDate) {
    const roomTypes = this._getFromStorage('lodging_room_types');
    const r = roomTypes.find((room) => room.id === roomTypeId) || null;

    // Instrumentation for task completion tracking - task_5 (room details viewed)
    try {
      let stored = localStorage.getItem('task5_roomDetailsViewed');
      let parsed;
      if (stored) {
        try {
          parsed = JSON.parse(stored);
        } catch (eParse) {
          parsed = null;
        }
      }
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.viewedRoomTypeIds)) {
        parsed = { viewedRoomTypeIds: [] };
      }
      const list = parsed.viewedRoomTypeIds;
      if (!list.length || list[list.length - 1] !== roomTypeId) {
        list.push(roomTypeId);
      }
      localStorage.setItem('task5_roomDetailsViewed', JSON.stringify(parsed));
    } catch (e) {
      try {
        console.error('Instrumentation error (task5_roomDetailsViewed):', e);
      } catch (e2) {}
    }

    if (!r) return null;

    const nights = this._calculateNights(checkInDate, checkOutDate) || 1;
    const effectiveNightlyRate = r.baseNightlyRate || 0;
    const total = effectiveNightlyRate * nights;

    return {
      roomTypeId: r.id,
      name: r.name,
      description: r.description || '',
      images: r.imageUrl ? [r.imageUrl] : [],
      bedType: r.bedType || '',
      maxOccupancy: r.maxOccupancy,
      guestRating: r.guestRating,
      ratingCount: r.ratingCount,
      baseNightlyRate: r.baseNightlyRate || 0,
      effectiveNightlyRate: effectiveNightlyRate,
      nights: nights,
      totalPriceForStay: total,
      currency: 'USD',
      hasSpaAccessIncluded: !!r.hasSpaAccessIncluded,
      roomType: r
    };
  }

  createRoomBookingAndAddToCart(roomTypeId, checkInDate, checkOutDate, numberOfRooms) {
    const roomTypes = this._getFromStorage('lodging_room_types');
    const r = roomTypes.find((room) => room.id === roomTypeId) || null;
    if (!r) {
      return { success: false, message: 'Room type not found', cartItemId: null, cartTotal: 0, currency: 'USD' };
    }

    const nights = this._calculateNights(checkInDate, checkOutDate) || 1;
    const nightlyRate = r.baseNightlyRate || 0;
    const total = nightlyRate * nights * (numberOfRooms || 1);

    const bookings = this._getFromStorage('room_bookings');
    const booking = {
      id: this._generateId('room_booking'),
      roomTypeId: roomTypeId,
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      nights: nights,
      numberOfRooms: numberOfRooms || 1,
      nightlyRate: nightlyRate,
      totalPrice: total,
      createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('room_bookings', bookings);

    const displayName = 'Room: ' + r.name;
    const cartResult = this._addBookingOrOrderToCart('room_booking', booking.id, displayName, 1, booking.totalPrice);

    return {
      success: true,
      message: 'Room booking added to cart',
      cartItemId: cartResult.cartItemId,
      cartTotal: cartResult.cartTotal,
      currency: cartResult.currency
    };
  }

  // ------------------------------
  // Dining & Catering
  // ------------------------------

  getDiningAndCateringOverviewContent() {
    const menuItems = this._getFromStorage('catering_menu_items').filter((m) => m.isActive !== false);
    const mealTypes = {};
    menuItems.forEach((m) => {
      if (!mealTypes[m.mealType]) {
        mealTypes[m.mealType] = true;
      }
    });

    const mealTypesDescription = Object.keys(mealTypes).map((mt) => ({
      mealType: mt,
      label: mt.charAt(0).toUpperCase() + mt.slice(1),
      description: ''
    }));

    return {
      hero: {
        headline: 'Dining & Catering',
        subheadline: 'Flexible menus for retreats, meetings, and celebrations.',
        backgroundImageUrl: ''
      },
      venueHighlights: [],
      mealTypesDescription: mealTypesDescription
    };
  }

  getCateringMenuSections() {
    const items = this._getFromStorage('catering_menu_items').filter((m) => m.isActive !== false);

    const mapItem = (m) => ({
      menuItemId: m.id,
      name: m.name,
      description: m.description || '',
      courseType: m.courseType,
      isVegetarian: !!m.isVegetarian,
      pricePerPerson: m.pricePerPerson || 0,
      menuItem: m
    });

    return {
      breakfastItems: items.filter((m) => m.mealType === 'breakfast').map(mapItem),
      lunchItems: items.filter((m) => m.mealType === 'lunch').map(mapItem),
      dinnerItems: items.filter((m) => m.mealType === 'dinner').map(mapItem),
      breakItems: items.filter((m) => m.mealType === 'break').map(mapItem),
      allDayItems: items.filter((m) => m.mealType === 'all_day').map(mapItem)
    };
  }

  createOrResetCateringOrder(guestCount) {
    const currentId = localStorage.getItem('currentCateringOrderId') || '';
    let orders = this._getFromStorage('catering_orders');
    let orderItems = this._getFromStorage('catering_order_items');

    if (currentId) {
      const existing = orders.find((o) => o.id === currentId);
      if (existing) {
        orderItems = orderItems.filter((oi) => oi.cateringOrderId !== currentId);
        orders = orders.filter((o) => o.id !== currentId);
        this._saveToStorage('catering_order_items', orderItems);
        this._saveToStorage('catering_orders', orders);
      }
    }

    const order = {
      id: this._generateId('catering_order'),
      guestCount: guestCount || 0,
      itemIds: [],
      notes: '',
      calculatedTotalCost: 0,
      calculatedPerPersonCost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.push(order);
    this._saveToStorage('catering_orders', orders);

    localStorage.setItem('currentCateringOrderId', order.id);

    return this._buildCateringOrderResponse(order);
  }

  addMenuItemToCurrentCateringOrder(menuItemId, quantity) {
    let order = this._getCurrentCateringOrder();
    if (!order) {
      order = this.createOrResetCateringOrder(1);
      // createOrResetCateringOrder returns response, not entity
      order = this._getCurrentCateringOrder();
    }

    const menuItems = this._getFromStorage('catering_menu_items');
    const menuItem = menuItems.find((m) => m.id === menuItemId) || null;
    if (!menuItem) {
      return this._buildCateringOrderResponse(order);
    }

    const orderItems = this._getFromStorage('catering_order_items');
    const orderItem = {
      id: this._generateId('catering_order_item'),
      cateringOrderId: order.id,
      menuItemId: menuItemId,
      quantity: quantity != null ? quantity : 1,
      pricePerPersonAtOrder: menuItem.pricePerPerson || 0
    };

    orderItems.push(orderItem);
    this._saveToStorage('catering_order_items', orderItems);

    order.updatedAt = new Date().toISOString();
    this._saveCateringOrder(order);

    return this._buildCateringOrderResponse(order);
  }

  updateCurrentCateringOrderItemQuantity(orderItemId, quantity) {
    const order = this._getCurrentCateringOrder();
    if (!order) {
      return {
        cateringOrderId: null,
        guestCount: 0,
        calculatedTotalCost: 0,
        calculatedPerPersonCost: 0,
        items: []
      };
    }

    let orderItems = this._getFromStorage('catering_order_items');
    const idx = orderItems.findIndex((oi) => oi.id === orderItemId && oi.cateringOrderId === order.id);

    if (idx !== -1) {
      if (quantity <= 0) {
        orderItems.splice(idx, 1);
      } else {
        orderItems[idx].quantity = quantity;
      }
      this._saveToStorage('catering_order_items', orderItems);
      order.updatedAt = new Date().toISOString();
      this._saveCateringOrder(order);
    }

    return this._buildCateringOrderResponse(order);
  }

  getCurrentCateringOrderSummary() {
    const order = this._getCurrentCateringOrder();
    return this._buildCateringOrderResponse(order);
  }

  finalizeCurrentCateringOrderAndAddToCart(notes) {
    const order = this._getCurrentCateringOrder();
    if (!order) {
      return { success: false, message: 'No catering order to finalize', cartItemId: null, cartTotal: 0, currency: 'USD' };
    }

    if (notes != null) {
      order.notes = notes;
    }
    this._recalculateCateringOrderTotals(order);

    const displayName = 'Catering for ' + (order.guestCount || 0) + ' guests';
    const cartResult = this._addBookingOrOrderToCart('catering_order', order.id, displayName, 1, order.calculatedTotalCost || 0);

    return {
      success: true,
      message: 'Catering order added to cart',
      cartItemId: cartResult.cartItemId,
      cartTotal: cartResult.cartTotal,
      currency: cartResult.currency
    };
  }

  // ------------------------------
  // Weddings
  // ------------------------------

  getWeddingsOverviewContent() {
    const eventSpaces = this._getFromStorage('event_spaces').filter((s) => s.isActive !== false);

    const featuredCeremonySpaces = eventSpaces
      .filter((s) => s.isCeremonySpace || s.spaceType === 'ceremony_garden' || s.isGarden)
      .slice(0, 6)
      .map((s) => ({
        eventSpaceId: s.id,
        name: s.name,
        isGarden: !!s.isGarden,
        capacity: s.capacity,
        imageUrl: s.imageUrl || '',
        eventSpace: s
      }));

    const featuredReceptionSpaces = eventSpaces
      .filter((s) => s.isReceptionSpace || s.spaceType === 'reception_hall_indoor')
      .slice(0, 6)
      .map((s) => ({
        eventSpaceId: s.id,
        name: s.name,
        spaceType: s.spaceType,
        capacity: s.capacity,
        imageUrl: s.imageUrl || '',
        eventSpace: s
      }));

    const serviceStyleSummaries = [
      {
        style: 'plated_dinner',
        label: 'Plated Dinner',
        description: 'Elegant multi-course plated service.'
      },
      {
        style: 'buffet',
        label: 'Buffet',
        description: 'Flexible buffet-style dining.'
      },
      {
        style: 'family_style',
        label: 'Family Style',
        description: 'Shared dishes served at each table.'
      },
      {
        style: 'cocktail_reception',
        label: 'Cocktail Reception',
        description: 'Passed hors d’oeuvres and reception stations.'
      }
    ];

    return {
      hero: {
        headline: 'Weddings',
        subheadline: 'Garden ceremonies and elegant receptions in one destination.',
        backgroundImageUrl: ''
      },
      featuredCeremonySpaces: featuredCeremonySpaces,
      featuredReceptionSpaces: featuredReceptionSpaces,
      serviceStyleSummaries: serviceStyleSummaries
    };
  }

  getWeddingQuoteFormOptions() {
    const eventSpaces = this._getFromStorage('event_spaces').filter((s) => s.isActive !== false);

    const ceremonySpaces = eventSpaces
      .filter((s) => s.isCeremonySpace || s.spaceType === 'ceremony_garden' || s.isGarden)
      .map((s) => ({
        eventSpaceId: s.id,
        name: s.name,
        isGarden: !!s.isGarden,
        capacity: s.capacity,
        eventSpace: s
      }));

    const receptionSpaces = eventSpaces
      .filter((s) => s.isReceptionSpace || s.spaceType === 'reception_hall_indoor')
      .map((s) => ({
        eventSpaceId: s.id,
        name: s.name,
        spaceType: s.spaceType,
        capacity: s.capacity,
        eventSpace: s
      }));

    const cateringServiceStyles = [
      { value: 'plated_dinner', label: 'Plated Dinner', description: 'Multi-course plated service.' },
      { value: 'buffet', label: 'Buffet', description: 'Buffet-style service.' },
      { value: 'family_style', label: 'Family Style', description: 'Shared dishes at the table.' },
      { value: 'cocktail_reception', label: 'Cocktail Reception', description: 'Passed hors d’oeuvres and stations.' }
    ];

    return {
      ceremonySpaces: ceremonySpaces,
      receptionSpaces: receptionSpaces,
      cateringServiceStyles: cateringServiceStyles
    };
  }

  submitWeddingQuoteRequest(
    weddingDate,
    estimatedGuestCount,
    ceremonySpaceId,
    receptionSpaceId,
    budgetTotal,
    cateringServiceStyle,
    contactName,
    contactPhone,
    contactEmail,
    additionalDetails
  ) {
    const requests = this._getFromStorage('wedding_quote_requests');

    const request = {
      id: this._generateId('wedding_quote'),
      weddingDate: this._toISODate(weddingDate),
      estimatedGuestCount: estimatedGuestCount || 0,
      ceremonySpaceId: ceremonySpaceId,
      receptionSpaceId: receptionSpaceId,
      budgetTotal: budgetTotal || 0,
      cateringServiceStyle: cateringServiceStyle,
      contactName: contactName,
      contactPhone: contactPhone,
      contactEmail: contactEmail,
      additionalDetails: additionalDetails || '',
      createdAt: new Date().toISOString()
    };

    requests.push(request);
    this._saveToStorage('wedding_quote_requests', requests);

    return {
      success: true,
      message: 'Wedding quote request submitted',
      weddingQuoteRequestId: request.id
    };
  }

  // ------------------------------
  // Gifts & Gift Certificates
  // ------------------------------

  getGiftsOverviewContent() {
    const templates = this._getFromStorage('gift_certificate_templates').filter((t) => t.isActive !== false);

    const featuredGiftTemplates = templates.slice(0, 6).map((t) => ({
      templateId: t.id,
      name: t.name,
      templateType: t.templateType,
      defaultAmount: t.defaultAmount || 0,
      imageUrl: t.imageUrl || '',
      template: t
    }));

    return {
      hero: {
        headline: 'Gifts & Packages',
        subheadline: 'Share stays, spa days, and retreats with others.',
        backgroundImageUrl: ''
      },
      featuredGiftTemplates: featuredGiftTemplates
    };
  }

  getGiftCertificateTemplates() {
    return this._getFromStorage('gift_certificate_templates').filter((t) => t.isActive !== false);
  }

  getGiftCertificateTemplateDetails(templateId) {
    const templates = this._getFromStorage('gift_certificate_templates');
    const t = templates.find((tpl) => tpl.id === templateId) || null;
    if (!t) return null;

    return {
      templateId: t.id,
      name: t.name,
      description: t.description || '',
      templateType: t.templateType,
      defaultAmount: t.defaultAmount || 0,
      allowsCustomAmount: !!t.allowsCustomAmount,
      includesSpaAccessOption: !!t.includesSpaAccessOption,
      imageUrl: t.imageUrl || ''
    };
  }

  createGiftCertificatePurchaseAndAddToCart(
    templateId,
    includeSpaAccess,
    amount,
    deliveryMethod,
    recipientName,
    recipientEmail,
    purchaserName,
    purchaserEmail,
    message
  ) {
    const templates = this._getFromStorage('gift_certificate_templates');
    const template = templates.find((t) => t.id === templateId) || null;
    if (!template) {
      return { success: false, message: 'Gift certificate template not found', cartItemId: null, cartTotal: 0, currency: 'USD' };
    }

    if (deliveryMethod === 'email_digital' && !recipientEmail) {
      return { success: false, message: 'Recipient email is required for digital delivery', cartItemId: null, cartTotal: 0, currency: 'USD' };
    }

    const purchases = this._getFromStorage('gift_certificate_purchases');
    const purchase = {
      id: this._generateId('gift_purchase'),
      templateId: templateId,
      includeSpaAccess: !!includeSpaAccess,
      amount: amount || 0,
      deliveryMethod: deliveryMethod,
      recipientName: recipientName,
      recipientEmail: recipientEmail || '',
      purchaserName: purchaserName,
      purchaserEmail: purchaserEmail,
      message: message || '',
      status: 'in_cart',
      createdAt: new Date().toISOString()
    };

    purchases.push(purchase);
    this._saveToStorage('gift_certificate_purchases', purchases);

    const displayName = 'Gift Certificate: ' + template.name;
    const cartResult = this._addBookingOrOrderToCart('gift_certificate_purchase', purchase.id, displayName, 1, purchase.amount || 0);

    return {
      success: true,
      message: 'Gift certificate added to cart',
      cartItemId: cartResult.cartItemId,
      cartTotal: cartResult.cartTotal,
      currency: cartResult.currency
    };
  }

  // ------------------------------
  // Cart & Checkout
  // ------------------------------

  _getUnderlyingEntityForCartItem(cartItem) {
    if (!cartItem) return null;
    const type = cartItem.itemType;
    const id = cartItem.referenceId;

    if (type === 'retreat_booking') {
      const bookings = this._getFromStorage('retreat_bookings');
      return bookings.find((b) => b.id === id) || null;
    }
    if (type === 'room_booking') {
      const bookings = this._getFromStorage('room_bookings');
      return bookings.find((b) => b.id === id) || null;
    }
    if (type === 'event_space_booking') {
      const bookings = this._getFromStorage('event_space_bookings');
      return bookings.find((b) => b.id === id) || null;
    }
    if (type === 'catering_order') {
      const orders = this._getFromStorage('catering_orders');
      return orders.find((o) => o.id === id) || null;
    }
    if (type === 'gift_certificate_purchase') {
      const purchases = this._getFromStorage('gift_certificate_purchases');
      return purchases.find((p) => p.id === id) || null;
    }
    return null;
  }

  _calculateCartSubtotal(cart) {
    if (!cart) return 0;
    const cartItems = this._getFromStorage('cart_items');
    return cartItems
      .filter((ci) => ci.cartId === cart.id)
      .reduce((sum, ci) => sum + (ci.totalPrice || 0), 0);
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const items = [];

    cartItems.forEach((ci) => {
      const underlying = this._getUnderlyingEntityForCartItem(ci);
      let dateInfo = '';
      let priceInfo = '';
      let totalPrice = ci.totalPrice || 0;

      if (ci.itemType === 'retreat_booking' && underlying) {
        dateInfo = (underlying.checkInDate || '') + ' to ' + (underlying.checkOutDate || '');
        priceInfo = 'Total: $' + underlying.totalPrice;
        if (!ci.totalPrice) totalPrice = underlying.totalPrice || 0;
      } else if (ci.itemType === 'room_booking' && underlying) {
        dateInfo = (underlying.checkInDate || '') + ' to ' + (underlying.checkOutDate || '');
        priceInfo = underlying.numberOfRooms + ' room(s), ' + (underlying.nights || 0) + ' night(s)';
        if (!ci.totalPrice) totalPrice = underlying.totalPrice || 0;
      } else if (ci.itemType === 'event_space_booking' && underlying) {
        dateInfo = underlying.bookingDate + ' ' + (underlying.startDateTime || '').split('T')[1] + '-' + (underlying.endDateTime || '').split('T')[1];
        priceInfo = 'Rate type: ' + underlying.rateType;
        if (!ci.totalPrice) totalPrice = underlying.rateAmount || 0;
      } else if (ci.itemType === 'catering_order' && underlying) {
        priceInfo = 'Catering for ' + (underlying.guestCount || 0) + ' guests';
        if (!ci.totalPrice) totalPrice = underlying.calculatedTotalCost || 0;
      } else if (ci.itemType === 'gift_certificate_purchase' && underlying) {
        priceInfo = 'Gift amount: $' + (underlying.amount || 0);
        if (!ci.totalPrice) totalPrice = underlying.amount || 0;
      }

      ci.totalPrice = totalPrice;

      items.push({
        cartItemId: ci.id,
        itemType: ci.itemType,
        displayName: ci.displayName || '',
        referenceId: ci.referenceId,
        quantity: ci.quantity || 1,
        dateInfo: dateInfo,
        priceInfo: priceInfo,
        totalPrice: totalPrice,
        reference: underlying
      });
    });

    // persist any updated line totals
    this._saveToStorage('cart_items', this._getFromStorage('cart_items'));

    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    return {
      cartId: cart.id,
      items: items,
      subtotal: subtotal,
      currency: 'USD',
      itemCount: items.length
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId && ci.cartId === cart.id) || null;

    if (item) {
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
      this._saveToStorage('cart_items', cartItems);

      cart.itemIds = (cart.itemIds || []).filter((id) => id !== cartItemId);
      cart.updatedAt = new Date().toISOString();
      this._updateCart(cart);
    }

    const updatedItems = cartItems.filter((ci) => ci.cartId === cart.id).map((ci) => ({
      cartItemId: ci.id,
      itemType: ci.itemType,
      displayName: ci.displayName || '',
      referenceId: ci.referenceId,
      quantity: ci.quantity || 1,
      totalPrice: ci.totalPrice || 0
    }));

    const subtotal = updatedItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

    return {
      cartId: cart.id,
      subtotal: subtotal,
      currency: 'USD',
      itemCount: updatedItems.length,
      items: updatedItems
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);

    if (idx === -1) {
      return this.removeCartItem('');
    }

    if (quantity <= 0) {
      return this.removeCartItem(cartItemId);
    }

    const ci = cartItems[idx];
    ci.quantity = quantity;

    // recompute line total from underlying entity
    const underlying = this._getUnderlyingEntityForCartItem(ci);
    let baseTotal = 0;
    if (ci.itemType === 'retreat_booking' && underlying) baseTotal = underlying.totalPrice || 0;
    else if (ci.itemType === 'room_booking' && underlying) baseTotal = underlying.totalPrice || 0;
    else if (ci.itemType === 'event_space_booking' && underlying) baseTotal = underlying.rateAmount || 0;
    else if (ci.itemType === 'catering_order' && underlying) baseTotal = underlying.calculatedTotalCost || 0;
    else if (ci.itemType === 'gift_certificate_purchase' && underlying) baseTotal = underlying.amount || 0;

    ci.totalPrice = baseTotal * quantity;

    cartItems[idx] = ci;
    this._saveToStorage('cart_items', cartItems);

    cart.updatedAt = new Date().toISOString();
    this._updateCart(cart);

    const updatedItems = cartItems.filter((item) => item.cartId === cart.id).map((item) => ({
      cartItemId: item.id,
      itemType: item.itemType,
      displayName: item.displayName || '',
      referenceId: item.referenceId,
      quantity: item.quantity || 1,
      totalPrice: item.totalPrice || 0
    }));

    const subtotal = updatedItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

    return {
      cartId: cart.id,
      subtotal: subtotal,
      currency: 'USD',
      itemCount: updatedItems.length,
      items: updatedItems
    };
  }

  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const items = cartItems.map((ci) => ({
      cartItemId: ci.id,
      itemType: ci.itemType,
      displayName: ci.displayName || '',
      referenceId: ci.referenceId,
      quantity: ci.quantity || 1,
      totalPrice: ci.totalPrice || 0
    }));

    const subtotal = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

    return {
      cartId: cart.id,
      items: items,
      subtotal: subtotal,
      currency: 'USD',
      total: subtotal,
      contactName: '',
      contactEmail: '',
      contactPhone: ''
    };
  }

  placeOrder(contactName, contactEmail, contactPhone) {
    const cartId = localStorage.getItem('currentCartId') || '';
    if (!cartId) {
      return { success: false, orderId: null, status: 'pending', message: 'No cart to place order from' };
    }

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || null;
    if (!cart) {
      return { success: false, orderId: null, status: 'pending', message: 'Cart not found' };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    if (!cartItems.length) {
      return { success: false, orderId: null, status: 'pending', message: 'Cart is empty' };
    }

    const subtotal = cartItems.reduce((sum, ci) => sum + (ci.totalPrice || 0), 0);

    const orders = this._getFromStorage('orders');
    const order = {
      id: this._generateId('order'),
      cartId: cart.id,
      orderDate: new Date().toISOString(),
      status: 'pending',
      contactName: contactName,
      contactEmail: contactEmail,
      contactPhone: contactPhone || '',
      subtotal: subtotal,
      total: subtotal
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // update gift certificate purchase statuses
    const purchases = this._getFromStorage('gift_certificate_purchases');
    let purchasesChanged = false;
    cartItems.forEach((ci) => {
      if (ci.itemType === 'gift_certificate_purchase') {
        const p = purchases.find((x) => x.id === ci.referenceId);
        if (p && p.status !== 'purchased') {
          p.status = 'purchased';
          purchasesChanged = true;
        }
      }
    });
    if (purchasesChanged) {
      this._saveToStorage('gift_certificate_purchases', purchases);
    }

    // Optionally, clear current cart reference for a fresh start
    localStorage.setItem('currentCartId', '');

    return {
      success: true,
      orderId: order.id,
      status: order.status,
      message: 'Order placed'
    };
  }

  // ------------------------------
  // Static content pages
  // ------------------------------

  getAboutPageContent() {
    return {
      missionHtml: '',
      locationDescription: '',
      features: []
    };
  }

  getContactInfo() {
    return {
      phone: '',
      email: '',
      address: '',
      mapEmbedCode: '',
      hours: ''
    };
  }

  getFAQList() {
    return [];
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