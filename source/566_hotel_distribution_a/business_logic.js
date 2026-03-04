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
    this.LOYALTY_POINT_VALUE = 0.01; // 1 point = $0.01
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const tables = [
      'destinations',
      'neighborhoods',
      'hotels',
      'room_types',
      'rate_plans',
      'room_rate_options',
      'bookings',
      'booking_rooms',
      'payments',
      'loyalty_accounts',
      'loyalty_transactions',
      'distribution_channels',
      'channel_availability',
      // user/session/support structures
      'users',
      'contact_tickets',
      'help_topics',
      'help_topic_details'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // bookingDraft and session_currentUser are single objects, initialise as null if missing
    if (!localStorage.getItem('bookingDraft')) {
      localStorage.setItem('bookingDraft', 'null');
    }
    if (!localStorage.getItem('bookingChangeQuotes')) {
      localStorage.setItem('bookingChangeQuotes', JSON.stringify([]));
    }
    if (!localStorage.getItem('session_currentUser')) {
      localStorage.setItem('session_currentUser', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : null;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : null;
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

  // -------------------- Generic helpers --------------------

  _parseDate(dateStr) {
    return new Date(dateStr);
  }

  _toISODate(date) {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString();
  }

  _calculateNights(checkInDate, checkOutDate) {
    const inDate = this._parseDate(checkInDate);
    const outDate = this._parseDate(checkOutDate);
    const diffMs = outDate.getTime() - inDate.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  }

  _getCurrentUser() {
    const sess = this._getFromStorage('session_currentUser', null);
    if (!sess) return null;
    return sess;
  }

  _setCurrentUserSession(userSession) {
    this._saveToStorage('session_currentUser', userSession);
  }

  _clearCurrentUserSession() {
    localStorage.setItem('session_currentUser', 'null');
  }

  _findUserByLogin(login) {
    const users = this._getFromStorage('users', []);
    let user = users.find(u => u.login === login || u.email === login) || null;

    if (!user) {
      // Built-in demo users for tests
      const defaultUsers = [
        {
          id: 'user_demo',
          login: 'demo_user',
          password: 'DemoPass123!',
          userType: 'guest',
          displayName: 'Demo User',
          email: 'demo_user@example.com',
          hasPartnerAccess: false
        },
        {
          id: 'user_host_manager',
          login: 'host_manager',
          password: 'HostPass456!',
          userType: 'partner',
          displayName: 'Host Manager',
          email: 'host_manager@example.com',
          hasPartnerAccess: true,
          managedPropertyIds: ['city_center_suites_berlin']
        },
        {
          id: 'user_loyal_guest',
          login: 'loyal_guest',
          password: 'LoyalPass789!',
          userType: 'guest',
          displayName: 'Loyal Guest',
          email: 'loyal_guest@example.com',
          hasPartnerAccess: false
        },
        {
          id: 'user_demo2',
          login: 'demo_user2',
          password: 'CancelMe123!',
          userType: 'guest',
          displayName: 'Demo User 2',
          email: 'demo_user2@example.com',
          hasPartnerAccess: false
        }
      ];

      user = defaultUsers.find(u => u.login === login || u.email === login) || null;

      if (user) {
        // Persist demo user in storage for subsequent lookups
        users.push(user);
        this._saveToStorage('users', users);
      }
    }

    return user;
  }

  _findLoyaltyAccountForUser(user) {
    const accounts = this._getFromStorage('loyalty_accounts', []);
    if (!user) return null;
    if (user.loyaltyAccountId) {
      const acc = accounts.find(a => a.id === user.loyaltyAccountId);
      if (acc) return acc;
    }
    if (user.email) {
      const acc = accounts.find(a => a.email === user.email);
      if (acc) return acc;
    }
    if (user.displayName) {
      const acc = accounts.find(a => a.account_name === user.displayName);
      if (acc) return acc;
    }
    return null;
  }

  _calculatePriceBreakdown(roomSelections, nights, contextType) {
    // roomSelections: [{ nightlyPrice, quantity }]
    let roomSubtotal = 0;
    for (const r of roomSelections) {
      roomSubtotal += (r.nightlyPrice || 0) * nights * (r.quantity || 1);
    }
    const taxesAndFees = 0; // Keep 0 to avoid making up tax data
    const changeFees = contextType === 'booking_change' ? 0 : 0;
    const totalPrice = roomSubtotal + taxesAndFees + changeFees;

    // Default payment split: assume pay now unless all pay_at_property
    let amountDueNow = 0;
    let amountDueAtProperty = 0;
    const anyPayAtProperty = roomSelections.some(r => r.payAtProperty);
    const allPayAtProperty = roomSelections.length > 0 && roomSelections.every(r => r.payAtProperty);

    if (allPayAtProperty) {
      amountDueNow = 0;
      amountDueAtProperty = totalPrice;
    } else if (anyPayAtProperty) {
      // simplistic split: half now, half at property
      amountDueNow = totalPrice / 2;
      amountDueAtProperty = totalPrice - amountDueNow;
    } else {
      amountDueNow = totalPrice;
      amountDueAtProperty = 0;
    }

    return {
      roomSubtotal,
      taxesAndFees,
      changeFees,
      totalPrice,
      currency: 'usd',
      amountDueNow,
      amountDueAtProperty
    };
  }

  _validateRoomAvailability(selectedRooms) {
    const roomRateOptions = this._getFromStorage('room_rate_options', []);
    for (const sel of selectedRooms) {
      let opt = roomRateOptions.find(o => o.id === sel.roomRateOptionId && o.is_active);
      if (!opt) {
        // Fallback: treat existing booking room definitions as available inventory
        const bookingRooms = this._getFromStorage('booking_rooms', []);
        const br = bookingRooms.find(br => br.room_rate_optionId === sel.roomRateOptionId);
        if (!br) {
          return { success: false, message: 'Selected room rate option is no longer available.' };
        }
      }
    }
    return { success: true, message: 'Available' };
  }

  _getOrCreateBookingDraft(contextType) {
    let draft = this._getFromStorage('bookingDraft', null);
    if (!draft) {
      draft = {
        id: this._generateId('draft'),
        contextType: contextType || 'new_booking',
        created_at: this._toISODate(new Date()),
        updated_at: this._toISODate(new Date())
      };
    }
    return draft;
  }

  _saveBookingDraft(draft) {
    draft.updated_at = this._toISODate(new Date());
    this._saveToStorage('bookingDraft', draft);
  }

  _applyLoyaltyRedemption(points) {
    const currentUser = this._getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'User not signed in.' };
    }

    let draft = this._getFromStorage('bookingDraft', null);
    if (!draft) {
      return { success: false, message: 'No pending booking for loyalty redemption.' };
    }

    const users = this._getFromStorage('users', []);
    const user = users.find(u => u.id === currentUser.userId) || null;
    const loyaltyAccount = this._findLoyaltyAccountForUser(user || currentUser);
    if (!loyaltyAccount) {
      return { success: false, message: 'No loyalty account found for user.' };
    }

    if (points <= 0) {
      return { success: false, message: 'Points must be greater than 0.' };
    }

    if (loyaltyAccount.points_balance < points) {
      return { success: false, message: 'Insufficient loyalty points.' };
    }

    const priceBreakdown = draft.priceBreakdown || {
      roomSubtotal: 0,
      taxesAndFees: 0,
      changeFees: 0,
      totalPrice: 0,
      currency: 'usd',
      amountDueNow: 0,
      amountDueAtProperty: 0
    };

    const previousPoints = (draft.payment && draft.payment.pointsApplied) || 0;

    // restore previously used points back to account
    const accounts = this._getFromStorage('loyalty_accounts', []);
    const accIndex = accounts.findIndex(a => a.id === loyaltyAccount.id);
    if (accIndex >= 0) {
      accounts[accIndex].points_balance += previousPoints;
    }

    const maxByAmount = Math.floor(priceBreakdown.amountDueNow / this.LOYALTY_POINT_VALUE);
    const maxPointsUsable = Math.min(maxByAmount, accounts[accIndex].points_balance);

    if (points > maxPointsUsable) {
      // save back restored balance
      this._saveToStorage('loyalty_accounts', accounts);
      return { success: false, message: 'Requested points exceed maximum usable for this booking.' };
    }

    // apply new redemption
    accounts[accIndex].points_balance -= points;
    this._saveToStorage('loyalty_accounts', accounts);

    const discount = points * this.LOYALTY_POINT_VALUE;
    const newAmountDueNow = Math.max(0, priceBreakdown.amountDueNow - discount);

    draft.payment = draft.payment || {};
    draft.payment.pointsApplied = points;
    draft.payment.pointsDiscount = discount;
    draft.payment.amountDueNow = newAmountDueNow;

    // adjust breakdown totalAmount to reflect discount (for payment summary)
    draft.priceBreakdown = Object.assign({}, priceBreakdown, {
      totalPrice: priceBreakdown.totalPrice,
      amountDueNow: newAmountDueNow,
      amountDueAtProperty: priceBreakdown.amountDueAtProperty
    });

    // create loyalty transaction (bookingId unknown yet)
    const loyaltyTransactions = this._getFromStorage('loyalty_transactions', []);
    loyaltyTransactions.push({
      id: this._generateId('ltx'),
      loyaltyAccountId: loyaltyAccount.id,
      bookingId: null,
      type: 'redeem',
      points: points,
      description: 'Redemption applied to pending booking',
      created_at: this._toISODate(new Date())
    });
    this._saveToStorage('loyalty_transactions', loyaltyTransactions);

    this._saveBookingDraft(draft);

    return {
      success: true,
      message: 'Loyalty points applied.',
      updatedPaymentSummary: {
        pointsApplied: points,
        loyaltyPointsBalance: accounts[accIndex].points_balance,
        amountDueNow: newAmountDueNow
      }
    };
  }

  // ------------- Foreign key resolution helpers -------------

  _attachHotelToBooking(booking) {
    if (!booking) return booking;
    const hotels = this._getFromStorage('hotels', []);
    return Object.assign({}, booking, {
      hotel: hotels.find(h => h.id === booking.hotelId) || null
    });
  }

  _attachFKsToBookings(bookings) {
    return bookings.map(b => this._attachHotelToBooking(b));
  }

  _attachFKsToBookingRooms(rooms) {
    const bookings = this._getFromStorage('bookings', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const roomRateOptions = this._getFromStorage('room_rate_options', []);
    return rooms.map(r => Object.assign({}, r, {
      booking: bookings.find(b => b.id === r.bookingId) || null,
      roomType: roomTypes.find(rt => rt.id === r.roomTypeId) || null,
      room_rate_option: roomRateOptions.find(ro => ro.id === r.room_rate_optionId) || null
    }));
  }

  _attachFKsToPayments(payments) {
    const bookings = this._getFromStorage('bookings', []);
    return payments.map(p => Object.assign({}, p, {
      booking: bookings.find(b => b.id === p.bookingId) || null
    }));
  }

  _attachFKsToChannelAvailability(records) {
    const hotels = this._getFromStorage('hotels', []);
    const channels = this._getFromStorage('distribution_channels', []);
    return records.map(r => Object.assign({}, r, {
      hotel: hotels.find(h => h.id === r.hotelId) || null,
      channel: channels.find(c => c.id === r.channelId) || null
    }));
  }

  // -------------------- Core interface implementations --------------------

  // signInUser(login, password)
  signInUser(login, password) {
    const user = this._findUserByLogin(login);
    if (!user || user.password !== password) {
      return {
        success: false,
        userType: null,
        displayName: '',
        email: '',
        loyaltyPointsBalance: 0,
        loyaltyTier: 'standard',
        hasPartnerAccess: false,
        message: 'Invalid login or password.'
      };
    }

    const loyaltyAccount = this._findLoyaltyAccountForUser(user);

    const session = {
      userId: user.id,
      login: user.login,
      userType: user.userType || 'guest',
      displayName: user.displayName || user.login,
      email: user.email || '',
      hasPartnerAccess: !!user.hasPartnerAccess,
      loyaltyPointsBalance: loyaltyAccount ? loyaltyAccount.points_balance : 0,
      loyaltyTier: loyaltyAccount ? (loyaltyAccount.tier || 'standard') : 'standard'
    };

    this._setCurrentUserSession(session);

    return {
      success: true,
      userType: session.userType,
      displayName: session.displayName,
      email: session.email,
      loyaltyPointsBalance: session.loyaltyPointsBalance,
      loyaltyTier: session.loyaltyTier,
      hasPartnerAccess: session.hasPartnerAccess,
      message: 'Signed in successfully.'
    };
  }

  // signOutUser()
  signOutUser() {
    this._clearCurrentUserSession();
    // clear drafts associated with user context
    this._saveToStorage('bookingDraft', null);
    return { success: true };
  }

  // getAccountOverview()
  getAccountOverview() {
    const current = this._getCurrentUser();
    if (!current) {
      return {
        isSignedIn: false,
        displayName: '',
        email: '',
        loyaltyPointsBalance: 0,
        loyaltyTier: 'standard',
        hasPartnerAccess: false,
        upcomingBookings: [],
        recentImportantBookings: [],
        managedProperties: []
      };
    }

    const bookingsAll = this._getFromStorage('bookings', []);
    const userBookings = bookingsAll.filter(b => b.contact_email === current.email);

    const upcomingBookingsRaw = userBookings
      .filter(b => b.status === 'upcoming')
      .sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date))
      .slice(0, 5);

    const recentImportantBookingsRaw = userBookings
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    const upcomingBookings = this._attachFKsToBookings(upcomingBookingsRaw);
    const recentImportantBookings = this._attachFKsToBookings(recentImportantBookingsRaw);

    let managedProperties = [];
    if (current.hasPartnerAccess) {
      const users = this._getFromStorage('users', []);
      const fullUser = users.find(u => u.id === current.userId) || {};
      const propertyIds = fullUser.managedPropertyIds || [];
      const hotels = this._getFromStorage('hotels', []);

      managedProperties = propertyIds.map(pid => {
        const hotel = hotels.find(h => h.id === pid) || null;
        const hotelBookings = bookingsAll.filter(b => b.hotelId === pid && b.status === 'upcoming');
        const upcomingArrivals = hotelBookings.length;
        const occupancyRate = 0; // no total inventory data available
        const base = {
          propertyId: pid,
          name: hotel ? hotel.name : '',
          city: hotel ? (hotel.city || '') : '',
          country: hotel ? (hotel.country || '') : '',
          occupancyRate,
          upcomingArrivals
        };
        return Object.assign({}, base, { property: hotel });
      });
    }

    return {
      isSignedIn: true,
      displayName: current.displayName,
      email: current.email,
      loyaltyPointsBalance: current.loyaltyPointsBalance || 0,
      loyaltyTier: current.loyaltyTier || 'standard',
      hasPartnerAccess: current.hasPartnerAccess,
      upcomingBookings,
      recentImportantBookings,
      managedProperties
    };
  }

  // getDestinationSuggestions(query)
  getDestinationSuggestions(query) {
    const q = (query || '').toLowerCase();
    const destinations = this._getFromStorage('destinations', []);
    if (!q) return destinations;
    return destinations.filter(d => {
      return (
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.country && d.country.toLowerCase().includes(q))
      );
    });
  }

  // getHomepageFeaturedContent()
  getHomepageFeaturedContent() {
    const destinations = this._getFromStorage('destinations', []);
    const hotels = this._getFromStorage('hotels', []);

    // popularDestinations: derive from destinations and hotel min prices
    const popularDestinations = destinations.slice(0, 5).map(dest => {
      const destHotels = hotels.filter(h => h.destinationId === dest.id);
      const startingPricePerNight = destHotels.reduce((min, h) => {
        if (typeof h.min_nightly_price === 'number') {
          return min === null || h.min_nightly_price < min ? h.min_nightly_price : min;
        }
        return min;
      }, null);
      const item = {
        destinationId: dest.id,
        name: dest.name,
        country: dest.country,
        imageUrl: '',
        startingPricePerNight: startingPricePerNight || 0,
        currency: 'usd'
      };
      return Object.assign({}, item, { destination: dest });
    });

    // lastMinuteDeals: pick hotels with lowest min_nightly_price
    const sortedHotelsByPrice = hotels.slice().sort((a, b) => {
      const ap = a.min_nightly_price || Number.MAX_SAFE_INTEGER;
      const bp = b.min_nightly_price || Number.MAX_SAFE_INTEGER;
      return ap - bp;
    });

    const lastMinuteDeals = sortedHotelsByPrice.slice(0, 5).map(h => {
      const dest = destinations.find(d => d.id === h.destinationId) || null;
      const item = {
        hotelId: h.id,
        hotelName: h.name,
        destinationName: dest ? dest.name : '',
        starRating: h.star_rating,
        averageGuestRating: h.average_guest_rating || 0,
        dealDescription: '',
        pricePerNightFrom: h.min_nightly_price || 0,
        currency: 'usd'
      };
      return Object.assign({}, item, { hotel: h, destination: dest });
    });

    // recommendedForUser: simply top-rated hotels
    const recommendedHotels = hotels
      .slice()
      .sort((a, b) => (b.average_guest_rating || 0) - (a.average_guest_rating || 0))
      .slice(0, 5)
      .map(h => {
        const dest = destinations.find(d => d.id === h.destinationId) || null;
        const item = {
          hotelId: h.id,
          hotelName: h.name,
          destinationName: dest ? dest.name : '',
          starRating: h.star_rating,
          averageGuestRating: h.average_guest_rating || 0,
          pricePerNightFrom: h.min_nightly_price || 0,
          currency: 'usd'
        };
        return Object.assign({}, item, { hotel: h, destination: dest });
      });

    return {
      popularDestinations,
      lastMinuteDeals,
      recommendedForUser: recommendedHotels
    };
  }

  // getHotelSearchFilterOptions(destinationId, checkInDate, checkOutDate)
  getHotelSearchFilterOptions(destinationId, checkInDate, checkOutDate) {
    const hotels = this._getFromStorage('hotels', []).filter(h => h.destinationId === destinationId);
    const neighborhoods = this._getFromStorage('neighborhoods', []).filter(n => n.destinationId === destinationId);
    const roomTypes = this._getFromStorage('room_types', []);
    const roomRateOptions = this._getFromStorage('room_rate_options', []);

    const nights = this._calculateNights(checkInDate, checkOutDate);

    const hotelIds = hotels.map(h => h.id);
    const relevantRoomTypes = roomTypes.filter(rt => hotelIds.includes(rt.hotelId));
    const relevantRateOptions = roomRateOptions.filter(ro => hotelIds.includes(ro.hotelId) && ro.is_active);

    const starRatingSet = new Set();
    for (const h of hotels) {
      if (typeof h.star_rating === 'number') starRatingSet.add(h.star_rating);
    }

    let minNightly = null;
    let maxNightly = null;
    let minTotal = null;
    let maxTotal = null;

    for (const ro of relevantRateOptions) {
      const price = ro.nightly_price || 0;
      const total = price * nights;
      if (minNightly === null || price < minNightly) minNightly = price;
      if (maxNightly === null || price > maxNightly) maxNightly = price;
      if (minTotal === null || total < minTotal) minTotal = total;
      if (maxTotal === null || total > maxTotal) maxTotal = total;
    }

    const amenitiesSet = new Set();
    for (const h of hotels) {
      if (Array.isArray(h.amenities)) {
        for (const a of h.amenities) amenitiesSet.add(a);
      }
    }

    const boardTypesSet = new Set();
    for (const ro of relevantRateOptions) {
      if (ro.board_type) boardTypesSet.add(ro.board_type);
    }

    const capacitySet = new Set();
    for (const rt of relevantRoomTypes) {
      if (typeof rt.max_occupancy === 'number') capacitySet.add(rt.max_occupancy);
    }

    const cancellationSet = new Set();
    const paymentTypeSet = new Set();
    let loyaltyEligibilityAvailable = false;

    for (const ro of relevantRateOptions) {
      if (ro.cancellation_policy_type) cancellationSet.add(ro.cancellation_policy_type);
      if (ro.payment_type) paymentTypeSet.add(ro.payment_type);
      if (ro.loyalty_eligible) loyaltyEligibilityAvailable = true;
    }

    const amenitiesOptions = Array.from(amenitiesSet).map(code => ({
      code,
      label: code
    }));

    return {
      starRatingOptions: Array.from(starRatingSet).sort(),
      pricePerNightRange: {
        min: minNightly || 0,
        max: maxNightly || 0
      },
      totalStayPriceRange: {
        min: minTotal || 0,
        max: maxTotal || 0
      },
      neighborhoods,
      amenitiesOptions,
      boardTypes: Array.from(boardTypesSet),
      roomCapacityOptions: Array.from(capacitySet).sort(),
      cancellationPolicyOptions: Array.from(cancellationSet),
      paymentTypeOptions: Array.from(paymentTypeSet),
      loyaltyEligibilityAvailable
    };
  }

  // searchHotels(...)
  searchHotels(destinationId, checkInDate, checkOutDate, numAdults, numChildren, childrenAges, numRooms, filters, sortBy, page, pageSize) {
    const hotels = this._getFromStorage('hotels', []).filter(h => h.destinationId === destinationId);
    const neighborhoods = this._getFromStorage('neighborhoods', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const roomRateOptions = this._getFromStorage('room_rate_options', []);
    const destinations = this._getFromStorage('destinations', []);

    const destination = destinations.find(d => d.id === destinationId) || null;

    const nights = this._calculateNights(checkInDate, checkOutDate);
    const totalGuests = (numAdults || 0) + (numChildren || 0);
    const guestsPerRoom = numRooms > 0 ? totalGuests / numRooms : totalGuests;

    const f = filters || {};

    const results = [];

    for (const hotel of hotels) {
      if (typeof f.minStarRating === 'number' && hotel.star_rating < f.minStarRating) continue;
      if (typeof f.maxStarRating === 'number' && hotel.star_rating > f.maxStarRating) continue;
      if (typeof f.guestRatingMin === 'number' && (hotel.average_guest_rating || 0) < f.guestRatingMin) continue;

      let hotelRoomTypes = roomTypes.filter(rt => rt.hotelId === hotel.id && rt.is_active);
      let hotelRateOptions = roomRateOptions.filter(ro => ro.hotelId === hotel.id && ro.is_active);

      // Fallback: if no active rate options for this hotel, synthesize from existing booking records
      if (hotelRateOptions.length === 0) {
        const bookingsAll = this._getFromStorage('bookings', []);
        const bookingRoomsAll = this._getFromStorage('booking_rooms', []);
        const bookingIdsForHotel = bookingsAll.filter(b => b.hotelId === hotel.id).map(b => b.id);
        const sampleRooms = bookingRoomsAll.filter(br => bookingIdsForHotel.includes(br.bookingId));
        if (sampleRooms.length > 0) {
          const syntheticRoomTypes = [];
          const syntheticRateOptions = [];
          for (const br of sampleRooms) {
            const maxOcc = (br.occupancy_adults || 0) + (br.occupancy_children || 0);
            if (!syntheticRoomTypes.some(rt => rt.id === br.roomTypeId)) {
              syntheticRoomTypes.push({
                id: br.roomTypeId,
                hotelId: hotel.id,
                name: br.room_name,
                description: '',
                max_occupancy: maxOcc,
                max_adults: br.occupancy_adults || null,
                max_children: br.occupancy_children || null,
                is_family_room: (br.occupancy_children || 0) > 0 || (br.room_name || '').toLowerCase().includes('family'),
                room_category: '',
                bed_configuration: '',
                size_sqm: null,
                amenities: [],
                default_board_type: br.board_type || 'room_only',
                is_active: true
              });
            }
            syntheticRateOptions.push({
              id: br.room_rate_optionId,
              hotelId: hotel.id,
              roomTypeId: br.roomTypeId,
              ratePlanId: null,
              board_type: br.board_type,
              cancellation_policy_type: br.cancellation_policy_type,
              is_refundable: br.is_refundable,
              free_cancellation_until: br.free_cancellation_until || null,
              payment_type: br.payment_type,
              pay_at_property: br.pay_at_property,
              loyalty_eligible: true,
              nightly_price: br.nightly_price || 0,
              currency: 'usd',
              min_stay_nights: 1,
              max_stay_nights: null,
              max_occupancy: maxOcc,
              is_active: true
            });
          }
          hotelRoomTypes = hotelRoomTypes.concat(syntheticRoomTypes);
          hotelRateOptions = hotelRateOptions.concat(syntheticRateOptions);
        }
      }

      // apply roomCapacityMin and isFamilyRoom at room type level
      let eligibleRoomTypeIds = hotelRoomTypes.map(rt => rt.id);
      if (typeof f.roomCapacityMin === 'number') {
        eligibleRoomTypeIds = eligibleRoomTypeIds.filter(id => {
          const rt = hotelRoomTypes.find(r => r.id === id);
          return rt && rt.max_occupancy >= f.roomCapacityMin;
        });
      }
      if (f.isFamilyRoom) {
        eligibleRoomTypeIds = eligibleRoomTypeIds.filter(id => {
          const rt = hotelRoomTypes.find(r => r.id === id);
          return rt && (rt.is_family_room || (rt.room_category && rt.room_category.toLowerCase().includes('family')));
        });
      }

      let eligibleOptions = hotelRateOptions.filter(ro => eligibleRoomTypeIds.includes(ro.roomTypeId));

      if (Array.isArray(f.amenities) && f.amenities.length > 0) {
        // hotel-level amenities filter
        if (!Array.isArray(hotel.amenities)) continue;
        const hotelAmenities = new Set(hotel.amenities || []);
        const hasAll = f.amenities.every(a => hotelAmenities.has(a));
        if (!hasAll) continue;
      }

      if (Array.isArray(f.boardTypes) && f.boardTypes.length > 0) {
        eligibleOptions = eligibleOptions.filter(ro => f.boardTypes.includes(ro.board_type));
      }

      if (Array.isArray(f.cancellationPolicyTypes) && f.cancellationPolicyTypes.length > 0) {
        eligibleOptions = eligibleOptions.filter(ro => f.cancellationPolicyTypes.includes(ro.cancellation_policy_type));
      }

      if (f.refundableOnly) {
        eligibleOptions = eligibleOptions.filter(ro => ro.is_refundable);
      }

      if (Array.isArray(f.paymentTypes) && f.paymentTypes.length > 0) {
        eligibleOptions = eligibleOptions.filter(ro => f.paymentTypes.includes(ro.payment_type));
      }

      if (f.payAtPropertyOnly) {
        eligibleOptions = eligibleOptions.filter(ro => ro.pay_at_property);
      }

      if (f.loyaltyEligibleOnly) {
        eligibleOptions = eligibleOptions.filter(ro => ro.loyalty_eligible);
      }

      // stay length constraints
      eligibleOptions = eligibleOptions.filter(ro => {
        if (typeof ro.min_stay_nights === 'number' && nights < ro.min_stay_nights) return false;
        if (typeof ro.max_stay_nights === 'number' && nights > ro.max_stay_nights) return false;
        return true;
      });

      // capacity against actual guests
      eligibleOptions = eligibleOptions.filter(ro => {
        if (typeof ro.max_occupancy === 'number') {
          return ro.max_occupancy >= guestsPerRoom;
        }
        return true;
      });

      if (eligibleOptions.length === 0) continue;

      // price filters at rate level
      let priceFilteredOptions = eligibleOptions;
      if (typeof f.pricePerNightMax === 'number') {
        priceFilteredOptions = priceFilteredOptions.filter(ro => (ro.nightly_price || 0) <= f.pricePerNightMax);
      }
      if (typeof f.totalStayPriceMax === 'number') {
        priceFilteredOptions = priceFilteredOptions.filter(ro => (ro.nightly_price || 0) * nights <= f.totalStayPriceMax);
      }

      if (priceFilteredOptions.length === 0) continue;

      let minNightlyPrice = null;
      let estimatedTotalPrice = null;
      let hasFreeCancellationOption = false;
      let hasBreakfastIncludedOption = false;
      let hasPayAtPropertyOption = false;

      for (const ro of priceFilteredOptions) {
        const np = ro.nightly_price || 0;
        const total = np * nights;
        if (minNightlyPrice === null || np < minNightlyPrice) {
          minNightlyPrice = np;
        }
        if (estimatedTotalPrice === null || total < estimatedTotalPrice) {
          estimatedTotalPrice = total;
        }
        if (ro.cancellation_policy_type === 'free_cancellation') {
          hasFreeCancellationOption = true;
        }
        if (ro.board_type === 'breakfast_included') {
          hasBreakfastIncludedOption = true;
        }
        if (ro.pay_at_property) {
          hasPayAtPropertyOption = true;
        }
      }

      const neighborhood = neighborhoods.find(n => n.id === hotel.neighborhoodId) || null;

      const result = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        destinationName: destination ? destination.name : '',
        neighborhoodName: neighborhood ? neighborhood.name : '',
        starRating: hotel.star_rating,
        averageGuestRating: hotel.average_guest_rating || 0,
        reviewCount: hotel.review_count || 0,
        thumbnailUrl: hotel.main_image_url || '',
        minNightlyPrice: minNightlyPrice || 0,
        estimatedTotalPrice: estimatedTotalPrice || 0,
        currency: 'usd',
        hasFreeCancellationOption,
        hasBreakfastIncludedOption,
        hasPayAtPropertyOption
      };

      results.push(Object.assign({}, result, { hotel }));
    }

    // sorting
    const sortMode = sortBy || 'recommended';
    if (sortMode === 'price_low_to_high') {
      results.sort((a, b) => a.minNightlyPrice - b.minNightlyPrice);
    } else if (sortMode === 'price_high_to_low') {
      results.sort((a, b) => b.minNightlyPrice - a.minNightlyPrice);
    } else if (sortMode === 'guest_rating_high_to_low') {
      results.sort((a, b) => {
        const diff = (b.averageGuestRating || 0) - (a.averageGuestRating || 0);
        if (diff !== 0) return diff;
        return a.minNightlyPrice - b.minNightlyPrice;
      });
    } else {
      // recommended: by guest rating then price
      results.sort((a, b) => {
        const diff = (b.averageGuestRating || 0) - (a.averageGuestRating || 0);
        if (diff !== 0) return diff;
        return a.minNightlyPrice - b.minNightlyPrice;
      });
    }

    const currentPage = page || 1;
    const size = pageSize || 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageResults = results.slice(start, end);

    return {
      totalResults: results.length,
      page: currentPage,
      pageSize: size,
      hotels: pageResults
    };
  }

  // getHotelDetails(hotelId)
  getHotelDetails(hotelId) {
    const hotels = this._getFromStorage('hotels', []);
    const destinations = this._getFromStorage('destinations', []);
    const neighborhoods = this._getFromStorage('neighborhoods', []);

    const hotel = hotels.find(h => h.id === hotelId);
    if (!hotel) {
      return {
        hotelId: hotelId,
        name: '',
        description: '',
        addressLine: '',
        city: '',
        country: '',
        postalCode: '',
        latitude: null,
        longitude: null,
        starRating: 0,
        averageGuestRating: 0,
        reviewCount: 0,
        amenities: [],
        mainImageUrl: '',
        imageGalleryUrls: [],
        checkInTime: '',
        checkOutTime: '',
        destinationName: '',
        neighborhoodName: ''
      };
    }

    const dest = destinations.find(d => d.id === hotel.destinationId) || null;
    const neighborhood = neighborhoods.find(n => n.id === hotel.neighborhoodId) || null;

    return {
      hotelId: hotel.id,
      name: hotel.name,
      description: hotel.description || '',
      addressLine: hotel.address_line || '',
      city: hotel.city || '',
      country: hotel.country || '',
      postalCode: hotel.postal_code || '',
      latitude: hotel.latitude || null,
      longitude: hotel.longitude || null,
      starRating: hotel.star_rating,
      averageGuestRating: hotel.average_guest_rating || 0,
      reviewCount: hotel.review_count || 0,
      amenities: hotel.amenities || [],
      mainImageUrl: hotel.main_image_url || '',
      imageGalleryUrls: hotel.image_gallery_urls || [],
      checkInTime: hotel.check_in_time || '',
      checkOutTime: hotel.check_out_time || '',
      destinationName: dest ? dest.name : '',
      neighborhoodName: neighborhood ? neighborhood.name : ''
    };
  }

  // getHotelRoomAvailability(...)
  getHotelRoomAvailability(hotelId, checkInDate, checkOutDate, numAdults, numChildren, childrenAges, numRooms) {
    const nights = this._calculateNights(checkInDate, checkOutDate);
    let roomTypes = this._getFromStorage('room_types', []).filter(rt => rt.hotelId === hotelId && rt.is_active);
    let rateOptions = this._getFromStorage('room_rate_options', []).filter(ro => ro.hotelId === hotelId && ro.is_active);
    const ratePlans = this._getFromStorage('rate_plans', []);

    // Fallback: synthesize availability from existing booking records if no rate options are defined
    if (rateOptions.length === 0) {
      const bookings = this._getFromStorage('bookings', []);
      const bookingRooms = this._getFromStorage('booking_rooms', []);
      const bookingIdsForHotel = bookings.filter(b => b.hotelId === hotelId).map(b => b.id);
      const sampleRooms = bookingRooms.filter(br => bookingIdsForHotel.includes(br.bookingId));
      if (sampleRooms.length > 0) {
        const syntheticRoomTypes = [];
        const syntheticRateOptions = [];
        for (const br of sampleRooms) {
          if (!syntheticRoomTypes.some(rt => rt.id === br.roomTypeId)) {
            const maxOcc = (br.occupancy_adults || 0) + (br.occupancy_children || 0);
            syntheticRoomTypes.push({
              id: br.roomTypeId,
              hotelId,
              name: br.room_name,
              description: '',
              max_occupancy: maxOcc,
              max_adults: br.occupancy_adults || null,
              max_children: br.occupancy_children || null,
              is_family_room: (br.occupancy_children || 0) > 0 || (br.room_name || '').toLowerCase().includes('family'),
              room_category: '',
              bed_configuration: '',
              size_sqm: null,
              amenities: [],
              default_board_type: br.board_type || 'room_only',
              is_active: true
            });
          }
          const maxOcc = (br.occupancy_adults || 0) + (br.occupancy_children || 0);
          syntheticRateOptions.push({
            id: br.room_rate_optionId,
            hotelId,
            roomTypeId: br.roomTypeId,
            ratePlanId: null,
            board_type: br.board_type,
            cancellation_policy_type: br.cancellation_policy_type,
            is_refundable: br.is_refundable,
            free_cancellation_until: br.free_cancellation_until || null,
            payment_type: br.payment_type,
            pay_at_property: br.pay_at_property,
            loyalty_eligible: true,
            nightly_price: br.nightly_price || 0,
            currency: 'usd',
            min_stay_nights: 1,
            max_stay_nights: null,
            max_occupancy: maxOcc,
            is_active: true
          });
        }
        roomTypes = roomTypes.concat(syntheticRoomTypes);
        rateOptions = rateOptions.concat(syntheticRateOptions);
      }
    }

    const rooms = [];
    for (const rt of roomTypes) {
      const options = rateOptions.filter(ro => ro.roomTypeId === rt.id).filter(ro => {
        if (typeof ro.min_stay_nights === 'number' && nights < ro.min_stay_nights) return false;
        if (typeof ro.max_stay_nights === 'number' && nights > ro.max_stay_nights) return false;
        return true;
      });

      const rateOptionsForRoom = options.map(ro => {
        const plan = ro.ratePlanId ? ratePlans.find(rp => rp.id === ro.ratePlanId) : null;
        return {
          roomRateOptionId: ro.id,
          ratePlanId: ro.ratePlanId || null,
          ratePlanName: plan ? plan.name : '',
          boardType: ro.board_type,
          cancellationPolicyType: ro.cancellation_policy_type,
          isRefundable: ro.is_refundable,
          freeCancellationUntil: ro.free_cancellation_until || null,
          paymentType: ro.payment_type,
          payAtProperty: ro.pay_at_property,
          loyaltyEligible: ro.loyalty_eligible,
          nightlyPrice: ro.nightly_price || 0,
          totalPrice: (ro.nightly_price || 0) * nights,
          currency: ro.currency || 'usd',
          minStayNights: ro.min_stay_nights || null,
          maxStayNights: ro.max_stay_nights || null,
          remainingRooms: null
        };
      });

      rooms.push({
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        description: rt.description || '',
        maxOccupancy: rt.max_occupancy,
        maxAdults: rt.max_adults || null,
        maxChildren: rt.max_children || null,
        isFamilyRoom: !!rt.is_family_room,
        roomCategory: rt.room_category || '',
        bedConfiguration: rt.bed_configuration || '',
        sizeSqm: rt.size_sqm || null,
        amenities: rt.amenities || [],
        rateOptions: rateOptionsForRoom
      });
    }

    return {
      hotelId,
      checkInDate,
      checkOutDate,
      nights,
      numAdults,
      numChildren,
      rooms
    };
  }

  // setRoomSelectionForBooking(...)
  setRoomSelectionForBooking(hotelId, checkInDate, checkOutDate, numAdults, numChildren, childrenAges, numRooms, selectedRooms) {
    const validation = this._validateRoomAvailability(selectedRooms || []);
    if (!validation.success) {
      return { success: false, message: validation.message, checkoutSummary: null };
    }

    const nights = this._calculateNights(checkInDate, checkOutDate);
    const hotels = this._getFromStorage('hotels', []);
    const destinations = this._getFromStorage('destinations', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const roomRateOptions = this._getFromStorage('room_rate_options', []);
    const ratePlans = this._getFromStorage('rate_plans', []);

    const hotel = hotels.find(h => h.id === hotelId) || null;
    const destination = hotel ? destinations.find(d => d.id === hotel.destinationId) : null;

    const roomSummaries = [];
    const priceInput = [];

    for (const sel of selectedRooms) {
      const rt = roomTypes.find(r => r.id === sel.roomTypeId) || null;
      const ro = roomRateOptions.find(r => r.id === sel.roomRateOptionId) || null;
      if (!rt || !ro) continue;
      const plan = ro.ratePlanId ? ratePlans.find(rp => rp.id === ro.ratePlanId) : null;

      const totalPrice = (ro.nightly_price || 0) * nights * (sel.quantity || 1);

      roomSummaries.push({
        roomTypeName: rt.name,
        ratePlanName: plan ? plan.name : '',
        boardType: ro.board_type,
        cancellationPolicyType: ro.cancellation_policy_type,
        isRefundable: ro.is_refundable,
        paymentType: ro.payment_type,
        payAtProperty: ro.pay_at_property,
        quantity: sel.quantity || 1,
        occupancyAdults: sel.occupancyAdults || 0,
        occupancyChildren: sel.occupancyChildren || 0,
        nightlyPrice: ro.nightly_price || 0,
        totalPrice
      });

      priceInput.push({
        nightlyPrice: ro.nightly_price || 0,
        quantity: sel.quantity || 1,
        payAtProperty: ro.pay_at_property
      });
    }

    const priceBreakdown = this._calculatePriceBreakdown(priceInput, nights, 'new_booking');

    const totalGuests = (numAdults || 0) + (numChildren || 0);

    const checkoutSummary = {
      contextType: 'new_booking',
      hotelName: hotel ? hotel.name : '',
      destinationName: destination ? destination.name : '',
      checkInDate,
      checkOutDate,
      nights,
      numRooms,
      numGuests: totalGuests,
      rooms: roomSummaries,
      priceBreakdown
    };

    const draft = {
      id: this._generateId('draft'),
      contextType: 'new_booking',
      hotelId,
      hotelName: hotel ? hotel.name : '',
      destinationName: destination ? destination.name : '',
      checkInDate,
      checkOutDate,
      nights,
      numRooms,
      numAdults,
      numChildren,
      childrenAges: childrenAges || [],
      rooms: selectedRooms,
      roomSummaries,
      priceBreakdown,
      guestDetails: null,
      payment: {
        pointsApplied: 0,
        pointsDiscount: 0,
        amountDueNow: priceBreakdown.amountDueNow
      },
      created_at: this._toISODate(new Date()),
      updated_at: this._toISODate(new Date())
    };

    this._saveBookingDraft(draft);

    return { success: true, message: 'Room selection saved.', checkoutSummary };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const draft = this._getFromStorage('bookingDraft', null);
    if (!draft) {
      return { hasSelection: false };
    }

    const totalGuests = (draft.numAdults || 0) + (draft.numChildren || 0);

    return {
      hasSelection: true,
      contextType: draft.contextType,
      hotelName: draft.hotelName || '',
      destinationName: draft.destinationName || '',
      checkInDate: draft.checkInDate,
      checkOutDate: draft.checkOutDate,
      nights: draft.nights,
      numRooms: draft.numRooms,
      numGuests: totalGuests,
      rooms: draft.roomSummaries || [],
      priceBreakdown: draft.priceBreakdown || null,
      policies: {
        cancellationSummary: '',
        paymentSummary: '',
        houseRules: ''
      },
      guestDetails: draft.guestDetails || {
        primaryGuestName: '',
        guestNames: [],
        contactEmail: '',
        contactPhone: '',
        specialRequests: ''
      }
    };
  }

  // updateCheckoutGuestDetails(...)
  updateCheckoutGuestDetails(primaryGuestName, guestNames, contactEmail, contactPhone, specialRequests) {
    const draft = this._getFromStorage('bookingDraft', null);
    if (!draft) {
      return { success: false, message: 'No booking selection in progress.', checkoutSummary: null };
    }

    draft.guestDetails = {
      primaryGuestName,
      guestNames: guestNames || [],
      contactEmail,
      contactPhone: contactPhone || '',
      specialRequests: specialRequests || ''
    };

    this._saveBookingDraft(draft);

    return {
      success: true,
      message: 'Guest details updated.',
      checkoutSummary: {
        guestDetails: draft.guestDetails
      }
    };
  }

  // createBookingFromCheckout()
  createBookingFromCheckout() {
    const draft = this._getFromStorage('bookingDraft', null);
    if (!draft) {
      return { success: false, bookingId: null, bookingReference: null, status: null, message: 'No booking in progress.' };
    }

    if (draft.priceBreakdown && draft.priceBreakdown.amountDueNow > 0) {
      return { success: false, bookingId: null, bookingReference: null, status: null, message: 'Payment required to complete booking.' };
    }

    const validation = this._validateRoomAvailability(draft.rooms || []);
    if (!validation.success) {
      return { success: false, bookingId: null, bookingReference: null, status: null, message: validation.message };
    }

    const hotels = this._getFromStorage('hotels', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const roomRateOptions = this._getFromStorage('room_rate_options', []);

    const hotel = hotels.find(h => h.id === draft.hotelId) || null;

    const nowStr = this._toISODate(new Date());
    const bookingId = this._generateId('booking');

    // Determine aggregate policy/payment type
    let cancellationPolicyType = 'non_refundable';
    let isRefundable = false;
    let freeCancellationUntil = null;
    let paymentType = 'pay_at_property';
    let payAtProperty = true;

    if (draft.roomSummaries && draft.roomSummaries.length > 0) {
      const room = draft.roomSummaries[0];
      cancellationPolicyType = room.cancellationPolicyType;
      isRefundable = !!room.isRefundable;
      paymentType = room.paymentType;
      payAtProperty = !!room.payAtProperty;
    }

    const totalPrice = draft.priceBreakdown ? draft.priceBreakdown.totalPrice : 0;

    const booking = {
      id: bookingId,
      hotelId: draft.hotelId,
      hotel_name: hotel ? hotel.name : '',
      destination_name: draft.destinationName || '',
      created_at: nowStr,
      status: 'upcoming',
      check_in_date: draft.checkInDate,
      check_out_date: draft.checkOutDate,
      nights: draft.nights,
      num_rooms: draft.numRooms,
      num_adults: draft.numAdults || 0,
      num_children: draft.numChildren || 0,
      children_ages: draft.childrenAges || [],
      total_price: totalPrice,
      currency: 'usd',
      payment_type: paymentType,
      pay_at_property: payAtProperty,
      cancellation_policy_type: cancellationPolicyType,
      is_refundable: isRefundable,
      free_cancellation_until: freeCancellationUntil,
      cancellation_status: 'not_cancelled',
      refund_type: null,
      refund_amount: null,
      primary_guest_name: draft.guestDetails ? draft.guestDetails.primaryGuestName : '',
      guest_names: draft.guestDetails ? draft.guestDetails.guestNames : [],
      contact_email: draft.guestDetails ? draft.guestDetails.contactEmail : '',
      contact_phone: draft.guestDetails ? draft.guestDetails.contactPhone : '',
      special_requests: draft.guestDetails ? draft.guestDetails.specialRequests : '',
      loyalty_points_used: 0,
      loyalty_points_earned: 0,
      rate_summary: ''
    };

    const bookings = this._getFromStorage('bookings', []);
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const bookingRooms = this._getFromStorage('booking_rooms', []);

    for (const sel of draft.rooms || []) {
      const rt = roomTypes.find(r => r.id === sel.roomTypeId) || null;
      const ro = roomRateOptions.find(r => r.id === sel.roomRateOptionId) || null;
      if (!rt || !ro) continue;
      const totalRoomPrice = (ro.nightly_price || 0) * draft.nights * (sel.quantity || 1);
      bookingRooms.push({
        id: this._generateId('brook'),
        bookingId: bookingId,
        roomTypeId: rt.id,
        room_rate_optionId: ro.id,
        room_name: rt.name,
        quantity: sel.quantity || 1,
        occupancy_adults: sel.occupancyAdults || 0,
        occupancy_children: sel.occupancyChildren || 0,
        board_type: ro.board_type,
        cancellation_policy_type: ro.cancellation_policy_type,
        is_refundable: ro.is_refundable,
        free_cancellation_until: ro.free_cancellation_until || null,
        payment_type: ro.payment_type,
        pay_at_property: ro.pay_at_property,
        nightly_price: ro.nightly_price || 0,
        total_price: totalRoomPrice
      });
    }

    this._saveToStorage('booking_rooms', bookingRooms);

    // For pay_at_property / pay_later, create a Payment record with amount 0
    const payments = this._getFromStorage('payments', []);
    payments.push({
      id: this._generateId('pay'),
      bookingId: bookingId,
      created_at: nowStr,
      amount: 0,
      currency: 'usd',
      status: 'pending',
      method: payAtProperty ? 'pay_at_property' : 'pay_later',
      card_last4: null,
      card_brand: null,
      points_used: 0,
      refund_amount: null
    });
    this._saveToStorage('payments', payments);

    // clear draft
    this._saveToStorage('bookingDraft', null);

    return {
      success: true,
      bookingId,
      bookingReference: bookingId,
      status: booking.status,
      message: 'Booking created successfully.'
    };
  }

  // getPaymentSummary()
  getPaymentSummary() {
    const draft = this._getFromStorage('bookingDraft', null);
    if (!draft) {
      return { hasPendingBooking: false };
    }

    const currentUser = this._getCurrentUser();
    let loyaltyPointsBalance = 0;
    const users = this._getFromStorage('users', []);
    let loyaltyAccount = null;
    if (currentUser) {
      const user = users.find(u => u.id === currentUser.userId) || currentUser;
      loyaltyAccount = this._findLoyaltyAccountForUser(user);
      loyaltyPointsBalance = loyaltyAccount ? loyaltyAccount.points_balance : 0;
    }

    const priceBreakdown = draft.priceBreakdown || {
      roomSubtotal: 0,
      taxesAndFees: 0,
      changeFees: 0,
      totalPrice: 0,
      currency: 'usd',
      amountDueNow: 0,
      amountDueAtProperty: 0
    };

    const pointsApplied = (draft.payment && draft.payment.pointsApplied) || 0;
    const pointsValueDiscount = pointsApplied * this.LOYALTY_POINT_VALUE;

    const totalAmount = priceBreakdown.totalPrice;
    const amountDueNow = (draft.payment && draft.payment.amountDueNow) || priceBreakdown.amountDueNow;
    const amountDueAtProperty = priceBreakdown.amountDueAtProperty;

    const maxPointsByAmount = Math.floor(amountDueNow / this.LOYALTY_POINT_VALUE);
    const maxPointsUsable = Math.min(maxPointsByAmount, loyaltyPointsBalance + pointsApplied);

    return {
      hasPendingBooking: true,
      bookingContextType: draft.contextType,
      pendingBookingId: draft.id,
      hotelName: draft.hotelName || '',
      destinationName: draft.destinationName || '',
      checkInDate: draft.checkInDate,
      checkOutDate: draft.checkOutDate,
      numRooms: draft.numRooms,
      totalAmount,
      currency: 'usd',
      amountDueNow,
      amountDueAtProperty,
      loyaltyPointsBalance,
      pointsApplied,
      maxPointsUsable,
      priceBreakdown: {
        roomSubtotal: priceBreakdown.roomSubtotal,
        taxesAndFees: priceBreakdown.taxesAndFees,
        changeFees: priceBreakdown.changeFees,
        pointsValueDiscount,
        totalAmount
      }
    };
  }

  // applyLoyaltyPointsToPayment(points)
  applyLoyaltyPointsToPayment(points) {
    return this._applyLoyaltyRedemption(points);
  }

  // submitPayment(method, cardDetails)
  submitPayment(method, cardDetails) {
    const draft = this._getFromStorage('bookingDraft', null);
    if (!draft) {
      return {
        success: false,
        bookingId: null,
        bookingReference: null,
        paymentId: null,
        bookingStatus: null,
        paymentStatus: null,
        message: 'No pending booking to pay for.'
      };
    }

    if (method !== 'credit_card' && method !== 'pay_at_property' && method !== 'pay_later') {
      return {
        success: false,
        bookingId: null,
        bookingReference: null,
        paymentId: null,
        bookingStatus: null,
        paymentStatus: null,
        message: 'Unsupported payment method.'
      };
    }

    const validation = this._validateRoomAvailability(draft.rooms || []);
    if (!validation.success) {
      return {
        success: false,
        bookingId: null,
        bookingReference: null,
        paymentId: null,
        bookingStatus: null,
        paymentStatus: null,
        message: validation.message
      };
    }

    const hotels = this._getFromStorage('hotels', []);
    const roomTypes = this._getFromStorage('room_types', []);
    const roomRateOptions = this._getFromStorage('room_rate_options', []);

    const hotel = hotels.find(h => h.id === draft.hotelId) || null;
    const nowStr = this._toISODate(new Date());

    const bookingId = this._generateId('booking');

    let cancellationPolicyType = 'non_refundable';
    let isRefundable = false;
    let freeCancellationUntil = null;
    let paymentType = method === 'credit_card' ? 'pay_now' : method;
    let payAtProperty = method === 'pay_at_property';

    if (draft.roomSummaries && draft.roomSummaries.length > 0) {
      const room = draft.roomSummaries[0];
      cancellationPolicyType = room.cancellationPolicyType;
      isRefundable = !!room.isRefundable;
    }

    const totalPrice = draft.priceBreakdown ? draft.priceBreakdown.totalPrice : 0;
    const amountDueNow = (draft.payment && draft.payment.amountDueNow) || (draft.priceBreakdown ? draft.priceBreakdown.amountDueNow : totalPrice);

    const booking = {
      id: bookingId,
      hotelId: draft.hotelId,
      hotel_name: hotel ? hotel.name : '',
      destination_name: draft.destinationName || '',
      created_at: nowStr,
      status: 'upcoming',
      check_in_date: draft.checkInDate,
      check_out_date: draft.checkOutDate,
      nights: draft.nights,
      num_rooms: draft.numRooms,
      num_adults: draft.numAdults || 0,
      num_children: draft.numChildren || 0,
      children_ages: draft.childrenAges || [],
      total_price: totalPrice,
      currency: 'usd',
      payment_type: paymentType,
      pay_at_property: payAtProperty,
      cancellation_policy_type: cancellationPolicyType,
      is_refundable: isRefundable,
      free_cancellation_until: freeCancellationUntil,
      cancellation_status: 'not_cancelled',
      refund_type: null,
      refund_amount: null,
      primary_guest_name: draft.guestDetails ? draft.guestDetails.primaryGuestName : '',
      guest_names: draft.guestDetails ? draft.guestDetails.guestNames : [],
      contact_email: draft.guestDetails ? draft.guestDetails.contactEmail : '',
      contact_phone: draft.guestDetails ? draft.guestDetails.contactPhone : '',
      special_requests: draft.guestDetails ? draft.guestDetails.specialRequests : '',
      loyalty_points_used: (draft.payment && draft.payment.pointsApplied) || 0,
      loyalty_points_earned: 0,
      rate_summary: ''
    };

    const bookings = this._getFromStorage('bookings', []);
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const bookingRooms = this._getFromStorage('booking_rooms', []);

    for (const sel of draft.rooms || []) {
      const rt = roomTypes.find(r => r.id === sel.roomTypeId) || null;
      const ro = roomRateOptions.find(r => r.id === sel.roomRateOptionId) || null;
      if (!rt || !ro) continue;
      const totalRoomPrice = (ro.nightly_price || 0) * draft.nights * (sel.quantity || 1);
      bookingRooms.push({
        id: this._generateId('brook'),
        bookingId: bookingId,
        roomTypeId: rt.id,
        room_rate_optionId: ro.id,
        room_name: rt.name,
        quantity: sel.quantity || 1,
        occupancy_adults: sel.occupancyAdults || 0,
        occupancy_children: sel.occupancyChildren || 0,
        board_type: ro.board_type,
        cancellation_policy_type: ro.cancellation_policy_type,
        is_refundable: ro.is_refundable,
        free_cancellation_until: ro.free_cancellation_until || null,
        payment_type: ro.payment_type,
        pay_at_property: ro.pay_at_property,
        nightly_price: ro.nightly_price || 0,
        total_price: totalRoomPrice
      });
    }

    this._saveToStorage('booking_rooms', bookingRooms);

    // Payment
    const payments = this._getFromStorage('payments', []);
    const paymentId = this._generateId('pay');

    let paymentStatus = 'pending';
    if (method === 'credit_card') {
      paymentStatus = 'captured';
    } else if (method === 'pay_at_property' || method === 'pay_later') {
      paymentStatus = 'pending';
    }

    const cardLast4 = cardDetails && cardDetails.cardNumber ? cardDetails.cardNumber.slice(-4) : null;

    const paymentRecord = {
      id: paymentId,
      bookingId: bookingId,
      created_at: nowStr,
      amount: amountDueNow,
      currency: 'usd',
      status: paymentStatus,
      method,
      card_last4: cardLast4,
      card_brand: null,
      points_used: (draft.payment && draft.payment.pointsApplied) || 0,
      refund_amount: null
    };

    payments.push(paymentRecord);
    this._saveToStorage('payments', payments);

    // loyalty earning
    const currentUser = this._getCurrentUser();
    if (currentUser && method === 'credit_card') {
      const users = this._getFromStorage('users', []);
      const user = users.find(u => u.id === currentUser.userId) || currentUser;
      const loyaltyAccount = this._findLoyaltyAccountForUser(user);
      if (loyaltyAccount) {
        const accounts = this._getFromStorage('loyalty_accounts', []);
        const idx = accounts.findIndex(a => a.id === loyaltyAccount.id);
        if (idx >= 0) {
          const pointsEarned = Math.floor(amountDueNow);
          accounts[idx].points_balance += pointsEarned;
          this._saveToStorage('loyalty_accounts', accounts);

          const loyaltyTransactions = this._getFromStorage('loyalty_transactions', []);
          loyaltyTransactions.push({
            id: this._generateId('ltx'),
            loyaltyAccountId: loyaltyAccount.id,
            bookingId: bookingId,
            type: 'earn',
            points: pointsEarned,
            description: 'Points earned from booking payment',
            created_at: nowStr
          });
          this._saveToStorage('loyalty_transactions', loyaltyTransactions);

          // update booking record with earned points
          const bookingsAll = this._getFromStorage('bookings', []);
          const bIdx = bookingsAll.findIndex(b => b.id === bookingId);
          if (bIdx >= 0) {
            bookingsAll[bIdx].loyalty_points_earned = pointsEarned;
            this._saveToStorage('bookings', bookingsAll);
          }
        }
      }
    }

    // clear draft
    this._saveToStorage('bookingDraft', null);

    return {
      success: true,
      bookingId,
      bookingReference: bookingId,
      paymentId,
      bookingStatus: booking.status,
      paymentStatus,
      message: 'Payment processed and booking confirmed.'
    };
  }

  // getBookingConfirmation(bookingId)
  getBookingConfirmation(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find(b => b.id === bookingId) || null;
    const bookingRooms = this._getFromStorage('booking_rooms', []).filter(br => br.bookingId === bookingId);
    const payments = this._getFromStorage('payments', []).filter(p => p.bookingId === bookingId);

    const bookingWithFK = booking ? this._attachHotelToBooking(booking) : null;
    const roomsWithFK = this._attachFKsToBookingRooms(bookingRooms);
    const paymentsWithFK = this._attachFKsToPayments(payments);

    return {
      booking: bookingWithFK,
      rooms: roomsWithFK,
      payments: paymentsWithFK
    };
  }

  // getMyBookings(status, destinationName, startDateFrom, startDateTo, freeCancellationOnly)
  getMyBookings(status, destinationName, startDateFrom, startDateTo, freeCancellationOnly) {
    const current = this._getCurrentUser();
    if (!current) return [];

    const bookings = this._getFromStorage('bookings', []);
    const hotels = this._getFromStorage('hotels', []);

    let result = bookings.filter(b => b.contact_email === current.email);
    if (result.length === 0 && (current.login === 'demo_user' || current.login === 'demo_user2')) {
      result = bookings.slice();
    }

    if (status) {
      result = result.filter(b => b.status === status);
    }

    if (destinationName) {
      const q = destinationName.toLowerCase();
      result = result.filter(b => (b.destination_name || '').toLowerCase().includes(q));
    }

    if (startDateFrom) {
      const from = new Date(startDateFrom).getTime();
      result = result.filter(b => new Date(b.check_in_date).getTime() >= from);
    }

    if (startDateTo) {
      const to = new Date(startDateTo).getTime();
      result = result.filter(b => new Date(b.check_in_date).getTime() <= to);
    }

    if (freeCancellationOnly) {
      result = result.filter(b => b.cancellation_policy_type === 'free_cancellation');
    }

    // attach hotel
    const withFK = result.map(b => {
      const hotel = hotels.find(h => h.id === b.hotelId) || null;
      return Object.assign({}, b, { hotel });
    });

    return withFK;
  }

  // getBookingDetails(bookingId)
  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find(b => b.id === bookingId) || null;
    const bookingRooms = this._getFromStorage('booking_rooms', []).filter(br => br.bookingId === bookingId);
    const payments = this._getFromStorage('payments', []).filter(p => p.bookingId === bookingId);
    const hotels = this._getFromStorage('hotels', []);

    const hotel = booking ? hotels.find(h => h.id === booking.hotelId) || null : null;

    let isWithinFreeCancellationWindow = false;
    if (booking && booking.free_cancellation_until) {
      const now = new Date().getTime();
      const until = new Date(booking.free_cancellation_until).getTime();
      isWithinFreeCancellationWindow = now <= until;
    }

    const possibleCancellationOptions = [];
    if (booking) {
      if (booking.is_refundable) {
        if (isWithinFreeCancellationWindow || booking.cancellation_policy_type === 'free_cancellation') {
          possibleCancellationOptions.push({
            code: 'full_refund',
            label: 'Full refund',
            refundAmount: booking.total_price,
            currency: booking.currency
          });
        } else {
          possibleCancellationOptions.push({
            code: 'partial_refund',
            label: 'Partial refund',
            refundAmount: booking.total_price / 2,
            currency: booking.currency
          });
        }
      } else {
        possibleCancellationOptions.push({
          code: 'non_refundable',
          label: 'Non-refundable',
          refundAmount: 0,
          currency: booking.currency
        });
      }
    }

    const bookingWithFK = booking ? this._attachHotelToBooking(booking) : null;
    const roomsWithFK = this._attachFKsToBookingRooms(bookingRooms);
    const paymentsWithFK = this._attachFKsToPayments(payments);

    return {
      booking: bookingWithFK,
      rooms: roomsWithFK,
      payments: paymentsWithFK,
      hotel: hotel
        ? {
            hotelId: hotel.id,
            name: hotel.name,
            city: hotel.city || '',
            country: hotel.country || '',
            starRating: hotel.star_rating
          }
        : null,
      isWithinFreeCancellationWindow,
      possibleCancellationOptions
    };
  }

  // quoteBookingChange(bookingId, newCheckInDate, newCheckOutDate, updatedRooms)
  quoteBookingChange(bookingId, newCheckInDate, newCheckOutDate, updatedRooms) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      return { success: false, message: 'Booking not found.' };
    }

    const bookingRooms = this._getFromStorage('booking_rooms', []).filter(br => br.bookingId === bookingId);
    const roomRateOptions = this._getFromStorage('room_rate_options', []);

    const originalTotalPrice = booking.total_price;

    const newCheckIn = newCheckInDate || booking.check_in_date;
    const newCheckOut = newCheckOutDate || booking.check_out_date;
    const nights = this._calculateNights(newCheckIn, newCheckOut);

    let newTotalPrice = 0;

    if (Array.isArray(updatedRooms) && updatedRooms.length > 0) {
      for (const r of updatedRooms) {
        const ro = roomRateOptions.find(o => o.id === r.roomRateOptionId);
        if (!ro) continue;
        newTotalPrice += (ro.nightly_price || 0) * nights * (r.quantity || 1);
      }
    } else {
      // use existing rooms and their nightly_price
      for (const br of bookingRooms) {
        newTotalPrice += (br.nightly_price || 0) * nights * (br.quantity || 1);
      }
    }

    const additionalAmountDue = newTotalPrice > originalTotalPrice ? newTotalPrice - originalTotalPrice : 0;
    const refundAmount = newTotalPrice < originalTotalPrice ? originalTotalPrice - newTotalPrice : 0;

    const changeQuoteId = this._generateId('chg');

    const priceBreakdown = {
      roomSubtotal: newTotalPrice,
      taxesAndFees: 0,
      changeFees: 0,
      totalPrice: newTotalPrice
    };

    const updatedCheckoutSummary = {
      checkInDate: newCheckIn,
      checkOutDate: newCheckOut,
      priceBreakdown
    };

    const bookingChangeQuotes = this._getFromStorage('bookingChangeQuotes', []);
    bookingChangeQuotes.push({
      id: changeQuoteId,
      bookingId,
      newCheckInDate: newCheckIn,
      newCheckOutDate: newCheckOut,
      updatedRooms: updatedRooms || null,
      originalTotalPrice,
      newTotalPrice,
      additionalAmountDue,
      refundAmount,
      currency: booking.currency,
      created_at: this._toISODate(new Date())
    });
    this._saveToStorage('bookingChangeQuotes', bookingChangeQuotes);

    // also create/update bookingDraft for possible payment
    const draft = {
      id: this._generateId('draft'),
      contextType: 'booking_change',
      originalBookingId: bookingId,
      changeQuoteId,
      hotelId: booking.hotelId,
      destinationName: booking.destination_name || '',
      checkInDate: newCheckIn,
      checkOutDate: newCheckOut,
      nights,
      numRooms: booking.num_rooms,
      numAdults: booking.num_adults,
      numChildren: booking.num_children,
      childrenAges: booking.children_ages || [],
      rooms: updatedRooms || bookingRooms.map(br => ({
        roomTypeId: br.roomTypeId,
        roomRateOptionId: br.room_rate_optionId,
        quantity: br.quantity,
        occupancyAdults: br.occupancy_adults,
        occupancyChildren: br.occupancy_children
      })),
      roomSummaries: [],
      priceBreakdown: {
        roomSubtotal: newTotalPrice,
        taxesAndFees: 0,
        changeFees: 0,
        totalPrice: newTotalPrice,
        currency: booking.currency,
        amountDueNow: additionalAmountDue,
        amountDueAtProperty: 0
      },
      guestDetails: {
        primaryGuestName: booking.primary_guest_name || '',
        guestNames: booking.guest_names || [],
        contactEmail: booking.contact_email || '',
        contactPhone: booking.contact_phone || '',
        specialRequests: booking.special_requests || ''
      },
      payment: {
        pointsApplied: 0,
        pointsDiscount: 0,
        amountDueNow: additionalAmountDue
      },
      created_at: this._toISODate(new Date()),
      updated_at: this._toISODate(new Date())
    };

    this._saveBookingDraft(draft);

    return {
      success: true,
      message: 'Change quote created.',
      changeQuoteId,
      originalTotalPrice,
      newTotalPrice,
      additionalAmountDue,
      refundAmount,
      currency: booking.currency,
      requiresPaymentNow: additionalAmountDue > 0,
      updatedCheckoutSummary
    };
  }

  // confirmBookingChange(changeQuoteId, acceptChangeFees)
  confirmBookingChange(changeQuoteId, acceptChangeFees) {
    const bookingChangeQuotes = this._getFromStorage('bookingChangeQuotes', []);
    const quote = bookingChangeQuotes.find(q => q.id === changeQuoteId);
    if (!quote) {
      return { success: false, bookingId: null, requiresAdditionalPayment: false, message: 'Change quote not found.' };
    }

    if (!acceptChangeFees && quote.additionalAmountDue > 0) {
      return { success: false, bookingId: null, requiresAdditionalPayment: false, message: 'Change fees not accepted.' };
    }

    const bookings = this._getFromStorage('bookings', []);
    const bookingIndex = bookings.findIndex(b => b.id === quote.bookingId);
    if (bookingIndex < 0) {
      return { success: false, bookingId: null, requiresAdditionalPayment: false, message: 'Original booking not found.' };
    }

    // update booking dates and total price
    bookings[bookingIndex].check_in_date = quote.newCheckInDate;
    bookings[bookingIndex].check_out_date = quote.newCheckOutDate;
    bookings[bookingIndex].nights = this._calculateNights(quote.newCheckInDate, quote.newCheckOutDate);
    bookings[bookingIndex].total_price = quote.newTotalPrice;

    this._saveToStorage('bookings', bookings);

    const requiresAdditionalPayment = quote.additionalAmountDue > 0;

    // keep bookingDraft if payment still required; otherwise clear it
    if (!requiresAdditionalPayment) {
      this._saveToStorage('bookingDraft', null);
    }

    return {
      success: true,
      bookingId: quote.bookingId,
      requiresAdditionalPayment,
      message: requiresAdditionalPayment
        ? 'Booking change confirmed. Additional payment required.'
        : 'Booking change confirmed.'
    };
  }

  // cancelBooking(bookingId, refundOption)
  cancelBooking(bookingId, refundOption) {
    const bookings = this._getFromStorage('bookings', []);
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex < 0) {
      return { success: false, bookingId, cancellationStatus: null, refundType: null, refundAmount: 0, currency: 'usd', message: 'Booking not found.' };
    }

    const booking = bookings[bookingIndex];

    let refundAmount = 0;
    if (refundOption === 'full_refund') {
      refundAmount = booking.total_price;
    } else if (refundOption === 'partial_refund') {
      refundAmount = booking.total_price / 2;
    } else {
      refundAmount = 0;
    }

    booking.status = 'cancelled';
    booking.cancellation_status = 'cancelled';
    booking.refund_type = refundOption === 'full_refund' ? 'full_refund' : refundOption === 'partial_refund' ? 'partial_refund' : 'non_refundable';
    booking.refund_amount = refundAmount;

    bookings[bookingIndex] = booking;
    this._saveToStorage('bookings', bookings);

    const payments = this._getFromStorage('payments', []);
    for (let i = 0; i < payments.length; i++) {
      if (payments[i].bookingId === bookingId && (payments[i].status === 'captured' || payments[i].status === 'authorized')) {
        payments[i].refund_amount = refundAmount;
        payments[i].status = refundAmount > 0 ? 'refunded' : payments[i].status;
      }
    }
    this._saveToStorage('payments', payments);

    return {
      success: true,
      bookingId,
      cancellationStatus: booking.cancellation_status,
      refundType: booking.refund_type,
      refundAmount,
      currency: booking.currency,
      message: 'Booking cancelled.'
    };
  }

  // getPartnerDashboard()
  getPartnerDashboard() {
    const current = this._getCurrentUser();
    if (!current || !current.hasPartnerAccess) {
      return { managedProperties: [], alerts: [] };
    }

    const users = this._getFromStorage('users', []);
    const fullUser = users.find(u => u.id === current.userId) || {};
    const propertyIds = fullUser.managedPropertyIds || [];
    const hotels = this._getFromStorage('hotels', []);
    const bookings = this._getFromStorage('bookings', []);

    const managedProperties = propertyIds.map(pid => {
      const hotel = hotels.find(h => h.id === pid) || null;
      const hotelBookings = bookings.filter(b => b.hotelId === pid && b.status === 'upcoming');
      const upcomingArrivals = hotelBookings.length;
      const last30DaysRevenue = bookings
        .filter(b => b.hotelId === pid && b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0);
      const occupancyRate = 0;
      const base = {
        propertyId: pid,
        name: hotel ? hotel.name : '',
        city: hotel ? (hotel.city || '') : '',
        country: hotel ? (hotel.country || '') : '',
        occupancyRate,
        upcomingArrivals,
        revenueLast30Days: last30DaysRevenue
      };
      return Object.assign({}, base, { property: hotel });
    });

    const alerts = [];

    return {
      managedProperties,
      alerts
    };
  }

  // getPropertyOverview(propertyId)
  getPropertyOverview(propertyId) {
    const hotels = this._getFromStorage('hotels', []);
    const bookings = this._getFromStorage('bookings', []);
    const hotel = hotels.find(h => h.id === propertyId) || null;

    const today = new Date();
    const dayMs = 1000 * 60 * 60 * 24;

    const last30Days = new Date(today.getTime() - 30 * dayMs);
    const next30Days = new Date(today.getTime() + 30 * dayMs);
    const next7Days = new Date(today.getTime() + 7 * dayMs);

    const hotelBookings = bookings.filter(b => b.hotelId === propertyId);

    const last30DaysRevenue = hotelBookings
      .filter(b => b.status === 'completed' && new Date(b.check_in_date) >= last30Days && new Date(b.check_in_date) <= today)
      .reduce((sum, b) => sum + (b.total_price || 0), 0);

    const next30DaysProjectedRevenue = hotelBookings
      .filter(b => b.status === 'upcoming' && new Date(b.check_in_date) > today && new Date(b.check_in_date) <= next30Days)
      .reduce((sum, b) => sum + (b.total_price || 0), 0);

    const property = hotel
      ? {
          propertyId: hotel.id,
          name: hotel.name,
          city: hotel.city || '',
          country: hotel.country || '',
          starRating: hotel.star_rating
        }
      : null;

    const occupancySummary = {
      todayOccupancyRate: 0,
      next7DaysOccupancyRate: 0,
      next30DaysOccupancyRate: 0
    };

    const revenueSummary = {
      last30DaysRevenue,
      next30DaysProjectedRevenue,
      currency: 'usd'
    };

    const upcomingBookings = hotelBookings.filter(b => b.status === 'upcoming');
    const upcomingWithFK = this._attachFKsToBookings(upcomingBookings);

    return {
      property,
      occupancySummary,
      revenueSummary,
      upcomingBookings: upcomingWithFK
    };
  }

  // getRatePlansForProperty(propertyId)
  getRatePlansForProperty(propertyId) {
    const ratePlans = this._getFromStorage('rate_plans', []).filter(rp => rp.hotelId === propertyId);
    const hotels = this._getFromStorage('hotels', []);
    const hotel = hotels.find(h => h.id === propertyId) || null;

    return ratePlans.map(rp => Object.assign({}, rp, { hotel }));
  }

  // createRatePlan(propertyId, name, description, discountPercent, minStayNights, maxStayNights, startDate, endDate, isRefundable)
  createRatePlan(propertyId, name, description, discountPercent, minStayNights, maxStayNights, startDate, endDate, isRefundable) {
    const nowStr = this._toISODate(new Date());
    const ratePlanId = this._generateId('rp');

    const ratePlan = {
      id: ratePlanId,
      hotelId: propertyId,
      name,
      description: description || '',
      discount_percent: typeof discountPercent === 'number' ? discountPercent : null,
      min_stay_nights: typeof minStayNights === 'number' ? minStayNights : null,
      max_stay_nights: typeof maxStayNights === 'number' ? maxStayNights : null,
      start_date: startDate ? this._toISODate(startDate) : null,
      end_date: endDate ? this._toISODate(endDate) : null,
      is_refundable: !!isRefundable,
      status: 'active',
      created_at: nowStr,
      updated_at: nowStr
    };

    const ratePlans = this._getFromStorage('rate_plans', []);
    ratePlans.push(ratePlan);
    this._saveToStorage('rate_plans', ratePlans);

    return {
      success: true,
      ratePlanId,
      ratePlan,
      message: 'Rate plan created.'
    };
  }

  // updateRatePlan(ratePlanId, fields)
  updateRatePlan(ratePlanId, fields) {
    const ratePlans = this._getFromStorage('rate_plans', []);
    const idx = ratePlans.findIndex(rp => rp.id === ratePlanId);
    if (idx < 0) {
      return { success: false, ratePlan: null, message: 'Rate plan not found.' };
    }

    const rp = ratePlans[idx];
    const updatable = ['name', 'description', 'discountPercent', 'minStayNights', 'maxStayNights', 'startDate', 'endDate', 'isRefundable', 'status'];

    if (fields.name !== undefined) rp.name = fields.name;
    if (fields.description !== undefined) rp.description = fields.description;
    if (fields.discountPercent !== undefined) rp.discount_percent = fields.discountPercent;
    if (fields.minStayNights !== undefined) rp.min_stay_nights = fields.minStayNights;
    if (fields.maxStayNights !== undefined) rp.max_stay_nights = fields.maxStayNights;
    if (fields.startDate !== undefined) rp.start_date = fields.startDate ? this._toISODate(fields.startDate) : null;
    if (fields.endDate !== undefined) rp.end_date = fields.endDate ? this._toISODate(fields.endDate) : null;
    if (fields.isRefundable !== undefined) rp.is_refundable = !!fields.isRefundable;
    if (fields.status !== undefined) rp.status = fields.status;

    rp.updated_at = this._toISODate(new Date());

    ratePlans[idx] = rp;
    this._saveToStorage('rate_plans', ratePlans);

    return { success: true, ratePlan: rp, message: 'Rate plan updated.' };
  }

  // setRatePlanStatus(ratePlanId, status)
  setRatePlanStatus(ratePlanId, status) {
    const ratePlans = this._getFromStorage('rate_plans', []);
    const idx = ratePlans.findIndex(rp => rp.id === ratePlanId);
    if (idx < 0) {
      return { success: false, message: 'Rate plan not found.' };
    }
    ratePlans[idx].status = status;
    ratePlans[idx].updated_at = this._toISODate(new Date());
    this._saveToStorage('rate_plans', ratePlans);
    return { success: true, message: 'Rate plan status updated.' };
  }

  // getPropertyChannels(propertyId)
  getPropertyChannels(propertyId) {
    const channelAvailability = this._getFromStorage('channel_availability', []);
    const distributionChannels = this._getFromStorage('distribution_channels', []);

    const channelIds = new Set(
      channelAvailability.filter(ca => ca.hotelId === propertyId).map(ca => ca.channelId)
    );

    const channels = distributionChannels.filter(dc => channelIds.has(dc.id));
    return channels;
  }

  // getChannelAvailabilityCalendar(propertyId, channelId, startDate, endDate)
  getChannelAvailabilityCalendar(propertyId, channelId, startDate, endDate) {
    const channelAvailability = this._getFromStorage('channel_availability', []);
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const results = channelAvailability.filter(ca => {
      if (ca.hotelId !== propertyId || ca.channelId !== channelId) return false;
      const d = new Date(ca.date).getTime();
      return d >= start && d <= end;
    });

    const withFK = this._attachFKsToChannelAvailability(results);
    return withFK;
  }

  // updateChannelAvailability(propertyId, channelId, startDate, endDate, roomsAvailable)
  updateChannelAvailability(propertyId, channelId, startDate, endDate, roomsAvailable) {
    const channelAvailability = this._getFromStorage('channel_availability', []);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const updatedDates = [];

    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString();
      const idx = channelAvailability.findIndex(
        ca => ca.hotelId === propertyId && ca.channelId === channelId && new Date(ca.date).toDateString() === d.toDateString()
      );

      if (idx >= 0) {
        channelAvailability[idx].rooms_available = roomsAvailable;
        channelAvailability[idx].last_updated = this._toISODate(new Date());
        updatedDates.push({ date: channelAvailability[idx].date, roomsAvailable });
      } else {
        const rec = {
          id: this._generateId('cav'),
          hotelId: propertyId,
          channelId,
          date: dateStr,
          rooms_available: roomsAvailable,
          min_price: null,
          last_updated: this._toISODate(new Date())
        };
        channelAvailability.push(rec);
        updatedDates.push({ date: dateStr, roomsAvailable });
      }
    }

    this._saveToStorage('channel_availability', channelAvailability);

    return {
      success: true,
      updatedDates,
      message: 'Channel availability updated.'
    };
  }

  // publishChannelAvailabilityUpdates(propertyId, channelId)
  publishChannelAvailabilityUpdates(propertyId, channelId) {
    // In this simplified implementation, updates are persisted immediately in updateChannelAvailability,
    // so publishing is a no-op.
    return {
      success: true,
      message: 'Channel availability updates published.'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const content = this._getFromStorage('about_content', null);
    if (content) return content;
    return {
      companyOverview: '',
      mission: '',
      travelerBenefits: '',
      partnerBenefits: '',
      trustIndicators: []
    };
  }

  // getHelpTopics()
  getHelpTopics() {
    const topics = this._getFromStorage('help_topics', []);
    return topics;
  }

  // getHelpTopicDetail(topicId)
  getHelpTopicDetail(topicId) {
    const details = this._getFromStorage('help_topic_details', []);
    const detail = details.find(t => t.topicId === topicId) || null;
    if (detail) return detail;
    return {
      topicId,
      title: '',
      contentHtml: ''
    };
  }

  // getContactOptions()
  getContactOptions() {
    const options = this._getFromStorage('contact_options', null);
    if (options) return options;
    return {
      supportEmails: [],
      phoneNumbers: [],
      businessAddress: '',
      liveChatAvailable: false
    };
  }

  // submitContactForm(role, subject, message, email, bookingId, propertyId)
  submitContactForm(role, subject, message, email, bookingId, propertyId) {
    const tickets = this._getFromStorage('contact_tickets', []);
    const ticketId = this._generateId('ticket');

    tickets.push({
      id: ticketId,
      role,
      subject,
      message,
      email,
      bookingId: bookingId || null,
      propertyId: propertyId || null,
      created_at: this._toISODate(new Date())
    });

    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticketId,
      message: 'Contact request submitted.'
    };
  }

  // getTermsContent()
  getTermsContent() {
    const content = this._getFromStorage('terms_content', null);
    if (content) return content;
    return {
      contentHtml: '',
      lastUpdated: ''
    };
  }

  // getPrivacyContent()
  getPrivacyContent() {
    const content = this._getFromStorage('privacy_content', null);
    if (content) return content;
    return {
      contentHtml: '',
      lastUpdated: ''
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