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
    const arrayKeys = [
      'pricing_plans',
      'subscriptions',
      'chatbots',
      'chatbot_templates',
      'kb_categories',
      'kb_articles',
      'chatbot_appearances',
      'lead_capture_forms',
      'lead_capture_fields',
      'leads',
      'teams',
      'routing_rules',
      'team_members',
      'chatbot_members',
      'daily_analytics_summaries',
      'help_center_categories',
      'help_center_articles',
      'contact_requests'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('marketing_pages')) {
      localStorage.setItem(
        'marketing_pages',
        JSON.stringify({
          home: {
            title: 'Welcome',
            subtitle: '',
            sections: [],
            primary_cta: null,
            secondary_cta: null
          }
        })
      );
    }

    if (!localStorage.getItem('account')) {
      localStorage.setItem('account', JSON.stringify(null));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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
    localStorage.setItem('idCounter', next.toString());
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

  // --------------------
  // Helper functions (private)
  // --------------------

  // Load current subscription and plan
  _getCurrentSubscription() {
    const subscriptions = this._getFromStorage('subscriptions', []);
    const plans = this._getFromStorage('pricing_plans', []);

    const activeSubs = subscriptions.filter(
      (s) => s.status === 'active' || s.status === 'trial'
    );
    if (activeSubs.length === 0) {
      return { subscription: null, plan: null };
    }

    activeSubs.sort((a, b) => {
      const da = this._parseDate(a.signup_at) || new Date(0);
      const db = this._parseDate(b.signup_at) || new Date(0);
      return db - da;
    });

    const subscription = activeSubs[0];
    const plan = plans.find((p) => p.id === subscription.plan_id) || null;
    const subscriptionWithPlan = plan ? { ...subscription, plan } : subscription;

    return { subscription: subscriptionWithPlan, plan };
  }

  // Aggregate DailyAnalyticsSummary records into metrics
  _calculateDashboardMetrics(summaries) {
    let totalConversations = 0;
    let totalMessages = 0;

    for (const s of summaries) {
      totalConversations += s.total_conversations || 0;
      totalMessages += s.total_messages || 0;
    }

    const avg = totalConversations > 0 ? totalMessages / totalConversations : 0;

    return {
      total_conversations_last_7_days: totalConversations,
      average_messages_per_conversation_last_7_days: Number(avg.toFixed(2))
    };
  }

  // Ensure a ChatbotAppearance record exists
  _ensureChatbotAppearanceExists(chatbotId) {
    let appearances = this._getFromStorage('chatbot_appearances', []);
    let appearance = appearances.find((a) => a.chatbot_id === chatbotId);

    if (!appearance) {
      const now = this._nowISO();
      appearance = {
        id: this._generateId('appearance'),
        chatbot_id: chatbotId,
        accent_color: '#1A73E8',
        position: 'bottom_right',
        header_title: '',
        show_title: true,
        updated_at: now
      };
      appearances.push(appearance);
      this._saveToStorage('chatbot_appearances', appearances);
    }

    return appearance;
  }

  // Ensure a LeadCaptureForm exists for chatbot
  _ensureLeadCaptureFormExists(chatbotId) {
    let forms = this._getFromStorage('lead_capture_forms', []);
    let form = forms.find((f) => f.chatbot_id === chatbotId);

    if (!form) {
      const now = this._nowISO();
      form = {
        id: this._generateId('leadform'),
        chatbot_id: chatbotId,
        enabled: false,
        title: '',
        description: '',
        created_at: now,
        updated_at: now
      };
      forms.push(form);
      this._saveToStorage('lead_capture_forms', forms);
    }

    return form;
  }

  // Validate business hours rule
  _validateBusinessHoursRule(daysOfWeek, startTime, endTime) {
    const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return { valid: false, error_message: 'At least one day of week must be selected.' };
    }

    for (const d of daysOfWeek) {
      if (!validDays.includes(d)) {
        return { valid: false, error_message: `Invalid day of week: ${d}` };
      }
    }

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return { valid: false, error_message: 'Start and end times must be in HH:MM 24h format.' };
    }

    if (startTime >= endTime) {
      return { valid: false, error_message: 'Start time must be earlier than end time.' };
    }

    return { valid: true };
  }

  // Helper to resolve chatbot object
  _getChatbotById(chatbotId) {
    const chatbots = this._getFromStorage('chatbots', []);
    return chatbots.find((c) => c.id === chatbotId) || null;
  }

  // --------------------
  // Core interface implementations
  // --------------------

  // getMarketingPageContent(pageKey)
  getMarketingPageContent(pageKey) {
    const pages = this._getFromStorage('marketing_pages', {});
    const content = pages[pageKey];

    if (!content) {
      return {
        title: '',
        subtitle: '',
        sections: [],
        primary_cta: null,
        secondary_cta: null
      };
    }

    return {
      title: content.title || '',
      subtitle: content.subtitle || '',
      sections: Array.isArray(content.sections) ? content.sections : [],
      primary_cta: content.primary_cta || null,
      secondary_cta: content.secondary_cta || null
    };
  }

  // getPricingPlansForDisplay(billingPeriod, filters)
  getPricingPlansForDisplay(billingPeriod, filters) {
    const plans = this._getFromStorage('pricing_plans', []);
    const period = billingPeriod || 'monthly';
    const appliedFilters = filters || {};

    let result = plans.filter((p) => p.status === 'active' && p.billing_period === period);

    if (appliedFilters.maxMonthlyPrice != null) {
      result = result.filter((p) => Number(p.monthly_price) <= Number(appliedFilters.maxMonthlyPrice));
    }

    if (appliedFilters.minChatbots != null) {
      result = result.filter((p) => Number(p.max_chatbots) >= Number(appliedFilters.minChatbots));
    }

    if (appliedFilters.requiresAnalytics) {
      result = result.filter((p) => !!p.includes_conversation_analytics);
    }

    return result.map((p) => {
      const priceDisplay = `$${p.monthly_price}/mo`;
      const chatbotLimitDisplay = `Up to ${p.max_chatbots} chatbot${p.max_chatbots === 1 ? '' : 's'}`;
      const analyticsDisplay = p.includes_conversation_analytics
        ? 'Includes conversation analytics'
        : 'No conversation analytics';

      const highlightLabels = [];
      if (p.is_most_popular) highlightLabels.push('Most popular');
      if (p.includes_conversation_analytics) highlightLabels.push('Analytics');

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        monthly_price: p.monthly_price,
        billing_period: p.billing_period,
        max_chatbots: p.max_chatbots,
        includes_conversation_analytics: p.includes_conversation_analytics,
        feature_list: Array.isArray(p.feature_list) ? p.feature_list : [],
        status: p.status,
        is_most_popular: !!p.is_most_popular,
        price_display: priceDisplay,
        chatbot_limit_display: chatbotLimitDisplay,
        analytics_display: analyticsDisplay,
        highlight_labels: highlightLabels
      };
    });
  }

  // getPlanSignupData(planId)
  getPlanSignupData(planId) {
    const plans = this._getFromStorage('pricing_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return null;
    }

    const summaryParts = [plan.name];
    if (plan.monthly_price != null) summaryParts.push(`$${plan.monthly_price}/mo`);
    if (plan.max_chatbots != null) summaryParts.push(`${plan.max_chatbots} chatbot${plan.max_chatbots === 1 ? '' : 's'}`);
    if (plan.includes_conversation_analytics) summaryParts.push('Analytics included');

    return {
      plan_id: plan.id,
      plan_name: plan.name,
      monthly_price: plan.monthly_price,
      billing_period: plan.billing_period,
      max_chatbots: plan.max_chatbots,
      includes_conversation_analytics: plan.includes_conversation_analytics,
      feature_list: Array.isArray(plan.feature_list) ? plan.feature_list : [],
      summary_display: summaryParts.join(' · ')
    };
  }

  // createSubscriptionAndAccount(planId, companyName, contactEmail, password)
  createSubscriptionAndAccount(planId, companyName, contactEmail, password) {
    const plans = this._getFromStorage('pricing_plans', []);
    const plan = plans.find((p) => p.id === planId && p.status === 'active');

    if (!plan) {
      return {
        success: false,
        subscription: null,
        welcome_message: '',
        redirect_to_dashboard: false,
        error_message: 'Selected plan not found or inactive.'
      };
    }

    let subscriptions = this._getFromStorage('subscriptions', []);
    const now = this._nowISO();

    // Cancel existing active/trial subscriptions
    subscriptions = subscriptions.map((s) => {
      if (s.status === 'active' || s.status === 'trial') {
        return { ...s, status: 'cancelled' };
      }
      return s;
    });

    const subscription = {
      id: this._generateId('sub'),
      company_name: companyName,
      contact_email: contactEmail,
      plan_id: plan.id,
      signup_at: now,
      status: 'trial',
      billing_period: plan.billing_period,
      notes: ''
    };

    subscriptions.push(subscription);
    this._saveToStorage('subscriptions', subscriptions);

    // Store basic account info (password stored as plain text here; in real apps use hashing)
    const account = {
      company_name: companyName,
      contact_email: contactEmail,
      password: password
    };
    this._saveToStorage('account', account);

    const subscriptionWithPlan = { ...subscription, plan };

    return {
      success: true,
      subscription: subscriptionWithPlan,
      welcome_message: `Welcome to ${plan.name}!`,
      redirect_to_dashboard: true
    };
  }

  // getDashboardOverview()
  getDashboardOverview() {
    const { subscription, plan } = this._getCurrentSubscription();
    const chatbots = this._getFromStorage('chatbots', []);
    const summaries = this._getFromStorage('daily_analytics_summaries', []);

    const now = new Date();
    const endDate = now;
    const startDate = new Date();
    startDate.setDate(now.getDate() - 6);

    const summariesInRange = summaries.filter((s) => {
      const d = this._parseDate(s.date);
      if (!d) return false;
      return d >= startDate && d <= endDate;
    });

    const globalMetrics = this._calculateDashboardMetrics(summariesInRange);

    const chatbots_summary = chatbots.map((cb) => {
      const cbSummaries = summariesInRange.filter((s) => s.chatbot_id === cb.id);
      const cbMetrics = this._calculateDashboardMetrics(cbSummaries);
      return {
        chatbot_id: cb.id,
        chatbot_name: cb.name,
        status: cb.status,
        primary_language: cb.primary_language,
        total_conversations_last_7_days: cbMetrics.total_conversations_last_7_days,
        total_messages_last_7_days: cbSummaries.reduce(
          (acc, s) => acc + (s.total_messages || 0),
          0
        )
      };
    });

    const getting_started_steps = [
      {
        id: 'create_chatbot',
        title: 'Create your first chatbot',
        description: 'Use a template or start from scratch to create a chatbot.',
        target_page_key: 'chatbots_new'
      },
      {
        id: 'customize_appearance',
        title: 'Customize widget appearance',
        description: 'Match the chat widget to your brand colors and position.',
        target_page_key: 'chatbot_appearance'
      },
      {
        id: 'enable_lead_capture',
        title: 'Enable lead capture',
        description: 'Capture visitor details like name, email, and company.',
        target_page_key: 'chatbot_lead_capture'
      }
    ];

    return {
      subscription_plan_name: plan ? plan.name : null,
      subscription_status: subscription ? subscription.status : null,
      has_chatbots: chatbots.length > 0,
      chatbots_summary,
      key_metrics: {
        total_conversations_last_7_days:
          globalMetrics.total_conversations_last_7_days,
        average_messages_per_conversation_last_7_days:
          globalMetrics.average_messages_per_conversation_last_7_days
      },
      show_getting_started: chatbots.length === 0,
      getting_started_steps
    };
  }

  // getChatbotsList()
  getChatbotsList() {
    const chatbots = this._getFromStorage('chatbots', []);
    const summaries = this._getFromStorage('daily_analytics_summaries', []);

    const now = new Date();
    const endDate = now;
    const startDate = new Date();
    startDate.setDate(now.getDate() - 6);

    return chatbots.map((cb) => {
      const cbSummaries = summaries.filter((s) => {
        if (s.chatbot_id !== cb.id) return false;
        const d = this._parseDate(s.date);
        if (!d) return false;
        return d >= startDate && d <= endDate;
      });

      const totalConversations = cbSummaries.reduce(
        (acc, s) => acc + (s.total_conversations || 0),
        0
      );
      const totalMessages = cbSummaries.reduce(
        (acc, s) => acc + (s.total_messages || 0),
        0
      );

      return {
        id: cb.id,
        name: cb.name,
        status: cb.status,
        primary_language: cb.primary_language,
        greeting_message: cb.greeting_message,
        created_at: cb.created_at,
        updated_at: cb.updated_at,
        total_conversations_last_7_days: totalConversations,
        total_messages_last_7_days: totalMessages
      };
    });
  }

  // getNewChatbotOptions()
  getNewChatbotOptions() {
    const templates = this._getFromStorage('chatbot_templates', []);
    const activeTemplates = templates.filter((t) => t.status === 'active');

    // Simple heuristic: first 3 active templates as recommended
    const recommended_templates = activeTemplates.slice(0, 3);

    return {
      available_creation_modes: ['from_scratch', 'from_template'],
      recommended_templates
    };
  }

  // getChatbotTemplates(filters)
  getChatbotTemplates(filters) {
    const allTemplates = this._getFromStorage('chatbot_templates', []).filter(
      (t) => t.status === 'active'
    );

    const available_categories = Array.from(
      new Set(
        allTemplates
          .flatMap((t) => (Array.isArray(t.categories) ? t.categories : []))
          .filter(Boolean)
      )
    );

    const available_tags = Array.from(
      new Set(
        allTemplates
          .flatMap((t) => (Array.isArray(t.tags) ? t.tags : []))
          .filter(Boolean)
      )
    );

    let templates = allTemplates;
    const f = filters || {};

    if (Array.isArray(f.categories) && f.categories.length > 0) {
      const catsLower = f.categories.map((c) => String(c).toLowerCase());
      templates = templates.filter((t) => {
        const tCats = (t.categories || []).map((c) => String(c).toLowerCase());
        return tCats.some((c) => catsLower.includes(c));
      });
    }

    if (Array.isArray(f.tags) && f.tags.length > 0) {
      const tagsLower = f.tags.map((c) => String(c).toLowerCase());
      templates = templates.filter((t) => {
        const tTags = (t.tags || []).map((c) => String(c).toLowerCase());
        return tTags.some((c) => tagsLower.includes(c));
      });
    }

    if (f.search) {
      const q = String(f.search).toLowerCase();
      templates = templates.filter((t) => {
        const name = (t.name || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    return {
      templates,
      available_categories,
      available_tags
    };
  }

  // createChatbotFromTemplate(templateId, name, primaryLanguage, greetingMessage)
  createChatbotFromTemplate(templateId, name, primaryLanguage, greetingMessage) {
    const templates = this._getFromStorage('chatbot_templates', []);
    const template = templates.find((t) => t.id === templateId && t.status === 'active');

    if (!template) {
      return {
        chatbot: null,
        redirect_to_chatbot_settings: false
      };
    }

    const now = this._nowISO();
    const chatbot = {
      id: this._generateId('chatbot'),
      name,
      primary_language: primaryLanguage,
      greeting_message: greetingMessage || template.default_greeting || '',
      template_id: template.id,
      status: 'active',
      description: template.description || '',
      created_at: now,
      updated_at: now
    };

    const chatbots = this._getFromStorage('chatbots', []);
    chatbots.push(chatbot);
    this._saveToStorage('chatbots', chatbots);

    return {
      chatbot,
      redirect_to_chatbot_settings: true
    };
  }

  // createChatbotFromScratch(name, primaryLanguage, greetingMessage)
  createChatbotFromScratch(name, primaryLanguage, greetingMessage) {
    const now = this._nowISO();
    const chatbot = {
      id: this._generateId('chatbot'),
      name,
      primary_language: primaryLanguage,
      greeting_message: greetingMessage || '',
      template_id: null,
      status: 'active',
      description: '',
      created_at: now,
      updated_at: now
    };

    const chatbots = this._getFromStorage('chatbots', []);
    chatbots.push(chatbot);
    this._saveToStorage('chatbots', chatbots);

    return {
      chatbot,
      redirect_to_chatbot_settings: true
    };
  }

  // getChatbotSettings(chatbotId)
  getChatbotSettings(chatbotId) {
    const chatbots = this._getFromStorage('chatbots', []);
    const chatbot = chatbots.find((c) => c.id === chatbotId) || null;

    if (!chatbot) {
      return {
        general: null,
        knowledge_base_summary: {
          total_articles: 0,
          total_categories: 0
        },
        appearance: null,
        lead_capture_summary: {
          enabled: false,
          field_count: 0
        },
        members_summary: {
          member_count: 0
        }
      };
    }

    const templates = this._getFromStorage('chatbot_templates', []);
    const template = templates.find((t) => t.id === chatbot.template_id) || null;
    const general = { ...chatbot, template };

    const allCategories = this._getFromStorage('kb_categories', []);
    const allArticles = this._getFromStorage('kb_articles', []);
    const categories = allCategories.filter((c) => c.chatbot_id === chatbotId);
    const articles = allArticles.filter((a) => a.chatbot_id === chatbotId);

    const knowledge_base_summary = {
      total_articles: articles.length,
      total_categories: categories.length
    };

    const rawAppearance = this._ensureChatbotAppearanceExists(chatbotId);
    const appearance = { ...rawAppearance, chatbot };

    const forms = this._getFromStorage('lead_capture_forms', []);
    const fields = this._getFromStorage('lead_capture_fields', []);
    const form = forms.find((f) => f.chatbot_id === chatbotId) || null;
    let lead_capture_summary;
    if (!form) {
      lead_capture_summary = {
        enabled: false,
        field_count: 0
      };
    } else {
      const formFields = fields.filter((fld) => fld.form_id === form.id);
      lead_capture_summary = {
        enabled: !!form.enabled,
        field_count: formFields.length
      };
    }

    const chatbotMembers = this._getFromStorage('chatbot_members', []).filter(
      (m) => m.chatbot_id === chatbotId
    );
    const members_summary = {
      member_count: chatbotMembers.length
    };

    return {
      general,
      knowledge_base_summary,
      appearance,
      lead_capture_summary,
      members_summary
    };
  }

  // updateChatbotGeneralSettings(chatbotId, name, primaryLanguage, greetingMessage, status, description)
  updateChatbotGeneralSettings(
    chatbotId,
    name,
    primaryLanguage,
    greetingMessage,
    status,
    description
  ) {
    const chatbots = this._getFromStorage('chatbots', []);
    const index = chatbots.findIndex((c) => c.id === chatbotId);

    if (index === -1) {
      return {
        success: false,
        chatbot: null,
        error_message: 'Chatbot not found.'
      };
    }

    const chatbot = { ...chatbots[index] };

    if (name !== undefined) chatbot.name = name;
    if (primaryLanguage !== undefined) chatbot.primary_language = primaryLanguage;
    if (greetingMessage !== undefined) chatbot.greeting_message = greetingMessage;
    if (status !== undefined) chatbot.status = status;
    if (description !== undefined) chatbot.description = description;

    chatbot.updated_at = this._nowISO();

    chatbots[index] = chatbot;
    this._saveToStorage('chatbots', chatbots);

    return {
      success: true,
      chatbot,
      error_message: undefined
    };
  }

  // getKnowledgeBaseCategories(chatbotId)
  getKnowledgeBaseCategories(chatbotId) {
    const categories = this._getFromStorage('kb_categories', []).filter(
      (c) => c.chatbot_id === chatbotId
    );
    const articles = this._getFromStorage('kb_articles', []).filter(
      (a) => a.chatbot_id === chatbotId
    );
    const chatbot = this._getChatbotById(chatbotId);

    return categories.map((cat) => {
      const article_count = articles.filter((a) => a.category_id === cat.id).length;
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        article_count,
        created_at: cat.created_at,
        chatbot_id: cat.chatbot_id,
        chatbot
      };
    });
  }

  // getChatbotKnowledgeBaseArticles(chatbotId, categoryId, search)
  getChatbotKnowledgeBaseArticles(chatbotId, categoryId, search) {
    let articles = this._getFromStorage('kb_articles', []).filter(
      (a) => a.chatbot_id === chatbotId
    );

    if (categoryId) {
      articles = articles.filter((a) => a.category_id === categoryId);
    }

    if (search) {
      const q = String(search).toLowerCase();
      articles = articles.filter((a) => {
        const qText = (a.question || '').toLowerCase();
        const aText = (a.answer || '').toLowerCase();
        return qText.includes(q) || aText.includes(q);
      });
    }

    const categories = this._getFromStorage('kb_categories', []);
    const chatbot = this._getChatbotById(chatbotId);

    return articles.map((a) => {
      const category = categories.find((c) => c.id === a.category_id) || null;
      let answer_preview = a.answer || '';
      if (answer_preview.length > 120) {
        answer_preview = answer_preview.slice(0, 120) + '…';
      }

      return {
        id: a.id,
        question: a.question,
        answer_preview,
        category_id: a.category_id || null,
        category_name: category ? category.name : null,
        is_published: a.is_published,
        created_at: a.created_at,
        chatbot_id: a.chatbot_id,
        chatbot,
        category
      };
    });
  }

  // createKnowledgeBaseCategory(chatbotId, name, description)
  createKnowledgeBaseCategory(chatbotId, name, description) {
    const categories = this._getFromStorage('kb_categories', []);
    const now = this._nowISO();
    const category = {
      id: this._generateId('kbcat'),
      chatbot_id: chatbotId,
      name,
      description: description || '',
      created_at: now
    };
    categories.push(category);
    this._saveToStorage('kb_categories', categories);

    return {
      category: {
        id: category.id,
        chatbot_id: category.chatbot_id,
        name: category.name,
        description: category.description,
        created_at: category.created_at
      }
    };
  }

  // createKnowledgeBaseArticle(chatbotId, question, answer, categoryId, categoryName, isPublished)
  createKnowledgeBaseArticle(
    chatbotId,
    question,
    answer,
    categoryId,
    categoryName,
    isPublished
  ) {
    let categories = this._getFromStorage('kb_categories', []);
    const now = this._nowISO();
    let category = null;
    let resolvedCategoryId = categoryId || null;

    if (!resolvedCategoryId && categoryName) {
      category = {
        id: this._generateId('kbcat'),
        chatbot_id: chatbotId,
        name: categoryName,
        description: '',
        created_at: now
      };
      categories.push(category);
      this._saveToStorage('kb_categories', categories);
      resolvedCategoryId = category.id;
    } else if (resolvedCategoryId) {
      category = categories.find((c) => c.id === resolvedCategoryId) || null;
    }

    const articles = this._getFromStorage('kb_articles', []);
    const article = {
      id: this._generateId('kbart'),
      chatbot_id: chatbotId,
      category_id: resolvedCategoryId,
      question,
      answer,
      created_at: now,
      updated_at: null,
      is_published: !!isPublished
    };
    articles.push(article);
    this._saveToStorage('kb_articles', articles);

    return {
      article,
      category
    };
  }

  // getChatbotAppearance(chatbotId)
  getChatbotAppearance(chatbotId) {
    const appearance = this._ensureChatbotAppearanceExists(chatbotId);
    const chatbot = this._getChatbotById(chatbotId);
    if (chatbot) {
      return { ...appearance, chatbot };
    }
    return appearance;
  }

  // updateChatbotAppearance(chatbotId, accentColor, position, headerTitle, showTitle)
  updateChatbotAppearance(chatbotId, accentColor, position, headerTitle, showTitle) {
    const validPositions = ['bottom_right', 'bottom_left', 'top_right', 'top_left'];
    if (!validPositions.includes(position)) {
      return {
        success: false,
        appearance: null,
        error_message: 'Invalid widget position.'
      };
    }

    const chatbot = this._getChatbotById(chatbotId);
    if (!chatbot) {
      return {
        success: false,
        appearance: null,
        error_message: 'Chatbot not found.'
      };
    }

    let appearances = this._getFromStorage('chatbot_appearances', []);
    let appearance = appearances.find((a) => a.chatbot_id === chatbotId);

    if (!appearance) {
      appearance = this._ensureChatbotAppearanceExists(chatbotId);
      appearances = this._getFromStorage('chatbot_appearances', []);
    }

    appearance = {
      ...appearance,
      accent_color: accentColor,
      position,
      header_title: headerTitle || appearance.header_title || '',
      show_title: !!showTitle,
      updated_at: this._nowISO()
    };

    const index = appearances.findIndex((a) => a.id === appearance.id);
    if (index === -1) {
      appearances.push(appearance);
    } else {
      appearances[index] = appearance;
    }
    this._saveToStorage('chatbot_appearances', appearances);

    const fullAppearance = { ...appearance, chatbot };

    return {
      success: true,
      appearance: fullAppearance
    };
  }

  // getLeadCaptureConfig(chatbotId)
  getLeadCaptureConfig(chatbotId) {
    const chatbot = this._getChatbotById(chatbotId);
    if (!chatbot) {
      return {
        form: null,
        fields: []
      };
    }

    const form = this._ensureLeadCaptureFormExists(chatbotId);
    const allFields = this._getFromStorage('lead_capture_fields', []);
    const fields = allFields
      .filter((f) => f.form_id === form.id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((f) => ({ ...f, form }));

    const formWithChatbot = { ...form, chatbot };

    return {
      form: formWithChatbot,
      fields
    };
  }

  // configureLeadCaptureForm(chatbotId, enabled, fields)
  configureLeadCaptureForm(chatbotId, enabled, fields) {
    const chatbot = this._getChatbotById(chatbotId);
    if (!chatbot) {
      return {
        success: false,
        form: null,
        fields: [],
        error_message: 'Chatbot not found.'
      };
    }

    const form = this._ensureLeadCaptureFormExists(chatbotId);
    let forms = this._getFromStorage('lead_capture_forms', []);
    const formIndex = forms.findIndex((f) => f.id === form.id);

    const updatedForm = {
      ...form,
      enabled: !!enabled,
      updated_at: this._nowISO()
    };

    if (formIndex === -1) {
      forms.push(updatedForm);
    } else {
      forms[formIndex] = updatedForm;
    }
    this._saveToStorage('lead_capture_forms', forms);

    // Replace existing fields for this form
    let allFields = this._getFromStorage('lead_capture_fields', []);
    allFields = allFields.filter((f) => f.form_id !== updatedForm.id);

    const allowedFieldTypes = ['text', 'email', 'number', 'phone', 'dropdown', 'checkbox'];
    const newFields = (fields || []).map((fld, idx) => {
      const fieldType = fld.fieldType;
      if (!allowedFieldTypes.includes(fieldType)) {
        throw new Error('Invalid field type: ' + fieldType);
      }
      return {
        id: this._generateId('leadfld'),
        form_id: updatedForm.id,
        label: fld.label,
        field_type: fieldType,
        required: !!fld.required,
        order_index:
          typeof fld.orderIndex === 'number' && !isNaN(fld.orderIndex)
            ? fld.orderIndex
            : idx + 1
      };
    });

    allFields = allFields.concat(newFields);
    this._saveToStorage('lead_capture_fields', allFields);

    const formWithChatbot = { ...updatedForm, chatbot };
    const fieldsWithForm = newFields.map((f) => ({ ...f, form: formWithChatbot }));

    return {
      success: true,
      form: formWithChatbot,
      fields: fieldsWithForm
    };
  }

  // getChatbotMembers(chatbotId)
  getChatbotMembers(chatbotId) {
    const chatbot = this._getChatbotById(chatbotId);
    if (!chatbot) {
      return [];
    }

    const chatbotMembers = this._getFromStorage('chatbot_members', []).filter(
      (m) => m.chatbot_id === chatbotId
    );
    const teamMembers = this._getFromStorage('team_members', []);

    return chatbotMembers.map((cm) => {
      const member = teamMembers.find((tm) => tm.id === cm.team_member_id) || null;
      return {
        chatbot_member_id: cm.id,
        team_member_id: cm.team_member_id,
        member_name: member ? member.name : null,
        member_email: member ? member.email : null,
        permission_level: cm.permission_level,
        added_at: cm.added_at,
        status: member ? member.status : null,
        chatbot_id: cm.chatbot_id,
        chatbot,
        team_member: member
      };
    });
  }

  // addChatbotMember(chatbotId, teamMemberId, permissionLevel)
  addChatbotMember(chatbotId, teamMemberId, permissionLevel) {
    const chatbot = this._getChatbotById(chatbotId);
    if (!chatbot) {
      return {
        success: false,
        chatbot_member: null,
        member_name: null,
        error_message: 'Chatbot not found.'
      };
    }

    const teamMembers = this._getFromStorage('team_members', []);
    const member = teamMembers.find((m) => m.id === teamMemberId);

    if (!member) {
      return {
        success: false,
        chatbot_member: null,
        member_name: null,
        error_message: 'Team member not found.'
      };
    }

    const allowedPermissions = ['admin', 'editor', 'viewer'];
    if (!allowedPermissions.includes(permissionLevel)) {
      return {
        success: false,
        chatbot_member: null,
        member_name: null,
        error_message: 'Invalid permission level.'
      };
    }

    const chatbotMembers = this._getFromStorage('chatbot_members', []);
    const existing = chatbotMembers.find(
      (cm) => cm.chatbot_id === chatbotId && cm.team_member_id === teamMemberId
    );
    if (existing) {
      // Update permission level
      existing.permission_level = permissionLevel;
      this._saveToStorage('chatbot_members', chatbotMembers);

      const chatbotMemberWithRefs = {
        ...existing,
        chatbot,
        team_member: member
      };

      return {
        success: true,
        chatbot_member: chatbotMemberWithRefs,
        member_name: member.name
      };
    }

    const now = this._nowISO();
    const newMember = {
      id: this._generateId('cbmem'),
      chatbot_id: chatbotId,
      team_member_id: teamMemberId,
      permission_level: permissionLevel,
      added_at: now
    };

    chatbotMembers.push(newMember);
    this._saveToStorage('chatbot_members', chatbotMembers);

    const newMemberWithRefs = { ...newMember, chatbot, team_member: member };

    return {
      success: true,
      chatbot_member: newMemberWithRefs,
      member_name: member.name
    };
  }

  // removeChatbotMember(chatbotMemberId)
  removeChatbotMember(chatbotMemberId) {
    let chatbotMembers = this._getFromStorage('chatbot_members', []);
    const beforeLength = chatbotMembers.length;
    chatbotMembers = chatbotMembers.filter((cm) => cm.id !== chatbotMemberId);
    const afterLength = chatbotMembers.length;

    this._saveToStorage('chatbot_members', chatbotMembers);

    if (afterLength === beforeLength) {
      return {
        success: false,
        error_message: 'Chatbot member not found.'
      };
    }

    return {
      success: true
    };
  }

  // getRoutingRules()
  getRoutingRules() {
    const rules = this._getFromStorage('routing_rules', []);
    const teams = this._getFromStorage('teams', []);

    return rules.map((rule) => {
      const matchTeam = rule.match_team_id
        ? teams.find((t) => t.id === rule.match_team_id) || null
        : null;
      const fallbackTeam = rule.fallback_team_id
        ? teams.find((t) => t.id === rule.fallback_team_id) || null
        : null;

      return {
        id: rule.id,
        name: rule.name,
        description: rule.description || '',
        status: rule.status,
        condition_type: rule.condition_type,
        days_of_week: rule.days_of_week || [],
        start_time: rule.start_time,
        end_time: rule.end_time,
        match_action_type: rule.match_action_type,
        match_team_id: rule.match_team_id || null,
        match_team_name: matchTeam ? matchTeam.name : null,
        fallback_action_type: rule.fallback_action_type,
        fallback_team_id: rule.fallback_team_id || null,
        fallback_team_name: fallbackTeam ? fallbackTeam.name : null,
        match_team: matchTeam,
        fallback_team: fallbackTeam
      };
    });
  }

  // getRoutingRuleEditorData(ruleId)
  getRoutingRuleEditorData(ruleId) {
    const teams = this._getFromStorage('teams', []);
    const rules = this._getFromStorage('routing_rules', []);

    let rule = null;
    if (ruleId) {
      rule = rules.find((r) => r.id === ruleId) || null;
    }

    if (!rule) {
      // Defaults for a new rule (not persisted)
      rule = {
        id: null,
        name: '',
        description: '',
        status: 'enabled',
        condition_type: 'business_hours',
        days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri'],
        start_time: '09:00',
        end_time: '17:00',
        match_action_type: 'route_to_team',
        match_team_id: null,
        fallback_action_type: 'bot_only',
        fallback_team_id: null,
        created_at: null,
        updated_at: null
      };
    }

    const matchTeam = rule.match_team_id
      ? teams.find((t) => t.id === rule.match_team_id) || null
      : null;
    const fallbackTeam = rule.fallback_team_id
      ? teams.find((t) => t.id === rule.fallback_team_id) || null
      : null;

    const ruleWithTeams = {
      ...rule,
      match_team: matchTeam,
      fallback_team: fallbackTeam
    };

    return {
      rule: ruleWithTeams,
      teams,
      supported_condition_types: ['business_hours']
    };
  }

  // saveRoutingRule(...)
  saveRoutingRule(
    ruleId,
    name,
    description,
    conditionType,
    daysOfWeek,
    startTime,
    endTime,
    matchActionType,
    matchTeamId,
    fallbackActionType,
    fallbackTeamId,
    status
  ) {
    if (conditionType !== 'business_hours') {
      return {
        success: false,
        rule: null,
        error_message: 'Unsupported condition type.'
      };
    }

    const validation = this._validateBusinessHoursRule(daysOfWeek, startTime, endTime);
    if (!validation.valid) {
      return {
        success: false,
        rule: null,
        error_message: validation.error_message
      };
    }

    const allowedActionTypes = ['route_to_team', 'bot_only'];
    if (!allowedActionTypes.includes(matchActionType)) {
      return {
        success: false,
        rule: null,
        error_message: 'Invalid match action type.'
      };
    }
    if (!allowedActionTypes.includes(fallbackActionType)) {
      return {
        success: false,
        rule: null,
        error_message: 'Invalid fallback action type.'
      };
    }

    if (matchActionType === 'route_to_team' && !matchTeamId) {
      return {
        success: false,
        rule: null,
        error_message: 'matchTeamId is required when matchActionType is route_to_team.'
      };
    }
    if (fallbackActionType === 'route_to_team' && !fallbackTeamId) {
      return {
        success: false,
        rule: null,
        error_message:
          'fallbackTeamId is required when fallbackActionType is route_to_team.'
      };
    }

    const allowedStatuses = ['enabled', 'disabled'];
    if (!allowedStatuses.includes(status)) {
      return {
        success: false,
        rule: null,
        error_message: 'Invalid rule status.'
      };
    }

    let rules = this._getFromStorage('routing_rules', []);
    const now = this._nowISO();
    let rule;

    if (ruleId) {
      const index = rules.findIndex((r) => r.id === ruleId);
      if (index === -1) {
        return {
          success: false,
          rule: null,
          error_message: 'Routing rule not found.'
        };
      }

      rule = {
        ...rules[index],
        name,
        description: description || '',
        condition_type: conditionType,
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime,
        match_action_type: matchActionType,
        match_team_id: matchTeamId || null,
        fallback_action_type: fallbackActionType,
        fallback_team_id: fallbackTeamId || null,
        status,
        updated_at: now
      };

      rules[index] = rule;
    } else {
      rule = {
        id: this._generateId('route'),
        name,
        description: description || '',
        condition_type: conditionType,
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime,
        match_action_type: matchActionType,
        match_team_id: matchTeamId || null,
        fallback_action_type: fallbackActionType,
        fallback_team_id: fallbackTeamId || null,
        status,
        created_at: now,
        updated_at: now
      };
      rules.push(rule);
    }

    this._saveToStorage('routing_rules', rules);

    const teams = this._getFromStorage('teams', []);
    const matchTeam = rule.match_team_id
      ? teams.find((t) => t.id === rule.match_team_id) || null
      : null;
    const fallbackTeam = rule.fallback_team_id
      ? teams.find((t) => t.id === rule.fallback_team_id) || null
      : null;

    const ruleWithTeams = { ...rule, match_team: matchTeam, fallback_team: fallbackTeam };

    return {
      success: true,
      rule: ruleWithTeams
    };
  }

  // getAnalyticsDateRangePresets()
  getAnalyticsDateRangePresets() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let prevMonth;
    let prevYear;
    if (currentMonth === 0) {
      prevMonth = 11;
      prevYear = currentYear - 1;
    } else {
      prevMonth = currentMonth - 1;
      prevYear = currentYear;
    }

    const startDatePrevMonth = new Date(prevYear, prevMonth, 1);
    const endDatePrevMonth = new Date(prevYear, prevMonth + 1, 0);

    const formatDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const last7End = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const last7Start = new Date(last7End);
    last7Start.setDate(last7End.getDate() - 6);

    return [
      {
        key: 'last_7_days',
        label: 'Last 7 days',
        start_date: formatDate(last7Start),
        end_date: formatDate(last7End)
      },
      {
        key: 'previous_month',
        label: 'Previous month',
        start_date: formatDate(startDatePrevMonth),
        end_date: formatDate(endDatePrevMonth)
      }
    ];
  }

  // getDailyAnalyticsSummaries(startDate, endDate, chatbotId)
  getDailyAnalyticsSummaries(startDate, endDate, chatbotId) {
    const summaries = this._getFromStorage('daily_analytics_summaries', []);
    const chatbots = this._getFromStorage('chatbots', []);

    // Instrumentation for task completion tracking
    try {
      const presets = this.getAnalyticsDateRangePresets();
      const previousMonthPreset = presets && presets.find((p) => p.key === 'previous_month');
      if (
        previousMonthPreset &&
        startDate === previousMonthPreset.start_date &&
        endDate === previousMonthPreset.end_date
      ) {
        localStorage.setItem(
          'task7_prevMonthFilterParams',
          JSON.stringify({
            startDate: startDate,
            endDate: endDate,
            chatbotId: chatbotId || null
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const start = this._parseDate(startDate + 'T00:00:00Z') || this._parseDate(startDate) || new Date(0);
    const end = this._parseDate(endDate + 'T23:59:59Z') || this._parseDate(endDate) || new Date(8640000000000000);

    const result = summaries
      .filter((s) => {
        const d = this._parseDate(s.date);
        if (!d) return false;
        if (d < start || d > end) return false;
        if (chatbotId) {
          return s.chatbot_id === chatbotId;
        }
        return true;
      })
      .map((s) => {
        const chatbot = s.chatbot_id
          ? chatbots.find((c) => c.id === s.chatbot_id) || null
          : null;

        let formatted_date = s.formatted_date;
        if (!formatted_date) {
          const d = this._parseDate(s.date);
          if (d) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            formatted_date = `${y}-${m}-${day}`;
          } else {
            formatted_date = '';
          }
        }

        return {
          id: s.id,
          date: s.date,
          formatted_date,
          chatbot_id: s.chatbot_id || null,
          total_conversations: s.total_conversations,
          total_messages: s.total_messages,
          average_messages_per_conversation: s.average_messages_per_conversation,
          resolved_conversations: s.resolved_conversations,
          chatbot
        };
      });

    return result;
  }

  // getDailyAnalyticsDetail(dailySummaryId)
  getDailyAnalyticsDetail(dailySummaryId) {
    const summaries = this._getFromStorage('daily_analytics_summaries', []);
    const summary = summaries.find((s) => s.id === dailySummaryId) || null;
    const chatbots = this._getFromStorage('chatbots', []);

    if (!summary) {
      return {
        summary: null,
        breakdown_by_chatbot: [],
        breakdown_by_hour: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      const presets = this.getAnalyticsDateRangePresets();
      const previousMonthPreset = presets && presets.find((p) => p.key === 'previous_month');
      if (previousMonthPreset) {
        const start = this._parseDate(previousMonthPreset.start_date + 'T00:00:00Z') ||
          this._parseDate(previousMonthPreset.start_date);
        const end = this._parseDate(previousMonthPreset.end_date + 'T23:59:59Z') ||
          this._parseDate(previousMonthPreset.end_date);
        const summaryDate = this._parseDate(summary.date);

        if (start && end && summaryDate && summaryDate >= start && summaryDate <= end) {
          const summariesInPrevMonth = summaries.filter((s) => {
            const d = this._parseDate(s.date);
            if (!d) return false;
            return d >= start && d <= end;
          });

          if (summariesInPrevMonth.length > 0) {
            const maxAvg = summariesInPrevMonth.reduce((max, s) => {
              const val =
                typeof s.average_messages_per_conversation === 'number'
                  ? s.average_messages_per_conversation
                  : Number(s.average_messages_per_conversation || 0);
              return val > max ? val : max;
            }, -Infinity);

            const summaryAvg =
              typeof summary.average_messages_per_conversation === 'number'
                ? summary.average_messages_per_conversation
                : Number(summary.average_messages_per_conversation || 0);

            if (summaryAvg === maxAvg) {
              localStorage.setItem(
                'task7_prevMonthTopDayOpened',
                JSON.stringify({
                  dailySummaryId: dailySummaryId,
                  date: summary.date,
                  average_messages_per_conversation: summary.average_messages_per_conversation
                })
              );
            }
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const chatbot = summary.chatbot_id
      ? chatbots.find((c) => c.id === summary.chatbot_id) || null
      : null;

    const summaryWithChatbot = { ...summary, chatbot };

    // No detailed breakdown data is stored; return empty breakdowns
    return {
      summary: summaryWithChatbot,
      breakdown_by_chatbot: chatbot
        ? [
            {
              chatbot_id: chatbot.id,
              chatbot_name: chatbot.name,
              total_conversations: summary.total_conversations,
              total_messages: summary.total_messages,
              average_messages_per_conversation:
                summary.average_messages_per_conversation
            }
          ]
        : [],
      breakdown_by_hour: []
    };
  }

  // getTeamMembers()
  getTeamMembers() {
    return this._getFromStorage('team_members', []);
  }

  // inviteTeamMember(name, email, role)
  inviteTeamMember(name, email, role) {
    const allowedRoles = ['admin', 'editor', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return {
        success: false,
        member: null,
        error_message: 'Invalid role.'
      };
    }

    const members = this._getFromStorage('team_members', []);
    const now = this._nowISO();
    const member = {
      id: this._generateId('member'),
      name,
      email,
      role,
      status: 'pending',
      invited_at: now
    };

    members.push(member);
    this._saveToStorage('team_members', members);

    return {
      success: true,
      member
    };
  }

  // updateTeamMemberRole(teamMemberId, role)
  updateTeamMemberRole(teamMemberId, role) {
    const allowedRoles = ['admin', 'editor', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return {
        success: false,
        member: null,
        error_message: 'Invalid role.'
      };
    }

    const members = this._getFromStorage('team_members', []);
    const index = members.findIndex((m) => m.id === teamMemberId);

    if (index === -1) {
      return {
        success: false,
        member: null,
        error_message: 'Team member not found.'
      };
    }

    const updatedMember = { ...members[index], role };
    members[index] = updatedMember;
    this._saveToStorage('team_members', members);

    return {
      success: true,
      member: updatedMember
    };
  }

  // deactivateTeamMember(teamMemberId)
  deactivateTeamMember(teamMemberId) {
    const members = this._getFromStorage('team_members', []);
    const index = members.findIndex((m) => m.id === teamMemberId);

    if (index === -1) {
      return {
        success: false,
        error_message: 'Team member not found.'
      };
    }

    members[index] = {
      ...members[index],
      status: 'deactivated'
    };
    this._saveToStorage('team_members', members);

    return {
      success: true
    };
  }

  // getHelpCenterCategories()
  getHelpCenterCategories() {
    return this._getFromStorage('help_center_categories', []);
  }

  // searchHelpCenterArticles(query, categorySlug, page)
  searchHelpCenterArticles(query, categorySlug, page) {
    const articles = this._getFromStorage('help_center_articles', []);
    const q = query ? String(query).toLowerCase() : null;
    const slug = categorySlug || null;
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = 10;

    let filtered = articles;

    if (slug) {
      filtered = filtered.filter((a) => a.category_slug === slug);
    }

    if (q) {
      filtered = filtered.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        return title.includes(q) || content.includes(q);
      });
    }

    const total = filtered.length;
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = filtered.slice(startIndex, endIndex);

    const results = pageItems.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      category_name: a.category_name || '',
      excerpt: a.excerpt || ''
    }));

    return {
      results,
      total,
      page: pageNum,
      page_size: pageSize
    };
  }

  // submitContactRequest(name, email, topic, message, requestType)
  submitContactRequest(name, email, topic, message, requestType) {
    const allowedTypes = ['sales', 'support', 'other'];
    const type = allowedTypes.includes(requestType) ? requestType : 'other';

    const requests = this._getFromStorage('contact_requests', []);
    const id = this._generateId('ticket');
    const now = this._nowISO();

    const request = {
      id,
      name,
      email,
      topic: topic || '',
      message,
      request_type: type,
      created_at: now
    };

    requests.push(request);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      confirmation_message: 'Your request has been submitted successfully.',
      ticket_id: id
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