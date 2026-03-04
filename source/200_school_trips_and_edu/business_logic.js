// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  _initStorage() {
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensureKey("trips", []);
    ensureKey("destinations", []);
    ensureKey("activities", []);
    ensureKey("custom_trips", []);
    ensureKey("carts", []);
    ensureKey("cart_items", []);
    ensureKey("wishlists", []);
    ensureKey("wishlist_items", []);
    ensureKey("bookings", []);
    ensureKey("booking_participants", []);
    ensureKey("quote_requests", []);

    // Users & session
    ensureKey("users", []);
    ensureKey("session", JSON.stringify({}));

    // Content / auxiliary
    ensureKey("about_page_content", JSON.stringify({ title: "", sections: [] }));
    ensureKey("contact_info", JSON.stringify({ email: "", phone: "", office_hours: "", address: "" }));
    ensureKey("contact_submissions", []);
    ensureKey("faqs", JSON.stringify({ faqs: [] }));
    ensureKey("how_it_works_content", JSON.stringify({ sections: [] }));
    ensureKey("help_support_content", JSON.stringify({ quick_links: [], troubleshooting_tips: [] }));
    ensureKey("terms_and_conditions_content", JSON.stringify({ title: "", sections: [] }));
    ensureKey("privacy_policy_content", JSON.stringify({ title: "", sections: [] }));

    // ID counter
    if (localStorage.getItem("idCounter") === null) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _getCurrentUserSession() {
    const raw = localStorage.getItem("session");
    let session;
    try {
      session = raw ? JSON.parse(raw) : {};
    } catch (e) {
      session = {};
    }
    if (!session || typeof session !== "object") {
      session = {};
    }
    return session;
  }

  _saveCurrentUserSession(session) {
    localStorage.setItem("session", JSON.stringify(session || {}));
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage("carts", []);
    let session = this._getCurrentUserSession();
    let cart = null;

    if (session.cartId) {
      cart = carts.find(c => c.id === session.cartId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId("cart"),
        item_ids: [],
        total_price: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      session.cartId = cart.id;
      this._saveToStorage("carts", carts);
      this._saveCurrentUserSession(session);
    }

    return cart;
  }

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage("wishlists", []);
    let session = this._getCurrentUserSession();
    let wishlist = null;

    if (session.wishlistId) {
      wishlist = wishlists.find(w => w.id === session.wishlistId) || null;
    }

    if (!wishlist) {
      wishlist = {
        id: this._generateId("wishlist"),
        item_ids: [],
        created_at: this._now()
      };
      wishlists.push(wishlist);
      session.wishlistId = wishlist.id;
      this._saveToStorage("wishlists", wishlists);
      this._saveCurrentUserSession(session);
    }

    return wishlist;
  }

  _calculateTripSelectionPricing(trip, selection, customTrip) {
    const groupSize = selection && typeof selection.group_size_students === "number"
      ? selection.group_size_students
      : 0;
    let price_per_student = 0;
    let total_price = 0;
    let currency = (trip && trip.currency) || (customTrip && customTrip.currency) || "USD";

    if (customTrip) {
      const base = customTrip.base_price_per_student || 0;
      const activities = customTrip.activities_price_per_student || 0;
      const totalPerStudent = customTrip.total_price_per_student || (base + activities);
      price_per_student = totalPerStudent;
      total_price = totalPerStudent * groupSize;
    } else if (trip) {
      if (trip.trip_type === "bus_hire_service") {
        total_price = typeof trip.total_price === "number" ? trip.total_price : 0;
        price_per_student = groupSize > 0 ? total_price / groupSize : 0;
      } else {
        const perStudent = typeof trip.current_price_per_student === "number"
          ? trip.current_price_per_student
          : (typeof trip.base_price_per_student === "number"
            ? trip.base_price_per_student
            : 0);
        price_per_student = perStudent;
        total_price = perStudent * groupSize;
      }
    }

    return {
      price_per_student,
      total_price,
      currency
    };
  }

  _updateBookingTotalsFromParticipants(booking) {
    if (!booking) return booking;

    const participants = this._getFromStorage("booking_participants", [])
      .filter(p => p.booking_id === booking.id);

    if (participants.length > 0) {
      const numStudents = participants.filter(p => p.role === "student").length;
      const numChaperones = participants.filter(p =>
        p.role === "teacher_chaperone" || p.role === "parent_chaperone"
      ).length;

      booking.num_students = numStudents;
      booking.num_chaperones = numChaperones;
      if (typeof booking.price_per_student === "number") {
        booking.total_price = booking.price_per_student * numStudents;
      }
    }

    const bookings = this._getFromStorage("bookings", []);
    const idx = bookings.findIndex(b => b.id === booking.id);
    if (idx >= 0) {
      bookings[idx] = booking;
      this._saveToStorage("bookings", bookings);
    }

    return booking;
  }

  _mapCategoryIdToName(categoryId) {
    const map = {
      school_trips: "School Trips",
      educational_tours: "Educational Tours",
      city_trips: "City Trips",
      bus_hire: "Bus Hire",
      special_offers: "Special Offers",
      international_tours: "International Tours"
    };
    return map[categoryId] || "";
  }

  _mapThemeToName(theme) {
    const map = {
      museums_galleries: "Museums & Galleries",
      science_technology: "Science & Technology",
      art_culture: "Art & Culture",
      history: "History",
      city_tours: "City Tours",
      general_education: "General Education",
      other: "Other"
    };
    return map[theme] || "";
  }

  _mapGradeLevelToLabel(value) {
    const map = {
      kindergarten: "Kindergarten",
      grade_1: "Grade 1",
      grade_2: "Grade 2",
      grade_3: "Grade 3",
      grade_4: "Grade 4",
      grade_5: "Grade 5",
      grade_6: "Grade 6",
      grade_7: "Grade 7",
      grade_8: "Grade 8",
      grade_9: "Grade 9",
      grade_10: "Grade 10",
      grade_11: "Grade 11",
      grade_12: "Grade 12",
      mixed: "Mixed grades"
    };
    return map[value] || "";
  }

  _mapStatusToLabel(status) {
    const map = {
      pending: "Pending",
      confirmed: "Confirmed",
      reserved: "Reserved",
      cancelled: "Cancelled"
    };
    return map[status] || "";
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // ========== Interface Implementations ==========

  // getTripCategoriesForHome()
  getTripCategoriesForHome() {
    return [
      {
        category_id: "school_trips",
        name: "School Trips",
        description: "Day trips and curriculum-linked excursions for primary and secondary schools."
      },
      {
        category_id: "educational_tours",
        name: "Educational Tours",
        description: "Multi-day subject-focused tours and camps."
      },
      {
        category_id: "city_trips",
        name: "City Trips",
        description: "Core city packages with customizable activities and workshops."
      },
      {
        category_id: "bus_hire",
        name: "Bus Hire",
        description: "Transport-only options including local and multi-day transfers."
      },
      {
        category_id: "special_offers",
        name: "Special Offers",
        description: "Last-minute deals and discounted trips."
      },
      {
        category_id: "international_tours",
        name: "International Tours",
        description: "Overseas educational tours including language, history, and culture."
      }
    ];
  }

  // getUserHeaderSummary()
  getUserHeaderSummary() {
    const session = this._getCurrentUserSession();
    const carts = this._getFromStorage("carts", []);
    const wishlists = this._getFromStorage("wishlists", []);
    const bookings = this._getFromStorage("bookings", []);

    let cartItemCount = 0;
    if (session.cartId) {
      const cart = carts.find(c => c.id === session.cartId);
      if (cart && Array.isArray(cart.item_ids)) {
        cartItemCount = cart.item_ids.length;
      }
    }

    let wishlistItemCount = 0;
    if (session.wishlistId) {
      const wishlist = wishlists.find(w => w.id === session.wishlistId);
      if (wishlist && Array.isArray(wishlist.item_ids)) {
        wishlistItemCount = wishlist.item_ids.length;
      }
    }

    const now = new Date();
    const upcomingBookingCount = bookings.filter(b => {
      if (b.status === "cancelled") return false;
      const dateStr = b.start_date || b.selected_date;
      const d = this._parseDate(dateStr);
      if (!d) return true;
      return d >= now;
    }).length;

    return {
      cart_item_count: cartItemCount,
      wishlist_item_count: wishlistItemCount,
      upcoming_booking_count: upcomingBookingCount
    };
  }

  // getHomeOverview()
  getHomeOverview() {
    const trips = this._getFromStorage("trips", []);

    // Featured trips: non-special-offer ordered by average_rating desc, then rating_count
    const featuredTrips = trips
      .filter(t => !t.is_special_offer)
      .sort((a, b) => {
        const ar = b.average_rating || 0;
        const br = a.average_rating || 0;
        if (ar !== br) return ar - br;
        const ac = b.rating_count || 0;
        const bc = a.rating_count || 0;
        return ac - bc;
      })
      .slice(0, 5);

    // Special offer trips: is_special_offer true, ordered by discount_percentage desc
    const specialOfferTrips = trips
      .filter(t => !!t.is_special_offer)
      .sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0))
      .slice(0, 5);

    // Spec expects arrays of Trip; we do not resolve foreign keys here to keep contract.
    return {
      featured_trips: featuredTrips,
      special_offer_trips: specialOfferTrips
    };
  }

  // getTripFilterOptions(categoryId, searchQuery)
  getTripFilterOptions(categoryId, searchQuery) {
    const trips = this._getFromStorage("trips", []);
    let filteredTrips = trips;

    if (categoryId) {
      filteredTrips = filteredTrips.filter(t => t.category_id === categoryId);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredTrips = filteredTrips.filter(t => {
        if (t.title && t.title.toLowerCase().includes(q)) return true;
        if (t.short_description && t.short_description.toLowerCase().includes(q)) return true;
        if (t.long_description && t.long_description.toLowerCase().includes(q)) return true;
        if (Array.isArray(t.keywords)) {
          return t.keywords.some(k => (k || "").toLowerCase().includes(q));
        }
        return false;
      });
    }

    const pricePerStudentValues = filteredTrips
      .map(t => typeof t.current_price_per_student === "number" ? t.current_price_per_student : t.base_price_per_student)
      .filter(v => typeof v === "number");

    const totalPriceValues = filteredTrips
      .map(t => t.total_price)
      .filter(v => typeof v === "number");

    const price_per_student_range = {
      min: pricePerStudentValues.length ? Math.min(...pricePerStudentValues) : 0,
      max: pricePerStudentValues.length ? Math.max(...pricePerStudentValues) : 2000,
      step: 5,
      currency: "USD"
    };

    const total_price_range = {
      min: totalPriceValues.length ? Math.min(...totalPriceValues) : 0,
      max: totalPriceValues.length ? Math.max(...totalPriceValues) : 10000,
      step: 50,
      currency: "USD"
    };

    const themes = [
      { value: "museums_galleries", label: "Museums & Galleries" },
      { value: "science_technology", label: "Science & Technology" },
      { value: "art_culture", label: "Art & Culture" },
      { value: "history", label: "History" },
      { value: "city_tours", label: "City Tours" },
      { value: "general_education", label: "General Education" },
      { value: "other", label: "Other" }
    ];

    const grade_levels = [
      "kindergarten",
      "grade_1",
      "grade_2",
      "grade_3",
      "grade_4",
      "grade_5",
      "grade_6",
      "grade_7",
      "grade_8",
      "grade_9",
      "grade_10",
      "grade_11",
      "grade_12",
      "mixed"
    ].map(v => ({
      value: v,
      label: this._mapGradeLevelToLabel(v)
    }));

    const durations = [
      { value: "1_day", label: "1 day", duration_days: 1, duration_nights: 0 },
      { value: "2_days_1_night", label: "2 days / 1 night", duration_days: 2, duration_nights: 1 },
      { value: "3_days_2_nights", label: "3 days / 2 nights", duration_days: 3, duration_nights: 2 },
      { value: "5_days_4_nights", label: "5 days / 4 nights", duration_days: 5, duration_nights: 4 },
      { value: "7_days_6_nights", label: "7 days / 6 nights", duration_days: 7, duration_nights: 6 }
    ];

    const workshops_options = [
      { value: 1, label: "1 or more" },
      { value: 2, label: "2 or more" },
      { value: 3, label: "3 or more" }
    ];

    const discount_options = [
      { value: 10, label: "10% or more" },
      { value: 20, label: "20% or more" },
      { value: 30, label: "30% or more" }
    ];

    const rating_options = [
      { value: 3, label: "3 stars & up" },
      { value: 4, label: "4 stars & up" },
      { value: 4.5, label: "4.5 stars & up" }
    ];

    const operator_rating_options = [
      { value: 3, label: "3 stars & up" },
      { value: 4, label: "4 stars & up" },
      { value: 4.5, label: "4.5 stars & up" }
    ];

    const region_categories = [
      { value: "local_region", label: "Local region" },
      { value: "within_state", label: "Within state" },
      { value: "out_of_state", label: "Out of state" },
      { value: "international", label: "International" }
    ];

    const sort_options = [
      { value: "price_low_to_high", label: "Price: Low to High" },
      { value: "price_high_to_low", label: "Price: High to Low" },
      { value: "rating_high_to_low", label: "Rating: High to Low" },
      { value: "discount_high_to_low", label: "Discount: High to Low" },
      { value: "student_rating_high_to_low", label: "Student rating: High to Low" }
    ];

    const group_size_range = {
      min: 1,
      max: 200,
      step: 1
    };

    const destinations = this._getFromStorage("destinations", []);

    return {
      themes,
      destinations,
      durations,
      grade_levels,
      price_per_student_range,
      total_price_range,
      workshops_options,
      discount_options,
      rating_options,
      operator_rating_options,
      region_categories,
      sort_options,
      group_size_range
    };
  }

  // searchTrips(categoryId, searchQuery, filters, sortBy, page, pageSize)
  searchTrips(categoryId, searchQuery, filters, sortBy, page, pageSize) {
    const trips = this._getFromStorage("trips", []);
    const destinations = this._getFromStorage("destinations", []);
    let resultsTrips = trips.slice();

    if (categoryId) {
      resultsTrips = resultsTrips.filter(t => t.category_id === categoryId);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      resultsTrips = resultsTrips.filter(t => {
        if (t.title && t.title.toLowerCase().includes(q)) return true;
        if (t.short_description && t.short_description.toLowerCase().includes(q)) return true;
        if (t.long_description && t.long_description.toLowerCase().includes(q)) return true;
        if (Array.isArray(t.keywords) && t.keywords.some(k => (k || "").toLowerCase().includes(q))) {
          return true;
        }
        const dest = destinations.find(d => d.id === t.destination_id);
        if (dest) {
          if (dest.name && dest.name.toLowerCase().includes(q)) return true;
          if (dest.city && dest.city.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    filters = filters || {};

    // Theme
    if (filters.theme) {
      resultsTrips = resultsTrips.filter(t => t.theme === filters.theme);
    }

    // Trip type
    if (filters.trip_type) {
      resultsTrips = resultsTrips.filter(t => t.trip_type === filters.trip_type);
    }

    // Destination
    if (filters.destinationId) {
      resultsTrips = resultsTrips.filter(t => t.destination_id === filters.destinationId);
    }

    // Region category via Destination
    if (filters.region_category) {
      resultsTrips = resultsTrips.filter(t => {
        const dest = destinations.find(d => d.id === t.destination_id);
        return dest && dest.region_category === filters.region_category;
      });
    }

    // Duration
    if (typeof filters.duration_days_min === "number") {
      resultsTrips = resultsTrips.filter(t => t.duration_days >= filters.duration_days_min);
    }
    if (typeof filters.duration_days_max === "number") {
      resultsTrips = resultsTrips.filter(t => t.duration_days <= filters.duration_days_max);
    }
    if (typeof filters.duration_nights_min === "number") {
      resultsTrips = resultsTrips.filter(t => t.duration_nights >= filters.duration_nights_min);
    }
    if (typeof filters.duration_nights_max === "number") {
      resultsTrips = resultsTrips.filter(t => t.duration_nights <= filters.duration_nights_max);
    }

    // Grade level
    if (filters.grade_level) {
      resultsTrips = resultsTrips.filter(t =>
        Array.isArray(t.grade_levels) ? t.grade_levels.includes(filters.grade_level) : true
      );
    }

    // Group size
    if (typeof filters.group_size === "number") {
      resultsTrips = resultsTrips.filter(t => {
        const min = typeof t.min_group_size === "number" ? t.min_group_size : 0;
        const max = typeof t.max_group_size === "number" ? t.max_group_size : Infinity;
        return filters.group_size >= min && filters.group_size <= max;
      });
    }

    // Price per student
    if (typeof filters.price_per_student_min === "number") {
      resultsTrips = resultsTrips.filter(t => {
        const price = typeof t.current_price_per_student === "number"
          ? t.current_price_per_student
          : t.base_price_per_student;
        if (typeof price !== "number") return false;
        return price >= filters.price_per_student_min;
      });
    }
    if (typeof filters.price_per_student_max === "number") {
      resultsTrips = resultsTrips.filter(t => {
        const price = typeof t.current_price_per_student === "number"
          ? t.current_price_per_student
          : t.base_price_per_student;
        if (typeof price !== "number") return false;
        return price <= filters.price_per_student_max;
      });
    }

    // Total price
    if (typeof filters.total_price_min === "number") {
      resultsTrips = resultsTrips.filter(t => {
        if (typeof t.total_price !== "number") return false;
        return t.total_price >= filters.total_price_min;
      });
    }
    if (typeof filters.total_price_max === "number") {
      resultsTrips = resultsTrips.filter(t => {
        if (typeof t.total_price !== "number") return false;
        return t.total_price <= filters.total_price_max;
      });
    }

    // Workshops count
    if (typeof filters.workshops_count_min === "number") {
      resultsTrips = resultsTrips.filter(t =>
        typeof t.workshops_count === "number" && t.workshops_count >= filters.workshops_count_min
      );
    }

    // Discount percentage
    if (typeof filters.discount_percentage_min === "number") {
      resultsTrips = resultsTrips.filter(t =>
        typeof t.discount_percentage === "number" && t.discount_percentage >= filters.discount_percentage_min
      );
    }

    // Average rating
    if (typeof filters.average_rating_min === "number") {
      resultsTrips = resultsTrips.filter(t =>
        typeof t.average_rating === "number" && t.average_rating >= filters.average_rating_min
      );
    }

    // Operator rating
    if (typeof filters.operator_rating_min === "number") {
      resultsTrips = resultsTrips.filter(t =>
        typeof t.operator_rating === "number" && t.operator_rating >= filters.operator_rating_min
      );
    }

    // Includes flights
    if (typeof filters.includes_flights === "boolean") {
      resultsTrips = resultsTrips.filter(t =>
        !!t.includes_flights === filters.includes_flights
      );
    }

    // Hotel rating
    if (typeof filters.hotel_rating_min === "number") {
      resultsTrips = resultsTrips.filter(t =>
        typeof t.hotel_rating === "number" && t.hotel_rating >= filters.hotel_rating_min
      );
    }

    // Special offer flag
    if (filters.is_special_offer_only) {
      resultsTrips = resultsTrips.filter(t => !!t.is_special_offer);
    }

    // Departure date filters via Trip.available_from/to
    if (filters.departure_date_exact) {
      const exactDate = this._parseDate(filters.departure_date_exact);
      if (exactDate) {
        const exactTime = exactDate.getTime();
        resultsTrips = resultsTrips.filter(t => {
          const from = this._parseDate(t.available_from);
          const to = this._parseDate(t.available_to);
          if (from && to) {
            return exactTime >= from.getTime() && exactTime <= to.getTime();
          } else if (from) {
            return exactTime >= from.getTime();
          } else if (to) {
            return exactTime <= to.getTime();
          }
          return true;
        });
      }
    } else {
      if (filters.departure_date_from) {
        const fromDate = this._parseDate(filters.departure_date_from);
        if (fromDate) {
          const fromTime = fromDate.getTime();
          resultsTrips = resultsTrips.filter(t => {
            const to = this._parseDate(t.available_to);
            if (to) {
              return to.getTime() >= fromTime;
            }
            return true;
          });
        }
      }
      if (filters.departure_date_to) {
        const toDate = this._parseDate(filters.departure_date_to);
        if (toDate) {
          const toTime = toDate.getTime();
          resultsTrips = resultsTrips.filter(t => {
            const from = this._parseDate(t.available_from);
            if (from) {
              return from.getTime() <= toTime;
            }
            return true;
          });
        }
      }
    }

    // Service type
    if (filters.service_type) {
      resultsTrips = resultsTrips.filter(t => t.service_type === filters.service_type);
    }

    // Sorting
    if (sortBy) {
      const getPricePerStudent = t =>
        typeof t.current_price_per_student === "number"
          ? t.current_price_per_student
          : (typeof t.base_price_per_student === "number" ? t.base_price_per_student : 0);

      if (sortBy === "price_low_to_high") {
        resultsTrips.sort((a, b) => getPricePerStudent(a) - getPricePerStudent(b));
      } else if (sortBy === "price_high_to_low") {
        resultsTrips.sort((a, b) => getPricePerStudent(b) - getPricePerStudent(a));
      } else if (sortBy === "rating_high_to_low") {
        resultsTrips.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      } else if (sortBy === "discount_high_to_low") {
        resultsTrips.sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
      } else if (sortBy === "student_rating_high_to_low") {
        resultsTrips.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      }
    }

    // Pagination
    const total_results = resultsTrips.length;
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (pg - 1) * size;
    const endIndex = startIndex + size;
    const pagedTrips = resultsTrips.slice(startIndex, endIndex);

    const results = pagedTrips.map(trip => {
      const destination = destinations.find(d => d.id === trip.destination_id) || null;
      const category_name = this._mapCategoryIdToName(trip.category_id);
      const theme_name = this._mapThemeToName(trip.theme);
      const rating_summary = {
        average_rating: trip.average_rating || 0,
        rating_count: trip.rating_count || 0
      };
      const price_display = {
        price_per_student: typeof trip.current_price_per_student === "number"
          ? trip.current_price_per_student
          : (typeof trip.base_price_per_student === "number" ? trip.base_price_per_student : null),
        total_price: typeof trip.total_price === "number" ? trip.total_price : null,
        currency: trip.currency || "USD",
        discount_percentage: trip.discount_percentage || 0
      };
      return {
        trip,
        destination,
        category_name,
        theme_name,
        rating_summary,
        price_display
      };
    });

    return {
      results,
      total_results,
      page: pg,
      page_size: size
    };
  }

  // getTripDetails(tripId)
  getTripDetails(tripId) {
    const trips = this._getFromStorage("trips", []);
    const destinations = this._getFromStorage("destinations", []);
    const trip = trips.find(t => t.id === tripId);
    if (!trip) {
      return null;
    }
    const destination = destinations.find(d => d.id === trip.destination_id) || null;
    const category_name = this._mapCategoryIdToName(trip.category_id);
    const theme_name = this._mapThemeToName(trip.theme);
    const grade_level_labels = Array.isArray(trip.grade_levels)
      ? trip.grade_levels.map(g => this._mapGradeLevelToLabel(g))
      : [];
    const price_display = {
      price_per_student: typeof trip.current_price_per_student === "number"
        ? trip.current_price_per_student
        : (typeof trip.base_price_per_student === "number" ? trip.base_price_per_student : null),
      total_price: typeof trip.total_price === "number" ? trip.total_price : null,
      currency: trip.currency || "USD",
      discount_percentage: trip.discount_percentage || 0
    };
    const availability = {
      available_from: trip.available_from || null,
      available_to: trip.available_to || null
    };
    const can_customize = trip.trip_type === "city_core_package";

    return {
      trip,
      destination,
      category_name,
      theme_name,
      grade_level_labels,
      price_display,
      workshops_count: trip.workshops_count || 0,
      operator_name: trip.operator_name || null,
      operator_rating: trip.operator_rating || null,
      hotel_rating: trip.hotel_rating || null,
      availability,
      images: trip.images || [],
      itinerary_days: trip.itinerary_days || [],
      is_special_offer: !!trip.is_special_offer,
      can_customize
    };
  }

  // addTripToCart(tripId, configuration)
  addTripToCart(tripId, configuration) {
    const trips = this._getFromStorage("trips", []);
    const trip = trips.find(t => t.id === tripId);
    if (!trip) {
      return { success: false, cart: null, added_item: null, message: "Trip not found" };
    }

    if (!configuration || typeof configuration.group_size_students !== "number") {
      return { success: false, cart: null, added_item: null, message: "group_size_students is required" };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    const selection = {
      group_size_students: configuration.group_size_students
    };
    const pricing = this._calculateTripSelectionPricing(trip, selection, null);

    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      trip_id: trip.id,
      custom_trip_id: null,
      selected_date: configuration.selected_date || null,
      start_date: configuration.start_date || null,
      end_date: configuration.end_date || null,
      departure_time: configuration.departure_time || null,
      group_size_students: configuration.group_size_students,
      group_size_chaperones: configuration.group_size_chaperones || 0,
      grade_level: configuration.grade_level || null,
      price_per_student: pricing.price_per_student,
      total_price: pricing.total_price,
      created_at: this._now()
    };

    cartItems.push(cartItem);
    const carts = this._getFromStorage("carts", []);
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      const updatedIds = Array.isArray(carts[cartIndex].item_ids) ? carts[cartIndex].item_ids.slice() : [];
      updatedIds.push(cartItem.id);
      carts[cartIndex].item_ids = updatedIds;
      carts[cartIndex].total_price = (carts[cartIndex].total_price || 0) + pricing.total_price;
      carts[cartIndex].updated_at = this._now();
      this._saveToStorage("carts", carts);
    }

    this._saveToStorage("cart_items", cartItems);

    return {
      success: true,
      cart: carts.find(c => c.id === cart.id),
      added_item: cartItem,
      message: "Trip added to cart"
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage("carts", []);
    const cartItems = this._getFromStorage("cart_items", []);
    const customTrips = this._getFromStorage("custom_trips", []);
    const trips = this._getFromStorage("trips", []);
    const destinations = this._getFromStorage("destinations", []);

    const itemsForCart = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
    const items = itemsForCart.map(ci => {
      const trip = ci.trip_id ? trips.find(t => t.id === ci.trip_id) || null : null;
      const custom_trip = ci.custom_trip_id ? customTrips.find(ct => ct.id === ci.custom_trip_id) || null : null;
      let destination = null;
      if (trip && trip.destination_id) {
        destination = destinations.find(d => d.id === trip.destination_id) || null;
      } else if (custom_trip) {
        const baseTrip = trips.find(t => t.id === custom_trip.base_trip_id);
        if (baseTrip && baseTrip.destination_id) {
          destination = destinations.find(d => d.id === baseTrip.destination_id) || null;
        }
      }
      const price_display = {
        price_per_student: ci.price_per_student || null,
        total_price: ci.total_price || 0,
        currency: (trip && trip.currency) || (custom_trip && custom_trip.currency) || "USD"
      };
      return {
        cart_item: ci,
        trip,
        custom_trip,
        destination,
        price_display
      };
    });

    const total_price = items.reduce((sum, i) => sum + (i.price_display.total_price || 0), 0);
    const currency = items[0] ? items[0].price_display.currency : "USD";

    const updatedCarts = carts.slice();
    const idx = updatedCarts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      updatedCarts[idx].total_price = total_price;
      updatedCarts[idx].updated_at = this._now();
      this._saveToStorage("carts", updatedCarts);
    }

    return {
      cart: updatedCarts.find(c => c.id === cart.id) || cart,
      items,
      totals: {
        total_price,
        currency
      }
    };
  }

  // updateCartItemGroupSize(cartItemId, group_size_students, group_size_chaperones)
  updateCartItemGroupSize(cartItemId, group_size_students, group_size_chaperones) {
    const cartItems = this._getFromStorage("cart_items", []);
    const trips = this._getFromStorage("trips", []);
    const customTrips = this._getFromStorage("custom_trips", []);
    const carts = this._getFromStorage("carts", []);

    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex < 0) {
      return { success: false, cart: null, updated_item: null, message: "Cart item not found" };
    }

    const item = cartItems[itemIndex];
    const trip = item.trip_id ? trips.find(t => t.id === item.trip_id) || null : null;
    const customTrip = item.custom_trip_id ? customTrips.find(ct => ct.id === item.custom_trip_id) || null : null;

    const selection = { group_size_students };
    const pricing = this._calculateTripSelectionPricing(trip, selection, customTrip);

    item.group_size_students = group_size_students;
    item.group_size_chaperones = typeof group_size_chaperones === "number" ? group_size_chaperones : item.group_size_chaperones || 0;
    item.price_per_student = pricing.price_per_student;
    item.total_price = pricing.total_price;

    cartItems[itemIndex] = item;
    this._saveToStorage("cart_items", cartItems);

    const cart = carts.find(c => c.id === item.cart_id);
    if (cart) {
      const relatedItems = cartItems.filter(ci => ci.cart_id === cart.id);
      cart.total_price = relatedItems.reduce((sum, ci) => sum + (ci.total_price || 0), 0);
      cart.updated_at = this._now();
      const cartIndex = carts.findIndex(c => c.id === cart.id);
      carts[cartIndex] = cart;
      this._saveToStorage("carts", carts);
    }

    return {
      success: true,
      cart: carts.find(c => c.id === (item.cart_id)),
      updated_item: item,
      message: "Cart item updated"
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage("cart_items", []);
    const carts = this._getFromStorage("carts", []);

    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, message: "Cart item not found" };
    }

    const updatedCartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage("cart_items", updatedCartItems);

    const cartIndex = carts.findIndex(c => c.id === item.cart_id);
    if (cartIndex >= 0) {
      const cart = carts[cartIndex];
      cart.item_ids = (cart.item_ids || []).filter(id => id !== cartItemId);
      const relatedItems = updatedCartItems.filter(ci => ci.cart_id === cart.id);
      cart.total_price = relatedItems.reduce((sum, ci) => sum + (ci.total_price || 0), 0);
      cart.updated_at = this._now();
      carts[cartIndex] = cart;
      this._saveToStorage("carts", carts);
      return { success: true, cart, message: "Cart item removed" };
    }

    return { success: true, cart: null, message: "Cart item removed" };
  }

  // addTripToWishlist(tripId, customTripId)
  addTripToWishlist(tripId, customTripId) {
    if (!tripId && !customTripId) {
      return { success: false, wishlist: null, added_item: null, message: "tripId or customTripId is required" };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage("wishlist_items", []);
    const wishlists = this._getFromStorage("wishlists", []);

    // Avoid duplicates
    const existing = wishlistItems.find(wi =>
      wi.wishlist_id === wishlist.id &&
      wi.trip_id === (tripId || null) &&
      wi.custom_trip_id === (customTripId || null)
    );
    if (existing) {
      return { success: true, wishlist, added_item: existing, message: "Already in wishlist" };
    }

    const item = {
      id: this._generateId("wishlist_item"),
      wishlist_id: wishlist.id,
      trip_id: tripId || null,
      custom_trip_id: customTripId || null,
      date_added: this._now()
    };

    wishlistItems.push(item);
    this._saveToStorage("wishlist_items", wishlistItems);

    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) {
      const updatedIds = Array.isArray(wishlists[idx].item_ids) ? wishlists[idx].item_ids.slice() : [];
      updatedIds.push(item.id);
      wishlists[idx].item_ids = updatedIds;
      this._saveToStorage("wishlists", wishlists);
    }

    return {
      success: true,
      wishlist: wishlists.find(w => w.id === wishlist.id) || wishlist,
      added_item: item,
      message: "Added to wishlist"
    };
  }

  // removeTripFromWishlist(wishlistItemId)
  removeTripFromWishlist(wishlistItemId) {
    const wishlistItems = this._getFromStorage("wishlist_items", []);
    const wishlists = this._getFromStorage("wishlists", []);

    const item = wishlistItems.find(wi => wi.id === wishlistItemId);
    if (!item) {
      return { success: false, wishlist: null, message: "Wishlist item not found" };
    }

    const updatedItems = wishlistItems.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage("wishlist_items", updatedItems);

    const idx = wishlists.findIndex(w => w.id === item.wishlist_id);
    if (idx >= 0) {
      const w = wishlists[idx];
      w.item_ids = (w.item_ids || []).filter(id => id !== wishlistItemId);
      wishlists[idx] = w;
      this._saveToStorage("wishlists", wishlists);
      return { success: true, wishlist: w, message: "Removed from wishlist" };
    }

    return { success: true, wishlist: null, message: "Removed from wishlist" };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage("wishlist_items", []);
    const trips = this._getFromStorage("trips", []);
    const customTrips = this._getFromStorage("custom_trips", []);
    const destinations = this._getFromStorage("destinations", []);

    const itemsForWishlist = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id);

    const items = itemsForWishlist.map(wi => {
      const trip = wi.trip_id ? trips.find(t => t.id === wi.trip_id) || null : null;
      const custom_trip = wi.custom_trip_id ? customTrips.find(ct => ct.id === wi.custom_trip_id) || null : null;
      let destination = null;
      let price_per_student = null;
      let currency = "USD";
      let rating_summary = { average_rating: 0, rating_count: 0 };

      if (trip) {
        if (trip.destination_id) {
          destination = destinations.find(d => d.id === trip.destination_id) || null;
        }
        price_per_student = typeof trip.current_price_per_student === "number"
          ? trip.current_price_per_student
          : (typeof trip.base_price_per_student === "number" ? trip.base_price_per_student : null);
        currency = trip.currency || "USD";
        rating_summary = {
          average_rating: trip.average_rating || 0,
          rating_count: trip.rating_count || 0
        };
      } else if (custom_trip) {
        const baseTrip = trips.find(t => t.id === custom_trip.base_trip_id);
        if (baseTrip && baseTrip.destination_id) {
          destination = destinations.find(d => d.id === baseTrip.destination_id) || null;
        }
        const basePrice = custom_trip.base_price_per_student || 0;
        const actPrice = custom_trip.activities_price_per_student || 0;
        price_per_student = custom_trip.total_price_per_student || (basePrice + actPrice);
        currency = (baseTrip && baseTrip.currency) || "USD";
      }

      const price_display = {
        price_per_student,
        currency
      };

      return {
        wishlist_item: wi,
        trip,
        custom_trip,
        destination,
        price_display,
        rating_summary
      };
    });

    return {
      wishlist,
      items
    };
  }

  // startCustomTrip(baseTripId)
  startCustomTrip(baseTripId) {
    const customTrips = this._getFromStorage("custom_trips", []);
    const trips = this._getFromStorage("trips", []);
    const destinations = this._getFromStorage("destinations", []);

    const base_trip = trips.find(t => t.id === baseTripId);
    if (!base_trip) {
      return { custom_trip: null, base_trip: null, destination: null, selected_activities: [], price_details: null };
    }

    let custom_trip = customTrips.find(ct => ct.base_trip_id === baseTripId && ct.status === "draft") || null;

    if (!custom_trip) {
      const basePrice = typeof base_trip.current_price_per_student === "number"
        ? base_trip.current_price_per_student
        : (typeof base_trip.base_price_per_student === "number" ? base_trip.base_price_per_student : 0);
      custom_trip = {
        id: this._generateId("custom_trip"),
        base_trip_id: baseTripId,
        name: "",
        description: "",
        selected_activity_ids: [],
        base_price_per_student: basePrice,
        activities_price_per_student: 0,
        total_price_per_student: basePrice,
        created_at: this._now(),
        updated_at: null,
        status: "draft"
      };
      customTrips.push(custom_trip);
      this._saveToStorage("custom_trips", customTrips);
    }

    const selected_activities = [];
    const activities = this._getFromStorage("activities", []);
    if (Array.isArray(custom_trip.selected_activity_ids)) {
      custom_trip.selected_activity_ids.forEach(aid => {
        const act = activities.find(a => a.id === aid);
        if (act) selected_activities.push(act);
      });
    }

    const destination = base_trip.destination_id
      ? destinations.find(d => d.id === base_trip.destination_id) || null
      : null;

    const price_details = {
      base_price_per_student: custom_trip.base_price_per_student || 0,
      activities_price_per_student: custom_trip.activities_price_per_student || 0,
      total_price_per_student: custom_trip.total_price_per_student || 0,
      currency: base_trip.currency || "USD"
    };

    return {
      custom_trip,
      base_trip,
      destination,
      selected_activities,
      price_details
    };
  }

  // getCustomTripDetails(customTripId)
  getCustomTripDetails(customTripId) {
    const customTrips = this._getFromStorage("custom_trips", []);
    const trips = this._getFromStorage("trips", []);
    const destinations = this._getFromStorage("destinations", []);
    const activities = this._getFromStorage("activities", []);

    const custom_trip = customTrips.find(ct => ct.id === customTripId);
    if (!custom_trip) {
      return { custom_trip: null, base_trip: null, destination: null, selected_activities: [], price_details: null };
    }

    const base_trip = trips.find(t => t.id === custom_trip.base_trip_id) || null;
    const destination = base_trip && base_trip.destination_id
      ? destinations.find(d => d.id === base_trip.destination_id) || null
      : null;

    const selected_activities = [];
    if (Array.isArray(custom_trip.selected_activity_ids)) {
      custom_trip.selected_activity_ids.forEach(aid => {
        const act = activities.find(a => a.id === aid);
        if (act) selected_activities.push(act);
      });
    }

    const price_details = {
      base_price_per_student: custom_trip.base_price_per_student || 0,
      activities_price_per_student: custom_trip.activities_price_per_student || 0,
      total_price_per_student: custom_trip.total_price_per_student || 0,
      currency: base_trip ? (base_trip.currency || "USD") : "USD"
    };

    return {
      custom_trip,
      base_trip,
      destination,
      selected_activities,
      price_details
    };
  }

  // getAvailableActivitiesForCustomTrip(customTripId, filters)
  getAvailableActivitiesForCustomTrip(customTripId, filters) {
    const customTrips = this._getFromStorage("custom_trips", []);
    const trips = this._getFromStorage("trips", []);
    const activities = this._getFromStorage("activities", []);

    const custom_trip = customTrips.find(ct => ct.id === customTripId);
    if (!custom_trip) {
      return { activities: [] };
    }

    const base_trip = trips.find(t => t.id === custom_trip.base_trip_id);
    if (!base_trip) {
      return { activities: [] };
    }

    let available = activities.filter(a => {
      let destinationMatch = true;
      if (base_trip.destination_id && a.destination_id) {
        destinationMatch = a.destination_id === base_trip.destination_id;
      }
      let baseMatch = true;
      if (Array.isArray(a.base_trip_ids) && a.base_trip_ids.length > 0) {
        baseMatch = a.base_trip_ids.includes(base_trip.id);
      }
      return destinationMatch && baseMatch;
    });

    filters = filters || {};
    if (filters.activity_type) {
      available = available.filter(a => a.activity_type === filters.activity_type);
    }
    if (typeof filters.max_price_per_student === "number") {
      available = available.filter(a => a.price_per_student <= filters.max_price_per_student);
    }

    return { activities: available };
  }

  // addActivityToCustomTrip(customTripId, activityId)
  addActivityToCustomTrip(customTripId, activityId) {
    const customTrips = this._getFromStorage("custom_trips", []);
    const activities = this._getFromStorage("activities", []);

    const idx = customTrips.findIndex(ct => ct.id === customTripId);
    if (idx < 0) {
      return { success: false, custom_trip: null, selected_activities: [], price_details: null, message: "Custom trip not found" };
    }

    const activity = activities.find(a => a.id === activityId);
    if (!activity) {
      return { success: false, custom_trip: null, selected_activities: [], price_details: null, message: "Activity not found" };
    }

    const custom_trip = customTrips[idx];
    if (!Array.isArray(custom_trip.selected_activity_ids)) {
      custom_trip.selected_activity_ids = [];
    }
    if (!custom_trip.selected_activity_ids.includes(activityId)) {
      custom_trip.selected_activity_ids.push(activityId);
    }

    // Recalculate activity prices
    const selected_activities = custom_trip.selected_activity_ids
      .map(aid => activities.find(a => a.id === aid))
      .filter(Boolean);

    const activitiesPrice = selected_activities.reduce((sum, a) => sum + (a.price_per_student || 0), 0);
    custom_trip.activities_price_per_student = activitiesPrice;
    custom_trip.total_price_per_student = (custom_trip.base_price_per_student || 0) + activitiesPrice;
    custom_trip.updated_at = this._now();

    customTrips[idx] = custom_trip;
    this._saveToStorage("custom_trips", customTrips);

    const base_trip = this._getFromStorage("trips", []).find(t => t.id === custom_trip.base_trip_id) || null;
    const price_details = {
      base_price_per_student: custom_trip.base_price_per_student || 0,
      activities_price_per_student: custom_trip.activities_price_per_student || 0,
      total_price_per_student: custom_trip.total_price_per_student || 0,
      currency: base_trip ? (base_trip.currency || "USD") : "USD"
    };

    return {
      success: true,
      custom_trip,
      selected_activities,
      price_details,
      message: "Activity added to custom trip"
    };
  }

  // removeActivityFromCustomTrip(customTripId, activityId)
  removeActivityFromCustomTrip(customTripId, activityId) {
    const customTrips = this._getFromStorage("custom_trips", []);
    const activities = this._getFromStorage("activities", []);

    const idx = customTrips.findIndex(ct => ct.id === customTripId);
    if (idx < 0) {
      return { success: false, custom_trip: null, selected_activities: [], price_details: null, message: "Custom trip not found" };
    }

    const custom_trip = customTrips[idx];
    custom_trip.selected_activity_ids = (custom_trip.selected_activity_ids || []).filter(id => id !== activityId);

    const selected_activities = custom_trip.selected_activity_ids
      .map(aid => activities.find(a => a.id === aid))
      .filter(Boolean);

    const activitiesPrice = selected_activities.reduce((sum, a) => sum + (a.price_per_student || 0), 0);
    custom_trip.activities_price_per_student = activitiesPrice;
    custom_trip.total_price_per_student = (custom_trip.base_price_per_student || 0) + activitiesPrice;
    custom_trip.updated_at = this._now();

    customTrips[idx] = custom_trip;
    this._saveToStorage("custom_trips", customTrips);

    const base_trip = this._getFromStorage("trips", []).find(t => t.id === custom_trip.base_trip_id) || null;
    const price_details = {
      base_price_per_student: custom_trip.base_price_per_student || 0,
      activities_price_per_student: custom_trip.activities_price_per_student || 0,
      total_price_per_student: custom_trip.total_price_per_student || 0,
      currency: base_trip ? (base_trip.currency || "USD") : "USD"
    };

    return {
      success: true,
      custom_trip,
      selected_activities,
      price_details,
      message: "Activity removed from custom trip"
    };
  }

  // saveCustomTrip(customTripId, name)
  saveCustomTrip(customTripId, name) {
    const customTrips = this._getFromStorage("custom_trips", []);
    const idx = customTrips.findIndex(ct => ct.id === customTripId);
    if (idx < 0) {
      return { success: false, custom_trip: null, message: "Custom trip not found" };
    }

    const custom_trip = customTrips[idx];
    if (name !== undefined && name !== null) {
      custom_trip.name = name;
    }
    custom_trip.status = "saved";
    custom_trip.updated_at = this._now();

    customTrips[idx] = custom_trip;
    this._saveToStorage("custom_trips", customTrips);

    return {
      success: true,
      custom_trip,
      message: "Custom trip saved"
    };
  }

  // addCustomTripToCart(customTripId, configuration)
  addCustomTripToCart(customTripId, configuration) {
    const customTrips = this._getFromStorage("custom_trips", []);
    const trips = this._getFromStorage("trips", []);

    const custom_trip = customTrips.find(ct => ct.id === customTripId);
    if (!custom_trip) {
      return { success: false, cart: null, added_item: null, message: "Custom trip not found" };
    }

    if (!configuration || typeof configuration.group_size_students !== "number") {
      return { success: false, cart: null, added_item: null, message: "group_size_students is required" };
    }

    const base_trip = trips.find(t => t.id === custom_trip.base_trip_id) || null;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    const selection = { group_size_students: configuration.group_size_students };
    const pricing = this._calculateTripSelectionPricing(base_trip, selection, custom_trip);

    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      trip_id: null,
      custom_trip_id: custom_trip.id,
      selected_date: configuration.selected_date || null,
      start_date: configuration.start_date || null,
      end_date: configuration.end_date || null,
      departure_time: null,
      group_size_students: configuration.group_size_students,
      group_size_chaperones: configuration.group_size_chaperones || 0,
      grade_level: configuration.grade_level || null,
      price_per_student: pricing.price_per_student,
      total_price: pricing.total_price,
      created_at: this._now()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    const carts = this._getFromStorage("carts", []);
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      const updatedIds = Array.isArray(carts[cartIndex].item_ids) ? carts[cartIndex].item_ids.slice() : [];
      updatedIds.push(cartItem.id);
      carts[cartIndex].item_ids = updatedIds;
      carts[cartIndex].total_price = (carts[cartIndex].total_price || 0) + pricing.total_price;
      carts[cartIndex].updated_at = this._now();
      this._saveToStorage("carts", carts);
    }

    return {
      success: true,
      cart: carts.find(c => c.id === cart.id),
      added_item: cartItem,
      message: "Custom trip added to cart"
    };
  }

  // createBookingFromTripSelection(tripId, selection)
  createBookingFromTripSelection(tripId, selection) {
    const trips = this._getFromStorage("trips", []);
    const bookings = this._getFromStorage("bookings", []);

    const trip = trips.find(t => t.id === tripId);
    if (!trip) {
      return { success: false, booking: null, message: "Trip not found" };
    }

    if (!selection || typeof selection.group_size_students !== "number") {
      return { success: false, booking: null, message: "group_size_students is required" };
    }

    const pricing = this._calculateTripSelectionPricing(trip, selection, null);

    const bookingMode = selection.booking_mode || "standard";
    const isSpecial = !!trip.is_special_offer;
    let status = "pending";
    if (bookingMode === "reserve_only" || isSpecial) {
      status = "reserved";
    }

    const booking = {
      id: this._generateId("booking"),
      trip_id: trip.id,
      custom_trip_id: null,
      title: trip.title || "",
      selected_date: selection.selected_date || null,
      start_date: selection.start_date || null,
      end_date: selection.end_date || null,
      departure_time: selection.departure_time || null,
      num_students: selection.group_size_students,
      num_chaperones: selection.group_size_chaperones || 0,
      grade_level: selection.grade_level || null,
      school_name: null,
      contact_name: null,
      contact_phone: null,
      contact_email: null,
      status,
      payment_status: "not_started",
      is_special_offer_booking: isSpecial,
      price_per_student: pricing.price_per_student,
      total_price: pricing.total_price,
      notes: null,
      created_at: this._now(),
      updated_at: null
    };

    bookings.push(booking);
    this._saveToStorage("bookings", bookings);

    return {
      success: true,
      booking,
      message: "Booking created"
    };
  }

  // createBookingFromCartItem(cartItemId)
  createBookingFromCartItem(cartItemId) {
    const cartItems = this._getFromStorage("cart_items", []);
    const trips = this._getFromStorage("trips", []);
    const customTrips = this._getFromStorage("custom_trips", []);
    const bookings = this._getFromStorage("bookings", []);

    const cartItem = cartItems.find(ci => ci.id === cartItemId);
    if (!cartItem) {
      return { success: false, booking: null, message: "Cart item not found" };
    }

    const trip = cartItem.trip_id ? trips.find(t => t.id === cartItem.trip_id) || null : null;
    const custom_trip = cartItem.custom_trip_id ? customTrips.find(ct => ct.id === cartItem.custom_trip_id) || null : null;

    if (!trip && !custom_trip) {
      return { success: false, booking: null, message: "Associated trip not found" };
    }

    let price_per_student = cartItem.price_per_student || 0;
    let total_price = cartItem.total_price || 0;
    if ((!price_per_student && !total_price) && trip) {
      const pricing = this._calculateTripSelectionPricing(trip, {
        group_size_students: cartItem.group_size_students
      }, null);
      price_per_student = pricing.price_per_student;
      total_price = pricing.total_price;
    } else if ((!price_per_student && !total_price) && custom_trip) {
      const base_trip = trips.find(t => t.id === custom_trip.base_trip_id) || null;
      const pricing = this._calculateTripSelectionPricing(base_trip, {
        group_size_students: cartItem.group_size_students
      }, custom_trip);
      price_per_student = pricing.price_per_student;
      total_price = pricing.total_price;
    }

    const title = trip
      ? (trip.title || "")
      : (custom_trip.name || "Custom trip");

    const booking = {
      id: this._generateId("booking"),
      trip_id: trip ? trip.id : null,
      custom_trip_id: custom_trip ? custom_trip.id : null,
      title,
      selected_date: cartItem.selected_date || null,
      start_date: cartItem.start_date || null,
      end_date: cartItem.end_date || null,
      departure_time: cartItem.departure_time || null,
      num_students: cartItem.group_size_students,
      num_chaperones: cartItem.group_size_chaperones || 0,
      grade_level: cartItem.grade_level || null,
      school_name: null,
      contact_name: null,
      contact_phone: null,
      contact_email: null,
      status: "pending",
      payment_status: "not_started",
      is_special_offer_booking: trip ? !!trip.is_special_offer : false,
      price_per_student,
      total_price,
      notes: null,
      created_at: this._now(),
      updated_at: null
    };

    bookings.push(booking);
    this._saveToStorage("bookings", bookings);

    return {
      success: true,
      booking,
      message: "Booking created from cart item"
    };
  }

  // getCheckoutSummary(bookingId)
  getCheckoutSummary(bookingId) {
    const bookings = this._getFromStorage("bookings", []);
    const trips = this._getFromStorage("trips", []);
    const customTrips = this._getFromStorage("custom_trips", []);
    const destinations = this._getFromStorage("destinations", []);

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      return { booking: null, trip: null, custom_trip: null, destination: null, price_breakdown: null };
    }

    const trip = booking.trip_id ? trips.find(t => t.id === booking.trip_id) || null : null;
    const custom_trip = booking.custom_trip_id ? customTrips.find(ct => ct.id === booking.custom_trip_id) || null : null;
    let destination = null;
    if (trip && trip.destination_id) {
      destination = destinations.find(d => d.id === trip.destination_id) || null;
    } else if (custom_trip) {
      const baseTrip = trips.find(t => t.id === custom_trip.base_trip_id);
      if (baseTrip && baseTrip.destination_id) {
        destination = destinations.find(d => d.id === baseTrip.destination_id) || null;
      }
    }

    let price_per_student = booking.price_per_student || 0;
    let total_price = booking.total_price || 0;
    let currency = "USD";

    if (trip) {
      currency = trip.currency || "USD";
    } else if (custom_trip) {
      const baseTrip = trips.find(t => t.id === custom_trip.base_trip_id);
      currency = baseTrip ? (baseTrip.currency || "USD") : "USD";
    }

    if (!price_per_student && !total_price) {
      if (trip) {
        const pricing = this._calculateTripSelectionPricing(trip, {
          group_size_students: booking.num_students
        }, null);
        price_per_student = pricing.price_per_student;
        total_price = pricing.total_price;
      } else if (custom_trip) {
        const baseTrip = trips.find(t => t.id === custom_trip.base_trip_id) || null;
        const pricing = this._calculateTripSelectionPricing(baseTrip, {
          group_size_students: booking.num_students
        }, custom_trip);
        price_per_student = pricing.price_per_student;
        total_price = pricing.total_price;
      }
    }

    const price_breakdown = {
      price_per_student,
      total_price,
      currency
    };

    return {
      booking,
      trip,
      custom_trip,
      destination,
      price_breakdown
    };
  }

  // submitBookingDetails(bookingId, details)
  submitBookingDetails(bookingId, details) {
    const bookings = this._getFromStorage("bookings", []);
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx < 0) {
      return { success: false, booking: null, next_step: null, message: "Booking not found" };
    }

    const booking = bookings[idx];
    if (details.school_name !== undefined) booking.school_name = details.school_name;
    if (details.contact_name !== undefined) booking.contact_name = details.contact_name;
    if (details.contact_phone !== undefined) booking.contact_phone = details.contact_phone;
    if (details.contact_email !== undefined) booking.contact_email = details.contact_email;
    if (typeof details.num_students === "number") booking.num_students = details.num_students;
    if (typeof details.num_chaperones === "number") booking.num_chaperones = details.num_chaperones;
    if (details.notes !== undefined) booking.notes = details.notes;

    // Recalculate total if num_students changed and price_per_student known
    if (typeof booking.price_per_student === "number" && typeof booking.num_students === "number") {
      booking.total_price = booking.price_per_student * booking.num_students;
    }

    booking.payment_status = "pending";
    booking.updated_at = this._now();
    bookings[idx] = booking;
    this._saveToStorage("bookings", bookings);

    return {
      success: true,
      booking,
      next_step: "payment_options",
      message: "Booking details submitted"
    };
  }

  // getMyBookings()
  getMyBookings() {
    const bookings = this._getFromStorage("bookings", []);
    const trips = this._getFromStorage("trips", []);
    const customTrips = this._getFromStorage("custom_trips", []);
    const destinations = this._getFromStorage("destinations", []);

    const result = bookings.map(b => {
      const trip = b.trip_id ? trips.find(t => t.id === b.trip_id) || null : null;
      const custom_trip = b.custom_trip_id ? customTrips.find(ct => ct.id === b.custom_trip_id) || null : null;
      let trip_title = b.title;
      let destination_name = "";
      if (trip) {
        trip_title = trip.title || b.title;
        if (trip.destination_id) {
          const dest = destinations.find(d => d.id === trip.destination_id);
          if (dest) destination_name = dest.name || dest.city || "";
        }
      } else if (custom_trip) {
        const baseTrip = trips.find(t => t.id === custom_trip.base_trip_id);
        if (baseTrip) {
          trip_title = baseTrip.title || custom_trip.name || b.title;
          if (baseTrip.destination_id) {
            const dest = destinations.find(d => d.id === baseTrip.destination_id);
            if (dest) destination_name = dest.name || dest.city || "";
          }
        }
      }
      const status_label = this._mapStatusToLabel(b.status);
      return {
        booking: b,
        trip_title,
        destination_name,
        status_label
      };
    });

    return {
      bookings: result
    };
  }

  // getBookingDetails(bookingId)
  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage("bookings", []);
    const trips = this._getFromStorage("trips", []);
    const customTrips = this._getFromStorage("custom_trips", []);
    const destinations = this._getFromStorage("destinations", []);

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      return { booking: null, trip: null, custom_trip: null, destination: null, price_breakdown: null };
    }

    const trip = booking.trip_id ? trips.find(t => t.id === booking.trip_id) || null : null;
    const custom_trip = booking.custom_trip_id ? customTrips.find(ct => ct.id === booking.custom_trip_id) || null : null;

    let destination = null;
    if (trip && trip.destination_id) {
      destination = destinations.find(d => d.id === trip.destination_id) || null;
    } else if (custom_trip) {
      const baseTrip = trips.find(t => t.id === custom_trip.base_trip_id);
      if (baseTrip && baseTrip.destination_id) {
        destination = destinations.find(d => d.id === baseTrip.destination_id) || null;
      }
    }

    let price_per_student = booking.price_per_student || 0;
    let total_price = booking.total_price || 0;
    let currency = "USD";
    if (trip) {
      currency = trip.currency || "USD";
    } else if (custom_trip) {
      const baseTrip = trips.find(t => t.id === custom_trip.base_trip_id);
      currency = baseTrip ? (baseTrip.currency || "USD") : "USD";
    }

    const price_breakdown = {
      price_per_student,
      total_price,
      currency
    };

    return {
      booking,
      trip,
      custom_trip,
      destination,
      price_breakdown
    };
  }

  // getBookingParticipants(bookingId)
  getBookingParticipants(bookingId) {
    const participants = this._getFromStorage("booking_participants", [])
      .filter(p => p.booking_id === bookingId);

    return { participants };
  }

  // updateBookingParticipants(bookingId, groupSummary, participantUpdates)
  updateBookingParticipants(bookingId, groupSummary, participantUpdates) {
    const bookings = this._getFromStorage("bookings", []);
    const bookingIdx = bookings.findIndex(b => b.id === bookingId);
    if (bookingIdx < 0) {
      return { success: false, booking: null, participants: [], message: "Booking not found" };
    }

    const booking = bookings[bookingIdx];
    let participants = this._getFromStorage("booking_participants", []);
    const existingForBooking = participants.filter(p => p.booking_id === bookingId);

    // Update group summary
    if (groupSummary) {
      if (typeof groupSummary.num_students === "number") {
        booking.num_students = groupSummary.num_students;
      }
      if (typeof groupSummary.num_chaperones === "number") {
        booking.num_chaperones = groupSummary.num_chaperones;
      }
    }

    // Update participants
    if (Array.isArray(participantUpdates)) {
      participantUpdates.forEach(update => {
        if (typeof update.participant_number !== "number") return;
        let participant = existingForBooking.find(p => p.participant_number === update.participant_number);
        if (!participant) {
          participant = {
            id: this._generateId("participant"),
            booking_id: bookingId,
            participant_number: update.participant_number,
            name: update.name || null,
            role: update.role || "student",
            dietary_need: update.dietary_need || "none",
            notes: update.notes || null
          };
          participants.push(participant);
          existingForBooking.push(participant);
        } else {
          if (update.name !== undefined) participant.name = update.name;
          if (update.role !== undefined) participant.role = update.role;
          if (update.dietary_need !== undefined) participant.dietary_need = update.dietary_need;
          if (update.notes !== undefined) participant.notes = update.notes;
          const idx = participants.findIndex(p => p.id === participant.id);
          if (idx >= 0) participants[idx] = participant;
        }
      });
    }

    this._saveToStorage("booking_participants", participants);

    // Recalculate totals based on updated group summary (do not override counts from groupSummary)
    if (typeof booking.price_per_student === "number" && typeof booking.num_students === "number") {
      booking.total_price = booking.price_per_student * booking.num_students;
    }
    booking.updated_at = this._now();
    bookings[bookingIdx] = booking;
    this._saveToStorage("bookings", bookings);

    // Refresh from storage
    const updatedBookings = this._getFromStorage("bookings", []);
    const updatedBooking = updatedBookings.find(b => b.id === bookingId);
    const updatedParticipants = this._getFromStorage("booking_participants", [])
      .filter(p => p.booking_id === bookingId);

    return {
      success: true,
      booking: updatedBooking,
      participants: updatedParticipants,
      message: "Participants updated"
    };
  }

  // submitQuoteRequest(tripId, group_size, travel_month, contact_name, contact_email, contact_phone, notes)
  submitQuoteRequest(tripId, group_size, travel_month, contact_name, contact_email, contact_phone, notes) {
    const trips = this._getFromStorage("trips", []);
    const trip = trips.find(t => t.id === tripId);
    if (!trip) {
      return { success: false, quote_request: null, message: "Trip not found" };
    }

    if (typeof group_size !== "number" || !travel_month || !contact_name) {
      return { success: false, quote_request: null, message: "Missing required fields" };
    }

    const quoteRequests = this._getFromStorage("quote_requests", []);
    const quote_request = {
      id: this._generateId("quote_request"),
      trip_id: trip.id,
      group_size,
      travel_month,
      contact_name,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      notes: notes || null,
      status: "submitted",
      created_at: this._now()
    };

    quoteRequests.push(quote_request);
    this._saveToStorage("quote_requests", quoteRequests);

    return {
      success: true,
      quote_request,
      message: "Quote request submitted"
    };
  }

  // signIn(email, password)
  signIn(email, password) {
    const users = this._getFromStorage("users", []);
    let user = users.find(u => u.email === email && u.password === password);

    // Provide a built-in demo teacher account if none has been created yet
    if (!user && email === "teacher@example.com" && password === "DemoPass123") {
      user = {
        id: this._generateId("user"),
        email,
        password,
        display_name: "Teacher Example"
      };
      users.push(user);
      this._saveToStorage("users", users);
    }

    if (!user) {
      return { success: false, user_display_name: null, message: "Invalid email or password" };
    }

    const session = this._getCurrentUserSession();
    session.currentUserEmail = user.email;
    session.currentUserDisplayName = user.display_name || user.email;
    this._saveCurrentUserSession(session);

    return {
      success: true,
      user_display_name: session.currentUserDisplayName,
      message: "Signed in"
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const content = this._getFromStorage("about_page_content", { title: "", sections: [] });
    return content;
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage("contact_info", { email: "", phone: "", office_hours: "", address: "" });
    return info;
  }

  // submitContactForm(name, email, phone, subject, message)
  submitContactForm(name, email, phone, subject, message) {
    if (!name || !email || !message) {
      return { success: false, message: "Name, email, and message are required" };
    }
    const submissions = this._getFromStorage("contact_submissions", []);
    const submission = {
      id: this._generateId("contact_submission"),
      name,
      email,
      phone: phone || null,
      subject: subject || "",
      message,
      created_at: this._now()
    };
    submissions.push(submission);
    this._saveToStorage("contact_submissions", submissions);
    return { success: true, message: "Contact form submitted" };
  }

  // getFAQEntries()
  getFAQEntries() {
    const data = this._getFromStorage("faqs", { faqs: [] });
    if (Array.isArray(data)) {
      return { faqs: data };
    }
    return { faqs: data.faqs || [] };
  }

  // getHowItWorksContent()
  getHowItWorksContent() {
    const data = this._getFromStorage("how_it_works_content", { sections: [] });
    return { sections: data.sections || [] };
  }

  // getHelpSupportContent()
  getHelpSupportContent() {
    const data = this._getFromStorage("help_support_content", { quick_links: [], troubleshooting_tips: [] });
    return {
      quick_links: data.quick_links || [],
      troubleshooting_tips: data.troubleshooting_tips || []
    };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const data = this._getFromStorage("terms_and_conditions_content", { title: "", sections: [] });
    return {
      title: data.title || "",
      sections: data.sections || []
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const data = this._getFromStorage("privacy_policy_content", { title: "", sections: [] });
    return {
      title: data.title || "",
      sections: data.sections || []
    };
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}
