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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const arrayKeys = [
      'packages',
      'package_booking_requests',
      'package_hold_requests',
      'package_inquiries',
      'package_builder_options',
      'custom_package_quotes',
      'ceremony_locations',
      'location_add_on_options',
      'location_requests',
      'gallery_photos',
      'favorites_collections',
      'faq_items',
      'notes_notebooks',
      'notes',
      'reviews',
      'wishlist_entries',
      'tour_requests',
      'contact_submissions',
      'policies'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // About/contact info is stored as a single object
    if (!localStorage.getItem('about_contact_info')) {
      localStorage.setItem('about_contact_info', JSON.stringify({}));
    }

    // Default notebook id helper
    if (!localStorage.getItem('defaultNotebookId')) {
      localStorage.setItem('defaultNotebookId', '');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  // ------------------------
  // Formatting helpers
  // ------------------------

  _formatPrice(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      return '';
    }
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  _formatCapacityLabel(min, max) {
    if (min != null && max != null) {
      if (min === max) {
        return String(min) + ' guests';
      }
      return String(min) + '–' + String(max) + ' guests';
    }
    if (max != null) {
      return 'Up to ' + String(max) + ' guests';
    }
    if (min != null) {
      return String(min) + '+ guests';
    }
    return '';
  }

  _getMonthLabel(key) {
    const map = {
      january: 'January',
      february: 'February',
      march: 'March',
      april: 'April',
      may: 'May',
      june: 'June',
      july: 'July',
      august: 'August',
      september: 'September',
      october: 'October',
      november: 'November',
      december: 'December'
    };
    return map[key] || key;
  }

  _getDayLabel(key) {
    const map = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    return map[key] || key;
  }

  _getTimeOfDayLabel(key) {
    const map = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night'
    };
    return map[key] || key;
  }

  _getLocationTypeLabel(value) {
    const map = {
      indoor_chapel_only: 'Indoor Chapel only',
      indoor_chapel: 'Indoor Chapel',
      outdoor_garden: 'Outdoor Garden',
      mixed: 'Indoor & Outdoor',
      other: 'Other'
    };
    return map[value] || value;
  }

  // ------------------------
  // Core private helpers from spec
  // ------------------------

  _getOrCreateWorkingFavoritesCollection() {
    const collections = this._getFromStorage('favorites_collections');
    let working = null;
    for (let i = 0; i < collections.length; i++) {
      if (!collections[i].is_saved) {
        working = collections[i];
        break;
      }
    }
    if (!working) {
      working = {
        id: this._generateId('favcol'),
        title: '',
        photo_ids: [],
        is_saved: false,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      collections.push(working);
      this._saveToStorage('favorites_collections', collections);
    }
    return working;
  }

  _getOrCreateDefaultNotesNotebook() {
    const notebooks = this._getFromStorage('notes_notebooks');
    let defaultNotebookId = localStorage.getItem('defaultNotebookId') || '';
    let notebook = null;

    if (defaultNotebookId) {
      for (let i = 0; i < notebooks.length; i++) {
        if (notebooks[i].id === defaultNotebookId) {
          notebook = notebooks[i];
          break;
        }
      }
    }

    if (!notebook) {
      if (notebooks.length > 0) {
        notebook = notebooks[0];
        defaultNotebookId = notebook.id;
        localStorage.setItem('defaultNotebookId', defaultNotebookId);
      } else {
        notebook = {
          id: this._generateId('notebook'),
          title: 'My Wedding Planning Notes',
          description: '',
          created_at: new Date().toISOString(),
          updated_at: null
        };
        notebooks.push(notebook);
        this._saveToStorage('notes_notebooks', notebooks);
        localStorage.setItem('defaultNotebookId', notebook.id);
      }
    }

    return notebook;
  }

  _getOrCreateWishlist() {
    const entries = this._getFromStorage('wishlist_entries');
    if (!Array.isArray(entries)) {
      this._saveToStorage('wishlist_entries', []);
      return [];
    }
    return entries;
  }

  _calculateCustomPackageQuoteTotal(selectedBaseOptionId, selectedOptionIds) {
    const options = this._getFromStorage('package_builder_options');
    let total = 0;
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.id === selectedBaseOptionId || selectedOptionIds.indexOf(opt.id) !== -1) {
        if (typeof opt.price === 'number') {
          total += opt.price;
        }
      }
    }
    return total;
  }

  _filterPackagesByCriteria(packages, filters, sortBy) {
    const filtered = [];
    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      let include = true;

      if (filters) {
        const minGuest = filters.minGuestCount;
        const maxGuest = filters.maxGuestCount;
        if (minGuest != null || maxGuest != null) {
          const capMin = p.capacity_min;
          const capMax = p.capacity_max;
          if (minGuest != null && (capMax == null || capMax < minGuest)) {
            include = false;
          }
          if (include && maxGuest != null && (capMin == null || capMin > maxGuest)) {
            include = false;
          }
        }

        if (include && filters.month) {
          if (Array.isArray(p.allowed_months) && p.allowed_months.length > 0) {
            if (p.allowed_months.indexOf(filters.month) === -1) {
              include = false;
            }
          }
        }

        if (include && filters.dayOfWeek) {
          if (Array.isArray(p.allowed_days_of_week) && p.allowed_days_of_week.length > 0) {
            if (p.allowed_days_of_week.indexOf(filters.dayOfWeek) === -1) {
              include = false;
            }
          }
        }

        if (include && filters.timeOfDay) {
          if (Array.isArray(p.allowed_times_of_day) && p.allowed_times_of_day.length > 0) {
            if (p.allowed_times_of_day.indexOf(filters.timeOfDay) === -1) {
              include = false;
            }
          }
        }

        if (include && filters.minPrice != null) {
          if (typeof p.base_price === 'number' && p.base_price < filters.minPrice) {
            include = false;
          }
        }

        if (include && filters.maxPrice != null) {
          if (typeof p.base_price === 'number' && p.base_price > filters.maxPrice) {
            include = false;
          }
        }

        if (include && filters.locationType) {
          if (Array.isArray(p.location_types) && p.location_types.length > 0) {
            if (p.location_types.indexOf(filters.locationType) === -1) {
              include = false;
            }
          }
        }
      }

      if (include) {
        filtered.push(p);
      }
    }

    const sortKey = sortBy || 'recommended';

    filtered.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        const ap = typeof a.base_price === 'number' ? a.base_price : 0;
        const bp = typeof b.base_price === 'number' ? b.base_price : 0;
        if (ap !== bp) return ap - bp;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortKey === 'price_high_to_low') {
        const ap = typeof a.base_price === 'number' ? a.base_price : 0;
        const bp = typeof b.base_price === 'number' ? b.base_price : 0;
        if (ap !== bp) return bp - ap;
        return (a.name || '').localeCompare(b.name || '');
      }
      // recommended: smaller recommended_rank first, then price
      const ar = typeof a.recommended_rank === 'number' ? a.recommended_rank : Number.MAX_SAFE_INTEGER;
      const br = typeof b.recommended_rank === 'number' ? b.recommended_rank : Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      const ap = typeof a.base_price === 'number' ? a.base_price : 0;
      const bp = typeof b.base_price === 'number' ? b.base_price : 0;
      if (ap !== bp) return ap - bp;
      return (a.name || '').localeCompare(b.name || '');
    });

    return filtered;
  }

  _filterLocationsByCriteria(locations, filters, sortBy) {
    const filtered = [];
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      let include = true;

      if (filters) {
        if (filters.locationType && loc.location_type !== filters.locationType) {
          include = false;
        }
        const minGuest = filters.minGuestCount;
        const maxGuest = filters.maxGuestCount;
        if (include && (minGuest != null || maxGuest != null)) {
          const capMin = loc.capacity_min;
          const capMax = loc.capacity_max;
          if (minGuest != null && (capMax == null || capMax < minGuest)) {
            include = false;
          }
          if (include && maxGuest != null && (capMin == null || capMin > maxGuest)) {
            include = false;
          }
        }
      }

      if (include) {
        filtered.push(loc);
      }
    }

    const sortKey = sortBy || 'recommended';
    filtered.sort((a, b) => {
      if (sortKey === 'capacity_desc') {
        const ac = typeof a.capacity_max === 'number' ? a.capacity_max : 0;
        const bc = typeof b.capacity_max === 'number' ? b.capacity_max : 0;
        if (ac !== bc) return bc - ac;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortKey === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // recommended fallback: by name
      return (a.name || '').localeCompare(b.name || '');
    });

    return filtered;
  }

  _filterAvailableDatesByMonthYear(availableDates, month, year) {
    const days = [];
    if (!Array.isArray(availableDates)) {
      return days;
    }
    for (let i = 0; i < availableDates.length; i++) {
      const iso = availableDates[i];
      if (!iso) continue;
      const d = new Date(iso);
      if (isNaN(d.getTime())) continue;
      const m = d.getUTCMonth() + 1;
      const y = d.getUTCFullYear();
      if (m === month && y === year) {
        const dateStr = iso.length >= 10 ? iso.slice(0, 10) : iso;
        days.push({ date: dateStr, isAvailable: true });
      }
    }
    return days;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomePageContent
  getHomePageContent() {
    const heroTitle = 'Celebrate Your Day at Our Chapel';
    const heroSubtitle = 'Intimate elopements, classic chapel ceremonies, and custom wedding experiences.';

    const featuredSections = [
      {
        id: 'wedding_packages',
        title: 'Wedding Packages',
        description: 'Browse our curated wedding ceremony packages for every size and budget.',
        ctaLabel: 'View Wedding Packages',
        targetPageKey: 'wedding_packages'
      },
      {
        id: 'elopement_packages',
        title: 'Elopement Packages',
        description: 'Simple, stress-free elopements for just the two of you or a small group.',
        ctaLabel: 'Explore Elopements',
        targetPageKey: 'elopement_packages'
      },
      {
        id: 'custom_builder',
        title: 'Build Your Own',
        description: 'Customize a ceremony with decor, music, and photography options.',
        ctaLabel: 'Customize a Package',
        targetPageKey: 'custom_builder'
      },
      {
        id: 'ceremony_locations',
        title: 'Ceremony Locations',
        description: 'Discover our indoor chapel and outdoor garden ceremony spaces.',
        ctaLabel: 'View Locations',
        targetPageKey: 'ceremony_locations'
      },
      {
        id: 'gallery',
        title: 'Photo Gallery',
        description: 'See real ceremonies and decor ideas from recent weddings.',
        ctaLabel: 'View Gallery',
        targetPageKey: 'gallery'
      },
      {
        id: 'reviews',
        title: 'Reviews',
        description: 'Read stories from couples who celebrated here.',
        ctaLabel: 'Read Reviews',
        targetPageKey: 'reviews'
      },
      {
        id: 'book_tour',
        title: 'Book a Tour',
        description: 'Schedule an in-person or virtual visit to see the venue.',
        ctaLabel: 'Schedule a Visit',
        targetPageKey: 'book_tour'
      }
    ];

    const allPackages = this._getFromStorage('packages');
    const activeWeddingPackages = [];
    for (let i = 0; i < allPackages.length; i++) {
      const p = allPackages[i];
      if (p.is_active && p.package_type === 'wedding') {
        activeWeddingPackages.push(p);
      }
    }
    activeWeddingPackages.sort((a, b) => {
      const ar = typeof a.recommended_rank === 'number' ? a.recommended_rank : Number.MAX_SAFE_INTEGER;
      const br = typeof b.recommended_rank === 'number' ? b.recommended_rank : Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      const ap = typeof a.base_price === 'number' ? a.base_price : 0;
      const bp = typeof b.base_price === 'number' ? b.base_price : 0;
      if (ap !== bp) return ap - bp;
      return (a.name || '').localeCompare(b.name || '');
    });
    const featuredPackages = activeWeddingPackages.slice(0, 3);

    const allLocations = this._getFromStorage('ceremony_locations');
    const activeLocations = [];
    for (let i = 0; i < allLocations.length; i++) {
      const loc = allLocations[i];
      if (loc.is_active) {
        activeLocations.push(loc);
      }
    }
    activeLocations.sort((a, b) => {
      const ac = typeof a.capacity_max === 'number' ? a.capacity_max : 0;
      const bc = typeof b.capacity_max === 'number' ? b.capacity_max : 0;
      if (ac !== bc) return bc - ac;
      return (a.name || '').localeCompare(b.name || '');
    });
    const featuredLocations = activeLocations.slice(0, 3);

    const about = this._getObjectFromStorage('about_contact_info', {}) || {};
    const contactSnippet = {
      phone: about.phone || '',
      email: about.email || '',
      addressSummary: about.addressSummary || about.address || ''
    };

    return {
      heroTitle: heroTitle,
      heroSubtitle: heroSubtitle,
      featuredSections: featuredSections,
      featuredPackages: featuredPackages,
      featuredLocations: featuredLocations,
      contactSnippet: contactSnippet
    };
  }

  // getPackageFilterOptions
  getPackageFilterOptions() {
    const packages = this._getFromStorage('packages');
    let minGuest = null;
    let maxGuest = null;
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (typeof p.capacity_min === 'number') {
        if (minGuest == null || p.capacity_min < minGuest) minGuest = p.capacity_min;
      }
      if (typeof p.capacity_max === 'number') {
        if (maxGuest == null || p.capacity_max > maxGuest) maxGuest = p.capacity_max;
      }
      if (typeof p.base_price === 'number') {
        if (minPrice == null || p.base_price < minPrice) minPrice = p.base_price;
        if (maxPrice == null || p.base_price > maxPrice) maxPrice = p.base_price;
      }
    }

    const guestCount = {
      min: minGuest != null ? minGuest : 0,
      max: maxGuest != null ? maxGuest : 0,
      step: 5
    };

    const price = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      step: 50
    };

    const months = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ].map((m) => ({ value: m, label: this._getMonthLabel(m) }));

    const daysOfWeek = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ].map((d) => ({ value: d, label: this._getDayLabel(d) }));

    const timesOfDay = [
      'morning',
      'afternoon',
      'evening',
      'night'
    ].map((t) => ({ value: t, label: this._getTimeOfDayLabel(t) }));

    const locationTypes = [
      { value: 'indoor_chapel_only', label: 'Indoor Chapel only' },
      { value: 'indoor_chapel', label: 'Indoor Chapel' },
      { value: 'outdoor_garden', label: 'Outdoor Garden' },
      { value: 'mixed', label: 'Indoor & Outdoor' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'recommended', label: 'Recommended' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      guestCount: guestCount,
      price: price,
      months: months,
      daysOfWeek: daysOfWeek,
      timesOfDay: timesOfDay,
      locationTypes: locationTypes,
      sortOptions: sortOptions
    };
  }

  // searchPackages(packageType, filters, sortBy)
  searchPackages(packageType, filters, sortBy) {
    const all = this._getFromStorage('packages');
    const active = [];
    for (let i = 0; i < all.length; i++) {
      const p = all[i];
      if (!p.is_active) continue;
      if (p.package_type !== packageType) continue;
      active.push(p);
    }

    const filtered = this._filterPackagesByCriteria(active, filters || {}, sortBy || 'recommended');

    const results = filtered.map((p) => {
      const priceDisplay = this._formatPrice(p.base_price);
      const capacityLabel = this._formatCapacityLabel(p.capacity_min, p.capacity_max);
      const locationTypeLabels = Array.isArray(p.location_types)
        ? p.location_types.map((lt) => this._getLocationTypeLabel(lt))
        : [];
      return {
        id: p.id,
        name: p.name,
        package_type: p.package_type,
        short_description: p.short_description,
        base_price: p.base_price,
        price_display: priceDisplay,
        capacity_min: p.capacity_min,
        capacity_max: p.capacity_max,
        capacity_label: capacityLabel,
        hero_image_url: p.hero_image_url,
        recommended_rank: p.recommended_rank,
        location_type_labels: locationTypeLabels,
        allowed_months: Array.isArray(p.allowed_months) ? p.allowed_months.slice() : [],
        allowed_days_of_week: Array.isArray(p.allowed_days_of_week) ? p.allowed_days_of_week.slice() : [],
        allowed_times_of_day: Array.isArray(p.allowed_times_of_day) ? p.allowed_times_of_day.slice() : [],
        included_photography_hours: p.included_photography_hours
      };
    });

    return {
      packages: results,
      totalCount: results.length
    };
  }

  // getPackageDetails(packageId)
  getPackageDetails(packageId) {
    const packages = this._getFromStorage('packages');
    let pkg = null;
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === packageId) {
        pkg = packages[i];
        break;
      }
    }

    if (!pkg) {
      return {
        package: null,
        display: {
          price_display: '',
          capacity_label: '',
          location_type_labels: [],
          allowed_month_labels: [],
          allowed_day_labels: [],
          allowed_time_of_day_labels: []
        },
        relatedReviews: [],
        can_request_booking: false,
        can_hold: false,
        can_send_inquiry: false,
        is_in_wishlist: false
      };
    }

    const priceDisplay = this._formatPrice(pkg.base_price);
    const capacityLabel = this._formatCapacityLabel(pkg.capacity_min, pkg.capacity_max);

    const locationTypeLabels = Array.isArray(pkg.location_types)
      ? pkg.location_types.map((lt) => this._getLocationTypeLabel(lt))
      : [];

    const allowedMonthLabels = Array.isArray(pkg.allowed_months)
      ? pkg.allowed_months.map((m) => this._getMonthLabel(m))
      : [];

    const allowedDayLabels = Array.isArray(pkg.allowed_days_of_week)
      ? pkg.allowed_days_of_week.map((d) => this._getDayLabel(d))
      : [];

    const allowedTimeLabels = Array.isArray(pkg.allowed_times_of_day)
      ? pkg.allowed_times_of_day.map((t) => this._getTimeOfDayLabel(t))
      : [];

    const allReviews = this._getFromStorage('reviews');
    const relatedReviews = [];
    for (let i = 0; i < allReviews.length; i++) {
      const r = allReviews[i];
      if (r.package_id === pkg.id) {
        relatedReviews.push({
          id: r.id,
          reviewer_name: r.reviewer_name,
          title: r.title,
          content: r.content,
          event_date: r.event_date,
          guest_count: r.guest_count,
          star_rating: r.star_rating,
          package_id: r.package_id,
          created_at: r.created_at,
          is_featured: r.is_featured,
          // foreign key resolution
          package: pkg
        });
      }
    }

    const wishlistEntries = this._getFromStorage('wishlist_entries');
    let isInWishlist = false;
    for (let i = 0; i < wishlistEntries.length; i++) {
      const w = wishlistEntries[i];
      if (w.package_id === pkg.id && w.status === 'active') {
        isInWishlist = true;
        break;
      }
    }

    return {
      package: pkg,
      display: {
        price_display: priceDisplay,
        capacity_label: capacityLabel,
        location_type_labels: locationTypeLabels,
        allowed_month_labels: allowedMonthLabels,
        allowed_day_labels: allowedDayLabels,
        allowed_time_of_day_labels: allowedTimeLabels
      },
      relatedReviews: relatedReviews,
      can_request_booking: !!pkg.is_active,
      can_hold: !!pkg.is_active,
      can_send_inquiry: true,
      is_in_wishlist: isInWishlist
    };
  }

  // createPackageBookingRequest(packageId, ceremonyDate, guestCount, email, fullName, phoneNumber, status)
  createPackageBookingRequest(packageId, ceremonyDate, guestCount, email, fullName, phoneNumber, status) {
    const bookingRequests = this._getFromStorage('package_booking_requests');
    const request = {
      id: this._generateId('pkg_booking_req'),
      package_id: packageId,
      ceremony_date: ceremonyDate,
      guest_count: guestCount,
      email: email,
      full_name: fullName || null,
      phone_number: phoneNumber || null,
      status: status || 'draft',
      created_at: new Date().toISOString()
    };
    bookingRequests.push(request);
    this._saveToStorage('package_booking_requests', bookingRequests);

    return {
      bookingRequest: request,
      success: true,
      message: 'Booking request created.'
    };
  }

  // createPackageHoldRequest(packageId, preferredDate, fullName, email, phoneNumber, status)
  createPackageHoldRequest(packageId, preferredDate, fullName, email, phoneNumber, status) {
    const holdRequests = this._getFromStorage('package_hold_requests');
    const hold = {
      id: this._generateId('pkg_hold_req'),
      package_id: packageId,
      preferred_date: preferredDate || null,
      full_name: fullName || null,
      email: email || null,
      phone_number: phoneNumber || null,
      status: status || 'draft',
      created_at: new Date().toISOString()
    };
    holdRequests.push(hold);
    this._saveToStorage('package_hold_requests', holdRequests);

    return {
      holdRequest: hold,
      success: true,
      message: 'Hold request created.'
    };
  }

  // createPackageInquiry(packageId, preferredDate, guestCount, phoneNumber, email, message, status)
  createPackageInquiry(packageId, preferredDate, guestCount, phoneNumber, email, message, status) {
    const inquiries = this._getFromStorage('package_inquiries');
    const inquiry = {
      id: this._generateId('pkg_inquiry'),
      package_id: packageId,
      preferred_date: preferredDate || null,
      guest_count: guestCount != null ? guestCount : null,
      phone_number: phoneNumber || null,
      email: email || null,
      message: message || null,
      status: status || 'draft',
      created_at: new Date().toISOString()
    };
    inquiries.push(inquiry);
    this._saveToStorage('package_inquiries', inquiries);

    return {
      inquiry: inquiry,
      success: true,
      message: 'Inquiry created.'
    };
  }

  // getPackageBuilderOptions
  getPackageBuilderOptions() {
    const options = this._getFromStorage('package_builder_options');
    const baseOptions = [];
    const decorOptions = [];
    const musicOptions = [];
    const photographyOptions = [];

    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (!o.is_active) continue;
      if (o.category === 'base') baseOptions.push(o);
      else if (o.category === 'decor') decorOptions.push(o);
      else if (o.category === 'music') musicOptions.push(o);
      else if (o.category === 'photography') photographyOptions.push(o);
    }

    const sortByDisplay = function (a, b) {
      const ao = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
      const bo = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return (a.name || '').localeCompare(b.name || '');
    };

    baseOptions.sort(sortByDisplay);
    decorOptions.sort(sortByDisplay);
    musicOptions.sort(sortByDisplay);
    photographyOptions.sort(sortByDisplay);

    return {
      baseOptions: baseOptions,
      decorOptions: decorOptions,
      musicOptions: musicOptions,
      photographyOptions: photographyOptions
    };
  }

  // createCustomPackageQuote(selectedBaseOptionId, selectedOptionIds, title, notes)
  createCustomPackageQuote(selectedBaseOptionId, selectedOptionIds, title, notes) {
    const options = this._getFromStorage('package_builder_options');
    let baseOption = null;
    const selectedIds = Array.isArray(selectedOptionIds) ? selectedOptionIds : [];
    const nonBaseOptions = [];

    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (o.id === selectedBaseOptionId) {
        baseOption = o;
      }
    }

    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      if (selectedIds.indexOf(o.id) !== -1) {
        nonBaseOptions.push(o);
      }
    }

    const totalPrice = this._calculateCustomPackageQuoteTotal(selectedBaseOptionId, selectedIds);

    const quotes = this._getFromStorage('custom_package_quotes');
    const quote = {
      id: this._generateId('custom_quote'),
      selected_base_option_id: selectedBaseOptionId,
      selected_option_ids: selectedIds.slice(),
      total_price: totalPrice,
      title: title || null,
      notes: notes || null,
      created_at: new Date().toISOString()
    };
    quotes.push(quote);
    this._saveToStorage('custom_package_quotes', quotes);

    const selectedOptions = [];
    if (baseOption) selectedOptions.push(baseOption);
    for (let i = 0; i < nonBaseOptions.length; i++) {
      selectedOptions.push(nonBaseOptions[i]);
    }

    return {
      quote: quote,
      selectedOptions: selectedOptions,
      success: true,
      message: 'Custom package quote created.'
    };
  }

  // getCeremonyLocationFilterOptions
  getCeremonyLocationFilterOptions() {
    const locations = this._getFromStorage('ceremony_locations');
    let minCap = null;
    let maxCap = null;
    for (let i = 0; i < locations.length; i++) {
      const l = locations[i];
      if (typeof l.capacity_min === 'number') {
        if (minCap == null || l.capacity_min < minCap) minCap = l.capacity_min;
      }
      if (typeof l.capacity_max === 'number') {
        if (maxCap == null || l.capacity_max > maxCap) maxCap = l.capacity_max;
      }
    }

    const locationTypes = [
      { value: 'outdoor_garden', label: 'Outdoor Garden' },
      { value: 'indoor_chapel_only', label: 'Indoor Chapel only' },
      { value: 'indoor_chapel', label: 'Indoor Chapel' },
      { value: 'mixed', label: 'Indoor & Outdoor' },
      { value: 'other', label: 'Other' }
    ];

    const capacity = {
      min: minCap != null ? minCap : 0,
      max: maxCap != null ? maxCap : 0,
      step: 10
    };

    return {
      locationTypes: locationTypes,
      capacity: capacity
    };
  }

  // searchCeremonyLocations(filters, sortBy)
  searchCeremonyLocations(filters, sortBy) {
    const all = this._getFromStorage('ceremony_locations');
    const active = [];
    for (let i = 0; i < all.length; i++) {
      const loc = all[i];
      if (loc.is_active) active.push(loc);
    }

    const filtered = this._filterLocationsByCriteria(active, filters || {}, sortBy || 'recommended');

    const locations = filtered.map((loc) => {
      return {
        id: loc.id,
        name: loc.name,
        location_type: loc.location_type,
        location_type_label: this._getLocationTypeLabel(loc.location_type),
        short_description: loc.short_description,
        capacity_min: loc.capacity_min,
        capacity_max: loc.capacity_max,
        capacity_label: this._formatCapacityLabel(loc.capacity_min, loc.capacity_max),
        teaser_photo_url: loc.teaser_photo_url
      };
    });

    return {
      locations: locations,
      totalCount: locations.length
    };
  }

  // getCeremonyLocationDetails(locationId)
  getCeremonyLocationDetails(locationId) {
    const locations = this._getFromStorage('ceremony_locations');
    let loc = null;
    for (let i = 0; i < locations.length; i++) {
      if (locations[i].id === locationId) {
        loc = locations[i];
        break;
      }
    }
    return { location: loc };
  }

  // getLocationAvailability(locationId, month, year)
  getLocationAvailability(locationId, month, year) {
    const locations = this._getFromStorage('ceremony_locations');
    let loc = null;
    for (let i = 0; i < locations.length; i++) {
      if (locations[i].id === locationId) {
        loc = locations[i];
        break;
      }
    }
    const availableDates = loc && Array.isArray(loc.available_dates) ? loc.available_dates : [];
    const days = this._filterAvailableDatesByMonthYear(availableDates, month, year);
    return {
      locationId: locationId,
      month: month,
      year: year,
      days: days
    };
  }

  // getLocationAddOnOptions(locationId)
  getLocationAddOnOptions(locationId) {
    const addOnsAll = this._getFromStorage('location_add_on_options');
    const locations = this._getFromStorage('ceremony_locations');
    let location = null;
    for (let i = 0; i < locations.length; i++) {
      if (locations[i].id === locationId) {
        location = locations[i];
        break;
      }
    }

    const addOns = [];
    for (let i = 0; i < addOnsAll.length; i++) {
      const a = addOnsAll[i];
      if (a.location_id === locationId && a.is_active) {
        addOns.push(Object.assign({}, a, { location: location }));
      }
    }

    return { addOns: addOns };
  }

  // createLocationRequest(locationId, selectedDate, selectedAddOnIds, fullName, email, phoneNumber, message, status)
  createLocationRequest(locationId, selectedDate, selectedAddOnIds, fullName, email, phoneNumber, message, status) {
    const requests = this._getFromStorage('location_requests');
    const ids = Array.isArray(selectedAddOnIds) ? selectedAddOnIds.slice() : [];
    const req = {
      id: this._generateId('loc_req'),
      location_id: locationId,
      selected_date: selectedDate,
      selected_add_on_ids: ids,
      full_name: fullName || null,
      email: email || null,
      phone_number: phoneNumber || null,
      message: message || null,
      status: status || 'draft',
      created_at: new Date().toISOString()
    };
    requests.push(req);
    this._saveToStorage('location_requests', requests);

    return {
      locationRequest: req,
      success: true,
      message: 'Location request created.'
    };
  }

  // getGalleryFilterOptions
  getGalleryFilterOptions() {
    const categories = [
      { value: 'ceremony', label: 'Ceremony' },
      { value: 'reception', label: 'Reception' },
      { value: 'decor', label: 'Decor' },
      { value: 'detail', label: 'Details' },
      { value: 'other', label: 'Other' }
    ];

    const timesOfDay = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'night', label: 'Night' }
    ];

    return {
      categories: categories,
      timesOfDay: timesOfDay
    };
  }

  // searchGalleryPhotos(filters, page, pageSize)
  searchGalleryPhotos(filters, page, pageSize) {
    const all = this._getFromStorage('gallery_photos');
    const f = filters || {};
    const cat = f.category;
    const time = f.timeOfDay;
    const tagsFilter = Array.isArray(f.tags) ? f.tags : null;

    const matched = [];
    for (let i = 0; i < all.length; i++) {
      const photo = all[i];
      let include = true;
      if (cat && photo.category !== cat) include = false;
      if (include && time && photo.time_of_day && photo.time_of_day !== time) include = false;
      if (include && tagsFilter && tagsFilter.length > 0) {
        const ptags = Array.isArray(photo.tags) ? photo.tags : [];
        let hasTag = false;
        for (let t = 0; t < tagsFilter.length; t++) {
          if (ptags.indexOf(tagsFilter[t]) !== -1) {
            hasTag = true;
            break;
          }
        }
        if (!hasTag) include = false;
      }
      if (include) matched.push(photo);
    }

    const pageNum = page || 1;
    const size = pageSize || 24;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = matched.slice(start, end);

    return {
      photos: paged,
      totalCount: matched.length,
      page: pageNum,
      pageSize: size
    };
  }

  // addPhotoToFavorites(photoId)
  addPhotoToFavorites(photoId) {
    const collection = this._getOrCreateWorkingFavoritesCollection();
    const collections = this._getFromStorage('favorites_collections');
    let targetIndex = -1;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collection.id) {
        targetIndex = i;
        break;
      }
    }

    const photoIds = Array.isArray(collection.photo_ids) ? collection.photo_ids : [];
    if (photoIds.indexOf(photoId) === -1) {
      photoIds.push(photoId);
      collection.photo_ids = photoIds;
      collection.updated_at = new Date().toISOString();
      if (targetIndex !== -1) {
        collections[targetIndex] = collection;
        this._saveToStorage('favorites_collections', collections);
      }
    }

    return {
      favoritesCollection: collection,
      totalPhotos: collection.photo_ids.length
    };
  }

  // removePhotoFromFavorites(photoId)
  removePhotoFromFavorites(photoId) {
    const collection = this._getOrCreateWorkingFavoritesCollection();
    const collections = this._getFromStorage('favorites_collections');
    let targetIndex = -1;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collection.id) {
        targetIndex = i;
        break;
      }
    }

    const photoIds = Array.isArray(collection.photo_ids) ? collection.photo_ids : [];
    const idx = photoIds.indexOf(photoId);
    if (idx !== -1) {
      photoIds.splice(idx, 1);
      collection.photo_ids = photoIds;
      collection.updated_at = new Date().toISOString();
      if (targetIndex !== -1) {
        collections[targetIndex] = collection;
        this._saveToStorage('favorites_collections', collections);
      }
    }

    return {
      favoritesCollection: collection,
      totalPhotos: collection.photo_ids.length
    };
  }

  // getCurrentFavoritesCollection
  getCurrentFavoritesCollection() {
    const collection = this._getOrCreateWorkingFavoritesCollection();
    const photosAll = this._getFromStorage('gallery_photos');
    const ids = Array.isArray(collection.photo_ids) ? collection.photo_ids : [];
    const photos = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      for (let j = 0; j < photosAll.length; j++) {
        if (photosAll[j].id === id) {
          photos.push(photosAll[j]);
          break;
        }
      }
    }
    return {
      collection: collection,
      photos: photos
    };
  }

  // saveCurrentFavoritesCollection(title)
  saveCurrentFavoritesCollection(title) {
    const collection = this._getOrCreateWorkingFavoritesCollection();
    const collections = this._getFromStorage('favorites_collections');
    let targetIndex = -1;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collection.id) {
        targetIndex = i;
        break;
      }
    }

    collection.title = title;
    collection.is_saved = true;
    collection.updated_at = new Date().toISOString();
    if (targetIndex !== -1) {
      collections[targetIndex] = collection;
      this._saveToStorage('favorites_collections', collections);
    }

    const photosAll = this._getFromStorage('gallery_photos');
    const ids = Array.isArray(collection.photo_ids) ? collection.photo_ids : [];
    const photos = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      for (let j = 0; j < photosAll.length; j++) {
        if (photosAll[j].id === id) {
          photos.push(photosAll[j]);
          break;
        }
      }
    }

    return {
      collection: collection,
      photos: photos,
      success: true,
      message: 'Favorites collection saved.'
    };
  }

  // searchFAQs(query, category, tags)
  searchFAQs(query, category, tags) {
    const q = (query || '').toLowerCase();
    const tagFilter = Array.isArray(tags) ? tags : null;
    const all = this._getFromStorage('faq_items');
    const results = [];

    for (let i = 0; i < all.length; i++) {
      const item = all[i];
      if (!item.is_active) continue;
      if (category && item.category !== category) continue;

      const text = (item.question || '') + ' ' + (item.answer || '');
      const lowerText = text.toLowerCase();
      let match = false;
      if (q && lowerText.indexOf(q) !== -1) {
        match = true;
      }

      if (!match && tagFilter && tagFilter.length > 0) {
        const itemTags = Array.isArray(item.tags) ? item.tags : [];
        for (let t = 0; t < tagFilter.length; t++) {
          if (itemTags.indexOf(tagFilter[t]) !== -1) {
            match = true;
            break;
          }
        }
      }

      if (!q && !tagFilter) {
        match = true;
      }

      if (match) {
        let highlightSnippet = '';
        if (q) {
          const idx = lowerText.indexOf(q);
          if (idx !== -1) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(text.length, idx + q.length + 30);
            highlightSnippet = text.substring(start, end);
          } else {
            highlightSnippet = text.substring(0, 60);
          }
        } else {
          highlightSnippet = text.substring(0, 60);
        }

        results.push({
          faqItem: item,
          highlightSnippet: highlightSnippet
        });
      }
    }

    return { results: results };
  }

  // getFAQItemDetails(faqItemId)
  getFAQItemDetails(faqItemId) {
    const all = this._getFromStorage('faq_items');
    let item = null;
    for (let i = 0; i < all.length; i++) {
      if (all[i].id === faqItemId) {
        item = all[i];
        break;
      }
    }
    return { faqItem: item };
  }

  // addFAQAnswerToNotes(faqItemId, personalNoteText)
  addFAQAnswerToNotes(faqItemId, personalNoteText) {
    const faqItems = this._getFromStorage('faq_items');
    let faq = null;
    for (let i = 0; i < faqItems.length; i++) {
      if (faqItems[i].id === faqItemId) {
        faq = faqItems[i];
        break;
      }
    }

    const notebook = this._getOrCreateDefaultNotesNotebook();
    const notes = this._getFromStorage('notes');

    const contentParts = [];
    if (personalNoteText) contentParts.push(personalNoteText);
    if (faq && faq.answer) {
      contentParts.push('FAQ: ' + faq.question + '\n' + faq.answer);
    }
    const content = contentParts.join('\n\n');

    const note = {
      id: this._generateId('note'),
      notebook_id: notebook.id,
      source_type: 'faq',
      source_id: faqItemId,
      title: faq ? faq.question : null,
      content: content,
      created_at: new Date().toISOString(),
      updated_at: null
    };

    notes.push(note);
    this._saveToStorage('notes', notes);

    return {
      note: note,
      notebook: notebook,
      success: true,
      message: 'FAQ added to notes.'
    };
  }

  // getPlanningNotesData
  getPlanningNotesData() {
    const notebooks = this._getFromStorage('notes_notebooks');
    const notes = this._getFromStorage('notes');
    const faqItems = this._getFromStorage('faq_items');

    const result = [];
    for (let i = 0; i < notebooks.length; i++) {
      const nb = notebooks[i];
      const nbNotes = [];
      for (let j = 0; j < notes.length; j++) {
        const n = notes[j];
        if (n.notebook_id === nb.id) {
          let source = null;
          if (n.source_type === 'faq' && n.source_id) {
            for (let k = 0; k < faqItems.length; k++) {
              if (faqItems[k].id === n.source_id) {
                source = faqItems[k];
                break;
              }
            }
          }
          nbNotes.push(Object.assign({}, n, {
            notebook: nb,
            source: source
          }));
        }
      }
      result.push({ notebook: nb, notes: nbNotes });
    }

    return { notebooks: result };
  }

  // createNoteInNotebook(notebookId, content, title)
  createNoteInNotebook(notebookId, content, title) {
    const notebooks = this._getFromStorage('notes_notebooks');
    let notebook = null;
    for (let i = 0; i < notebooks.length; i++) {
      if (notebooks[i].id === notebookId) {
        notebook = notebooks[i];
        break;
      }
    }

    if (!notebook) {
      return {
        note: null,
        notebook: null,
        success: false
      };
    }

    const notes = this._getFromStorage('notes');
    const note = {
      id: this._generateId('note'),
      notebook_id: notebookId,
      source_type: 'other',
      source_id: null,
      title: title || null,
      content: content,
      created_at: new Date().toISOString(),
      updated_at: null
    };
    notes.push(note);
    this._saveToStorage('notes', notes);

    return {
      note: note,
      notebook: notebook,
      success: true
    };
  }

  // updateNotesNotebookTitle(notebookId, title)
  updateNotesNotebookTitle(notebookId, title) {
    const notebooks = this._getFromStorage('notes_notebooks');
    let notebook = null;
    let found = false;
    for (let i = 0; i < notebooks.length; i++) {
      if (notebooks[i].id === notebookId) {
        notebooks[i].title = title;
        notebooks[i].updated_at = new Date().toISOString();
        notebook = notebooks[i];
        found = true;
        break;
      }
    }

    if (found) {
      this._saveToStorage('notes_notebooks', notebooks);
      return {
        notebook: notebook,
        success: true,
        message: 'Notebook title updated.'
      };
    }

    return {
      notebook: null,
      success: false,
      message: 'Notebook not found.'
    };
  }

  // updateNoteContent(noteId, content)
  updateNoteContent(noteId, content) {
    const notes = this._getFromStorage('notes');
    let note = null;
    let found = false;
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].id === noteId) {
        notes[i].content = content;
        notes[i].updated_at = new Date().toISOString();
        note = notes[i];
        found = true;
        break;
      }
    }

    if (found) {
      this._saveToStorage('notes', notes);
      return {
        note: note,
        success: true,
        message: 'Note updated.'
      };
    }

    return {
      note: null,
      success: false,
      message: 'Note not found.'
    };
  }

  // deleteNote(noteId)
  deleteNote(noteId) {
    const notes = this._getFromStorage('notes');
    const initialLength = notes.length;
    const remaining = [];
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].id !== noteId) {
        remaining.push(notes[i]);
      }
    }
    this._saveToStorage('notes', remaining);

    if (remaining.length !== initialLength) {
      return {
        success: true,
        message: 'Note deleted.'
      };
    }

    return {
      success: false,
      message: 'Note not found.'
    };
  }

  // getReviewFilterOptions
  getReviewFilterOptions() {
    const guestCountRanges = [
      { value: '0_50', min: 0, max: 50, label: 'Up to 50 guests' },
      { value: '50_100', min: 50, max: 100, label: '50–100 guests' },
      { value: '100_150', min: 100, max: 150, label: '100–150 guests' },
      { value: '150_200', min: 150, max: 200, label: '150–200 guests' }
    ];

    const starRatingThresholds = [
      { value: 3, label: '3.0 stars and up' },
      { value: 4, label: '4.0 stars and up' },
      { value: 4.5, label: '4.5 stars and up' },
      { value: 5, label: '5 stars only' }
    ];

    const sortOptions = [
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'highest_rating', label: 'Highest Rating' },
      { value: 'lowest_rating', label: 'Lowest Rating' }
    ];

    return {
      guestCountRanges: guestCountRanges,
      starRatingThresholds: starRatingThresholds,
      sortOptions: sortOptions
    };
  }

  // searchReviews(filters, sortBy)
  searchReviews(filters, sortBy) {
    const all = this._getFromStorage('reviews');
    const f = filters || {};
    const minGuest = f.minGuestCount;
    const maxGuest = f.maxGuestCount;
    const minStar = f.minStarRating;

    const matched = [];
    for (let i = 0; i < all.length; i++) {
      const r = all[i];
      let include = true;

      if (minGuest != null && (r.guest_count == null || r.guest_count < minGuest)) include = false;
      if (include && maxGuest != null && (r.guest_count == null || r.guest_count > maxGuest)) include = false;
      if (include && minStar != null && (r.star_rating == null || r.star_rating < minStar)) include = false;

      if (include) matched.push(r);
    }

    const sortKey = sortBy || 'most_recent';

    matched.sort((a, b) => {
      if (sortKey === 'highest_rating') {
        const ar = typeof a.star_rating === 'number' ? a.star_rating : 0;
        const br = typeof b.star_rating === 'number' ? b.star_rating : 0;
        if (ar !== br) return br - ar;
      } else if (sortKey === 'lowest_rating') {
        const ar = typeof a.star_rating === 'number' ? a.star_rating : 0;
        const br = typeof b.star_rating === 'number' ? b.star_rating : 0;
        if (ar !== br) return ar - br;
      } else {
        // most_recent
        const ad = a.event_date || a.created_at || '';
        const bd = b.event_date || b.created_at || '';
        if (ad !== bd) return (bd || '').localeCompare(ad || '');
      }
      return (a.title || '').localeCompare(b.title || '');
    });

    const results = matched.map((r) => {
      const content = r.content || '';
      const excerpt = content.length > 160 ? content.substring(0, 157) + '...' : content;
      return {
        id: r.id,
        title: r.title,
        star_rating: r.star_rating,
        guest_count: r.guest_count,
        event_date: r.event_date,
        excerpt: excerpt
      };
    });

    return {
      reviews: results,
      totalCount: results.length
    };
  }

  // getReviewDetails(reviewId)
  getReviewDetails(reviewId) {
    const reviews = this._getFromStorage('reviews');
    const packages = this._getFromStorage('packages');

    let review = null;
    for (let i = 0; i < reviews.length; i++) {
      if (reviews[i].id === reviewId) {
        review = reviews[i];
        break;
      }
    }

    let pkg = null;
    if (review && review.package_id) {
      for (let i = 0; i < packages.length; i++) {
        if (packages[i].id === review.package_id) {
          pkg = packages[i];
          break;
        }
      }
    }

    const packageSummary = pkg
      ? {
          id: pkg.id,
          name: pkg.name,
          package_type: pkg.package_type,
          base_price: pkg.base_price,
          price_display: this._formatPrice(pkg.base_price)
        }
      : null;

    // foreign key resolution for review
    const reviewWithPackage = review
      ? Object.assign({}, review, { package: pkg })
      : null;

    return {
      review: reviewWithPackage,
      packageSummary: packageSummary
    };
  }

  // addPackageToWishlist(packageId, note)
  addPackageToWishlist(packageId, note) {
    const wishlistEntries = this._getOrCreateWishlist();
    const packages = this._getFromStorage('packages');

    let existing = null;
    for (let i = 0; i < wishlistEntries.length; i++) {
      if (wishlistEntries[i].package_id === packageId && wishlistEntries[i].status === 'active') {
        existing = wishlistEntries[i];
        break;
      }
    }

    let entry;
    if (existing) {
      existing.note = note || existing.note || null;
      existing.updated_at = new Date().toISOString();
      entry = existing;
    } else {
      entry = {
        id: this._generateId('wishlist_entry'),
        package_id: packageId,
        note: note || null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: null
      };
      wishlistEntries.push(entry);
    }

    this._saveToStorage('wishlist_entries', wishlistEntries);

    let pkg = null;
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === packageId) {
        pkg = packages[i];
        break;
      }
    }

    return {
      wishlistEntry: entry,
      package: pkg,
      success: true,
      message: 'Package added to wishlist.'
    };
  }

  // getWishlistEntries
  getWishlistEntries() {
    const wishlistEntries = this._getFromStorage('wishlist_entries');
    const packages = this._getFromStorage('packages');

    const activeEntries = [];
    for (let i = 0; i < wishlistEntries.length; i++) {
      const e = wishlistEntries[i];
      if (e.status === 'active') {
        let pkg = null;
        for (let j = 0; j < packages.length; j++) {
          if (packages[j].id === e.package_id) {
            pkg = packages[j];
            break;
          }
        }
        activeEntries.push({
          wishlistEntry: e,
          package: pkg
        });
      }
    }

    return { entries: activeEntries };
  }

  // updateWishlistEntryNote(wishlistEntryId, note)
  updateWishlistEntryNote(wishlistEntryId, note) {
    const entries = this._getFromStorage('wishlist_entries');
    let updated = null;
    let found = false;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].id === wishlistEntryId) {
        entries[i].note = note;
        entries[i].updated_at = new Date().toISOString();
        updated = entries[i];
        found = true;
        break;
      }
    }

    if (found) {
      this._saveToStorage('wishlist_entries', entries);
      return {
        wishlistEntry: updated,
        success: true,
        message: 'Wishlist note updated.'
      };
    }

    return {
      wishlistEntry: null,
      success: false,
      message: 'Wishlist entry not found.'
    };
  }

  // removeWishlistEntry(wishlistEntryId)
  removeWishlistEntry(wishlistEntryId) {
    const entries = this._getFromStorage('wishlist_entries');
    let found = false;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].id === wishlistEntryId) {
        entries[i].status = 'removed';
        entries[i].updated_at = new Date().toISOString();
        found = true;
        break;
      }
    }

    if (found) {
      this._saveToStorage('wishlist_entries', entries);
      return {
        success: true,
        message: 'Wishlist entry removed.'
      };
    }

    return {
      success: false,
      message: 'Wishlist entry not found.'
    };
  }

  // getTourBookingPageOptions
  getTourBookingPageOptions() {
    const tourTypes = [
      { value: 'in_person', label: 'In-person tour' },
      { value: 'virtual', label: 'Virtual tour' }
    ];

    // Use 2:00 PM explicitly so it matches task expectations
    const timeSlots = [
      { value: '10:00 AM', label: '10:00 AM' },
      { value: '11:00 AM', label: '11:00 AM' },
      { value: '2:00 PM', label: '2:00 PM' },
      { value: '4:00 PM', label: '4:00 PM' }
    ];

    const locations = this._getFromStorage('ceremony_locations').filter((l) => l.is_active);

    return {
      tourTypes: tourTypes,
      timeSlots: timeSlots,
      locations: locations,
      defaultTourType: 'in_person'
    };
  }

  // createTourRequest(tourType, tourDate, tourTime, numberOfAttendees, preferredLocationId, fullName, phoneNumber, email, status)
  createTourRequest(tourType, tourDate, tourTime, numberOfAttendees, preferredLocationId, fullName, phoneNumber, email, status) {
    const requests = this._getFromStorage('tour_requests');
    const req = {
      id: this._generateId('tour_req'),
      tour_type: tourType,
      tour_date: tourDate,
      tour_time: tourTime,
      number_of_attendees: numberOfAttendees,
      preferred_location_id: preferredLocationId || null,
      full_name: fullName,
      phone_number: phoneNumber,
      email: email || null,
      status: status || 'submitted',
      created_at: new Date().toISOString()
    };
    requests.push(req);
    this._saveToStorage('tour_requests', requests);

    return {
      tourRequest: req,
      success: true,
      message: 'Tour request submitted.'
    };
  }

  // getAboutContactInfo
  getAboutContactInfo() {
    const about = this._getObjectFromStorage('about_contact_info', {}) || {};
    return {
      story: about.story || '',
      mission: about.mission || '',
      phone: about.phone || '',
      email: about.email || '',
      address: about.address || '',
      officeHours: about.officeHours || ''
    };
  }

  // submitContactForm(fullName, email, phoneNumber, message)
  submitContactForm(fullName, email, phoneNumber, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const id = this._generateId('contact');
    const submission = {
      id: id,
      full_name: fullName,
      email: email,
      phone_number: phoneNumber || null,
      message: message,
      created_at: new Date().toISOString()
    };
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Contact form submitted.',
      referenceId: id
    };
  }

  // getPolicies
  getPolicies() {
    const sections = this._getFromStorage('policies');
    return {
      sections: sections
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