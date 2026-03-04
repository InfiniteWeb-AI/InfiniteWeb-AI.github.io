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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    // Generic ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    const ensureKey = (key, defaultValue) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensureKey('account_profiles', []);
    ensureKey('subscription_plans', []);
    ensureKey('subscriptions', []);
    ensureKey('payment_methods', []);
    ensureKey('payment_transactions', []);
    ensureKey('homes', []);
    ensureKey('rooms', []);
    ensureKey('device_models', []);
    ensureKey('registered_devices', []);
    ensureKey('notification_settings', []);
    ensureKey('household_members', []);
    ensureKey('household_member_room_access', []);
    ensureKey('household_member_feature_access', []);
    ensureKey('privacy_settings', []);
    ensureKey('security_settings', []);
    ensureKey('automations', []);
    ensureKey('automation_triggers', []);
    ensureKey('automation_actions', []);

    // Signup & config-related storage
    ensureKey('signup_countries', [
      { code: 'US', name: 'United States', isNorthAmerica: true },
      { code: 'CA', name: 'Canada', isNorthAmerica: true },
      { code: 'MX', name: 'Mexico', isNorthAmerica: true }
    ]); // [{code,name,isNorthAmerica}]
    ensureKey('signup_time_zones', [
      { id: 'america_central', label: 'Central Time (US & Canada)' },
      { id: 'america_eastern', label: 'Eastern Time (US & Canada)' },
      { id: 'america_pacific', label: 'Pacific Time (US & Canada)' }
    ]); // [{id,label}]
    ensureKey('signup_marketing_defaults', {
      marketingEmailsEnabled: true,
      marketingPushEnabled: true
    });
    ensureKey('signup_default_country_code', null);
    ensureKey('signup_default_time_zone_id', null);
    ensureKey('signup_requires_terms_acceptance', true);

    // Homepage / marketing content
    ensureKey('config_home_overview_content', {
      heroTitle: 'Control your smart home from anywhere',
      heroSubtitle: 'Secure, automate, and personalize every room in minutes.',
      benefitHighlights: [
        {
          id: 'security',
          title: 'Smarter security',
          description: 'Get instant alerts, remote lock control, and activity history in one place.',
          iconKey: 'shield'
        },
        {
          id: 'comfort',
          title: 'Comfort & energy',
          description: 'Optimize thermostats and lights to save energy without lifting a finger.',
          iconKey: 'thermostat'
        },
        {
          id: 'family',
          title: 'Made for families',
          description: 'Share access with family members while keeping control over settings.',
          iconKey: 'users'
        }
      ],
      supportedDeviceTypes: ['thermostat', 'light', 'camera', 'door_lock', 'sensor', 'hub']
    });

    ensureKey('config_home_primary_actions', {
      primaryCtaLabel: 'Sign Up',
      secondaryCtaLabel: 'Start Free Trial',
      showFreeTrial: true,
      primaryCtaType: 'sign_up'
    });

    // Subscription selection state
    ensureKey('subscription_state', {
      selectedPlanId: null,
      billingPeriod: null,
      subscriptionId: null
    });

    // Current session-like state
    if (!localStorage.getItem('current_account_profile_id')) {
      localStorage.setItem('current_account_profile_id', JSON.stringify(null));
    }

    // Content pages
    ensureKey('about_page_content', {
      mission: 'To make every home safer, smarter, and more energy efficient.',
      vision: 'A world where your home anticipates your needs and protects what matters most.',
      background: 'We build privacy-first smart home tools that work with the devices you already own.',
      differentiators: [
        {
          title: 'Privacy-first design',
          description: 'Your data belongs to you. We give you fine-grained control over what is shared.'
        },
        {
          title: 'Device-agnostic platform',
          description: 'Connect thermostats, lights, locks, and sensors from leading manufacturers.'
        },
        {
          title: 'Built-in security',
          description: 'PIN protection, account lockout, and detailed activity logs by default.'
        }
      ],
      securityAndPrivacyHighlights: [
        'End-to-end encryption for security events',
        'Granular notification and data sharing controls',
        'Regular third-party security audits'
      ]
    });

    ensureKey('help_center_content', {
      categories: [
        { id: 'getting_started', name: 'Getting Started' },
        { id: 'devices', name: 'Devices & Rooms' },
        { id: 'security', name: 'Security & PINs' },
        { id: 'billing', name: 'Billing & Subscriptions' }
      ],
      featuredFaqs: [
        {
          id: 'faq_create_home',
          question: 'How do I create my first home and add rooms?',
          answer: 'After signing up, open the Home Setup wizard to name your home and add rooms like Living Room and Bedroom.',
          categoryId: 'getting_started'
        },
        {
          id: 'faq_add_devices',
          question: 'How do I register new devices?',
          answer: 'Go to Devices in your dashboard, choose a room, then select devices from the catalog to register.',
          categoryId: 'devices'
        }
      ],
      gettingStartedGuides: [
        {
          id: 'guide_first_automation',
          title: 'Create your first automation',
          summary: 'Learn how to schedule lights and thermostats with simple routines.'
        }
      ]
    });

    ensureKey('support_contact_options', {
      supportEmail: 'support@smarthome.example.com',
      ticketFormAvailable: true,
      phoneSupportAvailable: false,
      hoursOfOperation: 'Monday–Friday, 9:00 AM–6:00 PM Central Time'
    });

    ensureKey('terms_of_service_content', {
      version: '1.0',
      lastUpdated: '2024-01-01',
      contentHtml: '<h1>Terms of Service</h1><p>These terms govern your use of the smart home service.</p>'
    });

    ensureKey('privacy_policy_content', {
      version: '1.0',
      lastUpdated: '2024-01-01',
      contentHtml: '<h1>Privacy Policy</h1><p>We explain what data we collect and how we use it.</p>'
    });

    // Household feature list
    ensureKey('config_household_features', [
      { key: 'settings', label: 'Settings' },
      { key: 'billing', label: 'Billing' },
      { key: 'security', label: 'Security' },
      { key: 'automations', label: 'Automations' },
      { key: 'notifications', label: 'Notifications' },
      { key: 'devices', label: 'Devices' }
    ]);
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : null;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : null;
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

  _setCurrentAccountProfileId(id) {
    this._saveToStorage('current_account_profile_id', id);
  }

  _getCurrentAccountProfileId() {
    return this._getFromStorage('current_account_profile_id', null);
  }

  _getCurrentAccountProfile() {
    const id = this._getCurrentAccountProfileId();
    if (!id) return null;
    const profiles = this._getFromStorage('account_profiles', []);
    return profiles.find(p => p.id === id) || null;
  }

  // ----------------------
  // Required internal helpers
  // ----------------------

  // Internal helper to get or create the single AccountProfile record for the current agent.
  _getOrCreateAccountProfile() {
    let profile = this._getCurrentAccountProfile();
    if (profile) return profile;

    // If no current profile, try first existing one
    const profiles = this._getFromStorage('account_profiles', []);
    if (profiles.length > 0) {
      profile = profiles[0];
      this._setCurrentAccountProfileId(profile.id);
      return profile;
    }

    // No profile exists yet; create a minimal placeholder.
    const now = this._nowIso();
    const newProfile = {
      id: this._generateId('acct'),
      email: '',
      username: '',
      password: '',
      country: '',
      time_zone: '',
      terms_accepted: false,
      terms_accepted_at: null,
      created_at: now
    };
    profiles.push(newProfile);
    this._saveToStorage('account_profiles', profiles);
    this._setCurrentAccountProfileId(newProfile.id);
    return newProfile;
  }

  // Internal helper to get the primary Home associated with the current agent.
  _getOrCreatePrimaryHome() {
    const homes = this._getFromStorage('homes', []);
    let home = homes.find(h => h.is_primary);
    if (home) return home;
    return null; // Do not auto-create to avoid surprising callers
  }

  // NotificationSettings defaults for current agent
  _getOrCreateNotificationSettings() {
    const account = this._getCurrentAccountProfile();
    const settingsList = this._getFromStorage('notification_settings', []);
    if (account) {
      let existing = settingsList.find(s => s.id === account.id);
      if (existing) return existing;
      const signupDefaults = this._getFromStorage('signup_marketing_defaults', {
        marketingEmailsEnabled: true,
        marketingPushEnabled: true
      });
      const now = this._nowIso();
      const newSettings = {
        id: account.id,
        security_alert_push_enabled: true,
        security_alert_email_enabled: true,
        security_alert_sms_enabled: false,
        marketing_emails_enabled: !!signupDefaults.marketingEmailsEnabled,
        marketing_special_offers_enabled: !!signupDefaults.marketingEmailsEnabled,
        marketing_push_notifications_enabled: !!signupDefaults.marketingPushEnabled,
        quiet_hours_enabled: false,
        quiet_hours_start_time: null,
        quiet_hours_end_time: null,
        time_zone: account.time_zone || null,
        updated_at: now
      };
      settingsList.push(newSettings);
      this._saveToStorage('notification_settings', settingsList);
      return newSettings;
    }

    // No account: fall back to first or create a generic global settings record
    if (settingsList.length > 0) return settingsList[0];
    const now = this._nowIso();
    const generic = {
      id: 'global',
      security_alert_push_enabled: true,
      security_alert_email_enabled: true,
      security_alert_sms_enabled: false,
      marketing_emails_enabled: true,
      marketing_special_offers_enabled: true,
      marketing_push_notifications_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_start_time: null,
      quiet_hours_end_time: null,
      time_zone: null,
      updated_at: now
    };
    settingsList.push(generic);
    this._saveToStorage('notification_settings', settingsList);
    return generic;
  }

  // PrivacySettings defaults for current agent
  _getOrCreatePrivacySettings() {
    const account = this._getCurrentAccountProfile();
    const list = this._getFromStorage('privacy_settings', []);
    if (account) {
      let existing = list.find(s => s.id === account.id);
      if (existing) return existing;
      const now = this._nowIso();
      const newSettings = {
        id: account.id,
        diagnostics_enabled: true,
        anonymized_analytics_enabled: true,
        third_party_sharing_enabled: false,
        personalized_ads_enabled: false,
        data_sharing_level: 'minimal',
        updated_at: now
      };
      list.push(newSettings);
      this._saveToStorage('privacy_settings', list);
      return newSettings;
    }

    if (list.length > 0) return list[0];
    const now = this._nowIso();
    const generic = {
      id: 'global',
      diagnostics_enabled: true,
      anonymized_analytics_enabled: true,
      third_party_sharing_enabled: false,
      personalized_ads_enabled: false,
      data_sharing_level: 'minimal',
      updated_at: now
    };
    list.push(generic);
    this._saveToStorage('privacy_settings', list);
    return generic;
  }

  // SecuritySettings defaults for current agent
  _getOrCreateSecuritySettings() {
    const account = this._getCurrentAccountProfile();
    const list = this._getFromStorage('security_settings', []);
    if (account) {
      let existing = list.find(s => s.id === account.id);
      if (existing) return existing;
      const now = this._nowIso();
      const newSettings = {
        id: account.id,
        security_pin: null,
        pin_set: false,
        require_pin_for_remote_lock: false,
        account_lockout_enabled: false,
        lockout_threshold_attempts: null,
        failed_attempts_count: 0,
        is_locked_out: false,
        updated_at: now
      };
      list.push(newSettings);
      this._saveToStorage('security_settings', list);
      return newSettings;
    }

    if (list.length > 0) return list[0];
    const now = this._nowIso();
    const generic = {
      id: 'global',
      security_pin: null,
      pin_set: false,
      require_pin_for_remote_lock: false,
      account_lockout_enabled: false,
      lockout_threshold_attempts: null,
      failed_attempts_count: 0,
      is_locked_out: false,
      updated_at: now
    };
    list.push(generic);
    this._saveToStorage('security_settings', list);
    return generic;
  }

  // Subscription state tracker
  _getOrCreateSubscriptionState() {
    const state = this._getFromStorage('subscription_state', null);
    if (state && typeof state === 'object') return state;
    const empty = { selectedPlanId: null, billingPeriod: null, subscriptionId: null };
    this._saveToStorage('subscription_state', empty);
    return empty;
  }

  // Household context helper
  _getOrCreateHouseholdContext() {
    return {
      members: this._getFromStorage('household_members', []),
      roomAccess: this._getFromStorage('household_member_room_access', []),
      featureAccess: this._getFromStorage('household_member_feature_access', [])
    };
  }

  // Automation entities loader
  _getAutomationEntitiesForAutomation(automationId) {
    const automations = this._getFromStorage('automations', []);
    const triggers = this._getFromStorage('automation_triggers', []);
    const actions = this._getFromStorage('automation_actions', []);
    const automation = automations.find(a => a.id === automationId) || null;
    const triggersFor = triggers.filter(t => t.automation_id === automationId);
    const actionsFor = actions.filter(a => a.automation_id === automationId);
    return { automation, triggers: triggersFor, actions: actionsFor };
  }

  // Utility: format feature key for labels
  _formatFeatureKey(key) {
    if (!key) return '';
    return key
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  // Utility: get active subscription (if any), with plan resolved
  _getActiveSubscriptionWithPlan() {
    const subscriptions = this._getFromStorage('subscriptions', []);
    const plans = this._getFromStorage('subscription_plans', []);
    // Prefer active, fallback to trialing
    const sorted = subscriptions.slice().sort((a, b) => {
      if (a.created_at < b.created_at) return 1;
      if (a.created_at > b.created_at) return -1;
      return 0;
    });
    const sub =
      sorted.find(s => s.status === 'active') ||
      sorted.find(s => s.status === 'trialing') ||
      null;
    if (!sub) return null;
    const plan = plans.find(p => p.id === sub.plan_id) || null;
    return Object.assign({}, sub, { plan: plan });
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeOverviewContent
  getHomeOverviewContent() {
    return this._getFromStorage('config_home_overview_content', {
      heroTitle: '',
      heroSubtitle: '',
      benefitHighlights: [],
      supportedDeviceTypes: []
    });
  }

  // getHomePrimaryActions
  getHomePrimaryActions() {
    return this._getFromStorage('config_home_primary_actions', {
      primaryCtaLabel: 'Sign Up',
      secondaryCtaLabel: '',
      showFreeTrial: false,
      primaryCtaType: 'sign_up'
    });
  }

  // getSignupOptions
  getSignupOptions() {
    const countries = this._getFromStorage('signup_countries', []);
    const timeZones = this._getFromStorage('signup_time_zones', []);
    const marketingDefaults = this._getFromStorage('signup_marketing_defaults', {
      marketingEmailsEnabled: true,
      marketingPushEnabled: true
    });
    let defaultCountryCode = this._getFromStorage('signup_default_country_code', null);
    let defaultTimeZoneId = this._getFromStorage('signup_default_time_zone_id', null);

    if (!defaultCountryCode && countries.length > 0) {
      defaultCountryCode = countries[0].code;
    }
    if (!defaultTimeZoneId && timeZones.length > 0) {
      defaultTimeZoneId = timeZones[0].id;
    }

    const requiresTermsAcceptance = !!this._getFromStorage(
      'signup_requires_terms_acceptance',
      true
    );

    return {
      countries: countries,
      timeZones: timeZones,
      defaultCountryCode: defaultCountryCode,
      defaultTimeZoneId: defaultTimeZoneId,
      marketingDefaults: {
        marketingEmailsEnabled: !!marketingDefaults.marketingEmailsEnabled,
        marketingPushEnabled: !!marketingDefaults.marketingPushEnabled
      },
      requiresTermsAcceptance: requiresTermsAcceptance
    };
  }

  // submitSignup
  submitSignup(
    email,
    username,
    password,
    confirmPassword,
    countryCode,
    timeZoneId,
    marketingEmailsOptIn,
    marketingPushOptIn,
    acceptTerms
  ) {
    const errors = [];
    const options = this.getSignupOptions();

    if (!email) {
      errors.push({ field: 'email', message: 'Email is required.' });
    }
    if (!username) {
      errors.push({ field: 'username', message: 'Username is required.' });
    }
    if (!password) {
      errors.push({ field: 'password', message: 'Password is required.' });
    }
    if (password !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
    }

    const requiresTerms = options.requiresTermsAcceptance;
    if (requiresTerms && !acceptTerms) {
      errors.push({ field: 'acceptTerms', message: 'You must accept the terms of service.' });
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors: errors,
        accountProfile: null,
        nextStep: null
      };
    }

    const now = this._nowIso();

    // Resolve country name from code if available
    let countryName = countryCode || '';
    const country = options.countries.find(c => c.code === countryCode);
    if (country) {
      countryName = country.name;
    }

    // Resolve time zone label from id if available
    let timeZoneLabel = timeZoneId || '';
    const tz = options.timeZones.find(t => t.id === timeZoneId);
    if (tz) {
      timeZoneLabel = tz.label;
    }

    const profiles = this._getFromStorage('account_profiles', []);

    const newProfile = {
      id: this._generateId('acct'),
      email: email,
      username: username,
      password: password,
      country: countryName,
      time_zone: timeZoneLabel,
      terms_accepted: !!acceptTerms,
      terms_accepted_at: acceptTerms ? now : null,
      created_at: now
    };

    profiles.push(newProfile);
    this._saveToStorage('account_profiles', profiles);
    this._setCurrentAccountProfileId(newProfile.id);

    // Initialize NotificationSettings honoring marketing choices
    const marketingDefaults = options.marketingDefaults;
    const marketingEmails =
      typeof marketingEmailsOptIn === 'boolean'
        ? marketingEmailsOptIn
        : !!marketingDefaults.marketingEmailsEnabled;
    const marketingPush =
      typeof marketingPushOptIn === 'boolean'
        ? marketingPushOptIn
        : !!marketingDefaults.marketingPushEnabled;

    const notifList = this._getFromStorage('notification_settings', []);
    const notifNow = this._nowIso();
    const notif = {
      id: newProfile.id,
      security_alert_push_enabled: true,
      security_alert_email_enabled: true,
      security_alert_sms_enabled: false,
      marketing_emails_enabled: !!marketingEmails,
      marketing_special_offers_enabled: !!marketingEmails,
      marketing_push_notifications_enabled: !!marketingPush,
      quiet_hours_enabled: false,
      quiet_hours_start_time: null,
      quiet_hours_end_time: null,
      time_zone: newProfile.time_zone || null,
      updated_at: notifNow
    };
    notifList.push(notif);
    this._saveToStorage('notification_settings', notifList);

    // Initialize PrivacySettings
    const privacyList = this._getFromStorage('privacy_settings', []);
    const privacy = {
      id: newProfile.id,
      diagnostics_enabled: true,
      anonymized_analytics_enabled: true,
      third_party_sharing_enabled: false,
      personalized_ads_enabled: false,
      data_sharing_level: 'minimal',
      updated_at: now
    };
    privacyList.push(privacy);
    this._saveToStorage('privacy_settings', privacyList);

    // Initialize SecuritySettings
    const secList = this._getFromStorage('security_settings', []);
    const sec = {
      id: newProfile.id,
      security_pin: null,
      pin_set: false,
      require_pin_for_remote_lock: false,
      account_lockout_enabled: false,
      lockout_threshold_attempts: null,
      failed_attempts_count: 0,
      is_locked_out: false,
      updated_at: now
    };
    secList.push(sec);
    this._saveToStorage('security_settings', secList);

    // Decide next step: if there are subscription plans, go to plan selection; else home setup
    const plans = this._getFromStorage('subscription_plans', []);
    const homes = this._getFromStorage('homes', []);
    let nextStep = 'dashboard';
    if (plans.length > 0) {
      nextStep = 'plan_selection';
    } else if (homes.length === 0) {
      nextStep = 'home_setup';
    }

    return {
      success: true,
      errors: [],
      accountProfile: newProfile,
      nextStep: nextStep
    };
  }

  // getSubscriptionPlansView
  getSubscriptionPlansView(billingPeriod, sortBy) {
    const period = billingPeriod === 'annual' ? 'annual' : 'monthly';
    const sortMode = sortBy || 'price_low_to_high';

    const plansAll = this._getFromStorage('subscription_plans', []);
    const plans = plansAll.filter(p => Array.isArray(p.available_billing_periods) && p.available_billing_periods.indexOf(period) !== -1);

    const priceFor = plan => (period === 'monthly' ? plan.monthly_price : plan.annual_price);

    plans.sort((a, b) => {
      if (sortMode === 'price_low_to_high') {
        return priceFor(a) - priceFor(b);
      }
      if (sortMode === 'price_high_to_low') {
        return priceFor(b) - priceFor(a);
      }
      if (sortMode === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortMode === 'popular') {
        const ap = a.is_popular ? 0 : 1;
        const bp = b.is_popular ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return priceFor(a) - priceFor(b);
      }
      // Default
      return priceFor(a) - priceFor(b);
    });

    const mappedPlans = plans.map(plan => {
      const price = priceFor(plan);
      const currency = plan.currency || 'USD';
      const priceLabel =
        period === 'monthly'
          ? '$' + price.toFixed(2) + '/mo'
          : '$' + price.toFixed(2) + '/yr';
      const monthlyEquivalent = period === 'monthly' ? price : plan.annual_price / 12;

      const featureBadgesForDisplay = (plan.features || []).map(key => ({
        key: key,
        label: this._formatFeatureKey(key)
      }));

      return {
        plan: plan,
        priceLabel: priceLabel,
        monthlyEquivalentPrice: monthlyEquivalent,
        featureBadgesForDisplay: featureBadgesForDisplay
      };
    });

    return {
      billingPeriod: period,
      sortBy: sortMode,
      plans: mappedPlans
    };
  }

  // selectSubscriptionPlan
  selectSubscriptionPlan(planId, billingPeriod) {
    const period = billingPeriod === 'annual' ? 'annual' : 'monthly';
    const plans = this._getFromStorage('subscription_plans', []);
    const plan = plans.find(p => p.id === planId);

    if (!plan || !Array.isArray(plan.available_billing_periods) || plan.available_billing_periods.indexOf(period) === -1) {
      return {
        success: false,
        selectedPlan: null,
        billingPeriod: period,
        nextStep: null
      };
    }

    const state = this._getOrCreateSubscriptionState();
    state.selectedPlanId = planId;
    state.billingPeriod = period;
    // subscriptionId will be set after payment
    this._saveToStorage('subscription_state', state);

    return {
      success: true,
      selectedPlan: plan,
      billingPeriod: period,
      nextStep: 'billing_payment'
    };
  }

  // getBillingSummaryForSelectedPlan
  getBillingSummaryForSelectedPlan() {
    const state = this._getOrCreateSubscriptionState();
    const plans = this._getFromStorage('subscription_plans', []);
    const plan = plans.find(p => p.id === state.selectedPlanId) || null;

    if (!plan || !state.billingPeriod) {
      return {
        plan: null,
        billingPeriod: null,
        pricePerPeriod: 0,
        currency: 'USD',
        monthlyEquivalentPrice: 0,
        totalDueNow: 0,
        taxAmount: 0,
        discountAmount: 0,
        hasTrial: false
      };
    }

    const period = state.billingPeriod;
    const pricePerPeriod = period === 'annual' ? plan.annual_price : plan.monthly_price;
    const currency = plan.currency || 'USD';
    const monthlyEquivalent = period === 'annual' ? plan.annual_price / 12 : plan.monthly_price;
    const taxAmount = 0;
    const discountAmount = 0;
    const totalDueNow = pricePerPeriod + taxAmount - discountAmount;

    return {
      plan: plan,
      billingPeriod: period,
      pricePerPeriod: pricePerPeriod,
      currency: currency,
      monthlyEquivalentPrice: monthlyEquivalent,
      totalDueNow: totalDueNow,
      taxAmount: taxAmount,
      discountAmount: discountAmount,
      hasTrial: false
    };
  }

  // submitPaymentForSelectedPlan
  submitPaymentForSelectedPlan(
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv,
    cardholderName,
    saveCard
  ) {
    const errors = [];
    if (!cardNumber) errors.push('cardNumber');
    if (!cardExpirationMonth) errors.push('cardExpirationMonth');
    if (!cardExpirationYear) errors.push('cardExpirationYear');
    if (!cardCvv) errors.push('cardCvv');
    if (!cardholderName) errors.push('cardholderName');

    const state = this._getOrCreateSubscriptionState();
    const plans = this._getFromStorage('subscription_plans', []);
    const plan = plans.find(p => p.id === state.selectedPlanId) || null;

    if (!plan || !state.billingPeriod) {
      errors.push('planSelection');
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: 'Missing required payment or plan information.',
        subscription: null,
        paymentMethod: null,
        transaction: null,
        nextStep: null
      };
    }

    const period = state.billingPeriod;
    const amount = period === 'annual' ? plan.annual_price : plan.monthly_price;
    const currency = plan.currency || 'USD';
    const now = this._nowIso();

    // Determine card brand (very simple heuristic)
    let brand = 'other';
    if (cardNumber && cardNumber.startsWith('4')) brand = 'visa';
    else if (cardNumber && cardNumber.startsWith('5')) brand = 'mastercard';
    else if (cardNumber && cardNumber.startsWith('3')) brand = 'amex';
    else if (cardNumber && cardNumber.startsWith('6')) brand = 'discover';

    const paymentMethods = this._getFromStorage('payment_methods', []);
    const subscriptions = this._getFromStorage('subscriptions', []);
    const transactions = this._getFromStorage('payment_transactions', []);

    const shouldSaveCard = saveCard !== false; // default true

    let paymentMethod = null;
    if (shouldSaveCard) {
      paymentMethod = {
        id: this._generateId('pm'),
        cardholder_name: cardholderName,
        card_last4: cardNumber.slice(-4),
        card_brand: brand,
        card_exp_month: Number(cardExpirationMonth),
        card_exp_year: Number(cardExpirationYear),
        created_at: now
      };
      paymentMethods.push(paymentMethod);
      this._saveToStorage('payment_methods', paymentMethods);
    } else {
      paymentMethod = {
        id: this._generateId('pm_temp'),
        cardholder_name: cardholderName,
        card_last4: cardNumber.slice(-4),
        card_brand: brand,
        card_exp_month: Number(cardExpirationMonth),
        card_exp_year: Number(cardExpirationYear),
        created_at: now
      };
    }

    const subscription = {
      id: this._generateId('sub'),
      plan_id: plan.id,
      billing_period: period === 'annual' ? 'annual' : 'monthly',
      status: 'active',
      start_date: now,
      end_date: null,
      auto_renew: true,
      created_at: now
    };
    subscriptions.push(subscription);
    this._saveToStorage('subscriptions', subscriptions);

    const transaction = {
      id: this._generateId('txn'),
      subscription_id: subscription.id,
      payment_method_id: paymentMethod.id,
      amount: amount,
      currency: currency,
      billing_period: period === 'annual' ? 'annual' : 'monthly',
      status: 'succeeded',
      created_at: now
    };
    transactions.push(transaction);
    this._saveToStorage('payment_transactions', transactions);

    // Update subscription state with created subscription id
    state.subscriptionId = subscription.id;
    this._saveToStorage('subscription_state', state);

    // Foreign key resolution per requirements
    const subscriptionWithPlan = Object.assign({}, subscription, { plan: plan });
    const transactionResolved = Object.assign({}, transaction, {
      subscription: subscriptionWithPlan,
      paymentMethod: paymentMethod
    });

    return {
      success: true,
      message: 'Payment succeeded and subscription activated.',
      subscription: subscriptionWithPlan,
      paymentMethod: paymentMethod,
      transaction: transactionResolved,
      nextStep: 'finish_setup'
    };
  }

  // getDashboardOverview
  getDashboardOverview() {
    const account = this._getCurrentAccountProfile();
    const subscription = this._getActiveSubscriptionWithPlan();

    const homes = this._getFromStorage('homes', []);
    const rooms = this._getFromStorage('rooms', []);
    const devices = this._getFromStorage('registered_devices', []);

    const primaryHome = homes.find(h => h.is_primary) || null;
    const primaryHomeId = primaryHome ? primaryHome.id : null;

    const roomsCount = primaryHomeId
      ? rooms.filter(r => r.home_id === primaryHomeId).length
      : 0;
    const devicesCount = primaryHomeId
      ? devices.filter(d => d.home_id === primaryHomeId).length
      : 0;

    const securitySettings = this._getOrCreateSecuritySettings();
    const notificationSettings = this._getOrCreateNotificationSettings();
    const privacySettings = this._getOrCreatePrivacySettings();

    const automations = this._getFromStorage('automations', []);
    const automationCount = automations.length;
    const enabledAutomationCount = automations.filter(a => a.status === 'enabled').length;

    const homeSummary = {
      hasHome: !!primaryHome,
      primaryHomeName: primaryHome ? primaryHome.name : null,
      roomsCount: roomsCount,
      devicesCount: devicesCount
    };

    const securitySummary = {
      pinSet: !!securitySettings.pin_set,
      requirePinForRemoteLock: !!securitySettings.require_pin_for_remote_lock,
      isLockedOut: !!securitySettings.is_locked_out
    };

    const notificationsSummary = {
      securityAlertPushEnabled: !!notificationSettings.security_alert_push_enabled,
      quietHoursEnabled: !!notificationSettings.quiet_hours_enabled
    };

    const privacySummary = {
      dataSharingLevel: privacySettings.data_sharing_level,
      diagnosticsEnabled: !!privacySettings.diagnostics_enabled
    };

    const recommendedActions = [];
    if (!homeSummary.hasHome) {
      recommendedActions.push({
        id: 'setup_home',
        title: 'Set up your home',
        description: 'Create your primary home and add rooms to get started.',
        targetPage: 'home_setup',
        completed: false
      });
    }
    if (!securitySummary.pinSet) {
      recommendedActions.push({
        id: 'set_pin',
        title: 'Create a security PIN',
        description: 'Protect remote lock and unlock actions with a PIN.',
        targetPage: 'security_settings',
        completed: false
      });
    }

    return {
      account: account,
      subscription: subscription,
      homeSummary: homeSummary,
      securitySummary: securitySummary,
      notificationsSummary: notificationsSummary,
      privacySummary: privacySummary,
      automationsSummary: {
        automationCount: automationCount,
        enabledAutomationCount: enabledAutomationCount
      },
      recommendedActions: recommendedActions
    };
  }

  // getHomeSetupStatus
  getHomeSetupStatus() {
    const homes = this._getFromStorage('homes', []);
    const rooms = this._getFromStorage('rooms', []);
    const devices = this._getFromStorage('registered_devices', []);

    const primaryHome = homes.find(h => h.is_primary) || null;
    const primaryHomeId = primaryHome ? primaryHome.id : null;

    const roomsCount = primaryHomeId
      ? rooms.filter(r => r.home_id === primaryHomeId).length
      : 0;
    const devicesCount = primaryHomeId
      ? devices.filter(d => d.home_id === primaryHomeId).length
      : 0;

    let isSetupComplete = false;
    let nextStep = 'home_details';

    if (!primaryHome) {
      isSetupComplete = false;
      nextStep = 'home_details';
    } else if (roomsCount === 0) {
      isSetupComplete = false;
      nextStep = 'rooms';
    } else if (devicesCount === 0) {
      isSetupComplete = false;
      nextStep = 'devices';
    } else {
      isSetupComplete = true;
      nextStep = 'done';
    }

    // Foreign key resolution: include primaryHome object when primaryHomeId is present
    return {
      hasHome: !!primaryHome,
      primaryHomeId: primaryHomeId,
      primaryHomeName: primaryHome ? primaryHome.name : null,
      roomsCount: roomsCount,
      devicesCount: devicesCount,
      isSetupComplete: isSetupComplete,
      nextStep: nextStep,
      primaryHome: primaryHome || null
    };
  }

  // saveHomeDetails
  saveHomeDetails(homeName, homeType) {
    const homes = this._getFromStorage('homes', []);
    const now = this._nowIso();

    const validTypes = ['apartment', 'house', 'condo', 'townhouse', 'other'];
    let normalizedType = (homeType || 'other').toLowerCase();
    if (validTypes.indexOf(normalizedType) === -1) {
      normalizedType = 'other';
    }

    let primaryHome = homes.find(h => h.is_primary) || null;
    if (primaryHome) {
      primaryHome.name = homeName;
      primaryHome.home_type = normalizedType;
      primaryHome.updated_at = now;
    } else {
      primaryHome = {
        id: this._generateId('home'),
        name: homeName,
        home_type: normalizedType,
        is_primary: true,
        created_at: now,
        updated_at: now
      };
      homes.push(primaryHome);
    }

    this._saveToStorage('homes', homes);

    return {
      success: true,
      home: primaryHome,
      nextStep: 'rooms'
    };
  }

  // getRoomsForCurrentHome
  getRoomsForCurrentHome() {
    const homes = this._getFromStorage('homes', []);
    const rooms = this._getFromStorage('rooms', []);
    const primaryHome = homes.find(h => h.is_primary) || null;
    if (!primaryHome) return [];

    const filteredRooms = rooms
      .filter(r => r.home_id === primaryHome.id)
      .map(r => Object.assign({}, r, { home: primaryHome }));

    return filteredRooms;
  }

  // addRoomToCurrentHome
  addRoomToCurrentHome(roomName, isDefault) {
    const homes = this._getFromStorage('homes', []);
    const rooms = this._getFromStorage('rooms', []);
    const primaryHome = homes.find(h => h.is_primary) || null;

    if (!primaryHome) {
      return {
        success: false,
        room: null,
        rooms: []
      };
    }

    const now = this._nowIso();

    const room = {
      id: this._generateId('room'),
      home_id: primaryHome.id,
      name: roomName,
      is_default: !!isDefault,
      created_at: now
    };

    if (room.is_default) {
      rooms.forEach(r => {
        if (r.home_id === primaryHome.id) {
          r.is_default = false;
        }
      });
    }

    rooms.push(room);
    this._saveToStorage('rooms', rooms);

    const roomsForHome = rooms
      .filter(r => r.home_id === primaryHome.id)
      .map(r => Object.assign({}, r, { home: primaryHome }));

    const roomWithHome = Object.assign({}, room, { home: primaryHome });

    return {
      success: true,
      room: roomWithHome,
      rooms: roomsForHome
    };
  }

  // renameRoomInCurrentHome
  renameRoomInCurrentHome(roomId, newName) {
    const homes = this._getFromStorage('homes', []);
    const rooms = this._getFromStorage('rooms', []);
    const primaryHome = homes.find(h => h.is_primary) || null;

    const room = rooms.find(r => r.id === roomId) || null;
    if (!room) {
      return {
        success: false,
        room: null,
        rooms: []
      };
    }

    room.name = newName;
    this._saveToStorage('rooms', rooms);

    const roomsForHome = primaryHome
      ? rooms
          .filter(r => r.home_id === primaryHome.id)
          .map(r => Object.assign({}, r, { home: primaryHome }))
      : [];

    const roomWithHome = primaryHome
      ? Object.assign({}, room, { home: primaryHome })
      : room;

    return {
      success: true,
      room: roomWithHome,
      rooms: roomsForHome
    };
  }

  // getDeviceCatalog
  getDeviceCatalog(filters) {
    const catalog = this._getFromStorage('device_models', []);
    if (!filters || typeof filters !== 'object') return catalog;

    let result = catalog;
    if (filters.deviceType) {
      result = result.filter(m => m.device_type === filters.deviceType);
    }
    if (typeof filters.supportsBrightness === 'boolean') {
      result = result.filter(m => !!m.supports_brightness === !!filters.supportsBrightness);
    }
    return result;
  }

  // registerDeviceToRoom
  registerDeviceToRoom(deviceModelId, roomId, customDeviceName) {
    const deviceModels = this._getFromStorage('device_models', []);
    const rooms = this._getFromStorage('rooms', []);
    const homes = this._getFromStorage('homes', []);
    const registeredDevices = this._getFromStorage('registered_devices', []);

    const model = deviceModels.find(m => m.id === deviceModelId) || null;
    const room = rooms.find(r => r.id === roomId) || null;
    const home = room ? homes.find(h => h.id === room.home_id) || null : null;

    if (!model || !room || !home) {
      return {
        success: false,
        registeredDevice: null,
        devicesInRoom: []
      };
    }

    const now = this._nowIso();
    const device = {
      id: this._generateId('rdev'),
      device_model_id: model.id,
      home_id: home.id,
      room_id: room.id,
      name: customDeviceName || model.name,
      device_type: model.device_type,
      supports_brightness: !!model.supports_brightness,
      is_online: true,
      created_at: now
    };

    registeredDevices.push(device);
    this._saveToStorage('registered_devices', registeredDevices);

    const devicesInRoom = registeredDevices
      .filter(d => d.room_id === room.id)
      .map(d => {
        const modelFor = deviceModels.find(m => m.id === d.device_model_id) || null;
        const homeFor = homes.find(h => h.id === d.home_id) || null;
        const roomFor = rooms.find(r => r.id === d.room_id) || null;
        return Object.assign({}, d, {
          deviceModel: modelFor,
          home: homeFor,
          room: roomFor
        });
      });

    const deviceResolved = Object.assign({}, device, {
      deviceModel: model,
      home: home,
      room: room
    });

    return {
      success: true,
      registeredDevice: deviceResolved,
      devicesInRoom: devicesInRoom
    };
  }

  // getRegisteredDevicesForCurrentHome
  getRegisteredDevicesForCurrentHome(roomId) {
    const homes = this._getFromStorage('homes', []);
    const rooms = this._getFromStorage('rooms', []);
    const deviceModels = this._getFromStorage('device_models', []);
    const registeredDevices = this._getFromStorage('registered_devices', []);

    const primaryHome = homes.find(h => h.is_primary) || null;
    if (!primaryHome) return [];

    const devices = registeredDevices.filter(d => {
      if (d.home_id !== primaryHome.id) return false;
      if (roomId && d.room_id !== roomId) return false;
      return true;
    });

    return devices.map(d => {
      const model = deviceModels.find(m => m.id === d.device_model_id) || null;
      const home = homes.find(h => h.id === d.home_id) || null;
      const room = rooms.find(r => r.id === d.room_id) || null;
      return Object.assign({}, d, {
        deviceModel: model,
        home: home,
        room: room
      });
    });
  }

  // completeHomeSetup
  completeHomeSetup() {
    const homes = this._getFromStorage('homes', []);
    const primaryHome = homes.find(h => h.is_primary) || null;
    if (!primaryHome) {
      return {
        success: false,
        home: null,
        rooms: [],
        devices: [],
        nextStep: 'home_details'
      };
    }

    const rooms = this.getRoomsForCurrentHome();
    const devices = this.getRegisteredDevicesForCurrentHome(null);

    return {
      success: true,
      home: primaryHome,
      rooms: rooms,
      devices: devices,
      nextStep: 'dashboard'
    };
  }

  // getNotificationSettings
  getNotificationSettings() {
    return this._getOrCreateNotificationSettings();
  }

  // updateNotificationSettings
  updateNotificationSettings(
    securityAlertPushEnabled,
    securityAlertEmailEnabled,
    securityAlertSmsEnabled,
    marketingEmailsEnabled,
    marketingSpecialOffersEnabled,
    marketingPushNotificationsEnabled,
    quietHoursEnabled,
    quietHoursStartTime,
    quietHoursEndTime,
    timeZone
  ) {
    const settingsList = this._getFromStorage('notification_settings', []);
    const current = this._getOrCreateNotificationSettings();

    const idx = settingsList.findIndex(s => s.id === current.id);
    const now = this._nowIso();

    const updated = Object.assign({}, current, {
      security_alert_push_enabled: !!securityAlertPushEnabled,
      security_alert_email_enabled: !!securityAlertEmailEnabled,
      security_alert_sms_enabled: !!securityAlertSmsEnabled,
      marketing_emails_enabled: !!marketingEmailsEnabled,
      marketing_special_offers_enabled: !!marketingSpecialOffersEnabled,
      marketing_push_notifications_enabled: !!marketingPushNotificationsEnabled,
      quiet_hours_enabled: !!quietHoursEnabled,
      quiet_hours_start_time: quietHoursEnabled ? quietHoursStartTime || null : null,
      quiet_hours_end_time: quietHoursEnabled ? quietHoursEndTime || null : null,
      time_zone: timeZone || current.time_zone || null,
      updated_at: now
    });

    if (idx >= 0) {
      settingsList[idx] = updated;
    } else {
      settingsList.push(updated);
    }
    this._saveToStorage('notification_settings', settingsList);

    return {
      success: true,
      settings: updated
    };
  }

  // getHouseholdMembers
  getHouseholdMembers() {
    return this._getFromStorage('household_members', []);
  }

  // addHouseholdMember
  addHouseholdMember(name, role, isPrimary) {
    const members = this._getFromStorage('household_members', []);
    const now = this._nowIso();

    const normalizedRole = ['admin', 'standard', 'guest'].indexOf(role) !== -1 ? role : 'standard';

    const member = {
      id: this._generateId('member'),
      name: name,
      role: normalizedRole,
      is_primary: !!isPrimary,
      created_at: now
    };

    if (member.is_primary) {
      members.forEach(m => {
        m.is_primary = false;
      });
    }

    members.push(member);
    this._saveToStorage('household_members', members);

    return {
      success: true,
      member: member,
      members: members
    };
  }

  // updateHouseholdMemberRoleAndPrimary
  updateHouseholdMemberRoleAndPrimary(memberId, role, isPrimary) {
    const members = this._getFromStorage('household_members', []);
    const idx = members.findIndex(m => m.id === memberId);
    if (idx === -1) {
      return {
        success: false,
        member: null,
        members: members
      };
    }

    const normalizedRole = ['admin', 'standard', 'guest'].indexOf(role) !== -1 ? role : members[idx].role;

    if (isPrimary) {
      members.forEach(m => {
        m.is_primary = false;
      });
    }

    members[idx].role = normalizedRole;
    members[idx].is_primary = !!isPrimary;

    this._saveToStorage('household_members', members);

    return {
      success: true,
      member: members[idx],
      members: members
    };
  }

  // getHouseholdAccessOptions
  getHouseholdAccessOptions() {
    const roomsRaw = this.getRoomsForCurrentHome();
    const features = this._getFromStorage('config_household_features', []);
    const roomAccessRaw = this._getFromStorage('household_member_room_access', []);
    const featureAccessRaw = this._getFromStorage('household_member_feature_access', []);
    const members = this._getFromStorage('household_members', []);

    // Foreign key resolution for roomAccess
    const roomAccess = roomAccessRaw.map(entry => {
      const member = members.find(m => m.id === entry.member_id) || null;
      const room = roomsRaw.find(r => r.id === entry.room_id) || null;
      return Object.assign({}, entry, {
        member: member,
        room: room
      });
    });

    // Foreign key resolution for featureAccess
    const featureAccess = featureAccessRaw.map(entry => {
      const member = members.find(m => m.id === entry.member_id) || null;
      return Object.assign({}, entry, {
        member: member
      });
    });

    return {
      rooms: roomsRaw,
      features: features,
      roomAccess: roomAccess,
      featureAccess: featureAccess
    };
  }

  // updateHouseholdMemberAccess
  updateHouseholdMemberAccess(memberId, roomAccessUpdates, featureAccessUpdates) {
    const members = this._getFromStorage('household_members', []);
    const rooms = this.getRoomsForCurrentHome();
    const allRoomsRaw = this._getFromStorage('rooms', []);
    const roomAccessAll = this._getFromStorage('household_member_room_access', []);
    const featureAccessAll = this._getFromStorage('household_member_feature_access', []);

    const member = members.find(m => m.id === memberId) || null;
    if (!member) {
      return {
        success: false,
        roomAccess: [],
        featureAccess: []
      };
    }

    if (Array.isArray(roomAccessUpdates)) {
      roomAccessUpdates.forEach(update => {
        const rid = update.roomId;
        const can = !!update.canAccess;
        let entry = roomAccessAll.find(e => e.member_id === memberId && e.room_id === rid);
        if (entry) {
          entry.can_access = can;
        } else {
          entry = {
            id: this._generateId('mra'),
            member_id: memberId,
            room_id: rid,
            can_access: can
          };
          roomAccessAll.push(entry);
        }
      });
    }

    if (Array.isArray(featureAccessUpdates)) {
      featureAccessUpdates.forEach(update => {
        const key = update.featureKey;
        const can = !!update.canAccess;
        let entry = featureAccessAll.find(e => e.member_id === memberId && e.feature_key === key);
        if (entry) {
          entry.can_access = can;
        } else {
          entry = {
            id: this._generateId('mfa'),
            member_id: memberId,
            feature_key: key,
            can_access: can
          };
          featureAccessAll.push(entry);
        }
      });
    }

    this._saveToStorage('household_member_room_access', roomAccessAll);
    this._saveToStorage('household_member_feature_access', featureAccessAll);

    // Resolve foreign keys for return values
    const roomAccess = roomAccessAll.map(entry => {
      const m = members.find(mm => mm.id === entry.member_id) || null;
      const room = rooms.find(r => r.id === entry.room_id) || allRoomsRaw.find(r => r.id === entry.room_id) || null;
      return Object.assign({}, entry, {
        member: m,
        room: room
      });
    });

    const featureAccess = featureAccessAll.map(entry => {
      const m = members.find(mm => mm.id === entry.member_id) || null;
      return Object.assign({}, entry, {
        member: m
      });
    });

    return {
      success: true,
      roomAccess: roomAccess,
      featureAccess: featureAccess
    };
  }

  // getPrivacySettings
  getPrivacySettings() {
    return this._getOrCreatePrivacySettings();
  }

  // updatePrivacySettings
  updatePrivacySettings(
    diagnosticsEnabled,
    anonymizedAnalyticsEnabled,
    thirdPartySharingEnabled,
    personalizedAdsEnabled,
    dataSharingLevel
  ) {
    const list = this._getFromStorage('privacy_settings', []);
    const current = this._getOrCreatePrivacySettings();
    const idx = list.findIndex(s => s.id === current.id);

    const allowedLevels = ['diagnostics_only', 'minimal', 'standard', 'full'];
    const level = allowedLevels.indexOf(dataSharingLevel) !== -1
      ? dataSharingLevel
      : current.data_sharing_level;

    const now = this._nowIso();

    const updated = Object.assign({}, current, {
      diagnostics_enabled: !!diagnosticsEnabled,
      anonymized_analytics_enabled: !!anonymizedAnalyticsEnabled,
      third_party_sharing_enabled: !!thirdPartySharingEnabled,
      personalized_ads_enabled: !!personalizedAdsEnabled,
      data_sharing_level: level,
      updated_at: now
    });

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    this._saveToStorage('privacy_settings', list);

    return {
      success: true,
      settings: updated
    };
  }

  // getSecuritySettings
  getSecuritySettings() {
    return this._getOrCreateSecuritySettings();
  }

  // updateSecuritySettings
  updateSecuritySettings(
    securityPin,
    pinSet,
    requirePinForRemoteLock,
    accountLockoutEnabled,
    lockoutThresholdAttempts
  ) {
    const list = this._getFromStorage('security_settings', []);
    const current = this._getOrCreateSecuritySettings();
    const idx = list.findIndex(s => s.id === current.id);

    let pinValue = current.security_pin;
    let pinSetValue = !!pinSet;

    if (typeof securityPin === 'string' && securityPin.length === 6 && /^\d{6}$/.test(securityPin)) {
      pinValue = securityPin;
      pinSetValue = true;
    }

    const now = this._nowIso();

    const updated = Object.assign({}, current, {
      security_pin: pinValue,
      pin_set: pinSetValue,
      require_pin_for_remote_lock: !!requirePinForRemoteLock,
      account_lockout_enabled: !!accountLockoutEnabled,
      lockout_threshold_attempts:
        accountLockoutEnabled && typeof lockoutThresholdAttempts === 'number'
          ? lockoutThresholdAttempts
          : current.lockout_threshold_attempts,
      updated_at: now
    });

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    this._saveToStorage('security_settings', list);

    return {
      success: true,
      settings: updated
    };
  }

  // getAutomationsList
  getAutomationsList() {
    const automations = this._getFromStorage('automations', []);
    const triggersAll = this._getFromStorage('automation_triggers', []);
    const actionsAll = this._getFromStorage('automation_actions', []);
    const rooms = this._getFromStorage('rooms', []);
    const devices = this._getFromStorage('registered_devices', []);

    return automations.map(auto => {
      const triggers = triggersAll
        .filter(t => t.automation_id === auto.id)
        .map(t => Object.assign({}, t, { automation: auto }));

      const actions = actionsAll
        .filter(a => a.automation_id === auto.id)
        .map(a => {
          const room = a.target_room_id
            ? rooms.find(r => r.id === a.target_room_id) || null
            : null;
          const targetDevices = Array.isArray(a.target_device_ids)
            ? devices.filter(d => a.target_device_ids.indexOf(d.id) !== -1)
            : [];
          return Object.assign({}, a, {
            automation: auto,
            room: room,
            devices: targetDevices
          });
        });

      return {
        automation: auto,
        triggers: triggers,
        actions: actions
      };
    });
  }

  // getAutomationEditorOptions
  getAutomationEditorOptions() {
    const rooms = this.getRoomsForCurrentHome();
    const devices = this.getRegisteredDevicesForCurrentHome(null);

    const availableTriggerTypes = ['time_schedule', 'device_event', 'manual'];
    const availableActionTypes = ['device_control', 'notification'];

    const deviceTypeFilters = ['light', 'thermostat', 'camera', 'door_lock', 'sensor', 'all'];

    return {
      availableTriggerTypes: availableTriggerTypes,
      availableActionTypes: availableActionTypes,
      rooms: rooms,
      devices: devices,
      deviceTypeFilters: deviceTypeFilters
    };
  }

  // getAutomationDetails
  getAutomationDetails(automationId) {
    const { automation, triggers, actions } = this._getAutomationEntitiesForAutomation(automationId);
    if (!automation) {
      return {
        automation: null,
        triggers: [],
        actions: []
      };
    }

    const rooms = this._getFromStorage('rooms', []);
    const devices = this._getFromStorage('registered_devices', []);

    const triggersResolved = triggers.map(t => Object.assign({}, t, { automation: automation }));

    const actionsResolved = actions.map(a => {
      const room = a.target_room_id ? rooms.find(r => r.id === a.target_room_id) || null : null;
      const targetDevices = Array.isArray(a.target_device_ids)
        ? devices.filter(d => a.target_device_ids.indexOf(d.id) !== -1)
        : [];
      return Object.assign({}, a, {
        automation: automation,
        room: room,
        devices: targetDevices
      });
    });

    return {
      automation: automation,
      triggers: triggersResolved,
      actions: actionsResolved
    };
  }

  // saveAutomation
  saveAutomation(automationDefinition) {
    const def = automationDefinition || {};
    const automations = this._getFromStorage('automations', []);
    let triggersAll = this._getFromStorage('automation_triggers', []);
    let actionsAll = this._getFromStorage('automation_actions', []);

    let automation = null;
    const now = this._nowIso();

    if (def.id) {
      const idx = automations.findIndex(a => a.id === def.id);
      if (idx !== -1) {
        const existing = automations[idx];
        automation = Object.assign({}, existing, {
          name: def.name || existing.name,
          description: def.description || existing.description,
          status: def.status || existing.status,
          updated_at: now
        });
        automations[idx] = automation;
      } else {
        automation = {
          id: def.id,
          name: def.name || 'Automation',
          description: def.description || '',
          status: def.status || 'enabled',
          created_at: now,
          updated_at: now
        };
        automations.push(automation);
      }
    } else {
      automation = {
        id: this._generateId('auto'),
        name: def.name || 'Automation',
        description: def.description || '',
        status: def.status || 'enabled',
        created_at: now,
        updated_at: now
      };
      automations.push(automation);
    }

    // Replace triggers and actions for this automation
    triggersAll = triggersAll.filter(t => t.automation_id !== automation.id);
    actionsAll = actionsAll.filter(a => a.automation_id !== automation.id);

    const defTriggers = Array.isArray(def.triggers) ? def.triggers : [];
    const defActions = Array.isArray(def.actions) ? def.actions : [];

    const triggersNew = defTriggers.map(t => ({
      id: this._generateId('autotrig'),
      automation_id: automation.id,
      trigger_type: t.triggerType || 'time_schedule',
      time_of_day: t.timeOfDay || null,
      days_of_week: Array.isArray(t.daysOfWeek) ? t.daysOfWeek : [],
      timezone: t.timezone || null,
      enabled: typeof t.enabled === 'boolean' ? t.enabled : true
    }));

    const actionsNew = defActions.map(a => ({
      id: this._generateId('autoact'),
      automation_id: automation.id,
      action_type: a.actionType || 'device_control',
      target_type: a.targetType || 'device',
      target_room_id: a.targetRoomId || null,
      target_device_ids: Array.isArray(a.targetDeviceIds) ? a.targetDeviceIds : [],
      device_type_filter: a.deviceTypeFilter || null,
      command: a.command || 'turn_on',
      brightness_level:
        typeof a.brightnessLevel === 'number' ? a.brightnessLevel : null
    }));

    triggersAll = triggersAll.concat(triggersNew);
    actionsAll = actionsAll.concat(actionsNew);

    this._saveToStorage('automations', automations);
    this._saveToStorage('automation_triggers', triggersAll);
    this._saveToStorage('automation_actions', actionsAll);

    // Resolve entities for return
    const rooms = this._getFromStorage('rooms', []);
    const devices = this._getFromStorage('registered_devices', []);

    const triggersResolved = triggersNew.map(t => Object.assign({}, t, { automation: automation }));

    const actionsResolved = actionsNew.map(a => {
      const room = a.target_room_id ? rooms.find(r => r.id === a.target_room_id) || null : null;
      const targetDevices = Array.isArray(a.target_device_ids)
        ? devices.filter(d => a.target_device_ids.indexOf(d.id) !== -1)
        : [];
      return Object.assign({}, a, {
        automation: automation,
        room: room,
        devices: targetDevices
      });
    });

    return {
      success: true,
      automation: automation,
      triggers: triggersResolved,
      actions: actionsResolved
    };
  }

  // setAutomationStatus
  setAutomationStatus(automationId, status) {
    const automations = this._getFromStorage('automations', []);
    const idx = automations.findIndex(a => a.id === automationId);
    if (idx === -1) {
      return {
        success: false,
        automation: null
      };
    }

    if (status !== 'enabled' && status !== 'disabled') {
      return {
        success: false,
        automation: automations[idx]
      };
    }

    automations[idx].status = status;
    automations[idx].updated_at = this._nowIso();
    this._saveToStorage('automations', automations);

    return {
      success: true,
      automation: automations[idx]
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return this._getFromStorage('about_page_content', {
      mission: '',
      vision: '',
      background: '',
      differentiators: [],
      securityAndPrivacyHighlights: []
    });
  }

  // getHelpCenterContent
  getHelpCenterContent() {
    return this._getFromStorage('help_center_content', {
      categories: [],
      featuredFaqs: [],
      gettingStartedGuides: []
    });
  }

  // searchHelpArticles
  searchHelpArticles(query, categoryId) {
    const content = this.getHelpCenterContent();
    const q = (query || '').toLowerCase();
    if (!q) return [];

    const results = [];

    const matchesCategory = catId => {
      if (!categoryId) return true;
      return catId === categoryId;
    };

    // Search FAQs
    (content.featuredFaqs || []).forEach(faq => {
      const haystack = (faq.question + ' ' + faq.answer).toLowerCase();
      if (haystack.indexOf(q) !== -1 && matchesCategory(faq.categoryId)) {
        results.push({
          id: faq.id,
          title: faq.question,
          snippet: faq.answer,
          categoryId: faq.categoryId
        });
      }
    });

    // Search guides as articles too
    (content.gettingStartedGuides || []).forEach(guide => {
      const haystack = (guide.title + ' ' + guide.summary).toLowerCase();
      if (haystack.indexOf(q) !== -1 && matchesCategory('getting_started')) {
        results.push({
          id: guide.id,
          title: guide.title,
          snippet: guide.summary,
          categoryId: 'getting_started'
        });
      }
    });

    return results;
  }

  // getSupportContactOptions
  getSupportContactOptions() {
    return this._getFromStorage('support_contact_options', {
      supportEmail: '',
      ticketFormAvailable: false,
      phoneSupportAvailable: false,
      hoursOfOperation: ''
    });
  }

  // getTermsOfServiceContent
  getTermsOfServiceContent() {
    return this._getFromStorage('terms_of_service_content', {
      version: '',
      lastUpdated: '',
      contentHtml: ''
    });
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    return this._getFromStorage('privacy_policy_content', {
      version: '',
      lastUpdated: '',
      contentHtml: ''
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
