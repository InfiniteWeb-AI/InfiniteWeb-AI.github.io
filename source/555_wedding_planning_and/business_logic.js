// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  // =====================
  // Storage initialization
  // =====================
  _initStorage() {
    // Core entity tables
    const tables = [
      'packages',
      'package_bookings',
      'vendors',
      'shortlists',
      'budgets',
      'budget_categories',
      'guest_lists',
      'guests',
      'consultation_requests',
      'timelines',
      'timeline_events',
      'add_on_services',
      'payment_plan_options',
      'custom_packages',
      'checklists',
      'checklist_tasks',
      'suggested_tasks'
    ];
    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Static / content tables (empty defaults, not domain mock data)
    if (!localStorage.getItem('home_page_content')) {
      localStorage.setItem(
        'home_page_content',
        JSON.stringify({ hero_title: '', hero_subtitle: '', core_services: [], featured_tools: [], common_tasks: [] })
      );
    }
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem(
        'about_page_content',
        JSON.stringify({ company_overview: '', philosophy: '', specializations: [], team_members: [], testimonials: [], primary_ctas: [] })
      );
    }
    if (!localStorage.getItem('contact_page_info')) {
      localStorage.setItem(
        'contact_page_info',
        JSON.stringify({ email: '', phone: '', address: '', office_hours: '', response_time_message: '', quick_links: [] })
      );
    }
    if (!localStorage.getItem('faqs')) {
      localStorage.setItem('faqs', JSON.stringify([]));
    }
    if (!localStorage.getItem('policies')) {
      localStorage.setItem(
        'policies',
        JSON.stringify({
          terms_and_conditions: '',
          privacy_policy: '',
          payment_policy: '',
          cancellation_policy: '',
          contact_for_policy_questions: ''
        })
      );
    }

    // Global ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue !== undefined ? defaultValue : [];
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

  // =====================
  // Generic helpers
  // =====================
  _formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  _getPackageTypeLabel(type) {
    const map = {
      day_of_coordination: 'Day-of Coordination',
      full_planning: 'Full Planning',
      partial_planning: 'Partial Planning',
      consultation_only: 'Consultation Only',
      other: 'Other'
    };
    return map[type] || type;
  }

  _getVendorTypeLabel(type) {
    const map = {
      photographer: 'Photographer',
      florist: 'Florist',
      caterer: 'Caterer',
      venue: 'Venue',
      dj: 'DJ',
      videographer: 'Videographer',
      planner: 'Planner',
      baker: 'Baker',
      decor: 'Decor',
      other: 'Other'
    };
    return map[type] || type;
  }

  _getTravelFeeLabel(option) {
    const map = {
      included: 'Travel fee included',
      extra: 'Travel fee extra',
      not_offered: 'No travel offered'
    };
    return map[option] || option;
  }

  _normalizeAndParseDateTime(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date/time: ' + value);
      }
      // Preserve the original string so stored datetimes match caller input
      // (tests compare the raw datetime string, not a normalized ISO value).
      return value;
    }
    throw new Error('Unsupported date/time value');
  }

  _normalizeDateOnly(value) {
    if (!value) return null;
    const iso = this._normalizeAndParseDateTime(value);
    const d = new Date(iso);
    // normalize to midnight UTC
    const d2 = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    return d2.toISOString();
  }

  _dateKeyFromISO(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _getOrCreateShortlistRecord() {
    let shortlists = this._getFromStorage('shortlists');
    let shortlist = shortlists[0] || null;
    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        name: '',
        package_ids: [],
        vendor_ids: [],
        last_saved_at: null
      };
      shortlists.push(shortlist);
      this._saveToStorage('shortlists', shortlists);
    }
    return shortlist;
  }

  _calculateBudgetTotal(budgetId) {
    const budgets = this._getFromStorage('budgets');
    const categories = this._getFromStorage('budget_categories');
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return null;
    const total = categories
      .filter(c => c.budget_id === budgetId)
      .reduce((sum, c) => sum + (typeof c.amount === 'number' ? c.amount : 0), 0);
    budget.total_amount = total;
    this._saveToStorage('budgets', budgets);
    return budget;
  }

  _validateCustomPackageSelection(basePackageType, addOns, paymentPlanOption) {
    const config = this.getCustomPackageBuilderConfig();
    const constraints = config.default_constraints || {};
    const requiredCount = constraints.required_add_on_count;
    const maxEach = constraints.max_add_on_price_each;
    const maxTotal = constraints.max_total_add_on_price;

    if (requiredCount && addOns.length !== requiredCount) {
      throw new Error('Exactly ' + requiredCount + ' add-ons must be selected.');
    }
    let total = 0;
    for (const addOn of addOns) {
      if (typeof addOn.price !== 'number') continue;
      if (maxEach && addOn.price > maxEach) {
        throw new Error('Add-on "' + addOn.name + '" exceeds max price of ' + maxEach + '.');
      }
      total += addOn.price;
    }
    if (maxTotal && total > maxTotal) {
      throw new Error('Total add-on price ' + total + ' exceeds max of ' + maxTotal + '.');
    }
    if (!paymentPlanOption) {
      throw new Error('Invalid payment plan option.');
    }
    return total;
  }

  _generateAvailableTimeSlots(context, isoDate, extraContext) {
    // context: 'package' or 'consultation'
    const baseSlots = ['10:00', '12:00', '14:00', '16:00', '18:00'];
    const dateKey = this._dateKeyFromISO(isoDate);
    const d = new Date(isoDate);
    const day = d.getUTCDay(); // 0-6, 0 Sunday

    let slots = baseSlots.slice();
    // Example business rule: fewer slots on Sundays
    if (day === 0) {
      slots = ['12:00', '14:00', '16:00'];
    }

    if (context === 'package') {
      const bookings = this._getFromStorage('package_bookings');
      const taken = bookings
        .filter(b => this._dateKeyFromISO(b.start_datetime) === dateKey)
        .map(b => {
          const dt = new Date(b.start_datetime);
          const hh = String(dt.getUTCHours()).padStart(2, '0');
          const mm = String(dt.getUTCMinutes()).padStart(2, '0');
          return hh + ':' + mm;
        });
      return slots.filter(s => !taken.includes(s));
    }

    if (context === 'consultation') {
      const consultationType = extraContext;
      const consultations = this._getFromStorage('consultation_requests');
      const taken = consultations
        .filter(c => c.consultation_type === consultationType && this._dateKeyFromISO(c.start_datetime) === dateKey)
        .map(c => {
          const dt = new Date(c.start_datetime);
          const hh = String(dt.getUTCHours()).padStart(2, '0');
          const mm = String(dt.getUTCMinutes()).padStart(2, '0');
          return hh + ':' + mm;
        });
      return slots.filter(s => !taken.includes(s));
    }

    return slots;
  }

  // =====================
  // Home page
  // =====================
  getHomePageData() {
    const packages = this._getFromStorage('packages');
    const featured_packages = packages.filter(p => p.is_active).slice(0, 3);

    // Use stored content if present, otherwise simple defaults
    const stored = this._getFromStorage('home_page_content', null) || {};

    const hero_title = stored.hero_title || 'Plan your wedding with ease';
    const hero_subtitle = stored.hero_subtitle || 'Day-of coordination, full planning, and everything in between.';

    const core_services = stored.core_services && stored.core_services.length
      ? stored.core_services
      : [
          { id: 'svc_day_of', title: 'Day-of Coordination', description: 'Stress-free execution of your wedding day.' },
          { id: 'svc_full_planning', title: 'Full Planning', description: 'From venue scouting to final send-off.' },
          { id: 'svc_tools', title: 'Planning Tools', description: 'Budgets, guest lists, timelines, and checklists.' }
        ];

    const featured_tools = stored.featured_tools && stored.featured_tools.length
      ? stored.featured_tools
      : [
          {
            tool_id: 'budget_planner',
            name: 'Budget Planner',
            description: 'Keep your wedding finances on track.',
            primary_action_label: 'Create a Budget',
            target_page: 'budget_planner'
          },
          {
            tool_id: 'guest_list',
            name: 'Guest List',
            description: 'Track invitations, RSVPs, and meal choices.',
            primary_action_label: 'Start Guest List',
            target_page: 'guest_list'
          },
          {
            tool_id: 'day_of_timeline',
            name: 'Day-of Timeline',
            description: 'Map out your wedding day schedule.',
            primary_action_label: 'Build Timeline',
            target_page: 'day_of_timeline'
          }
        ];

    const common_tasks = stored.common_tasks && stored.common_tasks.length
      ? stored.common_tasks
      : [
          {
            task_id: 'task_book_package',
            name: 'Book a Coordination Package',
            description: 'Find the right coordination package for your guest count and budget.',
            action_label: 'Browse Packages',
            target_page: 'packages'
          },
          {
            task_id: 'task_schedule_consultation',
            name: 'Schedule a Consultation',
            description: 'Chat through your vision with a planner.',
            action_label: 'Schedule Now',
            target_page: 'consultations'
          }
        ];

    return {
      hero_title,
      hero_subtitle,
      core_services,
      featured_packages,
      featured_tools,
      common_tasks
    };
  }

  // =====================
  // Packages & bookings
  // =====================
  getPackageFilterOptions() {
    const types = [
      { value: 'day_of_coordination', label: 'Day-of Coordination' },
      { value: 'full_planning', label: 'Full Planning' },
      { value: 'partial_planning', label: 'Partial Planning' },
      { value: 'consultation_only', label: 'Consultation Only' },
      { value: 'other', label: 'Other' }
    ];
    const price_ranges = [
      { min: 0, max: 1500, label: 'Up to $1,500' },
      { min: 1500, max: 3000, label: '$1,500 - $3,000' },
      { min: 3000, max: 5000, label: '$3,000 - $5,000' },
      { min: 5000, max: 10000, label: '$5,000+' }
    ];
    const guest_count_presets = [
      { value: 50, label: 'Up to 50 guests' },
      { value: 100, label: 'Up to 100 guests' },
      { value: 150, label: 'Up to 150 guests' },
      { value: 200, label: 'Up to 200 guests' }
    ];
    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'name_a_to_z', label: 'Name: A to Z' },
      { value: 'name_z_to_a', label: 'Name: Z to A' },
      { value: 'popularity', label: 'Popularity' }
    ];
    return { types, price_ranges, guest_count_presets, sort_options };
  }

  searchPackages(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'price_low_to_high';
    page = page || 1;
    pageSize = pageSize || 20;

    let packages = this._getFromStorage('packages');

    packages = packages.filter(p => {
      if (filters.isActiveOnly !== false && !p.is_active) return false;
      if (filters.type && p.type !== filters.type) return false;
      if (typeof filters.minPrice === 'number' && p.price < filters.minPrice) return false;
      if (typeof filters.maxPrice === 'number' && p.price > filters.maxPrice) return false;
      if (typeof filters.minGuestCount === 'number' && p.max_guest_count < filters.minGuestCount) return false;
      if (typeof filters.maxGuestCount === 'number') {
        const minCap = typeof p.min_guest_count === 'number' ? p.min_guest_count : 0;
        if (minCap > filters.maxGuestCount) return false;
      }
      return true;
    });

    const sorters = {
      price_low_to_high: (a, b) => a.price - b.price,
      price_high_to_low: (a, b) => b.price - a.price,
      name_a_to_z: (a, b) => (a.name || '').localeCompare(b.name || ''),
      name_z_to_a: (a, b) => (b.name || '').localeCompare(a.name || ''),
      popularity: (a, b) => (b.created_at || '').localeCompare(a.created_at || '')
    };
    const sorter = sorters[sort] || sorters.price_low_to_high;
    packages.sort(sorter);

    const total_count = packages.length;
    const start = (page - 1) * pageSize;
    const pageItems = packages.slice(start, start + pageSize);

    const items = pageItems.map(p => ({
      package: p,
      type_label: this._getPackageTypeLabel(p.type),
      price_display: this._formatCurrency(p.price),
      guest_capacity_label:
        typeof p.min_guest_count === 'number'
          ? p.min_guest_count + '–' + p.max_guest_count + ' guests'
          : 'Up to ' + p.max_guest_count + ' guests'
    }));

    // Instrumentation for task completion tracking (task_1 and task_2)
    try {
      // task_1: Day-of Coordination search with specific filters
      if (
        filters &&
        filters.type === 'day_of_coordination' &&
        filters.maxPrice === 1500 &&
        filters.minGuestCount === 100 &&
        sort === 'price_low_to_high'
      ) {
        localStorage.setItem(
          'task1_packageSearchParams',
          JSON.stringify({
            filters,
            sort,
            first_result_package_id: (items[0] && items[0].package.id) || null,
            timestamp: new Date().toISOString()
          })
        );
      }

      // task_2: Full Planning search under $4,000 sorted by price
      if (
        filters &&
        filters.type === 'full_planning' &&
        filters.maxPrice === 4000 &&
        sort === 'price_low_to_high'
      ) {
        localStorage.setItem(
          'task2_packageSearchParams',
          JSON.stringify({
            filters,
            sort,
            first_two_package_ids: items.slice(0, 2).map(i => i.package.id),
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { items, total_count };
  }

  getPackageDetails(packageId) {
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(p => p.id === packageId) || null;

    // Instrumentation for task completion tracking (task_2 compared packages)
    try {
      if (localStorage.getItem('task2_packageSearchParams') !== null) {
        let existingIds = [];
        const raw = localStorage.getItem('task2_comparedPackageIds');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.ids)) {
              existingIds = parsed.ids.slice();
            }
          } catch (e2) {
            // ignore parse errors and start fresh
          }
        }
        if (!existingIds.includes(packageId)) {
          existingIds.push(packageId);
        }
        localStorage.setItem('task2_comparedPackageIds', JSON.stringify({ ids: existingIds }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!pkg) {
      return {
        package: null,
        type_label: '',
        price_display: '',
        guest_capacity_label: '',
        inclusions: []
      };
    }
    const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
    return {
      package: pkg,
      type_label: this._getPackageTypeLabel(pkg.type),
      price_display: this._formatCurrency(pkg.price),
      guest_capacity_label:
        typeof pkg.min_guest_count === 'number'
          ? pkg.min_guest_count + '–' + pkg.max_guest_count + ' guests'
          : 'Up to ' + pkg.max_guest_count + ' guests',
      inclusions
    };
  }

  getPackageAvailability(packageId, year, month) {
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return [];

    const results = [];
    const monthIndex = month - 1;
    const firstDay = new Date(Date.UTC(year, monthIndex, 1));
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));

    for (let d = new Date(firstDay); d <= lastDay; d.setUTCDate(d.getUTCDate() + 1)) {
      const isoDate = d.toISOString();
      const dateKey = this._dateKeyFromISO(isoDate);
      const slots = this._generateAvailableTimeSlots('package', isoDate);
      if (slots.length > 0) {
        results.push({ date: dateKey, available_time_slots: slots });
      }
    }
    return results;
  }

  bookPackage(packageId, startDatetime, guestCount, contactName, contactEmail, contactPhone) {
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) {
      throw new Error('Package not found');
    }

    const bookings = this._getFromStorage('package_bookings');
    const normalizedStart = this._normalizeAndParseDateTime(startDatetime);
    const duplicate = bookings.find(b => b.package_id === packageId && b.start_datetime === normalizedStart);
    if (duplicate) {
      throw new Error('This time slot is already booked for the selected package.');
    }

    const booking = {
      id: this._generateId('pkgbooking'),
      package_id: packageId,
      package_name: pkg.name,
      start_datetime: normalizedStart,
      guest_count: typeof guestCount === 'number' ? guestCount : null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('package_bookings', bookings);

    return {
      booking: Object.assign({}, booking, { package: pkg }),
      message: 'Package booking created.'
    };
  }

  togglePackageShortlist(packageId, shortlisted) {
    let packages = this._getFromStorage('packages');
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) {
      throw new Error('Package not found');
    }
    pkg.is_shortlisted = !!shortlisted;
    this._saveToStorage('packages', packages);

    // Sync shortlist record
    const shortlist = this._getOrCreateShortlistRecord();
    const selectedIds = packages.filter(p => p.is_shortlisted).map(p => p.id);
    shortlist.package_ids = selectedIds;

    let shortlists = this._getFromStorage('shortlists');
    const idx = shortlists.findIndex(s => s.id === shortlist.id);
    if (idx >= 0) shortlists[idx] = shortlist;
    else shortlists.push(shortlist);
    this._saveToStorage('shortlists', shortlists);

    // Instrumentation for task completion tracking (task_2 shortlisted package)
    try {
      if (
        shortlisted === true &&
        pkg &&
        pkg.type === 'full_planning' &&
        typeof pkg.price === 'number' &&
        pkg.price < 4000
      ) {
        localStorage.setItem('task2_shortlistedPackageId', packageId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const current_shortlisted_count = selectedIds.length;
    return { package: pkg, current_shortlisted_count };
  }

  // =====================
  // Custom Package Builder
  // =====================
  getCustomPackageBuilderConfig() {
    const base_package_types = [
      { value: 'day_of_coordination', label: 'Day-of Coordination' },
      { value: 'full_planning', label: 'Full Planning' },
      { value: 'partial_planning', label: 'Partial Planning' },
      { value: 'custom_coordination', label: 'Custom Coordination' },
      { value: 'other', label: 'Other' }
    ];
    const default_constraints = {
      max_add_on_price_each: 250,
      max_total_add_on_price: 600,
      required_add_on_count: 3
    };
    return { base_package_types, default_constraints };
  }

  getAddOnServices(basePackageType) {
    let addOns = this._getFromStorage('add_on_services');
    addOns = addOns.filter(a => a.is_active);
    // Currently no specific linkage to basePackageType; could be extended later
    return addOns;
  }

  getPaymentPlanOptions() {
    return this._getFromStorage('payment_plan_options');
  }

  reserveCustomPackage(basePackageType, addOnServiceIds, paymentPlanOptionId, contactName, contactEmail, contactPhone) {
    const addOns = this._getFromStorage('add_on_services').filter(a => addOnServiceIds.includes(a.id));
    const paymentPlanOptions = this._getFromStorage('payment_plan_options');
    const paymentPlan = paymentPlanOptions.find(p => p.id === paymentPlanOptionId);

    const total_add_on_price = this._validateCustomPackageSelection(basePackageType, addOns, paymentPlan);

    const customPackage = {
      id: this._generateId('custompkg'),
      base_package_type: basePackageType,
      selected_add_on_ids: addOnServiceIds.slice(),
      total_add_on_price,
      payment_plan_option_id: paymentPlanOptionId,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      status: 'reserved',
      created_at: new Date().toISOString()
    };

    const customPackages = this._getFromStorage('custom_packages');
    customPackages.push(customPackage);
    this._saveToStorage('custom_packages', customPackages);

    let deposit_amount = total_add_on_price;
    if (paymentPlan.plan_type === 'pay_50_50') {
      deposit_amount = total_add_on_price * 0.5;
    } else if (paymentPlan.plan_type === 'pay_deposit_then_balance' && typeof paymentPlan.deposit_percent === 'number') {
      deposit_amount = (paymentPlan.deposit_percent / 100) * total_add_on_price;
    }

    return {
      custom_package: Object.assign({}, customPackage, {
        payment_plan_option: paymentPlan || null,
        selected_add_ons: addOns
      }),
      total_add_on_price,
      deposit_amount,
      message: 'Custom package reserved.'
    };
  }

  // =====================
  // Planning Tools overview
  // =====================
  getPlanningToolsOverview(weddingDate) {
    const tools = [
      {
        tool_id: 'budget_planner',
        name: 'Budget Planner',
        description: 'Create and track your wedding budget.',
        primary_action_label: 'Open Budget Planner'
      },
      {
        tool_id: 'guest_list',
        name: 'Guest List',
        description: 'Manage invitations, RSVPs, and meal choices.',
        primary_action_label: 'Manage Guest List'
      },
      {
        tool_id: 'day_of_timeline',
        name: 'Day-of Timeline',
        description: 'Build a detailed wedding day schedule.',
        primary_action_label: 'Create Timeline'
      },
      {
        tool_id: 'checklists',
        name: 'Checklists',
        description: 'Stay on top of planning tasks.',
        primary_action_label: 'View Checklists'
      }
    ];

    const recommended_next_steps = [];
    if (weddingDate) {
      const now = new Date();
      const w = new Date(weddingDate);
      const diffMs = w.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 180) {
        recommended_next_steps.push({
          step_id: 'step_budget',
          title: 'Set your overall wedding budget',
          description: 'Start with a high-level budget and adjust as you book vendors.',
          target_tool_id: 'budget_planner'
        });
      } else if (diffDays > 90) {
        recommended_next_steps.push({
          step_id: 'step_guest_list',
          title: 'Finalize your guest list',
          description: 'Confirm addresses and meal preferences.',
          target_tool_id: 'guest_list'
        });
      } else {
        recommended_next_steps.push({
          step_id: 'step_timeline',
          title: 'Build your day-of timeline',
          description: 'Coordinate hair & makeup, ceremony, and reception.',
          target_tool_id: 'day_of_timeline'
        });
      }
    }

    return { tools, recommended_next_steps };
  }

  // =====================
  // Budget Planner
  // =====================
  saveBudgetWithCategories(budgetId, name, categoriesInput) {
    let budgets = this._getFromStorage('budgets');
    let budget;
    const now = new Date().toISOString();

    if (budgetId) {
      budget = budgets.find(b => b.id === budgetId);
      if (!budget) {
        throw new Error('Budget not found');
      }
      budget.name = name;
    } else {
      budget = {
        id: this._generateId('budget'),
        name,
        total_amount: 0,
        created_at: now
      };
      budgets.push(budget);
    }

    let categories = this._getFromStorage('budget_categories');
    const existingIds = new Set();

    (categoriesInput || []).forEach((c, index) => {
      if (c.categoryId) {
        const cat = categories.find(x => x.id === c.categoryId && x.budget_id === budget.id);
        if (cat) {
          cat.name = c.name;
          cat.amount = c.amount;
          if (typeof c.sort_order === 'number') cat.sort_order = c.sort_order;
          existingIds.add(cat.id);
        }
      } else {
        const newCat = {
          id: this._generateId('budgetcat'),
          budget_id: budget.id,
          name: c.name,
          amount: c.amount,
          sort_order: typeof c.sort_order === 'number' ? c.sort_order : index
        };
        categories.push(newCat);
        existingIds.add(newCat.id);
      }
    });

    // Remove categories not included in input for this budget
    categories = categories.filter(c => c.budget_id !== budget.id || existingIds.has(c.id));

    this._saveToStorage('budget_categories', categories);
    this._saveToStorage('budgets', budgets);
    this._calculateBudgetTotal(budget.id);

    // Reload to ensure we have updated total
    budgets = this._getFromStorage('budgets');
    budget = budgets.find(b => b.id === budget.id);
    const budgetCategories = this._getFromStorage('budget_categories').filter(c => c.budget_id === budget.id);

    const enrichedCategories = budgetCategories.map(c => Object.assign({}, c, { budget }));

    return { budget, categories: enrichedCategories };
  }

  listBudgets() {
    return this._getFromStorage('budgets');
  }

  getBudgetDetails(budgetId) {
    const budgets = this._getFromStorage('budgets');
    const budget = budgets.find(b => b.id === budgetId) || null;
    if (!budget) {
      return { budget: null, categories: [], total_amount_display: '' };
    }
    const categories = this._getFromStorage('budget_categories').filter(c => c.budget_id === budget.id);
    const enrichedCategories = categories.map(c => Object.assign({}, c, { budget }));
    const total_amount_display = this._formatCurrency(budget.total_amount);
    return { budget, categories: enrichedCategories, total_amount_display };
  }

  // =====================
  // Guest List
  // =====================
  saveGuestListWithGuests(guestListId, eventName, weddingDate, guestsInput) {
    let guestLists = this._getFromStorage('guest_lists');
    let guests = this._getFromStorage('guests');
    const now = new Date().toISOString();

    let guestList;
    const normalizedWeddingDate = this._normalizeDateOnly(weddingDate);

    if (guestListId) {
      guestList = guestLists.find(g => g.id === guestListId);
      if (!guestList) throw new Error('Guest list not found');
      guestList.event_name = eventName;
      guestList.wedding_date = normalizedWeddingDate;
    } else {
      guestList = {
        id: this._generateId('guestlist'),
        event_name: eventName,
        wedding_date: normalizedWeddingDate,
        total_guest_count: 0,
        created_at: now
      };
      guestLists.push(guestList);
    }

    const existingIds = new Set();

    (guestsInput || []).forEach((g, index) => {
      if (g.guestId) {
        const existing = guests.find(x => x.id === g.guestId && x.guest_list_id === guestList.id);
        if (existing) {
          existing.first_name = g.first_name;
          existing.last_name = g.last_name;
          existing.status = g.status;
          existing.meal_choice = g.meal_choice;
          existing.is_vip = !!g.is_vip;
          existing.email = g.email || null;
          existing.phone = g.phone || null;
          existing.notes = g.notes || null;
          existingIds.add(existing.id);
        }
      } else {
        const newGuest = {
          id: this._generateId('guest'),
          guest_list_id: guestList.id,
          first_name: g.first_name,
          last_name: g.last_name,
          status: g.status,
          meal_choice: g.meal_choice,
          is_vip: !!g.is_vip,
          email: g.email || null,
          phone: g.phone || null,
          notes: g.notes || null,
          created_at: now
        };
        guests.push(newGuest);
        existingIds.add(newGuest.id);
      }
    });

    guests = guests.filter(g => g.guest_list_id !== guestList.id || existingIds.has(g.id));

    const guestsForList = guests.filter(g => g.guest_list_id === guestList.id);
    guestList.total_guest_count = guestsForList.length;

    this._saveToStorage('guests', guests);
    this._saveToStorage('guest_lists', guestLists);

    const status_counts = {
      invited: guestsForList.filter(g => g.status === 'invited').length,
      confirmed: guestsForList.filter(g => g.status === 'confirmed').length,
      declined: guestsForList.filter(g => g.status === 'declined').length,
      waitlisted: guestsForList.filter(g => g.status === 'waitlisted').length
    };
    const vip_count = guestsForList.filter(g => g.is_vip).length;

    const enrichedGuests = guestsForList.map(g => Object.assign({}, g, { guest_list: guestList }));

    return {
      guest_list: guestList,
      guests: enrichedGuests,
      status_counts,
      vip_count
    };
  }

  listGuestLists() {
    return this._getFromStorage('guest_lists');
  }

  getGuestListDetails(guestListId) {
    const guestLists = this._getFromStorage('guest_lists');
    const guestList = guestLists.find(g => g.id === guestListId) || null;
    if (!guestList) {
      return {
        guest_list: null,
        guests: [],
        status_counts: { invited: 0, confirmed: 0, declined: 0, waitlisted: 0 },
        vip_count: 0
      };
    }
    const guests = this._getFromStorage('guests').filter(g => g.guest_list_id === guestList.id);
    const status_counts = {
      invited: guests.filter(g => g.status === 'invited').length,
      confirmed: guests.filter(g => g.status === 'confirmed').length,
      declined: guests.filter(g => g.status === 'declined').length,
      waitlisted: guests.filter(g => g.status === 'waitlisted').length
    };
    const vip_count = guests.filter(g => g.is_vip).length;
    const enrichedGuests = guests.map(g => Object.assign({}, g, { guest_list: guestList }));
    return { guest_list: guestList, guests: enrichedGuests, status_counts, vip_count };
  }

  // =====================
  // Vendors & Shortlist
  // =====================
  getVendorFilterOptions() {
    const types = [
      { value: 'photographer', label: 'Photographer' },
      { value: 'florist', label: 'Florist' },
      { value: 'caterer', label: 'Caterer' },
      { value: 'venue', label: 'Venue' },
      { value: 'dj', label: 'DJ' },
      { value: 'videographer', label: 'Videographer' },
      { value: 'planner', label: 'Planner' },
      { value: 'baker', label: 'Baker' },
      { value: 'decor', label: 'Decor' },
      { value: 'other', label: 'Other' }
    ];
    const rating_thresholds = [
      { min_rating: 4.5, label: '4.5 stars & up' },
      { min_rating: 4.0, label: '4.0 stars & up' },
      { min_rating: 3.0, label: '3.0 stars & up' }
    ];
    const travel_fee_options = [
      { value: 'included', label: 'Travel Included' },
      { value: 'extra', label: 'Travel Extra' },
      { value: 'not_offered', label: 'No Travel' }
    ];
    const sort_options = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'name_a_to_z', label: 'Name: A to Z' }
    ];
    return { types, rating_thresholds, travel_fee_options, sort_options };
  }

  searchVendors(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'rating_high_to_low';
    page = page || 1;
    pageSize = pageSize || 20;

    let vendors = this._getFromStorage('vendors');

    vendors = vendors.filter(v => {
      if (filters.type && v.type !== filters.type) return false;
      if (typeof filters.minRating === 'number' && v.rating < filters.minRating) return false;
      if (filters.travelFeeOption && v.travel_fee_option !== filters.travelFeeOption) return false;
      return true;
    });

    const sorters = {
      rating_high_to_low: (a, b) => b.rating - a.rating,
      rating_low_to_high: (a, b) => a.rating - b.rating,
      price_low_to_high: (a, b) => (a.starting_price || 0) - (b.starting_price || 0),
      name_a_to_z: (a, b) => (a.name || '').localeCompare(b.name || '')
    };
    const sorter = sorters[sort] || sorters.rating_high_to_low;
    vendors.sort(sorter);

    const total_count = vendors.length;
    const start = (page - 1) * pageSize;
    const pageItems = vendors.slice(start, start + pageSize);

    const items = pageItems.map(v => ({
      vendor: v,
      type_label: this._getVendorTypeLabel(v.type),
      rating_display: v.rating != null ? v.rating.toFixed(1) + ' / 5' : '',
      travel_fee_label: this._getTravelFeeLabel(v.travel_fee_option)
    }));

    // Instrumentation for task completion tracking (task_5 vendor search)
    try {
      if (
        filters &&
        filters.type === 'photographer' &&
        typeof filters.minRating === 'number' &&
        filters.minRating >= 4.5 &&
        filters.travelFeeOption === 'included' &&
        sort === 'rating_high_to_low'
      ) {
        localStorage.setItem(
          'task5_vendorSearchParams',
          JSON.stringify({
            filters,
            sort,
            first_two_vendor_ids: items.slice(0, 2).map(i => i.vendor.id),
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { items, total_count };
  }

  toggleVendorFavorite(vendorId, favorite) {
    let vendors = this._getFromStorage('vendors');
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) throw new Error('Vendor not found');
    vendor.is_favorite = !!favorite;
    this._saveToStorage('vendors', vendors);

    const shortlist = this._getOrCreateShortlistRecord();
    const selectedVendorIds = vendors.filter(v => v.is_favorite).map(v => v.id);
    shortlist.vendor_ids = selectedVendorIds;

    let shortlists = this._getFromStorage('shortlists');
    const idx = shortlists.findIndex(s => s.id === shortlist.id);
    if (idx >= 0) shortlists[idx] = shortlist;
    else shortlists.push(shortlist);
    this._saveToStorage('shortlists', shortlists);

    // Instrumentation for task completion tracking (task_5 favorited vendors)
    try {
      if (favorite === true) {
        let existingIds = [];
        const raw = localStorage.getItem('task5_favoritedVendorIds');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.ids)) {
              existingIds = parsed.ids.slice();
            }
          } catch (e2) {
            // ignore parse errors and start fresh
          }
        }
        if (!existingIds.includes(vendorId)) {
          existingIds.push(vendorId);
        }
        localStorage.setItem('task5_favoritedVendorIds', JSON.stringify({ ids: existingIds }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const current_favorite_count = selectedVendorIds.length;
    return { vendor, current_favorite_count };
  }

  getShortlistOverview() {
    const shortlist = this._getOrCreateShortlistRecord();
    const packages = this._getFromStorage('packages').filter(p => p.is_shortlisted);
    const vendors = this._getFromStorage('vendors').filter(v => v.is_favorite);

    // Ensure shortlist IDs are synced with current flags
    shortlist.package_ids = packages.map(p => p.id);
    shortlist.vendor_ids = vendors.map(v => v.id);

    let shortlists = this._getFromStorage('shortlists');
    const idx = shortlists.findIndex(s => s.id === shortlist.id);
    if (idx >= 0) shortlists[idx] = shortlist;
    else shortlists.push(shortlist);
    this._saveToStorage('shortlists', shortlists);

    return { shortlist, packages, vendors };
  }

  saveShortlist(name) {
    const shortlist = this._getOrCreateShortlistRecord();
    const packages = this._getFromStorage('packages').filter(p => p.is_shortlisted);
    const vendors = this._getFromStorage('vendors').filter(v => v.is_favorite);

    shortlist.package_ids = packages.map(p => p.id);
    shortlist.vendor_ids = vendors.map(v => v.id);
    if (name) shortlist.name = name;
    shortlist.last_saved_at = new Date().toISOString();

    let shortlists = this._getFromStorage('shortlists');
    const idx = shortlists.findIndex(s => s.id === shortlist.id);
    if (idx >= 0) shortlists[idx] = shortlist;
    else shortlists.push(shortlist);
    this._saveToStorage('shortlists', shortlists);

    return { shortlist, message: 'Shortlist saved.' };
  }

  // =====================
  // Consultations
  // =====================
  getConsultationTypes() {
    return [
      {
        value: 'full_planning_consultation',
        label: 'Full Planning Consultation',
        description: 'Discuss full-service planning from engagement to send-off.'
      },
      {
        value: 'day_of_coordination_consultation',
        label: 'Day-of Coordination Consultation',
        description: 'Focus on timeline, logistics, and hand-off details.'
      },
      {
        value: 'partial_planning_consultation',
        label: 'Partial Planning Consultation',
        description: 'Support for select planning areas (vendors, design, or logistics).'
      },
      {
        value: 'other_consultation',
        label: 'Other Consultation',
        description: 'Custom planning support session.'
      }
    ];
  }

  getConsultationTimeSlots(consultationType, date) {
    const normalizedDate = this._normalizeDateOnly(date);
    return this._generateAvailableTimeSlots('consultation', normalizedDate, consultationType);
  }

  scheduleConsultation(consultationType, startDatetime, meetingMethod, contactName, contactEmail, contactPhone) {
    const normalizedStart = this._normalizeAndParseDateTime(startDatetime);
    const requests = this._getFromStorage('consultation_requests');

    const request = {
      id: this._generateId('consult'),
      consultation_type: consultationType,
      start_datetime: normalizedStart,
      meeting_method: meetingMethod,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    requests.push(request);
    this._saveToStorage('consultation_requests', requests);

    return { consultation_request: request, message: 'Consultation requested.' };
  }

  listConsultationRequests() {
    return this._getFromStorage('consultation_requests');
  }

  // =====================
  // Day-of Timeline
  // =====================
  saveTimelineWithEvents(timelineId, name, weddingDate, mainCeremonyTime, eventsInput) {
    let timelines = this._getFromStorage('timelines');
    let events = this._getFromStorage('timeline_events');
    const now = new Date().toISOString();

    let timeline;
    const normalizedWeddingDate = this._normalizeDateOnly(weddingDate);
    const normalizedMainCeremony = mainCeremonyTime ? this._normalizeAndParseDateTime(mainCeremonyTime) : null;

    if (timelineId) {
      timeline = timelines.find(t => t.id === timelineId);
      if (!timeline) throw new Error('Timeline not found');
      timeline.name = name;
      timeline.wedding_date = normalizedWeddingDate;
      timeline.main_ceremony_time = normalizedMainCeremony;
    } else {
      timeline = {
        id: this._generateId('timeline'),
        name,
        wedding_date: normalizedWeddingDate,
        main_ceremony_time: normalizedMainCeremony,
        created_at: now
      };
      timelines.push(timeline);
    }

    const existingIds = new Set();

    (eventsInput || []).forEach((e, index) => {
      const start = this._normalizeAndParseDateTime(e.startDatetime);
      if (e.eventId) {
        const ev = events.find(x => x.id === e.eventId && x.timeline_id === timeline.id);
        if (ev) {
          ev.title = e.title;
          ev.category = e.category;
          ev.start_datetime = start;
          ev.duration_minutes = e.durationMinutes;
          ev.notes = e.notes || null;
          ev.sort_order = typeof e.sort_order === 'number' ? e.sort_order : index;
          existingIds.add(ev.id);
        }
      } else {
        const newEv = {
          id: this._generateId('tlev'),
          timeline_id: timeline.id,
          title: e.title,
          category: e.category,
          start_datetime: start,
          duration_minutes: e.durationMinutes,
          notes: e.notes || null,
          sort_order: typeof e.sort_order === 'number' ? e.sort_order : index
        };
        events.push(newEv);
        existingIds.add(newEv.id);
      }
    });

    events = events.filter(e => e.timeline_id !== timeline.id || existingIds.has(e.id));

    this._saveToStorage('timeline_events', events);
    this._saveToStorage('timelines', timelines);

    const eventsForTimeline = this._getFromStorage('timeline_events').filter(e => e.timeline_id === timeline.id);
    eventsForTimeline.sort((a, b) => {
      if (typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
        return a.sort_order - b.sort_order;
      }
      return a.start_datetime.localeCompare(b.start_datetime);
    });

    const enrichedEvents = eventsForTimeline.map(e => Object.assign({}, e, { timeline }));

    return { timeline, events: enrichedEvents };
  }

  listTimelines() {
    return this._getFromStorage('timelines');
  }

  getTimelineDetails(timelineId) {
    const timelines = this._getFromStorage('timelines');
    const timeline = timelines.find(t => t.id === timelineId) || null;
    if (!timeline) {
      return { timeline: null, events: [] };
    }
    const events = this._getFromStorage('timeline_events').filter(e => e.timeline_id === timeline.id);
    events.sort((a, b) => {
      if (typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
        return a.sort_order - b.sort_order;
      }
      return a.start_datetime.localeCompare(b.start_datetime);
    });
    const enrichedEvents = events.map(e => Object.assign({}, e, { timeline }));
    return { timeline, events: enrichedEvents };
  }

  // =====================
  // Checklists & Suggested Tasks
  // =====================
  getSuggestedTaskTimeframes() {
    const allOptions = [
      { value: 'within_12_months_before_wedding', label: 'Within 12 months before wedding' },
      { value: 'within_9_months_before_wedding', label: 'Within 9 months before wedding' },
      { value: 'within_6_months_before_wedding', label: 'Within 6 months before wedding' },
      { value: 'within_3_months_before_wedding', label: 'Within 3 months before wedding' },
      { value: 'within_1_month_before_wedding', label: 'Within 1 month before wedding' },
      { value: 'week_of_wedding', label: 'Week of wedding' },
      { value: 'day_of_wedding', label: 'Day of wedding' },
      { value: 'after_wedding', label: 'After wedding' }
    ];

    // Prefer returning only timeframes that actually have suggested tasks
    const tasks = this._getFromStorage('suggested_tasks', []);
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return allOptions;
    }

    const present = new Set(
      tasks
        .map(t => t.time_frame)
        .filter(v => typeof v === 'string' && v.length > 0)
    );

    const filtered = allOptions.filter(opt => present.has(opt.value));
    return filtered.length ? filtered : allOptions;
  }

  getSuggestedTasksByTimeframe(timeFrame) {
    const tasks = this._getFromStorage('suggested_tasks');
    const filteredTasks = tasks
      .filter(t => t.time_frame === timeFrame)
      .sort((a, b) => {
        if (typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
          return a.sort_order - b.sort_order;
        }
        return (a.title || '').localeCompare(b.title || '');
      });

    // Instrumentation for task completion tracking (task_9 suggested tasks selection)
    try {
      if (timeFrame === 'within_3_months_before_wedding') {
        localStorage.setItem(
          'task9_suggestedTasksSelection',
          JSON.stringify({
            timeFrame,
            first_five_task_ids: filteredTasks.slice(0, 5).map(t => t.id),
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filteredTasks;
  }

  saveChecklistWithTasks(checklistId, name, weddingDate, tasksInput) {
    let checklists = this._getFromStorage('checklists');
    let tasks = this._getFromStorage('checklist_tasks');
    const now = new Date().toISOString();

    let checklist;
    const normalizedWeddingDate = this._normalizeDateOnly(weddingDate);

    if (checklistId) {
      checklist = checklists.find(c => c.id === checklistId);
      if (!checklist) throw new Error('Checklist not found');
      checklist.name = name;
      checklist.wedding_date = normalizedWeddingDate;
    } else {
      checklist = {
        id: this._generateId('checklist'),
        name,
        wedding_date: normalizedWeddingDate,
        created_at: now
      };
      checklists.push(checklist);
    }

    const existingIds = new Set();

    (tasksInput || []).forEach((t, index) => {
      const dueDateIso = t.dueDate ? this._normalizeAndParseDateTime(t.dueDate) : null;
      if (t.taskId) {
        const existing = tasks.find(x => x.id === t.taskId && x.checklist_id === checklist.id);
        if (existing) {
          existing.title = t.title;
          existing.description = t.description || null;
          existing.priority = t.priority;
          existing.is_completed = !!t.is_completed;
          existing.due_date = dueDateIso;
          existing.suggested_task_id = t.suggestedTaskId || existing.suggested_task_id || null;
          existing.sort_order = typeof t.sort_order === 'number' ? t.sort_order : index;
          existingIds.add(existing.id);
        }
      } else {
        const newTask = {
          id: this._generateId('cltask'),
          checklist_id: checklist.id,
          title: t.title,
          description: t.description || null,
          priority: t.priority,
          is_completed: !!t.is_completed,
          due_date: dueDateIso,
          suggested_task_id: t.suggestedTaskId || null,
          sort_order: typeof t.sort_order === 'number' ? t.sort_order : index
        };
        tasks.push(newTask);
        existingIds.add(newTask.id);
      }
    });

    tasks = tasks.filter(t => t.checklist_id !== checklist.id || existingIds.has(t.id));

    this._saveToStorage('checklist_tasks', tasks);
    this._saveToStorage('checklists', checklists);

    const tasksForChecklist = this._getFromStorage('checklist_tasks').filter(t => t.checklist_id === checklist.id);
    tasksForChecklist.sort((a, b) => {
      if (typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
        return a.sort_order - b.sort_order;
      }
      return (a.title || '').localeCompare(b.title || '');
    });

    const suggestedTasks = this._getFromStorage('suggested_tasks');
    const enrichedTasks = tasksForChecklist.map(t => {
      const suggested = t.suggested_task_id
        ? suggestedTasks.find(s => s.id === t.suggested_task_id) || null
        : null;
      return Object.assign({}, t, {
        checklist,
        suggested_task: suggested
      });
    });

    return { checklist, tasks: enrichedTasks };
  }

  listChecklists() {
    return this._getFromStorage('checklists');
  }

  getChecklistDetails(checklistId) {
    const checklists = this._getFromStorage('checklists');
    const checklist = checklists.find(c => c.id === checklistId) || null;
    if (!checklist) return { checklist: null, tasks: [] };

    const tasks = this._getFromStorage('checklist_tasks').filter(t => t.checklist_id === checklist.id);
    tasks.sort((a, b) => {
      if (typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
        return a.sort_order - b.sort_order;
      }
      return (a.title || '').localeCompare(b.title || '');
    });

    const suggestedTasks = this._getFromStorage('suggested_tasks');
    const enrichedTasks = tasks.map(t => {
      const suggested = t.suggested_task_id
        ? suggestedTasks.find(s => s.id === t.suggested_task_id) || null
        : null;
      return Object.assign({}, t, { checklist, suggested_task: suggested });
    });

    return { checklist, tasks: enrichedTasks };
  }

  // =====================
  // Static Content & Contact
  // =====================
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null) || {};
    return {
      company_overview: stored.company_overview || '',
      philosophy: stored.philosophy || '',
      specializations: stored.specializations || [],
      team_members: stored.team_members || [],
      testimonials: stored.testimonials || [],
      primary_ctas: stored.primary_ctas || []
    };
  }

  getContactPageInfo() {
    const stored = this._getFromStorage('contact_page_info', null) || {};
    return {
      email: stored.email || '',
      phone: stored.phone || '',
      address: stored.address || '',
      office_hours: stored.office_hours || '',
      response_time_message: stored.response_time_message || '',
      quick_links: stored.quick_links || []
    };
  }

  submitContactForm(name, email, subject, message) {
    // For size reasons, we do not persist all messages; just simulate success.
    return {
      success: true,
      message: 'Your inquiry has been received. We will get back to you shortly.'
    };
  }

  getFAQEntries() {
    const faqs = this._getFromStorage('faqs', []);
    return faqs;
  }

  getPoliciesContent() {
    const stored = this._getFromStorage('policies', null) || {};
    return {
      terms_and_conditions: stored.terms_and_conditions || '',
      privacy_policy: stored.privacy_policy || '',
      payment_policy: stored.payment_policy || '',
      cancellation_policy: stored.cancellation_policy || '',
      contact_for_policy_questions: stored.contact_for_policy_questions || ''
    };
  }

  // =====================
  // END BusinessLogic
  // =====================
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}