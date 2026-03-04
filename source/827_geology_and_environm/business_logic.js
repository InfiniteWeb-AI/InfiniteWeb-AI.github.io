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

  // ---------------------- Storage helpers ----------------------
  _initStorage() {
    const keys = [
      'services',
      'service_packages',
      'service_contact_requests',
      'case_studies',
      'favorite_case_studies',
      'resources',
      'reading_list_items',
      'team_members',
      'team_member_messages',
      'events',
      'event_registrations',
      'offices',
      'general_contact_inquiries',
      'service_finder_runs',
      'project_duration_estimates',
      'planning_notes'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
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

  // Ensure single-user lists (favorites, reading list) exist and return them
  _getOrCreateUserLists() {
    let favoriteCaseStudies = this._getFromStorage('favorite_case_studies');
    let readingListItems = this._getFromStorage('reading_list_items');

    if (!Array.isArray(favoriteCaseStudies)) {
      favoriteCaseStudies = [];
      this._saveToStorage('favorite_case_studies', favoriteCaseStudies);
    }
    if (!Array.isArray(readingListItems)) {
      readingListItems = [];
      this._saveToStorage('reading_list_items', readingListItems);
    }

    return {
      favorite_case_studies: favoriteCaseStudies,
      reading_list_items: readingListItems
    };
  }

  // ---------------------- Private business helpers ----------------------

  // Simple postal code -> coordinates resolver. No external calls.
  _resolvePostalCodeToCoordinates(postal_code, country) {
    // Try to find an office with this postal code and use its coordinates as approximation.
    const offices = this._getFromStorage('offices');
    const matchingOffice = offices.find(
      (o) => o.postal_code === postal_code && (!country || o.country === country)
    );

    if (matchingOffice && typeof matchingOffice.latitude === 'number' && typeof matchingOffice.longitude === 'number') {
      return {
        latitude: matchingOffice.latitude,
        longitude: matchingOffice.longitude
      };
    }

    // Fallback to 0,0 if nothing better; still deterministic and data-based.
    return { latitude: 0, longitude: 0 };
  }

  // Haversine distance in miles between two lat/lon pairs
  _distanceMiles(lat1, lon1, lat2, lon2) {
    function toRad(deg) {
      return (deg * Math.PI) / 180;
    }

    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Map Service Finder inputs to a recommended Service
  _calculateServiceFinderRecommendation(property_type, issue_type, regulator_notified) {
    const services = this._getFromStorage('services');

    function findBySlug(slug) {
      return services.find((s) => s.slug === slug && s.is_active);
    }

    let service = null;

    if (issue_type === 'leaking_underground_storage_tank' || issue_type === 'ust_leak') {
      service = findBySlug('ust_leak_investigation') || findBySlug('storage_tank_services');
    }

    if (!service && issue_type === 'mine_reclamation') {
      service = findBySlug('mining_reclamation');
    }

    if (!service && (issue_type === 'soil_contamination' || issue_type === 'groundwater_contamination')) {
      service = findBySlug('remediation') || findBySlug('environmental_site_assessment');
    }

    if (!service && property_type === 'industrial') {
      service = findBySlug('environmental_site_assessment');
    }

    if (!service) {
      service = findBySlug('consulting') || services.find((s) => s.is_active) || null;
    }

    return service || null;
  }

  // Compute numeric project duration based on simple heuristic rules
  _computeProjectDuration(property_type, site_size_acres, regulatory_oversight) {
    let baseMonths = 2; // default

    if (property_type === 'industrial') baseMonths = 2;
    else if (property_type === 'commercial') baseMonths = 1.5;
    else if (property_type === 'residential') baseMonths = 1;
    else if (property_type === 'mining_site') baseMonths = 3;
    else baseMonths = 2;

    const size = typeof site_size_acres === 'number' && site_size_acres > 0 ? site_size_acres : 1;
    const extraSizeMonths = Math.max(0, size - 1) * 0.1; // small size-based adjustment

    let oversightMultiplier = 1;
    if (regulatory_oversight === 'state') oversightMultiplier = 1.25;
    else if (regulatory_oversight === 'federal') oversightMultiplier = 1.5;
    else if (regulatory_oversight === 'state_and_federal') oversightMultiplier = 1.75;

    const monthsFloat = (baseMonths + extraSizeMonths) * oversightMultiplier;
    const months = Math.max(1, Math.ceil(monthsFloat));

    return {
      calculated_duration_value: months,
      calculated_duration_unit: 'months'
    };
  }

  // ---------------------- Interface implementations ----------------------

  // 1. getHomepageContent
  getHomepageContent() {
    const services = this._getFromStorage('services');
    const events = this._getFromStorage('events');
    const resources = this._getFromStorage('resources');
    const caseStudies = this._getFromStorage('case_studies');

    const featured_services = services.filter((s) => s.is_active && s.is_featured);
    const featured_events = events.filter((e) => e.is_featured && e.status === 'upcoming');
    const featured_resources = resources.filter((r) => r.is_featured);

    // Attach related service to case studies to satisfy FK resolution requirement
    const caseStudiesWithService = caseStudies.map((cs) => {
      const svc = services.find((s) => s.id === cs.service_id) || null;
      return Object.assign({}, cs, { service: svc });
    });

    const featured_case_studies = caseStudiesWithService.filter((cs) => cs.is_featured);

    // Build core_service_areas from service categories
    const categoryMap = {};
    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      if (!svc.category) continue;
      if (!categoryMap[svc.category]) {
        const key = svc.category.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        categoryMap[svc.category] = {
          key,
          title: svc.category,
          summary: '',
          featured_service_ids: []
        };
      }
      if (svc.is_featured) {
        categoryMap[svc.category].featured_service_ids.push(svc.id);
      }
    }

    const core_service_areas = Object.keys(categoryMap).map((cat) => categoryMap[cat]);

    const has_active_service_finder = services.length > 0; // simple flag

    return {
      core_service_areas,
      featured_services,
      featured_events,
      featured_resources,
      featured_case_studies,
      service_finder_intro_text:
        'Use our Service Finder to identify the right geology and environmental consulting service for your project.',
      has_active_service_finder
    };
  }

  // 2. getServicesOverview
  getServicesOverview() {
    const servicesRaw = this._getFromStorage('services');
    const services = servicesRaw.filter((s) => s.is_active !== false);

    const categoriesMap = {};
    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      const cat = svc.category || 'Other Services';
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = {
          category_key: cat,
          category_label: cat,
          description: '',
          service_count: 0
        };
      }
      categoriesMap[cat].service_count += 1;
    }

    const categories = Object.keys(categoriesMap).map((k) => categoriesMap[k]);

    return {
      categories,
      services
    };
  }

  // 3. getServiceDetail(serviceSlug)
  getServiceDetail(serviceSlug) {
    const services = this._getFromStorage('services');
    const service = services.find((s) => s.slug === serviceSlug) || null;
    const allPackages = this._getFromStorage('service_packages');

    let packages = [];
    if (service) {
      packages = allPackages.filter((p) => p.service_id === service.id && p.is_active !== false);
    }

    const property_type_options = [
      { value: 'commercial', label: 'Commercial' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'gas_station', label: 'Gas Station' },
      { value: 'retail_fueling', label: 'Retail Fueling' },
      { value: 'residential', label: 'Residential' },
      { value: 'mining_site', label: 'Mining Site' },
      { value: 'other', label: 'Other' }
    ];

    const allowed_request_types = ['quote', 'service_inquiry', 'help_request'];
    let default_request_type = 'service_inquiry';
    if (serviceSlug === 'phase_i_esa') {
      default_request_type = 'quote';
    }

    const contact_form_defaults = {
      allowed_request_types,
      default_request_type,
      property_type_options,
      property_size_unit_default: 'acres',
      budget_currency_default: 'usd',
      show_timeline_field: true,
      show_budget_field: true
    };

    return {
      service,
      packages,
      contact_form_defaults
    };
  }

  // 4. submitServiceContactRequest
  submitServiceContactRequest(
    serviceId,
    packageId,
    request_type,
    property_type,
    property_size_raw,
    property_size_value,
    property_size_unit,
    property_location,
    desired_timeline_text,
    desired_completion_date,
    budget_max,
    message,
    contact_name,
    contact_email,
    contact_phone,
    source
  ) {
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');
    const requests = this._getFromStorage('service_contact_requests');

    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      return { success: false, message: 'Invalid serviceId', request: null };
    }

    let pkg = null;
    if (packageId) {
      pkg = packages.find((p) => p.id === packageId) || null;
    }

    // Basic parsing of property_size_raw if value not provided
    let sizeValue = property_size_value;
    let sizeUnit = property_size_unit;
    if (!sizeValue && typeof property_size_raw === 'string') {
      const match = property_size_raw.match(/([0-9]+(?:\.[0-9]+)?)\s*(acres?|acre|sq\s*ft|square\s*feet|hectares?)/i);
      if (match) {
        sizeValue = parseFloat(match[1]);
        const unitStr = match[2].toLowerCase();
        if (unitStr.indexOf('acre') !== -1) sizeUnit = 'acres';
        else if (unitStr.indexOf('hectare') !== -1) sizeUnit = 'hectares';
        else sizeUnit = 'square_feet';
      }
    }

    const record = {
      id: this._generateId('scr'),
      service_id: serviceId,
      package_id: pkg ? pkg.id : null,
      request_type: request_type,
      property_type: property_type || null,
      property_size_raw: property_size_raw || null,
      property_size_value: typeof sizeValue === 'number' ? sizeValue : null,
      property_size_unit: sizeUnit || null,
      property_location: property_location || null,
      desired_timeline_text: desired_timeline_text || null,
      desired_completion_date: desired_completion_date || null,
      budget_max: typeof budget_max === 'number' ? budget_max : null,
      budget_currency: typeof budget_max === 'number' ? 'usd' : null,
      message: message || null,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      created_at: this._nowISO(),
      status: 'new',
      source: source || 'other'
    };

    requests.push(record);
    this._saveToStorage('service_contact_requests', requests);

    return {
      success: true,
      message: 'Request submitted',
      request: record
    };
  }

  // 5. getServicePackageContext
  getServicePackageContext(packageId) {
    const packages = this._getFromStorage('service_packages');
    const services = this._getFromStorage('services');

    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return {
        package: null,
        parent_service: null,
        sibling_packages: []
      };
    }

    const parent_service = services.find((s) => s.id === pkg.service_id) || null;
    const sibling_packages = packages.filter(
      (p) => p.service_id === pkg.service_id && p.id !== pkg.id
    );

    return {
      package: pkg,
      parent_service,
      sibling_packages
    };
  }

  // 6. getCaseStudyFilterOptions
  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies');
    const services = this._getFromStorage('services');

    const sectorMap = {};
    const serviceMap = {};
    const locationMap = {};
    const yearMap = {};

    for (let i = 0; i < caseStudies.length; i++) {
      const cs = caseStudies[i];

      // sectors
      if (!sectorMap[cs.sector]) {
        sectorMap[cs.sector] = { value: cs.sector, label: cs.sector, count: 0 };
      }
      sectorMap[cs.sector].count += 1;

      // services
      if (cs.service_id) {
        if (!serviceMap[cs.service_id]) {
          const svc = services.find((s) => s.id === cs.service_id) || null;
          serviceMap[cs.service_id] = {
            service_id: cs.service_id,
            service_name: svc ? svc.name : 'Unknown Service',
            count: 0
          };
        }
        serviceMap[cs.service_id].count += 1;
      }

      // locations (state)
      if (cs.location_state) {
        if (!locationMap[cs.location_state]) {
          locationMap[cs.location_state] = {
            state: cs.location_state,
            count: 0
          };
        }
        locationMap[cs.location_state].count += 1;
      }

      // completion_years
      if (!yearMap[cs.completion_year]) {
        yearMap[cs.completion_year] = { year: cs.completion_year, count: 0 };
      }
      yearMap[cs.completion_year].count += 1;
    }

    const sectors = Object.keys(sectorMap).map((k) => sectorMap[k]);
    const servicesArr = Object.keys(serviceMap).map((k) => serviceMap[k]);
    const locations = Object.keys(locationMap).map((k) => locationMap[k]);
    const completion_years = Object.keys(yearMap)
      .map((k) => yearMap[k])
      .sort((a, b) => a.year - b.year);

    return {
      sectors,
      services: servicesArr,
      locations,
      completion_years
    };
  }

  // 7. listCaseStudies
  listCaseStudies(
    sector,
    serviceId,
    location_state,
    from_year,
    to_year,
    page,
    page_size,
    sort_by
  ) {
    page = typeof page === 'number' && page > 0 ? page : 1;
    page_size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    sort_by = sort_by || 'most_recent';

    const services = this._getFromStorage('services');
    const all = this._getFromStorage('case_studies');

    let filtered = all.slice();

    if (sector) {
      filtered = filtered.filter((cs) => cs.sector === sector);
    }
    if (serviceId) {
      filtered = filtered.filter((cs) => cs.service_id === serviceId);
    }
    if (location_state) {
      filtered = filtered.filter((cs) => cs.location_state === location_state);
    }
    if (typeof from_year === 'number') {
      filtered = filtered.filter((cs) => cs.completion_year >= from_year);
    }
    if (typeof to_year === 'number') {
      filtered = filtered.filter((cs) => cs.completion_year <= to_year);
    }

    if (sort_by === 'alphabetical') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // most_recent
      filtered.sort((a, b) => {
        if (a.completion_year === b.completion_year) {
          const da = a.completion_date || '';
          const db = b.completion_date || '';
          return (db || '').localeCompare(da || '');
        }
        return b.completion_year - a.completion_year;
      });
    }

    const total_count = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = filtered.slice(start, end).map((cs) => {
      const svc = services.find((s) => s.id === cs.service_id) || null;
      return Object.assign({}, cs, { service: svc });
    });

    return {
      total_count,
      page,
      page_size,
      items: pageItems,
      applied_filters: {
        sector: sector || null,
        serviceId: serviceId || null,
        location_state: location_state || null,
        from_year: typeof from_year === 'number' ? from_year : null,
        to_year: typeof to_year === 'number' ? to_year : null,
        sort_by
      }
    };
  }

  // 8. getCaseStudyDetail
  getCaseStudyDetail(caseStudySlug) {
    const services = this._getFromStorage('services');
    const caseStudies = this._getFromStorage('case_studies');
    const favorites = this._getFromStorage('favorite_case_studies');

    const cs = caseStudies.find((c) => c.slug === caseStudySlug) || null;
    let case_study = null;
    if (cs) {
      const svc = services.find((s) => s.id === cs.service_id) || null;
      case_study = Object.assign({}, cs, { service: svc });
    }

    const is_favorite = !!(cs && favorites.find((f) => f.case_study_id === cs.id));

    let related_case_studies = [];
    if (cs) {
      related_case_studies = caseStudies
        .filter((c) => c.id !== cs.id && (c.sector === cs.sector || c.service_id === cs.service_id))
        .slice(0, 5)
        .map((c) => {
          const svc = services.find((s) => s.id === c.service_id) || null;
          return Object.assign({}, c, { service: svc });
        });
    }

    return {
      case_study,
      is_favorite,
      related_case_studies
    };
  }

  // 9. addCaseStudyToFavorites
  addCaseStudyToFavorites(caseStudyId, note) {
    const { favorite_case_studies } = this._getOrCreateUserLists();
    const caseStudies = this._getFromStorage('case_studies');

    const cs = caseStudies.find((c) => c.id === caseStudyId);
    if (!cs) {
      return { success: false, message: 'Invalid caseStudyId', favorite: null };
    }

    const existing = favorite_case_studies.find((f) => f.case_study_id === caseStudyId);
    if (existing) {
      return { success: true, message: 'Already in favorites', favorite: existing };
    }

    const favorite = {
      id: this._generateId('favcs'),
      case_study_id: caseStudyId,
      created_at: this._nowISO(),
      note: note || null
    };

    favorite_case_studies.push(favorite);
    this._saveToStorage('favorite_case_studies', favorite_case_studies);

    return {
      success: true,
      message: 'Case study added to favorites',
      favorite
    };
  }

  // 10. removeCaseStudyFromFavorites
  removeCaseStudyFromFavorites(caseStudyId) {
    const favorites = this._getFromStorage('favorite_case_studies');
    const before = favorites.length;
    const remaining = favorites.filter((f) => f.case_study_id !== caseStudyId);
    this._saveToStorage('favorite_case_studies', remaining);

    return {
      success: before !== remaining.length,
      message: before !== remaining.length ? 'Removed from favorites' : 'Not found in favorites'
    };
  }

  // 11. getFavoriteCaseStudies
  getFavoriteCaseStudies() {
    const favorites = this._getFromStorage('favorite_case_studies');
    const caseStudies = this._getFromStorage('case_studies');
    const services = this._getFromStorage('services');

    const items = favorites.map((fav) => {
      const cs = caseStudies.find((c) => c.id === fav.case_study_id) || null;
      let csWithService = null;
      if (cs) {
        const svc = services.find((s) => s.id === cs.service_id) || null;
        csWithService = Object.assign({}, cs, { service: svc });
      }
      return {
        favorite: fav,
        case_study: csWithService
      };
    });

    return { items };
  }

  // 12. getResourceFilterOptions
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources');

    const topicMap = {};
    const contentTypeMap = {};
    const yearMap = {};

    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];

      if (!topicMap[r.topic]) {
        topicMap[r.topic] = { value: r.topic, label: r.topic, count: 0 };
      }
      topicMap[r.topic].count += 1;

      if (!contentTypeMap[r.content_type]) {
        contentTypeMap[r.content_type] = { value: r.content_type, label: r.content_type, count: 0 };
      }
      contentTypeMap[r.content_type].count += 1;

      if (!yearMap[r.publication_year]) {
        yearMap[r.publication_year] = { year: r.publication_year, count: 0 };
      }
      yearMap[r.publication_year].count += 1;
    }

    const topics = Object.keys(topicMap).map((k) => topicMap[k]);
    const content_types = Object.keys(contentTypeMap).map((k) => contentTypeMap[k]);
    const publication_years = Object.keys(yearMap)
      .map((k) => yearMap[k])
      .sort((a, b) => a.year - b.year);

    return {
      topics,
      content_types,
      publication_years
    };
  }

  // 13. listResources
  listResources(
    topic,
    content_type,
    min_publication_year,
    max_publication_year,
    query,
    page,
    page_size,
    sort_by
  ) {
    page = typeof page === 'number' && page > 0 ? page : 1;
    page_size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    sort_by = sort_by || 'newest';

    let resources = this._getFromStorage('resources').slice();

    if (topic) {
      resources = resources.filter((r) => r.topic === topic);
    }
    if (content_type) {
      resources = resources.filter((r) => r.content_type === content_type);
    }
    if (typeof min_publication_year === 'number') {
      resources = resources.filter((r) => r.publication_year >= min_publication_year);
    }
    if (typeof max_publication_year === 'number') {
      resources = resources.filter((r) => r.publication_year <= max_publication_year);
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      resources = resources.filter((r) => {
        return (
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.summary && r.summary.toLowerCase().includes(q))
        );
      });
    }

    if (sort_by === 'oldest') {
      resources.sort((a, b) => a.publication_year - b.publication_year);
    } else {
      // newest or relevance -> newest
      resources.sort((a, b) => b.publication_year - a.publication_year);
    }

    const total_count = resources.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const items = resources.slice(start, end);

    return {
      total_count,
      page,
      page_size,
      items,
      applied_filters: {
        topic: topic || null,
        content_type: content_type || null,
        min_publication_year: typeof min_publication_year === 'number' ? min_publication_year : null,
        max_publication_year: typeof max_publication_year === 'number' ? max_publication_year : null,
        sort_by
      }
    };
  }

  // 14. getResourceDetail
  getResourceDetail(resourceSlug) {
    const resources = this._getFromStorage('resources');
    const readingList = this._getFromStorage('reading_list_items');

    const resource = resources.find((r) => r.slug === resourceSlug) || null;
    const is_in_reading_list = !!(resource && readingList.find((i) => i.resource_id === resource.id));

    let related_resources = [];
    if (resource) {
      related_resources = resources
        .filter((r) => r.id !== resource.id && r.topic === resource.topic)
        .slice(0, 5);
    }

    return {
      resource,
      is_in_reading_list,
      related_resources
    };
  }

  // 15. addResourceToReadingList
  addResourceToReadingList(resourceId, note) {
    const lists = this._getOrCreateUserLists();
    const readingList = lists.reading_list_items;
    const resources = this._getFromStorage('resources');

    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) {
      return { success: false, message: 'Invalid resourceId', item: null };
    }

    const existing = readingList.find((i) => i.resource_id === resourceId);
    if (existing) {
      return { success: true, message: 'Already in reading list', item: existing };
    }

    const item = {
      id: this._generateId('rli'),
      resource_id: resourceId,
      created_at: this._nowISO(),
      note: note || null
    };

    readingList.push(item);
    this._saveToStorage('reading_list_items', readingList);

    return {
      success: true,
      message: 'Resource added to reading list',
      item
    };
  }

  // 16. removeResourceFromReadingList
  removeResourceFromReadingList(resourceId) {
    const readingList = this._getFromStorage('reading_list_items');
    const before = readingList.length;
    const remaining = readingList.filter((i) => i.resource_id !== resourceId);
    this._saveToStorage('reading_list_items', remaining);

    return {
      success: before !== remaining.length,
      message: before !== remaining.length ? 'Removed from reading list' : 'Not found in reading list'
    };
  }

  // 17. getReadingListResources
  getReadingListResources() {
    const readingList = this._getFromStorage('reading_list_items');
    const resources = this._getFromStorage('resources');

    const items = readingList.map((item) => {
      const res = resources.find((r) => r.id === item.resource_id) || null;
      return {
        reading_list_item: item,
        resource: res
      };
    });

    return { items };
  }

  // 18. getTeamFilterOptions
  getTeamFilterOptions() {
    const members = this._getFromStorage('team_members');

    const roleMap = {};
    const locationMap = {};

    for (let i = 0; i < members.length; i++) {
      const m = members[i];

      if (!roleMap[m.role]) {
        roleMap[m.role] = {
          value: m.role,
          label: m.role,
          count: 0
        };
      }
      roleMap[m.role].count += 1;

      if (m.location_state) {
        if (!locationMap[m.location_state]) {
          locationMap[m.location_state] = {
            state: m.location_state,
            label: m.location_state,
            count: 0
          };
        }
        locationMap[m.location_state].count += 1;
      }
    }

    const roles = Object.keys(roleMap).map((k) => roleMap[k]);
    const locations = Object.keys(locationMap).map((k) => locationMap[k]);

    // Static experience bands config (not mocking data, just UI config)
    const experience_bands = [
      { min_years: 0, label: 'All experience levels' },
      { min_years: 5, label: '5+ years' },
      { min_years: 10, label: '10+ years' },
      { min_years: 20, label: '20+ years' }
    ];

    return {
      roles,
      locations,
      experience_bands
    };
  }

  // 19. listTeamMembers
  listTeamMembers(
    role,
    location_state,
    min_years_experience,
    is_senior,
    search,
    page,
    page_size,
    sort_by
  ) {
    page = typeof page === 'number' && page > 0 ? page : 1;
    page_size = typeof page_size === 'number' && page_size > 0 ? page_size : 50;
    sort_by = sort_by || 'last_name';

    const members = this._getFromStorage('team_members');
    const offices = this._getFromStorage('offices');

    let filtered = members.filter((m) => m.is_active !== false);

    if (role) {
      filtered = filtered.filter((m) => m.role === role);
    }
    if (location_state) {
      filtered = filtered.filter((m) => m.location_state === location_state);
    }
    if (typeof min_years_experience === 'number') {
      filtered = filtered.filter(
        (m) => typeof m.years_experience === 'number' && m.years_experience >= min_years_experience
      );
    }
    if (typeof is_senior === 'boolean') {
      filtered = filtered.filter((m) => !!m.is_senior === is_senior);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((m) => {
        const name = (m.full_name || (m.first_name + ' ' + m.last_name)).toLowerCase();
        const bio = (m.bio || '').toLowerCase();
        return name.includes(q) || bio.includes(q);
      });
    }

    if (sort_by === 'years_experience_desc') {
      filtered.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0));
    } else {
      // last_name
      filtered.sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
    }

    const total_count = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const items = filtered.slice(start, end).map((m) => {
      const office = offices.find((o) => o.id === m.primary_office_id) || null;
      return Object.assign({}, m, { primary_office: office });
    });

    return {
      total_count,
      page,
      page_size,
      items,
      applied_filters: {
        role: role || null,
        location_state: location_state || null,
        min_years_experience: typeof min_years_experience === 'number' ? min_years_experience : null,
        is_senior: typeof is_senior === 'boolean' ? is_senior : null
      }
    };
  }

  // 20. getTeamMemberProfile
  getTeamMemberProfile(teamMemberId) {
    const members = this._getFromStorage('team_members');
    const offices = this._getFromStorage('offices');

    const tm = members.find((m) => m.id === teamMemberId) || null;
    const primary_office = tm ? offices.find((o) => o.id === tm.primary_office_id) || null : null;

    const team_member = tm
      ? Object.assign({}, tm, { primary_office })
      : null;

    // No explicit relationship to case studies defined in schema; return empty list
    const associated_case_studies = [];

    return {
      team_member,
      primary_office,
      associated_case_studies
    };
  }

  // 21. sendTeamMemberMessage
  sendTeamMemberMessage(teamMemberId, subject, message, contact_name, contact_email, contact_phone) {
    const members = this._getFromStorage('team_members');
    const tm = members.find((m) => m.id === teamMemberId);

    if (!tm) {
      return { success: false, message: 'Invalid teamMemberId', record: null };
    }

    const messages = this._getFromStorage('team_member_messages');

    const record = {
      id: this._generateId('tmm'),
      team_member_id: teamMemberId,
      subject: subject || null,
      message,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      created_at: this._nowISO(),
      status: 'new'
    };

    messages.push(record);
    this._saveToStorage('team_member_messages', messages);

    return {
      success: true,
      message: 'Message sent',
      record
    };
  }

  // 22. getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events');

    const topicMap = {};
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!topicMap[ev.topic]) {
        topicMap[ev.topic] = { value: ev.topic, label: ev.topic, count: 0 };
      }
      topicMap[ev.topic].count += 1;
    }

    const topics = Object.keys(topicMap).map((k) => topicMap[k]);

    const date_presets = [
      { key: 'next_30_days', label: 'Next 30 days' },
      { key: 'next_60_days', label: 'Next 60 days' }
    ];

    return {
      topics,
      date_presets
    };
  }

  // 23. listEvents
  listEvents(topic, status, date_from, date_to, only_free, page, page_size, sort_by) {
    page = typeof page === 'number' && page > 0 ? page : 1;
    page_size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    sort_by = sort_by || 'start_date_asc';
    status = status || 'upcoming';

    let events = this._getFromStorage('events').slice();

    if (topic) {
      events = events.filter((e) => e.topic === topic);
    }
    if (status) {
      events = events.filter((e) => e.status === status);
    }

    let fromDate = null;
    let toDate = null;
    if (date_from) {
      fromDate = new Date(date_from);
    }
    if (date_to) {
      toDate = new Date(date_to);
    }

    if (fromDate || toDate) {
      events = events.filter((e) => {
        const start = new Date(e.start_datetime);
        if (fromDate && start < fromDate) return false;
        if (toDate && start > toDate) return false;
        return true;
      });
    }

    if (only_free) {
      events = events.filter((e) => e.is_free === true || e.price === 0);
    }

    if (sort_by === 'start_date_desc') {
      events.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
    } else {
      // start_date_asc
      events.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    const total_count = events.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const items = events.slice(startIndex, endIndex);

    return {
      total_count,
      page,
      page_size,
      items,
      applied_filters: {
        topic: topic || null,
        status: status || null,
        date_from: date_from || null,
        date_to: date_to || null,
        only_free: !!only_free
      }
    };
  }

  // 24. getEventDetail
  getEventDetail(eventSlug) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.slug === eventSlug) || null;

    let can_register_on_site = false;
    if (event && event.status === 'upcoming' && !event.registration_url) {
      can_register_on_site = true;
    }

    return {
      event,
      can_register_on_site
    };
  }

  // 25. registerForEvent
  registerForEvent(eventId, first_name, last_name, email, subscribe_newsletter) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return { success: false, message: 'Invalid eventId', registration: null };
    }

    const registrations = this._getFromStorage('event_registrations');

    const registration = {
      id: this._generateId('ereg'),
      event_id: eventId,
      first_name,
      last_name,
      email,
      subscribe_newsletter: !!subscribe_newsletter,
      registration_datetime: this._nowISO(),
      status: 'registered'
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      message: 'Registered for event',
      registration
    };
  }

  // 26. getOfficesForMap
  getOfficesForMap() {
    const offices = this._getFromStorage('offices');
    return { offices };
  }

  // 27. findNearestOfficeByPostalCode
  findNearestOfficeByPostalCode(postal_code, country) {
    country = country || 'US';
    const offices = this._getFromStorage('offices');

    const coords = this._resolvePostalCodeToCoordinates(postal_code, country);

    const nearby_offices = [];
    for (let i = 0; i < offices.length; i++) {
      const o = offices[i];
      if (typeof o.latitude === 'number' && typeof o.longitude === 'number') {
        const dist = this._distanceMiles(coords.latitude, coords.longitude, o.latitude, o.longitude);
        nearby_offices.push({ office: o, distance_miles: dist });
      }
    }

    nearby_offices.sort((a, b) => a.distance_miles - b.distance_miles);

    const nearest_office = nearby_offices.length > 0 ? nearby_offices[0].office : null;
    const distance_miles = nearby_offices.length > 0 ? nearby_offices[0].distance_miles : null;

    return {
      postal_code,
      coordinates: coords,
      nearest_office,
      distance_miles,
      nearby_offices
    };
  }

  // 28. getOfficeDetail
  getOfficeDetail(officeId) {
    const offices = this._getFromStorage('offices');
    const office = offices.find((o) => o.id === officeId) || null;
    return { office };
  }

  // 29. submitGeneralContactInquiry
  submitGeneralContactInquiry(
    subject,
    message,
    contact_name,
    contact_email,
    contact_phone,
    inquiry_type,
    related_office_id,
    related_office_phone
  ) {
    const offices = this._getFromStorage('offices');
    const inquiries = this._getFromStorage('general_contact_inquiries');

    let officeId = related_office_id || null;
    if (officeId && !offices.find((o) => o.id === officeId)) {
      officeId = null; // invalid office id, ignore
    }

    const inquiry = {
      id: this._generateId('gci'),
      subject: subject || null,
      message,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      inquiry_type,
      related_office_id: officeId,
      related_office_phone: related_office_phone || null,
      created_at: this._nowISO(),
      status: 'new'
    };

    inquiries.push(inquiry);
    this._saveToStorage('general_contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted',
      inquiry
    };
  }

  // 30. getServiceFinderConfig
  getServiceFinderConfig() {
    const property_type_options = [
      { value: 'commercial', label: 'Commercial' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'gas_station', label: 'Gas Station' },
      { value: 'retail_fueling', label: 'Retail Fueling' },
      { value: 'residential', label: 'Residential' },
      { value: 'mining_site', label: 'Mining Site' },
      { value: 'other', label: 'Other' }
    ];

    const issue_type_options = [
      { value: 'leaking_underground_storage_tank', label: 'Leaking Underground Storage Tank' },
      { value: 'ust_leak', label: 'UST Leak' },
      { value: 'soil_contamination', label: 'Soil Contamination' },
      { value: 'groundwater_contamination', label: 'Groundwater Contamination' },
      { value: 'mine_reclamation', label: 'Mine Reclamation' },
      { value: 'assessment', label: 'Site Assessment' },
      { value: 'other', label: 'Other' }
    ];

    return {
      property_type_options,
      issue_type_options,
      regulator_question_text: 'Have regulators been notified about this issue?',
      help_text: 'Answer a few questions and we will recommend the most relevant consulting service.'
    };
  }

  // 31. runServiceFinder
  runServiceFinder(property_type, issue_type, regulator_notified, additional_notes) {
    const services = this._getFromStorage('services');
    const runs = this._getFromStorage('service_finder_runs');

    const recommended_service = this._calculateServiceFinderRecommendation(
      property_type,
      issue_type,
      regulator_notified
    );

    if (!recommended_service) {
      return { success: false, run: null, recommended_service: null };
    }

    const run = {
      id: this._generateId('sfr'),
      property_type,
      issue_type,
      regulator_notified: !!regulator_notified,
      additional_notes: additional_notes || null,
      recommended_service_id: recommended_service.id,
      created_at: this._nowISO(),
      result_summary:
        'Recommended service: ' + (recommended_service.name || recommended_service.slug)
    };

    runs.push(run);
    this._saveToStorage('service_finder_runs', runs);

    // Also ensure we return the full recommended_service object as-is from storage list
    const fullService = services.find((s) => s.id === recommended_service.id) || recommended_service;

    return {
      success: true,
      run,
      recommended_service: fullService
    };
  }

  // 32. getProjectDurationEstimatorConfig
  getProjectDurationEstimatorConfig() {
    const property_type_options = [
      { value: 'industrial', label: 'Industrial' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'residential', label: 'Residential' },
      { value: 'mining_site', label: 'Mining Site' },
      { value: 'other', label: 'Other' }
    ];

    const regulatory_oversight_options = [
      { value: 'none', label: 'None' },
      { value: 'state', label: 'State' },
      { value: 'federal', label: 'Federal' },
      { value: 'state_and_federal', label: 'State and Federal' }
    ];

    return {
      property_type_options,
      regulatory_oversight_options,
      site_size_help_text: 'Enter site size in acres (e.g., 5 for a 5-acre property).'
    };
  }

  // 33. calculateProjectDurationEstimate
  calculateProjectDurationEstimate(property_type, site_size_acres, regulatory_oversight, input_notes) {
    const estimates = this._getFromStorage('project_duration_estimates');

    const duration = this._computeProjectDuration(property_type, site_size_acres, regulatory_oversight);

    const estimate = {
      id: this._generateId('pde'),
      property_type,
      site_size_acres,
      regulatory_oversight,
      calculated_duration_value: duration.calculated_duration_value,
      calculated_duration_unit: duration.calculated_duration_unit,
      created_at: this._nowISO(),
      input_notes: input_notes || null
    };

    estimates.push(estimate);
    this._saveToStorage('project_duration_estimates', estimates);

    const oversightLabelMap = {
      none: 'no regulatory oversight',
      state: 'state oversight',
      federal: 'federal oversight',
      state_and_federal: 'state and federal oversight'
    };

    const human_readable_summary =
      'Estimated duration: ' +
      estimate.calculated_duration_value +
      ' ' +
      estimate.calculated_duration_unit +
      ' for a ' +
      site_size_acres +
      '-acre ' +
      property_type.replace('_', ' ') +
      ' site with ' +
      (oversightLabelMap[regulatory_oversight] || regulatory_oversight) +
      '.';

    return {
      success: true,
      estimate,
      human_readable_summary
    };
  }

  // 34. createPlanningNote
  createPlanningNote(
    project_name,
    description,
    contact_email,
    related_estimate_id,
    estimated_duration_value,
    estimated_duration_unit
  ) {
    const notes = this._getFromStorage('planning_notes');
    const estimates = this._getFromStorage('project_duration_estimates');

    let estVal = estimated_duration_value;
    let estUnit = estimated_duration_unit;

    if (related_estimate_id && (estVal == null || !estUnit)) {
      const est = estimates.find((e) => e.id === related_estimate_id);
      if (est) {
        if (estVal == null) estVal = est.calculated_duration_value;
        if (!estUnit) estUnit = est.calculated_duration_unit;
      }
    }

    const note = {
      id: this._generateId('pn'),
      project_name: project_name || null,
      description,
      contact_email: contact_email || null,
      created_at: this._nowISO(),
      estimated_duration_value: typeof estVal === 'number' ? estVal : null,
      estimated_duration_unit: estUnit || null,
      related_estimate_id: related_estimate_id || null
    };

    notes.push(note);
    this._saveToStorage('planning_notes', notes);

    return {
      success: true,
      message: 'Planning note created',
      note
    };
  }

  // 35. getPlanningNotesSummary
  getPlanningNotesSummary() {
    const notes = this._getFromStorage('planning_notes');
    const estimates = this._getFromStorage('project_duration_estimates');

    const enrichedNotes = notes.map((n) => {
      const related = n.related_estimate_id
        ? estimates.find((e) => e.id === n.related_estimate_id) || null
        : null;
      return Object.assign({}, n, { related_estimate: related });
    });

    return {
      notes: enrichedNotes
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
