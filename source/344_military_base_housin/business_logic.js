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
    const keys = [
      'bases',
      'profiles',
      'housing_units',
      'housing_saved_lists',
      'housing_saved_items',
      'businesses',
      'business_saved_lists',
      'business_saved_items',
      'childcare_tour_requests',
      'maintenance_requests',
      'discount_offers',
      'saved_coupons',
      'business_services',
      'service_appointments',
      'lodging_properties',
      'lodging_reservation_drafts',
      'events',
      'saved_events',
      'support_requests',
      'business_contact_messages'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        if (key === 'profiles') {
          const defaultProfile = {
            id: 'prof_default_resident',
            first_name: 'John',
            last_name: 'Doe',
            email: 'jdoe_resident@example.com',
            username: 'jdoe_resident',
            password: 'TestPass123',
            selected_base_code: 'fort_example',
            phone: '',
            current_housing_location: '',
            updated_at: this._nowISO()
          };
          localStorage.setItem(key, JSON.stringify([defaultProfile]));
        } else if (key === 'businesses') {
          const defaultAutoShop = {
            id: 'biz_auto_gate_garage',
            category: 'auto_repair_services',
            subcategory: 'auto_shop',
            name: 'Gate Garage Auto Repair',
            description: 'Full-service auto repair shop near the main gate offering oil changes, tire services, and inspections for military families.',
            base_id: 'fort_example',
            rating: 4.5,
            review_count: 120,
            distance_from_main_gate: 1.2,
            address: '100 Motor Pool Rd, Exampleville, TX 78100',
            phone: '555-3100',
            website_url: '',
            email: '',
            hours_summary: 'Mon–Sat 0800–1800, Sun closed',
            open_after_1800_weekdays: false,
            delivers_on_base: false,
            supports_online_booking: false,
            images: [],
            created_at: this._nowISO()
          };
          localStorage.setItem(key, JSON.stringify([defaultAutoShop]));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('activeProfileId')) {
      localStorage.setItem('activeProfileId', '');
    }

    if (!localStorage.getItem('isLoggedIn')) {
      localStorage.setItem('isLoggedIn', 'false');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _persistEntityToLocalStorage(entityKey, collection) {
    this._saveToStorage(entityKey, collection);
  }

  _loadEntityFromLocalStorage(entityKey) {
    return this._getFromStorage(entityKey);
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

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatCurrency(amount) {
    if (typeof amount !== 'number') return '';
    try {
      return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    } catch (e) {
      return '$' + amount.toFixed(2);
    }
  }

  _formatDateTime(dateStr) {
    const d = this._parseDate(dateStr);
    if (!d) return '';
    try {
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      return d.toISOString();
    }
  }

  _formatDate(dateStr) {
    const d = this._parseDate(dateStr);
    if (!d) return '';
    try {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  _getActiveProfile() {
    const activeId = localStorage.getItem('activeProfileId') || '';
    const profiles = this._loadEntityFromLocalStorage('profiles');
    if (activeId) {
      const found = profiles.find(function (p) { return p.id === activeId; });
      if (found) return found;
    }
    return profiles.length > 0 ? profiles[0] : null;
  }

  _getOrCreateProfile(first_name, last_name, email, username, password, selected_base_code, phone) {
    let profiles = this._loadEntityFromLocalStorage('profiles');
    let profile = null;

    if (profiles.length > 0) {
      // Try to find by username
      profile = profiles.find(function (p) { return p.username === username; }) || profiles[0];
      profile.first_name = first_name;
      profile.last_name = last_name;
      profile.email = email;
      profile.username = username;
      profile.password = password;
      profile.selected_base_code = selected_base_code;
      if (phone !== undefined) profile.phone = phone;
      profile.updated_at = this._nowISO();
    } else {
      profile = {
        id: this._generateId('prof'),
        first_name: first_name,
        last_name: last_name,
        email: email,
        username: username,
        password: password,
        selected_base_code: selected_base_code,
        phone: phone || '',
        current_housing_location: '',
        updated_at: this._nowISO()
      };
      profiles.push(profile);
    }

    this._persistEntityToLocalStorage('profiles', profiles);
    localStorage.setItem('activeProfileId', profile.id);
    localStorage.setItem('isLoggedIn', 'true');
    return profile;
  }

  _authenticateUserCredentials(username, password) {
    const profiles = this._loadEntityFromLocalStorage('profiles');
    const profile = profiles.find(function (p) { return p.username === username; });
    if (!profile) {
      return { success: false, profile: null, message: 'User not found.' };
    }
    if (profile.password !== password) {
      return { success: false, profile: null, message: 'Invalid password.' };
    }
    localStorage.setItem('activeProfileId', profile.id);
    localStorage.setItem('isLoggedIn', 'true');
    return { success: true, profile: profile, message: 'Login successful.' };
  }

  _getSelectedBase() {
    const profile = this._getActiveProfile();
    const bases = this._loadEntityFromLocalStorage('bases');
    if (!profile || !profile.selected_base_code) {
      return bases.length > 0 ? bases[0] : null;
    }
    const base = bases.find(function (b) { return b.code === profile.selected_base_code; });
    return base || (bases.length > 0 ? bases[0] : null);
  }

  _getOrCreateHousingSavedList(list_type, custom_list_name) {
    let lists = this._loadEntityFromLocalStorage('housing_saved_lists');
    let list = null;

    if (list_type === 'custom') {
      const name = custom_list_name || 'Custom';
      list = lists.find(function (l) { return l.list_type === 'custom' && l.name === name; });
      if (!list) {
        list = {
          id: this._generateId('hlist'),
          list_type: 'custom',
          name: name,
          created_at: this._nowISO()
        };
        lists.push(list);
      }
    } else {
      list = lists.find(function (l) { return l.list_type === list_type; });
      if (!list) {
        const nameMap = {
          favorites: 'Favorites',
          apply_later: 'Apply Later'
        };
        list = {
          id: this._generateId('hlist'),
          list_type: list_type,
          name: nameMap[list_type] || 'List',
          created_at: this._nowISO()
        };
        lists.push(list);
      }
    }

    this._persistEntityToLocalStorage('housing_saved_lists', lists);
    return list;
  }

  _getOrCreateBusinessSavedList(list_type, custom_list_name) {
    let lists = this._loadEntityFromLocalStorage('business_saved_lists');
    let list = null;

    if (list_type === 'custom') {
      const name = custom_list_name || 'Custom';
      list = lists.find(function (l) { return l.list_type === 'custom' && l.name === name; });
      if (!list) {
        list = {
          id: this._generateId('blist'),
          list_type: 'custom',
          name: name,
          created_at: this._nowISO()
        };
        lists.push(list);
      }
    } else {
      list = lists.find(function (l) { return l.list_type === list_type; });
      if (!list) {
        const nameMap = {
          favorites: 'Favorites'
        };
        list = {
          id: this._generateId('blist'),
          list_type: list_type,
          name: nameMap[list_type] || 'List',
          created_at: this._nowISO()
        };
        lists.push(list);
      }
    }

    this._persistEntityToLocalStorage('business_saved_lists', lists);
    return list;
  }

  _housingTypeLabel(value) {
    const map = {
      on_base_housing: 'On-base housing',
      off_base_apartment: 'Off-base apartment',
      off_base_house: 'Off-base house'
    };
    return map[value] || value || '';
  }

  _businessCategoryLabel(value) {
    const map = {
      childcare_schools: 'Childcare & Schools',
      restaurants_dining: 'Restaurants & Dining',
      auto_repair_services: 'Auto Repair & Services',
      personal_services: 'Personal Services',
      retail_shopping: 'Retail & Shopping',
      lodging: 'Lodging',
      other_services: 'Other Services'
    };
    return map[value] || value || '';
  }

  _businessSubcategoryLabel(value) {
    const map = {
      barbers_haircuts: 'Barbers & Haircuts',
      childcare_center: 'Childcare Center',
      preschool: 'Preschool',
      restaurant: 'Restaurant',
      fast_food: 'Fast Food',
      auto_shop: 'Auto Shop',
      oil_change_center: 'Oil Change Center',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _eventCategoryLabel(value) {
    const map = {
      housing_relocation: 'Housing & Relocation',
      family_activities: 'Family Activities',
      training: 'Training',
      community_meeting: 'Community Meeting',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _maintenanceStatusLabel(value) {
    const map = {
      submitted: 'Submitted',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return map[value] || value || '';
  }

  _ratingLabel(rating) {
    if (rating === null || rating === undefined || isNaN(rating)) return 'No rating';
    return rating.toFixed(1) + ' stars';
  }

  _distanceLabel(distance) {
    if (distance === null || distance === undefined || isNaN(distance)) return '';
    return distance.toFixed(1) + ' mi';
  }

  // -----------------
  // Interface: registerAccount
  // -----------------
  registerAccount(first_name, last_name, email, username, password, selected_base_code, phone) {
    if (!first_name || !last_name || !email || !username || !password || !selected_base_code) {
      return {
        success: false,
        profile: null,
        message: 'Missing required registration fields.'
      };
    }

    const profile = this._getOrCreateProfile(
      first_name,
      last_name,
      email,
      username,
      password,
      selected_base_code,
      phone
    );

    return {
      success: true,
      profile: profile,
      message: 'Account registered.'
    };
  }

  // -----------------
  // Interface: login
  // -----------------
  login(username, password) {
    if (!username || !password) {
      return {
        success: false,
        profile: null,
        message: 'Username and password are required.'
      };
    }
    return this._authenticateUserCredentials(username, password);
  }

  // -----------------
  // Interface: getBaseOptions
  // -----------------
  getBaseOptions() {
    const bases = this._loadEntityFromLocalStorage('bases');
    return bases.map(function (base) {
      return {
        base: base,
        label: base.name || base.code || '',
        value: base.code || ''
      };
    });
  }

  // -----------------
  // Interface: getHomePageOverview
  // -----------------
  getHomePageOverview() {
    const profile = this._getActiveProfile();
    const selected_base = this._getSelectedBase();

    const housing_units = this._loadEntityFromLocalStorage('housing_units');
    const businesses = this._loadEntityFromLocalStorage('businesses');
    const events = this._loadEntityFromLocalStorage('events');

    const baseId = selected_base ? selected_base.id : null;

    const featured_housing_units_raw = housing_units
      .filter(function (u) { return !baseId || u.base_id === baseId; })
      .slice(0, 5);

    const featured_housing_units = featured_housing_units_raw.map(function (unit) {
      return {
        unit: unit,
        highlight_reason: 'Featured listing',
        monthly_rent_formatted: typeof unit.monthly_rent === 'number' ? unit.monthly_rent.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '',
        availability_date_formatted: unit.availability_date ? new Date(unit.availability_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
      };
    });

    const businesses_filtered = businesses
      .filter(function (b) { return !baseId || b.base_id === baseId; })
      .sort(function (a, b) {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      })
      .slice(0, 5);

    const self = this;
    const featured_businesses = businesses_filtered.map(function (b) {
      return {
        business: b,
        category_label: self._businessCategoryLabel(b.category),
        rating_label: self._ratingLabel(b.rating)
      };
    });

    const now = new Date();
    const upcoming_housing_events = events.filter(function (e) {
      if (e.category !== 'housing_relocation') return false;
      const sd = e.start_datetime ? new Date(e.start_datetime) : null;
      if (!sd || isNaN(sd.getTime())) return false;
      return sd >= now;
    }).slice(0, 5);

    // Recommended filters based on existing housing data
    let bedrooms_min = null;
    let bedrooms_max = null;
    let max_rent = null;
    if (housing_units.length > 0) {
      bedrooms_min = housing_units.reduce(function (min, u) {
        return u.bedrooms < min ? u.bedrooms : min;
      }, housing_units[0].bedrooms);
      bedrooms_max = housing_units.reduce(function (max, u) {
        return u.bedrooms > max ? u.bedrooms : max;
      }, housing_units[0].bedrooms);
      max_rent = housing_units.reduce(function (max, u) {
        return u.monthly_rent > max ? u.monthly_rent : max;
      }, housing_units[0].monthly_rent);
    }

    return {
      profile: profile,
      selected_base: selected_base,
      featured_housing_units: featured_housing_units,
      featured_businesses: featured_businesses,
      upcoming_housing_events: upcoming_housing_events,
      recommended_housing_filters: {
        bedrooms_min: bedrooms_min,
        bedrooms_max: bedrooms_max,
        max_rent: max_rent
      }
    };
  }

  // -----------------
  // Interface: getHousingFilterOptions
  // -----------------
  getHousingFilterOptions(selected_base_code) {
    // Base context not heavily used yet, but loaded for future tailoring
    const bases = this._loadEntityFromLocalStorage('bases');
    let base = null;
    if (selected_base_code) {
      base = bases.find(function (b) { return b.code === selected_base_code; }) || null;
    } else {
      base = this._getSelectedBase();
    }
    const housing_units = this._loadEntityFromLocalStorage('housing_units');
    const unitsForBase = housing_units.filter(function (u) {
      return !base || u.base_id === base.id;
    });

    let minRent = 0;
    let maxRent = 5000;
    if (unitsForBase.length > 0) {
      minRent = unitsForBase.reduce(function (min, u) {
        return u.monthly_rent < min ? u.monthly_rent : min;
      }, unitsForBase[0].monthly_rent);
      maxRent = unitsForBase.reduce(function (max, u) {
        return u.monthly_rent > max ? u.monthly_rent : max;
      }, unitsForBase[0].monthly_rent);
    }

    return {
      housing_types: [
        { value: 'on_base_housing', label: 'On-base housing' },
        { value: 'off_base_apartment', label: 'Off-base apartment' },
        { value: 'off_base_house', label: 'Off-base house' }
      ],
      bedroom_options: [1, 2, 3, 4, 5].map(function (n) {
        return { value: n, label: String(n) + ' bedroom' + (n > 1 ? 's' : '') };
      }),
      rent_range: {
        min: minRent,
        max: maxRent,
        step: 50
      },
      amenity_options: [
        { value: 'pet_friendly', label: 'Pet friendly' },
        { value: 'in_unit_laundry', label: 'In-unit laundry' },
        { value: 'parking_included', label: 'Parking included' }
      ],
      sort_options: [
        { value: 'availability_date_soonest_first', label: 'Availability Date: Soonest First' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };
  }

  // -----------------
  // Interface: searchHousingListings
  // -----------------
  searchHousingListings(housing_type, bedrooms_min, bedrooms_max, monthly_rent_min, monthly_rent_max, availability_date_from, amenities, sort_by) {
    const units = this._loadEntityFromLocalStorage('housing_units');
    const selected_base = this._getSelectedBase();
    const baseId = selected_base ? selected_base.id : null;
    const fromDate = availability_date_from ? new Date(availability_date_from) : null;
    const amenitySet = Array.isArray(amenities) ? amenities.slice() : [];

    let results = units.filter(function (u) {
      if (baseId && u.base_id && u.base_id !== baseId) return false;
      if (housing_type && u.housing_type !== housing_type) return false;

      if (typeof bedrooms_min === 'number' && u.bedrooms < bedrooms_min) return false;
      if (typeof bedrooms_max === 'number' && u.bedrooms > bedrooms_max) return false;

      if (typeof monthly_rent_min === 'number' && u.monthly_rent < monthly_rent_min) return false;
      if (typeof monthly_rent_max === 'number' && u.monthly_rent > monthly_rent_max) return false;

      if (fromDate) {
        const av = u.availability_date ? new Date(u.availability_date) : null;
        if (!av || av < fromDate) return false;
      }

      if (amenitySet.length > 0) {
        const tags = Array.isArray(u.amenities) ? u.amenities.slice() : [];
        if (u.pet_friendly) tags.push('pet_friendly');
        if (u.in_unit_laundry) tags.push('in_unit_laundry');
        if (u.parking_included) tags.push('parking_included');
        for (let i = 0; i < amenitySet.length; i++) {
          if (tags.indexOf(amenitySet[i]) === -1) return false;
        }
      }

      return true;
    });

    if (sort_by === 'availability_date_soonest_first') {
      results.sort(function (a, b) {
        const ad = a.availability_date ? new Date(a.availability_date) : null;
        const bd = b.availability_date ? new Date(b.availability_date) : null;
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad - bd;
      });
    } else if (sort_by === 'price_low_to_high') {
      results.sort(function (a, b) { return a.monthly_rent - b.monthly_rent; });
    } else if (sort_by === 'price_high_to_low') {
      results.sort(function (a, b) { return b.monthly_rent - a.monthly_rent; });
    }

    const self = this;
    return results.map(function (unit) {
      return {
        unit: unit,
        housing_type_label: self._housingTypeLabel(unit.housing_type),
        monthly_rent_formatted: self._formatCurrency(unit.monthly_rent),
        availability_date_formatted: self._formatDate(unit.availability_date),
        is_pet_friendly: !!unit.pet_friendly,
        has_in_unit_laundry: !!unit.in_unit_laundry
      };
    });
  }

  // -----------------
  // Interface: getHousingUnitDetails
  // -----------------
  getHousingUnitDetails(housingUnitId) {
    const units = this._loadEntityFromLocalStorage('housing_units');
    const unit = units.find(function (u) { return u.id === housingUnitId; }) || null;

    const result = {
      unit: unit,
      housing_type_label: '',
      monthly_rent_formatted: '',
      availability_date_formatted: '',
      amenity_tags: [],
      is_saved_to_favorites: false,
      is_saved_to_apply_later: false,
      saved_list_names: []
    };

    if (!unit) {
      return result;
    }

    const tags = Array.isArray(unit.amenities) ? unit.amenities.slice() : [];
    if (unit.pet_friendly && tags.indexOf('pet_friendly') === -1) tags.push('pet_friendly');
    if (unit.in_unit_laundry && tags.indexOf('in_unit_laundry') === -1) tags.push('in_unit_laundry');
    if (unit.parking_included && tags.indexOf('parking_included') === -1) tags.push('parking_included');

    const savedItems = this._loadEntityFromLocalStorage('housing_saved_items');
    const lists = this._loadEntityFromLocalStorage('housing_saved_lists');
    const itemsForUnit = savedItems.filter(function (si) { return si.housing_unit_id === housingUnitId; });

    const listIds = itemsForUnit.map(function (si) { return si.list_id; });
    const self = this;
    const matchedLists = lists.filter(function (l) { return listIds.indexOf(l.id) !== -1; });

    let isFav = false;
    let isApply = false;
    const listNames = [];
    matchedLists.forEach(function (l) {
      listNames.push(l.name);
      if (l.list_type === 'favorites') isFav = true;
      if (l.list_type === 'apply_later') isApply = true;
    });

    result.housing_type_label = self._housingTypeLabel(unit.housing_type);
    result.monthly_rent_formatted = self._formatCurrency(unit.monthly_rent);
    result.availability_date_formatted = self._formatDate(unit.availability_date);
    result.amenity_tags = tags;
    result.is_saved_to_favorites = isFav;
    result.is_saved_to_apply_later = isApply;
    result.saved_list_names = listNames;

    // Instrumentation for task completion tracking (task_3)
    try {
      var isOffBaseApartment = unit && unit.housing_type === 'off_base_apartment';
      var hasPetFriendly = unit && (unit.pet_friendly === true || (tags && tags.indexOf('pet_friendly') !== -1));
      var hasInUnitLaundry = unit && (unit.in_unit_laundry === true || (tags && tags.indexOf('in_unit_laundry') !== -1));
      var rentQualifies = unit && typeof unit.monthly_rent === 'number' && unit.monthly_rent <= 1600;

      if (isOffBaseApartment && hasPetFriendly && hasInUnitLaundry && rentQualifies) {
        var raw = localStorage.getItem('task3_comparedUnitIds');
        var parsed;
        if (raw) {
          try {
            parsed = JSON.parse(raw);
          } catch (e2) {
            parsed = { ids: [] };
          }
        } else {
          parsed = { ids: [] };
        }

        if (!Array.isArray(parsed.ids)) {
          parsed.ids = [];
        }

        if (parsed.ids.indexOf(housingUnitId) === -1) {
          parsed.ids.push(housingUnitId);
        }

        // Keep only the first two unique ids
        if (parsed.ids.length > 2) {
          parsed.ids = parsed.ids.slice(0, 2);
        }

        localStorage.setItem('task3_comparedUnitIds', JSON.stringify(parsed));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task_3):', e);
      } catch (eLog) {}
    }

    return result;
  }

  // -----------------
  // Interface: saveHousingUnitToList
  // -----------------
  saveHousingUnitToList(housingUnitId, list_type, custom_list_name) {
    if (!housingUnitId || !list_type) {
      return {
        success: false,
        list: null,
        saved_item: null,
        message: 'housingUnitId and list_type are required.'
      };
    }

    if (list_type === 'custom' && !custom_list_name) {
      return {
        success: false,
        list: null,
        saved_item: null,
        message: 'custom_list_name is required for custom list_type.'
      };
    }

    const units = this._loadEntityFromLocalStorage('housing_units');
    const unitExists = units.some(function (u) { return u.id === housingUnitId; });
    if (!unitExists) {
      return {
        success: false,
        list: null,
        saved_item: null,
        message: 'Housing unit not found.'
      };
    }

    const list = this._getOrCreateHousingSavedList(list_type, custom_list_name);
    let items = this._loadEntityFromLocalStorage('housing_saved_items');

    let existing = items.find(function (si) {
      return si.housing_unit_id === housingUnitId && si.list_id === list.id;
    });

    if (existing) {
      return {
        success: true,
        list: list,
        saved_item: existing,
        message: 'Already saved in this list.'
      };
    }

    const saved_item = {
      id: this._generateId('hsaved'),
      housing_unit_id: housingUnitId,
      list_id: list.id,
      saved_at: this._nowISO()
    };

    items.push(saved_item);
    this._persistEntityToLocalStorage('housing_saved_items', items);

    return {
      success: true,
      list: list,
      saved_item: saved_item,
      message: 'Housing unit saved.'
    };
  }

  // -----------------
  // Interface: getHousingSavedListsSummary
  // -----------------
  getHousingSavedListsSummary() {
    const lists = this._loadEntityFromLocalStorage('housing_saved_lists');
    const items = this._loadEntityFromLocalStorage('housing_saved_items');

    const summary = lists.map(function (list) {
      const count = items.filter(function (i) { return i.list_id === list.id; }).length;
      return {
        list: list,
        items_count: count
      };
    });

    return { lists: summary };
  }

  // -----------------
  // Interface: getResidentPortalOverview
  // -----------------
  getResidentPortalOverview() {
    const profile = this._getActiveProfile();
    const base = this._getSelectedBase();
    const current_housing_location = profile && profile.current_housing_location ? profile.current_housing_location : '';

    const requests = this._loadEntityFromLocalStorage('maintenance_requests');
    const open_requests = [];
    const self = this;
    requests.forEach(function (req) {
      if (req.status === 'completed' || req.status === 'cancelled') return;
      open_requests.push({
        request: req,
        status_label: self._maintenanceStatusLabel(req.status)
      });
    });

    return {
      profile: profile,
      base: base,
      current_housing_location: current_housing_location,
      emergency_contacts: [],
      notices: [],
      open_requests: open_requests
    };
  }

  // -----------------
  // Interface: getMaintenanceRequestsList
  // -----------------
  getMaintenanceRequestsList(status_filter) {
    const requests = this._loadEntityFromLocalStorage('maintenance_requests');
    const filter = status_filter && status_filter !== 'all' ? status_filter : null;
    const self = this;

    const list = requests
      .filter(function (r) {
        if (!filter) return true;
        return r.status === filter;
      })
      .map(function (r) {
        return {
          request: r,
          status_label: self._maintenanceStatusLabel(r.status),
          created_at_formatted: self._formatDateTime(r.created_at),
          last_updated_at_formatted: self._formatDateTime(r.last_updated_at)
        };
      });

    return list;
  }

  // -----------------
  // Interface: getMaintenanceRequestDetails
  // -----------------
  getMaintenanceRequestDetails(maintenanceRequestId) {
    const requests = this._loadEntityFromLocalStorage('maintenance_requests');
    const req = requests.find(function (r) { return r.id === maintenanceRequestId; }) || null;

    if (!req) {
      return {
        request: null,
        status_label: '',
        created_at_formatted: '',
        preferred_access_window_label: ''
      };
    }

    let windowLabel = '';
    if (req.preferred_access_day_of_week && req.preferred_access_start_time && req.preferred_access_end_time) {
      const dayMap = {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday'
      };
      const day = dayMap[req.preferred_access_day_of_week] || req.preferred_access_day_of_week;
      windowLabel = day + ' ' + req.preferred_access_start_time + '–' + req.preferred_access_end_time;
    }

    return {
      request: req,
      status_label: this._maintenanceStatusLabel(req.status),
      created_at_formatted: this._formatDateTime(req.created_at),
      preferred_access_window_label: windowLabel
    };
  }

  // -----------------
  // Interface: submitMaintenanceRequest
  // -----------------
  submitMaintenanceRequest(category, priority, description, location, preferred_access_day_of_week, preferred_access_start_time, preferred_access_end_time) {
    if (!category || !priority || !description || !location) {
      return {
        success: false,
        request: null,
        message: 'Missing required maintenance request fields.'
      };
    }

    let requests = this._loadEntityFromLocalStorage('maintenance_requests');

    const nowIso = this._nowISO();
    const request = {
      id: this._generateId('mreq'),
      category: category,
      priority: priority,
      description: description,
      location: location,
      preferred_access_day_of_week: preferred_access_day_of_week || null,
      preferred_access_start_time: preferred_access_start_time || null,
      preferred_access_end_time: preferred_access_end_time || null,
      status: 'submitted',
      created_at: nowIso,
      last_updated_at: nowIso
    };

    requests.push(request);
    this._persistEntityToLocalStorage('maintenance_requests', requests);

    return {
      success: true,
      request: request,
      message: 'Maintenance request submitted.'
    };
  }

  // -----------------
  // Interface: getBusinessDirectoryFilterOptions
  // -----------------
  getBusinessDirectoryFilterOptions() {
    return {
      categories: [
        { value: 'childcare_schools', label: 'Childcare & Schools' },
        { value: 'restaurants_dining', label: 'Restaurants & Dining' },
        { value: 'auto_repair_services', label: 'Auto Repair & Services' },
        { value: 'personal_services', label: 'Personal Services' },
        { value: 'retail_shopping', label: 'Retail & Shopping' },
        { value: 'lodging', label: 'Lodging' },
        { value: 'other_services', label: 'Other Services' }
      ],
      category_subcategory_options: [
        {
          category_value: 'childcare_schools',
          category_label: 'Childcare & Schools',
          subcategories: [
            { value: 'childcare_center', label: 'Childcare Center' },
            { value: 'preschool', label: 'Preschool' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'restaurants_dining',
          category_label: 'Restaurants & Dining',
          subcategories: [
            { value: 'restaurant', label: 'Restaurant' },
            { value: 'fast_food', label: 'Fast Food' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'auto_repair_services',
          category_label: 'Auto Repair & Services',
          subcategories: [
            { value: 'auto_shop', label: 'Auto Shop' },
            { value: 'oil_change_center', label: 'Oil Change Center' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'personal_services',
          category_label: 'Personal Services',
          subcategories: [
            { value: 'barbers_haircuts', label: 'Barbers & Haircuts' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'retail_shopping',
          category_label: 'Retail & Shopping',
          subcategories: [
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'lodging',
          category_label: 'Lodging',
          subcategories: [
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'other_services',
          category_label: 'Other Services',
          subcategories: [
            { value: 'other', label: 'Other' }
          ]
        }
      ],
      distance_options: [
        { value: 5, label: 'Within 5 miles' },
        { value: 10, label: 'Within 10 miles' },
        { value: 20, label: 'Within 20 miles' },
        { value: 50, label: 'Within 50 miles' }
      ],
      rating_thresholds: [
        { value: 0, label: 'Any rating' },
        { value: 3.0, label: '3.0 stars & up' },
        { value: 3.5, label: '3.5 stars & up' },
        { value: 4.0, label: '4.0 stars & up' },
        { value: 4.5, label: '4.5 stars & up' }
      ],
      hours_filters: [
        { value: 'open_after_1800_weekdays', label: 'Open after 6:00 PM (weekdays)' }
      ],
      delivery_options: [
        { value: 'delivers_on_base', label: 'Delivers on base' }
      ]
    };
  }

  // -----------------
  // Interface: searchBusinesses
  // -----------------
  searchBusinesses(category, subcategory, max_distance_miles, open_after_1800_weekdays, delivers_on_base, min_rating, sort_by) {
    const businesses = this._loadEntityFromLocalStorage('businesses');
    const selected_base = this._getSelectedBase();
    const baseId = selected_base ? selected_base.id : null;

    let results = businesses.filter(function (b) {
      if (baseId && b.base_id && b.base_id !== baseId) return false;
      if (category && b.category !== category) return false;
      if (subcategory && b.subcategory !== subcategory) return false;
      if (typeof max_distance_miles === 'number' && b.distance_from_main_gate !== undefined && b.distance_from_main_gate !== null) {
        if (b.distance_from_main_gate > max_distance_miles) return false;
      }
      if (open_after_1800_weekdays === true && !b.open_after_1800_weekdays) return false;
      if (delivers_on_base === true && !b.delivers_on_base) return false;
      if (typeof min_rating === 'number') {
        const r = typeof b.rating === 'number' ? b.rating : 0;
        if (r < min_rating) return false;
      }
      return true;
    });

    if (sort_by === 'rating_high_to_low') {
      results.sort(function (a, b) {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    } else if (sort_by === 'distance_low_to_high') {
      results.sort(function (a, b) {
        const da = typeof a.distance_from_main_gate === 'number' ? a.distance_from_main_gate : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_from_main_gate === 'number' ? b.distance_from_main_gate : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else if (sort_by === 'name_a_to_z') {
      results.sort(function (a, b) {
        const na = a.name || '';
        const nb = b.name || '';
        return na.localeCompare(nb);
      });
    }

    const self = this;
    return results.map(function (b) {
      return {
        business: b,
        category_label: self._businessCategoryLabel(b.category),
        subcategory_label: self._businessSubcategoryLabel(b.subcategory),
        rating_label: self._ratingLabel(b.rating),
        distance_label: self._distanceLabel(b.distance_from_main_gate)
      };
    });
  }

  // -----------------
  // Interface: getBusinessDetails
  // -----------------
  getBusinessDetails(businessId) {
    const businesses = this._loadEntityFromLocalStorage('businesses');
    const business = businesses.find(function (b) { return b.id === businessId; }) || null;
    const services = this._loadEntityFromLocalStorage('business_services');
    const savedItems = this._loadEntityFromLocalStorage('business_saved_items');
    const lists = this._loadEntityFromLocalStorage('business_saved_lists');

    if (!business) {
      return {
        business: null,
        category_label: '',
        subcategory_label: '',
        rating_label: '',
        distance_label: '',
        services: [],
        oil_change_services: [],
        is_saved: false,
        saved_list_names: []
      };
    }

    const businessServices = services.filter(function (s) { return s.business_id === businessId; });
    const oilChangeServices = businessServices.filter(function (s) { return s.service_type === 'oil_change' && s.is_active; });

    const itemsForBiz = savedItems.filter(function (si) { return si.business_id === businessId; });
    const listIds = itemsForBiz.map(function (si) { return si.list_id; });
    const matchedLists = lists.filter(function (l) { return listIds.indexOf(l.id) !== -1; });
    const savedNames = matchedLists.map(function (l) { return l.name; });

    const self = this;
    return {
      business: business,
      category_label: self._businessCategoryLabel(business.category),
      subcategory_label: self._businessSubcategoryLabel(business.subcategory),
      rating_label: self._ratingLabel(business.rating),
      distance_label: self._distanceLabel(business.distance_from_main_gate),
      services: businessServices,
      oil_change_services: oilChangeServices,
      is_saved: itemsForBiz.length > 0,
      saved_list_names: savedNames
    };
  }

  // -----------------
  // Interface: saveBusinessToList
  // -----------------
  saveBusinessToList(businessId, list_type, custom_list_name) {
    if (!businessId || !list_type) {
      return {
        success: false,
        list: null,
        saved_item: null,
        message: 'businessId and list_type are required.'
      };
    }

    if (list_type === 'custom' && !custom_list_name) {
      return {
        success: false,
        list: null,
        saved_item: null,
        message: 'custom_list_name is required for custom list_type.'
      };
    }

    const businesses = this._loadEntityFromLocalStorage('businesses');
    const existingBiz = businesses.some(function (b) { return b.id === businessId; });
    if (!existingBiz) {
      return {
        success: false,
        list: null,
        saved_item: null,
        message: 'Business not found.'
      };
    }

    const list = this._getOrCreateBusinessSavedList(list_type, custom_list_name);
    let items = this._loadEntityFromLocalStorage('business_saved_items');

    let existing = items.find(function (si) {
      return si.business_id === businessId && si.list_id === list.id;
    });

    if (existing) {
      return {
        success: true,
        list: list,
        saved_item: existing,
        message: 'Already saved in this list.'
      };
    }

    const saved_item = {
      id: this._generateId('bsaved'),
      business_id: businessId,
      list_id: list.id,
      saved_at: this._nowISO()
    };

    items.push(saved_item);
    this._persistEntityToLocalStorage('business_saved_items', items);

    return {
      success: true,
      list: list,
      saved_item: saved_item,
      message: 'Business saved.'
    };
  }

  // -----------------
  // Interface: getBusinessSavedListsSummary
  // -----------------
  getBusinessSavedListsSummary() {
    const lists = this._loadEntityFromLocalStorage('business_saved_lists');
    const items = this._loadEntityFromLocalStorage('business_saved_items');

    const summary = lists.map(function (list) {
      const count = items.filter(function (i) { return i.list_id === list.id; }).length;
      return {
        list: list,
        items_count: count
      };
    });

    return { lists: summary };
  }

  // -----------------
  // Interface: submitChildcareTourRequest
  // -----------------
  submitChildcareTourRequest(businessId, contact_name, phone, preferred_datetime, message, child_age_years) {
    if (!businessId || !contact_name || !phone || !preferred_datetime || !message) {
      return {
        success: false,
        tour_request: null,
        message: 'Missing required tour request fields.'
      };
    }

    const businesses = this._loadEntityFromLocalStorage('businesses');
    const business = businesses.find(function (b) { return b.id === businessId; }) || null;
    if (!business) {
      return {
        success: false,
        tour_request: null,
        message: 'Business not found.'
      };
    }

    let requests = this._loadEntityFromLocalStorage('childcare_tour_requests');

    const req = {
      id: this._generateId('ctour'),
      business_id: businessId,
      contact_name: contact_name,
      phone: phone,
      preferred_datetime: preferred_datetime,
      message: message,
      child_age_years: typeof child_age_years === 'number' ? child_age_years : null,
      status: 'submitted',
      submitted_at: this._nowISO()
    };

    requests.push(req);
    this._persistEntityToLocalStorage('childcare_tour_requests', requests);

    return {
      success: true,
      tour_request: req,
      message: 'Tour request submitted.'
    };
  }

  // -----------------
  // Interface: scheduleServiceAppointment
  // -----------------
  scheduleServiceAppointment(businessId, serviceId, appointment_datetime, vehicle_details, contact_phone, notes) {
    if (!businessId || !serviceId || !appointment_datetime || !contact_phone) {
      return {
        success: false,
        appointment: null,
        message: 'Missing required appointment fields.'
      };
    }

    const services = this._loadEntityFromLocalStorage('business_services');
    const service = services.find(function (s) { return s.id === serviceId; }) || null;
    if (!service) {
      return {
        success: false,
        appointment: null,
        message: 'Service not found.'
      };
    }

    if (service.business_id !== businessId) {
      return {
        success: false,
        appointment: null,
        message: 'Service does not belong to the specified business.'
      };
    }

    let appointments = this._loadEntityFromLocalStorage('service_appointments');

    const appt = {
      id: this._generateId('appt'),
      business_id: businessId,
      service_id: serviceId,
      service_type: service.service_type,
      appointment_datetime: appointment_datetime,
      vehicle_details: vehicle_details || '',
      contact_phone: contact_phone,
      notes: notes || '',
      status: 'requested',
      created_at: this._nowISO()
    };

    appointments.push(appt);
    this._persistEntityToLocalStorage('service_appointments', appointments);

    return {
      success: true,
      appointment: appt,
      message: 'Service appointment requested.'
    };
  }

  // -----------------
  // Interface: submitBusinessContactMessage
  // -----------------
  submitBusinessContactMessage(businessId, contact_name, email, phone, subject, message) {
    if (!businessId || !contact_name || !message) {
      return {
        success: false,
        message_id: null,
        message: 'Missing required contact message fields.'
      };
    }

    const businesses = this._loadEntityFromLocalStorage('businesses');
    const business = businesses.find(function (b) { return b.id === businessId; }) || null;
    if (!business) {
      return {
        success: false,
        message_id: null,
        message: 'Business not found.'
      };
    }

    let msgs = this._loadEntityFromLocalStorage('business_contact_messages');
    const id = this._generateId('bmsg');
    const record = {
      id: id,
      business_id: businessId,
      contact_name: contact_name,
      email: email || '',
      phone: phone || '',
      subject: subject || '',
      message: message,
      created_at: this._nowISO()
    };

    msgs.push(record);
    this._persistEntityToLocalStorage('business_contact_messages', msgs);

    return {
      success: true,
      message_id: id,
      message: 'Message submitted.'
    };
  }

  // -----------------
  // Interface: getDiscountFilterOptions
  // -----------------
  getDiscountFilterOptions() {
    return {
      categories: [
        { value: 'personal_services', label: 'Personal Services' },
        { value: 'restaurants_dining', label: 'Restaurants & Dining' },
        { value: 'retail_shopping', label: 'Retail & Shopping' },
        { value: 'auto_repair_services', label: 'Auto Repair & Services' },
        { value: 'childcare_schools', label: 'Childcare & Schools' },
        { value: 'other', label: 'Other' }
      ],
      category_subcategory_options: [
        {
          category_value: 'personal_services',
          category_label: 'Personal Services',
          subcategories: [
            { value: 'barbers_haircuts', label: 'Barbers & Haircuts' },
            { value: 'spa_services', label: 'Spa Services' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'restaurants_dining',
          category_label: 'Restaurants & Dining',
          subcategories: [
            { value: 'family_meals', label: 'Family Meals' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'retail_shopping',
          category_label: 'Retail & Shopping',
          subcategories: [
            { value: 'groceries', label: 'Groceries' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'auto_repair_services',
          category_label: 'Auto Repair & Services',
          subcategories: [
            { value: 'oil_change', label: 'Oil Change' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'childcare_schools',
          category_label: 'Childcare & Schools',
          subcategories: [
            { value: 'other', label: 'Other' }
          ]
        },
        {
          category_value: 'other',
          category_label: 'Other',
          subcategories: [
            { value: 'other', label: 'Other' }
          ]
        }
      ]
    };
  }

  // -----------------
  // Interface: searchDiscountOffers
  // -----------------
  searchDiscountOffers(category, subcategory, min_discount_percent, only_active, sort_by) {
    const offers = this._loadEntityFromLocalStorage('discount_offers');
    const businesses = this._loadEntityFromLocalStorage('businesses');

    const onlyActive = only_active === undefined || only_active === null ? true : !!only_active;

    let results = offers.filter(function (o) {
      if (category && o.category !== category) return false;
      if (subcategory && o.subcategory !== subcategory) return false;
      if (onlyActive && !o.is_active) return false;

      if (typeof min_discount_percent === 'number') {
        let percent = null;
        if (typeof o.discount_percent === 'number') {
          percent = o.discount_percent;
        } else if (o.discount_type === 'percentage') {
          percent = o.discount_value;
        }
        if (percent === null || percent < min_discount_percent) return false;
      }

      return true;
    });

    if (sort_by === 'discount_high_to_low') {
      results.sort(function (a, b) {
        const pa = typeof a.discount_percent === 'number' ? a.discount_percent : (a.discount_type === 'percentage' ? a.discount_value : 0);
        const pb = typeof b.discount_percent === 'number' ? b.discount_percent : (b.discount_type === 'percentage' ? b.discount_value : 0);
        return pb - pa;
      });
    } else if (sort_by === 'expiration_soonest_first') {
      results.sort(function (a, b) {
        const ea = a.expiration_date ? new Date(a.expiration_date) : null;
        const eb = b.expiration_date ? new Date(b.expiration_date) : null;
        if (!ea && !eb) return 0;
        if (!ea) return 1;
        if (!eb) return -1;
        return ea - eb;
      });
    }

    function discountLabel(o) {
      if (o.discount_type === 'percentage') {
        const val = typeof o.discount_percent === 'number' ? o.discount_percent : o.discount_value;
        return (val || 0) + '% off';
      }
      if (o.discount_type === 'amount_off') {
        return '$' + o.discount_value + ' off';
      }
      if (o.discount_type === 'bogo') {
        return 'BOGO';
      }
      return 'Offer';
    }

    const self = this;
    return results.map(function (offer) {
      const biz = offer.business_id ? businesses.find(function (b) { return b.id === offer.business_id; }) : null;
      return {
        offer: offer,
        discount_label: discountLabel(offer),
        category_label: self._businessCategoryLabel(offer.category),
        subcategory_label: self._businessSubcategoryLabel(offer.subcategory),
        business_name: biz ? biz.name : ''
      };
    });
  }

  // -----------------
  // Interface: getDiscountOfferDetails
  // -----------------
  getDiscountOfferDetails(discountOfferId) {
    const offers = this._loadEntityFromLocalStorage('discount_offers');
    const businesses = this._loadEntityFromLocalStorage('businesses');
    const offer = offers.find(function (o) { return o.id === discountOfferId; }) || null;

    if (!offer) {
      return {
        offer: null,
        discount_label: '',
        category_label: '',
        subcategory_label: '',
        business: null
      };
    }

    function discountLabel(o) {
      if (o.discount_type === 'percentage') {
        const val = typeof o.discount_percent === 'number' ? o.discount_percent : o.discount_value;
        return (val || 0) + '% off';
      }
      if (o.discount_type === 'amount_off') {
        return '$' + o.discount_value + ' off';
      }
      if (o.discount_type === 'bogo') {
        return 'BOGO';
      }
      return 'Offer';
    }

    const biz = offer.business_id ? businesses.find(function (b) { return b.id === offer.business_id; }) : null;

    return {
      offer: offer,
      discount_label: discountLabel(offer),
      category_label: this._businessCategoryLabel(offer.category),
      subcategory_label: this._businessSubcategoryLabel(offer.subcategory),
      business: biz || null
    };
  }

  // -----------------
  // Interface: saveCoupon
  // -----------------
  saveCoupon(discountOfferId) {
    if (!discountOfferId) {
      return {
        success: false,
        saved_coupon: null,
        message: 'discountOfferId is required.'
      };
    }

    const offers = this._loadEntityFromLocalStorage('discount_offers');
    const offer = offers.find(function (o) { return o.id === discountOfferId; });
    if (!offer) {
      return {
        success: false,
        saved_coupon: null,
        message: 'Discount offer not found.'
      };
    }

    let saved = this._loadEntityFromLocalStorage('saved_coupons');
    let existing = saved.find(function (c) { return c.discount_offer_id === discountOfferId; });
    if (existing) {
      return {
        success: true,
        saved_coupon: existing,
        message: 'Coupon already saved.'
      };
    }

    const saved_coupon = {
      id: this._generateId('coupon'),
      discount_offer_id: discountOfferId,
      saved_at: this._nowISO()
    };

    saved.push(saved_coupon);
    this._persistEntityToLocalStorage('saved_coupons', saved);

    return {
      success: true,
      saved_coupon: saved_coupon,
      message: 'Coupon saved.'
    };
  }

  // -----------------
  // Interface: getLodgingFilterOptions
  // -----------------
  getLodgingFilterOptions() {
    return {
      amenity_options: [
        { value: 'free_parking', label: 'Free parking' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };
  }

  // -----------------
  // Interface: searchLodgingProperties
  // -----------------
  searchLodgingProperties(check_in_date, check_out_date, adults, children, free_parking, amenities, sort_by) {
    const props = this._loadEntityFromLocalStorage('lodging_properties');
    const selected_base = this._getSelectedBase();
    const baseId = selected_base ? selected_base.id : null;

    const ci = check_in_date ? new Date(check_in_date) : null;
    const co = check_out_date ? new Date(check_out_date) : null;
    let total_nights = 0;
    if (ci && co && !isNaN(ci.getTime()) && !isNaN(co.getTime())) {
      const diffMs = co.getTime() - ci.getTime();
      total_nights = diffMs > 0 ? Math.round(diffMs / (1000 * 60 * 60 * 24)) : 0;
    }

    const amenitySet = Array.isArray(amenities) ? amenities.slice() : [];

    let results = props.filter(function (p) {
      if (baseId && p.base_id && p.base_id !== baseId) return false;
      const totalGuests = (typeof adults === 'number' ? adults : 0) + (typeof children === 'number' ? children : 0);
      if (typeof p.max_occupancy === 'number' && p.max_occupancy < totalGuests) return false;
      if (typeof p.max_adults === 'number' && typeof adults === 'number' && p.max_adults < adults) return false;
      if (typeof p.max_children === 'number' && typeof children === 'number' && p.max_children < children) return false;

      if (free_parking === true) {
        const hasTag = Array.isArray(p.amenities) && p.amenities.indexOf('free_parking') !== -1;
        if (!p.free_parking && !hasTag) return false;
      }

      if (amenitySet.length > 0) {
        const tags = Array.isArray(p.amenities) ? p.amenities.slice() : [];
        if (p.free_parking && tags.indexOf('free_parking') === -1) tags.push('free_parking');
        for (let i = 0; i < amenitySet.length; i++) {
          if (tags.indexOf(amenitySet[i]) === -1) return false;
        }
      }

      return true;
    });

    if (sort_by === 'price_low_to_high') {
      results.sort(function (a, b) { return a.nightly_rate - b.nightly_rate; });
    } else if (sort_by === 'price_high_to_low') {
      results.sort(function (a, b) { return b.nightly_rate - a.nightly_rate; });
    }

    const self = this;
    return results.map(function (property) {
      const total_price = total_nights * property.nightly_rate;
      const freeParkingFlag = !!property.free_parking || (Array.isArray(property.amenities) && property.amenities.indexOf('free_parking') !== -1);
      return {
        property: property,
        nightly_rate_formatted: self._formatCurrency(property.nightly_rate),
        total_nights: total_nights,
        total_price: total_price,
        total_price_formatted: self._formatCurrency(total_price),
        free_parking: freeParkingFlag
      };
    });
  }

  // -----------------
  // Interface: getLodgingPropertyDetails
  // -----------------
  getLodgingPropertyDetails(lodgingPropertyId, check_in_date, check_out_date, adults, children) {
    const props = this._loadEntityFromLocalStorage('lodging_properties');
    const property = props.find(function (p) { return p.id === lodgingPropertyId; }) || null;

    const ci = check_in_date ? new Date(check_in_date) : null;
    const co = check_out_date ? new Date(check_out_date) : null;
    let total_nights = 0;
    if (ci && co && !isNaN(ci.getTime()) && !isNaN(co.getTime())) {
      const diffMs = co.getTime() - ci.getTime();
      total_nights = diffMs > 0 ? Math.round(diffMs / (1000 * 60 * 60 * 24)) : 0;
    }

    if (!property) {
      return {
        property: null,
        nightly_rate_formatted: '',
        total_nights: total_nights,
        total_price: 0,
        total_price_formatted: '',
        amenity_tags: []
      };
    }

    const total_price = total_nights * property.nightly_rate;
    const tags = Array.isArray(property.amenities) ? property.amenities.slice() : [];
    if (property.free_parking && tags.indexOf('free_parking') === -1) tags.push('free_parking');

    return {
      property: property,
      nightly_rate_formatted: this._formatCurrency(property.nightly_rate),
      total_nights: total_nights,
      total_price: total_price,
      total_price_formatted: this._formatCurrency(total_price),
      amenity_tags: tags
    };
  }

  // -----------------
  // Interface: startLodgingReservation
  // -----------------
  startLodgingReservation(lodgingPropertyId, check_in_date, check_out_date, adults, children) {
    if (!lodgingPropertyId || !check_in_date || !check_out_date || adults === undefined || children === undefined) {
      return {
        success: false,
        reservation_draft: null,
        message: 'Missing required reservation fields.'
      };
    }

    const props = this._loadEntityFromLocalStorage('lodging_properties');
    const property = props.find(function (p) { return p.id === lodgingPropertyId; }) || null;
    if (!property) {
      return {
        success: false,
        reservation_draft: null,
        message: 'Lodging property not found.'
      };
    }

    let drafts = this._loadEntityFromLocalStorage('lodging_reservation_drafts');

    const draft = {
      id: this._generateId('ldraft'),
      lodging_property_id: lodgingPropertyId,
      check_in_date: new Date(check_in_date).toISOString(),
      check_out_date: new Date(check_out_date).toISOString(),
      adults: adults,
      children: children,
      status: 'in_progress',
      created_at: this._nowISO()
    };

    drafts.push(draft);
    this._persistEntityToLocalStorage('lodging_reservation_drafts', drafts);

    return {
      success: true,
      reservation_draft: draft,
      message: 'Reservation started.'
    };
  }

  // -----------------
  // Interface: getEventFilterOptions
  // -----------------
  getEventFilterOptions() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const nextMonth = (month + 1) % 12;
    const nextMonthYear = month === 11 ? year + 1 : year;

    const startNextMonth = new Date(nextMonthYear, nextMonth, 1);
    const endNextMonth = new Date(nextMonthYear, nextMonth + 1, 0);

    function fmt(d) {
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const da = d.getDate().toString().padStart(2, '0');
      return y + '-' + m + '-' + da;
    }

    const dayOfWeek = today.getDay();
    const diffToSunday = dayOfWeek; // 0 = Sunday
    const diffToSaturday = 6 - dayOfWeek;
    const startThisWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToSunday);
    const endThisWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToSaturday);

    return {
      categories: [
        { value: 'housing_relocation', label: 'Housing & Relocation' },
        { value: 'family_activities', label: 'Family Activities' },
        { value: 'training', label: 'Training' },
        { value: 'community_meeting', label: 'Community Meeting' },
        { value: 'other', label: 'Other' }
      ],
      date_presets: [
        {
          value: 'next_month',
          label: 'Next Month',
          start_date: fmt(startNextMonth),
          end_date: fmt(endNextMonth)
        },
        {
          value: 'this_week',
          label: 'This Week',
          start_date: fmt(startThisWeek),
          end_date: fmt(endThisWeek)
        }
      ]
    };
  }

  // -----------------
  // Interface: searchEvents
  // -----------------
  searchEvents(category, start_date, end_date, sort_by) {
    const events = this._loadEntityFromLocalStorage('events');
    const selected_base = this._getSelectedBase();
    const baseId = selected_base ? selected_base.id : null;

    const start = start_date ? new Date(start_date) : null;
    const end = end_date ? new Date(end_date) : null;

    let results = events.filter(function (e) {
      if (baseId && e.base_id && e.base_id !== baseId) return false;
      if (category && e.category !== category) return false;
      if (start || end) {
        const sd = e.start_datetime ? new Date(e.start_datetime) : null;
        if (!sd) return false;
        if (start && sd < start) return false;
        if (end && sd > end) return false;
      }
      return true;
    });

    if (sort_by === 'start_datetime_asc' || !sort_by) {
      results.sort(function (a, b) {
        const ad = a.start_datetime ? new Date(a.start_datetime) : null;
        const bd = b.start_datetime ? new Date(b.start_datetime) : null;
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad - bd;
      });
    }

    const self = this;
    return results.map(function (ev) {
      let label = '';
      const sd = ev.start_datetime ? new Date(ev.start_datetime) : null;
      const ed = ev.end_datetime ? new Date(ev.end_datetime) : null;
      if (sd && ed) {
        label = self._formatDateTime(ev.start_datetime) + ' – ' + self._formatDateTime(ev.end_datetime);
      } else if (sd) {
        label = self._formatDateTime(ev.start_datetime);
      }
      return {
        event: ev,
        category_label: self._eventCategoryLabel(ev.category),
        date_time_range_label: label
      };
    });
  }

  // -----------------
  // Interface: getEventDetails
  // -----------------
  getEventDetails(eventId) {
    const events = this._loadEntityFromLocalStorage('events');
    const ev = events.find(function (e) { return e.id === eventId; }) || null;
    const saved = this._loadEntityFromLocalStorage('saved_events');

    if (!ev) {
      return {
        event: null,
        category_label: '',
        date_time_range_label: '',
        is_saved: false,
        rsvp_status: null
      };
    }

    const savedEntry = saved.find(function (s) { return s.event_id === eventId; }) || null;

    let label = '';
    const sd = ev.start_datetime ? new Date(ev.start_datetime) : null;
    const ed = ev.end_datetime ? new Date(ev.end_datetime) : null;
    if (sd && ed) {
      label = this._formatDateTime(ev.start_datetime) + ' – ' + this._formatDateTime(ev.end_datetime);
    } else if (sd) {
      label = this._formatDateTime(ev.start_datetime);
    }

    return {
      event: ev,
      category_label: this._eventCategoryLabel(ev.category),
      date_time_range_label: label,
      is_saved: !!savedEntry,
      rsvp_status: savedEntry ? savedEntry.rsvp_status : null
    };
  }

  // -----------------
  // Interface: rsvpAndSaveEvent
  // -----------------
  rsvpAndSaveEvent(eventId, rsvp_status, add_to_dashboard) {
    if (!eventId || !rsvp_status) {
      return {
        success: false,
        saved_event: null,
        message: 'eventId and rsvp_status are required.'
      };
    }

    const events = this._loadEntityFromLocalStorage('events');
    const ev = events.find(function (e) { return e.id === eventId; }) || null;
    if (!ev) {
      return {
        success: false,
        saved_event: null,
        message: 'Event not found.'
      };
    }

    let saved = this._loadEntityFromLocalStorage('saved_events');
    let entry = saved.find(function (s) { return s.event_id === eventId; }) || null;

    if (entry) {
      entry.rsvp_status = rsvp_status;
      entry.added_to_dashboard = !!add_to_dashboard;
    } else {
      entry = {
        id: this._generateId('sevent'),
        event_id: eventId,
        rsvp_status: rsvp_status,
        added_to_dashboard: !!add_to_dashboard,
        created_at: this._nowISO()
      };
      saved.push(entry);
    }

    this._persistEntityToLocalStorage('saved_events', saved);

    return {
      success: true,
      saved_event: entry,
      message: 'RSVP updated.'
    };
  }

  // -----------------
  // Interface: getMyDashboardOverview
  // -----------------
  getMyDashboardOverview() {
    const profile = this._getActiveProfile();
    const base = this._getSelectedBase();

    const housingLists = this._loadEntityFromLocalStorage('housing_saved_lists');
    const housingItems = this._loadEntityFromLocalStorage('housing_saved_items');
    const housingUnits = this._loadEntityFromLocalStorage('housing_units');

    const businessLists = this._loadEntityFromLocalStorage('business_saved_lists');
    const businessItems = this._loadEntityFromLocalStorage('business_saved_items');
    const businesses = this._loadEntityFromLocalStorage('businesses');

    const savedCoupons = this._loadEntityFromLocalStorage('saved_coupons');
    const offers = this._loadEntityFromLocalStorage('discount_offers');

    const savedEvents = this._loadEntityFromLocalStorage('saved_events');
    const events = this._loadEntityFromLocalStorage('events');

    const housing_lists = housingLists.map(function (list) {
      const itemsForList = housingItems.filter(function (i) { return i.list_id === list.id; });
      const unitsForList = itemsForList.map(function (i) {
        return housingUnits.find(function (u) { return u.id === i.housing_unit_id; }) || null;
      }).filter(function (u) { return !!u; });
      return {
        list: list,
        units: unitsForList
      };
    });

    const business_lists = businessLists.map(function (list) {
      const itemsForList = businessItems.filter(function (i) { return i.list_id === list.id; });
      const bizForList = itemsForList.map(function (i) {
        return businesses.find(function (b) { return b.id === i.business_id; }) || null;
      }).filter(function (b) { return !!b; });
      return {
        list: list,
        businesses: bizForList
      };
    });

    const saved_coupons = savedCoupons.map(function (sc) {
      const offer = offers.find(function (o) { return o.id === sc.discount_offer_id; }) || null;
      const business = offer && offer.business_id ? businesses.find(function (b) { return b.id === offer.business_id; }) : null;
      return {
        saved_coupon: sc,
        offer: offer,
        business: business || null
      };
    });

    const now = new Date();
    const upcoming_events = savedEvents
      .map(function (se) {
        const ev = events.find(function (e) { return e.id === se.event_id; }) || null;
        return { saved_event: se, event: ev };
      })
      .filter(function (pair) {
        if (!pair.event) return false;
        const sd = pair.event.start_datetime ? new Date(pair.event.start_datetime) : null;
        if (!sd) return false;
        return sd >= now;
      });

    return {
      profile: profile,
      base: base,
      housing_lists: housing_lists,
      business_lists: business_lists,
      saved_coupons: saved_coupons,
      upcoming_events: upcoming_events
    };
  }

  // -----------------
  // Interface: updateProfileDetails
  // -----------------
  updateProfileDetails(first_name, last_name, email, username, password, selected_base_code, phone, current_housing_location) {
    const profiles = this._loadEntityFromLocalStorage('profiles');
    const activeId = localStorage.getItem('activeProfileId') || '';
    let profile = profiles.find(function (p) { return p.id === activeId; }) || null;

    if (!profile && profiles.length > 0) {
      profile = profiles[0];
    }

    if (!profile) {
      return {
        success: false,
        profile: null,
        message: 'No profile to update.'
      };
    }

    if (first_name !== undefined) profile.first_name = first_name;
    if (last_name !== undefined) profile.last_name = last_name;
    if (email !== undefined) profile.email = email;
    if (username !== undefined) profile.username = username;
    if (password !== undefined) profile.password = password;
    if (selected_base_code !== undefined) profile.selected_base_code = selected_base_code;
    if (phone !== undefined) profile.phone = phone;
    if (current_housing_location !== undefined) profile.current_housing_location = current_housing_location;
    profile.updated_at = this._nowISO();

    this._persistEntityToLocalStorage('profiles', profiles);
    localStorage.setItem('activeProfileId', profile.id);

    return {
      success: true,
      profile: profile,
      message: 'Profile updated.'
    };
  }

  // -----------------
  // Interface: getAboutPageContent
  // -----------------
  getAboutPageContent() {
    return {
      heading: 'About the Base Housing & Business Directory',
      body: 'This site helps residents and families find housing, local businesses, discounts, lodging, and community events around their installation.',
      sections: [
        {
          title: 'Housing',
          body: 'Browse on-base housing and nearby rentals, save favorites, and track units you plan to apply for.',
          link_target: 'housing_listings'
        },
        {
          title: 'Business Directory',
          body: 'Find restaurants, childcare, auto services, personal care, and more that support your base community.',
          link_target: 'business_directory'
        },
        {
          title: 'Resident Portal',
          body: 'Submit and track maintenance requests, view notices, and manage your housing profile.',
          link_target: 'resident_portal'
        }
      ]
    };
  }

  // -----------------
  // Interface: getContactPageContent
  // -----------------
  getContactPageContent() {
    return {
      housing_office_phone: '555-0001',
      support_email: 'support@example-housing.mil',
      office_hours: 'Monday–Friday, 0800–1700',
      address: '123 Example Ave, Base Housing Office',
      additional_contacts: [
        {
          label: 'After-hours Emergency Maintenance',
          phone: '555-0002',
          email: ''
        },
        {
          label: 'Community Events Office',
          phone: '555-0003',
          email: 'events@example-housing.mil'
        }
      ]
    };
  }

  // -----------------
  // Interface: submitSupportRequest
  // -----------------
  submitSupportRequest(name, email, topic, message) {
    if (!name || !email || !topic || !message) {
      return {
        success: false,
        ticket_id: null,
        message: 'All fields are required.'
      };
    }

    let tickets = this._loadEntityFromLocalStorage('support_requests');
    const id = this._generateId('ticket');
    const record = {
      id: id,
      name: name,
      email: email,
      topic: topic,
      message: message,
      created_at: this._nowISO()
    };

    tickets.push(record);
    this._persistEntityToLocalStorage('support_requests', tickets);

    return {
      success: true,
      ticket_id: id,
      message: 'Support request submitted.'
    };
  }

  // -----------------
  // Interface: getLegalContent
  // -----------------
  getLegalContent() {
    const terms = '<h1>Terms of Use</h1><p>Use of this site is intended for base residents and authorized users only.</p>';
    const privacy = '<h1>Privacy Policy</h1><p>This site stores limited information in your browser to support saved items and preferences.</p>';
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    return {
      terms_html: terms,
      privacy_html: privacy,
      last_updated_date: y + '-' + m + '-' + d
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