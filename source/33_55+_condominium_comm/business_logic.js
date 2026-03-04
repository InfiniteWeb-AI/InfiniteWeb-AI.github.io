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
    const tableKeys = [
      'floor_plans',
      'floor_plan_info_requests',
      'cost_estimates',
      'email_requests',
      'events',
      'visit_itineraries',
      'itinerary_items',
      'buildings',
      'amenities',
      'building_amenities',
      'tour_requests',
      'policy_categories',
      'policy_documents',
      'pet_policy_rules',
      'hoa_contact_requests',
      'guest_suites',
      'suite_accessibility_options',
      'guest_suite_accessibilities',
      'guest_suite_booking_requests',
      'places',
      'favorite_lists',
      'favorite_places',
      'moving_task_templates',
      'move_checklists',
      'move_checklist_items',
      'service_features',
      'service_packages',
      'service_package_features',
      'service_plan_applications'
    ];

    for (let i = 0; i < tableKeys.length; i++) {
      const key = tableKeys[i];
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Optional singleton content containers
    if (localStorage.getItem('home_page_content') === null) {
      localStorage.setItem('home_page_content', JSON.stringify({}));
    }
    if (localStorage.getItem('moving_resources_content') === null) {
      localStorage.setItem('moving_resources_content', JSON.stringify({}));
    }
    if (localStorage.getItem('about_community_content') === null) {
      localStorage.setItem('about_community_content', JSON.stringify({}));
    }

    if (localStorage.getItem('idCounter') === null) {
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

  _getSingletonFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  _saveSingletonToStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj || {}));
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

  _paginate(arr, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : arr.length;
    const start = (p - 1) * ps;
    return arr.slice(start, start + ps);
  }

  _sortBy(arr, key, direction) {
    const dir = direction === 'desc' ? -1 : 1;
    const copy = arr.slice();
    copy.sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va === vb) return 0;
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb) * dir;
      }
      return (va < vb ? -1 : 1) * dir;
    });
    return copy;
  }

  // =========================
  // Helper functions (private)
  // =========================

  _getOrCreateVisitItinerary() {
    const now = new Date().toISOString();
    let itineraries = this._getFromStorage('visit_itineraries');
    let itinerary = itineraries[0] || null;
    if (!itinerary) {
      itinerary = {
        id: this._generateId('itinerary'),
        name: 'My Visit Itinerary',
        created_at: now,
        updated_at: now
      };
      itineraries.push(itinerary);
      this._saveToStorage('visit_itineraries', itineraries);
    }
    return itinerary;
  }

  _getOrCreateFavoriteList() {
    const now = new Date().toISOString();
    let lists = this._getFromStorage('favorite_lists');
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('favorites'),
        name: 'Saved Places',
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('favorite_lists', lists);
    }
    return list;
  }

  _getOrCreateMoveChecklistForTimeline(timeline_option, move_date) {
    const now = new Date().toISOString();
    let checklists = this._getFromStorage('move_checklists');
    let checklist = null;
    for (let i = 0; i < checklists.length; i++) {
      if (checklists[i].timeline_option === timeline_option) {
        checklist = checklists[i];
        break;
      }
    }
    let created_new = false;
    if (!checklist) {
      checklist = {
        id: this._generateId('movechecklist'),
        timeline_option: timeline_option,
        move_date: move_date ? new Date(move_date).toISOString() : null,
        created_at: now,
        updated_at: now
      };
      checklists.push(checklist);
      created_new = true;
    } else {
      if (move_date) {
        checklist.move_date = new Date(move_date).toISOString();
      }
      checklist.updated_at = now;
    }
    this._saveToStorage('move_checklists', checklists);
    return { checklist: checklist, created_new: created_new };
  }

  _calculateMortgagePrincipalAndInterest(price, down_payment_amount, interest_rate_percent, loan_term_years) {
    const loanAmount = Math.max(0, (price || 0) - (down_payment_amount || 0));
    const years = loan_term_years || 0;
    if (loanAmount <= 0 || years <= 0) {
      return 0;
    }
    const monthlyRate = (interest_rate_percent || 0) / 100 / 12;
    const n = years * 12;
    if (monthlyRate <= 0) {
      return loanAmount / n;
    }
    const pow = Math.pow(1 + monthlyRate, n);
    return loanAmount * (monthlyRate * pow) / (pow - 1);
  }

  _computeNightsBetweenDates(check_in_date, check_out_date) {
    const inDate = new Date(check_in_date);
    const outDate = new Date(check_out_date);
    const diffMs = outDate.getTime() - inDate.getTime();
    if (!isFinite(diffMs) || diffMs <= 0) {
      return 0;
    }
    const nights = diffMs / (1000 * 60 * 60 * 24);
    return Math.round(nights);
  }

  _applyEventTimeOfDayFilter(events, time_of_day_filter) {
    if (!time_of_day_filter || time_of_day_filter === 'all_day') {
      return events;
    }
    return events.filter(ev => {
      if (ev.is_all_day) {
        // All-day events pass any time-of-day filter
        return true;
      }
      const d = new Date(ev.start_datetime);
      if (!(d instanceof Date) || isNaN(d.getTime())) return false;
      const hour = d.getHours();
      if (time_of_day_filter === 'before_12pm') {
        return hour < 12;
      }
      if (time_of_day_filter === '12pm_to_4pm') {
        return hour >= 12 && hour < 16;
      }
      if (time_of_day_filter === '4pm_and_later') {
        return hour >= 16;
      }
      return true;
    });
  }

  _filterBuildingsByAmenitiesAndFloors(buildings, required_amenity_codes, min_floors, max_floors) {
    const amenities = this._getFromStorage('amenities');
    const buildingAmenities = this._getFromStorage('building_amenities');

    // Map amenity_code -> amenity_id
    const codeToId = {};
    for (let i = 0; i < amenities.length; i++) {
      const a = amenities[i];
      codeToId[a.amenity_code] = a.id;
    }

    const requiredAmenityIds = [];
    if (required_amenity_codes && required_amenity_codes.length) {
      for (let i = 0; i < required_amenity_codes.length; i++) {
        const code = required_amenity_codes[i];
        if (codeToId[code]) {
          requiredAmenityIds.push(codeToId[code]);
        }
      }
    }

    const result = [];
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const floors = b.number_of_floors || 0;
      if (typeof min_floors === 'number' && floors < min_floors) continue;
      if (typeof max_floors === 'number' && floors > max_floors) continue;

      if (requiredAmenityIds.length) {
        const bAmenityIds = [];
        for (let j = 0; j < buildingAmenities.length; j++) {
          const ba = buildingAmenities[j];
          if (ba.building_id === b.id) {
            bAmenityIds.push(ba.amenity_id);
          }
        }
        let hasAll = true;
        for (let k = 0; k < requiredAmenityIds.length; k++) {
          if (bAmenityIds.indexOf(requiredAmenityIds[k]) === -1) {
            hasAll = false;
            break;
          }
        }
        if (!hasAll) continue;
      }

      result.push(b);
    }
    return result;
  }

  _sendTransactionalEmail(context_type, context_id, to_email, subject, body) {
    const allowedTypes = ['cost_estimate', 'moving_checklist', 'visit_itinerary', 'other'];
    const type = allowedTypes.indexOf(context_type) !== -1 ? context_type : 'other';
    const emailRequests = this._getFromStorage('email_requests');
    const email_request = {
      id: this._generateId('email'),
      to_email: to_email,
      subject: subject || '',
      body: body || '',
      context_type: type,
      context_id: context_id || null,
      created_at: new Date().toISOString()
    };
    emailRequests.push(email_request);
    this._saveToStorage('email_requests', emailRequests);
    return {
      success: true,
      email_request: email_request,
      message: 'Email request has been queued.'
    };
  }

  // =========================
  // Core interface implementations
  // =========================

  // --- Homepage content ---
  getHomePageContent() {
    const stored = this._getSingletonFromStorage('home_page_content') || {};
    return {
      hero_title: stored.hero_title || '',
      hero_subtitle: stored.hero_subtitle || '',
      lifestyle_highlights: Array.isArray(stored.lifestyle_highlights) ? stored.lifestyle_highlights : [],
      cta_sections: Array.isArray(stored.cta_sections) ? stored.cta_sections : []
    };
  }

  // --- Floor Plans & Pricing ---
  getFloorPlanFilterOptions() {
    const floorPlans = this._getFromStorage('floor_plans').filter(fp => fp.is_active !== false);
    let minSq = null, maxSq = null, minPrice = null, maxPrice = null;
    for (let i = 0; i < floorPlans.length; i++) {
      const fp = floorPlans[i];
      if (typeof fp.square_footage === 'number') {
        if (minSq === null || fp.square_footage < minSq) minSq = fp.square_footage;
        if (maxSq === null || fp.square_footage > maxSq) maxSq = fp.square_footage;
      }
      if (typeof fp.base_price === 'number') {
        if (minPrice === null || fp.base_price < minPrice) minPrice = fp.base_price;
        if (maxPrice === null || fp.base_price > maxPrice) maxPrice = fp.base_price;
      }
    }

    const bedroomSet = {};
    const bathroomSet = {};
    for (let i = 0; i < floorPlans.length; i++) {
      const fp = floorPlans[i];
      bedroomSet[fp.bedrooms] = true;
      bathroomSet[fp.bathrooms] = true;
    }
    const bedroom_options = Object.keys(bedroomSet).sort((a, b) => a - b).map(v => ({ value: Number(v), label: v + ' Bedroom' + (v === '1' ? '' : 's') }));
    const bathroom_options = Object.keys(bathroomSet).sort((a, b) => a - b).map(v => ({ value: Number(v), label: v + ' Bathroom' + (v === '1' ? '' : 's') }));

    return {
      bedroom_options: bedroom_options,
      bathroom_options: bathroom_options,
      square_footage_range: { min: minSq, max: maxSq },
      price_range: { min: minPrice, max: maxPrice },
      sort_options: [
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'square_footage_asc', label: 'Square Footage: Small to Large' },
        { value: 'square_footage_desc', label: 'Square Footage: Large to Small' },
        { value: 'name_asc', label: 'Name: A to Z' },
        { value: 'name_desc', label: 'Name: Z to A' }
      ]
    };
  }

  searchFloorPlans(bedrooms, bathrooms, min_square_footage, max_square_footage, min_price, max_price, sort_by, sort_direction, page, page_size) {
    let floorPlans = this._getFromStorage('floor_plans').filter(fp => fp.is_active !== false);

    if (typeof bedrooms === 'number') {
      floorPlans = floorPlans.filter(fp => fp.bedrooms === bedrooms);
    }
    if (typeof bathrooms === 'number') {
      floorPlans = floorPlans.filter(fp => fp.bathrooms === bathrooms);
    }
    if (typeof min_square_footage === 'number') {
      floorPlans = floorPlans.filter(fp => typeof fp.square_footage === 'number' && fp.square_footage >= min_square_footage);
    }
    if (typeof max_square_footage === 'number') {
      floorPlans = floorPlans.filter(fp => typeof fp.square_footage === 'number' && fp.square_footage <= max_square_footage);
    }
    if (typeof min_price === 'number') {
      floorPlans = floorPlans.filter(fp => typeof fp.base_price === 'number' && fp.base_price >= min_price);
    }
    if (typeof max_price === 'number') {
      floorPlans = floorPlans.filter(fp => typeof fp.base_price === 'number' && fp.base_price <= max_price);
    }

    let sorted = floorPlans.slice();
    if (sort_by === 'price') {
      sorted = this._sortBy(sorted, 'base_price', sort_direction || 'asc');
    } else if (sort_by === 'square_footage') {
      sorted = this._sortBy(sorted, 'square_footage', sort_direction || 'asc');
    } else if (sort_by === 'name') {
      sorted = this._sortBy(sorted, 'name', sort_direction || 'asc');
    } else {
      sorted = this._sortBy(sorted, 'name', 'asc');
    }

    const total_count = sorted.length;
    const paged = this._paginate(sorted, page || 1, page_size || 20);

    return {
      results: paged,
      total_count: total_count,
      applied_filters: {
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        min_square_footage: min_square_footage,
        max_square_footage: max_square_footage,
        min_price: min_price,
        max_price: max_price,
        sort_by: sort_by,
        sort_direction: sort_direction
      }
    };
  }

  getFloorPlanDetails(floor_plan_id) {
    const plans = this._getFromStorage('floor_plans');
    const floor_plan = plans.find(fp => fp.id === floor_plan_id) || null;
    return {
      floor_plan: floor_plan,
      gallery_images: floor_plan && floor_plan.image_url ? [floor_plan.image_url] : [],
      features: [],
      starting_price_note: floor_plan && typeof floor_plan.base_price === 'number' ? 'Prices starting from $' + floor_plan.base_price : ''
    };
  }

  submitFloorPlanInfoRequest(floor_plan_id, name, email, phone, preferred_contact_method, message) {
    const now = new Date().toISOString();
    const floorPlans = this._getFromStorage('floor_plans');
    const floor_plan = floorPlans.find(fp => fp.id === floor_plan_id) || null;
    if (!floor_plan) {
      return { success: false, info_request: null, confirmation_message: 'Floor plan not found.' };
    }
    const allowedMethods = ['phone_call', 'email', 'text_message'];
    const method = allowedMethods.indexOf(preferred_contact_method) !== -1 ? preferred_contact_method : 'email';
    const requests = this._getFromStorage('floor_plan_info_requests');
    const info_request = {
      id: this._generateId('fpir'),
      floor_plan_id: floor_plan_id,
      name: name,
      email: email,
      phone: phone,
      preferred_contact_method: method,
      message: message,
      created_at: now
    };
    requests.push(info_request);
    this._saveToStorage('floor_plan_info_requests', requests);
    return {
      success: true,
      info_request: info_request,
      confirmation_message: 'Your request for information has been submitted.'
    };
  }

  calculateMonthlyCostEstimate(floor_plan_id, down_payment_amount, interest_rate_percent, loan_term_years, hoa_dues_per_month, utilities_per_month) {
    const now = new Date().toISOString();
    const plans = this._getFromStorage('floor_plans');
    const floor_plan = plans.find(fp => fp.id === floor_plan_id) || null;
    if (!floor_plan) {
      return { success: false, cost_estimate: null, message: 'Floor plan not found.' };
    }
    const pi = this._calculateMortgagePrincipalAndInterest(floor_plan.base_price, down_payment_amount, interest_rate_percent, loan_term_years);
    const hoa = hoa_dues_per_month || 0;
    const util = utilities_per_month || 0;
    const total = pi + hoa + util;

    const estimates = this._getFromStorage('cost_estimates');
    const cost_estimate = {
      id: this._generateId('estimate'),
      floor_plan_id: floor_plan_id,
      down_payment_amount: down_payment_amount,
      interest_rate_percent: interest_rate_percent,
      loan_term_years: loan_term_years,
      hoa_dues_per_month: hoa_dues_per_month,
      utilities_per_month: utilities_per_month,
      estimated_monthly_principal_interest: pi,
      estimated_monthly_total: total,
      created_at: now
    };
    estimates.push(cost_estimate);
    this._saveToStorage('cost_estimates', estimates);

    return {
      success: true,
      cost_estimate: cost_estimate,
      message: 'Monthly cost estimate calculated.'
    };
  }

  emailCostEstimate(cost_estimate_id, to_email, subject, message_body) {
    const estimates = this._getFromStorage('cost_estimates');
    const estimate = estimates.find(e => e.id === cost_estimate_id) || null;
    if (!estimate) {
      return { success: false, email_request: null, message: 'Cost estimate not found.' };
    }
    const floorPlans = this._getFromStorage('floor_plans');
    const plan = floorPlans.find(fp => fp.id === estimate.floor_plan_id) || null;
    let body = '';
    if (message_body) {
      body += message_body + '\n\n';
    }
    body += 'Monthly Cost Estimate:' + '\n';
    if (plan) {
      body += 'Floor Plan: ' + plan.name + '\n';
    }
    body += 'Down Payment: ' + estimate.down_payment_amount + '\n';
    body += 'Interest Rate (%): ' + estimate.interest_rate_percent + '\n';
    body += 'Loan Term (years): ' + estimate.loan_term_years + '\n';
    body += 'HOA Dues / month: ' + estimate.hoa_dues_per_month + '\n';
    body += 'Utilities / month: ' + estimate.utilities_per_month + '\n';
    body += 'Principal & Interest / month: ' + estimate.estimated_monthly_principal_interest + '\n';
    body += 'Total Estimated Monthly Cost: ' + estimate.estimated_monthly_total + '\n';

    const result = this._sendTransactionalEmail('cost_estimate', cost_estimate_id, to_email, subject || 'Your Monthly Cost Estimate', body);
    return {
      success: result.success,
      email_request: result.email_request,
      message: result.message
    };
  }

  // --- Events & Activities ---
  getEventFilterOptions() {
    const events = this._getFromStorage('events');
    const categorySet = {};
    for (let i = 0; i < events.length; i++) {
      categorySet[events[i].category] = true;
    }
    const category_options = Object.keys(categorySet).sort().map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

    const yearsSet = {};
    for (let i = 0; i < events.length; i++) {
      const d = new Date(events[i].start_datetime);
      if (d instanceof Date && !isNaN(d.getTime())) {
        yearsSet[d.getFullYear()] = true;
      }
    }
    const available_years = Object.keys(yearsSet).map(y => Number(y)).sort((a, b) => a - b);

    const time_of_day_options = [
      { value: 'all_day', label: 'All Day' },
      { value: 'before_12pm', label: 'Before 12:00 PM' },
      { value: '12pm_to_4pm', label: '12:00 PM to 4:00 PM' },
      { value: '4pm_and_later', label: '4:00 PM and later' }
    ];

    return {
      category_options: category_options,
      time_of_day_options: time_of_day_options,
      available_years: available_years
    };
  }

  searchEvents(month, year, category, time_of_day_filter, sort_by, sort_direction, page, page_size) {
    let events = this._getFromStorage('events');

    if (typeof month === 'number' || typeof year === 'number') {
      events = events.filter(ev => {
        const d = new Date(ev.start_datetime);
        if (!(d instanceof Date) || isNaN(d.getTime())) return false;
        const evMonth = d.getMonth() + 1;
        const evYear = d.getFullYear();
        if (typeof month === 'number' && evMonth !== month) return false;
        if (typeof year === 'number' && evYear !== year) return false;
        return true;
      });
    }

    if (category) {
      events = events.filter(ev => ev.category === category);
    }

    events = this._applyEventTimeOfDayFilter(events, time_of_day_filter);

    const sortField = sort_by || 'start_datetime';
    const direction = sort_direction || 'asc';
    events = this._sortBy(events, sortField, direction);

    const total_count = events.length;
    const paged = this._paginate(events, page || 1, page_size || 50);

    return {
      results: paged,
      total_count: total_count,
      applied_filters: {
        month: month,
        year: year,
        category: category,
        time_of_day_filter: time_of_day_filter
      }
    };
  }

  addEventToVisitItinerary(event_id) {
    const events = this._getFromStorage('events');
    const event = events.find(ev => ev.id === event_id) || null;
    if (!event) {
      return { success: false, itinerary_item: null, itinerary_summary: null };
    }
    const itinerary = this._getOrCreateVisitItinerary();
    const now = new Date().toISOString();

    let items = this._getFromStorage('itinerary_items');
    const itinerary_item = {
      id: this._generateId('itineraryitem'),
      itinerary_id: itinerary.id,
      event_id: event_id,
      added_at: now,
      notes: ''
    };
    items.push(itinerary_item);
    this._saveToStorage('itinerary_items', items);

    // Update itinerary updated_at
    let itineraries = this._getFromStorage('visit_itineraries');
    for (let i = 0; i < itineraries.length; i++) {
      if (itineraries[i].id === itinerary.id) {
        itineraries[i].updated_at = now;
        break;
      }
    }
    this._saveToStorage('visit_itineraries', itineraries);

    const total_items = items.filter(ii => ii.itinerary_id === itinerary.id).length;

    return {
      success: true,
      itinerary_item: itinerary_item,
      itinerary_summary: {
        itinerary_id: itinerary.id,
        total_items: total_items
      }
    };
  }

  getVisitItinerary() {
    const itinerary = this._getOrCreateVisitItinerary();
    const events = this._getFromStorage('events');
    const itemsAll = this._getFromStorage('itinerary_items');
    const relatedItems = itemsAll.filter(ii => ii.itinerary_id === itinerary.id);

    const items = relatedItems.map(ii => {
      const ev = events.find(e => e.id === ii.event_id) || null;
      return {
        itinerary_item: ii,
        event: ev
      };
    });

    return {
      itinerary: itinerary,
      items: items
    };
  }

  updateItineraryItemNotes(itinerary_item_id, notes) {
    let items = this._getFromStorage('itinerary_items');
    let updated = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === itinerary_item_id) {
        items[i].notes = notes || '';
        updated = items[i];
        break;
      }
    }
    if (!updated) {
      return { success: false, itinerary_item: null };
    }
    this._saveToStorage('itinerary_items', items);
    return { success: true, itinerary_item: updated };
  }

  removeItineraryItem(itinerary_item_id) {
    let items = this._getFromStorage('itinerary_items');
    const before = items.length;
    items = items.filter(ii => ii.id !== itinerary_item_id);
    const after = items.length;
    this._saveToStorage('itinerary_items', items);
    return { success: after < before };
  }

  emailVisitItinerary(to_email, subject, message_body) {
    const data = this.getVisitItinerary();
    const itinerary = data.itinerary;
    const items = data.items;

    if (!itinerary) {
      return { success: false, email_request: null };
    }

    let body = '';
    if (message_body) {
      body += message_body + '\n\n';
    }
    body += 'My Visit Itinerary:\n';
    for (let i = 0; i < items.length; i++) {
      const ii = items[i].itinerary_item;
      const ev = items[i].event;
      if (!ev) continue;
      body += '- ' + ev.title + ' on ' + ev.start_datetime + '\n';
      if (ii.notes) {
        body += '  Notes: ' + ii.notes + '\n';
      }
    }

    const result = this._sendTransactionalEmail('visit_itinerary', itinerary.id, to_email, subject || 'My Visit Itinerary', body);
    return { success: result.success, email_request: result.email_request };
  }

  // --- Community & Buildings ---
  getBuildingFilterOptions() {
    const amenities = this._getFromStorage('amenities');
    const buildings = this._getFromStorage('buildings');

    let minFloors = null;
    let maxFloors = null;
    for (let i = 0; i < buildings.length; i++) {
      const f = buildings[i].number_of_floors;
      if (typeof f === 'number') {
        if (minFloors === null || f < minFloors) minFloors = f;
        if (maxFloors === null || f > maxFloors) maxFloors = f;
      }
    }

    const sort_options = [
      { value: 'name_asc', label: 'Name: A to Z' },
      { value: 'name_desc', label: 'Name: Z to A' },
      { value: 'floors_asc', label: 'Floors: Fewest to Most' },
      { value: 'floors_desc', label: 'Floors: Most to Fewest' }
    ];

    return {
      amenity_options: amenities,
      floor_count_range: { min: minFloors, max: maxFloors },
      sort_options: sort_options
    };
  }

  searchBuildings(required_amenity_codes, min_floors, max_floors, sort_by, sort_direction, page, page_size) {
    const buildings = this._getFromStorage('buildings');
    let filtered = this._filterBuildingsByAmenitiesAndFloors(buildings, required_amenity_codes || [], min_floors, max_floors);

    let sorted = filtered.slice();
    if (sort_by === 'name') {
      sorted = this._sortBy(sorted, 'name', sort_direction || 'asc');
    } else if (sort_by === 'number_of_floors') {
      sorted = this._sortBy(sorted, 'number_of_floors', sort_direction || 'asc');
    } else {
      sorted = this._sortBy(sorted, 'name', 'asc');
    }

    const total_count = sorted.length;
    const paged = this._paginate(sorted, page || 1, page_size || 20);

    return {
      results: paged,
      total_count: total_count,
      applied_filters: {
        required_amenity_codes: required_amenity_codes || [],
        min_floors: min_floors,
        max_floors: max_floors
      }
    };
  }

  getBuildingDetails(building_id) {
    const buildings = this._getFromStorage('buildings');
    const building = buildings.find(b => b.id === building_id) || null;
    const amenities = this._getFromStorage('amenities');
    const buildingAmenities = this._getFromStorage('building_amenities');

    const amenityIds = [];
    for (let i = 0; i < buildingAmenities.length; i++) {
      const ba = buildingAmenities[i];
      if (ba.building_id === building_id) {
        amenityIds.push(ba.amenity_id);
      }
    }

    const buildingAmenityObjects = amenities.filter(a => amenityIds.indexOf(a.id) !== -1);
    const images = building && building.image_url ? [building.image_url] : [];

    return {
      building: building,
      amenities: buildingAmenityObjects,
      images: images
    };
  }

  submitTourRequest(building_id, tour_date, time_slot, tour_type, name, email, phone) {
    const buildings = this._getFromStorage('buildings');
    const building = buildings.find(b => b.id === building_id) || null;
    if (!building) {
      return { success: false, tour_request: null, confirmation_message: 'Building not found.' };
    }

    const now = new Date().toISOString();
    const tourRequests = this._getFromStorage('tour_requests');
    const tour_request = {
      id: this._generateId('tour'),
      building_id: building_id,
      tour_date: new Date(tour_date).toISOString(),
      time_slot: time_slot,
      tour_type: tour_type,
      name: name,
      email: email,
      phone: phone,
      status: 'submitted',
      created_at: now
    };
    tourRequests.push(tour_request);
    this._saveToStorage('tour_requests', tourRequests);

    return {
      success: true,
      tour_request: tour_request,
      confirmation_message: 'Your tour request has been submitted.'
    };
  }

  // --- Guest Suites ---
  getGuestSuiteFilterOptions() {
    const suites = this._getFromStorage('guest_suites');
    const accessibility_options = this._getFromStorage('suite_accessibility_options');

    const suite_type_options = [
      { value: 'studio_suite', label: 'Studio Suite' },
      { value: 'one_bedroom_suite', label: '1-Bedroom Suite' },
      { value: 'two_bedroom_suite', label: '2-Bedroom Suite' }
    ];

    let minRate = null;
    let maxRate = null;
    for (let i = 0; i < suites.length; i++) {
      const r = suites[i].nightly_rate;
      if (typeof r === 'number') {
        if (minRate === null || r < minRate) minRate = r;
        if (maxRate === null || r > maxRate) maxRate = r;
      }
    }

    return {
      suite_type_options: suite_type_options,
      accessibility_options: accessibility_options,
      price_range: { min: minRate, max: maxRate }
    };
  }

  searchGuestSuites(suite_type, accessibility_option_codes, min_nightly_rate, max_nightly_rate, sort_by, sort_direction, page, page_size) {
    const suites = this._getFromStorage('guest_suites');
    const options = this._getFromStorage('suite_accessibility_options');
    const suiteAccess = this._getFromStorage('guest_suite_accessibilities');

    // Map accessibility code -> id
    const codeToId = {};
    for (let i = 0; i < options.length; i++) {
      codeToId[options[i].code] = options[i].id;
    }

    const requiredOptionIds = [];
    if (accessibility_option_codes && accessibility_option_codes.length) {
      for (let i = 0; i < accessibility_option_codes.length; i++) {
        const code = accessibility_option_codes[i];
        if (codeToId[code]) {
          requiredOptionIds.push(codeToId[code]);
        }
      }
    }

    let filtered = suites.filter(s => true);

    if (suite_type) {
      filtered = filtered.filter(s => s.suite_type === suite_type);
    }
    if (typeof min_nightly_rate === 'number') {
      filtered = filtered.filter(s => typeof s.nightly_rate === 'number' && s.nightly_rate >= min_nightly_rate);
    }
    if (typeof max_nightly_rate === 'number') {
      filtered = filtered.filter(s => typeof s.nightly_rate === 'number' && s.nightly_rate <= max_nightly_rate);
    }

    if (requiredOptionIds.length) {
      const result = [];
      for (let i = 0; i < filtered.length; i++) {
        const suite = filtered[i];
        const saIds = [];
        for (let j = 0; j < suiteAccess.length; j++) {
          const sa = suiteAccess[j];
          if (sa.guest_suite_id === suite.id) {
            saIds.push(sa.accessibility_option_id);
          }
        }
        let hasAll = true;
        for (let k = 0; k < requiredOptionIds.length; k++) {
          if (saIds.indexOf(requiredOptionIds[k]) === -1) {
            hasAll = false;
            break;
          }
        }
        if (hasAll) {
          result.push(suite);
        }
      }
      filtered = result;
    }

    let sorted = filtered.slice();
    if (sort_by === 'nightly_rate') {
      sorted = this._sortBy(sorted, 'nightly_rate', sort_direction || 'asc');
    } else if (sort_by === 'name') {
      sorted = this._sortBy(sorted, 'name', sort_direction || 'asc');
    } else {
      sorted = this._sortBy(sorted, 'nightly_rate', 'asc');
    }

    const total_count = sorted.length;
    const paged = this._paginate(sorted, page || 1, page_size || 20);

    return {
      results: paged,
      total_count: total_count,
      applied_filters: {
        suite_type: suite_type,
        accessibility_option_codes: accessibility_option_codes || [],
        min_nightly_rate: min_nightly_rate,
        max_nightly_rate: max_nightly_rate
      }
    };
  }

  getGuestSuiteDetails(guest_suite_id) {
    const suites = this._getFromStorage('guest_suites');
    const suite = suites.find(s => s.id === guest_suite_id) || null;
    const options = this._getFromStorage('suite_accessibility_options');
    const suiteAccess = this._getFromStorage('guest_suite_accessibilities');

    const optionIds = [];
    for (let i = 0; i < suiteAccess.length; i++) {
      const sa = suiteAccess[i];
      if (sa.guest_suite_id === guest_suite_id) {
        optionIds.push(sa.accessibility_option_id);
      }
    }
    const accessibility_options = options.filter(o => optionIds.indexOf(o.id) !== -1);
    const images = suite && suite.image_url ? [suite.image_url] : [];

    const stay_policies = {
      min_nights: suite ? suite.min_nights || null : null,
      max_nights: suite ? suite.max_nights || null : null,
      other_notes: ''
    };

    return {
      guest_suite: suite,
      accessibility_options: accessibility_options,
      images: images,
      stay_policies: stay_policies
    };
  }

  submitGuestSuiteBookingRequest(guest_suite_id, check_in_date, check_out_date, name, email, phone, notes) {
    const suites = this._getFromStorage('guest_suites');
    const suite = suites.find(s => s.id === guest_suite_id) || null;
    if (!suite) {
      return { success: false, booking_request: null, message: 'Guest suite not found.' };
    }

    const nights = this._computeNightsBetweenDates(check_in_date, check_out_date);
    if (nights <= 0) {
      return { success: false, booking_request: null, message: 'Check-out date must be after check-in date.' };
    }

    const now = new Date().toISOString();
    const bookings = this._getFromStorage('guest_suite_booking_requests');
    const booking_request = {
      id: this._generateId('suitebooking'),
      guest_suite_id: guest_suite_id,
      check_in_datetime: new Date(check_in_date).toISOString(),
      check_out_datetime: new Date(check_out_date).toISOString(),
      nights: nights,
      name: name,
      email: email,
      phone: phone,
      notes: notes || '',
      status: 'submitted',
      created_at: now
    };
    bookings.push(booking_request);
    this._saveToStorage('guest_suite_booking_requests', bookings);

    return {
      success: true,
      booking_request: booking_request,
      message: 'Your guest suite booking request has been submitted.'
    };
  }

  // --- Neighborhood & Map ---
  getPlaceCategoryOptions() {
    const category_options = [
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'groceries', label: 'Groceries' },
      { value: 'dining', label: 'Dining' },
      { value: 'shopping', label: 'Shopping' },
      { value: 'parks', label: 'Parks' },
      { value: 'pharmacy', label: 'Pharmacy' },
      { value: 'other', label: 'Other' }
    ];
    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'distance_asc', label: 'Distance: Nearest First' },
      { value: 'name_asc', label: 'Name: A to Z' }
    ];
    return { category_options: category_options, sort_options: sort_options };
  }

  searchPlacesNearCommunity(category, place_types, max_distance_miles, sort_by, page, page_size) {
    let places = this._getFromStorage('places');

    if (category) {
      places = places.filter(p => p.category === category);
    }
    if (place_types && place_types.length) {
      places = places.filter(p => place_types.indexOf(p.place_type) !== -1);
    }
    if (typeof max_distance_miles === 'number') {
      places = places.filter(p => typeof p.distance_miles === 'number' && p.distance_miles <= max_distance_miles);
    }

    let sorted = places.slice();
    if (sort_by === 'distance_asc') {
      sorted = this._sortBy(sorted, 'distance_miles', 'asc');
    } else if (sort_by === 'name_asc') {
      sorted = this._sortBy(sorted, 'name', 'asc');
    } else {
      sorted = this._sortBy(sorted, 'rating', 'desc');
    }

    const total_count = sorted.length;
    const paged = this._paginate(sorted, page || 1, page_size || 50);

    // Map center: if any place has lat/long, we can use average; otherwise null
    let centerLat = null;
    let centerLng = null;
    let count = 0;
    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
        centerLat = (centerLat || 0) + p.latitude;
        centerLng = (centerLng || 0) + p.longitude;
        count++;
      }
    }
    if (count > 0) {
      centerLat = centerLat / count;
      centerLng = centerLng / count;
    }

    return {
      map_center: {
        latitude: centerLat,
        longitude: centerLng
      },
      places: paged,
      total_count: total_count,
      applied_filters: {
        category: category,
        place_types: place_types || [],
        max_distance_miles: max_distance_miles
      }
    };
  }

  savePlaceToFavorites(place_id) {
    const places = this._getFromStorage('places');
    const place = places.find(p => p.id === place_id) || null;
    if (!place) {
      return { success: false, favorite_place: null, favorites_count: 0 };
    }
    const list = this._getOrCreateFavoriteList();
    const now = new Date().toISOString();

    let favorites = this._getFromStorage('favorite_places');
    const favorite_place = {
      id: this._generateId('favplace'),
      favorite_list_id: list.id,
      place_id: place_id,
      added_at: now
    };
    favorites.push(favorite_place);
    this._saveToStorage('favorite_places', favorites);

    const favorites_count = favorites.filter(fp => fp.favorite_list_id === list.id).length;
    return { success: true, favorite_place: favorite_place, favorites_count: favorites_count };
  }

  getFavoritePlaces() {
    const favorite_list = this._getOrCreateFavoriteList();
    const favorites = this._getFromStorage('favorite_places');
    const places = this._getFromStorage('places');

    const related = favorites.filter(fp => fp.favorite_list_id === favorite_list.id);
    const items = related.map(fp => {
      const place = places.find(p => p.id === fp.place_id) || null;
      return {
        favorite_place: fp,
        place: place
      };
    });

    return {
      favorite_list: favorite_list,
      items: items
    };
  }

  removeFavoritePlace(favorite_place_id) {
    let favorites = this._getFromStorage('favorite_places');
    const before = favorites.length;
    favorites = favorites.filter(fp => fp.id !== favorite_place_id);
    const after = favorites.length;
    this._saveToStorage('favorite_places', favorites);
    return { success: after < before, remaining_count: after };
  }

  // --- Moving Resources & Checklist ---
  getMovingResourcesContent() {
    const stored = this._getSingletonFromStorage('moving_resources_content') || {};
    return {
      overview_html: stored.overview_html || '',
      timeline_summaries: Array.isArray(stored.timeline_summaries) ? stored.timeline_summaries : []
    };
  }

  createOrUpdateMoveChecklist(timeline_option, move_date) {
    const result = this._getOrCreateMoveChecklistForTimeline(timeline_option, move_date);
    return {
      checklist: result.checklist,
      created_new: result.created_new
    };
  }

  getMoveChecklist() {
    const checklists = this._getFromStorage('move_checklists');
    if (!checklists.length) {
      return { checklist: null, items: [] };
    }
    // Use most recently updated checklist
    const sorted = this._sortBy(checklists, 'updated_at', 'desc');
    const checklist = sorted[0];
    const itemsAll = this._getFromStorage('move_checklist_items');
    const templates = this._getFromStorage('moving_task_templates');

    const related = itemsAll.filter(it => it.checklist_id === checklist.id);
    const items = related.map(it => {
      const tmpl = templates.find(t => t.id === it.task_template_id) || null;
      return {
        item: it,
        task_template: tmpl
      };
    });

    return {
      checklist: checklist,
      items: items
    };
  }

  getMovingTaskTemplatesByTimeline(timeline_option) {
    // Currently, return all templates grouped by category; timeline_option could be used to filter in future.
    const templates = this._getFromStorage('moving_task_templates');
    const categoriesMap = {};
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      if (!categoriesMap[t.category]) {
        categoriesMap[t.category] = [];
      }
      categoriesMap[t.category].push(t);
    }
    const categoryLabels = {
      finances: 'Finances',
      packing: 'Packing',
      utilities: 'Utilities',
      address_changes: 'Address Changes',
      medical: 'Medical',
      documents: 'Documents',
      other: 'Other'
    };
    const categories = Object.keys(categoriesMap).map(code => ({
      category_code: code,
      category_label: categoryLabels[code] || code,
      tasks: categoriesMap[code]
    }));
    return { categories: categories };
  }

  updateMoveChecklistItems(checklist_id, items) {
    const now = new Date().toISOString();
    let checklistItems = this._getFromStorage('move_checklist_items');
    // Remove existing items for this checklist
    checklistItems = checklistItems.filter(ci => ci.checklist_id !== checklist_id);

    const newItems = [];
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const src = items[i];
        const dueIso = src.due_date ? new Date(src.due_date).toISOString() : new Date().toISOString();
        const item = {
          id: this._generateId('moveitem'),
          checklist_id: checklist_id,
          task_template_id: src.task_template_id,
          custom_title: src.custom_title || null,
          due_date: dueIso,
          is_completed: false,
          notes: src.notes || ''
        };
        newItems.push(item);
        checklistItems.push(item);
      }
    }
    this._saveToStorage('move_checklist_items', checklistItems);

    // Update checklist updated_at
    let checklists = this._getFromStorage('move_checklists');
    for (let i = 0; i < checklists.length; i++) {
      if (checklists[i].id === checklist_id) {
        checklists[i].updated_at = now;
        break;
      }
    }
    this._saveToStorage('move_checklists', checklists);

    return { success: true, checklist_items: newItems };
  }

  emailMoveChecklist(checklist_id, to_email, subject, message_body) {
    const checklists = this._getFromStorage('move_checklists');
    const checklist = checklists.find(c => c.id === checklist_id) || null;
    if (!checklist) {
      return { success: false, email_request: null };
    }
    const itemsAll = this._getFromStorage('move_checklist_items');
    const templates = this._getFromStorage('moving_task_templates');
    const related = itemsAll.filter(it => it.checklist_id === checklist.id);

    let body = '';
    if (message_body) {
      body += message_body + '\n\n';
    }
    body += 'Move-in Checklist (' + checklist.timeline_option + '):\n';
    for (let i = 0; i < related.length; i++) {
      const it = related[i];
      const tmpl = templates.find(t => t.id === it.task_template_id) || null;
      const title = it.custom_title || (tmpl ? tmpl.title : 'Task');
      body += '- ' + title + ' (Due: ' + it.due_date + ')\n';
      if (it.notes) {
        body += '  Notes: ' + it.notes + '\n';
      }
    }

    const result = this._sendTransactionalEmail('moving_checklist', checklist_id, to_email, subject || 'Move-in Checklist', body);
    return { success: result.success, email_request: result.email_request };
  }

  // --- Services & Care ---
  getServiceFeatureOptions() {
    const features = this._getFromStorage('service_features');
    return { features: features };
  }

  getServicePackagesList(included_feature_codes, min_monthly_price, max_monthly_price, sort_by, sort_direction, page, page_size) {
    const packages = this._getFromStorage('service_packages').filter(p => p.is_active !== false);
    const features = this._getFromStorage('service_features');
    const pkgFeatures = this._getFromStorage('service_package_features');

    // Map feature code -> id
    const codeToId = {};
    for (let i = 0; i < features.length; i++) {
      codeToId[features[i].code] = features[i].id;
    }

    const requiredFeatureIds = [];
    if (included_feature_codes && included_feature_codes.length) {
      for (let i = 0; i < included_feature_codes.length; i++) {
        const code = included_feature_codes[i];
        if (codeToId[code]) {
          requiredFeatureIds.push(codeToId[code]);
        }
      }
    }

    let filtered = packages.slice();
    if (requiredFeatureIds.length) {
      const result = [];
      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        const pfIds = [];
        for (let j = 0; j < pkgFeatures.length; j++) {
          const pf = pkgFeatures[j];
          if (pf.service_package_id === pkg.id) {
            pfIds.push(pf.service_feature_id);
          }
        }
        let hasAll = true;
        for (let k = 0; k < requiredFeatureIds.length; k++) {
          if (pfIds.indexOf(requiredFeatureIds[k]) === -1) {
            hasAll = false;
            break;
          }
        }
        if (hasAll) {
          result.push(pkg);
        }
      }
      filtered = result;
    }

    if (typeof min_monthly_price === 'number') {
      filtered = filtered.filter(p => typeof p.monthly_price === 'number' && p.monthly_price >= min_monthly_price);
    }
    if (typeof max_monthly_price === 'number') {
      filtered = filtered.filter(p => typeof p.monthly_price === 'number' && p.monthly_price <= max_monthly_price);
    }

    let sorted = filtered.slice();
    if (sort_by === 'monthly_price') {
      sorted = this._sortBy(sorted, 'monthly_price', sort_direction || 'asc');
    } else if (sort_by === 'name') {
      sorted = this._sortBy(sorted, 'name', sort_direction || 'asc');
    } else {
      sorted = this._sortBy(sorted, 'monthly_price', 'asc');
    }

    const total_count = sorted.length;
    const pagedPkgs = this._paginate(sorted, page || 1, page_size || 20);

    // Resolve included features for each package
    const results = pagedPkgs.map(pkg => {
      const pfIds = [];
      for (let j = 0; j < pkgFeatures.length; j++) {
        const pf = pkgFeatures[j];
        if (pf.service_package_id === pkg.id) {
          pfIds.push(pf.service_feature_id);
        }
      }
      const included_features = features.filter(f => pfIds.indexOf(f.id) !== -1);
      return {
        service_package: pkg,
        included_features: included_features
      };
    });

    return {
      results: results,
      total_count: total_count,
      applied_filters: {
        included_feature_codes: included_feature_codes || [],
        min_monthly_price: min_monthly_price,
        max_monthly_price: max_monthly_price
      }
    };
  }

  getServicePackageDetails(service_package_id) {
    const packages = this._getFromStorage('service_packages');
    const pkg = packages.find(p => p.id === service_package_id) || null;
    const features = this._getFromStorage('service_features');
    const pkgFeatures = this._getFromStorage('service_package_features');

    const pfIds = [];
    for (let i = 0; i < pkgFeatures.length; i++) {
      const pf = pkgFeatures[i];
      if (pf.service_package_id === service_package_id) {
        pfIds.push(pf.service_feature_id);
      }
    }
    const included_features = features.filter(f => pfIds.indexOf(f.id) !== -1);

    return {
      service_package: pkg,
      included_features: included_features,
      recommended_for: ''
    };
  }

  submitServicePlanApplication(service_package_id, full_name, email, phone, age, living_type) {
    const packages = this._getFromStorage('service_packages');
    const pkg = packages.find(p => p.id === service_package_id) || null;
    if (!pkg) {
      return { success: false, application: null, message: 'Service package not found.' };
    }

    const now = new Date().toISOString();
    const applications = this._getFromStorage('service_plan_applications');
    const application = {
      id: this._generateId('serviceapp'),
      service_package_id: service_package_id,
      full_name: full_name,
      email: email,
      phone: phone,
      age: typeof age === 'number' ? age : null,
      living_type: living_type || null,
      status: 'submitted',
      created_at: now,
      updated_at: now
    };
    applications.push(application);
    this._saveToStorage('service_plan_applications', applications);

    return {
      success: true,
      application: application,
      message: 'Your service plan application has been submitted.'
    };
  }

  // --- Policies & HOA Contact ---
  getPolicyCategories() {
    const categories = this._getFromStorage('policy_categories');
    return { categories: categories };
  }

  getPetPolicyDetails() {
    const categories = this._getFromStorage('policy_categories');
    const documents = this._getFromStorage('policy_documents');
    const rules = this._getFromStorage('pet_policy_rules');

    const petCategory = categories.find(c => c.code === 'pets') || null;
    let policy_document = null;
    if (petCategory) {
      policy_document = documents.find(d => d.category_id === petCategory.id) || null;
    }
    let relatedRules = [];
    if (policy_document) {
      relatedRules = rules.filter(r => r.policy_document_id === policy_document.id);
    }

    return {
      policy_document: policy_document,
      rules: relatedRules
    };
  }

  getHoaContactTopics() {
    const topics = [
      {
        value: 'pet_approval_request',
        label: 'Pet approval request',
        description: 'Request approval for pets under the community pet policy.'
      },
      {
        value: 'guest_suite_question',
        label: 'Guest suite question',
        description: 'Questions about guest suite availability or policies.'
      },
      {
        value: 'billing_question',
        label: 'Billing question',
        description: 'Questions about HOA dues or billing statements.'
      },
      {
        value: 'maintenance_request',
        label: 'Maintenance request',
        description: 'Submit a request for maintenance or repairs.'
      },
      {
        value: 'general_question',
        label: 'General question',
        description: 'Other questions about the community.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Other topics not listed.'
      }
    ];
    return { topics: topics };
  }

  submitHoaContactRequest(topic, name, email, phone, message, related_policy_category_code) {
    const allowedTopics = ['pet_approval_request', 'guest_suite_question', 'billing_question', 'maintenance_request', 'general_question', 'other'];
    const t = allowedTopics.indexOf(topic) !== -1 ? topic : 'other';

    const now = new Date().toISOString();
    const requests = this._getFromStorage('hoa_contact_requests');
    const hoa_contact_request = {
      id: this._generateId('hoacontact'),
      topic: t,
      name: name,
      email: email,
      phone: phone,
      message: message,
      related_policy_category_code: related_policy_category_code || null,
      created_at: now
    };
    requests.push(hoa_contact_request);
    this._saveToStorage('hoa_contact_requests', requests);

    return {
      success: true,
      hoa_contact_request: hoa_contact_request,
      confirmation_message: 'Your message has been sent to the HOA.'
    };
  }

  // --- About Community ---
  getAboutCommunityContent() {
    const stored = this._getSingletonFromStorage('about_community_content') || {};
    return {
      mission_html: stored.mission_html || '',
      values_html: stored.values_html || '',
      benefits_list: Array.isArray(stored.benefits_list) ? stored.benefits_list : [],
      office_contact: stored.office_contact || { phone: '', email: '', address: '', office_hours: '' },
      directions_text: stored.directions_text || ''
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
