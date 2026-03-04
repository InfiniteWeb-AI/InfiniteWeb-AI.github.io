const localStorage = (function () { try { if (typeof globalThis !== 'undefined' && globalThis.localStorage) { return globalThis.localStorage; } } catch (e) {} var store = {}; return { getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; }, setItem: function (key, value) { store[key] = String(value); }, removeItem: function (key) { delete store[key]; }, clear: function () { store = {}; }, key: function (index) { return Object.keys(store)[index] || null; }, get length() { return Object.keys(store).length; } }; })();

class BusinessLogic {
  constructor() {
    this._initStorage();
  }

  // =========================
  // Storage helpers
  // =========================
  _initStorage() {
    const entityKeys = [
      'sales_contact_submissions',
      'demo_requests',
      'newsletter_subscriptions',
      'pricing_plans',
      'plan_quote_requests',
      'resources',
      'resource_download_leads',
      'partnership_inquiries',
      'support_requests',
      'chat_leads',
      'contact_quote_requests'
    ];

    for (let i = 0; i < entityKeys.length; i++) {
      const key = entityKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentRaw = localStorage.getItem('idCounter');
    const current = parseInt(currentRaw || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // plans: array of PricingPlan objects, maxPrice: number
  _findCheapestPlanUnderPrice(plans, maxPrice) {
    if (!Array.isArray(plans) || typeof maxPrice !== 'number') {
      return null;
    }
    let cheapest = null;
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      if (!plan || plan.isActive !== true) continue;
      if (typeof plan.monthlyPrice !== 'number') continue;
      if (plan.monthlyPrice >= maxPrice) continue;
      if (!cheapest || plan.monthlyPrice < cheapest.monthlyPrice) {
        cheapest = plan;
      }
    }
    return cheapest;
  }

  // targetWeekdayIndex: 0 (Sunday) - 6 (Saturday) or weekday name string (e.g. "wednesday")
  _findNextWeekdayDate(targetWeekdayIndex) {
    let weekdayIndex = targetWeekdayIndex;

    // Support string weekday names in addition to numeric indexes
    if (typeof weekdayIndex === 'string') {
      const normalized = weekdayIndex.trim().toLowerCase();
      const map = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };
      weekdayIndex = map[normalized];
    }

    if (typeof weekdayIndex !== 'number' || isNaN(weekdayIndex) || weekdayIndex < 0 || weekdayIndex > 6) {
      // Invalid input; let caller fall back to their own helper
      return null;
    }

    const today = new Date();
    const todayIndex = today.getUTCDay ? today.getUTCDay() : today.getDay();
    let diff = (weekdayIndex - todayIndex + 7) % 7;
    if (diff === 0) {
      diff = 7; // next week
    }
    const next = new Date(today.getTime());
    if (next.setUTCDate && today.getUTCDate) {
      next.setUTCDate(today.getUTCDate() + diff);
    } else {
      next.setDate(today.getDate() + diff);
    }

    // Return YYYY-MM-DD string for compatibility with tests
    const year = next.getUTCFullYear();
    const month = String(next.getUTCMonth() + 1).padStart(2, '0');
    const day = String(next.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // =========================
  // Interface implementations
  // =========================

  // getHomePageOverview
  getHomePageOverview() {
    return {
      heroTitle: 'Turn your go-to-market data into revenue insights',
      heroSubtitle: 'Connect your CRM, marketing, and revenue data to see what drives pipeline and closed-won deals.',
      primaryCta: {
        label: 'Contact Sales',
        actionKey: 'contact_sales_tab'
      },
      secondaryCtas: [
        { label: 'Book a Demo', actionKey: 'book_demo' },
        { label: 'View Pricing', actionKey: 'view_pricing' },
        { label: 'Browse Resources', actionKey: 'browse_resources' },
        { label: 'Partnerships', actionKey: 'view_partnerships' },
        { label: 'Contact', actionKey: 'contact' }
      ]
    };
  }

  // getHomePageQuickEntryPoints
  getHomePageQuickEntryPoints() {
    return [
      {
        actionKey: 'contact_sales_tab',
        label: 'Talk to Sales',
        description: 'Share your goals and see how we can help your team.'
      },
      {
        actionKey: 'book_demo',
        label: 'Book a Demo',
        description: 'Schedule a live walkthrough tailored to your use cases.'
      },
      {
        actionKey: 'view_pricing',
        label: 'Pricing',
        description: 'Compare plans and estimate your subscription cost.'
      },
      {
        actionKey: 'browse_resources',
        label: 'Resources Library',
        description: 'Whitepapers, benchmarks, and best practices.'
      },
      {
        actionKey: 'view_partnerships',
        label: 'Partnerships',
        description: 'Explore reseller and technology partnership options.'
      },
      {
        actionKey: 'contact',
        label: 'Contact',
        description: 'Reach sales, support, or request a quote from one place.'
      }
    ];
  }

  // getChatWidgetConfig
  getChatWidgetConfig() {
    return {
      welcomeMessage: 'Hi there! How can our team help you today?',
      topics: [
        { value: 'sales', label: 'Sales' },
        { value: 'support', label: 'Support' },
        { value: 'billing', label: 'Billing' },
        { value: 'general', label: 'General Question' }
      ],
      followupPreferences: [
        { value: 'connect_now', label: 'Connect me with someone now' },
        { value: 'connect_later', label: 'Have a rep contact me later' },
        { value: 'no_followup', label: 'No follow-up needed' }
      ]
    };
  }

  // submitChatLead(topic, name, email, summary, followupPreference)
  submitChatLead(topic, name, email, summary, followupPreference) {
    try {
      const chatLeads = this._getFromStorage('chat_leads', []);
      const id = this._generateId('chatlead');
      const lead = {
        id: id,
        topic: topic,
        name: name,
        email: email,
        summary: summary,
        followupPreference: followupPreference,
        status: 'open',
        createdAt: this._getCurrentTimestamp()
      };
      chatLeads.push(lead);
      this._saveToStorage('chat_leads', chatLeads);
      return {
        success: true,
        chatLeadId: id,
        status: lead.status,
        message: 'Chat lead created successfully.'
      };
    } catch (e) {
      return {
        success: false,
        chatLeadId: null,
        status: 'open',
        message: 'Failed to create chat lead: ' + e.message
      };
    }
  }

  // getNewsletterSubscriptionOptions
  getNewsletterSubscriptionOptions() {
    return {
      introText: 'Stay in the loop with product news, case studies, and best practices.',
      interestOptions: [
        { value: 'product_updates', label: 'Product Updates' },
        { value: 'case_studies', label: 'Case Studies' },
        { value: 'webinars', label: 'Webinars' },
        { value: 'blog_articles', label: 'Blog Articles' },
        { value: 'events', label: 'Events' }
      ],
      emailFrequencyOptions: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' }
      ],
      supportsB2BFlag: true,
      defaultFrequency: 'weekly'
    };
  }

  // submitNewsletterSubscription(emailAddress, firstName, interests, emailFrequency, isB2BCompany)
  submitNewsletterSubscription(emailAddress, firstName, interests, emailFrequency, isB2BCompany) {
    try {
      const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
      const id = this._generateId('newsletter');
      const record = {
        id: id,
        emailAddress: emailAddress,
        firstName: typeof firstName === 'string' && firstName.length ? firstName : null,
        interests: Array.isArray(interests) ? interests.slice() : [],
        emailFrequency: emailFrequency,
        isB2BCompany: typeof isB2BCompany === 'boolean' ? isB2BCompany : null,
        createdAt: this._getCurrentTimestamp()
      };
      subscriptions.push(record);
      this._saveToStorage('newsletter_subscriptions', subscriptions);
      return {
        success: true,
        subscriptionId: id,
        message: 'Newsletter subscription saved successfully.'
      };
    } catch (e) {
      return {
        success: false,
        subscriptionId: null,
        message: 'Failed to save newsletter subscription: ' + e.message
      };
    }
  }

  // getContactSalesFormOptions
  getContactSalesFormOptions() {
    return {
      title: 'Contact Sales',
      description: 'Share a bit about your team and goals, and we will follow up with tailored recommendations.',
      companySizeOptions: [
        { value: '1_10_employees', label: '1-10 employees' },
        { value: '11_50_employees', label: '11-50 employees' },
        { value: '51_200_employees', label: '51-200 employees' },
        { value: '201_500_employees', label: '201-500 employees' },
        { value: '501_1000_employees', label: '501-1,000 employees' },
        { value: '1000_plus_employees', label: '1,000+ employees' }
      ],
      projectTimelineOptions: [
        { value: 'less_than_1_month', label: 'Less than 1 month' },
        { value: '1_3_months', label: '1-3 months' },
        { value: '3_6_months', label: '3-6 months' },
        { value: 'more_than_6_months', label: 'More than 6 months' },
        { value: 'not_sure', label: 'Not sure yet' }
      ],
      budgetFieldConfig: {
        currency: 'USD',
        min: 0,
        step: 100,
        placeholder: 'e.g. 8000'
      }
    };
  }

  // submitSalesContactInquiry(fullName, workEmail, companyName, companySize, estimatedMonthlyBudget, projectTimeline, message)
  submitSalesContactInquiry(fullName, workEmail, companyName, companySize, estimatedMonthlyBudget, projectTimeline, message) {
    try {
      const submissions = this._getFromStorage('sales_contact_submissions', []);
      const id = this._generateId('salescontact');
      const record = {
        id: id,
        fullName: fullName,
        workEmail: workEmail,
        companyName: companyName,
        companySize: companySize,
        estimatedMonthlyBudget: typeof estimatedMonthlyBudget === 'number' ? estimatedMonthlyBudget : Number(estimatedMonthlyBudget),
        projectTimeline: projectTimeline,
        message: message,
        contactTab: 'sales',
        createdAt: this._getCurrentTimestamp()
      };
      submissions.push(record);
      this._saveToStorage('sales_contact_submissions', submissions);
      return {
        success: true,
        salesContactSubmissionId: id,
        message: 'Sales contact inquiry submitted successfully.'
      };
    } catch (e) {
      return {
        success: false,
        salesContactSubmissionId: null,
        message: 'Failed to submit sales contact inquiry: ' + e.message
      };
    }
  }

  // getSupportFormOptions
  getSupportFormOptions() {
    return {
      title: 'Contact Support',
      description: 'Existing customers can reach our support team for billing, technical, and account questions.',
      issueTypeOptions: [
        { value: 'billing', label: 'Billing' },
        { value: 'technical', label: 'Technical issue' },
        { value: 'account_access', label: 'Account access' },
        { value: 'feature_request', label: 'Feature request' },
        { value: 'other', label: 'Other' }
      ],
      urgencyOptions: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High (urgent)' }
      ],
      preferredContactMethodOptions: [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' },
        { value: 'chat', label: 'Chat' },
        { value: 'none', label: 'No follow-up needed' }
      ]
    };
  }

  // submitSupportRequest(isExistingCustomer, accountId, issueType, email, urgency, description, preferredContactMethod)
  submitSupportRequest(isExistingCustomer, accountId, issueType, email, urgency, description, preferredContactMethod) {
    try {
      const requests = this._getFromStorage('support_requests', []);
      const id = this._generateId('support');
      const record = {
        id: id,
        contactTab: 'support',
        isExistingCustomer: !!isExistingCustomer,
        accountId: accountId,
        issueType: issueType,
        email: email,
        urgency: urgency,
        description: description,
        preferredContactMethod: preferredContactMethod,
        createdAt: this._getCurrentTimestamp()
      };
      requests.push(record);
      this._saveToStorage('support_requests', requests);
      return {
        success: true,
        supportRequestId: id,
        message: 'Support request submitted successfully.'
      };
    } catch (e) {
      return {
        success: false,
        supportRequestId: null,
        message: 'Failed to submit support request: ' + e.message
      };
    }
  }

  // getContactQuoteFormOptions
  getContactQuoteFormOptions() {
    return {
      title: 'Request a Quote',
      description: 'Tell us about your team and implementation timeline so we can prepare a tailored quote.',
      implementationTimelineOptions: [
        { value: 'within_30_days', label: 'Within 30 days' },
        { value: 'within_3_months', label: 'Within 3 months' },
        { value: 'within_6_months', label: 'Within 6 months' },
        { value: 'more_than_6_months', label: 'More than 6 months' },
        { value: 'not_sure', label: 'Not sure yet' }
      ],
      primaryUseCaseOptions: [
        { value: 'sales_analytics', label: 'Sales analytics' },
        { value: 'marketing_analytics', label: 'Marketing analytics' },
        { value: 'customer_success', label: 'Customer success' },
        { value: 'product_analytics', label: 'Product analytics' },
        { value: 'reporting_dashboarding', label: 'Reporting & dashboarding' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  // submitContactQuoteRequest(fullName, businessEmail, numberOfUsers, implementationTimeline, primaryUseCase, additionalDetails)
  submitContactQuoteRequest(fullName, businessEmail, numberOfUsers, implementationTimeline, primaryUseCase, additionalDetails) {
    try {
      const requests = this._getFromStorage('contact_quote_requests', []);
      const id = this._generateId('contactquote');
      const record = {
        id: id,
        contactTab: 'request_quote',
        fullName: fullName,
        businessEmail: businessEmail,
        numberOfUsers: typeof numberOfUsers === 'number' ? numberOfUsers : Number(numberOfUsers),
        implementationTimeline: implementationTimeline,
        primaryUseCase: primaryUseCase,
        additionalDetails: additionalDetails,
        createdAt: this._getCurrentTimestamp()
      };
      requests.push(record);
      this._saveToStorage('contact_quote_requests', requests);
      return {
        success: true,
        contactQuoteRequestId: id,
        message: 'Quote request submitted successfully.'
      };
    } catch (e) {
      return {
        success: false,
        contactQuoteRequestId: null,
        message: 'Failed to submit quote request: ' + e.message
      };
    }
  }

  // getDemoRequestFormOptions
  getDemoRequestFormOptions() {
    return {
      title: 'Book a Product Demo',
      description: 'Pick a date and time that works for you, and tell us what you would like to see.',
      companySizeOptions: [
        { value: '1_10_employees', label: '1-10 employees' },
        { value: '11_50_employees', label: '11-50 employees' },
        { value: '51_200_employees', label: '51-200 employees' },
        { value: '201_500_employees', label: '201-500 employees' },
        { value: '501_1000_employees', label: '501-1,000 employees' },
        { value: '1000_plus_employees', label: '1,000+ employees' }
      ],
      preferredTimeSlotOptions: [
        { value: '09_00_am', label: '09:00 AM' },
        { value: '09_30_am', label: '09:30 AM' },
        { value: '10_00_am', label: '10:00 AM' },
        { value: '10_30_am', label: '10:30 AM' },
        { value: '11_00_am', label: '11:00 AM' },
        { value: '11_30_am', label: '11:30 AM' },
        { value: '12_00_pm', label: '12:00 PM' },
        { value: '01_00_pm', label: '01:00 PM' },
        { value: '02_00_pm', label: '02:00 PM' },
        { value: '03_00_pm', label: '03:00 PM' },
        { value: '04_00_pm', label: '04:00 PM' }
      ],
      departmentOptions: [
        { value: 'marketing', label: 'Marketing' },
        { value: 'sales', label: 'Sales' },
        { value: 'it', label: 'IT' },
        { value: 'operations', label: 'Operations' },
        { value: 'finance', label: 'Finance' },
        { value: 'customer_support', label: 'Customer Support' },
        { value: 'other', label: 'Other' }
      ],
      productUpdatesOptInLabel: 'Keep me informed about product updates.'
    };
  }

  // submitDemoRequest(fullName, workEmail, companySize, preferredDemoDate, preferredTimeSlot, department, demoFocusMessage, optInProductUpdates)
  submitDemoRequest(fullName, workEmail, companySize, preferredDemoDate, preferredTimeSlot, department, demoFocusMessage, optInProductUpdates) {
    try {
      const requests = this._getFromStorage('demo_requests', []);
      const id = this._generateId('demo');
      let preferredDateIso;
      try {
        const d = new Date(preferredDemoDate);
        preferredDateIso = isNaN(d.getTime()) ? preferredDemoDate : d.toISOString();
      } catch (e) {
        preferredDateIso = preferredDemoDate;
      }
      const record = {
        id: id,
        fullName: fullName,
        workEmail: workEmail,
        companySize: companySize,
        preferredDemoDate: preferredDateIso,
        preferredTimeSlot: preferredTimeSlot,
        department: department,
        demoFocusMessage: demoFocusMessage,
        optInProductUpdates: !!optInProductUpdates,
        createdAt: this._getCurrentTimestamp()
      };
      requests.push(record);
      this._saveToStorage('demo_requests', requests);
      return {
        success: true,
        demoRequestId: id,
        message: 'Demo request submitted successfully.'
      };
    } catch (e) {
      return {
        success: false,
        demoRequestId: null,
        message: 'Failed to submit demo request: ' + e.message
      };
    }
  }

  // getPricingPageOverview
  getPricingPageOverview() {
    return {
      title: 'Pricing',
      description: 'Choose the plan that matches your team size and analytics needs. Switch between monthly and annual billing at any time.',
      billingToggleOptions: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly (save with an annual plan)' }
      ],
      defaultBillingInterval: 'monthly'
    };
  }

  // getActivePricingPlans(billingInterval)
  getActivePricingPlans(billingInterval) {
    const allPlans = this._getFromStorage('pricing_plans', []);
    let plans = [];
    for (let i = 0; i < allPlans.length; i++) {
      const p = allPlans[i];
      if (!p || p.isActive !== true) continue;
      if (billingInterval === 'yearly') {
        if (typeof p.yearlyPrice === 'number') {
          plans.push(p);
        }
      } else {
        // default to monthly
        if (typeof p.monthlyPrice === 'number') {
          plans.push(p);
        }
      }
    }
    return {
      billingInterval: billingInterval,
      plans: plans
    };
  }

  // getPricingPlanDetails(planId)
  getPricingPlanDetails(planId) {
    const allPlans = this._getFromStorage('pricing_plans', []);
    const plan = allPlans.find(function (p) { return p && p.id === planId; }) || null;
    const details = plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description || '',
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          isMostPopular: !!plan.isMostPopular,
          features: Array.isArray(plan.features) ? plan.features.slice() : []
        }
      : null;
    return {
      plan: details,
      // Keep recommendedUseCases simple and generic; this does not pull extra entities
      recommendedUseCases: []
    };
  }

  // getPlanQuoteFormOptions
  getPlanQuoteFormOptions() {
    const allPlans = this._getFromStorage('pricing_plans', []);
    const planOptions = [];
    for (let i = 0; i < allPlans.length; i++) {
      const p = allPlans[i];
      if (!p || p.isActive !== true) continue;
      planOptions.push({
        id: p.id,
        name: p.name,
        monthlyPrice: p.monthlyPrice,
        isActive: !!p.isActive
      });
    }
    return {
      title: 'Request a custom quote',
      description: 'Tell us which plan you are interested in and share a bit about your needs.',
      planOptions: planOptions
    };
  }

  // submitPlanQuoteRequest(fullName, workEmail, planId, message, sourcePage)
  submitPlanQuoteRequest(fullName, workEmail, planId, message, sourcePage) {
    try {
      const allPlans = this._getFromStorage('pricing_plans', []);
      const plan = allPlans.find(function (p) { return p && p.id === planId; }) || null;
      const planNameSnapshot = plan ? plan.name : '';
      const requests = this._getFromStorage('plan_quote_requests', []);
      const id = this._generateId('planquote');
      const record = {
        id: id,
        fullName: fullName,
        workEmail: workEmail,
        planId: planId,
        planNameSnapshot: planNameSnapshot,
        message: message,
        sourcePage: typeof sourcePage === 'string' && sourcePage.length ? sourcePage : 'pricing',
        createdAt: this._getCurrentTimestamp()
      };
      requests.push(record);
      this._saveToStorage('plan_quote_requests', requests);
      return {
        success: true,
        planQuoteRequestId: id,
        planNameSnapshot: planNameSnapshot,
        message: 'Plan quote request submitted successfully.'
      };
    } catch (e) {
      return {
        success: false,
        planQuoteRequestId: null,
        planNameSnapshot: '',
        message: 'Failed to submit plan quote request: ' + e.message
      };
    }
  }

  // getResourcesList(filters)
  getResourcesList(filters) {
    const resources = this._getFromStorage('resources', []);
    if (!filters || typeof filters !== 'object') {
      return { resources: resources };
    }
    const contentType = filters.contentType || null;
    const searchQuery = filters.searchQuery || null;
    const primaryTopic = filters.primaryTopic || null;
    const qLower = searchQuery && typeof searchQuery === 'string' ? searchQuery.toLowerCase() : null;
    const result = [];
    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      if (!r) continue;
      if (contentType && r.contentType !== contentType) continue;
      if (primaryTopic && r.primaryTopic !== primaryTopic) continue;
      if (qLower) {
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        if (title.indexOf(qLower) === -1 && desc.indexOf(qLower) === -1) {
          continue;
        }
      }
      result.push(r);
    }
    return { resources: result };
  }

  // getResourceFilters
  getResourceFilters() {
    const contentTypeOptions = [
      { value: 'whitepaper', label: 'Whitepapers' },
      { value: 'report', label: 'Reports' },
      { value: 'ebook', label: 'eBooks' },
      { value: 'case_study', label: 'Case Studies' },
      { value: 'webinar', label: 'Webinars' },
      { value: 'blog_post', label: 'Blog Posts' }
    ];
    const resources = this._getFromStorage('resources', []);
    const topicSet = {};
    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      if (!r || !r.primaryTopic) continue;
      const value = String(r.primaryTopic);
      if (!topicSet[value]) {
        topicSet[value] = true;
      }
    }
    const topicOptions = [];
    const topicValues = Object.keys(topicSet);
    for (let j = 0; j < topicValues.length; j++) {
      const v = topicValues[j];
      topicOptions.push({ value: v, label: v });
    }
    return {
      contentTypeOptions: contentTypeOptions,
      topicOptions: topicOptions
    };
  }

  // getResourceDetail(resourceId)
  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const res = resources.find(function (r) { return r && r.id === resourceId; }) || null;
    const resource = res
      ? {
          id: res.id,
          title: res.title,
          description: res.description || '',
          contentType: res.contentType,
          isGated: !!res.isGated,
          primaryTopic: res.primaryTopic || null
        }
      : null;
    return {
      resource: resource,
      valueHighlights: [],
      downloadCtaLabel: 'Download'
    };
  }

  // getResourceDownloadLeadFormOptions
  getResourceDownloadLeadFormOptions() {
    return {
      industryOptions: [
        { value: 'saas', label: 'SaaS' },
        { value: 'ecommerce', label: 'E-commerce' },
        { value: 'financial_services', label: 'Financial Services' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'education', label: 'Education' },
        { value: 'other', label: 'Other' }
      ],
      companySizeOptions: [
        { value: '1_10_employees', label: '1-10 employees' },
        { value: '11_50_employees', label: '11-50 employees' },
        { value: '51_200_employees', label: '51-200 employees' },
        { value: '201_500_employees', label: '201-500 employees' },
        { value: '501_1000_employees', label: '501-1,000 employees' },
        { value: '1000_plus_employees', label: '1,000+ employees' }
      ],
      implementationTimelineOptions: [
        { value: 'within_30_days', label: 'Within 30 days' },
        { value: 'within_3_months', label: 'Within 3 months' },
        { value: 'within_6_months', label: 'Within 6 months' },
        { value: 'more_than_6_months', label: 'More than 6 months' },
        { value: 'not_sure', label: 'Not sure yet' }
      ],
      optInRelatedResearchLabel: 'Send me related research.'
    };
  }

  // submitResourceDownloadLead(resourceId, fullName, workEmail, industry, companySize, implementationTimeline, optInRelatedResearch)
  submitResourceDownloadLead(resourceId, fullName, workEmail, industry, companySize, implementationTimeline, optInRelatedResearch) {
    try {
      const resources = this._getFromStorage('resources', []);
      const res = resources.find(function (r) { return r && r.id === resourceId; }) || null;
      const leads = this._getFromStorage('resource_download_leads', []);
      const id = this._generateId('resdownload');
      const record = {
        id: id,
        resourceId: resourceId,
        fullName: fullName,
        workEmail: workEmail,
        industry: industry,
        companySize: companySize,
        implementationTimeline: implementationTimeline,
        optInRelatedResearch: typeof optInRelatedResearch === 'boolean' ? optInRelatedResearch : null,
        createdAt: this._getCurrentTimestamp()
      };
      leads.push(record);
      this._saveToStorage('resource_download_leads', leads);
      return {
        success: true,
        resourceDownloadLeadId: id,
        resourceTitle: res ? res.title : null,
        downloadUrl: res ? res.downloadUrl : null,
        message: 'Resource download lead submitted successfully.'
      };
    } catch (e) {
      return {
        success: false,
        resourceDownloadLeadId: null,
        resourceTitle: null,
        downloadUrl: null,
        message: 'Failed to submit resource download lead: ' + e.message
      };
    }
  }

  // getPartnershipProgramContent
  getPartnershipProgramContent() {
    return {
      headline: 'Partner with us to bring better revenue intelligence to your customers',
      subheadline: 'Join our global ecosystem of resellers, technology partners, and strategic alliances.',
      partnershipTypes: [
        {
          value: 'reseller',
          label: 'Reseller',
          description: 'Resell our platform as part of your solutions portfolio.'
        },
        {
          value: 'referral',
          label: 'Referral',
          description: 'Refer qualified opportunities and earn referral fees.'
        },
        {
          value: 'technology',
          label: 'Technology',
          description: 'Integrate our product into your technology stack.'
        },
        {
          value: 'strategic',
          label: 'Strategic',
          description: 'Co-develop go-to-market motions with our team.'
        }
      ],
      benefitHighlights: [
        'Co-marketing and joint go-to-market programs',
        'Dedicated partner enablement and training',
        'Attractive margins and co-selling opportunities'
      ],
      ctaLabel: 'Become a Partner'
    };
  }

  // getPartnershipFormOptions
  getPartnershipFormOptions() {
    return {
      partnershipTypeOptions: [
        { value: 'reseller', label: 'Reseller' },
        { value: 'referral', label: 'Referral' },
        { value: 'technology', label: 'Technology' },
        { value: 'strategic', label: 'Strategic' }
      ],
      projectedAnnualRevenueRangeOptions: [
        { value: 'lt_100k', label: 'Less than $100,000' },
        { value: 'range_100k_250k', label: '$100,000–$250,000' },
        { value: 'range_250k_500k', label: '$250,000–$500,000' },
        { value: 'range_500k_1m', label: '$500,000–$1M' },
        { value: 'gt_1m', label: 'More than $1M' }
      ],
      regionOptions: [
        { value: 'north_america', label: 'North America' },
        { value: 'europe', label: 'Europe' },
        { value: 'asia_pacific', label: 'Asia-Pacific' },
        { value: 'latin_america', label: 'Latin America' },
        { value: 'middle_east_africa', label: 'Middle East & Africa' },
        { value: 'global', label: 'Global' }
      ]
    };
  }

  // submitPartnershipInquiry(fullName, businessEmail, partnershipType, projectedAnnualRevenueRange, region, businessDescription)
  submitPartnershipInquiry(fullName, businessEmail, partnershipType, projectedAnnualRevenueRange, region, businessDescription) {
    try {
      const inquiries = this._getFromStorage('partnership_inquiries', []);
      const id = this._generateId('partner');
      const record = {
        id: id,
        fullName: fullName,
        businessEmail: businessEmail,
        partnershipType: partnershipType,
        projectedAnnualRevenueRange: projectedAnnualRevenueRange,
        region: region,
        businessDescription: businessDescription,
        createdAt: this._getCurrentTimestamp()
      };
      inquiries.push(record);
      this._saveToStorage('partnership_inquiries', inquiries);
      return {
        success: true,
        partnershipInquiryId: id,
        message: 'Partnership inquiry submitted successfully.'
      };
    } catch (e) {
      return {
        success: false,
        partnershipInquiryId: null,
        message: 'Failed to submit partnership inquiry: ' + e.message
      };
    }
  }

  // getContactPageTabs
  getContactPageTabs() {
    return [
      {
        tabKey: 'sales',
        label: 'Contact Sales',
        description: 'Talk to our sales team about pricing, packages, and implementation.',
        isDefault: true
      },
      {
        tabKey: 'support',
        label: 'Support',
        description: 'Get help with billing, technical questions, and account access.',
        isDefault: false
      },
      {
        tabKey: 'request_quote',
        label: 'Request a Quote',
        description: 'Share your requirements and get a detailed quote.',
        isDefault: false
      }
    ];
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      missionStatement: 'We help revenue teams turn fragmented customer data into clear, actionable insights.',
      companyBackground: 'Founded by data and go-to-market leaders, our platform is built to give sales, marketing, and customer success teams a single, trusted view of their funnel.',
      leadershipTeam: [
        {
          name: 'Alex Carter',
          title: 'Chief Executive Officer',
          bio: 'Alex has led high-growth SaaS companies for over a decade, focusing on revenue operations and analytics.'
        },
        {
          name: 'Jordan Kim',
          title: 'Chief Product Officer',
          bio: 'Jordan builds products that make complex data easy to explore for non-technical teams.'
        }
      ],
      customerLogos: [
        { name: 'Acme Corp', logoAltText: 'Acme Corp logo' },
        { name: 'Globex', logoAltText: 'Globex logo' }
      ],
      testimonials: [
        {
          quote: 'We finally have one source of truth for our pipeline and revenue metrics.',
          customerName: 'Taylor Morgan',
          customerTitle: 'VP of Revenue Operations',
          company: 'Northbridge Analytics'
        }
      ],
      conversionCtas: [
        { actionKey: 'contact_sales_tab', label: 'Talk to Sales' },
        { actionKey: 'book_demo', label: 'Book a Demo' },
        { actionKey: 'view_pricing', label: 'View Pricing' },
        { actionKey: 'view_partnerships', label: 'Partner with Us' }
      ]
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          heading: 'Overview',
          body: 'This Privacy Policy explains how we collect, use, and protect information submitted through our website, including contact forms, demo requests, newsletter subscriptions, resource downloads, partnership inquiries, support requests, and chat conversations.'
        },
        {
          heading: 'Information We Collect',
          body: 'When you submit a form or use the chat widget, we may collect your name, contact details, company information, usage details (such as number of users and budget), and message content. This information is stored securely and is used only for the purposes described in this policy.'
        },
        {
          heading: 'How We Use Your Information',
          body: 'We use your information to respond to inquiries, provide demos and quotes, deliver requested resources, manage partnerships, offer customer support, and send relevant communications where you have opted in.'
        },
        {
          heading: 'Data Retention',
          body: 'We retain lead and support records for as long as reasonably necessary to fulfill the purposes outlined here, comply with legal obligations, and maintain accurate business records.'
        },
        {
          heading: 'Your Choices',
          body: 'You may opt out of marketing communications at any time by using the unsubscribe links in our emails or by contacting us directly. You may also request access, correction, or deletion of your personal information, subject to applicable law.'
        }
      ],
      optInExplanations: [
        {
          context: 'product_updates_opt_in',
          description: 'If you tick the box to keep me informed about product updates on forms such as the demo request, we will send you occasional emails about new features, enhancements, and related announcements. You can unsubscribe at any time.'
        },
        {
          context: 'related_research_opt_in',
          description: 'If you opt in to receive related research on resource download forms, we may send you additional content such as benchmark studies, trends reports, and guides that are similar to the asset you downloaded.'
        }
      ]
    };
  }

  // getTermsOfUseContent
  getTermsOfUseContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          heading: 'Acceptance of Terms',
          body: 'By accessing or using this website, including submitting forms, requesting demos, or downloading resources, you agree to be bound by these Terms of Use.'
        },
        {
          heading: 'Use of Website and Content',
          body: 'You may use the website and its content for lawful business purposes only. You may not misuse forms, attempt to interfere with the website operation, or use automated means to access or submit information.'
        },
        {
          heading: 'Demos, Quotes, and Resource Downloads',
          body: 'Requests for demos, quotes, and resource downloads do not create any obligation for you to purchase our services, nor do they guarantee availability or specific outcomes. We reserve the right to decline or limit requests at our discretion.'
        },
        {
          heading: 'Intellectual Property',
          body: 'All content on this website, including whitepapers, reports, and other resources, is protected by intellectual property laws. Unless expressly permitted, you may not reproduce, distribute, or create derivative works based on this content.'
        },
        {
          heading: 'Changes to Terms',
          body: 'We may update these Terms of Use from time to time. Your continued use of the website after changes are posted constitutes acceptance of the updated terms.'
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