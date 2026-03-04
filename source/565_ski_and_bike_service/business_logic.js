/* localStorage polyfill for Node.js and environments without localStorage */
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

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    const defaults = {
      service_area_infos: [],
      services: [],
      service_time_slots: [],
      service_appointments: [],
      deals: [],
      rental_bikes: [],
      rental_addons: [],
      rental_reservations: [],
      products: [],
      cart: null,
      cart_items: [],
      orders: [],
      contact_messages: [],
      store_info: null,
      policies_and_faq: { sections: [] },
      contact_page_info: null,
      home_page_config: null,
      services_page_config: null,
      service_category_faqs: []
    };

    Object.keys(defaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaults[key]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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
    const idNum = this._getNextIdCounter();
    return prefix + '_' + idNum;
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDateOnly(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    return dateStr.length >= 10 ? dateStr.substr(0, 10) : null;
  }

  _formatDateOnly(date) {
    if (!(date instanceof Date)) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // ------------------------
  // Cart & Order helpers
  // ------------------------
  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        currency: 'USD'
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _saveCart(cart) {
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart', cart);
  }

  _calculateCartTotals(cartId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const items = cartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    items.forEach((i) => {
      subtotal += typeof i.total_price === 'number' ? i.total_price : 0;
    });
    const tax = 0; // no tax logic specified
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  _getOrCreateOrderForCurrentCart() {
    const cart = this._getOrCreateCart();
    let orders = this._getFromStorage('orders', []);
    let order = orders.find(
      (o) => o.cart_id === cart.id && (o.status === 'in_progress' || o.status === 'awaiting_payment')
    );

    const totals = this._calculateCartTotals(cart.id);

    if (!order) {
      order = {
        id: this._generateId('order'),
        cart_id: cart.id,
        order_number: null,
        status: 'in_progress',
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        shipping_method: null,
        shipping_address_line1: '',
        shipping_address_line2: '',
        shipping_city: '',
        shipping_region: '',
        shipping_postal_code: '',
        shipping_country: '',
        payment_method: null,
        payment_status: 'not_started',
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        reached_payment_step: false
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
    } else {
      order.subtotal = totals.subtotal;
      order.tax = totals.tax;
      order.total = totals.total;
      order.updated_at = this._nowISO();
      const idx = orders.findIndex((o) => o.id === order.id);
      if (idx !== -1) {
        orders[idx] = order;
      }
      this._saveToStorage('orders', orders);
    }

    return order;
  }

  // ------------------------
  // Foreign key enrichment helpers
  // ------------------------
  _enrichServiceTimeSlot(slot, servicesList) {
    const services = servicesList || this._getFromStorage('services', []);
    const service = slot.service_id ? services.find((s) => s.id === slot.service_id) || null : null;
    return Object.assign({}, slot, { service: service });
  }

  _enrichDeal(deal) {
    if (!deal) return null;
    const services = this._getFromStorage('services', []);
    const rentalBikes = this._getFromStorage('rental_bikes', []);
    const products = this._getFromStorage('products', []);

    const relatedService = deal.service_id
      ? services.find((s) => s.id === deal.service_id) || null
      : null;
    const relatedRentalBike = deal.rental_bike_id
      ? rentalBikes.find((r) => r.id === deal.rental_bike_id) || null
      : null;
    const relatedProduct = deal.product_id
      ? products.find((p) => p.id === deal.product_id) || null
      : null;

    return Object.assign({}, deal, {
      service: relatedService,
      rental_bike: relatedRentalBike,
      product: relatedProduct
    });
  }

  _enrichCartItem(cartItem) {
    const products = this._getFromStorage('products', []);
    const serviceAppointments = this._getFromStorage('service_appointments', []);
    const rentalReservations = this._getFromStorage('rental_reservations', []);

    let product = null;
    let serviceAppointment = null;
    let rentalReservation = null;

    if (cartItem.product_id) {
      product = products.find((p) => p.id === cartItem.product_id) || null;
    }
    if (cartItem.service_appointment_id) {
      serviceAppointment =
        serviceAppointments.find((sa) => sa.id === cartItem.service_appointment_id) || null;
    }
    if (cartItem.rental_reservation_id) {
      rentalReservation =
        rentalReservations.find((rr) => rr.id === cartItem.rental_reservation_id) || null;
    }

    return Object.assign({}, cartItem, {
      product: product,
      service_appointment: serviceAppointment,
      rental_reservation: rentalReservation
    });
  }

  // ------------------------
  // Filtering & sorting helpers
  // ------------------------
  _applyProductFiltersAndSorting(products, filters, sortBy, sortDirection, searchQuery) {
    let results = products.slice();

    if (filters) {
      if (typeof filters.minPrice === 'number') {
        results = results.filter((p) => p.price >= filters.minPrice);
      }
      if (typeof filters.maxPrice === 'number') {
        results = results.filter((p) => p.price <= filters.maxPrice);
      }
      if (typeof filters.minRating === 'number') {
        results = results.filter((p) => (p.rating || 0) >= filters.minRating);
      }
      if (Array.isArray(filters.fulfillmentOptions) && filters.fulfillmentOptions.length > 0) {
        results = results.filter((p) => {
          if (!Array.isArray(p.fulfillment_options) || p.fulfillment_options.length === 0) {
            return false;
          }
          return filters.fulfillmentOptions.every(
            (opt) => p.fulfillment_options.indexOf(opt) !== -1
          );
        });
      }
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      results = results.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    if (!sortBy) sortBy = 'name';
    if (!sortDirection) sortDirection = 'asc';
    const dir = sortDirection === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      let av;
      let bv;
      if (sortBy === 'price') {
        av = a.price;
        bv = b.price;
      } else if (sortBy === 'rating') {
        av = a.rating || 0;
        bv = b.rating || 0;
      } else {
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return results;
  }

  _applyRentalBikeFiltersAndSorting(rentalBikes, params) {
    const bikeType = params && params.bikeType;
    const suspension = params && params.suspension;
    const size = params && params.size;
    const maxDailyRate = params && params.maxDailyRate;
    const isDemo = params && typeof params.isDemo === 'boolean' ? params.isDemo : undefined;
    let sortBy = params && params.sortBy;
    let sortDirection = params && params.sortDirection;

    let results = rentalBikes.filter((rb) => rb.status === 'available');

    if (bikeType) {
      results = results.filter((rb) => rb.type === bikeType);
    }
    if (suspension) {
      results = results.filter((rb) => rb.suspension === suspension);
    }
    if (size) {
      results = results.filter((rb) => rb.size === size);
    }
    if (typeof maxDailyRate === 'number') {
      results = results.filter((rb) => rb.daily_rate <= maxDailyRate);
    }
    if (typeof isDemo === 'boolean') {
      results = results.filter((rb) => (rb.is_demo || false) === isDemo);
    }

    if (!sortBy) sortBy = 'price';
    if (!sortDirection) sortDirection = 'asc';
    const dir = sortDirection === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      let av;
      let bv;
      if (sortBy === 'price') {
        av = a.daily_rate;
        bv = b.daily_rate;
      } else {
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return results;
  }

  _findAvailableServiceTimeSlots(serviceId, date) {
    const services = this._getFromStorage('services', []);
    const allSlots = this._getFromStorage('service_time_slots', []);
    const service = services.find((s) => s.id === serviceId) || null;
    const targetDateStr = date;
    const serviceType = service ? service.service_type : null;

    const available = allSlots.filter((slot) => {
      const slotDateStr =
        typeof slot.date === 'string'
          ? this._parseDateOnly(slot.date)
          : this._formatDateOnly(new Date(slot.date));
      if (slotDateStr !== targetDateStr) return false;
      if (!slot.is_available) return false;
      if (
        slot.capacity != null &&
        typeof slot.booked_count === 'number' &&
        slot.booked_count >= slot.capacity
      ) {
        return false;
      }
      if (slot.service_id && slot.service_id !== serviceId) return false;
      if (!slot.service_id && serviceType && slot.service_type && slot.service_type !== serviceType) {
        return false;
      }
      return true;
    });

    return available.map((slot) => this._enrichServiceTimeSlot(slot, services));
  }

  // ------------------------
  // Mapping helpers
  // ------------------------
  _mapCategoryIdToName(categoryId) {
    if (categoryId === 'bike_accessories') return 'Bike Accessories';
    if (categoryId === 'ski_tuning_maintenance') return 'Ski Tuning & Maintenance';
    if (categoryId === 'gift_cards') return 'Gift Cards';
    return 'All Products';
  }

  _mapServiceCategoryIdToName(serviceType, categoryId) {
    if (categoryId === 'tune_ups') {
      return serviceType === 'bike' ? 'Bike Tune-Ups' : 'Ski & Snowboard Tune-Ups';
    }
    if (categoryId === 'repairs') {
      return serviceType === 'bike' ? 'Bike Repairs' : 'Ski & Snowboard Repairs';
    }
    if (categoryId === 'bundles') {
      return serviceType === 'bike' ? 'Bike Service Bundles' : 'Ski & Snowboard Service Bundles';
    }
    return 'Other Services';
  }

  _mapSubcategoryIdToName(subcategoryId) {
    if (subcategoryId === 'front_lights') return 'Front Lights';
    if (subcategoryId === 'rear_lights') return 'Rear Lights';
    if (subcategoryId === 'bike_locks') return 'Bike Locks';
    if (subcategoryId === 'lights_visibility') return 'Lights & Visibility';
    if (subcategoryId === 'wax') return 'Wax';
    if (subcategoryId === 'edge_tools') return 'Edge Tools';
    return 'Other';
  }

  _mapFulfillmentOptionToLabel(opt) {
    if (opt === 'free_in_store_pickup') return 'Free In-Store Pickup';
    if (opt === 'ship_to_home') return 'Ship to Home';
    return opt;
  }

  _mapGiftCardDeliveryTypeToLabel(type) {
    if (type === 'print_at_home') return 'Print at Home';
    if (type === 'email') return 'Email';
    if (type === 'in_store_physical') return 'In-Store Physical Card';
    return type;
  }

  // ========================
  // Core Interface Implementations
  // ========================

  // ---------- Homepage ----------
  getHomePageData() {
    const services = this._getFromStorage('services', []).filter(
      (s) => s.status === 'active'
    );

    const now = new Date();
    const dealsRaw = this._getFromStorage('deals', []).filter((d) => d.is_active);
    const dealsActive = dealsRaw.filter((d) => {
      const start = d.start_date ? new Date(d.start_date) : null;
      const end = d.end_date ? new Date(d.end_date) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    });

    const featured_services = services.slice(0, 5);
    const featured_deals = dealsActive.slice(0, 5).map((d) => this._enrichDeal(d));

    const products = this._getFromStorage('products', []).filter(
      (p) => p.status === 'active'
    );
    const categoryMap = {};
    products.forEach((p) => {
      const cid = p.category_id;
      if (!cid) return;
      if (!categoryMap[cid]) {
        categoryMap[cid] = {
          category_id: cid,
          category_name: this._mapCategoryIdToName(cid),
          description: ''
        };
      }
    });
    const featured_shop_categories = Object.values(categoryMap);

    return {
      featured_services: featured_services,
      featured_deals: featured_deals,
      featured_shop_categories: featured_shop_categories
    };
  }

  // ---------- Services page ----------
  getServicesPageData() {
    const serviceAreaInfos = this._getFromStorage('service_area_infos', []);
    const services = this._getFromStorage('services', []).filter(
      (s) => s.status === 'active'
    );

    const service_areas = serviceAreaInfos.map((info) => {
      const label = info.service_type === 'bike' ? 'Bike Service' : 'Ski & Snowboard Service';
      const summary = info.description || '';
      const relatedServices = services.filter((s) => s.service_type === info.service_type);

      const categories = {};
      relatedServices.forEach((s) => {
        if (!categories[s.service_category]) {
          categories[s.service_category] = {
            id: s.service_category,
            name: this._mapServiceCategoryIdToName(info.service_type, s.service_category),
            description: ''
          };
        }
      });

      const recommended_subcategories = Object.values(categories);
      const popular_services = relatedServices
        .filter((s) => s.service_category === 'tune_ups')
        .slice(0, 5);

      return {
        info: info,
        service_type_label: label,
        summary: summary,
        recommended_subcategories: recommended_subcategories,
        popular_services: popular_services
      };
    });

    return { service_areas: service_areas };
  }

  getServiceCategoryPageData(serviceType) {
    const serviceAreaInfos = this._getFromStorage('service_area_infos', []);
    const service_area_info =
      serviceAreaInfos.find((info) => info.service_type === serviceType) || null;

    const services = this._getFromStorage('services', []).filter(
      (s) => s.service_type === serviceType && s.status === 'active'
    );

    const tune_up_services = services.filter((s) => s.service_category === 'tune_ups');
    const repair_services = services.filter((s) => s.service_category === 'repairs');
    const bundle_services = services.filter((s) => s.service_category === 'bundles');

    const allFaqs = this._getFromStorage('service_category_faqs', []);
    const faqs = [];
    if (Array.isArray(allFaqs)) {
      allFaqs.forEach((f) => {
        if (f.service_type === serviceType && f.question && f.answer) {
          faqs.push({ question: f.question, answer: f.answer });
        }
      });
    }

    return {
      service_area_info: service_area_info,
      tune_up_services: tune_up_services,
      repair_services: repair_services,
      bundle_services: bundle_services,
      faqs: faqs
    };
  }

  getServiceDetailForBooking(serviceId) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId) || null;

    if (!service) {
      return {
        service: null,
        includes_list: [],
        pricing_summary: '',
        quantity_config: {
          allow_quantity_selection: false,
          min_quantity: 1,
          max_quantity: 1,
          default_quantity: 1
        },
        drop_off_method_options: [],
        equipment_type_required: false,
        equipment_type_options: []
      };
    }

    const includes_list = Array.isArray(service.includes) ? service.includes.slice() : [];

    let pricing_summary = '';
    if (
      typeof service.base_price === 'number' &&
      typeof service.max_price === 'number' &&
      service.max_price > service.base_price
    ) {
      pricing_summary = '$' + service.base_price + ' - $' + service.max_price;
    } else if (typeof service.base_price === 'number') {
      pricing_summary = '$' + service.base_price;
    }

    const quantity_config = {
      allow_quantity_selection: !!service.allow_quantity_selection,
      min_quantity: 1,
      max_quantity: service.max_items_covered || 10,
      default_quantity: service.default_quantity || 1
    };

    const drop_off_method_options = [
      {
        value: 'in_store_drop_off',
        label: 'In-Store Drop-Off',
        description: ''
      },
      {
        value: 'night_before_drop_off',
        label: 'Night-Before Drop-Off',
        description: ''
      },
      {
        value: 'same_day_drop_off',
        label: 'Same-Day Drop-Off',
        description: ''
      }
    ];

    const equipment_type_required = !!service.requires_equipment_type;
    const equipment_type_options = [
      { value: 'road_bike', label: 'Road Bike' },
      { value: 'mountain_bike', label: 'Mountain Bike' },
      { value: 'hybrid_bike', label: 'Hybrid Bike' },
      { value: 'gravel_bike', label: 'Gravel Bike' },
      { value: 'kids_bike', label: 'Kids Bike' },
      { value: 'fat_bike', label: 'Fat Bike' },
      { value: 'skis', label: 'Skis' },
      { value: 'snowboard', label: 'Snowboard' },
      { value: 'mixed', label: 'Mixed' }
    ];

    return {
      service: service,
      includes_list: includes_list,
      pricing_summary: pricing_summary,
      quantity_config: quantity_config,
      drop_off_method_options: drop_off_method_options,
      equipment_type_required: equipment_type_required,
      equipment_type_options: equipment_type_options
    };
  }

  getServiceAvailableTimeSlots(serviceId, date) {
    return this._findAvailableServiceTimeSlots(serviceId, date);
  }

  createServiceAppointmentBooking(
    serviceId,
    quantityItems,
    appointmentDate,
    timeSlotId,
    dropOffMethod,
    equipmentType,
    bookingSource,
    notes
  ) {
    let services = this._getFromStorage('services', []);
    let service = services.find((s) => s.id === serviceId);
    if (!service || service.status !== 'active') {
      // Fallback: derive a minimal service definition from any matching active deal
      const deals = this._getFromStorage('deals', []);
      const dealForService = deals.find((d) => d.service_id === serviceId && d.is_active);

      if (dealForService) {
        const name = dealForService.name || 'Service';
        let service_type = 'bike';
        if (/ski|snowboard/i.test(name)) {
          service_type = 'ski_snowboard';
        }
        const service_category = /bundle/i.test(name) ? 'bundles' : 'tune_ups';

        service = {
          id: serviceId,
          name: name,
          service_type: service_type,
          service_category: service_category,
          description: dealForService.description || '',
          includes: [],
          base_price:
            typeof dealForService.price === 'number' ? dealForService.price : 0,
          max_price:
            typeof dealForService.original_price === 'number'
              ? dealForService.original_price
              : null,
          is_bundle: service_category === 'bundles',
          is_family_bundle: /family/i.test(name),
          min_items_covered: dealForService.min_items_covered || 1,
          max_items_covered: dealForService.max_items_covered || 10,
          allow_quantity_selection: true,
          default_quantity: dealForService.min_items_covered || 1,
          requires_equipment_type: true,
          status: 'active'
        };

        // Persist this derived service so other APIs can reference it
        services = services.slice();
        services.push(service);
        this._saveToStorage('services', services);
      } else {
        return {
          success: false,
          service_appointment: null,
          cart_item: null,
          cart_summary: null,
          message: 'Service not found or inactive.'
        };
      }
    }

    let serviceTimeSlots = this._getFromStorage('service_time_slots', []);
    let selectedSlot = null;
    if (timeSlotId) {
      selectedSlot = serviceTimeSlots.find((ts) => ts.id === timeSlotId) || null;
    }

    let appointmentDateISO = appointmentDate;
    if (selectedSlot && selectedSlot.date) {
      appointmentDateISO =
        typeof selectedSlot.date === 'string'
          ? selectedSlot.date
          : new Date(selectedSlot.date).toISOString();
    }

    const appointmentId = this._generateId('svc_appt');
    const nowIso = this._nowISO();

    const appointment = {
      id: appointmentId,
      booking_code: 'BK' + appointmentId,
      service_id: serviceId,
      time_slot_id: selectedSlot ? selectedSlot.id : null,
      service_type: service.service_type,
      service_name: service.name,
      quantity_items: quantityItems,
      appointment_date: appointmentDateISO,
      start_time: selectedSlot ? selectedSlot.start_time : null,
      end_time: selectedSlot ? selectedSlot.end_time : null,
      drop_off_method: dropOffMethod || null,
      equipment_type: equipmentType || null,
      customer_first_name: null,
      customer_last_name: '',
      contact_email: null,
      contact_phone: null,
      booking_source: bookingSource || 'services_page',
      status: 'in_cart',
      total_price:
        typeof service.base_price === 'number' ? service.base_price * quantityItems : null,
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso
    };

    const serviceAppointments = this._getFromStorage('service_appointments', []);
    serviceAppointments.push(appointment);
    this._saveToStorage('service_appointments', serviceAppointments);

    if (selectedSlot) {
      if (typeof selectedSlot.booked_count !== 'number') selectedSlot.booked_count = 0;
      selectedSlot.booked_count += 1;
      if (selectedSlot.capacity != null && selectedSlot.booked_count >= selectedSlot.capacity) {
        selectedSlot.is_available = false;
      }
      const idx = serviceTimeSlots.findIndex((ts) => ts.id === selectedSlot.id);
      if (idx !== -1) {
        serviceTimeSlots[idx] = selectedSlot;
        this._saveToStorage('service_time_slots', serviceTimeSlots);
      }
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const cartItemId = this._generateId('cart_item');
    const unitPrice = appointment.total_price != null ? appointment.total_price : 0;

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'service_appointment',
      product_id: null,
      service_appointment_id: appointment.id,
      rental_reservation_id: null,
      name: service.name,
      quantity: 1,
      unit_price: unitPrice,
      total_price: unitPrice,
      gift_card_amount: null,
      gift_card_recipient_name: null,
      gift_card_sender_name: null,
      gift_card_message: null,
      gift_card_delivery_type: null,
      service_date: appointment.appointment_date,
      service_start_time: appointment.start_time,
      service_end_time: appointment.end_time,
      rental_start_date: null,
      rental_end_date: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart.id);
    const cart_summary = {
      cart_id: cart.id,
      item_count: cart.item_ids.length,
      subtotal: totals.subtotal
    };

    return {
      success: true,
      service_appointment: appointment,
      cart_item: this._enrichCartItem(cartItem),
      cart_summary: cart_summary,
      message: 'Service appointment added to cart.'
    };
  }

  // ---------- Deals ----------
  getActiveDeals(dealType) {
    // Use metadata baseline date if available so tests are time-stable
    let now = new Date();
    try {
      const metaRaw = localStorage.getItem('_metadata');
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        if (meta && meta.baselineDate) {
          now = new Date(meta.baselineDate + 'T00:00:00Z');
        }
      }
    } catch (e) {}
    const dealsRaw = this._getFromStorage('deals', []);
    let deals = dealsRaw.filter((d) => d.is_active);

    deals = deals.filter((d) => {
      const start = d.start_date ? new Date(d.start_date) : null;
      const end = d.end_date ? new Date(d.end_date) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    });

    if (dealType) {
      deals = deals.filter((d) => d.deal_type === dealType);
    }

    return deals.map((d) => this._enrichDeal(d));
  }

  getDealDetails(dealId) {
    const deals = this._getFromStorage('deals', []);
    const deal = deals.find((d) => d.id === dealId) || null;
    if (!deal) {
      return {
        deal: null,
        related_service: null,
        related_rental_bike: null,
        related_product: null
      };
    }

    const enriched = this._enrichDeal(deal);
    return {
      deal: enriched,
      related_service: enriched.service || null,
      related_rental_bike: enriched.rental_bike || null,
      related_product: enriched.product || null
    };
  }

  // ---------- Rentals ----------
  searchRentalBikes(bikeType, suspension, size, maxDailyRate, isDemo, sortBy, sortDirection) {
    const rentalBikes = this._getFromStorage('rental_bikes', []);
    const results = this._applyRentalBikeFiltersAndSorting(rentalBikes, {
      bikeType: bikeType,
      suspension: suspension,
      size: size,
      maxDailyRate: maxDailyRate,
      isDemo: isDemo,
      sortBy: sortBy,
      sortDirection: sortDirection
    });

    return { results: results };
  }

  getRentalBikeDetail(rentalBikeId) {
    const rentalBikes = this._getFromStorage('rental_bikes', []);
    const rental_bike = rentalBikes.find((rb) => rb.id === rentalBikeId) || null;

    const rentalAddons = this._getFromStorage('rental_addons', []);
    const available_addons = rentalAddons.filter((a) => a.is_active);

    const deals = this._getFromStorage('deals', []);
    const relatedDealsRaw = deals.filter(
      (d) => d.deal_type === 'rental' && d.rental_bike_id === rentalBikeId && d.is_active
    );
    const related_deals = relatedDealsRaw.map((d) => this._enrichDeal(d));

    return {
      rental_bike: rental_bike,
      available_addons: available_addons,
      related_deals: related_deals
    };
  }

  createRentalReservation(
    rentalBikeId,
    startDate,
    endDate,
    durationType,
    addonIds,
    paymentMethod
  ) {
    const rentalBikes = this._getFromStorage('rental_bikes', []);
    const bike = rentalBikes.find((rb) => rb.id === rentalBikeId);

    if (!bike || bike.status !== 'available') {
      return {
        success: false,
        rental_reservation: null,
        cart_item: null,
        cart_summary: null,
        message: 'Rental bike not found or unavailable.'
      };
    }

    const rentalAddons = this._getFromStorage('rental_addons', []);
    const selectedAddonIds = Array.isArray(addonIds) ? addonIds : [];
    const selectedAddons = rentalAddons.filter(
      (a) => selectedAddonIds.indexOf(a.id) !== -1
    );

    const start = startDate;
    const end = endDate;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const msPerDay = 24 * 60 * 60 * 1000;
    let dayCount = 1;
    if (durationType === 'multi_day') {
      dayCount = Math.max(1, Math.round((endDateObj - startDateObj) / msPerDay) + 1);
    } else {
      dayCount = 1;
    }

    const dailyRate = bike.daily_rate;
    let basePrice = typeof dailyRate === 'number' ? dailyRate * dayCount : 0;
    const addonsTotal = selectedAddons.reduce(
      (sum, a) => sum + (a.price || 0),
      0
    );
    const totalPrice = basePrice + addonsTotal;

    const reservationId = this._generateId('rental_res');
    const nowIso = this._nowISO();

    const reservation = {
      id: reservationId,
      rental_bike_id: rentalBikeId,
      rental_bike_name: bike.name,
      start_date: start,
      end_date: end,
      duration_type: durationType,
      addon_ids: selectedAddonIds,
      selected_addon_names: selectedAddons.map((a) => a.name),
      payment_method: paymentMethod || 'pay_in_store_at_pickup',
      status: 'in_cart',
      daily_rate: dailyRate,
      total_price: totalPrice,
      created_at: nowIso,
      updated_at: nowIso
    };

    const rentalReservations = this._getFromStorage('rental_reservations', []);
    rentalReservations.push(reservation);
    this._saveToStorage('rental_reservations', rentalReservations);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const cartItemId = this._generateId('cart_item');

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'rental_reservation',
      product_id: null,
      service_appointment_id: null,
      rental_reservation_id: reservation.id,
      name: bike.name,
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      gift_card_amount: null,
      gift_card_recipient_name: null,
      gift_card_sender_name: null,
      gift_card_message: null,
      gift_card_delivery_type: null,
      service_date: null,
      service_start_time: null,
      service_end_time: null,
      rental_start_date: reservation.start_date,
      rental_end_date: reservation.end_date
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart.id);
    const cart_summary = {
      cart_id: cart.id,
      item_count: cart.item_ids.length,
      subtotal: totals.subtotal
    };

    return {
      success: true,
      rental_reservation: reservation,
      cart_item: this._enrichCartItem(cartItem),
      cart_summary: cart_summary,
      message: 'Rental reservation added to cart.'
    };
  }

  // ---------- Products & Gift Cards ----------
  getProductFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []).filter(
      (p) => p.status === 'active' && (categoryId ? p.category_id === categoryId : true)
    );

    const subcategoryMap = {};
    let minPrice = null;
    let maxPrice = null;
    const fulfillmentMap = {};

    products.forEach((p) => {
      if (p.subcategory_id) {
        if (!subcategoryMap[p.subcategory_id]) {
          subcategoryMap[p.subcategory_id] = {
            id: p.subcategory_id,
            name: this._mapSubcategoryIdToName(p.subcategory_id)
          };
        }
      }
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (Array.isArray(p.fulfillment_options)) {
        p.fulfillment_options.forEach((opt) => {
          if (!fulfillmentMap[opt]) {
            fulfillmentMap[opt] = {
              value: opt,
              label: this._mapFulfillmentOptionToLabel(opt)
            };
          }
        });
      }
    });

    const category_name = this._mapCategoryIdToName(categoryId);
    const subcategories = Object.values(subcategoryMap);
    const price = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      currency: 'USD'
    };
    const rating_thresholds = [
      { value: 3, label: '3 stars & up' },
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];
    const fulfillment_options = Object.values(fulfillmentMap);
    const sort_options = [
      { value: 'price', label: 'Price' },
      { value: 'rating', label: 'Rating' },
      { value: 'name', label: 'Name' }
    ];

    return {
      category_id: categoryId,
      category_name: category_name,
      subcategories: subcategories,
      price: price,
      rating_thresholds: rating_thresholds,
      fulfillment_options: fulfillment_options,
      sort_options: sort_options
    };
  }

  listProducts(
    categoryId,
    subcategoryId,
    searchQuery,
    filters,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    let products = this._getFromStorage('products', []).filter((p) => p.status === 'active');

    if (categoryId) {
      products = products.filter((p) => p.category_id === categoryId);
    }
    if (subcategoryId) {
      products = products.filter((p) => p.subcategory_id === subcategoryId);
    }

    products = this._applyProductFiltersAndSorting(
      products,
      filters || {},
      sortBy,
      sortDirection,
      searchQuery
    );

    const total = products.length;
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * size;
    const paged = products.slice(startIndex, startIndex + size);

    return { products: paged, total: total, page: p, pageSize: size };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;

    let gift_card_config = {
      is_gift_card: false,
      delivery_types: [],
      allow_custom_amount: false,
      min_amount: null,
      max_amount: null,
      fixed_amounts: []
    };

    if (product && product.is_gift_card) {
      const delivery_types = [];
      if (product.gift_card_delivery_type) {
        delivery_types.push({
          value: product.gift_card_delivery_type,
          label: this._mapGiftCardDeliveryTypeToLabel(product.gift_card_delivery_type)
        });
      }

      gift_card_config = {
        is_gift_card: true,
        delivery_types: delivery_types,
        allow_custom_amount: !!product.allow_custom_amount,
        min_amount: product.min_gift_card_amount || null,
        max_amount: product.max_gift_card_amount || null,
        fixed_amounts: Array.isArray(product.fixed_gift_card_amounts)
          ? product.fixed_gift_card_amounts
          : []
      };
    }

    return { product: product, gift_card_config: gift_card_config };
  }

  addProductToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);

    if (!product || product.status !== 'active') {
      return {
        success: false,
        cart_item: null,
        cart_summary: null,
        message: 'Product not found or inactive.'
      };
    }

    if (product.is_gift_card) {
      return {
        success: false,
        cart_item: null,
        cart_summary: null,
        message: 'Use addGiftCardToCart for gift card products.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let cartItem = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.item_type === 'product' && ci.product_id === productId
    );

    const unitPrice = product.price;

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.total_price = cartItem.quantity * unitPrice;
    } else {
      const cartItemId = this._generateId('cart_item');
      cartItem = {
        id: cartItemId,
        cart_id: cart.id,
        item_type: 'product',
        product_id: productId,
        service_appointment_id: null,
        rental_reservation_id: null,
        name: product.name,
        quantity: qty,
        unit_price: unitPrice,
        total_price: unitPrice * qty,
        gift_card_amount: null,
        gift_card_recipient_name: null,
        gift_card_sender_name: null,
        gift_card_message: null,
        gift_card_delivery_type: null,
        service_date: null,
        service_start_time: null,
        service_end_time: null,
        rental_start_date: null,
        rental_end_date: null
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
      cart.item_ids.push(cartItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart.id);
    const cart_summary = {
      cart_id: cart.id,
      item_count: cart.item_ids.length,
      subtotal: totals.subtotal
    };

    return {
      success: true,
      cart_item: this._enrichCartItem(cartItem),
      cart_summary: cart_summary,
      message: 'Product added to cart.'
    };
  }

  addGiftCardToCart(productId, amount, recipientName, senderName, message, deliveryType) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);

    if (!product || !product.is_gift_card || product.status !== 'active') {
      return {
        success: false,
        cart_item: null,
        cart_summary: null,
        message: 'Gift card product not found or inactive.'
      };
    }

    if (product.gift_card_delivery_type && product.gift_card_delivery_type !== deliveryType) {
      return {
        success: false,
        cart_item: null,
        cart_summary: null,
        message: 'Unsupported delivery type for this gift card.'
      };
    }

    const amountNum = typeof amount === 'number' ? amount : 0;
    if (amountNum <= 0) {
      return {
        success: false,
        cart_item: null,
        cart_summary: null,
        message: 'Gift card amount must be positive.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const cartItemId = this._generateId('cart_item');

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'gift_card',
      product_id: productId,
      service_appointment_id: null,
      rental_reservation_id: null,
      name: product.name,
      quantity: 1,
      unit_price: amountNum,
      total_price: amountNum,
      gift_card_amount: amountNum,
      gift_card_recipient_name: recipientName,
      gift_card_sender_name: senderName,
      gift_card_message: message || null,
      gift_card_delivery_type: deliveryType,
      service_date: null,
      service_start_time: null,
      service_end_time: null,
      rental_start_date: null,
      rental_end_date: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart.id);
    const cart_summary = {
      cart_id: cart.id,
      item_count: cart.item_ids.length,
      subtotal: totals.subtotal
    };

    return {
      success: true,
      cart_item: this._enrichCartItem(cartItem),
      cart_summary: cart_summary,
      message: 'Gift card added to cart.'
    };
  }

  // ---------- Cart ----------
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsForCart.map((ci) => {
      const enriched = this._enrichCartItem(ci);
      return {
        cart_item_id: enriched.id,
        item_type: enriched.item_type,
        name: enriched.name,
        quantity: enriched.quantity,
        unit_price: enriched.unit_price,
        total_price: enriched.total_price,
        service_date: enriched.service_date ? this._parseDateOnly(enriched.service_date) : null,
        service_start_time: enriched.service_start_time || null,
        service_end_time: enriched.service_end_time || null,
        rental_start_date: enriched.rental_start_date
          ? this._parseDateOnly(enriched.rental_start_date)
          : null,
        rental_end_date: enriched.rental_end_date
          ? this._parseDateOnly(enriched.rental_end_date)
          : null,
        payment_method_hint:
          enriched.item_type === 'rental_reservation' ? 'pay_in_store_at_pickup' : null,
        product: enriched.product || null,
        service_appointment: enriched.service_appointment || null,
        rental_reservation: enriched.rental_reservation || null
      };
    });

    const totals = this._calculateCartTotals(cart.id);
    return {
      cart_id: cart.id,
      items: items,
      subtotal: totals.subtotal,
      currency: cart.currency || 'USD'
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex(
      (ci) => ci.id === cartItemId && ci.cart_id === cart.id
    );
    if (idx === -1) {
      const totalsNotFound = this._calculateCartTotals(cart.id);
      return {
        success: false,
        cart_summary: {
          cart_id: cart.id,
          item_count: Array.isArray(cart.item_ids) ? cart.item_ids.length : 0,
          subtotal: totalsNotFound.subtotal
        },
        message: 'Cart item not found.'
      };
    }

    const cartItem = cartItems[idx];

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      if (Array.isArray(cart.item_ids)) {
        cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
      }
      this._saveCart(cart);
    } else {
      cartItem.quantity = quantity;
      cartItem.total_price = (cartItem.unit_price || 0) * quantity;
      cartItems[idx] = cartItem;
      this._saveToStorage('cart_items', cartItems);
      this._saveCart(cart);
    }

    const totals = this._calculateCartTotals(cart.id);
    const cart_summary = {
      cart_id: cart.id,
      item_count: Array.isArray(cart.item_ids) ? cart.item_ids.length : 0,
      subtotal: totals.subtotal
    };

    return { success: true, cart_summary: cart_summary, message: 'Cart item updated.' };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex(
      (ci) => ci.id === cartItemId && ci.cart_id === cart.id
    );
    if (idx !== -1) {
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      if (Array.isArray(cart.item_ids)) {
        cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
      }
      this._saveCart(cart);
    }

    const totals = this._calculateCartTotals(cart.id);
    const cart_summary = {
      cart_id: cart.id,
      item_count: Array.isArray(cart.item_ids) ? cart.item_ids.length : 0,
      subtotal: totals.subtotal
    };

    return { success: true, cart_summary: cart_summary, message: 'Cart item removed.' };
  }

  // ---------- Checkout & Payment ----------
  getCheckoutPageData() {
    const cart = this._getOrCreateCart();
    const order = this._getOrCreateOrderForCurrentCart();

    const cartSummaryData = this.getCartSummary();
    const itemsSimple = cartSummaryData.items.map((i) => ({
      name: i.name,
      item_type: i.item_type,
      quantity: i.quantity,
      total_price: i.total_price
    }));

    const totals = this._calculateCartTotals(cart.id);
    const cart_summary = {
      items: itemsSimple,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total
    };

    const contact_info = {
      contact_name: order.contact_name || '',
      contact_email: order.contact_email || '',
      contact_phone: order.contact_phone || ''
    };

    const shipping_options = [
      {
        value: 'standard_5_7_days',
        label: 'Standard (57 days)',
        description: ''
      },
      {
        value: 'expedited_2_3_days',
        label: 'Expedited (23 days)',
        description: ''
      },
      {
        value: 'overnight_1_2_days',
        label: 'Overnight (12 days)',
        description: ''
      },
      {
        value: 'in_store_pickup',
        label: 'In-Store Pickup',
        description: ''
      }
    ];

    const orderWithCart = Object.assign({}, order, { cart: cart });

    return {
      order: orderWithCart,
      cart_summary: cart_summary,
      contact_info: contact_info,
      shipping_options: shipping_options
    };
  }

  submitCheckoutContactAndShipping(
    contactName,
    contactEmail,
    contactPhone,
    shippingMethod,
    shippingAddress
  ) {
    const cart = this._getOrCreateCart();
    let orders = this._getFromStorage('orders', []);
    let order = orders.find(
      (o) => o.cart_id === cart.id && (o.status === 'in_progress' || o.status === 'awaiting_payment')
    );

    if (!order) {
      order = this._getOrCreateOrderForCurrentCart();
      orders = this._getFromStorage('orders', []);
    }

    order.contact_name = contactName;
    order.contact_email = contactEmail;
    order.contact_phone = contactPhone;
    order.shipping_method = shippingMethod;

    if (shippingAddress) {
      order.shipping_address_line1 = shippingAddress.line1 || '';
      order.shipping_address_line2 = shippingAddress.line2 || '';
      order.shipping_city = shippingAddress.city || '';
      order.shipping_region = shippingAddress.region || '';
      order.shipping_postal_code = shippingAddress.postalCode || '';
      order.shipping_country = shippingAddress.country || '';
    }

    order.status = 'awaiting_payment';
    const totals = this._calculateCartTotals(cart.id);
    order.subtotal = totals.subtotal;
    order.tax = totals.tax;
    order.total = totals.total;
    order.updated_at = this._nowISO();

    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx === -1) {
      orders.push(order);
    } else {
      orders[idx] = order;
    }
    this._saveToStorage('orders', orders);

    const orderWithCart = Object.assign({}, order, { cart: cart });

    return { success: true, order: orderWithCart, message: 'Contact and shipping info saved.' };
  }

  getPaymentPageData() {
    const cart = this._getOrCreateCart();
    let order = this._getOrCreateOrderForCurrentCart();

    order.reached_payment_step = true;
    order.status = 'awaiting_payment';
    order.updated_at = this._nowISO();

    let orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx === -1) {
      orders.push(order);
    } else {
      orders[idx] = order;
    }
    this._saveToStorage('orders', orders);

    const allowed_payment_methods = [
      { value: 'credit_card', label: 'Credit Card' },
      { value: 'pay_in_store_at_pickup', label: 'Pay In-Store at Pickup' },
      { value: 'gift_card', label: 'Gift Card' }
    ];

    const totals = this._calculateCartTotals(cart.id);
    const cart_summary = {
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total
    };

    const orderWithCart = Object.assign({}, order, { cart: cart });

    return {
      order: orderWithCart,
      allowed_payment_methods: allowed_payment_methods,
      cart_summary: cart_summary
    };
  }

  setOrderPaymentMethod(paymentMethod) {
    const cart = this._getOrCreateCart();
    let orders = this._getFromStorage('orders', []);
    let order = orders.find(
      (o) => o.cart_id === cart.id && (o.status === 'in_progress' || o.status === 'awaiting_payment')
    );

    if (!order) {
      order = this._getOrCreateOrderForCurrentCart();
      orders = this._getFromStorage('orders', []);
    }

    order.payment_method = paymentMethod;
    order.payment_status = 'pending';
    order.updated_at = this._nowISO();

    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx === -1) {
      orders.push(order);
    } else {
      orders[idx] = order;
    }
    this._saveToStorage('orders', orders);

    const orderWithCart = Object.assign({}, order, { cart: cart });

    return { success: true, order: orderWithCart, message: 'Payment method set.' };
  }

  // ---------- My Appointments ----------
  lookupAppointmentByCode(bookingCode, lastName) {
    const serviceAppointments = this._getFromStorage('service_appointments', []);
    const appointment = serviceAppointments.find(
      (sa) =>
        sa.booking_code === bookingCode &&
        (sa.customer_last_name || '').toLowerCase() === (lastName || '').toLowerCase()
    );

    if (!appointment) {
      return { found: false, appointment: null, message: 'Appointment not found.' };
    }

    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === appointment.service_id) || null;
    const enrichedAppointment = Object.assign({}, appointment, { service: service });

    return { found: true, appointment: enrichedAppointment, message: 'Appointment found.' };
  }

  getAppointmentDetails(appointmentId) {
    const serviceAppointments = this._getFromStorage('service_appointments', []);
    const appointment = serviceAppointments.find((sa) => sa.id === appointmentId) || null;

    const services = this._getFromStorage('services', []);
    const service = appointment ? services.find((s) => s.id === appointment.service_id) || null : null;
    const enrichedAppointment = appointment
      ? Object.assign({}, appointment, { service: service })
      : null;

    return { appointment: enrichedAppointment, service: service };
  }

  rescheduleAppointment(appointmentId, timeSlotId) {
    let serviceAppointments = this._getFromStorage('service_appointments', []);
    const idxAppt = serviceAppointments.findIndex((sa) => sa.id === appointmentId);

    if (idxAppt === -1) {
      return { success: false, appointment: null, message: 'Appointment not found.' };
    }

    const appointment = serviceAppointments[idxAppt];
    let serviceTimeSlots = this._getFromStorage('service_time_slots', []);
    const newSlot = serviceTimeSlots.find((ts) => ts.id === timeSlotId);

    if (!newSlot) {
      return { success: false, appointment: null, message: 'Time slot not found.' };
    }

    // Adjust old slot
    if (appointment.time_slot_id) {
      const oldSlotIdx = serviceTimeSlots.findIndex((ts) => ts.id === appointment.time_slot_id);
      if (oldSlotIdx !== -1) {
        const oldSlot = serviceTimeSlots[oldSlotIdx];
        if (typeof oldSlot.booked_count === 'number' && oldSlot.booked_count > 0) {
          oldSlot.booked_count -= 1;
        }
        if (oldSlot.capacity != null && oldSlot.booked_count < oldSlot.capacity) {
          oldSlot.is_available = true;
        }
        serviceTimeSlots[oldSlotIdx] = oldSlot;
      }
    }

    if (!newSlot.is_available && newSlot.capacity != null) {
      if (typeof newSlot.booked_count === 'number' && newSlot.booked_count >= newSlot.capacity) {
        return { success: false, appointment: null, message: 'Selected time slot is full.' };
      }
    }

    if (typeof newSlot.booked_count !== 'number') newSlot.booked_count = 0;
    newSlot.booked_count += 1;
    if (newSlot.capacity != null && newSlot.booked_count >= newSlot.capacity) {
      newSlot.is_available = false;
    }

    const newSlotIdx = serviceTimeSlots.findIndex((ts) => ts.id === newSlot.id);
    if (newSlotIdx !== -1) {
      serviceTimeSlots[newSlotIdx] = newSlot;
    }
    this._saveToStorage('service_time_slots', serviceTimeSlots);

    appointment.time_slot_id = newSlot.id;
    appointment.appointment_date = newSlot.date;
    appointment.start_time = newSlot.start_time;
    appointment.end_time = newSlot.end_time;
    appointment.status = 'rescheduled';
    appointment.updated_at = this._nowISO();

    serviceAppointments[idxAppt] = appointment;
    this._saveToStorage('service_appointments', serviceAppointments);

    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === appointment.service_id) || null;
    const enrichedAppointment = Object.assign({}, appointment, { service: service });

    return { success: true, appointment: enrichedAppointment, message: 'Appointment rescheduled.' };
  }

  // ---------- Contact ----------
  getContactPageInfo() {
    const stored = this._getFromStorage('contact_page_info', null);
    if (stored) {
      return stored;
    }

    const storeInfo = this._getFromStorage('store_info', null);
    const address =
      storeInfo && storeInfo.address
        ? storeInfo.address
        : { line1: '', line2: '', city: '', region: '', postalCode: '', country: '' };
    const hours = storeInfo && Array.isArray(storeInfo.hours) ? storeInfo.hours : [];

    return {
      phone: storeInfo && storeInfo.phone ? storeInfo.phone : '555-555-5555',
      email: storeInfo && storeInfo.email ? storeInfo.email : 'info@example.com',
      address: address,
      hours: hours
    };
  }

  submitContactMessage(
    name,
    email,
    subject,
    message,
    relatedServiceType,
    requestedServiceDate
  ) {
    const id = this._generateId('contact_msg');
    const nowIso = this._nowISO();

    const contact_message = {
      id: id,
      name: name,
      email: email,
      subject: subject,
      message: message,
      related_service_type: relatedServiceType || 'general',
      requested_service_date: requestedServiceDate || null,
      created_at: nowIso,
      status: 'new'
    };

    const contactMessages = this._getFromStorage('contact_messages', []);
    contactMessages.push(contact_message);
    this._saveToStorage('contact_messages', contactMessages);

    return { success: true, contact_message: contact_message, message: 'Message submitted.' };
  }

  // ---------- Store Info & Policies ----------
  getStoreInfo() {
    const storeInfo = this._getFromStorage('store_info', null);
    if (storeInfo) return storeInfo;
    return {
      about_text: '',
      services_focus: '',
      address: { line1: '', line2: '', city: '', region: '', postalCode: '', country: '' },
      hours: [],
      parking_info: '',
      general_turnaround_summary: ''
    };
  }

  getPoliciesAndFaqContent(context) {
    const stored = this._getFromStorage('policies_and_faq', { sections: [] });
    let sections = stored.sections || [];

    if (context && context !== 'all') {
      sections = sections.filter(
        (s) => s.related_area === context || s.related_area === 'all'
      );
    }

    return { sections: sections };
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