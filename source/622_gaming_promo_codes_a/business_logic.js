// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
      'casino_brands',
      'bonuses',
      'favorite_bonuses',
      'planned_bonuses',
      'comparison_bonuses',
      'bonus_notes',
      'tournaments',
      'tournament_reminders',
      'newsletter_subscriptions',
      'contact_tickets'
    ];
    for (let i = 0; i < keys.length; i++) {
      if (!localStorage.getItem(keys[i])) {
        localStorage.setItem(keys[i], '[]');
      }
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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

  _ensureArrayStorage(key) {
    let arr = this._getFromStorage(key, []);
    if (!Array.isArray(arr)) {
      arr = [];
    }
    this._saveToStorage(key, arr);
    return arr;
  }

  _parseDate(value) {
    if (!value) {
      return null;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _isFutureDate(value) {
    const d = this._parseDate(value);
    if (!d) {
      return false;
    }
    return d.getTime() >= Date.now();
  }

  _enumLabel(value) {
    if (!value || typeof value !== 'string') {
      return '';
    }
    return value
      .split('_')
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  _getOrCreateFavoritesStore() {
    return this._ensureArrayStorage('favorite_bonuses');
  }

  _getOrCreatePlanStore() {
    return this._ensureArrayStorage('planned_bonuses');
  }

  _getOrCreateComparisonStore() {
    return this._ensureArrayStorage('comparison_bonuses');
  }

  _getOrCreateReminderStore() {
    return this._ensureArrayStorage('tournament_reminders');
  }

  _getOrCreateNewsletterSubscription() {
    return this._ensureArrayStorage('newsletter_subscriptions');
  }

  _resolveBonusForeignKeys(bonus) {
    if (!bonus) {
      return null;
    }
    const casinoBrands = this._getFromStorage('casino_brands', []);
    const brand = casinoBrands.find(function (b) {
      return b.id === bonus.casino_brand_id;
    }) || null;
    const resolved = Object.assign({}, bonus);
    resolved.casino_brand = brand;
    return resolved;
  }

  // ---- Home & header interfaces ----

  getHomeQuickLinks() {
    return {
      bonus_sections: [
        { section_key: 'welcome_bonuses', label: 'Welcome Bonuses', badge_text: '' },
        { section_key: 'no_deposit', label: 'No-deposit Codes', badge_text: '' },
        { section_key: 'reload_ongoing', label: 'Reload & Ongoing Offers', badge_text: '' },
        { section_key: 'sports_esports', label: 'Sports & Esports', badge_text: '' },
        { section_key: 'all_bonuses', label: 'All Bonuses', badge_text: '' }
      ],
      tournament_section: {
        section_key: 'tournaments',
        label: 'Tournaments & Events'
      }
    };
  }

  getHomeHighlightBonuses(maxFeatured, maxTop) {
    const featuredLimit = typeof maxFeatured === 'number' ? maxFeatured : 5;
    const topLimit = typeof maxTop === 'number' ? maxTop : 10;

    const bonuses = this._getFromStorage('bonuses', []);
    const casinoBrands = this._getFromStorage('casino_brands', []);

    // Only active or upcoming bonuses
    const now = Date.now();
    const filtered = bonuses.filter(function (b) {
      if (!b.status || b.status === 'active' || b.status === 'upcoming') {
        if (!b.expiration_date) {
          return true;
        }
        const d = new Date(b.expiration_date);
        if (isNaN(d.getTime())) {
          return true;
        }
        return d.getTime() >= now;
      }
      return false;
    });

    filtered.sort(function (a, b) {
      const aPerc = typeof a.bonus_percentage === 'number' ? a.bonus_percentage : 0;
      const bPerc = typeof b.bonus_percentage === 'number' ? b.bonus_percentage : 0;
      if (bPerc !== aPerc) {
        return bPerc - aPerc;
      }
      const aMax = typeof a.max_bonus_amount === 'number' ? a.max_bonus_amount : 0;
      const bMax = typeof b.max_bonus_amount === 'number' ? b.max_bonus_amount : 0;
      return bMax - aMax;
    });

    const makeItem = (bonus, index) => {
      const brand = casinoBrands.find(function (c) {
        return c.id === bonus.casino_brand_id;
      }) || {};
      const highlightTag = index === 0 ? 'Top pick' : 'High value';
      return {
        bonus_id: bonus.id,
        name: bonus.name,
        short_title: bonus.short_title || '',
        casino_brand_name: brand.name || '',
        casino_brand_logo_url: brand.logo_url || '',
        bonus_type: bonus.bonus_type,
        highlight_tag: highlightTag,
        bonus_percentage: typeof bonus.bonus_percentage === 'number' ? bonus.bonus_percentage : null,
        max_bonus_amount: typeof bonus.max_bonus_amount === 'number' ? bonus.max_bonus_amount : null,
        wagering_requirement_multiplier: typeof bonus.wagering_requirement_multiplier === 'number'
          ? bonus.wagering_requirement_multiplier
          : null,
        expiration_date: bonus.expiration_date || null,
        device_compatibility: bonus.device_compatibility || null,
        bonus: this._resolveBonusForeignKeys(bonus)
      };
    };

    const featured = filtered.slice(0, featuredLimit).map((b, idx) => makeItem(b, idx));
    const top = filtered.slice(0, topLimit).map((b, idx) => makeItem(b, idx));

    return {
      featured_bonuses: featured,
      top_bonuses: top
    };
  }

  getHomeQuickAccessStatus() {
    const favorites = this._getOrCreateFavoritesStore();
    const plan = this._getOrCreatePlanStore();
    const comparison = this._getOrCreateComparisonStore();
    return {
      favorites_count: favorites.length,
      plan_count: plan.length,
      comparison_count: comparison.length
    };
  }

  // ---- Bonus listing filters ----

  getBonusFilterOptions(listingCategoryKey) {
    const bonusesAll = this._getFromStorage('bonuses', []);

    const bonuses = bonusesAll.filter(function (b) {
      if (!listingCategoryKey || listingCategoryKey === 'all_bonuses') {
        return true;
      }
      if (!Array.isArray(b.listing_categories)) {
        return false;
      }
      return b.listing_categories.indexOf(listingCategoryKey) !== -1;
    });

    const gameTypeSet = new Set();
    const bonusTypeSet = new Set();
    const userTypeSet = new Set();
    const deviceSet = new Set();
    const paymentSet = new Set();
    const esportsTitleSet = new Set();
    const dayOfWeekSet = new Set();
    const cashbackPeriodSet = new Set();

    let wageringMin = null;
    let wageringMax = null;
    let minDepositMin = null;
    let minDepositMax = null;
    let maxBonusMin = null;
    let maxBonusMax = null;
    let boostMin = null;
    let boostMax = null;
    let cashbackPercMin = null;
    let cashbackPercMax = null;
    let maxCashbackMin = null;
    let maxCashbackMax = null;

    bonuses.forEach(function (b) {
      if (Array.isArray(b.applicable_game_types)) {
        b.applicable_game_types.forEach(function (gt) {
          if (gt) {
            gameTypeSet.add(gt);
          }
        });
      }
      if (b.bonus_type) {
        bonusTypeSet.add(b.bonus_type);
      }
      if (b.user_type) {
        userTypeSet.add(b.user_type);
      }
      if (b.device_compatibility) {
        deviceSet.add(b.device_compatibility);
      }
      if (Array.isArray(b.payment_methods)) {
        b.payment_methods.forEach(function (pm) {
          if (pm) {
            paymentSet.add(pm);
          }
        });
      }
      if (Array.isArray(b.esports_titles)) {
        b.esports_titles.forEach(function (t) {
          if (t) {
            esportsTitleSet.add(t);
          }
        });
      }
      if (Array.isArray(b.available_days)) {
        b.available_days.forEach(function (d) {
          if (d) {
            dayOfWeekSet.add(d);
          }
        });
      }
      if (b.cashback_period) {
        cashbackPeriodSet.add(b.cashback_period);
      }

      if (typeof b.wagering_requirement_multiplier === 'number') {
        const v = b.wagering_requirement_multiplier;
        if (wageringMin === null || v < wageringMin) {
          wageringMin = v;
        }
        if (wageringMax === null || v > wageringMax) {
          wageringMax = v;
        }
      }
      if (typeof b.min_deposit_amount === 'number') {
        const v = b.min_deposit_amount;
        if (minDepositMin === null || v < minDepositMin) {
          minDepositMin = v;
        }
        if (minDepositMax === null || v > minDepositMax) {
          minDepositMax = v;
        }
      }
      if (typeof b.max_bonus_amount === 'number') {
        const v = b.max_bonus_amount;
        if (maxBonusMin === null || v < maxBonusMin) {
          maxBonusMin = v;
        }
        if (maxBonusMax === null || v > maxBonusMax) {
          maxBonusMax = v;
        }
      }
      if (typeof b.boost_percentage === 'number') {
        const v = b.boost_percentage;
        if (boostMin === null || v < boostMin) {
          boostMin = v;
        }
        if (boostMax === null || v > boostMax) {
          boostMax = v;
        }
      }
      if (typeof b.cashback_percentage === 'number') {
        const v = b.cashback_percentage;
        if (cashbackPercMin === null || v < cashbackPercMin) {
          cashbackPercMin = v;
        }
        if (cashbackPercMax === null || v > cashbackPercMax) {
          cashbackPercMax = v;
        }
      }
      if (typeof b.max_cashback_amount === 'number') {
        const v = b.max_cashback_amount;
        if (maxCashbackMin === null || v < maxCashbackMin) {
          maxCashbackMin = v;
        }
        if (maxCashbackMax === null || v > maxCashbackMax) {
          maxCashbackMax = v;
        }
      }
    });

    function setToOptions(set) {
      const arr = Array.from(set);
      arr.sort();
      return arr.map(function (value) {
        return {
          value: value,
          label: value ? value.split('_').map(function (p) {
            return p.charAt(0).toUpperCase() + p.slice(1);
          }).join(' ') : ''
        };
      });
    }

    const game_types = setToOptions(gameTypeSet);
    const bonus_types = setToOptions(bonusTypeSet);
    const user_types = setToOptions(userTypeSet);
    const device_compatibility_options = setToOptions(deviceSet);
    const payment_method_options = setToOptions(paymentSet);
    const esports_title_options = setToOptions(esportsTitleSet);

    // include all days of week in options; ensure those seen are first
    const dayOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const day_of_week_options = dayOrder.map(function (d) {
      return {
        value: d,
        label: d.charAt(0).toUpperCase() + d.slice(1)
      };
    });

    const cashback_period_options = setToOptions(cashbackPeriodSet);

    function rangeObject(min, max, step) {
      return {
        min: min !== null ? min : 0,
        max: max !== null ? max : 0,
        step: step
      };
    }

    const wagering_requirement_range = rangeObject(wageringMin, wageringMax, 1);
    const min_deposit_range = rangeObject(minDepositMin, minDepositMax, 1);
    const max_bonus_amount_range = rangeObject(maxBonusMin, maxBonusMax, 5);
    const boost_percentage_range = rangeObject(boostMin, boostMax, 5);
    const cashback_percentage_range = rangeObject(cashbackPercMin, cashbackPercMax, 1);
    const max_cashback_amount_range = rangeObject(maxCashbackMin, maxCashbackMax, 5);

    const expiration_date_presets = [
      { value: 'expiring_soon', label: 'Expiring soon' },
      { value: 'this_week', label: 'This week' }
    ];

    const sort_options = [
      { value: 'bonus_percentage_desc', label: 'Bonus % - High to Low' },
      { value: 'expiration_date_asc', label: 'Expiration Date - Soonest First' },
      { value: 'min_deposit_asc', label: 'Minimum Deposit - Low to High' },
      { value: 'cashback_percentage_desc', label: 'Cashback % - High to Low' },
      { value: 'max_bonus_amount_desc', label: 'Max Bonus Amount - High to Low' }
    ];

    return {
      game_types: game_types,
      bonus_types: bonus_types,
      user_types: user_types,
      device_compatibility_options: device_compatibility_options,
      payment_method_options: payment_method_options,
      esports_title_options: esports_title_options,
      day_of_week_options: day_of_week_options,
      wagering_requirement_range: wagering_requirement_range,
      min_deposit_range: min_deposit_range,
      max_bonus_amount_range: max_bonus_amount_range,
      boost_percentage_range: boost_percentage_range,
      cashback_percentage_range: cashback_percentage_range,
      max_cashback_amount_range: max_cashback_amount_range,
      expiration_date_presets: expiration_date_presets,
      cashback_period_options: cashback_period_options,
      sort_options: sort_options
    };
  }

  // ---- Bonus listing ----

  listBonuses(listingCategoryKey, filters, sort, page, pageSize) {
    const allBonuses = this._getFromStorage('bonuses', []);
    const casinoBrands = this._getFromStorage('casino_brands', []);
    const favorites = this._getOrCreateFavoritesStore();
    const plan = this._getOrCreatePlanStore();
    const comparison = this._getOrCreateComparisonStore();

    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const f = filters || {};

    // Instrumentation for task completion tracking (task_1: filter/sort on welcome_bonuses)
    try {
      if (listingCategoryKey === 'welcome_bonuses') {
        localStorage.setItem(
          'task1_filterParams',
          JSON.stringify({
            listingCategoryKey: listingCategoryKey,
            filters: filters,
            sort: sort,
            page: page,
            pageSize: pageSize,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let items = allBonuses.filter(function (b) {
      if (listingCategoryKey && listingCategoryKey !== 'all_bonuses') {
        if (!Array.isArray(b.listing_categories) || b.listing_categories.indexOf(listingCategoryKey) === -1) {
          return false;
        }
      }
      return true;
    });

    items = items.filter(function (b) {
      if (f.bonus_types && f.bonus_types.length > 0) {
        if (f.bonus_types.indexOf(b.bonus_type) === -1) {
          return false;
        }
      }
      if (f.game_types && f.game_types.length > 0) {
        const types = Array.isArray(b.applicable_game_types) ? b.applicable_game_types : [];
        const ok = f.game_types.some(function (t) {
          return types.indexOf(t) !== -1;
        });
        if (!ok) {
          return false;
        }
      }
      if (f.esports_titles && f.esports_titles.length > 0) {
        const titles = Array.isArray(b.esports_titles) ? b.esports_titles : [];
        const ok = f.esports_titles.some(function (t) {
          return titles.indexOf(t) !== -1;
        });
        if (!ok) {
          return false;
        }
      }
      if (f.user_types && f.user_types.length > 0) {
        if (!b.user_type || f.user_types.indexOf(b.user_type) === -1) {
          return false;
        }
      }
      if (f.device_compatibility && f.device_compatibility.length > 0) {
        if (!b.device_compatibility || f.device_compatibility.indexOf(b.device_compatibility) === -1) {
          return false;
        }
      }
      if (f.payment_methods && f.payment_methods.length > 0) {
        const methods = Array.isArray(b.payment_methods) ? b.payment_methods : [];
        const ok = f.payment_methods.some(function (pm) {
          return methods.indexOf(pm) !== -1;
        });
        if (!ok) {
          return false;
        }
      }
      if (typeof f.wagering_requirement_max === 'number') {
        if (typeof b.wagering_requirement_multiplier !== 'number' ||
          b.wagering_requirement_multiplier > f.wagering_requirement_max) {
          return false;
        }
      }
      if (typeof f.min_deposit_min === 'number') {
        if (typeof b.min_deposit_amount !== 'number' || b.min_deposit_amount < f.min_deposit_min) {
          return false;
        }
      }
      if (typeof f.min_deposit_max === 'number') {
        if (typeof b.min_deposit_amount !== 'number' || b.min_deposit_amount > f.min_deposit_max) {
          return false;
        }
      }
      if (typeof f.max_bonus_amount_min === 'number') {
        if (typeof b.max_bonus_amount !== 'number' || b.max_bonus_amount < f.max_bonus_amount_min) {
          return false;
        }
      }
      if (typeof f.max_bonus_amount_max === 'number') {
        if (typeof b.max_bonus_amount !== 'number' || b.max_bonus_amount > f.max_bonus_amount_max) {
          return false;
        }
      }
      if (f.cashback_periods && f.cashback_periods.length > 0) {
        if (!b.cashback_period || f.cashback_periods.indexOf(b.cashback_period) === -1) {
          return false;
        }
      }
      if (typeof f.cashback_percentage_min === 'number') {
        if (typeof b.cashback_percentage !== 'number' || b.cashback_percentage < f.cashback_percentage_min) {
          return false;
        }
      }
      if (typeof f.max_cashback_amount_min === 'number') {
        if (typeof b.max_cashback_amount !== 'number' || b.max_cashback_amount < f.max_cashback_amount_min) {
          return false;
        }
      }
      if (typeof f.max_cashback_amount_max === 'number') {
        if (typeof b.max_cashback_amount !== 'number' || b.max_cashback_amount > f.max_cashback_amount_max) {
          return false;
        }
      }
      if (typeof f.boost_percentage_min === 'number') {
        if (typeof b.boost_percentage !== 'number' || b.boost_percentage < f.boost_percentage_min) {
          return false;
        }
      }
      if (f.available_days && f.available_days.length > 0) {
        const days = Array.isArray(b.available_days) ? b.available_days : [];
        const ok = f.available_days.some(function (d) {
          return days.indexOf(d) !== -1;
        });
        if (!ok) {
          return false;
        }
      }
      if (f.expiration_date_from) {
        const from = new Date(f.expiration_date_from);
        const d = b.expiration_date ? new Date(b.expiration_date) : null;
        if (!d || isNaN(d.getTime()) || d < from) {
          return false;
        }
      }
      if (f.expiration_date_to) {
        const to = new Date(f.expiration_date_to);
        const d = b.expiration_date ? new Date(b.expiration_date) : null;
        if (!d || isNaN(d.getTime()) || d > to) {
          return false;
        }
      }
      if (f.expiration_preset) {
        const now = Date.now();
        const d = b.expiration_date ? new Date(b.expiration_date) : null;
        if (!d || isNaN(d.getTime())) {
          return false;
        }
        if (f.expiration_preset === 'expiring_soon') {
          const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
          if (d.getTime() < now || d.getTime() > sevenDays) {
            return false;
          }
        } else if (f.expiration_preset === 'this_week') {
          const date = new Date();
          const day = date.getDay(); // 0..6, 0=Sunday
          const daysUntilEnd = 7 - day;
          const endOfWeek = new Date(date.getTime() + daysUntilEnd * 24 * 60 * 60 * 1000);
          if (d.getTime() < now || d.getTime() > endOfWeek.getTime()) {
            return false;
          }
        }
      }
      if (f.no_deposit_only) {
        if (typeof b.no_deposit_amount !== 'number') {
          return false;
        }
      }
      return true;
    });

    if (sort) {
      items.sort(function (a, b) {
        function num(x) {
          return typeof x === 'number' ? x : 0;
        }
        function dateVal(x) {
          if (!x) {
            return null;
          }
          const d = new Date(x);
          return isNaN(d.getTime()) ? null : d.getTime();
        }
        if (sort === 'bonus_percentage_desc') {
          return num(b.bonus_percentage) - num(a.bonus_percentage);
        }
        if (sort === 'expiration_date_asc') {
          const ad = dateVal(a.expiration_date) || Number.MAX_SAFE_INTEGER;
          const bd = dateVal(b.expiration_date) || Number.MAX_SAFE_INTEGER;
          return ad - bd;
        }
        if (sort === 'min_deposit_asc') {
          const av = typeof a.min_deposit_amount === 'number' ? a.min_deposit_amount : Number.MAX_SAFE_INTEGER;
          const bv = typeof b.min_deposit_amount === 'number' ? b.min_deposit_amount : Number.MAX_SAFE_INTEGER;
          return av - bv;
        }
        if (sort === 'cashback_percentage_desc') {
          return num(b.cashback_percentage) - num(a.cashback_percentage);
        }
        if (sort === 'max_bonus_amount_desc') {
          return num(b.max_bonus_amount) - num(a.max_bonus_amount);
        }
        return 0;
      });
    }

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const paged = items.slice(startIndex, startIndex + effectivePageSize);

    const mapped = paged.map((b) => {
      const brand = casinoBrands.find(function (c) {
        return c.id === b.casino_brand_id;
      }) || {};
      const isFavorited = favorites.some(function (fb) {
        return fb.bonus_id === b.id;
      });
      const isInPlan = plan.some(function (pb) {
        return pb.bonus_id === b.id;
      });
      const isInComparison = comparison.some(function (cb) {
        return cb.bonus_id === b.id;
      });
      return {
        bonus_id: b.id,
        name: b.name,
        short_title: b.short_title || '',
        casino_brand_name: brand.name || '',
        casino_brand_logo_url: brand.logo_url || '',
        casino_brand_rating: typeof brand.rating === 'number' ? brand.rating : null,
        bonus_type: b.bonus_type,
        bonus_percentage: typeof b.bonus_percentage === 'number' ? b.bonus_percentage : null,
        max_bonus_amount: typeof b.max_bonus_amount === 'number' ? b.max_bonus_amount : null,
        min_deposit_amount: typeof b.min_deposit_amount === 'number' ? b.min_deposit_amount : null,
        wagering_requirement_multiplier: typeof b.wagering_requirement_multiplier === 'number'
          ? b.wagering_requirement_multiplier
          : null,
        user_type: b.user_type || null,
        device_compatibility: b.device_compatibility || null,
        payment_methods: Array.isArray(b.payment_methods) ? b.payment_methods : [],
        applicable_game_types: Array.isArray(b.applicable_game_types) ? b.applicable_game_types : [],
        boost_percentage: typeof b.boost_percentage === 'number' ? b.boost_percentage : null,
        cashback_percentage: typeof b.cashback_percentage === 'number' ? b.cashback_percentage : null,
        cashback_period: b.cashback_period || null,
        max_cashback_amount: typeof b.max_cashback_amount === 'number' ? b.max_cashback_amount : null,
        available_days: Array.isArray(b.available_days) ? b.available_days : [],
        start_date: b.start_date || null,
        expiration_date: b.expiration_date || null,
        status: b.status || null,
        is_favorited: isFavorited,
        is_in_plan: isInPlan,
        is_in_comparison: isInComparison,
        bonus: this._resolveBonusForeignKeys(b)
      };
    });

    return {
      items: mapped,
      page: effectivePage,
      pageSize: effectivePageSize,
      totalItems: totalItems,
      totalPages: totalPages
    };
  }

  // ---- Bonus details & code ----

  getBonusDetails(bonusId) {
    const bonuses = this._getFromStorage('bonuses', []);
    const bonus = bonuses.find(function (b) {
      return b.id === bonusId;
    }) || null;

    if (!bonus) {
      return {
        bonus: null,
        user_state: {
          is_favorited: false,
          is_in_plan: false,
          is_in_comparison: false,
          personal_note: ''
        }
      };
    }

    const resolvedBonus = this._resolveBonusForeignKeys(bonus);
    const favorites = this._getOrCreateFavoritesStore();
    const plan = this._getOrCreatePlanStore();
    const comparison = this._getOrCreateComparisonStore();
    const notes = this._getFromStorage('bonus_notes', []);

    const isFavorited = favorites.some(function (fb) {
      return fb.bonus_id === bonus.id;
    });
    const isInPlan = plan.some(function (pb) {
      return pb.bonus_id === bonus.id;
    });
    const isInComparison = comparison.some(function (cb) {
      return cb.bonus_id === bonus.id;
    });

    const note = notes.find(function (n) {
      return n.bonus_id === bonus.id;
    });

    return {
      bonus: resolvedBonus,
      user_state: {
        is_favorited: isFavorited,
        is_in_plan: isInPlan,
        is_in_comparison: isInComparison,
        personal_note: note ? note.content : ''
      }
    };
  }

  getBonusCode(bonusId) {
    const bonuses = this._getFromStorage('bonuses', []);
    const bonus = bonuses.find(function (b) {
      return b.id === bonusId;
    });

    if (!bonus) {
      return {
        requires_promo_code: false,
        promo_code: '',
        claim_url: '',
        copied_to_clipboard: false,
        message: 'Bonus not found'
      };
    }

    const requiresCode = !!bonus.requires_promo_code;
    const code = bonus.promo_code || '';
    const claimUrl = bonus.claim_url || '';

    let message;
    if (requiresCode && code) {
      message = 'Promo code retrieved. Copy it and follow the claim link.';
    } else if (requiresCode && !code) {
      message = 'Promo code required but not available.';
    } else {
      message = 'No code required, just follow the link to claim the offer.';
    }

    // Instrumentation for task completion tracking (task_1, task_3, task_4 selected bonus IDs)
    try {
      // Task 1: qualifying welcome slots bonus with wagering <= 30x and min deposit <= 20
      if (
        bonus &&
        typeof bonus.bonus_type === 'string' &&
        bonus.bonus_type.toLowerCase().indexOf('welcome') !== -1 &&
        Array.isArray(bonus.applicable_game_types) &&
        bonus.applicable_game_types.indexOf('slots') !== -1 &&
        typeof bonus.wagering_requirement_multiplier === 'number' &&
        bonus.wagering_requirement_multiplier <= 30 &&
        typeof bonus.min_deposit_amount === 'number' &&
        bonus.min_deposit_amount <= 20
      ) {
        localStorage.setItem('task1_selectedBonusId', String(bonusId));
      }

      // Task 3: qualifying weekly cashback bonus with max cashback amount >= 100
      if (
        bonus &&
        typeof bonus.cashback_period === 'string' &&
        bonus.cashback_period.toLowerCase() === 'weekly' &&
        typeof bonus.max_cashback_amount === 'number' &&
        bonus.max_cashback_amount >= 100
      ) {
        localStorage.setItem('task3_selectedBonusId', String(bonusId));
      }

      // Task 4: qualifying League of Legends odds boost in comparison list with boost_percentage >= 50
      if (
        bonus &&
        typeof bonus.bonus_type === 'string' &&
        bonus.bonus_type.toLowerCase().indexOf('odds_boost') !== -1 &&
        Array.isArray(bonus.esports_titles) &&
        bonus.esports_titles.indexOf('league_of_legends') !== -1 &&
        typeof bonus.boost_percentage === 'number' &&
        bonus.boost_percentage >= 50
      ) {
        const comparison = this._getOrCreateComparisonStore();
        const inComparison = Array.isArray(comparison) && comparison.some(function (cb) {
          return cb.bonus_id === bonus.id;
        });
        if (inComparison) {
          localStorage.setItem('task4_selectedBonusId', String(bonusId));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      requires_promo_code: requiresCode,
      promo_code: code,
      claim_url: claimUrl,
      copied_to_clipboard: false,
      message: message
    };
  }

  // ---- Favorites ----

  addBonusToFavorites(bonusId) {
    const bonuses = this._getFromStorage('bonuses', []);
    const bonus = bonuses.find(function (b) {
      return b.id === bonusId;
    });
    if (!bonus) {
      const favoritesExisting = this._getOrCreateFavoritesStore();
      return {
        success: false,
        favorites_count: favoritesExisting.length,
        message: 'Bonus not found'
      };
    }

    const favorites = this._getOrCreateFavoritesStore();
    const already = favorites.some(function (fb) {
      return fb.bonus_id === bonusId;
    });
    if (!already) {
      favorites.push({
        id: this._generateId('fav'),
        bonus_id: bonusId,
        saved_at: new Date().toISOString()
      });
      this._saveToStorage('favorite_bonuses', favorites);
    }

    return {
      success: true,
      favorites_count: favorites.length,
      message: already ? 'Already in favorites' : 'Added to favorites'
    };
  }

  removeBonusFromFavorites(bonusId) {
    const favorites = this._getOrCreateFavoritesStore();
    const before = favorites.length;
    const updated = favorites.filter(function (fb) {
      return fb.bonus_id !== bonusId;
    });
    this._saveToStorage('favorite_bonuses', updated);
    const removed = updated.length < before;
    return {
      success: removed,
      favorites_count: updated.length,
      message: removed ? 'Removed from favorites' : 'Bonus was not in favorites'
    };
  }

  getFavoriteBonuses(filters, sort) {
    const f = filters || {};
    const favorites = this._getOrCreateFavoritesStore();
    const bonuses = this._getFromStorage('bonuses', []);
    const casinoBrands = this._getFromStorage('casino_brands', []);

    let items = favorites.map((fav) => {
      const bonus = bonuses.find(function (b) {
        return b.id === fav.bonus_id;
      });
      if (!bonus) {
        return null;
      }
      const brand = casinoBrands.find(function (c) {
        return c.id === bonus.casino_brand_id;
      }) || {};
      return {
        bonus_id: bonus.id,
        saved_at: fav.saved_at,
        name: bonus.name,
        short_title: bonus.short_title || '',
        casino_brand_name: brand.name || '',
        bonus_type: bonus.bonus_type,
        bonus_percentage: typeof bonus.bonus_percentage === 'number' ? bonus.bonus_percentage : null,
        max_bonus_amount: typeof bonus.max_bonus_amount === 'number' ? bonus.max_bonus_amount : null,
        expiration_date: bonus.expiration_date || null,
        device_compatibility: bonus.device_compatibility || null,
        bonus: this._resolveBonusForeignKeys(bonus)
      };
    }).filter(function (x) {
      return x !== null;
    });

    const now = Date.now();

    items = items.filter(function (item) {
      if (f.bonus_types && f.bonus_types.length > 0) {
        if (f.bonus_types.indexOf(item.bonus_type) === -1) {
          return false;
        }
      }
      if (f.expiring_only) {
        if (!item.expiration_date) {
          return false;
        }
        const d = new Date(item.expiration_date);
        if (isNaN(d.getTime()) || d.getTime() <= now) {
          return false;
        }
      }
      return true;
    });

    if (sort) {
      items.sort(function (a, b) {
        function num(x) {
          return typeof x === 'number' ? x : 0;
        }
        function dateVal(x) {
          if (!x) {
            return null;
          }
          const d = new Date(x);
          return isNaN(d.getTime()) ? null : d.getTime();
        }
        if (sort === 'expiration_date_asc') {
          const ad = dateVal(a.expiration_date) || Number.MAX_SAFE_INTEGER;
          const bd = dateVal(b.expiration_date) || Number.MAX_SAFE_INTEGER;
          return ad - bd;
        }
        if (sort === 'bonus_percentage_desc') {
          return num(b.bonus_percentage) - num(a.bonus_percentage);
        }
        if (sort === 'max_bonus_amount_desc') {
          return num(b.max_bonus_amount) - num(a.max_bonus_amount);
        }
        return 0;
      });
    }

    return {
      items: items,
      totalItems: items.length
    };
  }

  // ---- My Plan ----

  addBonusToPlan(bonusId, targetPlayDate) {
    const bonuses = this._getFromStorage('bonuses', []);
    const bonus = bonuses.find(function (b) {
      return b.id === bonusId;
    });
    if (!bonus) {
      const planExisting = this._getOrCreatePlanStore();
      return {
        success: false,
        plan_count: planExisting.length,
        message: 'Bonus not found'
      };
    }

    const plan = this._getOrCreatePlanStore();
    const existing = plan.find(function (p) {
      return p.bonus_id === bonusId;
    });
    const nowIso = new Date().toISOString();

    if (existing) {
      existing.target_play_date = targetPlayDate || existing.target_play_date || null;
      this._saveToStorage('planned_bonuses', plan);
      return {
        success: true,
        plan_count: plan.length,
        message: 'Plan updated'
      };
    }

    plan.push({
      id: this._generateId('plan'),
      bonus_id: bonusId,
      added_at: nowIso,
      target_play_date: targetPlayDate || null,
      is_completed: false
    });
    this._saveToStorage('planned_bonuses', plan);

    return {
      success: true,
      plan_count: plan.length,
      message: 'Added to plan'
    };
  }

  removeBonusFromPlan(bonusId) {
    const plan = this._getOrCreatePlanStore();
    const before = plan.length;
    const updated = plan.filter(function (p) {
      return p.bonus_id !== bonusId;
    });
    this._saveToStorage('planned_bonuses', updated);
    const removed = updated.length < before;
    return {
      success: removed,
      plan_count: updated.length,
      message: removed ? 'Removed from plan' : 'Bonus was not in plan'
    };
  }

  getPlannedBonuses(sort, groupBy) {
    const plan = this._getOrCreatePlanStore();
    const bonuses = this._getFromStorage('bonuses', []);
    const casinoBrands = this._getFromStorage('casino_brands', []);

    let items = plan.map((p) => {
      const bonus = bonuses.find(function (b) {
        return b.id === p.bonus_id;
      });
      if (!bonus) {
        return null;
      }
      const brand = casinoBrands.find(function (c) {
        return c.id === bonus.casino_brand_id;
      }) || {};
      return {
        bonus_id: bonus.id,
        planned_entry_id: p.id,
        added_at: p.added_at,
        target_play_date: p.target_play_date || null,
        is_completed: !!p.is_completed,
        name: bonus.name,
        short_title: bonus.short_title || '',
        casino_brand_name: brand.name || '',
        bonus_type: bonus.bonus_type,
        bonus_percentage: typeof bonus.bonus_percentage === 'number' ? bonus.bonus_percentage : null,
        max_bonus_amount: typeof bonus.max_bonus_amount === 'number' ? bonus.max_bonus_amount : null,
        expiration_date: bonus.expiration_date || null,
        bonus: this._resolveBonusForeignKeys(bonus)
      };
    }).filter(function (x) {
      return x !== null;
    });

    if (sort) {
      items.sort(function (a, b) {
        function dateVal(x) {
          if (!x) {
            return null;
          }
          const d = new Date(x);
          return isNaN(d.getTime()) ? null : d.getTime();
        }
        if (sort === 'target_play_date_asc') {
          const ad = dateVal(a.target_play_date) || Number.MAX_SAFE_INTEGER;
          const bd = dateVal(b.target_play_date) || Number.MAX_SAFE_INTEGER;
          return ad - bd;
        }
        if (sort === 'expiration_date_asc') {
          const ad = dateVal(a.expiration_date) || Number.MAX_SAFE_INTEGER;
          const bd = dateVal(b.expiration_date) || Number.MAX_SAFE_INTEGER;
          return ad - bd;
        }
        if (sort === 'casino_brand_name_asc') {
          const an = a.casino_brand_name || '';
          const bn = b.casino_brand_name || '';
          return an.localeCompare(bn);
        }
        return 0;
      });
    }

    // groupBy parameter is accepted but grouping is not reflected in the returned shape
    // to keep the return structure aligned with the interface definition.

    return {
      items: items,
      totalItems: items.length
    };
  }

  reorderPlannedBonuses(plannedEntryIds) {
    const plan = this._getOrCreatePlanStore();
    const idSet = new Set(Array.isArray(plannedEntryIds) ? plannedEntryIds : []);
    const newOrder = [];

    if (Array.isArray(plannedEntryIds)) {
      plannedEntryIds.forEach(function (id) {
        const entry = plan.find(function (p) {
          return p.id === id;
        });
        if (entry) {
          newOrder.push(entry);
        }
      });
    }

    plan.forEach(function (p) {
      if (!idSet.has(p.id)) {
        newOrder.push(p);
      }
    });

    this._saveToStorage('planned_bonuses', newOrder);

    return {
      success: true,
      message: 'Plan order updated'
    };
  }

  // ---- Comparison ----

  addBonusToComparison(bonusId) {
    const bonuses = this._getFromStorage('bonuses', []);
    const bonus = bonuses.find(function (b) {
      return b.id === bonusId;
    });
    if (!bonus) {
      const comparisonExisting = this._getOrCreateComparisonStore();
      return {
        success: false,
        comparison_count: comparisonExisting.length,
        message: 'Bonus not found'
      };
    }

    const comparison = this._getOrCreateComparisonStore();
    const already = comparison.some(function (cb) {
      return cb.bonus_id === bonusId;
    });
    if (!already) {
      comparison.push({
        id: this._generateId('cmp'),
        bonus_id: bonusId,
        added_at: new Date().toISOString()
      });
      this._saveToStorage('comparison_bonuses', comparison);
    }

    return {
      success: true,
      comparison_count: comparison.length,
      message: already ? 'Already in comparison' : 'Added to comparison'
    };
  }

  removeBonusFromComparison(bonusId) {
    const comparison = this._getOrCreateComparisonStore();
    const before = comparison.length;
    const updated = comparison.filter(function (cb) {
      return cb.bonus_id !== bonusId;
    });
    this._saveToStorage('comparison_bonuses', updated);
    const removed = updated.length < before;
    return {
      success: removed,
      comparison_count: updated.length,
      message: removed ? 'Removed from comparison' : 'Bonus was not in comparison'
    };
  }

  clearComparisonList() {
    this._saveToStorage('comparison_bonuses', []);
    return {
      success: true,
      comparison_count: 0,
      message: 'Comparison list cleared'
    };
  }

  getComparisonBonuses() {
    const comparison = this._getOrCreateComparisonStore();
    const bonuses = this._getFromStorage('bonuses', []);
    const casinoBrands = this._getFromStorage('casino_brands', []);

    const items = comparison.map((entry) => {
      const bonus = bonuses.find(function (b) {
        return b.id === entry.bonus_id;
      });
      if (!bonus) {
        return null;
      }
      const brand = casinoBrands.find(function (c) {
        return c.id === bonus.casino_brand_id;
      }) || {};
      return {
        bonus_id: bonus.id,
        name: bonus.name,
        short_title: bonus.short_title || '',
        casino_brand_name: brand.name || '',
        bonus_type: bonus.bonus_type,
        boost_percentage: typeof bonus.boost_percentage === 'number' ? bonus.boost_percentage : null,
        min_odds: typeof bonus.min_odds === 'number' ? bonus.min_odds : null,
        bonus_percentage: typeof bonus.bonus_percentage === 'number' ? bonus.bonus_percentage : null,
        max_bonus_amount: typeof bonus.max_bonus_amount === 'number' ? bonus.max_bonus_amount : null,
        min_deposit_amount: typeof bonus.min_deposit_amount === 'number' ? bonus.min_deposit_amount : null,
        wagering_requirement_multiplier: typeof bonus.wagering_requirement_multiplier === 'number'
          ? bonus.wagering_requirement_multiplier
          : null,
        cashback_percentage: typeof bonus.cashback_percentage === 'number' ? bonus.cashback_percentage : null,
        max_cashback_amount: typeof bonus.max_cashback_amount === 'number' ? bonus.max_cashback_amount : null,
        device_compatibility: bonus.device_compatibility || null,
        expiration_date: bonus.expiration_date || null,
        bonus: this._resolveBonusForeignKeys(bonus)
      };
    }).filter(function (x) {
      return x !== null;
    });

    const highlighted_fields = ['min_odds', 'boost_percentage'];

    return {
      items: items,
      highlighted_fields: highlighted_fields
    };
  }

  // ---- Bonus notes ----

  saveBonusNote(bonusId, content) {
    const bonuses = this._getFromStorage('bonuses', []);
    const bonus = bonuses.find(function (b) {
      return b.id === bonusId;
    });
    const notes = this._getFromStorage('bonus_notes', []);
    if (!bonus) {
      return {
        success: false,
        note_id: null,
        updated_at: null,
        message: 'Bonus not found'
      };
    }
    const nowIso = new Date().toISOString();
    let note = notes.find(function (n) {
      return n.bonus_id === bonusId;
    });
    if (note) {
      note.content = content;
      note.updated_at = nowIso;
    } else {
      note = {
        id: this._generateId('note'),
        bonus_id: bonusId,
        content: content,
        created_at: nowIso,
        updated_at: nowIso
      };
      notes.push(note);
    }
    this._saveToStorage('bonus_notes', notes);
    return {
      success: true,
      note_id: note.id,
      updated_at: note.updated_at,
      message: 'Note saved'
    };
  }

  deleteBonusNote(bonusId) {
    const notes = this._getFromStorage('bonus_notes', []);
    const before = notes.length;
    const updated = notes.filter(function (n) {
      return n.bonus_id !== bonusId;
    });
    this._saveToStorage('bonus_notes', updated);
    const removed = updated.length < before;
    return {
      success: removed,
      message: removed ? 'Note deleted' : 'No note found for this bonus'
    };
  }

  // ---- Tournaments ----

  getTournamentFilterOptions() {
    const tournaments = this._getFromStorage('tournaments', []);

    const gameTypeSet = new Set();
    const statusSet = new Set();
    let prizeMin = null;
    let prizeMax = null;

    tournaments.forEach(function (t) {
      if (t.game_type) {
        gameTypeSet.add(t.game_type);
      }
      if (t.status) {
        statusSet.add(t.status);
      }
      if (typeof t.prize_pool_amount === 'number') {
        const v = t.prize_pool_amount;
        if (prizeMin === null || v < prizeMin) {
          prizeMin = v;
        }
        if (prizeMax === null || v > prizeMax) {
          prizeMax = v;
        }
      }
    });

    function setToOptions(set) {
      const arr = Array.from(set);
      arr.sort();
      return arr.map(function (value) {
        return {
          value: value,
          label: value ? value.split('_').map(function (p) {
            return p.charAt(0).toUpperCase() + p.slice(1);
          }).join(' ') : ''
        };
      });
    }

    const game_types = setToOptions(gameTypeSet);
    const status_options = setToOptions(statusSet);
    const prize_pool_range = {
      min: prizeMin !== null ? prizeMin : 0,
      max: prizeMax !== null ? prizeMax : 0,
      step: 50
    };

    const start_date_presets = [
      { value: 'next_7_days', label: 'Next 7 days' },
      { value: 'this_weekend', label: 'This weekend' }
    ];

    const sort_options = [
      { value: 'start_date_asc', label: 'Start Date - Soonest First' },
      { value: 'prize_pool_desc', label: 'Prize Pool - High to Low' },
      { value: 'prize_pool_asc', label: 'Prize Pool - Low to High' }
    ];

    return {
      game_types: game_types,
      start_date_presets: start_date_presets,
      prize_pool_range: prize_pool_range,
      status_options: status_options,
      sort_options: sort_options
    };
  }

  listTournaments(filters, sort, page, pageSize) {
    const tournaments = this._getFromStorage('tournaments', []);
    const casinoBrands = this._getFromStorage('casino_brands', []);
    const reminders = this._getOrCreateReminderStore();

    const f = filters || {};
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    let items = tournaments.filter(function (t) {
      if (f.game_types && f.game_types.length > 0) {
        if (!t.game_type || f.game_types.indexOf(t.game_type) === -1) {
          return false;
        }
      }
      if (f.start_date_preset) {
        const d = t.start_date ? new Date(t.start_date) : null;
        if (!d || isNaN(d.getTime())) {
          return false;
        }
        const now = Date.now();
        if (f.start_date_preset === 'next_7_days') {
          const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
          if (d.getTime() < now || d.getTime() > sevenDays) {
            return false;
          }
        }
      }
      if (f.start_date_from) {
        const from = new Date(f.start_date_from);
        const d = t.start_date ? new Date(t.start_date) : null;
        if (!d || isNaN(d.getTime()) || d < from) {
          return false;
        }
      }
      if (f.start_date_to) {
        const to = new Date(f.start_date_to);
        const d = t.start_date ? new Date(t.start_date) : null;
        if (!d || isNaN(d.getTime()) || d > to) {
          return false;
        }
      }
      if (typeof f.prize_pool_min === 'number') {
        if (typeof t.prize_pool_amount !== 'number' || t.prize_pool_amount < f.prize_pool_min) {
          return false;
        }
      }
      if (f.status && f.status.length > 0) {
        if (!t.status || f.status.indexOf(t.status) === -1) {
          return false;
        }
      }
      return true;
    });

    if (sort) {
      items.sort(function (a, b) {
        function num(x) {
          return typeof x === 'number' ? x : 0;
        }
        function dateVal(x) {
          if (!x) {
            return null;
          }
          const d = new Date(x);
          return isNaN(d.getTime()) ? null : d.getTime();
        }
        if (sort === 'start_date_asc') {
          const ad = dateVal(a.start_date) || Number.MAX_SAFE_INTEGER;
          const bd = dateVal(b.start_date) || Number.MAX_SAFE_INTEGER;
          return ad - bd;
        }
        if (sort === 'prize_pool_desc') {
          return num(b.prize_pool_amount) - num(a.prize_pool_amount);
        }
        if (sort === 'prize_pool_asc') {
          return num(a.prize_pool_amount) - num(b.prize_pool_amount);
        }
        return 0;
      });
    }

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const paged = items.slice(startIndex, startIndex + effectivePageSize);

    const mapped = paged.map((t) => {
      const brand = casinoBrands.find(function (c) {
        return c.id === t.hosting_casino_id;
      }) || {};
      const hasReminder = reminders.some(function (r) {
        return r.tournament_id === t.id && r.status === 'active';
      });
      return {
        tournament_id: t.id,
        name: t.name,
        short_title: t.short_title || '',
        game_type: t.game_type,
        hosting_casino_name: brand.name || '',
        start_date: t.start_date || null,
        end_date: t.end_date || null,
        prize_pool_amount: typeof t.prize_pool_amount === 'number' ? t.prize_pool_amount : null,
        prize_pool_currency: t.prize_pool_currency || '',
        status: t.status || null,
        has_reminder: hasReminder,
        tournament: Object.assign({}, t, {
          hosting_casino: brand
        })
      };
    });

    return {
      items: mapped,
      page: effectivePage,
      pageSize: effectivePageSize,
      totalItems: totalItems,
      totalPages: totalPages
    };
  }

  getTournamentDetails(tournamentId) {
    const tournaments = this._getFromStorage('tournaments', []);
    const casinoBrands = this._getFromStorage('casino_brands', []);
    const reminders = this._getOrCreateReminderStore();

    const tournament = tournaments.find(function (t) {
      return t.id === tournamentId;
    }) || null;

    if (!tournament) {
      return {
        tournament: null,
        user_state: {
          has_reminder: false
        }
      };
    }

    const brand = casinoBrands.find(function (c) {
      return c.id === tournament.hosting_casino_id;
    }) || null;

    const hasReminder = reminders.some(function (r) {
      return r.tournament_id === tournament.id && r.status === 'active';
    });

    return {
      tournament: Object.assign({}, tournament, {
        hosting_casino: brand
      }),
      user_state: {
        has_reminder: hasReminder
      }
    };
  }

  setTournamentReminder(tournamentId, enabled) {
    const tournaments = this._getFromStorage('tournaments', []);
    const tournament = tournaments.find(function (t) {
      return t.id === tournamentId;
    });
    const reminders = this._getOrCreateReminderStore();

    if (!tournament) {
      return {
        success: false,
        status: 'cancelled',
        message: 'Tournament not found'
      };
    }

    const existing = reminders.find(function (r) {
      return r.tournament_id === tournamentId;
    });

    if (enabled) {
      if (existing) {
        existing.status = 'active';
      } else {
        reminders.push({
          id: this._generateId('rem'),
          tournament_id: tournamentId,
          created_at: new Date().toISOString(),
          status: 'active'
        });
      }
      this._saveToStorage('tournament_reminders', reminders);
      return {
        success: true,
        status: 'active',
        message: 'Reminder set'
      };
    }

    if (existing) {
      existing.status = 'cancelled';
      this._saveToStorage('tournament_reminders', reminders);
    }
    return {
      success: true,
      status: 'cancelled',
      message: 'Reminder cancelled'
    };
  }

  // ---- Search ----

  getSearchFilterOptions() {
    const bonuses = this._getFromStorage('bonuses', []);

    const categorySet = new Set();
    const cashbackPeriodSet = new Set();
    const deviceSet = new Set();
    const paymentSet = new Set();

    let maxBonusMin = null;
    let maxBonusMax = null;
    let maxCashbackMin = null;
    let maxCashbackMax = null;

    bonuses.forEach(function (b) {
      if (b.bonus_type) {
        categorySet.add(b.bonus_type);
      }
      if (b.cashback_period) {
        cashbackPeriodSet.add(b.cashback_period);
      }
      if (b.device_compatibility) {
        deviceSet.add(b.device_compatibility);
      }
      if (Array.isArray(b.payment_methods)) {
        b.payment_methods.forEach(function (pm) {
          if (pm) {
            paymentSet.add(pm);
          }
        });
      }
      if (typeof b.max_bonus_amount === 'number') {
        const v = b.max_bonus_amount;
        if (maxBonusMin === null || v < maxBonusMin) {
          maxBonusMin = v;
        }
        if (maxBonusMax === null || v > maxBonusMax) {
          maxBonusMax = v;
        }
      }
      if (typeof b.max_cashback_amount === 'number') {
        const v = b.max_cashback_amount;
        if (maxCashbackMin === null || v < maxCashbackMin) {
          maxCashbackMin = v;
        }
        if (maxCashbackMax === null || v > maxCashbackMax) {
          maxCashbackMax = v;
        }
      }
    });

    function setToOptions(set) {
      const arr = Array.from(set);
      arr.sort();
      return arr.map(function (value) {
        return {
          value: value,
          label: value ? value.split('_').map(function (p) {
            return p.charAt(0).toUpperCase() + p.slice(1);
          }).join(' ') : ''
        };
      });
    }

    const bonus_categories = setToOptions(categorySet);
    const cashback_period_options = setToOptions(cashbackPeriodSet);
    const device_compatibility_options = setToOptions(deviceSet);
    const payment_method_options = setToOptions(paymentSet);

    const max_bonus_amount_range = {
      min: maxBonusMin !== null ? maxBonusMin : 0,
      max: maxBonusMax !== null ? maxBonusMax : 0,
      step: 5
    };
    const max_cashback_amount_range = {
      min: maxCashbackMin !== null ? maxCashbackMin : 0,
      max: maxCashbackMax !== null ? maxCashbackMax : 0,
      step: 5
    };

    const sort_options = [
      { value: 'cashback_percentage_desc', label: 'Cashback % - High to Low' },
      { value: 'max_bonus_amount_desc', label: 'Max Bonus Amount - High to Low' },
      { value: 'bonus_percentage_desc', label: 'Bonus % - High to Low' },
      { value: 'expiration_date_asc', label: 'Expiration Date - Soonest First' }
    ];

    return {
      bonus_categories: bonus_categories,
      cashback_period_options: cashback_period_options,
      device_compatibility_options: device_compatibility_options,
      payment_method_options: payment_method_options,
      max_bonus_amount_range: max_bonus_amount_range,
      max_cashback_amount_range: max_cashback_amount_range,
      sort_options: sort_options
    };
  }

  searchBonuses(query, filters, sort, page, pageSize) {
    const allBonuses = this._getFromStorage('bonuses', []);
    const casinoBrands = this._getFromStorage('casino_brands', []);
    const favorites = this._getOrCreateFavoritesStore();
    const plan = this._getOrCreatePlanStore();

    const f = filters || {};
    const q = (query || '').trim().toLowerCase();
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    // Instrumentation for task completion tracking (task_3: search parameters for cashback queries)
    try {
      if (typeof query === 'string' && query.toLowerCase().indexOf('cashback') !== -1) {
        localStorage.setItem(
          'task3_searchParams',
          JSON.stringify({
            query: query,
            filters: filters,
            sort: sort,
            page: page,
            pageSize: pageSize,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let items = allBonuses.filter(function (b) {
      if (!q) {
        return true;
      }
      const textParts = [
        b.name || '',
        b.short_title || '',
        b.description || ''
      ];
      const haystack = textParts.join(' ').toLowerCase();
      return haystack.indexOf(q) !== -1;
    });

    items = items.filter(function (b) {
      if (f.bonus_categories && f.bonus_categories.length > 0) {
        if (!b.bonus_type || f.bonus_categories.indexOf(b.bonus_type) === -1) {
          return false;
        }
      }
      if (f.cashback_periods && f.cashback_periods.length > 0) {
        if (!b.cashback_period || f.cashback_periods.indexOf(b.cashback_period) === -1) {
          return false;
        }
      }
      if (typeof f.max_cashback_amount_min === 'number') {
        if (typeof b.max_cashback_amount !== 'number' || b.max_cashback_amount < f.max_cashback_amount_min) {
          return false;
        }
      }
      if (typeof f.max_cashback_amount_max === 'number') {
        if (typeof b.max_cashback_amount !== 'number' || b.max_cashback_amount > f.max_cashback_amount_max) {
          return false;
        }
      }
      if (typeof f.max_bonus_amount_min === 'number') {
        if (typeof b.max_bonus_amount !== 'number' || b.max_bonus_amount < f.max_bonus_amount_min) {
          return false;
        }
      }
      if (typeof f.max_bonus_amount_max === 'number') {
        if (typeof b.max_bonus_amount !== 'number' || b.max_bonus_amount > f.max_bonus_amount_max) {
          return false;
        }
      }
      if (f.device_compatibility && f.device_compatibility.length > 0) {
        if (!b.device_compatibility || f.device_compatibility.indexOf(b.device_compatibility) === -1) {
          return false;
        }
      }
      if (f.payment_methods && f.payment_methods.length > 0) {
        const methods = Array.isArray(b.payment_methods) ? b.payment_methods : [];
        const ok = f.payment_methods.some(function (pm) {
          return methods.indexOf(pm) !== -1;
        });
        if (!ok) {
          return false;
        }
      }
      return true;
    });

    if (sort) {
      items.sort(function (a, b) {
        function num(x) {
          return typeof x === 'number' ? x : 0;
        }
        function dateVal(x) {
          if (!x) {
            return null;
          }
          const d = new Date(x);
          return isNaN(d.getTime()) ? null : d.getTime();
        }
        if (sort === 'cashback_percentage_desc') {
          return num(b.cashback_percentage) - num(a.cashback_percentage);
        }
        if (sort === 'max_bonus_amount_desc') {
          return num(b.max_bonus_amount) - num(a.max_bonus_amount);
        }
        if (sort === 'bonus_percentage_desc') {
          return num(b.bonus_percentage) - num(a.bonus_percentage);
        }
        if (sort === 'expiration_date_asc') {
          const ad = dateVal(a.expiration_date) || Number.MAX_SAFE_INTEGER;
          const bd = dateVal(b.expiration_date) || Number.MAX_SAFE_INTEGER;
          return ad - bd;
        }
        return 0;
      });
    }

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const paged = items.slice(startIndex, startIndex + effectivePageSize);

    const mapped = paged.map((b) => {
      const brand = casinoBrands.find(function (c) {
        return c.id === b.casino_brand_id;
      }) || {};
      const isFavorited = favorites.some(function (fb) {
        return fb.bonus_id === b.id;
      });
      const isInPlan = plan.some(function (pb) {
        return pb.bonus_id === b.id;
      });
      return {
        bonus_id: b.id,
        name: b.name,
        short_title: b.short_title || '',
        casino_brand_name: brand.name || '',
        bonus_type: b.bonus_type,
        bonus_percentage: typeof b.bonus_percentage === 'number' ? b.bonus_percentage : null,
        cashback_percentage: typeof b.cashback_percentage === 'number' ? b.cashback_percentage : null,
        cashback_period: b.cashback_period || null,
        max_cashback_amount: typeof b.max_cashback_amount === 'number' ? b.max_cashback_amount : null,
        max_bonus_amount: typeof b.max_bonus_amount === 'number' ? b.max_bonus_amount : null,
        device_compatibility: b.device_compatibility || null,
        payment_methods: Array.isArray(b.payment_methods) ? b.payment_methods : [],
        expiration_date: b.expiration_date || null,
        is_favorited: isFavorited,
        is_in_plan: isInPlan,
        bonus: this._resolveBonusForeignKeys(b)
      };
    });

    return {
      items: mapped,
      page: effectivePage,
      pageSize: effectivePageSize,
      totalItems: totalItems,
      totalPages: totalPages
    };
  }

  // ---- Newsletter ----

  subscribeToNewsletter(email, preferredBonusCategories, emailFrequency, platformPreference) {
    const subscriptions = this._getOrCreateNewsletterSubscription();
    const nowIso = new Date().toISOString();
    const prefs = Array.isArray(preferredBonusCategories) ? preferredBonusCategories : [];

    let sub = subscriptions.find(function (s) {
      return s.email === email;
    });

    if (sub) {
      sub.preferred_bonus_categories = prefs;
      sub.email_frequency = emailFrequency;
      sub.platform_preference = platformPreference || sub.platform_preference || 'no_preference';
      sub.status = 'subscribed';
      sub.updated_at = nowIso;
    } else {
      sub = {
        id: this._generateId('sub'),
        email: email,
        preferred_bonus_categories: prefs,
        email_frequency: emailFrequency,
        platform_preference: platformPreference || 'no_preference',
        status: 'subscribed',
        subscribed_at: nowIso,
        updated_at: nowIso
      };
      subscriptions.push(sub);
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription_id: sub.id,
      status: sub.status,
      message: 'Subscription saved'
    };
  }

  getNewsletterSettings() {
    const subscriptions = this._getOrCreateNewsletterSubscription();
    if (!subscriptions || subscriptions.length === 0) {
      return {
        is_subscribed: false,
        email: '',
        preferred_bonus_categories: [],
        email_frequency: 'weekly',
        platform_preference: 'no_preference'
      };
    }
    let active = null;
    for (let i = subscriptions.length - 1; i >= 0; i--) {
      if (subscriptions[i].status === 'subscribed') {
        active = subscriptions[i];
        break;
      }
    }
    if (!active) {
      active = subscriptions[subscriptions.length - 1];
    }
    return {
      is_subscribed: active.status === 'subscribed',
      email: active.email,
      preferred_bonus_categories: Array.isArray(active.preferred_bonus_categories)
        ? active.preferred_bonus_categories
        : [],
      email_frequency: active.email_frequency || 'weekly',
      platform_preference: active.platform_preference || 'no_preference'
    };
  }

  // ---- Contact & informational pages ----

  submitContactForm(name, email, subject, message, relatedBonusId) {
    const tickets = this._getFromStorage('contact_tickets', []);
    const ticket = {
      id: this._generateId('ticket'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      related_bonus_id: relatedBonusId || null,
      created_at: new Date().toISOString(),
      status: 'open'
    };
    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);
    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Your message has been submitted'
    };
  }

  getContactPageInfo() {
    const info = this._getFromStorage('contact_page_info', null);
    if (info && typeof info === 'object') {
      return {
        support_email: info.support_email || '',
        support_hours: info.support_hours || '',
        additional_contacts: Array.isArray(info.additional_contacts) ? info.additional_contacts : []
      };
    }
    return {
      support_email: '',
      support_hours: '',
      additional_contacts: []
    };
  }

  getInformationalPage(pageKey) {
    const pages = this._getFromStorage('informational_pages', {});
    const page = pages && pages[pageKey] ? pages[pageKey] : null;
    if (page) {
      return page;
    }
    return {
      title: '',
      sections: [],
      last_updated: null
    };
  }

  getFaqEntries() {
    const data = this._getFromStorage('faq_entries', null);
    if (data && Array.isArray(data.categories)) {
      return data;
    }
    return {
      categories: []
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