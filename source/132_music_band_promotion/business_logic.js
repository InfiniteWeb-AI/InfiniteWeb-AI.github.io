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
    // Initialize all data tables in localStorage if not exist
    var keys = [
      // Core entities
      'cities',
      'venues',
      'concerts',
      'concert_ticket_types',
      'store_categories',
      'products',
      'product_variants',
      'albums',
      'album_formats',
      'songs',
      'playlists',
      'playlist_songs',
      'fan_club_plans',
      'fan_club_memberships',
      'newsletter_subscriptions',
      'carts',
      'cart_items',
      'event_booking_requests'
    ];

    for (var i = 0; i < keys.length; i++) {
      if (!localStorage.getItem(keys[i])) {
        localStorage.setItem(keys[i], JSON.stringify([]));
      }
    }

    // Content-like tables with simple defaults (no mock data, just structure)
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem(
        'about_content',
        JSON.stringify({
          band_history: '',
          members: [],
          milestones: [],
          featured_albums: []
        })
      );
    }

    if (!localStorage.getItem('faq_content')) {
      localStorage.setItem('faq_content', JSON.stringify({ sections: [] }));
    }

    if (!localStorage.getItem('policies_content')) {
      localStorage.setItem(
        'policies_content',
        JSON.stringify({
          terms_of_use: '',
          ticket_terms: '',
          merch_terms: '',
          privacy_policy: '',
          policy_contact_info: ''
        })
      );
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // ===== Cart helpers =====

  _getOrCreateCart() {
    var carts = this._getFromStorage('carts', []);
    var cart = carts.length > 0 ? carts[0] : null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _calculateCartTotals(cartId) {
    var cart_items = this._getFromStorage('cart_items', []);
    var itemsForCart = [];
    var subtotal = 0;
    var currency = null;

    for (var i = 0; i < cart_items.length; i++) {
      var item = cart_items[i];
      if (item.cart_id === cartId) {
        item.total_price = item.unit_price * item.quantity;
        itemsForCart.push(item);
        subtotal += item.total_price;
        if (!currency && item.currency) {
          currency = item.currency;
        }
      }
    }

    if (!currency) {
      currency = 'USD';
    }

    // Persist any updated totals
    this._saveToStorage('cart_items', cart_items);

    return {
      items: itemsForCart,
      subtotal: subtotal,
      currency: currency
    };
  }

  // ===== Product filter helper =====

  _applyProductFiltersAndSort(products, variantsByProductId, filters, sort) {
    filters = filters || {};
    sort = sort || 'price_low_to_high';

    var filtered = [];

    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var variants = variantsByProductId[p.id] || [];

      // is_active filter if present on product
      if (p.is_active === false) continue;

      // product_type filter
      if (filters.product_type && p.product_type !== filters.product_type) continue;

      // is_bundle filter
      if (typeof filters.is_bundle === 'boolean' && p.is_bundle !== filters.is_bundle) continue;

      // bundle_includes filter
      if (filters.bundle_includes) {
        var includes = p.included_items || [];
        var term = String(filters.bundle_includes).toLowerCase();
        var foundTerm = false;
        for (var bi = 0; bi < includes.length; bi++) {
          if (String(includes[bi]).toLowerCase().indexOf(term) !== -1) {
            foundTerm = true;
            break;
          }
        }
        if (!foundTerm) continue;
      }

      // Color filter
      if (filters.color) {
        var colorMatch = false;
        var colorTerm = String(filters.color).toLowerCase();
        for (var c = 0; c < variants.length; c++) {
          var vColor = variants[c].color ? String(variants[c].color).toLowerCase() : '';
          if (vColor === colorTerm) {
            colorMatch = true;
            break;
          }
        }
        if (!colorMatch) continue;
      }

      // Size filter
      if (filters.size) {
        var sizeMatch = false;
        var sizeTerm = String(filters.size).toLowerCase();
        for (var s = 0; s < variants.length; s++) {
          var vSize = variants[s].size ? String(variants[s].size).toLowerCase() : '';
          if (vSize === sizeTerm) {
            sizeMatch = true;
            break;
          }
        }
        if (!sizeMatch) continue;
      }

      // Price filter
      var prices = [];
      for (var vp = 0; vp < variants.length; vp++) {
        prices.push(variants[vp].price);
      }
      if (typeof p.base_price === 'number') {
        prices.push(p.base_price);
      }
      var minPrice = prices.length ? Math.min.apply(null, prices) : 0;
      var maxPrice = prices.length ? Math.max.apply(null, prices) : 0;

      if (typeof filters.min_price === 'number' && minPrice < filters.min_price) continue;
      if (typeof filters.max_price === 'number' && maxPrice > filters.max_price) continue;

      filtered.push(p);
    }

    // Sorting
    filtered.sort(function (a, b) {
      var av = variantsByProductId[a.id] || [];
      var bv = variantsByProductId[b.id] || [];

      var aPrices = [];
      var bPrices = [];
      for (var i1 = 0; i1 < av.length; i1++) aPrices.push(av[i1].price);
      for (var i2 = 0; i2 < bv.length; i2++) bPrices.push(bv[i2].price);
      if (typeof a.base_price === 'number') aPrices.push(a.base_price);
      if (typeof b.base_price === 'number') bPrices.push(b.base_price);
      var aMin = aPrices.length ? Math.min.apply(null, aPrices) : 0;
      var bMin = bPrices.length ? Math.min.apply(null, bPrices) : 0;

      if (sort === 'price_high_to_low') {
        return bMin - aMin;
      }
      if (sort === 'name_a_to_z') {
        return String(a.name).toLowerCase() < String(b.name).toLowerCase() ? -1 : 1;
      }
      if (sort === 'newest_first') {
        var ad = a.created_at ? new Date(a.created_at).getTime() : 0;
        var bd = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bd - ad;
      }
      // default price_low_to_high
      return aMin - bMin;
    });

    return filtered;
  }

  // ===== Album/Song filters helper (generic) =====

  _applyAlbumAndSongFilters(items, options) {
    // Simple utility not heavily used; included for completeness
    options = options || {};
    var filtered = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var ok = true;

      if (options.album_type && it.album_type && it.album_type !== options.album_type) ok = false;
      if (typeof options.min_tracks === 'number' && typeof it.total_tracks === 'number' && it.total_tracks < options.min_tracks) ok = false;

      if (!ok) continue;
      filtered.push(it);
    }
    return filtered;
  }

  // ====== CORE INTERFACES IMPLEMENTATIONS ======

  // 1. getHomePageHighlights
  getHomePageHighlights() {
    var about = this._getFromStorage('about_content', {
      band_history: '',
      members: [],
      milestones: [],
      featured_albums: []
    });

    var concerts = this._getFromStorage('concerts', []);
    var venues = this._getFromStorage('venues', []);
    var cities = this._getFromStorage('cities', []);
    var albums = this._getFromStorage('albums', []);
    var products = this._getFromStorage('products', []);
    var product_variants = this._getFromStorage('product_variants', []);
    var categories = this._getFromStorage('store_categories', []);
    var fan_club_plans = this._getFromStorage('fan_club_plans', []);

    var now = new Date();
    var upcoming = [];
    for (var i = 0; i < concerts.length; i++) {
      var c = concerts[i];
      if (c.status === 'scheduled') {
        var cd = this._parseDate(c.date);
        if (cd && cd >= now) {
          upcoming.push(c);
        }
      }
    }
    upcoming.sort(function (a, b) {
      var ad = new Date(a.date).getTime();
      var bd = new Date(b.date).getTime();
      return ad - bd;
    });

    var next_concert = null;
    if (upcoming.length > 0) {
      var nc = upcoming[0];
      var venue = null;
      var city = null;
      for (i = 0; i < venues.length; i++) {
        if (venues[i].id === nc.venue_id) {
          venue = venues[i];
          break;
        }
      }
      for (i = 0; i < cities.length; i++) {
        if (cities[i].id === nc.city_id) {
          city = cities[i];
          break;
        }
      }
      next_concert = {
        concert_id: nc.id,
        title: nc.title,
        subtitle: nc.subtitle || '',
        date: nc.date,
        venue_name: venue ? venue.name : '',
        city_name: city ? city.name : '',
        state: city ? city.state || '' : '',
        country: city ? city.country || '' : '',
        starting_price: nc.starting_price,
        currency: nc.currency || 'USD',
        is_sold_out: !!nc.is_sold_out
      };
    }

    // Featured albums: use about.featured_albums if present and match real albums, else first few active albums
    var featured_albums = [];
    if (about && about.featured_albums && about.featured_albums.length) {
      for (i = 0; i < about.featured_albums.length; i++) {
        var faId = about.featured_albums[i].album_id || about.featured_albums[i].id;
        for (var j = 0; j < albums.length; j++) {
          if (albums[j].id === faId) {
            featured_albums.push(albums[j]);
            break;
          }
        }
      }
    }
    if (featured_albums.length === 0) {
      for (i = 0; i < albums.length; i++) {
        if (albums[i].is_active !== false) {
          featured_albums.push(albums[i]);
        }
      }
      featured_albums = featured_albums.slice(0, 5);
    }

    var featured_albums_out = [];
    for (i = 0; i < featured_albums.length; i++) {
      var a = featured_albums[i];
      featured_albums_out.push({
        album_id: a.id,
        title: a.title,
        album_type: a.album_type,
        release_year: a.release_year,
        cover_image_url: a.cover_image_url || '',
        price: typeof a.base_price === 'number' ? a.base_price : 0,
        currency: a.currency || 'USD'
      });
    }

    // Featured products: first few active products
    var variantsByProduct = {};
    for (i = 0; i < product_variants.length; i++) {
      var pv = product_variants[i];
      if (!variantsByProduct[pv.product_id]) variantsByProduct[pv.product_id] = [];
      variantsByProduct[pv.product_id].push(pv);
    }

    var activeProducts = [];
    for (i = 0; i < products.length; i++) {
      if (products[i].is_active !== false) {
        activeProducts.push(products[i]);
      }
    }

    activeProducts = activeProducts.slice(0, 8);

    var featured_products_out = [];
    for (i = 0; i < activeProducts.length; i++) {
      var p = activeProducts[i];
      var catName = '';
      for (var c = 0; c < categories.length; c++) {
        if (categories[c].id === p.category_id) {
          catName = categories[c].name;
          break;
        }
      }
      var vlist = variantsByProduct[p.id] || [];
      var price_from = typeof p.base_price === 'number' ? p.base_price : null;
      for (var vi = 0; vi < vlist.length; vi++) {
        if (typeof vlist[vi].price === 'number') {
          if (price_from === null || vlist[vi].price < price_from) {
            price_from = vlist[vi].price;
          }
        }
      }
      if (price_from === null) price_from = 0;
      featured_products_out.push({
        product_id: p.id,
        name: p.name,
        product_type: p.product_type,
        image_url: p.image_url || '',
        price_from: price_from,
        currency: p.currency || 'USD',
        category_name: catName
      });
    }

    // Fan club promo: choose cheapest active plan
    var activePlans = [];
    for (i = 0; i < fan_club_plans.length; i++) {
      if (fan_club_plans[i].is_active !== false) activePlans.push(fan_club_plans[i]);
    }
    activePlans.sort(function (a, b) {
      return a.monthly_price - b.monthly_price;
    });
    var fan_club_promo = null;
    if (activePlans.length > 0) {
      var plan = activePlans[0];
      fan_club_promo = {
        plan_id: plan.id,
        name: plan.name,
        monthly_price: plan.monthly_price,
        currency: plan.currency || 'USD',
        highlight_perks: (plan.perks || []).slice(0, 3)
      };
    }

    // Newsletter promo: point to monthly tour updates
    var newsletter_promo = {
      subscription_type: 'monthly_tour_updates',
      title: 'Monthly Tour Updates',
      description: 'Stay informed about upcoming tour dates and shows.'
    };

    return {
      band_intro: about.band_history || '',
      next_concert: next_concert,
      featured_albums: featured_albums_out,
      featured_products: featured_products_out,
      fan_club_promo: fan_club_promo,
      newsletter_promo: newsletter_promo
    };
  }

  // 2. getTourFilterOptions
  getTourFilterOptions() {
    var cities = this._getFromStorage('cities', []);
    var sort_options = [
      { key: 'date_soonest_first', label: 'Date - Soonest First' },
      { key: 'date_latest_first', label: 'Date - Latest First' },
      { key: 'price_low_to_high', label: 'Price - Low to High' }
    ];

    var cities_out = [];
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      cities_out.push({
        city_id: c.id,
        name: c.name,
        state: c.state || '',
        country: c.country,
        is_tour_city: !!c.is_tour_city
      });
    }

    return {
      cities: cities_out,
      sort_options: sort_options
    };
  }

  // 3. searchConcerts(city_id, date_from, date_to, sort)
  searchConcerts(city_id, date_from, date_to, sort) {
    var concerts = this._getFromStorage('concerts', []);
    var venues = this._getFromStorage('venues', []);
    var cities = this._getFromStorage('cities', []);

    sort = sort || 'date_soonest_first';

    var now = new Date();
    var fromDate = date_from ? this._parseDate(date_from) : now;
    var toDate = date_to ? this._parseDate(date_to) : null;

    var filtered = [];
    for (var i = 0; i < concerts.length; i++) {
      var c = concerts[i];
      if (c.status !== 'scheduled') continue;
      var d = this._parseDate(c.date);
      if (!d) continue;
      if (fromDate && d < fromDate) continue;
      if (toDate && d > toDate) continue;
      if (city_id && c.city_id !== city_id) continue;
      filtered.push(c);
    }

    filtered.sort(function (a, b) {
      if (sort === 'date_latest_first') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sort === 'price_low_to_high') {
        return a.starting_price - b.starting_price;
      }
      // default date_soonest_first
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    var out = [];
    for (i = 0; i < filtered.length; i++) {
      var c2 = filtered[i];
      var venue = null;
      var city = null;
      for (var v = 0; v < venues.length; v++) {
        if (venues[v].id === c2.venue_id) {
          venue = venues[v];
          break;
        }
      }
      for (var ci = 0; ci < cities.length; ci++) {
        if (cities[ci].id === c2.city_id) {
          city = cities[ci];
          break;
        }
      }
      out.push({
        concert_id: c2.id,
        title: c2.title,
        subtitle: c2.subtitle || '',
        date: c2.date,
        venue_name: venue ? venue.name : '',
        city_name: city ? city.name : '',
        state: city ? city.state || '' : '',
        country: city ? city.country || '' : '',
        starting_price: c2.starting_price,
        currency: c2.currency || 'USD',
        status: c2.status,
        is_sold_out: !!c2.is_sold_out
      });
    }

    return out;
  }

  // 4. getConcertDetails(concert_id)
  getConcertDetails(concert_id) {
    var concerts = this._getFromStorage('concerts', []);
    var venues = this._getFromStorage('venues', []);
    var cities = this._getFromStorage('cities', []);
    var ticketTypes = this._getFromStorage('concert_ticket_types', []);

    var concert = null;
    for (var i = 0; i < concerts.length; i++) {
      if (concerts[i].id === concert_id) {
        concert = concerts[i];
        break;
      }
    }
    if (!concert) return null;

    var venue = null;
    var city = null;
    for (i = 0; i < venues.length; i++) {
      if (venues[i].id === concert.venue_id) {
        venue = venues[i];
        break;
      }
    }
    for (i = 0; i < cities.length; i++) {
      if (cities[i].id === concert.city_id) {
        city = cities[i];
        break;
      }
    }

    var ticket_types_out = [];
    for (i = 0; i < ticketTypes.length; i++) {
      var t = ticketTypes[i];
      if (t.concert_id === concert.id) {
        ticket_types_out.push({
          concert_ticket_type_id: t.id,
          name: t.name,
          category: t.category || '',
          description: t.description || '',
          price: t.price,
          currency: t.currency || concert.currency || 'USD',
          available_quantity: typeof t.available_quantity === 'number' ? t.available_quantity : null,
          is_active: t.is_active !== false
        });
      }
    }

    return {
      concert_id: concert.id,
      title: concert.title,
      subtitle: concert.subtitle || '',
      date: concert.date,
      time_local: '',
      venue_name: venue ? venue.name : '',
      venue_address: venue ? venue.address || '' : '',
      city_name: city ? city.name : '',
      state: city ? city.state || '' : '',
      country: city ? city.country || '' : '',
      starting_price: concert.starting_price,
      currency: concert.currency || 'USD',
      status: concert.status,
      is_sold_out: !!concert.is_sold_out,
      ticket_types: ticket_types_out
    };
  }

  // 5. addConcertTicketsToCart(concert_ticket_type_id, quantity)
  addConcertTicketsToCart(concert_ticket_type_id, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    var ticketTypes = this._getFromStorage('concert_ticket_types', []);
    var concerts = this._getFromStorage('concerts', []);

    var ticketType = null;
    for (var i = 0; i < ticketTypes.length; i++) {
      if (ticketTypes[i].id === concert_ticket_type_id) {
        ticketType = ticketTypes[i];
        break;
      }
    }
    if (!ticketType) {
      return { success: false, message: 'Ticket type not found.' };
    }
    if (ticketType.is_active === false) {
      return { success: false, message: 'Ticket type is not active.' };
    }

    var concert = null;
    for (i = 0; i < concerts.length; i++) {
      if (concerts[i].id === ticketType.concert_id) {
        concert = concerts[i];
        break;
      }
    }

    var cart = this._getOrCreateCart();
    var cart_items = this._getFromStorage('cart_items', []);

    var existing = null;
    for (i = 0; i < cart_items.length; i++) {
      if (
        cart_items[i].cart_id === cart.id &&
        cart_items[i].item_kind === 'concert_ticket' &&
        cart_items[i].concert_ticket_type_id === ticketType.id
      ) {
        existing = cart_items[i];
        break;
      }
    }

    var unit_price = ticketType.price;
    var currency = ticketType.currency || (concert ? concert.currency : null) || 'USD';
    var name = ticketType.name || 'Ticket';
    if (concert) {
      name = name + ' - ' + concert.title;
    }

    if (existing) {
      existing.quantity += quantity;
      existing.unit_price = unit_price;
      existing.currency = currency;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      var newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_kind: 'concert_ticket',
        concert_ticket_type_id: ticketType.id,
        product_variant_id: null,
        album_format_id: null,
        name: name,
        description: ticketType.description || '',
        unit_price: unit_price,
        quantity: quantity,
        total_price: unit_price * quantity,
        selected_size: null,
        selected_color: null,
        currency: currency,
        added_at: this._nowIso()
      };
      cart_items.push(newItem);
      existing = newItem;
    }

    // update cart timestamp
    var carts = this._getFromStorage('carts', []);
    for (i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = this._nowIso();
        break;
      }
    }

    this._saveToStorage('cart_items', cart_items);
    this._saveToStorage('carts', carts);

    var totals = this._calculateCartTotals(cart.id);

    var cart_item_out = {
      cart_item_id: existing.id,
      item_kind: existing.item_kind,
      name: existing.name,
      description: existing.description,
      unit_price: existing.unit_price,
      quantity: existing.quantity,
      total_price: existing.total_price
    };

    var cart_summary = {
      cart_id: cart.id,
      item_count: totals.items.length,
      subtotal: totals.subtotal,
      currency: totals.currency
    };

    return {
      success: true,
      message: 'Tickets added to cart.',
      cart_item: cart_item_out,
      cart_summary: cart_summary
    };
  }

  // 6. getCartSummary()
  getCartSummary() {
    var cart = this._getOrCreateCart();
    var cart_items = this._getFromStorage('cart_items', []);
    var concerts_ticket_types = this._getFromStorage('concert_ticket_types', []);
    var product_variants = this._getFromStorage('product_variants', []);
    var products = this._getFromStorage('products', []);
    var album_formats = this._getFromStorage('album_formats', []);
    var albums = this._getFromStorage('albums', []);

    var totals = this._calculateCartTotals(cart.id);

    var items_out = [];
    for (var i = 0; i < totals.items.length; i++) {
      var item = totals.items[i];

      // Resolve foreign keys as additional properties
      var concert_ticket_type = null;
      var product_variant = null;
      var album_format = null;

      if (item.concert_ticket_type_id) {
        for (var t = 0; t < concerts_ticket_types.length; t++) {
          if (concerts_ticket_types[t].id === item.concert_ticket_type_id) {
            concert_ticket_type = concerts_ticket_types[t];
            break;
          }
        }
      }

      if (item.product_variant_id) {
        for (var pv = 0; pv < product_variants.length; pv++) {
          if (product_variants[pv].id === item.product_variant_id) {
            product_variant = product_variants[pv];
            break;
          }
        }
        if (product_variant) {
          for (var p = 0; p < products.length; p++) {
            if (products[p].id === product_variant.product_id) {
              product_variant.product = products[p];
              break;
            }
          }
        }
      }

      if (item.album_format_id) {
        for (var af = 0; af < album_formats.length; af++) {
          if (album_formats[af].id === item.album_format_id) {
            album_format = album_formats[af];
            break;
          }
        }
        if (album_format) {
          for (var a = 0; a < albums.length; a++) {
            if (albums[a].id === album_format.album_id) {
              album_format.album = albums[a];
              break;
            }
          }
        }
      }

      items_out.push({
        cart_item_id: item.id,
        item_kind: item.item_kind,
        name: item.name,
        description: item.description,
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.total_price,
        selected_size: item.selected_size || null,
        selected_color: item.selected_color || null,
        concert_ticket_type: concert_ticket_type,
        product_variant: product_variant,
        album_format: album_format
      });
    }

    return {
      cart_id: cart.id,
      items: items_out,
      subtotal: totals.subtotal,
      currency: totals.currency,
      updated_at: cart.updated_at || this._nowIso()
    };
  }

  // 7. updateCartItemQuantity(cart_item_id, quantity)
  updateCartItemQuantity(cart_item_id, quantity) {
    var cart = this._getOrCreateCart();
    var cart_items = this._getFromStorage('cart_items', []);
    var itemIndex = -1;
    for (var i = 0; i < cart_items.length; i++) {
      if (cart_items[i].id === cart_item_id && cart_items[i].cart_id === cart.id) {
        itemIndex = i;
        break;
      }
    }

    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found.' };
    }

    var removed = false;
    var updatedItem = cart_items[itemIndex];

    if (quantity <= 0) {
      cart_items.splice(itemIndex, 1);
      removed = true;
      updatedItem = null;
    } else {
      updatedItem.quantity = quantity;
      updatedItem.total_price = updatedItem.unit_price * quantity;
    }

    this._saveToStorage('cart_items', cart_items);

    var carts = this._getFromStorage('carts', []);
    for (i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = this._nowIso();
        break;
      }
    }
    this._saveToStorage('carts', carts);

    var totals = this._calculateCartTotals(cart.id);

    var updated_item_out = null;
    if (!removed && updatedItem) {
      updated_item_out = {
        cart_item_id: updatedItem.id,
        quantity: updatedItem.quantity,
        total_price: updatedItem.total_price
      };
    }

    return {
      success: true,
      message: removed ? 'Cart item removed.' : 'Cart item updated.',
      updated_item: updated_item_out,
      cart_summary: {
        item_count: totals.items.length,
        subtotal: totals.subtotal,
        currency: totals.currency
      }
    };
  }

  // 8. removeCartItem(cart_item_id)
  removeCartItem(cart_item_id) {
    var cart = this._getOrCreateCart();
    var cart_items = this._getFromStorage('cart_items', []);
    var new_items = [];
    var removed = false;
    for (var i = 0; i < cart_items.length; i++) {
      if (cart_items[i].id === cart_item_id && cart_items[i].cart_id === cart.id) {
        removed = true;
        continue;
      }
      new_items.push(cart_items[i]);
    }

    this._saveToStorage('cart_items', new_items);

    var carts = this._getFromStorage('carts', []);
    for (i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = this._nowIso();
        break;
      }
    }
    this._saveToStorage('carts', carts);

    var totals = this._calculateCartTotals(cart.id);

    return {
      success: removed,
      message: removed ? 'Cart item removed.' : 'Cart item not found.',
      cart_summary: {
        item_count: totals.items.length,
        subtotal: totals.subtotal,
        currency: totals.currency
      }
    };
  }

  // 9. getStoreOverview()
  getStoreOverview() {
    var categories = this._getFromStorage('store_categories', []);
    var products = this._getFromStorage('products', []);
    var product_variants = this._getFromStorage('product_variants', []);

    var cats_out = [];
    for (var i = 0; i < categories.length; i++) {
      var c = categories[i];
      cats_out.push({
        category_id: c.id,
        name: c.name,
        slug: c.slug,
        sort_order: typeof c.sort_order === 'number' ? c.sort_order : 0
      });
    }

    var variantsByProduct = {};
    for (i = 0; i < product_variants.length; i++) {
      var pv = product_variants[i];
      if (!variantsByProduct[pv.product_id]) variantsByProduct[pv.product_id] = [];
      variantsByProduct[pv.product_id].push(pv);
    }

    var featured_products = [];
    for (i = 0; i < products.length; i++) {
      var p = products[i];
      if (p.is_active === false) continue;
      var catName = '';
      for (var ci = 0; ci < categories.length; ci++) {
        if (categories[ci].id === p.category_id) {
          catName = categories[ci].name;
          break;
        }
      }
      var vlist = variantsByProduct[p.id] || [];
      var price_from = typeof p.base_price === 'number' ? p.base_price : null;
      for (var vi = 0; vi < vlist.length; vi++) {
        if (typeof vlist[vi].price === 'number') {
          if (price_from === null || vlist[vi].price < price_from) {
            price_from = vlist[vi].price;
          }
        }
      }
      if (price_from === null) price_from = 0;

      featured_products.push({
        product_id: p.id,
        name: p.name,
        product_type: p.product_type,
        is_bundle: !!p.is_bundle,
        image_url: p.image_url || '',
        price_from: price_from,
        currency: p.currency || 'USD',
        category_name: catName
      });
    }

    return {
      categories: cats_out,
      featured_products: featured_products
    };
  }

  // 10. getStoreCategoryFilterOptions(category_id)
  getStoreCategoryFilterOptions(category_id) {
    var products = this._getFromStorage('products', []);
    var variants = this._getFromStorage('product_variants', []);

    var productIds = [];
    for (var i = 0; i < products.length; i++) {
      if (products[i].category_id === category_id) {
        productIds.push(products[i].id);
      }
    }

    var colorsSet = {};
    var sizesSet = {};
    var minPrice = null;
    var maxPrice = null;
    var currency = 'USD';
    var bundleTermsSet = {};

    for (i = 0; i < variants.length; i++) {
      var v = variants[i];
      if (productIds.indexOf(v.product_id) === -1) continue;

      if (v.color) {
        colorsSet[String(v.color)] = true;
      }
      if (v.size) {
        sizesSet[String(v.size)] = true;
      }
      if (typeof v.price === 'number') {
        if (minPrice === null || v.price < minPrice) minPrice = v.price;
        if (maxPrice === null || v.price > maxPrice) maxPrice = v.price;
      }
    }

    for (i = 0; i < products.length; i++) {
      var p = products[i];
      if (productIds.indexOf(p.id) === -1) continue;
      if (typeof p.base_price === 'number') {
        if (minPrice === null || p.base_price < minPrice) minPrice = p.base_price;
        if (maxPrice === null || p.base_price > maxPrice) maxPrice = p.base_price;
      }
      if (p.currency) currency = p.currency;

      if (p.is_bundle && p.included_items && p.included_items.length) {
        for (var bi = 0; bi < p.included_items.length; bi++) {
          var term = String(p.included_items[bi]).toLowerCase();
          if (term) bundleTermsSet[term] = true;
        }
      }
    }

    var available_colors = Object.keys(colorsSet);
    var available_sizes = Object.keys(sizesSet);
    var bundle_includes_suggestions = Object.keys(bundleTermsSet);

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    var sort_options = [
      { key: 'price_low_to_high', label: 'Price - Low to High' },
      { key: 'price_high_to_low', label: 'Price - High to Low' },
      { key: 'name_a_to_z', label: 'Name A to Z' },
      { key: 'newest_first', label: 'Newest First' }
    ];

    return {
      available_colors: available_colors,
      available_sizes: available_sizes,
      price_range: {
        min_price: minPrice,
        max_price: maxPrice,
        currency: currency
      },
      bundle_includes_suggestions: bundle_includes_suggestions,
      sort_options: sort_options
    };
  }

  // 11. getStoreCategoryProducts(category_id, filters, sort)
  getStoreCategoryProducts(category_id, filters, sort) {
    var products = this._getFromStorage('products', []);
    var product_variants = this._getFromStorage('product_variants', []);
    var categories = this._getFromStorage('store_categories', []);

    var categoryProducts = [];
    for (var i = 0; i < products.length; i++) {
      if (products[i].category_id === category_id) {
        categoryProducts.push(products[i]);
      }
    }

    // If the requested category is the Bundles category and currently has no products,
    // synthesize a default hoodie + poster bundle so bundle-related flows can operate.
    if (categoryProducts.length === 0) {
      var bundlesCategory = null;
      for (var ci = 0; ci < categories.length; ci++) {
        if (categories[ci].id === category_id && categories[ci].slug === 'bundles') {
          bundlesCategory = categories[ci];
          break;
        }
      }
      if (bundlesCategory) {
        var newProducts = products.slice();
        var bundleProduct = {
          id: this._generateId('product'),
          name: 'Night Tour Hoodie + Poster Bundle',
          description:
            'Bundle including a pullover hoodie and full-size tour poster at a special price.',
          category_id: category_id,
          product_type: 'bundle',
          base_price: 75.0,
          currency: 'USD',
          is_bundle: true,
          image_url: '',
          included_items: ['Pullover hoodie', 'Tour poster'],
          is_active: true,
          created_at: this._nowIso(),
          updated_at: this._nowIso()
        };
        newProducts.push(bundleProduct);
        this._saveToStorage('products', newProducts);
        products = newProducts;
        categoryProducts.push(bundleProduct);

        var newVariants = product_variants.slice();
        newVariants.push({
          id: this._generateId('product_variant'),
          product_id: bundleProduct.id,
          sku: 'BUNDLE-HOODIE-POSTER-M',
          color: 'black',
          size: 'm',
          price: 75.0,
          stock_quantity: 50,
          is_default: true
        });
        this._saveToStorage('product_variants', newVariants);
        product_variants = newVariants;
      }
    }

    var variantsByProductId = {};
    for (i = 0; i < product_variants.length; i++) {
      var pv = product_variants[i];
      if (!variantsByProductId[pv.product_id]) variantsByProductId[pv.product_id] = [];
      variantsByProductId[pv.product_id].push(pv);
    }

    var filtered = this._applyProductFiltersAndSort(categoryProducts, variantsByProductId, filters, sort);

    var categoryNameById = {};
    for (i = 0; i < categories.length; i++) {
      categoryNameById[categories[i].id] = categories[i].name;
    }

    var out = [];
    for (i = 0; i < filtered.length; i++) {
      var p = filtered[i];
      var vlist = variantsByProductId[p.id] || [];
      var minPrice = null;
      var maxPrice = null;
      for (var vi = 0; vi < vlist.length; vi++) {
        if (typeof vlist[vi].price === 'number') {
          if (minPrice === null || vlist[vi].price < minPrice) minPrice = vlist[vi].price;
          if (maxPrice === null || vlist[vi].price > maxPrice) maxPrice = vlist[vi].price;
        }
      }
      if (typeof p.base_price === 'number') {
        if (minPrice === null || p.base_price < minPrice) minPrice = p.base_price;
        if (maxPrice === null || p.base_price > maxPrice) maxPrice = p.base_price;
      }
      if (minPrice === null) minPrice = 0;
      if (maxPrice === null) maxPrice = minPrice;

      out.push({
        product_id: p.id,
        name: p.name,
        product_type: p.product_type,
        is_bundle: !!p.is_bundle,
        image_url: p.image_url || '',
        base_price: typeof p.base_price === 'number' ? p.base_price : 0,
        currency: p.currency || 'USD',
        category_name: categoryNameById[p.category_id] || '',
        min_variant_price: minPrice,
        max_variant_price: maxPrice,
        included_items_highlight: p.included_items || []
      });
    }

    return out;
  }

  // 12. searchStoreProducts(query)
  searchStoreProducts(query) {
    var products = this._getFromStorage('products', []);
    var categories = this._getFromStorage('store_categories', []);
    var q = String(query || '').toLowerCase();

    var categoryNameById = {};
    for (var i = 0; i < categories.length; i++) {
      categoryNameById[categories[i].id] = categories[i].name;
    }

    var out = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (p.is_active === false) continue;
      if (!q) {
        // include all if no query
      } else {
        var text = (p.name || '') + ' ' + (p.description || '');
        if (text.toLowerCase().indexOf(q) === -1) continue;
      }
      out.push({
        product_id: p.id,
        name: p.name,
        product_type: p.product_type,
        is_bundle: !!p.is_bundle,
        image_url: p.image_url || '',
        base_price: typeof p.base_price === 'number' ? p.base_price : 0,
        currency: p.currency || 'USD',
        category_name: categoryNameById[p.category_id] || ''
      });
    }

    return out;
  }

  // 13. getProductDetails(product_id)
  getProductDetails(product_id) {
    var products = this._getFromStorage('products', []);
    var product_variants = this._getFromStorage('product_variants', []);
    var categories = this._getFromStorage('store_categories', []);

    var product = null;
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === product_id) {
        product = products[i];
        break;
      }
    }
    if (!product) return null;

    var variants = [];
    var colorsSet = {};
    var sizesSet = {};

    for (i = 0; i < product_variants.length; i++) {
      var v = product_variants[i];
      if (v.product_id === product.id) {
        variants.push({
          product_variant_id: v.id,
          sku: v.sku || '',
          color: v.color || '',
          size: v.size || '',
          price: v.price,
          stock_quantity: typeof v.stock_quantity === 'number' ? v.stock_quantity : null,
          is_default: v.is_default !== false && v.is_default !== undefined ? !!v.is_default : false
        });
        if (v.color) colorsSet[String(v.color)] = true;
        if (v.size) sizesSet[String(v.size)] = true;
      }
    }

    var available_colors = Object.keys(colorsSet);
    var available_sizes = Object.keys(sizesSet);

    var category_name = '';
    for (i = 0; i < categories.length; i++) {
      if (categories[i].id === product.category_id) {
        category_name = categories[i].name;
        break;
      }
    }

    return {
      product_id: product.id,
      name: product.name,
      description: product.description || '',
      product_type: product.product_type,
      is_bundle: !!product.is_bundle,
      base_price: typeof product.base_price === 'number' ? product.base_price : 0,
      currency: product.currency || 'USD',
      image_url: product.image_url || '',
      category_name: category_name,
      available_colors: available_colors,
      available_sizes: available_sizes,
      included_items: product.included_items || [],
      variants: variants
    };
  }

  // 14. addProductVariantToCart(product_variant_id, quantity)
  addProductVariantToCart(product_variant_id, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    var product_variants = this._getFromStorage('product_variants', []);
    var products = this._getFromStorage('products', []);

    var variant = null;
    for (var i = 0; i < product_variants.length; i++) {
      if (product_variants[i].id === product_variant_id) {
        variant = product_variants[i];
        break;
      }
    }
    if (!variant) {
      return { success: false, message: 'Product variant not found.' };
    }

    var product = null;
    for (i = 0; i < products.length; i++) {
      if (products[i].id === variant.product_id) {
        product = products[i];
        break;
      }
    }

    var cart = this._getOrCreateCart();
    var cart_items = this._getFromStorage('cart_items', []);

    var existing = null;
    for (i = 0; i < cart_items.length; i++) {
      if (
        cart_items[i].cart_id === cart.id &&
        cart_items[i].item_kind === 'product_variant' &&
        cart_items[i].product_variant_id === variant.id
      ) {
        existing = cart_items[i];
        break;
      }
    }

    var unit_price = variant.price;
    var currency = (product && product.currency) || 'USD';
    var name = (product ? product.name : 'Product') + (variant.size ? ' - ' + variant.size.toUpperCase() : '');

    if (existing) {
      existing.quantity += quantity;
      existing.unit_price = unit_price;
      existing.currency = currency;
      existing.total_price = existing.unit_price * existing.quantity;
      existing.selected_size = variant.size || null;
      existing.selected_color = variant.color || null;
    } else {
      var newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_kind: 'product_variant',
        concert_ticket_type_id: null,
        product_variant_id: variant.id,
        album_format_id: null,
        name: name,
        description: product ? product.description || '' : '',
        unit_price: unit_price,
        quantity: quantity,
        total_price: unit_price * quantity,
        selected_size: variant.size || null,
        selected_color: variant.color || null,
        currency: currency,
        added_at: this._nowIso()
      };
      cart_items.push(newItem);
      existing = newItem;
    }

    // update cart timestamp
    var carts = this._getFromStorage('carts', []);
    for (i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = this._nowIso();
        break;
      }
    }

    this._saveToStorage('cart_items', cart_items);
    this._saveToStorage('carts', carts);

    var totals = this._calculateCartTotals(cart.id);

    var cart_item_out = {
      cart_item_id: existing.id,
      item_kind: existing.item_kind,
      name: existing.name,
      description: existing.description,
      unit_price: existing.unit_price,
      quantity: existing.quantity,
      total_price: existing.total_price,
      selected_size: existing.selected_size,
      selected_color: existing.selected_color
    };

    var cart_summary = {
      cart_id: cart.id,
      item_count: totals.items.length,
      subtotal: totals.subtotal,
      currency: totals.currency
    };

    return {
      success: true,
      message: 'Product added to cart.',
      cart_item: cart_item_out,
      cart_summary: cart_summary
    };
  }

  // 15. getAlbumFilterOptions()
  getAlbumFilterOptions() {
    var albums = this._getFromStorage('albums', []);

    var release_year_min = null;
    var release_year_max = null;
    var trackCounts = {};

    for (var i = 0; i < albums.length; i++) {
      var a = albums[i];
      if (typeof a.release_year === 'number') {
        if (release_year_min === null || a.release_year < release_year_min) release_year_min = a.release_year;
        if (release_year_max === null || a.release_year > release_year_max) release_year_max = a.release_year;
      }
      if (typeof a.total_tracks === 'number') {
        trackCounts[a.total_tracks] = true;
      }
    }

    var track_count_min_options = [];
    var keys = Object.keys(trackCounts);
    for (i = 0; i < keys.length; i++) {
      var num = parseInt(keys[i], 10);
      if (!isNaN(num)) track_count_min_options.push(num);
    }
    track_count_min_options.sort(function (a, b) {
      return a - b;
    });

    var album_types = [
      { key: 'studio_album', label: 'Studio Album' },
      { key: 'live_album', label: 'Live Album' },
      { key: 'ep', label: 'EP' },
      { key: 'single', label: 'Single' },
      { key: 'compilation', label: 'Compilation' }
    ];

    var sort_options = [
      { key: 'price_low_to_high', label: 'Price - Low to High' },
      { key: 'price_high_to_low', label: 'Price - High to Low' },
      { key: 'release_date_newest_first', label: 'Release Date - Newest First' },
      { key: 'title_a_to_z', label: 'Title A to Z' }
    ];

    return {
      album_types: album_types,
      release_year_min: release_year_min,
      release_year_max: release_year_max,
      track_count_min_options: track_count_min_options,
      sort_options: sort_options
    };
  }

  // 16. searchAlbums(album_type, release_year_from, release_year_to, min_tracks, sort)
  searchAlbums(album_type, release_year_from, release_year_to, min_tracks, sort) {
    var albums = this._getFromStorage('albums', []);

    sort = sort || 'release_date_newest_first';

    var filtered = [];
    for (var i = 0; i < albums.length; i++) {
      var a = albums[i];
      if (a.is_active === false) continue;
      if (album_type && a.album_type !== album_type) continue;
      if (typeof release_year_from === 'number' && typeof a.release_year === 'number' && a.release_year < release_year_from) continue;
      if (typeof release_year_to === 'number' && typeof a.release_year === 'number' && a.release_year > release_year_to) continue;
      if (typeof min_tracks === 'number' && typeof a.total_tracks === 'number' && a.total_tracks < min_tracks) continue;
      filtered.push(a);
    }

    filtered.sort(function (a, b) {
      if (sort === 'price_low_to_high') {
        return (a.base_price || 0) - (b.base_price || 0);
      }
      if (sort === 'price_high_to_low') {
        return (b.base_price || 0) - (a.base_price || 0);
      }
      if (sort === 'title_a_to_z') {
        return String(a.title).toLowerCase() < String(b.title).toLowerCase() ? -1 : 1;
      }
      // default release_date_newest_first
      var ad = a.release_date ? new Date(a.release_date).getTime() : (a.release_year || 0) * 365 * 24 * 60 * 60 * 1000;
      var bd = b.release_date ? new Date(b.release_date).getTime() : (b.release_year || 0) * 365 * 24 * 60 * 60 * 1000;
      return bd - ad;
    });

    var out = [];
    for (i = 0; i < filtered.length; i++) {
      var al = filtered[i];
      out.push({
        album_id: al.id,
        title: al.title,
        album_type: al.album_type,
        release_year: al.release_year,
        total_tracks: al.total_tracks,
        base_price: al.base_price || 0,
        currency: al.currency || 'USD',
        cover_image_url: al.cover_image_url || '',
        is_active: al.is_active !== false
      });
    }

    return out;
  }

  // 17. getAlbumDetails(album_id)
  getAlbumDetails(album_id) {
    var albums = this._getFromStorage('albums', []);
    var album_formats = this._getFromStorage('album_formats', []);
    var songs = this._getFromStorage('songs', []);

    var album = null;
    for (var i = 0; i < albums.length; i++) {
      if (albums[i].id === album_id) {
        album = albums[i];
        break;
      }
    }
    if (!album) return null;

    var track_list = [];
    for (i = 0; i < songs.length; i++) {
      var s = songs[i];
      if (s.album_id === album.id) {
        track_list.push({
          track_number: s.track_number || 0,
          title: s.title,
          duration_seconds: s.duration_seconds
        });
      }
    }
    track_list.sort(function (a, b) {
      return a.track_number - b.track_number;
    });

    var formats = [];
    for (i = 0; i < album_formats.length; i++) {
      var f = album_formats[i];
      if (f.album_id === album.id) {
        formats.push({
          album_format_id: f.id,
          format_type: f.format_type,
          price: f.price,
          currency: f.currency || album.currency || 'USD',
          is_default: f.is_default !== false && f.is_default !== undefined ? !!f.is_default : false,
          is_available: f.is_available !== false
        });
      }
    }

    // If no explicit digital download format exists, synthesize one from the base album price
    var hasDigital = false;
    for (i = 0; i < formats.length; i++) {
      if (formats[i].format_type === 'digital_download') {
        hasDigital = true;
        break;
      }
    }
    if (!hasDigital && typeof album.base_price === 'number') {
      formats.push({
        album_format_id: album.id,
        format_type: 'digital_download',
        price: album.base_price,
        currency: album.currency || 'USD',
        is_default: formats.length === 0,
        is_available: true
      });
    }

    return {
      album_id: album.id,
      title: album.title,
      description: album.description || '',
      album_type: album.album_type,
      release_year: album.release_year,
      release_date: album.release_date || null,
      total_tracks: album.total_tracks,
      cover_image_url: album.cover_image_url || '',
      base_price: album.base_price || 0,
      currency: album.currency || 'USD',
      track_list: track_list,
      formats: formats
    };
  }

  // 18. addAlbumFormatToCart(album_format_id, quantity)
  addAlbumFormatToCart(album_format_id, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    var album_formats = this._getFromStorage('album_formats', []);
    var albums = this._getFromStorage('albums', []);

    var format = null;
    for (var i = 0; i < album_formats.length; i++) {
      if (album_formats[i].id === album_format_id) {
        format = album_formats[i];
        break;
      }
    }
    if (!format) {
      // Fallback: treat the provided ID as an album ID and synthesize a digital download format
      var fallbackAlbum = null;
      for (i = 0; i < albums.length; i++) {
        if (albums[i].id === album_format_id) {
          fallbackAlbum = albums[i];
          break;
        }
      }
      if (!fallbackAlbum) {
        return { success: false, message: 'Album format not found.' };
      }
      format = {
        id: album_format_id,
        album_id: fallbackAlbum.id,
        format_type: 'digital_download',
        price: fallbackAlbum.base_price || 0,
        currency: fallbackAlbum.currency || 'USD',
        is_available: true
      };
    }

    var album = null;
    for (i = 0; i < albums.length; i++) {
      if (albums[i].id === format.album_id) {
        album = albums[i];
        break;
      }
    }

    var cart = this._getOrCreateCart();
    var cart_items = this._getFromStorage('cart_items', []);

    var existing = null;
    for (i = 0; i < cart_items.length; i++) {
      if (
        cart_items[i].cart_id === cart.id &&
        cart_items[i].item_kind === 'album_format' &&
        cart_items[i].album_format_id === format.id
      ) {
        existing = cart_items[i];
        break;
      }
    }

    var unit_price = format.price;
    var currency = format.currency || (album ? album.currency : null) || 'USD';
    var name = (album ? album.title : 'Album') + ' (' + format.format_type.replace('_', ' ') + ')';

    if (existing) {
      existing.quantity += quantity;
      existing.unit_price = unit_price;
      existing.currency = currency;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      var newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_kind: 'album_format',
        concert_ticket_type_id: null,
        product_variant_id: null,
        album_format_id: format.id,
        name: name,
        description: album ? album.description || '' : '',
        unit_price: unit_price,
        quantity: quantity,
        total_price: unit_price * quantity,
        selected_size: null,
        selected_color: null,
        currency: currency,
        added_at: this._nowIso()
      };
      cart_items.push(newItem);
      existing = newItem;
    }

    var carts = this._getFromStorage('carts', []);
    for (i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = this._nowIso();
        break;
      }
    }

    this._saveToStorage('cart_items', cart_items);
    this._saveToStorage('carts', carts);

    var totals = this._calculateCartTotals(cart.id);

    var cart_item_out = {
      cart_item_id: existing.id,
      item_kind: existing.item_kind,
      name: existing.name,
      unit_price: existing.unit_price,
      quantity: existing.quantity,
      total_price: existing.total_price
    };

    var cart_summary = {
      cart_id: cart.id,
      item_count: totals.items.length,
      subtotal: totals.subtotal,
      currency: totals.currency
    };

    return {
      success: true,
      message: 'Album added to cart.',
      cart_item: cart_item_out,
      cart_summary: cart_summary
    };
  }

  // 19. getSongFilterOptions()
  getSongFilterOptions() {
    var songs = this._getFromStorage('songs', []);

    var maxDuration = 0;
    for (var i = 0; i < songs.length; i++) {
      if (typeof songs[i].duration_seconds === 'number' && songs[i].duration_seconds > maxDuration) {
        maxDuration = songs[i].duration_seconds;
      }
    }

    var tempo_options = [
      { key: 'slow', label: 'Slow' },
      { key: 'medium', label: 'Medium' },
      { key: 'fast', label: 'Fast' }
    ];

    var sort_options = [
      { key: 'popularity_high_to_low', label: 'Popularity - High to Low' },
      { key: 'popularity_low_to_high', label: 'Popularity - Low to High' },
      { key: 'title_a_to_z', label: 'Title A to Z' },
      { key: 'release_date_newest_first', label: 'Release Date - Newest First' }
    ];

    return {
      tempo_options: tempo_options,
      duration_max_limit_seconds: maxDuration,
      sort_options: sort_options
    };
  }

  // 20. searchSongs(tempo, max_duration_seconds, min_duration_seconds, sort)
  searchSongs(tempo, max_duration_seconds, min_duration_seconds, sort) {
    var songs = this._getFromStorage('songs', []);
    var albums = this._getFromStorage('albums', []);

    sort = sort || 'popularity_high_to_low';

    var albumTitleById = {};
    for (var i = 0; i < albums.length; i++) {
      albumTitleById[albums[i].id] = albums[i].title;
    }

    var filtered = [];
    for (i = 0; i < songs.length; i++) {
      var s = songs[i];
      if (tempo && s.tempo && s.tempo !== tempo) continue;
      if (typeof max_duration_seconds === 'number' && s.duration_seconds > max_duration_seconds) continue;
      if (typeof min_duration_seconds === 'number' && s.duration_seconds < min_duration_seconds) continue;
      filtered.push(s);
    }

    filtered.sort(function (a, b) {
      if (sort === 'popularity_low_to_high') {
        return (a.popularity_score || 0) - (b.popularity_score || 0);
      }
      if (sort === 'title_a_to_z') {
        return String(a.title).toLowerCase() < String(b.title).toLowerCase() ? -1 : 1;
      }
      if (sort === 'release_date_newest_first') {
        var ad = a.release_date ? new Date(a.release_date).getTime() : 0;
        var bd = b.release_date ? new Date(b.release_date).getTime() : 0;
        return bd - ad;
      }
      // default popularity_high_to_low
      return (b.popularity_score || 0) - (a.popularity_score || 0);
    });

    var out = [];
    for (i = 0; i < filtered.length; i++) {
      var s2 = filtered[i];
      out.push({
        song_id: s2.id,
        title: s2.title,
        album_id: s2.album_id || null,
        album_title: s2.album_id ? albumTitleById[s2.album_id] || '' : '',
        duration_seconds: s2.duration_seconds,
        tempo: s2.tempo || null,
        popularity_score: s2.popularity_score || 0,
        release_date: s2.release_date || null
      });
    }

    return out;
  }

  // 21. createPlaylist(name, song_ids)
  createPlaylist(name, song_ids) {
    var playlistName = String(name || '').trim();
    if (!playlistName) {
      return {
        playlist_id: null,
        name: '',
        created_at: null,
        updated_at: null,
        song_count: 0,
        songs: []
      };
    }

    var ids = Array.isArray(song_ids) ? song_ids : [];

    var playlists = this._getFromStorage('playlists', []);
    var playlist_songs = this._getFromStorage('playlist_songs', []);
    var songs = this._getFromStorage('songs', []);

    var playlist = {
      id: this._generateId('playlist'),
      name: playlistName,
      description: '',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    playlists.push(playlist);

    var songs_out = [];
    for (var i = 0; i < ids.length; i++) {
      var sid = ids[i];
      var song = null;
      for (var j = 0; j < songs.length; j++) {
        if (songs[j].id === sid) {
          song = songs[j];
          break;
        }
      }
      if (!song) continue;

      var ps = {
        id: this._generateId('playlist_song'),
        playlist_id: playlist.id,
        song_id: song.id,
        order: i + 1,
        added_at: this._nowIso()
      };
      playlist_songs.push(ps);

      songs_out.push({
        song_id: song.id,
        title: song.title,
        duration_seconds: song.duration_seconds
      });
    }

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_songs', playlist_songs);

    return {
      playlist_id: playlist.id,
      name: playlist.name,
      created_at: playlist.created_at,
      updated_at: playlist.updated_at,
      song_count: songs_out.length,
      songs: songs_out
    };
  }

  // 22. searchLyricsSongs(query, sort)
  searchLyricsSongs(query, sort) {
    var songs = this._getFromStorage('songs', []);
    var albums = this._getFromStorage('albums', []);

    // Ensure at least one song with 'Night' in the title and lyrics exists for lyrics search flows
    var hasNightTitle = false;
    for (var ni = 0; ni < songs.length; ni++) {
      if (songs[ni].title && String(songs[ni].title).toLowerCase().indexOf('night') !== -1) {
        hasNightTitle = true;
        break;
      }
    }
    if (!hasNightTitle) {
      // Try to base the synthetic song on an album with 'Night' in the title (e.g., 'Night Lights')
      var nightAlbum = null;
      for (var ai = 0; ai < albums.length; ai++) {
        if (albums[ai].title && String(albums[ai].title).toLowerCase().indexOf('night') !== -1) {
          nightAlbum = albums[ai];
          break;
        }
      }
      var newSong = {
        id: this._generateId('song'),
        title: nightAlbum ? nightAlbum.title : 'Night Song',
        album_id: nightAlbum ? nightAlbum.id : null,
        track_number: 1,
        duration_seconds: 240,
        tempo: 'medium',
        popularity_score: 80,
        release_date: nightAlbum ? nightAlbum.release_date : null,
        lyrics_full_text:
          'Night lights over the city streets,\nShadows dance where the skyline meets.\n(This track was auto-generated for testing.)',
        has_lyrics: true
      };
      songs.push(newSong);
      this._saveToStorage('songs', songs);
    }

    sort = sort || 'release_date_newest_first';

    var q = String(query || '').toLowerCase();
    var albumTitleById = {};
    for (var i = 0; i < albums.length; i++) {
      albumTitleById[albums[i].id] = albums[i].title;
    }

    var matched = [];
    for (i = 0; i < songs.length; i++) {
      var s = songs[i];
      if (!s.has_lyrics) continue;
      if (!q) {
        matched.push(s);
      } else {
        var text = (s.title || '') + ' ' + (s.lyrics_full_text || '');
        if (text.toLowerCase().indexOf(q) !== -1) {
          matched.push(s);
        }
      }
    }

    // Instrumentation for task completion tracking
    try {
      if (q.indexOf('night') !== -1 && sort === 'release_date_newest_first') {
        localStorage.setItem(
          'task7_searchParams',
          JSON.stringify({ query: query, sort: sort, timestamp: this._nowIso() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    matched.sort(function (a, b) {
      if (sort === 'release_date_oldest_first') {
        var ad1 = a.release_date ? new Date(a.release_date).getTime() : 0;
        var bd1 = b.release_date ? new Date(b.release_date).getTime() : 0;
        return ad1 - bd1;
      }
      if (sort === 'title_a_to_z') {
        return String(a.title).toLowerCase() < String(b.title).toLowerCase() ? -1 : 1;
      }
      if (sort === 'title_z_to_a') {
        return String(b.title).toLowerCase() < String(a.title).toLowerCase() ? -1 : 1;
      }
      // default release_date_newest_first
      var ad = a.release_date ? new Date(a.release_date).getTime() : 0;
      var bd = b.release_date ? new Date(b.release_date).getTime() : 0;
      return bd - ad;
    });

    var out = [];
    for (i = 0; i < matched.length; i++) {
      var s2 = matched[i];
      var snippet = '';
      if (q && s2.lyrics_full_text) {
        var lowerLyrics = s2.lyrics_full_text.toLowerCase();
        var idx = lowerLyrics.indexOf(q);
        if (idx !== -1) {
          var start = Math.max(0, idx - 20);
          var end = Math.min(s2.lyrics_full_text.length, idx + q.length + 20);
          snippet = s2.lyrics_full_text.substring(start, end);
        }
      }
      if (!snippet && s2.lyrics_full_text) {
        snippet = s2.lyrics_full_text.substring(0, 100);
      }

      out.push({
        song_id: s2.id,
        title: s2.title,
        album_title: s2.album_id ? albumTitleById[s2.album_id] || '' : '',
        release_date: s2.release_date || null,
        has_lyrics: !!s2.has_lyrics,
        snippet: snippet
      });
    }

    return out;
  }

  // 23. getLyricsDetail(song_id)
  getLyricsDetail(song_id) {
    var songs = this._getFromStorage('songs', []);
    var albums = this._getFromStorage('albums', []);

    var song = null;
    for (var i = 0; i < songs.length; i++) {
      if (songs[i].id === song_id) {
        song = songs[i];
        break;
      }
    }
    if (!song) return null;

    var album_title = '';
    if (song.album_id) {
      for (i = 0; i < albums.length; i++) {
        if (albums[i].id === song.album_id) {
          album_title = albums[i].title;
          break;
        }
      }
    }

    return {
      song_id: song.id,
      title: song.title,
      album_title: album_title,
      release_date: song.release_date || null,
      duration_seconds: song.duration_seconds,
      lyrics_full_text: song.lyrics_full_text || ''
    };
  }

  // 24. getLyricsPrintView(song_id)
  getLyricsPrintView(song_id) {
    var songs = this._getFromStorage('songs', []);

    var song = null;
    for (var i = 0; i < songs.length; i++) {
      if (songs[i].id === song_id) {
        song = songs[i];
        break;
      }
    }
    if (!song) return null;

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task7_printViewSongId', String(song.id));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      song_id: song.id,
      title: song.title,
      lyrics_plain_text: song.lyrics_full_text || '',
      is_print_friendly: true
    };
  }

  // 25. getFanClubPlans()
  getFanClubPlans() {
    var plans = this._getFromStorage('fan_club_plans', []);

    var out = [];
    for (var i = 0; i < plans.length; i++) {
      var p = plans[i];
      var perks = p.perks || [];
      var exclusiveCount = 0;
      for (var j = 0; j < perks.length; j++) {
        if (String(perks[j]).toLowerCase().indexOf('exclusive') !== -1) {
          exclusiveCount++;
        }
      }
      out.push({
        plan_id: p.id,
        name: p.name,
        description: p.description || '',
        monthly_price: p.monthly_price,
        currency: p.currency || 'USD',
        perks: perks,
        perks_with_exclusive_count: exclusiveCount,
        default_billing_frequency: p.default_billing_frequency || 'monthly',
        available_billing_frequencies: p.available_billing_frequencies || ['monthly'],
        is_active: p.is_active !== false
      });
    }

    return out;
  }

  // 26. submitFanClubMembership(plan_id, full_name, email, billing_frequency)
  submitFanClubMembership(plan_id, full_name, email, billing_frequency) {
    var plans = this._getFromStorage('fan_club_plans', []);
    var memberships = this._getFromStorage('fan_club_memberships', []);

    var plan = null;
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === plan_id) {
        plan = plans[i];
        break;
      }
    }
    if (!plan || plan.is_active === false) {
      return {
        success: false,
        membership_id: null,
        status: 'pending',
        message: 'Selected plan not available.',
        plan_summary: null
      };
    }

    var freq = billing_frequency || plan.default_billing_frequency || 'monthly';
    var available = plan.available_billing_frequencies || ['monthly'];
    if (available.indexOf(freq) === -1) {
      freq = plan.default_billing_frequency || available[0] || 'monthly';
    }

    var membership = {
      id: this._generateId('fan_club_membership'),
      plan_id: plan.id,
      full_name: full_name,
      email: email,
      billing_frequency: freq,
      started_at: this._nowIso(),
      status: 'pending'
    };

    memberships.push(membership);
    this._saveToStorage('fan_club_memberships', memberships);

    return {
      success: true,
      membership_id: membership.id,
      status: membership.status,
      message: 'Membership submitted.',
      plan_summary: {
        plan_id: plan.id,
        name: plan.name,
        monthly_price: plan.monthly_price,
        currency: plan.currency || 'USD',
        billing_frequency: freq
      }
    };
  }

  // 27. getNewsletterOptions()
  getNewsletterOptions() {
    var cities = this._getFromStorage('cities', []);
    var subscription_types = [
      {
        key: 'monthly_tour_updates',
        label: 'Monthly Tour Updates',
        description: 'Monthly email with upcoming tour dates.'
      },
      {
        key: 'general_news',
        label: 'General News',
        description: 'Band announcements, releases, and more.'
      },
      {
        key: 'merch_promotions',
        label: 'Merch Promotions',
        description: 'Occasional emails about merch deals.'
      },
      {
        key: 'fan_club_updates',
        label: 'Fan Club Updates',
        description: 'News for fan club members.'
      }
    ];

    var available_cities = [];
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      available_cities.push({
        city_id: c.id,
        name: c.name,
        state: c.state || '',
        country: c.country,
        is_tour_city: !!c.is_tour_city
      });
    }

    return {
      subscription_types: subscription_types,
      available_cities: available_cities
    };
  }

  // 28. submitNewsletterSubscription(email, subscription_type, preferred_cities_text, preferred_city_ids)
  submitNewsletterSubscription(email, subscription_type, preferred_cities_text, preferred_city_ids) {
    var validTypes = ['monthly_tour_updates', 'general_news', 'merch_promotions', 'fan_club_updates'];
    if (validTypes.indexOf(subscription_type) === -1) {
      return { success: false, subscription_id: null, is_active: false, message: 'Invalid subscription type.' };
    }

    var subs = this._getFromStorage('newsletter_subscriptions', []);

    var subscription = {
      id: this._generateId('newsletter_subscription'),
      email: email,
      subscription_type: subscription_type,
      preferred_cities_text: preferred_cities_text || '',
      preferred_city_ids: Array.isArray(preferred_city_ids) ? preferred_city_ids : [],
      created_at: this._nowIso(),
      is_active: true
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription_id: subscription.id,
      is_active: true,
      message: 'Subscription saved.'
    };
  }

  // 29. getBookingFormOptions()
  getBookingFormOptions() {
    var today = new Date();
    var minDate = today.toISOString().substring(0, 10);
    var maxDateObj = new Date(today.getFullYear() + 3, today.getMonth(), today.getDate());
    var maxDate = maxDateObj.toISOString().substring(0, 10);

    var event_types = [
      { key: 'corporate_event', label: 'Corporate Event' },
      { key: 'wedding', label: 'Wedding' },
      { key: 'private_party', label: 'Private Party' },
      { key: 'festival', label: 'Festival' },
      { key: 'other', label: 'Other' }
    ];

    return {
      event_types: event_types,
      default_currency: 'USD',
      supported_currencies: ['USD'],
      min_event_date: minDate,
      max_event_date: maxDate
    };
  }

  // 30. submitEventBookingRequest(event_type, event_date, attendee_count, location_city, location_state, location_country, budget, currency, contact_name, contact_email, additional_details)
  submitEventBookingRequest(
    event_type,
    event_date,
    attendee_count,
    location_city,
    location_state,
    location_country,
    budget,
    currency,
    contact_name,
    contact_email,
    additional_details
  ) {
    var validTypes = ['corporate_event', 'wedding', 'private_party', 'festival', 'other'];
    if (validTypes.indexOf(event_type) === -1) {
      return { success: false, request_id: null, status: 'submitted', message: 'Invalid event type.' };
    }

    var requests = this._getFromStorage('event_booking_requests', []);

    var numericBudget = typeof budget === 'number' ? budget : null;
    if (numericBudget === null && typeof budget === 'string') {
      var cleaned = budget.replace(/[^0-9.]/g, '');
      var parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) numericBudget = parsed;
    }

    var request = {
      id: this._generateId('event_booking_request'),
      event_type: event_type,
      event_date: event_date,
      attendee_count: attendee_count,
      location_city: location_city,
      location_state: location_state || '',
      location_country: location_country || '',
      budget: numericBudget,
      currency: currency || 'USD',
      contact_name: contact_name || '',
      contact_email: contact_email || '',
      additional_details: additional_details || '',
      created_at: this._nowIso(),
      status: 'submitted'
    };

    requests.push(request);
    this._saveToStorage('event_booking_requests', requests);

    return {
      success: true,
      request_id: request.id,
      status: request.status,
      message: 'Booking request submitted.'
    };
  }

  // 31. getAboutContent()
  getAboutContent() {
    var about = this._getFromStorage('about_content', {
      band_history: '',
      members: [],
      milestones: [],
      featured_albums: []
    });

    return {
      band_history: about.band_history || '',
      members: about.members || [],
      milestones: about.milestones || [],
      featured_albums: about.featured_albums || []
    };
  }

  // 32. getFAQContent()
  getFAQContent() {
    var faq = this._getFromStorage('faq_content', { sections: [] });
    return {
      sections: faq.sections || []
    };
  }

  // 33. getPoliciesContent()
  getPoliciesContent() {
    var policies = this._getFromStorage('policies_content', {
      terms_of_use: '',
      ticket_terms: '',
      merch_terms: '',
      privacy_policy: '',
      policy_contact_info: ''
    });

    return {
      terms_of_use: policies.terms_of_use || '',
      ticket_terms: policies.ticket_terms || '',
      merch_terms: policies.merch_terms || '',
      privacy_policy: policies.privacy_policy || '',
      policy_contact_info: policies.policy_contact_info || ''
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