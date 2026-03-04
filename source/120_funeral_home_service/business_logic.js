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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tableKeys = [
      'servicepackages',
      'servicepackagecontactrequests',
      'preplanestimates',
      'caskets',
      'visitationrooms',
      'flowerarrangements',
      'serviceplans',
      'serviceplanitems',
      'obituaries',
      'guestbookentries',
      'servicersvps',
      'supportgroups',
      'supportgroupsessions',
      'supportgroupregistrations',
      'consultationappointmentrequests'
    ];

    for (let i = 0; i < tableKeys.length; i++) {
      const key = tableKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : defaultValue;
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

  // ----------------------
  // Generic helpers
  // ----------------------

  _formatCurrency(amount) {
    const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    try {
      if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      }
    } catch (e) {}
    const fixed = value.toFixed(2);
    return '$' + fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  _calculateDistanceMilesFromZip(zipA, zipB) {
    const a = parseInt(zipA, 10);
    const b = parseInt(zipB, 10);
    if (isNaN(a) || isNaN(b)) return Number.POSITIVE_INFINITY;
    // Simple approximate distance: 0.1 miles per zip code unit difference
    return Math.abs(a - b) * 0.1;
  }

  _validateConsultationDateWithinRange(requested_start_iso) {
    if (!requested_start_iso) return false;
    const date = new Date(requested_start_iso);
    if (isNaN(date.getTime())) return false;

    const now = new Date();
    // Strip time for day comparison
    const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = startDay.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return false;

    const options = this.getConsultationOptions();
    const maxDays = typeof options.max_days_ahead === 'number' ? options.max_days_ahead : 14;
    if (diffDays > maxDays) return false;

    // Enforce weekday only (Mon-Fri)
    const day = date.getDay(); // 0=Sun,6=Sat
    if (day === 0 || day === 6) return false;

    return true;
  }

  _parseTimeStringToMinutes(timeStr) {
    // Accept formats like '18:00' or '7:00 PM'
    if (!timeStr || typeof timeStr !== 'string') return null;
    const trimmed = timeStr.trim();

    // 24h format HH:MM
    const match24 = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
    if (match24) {
      const h = parseInt(match24[1], 10);
      const m = parseInt(match24[2], 10);
      return h * 60 + m;
    }

    // 12h format like '7:00 PM'
    const match12 = /^([1-9]|1[0-2]):([0-5]\d)\s*([AaPp][Mm])$/.exec(trimmed);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const ampm = match12[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }

    return null;
  }

  _getOrCreatePreplanEstimate(defaults) {
    const existingId = localStorage.getItem('current_preplan_estimate_id');
    const estimates = this._getFromStorage('preplanestimates');
    if (existingId) {
      const found = estimates.find(e => e.id === existingId);
      if (found) {
        return this._attachPreplanRelations(found);
      }
    }

    const base = defaults || {};
    const newEstimate = {
      id: this._generateId('preplan'),
      created_at: new Date().toISOString(),
      age: typeof base.age === 'number' ? base.age : 0,
      zip_code: base.zip_code || '',
      disposition_type: base.disposition_type || 'burial',
      day_of_service_type: base.day_of_service_type || 'any',
      time_slot: base.time_slot || 'other',
      selected_casket_id: null,
      selected_casket_name_snapshot: null,
      selected_casket_price_snapshot: null,
      line_items: [],
      estimated_total: 0,
      email_to: null,
      email_subject: null,
      was_email_sent: false,
      last_emailed_at: null
    };

    estimates.push(newEstimate);
    this._saveToStorage('preplanestimates', estimates);
    localStorage.setItem('current_preplan_estimate_id', newEstimate.id);
    return this._attachPreplanRelations(newEstimate);
  }

  _getOrCreateServicePlanStore() {
    const plans = this._getFromStorage('serviceplans');
    const items = this._getFromStorage('serviceplanitems');
    return { plans, items };
  }

  _attachPreplanRelations(estimate) {
    if (!estimate) return null;
    const caskets = this._getFromStorage('caskets');
    const casket = estimate.selected_casket_id
      ? caskets.find(c => c.id === estimate.selected_casket_id) || null
      : null;
    const clone = Object.assign({}, estimate);
    clone.selected_casket = casket;
    return clone;
  }

  // ----------------------
  // Content interfaces
  // ----------------------

  getHomepageContent() {
    const defaultValue = {
      hero_title: '',
      hero_subtitle: '',
      service_summaries: [],
      facility_highlights: [],
      support_offerings_summary: '',
      primary_ctas: []
    };
    return this._getObjectFromStorage('homepage_content', defaultValue);
  }

  getServicesOverviewContent() {
    const defaultValue = {
      intro_text: '',
      service_categories: []
    };
    return this._getObjectFromStorage('services_overview_content', defaultValue);
  }

  getContactAndVisitsInfo() {
    const defaultValue = {
      phone_numbers: [],
      email_addresses: [],
      physical_addresses: [],
      visiting_hours: [],
      map_embed_info: {
        latitude: null,
        longitude: null
      }
    };
    return this._getObjectFromStorage('contact_and_visits_info', defaultValue);
  }

  getAboutPageContent() {
    const defaultValue = {
      history_text: '',
      mission_text: '',
      staff_profiles: []
    };
    return this._getObjectFromStorage('about_page_content', defaultValue);
  }

  getPolicyDocuments() {
    const defaultValue = {
      policies: []
    };
    return this._getObjectFromStorage('policy_documents', defaultValue);
  }

  // ----------------------
  // Service packages (cremation, veterans, etc.)
  // ----------------------

  getServicePackageFilterOptions(service_type) {
    const all = this._getFromStorage('servicepackages');
    const filtered = all.filter(p => p.service_type === service_type && p.status === 'active');

    let minPrice = null;
    let maxPrice = null;
    let supportsIncludesViewing = false;
    let supportsFlag = false;
    let supportsHonors = false;
    let supportsLive = false;

    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      if (typeof p.base_price === 'number') {
        if (minPrice === null || p.base_price < minPrice) minPrice = p.base_price;
        if (maxPrice === null || p.base_price > maxPrice) maxPrice = p.base_price;
      }
      if (p.includes_viewing) supportsIncludesViewing = true;
      if (p.includes_flag_presentation) supportsFlag = true;
      if (p.includes_military_honors) supportsHonors = true;
      if (p.includes_live_streaming) supportsLive = true;
    }

    return {
      price_range: {
        min_price_allowed: minPrice,
        max_price_allowed: maxPrice
      },
      feature_filters: {
        supports_includes_viewing: supportsIncludesViewing,
        supports_flag_presentation: supportsFlag,
        supports_military_honors: supportsHonors,
        supports_live_streaming: supportsLive
      },
      sorting_options: [
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'name_asc', label: 'Name: A to Z' }
      ]
    };
  }

  listServicePackages(service_type, filters, sort_by) {
    const all = this._getFromStorage('servicepackages');
    const f = filters || {};

    let list = all.filter(p => p.service_type === service_type);

    if (f.status) {
      list = list.filter(p => p.status === f.status);
    } else {
      list = list.filter(p => p.status === 'active');
    }

    if (typeof f.includes_viewing === 'boolean') {
      list = list.filter(p => !!p.includes_viewing === f.includes_viewing);
    }
    if (typeof f.includes_flag_presentation === 'boolean') {
      list = list.filter(p => !!p.includes_flag_presentation === f.includes_flag_presentation);
    }
    if (typeof f.includes_military_honors === 'boolean') {
      list = list.filter(p => !!p.includes_military_honors === f.includes_military_honors);
    }
    if (typeof f.includes_live_streaming === 'boolean') {
      list = list.filter(p => !!p.includes_live_streaming === f.includes_live_streaming);
    }
    if (typeof f.min_price === 'number') {
      list = list.filter(p => typeof p.base_price === 'number' && p.base_price >= f.min_price);
    }
    if (typeof f.max_price === 'number') {
      list = list.filter(p => typeof p.base_price === 'number' && p.base_price <= f.max_price);
    }

    if (sort_by === 'price_asc') {
      list.sort((a, b) => {
        const pa = typeof a.base_price === 'number' ? a.base_price : Number.POSITIVE_INFINITY;
        const pb = typeof b.base_price === 'number' ? b.base_price : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sort_by === 'price_desc') {
      list.sort((a, b) => {
        const pa = typeof a.base_price === 'number' ? a.base_price : 0;
        const pb = typeof b.base_price === 'number' ? b.base_price : 0;
        return pb - pa;
      });
    } else if (sort_by === 'name_asc') {
      list.sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    return {
      service_type: service_type,
      total_count: list.length,
      packages: list
    };
  }

  getServicePackageDetail(packageId) {
    const all = this._getFromStorage('servicepackages');
    const pkg = all.find(p => p.id === packageId) || null;
    if (!pkg) {
      return {
        package: null,
        feature_list: [],
        add_on_descriptions: []
      };
    }

    const feature_list = [];
    if (pkg.includes_viewing) feature_list.push('Includes viewing');
    if (pkg.includes_flag_presentation) feature_list.push('Flag presentation');
    if (pkg.includes_military_honors) feature_list.push('Military honors');
    if (pkg.includes_live_streaming) feature_list.push('Live streaming');
    if (pkg.includes_burial_service) feature_list.push('Burial service');
    if (Array.isArray(pkg.tags)) {
      for (let i = 0; i < pkg.tags.length; i++) {
        feature_list.push(String(pkg.tags[i]));
      }
    }

    return {
      package: pkg,
      feature_list: feature_list,
      add_on_descriptions: []
    };
  }

  submitServicePackageInfoRequest(packageId, contact_name, phone, email, message) {
    const packages = this._getFromStorage('servicepackages');
    const pkg = packages.find(p => p.id === packageId) || null;

    const requests = this._getFromStorage('servicepackagecontactrequests');
    const request = {
      id: this._generateId('spreq'),
      request_type: 'info_request',
      package_id: packageId,
      package_name_snapshot: pkg ? pkg.name : '',
      contact_name: contact_name,
      phone: phone || null,
      email: email || null,
      message: message || null,
      created_at: new Date().toISOString(),
      source_page: 'service_package_detail'
    };
    requests.push(request);
    this._saveToStorage('servicepackagecontactrequests', requests);

    return {
      request: request,
      success: true,
      user_message: 'Your information request has been submitted.'
    };
  }

  submitServicePackageCallbackRequest(packageId, contact_name, phone, email, message) {
    const packages = this._getFromStorage('servicepackages');
    const pkg = packages.find(p => p.id === packageId) || null;

    const requests = this._getFromStorage('servicepackagecontactrequests');
    const request = {
      id: this._generateId('spreq'),
      request_type: 'callback_request',
      package_id: packageId,
      package_name_snapshot: pkg ? pkg.name : '',
      contact_name: contact_name,
      phone: phone,
      email: email || null,
      message: message || null,
      created_at: new Date().toISOString(),
      source_page: 'service_package_detail'
    };
    requests.push(request);
    this._saveToStorage('servicepackagecontactrequests', requests);

    return {
      request: request,
      success: true,
      user_message: 'Your callback request has been submitted.'
    };
  }

  // ----------------------
  // Pre-planning estimator
  // ----------------------

  startPreplanEstimate(age, zip_code, disposition_type) {
    const estimates = this._getFromStorage('preplanestimates');

    const estimate = {
      id: this._generateId('preplan'),
      created_at: new Date().toISOString(),
      age: typeof age === 'number' ? age : 0,
      zip_code: zip_code || '',
      disposition_type: disposition_type || 'burial',
      day_of_service_type: 'any',
      time_slot: 'other',
      selected_casket_id: null,
      selected_casket_name_snapshot: null,
      selected_casket_price_snapshot: null,
      line_items: [],
      estimated_total: 0,
      email_to: null,
      email_subject: null,
      was_email_sent: false,
      last_emailed_at: null
    };

    estimates.push(estimate);
    this._saveToStorage('preplanestimates', estimates);
    localStorage.setItem('current_preplan_estimate_id', estimate.id);

    return {
      estimate: this._attachPreplanRelations(estimate)
    };
  }

  updatePreplanServiceDetails(estimateId, day_of_service_type, time_slot) {
    const estimates = this._getFromStorage('preplanestimates');
    const idx = estimates.findIndex(e => e.id === estimateId);
    if (idx === -1) {
      return { estimate: null };
    }
    const estimate = estimates[idx];
    estimate.day_of_service_type = day_of_service_type;
    estimate.time_slot = time_slot;
    estimates[idx] = estimate;
    this._saveToStorage('preplanestimates', estimates);

    return {
      estimate: this._attachPreplanRelations(estimate)
    };
  }

  getEstimatorCasketFilterOptions() {
    const caskets = this._getFromStorage('caskets');
    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < caskets.length; i++) {
      const c = caskets[i];
      if (c.status !== 'active') continue;
      if (typeof c.price === 'number') {
        if (minPrice === null || c.price < minPrice) minPrice = c.price;
        if (maxPrice === null || c.price > maxPrice) maxPrice = c.price;
      }
    }

    const style_levels = [
      { value: 'basic', label: 'Basic' },
      { value: 'standard', label: 'Standard' },
      { value: 'mid_range', label: 'Mid-range' },
      { value: 'premium', label: 'Premium' },
      { value: 'luxury', label: 'Luxury' }
    ];

    return {
      price_range: {
        min_price_allowed: minPrice,
        max_price_allowed: maxPrice
      },
      style_levels: style_levels
    };
  }

  searchEstimatorCaskets(estimateId, min_price, max_price, style_levels) {
    const caskets = this._getFromStorage('caskets');
    const styles = Array.isArray(style_levels) ? style_levels : [];

    let list = caskets.filter(c => c.status === 'active');

    if (typeof min_price === 'number') {
      list = list.filter(c => typeof c.price === 'number' && c.price >= min_price);
    }
    if (typeof max_price === 'number') {
      list = list.filter(c => typeof c.price === 'number' && c.price <= max_price);
    }
    if (styles.length > 0) {
      list = list.filter(c => styles.indexOf(c.style_level) !== -1);
    }

    return {
      total_count: list.length,
      caskets: list
    };
  }

  selectCasketForPreplan(estimateId, casketId) {
    const estimates = this._getFromStorage('preplanestimates');
    const caskets = this._getFromStorage('caskets');

    const eIdx = estimates.findIndex(e => e.id === estimateId);
    if (eIdx === -1) {
      return { estimate: null };
    }
    const estimate = estimates[eIdx];
    const casket = caskets.find(c => c.id === casketId) || null;

    estimate.selected_casket_id = casketId;
    estimate.selected_casket_name_snapshot = casket ? casket.name : null;
    estimate.selected_casket_price_snapshot = casket ? casket.price : null;

    // Rebuild line items and estimated total minimally based on casket
    const line_items = [];
    if (casket) {
      line_items.push({
        label: 'Casket: ' + (casket.name || ''),
        amount: typeof casket.price === 'number' ? casket.price : 0
      });
    }
    estimate.line_items = line_items;
    estimate.estimated_total = line_items.reduce((sum, li) => sum + (li.amount || 0), 0);

    estimates[eIdx] = estimate;
    this._saveToStorage('preplanestimates', estimates);

    return {
      estimate: this._attachPreplanRelations(estimate)
    };
  }

  getPreplanEstimateSummary(estimateId) {
    const estimates = this._getFromStorage('preplanestimates');
    const estimate = estimates.find(e => e.id === estimateId) || null;
    if (!estimate) {
      return {
        estimate: null,
        line_items_display: [],
        formatted_total: this._formatCurrency(0)
      };
    }

    const lineItems = Array.isArray(estimate.line_items) ? estimate.line_items : [];
    const line_items_display = [];
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      const amount = typeof li.amount === 'number' ? li.amount : 0;
      line_items_display.push({
        label: li.label || '',
        amount: amount,
        formatted_amount: this._formatCurrency(amount)
      });
    }

    const total = typeof estimate.estimated_total === 'number'
      ? estimate.estimated_total
      : lineItems.reduce((sum, li) => sum + (li.amount || 0), 0);

    estimate.estimated_total = total;

    return {
      estimate: this._attachPreplanRelations(estimate),
      line_items_display: line_items_display,
      formatted_total: this._formatCurrency(total)
    };
  }

  emailPreplanEstimate(estimateId, email_to, email_subject) {
    const estimates = this._getFromStorage('preplanestimates');
    const idx = estimates.findIndex(e => e.id === estimateId);
    if (idx === -1) {
      return {
        estimate: null,
        success: false,
        user_message: 'Estimate not found.'
      };
    }

    const estimate = estimates[idx];
    estimate.email_to = email_to;
    estimate.email_subject = email_subject || null;
    estimate.was_email_sent = true;
    estimate.last_emailed_at = new Date().toISOString();

    estimates[idx] = estimate;
    this._saveToStorage('preplanestimates', estimates);

    return {
      estimate: this._attachPreplanRelations(estimate),
      success: true,
      user_message: 'Your estimate has been emailed.'
    };
  }

  // ----------------------
  // Visitation rooms & service plans
  // ----------------------

  getVisitationRoomFilterOptions() {
    const rooms = this._getFromStorage('visitationrooms');
    let minCap = null;
    let maxCap = null;
    const amenitySet = {};

    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (r.status !== 'active') continue;
      if (typeof r.capacity === 'number') {
        if (minCap === null || r.capacity < minCap) minCap = r.capacity;
        if (maxCap === null || r.capacity > maxCap) maxCap = r.capacity;
      }
      if (r.has_audio_visual) {
        amenitySet['audio_visual'] = 'Audio-visual equipment';
      }
      if (Array.isArray(r.amenities)) {
        for (let j = 0; j < r.amenities.length; j++) {
          const label = String(r.amenities[j]);
          const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          if (!amenitySet[key]) amenitySet[key] = label;
        }
      }
    }

    const amenity_options = Object.keys(amenitySet).map(key => ({
      value: key,
      label: amenitySet[key]
    }));

    return {
      capacity_range: {
        min_capacity_allowed: minCap,
        max_capacity_allowed: maxCap
      },
      amenity_options: amenity_options
    };
  }

  listVisitationRooms(filters) {
    const rooms = this._getFromStorage('visitationrooms');
    const f = filters || {};

    let list = rooms.slice();

    if (f.status) {
      list = list.filter(r => r.status === f.status);
    } else {
      list = list.filter(r => r.status === 'active');
    }

    if (typeof f.min_capacity === 'number') {
      list = list.filter(r => typeof r.capacity === 'number' && r.capacity >= f.min_capacity);
    }

    if (Array.isArray(f.amenities_required) && f.amenities_required.length > 0) {
      list = list.filter(r => {
        for (let i = 0; i < f.amenities_required.length; i++) {
          const req = f.amenities_required[i];
          if (req === 'audio_visual') {
            if (!r.has_audio_visual) return false;
          } else {
            const labels = Array.isArray(r.amenities) ? r.amenities : [];
            const has = labels.some(label => {
              const key = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '_');
              return key === req;
            });
            if (!has) return false;
          }
        }
        return true;
      });
    }

    return {
      total_count: list.length,
      rooms: list
    };
  }

  getVisitationRoomDetail(roomId) {
    const rooms = this._getFromStorage('visitationrooms');
    const room = rooms.find(r => r.id === roomId) || null;
    return {
      room: room
    };
  }

  getServicePlansSummary() {
    const plans = this._getFromStorage('serviceplans');
    return {
      plans: plans
    };
  }

  saveItemToServicePlan(item_type, item_ref_id, plan_mode, existing_plan_id, new_plan_name, quantity, notes) {
    const store = this._getOrCreateServicePlanStore();
    const plans = store.plans;
    const items = store.items;

    let plan = null;

    if (plan_mode === 'use_existing') {
      plan = plans.find(p => p.id === existing_plan_id) || null;
    }

    if (!plan) {
      if (plan_mode === 'create_new') {
        const name = new_plan_name || 'New service plan';
        plan = {
          id: this._generateId('plan'),
          name: name,
          description: null,
          created_at: new Date().toISOString(),
          updated_at: null
        };
        plans.push(plan);
      } else {
        // Fallback: create a generic plan
        plan = {
          id: this._generateId('plan'),
          name: new_plan_name || 'Service plan',
          description: null,
          created_at: new Date().toISOString(),
          updated_at: null
        };
        plans.push(plan);
      }
    } else {
      plan.updated_at = new Date().toISOString();
    }

    // Resolve referenced item name for snapshot
    let itemName = null;
    if (item_type === 'visitation_room') {
      const rooms = this._getFromStorage('visitationrooms');
      const r = rooms.find(x => x.id === item_ref_id);
      itemName = r ? r.name : null;
    } else if (item_type === 'flower_arrangement') {
      const flowers = this._getFromStorage('flowerarrangements');
      const f = flowers.find(x => x.id === item_ref_id);
      itemName = f ? f.name : null;
    } else if (item_type === 'casket') {
      const caskets = this._getFromStorage('caskets');
      const c = caskets.find(x => x.id === item_ref_id);
      itemName = c ? c.name : null;
    } else if (item_type === 'service_package') {
      const pkgs = this._getFromStorage('servicepackages');
      const p = pkgs.find(x => x.id === item_ref_id);
      itemName = p ? p.name : null;
    } else if (item_type === 'support_group') {
      const groups = this._getFromStorage('supportgroups');
      const g = groups.find(x => x.id === item_ref_id);
      itemName = g ? g.name : null;
    }

    const planItem = {
      id: this._generateId('planitem'),
      plan_id: plan.id,
      item_type: item_type,
      item_ref_id: item_ref_id,
      item_name_snapshot: itemName,
      quantity: typeof quantity === 'number' ? quantity : 1,
      notes: notes || null,
      added_at: new Date().toISOString()
    };

    items.push(planItem);

    this._saveToStorage('serviceplans', plans);
    this._saveToStorage('serviceplanitems', items);

    return {
      plan: plan,
      plan_item: planItem,
      success: true,
      user_message: 'Item added to service plan.'
    };
  }

  // ----------------------
  // Flowers & tributes
  // ----------------------

  getFlowersFilterOptions() {
    const flowers = this._getFromStorage('flowerarrangements');

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      if (f.status !== 'active') continue;
      if (typeof f.price === 'number') {
        if (minPrice === null || f.price < minPrice) minPrice = f.price;
        if (maxPrice === null || f.price > maxPrice) maxPrice = f.price;
      }
    }

    const categories = [
      { value: 'casket_sprays', label: 'Casket sprays' },
      { value: 'standing_sprays', label: 'Standing sprays' },
      { value: 'for_the_service', label: 'For the service' },
      { value: 'for_the_casket', label: 'For the casket' },
      { value: 'other', label: 'Other' }
    ];

    return {
      price_range: {
        min_price_allowed: minPrice,
        max_price_allowed: maxPrice
      },
      categories: categories
    };
  }

  listFlowerArrangements(filters) {
    const flowers = this._getFromStorage('flowerarrangements');
    const f = filters || {};

    let list = flowers.slice();

    if (f.status) {
      list = list.filter(x => x.status === f.status);
    } else {
      list = list.filter(x => x.status === 'active');
    }

    if (typeof f.min_price === 'number') {
      list = list.filter(x => typeof x.price === 'number' && x.price >= f.min_price);
    }
    if (typeof f.max_price === 'number') {
      list = list.filter(x => typeof x.price === 'number' && x.price <= f.max_price);
    }
    if (f.category) {
      list = list.filter(x => x.category === f.category);
    }

    return {
      total_count: list.length,
      arrangements: list
    };
  }

  getFlowerArrangementDetail(arrangementId) {
    const flowers = this._getFromStorage('flowerarrangements');
    const arrangement = flowers.find(f => f.id === arrangementId) || null;
    return {
      arrangement: arrangement,
      size_options: []
    };
  }

  // ----------------------
  // Obituaries, guestbook, RSVP
  // ----------------------

  searchObituaries(name_query, service_month, service_year, page, page_size) {
    const obituaries = this._getFromStorage('obituaries');
    let list = obituaries.slice();

    if (name_query) {
      const q = name_query.toLowerCase();
      list = list.filter(o => (o.deceased_name || '').toLowerCase().indexOf(q) !== -1);
    }
    if (typeof service_month === 'number') {
      list = list.filter(o => o.service_month === service_month);
    }
    if (typeof service_year === 'number') {
      list = list.filter(o => o.service_year === service_year);
    }

    const total = list.length;
    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const paged = list.slice(start, end);

    return {
      total_count: total,
      obituaries: paged
    };
  }

  getObituaryDetail(obituaryId) {
    const obituaries = this._getFromStorage('obituaries');
    const obituary = obituaries.find(o => o.id === obituaryId) || null;

    let formatted_service_datetime = '';
    let service_date_only = '';
    let service_time_only = '';

    if (obituary && obituary.service_datetime) {
      const dt = new Date(obituary.service_datetime);
      if (!isNaN(dt.getTime())) {
        try {
          formatted_service_datetime = dt.toLocaleString();
          service_date_only = dt.toISOString().slice(0, 10);
          service_time_only = dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch (e) {
          formatted_service_datetime = obituary.service_datetime;
        }
      }
    }

    return {
      obituary: obituary,
      formatted_service_datetime: formatted_service_datetime,
      service_date_only: service_date_only,
      service_time_only: service_time_only
    };
  }

  listGuestbookEntries(obituaryId) {
    const entriesRaw = this._getFromStorage('guestbookentries');
    const obituaries = this._getFromStorage('obituaries');

    const filtered = entriesRaw.filter(e => e.obituary_id === obituaryId && e.status !== 'removed');

    const entries = filtered.map(e => {
      const obituary = obituaries.find(o => o.id === e.obituary_id) || null;
      const clone = Object.assign({}, e);
      clone.obituary = obituary;
      return clone;
    });

    return {
      entries: entries
    };
  }

  submitGuestbookEntry(obituaryId, guest_name, message) {
    const entries = this._getFromStorage('guestbookentries');
    const obituaries = this._getFromStorage('obituaries');
    const obituary = obituaries.find(o => o.id === obituaryId) || null;

    const entry = {
      id: this._generateId('guestbook'),
      obituary_id: obituaryId,
      guest_name: guest_name,
      message: message,
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    entries.push(entry);
    this._saveToStorage('guestbookentries', entries);

    const clone = Object.assign({}, entry);
    clone.obituary = obituary;

    return {
      entry: clone,
      success: true,
      user_message: 'Your message has been submitted.'
    };
  }

  submitServiceRSVP(obituaryId, num_attendees, email, notes) {
    const rsvps = this._getFromStorage('servicersvps');
    const obituaries = this._getFromStorage('obituaries');
    const obituary = obituaries.find(o => o.id === obituaryId) || null;

    const rsvp = {
      id: this._generateId('rsvp'),
      obituary_id: obituaryId,
      num_attendees: num_attendees,
      email: email,
      notes: notes || null,
      created_at: new Date().toISOString(),
      status: 'submitted'
    };

    rsvps.push(rsvp);
    this._saveToStorage('servicersvps', rsvps);

    const clone = Object.assign({}, rsvp);
    clone.obituary = obituary;

    return {
      rsvp: clone,
      success: true,
      user_message: 'Your RSVP has been recorded.'
    };
  }

  // ----------------------
  // Support groups
  // ----------------------

  getSupportGroupFilterOptions() {
    return {
      distance_options_miles: [5, 10, 25, 50],
      day_filters: [
        { value: 'weekdays', label: 'Weekdays' },
        { value: 'weekends', label: 'Weekends' }
      ],
      time_filter_suggestions: ['18:00', '19:00', '20:00']
    };
  }

  searchSupportGroups(zip_code, radius_miles, day_filter, start_time_at_or_after) {
    const groups = this._getFromStorage('supportgroups');

    const minMinutes = start_time_at_or_after
      ? this._parseTimeStringToMinutes(start_time_at_or_after)
      : null;

    const filtered = groups.filter(g => {
      if (zip_code && g.zip_code) {
        const dist = this._calculateDistanceMilesFromZip(zip_code, g.zip_code);
        if (typeof radius_miles === 'number' && dist > radius_miles) return false;
      }

      if (day_filter && g.meeting_day_pattern && g.meeting_day_pattern !== day_filter) {
        return false;
      }

      if (minMinutes !== null && g.typical_start_time) {
        const startMinutes = this._parseTimeStringToMinutes(g.typical_start_time);
        if (startMinutes !== null && startMinutes < minMinutes) return false;
      }

      return true;
    });

    return {
      groups: filtered
    };
  }

  getSupportGroupDetail(groupId) {
    const groups = this._getFromStorage('supportgroups');
    const group = groups.find(g => g.id === groupId) || null;
    return {
      group: group
    };
  }

  listSupportGroupSessions(groupId, upcoming_only) {
    const sessionsRaw = this._getFromStorage('supportgroupsessions');
    const groups = this._getFromStorage('supportgroups');
    const now = new Date();

    let sessions = sessionsRaw.filter(s => s.group_id === groupId);

    if (upcoming_only) {
      sessions = sessions.filter(s => {
        if (s.status !== 'scheduled') return false;
        if (!s.session_start) return false;
        const dt = new Date(s.session_start);
        if (isNaN(dt.getTime())) return false;
        return dt.getTime() >= now.getTime();
      });
    }

    sessions = sessions.map(s => {
      const group = groups.find(g => g.id === s.group_id) || null;
      const clone = Object.assign({}, s);
      clone.group = group;
      return clone;
    });

    return {
      sessions: sessions
    };
  }

  registerForSupportGroupSession(groupId, sessionId, full_name, email, comments, consent_accepted) {
    if (!consent_accepted) {
      return {
        registration: null,
        success: false,
        user_message: 'Consent must be accepted to register.'
      };
    }

    const registrations = this._getFromStorage('supportgroupregistrations');

    const registration = {
      id: this._generateId('sgreg'),
      group_id: groupId,
      session_id: sessionId,
      full_name: full_name,
      email: email,
      comments: comments || null,
      consent_accepted: true,
      created_at: new Date().toISOString(),
      status: 'submitted'
    };

    registrations.push(registration);
    this._saveToStorage('supportgroupregistrations', registrations);

    return {
      registration: registration,
      success: true,
      user_message: 'You have been registered for the session.'
    };
  }

  // ----------------------
  // Green & eco-friendly options
  // ----------------------

  getGreenOptionsOverview() {
    const defaultValue = {
      intro_text: '',
      practices: [],
      special_locations: []
    };
    return this._getObjectFromStorage('green_options_overview', defaultValue);
  }

  getEcoCasketFilterOptions() {
    const caskets = this._getFromStorage('caskets');
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < caskets.length; i++) {
      const c = caskets[i];
      if (c.status !== 'active') continue;
      const isEco = c.is_eco_friendly || c.is_biodegradable || c.category === 'eco_friendly' || c.material_type === 'biodegradable' || c.material_type === 'natural_materials';
      if (!isEco) continue;
      if (typeof c.price === 'number') {
        if (minPrice === null || c.price < minPrice) minPrice = c.price;
        if (maxPrice === null || c.price > maxPrice) maxPrice = c.price;
      }
    }

    const material_types = [
      { value: 'biodegradable', label: 'Biodegradable' },
      { value: 'natural_materials', label: 'Natural materials' }
    ];

    return {
      material_types: material_types,
      price_range: {
        min_price_allowed: minPrice,
        max_price_allowed: maxPrice
      }
    };
  }

  listEcoFriendlyCaskets(filters) {
    const caskets = this._getFromStorage('caskets');
    const f = filters || {};

    let list = caskets.filter(c => {
      if (c.status !== 'active' && f.status !== c.status && f.status) return false;
      const isEco = c.is_eco_friendly || c.is_biodegradable || c.category === 'eco_friendly' || c.material_type === 'biodegradable' || c.material_type === 'natural_materials';
      return isEco;
    });

    if (f.status) {
      list = list.filter(c => c.status === f.status);
    } else {
      list = list.filter(c => c.status === 'active');
    }

    if (typeof f.min_price === 'number') {
      list = list.filter(c => typeof c.price === 'number' && c.price >= f.min_price);
    }
    if (typeof f.max_price === 'number') {
      list = list.filter(c => typeof c.price === 'number' && c.price <= f.max_price);
    }
    if (f.material_type) {
      list = list.filter(c => c.material_type === f.material_type);
    }

    return {
      total_count: list.length,
      caskets: list
    };
  }

  getCasketDetail(casketId) {
    const caskets = this._getFromStorage('caskets');
    const casket = caskets.find(c => c.id === casketId) || null;
    return {
      casket: casket
    };
  }

  // ----------------------
  // Consultations
  // ----------------------

  getConsultationOptions() {
    return {
      consultation_types: [
        { value: 'in_person', label: 'In-person' },
        { value: 'phone', label: 'Phone' },
        { value: 'video', label: 'Video' }
      ],
      time_slot_labels: [
        { value: 'morning_9_11', label: 'Morning (9am	911am)' },
        { value: 'late_morning_11_13', label: 'Late morning (11am	91pm)' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening' }
      ],
      max_days_ahead: 14
    };
  }

  getAvailableConsultationSlots(consultation_type, from_date, to_date) {
    const options = this.getConsultationOptions();
    const maxDays = options.max_days_ahead || 14;

    const today = new Date();
    const from = new Date(from_date + 'T00:00:00');
    const to = new Date(to_date + 'T00:00:00');

    const slots = [];

    for (
      let d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      d.getTime() <= to.getTime();
      d.setDate(d.getDate() + 1)
    ) {
      const diffMs = d.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > maxDays) continue;

      const dayOfWeek = d.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      // Only offer in-person on weekdays; other types can be any day
      if (consultation_type === 'in_person' && !isWeekday) continue;

      const dateStr = d.toISOString().slice(0, 10);

      const time_slots = [
        { start_time: '09:00', end_time: '11:00', time_slot_label: 'morning_9_11', is_available: true },
        { start_time: '11:00', end_time: '13:00', time_slot_label: 'late_morning_11_13', is_available: true },
        { start_time: '13:00', end_time: '17:00', time_slot_label: 'afternoon', is_available: true },
        { start_time: '17:00', end_time: '19:00', time_slot_label: 'evening', is_available: true }
      ];

      slots.push({
        date: dateStr,
        is_weekday: isWeekday,
        time_slots: time_slots
      });
    }

    return {
      slots: slots
    };
  }

  submitConsultationAppointmentRequest(consultation_type, requested_start, time_slot_label, contact_name, phone, email, notes) {
    if (!this._validateConsultationDateWithinRange(requested_start)) {
      return {
        appointment_request: null,
        success: false,
        user_message: 'Requested date is outside the allowed scheduling window or not on a weekday.'
      };
    }

    const list = this._getFromStorage('consultationappointmentrequests');

    const appointment = {
      id: this._generateId('consult'),
      consultation_type: consultation_type,
      requested_start: requested_start,
      time_slot_label: time_slot_label || null,
      contact_name: contact_name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
      status: 'requested'
    };

    list.push(appointment);
    this._saveToStorage('consultationappointmentrequests', list);

    return {
      appointment_request: appointment,
      success: true,
      user_message: 'Your consultation request has been submitted.'
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
