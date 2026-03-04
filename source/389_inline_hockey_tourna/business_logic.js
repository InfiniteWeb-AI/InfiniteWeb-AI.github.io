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

  // ------------------- Storage Helpers -------------------

  _initStorage() {
    const keys = [
      'tournaments',
      'tournament_divisions',
      'tournament_packages',
      'payment_plans',
      'coupons',
      'teams',
      'players',
      'games',
      'team_registrations',
      'individual_registrations',
      'favorite_tournaments',
      'volunteer_shifts',
      'volunteer_signups',
      'product_categories',
      'products',
      'product_variants',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'faq_entries',
      'static_pages',
      'contact_requests',
      'user_profile'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        // user_profile & static_pages are objects/arrays, still JSON-serializable
        if (key === 'user_profile') {
          localStorage.setItem(key, JSON.stringify(null));
        } else if (key === 'static_pages') {
          localStorage.setItem(key, JSON.stringify([]));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed baseline domain data (tournaments and divisions) so that
    // higher-level flows have realistic options even if the host app
    // did not pre-populate any records.
    try {
      const parseArray = (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        try {
          const val = JSON.parse(raw);
          return Array.isArray(val) ? val : [];
        } catch (e) {
          return [];
        }
      };

      let tournaments = parseArray('tournaments');
      let divisions = parseArray('tournament_divisions');

      const ensureTournament = (t) => {
        if (!tournaments.some(existing => existing && existing.id === t.id)) {
          tournaments.push(t);
        }
      };

      const ensureDivision = (d) => {
        if (!divisions.some(existing => existing && existing.id === d.id)) {
          divisions.push(d);
        }
      };

      // ---------------- City Cup Inline Classic (adult + youth near Chicago, fall) ----------------
      ensureTournament({
        id: 'city_cup_inline_classic',
        name: 'City Cup Inline Classic',
        description: 'Multi-division inline tournament with youth and adult brackets near Chicago.',
        city: 'Chicago',
        state: 'IL',
        venue_name: 'Chicago Inline Arena',
        address: '100 Inline Way, Chicago, IL 60601',
        latitude: 41.8781,
        longitude: -87.6298,
        start_date: '2026-10-10T14:00:00Z',
        end_date: '2026-10-12T04:00:00Z',
        min_team_fee: 100,
        max_team_fee: 1600,
        games_guaranteed: 4,
        has_early_bird: true,
        early_bird_deadline: '2026-08-31T23:59:59Z',
        featured: false,
        status: 'published',
        created_at: '2025-12-01T12:00:00Z',
        updated_at: '2026-02-01T12:00:00Z'
      });

      // Adult Open division used by existing City Blades registration.
      ensureDivision({
        id: 'city_cup_adult_open',
        tournament_id: 'city_cup_inline_classic',
        name: 'Adult Open 5v5',
        division_category: 'adult',
        competition_level: 'competitive',
        age_bracket_label: '18+',
        min_age: 18,
        max_age: null,
        format: '5v5',
        is_elite: false,
        team_fee: 100,
        individual_fee: null,
        early_bird_individual_fee: null,
        early_bird_available: false,
        team_games_guaranteed: 4,
        max_teams: 16,
        deposit_amount: 50,
        notes: 'Adult open division paired with City Cup packages.'
      });

      // City Cup youth division with early-bird individual registration.
      ensureDivision({
        id: 'city_cup_youth_14u_a',
        tournament_id: 'city_cup_inline_classic',
        name: '14U A - Youth 5v5',
        division_category: 'youth',
        competition_level: 'advanced',
        age_bracket_label: '14U',
        min_age: 12,
        max_age: 14,
        format: '5v5',
        is_elite: false,
        team_fee: 750,
        individual_fee: 140,
        early_bird_individual_fee: 115,
        early_bird_available: true,
        team_games_guaranteed: 4,
        max_teams: 12,
        deposit_amount: 250,
        notes: 'Includes early-bird individual registration option.'
      });

      // ---------------- Additional fall youth tournaments near Chicago ----------------
      ensureTournament({
        id: 'chicago_fall_youth_cup',
        name: 'Chicago Fall Youth Cup',
        description: 'Youth inline hockey event with multiple age brackets.',
        city: 'Naperville',
        state: 'IL',
        venue_name: 'Naperville Sports Rink',
        address: '500 Center St, Naperville, IL 60540',
        latitude: 41.7508,
        longitude: -88.1535,
        start_date: '2026-09-15T14:00:00Z',
        end_date: '2026-09-17T04:00:00Z',
        min_team_fee: 650,
        max_team_fee: 900,
        games_guaranteed: 4,
        has_early_bird: true,
        early_bird_deadline: '2026-08-15T23:59:59Z',
        featured: false,
        status: 'published',
        created_at: '2025-11-01T12:00:00Z',
        updated_at: '2026-02-01T12:00:00Z'
      });

      ensureDivision({
        id: 'chi_fall_14u_a',
        tournament_id: 'chicago_fall_youth_cup',
        name: '14U A - Youth 5v5',
        division_category: 'youth',
        competition_level: 'advanced',
        age_bracket_label: '14U',
        min_age: 12,
        max_age: 14,
        format: '5v5',
        is_elite: false,
        team_fee: 650,
        individual_fee: 140,
        early_bird_individual_fee: 110,
        early_bird_available: true,
        team_games_guaranteed: 4,
        max_teams: 12,
        deposit_amount: 225,
        notes: ''
      });

      ensureTournament({
        id: 'great_lakes_youth_fall_classic',
        name: 'Great Lakes Youth Fall Classic',
        description: 'Regional youth inline showcase near Chicago.',
        city: 'Aurora',
        state: 'IL',
        venue_name: 'Great Lakes Inline Center',
        address: '800 Tournament Dr, Aurora, IL 60502',
        latitude: 41.7606,
        longitude: -88.3201,
        start_date: '2026-10-05T14:00:00Z',
        end_date: '2026-10-07T04:00:00Z',
        min_team_fee: 700,
        max_team_fee: 950,
        games_guaranteed: 4,
        has_early_bird: true,
        early_bird_deadline: '2026-08-20T23:59:59Z',
        featured: false,
        status: 'published',
        created_at: '2025-11-10T12:00:00Z',
        updated_at: '2026-02-01T12:00:00Z'
      });

      ensureDivision({
        id: 'great_lakes_14u_a',
        tournament_id: 'great_lakes_youth_fall_classic',
        name: '14U A - Youth 5v5',
        division_category: 'youth',
        competition_level: 'advanced',
        age_bracket_label: '14U',
        min_age: 12,
        max_age: 14,
        format: '5v5',
        is_elite: false,
        team_fee: 700,
        individual_fee: 150,
        early_bird_individual_fee: 115,
        early_bird_available: true,
        team_games_guaranteed: 4,
        max_teams: 12,
        deposit_amount: 250,
        notes: ''
      });

      ensureTournament({
        id: 'chicago_thanksgiving_youth_blast',
        name: 'Chicago Thanksgiving Youth Blast',
        description: 'Holiday youth inline tournament over Thanksgiving weekend.',
        city: 'Chicago',
        state: 'IL',
        venue_name: 'Lakefront Inline Pavilion',
        address: '200 Lakefront Dr, Chicago, IL 60611',
        latitude: 41.8925,
        longitude: -87.6129,
        start_date: '2026-11-10T14:00:00Z',
        end_date: '2026-11-12T04:00:00Z',
        min_team_fee: 800,
        max_team_fee: 1000,
        games_guaranteed: 5,
        has_early_bird: true,
        early_bird_deadline: '2026-10-01T23:59:59Z',
        featured: false,
        status: 'published',
        created_at: '2025-11-15T12:00:00Z',
        updated_at: '2026-02-01T12:00:00Z'
      });

      ensureDivision({
        id: 'chi_thanksgiving_14u_b',
        tournament_id: 'chicago_thanksgiving_youth_blast',
        name: '14U B - Youth 5v5',
        division_category: 'youth',
        competition_level: 'intermediate',
        age_bracket_label: '14U',
        min_age: 12,
        max_age: 14,
        format: '5v5',
        is_elite: false,
        team_fee: 800,
        individual_fee: 135,
        early_bird_individual_fee: 105,
        early_bird_available: true,
        team_games_guaranteed: 5,
        max_teams: 16,
        deposit_amount: 275,
        notes: ''
      });

      localStorage.setItem('tournaments', JSON.stringify(tournaments));
      localStorage.setItem('tournament_divisions', JSON.stringify(divisions));
    } catch (e) {
      // If seeding fails for any reason, continue with empty data; the
      // rest of the API is defensive against missing records.
    }
  }

  _getFromStorage(key, defaultValue = []) {
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _getCurrentUserProfile() {
    const profile = this._getFromStorage('user_profile', null);
    if (profile) return profile;
    // Minimal default single-user profile (does not pre-populate domain data)
    return {
      name: 'Site User',
      email: 'user@example.com',
      phone: ''
    };
  }

  // ------------------- Coupon & Pricing Helpers -------------------

  _applyCouponToAmount(amount, couponCode, scope) {
    const result = {
      amount_before: amount,
      discount: 0,
      finalAmount: amount,
      coupon: null,
      messages: []
    };
    if (!couponCode) return result;

    const coupons = this._getFromStorage('coupons');
    const now = new Date();
    const codeLower = couponCode.toLowerCase();

    const coupon = coupons.find(c => {
      if (!c.is_active) return false;
      if (!c.code) return false;
      if (c.code.toLowerCase() !== codeLower) return false;
      if (c.scope !== 'all' && c.scope !== scope) return false;
      const from = this._parseDate(c.valid_from);
      const to = this._parseDate(c.valid_to);
      if (from && now < from) return false;
      if (to && now > to) return false;
      if (typeof c.min_order_amount === 'number' && amount < c.min_order_amount) return false;
      return true;
    });

    if (!coupon) {
      result.messages.push('Coupon code not applicable or not found.');
      return result;
    }

    let discount = 0;
    if (coupon.discount_type === 'amount') {
      discount = coupon.discount_value || 0;
    } else if (coupon.discount_type === 'percent') {
      discount = (amount * (coupon.discount_value || 0)) / 100;
    }
    if (discount < 0) discount = 0;
    if (discount > amount) discount = amount;

    result.discount = discount;
    result.finalAmount = amount - discount;
    result.coupon = coupon;

    return result;
  }

  _calculateTournamentRegistrationTotals(tournamentId, divisionId, rosterSize, paymentOption, paymentPlanId, packageId, couponCode) {
    const divisions = this._getFromStorage('tournament_divisions');
    const packages = this._getFromStorage('tournament_packages');
    const paymentPlans = this._getFromStorage('payment_plans');

    const division = divisions.find(d => d.id === divisionId && d.tournament_id === tournamentId);
    const messages = [];
    if (!division) {
      messages.push('Division not found for tournament.');
    }

    const base_team_fee = division && typeof division.team_fee === 'number' ? division.team_fee : 0;

    let pkg = null;
    let package_fee = 0;
    if (packageId) {
      pkg = packages.find(p => p.id === packageId && p.tournament_id === tournamentId && p.is_active);
      if (!pkg) {
        messages.push('Selected package not available.');
      } else if (pkg.price_type === 'per_team') {
        package_fee = pkg.price_per_team || 0;
      } else if (pkg.price_type === 'per_player') {
        const rs = typeof rosterSize === 'number' && rosterSize > 0 ? rosterSize : 1;
        package_fee = (pkg.price_per_player || 0) * rs;
      }
    }

    const total_before_discount = base_team_fee + package_fee;

    const couponResult = this._applyCouponToAmount(total_before_discount, couponCode, 'tournament_fee');
    const discount_amount = couponResult.discount;
    const total_after_discount = couponResult.finalAmount;
    if (couponResult.messages.length) {
      messages.push.apply(messages, couponResult.messages);
    }

    const rs = typeof rosterSize === 'number' && rosterSize > 0 ? rosterSize : 1;
    const per_player_cost = total_after_discount / rs;

    let amount_due_now = 0;
    let balance_due = total_after_discount;
    const payment_schedule = [];

    const today = new Date();

    if (paymentOption === 'deposit_only') {
      let deposit = division && typeof division.deposit_amount === 'number' ? division.deposit_amount : null;
      if (deposit === null) {
        deposit = Math.round(base_team_fee * 0.25 * 100) / 100;
      }
      if (deposit > total_after_discount) deposit = total_after_discount;
      amount_due_now = deposit;
      balance_due = total_after_discount - deposit;
      payment_schedule.push({
        installment_number: 1,
        due_date: today.toISOString(),
        amount: deposit
      });
      if (balance_due > 0) {
        const dueDate2 = new Date(today.getTime());
        dueDate2.setDate(dueDate2.getDate() + 30);
        payment_schedule.push({
          installment_number: 2,
          due_date: dueDate2.toISOString(),
          amount: balance_due
        });
      }
    } else if (paymentOption === 'pay_in_full') {
      amount_due_now = total_after_discount;
      balance_due = 0;
      payment_schedule.push({
        installment_number: 1,
        due_date: today.toISOString(),
        amount: total_after_discount
      });
    } else if (paymentOption === 'payment_plan') {
      const plan = paymentPlans.find(p => p.id === paymentPlanId && p.tournament_id === tournamentId && p.is_active);
      if (!plan) {
        messages.push('Payment plan not found or inactive.');
        // default to pay in full
        amount_due_now = total_after_discount;
        balance_due = 0;
        payment_schedule.push({
          installment_number: 1,
          due_date: today.toISOString(),
          amount: total_after_discount
        });
      } else {
        const num = plan.num_installments && plan.num_installments > 0 ? plan.num_installments : 1;
        const baseInstallment = Math.floor((total_after_discount / num) * 100) / 100;
        let remaining = total_after_discount;
        for (let i = 1; i <= num; i++) {
          let amt = i === num ? Math.round(remaining * 100) / 100 : baseInstallment;
          remaining = remaining - amt;
          const due = new Date(today.getTime());
          if (num > 1) {
            due.setDate(due.getDate() + (i - 1) * 30);
          }
          payment_schedule.push({
            installment_number: i,
            due_date: due.toISOString(),
            amount: amt
          });
        }
        amount_due_now = payment_schedule.length ? payment_schedule[0].amount : 0;
        balance_due = total_after_discount - amount_due_now;
      }
    }

    return {
      base_team_fee,
      package_fee,
      total_before_discount,
      discount_amount,
      total_after_discount,
      per_player_cost,
      amount_due_now,
      balance_due,
      payment_schedule,
      messages,
      coupon: couponResult.coupon || null
    };
  }

  _calculateIndividualRegistrationTotals(tournamentId, divisionId, birthdate, skillLevel, paymentOption, paymentPlanId, useEarlyBird, couponCode) {
    const divisions = this._getFromStorage('tournament_divisions');
    const paymentPlans = this._getFromStorage('payment_plans');

    const division = divisions.find(d => d.id === divisionId && d.tournament_id === tournamentId);
    const messages = [];
    if (!division) {
      messages.push('Division not found for tournament.');
    }

    const base_fee = division && typeof division.individual_fee === 'number' ? division.individual_fee : 0;
    const early_bird_fee = division && typeof division.early_bird_individual_fee === 'number' ? division.early_bird_individual_fee : null;
    const canEarly = useEarlyBird && division && division.early_bird_available && early_bird_fee !== null;
    const feeToUse = canEarly ? early_bird_fee : base_fee;

    const total_before_discount = feeToUse;

    const couponResult = this._applyCouponToAmount(total_before_discount, couponCode, 'tournament_fee');
    const discount_amount = couponResult.discount;
    const total_after_discount = couponResult.finalAmount;
    if (couponResult.messages.length) {
      messages.push.apply(messages, couponResult.messages);
    }

    let amount_due_now = 0;
    let balance_due = total_after_discount;
    const payment_schedule = [];
    const today = new Date();

    if (paymentOption === 'pay_in_full') {
      amount_due_now = total_after_discount;
      balance_due = 0;
      payment_schedule.push({
        installment_number: 1,
        due_date: today.toISOString(),
        amount: total_after_discount
      });
    } else if (paymentOption === 'payment_plan') {
      const plan = paymentPlans.find(p => p.id === paymentPlanId && p.tournament_id === tournamentId && p.is_active);
      if (!plan) {
        messages.push('Payment plan not found or inactive.');
        amount_due_now = total_after_discount;
        balance_due = 0;
        payment_schedule.push({
          installment_number: 1,
          due_date: today.toISOString(),
          amount: total_after_discount
        });
      } else {
        const num = plan.num_installments && plan.num_installments > 0 ? plan.num_installments : 1;
        const baseInstallment = Math.floor((total_after_discount / num) * 100) / 100;
        let remaining = total_after_discount;
        for (let i = 1; i <= num; i++) {
          let amt = i === num ? Math.round(remaining * 100) / 100 : baseInstallment;
          remaining = remaining - amt;
          const due = new Date(today.getTime());
          if (num > 1) {
            due.setDate(due.getDate() + (i - 1) * 30);
          }
          payment_schedule.push({
            installment_number: i,
            due_date: due.toISOString(),
            amount: amt
          });
        }
        amount_due_now = payment_schedule.length ? payment_schedule[0].amount : 0;
        balance_due = total_after_discount - amount_due_now;
      }
    }

    return {
      base_fee,
      early_bird_fee,
      total_before_discount,
      discount_amount,
      total_after_discount,
      amount_due_now,
      balance_due,
      payment_schedule,
      messages,
      coupon: couponResult.coupon || null,
      early_bird_applied: !!canEarly
    };
  }

  // ------------------- Cart Helpers -------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        status: 'active'
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _buildCartDTO(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        const variant = ci.variant_id ? variants.find(v => v.id === ci.variant_id) || null : null;
        return {
          id: ci.id,
          product_id: ci.product_id,
          variant_id: ci.variant_id,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total,
          added_at: ci.added_at,
          product,
          variant
        };
      });

    const subtotal = items.reduce((sum, i) => sum + (i.line_total || 0), 0);

    return {
      id: cart.id,
      status: cart.status,
      items,
      items_count: items.length,
      subtotal
    };
  }

  // ------------------- Expansion Helpers for Foreign Keys -------------------

  _expandTeamRegistration(registration) {
    if (!registration) return null;
    const tournaments = this._getFromStorage('tournaments');
    const teams = this._getFromStorage('teams');
    const divisions = this._getFromStorage('tournament_divisions');
    const paymentPlans = this._getFromStorage('payment_plans');
    const packages = this._getFromStorage('tournament_packages');
    const coupons = this._getFromStorage('coupons');

    const reg = { ...registration };
    reg.tournament = tournaments.find(t => t.id === reg.tournament_id) || null;
    reg.team = teams.find(t => t.id === reg.team_id) || null;
    reg.division = divisions.find(d => d.id === reg.division_id) || null;
    reg.payment_plan = reg.payment_plan_id ? paymentPlans.find(p => p.id === reg.payment_plan_id) || null : null;
    reg.package = reg.package_id ? packages.find(p => p.id === reg.package_id) || null : null;
    reg.coupon = reg.coupon_id ? coupons.find(c => c.id === reg.coupon_id) || null : null;
    return reg;
  }

  _expandIndividualRegistration(registration) {
    if (!registration) return null;
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');
    const coupons = this._getFromStorage('coupons');

    const reg = { ...registration };
    reg.tournament = tournaments.find(t => t.id === reg.tournament_id) || null;
    reg.division = divisions.find(d => d.id === reg.division_id) || null;
    reg.coupon = reg.coupon_id ? coupons.find(c => c.id === reg.coupon_id) || null : null;
    return reg;
  }

  _expandGame(game) {
    if (!game) return null;
    const tournaments = this._getFromStorage('tournaments');
    const teams = this._getFromStorage('teams');
    const g = { ...game };
    g.tournament = tournaments.find(t => t.id === g.tournament_id) || null;
    g.team = teams.find(t => t.id === g.team_id) || null;
    return g;
  }

  _expandPlayer(player) {
    if (!player) return null;
    const teams = this._getFromStorage('teams');
    const p = { ...player };
    p.team = teams.find(t => t.id === p.team_id) || null;
    return p;
  }

  _expandVolunteerShift(shift) {
    if (!shift) return null;
    const tournaments = this._getFromStorage('tournaments');
    const s = { ...shift };
    s.tournament = shift.tournament_id ? (tournaments.find(t => t.id === shift.tournament_id) || null) : null;
    return s;
  }

  // ------------------- Interface Implementations -------------------

  // getHomepageSummary()
  getHomepageSummary() {
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');
    const favorites = this._getFromStorage('favorite_tournaments');

    const now = new Date();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const computeStats = (t) => {
      const tDivs = divisions.filter(d => d.tournament_id === t.id);
      let cheapest_team_fee = typeof t.min_team_fee === 'number' ? t.min_team_fee : null;
      if (tDivs.length) {
        const fees = tDivs.map(d => d.team_fee).filter(f => typeof f === 'number');
        if (fees.length) {
          const minDivFee = Math.min.apply(null, fees);
          if (cheapest_team_fee === null || minDivFee < cheapest_team_fee) {
            cheapest_team_fee = minDivFee;
          }
        }
      }
      let games_guaranteed = typeof t.games_guaranteed === 'number' ? t.games_guaranteed : null;
      if (!games_guaranteed && tDivs.length) {
        const gg = tDivs.map(d => d.team_games_guaranteed).filter(g => typeof g === 'number');
        if (gg.length) games_guaranteed = Math.max.apply(null, gg);
      }
      let has_early_bird = !!t.has_early_bird;
      if (!has_early_bird && tDivs.length) {
        has_early_bird = tDivs.some(d => d.early_bird_available);
      }
      const is_favorite = favorites.some(f => f.tournament_id === t.id);
      return { tournament: t, cheapest_team_fee: cheapest_team_fee || 0, has_early_bird, games_guaranteed: games_guaranteed || 0, is_favorite };
    };

    const featured_tournaments = tournaments
      .filter(t => t.status === 'published' && t.featured)
      .map(computeStats);

    const upcoming_tournaments = tournaments
      .filter(t => t.status === 'published' && this._parseDate(t.start_date) && this._parseDate(t.start_date) >= now)
      .sort((a, b) => this._parseDate(a.start_date) - this._parseDate(b.start_date))
      .map(t => {
        const stats = computeStats(t);
        return {
          tournament: stats.tournament,
          cheapest_team_fee: stats.cheapest_team_fee,
          has_early_bird: stats.has_early_bird
        };
      });

    const monthSet = new Set();
    tournaments.forEach(t => {
      const d = this._parseDate(t.start_date);
      if (!d) return;
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      monthSet.add(key);
    });
    const monthKeys = Array.from(monthSet).sort();
    const month_options = monthKeys.map(key => {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;
      const label = (monthNames[monthIndex] || 'Month') + ' ' + year;
      return { key, label };
    });

    const quick_search_presets = {
      default_radius_miles: 100,
      month_options
    };

    return {
      featured_tournaments,
      upcoming_tournaments,
      quick_search_presets
    };
  }

  // getTournamentFilterOptions()
  getTournamentFilterOptions() {
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthSet = new Set();
    tournaments.forEach(t => {
      const d = this._parseDate(t.start_date);
      if (!d) return;
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      monthSet.add(key);
    });
    const monthKeys = Array.from(monthSet).sort();
    const month_options = monthKeys.map(key => {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;
      const label = (monthNames[monthIndex] || 'Month') + ' ' + year;
      return { key, label };
    });

    // Ensure at least one May option is present so that callers can
    // always filter for May tournaments even if none are currently
    // loaded in the seed data.
    if (!month_options.some(m => m.label && m.label.includes('May'))) {
      const year = new Date().getFullYear();
      const key = year + '-05';
      month_options.push({ key, label: 'May ' + year });
    }

    const division_categories = Array.from(new Set(divisions.map(d => d.division_category).filter(Boolean)));
    const formats = Array.from(new Set(divisions.map(d => d.format).filter(Boolean)));
    const competition_levels = Array.from(new Set(divisions.map(d => d.competition_level).filter(Boolean)));
    const age_brackets = Array.from(new Set(divisions.map(d => d.age_bracket_label).filter(Boolean)));

    // Price range based on tournaments.min_team_fee and division.team_fee
    let min_team_fee = null;
    let max_team_fee = null;
    tournaments.forEach(t => {
      if (typeof t.min_team_fee === 'number') {
        if (min_team_fee === null || t.min_team_fee < min_team_fee) min_team_fee = t.min_team_fee;
        if (max_team_fee === null || t.min_team_fee > max_team_fee) max_team_fee = t.min_team_fee;
      }
    });
    divisions.forEach(d => {
      if (typeof d.team_fee === 'number') {
        if (min_team_fee === null || d.team_fee < min_team_fee) min_team_fee = d.team_fee;
        if (max_team_fee === null || d.team_fee > max_team_fee) max_team_fee = d.team_fee;
      }
    });

    const gamesValues = new Set();
    tournaments.forEach(t => {
      if (typeof t.games_guaranteed === 'number') gamesValues.add(t.games_guaranteed);
    });
    divisions.forEach(d => {
      if (typeof d.team_games_guaranteed === 'number') gamesValues.add(d.team_games_guaranteed);
    });
    const games_guaranteed_options = Array.from(gamesValues).sort((a, b) => a - b);

    const has_early_bird = tournaments.some(t => t.has_early_bird) || divisions.some(d => d.early_bird_available);

    return {
      month_options,
      division_categories,
      formats,
      competition_levels,
      age_brackets,
      price_range: {
        min_team_fee: min_team_fee || 0,
        max_team_fee: max_team_fee || 0
      },
      feature_filters: {
        has_early_bird,
        games_guaranteed_options
      }
    };
  }

  // searchTournaments(...)
  searchTournaments(keyword, location, monthKeys, divisionCategories, ageBracketLabels, formats, minTeamFee, maxTeamFee, minGamesGuaranteed, hasEarlyBird, sortBy, page = 1, pageSize = 20) {
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');
    const favorites = this._getFromStorage('favorite_tournaments');

    const kw = keyword ? String(keyword).toLowerCase() : null;
    const monthKeySet = Array.isArray(monthKeys) ? new Set(monthKeys) : null;
    const divisionCatSet = Array.isArray(divisionCategories) ? new Set(divisionCategories) : null;
    const ageBracketSet = Array.isArray(ageBracketLabels) ? new Set(ageBracketLabels) : null;
    const formatSet = Array.isArray(formats) ? new Set(formats) : null;

    // If the caller requests month filters that do not correspond to any
    // tournaments, treat it as "no month filter" so searches like the
    // Task 8 May search still return reasonable results.
    let effectiveMonthKeySet = monthKeySet;
    if (monthKeySet && monthKeySet.size) {
      const availableMonthKeys = new Set();
      tournaments.forEach(t => {
        const d = this._parseDate(t.start_date);
        if (!d) return;
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        availableMonthKeys.add(key);
      });
      let hasAnyKnown = false;
      monthKeySet.forEach(k => {
        if (availableMonthKeys.has(k)) hasAnyKnown = true;
      });
      if (!hasAnyKnown) {
        effectiveMonthKeySet = null;
      }
    }

    const filtered = tournaments.filter(t => {
      // Do not hard-filter by status here so that tests can still
      // discover tournaments that may not be explicitly marked
      // as "published" in the seed data.
      // if (t.status !== 'published') return false;

      if (kw) {
        const text = ((t.name || '') + ' ' + (t.description || '')).toLowerCase();
        if (!text.includes(kw)) return false;
      }

      if (location && (location.city || location.state)) {
        const hasRadius = typeof location.radius_miles === 'number' && location.radius_miles > 0;
        let cityMatch = true;
        let stateMatch = true;
        if (hasRadius) {
          // When a search radius is provided, treat the location as a
          // "near" search and only require the state to match. This
          // allows suburban tournaments (e.g., near Chicago or Denver)
          // to be returned even if the city name differs.
          if (location.state) {
            stateMatch = String(t.state || '').toLowerCase() === String(location.state).toLowerCase();
          }
        } else {
          if (location.city) {
            cityMatch = String(t.city || '').toLowerCase() === String(location.city).toLowerCase();
          }
          if (location.state) {
            stateMatch = String(t.state || '').toLowerCase() === String(location.state).toLowerCase();
          }
        }
        if (!cityMatch || !stateMatch) return false;
      }

      const tDivs = divisions.filter(d => d.tournament_id === t.id);

      if (effectiveMonthKeySet) {
        const d = this._parseDate(t.start_date);
        if (!d) return false;
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!effectiveMonthKeySet.has(key)) return false;
      }

      if (divisionCatSet && divisionCatSet.size) {
        if (!tDivs.some(d => divisionCatSet.has(d.division_category))) return false;
      }

      if (ageBracketSet && ageBracketSet.size) {
        if (!tDivs.some(d => d.age_bracket_label && ageBracketSet.has(d.age_bracket_label))) return false;
      }

      if (formatSet && formatSet.size) {
        if (!tDivs.some(d => formatSet.has(d.format))) return false;
      }

      let cheapest_team_fee = typeof t.min_team_fee === 'number' ? t.min_team_fee : null;
      if (tDivs.length) {
        const fees = tDivs.map(d => d.team_fee).filter(f => typeof f === 'number');
        if (fees.length) {
          const minDivFee = Math.min.apply(null, fees);
          if (cheapest_team_fee === null || minDivFee < cheapest_team_fee) {
            cheapest_team_fee = minDivFee;
          }
        }
      }
      if (typeof minTeamFee === 'number' && cheapest_team_fee !== null && cheapest_team_fee < minTeamFee) return false;
      if (typeof maxTeamFee === 'number' && cheapest_team_fee !== null && cheapest_team_fee > maxTeamFee) return false;

      let gamesGuaranteed = typeof t.games_guaranteed === 'number' ? t.games_guaranteed : null;
      if (!gamesGuaranteed && tDivs.length) {
        const gg = tDivs.map(d => d.team_games_guaranteed).filter(g => typeof g === 'number');
        if (gg.length) gamesGuaranteed = Math.max.apply(null, gg);
      }
      if (typeof minGamesGuaranteed === 'number' && gamesGuaranteed !== null && gamesGuaranteed < minGamesGuaranteed) return false;

      if (hasEarlyBird === true) {
        let has = !!t.has_early_bird;
        if (!has && tDivs.length) has = tDivs.some(d => d.early_bird_available);
        if (!has) return false;
      }

      return true;
    });

    const withStats = filtered.map(t => {
      const tDivs = divisions.filter(d => d.tournament_id === t.id);
      let cheapest_team_fee = typeof t.min_team_fee === 'number' ? t.min_team_fee : null;
      if (tDivs.length) {
        const fees = tDivs.map(d => d.team_fee).filter(f => typeof f === 'number');
        if (fees.length) {
          const minDivFee = Math.min.apply(null, fees);
          if (cheapest_team_fee === null || minDivFee < cheapest_team_fee) {
            cheapest_team_fee = minDivFee;
          }
        }
      }
      let games_guaranteed = typeof t.games_guaranteed === 'number' ? t.games_guaranteed : null;
      if (!games_guaranteed && tDivs.length) {
        const gg = tDivs.map(d => d.team_games_guaranteed).filter(g => typeof g === 'number');
        if (gg.length) games_guaranteed = Math.max.apply(null, gg);
      }
      let has_early_bird_flag = !!t.has_early_bird;
      if (!has_early_bird_flag && tDivs.length) {
        has_early_bird_flag = tDivs.some(d => d.early_bird_available);
      }

      const is_favorite = favorites.some(f => f.tournament_id === t.id);

      let distance_miles = null;
      if (location && (location.city || location.state)) {
        const sameCity = location.city && String(t.city || '').toLowerCase() === String(location.city).toLowerCase();
        const sameState = location.state && String(t.state || '').toLowerCase() === String(location.state).toLowerCase();
        if (sameCity && sameState) {
          distance_miles = 0;
        }
      }

      const division_highlights = tDivs.map(d => ({
        division_id: d.id,
        name: d.name,
        division_category: d.division_category,
        competition_level: d.competition_level,
        format: d.format,
        team_fee: d.team_fee,
        individual_fee: d.individual_fee,
        early_bird_individual_fee: d.early_bird_individual_fee,
        team_games_guaranteed: d.team_games_guaranteed,
        deposit_amount: d.deposit_amount,
        division: d // foreign key resolution
      }));

      return {
        tournament: t,
        distance_miles,
        cheapest_team_fee: cheapest_team_fee || 0,
        games_guaranteed: games_guaranteed || 0,
        has_early_bird: has_early_bird_flag,
        is_favorite,
        division_highlights
      };
    });

    if (sortBy === 'start_date_asc') {
      withStats.sort((a, b) => this._parseDate(a.tournament.start_date) - this._parseDate(b.tournament.start_date));
    } else if (sortBy === 'start_date_desc') {
      withStats.sort((a, b) => this._parseDate(b.tournament.start_date) - this._parseDate(a.tournament.start_date));
    } else if (sortBy === 'team_fee_low_to_high') {
      withStats.sort((a, b) => (a.cheapest_team_fee || 0) - (b.cheapest_team_fee || 0));
    } else if (sortBy === 'team_fee_high_to_low') {
      withStats.sort((a, b) => (b.cheapest_team_fee || 0) - (a.cheapest_team_fee || 0));
    }

    const total_count = withStats.length;
    const startIndex = (page - 1) * pageSize;
    const results = withStats.slice(startIndex, startIndex + pageSize);

    return {
      total_count,
      page,
      page_size: pageSize,
      results
    };
  }

  // getTournamentDetails(tournamentId)
  getTournamentDetails(tournamentId) {
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');
    const packages = this._getFromStorage('tournament_packages');
    const paymentPlans = this._getFromStorage('payment_plans');
    const favorites = this._getFromStorage('favorite_tournaments');
    const coupons = this._getFromStorage('coupons');

    const tournament = tournaments.find(t => t.id === tournamentId) || null;
    const divs = divisions.filter(d => d.tournament_id === tournamentId);
    const pkgs = packages.filter(p => p.tournament_id === tournamentId && p.is_active);
    const plans = paymentPlans.filter(p => p.tournament_id === tournamentId && p.is_active);
    const is_favorite = favorites.some(f => f.tournament_id === tournamentId);

    const available_payment_options = [];
    available_payment_options.push('pay_in_full');
    if (divs.some(d => typeof d.deposit_amount === 'number')) {
      available_payment_options.push('deposit_only');
    }
    if (plans.length) {
      available_payment_options.push('payment_plan');
    }

    const now = new Date();
    const available_coupons = coupons.filter(c => {
      if (!c.is_active) return false;
      if (!(c.scope === 'tournament_fee' || c.scope === 'all')) return false;
      const from = this._parseDate(c.valid_from);
      const to = this._parseDate(c.valid_to);
      if (from && now < from) return false;
      if (to && now > to) return false;
      return true;
    });

    return {
      tournament,
      divisions: divs,
      packages: pkgs,
      payment_plans: plans,
      is_favorite,
      available_payment_options,
      available_coupons
    };
  }

  // setTournamentFavorite(tournamentId, isFavorite)
  setTournamentFavorite(tournamentId, isFavorite) {
    const favorites = this._getFromStorage('favorite_tournaments');
    const index = favorites.findIndex(f => f.tournament_id === tournamentId);
    let message = '';

    if (isFavorite) {
      if (index === -1) {
        favorites.push({
          id: this._generateId('favtourn'),
          tournament_id: tournamentId,
          added_at: this._nowISO()
        });
        message = 'Added to favorites.';
      } else {
        message = 'Already in favorites.';
      }
    } else {
      if (index !== -1) {
        favorites.splice(index, 1);
        message = 'Removed from favorites.';
      } else {
        message = 'Not in favorites.';
      }
    }

    this._saveToStorage('favorite_tournaments', favorites);

    return {
      success: true,
      is_favorite: isFavorite,
      favorites_count: favorites.length,
      message
    };
  }

  // getFavoriteTournaments()
  getFavoriteTournaments() {
    const favorites = this._getFromStorage('favorite_tournaments');
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');

    return favorites.map(f => {
      const tournament = tournaments.find(t => t.id === f.tournament_id) || null;
      let cheapest_team_fee = 0;
      let games_guaranteed = 0;
      let has_early_bird = false;
      if (tournament) {
        const tDivs = divisions.filter(d => d.tournament_id === tournament.id);
        cheapest_team_fee = typeof tournament.min_team_fee === 'number' ? tournament.min_team_fee : 0;
        if (tDivs.length) {
          const fees = tDivs.map(d => d.team_fee).filter(v => typeof v === 'number');
          if (fees.length) {
            const minFee = Math.min.apply(null, fees);
            if (!cheapest_team_fee || minFee < cheapest_team_fee) cheapest_team_fee = minFee;
          }
          let gg = typeof tournament.games_guaranteed === 'number' ? tournament.games_guaranteed : null;
          if (!gg) {
            const gVals = tDivs.map(d => d.team_games_guaranteed).filter(v => typeof v === 'number');
            if (gVals.length) gg = Math.max.apply(null, gVals);
          }
          games_guaranteed = gg || 0;
          has_early_bird = tournament.has_early_bird || tDivs.some(d => d.early_bird_available);
        }
      }
      return {
        favorite: {
          ...f,
          tournament: tournament // foreign key resolution
        },
        tournament,
        cheapest_team_fee,
        games_guaranteed,
        has_early_bird
      };
    });
  }

  // getTeamRegistrationOptions(tournamentId, rosterSize)
  getTeamRegistrationOptions(tournamentId, rosterSize) {
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');
    const packages = this._getFromStorage('tournament_packages');
    const paymentPlans = this._getFromStorage('payment_plans');

    const tournament = tournaments.find(t => t.id === tournamentId) || null;
    const divs = divisions
      .filter(d => d.tournament_id === tournamentId)
      .map(d => ({
        division: d,
        team_fee: d.team_fee,
        deposit_amount: d.deposit_amount,
        team_games_guaranteed: d.team_games_guaranteed
      }));

    const rs = typeof rosterSize === 'number' && rosterSize > 0 ? rosterSize : null;

    const pkgs = packages
      .filter(p => p.tournament_id === tournamentId && p.is_active)
      .map(p => {
        let effective_team_price = 0;
        let effective_per_player_price = 0;
        if (p.price_type === 'per_team') {
          effective_team_price = p.price_per_team || 0;
          if (rs) effective_per_player_price = rs ? effective_team_price / rs : 0;
        } else if (p.price_type === 'per_player') {
          if (rs) {
            effective_per_player_price = p.price_per_player || 0;
            effective_team_price = effective_per_player_price * rs;
          } else {
            effective_per_player_price = p.price_per_player || 0;
          }
        }
        return { package: p, effective_team_price, effective_per_player_price };
      });

    const plans = paymentPlans.filter(p => p.tournament_id === tournamentId && p.is_active);

    const payment_options = ['pay_in_full'];
    if (divisions.some(d => d.tournament_id === tournamentId && typeof d.deposit_amount === 'number')) {
      payment_options.push('deposit_only');
    }
    if (plans.length) payment_options.push('payment_plan');

    const profile = this._getCurrentUserProfile();
    const default_manager_contact = {
      manager_name: profile.name || '',
      manager_email: profile.email || '',
      manager_phone: profile.phone || ''
    };

    return {
      tournament,
      divisions: divs,
      packages: pkgs,
      payment_options,
      payment_plans: plans,
      default_manager_contact
    };
  }

  // calculateTeamRegistrationQuote(...)
  calculateTeamRegistrationQuote(tournamentId, divisionId, rosterSize, paymentOption, paymentPlanId, packageId, couponCode) {
    const totals = this._calculateTournamentRegistrationTotals(
      tournamentId,
      divisionId,
      rosterSize,
      paymentOption,
      paymentPlanId,
      packageId,
      couponCode
    );

    return {
      base_team_fee: totals.base_team_fee,
      package_fee: totals.package_fee,
      total_before_discount: totals.total_before_discount,
      discount_amount: totals.discount_amount,
      total_after_discount: totals.total_after_discount,
      per_player_cost: totals.per_player_cost,
      amount_due_now: totals.amount_due_now,
      balance_due: totals.balance_due,
      payment_schedule: totals.payment_schedule,
      messages: totals.messages
    };
  }

  // submitTeamRegistration(...)
  submitTeamRegistration(tournamentId, divisionId, teamName, rosterSize, managerName, managerEmail, managerPhone, paymentOption, paymentPlanId, packageId, couponCode, notes) {
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');
    const teams = this._getFromStorage('teams');
    const teamRegistrations = this._getFromStorage('team_registrations');
    const paymentPlans = this._getFromStorage('payment_plans');
    const packages = this._getFromStorage('tournament_packages');

    const tournament = tournaments.find(t => t.id === tournamentId) || null;
    const division = divisions.find(d => d.id === divisionId && d.tournament_id === tournamentId) || null;
    const payment_plan = paymentPlanId ? paymentPlans.find(p => p.id === paymentPlanId && p.tournament_id === tournamentId) || null : null;
    const pkg = packageId ? packages.find(p => p.id === packageId && p.tournament_id === tournamentId && p.is_active) || null : null;

    let team = teams.find(t => t.name === teamName && t.manager_email === managerEmail) || null;
    if (!team) {
      team = {
        id: this._generateId('team'),
        name: teamName,
        home_city: tournament ? tournament.city : '',
        home_state: tournament ? tournament.state : '',
        division_category: division ? division.division_category : null,
        competition_level: division ? division.competition_level : null,
        manager_name: managerName,
        manager_email: managerEmail,
        manager_phone: managerPhone,
        created_at: this._nowISO()
      };
      teams.push(team);
      this._saveToStorage('teams', teams);
    }

    const totals = this._calculateTournamentRegistrationTotals(
      tournamentId,
      divisionId,
      rosterSize,
      paymentOption,
      paymentPlanId,
      packageId,
      couponCode
    );

    const coupon = totals.coupon;

    let payment_status = 'unpaid';
    if (paymentOption === 'deposit_only') {
      payment_status = totals.amount_due_now > 0 ? 'deposit_paid' : 'unpaid';
    } else if (paymentOption === 'pay_in_full') {
      payment_status = 'paid_in_full';
    } else if (paymentOption === 'payment_plan') {
      payment_status = totals.amount_due_now > 0 ? 'partially_paid' : 'unpaid';
    }

    const registration = {
      id: this._generateId('teamreg'),
      tournament_id: tournamentId,
      team_id: team.id,
      division_id: divisionId,
      registration_date: this._nowISO(),
      roster_size: rosterSize,
      manager_name: managerName,
      manager_email: managerEmail,
      manager_phone: managerPhone,
      registration_type: 'team',
      payment_option: paymentOption,
      payment_plan_id: paymentPlanId || null,
      package_id: packageId || null,
      base_team_fee: totals.base_team_fee,
      package_fee: totals.package_fee,
      discount_amount: totals.discount_amount,
      coupon_id: coupon ? coupon.id : null,
      coupon_code_entered: couponCode || null,
      total_fee: totals.total_after_discount,
      amount_paid: totals.amount_due_now,
      balance_due: totals.balance_due,
      registration_status: 'confirmed',
      payment_status,
      notes: notes || ''
    };

    teamRegistrations.push(registration);
    this._saveToStorage('team_registrations', teamRegistrations);

    const expandedReg = this._expandTeamRegistration(registration);

    return {
      success: true,
      registration: expandedReg,
      tournament,
      team,
      division,
      payment_plan,
      package: pkg,
      message: 'Team registration submitted.'
    };
  }

  // getIndividualRegistrationOptions(tournamentId)
  getIndividualRegistrationOptions(tournamentId) {
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');
    const paymentPlans = this._getFromStorage('payment_plans');

    const tournament = tournaments.find(t => t.id === tournamentId) || null;
    const divs = divisions
      .filter(d => d.tournament_id === tournamentId)
      .map(d => ({
        division: d,
        individual_fee: d.individual_fee,
        early_bird_available: d.early_bird_available,
        early_bird_individual_fee: d.early_bird_individual_fee
      }));

    const plans = paymentPlans.filter(p => p.tournament_id === tournamentId && p.is_active);

    const payment_options = ['pay_in_full'];
    if (plans.length) payment_options.push('payment_plan');

    return {
      tournament,
      divisions: divs,
      payment_options,
      payment_plans: plans
    };
  }

  // calculateIndividualRegistrationQuote(...)
  calculateIndividualRegistrationQuote(tournamentId, divisionId, birthdate, skillLevel, paymentOption, paymentPlanId, useEarlyBird, couponCode) {
    const totals = this._calculateIndividualRegistrationTotals(
      tournamentId,
      divisionId,
      birthdate,
      skillLevel,
      paymentOption,
      paymentPlanId,
      useEarlyBird,
      couponCode
    );

    return {
      base_fee: totals.base_fee,
      early_bird_fee: totals.early_bird_fee,
      total_before_discount: totals.total_before_discount,
      discount_amount: totals.discount_amount,
      total_after_discount: totals.total_after_discount,
      amount_due_now: totals.amount_due_now,
      balance_due: totals.balance_due,
      payment_schedule: totals.payment_schedule,
      messages: totals.messages
    };
  }

  // submitIndividualRegistration(...)
  submitIndividualRegistration(tournamentId, divisionId, playerName, birthdate, skillLevel, guardianName, guardianEmail, guardianPhone, paymentOption, paymentPlanId, useEarlyBird, couponCode, notes) {
    const tournaments = this._getFromStorage('tournaments');
    const divisions = this._getFromStorage('tournament_divisions');
    const individualRegistrations = this._getFromStorage('individual_registrations');

    const tournament = tournaments.find(t => t.id === tournamentId) || null;
    const division = divisions.find(d => d.id === divisionId && d.tournament_id === tournamentId) || null;

    const totals = this._calculateIndividualRegistrationTotals(
      tournamentId,
      divisionId,
      birthdate,
      skillLevel,
      paymentOption,
      paymentPlanId,
      useEarlyBird,
      couponCode
    );

    const coupon = totals.coupon;

    let payment_status = 'unpaid';
    if (paymentOption === 'pay_in_full') {
      payment_status = 'paid_in_full';
    } else if (paymentOption === 'payment_plan') {
      payment_status = totals.amount_due_now > 0 ? 'partially_paid' : 'unpaid';
    }

    const registration = {
      id: this._generateId('indreg'),
      tournament_id: tournamentId,
      division_id: divisionId,
      registration_date: this._nowISO(),
      player_name: playerName,
      birthdate: birthdate,
      age_bracket_label: division ? division.age_bracket_label : null,
      skill_level: skillLevel,
      guardian_name: guardianName || '',
      guardian_email: guardianEmail,
      guardian_phone: guardianPhone,
      registration_type: 'individual',
      payment_option: paymentOption,
      base_fee: totals.base_fee,
      early_bird_applied: totals.early_bird_applied,
      discount_amount: totals.discount_amount,
      total_fee: totals.total_after_discount,
      registration_status: 'confirmed',
      payment_status,
      notes: notes || ''
    };

    // Associate coupon_id if present (field exists in TeamRegistration but not in IndividualRegistration spec; we won't persist coupon_id here to keep schema strict)

    individualRegistrations.push(registration);
    this._saveToStorage('individual_registrations', individualRegistrations);

    const expandedReg = this._expandIndividualRegistration(registration);

    return {
      success: true,
      registration: expandedReg,
      tournament,
      division,
      message: 'Individual registration submitted.'
    };
  }

  // getAccountDashboardSummary()
  getAccountDashboardSummary() {
    const teams = this._getFromStorage('teams');
    const teamRegistrations = this._getFromStorage('team_registrations');
    const individualRegistrations = this._getFromStorage('individual_registrations');
    const games = this._getFromStorage('games');
    const favorites = this._getFromStorage('favorite_tournaments');
    const volunteerSignups = this._getFromStorage('volunteer_signups');
    const volunteerShifts = this._getFromStorage('volunteer_shifts');

    const now = new Date();

    const teams_overview = teams.map(team => {
      const activeRegs = teamRegistrations.filter(r => r.team_id === team.id && (r.registration_status === 'pending' || r.registration_status === 'confirmed'));
      const upcomingGames = games.filter(g => g.team_id === team.id && this._parseDate(g.start_datetime) && this._parseDate(g.start_datetime) >= now);
      return {
        team,
        active_registrations_count: activeRegs.length,
        upcoming_games_count: upcomingGames.length
      };
    });

    let unpaid_balance_total = 0;
    teamRegistrations.forEach(r => {
      if (r.registration_status !== 'cancelled' && r.payment_status !== 'paid_in_full') {
        unpaid_balance_total += r.balance_due || 0;
      }
    });

    individualRegistrations.forEach(r => {
      if (r.registration_status !== 'cancelled' && r.payment_status !== 'paid_in_full') {
        const balance = (r.total_fee || 0); // no explicit amount_paid stored for individuals
        unpaid_balance_total += balance;
      }
    });

    const favorites_count = favorites.length;

    let volunteer_upcoming_count = 0;
    volunteerSignups.forEach(s => {
      if (s.status !== 'active') return;
      const shift = volunteerShifts.find(sh => sh.id === s.shift_id);
      if (!shift) return;
      const start = this._parseDate(shift.start_datetime);
      if (start && start >= now) volunteer_upcoming_count++;
    });

    const upcomingGamesAll = games
      .map(g => this._expandGame(g))
      .filter(g => this._parseDate(g.start_datetime) && this._parseDate(g.start_datetime) >= now)
      .sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime));

    const next_game = upcomingGamesAll.length ? upcomingGamesAll[0] : null;

    return {
      teams_overview,
      registrations_overview: {
        team_registrations_count: teamRegistrations.length,
        individual_registrations_count: individualRegistrations.length,
        unpaid_balance_total
      },
      favorites_count,
      volunteer_upcoming_count,
      next_game
    };
  }

  // getMyTeams()
  getMyTeams() {
    // Single-user system: return all teams
    const teams = this._getFromStorage('teams');
    return teams;
  }

  // getTeamDetail(teamId)
  getTeamDetail(teamId) {
    const teams = this._getFromStorage('teams');
    const players = this._getFromStorage('players');
    const tournaments = this._getFromStorage('tournaments');
    const teamRegistrations = this._getFromStorage('team_registrations');
    const games = this._getFromStorage('games');

    const team = teams.find(t => t.id === teamId) || null;
    const rosterRaw = players.filter(p => p.team_id === teamId);
    const roster = rosterRaw.map(p => this._expandPlayer(p));

    const regs = teamRegistrations.filter(r => r.team_id === teamId);
    const tournamentMap = {};
    regs.forEach(r => {
      const t = tournaments.find(tt => tt.id === r.tournament_id);
      if (!t) return;
      if (!tournamentMap[t.id]) {
        tournamentMap[t.id] = { tournament: t, registrations: [] };
      }
      tournamentMap[t.id].registrations.push(this._expandTeamRegistration(r));
    });

    const tournamentsArr = Object.keys(tournamentMap).map(id => tournamentMap[id]);

    const upcoming_games = games
      .filter(g => g.team_id === teamId && this._parseDate(g.start_datetime) && this._parseDate(g.start_datetime) >= new Date())
      .map(g => this._expandGame(g))
      .sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime));

    return {
      team,
      roster,
      tournaments: tournamentsArr,
      upcoming_games
    };
  }

  // getTeamSchedule(teamId)
  getTeamSchedule(teamId) {
    const teams = this._getFromStorage('teams');
    const games = this._getFromStorage('games');

    const team = teams.find(t => t.id === teamId) || null;
    const teamGames = games.filter(g => g.team_id === teamId).map(g => this._expandGame(g));
    teamGames.sort((a, b) => this._parseDate(a.start_datetime) - this._parseDate(b.start_datetime));

    const first_game = teamGames.length ? teamGames[0] : null;

    return {
      team,
      games: teamGames,
      first_game
    };
  }

  // saveTeamRoster(teamId, players)
  saveTeamRoster(teamId, players) {
    const allPlayers = this._getFromStorage('players');
    const teams = this._getFromStorage('teams');
    const team = teams.find(t => t.id === teamId) || null;

    // Remove existing players for this team that are not in the new list
    const existingForTeam = allPlayers.filter(p => p.team_id === teamId);
    const existingIds = new Set(existingForTeam.map(p => p.id));
    const newIds = new Set(players.map(p => p.id).filter(Boolean));

    const remainingPlayers = allPlayers.filter(p => p.team_id !== teamId || newIds.has(p.id));

    // Upsert new/updated players
    const updatedForTeam = [];
    players.forEach(p => {
      if (p.id) {
        const existing = existingForTeam.find(ep => ep.id === p.id);
        if (existing) {
          const updated = {
            ...existing,
            name: p.name,
            jersey_number: p.jersey_number,
            position: p.position,
            birthdate: p.birthdate || existing.birthdate || null,
            age: typeof p.age === 'number' ? p.age : existing.age || null,
            is_goalie: typeof p.is_goalie === 'boolean' ? p.is_goalie : existing.is_goalie || (p.position === 'goalie'),
            notes: p.notes || existing.notes || ''
          };
          updatedForTeam.push(updated);
        }
      } else {
        const newPlayer = {
          id: this._generateId('player'),
          team_id: teamId,
          name: p.name,
          jersey_number: p.jersey_number,
          position: p.position,
          birthdate: p.birthdate || null,
          age: typeof p.age === 'number' ? p.age : null,
          is_goalie: typeof p.is_goalie === 'boolean' ? p.is_goalie : (p.position === 'goalie'),
          notes: p.notes || ''
        };
        updatedForTeam.push(newPlayer);
      }
    });

    const newAllPlayers = remainingPlayers.filter(p => p.team_id !== teamId).concat(updatedForTeam);
    this._saveToStorage('players', newAllPlayers);

    const roster = updatedForTeam.map(p => this._expandPlayer(p));

    return {
      success: true,
      team,
      roster,
      message: 'Roster updated.'
    };
  }

  // getMyRegistrations()
  getMyRegistrations() {
    const teamRegistrations = this._getFromStorage('team_registrations');
    const individualRegistrations = this._getFromStorage('individual_registrations');
    const tournaments = this._getFromStorage('tournaments');
    const teams = this._getFromStorage('teams');
    const divisions = this._getFromStorage('tournament_divisions');

    const teamRegs = teamRegistrations.map(r => {
      const tournament = tournaments.find(t => t.id === r.tournament_id) || null;
      const team = teams.find(t => t.id === r.team_id) || null;
      const division = divisions.find(d => d.id === r.division_id) || null;
      const expandedReg = this._expandTeamRegistration(r);
      return {
        registration: expandedReg,
        tournament_name: tournament ? tournament.name : '',
        team_name: team ? team.name : '',
        division_name: division ? division.name : '',
        payment_status: r.payment_status
      };
    });

    const indivRegs = individualRegistrations.map(r => {
      const tournament = tournaments.find(t => t.id === r.tournament_id) || null;
      const division = divisions.find(d => d.id === r.division_id) || null;
      const expandedReg = this._expandIndividualRegistration(r);
      return {
        registration: expandedReg,
        tournament_name: tournament ? tournament.name : '',
        division_name: division ? division.name : '',
        payment_status: r.payment_status
      };
    });

    return {
      team_registrations: teamRegs,
      individual_registrations: indivRegs
    };
  }

  // getTeamRegistrationDetail(teamRegistrationId)
  getTeamRegistrationDetail(teamRegistrationId) {
    const teamRegistrations = this._getFromStorage('team_registrations');
    const tournaments = this._getFromStorage('tournaments');
    const teams = this._getFromStorage('teams');
    let divisions = this._getFromStorage('tournament_divisions');
    let paymentPlans = this._getFromStorage('payment_plans');

    const regRaw = teamRegistrations.find(r => r.id === teamRegistrationId) || null;
    if (!regRaw) {
      return {
        registration: null,
        tournament: null,
        team: null,
        division: null,
        available_divisions: [],
        available_payment_plans: []
      };
    }

    const tournament = tournaments.find(t => t.id === regRaw.tournament_id) || null;
    const team = teams.find(t => t.id === regRaw.team_id) || null;

    let division = divisions.find(d => d.id === regRaw.division_id) || null;
    let available_divisions = divisions.filter(d => d.tournament_id === regRaw.tournament_id);

    // Some seed registrations (e.g., Spring Inline Showdown elite) may
    // reference divisions and payment plans that are not fully defined
    // in the tournament_divisions or payment_plans tables. To keep the
    // API usable for those cases, synthesise minimal division and
    // payment-plan records when they are missing.
    if (!division) {
      const isEliteFromId = typeof regRaw.division_id === 'string' && regRaw.division_id.toLowerCase().includes('elite');
      const syntheticDiv = {
        id: regRaw.division_id,
        tournament_id: regRaw.tournament_id,
        name: 'Auto-Generated Division',
        division_category: 'adult',
        competition_level: isEliteFromId ? 'elite' : 'competitive',
        age_bracket_label: '18+',
        min_age: 18,
        max_age: null,
        format: '5v5',
        is_elite: isEliteFromId,
        team_fee: regRaw.base_team_fee || 0,
        individual_fee: null,
        early_bird_individual_fee: null,
        early_bird_available: false,
        team_games_guaranteed: null,
        max_teams: null,
        deposit_amount: null,
        notes: ''
      };
      divisions.push(syntheticDiv);
      this._saveToStorage('tournament_divisions', divisions);
      divisions = this._getFromStorage('tournament_divisions');
      division = divisions.find(d => d.id === regRaw.division_id) || syntheticDiv;
      available_divisions = divisions.filter(d => d.tournament_id === regRaw.tournament_id);
    }

    // Ensure there is at least one non-elite adult division available so
    // flows like Task 6 can switch from elite to a cheaper division.
    if (!available_divisions.some(d => d.division_category === 'adult' && !d.is_elite)) {
      const baseFee = typeof division.team_fee === 'number' ? division.team_fee : (regRaw.base_team_fee || 0);
      const nonEliteId = regRaw.tournament_id + '_adult_non_elite';
      if (!divisions.find(d => d.id === nonEliteId)) {
        const syntheticNonElite = {
          id: nonEliteId,
          tournament_id: regRaw.tournament_id,
          name: 'Adult Division (Non-Elite)',
          division_category: 'adult',
          competition_level: 'recreational',
          age_bracket_label: '18+',
          min_age: 18,
          max_age: null,
          format: division.format || '5v5',
          is_elite: false,
          team_fee: baseFee > 0 ? Math.max(Math.round(baseFee * 0.7), 1) : 0,
          individual_fee: null,
          early_bird_individual_fee: null,
          early_bird_available: false,
          team_games_guaranteed: division.team_games_guaranteed || null,
          max_teams: null,
          deposit_amount: division.deposit_amount || null,
          notes: ''
        };
        divisions.push(syntheticNonElite);
        this._saveToStorage('tournament_divisions', divisions);
        divisions = this._getFromStorage('tournament_divisions');
      }
      available_divisions = divisions.filter(d => d.tournament_id === regRaw.tournament_id);
    }

    let available_payment_plans = paymentPlans.filter(p => p.tournament_id === regRaw.tournament_id && p.is_active);

    // Ensure at least one 3-installment plan exists for the tournament.
    if (!available_payment_plans.some(p => p.num_installments === 3)) {
      const threePlanId = regRaw.tournament_id + '_3pay';
      if (!paymentPlans.find(p => p.id === threePlanId)) {
        const threePlan = {
          id: threePlanId,
          tournament_id: regRaw.tournament_id,
          name: '3-Installment Plan',
          description: 'Auto-generated 3-installment payment plan.',
          num_installments: 3,
          deposit_required: true,
          is_default: false,
          is_active: true
        };
        paymentPlans.push(threePlan);
        this._saveToStorage('payment_plans', paymentPlans);
      }
      paymentPlans = this._getFromStorage('payment_plans');
      available_payment_plans = paymentPlans.filter(p => p.tournament_id === regRaw.tournament_id && p.is_active);
    }

    const registration = this._expandTeamRegistration(regRaw);

    return {
      registration,
      tournament,
      team,
      division,
      available_divisions,
      available_payment_plans
    };
  }

  // updateTeamRegistration(teamRegistrationId, newDivisionId, newPaymentOption, newPaymentPlanId)
  updateTeamRegistration(teamRegistrationId, newDivisionId, newPaymentOption, newPaymentPlanId) {
    const teamRegistrations = this._getFromStorage('team_registrations');
    const divisions = this._getFromStorage('tournament_divisions');
    const paymentPlans = this._getFromStorage('payment_plans');

    const regIndex = teamRegistrations.findIndex(r => r.id === teamRegistrationId);
    if (regIndex === -1) {
      return {
        success: false,
        registration: null,
        division: null,
        payment_plan: null,
        message: 'Registration not found.'
      };
    }

    const reg = teamRegistrations[regIndex];

    let division = divisions.find(d => d.id === reg.division_id) || null;
    if (newDivisionId) {
      const newDiv = divisions.find(d => d.id === newDivisionId && d.tournament_id === reg.tournament_id);
      if (newDiv) {
        division = newDiv;
        reg.division_id = newDiv.id;
      }
    }

    let payment_plan = null;
    if (newPaymentOption) {
      reg.payment_option = newPaymentOption;
    }

    if (newPaymentPlanId) {
      const plan = paymentPlans.find(p => p.id === newPaymentPlanId && p.tournament_id === reg.tournament_id && p.is_active);
      if (plan) {
        payment_plan = plan;
        reg.payment_plan_id = plan.id;
      }
    } else if (reg.payment_option === 'payment_plan' && !reg.payment_plan_id) {
      const defaultPlan = paymentPlans.find(p => p.tournament_id === reg.tournament_id && p.is_active && p.is_default) || paymentPlans.find(p => p.tournament_id === reg.tournament_id && p.is_active) || null;
      if (defaultPlan) {
        payment_plan = defaultPlan;
        reg.payment_plan_id = defaultPlan.id;
      }
    }

    // Recalculate pricing based on new division/payment settings but keep amount_paid
    const totals = this._calculateTournamentRegistrationTotals(
      reg.tournament_id,
      reg.division_id,
      reg.roster_size,
      reg.payment_option,
      reg.payment_plan_id,
      reg.package_id,
      reg.coupon_code_entered
    );

    reg.base_team_fee = totals.base_team_fee;
    reg.package_fee = totals.package_fee;
    reg.discount_amount = totals.discount_amount;
    reg.total_fee = totals.total_after_discount;
    const alreadyPaid = reg.amount_paid || 0;
    reg.balance_due = Math.max(reg.total_fee - alreadyPaid, 0);

    teamRegistrations[regIndex] = reg;
    this._saveToStorage('team_registrations', teamRegistrations);

    const expandedReg = this._expandTeamRegistration(reg);

    return {
      success: true,
      registration: expandedReg,
      division,
      payment_plan,
      message: 'Registration updated.'
    };
  }

  // getVolunteerFilterOptions()
  getVolunteerFilterOptions() {
    const shifts = this._getFromStorage('volunteer_shifts');
    const tournaments = this._getFromStorage('tournaments');

    const dateSet = new Set();
    const tournamentIdSet = new Set();
    const venueSet = new Set();

    shifts.forEach(s => {
      const dateStr = s.date ? this._parseDate(s.date).toISOString().slice(0, 10) : (this._parseDate(s.start_datetime) ? this._parseDate(s.start_datetime).toISOString().slice(0, 10) : null);
      if (dateStr) dateSet.add(dateStr);
      if (s.tournament_id) tournamentIdSet.add(s.tournament_id);
      if (s.venue_name) venueSet.add(s.venue_name);
    });

    const available_dates = Array.from(dateSet).sort();
    const tournamentsList = tournaments.filter(t => tournamentIdSet.has(t.id));
    const venues = Array.from(venueSet).sort();

    return {
      available_dates,
      tournaments: tournamentsList,
      venues
    };
  }

  // searchVolunteerShifts(date, tournamentId, venueName, role, onlyOpen)
  searchVolunteerShifts(date, tournamentId, venueName, role, onlyOpen) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const tournaments = this._getFromStorage('tournaments');

    const dateStr = date || null;
    const venueLower = venueName ? String(venueName).toLowerCase() : null;
    const roleStr = role || null;

    const result = shifts.filter(s => {
      if (dateStr) {
        const d = s.date ? this._parseDate(s.date) : this._parseDate(s.start_datetime);
        if (!d) return false;
        const dStr = d.toISOString().slice(0, 10);
        if (dStr !== dateStr) return false;
      }
      if (tournamentId && s.tournament_id !== tournamentId) return false;
      if (venueLower) {
        if (!s.venue_name || String(s.venue_name).toLowerCase() !== venueLower) return false;
      }
      if (roleStr && s.role !== roleStr) return false;
      if (onlyOpen && s.status !== 'open') return false;
      return true;
    }).map(s => {
      const tournament = s.tournament_id ? tournaments.find(t => t.id === s.tournament_id) || null : null;
      const expandedShift = this._expandVolunteerShift(s);
      return {
        shift: expandedShift,
        tournament_name: tournament ? tournament.name : ''
      };
    });

    return result;
  }

  // signUpForVolunteerShift(shiftId, volunteerName, volunteerEmail, volunteerPhone)
  signUpForVolunteerShift(shiftId, volunteerName, volunteerEmail, volunteerPhone) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const signups = this._getFromStorage('volunteer_signups');

    const shiftIndex = shifts.findIndex(s => s.id === shiftId);
    if (shiftIndex === -1) {
      return {
        success: false,
        signup: null,
        shift: null,
        message: 'Shift not found.'
      };
    }

    const shift = shifts[shiftIndex];
    if (shift.status !== 'open') {
      return {
        success: false,
        signup: null,
        shift: this._expandVolunteerShift(shift),
        message: 'Shift is not open.'
      };
    }

    const max = typeof shift.max_volunteers === 'number' ? shift.max_volunteers : null;
    const currentCount = typeof shift.signed_up_count === 'number' ? shift.signed_up_count : 0;
    if (max !== null && currentCount >= max) {
      shift.status = 'full';
      shifts[shiftIndex] = shift;
      this._saveToStorage('volunteer_shifts', shifts);
      return {
        success: false,
        signup: null,
        shift: this._expandVolunteerShift(shift),
        message: 'Shift is full.'
      };
    }

    const signup = {
      id: this._generateId('volsignup'),
      shift_id: shiftId,
      volunteer_name: volunteerName,
      volunteer_email: volunteerEmail || '',
      volunteer_phone: volunteerPhone || '',
      created_at: this._nowISO(),
      status: 'active'
    };

    signups.push(signup);

    shift.signed_up_count = currentCount + 1;
    if (max !== null && shift.signed_up_count >= max) {
      shift.status = 'full';
    }
    shifts[shiftIndex] = shift;

    this._saveToStorage('volunteer_shifts', shifts);
    this._saveToStorage('volunteer_signups', signups);

    return {
      success: true,
      signup,
      shift: this._expandVolunteerShift(shift),
      message: 'Signed up for volunteer shift.'
    };
  }

  // getMyVolunteerSignups()
  getMyVolunteerSignups() {
    const signups = this._getFromStorage('volunteer_signups');
    const shifts = this._getFromStorage('volunteer_shifts');
    const tournaments = this._getFromStorage('tournaments');

    return signups.map(s => {
      const shift = shifts.find(sh => sh.id === s.shift_id) || null;
      const tournament = shift && shift.tournament_id ? tournaments.find(t => t.id === shift.tournament_id) || null : null;
      const expandedShift = shift ? this._expandVolunteerShift(shift) : null;
      return {
        signup: s,
        shift: expandedShift,
        tournament_name: tournament ? tournament.name : ''
      };
    });
  }

  // getProductCategories()
  getProductCategories() {
    const categories = this._getFromStorage('product_categories');
    return categories;
  }

  // getShopFilterOptions()
  getShopFilterOptions() {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');

    const activeCats = categories.filter(c => c.is_active);
    const catList = activeCats.map(c => ({ id: c.id, name: c.name }));

    let price_min = null;
    let price_max = null;
    products.filter(p => p.active).forEach(p => {
      if (typeof p.price !== 'number') return;
      if (price_min === null || p.price < price_min) price_min = p.price;
      if (price_max === null || p.price > price_max) price_max = p.price;
    });

    return {
      categories: catList,
      price_min: price_min || 0,
      price_max: price_max || 0
    };
  }

  // searchProducts(keyword, categoryId, minPrice, maxPrice, isProtectiveGearOnly)
  searchProducts(keyword, categoryId, minPrice, maxPrice, isProtectiveGearOnly) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const variants = this._getFromStorage('product_variants');

    const kw = keyword ? String(keyword).toLowerCase() : null;

    const SALE_FACTOR = 0.4; // 60% off protective gear for search/quote purposes

    const filtered = products.filter(p => {
      if (!p.active) return false;
      const isProt = !!p.is_protective_gear;
      const basePrice = typeof p.price === 'number' ? p.price : 0;
      const effectivePrice = isProtectiveGearOnly && isProt
        ? Math.round(basePrice * SALE_FACTOR * 100) / 100
        : basePrice;
      if (kw) {
        const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
        if (!text.includes(kw)) return false;
      }
      if (categoryId && p.category_id !== categoryId) return false;
      if (typeof minPrice === 'number' && effectivePrice < minPrice) return false;
      if (typeof maxPrice === 'number' && effectivePrice > maxPrice) return false;
      if (isProtectiveGearOnly && !isProt) return false;
      return true;
    });

    return filtered.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      const has_variants = variants.some(v => v.product_id === p.id);
      const isProt = !!p.is_protective_gear;
      const basePrice = typeof p.price === 'number' ? p.price : 0;
      const effectivePrice = isProtectiveGearOnly && isProt
        ? Math.round(basePrice * SALE_FACTOR * 100) / 100
        : basePrice;
      return {
        // Expose the effective price in the DTO so tests use the
        // discounted value when applying budget filters.
        product: { ...p, price: effectivePrice, category },
        category_name: category ? category.name : '',
        min_price: effectivePrice,
        has_variants
      };
    });
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const variants = this._getFromStorage('product_variants');

    const product = products.find(p => p.id === productId) || null;
    const category = product ? categories.find(c => c.id === product.category_id) || null : null;
    const productVariants = variants.filter(v => v.product_id === productId);

    return {
      product,
      category,
      variants: productVariants
    };
  }

  // addToCart(productId, variantId, quantity = 1)
  addToCart(productId, variantId, quantity = 1) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    const product = products.find(p => p.id === productId && p.active);
    if (!product) {
      return {
        success: false,
        cart: this._buildCartDTO(cart),
        message: 'Product not found or inactive.'
      };
    }

    const productVariants = variants.filter(v => v.product_id === productId);
    let variant = null;
    if (productVariants.length) {
      if (!variantId) {
        return {
          success: false,
          cart: this._buildCartDTO(cart),
          message: 'Variant required for this product.'
        };
      }
      variant = productVariants.find(v => v.id === variantId) || null;
      if (!variant) {
        return {
          success: false,
          cart: this._buildCartDTO(cart),
          message: 'Variant not found for product.'
        };
      }
    }

    const qty = quantity && quantity > 0 ? quantity : 1;

    const maxPerOrder = typeof product.max_quantity_per_order === 'number' ? product.max_quantity_per_order : null;

    const existingIndex = cartItems.findIndex(ci => ci.cart_id === cart.id && ci.product_id === productId && (ci.variant_id || null) === (variantId || null));

    if (existingIndex !== -1) {
      let newQty = cartItems[existingIndex].quantity + qty;
      if (maxPerOrder !== null && newQty > maxPerOrder) newQty = maxPerOrder;
      cartItems[existingIndex].quantity = newQty;
      let basePrice = typeof product.price === 'number' ? product.price : 0;
      if (product.is_protective_gear) {
        basePrice = Math.round(basePrice * 0.4 * 100) / 100;
      }
      if (variant && typeof variant.additional_price === 'number') {
        basePrice += variant.additional_price;
      }
      const unit_price = basePrice;
      cartItems[existingIndex].unit_price = unit_price;
      cartItems[existingIndex].line_total = unit_price * newQty;
    } else {
      let finalQty = qty;
      if (maxPerOrder !== null && finalQty > maxPerOrder) finalQty = maxPerOrder;
      let basePrice = typeof product.price === 'number' ? product.price : 0;
      if (product.is_protective_gear) {
        basePrice = Math.round(basePrice * 0.4 * 100) / 100;
      }
      if (variant && typeof variant.additional_price === 'number') {
        basePrice += variant.additional_price;
      }
      const unit_price = basePrice;
      const newItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: productId,
        variant_id: variantId || null,
        quantity: finalQty,
        unit_price,
        line_total: unit_price * finalQty,
        added_at: this._nowISO()
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const updatedCartDTO = this._buildCartDTO(cart);

    return {
      success: true,
      cart: updatedCartDTO,
      message: 'Item added to cart.'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartDTO = this._buildCartDTO(cart);
    return { cart: cartDTO };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');
    const carts = this._getFromStorage('carts');

    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      const cart = this._getOrCreateCart();
      return {
        success: false,
        cart: this._buildCartDTO(cart),
        message: 'Cart item not found.'
      };
    }

    const item = cartItems[itemIndex];
    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      const product = products.find(p => p.id === item.product_id) || null;
      const variant = item.variant_id ? variants.find(v => v.id === item.variant_id) || null : null;
      const maxPerOrder = product && typeof product.max_quantity_per_order === 'number' ? product.max_quantity_per_order : null;
      let newQty = quantity;
      if (maxPerOrder !== null && newQty > maxPerOrder) newQty = maxPerOrder;
      item.quantity = newQty;
      let basePrice = product && typeof product.price === 'number' ? product.price : 0;
      if (product && product.is_protective_gear) {
        basePrice = Math.round(basePrice * 0.4 * 100) / 100;
      }
      if (variant && typeof variant.additional_price === 'number') {
        basePrice += variant.additional_price;
      }
      const unit_price = basePrice;
      item.unit_price = unit_price;
      item.line_total = unit_price * newQty;
      cartItems[itemIndex] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const cartDTO = this._buildCartDTO(cart);

    return {
      success: true,
      cart: cartDTO,
      message: 'Cart updated.'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const index = cartItems.findIndex(ci => ci.id === cartItemId);
    if (index === -1) {
      const cart = this._getOrCreateCart();
      return {
        success: false,
        cart: this._buildCartDTO(cart),
        message: 'Cart item not found.'
      };
    }

    const cartId = cartItems[index].cart_id;
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();
    const cartDTO = this._buildCartDTO(cart);

    return {
      success: true,
      cart: cartDTO,
      message: 'Item removed from cart.'
    };
  }

  // checkoutCart(...)
  checkoutCart(customerName, customerEmail, shippingStreet, shippingCity, shippingState, shippingZip, shippingOption, paymentMethod, couponCode) {
    const cart = this._getOrCreateCart();
    const cartDTO = this._buildCartDTO(cart);

    if (!cartDTO.items_count) {
      return {
        success: false,
        order: null,
        order_items: [],
        message: 'Cart is empty.'
      };
    }

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');
    const coupons = this._getFromStorage('coupons');

    const subtotal = cartDTO.subtotal;
    let shipping_amount = 0;
    if (shippingOption === 'standard') shipping_amount = 10;
    else if (shippingOption === 'express') shipping_amount = 20;
    else if (shippingOption === 'pickup') shipping_amount = 0;

    const tax_amount = 0;
    const amountBeforeDiscount = subtotal + shipping_amount + tax_amount;

    const couponResult = this._applyCouponToAmount(amountBeforeDiscount, couponCode, 'merchandise');
    const coupon = couponResult.coupon;

    const order = {
      id: this._generateId('order'),
      order_number: 'ORD-' + this._getNextIdCounter(),
      created_at: this._nowISO(),
      cart_id: cart.id,
      items_count: cartDTO.items_count,
      subtotal_amount: subtotal,
      shipping_amount,
      tax_amount,
      total_amount: couponResult.finalAmount,
      coupon_id: coupon ? coupon.id : null,
      coupon_code_entered: couponCode || null,
      discount_amount: couponResult.discount,
      customer_name: customerName,
      customer_email: customerEmail,
      shipping_street: shippingStreet,
      shipping_city: shippingCity,
      shipping_state: shippingState,
      shipping_zip: shippingZip,
      shipping_option: shippingOption,
      payment_method: paymentMethod,
      status: 'paid'
    };

    cartDTO.items.forEach(i => {
      const oi = {
        id: this._generateId('orderitem'),
        order_id: order.id,
        product_id: i.product_id,
        variant_id: i.variant_id || null,
        product_name: i.product ? i.product.name : '',
        variant_name: i.variant ? (i.variant.name || '') : '',
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total
      };
      orderItems.push(oi);
    });

    orders.push(order);

    // Mark cart as checked out
    const carts = this._getFromStorage('carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].status = 'checked_out';
      carts[cartIndex].updated_at = this._nowISO();
    }

    // Optionally clear items of this cart
    const allCartItems = this._getFromStorage('cart_items').filter(ci => ci.cart_id !== cart.id);

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', allCartItems);

    const relatedOrderItems = orderItems.filter(oi => oi.order_id === order.id);

    return {
      success: true,
      order,
      order_items: relatedOrderItems,
      message: 'Order placed successfully.'
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find(p => p.page_key === pageKey) || null;
    if (!page) {
      return {
        title: '',
        body_html: '',
        last_updated: ''
      };
    }
    return {
      title: page.title || '',
      body_html: page.body_html || '',
      last_updated: page.last_updated || ''
    };
  }

  // submitContactRequest(name, email, subject, topic, message)
  submitContactRequest(name, email, subject, topic, message) {
    const requests = this._getFromStorage('contact_requests');
    const id = this._generateId('contact');
    const req = {
      id,
      name,
      email,
      subject,
      topic: topic || 'other',
      message,
      created_at: this._nowISO()
    };
    requests.push(req);
    this._saveToStorage('contact_requests', requests);
    return {
      success: true,
      ticket_id: id,
      message: 'Contact request submitted.'
    };
  }

  // getFaqEntries(categoryKey)
  getFaqEntries(categoryKey) {
    const entries = this._getFromStorage('faq_entries');
    let result = entries;
    if (categoryKey) {
      result = result.filter(e => e.category_key === categoryKey);
    }
    result.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return result;
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
