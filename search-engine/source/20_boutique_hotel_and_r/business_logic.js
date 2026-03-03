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
      'rooms',
      'rate_plans',
      'offers',
      'offer_rooms',
      'bookings',
      'restaurant_reservations',
      'restaurant_time_slots',
      'menu_items',
      'dinner_plans',
      'dinner_plan_items',
      'gift_card_types',
      'carts',
      'cart_items',
      'meeting_amenities',
      'meeting_event_inquiries',
      'newsletter_subscriptions',
      'room_comparisons'
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

  // ---------------------- Generic helpers ----------------------

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _formatDateOnly(date) {
    // Returns YYYY-MM-DD
    return date.toISOString().split('T')[0];
  }

  _toTitleFromCode(code) {
    if (!code) return '';
    return code
      .split('_')
      .map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); })
      .join(' ');
  }

  _getViewLabel(viewType) {
    const map = {
      garden_view: 'Garden view',
      city_view: 'City view',
      courtyard_view: 'Courtyard view',
      ocean_view: 'Ocean view',
      pool_view: 'Pool view',
      street_view: 'Street view',
      no_view: 'No view'
    };
    return map[viewType] || this._toTitleFromCode(viewType);
  }

  _getBedLabel(bedType) {
    const map = {
      king: 'King bed',
      queen: 'Queen bed',
      double: 'Double bed',
      twin: 'Twin beds',
      single: 'Single bed',
      sofa_bed: 'Sofa bed',
      king_plus_sofa_bed: 'King bed + sofa bed'
    };
    return map[bedType] || this._toTitleFromCode(bedType);
  }

  _getBedSizeRank(bedType) {
    // Higher is larger/more preferred
    const ranks = {
      king_plus_sofa_bed: 6,
      king: 5,
      queen: 4,
      double: 3,
      twin: 2,
      single: 1,
      sofa_bed: 0
    };
    return typeof ranks[bedType] === 'number' ? ranks[bedType] : -1;
  }

  _formatCurrency(amount, currency) {
    if (typeof amount !== 'number') return '';
    const symbolMap = {
      usd: '$',
      eur: '€',
      gbp: '£'
    };
    const symbol = symbolMap[currency] || '';
    return symbol + amount.toFixed(2);
  }

  // Attach room, ratePlan, offer objects to a booking
  _attachBookingForeignObjects(booking) {
    if (!booking) return null;
    const rooms = this._getFromStorage('rooms');
    const ratePlans = this._getFromStorage('rate_plans');
    const offers = this._getFromStorage('offers');
    const room = rooms.find(function (r) { return r.id === booking.roomId; }) || null;
    const ratePlan = ratePlans.find(function (rp) { return rp.id === booking.ratePlanId; }) || null;
    const offer = booking.offerId
      ? (offers.find(function (o) { return o.id === booking.offerId; }) || null)
      : null;
    return Object.assign({}, booking, {
      room: room,
      ratePlan: ratePlan,
      offer: offer
    });
  }

  _attachCartItemForeignObjects(cartItem) {
    if (!cartItem) return null;
    const giftCardTypes = this._getFromStorage('gift_card_types');
    const bookings = this._getFromStorage('bookings');
    const giftCardType = cartItem.giftCardTypeId
      ? (giftCardTypes.find(function (g) { return g.id === cartItem.giftCardTypeId; }) || null)
      : null;
    const booking = cartItem.bookingId
      ? (bookings.find(function (b) { return b.id === cartItem.bookingId; }) || null)
      : null;
    return Object.assign({}, cartItem, {
      giftCardType: giftCardType,
      booking: booking ? this._attachBookingForeignObjects(booking) : null
    });
  }

  _attachMenuItemToDinnerPlanItem(planItem) {
    if (!planItem) return null;
    const menuItems = this._getFromStorage('menu_items');
    const menuItem = menuItems.find(function (m) { return m.id === planItem.menuItemId; }) || null;
    return Object.assign({}, planItem, { menuItem: menuItem });
  }

  _attachTimeSlotToReservation(reservation) {
    if (!reservation) return null;
    const slots = this._getFromStorage('restaurant_time_slots');
    const slot = reservation.timeSlotId
      ? (slots.find(function (s) { return s.id === reservation.timeSlotId; }) || null)
      : null;
    return Object.assign({}, reservation, { timeSlot: slot });
  }

  // ---------------------- Required internal helpers ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentCartId) {
      cart = carts.find(function (c) { return c.id === currentCartId; }) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _getOrCreateDinnerPlan() {
    let plans = this._getFromStorage('dinner_plans');
    let currentPlanId = localStorage.getItem('current_dinner_plan_id');
    let plan = null;

    if (currentPlanId) {
      plan = plans.find(function (p) { return p.id === currentPlanId; }) || null;
    }

    if (!plan) {
      plan = {
        id: this._generateId('dinner_plan'),
        name: null,
        totalPrice: 0,
        createdAt: new Date().toISOString(),
        notes: null
      };
      plans.push(plan);
      this._saveToStorage('dinner_plans', plans);
      localStorage.setItem('current_dinner_plan_id', plan.id);
    }

    return plan;
  }

  _getOrCreateRoomComparison() {
    let comparisons = this._getFromStorage('room_comparisons');
    let currentId = localStorage.getItem('current_room_comparison_id');
    let comparison = null;

    if (currentId) {
      comparison = comparisons.find(function (c) { return c.id === currentId; }) || null;
    }

    if (!comparison) {
      comparison = {
        id: this._generateId('room_cmp'),
        roomIds: [],
        createdAt: new Date().toISOString()
      };
      comparisons.push(comparison);
      this._saveToStorage('room_comparisons', comparisons);
      localStorage.setItem('current_room_comparison_id', comparison.id);
    }

    return comparison;
  }

  _calculateStayNightsAndPriceBreakdown(checkInDate, checkOutDate, nightlyPrice) {
    const start = this._parseDate(checkInDate);
    const end = this._parseDate(checkOutDate);
    if (!start || !end) {
      return { nights: 0, breakdown: [] };
    }
    const msPerNight = 24 * 60 * 60 * 1000;
    let nights = Math.round((end - start) / msPerNight);
    if (nights < 0) nights = 0;
    const breakdown = [];
    for (let i = 0; i < nights; i++) {
      const d = new Date(start.getTime() + i * msPerNight);
      breakdown.push({
        date: this._formatDateOnly(d),
        price: nightlyPrice
      });
    }
    return { nights: nights, breakdown: breakdown };
  }

  _findCheapestRatePlanForRoomAndDates(roomId, checkInDate, checkOutDate, requireBreakfast) {
    const ratePlans = this._getFromStorage('rate_plans');
    const start = this._parseDate(checkInDate);
    const end = this._parseDate(checkOutDate);
    const msPerNight = 24 * 60 * 60 * 1000;
    let nights = 0;
    if (start && end) {
      nights = Math.round((end - start) / msPerNight);
      if (nights <= 0) nights = 1;
    } else {
      nights = 1;
    }

    let cheapest = null;

    for (let i = 0; i < ratePlans.length; i++) {
      const rp = ratePlans[i];
      if (!rp.isActive) continue;
      if (rp.roomId !== roomId) continue;
      if (requireBreakfast && !rp.includesBreakfast) continue;

      // Date availability window
      if (rp.availableStartDate) {
        const availableStart = this._parseDate(rp.availableStartDate);
        if (availableStart && start && start < availableStart) continue;
      }
      if (rp.availableEndDate) {
        const availableEnd = this._parseDate(rp.availableEndDate);
        if (availableEnd && end && end > availableEnd) continue;
      }

      // Min/max stay (0 or negative means no constraint)
      if (typeof rp.minStayNights === 'number' && rp.minStayNights > 0 && nights < rp.minStayNights) continue;
      if (typeof rp.maxStayNights === 'number' && rp.maxStayNights > 0 && nights > rp.maxStayNights) continue;

      const totalPrice = rp.nightlyPrice * nights;
      if (!cheapest || totalPrice < cheapest.totalPrice) {
        cheapest = {
          ratePlan: rp,
          totalPrice: totalPrice,
          nights: nights
        };
      }
    }

    return cheapest;
  }

  _getEarliestAvailableTimeSlot(reservationDate, partySize, seatingArea, fromTime, toTime) {
    const slots = this.getRestaurantAvailableTimeSlots(
      reservationDate,
      partySize,
      seatingArea,
      fromTime,
      toTime
    );
    if (!slots || slots.length === 0) return null;
    const sorted = slots.slice().sort(function (a, b) {
      if (a.reservationTime < b.reservationTime) return -1;
      if (a.reservationTime > b.reservationTime) return 1;
      return 0;
    });
    return sorted[0];
  }

  // ---------------------- Home & static content ----------------------

  getHomeOverview() {
    const rooms = this._getFromStorage('rooms');
    const roomsCount = rooms.length;

    return {
      introText: 'Welcome to our boutique hotel and restaurant.',
      heroImageUrl: '',
      locationSummary: 'Situated in the heart of the city, steps from local culture and dining.',
      highlightCounts: {
        roomsCount: roomsCount,
        restaurantName: 'Hotel Restaurant',
        spaName: 'Hotel Spa',
        meetingRoomsCount: 0
      }
    };
  }

  getHomeFeaturedRooms(limit) {
    const max = typeof limit === 'number' ? limit : 3;
    const rooms = this._getFromStorage('rooms').filter(function (r) { return r.isActive; });

    // Sort by guestRating desc, then basePricePerNight asc
    rooms.sort(function (a, b) {
      const ra = typeof a.guestRating === 'number' ? a.guestRating : 0;
      const rb = typeof b.guestRating === 'number' ? b.guestRating : 0;
      if (rb !== ra) return rb - ra;
      return a.basePricePerNight - b.basePricePerNight;
    });

    const featured = rooms.slice(0, max).map(function (room) {
      const currency = room.currency || 'usd';
      return {
        room: room,
        highlightTagline: 'Comfortable ' + (room.bedType ? this._getBedLabel(room.bedType) : 'stay'),
        startingFromPrice: room.basePricePerNight,
        startingFromPriceFormatted: this._formatCurrency(room.basePricePerNight, currency),
        currency: currency
      };
    }, this);

    return featured;
  }

  getHomeFeaturedOffers(types, limit) {
    const max = typeof limit === 'number' ? limit : 3;
    let offers = this._getFromStorage('offers').filter(function (o) { return o.isActive; });

    if (Array.isArray(types) && types.length > 0) {
      offers = offers.filter(function (o) { return types.indexOf(o.type) !== -1; });
    }

    offers.sort(function (a, b) {
      const ra = typeof a.guestRating === 'number' ? a.guestRating : 0;
      const rb = typeof b.guestRating === 'number' ? b.guestRating : 0;
      if (rb !== ra) return rb - ra;
      return a.nightlyRate - b.nightlyRate;
    });

    const featured = offers.slice(0, max).map(function (offer) {
      let ribbonLabel = '';
      if (offer.type === 'spa_package') ribbonLabel = 'Spa package';
      else if (offer.type === 'room_offer') ribbonLabel = 'Room offer';
      else if (offer.type === 'dining_package') ribbonLabel = 'Dining package';
      else ribbonLabel = 'Special offer';

      const highlightParts = [];
      if (offer.includesSpaAccess) highlightParts.push('Spa access included');
      if (offer.includesLateCheckout) highlightParts.push('Late checkout');
      const highlightText = highlightParts.join(' • ');

      return {
        offer: offer,
        ribbonLabel: ribbonLabel,
        highlightText: highlightText
      };
    });

    return featured;
  }

  getNewsletterTeaserContent() {
    return {
      headline: 'Stay updated with room offers & restaurant events',
      subcopy: 'Subscribe to our newsletter for curated hotel, restaurant, and spa highlights.',
      imageUrl: ''
    };
  }

  getAboutHotelContent() {
    return {
      historyText: 'Our boutique hotel blends historic architecture with contemporary design.',
      designConcept: 'Warm, residential-style interiors with local art and thoughtful details.',
      locationSummary: 'Conveniently located near downtown, museums, and waterfront promenades.',
      neighborhoodHighlights: [
        'Independent galleries and boutiques',
        'Cafés and wine bars within a short walk',
        'Easy access to public transport'
      ],
      directionsText: 'We are easily reached by taxi, rideshare, and public transit from the central station.',
      contactEmail: 'info@example-hotel.com',
      contactPhone: '+1 000 000 0000'
    };
  }

  getPrivacyPolicyContent() {
    return {
      lastUpdated: this._formatDateOnly(new Date()),
      sections: [
        {
          title: 'Data use',
          bodyHtml: '<p>We use your data to manage reservations, improve our services, and communicate offers you opt into.</p>'
        },
        {
          title: 'Cookies',
          bodyHtml: '<p>We use cookies for essential site functionality and analytics.</p>'
        },
        {
          title: 'Your rights',
          bodyHtml: '<p>You may request access, correction, or deletion of your personal data at any time.</p>'
        }
      ]
    };
  }

  getTermsAndConditionsContent(context) {
    const baseSections = [
      {
        title: 'General terms',
        bodyHtml: '<p>Use of this site and our services is subject to these terms and applicable law.</p>'
      }
    ];

    if (context === 'rooms') {
      baseSections.push({
        title: 'Room bookings',
        bodyHtml: '<p>Room reservations may be subject to specific cancellation and payment policies shown during booking.</p>'
      });
    } else if (context === 'restaurant') {
      baseSections.push({
        title: 'Restaurant reservations',
        bodyHtml: '<p>Restaurant reservations may require confirmation and may be subject to time limits.</p>'
      });
    } else if (context === 'gift_cards') {
      baseSections.push({
        title: 'Gift cards',
        bodyHtml: '<p>Gift cards are non-refundable and subject to expiry rules as stated on the card.</p>'
      });
    }

    return {
      lastUpdated: this._formatDateOnly(new Date()),
      sections: baseSections
    };
  }

  // ---------------------- Room search & booking ----------------------

  getRoomSearchFilterOptions() {
    const rooms = this._getFromStorage('rooms').filter(function (r) { return r.isActive; });

    const viewTypeMap = {};
    const amenityMap = {};
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (r.viewType && !viewTypeMap[r.viewType]) {
        viewTypeMap[r.viewType] = this._getViewLabel(r.viewType);
      }
      if (Array.isArray(r.amenities)) {
        for (let j = 0; j < r.amenities.length; j++) {
          const code = r.amenities[j];
          if (!amenityMap[code]) {
            amenityMap[code] = this._toTitleFromCode(code);
          }
        }
      }
      if (typeof r.basePricePerNight === 'number') {
        if (minPrice === null || r.basePricePerNight < minPrice) minPrice = r.basePricePerNight;
        if (maxPrice === null || r.basePricePerNight > maxPrice) maxPrice = r.basePricePerNight;
      }
    }

    // Ensure breakfast_included amenity exists as an option if any rate plan has includesBreakfast
    const ratePlans = this._getFromStorage('rate_plans');
    const hasBreakfastRate = ratePlans.some(function (rp) { return rp.includesBreakfast; });
    if (hasBreakfastRate && !amenityMap['breakfast_included']) {
      amenityMap['breakfast_included'] = 'Breakfast included';
    }

    const viewTypes = Object.keys(viewTypeMap).map(function (code) {
      return { code: code, label: viewTypeMap[code] };
    });

    const amenityOptions = Object.keys(amenityMap).map(function (code) {
      return { code: code, label: amenityMap[code] };
    });

    const today = new Date();
    const defaultCheckIn = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const defaultCheckOut = new Date(defaultCheckIn.getTime() + 2 * 24 * 60 * 60 * 1000);

    return {
      viewTypes: viewTypes,
      amenityOptions: amenityOptions,
      priceRange: {
        min: minPrice === null ? 0 : minPrice,
        max: maxPrice === null ? 0 : maxPrice,
        suggestedMax: maxPrice === null ? 0 : maxPrice
      },
      sortOptions: [
        { value: 'recommended', label: 'Recommended' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'guest_rating_desc', label: 'Guest rating: High to Low' }
      ],
      defaultCheckInDate: this._formatDateOnly(defaultCheckIn),
      defaultCheckOutDate: this._formatDateOnly(defaultCheckOut),
      defaultAdults: 2,
      defaultChildren: 0
    };
  }

  searchAvailableRooms(checkInDate, checkOutDate, adults, children, filters, sortBy) {
    const rooms = this._getFromStorage('rooms').filter(function (r) { return r.isActive; });
    const filtersObj = filters || {};
    const amenitiesFilter = Array.isArray(filtersObj.amenities) ? filtersObj.amenities : [];
    const requireBreakfast = amenitiesFilter.indexOf('breakfast_included') !== -1;

    const results = [];

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];

      // Occupancy check
      if (typeof room.maxOccupancyAdults === 'number' && adults > room.maxOccupancyAdults) {
        continue;
      }

      // View type filter
      if (filtersObj.viewType && room.viewType !== filtersObj.viewType) {
        continue;
      }

      // Amenity filters (other than breakfast, which is rate-plan-based)
      const roomAmenities = Array.isArray(room.amenities) ? room.amenities : [];
      let amenityMismatch = false;
      for (let j = 0; j < amenitiesFilter.length; j++) {
        const code = amenitiesFilter[j];
        if (code === 'breakfast_included') {
          continue;
        }
        if (roomAmenities.indexOf(code) === -1) {
          amenityMismatch = true;
          break;
        }
      }
      if (amenityMismatch) continue;

      // Find cheapest suitable rate plan for this room
      const cheapest = this._findCheapestRatePlanForRoomAndDates(
        room.id,
        checkInDate,
        checkOutDate,
        requireBreakfast
      );

      if (!cheapest) continue;

      const ratePlan = cheapest.ratePlan;
      const totalPrice = cheapest.totalPrice;
      const nightsInfo = this._calculateStayNightsAndPriceBreakdown(
        checkInDate,
        checkOutDate,
        ratePlan.nightlyPrice
      );
      const nights = nightsInfo.nights || cheapest.nights;
      const avgNight = nights > 0 ? totalPrice / nights : totalPrice;

      // Price range filter
      if (typeof filtersObj.minPricePerNight === 'number' && avgNight < filtersObj.minPricePerNight) {
        continue;
      }
      if (typeof filtersObj.maxPricePerNight === 'number' && avgNight > filtersObj.maxPricePerNight) {
        continue;
      }

      const currency = ratePlan.currency || room.currency || 'usd';
      const item = {
        room: room,
        cheapestRatePlan: Object.assign({}, ratePlan, { room: room }),
        totalPrice: totalPrice,
        averageNightlyPrice: avgNight,
        currency: currency,
        nightlyPriceBreakdown: nightsInfo.breakdown,
        viewLabel: this._getViewLabel(room.viewType),
        bedLabel: this._getBedLabel(room.bedType),
        amenityLabels: roomAmenities.map(function (code) {
          return code === 'wifi' ? 'Wi-Fi' : this._toTitleFromCode(code);
        }, this)
      };

      results.push(item);
    }

    // Sorting
    const sort = sortBy || 'recommended';
    results.sort(function (a, b) {
      if (sort === 'price_asc') {
        return a.averageNightlyPrice - b.averageNightlyPrice;
      }
      if (sort === 'price_desc') {
        return b.averageNightlyPrice - a.averageNightlyPrice;
      }
      if (sort === 'guest_rating_desc') {
        const ra = typeof a.room.guestRating === 'number' ? a.room.guestRating : 0;
        const rb = typeof b.room.guestRating === 'number' ? b.room.guestRating : 0;
        if (rb !== ra) return rb - ra;
        return a.averageNightlyPrice - b.averageNightlyPrice;
      }
      // recommended: sort by guest rating then price
      const ra = typeof a.room.guestRating === 'number' ? a.room.guestRating : 0;
      const rb = typeof b.room.guestRating === 'number' ? b.room.guestRating : 0;
      if (rb !== ra) return rb - ra;
      return a.averageNightlyPrice - b.averageNightlyPrice;
    });

    // Instrumentation for task completion tracking
    try {
      const normalizedChildren = typeof children === 'number' ? children : 0;

      // Task 1 instrumentation
      if (
        checkInDate === '2026-06-12' &&
        checkOutDate === '2026-06-14' &&
        adults === 2 &&
        normalizedChildren === 0 &&
        filtersObj &&
        filtersObj.viewType === 'garden_view' &&
        Array.isArray(filtersObj.amenities) &&
        filtersObj.amenities.indexOf('breakfast_included') !== -1 &&
        sortBy === 'price_asc'
      ) {
        localStorage.setItem(
          'task1_roomSearchParams',
          JSON.stringify({
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            adults: adults,
            children: normalizedChildren,
            filters: filtersObj,
            sortBy: sort
          })
        );

        if (results && results.length > 0) {
          localStorage.setItem(
            'task1_cheapestGardenBreakfastOption',
            JSON.stringify({
              roomId: results[0].room.id,
              ratePlanId: results[0].cheapestRatePlan.id,
              totalPrice: results[0].totalPrice,
              averageNightlyPrice: results[0].averageNightlyPrice,
              currency: results[0].currency
            })
          );
        }
      }

      // Task 7 instrumentation
      const hasMaxPrice =
        filtersObj &&
        typeof filtersObj.maxPricePerNight === 'number' &&
        filtersObj.maxPricePerNight <= 250;

      if (adults === 1 && normalizedChildren === 0 && hasMaxPrice) {
        const start = this._parseDate(checkInDate);
        const end = this._parseDate(checkOutDate);
        if (start && end) {
          const msPerNight = 24 * 60 * 60 * 1000;
          let nights = Math.round((end - start) / msPerNight);
          if (nights === 3) {
            localStorage.setItem(
              'task7_roomSearchParams',
              JSON.stringify({
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                adults: adults,
                children: normalizedChildren,
                filters: filtersObj,
                sortBy: sort
              })
            );
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  getRoomDetails(roomId) {
    const rooms = this._getFromStorage('rooms');
    const room = rooms.find(function (r) { return r.id === roomId; }) || null;
    if (!room) {
      return {
        room: null,
        viewLabel: '',
        bedLabel: '',
        amenitySections: [],
        imageGallery: [],
        policies: {
          checkInTime: '',
          checkOutTime: '',
          cancellationPolicy: '',
          occupancyPolicy: ''
        }
      };
    }

    const amenityLabels = (Array.isArray(room.amenities) ? room.amenities : []).map(function (code) {
      return code === 'wifi' ? 'Wi-Fi' : this._toTitleFromCode(code);
    }, this);

    const imageGallery = (Array.isArray(room.images) ? room.images : []).map(function (url, index) {
      return {
        url: url,
        altText: room.name + ' photo ' + (index + 1)
      };
    });

    return {
      room: room,
      viewLabel: this._getViewLabel(room.viewType),
      bedLabel: this._getBedLabel(room.bedType),
      amenitySections: [
        {
          title: 'Room amenities',
          amenities: amenityLabels
        }
      ],
      imageGallery: imageGallery,
      policies: {
        checkInTime: '15:00',
        checkOutTime: '12:00',
        cancellationPolicy: 'Cancellation policy varies by rate plan and will be shown during booking.',
        occupancyPolicy: 'Maximum occupancy and additional guest policies apply as listed for each room type.'
      }
    };
  }

  getRoomRates(roomId, checkInDate, checkOutDate, adults, children) {
    const rooms = this._getFromStorage('rooms');
    const room = rooms.find(function (r) { return r.id === roomId; }) || null;
    if (!room) return [];

    const ratePlans = this._getFromStorage('rate_plans').filter(function (rp) {
      return rp.isActive && rp.roomId === roomId;
    });

    const results = [];

    for (let i = 0; i < ratePlans.length; i++) {
      const rp = ratePlans[i];
      const nightlyPrice = rp.nightlyPrice;
      const calc = this._calculateStayNightsAndPriceBreakdown(checkInDate, checkOutDate, nightlyPrice);
      const nights = calc.nights;
      const totalPrice = nightlyPrice * (nights || 1);
      const avgNight = nights > 0 ? totalPrice / nights : totalPrice;
      const currency = rp.currency || room.currency || 'usd';

      const inclusionLabels = [];
      if (rp.includesBreakfast) inclusionLabels.push('Breakfast included');
      if (rp.includesSpaAccess) inclusionLabels.push('Spa access');
      if (rp.includesLateCheckout) inclusionLabels.push('Late checkout');
      if (typeof rp.refundable === 'boolean') {
        inclusionLabels.push(rp.refundable ? 'Refundable' : 'Non-refundable');
      }

      const ratePlanWithRoom = Object.assign({}, rp, { room: room });

      results.push({
        ratePlan: ratePlanWithRoom,
        totalPrice: totalPrice,
        averageNightlyPrice: avgNight,
        currency: currency,
        nightlyPriceBreakdown: calc.breakdown,
        inclusionLabels: inclusionLabels
      });
    }

    return results;
  }

  startRoomBooking(roomId, ratePlanId, checkInDate, checkOutDate, adults, children) {
    const rooms = this._getFromStorage('rooms');
    const ratePlans = this._getFromStorage('rate_plans');
    const bookings = this._getFromStorage('bookings');

    const room = rooms.find(function (r) { return r.id === roomId; }) || null;
    const ratePlan = ratePlans.find(function (rp) { return rp.id === ratePlanId; }) || null;

    if (!room || !ratePlan || ratePlan.roomId !== roomId) {
      return {
        booking: null,
        summary: null,
        message: 'Invalid room or rate plan selection.'
      };
    }

    const nightlyPrice = ratePlan.nightlyPrice;
    const calc = this._calculateStayNightsAndPriceBreakdown(checkInDate, checkOutDate, nightlyPrice);
    const nights = calc.nights || 1;
    const totalPrice = nightlyPrice * nights;
    const currency = ratePlan.currency || room.currency || 'usd';

    const booking = {
      id: this._generateId('booking'),
      roomId: room.id,
      ratePlanId: ratePlan.id,
      offerId: null,
      checkInDate: this._parseDate(checkInDate) ? this._parseDate(checkInDate).toISOString() : new Date().toISOString(),
      checkOutDate: this._parseDate(checkOutDate) ? this._parseDate(checkOutDate).toISOString() : new Date().toISOString(),
      nights: nights,
      adults: adults,
      children: typeof children === 'number' ? children : 0,
      totalPrice: totalPrice,
      currency: currency,
      status: 'initiated',
      guestFirstName: '',
      guestLastName: '',
      guestEmail: '',
      guestPhone: '',
      arrivalTime: null,
      specialRequests: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      source: 'rooms'
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const enrichedBooking = this._attachBookingForeignObjects(booking);

    return {
      booking: enrichedBooking,
      summary: {
        roomName: room.name,
        ratePlanName: ratePlan.name,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        nights: nights,
        adults: adults,
        children: typeof children === 'number' ? children : 0,
        totalPrice: totalPrice,
        currency: currency
      },
      message: 'Booking initiated.'
    };
  }

  // ---------------------- Room comparison ----------------------

  addRoomToComparison(roomId) {
    const comparison = this._getOrCreateRoomComparison();
    const maxRooms = 3;
    let maxRoomsReached = false;

    if (comparison.roomIds.indexOf(roomId) === -1) {
      if (comparison.roomIds.length >= maxRooms) {
        maxRoomsReached = true;
      } else {
        comparison.roomIds.push(roomId);
      }
    }

    let comparisons = this._getFromStorage('room_comparisons');
    comparisons = comparisons.map(function (c) {
      return c.id === comparison.id ? comparison : c;
    });
    this._saveToStorage('room_comparisons', comparisons);

    return {
      comparison: comparison,
      maxRoomsReached: maxRoomsReached,
      message: maxRoomsReached
        ? 'Maximum number of rooms in comparison reached.'
        : 'Room added to comparison.'
    };
  }

  removeRoomFromComparison(roomId) {
    const comparison = this._getOrCreateRoomComparison();
    const idx = comparison.roomIds.indexOf(roomId);
    if (idx !== -1) {
      comparison.roomIds.splice(idx, 1);
    }

    let comparisons = this._getFromStorage('room_comparisons');
    comparisons = comparisons.map(function (c) {
      return c.id === comparison.id ? comparison : c;
    });
    this._saveToStorage('room_comparisons', comparisons);

    return {
      comparison: comparison,
      message: 'Room removed from comparison.'
    };
  }

  clearRoomComparison() {
    const comparison = this._getOrCreateRoomComparison();
    comparison.roomIds = [];

    let comparisons = this._getFromStorage('room_comparisons');
    comparisons = comparisons.map(function (c) {
      return c.id === comparison.id ? comparison : c;
    });
    this._saveToStorage('room_comparisons', comparisons);
    localStorage.removeItem('current_room_comparison_id');

    return {
      comparisonCleared: true
    };
  }

  getRoomComparisonView(checkInDate, checkOutDate, adults, children) {
    const comparison = this._getOrCreateRoomComparison();
    const rooms = this._getFromStorage('rooms');
    const ratePlans = this._getFromStorage('rate_plans');

    const compRooms = [];

    for (let i = 0; i < comparison.roomIds.length; i++) {
      const roomId = comparison.roomIds[i];
      const room = rooms.find(function (r) { return r.id === roomId; }) || null;
      if (!room) continue;

      let basePrice = room.basePricePerNight;
      let avgPrice = null;
      let currency = room.currency || 'usd';
      let cheapestRatePlanName = null;

      if (checkInDate && checkOutDate) {
        const cheapest = this._findCheapestRatePlanForRoomAndDates(
          room.id,
          checkInDate,
          checkOutDate,
          false
        );
        if (cheapest) {
          avgPrice = cheapest.totalPrice / (cheapest.nights || 1);
          const rp = cheapest.ratePlan;
          cheapestRatePlanName = rp.name;
          basePrice = rp.nightlyPrice;
          currency = rp.currency || currency;
        }
      } else {
        // No dates given, try to infer from cheapest active rate plan
        const roomRatePlans = ratePlans.filter(function (rp) {
          return rp.isActive && rp.roomId === room.id;
        });
        if (roomRatePlans.length > 0) {
          roomRatePlans.sort(function (a, b) {
            return a.nightlyPrice - b.nightlyPrice;
          });
          const rp = roomRatePlans[0];
          basePrice = rp.nightlyPrice;
          currency = rp.currency || currency;
          cheapestRatePlanName = rp.name;
        }
      }

      const amenityLabels = (Array.isArray(room.amenities) ? room.amenities : []).map(function (code) {
        return code === 'wifi' ? 'Wi-Fi' : this._toTitleFromCode(code);
      }, this);

      compRooms.push({
        room: room,
        basePricePerNight: basePrice,
        computedAverageNightlyPrice: avgPrice,
        currency: currency,
        cheapestRatePlanName: cheapestRatePlanName,
        viewLabel: this._getViewLabel(room.viewType),
        bedLabel: this._getBedLabel(room.bedType),
        amenityLabels: amenityLabels
      });
    }

    return {
      comparison: comparison,
      rooms: compRooms
    };
  }

  // ---------------------- Booking details & payment ----------------------

  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage('bookings');
    const booking = bookings.find(function (b) { return b.id === bookingId; }) || null;
    if (!booking) {
      return {
        booking: null,
        room: null,
        ratePlan: null,
        offer: null,
        priceBreakdown: [],
        policies: {
          cancellationPolicy: '',
          paymentPolicy: ''
        }
      };
    }

    const enrichedBooking = this._attachBookingForeignObjects(booking);
    const room = enrichedBooking.room;
    const ratePlan = enrichedBooking.ratePlan;
    const offer = enrichedBooking.offer;

    const priceBreakdown = [];
    if (booking.nights && booking.totalPrice) {
      priceBreakdown.push({
        label: 'Room x ' + booking.nights + ' nights',
        amount: booking.totalPrice
      });
    } else {
      priceBreakdown.push({
        label: 'Total',
        amount: booking.totalPrice
      });
    }

    let cancellationPolicy = '';
    if (ratePlan && ratePlan.cancellationPolicy) {
      cancellationPolicy = ratePlan.cancellationPolicy;
    }

    return {
      booking: enrichedBooking,
      room: room,
      ratePlan: ratePlan,
      offer: offer,
      priceBreakdown: priceBreakdown,
      policies: {
        cancellationPolicy: cancellationPolicy,
        paymentPolicy: 'Payment is required at or before check-in unless otherwise stated in your rate or package.'
      }
    };
  }

  updateBookingGuestDetails(
    bookingId,
    guestFirstName,
    guestLastName,
    guestEmail,
    guestPhone,
    arrivalTime,
    specialRequests
  ) {
    let bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (idx === -1) {
      return {
        booking: null,
        message: 'Booking not found.'
      };
    }

    const booking = bookings[idx];
    booking.guestFirstName = guestFirstName;
    booking.guestLastName = guestLastName;
    booking.guestEmail = guestEmail;
    booking.guestPhone = guestPhone;
    booking.arrivalTime = arrivalTime || null;
    booking.specialRequests = specialRequests || null;
    booking.updatedAt = new Date().toISOString();

    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    const enrichedBooking = this._attachBookingForeignObjects(booking);

    return {
      booking: enrichedBooking,
      message: 'Guest details updated.'
    };
  }

  proceedBookingToPayment(bookingId) {
    let bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (idx === -1) {
      return {
        success: false,
        booking: null,
        redirectToCheckout: false,
        message: 'Booking not found.'
      };
    }

    const booking = bookings[idx];
    booking.status = 'pending_payment';
    booking.updatedAt = new Date().toISOString();
    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    const enrichedBooking = this._attachBookingForeignObjects(booking);

    return {
      success: true,
      booking: enrichedBooking,
      redirectToCheckout: true,
      message: 'Proceed to payment.'
    };
  }

  getBookingPaymentSummary(bookingId) {
    const bookings = this._getFromStorage('bookings');
    const booking = bookings.find(function (b) { return b.id === bookingId; }) || null;
    if (!booking) {
      return {
        booking: null,
        room: null,
        offer: null,
        lineItems: [],
        totalAmount: 0,
        currency: 'usd'
      };
    }

    const enrichedBooking = this._attachBookingForeignObjects(booking);
    const room = enrichedBooking.room;
    const offer = enrichedBooking.offer;

    const lineItems = [];
    const labelBase = offer ? offer.name : (room ? room.name : 'Accommodation');
    if (booking.nights) {
      lineItems.push({
        label: labelBase + ' x ' + booking.nights + ' nights',
        amount: booking.totalPrice
      });
    } else {
      lineItems.push({ label: labelBase, amount: booking.totalPrice });
    }

    return {
      booking: enrichedBooking,
      room: room,
      offer: offer,
      lineItems: lineItems,
      totalAmount: booking.totalPrice,
      currency: booking.currency || 'usd'
    };
  }

  processBookingPayment(bookingId, paymentMethod) {
    // Payment processing is simulated; we do not store card details.
    let bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (idx === -1) {
      return {
        success: false,
        booking: null,
        transactionId: null,
        message: 'Booking not found.'
      };
    }

    const booking = bookings[idx];
    booking.status = 'confirmed';
    booking.updatedAt = new Date().toISOString();
    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    const enrichedBooking = this._attachBookingForeignObjects(booking);

    const transactionId = 'txn_' + this._getNextIdCounter();

    return {
      success: true,
      booking: enrichedBooking,
      transactionId: transactionId,
      message: 'Payment processed and booking confirmed.'
    };
  }

  // ---------------------- Cart & gift cards ----------------------

  getGiftCardTypes() {
    const types = this._getFromStorage('gift_card_types');
    return types.filter(function (t) { return t.isActive; });
  }

  addGiftCardToCart(
    giftCardTypeId,
    amount,
    currency,
    deliveryMethod,
    recipientName,
    recipientEmail,
    sendDate,
    personalMessage,
    purchaserName,
    purchaserEmail,
    quantity
  ) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const giftCardTypes = this._getFromStorage('gift_card_types');
    const type = giftCardTypes.find(function (t) { return t.id === giftCardTypeId; }) || null;
    if (!type || !type.isActive) {
      return {
        success: false,
        cart: null,
        cartItem: null,
        message: 'Invalid or inactive gift card type.'
      };
    }

    if (typeof type.minAmount === 'number' && amount < type.minAmount) {
      return {
        success: false,
        cart: null,
        cartItem: null,
        message: 'Amount is below minimum for this gift card type.'
      };
    }

    if (typeof type.maxAmount === 'number' && amount > type.maxAmount) {
      return {
        success: false,
        cart: null,
        cartItem: null,
        message: 'Amount exceeds maximum for this gift card type.'
      };
    }

    if (Array.isArray(type.allowedDeliveryMethods) && type.allowedDeliveryMethods.length > 0) {
      if (type.allowedDeliveryMethods.indexOf(deliveryMethod) === -1) {
        return {
          success: false,
          cart: null,
          cartItem: null,
          message: 'Selected delivery method is not allowed for this gift card type.'
        };
      }
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const unitPrice = amount;
    const totalPrice = amount * qty;

    const item = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'gift_card',
      quantity: qty,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      currency: currency || 'usd',
      giftCardTypeId: giftCardTypeId,
      amount: amount,
      deliveryMethod: deliveryMethod,
      recipientName: recipientName,
      recipientEmail: recipientEmail,
      sendDate: sendDate ? this._parseDate(sendDate).toISOString() : null,
      personalMessage: personalMessage || null,
      purchaserName: purchaserName,
      purchaserEmail: purchaserEmail,
      bookingId: null
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    // update cart.updatedAt
    let carts = this._getFromStorage('carts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updatedAt = new Date().toISOString();
        break;
      }
    }
    this._saveToStorage('carts', carts);

    const enrichedItem = this._attachCartItemForeignObjects(item);

    return {
      success: true,
      cart: cart,
      cartItem: enrichedItem,
      message: 'Gift card added to cart.'
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const itemsForCart = allItems.filter(function (ci) { return ci.cartId === cart.id; });

    const enrichedItems = itemsForCart.map(this._attachCartItemForeignObjects.bind(this));

    let subtotal = 0;
    let currency = 'usd';
    for (let i = 0; i < itemsForCart.length; i++) {
      const it = itemsForCart[i];
      subtotal += it.totalPrice;
      if (it.currency) currency = it.currency;
    }
    const taxes = 0;
    const total = subtotal + taxes;

    return {
      cart: cart,
      items: enrichedItems,
      totals: {
        subtotal: subtotal,
        taxes: taxes,
        total: total,
        currency: currency
      }
    };
  }

  getCartCheckoutSummary() {
    const summary = this.getCartSummary();
    const items = summary.items;

    const lineItems = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      let label = '';
      if (it.itemType === 'gift_card') {
        label = 'Gift card (' + (it.giftCardType && it.giftCardType.name ? it.giftCardType.name : 'Gift card') + ')';
      } else if (it.itemType === 'room_booking') {
        label = 'Room booking';
      } else if (it.itemType === 'package_booking') {
        label = 'Package booking';
      }
      if (it.quantity > 1) {
        label += ' x ' + it.quantity;
      }
      lineItems.push({ label: label, amount: it.totalPrice });
    }

    return {
      cart: summary.cart,
      items: items,
      lineItems: lineItems,
      totalAmount: summary.totals.total,
      currency: summary.totals.currency
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      const itemsForCart = cartItems.filter(function (ci) { return ci.cartId === cart.id; });
      const enriched = itemsForCart.map(this._attachCartItemForeignObjects.bind(this));
      return { cart: cart, items: enriched };
    }

    const item = cartItems[idx];
    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      item.quantity = quantity;
      item.totalPrice = item.unitPrice * quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const itemsForCart = cartItems.filter(function (ci) { return ci.cartId === cart.id; });
    const enrichedItems = itemsForCart.map(this._attachCartItemForeignObjects.bind(this));

    return {
      cart: cart,
      items: enrichedItems
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    cartItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const itemsForCart = cartItems.filter(function (ci) { return ci.cartId === cart.id; });
    const enrichedItems = itemsForCart.map(this._attachCartItemForeignObjects.bind(this));

    return {
      cart: cart,
      items: enrichedItems
    };
  }

  processCartPayment(paymentMethod) {
    // Simulate payment and clear current cart
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(function (ci) { return ci.cartId === cart.id; });

    let total = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      total += itemsForCart[i].totalPrice;
    }

    if (total <= 0) {
      return {
        success: false,
        cart: cart,
        transactionId: null,
        message: 'Cart is empty.'
      };
    }

    // Clear cart items for this cart
    cartItems = cartItems.filter(function (ci) { return ci.cartId !== cart.id; });
    this._saveToStorage('cart_items', cartItems);

    // Remove cart from storage list
    let carts = this._getFromStorage('carts');
    carts = carts.filter(function (c) { return c.id !== cart.id; });
    this._saveToStorage('carts', carts);
    localStorage.removeItem('current_cart_id');

    const transactionId = 'txn_cart_' + this._getNextIdCounter();

    return {
      success: true,
      cart: cart,
      transactionId: transactionId,
      message: 'Cart payment processed and cart cleared.'
    };
  }

  // ---------------------- Restaurant overview & reservations ----------------------

  getRestaurantOverview() {
    const menuItems = this._getFromStorage('menu_items').filter(function (m) {
      return m.isActive && (m.mealType === 'dinner' || m.mealType === 'all_day');
    });

    const sampleDishes = menuItems.slice(0, 5).map(function (m) {
      return {
        name: m.name,
        description: m.description || ''
      };
    });

    return {
      name: 'Hotel Restaurant',
      description: 'A seasonal restaurant showcasing local ingredients with a relaxed, elegant atmosphere.',
      heroImageUrl: '',
      hours: [
        { dayOfWeek: 'Monday - Friday', openTime: '07:00', closeTime: '22:00' },
        { dayOfWeek: 'Saturday - Sunday', openTime: '08:00', closeTime: '23:00' }
      ],
      sampleDishes: sampleDishes
    };
  }

  getRestaurantReservationConfig() {
    return {
      seatingAreas: [
        { value: 'indoor', label: 'Indoor' },
        { value: 'outdoor', label: 'Outdoor' },
        { value: 'bar', label: 'Bar' },
        { value: 'terrace', label: 'Terrace' },
        { value: 'patio', label: 'Patio' }
      ],
      tableLocationPreferences: [
        { value: 'window_table', label: 'Window table' },
        { value: 'quiet_corner', label: 'Quiet corner' },
        { value: 'near_bar', label: 'Near bar' },
        { value: 'center_of_room', label: 'Center of room' },
        { value: 'no_preference', label: 'No preference' }
      ],
      defaultPartySize: 2,
      maxPartySize: 12,
      timeIntervalMinutes: 15,
      minReservationTime: '17:00',
      maxReservationTime: '22:00'
    };
  }

  getRestaurantAvailableTimeSlots(reservationDate, partySize, seatingArea, fromTime, toTime) {
    const slots = this._getFromStorage('restaurant_time_slots');
    const dateOnly = this._formatDateOnly(this._parseDate(reservationDate));

    const results = slots.filter(function (s) {
      if (!s.isAvailable) return false;
      const slotDateOnly = s.reservationDate ? s.reservationDate.split('T')[0] : null;
      if (slotDateOnly !== dateOnly) return false;
      if (s.seatingArea !== seatingArea) return false;
      if (s.availableCapacity < partySize) return false;
      if (fromTime && s.reservationTime < fromTime) return false;
      if (toTime && s.reservationTime > toTime) return false;
      return true;
    });

    const mappedResults = results.map(function (s) {
      return {
        timeSlotId: s.id,
        reservationDate: s.reservationDate,
        reservationTime: s.reservationTime,
        seatingArea: s.seatingArea,
        availableCapacity: s.availableCapacity
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (partySize >= 4 && seatingArea === 'indoor') {
        localStorage.setItem(
          'task2_timeSlotSearch',
          JSON.stringify({
            reservationDate: reservationDate,
            partySize: partySize,
            seatingArea: seatingArea,
            fromTime: fromTime || null,
            toTime: toTime || null,
            availableSlots: results
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return mappedResults;
  }

  createRestaurantReservation(
    timeSlotId,
    partySize,
    seatingArea,
    tableLocationPreference,
    guestName,
    guestEmail,
    guestPhone,
    specialRequests
  ) {
    let slots = this._getFromStorage('restaurant_time_slots');
    const slotIdx = slots.findIndex(function (s) { return s.id === timeSlotId; });
    if (slotIdx === -1) {
      return {
        reservation: null,
        message: 'Time slot not found.'
      };
    }

    const slot = slots[slotIdx];
    if (!slot.isAvailable || slot.availableCapacity < partySize || slot.seatingArea !== seatingArea) {
      return {
        reservation: null,
        message: 'Selected time slot is no longer available.'
      };
    }

    let reservations = this._getFromStorage('restaurant_reservations');

    const reservation = {
      id: this._generateId('rest_res'),
      reservationDate: slot.reservationDate,
      reservationTime: slot.reservationTime,
      partySize: partySize,
      seatingArea: seatingArea,
      tableLocationPreference: tableLocationPreference || null,
      guestName: guestName,
      guestEmail: guestEmail,
      guestPhone: guestPhone,
      specialRequests: specialRequests || null,
      status: 'requested',
      timeSlotId: slot.id,
      createdAt: new Date().toISOString()
    };

    reservations.push(reservation);
    this._saveToStorage('restaurant_reservations', reservations);

    // Decrement capacity
    slot.availableCapacity = slot.availableCapacity - partySize;
    if (slot.availableCapacity <= 0) {
      slot.availableCapacity = 0;
      slot.isAvailable = false;
    }
    slots[slotIdx] = slot;
    this._saveToStorage('restaurant_time_slots', slots);

    const enrichedReservation = this._attachTimeSlotToReservation(reservation);

    // Instrumentation for task completion tracking
    try {
      if (reservation && partySize >= 4 && seatingArea === 'indoor') {
        localStorage.setItem(
          'task2_reservationDetails',
          JSON.stringify({
            reservationId: reservation.id,
            timeSlotId: reservation.timeSlotId,
            reservationDate: reservation.reservationDate,
            reservationTime: reservation.reservationTime,
            partySize: reservation.partySize,
            seatingArea: reservation.seatingArea,
            tableLocationPreference: reservation.tableLocationPreference,
            guestName: reservation.guestName,
            guestEmail: reservation.guestEmail,
            guestPhone: reservation.guestPhone,
            specialRequests: reservation.specialRequests
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      reservation: enrichedReservation,
      message: 'Restaurant reservation requested.'
    };
  }

  // ---------------------- Menu & dinner plan ----------------------

  getMenuFilterOptions() {
    return {
      mealTypes: [
        { value: 'breakfast', label: 'Breakfast' },
        { value: 'lunch', label: 'Lunch' },
        { value: 'dinner', label: 'Dinner' },
        { value: 'all_day', label: 'All day' }
      ],
      dietaryOptions: [
        { value: 'vegetarian', label: 'Vegetarian' },
        { value: 'vegan', label: 'Vegan' },
        { value: 'gluten_free', label: 'Gluten-free' }
      ]
    };
  }

  getMenuItems(mealType, filters, sortBy) {
    // Ensure there are some basic vegetarian dinner mains & desserts available even if seed data is sparse
    let allItems = this._getFromStorage('menu_items');

    // Only augment when looking for vegetarian dinner items and we currently lack them
    if (mealType === 'dinner') {
      const hasVegMain = allItems.some(function (m) {
        return m.isActive && m.mealType === 'dinner' && m.courseType === 'main' && m.isVegetarian;
      });
      const hasVegDessert = allItems.some(function (m) {
        return m.isActive && m.mealType === 'dinner' && m.courseType === 'dessert' && m.isVegetarian;
      });

      const extras = [];
      if (!hasVegMain) {
        extras.push({
          id: this._generateId('menu_item'),
          name: 'Grilled Vegetable Risotto',
          description: 'Creamy risotto with seasonal grilled vegetables, parmesan, and herbs.',
          courseType: 'main',
          mealType: 'dinner',
          price: 24,
          currency: 'usd',
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
          dietaryTags: ['comfort_food'],
          isActive: true,
          sortOrder: 10
        });
        extras.push({
          id: this._generateId('menu_item'),
          name: 'Roasted Cauliflower Steak',
          description: 'Thick-cut cauliflower steak with romesco sauce and lentils.',
          courseType: 'main',
          mealType: 'dinner',
          price: 26,
          currency: 'usd',
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: true,
          dietaryTags: ['vegan', 'gluten_free'],
          isActive: true,
          sortOrder: 11
        });
      }
      if (!hasVegDessert) {
        extras.push({
          id: this._generateId('menu_item'),
          name: 'Seasonal Fruit Panna Cotta',
          description: 'Vanilla bean panna cotta with seasonal macerated fruit.',
          courseType: 'dessert',
          mealType: 'dinner',
          price: 10,
          currency: 'usd',
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: true,
          dietaryTags: ['nut_free'],
          isActive: true,
          sortOrder: 20
        });
      }

      if (extras.length > 0) {
        allItems = allItems.concat(extras);
        this._saveToStorage('menu_items', allItems);
      }
    }

    const items = allItems.filter(function (m) {
      if (!m.isActive) return false;
      // Show items for requested mealType, plus all_day
      return m.mealType === mealType || m.mealType === 'all_day';
    });

    const filt = filters || {};
    const isVegetarian = filt.isVegetarian;
    const maxPrice = typeof filt.maxPrice === 'number' ? filt.maxPrice : null;
    const courseTypes = Array.isArray(filt.courseTypes) ? filt.courseTypes : null;

    let filtered = items.filter(function (m) {
      if (isVegetarian && !m.isVegetarian) return false;
      if (maxPrice !== null && m.price > maxPrice) return false;
      if (courseTypes && courseTypes.length > 0 && courseTypes.indexOf(m.courseType) === -1) return false;
      return true;
    });

    const sort = sortBy || 'course_then_sort_order';
    if (sort === 'course_then_sort_order') {
      const orderMap = { appetizer: 1, main: 2, dessert: 3, side: 4, drink: 5 };
      filtered.sort(function (a, b) {
        const oa = orderMap[a.courseType] || 99;
        const ob = orderMap[b.courseType] || 99;
        if (oa !== ob) return oa - ob;
        const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 9999;
        const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 9999;
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name);
      });
    }

    // Instrumentation for task completion tracking
    try {
      if (mealType === 'dinner' && filters && filters.isVegetarian === true) {
        localStorage.setItem(
          'task6_menuFilterParams',
          JSON.stringify({
            mealType: mealType,
            filters: filt,
            sortBy: sort
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered.map(function (m) {
      const dietaryLabels = [];
      if (m.isVegetarian) dietaryLabels.push('Vegetarian');
      if (m.isVegan) dietaryLabels.push('Vegan');
      if (m.isGlutenFree) dietaryLabels.push('Gluten-free');
      if (Array.isArray(m.dietaryTags)) {
        for (let i = 0; i < m.dietaryTags.length; i++) {
          dietaryLabels.push(this._toTitleFromCode(m.dietaryTags[i]));
        }
      }
      return {
        menuItem: m,
        priceFormatted: this._formatCurrency(m.price, m.currency || 'usd'),
        dietaryLabels: dietaryLabels
      };
    }, this);
  }

  addMenuItemToDinnerPlan(menuItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const plan = this._getOrCreateDinnerPlan();
    let items = this._getFromStorage('dinner_plan_items');
    const menuItems = this._getFromStorage('menu_items');
    const menuItem = menuItems.find(function (m) { return m.id === menuItemId; }) || null;
    if (!menuItem) {
      return {
        dinnerPlan: plan,
        items: [],
        totalPrice: plan.totalPrice
      };
    }

    const existingIdx = items.findIndex(function (pi) {
      return pi.dinnerPlanId === plan.id && pi.menuItemId === menuItemId;
    });

    if (existingIdx !== -1) {
      items[existingIdx].quantity += qty;
    } else {
      const planItem = {
        id: this._generateId('dinner_item'),
        dinnerPlanId: plan.id,
        menuItemId: menuItemId,
        courseType: menuItem.courseType,
        quantity: qty,
        itemPrice: menuItem.price,
        createdAt: new Date().toISOString()
      };
      items.push(planItem);
    }

    // Recalculate total price for the plan
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const pi = items[i];
      if (pi.dinnerPlanId === plan.id) {
        total += pi.itemPrice * pi.quantity;
      }
    }
    plan.totalPrice = total;

    // Persist
    this._saveToStorage('dinner_plan_items', items);
    let plans = this._getFromStorage('dinner_plans');
    plans = plans.map(function (p) { return p.id === plan.id ? plan : p; });
    this._saveToStorage('dinner_plans', plans);

    const planItemsForPlan = items.filter(function (pi) { return pi.dinnerPlanId === plan.id; });
    const enrichedItems = planItemsForPlan.map(this._attachMenuItemToDinnerPlanItem.bind(this));

    return {
      dinnerPlan: plan,
      items: enrichedItems,
      totalPrice: total
    };
  }

  getCurrentDinnerPlan() {
    const plan = this._getOrCreateDinnerPlan();
    const items = this._getFromStorage('dinner_plan_items').filter(function (pi) {
      return pi.dinnerPlanId === plan.id;
    });
    const menuItems = this._getFromStorage('menu_items');

    let total = 0;
    const detailedItems = items.map(function (pi) {
      const mi = menuItems.find(function (m) { return m.id === pi.menuItemId; }) || null;
      total += pi.itemPrice * pi.quantity;
      return {
        planItem: pi,
        menuItem: mi
      };
    });

    plan.totalPrice = total;
    let plans = this._getFromStorage('dinner_plans');
    plans = plans.map(function (p) { return p.id === plan.id ? plan : p; });
    this._saveToStorage('dinner_plans', plans);

    return {
      dinnerPlan: plan,
      items: detailedItems,
      totalPrice: total
    };
  }

  saveDinnerPlan(name, notes) {
    const plan = this._getOrCreateDinnerPlan();
    if (name) plan.name = name;
    if (notes) plan.notes = notes;

    let plans = this._getFromStorage('dinner_plans');
    plans = plans.map(function (p) { return p.id === plan.id ? plan : p; });
    this._saveToStorage('dinner_plans', plans);

    return {
      dinnerPlan: plan,
      success: true,
      message: 'Dinner plan saved.'
    };
  }

  // ---------------------- Offers & spa packages ----------------------

  getOfferFilterOptions() {
    const offers = this._getFromStorage('offers');
    let minRate = null;
    let maxRate = null;
    for (let i = 0; i < offers.length; i++) {
      const o = offers[i];
      if (!o.isActive) continue;
      if (typeof o.nightlyRate === 'number') {
        if (minRate === null || o.nightlyRate < minRate) minRate = o.nightlyRate;
        if (maxRate === null || o.nightlyRate > maxRate) maxRate = o.nightlyRate;
      }
    }

    return {
      featureFilters: [
        { code: 'includes_spa_access', label: 'Spa access' },
        { code: 'includes_late_checkout', label: 'Late checkout' }
      ],
      priceRange: {
        min: minRate === null ? 0 : minRate,
        max: maxRate === null ? 0 : maxRate,
        suggestedMax: maxRate === null ? 0 : maxRate
      },
      sortOptions: [
        { value: 'guest_rating_desc', label: 'Guest rating: High to Low' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' }
      ]
    };
  }

  searchOffers(filters, sortBy) {
    const offers = this._getFromStorage('offers').filter(function (o) { return o.isActive; });
    const filt = filters || {};

    let result = offers.filter(function (o) {
      if (typeof filt.includesSpaAccess === 'boolean' && !!o.includesSpaAccess !== filt.includesSpaAccess) {
        return false;
      }
      if (typeof filt.includesLateCheckout === 'boolean' && !!o.includesLateCheckout !== filt.includesLateCheckout) {
        return false;
      }
      if (typeof filt.minNightlyRate === 'number' && o.nightlyRate < filt.minNightlyRate) return false;
      if (typeof filt.maxNightlyRate === 'number' && o.nightlyRate > filt.maxNightlyRate) return false;
      if (Array.isArray(filt.types) && filt.types.length > 0 && filt.types.indexOf(o.type) === -1) return false;
      return true;
    });

    const sort = sortBy || 'guest_rating_desc';
    result.sort(function (a, b) {
      if (sort === 'price_asc') {
        return a.nightlyRate - b.nightlyRate;
      }
      if (sort === 'price_desc') {
        return b.nightlyRate - a.nightlyRate;
      }
      // guest_rating_desc default
      const ra = typeof a.guestRating === 'number' ? a.guestRating : 0;
      const rb = typeof b.guestRating === 'number' ? b.guestRating : 0;
      if (rb !== ra) return rb - ra;
      return a.nightlyRate - b.nightlyRate;
    });

    // Instrumentation for task completion tracking
    try {
      if (
        filt &&
        filt.includesSpaAccess === true &&
        filt.includesLateCheckout === true &&
        typeof filt.maxNightlyRate === 'number' &&
        filt.maxNightlyRate <= 400 &&
        sortBy === 'guest_rating_desc'
      ) {
        localStorage.setItem(
          'task3_offerSearchParams',
          JSON.stringify({
            filters: filt,
            sortBy: sort
          })
        );

        if (result && result.length > 0) {
          localStorage.setItem('task3_topOfferId', result[0].offer.id);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result.map(function (o) {
      const tagLabels = Array.isArray(o.tags)
        ? o.tags.map(function (t) { return this._toTitleFromCode(t); }, this)
        : [];
      return {
        offer: o,
        nightlyRate: o.nightlyRate,
        currency: o.currency || 'usd',
        rating: typeof o.guestRating === 'number' ? o.guestRating : null,
        tagLabels: tagLabels
      };
    }, this);
  }

  getOfferDetails(offerId) {
    const offers = this._getFromStorage('offers');
    const offer = offers.find(function (o) { return o.id === offerId; }) || null;
    if (!offer) {
      return {
        offer: null,
        includedAmenities: [],
        spaHighlights: '',
        imageGallery: [],
        termsAndConditions: ''
      };
    }

    const includedAmenities = [];
    if (offer.includesSpaAccess) includedAmenities.push('Spa access');
    if (offer.includesLateCheckout) includedAmenities.push('Late checkout');
    if (Array.isArray(offer.otherInclusions)) {
      for (let i = 0; i < offer.otherInclusions.length; i++) {
        includedAmenities.push(this._toTitleFromCode(offer.otherInclusions[i]));
      }
    }

    const spaHighlights = offer.includesSpaAccess
      ? 'Includes access to the spa facilities as part of your stay.'
      : '';

    const imageGallery = (Array.isArray(offer.imageUrls) ? offer.imageUrls : []).map(function (url, index) {
      return {
        url: url,
        altText: (offer.shortTitle || offer.name) + ' image ' + (index + 1)
      };
    });

    return {
      offer: offer,
      includedAmenities: includedAmenities,
      spaHighlights: spaHighlights,
      imageGallery: imageGallery,
      termsAndConditions: 'Offer availability, pricing, and inclusions are subject to change. Full terms are presented during booking.'
    };
  }

  getOfferAvailability(offerId, checkInDate, checkOutDate, adults, children) {
    const offers = this._getFromStorage('offers');
    const offer = offers.find(function (o) { return o.id === offerId; }) || null;
    if (!offer) {
      return {
        offer: null,
        rooms: []
      };
    }

    const offerRooms = this._getFromStorage('offer_rooms').filter(function (or) {
      return or.offerId === offerId;
    });
    const rooms = this._getFromStorage('rooms');

    const resultRooms = [];
    for (let i = 0; i < offerRooms.length; i++) {
      const or = offerRooms[i];
      const room = rooms.find(function (r) { return r.id === or.roomId; }) || null;
      if (!room || !room.isActive) continue;
      if (typeof room.maxOccupancyAdults === 'number' && adults > room.maxOccupancyAdults) continue;

      resultRooms.push({
        room: room,
        nightlyRate: offer.nightlyRate,
        averageNightlyRate: offer.nightlyRate,
        currency: offer.currency || room.currency || 'usd'
      });
    }

    return {
      offer: offer,
      rooms: resultRooms
    };
  }

  startOfferBooking(offerId, roomId, checkInDate, checkOutDate, adults, children) {
    const offers = this._getFromStorage('offers');
    const rooms = this._getFromStorage('rooms');
    const ratePlans = this._getFromStorage('rate_plans');
    const bookings = this._getFromStorage('bookings');

    const offer = offers.find(function (o) { return o.id === offerId; }) || null;
    const room = rooms.find(function (r) { return r.id === roomId; }) || null;
    if (!offer || !room) {
      return {
        booking: null,
        summary: null,
        message: 'Invalid offer or room selection.'
      };
    }

    // Choose a backing rate plan (cheapest)
    const cheapest = this._findCheapestRatePlanForRoomAndDates(room.id, checkInDate, checkOutDate, false);
    if (!cheapest) {
      return {
        booking: null,
        summary: null,
        message: 'No available rate plan for selected room and dates.'
      };
    }

    const ratePlan = cheapest.ratePlan;
    const nightsInfo = this._calculateStayNightsAndPriceBreakdown(
      checkInDate,
      checkOutDate,
      offer.nightlyRate
    );
    const nights = nightsInfo.nights || cheapest.nights || 1;
    const totalPrice = offer.nightlyRate * nights;
    const currency = offer.currency || ratePlan.currency || room.currency || 'usd';

    const booking = {
      id: this._generateId('booking'),
      roomId: room.id,
      ratePlanId: ratePlan.id,
      offerId: offer.id,
      checkInDate: this._parseDate(checkInDate) ? this._parseDate(checkInDate).toISOString() : new Date().toISOString(),
      checkOutDate: this._parseDate(checkOutDate) ? this._parseDate(checkOutDate).toISOString() : new Date().toISOString(),
      nights: nights,
      adults: adults,
      children: typeof children === 'number' ? children : 0,
      totalPrice: totalPrice,
      currency: currency,
      status: 'initiated',
      guestFirstName: '',
      guestLastName: '',
      guestEmail: '',
      guestPhone: '',
      arrivalTime: null,
      specialRequests: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      source: 'offers'
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const enrichedBooking = this._attachBookingForeignObjects(booking);

    return {
      booking: enrichedBooking,
      summary: {
        offerName: offer.name,
        roomName: room.name,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        nights: nights,
        adults: adults,
        children: typeof children === 'number' ? children : 0,
        totalPrice: totalPrice,
        currency: currency
      },
      message: 'Offer booking initiated.'
    };
  }

  // ---------------------- Meetings & events ----------------------

  getMeetingsOverview() {
    const amenities = this._getFromStorage('meeting_amenities').filter(function (a) { return a.isActive; });
    const highlightAmenities = amenities.map(function (a) { return a.name; });

    return {
      introText: 'Plan productive meetings and memorable events in our flexible spaces.',
      spaces: [],
      highlightAmenities: highlightAmenities,
      callToActionText: 'Share your event details, and our team will prepare a tailored proposal.'
    };
  }

  getMeetingAmenityOptions() {
    return this._getFromStorage('meeting_amenities').filter(function (a) { return a.isActive; });
  }

  submitMeetingEventInquiry(
    eventType,
    attendeeCount,
    eventDate,
    startTime,
    endTime,
    amenities,
    companyName,
    contactName,
    contactEmail,
    contactPhone,
    additionalDetails
  ) {
    let inquiries = this._getFromStorage('meeting_event_inquiries');

    const inquiry = {
      id: this._generateId('mtg_inq'),
      eventType: eventType,
      attendeeCount: attendeeCount,
      eventDate: this._parseDate(eventDate) ? this._parseDate(eventDate).toISOString() : new Date().toISOString(),
      startTime: startTime,
      endTime: endTime,
      amenities: Array.isArray(amenities) ? amenities : [],
      companyName: companyName,
      contactName: contactName,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      additionalDetails: additionalDetails || null,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    inquiries.push(inquiry);
    this._saveToStorage('meeting_event_inquiries', inquiries);

    return {
      inquiry: inquiry,
      message: 'Meeting or event inquiry submitted.'
    };
  }

  // ---------------------- Newsletter subscriptions ----------------------

  createNewsletterSubscription(
    email,
    name,
    interestRoomOffers,
    interestRestaurantEvents,
    interestSpaOffers,
    interestMeetingOffers,
    interestGeneralNews,
    frequency,
    consentMarketing
  ) {
    let subs = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('nl_sub'),
      email: email,
      name: name || null,
      interestRoomOffers: !!interestRoomOffers,
      interestRestaurantEvents: !!interestRestaurantEvents,
      interestSpaOffers: !!interestSpaOffers,
      interestMeetingOffers: !!interestMeetingOffers,
      interestGeneralNews: !!interestGeneralNews,
      frequency: frequency,
      consentMarketing: !!consentMarketing,
      createdAt: new Date().toISOString()
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription: subscription,
      success: true,
      message: 'Newsletter subscription created.'
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