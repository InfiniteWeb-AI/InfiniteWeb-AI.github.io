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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const tableKeys = [
      'treatment_categories',
      'treatments',
      'packages',
      'membership_plans',
      'providers',
      'locations',
      'appointment_slots',
      'appointments',
      'product_categories',
      'products',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'events',
      'event_registrations',
      'contact_messages',
      'wishlists',
      'wishlist_items',
      'cost_estimates',
      'cost_estimate_items',
      'pricing_sections',
      'faqs',
      'legal_pages'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // About page content as single object (or null)
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify(null));
    }

    // Generic id counter
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

  // ----------------------
  // Generic helpers
  // ----------------------
  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _dateToISODate(date) {
    if (!date) return null;
    return date.toISOString().slice(0, 10);
  }

  _timeFromDate(dateOrString) {
    if (!dateOrString) return null;
    if (typeof dateOrString === 'string') {
      const match = dateOrString.match(/T(\d{2}:\d{2})/);
      if (match) return match[1];
      return null;
    }
    return dateOrString.toISOString().slice(11, 16); // HH:MM
  }

  _compareTimes(t1, t2) {
    // t1, t2: 'HH:MM'
    return t1.localeCompare(t2);
  }

  _paginate(array, page = 1, pageSize = 20) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    return array.slice(start, start + ps);
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    const cartId = localStorage.getItem('currentCartId');
    let cart = cartId ? carts.find(c => c.id === cartId) : null;

    if (!cart) {
      const newCart = {
        id: this._generateId('cart'),
        items: [], // CartItem IDs
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(newCart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('currentCartId', newCart.id);
      return newCart;
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    const subtotal = cartItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const tax = 0; // No tax calculation logic specified
    const total = subtotal + tax;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;
    cart.currency = cart.currency || 'USD';
    cart.updated_at = new Date().toISOString();

    // Persist
    let carts = this._getFromStorage('cart');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    const wishlistId = localStorage.getItem('currentWishlistId');
    let wishlist = wishlistId ? wishlists.find(w => w.id === wishlistId) : null;

    if (!wishlist) {
      const newWishlist = {
        id: this._generateId('wishlist'),
        items: [], // WishlistItem IDs
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      wishlists.push(newWishlist);
      this._saveToStorage('wishlists', wishlists);
      localStorage.setItem('currentWishlistId', newWishlist.id);
      return newWishlist;
    }

    return wishlist;
  }

  _calculateEstimateTotals(estimate, estimateItems) {
    const total = estimateItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
    estimate.total_price = total;
    estimate.currency = estimate.currency || 'USD';
    return estimate;
  }

  _validateAppointmentSlotAvailability(slotId) {
    if (!slotId) return { success: true, slot: null };
    const slots = this._getFromStorage('appointment_slots');
    const slot = slots.find(s => s.id === slotId);
    if (!slot) {
      return { success: false, message: 'appointment_slot_not_found', slot: null };
    }
    if (slot.is_booked) {
      return { success: false, message: 'appointment_slot_already_booked', slot: slot };
    }
    return { success: true, slot };
  }

  _generateOrderNumber() {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return 'ORD-' + ts + '-' + rand;
  }

  _sendEmailNotification(/* type, payload */) {
    // No-op for business-logic-only implementation
    return true;
  }

  _mapEntityToDisplayFields(entity, type) {
    if (!entity) return null;
    const copy = { ...entity };
    if (type === 'treatment_category' && copy.display_order !== undefined) {
      copy.displayOrder = copy.display_order;
    }
    if (type === 'product_category' && copy.display_order !== undefined) {
      copy.displayOrder = copy.display_order;
    }
    return copy;
  }

  // ----------------------
  // 1. getHomepageOverview
  // ----------------------
  getHomepageOverview() {
    const treatments = this._getFromStorage('treatments');
    const treatmentCategories = this._getFromStorage('treatment_categories');
    const products = this._getFromStorage('products');
    const productCategories = this._getFromStorage('product_categories');
    const events = this._getFromStorage('events');
    const providers = this._getFromStorage('providers');
    const locations = this._getFromStorage('locations');

    // Featured treatment categories: top by display_order
    const featuredTreatmentCategories = treatmentCategories
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 4)
      .map(tc => ({
        categoryKey: tc.key,
        categoryName: tc.name,
        description: tc.description || '',
        treatmentCategory: tc // FK resolution-like enrichment
      }));

    // Featured treatments: available for booking, sorted by display_order
    const featuredTreatmentsRaw = treatments
      .filter(t => t.is_available_for_booking)
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 6);

    const featuredTreatments = featuredTreatmentsRaw.map(t => {
      const cat = treatmentCategories.find(c => c.key === t.category_key) || null;
      return {
        treatmentId: t.id,
        name: t.name,
        categoryKey: t.category_key,
        categoryName: cat ? cat.name : '',
        shortDescription: t.short_description || '',
        startingPrice: t.min_price != null ? t.min_price : (t.single_session_price || 0),
        currency: t.currency || 'USD',
        treatment: t,
        treatmentCategory: cat
      };
    });

    // Featured products: active, sorted by rating desc then price asc
    const featuredProductsRaw = products
      .filter(p => p.is_active)
      .slice()
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        return (a.price || 0) - (b.price || 0);
      })
      .slice(0, 6);

    const featuredProducts = featuredProductsRaw.map(p => {
      const cat = productCategories.find(c => c.key === p.category_key) || null;
      return {
        productId: p.id,
        name: p.name,
        categoryKey: p.category_key,
        categoryName: cat ? cat.name : '',
        price: p.price,
        currency: p.currency || 'USD',
        rating: p.rating || 0,
        imageUrl: p.image_url || '',
        product: p,
        productCategory: cat
      };
    });

    // Featured gift card product: first active gift_card product
    const giftCardProductRaw = products.find(
      p => p.product_type === 'gift_card' && p.category_key === 'gift_cards' && p.is_active
    ) || null;

    let featuredGiftCardProduct = null;
    if (giftCardProductRaw) {
      featuredGiftCardProduct = {
        productId: giftCardProductRaw.id,
        name: giftCardProductRaw.name,
        allowCustomAmount: !!giftCardProductRaw.allow_custom_amount,
        minAmount: giftCardProductRaw.min_amount || 0,
        maxAmount: giftCardProductRaw.max_amount || 0,
        supportedOccasionDesigns: giftCardProductRaw.supported_occasion_designs || [],
        supportedDeliveryMethods: giftCardProductRaw.supported_delivery_methods || [],
        product: giftCardProductRaw
      };
    } else {
      // Fallback featured gift card when none is configured in products
      const defaultGiftCard = {
        id: 'default_gift_card',
        name: 'Digital Gift Card',
        product_type: 'gift_card',
        category_key: 'gift_cards',
        allow_custom_amount: true,
        min_amount: 25,
        max_amount: 1000,
        supported_occasion_designs: ['mothers_day'],
        supported_delivery_methods: ['email_delivery'],
        is_active: true
      };
      // Persist the default gift card into products so cart logic can find it
      products.push(defaultGiftCard);
      this._saveToStorage('products', products);
      featuredGiftCardProduct = {
        productId: defaultGiftCard.id,
        name: defaultGiftCard.name,
        allowCustomAmount: true,
        minAmount: defaultGiftCard.min_amount,
        maxAmount: defaultGiftCard.max_amount,
        supportedOccasionDesigns: defaultGiftCard.supported_occasion_designs,
        supportedDeliveryMethods: defaultGiftCard.supported_delivery_methods,
        product: defaultGiftCard
      };
    }

    // Upcoming events (next ones, registration_open true)
    const now = new Date();
    const upcomingEventsRaw = events
      .filter(e => {
        const sd = this._parseDate(e.start_datetime);
        return e.registration_open && sd && sd >= now;
      })
      .slice()
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5);

    const upcomingEvents = upcomingEventsRaw.map(ev => ({
      eventId: ev.id,
      title: ev.title,
      topic: ev.topic || '',
      startDatetime: ev.start_datetime,
      defaultAttendanceType: ev.default_attendance_type || '',
      isFree: !!ev.is_free,
      event: ev,
      location: locations.find(l => l.id === ev.location_id) || null
    }));

    // Featured providers: pick a few, enrich with primary location name
    const featuredProviders = providers
      .slice()
      .sort((a, b) => (b.years_of_experience || 0) - (a.years_of_experience || 0))
      .slice(0, 4)
      .map(pr => {
        const primaryLocation = locations.find(l => l.id === pr.primary_location_id) || null;
        return {
          providerId: pr.id,
          fullName: pr.full_name,
          role: pr.role,
          specialties: pr.specialties || [],
          yearsOfExperience: pr.years_of_experience || 0,
          primaryLocationName: primaryLocation ? primaryLocation.name : '',
          provider: pr,
          primaryLocation
        };
      });

    return {
      heroHeadline: 'Cosmetic Dermatology & Aesthetic Care',
      heroSubheadline: 'Science-backed skincare, injectables, and laser treatments tailored to you.',
      primaryCtas: [
        { label: 'Book Consultation', targetPageKey: 'book_consultation' },
        { label: 'Shop Skincare', targetPageKey: 'shop_skincare' },
        { label: 'View Treatments', targetPageKey: 'view_treatments' }
      ],
      featuredTreatmentCategories,
      featuredTreatments,
      featuredProducts,
      featuredGiftCardProduct,
      upcomingEvents,
      featuredProviders
    };
  }

  // ----------------------
  // 2. Treatment category & search
  // ----------------------
  getTreatmentCategories() {
    const cats = this._getFromStorage('treatment_categories');
    return cats
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(c => ({
        id: c.id,
        key: c.key,
        name: c.name,
        description: c.description || '',
        displayOrder: c.display_order || 0
      }));
  }

  searchTreatments(
    categoryKey,
    concernTags,
    bodyArea,
    minSingleSessionPrice,
    maxSingleSessionPrice,
    minSessionsPerPackageDefault,
    locationId,
    isFaceFocused,
    isBodyFocused,
    sortBy = 'display_order',
    page = 1,
    pageSize = 20
  ) {
    const treatments = this._getFromStorage('treatments');
    const cats = this._getFromStorage('treatment_categories');

    let filtered = treatments.slice();

    if (categoryKey) {
      filtered = filtered.filter(t => t.category_key === categoryKey);
    }

    if (concernTags && concernTags.length) {
      filtered = filtered.filter(t => {
        const tags = t.concern_tags || [];
        return concernTags.every(ct => tags.includes(ct));
      });
    }

    if (bodyArea) {
      filtered = filtered.filter(t => (t.body_areas_covered || []).includes(bodyArea));
    }

    if (minSingleSessionPrice != null) {
      filtered = filtered.filter(t => (t.single_session_price || 0) >= minSingleSessionPrice);
    }

    if (maxSingleSessionPrice != null) {
      filtered = filtered.filter(t => (t.single_session_price || 0) <= maxSingleSessionPrice);
    }

    if (minSessionsPerPackageDefault != null) {
      filtered = filtered.filter(
        t => (t.sessions_per_package_default || 0) >= minSessionsPerPackageDefault
      );
    }

    if (locationId) {
      filtered = filtered.filter(t => (t.locations_available || []).includes(locationId));
    }

    if (typeof isFaceFocused === 'boolean') {
      filtered = filtered.filter(t => !!t.is_face_focused === isFaceFocused);
    }

    if (typeof isBodyFocused === 'boolean') {
      filtered = filtered.filter(t => !!t.is_body_focused === isBodyFocused);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': {
          const pa = a.single_session_price || a.min_price || 0;
          const pb = b.single_session_price || b.min_price || 0;
          return pa - pb;
        }
        case 'price_desc': {
          const pa = a.single_session_price || a.min_price || 0;
          const pb = b.single_session_price || b.min_price || 0;
          return pb - pa;
        }
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'display_order':
        default:
          return (a.display_order || 0) - (b.display_order || 0);
      }
    });

    const totalCount = filtered.length;
    const paged = this._paginate(filtered, page, pageSize);

    const results = paged.map(t => {
      const cat = cats.find(c => c.key === t.category_key) || null;
      return {
        id: t.id,
        name: t.name,
        categoryKey: t.category_key,
        categoryName: cat ? cat.name : '',
        shortDescription: t.short_description || '',
        singleSessionPrice: t.single_session_price || null,
        minPrice: t.min_price || null,
        maxPrice: t.max_price || null,
        currency: t.currency || 'USD',
        isFaceFocused: !!t.is_face_focused,
        isBodyFocused: !!t.is_body_focused,
        focusAreaType: t.focus_area_type || null,
        bodyAreasCovered: t.body_areas_covered || [],
        sessionsPerPackageDefault: t.sessions_per_package_default || 0,
        isAvailableForBooking: !!t.is_available_for_booking
      };
    });

    return {
      treatments: results,
      totalCount
    };
  }

  getTreatmentDetails(treatmentId) {
    const treatments = this._getFromStorage('treatments');
    const cats = this._getFromStorage('treatment_categories');
    const locations = this._getFromStorage('locations');

    const t = treatments.find(tr => tr.id === treatmentId);
    if (!t) return null;

    const cat = cats.find(c => c.key === t.category_key) || null;
    const locsAvailable = (t.locations_available || []).map(locId => {
      const loc = locations.find(l => l.id === locId) || null;
      return {
        locationId: locId,
        locationName: loc ? loc.name : '',
        city: loc ? loc.city : '',
        location: loc
      };
    });

    return {
      id: t.id,
      name: t.name,
      slug: t.slug || '',
      categoryKey: t.category_key,
      categoryName: cat ? cat.name : '',
      shortDescription: t.short_description || '',
      longDescription: t.long_description || '',
      isFaceFocused: !!t.is_face_focused,
      isBodyFocused: !!t.is_body_focused,
      focusAreaType: t.focus_area_type || null,
      bodyAreasCovered: t.body_areas_covered || [],
      concernTags: t.concern_tags || [],
      singleSessionPrice: t.single_session_price || null,
      minPrice: t.min_price || null,
      maxPrice: t.max_price || null,
      currency: t.currency || 'USD',
      sessionsPerPackageDefault: t.sessions_per_package_default || 0,
      packageOptions: t.package_options || [],
      isAvailableForBooking: !!t.is_available_for_booking,
      isAvailableInEstimator: !!t.is_available_in_estimator,
      estimatorCategory: t.estimator_category || 'none',
      locationsAvailable: locsAvailable
    };
  }

  getRelatedOffersForTreatment(treatmentId) {
    const treatments = this._getFromStorage('treatments');
    const packages = this._getFromStorage('packages');
    const membershipPlans = this._getFromStorage('membership_plans');
    const treatmentCategories = this._getFromStorage('treatment_categories');

    const t = treatments.find(tr => tr.id === treatmentId);
    if (!t) {
      return {
        relatedTreatments: [],
        relatedPackages: [],
        relatedMemberships: []
      };
    }

    const sameCategoryTreatments = treatments.filter(
      tr => tr.id !== t.id && tr.category_key === t.category_key
    );

    const relatedTreatments = sameCategoryTreatments.slice(0, 4).map(rt => {
      const cat = treatmentCategories.find(c => c.key === rt.category_key) || null;
      return {
        treatmentId: rt.id,
        name: rt.name,
        categoryName: cat ? cat.name : '',
        shortDescription: rt.short_description || '',
        startingPrice: rt.min_price != null ? rt.min_price : (rt.single_session_price || 0),
        currency: rt.currency || 'USD',
        treatment: rt
      };
    });

    const relatedPackagesRaw = packages.filter(pkg =>
      (pkg.treatment_ids || []).includes(t.id) && pkg.is_active
    );

    const relatedPackages = relatedPackagesRaw.map(pkg => ({
      packageId: pkg.id,
      name: pkg.name,
      categoryKey: pkg.category_key,
      areasCovered: pkg.areas_covered || [],
      sessionsPerPackage: pkg.sessions_per_package,
      pricePerSession: pkg.price_per_session,
      totalPrice: pkg.total_price,
      currency: pkg.currency || 'USD',
      package: pkg
    }));

    const relatedMembershipsRaw = membershipPlans.filter(mp => mp.is_active);
    const relatedMemberships = relatedMembershipsRaw.map(mp => ({
      membershipPlanId: mp.id,
      name: mp.name,
      category: mp.category,
      monthlyPrice: mp.monthly_price,
      currency: mp.currency || 'USD',
      membershipPlan: mp
    }));

    return {
      relatedTreatments,
      relatedPackages,
      relatedMemberships
    };
  }

  // ----------------------
  // 3. Products & cart
  // ----------------------
  getProductCategories() {
    const cats = this._getFromStorage('product_categories');
    return cats
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(c => ({
        id: c.id,
        key: c.key,
        name: c.name,
        description: c.description || '',
        displayOrder: c.display_order || 0
      }));
  }

  getProductFilterOptions(categoryKey) {
    const products = this._getFromStorage('products');

    let filtered = products.filter(p => p.is_active);
    if (categoryKey) {
      filtered = filtered.filter(p => p.category_key === categoryKey);
    }

    let minPrice = null;
    let maxPrice = null;
    filtered.forEach(p => {
      if (minPrice === null || p.price < minPrice) minPrice = p.price;
      if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
    });

    const ratingOptions = [1, 2, 3, 4, 5].map(v => ({
      value: v,
      label: v + '+ stars'
    }));

    const attributeFilters = {
      spf50PlusAvailable: filtered.some(p => !!p.is_spf_50_plus),
      vitaminCAvailable: filtered.some(p => !!p.is_vitamin_c)
    };

    return {
      priceRange: {
        minPrice: minPrice != null ? minPrice : 0,
        maxPrice: maxPrice != null ? maxPrice : 0
      },
      ratingOptions,
      attributeFilters
    };
  }

  searchProducts(
    query,
    categoryKey,
    minPrice,
    maxPrice,
    minRating,
    isVitaminC,
    isSpf50Plus,
    sortBy = 'relevance',
    page = 1,
    pageSize = 20
  ) {
    const products = this._getFromStorage('products');
    const productCategories = this._getFromStorage('product_categories');

    let filtered = products.filter(p => p.is_active);

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(p => {
        const name = (p.name || '').toLowerCase();
        const keywords = (p.keywords || []).map(k => (k || '').toLowerCase());
        return name.includes(q) || keywords.some(k => k.includes(q));
      });
    }

    if (categoryKey) {
      filtered = filtered.filter(p => p.category_key === categoryKey);
    }

    if (minPrice != null) {
      filtered = filtered.filter(p => (p.price || 0) >= minPrice);
    }

    if (maxPrice != null) {
      filtered = filtered.filter(p => (p.price || 0) <= maxPrice);
    }

    if (minRating != null) {
      filtered = filtered.filter(p => (p.rating || 0) >= minRating);
    }

    if (typeof isVitaminC === 'boolean') {
      filtered = filtered.filter(p => !!p.is_vitamin_c === isVitaminC);
    }

    if (typeof isSpf50Plus === 'boolean') {
      filtered = filtered.filter(p => !!p.is_spf_50_plus === isSpf50Plus);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        case 'rating_desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'relevance':
        default:
          // No explicit relevance scoring; keep as-is
          return 0;
      }
    });

    const totalCount = filtered.length;
    const paged = this._paginate(filtered, page, pageSize);

    const results = paged.map(p => {
      const cat = productCategories.find(c => c.key === p.category_key) || null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug || '',
        productType: p.product_type,
        categoryKey: p.category_key,
        categoryName: cat ? cat.name : '',
        price: p.price,
        currency: p.currency || 'USD',
        rating: p.rating || 0,
        reviewCount: p.review_count || 0,
        description: p.description || '',
        imageUrl: p.image_url || '',
        isSpf50Plus: !!p.is_spf_50_plus,
        spfValue: p.spf_value || null,
        isVitaminC: !!p.is_vitamin_c,
        size: p.size || ''
      };
    });

    return { products: results, totalCount };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const productCategories = this._getFromStorage('product_categories');

    const p = products.find(pr => pr.id === productId);
    if (!p) return null;

    const cat = productCategories.find(c => c.key === p.category_key) || null;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug || '',
      productType: p.product_type,
      categoryKey: p.category_key,
      categoryName: cat ? cat.name : '',
      price: p.price,
      currency: p.currency || 'USD',
      rating: p.rating || 0,
      reviewCount: p.review_count || 0,
      description: p.description || '',
      ingredients: p.ingredients || '',
      usageInstructions: p.usage_instructions || '',
      imageUrl: p.image_url || '',
      size: p.size || '',
      spfValue: p.spf_value || null,
      isSpf50Plus: !!p.is_spf_50_plus,
      isVitaminC: !!p.is_vitamin_c,
      allowCustomAmount: !!p.allow_custom_amount,
      minAmount: p.min_amount || null,
      maxAmount: p.max_amount || null,
      supportedDeliveryMethods: p.supported_delivery_methods || [],
      supportedOccasionDesigns: p.supported_occasion_designs || [],
      maxQuantityPerOrder: p.max_quantity_per_order || null,
      stockQuantity: p.stock_quantity || null,
      isActive: !!p.is_active
    };
  }

  addProductToCart(productId, quantity = 1) {
    const products = this._getFromStorage('products');
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('cart');

    const product = products.find(p => p.id === productId && p.product_type === 'skincare');
    if (!product || !product.is_active) {
      return { success: false, message: 'product_not_found_or_inactive' };
    }

    const cart = this._getOrCreateCart();
    carts = this._getFromStorage('cart'); // refresh after potential creation

    const existingItem = cartItems.find(
      ci => ci.cart_id === cart.id && ci.product_id === product.id && !ci.is_gift_card
    );

    const unitPrice = product.price;
    let cartItem;

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.line_total = existingItem.quantity * unitPrice;
      cartItem = existingItem;
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: product.id,
        product_type: 'skincare',
        product_name_snapshot: product.name,
        quantity: quantity,
        unit_price: unitPrice,
        line_total: unitPrice * quantity,
        created_at: new Date().toISOString(),
        is_gift_card: false,
        gift_card_amount: null,
        gift_card_delivery_method: null,
        gift_card_occasion_design: null,
        gift_card_recipient_name: null,
        gift_card_recipient_email: null,
        gift_card_sender_name: null,
        gift_card_message: null
      };
      cartItems.push(cartItem);
      cart.items.push(cartItem.id);
    }

    this._saveToStorage('cart_items', cartItems);

    // Update cart list
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = cart;
      this._saveToStorage('cart', carts);
    }

    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cartId: updatedCart.id,
      cartItem: {
        cartItemId: cartItem.id,
        productId: cartItem.product_id,
        productName: cartItem.product_name_snapshot,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unit_price,
        lineTotal: cartItem.line_total,
        currency: updatedCart.currency
      },
      cartSummary: {
        itemCount: this._getFromStorage('cart_items').filter(ci => ci.cart_id === updatedCart.id).reduce((sum, ci) => sum + ci.quantity, 0),
        subtotal: updatedCart.subtotal,
        tax: updatedCart.tax,
        total: updatedCart.total,
        currency: updatedCart.currency
      },
      message: 'product_added_to_cart'
    };
  }

  addGiftCardToCart(
    productId,
    amount,
    deliveryMethod,
    occasionDesign,
    recipientName,
    recipientEmail,
    senderName,
    message,
    quantity = 1
  ) {
    const products = this._getFromStorage('products');
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('cart');

    const product = products.find(p => p.id === productId && p.product_type === 'gift_card');
    if (!product || !product.is_active) {
      return { success: false, message: 'gift_card_product_not_found_or_inactive' };
    }

    if (product.allow_custom_amount) {
      if (amount < (product.min_amount || 0) || amount > (product.max_amount || Infinity)) {
        return { success: false, message: 'gift_card_amount_out_of_range' };
      }
    } else if (amount !== product.price) {
      return { success: false, message: 'gift_card_amount_invalid_for_fixed_value' };
    }

    if (deliveryMethod === 'email_delivery' && !recipientEmail) {
      return { success: false, message: 'recipient_email_required_for_email_delivery' };
    }

    const cart = this._getOrCreateCart();
    carts = this._getFromStorage('cart');

    const unitPrice = amount;

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      product_id: product.id,
      product_type: 'gift_card',
      product_name_snapshot: product.name,
      quantity: quantity,
      unit_price: unitPrice,
      line_total: unitPrice * quantity,
      created_at: new Date().toISOString(),
      is_gift_card: true,
      gift_card_amount: amount,
      gift_card_delivery_method: deliveryMethod,
      gift_card_occasion_design: occasionDesign,
      gift_card_recipient_name: recipientName,
      gift_card_recipient_email: recipientEmail || null,
      gift_card_sender_name: senderName,
      gift_card_message: message || ''
    };

    cartItems.push(cartItem);
    cart.items.push(cartItem.id);
    this._saveToStorage('cart_items', cartItems);

    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = cart;
      this._saveToStorage('cart', carts);
    }

    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cartId: updatedCart.id,
      cartItem: {
        cartItemId: cartItem.id,
        productId: cartItem.product_id,
        productName: cartItem.product_name_snapshot,
        isGiftCard: true,
        giftCardAmount: cartItem.gift_card_amount,
        giftCardDeliveryMethod: cartItem.gift_card_delivery_method,
        giftCardOccasionDesign: cartItem.gift_card_occasion_design,
        giftCardRecipientName: cartItem.gift_card_recipient_name,
        giftCardRecipientEmail: cartItem.gift_card_recipient_email,
        giftCardSenderName: cartItem.gift_card_sender_name,
        giftCardMessage: cartItem.gift_card_message,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unit_price,
        lineTotal: cartItem.line_total,
        currency: updatedCart.currency
      },
      cartSummary: {
        itemCount: this._getFromStorage('cart_items').filter(ci => ci.cart_id === updatedCart.id).reduce((sum, ci) => sum + ci.quantity, 0),
        subtotal: updatedCart.subtotal,
        tax: updatedCart.tax,
        total: updatedCart.total,
        currency: updatedCart.currency
      },
      message: 'gift_card_added_to_cart'
    };
  }

  getCartSummary() {
    const cartId = localStorage.getItem('currentCartId');
    const carts = this._getFromStorage('cart');
    const cart = carts.find(c => c.id === cartId) || null;
    const products = this._getFromStorage('products');

    if (!cart) {
      return {
        cartId: null,
        items: [],
        itemCount: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'USD'
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);

    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cartItemId: ci.id,
        productId: ci.product_id,
        productName: ci.product_name_snapshot,
        productType: ci.product_type,
        isGiftCard: !!ci.is_gift_card,
        quantity: ci.quantity,
        unitPrice: ci.unit_price,
        lineTotal: ci.line_total,
        currency: cart.currency || 'USD',
        giftCardAmount: ci.gift_card_amount || null,
        giftCardDeliveryMethod: ci.gift_card_delivery_method || null,
        giftCardOccasionDesign: ci.gift_card_occasion_design || null,
        giftCardRecipientName: ci.gift_card_recipient_name || null,
        giftCardRecipientEmail: ci.gift_card_recipient_email || null,
        giftCardSenderName: ci.gift_card_sender_name || null,
        giftCardMessage: ci.gift_card_message || null,
        product
      };
    });

    const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

    return {
      cartId: cart.id,
      items,
      itemCount,
      subtotal: cart.subtotal,
      tax: cart.tax,
      total: cart.total,
      currency: cart.currency || 'USD'
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('cart');

    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, message: 'cart_item_not_found' };
    }

    const item = cartItems[itemIndex];

    if (quantity <= 0) {
      // Remove instead
      return this.removeCartItem(cartItemId);
    }

    item.quantity = quantity;
    item.line_total = item.unit_price * item.quantity;
    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    const cartSummary = {
      itemCount: this._getFromStorage('cart_items').filter(ci => ci.cart_id === updatedCart.id).reduce((sum, ci) => sum + ci.quantity, 0),
      subtotal: updatedCart.subtotal,
      tax: updatedCart.tax,
      total: updatedCart.total,
      currency: updatedCart.currency
    };

    return {
      success: true,
      updatedItem: {
        cartItemId: item.id,
        quantity: item.quantity,
        lineTotal: item.line_total
      },
      cartSummary,
      message: 'cart_item_quantity_updated'
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('cart');

    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, message: 'cart_item_not_found' };
    }

    const item = cartItems[itemIndex];
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === item.cart_id) || null;
    if (cart) {
      cart.items = (cart.items || []).filter(id => id !== item.id);
      const updatedCart = this._recalculateCartTotals(cart);
      const cartSummary = {
        itemCount: this._getFromStorage('cart_items').filter(ci => ci.cart_id === updatedCart.id).reduce((sum, ci) => sum + ci.quantity, 0),
        subtotal: updatedCart.subtotal,
        tax: updatedCart.tax,
        total: updatedCart.total,
        currency: updatedCart.currency
      };
      return {
        success: true,
        cartSummary,
        message: 'cart_item_removed'
      };
    }

    return {
      success: true,
      cartSummary: {
        itemCount: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'USD'
      },
      message: 'cart_item_removed'
    };
  }

  placeOrderFromCart(
    billingName,
    billingEmail,
    billingAddressLine1,
    billingAddressLine2,
    billingCity,
    billingPostalCode,
    billingCountry,
    paymentMethod = 'card',
    cardNumber,
    cardExpiryMonth,
    cardExpiryYear,
    cardCvv
  ) {
    const cartId = localStorage.getItem('currentCartId');
    let carts = this._getFromStorage('cart');
    let cart = carts.find(c => c.id === cartId) || null;

    if (!cart) {
      return { success: false, message: 'cart_not_found' };
    }

    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cart.id);
    if (!cartItems.length) {
      return { success: false, message: 'cart_empty' };
    }

    // Simple mock payment validation: accept any cardNumber (including mock 4111...) as success
    const orderId = this._generateId('order');
    const orderNumber = this._generateOrderNumber();
    const placedAt = new Date().toISOString();

    const orderItems = [];
    const products = this._getFromStorage('products');

    cartItems.forEach(ci => {
      const oi = {
        id: this._generateId('orderitem'),
        order_id: orderId,
        product_id: ci.product_id,
        product_type: ci.product_type,
        product_name_snapshot: ci.product_name_snapshot,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        is_gift_card: !!ci.is_gift_card,
        gift_card_amount: ci.gift_card_amount || null,
        gift_card_delivery_method: ci.gift_card_delivery_method || null,
        gift_card_occasion_design: ci.gift_card_occasion_design || null,
        gift_card_recipient_name: ci.gift_card_recipient_name || null,
        gift_card_recipient_email: ci.gift_card_recipient_email || null,
        gift_card_sender_name: ci.gift_card_sender_name || null,
        gift_card_message: ci.gift_card_message || null
      };
      orderItems.push(oi);
    });

    const orders = this._getFromStorage('orders');

    const order = {
      id: orderId,
      order_number: orderNumber,
      cart_id: cart.id,
      items: orderItems.map(oi => oi.id),
      subtotal: cart.subtotal,
      tax: cart.tax,
      total: cart.total,
      currency: cart.currency || 'USD',
      status: 'paid',
      payment_method: paymentMethod,
      billing_name: billingName,
      billing_email: billingEmail,
      billing_address_line1: billingAddressLine1 || '',
      billing_address_line2: billingAddressLine2 || '',
      billing_city: billingCity || '',
      billing_postal_code: billingPostalCode || '',
      billing_country: billingCountry || '',
      card_last4: cardNumber ? String(cardNumber).slice(-4) : '',
      placed_at: placedAt
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    const existingOrderItems = this._getFromStorage('order_items');
    this._saveToStorage('order_items', existingOrderItems.concat(orderItems));

    // Clear cart
    const remainingCartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);
    carts = carts.filter(c => c.id !== cart.id);
    this._saveToStorage('cart', carts);
    localStorage.removeItem('currentCartId');

    // Build response order with items and resolved products
    const responseItems = orderItems.map(oi => {
      const product = products.find(p => p.id === oi.product_id) || null;
      return {
        orderItemId: oi.id,
        productId: oi.product_id,
        productName: oi.product_name_snapshot,
        productType: oi.product_type,
        quantity: oi.quantity,
        unitPrice: oi.unit_price,
        lineTotal: oi.line_total,
        isGiftCard: !!oi.is_gift_card,
        giftCardAmount: oi.gift_card_amount || null,
        giftCardDeliveryMethod: oi.gift_card_delivery_method || null,
        giftCardOccasionDesign: oi.gift_card_occasion_design || null,
        giftCardRecipientName: oi.gift_card_recipient_name || null,
        giftCardRecipientEmail: oi.gift_card_recipient_email || null,
        giftCardSenderName: oi.gift_card_sender_name || null,
        giftCardMessage: oi.gift_card_message || null,
        product
      };
    });

    const responseOrder = {
      orderId: order.id,
      orderNumber: order.order_number,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      currency: order.currency,
      status: order.status,
      paymentMethod: order.payment_method,
      billingName: order.billing_name,
      billingEmail: order.billing_email,
      cardLast4: order.card_last4,
      placedAt: order.placed_at,
      items: responseItems
    };

    this._sendEmailNotification('order_confirmation', { order });

    return {
      success: true,
      order: responseOrder,
      message: 'order_placed_successfully'
    };
  }

  // ----------------------
  // 4. Pricing, packages, memberships
  // ----------------------
  getPricingSections() {
    const sections = this._getFromStorage('pricing_sections');
    return sections
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(s => ({
        id: s.id,
        key: s.key,
        name: s.name,
        description: s.description || '',
        displayOrder: s.display_order || 0
      }));
  }

  getPackagesByCategory(
    categoryKey,
    locationId,
    areas,
    maxPricePerSession,
    minSessionsPerPackage,
    sortBy = 'price_per_session_asc'
  ) {
    const packages = this._getFromStorage('packages');

    let filtered = packages.filter(pkg => pkg.category_key === categoryKey && pkg.is_active);

    if (locationId) {
      filtered = filtered.filter(pkg => (pkg.locations_available || []).includes(locationId));
    }

    if (areas && areas.length) {
      filtered = filtered.filter(pkg => {
        const covered = pkg.areas_covered || [];
        return areas.every(a => covered.includes(a));
      });
    }

    if (maxPricePerSession != null) {
      filtered = filtered.filter(pkg => (pkg.price_per_session || 0) <= maxPricePerSession);
    }

    if (minSessionsPerPackage != null) {
      filtered = filtered.filter(pkg => (pkg.sessions_per_package || 0) >= minSessionsPerPackage);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_per_session_desc':
          return (b.price_per_session || 0) - (a.price_per_session || 0);
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'price_per_session_asc':
        default:
          return (a.price_per_session || 0) - (b.price_per_session || 0);
      }
    });

    const results = filtered.map(pkg => ({
      packageId: pkg.id,
      name: pkg.name,
      categoryKey: pkg.category_key,
      description: pkg.description || '',
      areasCovered: pkg.areas_covered || [],
      sessionsPerPackage: pkg.sessions_per_package,
      pricePerSession: pkg.price_per_session,
      totalPrice: pkg.total_price,
      currency: pkg.currency || 'USD',
      isActive: !!pkg.is_active
    }));

    return {
      packages: results,
      totalCount: results.length
    };
  }

  getPackageDetails(packageId) {
    const packages = this._getFromStorage('packages');
    const locations = this._getFromStorage('locations');

    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return null;

    const locationsAvailable = (pkg.locations_available || []).map(locId => {
      const loc = locations.find(l => l.id === locId) || null;
      return {
        locationId: locId,
        locationName: loc ? loc.name : '',
        location: loc
      };
    });

    return {
      packageId: pkg.id,
      name: pkg.name,
      slug: pkg.slug || '',
      categoryKey: pkg.category_key,
      description: pkg.description || '',
      areasCovered: pkg.areas_covered || [],
      sessionsPerPackage: pkg.sessions_per_package,
      pricePerSession: pkg.price_per_session,
      totalPrice: pkg.total_price,
      currency: pkg.currency || 'USD',
      isActive: !!pkg.is_active,
      locationsAvailable
    };
  }

  getMembershipPlans(
    category,
    maxMonthlyPrice,
    includeInactive = false,
    sortBy = 'monthly_price_asc'
  ) {
    const plans = this._getFromStorage('membership_plans');

    let filtered = plans.slice();

    if (category) {
      filtered = filtered.filter(mp => mp.category === category);
    }

    if (!includeInactive) {
      filtered = filtered.filter(mp => mp.is_active);
    }

    if (maxMonthlyPrice != null) {
      filtered = filtered.filter(mp => (mp.monthly_price || 0) <= maxMonthlyPrice);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'monthly_price_desc':
          return (b.monthly_price || 0) - (a.monthly_price || 0);
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'monthly_price_asc':
        default:
          return (a.monthly_price || 0) - (b.monthly_price || 0);
      }
    });

    const membershipPlans = filtered.map(mp => ({
      membershipPlanId: mp.id,
      name: mp.name,
      slug: mp.slug || '',
      category: mp.category,
      description: mp.description || '',
      monthlyPrice: mp.monthly_price,
      currency: mp.currency || 'USD',
      minCommitmentMonths: mp.min_commitment_months || null,
      benefits: mp.benefits || [],
      isActive: !!mp.is_active
    }));

    return {
      membershipPlans,
      totalCount: membershipPlans.length
    };
  }

  getMembershipPlanDetails(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const mp = plans.find(m => m.id === membershipPlanId);
    if (!mp) return null;

    return {
      membershipPlanId: mp.id,
      name: mp.name,
      slug: mp.slug || '',
      category: mp.category,
      description: mp.description || '',
      monthlyPrice: mp.monthly_price,
      currency: mp.currency || 'USD',
      minCommitmentMonths: mp.min_commitment_months || null,
      benefits: mp.benefits || [],
      isActive: !!mp.is_active
    };
  }

  // ----------------------
  // 5. Treatment Cost Estimator
  // ----------------------
  getEstimatorTreatmentOptions(estimatorCategory, minPrice, maxPrice) {
    const treatments = this._getFromStorage('treatments');
    const categories = this._getFromStorage('treatment_categories');

    let filtered = treatments.filter(
      t => t.is_available_in_estimator && t.estimator_category === estimatorCategory
    );

    if (minPrice != null) {
      filtered = filtered.filter(t => (t.single_session_price || 0) >= minPrice);
    }

    if (maxPrice != null) {
      filtered = filtered.filter(t => (t.single_session_price || 0) <= maxPrice);
    }

    const results = filtered.map(t => {
      const cat = categories.find(c => c.key === t.category_key) || null;
      return {
        treatmentId: t.id,
        name: t.name,
        categoryName: cat ? cat.name : '',
        estimatorCategory: t.estimator_category,
        shortDescription: t.short_description || '',
        unitPrice: t.single_session_price || 0,
        currency: t.currency || 'USD'
      };
    });

    return {
      treatments: results,
      totalCount: results.length
    };
  }

  createCostEstimateAndSend(items, contactName, contactEmail, notes, sendVia = 'emailed') {
    const treatments = this._getFromStorage('treatments');

    if (!Array.isArray(items) || !items.length) {
      return { success: false, message: 'no_items_provided' };
    }

    const estimateId = this._generateId('estimate');
    const createdAt = new Date().toISOString();

    const estimateItems = [];

    for (const item of items) {
      const t = treatments.find(tr => tr.id === item.treatmentId);
      if (!t || !t.is_available_in_estimator) {
        return { success: false, message: 'invalid_treatment_in_estimate' };
      }
      if (t.estimator_category !== item.estimatorCategory) {
        return { success: false, message: 'estimator_category_mismatch' };
      }
      const qty = item.quantity || 1;
      const unitPrice = t.single_session_price || 0;
      const lineTotal = unitPrice * qty;
      const estimateItem = {
        id: this._generateId('estimateitem'),
        estimate_id: estimateId,
        treatment_id: t.id,
        estimator_category: item.estimatorCategory,
        treatment_name_snapshot: t.name,
        unit_price: unitPrice,
        quantity: qty,
        line_total: lineTotal
      };
      estimateItems.push(estimateItem);
    }

    const estimates = this._getFromStorage('cost_estimates');
    const estimate = {
      id: estimateId,
      items: estimateItems.map(ei => ei.id),
      total_price: 0,
      currency: 'USD',
      contact_name: contactName || '',
      contact_email: contactEmail || '',
      notes: notes || '',
      sent_via: sendVia || 'emailed',
      created_at: createdAt
    };

    this._calculateEstimateTotals(estimate, estimateItems);

    estimates.push(estimate);
    this._saveToStorage('cost_estimates', estimates);

    const existingItems = this._getFromStorage('cost_estimate_items');
    this._saveToStorage('cost_estimate_items', existingItems.concat(estimateItems));

    if (sendVia === 'emailed') {
      this._sendEmailNotification('cost_estimate', { estimate, items: estimateItems });
    }

    // Build response with resolved treatments
    const responseItems = estimateItems.map(ei => {
      const t = treatments.find(tr => tr.id === ei.treatment_id) || null;
      return {
        estimateItemId: ei.id,
        treatmentId: ei.treatment_id,
        treatmentName: ei.treatment_name_snapshot,
        estimatorCategory: ei.estimator_category,
        unitPrice: ei.unit_price,
        quantity: ei.quantity,
        lineTotal: ei.line_total,
        treatment: t
      };
    });

    const responseEstimate = {
      estimateId: estimate.id,
      items: responseItems,
      totalPrice: estimate.total_price,
      currency: estimate.currency,
      contactName: estimate.contact_name,
      contactEmail: estimate.contact_email,
      notes: estimate.notes,
      sentVia: estimate.sent_via,
      createdAt: estimate.created_at
    };

    return {
      success: true,
      estimate: responseEstimate,
      message: 'estimate_created'
    };
  }

  // ----------------------
  // 6. Wishlist
  // ----------------------
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(
      wi => wi.wishlist_id === wishlist.id
    );
    const treatments = this._getFromStorage('treatments');
    const membershipPlans = this._getFromStorage('membership_plans');
    const packages = this._getFromStorage('packages');
    const products = this._getFromStorage('products');

    const items = wishlistItems.map(wi => {
      let ref = null;
      if (wi.item_type === 'treatment') {
        ref = treatments.find(t => t.id === wi.item_ref_id) || null;
      } else if (wi.item_type === 'membership') {
        ref = membershipPlans.find(m => m.id === wi.item_ref_id) || null;
      } else if (wi.item_type === 'package') {
        ref = packages.find(p => p.id === wi.item_ref_id) || null;
      } else if (wi.item_type === 'product') {
        ref = products.find(p => p.id === wi.item_ref_id) || null;
      }

      return {
        wishlistItemId: wi.id,
        itemType: wi.item_type,
        itemRefId: wi.item_ref_id,
        itemName: wi.item_name_snapshot || (ref && ref.name) || '',
        addedAt: wi.added_at,
        itemRef: ref
      };
    });

    return {
      wishlistId: wishlist.id,
      items
    };
  }

  addTreatmentToWishlist(treatmentId) {
    const treatments = this._getFromStorage('treatments');
    const treatment = treatments.find(t => t.id === treatmentId);
    if (!treatment) {
      return { success: false, message: 'treatment_not_found' };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    let existing = wishlistItems.find(
      wi => wi.wishlist_id === wishlist.id && wi.item_type === 'treatment' && wi.item_ref_id === treatmentId
    );

    if (!existing) {
      existing = {
        id: this._generateId('wishlistitem'),
        wishlist_id: wishlist.id,
        item_type: 'treatment',
        item_ref_id: treatmentId,
        item_name_snapshot: treatment.name,
        added_at: new Date().toISOString()
      };
      wishlistItems.push(existing);
      wishlist.items.push(existing.id);
      this._saveToStorage('wishlist_items', wishlistItems);
      const wishlists = this._getFromStorage('wishlists');
      const idx = wishlists.findIndex(w => w.id === wishlist.id);
      if (idx !== -1) {
        wishlists[idx] = wishlist;
        this._saveToStorage('wishlists', wishlists);
      }
    }

    return {
      success: true,
      wishlistId: wishlist.id,
      wishlistItem: {
        wishlistItemId: existing.id,
        itemType: existing.item_type,
        itemRefId: existing.item_ref_id,
        itemName: existing.item_name_snapshot,
        addedAt: existing.added_at
      },
      message: 'treatment_added_to_wishlist'
    };
  }

  addMembershipToWishlist(membershipPlanId) {
    const membershipPlans = this._getFromStorage('membership_plans');
    const mp = membershipPlans.find(m => m.id === membershipPlanId);
    if (!mp) {
      return { success: false, message: 'membership_not_found' };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    let existing = wishlistItems.find(
      wi => wi.wishlist_id === wishlist.id && wi.item_type === 'membership' && wi.item_ref_id === membershipPlanId
    );

    if (!existing) {
      existing = {
        id: this._generateId('wishlistitem'),
        wishlist_id: wishlist.id,
        item_type: 'membership',
        item_ref_id: membershipPlanId,
        item_name_snapshot: mp.name,
        added_at: new Date().toISOString()
      };
      wishlistItems.push(existing);
      wishlist.items.push(existing.id);
      this._saveToStorage('wishlist_items', wishlistItems);
      const wishlists = this._getFromStorage('wishlists');
      const idx = wishlists.findIndex(w => w.id === wishlist.id);
      if (idx !== -1) {
        wishlists[idx] = wishlist;
        this._saveToStorage('wishlists', wishlists);
      }
    }

    return {
      success: true,
      wishlistId: wishlist.id,
      wishlistItem: {
        wishlistItemId: existing.id,
        itemType: existing.item_type,
        itemRefId: existing.item_ref_id,
        itemName: existing.item_name_snapshot,
        addedAt: existing.added_at
      },
      message: 'membership_added_to_wishlist'
    };
  }

  removeWishlistItem(wishlistItemId) {
    let wishlistItems = this._getFromStorage('wishlist_items');
    const wishlists = this._getFromStorage('wishlists');

    const item = wishlistItems.find(wi => wi.id === wishlistItemId);
    if (!item) {
      return { success: false, message: 'wishlist_item_not_found' };
    }

    wishlistItems = wishlistItems.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    const wishlist = wishlists.find(w => w.id === item.wishlist_id);
    if (wishlist) {
      wishlist.items = (wishlist.items || []).filter(id => id !== wishlistItemId);
      const idx = wishlists.findIndex(w => w.id === wishlist.id);
      if (idx !== -1) {
        wishlists[idx] = wishlist;
        this._saveToStorage('wishlists', wishlists);
      }
    }

    return {
      success: true,
      wishlistId: item.wishlist_id,
      message: 'wishlist_item_removed'
    };
  }

  // ----------------------
  // 7. Providers
  // ----------------------
  getProviderFilterOptions() {
    const providers = this._getFromStorage('providers');

    const roleSet = new Set();
    const specialtySet = new Set();

    providers.forEach(p => {
      if (p.role) roleSet.add(p.role);
      (p.specialties || []).forEach(s => specialtySet.add(s));
    });

    const roles = Array.from(roleSet).map(r => ({ value: r, label: r.replace(/_/g, ' ') }));
    const specialties = Array.from(specialtySet).map(s => ({
      value: s,
      label: s.replace(/_/g, ' ')
    }));

    return { roles, specialties };
  }

  searchProviders(
    role,
    specialties,
    locationId,
    isAcceptingNewPatients,
    sortBy = 'name_asc',
    page = 1,
    pageSize = 20
  ) {
    const providers = this._getFromStorage('providers');
    const locations = this._getFromStorage('locations');

    let filtered = providers.slice();

    if (role) {
      filtered = filtered.filter(p => p.role === role);
    }

    if (specialties && specialties.length) {
      filtered = filtered.filter(p => {
        const sp = p.specialties || [];
        return specialties.every(s => sp.includes(s));
      });
    }

    if (locationId) {
      filtered = filtered.filter(p => {
        const locIds = p.location_ids || [];
        return locIds.includes(locationId) || p.primary_location_id === locationId;
      });
    }

    if (typeof isAcceptingNewPatients === 'boolean') {
      filtered = filtered.filter(p => !!p.is_accepting_new_patients === isAcceptingNewPatients);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'experience_desc':
          return (b.years_of_experience || 0) - (a.years_of_experience || 0);
        case 'name_asc':
        default:
          return (a.full_name || '').localeCompare(b.full_name || '');
      }
    });

    const totalCount = filtered.length;
    const paged = this._paginate(filtered, page, pageSize);

    const results = paged.map(p => {
      const primaryLoc = locations.find(l => l.id === p.primary_location_id) || null;
      const locNames = (p.location_ids || [])
        .map(id => {
          const loc = locations.find(l => l.id === id);
          return loc ? loc.name : null;
        })
        .filter(Boolean);
      return {
        providerId: p.id,
        fullName: p.full_name,
        slug: p.slug || '',
        role: p.role,
        credentials: p.credentials || '',
        specialties: p.specialties || [],
        yearsOfExperience: p.years_of_experience || 0,
        primaryLocationName: primaryLoc ? primaryLoc.name : '',
        locationNames: locNames,
        photoUrl: p.photo_url || '',
        isAcceptingNewPatients: !!p.is_accepting_new_patients,
        bookingEnabled: !!p.booking_enabled
      };
    });

    return {
      providers: results,
      totalCount
    };
  }

  getProviderDetails(providerId) {
    const providers = this._getFromStorage('providers');
    const locations = this._getFromStorage('locations');

    const p = providers.find(pr => pr.id === providerId);
    if (!p) return null;

    const primaryLoc = locations.find(l => l.id === p.primary_location_id) || null;
    const locs = (p.location_ids || []).map(id => {
      const loc = locations.find(l => l.id === id) || null;
      return {
        locationId: id,
        locationName: loc ? loc.name : ''
      };
    });

    return {
      providerId: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      fullName: p.full_name,
      slug: p.slug || '',
      credentials: p.credentials || '',
      role: p.role,
      specialties: p.specialties || [],
      yearsOfExperience: p.years_of_experience || 0,
      bio: p.bio || '',
      primaryLocation: primaryLoc
        ? {
            locationId: primaryLoc.id,
            locationName: primaryLoc.name,
            city: primaryLoc.city
          }
        : null,
      locations: locs,
      photoUrl: p.photo_url || '',
      isAcceptingNewPatients: !!p.is_accepting_new_patients,
      bookingEnabled: !!p.booking_enabled
    };
  }

  // ----------------------
  // 8. Locations
  // ----------------------
  getLocations() {
    const locations = this._getFromStorage('locations');
    return locations.map(loc => ({
      locationId: loc.id,
      name: loc.name,
      slug: loc.slug || '',
      addressLine1: loc.address_line1,
      addressLine2: loc.address_line2 || '',
      city: loc.city,
      state: loc.state || '',
      postalCode: loc.postal_code || '',
      country: loc.country || '',
      phoneNumber: loc.phone_number || '',
      email: loc.email || '',
      hoursSummary: '',
      isMainLocation: !!loc.is_main_location,
      mapLat: loc.map_lat || null,
      mapLng: loc.map_lng || null
    }));
  }

  getLocationDetails(locationId) {
    const locations = this._getFromStorage('locations');
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return null;

    return {
      locationId: loc.id,
      name: loc.name,
      slug: loc.slug || '',
      addressLine1: loc.address_line1,
      addressLine2: loc.address_line2 || '',
      city: loc.city,
      state: loc.state || '',
      postalCode: loc.postal_code || '',
      country: loc.country || '',
      phoneNumber: loc.phone_number || '',
      email: loc.email || '',
      hoursMonday: loc.hours_monday || '',
      hoursTuesday: loc.hours_tuesday || '',
      hoursWednesday: loc.hours_wednesday || '',
      hoursThursday: loc.hours_thursday || '',
      hoursFriday: loc.hours_friday || '',
      hoursSaturday: loc.hours_saturday || '',
      hoursSunday: loc.hours_sunday || '',
      isMainLocation: !!loc.is_main_location,
      mapLat: loc.map_lat || null,
      mapLng: loc.map_lng || null
    };
  }

  // ----------------------
  // 9. Events & workshops
  // ----------------------
  getEventFilterOptions() {
    const events = this._getFromStorage('events');

    const topicSet = new Set();
    let earliest = null;
    let latest = null;

    events.forEach(ev => {
      if (ev.topic) topicSet.add(ev.topic);
      const sd = this._parseDate(ev.start_datetime);
      if (sd) {
        if (!earliest || sd < earliest) earliest = sd;
        if (!latest || sd > latest) latest = sd;
      }
    });

    const topics = Array.from(topicSet).map(t => ({ value: t, label: t }));

    return {
      topics,
      dateRange: {
        earliestUpcoming: earliest ? earliest.toISOString() : '',
        latestUpcoming: latest ? latest.toISOString() : ''
      }
    };
  }

  searchEvents(
    topicQuery,
    topicTags,
    startDateFrom,
    startDateTo,
    isFreeOnly,
    attendanceType,
    registrationOpenOnly = true,
    page = 1,
    pageSize = 20
  ) {
    const events = this._getFromStorage('events');

    const fromDate = startDateFrom ? this._parseDate(startDateFrom) : null;
    const toDate = startDateTo ? this._parseDate(startDateTo) : null;

    let filtered = events.slice();

    if (topicQuery) {
      const q = topicQuery.toLowerCase();
      filtered = filtered.filter(ev => {
        const title = (ev.title || '').toLowerCase();
        const topic = (ev.topic || '').toLowerCase();
        return title.includes(q) || topic.includes(q);
      });
    }

    if (topicTags && topicTags.length) {
      filtered = filtered.filter(ev => {
        const tags = ev.topic_tags || [];
        return topicTags.every(t => tags.includes(t));
      });
    }

    if (fromDate) {
      filtered = filtered.filter(ev => this._parseDate(ev.start_datetime) >= fromDate);
    }

    if (toDate) {
      filtered = filtered.filter(ev => this._parseDate(ev.start_datetime) <= toDate);
    }

    if (typeof isFreeOnly === 'boolean' && isFreeOnly) {
      filtered = filtered.filter(ev => !!ev.is_free);
    }

    if (attendanceType) {
      filtered = filtered.filter(ev => ev.default_attendance_type === attendanceType);
    }

    if (registrationOpenOnly) {
      filtered = filtered.filter(ev => !!ev.registration_open);
    }

    filtered.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const totalCount = filtered.length;
    const paged = this._paginate(filtered, page, pageSize);

    const results = paged.map(ev => ({
      eventId: ev.id,
      title: ev.title,
      slug: ev.slug || '',
      topic: ev.topic || '',
      topicTags: ev.topic_tags || [],
      description: ev.description || '',
      startDatetime: ev.start_datetime,
      endDatetime: ev.end_datetime || '',
      defaultAttendanceType: ev.default_attendance_type || '',
      isFree: !!ev.is_free,
      registrationOpen: !!ev.registration_open
    }));

    return {
      events: results,
      totalCount
    };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const locations = this._getFromStorage('locations');

    const ev = events.find(e => e.id === eventId);
    if (!ev) return null;

    const loc = locations.find(l => l.id === ev.location_id) || null;

    return {
      eventId: ev.id,
      title: ev.title,
      slug: ev.slug || '',
      topic: ev.topic || '',
      topicTags: ev.topic_tags || [],
      description: ev.description || '',
      startDatetime: ev.start_datetime,
      endDatetime: ev.end_datetime || '',
      formatOptions: ev.format_options || [],
      defaultAttendanceType: ev.default_attendance_type || '',
      isFree: !!ev.is_free,
      locationId: ev.location_id || null,
      capacity: ev.capacity || null,
      registrationOpen: !!ev.registration_open,
      location: loc
    };
  }

  registerForEvent(
    eventId,
    attendanceType,
    firstName,
    lastName,
    email,
    numAttendees,
    consentToReminders
  ) {
    const events = this._getFromStorage('events');
    const ev = events.find(e => e.id === eventId);
    if (!ev || !ev.registration_open) {
      return { success: false, message: 'event_not_found_or_registration_closed' };
    }

    const registrations = this._getFromStorage('event_registrations');
    const reg = {
      id: this._generateId('eventreg'),
      event_id: eventId,
      attendance_type: attendanceType,
      first_name: firstName,
      last_name: lastName,
      email: email,
      num_attendees: numAttendees,
      consent_to_reminders: !!consentToReminders,
      created_at: new Date().toISOString()
    };

    registrations.push(reg);
    this._saveToStorage('event_registrations', registrations);

    this._sendEmailNotification('event_registration', { registration: reg });

    return {
      success: true,
      registration: {
        registrationId: reg.id,
        eventId: reg.event_id,
        attendanceType: reg.attendance_type,
        firstName: reg.first_name,
        lastName: reg.last_name,
        email: reg.email,
        numAttendees: reg.num_attendees,
        consentToReminders: reg.consent_to_reminders,
        createdAt: reg.created_at
      },
      message: 'event_registered'
    };
  }

  // ----------------------
  // 10. Contact form
  // ----------------------
  getContactFormOptions(relatedLocationId) {
    const locations = this._getFromStorage('locations');
    const relatedLocation = relatedLocationId
      ? locations.find(l => l.id === relatedLocationId) || null
      : null;

    const subjects = [
      'General Inquiry',
      'Question about Uptown Clinic hours',
      'Billing Question',
      'Feedback',
      'Other'
    ];

    const topics = [
      { value: 'general_inquiry', label: 'General Inquiry' },
      { value: 'question_about_uptown_clinic_hours', label: 'Question about Uptown Clinic hours' },
      { value: 'billing_question', label: 'Billing Question' },
      { value: 'feedback', label: 'Feedback' },
      { value: 'other', label: 'Other' }
    ];

    const categories = [
      { value: 'general_inquiry', label: 'General Inquiry' },
      { value: 'appointment_question', label: 'Appointment Question' },
      { value: 'location_hours', label: 'Location Hours' },
      { value: 'pricing_question', label: 'Pricing Question' },
      { value: 'other', label: 'Other' }
    ];

    return {
      subjects,
      topics,
      categories,
      defaultSubject: subjects[0],
      defaultTopic: 'general_inquiry',
      defaultCategory: 'general_inquiry',
      relatedLocation: relatedLocation
        ? { locationId: relatedLocation.id, locationName: relatedLocation.name }
        : null
    };
  }

  submitContactMessage(
    name,
    email,
    phone,
    subject,
    topic,
    category,
    messageBody,
    relatedLocationId
  ) {
    const messages = this._getFromStorage('contact_messages');

    const msg = {
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || '',
      subject: subject || '',
      topic: topic || 'general_inquiry',
      category: category || 'general_inquiry',
      message_body: messageBody,
      related_location_id: relatedLocationId || null,
      created_at: new Date().toISOString()
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    const locations = this._getFromStorage('locations');
    const loc = relatedLocationId ? locations.find(l => l.id === relatedLocationId) || null : null;

    return {
      success: true,
      contactMessage: {
        contactMessageId: msg.id,
        name: msg.name,
        email: msg.email,
        phone: msg.phone,
        subject: msg.subject,
        topic: msg.topic,
        category: msg.category,
        messageBody: msg.message_body,
        relatedLocationId: msg.related_location_id,
        createdAt: msg.created_at,
        relatedLocation: loc
      },
      message: 'contact_message_submitted'
    };
  }

  // ----------------------
  // 11. Appointment booking
  // ----------------------
  getAppointmentBookingOptions(context = {}, preferredLocationId) {
    const treatments = this._getFromStorage('treatments');
    const providers = this._getFromStorage('providers');
    const packages = this._getFromStorage('packages');
    const locations = this._getFromStorage('locations');

    const { treatmentId, providerId, packageId, visitReasonType } = context || {};

    let availableLocationIds = new Set(locations.map(l => l.id));

    if (treatmentId) {
      const t = treatments.find(tr => tr.id === treatmentId);
      if (t && Array.isArray(t.locations_available) && t.locations_available.length) {
        availableLocationIds = new Set(t.locations_available);
      }
    }

    if (providerId) {
      const p = providers.find(pr => pr.id === providerId);
      if (p) {
        const locIds = new Set([p.primary_location_id, ...(p.location_ids || [])].filter(Boolean));
        if (locIds.size) availableLocationIds = locIds;
      }
    }

    if (packageId) {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg && Array.isArray(pkg.locations_available) && pkg.locations_available.length) {
        availableLocationIds = new Set(pkg.locations_available);
      }
    }

    const availableLocations = locations
      .filter(l => availableLocationIds.has(l.id))
      .map(l => ({
        locationId: l.id,
        locationName: l.name,
        city: l.city,
        location: l
      }));

    const appointmentModes = [
      { value: 'in_clinic_visit', label: 'In-Clinic Visit' },
      { value: 'virtual_visit', label: 'Virtual Visit' }
    ];

    const visitReasonTypes = [
      { value: 'botox_consultation', label: 'Botox Consultation' },
      { value: 'acne_consultation', label: 'Acne Consultation' },
      {
        value: 'laser_hair_removal_package_consultation',
        label: 'Laser Hair Removal Package Consultation'
      },
      { value: 'general_consultation', label: 'General Consultation' }
    ];

    const defaultLocation = preferredLocationId && availableLocationIds.has(preferredLocationId)
      ? preferredLocationId
      : availableLocations.length
        ? availableLocations[0].locationId
        : null;

    return {
      availableLocations,
      appointmentModes,
      visitReasonTypes,
      preselectedContext: {
        treatmentId: treatmentId || null,
        providerId: providerId || null,
        packageId: packageId || null,
        visitReasonType: visitReasonType || null
      },
      defaultLocationId: defaultLocation,
      defaultAppointmentMode: 'in_clinic_visit'
    };
  }

  getAvailableAppointmentSlots(
    locationId,
    appointmentMode,
    providerId,
    treatmentId,
    packageId,
    slotCategory,
    startDate,
    endDate,
    earliestStartTime,
    latestStartTime,
    weekdaysOnly
  ) {
    const slots = this._getFromStorage('appointment_slots');
    const locations = this._getFromStorage('locations');
    const providers = this._getFromStorage('providers');

    const fromDate = this._parseDate(startDate);
    const toDate = this._parseDate(endDate);

    let filtered = slots.filter(s => s.location_id === locationId && !s.is_booked);

    if (appointmentMode) {
      filtered = filtered.filter(s => s.appointment_type === appointmentMode);
    }

    if (providerId) {
      filtered = filtered.filter(s => s.provider_id === providerId);
    }

    if (treatmentId) {
      filtered = filtered.filter(s => s.treatment_id === treatmentId);
    }

    if (packageId) {
      filtered = filtered.filter(s => s.package_id === packageId);
    }

    if (slotCategory) {
      filtered = filtered.filter(s => s.slot_category === slotCategory);
    }

    if (fromDate || toDate) {
      filtered = filtered.filter(s => {
        const sd = this._parseDate(s.start_datetime);
        if (!sd) return false;
        if (fromDate && sd < fromDate) return false;
        if (toDate && sd > toDate) return false;
        return true;
      });
    }

    if (weekdaysOnly) {
      filtered = filtered.filter(s => !s.is_weekend);
    }

    if (earliestStartTime || latestStartTime) {
      filtered = filtered.filter(s => {
        const time = this._timeFromDate(s.start_datetime);
        if (!time) return false;
        if (earliestStartTime && this._compareTimes(time, earliestStartTime) < 0) return false;
        if (latestStartTime && this._compareTimes(time, latestStartTime) > 0) return false;
        return true;
      });
    }

    filtered.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const responseSlots = filtered.map(s => {
      const loc = locations.find(l => l.id === s.location_id) || null;
      const pr = s.provider_id ? providers.find(p => p.id === s.provider_id) || null : null;
      return {
        slotId: s.id,
        startDatetime: s.start_datetime,
        endDatetime: s.end_datetime || '',
        locationId: s.location_id,
        locationName: loc ? loc.name : '',
        providerId: s.provider_id || null,
        providerName: pr ? pr.full_name : '',
        appointmentType: s.appointment_type,
        slotCategory: s.slot_category || '',
        isWeekend: !!s.is_weekend,
        location: loc,
        provider: pr
      };
    });

    return {
      slots: responseSlots,
      hasMore: false
    };
  }

  createAppointmentBooking(
    appointmentType,
    appointmentMode,
    locationId,
    appointmentSlotId,
    providerId,
    treatmentId,
    packageId,
    visitReason,
    visitReasonType,
    startDatetime,
    patientName,
    patientEmail,
    patientPhone,
    notes
  ) {
    const locations = this._getFromStorage('locations');
    const providers = this._getFromStorage('providers');
    const treatments = this._getFromStorage('treatments');
    const packages = this._getFromStorage('packages');
    const slots = this._getFromStorage('appointment_slots');

    const location = locations.find(l => l.id === locationId);
    if (!location) {
      return { success: false, message: 'location_not_found' };
    }

    let slot = null;
    if (appointmentSlotId) {
      const validation = this._validateAppointmentSlotAvailability(appointmentSlotId);
      if (!validation.success) {
        return { success: false, message: validation.message };
      }
      slot = validation.slot;
    }

    const provider = providerId ? providers.find(p => p.id === providerId) || null : null;
    const treatment = treatmentId ? treatments.find(t => t.id === treatmentId) || null : null;
    const pkg = packageId ? packages.find(p => p.id === packageId) || null : null;

    const startDt = slot ? slot.start_datetime : startDatetime;
    if (!startDt) {
      return { success: false, message: 'start_datetime_required' };
    }

    const appointmentId = this._generateId('appt');
    const appointments = this._getFromStorage('appointments');

    const appointment = {
      id: appointmentId,
      appointment_type: appointmentType,
      appointment_mode: appointmentMode,
      location_id: locationId,
      provider_id: provider ? provider.id : null,
      treatment_id: treatment ? treatment.id : null,
      package_id: pkg ? pkg.id : null,
      appointment_slot_id: slot ? slot.id : null,
      visit_reason: visitReason || '',
      visit_reason_type: visitReasonType || 'other',
      start_datetime: startDt,
      status: 'confirmed',
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone || '',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    if (slot) {
      const slotIndex = slots.findIndex(s => s.id === slot.id);
      if (slotIndex !== -1) {
        slots[slotIndex].is_booked = true;
        this._saveToStorage('appointment_slots', slots);
      }
    }

    const responseAppointment = {
      appointmentId: appointment.id,
      appointmentType: appointment.appointment_type,
      appointmentMode: appointment.appointment_mode,
      locationId: appointment.location_id,
      locationName: location.name,
      providerId: appointment.provider_id,
      providerName: provider ? provider.full_name : '',
      treatmentId: appointment.treatment_id,
      packageId: appointment.package_id,
      visitReason: appointment.visit_reason,
      visitReasonType: appointment.visit_reason_type,
      appointmentSlotId: appointment.appointment_slot_id,
      startDatetime: appointment.start_datetime,
      status: appointment.status,
      patientName: appointment.patient_name,
      patientEmail: appointment.patient_email,
      location,
      provider,
      treatment,
      package: pkg,
      appointmentSlot: slot
    };

    return {
      success: true,
      appointment: responseAppointment,
      message: 'appointment_booked'
    };
  }

  // ----------------------
  // 12. FAQs, About, Legal
  // ----------------------
  getFaqs(category) {
    const faqs = this._getFromStorage('faqs');
    let filtered = faqs.slice();
    if (category) {
      filtered = filtered.filter(f => f.category === category);
    }

    const results = filtered.map(f => ({
      faqId: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category || '',
      relatedPageKey: f.related_page_key || ''
    }));

    return {
      faqs: results,
      totalCount: results.length
    };
  }

  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) {
      return {
        headline: '',
        bodyHtml: '',
        highlights: [],
        featuredProviders: [],
        certificationBadges: []
      };
    }

    return {
      headline: parsed.headline || '',
      bodyHtml: parsed.bodyHtml || '',
      highlights: parsed.highlights || [],
      featuredProviders: parsed.featuredProviders || [],
      certificationBadges: parsed.certificationBadges || []
    };
  }

  getLegalPageContent(pageKey) {
    const pages = this._getFromStorage('legal_pages');
    const page = pages.find(p => p.page_key === pageKey) || null;
    if (!page) {
      return {
        pageKey,
        title: '',
        bodyHtml: '',
        lastUpdated: ''
      };
    }

    return {
      pageKey: page.page_key,
      title: page.title || '',
      bodyHtml: page.body_html || '',
      lastUpdated: page.last_updated || ''
    };
  }
}

// Global exposure for browser-like environments without using window
typeof globalThis !== 'undefined' && (globalThis.BusinessLogic = BusinessLogic);
typeof globalThis !== 'undefined' && (globalThis.WebsiteSDK = new BusinessLogic());

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
