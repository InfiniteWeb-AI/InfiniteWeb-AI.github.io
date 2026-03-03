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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'plans',
      'addons',
      'channels',
      'plan_channels',
      'addon_channels',
      'subscriptions',
      'subscription_addons',
      'subscription_changes',
      'billing_settings',
      'promo_codes',
      'favorite_channels',
      'parental_controls',
      'programs',
      'recordings',
      'series',
      'episodes'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('auth_state')) {
      localStorage.setItem(
        'auth_state',
        JSON.stringify({ is_authenticated: false, email: null, has_active_subscription: false })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _getAuthState() {
    return this._getFromStorage('auth_state', {
      is_authenticated: false,
      email: null,
      has_active_subscription: false
    });
  }

  _setAuthState(state) {
    this._saveToStorage('auth_state', state);
  }

  _ensureAuthenticated() {
    const auth = this._getAuthState();
    if (!auth.is_authenticated) {
      throw new Error('User is not authenticated');
    }
    return auth;
  }

  // ----------------------
  // Domain helpers
  // ----------------------

  _getCurrentSubscription() {
    const subscriptions = this._getFromStorage('subscriptions', []);
    const current = subscriptions.find((s) => s.is_current);
    return current || null;
  }

  _getOrCreateSubscriptionChange() {
    const changes = this._getFromStorage('subscription_changes', []);
    let change = changes.find((c) => c.status === 'draft');
    if (!change) {
      change = {
        id: this._generateId('subchg'),
        change_type: 'combined',
        selected_plan_id: null,
        selected_billing_cycle: null,
        selected_addon_ids: [],
        removed_addon_ids: [],
        promo_code_code: null,
        effective_date_option: null,
        estimated_new_monthly_total: null,
        estimated_new_annual_total: null,
        status: 'draft',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      changes.push(change);
      this._saveToStorage('subscription_changes', changes);
    }
    return change;
  }

  _persistSubscriptionChange(change) {
    const changes = this._getFromStorage('subscription_changes', []);
    const idx = changes.findIndex((c) => c.id === change.id);
    if (idx === -1) {
      changes.push(change);
    } else {
      changes[idx] = change;
    }
    this._saveToStorage('subscription_changes', changes);
    return change;
  }

  _applyPromoToPlanPrices(baseMonthly, baseAnnual, promo) {
    let newMonthly = baseMonthly != null ? baseMonthly : null;
    let newAnnual = baseAnnual != null ? baseAnnual : null;

    if (promo) {
      const appliesMonthly =
        promo.applies_to_billing_cycle === 'monthly' ||
        promo.applies_to_billing_cycle === 'both';
      const appliesAnnual =
        promo.applies_to_billing_cycle === 'annual' ||
        promo.applies_to_billing_cycle === 'both';

      if (promo.discount_type === 'percentage') {
        const factor = 1 - promo.discount_value / 100;
        if (appliesMonthly && newMonthly != null) newMonthly = newMonthly * factor;
        if (appliesAnnual && newAnnual != null) newAnnual = newAnnual * factor;
      } else if (promo.discount_type === 'fixed_amount') {
        if (appliesMonthly && newMonthly != null) newMonthly = newMonthly - promo.discount_value;
        if (appliesAnnual && newAnnual != null) newAnnual = newAnnual - promo.discount_value;
      }
    }

    if (newMonthly != null && newMonthly < 0) newMonthly = 0;
    if (newAnnual != null && newAnnual < 0) newAnnual = 0;

    return { monthly: newMonthly, annual: newAnnual };
  }

  _getFavoriteChannels() {
    const favorites = this._getFromStorage('favorite_channels', []);
    const channels = this._getFromStorage('channels', []);
    return favorites.map((fav) => ({
      ...fav,
      channel: channels.find((c) => c.id === fav.channel_id) || null
    }));
  }

  _saveFavoriteChannelsOrder(channelOrder) {
    const favorites = this._getFromStorage('favorite_channels', []);
    const orderMap = new Map();
    channelOrder.forEach((channelId, index) => {
      orderMap.set(channelId, index);
    });
    favorites.forEach((fav) => {
      if (orderMap.has(fav.channel_id)) {
        fav.sort_order = orderMap.get(fav.channel_id);
      }
    });
    this._saveToStorage('favorite_channels', favorites);
  }

  _getTvGuideDataForDate(date, genre, startTime, endTime) {
    const programs = this._getFromStorage('programs', []);
    const channels = this._getFromStorage('channels', []);

    const toMinutes = (timeStr) => {
      if (!timeStr) return null;
      const parts = timeStr.split(':');
      if (parts.length < 2) return null;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return h * 60 + m;
    };

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    const filteredPrograms = programs.filter((p) => {
      if (!p.start_time) return false;
      if (p.start_time.slice(0, 10) !== date) return false;
      if (genre && p.genre !== genre) return false;

      if (startMinutes != null && endMinutes != null) {
        const timeLabel = p.start_time.slice(11, 16);
        const minutes = toMinutes(timeLabel);
        if (minutes == null || minutes < startMinutes || minutes > endMinutes) return false;
      }
      return true;
    });

    const channelsMap = {};
    const timeSlotMap = {};

    filteredPrograms.forEach((p) => {
      let channel = channels.find((c) => c.id === p.channel_id);
      // If channel metadata is missing, create a minimal placeholder so the guide still
      // exposes the program's channel in the grid (useful for test data with sports-only channels).
      if (!channel) {
        channel = {
          id: p.channel_id,
          name: p.title ? `${p.title} Channel` : p.channel_id,
          genre: p.genre || null,
          primary_language: null,
          rating: p.rating || null
        };
      }

      if (!channelsMap[channel.id]) {
        channelsMap[channel.id] = {
          channel,
          programs: []
        };
      }
      channelsMap[channel.id].programs.push(p);

      const startLabel = p.start_time.slice(11, 16);
      const endLabel = p.end_time ? p.end_time.slice(11, 16) : null;
      const key = startLabel + '|' + (endLabel || '');
      if (!timeSlotMap[key]) {
        timeSlotMap[key] = {
          start_time: startLabel,
          end_time: endLabel
        };
      }
    });

    const time_slots = Object.values(timeSlotMap).sort((a, b) => {
      if (a.start_time === b.start_time) return 0;
      return a.start_time < b.start_time ? -1 : 1;
    });

    Object.values(channelsMap).forEach((entry) => {
      entry.programs.sort((a, b) => {
        if (a.start_time === b.start_time) return 0;
        return a.start_time < b.start_time ? -1 : 1;
      });
    });

    return {
      date,
      time_slots,
      channels: Object.values(channelsMap)
    };
  }

  _scheduleRecordingForProgram(programId, keepDays) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId);
    if (!program) return null;

    const recording = {
      id: this._generateId('rec'),
      program_id: program.id,
      channel_id: program.channel_id,
      title: program.title,
      start_time: program.start_time,
      end_time: program.end_time,
      keep_days: keepDays,
      scheduled_at: this._nowIso(),
      status: 'scheduled',
      playback_url: null,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    const recordings = this._getFromStorage('recordings', []);
    recordings.push(recording);
    this._saveToStorage('recordings', recordings);

    return recording;
  }

  _loadParentalControlsSetting() {
    const settingsArr = this._getFromStorage('parental_controls', []);
    return settingsArr[0] || null;
  }

  _saveParentalControlsSetting(setting) {
    let settingsArr = this._getFromStorage('parental_controls', []);
    const now = this._nowIso();

    if (!setting.id) {
      setting.id = this._generateId('pc');
      setting.created_at = now;
    }
    setting.updated_at = now;

    if (settingsArr.length === 0) {
      settingsArr = [setting];
    } else {
      settingsArr[0] = setting;
    }

    this._saveToStorage('parental_controls', settingsArr);
    return setting;
  }

  _searchSeriesIndex(query, filters, sort) {
    const q = (query || '').trim().toLowerCase();
    const seriesArr = this._getFromStorage('series', []);

    let results = seriesArr.filter((s) => s.is_active);

    if (q) {
      results = results.filter((s) => {
        const inTitle = s.title && s.title.toLowerCase().includes(q);
        const inSynopsis = s.synopsis && s.synopsis.toLowerCase().includes(q);
        const inTags =
          Array.isArray(s.tags) && s.tags.some((t) => t && t.toLowerCase().includes(q));
        return inTitle || inSynopsis || inTags;
      });
    }

    if (filters) {
      if (filters.resolution) {
        results = results.filter((s) => s.resolution === filters.resolution);
      }
      if (filters.contentType) {
        results = results.filter((s) => s.content_type === filters.contentType);
      }
      if (filters.genre) {
        results = results.filter((s) => s.genre === filters.genre);
      }
      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        const tagSet = filters.tags.map((t) => (t || '').toLowerCase());
        results = results.filter((s) => {
          if (!Array.isArray(s.tags)) return false;
          const seriesTags = s.tags.map((t) => (t || '').toLowerCase());
          return tagSet.every((t) => seriesTags.includes(t));
        });
      }
    }

    if (sort === 'most_popular' || sort === 'top_results') {
      results.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort === 'title_az') {
      results.sort((a, b) => {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at === bt) return 0;
        return at < bt ? -1 : 1;
      });
    }

    return results;
  }

  _recalculateSubscriptionChangeTotals(change) {
    const plans = this._getFromStorage('plans', []);
    const addons = this._getFromStorage('addons', []);
    const promos = this._getFromStorage('promo_codes', []);
    const subscription = this._getCurrentSubscription();

    const planId = change.selected_plan_id || (subscription ? subscription.current_plan_id : null);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      change.estimated_new_monthly_total = null;
      change.estimated_new_annual_total = null;
      change.updated_at = this._nowIso();
      return this._persistSubscriptionChange(change);
    }

    const billingCycle =
      change.selected_billing_cycle || (subscription ? subscription.billing_cycle : 'monthly');

    let selectedAddonIds = Array.isArray(change.selected_addon_ids)
      ? change.selected_addon_ids.slice()
      : [];

    // Do not automatically include existing subscription add-ons when calculating draft totals.
    // Only add-ons explicitly selected in the draft should affect pricing estimates.

    const selectedAddons = selectedAddonIds
      .map((id) => addons.find((a) => a.id === id))
      .filter((a) => !!a);

    const addonsMonthly = selectedAddons.reduce(
      (sum, a) => sum + (a.monthly_price || 0),
      0
    );

    const baseMonthlyTotal = (plan.monthly_price || 0) + addonsMonthly;
    const baseAnnualTotal = (plan.annual_price || 0) + addonsMonthly * 12;

    let promo = null;
    if (change.promo_code_code) {
      const candidate = promos.find((p) => p.code === change.promo_code_code && p.is_active);
      if (candidate) {
        let valid = true;
        const now = new Date();
        if (candidate.valid_from) {
          const from = new Date(candidate.valid_from);
          if (now < from) valid = false;
        }
        if (candidate.valid_to) {
          const to = new Date(candidate.valid_to);
          if (now > to) valid = false;
        }
        if (
          candidate.applicable_plan_ids &&
          Array.isArray(candidate.applicable_plan_ids) &&
          candidate.applicable_plan_ids.length > 0 &&
          !candidate.applicable_plan_ids.includes(plan.id)
        ) {
          valid = false;
        }
        if (valid) {
          promo = candidate;
        }
      }
    }

    const discounted = this._applyPromoToPlanPrices(baseMonthlyTotal, baseAnnualTotal, promo);

    change.estimated_new_monthly_total = discounted.monthly;
    change.estimated_new_annual_total = discounted.annual;
    change.updated_at = this._nowIso();

    return this._persistSubscriptionChange(change);
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // signInUser(email, password)
  signInUser(email, password) {
    const validEmail = 'parent@example.com';
    const validPassword = 'Parent123!';

    if (email === validEmail && password === validPassword) {
      const subscriptions = this._getFromStorage('subscriptions', []);
      const hasActiveSubscription = subscriptions.some(
        (s) => s.is_current && (s.status === 'active' || s.status === 'trial')
      );

      this._setAuthState({
        is_authenticated: true,
        email: email,
        has_active_subscription: hasActiveSubscription
      });

      return {
        success: true,
        message: 'Signed in successfully',
        is_authenticated: true,
        has_active_subscription: hasActiveSubscription
      };
    }

    this._setAuthState({
      is_authenticated: false,
      email: null,
      has_active_subscription: false
    });

    return {
      success: false,
      message: 'Invalid email or password',
      is_authenticated: false,
      has_active_subscription: false
    };
  }

  // getHomePageContent()
  getHomePageContent() {
    const plans = this._getFromStorage('plans', []);
    const seriesArr = this._getFromStorage('series', []);
    const auth = this._getAuthState();

    const topPlans = plans
      .filter((p) => p.status === 'active' && p.monthly_price < 20)
      .sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));

    const featuredSeries = seriesArr
      .filter((s) => s.is_active)
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

    return {
      hero_title: 'Unlimited IPTV Streaming',
      hero_subtitle: 'Stream live TV, sports, movies and more on all your devices.',
      feature_highlights: [
        {
          title: '100+ Channels',
          description: 'Enjoy news, sports, movies, kids and international channels.'
        },
        {
          title: 'Watch Anywhere',
          description: 'Smart TVs, mobile, tablets, and browsers supported.'
        }
      ],
      top_plans_under_20: topPlans,
      featured_series: featuredSeries,
      is_authenticated: auth.is_authenticated,
      has_active_subscription: auth.has_active_subscription
    };
  }

  // getDashboardOverview()
  getDashboardOverview() {
    this._ensureAuthenticated();

    const subscription = this._getCurrentSubscription();
    const plans = this._getFromStorage('plans', []);
    const addons = this._getFromStorage('addons', []);
    const favorites = this._getFromStorage('favorite_channels', []);
    const recordings = this._getFromStorage('recordings', []);
    const channels = this._getFromStorage('channels', []);

    let currentPlan = null;
    let activeAddons = [];
    let simLimit = null;
    let totalMonthly = null;
    let totalAnnual = null;

    if (subscription) {
      currentPlan = plans.find((p) => p.id === subscription.current_plan_id) || null;
      const subAddons = this._getFromStorage('subscription_addons', []).filter(
        (sa) => sa.subscription_id === subscription.id && sa.is_active
      );
      activeAddons = subAddons
        .map((sa) => addons.find((a) => a.id === sa.addon_id) || null)
        .filter((a) => !!a);

      simLimit =
        subscription.simultaneous_streams_limit != null
          ? subscription.simultaneous_streams_limit
          : currentPlan
          ? currentPlan.max_simultaneous_streams
          : null;

      if (subscription.total_monthly_price != null) {
        totalMonthly = subscription.total_monthly_price;
      } else if (currentPlan) {
        totalMonthly =
          (currentPlan.monthly_price || 0) +
          activeAddons.reduce((sum, a) => sum + (a.monthly_price || 0), 0);
      }

      if (subscription.total_annual_price != null) {
        totalAnnual = subscription.total_annual_price;
      } else if (currentPlan) {
        totalAnnual =
          (currentPlan.annual_price || 0) +
          activeAddons.reduce((sum, a) => sum + (a.monthly_price || 0) * 12, 0);
      }
    }

    const now = new Date();
    const scheduledRecordings = recordings.filter((r) => r.status === 'scheduled');
    const upcomingRecordings = recordings.filter((r) => {
      const start = r.start_time ? new Date(r.start_time) : null;
      return (
        (r.status === 'scheduled' || r.status === 'recording') &&
        start &&
        start > now
      );
    });

    const upcomingRecordsEnriched = upcomingRecordings.map((r) => {
      const channel = channels.find((c) => c.id === r.channel_id);
      return {
        recording: r,
        channel_name: channel ? channel.name : null
      };
    });

    return {
      subscription_summary: {
        current_plan: currentPlan,
        subscription: subscription,
        active_addons: activeAddons,
        simultaneous_streams_limit: simLimit,
        total_monthly_price: totalMonthly,
        total_annual_price: totalAnnual
      },
      usage_indicators: {
        favorite_channels_count: favorites.length,
        scheduled_recordings_count: scheduledRecordings.length,
        upcoming_recordings_count: upcomingRecordings.length
      },
      upcoming_recordings: upcomingRecordsEnriched
    };
  }

  // getPlanFilterOptions()
  getPlanFilterOptions() {
    const plans = this._getFromStorage('plans', []);
    const prices = plans.map((p) => p.monthly_price || 0);
    const min = prices.length ? Math.min.apply(null, prices) : 0;
    const max = prices.length ? Math.max.apply(null, prices) : 0;

    return {
      max_monthly_price_range: {
        min,
        max,
        step: 1
      },
      channel_count_options: [
        { id: 'ch_50_plus', label: '50+ channels', min_channels: 50 },
        { id: 'ch_100_plus', label: '100+ channels', min_channels: 100 },
        { id: 'ch_150_plus', label: '150+ channels', min_channels: 150 }
      ],
      billing_cycles: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'annual', label: 'Annual' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'channels_high_to_low', label: 'Channels: High to Low' },
        { value: 'recommended', label: 'Recommended' }
      ]
    };
  }

  // getPlansForListing(filters, sort, context)
  getPlansForListing(filters, sort, context) {
    const plans = this._getFromStorage('plans', []);
    const subscription = this._getCurrentSubscription();

    const appliedFilters = {
      maxMonthlyPrice: filters && typeof filters.maxMonthlyPrice === 'number'
        ? filters.maxMonthlyPrice
        : null,
      minChannelCount: filters && typeof filters.minChannelCount === 'number'
        ? filters.minChannelCount
        : null,
      billingCycle: filters && filters.billingCycle ? filters.billingCycle : null
    };

    let list = plans.slice();

    if (filters) {
      if (filters.onlyActive) {
        list = list.filter((p) => p.status === 'active');
      }
      if (typeof filters.maxMonthlyPrice === 'number') {
        list = list.filter((p) => (p.monthly_price || 0) <= filters.maxMonthlyPrice);
      }
      if (typeof filters.minChannelCount === 'number') {
        list = list.filter((p) => (p.channel_count || 0) >= filters.minChannelCount);
      }
      if (filters.billingCycle) {
        list = list.filter((p) =>
          Array.isArray(p.billing_cycles_available) &&
          p.billing_cycles_available.includes(filters.billingCycle)
        );
      }
    }

    if (sort === 'price_low_to_high') {
      list.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
    } else if (sort === 'price_high_to_low') {
      list.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
    } else if (sort === 'channels_high_to_low') {
      list.sort((a, b) => (b.channel_count || 0) - (a.channel_count || 0));
    } else if (sort === 'recommended') {
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return {
      plans: list,
      current_plan_id: subscription ? subscription.current_plan_id : null,
      applied_filters: appliedFilters
    };
  }

  // startPlanChange(planId, billingCycle, changeContext)
  startPlanChange(planId, billingCycle, changeContext) {
    // Authentication is not strictly required to start a draft subscription change.
    // The user will be required to authenticate later when confirming the change.

    const plans = this._getFromStorage('plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return {
        success: false,
        message: 'Selected plan not found',
        subscription_change: null
      };
    }

    if (
      !Array.isArray(plan.billing_cycles_available) ||
      !plan.billing_cycles_available.includes(billingCycle)
    ) {
      return {
        success: false,
        message: 'Selected billing cycle is not available for this plan',
        subscription_change: null
      };
    }

    // Instrumentation for task completion tracking (task_1: selectedPlanId)
    try {
      if (
        plan &&
        typeof plan.monthly_price === 'number' &&
        plan.monthly_price < 20 &&
        typeof plan.channel_count === 'number' &&
        plan.channel_count >= 100 &&
        billingCycle === 'annual'
      ) {
        localStorage.setItem('task1_selectedPlanId', planId);
      }
    } catch (e) {
      // Ignore instrumentation errors
    }

    let change = this._getOrCreateSubscriptionChange();
    change.change_type = 'plan_change';
    change.selected_plan_id = planId;
    change.selected_billing_cycle = billingCycle;
    change.updated_at = this._nowIso();

    change = this._recalculateSubscriptionChangeTotals(change);

    return {
      success: true,
      message: 'Plan selection updated',
      subscription_change: change
    };
  }

  // comparePlans(planIds)
  comparePlans(planIds) {
    const plans = this._getFromStorage('plans', []);

    // Instrumentation for task completion tracking (task_5: comparedPlanIds)
    try {
      if (
        Array.isArray(planIds) &&
        planIds.length >= 2 &&
        !localStorage.getItem('task5_comparedPlanIds')
      ) {
        const candidatePlans = planIds.map((id) => plans.find((p) => p.id === id));
        const allEligible = candidatePlans.every(
          (p) =>
            p &&
            p.status === 'active' &&
            typeof p.monthly_price === 'number' &&
            p.monthly_price <= 30
        );
        if (allEligible) {
          localStorage.setItem('task5_comparedPlanIds', JSON.stringify(planIds));
        }
      }
    } catch (e) {
      // Ignore instrumentation errors
    }

    return planIds
      .map((id) => plans.find((p) => p.id === id) || null)
      .filter((p) => !!p);
  }

  // getMyPlanSummary()
  getMyPlanSummary() {
    this._ensureAuthenticated();

    const subscription = this._getCurrentSubscription();
    const plans = this._getFromStorage('plans', []);
    const channels = this._getFromStorage('channels', []);
    const planChannels = this._getFromStorage('plan_channels', []);
    const addons = this._getFromStorage('addons', []);
    const subscriptionAddons = this._getFromStorage('subscription_addons', []);
    const changes = this._getFromStorage('subscription_changes', []);

    const currentPlan = subscription
      ? plans.find((p) => p.id === subscription.current_plan_id) || null
      : null;

    const includedChannels = currentPlan
      ? planChannels
          .filter((pc) => pc.plan_id === currentPlan.id)
          .map((pc) => channels.find((c) => c.id === pc.channel_id) || null)
          .filter((c) => !!c)
      : [];

    const activeAddons = subscription
      ? subscriptionAddons
          .filter((sa) => sa.subscription_id === subscription.id && sa.is_active)
          .map((sa) => addons.find((a) => a.id === sa.addon_id) || null)
          .filter((a) => !!a)
      : [];

    const pendingChange = changes.find((c) => c.status === 'draft');

    const pricing_summary = {
      current_monthly_total: subscription ? subscription.total_monthly_price : null,
      current_annual_total: subscription ? subscription.total_annual_price : null,
      pending_new_monthly_total: pendingChange
        ? pendingChange.estimated_new_monthly_total
        : null,
      pending_new_annual_total: pendingChange
        ? pendingChange.estimated_new_annual_total
        : null
    };

    return {
      current_subscription: subscription,
      current_plan: currentPlan,
      included_channels: includedChannels,
      active_addons: activeAddons,
      pending_subscription_change: {
        exists: !!pendingChange,
        change: pendingChange || null
      },
      pricing_summary: pricing_summary
    };
  }

  // getAddonFilterOptions()
  getAddonFilterOptions() {
    const addons = this._getFromStorage('addons', []);
    const categoryMap = {};

    addons.forEach((a) => {
      if (!categoryMap[a.category]) {
        categoryMap[a.category] = 0;
      }
      categoryMap[a.category] += 1;
    });

    const categories = Object.keys(categoryMap).map((key) => ({
      value: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      addon_count: categoryMap[key]
    }));

    const prices = addons.map((a) => a.monthly_price || 0);
    const min = prices.length ? Math.min.apply(null, prices) : 0;
    const max = prices.length ? Math.max.apply(null, prices) : 0;

    return {
      categories,
      max_monthly_price_range: {
        min,
        max,
        step: 1
      },
      quality_filters: {
        has_hd_channels_label: 'HD channels',
        has_4k_channels_label: '4K channels'
      }
    };
  }

  // getAddonsForListing(category, filters, sort)
  getAddonsForListing(category, filters, sort) {
    const addons = this._getFromStorage('addons', []);
    const subscription = this._getCurrentSubscription();
    const subscriptionAddons = this._getFromStorage('subscription_addons', []);

    let list = addons.slice();

    if (category) {
      list = list.filter((a) => a.category === category);
    }

    if (filters) {
      if (filters.onlyActive) {
        list = list.filter((a) => a.status === 'active');
      }
      if (typeof filters.maxMonthlyPrice === 'number') {
        list = list.filter((a) => (a.monthly_price || 0) <= filters.maxMonthlyPrice);
      }
      if (filters.hasHdChannels) {
        list = list.filter((a) => a.has_hd_channels);
      }
      if (filters.has4kChannels) {
        list = list.filter((a) => a.has_4k_channels);
      }
      if (filters.onlyAvailableToAdd && subscription) {
        const existingAddonIds = subscriptionAddons
          .filter((sa) => sa.subscription_id === subscription.id && sa.is_active)
          .map((sa) => sa.addon_id);
        list = list.filter((a) => !existingAddonIds.includes(a.id));
      }
    }

    if (sort === 'price_low_to_high') {
      list.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
    } else if (sort === 'price_high_to_low') {
      list.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
    } else if (sort === 'recommended') {
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    const alreadyIncludedAddonIds = subscription
      ? subscriptionAddons
          .filter((sa) => sa.subscription_id === subscription.id && sa.is_active)
          .map((sa) => sa.addon_id)
      : [];

    return {
      addons: list,
      already_included_addon_ids: alreadyIncludedAddonIds,
      applied_filters: {
        maxMonthlyPrice: filters && typeof filters.maxMonthlyPrice === 'number'
          ? filters.maxMonthlyPrice
          : null,
        hasHdChannels: filters ? !!filters.hasHdChannels : false,
        has4kChannels: filters ? !!filters.has4kChannels : false
      }
    };
  }

  // getAddonDetail(addonId)
  getAddonDetail(addonId) {
    const addons = this._getFromStorage('addons', []);
    const addonChannels = this._getFromStorage('addon_channels', []);
    const channels = this._getFromStorage('channels', []);
    const subscription = this._getCurrentSubscription();
    const subscriptionAddons = this._getFromStorage('subscription_addons', []);

    const addon = addons.find((a) => a.id === addonId) || null;

    const includedChannels = addon
      ? addonChannels
          .filter((ac) => ac.addon_id === addon.id)
          .map((ac) => channels.find((c) => c.id === ac.channel_id) || null)
          .filter((c) => !!c)
      : [];

    let isAlreadyInPlan = false;
    if (subscription && addon) {
      isAlreadyInPlan = subscriptionAddons.some(
        (sa) => sa.subscription_id === subscription.id && sa.addon_id === addon.id && sa.is_active
      );
    }

    return {
      addon,
      included_channels: includedChannels,
      is_already_in_plan: isAlreadyInPlan
    };
  }

  // addAddonToDraftSubscription(addonId)
  addAddonToDraftSubscription(addonId) {
    try {
      this._ensureAuthenticated();
    } catch (e) {
      return {
        success: false,
        message: e.message,
        subscription_change: null
      };
    }

    const addons = this._getFromStorage('addons', []);
    const addon = addons.find((a) => a.id === addonId && a.status === 'active');
    if (!addon) {
      return {
        success: false,
        message: 'Add-on not found or inactive',
        subscription_change: null
      };
    }

    let change = this._getOrCreateSubscriptionChange();
    change.change_type = 'addon_change';
    if (!Array.isArray(change.selected_addon_ids)) {
      change.selected_addon_ids = [];
    }

    const idx = change.selected_addon_ids.indexOf(addonId);
    if (idx === -1) {
      change.selected_addon_ids.push(addonId);
    } else {
      change.selected_addon_ids.splice(idx, 1);
    }

    change.updated_at = this._nowIso();
    change = this._recalculateSubscriptionChangeTotals(change);

    return {
      success: true,
      message: 'Add-on selection updated',
      subscription_change: change
    };
  }

  // getChannelFilterOptions()
  getChannelFilterOptions() {
    const channels = this._getFromStorage('channels', []);

    const genreSet = new Set();
    channels.forEach((c) => {
      if (c.genre) genreSet.add(c.genre);
    });

    const languageSet = new Set();
    channels.forEach((c) => {
      if (c.primary_language) languageSet.add(c.primary_language);
    });

    const genres = Array.from(genreSet).map((g) => ({
      value: g,
      label: g.charAt(0).toUpperCase() + g.slice(1)
    }));

    const languages = Array.from(languageSet).map((code) => ({
      code,
      label: code
    }));

    const ratingValues = [
      'all_ages',
      'tv_y',
      'tv_y7',
      'tv_g',
      'tv_pg',
      'tv_14',
      'tv_ma'
    ];

    const ratings = ratingValues.map((value) => ({
      value,
      label: value.toUpperCase()
    }));

    return {
      genres,
      languages,
      ratings,
      sort_options: [
        { value: 'name_az', label: 'Name A-Z' },
        { value: 'number_ascending', label: 'Channel Number' },
        { value: 'popular', label: 'Popular' }
      ]
    };
  }

  // getChannelsForListing(filters, sort)
  getChannelsForListing(filters, sort) {
    const channels = this._getFromStorage('channels', []);
    const favoriteEntries = this._getFromStorage('favorite_channels', []);

    let list = channels.slice();

    const applied_filters = {
      genre: filters && filters.genre ? filters.genre : null,
      language: filters && filters.language ? filters.language : null,
      rating: filters && filters.rating ? filters.rating : null
    };

    if (filters) {
      if (filters.genre) {
        list = list.filter((c) => c.genre === filters.genre);
      }
      if (filters.language) {
        list = list.filter((c) => c.primary_language === filters.language);
      }
      if (filters.rating) {
        list = list.filter((c) => c.rating === filters.rating);
      }
      if (filters.isHd != null) {
        list = list.filter((c) => c.is_hd === !!filters.isHd);
      }
      if (filters.is4k != null) {
        list = list.filter((c) => !!c.is_4k === !!filters.is4k);
      }
    }

    if (sort === 'name_az') {
      list.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an === bn) return 0;
        return an < bn ? -1 : 1;
      });
    } else if (sort === 'number_ascending') {
      list.sort((a, b) => (a.channel_number || 0) - (b.channel_number || 0));
    } else if (sort === 'popular') {
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    const favorite_channel_ids = favoriteEntries.map((f) => f.channel_id);

    return {
      channels: list,
      favorite_channel_ids,
      applied_filters
    };
  }

  // getChannelDetailWithSchedule(channelId)
  getChannelDetailWithSchedule(channelId) {
    const channels = this._getFromStorage('channels', []);
    const programs = this._getFromStorage('programs', []);
    const favorites = this._getFromStorage('favorite_channels', []);

    const channel = channels.find((c) => c.id === channelId) || null;

    const now = new Date();
    const upcoming_programs = programs
      .filter((p) => p.channel_id === channelId)
      .filter((p) => {
        const start = new Date(p.start_time);
        return start >= now;
      })
      .sort((a, b) => {
        if (a.start_time === b.start_time) return 0;
        return a.start_time < b.start_time ? -1 : 1;
      })
      .slice(0, 20);

    const is_favorite = favorites.some((f) => f.channel_id === channelId);

    return {
      channel,
      is_favorite,
      upcoming_programs
    };
  }

  // addChannelToFavorites(channelId)
  addChannelToFavorites(channelId) {
    const channels = this._getFromStorage('channels', []);
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) {
      return {
        success: false,
        message: 'Channel not found',
        total_favorites_count: this._getFromStorage('favorite_channels', []).length
      };
    }

    const favorites = this._getFromStorage('favorite_channels', []);
    const existing = favorites.find((f) => f.channel_id === channelId);
    if (existing) {
      return {
        success: true,
        message: 'Channel already in favorites',
        total_favorites_count: favorites.length
      };
    }

    const sortOrder = favorites.length;
    favorites.push({
      id: this._generateId('fav'),
      channel_id: channelId,
      sort_order: sortOrder,
      created_at: this._nowIso()
    });

    this._saveToStorage('favorite_channels', favorites);

    return {
      success: true,
      message: 'Channel added to favorites',
      total_favorites_count: favorites.length
    };
  }

  // removeChannelFromFavorites(channelId)
  removeChannelFromFavorites(channelId) {
    let favorites = this._getFromStorage('favorite_channels', []);
    const beforeCount = favorites.length;
    favorites = favorites.filter((f) => f.channel_id !== channelId);
    this._saveToStorage('favorite_channels', favorites);

    return {
      success: true,
      message: beforeCount === favorites.length ? 'Channel not in favorites' : 'Channel removed from favorites',
      total_favorites_count: favorites.length
    };
  }

  // reorderFavoriteChannels(channelOrder)
  reorderFavoriteChannels(channelOrder) {
    this._saveFavoriteChannelsOrder(channelOrder);
    return {
      success: true,
      message: 'Favorites reordered'
    };
  }

  // getFavoriteChannelsList()
  getFavoriteChannelsList() {
    const favorites = this._getFromStorage('favorite_channels', []);
    const channels = this._getFromStorage('channels', []);

    const list = favorites
      .map((fav) => {
        const channel = channels.find((c) => c.id === fav.channel_id) || null;
        return {
          favorite_id: fav.id,
          channel_id: fav.channel_id,
          channel_name: channel ? channel.name : null,
          channel_logo_url: channel ? channel.logo_url : null,
          genre: channel ? channel.genre : null,
          primary_language: channel ? channel.primary_language : null,
          rating: channel ? channel.rating : null,
          is_hd: channel ? !!channel.is_hd : false,
          is_4k: channel ? !!channel.is_4k : false,
          channel_number: channel ? channel.channel_number : null,
          sort_order: fav.sort_order != null ? fav.sort_order : 0
        };
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Instrumentation for task completion tracking (task_3: favoritesListViewed)
    try {
      localStorage.setItem('task3_favoritesListViewed', 'true');
    } catch (e) {
      // Ignore instrumentation errors
    }

    return {
      favorites: list
    };
  }

  // getTvGuideGrid(date, genre, startTime, endTime)
  getTvGuideGrid(date, genre, startTime, endTime) {
    return this._getTvGuideDataForDate(date, genre, startTime, endTime);
  }

  // getProgramDetails(programId)
  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs', []);
    const channels = this._getFromStorage('channels', []);

    const program = programs.find((p) => p.id === programId) || null;
    const channel = program ? channels.find((c) => c.id === program.channel_id) || null : null;

    return {
      program,
      channel
    };
  }

  // scheduleRecording(programId, keepDays)
  scheduleRecording(programId, keepDays) {
    try {
      this._ensureAuthenticated();
    } catch (e) {
      return {
        success: false,
        message: e.message,
        recording: null
      };
    }

    const recording = this._scheduleRecordingForProgram(programId, keepDays);
    if (!recording) {
      return {
        success: false,
        message: 'Program not found',
        recording: null
      };
    }

    return {
      success: true,
      message: 'Recording scheduled',
      recording
    };
  }

  // getParentalControlsSetting()
  getParentalControlsSetting() {
    const settings = this._loadParentalControlsSetting();
    return {
      has_parental_controls_configured: !!settings,
      settings: settings || null
    };
  }

  // updateParentalControlsSetting(pin, confirmPin, maxContentRating, blockPurchasesWithoutPin)
  updateParentalControlsSetting(pin, confirmPin, maxContentRating, blockPurchasesWithoutPin) {
    try {
      this._ensureAuthenticated();
    } catch (e) {
      return {
        success: false,
        message: e.message,
        settings: null
      };
    }

    if (pin !== confirmPin) {
      return {
        success: false,
        message: 'PIN and confirmation PIN do not match',
        settings: null
      };
    }

    if (!/^[0-9]{4}$/.test(pin)) {
      return {
        success: false,
        message: 'PIN must be a 4-digit number',
        settings: null
      };
    }

    const allowedRatings = [
      'all_ages',
      'tv_y',
      'tv_y7',
      'tv_g',
      'tv_pg',
      'tv_14',
      'tv_ma'
    ];

    if (!allowedRatings.includes(maxContentRating)) {
      return {
        success: false,
        message: 'Invalid max content rating',
        settings: null
      };
    }

    const existing = this._loadParentalControlsSetting() || {};

    const newSetting = {
      ...existing,
      pin: pin,
      max_content_rating: maxContentRating,
      block_purchases_without_pin: !!blockPurchasesWithoutPin
    };

    const saved = this._saveParentalControlsSetting(newSetting);

    return {
      success: true,
      message: 'Parental controls updated',
      settings: saved
    };
  }

  // getBillingOverview()
  getBillingOverview() {
    this._ensureAuthenticated();

    const subscription = this._getCurrentSubscription();
    let billingSettingsArr = this._getFromStorage('billing_settings', []);
    let billing_settings = billingSettingsArr[0] || null;

    if (!billing_settings) {
      const now = this._nowIso();
      const cycle = subscription ? subscription.billing_cycle : 'monthly';
      const amount = subscription
        ? cycle === 'monthly'
          ? subscription.total_monthly_price
          : subscription.total_annual_price
        : null;

      billing_settings = {
        id: this._generateId('bill'),
        billing_cycle: cycle,
        next_charge_date: subscription ? subscription.next_billing_date : null,
        current_amount: amount,
        currency: 'USD',
        payment_method_summary: null,
        last_promo_code: null,
        created_at: now,
        updated_at: now
      };
      billingSettingsArr = [billing_settings];
      this._saveToStorage('billing_settings', billingSettingsArr);
    }

    return {
      billing_settings,
      current_subscription: subscription
    };
  }

  // updateDraftBillingCycle(billingCycle)
  updateDraftBillingCycle(billingCycle) {
    try {
      this._ensureAuthenticated();
    } catch (e) {
      return {
        success: false,
        message: e.message,
        subscription_change: null
      };
    }

    if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
      return {
        success: false,
        message: 'Invalid billing cycle',
        subscription_change: null
      };
    }

    let change = this._getOrCreateSubscriptionChange();
    change.change_type = 'billing_cycle_change';
    change.selected_billing_cycle = billingCycle;
    change.updated_at = this._nowIso();
    change = this._recalculateSubscriptionChangeTotals(change);

    return {
      success: true,
      message: 'Billing cycle updated in draft',
      subscription_change: change
    };
  }

  // applyPromoCodeToDraft(promoCode)
  applyPromoCodeToDraft(promoCode) {
    try {
      this._ensureAuthenticated();
    } catch (e) {
      return {
        success: false,
        message: e.message,
        promo: null,
        subscription_change: null
      };
    }

    const promos = this._getFromStorage('promo_codes', []);
    const promo = promos.find((p) => p.code === promoCode && p.is_active);
    if (!promo) {
      return {
        success: false,
        message: 'Promo code not found or inactive',
        promo: null,
        subscription_change: null
      };
    }

    let change = this._getOrCreateSubscriptionChange();
    const subscription = this._getCurrentSubscription();
    const planId = change.selected_plan_id || (subscription ? subscription.current_plan_id : null);

    if (
      promo.applicable_plan_ids &&
      Array.isArray(promo.applicable_plan_ids) &&
      promo.applicable_plan_ids.length > 0 &&
      planId &&
      !promo.applicable_plan_ids.includes(planId)
    ) {
      return {
        success: false,
        message: 'Promo code is not applicable to the selected plan',
        promo: null,
        subscription_change: null
      };
    }

    const now = new Date();
    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) {
        return {
          success: false,
          message: 'Promo code is not yet valid',
          promo: null,
          subscription_change: null
        };
      }
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (now > to) {
        return {
          success: false,
          message: 'Promo code has expired',
          promo: null,
          subscription_change: null
        };
      }
    }

    change.promo_code_code = promo.code;
    change.updated_at = this._nowIso();
    change = this._recalculateSubscriptionChangeTotals(change);

    return {
      success: true,
      message: 'Promo code applied',
      promo,
      subscription_change: change
    };
  }

  // getPlansForBillingSelection(billingCycle, sort, maxAnnualTotal)
  getPlansForBillingSelection(billingCycle, sort, maxAnnualTotal) {
    this._ensureAuthenticated();

    const plans = this._getFromStorage('plans', []);
    const changes = this._getFromStorage('subscription_changes', []);
    const promos = this._getFromStorage('promo_codes', []);

    const draftChange = changes.find((c) => c.status === 'draft') || null;
    const appliedPromo = draftChange && draftChange.promo_code_code
      ? promos.find((p) => p.code === draftChange.promo_code_code && p.is_active)
      : null;

    let list = plans.filter(
      (p) =>
        p.status === 'active' &&
        Array.isArray(p.billing_cycles_available) &&
        p.billing_cycles_available.includes(billingCycle)
    );

    const estimated_annual_totals = [];

    list.forEach((plan) => {
      const baseAnnual = plan.annual_price || 0;
      let effectivePromo = null;
      if (appliedPromo) {
        let valid = true;
        const now = new Date();
        if (appliedPromo.valid_from) {
          const from = new Date(appliedPromo.valid_from);
          if (now < from) valid = false;
        }
        if (appliedPromo.valid_to) {
          const to = new Date(appliedPromo.valid_to);
          if (now > to) valid = false;
        }
        if (
          appliedPromo.applicable_plan_ids &&
          Array.isArray(appliedPromo.applicable_plan_ids) &&
          appliedPromo.applicable_plan_ids.length > 0 &&
          !appliedPromo.applicable_plan_ids.includes(plan.id)
        ) {
          valid = false;
        }
        if (valid && (appliedPromo.applies_to_billing_cycle === 'annual' || appliedPromo.applies_to_billing_cycle === 'both')) {
          effectivePromo = appliedPromo;
        }
      }

      const discounted = this._applyPromoToPlanPrices(null, baseAnnual, effectivePromo);
      const estAnnual = discounted.annual != null ? discounted.annual : baseAnnual;
      estimated_annual_totals.push({ plan_id: plan.id, estimated_annual_total: estAnnual });
    });

    if (typeof maxAnnualTotal === 'number') {
      const allowedIds = estimated_annual_totals
        .filter((e) => e.estimated_annual_total <= maxAnnualTotal)
        .map((e) => e.plan_id);
      list = list.filter((p) => allowedIds.includes(p.id));
    }

    if (sort === 'annual_total_low_to_high') {
      list.sort((a, b) => {
        const aEst =
          (estimated_annual_totals.find((e) => e.plan_id === a.id) || {}).estimated_annual_total || 0;
        const bEst =
          (estimated_annual_totals.find((e) => e.plan_id === b.id) || {}).estimated_annual_total || 0;
        return aEst - bEst;
      });
    } else if (sort === 'annual_total_high_to_low') {
      list.sort((a, b) => {
        const aEst =
          (estimated_annual_totals.find((e) => e.plan_id === a.id) || {}).estimated_annual_total || 0;
        const bEst =
          (estimated_annual_totals.find((e) => e.plan_id === b.id) || {}).estimated_annual_total || 0;
        return bEst - aEst;
      });
    }

    return {
      plans: list,
      estimated_annual_totals
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    // Allow accessing checkout summary even when not authenticated; authentication
    // is enforced later when confirming the subscription change.
    const auth = this._getAuthState();

    const subscription = this._getCurrentSubscription();
    const changes = this._getFromStorage('subscription_changes', []);
    const plans = this._getFromStorage('plans', []);
    const addons = this._getFromStorage('addons', []);
    const promos = this._getFromStorage('promo_codes', []);

    const change = changes.find((c) => c.status === 'draft') || null;

    const effective_date_options = [
      { value: 'immediately', label: 'Start immediately' },
      { value: 'next_billing_cycle', label: 'On next billing date' }
    ];

    if (!change) {
      return {
        has_pending_change: false,
        subscription_change: null,
        current_subscription: subscription,
        selected_plan: null,
        selected_addons: [],
        pricing_summary: {
          current_monthly_total: subscription ? subscription.total_monthly_price : null,
          new_monthly_total: null,
          current_annual_total: subscription ? subscription.total_annual_price : null,
          new_annual_total: null,
          promo_code: null,
          promo_savings_amount: 0
        },
        effective_date_options
      };
    }

    const planId = change.selected_plan_id || (subscription ? subscription.current_plan_id : null);
    const selected_plan = planId ? plans.find((p) => p.id === planId) || null : null;

    const addonIds = Array.isArray(change.selected_addon_ids) ? change.selected_addon_ids : [];
    const selected_addons = addonIds
      .map((id) => addons.find((a) => a.id === id) || null)
      .filter((a) => !!a);

    const newMonthly = change.estimated_new_monthly_total;
    const newAnnual = change.estimated_new_annual_total;

    let promo_savings_amount = 0;
    if (change.promo_code_code && selected_plan) {
      const promo = promos.find((p) => p.code === change.promo_code_code) || null;
      if (promo) {
        const addonsMonthly = selected_addons.reduce(
          (sum, a) => sum + (a.monthly_price || 0),
          0
        );
        const baseMonthly = (selected_plan.monthly_price || 0) + addonsMonthly;
        const baseAnnual = (selected_plan.annual_price || 0) + addonsMonthly * 12;
        const billingCycle =
          change.selected_billing_cycle || (subscription ? subscription.billing_cycle : 'monthly');
        if (billingCycle === 'monthly' && newMonthly != null) {
          promo_savings_amount = baseMonthly - newMonthly;
        } else if (billingCycle === 'annual' && newAnnual != null) {
          promo_savings_amount = baseAnnual - newAnnual;
        }
        if (promo_savings_amount < 0) promo_savings_amount = 0;
      }
    }

    // Instrumentation for task completion tracking (task_1: checkoutViewed)
    try {
      if (change && change.selected_plan_id) {
        const storedPlanId = localStorage.getItem('task1_selectedPlanId');
        let qualifies = false;
        if (storedPlanId && change.selected_plan_id === storedPlanId) {
          qualifies = true;
        } else if (
          selected_plan &&
          typeof selected_plan.monthly_price === 'number' &&
          selected_plan.monthly_price < 20 &&
          typeof selected_plan.channel_count === 'number' &&
          selected_plan.channel_count >= 100 &&
          change.selected_billing_cycle === 'annual'
        ) {
          qualifies = true;
        }
        if (qualifies) {
          localStorage.setItem('task1_checkoutViewed', 'true');
        }
      }
    } catch (e) {
      // Ignore instrumentation errors
    }

    return {
      has_pending_change: true,
      subscription_change: change,
      current_subscription: subscription,
      selected_plan,
      selected_addons,
      pricing_summary: {
        current_monthly_total: subscription ? subscription.total_monthly_price : null,
        new_monthly_total: newMonthly,
        current_annual_total: subscription ? subscription.total_annual_price : null,
        new_annual_total: newAnnual,
        promo_code: change.promo_code_code || null,
        promo_savings_amount
      },
      effective_date_options
    };
  }

  // confirmSubscriptionChange(effectiveDateOption, context)
  confirmSubscriptionChange(effectiveDateOption, context) {
    try {
      this._ensureAuthenticated();
    } catch (e) {
      return {
        success: false,
        message: e.message,
        updated_subscription: null,
        subscription_change: null
      };
    }

    if (effectiveDateOption !== 'immediately' && effectiveDateOption !== 'next_billing_cycle') {
      return {
        success: false,
        message: 'Invalid effective date option',
        updated_subscription: null,
        subscription_change: null
      };
    }

    const changes = this._getFromStorage('subscription_changes', []);
    const plans = this._getFromStorage('plans', []);
    const addons = this._getFromStorage('addons', []);
    const promos = this._getFromStorage('promo_codes', []);
    let subscriptions = this._getFromStorage('subscriptions', []);
    let billingSettingsArr = this._getFromStorage('billing_settings', []);

    let change = changes.find((c) => c.status === 'draft');
    if (!change) {
      return {
        success: false,
        message: 'No pending subscription change to confirm',
        updated_subscription: null,
        subscription_change: null
      };
    }

    let subscription = this._getCurrentSubscription();

    const prevSubscription = subscription || null;
    const prevPlan = prevSubscription
      ? plans.find((p) => p.id === prevSubscription.current_plan_id) || null
      : null;
    const previousSimLimit =
      prevSubscription
        ? (prevSubscription.simultaneous_streams_limit != null
            ? prevSubscription.simultaneous_streams_limit
            : prevPlan
            ? prevPlan.max_simultaneous_streams
            : null)
        : null;

    const planId = change.selected_plan_id || (subscription ? subscription.current_plan_id : null);
    const plan = planId ? plans.find((p) => p.id === planId) || null : null;
    if (!plan) {
      return {
        success: false,
        message: 'Selected plan not found',
        updated_subscription: null,
        subscription_change: null
      };
    }

    const billingCycle =
      change.selected_billing_cycle || (subscription ? subscription.billing_cycle : 'monthly');

    const addonIds = Array.isArray(change.selected_addon_ids) ? change.selected_addon_ids : [];
    const selected_addons = addonIds
      .map((id) => addons.find((a) => a.id === id) || null)
      .filter((a) => !!a);

    const addonsMonthly = selected_addons.reduce(
      (sum, a) => sum + (a.monthly_price || 0),
      0
    );
    const baseMonthly = (plan.monthly_price || 0) + addonsMonthly;
    const baseAnnual = (plan.annual_price || 0) + addonsMonthly * 12;

    let promo = null;
    if (change.promo_code_code) {
      const candidate = promos.find((p) => p.code === change.promo_code_code && p.is_active);
      if (candidate) {
        let valid = true;
        const now = new Date();
        if (candidate.valid_from) {
          const from = new Date(candidate.valid_from);
          if (now < from) valid = false;
        }
        if (candidate.valid_to) {
          const to = new Date(candidate.valid_to);
          if (now > to) valid = false;
        }
        if (
          candidate.applicable_plan_ids &&
          Array.isArray(candidate.applicable_plan_ids) &&
          candidate.applicable_plan_ids.length > 0 &&
          !candidate.applicable_plan_ids.includes(plan.id)
        ) {
          valid = false;
        }
        if (valid) promo = candidate;
      }
    }

    const discounted = this._applyPromoToPlanPrices(baseMonthly, baseAnnual, promo);
    const totalMonthly = discounted.monthly;
    const totalAnnual = discounted.annual;

    const nowIso = this._nowIso();

    if (!subscription) {
      // create new subscription
      subscriptions.forEach((s) => {
        s.is_current = false;
      });

      subscription = {
        id: this._generateId('sub'),
        is_current: true,
        current_plan_id: plan.id,
        billing_cycle: billingCycle,
        status: 'active',
        start_date: nowIso,
        end_date: null,
        next_billing_date: null,
        base_monthly_price: plan.monthly_price || 0,
        base_annual_price: plan.annual_price || 0,
        total_monthly_price: totalMonthly,
        total_annual_price: totalAnnual,
        simultaneous_streams_limit: plan.max_simultaneous_streams || null,
        last_updated_source: context || 'plan_change',
        created_at: nowIso,
        updated_at: nowIso
      };

      subscriptions.push(subscription);
    } else {
      subscriptions = subscriptions.map((s) => {
        if (s.id !== subscription.id) return s;
        return {
          ...s,
          is_current: true,
          current_plan_id: plan.id,
          billing_cycle: billingCycle,
          status: s.status === 'canceled' ? 'active' : s.status,
          base_monthly_price: plan.monthly_price || 0,
          base_annual_price: plan.annual_price || 0,
          total_monthly_price: totalMonthly,
          total_annual_price: totalAnnual,
          simultaneous_streams_limit: plan.max_simultaneous_streams || null,
          last_updated_source: context || 'plan_change',
          updated_at: nowIso
        };
      });

      subscription = subscriptions.find((s) => s.id === subscription.id);
    }

    this._saveToStorage('subscriptions', subscriptions);

    // Update subscription add-ons
    let subscriptionAddons = this._getFromStorage('subscription_addons', []);

    const currentSubId = subscription.id;
    const existingForSub = subscriptionAddons.filter(
      (sa) => sa.subscription_id === currentSubId
    );

    existingForSub.forEach((sa) => {
      if (!addonIds.includes(sa.addon_id)) {
        sa.is_active = false;
      } else {
        sa.is_active = true;
      }
    });

    addonIds.forEach((addonId) => {
      const exists = existingForSub.find((sa) => sa.addon_id === addonId);
      if (!exists) {
        subscriptionAddons.push({
          id: this._generateId('subadd'),
          subscription_id: currentSubId,
          addon_id: addonId,
          added_at: nowIso,
          is_active: true
        });
      }
    });

    this._saveToStorage('subscription_addons', subscriptionAddons);

    // Instrumentation for task completion tracking (task_2: addonSelection)
    try {
      if (!localStorage.getItem('task2_addonSelection')) {
        const activeSubAddons = subscriptionAddons.filter(
          (sa) => sa.subscription_id === subscription.id && sa.is_active
        );
        if (activeSubAddons.length > 0) {
          const addonChannels = this._getFromStorage('addon_channels', []);
          const channels = this._getFromStorage('channels', []);
          const activeAddonsForSub = activeSubAddons
            .map((sa) => addons.find((a) => a.id === sa.addon_id) || null)
            .filter((a) => !!a);

          let qualifyingAddon = null;

          for (let i = 0; i < activeAddonsForSub.length; i++) {
            const addon = activeAddonsForSub[i];
            if (
              addon.category === 'sports' &&
              typeof addon.monthly_price === 'number' &&
              addon.monthly_price < 10
            ) {
              const linkedChannels = addonChannels
                .filter((ac) => ac.addon_id === addon.id)
                .map((ac) => channels.find((c) => c.id === ac.channel_id) || null)
                .filter(
                  (c) =>
                    c &&
                    c.genre === 'sports' &&
                    !!c.is_hd
                );
              if (linkedChannels.length >= 5) {
                qualifyingAddon = addon;
                break;
              }
            }
          }

          if (qualifyingAddon) {
            const selectionInfo = {
              addonId: qualifyingAddon.id,
              subscriptionId: subscription.id,
              confirmedAt: nowIso
            };
            localStorage.setItem('task2_addonSelection', JSON.stringify(selectionInfo));
          }
        }
      }
    } catch (e) {
      // Ignore instrumentation errors
    }

    // Update billing settings
    let billing_settings = billingSettingsArr[0] || null;
    if (!billing_settings) {
      billing_settings = {
        id: this._generateId('bill'),
        billing_cycle: billingCycle,
        next_charge_date: subscription.next_billing_date || null,
        current_amount: billingCycle === 'monthly' ? totalMonthly : totalAnnual,
        currency: 'USD',
        payment_method_summary: null,
        last_promo_code: promo ? promo.code : null,
        created_at: nowIso,
        updated_at: nowIso
      };
      billingSettingsArr = [billing_settings];
    } else {
      billing_settings = {
        ...billing_settings,
        billing_cycle: billingCycle,
        current_amount: billingCycle === 'monthly' ? totalMonthly : totalAnnual,
        last_promo_code: promo ? promo.code : billing_settings.last_promo_code,
        updated_at: nowIso
      };
      billingSettingsArr[0] = billing_settings;
    }

    this._saveToStorage('billing_settings', billingSettingsArr);

    // Finalize subscription change
    change.status = 'completed';
    change.effective_date_option = effectiveDateOption;
    change.updated_at = nowIso;
    this._persistSubscriptionChange(change);

    // Instrumentation for task completion tracking (task_5: upgradeResult)
    try {
      if (
        prevSubscription &&
        effectiveDateOption === 'immediately' &&
        plan &&
        typeof plan.monthly_price === 'number' &&
        plan.monthly_price < 30 &&
        typeof previousSimLimit === 'number' &&
        typeof plan.max_simultaneous_streams === 'number' &&
        plan.max_simultaneous_streams > previousSimLimit &&
        !localStorage.getItem('task5_upgradeResult')
      ) {
        const upgradeInfo = {
          previousPlanId: prevPlan ? prevPlan.id : prevSubscription.current_plan_id,
          newPlanId: plan.id,
          previousStreams: previousSimLimit,
          newStreams:
            plan.max_simultaneous_streams != null ? plan.max_simultaneous_streams : null,
          newMonthlyPrice: totalMonthly,
          effectiveDateOption: effectiveDateOption,
          confirmedAt: nowIso
        };
        localStorage.setItem('task5_upgradeResult', JSON.stringify(upgradeInfo));
      }
    } catch (e) {
      // Ignore instrumentation errors
    }

    return {
      success: true,
      message: 'Subscription updated',
      updated_subscription: subscription,
      subscription_change: change
    };
  }

  // searchSeries(query, filters, sort)
  searchSeries(query, filters, sort) {
    const results = this._searchSeriesIndex(query, filters || {}, sort);
    return {
      results,
      applied_filters: {
        resolution: (filters && filters.resolution) || null,
        contentType: (filters && filters.contentType) || null,
        genre: (filters && filters.genre) || null
      }
    };
  }

  // getSeriesDetailWithEpisodes(seriesId)
  getSeriesDetailWithEpisodes(seriesId) {
    const seriesArr = this._getFromStorage('series', []);
    const episodes = this._getFromStorage('episodes', []);

    const series = seriesArr.find((s) => s.id === seriesId) || null;

    const episodesForSeries = episodes.filter((e) => e.series_id === seriesId);

    const seasonMap = {};
    episodesForSeries.forEach((ep) => {
      const seasonNumber = ep.season_number;
      if (!seasonMap[seasonNumber]) {
        seasonMap[seasonNumber] = [];
      }
      seasonMap[seasonNumber].push(ep);
    });

    const seasons = Object.keys(seasonMap)
      .map((sn) => parseInt(sn, 10))
      .sort((a, b) => a - b)
      .map((sn) => {
        const eps = seasonMap[sn].slice().sort((a, b) => {
          const ao = a.episode_order != null ? a.episode_order : a.episode_number;
          const bo = b.episode_order != null ? b.episode_order : b.episode_number;
          return ao - bo;
        });
        return {
          season_number: sn,
          episodes: eps
        };
      });

    return {
      series,
      seasons
    };
  }

  // startEpisodePlayback(episodeId)
  startEpisodePlayback(episodeId) {
    const episodes = this._getFromStorage('episodes', []);
    const episode = episodes.find((e) => e.id === episodeId) || null;
    if (!episode) {
      return {
        success: false,
        playback_url: null,
        message: 'Episode not found'
      };
    }

    // Instrumentation for task completion tracking (task_8: playbackInfo)
    try {
      const playbackInfo = {
        episodeId: episode.id,
        seriesId: episode.series_id,
        startedAt: this._nowIso()
      };
      localStorage.setItem('task8_playbackInfo', JSON.stringify(playbackInfo));
    } catch (e) {
      // Ignore instrumentation errors
    }

    return {
      success: true,
      playback_url: episode.playback_url,
      message: 'Playback started'
    };
  }

  // getHelpContent()
  getHelpContent() {
    return {
      faq_sections: [
        {
          section_title: 'Subscription & Billing',
          faqs: [
            {
              question: 'How do I change my IPTV plan?',
              answer:
                'Go to My Account > Manage Plan to compare available plans and confirm your upgrade or downgrade.',
              related_page_key: 'my_plan'
            },
            {
              question: 'How do annual subscriptions work?',
              answer:
                'Annual subscriptions are billed once per year at a discounted rate compared to paying monthly.',
              related_page_key: 'billing'
            }
          ]
        },
        {
          section_title: 'Streaming & Devices',
          faqs: [
            {
              question: 'How many devices can stream at the same time?',
              answer:
                'The number of simultaneous streams depends on your selected plan. You can review this on the Manage Plan page.',
              related_page_key: 'my_plan'
            },
            {
              question: 'Can I watch on my smart TV?',
              answer:
                'Yes, most modern smart TVs, streaming sticks, and mobile devices are supported.',
              related_page_key: 'about'
            }
          ]
        }
      ],
      contact_options: {
        support_email: 'support@example-iptv.com',
        support_phone: '+1-800-000-0000'
      }
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      company_name: 'NextGen IPTV',
      mission:
        'To make high-quality IPTV streaming accessible and affordable for viewers everywhere.',
      timeline: [
        { year: '2020', event: 'NextGen IPTV launched with 50 live channels.' },
        { year: '2022', event: 'Expanded to 150+ channels and introduced cloud DVR.' },
        { year: '2024', event: 'Added 4K streaming and advanced parental controls.' }
      ],
      partnerships: [
        {
          partner_name: 'Global Sports Network',
          description: 'Premium sports content including football, basketball, and more.'
        },
        {
          partner_name: 'CinemaPlus Studios',
          description: 'On-demand movies and series from around the world.'
        }
      ],
      supported_devices: [
        'Smart TVs',
        'Android phones & tablets',
        'iOS devices',
        'Streaming sticks',
        'Web browsers'
      ]
    };
  }

  // getLegalDocuments()
  getLegalDocuments() {
    return {
      terms_of_use_html:
        '<h1>Terms of Use</h1><p>By using this IPTV service, you agree to comply with all applicable laws and these Terms of Use.</p>',
      privacy_policy_html:
        '<h1>Privacy Policy</h1><p>We respect your privacy and handle your data in accordance with this policy.</p>',
      other_notices: [
        {
          title: 'Cookies',
          body_html:
            '<p>We use cookies to personalize content and analyze our traffic. You can manage cookie settings in your browser.</p>'
        }
      ]
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