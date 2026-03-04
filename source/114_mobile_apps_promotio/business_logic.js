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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    const tables = [
      'apps',
      'app_categories',
      'app_platform_supports',
      'subscription_plans',
      'plan_configurations',
      'orders',
      'faq_categories',
      'faq_articles',
      'faq_sections',
      'support_tickets',
      'tutorials',
      'newsletter_subscriptions',
      'newsletter_topics',
      'site_preferences',
      'app_comparison_sessions'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Misc singleton / helper keys
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_order_id')) {
      localStorage.setItem('current_order_id', '');
    }
    if (!localStorage.getItem('current_plan_configuration_id')) {
      localStorage.setItem('current_plan_configuration_id', '');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') {
      return defaultValue;
    }
    try {
      return JSON.parse(data);
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

  // -------------------------
  // Currency & pricing helpers
  // -------------------------

  _getOrCreateSitePreference() {
    let prefs = this._getFromStorage('site_preferences');
    if (!Array.isArray(prefs)) {
      prefs = [];
    }
    if (prefs.length === 0) {
      const pref = {
        id: this._generateId('site_pref'),
        currency: 'usd',
        region: null,
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      prefs.push(pref);
      this._saveToStorage('site_preferences', prefs);
      return pref;
    }
    return prefs[0];
  }

  _applyCurrencyConversion(amount, fromCurrency, toCurrency) {
    if (amount === null || amount === undefined) return null;
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;

    // Read conversion rates from localStorage if defined.
    // Expected format: { "usd_eur": 0.9, "eur_usd": 1.1 }
    const raw = localStorage.getItem('currency_rates');
    let rates = {};
    if (raw) {
      try {
        rates = JSON.parse(raw) || {};
      } catch (e) {
        rates = {};
      }
    }
    const key = fromCurrency + '_' + toCurrency;
    const rate = typeof rates[key] === 'number' ? rates[key] : 1;
    return amount * rate;
  }

  _formatPrice(amount, currency, suffix) {
    if (amount === null || amount === undefined) return '';
    const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
    let symbol = '';
    if (currency === 'eur') symbol = '\u20ac';
    else if (currency === 'usd') symbol = '$';
    else symbol = '';
    const formatted = symbol + rounded.toFixed(2);
    if (suffix) return formatted + ' ' + suffix;
    return formatted;
  }

  _getAppDisplayPrice(app, targetCurrency, billingFrequency) {
    if (!app) return '';
    const fromCurrency = app.baseCurrency || targetCurrency;
    if (app.pricingModel === 'subscription') {
      const monthly = app.monthlyPrice || 0;
      const converted = this._applyCurrencyConversion(monthly, fromCurrency, targetCurrency);
      const suffix = '/month';
      return this._formatPrice(converted, targetCurrency, suffix);
    }
    if (app.pricingModel === 'one_time_purchase') {
      const one = app.oneTimePrice || 0;
      const converted = this._applyCurrencyConversion(one, fromCurrency, targetCurrency);
      return this._formatPrice(converted, targetCurrency, 'one-time');
    }
    if (app.pricingModel === 'free') {
      return 'Free';
    }
    if (app.pricingModel === 'freemium') {
      return 'Free with in-app purchases';
    }
    return '';
  }

  _getPlanPriceForFrequency(plan, billingFrequency, targetCurrency) {
    if (!plan) return null;
    const fromCurrency = plan.baseCurrency || targetCurrency;
    let baseAmount = null;
    if (billingFrequency === 'monthly') {
      baseAmount = plan.monthlyPrice != null ? plan.monthlyPrice : null;
    } else if (billingFrequency === 'yearly') {
      baseAmount = plan.yearlyPrice != null ? plan.yearlyPrice : null;
    }
    if (baseAmount == null) return null;
    return this._applyCurrencyConversion(baseAmount, fromCurrency, targetCurrency);
  }

  // -------------------------
  // Entity lookup helpers
  // -------------------------

  _getAppById(appId) {
    const apps = this._getFromStorage('apps');
    return apps.find(a => a.id === appId) || null;
  }

  _getCategoryById(categoryId) {
    const cats = this._getFromStorage('app_categories');
    return cats.find(c => c.id === categoryId) || null;
  }

  _getPlanById(planId) {
    const plans = this._getFromStorage('subscription_plans');
    return plans.find(p => p.id === planId) || null;
  }

  _getFaqCategoryById(categoryId) {
    const cats = this._getFromStorage('faq_categories');
    return cats.find(c => c.id === categoryId) || null;
  }

  _getAppPlatforms(appId) {
    const supports = this._getFromStorage('app_platform_supports');
    return supports
      .filter(s => s.appId === appId && s.isSupported)
      .map(s => ({
        platform: s.platform,
        minOsVersion: s.minOsVersion || null,
        isSupported: !!s.isSupported,
        storeUrl: s.storeUrl || null,
        notes: s.notes || null
      }));
  }

  // -------------------------
  // Current order & plan configuration helpers
  // -------------------------

  _getCurrentOrderId() {
    const id = localStorage.getItem('current_order_id');
    return id && id !== '' ? id : null;
  }

  _setCurrentOrderId(orderId) {
    if (!orderId) {
      localStorage.setItem('current_order_id', '');
    } else {
      localStorage.setItem('current_order_id', String(orderId));
    }
  }

  _getCurrentPlanConfigurationId() {
    const id = localStorage.getItem('current_plan_configuration_id');
    return id && id !== '' ? id : null;
  }

  _setCurrentPlanConfigurationId(configId) {
    if (!configId) {
      localStorage.setItem('current_plan_configuration_id', '');
    } else {
      localStorage.setItem('current_plan_configuration_id', String(configId));
    }
  }

  _getOrCreateCurrentOrder(orderType, currency, billingFrequency) {
    const orders = this._getFromStorage('orders');
    const currentId = this._getCurrentOrderId();
    let currentOrder = currentId ? orders.find(o => o.id === currentId) : null;

    if (!currentOrder || currentOrder.status !== 'pending') {
      // Create new pending order
      currentOrder = {
        id: this._generateId('order'),
        orderType: orderType,
        planId: null,
        appId: null,
        planConfigurationId: null,
        totalAmount: 0,
        currency: currency,
        billingFrequency: billingFrequency,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      orders.push(currentOrder);
      this._saveToStorage('orders', orders);
      this._setCurrentOrderId(currentOrder.id);
    }
    return currentOrder;
  }

  // -------------------------
  // App comparison session helper
  // -------------------------

  _getOrCreateAppComparisonSession() {
    let sessions = this._getFromStorage('app_comparison_sessions');
    if (!Array.isArray(sessions)) {
      sessions = [];
    }
    if (sessions.length === 0) {
      const session = {
        id: this._generateId('app_compare'),
        appIds: [],
        createdAt: new Date().toISOString()
      };
      sessions.push(session);
      this._saveToStorage('app_comparison_sessions', sessions);
      return session;
    }
    return sessions[0];
  }

  _saveAppComparisonSession(session) {
    let sessions = this._getFromStorage('app_comparison_sessions');
    if (!Array.isArray(sessions) || sessions.length === 0) {
      sessions = [session];
    } else {
      sessions[0] = session;
    }
    this._saveToStorage('app_comparison_sessions', sessions);
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getSitePreference
  getSitePreference() {
    const pref = this._getOrCreateSitePreference();
    return {
      currency: pref.currency,
      region: pref.region || null
    };
  }

  // updateSitePreference(currency, region)
  updateSitePreference(currency, region) {
    const allowed = ['usd', 'eur'];
    if (!allowed.includes(currency)) {
      return {
        success: false,
        preference: null,
        message: 'Invalid currency'
      };
    }
    let prefs = this._getFromStorage('site_preferences');
    if (!Array.isArray(prefs) || prefs.length === 0) {
      prefs = [
        {
          id: this._generateId('site_pref'),
          currency: currency,
          region: region || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    } else {
      prefs[0].currency = currency;
      prefs[0].region = region || null;
      prefs[0].updatedAt = new Date().toISOString();
    }
    this._saveToStorage('site_preferences', prefs);
    return {
      success: true,
      preference: {
        currency: prefs[0].currency,
        region: prefs[0].region
      },
      message: 'Site preference updated'
    };
  }

  // getHomeHeroContent()
  getHomeHeroContent() {
    const raw = localStorage.getItem('home_hero_content');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            title: parsed.title || '',
            subtitle: parsed.subtitle || '',
            highlightPoints: Array.isArray(parsed.highlightPoints)
              ? parsed.highlightPoints
              : []
          };
        }
      } catch (e) {}
    }
    // Fallback minimal content if not configured
    return {
      title: '',
      subtitle: '',
      highlightPoints: []
    };
  }

  // getHomeFeaturedAppsAndPlans()
  getHomeFeaturedAppsAndPlans() {
    const sitePref = this._getOrCreateSitePreference();
    const apps = this._getFromStorage('apps');
    const categories = this._getFromStorage('app_categories');
    const plans = this._getFromStorage('subscription_plans');

    const activeApps = apps.filter(a => a.isActive);
    activeApps.sort((a, b) => {
      const ra = a.rating || 0;
      const rb = b.rating || 0;
      if (rb !== ra) return rb - ra;
      const rca = a.ratingCount || 0;
      const rcb = b.ratingCount || 0;
      return rcb - rca;
    });

    const featuredApps = activeApps.slice(0, 5).map(app => {
      const category = categories.find(c => c.id === app.categoryId) || null;
      const platforms = this._getAppPlatforms(app.id).map(p => ({
        platform: p.platform,
        minOsVersion: p.minOsVersion,
        isSupported: p.isSupported
      }));
      const displayPrice = this._getAppDisplayPrice(app, sitePref.currency);
      const result = {
        id: app.id,
        name: app.name,
        slug: app.slug || null,
        categoryId: app.categoryId,
        categoryName: category ? category.name : null,
        shortDescription: app.shortDescription || null,
        pricingModel: app.pricingModel,
        monthlyPrice: app.monthlyPrice || null,
        oneTimePrice: app.oneTimePrice || null,
        baseCurrency: app.baseCurrency,
        displayPrice: displayPrice,
        rating: app.rating || null,
        ratingCount: app.ratingCount || 0,
        featureTags: Array.isArray(app.featureTags) ? app.featureTags : [],
        hasFreeTrial: !!app.hasFreeTrial,
        freeTrialDays: app.freeTrialDays || null,
        platforms: platforms,
        // Foreign key resolution
        category: category
      };
      return result;
    });

    const activePlans = plans.filter(p => p.isActive);
    activePlans.sort((a, b) => {
      const pa = a.monthlyPrice || 0;
      const pb = b.monthlyPrice || 0;
      return pa - pb;
    });

    const featuredPlans = activePlans.slice(0, 3).map(plan => {
      const monthly = this._getPlanPriceForFrequency(plan, 'monthly', sitePref.currency);
      const yearly = this._getPlanPriceForFrequency(plan, 'yearly', sitePref.currency);
      return {
        id: plan.id,
        name: plan.name,
        description: plan.description || null,
        monthlyPrice: plan.monthlyPrice || null,
        yearlyPrice: plan.yearlyPrice || null,
        baseCurrency: plan.baseCurrency,
        deviceLimit: plan.deviceLimit,
        includedPlatforms: Array.isArray(plan.includedPlatforms)
          ? plan.includedPlatforms
          : [],
        isPopular: !!plan.isPopular,
        displayPriceMonthly: monthly != null
          ? this._formatPrice(monthly, sitePref.currency, '/month')
          : '',
        displayPriceYearly: yearly != null
          ? this._formatPrice(yearly, sitePref.currency, '/year')
          : ''
      };
    });

    return {
      featuredApps,
      featuredPlans
    };
  }

  // getNewsletterFormOptions()
  getNewsletterFormOptions() {
    const topicsRaw = this._getFromStorage('newsletter_topics');
    const topics = topicsRaw.map(t => ({
      key: t.key,
      label: t.label,
      description: t.description || ''
    }));

    const countries = [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' }
    ];

    const frequencies = [
      { key: 'daily', label: 'Daily' },
      { key: 'weekly', label: 'Weekly' },
      { key: 'monthly', label: 'Monthly' }
    ];

    const platforms = [
      { key: 'ios', label: 'iOS' },
      { key: 'android', label: 'Android' },
      { key: 'ipad', label: 'iPad' },
      { key: 'web', label: 'Web' }
    ];

    return {
      countries,
      topics,
      frequencies,
      platforms
    };
  }

  // subscribeToNewsletter(email, country, topics, frequency, platforms)
  subscribeToNewsletter(email, country, topics, frequency, platforms) {
    if (!email || typeof email !== 'string') {
      return {
        success: false,
        subscription: null,
        message: 'Email is required'
      };
    }
    if (!Array.isArray(topics) || topics.length === 0) {
      return {
        success: false,
        subscription: null,
        message: 'At least one topic is required'
      };
    }
    const allowedFreq = ['daily', 'weekly', 'monthly'];
    if (!allowedFreq.includes(frequency)) {
      return {
        success: false,
        subscription: null,
        message: 'Invalid frequency'
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    const now = new Date().toISOString();
    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email: email,
      country: country || null,
      topics: topics,
      frequency: frequency,
      platforms: Array.isArray(platforms) ? platforms : [],
      createdAt: now,
      confirmed: false
    };
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'Subscription created'
    };
  }

  // getAppCatalogFilters()
  getAppCatalogFilters() {
    const sitePref = this._getOrCreateSitePreference();
    const categoriesRaw = this._getFromStorage('app_categories');
    const apps = this._getFromStorage('apps');

    const categories = categoriesRaw.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || ''
    }));

    const platforms = [
      { key: 'android', label: 'Android' },
      { key: 'ios', label: 'iOS' },
      { key: 'ipad', label: 'iPad' }
    ];

    const pricingModels = [
      { key: 'subscription', label: 'Subscription' },
      { key: 'one_time_purchase', label: 'One-time purchase' },
      { key: 'free', label: 'Free' },
      { key: 'freemium', label: 'Freemium' }
    ];

    const featureSet = new Set();
    apps.forEach(app => {
      if (Array.isArray(app.featureTags)) {
        app.featureTags.forEach(tag => featureSet.add(tag));
      }
    });
    const featureTags = Array.from(featureSet).map(tag => ({
      key: tag,
      label: tag
    }));

    const ratingOptions = [
      { minRating: 4.5, label: '4.5 stars & up' },
      { minRating: 4.0, label: '4 stars & up' },
      { minRating: 3.0, label: '3 stars & up' }
    ];

    let minPrice = 0;
    let maxPrice = 0;
    apps.forEach(app => {
      if (app.pricingModel === 'subscription' && app.monthlyPrice != null) {
        const converted = this._applyCurrencyConversion(
          app.monthlyPrice,
          app.baseCurrency,
          sitePref.currency
        );
        if (converted != null) {
          if (maxPrice === 0 || converted > maxPrice) maxPrice = converted;
        }
      }
      if (app.pricingModel === 'one_time_purchase' && app.oneTimePrice != null) {
        const converted = this._applyCurrencyConversion(
          app.oneTimePrice,
          app.baseCurrency,
          sitePref.currency
        );
        if (converted != null) {
          if (maxPrice === 0 || converted > maxPrice) maxPrice = converted;
        }
      }
    });
    if (maxPrice === 0) maxPrice = 100;

    const priceRange = {
      min: minPrice,
      max: maxPrice,
      step: 1,
      currency: sitePref.currency
    };

    const osVersionOptions = {
      android: { min: '5.0', max: '15.0', step: '0.1' },
      ios: { min: '10.0', max: '18.0', step: '0.1' },
      ipad: { min: '10.0', max: '18.0', step: '0.1' }
    };

    const sortingOptions = [
      { key: 'rating', label: 'Rating' },
      { key: 'price', label: 'Price' },
      { key: 'created_at', label: 'Newest' },
      { key: 'name', label: 'Name' }
    ];

    return {
      categories,
      platforms,
      pricingModels,
      featureTags,
      ratingOptions,
      priceRange,
      osVersionOptions,
      sortingOptions
    };
  }

  // searchApps(query, categoryId, platforms, androidMinOsVersion, iosMinOsVersion,
  //            ipadMinOsVersion, pricingModel, minRating, maxMonthlyPrice,
  //            maxOneTimePrice, featureTags, hasFreeTrial, sortBy,
  //            sortDirection, limit, offset)
  searchApps(
    query,
    categoryId,
    platforms,
    androidMinOsVersion,
    iosMinOsVersion,
    ipadMinOsVersion,
    pricingModel,
    minRating,
    maxMonthlyPrice,
    maxOneTimePrice,
    featureTags,
    hasFreeTrial,
    sortBy,
    sortDirection,
    limit = 20,
    offset = 0
  ) {
    const sitePref = this._getOrCreateSitePreference();
    const apps = this._getFromStorage('apps').filter(a => a.isActive);
    const categories = this._getFromStorage('app_categories');
    const supports = this._getFromStorage('app_platform_supports');

    const q = query ? String(query).toLowerCase() : null;
    const platformFilter = Array.isArray(platforms) ? platforms : [];
    const featureFilter = Array.isArray(featureTags) ? featureTags : [];
    const dir = sortDirection === 'desc' ? 'desc' : 'asc';
    const sortKey = sortBy || 'name';

    const filtered = apps.filter(app => {
      // Text query
      if (q) {
        const haystack = (
          (app.name || '') +
          ' ' +
          (app.shortDescription || '') +
          ' ' +
          (app.description || '') +
          ' ' +
          (Array.isArray(app.featureTags) ? app.featureTags.join(' ') : '')
        ).toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // Category
      if (categoryId && app.categoryId !== categoryId) return false;

      // Platform support
      const appSupports = supports.filter(s => s.appId === app.id && s.isSupported);
      if (platformFilter.length > 0) {
        const supportPlatforms = appSupports.map(s => s.platform);
        const intersection = platformFilter.filter(p => supportPlatforms.includes(p));
        if (intersection.length === 0) return false;
      }

      // OS version constraints
      if (androidMinOsVersion) {
        const androidSupports = appSupports.filter(s => s.platform === 'android');
        if (androidSupports.length === 0) return false;
        const minReq = parseFloat(androidMinOsVersion);
        const ok = androidSupports.some(s => {
          const v = parseFloat(s.minOsVersion || '0');
          return !isNaN(v) && v <= minReq;
        });
        if (!ok) return false;
      }
      if (iosMinOsVersion) {
        const iosSupports = appSupports.filter(s => s.platform === 'ios');
        if (iosSupports.length === 0) return false;
        const minReq = parseFloat(iosMinOsVersion);
        const ok = iosSupports.some(s => {
          const v = parseFloat(s.minOsVersion || '0');
          return !isNaN(v) && v <= minReq;
        });
        if (!ok) return false;
      }
      if (ipadMinOsVersion) {
        const ipadSupports = appSupports.filter(s => s.platform === 'ipad');
        if (ipadSupports.length === 0) return false;
        const minReq = parseFloat(ipadMinOsVersion);
        const ok = ipadSupports.some(s => {
          const v = parseFloat(s.minOsVersion || '0');
          return !isNaN(v) && v <= minReq;
        });
        if (!ok) return false;
      }

      // Pricing model
      if (pricingModel && app.pricingModel !== pricingModel) return false;

      // Rating
      if (minRating != null) {
        const r = app.rating != null ? app.rating : 0;
        if (r < minRating) return false;
      }

      // Free trial
      if (typeof hasFreeTrial === 'boolean') {
        if (!!app.hasFreeTrial !== hasFreeTrial) return false;
      }

      // Price filters
      if (maxMonthlyPrice != null) {
        if (app.monthlyPrice != null) {
          const converted = this._applyCurrencyConversion(
            app.monthlyPrice,
            app.baseCurrency,
            sitePref.currency
          );
          if (converted != null && converted > maxMonthlyPrice) return false;
        }
      }
      if (maxOneTimePrice != null && app.oneTimePrice != null) {
        const converted = this._applyCurrencyConversion(
          app.oneTimePrice,
          app.baseCurrency,
          sitePref.currency
        );
        if (converted != null && converted > maxOneTimePrice) return false;
      }

      // Feature tags (all requested must be present, case-insensitive)
      if (featureFilter.length > 0) {
        const appTags = (app.featureTags || []).map(t => String(t).toLowerCase());
        const allPresent = featureFilter.every(tag =>
          appTags.includes(String(tag).toLowerCase())
        );
        if (!allPresent) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      const multiplier = dir === 'desc' ? -1 : 1;
      if (sortKey === 'rating') {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (ra === rb) return 0;
        return ra > rb ? 1 * multiplier : -1 * multiplier;
      }
      if (sortKey === 'price') {
        const priceFor = app => {
          if (app.pricingModel === 'subscription' && app.monthlyPrice != null) {
            return this._applyCurrencyConversion(
              app.monthlyPrice,
              app.baseCurrency,
              sitePref.currency
            );
          }
          if (app.pricingModel === 'one_time_purchase' && app.oneTimePrice != null) {
            return this._applyCurrencyConversion(
              app.oneTimePrice,
              app.baseCurrency,
              sitePref.currency
            );
          }
          return Number.POSITIVE_INFINITY;
        };
        const pa = priceFor(a);
        const pb = priceFor(b);
        if (pa === pb) return 0;
        return pa > pb ? 1 * multiplier : -1 * multiplier;
      }
      if (sortKey === 'created_at') {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (da === db) return 0;
        return da > db ? 1 * multiplier : -1 * multiplier;
      }
      if (sortKey === 'name') {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na === nb) return 0;
        return na > nb ? 1 * multiplier : -1 * multiplier;
      }
      return 0;
    });

    const total = filtered.length;
    const sliced = filtered.slice(offset, offset + limit);

    const items = sliced.map(app => {
      const category = categories.find(c => c.id === app.categoryId) || null;
      const platformsData = this._getAppPlatforms(app.id).map(p => ({
        platform: p.platform,
        minOsVersion: p.minOsVersion,
        isSupported: p.isSupported
      }));
      const displayPrice = this._getAppDisplayPrice(app, sitePref.currency);
      const result = {
        id: app.id,
        name: app.name,
        slug: app.slug || null,
        categoryId: app.categoryId,
        categoryName: category ? category.name : null,
        shortDescription: app.shortDescription || null,
        pricingModel: app.pricingModel,
        monthlyPrice: app.monthlyPrice || null,
        oneTimePrice: app.oneTimePrice || null,
        baseCurrency: app.baseCurrency,
        displayPrice,
        rating: app.rating || null,
        ratingCount: app.ratingCount || 0,
        featureTags: Array.isArray(app.featureTags) ? app.featureTags : [],
        hasFreeTrial: !!app.hasFreeTrial,
        freeTrialDays: app.freeTrialDays || null,
        platforms: platformsData,
        // Foreign key resolution
        category: category
      };
      return result;
    });

    // Instrumentation for task completion tracking
    try {
      // task_1: searchApps with Android, minRating, maxMonthlyPrice, sorted by rating
      if (
        platformFilter &&
        platformFilter.includes('android') &&
        minRating != null &&
        maxMonthlyPrice != null &&
        sortKey === 'rating'
      ) {
        localStorage.setItem(
          'task1_searchParams',
          JSON.stringify({
            query,
            categoryId,
            platforms: platformFilter,
            androidMinOsVersion,
            iosMinOsVersion,
            ipadMinOsVersion,
            pricingModel,
            minRating,
            maxMonthlyPrice,
            maxOneTimePrice,
            featureTags: featureFilter,
            hasFreeTrial,
            sortBy: sortKey,
            sortDirection: dir
          })
        );
      }

      // task_4: searchApps with Android & iOS, OS version filters, feature tags, sorted by price
      if (
        platformFilter &&
        platformFilter.includes('android') &&
        platformFilter.includes('ios') &&
        androidMinOsVersion != null &&
        iosMinOsVersion != null &&
        Array.isArray(featureFilter) &&
        featureFilter.length > 0 &&
        sortKey === 'price'
      ) {
        localStorage.setItem(
          'task4_searchParams',
          JSON.stringify({
            query,
            categoryId,
            platforms: platformFilter,
            androidMinOsVersion,
            iosMinOsVersion,
            ipadMinOsVersion,
            pricingModel,
            minRating,
            maxMonthlyPrice,
            maxOneTimePrice,
            featureTags: featureFilter,
            hasFreeTrial,
            sortBy: sortKey,
            sortDirection: dir
          })
        );
      }
    } catch (e) {}

    return {
      total,
      items,
      appliedFilters: {
        query,
        categoryId,
        platforms: platformFilter,
        androidMinOsVersion,
        iosMinOsVersion,
        ipadMinOsVersion,
        pricingModel,
        minRating,
        maxMonthlyPrice,
        maxOneTimePrice,
        featureTags: featureFilter,
        hasFreeTrial,
        sortBy: sortKey,
        sortDirection: dir
      }
    };
  }

  // updateAppComparisonSelection(appId, selected)
  updateAppComparisonSelection(appId, selected) {
    const maxSelectable = 2;
    const app = this._getAppById(appId);
    if (!app) {
      return {
        success: false,
        selectedAppIds: [],
        maxSelectable,
        message: 'App not found'
      };
    }
    const session = this._getOrCreateAppComparisonSession();
    const appIds = Array.isArray(session.appIds) ? session.appIds.slice() : [];

    if (selected) {
      if (!appIds.includes(appId)) {
        if (appIds.length >= maxSelectable) {
          return {
            success: false,
            selectedAppIds: appIds,
            maxSelectable,
            message: 'You can only compare up to ' + maxSelectable + ' apps.'
          };
        }
        appIds.push(appId);
      }
    } else {
      const idx = appIds.indexOf(appId);
      if (idx >= 0) {
        appIds.splice(idx, 1);
      }
    }

    session.appIds = appIds;
    this._saveAppComparisonSession(session);

    return {
      success: true,
      selectedAppIds: appIds,
      maxSelectable,
      message: 'Selection updated'
    };
  }

  // getCurrentAppComparisonSelection()
  getCurrentAppComparisonSelection() {
    const maxSelectable = 2;
    const session = this._getOrCreateAppComparisonSession();
    const sitePref = this._getOrCreateSitePreference();
    const selectedApps = [];

    (session.appIds || []).forEach(id => {
      const app = this._getAppById(id);
      if (app) {
        selectedApps.push({
          id: app.id,
          name: app.name,
          displayPrice: this._getAppDisplayPrice(app, sitePref.currency),
          pricingModel: app.pricingModel,
          rating: app.rating || null
        });
      }
    });

    return {
      maxSelectable,
      selectedApps
    };
  }

  // getAppComparisonView()
  getAppComparisonView() {
    const session = this._getOrCreateAppComparisonSession();
    const sitePref = this._getOrCreateSitePreference();
    const categories = this._getFromStorage('app_categories');

    const apps = (session.appIds || [])
      .map(id => this._getAppById(id))
      .filter(a => !!a)
      .map(app => {
        const category = categories.find(c => c.id === app.categoryId) || null;
        const platforms = this._getAppPlatforms(app.id).map(p => ({
          platform: p.platform,
          minOsVersion: p.minOsVersion,
          isSupported: p.isSupported
        }));
        const displayPrice = this._getAppDisplayPrice(app, sitePref.currency);
        return {
          id: app.id,
          name: app.name,
          slug: app.slug || null,
          categoryName: category ? category.name : null,
          pricingModel: app.pricingModel,
          monthlyPrice: app.monthlyPrice || null,
          oneTimePrice: app.oneTimePrice || null,
          baseCurrency: app.baseCurrency,
          displayPrice,
          rating: app.rating || null,
          ratingCount: app.ratingCount || 0,
          featureTags: Array.isArray(app.featureTags) ? app.featureTags : [],
          platforms,
          // Foreign key resolution
          category: category
        };
      });

    // Instrumentation for task completion tracking (task_8)
    try {
      if ((session.appIds || []).length === 2) {
        localStorage.setItem(
          'task8_comparisonViewed',
          JSON.stringify({
            appIds: (session.appIds || []).slice(),
            viewedAt: new Date().toISOString()
          })
        );
      }
    } catch (e) {}

    return {
      apps,
      createdAt: session.createdAt
    };
  }

  // clearAppComparisonSelection()
  clearAppComparisonSelection() {
    const session = this._getOrCreateAppComparisonSession();
    session.appIds = [];
    this._saveAppComparisonSession(session);
    return {
      success: true,
      message: 'Comparison selection cleared'
    };
  }

  // getAppDetail(appId)
  getAppDetail(appId) {
    const app = this._getAppById(appId);
    if (!app) {
      return null;
    }
    const sitePref = this._getOrCreateSitePreference();
    const category = this._getCategoryById(app.categoryId);
    const platformsRaw = this._getAppPlatforms(app.id);
    const platforms = platformsRaw.map(p => ({
      platform: p.platform,
      minOsVersion: p.minOsVersion,
      isSupported: p.isSupported,
      storeUrl: p.storeUrl || null,
      notes: p.notes || null
    }));

    const displayPrice = this._getAppDisplayPrice(app, sitePref.currency);

    // Build CTAs
    const ctas = [];

    if (app.hasFreeTrial) {
      const days = app.freeTrialDays || null;
      const label = days ? 'Start ' + days + '-day Free Trial' : 'Start Free Trial';
      ctas.push({
        actionType: 'start_trial',
        label: label,
        platform: null
      });
    }

    if (app.pricingModel === 'subscription') {
      ctas.push({
        actionType: 'subscribe',
        label: 'Subscribe',
        platform: null
      });
    }

    if (app.pricingModel === 'one_time_purchase') {
      ctas.push({
        actionType: 'buy_now',
        label: 'Buy Now',
        platform: null
      });
    }

    platformsRaw.forEach(p => {
      if (p.storeUrl) {
        if (p.platform === 'android') {
          ctas.push({
            actionType: 'get_it_on_google_play',
            label: 'Get it on Google Play',
            platform: 'android'
          });
        } else if (p.platform === 'ios' || p.platform === 'ipad') {
          ctas.push({
            actionType: 'download_on_app_store',
            label: 'Download on the App Store',
            platform: p.platform
          });
        }
      }
    });

    // Instrumentation for task completion tracking (task_1)
    try {
      localStorage.setItem('task1_selectedAppId', appId);
    } catch (e) {}

    return {
      id: app.id,
      name: app.name,
      slug: app.slug || null,
      category: category
        ? { id: category.id, name: category.name }
        : { id: null, name: null },
      shortDescription: app.shortDescription || null,
      description: app.description || null,
      pricingModel: app.pricingModel,
      monthlyPrice: app.monthlyPrice || null,
      oneTimePrice: app.oneTimePrice || null,
      baseCurrency: app.baseCurrency,
      displayPrice,
      rating: app.rating || null,
      ratingCount: app.ratingCount || 0,
      featureTags: Array.isArray(app.featureTags) ? app.featureTags : [],
      hasFreeTrial: !!app.hasFreeTrial,
      freeTrialDays: app.freeTrialDays || null,
      isActive: !!app.isActive,
      platforms,
      screenshots: Array.isArray(app.screenshots) ? app.screenshots : [],
      compatibilitySummary: app.compatibilitySummary || '',
      ctas
    };
  }

  // initiateAppAcquisition(appId, actionType, billingFrequency)
  initiateAppAcquisition(appId, actionType, billingFrequency) {
    const app = this._getAppById(appId);
    if (!app) {
      return {
        success: false,
        orderCreated: false,
        orderType: null,
        redirectTo: null,
        message: 'App not found'
      };
    }

    const allowedActions = ['start_trial', 'buy_now', 'subscribe'];
    if (!allowedActions.includes(actionType)) {
      return {
        success: false,
        orderCreated: false,
        orderType: null,
        redirectTo: null,
        message: 'Invalid action type'
      };
    }

    const sitePref = this._getOrCreateSitePreference();
    let orderType = null;
    let billingFreq = billingFrequency || 'monthly';
    let totalAmount = 0;

    if (actionType === 'start_trial') {
      orderType = 'app_subscription_trial';
      billingFreq = 'monthly';
      totalAmount = 0;
    } else if (actionType === 'buy_now') {
      orderType = 'app_purchase';
      billingFreq = 'one_time';
      if (app.oneTimePrice != null) {
        totalAmount = this._applyCurrencyConversion(
          app.oneTimePrice,
          app.baseCurrency,
          sitePref.currency
        ) || 0;
      }
    } else if (actionType === 'subscribe') {
      orderType = 'app_purchase';
      if (!billingFreq || (billingFreq !== 'monthly' && billingFreq !== 'yearly')) {
        billingFreq = 'monthly';
      }
      if (app.monthlyPrice != null) {
        let baseAmount = app.monthlyPrice;
        if (billingFreq === 'yearly') {
          baseAmount = app.monthlyPrice * 12;
        }
        totalAmount = this._applyCurrencyConversion(
          baseAmount,
          app.baseCurrency,
          sitePref.currency
        ) || 0;
      }
    }

    const orders = this._getFromStorage('orders');
    const now = new Date().toISOString();
    const order = {
      id: this._generateId('order'),
      orderType,
      planId: null,
      appId: app.id,
      planConfigurationId: null,
      totalAmount,
      currency: sitePref.currency,
      billingFrequency: billingFreq,
      status: 'pending',
      createdAt: now,
      updatedAt: null
    };
    orders.push(order);
    this._saveToStorage('orders', orders);
    this._setCurrentOrderId(order.id);

    return {
      success: true,
      orderCreated: true,
      orderType: orderType,
      redirectTo: 'checkout',
      message: 'Order initiated'
    };
  }

  // getPricingPageOptions()
  getPricingPageOptions() {
    const billingFrequencies = [
      { key: 'monthly', label: 'Monthly' },
      { key: 'yearly', label: 'Yearly' }
    ];

    const deviceLimitFilters = [
      { minDevices: 1, label: '1 device' },
      { minDevices: 3, label: '3+ devices' },
      { minDevices: 5, label: '5+ devices' }
    ];

    const sortOptions = [
      { key: 'price', label: 'Price' },
      { key: 'device_limit', label: 'Device limit' },
      { key: 'name', label: 'Name' }
    ];

    return {
      billingFrequencies,
      deviceLimitFilters,
      sortOptions
    };
  }

  // listSubscriptionPlans(billingFrequency, minDeviceLimit, maxMonthlyPrice,
  //                       includedPlatformFilters, sortBy, sortDirection)
  listSubscriptionPlans(
    billingFrequency,
    minDeviceLimit,
    maxMonthlyPrice,
    includedPlatformFilters,
    sortBy,
    sortDirection
  ) {
    const sitePref = this._getOrCreateSitePreference();
    const plans = this._getFromStorage('subscription_plans').filter(p => p.isActive);
    const freq = billingFrequency || 'monthly';
    const minDevices = minDeviceLimit != null ? minDeviceLimit : null;
    const platformFilters = Array.isArray(includedPlatformFilters)
      ? includedPlatformFilters
      : [];
    const sortKey = sortBy || 'price';
    const dir = sortDirection === 'desc' ? 'desc' : 'asc';

    const filtered = plans.filter(plan => {
      if (!Array.isArray(plan.availableBillingFrequencies)) return false;
      if (!plan.availableBillingFrequencies.includes(freq)) return false;
      if (minDevices != null && plan.deviceLimit < minDevices) return false;

      if (platformFilters.length > 0) {
        const included = Array.isArray(plan.includedPlatforms)
          ? plan.includedPlatforms
          : [];
        const allIncluded = platformFilters.every(p => included.includes(p));
        if (!allIncluded) return false;
      }

      if (maxMonthlyPrice != null) {
        // Normalize to monthly equivalent in current site currency
        let monthlyEquivalent = null;
        if (freq === 'monthly' && plan.monthlyPrice != null) {
          monthlyEquivalent = plan.monthlyPrice;
        } else if (freq === 'yearly' && plan.yearlyPrice != null) {
          monthlyEquivalent = plan.yearlyPrice / 12;
        }
        if (monthlyEquivalent != null) {
          const converted = this._applyCurrencyConversion(
            monthlyEquivalent,
            plan.baseCurrency,
            sitePref.currency
          );
          if (converted != null && converted > maxMonthlyPrice) return false;
        }
      }

      return true;
    });

    filtered.sort((a, b) => {
      const multiplier = dir === 'desc' ? -1 : 1;
      if (sortKey === 'price') {
        const priceFor = plan => {
          const converted = this._getPlanPriceForFrequency(
            plan,
            freq,
            sitePref.currency
          );
          return converted != null ? converted : Number.POSITIVE_INFINITY;
        };
        const pa = priceFor(a);
        const pb = priceFor(b);
        if (pa === pb) return 0;
        return pa > pb ? 1 * multiplier : -1 * multiplier;
      }
      if (sortKey === 'device_limit') {
        if (a.deviceLimit === b.deviceLimit) return 0;
        return a.deviceLimit > b.deviceLimit ? 1 * multiplier : -1 * multiplier;
      }
      if (sortKey === 'name') {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na === nb) return 0;
        return na > nb ? 1 * multiplier : -1 * multiplier;
      }
      return 0;
    });

    const items = filtered.map(plan => {
      const price = this._getPlanPriceForFrequency(plan, freq, sitePref.currency);
      const suffix = freq === 'monthly' ? '/month' : '/year';
      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug || null,
        description: plan.description || null,
        monthlyPrice: plan.monthlyPrice || null,
        yearlyPrice: plan.yearlyPrice || null,
        baseCurrency: plan.baseCurrency,
        deviceLimit: plan.deviceLimit,
        includedPlatforms: Array.isArray(plan.includedPlatforms)
          ? plan.includedPlatforms
          : [],
        isPopular: !!plan.isPopular,
        isActive: !!plan.isActive,
        displayPrice:
          price != null
            ? this._formatPrice(price, sitePref.currency, suffix)
            : ''
      };
    });

    return {
      total: items.length,
      items,
      appliedFilters: {
        billingFrequency: freq,
        minDeviceLimit: minDevices,
        maxMonthlyPrice,
        includedPlatformFilters: platformFilters,
        sortBy: sortKey,
        sortDirection: dir
      }
    };
  }

  // startPlanConfiguration(planId, selectedBillingFrequency)
  startPlanConfiguration(planId, selectedBillingFrequency) {
    const plan = this._getPlanById(planId);
    if (!plan || !plan.isActive) {
      return {
        success: false,
        configuration: null,
        message: 'Plan not found or inactive'
      };
    }
    const freq = selectedBillingFrequency || 'monthly';
    if (
      !Array.isArray(plan.availableBillingFrequencies) ||
      !plan.availableBillingFrequencies.includes(freq)
    ) {
      return {
        success: false,
        configuration: null,
        message: 'Selected billing frequency not available for this plan'
      };
    }

    const configs = this._getFromStorage('plan_configurations');
    const now = new Date().toISOString();
    const config = {
      id: this._generateId('plan_config'),
      planId: plan.id,
      selectedBillingFrequency: freq,
      selectedPlatforms: Array.isArray(plan.includedPlatforms)
        ? plan.includedPlatforms.slice()
        : [],
      createdAt: now
    };
    configs.push(config);
    this._saveToStorage('plan_configurations', configs);
    this._setCurrentPlanConfigurationId(config.id);

    const sitePref = this._getOrCreateSitePreference();
    const pricePerPeriod = this._getPlanPriceForFrequency(
      plan,
      freq,
      plan.baseCurrency
    );

    return {
      success: true,
      configuration: {
        id: config.id,
        planId: plan.id,
        planName: plan.name,
        selectedBillingFrequency: freq,
        deviceLimit: plan.deviceLimit,
        includedPlatformsAvailable: Array.isArray(plan.includedPlatforms)
          ? plan.includedPlatforms
          : [],
        selectedPlatforms: config.selectedPlatforms,
        pricePerPeriod: pricePerPeriod,
        baseCurrency: plan.baseCurrency || sitePref.currency
      },
      message: 'Plan configuration started'
    };
  }

  // getCurrentPlanConfiguration()
  getCurrentPlanConfiguration() {
    const configId = this._getCurrentPlanConfigurationId();
    if (!configId) {
      return {
        configuration: null
      };
    }
    const configs = this._getFromStorage('plan_configurations');
    const config = configs.find(c => c.id === configId);
    if (!config) {
      return {
        configuration: null
      };
    }
    const plan = this._getPlanById(config.planId);
    if (!plan) {
      return {
        configuration: null
      };
    }
    const freq = config.selectedBillingFrequency;
    const sitePref = this._getOrCreateSitePreference();
    const pricePerPeriod = this._getPlanPriceForFrequency(
      plan,
      freq,
      plan.baseCurrency
    );

    return {
      configuration: {
        id: config.id,
        planId: plan.id,
        planName: plan.name,
        selectedBillingFrequency: freq,
        deviceLimit: plan.deviceLimit,
        includedPlatformsAvailable: Array.isArray(plan.includedPlatforms)
          ? plan.includedPlatforms
          : [],
        selectedPlatforms: Array.isArray(config.selectedPlatforms)
          ? config.selectedPlatforms
          : [],
        pricePerPeriod: pricePerPeriod,
        baseCurrency: plan.baseCurrency || sitePref.currency
      }
    };
  }

  // updateCurrentPlanConfiguration(selectedPlatforms)
  updateCurrentPlanConfiguration(selectedPlatforms) {
    const configId = this._getCurrentPlanConfigurationId();
    if (!configId) {
      return {
        success: false,
        configuration: null,
        message: 'No plan configuration in progress'
      };
    }
    const configs = this._getFromStorage('plan_configurations');
    const idx = configs.findIndex(c => c.id === configId);
    if (idx === -1) {
      return {
        success: false,
        configuration: null,
        message: 'Plan configuration not found'
      };
    }
    configs[idx].selectedPlatforms = Array.isArray(selectedPlatforms)
      ? selectedPlatforms
      : [];
    this._saveToStorage('plan_configurations', configs);

    const updatedConfig = configs[idx];
    const plan = this._getPlanById(updatedConfig.planId);
    if (!plan) {
      return {
        success: false,
        configuration: null,
        message: 'Associated plan not found'
      };
    }
    const freq = updatedConfig.selectedBillingFrequency;
    const sitePref = this._getOrCreateSitePreference();
    const pricePerPeriod = this._getPlanPriceForFrequency(
      plan,
      freq,
      plan.baseCurrency
    );

    return {
      success: true,
      configuration: {
        id: updatedConfig.id,
        planId: plan.id,
        planName: plan.name,
        selectedBillingFrequency: freq,
        deviceLimit: plan.deviceLimit,
        includedPlatformsAvailable: Array.isArray(plan.includedPlatforms)
          ? plan.includedPlatforms
          : [],
        selectedPlatforms: updatedConfig.selectedPlatforms,
        pricePerPeriod: pricePerPeriod,
        baseCurrency: plan.baseCurrency || sitePref.currency
      },
      message: 'Plan configuration updated'
    };
  }

  // proceedToCheckoutWithCurrentPlan()
  proceedToCheckoutWithCurrentPlan() {
    const configId = this._getCurrentPlanConfigurationId();
    if (!configId) {
      return {
        success: false,
        orderType: null,
        redirectTo: null,
        message: 'No plan configuration in progress'
      };
    }
    const configs = this._getFromStorage('plan_configurations');
    const config = configs.find(c => c.id === configId);
    if (!config) {
      return {
        success: false,
        orderType: null,
        redirectTo: null,
        message: 'Plan configuration not found'
      };
    }
    const plan = this._getPlanById(config.planId);
    if (!plan) {
      return {
        success: false,
        orderType: null,
        redirectTo: null,
        message: 'Associated plan not found'
      };
    }
    const sitePref = this._getOrCreateSitePreference();
    const freq = config.selectedBillingFrequency;
    const amountBase = this._getPlanPriceForFrequency(
      plan,
      freq,
      plan.baseCurrency
    );
    const totalAmount = this._applyCurrencyConversion(
      amountBase,
      plan.baseCurrency,
      sitePref.currency
    );

    const orders = this._getFromStorage('orders');
    const now = new Date().toISOString();
    const order = {
      id: this._generateId('order'),
      orderType: 'plan_subscription',
      planId: plan.id,
      appId: null,
      planConfigurationId: config.id,
      totalAmount: totalAmount != null ? totalAmount : 0,
      currency: sitePref.currency,
      billingFrequency: freq,
      status: 'pending',
      createdAt: now,
      updatedAt: null
    };
    orders.push(order);
    this._saveToStorage('orders', orders);
    this._setCurrentOrderId(order.id);

    return {
      success: true,
      orderType: 'plan_subscription',
      redirectTo: 'checkout',
      message: 'Proceed to checkout'
    };
  }

  // getCurrentOrderSummary()
  getCurrentOrderSummary() {
    const orderId = this._getCurrentOrderId();
    if (!orderId) {
      return {
        hasOrder: false,
        order: null
      };
    }
    const orders = this._getFromStorage('orders');
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return {
        hasOrder: false,
        order: null
      };
    }

    let plan = null;
    let app = null;
    let trialDays = null;
    const summaryLines = [];

    if (order.planId) {
      plan = this._getPlanById(order.planId);
      if (plan) {
        summaryLines.push('Plan: ' + plan.name);
      }
    }
    if (order.appId) {
      app = this._getAppById(order.appId);
      if (app) {
        summaryLines.push('App: ' + app.name);
        if (order.orderType === 'app_subscription_trial') {
          trialDays = app.freeTrialDays || null;
        }
      }
    }

    summaryLines.push('Billing frequency: ' + order.billingFrequency);
    summaryLines.push('Total amount: ' + order.totalAmount);

    return {
      hasOrder: true,
      order: {
        orderType: order.orderType,
        currency: order.currency,
        billingFrequency: order.billingFrequency,
        totalAmount: order.totalAmount,
        status: order.status,
        trialDays: trialDays,
        plan: plan
          ? { id: plan.id, name: plan.name }
          : null,
        app: app
          ? { id: app.id, name: app.name }
          : null,
        summaryLines
      }
    };
  }

  // submitCheckout(paymentMethod, acceptTerms)
  submitCheckout(paymentMethod, acceptTerms) {
    if (!acceptTerms) {
      return {
        success: false,
        orderStatus: 'failed',
        message: 'You must accept the terms of use',
        redirectTo: null
      };
    }
    const orderId = this._getCurrentOrderId();
    if (!orderId) {
      return {
        success: false,
        orderStatus: 'failed',
        message: 'No pending order',
        redirectTo: null
      };
    }
    const orders = this._getFromStorage('orders');
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) {
      return {
        success: false,
        orderStatus: 'failed',
        message: 'Order not found',
        redirectTo: null
      };
    }
    const order = orders[idx];
    const requiresPayment = order.totalAmount > 0;

    if (requiresPayment && !paymentMethod) {
      return {
        success: false,
        orderStatus: 'failed',
        message: 'Payment method is required',
        redirectTo: null
      };
    }

    // For free trials, paymentMethod can be 'none' or omitted

    order.status = 'completed';
    order.updatedAt = new Date().toISOString();
    orders[idx] = order;
    this._saveToStorage('orders', orders);
    // Optionally, keep current_order_id as is or clear; we keep for summary

    return {
      success: true,
      orderStatus: 'completed',
      message: 'Checkout completed',
      redirectTo: 'confirmation'
    };
  }

  // getSupportOverview()
  getSupportOverview() {
    const categories = this._getFromStorage('faq_categories');
    const articles = this._getFromStorage('faq_articles');

    const categoriesOut = categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug || null,
      description: c.description || ''
    }));

    const popularArticlesRaw = articles.filter(a => a.isPopular);
    popularArticlesRaw.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    const popularArticles = popularArticlesRaw.map(a => {
      const category = categories.find(c => c.id === a.categoryId) || null;
      return {
        id: a.id,
        title: a.title,
        excerpt: a.excerpt || '',
        categoryName: category ? category.name : null,
        // Foreign key resolution
        category: category
      };
    });

    const quickLinks = [
      {
        key: 'billing_support',
        label: 'Billing & Payments support',
        target: 'contact_support',
        issueType: 'billing_payments'
      },
      {
        key: 'subscription_help',
        label: 'Subscription help',
        target: 'faq',
        issueType: 'subscription'
      }
    ];

    return {
      categories: categoriesOut,
      popularArticles,
      quickLinks
    };
  }

  // getFaqCategories()
  getFaqCategories() {
    const categories = this._getFromStorage('faq_categories');
    return {
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug || null,
        description: c.description || ''
      }))
    };
  }

  // searchFaqArticles(query, categoryId, limit, offset)
  searchFaqArticles(query, categoryId, limit = 20, offset = 0) {
    const articles = this._getFromStorage('faq_articles');
    const categories = this._getFromStorage('faq_categories');

    const q = query ? String(query).toLowerCase() : null;

    const filtered = articles.filter(a => {
      if (q) {
        const keywordsText = Array.isArray(a.keywords) ? a.keywords.join(' ') : '';
        const haystack = (
          (a.title || '') +
          ' ' +
          (a.excerpt || '') +
          ' ' +
          (a.body || '') +
          ' ' +
          keywordsText
        ).toLowerCase();
        // Match on individual words instead of requiring the full query string as a substring
        const terms = q.split(/\s+/).filter(term => term.length > 0);
        const matchesAll = terms.every(term => haystack.includes(term));
        if (!matchesAll) return false;
      }
      if (categoryId && a.categoryId !== categoryId) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    const total = filtered.length;
    const sliced = filtered.slice(offset, offset + limit);

    const items = sliced.map(a => {
      const category = categories.find(c => c.id === a.categoryId) || null;
      return {
        id: a.id,
        title: a.title,
        slug: a.slug || null,
        excerpt: a.excerpt || '',
        categoryName: category ? category.name : null,
        isPopular: !!a.isPopular,
        createdAt: a.createdAt,
        // Foreign key resolution
        category: category
      };
    });

    // Instrumentation for task completion tracking (task_3)
    try {
      if (query) {
        localStorage.setItem(
          'task3_faqSearchParams',
          JSON.stringify({
            query,
            categoryId
          })
        );
      }
    } catch (e) {}

    return {
      total,
      items,
      appliedFilters: {
        query,
        categoryId
      }
    };
  }

  // getFaqArticleDetail(articleId)
  getFaqArticleDetail(articleId) {
    const articles = this._getFromStorage('faq_articles');
    const categories = this._getFromStorage('faq_categories');
    const sections = this._getFromStorage('faq_sections');

    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return null;
    }
    const category = categories.find(c => c.id === article.categoryId) || null;

    const articleSections = sections
      .filter(s => s.articleId === article.id)
      .sort((a, b) => {
        const sa = a.sortOrder != null ? a.sortOrder : 0;
        const sb = b.sortOrder != null ? b.sortOrder : 0;
        return sa - sb;
      })
      .map(s => ({
        id: s.id,
        title: s.title,
        anchor: s.anchor,
        sortOrder: s.sortOrder != null ? s.sortOrder : 0
      }));

    const relatedArticles = articles
      .filter(a => a.id !== article.id && a.categoryId === article.categoryId)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug || null
      }));

    // Instrumentation for task completion tracking (task_3)
    try {
      localStorage.setItem('task3_openedArticleId', articleId);
    } catch (e) {}

    return {
      id: article.id,
      title: article.title,
      slug: article.slug || null,
      body: article.body || '',
      category: category
        ? { id: category.id, name: category.name }
        : { id: null, name: null },
      sections: articleSections,
      relatedArticles,
      createdAt: article.createdAt || null,
      updatedAt: article.updatedAt || null
    };
  }

  // getContactSupportFormOptions(source, prefillFromArticleId)
  getContactSupportFormOptions(source, prefillFromArticleId) {
    const appsRaw = this._getFromStorage('apps');
    const apps = appsRaw.map(a => ({ id: a.id, name: a.name }));

    const issueTypes = [
      { key: 'billing_payments', label: 'Billing & Payments' },
      { key: 'subscription', label: 'Subscription' },
      { key: 'technical', label: 'Technical' },
      { key: 'general', label: 'General' },
      { key: 'refund', label: 'Refund' }
    ];

    const priorities = [
      { key: 'low', label: 'Low' },
      { key: 'normal', label: 'Normal' },
      { key: 'high', label: 'High' }
    ];

    const platforms = [
      { key: 'android', label: 'Android' },
      { key: 'ios', label: 'iOS' },
      { key: 'ipad', label: 'iPad' },
      { key: 'web', label: 'Web' },
      { key: 'other', label: 'Other' }
    ];

    const defaultValues = {
      source: source || 'support_form',
      issueType: '',
      priority: 'normal',
      subject: '',
      message: '',
      email: ''
    };

    let refundContext = { articleId: null, articleTitle: null };

    if (source === 'faq_refund_link' && prefillFromArticleId) {
      const articles = this._getFromStorage('faq_articles');
      const article = articles.find(a => a.id === prefillFromArticleId) || null;
      defaultValues.source = 'faq_refund_link';
      defaultValues.issueType = 'refund';
      defaultValues.priority = 'normal';
      defaultValues.subject = article
        ? 'Refund request - ' + article.title
        : 'Refund request';
      defaultValues.message = article
        ? 'Regarding article: ' + article.title + '\n\nPlease describe your refund issue here.'
        : 'Please describe your refund issue here.';
      refundContext = {
        articleId: article ? article.id : null,
        articleTitle: article ? article.title : null
      };
    }

    // Instrumentation for task completion tracking (task_3)
    try {
      if (source === 'faq_refund_link') {
        localStorage.setItem(
          'task3_refundContactContext',
          JSON.stringify({
            source,
            articleId: refundContext.articleId
          })
        );
      }
    } catch (e) {}

    return {
      apps,
      issueTypes,
      priorities,
      platforms,
      defaultValues,
      refundContext
    };
  }

  // submitSupportTicket(appId, platform, issueType, priority, subject, message, email, source)
  submitSupportTicket(
    appId,
    platform,
    issueType,
    priority,
    subject,
    message,
    email,
    source
  ) {
    if (!issueType || !priority || !message || !email || !source) {
      return {
        success: false,
        ticket: null,
        message: 'Missing required fields'
      };
    }

    const allowedIssueTypes = [
      'billing_payments',
      'subscription',
      'technical',
      'general',
      'refund'
    ];
    const allowedPriorities = ['low', 'normal', 'high'];
    const allowedPlatforms = ['android', 'ios', 'ipad', 'web', 'other'];
    const allowedSources = ['support_form', 'faq_refund_link', 'other'];

    if (!allowedIssueTypes.includes(issueType)) {
      return {
        success: false,
        ticket: null,
        message: 'Invalid issue type'
      };
    }
    if (!allowedPriorities.includes(priority)) {
      return {
        success: false,
        ticket: null,
        message: 'Invalid priority'
      };
    }
    if (platform && !allowedPlatforms.includes(platform)) {
      return {
        success: false,
        ticket: null,
        message: 'Invalid platform'
      };
    }
    if (!allowedSources.includes(source)) {
      return {
        success: false,
        ticket: null,
        message: 'Invalid source'
      };
    }

    const tickets = this._getFromStorage('support_tickets');
    const now = new Date().toISOString();
    const ticket = {
      id: this._generateId('support_ticket'),
      appId: appId || null,
      platform: platform || null,
      issueType,
      priority,
      subject: subject || null,
      message,
      email,
      status: 'open',
      source,
      createdAt: now,
      updatedAt: null
    };
    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);

    return {
      success: true,
      ticket: {
        id: ticket.id,
        status: ticket.status,
        createdAt: ticket.createdAt
      },
      message: 'Support ticket submitted'
    };
  }

  // getTutorialFilterOptions()
  getTutorialFilterOptions() {
    const appsRaw = this._getFromStorage('apps');
    const apps = appsRaw.map(a => ({ id: a.id, name: a.name }));

    const platforms = [
      { key: 'android', label: 'Android' },
      { key: 'ios', label: 'iOS' },
      { key: 'ipad', label: 'iPad' },
      { key: 'web', label: 'Web' }
    ];

    const sortOptions = [
      { key: 'published_at', label: 'Newest first' },
      { key: 'title', label: 'Title' }
    ];

    return {
      apps,
      platforms,
      sortOptions
    };
  }

  // searchTutorials(appId, platform, query, sortBy, sortDirection, limit, offset)
  searchTutorials(
    appId,
    platform,
    query,
    sortBy,
    sortDirection,
    limit = 20,
    offset = 0
  ) {
    const tutorials = this._getFromStorage('tutorials');
    const apps = this._getFromStorage('apps');

    const q = query ? String(query).toLowerCase() : null;
    const sortKey = sortBy || 'published_at';
    const dir = sortDirection === 'asc' ? 'asc' : 'desc';

    const filtered = tutorials.filter(t => {
      if (appId && t.appId !== appId) return false;
      if (platform && t.platform !== platform) return false;
      if (q) {
        const tagsText = Array.isArray(t.topicTags) ? t.topicTags.join(' ') : '';
        const haystack = (
          (t.title || '') +
          ' ' +
          (t.description || '') +
          ' ' +
          tagsText
        ).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const multiplier = dir === 'asc' ? 1 : -1;
      if (sortKey === 'published_at') {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        if (da === db) return 0;
        return da > db ? 1 * multiplier : -1 * multiplier;
      }
      if (sortKey === 'title') {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta === tb) return 0;
        return ta > tb ? 1 * multiplier : -1 * multiplier;
      }
      return 0;
    });

    const total = filtered.length;
    const sliced = filtered.slice(offset, offset + limit);

    const items = sliced.map(t => {
      const app = apps.find(a => a.id === t.appId) || null;
      return {
        id: t.id,
        title: t.title,
        slug: t.slug || null,
        description: t.description || '',
        appName: app ? app.name : null,
        platform: t.platform,
        publishedAt: t.publishedAt,
        isFeatured: !!t.isFeatured,
        // Foreign key resolution
        app: app
      };
    });

    // Instrumentation for task completion tracking (task_5)
    try {
      if (appId && platform === 'ios' && query) {
        localStorage.setItem(
          'task5_searchParams',
          JSON.stringify({
            appId,
            platform,
            query,
            sortBy: sortKey,
            sortDirection: dir
          })
        );
      }
    } catch (e) {}

    return {
      total,
      items,
      appliedFilters: {
        appId,
        platform,
        query,
        sortBy: sortKey,
        sortDirection: dir
      }
    };
  }

  // getTutorialDetail(tutorialId)
  getTutorialDetail(tutorialId) {
    const tutorials = this._getFromStorage('tutorials');
    const apps = this._getFromStorage('apps');

    const t = tutorials.find(tut => tut.id === tutorialId);
    if (!t) {
      return null;
    }
    const app = apps.find(a => a.id === t.appId) || null;

    const relatedTutorials = tutorials
      .filter(rt => rt.id !== t.id && rt.appId === t.appId)
      .sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 5)
      .map(rt => ({
        id: rt.id,
        title: rt.title,
        slug: rt.slug || null
      }));

    // Instrumentation for task completion tracking (task_5)
    try {
      localStorage.setItem('task5_openedTutorialId', tutorialId);
    } catch (e) {}

    return {
      id: t.id,
      title: t.title,
      slug: t.slug || null,
      description: t.description || '',
      app: app
        ? { id: app.id, name: app.name }
        : { id: null, name: null },
      platform: t.platform,
      topicTags: Array.isArray(t.topicTags) ? t.topicTags : [],
      videoUrl: t.videoUrl || null,
      durationSeconds: t.durationSeconds || null,
      publishedAt: t.publishedAt || null,
      shareUrl: t.shareUrl || null,
      relatedTutorials
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        return {
          title: data.title || '',
          body: data.body || '',
          sections: Array.isArray(data.sections) ? data.sections : [],
          contactEmail: data.contactEmail || ''
        };
      } catch (e) {}
    }
    return {
      title: '',
      body: '',
      sections: [],
      contactEmail: ''
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        return {
          title: data.title || '',
          body: data.body || '',
          lastUpdated: data.lastUpdated || ''
        };
      } catch (e) {}
    }
    return {
      title: '',
      body: '',
      lastUpdated: ''
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    const raw = localStorage.getItem('terms_of_use_content');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        return {
          title: data.title || '',
          body: data.body || '',
          lastUpdated: data.lastUpdated || ''
        };
      } catch (e) {}
    }
    return {
      title: '',
      body: '',
      lastUpdated: ''
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