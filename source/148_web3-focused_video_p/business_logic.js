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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keys = [
      'service_packages',
      'project_briefs',
      'budget_range_options',
      'video_types',
      'quote_addons',
      'quote_estimates',
      'portfolio_projects',
      'favorite_projects',
      'articles',
      'reading_list_entries',
      'demo_projects',
      'demo_milestones',
      'faq_items',
      'contact_inquiries',
      'strategy_call_bookings',
      'site_preferences',
      'custom_quote_requests'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // =========================
  // Helper Functions
  // =========================

  // Internal helper to load SitePreference from local storage or initialize defaults.
  _loadSitePreferences() {
    let prefs = this._getFromStorage('site_preferences');
    if (!Array.isArray(prefs)) {
      prefs = [];
    }
    let pref = prefs[0];
    if (!pref) {
      pref = {
        id: this._generateId('site_pref'),
        theme: 'light',
        currency: 'usd',
        updated_at: new Date().toISOString()
      };
      this._saveToStorage('site_preferences', [pref]);
    }
    return pref;
  }

  // Internal helper to persist SitePreference changes to local storage.
  _saveSitePreferences(preference) {
    this._saveToStorage('site_preferences', [preference]);
  }

  // Internal helper to fetch or create the single-user FavoriteProjectList.
  _getOrCreateFavoriteProjectList() {
    let lists = this._getFromStorage('favorite_projects');
    if (!Array.isArray(lists)) {
      lists = [];
    }
    let list = lists[0];
    if (!list) {
      list = {
        id: this._generateId('favorite_list'),
        project_ids: [],
        updated_at: new Date().toISOString()
      };
      lists.push(list);
      this._saveToStorage('favorite_projects', lists);
    }
    return list;
  }

  // Internal helper to convert numeric amounts between 'usd' and 'eur'.
  _convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    const rateUsdToEur = 0.9; // simple fixed rate for business logic purposes
    if (fromCurrency === 'usd' && toCurrency === 'eur') {
      return amount * rateUsdToEur;
    }
    if (fromCurrency === 'eur' && toCurrency === 'usd') {
      return amount / rateUsdToEur;
    }
    // Unknown currency combination; return original amount
    return amount;
  }

  // Internal helper to compute quote base price, add-on totals, and currency conversions.
  _calculateQuoteTotals(videoTypeId, runtimeSeconds, deliveryTimeline, selectedAddonIds, currencyOverride) {
    const videoTypes = this._getFromStorage('video_types');
    const addons = this._getFromStorage('quote_addons');
    const sitePref = this._loadSitePreferences();
    const displayCurrency = currencyOverride || sitePref.currency || 'usd';

    const videoType = videoTypes.find(v => v.id === videoTypeId) || null;

    let basePriceUsd = 0;
    if (videoType && typeof videoType.base_price_usd === 'number' && typeof videoType.base_runtime_seconds === 'number' && videoType.base_runtime_seconds > 0) {
      const factor = runtimeSeconds / videoType.base_runtime_seconds;
      basePriceUsd = videoType.base_price_usd * factor;
    }

    let addonsTotalUsd = 0;
    if (Array.isArray(selectedAddonIds) && selectedAddonIds.length) {
      for (const addonId of selectedAddonIds) {
        const addon = addons.find(a => a.id === addonId);
        if (addon && typeof addon.price_usd === 'number') {
          addonsTotalUsd += addon.price_usd;
        }
      }
    }

    const estimatedTotalUsd = basePriceUsd + addonsTotalUsd;
    const estimatedTotalConverted = displayCurrency === 'usd'
      ? estimatedTotalUsd
      : this._convertCurrency(estimatedTotalUsd, 'usd', displayCurrency);

    return {
      basePriceUsd,
      addonsTotalUsd,
      estimatedTotalUsd,
      currency: displayCurrency,
      estimatedTotalConverted
    };
  }

  // Internal helper to find the nearest available strategy call slot matching a preferred day/time.
  _findNearestAvailableSlot(availability, preferredDayOfWeek, preferredTime) {
    if (!Array.isArray(availability) || availability.length === 0) {
      return null;
    }
    for (const day of availability) {
      if (!day || !day.date || !Array.isArray(day.timeSlots)) continue;
      const dateObj = new Date(day.date);
      if (typeof preferredDayOfWeek === 'number') {
        if (dateObj.getUTCDay() !== preferredDayOfWeek) {
          continue;
        }
      }
      const slot = day.timeSlots.find(ts => ts.time === preferredTime && ts.isAvailable);
      if (slot) {
        return { date: day.date, time: slot.time };
      }
    }
    return null;
  }

  // Internal helper to create and store ContactInquiry records from various sources.
  _persistContactInquiry(source, topic, projectType, companyName, email, message) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const inquiry = {
      id: this._generateId('contact_inquiry'),
      source: source, // 'faq_context', 'contact_page', 'other'
      topic: topic, // e.g., 'security_compliance'
      project_type: projectType, // e.g., 'token_launch_campaign'
      company_name: companyName || null,
      email: email,
      message: message || null,
      created_at: new Date().toISOString()
    };
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);
    return inquiry;
  }

  // =========================
  // Core interface implementations
  // =========================

  // 1. getSitePreferences
  getSitePreferences() {
    const pref = this._loadSitePreferences();
    return {
      theme: pref.theme,
      currency: pref.currency
    };
  }

  // 2. updateSitePreferences(theme, currency)
  updateSitePreferences(theme, currency) {
    let pref = this._loadSitePreferences();
    let changed = false;
    const allowedThemes = ['light', 'dark'];
    const allowedCurrencies = ['usd', 'eur'];

    if (typeof theme === 'string' && allowedThemes.includes(theme) && pref.theme !== theme) {
      pref.theme = theme;
      changed = true;
    }

    if (typeof currency === 'string' && allowedCurrencies.includes(currency) && pref.currency !== currency) {
      pref.currency = currency;
      changed = true;
    }

    if (changed) {
      pref.updated_at = new Date().toISOString();
      this._saveSitePreferences(pref);
    }

    return {
      success: true,
      preference: pref,
      message: changed ? 'Preferences updated.' : 'No changes applied.'
    };
  }

  // 3. getHomepageContent()
  getHomepageContent() {
    // Hero copy is considered static application content, not mock data.
    const hero = {
      headline: 'Launch Web3 stories that actually convert.',
      subheadline: 'DeFi, NFTs, GameFi, and metaverse video campaigns built for crypto-native audiences.'
    };

    const servicePackages = this._getFromStorage('service_packages') || [];
    const portfolioProjects = this._getFromStorage('portfolio_projects') || [];
    const articles = this._getFromStorage('articles') || [];

    const featuredServicePackages = servicePackages
      .filter(sp => sp.is_active !== false)
      .sort((a, b) => {
        const ad = a.created_at ? Date.parse(a.created_at) : 0;
        const bd = b.created_at ? Date.parse(b.created_at) : 0;
        return bd - ad;
      })
      .slice(0, 3);

    const featuredPortfolioProjects = portfolioProjects
      .slice()
      .sort((a, b) => {
        const av = typeof a.views === 'number' ? a.views : 0;
        const bv = typeof b.views === 'number' ? b.views : 0;
        return bv - av;
      })
      .slice(0, 3);

    const featuredArticles = articles
      .filter(a => a.is_published !== false)
      .sort((a, b) => {
        const ad = a.publish_date ? Date.parse(a.publish_date) : 0;
        const bd = b.publish_date ? Date.parse(b.publish_date) : 0;
        return bd - ad;
      })
      .slice(0, 3);

    return {
      hero,
      featuredServicePackages,
      featuredPortfolioProjects,
      featuredArticles
    };
  }

  // 4. getServiceFilterOptions()
  getServiceFilterOptions() {
    const campaignTypeLabels = {
      nft_token_launch: 'NFT / Token Launch',
      defi: 'DeFi Campaigns',
      gamefi_play_to_earn: 'GameFi / Play-to-Earn',
      metaverse_experiences: 'Metaverse Experiences',
      general_web3: 'General Web3'
    };

    const servicePackages = this._getFromStorage('service_packages') || [];
    const existingCampaignTypes = Array.from(
      new Set(servicePackages.map(sp => sp.campaign_type).filter(Boolean))
    );

    const campaignTypes = existingCampaignTypes.map(value => ({
      value,
      label: campaignTypeLabels[value] || value
    }));

    // Budget presets from BudgetRangeOption in USD
    const budgetOptions = this._getFromStorage('budget_range_options') || [];
    const budgetPresets = budgetOptions
      .filter(opt => opt.currency === 'usd')
      .sort((a, b) => {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      })
      .map(opt => ({
        min: typeof opt.min_amount === 'number' ? opt.min_amount : 0,
        max: typeof opt.max_amount === 'number' ? opt.max_amount : 0,
        label: opt.label
      }));

    // Duration options (static config for labels/ranges)
    const durationOptions = [
      {
        value: '30_60_seconds',
        label: '30–60 seconds',
        minSeconds: 30,
        maxSeconds: 60
      },
      {
        value: '60_90_seconds',
        label: '60–90 seconds',
        minSeconds: 60,
        maxSeconds: 90
      },
      {
        value: 'under_90_seconds',
        label: 'Under 90 seconds',
        minSeconds: 0,
        maxSeconds: 90
      },
      {
        value: '90_180_seconds',
        label: '90–180 seconds',
        minSeconds: 90,
        maxSeconds: 180
      }
    ];

    return {
      campaignTypes,
      budgetPresets,
      durationOptions
    };
  }

  // 5. getServicePackages(campaignType, minBudget, maxBudget, minDurationSeconds, maxDurationSeconds, currency, includeInactive)
  getServicePackages(campaignType, minBudget, maxBudget, minDurationSeconds, maxDurationSeconds, currency, includeInactive) {
    const sitePref = this._loadSitePreferences();
    const displayCurrency = currency || sitePref.currency || 'usd';
    const packages = this._getFromStorage('service_packages') || [];

    const result = packages.filter(sp => {
      if (!includeInactive && sp.is_active === false) {
        return false;
      }

      if (campaignType && sp.campaign_type !== campaignType) {
        return false;
      }

      const priceInCurrency = (() => {
        if (displayCurrency === 'usd') {
          if (typeof sp.base_price_usd === 'number') return sp.base_price_usd;
          if (typeof sp.base_price_eur === 'number') return this._convertCurrency(sp.base_price_eur, 'eur', 'usd');
          return 0;
        }
        if (displayCurrency === 'eur') {
          if (typeof sp.base_price_eur === 'number') return sp.base_price_eur;
          if (typeof sp.base_price_usd === 'number') return this._convertCurrency(sp.base_price_usd, 'usd', 'eur');
          return 0;
        }
        return typeof sp.base_price_usd === 'number' ? sp.base_price_usd : 0;
      })();

      if (typeof minBudget === 'number' && priceInCurrency < minBudget) {
        return false;
      }
      if (typeof maxBudget === 'number' && priceInCurrency > maxBudget) {
        return false;
      }

      if (typeof minDurationSeconds === 'number' && sp.duration_seconds < minDurationSeconds) {
        return false;
      }
      if (typeof maxDurationSeconds === 'number' && sp.duration_seconds > maxDurationSeconds) {
        return false;
      }

      return true;
    });

    // Instrumentation for task completion tracking (task_1)
    try {
      if (
        campaignType === 'nft_token_launch' &&
        minBudget === 5000 &&
        maxBudget === 8000 &&
        minDurationSeconds === 30 &&
        maxDurationSeconds === 60
      ) {
        const payload = {
          campaignType,
          minBudget,
          maxBudget,
          minDurationSeconds,
          maxDurationSeconds,
          currency: displayCurrency
        };
        localStorage.setItem('task1_nftServiceFilterParams', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error (task1_nftServiceFilterParams):', e);
    }

    return result;
  }

  // 6. getServicePackageDetail(servicePackageId)
  getServicePackageDetail(servicePackageId) {
    const packages = this._getFromStorage('service_packages') || [];
    const servicePackage = packages.find(sp => sp.id === servicePackageId) || null;

    // Instrumentation for task completion tracking (task_4 and task_8)
    try {
      if (servicePackage) {
        // task_4: track compared DeFi Explainer and NFT Collection Trailer packages
        if (
          servicePackage.service_key === 'defi_explainer_video' ||
          servicePackage.service_key === 'nft_collection_trailer'
        ) {
          let existingIds = [];
          const existingRaw = localStorage.getItem('task4_comparedPackageIds');
          if (existingRaw) {
            try {
              const parsed = JSON.parse(existingRaw);
              if (Array.isArray(parsed)) {
                existingIds = parsed;
              } else if (parsed && Array.isArray(parsed.viewedPackageIds)) {
                existingIds = parsed.viewedPackageIds;
              }
            } catch (e2) {
              existingIds = [];
            }
          }
          if (!existingIds.includes(servicePackageId)) {
            existingIds.push(servicePackageId);
          }
          const payload = { viewedPackageIds: existingIds };
          localStorage.setItem('task4_comparedPackageIds', JSON.stringify(payload));
        }

        // task_8: track Metaverse Event Sizzle Reel package view with currency context
        if (servicePackage.service_key === 'metaverse_event_sizzle_reel') {
          const sitePref = this._loadSitePreferences();
          const payload8 = {
            servicePackageId: servicePackage.id,
            currencyAtView: sitePref && sitePref.currency ? sitePref.currency : 'usd',
            viewedAt: new Date().toISOString()
          };
          localStorage.setItem('task8_metaversePackageView', JSON.stringify(payload8));
        }
      }
    } catch (e) {
      console.error('Instrumentation error (servicePackageDetail tasks):', e);
    }

    return { servicePackage };
  }

  // 7. getProjectBriefConfig(servicePackageId)
  getProjectBriefConfig(servicePackageId) {
    const packages = this._getFromStorage('service_packages') || [];
    const servicePackage = packages.find(sp => sp.id === servicePackageId) || null;

    const budgetOptions = this._getFromStorage('budget_range_options') || [];
    const estimatedBudgetOptions = budgetOptions;

    const projectTypeOptions = [
      {
        value: 'nft_launch_promo',
        label: 'NFT Launch Promo',
        recommendedForServiceKeys: ['nft_launch_promo', 'nft_launch_trailer', 'nft_collection_trailer']
      },
      {
        value: 'defi_explainer',
        label: 'DeFi Explainer',
        recommendedForServiceKeys: ['defi_explainer_video']
      },
      {
        value: 'gamefi_trailer',
        label: 'GameFi Trailer',
        recommendedForServiceKeys: []
      },
      {
        value: 'metaverse_event_sizzle',
        label: 'Metaverse Event Sizzle',
        recommendedForServiceKeys: ['metaverse_event_sizzle_reel']
      },
      {
        value: 'token_launch_campaign',
        label: 'Token Launch Campaign',
        recommendedForServiceKeys: []
      },
      {
        value: 'other',
        label: 'Other',
        recommendedForServiceKeys: []
      }
    ];

    let defaultProjectType = 'other';
    if (servicePackage && servicePackage.service_key) {
      for (const opt of projectTypeOptions) {
        if (Array.isArray(opt.recommendedForServiceKeys) && opt.recommendedForServiceKeys.includes(servicePackage.service_key)) {
          defaultProjectType = opt.value;
          break;
        }
      }
    }

    return {
      servicePackage,
      estimatedBudgetOptions,
      projectTypeOptions,
      defaultProjectType
    };
  }

  // 8. submitProjectBrief(servicePackageId, estimatedBudgetOptionId, projectType, title, description, objectives, creativeDirection, companyName, contactEmail)
  submitProjectBrief(servicePackageId, estimatedBudgetOptionId, projectType, title, description, objectives, creativeDirection, companyName, contactEmail) {
    const packages = this._getFromStorage('service_packages') || [];
    const budgets = this._getFromStorage('budget_range_options') || [];
    const briefs = this._getFromStorage('project_briefs') || [];

    const servicePackage = packages.find(sp => sp.id === servicePackageId) || null;
    const estimatedBudgetOption = budgets.find(b => b.id === estimatedBudgetOptionId) || null;

    const now = new Date().toISOString();
    const brief = {
      id: this._generateId('project_brief'),
      service_package_id: servicePackageId,
      estimated_budget_option_id: estimatedBudgetOptionId,
      project_type: projectType,
      title: title || null,
      description: description || null,
      objectives: objectives || null,
      creative_direction: creativeDirection || null,
      company_name: companyName || null,
      contact_email: contactEmail || null,
      created_at: now,
      updated_at: now
    };

    briefs.push(brief);
    this._saveToStorage('project_briefs', briefs);

    // Foreign key resolution: include full referenced objects
    const enrichedBrief = {
      ...brief,
      service_package: servicePackage,
      estimated_budget_option: estimatedBudgetOption
    };

    return {
      success: true,
      projectBrief: enrichedBrief,
      message: 'Project brief submitted.'
    };
  }

  // 9. getQuoteBuilderConfig()
  getQuoteBuilderConfig() {
    const videoTypes = (this._getFromStorage('video_types') || []).filter(v => v.is_active !== false);
    const addons = (this._getFromStorage('quote_addons') || []).filter(a => a.is_active !== false);

    // Derive runtime options from existing video types (unique base runtimes)
    const runtimeSet = new Set();
    for (const vt of videoTypes) {
      if (typeof vt.base_runtime_seconds === 'number' && vt.base_runtime_seconds > 0) {
        runtimeSet.add(vt.base_runtime_seconds);
      }
    }
    let runtimeOptionsSeconds = Array.from(runtimeSet).sort((a, b) => a - b);
    if (runtimeOptionsSeconds.length === 0) {
      runtimeOptionsSeconds = [30, 60, 90];
    }

    const deliveryTimelines = [
      { value: '2_weeks', label: '2 weeks' },
      { value: '4_weeks', label: '4 weeks' },
      { value: '6_weeks', label: '6 weeks' }
    ];

    const sitePref = this._loadSitePreferences();

    return {
      videoTypes,
      addons,
      runtimeOptionsSeconds,
      deliveryTimelines,
      defaultCurrency: sitePref.currency || 'usd'
    };
  }

  // 10. calculateQuoteEstimate(videoTypeId, runtimeSeconds, deliveryTimeline, selectedAddonIds, currency)
  calculateQuoteEstimate(videoTypeId, runtimeSeconds, deliveryTimeline, selectedAddonIds, currency) {
    const totals = this._calculateQuoteTotals(videoTypeId, runtimeSeconds, deliveryTimeline, selectedAddonIds || [], currency);
    return {
      basePriceUsd: totals.basePriceUsd,
      addonsTotalUsd: totals.addonsTotalUsd,
      estimatedTotalUsd: totals.estimatedTotalUsd,
      currency: totals.currency,
      estimatedTotalConverted: totals.estimatedTotalConverted
    };
  }

  // 11. saveQuoteEstimate(videoTypeId, runtimeSeconds, deliveryTimeline, selectedAddonIds, currency, email, label)
  saveQuoteEstimate(videoTypeId, runtimeSeconds, deliveryTimeline, selectedAddonIds, currency, email, label) {
    const totals = this._calculateQuoteTotals(videoTypeId, runtimeSeconds, deliveryTimeline, selectedAddonIds || [], currency);
    const estimates = this._getFromStorage('quote_estimates') || [];

    const quoteEstimate = {
      id: this._generateId('quote_estimate'),
      video_type_id: videoTypeId,
      runtime_seconds: runtimeSeconds,
      delivery_timeline: deliveryTimeline,
      selected_addon_ids: Array.isArray(selectedAddonIds) ? selectedAddonIds : [],
      base_price_usd: totals.basePriceUsd,
      addons_total_usd: totals.addonsTotalUsd,
      estimated_total_usd: totals.estimatedTotalUsd,
      currency: totals.currency,
      estimated_total_converted: totals.estimatedTotalConverted,
      email: email,
      label: label || null,
      created_at: new Date().toISOString()
    };

    estimates.push(quoteEstimate);
    this._saveToStorage('quote_estimates', estimates);

    // Foreign key resolution: videoType and selectedAddons
    const videoTypes = this._getFromStorage('video_types') || [];
    const addons = this._getFromStorage('quote_addons') || [];
    const videoType = videoTypes.find(v => v.id === quoteEstimate.video_type_id) || null;
    const selectedAddons = quoteEstimate.selected_addon_ids.map(id => addons.find(a => a.id === id) || null);

    const enriched = {
      ...quoteEstimate,
      videoType,
      selectedAddons
    };

    return {
      success: true,
      quoteEstimate: enriched,
      message: 'Quote estimate saved.'
    };
  }

  // 12. getCustomQuoteFormOptions()
  getCustomQuoteFormOptions() {
    const needTypes = [
      {
        value: 'social_media_cutdowns',
        label: 'Social Media Cutdowns',
        description: 'Short edits for Twitter, TikTok, and other social channels.'
      },
      {
        value: 'full_video_production',
        label: 'Full Video Production',
        description: 'End-to-end concept, production, and delivery.'
      },
      {
        value: 'campaign_strategy',
        label: 'Campaign Strategy',
        description: 'Messaging, positioning, and content roadmap.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Something else not listed here.'
      }
    ];

    const approxLengths = [
      { value: 'up_to_15_seconds', label: 'Up to 15 seconds' },
      { value: '15_30_seconds', label: '15–30 seconds' },
      { value: '30_45_seconds', label: '30–45 seconds' },
      { value: '45_60_seconds', label: '45–60 seconds' },
      { value: '60_90_seconds', label: '60–90 seconds' },
      { value: 'over_90_seconds', label: 'Over 90 seconds' }
    ];

    const currencies = [
      { value: 'usd', label: 'USD $' },
      { value: 'eur', label: 'EUR €' }
    ];

    const budgetOptions = this._getFromStorage('budget_range_options') || [];
    const budgetPresets = budgetOptions
      .filter(opt => opt.currency === 'usd')
      .sort((a, b) => {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      })
      .map(opt => ({
        min: typeof opt.min_amount === 'number' ? opt.min_amount : 0,
        max: typeof opt.max_amount === 'number' ? opt.max_amount : 0,
        label: opt.label
      }));

    return {
      needTypes,
      approxLengths,
      currencies,
      budgetPresets
    };
  }

  // 13. submitCustomQuoteRequest(hasMainVideo, needType, numberOfVideos, approxLengthPerVideo, budgetMin, budgetMax, currency, email, companyName, additionalDetails)
  submitCustomQuoteRequest(hasMainVideo, needType, numberOfVideos, approxLengthPerVideo, budgetMin, budgetMax, currency, email, companyName, additionalDetails) {
    const requests = this._getFromStorage('custom_quote_requests') || [];

    const request = {
      id: this._generateId('custom_quote'),
      has_main_video: !!hasMainVideo,
      need_type: needType,
      number_of_videos: Number(numberOfVideos) || 0,
      approx_length_per_video: approxLengthPerVideo,
      budget_min: typeof budgetMin === 'number' ? budgetMin : 0,
      budget_max: typeof budgetMax === 'number' ? budgetMax : 0,
      currency: currency || 'usd',
      email: email,
      company_name: companyName || null,
      additional_details: additionalDetails || null,
      created_at: new Date().toISOString()
    };

    requests.push(request);
    this._saveToStorage('custom_quote_requests', requests);

    return {
      success: true,
      customQuoteRequest: request,
      message: 'Custom quote request submitted.'
    };
  }

  // 14. getPortfolioFilterOptions()
  getPortfolioFilterOptions() {
    const projects = this._getFromStorage('portfolio_projects') || [];

    const categoryLabels = {
      gamefi_play_to_earn: 'GameFi / Play-to-Earn',
      defi: 'DeFi',
      nft_collection: 'NFT Collections',
      metaverse_experience: 'Metaverse Experiences',
      dao: 'DAOs',
      token_launch_campaign: 'Token Launch Campaigns'
    };

    const chainLabels = {
      polygon: 'Polygon',
      ethereum: 'Ethereum',
      solana: 'Solana',
      binance_smart_chain: 'BNB Smart Chain',
      avalanche: 'Avalanche',
      other: 'Other'
    };

    const categoriesSet = new Set(projects.map(p => p.category).filter(Boolean));
    const chainsSet = new Set(projects.map(p => p.chain).filter(Boolean));

    const categories = Array.from(categoriesSet).map(value => ({
      value,
      label: categoryLabels[value] || value
    }));

    const chains = Array.from(chainsSet).map(value => ({
      value,
      label: chainLabels[value] || value
    }));

    const durationOptions = [
      {
        value: 'under_90_seconds',
        label: 'Under 90 seconds',
        minSeconds: 0,
        maxSeconds: 90
      },
      {
        value: '90_180_seconds',
        label: '90–180 seconds',
        minSeconds: 90,
        maxSeconds: 180
      },
      {
        value: 'over_180_seconds',
        label: 'Over 180 seconds',
        minSeconds: 180,
        maxSeconds: 10 * 60
      }
    ];

    const sortOptions = [
      { value: 'views_desc', label: 'Views: High to Low' },
      { value: 'views_asc', label: 'Views: Low to High' },
      { value: 'newest_first', label: 'Newest First' }
    ];

    return {
      categories,
      chains,
      durationOptions,
      sortOptions
    };
  }

  // 15. getPortfolioProjects(category, chain, minDurationSeconds, maxDurationSeconds, sort, limit, offset)
  getPortfolioProjects(category, chain, minDurationSeconds, maxDurationSeconds, sort, limit, offset) {
    let projects = this._getFromStorage('portfolio_projects') || [];

    projects = projects.filter(p => {
      if (category && p.category !== category) return false;
      if (chain && p.chain !== chain) return false;
      if (typeof minDurationSeconds === 'number' && p.duration_seconds < minDurationSeconds) return false;
      if (typeof maxDurationSeconds === 'number' && p.duration_seconds > maxDurationSeconds) return false;
      return true;
    });

    if (sort === 'views_desc') {
      projects.sort((a, b) => {
        const av = typeof a.views === 'number' ? a.views : 0;
        const bv = typeof b.views === 'number' ? b.views : 0;
        return bv - av;
      });
    } else if (sort === 'views_asc') {
      projects.sort((a, b) => {
        const av = typeof a.views === 'number' ? a.views : 0;
        const bv = typeof b.views === 'number' ? b.views : 0;
        return av - bv;
      });
    } else if (sort === 'newest_first') {
      projects.sort((a, b) => {
        const ad = a.created_at ? Date.parse(a.created_at) : 0;
        const bd = b.created_at ? Date.parse(b.created_at) : 0;
        return bd - ad;
      });
    }

    const effectiveLimit = typeof limit === 'number' && limit > 0 ? limit : 20;
    const effectiveOffset = typeof offset === 'number' && offset >= 0 ? offset : 0;

    // Instrumentation for task completion tracking (task_3)
    try {
      if (
        category === 'gamefi_play_to_earn' &&
        chain === 'polygon' &&
        minDurationSeconds === 0 &&
        maxDurationSeconds === 90 &&
        sort === 'views_desc'
      ) {
        const payload = {
          category,
          chain,
          minDurationSeconds,
          maxDurationSeconds,
          sort,
          limit,
          offset
        };
        localStorage.setItem('task3_portfolioFilterParams', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error (task3_portfolioFilterParams):', e);
    }

    return projects.slice(effectiveOffset, effectiveOffset + effectiveLimit);
  }

  // 16. getPortfolioProjectDetail(projectId)
  getPortfolioProjectDetail(projectId) {
    const projects = this._getFromStorage('portfolio_projects') || [];
    const project = projects.find(p => p.id === projectId) || null;

    const favoriteList = this._getOrCreateFavoriteProjectList();
    const isFavorited = project ? favoriteList.project_ids.includes(project.id) : false;

    return { project, isFavorited };
  }

  // 17. addProjectToFavorites(projectId)
  addProjectToFavorites(projectId) {
    const projects = this._getFromStorage('portfolio_projects') || [];
    const project = projects.find(p => p.id === projectId) || null;

    let lists = this._getFromStorage('favorite_projects') || [];
    if (!lists.length) {
      this._getOrCreateFavoriteProjectList();
      lists = this._getFromStorage('favorite_projects') || [];
    }
    const list = lists[0];

    if (!list.project_ids.includes(projectId)) {
      list.project_ids.push(projectId);
      list.updated_at = new Date().toISOString();
      this._saveToStorage('favorite_projects', lists);
    }

    return {
      success: true,
      favoriteList: list,
      message: project ? 'Project added to favorites.' : 'Project ID added to favorites (project not found in catalog).'
    };
  }

  // 18. removeProjectFromFavorites(projectId)
  removeProjectFromFavorites(projectId) {
    let lists = this._getFromStorage('favorite_projects') || [];
    if (!lists.length) {
      return {
        success: true,
        favoriteList: null,
        message: 'No favorites list to update.'
      };
    }
    const list = lists[0];
    const idx = list.project_ids.indexOf(projectId);
    if (idx !== -1) {
      list.project_ids.splice(idx, 1);
      list.updated_at = new Date().toISOString();
      this._saveToStorage('favorite_projects', lists);
    }

    return {
      success: true,
      favoriteList: list,
      message: 'Project removed from favorites.'
    };
  }

  // 19. getFavoriteProjects()
  getFavoriteProjects() {
    const favoriteList = this._getOrCreateFavoriteProjectList();
    const projectsAll = this._getFromStorage('portfolio_projects') || [];

    const projects = favoriteList.project_ids
      .map(id => projectsAll.find(p => p.id === id) || null)
      .filter(Boolean);

    return { favoriteList, projects };
  }

  // 20. getBlogFilterOptions()
  getBlogFilterOptions() {
    const categoryLabels = {
      token_launch_strategy: 'Token Launch Strategy',
      defi_marketing: 'DeFi Marketing',
      nft_marketing: 'NFT Marketing',
      production_process: 'Production Process',
      security: 'Security',
      general: 'General'
    };

    const articles = this._getFromStorage('articles') || [];
    const categoriesSet = new Set(articles.map(a => a.category).filter(Boolean));

    const categories = Array.from(categoriesSet).map(value => ({
      value,
      label: categoryLabels[value] || value
    }));

    const readingTimes = [
      { value: 'under_5_minutes', label: 'Under 5 minutes', minMinutes: 0, maxMinutes: 5 },
      { value: '5_7_minutes', label: '5–7 minutes', minMinutes: 5, maxMinutes: 7 },
      { value: '7_10_minutes', label: '7–10 minutes', minMinutes: 7, maxMinutes: 10 },
      { value: '10_plus_minutes', label: '10+ minutes', minMinutes: 10, maxMinutes: 999 }
    ];

    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' },
      { value: 'reading_time_desc', label: 'Reading Time: Long to Short' }
    ];

    return {
      categories,
      readingTimes,
      sortOptions
    };
  }

  // 21. getArticles(category, minReadingTimeMinutes, maxReadingTimeMinutes, sort, limit, offset)
  getArticles(category, minReadingTimeMinutes, maxReadingTimeMinutes, sort, limit, offset) {
    let articles = this._getFromStorage('articles') || [];

    articles = articles.filter(a => {
      if (a.is_published === false) return false;
      if (category && a.category !== category) return false;
      if (typeof minReadingTimeMinutes === 'number' && a.reading_time_minutes < minReadingTimeMinutes) return false;
      if (typeof maxReadingTimeMinutes === 'number' && a.reading_time_minutes > maxReadingTimeMinutes) return false;
      return true;
    });

    if (sort === 'newest_first') {
      articles.sort((a, b) => {
        const ad = a.publish_date ? Date.parse(a.publish_date) : 0;
        const bd = b.publish_date ? Date.parse(b.publish_date) : 0;
        return bd - ad;
      });
    } else if (sort === 'oldest_first') {
      articles.sort((a, b) => {
        const ad = a.publish_date ? Date.parse(a.publish_date) : 0;
        const bd = b.publish_date ? Date.parse(b.publish_date) : 0;
        return ad - bd;
      });
    } else if (sort === 'reading_time_desc') {
      articles.sort((a, b) => {
        const av = a.reading_time_minutes || 0;
        const bv = b.reading_time_minutes || 0;
        return bv - av;
      });
    }

    const effectiveLimit = typeof limit === 'number' && limit > 0 ? limit : 20;
    const effectiveOffset = typeof offset === 'number' && offset >= 0 ? offset : 0;

    return articles.slice(effectiveOffset, effectiveOffset + effectiveLimit);
  }

  // 22. getArticleDetail(slug)
  getArticleDetail(slug) {
    const articles = this._getFromStorage('articles') || [];
    const article = articles.find(a => a.slug === slug) || null;
    return { article };
  }

  // 23. saveArticleToReadingList(articleId, email)
  saveArticleToReadingList(articleId, email) {
    const entries = this._getFromStorage('reading_list_entries') || [];
    const now = new Date().toISOString();

    const entry = {
      id: this._generateId('reading_list_entry'),
      article_id: articleId,
      email: email,
      saved_at: now
    };

    entries.push(entry);
    this._saveToStorage('reading_list_entries', entries);

    // Foreign key resolution: include article
    const articles = this._getFromStorage('articles') || [];
    const article = articles.find(a => a.id === articleId) || null;
    const enrichedEntry = {
      ...entry,
      article
    };

    return {
      success: true,
      readingListEntry: enrichedEntry,
      message: 'Article saved to reading list.'
    };
  }

  // 24. getClientPortalDemoProjects()
  getClientPortalDemoProjects() {
    const projects = this._getFromStorage('demo_projects') || [];
    return projects;
  }

  // 25. getClientPortalDemoTimeline(projectId)
  getClientPortalDemoTimeline(projectId) {
    const milestones = this._getFromStorage('demo_milestones') || [];
    const filtered = milestones
      .filter(m => m.project_id === projectId)
      .sort((a, b) => {
        const ao = typeof a.order_index === 'number' ? a.order_index : 0;
        const bo = typeof b.order_index === 'number' ? b.order_index : 0;
        return ao - bo;
      });

    const projects = this._getFromStorage('demo_projects') || [];
    const project = projects.find(p => p.id === projectId) || null;

    // Foreign key resolution per milestone
    const enriched = filtered.map(m => ({
      ...m,
      project
    }));

    return enriched;
  }

  // 26. updateClientPortalDemoMilestones(updates)
  updateClientPortalDemoMilestones(updates) {
    if (!Array.isArray(updates)) {
      updates = [];
    }
    const milestones = this._getFromStorage('demo_milestones') || [];
    const updatedMilestones = [];

    for (const upd of updates) {
      if (!upd || !upd.milestoneId) continue;
      const ms = milestones.find(m => m.id === upd.milestoneId);
      if (!ms) continue;
      if (typeof upd.status === 'string' && upd.status) {
        ms.status = upd.status;
      }
      if (typeof upd.dueDate === 'string' && upd.dueDate) {
        ms.due_date = upd.dueDate;
      }
      updatedMilestones.push(ms);
    }

    this._saveToStorage('demo_milestones', milestones);

    // Foreign key resolution
    const demoProjects = this._getFromStorage('demo_projects') || [];
    const enriched = updatedMilestones.map(m => ({
      ...m,
      project: demoProjects.find(p => p.id === m.project_id) || null
    }));

    return {
      success: true,
      updatedMilestones: enriched,
      message: 'Milestones updated.'
    };
  }

  // 27. getFAQTopics()
  getFAQTopics() {
    const topicLabels = {
      token_launch_security: {
        label: 'Token Launch & Security',
        description: 'Smart contracts, audits, and compliance for token launches.'
      },
      general_production: {
        label: 'General Production',
        description: 'Process, timelines, and collaboration.'
      },
      pricing_billing: {
        label: 'Pricing & Billing',
        description: 'Budgets, payment terms, and invoices.'
      },
      process_timeline: {
        label: 'Process & Timeline',
        description: 'From kickoff through final delivery.'
      },
      metaverse: {
        label: 'Metaverse',
        description: 'Virtual events and world-building.'
      },
      defi: {
        label: 'DeFi',
        description: 'Protocols, DEXs, and yield products.'
      },
      nft: {
        label: 'NFT',
        description: 'Collections, mints, and marketplaces.'
      }
    };

    const faqItems = this._getFromStorage('faq_items') || [];
    const topicSet = new Set(faqItems.map(f => f.topic).filter(Boolean));

    const topics = Array.from(topicSet).map(value => ({
      value,
      label: topicLabels[value] ? topicLabels[value].label : value,
      description: topicLabels[value] ? topicLabels[value].description : ''
    }));

    return topics;
  }

  // 28. getFAQItems(topic)
  getFAQItems(topic) {
    const items = this._getFromStorage('faq_items') || [];
    const filtered = items
      .filter(f => {
        if (topic && f.topic !== topic) return false;
        return true;
      })
      .sort((a, b) => {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      });

    return filtered;
  }

  // 29. submitFAQSecurityQuestion(topic, projectType, companyName, email, message)
  submitFAQSecurityQuestion(topic, projectType, companyName, email, message) {
    const inquiry = this._persistContactInquiry('faq_context', topic, projectType, companyName, email, message);

    return {
      success: true,
      contactInquiry: inquiry,
      message: 'Security question submitted.'
    };
  }

  // 30. getStrategyCallOptions(servicePackageId)
  getStrategyCallOptions(servicePackageId) {
    const callTypes = [
      { value: 'strategy_30_min', label: '30-minute strategy call', durationMinutes: 30 },
      { value: 'strategy_60_min', label: '60-minute deep-dive call', durationMinutes: 60 },
      { value: 'discovery_15_min', label: '15-minute discovery call', durationMinutes: 15 }
    ];

    const defaultCallType = 'strategy_30_min';

    return {
      callTypes,
      defaultCallType
    };
  }

  // 31. getAvailableStrategyCallSlots(callType, startDate, days)
  getAvailableStrategyCallSlots(callType, startDate, days) {
    const bookings = this._getFromStorage('strategy_call_bookings') || [];

    const today = new Date();
    let start;
    if (typeof startDate === 'string' && startDate) {
      start = new Date(startDate);
    } else {
      start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    }

    const rangeDays = typeof days === 'number' && days > 0 ? days : 14;

    const timeOptions = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

    const availability = [];

    for (let i = 0; i < rangeDays; i++) {
      const day = new Date(start.getTime());
      day.setUTCDate(start.getUTCDate() + i);
      const isoDate = day.toISOString().slice(0, 10); // YYYY-MM-DD

      const timeSlots = timeOptions.map(timeStr => {
        // Combine date and time to ISO datetime (assume UTC for simplicity)
        const dateTimeIso = isoDate + 'T' + timeStr + ':00.000Z';
        const isBooked = bookings.some(b =>
          b.call_type === callType &&
          b.scheduled_datetime === dateTimeIso &&
          b.status !== 'cancelled'
        );
        return {
          time: timeStr,
          isAvailable: !isBooked
        };
      });

      availability.push({ date: isoDate, timeSlots });
    }

    return availability;
  }

  // 32. bookStrategyCall(servicePackageId, callType, scheduledDateTime, notes)
  bookStrategyCall(servicePackageId, callType, scheduledDateTime, notes) {
    const bookings = this._getFromStorage('strategy_call_bookings') || [];

    const booking = {
      id: this._generateId('strategy_call'),
      service_package_id: servicePackageId,
      call_type: callType,
      scheduled_datetime: scheduledDateTime,
      status: 'confirmed',
      notes: notes || null,
      created_at: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('strategy_call_bookings', bookings);

    // Foreign key resolution: include servicePackage
    const servicePackages = this._getFromStorage('service_packages') || [];
    const servicePackage = servicePackages.find(sp => sp.id === servicePackageId) || null;

    const enrichedBooking = {
      ...booking,
      servicePackage
    };

    return {
      success: true,
      booking: enrichedBooking,
      message: 'Strategy call booked.'
    };
  }

  // 33. getAboutPageContent()
  getAboutPageContent() {
    return {
      headline: 'Web3-native video for protocols, DAOs, and token launches.',
      subheadline: 'We bridge complex on-chain narratives with cinematic storytelling and growth-focused strategy.',
      mission: 'Our mission is to help Web3 teams launch with clarity, trust, and excitement by combining crypto-native understanding with world-class production.',
      teamHighlights: [
        {
          name: 'Alex Rivera',
          role: 'Creative Director',
          bioShort: 'Leads concept and narrative for token launches and DeFi explainers.'
        },
        {
          name: 'Maya Chen',
          role: 'Head of Production',
          bioShort: 'Oversees remote-first production pipelines for global Web3 teams.'
        },
        {
          name: 'Jordan Patel',
          role: 'Web3 Strategist',
          bioShort: 'Aligns video content with tokenomics, GTM, and community growth.'
        }
      ],
      differentiators: [
        {
          title: 'Crypto-native team',
          description: 'We actively participate in DeFi, NFTs, and DAOs, so we speak the same language as your community.'
        },
        {
          title: 'Launch-focused process',
          description: 'Our workflows are built around mints, TGE dates, and exchange listing timelines.'
        },
        {
          title: 'Full-funnel thinking',
          description: 'From hero trailers to social cutdowns, we design content ecosystems—not just one-off videos.'
        }
      ],
      technologyStack: [
        {
          name: 'On-chain analytics',
          description: 'We reference Dune dashboards, Flipside analytics, and on-chain data to inform messaging.'
        },
        {
          name: 'Remote-first pipeline',
          description: 'Cloud-based review tools, frame-accurate comments, and client portal timelines.'
        },
        {
          name: '3D & motion design',
          description: 'Cinema 4D, Blender, and Unreal Engine workflows for high-end metaverse and GameFi visuals.'
        }
      ]
    };
  }

  // 34. getContactPageConfig()
  getContactPageConfig() {
    const topics = [
      { value: 'general', label: 'General question' },
      { value: 'sales', label: 'New project / sales' },
      { value: 'security_compliance', label: 'Security & compliance' },
      { value: 'support', label: 'Existing client support' },
      { value: 'billing', label: 'Billing & invoices' }
    ];

    return {
      topics,
      defaultTopic: 'general',
      supportEmail: 'hello@web3videoagency.example',
      officeLocation: 'Remote-first team across EU & US time zones.'
    };
  }

  // 35. submitContactInquiry(topic, projectType, companyName, email, message)
  submitContactInquiry(topic, projectType, companyName, email, message) {
    const inquiry = this._persistContactInquiry('contact_page', topic, projectType, companyName, email, message);

    return {
      success: true,
      contactInquiry: inquiry,
      message: 'Contact inquiry submitted.'
    };
  }

  // 36. getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          title: 'Introduction',
          contentHtml: '<p>We respect your privacy and are committed to protecting your personal data. This policy explains how we handle information collected through our website and client portal demo.</p>'
        },
        {
          title: 'Data We Collect',
          contentHtml: '<p>We collect contact details you submit (such as name, email, and company), project information you share in briefs, and basic analytics about how you use our site.</p>'
        },
        {
          title: 'How We Use Your Data',
          contentHtml: '<p>We use your information to respond to inquiries, provide quotes, deliver services you request, and improve our content and user experience.</p>'
        },
        {
          title: 'Web3 & On-chain Data',
          contentHtml: '<p>We may review public on-chain data related to your project (such as token contracts or NFT collections) for research and creative purposes. We do not store private keys or sign transactions on your behalf.</p>'
        },
        {
          title: 'Contact',
          contentHtml: '<p>If you have questions about this policy, contact us at <a href="mailto:privacy@web3videoagency.example">privacy@web3videoagency.example</a>.</p>'
        }
      ]
    };
  }

  // 37. getTermsOfServiceContent()
  getTermsOfServiceContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          title: 'Overview',
          contentHtml: '<p>These Terms of Service govern your use of our website, client portal demo, and any production or strategy services we provide.</p>'
        },
        {
          title: 'No Investment Advice',
          contentHtml: '<p>Our content, videos, and strategy recommendations are for marketing and educational purposes only and do not constitute financial, legal, or investment advice.</p>'
        },
        {
          title: 'Client Responsibilities',
          contentHtml: '<p>You are responsible for the accuracy of information you provide, securing necessary rights to any assets you supply, and ensuring your token or NFT project complies with applicable laws.</p>'
        },
        {
          title: 'Intellectual Property',
          contentHtml: '<p>Unless otherwise agreed in writing, we retain ownership of our working files and underlying project files. Final deliverables are licensed to you as described in your proposal or SOW.</p>'
        },
        {
          title: 'Limitation of Liability',
          contentHtml: '<p>To the maximum extent permitted by law, we are not liable for lost profits, token price movements, or any indirect, incidental, or consequential damages arising from our services.</p>'
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