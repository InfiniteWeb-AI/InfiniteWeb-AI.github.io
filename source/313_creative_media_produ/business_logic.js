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

  _initStorage() {
    const arrayKeys = [
      'packages',
      'package_add_ons',
      'quote_requests',
      'retainer_plans',
      'consultation_bookings',
      'booking_slots',
      'case_studies',
      'shortlists',
      'deliverable_options',
      'project_planner_briefs',
      'blog_articles',
      'reading_lists',
      'project_plans',
      'newsletter_subscriptions',
      'campaign_plans'
    ];
    for (let i = 0; i < arrayKeys.length; i++) {
      if (!localStorage.getItem(arrayKeys[i])) {
        localStorage.setItem(arrayKeys[i], JSON.stringify([]));
      }
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _formatDateOnly(value) {
    const d = this._parseDate(value);
    if (!d) return null;
    return d.toISOString().split('T')[0];
  }

  _getOrCreateShortlist() {
    const shortlists = this._getFromStorage('shortlists', []);
    let shortlist = shortlists[0];
    const now = new Date().toISOString();
    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        name: 'Default Shortlist',
        case_study_ids: [],
        created_at: now,
        updated_at: now
      };
      shortlists.push(shortlist);
      this._saveToStorage('shortlists', shortlists);
    }
    return shortlist;
  }

  _getOrCreateReadingList() {
    const lists = this._getFromStorage('reading_lists', []);
    let list = lists[0];
    const now = new Date().toISOString();
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        article_ids: [],
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  _getOrCreateCampaignDraft() {
    const raw = this._getFromStorage('campaign_draft', null);
    if (raw && typeof raw === 'object' && raw.id) {
      return raw;
    }
    const now = new Date().toISOString();
    const draft = {
      id: this._generateId('campaign_draft'),
      name: '',
      goal: null,
      selected_services: [],
      product_photography_package_id: null,
      launch_video_package_id: null,
      total_price: 0,
      currency: 'usd',
      start_date: null,
      created_at: now,
      status: 'draft'
    };
    this._saveToStorage('campaign_draft', draft);
    return draft;
  }

  _getOrCreateProjectPlannerDraft() {
    const raw = this._getFromStorage('project_planner_draft', null);
    if (raw && typeof raw === 'object' && raw.id) {
      return raw;
    }
    const now = new Date().toISOString();
    const draft = {
      id: this._generateId('project_planner_draft'),
      goal: null,
      deliverables: [],
      platforms: [],
      max_budget: 0,
      timeline_weeks: 0,
      created_at: now
    };
    this._saveToStorage('project_planner_draft', draft);
    return draft;
  }

  _calculateCombinedPackagePrice(packageIds, addOnIdsByPackage) {
    const packages = this._getFromStorage('packages', []);
    const addOns = this._getFromStorage('package_add_ons', []);
    let total = 0;
    let currency = 'usd';
    if (!Array.isArray(packageIds)) {
      return { total_price: 0, currency: 'usd', breakdown: [] };
    }
    const breakdown = [];
    for (let i = 0; i < packageIds.length; i++) {
      const pid = packageIds[i];
      const pkg = packages.find(p => p.id === pid);
      if (!pkg) continue;
      currency = pkg.currency || currency;
      let base = Number(pkg.base_price) || 0;
      let addOnTotal = 0;
      const addOnIds = addOnIdsByPackage && addOnIdsByPackage[pid] ? addOnIdsByPackage[pid] : [];
      if (Array.isArray(addOnIds) && addOnIds.length > 0) {
        for (let j = 0; j < addOnIds.length; j++) {
          const ao = addOns.find(a => a.id === addOnIds[j] && a.is_active);
          if (ao) {
            addOnTotal += Number(ao.price) || 0;
          }
        }
      }
      const pkgTotal = base + addOnTotal;
      total += pkgTotal;
      breakdown.push({
        package_id: pid,
        base_price: base,
        add_ons_total: addOnTotal,
        total_price: pkgTotal
      });
    }
    return { total_price: total, currency: currency, breakdown: breakdown };
  }

  // Interface implementations

  getHomepageContent() {
    const base = this._getFromStorage('homepage_content', {
      hero_title: '',
      hero_subtitle: '',
      hero_supporting_copy: '',
      featured_service_categories: [],
      key_differentiators: [],
      quick_links: []
    });
    const allCaseStudies = this._getFromStorage('case_studies', []);
    const featured_case_studies = allCaseStudies.filter(cs => cs && cs.is_featured);
    return {
      hero_title: base.hero_title || '',
      hero_subtitle: base.hero_subtitle || '',
      hero_supporting_copy: base.hero_supporting_copy || '',
      featured_service_categories: Array.isArray(base.featured_service_categories) ? base.featured_service_categories : [],
      featured_case_studies: featured_case_studies,
      key_differentiators: Array.isArray(base.key_differentiators) ? base.key_differentiators : [],
      quick_links: Array.isArray(base.quick_links) ? base.quick_links : []
    };
  }

  getServicesOverview() {
    const base = this._getFromStorage('services_overview', {
      service_categories: []
    });
    return {
      service_categories: Array.isArray(base.service_categories) ? base.service_categories : []
    };
  }

  getVideoProductionFilterOptions() {
    return {
      project_type_options: [
        { value: 'product_launch', label: 'Product launch' },
        { value: 'brand_campaign', label: 'Brand campaign' },
        { value: 'testimonial', label: 'Testimonial' },
        { value: 'explainer', label: 'Explainer' },
        { value: 'social_content', label: 'Social content' },
        { value: 'other', label: 'Other' }
      ],
      duration_options: [
        { value: 'up_to_30_seconds', label: 'Up to 30 seconds' },
        { value: 'up_to_60_seconds', label: 'Up to 60 seconds' },
        { value: 'up_to_90_seconds', label: 'Up to 90 seconds' },
        { value: 'over_90_seconds', label: 'Over 90 seconds' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'timeline_short_to_long', label: 'Timeline: Short to Long' },
        { value: 'timeline_long_to_short', label: 'Timeline: Long to Short' }
      ]
    };
  }

  getVideoProductionPackages(project_type, duration_label, sort_by) {
    const packages = this._getFromStorage('packages', []);
    let results = packages.filter(p => p && p.is_active && p.service_category === 'video_production');
    if (project_type) {
      results = results.filter(p => p.project_type === project_type);
    }
    if (duration_label) {
      results = results.filter(p => p.duration_label === duration_label);
    }
    const sortKey = sort_by || 'price_low_to_high';
    if (sortKey === 'price_low_to_high') {
      results.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sortKey === 'price_high_to_low') {
      results.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    } else if (sortKey === 'timeline_short_to_long') {
      results.sort((a, b) => (a.timeline_weeks || 0) - (b.timeline_weeks || 0));
    } else if (sortKey === 'timeline_long_to_short') {
      results.sort((a, b) => (b.timeline_weeks || 0) - (a.timeline_weeks || 0));
    }
    return results;
  }

  getBrandingFilterOptions() {
    return {
      package_type_tabs: [
        { value: 'full_brand_identity_package', label: 'Full Brand Identity Packages', is_default: true },
        { value: 'standard_package', label: 'Standard Packages', is_default: false },
        { value: 'social_media_package', label: 'Social Media Packages', is_default: false },
        { value: 'campaign_recommendation_package', label: 'Campaign Packages', is_default: false },
        { value: 'other', label: 'Other', is_default: false }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'timeline_short_to_long', label: 'Timeline: Short to Long' },
        { value: 'timeline_long_to_short', label: 'Timeline: Long to Short' }
      ]
    };
  }

  getBrandIdentityPackages(package_type, sort_by) {
    const packages = this._getFromStorage('packages', []);
    let results = packages.filter(p => p && p.is_active && p.service_category === 'branding_identity');
    if (package_type) {
      results = results.filter(p => p.package_type === package_type);
    }
    const sortKey = sort_by || 'price_low_to_high';
    if (sortKey === 'price_low_to_high') {
      results.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sortKey === 'price_high_to_low') {
      results.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    } else if (sortKey === 'timeline_short_to_long') {
      results.sort((a, b) => (a.timeline_weeks || 0) - (b.timeline_weeks || 0));
    } else if (sortKey === 'timeline_long_to_short') {
      results.sort((a, b) => (b.timeline_weeks || 0) - (a.timeline_weeks || 0));
    }
    return results;
  }

  getPackageDetail(packageId) {
    const packages = this._getFromStorage('packages', []);
    const addOns = this._getFromStorage('package_add_ons', []);
    const pkg = packages.find(p => p.id === packageId) || null;
    if (!pkg) {
      return {
        package: null,
        applicable_add_ons: [],
        display_deliverables: [],
        eligible_for_project_plan: false
      };
    }
    const applicable_add_ons = addOns.filter(
      a =>
        a.is_active &&
        (!a.applicable_service_category ||
          a.applicable_service_category === pkg.service_category ||
          a.applicable_service_category === 'other')
    );
    const display_deliverables = Array.isArray(pkg.key_deliverables)
      ? pkg.key_deliverables.map(code => ({
          code: code,
          label: code
            .split('_')
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ')
        }))
      : [];
    const eligible_for_project_plan =
      pkg.service_category === 'branding_identity' && pkg.package_type === 'full_brand_identity_package';
    return {
      package: pkg,
      applicable_add_ons: applicable_add_ons,
      display_deliverables: display_deliverables,
      eligible_for_project_plan: !!eligible_for_project_plan
    };
  }

  calculatePackageConfigurationPrice(packageId, selected_add_on_ids) {
    const packages = this._getFromStorage('packages', []);
    const addOns = this._getFromStorage('package_add_ons', []);
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) {
      return {
        base_price: 0,
        add_ons_total: 0,
        total_price: 0,
        currency: 'usd'
      };
    }
    const base = Number(pkg.base_price) || 0;
    let addTotal = 0;
    const addOnIds = Array.isArray(selected_add_on_ids) ? selected_add_on_ids : [];
    for (let i = 0; i < addOnIds.length; i++) {
      const ao = addOns.find(a => a.id === addOnIds[i] && a.is_active);
      if (ao) {
        addTotal += Number(ao.price) || 0;
      }
    }
    return {
      base_price: base,
      add_ons_total: addTotal,
      total_price: base + addTotal,
      currency: pkg.currency || 'usd'
    };
  }

  submitPackageQuoteRequest(
    packageId,
    selected_add_on_ids,
    name,
    email,
    company,
    budget_range,
    custom_budget_amount,
    desired_start_date,
    project_description
  ) {
    const packages = this._getFromStorage('packages', []);
    const quotes = this._getFromStorage('quote_requests', []);
    const pkg = packages.find(p => p.id === packageId) || null;
    const pricing = this.calculatePackageConfigurationPrice(packageId, selected_add_on_ids);
    const now = new Date().toISOString();
    const quote = {
      id: this._generateId('quote'),
      quote_type: 'package',
      package_id: packageId || null,
      retainer_plan_id: null,
      campaign_plan_id: null,
      selected_add_on_ids: Array.isArray(selected_add_on_ids) ? selected_add_on_ids : [],
      calculated_total_price: pricing.total_price,
      name: name,
      email: email || null,
      company: company || null,
      budget_range: budget_range || null,
      custom_budget_amount: typeof custom_budget_amount === 'number' ? custom_budget_amount : null,
      desired_start_date: desired_start_date || null,
      project_description: project_description || null,
      commitment_length_months: null,
      created_at: now,
      status: 'submitted'
    };
    quotes.push(quote);
    this._saveToStorage('quote_requests', quotes);
    return {
      success: true,
      quote_request: quote,
      message: pkg ? 'Quote request submitted.' : 'Quote request submitted (package not found in catalog).'
    };
  }

  createProjectPlanFromPackage(selected_package_id, project_name, company_stage, notes) {
    const packages = this._getFromStorage('packages', []);
    const plans = this._getFromStorage('project_plans', []);
    const pkg = packages.find(p => p.id === selected_package_id) || null;
    if (!pkg) {
      return {
        success: false,
        project_plan: null,
        message: 'Selected package not found.'
      };
    }
    const eligible =
      pkg.service_category === 'branding_identity' && pkg.package_type === 'full_brand_identity_package';
    if (!eligible) {
      return {
        success: false,
        project_plan: null,
        message: 'Selected package is not eligible for a project plan.'
      };
    }
    const now = new Date().toISOString();
    const plan = {
      id: this._generateId('project_plan'),
      project_name: project_name,
      company_stage: company_stage,
      selected_package_id: selected_package_id,
      notes: notes || null,
      created_at: now
    };
    plans.push(plan);
    this._saveToStorage('project_plans', plans);
    return {
      success: true,
      project_plan: plan,
      message: 'Project plan created.'
    };
  }

  getContactPageConfig() {
    const base = this._getFromStorage('contact_page_config', {});
    const defaultTabs = [
      { key: 'strategy_consultation', label: 'Strategy Consultation' },
      { key: 'general_inquiry', label: 'General Inquiry' }
    ];
    return {
      general_contact_email: base.general_contact_email || '',
      general_contact_phone: base.general_contact_phone || '',
      general_contact_intro: base.general_contact_intro || '',
      consultation_tabs: Array.isArray(base.consultation_tabs) && base.consultation_tabs.length > 0
        ? base.consultation_tabs
        : defaultTabs
    };
  }

  getConsultationServiceOptions() {
    return [
      {
        service_type: 'brand_strategy_session_60_min',
        display_name: 'Brand Strategy Session (60 min)',
        description: 'Deep-dive into your brand strategy, positioning, and messaging.',
        default_duration_minutes: 60
      },
      {
        service_type: 'general_consultation',
        display_name: 'General Consultation',
        description: 'Talk through project ideas, timelines, and collaboration models.',
        default_duration_minutes: 30
      },
      {
        service_type: 'production_discovery_call',
        display_name: 'Production Discovery Call',
        description: 'Discuss the scope and logistics of upcoming productions.',
        default_duration_minutes: 45
      }
    ];
  }

  getAvailableBookingSlots(service_type, from_date, to_date) {
    const slots = this._getFromStorage('booking_slots', []);
    const fromDateStr = from_date ? String(from_date).slice(0, 10) : null;
    const toDateStr = to_date ? String(to_date).slice(0, 10) : null;
    return slots.filter(slot => {
      if (!slot || !slot.is_available) return false;
      if (service_type && slot.service_type && slot.service_type !== service_type) return false;
      const start = this._parseDate(slot.start_datetime);
      if (!start) return false;
      const slotDateStr = this._formatDateOnly(start.toISOString());
      if (fromDateStr && slotDateStr && slotDateStr < fromDateStr) return false;
      if (toDateStr && slotDateStr && slotDateStr > toDateStr) return false;
      return true;
    });
  }

  createConsultationBooking(service_type, booking_slot_id, name, email, message) {
    const slots = this._getFromStorage('booking_slots', []);
    const bookings = this._getFromStorage('consultation_bookings', []);
    const slotIndex = slots.findIndex(s => s.id === booking_slot_id);
    if (slotIndex === -1) {
      return {
        success: false,
        booking: null,
        message: 'Selected time slot not found.'
      };
    }
    const slot = slots[slotIndex];
    if (!slot.is_available) {
      return {
        success: false,
        booking: null,
        message: 'Selected time slot is no longer available.'
      };
    }
    if (service_type && slot.service_type && slot.service_type !== service_type) {
      return {
        success: false,
        booking: null,
        message: 'Service type does not match the selected slot.'
      };
    }
    const start = this._parseDate(slot.start_datetime);
    const end = this._parseDate(slot.end_datetime);
    let duration = 60;
    if (start && end) {
      duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    }
    const now = new Date().toISOString();
    const booking = {
      id: this._generateId('consultation_booking'),
      service_type: slot.service_type || service_type,
      booking_slot_id: slot.id,
      booking_datetime: slot.start_datetime,
      duration_minutes: duration,
      name: name,
      email: email,
      message: message || null,
      status: 'scheduled',
      created_at: now
    };
    bookings.push(booking);
    slots[slotIndex].is_available = false;
    this._saveToStorage('consultation_bookings', bookings);
    this._saveToStorage('booking_slots', slots);
    return {
      success: true,
      booking: booking,
      message: 'Consultation booked.'
    };
  }

  getPortfolioFilterOptions() {
    return {
      industry_options: [
        { value: 'e_commerce', label: 'E-commerce / Retail' },
        { value: 'saas', label: 'SaaS' },
        { value: 'b2b', label: 'B2B' },
        { value: 'non_profit', label: 'Non-profit' },
        { value: 'consumer_goods', label: 'Consumer goods' },
        { value: 'other', label: 'Other' }
      ],
      sort_options: [
        { value: 'default', label: 'Featured' },
        { value: 'most_recent', label: 'Most recent' },
        { value: 'highest_engagement', label: 'Highest engagement' }
      ]
    };
  }

  getCaseStudies(industry, sort_by, limit, offset) {
    let items = this._getFromStorage('case_studies', []);
    if (industry) {
      items = items.filter(c => c.industry === industry);
    }
    const sortKey = sort_by || 'default';
    if (sortKey === 'most_recent') {
      items.sort((a, b) => {
        const da = this._parseDate(a.published_at);
        const db = this._parseDate(b.published_at);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      });
    } else if (sortKey === 'highest_engagement') {
      items.sort((a, b) => (b.engagement_increase_percent || 0) - (a.engagement_increase_percent || 0));
    }
    const start = typeof offset === 'number' && offset > 0 ? offset : 0;
    const end = typeof limit === 'number' && limit > 0 ? start + limit : undefined;
    return typeof end !== 'undefined' ? items.slice(start, end) : items.slice(start);
  }

  getCaseStudyDetail(caseStudyId) {
    const items = this._getFromStorage('case_studies', []);
    return items.find(c => c.id === caseStudyId) || null;
  }

  addCaseStudyToShortlist(caseStudyId) {
    const shortlist = this._getOrCreateShortlist();
    const allShortlists = this._getFromStorage('shortlists', []);
    const idx = allShortlists.findIndex(s => s.id === shortlist.id);
    if (!shortlist.case_study_ids.includes(caseStudyId)) {
      shortlist.case_study_ids.push(caseStudyId);
      shortlist.updated_at = new Date().toISOString();
      if (idx >= 0) {
        allShortlists[idx] = shortlist;
      } else {
        allShortlists.push(shortlist);
      }
      this._saveToStorage('shortlists', allShortlists);
    }
    return {
      success: true,
      shortlist: shortlist,
      message: 'Case study added to shortlist.'
    };
  }

  getShortlist() {
    const shortlist = this._getOrCreateShortlist();
    const caseStudies = this._getFromStorage('case_studies', []);
    const selected = caseStudies.filter(cs => shortlist.case_study_ids.indexOf(cs.id) !== -1);
    return {
      shortlist: shortlist,
      case_studies: selected
    };
  }

  removeCaseStudyFromShortlist(caseStudyId) {
    const shortlist = this._getOrCreateShortlist();
    const allShortlists = this._getFromStorage('shortlists', []);
    const idx = allShortlists.findIndex(s => s.id === shortlist.id);
    const newIds = shortlist.case_study_ids.filter(id => id !== caseStudyId);
    shortlist.case_study_ids = newIds;
    shortlist.updated_at = new Date().toISOString();
    if (idx >= 0) {
      allShortlists[idx] = shortlist;
    } else {
      allShortlists.push(shortlist);
    }
    this._saveToStorage('shortlists', allShortlists);
    return {
      success: true,
      shortlist: shortlist,
      message: 'Case study removed from shortlist.'
    };
  }

  getProjectPlannerOptions() {
    const base = this._getFromStorage('project_planner_options', {});
    const goals =
      Array.isArray(base.goals) && base.goals.length > 0
        ? base.goals
        : [
            {
              value: 'ongoing_social_media_content',
              label: 'Ongoing social media content',
              description: 'Plan recurring content to keep your channels active.'
            },
            {
              value: 'one_off_campaign',
              label: 'One-off campaign',
              description: 'Plan content for a specific campaign or launch.'
            },
            {
              value: 'product_launch_support',
              label: 'Product launch support',
              description: 'Support a key product launch with social content.'
            },
            {
              value: 'brand_refresh',
              label: 'Brand refresh',
              description: 'Update your brand visuals and content.'
            }
          ];
    const deliverable_options = this._getFromStorage('deliverable_options', []);
    const platform_options =
      Array.isArray(base.platform_options) && base.platform_options.length > 0
        ? base.platform_options
        : [
            { value: 'instagram', label: 'Instagram' },
            { value: 'tiktok', label: 'TikTok' },
            { value: 'facebook', label: 'Facebook' },
            { value: 'youtube', label: 'YouTube' }
          ];
    const budget_presets =
      Array.isArray(base.budget_presets) && base.budget_presets.length > 0
        ? base.budget_presets
        : [
            { max_budget: 2500, label: 'Up to $2,500' },
            { max_budget: 5000, label: 'Up to $5,000' },
            { max_budget: 10000, label: 'Up to $10,000' }
          ];
    const timeline_presets =
      Array.isArray(base.timeline_presets) && base.timeline_presets.length > 0
        ? base.timeline_presets
        : [
            { timeline_weeks: 4, label: '1 month' },
            { timeline_weeks: 8, label: '2 months' },
            { timeline_weeks: 12, label: '3 months' }
          ];
    return {
      goals: goals,
      deliverable_options: deliverable_options,
      platform_options: platform_options,
      budget_presets: budget_presets,
      timeline_presets: timeline_presets
    };
  }

  generateProjectBriefSummary(goal, deliverables, platforms, max_budget, timeline_weeks) {
    const goalMap = {
      ongoing_social_media_content: 'ongoing social media content',
      one_off_campaign: 'a one-off campaign',
      product_launch_support: 'product launch support',
      brand_refresh: 'a brand refresh'
    };
    const goalText = goalMap[goal] || 'a project';
    const deliverableOptions = this._getFromStorage('deliverable_options', []);
    const deliverableParts = Array.isArray(deliverables)
      ? deliverables.map(d => {
          const opt = deliverableOptions.find(o => o.code === d.deliverable_code);
          const label = opt ? opt.name : d.deliverable_code;
          const qty = d.quantity || 0;
          return qty + ' x ' + label;
        })
      : [];
    const platformLabels = Array.isArray(platforms)
      ? platforms.map(p => {
          if (p === 'instagram') return 'Instagram';
          if (p === 'tiktok') return 'TikTok';
          if (p === 'facebook') return 'Facebook';
          if (p === 'youtube') return 'YouTube';
          return p;
        })
      : [];
    const budgetPart = typeof max_budget === 'number' && max_budget > 0 ? 'Budget up to $' + max_budget + '.' : '';
    const timelinePart =
      typeof timeline_weeks === 'number' && timeline_weeks > 0 ? 'Timeline around ' + timeline_weeks + ' weeks.' : '';
    const summary =
      'Project goal: ' +
      goalText +
      '. ' +
      (deliverableParts.length ? 'Deliverables: ' + deliverableParts.join(', ') + '. ' : '') +
      (platformLabels.length ? 'Platforms: ' + platformLabels.join(', ') + '. ' : '') +
      budgetPart +
      (budgetPart ? ' ' : '') +
      timelinePart;
    return {
      generated_summary: summary.trim()
    };
  }

  saveProjectPlannerBrief(
    goal,
    deliverables,
    platforms,
    max_budget,
    timeline_weeks,
    generated_summary,
    saved_email,
    project_name
  ) {
    const briefs = this._getFromStorage('project_planner_briefs', []);
    const summaryObj =
      generated_summary && typeof generated_summary === 'string'
        ? { generated_summary: generated_summary }
        : this.generateProjectBriefSummary(goal, deliverables, platforms, max_budget, timeline_weeks);
    const uniqueDeliverableCodes = Array.isArray(deliverables)
      ? Array.from(
          new Set(
            deliverables
              .filter(d => d && d.deliverable_code)
              .map(d => d.deliverable_code)
          )
        )
      : [];
    const now = new Date().toISOString();
    const brief = {
      id: this._generateId('project_brief'),
      goal: goal,
      deliverables: Array.isArray(deliverables) ? deliverables : [],
      total_deliverable_types: uniqueDeliverableCodes.length,
      platforms: Array.isArray(platforms) ? platforms : [],
      max_budget: typeof max_budget === 'number' ? max_budget : 0,
      timeline_weeks: typeof timeline_weeks === 'number' ? timeline_weeks : 0,
      generated_summary: summaryObj.generated_summary,
      saved_email: saved_email,
      project_name: project_name,
      created_at: now
    };
    briefs.push(brief);
    this._saveToStorage('project_planner_briefs', briefs);
    // clear draft if exists
    this._saveToStorage('project_planner_draft', null);
    return {
      success: true,
      brief: brief,
      message: 'Project brief saved.'
    };
  }

  getBlogSearchConfig() {
    const base = this._getFromStorage('blog_search_config', {});
    const articles = this._getFromStorage('blog_articles', []);
    let minDate = null;
    for (let i = 0; i < articles.length; i++) {
      const d = this._parseDate(articles[i].published_at);
      if (!d) continue;
      if (!minDate || d < minDate) {
        minDate = d;
      }
    }
    const defaultCategories = [
      { value: 'Video Marketing', label: 'Video Marketing' },
      { value: 'Brand Strategy', label: 'Brand Strategy' },
      { value: 'Social Media', label: 'Social Media' }
    ];
    const uniqueCategories = new Set();
    for (let i = 0; i < articles.length; i++) {
      const cats = Array.isArray(articles[i].categories) ? articles[i].categories : [];
      for (let j = 0; j < cats.length; j++) {
        uniqueCategories.add(cats[j]);
      }
    }
    const category_options =
      uniqueCategories.size > 0
        ? Array.from(uniqueCategories).map(c => ({ value: c, label: c }))
        : base.category_options || defaultCategories;
    return {
      default_sort: base.default_sort || 'newest_first',
      category_options: category_options,
      min_published_date: minDate ? this._formatDateOnly(minDate.toISOString()) : null
    };
  }

  searchBlogArticles(query, published_after, category, sort_by, limit, offset) {
    let items = this._getFromStorage('blog_articles', []);
    const q = query ? String(query).toLowerCase() : null;
    if (q) {
      items = items.filter(a => {
        const title = (a.title || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return title.indexOf(q) !== -1 || content.indexOf(q) !== -1 || tags.indexOf(q) !== -1;
      });
    }
    if (published_after) {
      const after = this._parseDate(published_after);
      if (after) {
        items = items.filter(a => {
          const d = this._parseDate(a.published_at);
          return d && d > after;
        });
      }
    }
    if (category) {
      items = items.filter(a => {
        const cats = Array.isArray(a.categories) ? a.categories : [];
        return cats.indexOf(category) !== -1;
      });
    }
    const sortKey = sort_by || 'newest_first';
    if (sortKey === 'newest_first') {
      items.sort((a, b) => {
        const da = this._parseDate(a.published_at);
        const db = this._parseDate(b.published_at);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      });
    } else if (sortKey === 'oldest_first') {
      items.sort((a, b) => {
        const da = this._parseDate(a.published_at);
        const db = this._parseDate(b.published_at);
        return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
      });
    } else if (sortKey === 'relevance' && q) {
      items.sort((a, b) => {
        const score = art => {
          let s = 0;
          const title = (art.title || '').toLowerCase();
          const content = (art.content || '').toLowerCase();
          const tags = Array.isArray(art.tags) ? art.tags.join(' ').toLowerCase() : '';
          if (title.indexOf(q) !== -1) s += 3;
          if (tags.indexOf(q) !== -1) s += 2;
          if (content.indexOf(q) !== -1) s += 1;
          return s;
        };
        return score(b) - score(a);
      });
    }
    const start = typeof offset === 'number' && offset > 0 ? offset : 0;
    const end = typeof limit === 'number' && limit > 0 ? start + limit : undefined;
    return typeof end !== 'undefined' ? items.slice(start, end) : items.slice(start);
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles', []);
    return articles.find(a => a.id === articleId) || null;
  }

  addArticleToReadingList(articleId) {
    const list = this._getOrCreateReadingList();
    const allLists = this._getFromStorage('reading_lists', []);
    const idx = allLists.findIndex(l => l.id === list.id);
    if (list.article_ids.indexOf(articleId) === -1) {
      list.article_ids.push(articleId);
      list.updated_at = new Date().toISOString();
      if (idx >= 0) {
        allLists[idx] = list;
      } else {
        allLists.push(list);
      }
      this._saveToStorage('reading_lists', allLists);
    }
    return {
      success: true,
      reading_list: list,
      message: 'Article added to reading list.'
    };
  }

  getReadingList() {
    const list = this._getOrCreateReadingList();
    const articles = this._getFromStorage('blog_articles', []);
    const selected = articles.filter(a => list.article_ids.indexOf(a.id) !== -1);
    return {
      reading_list: list,
      articles: selected
    };
  }

  removeArticleFromReadingList(articleId) {
    const list = this._getOrCreateReadingList();
    const allLists = this._getFromStorage('reading_lists', []);
    const idx = allLists.findIndex(l => l.id === list.id);
    list.article_ids = list.article_ids.filter(id => id !== articleId);
    list.updated_at = new Date().toISOString();
    if (idx >= 0) {
      allLists[idx] = list;
    } else {
      allLists.push(list);
    }
    this._saveToStorage('reading_lists', allLists);
    return {
      success: true,
      reading_list: list,
      message: 'Article removed from reading list.'
    };
  }

  getPricingPageOverview() {
    const base = this._getFromStorage('pricing_page_overview', {});
    return {
      headline: base.headline || '',
      subheadline: base.subheadline || '',
      explanation: base.explanation || '',
      faq_items: Array.isArray(base.faq_items) ? base.faq_items : []
    };
  }

  getRetainerPlans(max_monthly_price, min_hours, max_hours, sort_by) {
    let plans = this._getFromStorage('retainer_plans', []);
    plans = plans.filter(p => p && p.is_active);
    if (typeof max_monthly_price === 'number') {
      plans = plans.filter(p => (p.monthly_price || 0) <= max_monthly_price);
    }
    if (typeof min_hours === 'number') {
      plans = plans.filter(p => (p.included_hours_per_month || 0) >= min_hours);
    }
    if (typeof max_hours === 'number') {
      plans = plans.filter(p => (p.included_hours_per_month || 0) <= max_hours);
    }
    const sortKey = sort_by || 'price_low_to_high';
    if (sortKey === 'price_low_to_high') {
      plans.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
    } else if (sortKey === 'hours_high_to_low') {
      plans.sort((a, b) => (b.included_hours_per_month || 0) - (a.included_hours_per_month || 0));
    }
    return plans;
  }

  getRetainerPlanDetail(retainerPlanId) {
    const plans = this._getFromStorage('retainer_plans', []);
    const plan = plans.find(p => p.id === retainerPlanId) || null;
    if (!plan) {
      return {
        retainer_plan: null,
        recommended_use_cases: ''
      };
    }
    let useCases = 'Ideal for teams needing ';
    if (plan.included_hours_per_month <= 10) {
      useCases += 'light ongoing creative support each month.';
    } else if (plan.included_hours_per_month <= 30) {
      useCases += 'regular campaign and content support each month.';
    } else {
      useCases += 'heavy creative production and strategy support each month.';
    }
    return {
      retainer_plan: plan,
      recommended_use_cases: useCases
    };
  }

  submitRetainerQuoteRequest(retainerPlanId, commitment_length_months, name, email, project_description) {
    const plans = this._getFromStorage('retainer_plans', []);
    const quotes = this._getFromStorage('quote_requests', []);
    const plan = plans.find(p => p.id === retainerPlanId) || null;
    const now = new Date().toISOString();
    const calculated_total_price =
      plan && typeof plan.monthly_price === 'number' && typeof commitment_length_months === 'number'
        ? plan.monthly_price * commitment_length_months
        : null;
    const quote = {
      id: this._generateId('quote'),
      quote_type: 'retainer',
      package_id: null,
      retainer_plan_id: retainerPlanId || null,
      campaign_plan_id: null,
      selected_add_on_ids: [],
      calculated_total_price: calculated_total_price,
      name: name,
      email: email,
      company: null,
      budget_range: null,
      custom_budget_amount: null,
      desired_start_date: null,
      project_description: project_description || null,
      commitment_length_months: typeof commitment_length_months === 'number' ? commitment_length_months : null,
      created_at: now,
      status: 'submitted'
    };
    quotes.push(quote);
    this._saveToStorage('quote_requests', quotes);
    return {
      success: true,
      quote_request: quote,
      message: plan ? 'Retainer quote request submitted.' : 'Retainer quote request submitted (plan not found).'
    };
  }

  getNewsletterOptions() {
    const base = this._getFromStorage('newsletter_options', {});
    const role_options =
      Array.isArray(base.role_options) && base.role_options.length > 0
        ? base.role_options
        : [
            { value: 'marketing_manager', label: 'Marketing Manager' },
            { value: 'founder', label: 'Founder' },
            { value: 'cmo', label: 'CMO' },
            { value: 'creative_director', label: 'Creative Director' },
            { value: 'other', label: 'Other' }
          ];
    const interest_options =
      Array.isArray(base.interest_options) && base.interest_options.length > 0
        ? base.interest_options
        : [
            { value: 'video_marketing', label: 'Video Marketing' },
            { value: 'brand_strategy', label: 'Brand Strategy' },
            { value: 'social_media_content', label: 'Social Media Content' }
          ];
    const frequency_options =
      Array.isArray(base.frequency_options) && base.frequency_options.length > 0
        ? base.frequency_options
        : [
            { value: 'monthly_highlights', label: 'Monthly highlights' },
            { value: 'weekly_roundup', label: 'Weekly roundup' },
            { value: 'quarterly_digest', label: 'Quarterly digest' }
          ];
    return {
      role_options: role_options,
      interest_options: interest_options,
      frequency_options: frequency_options
    };
  }

  subscribeToNewsletter(email, role, interests, frequency) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    let subscription = subs.find(s => s.email === email) || null;
    const now = new Date().toISOString();
    if (!subscription) {
      subscription = {
        id: this._generateId('newsletter_sub'),
        email: email,
        role: role,
        interests: Array.isArray(interests) ? interests : [],
        frequency: frequency,
        subscribed_at: now,
        is_active: true
      };
      subs.push(subscription);
    } else {
      subscription.role = role;
      subscription.interests = Array.isArray(interests) ? interests : [];
      subscription.frequency = frequency;
      subscription.is_active = true;
    }
    this._saveToStorage('newsletter_subscriptions', subs);
    return {
      success: true,
      subscription: subscription,
      message: 'Subscribed to newsletter.'
    };
  }

  getCampaignBuilderOptions() {
    const base = this._getFromStorage('campaign_builder_options', {});
    const goal_options =
      Array.isArray(base.goal_options) && base.goal_options.length > 0
        ? base.goal_options
        : [
            {
              value: 'product_launch_campaign',
              label: 'Product launch campaign',
              description: 'Plan a multi-channel campaign for a new product launch.'
            },
            {
              value: 'brand_awareness_campaign',
              label: 'Brand awareness campaign',
              description: 'Increase visibility with ongoing content.'
            },
            {
              value: 'evergreen_content_campaign',
              label: 'Evergreen content campaign',
              description: 'Create long-lasting content assets.'
            }
          ];
    const service_options =
      Array.isArray(base.service_options) && base.service_options.length > 0
        ? base.service_options
        : [
            { value: 'product_photography', label: 'Product photography' },
            { value: 'launch_video', label: 'Launch video' }
          ];
    const budget_presets =
      Array.isArray(base.budget_presets) && base.budget_presets.length > 0
        ? base.budget_presets
        : [
            { max_budget: 8000, label: 'Up to $8,000' },
            { max_budget: 15000, label: 'Up to $15,000' }
          ];
    return {
      goal_options: goal_options,
      service_options: service_options,
      budget_presets: budget_presets
    };
  }

  getCampaignPackageRecommendations(goal, selected_services, max_budget) {
    const packages = this._getFromStorage('packages', []);
    const active = packages.filter(p => p && p.is_active);
    const services = Array.isArray(selected_services) ? selected_services : [];
    let productPhotography = [];
    let launchVideo = [];
    if (services.indexOf('product_photography') !== -1) {
      productPhotography = active.filter(p => p.service_category === 'product_photography');
    }
    if (services.indexOf('launch_video') !== -1) {
      launchVideo = active.filter(p => p.service_category === 'launch_video');
      if (goal === 'product_launch_campaign') {
        launchVideo = launchVideo.filter(p => !p.project_type || p.project_type === 'product_launch');
      }
    }
    if (typeof max_budget === 'number' && max_budget > 0) {
      productPhotography.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
      launchVideo.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    }
    return {
      product_photography_packages: productPhotography,
      launch_video_packages: launchVideo
    };
  }

  saveCampaignPlan(
    name,
    goal,
    selected_services,
    product_photography_package_id,
    launch_video_package_id,
    total_price,
    start_date
  ) {
    const plans = this._getFromStorage('campaign_plans', []);
    const pkgIds = [];
    const addOnMap = {};
    if (product_photography_package_id) {
      pkgIds.push(product_photography_package_id);
    }
    if (launch_video_package_id) {
      pkgIds.push(launch_video_package_id);
    }
    let combined = { total_price: 0, currency: 'usd' };
    if (!total_price && pkgIds.length > 0) {
      combined = this._calculateCombinedPackagePrice(pkgIds, addOnMap);
    }
    const now = new Date().toISOString();
    const plan = {
      id: this._generateId('campaign_plan'),
      name: name,
      goal: goal,
      selected_services: Array.isArray(selected_services) ? selected_services : [],
      product_photography_package_id: product_photography_package_id || null,
      launch_video_package_id: launch_video_package_id || null,
      total_price: typeof total_price === 'number' && total_price > 0 ? total_price : combined.total_price,
      currency: combined.currency || 'usd',
      start_date: start_date || null,
      created_at: now,
      status: 'saved'
    };
    plans.push(plan);
    this._saveToStorage('campaign_plans', plans);
    this._saveToStorage('campaign_draft', plan);
    return {
      success: true,
      campaign_plan: plan,
      message: 'Campaign plan saved.'
    };
  }

  submitCampaignQuoteRequest(campaign_plan_id, name, email, company, budget_range, project_description) {
    const plans = this._getFromStorage('campaign_plans', []);
    const quotes = this._getFromStorage('quote_requests', []);
    const plan = plans.find(p => p.id === campaign_plan_id) || null;
    const now = new Date().toISOString();
    const quote = {
      id: this._generateId('quote'),
      quote_type: 'campaign',
      package_id: null,
      retainer_plan_id: null,
      campaign_plan_id: campaign_plan_id || null,
      selected_add_on_ids: [],
      calculated_total_price: plan && typeof plan.total_price === 'number' ? plan.total_price : null,
      name: name,
      email: email || null,
      company: company || null,
      budget_range: budget_range || null,
      custom_budget_amount: null,
      desired_start_date: plan && plan.start_date ? plan.start_date : null,
      project_description: project_description || null,
      commitment_length_months: null,
      created_at: now,
      status: 'submitted'
    };
    quotes.push(quote);
    this._saveToStorage('quote_requests', quotes);
    return {
      success: true,
      quote_request: quote,
      message: plan ? 'Campaign quote request submitted.' : 'Campaign quote request submitted (plan not found).'
    };
  }

  getAboutPageContent() {
    const base = this._getFromStorage('about_page_content', {});
    return {
      mission: base.mission || '',
      history: base.history || '',
      creative_philosophy: base.creative_philosophy || '',
      client_industries_summary: base.client_industries_summary || '',
      team_members: Array.isArray(base.team_members) ? base.team_members : [],
      capabilities: Array.isArray(base.capabilities) ? base.capabilities : []
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
