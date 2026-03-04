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
    // Initialize localStorage with default data structures (empty only, no mock rows)
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist, as empty arrays
    const tables = [
      'website_pages',
      'navigation_links',
      'help_topic_panels',
      'contact_method_options',
      'issue_category_configs',
      'addresses',
      'orders',
      'invoices',
      'onboarding_availability_slots',
      'onboarding_appointments',
      'support_tickets',
      // FAQ-related storage used by FAQ interfaces
      'faq_categories',
      'faq_articles'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Global ID counter
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

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ------------------------
  // Private helper functions
  // ------------------------

  // Determine default IssueCategoryConfig when none explicitly selected
  _getDefaultIssueCategoryConfig() {
    const configs = this._getFromStorage('issue_category_configs');
    if (!configs.length) return null;

    // Prefer billing_payments if available, otherwise the first config
    const preferredId = 'billing_payments';
    const preferred = configs.find((c) => c.id === preferredId);
    return preferred || configs[0];
  }

  // Select fastest ContactMethodOption by estimated_response_time_hours
  _selectFastestContactMethodOption() {
    const methods = this._getFromStorage('contact_method_options');
    if (!methods.length) return null;

    let fastest = methods[0];
    for (let i = 1; i < methods.length; i++) {
      const m = methods[i];
      if (m.estimated_response_time_hours < fastest.estimated_response_time_hours) {
        fastest = m;
      } else if (
        m.estimated_response_time_hours === fastest.estimated_response_time_hours &&
        m.is_default &&
        !fastest.is_default
      ) {
        // tie-breaker: prefer is_default=true
        fastest = m;
      }
    }
    return fastest;
  }

  // Hydrate Order with its Address (shipping_address_id -> shipping_address)
  _hydrateOrder(order) {
    if (!order) return null;
    const addresses = this._getFromStorage('addresses');
    const cloned = this._clone(order);
    if (cloned.shipping_address_id) {
      cloned.shipping_address =
        addresses.find((a) => a.id === cloned.shipping_address_id) || null;
    } else {
      cloned.shipping_address = null;
    }
    return cloned;
  }

  // Hydrate HelpTopicPanel with WebsitePage references
  _hydrateHelpTopicPanel(panel) {
    if (!panel) return null;
    const websitePages = this._getFromStorage('website_pages');
    const cloned = this._clone(panel);

    if (cloned.primary_button_target_page_id) {
      cloned.primary_button_target_page =
        websitePages.find((p) => p.id === cloned.primary_button_target_page_id) || null;
    } else {
      cloned.primary_button_target_page = null;
    }

    if (cloned.context_page_id) {
      cloned.context_page =
        websitePages.find((p) => p.id === cloned.context_page_id) || null;
    } else {
      cloned.context_page = null;
    }

    return cloned;
  }

  // Hydrate SupportTicket with related Order, Invoice, and original ticket
  _hydrateSupportTicket(ticket) {
    if (!ticket) return null;
    const orders = this._getFromStorage('orders');
    const invoices = this._getFromStorage('invoices');
    const tickets = this._getFromStorage('support_tickets');

    const cloned = this._clone(ticket);

    if (cloned.order_id) {
      const order = orders.find((o) => o.id === cloned.order_id) || null;
      cloned.order = this._hydrateOrder(order);
    } else {
      cloned.order = null;
    }

    if (cloned.related_invoice_id) {
      const invoice = invoices.find((inv) => inv.id === cloned.related_invoice_id) || null;
      if (invoice) {
        const invoiceClone = this._clone(invoice);
        const order = orders.find((o) => o.id === invoiceClone.order_id) || null;
        invoiceClone.order = this._hydrateOrder(order);
        cloned.related_invoice = invoiceClone;
      } else {
        cloned.related_invoice = null;
      }
    } else {
      cloned.related_invoice = null;
    }

    if (cloned.original_ticket_id) {
      const orig = tickets.find((t) => t.id === cloned.original_ticket_id) || null;
      cloned.original_ticket = orig ? this._clone(orig) : null;
    } else {
      cloned.original_ticket = null;
    }

    return cloned;
  }

  // Hydrate OnboardingAppointment with its slot
  _hydrateOnboardingAppointment(appointment) {
    if (!appointment) return null;
    const slots = this._getFromStorage('onboarding_availability_slots');
    const cloned = this._clone(appointment);
    if (cloned.slot_id) {
      cloned.slot = slots.find((s) => s.id === cloned.slot_id) || null;
    } else {
      cloned.slot = null;
    }
    return cloned;
  }

  // Get reason options based on issue category
  _getReasonOptions(issueCategory) {
    // Mapping from SupportTicket.reason enum values to human-readable labels
    const labels = {
      unspecified: 'Unspecified',
      billing_double_charge: 'Billing double charge',
      request_invoice_copy: 'Request invoice copy',
      delete_account_personal_data: 'Delete my account and personal data',
      shipping_address_change: 'Change shipping address',
      technical_issue_mobile_app: 'Technical issue – mobile app',
      technical_issue_web_app: 'Technical issue – web app',
      website_design_feedback: 'Website design feedback',
      existing_ticket_escalation: 'Escalate existing ticket',
      onboarding_call: 'Onboarding call request',
      other: 'Other'
    };

    const byCategory = {
      billing_payments: [
        'billing_double_charge',
        'request_invoice_copy',
        'other'
      ],
      orders_shipping: ['shipping_address_change', 'other'],
      account_privacy: ['delete_account_personal_data', 'other'],
      technical_support: [
        'technical_issue_mobile_app',
        'technical_issue_web_app',
        'other'
      ],
      feedback_suggestions: ['website_design_feedback', 'other'],
      bug_report: [
        'technical_issue_web_app',
        'technical_issue_mobile_app',
        'other'
      ],
      existing_request_followup_escalation: ['existing_ticket_escalation', 'other'],
      sales_onboarding: ['onboarding_call', 'other']
    };

    const reasonValues = byCategory[issueCategory] || ['other'];
    return reasonValues.map((value) => ({ value, label: labels[value] || value }));
  }

  // Create SupportTicket and, if applicable, an OnboardingAppointment
  _createSupportTicketAndAppointment(ticketData, onboardingSlotId, teamSize) {
    const supportTickets = this._getFromStorage('support_tickets');
    const onboardingAppointments = this._getFromStorage('onboarding_appointments');
    const slots = this._getFromStorage('onboarding_availability_slots');

    const nowIso = new Date().toISOString();

    const ticketId = this._generateId('ST');
    const ticket = {
      id: ticketId,
      subject: ticketData.subject,
      description: ticketData.description,
      issue_category: ticketData.issueCategory,
      reason: ticketData.reason || 'unspecified',
      priority: ticketData.priority,
      status: 'new',
      preferred_contact_method: ticketData.preferredContactMethod,
      contact_email: ticketData.contactEmail,
      contact_phone: ticketData.contactPhone || null,
      response_requested: ticketData.responseRequested,
      newsletter_opt_in: ticketData.newsletterOptIn,
      attach_previous_conversation: ticketData.attachPreviousConversation,
      share_diagnostic_logs: ticketData.shareDiagnosticLogs,
      order_id: ticketData.orderId || null,
      order_number: ticketData.orderNumber || null,
      original_ticket_id: ticketData.originalTicketId || null,
      account_type: ticketData.accountType || null,
      country: ticketData.country || null,
      platform: ticketData.platform || null,
      device_os: ticketData.deviceOs || null,
      device_os_version: ticketData.deviceOsVersion || null,
      browser: ticketData.browser || null,
      app_version: ticketData.appVersion || null,
      team_size: typeof ticketData.teamSize === 'number' ? ticketData.teamSize : null,
      preferred_date: ticketData.preferredDate
        ? new Date(ticketData.preferredDate).toISOString()
        : null,
      preferred_time: ticketData.preferredTime || null,
      time_zone: ticketData.timeZone || null,
      related_invoice_id: ticketData.relatedInvoiceId || null,
      created_at: nowIso,
      updated_at: nowIso,
      tags: Array.isArray(ticketData.tags) ? ticketData.tags : []
    };

    supportTickets.push(ticket);
    this._saveToStorage('support_tickets', supportTickets);

    let appointment = null;

    if (onboardingSlotId && ticket.issue_category === 'sales_onboarding') {
      const slotIndex = slots.findIndex((s) => s.id === onboardingSlotId);
      if (slotIndex !== -1) {
        const slot = slots[slotIndex];
        if (!slot.is_booked) {
          const appointmentId = this._generateId('OA');
          appointment = {
            id: appointmentId,
            support_ticket_id: ticket.id,
            slot_id: slot.id,
            team_size: typeof teamSize === 'number' ? teamSize : 0,
            status: 'scheduled',
            created_at: nowIso
          };
          onboardingAppointments.push(appointment);

          // Mark slot as booked
          slots[slotIndex] = Object.assign({}, slot, { is_booked: true });

          this._saveToStorage('onboarding_appointments', onboardingAppointments);
          this._saveToStorage('onboarding_availability_slots', slots);
        }
      }
    }

    return {
      ticket,
      appointment
    };
  }

  _parseDateOnly(dateStr) {
    // dateStr in 'YYYY-MM-DD'
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00Z');
  }

  // ------------------------
  // Core interface implementations
  // ------------------------

  // 1) getHomePageData()
  getHomePageData() {
    const websitePages = this._getFromStorage('website_pages');
    const helpTopicPanels = this._getFromStorage('help_topic_panels');

    const helpCenterPage = websitePages.find((p) => p.page_type === 'help_center') || null;

    // Build quick help topics from HelpTopicPanels (hierarchical relationship via context_page_id)
    let relevantPanels = helpTopicPanels;
    if (helpCenterPage) {
      relevantPanels = helpTopicPanels.filter(
        (p) => p.context_page_id === helpCenterPage.id
      );
    }

    const quickHelpTopics = relevantPanels.slice(0, 4).map((panel) => {
      const targetPage = websitePages.find(
        (p) => p.id === panel.primary_button_target_page_id
      );
      return {
        issueCategory: panel.issue_category,
        title: panel.title,
        description: panel.description || '',
        primaryButtonLabel: panel.primary_button_label,
        primaryButtonTargetPageType: targetPage
          ? targetPage.page_type
          : 'contact_support'
      };
    });

    return {
      heroTitle: 'We\'re here to help',
      heroSubtitle: 'Get fast answers to billing, technical, and account questions.',
      primaryCta: {
        label: 'Visit Help Center',
        targetPageType: 'help_center'
      },
      secondaryCtas: [
        {
          label: 'Contact Support',
          description: 'Reach our team for billing, technical, or account issues.',
          targetPageType: 'contact_support',
          targetIssueCategory: null
        },
        {
          label: 'Schedule Onboarding',
          description: 'Set up a live walkthrough for your team.',
          targetPageType: 'sales_onboarding',
          targetIssueCategory: 'sales_onboarding'
        }
      ],
      quickHelpTopics
    };
  }

  // 2) getHelpCenterPageData()
  getHelpCenterPageData() {
    const websitePages = this._getFromStorage('website_pages');
    const helpTopicPanelsRaw = this._getFromStorage('help_topic_panels');
    const faqArticles = this._getFromStorage('faq_articles');

    const helpCenterPage = websitePages.find((p) => p.page_type === 'help_center') || null;

    let panelsForHelpCenter = helpTopicPanelsRaw;
    if (helpCenterPage) {
      panelsForHelpCenter = helpTopicPanelsRaw.filter(
        (p) => p.context_page_id === helpCenterPage.id
      );
    }

    const helpTopicPanels = panelsForHelpCenter.map((p) => this._hydrateHelpTopicPanel(p));

    const faqHighlights = faqArticles
      .filter((a) => a.isPopular)
      .map((a) => ({
        id: a.id,
        question: a.question,
        answerSnippet: a.answerSnippet,
        issueCategory: a.issueCategory || null,
        hasMoreDetail:
          typeof a.hasMoreDetail === 'boolean' ? a.hasMoreDetail : false
      }));

    return {
      pageTitle: helpCenterPage ? helpCenterPage.name : 'Help Center',
      introText:
        (helpCenterPage && helpCenterPage.description) ||
        'Browse topics or contact our team for help.',
      helpTopicPanels,
      faqHighlights
    };
  }

  // 3) getContactSupportPageInit(issueCategory?, sourcePanelId?)
  getContactSupportPageInit(issueCategory, sourcePanelId) {
    const issueCategoryConfigs = this._getFromStorage('issue_category_configs');
    const contactMethods = this._getFromStorage('contact_method_options');
    const ordersRaw = this._getFromStorage('orders');
    const helpTopicPanels = this._getFromStorage('help_topic_panels');

    // Determine selected issue category
    let selectedIssueCategory = null;

    if (issueCategory) {
      // Accept provided issueCategory even if not present in issue_category_configs.
      // This supports flows like sales_onboarding, feedback_suggestions, etc.
      selectedIssueCategory = issueCategory;
    }

    if (!selectedIssueCategory && sourcePanelId) {
      const panel = helpTopicPanels.find((p) => p.id === sourcePanelId);
      if (panel && panel.issue_category) {
        selectedIssueCategory = panel.issue_category;
      }
    }

    if (!selectedIssueCategory) {
      const defaultConfig = this._getDefaultIssueCategoryConfig();
      selectedIssueCategory = defaultConfig ? defaultConfig.id : null;
    }

    const selectedConfig = issueCategoryConfigs.find(
      (c) => c.id === selectedIssueCategory
    );

    // Default preferred contact method (fastest)
    const fastestMethodOption = this._selectFastestContactMethodOption();
    const defaultPreferredContactMethod = fastestMethodOption
      ? fastestMethodOption.method
      : null;

    const priorities = [
      {
        value: 'low',
        label: 'Low',
        description: 'General questions and non-urgent feedback.'
      },
      {
        value: 'medium',
        label: 'Medium',
        description: 'Standard support requests.'
      },
      {
        value: 'high',
        label: 'High',
        description: 'Time-sensitive issues that impact usage.'
      },
      {
        value: 'urgent',
        label: 'Urgent',
        description: 'Critical outages or severe business impact.'
      }
    ];

    const selectedCategoryConfig = selectedConfig
      ? {
          issueCategory: selectedConfig.id,
          name: selectedConfig.name,
          description: selectedConfig.description || '',
          defaultPriority: selectedConfig.default_priority,
          showOrderFields: !!selectedConfig.show_order_fields,
          showReasonField: !!selectedConfig.show_reason_field,
          showPlatformFields: !!selectedConfig.show_platform_fields,
          showPrivacyFields: !!selectedConfig.show_privacy_fields,
          showOnboardingFields: !!selectedConfig.show_onboarding_fields,
          showExistingTicketFields: !!selectedConfig.show_existing_ticket_fields,
          showResponsePreference: !!selectedConfig.show_response_preference,
          showNewsletterOptIn: !!selectedConfig.show_newsletter_opt_in
        }
      : null;

    const reasonOptions = this._getReasonOptions(selectedIssueCategory);

    // Order options with foreign key resolution (shipping_address_id -> shipping_address)
    const orderOptions = ordersRaw.map((o) => this._hydrateOrder(o));

    // Country options based on enum values
    const countryOptions = [
      { code: 'germany', name: 'Germany', isEu: true },
      { code: 'united_states', name: 'United States', isEu: false },
      { code: 'france', name: 'France', isEu: true },
      { code: 'united_kingdom', name: 'United Kingdom', isEu: false },
      { code: 'canada', name: 'Canada', isEu: false },
      { code: 'other', name: 'Other', isEu: false }
    ];

    const platformOptions = {
      platforms: [
        { value: 'web_app', label: 'Web app' },
        { value: 'mobile_app', label: 'Mobile app' },
        { value: 'desktop_app', label: 'Desktop app' },
        { value: 'api', label: 'API' },
        { value: 'other', label: 'Other' }
      ],
      deviceOs: [
        { value: 'android', label: 'Android' },
        { value: 'ios', label: 'iOS' },
        { value: 'windows_11', label: 'Windows 11' },
        { value: 'windows_10', label: 'Windows 10' },
        { value: 'macos', label: 'macOS' },
        { value: 'linux', label: 'Linux' },
        { value: 'other', label: 'Other' }
      ],
      browsers: [
        { value: 'chrome_120', label: 'Google Chrome 120' },
        { value: 'chrome', label: 'Google Chrome' },
        { value: 'firefox', label: 'Mozilla Firefox' },
        { value: 'safari', label: 'Safari' },
        { value: 'edge', label: 'Microsoft Edge' },
        { value: 'other', label: 'Other' }
      ]
    };

    // Onboarding configuration
    const timeZoneOptions = [
      { value: 'us_eastern', label: 'US/Eastern' },
      { value: 'us_central', label: 'US/Central' },
      { value: 'us_mountain', label: 'US/Mountain' },
      { value: 'us_pacific', label: 'US/Pacific' },
      { value: 'utc', label: 'UTC' },
      { value: 'europe_berlin', label: 'Europe/Berlin' },
      { value: 'europe_london', label: 'Europe/London' },
      { value: 'asia_tokyo', label: 'Asia/Tokyo' },
      { value: 'other', label: 'Other' }
    ];

    const allSlots = this._getFromStorage('onboarding_availability_slots');
    const availableSlots = allSlots.filter((s) => !s.is_booked);
    availableSlots.sort(
      (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    );
    const earliestAvailableSlot = availableSlots.length ? availableSlots[0] : null;

    const onboardingConfig = {
      showTeamSizeField: selectedIssueCategory === 'sales_onboarding',
      minTeamSize: 1,
      maxTeamSize: 100,
      timeZoneOptions,
      earliestAvailableSlot
    };

    // Response preference config
    const supportsNoReply = selectedIssueCategory === 'feedback_suggestions';
    const responsePreferenceConfig = {
      supportsNoReply,
      defaultResponseRequested: !supportsNoReply
    };

    const newsletterDefaultOptIn = false;

    // Prefill based on sourcePanelId
    let prefill = {
      subject: '',
      description: '',
      priority: selectedCategoryConfig ? selectedCategoryConfig.defaultPriority : null,
      reason: null
    };

    if (sourcePanelId) {
      const panel = helpTopicPanels.find((p) => p.id === sourcePanelId);
      if (panel) {
        prefill.subject = panel.title || '';
        prefill.description = panel.description || '';
      }
    }

    return {
      issueCategories: issueCategoryConfigs,
      selectedIssueCategory,
      contactMethods,
      defaultPreferredContactMethod,
      priorities,
      selectedCategoryConfig,
      reasonOptions,
      orderOptions,
      countryOptions,
      platformOptions,
      onboardingConfig,
      responsePreferenceConfig,
      newsletterDefaultOptIn,
      prefill
    };
  }

  // 4) getOnboardingAvailabilitySlots(startDate, endDate, timeZone?)
  getOnboardingAvailabilitySlots(startDate, endDate, timeZone) {
    const slots = this._getFromStorage('onboarding_availability_slots');

    const start = this._parseDateOnly(startDate);
    const end = this._parseDateOnly(endDate);

    if (!start || !end) {
      return [];
    }

    const startMs = start.getTime();
    const endMs = end.getTime() + 24 * 60 * 60 * 1000 - 1; // end of day

    const result = slots.filter((slot) => {
      const slotStartMs = new Date(slot.start_datetime).getTime();
      return slotStartMs >= startMs && slotStartMs <= endMs;
    });

    // timeZone parameter is provided for UI conversion if needed; we return raw slots
    return result;
  }

  // 5) submitSupportTicket(...)
  submitSupportTicket(
    subject,
    description,
    issueCategory,
    reason,
    priority,
    preferredContactMethod,
    contactEmail,
    contactPhone,
    responseRequested,
    newsletterOptIn,
    attachPreviousConversation,
    shareDiagnosticLogs,
    orderId,
    orderNumber,
    originalTicketId,
    accountType,
    country,
    platform,
    deviceOs,
    deviceOsVersion,
    browser,
    appVersion,
    teamSize,
    preferredDate,
    preferredTime,
    timeZone,
    onboardingSlotId,
    relatedInvoiceId,
    tags
  ) {
    const validationErrors = {};

    // Basic required fields
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      validationErrors.subject = 'Subject is required.';
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      validationErrors.description = 'Description is required.';
    }

    const validIssueCategories = [
      'billing_payments',
      'technical_support',
      'orders_shipping',
      'account_privacy',
      'feedback_suggestions',
      'bug_report',
      'sales_onboarding',
      'existing_request_followup_escalation'
    ];
    if (!issueCategory || !validIssueCategories.includes(issueCategory)) {
      validationErrors.issueCategory = 'Invalid or missing issue category.';
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!priority || !validPriorities.includes(priority)) {
      validationErrors.priority = 'Invalid or missing priority.';
    }

    const validContactMethods = ['email', 'phone', 'live_chat'];
    if (
      !preferredContactMethod ||
      !validContactMethods.includes(preferredContactMethod)
    ) {
      validationErrors.preferredContactMethod =
        'Invalid or missing preferred contact method.';
    }

    if (!contactEmail || typeof contactEmail !== 'string' || !contactEmail.trim()) {
      validationErrors.contactEmail = 'Contact email is required.';
    }

    if (preferredContactMethod === 'phone') {
      if (!contactPhone || typeof contactPhone !== 'string' || !contactPhone.trim()) {
        validationErrors.contactPhone =
          'Contact phone is required when phone is the preferred contact method.';
      }
    }

    // Validate orderId if provided
    const orders = this._getFromStorage('orders');
    if (orderId) {
      const exists = orders.some((o) => o.id === orderId);
      if (!exists) {
        validationErrors.orderId = 'Selected order does not exist.';
      }
    }

    // Validate originalTicketId if provided
    const supportTickets = this._getFromStorage('support_tickets');
    if (originalTicketId) {
      const exists = supportTickets.some((t) => t.id === originalTicketId);
      if (!exists) {
        validationErrors.originalTicketId = 'Original ticket not found.';
      }
    }

    // Sales & Onboarding specific validations
    if (issueCategory === 'sales_onboarding') {
      if (typeof teamSize !== 'number' || teamSize <= 0) {
        validationErrors.teamSize = 'Team size must be a positive number.';
      }
      if (!preferredDate) {
        validationErrors.preferredDate = 'Preferred date is required.';
      }
      if (!preferredTime) {
        validationErrors.preferredTime = 'Preferred time is required.';
      }
      if (!timeZone) {
        validationErrors.timeZone = 'Time zone is required.';
      }

      if (onboardingSlotId) {
        const slots = this._getFromStorage('onboarding_availability_slots');
        const slot = slots.find((s) => s.id === onboardingSlotId);
        if (!slot) {
          validationErrors.onboardingSlotId = 'Selected onboarding slot does not exist.';
        } else if (slot.is_booked) {
          validationErrors.onboardingSlotId = 'Selected onboarding slot is already booked.';
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return {
        success: false,
        ticketId: null,
        status: null,
        message: 'Validation failed. Please review the form fields.',
        validationErrors,
        ticket: null,
        onboardingAppointment: null
      };
    }

    // Build ticket data object for helper
    const ticketData = {
      subject,
      description,
      issueCategory,
      reason,
      priority,
      preferredContactMethod,
      contactEmail,
      contactPhone,
      responseRequested: !!responseRequested,
      newsletterOptIn: !!newsletterOptIn,
      attachPreviousConversation: !!attachPreviousConversation,
      shareDiagnosticLogs: !!shareDiagnosticLogs,
      orderId: orderId || null,
      orderNumber: orderNumber || null,
      originalTicketId: originalTicketId || null,
      accountType: accountType || null,
      country: country || null,
      platform: platform || null,
      deviceOs: deviceOs || null,
      deviceOsVersion: deviceOsVersion || null,
      browser: browser || null,
      appVersion: appVersion || null,
      teamSize: typeof teamSize === 'number' ? teamSize : null,
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || null,
      timeZone: timeZone || null,
      relatedInvoiceId: relatedInvoiceId || null,
      tags: Array.isArray(tags) ? tags : []
    };

    const { ticket, appointment } = this._createSupportTicketAndAppointment(
      ticketData,
      onboardingSlotId,
      teamSize
    );

    const hydratedTicket = this._hydrateSupportTicket(ticket);
    const hydratedAppointment = this._hydrateOnboardingAppointment(appointment);

    return {
      success: true,
      ticketId: ticket.id,
      status: ticket.status,
      message: 'Your support request has been submitted successfully.',
      validationErrors: {},
      ticket: hydratedTicket,
      onboardingAppointment: hydratedAppointment
    };
  }

  // 6) getFaqOverview()
  getFaqOverview() {
    const categories = this._getFromStorage('faq_categories');
    const articlesRaw = this._getFromStorage('faq_articles');

    // Foreign key resolution: categoryId -> category
    const articles = articlesRaw.map((article) => {
      const category = categories.find((c) => c.id === article.categoryId) || null;
      return Object.assign({}, article, { category });
    });

    return {
      categories,
      articles
    };
  }

  // 7) getFaqArticleDetails(articleId)
  getFaqArticleDetails(articleId) {
    const categories = this._getFromStorage('faq_categories');
    const articles = this._getFromStorage('faq_articles');

    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return null;
    }

    const category = categories.find((c) => c.id === article.categoryId) || null;

    const answer = article.answer || article.answerSnippet || '';

    const followUpActions = [];
    followUpActions.push({
      type: 'help_center',
      label: 'Browse Help Center',
      targetIssueCategory: null
    });
    if (article.issueCategory) {
      followUpActions.push({
        type: 'contact_support',
        label: 'Contact support about this',
        targetIssueCategory: article.issueCategory
      });
    }

    return {
      id: article.id,
      categoryId: article.categoryId,
      question: article.question,
      answer,
      issueCategory: article.issueCategory || null,
      followUpActions,
      category
    };
  }

  // 8) getSalesOnboardingPageContent()
  getSalesOnboardingPageContent() {
    const slots = this._getFromStorage('onboarding_availability_slots');

    const upcomingAvailabilitySummary = slots
      .filter((s) => !s.is_booked)
      .sort(
        (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      )
      .slice(0, 5);

    return {
      introTitle: 'Live onboarding for your whole team',
      introBody:
        'Schedule a guided walkthrough so your team can get up and running quickly.',
      benefits: [
        'Tailored setup for your workflows',
        'Best practices from our specialists',
        'Live Q&A with your team'
      ],
      typicalCallLengthMinutes: 45,
      teamSizeGuidance: {
        minTeamSize: 1,
        maxTeamSize: 100,
        exampleTeamSizes: [5, 10, 25]
      },
      schedulingInfoSummary:
        'We\'ll ask for your team size, preferred date, time, and time zone on the next step.',
      upcomingAvailabilitySummary,
      primaryCtaLabel: 'Schedule Onboarding'
    };
  }

  // 9) getInformationalPageContent(pageType)
  getInformationalPageContent(pageType) {
    const validTypes = ['about', 'privacy_policy', 'terms_of_use'];
    if (!validTypes.includes(pageType)) {
      throw new Error('Invalid informational page type: ' + pageType);
    }

    const websitePages = this._getFromStorage('website_pages');
    const page = websitePages.find((p) => p.page_type === pageType) || null;

    let title;
    let sections;
    let hasSupportCta = true;
    let supportCtaLabel = 'Visit Help Center';
    let supportCtaTargetPageType = 'help_center';
    let privacySpecificNotes = {
      mentionsEuDataProtectionLaws: false,
      privacyRequestGuidance: ''
    };

    if (pageType === 'about') {
      title = (page && page.name) || 'About Us';
      sections = [
        {
          anchorId: 'company',
          heading: 'Who we are',
          body:
            'We build tools that make it easy to get help when you need it, from billing questions to technical issues.'
        }
      ];
      hasSupportCta = true;
      supportCtaLabel = 'Need help? Visit our Help Center';
      supportCtaTargetPageType = 'help_center';
    } else if (pageType === 'privacy_policy') {
      title = (page && page.name) || 'Privacy Policy';
      sections = [
        {
          anchorId: 'overview',
          heading: 'Your privacy matters',
          body:
            'We process your data to provide and improve our services. You can request access, correction, or deletion of your personal data at any time.'
        },
        {
          anchorId: 'requests',
          heading: 'Privacy and data requests',
          body:
            'To exercise your privacy rights, including account deletion, please go to the Help Center and choose the Account & Privacy category when contacting support.'
        }
      ];
      hasSupportCta = true;
      supportCtaLabel = 'Request help with your data';
      supportCtaTargetPageType = 'contact_support';
      privacySpecificNotes = {
        mentionsEuDataProtectionLaws: true,
        privacyRequestGuidance:
          'EU users can request account deletion and data removal under EU data protection laws by contacting support via the Account & Privacy category in the Help Center.'
      };
    } else if (pageType === 'terms_of_use') {
      title = (page && page.name) || 'Terms of Use';
      sections = [
        {
          anchorId: 'acceptance',
          heading: 'Acceptance of terms',
          body:
            'By using our services, you agree to these terms and any policies referenced here.'
        }
      ];
      hasSupportCta = true;
      supportCtaLabel = 'Questions about these terms? Contact support';
      supportCtaTargetPageType = 'contact_support';
    }

    const lastUpdated = new Date().toISOString().slice(0, 10);

    return {
      title,
      lastUpdated,
      sections,
      hasSupportCta,
      supportCtaLabel,
      supportCtaTargetPageType,
      privacySpecificNotes
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
