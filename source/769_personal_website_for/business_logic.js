// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  _initStorage() {
    // Initialize all data tables in localStorage if not exist (arrays only, no mock records)
    const arrayKeys = [
      'product_categories',
      'products',
      'carts',
      'cart_items',
      'tracks',
      'races',
      'race_watchlist_items',
      'race_favorites',
      'race_results',
      'newsletter_subscriptions',
      'coaching_offerings',
      'coaching_time_slots',
      'coaching_bookings',
      'kart_setups',
      'kart_setup_presets',
      'blog_posts',
      'reading_list_items',
      'sponsorship_inquiries',
      'contact_messages',
      'promotions'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Legacy / unused but kept for compatibility
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareIso(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._nowIso(),
        updatedAt: this._nowIso(),
        currency: 'USD',
        itemsCount: 0,
        subtotal: 0,
        notes: ''
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const cart = carts.find(function (c) { return c.id === cartId; });
    if (!cart) {
      return;
    }
    let itemsCount = 0;
    let subtotal = 0;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cartId === cartId) {
        itemsCount += item.quantity || 0;
        subtotal += item.totalPrice || (item.unitPrice || 0) * (item.quantity || 0);
      }
    }
    cart.itemsCount = itemsCount;
    cart.subtotal = Number(subtotal.toFixed(2));
    cart.updatedAt = this._nowIso();
    this._saveToStorage('carts', carts);
  }

  _getCurrentRaceWatchlist() {
    return this._getFromStorage('race_watchlist_items');
  }

  _getCurrentRaceFavorites() {
    return this._getFromStorage('race_favorites');
  }

  _getCurrentReadingList() {
    return this._getFromStorage('reading_list_items');
  }

  _validateCoachingSlotAvailability(timeSlotId) {
    const slots = this._getFromStorage('coaching_time_slots');
    const slot = slots.find(function (s) { return s.id === timeSlotId; });
    if (!slot || !slot.isAvailable) {
      return { isAvailable: false, slot: null, slots: slots };
    }
    return { isAvailable: true, slot: slot, slots: slots };
  }

  _saveKartSetupPresetInternal(trackId, setupType, name, sourceSetupId, isPreferred) {
    const presets = this._getFromStorage('kart_setup_presets');
    const now = this._nowIso();

    if (isPreferred) {
      for (let i = 0; i < presets.length; i++) {
        if (presets[i].trackId === trackId) {
          presets[i].isPreferred = false;
        }
      }
    }

    const preset = {
      id: this._generateId('kart_preset'),
      name: name,
      trackId: trackId,
      setupType: setupType,
      sourceSetupId: sourceSetupId || null,
      createdAt: now,
      isPreferred: !!isPreferred
    };
    presets.push(preset);
    this._saveToStorage('kart_setup_presets', presets);
    return preset;
  }

  _findCategoryByCode(categoryCode) {
    if (!categoryCode) return null;
    const categories = this._getFromStorage('product_categories');
    const codeLower = String(categoryCode).toLowerCase();
    for (let i = 0; i < categories.length; i++) {
      if (String(categories[i].code).toLowerCase() === codeLower) {
        return categories[i];
      }
    }
    return null;
  }

  // =========================
  // Interfaces implementation
  // =========================

  // Homepage: next upcoming race highlight
  getNextUpcomingRaceHighlight() {
    const races = this._getFromStorage('races');
    const tracks = this._getFromStorage('tracks');
    const raceResults = this._getFromStorage('race_results');
    const watchlistItems = this._getCurrentRaceWatchlist();
    const watchlistIds = {};
    for (let i = 0; i < watchlistItems.length; i++) {
      watchlistIds[watchlistItems[i].raceId] = true;
    }

    const nowIso = this._nowIso();
    let upcoming = [];
    for (let i = 0; i < races.length; i++) {
      const r = races[i];
      if (r.status === 'upcoming' && r.startDateTime && r.startDateTime >= nowIso) {
        upcoming.push(r);
      }
    }
    if (upcoming.length === 0) {
      for (let i = 0; i < races.length; i++) {
        if (races[i].status === 'upcoming') {
          upcoming.push(races[i]);
        }
      }
    }
    if (upcoming.length === 0) {
      return {
        raceId: null,
        name: null,
        series: null,
        seasonYear: null,
        startDateTime: null,
        endDateTime: null,
        trackName: null,
        locationCity: null,
        locationCountry: null,
        status: null,
        watchable: false,
        isInWatchlist: false,
        lastResultPosition: null,
        fastestLapTimeDisplay: null,
        race: null,
        track: null
      };
    }

    upcoming.sort(function (a, b) {
      return a.startDateTime < b.startDateTime ? -1 : (a.startDateTime > b.startDateTime ? 1 : 0);
    });
    const race = upcoming[0];
    const track = tracks.find(function (t) { return t.id === race.trackId; }) || null;

    let lastResultPosition = null;
    let fastestLapTimeDisplay = null;
    const trackId = track ? track.id : null;
    if (trackId) {
      const resultsForTrack = [];
      for (let i = 0; i < raceResults.length; i++) {
        const rr = raceResults[i];
        if (rr.trackId === trackId) {
          resultsForTrack.push(rr);
        }
      }
      if (resultsForTrack.length > 0) {
        resultsForTrack.sort(function (a, b) {
          return a.eventDate < b.eventDate ? 1 : (a.eventDate > b.eventDate ? -1 : 0);
        });
        lastResultPosition = resultsForTrack[0].finishingPosition || null;
        let best = null;
        for (let i = 0; i < resultsForTrack.length; i++) {
          const rr = resultsForTrack[i];
          if (typeof rr.fastestLapTimeSeconds === 'number') {
            if (!best || rr.fastestLapTimeSeconds < best.fastestLapTimeSeconds) {
              best = rr;
            }
          }
        }
        fastestLapTimeDisplay = best ? (best.fastestLapTimeDisplay || null) : null;
      }
    }

    return {
      raceId: race.id,
      name: race.name,
      series: race.series || null,
      seasonYear: race.seasonYear || null,
      startDateTime: race.startDateTime || null,
      endDateTime: race.endDateTime || null,
      trackName: track ? track.name : null,
      locationCity: race.locationCity || null,
      locationCountry: race.locationCountry || (track ? track.country || null : null),
      status: race.status || null,
      watchable: !!race.watchable,
      isInWatchlist: !!watchlistIds[race.id],
      lastResultPosition: lastResultPosition,
      fastestLapTimeDisplay: fastestLapTimeDisplay,
      race: race,
      track: track
    };
  }

  // Homepage: featured products & shop entry
  getFeaturedProducts() {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');
    const promotions = this._getFromStorage('promotions');

    const active = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.status === 'active' && p.inStock) {
        active.push(p);
      }
    }
    active.sort(function (a, b) {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (ra !== rb) return rb - ra;
      return (a.price || 0) - (b.price || 0);
    });

    const featured = [];
    const maxCount = Math.min(active.length, 8);
    for (let i = 0; i < maxCount; i++) {
      const p = active[i];
      const cat = categories.find(function (c) { return c.id === p.categoryId; }) || null;
      featured.push({
        productId: p.id,
        name: p.name,
        categoryName: cat ? cat.name : null,
        price: p.price,
        currency: p.currency,
        thumbnailUrl: p.thumbnailUrl || p.imageUrl || null,
        isSigned: !!p.isSigned,
        color: p.color || null,
        rating: typeof p.rating === 'number' ? p.rating : null,
        ratingCount: typeof p.ratingCount === 'number' ? p.ratingCount : 0,
        inStock: !!p.inStock,
        isNew: false,
        isOnSale: false,
        product: p,
        category: cat
      });
    }

    return {
      categories: categories,
      products: featured,
      promotions: promotions
    };
  }

  // Homepage: latest blog posts
  getLatestBlogPosts(limit) {
    const posts = this._getFromStorage('blog_posts');
    const lim = typeof limit === 'number' && limit > 0 ? limit : 3;
    posts.sort(function (a, b) {
      return a.publishedAt < b.publishedAt ? 1 : (a.publishedAt > b.publishedAt ? -1 : 0);
    });
    return posts.slice(0, lim);
  }

  // Races listing filter options
  getRaceFilterOptions() {
    const races = this._getFromStorage('races');
    const countriesMap = {};
    const seasonsMap = {};
    const seriesMap = {};

    for (let i = 0; i < races.length; i++) {
      const r = races[i];
      if (r.locationCountry) {
        const c = r.locationCountry;
        if (!countriesMap[c]) {
          countriesMap[c] = { code: c, label: c };
        }
      }
      if (typeof r.seasonYear === 'number') {
        const y = r.seasonYear;
        if (!seasonsMap[y]) {
          seasonsMap[y] = { seasonYear: y, label: String(y) };
        }
      }
      if (r.series) {
        const s = r.series;
        if (!seriesMap[s]) {
          seriesMap[s] = { code: s, label: s };
        }
      }
    }

    const countries = Object.keys(countriesMap).sort().map(function (k) { return countriesMap[k]; });
    const seasons = Object.keys(seasonsMap).sort().map(function (k) { return seasonsMap[k]; });
    const series = Object.keys(seriesMap).sort().map(function (k) { return seriesMap[k]; });

    const sortOptions = [
      { code: 'date_soonest', label: 'Date: Soonest First' },
      { code: 'date_latest', label: 'Date: Latest First' },
      { code: 'series_az', label: 'Series: A–Z' }
    ];

    return {
      countries: countries,
      seasons: seasons,
      series: series,
      sortOptions: sortOptions
    };
  }

  // Races search
  searchRaces(startDate, endDate, locationCountry, locationCity, seasonYear, status, sortBy, page, pageSize) {
    const races = this._getFromStorage('races');
    const tracks = this._getFromStorage('tracks');
    const watchlist = this._getCurrentRaceWatchlist();
    const favorites = this._getCurrentRaceFavorites();

    const watchIds = {};
    for (let i = 0; i < watchlist.length; i++) {
      watchIds[watchlist[i].raceId] = true;
    }
    const favIds = {};
    for (let i = 0; i < favorites.length; i++) {
      favIds[favorites[i].raceId] = true;
    }

    const startDateIso = startDate ? startDate + 'T00:00:00.000Z' : null;
    const endDateIso = endDate ? endDate + 'T23:59:59.999Z' : null;
    const countryLower = locationCountry ? String(locationCountry).toLowerCase() : null;
    const cityLower = locationCity ? String(locationCity).toLowerCase() : null;
    const sort = sortBy || 'date_soonest';

    const filtered = [];
    for (let i = 0; i < races.length; i++) {
      const r = races[i];
      const track = tracks.find(function (t) { return t.id === r.trackId; }) || null;

      if (startDateIso && (!r.startDateTime || r.startDateTime < startDateIso)) continue;
      if (endDateIso && (!r.startDateTime || r.startDateTime > endDateIso)) continue;

      if (countryLower) {
        const rc = r.locationCountry ? String(r.locationCountry).toLowerCase() : null;
        const tc = track && track.country ? String(track.country).toLowerCase() : null;
        if (rc !== countryLower && tc !== countryLower) continue;
      }

      if (cityLower) {
        const rcity = r.locationCity ? String(r.locationCity).toLowerCase() : null;
        const tcity = track && track.city ? String(track.city).toLowerCase() : null;
        if (rcity !== cityLower && tcity !== cityLower) continue;
      }

      if (typeof seasonYear === 'number' && r.seasonYear !== seasonYear) continue;
      if (status && r.status !== status) continue;

      filtered.push({ race: r, track: track });
    }

    filtered.sort(function (a, b) {
      if (sort === 'date_latest') {
        return a.race.startDateTime < b.race.startDateTime ? 1 : (a.race.startDateTime > b.race.startDateTime ? -1 : 0);
      }
      if (sort === 'series_az') {
        const sa = a.race.series || '';
        const sb = b.race.series || '';
        if (sa < sb) return -1;
        if (sa > sb) return 1;
        return 0;
      }
      // default date_soonest
      return a.race.startDateTime < b.race.startDateTime ? -1 : (a.race.startDateTime > b.race.startDateTime ? 1 : 0);
    });

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = filtered.length;
    const startIdx = (p - 1) * ps;
    const pageItems = filtered.slice(startIdx, startIdx + ps);

    const results = [];
    for (let i = 0; i < pageItems.length; i++) {
      const r = pageItems[i].race;
      const t = pageItems[i].track;
      results.push({
        raceId: r.id,
        name: r.name,
        series: r.series || null,
        seasonYear: r.seasonYear || null,
        startDateTime: r.startDateTime || null,
        endDateTime: r.endDateTime || null,
        trackName: t ? t.name : null,
        locationCity: r.locationCity || (t ? t.city || null : null),
        locationCountry: r.locationCountry || (t ? t.country || null : null),
        status: r.status || null,
        watchable: !!r.watchable,
        isInWatchlist: !!watchIds[r.id],
        isInFavorites: !!favIds[r.id],
        race: r,
        track: t
      });
    }

    return {
      results: results,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // Race detail
  getRaceDetail(raceId) {
    const races = this._getFromStorage('races');
    const tracks = this._getFromStorage('tracks');
    const raceResults = this._getFromStorage('race_results');
    const watchlist = this._getCurrentRaceWatchlist();
    const favorites = this._getCurrentRaceFavorites();

    const race = races.find(function (r) { return r.id === raceId; }) || null;
    const track = race ? (tracks.find(function (t) { return t.id === race.trackId; }) || null) : null;

    const hasResults = !!raceResults.find(function (rr) { return rr.raceId === raceId; });
    const isInWatchlist = !!watchlist.find(function (w) { return w.raceId === raceId; });
    const isInFavorites = !!favorites.find(function (f) { return f.raceId === raceId; });

    return {
      race: race,
      track: track,
      hasResults: hasResults,
      isInWatchlist: isInWatchlist,
      isInFavorites: isInFavorites,
      schedule: [],
      entryList: []
    };
  }

  // Watchlist
  addRaceToWatchlist(raceId) {
    const races = this._getFromStorage('races');
    const race = races.find(function (r) { return r.id === raceId; });
    if (!race) {
      return { success: false, watchlistItem: null, watchlistCount: this._getCurrentRaceWatchlist().length, message: 'Race not found' };
    }
    const items = this._getCurrentRaceWatchlist();
    const existing = items.find(function (w) { return w.raceId === raceId; });
    if (existing) {
      return { success: true, watchlistItem: existing, watchlistCount: items.length, message: 'Race already in watchlist' };
    }
    const item = {
      id: this._generateId('race_watchlist_item'),
      raceId: raceId,
      addedAt: this._nowIso(),
      notes: ''
    };
    items.push(item);
    this._saveToStorage('race_watchlist_items', items);
    return { success: true, watchlistItem: item, watchlistCount: items.length, message: 'Race added to watchlist' };
  }

  removeRaceFromWatchlist(raceId) {
    const items = this._getCurrentRaceWatchlist();
    const filtered = items.filter(function (w) { return w.raceId !== raceId; });
    this._saveToStorage('race_watchlist_items', filtered);
    return { success: true, watchlistCount: filtered.length, message: 'Race removed from watchlist' };
  }

  getRaceWatchlist() {
    const items = this._getCurrentRaceWatchlist();
    const races = this._getFromStorage('races');
    const tracks = this._getFromStorage('tracks');

    const enriched = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const race = races.find(function (r) { return r.id === it.raceId; }) || null;
      const track = race ? (tracks.find(function (t) { return t.id === race.trackId; }) || null) : null;
      enriched.push({
        watchlistItemId: it.id,
        addedAt: it.addedAt,
        raceId: race ? race.id : null,
        name: race ? race.name : null,
        series: race ? race.series || null : null,
        seasonYear: race ? race.seasonYear || null : null,
        startDateTime: race ? race.startDateTime || null : null,
        trackName: track ? track.name : null,
        locationCity: race ? (race.locationCity || (track ? track.city || null : null)) : null,
        locationCountry: race ? (race.locationCountry || (track ? track.country || null : null)) : null,
        status: race ? race.status || null : null,
        race: race,
        track: track
      });
    }

    enriched.sort(function (a, b) {
      return a.startDateTime < b.startDateTime ? -1 : (a.startDateTime > b.startDateTime ? 1 : 0);
    });

    return enriched;
  }

  // Results filter options
  getRaceResultsFilterOptions() {
    const raceResults = this._getFromStorage('race_results');
    const tracks = this._getFromStorage('tracks');

    const seasonsMap = {};
    for (let i = 0; i < raceResults.length; i++) {
      const rr = raceResults[i];
      if (typeof rr.seasonYear === 'number' && !seasonsMap[rr.seasonYear]) {
        seasonsMap[rr.seasonYear] = { seasonYear: rr.seasonYear, label: String(rr.seasonYear) };
      }
    }
    const seasons = Object.keys(seasonsMap).sort().map(function (k) { return seasonsMap[k]; });

    const sortOptions = [
      { code: 'fastest_lap_best', label: 'Fastest Lap Time: Best First' },
      { code: 'event_date_desc', label: 'Event Date: Newest First' },
      { code: 'event_date_asc', label: 'Event Date: Oldest First' }
    ];

    return {
      seasons: seasons,
      tracks: tracks,
      sortOptions: sortOptions
    };
  }

  // Results search
  searchRaceResults(seasonYear, trackId, sortBy, page, pageSize) {
    const raceResults = this._getFromStorage('race_results');
    const races = this._getFromStorage('races');
    const tracks = this._getFromStorage('tracks');
    const favorites = this._getCurrentRaceFavorites();

    const favIds = {};
    for (let i = 0; i < favorites.length; i++) {
      favIds[favorites[i].raceId] = true;
    }

    const sort = sortBy || 'event_date_desc';

    const filtered = [];
    for (let i = 0; i < raceResults.length; i++) {
      const rr = raceResults[i];
      if (typeof seasonYear === 'number' && rr.seasonYear !== seasonYear) continue;

      if (trackId) {
        let match = false;
        if (rr.trackId === trackId) {
          match = true;
        } else {
          const race = races.find(function (r) { return r.id === rr.raceId; });
          if (race && race.trackId === trackId) match = true;
        }
        if (!match) continue;
      }

      filtered.push(rr);
    }

    filtered.sort(function (a, b) {
      if (sort === 'fastest_lap_best') {
        const af = typeof a.fastestLapTimeSeconds === 'number' ? a.fastestLapTimeSeconds : Infinity;
        const bf = typeof b.fastestLapTimeSeconds === 'number' ? b.fastestLapTimeSeconds : Infinity;
        if (af !== bf) return af - bf;
        return a.eventDate < b.eventDate ? 1 : (a.eventDate > b.eventDate ? -1 : 0);
      }
      if (sort === 'event_date_asc') {
        return a.eventDate < b.eventDate ? -1 : (a.eventDate > b.eventDate ? 1 : 0);
      }
      // default event_date_desc
      return a.eventDate < b.eventDate ? 1 : (a.eventDate > b.eventDate ? -1 : 0);
    });

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = filtered.length;
    const startIdx = (p - 1) * ps;
    const pageItems = filtered.slice(startIdx, startIdx + ps);

    const results = [];
    for (let i = 0; i < pageItems.length; i++) {
      const rr = pageItems[i];
      const race = races.find(function (r) { return r.id === rr.raceId; }) || null;
      const track = (rr.trackId && tracks.find(function (t) { return t.id === rr.trackId; })) || (race ? tracks.find(function (t) { return t.id === race.trackId; }) : null) || null;
      results.push({
        raceResultId: rr.id,
        raceId: rr.raceId,
        raceName: race ? race.name : null,
        trackName: track ? track.name : null,
        seasonYear: rr.seasonYear,
        eventDate: rr.eventDate,
        finishingPosition: rr.finishingPosition,
        fastestLapTimeSeconds: rr.fastestLapTimeSeconds,
        fastestLapTimeDisplay: rr.fastestLapTimeDisplay,
        isFavorite: race ? !!favIds[race.id] : false,
        raceResult: rr,
        race: race,
        track: track
      });
    }

    return {
      results: results,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // Favorites
  addRaceToFavorites(raceId) {
    const races = this._getFromStorage('races');
    const race = races.find(function (r) { return r.id === raceId; });
    if (!race) {
      return { success: false, favorite: null, favoritesCount: this._getCurrentRaceFavorites().length, message: 'Race not found' };
    }
    const favs = this._getCurrentRaceFavorites();
    const existing = favs.find(function (f) { return f.raceId === raceId; });
    if (existing) {
      return { success: true, favorite: existing, favoritesCount: favs.length, message: 'Race already in favorites' };
    }
    const favorite = {
      id: this._generateId('race_favorite'),
      raceId: raceId,
      addedAt: this._nowIso()
    };
    favs.push(favorite);
    this._saveToStorage('race_favorites', favs);
    return { success: true, favorite: favorite, favoritesCount: favs.length, message: 'Race added to favorites' };
  }

  removeRaceFromFavorites(raceId) {
    const favs = this._getCurrentRaceFavorites();
    const filtered = favs.filter(function (f) { return f.raceId !== raceId; });
    this._saveToStorage('race_favorites', filtered);
    return { success: true, favoritesCount: filtered.length, message: 'Race removed from favorites' };
  }

  getFavoriteRaces(sortBy) {
    const favs = this._getCurrentRaceFavorites();
    const races = this._getFromStorage('races');
    const tracks = this._getFromStorage('tracks');
    const raceResults = this._getFromStorage('race_results');

    const enriched = [];
    for (let i = 0; i < favs.length; i++) {
      const f = favs[i];
      const race = races.find(function (r) { return r.id === f.raceId; }) || null;
      if (!race) continue;
      const track = tracks.find(function (t) { return t.id === race.trackId; }) || null;
      const resultsForRace = raceResults.filter(function (rr) { return rr.raceId === race.id; });
      let eventDate = race.startDateTime || null;
      let fastestLapTimeDisplay = null;
      let bestLapSeconds = null;
      for (let j = 0; j < resultsForRace.length; j++) {
        const rr = resultsForRace[j];
        if (!eventDate || (rr.eventDate && rr.eventDate > eventDate)) {
          eventDate = rr.eventDate;
        }
        if (typeof rr.fastestLapTimeSeconds === 'number') {
          if (bestLapSeconds === null || rr.fastestLapTimeSeconds < bestLapSeconds) {
            bestLapSeconds = rr.fastestLapTimeSeconds;
            fastestLapTimeDisplay = rr.fastestLapTimeDisplay || null;
          }
        }
      }
      enriched.push({
        favoriteId: f.id,
        addedAt: f.addedAt,
        raceId: race.id,
        raceName: race.name,
        trackName: track ? track.name : null,
        seasonYear: race.seasonYear || null,
        eventDate: eventDate,
        fastestLapTimeDisplay: fastestLapTimeDisplay,
        race: race,
        track: track
      });
    }

    const sort = sortBy || 'event_date_desc';
    enriched.sort(function (a, b) {
      if (sort === 'fastest_lap_best') {
        const ad = a.fastestLapTimeDisplay;
        const bd = b.fastestLapTimeDisplay;
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return 0;
      }
      if (sort === 'event_date_asc') {
        if (!a.eventDate && !b.eventDate) return 0;
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return a.eventDate < b.eventDate ? -1 : (a.eventDate > b.eventDate ? 1 : 0);
      }
      // default event_date_desc
      if (!a.eventDate && !b.eventDate) return 0;
      if (!a.eventDate) return 1;
      if (!b.eventDate) return -1;
      return a.eventDate < b.eventDate ? 1 : (a.eventDate > b.eventDate ? -1 : 0);
    });

    return enriched;
  }

  // Product categories
  getProductCategories() {
    const categories = this._getFromStorage('product_categories');
    categories.sort(function (a, b) {
      if (typeof a.sortOrder === 'number' && typeof b.sortOrder === 'number' && a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      const na = a.name || '';
      const nb = b.name || '';
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });
    return categories;
  }

  // Product filter options
  getProductFilterOptions(categoryCode) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const category = this._findCategoryByCode(categoryCode);
    const productsFiltered = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.status !== 'active') continue;
      if (category && p.categoryId !== category.id) continue;
      productsFiltered.push(p);
    }

    const colorMap = {};
    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < productsFiltered.length; i++) {
      const p = productsFiltered[i];
      if (p.color) {
        const c = p.color;
        if (!colorMap[c]) {
          colorMap[c] = { code: c, label: c };
        }
      }
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    const colors = Object.keys(colorMap).sort().map(function (k) { return colorMap[k]; });
    const priceRange = { min: minPrice === null ? 0 : minPrice, max: maxPrice === null ? 0 : maxPrice };
    const ratingThresholds = [1, 2, 3, 4];

    const sortOptions = [
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'rating_desc', label: 'Customer Rating: High to Low' },
      { code: 'rating_asc', label: 'Customer Rating: Low to High' },
      { code: 'newest', label: 'Newest' }
    ];

    return {
      colors: colors,
      priceRange: priceRange,
      ratingThresholds: ratingThresholds,
      sortOptions: sortOptions
    };
  }

  // Product search
  searchProducts(query, categoryCode, isSigned, color, minPrice, maxPrice, minRating, inStockOnly, sortBy, page, pageSize) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const cat = this._findCategoryByCode(categoryCode);
    // Treat "all_merch" ("All Merchandise") as a virtual category that should not filter by categoryId
    // so that searches can span all merchandise.
    const effectiveCat = cat && String(cat.code).toLowerCase() === 'all_merch' ? null : cat;
    const q = query ? String(query).toLowerCase() : null;
    const colorLower = color ? String(color).toLowerCase() : null;
    const signedFilterDefined = typeof isSigned === 'boolean';
    const inStockOnlyValue = typeof inStockOnly === 'boolean' ? inStockOnly : true;
    const sort = sortBy || 'relevance';

    const filtered = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.status !== 'active') continue;
      if (inStockOnlyValue && !p.inStock) continue;
      if (effectiveCat && p.categoryId !== effectiveCat.id) continue;
      if (q) {
        const name = p.name ? p.name.toLowerCase() : '';
        const desc = p.description ? p.description.toLowerCase() : '';
        if (name.indexOf(q) === -1 && desc.indexOf(q) === -1) continue;
      }
      if (signedFilterDefined) {
        if (!!p.isSigned !== isSigned) continue;
      }
      if (colorLower) {
        const pc = p.color ? p.color.toLowerCase() : null;
        if (pc !== colorLower) continue;
      }
      if (typeof minPrice === 'number' && typeof p.price === 'number' && p.price < minPrice) continue;
      if (typeof maxPrice === 'number' && typeof p.price === 'number' && p.price > maxPrice) continue;
      if (typeof minRating === 'number') {
        const r = typeof p.rating === 'number' ? p.rating : 0;
        if (r < minRating) continue;
      }
      filtered.push(p);
    }

    filtered.sort(function (a, b) {
      if (sort === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sort === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sort === 'rating_desc') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (ra !== rb) return rb - ra;
        return (a.price || 0) - (b.price || 0);
      }
      if (sort === 'rating_asc') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (ra !== rb) return ra - rb;
        return (a.price || 0) - (b.price || 0);
      }
      if (sort === 'newest') {
        const ca = a.createdAt || '';
        const cb = b.createdAt || '';
        return ca < cb ? 1 : (ca > cb ? -1 : 0);
      }
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (ra !== rb) return rb - ra;
      return (a.price || 0) - (b.price || 0);
    });

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = filtered.length;
    const startIdx = (p - 1) * ps;
    const pageItems = filtered.slice(startIdx, startIdx + ps);

    const results = [];
    for (let i = 0; i < pageItems.length; i++) {
      const prod = pageItems[i];
      const category = categories.find(function (c) { return c.id === prod.categoryId; }) || null;
      results.push({
        productId: prod.id,
        name: prod.name,
        categoryName: category ? category.name : null,
        price: prod.price,
        currency: prod.currency,
        thumbnailUrl: prod.thumbnailUrl || prod.imageUrl || null,
        isSigned: !!prod.isSigned,
        color: prod.color || null,
        rating: typeof prod.rating === 'number' ? prod.rating : null,
        ratingCount: typeof prod.ratingCount === 'number' ? prod.ratingCount : 0,
        inStock: !!prod.inStock,
        hasSizeOptions: !!prod.hasSizeOptions,
        product: prod,
        category: category
      });
    }

    return {
      results: results,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // Product detail
  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    const category = product ? (categories.find(function (c) { return c.id === product.categoryId; }) || null) : null;

    const display = {
      images: product && product.imageUrl ? [product.imageUrl] : [],
      mainImageUrl: product ? (product.imageUrl || product.thumbnailUrl || null) : null,
      rating: product && typeof product.rating === 'number' ? product.rating : null,
      ratingCount: product && typeof product.ratingCount === 'number' ? product.ratingCount : 0,
      isInStock: product ? !!product.inStock : false
    };

    return {
      product: product,
      category: category,
      display: display
    };
  }

  // Related products (simple same-category suggestions)
  getRelatedProducts(productId, limit) {
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product) return [];
    const max = typeof limit === 'number' && limit > 0 ? limit : 4;

    const related = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.id === productId) continue;
      if (p.status !== 'active') continue;
      if (p.categoryId === product.categoryId) {
        related.push(p);
      }
    }

    related.sort(function (a, b) {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (ra !== rb) return rb - ra;
      return (a.price || 0) - (b.price || 0);
    });

    return related.slice(0, max);
  }

  // Cart: add product
  addProductToCart(productId, quantity, variantSize, variantColor) {
    const q = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; });
    if (!product || product.status !== 'active' || !product.inStock) {
      return { success: false, cart: null, items: [], message: 'Product not available' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let existing = null;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cartId === cart.id && item.productId === productId && (item.variantSize || null) === (variantSize || null) && (item.variantColor || null) === (variantColor || null)) {
        existing = item;
        break;
      }
    }

    if (existing) {
      existing.quantity += q;
      existing.totalPrice = Number((existing.unitPrice * existing.quantity).toFixed(2));
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: q,
        totalPrice: Number((product.price * q).toFixed(2)),
        variantSize: variantSize || null,
        variantColor: variantColor || null,
        addedAt: this._nowIso()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart.id);

    const updatedCart = this._getOrCreateCart();
    const itemsForCart = this._getFromStorage('cart_items').filter(function (ci) { return ci.cartId === updatedCart.id; });

    return { success: true, cart: updatedCart, items: itemsForCart, message: 'Product added to cart' };
  }

  // Cart: get current cart with resolved product
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const it = cartItems[i];
      if (it.cartId !== cart.id) continue;
      const product = products.find(function (p) { return p.id === it.productId; }) || null;
      const category = product ? (categories.find(function (c) { return c.id === product.categoryId; }) || null) : null;
      items.push({
        cartItemId: it.id,
        productId: it.productId,
        productName: it.productName,
        categoryName: category ? category.name : null,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        totalPrice: it.totalPrice,
        variantSize: it.variantSize || null,
        variantColor: it.variantColor || null,
        imageUrl: product ? (product.thumbnailUrl || product.imageUrl || null) : null,
        product: product,
        category: category,
        cart: cart
      });
    }

    return {
      cart: cart,
      items: items
    };
  }

  // Cart: update quantity
  updateCartItemQuantity(cartItemId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      return { success: false, cart: null, items: [], message: 'Quantity must be positive' };
    }
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(function (ci) { return ci.id === cartItemId; });
    if (!item) {
      return { success: false, cart: null, items: [], message: 'Cart item not found' };
    }
    item.quantity = quantity;
    item.totalPrice = Number((item.unitPrice * quantity).toFixed(2));
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(item.cartId);

    const cart = this._getOrCreateCart();
    const items = this._getFromStorage('cart_items').filter(function (ci) { return ci.cartId === cart.id; });
    return { success: true, cart: cart, items: items };
  }

  // Cart: remove item
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(function (ci) { return ci.id === cartItemId; });
    if (!item) {
      return { success: false, cart: null, items: [], message: 'Cart item not found' };
    }
    const filtered = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
    this._saveToStorage('cart_items', filtered);
    this._recalculateCartTotals(item.cartId);

    const cart = this._getOrCreateCart();
    const items = this._getFromStorage('cart_items').filter(function (ci) { return ci.cartId === cart.id; });
    return { success: true, cart: cart, items: items };
  }

  // Newsletter options
  getNewsletterPreferencesOptions() {
    const contentPreferences = [
      {
        code: 'race_results',
        label: 'Race Results',
        description: 'Post-race summaries, standings, and lap times.'
      },
      {
        code: 'behind_the_scenes',
        label: 'Behind the Scenes',
        description: 'Training days, travel stories, and team life.'
      },
      {
        code: 'fitness',
        label: 'Fitness & Training',
        description: 'Workouts, routines, and preparation tips.'
      },
      {
        code: 'driving_technique',
        label: 'Driving Technique',
        description: 'Lines, braking, and kart setup insights.'
      }
    ];

    const frequencies = [
      {
        value: 'daily',
        label: 'Daily',
        description: 'Short daily updates when there is news.'
      },
      {
        value: 'weekly',
        label: 'Weekly',
        description: 'A weekly roundup with key highlights.'
      },
      {
        value: 'monthly',
        label: 'Monthly',
        description: 'A single digest each month.'
      }
    ];

    return {
      contentPreferences: contentPreferences,
      frequencies: frequencies
    };
  }

  // Newsletter subscription
  createNewsletterSubscription(email, preferences, frequency, consentAccepted, sourcePage) {
    if (!email || typeof email !== 'string') {
      return { subscription: null, success: false, message: 'Email is required' };
    }
    const freq = frequency || 'weekly';
    if (freq !== 'daily' && freq !== 'weekly' && freq !== 'monthly') {
      return { subscription: null, success: false, message: 'Invalid frequency' };
    }
    if (!consentAccepted) {
      return { subscription: null, success: false, message: 'Consent must be accepted' };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    const prefArr = Array.isArray(preferences) ? preferences : [];
    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email: email,
      preferences: prefArr,
      frequency: freq,
      consentAccepted: true,
      subscribedAt: this._nowIso(),
      sourcePage: sourcePage || null
    };
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return { subscription: subscription, success: true, message: 'Subscription created' };
  }

  // Coaching offerings
  getCoachingOfferings() {
    const offerings = this._getFromStorage('coaching_offerings');
    return offerings.filter(function (o) { return o.isActive; });
  }

  // Coaching availability calendar
  getCoachingAvailabilityCalendar(offeringId, year, month) {
    const slots = this._getFromStorage('coaching_time_slots');
    const y = year;
    const m = month; // 1-12
    const daysMap = {};

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.offeringId !== offeringId || !s.isAvailable || !s.startDateTime) continue;
      const iso = s.startDateTime;
      const slotYear = parseInt(iso.substring(0, 4), 10);
      const slotMonth = parseInt(iso.substring(5, 7), 10);
      if (slotYear !== y || slotMonth !== m) continue;
      const dateStr = iso.substring(0, 10);
      const timeStr = iso.substring(11, 16);
      if (!daysMap[dateStr]) {
        const dateObj = new Date(iso);
        const dayOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][dateObj.getUTCDay()];
        daysMap[dateStr] = {
          date: dateStr,
          dayOfWeek: dayOfWeek,
          hasAvailableSlots: true,
          availableSlotsCount: 1,
          earliestAvailableTime: timeStr
        };
      } else {
        const d = daysMap[dateStr];
        d.hasAvailableSlots = true;
        d.availableSlotsCount += 1;
        if (timeStr < d.earliestAvailableTime) {
          d.earliestAvailableTime = timeStr;
        }
      }
    }

    const dates = Object.keys(daysMap).sort();
    const days = dates.map(function (d) { return daysMap[d]; });

    return {
      year: y,
      month: m,
      timezone: 'UTC',
      days: days
    };
  }

  // Coaching slots for a date
  getCoachingTimeSlotsForDate(offeringId, date) {
    const slots = this._getFromStorage('coaching_time_slots');
    const offerings = this._getFromStorage('coaching_offerings');
    const offering = offerings.find(function (o) { return o.id === offeringId; }) || null;
    const result = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.offeringId === offeringId && s.startDateTime && s.startDateTime.indexOf(date) === 0 && s.isAvailable) {
        const enriched = {};
        for (const k in s) {
          if (Object.prototype.hasOwnProperty.call(s, k)) enriched[k] = s[k];
        }
        enriched.offering = offering;
        result.push(enriched);
      }
    }
    result.sort(function (a, b) {
      return a.startDateTime < b.startDateTime ? -1 : (a.startDateTime > b.startDateTime ? 1 : 0);
    });
    return result;
  }

  // Coaching booking
  createCoachingBooking(offeringId, timeSlotId, customerName, email, experienceLevel) {
    if (!customerName || !email) {
      return { booking: null, success: false, message: 'Name and email are required' };
    }
    const allowedLevels = ['beginner', 'intermediate', 'advanced', 'professional'];
    if (allowedLevels.indexOf(experienceLevel) === -1) {
      return { booking: null, success: false, message: 'Invalid experience level' };
    }

    const offerings = this._getFromStorage('coaching_offerings');
    const offering = offerings.find(function (o) { return o.id === offeringId; });
    if (!offering) {
      return { booking: null, success: false, message: 'Offering not found' };
    }

    const validation = this._validateCoachingSlotAvailability(timeSlotId);
    if (!validation.isAvailable || !validation.slot) {
      return { booking: null, success: false, message: 'Time slot not available' };
    }

    const slots = validation.slots;
    const slot = validation.slot;
    slot.isAvailable = false;
    this._saveToStorage('coaching_time_slots', slots);

    const bookings = this._getFromStorage('coaching_bookings');
    const booking = {
      id: this._generateId('coaching_booking'),
      offeringId: offeringId,
      timeSlotId: timeSlotId,
      customerName: customerName,
      email: email,
      experienceLevel: experienceLevel,
      status: 'pending',
      createdAt: this._nowIso()
    };
    bookings.push(booking);
    this._saveToStorage('coaching_bookings', bookings);

    return { booking: booking, success: true, message: 'Booking created' };
  }

  // Kart tracks
  getKartTracks(onlyKartCircuits) {
    const tracks = this._getFromStorage('tracks');
    const onlyKart = typeof onlyKartCircuits === 'boolean' ? onlyKartCircuits : true;
    if (!onlyKart) return tracks;
    return tracks.filter(function (t) { return !!t.isKartCircuit; });
  }

  // Kart setups for a track
  getKartSetupsForTrack(trackId) {
    const tracks = this._getFromStorage('tracks');
    const setups = this._getFromStorage('kart_setups');
    const track = tracks.find(function (t) { return t.id === trackId; }) || null;
    const setupsForTrack = setups.filter(function (s) { return s.trackId === trackId; }).map(function (s) {
      const copy = {};
      for (const k in s) {
        if (Object.prototype.hasOwnProperty.call(s, k)) copy[k] = s[k];
      }
      copy.track = track;
      return copy;
    });
    return {
      track: track,
      setups: setupsForTrack
    };
  }

  // Kart setup presets
  getKartSetupPresets(trackId) {
    const presets = this._getFromStorage('kart_setup_presets');
    const setups = this._getFromStorage('kart_setups');
    const tracks = this._getFromStorage('tracks');
    const track = tracks.find(function (t) { return t.id === trackId; }) || null;

    const result = [];
    for (let i = 0; i < presets.length; i++) {
      const p = presets[i];
      if (p.trackId !== trackId) continue;
      const sourceSetup = p.sourceSetupId ? (setups.find(function (s) { return s.id === p.sourceSetupId; }) || null) : null;
      const copy = {};
      for (const k in p) {
        if (Object.prototype.hasOwnProperty.call(p, k)) copy[k] = p[k];
      }
      copy.track = track;
      copy.sourceSetup = sourceSetup;
      result.push(copy);
    }

    result.sort(function (a, b) {
      if (a.isPreferred && !b.isPreferred) return -1;
      if (!a.isPreferred && b.isPreferred) return 1;
      return a.createdAt < b.createdAt ? 1 : (a.createdAt > b.createdAt ? -1 : 0);
    });

    return result;
  }

  createKartSetupPreset(trackId, setupType, name, sourceSetupId, isPreferred) {
    if (!trackId || !setupType || !name) {
      return { preset: null, success: false, message: 'trackId, setupType and name are required' };
    }
    if (setupType !== 'dry' && setupType !== 'wet') {
      return { preset: null, success: false, message: 'Invalid setupType' };
    }
    const tracks = this._getFromStorage('tracks');
    const track = tracks.find(function (t) { return t.id === trackId; });
    if (!track) {
      return { preset: null, success: false, message: 'Track not found' };
    }

    const preferred = typeof isPreferred === 'boolean' ? isPreferred : true;
    const preset = this._saveKartSetupPresetInternal(trackId, setupType, name, sourceSetupId, preferred);

    return { preset: preset, success: true, message: 'Preset saved' };
  }

  // Blog filters
  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts');
    const yearsMap = {};
    const tagsMap = {};

    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      if (p.publishedAt) {
        const year = parseInt(p.publishedAt.substring(0, 4), 10);
        if (!isNaN(year)) yearsMap[year] = true;
      }
      if (Array.isArray(p.tags)) {
        for (let j = 0; j < p.tags.length; j++) {
          const t = p.tags[j];
          if (!tagsMap[t]) {
            const label = t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ');
            tagsMap[t] = { code: t, label: label };
          }
        }
      }
    }

    const years = Object.keys(yearsMap).map(function (y) { return parseInt(y, 10); }).sort(function (a, b) { return b - a; });
    const tags = Object.keys(tagsMap).sort().map(function (k) { return tagsMap[k]; });

    return {
      years: years,
      tags: tags
    };
  }

  // Blog search
  searchBlogPosts(query, year, tags, sortBy, page, pageSize) {
    const posts = this._getFromStorage('blog_posts');
    const q = query ? String(query).toLowerCase() : null;
    const yearNum = typeof year === 'number' ? year : null;
    const tagList = Array.isArray(tags) ? tags : null;
    const sort = sortBy || 'date_desc';

    const filtered = [];
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      if (q) {
        const title = p.title ? p.title.toLowerCase() : '';
        const summary = p.summary ? p.summary.toLowerCase() : '';
        const content = p.content ? p.content.toLowerCase() : '';
        if (title.indexOf(q) === -1 && summary.indexOf(q) === -1 && content.indexOf(q) === -1) continue;
      }
      if (yearNum) {
        if (!p.publishedAt || parseInt(p.publishedAt.substring(0, 4), 10) !== yearNum) continue;
      }
      if (tagList && tagList.length > 0) {
        const ptags = Array.isArray(p.tags) ? p.tags : [];
        let any = false;
        for (let j = 0; j < tagList.length; j++) {
          if (ptags.indexOf(tagList[j]) !== -1) {
            any = true;
            break;
          }
        }
        if (!any) continue;
      }
      filtered.push(p);
    }

    filtered.sort(function (a, b) {
      if (sort === 'date_asc') {
        return a.publishedAt < b.publishedAt ? -1 : (a.publishedAt > b.publishedAt ? 1 : 0);
      }
      // default date_desc
      return a.publishedAt < b.publishedAt ? 1 : (a.publishedAt > b.publishedAt ? -1 : 0);
    });

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
    const total = filtered.length;
    const startIdx = (p - 1) * ps;
    const pageItems = filtered.slice(startIdx, startIdx + ps);

    return {
      results: pageItems,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // Blog detail
  getBlogPostDetail(blogPostId) {
    const posts = this._getFromStorage('blog_posts');
    const reading = this._getCurrentReadingList();
    const post = posts.find(function (p) { return p.id === blogPostId; }) || null;
    const isInReadingList = !!reading.find(function (r) { return r.blogPostId === blogPostId; });
    return { post: post, isInReadingList: isInReadingList };
  }

  // Reading list add
  addBlogPostToReadingList(blogPostId) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find(function (p) { return p.id === blogPostId; });
    if (!post) {
      return { readingListItem: null, success: false, totalItems: this._getCurrentReadingList().length, message: 'Post not found' };
    }
    const list = this._getCurrentReadingList();
    const existing = list.find(function (r) { return r.blogPostId === blogPostId; });
    if (existing) {
      return { readingListItem: existing, success: true, totalItems: list.length, message: 'Already in reading list' };
    }
    const item = {
      id: this._generateId('reading_list_item'),
      blogPostId: blogPostId,
      addedAt: this._nowIso()
    };
    list.push(item);
    this._saveToStorage('reading_list_items', list);
    return { readingListItem: item, success: true, totalItems: list.length, message: 'Added to reading list' };
  }

  // Reading list get
  getReadingList(sortBy) {
    const list = this._getCurrentReadingList();
    const posts = this._getFromStorage('blog_posts');
    const sort = sortBy || 'date_added_desc';

    const enriched = [];
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const post = posts.find(function (p) { return p.id === it.blogPostId; }) || null;
      enriched.push({
        readingListItemId: it.id,
        addedAt: it.addedAt,
        blogPostId: it.blogPostId,
        title: post ? post.title : null,
        summary: post ? post.summary || null : null,
        publishedAt: post ? post.publishedAt || null : null,
        tags: post ? (post.tags || []) : [],
        blogPost: post
      });
    }

    enriched.sort(function (a, b) {
      if (sort === 'date_published_desc') {
        const pa = a.publishedAt || '';
        const pb = b.publishedAt || '';
        return pa < pb ? 1 : (pa > pb ? -1 : 0);
      }
      if (sort === 'date_published_asc') {
        const pa = a.publishedAt || '';
        const pb = b.publishedAt || '';
        return pa < pb ? -1 : (pa > pb ? 1 : 0);
      }
      if (sort === 'date_added_asc') {
        const aa = a.addedAt || '';
        const ab = b.addedAt || '';
        return aa < ab ? -1 : (aa > ab ? 1 : 0);
      }
      // default date_added_desc
      const aa = a.addedAt || '';
      const ab = b.addedAt || '';
      return aa < ab ? 1 : (aa > ab ? -1 : 0);
    });

    return enriched;
  }

  // Reading list remove
  removeReadingListItem(readingListItemId) {
    const list = this._getCurrentReadingList();
    const filtered = list.filter(function (r) { return r.id !== readingListItemId; });
    this._saveToStorage('reading_list_items', filtered);
    return { success: true, totalItems: filtered.length, message: 'Removed from reading list' };
  }

  // Sponsorship overview
  getSponsorshipOverview() {
    const inquiries = this._getFromStorage('sponsorship_inquiries');
    const seasonsMap = {};
    for (let i = 0; i < inquiries.length; i++) {
      const s = inquiries[i].seasonYear;
      if (typeof s === 'number' && !seasonsMap[s]) {
        seasonsMap[s] = true;
      }
    }
    const seasonYears = Object.keys(seasonsMap).map(function (y) { return parseInt(y, 10); }).sort(function (a, b) { return a - b; });
    const nowYear = new Date().getFullYear();
    const availableSeasons = seasonYears.map(function (y) {
      return {
        seasonYear: y,
        status: y >= nowYear ? 'open' : 'closed',
        label: String(y)
      };
    });

    return {
      availableSeasons: availableSeasons,
      packages: [],
      currentSponsors: []
    };
  }

  // Sponsorship form options
  getSponsorshipFormOptions() {
    const businessTypes = [
      { value: 'small_business', label: 'Small Business' },
      { value: 'corporate', label: 'Corporate' },
      { value: 'individual', label: 'Individual' },
      { value: 'racing_team', label: 'Racing Team' },
      { value: 'other', label: 'Other' }
    ];

    const budgetRanges = [
      { value: 'under_5k', label: 'Under $5,000' },
      { value: 'between_5k_10k', label: '$5,000 - $10,000' },
      { value: 'between_10k_25k', label: '$10,000 - $25,000' },
      { value: 'over_25k', label: 'Over $25,000' }
    ];

    const currentYear = new Date().getFullYear();
    const seasons = [];
    for (let y = currentYear; y <= currentYear + 5; y++) {
      seasons.push({ seasonYear: y, label: String(y) });
    }

    const goals = [
      { value: 'brand_visibility', label: 'Brand Visibility' },
      { value: 'social_media_content', label: 'Social Media Content' },
      { value: 'kart_logo_placement', label: 'Logo Placement on Kart' },
      { value: 'event_mentions', label: 'Event Mentions' }
    ];

    return {
      businessTypes: businessTypes,
      budgetRanges: budgetRanges,
      seasons: seasons,
      goals: goals
    };
  }

  // Sponsorship inquiry submit
  submitSponsorshipInquiry(businessType, seasonYear, budgetRange, companyName, websiteUrl, email, goals, message) {
    const allowedBusinessTypes = ['small_business', 'corporate', 'individual', 'racing_team', 'other'];
    const allowedBudgetRanges = ['under_5k', 'between_5k_10k', 'between_10k_25k', 'over_25k'];

    if (allowedBusinessTypes.indexOf(businessType) === -1) {
      return { inquiry: null, success: false, message: 'Invalid business type' };
    }
    if (allowedBudgetRanges.indexOf(budgetRange) === -1) {
      return { inquiry: null, success: false, message: 'Invalid budget range' };
    }
    if (typeof seasonYear !== 'number') {
      return { inquiry: null, success: false, message: 'Invalid season year' };
    }
    if (!companyName || !email) {
      return { inquiry: null, success: false, message: 'Company name and email are required' };
    }

    const list = this._getFromStorage('sponsorship_inquiries');
    const inquiry = {
      id: this._generateId('sponsorship_inquiry'),
      businessType: businessType,
      seasonYear: seasonYear,
      budgetRange: budgetRange,
      companyName: companyName,
      websiteUrl: websiteUrl || null,
      email: email,
      goals: Array.isArray(goals) ? goals : [],
      message: message || '',
      submittedAt: this._nowIso(),
      status: 'new'
    };
    list.push(inquiry);
    this._saveToStorage('sponsorship_inquiries', list);

    return { inquiry: inquiry, success: true, message: 'Sponsorship inquiry submitted' };
  }

  // Driver profile (from localStorage if present)
  getDriverProfile() {
    const raw = localStorage.getItem('driver_profile');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      name: null,
      heroImageUrl: null,
      bioSections: [],
      careerHighlights: [],
      keyCircuits: []
    };
  }

  // Contact info
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // ignore
      }
    }
    return {
      email: null,
      responseTimeInfo: null,
      socialLinks: []
    };
  }

  // Contact message submit
  submitContactMessage(name, email, topic, message) {
    if (!name || !email || !message) {
      return { success: false, messageId: null, message: 'Name, email, and message are required' };
    }
    const list = this._getFromStorage('contact_messages');
    const id = this._generateId('contact_message');
    const msg = {
      id: id,
      name: name,
      email: email,
      topic: topic || 'general',
      message: message,
      createdAt: this._nowIso()
    };
    list.push(msg);
    this._saveToStorage('contact_messages', list);
    return { success: true, messageId: id, message: 'Message submitted' };
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
