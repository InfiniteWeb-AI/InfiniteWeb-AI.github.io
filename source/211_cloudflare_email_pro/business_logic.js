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
    const keys = [
      'site_pages',
      'header_links',
      'footer_links',
      'ui_preferences',
      'department_contacts',
      'protected_contact_addresses',
      'security_alerts_subscriptions',
      'pre_sales_inquiries',
      'issue_reports',
      'email_protection_settings',
      'billing_queries',
      'regional_preferences',
      'scratchpad_notes',
      'help_articles',
      'article_feedback',
      'faq_items'
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
    return data ? JSON.parse(data) : [];
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

  _now() {
    return new Date().toISOString();
  }

  _normalizeStringArray(arr) {
    if (!Array.isArray(arr)) return [];
    const normalized = [];
    const seen = new Set();
    for (let v of arr) {
      if (typeof v !== 'string') continue;
      const trimmed = v.trim();
      if (!trimmed) continue;
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        normalized.push(trimmed);
      }
    }
    return normalized;
  }

  // ------------------------
  // Internal helpers (private)
  // ------------------------

  _getOrCreateUiPreferences() {
    let prefsArr = this._getFromStorage('ui_preferences');
    if (!Array.isArray(prefsArr)) {
      prefsArr = [];
    }
    if (prefsArr.length === 0) {
      const pref = {
        id: this._generateId('uipref'),
        language: 'english', // enum: english | espanol
        current_view: 'notice', // enum: notice | settings
        last_opened_help_article_id: null,
        last_updated: this._now()
      };
      prefsArr.push(pref);
      this._saveToStorage('ui_preferences', prefsArr);
      return pref;
    }
    return prefsArr[0];
  }

  _saveUiPreferences(pref) {
    let prefsArr = this._getFromStorage('ui_preferences');
    if (!Array.isArray(prefsArr) || prefsArr.length === 0) {
      prefsArr = [pref];
    } else {
      prefsArr[0] = pref;
    }
    this._saveToStorage('ui_preferences', prefsArr);
  }

  _getOrCreateEmailProtectionSettings() {
    let settingsArr = this._getFromStorage('email_protection_settings');
    if (!Array.isArray(settingsArr)) {
      settingsArr = [];
    }
    if (settingsArr.length === 0) {
      const settings = {
        id: this._generateId('epset'),
        bot_protection_level: 'high', // enum: high | medium | low
        allowed_domains: [],
        safelisted_domains: [],
        sample_email: '',
        last_updated: this._now()
      };
      settingsArr.push(settings);
      this._saveToStorage('email_protection_settings', settingsArr);
      return settings;
    }
    return settingsArr[0];
  }

  _saveEmailProtectionSettings(settings) {
    let settingsArr = this._getFromStorage('email_protection_settings');
    if (!Array.isArray(settingsArr) || settingsArr.length === 0) {
      settingsArr = [settings];
    } else {
      settingsArr[0] = settings;
    }
    this._saveToStorage('email_protection_settings', settingsArr);
  }

  _getOrCreateRegionalPreferences() {
    let prefsArr = this._getFromStorage('regional_preferences');
    if (!Array.isArray(prefsArr)) {
      prefsArr = [];
    }
    if (prefsArr.length === 0) {
      const pref = {
        id: this._generateId('regpref'),
        default_region: 'global', // enum: global | us | europe | apac
        preferred_contact_id: null,
        last_updated: this._now()
      };
      prefsArr.push(pref);
      this._saveToStorage('regional_preferences', prefsArr);
      return pref;
    }
    return prefsArr[0];
  }

  _saveRegionalPreferences(pref) {
    let prefsArr = this._getFromStorage('regional_preferences');
    if (!Array.isArray(prefsArr) || prefsArr.length === 0) {
      prefsArr = [pref];
    } else {
      prefsArr[0] = pref;
    }
    this._saveToStorage('regional_preferences', prefsArr);
  }

  _getOrCreateScratchpadNote() {
    let notesArr = this._getFromStorage('scratchpad_notes');
    if (!Array.isArray(notesArr)) {
      notesArr = [];
    }
    if (notesArr.length === 0) {
      const note = {
        id: this._generateId('scratch'),
        content: '',
        updated_at: this._now()
      };
      notesArr.push(note);
      this._saveToStorage('scratchpad_notes', notesArr);
      return note;
    }
    return notesArr[0];
  }

  _saveScratchpadNoteEntity(note) {
    let notesArr = this._getFromStorage('scratchpad_notes');
    if (!Array.isArray(notesArr) || notesArr.length === 0) {
      notesArr = [note];
    } else {
      notesArr[0] = note;
    }
    this._saveToStorage('scratchpad_notes', notesArr);
  }

  _searchHelpArticlesInternal(query, limit) {
    const q = (query || '').toLowerCase().trim();
    const articles = this._getFromStorage('help_articles');
    let results = [];

    if (!q) {
      // If no query, optionally return first N articles as generic results
      results = articles.map((article) => ({
        article,
        snippet: article.summary || ''
      }));
    } else {
      for (const article of articles) {
        const haystack = [article.title, article.summary, article.content]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (haystack.includes(q)) {
          results.push({
            article,
            snippet: article.summary || ''
          });
        }
      }
    }

    // Simple ordering: newest first when created_at is available
    results.sort((a, b) => {
      const aDate = a.article.created_at ? Date.parse(a.article.created_at) : 0;
      const bDate = b.article.created_at ? Date.parse(b.article.created_at) : 0;
      return bDate - aDate;
    });

    if (typeof limit === 'number' && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  // ------------------------
  // Core interface implementations
  // ------------------------

  // 1. getUiPreferences
  getUiPreferences() {
    const pref = this._getOrCreateUiPreferences();
    const helpArticles = this._getFromStorage('help_articles');
    let lastArticle = null;
    if (pref.last_opened_help_article_id) {
      lastArticle = helpArticles.find(
        (a) => a.id === pref.last_opened_help_article_id
      ) || null;
    }
    const preferences = {
      ...pref,
      last_opened_help_article: lastArticle
    };
    return { preferences };
  }

  // 2. updateUiLanguage(language)
  updateUiLanguage(language) {
    const allowed = ['english', 'espanol'];
    const lang = allowed.includes(language) ? language : 'english';
    const pref = this._getOrCreateUiPreferences();
    pref.language = lang;
    pref.last_updated = this._now();
    this._saveUiPreferences(pref);
    const helpArticles = this._getFromStorage('help_articles');
    let lastArticle = null;
    if (pref.last_opened_help_article_id) {
      lastArticle = helpArticles.find(
        (a) => a.id === pref.last_opened_help_article_id
      ) || null;
    }
    const preferences = {
      ...pref,
      last_opened_help_article: lastArticle
    };
    return {
      preferences,
      message: 'Language updated.'
    };
  }

  // 3. switchEmailProtectionView(view)
  switchEmailProtectionView(view) {
    const allowed = ['notice', 'settings'];
    const v = allowed.includes(view) ? view : 'notice';
    const pref = this._getOrCreateUiPreferences();
    pref.current_view = v;
    pref.last_updated = this._now();
    this._saveUiPreferences(pref);
    const helpArticles = this._getFromStorage('help_articles');
    let lastArticle = null;
    if (pref.last_opened_help_article_id) {
      lastArticle = helpArticles.find(
        (a) => a.id === pref.last_opened_help_article_id
      ) || null;
    }
    const preferences = {
      ...pref,
      last_opened_help_article: lastArticle
    };
    return {
      preferences,
      message: 'View updated.'
    };
  }

  // 4. getEmailProtectionNoticeIntro
  getEmailProtectionNoticeIntro() {
    const pages = this._getFromStorage('site_pages');
    const page = pages.find((p) => p.page_type === 'notice') || null;

    // Static explanatory text (not persisted)
    const headline = 'Email addresses on this site are protected by Cloudflare.';
    const body =
      'This notice explains why you are seeing obfuscated email addresses and how to safely reveal them when needed. ' +
      'Revealed addresses are only used for the specific forms and actions you submit on this page.';

    return { page, headline, body };
  }

  // 5. getContactEmailsSection
  getContactEmailsSection() {
    const all = this._getFromStorage('department_contacts');
    const contacts = all.filter((c) => c.section === 'contact_emails');
    const sectionTitle = 'Contact Emails';
    return { contacts, sectionTitle };
  }

  // 6. subscribeSecurityStatusAlerts(email, source)
  subscribeSecurityStatusAlerts(email, source) {
    const subscriptions = this._getFromStorage('security_alerts_subscriptions');
    const contacts = this._getFromStorage('department_contacts');

    const src = source || 'security_status_form';
    const emailStr = typeof email === 'string' ? email.trim() : '';

    let securityContact = null;
    if (emailStr) {
      securityContact = contacts.find(
        (c) => c.role === 'security' && c.email === emailStr
      ) || null;
    }
    if (!securityContact) {
      securityContact = contacts.find((c) => c.role === 'security') || null;
    }

    const subscription = {
      id: this._generateId('secsub'),
      email: emailStr,
      contact_id: securityContact ? securityContact.id : null,
      source: src,
      created_at: this._now()
    };

    subscriptions.push(subscription);
    this._saveToStorage('security_alerts_subscriptions', subscriptions);

    return {
      success: true,
      subscription,
      message: 'Security status alerts subscription created.'
    };
  }

  // 7. getDepartmentContactsSection
  getDepartmentContactsSection() {
    const all = this._getFromStorage('department_contacts');
    const contacts = all.filter((c) => c.section === 'department_contacts');
    const sectionTitle = 'Department Contacts';
    return { contacts, sectionTitle };
  }

  // 8. getPreSalesInquiryFormOptions
  getPreSalesInquiryFormOptions() {
    const orderSizeOptions = [
      { value: 'up_to_100', label: 'Up to $100' },
      { value: 'between_100_500', label: '$100 to $500' },
      { value: 'more_than_500', label: 'More than $500' }
    ];

    const reasonOptions = [
      { value: 'pre_sales_question', label: 'Pre-sales question' },
      { value: 'technical_question', label: 'Technical question' },
      { value: 'billing_question', label: 'Billing question' },
      { value: 'other', label: 'Other' }
    ];

    const defaultReasonValue = 'pre_sales_question';

    return { orderSizeOptions, reasonOptions, defaultReasonValue };
  }

  // 9. submitPreSalesInquiry(email, orderSize, reason, message, contactId)
  submitPreSalesInquiry(email, orderSize, reason, message, contactId) {
    const inquiries = this._getFromStorage('pre_sales_inquiries');

    const allowedOrderSizes = [
      'up_to_100',
      'between_100_500',
      'more_than_500'
    ];
    const allowedReasons = [
      'pre_sales_question',
      'technical_question',
      'billing_question',
      'other'
    ];

    const os = allowedOrderSizes.includes(orderSize)
      ? orderSize
      : 'up_to_100';
    const r = allowedReasons.includes(reason) ? reason : 'pre_sales_question';

    const inquiry = {
      id: this._generateId('presale'),
      email: typeof email === 'string' ? email.trim() : '',
      order_size: os,
      reason: r,
      message: typeof message === 'string' ? message : '',
      contact_id: contactId || null,
      created_at: this._now()
    };

    inquiries.push(inquiry);
    this._saveToStorage('pre_sales_inquiries', inquiries);

    return {
      success: true,
      inquiry,
      message: 'Pre-sales inquiry submitted.'
    };
  }

  // 10. getProtectedContactAddressesList
  getProtectedContactAddressesList() {
    const addresses = this._getFromStorage('protected_contact_addresses').slice();
    addresses.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : 0;
      const bo = typeof b.display_order === 'number' ? b.display_order : 0;
      return ao - bo;
    });
    const sectionTitle = 'All Protected Contact Addresses';
    return { addresses, sectionTitle };
  }

  // 11. getIssueReportFormOptions
  getIssueReportFormOptions() {
    const issueTypeOptions = [
      { value: 'email_visibility_problem', label: 'Email visibility problem' },
      { value: 'wrong_contact_email', label: 'Wrong contact email' },
      { value: 'language_issue', label: 'Language issue' },
      { value: 'accessibility_issue', label: 'Accessibility issue' },
      { value: 'other', label: 'Other' }
    ];

    const defaultIssueTypeValue = 'email_visibility_problem';
    const helpText =
      'Use this form to report issues with protected email addresses, including visibility or accuracy problems.';

    return { issueTypeOptions, defaultIssueTypeValue, helpText };
  }

  // 12. submitIssueReport(issueType, affectedEmail, relatedProtectedContactId, description)
  submitIssueReport(issueType, affectedEmail, relatedProtectedContactId, description) {
    const issueReports = this._getFromStorage('issue_reports');

    const allowedTypes = [
      'email_visibility_problem',
      'wrong_contact_email',
      'language_issue',
      'accessibility_issue',
      'other'
    ];

    const it = allowedTypes.includes(issueType)
      ? issueType
      : 'other';

    const report = {
      id: this._generateId('issue'),
      issue_type: it,
      affected_email: typeof affectedEmail === 'string' ? affectedEmail.trim() : '',
      related_protected_contact_id: relatedProtectedContactId || null,
      description: typeof description === 'string' ? description : '',
      created_at: this._now()
    };

    issueReports.push(report);
    this._saveToStorage('issue_reports', issueReports);

    return {
      success: true,
      issueReport: report,
      message: 'Issue report submitted.'
    };
  }

  // 13. getFaqItems(language)
  getFaqItems(language) {
    const allowed = ['english', 'espanol'];
    const lang = allowed.includes(language) ? language : 'english';
    const all = this._getFromStorage('faq_items');
    const items = all
      .filter((item) => item.language === lang)
      .slice()
      .sort((a, b) => {
        const ao = typeof a.display_order === 'number' ? a.display_order : 0;
        const bo = typeof b.display_order === 'number' ? b.display_order : 0;
        return ao - bo;
      });

    const sectionTitle = lang === 'espanol'
      ? 'Preguntas frecuentes'
      : 'Frequently Asked Questions';

    return { items, sectionTitle };
  }

  // 14. getEmailProtectionSettings
  getEmailProtectionSettings() {
    const settings = this._getOrCreateEmailProtectionSettings();
    return { settings };
  }

  // 15. updateEmailProtectionSettings(botProtectionLevel, allowedDomains)
  updateEmailProtectionSettings(botProtectionLevel, allowedDomains) {
    const allowedLevels = ['high', 'medium', 'low'];
    const level = allowedLevels.includes(botProtectionLevel)
      ? botProtectionLevel
      : 'high';

    const settings = this._getOrCreateEmailProtectionSettings();
    settings.bot_protection_level = level;
    settings.allowed_domains = this._normalizeStringArray(allowedDomains);
    settings.last_updated = this._now();

    this._saveEmailProtectionSettings(settings);

    return {
      settings,
      message: 'Email protection settings updated.'
    };
  }

  // 16. updateSafelistedDomains(safelistedDomains)
  updateSafelistedDomains(safelistedDomains) {
    const settings = this._getOrCreateEmailProtectionSettings();
    settings.safelisted_domains = this._normalizeStringArray(safelistedDomains);
    settings.last_updated = this._now();
    this._saveEmailProtectionSettings(settings);
    return {
      settings,
      message: 'Safelisted domains updated.'
    };
  }

  // 17. getContactOptionsSection
  getContactOptionsSection() {
    const all = this._getFromStorage('department_contacts');
    const contacts = all.filter((c) => c.section === 'contact_options');
    const sectionTitle = 'Contact Options';
    return { contacts, sectionTitle };
  }

  // 18. getBillingQueryFormOptions
  getBillingQueryFormOptions() {
    const topicOptions = [
      { value: 'invoice_question', label: 'Invoice question' },
      { value: 'payment_issue', label: 'Payment issue' },
      { value: 'refund_request', label: 'Refund request' },
      { value: 'other', label: 'Other' }
    ];

    const defaultTopicValue = 'invoice_question';

    return { topicOptions, defaultTopicValue };
  }

  // 19. startBillingQuery(billingEmail, topic, subject, message, contactId)
  startBillingQuery(billingEmail, topic, subject, message, contactId) {
    const billingQueries = this._getFromStorage('billing_queries');

    const allowedTopics = [
      'invoice_question',
      'payment_issue',
      'refund_request',
      'other'
    ];

    const t = allowedTopics.includes(topic) ? topic : 'invoice_question';

    const query = {
      id: this._generateId('billq'),
      billing_email: typeof billingEmail === 'string' ? billingEmail.trim() : '',
      topic: t,
      subject: typeof subject === 'string' ? subject : '',
      message: typeof message === 'string' ? message : '',
      contact_id: contactId || null,
      created_at: this._now()
    };

    billingQueries.push(query);
    this._saveToStorage('billing_queries', billingQueries);

    return {
      success: true,
      billingQuery: query,
      message: 'Billing query started.'
    };
  }

  // 20. getRegionalSupportContacts
  getRegionalSupportContacts() {
    const all = this._getFromStorage('department_contacts');
    const contacts = all.filter((c) => c.section === 'regional_support_contacts');
    const sectionTitle = 'Regional Support Contacts';
    return { contacts, sectionTitle };
  }

  // 21. getRegionalPreferences
  getRegionalPreferences() {
    const pref = this._getOrCreateRegionalPreferences();
    const contacts = this._getFromStorage('department_contacts');
    let preferredContact = null;
    if (pref.preferred_contact_id) {
      preferredContact = contacts.find(
        (c) => c.id === pref.preferred_contact_id
      ) || null;
    }
    const preferences = {
      ...pref,
      preferred_contact: preferredContact
    };
    return { preferences };
  }

  // 22. updateRegionalPreferences(defaultRegion, preferredContactId)
  updateRegionalPreferences(defaultRegion, preferredContactId) {
    const allowedRegions = ['global', 'us', 'europe', 'apac'];
    const region = allowedRegions.includes(defaultRegion)
      ? defaultRegion
      : 'global';

    const pref = this._getOrCreateRegionalPreferences();
    pref.default_region = region;
    pref.preferred_contact_id = preferredContactId || null;
    pref.last_updated = this._now();
    this._saveRegionalPreferences(pref);

    const contacts = this._getFromStorage('department_contacts');
    let preferredContact = null;
    if (pref.preferred_contact_id) {
      preferredContact = contacts.find(
        (c) => c.id === pref.preferred_contact_id
      ) || null;
    }

    const preferences = {
      ...pref,
      preferred_contact: preferredContact
    };

    return {
      preferences,
      message: 'Regional preferences updated.'
    };
  }

  // 23. getDepartmentalAddresses
  getDepartmentalAddresses() {
    const all = this._getFromStorage('department_contacts');
    const contacts = all.filter((c) => c.section === 'departmental_addresses');
    const sectionTitle = 'Departmental Addresses';
    return { contacts, sectionTitle };
  }

  // 24. getScratchpadNote
  getScratchpadNote() {
    const note = this._getOrCreateScratchpadNote();
    return { note };
  }

  // 25. saveScratchpadNote(content)
  saveScratchpadNote(content) {
    const note = this._getOrCreateScratchpadNote();
    note.content = typeof content === 'string' ? content : '';
    note.updated_at = this._now();
    this._saveScratchpadNoteEntity(note);
    return {
      note,
      message: 'Scratchpad updated.'
    };
  }

  // 26. searchHelpArticles(query, limit)
  searchHelpArticles(query, limit) {
    const results = this._searchHelpArticlesInternal(query, limit);

    // Instrumentation for task completion tracking (task_6)
    try {
      const rawQuery = (query || '').toString();
      const normalizedQuery = (query || '').toLowerCase().trim();
      if (normalizedQuery) {
        const task6_searchParams = {
          query: rawQuery,
          normalizedQuery: normalizedQuery,
          limit: typeof limit === 'number' ? limit : null,
          resultArticleIds: Array.isArray(results)
            ? results.map((r) => r && r.article && r.article.id)
            : [],
          timestamp: this._now()
        };
        localStorage.setItem('task6_searchParams', JSON.stringify(task6_searchParams));
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting core functionality
    }

    return { results };
  }

  // 27. getHelpCenterOverview
  getHelpCenterOverview() {
    const articles = this._getFromStorage('help_articles');

    // Use existing articles as-is; do not create mock topics.
    const featuredArticles = articles.slice(0, 3);
    const topics = [];

    return { featuredArticles, topics };
  }

  // 28. getHelpArticle(articleId)
  getHelpArticle(articleId) {
    const articles = this._getFromStorage('help_articles');
    const article = articles.find((a) => a.id === articleId) || null;

    if (article) {
      // Update UI preferences with last_opened_help_article_id
      const pref = this._getOrCreateUiPreferences();
      pref.last_opened_help_article_id = article.id;
      pref.last_updated = this._now();
      this._saveUiPreferences(pref);
    }

    return { article };
  }

  // 29. submitArticleFeedback(articleId, emailForFollowup, rating, comment)
  submitArticleFeedback(articleId, emailForFollowup, rating, comment) {
    const feedbackArr = this._getFromStorage('article_feedback');

    const allowedRatings = ['1', '2', '3', '4', '5'];
    const r = allowedRatings.includes(rating) ? rating : '3';

    const feedback = {
      id: this._generateId('afbk'),
      article_id: articleId,
      email_for_followup: typeof emailForFollowup === 'string'
        ? emailForFollowup.trim()
        : '',
      rating: r,
      comment: typeof comment === 'string' ? comment : '',
      submitted_at: this._now()
    };

    feedbackArr.push(feedback);
    this._saveToStorage('article_feedback', feedbackArr);

    return {
      feedback,
      message: 'Feedback submitted.'
    };
  }

  // 30. getSitePageByType(pageType)
  getSitePageByType(pageType) {
    const pages = this._getFromStorage('site_pages');
    const page = pages.find((p) => p.page_type === pageType) || null;
    return { page };
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}