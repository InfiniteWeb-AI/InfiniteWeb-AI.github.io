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
  // Storage helpers
  // -----------------------

  _initStorage() {
    const tableKeys = [
      'charities',
      'pram_race_categories',
      'pram_race_teams',
      'pram_race_team_payments',
      'fundraising_leaderboard_entries',
      'team_donations',
      'product_categories',
      'products',
      'product_variants',
      'basket',
      'basket_items',
      'delivery_options',
      'volunteer_shifts',
      'volunteer_registrations',
      'viewing_points',
      'viewing_plans',
      'viewing_plan_items',
      'costume_contest_entries',
      'race_options',
      'race_individual_registrations',
      'faq_items',
      'contact_enquiries',
      'general_donations',
      'donation_allocations',
      'route_polyline'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Pointers to current single-user entities
    if (!localStorage.getItem('currentBasketId')) {
      localStorage.setItem('currentBasketId', '');
    }
    if (!localStorage.getItem('currentViewingPlanId')) {
      localStorage.setItem('currentViewingPlanId', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _slugify(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  _parseDateToISO(dateString) {
    if (!dateString) return null;
    // Accept dd/MM/yyyy or ISO-like
    const trimmed = String(dateString).trim();
    const ddMmYy = /^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/;
    const match = trimmed.match(ddMmYy);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toISOString();
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
    return null;
  }

  _humanizeEnum(value) {
    if (!value) return '';
    return String(value)
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _humanizeSize(value) {
    const map = {
      adult_s: 'Adult S',
      adult_m: 'Adult M',
      adult_l: 'Adult L',
      adult_xl: 'Adult XL',
      child_s: 'Child S',
      child_m: 'Child M',
      child_l: 'Child L'
    };
    return map[value] || this._humanizeEnum(value);
  }

  _humanizeColor(value) {
    const map = {
      purple: 'Purple',
      red: 'Red',
      blue: 'Blue',
      green: 'Green',
      white: 'White',
      black: 'Black'
    };
    return map[value] || this._humanizeEnum(value);
  }

  // -----------------------
  // Basket helpers
  // -----------------------

  _getOrCreateBasket() {
    let baskets = this._getFromStorage('basket');
    let currentId = localStorage.getItem('currentBasketId') || '';
    let basket = null;

    if (currentId) {
      basket = baskets.find(b => b.id === currentId) || null;
    }

    if (!basket) {
      // Use first existing basket if any
      if (baskets.length > 0) {
        basket = baskets[0];
        localStorage.setItem('currentBasketId', basket.id);
      } else {
        basket = {
          id: this._generateId('basket'),
          delivery_option_id: null,
          created_at: this._nowIso(),
          updated_at: this._nowIso(),
          total_items: 0,
          subtotal: 0,
          delivery_fee: 0,
          total: 0,
          checkout_started: false
        };
        baskets.push(basket);
        this._saveToStorage('basket', baskets);
        localStorage.setItem('currentBasketId', basket.id);
      }
    }

    return basket;
  }

  _recalculateBasketTotals(basketId) {
    const baskets = this._getFromStorage('basket');
    const items = this._getFromStorage('basket_items');
    const deliveryOptions = this._getFromStorage('delivery_options');

    const basket = baskets.find(b => b.id === basketId);
    if (!basket) return null;

    const basketItems = items.filter(i => i.basket_id === basket.id);

    let subtotal = 0;
    let totalItems = 0;
    for (const item of basketItems) {
      subtotal += Number(item.line_total) || 0;
      totalItems += Number(item.quantity) || 0;
    }

    let deliveryFee = 0;
    if (basket.delivery_option_id) {
      const opt = deliveryOptions.find(o => o.id === basket.delivery_option_id);
      if (opt) {
        deliveryFee = Number(opt.price) || 0;
      }
    }

    basket.subtotal = subtotal;
    basket.total_items = totalItems;
    basket.delivery_fee = deliveryFee;
    basket.total = subtotal + deliveryFee;
    basket.updated_at = this._nowIso();

    this._saveToStorage('basket', baskets);

    return {
      basket,
      total_items: totalItems,
      subtotal,
      total: basket.total
    };
  }

  // -----------------------
  // Viewing plan helpers
  // -----------------------

  _getOrCreateViewingPlan() {
    let plans = this._getFromStorage('viewing_plans');
    let currentId = localStorage.getItem('currentViewingPlanId') || '';
    let plan = null;

    if (currentId) {
      plan = plans.find(p => p.id === currentId) || null;
    }

    if (!plan) {
      if (plans.length > 0) {
        plan = plans[0];
        localStorage.setItem('currentViewingPlanId', plan.id);
      } else {
        plan = {
          id: this._generateId('viewplan'),
          name: '',
          created_at: this._nowIso(),
          updated_at: this._nowIso()
        };
        plans.push(plan);
        this._saveToStorage('viewing_plans', plans);
        localStorage.setItem('currentViewingPlanId', plan.id);
      }
    }

    return plan;
  }

  // -----------------------
  // Donation helpers
  // -----------------------

  _calculateProcessingFees(totalAmount, processingFeePercent, coverProcessingFees) {
    const amount = Number(totalAmount) || 0;
    const percent = Number(processingFeePercent) || 0;
    if (!coverProcessingFees || percent <= 0 || amount <= 0) {
      return {
        fee: 0,
        total_with_fees: amount
      };
    }
    const fee = +(amount * (percent / 100)).toFixed(2);
    return {
      fee,
      total_with_fees: +(amount + fee).toFixed(2)
    };
  }

  // -----------------------
  // Race registration helpers
  // -----------------------

  _updateRegistrationStep(registration) {
    const stepsSequence = ['personal_details', 'emergency_contact', 'payment', 'confirmation'];
    const currentIndex = stepsSequence.indexOf(registration.current_step);
    let nextStep = registration.current_step;
    if (currentIndex !== -1 && currentIndex < stepsSequence.length - 1) {
      nextStep = stepsSequence[currentIndex + 1];
      registration.current_step = nextStep;
    }
    return {
      current_step: registration.current_step,
      next_step: stepsSequence[stepsSequence.indexOf(registration.current_step) + 1] || null
    };
  }

  // -----------------------
  // Volunteer helpers
  // -----------------------

  _updateVolunteerShiftSpots(shiftId) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const regs = this._getFromStorage('volunteer_registrations');

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return null;

    const count = regs.filter(r => r.shift_id === shiftId).length;
    shift.spots_filled = count;

    if (typeof shift.capacity === 'number' && shift.capacity > 0) {
      if (count >= shift.capacity) {
        shift.status = 'full';
      } else if (shift.status === 'full') {
        shift.status = 'open';
      }
    }

    this._saveToStorage('volunteer_shifts', shifts);
    return shift;
  }

  // -----------------------
  // Foreign key resolution helpers (for getters)
  // -----------------------

  _getTeamById(teamId) {
    const teams = this._getFromStorage('pram_race_teams');
    const categories = this._getFromStorage('pram_race_categories');
    const charities = this._getFromStorage('charities');

    const team = teams.find(t => t.id === teamId);
    if (!team) return null;

    const category = categories.find(c => c.id === team.category_id) || null;
    const charity = charities.find(ch => ch.id === team.charity_id) || null;

    return Object.assign({}, team, {
      category,
      charity
    });
  }

  _getCharityById(charityId) {
    const charities = this._getFromStorage('charities');
    return charities.find(c => c.id === charityId) || null;
  }

  _getRaceOptionById(raceOptionId) {
    const raceOptions = this._getFromStorage('race_options');
    return raceOptions.find(r => r.id === raceOptionId) || null;
  }

  _getDeliveryOptionById(deliveryOptionId) {
    const options = this._getFromStorage('delivery_options');
    return options.find(o => o.id === deliveryOptionId) || null;
  }

  _getViewingPointById(viewingPointId) {
    const points = this._getFromStorage('viewing_points');
    return points.find(v => v.id === viewingPointId) || null;
  }

  // =====================================================
  // Interface implementations
  // =====================================================

  // -----------------------
  // Event / homepage
  // -----------------------

  getEventOverview() {
    const raw = localStorage.getItem('event_overview');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        // Ensure main_charities resolved
        const charities = this._getFromStorage('charities');
        const mainCharities = Array.isArray(data.main_charities)
          ? data.main_charities.map(mc => {
              const ch = charities.find(c => c.id === mc.charity_id) || null;
              return Object.assign({}, mc, { charity: ch });
            })
          : [];
        return Object.assign({}, data, { main_charities: mainCharities });
      } catch (e) {}
    }

    return {
      event_name: '',
      event_tagline: '',
      event_date: '',
      event_location: '',
      hero_message_html: '',
      main_charities: []
    };
  }

  getFundraisingHighlights() {
    const leaderboardEntries = this._getFromStorage('fundraising_leaderboard_entries');
    const teams = this._getFromStorage('pram_race_teams');
    const charities = this._getFromStorage('charities');
    const categories = this._getFromStorage('pram_race_categories');

    let overallTotal = 0;
    for (const e of leaderboardEntries) {
      overallTotal += Number(e.total_raised) || 0;
    }

    // Optional target stored in localStorage
    let overallTarget = 0;
    const targetRaw = localStorage.getItem('fundraising_target_amount');
    if (targetRaw) {
      const n = Number(targetRaw);
      if (!isNaN(n)) overallTarget = n;
    }

    const progressPercent = overallTarget > 0 ? +(overallTotal / overallTarget * 100).toFixed(2) : 0;

    const sortedEntries = leaderboardEntries.slice().sort((a, b) => a.rank - b.rank);
    const topEntries = sortedEntries.slice(0, 3);

    const featuredTeams = topEntries.map(e => {
      const team = teams.find(t => t.id === e.team_id) || null;
      const charity = team ? charities.find(c => c.id === team.charity_id) || null : null;
      const category = team ? categories.find(c => c.id === team.category_id) || null : null;
      return {
        team_id: e.team_id,
        team_name: team ? team.name : '',
        charity_name: charity ? charity.name : '',
        category_display_label: category ? category.display_label : '',
        total_raised: e.total_raised,
        rank: e.rank,
        team_image_url: team && team.image_url ? team.image_url : '',
        team: team ? Object.assign({}, team, { charity, category }) : null,
        charity
      };
    });

    const lastUpdated = leaderboardEntries.reduce((latest, e) => {
      if (!e.updated_at) return latest;
      if (!latest) return e.updated_at;
      return e.updated_at > latest ? e.updated_at : latest;
    }, null);

    return {
      overall_total_raised: overallTotal,
      overall_target_amount: overallTarget,
      progress_percent: progressPercent,
      last_updated_at: lastUpdated || '',
      featured_teams: featuredTeams
    };
  }

  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      history_html: '',
      purpose_html: '',
      organisers_html: '',
      impact_overview_html: ''
    };
  }

  getPartnerCharities() {
    const charities = this._getFromStorage('charities');
    return charities.map(ch => ({
      charity_id: ch.id,
      name: ch.name || '',
      short_name: ch.short_name || '',
      description: ch.description || '',
      website_url: ch.website_url || '',
      logo_url: ch.logo_url || '',
      is_primary_event_charity: !!ch.is_primary_event_charity,
      charity: ch
    }));
  }

  getImpactStats() {
    const generalDonations = this._getFromStorage('general_donations');
    const teamDonations = this._getFromStorage('team_donations');
    const donationAllocations = this._getFromStorage('donation_allocations');

    let lifetimeAmount = 0;
    let lastYearAmount = 0;
    const now = new Date();
    const oneYearAgo = new Date(now.getTime());
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const donationDates = [];

    const addDonation = (amount, createdAt, paymentStatus) => {
      const amt = Number(amount) || 0;
      if (!createdAt || paymentStatus === 'failed') return;
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return;
      donationDates.push(d);
      lifetimeAmount += amt;
      if (d >= oneYearAgo) {
        lastYearAmount += amt;
      }
    };

    for (const gd of generalDonations) {
      if (gd.payment_status === 'completed') {
        addDonation(gd.total_amount, gd.created_at, gd.payment_status);
      }
    }
    for (const td of teamDonations) {
      if (td.payment_status === 'completed') {
        addDonation(td.amount, td.created_at, td.payment_status);
      }
    }

    let totalYearsRunning = 0;
    if (donationDates.length > 0) {
      const earliest = donationDates.reduce((min, d) => (d < min ? d : min), donationDates[0]);
      totalYearsRunning = now.getFullYear() - earliest.getFullYear() + 1;
    }

    const charityIds = new Set();
    for (const alloc of donationAllocations) {
      if (alloc.charity_id) charityIds.add(alloc.charity_id);
    }

    const beneficiariesCount = charityIds.size;

    const impactRaw = localStorage.getItem('impact_overview_html');

    return {
      total_years_running: totalYearsRunning,
      lifetime_amount_raised: lifetimeAmount,
      last_year_amount_raised: lastYearAmount,
      beneficiaries_count: beneficiariesCount,
      impact_overview_html: impactRaw || ''
    };
  }

  // -----------------------
  // Pram race team registration
  // -----------------------

  getPramRaceCategories() {
    const categories = this._getFromStorage('pram_race_categories');
    const teams = this._getFromStorage('pram_race_teams');

    return categories.map(cat => {
      const teamsInCat = teams.filter(t => t.category_id === cat.id);
      const teamsRegistered = teamsInCat.length;
      const maxTeams = typeof cat.max_teams === 'number' ? cat.max_teams : null;
      const isFull = maxTeams !== null ? teamsRegistered >= maxTeams : false;
      return {
        category_id: cat.id,
        name: cat.name || '',
        display_label: cat.display_label || '',
        description: cat.description || '',
        start_time: cat.start_time || '',
        distance_km: typeof cat.distance_km === 'number' ? cat.distance_km : null,
        is_family_friendly: !!cat.is_family_friendly,
        max_teams: maxTeams,
        teams_registered: teamsRegistered,
        is_full: isFull,
        category: cat
      };
    });
  }

  getTeamRegistrationFormOptions() {
    const charities = this._getFromStorage('charities');
    const configRaw = localStorage.getItem('team_registration_config');
    let config = {};
    if (configRaw) {
      try {
        config = JSON.parse(configRaw);
      } catch (e) {}
    }

    const maxParticipants = typeof config.max_participants_per_team === 'number'
      ? config.max_participants_per_team
      : 10;
    const termsHtml = config.terms_and_conditions_html || '';
    const requiresContactDetails = typeof config.requires_contact_details === 'boolean'
      ? config.requires_contact_details
      : true;

    return {
      charities: charities.map(ch => ({
        charity_id: ch.id,
        name: ch.name || '',
        short_name: ch.short_name || '',
        is_primary_event_charity: !!ch.is_primary_event_charity,
        charity: ch
      })),
      max_participants_per_team: maxParticipants,
      terms_and_conditions_html: termsHtml,
      requires_contact_details: requiresContactDetails
    };
  }

  createPramRaceTeamDraft(
    categoryId,
    charityId,
    teamName,
    numberOfParticipants,
    contactName,
    contactEmail,
    contactPhone,
    termsAccepted
  ) {
    const categories = this._getFromStorage('pram_race_categories');
    const charities = this._getFromStorage('charities');
    const teams = this._getFromStorage('pram_race_teams');

    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      return {
        success: false,
        team_id: null,
        registration_status: null,
        message: 'Invalid categoryId'
      };
    }

    const charity = charities.find(c => c.id === charityId);
    if (!charity) {
      return {
        success: false,
        team_id: null,
        registration_status: null,
        message: 'Invalid charityId'
      };
    }

    if (!teamName || !termsAccepted) {
      return {
        success: false,
        team_id: null,
        registration_status: null,
        message: 'Team name and terms acceptance are required'
      };
    }

    const numParticipants = Number(numberOfParticipants) || 0;
    if (numParticipants <= 0) {
      return {
        success: false,
        team_id: null,
        registration_status: null,
        message: 'Number of participants must be greater than zero'
      };
    }

    const teamId = this._generateId('prteam');
    const now = this._nowIso();

    const team = {
      id: teamId,
      category_id: categoryId,
      charity_id: charityId,
      name: teamName,
      number_of_participants: numParticipants,
      contact_name: contactName || '',
      contact_email: contactEmail || '',
      contact_phone: contactPhone || '',
      registration_status: 'pending_payment',
      payment_method: null,
      terms_accepted: !!termsAccepted,
      created_at: now,
      updated_at: now,
      total_amount_raised: 0
    };

    teams.push(team);
    this._saveToStorage('pram_race_teams', teams);

    return {
      success: true,
      team_id: teamId,
      registration_status: team.registration_status,
      message: 'Team draft created successfully'
    };
  }

  getPramRaceTeamPaymentOptions(teamId) {
    const teams = this._getFromStorage('pram_race_teams');
    const categories = this._getFromStorage('pram_race_categories');
    const payments = this._getFromStorage('pram_race_team_payments');

    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return {
        team_id: null,
        team_name: '',
        category_display_label: '',
        amount_due: 0,
        currency: 'GBP',
        available_payment_methods: []
      };
    }

    const category = categories.find(c => c.id === team.category_id) || null;

    let payment = payments.find(p => p.team_id === teamId);
    if (!payment) {
      payment = {
        id: this._generateId('prteampay'),
        team_id: teamId,
        amount_due: 0,
        amount_paid: 0,
        payment_method: 'pay_cash_on_event_day',
        payment_status: 'pending',
        created_at: this._nowIso(),
        paid_at: null,
        notes: ''
      };
      payments.push(payment);
      this._saveToStorage('pram_race_team_payments', payments);
    }

    const availablePaymentMethods = [
      {
        code: 'pay_cash_on_event_day',
        label: 'Pay in cash on event day',
        description: 'Pay your team entry fee in cash when you check in at the registration desk.',
        is_recommended: true
      },
      {
        code: 'pay_online_card',
        label: 'Pay online by card',
        description: 'Secure card payment processed online.',
        is_recommended: false
      },
      {
        code: 'pay_bank_transfer',
        label: 'Pay by bank transfer',
        description: 'Transfer your entry fee via online banking before race day.',
        is_recommended: false
      }
    ];

    return {
      team_id: team.id,
      team_name: team.name,
      category_display_label: category ? category.display_label : '',
      amount_due: payment.amount_due,
      currency: 'GBP',
      available_payment_methods: availablePaymentMethods,
      team: this._getTeamById(team.id)
    };
  }

  confirmPramRaceTeamRegistration(teamId, paymentMethod) {
    const validMethods = ['pay_cash_on_event_day', 'pay_online_card', 'pay_bank_transfer'];
    if (!validMethods.includes(paymentMethod)) {
      return {
        success: false,
        team_id: null,
        registration_status: null,
        payment_status: null,
        confirmation_message: 'Invalid payment method'
      };
    }

    const teams = this._getFromStorage('pram_race_teams');
    const payments = this._getFromStorage('pram_race_team_payments');

    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return {
        success: false,
        team_id: null,
        registration_status: null,
        payment_status: null,
        confirmation_message: 'Team not found'
      };
    }

    let payment = payments.find(p => p.team_id === teamId);
    if (!payment) {
      payment = {
        id: this._generateId('prteampay'),
        team_id: teamId,
        amount_due: 0,
        amount_paid: 0,
        payment_method: paymentMethod,
        payment_status: 'pending',
        created_at: this._nowIso(),
        paid_at: null,
        notes: ''
      };
      payments.push(payment);
    }

    payment.payment_method = paymentMethod;
    if (paymentMethod === 'pay_online_card') {
      payment.payment_status = 'pending';
      team.registration_status = 'pending_payment';
    } else {
      payment.payment_status = 'pending';
      team.registration_status = 'confirmed';
    }
    team.payment_method = paymentMethod;
    team.updated_at = this._nowIso();

    this._saveToStorage('pram_race_team_payments', payments);
    this._saveToStorage('pram_race_teams', teams);

    return {
      success: true,
      team_id: team.id,
      registration_status: team.registration_status,
      payment_status: payment.payment_status,
      confirmation_message: 'Team registration confirmed with selected payment method'
    };
  }

  // -----------------------
  // Sponsorship / leaderboard
  // -----------------------

  getSponsorshipInfo() {
    const raw = localStorage.getItem('sponsorship_info');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      how_it_works_html: '',
      impact_html: '',
      gift_aid_info_html: ''
    };
  }

  getFundraisingLeaderboard(limit) {
    const entries = this._getFromStorage('fundraising_leaderboard_entries');
    const teams = this._getFromStorage('pram_race_teams');
    const charities = this._getFromStorage('charities');

    const sorted = entries.slice().sort((a, b) => a.rank - b.rank);
    const sliced = typeof limit === 'number' && limit > 0 ? sorted.slice(0, limit) : sorted;

    return sliced.map(e => {
      const team = teams.find(t => t.id === e.team_id) || null;
      const charity = team ? charities.find(c => c.id === team.charity_id) || null : null;
      return {
        team_id: e.team_id,
        team_name: team ? team.name : '',
        charity_name: charity ? charity.name : '',
        total_raised: e.total_raised,
        rank: e.rank,
        last_donation_at: e.last_donation_at || '',
        team: team ? this._getTeamById(team.id) : null
      };
    });
  }

  getTeamFundraisingDetails(teamId) {
    const teams = this._getFromStorage('pram_race_teams');
    const categories = this._getFromStorage('pram_race_categories');
    const charities = this._getFromStorage('charities');
    const leaderboardEntries = this._getFromStorage('fundraising_leaderboard_entries');
    const teamDonations = this._getFromStorage('team_donations');

    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return {
        team_id: null,
        team_name: '',
        category_display_label: '',
        charity_name: '',
        charity_logo_url: '',
        total_raised: 0,
        fundraising_goal: 0,
        rank: null,
        recent_donations: [],
        team: null
      };
    }

    const category = categories.find(c => c.id === team.category_id) || null;
    const charity = charities.find(c => c.id === team.charity_id) || null;

    const leaderboardEntry = leaderboardEntries.find(e => e.team_id === teamId) || null;

    let totalRaised = leaderboardEntry ? leaderboardEntry.total_raised : 0;
    if (!leaderboardEntry) {
      totalRaised = teamDonations
        .filter(d => d.team_id === teamId && d.payment_status === 'completed')
        .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    }

    let fundraisingGoal = 0;
    const goalRaw = localStorage.getItem('team_goal_' + teamId);
    if (goalRaw) {
      const n = Number(goalRaw);
      if (!isNaN(n)) fundraisingGoal = n;
    }

    const recent = teamDonations
      .filter(d => d.team_id === teamId)
      .sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return a.created_at > b.created_at ? -1 : 1;
      })
      .slice(0, 5)
      .map(d => {
        let displayName = d.donor_name || '';
        if (d.display_name_option === 'show_first_name_only') {
          displayName = d.donor_name ? String(d.donor_name).split(' ')[0] : '';
        } else if (d.display_name_option === 'show_as_anonymous') {
          displayName = 'Anonymous';
        }
        return {
          donor_display_name: displayName,
          amount: d.amount,
          created_at: d.created_at || '',
          message: d.message || ''
        };
      });

    return {
      team_id: team.id,
      team_name: team.name,
      category_display_label: category ? category.display_label : '',
      charity_name: charity ? charity.name : '',
      charity_logo_url: charity ? charity.logo_url || '' : '',
      total_raised: totalRaised,
      fundraising_goal: fundraisingGoal,
      rank: leaderboardEntry ? leaderboardEntry.rank : null,
      recent_donations: recent,
      team: this._getTeamById(team.id)
    };
  }

  getTeamDonationFormOptions(teamId) {
    // teamId currently unused but kept for signature consistency
    return {
      currency: 'GBP',
      min_amount: 1,
      suggested_amounts: [5, 10, 20, 50],
      frequency_options: [
        { value: 'one_off', label: 'One-off donation' },
        { value: 'monthly', label: 'Monthly donation' }
      ],
      display_name_options: [
        { value: 'show_full_name', label: 'Show my full name' },
        { value: 'show_first_name_only', label: 'Show first name only' },
        { value: 'show_as_anonymous', label: 'Show as Anonymous' }
      ]
    };
  }

  createTeamDonation(teamId, amount, frequency, displayNameOption, donorName, donorEmail, message) {
    const teams = this._getFromStorage('pram_race_teams');
    const teamDonations = this._getFromStorage('team_donations');
    const leaderboardEntries = this._getFromStorage('fundraising_leaderboard_entries');

    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return {
        success: false,
        donation_id: null,
        payment_status: null,
        team_id: null,
        team_new_total_raised: 0,
        confirmation_message: 'Team not found'
      };
    }

    const amt = Number(amount) || 0;
    if (amt <= 0) {
      return {
        success: false,
        donation_id: null,
        payment_status: null,
        team_id: teamId,
        team_new_total_raised: team.total_amount_raised || 0,
        confirmation_message: 'Donation amount must be greater than zero'
      };
    }

    if (!donorName || !donorEmail) {
      return {
        success: false,
        donation_id: null,
        payment_status: null,
        team_id: teamId,
        team_new_total_raised: team.total_amount_raised || 0,
        confirmation_message: 'Donor name and email are required'
      };
    }

    if (!['one_off', 'monthly'].includes(frequency)) {
      return {
        success: false,
        donation_id: null,
        payment_status: null,
        team_id: teamId,
        team_new_total_raised: team.total_amount_raised || 0,
        confirmation_message: 'Invalid frequency'
      };
    }

    if (!['show_full_name', 'show_first_name_only', 'show_as_anonymous'].includes(displayNameOption)) {
      return {
        success: false,
        donation_id: null,
        payment_status: null,
        team_id: teamId,
        team_new_total_raised: team.total_amount_raised || 0,
        confirmation_message: 'Invalid display name option'
      };
    }

    const donationId = this._generateId('teamdon');
    const now = this._nowIso();

    const donation = {
      id: donationId,
      team_id: teamId,
      amount: amt,
      frequency,
      display_name_option: displayNameOption,
      donor_name: donorName,
      donor_email: donorEmail,
      message: message || '',
      payment_status: 'completed',
      created_at: now
    };

    teamDonations.push(donation);

    // Update team's total_amount_raised
    const previousTotal = Number(team.total_amount_raised) || 0;
    const newTotal = previousTotal + amt;
    team.total_amount_raised = newTotal;
    team.updated_at = now;

    // Instrumentation for task completion tracking (task_2)
    try {
      if (amt === 25 && frequency === 'one_off' && displayNameOption === 'show_as_anonymous') {
        const existingEntry = leaderboardEntries.find(e => e.team_id === teamId);
        localStorage.setItem(
          'task2_donationContext',
          JSON.stringify({ donationId, teamId, preDonationRank: existingEntry ? existingEntry.rank : null, amount: amt, frequency, displayNameOption })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    // Update leaderboard entry
    let entry = leaderboardEntries.find(e => e.team_id === teamId);
    if (!entry) {
      entry = {
        id: this._generateId('ldr'),
        team_id: teamId,
        total_raised: newTotal,
        rank: leaderboardEntries.length + 1,
        last_donation_at: now,
        updated_at: now
      };
      leaderboardEntries.push(entry);
    } else {
      entry.total_raised = newTotal;
      entry.last_donation_at = now;
      entry.updated_at = now;
    }

    // Recalculate ranks by total_raised desc
    leaderboardEntries.sort((a, b) => {
      if (b.total_raised === a.total_raised) {
        return (a.updated_at || '').localeCompare(b.updated_at || '');
      }
      return b.total_raised - a.total_raised;
    });
    leaderboardEntries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    this._saveToStorage('team_donations', teamDonations);
    this._saveToStorage('pram_race_teams', teams);
    this._saveToStorage('fundraising_leaderboard_entries', leaderboardEntries);

    return {
      success: true,
      donation_id: donationId,
      payment_status: donation.payment_status,
      team_id: teamId,
      team_new_total_raised: newTotal,
      confirmation_message: 'Thank you for your donation!'
    };
  }

  // -----------------------
  // Shop / merchandise
  // -----------------------

  getProductCategoriesForShop() {
    const categories = this._getFromStorage('product_categories');
    return categories
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(cat => ({
        category_id: cat.id,
        key: cat.key,
        name: cat.name || '',
        description: cat.description || '',
        category: cat
      }));
  }

  getProductFilterOptions(categoryKey) {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    let productIds = products.map(p => p.id);

    if (categoryKey && categoryKey !== 'all') {
      const category = categories.find(c => c.key === categoryKey);
      if (category) {
        productIds = products.filter(p => p.category_id === category.id).map(p => p.id);
      } else {
        productIds = [];
      }
    }

    const relevantVariants = variants.filter(v => productIds.includes(v.product_id));

    const colorSet = new Set();
    const sizeSet = new Set();
    let priceMin = null;
    let priceMax = null;

    for (const v of relevantVariants) {
      if (v.color) colorSet.add(v.color);
      if (v.size) sizeSet.add(v.size);
      const price = Number(v.price) || 0;
      if (priceMin === null || price < priceMin) priceMin = price;
      if (priceMax === null || price > priceMax) priceMax = price;
    }

    const colors = Array.from(colorSet).map(c => ({ value: c, label: this._humanizeColor(c) }));
    const sizes = Array.from(sizeSet).map(s => ({ value: s, label: this._humanizeSize(s) }));

    return {
      colors,
      sizes,
      price_min: priceMin !== null ? priceMin : 0,
      price_max: priceMax !== null ? priceMax : 0
    };
  }

  listProducts(categoryKey, filters) {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    let filteredProducts = products.slice();

    if (categoryKey && categoryKey !== 'all') {
      const category = categories.find(c => c.key === categoryKey);
      if (category) {
        filteredProducts = filteredProducts.filter(p => p.category_id === category.id);
      } else {
        filteredProducts = [];
      }
    }

    const colorFilter = filters && filters.color ? filters.color : null;
    const sizeFilter = filters && filters.size ? filters.size : null;
    const minPriceFilter = filters && typeof filters.minPrice === 'number' ? filters.minPrice : null;
    const maxPriceFilter = filters && typeof filters.maxPrice === 'number' ? filters.maxPrice : null;
    const childrenFilter = filters && typeof filters.isChildrenProduct === 'boolean' ? filters.isChildrenProduct : null;

    if (childrenFilter !== null) {
      filteredProducts = filteredProducts.filter(p => !!p.is_children_product === childrenFilter);
    }

    const result = [];

    for (const product of filteredProducts) {
      const productVariants = variants.filter(v => v.product_id === product.id);

      let candidateVariants = productVariants.slice();

      if (colorFilter) {
        candidateVariants = candidateVariants.filter(v => v.color === colorFilter);
      }
      if (sizeFilter) {
        candidateVariants = candidateVariants.filter(v => v.size === sizeFilter);
      }

      if (candidateVariants.length === 0 && (colorFilter || sizeFilter)) {
        continue;
      }

      let basePriceFrom = null;
      const colorsSet = new Set();
      const sizesSet = new Set();

      for (const v of productVariants) {
        const price = Number(v.price) || 0;
        if (basePriceFrom === null || price < basePriceFrom) basePriceFrom = price;
        if (v.color) colorsSet.add(v.color);
        if (v.size) sizesSet.add(v.size);
      }

      if (basePriceFrom === null) basePriceFrom = 0;

      if (minPriceFilter !== null && basePriceFrom < minPriceFilter) {
        continue;
      }
      if (maxPriceFilter !== null && basePriceFrom > maxPriceFilter) {
        continue;
      }

      result.push({
        product_id: product.id,
        name: product.name || '',
        short_description: product.description || '',
        image_url: product.image_url || '',
        base_price_from: basePriceFrom,
        is_children_product: !!product.is_children_product,
        is_featured: !!product.is_featured,
        available_colors: Array.from(colorsSet),
        available_sizes: Array.from(sizesSet)
      });
    }

    return result;
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const variants = this._getFromStorage('product_variants');

    const product = products.find(p => p.id === productId);
    if (!product) {
      return {
        product_id: null,
        name: '',
        description: '',
        image_url: '',
        base_price: 0,
        category_name: '',
        variants: []
      };
    }

    const category = categories.find(c => c.id === product.category_id) || null;
    const productVariants = variants
      .filter(v => v.product_id === product.id)
      .map(v => ({
        variant_id: v.id,
        size: v.size || '',
        color: v.color || '',
        sku: v.sku || '',
        price: v.price,
        stock_quantity: typeof v.stock_quantity === 'number' ? v.stock_quantity : null,
        image_url: v.image_url || ''
      }));

    return {
      product_id: product.id,
      name: product.name || '',
      description: product.description || '',
      image_url: product.image_url || '',
      base_price: product.base_price || 0,
      category_name: category ? category.name : '',
      variants: productVariants
    };
  }

  addProductVariantToBasket(productVariantId, quantity) {
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      return {
        success: false,
        basket_id: null,
        total_items: 0,
        subtotal: 0,
        message: 'Quantity must be greater than zero'
      };
    }

    const variants = this._getFromStorage('product_variants');
    const variant = variants.find(v => v.id === productVariantId);
    if (!variant) {
      return {
        success: false,
        basket_id: null,
        total_items: 0,
        subtotal: 0,
        message: 'Product variant not found'
      };
    }

    const basket = this._getOrCreateBasket();
    const baskets = this._getFromStorage('basket');
    let items = this._getFromStorage('basket_items');

    let item = items.find(i => i.basket_id === basket.id && i.product_variant_id === productVariantId);

    const unitPrice = Number(variant.price) || 0;

    if (item) {
      item.quantity += qty;
      item.line_total = item.quantity * unitPrice;
    } else {
      item = {
        id: this._generateId('bitem'),
        basket_id: basket.id,
        product_variant_id: productVariantId,
        quantity: qty,
        unit_price: unitPrice,
        line_total: unitPrice * qty
      };
      items.push(item);
    }

    this._saveToStorage('basket_items', items);
    this._saveToStorage('basket', baskets);

    const totals = this._recalculateBasketTotals(basket.id);

    return {
      success: true,
      basket_id: basket.id,
      total_items: totals ? totals.total_items : 0,
      subtotal: totals ? totals.subtotal : 0,
      message: 'Item added to basket'
    };
  }

  getBasketSummary() {
    const basket = this._getOrCreateBasket();
    const totals = this._recalculateBasketTotals(basket.id);
    return {
      basket_id: basket.id,
      total_items: totals ? totals.total_items : 0,
      subtotal: totals ? totals.subtotal : 0
    };
  }

  getBasket() {
    const basket = this._getOrCreateBasket();
    const baskets = this._getFromStorage('basket');
    const items = this._getFromStorage('basket_items');
    const variants = this._getFromStorage('product_variants');
    const products = this._getFromStorage('products');
    const deliveryOptions = this._getFromStorage('delivery_options');

    const basketItems = items.filter(i => i.basket_id === basket.id);

    const itemDtos = basketItems.map(i => {
      const variant = variants.find(v => v.id === i.product_variant_id) || null;
      const product = variant ? products.find(p => p.id === variant.product_id) || null : null;
      return {
        basket_item_id: i.id,
        product_name: product ? product.name : '',
        variant_size: variant ? variant.size || '' : '',
        variant_color: variant ? variant.color || '' : '',
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total,
        image_url: (variant && variant.image_url) || (product && product.image_url) || ''
      };
    });

    const selectedOption = basket.delivery_option_id
      ? deliveryOptions.find(o => o.id === basket.delivery_option_id) || null
      : null;

    const availableOptions = deliveryOptions.map(o => ({
      delivery_option_id: o.id,
      code: o.code,
      name: o.name,
      description: o.description || '',
      type: o.type,
      price: o.price,
      is_default: !!o.is_default,
      delivery_option: o
    }));

    const totals = this._recalculateBasketTotals(basket.id);

    return {
      basket_id: basket.id,
      items: itemDtos,
      subtotal: totals ? totals.subtotal : basket.subtotal || 0,
      delivery_fee: totals ? totals.basket.delivery_fee : basket.delivery_fee || 0,
      total: totals ? totals.total : basket.total || 0,
      selected_delivery_option: selectedOption
        ? {
            delivery_option_id: selectedOption.id,
            code: selectedOption.code,
            name: selectedOption.name,
            description: selectedOption.description || '',
            price: selectedOption.price,
            delivery_option: selectedOption
          }
        : null,
      available_delivery_options: availableOptions
    };
  }

  updateBasketItemQuantity(basketItemId, quantity) {
    const qty = Number(quantity) || 0;
    const items = this._getFromStorage('basket_items');
    const itemIndex = items.findIndex(i => i.id === basketItemId);

    if (itemIndex === -1) {
      return {
        success: false,
        basket_id: null,
        total_items: 0,
        subtotal: 0,
        total: 0
      };
    }

    const item = items[itemIndex];

    if (qty <= 0) {
      items.splice(itemIndex, 1);
      this._saveToStorage('basket_items', items);
      const totalsAfter = this._recalculateBasketTotals(item.basket_id);
      return {
        success: true,
        basket_id: item.basket_id,
        total_items: totalsAfter ? totalsAfter.total_items : 0,
        subtotal: totalsAfter ? totalsAfter.subtotal : 0,
        total: totalsAfter ? totalsAfter.total : 0
      };
    }

    const variants = this._getFromStorage('product_variants');
    const variant = variants.find(v => v.id === item.product_variant_id) || null;
    const unitPrice = variant ? Number(variant.price) || 0 : item.unit_price || 0;

    item.quantity = qty;
    item.unit_price = unitPrice;
    item.line_total = unitPrice * qty;

    this._saveToStorage('basket_items', items);

    const totals = this._recalculateBasketTotals(item.basket_id);

    return {
      success: true,
      basket_id: item.basket_id,
      total_items: totals ? totals.total_items : 0,
      subtotal: totals ? totals.subtotal : 0,
      total: totals ? totals.total : 0
    };
  }

  removeBasketItem(basketItemId) {
    const items = this._getFromStorage('basket_items');
    const index = items.findIndex(i => i.id === basketItemId);

    if (index === -1) {
      return {
        success: false,
        basket_id: null,
        total_items: 0,
        subtotal: 0,
        total: 0
      };
    }

    const basketId = items[index].basket_id;
    items.splice(index, 1);
    this._saveToStorage('basket_items', items);

    const totals = this._recalculateBasketTotals(basketId);

    return {
      success: true,
      basket_id: basketId,
      total_items: totals ? totals.total_items : 0,
      subtotal: totals ? totals.subtotal : 0,
      total: totals ? totals.total : 0
    };
  }

  setBasketDeliveryOption(deliveryOptionId) {
    const baskets = this._getFromStorage('basket');
    const deliveryOptions = this._getFromStorage('delivery_options');
    const basket = this._getOrCreateBasket();

    const option = deliveryOptions.find(o => o.id === deliveryOptionId);
    if (!option) {
      return {
        success: false,
        basket_id: basket.id,
        delivery_option: null,
        delivery_fee: basket.delivery_fee || 0,
        total: basket.total || 0
      };
    }

    const idx = baskets.findIndex(b => b.id === basket.id);
    if (idx !== -1) {
      baskets[idx].delivery_option_id = deliveryOptionId;
      baskets[idx].updated_at = this._nowIso();
      this._saveToStorage('basket', baskets);
    }

    const totals = this._recalculateBasketTotals(basket.id);
    const updatedBasket = totals ? totals.basket : basket;

    return {
      success: true,
      basket_id: updatedBasket.id,
      delivery_option: {
        delivery_option_id: option.id,
        code: option.code,
        name: option.name,
        price: option.price
      },
      delivery_fee: updatedBasket.delivery_fee || 0,
      total: updatedBasket.total || 0
    };
  }

  proceedToCheckout() {
    const baskets = this._getFromStorage('basket');
    const basket = this._getOrCreateBasket();
    const idx = baskets.findIndex(b => b.id === basket.id);
    let checkoutStatus = 'started';

    if (idx !== -1) {
      if (baskets[idx].checkout_started) {
        checkoutStatus = 'already_started';
      } else {
        baskets[idx].checkout_started = true;
        baskets[idx].updated_at = this._nowIso();
        this._saveToStorage('basket', baskets);
      }
    }

    return {
      success: true,
      basket_id: basket.id,
      checkout_status: checkoutStatus,
      next_step: 'customer_details',
      message: checkoutStatus === 'already_started'
        ? 'Checkout already started for this basket'
        : 'Checkout started'
    };
  }

  // -----------------------
  // Volunteer
  // -----------------------

  getVolunteerOverview() {
    const raw = localStorage.getItem('volunteer_overview');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      intro_html: '',
      benefits_html: '',
      expectations_html: '',
      logistics_html: ''
    };
  }

  getVolunteerFilterOptions() {
    const shifts = this._getFromStorage('volunteer_shifts');

    const datesMap = new Map();
    const roleTypesMap = new Map();

    for (const s of shifts) {
      if (s.date) {
        const dateIso = new Date(s.date).toISOString().slice(0, 10);
        if (!datesMap.has(dateIso)) {
          datesMap.set(dateIso, {
            value: dateIso,
            label: dateIso
          });
        }
      }
      if (s.role_type && !roleTypesMap.has(s.role_type)) {
        roleTypesMap.set(s.role_type, {
          value: s.role_type,
          label: this._humanizeEnum(s.role_type)
        });
      }
    }

    return {
      dates: Array.from(datesMap.values()),
      role_types: Array.from(roleTypesMap.values())
    };
  }

  listVolunteerShifts(date, roleType) {
    const shifts = this._getFromStorage('volunteer_shifts');

    return shifts
      .filter(s => {
        if (date) {
          const d = new Date(s.date);
          const isoDate = isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
          if (isoDate !== date) return false;
        }
        if (roleType && s.role_type !== roleType) return false;
        return true;
      })
      .map(s => ({
        shift_id: s.id,
        title: s.title || '',
        description: s.description || '',
        role_type: s.role_type,
        date: s.date ? new Date(s.date).toISOString().slice(0, 10) : '',
        start_time: s.start_time || '',
        end_time: s.end_time || '',
        location: s.location || '',
        capacity: typeof s.capacity === 'number' ? s.capacity : null,
        spots_filled: typeof s.spots_filled === 'number' ? s.spots_filled : 0,
        status: s.status,
        is_race_day_shift: !!s.is_race_day_shift
      }));
  }

  getVolunteerShiftDetails(shiftId) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const s = shifts.find(shift => shift.id === shiftId);
    if (!s) {
      return {
        shift_id: null,
        title: '',
        description: '',
        role_type: '',
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        capacity: null,
        spots_filled: 0,
        status: '',
        is_race_day_shift: false
      };
    }

    return {
      shift_id: s.id,
      title: s.title || '',
      description: s.description || '',
      role_type: s.role_type,
      date: s.date ? new Date(s.date).toISOString().slice(0, 10) : '',
      start_time: s.start_time || '',
      end_time: s.end_time || '',
      location: s.location || '',
      capacity: typeof s.capacity === 'number' ? s.capacity : null,
      spots_filled: typeof s.spots_filled === 'number' ? s.spots_filled : 0,
      status: s.status,
      is_race_day_shift: !!s.is_race_day_shift
    };
  }

  registerVolunteerForShift(shiftId, name, email, phone, tshirtSize, isOver18, notes) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const registrations = this._getFromStorage('volunteer_registrations');

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) {
      return {
        success: false,
        volunteer_registration_id: null,
        confirmation_message: 'Shift not found'
      };
    }

    if (!name || !email || !phone) {
      return {
        success: false,
        volunteer_registration_id: null,
        confirmation_message: 'Name, email and phone are required'
      };
    }

    if (!['xs', 's', 'm', 'l', 'xl', 'xxl'].includes(tshirtSize)) {
      return {
        success: false,
        volunteer_registration_id: null,
        confirmation_message: 'Invalid T-shirt size'
      };
    }

    if (!isOver18) {
      return {
        success: false,
        volunteer_registration_id: null,
        confirmation_message: 'Volunteers must be over 18 for this registration path'
      };
    }

    const registrationId = this._generateId('volreg');
    const reg = {
      id: registrationId,
      shift_id: shiftId,
      name,
      email,
      phone,
      tshirt_size: tshirtSize,
      is_over_18: !!isOver18,
      created_at: this._nowIso(),
      notes: notes || ''
    };

    registrations.push(reg);
    this._saveToStorage('volunteer_registrations', registrations);

    // Increment spots_filled for the shift while respecting existing value and capacity
    const shiftIndex = shifts.findIndex(s => s.id === shiftId);
    if (shiftIndex !== -1) {
      const shiftToUpdate = shifts[shiftIndex];
      const prevFilled = typeof shiftToUpdate.spots_filled === 'number' ? shiftToUpdate.spots_filled : 0;
      shiftToUpdate.spots_filled = prevFilled + 1;
      if (typeof shiftToUpdate.capacity === 'number' && shiftToUpdate.capacity > 0 && shiftToUpdate.spots_filled >= shiftToUpdate.capacity) {
        shiftToUpdate.status = 'full';
      }
      this._saveToStorage('volunteer_shifts', shifts);
    }

    return {
      success: true,
      volunteer_registration_id: registrationId,
      confirmation_message: 'Volunteer registration submitted successfully'
    };
  }

  // -----------------------
  // Race day info & route map / viewing plan
  // -----------------------

  getRaceDayInfo() {
    const raw = localStorage.getItem('race_day_info');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      race_day_date: '',
      schedule_html: '',
      venue_html: '',
      transport_html: '',
      accessibility_html: '',
      spectator_guidelines_html: ''
    };
  }

  getRouteMapData() {
    const routePolyline = this._getFromStorage('route_polyline');
    const viewingPoints = this._getFromStorage('viewing_points');

    const vpDtos = viewingPoints.map(v => ({
      viewing_point_id: v.id,
      name: v.name || '',
      type: v.type,
      kilometer_marker: typeof v.kilometer_marker === 'number' ? v.kilometer_marker : null,
      latitude: typeof v.latitude === 'number' ? v.latitude : null,
      longitude: typeof v.longitude === 'number' ? v.longitude : null,
      description: v.description || '',
      approximate_time: v.approximate_time || '',
      is_accessible: !!v.is_accessible
    }));

    return {
      route_polyline: routePolyline,
      viewing_points: vpDtos
    };
  }

  addViewingPointToCurrentPlan(viewingPointId) {
    const viewingPoint = this._getViewingPointById(viewingPointId);
    if (!viewingPoint) {
      return {
        success: false,
        viewing_plan_id: null,
        viewing_plan_item_id: null,
        total_points_in_plan: 0,
        message: 'Viewing point not found'
      };
    }

    const plan = this._getOrCreateViewingPlan();
    const plans = this._getFromStorage('viewing_plans');
    const items = this._getFromStorage('viewing_plan_items');

    const existingItems = items.filter(i => i.viewing_plan_id === plan.id);
    const order = existingItems.length + 1;

    const itemId = this._generateId('vpitem');
    const item = {
      id: itemId,
      viewing_plan_id: plan.id,
      viewing_point_id: viewingPointId,
      order,
      notes: ''
    };

    items.push(item);
    this._saveToStorage('viewing_plan_items', items);

    const planIndex = plans.findIndex(p => p.id === plan.id);
    if (planIndex !== -1) {
      plans[planIndex].updated_at = this._nowIso();
      this._saveToStorage('viewing_plans', plans);
    }

    const totalPoints = existingItems.length + 1;

    return {
      success: true,
      viewing_plan_id: plan.id,
      viewing_plan_item_id: itemId,
      total_points_in_plan: totalPoints,
      message: 'Viewing point added to plan'
    };
  }

  getCurrentViewingPlanSummary() {
    const plan = this._getOrCreateViewingPlan();
    const items = this._getFromStorage('viewing_plan_items');
    const viewingPoints = this._getFromStorage('viewing_points');

    const planItems = items
      .filter(i => i.viewing_plan_id === plan.id)
      .sort((a, b) => a.order - b.order)
      .map(i => {
        const vp = viewingPoints.find(v => v.id === i.viewing_point_id) || null;
        return {
          viewing_plan_item_id: i.id,
          viewing_point_id: i.viewing_point_id,
          viewing_point_name: vp ? vp.name : '',
          type: vp ? vp.type : '',
          kilometer_marker: vp && typeof vp.kilometer_marker === 'number' ? vp.kilometer_marker : null,
          approximate_time: vp ? vp.approximate_time || '' : '',
          order: i.order,
          viewing_point: vp
        };
      });

    return {
      viewing_plan_id: plan.id,
      name: plan.name || '',
      total_points: planItems.length,
      items: planItems
    };
  }

  getViewingPlanDetails() {
    const plan = this._getOrCreateViewingPlan();
    const items = this._getFromStorage('viewing_plan_items');
    const viewingPoints = this._getFromStorage('viewing_points');

    const planItems = items
      .filter(i => i.viewing_plan_id === plan.id)
      .sort((a, b) => a.order - b.order)
      .map(i => {
        const vp = viewingPoints.find(v => v.id === i.viewing_point_id) || null;
        return {
          viewing_plan_item_id: i.id,
          viewing_point_id: i.viewing_point_id,
          viewing_point_name: vp ? vp.name : '',
          type: vp ? vp.type : '',
          kilometer_marker: vp && typeof vp.kilometer_marker === 'number' ? vp.kilometer_marker : null,
          latitude: vp && typeof vp.latitude === 'number' ? vp.latitude : null,
          longitude: vp && typeof vp.longitude === 'number' ? vp.longitude : null,
          approximate_time: vp ? vp.approximate_time || '' : '',
          is_accessible: vp ? !!vp.is_accessible : false,
          order: i.order,
          notes: i.notes || '',
          viewing_point: vp
        };
      });

    return {
      viewing_plan_id: plan.id,
      name: plan.name || '',
      created_at: plan.created_at || '',
      updated_at: plan.updated_at || '',
      items: planItems
    };
  }

  reorderViewingPlanItems(orderedItemIds) {
    const items = this._getFromStorage('viewing_plan_items');
    const plans = this._getFromStorage('viewing_plans');

    const idToItem = new Map();
    for (const i of items) {
      idToItem.set(i.id, i);
    }

    let planId = null;
    orderedItemIds.forEach((id, index) => {
      const item = idToItem.get(id);
      if (item) {
        item.order = index + 1;
        planId = item.viewing_plan_id;
      }
    });

    this._saveToStorage('viewing_plan_items', items);

    if (planId) {
      const planIndex = plans.findIndex(p => p.id === planId);
      if (planIndex !== -1) {
        plans[planIndex].updated_at = this._nowIso();
        this._saveToStorage('viewing_plans', plans);
      }
    }

    const updatedItems = orderedItemIds
      .map(id => idToItem.get(id))
      .filter(Boolean)
      .map(i => ({
        viewing_plan_item_id: i.id,
        order: i.order
      }));

    return {
      success: true,
      viewing_plan_id: planId,
      items: updatedItems
    };
  }

  updateViewingPlanItemNotes(viewingPlanItemId, notes) {
    const items = this._getFromStorage('viewing_plan_items');
    const plans = this._getFromStorage('viewing_plans');

    const item = items.find(i => i.id === viewingPlanItemId);
    if (!item) {
      return {
        success: false,
        viewing_plan_item_id: null,
        notes: ''
      };
    }

    item.notes = notes || '';
    this._saveToStorage('viewing_plan_items', items);

    const planIndex = plans.findIndex(p => p.id === item.viewing_plan_id);
    if (planIndex !== -1) {
      plans[planIndex].updated_at = this._nowIso();
      this._saveToStorage('viewing_plans', plans);
    }

    return {
      success: true,
      viewing_plan_item_id: item.id,
      notes: item.notes
    };
  }

  removeViewingPlanItem(viewingPlanItemId) {
    const items = this._getFromStorage('viewing_plan_items');
    const plans = this._getFromStorage('viewing_plans');

    const index = items.findIndex(i => i.id === viewingPlanItemId);
    if (index === -1) {
      return {
        success: false,
        viewing_plan_id: null,
        total_points: 0
      };
    }

    const planId = items[index].viewing_plan_id;
    items.splice(index, 1);

    // Re-order remaining items for this plan
    const remaining = items
      .filter(i => i.viewing_plan_id === planId)
      .sort((a, b) => a.order - b.order);
    remaining.forEach((i, idx) => {
      i.order = idx + 1;
    });

    this._saveToStorage('viewing_plan_items', items);

    const planIndex = plans.findIndex(p => p.id === planId);
    if (planIndex !== -1) {
      plans[planIndex].updated_at = this._nowIso();
      this._saveToStorage('viewing_plans', plans);
    }

    return {
      success: true,
      viewing_plan_id: planId,
      total_points: remaining.length
    };
  }

  renameViewingPlan(name) {
    const plan = this._getOrCreateViewingPlan();
    const plans = this._getFromStorage('viewing_plans');

    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx !== -1) {
      plans[idx].name = name || '';
      plans[idx].updated_at = this._nowIso();
      this._saveToStorage('viewing_plans', plans);
    }

    return {
      success: true,
      viewing_plan_id: plan.id,
      name: name || ''
    };
  }

  // -----------------------
  // Costume contest
  // -----------------------

  getCostumeContestInfo() {
    const rulesRaw = localStorage.getItem('costume_contest_rules_html');

    const ageCategories = [
      { value: 'under_10s', label: 'Under 10s' },
      { value: 'age_10_13', label: 'Age 10–13' },
      { value: 'age_14_16', label: 'Age 14–16' },
      { value: 'open', label: 'Open' }
    ];

    const themes = [
      { value: 'superheroes', label: 'Superheroes' },
      { value: 'fairy_tales', label: 'Fairy tales' },
      { value: 'open_theme', label: 'Open theme' }
    ];

    const judgingSlots = [
      { value: '9_00_am', label: '9:00 AM' },
      { value: '9_30_am', label: '9:30 AM' },
      { value: '10_00_am', label: '10:00 AM' },
      { value: '10_30_am', label: '10:30 AM' }
    ];

    return {
      rules_html: rulesRaw || '',
      age_categories: ageCategories,
      themes,
      judging_slots: judgingSlots
    };
  }

  getCostumeContestFormOptions() {
    const teams = this._getFromStorage('pram_race_teams');
    const categories = this._getFromStorage('pram_race_categories');

    const linkableTeams = teams
      .filter(t => t.registration_status !== 'cancelled')
      .map(t => {
        const cat = categories.find(c => c.id === t.category_id) || null;
        return {
          team_id: t.id,
          team_name: t.name,
          category_display_label: cat ? cat.display_label : '',
          team: this._getTeamById(t.id)
        };
      });

    const baseInfo = this.getCostumeContestInfo();

    return {
      age_categories: baseInfo.age_categories,
      themes: baseInfo.themes,
      judging_slots: baseInfo.judging_slots,
      linkable_pram_race_teams: linkableTeams
    };
  }

  registerCostumeContestEntry(
    ageCategory,
    theme,
    judgingSlot,
    participantName,
    participantAge,
    linkedTeamId,
    parentalConsent,
    notes
  ) {
    if (!['under_10s', 'age_10_13', 'age_14_16', 'open'].includes(ageCategory)) {
      return {
        success: false,
        entry_id: null,
        confirmation_message: 'Invalid age category'
      };
    }

    if (!['superheroes', 'fairy_tales', 'open_theme'].includes(theme)) {
      return {
        success: false,
        entry_id: null,
        confirmation_message: 'Invalid theme'
      };
    }

    if (!['9_00_am', '9_30_am', '10_00_am', '10_30_am'].includes(judgingSlot)) {
      return {
        success: false,
        entry_id: null,
        confirmation_message: 'Invalid judging slot'
      };
    }

    if (!participantName || typeof participantAge === 'undefined' || participantAge === null) {
      return {
        success: false,
        entry_id: null,
        confirmation_message: 'Participant name and age are required'
      };
    }

    if (!parentalConsent) {
      return {
        success: false,
        entry_id: null,
        confirmation_message: 'Parental/guardian consent is required'
      };
    }

    const teams = this._getFromStorage('pram_race_teams');
    if (linkedTeamId) {
      const team = teams.find(t => t.id === linkedTeamId);
      if (!team) {
        return {
          success: false,
          entry_id: null,
          confirmation_message: 'Linked team not found'
        };
      }
    }

    const entries = this._getFromStorage('costume_contest_entries');
    const entryId = this._generateId('ccentry');
    const now = this._nowIso();

    const entry = {
      id: entryId,
      age_category: ageCategory,
      theme,
      judging_slot: judgingSlot,
      participant_name: participantName,
      participant_age: Number(participantAge) || 0,
      linked_team_id: linkedTeamId || null,
      parental_consent: !!parentalConsent,
      created_at: now,
      notes: notes || ''
    };

    entries.push(entry);
    this._saveToStorage('costume_contest_entries', entries);

    return {
      success: true,
      entry_id: entryId,
      confirmation_message: 'Costume contest entry registered successfully'
    };
  }

  // -----------------------
  // Race options & individual registration
  // -----------------------

  listRaceOptions() {
    const options = this._getFromStorage('race_options');
    return options.map(r => ({
      race_option_id: r.id,
      name: r.name || '',
      distance_km: r.distance_km,
      description: r.description || '',
      entry_fee: r.entry_fee,
      start_time: r.start_time || '',
      difficulty_level: r.difficulty_level,
      registration_status: r.registration_status,
      race_option: r
    }));
  }

  getRaceOptionDetails(raceOptionId) {
    const options = this._getFromStorage('race_options');
    const r = options.find(o => o.id === raceOptionId);
    if (!r) {
      return {
        race_option_id: null,
        name: '',
        distance_km: 0,
        description: '',
        entry_fee: 0,
        start_time: '',
        difficulty_level: '',
        registration_status: '',
        course_description_html: '',
        min_age: 0
      };
    }

    const courseRaw = localStorage.getItem('race_option_course_' + raceOptionId) || '';

    return {
      race_option_id: r.id,
      name: r.name || '',
      distance_km: r.distance_km,
      description: r.description || '',
      entry_fee: r.entry_fee,
      start_time: r.start_time || '',
      difficulty_level: r.difficulty_level,
      registration_status: r.registration_status,
      course_description_html: courseRaw,
      min_age: typeof r.min_age === 'number' ? r.min_age : 0
    };
  }

  startRaceIndividualRegistration(raceOptionId, registrationType) {
    const options = this._getFromStorage('race_options');
    const regs = this._getFromStorage('race_individual_registrations');

    const option = options.find(o => o.id === raceOptionId);
    if (!option) {
      return {
        registration_id: null,
        race_option_id: null,
        race_name: '',
        registration_type: registrationType,
        current_step: 'personal_details',
        steps_sequence: ['personal_details', 'emergency_contact', 'payment', 'confirmation']
      };
    }

    if (!['solo_adult_entry', 'solo_child_entry', 'team_entry'].includes(registrationType)) {
      registrationType = 'solo_adult_entry';
    }

    const registrationId = this._generateId('raceind');
    const now = this._nowIso();

    const reg = {
      id: registrationId,
      race_option_id: raceOptionId,
      registration_type: registrationType,
      first_name: '',
      last_name: '',
      date_of_birth: null,
      current_step: 'personal_details',
      registration_status: 'in_progress',
      created_at: now,
      updated_at: now
    };

    regs.push(reg);
    this._saveToStorage('race_individual_registrations', regs);

    return {
      registration_id: registrationId,
      race_option_id: raceOptionId,
      race_name: option.name || '',
      registration_type: registrationType,
      current_step: 'personal_details',
      steps_sequence: ['personal_details', 'emergency_contact', 'payment', 'confirmation']
    };
  }

  saveRaceRegistrationPersonalDetails(registrationId, firstName, lastName, dateOfBirth) {
    const regs = this._getFromStorage('race_individual_registrations');
    const reg = regs.find(r => r.id === registrationId);

    if (!reg) {
      return {
        success: false,
        registration_id: null,
        current_step: null,
        next_step: null,
        message: 'Registration not found'
      };
    }

    if (!firstName || !lastName || !dateOfBirth) {
      return {
        success: false,
        registration_id: registrationId,
        current_step: reg.current_step,
        next_step: reg.current_step,
        message: 'First name, last name and date of birth are required'
      };
    }

    const dobIso = this._parseDateToISO(dateOfBirth);
    if (!dobIso) {
      return {
        success: false,
        registration_id: registrationId,
        current_step: reg.current_step,
        next_step: reg.current_step,
        message: 'Invalid date of birth format'
      };
    }

    reg.first_name = firstName;
    reg.last_name = lastName;
    reg.date_of_birth = dobIso;
    reg.updated_at = this._nowIso();

    const stepInfo = this._updateRegistrationStep(reg);

    this._saveToStorage('race_individual_registrations', regs);

    return {
      success: true,
      registration_id: registrationId,
      current_step: stepInfo.current_step,
      next_step: stepInfo.next_step,
      message: 'Personal details saved'
    };
  }

  // -----------------------
  // FAQ & contact
  // -----------------------

  getFAQCategoriesAndFeatured() {
    const faqs = this._getFromStorage('faq_items');

    const categoriesMap = new Map();
    const featured = [];

    for (const faq of faqs) {
      if (faq.category) {
        const slug = this._slugify(faq.category);
        if (!categoriesMap.has(slug)) {
          categoriesMap.set(slug, {
            slug,
            name: faq.category
          });
        }
      }
      if (faq.is_featured) {
        featured.push(faq);
      }
    }

    return {
      categories: Array.from(categoriesMap.values()),
      featured_faqs: featured
    };
  }

  searchFAQs(query, categorySlug) {
    const faqs = this._getFromStorage('faq_items');

    // Instrumentation for task completion tracking (task_8)
    try {
      localStorage.setItem('task8_lastFaqSearchQuery', String(query || ''));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const q = (query || '').toLowerCase();

    return faqs.filter(faq => {
      if (categorySlug) {
        const catSlug = this._slugify(faq.category || '');
        if (catSlug !== categorySlug) return false;
      }
      if (!q) return true;
      const inQuestion = (faq.question || '').toLowerCase().includes(q);
      const inAnswer = (faq.answer || '').toLowerCase().includes(q);
      const inTags = Array.isArray(faq.tags)
        ? faq.tags.some(t => String(t).toLowerCase().includes(q))
        : false;
      return inQuestion || inAnswer || inTags;
    });
  }

  getContactFormOptions() {
    const helpRaw = localStorage.getItem('contact_help_text_html');

    const enquiryTypes = [
      { value: 'general_event_question', label: 'General event question' },
      { value: 'volunteering', label: 'Volunteering' },
      { value: 'sponsorship', label: 'Sponsorship' },
      { value: 'donations', label: 'Donations' },
      { value: 'accessibility', label: 'Accessibility' },
      { value: 'other', label: 'Other' }
    ];

    return {
      enquiry_types: enquiryTypes,
      help_text_html: helpRaw || ''
    };
  }

  submitContactEnquiry(enquiryType, name, email, message) {
    const validTypes = [
      'general_event_question',
      'volunteering',
      'sponsorship',
      'donations',
      'accessibility',
      'other'
    ];

    if (!validTypes.includes(enquiryType)) {
      return {
        success: false,
        enquiry_id: null,
        status: null,
        confirmation_message: 'Invalid enquiry type'
      };
    }

    if (!name || !email || !message) {
      return {
        success: false,
        enquiry_id: null,
        status: null,
        confirmation_message: 'Name, email and message are required'
      };
    }

    const enquiries = this._getFromStorage('contact_enquiries');
    const enquiryId = this._generateId('enq');
    const now = this._nowIso();

    const enquiry = {
      id: enquiryId,
      enquiry_type: enquiryType,
      name,
      email,
      message,
      created_at: now,
      status: 'received'
    };

    enquiries.push(enquiry);
    this._saveToStorage('contact_enquiries', enquiries);

    return {
      success: true,
      enquiry_id: enquiryId,
      status: 'received',
      confirmation_message: 'Your message has been sent'
    };
  }

  // -----------------------
  // General donations (Donate page)
  // -----------------------

  getDonatePageInfo() {
    const raw = localStorage.getItem('donate_page_info');
    let introHtml = '';
    let defaultPercent = 5;
    let suggested = [10, 20, 50, 100];

    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.intro_html) introHtml = data.intro_html;
        if (typeof data.default_processing_fee_percent === 'number') {
          defaultPercent = data.default_processing_fee_percent;
        }
        if (Array.isArray(data.suggested_amounts)) {
          suggested = data.suggested_amounts;
        }
      } catch (e) {}
    }

    const modes = [
      {
        value: 'single_charity',
        label: 'Single charity',
        description: 'Donate the full amount to one charity.'
      },
      {
        value: 'split_between_charities',
        label: 'Split between charities',
        description: 'Share your donation between multiple charities.'
      }
    ];

    return {
      intro_html: introHtml,
      modes,
      default_processing_fee_percent: defaultPercent,
      suggested_amounts: suggested
    };
  }

  getDonationCharityOptions() {
    const charities = this._getFromStorage('charities');
    return charities.map(ch => ({
      charity_id: ch.id,
      name: ch.name || '',
      short_name: ch.short_name || '',
      description: ch.description || '',
      is_primary_event_charity: !!ch.is_primary_event_charity,
      charity: ch
    }));
  }

  createSplitDonation(totalAmount, allocations, coverProcessingFees, processingFeePercent, newsletterOptIn) {
    const charities = this._getFromStorage('charities');
    const generalDonations = this._getFromStorage('general_donations');
    const donationAllocations = this._getFromStorage('donation_allocations');

    const total = Number(totalAmount) || 0;
    if (total <= 0) {
      return {
        success: false,
        donation_id: null,
        mode: 'split_between_charities',
        total_amount: 0,
        allocations: [],
        cover_processing_fees: !!coverProcessingFees,
        processing_fee_percent: processingFeePercent || 0,
        total_with_fees: 0,
        payment_status: null,
        next_step: null
      };
    }

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return {
        success: false,
        donation_id: null,
        mode: 'split_between_charities',
        total_amount: 0,
        allocations: [],
        cover_processing_fees: !!coverProcessingFees,
        processing_fee_percent: processingFeePercent || 0,
        total_with_fees: 0,
        payment_status: null,
        next_step: null
      };
    }

    const validAllocations = [];
    let sumAlloc = 0;

    for (const a of allocations) {
      const charityId = a.charityId;
      const amt = Number(a.amount) || 0;
      if (!charityId || amt <= 0) continue;
      const charity = charities.find(c => c.id === charityId);
      if (!charity) continue;
      validAllocations.push({ charity_id: charityId, amount: amt, charity });
      sumAlloc += amt;
    }

    if (validAllocations.length === 0) {
      return {
        success: false,
        donation_id: null,
        mode: 'split_between_charities',
        total_amount: 0,
        allocations: [],
        cover_processing_fees: !!coverProcessingFees,
        processing_fee_percent: processingFeePercent || 0,
        total_with_fees: 0,
        payment_status: null,
        next_step: null
      };
    }

    // If there is a mismatch, prefer the sumAlloc as actual total
    const effectiveTotal = sumAlloc;

    let defaultPercent = 5;
    const donateInfoRaw = localStorage.getItem('donate_page_info');
    if (donateInfoRaw) {
      try {
        const info = JSON.parse(donateInfoRaw);
        if (typeof info.default_processing_fee_percent === 'number') {
          defaultPercent = info.default_processing_fee_percent;
        }
      } catch (e) {}
    }

    const percent = typeof processingFeePercent === 'number' ? processingFeePercent : defaultPercent;

    const { fee, total_with_fees } = this._calculateProcessingFees(effectiveTotal, percent, coverProcessingFees);

    const donationId = this._generateId('gendon');
    const now = this._nowIso();

    const donation = {
      id: donationId,
      mode: 'split_between_charities',
      total_amount: effectiveTotal,
      cover_processing_fees: !!coverProcessingFees,
      processing_fee_percent: percent,
      newsletter_opt_in: !!newsletterOptIn,
      created_at: now,
      payment_status: 'pending'
    };

    generalDonations.push(donation);

    for (const va of validAllocations) {
      const allocId = this._generateId('alloc');
      donationAllocations.push({
        id: allocId,
        general_donation_id: donationId,
        charity_id: va.charity_id,
        amount: va.amount
      });
    }

    this._saveToStorage('general_donations', generalDonations);
    this._saveToStorage('donation_allocations', donationAllocations);

    return {
      success: true,
      donation_id: donationId,
      mode: 'split_between_charities',
      total_amount: effectiveTotal,
      allocations: validAllocations.map(a => ({ charity_id: a.charity_id, amount: a.amount, charity: a.charity })),
      cover_processing_fees: !!coverProcessingFees,
      processing_fee_percent: percent,
      total_with_fees: total_with_fees,
      payment_status: 'pending',
      next_step: 'donor_details'
    };
  }

  saveDonationDonorDetails(donationId, donorName, donorEmail) {
    const donations = this._getFromStorage('general_donations');
    const donation = donations.find(d => d.id === donationId);

    if (!donation) {
      return {
        success: false,
        donation_id: null,
        next_step: null,
        message: 'Donation not found'
      };
    }

    if (!donorName || !donorEmail) {
      return {
        success: false,
        donation_id: donationId,
        next_step: 'donor_details',
        message: 'Donor name and email are required'
      };
    }

    donation.donor_name = donorName;
    donation.donor_email = donorEmail;

    this._saveToStorage('general_donations', donations);

    return {
      success: true,
      donation_id: donationId,
      next_step: 'payment',
      message: 'Donor details saved'
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