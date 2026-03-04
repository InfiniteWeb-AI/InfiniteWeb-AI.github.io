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

  _initStorage() {
    const keys = [
      'services',
      'add_ons',
      'packages',
      'barbers',
      'service_barber_offerings',
      'barber_availability_slots',
      'locations',
      'location_business_hours',
      'bookings',
      'booking_service_items',
      'booking_addon_items',
      'product_categories',
      'products',
      'gift_card_options',
      'gift_card_configurations',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'membership_plans',
      'membership_signups',
      'blog_categories',
      'articles',
      'reading_list_items'
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

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  _now() {
    return new Date().toISOString();
  }

  // Generic helpers
  _findById(list, id) {
    return list.find((item) => item.id === id) || null;
  }

  _sum(arr) {
    return arr.reduce((s, v) => s + (v || 0), 0);
  }

  // ==== Core internal helpers for single-user state ====

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getBookingDraft() {
    const bookings = this._getFromStorage('bookings', []);
    const draft = bookings.find((b) => b.status === 'draft');
    return draft || null;
  }

  _createBookingDraft() {
    const bookings = this._getFromStorage('bookings', []);
    const booking = {
      id: this._generateId('booking'),
      locationId: null,
      barberId: null,
      startDateTime: null,
      endDateTime: null,
      totalPrice: 0,
      totalDurationMinutes: 0,
      status: 'draft',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      paymentMethod: null,
      notes: '',
      createdAt: this._now()
    };
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);
    return booking;
  }

  _getOrCreateBookingDraft() {
    let draft = this._getBookingDraft();
    if (draft) return draft;
    return this._createBookingDraft();
  }

  _getBookingServiceItems(bookingId) {
    const items = this._getFromStorage('booking_service_items', []);
    return items.filter((i) => i.bookingId === bookingId);
  }

  _getBookingAddonItems(bookingId) {
    const items = this._getFromStorage('booking_addon_items', []);
    return items.filter((i) => i.bookingId === bookingId);
  }

  _recalculateBookingTotals(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return null;

    const serviceItems = this._getBookingServiceItems(bookingId);
    const addonItems = this._getBookingAddonItems(bookingId);

    const serviceTotal = this._sum(serviceItems.map((i) => i.price || 0));
    const serviceDuration = this._sum(serviceItems.map((i) => i.durationMinutes || 0));
    const addonTotal = this._sum(addonItems.map((i) => i.price || 0));
    const addonDuration = this._sum(addonItems.map((i) => i.durationMinutes || 0));

    booking.totalPrice = serviceTotal + addonTotal;
    booking.totalDurationMinutes = serviceDuration + addonDuration;

    this._saveToStorage('bookings', bookings);
    return booking;
  }

  _resolveBooking(booking) {
    if (!booking) return null;
    const locations = this._getFromStorage('locations', []);
    const barbers = this._getFromStorage('barbers', []);

    const location = booking.locationId
      ? locations.find((l) => l.id === booking.locationId) || null
      : null;
    const barber = booking.barberId
      ? barbers.find((b) => b.id === booking.barberId) || null
      : null;

    return {
      ...booking,
      location,
      barber
    };
  }

  _resolveBookingServiceItems(serviceItems) {
    const services = this._getFromStorage('services', []);
    const packages = this._getFromStorage('packages', []);
    return serviceItems.map((item) => {
      const service = item.serviceId
        ? services.find((s) => s.id === item.serviceId) || null
        : null;
      const pkg = item.packageId
        ? packages.find((p) => p.id === item.packageId) || null
        : null;
      return {
        ...item,
        service,
        package: pkg
      };
    });
  }

  _resolveBookingAddonItems(addonItems) {
    const addOns = this._getFromStorage('add_ons', []);
    return addonItems.map((item) => {
      const addon = addOns.find((a) => a.id === item.addonId) || null;
      return {
        ...item,
        addon
      };
    });
  }

  _getOrCreateOrderDraft() {
    let orders = this._getFromStorage('orders', []);
    let draft = orders.find((o) => o.status === 'draft');
    if (!draft) {
      draft = {
        id: this._generateId('order'),
        createdAt: this._now(),
        status: 'draft',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        paymentMethod: null,
        subtotal: 0,
        tax: 0,
        total: 0
      };
      orders.push(draft);
      this._saveToStorage('orders', orders);
    }
    return draft;
  }

  _getOrderItems(orderId) {
    const items = this._getFromStorage('order_items', []);
    return items.filter((i) => i.orderId === orderId);
  }

  _recalculateOrderTotals(orderId) {
    const orders = this._getFromStorage('orders', []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;
    const items = this._getOrderItems(orderId);
    const subtotal = this._sum(items.map((i) => i.lineSubtotal || 0));
    const tax = 0;
    order.subtotal = subtotal;
    order.tax = tax;
    order.total = subtotal + tax;
    this._saveToStorage('orders', orders);
    return order;
  }

  _resolveCartItems(cartItems) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const giftConfigs = this._getFromStorage('gift_card_configurations', []);
    const giftOptions = this._getFromStorage('gift_card_options', []);

    return cartItems.map((item) => {
      let product = null;
      let giftCardConfig = null;
      if (item.itemType === 'product' && item.productId) {
        product = products.find((p) => p.id === item.productId) || null;
        if (product) {
          const category = categories.find((c) => c.id === product.categoryId) || null;
          product = { ...product, category };
        }
      }
      if (item.itemType === 'gift_card' && item.giftCardConfigId) {
        const cfg = giftConfigs.find((g) => g.id === item.giftCardConfigId) || null;
        if (cfg) {
          const option = giftOptions.find((o) => o.id === cfg.giftCardOptionId) || null;
          giftCardConfig = { ...cfg, giftCardOption: option || null };
        }
      }
      return {
        ...item,
        product,
        giftCardConfig
      };
    });
  }

  _resolveOrderItems(orderItems) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const giftConfigs = this._getFromStorage('gift_card_configurations', []);
    const giftOptions = this._getFromStorage('gift_card_options', []);

    return orderItems.map((item) => {
      let product = null;
      let giftCardConfig = null;
      if (item.itemType === 'product' && item.productId) {
        product = products.find((p) => p.id === item.productId) || null;
        if (product) {
          const category = categories.find((c) => c.id === product.categoryId) || null;
          product = { ...product, category };
        }
      }
      if (item.itemType === 'gift_card' && item.giftCardConfigId) {
        const cfg = giftConfigs.find((g) => g.id === item.giftCardConfigId) || null;
        if (cfg) {
          const option = giftOptions.find((o) => o.id === cfg.giftCardOptionId) || null;
          giftCardConfig = { ...cfg, giftCardOption: option || null };
        }
      }
      return {
        ...item,
        product,
        giftCardConfig
      };
    });
  }

  _getOrCreateMembershipSignupDraft() {
    let signups = this._getFromStorage('membership_signups', []);
    let draft = signups.find((s) => s.status === 'draft');
    if (!draft) {
      draft = {
        id: this._generateId('msu'),
        membershipPlanId: null,
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        billingFrequency: 'monthly',
        status: 'draft',
        createdAt: this._now()
      };
      signups.push(draft);
      this._saveToStorage('membership_signups', signups);
    }
    return draft;
  }

  _getReadingListStore() {
    return this._getFromStorage('reading_list_items', []);
  }

  _saveReadingListStore(items) {
    this._saveToStorage('reading_list_items', items);
  }

  // ===== Home Page =====

  getHomePageContent() {
    const services = this._getFromStorage('services', []).filter((s) => s.isActive);
    const packages = this._getFromStorage('packages', []).filter((p) => p.isActive);
    const products = this._getFromStorage('products', []).filter((p) => p.isActive);
    const categories = this._getFromStorage('product_categories', []);
    const barbers = this._getFromStorage('barbers', []).filter((b) => b.isActive);
    const locations = this._getFromStorage('locations', []);
    const offerings = this._getFromStorage('service_barber_offerings', []);

    const categoryLabels = {
      haircut: 'Haircuts',
      beard_shave: 'Beard & Shave',
      facial_skin: 'Facial & Skin',
      other: 'Other Services'
    };

    const featuredServices = services.slice(0, 6).map((s) => {
      const offs = offerings.filter((o) => o.serviceId === s.id && o.isActive);
      const startingPrice = offs.length
        ? Math.min.apply(null, offs.map((o) => o.price))
        : s.basePrice;
      const durationMinutes = s.durationMinutes;
      return {
        serviceId: s.id,
        name: s.name,
        category: s.category,
        categoryLabel: categoryLabels[s.category] || 'Services',
        startingPrice,
        durationMinutes,
        rating: s.rating || null,
        reviewCount: s.reviewCount || 0
      };
    });

    const featuredPackages = packages.slice(0, 4).map((p) => ({
      packageId: p.id,
      name: p.name,
      price: p.price,
      durationMinutes: p.durationMinutes,
      excerpt: (p.description || '').slice(0, 140),
      rating: p.rating || null,
      reviewCount: p.reviewCount || 0
    }));

    const featuredProducts = products.slice(0, 8).map((p) => {
      const category = categories.find((c) => c.id === p.categoryId) || null;
      return {
        productId: p.id,
        name: p.name,
        categoryId: p.categoryId,
        categoryName: category ? category.name : '',
        price: p.price,
        rating: p.rating || null,
        imageUrl: p.imageUrl || ''
      };
    });

    const overallRating = barbers.length
      ? this._sum(barbers.map((b) => b.rating || 0)) / barbers.length
      : 0;
    const totalReviews = this._sum(barbers.map((b) => b.reviewCount || 0));

    const highlightedBarbers = barbers
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4)
      .map((b) => {
        const loc = b.primaryLocationId
          ? locations.find((l) => l.id === b.primaryLocationId) || null
          : null;
        return {
          barberId: b.id,
          name: b.name,
          rating: b.rating || null,
          reviewCount: b.reviewCount || 0,
          photoUrl: b.photoUrl || '',
          primaryLocationName: loc ? loc.name : ''
        };
      });

    const trustElements = {
      overallRating,
      totalReviews,
      overviewText: overallRating
        ? 'Trusted by clients across all our locations.'
        : 'Book with our experienced barbers.',
      highlightedBarbers
    };

    const quickSections = [
      {
        sectionId: 'book',
        title: 'Book a Cut',
        description: 'Reserve a haircut, beard trim, or package.',
        targetPage: 'booking'
      },
      {
        sectionId: 'shop',
        title: 'Shop Grooming',
        description: 'Hair, beard, and skin products curated by our barbers.',
        targetPage: 'shop'
      },
      {
        sectionId: 'memberships',
        title: 'Memberships',
        description: 'Stay sharp with monthly grooming benefits.',
        targetPage: 'memberships'
      },
      {
        sectionId: 'tips',
        title: 'Grooming Tips',
        description: 'Beard care, styling guides, and more.',
        targetPage: 'blog'
      }
    ];

    return {
      heroHeading: 'Barbershop & Men\'s Grooming',
      heroSubheading: 'Cuts, shaves, facials, and products tailored for men.',
      primaryCtaLabel: 'Book Now',
      secondaryCtaLabel: 'Shop Products',
      featuredServices,
      featuredPackages,
      featuredProducts,
      trustElements,
      quickSections
    };
  }

  // ===== Booking initial data =====

  getBookingInitialData() {
    const locations = this._getFromStorage('locations', []).filter((l) => l.isActive);
    const bookingDraft = this._getBookingDraft();

    let preselectedServiceId = null;
    let preselectedPackageId = null;
    let currentBooking = null;

    if (bookingDraft) {
      const serviceItemsRaw = this._getBookingServiceItems(bookingDraft.id);
      const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);
      const firstService = serviceItems.find((i) => i.itemType === 'service');
      const firstPackage = serviceItems.find((i) => i.itemType === 'package');
      preselectedServiceId = firstService ? firstService.serviceId : null;
      preselectedPackageId = firstPackage ? firstPackage.packageId : null;

      const bookingResolved = this._resolveBooking(bookingDraft);
      currentBooking = {
        bookingId: bookingResolved.id,
        status: bookingResolved.status,
        location: bookingResolved.location
          ? {
              locationId: bookingResolved.location.id,
              name: bookingResolved.location.name
            }
          : null,
        services: serviceItems.map((i) => ({
          itemId: i.id,
          itemType: i.itemType,
          serviceId: i.serviceId || null,
          packageId: i.packageId || null,
          name: i.name,
          category: i.category || (i.service ? i.service.category : 'other'),
          price: i.price,
          durationMinutes: i.durationMinutes,
          orderIndex: i.orderIndex || 0,
          service: i.service || null,
          package: i.package || null
        })),
        totalPrice: bookingResolved.totalPrice,
        totalDurationMinutes: bookingResolved.totalDurationMinutes
      };
    }

    const serviceCategories = [
      {
        category: 'haircut',
        label: 'Haircuts',
        description: 'Classic and modern cuts, fades, and styles.'
      },
      {
        category: 'beard_shave',
        label: 'Beard & Shave',
        description: 'Beard trims, line-ups, and hot towel shaves.'
      },
      {
        category: 'facial_skin',
        label: 'Facial & Skin',
        description: 'Facials and skin treatments for men.'
      },
      {
        category: 'other',
        label: 'Other Services',
        description: 'Extras and specialty services.'
      }
    ];

    return {
      preselectedServiceId,
      preselectedPackageId,
      locations,
      serviceCategories,
      currentBooking
    };
  }

  // ===== Booking location =====

  setBookingLocation(locationId) {
    const locations = this._getFromStorage('locations', []);
    const location = locations.find((l) => l.id === locationId) || null;
    const bookings = this._getFromStorage('bookings', []);

    let booking = this._getOrCreateBookingDraft();
    booking.locationId = location ? location.id : null;

    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) {
      bookings[idx] = booking;
    } else {
      bookings.push(booking);
    }
    this._saveToStorage('bookings', bookings);

    const serviceItemsRaw = this._getBookingServiceItems(booking.id);
    const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);

    const bookingResolved = this._resolveBooking(booking);

    return {
      booking: {
        bookingId: bookingResolved.id,
        status: bookingResolved.status,
        locationId: bookingResolved.locationId,
        location: bookingResolved.location
          ? {
              locationId: bookingResolved.location.id,
              name: bookingResolved.location.name,
              addressLine1: bookingResolved.location.addressLine1 || '',
              city: bookingResolved.location.city || '',
              phone: bookingResolved.location.phone || ''
            }
          : null,
        services: serviceItems.map((i) => ({
          itemId: i.id,
          itemType: i.itemType,
          serviceId: i.serviceId || null,
          packageId: i.packageId || null,
          name: i.name,
          category: i.category || (i.service ? i.service.category : 'other'),
          price: i.price,
          durationMinutes: i.durationMinutes,
          orderIndex: i.orderIndex || 0,
          service: i.service || null,
          package: i.package || null
        })),
        totalPrice: bookingResolved.totalPrice,
        totalDurationMinutes: bookingResolved.totalDurationMinutes
      }
    };
  }

  // ===== Services listing for booking =====

  getBookableServices(locationId, category, includePackages = false) {
    const allServices = this._getFromStorage('services', []).filter((s) => s.isActive);
    const allPackages = this._getFromStorage('packages', []).filter((p) => p.isActive);
    const offerings = this._getFromStorage('service_barber_offerings', []);

    let services = allServices.filter((s) => s.category === category);

    if (locationId) {
      const hasLocationSpecific = offerings.some(
        (o) => o.locationId === locationId && o.isActive
      );
      if (hasLocationSpecific) {
        services = services.filter((s) =>
          offerings.some(
            (o) => o.serviceId === s.id && o.locationId === locationId && o.isActive
          )
        );
      }
    }

    // Fallback: if no direct services exist for certain categories, reuse haircut services
    if (!services.length && (category === 'facial_skin' || category === 'beard_shave')) {
      services = allServices.filter((s) => s.category === 'haircut');
      if (locationId) {
        const hasLocationSpecific = offerings.some(
          (o) => o.locationId === locationId && o.isActive
        );
        if (hasLocationSpecific) {
          services = services.filter((s) =>
            offerings.some(
              (o) => o.serviceId === s.id && o.locationId === locationId && o.isActive
            )
          );
        }
      }
    }

    let packages = [];
    if (includePackages || category === 'packages') {
      const servicesById = {};
      allServices.forEach((s) => {
        servicesById[s.id] = s;
      });
      packages = allPackages.map((p) => ({
        ...p,
        includedServices: (p.includedServiceIds || []).map((id) => servicesById[id]).filter(Boolean)
      }));
      if (category !== 'packages') {
        packages = packages.filter((p) =>
          (p.includedServices || []).some((s) => s.category === category)
        );
      }
    }

    return {
      services,
      packages
    };
  }

  // ===== Add service/package to booking =====

  addServiceToBooking(serviceId) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      const booking = this._getOrCreateBookingDraft();
      const bookingResolved = this._resolveBooking(booking);
      const serviceItemsRaw = this._getBookingServiceItems(booking.id);
      const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);
      return {
        booking: {
          bookingId: bookingResolved.id,
          status: bookingResolved.status,
          locationId: bookingResolved.locationId,
          location: bookingResolved.location,
          services: serviceItems,
          totalPrice: bookingResolved.totalPrice,
          totalDurationMinutes: bookingResolved.totalDurationMinutes
        }
      };
    }

    const booking = this._getOrCreateBookingDraft();
    const bookingServiceItems = this._getFromStorage('booking_service_items', []);
    const existingForBooking = bookingServiceItems.filter((i) => i.bookingId === booking.id);
    const nextIndex = existingForBooking.length
      ? Math.max.apply(null, existingForBooking.map((i) => i.orderIndex || 0)) + 1
      : 0;

    const item = {
      id: this._generateId('bsi'),
      bookingId: booking.id,
      itemType: 'service',
      serviceId: service.id,
      packageId: null,
      name: service.name,
      price: service.basePrice,
      durationMinutes: service.durationMinutes,
      orderIndex: nextIndex
    };

    bookingServiceItems.push(item);
    this._saveToStorage('booking_service_items', bookingServiceItems);

    const updatedBooking = this._recalculateBookingTotals(booking.id);
    const bookingResolved = this._resolveBooking(updatedBooking);
    const serviceItemsRaw = this._getBookingServiceItems(booking.id);
    const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);

    return {
      booking: {
        bookingId: bookingResolved.id,
        status: bookingResolved.status,
        locationId: bookingResolved.locationId,
        location: bookingResolved.location,
        services: serviceItems,
        totalPrice: bookingResolved.totalPrice,
        totalDurationMinutes: bookingResolved.totalDurationMinutes
      }
    };
  }

  addPackageToBooking(packageId) {
    const packages = this._getFromStorage('packages', []);
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      const booking = this._getOrCreateBookingDraft();
      const bookingResolved = this._resolveBooking(booking);
      const serviceItemsRaw = this._getBookingServiceItems(booking.id);
      const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);
      return {
        booking: {
          bookingId: bookingResolved.id,
          status: bookingResolved.status,
          services: serviceItems,
          totalPrice: bookingResolved.totalPrice,
          totalDurationMinutes: bookingResolved.totalDurationMinutes
        }
      };
    }

    const booking = this._getOrCreateBookingDraft();
    const bookingServiceItems = this._getFromStorage('booking_service_items', []);
    const existingForBooking = bookingServiceItems.filter((i) => i.bookingId === booking.id);
    const nextIndex = existingForBooking.length
      ? Math.max.apply(null, existingForBooking.map((i) => i.orderIndex || 0)) + 1
      : 0;

    const item = {
      id: this._generateId('bsi'),
      bookingId: booking.id,
      itemType: 'package',
      serviceId: null,
      packageId: pkg.id,
      name: pkg.name,
      price: pkg.price,
      durationMinutes: pkg.durationMinutes,
      orderIndex: nextIndex
    };

    bookingServiceItems.push(item);
    this._saveToStorage('booking_service_items', bookingServiceItems);

    const updatedBooking = this._recalculateBookingTotals(booking.id);
    const bookingResolved = this._resolveBooking(updatedBooking);
    const serviceItemsRaw = this._getBookingServiceItems(booking.id);
    const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);

    return {
      booking: {
        bookingId: bookingResolved.id,
        status: bookingResolved.status,
        services: serviceItems,
        totalPrice: bookingResolved.totalPrice,
        totalDurationMinutes: bookingResolved.totalDurationMinutes
      }
    };
  }

  // ===== Availability & time slots =====

  getBookingAvailableTimeSlots(date, earliestStartTime, latestStartTime, minBarberRating, sortBy = 'price_asc') {
    const booking = this._getBookingDraft();
    if (!booking || !booking.locationId) return [];

    const serviceItemsRaw = this._getBookingServiceItems(booking.id);
    const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);
    if (!serviceItems.length) return [];

    const allSlots = this._getFromStorage('barber_availability_slots', []).filter(
      (s) => s.isAvailable
    );
    let slots = allSlots.filter((s) => s.locationId === booking.locationId);
    if (!slots.length) {
      slots = allSlots;
    }
    const barbers = this._getFromStorage('barbers', []);
    const offerings = this._getFromStorage('service_barber_offerings', []);

    const targetDateStr = date;

    function timeFromDateTime(dt) {
      return dt.slice(11, 16);
    }

    function toMinutes(t) {
      const parts = t.split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    const earliestMinutes = earliestStartTime ? toMinutes(earliestStartTime) : null;
    const latestMinutes = latestStartTime ? toMinutes(latestStartTime) : null;

    const results = [];

    slots.forEach((slot) => {
      if (slot.startDateTime.slice(0, 10) !== targetDateStr) return;

      const barber = barbers.find((b) => b.id === slot.barberId) || null;
      if (!barber) return;
      if (minBarberRating && (barber.rating || 0) < minBarberRating) return;

      const slotStartTime = timeFromDateTime(slot.startDateTime);
      const slotStartMinutes = toMinutes(slotStartTime);

      if (earliestMinutes !== null && slotStartMinutes < earliestMinutes) return;
      if (latestMinutes !== null && slotStartMinutes > latestMinutes) return;

      const slotDurationMinutes =
        (new Date(slot.endDateTime).getTime() - new Date(slot.startDateTime).getTime()) /
        60000;

      const perServiceBreakdown = [];
      let totalPrice = 0;
      let totalDuration = 0;
      let canPerformAll = true;

      serviceItems.forEach((item) => {
        if (item.itemType === 'service' && item.serviceId) {
          const off = offerings.find(
            (o) =>
              o.serviceId === item.serviceId &&
              o.barberId === slot.barberId &&
              o.locationId === slot.locationId &&
              o.isActive
          );
          if (!off) {
            canPerformAll = false;
            return;
          }
          const price = off.price;
          const duration = off.durationMinutes;
          totalPrice += price;
          totalDuration += duration;
          perServiceBreakdown.push({
            serviceId: item.serviceId,
            serviceName: item.name,
            category: item.category || (item.service ? item.service.category : 'other'),
            price,
            durationMinutes: duration
          });
        } else {
          // package or other item; use stored price/duration
          const price = item.price || 0;
          const duration = item.durationMinutes || 0;
          totalPrice += price;
          totalDuration += duration;
          perServiceBreakdown.push({
            serviceId: item.serviceId || item.packageId,
            serviceName: item.name,
            category: item.category || 'other',
            price,
            durationMinutes: duration
          });
        }
      });

      if (!canPerformAll) return;
      // Do not filter by slot duration; slots represent start times only

      results.push({
        slotId: slot.id,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        totalDurationMinutes: totalDuration,
        totalPrice,
        barber: {
          barberId: barber.id,
          name: barber.name,
          rating: barber.rating || null,
          reviewCount: barber.reviewCount || 0
        },
        perServiceBreakdown
      });
    });

    if (sortBy === 'time_asc') {
      results.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
    } else if (sortBy === 'price_asc') {
      results.sort((a, b) => a.totalPrice - b.totalPrice);
    }

    return results;
  }

  selectBookingTimeSlot(slotId) {
    const booking = this._getBookingDraft();
    if (!booking) {
      return { booking: null };
    }

    const slots = this._getFromStorage('barber_availability_slots', []);
    const slot = slots.find((s) => s.id === slotId) || null;
    if (!slot) {
      return { booking: null };
    }

    const barbers = this._getFromStorage('barbers', []);
    const offerings = this._getFromStorage('service_barber_offerings', []);

    const serviceItemsRaw = this._getBookingServiceItems(booking.id);
    const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);

    let totalPrice = 0;
    let totalDuration = 0;

    serviceItems.forEach((item) => {
      if (item.itemType === 'service' && item.serviceId) {
        const off = offerings.find(
          (o) =>
            o.serviceId === item.serviceId &&
            o.barberId === slot.barberId &&
            o.locationId === slot.locationId &&
            o.isActive
        );
        if (off) {
          totalPrice += off.price;
          totalDuration += off.durationMinutes;
        } else {
          totalPrice += item.price || 0;
          totalDuration += item.durationMinutes || 0;
        }
      } else {
        totalPrice += item.price || 0;
        totalDuration += item.durationMinutes || 0;
      }
    });

    const addonItems = this._getBookingAddonItems(booking.id);
    addonItems.forEach((a) => {
      totalPrice += a.price || 0;
      totalDuration += a.durationMinutes || 0;
    });

    booking.locationId = slot.locationId;
    booking.barberId = slot.barberId;
    booking.startDateTime = slot.startDateTime;
    const end = new Date(new Date(slot.startDateTime).getTime() + totalDuration * 60000);
    booking.endDateTime = end.toISOString();
    booking.totalPrice = totalPrice;
    booking.totalDurationMinutes = totalDuration;

    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) bookings[idx] = booking;
    else bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const barber = barbers.find((b) => b.id === slot.barberId) || null;

    return {
      booking: {
        bookingId: booking.id,
        status: booking.status,
        startDateTime: booking.startDateTime,
        endDateTime: booking.endDateTime,
        totalDurationMinutes: booking.totalDurationMinutes,
        totalPrice: booking.totalPrice,
        barber: barber
          ? {
              barberId: barber.id,
              name: barber.name,
              rating: barber.rating || null,
              reviewCount: barber.reviewCount || 0
            }
          : null
      }
    };
  }

  // ===== Add-ons =====

  getAvailableAddOnsForBooking() {
    const addOns = this._getFromStorage('add_ons', []);
    return addOns.filter((a) => a.isActive);
  }

  setBookingAddOns(addonIds) {
    const booking = this._getOrCreateBookingDraft();
    const addOns = this._getFromStorage('add_ons', []);
    let bookingAddonItems = this._getFromStorage('booking_addon_items', []);

    // Remove existing for this booking
    bookingAddonItems = bookingAddonItems.filter((i) => i.bookingId !== booking.id);

    const newItems = [];
    (addonIds || []).forEach((id, idx) => {
      const addon = addOns.find((a) => a.id === id && a.isActive);
      if (!addon) return;
      newItems.push({
        id: this._generateId('bai'),
        bookingId: booking.id,
        addonId: addon.id,
        name: addon.name,
        price: addon.price,
        durationMinutes: addon.durationMinutes || 0,
        orderIndex: idx
      });
    });

    bookingAddonItems = bookingAddonItems.concat(newItems);
    this._saveToStorage('booking_addon_items', bookingAddonItems);

    const updatedBooking = this._recalculateBookingTotals(booking.id);
    const bookingResolved = this._resolveBooking(updatedBooking);
    const addonsResolved = this._resolveBookingAddonItems(newItems);

    return {
      booking: {
        bookingId: bookingResolved.id,
        status: bookingResolved.status,
        addons: addonsResolved,
        totalPrice: bookingResolved.totalPrice,
        totalDurationMinutes: bookingResolved.totalDurationMinutes
      }
    };
  }

  // ===== Customer details & confirmation =====

  setBookingCustomerDetails(customerName, customerPhone, customerEmail, paymentMethod) {
    const booking = this._getOrCreateBookingDraft();
    booking.customerName = customerName;
    booking.customerPhone = customerPhone;
    booking.customerEmail = customerEmail;
    booking.paymentMethod = paymentMethod || booking.paymentMethod || null;

    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) bookings[idx] = booking;
    else bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const bookingResolved = this._resolveBooking(booking);

    return {
      booking: {
        bookingId: bookingResolved.id,
        status: bookingResolved.status,
        customerName: bookingResolved.customerName,
        customerPhone: bookingResolved.customerPhone,
        customerEmail: bookingResolved.customerEmail,
        paymentMethod: bookingResolved.paymentMethod
      }
    };
  }

  confirmBooking() {
    const booking = this._getBookingDraft();
    if (!booking) {
      return {
        booking: null,
        serviceItems: [],
        addonItems: []
      };
    }

    booking.status = 'confirmed';

    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) bookings[idx] = booking;
    else bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const bookingResolved = this._resolveBooking(booking);
    const serviceItemsRaw = this._getBookingServiceItems(booking.id);
    const addonItemsRaw = this._getBookingAddonItems(booking.id);
    const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);
    const addonItems = this._resolveBookingAddonItems(addonItemsRaw);

    return {
      booking: bookingResolved,
      serviceItems,
      addonItems
    };
  }

  getCurrentBookingSummary() {
    const bookings = this._getFromStorage('bookings', []);
    let booking = bookings.find((b) => b.status === 'draft');
    if (!booking) {
      booking = bookings
        .filter((b) => b.status === 'confirmed')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    }

    if (!booking) {
      return {
        booking: null,
        serviceItems: [],
        addonItems: []
      };
    }

    const bookingResolved = this._resolveBooking(booking);
    const serviceItemsRaw = this._getBookingServiceItems(booking.id);
    const addonItemsRaw = this._getBookingAddonItems(booking.id);
    const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);
    const addonItems = this._resolveBookingAddonItems(addonItemsRaw);

    return {
      booking: bookingResolved,
      serviceItems,
      addonItems
    };
  }

  // ===== Services & packages pages =====

  getServiceCategories() {
    return [
      {
        category: 'haircut',
        label: 'Haircuts',
        description: 'Classic and modern cuts, fades, and styles.'
      },
      {
        category: 'beard_shave',
        label: 'Beard & Shave',
        description: 'Beard trims, line-ups, and hot towel shaves.'
      },
      {
        category: 'facial_skin',
        label: 'Facial & Skin',
        description: 'Facials and skincare treatments.'
      },
      {
        category: 'other',
        label: 'Other Services',
        description: 'Additional grooming services.'
      }
    ];
  }

  listServicesByCategory(category) {
    const services = this._getFromStorage('services', []);
    return services.filter((s) => s.category === category && s.isActive);
  }

  listPackages() {
    const packages = this._getFromStorage('packages', []).filter((p) => p.isActive);
    const services = this._getFromStorage('services', []);
    const servicesById = {};
    services.forEach((s) => {
      servicesById[s.id] = s;
    });
    return packages.map((p) => ({
      ...p,
      includedServices: (p.includedServiceIds || []).map((id) => servicesById[id]).filter(Boolean)
    }));
  }

  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId) || null;
    const addOns = this._getFromStorage('add_ons', []).filter((a) => a.isActive);
    const products = this._getFromStorage('products', []).filter((p) => p.isActive);
    const categories = this._getFromStorage('product_categories', []);
    const articles = this._getFromStorage('articles', []).filter((a) => a.isPublished);

    let recommendedProducts = [];
    if (service) {
      let targetCats = [];
      if (service.category === 'haircut') {
        targetCats = ['hair', 'hair_styling'];
      } else if (service.category === 'beard_shave') {
        targetCats = ['beard', 'beard_care'];
      } else if (service.category === 'facial_skin') {
        targetCats = ['face', 'skin_care'];
      }
      recommendedProducts = products.filter((p) => targetCats.indexOf(p.categoryId) !== -1);
    }

    recommendedProducts = recommendedProducts.map((p) => {
      const category = categories.find((c) => c.id === p.categoryId) || null;
      return { ...p, category };
    });

    let relatedArticles = [];
    if (service) {
      const beardIds = ['beard_shave'];
      const hairIds = ['haircut'];
      const skinIds = ['facial_skin'];
      relatedArticles = articles.filter((a) => {
        const cats = a.categoryIds || [];
        if (service.category === 'beard_shave') {
          return cats.indexOf('beard_care') !== -1;
        }
        if (service.category === 'haircut') {
          return cats.indexOf('hair') !== -1 || cats.indexOf('grooming_tips') !== -1;
        }
        if (service.category === 'facial_skin') {
          return cats.indexOf('skin') !== -1;
        }
        return false;
      });
    }

    return {
      service,
      suggestedAddOns: addOns,
      recommendedProducts,
      relatedArticles
    };
  }

  getPackageDetail(packageId) {
    const packages = this._getFromStorage('packages', []);
    const services = this._getFromStorage('services', []);
    const pkg = packages.find((p) => p.id === packageId) || null;
    const servicesById = {};
    services.forEach((s) => {
      servicesById[s.id] = s;
    });
    const includedServices = pkg
      ? (pkg.includedServiceIds || []).map((id) => servicesById[id]).filter(Boolean)
      : [];
    return {
      package: pkg,
      includedServices
    };
  }

  preselectServiceForBooking(serviceId) {
    // Create a fresh booking draft
    let bookings = this._getFromStorage('bookings', []);
    // Remove existing drafts
    bookings = bookings.filter((b) => b.status !== 'draft');
    this._saveToStorage('bookings', bookings);

    const booking = this._createBookingDraft();
    this.addServiceToBooking(serviceId);

    const serviceItemsRaw = this._getBookingServiceItems(booking.id);
    const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);

    return {
      booking: {
        bookingId: booking.id,
        services: serviceItems
      }
    };
  }

  preselectPackageForBooking(packageId) {
    let bookings = this._getFromStorage('bookings', []);
    bookings = bookings.filter((b) => b.status !== 'draft');
    this._saveToStorage('bookings', bookings);

    const booking = this._createBookingDraft();
    this.addPackageToBooking(packageId);
    const serviceItemsRaw = this._getBookingServiceItems(booking.id);
    const serviceItems = this._resolveBookingServiceItems(serviceItemsRaw);
    return {
      booking: {
        bookingId: booking.id,
        services: serviceItems
      }
    };
  }

  getRelatedContentForService(serviceId) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId) || null;
    const products = this._getFromStorage('products', []).filter((p) => p.isActive);
    const categories = this._getFromStorage('product_categories', []);
    const articles = this._getFromStorage('articles', []).filter((a) => a.isPublished);

    let relatedProducts = [];
    if (service) {
      if (service.category === 'haircut') {
        relatedProducts = products.filter((p) => ['hair', 'hair_styling'].indexOf(p.categoryId) !== -1);
      } else if (service.category === 'beard_shave') {
        relatedProducts = products.filter((p) => ['beard', 'beard_care'].indexOf(p.categoryId) !== -1);
      } else if (service.category === 'facial_skin') {
        relatedProducts = products.filter((p) => ['face', 'skin_care'].indexOf(p.categoryId) !== -1);
      }
    }

    relatedProducts = relatedProducts.map((p) => {
      const category = categories.find((c) => c.id === p.categoryId) || null;
      return { ...p, category };
    });

    let relatedArticles = [];
    if (service) {
      relatedArticles = articles.filter((a) => {
        const cats = a.categoryIds || [];
        if (service.category === 'beard_shave') return cats.indexOf('beard_care') !== -1;
        if (service.category === 'haircut') return cats.indexOf('hair') !== -1;
        if (service.category === 'facial_skin') return cats.indexOf('skin') !== -1;
        return false;
      });
    }

    return {
      articles: relatedArticles,
      products: relatedProducts
    };
  }

  // ===== Shop / Products =====

  getShopFilterOptions() {
    const categories = this._getFromStorage('product_categories', []);
    const priceRanges = [
      { label: 'Under $10', minPrice: 0, maxPrice: 10 },
      { label: '$10 - $25', minPrice: 10, maxPrice: 25 },
      { label: '$25 - $50', minPrice: 25, maxPrice: 50 },
      { label: '$50+', minPrice: 50, maxPrice: Number.MAX_SAFE_INTEGER }
    ];
    const ratingOptions = [3, 4, 4.5, 5];
    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' }
    ];
    return {
      categories,
      priceRanges,
      ratingOptions,
      sortOptions
    };
  }

  listProducts(filters) {
    filters = filters || {};
    const productsAll = this._getFromStorage('products', []).filter((p) => p.isActive);
    const categories = this._getFromStorage('product_categories', []);

    let products = productsAll.slice();

    if (filters.categoryId) {
      products = products.filter((p) => p.categoryId === filters.categoryId);
    }
    if (typeof filters.minPrice === 'number') {
      products = products.filter((p) => p.price >= filters.minPrice);
    }
    if (typeof filters.maxPrice === 'number') {
      products = products.filter((p) => p.price <= filters.maxPrice);
    }
    if (typeof filters.minRating === 'number') {
      products = products.filter((p) => (p.rating || 0) >= filters.minRating);
    }

    if (filters.sortBy === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === 'rating_desc') {
      products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
    const totalCount = products.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = products.slice(start, end).map((p) => {
      const category = categories.find((c) => c.id === p.categoryId) || null;
      return { ...p, category };
    });

    return {
      products: pageItems,
      page,
      pageSize,
      totalCount
    };
  }

  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const product = products.find((p) => p.id === productId) || null;
    const category = product
      ? categories.find((c) => c.id === product.categoryId) || null
      : null;

    const relatedProductsRaw = product
      ? products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
      : [];

    const relatedProducts = relatedProductsRaw.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId) || null;
      return { ...p, category: cat };
    });

    return {
      product: product ? { ...product, category } : null,
      category,
      usageInstructions: '',
      ingredients: '',
      relatedProducts
    };
  }

  addProductToCart(productId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) quantity = 1;
    const cart = this._getOrCreateCart();
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId && p.isActive);
    if (!product) {
      return {
        success: false,
        cart,
        cartItems: []
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    let item = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.itemType === 'product' && ci.productId === product.id
    );

    if (item) {
      item.quantity += quantity;
      item.lineSubtotal = item.unitPrice * item.quantity;
    } else {
      item = {
        id: this._generateId('ci'),
        cartId: cart.id,
        itemType: 'product',
        productId: product.id,
        giftCardConfigId: null,
        name: product.name,
        unitPrice: product.price,
        quantity: quantity,
        lineSubtotal: product.price * quantity
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx].updatedAt = this._now();
      this._saveToStorage('carts', carts);
    }

    const itemsForCart = cartItems.filter((i) => i.cartId === cart.id);
    const resolvedItems = this._resolveCartItems(itemsForCart);

    return {
      success: true,
      cart,
      cartItems: resolvedItems
    };
  }

  getRelatedProducts(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) return [];
    const relatedRaw = products.filter(
      (p) => p.categoryId === product.categoryId && p.id !== product.id
    );
    return relatedRaw.map((p) => {
      const category = categories.find((c) => c.id === p.categoryId) || null;
      return { ...p, category };
    });
  }

  getCart() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []).filter((i) => i.cartId === cart.id);

    cartItems.forEach((item) => {
      item.lineSubtotal = item.unitPrice * item.quantity;
    });
    this._saveToStorage('cart_items', this._getFromStorage('cart_items', []).map((ci) => {
      const updated = cartItems.find((i) => i.id === ci.id);
      return updated || ci;
    }));

    const resolvedItems = this._resolveCartItems(cartItems);
    const subtotal = this._sum(cartItems.map((i) => i.lineSubtotal || 0));
    const taxEstimate = 0;
    const total = subtotal + taxEstimate;

    return {
      cart,
      items: resolvedItems,
      subtotal,
      taxEstimate,
      total
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) {
      const cart = this._getOrCreateCart();
      return this.getCart(cart.id);
    }

    if (quantity <= 0) {
      cartItems = cartItems.filter((i) => i.id !== cartItemId);
    } else {
      item.quantity = quantity;
      item.lineSubtotal = item.unitPrice * item.quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const itemsForCart = cartItems.filter((i) => i.cartId === cart.id);
    const resolvedItems = this._resolveCartItems(itemsForCart);
    const subtotal = this._sum(itemsForCart.map((i) => i.lineSubtotal || 0));
    const taxEstimate = 0;
    const total = subtotal + taxEstimate;

    return {
      cart,
      items: resolvedItems,
      subtotal,
      taxEstimate,
      total
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter((i) => i.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const itemsForCart = cartItems.filter((i) => i.cartId === cart.id);
    const resolvedItems = this._resolveCartItems(itemsForCart);
    const subtotal = this._sum(itemsForCart.map((i) => i.lineSubtotal || 0));
    const taxEstimate = 0;
    const total = subtotal + taxEstimate;

    return {
      cart,
      items: resolvedItems,
      subtotal,
      taxEstimate,
      total
    };
  }

  // ===== Gift cards & checkout =====

  getGiftCardOptions() {
    return this._getFromStorage('gift_card_options', []).filter((o) => o.isActive);
  }

  addGiftCardToCart(giftCardOptionId, amount, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) quantity = 1;
    const options = this._getFromStorage('gift_card_options', []);
    const option = options.find((o) => o.id === giftCardOptionId && o.isActive);
    if (!option) {
      const cart = this._getOrCreateCart();
      return { cart, items: [] };
    }

    const cart = this._getOrCreateCart();
    const giftConfigs = this._getFromStorage('gift_card_configurations', []);
    const config = {
      id: this._generateId('gc'),
      giftCardOptionId: option.id,
      amount: amount,
      recipientName: '',
      recipientEmail: '',
      senderName: '',
      message: ''
    };
    giftConfigs.push(config);
    this._saveToStorage('gift_card_configurations', giftConfigs);

    let cartItems = this._getFromStorage('cart_items', []);
    const item = {
      id: this._generateId('ci'),
      cartId: cart.id,
      itemType: 'gift_card',
      productId: null,
      giftCardConfigId: config.id,
      name: option.name,
      unitPrice: amount,
      quantity: quantity,
      lineSubtotal: amount * quantity
    };
    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter((i) => i.cartId === cart.id);
    const resolvedItems = this._resolveCartItems(itemsForCart);

    return {
      cart,
      items: resolvedItems
    };
  }

  startCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []).filter((i) => i.cartId === cart.id);

    // Remove existing draft orders
    let orders = this._getFromStorage('orders', []);
    const draftIds = orders.filter((o) => o.status === 'draft').map((o) => o.id);
    let orderItemsAll = this._getFromStorage('order_items', []);
    orderItemsAll = orderItemsAll.filter((i) => draftIds.indexOf(i.orderId) === -1);
    this._saveToStorage('order_items', orderItemsAll);
    orders = orders.filter((o) => o.status !== 'draft');

    const order = {
      id: this._generateId('order'),
      createdAt: this._now(),
      status: 'draft',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      paymentMethod: null,
      subtotal: 0,
      tax: 0,
      total: 0
    };
    orders.push(order);
    this._saveToStorage('orders', orders);

    const orderItems = [];
    cartItems.forEach((ci) => {
      orderItems.push({
        id: this._generateId('oi'),
        orderId: order.id,
        itemType: ci.itemType,
        productId: ci.productId || null,
        giftCardConfigId: ci.giftCardConfigId || null,
        name: ci.name,
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        lineSubtotal: ci.unitPrice * ci.quantity
      });
    });

    this._saveToStorage('order_items', orderItemsAll.concat(orderItems));
    this._recalculateOrderTotals(order.id);

    const resolvedItems = this._resolveOrderItems(orderItems);

    return {
      order,
      orderItems: resolvedItems
    };
  }

  updateCheckoutContactDetails(contactName, contactPhone, contactEmail) {
    let order = this._getOrCreateOrderDraft();
    order.contactName = contactName;
    order.contactPhone = contactPhone || '';
    order.contactEmail = contactEmail;

    const orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) orders[idx] = order;
    else orders.push(order);
    this._saveToStorage('orders', orders);

    return { order };
  }

  updateCheckoutShippingDetails(shippingAddress) {
    let order = this._getOrCreateOrderDraft();
    order.shippingAddress = shippingAddress || null;
    const orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) orders[idx] = order;
    else orders.push(order);
    this._saveToStorage('orders', orders);
    return { order };
  }

  updateCheckoutGiftCardDetails(orderItemId, recipientName, recipientEmail, senderName, message) {
    const order = this._getOrCreateOrderDraft();
    const orderItemsAll = this._getFromStorage('order_items', []);
    const orderItem = orderItemsAll.find((oi) => oi.id === orderItemId && oi.orderId === order.id);
    if (!orderItem || orderItem.itemType !== 'gift_card') {
      return {
        order,
        orderItems: this._resolveOrderItems(this._getOrderItems(order.id))
      };
    }

    const giftConfigs = this._getFromStorage('gift_card_configurations', []);
    const cfg = giftConfigs.find((g) => g.id === orderItem.giftCardConfigId);
    if (cfg) {
      if (typeof recipientName === 'string') cfg.recipientName = recipientName;
      if (typeof recipientEmail === 'string') cfg.recipientEmail = recipientEmail;
      if (typeof senderName === 'string') cfg.senderName = senderName;
      if (typeof message === 'string') cfg.message = message;
      this._saveToStorage('gift_card_configurations', giftConfigs);
    }

    const orderItems = this._getOrderItems(order.id);
    const resolvedItems = this._resolveOrderItems(orderItems);

    return {
      order,
      orderItems: resolvedItems
    };
  }

  updateCheckoutPaymentMethod(paymentMethod) {
    const order = this._getOrCreateOrderDraft();
    order.paymentMethod = paymentMethod;
    const orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) orders[idx] = order;
    else orders.push(order);
    this._saveToStorage('orders', orders);
    return { order };
  }

  getCheckoutReview() {
    const order = this._getOrCreateOrderDraft();
    const orderItems = this._getOrderItems(order.id);
    const resolvedItems = this._resolveOrderItems(orderItems);
    this._recalculateOrderTotals(order.id);
    return {
      order,
      orderItems: resolvedItems
    };
  }

  // ===== Locations & booking from locations =====

  searchLocationsByPostalCode(postalCode, sortBy) {
    sortBy = sortBy || 'distance';
    const locations = this._getFromStorage('locations', []).filter((l) => l.isActive);
    const hours = this._getFromStorage('location_business_hours', []);

    const results = locations.map((loc) => {
      const distanceMiles = loc.postalCode === postalCode ? 0 : 9999;
      const businessHours = hours
        .filter((h) => h.locationId === loc.id)
        .map((h) => ({ ...h, location: loc }));
      return {
        location: loc,
        distanceMiles,
        businessHours
      };
    });

    if (sortBy === 'distance') {
      results.sort((a, b) => a.distanceMiles - b.distanceMiles);
    }

    return results;
  }

  getLocationDetail(locationId) {
    const locations = this._getFromStorage('locations', []);
    const location = locations.find((l) => l.id === locationId) || null;
    const hours = this._getFromStorage('location_business_hours', []).filter(
      (h) => h.locationId === locationId
    );
    const businessHours = hours.map((h) => ({ ...h, location }));
    return {
      location,
      businessHours
    };
  }

  startBookingAtLocation(locationId) {
    const locations = this._getFromStorage('locations', []);
    const loc = locations.find((l) => l.id === locationId) || null;
    const booking = this._getOrCreateBookingDraft();
    booking.locationId = loc ? loc.id : null;

    const bookings = this._getFromStorage('bookings', []);
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) bookings[idx] = booking;
    else bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      booking: {
        bookingId: booking.id,
        location: loc
          ? {
              locationId: loc.id,
              name: loc.name
            }
          : null
      }
    };
  }

  // ===== Memberships =====

  listMembershipPlans() {
    return this._getFromStorage('membership_plans', []).filter((p) => p.isActive);
  }

  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    return { plan };
  }

  startMembershipSignup(membershipPlanId) {
    let signups = this._getFromStorage('membership_signups', []);
    // remove existing drafts
    signups = signups.filter((s) => s.status !== 'draft');
    this._saveToStorage('membership_signups', signups);

    const signup = {
      id: this._generateId('msu'),
      membershipPlanId,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      billingFrequency: 'monthly',
      status: 'draft',
      createdAt: this._now()
    };
    signups.push(signup);
    this._saveToStorage('membership_signups', signups);

    return { signup };
  }

  updateMembershipSignupDetails(customerName, customerPhone, customerEmail, billingFrequency) {
    const signup = this._getOrCreateMembershipSignupDraft();
    signup.customerName = customerName;
    signup.customerPhone = customerPhone;
    signup.customerEmail = customerEmail;
    signup.billingFrequency = billingFrequency;

    let signups = this._getFromStorage('membership_signups', []);
    const idx = signups.findIndex((s) => s.id === signup.id);
    if (idx >= 0) signups[idx] = signup;
    else signups.push(signup);
    this._saveToStorage('membership_signups', signups);

    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === signup.membershipPlanId) || null;

    return {
      signup,
      plan
    };
  }

  getMembershipSignupReview() {
    const signup = this._getOrCreateMembershipSignupDraft();
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find((p) => p.id === signup.membershipPlanId) || null;
    return {
      signup,
      plan
    };
  }

  // ===== Blog & reading list =====

  listBlogCategories() {
    return this._getFromStorage('blog_categories', []);
  }

  listArticles(filters) {
    filters = filters || {};
    const articlesAll = this._getFromStorage('articles', []).filter((a) => a.isPublished);
    const categories = this._getFromStorage('blog_categories', []);

    let articles = articlesAll.slice();

    if (filters.categoryId) {
      articles = articles.filter((a) => (a.categoryIds || []).indexOf(filters.categoryId) !== -1);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      articles = articles.filter((a) => {
        return (
          (a.title || '').toLowerCase().indexOf(q) !== -1 ||
          (a.excerpt || '').toLowerCase().indexOf(q) !== -1 ||
          (a.content || '').toLowerCase().indexOf(q) !== -1
        );
      });
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
    const totalCount = articles.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pageItems = articles.slice(start, end).map((a) => ({
      ...a,
      categories: (a.categoryIds || []).map(
        (id) => categories.find((c) => c.id === id) || null
      )
    }));

    return {
      articles: pageItems,
      page,
      pageSize,
      totalCount
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('blog_categories', []);
    const article = articles.find((a) => a.id === articleId) || null;
    const cats = article
      ? (article.categoryIds || []).map(
          (id) => categories.find((c) => c.id === id) || null
        )
      : [];

    const readingList = this._getReadingListStore();
    const isSaved = !!readingList.find((r) => r.articleId === articleId);

    return {
      article,
      categories: cats,
      isSaved
    };
  }

  getRelatedArticles(articleId) {
    const articles = this._getFromStorage('articles', []).filter((a) => a.isPublished);
    const categories = this._getFromStorage('blog_categories', []);
    const base = articles.find((a) => a.id === articleId) || null;
    if (!base) return [];
    const baseCats = base.categoryIds || [];
    const related = articles.filter(
      (a) => a.id !== base.id && (a.categoryIds || []).some((c) => baseCats.indexOf(c) !== -1)
    );
    return related.map((a) => ({
      ...a,
      categories: (a.categoryIds || []).map(
        (id) => categories.find((c) => c.id === id) || null
      )
    }));
  }

  saveArticleToReadingList(articleId) {
    let readingList = this._getReadingListStore();
    let existing = readingList.find((r) => r.articleId === articleId);
    if (!existing) {
      existing = {
        id: this._generateId('rli'),
        articleId,
        savedAt: this._now()
      };
      readingList.push(existing);
      this._saveReadingListStore(readingList);
    }

    return {
      readingListItem: existing
    };
  }

  getReadingList() {
    const readingList = this._getReadingListStore();
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('blog_categories', []);

    return readingList.map((item) => {
      const article = articles.find((a) => a.id === item.articleId) || null;
      const cats = article
        ? (article.categoryIds || []).map(
            (id) => categories.find((c) => c.id === id) || null
          )
        : [];
      return {
        readingListItem: item,
        article,
        categories: cats
      };
    });
  }

  removeReadingListItem(readingListItemId) {
    let readingList = this._getReadingListStore();
    const initialLength = readingList.length;
    readingList = readingList.filter((r) => r.id !== readingListItemId);
    this._saveReadingListStore(readingList);
    return {
      success: readingList.length < initialLength
    };
  }

  // ===== Static pages (About, Contact, Policies) =====

  getAboutPageContent() {
    const barbers = this._getFromStorage('barbers', []).filter((b) => b.isActive);
    const highlightedBarbers = barbers.slice(0, 4);
    const coreOfferings = [
      {
        title: 'Haircuts',
        description: 'From classic cuts to modern fades.',
        targetPage: 'services_haircut'
      },
      {
        title: 'Beard & Shave',
        description: 'Beard trims, line-ups, and hot towel shaves.',
        targetPage: 'services_beard'
      },
      {
        title: 'Facials & Skin',
        description: 'Skin care designed for men.',
        targetPage: 'services_facial'
      }
    ];
    return {
      story: '',
      mission: '',
      specialization: '',
      highlightedBarbers,
      coreOfferings
    };
  }

  getFeaturedBarbers() {
    return this._getFromStorage('barbers', []).filter((b) => b.isActive);
  }

  getContactPageContent() {
    const locations = this._getFromStorage('locations', []).filter((l) => l.isActive);
    const primary = locations[0] || null;
    return {
      primaryPhone: primary ? primary.phone || '' : '',
      primaryEmail: '',
      primaryAddress: primary
        ? {
            addressLine1: primary.addressLine1 || '',
            addressLine2: primary.addressLine2 || '',
            city: primary.city || '',
            state: primary.state || '',
            postalCode: primary.postalCode || '',
            country: primary.country || ''
          }
        : {
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
          },
      supportSections: [
        {
          title: 'Appointments',
          content: 'For booking questions, please call the shop directly.'
        },
        {
          title: 'Shop Orders',
          content: 'For product order issues, reply to your order confirmation email.'
        }
      ]
    };
  }

  submitContactForm(name, email, phone, topic, message) {
    // Persist minimal metadata for record-keeping
    const key = 'contact_submissions';
    const submissions = this._getFromStorage(key, []);
    submissions.push({
      id: this._generateId('cs'),
      name,
      email,
      phone: phone || '',
      topic: topic || '',
      message,
      createdAt: this._now()
    });
    this._saveToStorage(key, submissions);
    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  getPoliciesContent() {
    const key = 'policies_content';
    const stored = this._getFromStorage(key, null) || {};
    return {
      privacyPolicy: stored.privacyPolicy || '',
      termsOfService: stored.termsOfService || '',
      ecommercePolicy: stored.ecommercePolicy || '',
      membershipTerms: stored.membershipTerms || ''
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
