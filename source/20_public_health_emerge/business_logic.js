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
  // Initialization & storage
  // ------------------------
  _initStorage() {
    const keys = [
      'resources',
      'my_plan',
      'my_plan_items',
      'emergency_supply_kits',
      'kit_catalog_items',
      'emergency_supply_kit_items',
      'locations',
      'location_opening_hours',
      'printable_locations_lists',
      'printable_locations_list_items',
      'training_events',
      'training_registrations',
      'population_segments',
      'alert_subscriptions',
      'my_resources_lists',
      'my_resources_list_items',
      'download_later_lists',
      'download_later_list_items',
      'communication_plans',
      'communication_plan_contacts',
      'communication_plan_meeting_places'
    ];

    for (const k of keys) {
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, JSON.stringify([]));
      }
    }

    // Homepage and About content containers (no mock records, just structure)
    if (!localStorage.getItem('homepage_content')) {
      localStorage.setItem(
        'homepage_content',
        JSON.stringify({
          urgentAlerts: [],
          seasonalGuidance: [],
          quickStartTasks: []
        })
      );
    }

    if (!localStorage.getItem('hazard_categories')) {
      // Predefined hazard categories based on enum values
      const hazardCategories = [
        {
          code: 'infectious_disease_pandemics',
          name: 'Infectious Disease & Pandemics',
          description: 'Information about flu, COVID-19, and other infectious disease outbreaks.',
          icon_key: 'virus'
        },
        {
          code: 'heatwave_extreme_heat',
          name: 'Heatwave / Extreme Heat',
          description: 'Guidance for staying safe during periods of extreme heat.',
          icon_key: 'heat'
        },
        {
          code: 'flooding',
          name: 'Flooding',
          description: 'Preparedness and response resources for floods.',
          icon_key: 'flood'
        },
        {
          code: 'earthquake',
          name: 'Earthquake',
          description: 'Earthquake safety and preparedness information.',
          icon_key: 'earthquake'
        },
        {
          code: 'wildfire',
          name: 'Wildfire',
          description: 'Resources for preparing for and responding to wildfires.',
          icon_key: 'fire'
        },
        {
          code: 'air_quality_smoke',
          name: 'Air Quality / Smoke',
          description: 'Air quality and smoke health guidance.',
          icon_key: 'air_quality'
        },
        {
          code: 'multi_hazard',
          name: 'Multiple Hazards',
          description: 'Resources that apply across multiple hazards.',
          icon_key: 'multi_hazard'
        },
        {
          code: 'other',
          name: 'Other Hazards',
          description: 'Other emergency and public health threats.',
          icon_key: 'other'
        }
      ];
      localStorage.setItem('hazard_categories', JSON.stringify(hazardCategories));
    }

    if (!localStorage.getItem('about_and_help_content')) {
      const aboutAndHelp = {
        about: {
          site_name: 'Public Health Emergency Preparedness',
          owner: 'Local Health Department',
          purpose:
            'Provide residents, families, and organizations with resources to prepare for, respond to, and recover from public health emergencies.'
        },
        faqs: [],
        contacts: [],
        policies: []
      };
      localStorage.setItem('about_and_help_content', JSON.stringify(aboutAndHelp));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ------------------------
  // Enum label helpers
  // ------------------------
  _getHazardLabel(code) {
    switch (code) {
      case 'infectious_disease_pandemics':
        return 'Infectious Disease & Pandemics';
      case 'heatwave_extreme_heat':
        return 'Heatwave / Extreme Heat';
      case 'flooding':
        return 'Flooding';
      case 'earthquake':
        return 'Earthquake';
      case 'wildfire':
        return 'Wildfire';
      case 'air_quality_smoke':
        return 'Air Quality / Smoke';
      case 'multi_hazard':
        return 'Multiple Hazards';
      case 'other':
        return 'Other';
      default:
        return code || '';
    }
  }

  _getAudienceLabel(code) {
    switch (code) {
      case 'general_public':
        return 'General Public';
      case 'households_with_children':
        return 'Households with Children';
      case 'older_adults_65_plus':
        return 'Older Adults (65+)';
      case 'parents_caregivers':
        return 'Parents & Caregivers';
      case 'workplaces_offices':
        return 'Workplaces / Offices';
      case 'healthcare_workers':
        return 'Healthcare Workers';
      case 'schools_childcare':
        return 'Schools & Childcare';
      case 'emergency_responders':
        return 'Emergency Responders';
      case 'other':
        return 'Other';
      default:
        return code || '';
    }
  }

  _getResourceTypeLabel(code) {
    switch (code) {
      case 'checklist':
        return 'Checklist';
      case 'guide':
        return 'Guide';
      case 'poster_flyer':
        return 'Poster / Flyer';
      case 'toolkit':
        return 'Toolkit';
      case 'fact_sheet':
        return 'Fact Sheet';
      case 'web_page':
        return 'Web Page';
      case 'video':
        return 'Video';
      case 'hotline_helpline':
        return 'Hotline / Helpline';
      case 'training_material':
        return 'Training Material';
      case 'other':
        return 'Other';
      default:
        return code || '';
    }
  }

  _getSettingLabel(code) {
    switch (code) {
      case 'household_home':
        return 'Household / Home';
      case 'workplace_office':
        return 'Workplace / Office';
      case 'school_childcare':
        return 'School / Childcare';
      case 'community_center':
        return 'Community Center';
      case 'healthcare_setting':
        return 'Healthcare Setting';
      case 'outdoor':
        return 'Outdoor';
      case 'online_only':
        return 'Online Only';
      case 'multi_setting':
        return 'Multiple Settings';
      case 'other':
        return 'Other';
      default:
        return code || '';
    }
  }

  _getLanguageLabel(code) {
    switch (code) {
      case 'english':
        return 'English';
      case 'spanish':
        return 'Spanish';
      case 'chinese_simplified':
        return 'Chinese (Simplified)';
      case 'chinese_traditional':
        return 'Chinese (Traditional)';
      case 'vietnamese':
        return 'Vietnamese';
      case 'tagalog':
        return 'Tagalog';
      case 'other':
        return 'Other';
      default:
        return code || '';
    }
  }

  _getSupportTypeLabel(code) {
    switch (code) {
      case 'hotline_helpline':
        return 'Hotline / Helpline';
      case 'text_line':
        return 'Text Line';
      case 'online_chat':
        return 'Online Chat';
      case 'in_person_service':
        return 'In-person Service';
      case 'online_resource':
        return 'Online Resource';
      case 'support_group':
        return 'Support Group';
      case 'other':
        return 'Other';
      default:
        return code || '';
    }
  }

  _getAvailabilityLabel(code) {
    switch (code) {
      case 'hours_24_7':
        return '24/7';
      case 'business_hours':
        return 'Business Hours';
      case 'limited_hours':
        return 'Limited Hours';
      case 'seasonal':
        return 'Seasonal';
      case 'unknown':
        return 'Unknown';
      default:
        return code || '';
    }
  }

  _getKitCategoryLabel(code) {
    switch (code) {
      case 'water_beverages':
        return 'Water & Beverages';
      case 'food_nutrition':
        return 'Food & Nutrition';
      case 'health_medications':
        return 'Health & Medications';
      case 'safety_tools':
        return 'Safety & Tools';
      case 'hygiene_comfort':
        return 'Hygiene & Comfort';
      case 'other':
        return 'Other';
      default:
        return code || '';
    }
  }

  _getTrainingFormatLabel(code) {
    switch (code) {
      case 'online':
        return 'Online';
      case 'in_person':
        return 'In-person';
      case 'hybrid':
        return 'Hybrid';
      default:
        return code || '';
    }
  }

  _getTrainingLevelLabel(code) {
    switch (code) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      case 'all_levels':
        return 'All Levels';
      default:
        return code || '';
    }
  }

  _getTrainingDurationLabel(code) {
    switch (code) {
      case 'under_2_hours':
        return 'Under 2 hours';
      case 'two_to_four_hours':
        return '2–4 hours';
      case 'half_day':
        return 'Half day';
      case 'full_day':
        return 'Full day';
      case 'multi_day':
        return 'Multi-day';
      default:
        return code || '';
    }
  }

  // ------------------------
  // Generic resource filtering helper
  // ------------------------
  _filterAndSortResources(resources, options) {
    const {
      hazardType,
      primaryAudience,
      resourceTypes,
      setting,
      language,
      supportType,
      availability,
      lastUpdatedFrom,
      lastUpdatedTo,
      lastUpdatedRangeCode,
      searchQuery,
      primaryHazardType,
      hazardKeywords,
      isSinglePage,
      sortBy,
      sortDirection
    } = options || {};

    let filtered = resources.filter(function (r) {
      if (!r.is_active) return false;

      if (hazardType && r.primary_hazard_type !== hazardType) return false;
      if (primaryHazardType && r.primary_hazard_type !== primaryHazardType) return false;

      if (primaryAudience && r.primary_audience !== primaryAudience) return false;

      if (resourceTypes && resourceTypes.length > 0 && resourceTypes.indexOf(r.resource_type) === -1) {
        return false;
      }

      if (setting && r.setting && r.setting !== setting) return false;
      if (language && r.language !== language) return false;
      if (supportType && r.support_type && r.support_type !== supportType) return false;
      if (availability && r.availability && r.availability !== availability) return false;

      if (typeof isSinglePage === 'boolean') {
        if (!!r.is_single_page !== isSinglePage) return false;
      }

      if (hazardKeywords && hazardKeywords.length > 0) {
        const kw = Array.isArray(r.hazard_keywords) ? r.hazard_keywords : [];
        const intersection = hazardKeywords.some(function (k) {
          return kw.indexOf(k) !== -1;
        });
        if (!intersection) return false;
      }

      // Last updated range
      let from = lastUpdatedFrom ? new Date(lastUpdatedFrom) : null;
      let to = lastUpdatedTo ? new Date(lastUpdatedTo) : null;

      if (lastUpdatedRangeCode) {
        const now = new Date();
        const fromCalc = new Date(now.getTime());
        if (lastUpdatedRangeCode === 'within_6_months') {
          fromCalc.setMonth(fromCalc.getMonth() - 6);
        } else if (lastUpdatedRangeCode === 'within_1_year') {
          fromCalc.setFullYear(fromCalc.getFullYear() - 1);
        } else if (lastUpdatedRangeCode === 'within_2_years') {
          fromCalc.setFullYear(fromCalc.getFullYear() - 2);
        }
        from = fromCalc;
      }

      if (from || to) {
        if (!r.last_updated) return false;
        const lu = new Date(r.last_updated);
        if (from && lu < from) return false;
        if (to && lu > to) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inTitle = (r.title || '').toLowerCase().indexOf(q) !== -1;
        const inDesc = (r.description || '').toLowerCase().indexOf(q) !== -1;
        const inTags = (Array.isArray(r.tags) ? r.tags : []).some(function (t) {
          return (t || '').toLowerCase().indexOf(q) !== -1;
        });
        if (!inTitle && !inDesc && !inTags) return false;
      }

      return true;
    });

    const sb = sortBy || 'last_updated';
    const dir = sortDirection === 'asc' ? 1 : -1;

    filtered.sort(function (a, b) {
      if (sb === 'title') {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1 * dir;
        if (at > bt) return 1 * dir;
        return 0;
      }
      // default last_updated
      const ad = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const bd = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      if (ad < bd) return -1 * dir;
      if (ad > bd) return 1 * dir;
      return 0;
    });

    return filtered;
  }

  // ------------------------
  // Location helpers
  // ------------------------
  _timeToMinutes(t) {
    if (!t) return null;
    const parts = t.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  _isoDateToDayOfWeek(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const day = d.getUTCDay(); // 0-6, Sunday=0
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[day] || null;
  }

  _isLocationOpenInWindow(locationId, date, timeStart, timeEnd) {
    const dayOfWeek = this._isoDateToDayOfWeek(date);
    if (!dayOfWeek) return false;

    const hours = this._getFromStorage('location_opening_hours', []);
    const entries = hours.filter(function (h) {
      return h.location_id === locationId && h.day_of_week === dayOfWeek;
    });

    if (entries.length === 0) return false;

    const startMin = this._timeToMinutes(timeStart);
    const endMin = this._timeToMinutes(timeEnd);
    if (startMin === null || endMin === null) return false;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.is_closed) continue;
      if (e.is_24_hours) return true;
      const openMin = this._timeToMinutes(e.open_time);
      const closeMin = this._timeToMinutes(e.close_time);
      if (openMin === null || closeMin === null) continue;
      if (openMin <= startMin && closeMin >= endMin) {
        return true;
      }
    }
    return false;
  }

  _buildOpeningHoursSummaryForLocation(locationId) {
    const hours = this._getFromStorage('location_opening_hours', []);
    const entries = hours.filter(function (h) {
      return h.location_id === locationId;
    });
    if (!entries.length) return 'Hours not available';

    const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const labelMap = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    };

    entries.sort(function (a, b) {
      return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week);
    });

    const parts = entries.map(function (e) {
      const dayLabel = labelMap[e.day_of_week] || e.day_of_week;
      if (e.is_closed) return dayLabel + ': Closed';
      if (e.is_24_hours) return dayLabel + ': 24 hours';
      return dayLabel + ': ' + (e.open_time || '') + '–' + (e.close_time || '');
    });
    return parts.join('; ');
  }

  _deg2rad(deg) {
    return (deg * Math.PI) / 180;
  }

  _haversineDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' ||
      typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' ||
      typeof lon2 !== 'number'
    ) {
      return null;
    }
    const R = 3958.8; // Earth radius in miles
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(lat1)) *
        Math.cos(this._deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _getCoordinatesForSearchText(searchText) {
    // Simple heuristic: use first location matching postal_code or city
    const txt = (searchText || '').trim().toLowerCase();
    if (!txt) return { lat: null, lon: null };
    const locations = this._getFromStorage('locations', []);
    let match = locations.find(function (l) {
      return (l.postal_code || '').toLowerCase() === txt;
    });
    if (!match) {
      match = locations.find(function (l) {
        return (l.city || '').toLowerCase() === txt;
      });
    }
    if (match && typeof match.latitude === 'number' && typeof match.longitude === 'number') {
      return { lat: match.latitude, lon: match.longitude };
    }
    return { lat: null, lon: null };
  }

  _searchLocationsWithAvailability(searchText, radiusMiles, filters, sortBy, page, pageSize) {
    const locations = this._getFromStorage('locations', []);
    const center = this._getCoordinatesForSearchText(searchText);
    const hasCenter = typeof center.lat === 'number' && typeof center.lon === 'number' && center.lat !== null && center.lon !== null;

    const locTypes = (filters && filters.locationTypes) || [];
    const date = filters && filters.date;
    const timeStart = filters && filters.timeStart;
    const timeEnd = filters && filters.timeEnd;

    const radius = typeof radiusMiles === 'number' ? radiusMiles : 10;

    const results = [];

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      if (!loc.is_active) continue;

      if (locTypes.length > 0 && locTypes.indexOf(loc.location_type) === -1) continue;

      let distance = null;
      if (hasCenter && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        distance = this._haversineDistanceMiles(center.lat, center.lon, loc.latitude, loc.longitude);
      }

      if (distance !== null && distance > radius) continue;

      let isOpen = true;
      if (date && timeStart && timeEnd) {
        isOpen = this._isLocationOpenInWindow(loc.id, date, timeStart, timeEnd);
        if (!isOpen) continue;
      }

      const openingSummary = this._buildOpeningHoursSummaryForLocation(loc.id);

      results.push({
        location_id: loc.id,
        name: loc.name,
        location_type: loc.location_type,
        address_line1: loc.address_line1,
        address_line2: loc.address_line2 || '',
        city: loc.city,
        state: loc.state,
        postal_code: loc.postal_code,
        distance_miles: distance,
        is_accessible: !!loc.is_accessible,
        is_open_in_requested_window: !!isOpen,
        openingHoursSummary: openingSummary
      });
    }

    const sb = sortBy || 'distance';
    results.sort(function (a, b) {
      if (sb === 'name') {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      }
      // distance
      const ad = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
      const bd = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
      if (ad < bd) return -1;
      if (ad > bd) return 1;
      return 0;
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      totalCount: results.length,
      page: p,
      pageSize: ps,
      results: paged
    };
  }

  // ------------------------
  // MyPlan helpers
  // ------------------------
  _getOrCreateMyPlan() {
    const plans = this._getFromStorage('my_plan', []);
    if (plans.length > 0) return plans[0];
    const now = this._nowIso();
    const plan = {
      id: this._generateId('myplan'),
      name: 'My Plan',
      notes: '',
      created_at: now,
      updated_at: now
    };
    plans.push(plan);
    this._saveToStorage('my_plan', plans);
    return plan;
  }

  _getOrCreateMyResourcesList() {
    const lists = this._getFromStorage('my_resources_lists', []);
    if (lists.length > 0) return lists[0];
    const now = this._nowIso();
    const list = {
      id: this._generateId('myresources'),
      name: 'My Resources',
      notes: '',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('my_resources_lists', lists);
    return list;
  }

  _getOrCreateDownloadLaterList() {
    const lists = this._getFromStorage('download_later_lists', []);
    if (lists.length > 0) return lists[0];
    const now = this._nowIso();
    const list = {
      id: this._generateId('downloadlater'),
      name: 'Download Later',
      notes: '',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('download_later_lists', lists);
    return list;
  }

  _getOrCreateEmergencySupplyKit() {
    const kits = this._getFromStorage('emergency_supply_kits', []);
    let kit = kits.find(function (k) {
      return k.status === 'in_progress';
    });
    if (kit) return kit;
    const now = this._nowIso();
    kit = {
      id: this._generateId('kit'),
      name: 'Emergency Supply Kit',
      duration_days: 0,
      number_of_people: 0,
      maximum_budget: null,
      total_estimated_cost: 0,
      total_items_count: 0,
      status: 'in_progress',
      created_at: now,
      updated_at: now
    };
    kits.push(kit);
    this._saveToStorage('emergency_supply_kits', kits);
    return kit;
  }

  _recalculateEmergencySupplyKitTotals(kitId) {
    const kits = this._getFromStorage('emergency_supply_kits', []);
    const items = this._getFromStorage('emergency_supply_kit_items', []);
    const kit = kits.find(function (k) {
      return k.id === kitId;
    });
    if (!kit) return null;
    const kitItems = items.filter(function (i) {
      return i.kit_id === kitId;
    });
    let totalCost = 0;
    let totalItemsCount = 0;
    for (let i = 0; i < kitItems.length; i++) {
      const qty = Number(kitItems[i].quantity) || 0;
      const price = Number(kitItems[i].estimated_price) || 0;
      totalCost += price;
      totalItemsCount += qty > 0 ? qty : 0;
    }
    kit.total_estimated_cost = totalCost;
    kit.total_items_count = totalItemsCount;
    kit.updated_at = this._nowIso();
    this._saveToStorage('emergency_supply_kits', kits);

    const maxBudget = typeof kit.maximum_budget === 'number' ? kit.maximum_budget : null;
    const remaining = maxBudget !== null ? maxBudget - totalCost : null;
    const budgetStatus = {
      maximum_budget: maxBudget,
      total_estimated_cost: totalCost,
      remaining_budget: remaining,
      is_over_budget: maxBudget !== null ? totalCost > maxBudget : false
    };
    return { kit: kit, budgetStatus: budgetStatus };
  }

  _getOrCreateCommunicationPlan() {
    const plans = this._getFromStorage('communication_plans', []);
    let plan = plans.find(function (p) {
      return p.status === 'in_progress';
    });
    if (plan) return plan;
    const now = this._nowIso();
    plan = {
      id: this._generateId('commplan'),
      name: 'Family Communication Plan',
      household_member_count: 0,
      status: 'in_progress',
      plan_summary_generated: false,
      summary_text: '',
      created_at: now,
      updated_at: now
    };
    plans.push(plan);
    this._saveToStorage('communication_plans', plans);
    return plan;
  }

  _getOrCreatePrintableLocationsList() {
    const lists = this._getFromStorage('printable_locations_lists', []);
    if (lists.length > 0) return lists[0];
    const now = this._nowIso();
    const list = {
      id: this._generateId('printlocs'),
      name: 'My Locations List',
      notes: '',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('printable_locations_lists', lists);
    return list;
  }

  _getOrCreateAlertSubscription() {
    const subs = this._getFromStorage('alert_subscriptions', []);
    if (subs.length > 0) return subs[0];
    const now = this._nowIso();
    const sub = {
      id: this._generateId('alertsub'),
      delivery_method: 'sms_text',
      phone_number: '',
      email: '',
      location_type: 'county',
      location_value: '',
      wildfire_alerts_enabled: false,
      air_quality_smoke_alerts_enabled: false,
      flooding_alerts_enabled: false,
      earthquake_alerts_enabled: false,
      heatwave_alerts_enabled: false,
      infectious_disease_alerts_enabled: false,
      other_alerts_enabled: false,
      quiet_hours_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      created_at: now,
      updated_at: now,
      is_active: true
    };
    subs.push(sub);
    this._saveToStorage('alert_subscriptions', subs);
    return sub;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomepageContent
  getHomepageContent() {
    const content = this._getFromStorage('homepage_content', {
      urgentAlerts: [],
      seasonalGuidance: [],
      quickStartTasks: []
    });
    return {
      urgentAlerts: content.urgentAlerts || [],
      seasonalGuidance: content.seasonalGuidance || [],
      quickStartTasks: content.quickStartTasks || []
    };
  }

  // getHazardCategories
  getHazardCategories() {
    return this._getFromStorage('hazard_categories', []);
  }

  // getResourceFilterOptions(context, hazardType?, populationCode?)
  getResourceFilterOptions(context, hazardType, populationCode) {
    // Options derived from enums; not persisted per-record
    const audienceOptions = [
      { code: 'general_public', label: 'General Public' },
      { code: 'households_with_children', label: 'Households with Children' },
      { code: 'older_adults_65_plus', label: 'Older Adults (65+)' },
      { code: 'parents_caregivers', label: 'Parents & Caregivers' },
      { code: 'workplaces_offices', label: 'Workplaces / Offices' },
      { code: 'healthcare_workers', label: 'Healthcare Workers' },
      { code: 'schools_childcare', label: 'Schools & Childcare' },
      { code: 'emergency_responders', label: 'Emergency Responders' },
      { code: 'other', label: 'Other' }
    ];

    const resourceTypeOptions = [
      { code: 'checklist', label: 'Checklist' },
      { code: 'guide', label: 'Guide' },
      { code: 'poster_flyer', label: 'Poster / Flyer' },
      { code: 'toolkit', label: 'Toolkit' },
      { code: 'fact_sheet', label: 'Fact Sheet' },
      { code: 'web_page', label: 'Web Page' },
      { code: 'video', label: 'Video' },
      { code: 'hotline_helpline', label: 'Hotline / Helpline' },
      { code: 'training_material', label: 'Training Material' },
      { code: 'other', label: 'Other' }
    ];

    const settingOptions = [
      { code: 'household_home', label: 'Household / Home' },
      { code: 'workplace_office', label: 'Workplace / Office' },
      { code: 'school_childcare', label: 'School / Childcare' },
      { code: 'community_center', label: 'Community Center' },
      { code: 'healthcare_setting', label: 'Healthcare Setting' },
      { code: 'outdoor', label: 'Outdoor' },
      { code: 'online_only', label: 'Online Only' },
      { code: 'multi_setting', label: 'Multiple Settings' },
      { code: 'other', label: 'Other' }
    ];

    const languageOptions = [
      { code: 'english', label: 'English' },
      { code: 'spanish', label: 'Spanish' },
      { code: 'chinese_simplified', label: 'Chinese (Simplified)' },
      { code: 'chinese_traditional', label: 'Chinese (Traditional)' },
      { code: 'vietnamese', label: 'Vietnamese' },
      { code: 'tagalog', label: 'Tagalog' },
      { code: 'other', label: 'Other' }
    ];

    const supportTypeOptions = [
      { code: 'hotline_helpline', label: 'Hotline / Helpline' },
      { code: 'text_line', label: 'Text Line' },
      { code: 'online_chat', label: 'Online Chat' },
      { code: 'in_person_service', label: 'In-person Service' },
      { code: 'online_resource', label: 'Online Resource' },
      { code: 'support_group', label: 'Support Group' },
      { code: 'other', label: 'Other' }
    ];

    const availabilityOptions = [
      { code: 'hours_24_7', label: '24/7' },
      { code: 'business_hours', label: 'Business Hours' },
      { code: 'limited_hours', label: 'Limited Hours' },
      { code: 'seasonal', label: 'Seasonal' },
      { code: 'unknown', label: 'Unknown' }
    ];

    const lastUpdatedRangeOptions = [
      { code: 'within_6_months', label: 'Within the last 6 months' },
      { code: 'within_1_year', label: 'Within the last year' },
      { code: 'within_2_years', label: 'Within the last 2 years' }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance', default_direction: 'desc' },
      { value: 'last_updated', label: 'Last Updated', default_direction: 'desc' },
      { value: 'title', label: 'Title', default_direction: 'asc' }
    ];

    return {
      audienceOptions: audienceOptions,
      resourceTypeOptions: resourceTypeOptions,
      settingOptions: settingOptions,
      languageOptions: languageOptions,
      supportTypeOptions: supportTypeOptions,
      availabilityOptions: availabilityOptions,
      lastUpdatedRangeOptions: lastUpdatedRangeOptions,
      sortOptions: sortOptions
    };
  }

  // getHazardResources(hazardType, filters?, sortBy?, sortDirection?, page?, pageSize?)
  getHazardResources(hazardType, filters, sortBy, sortDirection, page, pageSize) {
    const resources = this._getFromStorage('resources', []);
    const filteredSorted = this._filterAndSortResources(resources, {
      hazardType: hazardType,
      primaryAudience: filters && filters.primaryAudience,
      resourceTypes: filters && filters.resourceTypes,
      setting: filters && filters.setting,
      language: filters && filters.language,
      supportType: filters && filters.supportType,
      availability: filters && filters.availability,
      lastUpdatedFrom: filters && filters.lastUpdatedFrom,
      lastUpdatedTo: filters && filters.lastUpdatedTo,
      lastUpdatedRangeCode: filters && filters.lastUpdatedRangeCode,
      searchQuery: filters && filters.searchQuery,
      sortBy: sortBy,
      sortDirection: sortDirection
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = filteredSorted.slice(start, start + ps);

    const results = paged.map(function (r) {
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        primary_hazard_type: r.primary_hazard_type,
        primary_audience: r.primary_audience,
        resource_type: r.resource_type,
        setting: r.setting,
        language: r.language,
        last_updated: r.last_updated,
        is_downloadable: !!r.is_downloadable,
        is_printable: !!r.is_printable,
        tags: Array.isArray(r.tags) ? r.tags : []
      };
    });

    return {
      totalCount: filteredSorted.length,
      page: p,
      pageSize: ps,
      results: results
    };
  }

  // searchResources(query?, filters?, sortBy?, sortDirection?, page?, pageSize?)
  searchResources(query, filters, sortBy, sortDirection, page, pageSize) {
    const resources = this._getFromStorage('resources', []);
    const filteredSorted = this._filterAndSortResources(resources, {
      primaryAudience: filters && filters.primaryAudience,
      resourceTypes: filters && filters.resourceTypes,
      setting: filters && filters.setting,
      language: filters && filters.language,
      supportType: filters && filters.supportType,
      availability: filters && filters.availability,
      primaryHazardType: filters && filters.primaryHazardType,
      hazardKeywords: filters && filters.hazardKeywords,
      isSinglePage: filters && typeof filters.isSinglePage === 'boolean' ? filters.isSinglePage : undefined,
      searchQuery: query,
      sortBy: sortBy,
      sortDirection: sortDirection
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = filteredSorted.slice(start, start + ps);

    const results = paged.map(function (r) {
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        primary_hazard_type: r.primary_hazard_type,
        primary_audience: r.primary_audience,
        resource_type: r.resource_type,
        setting: r.setting,
        language: r.language,
        support_type: r.support_type,
        availability: r.availability,
        last_updated: r.last_updated,
        is_single_page: !!r.is_single_page,
        is_downloadable: !!r.is_downloadable,
        is_printable: !!r.is_printable,
        tags: Array.isArray(r.tags) ? r.tags : []
      };
    });

    return {
      totalCount: filteredSorted.length,
      page: p,
      pageSize: ps,
      results: results
    };
  }

  // getResourceDetail(resourceId)
  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const r = resources.find(function (x) {
      return x.id === resourceId;
    });

    if (!r) {
      return {
        resource: null,
        displayLabels: {},
        allowedActions: {
          canSaveToMyPlan: false,
          canSaveToMyResources: false,
          canAddToDownloadLater: false
        }
      };
    }

    const resource = {
      id: r.id,
      title: r.title,
      description: r.description,
      primary_hazard_type: r.primary_hazard_type,
      additional_hazard_types: Array.isArray(r.additional_hazard_types)
        ? r.additional_hazard_types
        : [],
      primary_audience: r.primary_audience,
      additional_audiences: Array.isArray(r.additional_audiences)
        ? r.additional_audiences
        : [],
      resource_type: r.resource_type,
      setting: r.setting,
      language: r.language,
      support_type: r.support_type,
      availability: r.availability,
      last_updated: r.last_updated,
      published_date: r.published_date,
      url: r.url,
      download_url: r.download_url,
      is_downloadable: !!r.is_downloadable,
      is_printable: !!r.is_printable,
      page_count: r.page_count,
      is_single_page: !!r.is_single_page,
      hazard_keywords: Array.isArray(r.hazard_keywords) ? r.hazard_keywords : [],
      tags: Array.isArray(r.tags) ? r.tags : []
    };

    const displayLabels = {
      hazard_label: this._getHazardLabel(r.primary_hazard_type),
      audience_label: this._getAudienceLabel(r.primary_audience),
      resource_type_label: this._getResourceTypeLabel(r.resource_type),
      setting_label: r.setting ? this._getSettingLabel(r.setting) : '',
      language_label: this._getLanguageLabel(r.language),
      support_type_label: r.support_type ? this._getSupportTypeLabel(r.support_type) : '',
      availability_label: r.availability ? this._getAvailabilityLabel(r.availability) : ''
    };

    const allowedActions = {
      canSaveToMyPlan: true,
      canSaveToMyResources: !!r.support_type, // typically for services/helplines
      canAddToDownloadLater: !!r.is_downloadable
    };

    return {
      resource: resource,
      displayLabels: displayLabels,
      allowedActions: allowedActions
    };
  }

  // saveResourceToMyPlan(resourceId, groupLabel?)
  saveResourceToMyPlan(resourceId, groupLabel) {
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find(function (r) {
      return r.id === resourceId && r.is_active;
    });
    if (!resource) {
      return {
        success: false,
        myPlanId: null,
        myPlanItemId: null,
        totalItemsInPlan: 0,
        message: 'Resource not found or inactive.'
      };
    }

    const plan = this._getOrCreateMyPlan();
    const items = this._getFromStorage('my_plan_items', []);
    let item = items.find(function (i) {
      return i.my_plan_id === plan.id && i.resource_id === resourceId;
    });
    const now = this._nowIso();

    if (!item) {
      let maxSort = 0;
      items.forEach(function (i) {
        if (i.my_plan_id === plan.id && typeof i.sort_order === 'number') {
          if (i.sort_order > maxSort) maxSort = i.sort_order;
        }
      });
      item = {
        id: this._generateId('myplanitem'),
        my_plan_id: plan.id,
        resource_id: resourceId,
        added_at: now,
        sort_order: maxSort + 1,
        group_label: groupLabel || null
      };
      items.push(item);
    } else {
      if (groupLabel !== undefined) item.group_label = groupLabel || null;
    }

    this._saveToStorage('my_plan_items', items);

    const plans = this._getFromStorage('my_plan', []);
    const idx = plans.findIndex(function (p) {
      return p.id === plan.id;
    });
    if (idx !== -1) {
      plans[idx].updated_at = now;
      this._saveToStorage('my_plan', plans);
    }

    const totalItemsInPlan = items.filter(function (i) {
      return i.my_plan_id === plan.id;
    }).length;

    return {
      success: true,
      myPlanId: plan.id,
      myPlanItemId: item.id,
      totalItemsInPlan: totalItemsInPlan,
      message: 'Resource saved to My Plan.'
    };
  }

  // saveResourceToMyResources(resourceId, categoryLabel?, userNotes?)
  saveResourceToMyResources(resourceId, categoryLabel, userNotes) {
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find(function (r) {
      return r.id === resourceId && r.is_active;
    });
    if (!resource) {
      return {
        success: false,
        myResourcesListId: null,
        myResourcesListItemId: null,
        totalItemsInList: 0,
        message: 'Resource not found or inactive.'
      };
    }

    const list = this._getOrCreateMyResourcesList();
    const items = this._getFromStorage('my_resources_list_items', []);

    let item = items.find(function (i) {
      return i.my_resources_list_id === list.id && i.resource_id === resourceId;
    });
    const now = this._nowIso();

    if (!item) {
      let maxSort = 0;
      items.forEach(function (i) {
        if (i.my_resources_list_id === list.id && typeof i.sort_order === 'number') {
          if (i.sort_order > maxSort) maxSort = i.sort_order;
        }
      });
      item = {
        id: this._generateId('myresitem'),
        my_resources_list_id: list.id,
        resource_id: resourceId,
        added_at: now,
        sort_order: maxSort + 1,
        user_notes: userNotes || '',
        category_label: categoryLabel || null
      };
      items.push(item);
    } else {
      if (userNotes !== undefined) item.user_notes = userNotes;
      if (categoryLabel !== undefined) item.category_label = categoryLabel || null;
    }

    this._saveToStorage('my_resources_list_items', items);

    const lists = this._getFromStorage('my_resources_lists', []);
    const idx = lists.findIndex(function (l) {
      return l.id === list.id;
    });
    if (idx !== -1) {
      lists[idx].updated_at = now;
      this._saveToStorage('my_resources_lists', lists);
    }

    const totalItemsInList = items.filter(function (i) {
      return i.my_resources_list_id === list.id;
    }).length;

    return {
      success: true,
      myResourcesListId: list.id,
      myResourcesListItemId: item.id,
      totalItemsInList: totalItemsInList,
      message: 'Resource saved to My Resources.'
    };
  }

  // addResourceToDownloadLater(resourceId)
  addResourceToDownloadLater(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find(function (r) {
      return r.id === resourceId && r.is_active;
    });
    if (!resource) {
      return {
        success: false,
        downloadLaterListId: null,
        downloadLaterListItemId: null,
        totalItemsInList: 0,
        message: 'Resource not found or inactive.'
      };
    }

    const list = this._getOrCreateDownloadLaterList();
    const items = this._getFromStorage('download_later_list_items', []);

    let item = items.find(function (i) {
      return i.download_later_list_id === list.id && i.resource_id === resourceId;
    });
    const now = this._nowIso();

    if (!item) {
      let maxSort = 0;
      items.forEach(function (i) {
        if (i.download_later_list_id === list.id && typeof i.sort_order === 'number') {
          if (i.sort_order > maxSort) maxSort = i.sort_order;
        }
      });
      item = {
        id: this._generateId('dllitem'),
        download_later_list_id: list.id,
        resource_id: resourceId,
        added_at: now,
        sort_order: maxSort + 1,
        has_been_downloaded: false
      };
      items.push(item);
    }

    this._saveToStorage('download_later_list_items', items);

    const lists = this._getFromStorage('download_later_lists', []);
    const idx = lists.findIndex(function (l) {
      return l.id === list.id;
    });
    if (idx !== -1) {
      lists[idx].updated_at = now;
      this._saveToStorage('download_later_lists', lists);
    }

    const totalItemsInList = items.filter(function (i) {
      return i.download_later_list_id === list.id;
    }).length;

    return {
      success: true,
      downloadLaterListId: list.id,
      downloadLaterListItemId: item.id,
      totalItemsInList: totalItemsInList,
      message: 'Resource added to Download Later.'
    };
  }

  // getRelatedResources(resourceId, maxResults?)
  getRelatedResources(resourceId, maxResults) {
    const resources = this._getFromStorage('resources', []);
    const base = resources.find(function (r) {
      return r.id === resourceId;
    });
    if (!base) return [];

    const related = resources
      .filter(function (r) {
        if (!r.is_active) return false;
        if (r.id === base.id) return false;
        if (r.primary_hazard_type === base.primary_hazard_type) return true;
        if (r.primary_audience === base.primary_audience) return true;
        return false;
      })
      .sort(function (a, b) {
        const ad = a.last_updated ? new Date(a.last_updated).getTime() : 0;
        const bd = b.last_updated ? new Date(b.last_updated).getTime() : 0;
        return bd - ad;
      });

    const limit = maxResults || 5;
    return related.slice(0, limit).map(function (r) {
      return {
        id: r.id,
        title: r.title,
        primary_hazard_type: r.primary_hazard_type,
        primary_audience: r.primary_audience,
        resource_type: r.resource_type,
        last_updated: r.last_updated
      };
    });
  }

  // getPlanningToolsOverview()
  getPlanningToolsOverview() {
    const planningTools = [
      {
        tool_code: 'emergency_supply_kit_builder',
        name: 'Emergency Supply Kit Builder',
        description: 'Create a customized emergency supply kit based on your needs and budget.'
      },
      {
        tool_code: 'family_communication_plan_builder',
        name: 'Family Communication Plan Builder',
        description: 'Plan how your family will communicate during an emergency.'
      }
    ];

    const resources = this._getFromStorage('resources', []);
    const featuredChecklists = resources
      .filter(function (r) {
        return r.is_active && r.resource_type === 'checklist';
      })
      .slice(0, 5)
      .map(function (r) {
        return {
          resource_id: r.id,
          title: r.title,
          primary_hazard_type: r.primary_hazard_type,
          primary_audience: r.primary_audience
        };
      });

    const plans = this._getFromStorage('my_plan', []);
    let snapshot = {
      myPlanId: null,
      totalItems: 0,
      lastUpdated: null
    };
    if (plans.length > 0) {
      const plan = plans[0];
      const items = this._getFromStorage('my_plan_items', []);
      const count = items.filter(function (i) {
        return i.my_plan_id === plan.id;
      }).length;
      snapshot = {
        myPlanId: plan.id,
        totalItems: count,
        lastUpdated: plan.updated_at
      };
    }

    return {
      planningTools: planningTools,
      featuredChecklists: featuredChecklists,
      myPlanSnapshot: snapshot
    };
  }

  // getOrCreateActiveEmergencySupplyKit()
  getOrCreateActiveEmergencySupplyKit() {
    const kit = this._getOrCreateEmergencySupplyKit();
    const itemsAll = this._getFromStorage('emergency_supply_kit_items', []);
    const catalog = this._getFromStorage('kit_catalog_items', []);
    const kitItems = itemsAll.filter(function (i) {
      return i.kit_id === kit.id;
    });

    const items = kitItems.map(
      function (item) {
        const catItem = catalog.find(function (c) {
          return c.id === item.catalog_item_id;
        });
        return {
          kit_item_id: item.id,
          catalog_item_id: item.catalog_item_id,
          name: catItem ? catItem.name : '',
          category: item.category,
          category_label: this._getKitCategoryLabel(item.category),
          quantity: item.quantity,
          estimated_price: item.estimated_price,
          unit: catItem ? catItem.unit : null,
          notes: item.notes || null,
          catalogItem: catItem || null
        };
      }.bind(this)
    );

    const totals = this._recalculateEmergencySupplyKitTotals(kit.id) || {
      budgetStatus: {
        maximum_budget: kit.maximum_budget,
        total_estimated_cost: kit.total_estimated_cost,
        remaining_budget:
          typeof kit.maximum_budget === 'number'
            ? kit.maximum_budget - (kit.total_estimated_cost || 0)
            : null,
        is_over_budget:
          typeof kit.maximum_budget === 'number'
            ? (kit.total_estimated_cost || 0) > kit.maximum_budget
            : false
      }
    };

    return {
      kit: kit,
      items: items,
      budgetStatus: totals.budgetStatus
    };
  }

  // updateEmergencySupplyKitConfiguration(durationDays?, numberOfPeople?, maximumBudget?)
  updateEmergencySupplyKitConfiguration(durationDays, numberOfPeople, maximumBudget) {
    const kit = this._getOrCreateEmergencySupplyKit();
    const kits = this._getFromStorage('emergency_supply_kits', []);
    const idx = kits.findIndex(function (k) {
      return k.id === kit.id;
    });
    if (idx === -1) return null;

    if (typeof durationDays === 'number') kits[idx].duration_days = durationDays;
    if (typeof numberOfPeople === 'number') kits[idx].number_of_people = numberOfPeople;
    if (typeof maximumBudget === 'number') kits[idx].maximum_budget = maximumBudget;

    kits[idx].updated_at = this._nowIso();
    this._saveToStorage('emergency_supply_kits', kits);

    const totals = this._recalculateEmergencySupplyKitTotals(kit.id);

    return {
      kitId: kits[idx].id,
      duration_days: kits[idx].duration_days,
      number_of_people: kits[idx].number_of_people,
      maximum_budget: kits[idx].maximum_budget,
      budgetStatus: totals ? totals.budgetStatus : null
    };
  }

  // getKitCatalogItemsByCategory(category, sortBy?, sortDirection?, maxEstimatedPrice?)
  getKitCatalogItemsByCategory(category, sortBy, sortDirection, maxEstimatedPrice) {
    const catalog = this._getFromStorage('kit_catalog_items', []);
    let items = catalog.filter(function (c) {
      if (!c.is_active) return false;
      return c.category === category;
    });

    if (typeof maxEstimatedPrice === 'number') {
      items = items.filter(function (c) {
        return (Number(c.estimated_price) || 0) <= maxEstimatedPrice;
      });
    }

    const sb = sortBy === 'name' ? 'name' : 'price';
    const dir = sortDirection === 'desc' ? -1 : 1;

    items.sort(function (a, b) {
      if (sb === 'name') {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1 * dir;
        if (an > bn) return 1 * dir;
        return 0;
      }
      const ap = Number(a.estimated_price) || 0;
      const bp = Number(b.estimated_price) || 0;
      if (ap < bp) return -1 * dir;
      if (ap > bp) return 1 * dir;
      return 0;
    });

    return items.map(
      function (c) {
        return {
          catalog_item_id: c.id,
          name: c.name,
          category: c.category,
          category_label: this._getKitCategoryLabel(c.category),
          description: c.description || '',
          estimated_price: c.estimated_price,
          unit: c.unit || null,
          is_recommended: !!c.is_recommended
        };
      }.bind(this)
    );
  }

  // addCatalogItemToEmergencySupplyKit(catalogItemId, quantity=1)
  addCatalogItemToEmergencySupplyKit(catalogItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const kit = this._getOrCreateEmergencySupplyKit();
    const catalog = this._getFromStorage('kit_catalog_items', []);
    const catalogItem = catalog.find(function (c) {
      return c.id === catalogItemId && c.is_active;
    });
    if (!catalogItem) {
      return {
        success: false,
        kitId: kit.id,
        kitItemId: null,
        totalItemsInKit: 0,
        budgetStatus: null
      };
    }

    const items = this._getFromStorage('emergency_supply_kit_items', []);
    let existing = items.find(function (i) {
      return i.kit_id === kit.id && i.catalog_item_id === catalogItemId;
    });
    const now = this._nowIso();

    if (existing) {
      existing.quantity += qty;
      existing.estimated_price = (Number(catalogItem.estimated_price) || 0) * existing.quantity;
    } else {
      const item = {
        id: this._generateId('kititem'),
        kit_id: kit.id,
        catalog_item_id: catalogItemId,
        quantity: qty,
        added_at: now,
        estimated_price: (Number(catalogItem.estimated_price) || 0) * qty,
        category: catalogItem.category,
        notes: ''
      };
      items.push(item);
      existing = item;
    }

    this._saveToStorage('emergency_supply_kit_items', items);

    const totals = this._recalculateEmergencySupplyKitTotals(kit.id);
    const totalItemsInKit = items.filter(function (i) {
      return i.kit_id === kit.id;
    }).length;

    return {
      success: true,
      kitId: kit.id,
      kitItemId: existing.id,
      totalItemsInKit: totalItemsInKit,
      budgetStatus: totals ? totals.budgetStatus : null
    };
  }

  // removeEmergencySupplyKitItem(kitItemId)
  removeEmergencySupplyKitItem(kitItemId) {
    const items = this._getFromStorage('emergency_supply_kit_items', []);
    const idx = items.findIndex(function (i) {
      return i.id === kitItemId;
    });
    if (idx === -1) {
      return {
        success: false,
        kitId: null,
        totalItemsInKit: 0,
        budgetStatus: null
      };
    }
    const kitId = items[idx].kit_id;
    items.splice(idx, 1);
    this._saveToStorage('emergency_supply_kit_items', items);

    const totals = this._recalculateEmergencySupplyKitTotals(kitId);
    const totalItemsInKit = items.filter(function (i) {
      return i.kit_id === kitId;
    }).length;

    return {
      success: true,
      kitId: kitId,
      totalItemsInKit: totalItemsInKit,
      budgetStatus: totals ? totals.budgetStatus : null
    };
  }

  // getEmergencySupplyKitSummary()
  getEmergencySupplyKitSummary() {
    const kit = this._getOrCreateEmergencySupplyKit();
    const items = this._getFromStorage('emergency_supply_kit_items', []);
    const kitItems = items.filter(function (i) {
      return i.kit_id === kit.id;
    });

    const byCategoryMap = {};
    for (let i = 0; i < kitItems.length; i++) {
      const item = kitItems[i];
      const cat = item.category || 'other';
      if (!byCategoryMap[cat]) {
        byCategoryMap[cat] = { item_count: 0, estimated_cost: 0 };
      }
      byCategoryMap[cat].item_count += 1;
      byCategoryMap[cat].estimated_cost += Number(item.estimated_price) || 0;
    }

    const itemsByCategory = [];
    for (const cat in byCategoryMap) {
      if (Object.prototype.hasOwnProperty.call(byCategoryMap, cat)) {
        itemsByCategory.push({
          category: cat,
          category_label: this._getKitCategoryLabel(cat),
          item_count: byCategoryMap[cat].item_count,
          estimated_cost: byCategoryMap[cat].estimated_cost
        });
      }
    }

    const totals = this._recalculateEmergencySupplyKitTotals(kit.id);

    return {
      kitId: kit.id,
      duration_days: kit.duration_days,
      number_of_people: kit.number_of_people,
      maximum_budget: kit.maximum_budget,
      total_items_count: kit.total_items_count,
      total_estimated_cost: kit.total_estimated_cost,
      itemsByCategory: itemsByCategory,
      budgetStatus: totals ? totals.budgetStatus : null
    };
  }

  // completeEmergencySupplyKit()
  completeEmergencySupplyKit() {
    const kit = this._getOrCreateEmergencySupplyKit();
    const kits = this._getFromStorage('emergency_supply_kits', []);
    const idx = kits.findIndex(function (k) {
      return k.id === kit.id;
    });
    if (idx === -1) {
      return {
        success: false,
        kitId: null,
        status: null
      };
    }
    kits[idx].status = 'completed';
    kits[idx].updated_at = this._nowIso();
    this._saveToStorage('emergency_supply_kits', kits);
    return {
      success: true,
      kitId: kit.id,
      status: 'completed'
    };
  }

  // getOrCreateActiveCommunicationPlan()
  getOrCreateActiveCommunicationPlan() {
    const plan = this._getOrCreateCommunicationPlan();
    const contactsAll = this._getFromStorage('communication_plan_contacts', []);
    const placesAll = this._getFromStorage('communication_plan_meeting_places', []);

    const contacts = contactsAll.filter(function (c) {
      return c.communication_plan_id === plan.id;
    });
    const meetingPlaces = placesAll.filter(function (m) {
      return m.communication_plan_id === plan.id;
    });

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        household_member_count: plan.household_member_count,
        status: plan.status,
        plan_summary_generated: plan.plan_summary_generated,
        created_at: plan.created_at,
        updated_at: plan.updated_at
      },
      contacts: contacts,
      meetingPlaces: meetingPlaces
    };
  }

  // updateCommunicationPlanHouseholdMembers(householdMemberCount)
  updateCommunicationPlanHouseholdMembers(householdMemberCount) {
    const plan = this._getOrCreateCommunicationPlan();
    const plans = this._getFromStorage('communication_plans', []);
    const idx = plans.findIndex(function (p) {
      return p.id === plan.id;
    });
    if (idx === -1) return null;
    plans[idx].household_member_count = householdMemberCount;
    plans[idx].updated_at = this._nowIso();
    this._saveToStorage('communication_plans', plans);
    return {
      planId: plan.id,
      household_member_count: householdMemberCount
    };
  }

  // addCommunicationPlanContact(label, contactType, phoneNumber, email?, notes?)
  addCommunicationPlanContact(label, contactType, phoneNumber, email, notes) {
    const plan = this._getOrCreateCommunicationPlan();
    const contacts = this._getFromStorage('communication_plan_contacts', []);

    let maxSort = 0;
    contacts.forEach(function (c) {
      if (c.communication_plan_id === plan.id && typeof c.sort_order === 'number') {
        if (c.sort_order > maxSort) maxSort = c.sort_order;
      }
    });

    const contact = {
      id: this._generateId('cpcontact'),
      communication_plan_id: plan.id,
      label: label,
      contact_type: contactType,
      phone_number: phoneNumber,
      email: email || null,
      notes: notes || null,
      sort_order: maxSort + 1
    };

    contacts.push(contact);
    this._saveToStorage('communication_plan_contacts', contacts);

    const plans = this._getFromStorage('communication_plans', []);
    const idx = plans.findIndex(function (p) {
      return p.id === plan.id;
    });
    if (idx !== -1) {
      plans[idx].updated_at = this._nowIso();
      this._saveToStorage('communication_plans', plans);
    }

    const totalContacts = contacts.filter(function (c) {
      return c.communication_plan_id === plan.id;
    }).length;

    return {
      success: true,
      planId: plan.id,
      contactId: contact.id,
      totalContacts: totalContacts
    };
  }

  // addOrUpdateCommunicationPlanMeetingPlace(label, placeType, addressDescription, notes?, meetingPlaceId?)
  addOrUpdateCommunicationPlanMeetingPlace(label, placeType, addressDescription, notes, meetingPlaceId) {
    const plan = this._getOrCreateCommunicationPlan();
    const places = this._getFromStorage('communication_plan_meeting_places', []);

    let meetingPlace = null;
    if (meetingPlaceId) {
      meetingPlace = places.find(function (m) {
        return m.id === meetingPlaceId;
      });
    }

    if (meetingPlace) {
      meetingPlace.label = label;
      meetingPlace.place_type = placeType;
      meetingPlace.address_description = addressDescription;
      if (notes !== undefined) meetingPlace.notes = notes;
    } else {
      let maxSort = 0;
      places.forEach(function (m) {
        if (m.communication_plan_id === plan.id && typeof m.sort_order === 'number') {
          if (m.sort_order > maxSort) maxSort = m.sort_order;
        }
      });
      meetingPlace = {
        id: this._generateId('cpplace'),
        communication_plan_id: plan.id,
        label: label,
        place_type: placeType,
        address_description: addressDescription,
        notes: notes || null,
        sort_order: maxSort + 1
      };
      places.push(meetingPlace);
    }

    this._saveToStorage('communication_plan_meeting_places', places);

    const plans = this._getFromStorage('communication_plans', []);
    const idx = plans.findIndex(function (p) {
      return p.id === plan.id;
    });
    if (idx !== -1) {
      plans[idx].updated_at = this._nowIso();
      this._saveToStorage('communication_plans', plans);
    }

    const totalMeetingPlaces = places.filter(function (m) {
      return m.communication_plan_id === plan.id;
    }).length;

    return {
      success: true,
      planId: plan.id,
      meetingPlaceId: meetingPlace.id,
      totalMeetingPlaces: totalMeetingPlaces
    };
  }

  // getCommunicationPlanReview()
  getCommunicationPlanReview() {
    const plan = this._getOrCreateCommunicationPlan();
    const contactsAll = this._getFromStorage('communication_plan_contacts', []);
    const placesAll = this._getFromStorage('communication_plan_meeting_places', []);

    const contacts = contactsAll
      .filter(function (c) {
        return c.communication_plan_id === plan.id;
      })
      .map(function (c) {
        return {
          label: c.label,
          contact_type: c.contact_type,
          phone_number: c.phone_number,
          email: c.email
        };
      });

    const meetingPlaces = placesAll
      .filter(function (m) {
        return m.communication_plan_id === plan.id;
      })
      .map(function (m) {
        return {
          label: m.label,
          place_type: m.place_type,
          address_description: m.address_description
        };
      });

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        household_member_count: plan.household_member_count,
        status: plan.status
      },
      contacts: contacts,
      meetingPlaces: meetingPlaces
    };
  }

  // generateCommunicationPlanSummary()
  generateCommunicationPlanSummary() {
    const plan = this._getOrCreateCommunicationPlan();
    const contactsAll = this._getFromStorage('communication_plan_contacts', []);
    const placesAll = this._getFromStorage('communication_plan_meeting_places', []);

    const contacts = contactsAll.filter(function (c) {
      return c.communication_plan_id === plan.id;
    });
    const meetingPlaces = placesAll.filter(function (m) {
      return m.communication_plan_id === plan.id;
    });

    let summary = 'Family Communication Plan\n';
    summary += 'Household members: ' + plan.household_member_count + '\n\n';

    summary += 'Emergency Contacts:\n';
    if (contacts.length === 0) {
      summary += '- (none added)\n';
    } else {
      contacts.forEach(function (c) {
        summary += '- ' + c.label + ' (' + c.contact_type + '): ' + c.phone_number;
        if (c.email) summary += ', ' + c.email;
        summary += '\n';
      });
    }

    summary += '\nMeeting Places:\n';
    if (meetingPlaces.length === 0) {
      summary += '- (none added)\n';
    } else {
      meetingPlaces.forEach(function (m) {
        summary += '- ' + m.label + ' (' + m.place_type + '): ' + m.address_description + '\n';
      });
    }

    const plans = this._getFromStorage('communication_plans', []);
    const idx = plans.findIndex(function (p) {
      return p.id === plan.id;
    });
    const now = this._nowIso();
    if (idx !== -1) {
      plans[idx].summary_text = summary;
      plans[idx].plan_summary_generated = true;
      plans[idx].status = 'completed';
      plans[idx].updated_at = now;
      this._saveToStorage('communication_plans', plans);
    }

    return {
      success: true,
      planId: plan.id,
      summaryText: summary,
      generatedAt: now
    };
  }

  // getLocationSearchFilterOptions()
  getLocationSearchFilterOptions() {
    const locationTypeOptions = [
      { code: 'cooling_center', label: 'Cooling Centers' },
      { code: 'emergency_shelter', label: 'Emergency Shelters' },
      { code: 'vaccination_site', label: 'Vaccination Sites' },
      { code: 'testing_site', label: 'Testing Sites' },
      { code: 'resource_center', label: 'Resource Centers' },
      { code: 'other', label: 'Other Locations' }
    ];

    const distanceRadiusOptions = [
      { miles: 1, label: '1 mile' },
      { miles: 5, label: '5 miles' },
      { miles: 10, label: '10 miles' },
      { miles: 25, label: '25 miles' }
    ];

    const sortOptions = [
      { value: 'distance', label: 'Distance - Closest First' },
      { value: 'name', label: 'Name A–Z' }
    ];

    return {
      locationTypeOptions: locationTypeOptions,
      distanceRadiusOptions: distanceRadiusOptions,
      sortOptions: sortOptions
    };
  }

  // searchLocations(searchText, radiusMiles, filters?, sortBy?, page?, pageSize?)
  searchLocations(searchText, radiusMiles, filters, sortBy, page, pageSize) {
    return this._searchLocationsWithAvailability(searchText, radiusMiles, filters || {}, sortBy, page, pageSize);
  }

  // getLocationDetail(locationId)
  getLocationDetail(locationId) {
    const locations = this._getFromStorage('locations', []);
    const loc = locations.find(function (l) {
      return l.id === locationId;
    });
    if (!loc) {
      return {
        location: null,
        openingHours: []
      };
    }

    const hours = this._getFromStorage('location_opening_hours', []);
    const openingHours = hours
      .filter(function (h) {
        return h.location_id === locationId;
      })
      .map(function (h) {
        return {
          day_of_week: h.day_of_week,
          open_time: h.open_time,
          close_time: h.close_time,
          is_closed: !!h.is_closed,
          is_24_hours: !!h.is_24_hours
        };
      });

    return {
      location: {
        id: loc.id,
        name: loc.name,
        location_type: loc.location_type,
        address_line1: loc.address_line1,
        address_line2: loc.address_line2 || '',
        city: loc.city,
        state: loc.state,
        postal_code: loc.postal_code,
        county: loc.county || '',
        phone: loc.phone || '',
        website: loc.website || '',
        notes: loc.notes || '',
        is_accessible: !!loc.is_accessible,
        typical_services: Array.isArray(loc.typical_services) ? loc.typical_services : []
      },
      openingHours: openingHours
    };
  }

  // addLocationToPrintableLocationsList(locationId)
  addLocationToPrintableLocationsList(locationId) {
    const locations = this._getFromStorage('locations', []);
    const loc = locations.find(function (l) {
      return l.id === locationId;
    });
    if (!loc) {
      return {
        success: false,
        printableListId: null,
        printableListItemId: null,
        totalLocationsInList: 0
      };
    }

    const list = this._getOrCreatePrintableLocationsList();
    const items = this._getFromStorage('printable_locations_list_items', []);

    let item = items.find(function (i) {
      return i.printable_list_id === list.id && i.location_id === locationId;
    });
    const now = this._nowIso();

    if (!item) {
      let maxSort = 0;
      items.forEach(function (i) {
        if (i.printable_list_id === list.id && typeof i.sort_order === 'number') {
          if (i.sort_order > maxSort) maxSort = i.sort_order;
        }
      });
      item = {
        id: this._generateId('plistitem'),
        printable_list_id: list.id,
        location_id: locationId,
        added_at: now,
        sort_order: maxSort + 1
      };
      items.push(item);
    }

    this._saveToStorage('printable_locations_list_items', items);

    const lists = this._getFromStorage('printable_locations_lists', []);
    const idx = lists.findIndex(function (l) {
      return l.id === list.id;
    });
    if (idx !== -1) {
      lists[idx].updated_at = now;
      this._saveToStorage('printable_locations_lists', lists);
    }

    const totalLocationsInList = items.filter(function (i) {
      return i.printable_list_id === list.id;
    }).length;

    return {
      success: true,
      printableListId: list.id,
      printableListItemId: item.id,
      totalLocationsInList: totalLocationsInList
    };
  }

  // getPrintableLocationsListDetail()
  getPrintableLocationsListDetail() {
    const lists = this._getFromStorage('printable_locations_lists', []);
    if (lists.length === 0) {
      return {
        list: null,
        locations: []
      };
    }
    const list = lists[0];
    const items = this._getFromStorage('printable_locations_list_items', []);
    const locations = this._getFromStorage('locations', []);

    const listItems = items
      .filter(function (i) {
        return i.printable_list_id === list.id;
      })
      .sort(function (a, b) {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      })
      .map(
        function (i) {
          const loc = locations.find(function (l) {
            return l.id === i.location_id;
          });
          const openingSummary = loc ? this._buildOpeningHoursSummaryForLocation(loc.id) : '';
          return {
            list_item_id: i.id,
            sort_order: i.sort_order,
            location: loc
              ? {
                  id: loc.id,
                  name: loc.name,
                  address_line1: loc.address_line1,
                  address_line2: loc.address_line2 || '',
                  city: loc.city,
                  state: loc.state,
                  postal_code: loc.postal_code,
                  phone: loc.phone || '',
                  notes: loc.notes || ''
                }
              : null,
            openingHoursSummary: openingSummary
          };
        }.bind(this)
      );

    return {
      list: list,
      locations: listItems
    };
  }

  // removeLocationFromPrintableLocationsList(printableListItemId)
  removeLocationFromPrintableLocationsList(printableListItemId) {
    const items = this._getFromStorage('printable_locations_list_items', []);
    const idx = items.findIndex(function (i) {
      return i.id === printableListItemId;
    });
    if (idx === -1) {
      return {
        success: false,
        printableListId: null,
        totalLocationsInList: 0
      };
    }
    const listId = items[idx].printable_list_id;
    items.splice(idx, 1);
    this._saveToStorage('printable_locations_list_items', items);

    const remaining = items.filter(function (i) {
      return i.printable_list_id === listId;
    }).length;

    return {
      success: true,
      printableListId: listId,
      totalLocationsInList: remaining
    };
  }

  // getTrainingFilterOptions()
  getTrainingFilterOptions() {
    const formatOptions = [
      { code: 'online', label: 'Online' },
      { code: 'in_person', label: 'In-person' },
      { code: 'hybrid', label: 'Hybrid' }
    ];

    const levelOptions = [
      { code: 'beginner', label: 'Beginner' },
      { code: 'intermediate', label: 'Intermediate' },
      { code: 'advanced', label: 'Advanced' },
      { code: 'all_levels', label: 'All Levels' }
    ];

    const durationOptions = [
      { code: 'under_2_hours', label: 'Under 2 hours' },
      { code: 'two_to_four_hours', label: '2–4 hours' },
      { code: 'half_day', label: 'Half day' },
      { code: 'full_day', label: 'Full day' },
      { code: 'multi_day', label: 'Multi-day' }
    ];

    const sortOptions = [
      { value: 'start_date', label: 'Start Date - Soonest First' }
    ];

    return {
      formatOptions: formatOptions,
      levelOptions: levelOptions,
      durationOptions: durationOptions,
      sortOptions: sortOptions
    };
  }

  // searchTrainingEvents(filters?, sortBy?, sortDirection?, page?, pageSize?)
  searchTrainingEvents(filters, sortBy, sortDirection, page, pageSize) {
    const events = this._getFromStorage('training_events', []);

    let filtered = events.filter(function (e) {
      return e.status === 'scheduled';
    });

    if (filters) {
      if (filters.formats && filters.formats.length > 0) {
        filtered = filtered.filter(function (e) {
          return filters.formats.indexOf(e.format) !== -1;
        });
      }
      if (filters.levels && filters.levels.length > 0) {
        filtered = filtered.filter(function (e) {
          return filters.levels.indexOf(e.level) !== -1;
        });
      }
      if (filters.durationCategories && filters.durationCategories.length > 0) {
        filtered = filtered.filter(function (e) {
          return filters.durationCategories.indexOf(e.duration_category) !== -1;
        });
      }
      if (filters.dateFrom || filters.dateTo) {
        const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const to = filters.dateTo ? new Date(filters.dateTo) : null;
        filtered = filtered.filter(function (e) {
          if (!e.start_datetime) return false;
          const d = new Date(e.start_datetime);
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });
      }
    }

    const sb = sortBy === 'start_date' ? 'start_date' : 'start_date';
    const dir = sortDirection === 'desc' ? -1 : 1;

    filtered.sort(function (a, b) {
      if (sb === 'start_date') {
        const ad = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const bd = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        if (ad < bd) return -1 * dir;
        if (ad > bd) return 1 * dir;
        return 0;
      }
      return 0;
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = filtered.slice(start, start + ps);

    const results = paged.map(function (e) {
      return {
        training_event_id: e.id,
        title: e.title,
        description: e.description,
        format: e.format,
        level: e.level,
        duration_minutes: e.duration_minutes,
        duration_category: e.duration_category,
        start_datetime: e.start_datetime,
        status: e.status
      };
    });

    return {
      totalCount: filtered.length,
      page: p,
      pageSize: ps,
      results: results
    };
  }

  // getTrainingEventDetail(trainingEventId)
  getTrainingEventDetail(trainingEventId) {
    const events = this._getFromStorage('training_events', []);
    const e = events.find(function (ev) {
      return ev.id === trainingEventId;
    });
    if (!e) {
      return {
        trainingEvent: null,
        displayLabels: {}
      };
    }
    return {
      trainingEvent: {
        id: e.id,
        title: e.title,
        description: e.description,
        format: e.format,
        level: e.level,
        duration_minutes: e.duration_minutes,
        duration_category: e.duration_category,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        location_description: e.location_description,
        registration_required: !!e.registration_required,
        status: e.status
      },
      displayLabels: {
        format_label: this._getTrainingFormatLabel(e.format),
        level_label: this._getTrainingLevelLabel(e.level),
        duration_label: this._getTrainingDurationLabel(e.duration_category)
      }
    };
  }

  // submitTrainingRegistration(trainingEventId, registrantName, registrantEmail, primaryReason)
  submitTrainingRegistration(trainingEventId, registrantName, registrantEmail, primaryReason) {
    const events = this._getFromStorage('training_events', []);
    const e = events.find(function (ev) {
      return ev.id === trainingEventId;
    });
    if (!e) {
      return {
        success: false,
        registrationId: null,
        status: null,
        message: 'Training event not found.'
      };
    }

    const registrations = this._getFromStorage('training_registrations', []);
    const reg = {
      id: this._generateId('treg'),
      training_event_id: trainingEventId,
      registrant_name: registrantName,
      registrant_email: registrantEmail,
      primary_reason: primaryReason,
      created_at: this._nowIso(),
      status: 'submitted',
      notes: ''
    };
    registrations.push(reg);
    this._saveToStorage('training_registrations', registrations);

    return {
      success: true,
      registrationId: reg.id,
      status: reg.status,
      message: 'Registration submitted.'
    };
  }

  // getPopulationSegments()
  getPopulationSegments() {
    const segments = this._getFromStorage('population_segments', []);
    return segments
      .filter(function (s) {
        return s.is_active;
      })
      .map(function (s) {
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          description: s.description,
          page_url: s.page_url
        };
      });
  }

  // getPopulationResources(populationCode, filters?, sortBy?, sortDirection?, page?, pageSize?)
  getPopulationResources(populationCode, filters, sortBy, sortDirection, page, pageSize) {
    const segments = this._getFromStorage('population_segments', []);
    const segment = segments.find(function (s) {
      return s.code === populationCode;
    });

    let audienceCodes = [];
    if (segment && Array.isArray(segment.related_audience_codes) && segment.related_audience_codes.length) {
      audienceCodes = segment.related_audience_codes.slice();
    } else {
      // Fallback mapping based on populationCode
      audienceCodes = [populationCode];
    }

    const resources = this._getFromStorage('resources', []);
    let filtered = resources.filter(function (r) {
      if (!r.is_active) return false;
      const primaryMatch = audienceCodes.indexOf(r.primary_audience) !== -1;
      const additional = Array.isArray(r.additional_audiences) ? r.additional_audiences : [];
      const additionalMatch = additional.some(function (a) {
        return audienceCodes.indexOf(a) !== -1;
      });
      return primaryMatch || additionalMatch;
    });

    if (filters) {
      if (filters.primaryHazardTypes && filters.primaryHazardTypes.length > 0) {
        filtered = filtered.filter(function (r) {
          return filters.primaryHazardTypes.indexOf(r.primary_hazard_type) !== -1;
        });
      }
      if (filters.resourceTypes && filters.resourceTypes.length > 0) {
        filtered = filtered.filter(function (r) {
          return filters.resourceTypes.indexOf(r.resource_type) !== -1;
        });
      }
      if (filters.language) {
        filtered = filtered.filter(function (r) {
          return r.language === filters.language;
        });
      }
    }

    const sb = sortBy || 'last_updated';
    const dir = sortDirection === 'asc' ? 1 : -1;
    filtered.sort(function (a, b) {
      if (sb === 'title') {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1 * dir;
        if (at > bt) return 1 * dir;
        return 0;
      }
      const ad = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const bd = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      if (ad < bd) return -1 * dir;
      if (ad > bd) return 1 * dir;
      return 0;
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = filtered.slice(start, start + ps);

    const results = paged.map(function (r) {
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        primary_hazard_type: r.primary_hazard_type,
        resource_type: r.resource_type,
        language: r.language,
        last_updated: r.last_updated
      };
    });

    return {
      totalCount: filtered.length,
      page: p,
      pageSize: ps,
      results: results
    };
  }

  // getAlertChannelsInfo()
  getAlertChannelsInfo() {
    const channels = [
      {
        delivery_method: 'sms_text',
        label: 'SMS / Text Messages',
        description: 'Receive text message alerts to your mobile phone.'
      },
      {
        delivery_method: 'email',
        label: 'Email',
        description: 'Get detailed alerts and updates by email.'
      },
      {
        delivery_method: 'voice_call',
        label: 'Voice Call',
        description: 'Receive automated voice calls for critical alerts.'
      },
      {
        delivery_method: 'mobile_app',
        label: 'Mobile App',
        description: 'Receive push notifications through the mobile app.'
      }
    ];

    const hazardAlertTypes = [
      {
        hazard_code: 'wildfire',
        label: 'Wildfires',
        description: 'Alerts about wildfire threats, evacuations, and smoke.'
      },
      {
        hazard_code: 'air_quality_smoke',
        label: 'Air Quality / Smoke',
        description: 'Air quality advisories and smoke impacts.'
      },
      {
        hazard_code: 'flooding',
        label: 'Flooding',
        description: 'Flood warnings and safety information.'
      },
      {
        hazard_code: 'earthquake',
        label: 'Earthquake',
        description: 'Earthquake safety information and aftershock updates.'
      },
      {
        hazard_code: 'heatwave_extreme_heat',
        label: 'Heatwave / Extreme Heat',
        description: 'Excessive heat warnings and cooling center information.'
      },
      {
        hazard_code: 'infectious_disease_pandemics',
        label: 'Infectious Disease & Pandemics',
        description: 'Public health guidance during disease outbreaks.'
      }
    ];

    return {
      channels: channels,
      hazardAlertTypes: hazardAlertTypes
    };
  }

  // getAlertSubscriptionOptions()
  getAlertSubscriptionOptions() {
    const locationTypeOptions = [
      { code: 'county', label: 'County' },
      { code: 'city', label: 'City' },
      { code: 'zip_code', label: 'ZIP Code' }
    ];

    const quietHourPresets = [
      { start: '22:00', end: '06:00', label: '10:00 PM – 6:00 AM' },
      { start: '21:00', end: '07:00', label: '9:00 PM – 7:00 AM' }
    ];

    return {
      locationTypeOptions: locationTypeOptions,
      quietHourPresets: quietHourPresets
    };
  }

  // getCurrentAlertSubscription()
  getCurrentAlertSubscription() {
    const subs = this._getFromStorage('alert_subscriptions', []);
    if (!subs.length) {
      return {
        hasSubscription: false,
        subscription: null
      };
    }
    const sub = subs[0];
    return {
      hasSubscription: !!sub,
      subscription: sub || null
    };
  }

  // saveAlertSubscription(deliveryMethod, phoneNumber?, email?, locationType, locationValue, hazards, quietHoursEnabled, quietHoursStart?, quietHoursEnd?)
  saveAlertSubscription(
    deliveryMethod,
    phoneNumber,
    email,
    locationType,
    locationValue,
    hazards,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd
  ) {
    const subs = this._getFromStorage('alert_subscriptions', []);
    let sub = subs[0] || null;
    const isNew = !sub;
    const now = this._nowIso();

    if (!sub) {
      sub = {
        id: this._generateId('alertsub'),
        created_at: now
      };
      subs.push(sub);
    }

    sub.delivery_method = deliveryMethod;
    sub.phone_number = phoneNumber || '';
    sub.email = email || '';
    sub.location_type = locationType;
    sub.location_value = locationValue;

    sub.wildfire_alerts_enabled = !!(hazards && hazards.wildfire);
    sub.air_quality_smoke_alerts_enabled = !!(hazards && hazards.air_quality_smoke);
    sub.flooding_alerts_enabled = !!(hazards && hazards.flooding);
    sub.earthquake_alerts_enabled = !!(hazards && hazards.earthquake);
    sub.heatwave_alerts_enabled = !!(hazards && hazards.heatwave);
    sub.infectious_disease_alerts_enabled = !!(hazards && hazards.infectious_disease);
    sub.other_alerts_enabled = !!(hazards && hazards.other);

    sub.quiet_hours_enabled = !!quietHoursEnabled;
    sub.quiet_hours_start = quietHoursEnabled ? quietHoursStart || null : null;
    sub.quiet_hours_end = quietHoursEnabled ? quietHoursEnd || null : null;
    sub.updated_at = now;
    sub.is_active = true;

    this._saveToStorage('alert_subscriptions', subs);

    return {
      success: true,
      subscriptionId: sub.id,
      isNewSubscription: isNew,
      message: isNew ? 'Subscription created.' : 'Subscription updated.'
    };
  }

  // getMyPlanDetail()
  getMyPlanDetail() {
    const plans = this._getFromStorage('my_plan', []);
    if (plans.length === 0) {
      return {
        plan: null,
        items: []
      };
    }
    const plan = plans[0];
    const items = this._getFromStorage('my_plan_items', []);
    const resources = this._getFromStorage('resources', []);

    const planItems = items
      .filter(function (i) {
        return i.my_plan_id === plan.id;
      })
      .sort(function (a, b) {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        if (sa < sb) return -1;
        if (sa > sb) return 1;
        const ta = a.added_at || '';
        const tb = b.added_at || '';
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      })
      .map(
        function (i) {
          const r = resources.find(function (res) {
            return res.id === i.resource_id;
          });
          const resource = r
            ? {
                id: r.id,
                title: r.title,
                primary_hazard_type: r.primary_hazard_type,
                primary_audience: r.primary_audience,
                resource_type: r.resource_type,
                last_updated: r.last_updated
              }
            : null;
          const displayLabels = r
            ? {
                hazard_label: this._getHazardLabel(r.primary_hazard_type),
                audience_label: this._getAudienceLabel(r.primary_audience),
                resource_type_label: this._getResourceTypeLabel(r.resource_type)
              }
            : {
                hazard_label: '',
                audience_label: '',
                resource_type_label: ''
              };
          return {
            my_plan_item_id: i.id,
            added_at: i.added_at,
            sort_order: i.sort_order,
            group_label: i.group_label || null,
            resource: resource,
            displayLabels: displayLabels
          };
        }.bind(this)
      );

    return {
      plan: plan,
      items: planItems
    };
  }

  // updateMyPlanItemOrder(myPlanItemId, sortOrder)
  updateMyPlanItemOrder(myPlanItemId, sortOrder) {
    const items = this._getFromStorage('my_plan_items', []);
    const idx = items.findIndex(function (i) {
      return i.id === myPlanItemId;
    });
    if (idx === -1) {
      return {
        success: false,
        myPlanId: null
      };
    }
    items[idx].sort_order = sortOrder;
    this._saveToStorage('my_plan_items', items);
    return {
      success: true,
      myPlanId: items[idx].my_plan_id
    };
  }

  // updateMyPlanItemGroupLabel(myPlanItemId, groupLabel)
  updateMyPlanItemGroupLabel(myPlanItemId, groupLabel) {
    const items = this._getFromStorage('my_plan_items', []);
    const idx = items.findIndex(function (i) {
      return i.id === myPlanItemId;
    });
    if (idx === -1) {
      return {
        success: false
      };
    }
    items[idx].group_label = groupLabel || null;
    this._saveToStorage('my_plan_items', items);
    return {
      success: true
    };
  }

  // removeMyPlanItem(myPlanItemId)
  removeMyPlanItem(myPlanItemId) {
    const items = this._getFromStorage('my_plan_items', []);
    const idx = items.findIndex(function (i) {
      return i.id === myPlanItemId;
    });
    if (idx === -1) {
      return {
        success: false,
        myPlanId: null,
        remainingItems: 0
      };
    }
    const planId = items[idx].my_plan_id;
    items.splice(idx, 1);
    this._saveToStorage('my_plan_items', items);
    const remaining = items.filter(function (i) {
      return i.my_plan_id === planId;
    }).length;
    return {
      success: true,
      myPlanId: planId,
      remainingItems: remaining
    };
  }

  // getMyPlanPrintView()
  getMyPlanPrintView() {
    const detail = this.getMyPlanDetail();
    if (!detail.plan) {
      return {
        planTitle: 'My Plan',
        generatedAt: this._nowIso(),
        sections: []
      };
    }

    // Group by group_label (or default section)
    const groups = {};
    detail.items.forEach(function (item) {
      const label = item.group_label || 'Other';
      if (!groups[label]) groups[label] = [];
      if (item.resource) {
        groups[label].push({
          title: item.resource.title,
          hazard_label: item.displayLabels.hazard_label,
          audience_label: item.displayLabels.audience_label,
          resource_type_label: item.displayLabels.resource_type_label
        });
      }
    });

    const sections = [];
    for (const label in groups) {
      if (Object.prototype.hasOwnProperty.call(groups, label)) {
        sections.push({
          section_label: label,
          items: groups[label]
        });
      }
    }

    return {
      planTitle: detail.plan.name || 'My Plan',
      generatedAt: this._nowIso(),
      sections: sections
    };
  }

  // getMyResourcesListDetail()
  getMyResourcesListDetail() {
    const lists = this._getFromStorage('my_resources_lists', []);
    if (lists.length === 0) {
      return {
        list: null,
        items: []
      };
    }
    const list = lists[0];
    const items = this._getFromStorage('my_resources_list_items', []);
    const resources = this._getFromStorage('resources', []);

    const listItems = items
      .filter(function (i) {
        return i.my_resources_list_id === list.id;
      })
      .sort(function (a, b) {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      })
      .map(function (i) {
        const r = resources.find(function (res) {
          return res.id === i.resource_id;
        });
        return {
          my_resources_list_item_id: i.id,
          sort_order: i.sort_order,
          user_notes: i.user_notes || '',
          category_label: i.category_label || null,
          resource: r
            ? {
                id: r.id,
                title: r.title,
                support_type: r.support_type,
                availability: r.availability,
                primary_audience: r.primary_audience,
                primary_hazard_type: r.primary_hazard_type
              }
            : null
        };
      });

    return {
      list: list,
      items: listItems
    };
  }

  // updateMyResourcesListItem(myResourcesListItemId, userNotes?, categoryLabel?)
  updateMyResourcesListItem(myResourcesListItemId, userNotes, categoryLabel) {
    const items = this._getFromStorage('my_resources_list_items', []);
    const idx = items.findIndex(function (i) {
      return i.id === myResourcesListItemId;
    });
    if (idx === -1) {
      return {
        success: false
      };
    }
    if (userNotes !== undefined) items[idx].user_notes = userNotes;
    if (categoryLabel !== undefined) items[idx].category_label = categoryLabel || null;
    this._saveToStorage('my_resources_list_items', items);
    return {
      success: true
    };
  }

  // removeMyResourcesListItem(myResourcesListItemId)
  removeMyResourcesListItem(myResourcesListItemId) {
    const items = this._getFromStorage('my_resources_list_items', []);
    const idx = items.findIndex(function (i) {
      return i.id === myResourcesListItemId;
    });
    if (idx === -1) {
      return {
        success: false,
        remainingItems: 0
      };
    }
    const listId = items[idx].my_resources_list_id;
    items.splice(idx, 1);
    this._saveToStorage('my_resources_list_items', items);
    const remaining = items.filter(function (i) {
      return i.my_resources_list_id === listId;
    }).length;
    return {
      success: true,
      remainingItems: remaining
    };
  }

  // getMyResourcesPrintView()
  getMyResourcesPrintView() {
    const detail = this.getMyResourcesListDetail();
    const items = (detail.items || []).map(
      function (i) {
        const r = i.resource;
        return {
          title: r ? r.title : '',
          support_type_label: r && r.support_type ? this._getSupportTypeLabel(r.support_type) : '',
          availability_label: r && r.availability ? this._getAvailabilityLabel(r.availability) : '',
          user_notes: i.user_notes || ''
        };
      }.bind(this)
    );
    return {
      listTitle: detail.list && detail.list.name ? detail.list.name : 'My Resources',
      generatedAt: this._nowIso(),
      items: items
    };
  }

  // getDownloadLaterListDetail()
  getDownloadLaterListDetail() {
    const lists = this._getFromStorage('download_later_lists', []);
    if (lists.length === 0) {
      return {
        list: null,
        items: []
      };
    }
    const list = lists[0];
    const items = this._getFromStorage('download_later_list_items', []);
    const resources = this._getFromStorage('resources', []);

    const listItems = items
      .filter(function (i) {
        return i.download_later_list_id === list.id;
      })
      .sort(function (a, b) {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      })
      .map(function (i) {
        const r = resources.find(function (res) {
          return res.id === i.resource_id;
        });
        return {
          download_later_list_item_id: i.id,
          sort_order: i.sort_order,
          has_been_downloaded: !!i.has_been_downloaded,
          resource: r
            ? {
                id: r.id,
                title: r.title,
                primary_hazard_type: r.primary_hazard_type,
                resource_type: r.resource_type,
                language: r.language,
                is_single_page: !!r.is_single_page,
                download_url: r.download_url || null
              }
            : null
        };
      });

    return {
      list: list,
      items: listItems
    };
  }

  // removeDownloadLaterListItem(downloadLaterListItemId)
  removeDownloadLaterListItem(downloadLaterListItemId) {
    const items = this._getFromStorage('download_later_list_items', []);
    const idx = items.findIndex(function (i) {
      return i.id === downloadLaterListItemId;
    });
    if (idx === -1) {
      return {
        success: false,
        remainingItems: 0
      };
    }
    const listId = items[idx].download_later_list_id;
    items.splice(idx, 1);
    this._saveToStorage('download_later_list_items', items);
    const remaining = items.filter(function (i) {
      return i.download_later_list_id === listId;
    }).length;
    return {
      success: true,
      remainingItems: remaining
    };
  }

  // markDownloadLaterItemDownloaded(downloadLaterListItemId)
  markDownloadLaterItemDownloaded(downloadLaterListItemId) {
    const items = this._getFromStorage('download_later_list_items', []);
    const idx = items.findIndex(function (i) {
      return i.id === downloadLaterListItemId;
    });
    if (idx === -1) {
      return {
        success: false
      };
    }
    items[idx].has_been_downloaded = true;
    this._saveToStorage('download_later_list_items', items);
    return {
      success: true
    };
  }

  // getDownloadLaterPrintView()
  getDownloadLaterPrintView() {
    const detail = this.getDownloadLaterListDetail();
    const items = (detail.items || []).map(
      function (i) {
        const r = i.resource;
        return {
          title: r ? r.title : '',
          hazard_label: r ? this._getHazardLabel(r.primary_hazard_type) : '',
          language_label: r ? this._getLanguageLabel(r.language) : ''
        };
      }.bind(this)
    );
    return {
      listTitle: detail.list && detail.list.name ? detail.list.name : 'Download Later',
      generatedAt: this._nowIso(),
      items: items
    };
  }

  // getAboutAndHelpContent()
  getAboutAndHelpContent() {
    return this._getFromStorage('about_and_help_content', {
      about: {
        site_name: '',
        owner: '',
        purpose: ''
      },
      faqs: [],
      contacts: [],
      policies: []
    });
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
