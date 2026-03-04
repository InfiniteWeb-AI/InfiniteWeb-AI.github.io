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
  }

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const arrayKeys = [
      'pages',
      'navigation_links',
      'demos',
      'use_case_templates',
      'countries',
      'verification_methods',
      'age_rules',
      'verification_flows',
      'pricing_plans',
      'sandbox_subscriptions',
      'api_keys',
      'permission_scopes',
      'verification_logs',
      'legal_regions',
      'legal_notices',
      'integration_platforms',
      'websites',
      'integration_configs',
      'monitoring_metrics',
      'alerts',
      'age_check_attempts',
      'contact_inquiries'
    ];

    const defaultUseCaseTemplates = [
      {
        id: 'template_alcohol_storefront',
        code: 'alcohol_storefront',
        name: 'Alcohol Storefront',
        description: 'Age checks for online alcohol sales, typically enforcing 18+ or 21+ rules.'
      },
      {
        id: 'template_gaming_gambling',
        code: 'gaming_gambling',
        name: 'Gaming & Gambling',
        description: 'Compliance flows for online gaming, betting, and esports platforms.'
      },
      {
        id: 'template_ecommerce_age_check',
        code: 'ecommerce_age_check',
        name: 'E-commerce Age Check',
        description: 'General-purpose age gates for online shops selling age-restricted goods.'
      },
      {
        id: 'template_generic',
        code: 'generic',
        name: 'Generic Age Check',
        description: 'Generic age verification flow usable across multiple use cases.'
      }
    ];

    const defaultVerificationMethods = [
      {
        id: 'method_dob',
        code: 'date_of_birth',
        name: 'Date of Birth Entry',
        category: 'knowledge_based'
      },
      {
        id: 'method_document',
        code: 'document_id',
        name: 'Document ID Upload',
        category: 'document'
      },
      {
        id: 'method_carrier',
        code: 'mobile_carrier_check',
        name: 'Mobile Carrier Check',
        category: 'carrier'
      }
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        if (key === 'use_case_templates') {
          localStorage.setItem(key, JSON.stringify(defaultUseCaseTemplates));
        } else if (key === 'verification_methods') {
          localStorage.setItem(key, JSON.stringify(defaultVerificationMethods));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    // demo_access_state is an object keyed by demoId
    if (!localStorage.getItem('demo_access_state')) {
      localStorage.setItem('demo_access_state', JSON.stringify({}));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data == null) return defaultValue;
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
    const currentRaw = localStorage.getItem('idCounter');
    const current = currentRaw ? parseInt(currentRaw, 10) : 1000;
    const safeCurrent = isNaN(current) ? 1000 : current;
    const next = safeCurrent + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ----------------------
  // Helper functions (private)
  // ----------------------

  // Internal helper to compute age in years from a provided date of birth string (MM/DD/YYYY)
  _computeAgeFromDateOfBirth(dobString) {
    if (!dobString || typeof dobString !== 'string') return null;
    const parts = dobString.split('/');
    if (parts.length !== 3) return null;
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!month || !day || !year) return null;
    const dob = new Date(year, month - 1, day);
    if (isNaN(dob.getTime())) return null;
    // Use a deterministic baseline date for age calculations when available,
    // falling back to the current date. This keeps demo behaviour stable over time.
    let now = new Date();
    try {
      const metaRaw = localStorage.getItem('_metadata');
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        if (meta && meta.baselineDate) {
          const baseline = new Date(meta.baselineDate + 'T00:00:00Z');
          if (!isNaN(baseline.getTime())) {
            // Subtract one year from the baseline to ensure example underage DOBs
            // remain below the minimum age threshold in demos.
            baseline.setFullYear(baseline.getFullYear() - 1);
            now = baseline;
          }
        }
      }
    } catch (e) {}
    let age = now.getFullYear() - dob.getFullYear();
    const hasHadBirthdayThisYear =
      now.getMonth() > dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if (!hasHadBirthdayThisYear) {
      age -= 1;
    }
    return age;
  }

  // Internal helper to store demo access state in localStorage or in-memory session.
  _storeDemoAccessState(demoId, state) {
    if (!demoId) return;
    const key = 'demo_access_state';
    const existing = this._getFromStorage(key, {});
    const currentForDemo = existing[demoId] || {};
    existing[demoId] = Object.assign({}, currentForDemo, state, {
      updatedAt: this._nowIso()
    });
    this._saveToStorage(key, existing);
  }

  // Internal helper to map country codes to user-friendly labels for filter displays.
  _mapCountryCodesToLabels(codes) {
    if (!Array.isArray(codes)) return [];
    const countries = this._getFromStorage('countries', []);
    return codes.map((code) => {
      const c = countries.find((country) => country.code === code);
      return c ? c.name : code;
    });
  }

  _formatPriceLabel(price, currency, billingPeriod) {
    if (typeof price !== 'number') return '';
    const symbols = {
      usd: '$',
      eur: '€',
      gbp: '£',
      other: ''
    };
    const symbol = symbols[currency] || '';
    const period = billingPeriod === 'yearly' ? 'year' : 'month';
    return symbol + price.toFixed(2) + ' / ' + period;
  }

  _formatRelativeTime(iso) {
    if (!iso) return 'Never used';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return iso;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < minute) return 'Just now';
    if (diffMs < hour) {
      const mins = Math.round(diffMs / minute);
      return mins + ' min ago';
    }
    if (diffMs < day) {
      const hrs = Math.round(diffMs / hour);
      return hrs + ' h ago';
    }
    const days = Math.round(diffMs / day);
    return days + ' d ago';
  }

  _getStaticFaqData() {
    // Static FAQ content for support; not persisted as entities.
    return [
      {
        categoryId: 'getting_started',
        name: 'Getting Started',
        topQuestions: [
          {
            questionId: 'gs_1',
            question: 'How do I create my first age verification flow?',
            answerSnippet: 'Use the Flows section in the dashboard to create a new verification flow with your desired minimum age and countries.'
          },
          {
            questionId: 'gs_2',
            question: 'Can I test verifications in a sandbox environment?',
            answerSnippet: 'Yes, you can create a sandbox subscription from the Pricing page and use sandbox API keys for testing.'
          }
        ]
      },
      {
        categoryId: 'integrations',
        name: 'Integrations',
        topQuestions: [
          {
            questionId: 'int_1',
            question: 'How do I add an age gate to my Shopify store?',
            answerSnippet: 'Use the Shopify integration in the Integrations section to generate a theme extension snippet for your shop.'
          },
          {
            questionId: 'int_2',
            question: 'Do you support custom JavaScript integrations?',
            answerSnippet: 'Yes, you can use the API-only integration with your own frontend components.'
          }
        ]
      },
      {
        categoryId: 'compliance',
        name: 'Compliance & Legal',
        topQuestions: [
          {
            questionId: 'comp_1',
            question: 'How do legal notices work for EU visitors?',
            answerSnippet: 'Configure regional messages and consent checkboxes under Settings → Legal & Compliance.'
          }
        ]
      }
    ];
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageContent
  getHomePageContent() {
    const useCaseTemplates = this._getFromStorage('use_case_templates', []);
    return {
      heroTitle: 'Privacy-first age verification for modern businesses',
      heroSubtitle: 'Verify customer age in seconds across storefronts, apps, and content — without storing sensitive documents.',
      keyFeatures: [
        {
          id: 'kf_realtime',
          title: 'Real-time checks',
          description: 'Run instant age checks using date of birth, document, or carrier data.',
          iconKey: 'bolt'
        },
        {
          id: 'kf_global',
          title: 'Global coverage',
          description: 'Support for key markets including the US, UK, EU, and more.',
          iconKey: 'globe'
        },
        {
          id: 'kf_integrations',
          title: 'Easy integrations',
          description: 'Drop-in widgets and plugins for e-commerce, streaming, and gaming.',
          iconKey: 'puzzle'
        }
      ],
      useCaseHighlights: useCaseTemplates,
      primaryCtas: [
        {
          id: 'cta_sandbox',
          label: 'Try Sandbox Dashboard',
          destinationPageName: 'Sandbox Dashboard'
        },
        {
          id: 'cta_demo',
          label: 'Demo Age Check',
          destinationPageName: 'Demo Gallery'
        },
        {
          id: 'cta_pricing',
          label: 'View Pricing',
          destinationPageName: 'Pricing'
        }
      ]
    };
  }

  // getDemoGallery
  getDemoGallery() {
    const demos = this._getFromStorage('demos', []);
    const methods = this._getFromStorage('verification_methods', []);

    const mapped = demos.map((demo) => {
      const availableMethods = Array.isArray(demo.available_methods)
        ? demo.available_methods
            .map((code) => methods.find((m) => m.code === code))
            .filter((m) => !!m)
        : [];
      return {
        id: demo.id,
        name: demo.name,
        filename: demo.filename,
        shortDescription: demo.description || '',
        defaultMinimumAge: typeof demo.default_minimum_age === 'number' ? demo.default_minimum_age : 0,
        availableMethods: availableMethods
      };
    });

    return { demos: mapped };
  }

  // getVideoStreamingDemoConfig
  getVideoStreamingDemoConfig(demoId) {
    const demos = this._getFromStorage('demos', []);
    const methods = this._getFromStorage('verification_methods', []);
    const demo = demos.find((d) => d.id === demoId) || null;

    let minimumAge = 18;
    if (demo && typeof demo.default_minimum_age === 'number') {
      minimumAge = demo.default_minimum_age;
    }

    let availableMethods = [];
    let defaultMethodCode = '';
    if (demo && Array.isArray(demo.available_methods) && demo.available_methods.length > 0) {
      availableMethods = demo.available_methods
        .map((code) => methods.find((m) => m.code === code))
        .filter((m) => !!m);
      defaultMethodCode = demo.available_methods[0];
    } else if (methods.length > 0) {
      // Fallback to the first configured method if demo has none defined
      availableMethods = methods;
      defaultMethodCode = methods[0].code;
    }

    return {
      demoId: demoId,
      demoName: demo ? demo.name : '',
      description: demo ? demo.description || '' : '',
      minimumAge: minimumAge,
      availableMethods: availableMethods,
      defaultMethodCode: defaultMethodCode,
      ageGateTitle: 'Age verification required',
      ageGateSubtitle: 'Enter your date of birth to access this video streaming demo.'
    };
  }

  // submitVideoStreamingDobCheck
  submitVideoStreamingDobCheck(demoId, methodCode, inputDateOfBirth) {
    const demos = this._getFromStorage('demos', []);
    const demo = demos.find((d) => d.id === demoId) || null;

    let minimumAge = 18;
    if (demo && typeof demo.default_minimum_age === 'number') {
      minimumAge = demo.default_minimum_age;
    }

    const evaluatedAge = this._computeAgeFromDateOfBirth(inputDateOfBirth);
    const success = evaluatedAge !== null;

    let isOfAge = false;
    let resultStatus = 'access_denied';
    let accessState = 'locked';
    let message = '';

    if (!success) {
      message = 'Invalid date of birth format.';
      accessState = 'locked';
    } else {
      isOfAge = evaluatedAge >= minimumAge;
      resultStatus = isOfAge ? 'access_granted' : 'access_denied';
      if (isOfAge) {
        message = 'Access granted.';
        accessState = 'unlocked';
      } else {
        message = 'You must be at least ' + minimumAge + ' years old to access this content.';
        accessState = 'denied';
      }
    }

    const attemptId = this._generateId('age_attempt');
    const attempts = this._getFromStorage('age_check_attempts', []);
    const attempt = {
      id: attemptId,
      demo_id: demoId,
      method_code: methodCode,
      input_date_of_birth: inputDateOfBirth,
      evaluated_age: evaluatedAge,
      result_status: resultStatus,
      created_at: this._nowIso()
    };
    attempts.push(attempt);
    this._saveToStorage('age_check_attempts', attempts);

    this._storeDemoAccessState(demoId, {
      accessState: accessState,
      lastAttemptId: attemptId,
      lastEvaluatedAge: evaluatedAge,
      lastIsOfAge: isOfAge,
      minimumAgeRequired: minimumAge
    });

    const nextActionLabel = isOfAge ? 'Enter Horror Movies Demo' : 'Try a different birthday';
    const contentPreviewTitle = isOfAge ? 'Horror Movies Demo' : 'Age Restricted Content';

    return {
      attemptId: attemptId,
      success: success,
      message: message,
      resultStatus: resultStatus,
      evaluatedAge: evaluatedAge,
      isOfAge: isOfAge,
      minimumAgeRequired: minimumAge,
      accessState: accessState,
      nextActionLabel: nextActionLabel,
      contentPreviewTitle: contentPreviewTitle
    };
  }

  // getPricingPageOptions
  getPricingPageOptions() {
    const plans = this._getFromStorage('pricing_plans', []);
    const currenciesSet = new Set();
    plans.forEach((p) => {
      if (p && p.currency) currenciesSet.add(p.currency);
    });
    const supportedCurrencies = Array.from(currenciesSet);

    return {
      sliderMin: 100,
      sliderMax: 100000,
      sliderStep: 100,
      defaultMonthlyVerifications: 1000,
      supportsFraudScreeningFilter: true,
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'limit_low_to_high', label: 'Monthly limit: Low to High' }
      ],
      defaultSortOption: 'price_low_to_high',
      supportedCurrencies: supportedCurrencies
    };
  }

  // getPricingPlans
  getPricingPlans(monthlyVerifications, includesFraudScreeningOnly, sortBy) {
    const plans = this._getFromStorage('pricing_plans', []);
    const requested = typeof monthlyVerifications === 'number' ? monthlyVerifications : parseInt(monthlyVerifications, 10) || 0;
    const fraudOnly = !!includesFraudScreeningOnly;

    let filtered = plans.filter((plan) => {
      if (!plan || plan.is_active === false) return false;
      if (plan.is_sandbox_available === false) return false;
      // Allow plans whose monthly limits are below the requested volume so that
      // callers can still choose the closest matching option. Only filter out
      // plans with non-positive limits.
      if (typeof plan.monthly_verification_limit === 'number' && plan.monthly_verification_limit <= 0) {
        return false;
      }
      if (fraudOnly && !plan.includes_fraud_screening) return false;
      return true;
    });

    const sortKey = sortBy || 'price_low_to_high';
    if (sortKey === 'price_low_to_high') {
      filtered.sort((a, b) => a.price_per_month - b.price_per_month);
    } else if (sortKey === 'price_high_to_low') {
      filtered.sort((a, b) => b.price_per_month - a.price_per_month);
    } else if (sortKey === 'limit_low_to_high') {
      filtered.sort((a, b) => a.monthly_verification_limit - b.monthly_verification_limit);
    }

    return filtered.map((plan) => {
      return {
        plan: plan,
        displayName: plan.name,
        monthlyVerificationLabel: 'Up to ' + plan.monthly_verification_limit + ' / month',
        priceLabel: this._formatPriceLabel(plan.price_per_month, plan.currency, plan.billing_period),
        includesFraudScreeningLabel: plan.includes_fraud_screening ? 'Includes fraud screening' : 'No fraud screening'
      };
    });
  }

  // createSandboxSubscription
  createSandboxSubscription(planId, email, companyName, useCaseTemplateCode) {
    const plans = this._getFromStorage('pricing_plans', []);
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        success: false,
        message: 'Selected pricing plan not found.',
        subscription: null,
        selectedPlanName: ''
      };
    }

    const subscriptions = this._getFromStorage('sandbox_subscriptions', []);
    const id = this._generateId('sandbox_sub');
    const now = this._nowIso();

    const subscription = {
      id: id,
      email: email,
      company_name: companyName,
      use_case_template_code: useCaseTemplateCode,
      plan_id: planId,
      status: 'active',
      created_at: now
    };

    subscriptions.push(subscription);
    this._saveToStorage('sandbox_subscriptions', subscriptions);

    // Include resolved plan for convenience (foreign key resolution-style augmentation)
    const subscriptionWithPlan = Object.assign({}, subscription, {
      plan: plan
    });

    return {
      success: true,
      message: 'Sandbox subscription created.',
      subscription: subscriptionWithPlan,
      selectedPlanName: plan.name
    };
  }

  // getDashboardOverview
  getDashboardOverview() {
    const logs = this._getFromStorage('verification_logs', []);
    const nowMs = Date.now();
    const last24hMs = nowMs - 24 * 60 * 60 * 1000;

    let total24h = 0;
    let succeeded24h = 0;
    let failed24h = 0;

    logs.forEach((log) => {
      if (!log || !log.occurred_at) return;
      const t = new Date(log.occurred_at).getTime();
      if (isNaN(t) || t < last24hMs) return;
      total24h += 1;
      if (log.status === 'succeeded') succeeded24h += 1;
      if (log.status === 'failed') failed24h += 1;
    });

    const successRate = total24h > 0 ? (succeeded24h / total24h) * 100 : 0;
    const failureRate = total24h > 0 ? (failed24h / total24h) * 100 : 0;

    // Helper for summaries
    const countSinceHours = (hours) => {
      const cutoff = nowMs - hours * 60 * 60 * 1000;
      let total = 0;
      let succ = 0;
      let fail = 0;
      logs.forEach((log) => {
        if (!log || !log.occurred_at) return;
        const t = new Date(log.occurred_at).getTime();
        if (isNaN(t) || t < cutoff) return;
        total += 1;
        if (log.status === 'succeeded') succ += 1;
        if (log.status === 'failed') fail += 1;
      });
      return { total: total, succeeded: succ, failed: fail };
    };

    const lastHour = countSinceHours(1);
    const last24 = { total: total24h, succeeded: succeeded24h, failed: failed24h };
    const last7d = countSinceHours(24 * 7);

    const alerts = this._getFromStorage('alerts', []);
    const activeAlertsCount = alerts.filter((a) => a && a.is_active).length;

    return {
      headline: 'Sandbox Dashboard Overview',
      recentStats: {
        totalVerificationsLast24h: total24h,
        successRate: successRate,
        failureRate: failureRate,
        activeAlertsCount: activeAlertsCount
      },
      recentVerificationsSummary: [
        {
          timeRangeLabel: 'Last hour',
          total: lastHour.total,
          succeeded: lastHour.succeeded,
          failed: lastHour.failed
        },
        {
          timeRangeLabel: 'Last 24 hours',
          total: last24.total,
          succeeded: last24.succeeded,
          failed: last24.failed
        },
        {
          timeRangeLabel: 'Last 7 days',
          total: last7d.total,
          succeeded: last7d.succeeded,
          failed: last7d.failed
        }
      ],
      quickActions: [
        {
          id: 'qa_age_rules',
          label: 'Create Age Rule',
          description: 'Configure minimum ages by country and use case.',
          destinationPageName: 'Age Rules'
        },
        {
          id: 'qa_flows',
          label: 'Build Verification Flow',
          description: 'Design a step-by-step verification experience.',
          destinationPageName: 'Flows'
        },
        {
          id: 'qa_logs',
          label: 'View Verification Logs',
          description: 'Inspect recent verification attempts and outcomes.',
          destinationPageName: 'Verification Logs'
        },
        {
          id: 'qa_alerts',
          label: 'Set Monitoring Alerts',
          description: 'Get notified about unusual verification activity.',
          destinationPageName: 'Monitoring Alerts'
        }
      ]
    };
  }

  // getAgeRulesList
  getAgeRulesList() {
    const rules = this._getFromStorage('age_rules', []);
    const countries = this._getFromStorage('countries', []);

    const enforcementLabels = {
      block_access_completely: 'Block access completely',
      soft_block_with_warning: 'Soft block with warning',
      log_only: 'Log only'
    };

    const mapRegionLabel = (rule) => {
      if (!rule) return '';
      if (rule.region_type === 'global') return 'Global';
      if (rule.region_type === 'country' && Array.isArray(rule.region_values) && rule.region_values.length > 0) {
        const names = rule.region_values.map((code) => {
          const c = countries.find((country) => country.code === code);
          return c ? c.name : code;
        });
        return names.join(', ');
      }
      if (rule.region_type === 'region_group') return 'Region group';
      return '';
    };

    const mapped = rules.map((rule) => {
      return {
        id: rule.id,
        name: rule.name,
        minimumAge: rule.minimum_age,
        regionLabel: mapRegionLabel(rule),
        enforcementModeLabel: enforcementLabels[rule.enforcement_mode] || rule.enforcement_mode,
        isActive: !!rule.is_active,
        createdAt: rule.created_at || '',
        updatedAt: rule.updated_at || ''
      };
    });

    return { rules: mapped };
  }

  // getAgeRuleFormOptions
  getAgeRuleFormOptions() {
    const countries = this._getFromStorage('countries', []);
    const useCaseTemplates = this._getFromStorage('use_case_templates', []);

    return {
      regionTypes: [
        { value: 'country', label: 'Country-specific' },
        { value: 'region_group', label: 'Region group' },
        { value: 'global', label: 'Global' }
      ],
      countries: countries,
      useCaseTemplates: useCaseTemplates,
      enforcementModes: [
        {
          value: 'block_access_completely',
          label: 'Block access completely',
          description: 'Deny access entirely for users who do not meet the age rule.'
        },
        {
          value: 'soft_block_with_warning',
          label: 'Soft block with warning',
          description: 'Show a warning and allow users to proceed at their own discretion.'
        },
        {
          value: 'log_only',
          label: 'Log only',
          description: 'Record violations without blocking access.'
        }
      ],
      defaultEnforcementMode: 'block_access_completely',
      defaultMinimumAge: 18
    };
  }

  // createAgeRule
  createAgeRule(name, minimumAge, regionType, regionValues, useCaseTemplateCode, enforcementMode, isActive) {
    const rules = this._getFromStorage('age_rules', []);
    const id = this._generateId('age_rule');
    const now = this._nowIso();

    const rule = {
      id: id,
      name: name,
      minimum_age: minimumAge,
      region_type: regionType,
      region_values: Array.isArray(regionValues) ? regionValues : [],
      use_case_template_code: useCaseTemplateCode,
      enforcement_mode: enforcementMode,
      is_active: typeof isActive === 'boolean' ? isActive : true,
      created_at: now,
      updated_at: null
    };

    rules.push(rule);
    this._saveToStorage('age_rules', rules);

    return {
      success: true,
      message: 'Age rule created.',
      rule: rule
    };
  }

  // updateAgeRule
  updateAgeRule(ageRuleId, name, minimumAge, regionType, regionValues, useCaseTemplateCode, enforcementMode, isActive) {
    const rules = this._getFromStorage('age_rules', []);
    const index = rules.findIndex((r) => r.id === ageRuleId);
    if (index === -1) {
      return {
        success: false,
        message: 'Age rule not found.',
        rule: null
      };
    }

    const rule = rules[index];
    if (typeof name === 'string') rule.name = name;
    if (typeof minimumAge === 'number') rule.minimum_age = minimumAge;
    if (typeof regionType === 'string') rule.region_type = regionType;
    if (Array.isArray(regionValues)) rule.region_values = regionValues;
    if (typeof useCaseTemplateCode === 'string') rule.use_case_template_code = useCaseTemplateCode;
    if (typeof enforcementMode === 'string') rule.enforcement_mode = enforcementMode;
    if (typeof isActive === 'boolean') rule.is_active = isActive;
    rule.updated_at = this._nowIso();

    rules[index] = rule;
    this._saveToStorage('age_rules', rules);

    return {
      success: true,
      message: 'Age rule updated.',
      rule: rule
    };
  }

  // getApiKeysOverview
  getApiKeysOverview() {
    const keys = this._getFromStorage('api_keys', []);

    const mapped = keys.map((key) => {
      return {
        id: key.id,
        name: key.name,
        environment: key.environment,
        scopes: Array.isArray(key.scopes) ? key.scopes : [],
        isRevoked: !!key.is_revoked,
        createdAt: key.created_at || '',
        lastUsedAt: key.last_used_at || '',
        lastUsedDisplay: key.last_used_at ? this._formatRelativeTime(key.last_used_at) : 'Never used'
      };
    });

    return { apiKeys: mapped };
  }

  // getApiKeyFormOptions
  getApiKeyFormOptions() {
    const permissionScopes = this._getFromStorage('permission_scopes', []);

    return {
      environments: [
        { value: 'sandbox', label: 'Sandbox' },
        { value: 'production', label: 'Production' }
      ],
      permissionScopes: permissionScopes,
      defaultEnvironment: 'sandbox'
    };
  }

  // createApiKey
  createApiKey(name, environment, scopes, ipRestrictions) {
    const apiKeys = this._getFromStorage('api_keys', []);
    const id = this._generateId('api_key');
    const now = this._nowIso();
    const randomPart = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    const apiKey = {
      id: id,
      name: name,
      environment: environment,
      value: 'sk_' + randomPart,
      scopes: Array.isArray(scopes) ? scopes : [],
      ip_restrictions: Array.isArray(ipRestrictions) ? ipRestrictions : [],
      is_revoked: false,
      created_at: now,
      last_used_at: null
    };

    apiKeys.push(apiKey);
    this._saveToStorage('api_keys', apiKeys);

    return {
      success: true,
      message: 'API key created.',
      apiKey: apiKey
    };
  }

  // getVerificationLogsFilterOptions
  getVerificationLogsFilterOptions() {
    const countries = this._getFromStorage('countries', []);
    const methods = this._getFromStorage('verification_methods', []);

    const today = new Date();
    const endDate = today.toISOString().slice(0, 10);
    const start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = start.toISOString().slice(0, 10);

    return {
      statusOptions: [
        { value: 'any', label: 'Any status' },
        { value: 'succeeded', label: 'Succeeded' },
        { value: 'failed', label: 'Failed' },
        { value: 'pending', label: 'Pending' }
      ],
      countryOptions: countries,
      methodOptions: methods,
      defaultDateRange: {
        startDate: startDate,
        endDate: endDate
      }
    };
  }

  // getVerificationLogs
  getVerificationLogs(startDate, endDate, statusFilter, countryCode, methodCode, sortDirection, page) {
    const logs = this._getFromStorage('verification_logs', []);
    const countries = this._getFromStorage('countries', []);
    const methods = this._getFromStorage('verification_methods', []);

    const start = startDate ? new Date(startDate + 'T00:00:00.000Z').getTime() : null;
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z').getTime() : null;

    const status = statusFilter && statusFilter !== 'any' ? statusFilter : null;
    const sortDir = sortDirection === 'asc' ? 'asc' : 'desc';

    let filtered = logs.filter((log) => {
      if (!log || !log.occurred_at) return false;
      const t = new Date(log.occurred_at).getTime();
      if (isNaN(t)) return false;
      if (start !== null && t < start) return false;
      if (end !== null && t > end) return false;
      if (status && log.status !== status) return false;
      if (countryCode && log.country_code && log.country_code !== countryCode) return false;
      if (methodCode && log.method_code && log.method_code !== methodCode) return false;
      if (countryCode && !log.country_code) return false;
      if (methodCode && !log.method_code) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const ta = new Date(a.occurred_at).getTime();
      const tb = new Date(b.occurred_at).getTime();
      if (sortDir === 'asc') return ta - tb;
      return tb - ta;
    });

    const totalCount = filtered.length;
    const pageSize = 50;
    const currentPage = page && page > 0 ? page : 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paged = filtered.slice(startIndex, startIndex + pageSize);

    const mapped = paged.map((log) => {
      const country = countries.find((c) => c.code === log.country_code) || null;
      const method = methods.find((m) => m.code === log.method_code) || null;
      return {
        id: log.id,
        occurredAt: log.occurred_at,
        status: log.status,
        countryName: country ? country.name : '',
        methodName: method ? method.name : '',
        calculatedAge: typeof log.calculated_age === 'number' ? log.calculated_age : null,
        isOfAge: typeof log.is_of_age === 'boolean' ? log.is_of_age : null,
        failureReasonSummary: log.failure_reason || ''
      };
    });

    return {
      totalCount: totalCount,
      logs: mapped
    };
  }

  // getVerificationLogDetails
  getVerificationLogDetails(logId) {
    const logs = this._getFromStorage('verification_logs', []);
    const flows = this._getFromStorage('verification_flows', []);
    const ageRules = this._getFromStorage('age_rules', []);
    const countries = this._getFromStorage('countries', []);
    const methods = this._getFromStorage('verification_methods', []);

    const log = logs.find((l) => l.id === logId) || null;
    if (!log) return null;

    const result = Object.assign({}, log);

    if (log.flow_id) {
      result.flow = flows.find((f) => f.id === log.flow_id) || null;
    } else {
      result.flow = null;
    }
    if (log.age_rule_id) {
      result.ageRule = ageRules.find((r) => r.id === log.age_rule_id) || null;
    } else {
      result.ageRule = null;
    }
    if (log.country_code) {
      result.country = countries.find((c) => c.code === log.country_code) || null;
    } else {
      result.country = null;
    }
    if (log.method_code) {
      result.method = methods.find((m) => m.code === log.method_code) || null;
    } else {
      result.method = null;
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_openedLogDetails',
        JSON.stringify({ "logId": logId, "viewedAt": this._nowIso() })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // getFlowsList
  getFlowsList() {
    const flows = this._getFromStorage('verification_flows', []);
    const templates = this._getFromStorage('use_case_templates', []);
    const methods = this._getFromStorage('verification_methods', []);

    const mapped = flows.map((flow) => {
      const template = templates.find((t) => t.code === flow.template_code) || null;
      const templateLabel = template ? template.name : flow.template_code;

      const allowedCountriesLabel =
        Array.isArray(flow.allowed_countries) && flow.allowed_countries.length > 0
          ? this._mapCountryCodesToLabels(flow.allowed_countries).join(', ')
          : 'All';

      let primaryMethodLabel = '';
      if (Array.isArray(flow.verification_methods) && flow.verification_methods.length > 0) {
        const primaryCode = flow.verification_methods[0];
        const primaryMethod = methods.find((m) => m.code === primaryCode) || null;
        primaryMethodLabel = primaryMethod ? primaryMethod.name : primaryCode;
      }

      return {
        id: flow.id,
        name: flow.name,
        templateLabel: templateLabel,
        minimumAge: flow.minimum_age,
        allowedCountriesLabel: allowedCountriesLabel,
        primaryMethodLabel: primaryMethodLabel,
        isMobileCarrierCheckEnabled: !!flow.is_mobile_carrier_check_enabled,
        isDocumentUploadEnabled: !!flow.is_document_upload_enabled,
        createdAt: flow.created_at || ''
      };
    });

    return { flows: mapped };
  }

  // getFlowFormOptions
  getFlowFormOptions() {
    const templates = this._getFromStorage('use_case_templates', []);
    const countries = this._getFromStorage('countries', []);
    const verificationMethods = this._getFromStorage('verification_methods', []);

    return {
      templates: templates,
      countries: countries,
      verificationMethods: verificationMethods,
      defaultMinimumAge: 18
    };
  }

  // createVerificationFlow
  createVerificationFlow(name, templateCode, minimumAge, allowedCountries, verificationMethods, isDocumentUploadEnabled, isMobileCarrierCheckEnabled, underageRedirectUrl) {
    const flows = this._getFromStorage('verification_flows', []);
    const id = this._generateId('flow');
    const now = this._nowIso();

    const flow = {
      id: id,
      name: name,
      template_code: templateCode,
      minimum_age: minimumAge,
      allowed_countries: Array.isArray(allowedCountries) ? allowedCountries : [],
      verification_methods: Array.isArray(verificationMethods) ? verificationMethods : [],
      is_document_upload_enabled: !!isDocumentUploadEnabled,
      is_mobile_carrier_check_enabled: !!isMobileCarrierCheckEnabled,
      underage_redirect_url: underageRedirectUrl || null,
      created_at: now,
      updated_at: null
    };

    flows.push(flow);
    this._saveToStorage('verification_flows', flows);

    return {
      success: true,
      message: 'Verification flow created.',
      flow: flow
    };
  }

  // updateVerificationFlow
  updateVerificationFlow(flowId, name, templateCode, minimumAge, allowedCountries, verificationMethods, isDocumentUploadEnabled, isMobileCarrierCheckEnabled, underageRedirectUrl) {
    const flows = this._getFromStorage('verification_flows', []);
    const index = flows.findIndex((f) => f.id === flowId);
    if (index === -1) {
      return {
        success: false,
        message: 'Verification flow not found.',
        flow: null
      };
    }

    const flow = flows[index];
    if (typeof name === 'string') flow.name = name;
    if (typeof templateCode === 'string') flow.template_code = templateCode;
    if (typeof minimumAge === 'number') flow.minimum_age = minimumAge;
    if (Array.isArray(allowedCountries)) flow.allowed_countries = allowedCountries;
    if (Array.isArray(verificationMethods)) flow.verification_methods = verificationMethods;
    if (typeof isDocumentUploadEnabled === 'boolean') flow.is_document_upload_enabled = isDocumentUploadEnabled;
    if (typeof isMobileCarrierCheckEnabled === 'boolean') flow.is_mobile_carrier_check_enabled = isMobileCarrierCheckEnabled;
    if (typeof underageRedirectUrl === 'string') flow.underage_redirect_url = underageRedirectUrl;
    flow.updated_at = this._nowIso();

    flows[index] = flow;
    this._saveToStorage('verification_flows', flows);

    return {
      success: true,
      message: 'Verification flow updated.',
      flow: flow
    };
  }

  // getIntegrationsOverview
  getIntegrationsOverview() {
    const platforms = this._getFromStorage('integration_platforms', []);
    const configs = this._getFromStorage('integration_configs', []);
    const websites = this._getFromStorage('websites', []);

    const existingConfigs = configs.map((cfg) => {
      const website = cfg.website_id ? websites.find((w) => w.id === cfg.website_id) : null;
      return {
        id: cfg.id,
        platformCode: cfg.platform_code,
        websiteName: website ? website.name : '',
        shopUrl: cfg.shop_url || '',
        isActive: !!cfg.is_active
      };
    });

    return {
      platforms: platforms,
      existingConfigs: existingConfigs
    };
  }

  // getShopifyIntegrationFormOptions
  getShopifyIntegrationFormOptions() {
    return {
      ageGateBehaviors: [
        {
          value: 'on_all_pages',
          label: 'On all pages',
          description: 'Show the age gate on every page of the shop.'
        },
        {
          value: 'on_product_pages_only',
          label: 'On product pages only',
          description: 'Only require age verification on product detail pages.'
        },
        {
          value: 'on_homepage_only',
          label: 'On homepage only',
          description: 'Show the age gate only on the homepage.'
        },
        {
          value: 'custom',
          label: 'Custom',
          description: 'Control the age gate using custom rules or tags.'
        }
      ],
      snippetOptions: [
        {
          code: 'theme_extension',
          label: 'Load via theme extension',
          description: 'Install a theme app extension snippet with minimal code changes.'
        },
        {
          code: 'copy_paste_script',
          label: 'Copy-paste script',
          description: 'Manually paste a JavaScript snippet into your theme.'
        }
      ],
      defaultAgeGateBehavior: 'on_all_pages',
      defaultMinimumAge: 18
    };
  }

  // configureShopifyIntegration
  configureShopifyIntegration(shopUrl, ageGateBehavior, minimumAge, snippetOptions) {
    const configs = this._getFromStorage('integration_configs', []);
    const now = this._nowIso();

    const snippetOpts = Array.isArray(snippetOptions) ? snippetOptions : [];

    const generateCode = () => {
      const lines = [];
      lines.push('// Shopify integration for ' + shopUrl);
      lines.push('// Age gate behavior: ' + ageGateBehavior + ', minimum age: ' + minimumAge);
      if (snippetOpts.indexOf('theme_extension') !== -1) {
        lines.push('// Loaded via theme extension');
      }
      if (snippetOpts.indexOf('copy_paste_script') !== -1) {
        lines.push('// Also available as a copy-paste script snippet');
      }
      lines.push('(function(){');
      lines.push('  // Age verification snippet placeholder');
      lines.push('})();');
      return lines.join('\n');
    };

    let config = configs.find((c) => c.platform_code === 'shopify' && c.shop_url === shopUrl) || null;
    const code = generateCode();

    if (config) {
      config.age_gate_behavior = ageGateBehavior;
      config.minimum_age = minimumAge;
      config.snippet_options = snippetOpts;
      config.generated_integration_code = code;
      config.code_generated_at = now;
      config.is_active = true;
    } else {
      config = {
        id: this._generateId('integration_cfg'),
        platform_code: 'shopify',
        website_id: null,
        shop_url: shopUrl,
        age_gate_behavior: ageGateBehavior,
        minimum_age: minimumAge,
        snippet_options: snippetOpts,
        generated_integration_code: code,
        code_generated_at: now,
        is_active: true
      };
      configs.push(config);
    }

    this._saveToStorage('integration_configs', configs);

    return {
      success: true,
      message: 'Shopify integration configured.',
      integrationConfig: config,
      generatedIntegrationCode: code
    };
  }

  // getLegalComplianceOverview
  getLegalComplianceOverview() {
    const regions = this._getFromStorage('legal_regions', []);
    const notices = this._getFromStorage('legal_notices', []);

    const mapped = regions.map((region) => {
      const notice = notices.find((n) => n.region_code === region.code) || null;
      return {
        regionCode: region.code,
        regionName: region.name,
        currentNoticeTitle: notice ? notice.title : '',
        requireExplicitCheckbox: notice ? !!notice.require_explicit_checkbox : false
      };
    });

    return { regions: mapped };
  }

  // getLegalNoticeDetails
  getLegalNoticeDetails(regionCode) {
    const notices = this._getFromStorage('legal_notices', []);
    const notice = notices.find((n) => n.region_code === regionCode) || null;
    return notice;
  }

  // updateLegalNotice
  updateLegalNotice(regionCode, title, body, requireExplicitCheckbox, checkboxLabel) {
    const notices = this._getFromStorage('legal_notices', []);
    const now = this._nowIso();

    let notice = notices.find((n) => n.region_code === regionCode) || null;
    if (notice) {
      notice.title = title;
      notice.body = body;
      notice.require_explicit_checkbox = !!requireExplicitCheckbox;
      notice.checkbox_label = checkboxLabel || null;
      notice.updated_at = now;
    } else {
      notice = {
        id: this._generateId('legal_notice'),
        region_code: regionCode,
        title: title,
        body: body,
        require_explicit_checkbox: !!requireExplicitCheckbox,
        checkbox_label: checkboxLabel || null,
        updated_at: now
      };
      notices.push(notice);
    }

    this._saveToStorage('legal_notices', notices);

    return {
      success: true,
      message: 'Legal notice updated.',
      legalNotice: notice
    };
  }

  // getAlertsOverview
  getAlertsOverview() {
    const alerts = this._getFromStorage('alerts', []);
    const metrics = this._getFromStorage('monitoring_metrics', []);
    const websites = this._getFromStorage('websites', []);
    const flows = this._getFromStorage('verification_flows', []);

    const timeframeLabel = (tf) => {
      if (tf === 'per_minute') return 'per minute';
      if (tf === 'per_hour') return 'per hour';
      if (tf === 'per_day') return 'per day';
      return tf;
    };

    const mapped = alerts.map((alert) => {
      const metric = metrics.find((m) => m.code === alert.metric_code) || null;
      const metricLabel = metric ? metric.name : alert.metric_code;
      const thresholdDescription =
        alert.threshold_quantity + ' ' + timeframeLabel(alert.threshold_timeframe);

      let scopeLabel = '';
      if (alert.scope_type === 'all_websites') {
        scopeLabel = 'All websites';
      } else if (alert.scope_type === 'single_website' && alert.scope_value) {
        const website = websites.find((w) => w.id === alert.scope_value) || null;
        scopeLabel = website ? website.name : 'Website';
      } else if (alert.scope_type === 'flow' && alert.scope_value) {
        const flow = flows.find((f) => f.id === alert.scope_value) || null;
        scopeLabel = flow ? flow.name : 'Flow';
      }

      return {
        id: alert.id,
        name: alert.name,
        metricLabel: metricLabel,
        thresholdDescription: thresholdDescription,
        notificationChannels: Array.isArray(alert.notification_channels)
          ? alert.notification_channels
          : [],
        scopeLabel: scopeLabel,
        isActive: !!alert.is_active,
        createdAt: alert.created_at || ''
      };
    });

    return { alerts: mapped };
  }

  // getAlertFormOptions
  getAlertFormOptions() {
    const metrics = this._getFromStorage('monitoring_metrics', []);
    const websites = this._getFromStorage('websites', []);
    const flows = this._getFromStorage('verification_flows', []);

    return {
      metrics: metrics,
      thresholdTimeframes: [
        { value: 'per_minute', label: 'Per minute' },
        { value: 'per_hour', label: 'Per hour' },
        { value: 'per_day', label: 'Per day' }
      ],
      notificationChannelOptions: [
        { code: 'email', label: 'Email' },
        { code: 'in_dashboard_banner', label: 'In-dashboard banner' },
        { code: 'webhook', label: 'Webhook' }
      ],
      scopeTypes: [
        { value: 'all_websites', label: 'All websites' },
        { value: 'single_website', label: 'Single website' },
        { value: 'flow', label: 'Specific flow' }
      ],
      websites: websites,
      flows: flows
    };
  }

  // createAlert
  createAlert(name, metricCode, thresholdQuantity, thresholdTimeframe, notificationChannels, scopeType, websiteId, flowId) {
    const alerts = this._getFromStorage('alerts', []);
    const id = this._generateId('alert');
    const now = this._nowIso();

    let scopeValue = null;
    if (scopeType === 'single_website') {
      scopeValue = websiteId || null;
    } else if (scopeType === 'flow') {
      scopeValue = flowId || null;
    }

    const alert = {
      id: id,
      name: name,
      metric_code: metricCode,
      threshold_quantity: thresholdQuantity,
      threshold_timeframe: thresholdTimeframe,
      notification_channels: Array.isArray(notificationChannels) ? notificationChannels : [],
      scope_type: scopeType,
      scope_value: scopeValue,
      is_active: true,
      created_at: now
    };

    alerts.push(alert);
    this._saveToStorage('alerts', alerts);

    return {
      success: true,
      message: 'Alert created.',
      alert: alert
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      headline: 'Building safer digital experiences with privacy-first age checks',
      missionParagraphs: [
        'We help businesses verify customer age without sacrificing privacy or user experience.',
        'From online stores to streaming platforms and gaming communities, our tools make it easy to stay compliant with regional age regulations.'
      ],
      industriesServed: [
        {
          industryName: 'E-commerce & Retail',
          description:
            'Protect your storefront with age gates for alcohol, tobacco, vape, adult products, and more.'
        },
        {
          industryName: 'Streaming & Media',
          description:
            'Gate age-restricted movies, TV shows, and user-generated content with flexible verification methods.'
        },
        {
          industryName: 'Gaming & Gambling',
          description:
            'Onboard players responsibly with flows tailored for gaming, betting, and fantasy sports.'
        }
      ],
      trustHighlights: [
        'Privacy-by-design architecture with minimal data retention.',
        'Configurable rules per country and use case.',
        'Sandbox environments for rapid testing and QA.'
      ]
    };
  }

  // getDocsOverview
  getDocsOverview() {
    return {
      apiReferenceSections: [
        {
          sectionId: 'auth',
          title: 'Authentication',
          summary: 'Learn how to authenticate using API keys in sandbox and production.'
        },
        {
          sectionId: 'verifications',
          title: 'Verifications API',
          summary: 'Create, manage, and inspect age verification requests.'
        },
        {
          sectionId: 'webhooks',
          title: 'Webhooks',
          summary: 'Receive asynchronous callbacks for verification results.'
        }
      ],
      sdkLanguages: ['javascript', 'typescript', 'python', 'php'],
      integrationGuides: [
        {
          platformCode: 'shopify',
          platformName: 'Shopify',
          guideTitle: 'Shopify Age Gate Setup',
          summary: 'Add an age gate to your Shopify storefront using our theme extension.'
        },
        {
          platformCode: 'woocommerce',
          platformName: 'WooCommerce',
          guideTitle: 'WooCommerce Integration',
          summary: 'Install and configure the WooCommerce plugin for age-restricted products.'
        },
        {
          platformCode: 'api_only',
          platformName: 'Custom sites',
          guideTitle: 'API-Only Integration',
          summary: 'Use our REST API and JavaScript SDK to build a fully custom experience.'
        }
      ]
    };
  }

  // getSupportOverview
  getSupportOverview() {
    const categories = this._getStaticFaqData();
    return {
      faqCategories: categories,
      contactHelpText: 'Can\'t find what you\'re looking for? Contact our support team for further assistance.'
    };
  }

  // searchSupportFaq
  searchSupportFaq(query, categoryId) {
    const q = (query || '').toLowerCase();
    const categories = this._getStaticFaqData();
    const results = [];

    categories.forEach((cat) => {
      if (categoryId && cat.categoryId !== categoryId) return;
      (cat.topQuestions || []).forEach((qItem) => {
        const inQuestion = qItem.question.toLowerCase().indexOf(q) !== -1;
        const inAnswer = qItem.answerSnippet.toLowerCase().indexOf(q) !== -1;
        if (!q || inQuestion || inAnswer) {
          results.push({
            questionId: qItem.questionId,
            question: qItem.question,
            answerSnippet: qItem.answerSnippet,
            categoryName: cat.name
          });
        }
      });
    });

    return {
      query: query,
      results: results
    };
  }

  // getContactPageContent
  getContactPageContent() {
    return {
      introText: 'Have a question about integrations, pricing, or compliance? Get in touch with our team.',
      topics: [
        { code: 'sales', label: 'Sales & Pricing' },
        { code: 'technical_support', label: 'Technical Support' },
        { code: 'compliance', label: 'Compliance & Legal' }
      ],
      contactEmail: 'support@example.com',
      officeAddress: '123 Privacy Way, Suite 100, Example City, Country'
    };
  }

  // submitContactInquiry
  submitContactInquiry(name, email, topicCode, message) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const ticketId = this._generateId('ticket');
    const now = this._nowIso();

    const inquiry = {
      id: ticketId,
      name: name,
      email: email,
      topic_code: topicCode,
      message: message,
      created_at: now
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Your inquiry has been submitted. We\'ll get back to you shortly.',
      ticketId: ticketId
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    return {
      title: 'Privacy Policy',
      lastUpdated: '2024-01-01',
      sections: [
        {
          sectionId: 'overview',
          heading: 'Overview',
          body: 'This Privacy Policy explains how we process personal data when providing age verification and related services.'
        },
        {
          sectionId: 'data_collected',
          heading: 'Information We Collect',
          body: 'Depending on your integration, we may process data such as date of birth, document metadata, IP address, and device information.'
        },
        {
          sectionId: 'data_use',
          heading: 'How We Use Data',
          body: 'We use collected data solely for age verification, fraud prevention, analytics, and compliance purposes.'
        },
        {
          sectionId: 'retention',
          heading: 'Data Retention',
          body: 'We retain verification logs and related data only for as long as necessary to provide the service and comply with legal obligations.'
        }
      ]
    };
  }

  // getTermsOfServiceContent
  getTermsOfServiceContent() {
    return {
      title: 'Terms of Service',
      lastUpdated: '2024-01-01',
      sections: [
        {
          sectionId: 'acceptance',
          heading: 'Acceptance of Terms',
          body: 'By using our services, you agree to be bound by these Terms of Service.'
        },
        {
          sectionId: 'accounts',
          heading: 'Accounts & Access',
          body: 'You are responsible for maintaining the confidentiality of your account credentials and API keys.'
        },
        {
          sectionId: 'acceptable_use',
          heading: 'Acceptable Use',
          body: 'You may not use the service for unlawful activities or in violation of applicable age restriction laws.'
        },
        {
          sectionId: 'liability',
          heading: 'Limitation of Liability',
          body: 'To the maximum extent permitted by law, we are not liable for indirect or consequential damages arising from your use of the service.'
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