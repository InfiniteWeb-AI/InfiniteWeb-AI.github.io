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
    this.idCounter = this._getNextIdCounter(); // prime counter
  }

  _initStorage() {
    // Legacy example keys from template (not used in this implementation but kept for compatibility)
    if (!localStorage.getItem("users")) {
      localStorage.setItem("users", JSON.stringify([]));
    }
    if (!localStorage.getItem("products")) {
      localStorage.setItem("products", JSON.stringify([]));
    }
    if (!localStorage.getItem("carts")) {
      localStorage.setItem("carts", JSON.stringify([]));
    }
    if (!localStorage.getItem("cartItems")) {
      localStorage.setItem("cartItems", JSON.stringify([]));
    }

    // Theatre domain storage tables
    const arrayKeys = [
      "productions",
      "directors",
      "venues",
      "performances",
      "performance_ticket_types",
      "performance_seats",
      "funds",
      "donations",
      "newsletter_subscriptions",
      "group_booking_requests",
      "membership_plans",
      "cart_items",
      "saved_production_items",
      "audition_opportunities",
      "audition_dates",
      "audition_slots",
      "audition_reservations",
      "contact_messages"
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Single cart object (single-user)
    if (!localStorage.getItem("cart")) {
      localStorage.setItem("cart", JSON.stringify(null));
    }

    // Maps for in-progress selections
    if (!localStorage.getItem("performance_ticket_selections")) {
      localStorage.setItem("performance_ticket_selections", JSON.stringify({}));
    }
    if (!localStorage.getItem("performance_seat_selections")) {
      localStorage.setItem("performance_seat_selections", JSON.stringify({}));
    }

    // Optional content/config keys can be absent; we will supply defaults when reading

    // ID counter
    if (!localStorage.getItem("idCounter")) {
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

  _nowISO() {
    return new Date().toISOString();
  }

  _formatMonthLabel(monthValue) {
    // monthValue: 'yyyy-mm'
    if (!monthValue || typeof monthValue !== "string" || monthValue.length < 7) return monthValue || "";
    const [year, month] = monthValue.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  _formatTimeLocal(dateTimeString) {
    if (!dateTimeString) return "";
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  _getOrCreateCart() {
    let cart = this._getFromStorage("cart", null);
    if (!cart || typeof cart !== "object" || !cart.id) {
      const now = this._nowISO();
      cart = {
        id: this._generateId("cart"),
        items: [], // array of CartItem ids
        created_at: now,
        updated_at: now
      };
      this._saveCart(cart);
    }
    return cart;
  }

  _saveCart(cart) {
    if (!cart) return;
    cart.updated_at = this._nowISO();
    this._saveToStorage("cart", cart);
  }

  _storePerformanceTicketSelection(performanceId, ticketQuantities) {
    const map = this._getFromStorage("performance_ticket_selections", {});
    map[performanceId] = ticketQuantities || {};
    this._saveToStorage("performance_ticket_selections", map);
  }

  _storeSeatSelection(performanceId, seatIds) {
    const map = this._getFromStorage("performance_seat_selections", {});
    map[performanceId] = Array.isArray(seatIds) ? seatIds : [];
    this._saveToStorage("performance_seat_selections", map);
  }

  // ==========================
  // Interface implementations
  // ==========================

  // 1. getHomepageHighlights
  getHomepageHighlights() {
    const productions = this._getFromStorage("productions", []);
    const performances = this._getFromStorage("performances", []);
    const savedItems = this._getFromStorage("saved_production_items", []);

    const nowISO = this._nowISO();

    const currentProductions = productions.filter(
      (p) => p && p.season_segment === "current_season"
    );

    const featured = currentProductions
      .map((production) => {
        const perfForProd = performances
          .filter(
            (perf) =>
              perf &&
              perf.production_id === production.id &&
              perf.status === "scheduled" &&
              typeof perf.date_time === "string" &&
              perf.date_time >= nowISO
          )
          .sort((a, b) => (a.date_time || "").localeCompare(b.date_time || ""));

        const nextPerformance = perfForProd.length > 0 ? perfForProd[0] : null;
        if (!nextPerformance) return null;
        const is_saved = savedItems.some(
          (s) => s && s.production_id === production.id
        );
        return { production, nextPerformance, is_saved };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aDate = (a.nextPerformance && a.nextPerformance.date_time) || "";
        const bDate = (b.nextPerformance && b.nextPerformance.date_time) || "";
        return aDate.localeCompare(bDate);
      });

    const campaignPromos = this._getFromStorage("campaign_promos", []);
    const newsletterTeaser = this._getFromStorage("newsletter_teaser", {
      headline: "",
      blurb: "",
      cta_label: ""
    });

    return {
      featuredProductions: featured,
      campaignPromos,
      newsletterTeaser
    };
  }

  // 2. getCurrentSeasonFilterOptions
  getCurrentSeasonFilterOptions() {
    const productions = this._getFromStorage("productions", []);
    const performances = this._getFromStorage("performances", []);

    const currentProductions = productions.filter(
      (p) => p && p.season_segment === "current_season"
    );

    const audienceSet = new Set();
    const genreSet = new Set();
    const monthSet = new Set();

    for (const p of currentProductions) {
      if (Array.isArray(p.audience_labels)) {
        for (const a of p.audience_labels) {
          if (a) audienceSet.add(a);
        }
      }
      if (p.genre) genreSet.add(p.genre);
    }

    const prodIds = new Set(currentProductions.map((p) => p.id));

    for (const perf of performances) {
      if (!perf || !perf.date_time || !prodIds.has(perf.production_id)) continue;
      const month = perf.date_time.substring(0, 7); // yyyy-mm
      monthSet.add(month);
    }

    const audiences = Array.from(audienceSet).map((value) => ({
      value,
      label: this._humanizeAudienceLabel(value)
    }));

    const genres = Array.from(genreSet).map((value) => ({
      value,
      label: this._humanizeGenre(value)
    }));

    const months = Array.from(monthSet)
      .sort()
      .map((value) => ({
        value,
        label: this._formatMonthLabel(value)
      }));

    return { audiences, genres, months };
  }

  _humanizeAudienceLabel(value) {
    if (!value) return "";
    // simple mappings for known labels
    const map = {
      family_friendly_8_plus: "Family-Friendly (ages 8+)",
      adults: "Adults",
      youth_family: "Youth & Family",
      high_school_9_12: "High School (Grades 9–12)"
    };
    return map[value] || this._titleCaseFromSnake(value);
  }

  _humanizeGenre(value) {
    if (!value) return "";
    const map = {
      musical: "Musical",
      drama: "Drama",
      comedy: "Comedy",
      shakespeare: "Shakespeare",
      youth_family: "Youth & Family",
      other: "Other"
    };
    return map[value] || this._titleCaseFromSnake(value);
  }

  _titleCaseFromSnake(value) {
    return value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  // 3. listCurrentSeasonProductions(filters, sort)
  listCurrentSeasonProductions(filters, sort) {
    const productions = this._getFromStorage("productions", []);
    const performances = this._getFromStorage("performances", []);
    const savedItems = this._getFromStorage("saved_production_items", []);

    const effectiveFilters = filters || {};
    const audienceLabel = effectiveFilters.audience_label || null;
    const genreFilter = effectiveFilters.genre || null;
    const startDate = effectiveFilters.start_date || null; // yyyy-mm-dd
    const endDate = effectiveFilters.end_date || null; // yyyy-mm-dd

    const nowISO = this._nowISO();

    const filteredProductions = productions.filter((p) => {
      if (!p || p.season_segment !== "current_season") return false;

      if (genreFilter && p.genre !== genreFilter) return false;

      if (audienceLabel) {
        const labels = Array.isArray(p.audience_labels) ? p.audience_labels : [];
        if (!labels.includes(audienceLabel)) return false;
      }

      if (startDate || endDate) {
        const startISO = startDate ? startDate + "T00:00:00" : null;
        const endISO = endDate ? endDate + "T23:59:59" : null;
        const perfForProd = performances.filter((perf) => {
          if (!perf || perf.production_id !== p.id || !perf.date_time) return false;
          let ok = true;
          if (startISO && perf.date_time < startISO) ok = false;
          if (endISO && perf.date_time > endISO) ok = false;
          return ok;
        });
        if (perfForProd.length === 0) {
          return false;
        }
      }

      return true;
    });

    let results = filteredProductions.map((production) => {
      const perfForProd = performances
        .filter((perf) => perf && perf.production_id === production.id)
        .filter((perf) => perf.status === "scheduled" && perf.date_time && perf.date_time >= nowISO)
        .sort((a, b) => (a.date_time || "").localeCompare(b.date_time || ""));

      const is_saved = savedItems.some(
        (s) => s && s.production_id === production.id
      );

      return {
        production,
        nextPerformances: perfForProd,
        is_saved
      };
    });

    if (sort === "opening_date_asc") {
      results = results.sort((a, b) => {
        const aDate = a.production.opening_date || "";
        const bDate = b.production.opening_date || "";
        return aDate.localeCompare(bDate);
      });
    } else if (sort === "title_asc") {
      results = results.sort((a, b) => {
        const aTitle = a.production.title || "";
        const bTitle = b.production.title || "";
        return aTitle.localeCompare(bTitle);
      });
    }

    return results;
  }

  // 4. getCurrentSeasonCalendar(filters, month)
  getCurrentSeasonCalendar(filters, month) {
    const productions = this._getFromStorage("productions", []);
    const performances = this._getFromStorage("performances", []);

    const effectiveFilters = filters || {};
    const audienceLabel = effectiveFilters.audience_label || null;
    const genreFilter = effectiveFilters.genre || null;

    const currentProdIds = new Set(
      productions
        .filter((p) => p && p.season_segment === "current_season")
        .filter((p) => {
          if (genreFilter && p.genre !== genreFilter) return false;
          if (audienceLabel) {
            const labels = Array.isArray(p.audience_labels) ? p.audience_labels : [];
            if (!labels.includes(audienceLabel)) return false;
          }
          return true;
        })
        .map((p) => p.id)
    );

    const daysMap = new Map(); // date -> { date, performances: [] }

    for (const perf of performances) {
      if (!perf || !perf.date_time) continue;
      if (!currentProdIds.has(perf.production_id)) continue;
      if (perf.status !== "scheduled") continue;

      const perfMonth = perf.date_time.substring(0, 7);
      if (perfMonth !== month) continue;

      const date = perf.date_time.substring(0, 10); // yyyy-mm-dd
      if (!daysMap.has(date)) {
        daysMap.set(date, { date, performances: [] });
      }
      const dayEntry = daysMap.get(date);
      const production = productions.find((p) => p.id === perf.production_id) || null;
      dayEntry.performances.push({ performance: perf, production });
    }

    const days = Array.from(daysMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return { month, days };
  }

  // 5. getPastProductionsFilterOptions
  getPastProductionsFilterOptions() {
    const productions = this._getFromStorage("productions", []);
    const directors = this._getFromStorage("directors", []);

    const pastProductions = productions.filter(
      (p) => p && p.season_segment === "past_productions"
    );

    let minYear = null;
    let maxYear = null;
    const genreSet = new Set();
    const directorCountMap = new Map();

    for (const p of pastProductions) {
      if (typeof p.season_year === "number") {
        if (minYear === null || p.season_year < minYear) minYear = p.season_year;
        if (maxYear === null || p.season_year > maxYear) maxYear = p.season_year;
      }
      if (p.genre) genreSet.add(p.genre);
      if (p.director_id) {
        directorCountMap.set(
          p.director_id,
          (directorCountMap.get(p.director_id) || 0) + 1
        );
      }
    }

    const genres = Array.from(genreSet).map((value) => ({
      value,
      label: this._humanizeGenre(value)
    }));

    const directorsOptions = directors
      .map((d) => ({
        id: d.id,
        name: d.name,
        production_count: directorCountMap.get(d.id) || 0
      }))
      .filter((d) => d.production_count > 0);

    return {
      year_range: {
        min_year: minYear,
        max_year: maxYear
      },
      genres,
      directors: directorsOptions
    };
  }

  // 6. listPastProductions(filters)
  listPastProductions(filters) {
    const productions = this._getFromStorage("productions", []);
    const directors = this._getFromStorage("directors", []);
    const savedItems = this._getFromStorage("saved_production_items", []);

    const effectiveFilters = filters || {};
    const minYear =
      typeof effectiveFilters.min_year === "number"
        ? effectiveFilters.min_year
        : null;
    const maxYear =
      typeof effectiveFilters.max_year === "number"
        ? effectiveFilters.max_year
        : null;
    const genreFilter = effectiveFilters.genre || null;
    const directorIdFilter = effectiveFilters.director_id || null;

    const filtered = productions.filter((p) => {
      if (!p || p.season_segment !== "past_productions") return false;

      if (typeof minYear === "number" && typeof p.season_year === "number") {
        if (p.season_year < minYear) return false;
      }
      if (typeof maxYear === "number" && typeof p.season_year === "number") {
        if (p.season_year > maxYear) return false;
      }
      if (genreFilter && p.genre !== genreFilter) return false;
      if (directorIdFilter && p.director_id !== directorIdFilter) return false;
      return true;
    });

    return filtered.map((production) => {
      const director = directors.find((d) => d.id === production.director_id) || null;
      const is_saved = savedItems.some(
        (s) => s && s.production_id === production.id
      );
      return { production, director, is_saved };
    });
  }

  // 7. toggleSavedProduction(productionId, isSaved)
  toggleSavedProduction(productionId, isSaved) {
    let savedItems = this._getFromStorage("saved_production_items", []);
    const now = this._nowISO();

    const alreadySaved = savedItems.some(
      (s) => s && s.production_id === productionId
    );

    if (isSaved) {
      if (!alreadySaved) {
        const item = {
          id: this._generateId("savedprod"),
          production_id: productionId,
          saved_at: now
        };
        savedItems.push(item);
      }
    } else {
      savedItems = savedItems.filter(
        (s) => !s || s.production_id !== productionId
      );
    }

    this._saveToStorage("saved_production_items", savedItems);

    return {
      success: true,
      message: isSaved
        ? "Production saved to Saved Productions."
        : "Production removed from Saved Productions.",
      totalSaved: savedItems.length
    };
  }

  // 8. getSavedProductions()
  getSavedProductions() {
    const savedItems = this._getFromStorage("saved_production_items", []);
    const productions = this._getFromStorage("productions", []);
    const directors = this._getFromStorage("directors", []);

    return savedItems.map((savedItem) => {
      const production =
        productions.find((p) => p.id === savedItem.production_id) || null;
      const director =
        production
          ? directors.find((d) => d.id === production.director_id) || null
          : null;
      return { savedItem, production, director };
    });
  }

  // 9. getProductionDetail(productionId)
  getProductionDetail(productionId) {
    const productions = this._getFromStorage("productions", []);
    const directors = this._getFromStorage("directors", []);
    const performances = this._getFromStorage("performances", []);
    const savedItems = this._getFromStorage("saved_production_items", []);

    const production = productions.find((p) => p.id === productionId) || null;
    const director = production
      ? directors.find((d) => d.id === production.director_id) || null
      : null;

    const nowISO = this._nowISO();
    const upcomingPerformances = performances
      .filter(
        (perf) =>
          perf &&
          perf.production_id === productionId &&
          perf.status === "scheduled" &&
          perf.date_time &&
          perf.date_time >= nowISO
      )
      .sort((a, b) => (a.date_time || "").localeCompare(b.date_time || ""));

    const is_saved = savedItems.some(
      (s) => s && s.production_id === productionId
    );

    // Cast, creative team, archival media are not modeled; return empty arrays
    return {
      production,
      director,
      cast: [],
      creative_team: [],
      upcomingPerformances,
      is_saved,
      archival_media: []
    };
  }

  // 10. getPerformanceDetailWithTickets(performanceId)
  getPerformanceDetailWithTickets(performanceId) {
    const performances = this._getFromStorage("performances", []);
    const productions = this._getFromStorage("productions", []);
    const venues = this._getFromStorage("venues", []);
    const ticketTypes = this._getFromStorage("performance_ticket_types", []);

    const performance = performances.find((p) => p.id === performanceId) || null;
    const production = performance
      ? productions.find((p) => p.id === performance.production_id) || null
      : null;
    const venue = performance
      ? venues.find((v) => v.id === performance.venue_id) || null
      : null;

    const ticketTypesForPerf = ticketTypes.filter(
      (t) => t && t.performance_id === performanceId
    );

    const selectionsMap = this._getFromStorage("performance_ticket_selections", {});
    const selected = selectionsMap[performanceId] || {};

    const defaultSelection = {
      adult: 0,
      senior: 0,
      youth: 0,
      student: 0,
      child: 0,
      group: 0,
      comp: 0
    };

    const currentTicketSelection = Object.assign({}, defaultSelection, selected);

    return {
      performance,
      production,
      venue,
      ticketTypes: ticketTypesForPerf,
      notes: performance ? performance.notes || "" : "",
      is_family_friendly: production ? !!production.is_family_friendly : false,
      group_visit_eligible: performance ? !!performance.is_group_visit_eligible : false,
      currentTicketSelection
    };
  }

  // 11. setPerformanceTicketQuantities(performanceId, ticketQuantities)
  setPerformanceTicketQuantities(performanceId, ticketQuantities) {
    const ticketTypes = this._getFromStorage("performance_ticket_types", []);

    const normalized = {
      adult: Number(ticketQuantities && ticketQuantities.adult) || 0,
      senior: Number(ticketQuantities && ticketQuantities.senior) || 0,
      youth: Number(ticketQuantities && ticketQuantities.youth) || 0,
      student: Number(ticketQuantities && ticketQuantities.student) || 0,
      child: Number(ticketQuantities && ticketQuantities.child) || 0,
      group: Number(ticketQuantities && ticketQuantities.group) || 0,
      comp: Number(ticketQuantities && ticketQuantities.comp) || 0
    };

    this._storePerformanceTicketSelection(performanceId, normalized);

    const ticketTypesForPerf = ticketTypes.filter(
      (t) => t && t.performance_id === performanceId
    );

    let estimatedSubtotal = 0;
    let totalTickets = 0;

    for (const [type, qty] of Object.entries(normalized)) {
      if (!qty) continue;
      const tt = ticketTypesForPerf.find((t) => t.ticket_type === type);
      if (tt) {
        estimatedSubtotal += tt.price * qty;
        totalTickets += qty;
      }
    }

    return {
      success: true,
      performanceId,
      ticketQuantities: normalized,
      totalTickets,
      estimatedSubtotal
    };
  }

  // 12. getSeatMapForPerformance(performanceId, highlightAccessible)
  getSeatMapForPerformance(performanceId, highlightAccessible) {
    const performances = this._getFromStorage("performances", []);
    const venues = this._getFromStorage("venues", []);
    const seats = this._getFromStorage("performance_seats", []);

    const performance = performances.find((p) => p.id === performanceId) || null;
    const venue = performance
      ? venues.find((v) => v.id === performance.venue_id) || null
      : null;

    let seatsForPerf = seats.filter(
      (s) => s && s.performance_id === performanceId
    );

    if (!seatsForPerf || seatsForPerf.length === 0) {
      seatsForPerf = seats.filter(
        (s) =>
          s &&
          s.status === "available" &&
          (s.is_wheelchair_accessible ||
            s.is_companion_seat ||
            s.seat_type === "wheelchair" ||
            s.seat_type === "companion" ||
            s.seat_type === "standard")
      );
    }

    const seatTypesSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    for (const seat of seatsForPerf) {
      if (seat.seat_type) seatTypesSet.add(seat.seat_type);
      if (typeof seat.price === "number") {
        if (minPrice === null || seat.price < minPrice) minPrice = seat.price;
        if (maxPrice === null || seat.price > maxPrice) maxPrice = seat.price;
      }
    }

    const seat_types = Array.from(seatTypesSet).map((value) => ({
      value,
      label: this._humanizeSeatType(value),
      description: this._seatTypeDescription(value)
    }));

    const price_ranges = [];
    if (minPrice !== null && maxPrice !== null) {
      price_ranges.push({
        min_price: minPrice,
        max_price: maxPrice,
        label:
          minPrice === maxPrice
            ? `$${minPrice}`
            : `$${minPrice} – $${maxPrice}`
      });
    }

    return {
      performance,
      venue,
      seats: seatsForPerf,
      legend: {
        seat_types,
        price_ranges
      }
    };
  }

  _humanizeSeatType(value) {
    const map = {
      standard: "Standard",
      wheelchair: "Wheelchair Accessible",
      companion: "Companion"
    };
    return map[value] || this._titleCaseFromSnake(value || "");
  }

  _seatTypeDescription(value) {
    const map = {
      standard: "Standard reserved seating.",
      wheelchair: "Spaces reserved for wheelchair users.",
      companion: "Seats reserved for companions of wheelchair users."
    };
    return map[value] || "";
  }

  // 13. setSelectedSeatsForPerformance(performanceId, seatIds)
  setSelectedSeatsForPerformance(performanceId, seatIds) {
    const allSeats = this._getFromStorage("performance_seats", []);
    const seatsForPerf = allSeats.filter(
      (s) => s && s.performance_id === performanceId
    );

    const validSeatIdsSet = new Set(
      allSeats
        .filter((s) => s && s.status === "available")
        .map((s) => s.id)
    );

    const cleanedSeatIds = Array.isArray(seatIds) ? seatIds.filter(Boolean) : [];

    const selectedSeatIds = cleanedSeatIds.filter((id) =>
      validSeatIdsSet.has(id)
    );

    const selectedSeats = allSeats.filter((s) =>
      selectedSeatIds.includes(s.id)
    );

    let totalPrice = 0;
    for (const seat of selectedSeats) {
      if (typeof seat.price === "number") totalPrice += seat.price;
    }

    this._storeSeatSelection(performanceId, selectedSeatIds);

    return {
      success: selectedSeatIds.length === cleanedSeatIds.length,
      performanceId,
      selectedSeatIds,
      selectedSeats,
      totalPrice
    };
  }

  // 14. addSelectedSeatsToCart(performanceId)
  addSelectedSeatsToCart(performanceId) {
    const performances = this._getFromStorage("performances", []);
    const productions = this._getFromStorage("productions", []);
    const seats = this._getFromStorage("performance_seats", []);
    const seatSelectionMap = this._getFromStorage("performance_seat_selections", {});
    const cartItems = this._getFromStorage("cart_items", []);

    const seatIds = seatSelectionMap[performanceId] || [];
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return {
        success: false,
        cartId: null,
        addedItem: null,
        message: "No seats selected for this performance."
      };
    }

    const performance = performances.find((p) => p.id === performanceId) || null;
    const production = performance
      ? productions.find((p) => p.id === performance.production_id) || null
      : null;

    const selectedSeats = seats.filter((s) => seatIds.includes(s.id));

    if (selectedSeats.length === 0) {
      return {
        success: false,
        cartId: null,
        addedItem: null,
        message: "Selected seats could not be found or are unavailable."
      };
    }

    let totalPrice = 0;
    for (const seat of selectedSeats) {
      if (typeof seat.price === "number") totalPrice += seat.price;
    }

    const quantity = selectedSeats.length;
    const unit_price = quantity > 0 ? totalPrice / quantity : 0;

    const cart = this._getOrCreateCart();

    const cartItem = {
      id: this._generateId("cartitem"),
      cart_id: cart.id,
      item_type: "performance_ticket",
      name: production ? production.title + " tickets" : "Performance tickets",
      description: performance ? performance.date_time || "" : "",
      quantity,
      unit_price,
      total_price: totalPrice,
      performance_id: performanceId,
      performance_seat_ids: seatIds,
      ticket_type: null,
      membership_plan_id: null,
      membership_billing_frequency: null,
      donation_id: null,
      created_at: this._nowISO()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    this._saveCart(cart);

    return {
      success: true,
      cartId: cart.id,
      addedItem: cartItem,
      message: "Selected seats added to cart."
    };
  }

  // 15. getSchoolGroupVisitFilterOptions()
  getSchoolGroupVisitFilterOptions() {
    const performances = this._getFromStorage("performances", []);

    const gradeSet = new Set();
    const subjectSet = new Set();
    const monthSet = new Set();

    for (const perf of performances) {
      if (!perf || perf.status !== "scheduled") continue;
      if (!perf.is_group_visit_eligible) continue;

      if (Array.isArray(perf.education_grade_levels)) {
        for (const g of perf.education_grade_levels) {
          if (g) gradeSet.add(g);
        }
      }

      if (Array.isArray(perf.education_subjects)) {
        for (const s of perf.education_subjects) {
          if (s) subjectSet.add(s);
        }
      }

      if (perf.date_time) {
        const month = perf.date_time.substring(0, 7);
        monthSet.add(month);
      }
    }

    const gradeLevels = Array.from(gradeSet).map((value) => ({
      value,
      label: this._humanizeGradeLevel(value)
    }));

    const subjects = Array.from(subjectSet).map((value) => ({
      value,
      label: this._humanizeSubject(value)
    }));

    const months = Array.from(monthSet)
      .sort()
      .map((value) => ({
        value,
        label: this._formatMonthLabel(value)
      }));

    return { gradeLevels, subjects, months };
  }

  _humanizeGradeLevel(value) {
    const map = {
      elementary_k_5: "Elementary (K–5)",
      middle_school_6_8: "Middle School (6–8)",
      high_school_9_12: "High School (9–12)",
      college: "College"
    };
    return map[value] || this._titleCaseFromSnake(value || "");
  }

  _humanizeSubject(value) {
    const map = {
      shakespeare: "Shakespeare",
      classics: "Classics",
      contemporary: "Contemporary",
      musicals: "Musicals"
    };
    return map[value] || this._titleCaseFromSnake(value || "");
  }

  // 16. listSchoolGroupEligiblePerformances(filters)
  listSchoolGroupEligiblePerformances(filters) {
    const effectiveFilters = filters || {};
    const gradeLevel = effectiveFilters.grade_level;
    const subject = effectiveFilters.subject || null;
    const month = effectiveFilters.month || null; // yyyy-mm

    const performances = this._getFromStorage("performances", []);
    const productions = this._getFromStorage("productions", []);
    const venues = this._getFromStorage("venues", []);

    const results = [];

    for (const perf of performances) {
      if (!perf || perf.status !== "scheduled") continue;
      if (!perf.is_group_visit_eligible) continue;

      // grade level filter (required)
      const grades = Array.isArray(perf.education_grade_levels)
        ? perf.education_grade_levels
        : [];
      if (!grades.includes(gradeLevel)) continue;

      // subject filter (optional)
      if (subject) {
        const subjects = Array.isArray(perf.education_subjects)
          ? perf.education_subjects
          : [];
        if (!subjects.includes(subject)) continue;
      }

      // month filter (optional)
      if (month && perf.date_time) {
        const perfMonth = perf.date_time.substring(0, 7);
        if (perfMonth !== month) continue;
      }

      const production = productions.find((p) => p.id === perf.production_id) || null;
      const venue = venues.find((v) => v.id === perf.venue_id) || null;

      const isWeekday =
        perf.weekday !== "saturday" && perf.weekday !== "sunday";
      const is_weekday_matinee = !!perf.is_matinee && isWeekday;

      const start_time_local = this._formatTimeLocal(perf.date_time);

      results.push({
        performance: perf,
        production,
        venue,
        is_weekday_matinee,
        start_time_local,
        group_booking_eligible: !!perf.is_group_visit_eligible
      });
    }

    return results;
  }

  // 17. createSchoolGroupBookingRequest(...)
  createSchoolGroupBookingRequest(
    performanceId,
    school_name,
    num_students,
    num_adults,
    contact_name,
    contact_email,
    contact_phone,
    notes
  ) {
    const performances = this._getFromStorage("performances", []);
    const requests = this._getFromStorage("group_booking_requests", []);

    const performance = performances.find((p) => p.id === performanceId) || null;
    if (!performance) {
      return {
        success: false,
        groupBookingRequest: null,
        message: "Selected performance not found."
      };
    }

    const request = {
      id: this._generateId("groupbooking"),
      performance_id: performanceId,
      school_name,
      num_students: Number(num_students) || 0,
      num_adults: typeof num_adults === "number" ? num_adults : Number(num_adults) || 0,
      contact_name,
      contact_email,
      contact_phone: contact_phone || "",
      notes: notes || "",
      submitted_at: this._nowISO(),
      status: "submitted"
    };

    requests.push(request);
    this._saveToStorage("group_booking_requests", requests);

    return {
      success: true,
      groupBookingRequest: request,
      message: "Group booking request submitted."
    };
  }

  // 18. getNewsletterSignupOptions()
  getNewsletterSignupOptions() {
    const interestsValues = [
      "musicals",
      "youth_family_programs",
      "plays_and_drama",
      "education_programs",
      "accessibility_updates",
      "special_events",
      "fundraising_campaigns"
    ];

    const interests = interestsValues.map((value) => ({
      value,
      label: this._humanizeNewsletterInterest(value)
    }));

    const frequencies = [
      { value: "immediate", label: "Immediately" },
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
      { value: "quarterly", label: "Quarterly" }
    ];

    return {
      interests,
      emailFrequencies: frequencies,
      marketingOptInDefault: true
    };
  }

  _humanizeNewsletterInterest(value) {
    const map = {
      musicals: "Musicals",
      youth_family_programs: "Youth & Family Programs",
      plays_and_drama: "Plays & Drama",
      education_programs: "Education Programs",
      accessibility_updates: "Accessibility Updates",
      special_events: "Special Events",
      fundraising_campaigns: "Fundraising Campaigns"
    };
    return map[value] || this._titleCaseFromSnake(value || "");
  }

  // 19. createNewsletterSubscription(...)
  createNewsletterSubscription(
    full_name,
    email,
    interests,
    email_frequency,
    postal_code,
    marketing_opt_in
  ) {
    const subs = this._getFromStorage("newsletter_subscriptions", []);

    const subscription = {
      id: this._generateId("newsletter"),
      full_name,
      email,
      interests: Array.isArray(interests) ? interests : [],
      email_frequency,
      postal_code: postal_code || "",
      marketing_opt_in: !!marketing_opt_in,
      subscribed_at: this._nowISO(),
      is_active: true
    };

    subs.push(subscription);
    this._saveToStorage("newsletter_subscriptions", subs);

    return {
      success: true,
      subscription,
      message: "Subscription created."
    };
  }

  // 20. listActiveFunds()
  listActiveFunds() {
    const funds = this._getFromStorage("funds", []);
    return funds.filter((f) => f && f.status === "active");
  }

  // 21. getFundDetail(fundId)
  getFundDetail(fundId) {
    const funds = this._getFromStorage("funds", []);
    return funds.find((f) => f.id === fundId) || null;
  }

  // 22. createOrUpdateDonationForFund(...)
  createOrUpdateDonationForFund(
    fundId,
    amount,
    donation_frequency,
    is_dedicated,
    honoree_name,
    donor_name,
    donor_email,
    payment_method
  ) {
    const funds = this._getFromStorage("funds", []);
    const donations = this._getFromStorage("donations", []);
    const cartItems = this._getFromStorage("cart_items", []);

    const fund = funds.find((f) => f.id === fundId) || null;
    if (!fund) {
      return {
        success: false,
        donation: null,
        cartItem: null,
        next_step: null,
        message: "Fund not found."
      };
    }

    const donation = {
      id: this._generateId("donation"),
      fund_id: fundId,
      amount: Number(amount) || 0,
      donation_frequency,
      is_dedicated: !!is_dedicated,
      honoree_name: is_dedicated ? honoree_name || "" : "",
      donor_name,
      donor_email,
      payment_method,
      created_at: this._nowISO(),
      status: "draft"
    };

    donations.push(donation);
    this._saveToStorage("donations", donations);

    const cart = this._getOrCreateCart();

    const cartItem = {
      id: this._generateId("cartitem"),
      cart_id: cart.id,
      item_type: "donation",
      name: fund.name ? `Donation to ${fund.name}` : "Donation",
      description: fund.short_description || "",
      quantity: 1,
      unit_price: donation.amount,
      total_price: donation.amount,
      performance_id: null,
      performance_seat_ids: null,
      ticket_type: null,
      membership_plan_id: null,
      membership_billing_frequency: null,
      donation_id: donation.id,
      created_at: this._nowISO()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    this._saveCart(cart);

    return {
      success: true,
      donation,
      cartItem,
      next_step: "review",
      message: "Donation created and added to cart."
    };
  }

  // 23. getAccessibilityInfoContent()
  getAccessibilityInfoContent() {
    const venuesData = this._getFromStorage("venues", []);
    const performances = this._getFromStorage("performances", []);

    const servicesSet = new Set();

    for (const perf of performances) {
      if (!perf) continue;
      if (Array.isArray(perf.access_services)) {
        for (const svc of perf.access_services) {
          if (svc) servicesSet.add(svc);
        }
      }
      if (perf.is_asl_interpreted) {
        servicesSet.add("asl_interpreted");
      }
    }

    const services = Array.from(servicesSet).map((code) => ({
      code,
      name: this._humanizeAccessService(code),
      description: this._accessServiceDescription(code)
    }));

    const venues = venuesData.map((venue) => ({
      venue,
      accessibility_notes: venue.accessibility_notes || ""
    }));

    const contact_info = this._getFromStorage("accessibility_contact_info", {
      email: "",
      phone: "",
      additional_notes: ""
    });

    return {
      overview_text: "", // content can be supplied via localStorage if desired
      venues,
      services,
      contact_info
    };
  }

  _humanizeAccessService(code) {
    const map = {
      asl_interpreted: "ASL Interpreted",
      audio_description: "Audio Description",
      open_caption: "Open Caption",
      relaxed_performance: "Relaxed Performance",
      wheelchair_accessible: "Wheelchair Accessible",
      assistive_listening: "Assistive Listening"
    };
    return map[code] || this._titleCaseFromSnake(code || "");
  }

  _accessServiceDescription(code) {
    const map = {
      asl_interpreted: "Performance accompanied by American Sign Language interpreters.",
      audio_description: "Spoken description of visual elements for patrons who are blind or have low vision.",
      open_caption: "Visible text display of dialogue and sound effects.",
      relaxed_performance: "More flexible audience environment with adjusted technical elements.",
      wheelchair_accessible: "Wheelchair-accessible seating available.",
      assistive_listening: "Assistive listening devices available."
    };
    return map[code] || "";
  }

  // 24. getAccessiblePerformanceFilterOptions()
  getAccessiblePerformanceFilterOptions() {
    const performances = this._getFromStorage("performances", []);
    const productions = this._getFromStorage("productions", []);

    const accessiblePerformances = performances.filter((perf) => {
      if (!perf || perf.status !== "scheduled") return false;
      const hasServices = Array.isArray(perf.access_services)
        ? perf.access_services.length > 0
        : false;
      return hasServices || !!perf.is_asl_interpreted;
    });

    const productionIdSet = new Set();
    const monthSet = new Set();
    const accessSet = new Set();

    for (const perf of accessiblePerformances) {
      if (perf.production_id) productionIdSet.add(perf.production_id);
      if (perf.date_time) monthSet.add(perf.date_time.substring(0, 7));
      if (Array.isArray(perf.access_services)) {
        for (const svc of perf.access_services) {
          if (svc) accessSet.add(svc);
        }
      }
      if (perf.is_asl_interpreted) accessSet.add("asl_interpreted");
    }

    const productionsOptions = Array.from(productionIdSet)
      .map((id) => {
        const prod = productions.find((p) => p.id === id);
        if (!prod) return null;
        return { id: prod.id, title: prod.title };
      })
      .filter(Boolean);

    const months = Array.from(monthSet)
      .sort()
      .map((value) => ({ value, label: this._formatMonthLabel(value) }));

    const access_types = Array.from(accessSet).map((value) => ({
      value,
      label: this._humanizeAccessService(value)
    }));

    return {
      productions: productionsOptions,
      months,
      access_types
    };
  }

  // 25. listAccessiblePerformances(filters)
  listAccessiblePerformances(filters) {
    const effectiveFilters = filters || {};
    const productionIdFilter = effectiveFilters.production_id || null;
    const monthFilter = effectiveFilters.month || null;
    const accessTypeFilter = effectiveFilters.access_type || null;

    const performances = this._getFromStorage("performances", []);
    const productions = this._getFromStorage("productions", []);
    const venues = this._getFromStorage("venues", []);

    const results = [];

    for (const perf of performances) {
      if (!perf || perf.status !== "scheduled") continue;

      const hasAccessServices = Array.isArray(perf.access_services)
        ? perf.access_services.length > 0
        : false;
      if (!hasAccessServices && !perf.is_asl_interpreted) continue;

      if (productionIdFilter && perf.production_id !== productionIdFilter) continue;

      if (monthFilter && perf.date_time) {
        const perfMonth = perf.date_time.substring(0, 7);
        if (perfMonth !== monthFilter) continue;
      }

      if (accessTypeFilter) {
        const services = Array.isArray(perf.access_services)
          ? perf.access_services
          : [];
        const matches =
          accessTypeFilter === "asl_interpreted"
            ? perf.is_asl_interpreted || services.includes("asl_interpreted")
            : services.includes(accessTypeFilter);
        if (!matches) continue;
      }

      const production = productions.find((p) => p.id === perf.production_id) || null;
      const venue = venues.find((v) => v.id === perf.venue_id) || null;

      results.push({ performance: perf, production, venue });
    }

    return results;
  }

  // 26. listAuditionOpportunities()
  listAuditionOpportunities() {
    const opportunities = this._getFromStorage("audition_opportunities", []);
    const productions = this._getFromStorage("productions", []);

    return opportunities.map((opportunity) => {
      const production =
        productions.find((p) => p.id === opportunity.production_id) || null;
      return { opportunity, production };
    });
  }

  // 27. getAuditionFilterOptions()
  getAuditionFilterOptions() {
    const opportunities = this._getFromStorage("audition_opportunities", []);
    const productions = this._getFromStorage("productions", []);

    const items = opportunities.map((opportunity) => {
      const production =
        productions.find((p) => p.id === opportunity.production_id) || null;
      return {
        production_id: production ? production.id : null,
        production_title: production ? production.title : "",
        audition_opportunity_id: opportunity.id
      };
    });

    return { productions: items };
  }

  // 28. getAuditionDatesForOpportunity(auditionOpportunityId)
  getAuditionDatesForOpportunity(auditionOpportunityId) {
    const dates = this._getFromStorage("audition_dates", []);
    return dates.filter((d) => d && d.audition_opportunity_id === auditionOpportunityId);
  }

  // 29. getAuditionSlotsForDate(auditionDateId)
  getAuditionSlotsForDate(auditionDateId) {
    const slots = this._getFromStorage("audition_slots", []);
    return slots.filter((s) => s && s.audition_date_id === auditionDateId);
  }

  // 30. createAuditionReservation(...)
  createAuditionReservation(
    auditionSlotId,
    name,
    email,
    phone,
    age_confirmation,
    experience_text,
    agreed_to_policies
  ) {
    const slots = this._getFromStorage("audition_slots", []);
    const reservations = this._getFromStorage("audition_reservations", []);

    const slotIndex = slots.findIndex((s) => s.id === auditionSlotId);
    if (slotIndex === -1) {
      return {
        success: false,
        auditionReservation: null,
        message: "Audition slot not found."
      };
    }

    const slot = slots[slotIndex];
    if (slot.status !== "available") {
      return {
        success: false,
        auditionReservation: null,
        message: "Audition slot is not available."
      };
    }

    const reservation = {
      id: this._generateId("auditionres"),
      audition_slot_id: auditionSlotId,
      name,
      email,
      phone,
      age_confirmation,
      experience_text,
      agreed_to_policies: !!agreed_to_policies,
      reserved_at: this._nowISO()
    };

    reservations.push(reservation);
    this._saveToStorage("audition_reservations", reservations);

    // Update slot status to reserved
    slots[slotIndex] = Object.assign({}, slot, { status: "reserved" });
    this._saveToStorage("audition_slots", slots);

    return {
      success: true,
      auditionReservation: reservation,
      message: "Audition slot reserved."
    };
  }

  // 31. getMembershipFilterOptions()
  getMembershipFilterOptions() {
    const plans = this._getFromStorage("membership_plans", []);

    const audienceSet = new Set();
    const showsSet = new Set();

    for (const plan of plans) {
      if (!plan || plan.status !== "active") continue;
      if (plan.audience) audienceSet.add(plan.audience);
      if (typeof plan.shows_per_season === "number") {
        showsSet.add(plan.shows_per_season);
      }
    }

    const audiences = Array.from(audienceSet).map((value) => ({
      value,
      label: this._humanizeMembershipAudience(value)
    }));

    const shows_per_season_options = Array.from(showsSet)
      .sort((a, b) => a - b);

    return { audiences, shows_per_season_options };
  }

  _humanizeMembershipAudience(value) {
    const map = {
      adults: "Adults",
      youth_family: "Youth & Family",
      students: "Students",
      seniors: "Seniors",
      all_audiences: "All Audiences"
    };
    return map[value] || this._titleCaseFromSnake(value || "");
  }

  // 32. listMembershipPlans(filters)
  listMembershipPlans(filters) {
    const plans = this._getFromStorage("membership_plans", []);
    const effectiveFilters = filters || {};
    const audienceFilter = effectiveFilters.audience || null;
    const minShows =
      typeof effectiveFilters.min_shows_per_season === "number"
        ? effectiveFilters.min_shows_per_season
        : null;

    return plans.filter((plan) => {
      if (!plan || plan.status !== "active") return false;
      if (audienceFilter && plan.audience !== audienceFilter) return false;
      if (
        typeof minShows === "number" &&
        typeof plan.shows_per_season === "number" &&
        plan.shows_per_season < minShows
      ) {
        return false;
      }
      return true;
    });
  }

  // 33. getMembershipPlanDetail(membershipPlanId)
  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage("membership_plans", []);
    return plans.find((p) => p.id === membershipPlanId) || null;
  }

  // 34. addMembershipToCart(membershipPlanId, num_members, billing_frequency)
  addMembershipToCart(membershipPlanId, num_members, billing_frequency) {
    const plans = this._getFromStorage("membership_plans", []);
    const cartItems = this._getFromStorage("cart_items", []);

    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan) {
      return {
        success: false,
        cartId: null,
        cartItem: null,
        total_annual_cost: 0,
        message: "Membership plan not found."
      };
    }

    const allowedBilling = Array.isArray(plan.billing_options)
      ? plan.billing_options
      : [];
    if (allowedBilling.length > 0 && !allowedBilling.includes(billing_frequency)) {
      return {
        success: false,
        cartId: null,
        cartItem: null,
        total_annual_cost: 0,
        message: "Selected billing frequency is not available for this plan."
      };
    }

    const members = Number(num_members) || 0;
    if (members <= 0) {
      return {
        success: false,
        cartId: null,
        cartItem: null,
        total_annual_cost: 0,
        message: "Number of members must be greater than zero."
      };
    }

    if (typeof plan.max_members === "number" && members > plan.max_members) {
      return {
        success: false,
        cartId: null,
        cartItem: null,
        total_annual_cost: 0,
        message: "Number of members exceeds maximum allowed for this plan."
      };
    }

    const annualPricePerMember = Number(plan.annual_price_per_member) || 0;
    const total_annual_cost = annualPricePerMember * members;

    const cart = this._getOrCreateCart();

    const cartItem = {
      id: this._generateId("cartitem"),
      cart_id: cart.id,
      item_type: "membership",
      name: plan.name || "Membership",
      description: plan.short_description || "",
      quantity: members,
      unit_price: annualPricePerMember,
      total_price: total_annual_cost,
      performance_id: null,
      performance_seat_ids: null,
      ticket_type: null,
      membership_plan_id: membershipPlanId,
      membership_billing_frequency: billing_frequency,
      donation_id: null,
      created_at: this._nowISO()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    this._saveCart(cart);

    return {
      success: true,
      cartId: cart.id,
      cartItem,
      total_annual_cost,
      message: "Membership added to cart."
    };
  }

  // 35. getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage("cart_items", []);
    const performances = this._getFromStorage("performances", []);
    const productions = this._getFromStorage("productions", []);
    const membershipPlans = this._getFromStorage("membership_plans", []);
    const donations = this._getFromStorage("donations", []);
    const funds = this._getFromStorage("funds", []);

    const itemsForCart = allItems.filter((ci) => ci && ci.cart_id === cart.id);

    const items = itemsForCart.map((cartItem) => {
      let performance = null;
      let production = null;
      let membershipPlan = null;
      let donation = null;
      let fund = null;

      if (cartItem.performance_id) {
        performance =
          performances.find((p) => p.id === cartItem.performance_id) || null;
        if (performance) {
          production =
            productions.find((p) => p.id === performance.production_id) || null;
        }
      }

      if (cartItem.membership_plan_id) {
        membershipPlan =
          membershipPlans.find((p) => p.id === cartItem.membership_plan_id) || null;
      }

      if (cartItem.donation_id) {
        donation = donations.find((d) => d.id === cartItem.donation_id) || null;
        if (donation) {
          fund = funds.find((f) => f.id === donation.fund_id) || null;
        }
      }

      return {
        cartItem,
        performance,
        production,
        membershipPlan,
        donation,
        fund
      };
    });

    return { cart, items };
  }

  // 36. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return { success: false, cart };
    }

    const qty = Number(quantity) || 0;

    if (qty <= 0) {
      // remove item
      const removedId = cartItemId;
      cartItems = cartItems.filter((ci) => ci.id !== removedId);
      this._saveToStorage("cart_items", cartItems);

      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== removedId);
      }
      this._saveCart(cart);

      return { success: true, cart };
    }

    const item = cartItems[index];
    item.quantity = qty;
    item.total_price = (Number(item.unit_price) || 0) * qty;
    cartItems[index] = item;
    this._saveToStorage("cart_items", cartItems);
    this._saveCart(cart);

    return { success: true, cart };
  }

  // 37. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const exists = cartItems.some((ci) => ci.id === cartItemId);
    if (!exists) {
      return { success: false, cart };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage("cart_items", cartItems);

    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== cartItemId);
    }
    this._saveCart(cart);

    return { success: true, cart };
  }

  // 38. getContactFormOptions()
  getContactFormOptions() {
    const topicsValues = [
      "artistic_new_work",
      "box_office",
      "education",
      "accessibility",
      "general_inquiry",
      "donations_membership",
      "volunteering"
    ];

    const topics = topicsValues.map((value) => ({
      value,
      label: this._humanizeContactTopic(value)
    }));

    const howHeardValues = [
      "attended_a_performance",
      "friend_or_family",
      "social_media",
      "email_newsletter",
      "web_search",
      "other"
    ];

    const how_heard_options = howHeardValues.map((value) => ({
      value,
      label: this._humanizeHowHeard(value)
    }));

    return { topics, how_heard_options };
  }

  _humanizeContactTopic(value) {
    const map = {
      artistic_new_work: "Artistic / New Work",
      box_office: "Box Office",
      education: "Education",
      accessibility: "Accessibility",
      general_inquiry: "General Inquiry",
      donations_membership: "Donations & Membership",
      volunteering: "Volunteering"
    };
    return map[value] || this._titleCaseFromSnake(value || "");
  }

  _humanizeHowHeard(value) {
    const map = {
      attended_a_performance: "Attended a performance",
      friend_or_family: "Friend or family",
      social_media: "Social media",
      email_newsletter: "Email newsletter",
      web_search: "Web search",
      other: "Other"
    };
    return map[value] || this._titleCaseFromSnake(value || "");
  }

  // 39. createContactMessage(...)
  createContactMessage(
    topic,
    subject,
    message_body,
    how_heard,
    name,
    email,
    wants_email_response
  ) {
    const messages = this._getFromStorage("contact_messages", []);

    const message = {
      id: this._generateId("contact"),
      topic,
      subject,
      message_body,
      how_heard: how_heard || null,
      name,
      email,
      wants_email_response: wants_email_response == null ? null : !!wants_email_response,
      submitted_at: this._nowISO()
    };

    messages.push(message);
    this._saveToStorage("contact_messages", messages);

    return {
      success: true,
      contactMessage: message,
      message: "Contact message submitted."
    };
  }

  // 40. getAboutPageContent()
  getAboutPageContent() {
    const defaultContent = {
      mission_text: "",
      vision_text: "",
      history_text: "",
      leadership: [],
      highlights: []
    };

    const stored = this._getFromStorage("about_page_content", null);

    if (!stored || typeof stored !== "object") {
      return defaultContent;
    }

    // Ensure required fields exist
    return {
      mission_text: stored.mission_text || "",
      vision_text: stored.vision_text || "",
      history_text: stored.history_text || "",
      leadership: Array.isArray(stored.leadership) ? stored.leadership : [],
      highlights: Array.isArray(stored.highlights) ? stored.highlights : []
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