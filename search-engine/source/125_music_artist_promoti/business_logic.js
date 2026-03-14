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

  _initStorage() {
    // Initialize all entity tables if they do not exist
    var tables = [
      'tour_events',
      'ticket_options',
      'itineraries',
      'itinerary_items',
      'albums',
      'tracks',
      'track_lyrics',
      'playlists',
      'playlist_tracks',
      'product_categories',
      'products',
      'cart_items',
      'newsletter_interests',
      'newsletter_subscriptions',
      'videos',
      'watch_later_lists',
      'watch_later_items',
      'discography_view_states',
      'store_view_states',
      'contact_forms'
    ];
    for (var i = 0; i < tables.length; i++) {
      var key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    // Single-object storages
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem('about_content', JSON.stringify({ bio_html: '', highlights: [], press_quotes: [] }));
    }
    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem('contact_info', JSON.stringify({
        management_email: '',
        booking_email: '',
        press_email: '',
        social_links: []
      }));
    }
    if (!localStorage.getItem('policies_content')) {
      localStorage.setItem('policies_content', JSON.stringify({ privacy_html: '', terms_html: '' }));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    var data = localStorage.getItem(key);
    if (data === null || typeof data === 'undefined') {
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
    var current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _getNowIso() {
    return new Date().toISOString();
  }

  _ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  // Helper: get or create single cart for this user
  _getOrCreateCart() {
    var cart = this._getFromStorage('cart', null);
    if (cart && typeof cart === 'object') {
      return cart;
    }
    cart = {
      id: this._generateId('cart'),
      item_ids: [],
      created_at: this._getNowIso(),
      updated_at: this._getNowIso(),
      currency: null
    };
    this._saveToStorage('cart', cart);
    return cart;
  }

  // Helper: recalculate cart item totals and overall subtotal
  _recalculateCartTotals(cart, cartItems, products) {
    var subtotal = 0;
    var itemCount = 0;
    var productMap = {};
    for (var i = 0; i < products.length; i++) {
      productMap[products[i].id] = products[i];
    }
    for (var j = 0; j < cartItems.length; j++) {
      var item = cartItems[j];
      if (item.cart_id !== cart.id) continue;
      item.total_price = item.unit_price * item.quantity;
      subtotal += item.total_price;
      itemCount += item.quantity;
    }
    cart.updated_at = this._getNowIso();
    if (!cart.currency && cartItems.length > 0) {
      cart.currency = cartItems[0].currency;
    }
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);
    return { subtotal: subtotal, item_count: itemCount };
  }

  // Helper: get or create default itinerary (optionally by name)
  _getOrCreateDefaultItinerary(itineraryName) {
    var itineraries = this._getFromStorage('itineraries', []);
    var nameToFind = itineraryName || 'default_itinerary';
    var found = null;
    for (var i = 0; i < itineraries.length; i++) {
      if (itineraries[i].name === nameToFind) {
        found = itineraries[i];
        break;
      }
    }
    if (!found) {
      found = {
        id: this._generateId('itinerary'),
        name: nameToFind,
        created_at: this._getNowIso(),
        updated_at: this._getNowIso(),
        item_ids: []
      };
      itineraries.push(found);
      this._saveToStorage('itineraries', itineraries);
    }
    return found;
  }

  // Helper: get or create default Watch Later list
  _getOrCreateDefaultWatchLaterList() {
    var lists = this._getFromStorage('watch_later_lists', []);
    var found = null;
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].name === 'Watch Later') {
        found = lists[i];
        break;
      }
    }
    if (!found) {
      found = {
        id: this._generateId('watch_later_list'),
        name: 'Watch Later',
        created_at: this._getNowIso(),
        updated_at: this._getNowIso()
      };
      lists.push(found);
      this._saveToStorage('watch_later_lists', lists);
    }
    return found;
  }

  // Helper: update/persist discography view state
  _updateDiscographyViewStateStorage(partial) {
    var states = this._getFromStorage('discography_view_states', []);
    var state = states && states.length > 0 ? states[0] : null;
    if (!state) {
      state = {
        id: this._generateId('discography_view_state'),
        view_mode: 'albums',
        year_from: null,
        year_to: null,
        sort_order: 'release_date_desc',
        track_genre_filter: 'all',
        last_updated: this._getNowIso()
      };
      states = [state];
    }
    if (partial) {
      if (typeof partial.view_mode !== 'undefined' && partial.view_mode) state.view_mode = partial.view_mode;
      if (typeof partial.year_from !== 'undefined') state.year_from = partial.year_from;
      if (typeof partial.year_to !== 'undefined') state.year_to = partial.year_to;
      if (typeof partial.sort_order !== 'undefined' && partial.sort_order) state.sort_order = partial.sort_order;
      if (typeof partial.track_genre_filter !== 'undefined' && partial.track_genre_filter) state.track_genre_filter = partial.track_genre_filter;
      state.last_updated = this._getNowIso();
    }
    states[0] = state;
    this._saveToStorage('discography_view_states', states);
    return state;
  }

  // Helper: update/persist store view state
  _updateStoreViewStateStorage(partial) {
    var states = this._getFromStorage('store_view_states', []);
    var state = states && states.length > 0 ? states[0] : null;
    if (!state) {
      state = {
        id: this._generateId('store_view_state'),
        category_filter: 'all',
        rating_filter: 'all',
        sort_order: 'newest',
        last_updated: this._getNowIso()
      };
      states = [state];
    }
    if (partial) {
      if (typeof partial.category_filter !== 'undefined' && partial.category_filter) state.category_filter = partial.category_filter;
      if (typeof partial.rating_filter !== 'undefined' && partial.rating_filter) state.rating_filter = partial.rating_filter;
      if (typeof partial.sort_order !== 'undefined' && partial.sort_order) state.sort_order = partial.sort_order;
      state.last_updated = this._getNowIso();
    }
    states[0] = state;
    this._saveToStorage('store_view_states', states);
    return state;
  }

  // =====================
  // Core interface implementations
  // =====================

  // getHomeOverview
  getHomeOverview() {
    var albums = this._getFromStorage('albums', []);
    var tracks = this._getFromStorage('tracks', []);
    var videos = this._getFromStorage('videos', []);
    var events = this._getFromStorage('tour_events', []);
    var products = this._getFromStorage('products', []);

    // Latest releases: combine albums and tracks
    var latestReleases = [];
    for (var i = 0; i < albums.length; i++) {
      latestReleases.push({
        id: albums[i].id,
        content_type: 'album',
        title: albums[i].title,
        release_date: albums[i].release_date,
        artwork_url: albums[i].artwork_url || ''
      });
    }
    var albumMap = {};
    for (var a = 0; a < albums.length; a++) {
      albumMap[albums[a].id] = albums[a];
    }
    for (var j = 0; j < tracks.length; j++) {
      var track = tracks[j];
      var album = albumMap[track.album_id] || null;
      latestReleases.push({
        id: track.id,
        content_type: 'track',
        title: track.title,
        release_date: track.release_date || (album ? album.release_date : null),
        artwork_url: album && album.artwork_url ? album.artwork_url : ''
      });
    }
    latestReleases.sort(function (x, y) {
      var dx = x.release_date ? new Date(x.release_date).getTime() : 0;
      var dy = y.release_date ? new Date(y.release_date).getTime() : 0;
      return dy - dx;
    });

    // Featured videos: sort by view_count desc
    var featuredVideos = videos.slice().sort(function (a, b) {
      return (b.view_count || 0) - (a.view_count || 0);
    }).map(function (v) {
      return {
        id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url || '',
        duration_seconds: v.duration_seconds,
        view_count: v.view_count
      };
    });

    // Upcoming events: future scheduled events
    var now = new Date();
    var upcomingEvents = [];
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      if (ev.status === 'cancelled') continue;
      var evDate = ev.event_date ? new Date(ev.event_date) : null;
      if (evDate && evDate >= now) {
        upcomingEvents.push({
          id: ev.id,
          name: ev.name,
          event_date: ev.event_date,
          city: ev.city,
          country: ev.country,
          venue_name: ev.venue_name
        });
      }
    }
    upcomingEvents.sort(function (a, b) {
      var da = a.event_date ? new Date(a.event_date).getTime() : 0;
      var db = b.event_date ? new Date(b.event_date).getTime() : 0;
      return da - db;
    });

    // Featured products: active products sorted by rating desc
    var activeProducts = products.filter(function (p) { return p.is_active; });
    activeProducts.sort(function (a, b) {
      var ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
      var rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
      return rb - ra;
    });
    var featuredProducts = activeProducts.map(function (p) {
      return {
        id: p.id,
        name: p.name,
        product_type: p.product_type,
        price: p.price,
        currency: p.currency,
        average_rating: p.average_rating || 0,
        rating_count: p.rating_count || 0,
        primary_image_url: p.images && p.images.length > 0 ? p.images[0] : ''
      };
    });

    // Newsletter promo flag based on subscription existence
    var subsData = this.getNewsletterSubscription();
    var hasActiveNewsletterPromo = !subsData.exists || (subsData.subscription && subsData.subscription.status !== 'active');

    return {
      latest_releases: latestReleases,
      featured_videos: featuredVideos,
      upcoming_events: upcomingEvents,
      featured_products: featuredProducts,
      has_active_newsletter_promo: hasActiveNewsletterPromo
    };
  }

  // getTourFilterOptions
  getTourFilterOptions() {
    var events = this._getFromStorage('tour_events', []);
    var citiesMap = {};
    var countriesMap = {};
    var monthsMap = {};
    var monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.city) citiesMap[ev.city] = true;
      if (ev.country) countriesMap[ev.country] = true;
      if (ev.event_date) {
        var d = new Date(ev.event_date);
        if (!isNaN(d.getTime())) {
          var m = d.getMonth() + 1;
          var y = d.getFullYear();
          var key = y + '-' + m;
          if (!monthsMap[key]) {
            monthsMap[key] = {
              month: m,
              year: y,
              label: monthNames[m - 1] + '_' + y
            };
          }
        }
      }
    }

    return {
      cities: Object.keys(citiesMap),
      countries: Object.keys(countriesMap),
      months: Object.keys(monthsMap).map(function (k) { return monthsMap[k]; })
    };
  }

  // searchTourEvents
  searchTourEvents(city, country, month, year, status, sort_order) {
    var events = this._getFromStorage('tour_events', []);
    var tickets = this._getFromStorage('ticket_options', []);
    var ticketByEvent = {};
    for (var i = 0; i < tickets.length; i++) {
      var t = tickets[i];
      if (!ticketByEvent[t.event_id]) ticketByEvent[t.event_id] = [];
      ticketByEvent[t.event_id].push(t);
    }

    var filtered = [];
    for (var j = 0; j < events.length; j++) {
      var ev = events[j];
      if (city && ev.city && ev.city.toLowerCase() !== String(city).toLowerCase()) continue;
      if (country && ev.country && ev.country.toLowerCase() !== String(country).toLowerCase()) continue;
      if (status && status !== 'all' && ev.status !== status) continue;

      if (month || year) {
        if (!ev.event_date) continue;
        var d = new Date(ev.event_date);
        if (isNaN(d.getTime())) continue;
        var evMonth = d.getMonth() + 1;
        var evYear = d.getFullYear();
        if (month && evMonth !== month) continue;
        if (year && evYear !== year) continue;
      }

      var eventTickets = ticketByEvent[ev.id] || [];
      var hasAvailable = false;
      var minPrice = null;
      var currency = null;
      for (var k = 0; k < eventTickets.length; k++) {
        var opt = eventTickets[k];
        if (opt.is_available && (typeof opt.available_quantity === 'undefined' || opt.available_quantity === null || opt.available_quantity > 0)) {
          hasAvailable = true;
        }
        if (typeof opt.price === 'number') {
          if (minPrice === null || opt.price < minPrice) {
            minPrice = opt.price;
            currency = opt.currency;
          }
        }
      }

      filtered.push({
        id: ev.id,
        name: ev.name,
        event_date: ev.event_date,
        city: ev.city,
        country: ev.country,
        venue_name: ev.venue_name,
        status: ev.status,
        has_available_tickets: hasAvailable,
        min_ticket_price: minPrice,
        currency: currency
      });
    }

    var order = sort_order || 'date_asc';
    filtered.sort(function (a, b) {
      var da = a.event_date ? new Date(a.event_date).getTime() : 0;
      var db = b.event_date ? new Date(b.event_date).getTime() : 0;
      if (order === 'date_desc') return db - da;
      return da - db;
    });

    return filtered;
  }

  // getEventDetailWithTickets
  getEventDetailWithTickets(eventId) {
    var events = this._getFromStorage('tour_events', []);
    var tickets = this._getFromStorage('ticket_options', []);
    var ev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        ev = events[i];
        break;
      }
    }
    var eventTickets = [];
    for (var j = 0; j < tickets.length; j++) {
      if (tickets[j].event_id === eventId) {
        eventTickets.push(tickets[j]);
      }
    }
    return {
      event: ev ? {
        id: ev.id,
        name: ev.name,
        tour_name: ev.tour_name,
        event_date: ev.event_date,
        city: ev.city,
        country: ev.country,
        venue_name: ev.venue_name,
        venue_address: ev.venue_address,
        timezone: ev.timezone,
        status: ev.status,
        doors_time: ev.doors_time,
        show_time: ev.show_time,
        support_acts: ev.support_acts || [],
        map_url: ev.map_url
      } : null,
      ticket_options: eventTickets
    };
  }

  // saveEventTicketSelection
  saveEventTicketSelection(eventId, ticketOptionId, ticket_type, quantity, context, itinerary_name) {
    var events = this._getFromStorage('tour_events', []);
    var tickets = this._getFromStorage('ticket_options', []);
    var items = this._getFromStorage('itinerary_items', []);
    var itineraries = this._getFromStorage('itineraries', []);

    var ev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        ev = events[i];
        break;
      }
    }
    if (!ev) {
      return { success: false, itinerary_item_id: null, itinerary_name: null, context: context, message: 'Event not found' };
    }

    var ticketOpt = null;
    if (ticketOptionId) {
      for (var j = 0; j < tickets.length; j++) {
        if (tickets[j].id === ticketOptionId) {
          ticketOpt = tickets[j];
          break;
        }
      }
    }

    var qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    var ctx = context || 'saved_ticket';

    var itineraryNameToUse = ctx === 'itinerary' && itinerary_name ? itinerary_name : 'default_itinerary';
    var itinerary = this._getOrCreateDefaultItinerary(itineraryNameToUse);

    // refresh itineraries array with potential new itinerary
    itineraries = this._getFromStorage('itineraries', []);
    itinerary = null;
    for (var ii = 0; ii < itineraries.length; ii++) {
      if (itineraries[ii].name === itineraryNameToUse) {
        itinerary = itineraries[ii];
        break;
      }
    }

    var item = {
      id: this._generateId('itinerary_item'),
      itinerary_id: itinerary.id,
      event_id: eventId,
      ticket_option_id: ticketOpt ? ticketOpt.id : ticketOptionId || null,
      ticket_type: ticket_type || (ticketOpt ? ticketOpt.ticket_type : null),
      quantity: qty,
      source: ctx,
      notes: null,
      added_at: this._getNowIso()
    };
    items.push(item);
    itinerary.item_ids = itinerary.item_ids || [];
    itinerary.item_ids.push(item.id);
    itinerary.updated_at = this._getNowIso();

    // Save back
    this._saveToStorage('itinerary_items', items);
    for (var ix = 0; ix < itineraries.length; ix++) {
      if (itineraries[ix].id === itinerary.id) {
        itineraries[ix] = itinerary;
        break;
      }
    }
    this._saveToStorage('itineraries', itineraries);

    return {
      success: true,
      itinerary_item_id: item.id,
      itinerary_name: itinerary.name,
      context: ctx,
      message: 'Event ticket selection saved'
    };
  }

  // getItineraryOverview
  getItineraryOverview() {
    var itineraries = this._getFromStorage('itineraries', []);
    var items = this._getFromStorage('itinerary_items', []);
    var events = this._getFromStorage('tour_events', []);
    var tickets = this._getFromStorage('ticket_options', []);

    var itineraryMap = {};
    for (var i = 0; i < itineraries.length; i++) {
      itineraryMap[itineraries[i].id] = itineraries[i];
    }
    var eventMap = {};
    for (var j = 0; j < events.length; j++) {
      eventMap[events[j].id] = events[j];
    }
    var ticketMap = {};
    for (var k = 0; k < tickets.length; k++) {
      ticketMap[tickets[k].id] = tickets[k];
    }

    var outItems = [];
    var countrySet = {};
    var eventIdSet = {};

    for (var idx = 0; idx < items.length; idx++) {
      var itItem = items[idx];
      var itin = itineraryMap[itItem.itinerary_id] || null;
      var ev = eventMap[itItem.event_id] || null;
      var topt = itItem.ticket_option_id ? ticketMap[itItem.ticket_option_id] : null;
      if (ev) {
        countrySet[ev.country] = true;
        eventIdSet[ev.id] = true;
      }
      outItems.push({
        itinerary_item_id: itItem.id,
        itinerary_name: itin ? itin.name : null,
        event_id: itItem.event_id,
        event_name: ev ? ev.name : null,
        event_date: ev ? ev.event_date : null,
        city: ev ? ev.city : null,
        country: ev ? ev.country : null,
        ticket_type: itItem.ticket_type || (topt ? topt.ticket_type : null),
        ticket_option_name: topt ? topt.name : null,
        quantity: itItem.quantity,
        source: itItem.source,
        added_at: itItem.added_at,
        // Foreign key resolution objects
        itinerary: itin,
        event: ev,
        ticket_option: topt
      });
    }

    return {
      items: outItems,
      summary: {
        total_shows: Object.keys(eventIdSet).length,
        countries: Object.keys(countrySet)
      }
    };
  }

  // updateItineraryItem
  updateItineraryItem(itineraryItemId, ticketOptionId, ticket_type, quantity, notes) {
    var items = this._getFromStorage('itinerary_items', []);
    var updated = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itineraryItemId) {
        if (typeof ticketOptionId !== 'undefined') items[i].ticket_option_id = ticketOptionId;
        if (typeof ticket_type !== 'undefined') items[i].ticket_type = ticket_type;
        if (typeof quantity === 'number' && quantity > 0) items[i].quantity = quantity;
        if (typeof notes !== 'undefined') items[i].notes = notes;
        updated = items[i];
        break;
      }
    }
    if (!updated) {
      return { success: false, updated_item_id: null, message: 'Itinerary item not found' };
    }
    this._saveToStorage('itinerary_items', items);
    return { success: true, updated_item_id: updated.id, message: 'Itinerary item updated' };
  }

  // removeItineraryItem
  removeItineraryItem(itineraryItemId) {
    var items = this._getFromStorage('itinerary_items', []);
    var itineraries = this._getFromStorage('itineraries', []);
    var index = -1;
    var item = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itineraryItemId) {
        index = i;
        item = items[i];
        break;
      }
    }
    if (index === -1) {
      return { success: false, removed_item_id: null, remaining_items: items.length };
    }
    items.splice(index, 1);
    // Remove from its itinerary
    for (var j = 0; j < itineraries.length; j++) {
      if (itineraries[j].id === item.itinerary_id && Array.isArray(itineraries[j].item_ids)) {
        var arr = itineraries[j].item_ids;
        var idx = arr.indexOf(itineraryItemId);
        if (idx !== -1) {
          arr.splice(idx, 1);
          itineraries[j].updated_at = this._getNowIso();
        }
        break;
      }
    }
    this._saveToStorage('itinerary_items', items);
    this._saveToStorage('itineraries', itineraries);
    return { success: true, removed_item_id: itineraryItemId, remaining_items: items.length };
  }

  // getDiscographyViewState
  getDiscographyViewState() {
    var state = this._updateDiscographyViewStateStorage(null);
    return {
      view_mode: state.view_mode,
      year_from: state.year_from,
      year_to: state.year_to,
      sort_order: state.sort_order,
      track_genre_filter: state.track_genre_filter,
      last_updated: state.last_updated
    };
  }

  // updateDiscographyViewState
  updateDiscographyViewState(view_mode, year_from, year_to, sort_order, track_genre_filter) {
    var partial = {};
    if (typeof view_mode !== 'undefined') partial.view_mode = view_mode;
    if (typeof year_from !== 'undefined') partial.year_from = year_from;
    if (typeof year_to !== 'undefined') partial.year_to = year_to;
    if (typeof sort_order !== 'undefined') partial.sort_order = sort_order;
    if (typeof track_genre_filter !== 'undefined') partial.track_genre_filter = track_genre_filter;
    var state = this._updateDiscographyViewStateStorage(partial);
    return {
      view_mode: state.view_mode,
      year_from: state.year_from,
      year_to: state.year_to,
      sort_order: state.sort_order,
      track_genre_filter: state.track_genre_filter,
      last_updated: state.last_updated
    };
  }

  // searchAlbums
  searchAlbums(album_type, year_from, year_to, sort_order) {
    var albums = this._getFromStorage('albums', []);
    var filtered = [];
    for (var i = 0; i < albums.length; i++) {
      var a = albums[i];
      if (album_type && album_type !== 'all' && a.album_type !== album_type) continue;
      if (typeof year_from === 'number' && a.release_year < year_from) continue;
      if (typeof year_to === 'number' && a.release_year > year_to) continue;
      filtered.push(a);
    }
    var order = sort_order || 'release_date_desc';
    filtered.sort(function (x, y) {
      var dx = x.release_date ? new Date(x.release_date).getTime() : 0;
      var dy = y.release_date ? new Date(y.release_date).getTime() : 0;
      if (order === 'release_date_asc') return dx - dy;
      return dy - dx;
    });

    // Instrumentation for task completion tracking (task_5 - album filter params)
    try {
      if (album_type === 'studio' && year_from === 2015 && year_to === 2023) {
        localStorage.setItem('task5_albumFilterParams', JSON.stringify({
          album_type: album_type,
          year_from: year_from,
          year_to: year_to,
          sort_order: sort_order,
          recorded_at: this._getNowIso()
        }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered.map(function (a) {
      return {
        id: a.id,
        title: a.title,
        release_date: a.release_date,
        release_year: a.release_year,
        album_type: a.album_type,
        description: a.description,
        artwork_url: a.artwork_url,
        total_tracks: a.total_tracks,
        total_duration_seconds: a.total_duration_seconds,
        is_favorite: !!a.is_favorite
      };
    });
  }

  // searchTracks
  searchTracks(year_from, year_to, primary_genre_filter, search_text, sort_order) {
    var tracks = this._getFromStorage('tracks', []);
    var albums = this._getFromStorage('albums', []);
    var albumMap = {};
    for (var i = 0; i < albums.length; i++) {
      albumMap[albums[i].id] = albums[i];
    }
    var txt = search_text ? String(search_text).toLowerCase() : null;
    var filtered = [];
    for (var j = 0; j < tracks.length; j++) {
      var t = tracks[j];
      if (typeof year_from === 'number' && t.release_year < year_from) continue;
      if (typeof year_to === 'number' && t.release_year > year_to) continue;
      if (primary_genre_filter && primary_genre_filter !== 'all' && t.primary_genre !== primary_genre_filter) continue;
      if (txt && t.title && t.title.toLowerCase().indexOf(txt) === -1) continue;
      filtered.push(t);
    }
    var order = sort_order || 'release_date_desc';
    filtered.sort(function (a, b) {
      var da = a.release_date ? new Date(a.release_date).getTime() : 0;
      var db = b.release_date ? new Date(b.release_date).getTime() : 0;
      if (order === 'release_date_asc') return da - db;
      return db - da;
    });
    return filtered.map(function (t) {
      var album = albumMap[t.album_id] || null;
      return {
        id: t.id,
        title: t.title,
        album_id: t.album_id,
        album_title: album ? album.title : null,
        track_number: t.track_number,
        duration_seconds: t.duration_seconds,
        release_date: t.release_date,
        release_year: t.release_year,
        primary_genre: t.primary_genre,
        is_favorite: !!t.is_favorite,
        album: album
      };
    });
  }

  // getAlbumDetail
  getAlbumDetail(albumId) {
    var albums = this._getFromStorage('albums', []);
    var tracks = this._getFromStorage('tracks', []);
    var album = null;
    for (var i = 0; i < albums.length; i++) {
      if (albums[i].id === albumId) {
        album = albums[i];
        break;
      }
    }
    var albumTracks = [];
    for (var j = 0; j < tracks.length; j++) {
      if (tracks[j].album_id === albumId) {
        albumTracks.push(tracks[j]);
      }
    }
    albumTracks.sort(function (a, b) {
      var na = typeof a.track_number === 'number' ? a.track_number : 0;
      var nb = typeof b.track_number === 'number' ? b.track_number : 0;
      return na - nb;
    });

    // Instrumentation for task completion tracking (task_5 - compared album IDs)
    try {
      if (album && album.album_type === 'studio' &&
          typeof album.release_year === 'number' &&
          album.release_year >= 2015 && album.release_year <= 2023) {
        var existingIds = [];
        var raw = localStorage.getItem('task5_comparedAlbumIds');
        if (raw) {
          try {
            existingIds = JSON.parse(raw);
          } catch (e2) {
            existingIds = [];
          }
        }
        if (!Array.isArray(existingIds)) {
          existingIds = [];
        }
        if (existingIds.indexOf(album.id) === -1) {
          existingIds.push(album.id);
        }
        // Optionally keep the list small (first 3 IDs)
        if (existingIds.length > 3) {
          existingIds = existingIds.slice(0, 3);
        }
        localStorage.setItem('task5_comparedAlbumIds', JSON.stringify(existingIds));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      album: album ? {
        id: album.id,
        title: album.title,
        release_date: album.release_date,
        release_year: album.release_year,
        album_type: album.album_type,
        description: album.description,
        artwork_url: album.artwork_url,
        total_tracks: album.total_tracks,
        total_duration_seconds: album.total_duration_seconds,
        is_favorite: !!album.is_favorite
      } : null,
      tracks: albumTracks.map(function (t) {
        return {
          id: t.id,
          title: t.title,
          track_number: t.track_number,
          duration_seconds: t.duration_seconds,
          has_lyrics: t.has_lyrics
        };
      })
    };
  }

  // setAlbumFavoriteStatus
  setAlbumFavoriteStatus(albumId, is_favorite) {
    var albums = this._getFromStorage('albums', []);
    var updated = null;
    for (var i = 0; i < albums.length; i++) {
      if (albums[i].id === albumId) {
        albums[i].is_favorite = !!is_favorite;
        albums[i].favorite_marked_at = is_favorite ? this._getNowIso() : null;
        updated = albums[i];
        break;
      }
    }
    if (!updated) {
      return { success: false, album_id: albumId, is_favorite: !!is_favorite };
    }
    this._saveToStorage('albums', albums);
    return { success: true, album_id: albumId, is_favorite: !!is_favorite };
  }

  // getTrackDetailWithLyrics
  getTrackDetailWithLyrics(trackId) {
    var tracks = this._getFromStorage('tracks', []);
    var albums = this._getFromStorage('albums', []);
    var lyricsList = this._getFromStorage('track_lyrics', []);

    var track = null;
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].id === trackId) {
        track = tracks[i];
        break;
      }
    }
    if (!track) {
      return { track: null, available_lyrics: [], default_lyrics: null };
    }
    var album = null;
    for (var j = 0; j < albums.length; j++) {
      if (albums[j].id === track.album_id) {
        album = albums[j];
        break;
      }
    }

    var available = [];
    var defaultLyricsObj = null;
    for (var k = 0; k < lyricsList.length; k++) {
      var lyr = lyricsList[k];
      if (lyr.track_id === trackId) {
        var hasText = !!(lyr.text && lyr.text.length > 0);
        available.push({ language: lyr.language, is_default: !!lyr.is_default, has_text: hasText });
        if (lyr.is_default && !defaultLyricsObj) {
          defaultLyricsObj = { language: lyr.language, text: lyr.text };
        }
      }
    }
    if (!defaultLyricsObj && available.length > 0) {
      // pick first with text
      for (var m = 0; m < lyricsList.length; m++) {
        var lyr2 = lyricsList[m];
        if (lyr2.track_id === trackId) {
          defaultLyricsObj = { language: lyr2.language, text: lyr2.text };
          break;
        }
      }
    }

    return {
      track: {
        id: track.id,
        title: track.title,
        album_id: track.album_id,
        album_title: album ? album.title : null,
        release_year: track.release_year,
        duration_seconds: track.duration_seconds,
        primary_genre: track.primary_genre,
        styles: track.styles || [],
        audio_url: track.audio_url,
        is_favorite: !!track.is_favorite,
        album: album
      },
      available_lyrics: available,
      default_lyrics: defaultLyricsObj
    };
  }

  // getTrackLyrics
  getTrackLyrics(trackId, language) {
    var lyricsList = this._getFromStorage('track_lyrics', []);
    for (var i = 0; i < lyricsList.length; i++) {
      if (lyricsList[i].track_id === trackId && lyricsList[i].language === language) {
        var resultFound = { track_id: trackId, language: language, text: lyricsList[i].text };

        // Instrumentation for task completion tracking (task_8 - lyrics selection)
        try {
          localStorage.setItem('task8_lyricsSelection', JSON.stringify({
            track_id: trackId,
            language: language,
            viewed_at: this._getNowIso()
          }));
        } catch (e) {
          console.error('Instrumentation error:', e);
        }

        return resultFound;
      }
    }
    var resultEmpty = { track_id: trackId, language: language, text: '' };

    // Instrumentation for task completion tracking (task_8 - lyrics selection)
    try {
      localStorage.setItem('task8_lyricsSelection', JSON.stringify({
        track_id: trackId,
        language: language,
        viewed_at: this._getNowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return resultEmpty;
  }

  // setTrackFavoriteStatus
  setTrackFavoriteStatus(trackId, is_favorite) {
    var tracks = this._getFromStorage('tracks', []);
    var updated = null;
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].id === trackId) {
        tracks[i].is_favorite = !!is_favorite;
        tracks[i].favorite_marked_at = is_favorite ? this._getNowIso() : null;
        updated = tracks[i];
        break;
      }
    }
    if (!updated) {
      return { success: false, track_id: trackId, is_favorite: !!is_favorite };
    }
    this._saveToStorage('tracks', tracks);
    return { success: true, track_id: trackId, is_favorite: !!is_favorite };
  }

  // addTracksToNewPlaylist
  addTracksToNewPlaylist(playlist_name, description, track_ids) {
    var playlists = this._getFromStorage('playlists', []);
    var playlistTracks = this._getFromStorage('playlist_tracks', []);
    var now = this._getNowIso();
    var playlist = {
      id: this._generateId('playlist'),
      name: playlist_name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    playlists.push(playlist);

    for (var i = 0; i < track_ids.length; i++) {
      var pt = {
        id: this._generateId('playlist_track'),
        playlist_id: playlist.id,
        track_id: track_ids[i],
        position: i + 1,
        added_at: now
      };
      playlistTracks.push(pt);
    }

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_tracks', playlistTracks);

    return {
      success: true,
      playlist_id: playlist.id,
      playlist_name: playlist.name,
      total_tracks: track_ids.length
    };
  }

  // addTracksToPlaylist
  addTracksToPlaylist(playlistId, track_ids) {
    var playlists = this._getFromStorage('playlists', []);
    var playlistTracks = this._getFromStorage('playlist_tracks', []);
    var playlist = null;
    for (var i = 0; i < playlists.length; i++) {
      if (playlists[i].id === playlistId) {
        playlist = playlists[i];
        break;
      }
    }
    if (!playlist) {
      return { success: false, playlist_id: playlistId, total_tracks: 0 };
    }
    var now = this._getNowIso();
    var maxPos = 0;
    for (var j = 0; j < playlistTracks.length; j++) {
      if (playlistTracks[j].playlist_id === playlistId && playlistTracks[j].position > maxPos) {
        maxPos = playlistTracks[j].position;
      }
    }
    for (var k = 0; k < track_ids.length; k++) {
      var pt = {
        id: this._generateId('playlist_track'),
        playlist_id: playlistId,
        track_id: track_ids[k],
        position: maxPos + k + 1,
        added_at: now
      };
      playlistTracks.push(pt);
    }
    playlist.updated_at = now;

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_tracks', playlistTracks);

    var total = 0;
    for (var m = 0; m < playlistTracks.length; m++) {
      if (playlistTracks[m].playlist_id === playlistId) total++;
    }

    return { success: true, playlist_id: playlistId, total_tracks: total };
  }

  // getPlaylistsOverview
  getPlaylistsOverview() {
    var playlists = this._getFromStorage('playlists', []);
    var playlistTracks = this._getFromStorage('playlist_tracks', []);
    var countMap = {};
    for (var i = 0; i < playlistTracks.length; i++) {
      var pt = playlistTracks[i];
      countMap[pt.playlist_id] = (countMap[pt.playlist_id] || 0) + 1;
    }
    return playlists.map(function (p) {
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        track_count: countMap[p.id] || 0,
        created_at: p.created_at,
        updated_at: p.updated_at
      };
    });
  }

  // getPlaylistDetail
  getPlaylistDetail(playlistId) {
    var playlists = this._getFromStorage('playlists', []);
    var playlistTracks = this._getFromStorage('playlist_tracks', []);
    var tracks = this._getFromStorage('tracks', []);
    var albums = this._getFromStorage('albums', []);

    var playlist = null;
    for (var i = 0; i < playlists.length; i++) {
      if (playlists[i].id === playlistId) {
        playlist = playlists[i];
        break;
      }
    }
    var trackMap = {};
    for (var j = 0; j < tracks.length; j++) {
      trackMap[tracks[j].id] = tracks[j];
    }
    var albumMap = {};
    for (var k = 0; k < albums.length; k++) {
      albumMap[albums[k].id] = albums[k];
    }

    var pts = [];
    for (var m = 0; m < playlistTracks.length; m++) {
      if (playlistTracks[m].playlist_id === playlistId) {
        pts.push(playlistTracks[m]);
      }
    }
    pts.sort(function (a, b) { return a.position - b.position; });

    var outTracks = [];
    for (var n = 0; n < pts.length; n++) {
      var pt = pts[n];
      var track = trackMap[pt.track_id] || null;
      var album = track ? (albumMap[track.album_id] || null) : null;
      outTracks.push({
        track_id: pt.track_id,
        title: track ? track.title : null,
        album_id: track ? track.album_id : null,
        album_title: album ? album.title : null,
        position: pt.position,
        duration_seconds: track ? track.duration_seconds : null,
        track: track,
        album: album
      });
    }

    return {
      playlist: playlist,
      tracks: outTracks
    };
  }

  // updatePlaylistOrder
  updatePlaylistOrder(playlistId, ordered_track_ids) {
    var playlistTracks = this._getFromStorage('playlist_tracks', []);
    var orderMap = {};
    for (var i = 0; i < ordered_track_ids.length; i++) {
      orderMap[ordered_track_ids[i]] = i + 1;
    }
    var extra = [];
    var maxOrder = ordered_track_ids.length;
    for (var j = 0; j < playlistTracks.length; j++) {
      var pt = playlistTracks[j];
      if (pt.playlist_id !== playlistId) continue;
      if (orderMap[pt.track_id]) {
        pt.position = orderMap[pt.track_id];
      } else {
        extra.push(pt);
      }
    }
    // Append extra tracks after ordered ones, preserving relative order
    extra.sort(function (a, b) { return a.position - b.position; });
    for (var k = 0; k < extra.length; k++) {
      maxOrder += 1;
      extra[k].position = maxOrder;
    }
    this._saveToStorage('playlist_tracks', playlistTracks);
    return { success: true, playlist_id: playlistId };
  }

  // removeTrackFromPlaylist
  removeTrackFromPlaylist(playlistId, trackId) {
    var playlistTracks = this._getFromStorage('playlist_tracks', []);
    var newList = [];
    for (var i = 0; i < playlistTracks.length; i++) {
      var pt = playlistTracks[i];
      if (!(pt.playlist_id === playlistId && pt.track_id === trackId)) {
        newList.push(pt);
      }
    }
    this._saveToStorage('playlist_tracks', newList);
    return { success: true, playlist_id: playlistId, track_id: trackId };
  }

  // getStoreFilterOptionsAndState
  getStoreFilterOptionsAndState() {
    var categories = this._getFromStorage('product_categories', []);
    var state = this._updateStoreViewStateStorage(null);

    var ratingFilters = [
      { code: 'all', label: 'All ratings' },
      { code: 'four_stars_up', label: '4 stars & up' },
      { code: 'three_stars_up', label: '3 stars & up' }
    ];

    var sortOptions = [
      { code: 'price_low_to_high', label: 'Price: Low to High' },
      { code: 'price_high_to_low', label: 'Price: High to Low' },
      { code: 'rating_high_to_low', label: 'Rating: High to Low' },
      { code: 'newest', label: 'Newest' }
    ];

    return {
      categories: categories.map(function (c) {
        return { id: c.id, name: c.name, code: c.code };
      }),
      rating_filters: ratingFilters,
      sort_options: sortOptions,
      current_state: {
        category_filter: state.category_filter,
        rating_filter: state.rating_filter,
        sort_order: state.sort_order,
        last_updated: state.last_updated
      }
    };
  }

  // searchProducts
  searchProducts(category_filter, rating_filter, sort_order, min_price, max_price, product_type) {
    var products = this._getFromStorage('products', []);
    var categories = this._getFromStorage('product_categories', []);

    var categoryById = {};
    var childrenByParentId = {};
    for (var i = 0; i < categories.length; i++) {
      var c = categories[i];
      categoryById[c.id] = c;
      if (c.parent_id) {
        if (!childrenByParentId[c.parent_id]) childrenByParentId[c.parent_id] = [];
        childrenByParentId[c.parent_id].push(c);
      }
    }

    function collectCategoryCodes(cat) {
      var codes = [cat.code];
      if (childrenByParentId[cat.id]) {
        for (var x = 0; x < childrenByParentId[cat.id].length; x++) {
          var child = childrenByParentId[cat.id][x];
          var childCodes = collectCategoryCodes(child);
          for (var y = 0; y < childCodes.length; y++) {
            if (codes.indexOf(childCodes[y]) === -1) codes.push(childCodes[y]);
          }
        }
      }
      return codes;
    }

    var filtered = [];
    for (var j = 0; j < products.length; j++) {
      var p = products[j];
      if (!p.is_active) continue;

      var cat = categoryById[p.category_id];
      var codesForProduct = [];
      if (cat) {
        // include this category and its ancestors
        var current = cat;
        while (current) {
          if (codesForProduct.indexOf(current.code) === -1) codesForProduct.push(current.code);
          current = current.parent_id ? categoryById[current.parent_id] : null;
        }
      }

      if (category_filter && category_filter !== 'all') {
        if (codesForProduct.indexOf(category_filter) === -1) continue;
      }

      if (rating_filter === 'four_stars_up') {
        var r = typeof p.average_rating === 'number' ? p.average_rating : 0;
        if (r < 4) continue;
      } else if (rating_filter === 'three_stars_up') {
        var r3 = typeof p.average_rating === 'number' ? p.average_rating : 0;
        if (r3 < 3) continue;
      }

      if (typeof min_price === 'number' && p.price < min_price) continue;
      if (typeof max_price === 'number' && p.price > max_price) continue;
      if (product_type && p.product_type !== product_type) continue;

      filtered.push(p);
    }

    var order = sort_order || 'newest';
    filtered.sort(function (a, b) {
      if (order === 'price_low_to_high') return a.price - b.price;
      if (order === 'price_high_to_low') return b.price - a.price;
      if (order === 'rating_high_to_low') {
        var ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        var rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        return rb - ra;
      }
      // newest
      var da = a.created_at ? new Date(a.created_at).getTime() : 0;
      var db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return filtered.map(function (p) {
      return {
        id: p.id,
        name: p.name,
        product_type: p.product_type,
        price: p.price,
        currency: p.currency,
        average_rating: p.average_rating || 0,
        rating_count: p.rating_count || 0,
        primary_image_url: p.images && p.images.length > 0 ? p.images[0] : '',
        sizes_available: p.sizes_available || [],
        colors_available: p.colors_available || [],
        is_active: p.is_active,
        category_id: p.category_id,
        category: categoryById[p.category_id] || null
      };
    });
  }

  // getProductDetail
  getProductDetail(productId) {
    var products = this._getFromStorage('products', []);
    var categories = this._getFromStorage('product_categories', []);
    var categoryById = {};
    for (var i = 0; i < categories.length; i++) {
      categoryById[categories[i].id] = categories[i];
    }
    var product = null;
    for (var j = 0; j < products.length; j++) {
      if (products[j].id === productId) {
        product = products[j];
        break;
      }
    }
    if (!product) {
      return null;
    }
    var category = categoryById[product.category_id] || null;
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      category_name: category ? category.name : null,
      product_type: product.product_type,
      price: product.price,
      currency: product.currency,
      average_rating: product.average_rating || 0,
      rating_count: product.rating_count || 0,
      images: product.images || [],
      sizes_available: product.sizes_available || [],
      colors_available: product.colors_available || [],
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      category: category
    };
  }

  // addProductToCart
  addProductToCart(productId, quantity, size, color) {
    var qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items', []);
    var products = this._getFromStorage('products', []);

    var product = null;
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return { success: false, cart_id: null, cart_item_id: null, cart_total_items: 0, cart_total_price: 0, currency: null, message: 'Product not found' };
    }

    if (!cart.currency) {
      cart.currency = product.currency;
    }

    var existing = null;
    for (var j = 0; j < cartItems.length; j++) {
      var ci = cartItems[j];
      if (ci.cart_id === cart.id && ci.product_id === productId && ci.size === size && ci.color === color) {
        existing = ci;
        break;
      }
    }

    if (existing) {
      existing.quantity += qty;
    } else {
      var newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price,
        currency: product.currency,
        size: size || null,
        color: color || null,
        total_price: product.price * qty
      };
      cartItems.push(newItem);
      cart.item_ids = cart.item_ids || [];
      cart.item_ids.push(newItem.id);
    }

    var totals = this._recalculateCartTotals(cart, cartItems, products);
    var lastItem = existing || (cartItems[cartItems.length - 1]);

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: lastItem.id,
      cart_total_items: totals.item_count,
      cart_total_price: totals.subtotal,
      currency: cart.currency,
      message: 'Product added to cart'
    };
  }

  // getCart
  getCart() {
    var cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cart_id: null,
        currency: null,
        items: [],
        totals: { item_count: 0, subtotal: 0 }
      };
    }
    var cartItems = this._getFromStorage('cart_items', []);
    var products = this._getFromStorage('products', []);
    var productMap = {};
    for (var i = 0; i < products.length; i++) {
      productMap[products[i].id] = products[i];
    }

    var items = [];
    var subtotal = 0;
    var itemCount = 0;

    for (var j = 0; j < cartItems.length; j++) {
      var ci = cartItems[j];
      if (ci.cart_id !== cart.id) continue;
      var p = productMap[ci.product_id] || null;
      var totalPrice = ci.total_price || (ci.unit_price * ci.quantity);
      subtotal += totalPrice;
      itemCount += ci.quantity;
      items.push({
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: p ? p.name : null,
        product_type: p ? p.product_type : null,
        size: ci.size,
        color: ci.color,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: totalPrice,
        currency: ci.currency,
        average_rating: p && typeof p.average_rating === 'number' ? p.average_rating : 0,
        product: p
      });
    }

    return {
      cart_id: cart.id,
      currency: cart.currency,
      items: items,
      totals: {
        item_count: itemCount,
        subtotal: subtotal
      }
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    var cart = this._getFromStorage('cart', null);
    var cartItems = this._getFromStorage('cart_items', []);
    var products = this._getFromStorage('products', []);
    if (!cart) {
      return { success: false, cart_item_id: cartItemId, new_quantity: 0, cart_total_price: 0 };
    }
    var item = null;
    for (var i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return { success: false, cart_item_id: cartItemId, new_quantity: 0, cart_total_price: 0 };
    }
    if (quantity <= 0) {
      // Remove item when quantity <= 0
      return this.removeCartItem(cartItemId);
    }
    item.quantity = quantity;
    item.total_price = item.unit_price * item.quantity;
    this._saveToStorage('cart_items', cartItems);
    var totals = this._recalculateCartTotals(cart, cartItems, products);
    return {
      success: true,
      cart_item_id: cartItemId,
      new_quantity: quantity,
      cart_total_price: totals.subtotal
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    var cart = this._getFromStorage('cart', null);
    var cartItems = this._getFromStorage('cart_items', []);
    var products = this._getFromStorage('products', []);
    if (!cart) {
      return { success: false, cart_item_id: cartItemId, cart_total_price: 0, remaining_item_count: 0 };
    }
    var newItems = [];
    var removed = null;
    for (var i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        removed = cartItems[i];
      } else {
        newItems.push(cartItems[i]);
      }
    }
    if (!removed) {
      return { success: false, cart_item_id: cartItemId, cart_total_price: 0, remaining_item_count: cartItems.length };
    }
    cartItems = newItems;
    if (Array.isArray(cart.item_ids)) {
      var idx = cart.item_ids.indexOf(cartItemId);
      if (idx !== -1) cart.item_ids.splice(idx, 1);
    }
    this._saveToStorage('cart_items', cartItems);
    var totals = this._recalculateCartTotals(cart, cartItems, products);
    var remaining = 0;
    for (var j = 0; j < cartItems.length; j++) {
      if (cartItems[j].cart_id === cart.id) remaining++;
    }
    return {
      success: true,
      cart_item_id: cartItemId,
      cart_total_price: totals.subtotal,
      remaining_item_count: remaining
    };
  }

  // getNewsletterOptions
  getNewsletterOptions() {
    var interests = this._getFromStorage('newsletter_interests', []);
    var frequencies = [
      { code: 'daily', label: 'Daily' },
      { code: 'weekly', label: 'Weekly' },
      { code: 'monthly', label: 'Monthly' },
      { code: 'occasional', label: 'Occasional' }
    ];
    return {
      interests: interests.map(function (i) {
        return { code: i.code, label: i.label, description: i.description };
      }),
      frequencies: frequencies
    };
  }

  // getNewsletterSubscription
  getNewsletterSubscription() {
    var subs = this._getFromStorage('newsletter_subscriptions', []);
    var sub = subs.length > 0 ? subs[0] : null;
    if (!sub) {
      return { exists: false, subscription: null };
    }
    return {
      exists: true,
      subscription: {
        email: sub.email,
        first_name: sub.first_name,
        last_name: sub.last_name,
        country: sub.country,
        city: sub.city,
        frequency: sub.frequency,
        interest_codes: sub.interest_codes || [],
        accepted_terms: sub.accepted_terms,
        status: sub.status,
        subscribed_at: sub.subscribed_at,
        updated_at: sub.updated_at
      }
    };
  }

  // submitNewsletterSubscription
  submitNewsletterSubscription(email, first_name, last_name, country, city, frequency, interest_codes, accepted_terms) {
    var subs = this._getFromStorage('newsletter_subscriptions', []);
    var now = this._getNowIso();
    if (!email || !frequency || !accepted_terms) {
      return { success: false, subscription_id: null, status: 'bounced', message: 'Missing required fields or terms not accepted' };
    }
    var sub = subs.length > 0 ? subs[0] : null;
    if (!sub) {
      sub = {
        id: this._generateId('newsletter_subscription'),
        email: email,
        first_name: first_name || '',
        last_name: last_name || '',
        country: country || '',
        city: city || '',
        frequency: frequency,
        interest_codes: interest_codes || [],
        accepted_terms: !!accepted_terms,
        status: 'active',
        subscribed_at: now,
        updated_at: now
      };
      subs = [sub];
    } else {
      sub.email = email;
      sub.first_name = first_name || '';
      sub.last_name = last_name || '';
      sub.country = country || '';
      sub.city = city || '';
      sub.frequency = frequency;
      sub.interest_codes = interest_codes || [];
      sub.accepted_terms = !!accepted_terms;
      sub.status = 'active';
      sub.updated_at = now;
      subs[0] = sub;
    }
    this._saveToStorage('newsletter_subscriptions', subs);
    return { success: true, subscription_id: sub.id, status: sub.status, message: 'Subscription saved' };
  }

  // getVideoFilterOptions
  getVideoFilterOptions() {
    var videos = this._getFromStorage('videos', []);
    var contentTypeMap = {};
    for (var i = 0; i < videos.length; i++) {
      contentTypeMap[videos[i].content_type] = true;
    }
    var contentTypes = Object.keys(contentTypeMap);
    var sortOptions = [
      { code: 'date_desc', label: 'Newest first' },
      { code: 'date_asc', label: 'Oldest first' },
      { code: 'views_desc', label: 'Most viewed' },
      { code: 'views_asc', label: 'Least viewed' }
    ];
    return {
      content_types: contentTypes,
      sort_options: sortOptions
    };
  }

  // searchVideos
  searchVideos(content_type, date_from, date_to, duration_min_seconds, view_count_min, sort_order) {
    var videos = this._getFromStorage('videos', []);
    var filtered = [];
    var fromTime = date_from ? new Date(date_from).getTime() : null;
    var toTime = date_to ? new Date(date_to).getTime() : null;
    var minDur = typeof duration_min_seconds === 'number' ? duration_min_seconds : null;
    var minViews = typeof view_count_min === 'number' ? view_count_min : null;

    function getVideoDate(v) {
      var d = v.uploaded_date || v.recorded_date;
      if (!d) return null;
      var n = new Date(d).getTime();
      return isNaN(n) ? null : n;
    }

    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      if (content_type && content_type !== 'all' && v.content_type !== content_type) continue;
      var t = getVideoDate(v);
      if (fromTime !== null && (t === null || t < fromTime)) continue;
      if (toTime !== null && (t === null || t > toTime)) continue;
      if (minDur !== null && v.duration_seconds < minDur) continue;
      if (minViews !== null && v.view_count < minViews) continue;
      filtered.push(v);
    }

    var order = sort_order || 'date_desc';
    filtered.sort(function (a, b) {
      if (order === 'views_desc') return b.view_count - a.view_count;
      if (order === 'views_asc') return a.view_count - b.view_count;
      var da = getVideoDate(a) || 0;
      var db = getVideoDate(b) || 0;
      if (order === 'date_asc') return da - db;
      return db - da;
    });

    return filtered.map(function (v) {
      return {
        id: v.id,
        title: v.title,
        content_type: v.content_type,
        recorded_date: v.recorded_date,
        uploaded_date: v.uploaded_date,
        duration_seconds: v.duration_seconds,
        view_count: v.view_count,
        is_live: v.is_live,
        thumbnail_url: v.thumbnail_url
      };
    });
  }

  // getVideoDetail
  getVideoDetail(videoId) {
    var videos = this._getFromStorage('videos', []);
    var video = null;
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].id === videoId) {
        video = videos[i];
        break;
      }
    }
    if (!video) return null;
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      content_type: video.content_type,
      recorded_date: video.recorded_date,
      uploaded_date: video.uploaded_date,
      duration_seconds: video.duration_seconds,
      view_count: video.view_count,
      is_live: video.is_live,
      thumbnail_url: video.thumbnail_url,
      video_url: video.video_url
    };
  }

  // addVideoToWatchLater
  addVideoToWatchLater(videoId, watchLaterListId) {
    var videos = this._getFromStorage('videos', []);
    var video = null;
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].id === videoId) {
        video = videos[i];
        break;
      }
    }
    if (!video) {
      return { success: false, watch_later_list_id: null, watch_later_item_id: null, list_name: null, total_items: 0 };
    }
    var lists = this._getFromStorage('watch_later_lists', []);
    var list = null;
    if (watchLaterListId) {
      for (var j = 0; j < lists.length; j++) {
        if (lists[j].id === watchLaterListId) {
          list = lists[j];
          break;
        }
      }
    }
    if (!list) {
      list = this._getOrCreateDefaultWatchLaterList();
      lists = this._getFromStorage('watch_later_lists', []);
      for (var k = 0; k < lists.length; k++) {
        if (lists[k].id === list.id) {
          list = lists[k];
          break;
        }
      }
    }

    var items = this._getFromStorage('watch_later_items', []);
    var now = this._getNowIso();
    var item = {
      id: this._generateId('watch_later_item'),
      watch_later_list_id: list.id,
      video_id: videoId,
      added_at: now
    };
    items.push(item);
    list.updated_at = now;

    // Save back
    this._saveToStorage('watch_later_items', items);
    for (var ix = 0; ix < lists.length; ix++) {
      if (lists[ix].id === list.id) {
        lists[ix] = list;
        break;
      }
    }
    this._saveToStorage('watch_later_lists', lists);

    var total = 0;
    for (var m = 0; m < items.length; m++) {
      if (items[m].watch_later_list_id === list.id) total++;
    }

    return {
      success: true,
      watch_later_list_id: list.id,
      watch_later_item_id: item.id,
      list_name: list.name,
      total_items: total
    };
  }

  // getWatchLaterList
  getWatchLaterList(watchLaterListId) {
    var lists = this._getFromStorage('watch_later_lists', []);
    var list = null;
    if (watchLaterListId) {
      for (var i = 0; i < lists.length; i++) {
        if (lists[i].id === watchLaterListId) {
          list = lists[i];
          break;
        }
      }
    }
    if (!list) {
      list = this._getOrCreateDefaultWatchLaterList();
      lists = this._getFromStorage('watch_later_lists', []);
      for (var j = 0; j < lists.length; j++) {
        if (lists[j].id === list.id) {
          list = lists[j];
          break;
        }
      }
    }

    var items = this._getFromStorage('watch_later_items', []);
    var videos = this._getFromStorage('videos', []);
    var videoMap = {};
    for (var k = 0; k < videos.length; k++) {
      videoMap[videos[k].id] = videos[k];
    }

    var listItems = [];
    for (var m = 0; m < items.length; m++) {
      var it = items[m];
      if (it.watch_later_list_id !== list.id) continue;
      var v = videoMap[it.video_id] || null;
      listItems.push({
        id: it.id,
        video_id: it.video_id,
        title: v ? v.title : null,
        thumbnail_url: v ? v.thumbnail_url : null,
        duration_seconds: v ? v.duration_seconds : null,
        added_at: it.added_at,
        video: v
      });
    }

    return {
      watch_later_list: list,
      items: listItems
    };
  }

  // getAboutContent
  getAboutContent() {
    return this._getFromStorage('about_content', { bio_html: '', highlights: [], press_quotes: [] });
  }

  // getContactInfo
  getContactInfo() {
    return this._getFromStorage('contact_info', {
      management_email: '',
      booking_email: '',
      press_email: '',
      social_links: []
    });
  }

  // submitContactForm
  submitContactForm(name, email, subject, message, topic) {
    var forms = this._getFromStorage('contact_forms', []);
    var ticket = {
      id: this._generateId('contact_ticket'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      topic: topic || 'general',
      created_at: this._getNowIso()
    };
    forms.push(ticket);
    this._saveToStorage('contact_forms', forms);
    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Contact form submitted'
    };
  }

  // getPoliciesContent
  getPoliciesContent() {
    return this._getFromStorage('policies_content', { privacy_html: '', terms_html: '' });
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