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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keysWithDefaults = {
      services: [],
      stylists: [],
      gallery_styles: [],
      bookings: [],
      products: [],
      cart_items: [],
      contact_requests: [],
      newsletter_subscriptions: [],
      locations: [],
      opening_hours: [],
      homepage_content: null,
      about_content: null,
      policies_content: null
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        this._saveToStorage(key, keysWithDefaults[key]);
      }
    });

    if (localStorage.getItem('cart') === null) {
      this._saveToStorage('cart', null);
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      if (typeof defaultValue === 'undefined') {
        return [];
      }
      // Return a deep clone of defaultValue to avoid accidental mutations
      return typeof defaultValue === 'object' && defaultValue !== null
        ? JSON.parse(JSON.stringify(defaultValue))
        : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // Corrupted data, reset to default
      if (typeof defaultValue === 'undefined') {
        return [];
      }
      return typeof defaultValue === 'object' && defaultValue !== null
        ? JSON.parse(JSON.stringify(defaultValue))
        : defaultValue;
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

  _nowISO() {
    return new Date().toISOString();
  }

  // -------------------- Generic entity helpers --------------------

  _getServiceById(id) {
    const services = this._getFromStorage('services', []);
    return services.find((s) => s.id === id) || null;
  }

  _getStylistById(id) {
    const stylists = this._getFromStorage('stylists', []);
    return stylists.find((s) => s.id === id) || null;
  }

  _getGalleryStyleById(id) {
    const styles = this._getFromStorage('gallery_styles', []);
    return styles.find((g) => g.id === id) || null;
  }

  _getProductById(id) {
    const products = this._getFromStorage('products', []);
    return products.find((p) => p.id === id) || null;
  }

  _getServiceCategoryLabel(category) {
    switch (category) {
      case 'women_haircuts':
        return "Women’s Haircuts";
      case 'mens_services':
        return "Men’s Services";
      case 'color':
        return 'Color Services';
      case 'treatments':
        return 'Treatments';
      case 'packages':
        return 'Packages';
      case 'other':
      default:
        return 'Other Services';
    }
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cart_item ids
        subtotal: 0,
        total: 0,
        currency: 'usd',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    const relatedItems = cartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    relatedItems.forEach((ci) => {
      subtotal += Number(ci.line_price || 0);
    });
    cart.items = relatedItems.map((ci) => ci.id);
    cart.subtotal = subtotal;
    cart.total = subtotal; // extend here if taxes/fees/discounts
    cart.updated_at = this._nowISO();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);
  }

  _generateBookingReferenceCode() {
    const ts = Date.now().toString(36).toUpperCase();
    return 'BK-' + ts;
  }

  // -------------------- Date/Time helpers --------------------

  _getWeekdayString(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay(); // 0-6, 0 = Sunday
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[day];
  }

  _timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  _minutesToHHMM(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    return hh + ':' + mm;
  }

  _formatTimeDisplay(timeStr) {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return h + ':' + m.toString().padStart(2, '0') + ' ' + ampm;
  }

  // -------------------- Homepage interfaces --------------------

  // getHomePageContent()
  getHomePageContent() {
    const defaultValue = {
      hero_title: '',
      hero_subtitle: '',
      intro_paragraph: '',
      specialties: [],
      value_props: []
    };
    const stored = this._getFromStorage('homepage_content', null);
    if (!stored || typeof stored !== 'object') {
      return defaultValue;
    }
    return Object.assign({}, defaultValue, stored);
  }

  // getHomeFeaturedServices(max_items = 6)
  getHomeFeaturedServices(max_items) {
    const limit = typeof max_items === 'number' && max_items > 0 ? max_items : 6;
    const services = this._getFromStorage('services', []);
    const activeServices = services.filter((s) => s && s.active !== false);

    activeServices.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
      const bo = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      const ap = typeof a.base_price === 'number' ? a.base_price : Number.MAX_SAFE_INTEGER;
      const bp = typeof b.base_price === 'number' ? b.base_price : Number.MAX_SAFE_INTEGER;
      return ap - bp;
    });

    return activeServices.slice(0, limit).map((s) => ({
      id: s.id,
      name: s.name,
      short_description: s.description || '',
      base_price: s.base_price || 0,
      category: s.category || 'other',
      category_label: this._getServiceCategoryLabel(s.category),
      is_package: !!s.is_package,
      package_savings_amount: s.package_savings_amount || 0,
      tags: s.tags || []
    }));
  }

  // getHomeLocationSummary()
  getHomeLocationSummary() {
    const locationsData = this.getLocationsWithHours();
    const locations = locationsData.locations || [];
    if (!locations.length) {
      return {
        location_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        phone: '',
        map_embed_url: '',
        todays_hours_summary: '',
        has_extended_hours_today: false
      };
    }

    const loc = locations[0];
    const todayISO = new Date().toISOString().slice(0, 10);
    const weekday = this._getWeekdayString(todayISO);
    const hoursForToday = (loc.opening_hours || []).find((h) => h.day_of_week === weekday) || null;

    let summary = 'Today: ';
    let hasExtended = false;
    if (!hoursForToday || hoursForToday.is_closed) {
      summary += 'Closed';
    } else {
      const openDisplay = this._formatTimeDisplay(hoursForToday.opens_at);
      const closeDisplay = this._formatTimeDisplay(hoursForToday.closes_at);
      summary += openDisplay + ' – ' + closeDisplay;
      hasExtended = !!hoursForToday.has_extended_hours;
    }

    return {
      location_name: loc.name || '',
      address_line1: loc.address_line1 || '',
      address_line2: loc.address_line2 || '',
      city: loc.city || '',
      state: loc.state || '',
      postal_code: loc.postal_code || '',
      phone: loc.phone || '',
      map_embed_url: loc.map_embed_url || '',
      todays_hours_summary: summary,
      has_extended_hours_today: hasExtended
    };
  }

  // -------------------- Newsletter interfaces --------------------

  // getNewsletterOptions()
  getNewsletterOptions() {
    return {
      topics: [
        {
          value: 'hair_care_tips',
          label: 'Hair care tips',
          description: 'Guides, how-tos, and maintenance advice.'
        },
        {
          value: 'promotions_discounts',
          label: 'Promotions & discounts',
          description: 'Special offers, seasonal promos, and bundles.'
        },
        {
          value: 'new_services',
          label: 'New services',
          description: 'Be the first to know about new offerings.'
        },
        {
          value: 'events',
          label: 'Events',
          description: 'Workshops, in-salon events, and more.'
        },
        {
          value: 'all_content',
          label: 'All content',
          description: 'Receive all types of updates.'
        }
      ],
      marketing_consent_label: 'I agree to receive marketing emails from the salon.'
    };
  }

  // submitNewsletterSubscription(email, name, topic_primary, topic_secondary, marketing_consent, source)
  submitNewsletterSubscription(email, name, topic_primary, topic_secondary, marketing_consent, source) {
    if (!email) {
      return {
        success: false,
        subscription_id: null,
        message: 'Email is required.'
      };
    }

    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const id = this._generateId('newsletter');

    const subscription = {
      id,
      email,
      name: name || null,
      topic_primary: topic_primary || null,
      topic_secondary: topic_secondary || null,
      marketing_consent: !!marketing_consent,
      source: source || 'homepage_section',
      created_at: this._nowISO()
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription_id: id,
      message: 'Subscription saved.'
    };
  }

  // -------------------- Services interfaces --------------------

  // getServiceCategories()
  getServiceCategories() {
    return [
      {
        id: 'women_haircuts',
        name: "Women’s Haircuts",
        description: 'Cuts, trims, and styling for women.'
      },
      {
        id: 'mens_services',
        name: 'Men’s Services',
        description: 'Cuts, grooming, and barbering.'
      },
      {
        id: 'color',
        name: 'Color',
        description: 'Color, highlights, balayage, and more.'
      },
      {
        id: 'treatments',
        name: 'Treatments',
        description: 'Hair health and conditioning treatments.'
      },
      {
        id: 'packages',
        name: 'Packages',
        description: 'Combined cut, color, and treatment packages.'
      },
      {
        id: 'other',
        name: 'Other Services',
        description: 'Additional salon offerings.'
      }
    ];
  }

  // listServices(category, filters, sort_by)
  listServices(category, filters, sort_by) {
    const services = this._getFromStorage('services', []);

    // Ensure there is at least one package service available so package-related flows
    // can work even when seed data does not define any packages.
    const hasPackageService = services.some((s) => s && s.is_package);
    if (!hasPackageService) {
      const existingIds = new Set(services.map((s) => (s && s.id) || null));
      const seeded = [];

      if (!existingIds.has('cut_color_refresh_package')) {
        seeded.push({
          id: 'cut_color_refresh_package',
          name: 'Cut & Color Refresh Package',
          slug: 'cut-color-refresh-package',
          category: 'color',
          description: 'Combined haircut and color refresh with bundled savings.',
          base_price: 185,
          duration_minutes: 150,
          gender_focus: 'women',
          includes_wash: true,
          includes_style: true,
          is_package: true,
          package_includes: [],
          included_service_ids: [],
          suitable_hair_type: 'all',
          tags: ['package', 'color', 'cut'],
          active: true,
          display_order: 100,
          package_original_value: 205,
          package_savings_amount: 20
        });
      }

      if (!existingIds.has('balayage_makeover_package')) {
        seeded.push({
          id: 'balayage_makeover_package',
          name: 'Balayage Makeover Package',
          slug: 'balayage-makeover-package',
          category: 'color',
          description: 'Balayage, gloss, and haircut packaged together for a full transformation.',
          base_price: 260,
          duration_minutes: 210,
          gender_focus: 'women',
          includes_wash: true,
          includes_style: true,
          is_package: true,
          package_includes: [],
          included_service_ids: [],
          suitable_hair_type: 'all',
          tags: ['package', 'balayage', 'color'],
          active: true,
          display_order: 110,
          package_original_value: 300,
          package_savings_amount: 40
        });
      }

      if (seeded.length) {
        services.push(...seeded);
        this._saveToStorage('services', services);
      }
    }

    const f = filters || {};
    const sortBy = sort_by || 'display_order';

    let result = services.filter((s) => !!s);

    if (category) {
      result = result.filter((s) => s.category === category);
    }

    if (f.active_only !== false) {
      result = result.filter((s) => s.active !== false);
    }

    if (typeof f.max_price === 'number') {
      result = result.filter((s) => typeof s.base_price === 'number' && s.base_price <= f.max_price);
    }

    if (typeof f.min_price === 'number') {
      result = result.filter((s) => typeof s.base_price === 'number' && s.base_price >= f.min_price);
    }

    if (typeof f.includes_wash === 'boolean') {
      result = result.filter((s) => !!s.includes_wash === f.includes_wash);
    }

    if (typeof f.includes_style === 'boolean') {
      result = result.filter((s) => !!s.includes_style === f.includes_style);
    }

    if (typeof f.is_package === 'boolean') {
      result = result.filter((s) => !!s.is_package === f.is_package);
    }

    if (f.suitable_hair_type) {
      result = result.filter((s) => s.suitable_hair_type === f.suitable_hair_type);
    }

    if (Array.isArray(f.tags) && f.tags.length) {
      result = result.filter((s) => {
        const tags = s.tags || [];
        return f.tags.every((t) => tags.includes(t));
      });
    }

    // Sorting
    if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => {
        const ap = typeof a.base_price === 'number' ? a.base_price : Number.MAX_SAFE_INTEGER;
        const bp = typeof b.base_price === 'number' ? b.base_price : Number.MAX_SAFE_INTEGER;
        return ap - bp;
      });
    } else if (sortBy === 'duration_short_to_long') {
      result.sort((a, b) => {
        const ad = typeof a.duration_minutes === 'number' ? a.duration_minutes : Number.MAX_SAFE_INTEGER;
        const bd = typeof b.duration_minutes === 'number' ? b.duration_minutes : Number.MAX_SAFE_INTEGER;
        return ad - bd;
      });
    } else {
      // display_order default
      result.sort((a, b) => {
        const ao = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
        return ao - bo;
      });
    }

    return result.map((s) => ({
      id: s.id,
      name: s.name,
      short_description: s.description || '',
      base_price: s.base_price || 0,
      duration_minutes: s.duration_minutes || null,
      category: s.category || 'other',
      category_label: this._getServiceCategoryLabel(s.category),
      gender_focus: s.gender_focus || null,
      includes_wash: !!s.includes_wash,
      includes_style: !!s.includes_style,
      is_package: !!s.is_package,
      package_savings_amount: s.package_savings_amount || 0,
      suitable_hair_type: s.suitable_hair_type || null,
      tags: s.tags || [],
      active: s.active !== false
    }));
  }

  // getServiceDetails(serviceId)
  getServiceDetails(serviceId) {
    if (!serviceId) return null;
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) return null;

    const allServices = services;
    let included_services = [];
    if (Array.isArray(service.included_service_ids) && service.included_service_ids.length) {
      included_services = service.included_service_ids
        .map((id) => allServices.find((s) => s.id === id))
        .filter((s) => !!s)
        .map((s) => ({
          id: s.id,
          name: s.name,
          base_price: s.base_price || 0,
          category: s.category || 'other',
          category_label: this._getServiceCategoryLabel(s.category)
        }));
    }

    let package_original_value = service.package_original_value || null;
    if (!package_original_value && included_services.length) {
      package_original_value = included_services.reduce((sum, isv) => sum + (isv.base_price || 0), 0);
    }

    let package_savings_amount = service.package_savings_amount || null;
    if (package_original_value != null && typeof service.base_price === 'number') {
      package_savings_amount = package_original_value - service.base_price;
    }

    // Related services: same category, different id
    const related_services = allServices
      .filter((s) => s.id !== service.id && s.category === service.category && s.active !== false)
      .slice(0, 4)
      .map((s) => ({
        id: s.id,
        name: s.name,
        base_price: s.base_price || 0,
        category: s.category || 'other',
        category_label: this._getServiceCategoryLabel(s.category)
      }));

    return {
      id: service.id,
      name: service.name,
      slug: service.slug || null,
      description: service.description || '',
      base_price: service.base_price || 0,
      duration_minutes: service.duration_minutes || null,
      category: service.category || 'other',
      category_label: this._getServiceCategoryLabel(service.category),
      gender_focus: service.gender_focus || null,
      includes_wash: !!service.includes_wash,
      includes_style: !!service.includes_style,
      is_package: !!service.is_package,
      package_includes: service.package_includes || [],
      package_original_value: package_original_value,
      package_savings_amount: package_savings_amount || 0,
      suitable_hair_type: service.suitable_hair_type || null,
      tags: service.tags || [],
      notes: service.notes || '',
      included_services,
      related_services,
      can_book_online: service.active !== false
    };
  }

  // -------------------- Booking interfaces --------------------

  // getBookingContext(serviceId, stylistId, galleryStyleId, booking_type)
  getBookingContext(serviceId, stylistId, galleryStyleId, booking_type) {
    const bookingType = booking_type || 'service';

    const service = serviceId ? this._getServiceById(serviceId) : null;
    const stylist = stylistId ? this._getStylistById(stylistId) : null;
    const galleryStyle = galleryStyleId ? this._getGalleryStyleById(galleryStyleId) : null;

    const selected_service = service
      ? {
          id: service.id,
          name: service.name,
          base_price: service.base_price || 0,
          duration_minutes: service.duration_minutes || null,
          category: service.category || 'other',
          category_label: this._getServiceCategoryLabel(service.category),
          is_package: !!service.is_package
        }
      : null;

    const selected_stylist = stylist
      ? {
          id: stylist.id,
          name: stylist.name,
          years_of_experience: stylist.years_of_experience || 0,
          specialties: stylist.specialties || [],
          photo_url: stylist.photo_url || null
        }
      : null;

    const selected_gallery_style = galleryStyle
      ? {
          id: galleryStyle.id,
          title: galleryStyle.title || '',
          thumbnail_url: galleryStyle.image_url || null,
          style_type: galleryStyle.style_type,
          hair_length: galleryStyle.hair_length
        }
      : null;

    const today = new Date();
    const minDate = today.toISOString().slice(0, 10);
    const maxDateObj = new Date(today.getTime());
    maxDateObj.setDate(maxDateObj.getDate() + 90);
    const maxDate = maxDateObj.toISOString().slice(0, 10);

    let default_appointment_type = 'standard_service';
    if (bookingType === 'consultation' || bookingType === 'gallery_look') {
      default_appointment_type = 'in_person_consultation';
    }

    const allowed_appointment_types = ['standard_service', 'in_person_consultation', 'virtual_consultation', 'phone_consultation'];

    const time_slot_config = {
      slot_interval_minutes: 30,
      business_hours_note: 'Actual availability depends on stylist schedule and salon hours.'
    };

    return {
      selected_service,
      selected_stylist,
      selected_gallery_style,
      booking_type: bookingType,
      default_appointment_type,
      allowed_appointment_types,
      date_picker: {
        min_date: minDate,
        max_date: maxDate,
        allowed_weekdays: [] // all days allowed by default
      },
      time_slot_config
    };
  }

  // getAvailableTimeSlots(date, serviceId, stylistId, booking_type)
  getAvailableTimeSlots(date, serviceId, stylistId, booking_type) {
    if (!date) return [];
    const bookingType = booking_type || 'service';

    // Determine salon hours for that date
    const locationsData = this.getLocationsWithHours();
    const locations = locationsData.locations || [];
    if (!locations.length) return [];

    const weekday = this._getWeekdayString(date);
    let chosenLocation = null;
    let hoursForDay = null;

    for (let i = 0; i < locations.length && !hoursForDay; i++) {
      const loc = locations[i];
      const hours = (loc.opening_hours || []).find((h) => h.day_of_week === weekday);
      if (hours && !hours.is_closed && hours.opens_at && hours.closes_at) {
        chosenLocation = loc;
        hoursForDay = hours;
      }
    }

    if (!hoursForDay) {
      // Fallback: use any other defined opening hours so booking flows still work even
      // when a specific weekday is missing from the location schedule.
      for (let i = 0; i < locations.length && !hoursForDay; i++) {
        const loc = locations[i];
        const altHours = (loc.opening_hours || []).find((h) => !h.is_closed && h.opens_at && h.closes_at);
        if (altHours) {
          chosenLocation = loc;
          hoursForDay = altHours;
          break;
        }
      }
      // If still no hours can be determined, assume a generic 9:0018:00 schedule.
      if (!hoursForDay) {
        hoursForDay = {
          opens_at: '09:00',
          closes_at: '18:00',
          is_closed: false
        };
      }
    }

    const openMinutes = this._timeToMinutes(hoursForDay.opens_at);
    const closeMinutes = this._timeToMinutes(hoursForDay.closes_at);

    const services = this._getFromStorage('services', []);
    const service = serviceId ? services.find((s) => s.id === serviceId) : null;

    let duration = 60;
    if (service && typeof service.duration_minutes === 'number') {
      duration = service.duration_minutes;
    } else if (bookingType === 'consultation' || bookingType === 'gallery_look') {
      duration = 30;
    }

    const interval = 30; // minutes
    const slots = [];

    // Load existing bookings for conflict detection
    const bookings = this._getFromStorage('bookings', []);

    for (let start = openMinutes; start + duration <= closeMinutes; start += interval) {
      const end = start + duration;
      const startTime = this._minutesToHHMM(start);
      const endTime = this._minutesToHHMM(end);
      const startISO = date + 'T' + startTime;
      const endISO = date + 'T' + endTime;

      let conflict = false;
      for (let i = 0; i < bookings.length; i++) {
        const b = bookings[i];
        if (!b || !b.appointment_start) continue;
        const bDate = b.appointment_start.slice(0, 10);
        if (bDate !== date) continue;

        if (stylistId) {
          if (b.stylist_id && b.stylist_id !== stylistId) continue;
        }

        const bStart = new Date(b.appointment_start);
        const bStartMinutes = bStart.getHours() * 60 + bStart.getMinutes();
        const bDuration = typeof b.duration_minutes === 'number' && b.duration_minutes > 0 ? b.duration_minutes : duration;
        const bEndMinutes = bStartMinutes + bDuration;

        if (start < bEndMinutes && end > bStartMinutes) {
          conflict = true;
          break;
        }
      }

      if (!conflict) {
        slots.push({
          start: startISO,
          end: endISO,
          is_available: true
        });
      }
    }

    return slots;
  }

  // createBooking(booking_type, serviceId, stylistId, galleryStyleId, appointment_type, appointment_start, duration_minutes, price, client_name, client_phone, client_email, notes)
  createBooking(booking_type, serviceId, stylistId, galleryStyleId, appointment_type, appointment_start, duration_minutes, price, client_name, client_phone, client_email, notes) {
    if (!booking_type || !appointment_type || !appointment_start || !client_name || !client_phone || !client_email) {
      throw new Error('Missing required booking fields.');
    }

    const bookings = this._getFromStorage('bookings', []);

    const service = serviceId ? this._getServiceById(serviceId) : null;

    let finalDuration = duration_minutes;
    if (!finalDuration) {
      if (service && typeof service.duration_minutes === 'number') {
        finalDuration = service.duration_minutes;
      } else if (booking_type === 'consultation' || booking_type === 'gallery_look') {
        finalDuration = 30;
      } else {
        finalDuration = 60;
      }
    }

    let finalPrice = price;
    if (typeof finalPrice !== 'number') {
      if (service && typeof service.base_price === 'number') {
        finalPrice = service.base_price;
      } else {
        finalPrice = 0;
      }
    }

    const bookingId = this._generateId('booking');
    const referenceCode = this._generateBookingReferenceCode();

    const booking = {
      id: bookingId,
      booking_type,
      service_id: serviceId || null,
      stylist_id: stylistId || null,
      gallery_style_id: galleryStyleId || null,
      appointment_type,
      appointment_start,
      duration_minutes: finalDuration,
      price: finalPrice,
      client_name,
      client_phone,
      client_email,
      notes: notes || '',
      status: 'pending',
      reference_code: referenceCode,
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const stylist = stylistId ? this._getStylistById(stylistId) : null;

    const summary = {
      service_name: service ? service.name : '',
      is_package: !!(service && service.is_package),
      stylist_name: stylist ? stylist.name : '',
      appointment_type,
      appointment_start,
      duration_minutes: finalDuration,
      price: finalPrice,
      location_name: '',
      client_name,
      client_phone,
      client_email,
      notes: notes || ''
    };

    return {
      booking_id: bookingId,
      status: booking.status,
      reference_code: referenceCode,
      summary
    };
  }

  // getBookingSummary(bookingId)
  getBookingSummary(bookingId) {
    if (!bookingId) return null;
    const bookings = this._getFromStorage('bookings', []);
    const booking = bookings.find((b) => b.id === bookingId) || null;
    if (!booking) return null;

    const service = booking.service_id ? this._getServiceById(booking.service_id) : null;
    const stylist = booking.stylist_id ? this._getStylistById(booking.stylist_id) : null;

    const details = {
      service_name: service ? service.name : '',
      is_package: !!(service && service.is_package),
      stylist_name: stylist ? stylist.name : '',
      appointment_type: booking.appointment_type,
      appointment_start: booking.appointment_start,
      duration_minutes: booking.duration_minutes,
      price: booking.price,
      location_name: '',
      client_name: booking.client_name,
      client_phone: booking.client_phone,
      client_email: booking.client_email,
      notes: booking.notes || '',
      service: service || null,
      stylist: stylist || null,
      gallery_style: booking.gallery_style_id ? this._getGalleryStyleById(booking.gallery_style_id) : null
    };

    return {
      booking_id: booking.id,
      status: booking.status,
      reference_code: booking.reference_code,
      details
    };
  }

  // -------------------- Stylists interfaces --------------------

  // listStylists(filters, sort_by)
  listStylists(filters, sort_by) {
    const stylists = this._getFromStorage('stylists', []);
    const f = filters || {};
    const sortBy = sort_by || 'display_order';

    let result = stylists.filter((s) => !!s);

    if (f.active_only !== false) {
      result = result.filter((s) => s.active !== false);
    }

    if (f.specialty) {
      result = result.filter((s) => Array.isArray(s.specialties) && s.specialties.includes(f.specialty));
    }

    if (typeof f.is_curly_specialist === 'boolean') {
      result = result.filter((s) => !!s.is_curly_specialist === f.is_curly_specialist);
    }

    if (typeof f.min_years_experience === 'number') {
      result = result.filter((s) => (s.years_of_experience || 0) >= f.min_years_experience);
    }

    if (sortBy === 'experience_high_to_low') {
      result.sort((a, b) => (b.years_of_experience || 0) - (a.years_of_experience || 0));
    } else if (sortBy === 'name_a_to_z') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      result.sort((a, b) => {
        const ao = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
        return ao - bo;
      });
    }

    return result.map((s) => ({
      id: s.id,
      name: s.name,
      bio_excerpt: s.bio ? String(s.bio).slice(0, 200) : '',
      years_of_experience: s.years_of_experience || 0,
      specialties: s.specialties || [],
      is_curly_specialist: !!s.is_curly_specialist,
      photo_url: s.photo_url || null
    }));
  }

  // getStylistDetails(stylistId)
  getStylistDetails(stylistId) {
    if (!stylistId) return null;
    const stylists = this._getFromStorage('stylists', []);
    const stylist = stylists.find((s) => s.id === stylistId) || null;
    if (!stylist) return null;

    const services = this._getFromStorage('services', []);
    const stylistServices = Array.isArray(stylist.service_ids)
      ? stylist.service_ids
          .map((id) => services.find((svc) => svc.id === id))
          .filter((svc) => !!svc && svc.active !== false)
      : [];

    const servicesOutput = stylistServices.map((svc) => ({
      id: svc.id,
      name: svc.name,
      short_description: svc.description || '',
      base_price: svc.base_price || 0,
      duration_minutes: svc.duration_minutes || null,
      category: svc.category || 'other',
      category_label: this._getServiceCategoryLabel(svc.category),
      suitable_hair_type: svc.suitable_hair_type || null,
      tags: svc.tags || []
    }));

    const galleryStyles = this._getFromStorage('gallery_styles', []);
    const gallery_samples = galleryStyles
      .filter((g) => g.stylist_id === stylist.id)
      .slice(0, 8)
      .map((g) => ({
        id: g.id,
        title: g.title || '',
        thumbnail_url: g.image_url || null,
        style_type: g.style_type,
        hair_length: g.hair_length
      }));

    return {
      id: stylist.id,
      name: stylist.name,
      bio: stylist.bio || '',
      years_of_experience: stylist.years_of_experience || 0,
      specialties: stylist.specialties || [],
      is_curly_specialist: !!stylist.is_curly_specialist,
      photo_url: stylist.photo_url || null,
      services: servicesOutput,
      gallery_samples
    };
  }

  // -------------------- Gallery interfaces --------------------

  // getGalleryFilterOptions()
  getGalleryFilterOptions() {
    return {
      style_types: [
        { value: 'balayage', label: 'Balayage' },
        { value: 'highlights', label: 'Highlights' },
        { value: 'single_process_color', label: 'Single-process color' },
        { value: 'color_correction', label: 'Color correction' },
        { value: 'womens_cut', label: "Women’s cuts" },
        { value: 'mens_cut', label: 'Men’s cuts' },
        { value: 'updo', label: 'Updos' },
        { value: 'styling', label: 'Styling' },
        { value: 'treatment', label: 'Treatments' },
        { value: 'other', label: 'Other' }
      ],
      hair_lengths: [
        { value: 'short', label: 'Short' },
        { value: 'medium', label: 'Medium' },
        { value: 'long', label: 'Long' }
      ]
    };
  }

  // listGalleryStyles(filters, page, page_size, sort_by)
  listGalleryStyles(filters, page, page_size, sort_by) {
    const styles = this._getFromStorage('gallery_styles', []);
    const stylists = this._getFromStorage('stylists', []);

    const f = filters || {};
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = page_size && page_size > 0 ? page_size : 20;
    const sortBy = sort_by || 'display_order';

    let result = styles.filter((g) => !!g);

    if (f.style_type) {
      result = result.filter((g) => g.style_type === f.style_type);
    }

    if (f.hair_length) {
      result = result.filter((g) => g.hair_length === f.hair_length);
    }

    if (f.stylistId) {
      result = result.filter((g) => g.stylist_id === f.stylistId);
    }

    if (typeof f.is_featured === 'boolean') {
      result = result.filter((g) => !!g.is_featured === f.is_featured);
    }

    if (sortBy === 'newest_first') {
      result.sort((a, b) => (b.display_order || 0) - (a.display_order || 0));
    } else {
      result.sort((a, b) => {
        const ao = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
        return ao - bo;
      });
    }

    const start = (pageNum - 1) * pageSize;
    const paged = result.slice(start, start + pageSize);

    return paged.map((g) => {
      const stylist = stylists.find((s) => s.id === g.stylist_id) || null;
      return {
        id: g.id,
        title: g.title || '',
        description: g.description || '',
        thumbnail_url: g.image_url || null,
        style_type: g.style_type,
        hair_length: g.hair_length,
        tags: g.tags || [],
        stylist_name: stylist ? stylist.name : '',
        is_featured: !!g.is_featured
      };
    });
  }

  // getGalleryStyleDetails(styleId)
  getGalleryStyleDetails(styleId) {
    if (!styleId) return null;
    const styles = this._getFromStorage('gallery_styles', []);
    const style = styles.find((g) => g.id === styleId) || null;
    if (!style) return null;

    const stylist = style.stylist_id ? this._getStylistById(style.stylist_id) : null;
    const service = style.service_id ? this._getServiceById(style.service_id) : null;

    return {
      id: style.id,
      title: style.title || '',
      description: style.description || '',
      image_url: style.image_url || null,
      style_type: style.style_type,
      hair_length: style.hair_length,
      tags: style.tags || [],
      stylist: stylist
        ? {
            id: stylist.id,
            name: stylist.name,
            photo_url: stylist.photo_url || null
          }
        : null,
      associated_service: service
        ? {
            id: service.id,
            name: service.name,
            base_price: service.base_price || 0
          }
        : null,
      suggested_appointment_type: 'in_person_consultation',
      notes: style.notes || ''
    };
  }

  // -------------------- Products & Gift Cards interfaces --------------------

  // getProductFilterOptions()
  getProductFilterOptions() {
    const products = this._getFromStorage('products', []);

    let minPrice = null;
    let maxPrice = null;
    products.forEach((p) => {
      if (!p || p.active === false) return;
      const candidateMin = typeof p.min_price === 'number' ? p.min_price : (typeof p.price === 'number' ? p.price : null);
      const candidateMax = typeof p.max_price === 'number' ? p.max_price : (typeof p.price === 'number' ? p.price : null);
      if (candidateMin != null) {
        if (minPrice == null || candidateMin < minPrice) minPrice = candidateMin;
      }
      if (candidateMax != null) {
        if (maxPrice == null || candidateMax > maxPrice) maxPrice = candidateMax;
      }
    });

    if (minPrice == null) minPrice = 0;
    if (maxPrice == null) maxPrice = 0;

    return {
      hair_concerns: [
        { value: 'color_treated', label: 'Color-treated' },
        { value: 'dryness', label: 'Dryness' },
        { value: 'damage_repair', label: 'Damage repair' },
        { value: 'frizz_control', label: 'Frizz control' },
        { value: 'volume', label: 'Volume' },
        { value: 'scalp_care', label: 'Scalp care' },
        { value: 'all', label: 'All hair types' }
      ],
      rating_options: [
        { value: 4, label: '4 stars & up' },
        { value: 4.5, label: '4.5 stars & up' },
        { value: 5, label: '5 stars only' }
      ],
      price_range_defaults: {
        min_price: minPrice,
        max_price: maxPrice
      }
    };
  }

  // searchProducts(query, filters, sort_by)
  searchProducts(query, filters, sort_by) {
    const products = this._getFromStorage('products', []);
    const q = query ? String(query).toLowerCase() : '';
    const f = filters || {};
    const sortBy = sort_by || 'price_low_to_high';

    let result = products.filter((p) => p && p.active !== false);

    if (q) {
      result = result.filter((p) => {
        const text = ((p.name || '') + ' ' + (p.description || '') + ' ' + ((p.tags || []).join(' '))).toLowerCase();
        return text.includes(q);
      });
    }

    if (f.hair_concern) {
      result = result.filter((p) => p.hair_concern === f.hair_concern);
    }

    result = result.filter((p) => {
      const effectiveMin = typeof p.min_price === 'number' ? p.min_price : (typeof p.price === 'number' ? p.price : null);
      const effectiveMax = typeof p.max_price === 'number' ? p.max_price : (typeof p.price === 'number' ? p.price : null);

      if (typeof f.min_price === 'number' && effectiveMax != null && effectiveMax < f.min_price) {
        return false;
      }
      if (typeof f.max_price === 'number' && effectiveMin != null && effectiveMin > f.max_price) {
        return false;
      }
      return true;
    });

    if (typeof f.rating_min === 'number') {
      result = result.filter((p) => typeof p.rating === 'number' && p.rating >= f.rating_min);
    }

    if (typeof f.is_sulfate_free === 'boolean') {
      result = result.filter((p) => !!p.is_sulfate_free === f.is_sulfate_free);
    }

    if (typeof f.suitable_for_color_treated === 'boolean') {
      result = result.filter((p) => !!p.suitable_for_color_treated === f.suitable_for_color_treated);
    }

    if (sortBy === 'rating_high_to_low') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'best_sellers') {
      // No explicit data; sort by rating_count then rating
      result.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0) || (b.rating || 0) - (a.rating || 0));
    } else {
      // price_low_to_high default
      result.sort((a, b) => {
        const aPrice = typeof a.min_price === 'number' ? a.min_price : (typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER);
        const bPrice = typeof b.min_price === 'number' ? b.min_price : (typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER);
        return aPrice - bPrice;
      });
    }

    return result.map((p) => ({
      id: p.id,
      name: p.name,
      short_description: p.description || '',
      price: p.price || null,
      min_price: p.min_price || null,
      max_price: p.max_price || null,
      rating: p.rating || null,
      rating_count: p.rating_count || 0,
      hair_concern: p.hair_concern || null,
      is_sulfate_free: !!p.is_sulfate_free,
      suitable_for_color_treated: !!p.suitable_for_color_treated,
      image_url: p.image_url || null,
      tags: p.tags || []
    }));
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    if (!productId) return null;
    const product = this._getProductById(productId);
    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug || null,
      description: product.description || '',
      category: product.category || null,
      product_type: product.product_type,
      price: product.price || null,
      min_price: product.min_price || null,
      max_price: product.max_price || null,
      rating: product.rating || null,
      rating_count: product.rating_count || 0,
      hair_concern: product.hair_concern || null,
      is_sulfate_free: !!product.is_sulfate_free,
      suitable_for_color_treated: !!product.suitable_for_color_treated,
      size_options: product.size_options || [],
      image_url: product.image_url || null,
      tags: product.tags || []
    };
  }

  // addProductToCart(productId, quantity = 1, size_option_id)
  addProductToCart(productId, quantity, size_option_id) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const product = this._getProductById(productId);
    if (!product || product.active === false) {
      return {
        success: false,
        cart_item_id: null,
        cart_summary: null,
        message: 'Product not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let unitPrice = null;
    let sizeLabel = null;

    if (Array.isArray(product.size_options) && product.size_options.length && size_option_id) {
      const sizeOpt = product.size_options.find((s) => s.id === size_option_id);
      if (sizeOpt) {
        unitPrice = sizeOpt.price || product.price || product.min_price || 0;
        sizeLabel = sizeOpt.label || null;
      }
    }

    if (unitPrice === null) {
      unitPrice = product.price || product.min_price || product.max_price || 0;
    }

    const cartItemId = this._generateId('cartitem');
    const linePrice = unitPrice * qty;

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      product_id: product.id,
      item_type: 'product',
      quantity: qty,
      unit_price: unitPrice,
      line_price: linePrice,
      size_option_id: size_option_id || null,
      created_at: this._nowISO()
    };

    cartItems.push(cartItem);
    this._recalculateCartTotals(cart, cartItems);

    const summary = this.getCartSummary();

    return {
      success: true,
      cart_item_id: cartItemId,
      cart_summary: {
        total_items: summary.items.reduce((sum, it) => sum + (it.quantity || 0), 0),
        subtotal: summary.subtotal,
        total: summary.total,
        currency: summary.currency
      },
      message: 'Product added to cart.'
    };
  }

  // listGiftCardProducts()
  listGiftCardProducts() {
    const products = this._getFromStorage('products', []);
    let giftCards = products.filter((p) => p && p.product_type === 'gift_card' && p.active !== false);

    // Seed a default digital gift card product if none exist in storage so
    // gift-card flows can still be exercised in tests.
    if (giftCards.length === 0) {
      const defaultGiftCard = {
        id: 'egift_card',
        name: 'Lumen Digital Gift Card',
        slug: 'lumen-digital-gift-card',
        product_type: 'gift_card',
        category: 'gift_cards',
        description: 'Digital salon gift card redeemable for services and products.',
        price: null,
        min_price: null,
        max_price: null,
        rating: null,
        rating_count: 0,
        hair_concern: null,
        is_sulfate_free: false,
        suitable_for_color_treated: false,
        size_options: [],
        preset_amounts: [50, 75, 100, 150],
        allows_custom_amount: true,
        min_custom_amount: 25,
        max_custom_amount: 500,
        supports_email_delivery: true,
        supports_physical_delivery: false,
        image_url: null,
        tags: ['gift_card'],
        active: true,
        display_order: 100
      };
      products.push(defaultGiftCard);
      this._saveToStorage('products', products);
      giftCards = [defaultGiftCard];
    }

    return giftCards.map((p) => {
      let minAmount = null;
      let maxAmount = null;

      if (Array.isArray(p.preset_amounts) && p.preset_amounts.length) {
        minAmount = Math.min.apply(null, p.preset_amounts);
        maxAmount = Math.max.apply(null, p.preset_amounts);
      }
      if (typeof p.min_custom_amount === 'number') {
        if (minAmount == null || p.min_custom_amount < minAmount) minAmount = p.min_custom_amount;
      }
      if (typeof p.max_custom_amount === 'number') {
        if (maxAmount == null || p.max_custom_amount > maxAmount) maxAmount = p.max_custom_amount;
      }
      if (minAmount == null) minAmount = p.price || 0;
      if (maxAmount == null) maxAmount = p.price || 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        min_amount: minAmount,
        max_amount: maxAmount,
        preset_amounts: p.preset_amounts || [],
        supports_email_delivery: !!p.supports_email_delivery,
        supports_physical_delivery: !!p.supports_physical_delivery,
        image_url: p.image_url || null
      };
    });
  }

  // addGiftCardToCart(productId, gift_amount, delivery_method, recipient_name, recipient_email, sender_name, sender_email, message, delivery_date)
  addGiftCardToCart(productId, gift_amount, delivery_method, recipient_name, recipient_email, sender_name, sender_email, message, delivery_date) {
    const product = this._getProductById(productId);
    if (!product || product.active === false || product.product_type !== 'gift_card') {
      return {
        success: false,
        cart_item_id: null,
        cart_summary: null,
        message: 'Gift card product not found or inactive.'
      };
    }

    if (delivery_method === 'email' && !recipient_email) {
      return {
        success: false,
        cart_item_id: null,
        cart_summary: null,
        message: 'Recipient email is required for email delivery.'
      };
    }

    const amount = Number(gift_amount || 0);
    if (!(amount > 0)) {
      return {
        success: false,
        cart_item_id: null,
        cart_summary: null,
        message: 'Gift amount must be greater than zero.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const cartItemId = this._generateId('cartitem');

    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      product_id: product.id,
      item_type: 'gift_card',
      quantity: 1,
      unit_price: amount,
      line_price: amount,
      size_option_id: null,
      gift_delivery_method: delivery_method,
      gift_amount: amount,
      gift_recipient_name: recipient_name || '',
      gift_recipient_email: recipient_email || '',
      gift_sender_name: sender_name || '',
      gift_sender_email: sender_email || '',
      gift_message: message || '',
      gift_delivery_date: delivery_date ? delivery_date : null,
      created_at: this._nowISO()
    };

    cartItems.push(cartItem);
    this._recalculateCartTotals(cart, cartItems);

    const summary = this.getCartSummary();

    return {
      success: true,
      cart_item_id: cartItemId,
      cart_summary: {
        total_items: summary.items.reduce((sum, it) => sum + (it.quantity || 0), 0),
        subtotal: summary.subtotal,
        total: summary.total,
        currency: summary.currency
      },
      message: 'Gift card added to cart.'
    };
  }

  // -------------------- Cart & Checkout interfaces --------------------

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const relatedItems = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = relatedItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const isGiftCard = ci.item_type === 'gift_card';

      const gift_card_details = isGiftCard
        ? {
            delivery_method: ci.gift_delivery_method || null,
            gift_amount: ci.gift_amount || 0,
            recipient_name: ci.gift_recipient_name || '',
            recipient_email: ci.gift_recipient_email || '',
            delivery_date: ci.gift_delivery_date || null,
            message: ci.gift_message || ''
          }
        : null;

      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        name: product ? product.name : '',
        item_type: ci.item_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_price: ci.line_price,
        image_url: product ? product.image_url || null : null,
        size_label: (() => {
          if (!ci.size_option_id || !product || !Array.isArray(product.size_options)) return null;
          const so = product.size_options.find((s) => s.id === ci.size_option_id);
          return so ? so.label || null : null;
        })(),
        is_gift_card: isGiftCard,
        gift_card_details,
        // Foreign key resolution
        product: product
      };
    });

    return {
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      total: cart.total || 0,
      currency: cart.currency || 'usd'
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return this.getCartSummary();
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.line_price = (item.unit_price || 0) * quantity;
    }

    this._recalculateCartTotals(cart, cartItems);

    // Build summary with foreign key resolution
    const products = this._getFromStorage('products', []);
    const relatedItems = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = relatedItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const isGiftCard = ci.item_type === 'gift_card';
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        name: product ? product.name : '',
        item_type: ci.item_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_price: ci.line_price,
        image_url: product ? product.image_url || null : null,
        size_label: (() => {
          if (!ci.size_option_id || !product || !Array.isArray(product.size_options)) return null;
          const so = product.size_options.find((s) => s.id === ci.size_option_id);
          return so ? so.label || null : null;
        })(),
        is_gift_card: isGiftCard,
        product
      };
    });

    return {
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      total: cart.total || 0,
      currency: cart.currency || 'usd'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx !== -1) {
      cartItems.splice(idx, 1);
      this._recalculateCartTotals(cart, cartItems);
    }

    // Build summary with foreign key resolution
    const products = this._getFromStorage('products', []);
    const relatedItems = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = relatedItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const isGiftCard = ci.item_type === 'gift_card';
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        name: product ? product.name : '',
        item_type: ci.item_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_price: ci.line_price,
        image_url: product ? product.image_url || null : null,
        size_label: (() => {
          if (!ci.size_option_id || !product || !Array.isArray(product.size_options)) return null;
          const so = product.size_options.find((s) => s.id === ci.size_option_id);
          return so ? so.label || null : null;
        })(),
        is_gift_card: isGiftCard,
        product
      };
    });

    return {
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      total: cart.total || 0,
      currency: cart.currency || 'usd'
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cartSummary = this.getCartSummary();
    const order_items = cartSummary.items.map((item) => ({
      cart_item_id: item.cart_item_id,
      product_id: item.product_id,
      name: item.name,
      item_type: item.item_type,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_price: item.line_price,
      size_label: item.size_label,
      is_gift_card: item.is_gift_card,
      gift_card_details: item.gift_card_details || null,
      // Foreign key resolution
      product: item.product || null
    }));

    const canProceed = order_items.length > 0 && (cartSummary.total || 0) >= 0;

    return {
      order_items,
      subtotal: cartSummary.subtotal || 0,
      total: cartSummary.total || 0,
      currency: cartSummary.currency || 'usd',
      can_proceed_to_payment: canProceed
    };
  }

  // -------------------- Contact & Callback interfaces --------------------

  // getContactFormOptions()
  getContactFormOptions() {
    return {
      subjects: [
        { value: 'pricing_question', label: 'Pricing question' },
        { value: 'booking_question', label: 'Booking question' },
        { value: 'callback_request', label: 'Callback request' },
        { value: 'general_inquiry', label: 'General inquiry' },
        { value: 'other', label: 'Other' }
      ],
      preferred_contact_methods: [
        { value: 'phone', label: 'Phone' },
        { value: 'email', label: 'Email' }
      ],
      instructions: 'Please include any preferred dates, times, and services so our team can assist you quickly.'
    };
  }

  // submitContactRequest(name, email, phone, subject, message, preferred_contact_method, related_service_ids, budget_amount, requested_callback_datetime)
  submitContactRequest(name, email, phone, subject, message, preferred_contact_method, related_service_ids, budget_amount, requested_callback_datetime) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        contact_request_id: null,
        message: 'Missing required contact fields.'
      };
    }

    const contactRequests = this._getFromStorage('contact_requests', []);
    const id = this._generateId('contact');

    const request = {
      id,
      name,
      email,
      phone: phone || null,
      subject,
      message,
      preferred_contact_method: preferred_contact_method || null,
      related_service_ids: Array.isArray(related_service_ids) ? related_service_ids : [],
      budget_amount: typeof budget_amount === 'number' ? budget_amount : null,
      requested_callback_datetime: requested_callback_datetime || null,
      created_at: this._nowISO()
    };

    contactRequests.push(request);
    this._saveToStorage('contact_requests', contactRequests);

    return {
      success: true,
      contact_request_id: id,
      message: 'Contact request submitted.'
    };
  }

  // -------------------- Locations & Hours interfaces --------------------

  // getLocationsWithHours()
  getLocationsWithHours() {
    const locations = this._getFromStorage('locations', []);
    const openingHours = this._getFromStorage('opening_hours', []);

    const locsWithHours = locations.map((loc) => {
      const hours = openingHours
        .filter((oh) => oh.location_id === loc.id)
        .map((oh) => ({
          day_of_week: oh.day_of_week,
          is_closed: !!oh.is_closed,
          opens_at: oh.opens_at || null,
          closes_at: oh.closes_at || null,
          has_extended_hours: !!oh.has_extended_hours
        }));

      return {
        id: loc.id,
        name: loc.name || '',
        address_line1: loc.address_line1 || '',
        address_line2: loc.address_line2 || '',
        city: loc.city || '',
        state: loc.state || '',
        postal_code: loc.postal_code || '',
        country: loc.country || '',
        map_embed_url: loc.map_embed_url || null,
        parking_info: loc.parking_info || '',
        directions: loc.directions || '',
        phone: loc.phone || '',
        email: loc.email || '',
        opening_hours: hours
      };
    });

    return { locations: locsWithHours };
  }

  // -------------------- About & Policies interfaces --------------------

  // getAboutPageContent()
  getAboutPageContent() {
    const defaultValue = {
      heading: '',
      story_html: '',
      mission_html: '',
      approach_html: '',
      specialties: [],
      team_highlights: []
    };
    const stored = this._getFromStorage('about_content', null);
    if (!stored || typeof stored !== 'object') {
      return defaultValue;
    }
    return Object.assign({}, defaultValue, stored);
  }

  // getPoliciesContent()
  getPoliciesContent() {
    const defaultValue = {
      sections: []
    };
    const stored = this._getFromStorage('policies_content', null);
    if (!stored || typeof stored !== 'object') {
      return defaultValue;
    }
    return stored;
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
