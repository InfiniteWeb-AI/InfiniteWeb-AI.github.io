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
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------------
  // Storage helpers
  // ----------------------------

  _initStorage() {
    const keys = [
      'locations',
      'films',
      'directors',
      'screenings',
      'screening_ticket_types',
      'rental_options',
      'videos',
      'carts',
      'cart_items',
      'playlists',
      'playlist_items',
      'watchlist_items',
      'reviews',
      'reading_list_items',
      'newsletter_subscriptions',
      'classroom_screening_requests',
      'accessibility_settings',
      'share_drafts',
      'contact_messages'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

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

  _now() {
    return new Date().toISOString();
  }

  _findById(collection, id) {
    return collection.find((item) => item.id === id) || null;
  }

  _formatTimeShort(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  _formatDateShort(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  _formatDurationLabel(seconds) {
    if (!seconds && seconds !== 0) return '';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m === 0) return sec + 's';
    if (sec === 0) return m + 'm';
    return m + 'm ' + sec + 's';
  }

  // ----------------------------
  // Cart helpers
  // ----------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.status === 'active') || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _saveCart(cart, allCartItems) {
    // Save cart
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    cart.updated_at = this._now();
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);

    // Save cart items (full array)
    if (Array.isArray(allCartItems)) {
      this._saveToStorage('cart_items', allCartItems);
    }
  }

  _calculateCartTotals(cart, cartItemsForCart) {
    const items = cartItemsForCart || [];
    let itemCount = 0;
    let subtotal = 0;
    let currency = 'usd';
    items.forEach((ci) => {
      itemCount += ci.quantity || 0;
      subtotal += (ci.quantity || 0) * (ci.unit_price || 0);
      if (ci.currency && !currency) {
        currency = ci.currency;
      }
    });
    if (!currency && items[0] && items[0].currency) {
      currency = items[0].currency;
    }
    return {
      currency,
      itemCount,
      subtotal
    };
  }

  _buildCartResponse(cart, allCartItems, includeLabels = true) {
    const cartItemsForCart = (allCartItems || []).filter((ci) => ci.cart_id === cart.id);

    const ticketTypes = this._getFromStorage('screening_ticket_types');
    const screenings = this._getFromStorage('screenings');
    const locations = this._getFromStorage('locations');
    const films = this._getFromStorage('films');
    const rentalOptions = this._getFromStorage('rental_options');

    const items = cartItemsForCart.map((ci) => {
      let itemLabel = '';
      let screeningTicketType = null;
      let rentalOption = null;
      let screening = null;
      let location = null;
      let film = null;

      if (ci.item_type === 'screening_ticket' && ci.screening_ticket_type_id) {
        screeningTicketType = ticketTypes.find((t) => t.id === ci.screening_ticket_type_id) || null;
        if (screeningTicketType) {
          screening = screenings.find((s) => s.id === screeningTicketType.screening_id) || null;
          if (screening) {
            location = locations.find((l) => l.id === screening.location_id) || null;
            film = films.find((f) => f.id === screening.film_id) || null;
          }
        }
        if (includeLabels) {
          const parts = [];
          if (location && location.name) parts.push(location.name);
          if (screening && screening.start_datetime) {
            parts.push(this._formatDateShort(screening.start_datetime));
            parts.push(this._formatTimeShort(screening.start_datetime));
          }
          if (screeningTicketType && screeningTicketType.name) parts.push(screeningTicketType.name);
          itemLabel = (parts.join(' ') + ' x' + ci.quantity).trim();
        }
      } else if (ci.item_type === 'rental_option' && ci.rental_option_id) {
        rentalOption = rentalOptions.find((r) => r.id === ci.rental_option_id) || null;
        if (rentalOption) {
          film = films.find((f) => f.id === rentalOption.film_id) || null;
        }
        if (includeLabels) {
          const title = rentalOption && rentalOption.title ? rentalOption.title : 'Rental';
          itemLabel = title + ' x' + ci.quantity;
        }
      }

      const subtotal = (ci.quantity || 0) * (ci.unit_price || 0);

      return {
        cartItem: ci,
        itemLabel: includeLabels ? itemLabel : undefined,
        subtotal,
        // Foreign key resolutions
        screeningTicketType,
        rentalOption,
        screening,
        film,
        location
      };
    });

    const totals = this._calculateCartTotals(cart, cartItemsForCart);

    return {
      cartInfo: cart,
      items,
      totals
    };
  }

  // ----------------------------
  // Playlist helpers
  // ----------------------------

  _getPrimaryPlaylistRecord() {
    let playlists = this._getFromStorage('playlists');
    let playlist = playlists[0] || null;
    if (!playlist) {
      playlist = {
        id: this._generateId('playlist'),
        name: 'My Playlist',
        description: '',
        created_at: this._now(),
        updated_at: this._now()
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    }
    return playlist;
  }

  _savePlaylistOrder(playlistId) {
    let playlistItems = this._getFromStorage('playlist_items');
    const forPlaylist = playlistItems
      .filter((pi) => pi.playlist_id === playlistId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    forPlaylist.forEach((pi, idx) => {
      pi.position = idx + 1;
    });

    const others = playlistItems.filter((pi) => pi.playlist_id !== playlistId);
    playlistItems = others.concat(forPlaylist);
    this._saveToStorage('playlist_items', playlistItems);
  }

  // ----------------------------
  // Share draft helper
  // ----------------------------

  _createOrUpdateShareDraftRecord(platform, videoId, message, includeLink) {
    const shareDrafts = this._getFromStorage('share_drafts');
    const videos = this._getFromStorage('videos');
    const video = videos.find((v) => v.id === videoId) || null;

    let draft = shareDrafts.find((d) => d.platform === platform && d.video_id === videoId) || null;
    const now = this._now();
    const include_link = typeof includeLink === 'boolean' ? includeLink : true;
    const link_url = include_link && video && video.video_url ? video.video_url : null;

    if (draft) {
      draft.message = message;
      draft.include_link = include_link;
      draft.link_url = link_url;
      draft.copied = false;
      draft.created_at = now;
    } else {
      draft = {
        id: this._generateId('share'),
        platform,
        video_id: videoId,
        message,
        include_link,
        link_url,
        created_at: now,
        copied: false
      };
      shareDrafts.push(draft);
    }

    this._saveToStorage('share_drafts', shareDrafts);
    return draft;
  }

  // ----------------------------
  // Core interface implementations
  // ----------------------------

  // 1) Homepage content
  getHomePageContent() {
    const films = this._getFromStorage('films');
    const videos = this._getFromStorage('videos');
    const reviews = this._getFromStorage('reviews');

    let heroFilm = films.find((f) => f.is_main_documentary) || films[0] || null;

    let heroTrailer = null;
    if (heroFilm && heroFilm.trailer_video_id) {
      heroTrailer = videos.find((v) => v.id === heroFilm.trailer_video_id) || null;
    }
    if (!heroTrailer) {
      heroTrailer = videos.find((v) => v.is_main_trailer) || videos.find((v) => v.content_type === 'trailer') || null;
    }

    const heroSynopsis = heroFilm && heroFilm.synopsis ? heroFilm.synopsis : '';

    const primaryCtas = [
      { label: 'Watch Trailer', targetPageKey: 'watch_trailer' },
      { label: 'Screenings & Tickets', targetPageKey: 'screenings_tickets' },
      { label: 'Watch Online', targetPageKey: 'watch_online' },
      { label: 'Videos & Clips', targetPageKey: 'videos_clips' },
      { label: 'Education Resources', targetPageKey: 'education_resources' },
      { label: 'Newsletter Signup', targetPageKey: 'newsletter_signup' }
    ];

    const featured = reviews.filter((r) => r.is_featured);
    let highlightedReviewsRaw = featured.length ? featured : reviews;
    highlightedReviewsRaw = highlightedReviewsRaw
      .slice()
      .sort((a, b) => {
        const ad = a.publication_date || '';
        const bd = b.publication_date || '';
        return bd.localeCompare(ad);
      })
      .slice(0, 3);

    const highlightedReviews = highlightedReviewsRaw.map((r) => ({
      reviewId: r.id,
      title: r.title,
      outlet: r.outlet,
      publicationDate: r.publication_date,
      rating: r.rating,
      ratingScale: r.rating_scale,
      summary: r.summary
    }));

    return {
      heroFilm,
      heroSynopsis,
      heroTrailer,
      primaryCtas,
      highlightedReviews
    };
  }

  // 2) Accessibility settings
  getAccessibilitySettings() {
    let settings = this._getFromStorage('accessibility_settings');
    let record = settings[0] || null;
    if (!record) {
      record = {
        id: this._generateId('access'),
        theme: 'default',
        subtitles_enabled: false,
        subtitles_language: 'none',
        audio_language: 'original_language',
        autoplay_enabled: true,
        updated_at: this._now()
      };
      settings.push(record);
      this._saveToStorage('accessibility_settings', settings);
    }
    return record;
  }

  updateAccessibilitySettings(theme, subtitlesEnabled, subtitlesLanguage, audioLanguage, autoplayEnabled) {
    let settings = this._getFromStorage('accessibility_settings');
    let record = settings[0] || null;
    if (!record) {
      record = this.getAccessibilitySettings();
      settings = this._getFromStorage('accessibility_settings');
    }

    if (typeof theme !== 'undefined' && theme) {
      record.theme = theme;
    }
    if (typeof subtitlesEnabled !== 'undefined') {
      record.subtitles_enabled = !!subtitlesEnabled;
    }
    if (typeof subtitlesLanguage !== 'undefined' && subtitlesLanguage) {
      record.subtitles_language = subtitlesLanguage;
    }
    if (typeof audioLanguage !== 'undefined' && audioLanguage) {
      record.audio_language = audioLanguage;
    }
    if (typeof autoplayEnabled !== 'undefined') {
      record.autoplay_enabled = !!autoplayEnabled;
    }
    record.updated_at = this._now();

    settings[0] = record;
    this._saveToStorage('accessibility_settings', settings);
    return record;
  }

  // 3) Screenings & Tickets
  getScreeningFilterOptions() {
    const locations = this._getFromStorage('locations');
    const screenings = this._getFromStorage('screenings');

    let minDate = null;
    let maxDate = null;
    screenings.forEach((s) => {
      if (!s.start_datetime) return;
      const dateStr = (s.start_datetime || '').slice(0, 10);
      if (!minDate || dateStr < minDate) minDate = dateStr;
      if (!maxDate || dateStr > maxDate) maxDate = dateStr;
    });

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'late_night', label: 'Late Night' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'price_high_to_low', label: 'Price – High to Low' },
      { value: 'time_earliest', label: 'Earliest First' },
      { value: 'time_latest', label: 'Latest First' }
    ];

    return {
      locations,
      timeOfDayOptions,
      sortOptions,
      dateRange: {
        minDate,
        maxDate
      }
    };
  }

  searchScreenings(locationId, date, timeOfDay, sortBy, isInPersonOnly) {
    const screenings = this._getFromStorage('screenings');
    const locations = this._getFromStorage('locations');
    const films = this._getFromStorage('films');

    let results = screenings.slice();

    if (isInPersonOnly !== false) {
      results = results.filter((s) => s.is_in_person !== false);
    }

    if (locationId) {
      results = results.filter((s) => s.location_id === locationId);
    }

    if (date) {
      results = results.filter((s) => (s.start_datetime || '').slice(0, 10) === date);
    }

    if (timeOfDay) {
      results = results.filter((s) => s.time_of_day === timeOfDay);
    }

    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => (a.base_ticket_price || 0) - (b.base_ticket_price || 0));
    } else if (sortBy === 'price_high_to_low') {
      results.sort((a, b) => (b.base_ticket_price || 0) - (a.base_ticket_price || 0));
    } else if (sortBy === 'time_latest') {
      results.sort((a, b) => (b.start_datetime || '').localeCompare(a.start_datetime || ''));
    } else {
      // default or 'time_earliest'
      results.sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''));
    }

    return results.map((s) => {
      const location = locations.find((l) => l.id === s.location_id) || null;
      const film = films.find((f) => f.id === s.film_id) || null;
      return {
        screeningId: s.id,
        filmTitle: film ? film.title : '',
        locationName: location ? location.name : '',
        venueName: s.venue_name,
        venueAddress: s.venue_address,
        startDatetime: s.start_datetime,
        timeOfDay: s.time_of_day,
        baseTicketPrice: s.base_ticket_price,
        currency: s.currency,
        formattedStartTime: this._formatTimeShort(s.start_datetime),
        accessibilityNotes: s.accessibility_notes,
        // Foreign key resolution
        screening: s
      };
    });
  }

  getScreeningDetail(screeningId) {
    const screenings = this._getFromStorage('screenings');
    const locations = this._getFromStorage('locations');
    const films = this._getFromStorage('films');
    const ticketTypes = this._getFromStorage('screening_ticket_types');

    const screening = screenings.find((s) => s.id === screeningId) || null;
    let location = null;
    let film = null;
    let ticketTypesForScreening = [];

    if (screening) {
      location = locations.find((l) => l.id === screening.location_id) || null;
      film = films.find((f) => f.id === screening.film_id) || null;
      ticketTypesForScreening = ticketTypes.filter((t) => t.screening_id === screening.id);
    }

    return {
      screening,
      location,
      film,
      ticketTypes: ticketTypesForScreening
    };
  }

  addScreeningTicketsToCart(screeningTicketTypeId, quantity) {
    const q = quantity && quantity > 0 ? quantity : 1;
    const ticketTypes = this._getFromStorage('screening_ticket_types');
    const ticketType = ticketTypes.find((t) => t.id === screeningTicketTypeId) || null;
    if (!ticketType || ticketType.is_available === false) {
      return {
        success: false,
        message: 'Selected ticket type is not available.',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'screening_ticket' &&
        ci.screening_ticket_type_id === screeningTicketTypeId
    );

    const maxQ = ticketType.max_quantity_per_order || null;

    if (item) {
      let newQty = (item.quantity || 0) + q;
      if (maxQ !== null && newQty > maxQ) {
        newQty = maxQ;
      }
      item.quantity = newQty;
    } else {
      let finalQty = q;
      if (maxQ !== null && finalQty > maxQ) {
        finalQty = maxQ;
      }
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'screening_ticket',
        screening_ticket_type_id: screeningTicketTypeId,
        rental_option_id: null,
        name: ticketType.name || 'Ticket',
        quantity: finalQty,
        unit_price: ticketType.price,
        currency: ticketType.currency,
        added_at: this._now()
      };
      cartItems.push(item);
    }

    this._saveCart(cart, cartItems);
    const cartResponse = this._buildCartResponse(cart, cartItems, true);

    return {
      success: true,
      message: 'Tickets added to cart.',
      cart: cartResponse
    };
  }

  getCartSummary() {
    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.status === 'active') || null;
    if (!cart) {
      return {
        hasActiveCart: false,
        cart: null
      };
    }
    const cartItems = this._getFromStorage('cart_items');
    const cartResponse = this._buildCartResponse(cart, cartItems, true);
    return {
      hasActiveCart: true,
      cart: cartResponse
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, cart: null };
    }

    const item = cartItems[itemIndex];
    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cart_id) || null;
    if (!cart) {
      return { success: false, cart: null };
    }

    if (!quantity || quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      // Enforce max quantity for ticket types if applicable
      if (item.item_type === 'screening_ticket' && item.screening_ticket_type_id) {
        const ticketTypes = this._getFromStorage('screening_ticket_types');
        const ticketType = ticketTypes.find((t) => t.id === item.screening_ticket_type_id) || null;
        if (ticketType && ticketType.max_quantity_per_order) {
          if (quantity > ticketType.max_quantity_per_order) {
            quantity = ticketType.max_quantity_per_order;
          }
        }
      }
      item.quantity = quantity;
      cartItems[itemIndex] = item;
    }

    this._saveCart(cart, cartItems);
    const cartResponse = this._buildCartResponse(cart, cartItems, true);

    return {
      success: true,
      cart: cartResponse
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, cart: null };
    }

    const item = cartItems[itemIndex];
    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cart_id) || null;
    if (!cart) {
      return { success: false, cart: null };
    }

    cartItems.splice(itemIndex, 1);

    // Optionally mark cart cleared when empty
    const remainingForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    if (remainingForCart.length === 0) {
      cart.status = 'cleared';
    }

    this._saveCart(cart, cartItems);
    const cartResponse = this._buildCartResponse(cart, cartItems, true);

    return {
      success: true,
      cart: cartResponse
    };
  }

  // 4) Watch Online
  getWatchOnlineFilterOptions() {
    const rentalOptions = this._getFromStorage('rental_options');
    let maxPrice = 0;
    rentalOptions.forEach((r) => {
      if (typeof r.price === 'number' && r.price > maxPrice) {
        maxPrice = r.price;
      }
    });
    if (!maxPrice) maxPrice = 50;

    const accessTypeOptions = [
      { value: 'individual_rental', label: 'Individual Rental' },
      { value: 'group_rental', label: 'Group Rental' },
      { value: 'institutional_license', label: 'Institutional License' }
    ];

    const durationOptions = [
      { value: 'at_least_72_hours', label: '3+ days access', minHours: 72 },
      { value: 'at_least_168_hours', label: '7+ days access', minHours: 168 }
    ];

    const sortOptions = [
      { value: 'recommended', label: 'Recommended' },
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'price_high_to_low', label: 'Price – High to Low' },
      { value: 'duration_long_to_short', label: 'Longest Access First' }
    ];

    return {
      accessTypeOptions,
      durationOptions,
      sortOptions,
      defaultMaxPrice: maxPrice
    };
  }

  searchRentalOptions(accessType, maxPrice, minAccessDurationHours, sortBy) {
    const rentalOptions = this._getFromStorage('rental_options');

    let results = rentalOptions.slice();

    if (accessType) {
      results = results.filter((r) => r.access_type === accessType);
    }

    if (typeof maxPrice === 'number') {
      results = results.filter((r) => typeof r.price === 'number' && r.price <= maxPrice);
    }

    if (typeof minAccessDurationHours === 'number') {
      results = results.filter(
        (r) => typeof r.access_duration_hours === 'number' && r.access_duration_hours >= minAccessDurationHours
      );
    }

    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'duration_long_to_short') {
      results.sort((a, b) => (b.access_duration_hours || 0) - (a.access_duration_hours || 0));
    } else {
      // recommended: is_recommended desc, sort_order asc, price asc
      results.sort((a, b) => {
        const ar = a.is_recommended ? 1 : 0;
        const br = b.is_recommended ? 1 : 0;
        if (br !== ar) return br - ar;
        const aso = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
        const bso = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
        if (aso !== bso) return aso - bso;
        return (a.price || 0) - (b.price || 0);
      });
    }

    return results.map((r) => ({
      rentalOptionId: r.id,
      title: r.title,
      description: r.description,
      price: r.price,
      currency: r.currency,
      accessDurationHours: r.access_duration_hours,
      accessDurationLabel: r.access_duration_label,
      isRecommended: !!r.is_recommended,
      defaultQuality: r.default_quality,
      qualityOptions: Array.isArray(r.quality_options) ? r.quality_options : [],
      // Foreign key resolution
      rentalOption: r
    }));
  }

  getRentalOptionDetail(rentalOptionId) {
    const rentalOptions = this._getFromStorage('rental_options');
    const films = this._getFromStorage('films');

    const rentalOption = rentalOptions.find((r) => r.id === rentalOptionId) || null;
    let film = null;
    if (rentalOption) {
      film = films.find((f) => f.id === rentalOption.film_id) || null;
    }

    return {
      rentalOption,
      film
    };
  }

  addRentalToCart(rentalOptionId, quality) {
    const rentalOptions = this._getFromStorage('rental_options');
    const rentalOption = rentalOptions.find((r) => r.id === rentalOptionId) || null;
    if (!rentalOption) {
      return {
        success: false,
        message: 'Rental option not found.',
        cart: null
      };
    }

    const qualities = Array.isArray(rentalOption.quality_options) ? rentalOption.quality_options : [];
    if (qualities.length && !qualities.includes(quality)) {
      return {
        success: false,
        message: 'Selected quality is not available for this rental.',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.item_type === 'rental_option' && ci.rental_option_id === rentalOptionId
    );

    if (item) {
      item.quantity = (item.quantity || 0) + 1;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'rental_option',
        screening_ticket_type_id: null,
        rental_option_id: rentalOptionId,
        name: (rentalOption.title || 'Rental') + (quality ? ' (' + quality.toUpperCase() + ')' : ''),
        quantity: 1,
        unit_price: rentalOption.price,
        currency: rentalOption.currency,
        added_at: this._now()
      };
      cartItems.push(item);
    }

    this._saveCart(cart, cartItems);
    const cartResponse = this._buildCartResponse(cart, cartItems, true);

    return {
      success: true,
      message: 'Rental added to cart.',
      cart: cartResponse
    };
  }

  // 5) Video gallery / clips
  getVideoFilterOptions() {
    const videos = this._getFromStorage('videos');

    const contentTypeOptions = [
      { value: 'clip', label: 'Clips' },
      { value: 'trailer', label: 'Trailers' },
      { value: 'full_film', label: 'Full Film' },
      { value: 'bonus_feature', label: 'Bonus Features' }
    ];

    const durationFilters = [
      { value: 'under_5_minutes', label: 'Under 5 minutes', maxSeconds: 5 * 60 },
      { value: 'under_10_minutes', label: 'Under 10 minutes', maxSeconds: 10 * 60 }
    ];

    const tagSet = new Set();
    videos.forEach((v) => {
      if (Array.isArray(v.tags)) {
        v.tags.forEach((t) => tagSet.add(t));
      }
    });

    const tagOptions = Array.from(tagSet).map((tag) => ({
      tag,
      label: tag
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    const sortOptions = [
      { value: 'publication_date_desc', label: 'Newest First' },
      { value: 'publication_date_asc', label: 'Oldest First' },
      { value: 'duration_asc', label: 'Shortest First' },
      { value: 'title_asc', label: 'Title A–Z' }
    ];

    return {
      contentTypeOptions,
      durationFilters,
      tagOptions,
      sortOptions
    };
  }

  searchVideos(contentType, maxDurationSeconds, tag, sortBy) {
    const videos = this._getFromStorage('videos');

    let results = videos.slice();

    if (contentType) {
      // Treat "clip" as including trailers so climate-themed short trailers can appear as clips
      if (contentType === 'clip') {
        results = results.filter((v) => v.content_type === 'clip' || v.content_type === 'trailer');
      } else {
        results = results.filter((v) => v.content_type === contentType);
      }
    }

    if (typeof maxDurationSeconds === 'number') {
      results = results.filter((v) => typeof v.duration_seconds === 'number' && v.duration_seconds <= maxDurationSeconds);
    }

    if (tag) {
      results = results.filter((v) => Array.isArray(v.tags) && v.tags.includes(tag));
    }

    if (sortBy === 'publication_date_asc') {
      results.sort((a, b) => (a.publication_date || '').localeCompare(b.publication_date || ''));
    } else if (sortBy === 'duration_asc') {
      results.sort((a, b) => (a.duration_seconds || 0) - (b.duration_seconds || 0));
    } else if (sortBy === 'title_asc') {
      results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // default publication_date_desc
      results.sort((a, b) => (b.publication_date || '').localeCompare(a.publication_date || ''));
    }

    return results.map((v) => ({
      videoId: v.id,
      title: v.title,
      description: v.description,
      contentType: v.content_type,
      durationSeconds: v.duration_seconds,
      durationLabel: this._formatDurationLabel(v.duration_seconds),
      thumbnailUrl: v.thumbnail_url,
      tags: Array.isArray(v.tags) ? v.tags : [],
      isMainTrailer: !!v.is_main_trailer,
      // Foreign key resolution
      video: v
    }));
  }

  getPrimaryPlaylist() {
    const playlist = this._getPrimaryPlaylistRecord();
    const playlistItems = this._getFromStorage('playlist_items');
    const videos = this._getFromStorage('videos');

    const items = playlistItems
      .filter((pi) => pi.playlist_id === playlist.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((pi) => ({
        playlistItem: pi,
        video: videos.find((v) => v.id === pi.video_id) || null
      }));

    return {
      playlist,
      items
    };
  }

  addVideoToPlaylist(videoId) {
    const videos = this._getFromStorage('videos');
    const video = videos.find((v) => v.id === videoId) || null;
    if (!video) {
      return {
        success: false,
        playlist: null,
        items: []
      };
    }

    const playlist = this._getPrimaryPlaylistRecord();
    let playlistItems = this._getFromStorage('playlist_items');

    const existingForPlaylist = playlistItems.filter((pi) => pi.playlist_id === playlist.id);
    const maxPos = existingForPlaylist.reduce((max, pi) => (pi.position && pi.position > max ? pi.position : max), 0);

    const newItem = {
      id: this._generateId('playlist_item'),
      playlist_id: playlist.id,
      video_id: videoId,
      position: maxPos + 1,
      added_at: this._now()
    };

    playlistItems.push(newItem);
    this._saveToStorage('playlist_items', playlistItems);

    const items = playlistItems
      .filter((pi) => pi.playlist_id === playlist.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((pi) => ({
        playlistItem: pi,
        video: videos.find((v) => v.id === pi.video_id) || null
      }));

    return {
      success: true,
      playlist,
      items
    };
  }

  removePlaylistItem(playlistItemId) {
    const playlist = this._getPrimaryPlaylistRecord();
    let playlistItems = this._getFromStorage('playlist_items');

    const index = playlistItems.findIndex((pi) => pi.id === playlistItemId);
    if (index === -1) {
      return {
        success: false,
        playlist,
        items: []
      };
    }

    playlistItems.splice(index, 1);
    this._saveToStorage('playlist_items', playlistItems);
    this._savePlaylistOrder(playlist.id);

    const videos = this._getFromStorage('videos');
    const updatedItems = this._getFromStorage('playlist_items')
      .filter((pi) => pi.playlist_id === playlist.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((pi) => ({
        playlistItem: pi,
        video: videos.find((v) => v.id === pi.video_id) || null
      }));

    return {
      success: true,
      playlist,
      items: updatedItems
    };
  }

  reorderPlaylistItems(positions) {
    const playlist = this._getPrimaryPlaylistRecord();
    let playlistItems = this._getFromStorage('playlist_items');

    if (!Array.isArray(positions)) {
      positions = [];
    }

    const positionMap = {};
    positions.forEach((p) => {
      if (p && p.playlistItemId && typeof p.position === 'number') {
        positionMap[p.playlistItemId] = p.position;
      }
    });

    playlistItems.forEach((pi) => {
      if (pi.playlist_id === playlist.id && positionMap[pi.id] != null) {
        pi.position = positionMap[pi.id];
      }
    });

    this._saveToStorage('playlist_items', playlistItems);
    this._savePlaylistOrder(playlist.id);

    const videos = this._getFromStorage('videos');
    const updatedItems = this._getFromStorage('playlist_items')
      .filter((pi) => pi.playlist_id === playlist.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((pi) => ({
        playlistItem: pi,
        video: videos.find((v) => v.id === pi.video_id) || null
      }));

    return {
      success: true,
      playlist,
      items: updatedItems
    };
  }

  // 6) Education & classroom requests
  getEducationOverview() {
    return {
      overviewText:
        'This documentary explores climate challenges and solutions, designed to support interdisciplinary classroom discussion.',
      keyThemes: ['climate', 'youth', 'policy', 'community'],
      highlightedResources: []
    };
  }

  getClassroomResourcesList() {
    // No dedicated data model; return empty list to avoid mocked content
    return [];
  }

  getClassroomRequestFormOptions() {
    const locations = this._getFromStorage('locations');

    const gradeLevelOptions = [
      { value: 'elementary_school', label: 'Elementary School' },
      { value: 'middle_school', label: 'Middle School' },
      { value: 'high_school', label: 'High School' },
      { value: 'college_university', label: 'College / University' },
      { value: 'other', label: 'Other' }
    ];

    const timeWindowOptions = [
      { value: 'during_school_hours', label: 'During school hours (8am–3pm)' },
      { value: 'after_school', label: 'After school' },
      { value: 'evening', label: 'Evening' },
      { value: 'custom', label: 'Custom time window' }
    ];

    return {
      gradeLevelOptions,
      timeWindowOptions,
      locations
    };
  }

  submitClassroomScreeningRequest(
    gradeLevel,
    schoolName,
    groupSize,
    locationId,
    requestedDate,
    preferredTimeWindow,
    customTimeWindow,
    contactName,
    contactEmail
  ) {
    const requests = this._getFromStorage('classroom_screening_requests');

    const requested_date_iso = requestedDate
      ? requestedDate + 'T00:00:00.000Z'
      : new Date().toISOString();

    const request = {
      id: this._generateId('classroom_request'),
      grade_level: gradeLevel,
      school_name: schoolName,
      group_size: groupSize,
      location_id: locationId || null,
      requested_date: requested_date_iso,
      preferred_time_window: preferredTimeWindow,
      custom_time_window: preferredTimeWindow === 'custom' ? customTimeWindow || '' : null,
      contact_name: contactName,
      contact_email: contactEmail,
      status: 'submitted',
      created_at: this._now()
    };

    requests.push(request);
    this._saveToStorage('classroom_screening_requests', requests);

    return {
      success: true,
      request,
      message: 'Classroom screening request submitted.'
    };
  }

  // 7) About / filmmakers / watchlist
  getAboutFilmContent() {
    const films = this._getFromStorage('films');
    const directors = this._getFromStorage('directors');

    const mainFilm = films.find((f) => f.is_main_documentary) || films[0] || null;

    const detailedSynopsis = mainFilm && mainFilm.synopsis ? mainFilm.synopsis : '';
    const themes = mainFilm && Array.isArray(mainFilm.themes) ? mainFilm.themes : [];

    const keyTeamMembers = [];
    directors.forEach((d) => {
      if (d.is_primary_director) {
        keyTeamMembers.push({
          role: 'Director',
          personName: d.name,
          directorId: d.id
        });
      }
    });

    return {
      mainFilm,
      detailedSynopsis,
      themes,
      productionBackground: '',
      awards: [],
      keyTeamMembers
    };
  }

  getDirectorList() {
    return this._getFromStorage('directors');
  }

  getDirectorProfile(directorId, sortBy) {
    const directors = this._getFromStorage('directors');
    const films = this._getFromStorage('films');

    const director = directors.find((d) => d.id === directorId) || null;
    let filmographyFilms = films.filter((f) => f.director_id === directorId);

    const sort = sortBy || 'year_desc';
    if (sort === 'year_asc') {
      filmographyFilms.sort((a, b) => (a.release_year || 0) - (b.release_year || 0));
    } else if (sort === 'title_asc') {
      filmographyFilms.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // year_desc default
      filmographyFilms.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
    }

    const filmography = filmographyFilms.map((film) => ({ film }));

    return {
      director,
      filmography
    };
  }

  addFilmToWatchlist(filmId) {
    const films = this._getFromStorage('films');
    const film = films.find((f) => f.id === filmId) || null;
    if (!film) {
      return {
        success: false,
        watchlistItems: []
      };
    }

    let watchlistItems = this._getFromStorage('watchlist_items');

    const exists = watchlistItems.some((w) => w.film_id === filmId);
    if (!exists) {
      watchlistItems.push({
        id: this._generateId('watchlist_item'),
        film_id: filmId,
        added_at: this._now()
      });
      this._saveToStorage('watchlist_items', watchlistItems);
    }

    watchlistItems = this._getFromStorage('watchlist_items');
    const mapped = watchlistItems.map((w) => ({
      watchlistItem: w,
      film: films.find((f) => f.id === w.film_id) || null
    }));

    return {
      success: true,
      watchlistItems: mapped
    };
  }

  getWatchlist() {
    const watchlistItems = this._getFromStorage('watchlist_items');
    const films = this._getFromStorage('films');

    return watchlistItems.map((w) => ({
      watchlistItem: w,
      film: films.find((f) => f.id === w.film_id) || null
    }));
  }

  removeWatchlistItem(watchlistItemId) {
    let watchlistItems = this._getFromStorage('watchlist_items');
    const index = watchlistItems.findIndex((w) => w.id === watchlistItemId);
    if (index !== -1) {
      watchlistItems.splice(index, 1);
      this._saveToStorage('watchlist_items', watchlistItems);
    }

    const films = this._getFromStorage('films');
    return watchlistItems.map((w) => ({
      watchlistItem: w,
      film: films.find((f) => f.id === w.film_id) || null
    }));
  }

  // 8) Press & Reviews / reading list
  getPressReviewsFilterOptions() {
    const reviews = this._getFromStorage('reviews');

    let minPublicationDate = null;
    let maxPublicationDate = null;
    reviews.forEach((r) => {
      const d = (r.publication_date || '').slice(0, 10);
      if (!d) return;
      if (!minPublicationDate || d < minPublicationDate) minPublicationDate = d;
      if (!maxPublicationDate || d > maxPublicationDate) maxPublicationDate = d;
    });

    const ratingThresholdOptions = [
      { minRating: 0, label: 'All ratings' },
      { minRating: 3, label: '3+ stars' },
      { minRating: 4, label: '4+ stars' },
      { minRating: 4.5, label: '4.5+ stars' }
    ];

    const sortOptions = [
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'highest_rated', label: 'Highest Rated' },
      { value: 'oldest', label: 'Oldest First' }
    ];

    return {
      availableDateRange: {
        minPublicationDate,
        maxPublicationDate
      },
      ratingThresholdOptions,
      sortOptions
    };
  }

  searchReviews(startDate, endDate, minRating, sortBy) {
    const reviews = this._getFromStorage('reviews');

    let results = reviews.slice();

    if (startDate) {
      results = results.filter((r) => (r.publication_date || '').slice(0, 10) >= startDate);
    }

    if (endDate) {
      results = results.filter((r) => (r.publication_date || '').slice(0, 10) <= endDate);
    }

    if (typeof minRating === 'number') {
      results = results.filter((r) => {
        if (typeof r.rating !== 'number' || typeof r.rating_scale !== 'number' || !r.rating_scale) return false;
        const normalized = (r.rating / r.rating_scale) * 5;
        return normalized >= minRating;
      });
    }

    if (sortBy === 'highest_rated') {
      results.sort((a, b) => {
        const an =
          typeof a.rating === 'number' && typeof a.rating_scale === 'number' && a.rating_scale
            ? (a.rating / a.rating_scale) * 5
            : 0;
        const bn =
          typeof b.rating === 'number' && typeof b.rating_scale === 'number' && b.rating_scale
            ? (b.rating / b.rating_scale) * 5
            : 0;
        return bn - an;
      });
    } else if (sortBy === 'oldest') {
      results.sort((a, b) => (a.publication_date || '').localeCompare(b.publication_date || ''));
    } else {
      // most_recent default
      results.sort((a, b) => (b.publication_date || '').localeCompare(a.publication_date || ''));
    }

    return results.map((r) => ({
      reviewId: r.id,
      title: r.title,
      outlet: r.outlet,
      author: r.author,
      publicationDate: r.publication_date,
      rating: r.rating,
      ratingScale: r.rating_scale,
      summary: r.summary,
      isFeatured: !!r.is_featured,
      // Foreign key resolution
      review: r
    }));
  }

  getReviewDetail(reviewId) {
    const reviews = this._getFromStorage('reviews');
    return reviews.find((r) => r.id === reviewId) || null;
  }

  saveReviewToReadingList(reviewId) {
    const reviews = this._getFromStorage('reviews');
    const review = reviews.find((r) => r.id === reviewId) || null;
    if (!review) {
      return [];
    }

    let readingList = this._getFromStorage('reading_list_items');
    const exists = readingList.some((ri) => ri.review_id === reviewId);
    if (!exists) {
      readingList.push({
        id: this._generateId('reading_list_item'),
        review_id: reviewId,
        added_at: this._now()
      });
      this._saveToStorage('reading_list_items', readingList);
    }

    readingList = this._getFromStorage('reading_list_items');
    return readingList.map((ri) => ({
      readingListItem: ri,
      review: reviews.find((r) => r.id === ri.review_id) || null
    }));
  }

  getReadingList() {
    const readingList = this._getFromStorage('reading_list_items');
    const reviews = this._getFromStorage('reviews');

    return readingList.map((ri) => ({
      readingListItem: ri,
      review: reviews.find((r) => r.id === ri.review_id) || null
    }));
  }

  removeReadingListItem(readingListItemId) {
    let readingList = this._getFromStorage('reading_list_items');
    const index = readingList.findIndex((ri) => ri.id === readingListItemId);
    if (index !== -1) {
      readingList.splice(index, 1);
      this._saveToStorage('reading_list_items', readingList);
    }

    const reviews = this._getFromStorage('reviews');
    return readingList.map((ri) => ({
      readingListItem: ri,
      review: reviews.find((r) => r.id === ri.review_id) || null
    }));
  }

  // 9) Newsletter
  getNewsletterOptions() {
    const locations = this._getFromStorage('locations');

    const interestOptions = [
      {
        key: 'in_person_screenings',
        label: 'In-person screenings',
        description: 'Updates about theatrical and community screenings near you.'
      },
      {
        key: 'educational_resources',
        label: 'Educational resources',
        description: 'Classroom guides, discussion materials, and teaching tools.'
      },
      {
        key: 'online_rentals',
        label: 'Online rentals & streaming',
        description: 'Watch the film online and get access offers.'
      },
      {
        key: 'news_updates',
        label: 'News & impact updates',
        description: 'Production news, impact stories, and campaign updates.'
      }
    ];

    const frequencyOptions = [
      { value: 'immediate', label: 'Real-time alerts', description: 'Get updates as they happen.' },
      { value: 'daily', label: 'Daily recap', description: 'A daily summary of new updates.' },
      { value: 'weekly_summary', label: 'Weekly summary', description: 'A once-a-week digest of highlights.' },
      { value: 'monthly_summary', label: 'Monthly summary', description: 'A monthly roundup of top news.' }
    ];

    return {
      interestOptions,
      frequencyOptions,
      locations
    };
  }

  submitNewsletterSubscription(name, email, preferredLocationId, frequency, interests) {
    let subs = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      name,
      email,
      preferred_location_id: preferredLocationId || null,
      frequency,
      interests: Array.isArray(interests) ? interests : [],
      created_at: this._now(),
      confirmed: false
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'Subscription saved.'
    };
  }

  // 10) Trailer page & sharing
  getMainTrailerPageData() {
    const films = this._getFromStorage('films');
    const videos = this._getFromStorage('videos');

    const film = films.find((f) => f.is_main_documentary) || films[0] || null;

    let trailerVideo = null;
    if (film && film.trailer_video_id) {
      trailerVideo = videos.find((v) => v.id === film.trailer_video_id) || null;
    }
    if (!trailerVideo) {
      trailerVideo = videos.find((v) => v.is_main_trailer) || videos.find((v) => v.content_type === 'trailer') || null;
    }

    const accessibilitySettings = this.getAccessibilitySettings();

    const quickCtas = [
      { label: 'Screenings & Tickets', targetPageKey: 'screenings_tickets' },
      { label: 'Watch Online', targetPageKey: 'watch_online' },
      { label: 'For Educators', targetPageKey: 'education_resources' }
    ];

    return {
      trailerVideo,
      film,
      accessibilitySettings,
      quickCtas
    };
  }

  getShareDraft(platform, videoId) {
    let shareDrafts = this._getFromStorage('share_drafts');
    let draft = shareDrafts.find((d) => d.platform === platform && d.video_id === videoId) || null;

    if (!draft) {
      // Create a default (empty) draft
      draft = this._createOrUpdateShareDraftRecord(platform, videoId, '', true);
    }

    return draft;
  }

  composeOrUpdateShareDraft(platform, videoId, message, includeLink) {
    return this._createOrUpdateShareDraftRecord(platform, videoId, message, includeLink);
  }

  markShareDraftCopied(shareDraftId) {
    let shareDrafts = this._getFromStorage('share_drafts');
    const index = shareDrafts.findIndex((d) => d.id === shareDraftId);
    if (index === -1) {
      return null;
    }
    const draft = shareDrafts[index];
    draft.copied = true;
    shareDrafts[index] = draft;
    this._saveToStorage('share_drafts', shareDrafts);
    return draft;
  }

  // 11) Saved items overview
  getSavedItemsOverview() {
    const watchlist = this.getWatchlist();
    const playlistData = this.getPrimaryPlaylist();
    const readingList = this.getReadingList();

    return {
      watchlist,
      playlist: playlistData.playlist,
      playlistItems: playlistData.items,
      readingList
    };
  }

  // 12) Contact
  getContactPageContent() {
    const contactTopics = [
      { value: 'general', label: 'General inquiry' },
      { value: 'press', label: 'Press & media' },
      { value: 'education', label: 'Education & classroom' },
      { value: 'distribution', label: 'Distribution & rights' },
      { value: 'technical', label: 'Technical support' },
      { value: 'other', label: 'Other' }
    ];

    const directContacts = [
      { purpose: 'General', email: 'info@example.com' },
      { purpose: 'Press', email: 'press@example.com' },
      { purpose: 'Education', email: 'education@example.com' }
    ];

    const accessibilityInfo =
      'For accessibility questions or accommodation requests related to screenings or digital access, please reach out via the contact form or email accessibility@example.com.';

    return {
      contactTopics,
      directContacts,
      accessibilityInfo
    };
  }

  submitContactMessage(name, email, topic, message) {
    const contactMessages = this._getFromStorage('contact_messages');
    const record = {
      id: this._generateId('contact_message'),
      name,
      email,
      topic,
      message,
      created_at: this._now()
    };
    contactMessages.push(record);
    this._saveToStorage('contact_messages', contactMessages);

    return {
      success: true,
      message: 'Your message has been received.'
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
