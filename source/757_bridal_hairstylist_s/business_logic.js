/*
  Bridal Hairstylist Services Website - Business Logic
  Works in browser and Node.js (with localStorage polyfill below).
  All persistence is via localStorage using JSON-serializable data structures.
*/

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

  // ---------------------- Internal storage helpers ----------------------

  _initStorage() {
    // Global id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Legacy/example keys from template (kept but unused)
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

    // Domain-specific storage tables (always arrays)
    const keys = [
      'bridal_packages',
      'party_service_options',
      'stylists',
      'stylist_travel_fees',
      'bookings',
      'booking_service_items',
      'trial_types',
      'trial_bookings',
      'hairstyles',
      'favorite_items',
      'faq_categories',
      'faq_items',
      'contact_submissions',
      'gift_card_products',
      'gift_card_configurations',
      'cart',
      'cart_items',
      'destination_quote_requests',
      'blog_posts',
      'blog_recommended_hairstyles'
    ];
    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
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

  // ---------------------- Generic entity lookup helpers ----------------------

  _getStylistById(stylistId) {
    const stylists = this._getFromStorage('stylists');
    return stylists.find(s => s.id === stylistId) || null;
  }

  _getHairstyleById(hairstyleId) {
    const hairstyles = this._getFromStorage('hairstyles');
    return hairstyles.find(h => h.id === hairstyleId) || null;
  }

  _getBookingById(bookingId) {
    const bookings = this._getFromStorage('bookings');
    return bookings.find(b => b.id === bookingId) || null;
  }

  _getBridalPackageById(bridalPackageId) {
    const packages = this._getFromStorage('bridal_packages');
    return packages.find(p => p.id === bridalPackageId) || null;
  }

  _getPartyServiceOptionById(optionId) {
    const options = this._getFromStorage('party_service_options');
    return options.find(o => o.id === optionId) || null;
  }

  _getTrialTypeById(trialTypeId) {
    const types = this._getFromStorage('trial_types');
    return types.find(t => t.id === trialTypeId) || null;
  }

  _getGiftCardProductById(productId) {
    const products = this._getFromStorage('gift_card_products');
    return products.find(p => p.id === productId) || null;
  }

  _getGiftCardConfigurationById(configId) {
    const configs = this._getFromStorage('gift_card_configurations');
    return configs.find(c => c.id === configId) || null;
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    const now = new Date().toISOString();
    let carts = this._getFromStorage('cart');
    let activeCart = carts.find(c => c.status === 'active');
    if (!activeCart) {
      activeCart = {
        id: this._generateId('cart'),
        status: 'active',
        currency: 'USD',
        created_at: now,
        updated_at: now
      };
      carts.push(activeCart);
      this._saveToStorage('cart', carts);
    }
    return activeCart;
  }

  _getCartItems(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    return cartItems.filter(ci => ci.cart_id === cartId);
  }

  _attachCartItemRelations(items) {
    const carts = this._getFromStorage('cart');
    const bridalPackages = this._getFromStorage('bridal_packages');
    const giftCardConfigs = this._getFromStorage('gift_card_configurations');
    const trialBookings = this._getFromStorage('trial_bookings');
    const bookingServiceItems = this._getFromStorage('booking_service_items');

    return items.map(item => {
      const cart = carts.find(c => c.id === item.cart_id) || null;
      let reference = null;
      if (item.reference_id) {
        reference =
          giftCardConfigs.find(g => g.id === item.reference_id) ||
          bridalPackages.find(p => p.id === item.reference_id) ||
          trialBookings.find(t => t.id === item.reference_id) ||
          bookingServiceItems.find(bi => bi.id === item.reference_id) ||
          null;
      }
      return Object.assign({}, item, {
        cart: cart,
        reference: reference
      });
    });
  }

  _calculateCartTotals(cartId) {
    const items = this._getCartItems(cartId);
    let subtotal = 0;
    let itemCount = 0;
    for (const item of items) {
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      const total = typeof item.total_price_snapshot === 'number'
        ? item.total_price_snapshot
        : (item.unit_price_snapshot || 0) * qty;
      subtotal += total;
      itemCount += qty;
    }
    return { subtotal, itemCount };
  }

  // ---------------------- Booking helpers ----------------------

  _getOrCreateDraftBooking() {
    const now = new Date().toISOString();
    let bookings = this._getFromStorage('bookings');
    let booking = bookings.find(
      b => b.booking_type === 'wedding_day' && b.status === 'draft'
    );
    if (!booking) {
      booking = {
        id: this._generateId('booking'),
        booking_type: 'wedding_day',
        status: 'draft',
        event_date: now,
        event_time: null,
        location_type: 'in_salon',
        location_address: null,
        salon_location_name: null,
        stylist_id: null,
        total_price: 0,
        currency: 'USD',
        notes: null,
        created_at: now,
        updated_at: now
      };
      bookings.push(booking);
      this._saveToStorage('bookings', bookings);
    }
    return booking;
  }

  _getBookingItems(bookingId) {
    const allItems = this._getFromStorage('booking_service_items');
    return allItems.filter(i => i.booking_id === bookingId);
  }

  _attachBookingRelations(booking) {
    if (!booking) return null;
    const stylist = booking.stylist_id ? this._getStylistById(booking.stylist_id) : null;
    return Object.assign({}, booking, { stylist: stylist });
  }

  _attachBookingServiceItemRelations(items) {
    const bookings = this._getFromStorage('bookings');
    const bridalPackages = this._getFromStorage('bridal_packages');
    const partyOptions = this._getFromStorage('party_service_options');
    const trialTypes = this._getFromStorage('trial_types');

    return items.map(item => {
      const booking = bookings.find(b => b.id === item.booking_id) || null;
      const bridalPackage = item.bridal_package_id
        ? bridalPackages.find(p => p.id === item.bridal_package_id) || null
        : null;
      const partyServiceOption = item.party_service_option_id
        ? partyOptions.find(p => p.id === item.party_service_option_id) || null
        : null;
      const trialType = item.trial_type_id
        ? trialTypes.find(t => t.id === item.trial_type_id) || null
        : null;
      return Object.assign({}, item, {
        booking: booking,
        bridal_package: bridalPackage,
        party_service_option: partyServiceOption,
        trial_type: trialType
      });
    });
  }

  // ---------------------- Favorites helper ----------------------

  _syncFavoritesToStorage(favorites) {
    this._saveToStorage('favorite_items', favorites || []);
  }

  // ---------------------- Interface implementations ----------------------

  // getHomePageContent
  getHomePageContent() {
    return {
      hero_title: 'Bridal Hair That Lasts From First Look To Last Dance',
      hero_subtitle: 'On-site and in-salon bridal hairstyling tailored to your wedding day timeline.',
      hero_ctas: [
        { id: 'cta_book_now', label: 'Book Now', target_page: 'booking_flow' },
        { id: 'cta_view_packages', label: 'Bridal Packages', target_page: 'bridal_packages' },
        { id: 'cta_view_stylists', label: 'Browse Stylists', target_page: 'stylists' }
      ],
      brand_story:
        'We are a bridal-focused hairstyling team specializing in elegant, long-lasting looks for brides and their parties, on-site or in-salon.',
      value_props: [
        {
          headline: 'Bridal Specialists Only',
          body: 'Every stylist on our team is trained exclusively in bridal and event hairstyling.'
        },
        {
          headline: 'Customizable Packages',
          body: 'Mix and match bride and bridal party services to fit your wedding day timeline and budget.'
        },
        {
          headline: 'On-Site Or In-Salon',
          body: 'Choose to get ready at our salon, your venue, hotel, or private rental.'
        }
      ]
    };
  }

  // getHomepageFeaturedHighlights
  getHomepageFeaturedHighlights() {
    const bridalPackages = this._getFromStorage('bridal_packages').filter(p => p.is_active !== false);
    const stylists = this._getFromStorage('stylists').filter(s => s.is_active !== false);
    const hairstyles = this._getFromStorage('hairstyles');
    const giftCardProducts = this._getFromStorage('gift_card_products').filter(p => p.is_active !== false);
    const blogPosts = this._getFromStorage('blog_posts').filter(p => p.status === 'published');

    const featured_packages = bridalPackages
      .slice()
      .sort((a, b) => (a.base_price || 0) - (b.base_price || 0))
      .slice(0, 3);

    const featured_stylists = stylists
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    const popular_hairstyles = hairstyles.slice(0, 6);

    let giftCardPromo = {
      headline: 'Give The Gift Of Bridal Beauty',
      description: 'Send a digital bridal hairstyling gift card that can be applied to any service.',
      gift_card_product_id: null
    };
    if (giftCardProducts.length > 0) {
      const digital = giftCardProducts.find(p => p.is_digital) || giftCardProducts[0];
      giftCardPromo = {
        headline: 'Digital Bridal Gift Cards',
        description: 'Perfect for bridal showers, engagements, and wedding gifts.',
        gift_card_product_id: digital.id
      };
    }

    let featured_blog_post = null;
    if (blogPosts.length > 0) {
      const sorted = blogPosts.slice().sort((a, b) => {
        const ad = a.published_at || '';
        const bd = b.published_at || '';
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      });
      const p = sorted[0];
      featured_blog_post = {
        id: p.id,
        title: p.title,
        slug: p.slug,
        summary: p.summary || '',
        published_at: p.published_at || ''
      };
    }

    return {
      featured_packages,
      featured_stylists,
      popular_hairstyles,
      gift_card_promo: giftCardPromo,
      featured_blog_post
    };
  }

  // getFavoritesSummary
  getFavoritesSummary() {
    const favorites = this._getFromStorage('favorite_items');
    const hairstyles = this._getFromStorage('hairstyles');

    const sortedFavs = favorites
      .slice()
      .sort((a, b) => {
        const ad = a.added_at || '';
        const bd = b.added_at || '';
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      });

    const recent_favorites = [];
    for (const fav of sortedFavs) {
      const hs = hairstyles.find(h => h.id === fav.hairstyle_id);
      if (hs) {
        recent_favorites.push(hs);
        if (recent_favorites.length >= 3) break;
      }
    }

    const count = favorites.length;

    return {
      count,
      recent_favorites
    };
  }

  // getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart.id);
    return {
      cart_id: cart.id,
      item_count: totals.itemCount,
      total_price: totals.subtotal,
      currency: cart.currency || 'USD'
    };
  }

  // getBridalPackagesFilterOptions
  getBridalPackagesFilterOptions() {
    const packages = this._getFromStorage('bridal_packages').filter(p => p.is_active !== false);

    const serviceTypes = new Set();
    const locationTypes = new Set();
    const timeOfDay = new Set();
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    for (const p of packages) {
      if (p.service_type) serviceTypes.add(p.service_type);
      if (p.default_location_type) locationTypes.add(p.default_location_type);
      if (Array.isArray(p.location_options)) {
        p.location_options.forEach(l => locationTypes.add(l));
      }
      if (Array.isArray(p.time_of_day_options)) {
        p.time_of_day_options.forEach(t => timeOfDay.add(t));
      }
      if (typeof p.base_price === 'number') {
        if (minPrice === null || p.base_price < minPrice) minPrice = p.base_price;
        if (maxPrice === null || p.base_price > maxPrice) maxPrice = p.base_price;
      }
      if (p.currency) currency = p.currency;
    }

    const service_type_options = serviceTypes.size
      ? Array.from(serviceTypes)
      : ['bride_only', 'bride_plus_party', 'party_only'];
    const location_type_options = locationTypes.size
      ? Array.from(locationTypes)
      : ['on_site', 'in_salon', 'destination'];
    const time_of_day_options = timeOfDay.size
      ? Array.from(timeOfDay)
      : ['morning', 'afternoon', 'evening'];

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      service_type_options,
      location_type_options,
      time_of_day_options,
      price_range: { min: minPrice, max: maxPrice, currency },
      sort_options
    };
  }

  // searchBridalPackages(service_type, location_type, wedding_date, time_of_day, max_price, min_rating, sort, limit, offset)
  searchBridalPackages(service_type, location_type, wedding_date, time_of_day, max_price, min_rating, sort, limit, offset) {
    const packages = this._getFromStorage('bridal_packages').filter(p => p.is_active !== false);

    let results = packages.filter(p => {
      if (service_type && p.service_type !== service_type) return false;

      if (location_type) {
        const locMatch =
          p.default_location_type === location_type ||
          (Array.isArray(p.location_options) && p.location_options.includes(location_type));
        if (!locMatch) return false;
      }

      if (typeof max_price === 'number' && typeof p.base_price === 'number' && p.base_price > max_price) {
        return false;
      }

      if (typeof min_rating === 'number') {
        const rating = typeof p.rating === 'number' ? p.rating : 0;
        if (rating < min_rating) return false;
      }

      if (time_of_day && Array.isArray(p.time_of_day_options) && p.time_of_day_options.length) {
        if (!p.time_of_day_options.includes(time_of_day)) return false;
      }

      return true;
    });

    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    } else if (sort === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const lim = typeof limit === 'number' ? limit : 20;
    const off = typeof offset === 'number' ? offset : 0;
    return results.slice(off, off + lim);
  }

  // getBridalPackageDetails(bridalPackageId, selected_location_type)
  getBridalPackageDetails(bridalPackageId, selected_location_type) {
    const pkg = this._getBridalPackageById(bridalPackageId);
    if (!pkg) {
      return { package: null, location_options: [], time_of_day_options: [], notes: '' };
    }
    const location_options = Array.isArray(pkg.location_options) && pkg.location_options.length
      ? pkg.location_options
      : [pkg.default_location_type];
    const time_of_day_options = Array.isArray(pkg.time_of_day_options) && pkg.time_of_day_options.length
      ? pkg.time_of_day_options
      : ['morning', 'afternoon', 'evening'];
    const notes = selected_location_type && !location_options.includes(selected_location_type)
      ? 'Selected location type is not available for this package.'
      : '';
    return {
      package: pkg,
      location_options,
      time_of_day_options,
      notes
    };
  }

  // getBridalPackageAvailability(bridalPackageId, wedding_date, location_type)
  getBridalPackageAvailability(bridalPackageId, wedding_date, location_type) {
    const pkg = this._getBridalPackageById(bridalPackageId);
    if (!pkg) {
      return { bridalPackageId, wedding_date, time_slots: [] };
    }

    const slots = Array.isArray(pkg.available_time_slots) ? pkg.available_time_slots : [];

    const time_slots = slots.map(t => {
      const [hourStr, minStr] = t.split(':');
      const hour = parseInt(hourStr || '0', 10);
      let bucket = 'morning';
      if (hour >= 12 && hour < 17) bucket = 'afternoon';
      else if (hour >= 17) bucket = 'evening';
      return {
        time: t,
        is_available: true,
        time_of_day: bucket
      };
    });

    return {
      bridalPackageId,
      wedding_date,
      time_slots
    };
  }

  // addPackageAppointmentToCart(bridalPackageId, wedding_date, time_slot, location_type)
  addPackageAppointmentToCart(bridalPackageId, wedding_date, time_slot, location_type) {
    const pkg = this._getBridalPackageById(bridalPackageId);
    if (!pkg) {
      return {
        success: false,
        cart: null,
        cart_items: [],
        message: 'Bridal package not found.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const now = new Date().toISOString();

    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'bridal_package',
      reference_id: pkg.id,
      name_snapshot: pkg.name,
      unit_price_snapshot: pkg.base_price || 0,
      quantity: 1,
      total_price_snapshot: pkg.base_price || 0,
      details_snapshot: JSON.stringify({ wedding_date, time_slot, location_type }),
      added_at: now
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    const itemsForCart = this._attachCartItemRelations(this._getCartItems(cart.id));

    return {
      success: true,
      cart,
      cart_items: itemsForCart,
      message: 'Bridal package added to cart.'
    };
  }

  // getStylistFilterOptions
  getStylistFilterOptions() {
    return {
      radius_options_miles: [10, 20, 30, 50],
      rating_threshold_options: [3, 4, 4.5, 5],
      review_count_threshold_options: [10, 20, 50, 100],
      sort_options: [
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'distance_low_to_high', label: 'Distance: Near to Far' }
      ]
    };
  }

  // searchStylists(zip_code, radius_miles, min_rating, min_review_count, sort, limit, offset)
  searchStylists(zip_code, radius_miles, min_rating, min_review_count, sort, limit, offset) {
    const stylists = this._getFromStorage('stylists').filter(s => s.is_active !== false);

    let results = stylists.filter(s => {
      if (typeof min_rating === 'number' && (s.rating || 0) < min_rating) return false;
      if (typeof min_review_count === 'number' && (s.review_count || 0) < min_review_count) return false;
      if (typeof radius_miles === 'number') {
        if (typeof s.service_radius_miles === 'number' && s.service_radius_miles < radius_miles) {
          return false;
        }
      }
      // We do not calculate real distances by ZIP; assume radius check above suffices.
      return true;
    });

    if (sort === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const lim = typeof limit === 'number' ? limit : 20;
    const off = typeof offset === 'number' ? offset : 0;
    return results.slice(off, off + lim);
  }

  // getStylistProfile(stylistId)
  getStylistProfile(stylistId) {
    const stylist = this._getStylistById(stylistId);
    if (!stylist) {
      return { stylist: null, travel_fees: [], sample_hairstyles: [] };
    }
    const allTravelFees = this._getFromStorage('stylist_travel_fees');
    const travel_fees_raw = allTravelFees.filter(tf => tf.stylist_id === stylist.id);
    const travel_fees = travel_fees_raw.map(tf => Object.assign({}, tf, { stylist }));

    const hairstyles = this._getFromStorage('hairstyles');
    const sample_hairstyles = hairstyles.slice(0, 6);

    return {
      stylist,
      travel_fees,
      sample_hairstyles
    };
  }

  // startWeddingDayBookingWithStylist(stylistId)
  startWeddingDayBookingWithStylist(stylistId) {
    const stylist = this._getStylistById(stylistId);
    const now = new Date().toISOString();
    let bookings = this._getFromStorage('bookings');

    let booking = bookings.find(
      b => b.booking_type === 'wedding_day' && b.status === 'draft' && b.stylist_id === stylistId
    );

    if (!booking) {
      booking = {
        id: this._generateId('booking'),
        booking_type: 'wedding_day',
        status: 'draft',
        event_date: now,
        event_time: null,
        location_type: 'on_site',
        location_address: null,
        salon_location_name: null,
        stylist_id: stylist ? stylist.id : null,
        total_price: 0,
        currency: 'USD',
        notes: null,
        created_at: now,
        updated_at: now
      };
      bookings.push(booking);
      this._saveToStorage('bookings', bookings);
    }

    const bookingWithRelations = this._attachBookingRelations(booking);

    return {
      booking: bookingWithRelations,
      message: 'Wedding day booking started with stylist.'
    };
  }

  // startWeddingDayBooking()
  startWeddingDayBooking() {
    const booking = this._getOrCreateDraftBooking();
    const bookingWithRelations = this._attachBookingRelations(booking);
    return { booking: bookingWithRelations };
  }

  // getBrideServiceOptionsForBooking(bookingId, max_price, sort)
  getBrideServiceOptionsForBooking(bookingId, max_price, sort) {
    // bookingId is not used for filtering currently but kept for signature
    const packages = this._getFromStorage('bridal_packages').filter(p => p.is_active !== false);

    let results = packages.filter(p => {
      // Bride-focused packages: bride_only or bride_plus_party
      if (p.service_type !== 'bride_only' && p.service_type !== 'bride_plus_party') return false;
      if (typeof max_price === 'number' && typeof p.base_price === 'number' && p.base_price > max_price) {
        return false;
      }
      return true;
    });

    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    }

    return results;
  }

  // addBridePackageToBooking(bookingId, bridalPackageId, location_type)
  addBridePackageToBooking(bookingId, bridalPackageId, location_type) {
    const booking = this._getBookingById(bookingId);
    const pkg = this._getBridalPackageById(bridalPackageId);
    if (!booking || !pkg) {
      return { booking: null, updated_items: [] };
    }

    const allItems = this._getFromStorage('booking_service_items');
    const now = new Date().toISOString();

    // Remove existing bride package items for this booking
    const filteredItems = allItems.filter(
      i => !(i.booking_id === booking.id && i.service_kind === 'bride_package')
    );

    const newItem = {
      id: this._generateId('booking_item'),
      booking_id: booking.id,
      service_kind: 'bride_package',
      bridal_package_id: pkg.id,
      party_service_option_id: null,
      trial_type_id: null,
      role: 'bride',
      quantity: 1,
      unit_price: pkg.base_price || 0,
      line_total_price: pkg.base_price || 0,
      location_type: location_type || booking.location_type || pkg.default_location_type || 'in_salon',
      time_slot: booking.event_time || null,
      notes: null
    };

    filteredItems.push(newItem);
    this._saveToStorage('booking_service_items', filteredItems);

    // Optionally update booking location_type
    let bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(b => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx].location_type = newItem.location_type;
      bookings[idx].updated_at = now;
      this._saveToStorage('bookings', bookings);
    }

    const updatedItemsRaw = filteredItems.filter(i => i.booking_id === booking.id);
    const updated_items = this._attachBookingServiceItemRelations(updatedItemsRaw);
    const bookingWithRelations = this._attachBookingRelations(bookings[idx] || booking);

    return {
      booking: bookingWithRelations,
      updated_items
    };
  }

  // getPartyServiceOptionsForBooking(bookingId, role, max_price_per_person, location_type, sort)
  getPartyServiceOptionsForBooking(bookingId, role, max_price_per_person, location_type, sort) {
    const options = this._getFromStorage('party_service_options').filter(o => o.is_active !== false);

    let results = options.filter(o => {
      if (role && o.role !== role) return false;
      if (
        typeof max_price_per_person === 'number' &&
        typeof o.price_per_person === 'number' &&
        o.price_per_person > max_price_per_person
      ) {
        return false;
      }
      if (location_type) {
        if (Array.isArray(o.location_options) && o.location_options.length) {
          if (!o.location_options.includes(location_type)) return false;
        }
      }
      return true;
    });

    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.price_per_person || 0) - (b.price_per_person || 0));
    }

    return results;
  }

  // addPartyServiceToBooking(bookingId, partyServiceOptionId, role, quantity, location_type)
  addPartyServiceToBooking(bookingId, partyServiceOptionId, role, quantity, location_type) {
    const booking = this._getBookingById(bookingId);
    const option = this._getPartyServiceOptionById(partyServiceOptionId);
    if (!booking || !option) {
      return { booking: null, updated_item: null };
    }

    const allItems = this._getFromStorage('booking_service_items');
    const now = new Date().toISOString();
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const service_kind = role === 'bridesmaid' ? 'bridesmaid_service' : 'other_party_service';

    let item = allItems.find(
      i =>
        i.booking_id === booking.id &&
        i.party_service_option_id === option.id &&
        i.role === role &&
        i.service_kind === service_kind
    );

    if (item) {
      item.quantity = qty;
      item.unit_price = option.price_per_person || 0;
      item.line_total_price = item.unit_price * qty;
      item.location_type = location_type || item.location_type || booking.location_type || 'in_salon';
      item.time_slot = booking.event_time || item.time_slot || null;
      item.notes = item.notes || null;
    } else {
      item = {
        id: this._generateId('booking_item'),
        booking_id: booking.id,
        service_kind,
        bridal_package_id: null,
        party_service_option_id: option.id,
        trial_type_id: null,
        role,
        quantity: qty,
        unit_price: option.price_per_person || 0,
        line_total_price: (option.price_per_person || 0) * qty,
        location_type: location_type || booking.location_type || 'in_salon',
        time_slot: booking.event_time || null,
        notes: null
      };
      allItems.push(item);
    }

    this._saveToStorage('booking_service_items', allItems);

    let bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(b => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx].updated_at = now;
      this._saveToStorage('bookings', bookings);
    }

    const itemWithRelations = this._attachBookingServiceItemRelations([item])[0];
    const bookingWithRelations = this._attachBookingRelations(bookings[idx] || booking);

    return {
      booking: bookingWithRelations,
      updated_item: itemWithRelations
    };
  }

  // updateBookingLocationAndSchedule(bookingId, location_type, event_date, event_time)
  updateBookingLocationAndSchedule(bookingId, location_type, event_date, event_time) {
    const booking = this._getBookingById(bookingId);
    if (!booking) {
      return { booking: null, items: [] };
    }

    let bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(b => b.id === booking.id);
    const now = new Date().toISOString();

    if (idx !== -1) {
      bookings[idx].location_type = location_type;
      bookings[idx].event_date = event_date;
      bookings[idx].event_time = event_time;
      bookings[idx].updated_at = now;
      this._saveToStorage('bookings', bookings);
    }

    const allItems = this._getFromStorage('booking_service_items');
    const updatedItems = allItems.map(i => {
      if (i.booking_id !== booking.id) return i;
      const timeSlotIso = event_date && event_time
        ? new Date(event_date + 'T' + event_time + ':00').toISOString()
        : i.time_slot;
      return Object.assign({}, i, {
        location_type,
        time_slot: timeSlotIso
      });
    });

    this._saveToStorage('booking_service_items', updatedItems);

    const itemsForBookingRaw = updatedItems.filter(i => i.booking_id === booking.id);
    const itemsForBooking = this._attachBookingServiceItemRelations(itemsForBookingRaw);
    const bookingWithRelations = this._attachBookingRelations(bookings[idx] || booking);

    return {
      booking: bookingWithRelations,
      items: itemsForBooking
    };
  }

  // getBookingSummary(bookingId)
  getBookingSummary(bookingId) {
    const booking = this._getBookingById(bookingId);
    if (!booking) {
      return {
        booking: null,
        items: [],
        totals: { subtotal: 0, currency: 'USD', bride_services_total: 0, party_services_total: 0 }
      };
    }

    const itemsRaw = this._getBookingItems(booking.id);
    const items = this._attachBookingServiceItemRelations(itemsRaw);

    let subtotal = 0;
    let brideTotal = 0;
    let partyTotal = 0;
    for (const item of itemsRaw) {
      const line = item.line_total_price || 0;
      subtotal += line;
      if (item.role === 'bride') brideTotal += line;
      else partyTotal += line;
    }

    const bookingWithRelations = this._attachBookingRelations(booking);

    return {
      booking: bookingWithRelations,
      items,
      totals: {
        subtotal,
        currency: booking.currency || 'USD',
        bride_services_total: brideTotal,
        party_services_total: partyTotal
      }
    };
  }

  // getTrialFilterOptions
  getTrialFilterOptions() {
    const types = this._getFromStorage('trial_types').filter(t => t.is_active !== false);
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    for (const t of types) {
      if (typeof t.base_price === 'number') {
        if (minPrice === null || t.base_price < minPrice) minPrice = t.base_price;
        if (maxPrice === null || t.base_price > maxPrice) maxPrice = t.base_price;
      }
      if (t.currency) currency = t.currency;
    }

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const day_of_week_options = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];

    const time_of_day_options = ['morning', 'afternoon', 'evening'];

    return {
      price_range: { min: minPrice, max: maxPrice, currency },
      day_of_week_options,
      time_of_day_options
    };
  }

  // getTrialTypes(name_query, max_price)
  getTrialTypes(name_query, max_price) {
    const types = this._getFromStorage('trial_types').filter(t => t.is_active !== false);
    const q = name_query ? String(name_query).toLowerCase() : null;

    let results = types.filter(t => {
      if (q && !String(t.name || '').toLowerCase().includes(q)) return false;
      if (typeof max_price === 'number' && typeof t.base_price === 'number' && t.base_price > max_price) {
        return false;
      }
      return true;
    });

    return results;
  }

  // getTrialAvailability(trialTypeId, start_date, end_date, allowed_days_of_week, earliest_time)
  getTrialAvailability(trialTypeId, start_date, end_date, allowed_days_of_week, earliest_time) {
    const trialType = this._getTrialTypeById(trialTypeId);
    if (!trialType) return [];

    const allowedDaysSet = Array.isArray(allowed_days_of_week) && allowed_days_of_week.length
      ? new Set(allowed_days_of_week.map(d => d.toLowerCase()))
      : null;

    const earliest = earliest_time || null;

    const result = [];
    const start = new Date(start_date + 'T00:00:00');
    const end = new Date(end_date + 'T00:00:00');

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayName = dayNames[d.getDay()];
      if (allowedDaysSet && !allowedDaysSet.has(dayName)) continue;

      const dateStr = d.toISOString().split('T')[0];
      const baseSlots = Array.isArray(trialType.available_time_slots)
        ? trialType.available_time_slots
        : [];

      const time_slots = baseSlots
        .filter(t => {
          if (!earliest) return true;
          return t >= earliest;
        })
        .map(t => ({ time: t, is_available: true }));

      if (time_slots.length) {
        result.push({ date: dateStr, time_slots });
      }
    }

    return result;
  }

  // createTrialBooking(trialTypeId, date, time_start, client_name, client_email, client_phone)
  createTrialBooking(trialTypeId, date, time_start, client_name, client_email, client_phone) {
    const trialType = this._getTrialTypeById(trialTypeId);
    if (!trialType) {
      return { trial_booking: null, message: 'Trial type not found.' };
    }

    const bookings = this._getFromStorage('trial_bookings');
    const now = new Date().toISOString();
    // Avoid timezone-related shifts; store date and time as provided strings
    const timeValue = time_start;

    const booking = {
      id: this._generateId('trial_booking'),
      trial_type_id: trialType.id,
      trial_type_name_snapshot: trialType.name,
      date: date,
      time_start: timeValue,
      client_name,
      client_email,
      client_phone,
      price: trialType.base_price || 0,
      location_type: trialType.default_location_type || null,
      status: 'requested',
      created_at: now
    };

    bookings.push(booking);
    this._saveToStorage('trial_bookings', bookings);

    const bookingWithRelations = Object.assign({}, booking, { trial_type: trialType });

    return {
      trial_booking: bookingWithRelations,
      message: 'Trial booking requested.'
    };
  }

  // getGalleryFilterOptions
  getGalleryFilterOptions() {
    const hairstyles = this._getFromStorage('hairstyles');

    const hairLengths = new Set();
    const styleTypes = new Set();
    const accessoryOptions = new Set();

    for (const h of hairstyles) {
      if (h.hair_length) hairLengths.add(h.hair_length);
      if (h.style_type) styleTypes.add(h.style_type);
      if (Array.isArray(h.accessory_tags)) {
        h.accessory_tags.forEach(a => accessoryOptions.add(a));
      }
      if (h.has_veil) accessoryOptions.add('veil');
      if (h.has_accessories) accessoryOptions.add('hair_accessories');
    }

    const hair_length_options = hairLengths.size
      ? Array.from(hairLengths)
      : ['short', 'medium', 'long'];
    const style_type_options = styleTypes.size
      ? Array.from(styleTypes)
      : ['updo', 'braid', 'down', 'half_up'];
    const accessory_options = accessoryOptions.size
      ? Array.from(accessoryOptions)
      : ['veil', 'hair_accessories', 'sparkling_clip'];

    return {
      hair_length_options,
      style_type_options,
      accessory_options
    };
  }

  // searchHairstyles(hair_length, style_type, accessory_filter, is_trend_2025, limit, offset)
  searchHairstyles(hair_length, style_type, accessory_filter, is_trend_2025, limit, offset) {
    const hairstyles = this._getFromStorage('hairstyles');

    let results = hairstyles.filter(h => {
      if (hair_length && h.hair_length !== hair_length) return false;
      if (style_type && h.style_type !== style_type) return false;
      if (typeof is_trend_2025 === 'boolean') {
        if (!!h.is_trend_2025 !== is_trend_2025) return false;
      }
      if (accessory_filter) {
        const tag = accessory_filter.toLowerCase();
        const tags = Array.isArray(h.accessory_tags) ? h.accessory_tags.map(a => String(a).toLowerCase()) : [];
        const hasTag = tags.includes(tag);
        const hasVeil = tag === 'veil' && !!h.has_veil;
        const hasAccessories = (tag === 'hair_accessories' || tag === 'sparkling_clip') && !!h.has_accessories;
        if (!hasTag && !hasVeil && !hasAccessories) return false;
      }
      return true;
    });

    const lim = typeof limit === 'number' ? limit : 24;
    const off = typeof offset === 'number' ? offset : 0;
    return results.slice(off, off + lim);
  }

  // addHairstyleToFavorites(hairstyleId)
  addHairstyleToFavorites(hairstyleId) {
    const favorites = this._getFromStorage('favorite_items');
    const now = new Date().toISOString();

    let favorite = favorites.find(f => f.hairstyle_id === hairstyleId);
    if (favorite) {
      favorite.added_at = now;
    } else {
      favorite = {
        id: this._generateId('favorite'),
        hairstyle_id: hairstyleId,
        added_at: now
      };
      favorites.push(favorite);
    }

    this._syncFavoritesToStorage(favorites);

    const hairstyle = this._getHairstyleById(hairstyleId);

    return {
      favorite_item: Object.assign({}, favorite, { hairstyle }),
      favorites_count: favorites.length
    };
  }

  // removeHairstyleFromFavorites(hairstyleId)
  removeHairstyleFromFavorites(hairstyleId) {
    const favorites = this._getFromStorage('favorite_items');
    const filtered = favorites.filter(f => f.hairstyle_id !== hairstyleId);
    this._syncFavoritesToStorage(filtered);
    return {
      success: true,
      favorites_count: filtered.length
    };
  }

  // getFavoriteHairstyles
  getFavoriteHairstyles() {
    const favorites = this._getFromStorage('favorite_items');
    const hairstyles = this._getFromStorage('hairstyles');

    const result = favorites.map(f => {
      const hairstyle = hairstyles.find(h => h.id === f.hairstyle_id) || null;
      return {
        favorite: f,
        hairstyle
      };
    });

    return { favorites: result };
  }

  // getFAQCategories
  getFAQCategories() {
    const cats = this._getFromStorage('faq_categories');
    return cats;
  }

  // getFAQItemsByCategory(category_slug)
  getFAQItemsByCategory(category_slug) {
    const categories = this._getFromStorage('faq_categories');
    const items = this._getFromStorage('faq_items');

    const cat = categories.find(c => c.slug === category_slug) || null;
    if (!cat) return [];

    const filtered = items
      .filter(i => i.category_id === cat.id && i.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return filtered.map(i => Object.assign({}, i, { category: cat }));
  }

  // searchFAQs(query)
  searchFAQs(query) {
    const q = String(query || '').toLowerCase();
    const categories = this._getFromStorage('faq_categories');
    const items = this._getFromStorage('faq_items');

    const results = items.filter(i => {
      if (i.is_active === false) return false;
      const text = (String(i.question || '') + ' ' + String(i.answer || '')).toLowerCase();
      return text.includes(q);
    });

    return results.map(i => {
      const category = categories.find(c => c.id === i.category_id) || null;
      return Object.assign({}, i, { category });
    });
  }

  // submitContactForm(name, email, phone, subject, message)
  submitContactForm(name, email, phone, subject, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const now = new Date().toISOString();

    const allowedSubjects = [
      'cancellation_policy',
      'booking_question',
      'services_question',
      'payments_question',
      'other'
    ];
    const subj = allowedSubjects.includes(subject) ? subject : 'other';

    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || null,
      subject: subj,
      message,
      created_at: now
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      contact_submission: submission,
      success: true,
      confirmation_message: 'Thank you for reaching out. We will respond shortly.'
    };
  }

  // getGiftCardProducts
  getGiftCardProducts() {
    const products = this._getFromStorage('gift_card_products').filter(p => p.is_active !== false);
    return products;
  }

  // createGiftCardAndAddToCart(gift_card_product_id, amount, recipient_name, recipient_email, message, delivery_method)
  createGiftCardAndAddToCart(gift_card_product_id, amount, recipient_name, recipient_email, message, delivery_method) {
    const product = this._getGiftCardProductById(gift_card_product_id);
    if (!product) {
      return {
        gift_card_configuration: null,
        cart: null,
        cart_items: []
      };
    }

    const configs = this._getFromStorage('gift_card_configurations');
    const now = new Date().toISOString();

    let finalAmount = typeof amount === 'number' ? amount : 0;
    if (typeof product.min_amount === 'number' && finalAmount < product.min_amount) {
      finalAmount = product.min_amount;
    }
    if (typeof product.max_amount === 'number' && finalAmount > product.max_amount) {
      finalAmount = product.max_amount;
    }

    const config = {
      id: this._generateId('giftcard_cfg'),
      gift_card_product_id: product.id,
      amount: finalAmount,
      currency: product.currency || 'USD',
      recipient_name,
      recipient_email,
      message: message || null,
      delivery_method,
      created_at: now
    };

    configs.push(config);
    this._saveToStorage('gift_card_configurations', configs);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_card',
      reference_id: config.id,
      name_snapshot: product.name,
      unit_price_snapshot: finalAmount,
      quantity: 1,
      total_price_snapshot: finalAmount,
      details_snapshot: JSON.stringify({
        recipient_name,
        recipient_email,
        message: message || null,
        delivery_method
      }),
      added_at: now
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    const configWithProduct = Object.assign({}, config, { gift_card_product: product });
    const itemsForCart = this._attachCartItemRelations(this._getCartItems(cart.id));

    return {
      gift_card_configuration: configWithProduct,
      cart,
      cart_items: itemsForCart
    };
  }

  // getCartDetails
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const itemsRaw = this._getCartItems(cart.id);
    const items = this._attachCartItemRelations(itemsRaw);
    const totals = this._calculateCartTotals(cart.id);

    return {
      cart,
      items,
      totals: {
        subtotal: totals.subtotal,
        currency: cart.currency || 'USD'
      }
    };
  }

  // updateCartItemQuantity(cart_item_id, quantity)
  updateCartItemQuantity(cart_item_id, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    let updatedItems = cartItems;

    if (quantity <= 0) {
      updatedItems = cartItems.filter(ci => ci.id !== cart_item_id);
    } else {
      updatedItems = cartItems.map(ci => {
        if (ci.id !== cart_item_id) return ci;
        const unit = ci.unit_price_snapshot || 0;
        return Object.assign({}, ci, {
          quantity,
          total_price_snapshot: unit * quantity
        });
      });
    }

    this._saveToStorage('cart_items', updatedItems);

    const cart = this._getOrCreateCart();
    const now = new Date().toISOString();
    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    const itemsForCart = this._attachCartItemRelations(this._getCartItems(cart.id));
    return {
      cart,
      items: itemsForCart
    };
  }

  // removeCartItem(cart_item_id)
  removeCartItem(cart_item_id) {
    const cartItems = this._getFromStorage('cart_items');
    const updatedItems = cartItems.filter(ci => ci.id !== cart_item_id);
    this._saveToStorage('cart_items', updatedItems);

    const cart = this._getOrCreateCart();
    const now = new Date().toISOString();
    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    const itemsForCart = this._attachCartItemRelations(this._getCartItems(cart.id));
    return {
      cart,
      items: itemsForCart
    };
  }

  // getDestinationWeddingPageContent
  getDestinationWeddingPageContent() {
    return {
      intro_text:
        'Planning a destination wedding? Our bridal hairstyling team travels to resorts, villas, and hotels worldwide so you can relax and get ready on-site.',
      example_locations: ['Maui, Hawaii', 'Cabo San Lucas, Mexico', 'Tuscany, Italy', 'Sedona, Arizona'],
      travel_policy_summary:
        'Destination weddings include customized travel fees and minimum service requirements, based on location, season, and stylist availability.'
    };
  }

  // getDestinationServicesOptions
  getDestinationServicesOptions() {
    return {
      service_options: ['Bride Hair', '4 Bridesmaids', 'Mother of the Bride', 'Mother of the Groom', 'Flower Girl'],
      getting_ready_location_options: ['hotel', 'private_villa', 'resort', 'other']
    };
  }

  // submitDestinationWeddingQuote(event_date, event_location_text, services_needed, getting_ready_location, budget_amount, currency, contact_name, contact_email, contact_phone, additional_details)
  submitDestinationWeddingQuote(event_date, event_location_text, services_needed, getting_ready_location, budget_amount, currency, contact_name, contact_email, contact_phone, additional_details) {
    const requests = this._getFromStorage('destination_quote_requests');
    const now = new Date().toISOString();

    const req = {
      id: this._generateId('dest_quote'),
      event_date: new Date(event_date + 'T00:00:00').toISOString(),
      event_location_text,
      services_needed: Array.isArray(services_needed) ? services_needed : [],
      getting_ready_location,
      budget_amount: typeof budget_amount === 'number' ? budget_amount : 0,
      currency: currency || 'USD',
      contact_name,
      contact_email,
      contact_phone,
      additional_details: additional_details || null,
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('destination_quote_requests', requests);

    return {
      destination_quote_request: req,
      success: true,
      confirmation_message: 'Your destination wedding quote request has been submitted.'
    };
  }

  // searchBlogPosts(query, category_tag, limit, offset)
  searchBlogPosts(query, category_tag, limit, offset) {
    const posts = this._getFromStorage('blog_posts').filter(p => p.status === 'published');
    const q = query ? String(query).toLowerCase() : null;
    const cat = category_tag ? String(category_tag).toLowerCase() : null;

    let results = posts.filter(p => {
      if (q) {
        const text = (String(p.title || '') + ' ' + String(p.summary || '') + ' ' + String(p.content || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (cat) {
        const tags = Array.isArray(p.category_tags)
          ? p.category_tags.map(t => String(t).toLowerCase())
          : [];
        if (!tags.includes(cat)) return false;
      }
      return true;
    });

    results.sort((a, b) => {
      const ad = a.published_at || '';
      const bd = b.published_at || '';
      return ad < bd ? 1 : ad > bd ? -1 : 0;
    });

    const lim = typeof limit === 'number' ? limit : 10;
    const off = typeof offset === 'number' ? offset : 0;
    return results.slice(off, off + lim);
  }

  // getBlogPostDetails(blogPostId)
  getBlogPostDetails(blogPostId) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find(p => p.id === blogPostId) || null;
    if (!post) {
      return { post: null, related_posts: [] };
    }

    const related_posts = posts
      .filter(p => p.id !== post.id && p.status === 'published')
      .filter(p => {
        const tagsA = Array.isArray(post.category_tags) ? post.category_tags : [];
        const tagsB = Array.isArray(p.category_tags) ? p.category_tags : [];
        return tagsA.some(t => tagsB.includes(t));
      })
      .sort((a, b) => {
        const ad = a.published_at || '';
        const bd = b.published_at || '';
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      })
      .slice(0, 3);

    return {
      post,
      related_posts
    };
  }

  // getBlogRecommendedHairstyles(blogPostId)
  getBlogRecommendedHairstyles(blogPostId) {
    const links = this._getFromStorage('blog_recommended_hairstyles');
    const posts = this._getFromStorage('blog_posts');
    const hairstyles = this._getFromStorage('hairstyles');

    const filtered = links
      .filter(l => l.blog_post_id === blogPostId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    // Ensure any recommended hairstyles that are not yet in the hairstyles
    // collection get basic placeholder entries so that details/favorites
    // lookups work correctly.
    const existingIds = new Set(hairstyles.map(h => h.id));
    let didAdd = false;
    const enhancedHairstyles = hairstyles.slice();

    for (const link of filtered) {
      if (!existingIds.has(link.hairstyle_id)) {
        existingIds.add(link.hairstyle_id);
        enhancedHairstyles.push({
          id: link.hairstyle_id,
          name: link.title || 'Recommended Bridal Hairstyle',
          slug: String(link.hairstyle_id),
          description: link.section_name
            ? `${link.section_name}: ${link.title || ''}`
            : (link.title || ''),
          main_image_url: null,
          gallery_image_urls: [],
          hair_length: null,
          style_type: null,
          accessory_tags: [],
          has_veil: false,
          has_braid: !!link.is_braided_recommendation,
          has_accessories: !!link.is_accessories_recommendation,
          is_trend_2025: true,
          created_at: new Date().toISOString()
        });
        didAdd = true;
      }
    }

    if (didAdd) {
      this._saveToStorage('hairstyles', enhancedHairstyles);
    }

    return filtered.map(l => {
      const blog_post = posts.find(p => p.id === l.blog_post_id) || null;
      const hairstyle = enhancedHairstyles.find(h => h.id === l.hairstyle_id) || null;
      return Object.assign({}, l, { blog_post, hairstyle });
    });
  }

  // getHairstyleDetails(hairstyleId)
  getHairstyleDetails(hairstyleId) {
    const hairstyle = this._getHairstyleById(hairstyleId);
    if (!hairstyle) {
      return { hairstyle: null, is_favorited: false };
    }
    const favorites = this._getFromStorage('favorite_items');
    const is_favorited = favorites.some(f => f.hairstyle_id === hairstyleId);
    return { hairstyle, is_favorited };
  }

  // getAboutAndPoliciesContent
  getAboutAndPoliciesContent() {
    return {
      about_text:
        'Our bridal hairstyling team is dedicated to creating timeless, photo-ready looks that feel comfortable and last all night. We work with brides across a range of styles, from soft romantic waves to intricate updos.',
      team_members: [],
      service_areas_summary:
        'We primarily serve the greater metro area for on-site weddings and travel for destination events upon request.',
      cancellation_policy_summary:
        'Cancellations made more than 30 days before the event date may be eligible for partial refund or credit, according to your signed agreement.',
      terms_of_service_text:
        'All bookings are subject to availability and require a signed agreement and retainer to secure the date.',
      privacy_policy_text:
        'We respect your privacy and use your information only to manage your bookings, payments, and communication about your services.'
    };
  }
}

// Global exposure for browser and Node.js
if (typeof globalThis !== 'undefined') {
  // Attach to globalThis rather than window to avoid direct window/document usage
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
