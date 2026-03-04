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

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      'users',
      'devotionals',
      'reading_lists',
      'reading_list_items',
      'sunday_services',
      'service_reservations',
      'bible_reading_plans',
      'reading_plan_days',
      'prayer_requests',
      'newsletter_subscriptions',
      'donation_funds',
      'donations',
      'small_groups',
      'group_registrations',
      'sermons',
      'watch_later_lists',
      'watch_later_items',
      'resource_categories',
      'products',
      'carts',
      'cart_items',
      'shipping_options',
      'orders',
      'order_items'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  _addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  _toTimeString(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const mm = minutes < 10 ? '0' + minutes : String(minutes);
    return h12 + ':' + mm + ' ' + ampm;
  }

  _titleCase(str) {
    if (!str) return '';
    return String(str)
      .split(/[_\s]+/)
      .map(function (s) {
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      })
      .join(' ');
  }

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    if (lists.length > 0) {
      return lists[0];
    }
    const now = this._nowISO();
    const list = {
      id: this._generateId('readinglist'),
      name: 'My Devotionals',
      description: 'Personal devotional reading list',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  _getOrCreateWatchLaterList() {
    let lists = this._getFromStorage('watch_later_lists');
    if (lists.length > 0) {
      return lists[0];
    }
    const now = this._nowISO();
    const list = {
      id: this._generateId('watchlater'),
      name: 'Watch Later',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('watch_later_lists', lists);
    return list;
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'active') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      const now = this._nowISO();
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now,
        status: 'active'
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _calculateDonationFees(amount, processingFeePercent, coverProcessingFee) {
    const percent = processingFeePercent || 0;
    const feeRaw = amount * (percent / 100);
    const fee = Math.round(feeRaw * 100) / 100;
    if (coverProcessingFee) {
      return {
        processing_fee_amount: fee,
        total_charge_amount: Math.round((amount + fee) * 100) / 100
      };
    }
    return {
      processing_fee_amount: fee,
      total_charge_amount: amount
    };
  }

  _generateReadingPlanDays(plan) {
    const days = [];
    const duration = plan.duration_days;
    const chapters = plan.chapters_per_day;
    const scope = plan.content_scope;
    for (let i = 0; i < duration; i++) {
      const dayNumber = i + 1;
      const dateISO = this._addDays(plan.start_date, i);
      const passageLabel = this._titleCase(scope.replace(/_/g, ' '));
      const passage = passageLabel + ': Day ' + dayNumber + ' (' + chapters + ' chapters)';
      days.push({
        id: this._generateId('readingplanday'),
        plan_id: plan.id,
        day_number: dayNumber,
        date: dateISO,
        passages: [passage],
        is_completed: false,
        completed_at: null
      });
    }
    return days;
  }

  _calculateCartTotalsAndFreeShippingEligibility(cart, cartItems) {
    const products = this._getFromStorage('products');
    const shippingOptions = this._getFromStorage('shipping_options');

    let subtotal = 0;
    let hasPhysicalItems = false;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id !== cart.id) continue;
      subtotal += item.total_price || 0;
      const prod = products.find(function (p) { return p.id === item.product_id; });
      if (prod && prod.is_physical_shippable) {
        hasPhysicalItems = true;
      }
    }

    let freeShippingMinOrderTotal = null;
    for (let i = 0; i < shippingOptions.length; i++) {
      const opt = shippingOptions[i];
      if (!opt.is_active) continue;
      if (opt.code === 'free_shipping' || opt.is_free) {
        if (typeof opt.min_order_total_for_free === 'number') {
          if (freeShippingMinOrderTotal === null || opt.min_order_total_for_free < freeShippingMinOrderTotal) {
            freeShippingMinOrderTotal = opt.min_order_total_for_free;
          }
        }
      }
    }

    const eligibleForFreeShipping = !!(
      hasPhysicalItems &&
      freeShippingMinOrderTotal !== null &&
      subtotal >= freeShippingMinOrderTotal
    );

    let appliedShippingOption = null;
    let shippingCost = 0;
    if (hasPhysicalItems && shippingOptions.length > 0) {
      let chosen = null;
      if (cart.shipping_option_id) {
        chosen = shippingOptions.find(function (o) { return o.id === cart.shipping_option_id; }) || null;
      }
      if (!chosen) {
        // Choose default: free_shipping if eligible, else standard or first
        let freeOpt = null;
        let standardOpt = null;
        for (let i = 0; i < shippingOptions.length; i++) {
          const opt = shippingOptions[i];
          if (!opt.is_active) continue;
          if (!freeOpt && (opt.code === 'free_shipping' || opt.is_free)) {
            freeOpt = opt;
          }
          if (!standardOpt && opt.code === 'standard_shipping') {
            standardOpt = opt;
          }
        }
        if (eligibleForFreeShipping && freeOpt) {
          chosen = freeOpt;
        } else if (standardOpt) {
          chosen = standardOpt;
        } else {
          chosen = shippingOptions[0];
        }
      }
      if (chosen) {
        const baseCost = chosen.cost || 0;
        shippingCost = (chosen.code === 'free_shipping' || chosen.is_free) && eligibleForFreeShipping ? 0 : baseCost;
        appliedShippingOption = {
          shipping_option_id: chosen.id,
          code: chosen.code,
          name: chosen.name,
          cost: shippingCost,
          is_free: shippingCost === 0
        };
      }
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      has_physical_items: hasPhysicalItems,
      eligible_for_free_shipping: eligibleForFreeShipping,
      free_shipping_min_order_total: freeShippingMinOrderTotal,
      applied_shipping_option: appliedShippingOption,
      shipping_cost: shippingCost,
      total: Math.round((subtotal + shippingCost) * 100) / 100
    };
  }

  _validatePaymentDetails(paymentMethod, cardNumber, cardExpMonth, cardExpYear, cardCvv) {
    if (paymentMethod === 'credit_card') {
      if (!cardNumber || typeof cardNumber !== 'string' || cardNumber.replace(/\s+/g, '').length < 12) {
        return { valid: false, message: 'Invalid card number' };
      }
      if (!cardExpMonth || !cardExpYear) {
        return { valid: false, message: 'Card expiry is required' };
      }
      if (!cardCvv || cardCvv.length < 3) {
        return { valid: false, message: 'Invalid CVV' };
      }
      return { valid: true, message: 'ok' };
    }
    if (paymentMethod === 'bank_account') {
      // Minimal validation for bank account payments
      return { valid: true, message: 'ok' };
    }
    return { valid: false, message: 'Unsupported payment method' };
  }

  _resolveForeignKey(obj, foreignKeyField, collection, targetFieldName) {
    const value = obj[foreignKeyField];
    const target = collection.find(function (item) { return item.id === value; }) || null;
    obj[targetFieldName] = target;
    return obj;
  }

  // =====================
  // Interface implementations
  // =====================

  // getHomepageHighlights()
  getHomepageHighlights() {
    const devotionals = this._getFromStorage('devotionals').filter(function (d) { return d.status === 'published'; });
    const sermons = this._getFromStorage('sermons').filter(function (s) { return s.status === 'published'; });
    const sundayServices = this._getFromStorage('sunday_services').filter(function (s) { return s.status === 'scheduled'; });
    const readingListItems = this._getFromStorage('reading_list_items').filter(function (i) { return i.status !== 'removed'; });
    const watchLaterItems = this._getFromStorage('watch_later_items');

    devotionals.sort(function (a, b) {
      return new Date(b.date_published) - new Date(a.date_published);
    });
    sermons.sort(function (a, b) {
      return new Date(b.date_published) - new Date(a.date_published);
    });
    sundayServices.sort(function (a, b) {
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });

    const featuredDevotionals = devotionals.slice(0, 5).map(function (d) {
      const isSaved = readingListItems.some(function (item) { return item.devotional_id === d.id && item.status !== 'removed'; });
      return {
        devotional_id: d.id,
        title: d.title,
        excerpt: d.excerpt || '',
        topic_tags: d.topic_tags || [],
        reading_time_minutes: d.reading_time_minutes,
        date_published: d.date_published,
        image_url: d.image_url || '',
        is_saved_to_reading_list: isSaved
      };
    });

    const featuredSermons = sermons.slice(0, 5).map(function (s) {
      const isInWatchLater = watchLaterItems.some(function (item) { return item.sermon_id === s.id; });
      return {
        sermon_id: s.id,
        title: s.title,
        thumbnail_url: s.thumbnail_url || '',
        duration_minutes: s.duration_minutes,
        rating_average: typeof s.rating_average === 'number' ? s.rating_average : null,
        date_published: s.date_published,
        is_in_watch_later: isInWatchLater
      };
    });

    const now = new Date();
    const upcoming = sundayServices.filter(function (s) {
      return new Date(s.start_datetime) >= now;
    });
    let nextId = null;
    if (upcoming.length > 0) {
      upcoming.sort(function (a, b) {
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      });
      nextId = upcoming[0].id;
    }

    const upcomingServices = upcoming.map(function (s) {
      return {
        sunday_service_id: s.id,
        title: s.title || '',
        start_datetime: s.start_datetime,
        start_time_label: s.start_time_label || '',
        location_name: s.location_name || '',
        location_address: s.location_address || '',
        childcare_available: !!s.childcare_available,
        status: s.status,
        is_next_upcoming: s.id === nextId
      };
    });

    return {
      featured_devotionals: featuredDevotionals,
      featured_sermons: featuredSermons,
      upcoming_sunday_services: upcomingServices
    };
  }

  // searchSiteContent(query, maxResultsPerType)
  searchSiteContent(query, maxResultsPerType) {
    const q = (query || '').toLowerCase();
    const limit = typeof maxResultsPerType === 'number' ? maxResultsPerType : 5;

    const devotionals = this._getFromStorage('devotionals').filter(function (d) {
      if (d.status !== 'published') return false;
      if (!q) return true;
      const text = (d.title || '') + ' ' + (d.content || '') + ' ' + (d.excerpt || '');
      return text.toLowerCase().indexOf(q) !== -1;
    }).slice(0, limit);

    const sermons = this._getFromStorage('sermons').filter(function (s) {
      if (s.status !== 'published') return false;
      if (!q) return true;
      const text = (s.title || '') + ' ' + (s.description || '');
      return text.toLowerCase().indexOf(q) !== -1;
    }).slice(0, limit);

    return {
      devotionals: devotionals,
      sermons: sermons
    };
  }

  // getDevotionalFilterOptions()
  getDevotionalFilterOptions() {
    const devotionals = this._getFromStorage('devotionals');
    const topicSet = {};
    for (let i = 0; i < devotionals.length; i++) {
      const tags = devotionals[i].topic_tags || [];
      for (let j = 0; j < tags.length; j++) {
        const t = String(tags[j]);
        topicSet[t] = true;
      }
    }
    const topicTags = Object.keys(topicSet).map(function (t) {
      return { value: t, label: t.charAt(0).toUpperCase() + t.slice(1) };
    });

    const readingTimeOptions = [
      { max_minutes: 5, label: 'Up to 5 minutes' },
      { max_minutes: 10, label: 'Up to 10 minutes' },
      { max_minutes: 15, label: 'Up to 15 minutes' },
      { max_minutes: 20, label: 'Up to 20 minutes' }
    ];

    const dateRangePresets = [
      { value: 'last_7_days', label: 'Last 7 Days' },
      { value: 'last_30_days', label: 'Last 30 Days' },
      { value: 'last_12_months', label: 'Last 12 Months' },
      { value: 'all_time', label: 'All Time' }
    ];

    return {
      topic_tags: topicTags,
      reading_time_options: readingTimeOptions,
      date_range_presets: dateRangePresets
    };
  }

  // searchDevotionals(query, filters, sort_by, page, page_size)
  searchDevotionals(query, filters, sort_by, page, page_size) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sortBy = sort_by || 'date_desc';
    const pg = page || 1;
    const size = page_size || 20;
    const readingListItems = this._getFromStorage('reading_list_items').filter(function (i) { return i.status !== 'removed'; });

    let items = this._getFromStorage('devotionals').filter(function (d) {
      if (d.status !== 'published') return false;
      if (q) {
        const text = (d.title || '') + ' ' + (d.content || '') + ' ' + (d.excerpt || '');
        if (text.toLowerCase().indexOf(q) === -1) return false;
      }
      if (f.topic_tag) {
        const tags = d.topic_tags || [];
        const tagLower = String(f.topic_tag).toLowerCase();
        const hasTag = tags.some(function (t) { return String(t).toLowerCase() === tagLower; });
        if (!hasTag) return false;
      }
      if (typeof f.max_reading_time_minutes === 'number') {
        if (d.reading_time_minutes > f.max_reading_time_minutes) return false;
      }
      let dateFrom = null;
      let dateTo = null;
      if (f.date_range_preset && f.date_range_preset !== 'all_time') {
        const now = new Date();
        if (f.date_range_preset === 'last_7_days') {
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (f.date_range_preset === 'last_30_days') {
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (f.date_range_preset === 'last_12_months') {
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        }
      }
      if (f.date_from) {
        dateFrom = new Date(f.date_from);
      }
      if (f.date_to) {
        dateTo = new Date(f.date_to);
      }
      if (dateFrom || dateTo) {
        const dDate = new Date(d.date_published);
        if (dateFrom && dDate < dateFrom) return false;
        if (dateTo && dDate > dateTo) return false;
      }
      return true;
    });

    items.sort(function (a, b) {
      if (sortBy === 'date_asc') {
        return new Date(a.date_published) - new Date(b.date_published);
      }
      if (sortBy === 'reading_time_asc') {
        return a.reading_time_minutes - b.reading_time_minutes;
      }
      // default date_desc
      return new Date(b.date_published) - new Date(a.date_published);
    });

    const totalCount = items.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = items.slice(start, end).map(function (d) {
      const isSaved = readingListItems.some(function (item) { return item.devotional_id === d.id && item.status !== 'removed'; });
      return {
        devotional_id: d.id,
        title: d.title,
        excerpt: d.excerpt || '',
        topic_tags: d.topic_tags || [],
        reading_time_minutes: d.reading_time_minutes,
        date_published: d.date_published,
        image_url: d.image_url || '',
        is_saved_to_reading_list: isSaved
      };
    });

    return {
      total_count: totalCount,
      page: pg,
      page_size: size,
      items: pageItems
    };
  }

  // getDevotionalDetail(devotionalId)
  getDevotionalDetail(devotionalId) {
    const devotionals = this._getFromStorage('devotionals');
    const devotional = devotionals.find(function (d) { return d.id === devotionalId; }) || null;
    if (!devotional) {
      return {
        devotional: null,
        is_saved_to_reading_list: false,
        previous_devotional_id: null,
        next_devotional_id: null
      };
    }
    const readingListItems = this._getFromStorage('reading_list_items').filter(function (i) { return i.status !== 'removed'; });
    const isSaved = readingListItems.some(function (item) { return item.devotional_id === devotional.id; });

    const published = devotionals.filter(function (d) { return d.status === 'published'; });
    published.sort(function (a, b) {
      return new Date(a.date_published) - new Date(b.date_published);
    });
    let prevId = null;
    let nextId = null;
    for (let i = 0; i < published.length; i++) {
      if (published[i].id === devotional.id) {
        if (i > 0) prevId = published[i - 1].id;
        if (i < published.length - 1) nextId = published[i + 1].id;
        break;
      }
    }

    return {
      devotional: devotional,
      is_saved_to_reading_list: isSaved,
      previous_devotional_id: prevId,
      next_devotional_id: nextId
    };
  }

  // saveDevotionalToReadingList(devotionalId)
  saveDevotionalToReadingList(devotionalId) {
    const devotionalIdStr = devotionalId;
    const list = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items');
    const now = this._nowISO();

    let existing = items.find(function (i) {
      return i.reading_list_id === list.id && i.devotional_id === devotionalIdStr && i.status !== 'removed';
    });

    if (!existing) {
      existing = {
        id: this._generateId('readinglistitem'),
        reading_list_id: list.id,
        devotional_id: devotionalIdStr,
        added_at: now,
        status: 'saved'
      };
      items.push(existing);
      this._saveToStorage('reading_list_items', items);
    }

    const totalSaved = items.filter(function (i) {
      return i.reading_list_id === list.id && i.status !== 'removed';
    }).length;

    return {
      success: true,
      reading_list_item_id: existing.id,
      total_saved_count: totalSaved,
      message: 'Devotional saved to reading list.'
    };
  }

  // removeDevotionalFromReadingList(devotionalId)
  removeDevotionalFromReadingList(devotionalId) {
    const list = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items');
    let changed = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].reading_list_id === list.id && items[i].devotional_id === devotionalId && items[i].status !== 'removed') {
        items[i].status = 'removed';
        changed = true;
      }
    }
    if (changed) {
      this._saveToStorage('reading_list_items', items);
    }
    const totalSaved = items.filter(function (i) {
      return i.reading_list_id === list.id && i.status !== 'removed';
    }).length;
    return {
      success: true,
      total_saved_count: totalSaved,
      message: 'Devotional removed from reading list.'
    };
  }

  // getReadingListItems()
  getReadingListItems() {
    const list = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');
    const devotionals = this._getFromStorage('devotionals');

    const filtered = items.filter(function (i) {
      return i.reading_list_id === list.id && i.status !== 'removed';
    });

    const mapped = filtered.map(function (i) {
      const d = devotionals.find(function (dev) { return dev.id === i.devotional_id; }) || null;
      return {
        reading_list_item_id: i.id,
        devotional_id: i.devotional_id,
        title: d ? d.title : '',
        excerpt: d ? (d.excerpt || '') : '',
        topic_tags: d ? (d.topic_tags || []) : [],
        reading_time_minutes: d ? d.reading_time_minutes : null,
        date_published: d ? d.date_published : null,
        status: i.status,
        added_at: i.added_at,
        devotional: d
      };
    });

    return {
      reading_list_name: list.name || 'My Devotionals',
      items: mapped
    };
  }

  // updateReadingListItemStatus(readingListItemId, status)
  updateReadingListItemStatus(readingListItemId, status) {
    let items = this._getFromStorage('reading_list_items');
    const allowed = ['saved', 'read', 'removed'];
    if (allowed.indexOf(status) === -1) {
      return { success: false, updated_status: null, message: 'Invalid status' };
    }
    let updated = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === readingListItemId) {
        items[i].status = status;
        updated = items[i];
        break;
      }
    }
    if (!updated) {
      return { success: false, updated_status: null, message: 'Reading list item not found' };
    }
    this._saveToStorage('reading_list_items', items);
    return {
      success: true,
      updated_status: status,
      message: 'Reading list item status updated.'
    };
  }

  // getUpcomingSundayServices(fromDate, maxCount)
  getUpcomingSundayServices(fromDate, maxCount) {
    const services = this._getFromStorage('sunday_services');
    const from = fromDate ? new Date(fromDate) : new Date();
    const filtered = services.filter(function (s) {
      // Include any non-cancelled services from the given date forward
      if (s.status === 'cancelled') return false;
      const d = new Date(s.start_datetime);
      return d >= from;
    });

    filtered.sort(function (a, b) {
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });
    const limit = typeof maxCount === 'number' ? maxCount : 20;
    const sliced = filtered.slice(0, limit);
    const nextId = sliced.length > 0 ? sliced[0].id : null;

    return {
      services: sliced,
      next_upcoming_service_id: nextId
    };
  }

  // getSundayServiceDetail(sundayServiceId)
  getSundayServiceDetail(sundayServiceId) {
    const services = this._getFromStorage('sunday_services');
    const service = services.find(function (s) { return s.id === sundayServiceId; }) || null;
    if (!service) {
      return { service: null, seats_remaining: null };
    }
    const capacity = typeof service.capacity === 'number' ? service.capacity : null;
    const reserved = typeof service.reserved_seats === 'number' ? service.reserved_seats : 0;
    const seatsRemaining = capacity !== null ? Math.max(capacity - reserved, 0) : null;
    return {
      service: service,
      seats_remaining: seatsRemaining
    };
  }

  // createServiceReservation(sundayServiceId, numAdults, numChildren, childrenAges, seatingPreference, contactFullName, contactEmail, contactPhone, notes)
  createServiceReservation(sundayServiceId, numAdults, numChildren, childrenAges, seatingPreference, contactFullName, contactEmail, contactPhone, notes) {
    const services = this._getFromStorage('sunday_services');
    let reservations = this._getFromStorage('service_reservations');
    const service = services.find(function (s) { return s.id === sundayServiceId; }) || null;
    if (!service) {
      return { reservation_id: null, status: null, success: false, message: 'Service not found', summary: null };
    }
    // Allow reservations for any service except those explicitly cancelled
    if (service.status === 'cancelled') {
      return { reservation_id: null, status: null, success: false, message: 'Service is not open for reservations', summary: null };
    }

    const totalSeats = (numAdults || 0) + (numChildren || 0);
    let capacity = typeof service.capacity === 'number' ? service.capacity : null;
    let reserved = typeof service.reserved_seats === 'number' ? service.reserved_seats : 0;
    if (capacity !== null && totalSeats > (capacity - reserved)) {
      return { reservation_id: null, status: null, success: false, message: 'Not enough seats available', summary: null };
    }

    const now = this._nowISO();
    const reservation = {
      id: this._generateId('serviceres'),
      sunday_service_id: sundayServiceId,
      num_adults: numAdults,
      num_children: numChildren,
      children_ages: Array.isArray(childrenAges) ? childrenAges : [],
      seating_preference: seatingPreference || 'no_preference',
      contact_full_name: contactFullName,
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      notes: notes || '',
      created_at: now,
      status: 'confirmed'
    };

    reservations.push(reservation);
    this._saveToStorage('service_reservations', reservations);

    // update reserved seats
    reserved += totalSeats;
    service.reserved_seats = reserved;
    this._saveToStorage('sunday_services', services);

    return {
      reservation_id: reservation.id,
      status: reservation.status,
      success: true,
      message: 'Reservation created successfully.',
      summary: {
        service_title: service.title || '',
        service_start_datetime: service.start_datetime,
        num_adults: numAdults,
        num_children: numChildren,
        seating_preference: reservation.seating_preference,
        contact_full_name: contactFullName,
        contact_email: contactEmail
      }
    };
  }

  // getServiceReservationConfirmation(reservationId)
  getServiceReservationConfirmation(reservationId) {
    const reservations = this._getFromStorage('service_reservations');
    const services = this._getFromStorage('sunday_services');
    const reservation = reservations.find(function (r) { return r.id === reservationId; }) || null;
    const service = reservation ? (services.find(function (s) { return s.id === reservation.sunday_service_id; }) || null) : null;
    if (reservation && service) {
      // foreign key resolution (if needed)
      reservation.sunday_service = service;
    }
    return {
      reservation: reservation,
      service: service
    };
  }

  // getBibleReadingPlansList()
  getBibleReadingPlansList() {
    const plans = this._getFromStorage('bible_reading_plans');
    const days = this._getFromStorage('reading_plan_days');

    const mapped = plans.map(function (plan) {
      const planDays = days.filter(function (d) { return d.plan_id === plan.id; });
      const totalDays = planDays.length;
      const completedDays = planDays.filter(function (d) { return d.is_completed; }).length;
      const progress = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
      return {
        plan_id: plan.id,
        name: plan.name,
        content_scope: plan.content_scope,
        duration_days: plan.duration_days,
        chapters_per_day: plan.chapters_per_day,
        start_date: plan.start_date,
        end_date: plan.end_date || null,
        status: plan.status,
        progress_percent: Math.round(progress * 10) / 10,
        daily_reminder_enabled: plan.daily_reminder_enabled,
        daily_reminder_time: plan.daily_reminder_time || null
      };
    });

    return {
      plans: mapped
    };
  }

  // getReadingPlanDetail(planId)
  getReadingPlanDetail(planId) {
    const plans = this._getFromStorage('bible_reading_plans');
    const days = this._getFromStorage('reading_plan_days');
    const plan = plans.find(function (p) { return p.id === planId; }) || null;
    const planDays = days.filter(function (d) { return d.plan_id === planId; });
    planDays.sort(function (a, b) { return a.day_number - b.day_number; });
    return {
      plan: plan,
      days: planDays
    };
  }

  // getReadingPlanBuilderDefaults()
  getReadingPlanBuilderDefaults() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      available_content_scopes: ['old_testament', 'new_testament', 'whole_bible', 'custom'],
      default_duration_days: 30,
      default_chapters_per_day: 3,
      default_start_date: today,
      default_daily_reminder_enabled: false,
      default_daily_reminder_time: '07:00'
    };
  }

  // createBibleReadingPlan(name, description, contentScope, durationDays, chaptersPerDay, startDate, dailyReminderEnabled, dailyReminderTime)
  createBibleReadingPlan(name, description, contentScope, durationDays, chaptersPerDay, startDate, dailyReminderEnabled, dailyReminderTime) {
    let plans = this._getFromStorage('bible_reading_plans');
    let days = this._getFromStorage('reading_plan_days');
    const now = this._nowISO();
    const startISO = new Date(startDate).toISOString();
    const endISO = this._addDays(startISO, durationDays - 1);

    const plan = {
      id: this._generateId('plan'),
      name: name,
      description: description || '',
      content_scope: contentScope,
      duration_days: durationDays,
      chapters_per_day: chaptersPerDay,
      start_date: startISO,
      end_date: endISO,
      daily_reminder_enabled: !!dailyReminderEnabled,
      daily_reminder_time: dailyReminderTime || null,
      status: 'active',
      created_at: now,
      updated_at: now
    };

    plans.push(plan);
    this._saveToStorage('bible_reading_plans', plans);

    const generatedDays = this._generateReadingPlanDays(plan);
    days = days.concat(generatedDays);
    this._saveToStorage('reading_plan_days', days);

    return {
      plan: plan,
      days: generatedDays,
      success: true,
      message: 'Bible reading plan created.'
    };
  }

  // updateBibleReadingPlanNotifications(planId, dailyReminderEnabled, dailyReminderTime)
  updateBibleReadingPlanNotifications(planId, dailyReminderEnabled, dailyReminderTime) {
    let plans = this._getFromStorage('bible_reading_plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plans[i].daily_reminder_enabled = !!dailyReminderEnabled;
        plans[i].daily_reminder_time = dailyReminderTime || null;
        plans[i].updated_at = this._nowISO();
        plan = plans[i];
        break;
      }
    }
    if (!plan) {
      return { plan: null, success: false };
    }
    this._saveToStorage('bible_reading_plans', plans);
    return { plan: plan, success: true };
  }

  // pauseBibleReadingPlan(planId)
  pauseBibleReadingPlan(planId) {
    let plans = this._getFromStorage('bible_reading_plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plans[i].status = 'paused';
        plans[i].updated_at = this._nowISO();
        plan = plans[i];
        break;
      }
    }
    if (!plan) {
      return { plan: null, success: false };
    }
    this._saveToStorage('bible_reading_plans', plans);
    return { plan: plan, success: true };
  }

  // deleteBibleReadingPlan(planId)
  deleteBibleReadingPlan(planId) {
    let plans = this._getFromStorage('bible_reading_plans');
    let found = false;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plans[i].status = 'cancelled';
        plans[i].updated_at = this._nowISO();
        found = true;
        break;
      }
    }
    if (!found) {
      return { success: false };
    }
    this._saveToStorage('bible_reading_plans', plans);
    return { success: true };
  }

  // getPrayerPageContent()
  getPrayerPageContent() {
    return {
      intro_html: '<p>We believe in the power of prayer. Share your requests and our prayer team will stand with you.</p>',
      guidelines_html: '<ul><li>Please avoid sharing sensitive personal details.</li><li>Requests may be edited for clarity or privacy.</li></ul>',
      newsletter_description: 'Opt in to receive our Weekly Prayer Newsletter with encouragement and ways to pray.'
    };
  }

  // getPrayerRequestCategoryOptions()
  getPrayerRequestCategoryOptions() {
    const categories = ['health', 'family', 'finances', 'relationships', 'spiritual_growth', 'other'].map(function (c) {
      return { value: c, label: c.split('_').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ') };
    });
    return { categories: categories };
  }

  // submitPrayerRequest(category, text, isAnonymous, newsletterOptIn, email)
  submitPrayerRequest(category, text, isAnonymous, newsletterOptIn, email) {
    let requests = this._getFromStorage('prayer_requests');
    let subscriptions = this._getFromStorage('newsletter_subscriptions');
    const now = this._nowISO();

    const prayerRequest = {
      id: this._generateId('prayer'),
      category: category,
      text: text,
      is_anonymous: !!isAnonymous,
      newsletter_opt_in: !!newsletterOptIn,
      created_at: now,
      status: 'submitted',
      internal_notes: email ? ('Submitted email: ' + email) : ''
    };
    requests.push(prayerRequest);
    this._saveToStorage('prayer_requests', requests);

    let newsletterSubscription = null;
    if (newsletterOptIn) {
      newsletterSubscription = {
        id: this._generateId('newsletter'),
        newsletter_type: 'weekly_prayer',
        is_subscribed: true,
        subscribed_at: now,
        unsubscribed_at: null
      };
      subscriptions.push(newsletterSubscription);
      this._saveToStorage('newsletter_subscriptions', subscriptions);
    }

    return {
      prayer_request: prayerRequest,
      newsletter_subscription: newsletterSubscription,
      success: true,
      message: 'Prayer request submitted.'
    };
  }

  // getDonationFunds()
  getDonationFunds() {
    const funds = this._getFromStorage('donation_funds').filter(function (f) { return f.is_active; });
    return { funds: funds };
  }

  // getDonationDefaults()
  getDonationDefaults() {
    return {
      default_amount: 50,
      default_frequency: 'one_time',
      processing_fee_percent: 2.5
    };
  }

  // createDonation(fundId, amount, frequency, coverProcessingFee, dedicationType, dedicationName, paymentMethod, cardNumber, cardExpMonth, cardExpYear, cardCvv, billingZip, donorFullName, donorEmail, donorPhone, donorAddressLine1, donorAddressLine2, donorCity, donorState, donorPostalCode, donorCountry)
  createDonation(fundId, amount, frequency, coverProcessingFee, dedicationType, dedicationName, paymentMethod, cardNumber, cardExpMonth, cardExpYear, cardCvv, billingZip, donorFullName, donorEmail, donorPhone, donorAddressLine1, donorAddressLine2, donorCity, donorState, donorPostalCode, donorCountry) {
    const funds = this._getFromStorage('donation_funds');
    let donations = this._getFromStorage('donations');

    const fund = funds.find(function (f) { return f.id === fundId && f.is_active; }) || null;
    if (!fund) {
      return { donation: null, success: false, message: 'Donation fund not found or inactive.' };
    }

    const defaults = this.getDonationDefaults();
    const validation = this._validatePaymentDetails(paymentMethod, cardNumber, cardExpMonth, cardExpYear, cardCvv);
    if (!validation.valid) {
      return { donation: null, success: false, message: validation.message };
    }

    const fees = this._calculateDonationFees(amount, defaults.processing_fee_percent, !!coverProcessingFee);
    const now = this._nowISO();

    const cleanCard = (cardNumber || '').replace(/\s+/g, '');
    let cardBrand = '';
    if (paymentMethod === 'credit_card') {
      if (cleanCard[0] === '4') cardBrand = 'visa';
      else if (cleanCard[0] === '5') cardBrand = 'mastercard';
      else cardBrand = 'card';
    }

    const donation = {
      id: this._generateId('donation'),
      fund_id: fundId,
      amount: amount,
      frequency: frequency,
      cover_processing_fee: !!coverProcessingFee,
      processing_fee_percent: defaults.processing_fee_percent,
      processing_fee_amount: fees.processing_fee_amount,
      total_charge_amount: fees.total_charge_amount,
      dedication_type: dedicationType,
      dedication_name: dedicationName || '',
      payment_method: paymentMethod,
      card_brand: cardBrand,
      card_last4: cleanCard ? cleanCard.slice(-4) : '',
      card_exp_month: cardExpMonth || null,
      card_exp_year: cardExpYear || null,
      billing_zip: billingZip || '',
      donor_full_name: donorFullName,
      donor_email: donorEmail,
      donor_phone: donorPhone || '',
      donor_address_line1: donorAddressLine1 || '',
      donor_address_line2: donorAddressLine2 || '',
      donor_city: donorCity || '',
      donor_state: donorState || '',
      donor_postal_code: donorPostalCode || '',
      donor_country: donorCountry || '',
      created_at: now,
      status: 'succeeded',
      confirmation_number: 'DN-' + Date.now() + '-' + Math.floor(Math.random() * 10000)
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      donation: donation,
      success: true,
      message: 'Donation processed successfully.'
    };
  }

  // getSmallGroupFilterOptions()
  getSmallGroupFilterOptions() {
    const audiences = ['young_adults', 'men', 'women', 'mixed_adults', 'teens', 'seniors', 'college', 'other'].map(function (a) {
      return { value: a, label: a.split('_').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ') };
    });
    const meetingFormats = ['online', 'in_person', 'hybrid'].map(function (f) {
      return { value: f, label: f.split('_').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ') };
    });
    const meetingDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(function (d) {
      return { value: d, label: d.charAt(0).toUpperCase() + d.slice(1) };
    });
    const timeRangePresets = [
      { start_time: '06:00', end_time: '08:00', label: 'Morning (6am-8am)' },
      { start_time: '18:00', end_time: '20:00', label: 'Evening (6pm-8pm)' }
    ];
    return {
      audiences: audiences,
      meeting_formats: meetingFormats,
      meeting_days: meetingDays,
      time_range_presets: timeRangePresets
    };
  }

  // searchSmallGroups(filters, sort_by)
  searchSmallGroups(filters, sort_by) {
    const f = filters || {};
    const sortBy = sort_by || 'start_date_asc';
    let groups = this._getFromStorage('small_groups');

    groups = groups.filter(function (g) {
      if (f.audience && g.audience !== f.audience) return false;
      if (f.meetingFormat && g.meeting_format !== f.meetingFormat) return false;
      if (f.meetingDay && g.meeting_day !== f.meetingDay) return false;
      if (f.status && g.status !== f.status) return false;
      if (f.meetingTimeStartFrom || f.meetingTimeStartTo) {
        const start = g.meeting_time_start;
        if (f.meetingTimeStartFrom && start < f.meetingTimeStartFrom) return false;
        if (f.meetingTimeStartTo && start > f.meetingTimeStartTo) return false;
      }
      return true;
    });

    groups.sort(function (a, b) {
      if (sortBy === 'start_date_desc') {
        return new Date(b.start_date) - new Date(a.start_date);
      }
      // default ascending
      return new Date(a.start_date) - new Date(b.start_date);
    });

    return {
      groups: groups
    };
  }

  // getSmallGroupDetail(smallGroupId)
  getSmallGroupDetail(smallGroupId) {
    const groups = this._getFromStorage('small_groups');
    const regs = this._getFromStorage('group_registrations');
    const group = groups.find(function (g) { return g.id === smallGroupId; }) || null;
    const isRegistered = regs.some(function (r) { return r.small_group_id === smallGroupId && r.status !== 'cancelled'; });
    return {
      group: group,
      is_user_registered: isRegistered
    };
  }

  // registerForSmallGroup(smallGroupId, fullName, email, phone, notes)
  registerForSmallGroup(smallGroupId, fullName, email, phone, notes) {
    const groups = this._getFromStorage('small_groups');
    let regs = this._getFromStorage('group_registrations');
    const group = groups.find(function (g) { return g.id === smallGroupId; }) || null;
    if (!group) {
      return { group_registration: null, success: false, message: 'Small group not found.' };
    }
    if (group.status === 'closed') {
      return { group_registration: null, success: false, message: 'This group is closed.' };
    }

    const existingCount = regs.filter(function (r) { return r.small_group_id === smallGroupId && r.status !== 'cancelled'; }).length;
    let regStatus = 'confirmed';
    if (typeof group.capacity === 'number' && existingCount >= group.capacity) {
      regStatus = 'waitlisted';
    }

    const now = this._nowISO();
    const registration = {
      id: this._generateId('groupreg'),
      small_group_id: smallGroupId,
      full_name: fullName,
      email: email,
      phone: phone || '',
      notes: notes || '',
      created_at: now,
      status: regStatus
    };

    regs.push(registration);
    this._saveToStorage('group_registrations', regs);

    return {
      group_registration: registration,
      success: true,
      message: regStatus === 'confirmed' ? 'Successfully registered for group.' : 'Group is full; you have been waitlisted.'
    };
  }

  // getGroupRegistrationConfirmation(registrationId)
  getGroupRegistrationConfirmation(registrationId) {
    const regs = this._getFromStorage('group_registrations');
    const groups = this._getFromStorage('small_groups');
    const registration = regs.find(function (r) { return r.id === registrationId; }) || null;
    const group = registration ? (groups.find(function (g) { return g.id === registration.small_group_id; }) || null) : null;
    if (registration && group) {
      registration.small_group = group;
    }
    return {
      group_registration: registration,
      group: group
    };
  }

  // getSermonFilterOptions()
  getSermonFilterOptions() {
    const sermons = this._getFromStorage('sermons');
    const topicSet = {};
    for (let i = 0; i < sermons.length; i++) {
      const topics = sermons[i].topics || [];
      for (let j = 0; j < topics.length; j++) {
        topicSet[String(topics[j])] = true;
      }
    }
    const topics = Object.keys(topicSet);
    const dateRangePresets = [
      { value: 'last_7_days', label: 'Last 7 Days' },
      { value: 'last_30_days', label: 'Last 30 Days' },
      { value: 'last_2_years', label: 'Last 2 Years' },
      { value: 'all_time', label: 'All Time' }
    ];
    const ratingThresholds = [3, 3.5, 4, 4.5, 5];
    const durationOptionsMinutes = [15, 30, 35, 45, 60];

    return {
      topics: topics,
      date_range_presets: dateRangePresets,
      rating_thresholds: ratingThresholds,
      duration_options_minutes: durationOptionsMinutes
    };
  }

  // searchSermons(query, filters, sort_by, page, page_size)
  searchSermons(query, filters, sort_by, page, page_size) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sortBy = sort_by || 'date_desc';
    const pg = page || 1;
    const size = page_size || 20;
    const watchLaterItems = this._getFromStorage('watch_later_items');

    let items = this._getFromStorage('sermons').filter(function (s) {
      if (s.status !== 'published') return false;
      if (q) {
        const text = (s.title || '') + ' ' + (s.description || '');
        if (text.toLowerCase().indexOf(q) === -1) return false;
      }
      if (f.topic) {
        const topics = s.topics || [];
        const topicLower = String(f.topic).toLowerCase();
        const hasTopic = topics.some(function (t) { return String(t).toLowerCase() === topicLower; });
        if (!hasTopic) return false;
      }
      let dateFrom = null;
      let dateTo = null;
      if (f.date_range_preset && f.date_range_preset !== 'all_time') {
        const now = new Date();
        if (f.date_range_preset === 'last_7_days') {
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (f.date_range_preset === 'last_30_days') {
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (f.date_range_preset === 'last_2_years') {
          dateFrom = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
        }
      }
      if (f.date_from) {
        dateFrom = new Date(f.date_from);
      }
      if (f.date_to) {
        dateTo = new Date(f.date_to);
      }
      if (dateFrom || dateTo) {
        const dDate = new Date(s.date_published);
        if (dateFrom && dDate < dateFrom) return false;
        if (dateTo && dDate > dateTo) return false;
      }
      if (typeof f.min_rating === 'number') {
        if (typeof s.rating_average !== 'number' || s.rating_average < f.min_rating) return false;
      }
      if (typeof f.max_duration_minutes === 'number') {
        if (s.duration_minutes > f.max_duration_minutes) return false;
      }
      return true;
    });

    items.sort(function (a, b) {
      if (sortBy === 'rating_desc') {
        const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
        if (rb !== ra) return rb - ra;
        return new Date(b.date_published) - new Date(a.date_published);
      }
      if (sortBy === 'duration_asc') {
        return a.duration_minutes - b.duration_minutes;
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date_published) - new Date(b.date_published);
      }
      // default date_desc
      return new Date(b.date_published) - new Date(a.date_published);
    });

    const totalCount = items.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = items.slice(start, end).map(function (s) {
      const isInWatchLater = watchLaterItems.some(function (item) { return item.sermon_id === s.id; });
      return {
        sermon_id: s.id,
        title: s.title,
        thumbnail_url: s.thumbnail_url || '',
        duration_minutes: s.duration_minutes,
        rating_average: typeof s.rating_average === 'number' ? s.rating_average : null,
        rating_count: typeof s.rating_count === 'number' ? s.rating_count : null,
        date_published: s.date_published,
        topics: s.topics || [],
        is_in_watch_later: isInWatchLater
      };
    });

    return {
      total_count: totalCount,
      page: pg,
      page_size: size,
      items: pageItems
    };
  }

  // getSermonDetail(sermonId)
  getSermonDetail(sermonId) {
    const sermons = this._getFromStorage('sermons');
    const watchLaterItems = this._getFromStorage('watch_later_items');
    const sermon = sermons.find(function (s) { return s.id === sermonId; }) || null;
    if (!sermon) {
      return {
        sermon: null,
        is_in_watch_later: false,
        related_sermons: []
      };
    }

    const isInWatchLater = watchLaterItems.some(function (i) { return i.sermon_id === sermon.id; });
    const topics = sermon.topics || [];
    const related = sermons.filter(function (s) {
      if (s.id === sermon.id) return false;
      if (s.status !== 'published') return false;
      const st = s.topics || [];
      for (let i = 0; i < topics.length; i++) {
        if (st.indexOf(topics[i]) !== -1) return true;
      }
      return false;
    });
    related.sort(function (a, b) { return new Date(b.date_published) - new Date(a.date_published); });

    return {
      sermon: sermon,
      is_in_watch_later: isInWatchLater,
      related_sermons: related.slice(0, 5)
    };
  }

  // addSermonToWatchLater(sermonId)
  addSermonToWatchLater(sermonId) {
    const list = this._getOrCreateWatchLaterList();
    let items = this._getFromStorage('watch_later_items');
    const now = this._nowISO();

    let existing = items.find(function (i) {
      return i.watch_later_list_id === list.id && i.sermon_id === sermonId;
    });

    if (!existing) {
      existing = {
        id: this._generateId('watchlateritem'),
        watch_later_list_id: list.id,
        sermon_id: sermonId,
        added_at: now
      };
      items.push(existing);
      this._saveToStorage('watch_later_items', items);
    }

    const totalCount = items.filter(function (i) { return i.watch_later_list_id === list.id; }).length;

    return {
      watch_later_item_id: existing.id,
      total_watch_later_count: totalCount,
      success: true,
      message: 'Sermon added to Watch Later.'
    };
  }

  // removeSermonFromWatchLater(sermonId)
  removeSermonFromWatchLater(sermonId) {
    const list = this._getOrCreateWatchLaterList();
    let items = this._getFromStorage('watch_later_items');
    const filtered = items.filter(function (i) {
      return !(i.watch_later_list_id === list.id && i.sermon_id === sermonId);
    });
    const changed = filtered.length !== items.length;
    if (changed) {
      this._saveToStorage('watch_later_items', filtered);
      items = filtered;
    }
    const totalCount = items.filter(function (i) { return i.watch_later_list_id === list.id; }).length;
    return {
      total_watch_later_count: totalCount,
      success: true
    };
  }

  // getWatchLaterList()
  getWatchLaterList() {
    const list = this._getOrCreateWatchLaterList();
    const items = this._getFromStorage('watch_later_items');
    const sermons = this._getFromStorage('sermons');

    const filtered = items.filter(function (i) { return i.watch_later_list_id === list.id; });
    filtered.sort(function (a, b) { return new Date(a.added_at) - new Date(b.added_at); });

    const mapped = [];
    for (let index = 0; index < filtered.length; index++) {
      const i = filtered[index];
      const s = sermons.find(function (ser) { return ser.id === i.sermon_id; }) || null;
      mapped.push({
        watch_later_item_id: i.id,
        sermon_id: i.sermon_id,
        title: s ? s.title : '',
        thumbnail_url: s ? (s.thumbnail_url || '') : '',
        duration_minutes: s ? s.duration_minutes : null,
        rating_average: s && typeof s.rating_average === 'number' ? s.rating_average : null,
        date_published: s ? s.date_published : null,
        position: index + 1,
        sermon: s
      });
    }

    return {
      list_name: list.name || 'Watch Later',
      items: mapped
    };
  }

  // reorderWatchLaterItems(orderedWatchLaterItemIds)
  reorderWatchLaterItems(orderedWatchLaterItemIds) {
    const list = this._getOrCreateWatchLaterList();
    let items = this._getFromStorage('watch_later_items');
    const idOrder = Array.isArray(orderedWatchLaterItemIds) ? orderedWatchLaterItemIds : [];

    const listItems = items.filter(function (i) { return i.watch_later_list_id === list.id; });
    const otherItems = items.filter(function (i) { return i.watch_later_list_id !== list.id; });

    const itemMap = {};
    for (let i = 0; i < listItems.length; i++) {
      itemMap[listItems[i].id] = listItems[i];
    }

    const reordered = [];
    for (let i = 0; i < idOrder.length; i++) {
      const it = itemMap[idOrder[i]];
      if (it) {
        reordered.push(it);
        delete itemMap[idOrder[i]];
      }
    }
    // Append any missing items at the end in original order
    for (let i = 0; i < listItems.length; i++) {
      const it = listItems[i];
      if (itemMap[it.id]) {
        reordered.push(it);
      }
    }

    this._saveToStorage('watch_later_items', otherItems.concat(reordered));
    return { success: true };
  }

  // getStoreCategories()
  getStoreCategories() {
    const categories = this._getFromStorage('resource_categories').filter(function (c) { return c.is_active; });
    return { categories: categories };
  }

  // Helper to get descendant category ids
  _getCategoryAndDescendants(categoryId) {
    const categories = this._getFromStorage('resource_categories');
    const ids = [categoryId];
    let added = true;
    while (added) {
      added = false;
      for (let i = 0; i < categories.length; i++) {
        const c = categories[i];
        if (c.parent_id && ids.indexOf(c.parent_id) !== -1 && ids.indexOf(c.id) === -1) {
          ids.push(c.id);
          added = true;
        }
      }
    }
    return ids;
  }

  // getProductFilterOptions(categoryId)
  getProductFilterOptions(categoryId) {
    const categoryIds = this._getCategoryAndDescendants(categoryId);
    const products = this._getFromStorage('products').filter(function (p) {
      return categoryIds.indexOf(p.category_id) !== -1 && p.status === 'active';
    });

    let priceMin = null;
    let priceMax = null;
    const formatsSet = {};
    const typesSet = {};
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (typeof p.price === 'number') {
        if (priceMin === null || p.price < priceMin) priceMin = p.price;
        if (priceMax === null || p.price > priceMax) priceMax = p.price;
      }
      if (p.format) formatsSet[p.format] = true;
      if (p.type) typesSet[p.type] = true;
    }

    return {
      price_min: priceMin,
      price_max: priceMax,
      formats: Object.keys(formatsSet),
      types: Object.keys(typesSet)
    };
  }

  // listProductsByCategory(categoryId, filters, sort_by, page, page_size)
  listProductsByCategory(categoryId, filters, sort_by, page, page_size) {
    const categoryIds = this._getCategoryAndDescendants(categoryId);
    const f = filters || {};
    const sortBy = sort_by || 'title_asc';
    const pg = page || 1;
    const size = page_size || 20;

    const categories = this._getFromStorage('resource_categories');
    const category = categories.find(function (c) { return c.id === categoryId; }) || null;

    let products = this._getFromStorage('products').filter(function (p) {
      if (p.status !== 'active') return false;
      if (categoryIds.indexOf(p.category_id) === -1) return false;
      if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;
      if (Array.isArray(f.formats) && f.formats.length > 0 && f.formats.indexOf(p.format) === -1) return false;
      if (Array.isArray(f.types) && f.types.length > 0 && f.types.indexOf(p.type) === -1) return false;
      if (typeof f.isFree === 'boolean') {
        if (f.isFree && !p.is_free) return false;
        if (!f.isFree && p.is_free) return false;
      }
      if (typeof f.isPhysicalShippable === 'boolean') {
        if (f.isPhysicalShippable && !p.is_physical_shippable) return false;
        if (!f.isPhysicalShippable && p.is_physical_shippable) return false;
      }
      return true;
    });

    products.sort(function (a, b) {
      if (sortBy === 'price_asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price_desc') {
        return b.price - a.price;
      }
      if (sortBy === 'title_desc') {
        return a.title < b.title ? 1 : -1;
      }
      // default title_asc
      return a.title > b.title ? 1 : -1;
    });

    const totalCount = products.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = products.slice(start, end).map(function (p) {
      return {
        product_id: p.id,
        title: p.title,
        price: p.price,
        is_free: p.is_free,
        format: p.format,
        type: p.type,
        category_name: category ? category.name : '',
        image_url: p.image_url || '',
        is_physical_shippable: p.is_physical_shippable,
        stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null
      };
    });

    return {
      category_name: category ? category.name : '',
      total_count: totalCount,
      items: pageItems
    };
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('resource_categories');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    let categoryName = '';
    if (product) {
      const cat = categories.find(function (c) { return c.id === product.category_id; }) || null;
      if (cat) categoryName = cat.name;
    }
    return {
      product: product,
      category_name: categoryName
    };
  }

  // addProductToCart(productId, quantity)
  addProductToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product) {
      return {
        cart_id: cart.id,
        cart_item_id: null,
        cart_item_count: cartItems.filter(function (i) { return i.cart_id === cart.id; }).length,
        cart_subtotal: 0,
        success: false,
        message: 'Product not found.'
      };
    }

    let existing = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id && cartItems[i].product_id === productId) {
        existing = cartItems[i];
        break;
      }
    }

    const unitPrice = product.price;
    if (existing) {
      existing.quantity += qty;
      existing.unit_price = unitPrice;
      existing.total_price = Math.round(existing.quantity * unitPrice * 100) / 100;
    } else {
      existing = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: unitPrice,
        total_price: Math.round(qty * unitPrice * 100) / 100,
        added_at: this._nowISO()
      };
      cartItems.push(existing);
    }

    cart.updated_at = this._nowISO();
    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        break;
      }
    }
    this._saveToStorage('carts', carts);

    const totals = this._calculateCartTotalsAndFreeShippingEligibility(cart, cartItems);

    const cartItemCount = cartItems.filter(function (i) { return i.cart_id === cart.id; }).length;

    return {
      cart_id: cart.id,
      cart_item_id: existing.id,
      cart_item_count: cartItemCount,
      cart_subtotal: totals.subtotal,
      success: true,
      message: 'Product added to cart.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(function (i) { return i.cart_id === cart.id; });
    const products = this._getFromStorage('products');

    const totals = this._calculateCartTotalsAndFreeShippingEligibility(cart, cartItems);

    const items = cartItems.map(function (i) {
      const p = products.find(function (prod) { return prod.id === i.product_id; }) || null;
      return {
        cart_item_id: i.id,
        product_id: i.product_id,
        title: p ? p.title : '',
        format: p ? p.format : '',
        type: p ? p.type : '',
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        is_free: p ? p.is_free : false,
        is_physical_shippable: p ? p.is_physical_shippable : false,
        product: p
      };
    });

    return {
      cart_id: cart.id,
      status: cart.status,
      items: items,
      subtotal: totals.subtotal,
      has_physical_items: totals.has_physical_items,
      eligible_for_free_shipping: totals.eligible_for_free_shipping,
      free_shipping_min_order_total: totals.free_shipping_min_order_total,
      applied_shipping_option: totals.applied_shipping_option
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const carts = this._getFromStorage('carts');
    let cartId = null;

    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        cartId = cartItems[i].cart_id;
        if (quantity <= 0) {
          cartItems.splice(i, 1);
        } else {
          cartItems[i].quantity = quantity;
          cartItems[i].total_price = Math.round(cartItems[i].unit_price * quantity * 100) / 100;
        }
        break;
      }
    }

    this._saveToStorage('cart_items', cartItems);

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cartId) {
        carts[i].updated_at = this._nowISO();
        cart = carts[i];
        break;
      }
    }
    if (cart) {
      this._saveToStorage('carts', carts);
    }

    if (!cart) {
      return { cart: null, success: false };
    }

    const relatedItems = cartItems.filter(function (i) { return i.cart_id === cart.id; });
    const totals = this._calculateCartTotalsAndFreeShippingEligibility(cart, relatedItems);

    const enrichedItems = relatedItems.map(function (i) {
      const p = products.find(function (prod) { return prod.id === i.product_id; }) || null;
      return Object.assign({}, i, { product: p });
    });

    return {
      cart: {
        cart_id: cart.id,
        items: enrichedItems,
        subtotal: totals.subtotal,
        eligible_for_free_shipping: totals.eligible_for_free_shipping
      },
      success: true
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const carts = this._getFromStorage('carts');
    let cartId = null;

    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        cartId = cartItems[i].cart_id;
        cartItems.splice(i, 1);
        break;
      }
    }

    this._saveToStorage('cart_items', cartItems);

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cartId) {
        carts[i].updated_at = this._nowISO();
        cart = carts[i];
        break;
      }
    }
    if (cart) {
      this._saveToStorage('carts', carts);
    }

    if (!cart) {
      return { cart: null, success: false };
    }

    const relatedItems = cartItems.filter(function (i) { return i.cart_id === cart.id; });
    const totals = this._calculateCartTotalsAndFreeShippingEligibility(cart, relatedItems);

    const enrichedItems = relatedItems.map(function (i) {
      const p = products.find(function (prod) { return prod.id === i.product_id; }) || null;
      return Object.assign({}, i, { product: p });
    });

    return {
      cart: {
        cart_id: cart.id,
        items: enrichedItems,
        subtotal: totals.subtotal,
        eligible_for_free_shipping: totals.eligible_for_free_shipping
      },
      success: true
    };
  }

  // getAvailableShippingOptionsForCart()
  getAvailableShippingOptionsForCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(function (i) { return i.cart_id === cart.id; });
    const shippingOptions = this._getFromStorage('shipping_options');

    let subtotal = 0;
    for (let i = 0; i < cartItems.length; i++) {
      subtotal += cartItems[i].total_price || 0;
    }

    const options = shippingOptions.filter(function (o) { return o.is_active; }).map(function (o) {
      let isEligibleForFree = false;
      if (o.code === 'free_shipping' || o.is_free) {
        if (typeof o.min_order_total_for_free === 'number') {
          isEligibleForFree = subtotal >= o.min_order_total_for_free;
        } else {
          isEligibleForFree = true;
        }
      }
      const cost = isEligibleForFree ? 0 : (o.cost || 0);
      return {
        shipping_option_id: o.id,
        code: o.code,
        name: o.name,
        description: o.description || '',
        cost: cost,
        is_free: cost === 0,
        is_eligible_for_free: isEligibleForFree,
        estimated_days_min: typeof o.estimated_days_min === 'number' ? o.estimated_days_min : null,
        estimated_days_max: typeof o.estimated_days_max === 'number' ? o.estimated_days_max : null
      };
    });

    return { options: options };
  }

  // setCartShippingOption(shippingOptionId)
  setCartShippingOption(shippingOptionId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(function (i) { return i.cart_id === cart.id; });
    const shippingOptions = this._getFromStorage('shipping_options');
    const option = shippingOptions.find(function (o) { return o.id === shippingOptionId; }) || null;
    if (!option) {
      return {
        cart_id: cart.id,
        shipping_option: null,
        subtotal: 0,
        shipping_cost: 0,
        total: 0,
        success: false
      };
    }

    // persist selection on cart
    const carts = this._getFromStorage('carts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].shipping_option_id = shippingOptionId;
        carts[i].updated_at = this._nowISO();
        break;
      }
    }
    this._saveToStorage('carts', carts);

    const totals = this._calculateCartTotalsAndFreeShippingEligibility(cart, cartItems);

    const shippingOption = {
      id: option.id,
      code: option.code,
      name: option.name,
      description: option.description || '',
      cost: totals.applied_shipping_option ? totals.applied_shipping_option.cost : (option.cost || 0),
      is_free: totals.applied_shipping_option ? totals.applied_shipping_option.is_free : option.is_free,
      is_active: option.is_active,
      min_order_total_for_free: typeof option.min_order_total_for_free === 'number' ? option.min_order_total_for_free : null,
      estimated_days_min: typeof option.estimated_days_min === 'number' ? option.estimated_days_min : null,
      estimated_days_max: typeof option.estimated_days_max === 'number' ? option.estimated_days_max : null
    };

    return {
      cart_id: cart.id,
      shipping_option: shippingOption,
      subtotal: totals.subtotal,
      shipping_cost: totals.shipping_cost,
      total: totals.total,
      success: true
    };
  }

  // placeOrderForCurrentCart(shippingFullName, shippingAddressLine1, shippingAddressLine2, shippingCity, shippingState, shippingPostalCode, shippingCountry, email, phone, paymentMethod, cardNumber, cardExpMonth, cardExpYear, cardCvv, billingZip)
  placeOrderForCurrentCart(shippingFullName, shippingAddressLine1, shippingAddressLine2, shippingCity, shippingState, shippingPostalCode, shippingCountry, email, phone, paymentMethod, cardNumber, cardExpMonth, cardExpYear, cardCvv, billingZip) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items').filter(function (i) { return i.cart_id === cart.id; });
    if (cartItems.length === 0) {
      return { order: null, order_items: [], success: false, message: 'Cart is empty.' };
    }

    const validation = this._validatePaymentDetails(paymentMethod, cardNumber, cardExpMonth, cardExpYear, cardCvv);
    if (!validation.valid) {
      return { order: null, order_items: [], success: false, message: validation.message };
    }

    const products = this._getFromStorage('products');
    const shippingOptions = this._getFromStorage('shipping_options');
    const carts = this._getFromStorage('carts');

    const totals = this._calculateCartTotalsAndFreeShippingEligibility(cart, cartItems);

    // Determine shipping option
    let shippingOption = null;
    if (cart.shipping_option_id) {
      shippingOption = shippingOptions.find(function (o) { return o.id === cart.shipping_option_id; }) || null;
    }
    if (!shippingOption && shippingOptions.length > 0) {
      shippingOption = shippingOptions[0];
    }
    if (!shippingOption) {
      shippingOption = {
        id: this._generateId('shipopt'),
        code: 'standard_shipping',
        name: 'Standard Shipping',
        description: '',
        cost: 0,
        is_free: true,
        min_order_total_for_free: null,
        estimated_days_min: null,
        estimated_days_max: null,
        is_active: true
      };
    }

    const shippingCost = totals.shipping_cost;
    const orderSubtotal = totals.subtotal;
    const tax = 0;
    const total = Math.round((orderSubtotal + shippingCost + tax) * 100) / 100;

    let orders = this._getFromStorage('orders');
    let orderItems = this._getFromStorage('order_items');

    const now = this._nowISO();
    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

    const order = {
      id: orderId,
      order_number: orderNumber,
      cart_id: cart.id,
      created_at: now,
      status: 'paid',
      subtotal: orderSubtotal,
      shipping_cost: shippingCost,
      tax: tax,
      total: total,
      shipping_option_id: shippingOption.id,
      shipping_full_name: shippingFullName,
      shipping_address_line1: shippingAddressLine1,
      shipping_address_line2: shippingAddressLine2 || '',
      shipping_city: shippingCity,
      shipping_state: shippingState || '',
      shipping_postal_code: shippingPostalCode,
      shipping_country: shippingCountry,
      email: email,
      phone: phone || '',
      payment_method: paymentMethod,
      payment_status: 'succeeded'
    };

    const createdOrderItems = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      const orderItem = {
        id: this._generateId('orderitem'),
        order_id: orderId,
        product_id: ci.product_id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price
      };
      orderItems.push(orderItem);
      createdOrderItems.push(orderItem);

      // decrement stock if defined
      const prod = products.find(function (p) { return p.id === ci.product_id; });
      if (prod && typeof prod.stock_quantity === 'number') {
        prod.stock_quantity = Math.max(prod.stock_quantity - ci.quantity, 0);
      }
    }

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('products', products);

    // mark cart as checked_out
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].status = 'checked_out';
        carts[i].updated_at = now;
        break;
      }
    }
    this._saveToStorage('carts', carts);

    return {
      order: order,
      order_items: createdOrderItems,
      success: true,
      message: 'Order placed successfully.'
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
