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

  // -----------------------
  // Storage & ID helpers
  // -----------------------

  _initStorage() {
    const tableKeys = [
      'library_branches',
      'terms',
      'branch_hours',
      'favorite_branches',
      'borrowing_item_types',
      'borrowing_policies',
      'personal_borrowing_goals',
      'study_areas',
      'study_spots',
      'study_rooms',
      'study_room_bookings',
      'pickup_locations',
      'interlibrary_loan_requests',
      'equipment_types',
      'low_risk_items',
      'workshops',
      'workshop_registrations',
      'subject_guides',
      'database_resources',
      'my_resources',
      'favorites_folders',
      'resource_favorite_assignments',
      'accessibility_requests',
      // generic/support tables
      'contact_messages',
      'contact_help_phone_numbers',
      'contact_help_email_addresses',
      'contact_help_support_links',
      'about_library_getting_started_steps',
      'about_library_support_links',
      'food_drink_allowed_items_list',
      'food_drink_prohibited_items_list',
      'featured_services',
      'quick_links'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Simple content fields (strings) - do not overwrite if present
    const contentKeys = [
      'about_library_system_description',
      'accessibility_overview_text',
      'accessibility_eligibility_info',
      'accessibility_request_cta_text',
      'food_drink_overall_rules_text',
      'food_drink_last_updated',
      'fines_fees_overview_text',
      'fines_fees_last_updated',
      'ill_overview_text',
      'ill_eligibility_text',
      'ill_turnaround_times_text'
    ];
    for (const key of contentKeys) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '');
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

  _getObjectFromStorage(key, defaultValue = {}) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : defaultValue;
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

  // -----------------------
  // Generic helpers
  // -----------------------

  _todayDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _formatCampusLabel(campus) {
    switch (campus) {
      case 'main_campus':
        return 'Main Campus';
      case 'north_campus':
        return 'North Campus';
      case 'south_campus':
        return 'South Campus';
      case 'downtown_campus':
        return 'Downtown Campus';
      default:
        return '';
    }
  }

  _dayOfWeekFromDate(date) {
    // 0=Sunday
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _timeStringToMinutes(timeStr) {
    // Expect formats like '5:00 PM', '09:30 AM'
    if (!timeStr) return null;
    const parts = timeStr.trim().split(' ');
    if (parts.length !== 2) return null;
    const hm = parts[0].split(':');
    if (hm.length !== 2) return null;
    let hours = parseInt(hm[0], 10);
    const minutes = parseInt(hm[1], 10) || 0;
    const ampm = parts[1].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  _parseISODate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _dateOnlyToISO(dateStr) {
    // dateStr in 'YYYY-MM-DD'
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00.000Z').toISOString();
  }

  _loadUserState() {
    return {
      favorite_branches: this._getFromStorage('favorite_branches'),
      study_spots: this._getFromStorage('study_spots'),
      personal_borrowing_goals: this._getFromStorage('personal_borrowing_goals'),
      low_risk_items: this._getFromStorage('low_risk_items'),
      my_resources: this._getFromStorage('my_resources')
    };
  }

  _saveUserState(state) {
    if (state.favorite_branches) this._saveToStorage('favorite_branches', state.favorite_branches);
    if (state.study_spots) this._saveToStorage('study_spots', state.study_spots);
    if (state.personal_borrowing_goals) this._saveToStorage('personal_borrowing_goals', state.personal_borrowing_goals);
    if (state.low_risk_items) this._saveToStorage('low_risk_items', state.low_risk_items);
    if (state.my_resources) this._saveToStorage('my_resources', state.my_resources);
  }

  _getCurrentTerm() {
    const terms = this._getFromStorage('terms');
    if (!terms.length) return null;
    const todayStr = this._todayDateString();
    const today = new Date(todayStr + 'T00:00:00Z');
    let current = null;
    for (const term of terms) {
      const start = this._parseISODate(term.start_date);
      const end = this._parseISODate(term.end_date);
      if (start && end && start <= today && today <= end) {
        current = term;
        break;
      }
    }
    if (current) return current;
    // Fallback: regular term, else first
    const regular = terms.find(t => t.code === 'regular');
    return regular || terms[0];
  }

  _resolveBranchHoursForDay(termCode, dayOfWeek) {
    const terms = this._getFromStorage('terms');
    const branchHours = this._getFromStorage('branch_hours');
    const branches = this._getFromStorage('library_branches');
    const term = terms.find(t => t.code === termCode);
    if (!term) return {};
    const result = {};
    for (const bh of branchHours) {
      if (bh.term_id === term.id && bh.day_of_week === dayOfWeek) {
        const branch = branches.find(b => b.id === bh.branch_id) || null;
        result[bh.branch_id] = {
          is_closed: bh.is_closed,
          open_time: bh.open_time || '',
          close_time: bh.close_time || '',
          notes: bh.notes || '',
          branch,
          term
        };
      }
    }
    return result;
  }

  _filterAndSortStudyRooms(rooms, groupSize, amenities, sortBy, date, startTime, endTime) {
    const bookings = this._getFromStorage('study_room_bookings');
    const branches = this._getFromStorage('library_branches');
    const startMinutes = this._timeStringToMinutes(startTime);
    const endMinutes = this._timeStringToMinutes(endTime);

    const results = [];
    for (const room of rooms) {
      // Capacity filter
      if (typeof groupSize === 'number') {
        if (room.capacity_min > groupSize || room.capacity_max < groupSize) {
          continue;
        }
      }

      // Amenities filter
      if (amenities && typeof amenities === 'object') {
        if (amenities.requiresWhiteboard && !room.has_whiteboard) continue;
        if (amenities.requiresDisplayScreen && !room.has_display_screen) continue;
        if (amenities.requiresWheelchairAccessible && !room.is_wheelchair_accessible) continue;
      }

      // Availability filter
      const roomBookings = bookings.filter(b => {
        if (b.room_id !== room.id) return false;
        if (!b.date) return false;
        const dateOnly = b.date.slice(0, 10);
        return dateOnly === date;
      });

      let canBook = true;
      for (const b of roomBookings) {
        const bStart = this._timeStringToMinutes(b.start_time);
        const bEnd = this._timeStringToMinutes(b.end_time);
        if (bStart == null || bEnd == null) continue;
        // overlap if start < existingEnd && end > existingStart
        if (startMinutes < bEnd && endMinutes > bStart) {
          canBook = false;
          break;
        }
      }

      if (!canBook) continue;

      const branch = branches.find(br => br.id === room.branch_id) || null;

      results.push({
        room: { ...room, branch },
        branch_name: branch ? branch.name : '',
        available_start_time: startTime,
        available_end_time: endTime,
        can_book_requested_range: true,
        notes: room.notes || ''
      });
    }

    if (sortBy === 'start_time_asc') {
      results.sort((a, b) => {
        const aM = this._timeStringToMinutes(a.available_start_time) || 0;
        const bM = this._timeStringToMinutes(b.available_start_time) || 0;
        return aM - bM;
      });
    } else if (sortBy === 'capacity_asc') {
      results.sort((a, b) => {
        const aCap = a.room.capacity_max || 0;
        const bCap = b.room.capacity_max || 0;
        return aCap - bCap;
      });
    }

    return results;
  }

  _validateBorrowingGoalAgainstPolicy(policy, goalItems) {
    if (!policy) {
      return { valid: false, normalizedGoal: goalItems, message: 'Borrowing policy not found for the selected item type.' };
    }
    if (typeof goalItems !== 'number' || goalItems <= 0) {
      return { valid: false, normalizedGoal: goalItems, message: 'Goal must be a positive number.' };
    }
    if (goalItems > policy.max_items) {
      return {
        valid: false,
        normalizedGoal: policy.max_items,
        message: 'Goal exceeds maximum allowed items for this policy.'
      };
    }
    return { valid: true, normalizedGoal: goalItems, message: '' };
  }

  _computeEquipmentRiskLevel(equipmentType) {
    if (!equipmentType) return 'high_risk';
    const fine = typeof equipmentType.daily_overdue_fine === 'number' ? equipmentType.daily_overdue_fine : 0;
    const replacement = typeof equipmentType.replacement_cost === 'number' ? equipmentType.replacement_cost : 0;
    if (fine <= 2 && replacement <= 100) return 'low_risk';
    if (fine <= 10 && replacement <= 500) return 'medium_risk';
    return 'high_risk';
  }

  // -----------------------
  // Interface implementations
  // -----------------------

  // getHomePageSummary
  getHomePageSummary() {
    const todayDateStr = this._todayDateString();
    const currentTerm = this._getCurrentTerm();

    const quickLinks = this._getFromStorage('quick_links');

    // branches today hours
    const termCode = currentTerm ? currentTerm.code : 'regular';
    const dayOfWeek = this._dayOfWeekFromDate(new Date());
    const branches = this._getFromStorage('library_branches');
    const hoursMap = this._resolveBranchHoursForDay(termCode, dayOfWeek);
    const favoriteBranches = this._getFromStorage('favorite_branches');

    const branchesTodayHours = branches.map(branch => {
      const hours = hoursMap[branch.id] || null;
      const isFavorite = favoriteBranches.some(f => f.branch_id === branch.id);
      return {
        branch_id: branch.id,
        branch_name: branch.name,
        campus: branch.campus,
        campus_label: this._formatCampusLabel(branch.campus),
        is_main_library: !!branch.is_main_library,
        is_favorite: isFavorite,
        has_alerts: false,
        alert_message: '',
        todays_hours: {
          is_closed: hours ? !!hours.is_closed : true,
          open_time: hours ? hours.open_time : '',
          close_time: hours ? hours.close_time : '',
          notes: hours ? hours.notes : ''
        }
      };
    });

    // upcoming workshops (starting today or later)
    const workshops = this._getFromStorage('workshops');
    const now = new Date();
    const upcoming = workshops
      .filter(w => {
        const start = this._parseISODate(w.start_datetime);
        return start && start >= now;
      })
      .sort((a, b) => {
        const aStart = this._parseISODate(a.start_datetime) || new Date(0);
        const bStart = this._parseISODate(b.start_datetime) || new Date(0);
        return aStart - bStart;
      });

    const featuredServices = this._getFromStorage('featured_services');

    return {
      today_date: todayDateStr,
      current_term: currentTerm
        ? { id: currentTerm.id, name: currentTerm.name, code: currentTerm.code }
        : null,
      quick_links: quickLinks,
      branches_today_hours: branchesTodayHours,
      upcoming_workshops: upcoming,
      featured_services: featuredServices
    };
  }

  // getAboutLibraryOverview
  getAboutLibraryOverview() {
    const systemDescription = localStorage.getItem('about_library_system_description') || '';
    const gettingStartedSteps = this._getFromStorage('about_library_getting_started_steps');
    const supportLinks = this._getFromStorage('about_library_support_links');

    const branches = this._getFromStorage('library_branches');
    const branchHighlights = branches.map(b => ({
      branch_id: b.id,
      branch_name: b.name,
      campus_label: this._formatCampusLabel(b.campus),
      is_main_library: !!b.is_main_library,
      short_description: b.description || ''
    }));

    return {
      system_description: systemDescription,
      getting_started_steps: gettingStartedSteps,
      branch_highlights: branchHighlights,
      support_links: supportLinks
    };
  }

  // getContactHelpInfo
  getContactHelpInfo() {
    const phoneNumbers = this._getFromStorage('contact_help_phone_numbers');
    const emailAddresses = this._getFromStorage('contact_help_email_addresses');
    const supportLinks = this._getFromStorage('contact_help_support_links');
    const mailingAddress = localStorage.getItem('contact_help_mailing_address') || '';

    return {
      phone_numbers: phoneNumbers,
      email_addresses: emailAddresses,
      mailing_address: mailingAddress,
      support_links: supportLinks
    };
  }

  // submitContactMessage
  submitContactMessage(name, email, topic, message) {
    const contactMessages = this._getFromStorage('contact_messages');
    const id = this._generateId('contact');
    const record = {
      id,
      name,
      email,
      topic,
      message,
      submitted_at: new Date().toISOString()
    };
    contactMessages.push(record);
    this._saveToStorage('contact_messages', contactMessages);
    return {
      success: true,
      ticket_id: id,
      message: 'Your message has been submitted.'
    };
  }

  // getHoursAndLocationsFilters
  getHoursAndLocationsFilters() {
    const terms = this._getFromStorage('terms');
    const defaultTerm = this._getCurrentTerm();
    const defaultTermCode = defaultTerm ? defaultTerm.code : 'regular';

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const defaultDayOfWeek = this._dayOfWeekFromDate(new Date());

    const sortOptions = [
      { value: 'name_asc', label: 'Name (A–Z)' },
      { value: 'name_desc', label: 'Name (Z–A)' },
      { value: 'sunday_close_desc', label: 'Sunday closing time (latest first)' }
    ];

    return {
      terms,
      default_term_code: defaultTermCode,
      days_of_week: daysOfWeek,
      default_day_of_week: defaultDayOfWeek,
      sort_options: sortOptions
    };
  }

  // getBranchHoursList
  getBranchHoursList(termCode, dayOfWeek, sortBy) {
    const branches = this._getFromStorage('library_branches');
    const favoriteBranches = this._getFromStorage('favorite_branches');
    const hoursMap = this._resolveBranchHoursForDay(termCode, dayOfWeek);

    let list = branches.map(branch => {
      const hours = hoursMap[branch.id] || null;
      const isFavorite = favoriteBranches.some(f => f.branch_id === branch.id);
      return {
        branch_id: branch.id,
        branch_name: branch.name,
        campus: branch.campus,
        campus_label: this._formatCampusLabel(branch.campus),
        address: branch.address || '',
        city: branch.city || '',
        postal_code: branch.postal_code || '',
        is_main_library: !!branch.is_main_library,
        is_favorite: isFavorite,
        hours_for_day: {
          is_closed: hours ? !!hours.is_closed : true,
          open_time: hours ? hours.open_time : '',
          close_time: hours ? hours.close_time : '',
          notes: hours ? hours.notes : ''
        }
      };
    });

    if (sortBy === 'name_asc') {
      list.sort((a, b) => a.branch_name.localeCompare(b.branch_name));
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => b.branch_name.localeCompare(a.branch_name));
    } else if (sortBy === 'sunday_close_desc') {
      list.sort((a, b) => {
        const aClose = this._timeStringToMinutes(a.hours_for_day.close_time) || -1;
        const bClose = this._timeStringToMinutes(b.hours_for_day.close_time) || -1;
        return bClose - aClose;
      });
    }

    // Instrumentation for task completion tracking
    try {
      const existing = localStorage.getItem('task1_correctHoursFilter');
      if (existing === null) {
        const terms = this._getFromStorage('terms');
        const examTerm = terms.find(t => t && t.name === 'Exam Period');
        if (examTerm && termCode === examTerm.code && dayOfWeek === 'sunday' && sortBy === 'sunday_close_desc') {
          localStorage.setItem(
            'task1_correctHoursFilter',
            JSON.stringify({ term_code: termCode, day_of_week: dayOfWeek, sort_by: sortBy })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task1_correctHoursFilter):', e);
    }

    return list;
  }

  // getLibraryBranchDetail
  getLibraryBranchDetail(branchId) {
    const branches = this._getFromStorage('library_branches');
    const terms = this._getFromStorage('terms');
    const branchHours = this._getFromStorage('branch_hours');
    const favoriteBranches = this._getFromStorage('favorite_branches');
    const studyAreas = this._getFromStorage('study_areas');
    const studyRooms = this._getFromStorage('study_rooms');

    const branch = branches.find(b => b.id === branchId) || null;
    if (!branch) {
      return {
        branch: null,
        campus_label: '',
        is_favorite: false,
        hours_by_term: [],
        contact_info: { phone: '', email: '' },
        map: { latitude: null, longitude: null },
        available_services: [],
        spaces_summary: [],
        key_policies: []
      };
    }

    const isFavorite = favoriteBranches.some(f => f.branch_id === branch.id);

    const hoursByTerm = terms.map(term => {
      const weekly = branchHours
        .filter(h => h.branch_id === branch.id && h.term_id === term.id)
        .map(h => ({
          ...h,
          branch,
          term
        }));
      return {
        term,
        weekly_hours: weekly
      };
    });

    // spaces summary
    const branchStudyAreas = studyAreas.filter(sa => sa.branch_id === branch.id);
    const branchStudyRooms = studyRooms.filter(sr => sr.branch_id === branch.id);
    const spacesSummaryMap = {};

    for (const sa of branchStudyAreas) {
      const key = sa.area_type || 'other';
      if (!spacesSummaryMap[key]) spacesSummaryMap[key] = 0;
      spacesSummaryMap[key] += 1;
    }
    if (branchStudyRooms.length) {
      const key = 'group_study_room';
      spacesSummaryMap[key] = (spacesSummaryMap[key] || 0) + branchStudyRooms.length;
    }

    const spacesSummary = Object.keys(spacesSummaryMap).map(type => ({
      type,
      count: spacesSummaryMap[type]
    }));

    // Instrumentation for task completion tracking
    try {
      const existing = localStorage.getItem('task1_branchDetailOpenSequence');
      let openedBranchIds = [];
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (parsed && Array.isArray(parsed.opened_branch_ids)) {
            openedBranchIds = parsed.opened_branch_ids.slice();
          }
        } catch (e) {
          // If parsing fails, start with a fresh array
          openedBranchIds = [];
        }
      }
      openedBranchIds.push(branchId);
      const valueToSet = { opened_branch_ids: openedBranchIds };
      localStorage.setItem('task1_branchDetailOpenSequence', JSON.stringify(valueToSet));
    } catch (e) {
      console.error('Instrumentation error (task1_branchDetailOpenSequence):', e);
    }

    return {
      branch,
      campus_label: this._formatCampusLabel(branch.campus),
      is_favorite: isFavorite,
      hours_by_term: hoursByTerm,
      contact_info: {
        phone: branch.phone || '',
        email: branch.email || ''
      },
      map: {
        latitude: typeof branch.latitude === 'number' ? branch.latitude : null,
        longitude: typeof branch.longitude === 'number' ? branch.longitude : null
      },
      available_services: [],
      spaces_summary: spacesSummary,
      key_policies: []
    };
  }

  // addBranchToFavorites
  addBranchToFavorites(branchId) {
    const branches = this._getFromStorage('library_branches');
    const branch = branches.find(b => b.id === branchId);
    if (!branch) {
      return { success: false, favorite: null, total_favorites: 0, message: 'Branch not found.' };
    }
    const favorites = this._getFromStorage('favorite_branches');
    const existing = favorites.find(f => f.branch_id === branchId);
    if (existing) {
      return { success: true, favorite: existing, total_favorites: favorites.length, message: 'Branch is already in favorites.' };
    }
    const favorite = {
      id: this._generateId('favbranch'),
      branch_id: branchId,
      date_added: new Date().toISOString()
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_branches', favorites);
    return { success: true, favorite, total_favorites: favorites.length, message: 'Branch added to favorites.' };
  }

  // removeBranchFromFavorites
  removeBranchFromFavorites(branchId) {
    const favorites = this._getFromStorage('favorite_branches');
    const before = favorites.length;
    const updated = favorites.filter(f => f.branch_id !== branchId);
    this._saveToStorage('favorite_branches', updated);
    const after = updated.length;
    const removed = before !== after;
    return {
      success: removed,
      total_favorites: after,
      message: removed ? 'Branch removed from favorites.' : 'Branch was not in favorites.'
    };
  }

  // getFavoriteBranches
  getFavoriteBranches() {
    const favorites = this._getFromStorage('favorite_branches');
    const branches = this._getFromStorage('library_branches');

    return favorites.map(f => {
      const branch = branches.find(b => b.id === f.branch_id) || null;
      return {
        favorite_id: f.id,
        branch_id: f.branch_id,
        branch_name: branch ? branch.name : '',
        campus_label: branch ? this._formatCampusLabel(branch.campus) : '',
        address: branch ? branch.address || '' : '',
        is_main_library: branch ? !!branch.is_main_library : false,
        date_added: f.date_added,
        branch
      };
    });
  }

  // getBorrowingUserTypes
  getBorrowingUserTypes() {
    return [
      {
        code: 'undergraduate_students',
        label: 'Undergraduate Students',
        description: 'Borrowing policies for undergraduate students.'
      },
      {
        code: 'graduate_students',
        label: 'Graduate Students',
        description: 'Borrowing policies for graduate students.'
      },
      {
        code: 'faculty',
        label: 'Faculty',
        description: 'Borrowing policies for faculty members.'
      },
      {
        code: 'staff',
        label: 'Staff',
        description: 'Borrowing policies for library and university staff.'
      },
      {
        code: 'visitor',
        label: 'Visitors',
        description: 'Borrowing policies for visitors and community members.'
      }
    ];
  }

  // getBorrowingPoliciesByUserType
  getBorrowingPoliciesByUserType(userType) {
    const policies = this._getFromStorage('borrowing_policies').filter(p => p.user_type === userType);
    const itemTypes = this._getFromStorage('borrowing_item_types');

    return policies.map(p => {
      const itemType = itemTypes.find(it => it.id === p.item_type_id) || null;
      return {
        policy_id: p.id,
        item_type_id: p.item_type_id,
        item_type_code: itemType ? itemType.code : '',
        item_type_display_name: itemType ? itemType.display_name : '',
        description: itemType ? itemType.description || '' : '',
        max_items: p.max_items,
        loan_period_days: p.loan_period_days || null,
        renewals_allowed: p.renewals_allowed || null,
        overdue_fine_per_day: p.overdue_fine_per_day || null,
        notes: p.notes || '',
        item_type: itemType,
        policy: p
      };
    });
  }

  // getBorrowingPolicyDetails
  getBorrowingPolicyDetails(policyId) {
    const policies = this._getFromStorage('borrowing_policies');
    const itemTypes = this._getFromStorage('borrowing_item_types');
    const policy = policies.find(p => p.id === policyId) || null;
    if (!policy) {
      return {
        policy: null,
        item_type: null,
        user_type_label: '',
        max_items_explanation: '',
        additional_details: ''
      };
    }
    const itemType = itemTypes.find(it => it.id === policy.item_type_id) || null;
    let userTypeLabel = '';
    const userTypes = this.getBorrowingUserTypes();
    const ut = userTypes.find(u => u.code === policy.user_type);
    if (ut) userTypeLabel = ut.label;

    const maxItemsExplanation = itemType
      ? 'You may borrow up to ' + policy.max_items + ' ' + itemType.display_name + ' items at a time.'
      : 'You may borrow up to ' + policy.max_items + ' items at a time.';

    const additionalDetails = policy.notes || '';

    return {
      policy,
      item_type: itemType,
      user_type_label: userTypeLabel,
      max_items_explanation: maxItemsExplanation,
      additional_details: additionalDetails
    };
  }

  // getPersonalBorrowingGoalSummary
  getPersonalBorrowingGoalSummary() {
    const goals = this._getFromStorage('personal_borrowing_goals');
    const itemTypes = this._getFromStorage('borrowing_item_types');
    const policies = this._getFromStorage('borrowing_policies');

    const enrichedGoals = goals.map(g => ({
      ...g,
      target_item_type: itemTypes.find(it => it.id === g.target_item_type_id) || null,
      source_policy: g.source_policy_id
        ? policies.find(p => p.id === g.source_policy_id) || null
        : null
    }));

    let highlightedGoal = null;
    if (enrichedGoals.length > 0) {
      const g = enrichedGoals[0];
      const itemType = g.target_item_type;
      let maxFromPolicy = null;
      let policy = g.source_policy;
      if (!policy) {
        policy = policies.find(p => p.user_type === g.target_user_type && p.item_type_id === g.target_item_type_id) || null;
      }
      if (policy) maxFromPolicy = policy.max_items;
      highlightedGoal = {
        user_type: g.target_user_type,
        item_type_id: g.target_item_type_id,
        item_type_display_name: itemType ? itemType.display_name : '',
        goal_items: g.goal_items,
        max_items_from_policy: maxFromPolicy
      };
    }

    return {
      goals: enrichedGoals,
      highlighted_goal: highlightedGoal
    };
  }

  // setPersonalBorrowingGoal
  setPersonalBorrowingGoal(userType, itemTypeId, goalItems, sourcePolicyId) {
    const policies = this._getFromStorage('borrowing_policies');
    const itemTypes = this._getFromStorage('borrowing_item_types');

    let policy = null;
    if (sourcePolicyId) {
      policy = policies.find(p => p.id === sourcePolicyId) || null;
    }
    if (!policy) {
      policy = policies.find(p => p.user_type === userType && p.item_type_id === itemTypeId) || null;
    }

    const validation = this._validateBorrowingGoalAgainstPolicy(policy, goalItems);
    if (!validation.valid) {
      return {
        success: false,
        goal: null,
        panel_summary_text: '',
        message: validation.message
      };
    }

    const goals = this._getFromStorage('personal_borrowing_goals');
    let goal = goals.find(g => g.target_user_type === userType && g.target_item_type_id === itemTypeId) || null;
    const now = new Date().toISOString();

    if (goal) {
      goal.goal_items = validation.normalizedGoal;
      goal.source_policy_id = policy ? policy.id : null;
      goal.updated_at = now;
    } else {
      goal = {
        id: this._generateId('pgoal'),
        target_user_type: userType,
        target_item_type_id: itemTypeId,
        goal_items: validation.normalizedGoal,
        source_policy_id: policy ? policy.id : null,
        created_at: now,
        updated_at: now
      };
      goals.push(goal);
    }

    this._saveToStorage('personal_borrowing_goals', goals);

    const itemType = itemTypes.find(it => it.id === itemTypeId) || null;
    const itemLabel = itemType ? itemType.display_name : 'items';
    const panelSummary = 'Personal goal set to ' + validation.normalizedGoal + ' ' + itemLabel + '.';

    return {
      success: true,
      goal,
      panel_summary_text: panelSummary,
      message: 'Personal borrowing goal saved.'
    };
  }

  // getAccessibilityServicesOverview
  getAccessibilityServicesOverview() {
    const overviewText = localStorage.getItem('accessibility_overview_text') || '';
    const eligibilityInfo = localStorage.getItem('accessibility_eligibility_info') || '';
    const supportOptions = this._getFromStorage('accessibility_support_options');
    const requestCtaText = localStorage.getItem('accessibility_request_cta_text') || '';

    return {
      overview_text: overviewText,
      eligibility_info: eligibilityInfo,
      support_options: supportOptions,
      request_cta_text: requestCtaText
    };
  }

  // submitAccessibilityRequest
  submitAccessibilityRequest(name, preferredContactMethod, email, phone, requestDetails) {
    const requests = this._getFromStorage('accessibility_requests');
    const request = {
      id: this._generateId('access'),
      name,
      preferred_contact_method: preferredContactMethod,
      email: email || null,
      phone: phone || null,
      request_details: requestDetails,
      submitted_at: new Date().toISOString(),
      status: 'submitted'
    };
    requests.push(request);
    this._saveToStorage('accessibility_requests', requests);
    return {
      success: true,
      request,
      message: 'Accessibility request submitted.'
    };
  }

  // getFoodAndDrinkPolicyOverview
  getFoodAndDrinkPolicyOverview() {
    const overallRules = localStorage.getItem('food_drink_overall_rules_text') || '';
    const allowedItems = this._getFromStorage('food_drink_allowed_items_list');
    const prohibitedItems = this._getFromStorage('food_drink_prohibited_items_list');
    const lastUpdated = localStorage.getItem('food_drink_last_updated') || '';

    const areaTypeFilterOptions = [
      { value: 'study_space', label: 'Study spaces' },
      { value: 'computer_lab', label: 'Computer labs' },
      { value: 'classroom', label: 'Classrooms' },
      { value: 'lounge', label: 'Lounges' },
      { value: 'other', label: 'Other areas' }
    ];

    return {
      overall_rules_text: overallRules,
      allowed_items_list: allowedItems,
      prohibited_items_list: prohibitedItems,
      area_type_filter_options: areaTypeFilterOptions,
      last_updated: lastUpdated
    };
  }

  // searchStudyAreas
  searchStudyAreas(filters) {
    filters = filters || {};
    const studyAreas = this._getFromStorage('study_areas');
    const studySpots = this._getFromStorage('study_spots');
    const branches = this._getFromStorage('library_branches');

    const results = [];
    for (const area of studyAreas) {
      if (filters.areaType && area.area_type !== filters.areaType) continue;
      if (filters.campus && area.campus !== filters.campus) continue;
      if (typeof filters.allowsCoveredDrinks === 'boolean' && area.allows_covered_drinks !== filters.allowsCoveredDrinks) continue;
      if (typeof filters.allowsColdSnacks === 'boolean' && area.allows_cold_snacks !== filters.allowsColdSnacks) continue;
      if (typeof filters.allowsHotMeals === 'boolean' && area.allows_hot_meals !== filters.allowsHotMeals) continue;

      const branch = branches.find(b => b.id === area.branch_id) || null;
      const isSaved = studySpots.some(s => s.study_area_id === area.id);

      results.push({
        study_area_id: area.id,
        study_area_name: area.name,
        branch_name: branch ? branch.name : '',
        campus: area.campus,
        campus_label: this._formatCampusLabel(area.campus),
        area_type: area.area_type,
        allows_covered_drinks: !!area.allows_covered_drinks,
        allows_cold_snacks: !!area.allows_cold_snacks,
        allows_hot_meals: !!area.allows_hot_meals,
        quiet_zone: !!area.quiet_zone,
        reservable: !!area.reservable,
        is_saved_spot: isSaved,
        study_area: area
      });
    }

    return results;
  }

  // getStudyAreaDetail
  getStudyAreaDetail(studyAreaId) {
    const studyAreas = this._getFromStorage('study_areas');
    const branches = this._getFromStorage('library_branches');
    const studySpots = this._getFromStorage('study_spots');

    const area = studyAreas.find(sa => sa.id === studyAreaId) || null;
    if (!area) {
      return {
        study_area: null,
        branch_name: '',
        campus_label: '',
        food_drink_policy: {
          allows_covered_drinks: false,
          allows_cold_snacks: false,
          allows_hot_meals: false
        },
        amenities: [],
        is_saved_spot: false,
        is_primary_spot: false
      };
    }

    const branch = branches.find(b => b.id === area.branch_id) || null;
    const spot = studySpots.find(s => s.study_area_id === studyAreaId) || null;

    const amenities = [];
    if (area.has_power_outlets) amenities.push('Power outlets');
    if (area.has_natural_light) amenities.push('Natural light');

    return {
      study_area: { ...area, branch },
      branch_name: branch ? branch.name : '',
      campus_label: this._formatCampusLabel(area.campus),
      food_drink_policy: {
        allows_covered_drinks: !!area.allows_covered_drinks,
        allows_cold_snacks: !!area.allows_cold_snacks,
        allows_hot_meals: !!area.allows_hot_meals
      },
      amenities,
      is_saved_spot: !!spot,
      is_primary_spot: spot ? !!spot.is_primary : false
    };
  }

  // addStudyAreaToMyStudySpots
  addStudyAreaToMyStudySpots(studyAreaId) {
    const studyAreas = this._getFromStorage('study_areas');
    const area = studyAreas.find(sa => sa.id === studyAreaId);
    if (!area) {
      return { success: false, study_spot: null, total_spots: 0, message: 'Study area not found.' };
    }
    const studySpots = this._getFromStorage('study_spots');
    let spot = studySpots.find(s => s.study_area_id === studyAreaId) || null;
    if (spot) {
      return { success: true, study_spot: spot, total_spots: studySpots.length, message: 'Study area already in your study spots.' };
    }
    const now = new Date().toISOString();
    const isPrimary = studySpots.length === 0;
    spot = {
      id: this._generateId('spot'),
      study_area_id: studyAreaId,
      date_added: now,
      is_primary: isPrimary
    };
    studySpots.push(spot);
    this._saveToStorage('study_spots', studySpots);
    return { success: true, study_spot: spot, total_spots: studySpots.length, message: 'Study area added to your study spots.' };
  }

  // removeStudyAreaFromMyStudySpots
  removeStudyAreaFromMyStudySpots(studyAreaId) {
    const studySpots = this._getFromStorage('study_spots');
    const index = studySpots.findIndex(s => s.study_area_id === studyAreaId);
    if (index === -1) {
      return { success: false, total_spots: studySpots.length, message: 'Study area not in your study spots.' };
    }
    const removed = studySpots.splice(index, 1)[0];
    // if removed was primary, set another as primary
    if (removed.is_primary && studySpots.length > 0) {
      for (const s of studySpots) {
        s.is_primary = false;
      }
      studySpots[0].is_primary = true;
    }
    this._saveToStorage('study_spots', studySpots);
    return { success: true, total_spots: studySpots.length, message: 'Study area removed from your study spots.' };
  }

  // getMyStudySpots
  getMyStudySpots(filters) {
    filters = filters || {};
    const studySpots = this._getFromStorage('study_spots');
    const studyAreas = this._getFromStorage('study_areas');
    const branches = this._getFromStorage('library_branches');

    const results = [];
    for (const spot of studySpots) {
      const area = studyAreas.find(sa => sa.id === spot.study_area_id) || null;
      if (!area) continue;
      if (filters.campus && area.campus !== filters.campus) continue;
      const branch = branches.find(b => b.id === area.branch_id) || null;

      results.push({
        study_spot_id: spot.id,
        study_area_id: spot.study_area_id,
        study_area_name: area.name,
        branch_name: branch ? branch.name : '',
        campus: area.campus,
        campus_label: this._formatCampusLabel(area.campus),
        floor: area.floor || '',
        location_description: area.location_description || '',
        quiet_zone: !!area.quiet_zone,
        allows_covered_drinks: !!area.allows_covered_drinks,
        allows_cold_snacks: !!area.allows_cold_snacks,
        allows_hot_meals: !!area.allows_hot_meals,
        is_primary: !!spot.is_primary,
        date_added: spot.date_added,
        study_area: area
      });
    }

    return results;
  }

  // setPrimaryStudySpot
  setPrimaryStudySpot(studySpotId) {
    const studySpots = this._getFromStorage('study_spots');
    const spot = studySpots.find(s => s.id === studySpotId) || null;
    if (!spot) {
      return { success: false, new_primary_spot_id: null, message: 'Study spot not found.' };
    }
    for (const s of studySpots) {
      s.is_primary = false;
    }
    spot.is_primary = true;
    this._saveToStorage('study_spots', studySpots);
    return { success: true, new_primary_spot_id: spot.id, message: 'Primary study spot updated.' };
  }

  // getStudyRoomBookingFilters
  getStudyRoomBookingFilters() {
    const locationOptions = this._getFromStorage('library_branches');
    const capacityOptions = [
      { min: 2, max: 3, label: '2–3 people' },
      { min: 4, max: 6, label: '4–6 people' },
      { min: 7, max: 10, label: '7–10 people' }
    ];
    const amenityOptions = [
      { key: 'whiteboard', label: 'Whiteboard' },
      { key: 'display_screen', label: 'Display screen' },
      { key: 'wheelchair_accessible', label: 'Wheelchair accessible' }
    ];

    const defaultDate = this._todayDateString();
    const defaultTimeRange = {
      start_time: '9:00 AM',
      end_time: '5:00 PM'
    };

    return {
      location_options: locationOptions,
      capacity_options: capacityOptions,
      amenity_options: amenityOptions,
      default_date: defaultDate,
      default_time_range: defaultTimeRange
    };
  }

  // searchStudyRooms
  searchStudyRooms(locationBranchId, date, startTime, endTime, groupSize, amenities, sortBy) {
    const rooms = this._getFromStorage('study_rooms').filter(r => r.branch_id === locationBranchId);
    return this._filterAndSortStudyRooms(rooms, groupSize, amenities || {}, sortBy || 'start_time_asc', date, startTime, endTime);
  }

  // createStudyRoomBooking
  createStudyRoomBooking(roomId, date, startTime, endTime, groupSize, requesterName, universityId) {
    const rooms = this._getFromStorage('study_rooms');
    const room = rooms.find(r => r.id === roomId) || null;
    if (!room) {
      return { success: false, booking: null, room_summary: null, confirmation_message: 'Study room not found.' };
    }

    if (typeof groupSize === 'number') {
      if (room.capacity_min > groupSize || room.capacity_max < groupSize) {
        return {
          success: false,
          booking: null,
          room_summary: null,
          confirmation_message: 'Group size is outside the allowed range for this room.'
        };
      }
    }

    const bookings = this._getFromStorage('study_room_bookings');
    const startMinutes = this._timeStringToMinutes(startTime);
    const endMinutes = this._timeStringToMinutes(endTime);

    const conflicts = bookings.some(b => {
      if (b.room_id !== roomId) return false;
      if (!b.date) return false;
      const dateOnly = b.date.slice(0, 10);
      if (dateOnly !== date) return false;
      const bStart = this._timeStringToMinutes(b.start_time);
      const bEnd = this._timeStringToMinutes(b.end_time);
      if (bStart == null || bEnd == null) return false;
      return startMinutes < bEnd && endMinutes > bStart;
    });

    if (conflicts) {
      return {
        success: false,
        booking: null,
        room_summary: null,
        confirmation_message: 'The selected time range conflicts with an existing booking.'
      };
    }

    const booking = {
      id: this._generateId('roombook'),
      room_id: roomId,
      date: this._dateOnlyToISO(date),
      start_time: startTime,
      end_time: endTime,
      group_size: groupSize,
      requester_name: requesterName,
      university_id: universityId,
      created_at: new Date().toISOString(),
      status: 'confirmed'
    };

    bookings.push(booking);
    this._saveToStorage('study_room_bookings', bookings);

    const branches = this._getFromStorage('library_branches');
    const branch = branches.find(b => b.id === room.branch_id) || null;

    return {
      success: true,
      booking: { ...booking, room },
      room_summary: {
        room_name: room.name,
        branch_name: branch ? branch.name : ''
      },
      confirmation_message: 'Your study room booking is confirmed.'
    };
  }

  // getInterlibraryLoanOverview
  getInterlibraryLoanOverview() {
    const overviewText = localStorage.getItem('ill_overview_text') || '';
    const eligibilityText = localStorage.getItem('ill_eligibility_text') || '';
    const turnaroundText = localStorage.getItem('ill_turnaround_times_text') || '';

    const requestTypeOptions = [
      { value: 'book_chapter', label: 'Book chapter' },
      { value: 'article', label: 'Article' },
      { value: 'book', label: 'Book' },
      { value: 'other', label: 'Other' }
    ];

    return {
      overview_text: overviewText,
      eligibility_text: eligibilityText,
      turnaround_times_text: turnaroundText,
      request_type_options: requestTypeOptions
    };
  }

  // getPickupLocations
  getPickupLocations() {
    const pickups = this._getFromStorage('pickup_locations');
    const branches = this._getFromStorage('library_branches');

    return pickups.map(pl => {
      const branch = branches.find(b => b.id === pl.branch_id) || null;
      return {
        pickup_location: { ...pl, branch },
        branch_name: branch ? branch.name : ''
      };
    });
  }

  // submitInterlibraryLoanRequest
  submitInterlibraryLoanRequest(requestType, bookTitle, chapterTitle, articleTitle, pages, pickupLocationId, needByDate, notes) {
    const pickups = this._getFromStorage('pickup_locations');
    const pickup = pickups.find(p => p.id === pickupLocationId) || null;
    if (!pickup) {
      return { success: false, request: null, message: 'Pickup location not found.' };
    }

    const requests = this._getFromStorage('interlibrary_loan_requests');
    const request = {
      id: this._generateId('ill'),
      request_type: requestType,
      book_title: bookTitle || null,
      chapter_title: chapterTitle || null,
      article_title: articleTitle || null,
      pages: pages || null,
      pickup_location_id: pickupLocationId,
      need_by_date: this._dateOnlyToISO(needByDate),
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      notes: notes || ''
    };
    requests.push(request);
    this._saveToStorage('interlibrary_loan_requests', requests);

    return {
      success: true,
      request: { ...request, pickup_location: pickup },
      message: 'Interlibrary loan request submitted.'
    };
  }

  // getFinesAndFeesOverview
  getFinesAndFeesOverview() {
    const overviewText = localStorage.getItem('fines_fees_overview_text') || '';
    const lastUpdated = localStorage.getItem('fines_fees_last_updated') || '';

    const categories = [
      { key: 'books', label: 'Books', description: 'Standard circulating books.' },
      { key: 'media', label: 'Media', description: 'DVDs, CDs, and other media.' },
      { key: 'reserves', label: 'Course reserves', description: 'Short-term loan course materials.' },
      { key: 'equipment', label: 'Equipment', description: 'Laptops, cameras, and other equipment.' }
    ];

    return {
      overview_text: overviewText,
      last_updated: lastUpdated,
      categories
    };
  }

  // getEquipmentFineFilterOptions
  getEquipmentFineFilterOptions() {
    const equipment = this._getFromStorage('equipment_types');
    let minFine = 0;
    let maxFine = 0;
    if (equipment.length > 0) {
      minFine = Math.min.apply(null, equipment.map(e => e.daily_overdue_fine || 0));
      maxFine = Math.max.apply(null, equipment.map(e => e.daily_overdue_fine || 0));
    }

    const categoriesSet = new Set();
    for (const e of equipment) {
      if (e.category) categoriesSet.add(e.category);
    }
    const categoryOptions = Array.from(categoriesSet).map(c => ({ value: c, label: c }));

    const sortOptions = [
      { value: 'daily_fine_asc', label: 'Daily fine (low to high)' },
      { value: 'daily_fine_desc', label: 'Daily fine (high to low)' },
      { value: 'name_asc', label: 'Name (A–Z)' }
    ];

    return {
      min_daily_fine: minFine,
      max_daily_fine: maxFine,
      default_min_daily_fine: minFine,
      default_max_daily_fine: maxFine,
      category_options: categoryOptions,
      sort_options: sortOptions
    };
  }

  // searchEquipmentTypes
  searchEquipmentTypes(filters) {
    filters = filters || {};
    const equipment = this._getFromStorage('equipment_types');

    let results = equipment.filter(e => {
      const fine = e.daily_overdue_fine || 0;
      if (typeof filters.minDailyFine === 'number' && fine < filters.minDailyFine) return false;
      if (typeof filters.maxDailyFine === 'number' && fine > filters.maxDailyFine) return false;
      if (filters.category && e.category !== filters.category) return false;
      return true;
    });

    if (filters.sortBy === 'daily_fine_asc') {
      results.sort((a, b) => (a.daily_overdue_fine || 0) - (b.daily_overdue_fine || 0));
    } else if (filters.sortBy === 'daily_fine_desc') {
      results.sort((a, b) => (b.daily_overdue_fine || 0) - (a.daily_overdue_fine || 0));
    } else if (filters.sortBy === 'name_asc') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return results.map(e => ({
      equipment_type: e,
      daily_overdue_fine: e.daily_overdue_fine,
      loan_period_hours: typeof e.loan_period_hours === 'number' ? e.loan_period_hours : null,
      loan_period_days: typeof e.loan_period_days === 'number' ? e.loan_period_days : null,
      category_label: e.category || ''
    }));
  }

  // getEquipmentPolicyDetail
  getEquipmentPolicyDetail(equipmentTypeId) {
    const equipment = this._getFromStorage('equipment_types');
    const lowRiskItems = this._getFromStorage('low_risk_items');
    const eq = equipment.find(e => e.id === equipmentTypeId) || null;
    if (!eq) {
      return {
        equipment_type: null,
        risk_level: 'high_risk',
        is_low_risk_item: false,
        policy_notes: ''
      };
    }

    const riskLevel = this._computeEquipmentRiskLevel(eq);
    const isLowRiskItem = lowRiskItems.some(li => li.equipment_type_id === equipmentTypeId);

    return {
      equipment_type: eq,
      risk_level: riskLevel,
      is_low_risk_item: isLowRiskItem,
      policy_notes: eq.notes || ''
    };
  }

  // addLowRiskItem
  addLowRiskItem(equipmentTypeId) {
    const equipment = this._getFromStorage('equipment_types');
    const eq = equipment.find(e => e.id === equipmentTypeId) || null;
    if (!eq) {
      return { success: false, low_risk_item: null, total_low_risk_items: 0, message: 'Equipment type not found.' };
    }

    const lowRiskItems = this._getFromStorage('low_risk_items');
    let item = lowRiskItems.find(li => li.equipment_type_id === equipmentTypeId) || null;
    if (item) {
      return {
        success: true,
        low_risk_item: item,
        total_low_risk_items: lowRiskItems.length,
        message: 'Equipment already in low-risk items list.'
      };
    }

    item = {
      id: this._generateId('lreq'),
      equipment_type_id: equipmentTypeId,
      date_added: new Date().toISOString()
    };
    lowRiskItems.push(item);
    this._saveToStorage('low_risk_items', lowRiskItems);

    return {
      success: true,
      low_risk_item: item,
      total_low_risk_items: lowRiskItems.length,
      message: 'Equipment added to low-risk items list.'
    };
  }

  // removeLowRiskItem
  removeLowRiskItem(equipmentTypeId) {
    const lowRiskItems = this._getFromStorage('low_risk_items');
    const before = lowRiskItems.length;
    const updated = lowRiskItems.filter(li => li.equipment_type_id !== equipmentTypeId);
    this._saveToStorage('low_risk_items', updated);
    const after = updated.length;
    const removed = before !== after;
    return {
      success: removed,
      total_low_risk_items: after,
      message: removed ? 'Equipment removed from low-risk items list.' : 'Equipment not found in low-risk items list.'
    };
  }

  // getLowRiskItemsList
  getLowRiskItemsList() {
    const lowRiskItems = this._getFromStorage('low_risk_items');
    const equipment = this._getFromStorage('equipment_types');

    return lowRiskItems.map(li => {
      const eq = equipment.find(e => e.id === li.equipment_type_id) || null;
      return {
        low_risk_item_id: li.id,
        equipment_type_id: li.equipment_type_id,
        equipment_name: eq ? eq.name : '',
        category: eq ? eq.category || '' : '',
        daily_overdue_fine: eq ? eq.daily_overdue_fine || 0 : 0,
        loan_period_hours: eq && typeof eq.loan_period_hours === 'number' ? eq.loan_period_hours : null,
        loan_period_days: eq && typeof eq.loan_period_days === 'number' ? eq.loan_period_days : null,
        date_added: li.date_added,
        equipment_type: eq
      };
    });
  }

  // getWorkshopSearchFilters
  getWorkshopSearchFilters() {
    const formatOptions = [
      { value: 'online', label: 'Online' },
      { value: 'in_person', label: 'In person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const timeFilterOptions = [
      { value: 'time_4pm_or_later', label: '4:00 PM or later' }
    ];

    const today = new Date(this._todayDateString() + 'T00:00:00Z');
    const end = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);
    const toDateStr = d => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    };

    const dateRangePresets = [
      {
        key: 'next_7_days',
        label: 'Next 7 days',
        start_date: toDateStr(today),
        end_date: toDateStr(end)
      }
    ];

    return {
      format_options: formatOptions,
      time_filter_options: timeFilterOptions,
      date_range_presets: dateRangePresets
    };
  }

  // searchWorkshops
  searchWorkshops(query, dateRange, startTimeFilter, format) {
    const workshops = this._getFromStorage('workshops');
    const q = (query || '').trim().toLowerCase();

    let results = workshops.filter(w => {
      // keyword filter
      if (q) {
        const inTitle = (w.title || '').toLowerCase().includes(q);
        const inKeywords = Array.isArray(w.keywords)
          ? w.keywords.some(k => (k || '').toLowerCase().includes(q))
          : false;
        if (!inTitle && !inKeywords) return false;
      }

      // date range filter
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        const start = this._parseISODate(w.start_datetime);
        if (!start) return false;
        const startDateStr = start.toISOString().slice(0, 10);
        if (startDateStr < dateRange.startDate || startDateStr > dateRange.endDate) return false;
      }

      // start time filter
      if (startTimeFilter === 'time_4pm_or_later') {
        const start = this._parseISODate(w.start_datetime);
        if (!start) return false;
        const minutes = start.getUTCHours() * 60 + start.getUTCMinutes();
        const threshold = 16 * 60; // 4 PM
        if (minutes < threshold) return false;
      }

      // format filter
      if (format && w.format !== format) return false;

      return true;
    });

    results.sort((a, b) => {
      const aStart = this._parseISODate(a.start_datetime) || new Date(0);
      const bStart = this._parseISODate(b.start_datetime) || new Date(0);
      return aStart - bStart;
    });

    return results;
  }

  // getWorkshopDetail
  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const registrations = this._getFromStorage('workshop_registrations');
    const workshop = workshops.find(w => w.id === workshopId) || null;
    if (!workshop) {
      return {
        workshop: null,
        registration_open: false,
        registration_instructions: ''
      };
    }

    let registrationOpen = true;
    if (workshop.is_registration_required && typeof workshop.max_registrations === 'number') {
      const count = registrations.filter(r => r.workshop_id === workshopId && r.status === 'registered').length;
      if (count >= workshop.max_registrations) {
        registrationOpen = false;
      }
    }

    const instructions = localStorage.getItem('workshop_registration_instructions_' + workshopId) || 'Complete the registration form to reserve your spot.';

    return {
      workshop,
      registration_open: registrationOpen,
      registration_instructions: instructions
    };
  }

  // registerForWorkshopQuick
  registerForWorkshopQuick(workshopId, registrantName, registrantEmail) {
    const workshops = this._getFromStorage('workshops');
    const registrations = this._getFromStorage('workshop_registrations');
    const workshop = workshops.find(w => w.id === workshopId) || null;
    if (!workshop) {
      return {
        success: false,
        registration: null,
        confirmation_message: 'Workshop not found.',
        next_steps: ''
      };
    }

    // check registration open
    const detail = this.getWorkshopDetail(workshopId);
    if (!detail.registration_open) {
      return {
        success: false,
        registration: null,
        confirmation_message: 'Registration is closed for this workshop.',
        next_steps: ''
      };
    }

    const registration = {
      id: this._generateId('wreg'),
      workshop_id: workshopId,
      registrant_name: registrantName,
      registrant_email: registrantEmail,
      registration_type: 'quick_registration',
      registered_at: new Date().toISOString(),
      status: 'registered'
    };
    registrations.push(registration);
    this._saveToStorage('workshop_registrations', registrations);

    return {
      success: true,
      registration: { ...registration, workshop },
      confirmation_message: 'You are registered for the workshop.',
      next_steps: 'Check your email for confirmation and joining instructions.'
    };
  }

  // getSubjectGuidesList
  getSubjectGuidesList() {
    return this._getFromStorage('subject_guides');
  }

  // getSubjectGuideDetail
  getSubjectGuideDetail(guideId) {
    const guides = this._getFromStorage('subject_guides');
    const databases = this._getFromStorage('database_resources');
    const myResources = this._getFromStorage('my_resources');

    const guide = guides.find(g => g.id === guideId) || null;
    if (!guide) {
      return {
        guide: null,
        best_bet_databases: [],
        other_sections: []
      };
    }

    const bestBetDatabases = databases
      .filter(db => db.is_best_bet && Array.isArray(db.subject_guide_ids) && db.subject_guide_ids.includes(guideId))
      .map(db => ({
        database: db,
        is_in_my_resources: myResources.some(mr => mr.database_resource_id === db.id)
      }));

    const otherSections = this._getFromStorage('subject_guide_sections_' + guideId);

    return {
      guide,
      best_bet_databases: bestBetDatabases,
      other_sections: otherSections
    };
  }

  // addDatabaseToMyResources
  addDatabaseToMyResources(databaseResourceId, subject) {
    const databases = this._getFromStorage('database_resources');
    const db = databases.find(d => d.id === databaseResourceId) || null;
    if (!db) {
      return { success: false, my_resource: null, message: 'Database resource not found.' };
    }

    const myResources = this._getFromStorage('my_resources');
    let existing = myResources.find(mr => mr.database_resource_id === databaseResourceId && mr.subject === subject) || null;
    if (existing) {
      return { success: true, my_resource: existing, message: 'Resource already in My Resources.' };
    }

    const myResource = {
      id: this._generateId('myres'),
      database_resource_id: databaseResourceId,
      subject,
      date_added: new Date().toISOString()
    };
    myResources.push(myResource);
    this._saveToStorage('my_resources', myResources);

    return {
      success: true,
      my_resource: myResource,
      message: 'Resource added to My Resources.'
    };
  }

  // getMyResources
  getMyResources(filters) {
    filters = filters || {};
    const myResources = this._getFromStorage('my_resources');
    const databases = this._getFromStorage('database_resources');
    const folders = this._getFromStorage('favorites_folders');
    const assignments = this._getFromStorage('resource_favorite_assignments');

    const filtered = myResources.filter(mr => {
      if (filters.subject && mr.subject !== filters.subject) return false;
      return true;
    });

    return filtered.map(mr => {
      const db = databases.find(d => d.id === mr.database_resource_id) || null;
      const mrAssignments = assignments.filter(a => a.my_resource_id === mr.id);
      const favoritesFolders = mrAssignments.map(a => {
        const folder = folders.find(f => f.id === a.folder_id) || null;
        return {
          folder_id: a.folder_id,
          folder_name: folder ? folder.name : ''
        };
      });

      return {
        my_resource_id: mr.id,
        database_resource_id: mr.database_resource_id,
        name: db ? db.name : '',
        url: db ? db.url : '',
        subject: mr.subject,
        date_added: mr.date_added,
        favorites_folders: favoritesFolders,
        database_resource: db
      };
    });
  }

  // getFavoritesFoldersList
  getFavoritesFoldersList() {
    return this._getFromStorage('favorites_folders');
  }

  // assignResourcesToFavoritesFolder
  assignResourcesToFavoritesFolder(myResourceIds, folderId) {
    const folders = this._getFromStorage('favorites_folders');
    const folder = folders.find(f => f.id === folderId) || null;
    if (!folder) {
      return { success: false, assignments: [], message: 'Favorites folder not found.' };
    }

    const assignments = this._getFromStorage('resource_favorite_assignments');
    const now = new Date().toISOString();
    const newAssignments = [];

    for (const myResourceId of myResourceIds) {
      const exists = assignments.some(a => a.my_resource_id === myResourceId && a.folder_id === folderId);
      if (exists) continue;
      const assignment = {
        id: this._generateId('rfav'),
        my_resource_id: myResourceId,
        folder_id: folderId,
        date_added: now
      };
      assignments.push(assignment);
      newAssignments.push(assignment);
    }

    this._saveToStorage('resource_favorite_assignments', assignments);

    return {
      success: true,
      assignments: newAssignments,
      message: 'Resources assigned to folder.'
    };
  }

  // getMyAccountOverview
  getMyAccountOverview() {
    const favorites = this._getFromStorage('favorite_branches');
    const studySpots = this._getFromStorage('study_spots');
    const myResources = this._getFromStorage('my_resources');
    const lowRiskItems = this._getFromStorage('low_risk_items');
    const goals = this._getFromStorage('personal_borrowing_goals');

    const studyAreas = this._getFromStorage('study_areas');
    const branches = this._getFromStorage('library_branches');

    let primaryStudySpotSummary = null;
    const primarySpot = studySpots.find(s => s.is_primary) || studySpots[0] || null;
    if (primarySpot) {
      const area = studyAreas.find(sa => sa.id === primarySpot.study_area_id) || null;
      const branch = area ? branches.find(b => b.id === area.branch_id) || null : null;
      primaryStudySpotSummary = {
        study_spot_id: primarySpot.id,
        study_area_name: area ? area.name : '',
        branch_name: branch ? branch.name : '',
        campus_label: area ? this._formatCampusLabel(area.campus) : ''
      };
    }

    return {
      favorite_branches_count: favorites.length,
      study_spots_count: studySpots.length,
      resources_count: myResources.length,
      low_risk_items_count: lowRiskItems.length,
      has_personal_borrowing_goal: goals.length > 0,
      primary_study_spot: primaryStudySpotSummary
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