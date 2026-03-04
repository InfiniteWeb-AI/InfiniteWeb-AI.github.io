// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // -----------------------------
  // Storage helpers
  // -----------------------------

  _initStorage() {
    // Core entity tables
    if (!localStorage.getItem('domains')) {
      localStorage.setItem('domains', JSON.stringify([]));
    }
    if (!localStorage.getItem('contact_profiles')) {
      localStorage.setItem('contact_profiles', JSON.stringify([]));
    }
    if (!localStorage.getItem('verification_events')) {
      localStorage.setItem('verification_events', JSON.stringify([]));
    }
    if (!localStorage.getItem('notification_preferences')) {
      localStorage.setItem('notification_preferences', JSON.stringify([]));
    }
    if (!localStorage.getItem('collaborators')) {
      localStorage.setItem('collaborators', JSON.stringify([]));
    }
    if (!localStorage.getItem('bulk_verification_jobs')) {
      localStorage.setItem('bulk_verification_jobs', JSON.stringify([]));
    }
    if (!localStorage.getItem('verification_banner_snoozes')) {
      localStorage.setItem('verification_banner_snoozes', JSON.stringify([]));
    }
    if (!localStorage.getItem('static_pages')) {
      const now = new Date().toISOString();
      const staticPages = {
        about: {
          title: 'About',
          bodyHtml: '<p>About this domain registrar.</p>',
          lastUpdatedAt: now
        },
        privacy_policy: {
          title: 'Privacy Policy',
          bodyHtml: '<p>Our privacy policy.</p>',
          lastUpdatedAt: now
        },
        terms_of_service: {
          title: 'Terms of Service',
          bodyHtml: '<p>Our terms of service.</p>',
          lastUpdatedAt: now
        }
      };
      localStorage.setItem('static_pages', JSON.stringify(staticPages));
    }
    if (!localStorage.getItem('help_support_content')) {
      const helpContent = {
        faqSections: [
          {
            sectionId: 'contact_verification',
            title: 'Contact Verification',
            articles: [
              {
                articleId: 'update_contact_email',
                question: 'How do I update my contact email?',
                answerSummary: 'Go to your domain\'s contact verification notice and edit the contact email field.',
                relatedTopicKey: 'update_contact_email'
              },
              {
                articleId: 'fix_phone_format',
                question: 'How do I fix my phone number format?',
                answerSummary: 'On the contact verification page, update the phone number and matching country.',
                relatedTopicKey: 'fix_phone_format'
              },
              {
                articleId: 'resend_verification_email',
                question: 'How do I resend a verification email?',
                answerSummary: 'Use the contact verification center to resend a verification email, respecting minimum resend intervals.',
                relatedTopicKey: 'resend_verification_email'
              }
            ]
          }
        ]
      };
      localStorage.setItem('help_support_content', JSON.stringify(helpContent));
    }
    if (!localStorage.getItem('contact_us_info')) {
      const contactUsInfo = {
        supportEmail: 'support@example-registrar.com',
        supportPhone: '+1 800 555 0100',
        businessHours: 'Mon-Fri 9:00am - 6:00pm PT',
        hasSupportForm: true,
        topicOptions: [
          {
            value: 'contact_verification',
            label: 'Contact Verification',
            description: 'Issues with verifying domain contact details.'
          },
          {
            value: 'suspension',
            label: 'Suspension',
            description: 'Help with suspended domains.'
          },
          {
            value: 'billing',
            label: 'Billing',
            description: 'Invoices, payments, and refunds.'
          },
          {
            value: 'general',
            label: 'General',
            description: 'Anything else.'
          }
        ]
      };
      localStorage.setItem('contact_us_info', JSON.stringify(contactUsInfo));
    }
    if (!localStorage.getItem('support_requests')) {
      localStorage.setItem('support_requests', JSON.stringify([]));
    }

    // Generic id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  // -----------------------------
  // Private helper functions
  // -----------------------------

  _getCurrentDateTime() {
    return new Date().toISOString();
  }

  _calculateSnoozeUntil(snoozeDuration) {
    const now = new Date();
    let days = 0;
    switch (snoozeDuration) {
      case 'one_day':
        days = 1;
        break;
      case 'seven_days':
        days = 7;
        break;
      case 'fourteen_days':
        days = 14;
        break;
      case 'thirty_days':
        days = 30;
        break;
      default:
        days = 0;
    }
    const snoozedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return snoozedUntil.toISOString();
  }

  _createVerificationEvent(domainId, contactProfileId, eventType, channel, description, metadata) {
    const events = this._getFromStorage('verification_events');
    const now = this._getCurrentDateTime();
    const event = {
      id: this._generateId('verification_event'),
      domainId: domainId,
      contactProfileId: contactProfileId || null,
      eventType: eventType,
      channel: channel || null,
      description: description || null,
      createdAt: now,
      metadata: metadata != null ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null
    };
    events.push(event);
    this._saveToStorage('verification_events', events);
    return event;
  }

  _updateDomainVerificationStatus(domainId, newStatus) {
    const domains = this._getFromStorage('domains');
    const idx = domains.findIndex(d => d.id === domainId);
    if (idx === -1) {
      return null;
    }
    const now = this._getCurrentDateTime();
    domains[idx].contactVerificationStatus = newStatus;
    domains[idx].updatedAt = now;
    this._saveToStorage('domains', domains);
    return domains[idx];
  }

  _getOrCreateNotificationPreference() {
    const prefs = this._getFromStorage('notification_preferences');
    let pref = prefs.find(p => p.category === 'contact_verification');
    const now = this._getCurrentDateTime();
    if (!pref) {
      pref = {
        id: this._generateId('notification_pref'),
        category: 'contact_verification',
        frequency: 'instant',
        deliveryChannels: ['email'],
        applyToScope: 'all_domains',
        createdAt: now,
        updatedAt: now
      };
      prefs.push(pref);
      this._saveToStorage('notification_preferences', prefs);
    }
    return pref;
  }

  _createBulkVerificationJob(domainIds, actionType) {
    const jobs = this._getFromStorage('bulk_verification_jobs');
    const now = this._getCurrentDateTime();
    const job = {
      id: this._generateId('bulk_verification_job'),
      actionType: actionType || 'resend_verification_notice',
      domainIds: Array.isArray(domainIds) ? domainIds.slice() : [],
      selectedCount: Array.isArray(domainIds) ? domainIds.length : 0,
      status: 'pending',
      initiatedFromPage: 'contact_verification_center',
      createdAt: now,
      completedAt: null
    };
    jobs.push(job);
    this._saveToStorage('bulk_verification_jobs', jobs);
    return job;
  }

  _findDomainById(domainId) {
    const domains = this._getFromStorage('domains');
    return domains.find(d => d.id === domainId) || null;
  }

  _findContactProfileById(profileId) {
    const profiles = this._getFromStorage('contact_profiles');
    return profiles.find(p => p.id === profileId) || null;
  }

  _attachContactProfileToDomain(domain, contactProfiles) {
    if (!domain) return null;
    const cps = contactProfiles || this._getFromStorage('contact_profiles');
    const cp = cps.find(p => p.id === domain.contactProfileId) || null;
    return Object.assign({}, domain, { contactProfile: cp });
  }

  _attachRefsToEvent(event, domainsCache, profilesCache) {
    if (!event) return null;
    const domains = domainsCache || this._getFromStorage('domains');
    const profiles = profilesCache || this._getFromStorage('contact_profiles');
    const domain = domains.find(d => d.id === event.domainId) || null;
    const contactProfile = event.contactProfileId ? (profiles.find(p => p.id === event.contactProfileId) || null) : null;
    return Object.assign({}, event, {
      domain: domain ? this._attachContactProfileToDomain(domain, profiles) : null,
      contactProfile: contactProfile
    });
  }

  _sameDay(dateIsoA, dateIsoB) {
    if (!dateIsoA || !dateIsoB) return false;
    const a = new Date(dateIsoA);
    const b = new Date(dateIsoB);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  // -----------------------------
  // Interface implementations
  // -----------------------------

  // getDashboardOverview()
  getDashboardOverview() {
    const domains = this._getFromStorage('domains');
    const totalDomains = domains.length;
    const domainsNeedingVerification = domains.filter(d => d.contactVerificationStatus === 'unverified' || d.contactVerificationStatus === 'pending_verification').length;
    const suspendedDomains = domains.filter(d => d.domainStatus === 'suspended').length;
    return {
      totalDomains: totalDomains,
      domainsNeedingVerification: domainsNeedingVerification,
      suspendedDomains: suspendedDomains
    };
  }

  // getDashboardAlertFilterOptions()
  getDashboardAlertFilterOptions() {
    return [
      {
        value: 'all',
        label: 'All Alerts',
        description: 'Show all alerts and notices.'
      },
      {
        value: 'contact_verification_only',
        label: 'Contact Verification Only',
        description: 'Show only contact verification alerts.'
      }
    ];
  }

  // getDashboardAlerts(alertTypeFilter, includeSnoozed, page, pageSize)
  getDashboardAlerts(alertTypeFilter, includeSnoozed, page, pageSize) {
    const alertFilter = alertTypeFilter || 'all';
    const includeS = !!includeSnoozed;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const domains = this._getFromStorage('domains');
    const snoozes = this._getFromStorage('verification_banner_snoozes');
    const nowIso = this._getCurrentDateTime();
    const now = new Date(nowIso);

    let alerts = [];

    for (const d of domains) {
      // Only domains that are not fully verified should have contact verification alerts
      if (d.contactVerificationStatus === 'verified') continue;

      const domainSnoozes = snoozes.filter(s => s.domainId === d.id && s.alertType === 'contact_verification');
      let activeSnooze = null;
      if (domainSnoozes.length > 0) {
        // choose the one with the latest snoozedUntil
        activeSnooze = domainSnoozes.reduce((acc, cur) => {
          if (!acc) return cur;
          return new Date(cur.snoozedUntil) > new Date(acc.snoozedUntil) ? cur : acc;
        }, null);
      }
      const isSnoozed = !!activeSnooze && new Date(activeSnooze.snoozedUntil) > now;
      if (!includeS && isSnoozed) {
        continue;
      }

      const alertType = 'contact_verification';
      if (alertFilter === 'contact_verification_only' || alertFilter === 'all') {
        const priority = d.contactVerificationStatus === 'suspended' ? 'high' : 'normal';
        const alert = {
          alertId: this._generateId('alert'), // transient id for UI
          domainId: d.id,
          domainName: d.name,
          alertType: alertType,
          contactVerificationStatus: d.contactVerificationStatus,
          autoRenewEnabled: d.autoRenewEnabled,
          expirationDate: d.expirationDate,
          isSnoozed: isSnoozed,
          snoozedUntil: activeSnooze ? activeSnooze.snoozedUntil : null,
          priority: priority,
          domain: this._attachContactProfileToDomain(d)
        };
        alerts.push(alert);
      }
    }

    const totalCount = alerts.length;
    const start = (currentPage - 1) * size;
    const pagedAlerts = alerts.slice(start, start + size);

    return {
      alerts: pagedAlerts,
      totalCount: totalCount
    };
  }

  // snoozeVerificationBanner(domainId, snoozeDuration, applyScope)
  snoozeVerificationBanner(domainId, snoozeDuration, applyScope) {
    const domains = this._getFromStorage('domains');
    const domain = domains.find(d => d.id === domainId) || null;
    if (!domain) {
      return {
        success: false,
        message: 'Domain not found.',
        snooze: null
      };
    }

    const snoozes = this._getFromStorage('verification_banner_snoozes');
    const now = this._getCurrentDateTime();
    const snoozedUntil = this._calculateSnoozeUntil(snoozeDuration);

    let snooze = snoozes.find(s => s.domainId === domainId && s.alertType === 'contact_verification');
    if (!snooze) {
      snooze = {
        id: this._generateId('verification_snooze'),
        domainId: domainId,
        alertType: 'contact_verification',
        snoozeDuration: snoozeDuration,
        snoozedUntil: snoozedUntil,
        applyScope: applyScope,
        createdAt: now,
        updatedAt: now
      };
      snoozes.push(snooze);
    } else {
      snooze.snoozeDuration = snoozeDuration;
      snooze.snoozedUntil = snoozedUntil;
      snooze.applyScope = applyScope;
      snooze.updatedAt = now;
    }

    this._saveToStorage('verification_banner_snoozes', snoozes);

    // Create verification event
    this._createVerificationEvent(domainId, domain.contactProfileId, 'banner_snoozed', 'ui', 'Contact verification banner snoozed', {
      snoozeDuration: snoozeDuration,
      applyScope: applyScope
    });

    return {
      success: true,
      message: 'Verification banner snoozed successfully.',
      snooze: Object.assign({}, snooze, { domain: this._attachContactProfileToDomain(domain) })
    };
  }

  // getMyDomainsFilterOptions()
  getMyDomainsFilterOptions() {
    return {
      expirationWindowOptions: [
        { value: 'all', label: 'All Domains' },
        { value: 'within_30_days', label: 'Expiring within 30 days' },
        { value: 'within_60_days', label: 'Expiring within 60 days' },
        { value: 'expired', label: 'Expired' }
      ],
      sortOptions: [
        { value: 'domain_name', label: 'Domain Name' },
        { value: 'expiration_date', label: 'Expiration Date' },
        { value: 'registration_date', label: 'Registration Date' }
      ]
    };
  }

  // getMyDomainsList(searchQuery, expirationWindow, sortBy, sortDirection, page, pageSize)
  getMyDomainsList(searchQuery, expirationWindow, sortBy, sortDirection, page, pageSize) {
    const query = (searchQuery || '').toLowerCase().trim();
    const windowFilter = expirationWindow || 'all';
    const sortField = sortBy || 'domain_name';
    const direction = (sortDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const domainsRaw = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const now = new Date();

    let filtered = domainsRaw.slice();

    if (query) {
      filtered = filtered.filter(d => d.name.toLowerCase().includes(query));
    }

    if (windowFilter !== 'all') {
      filtered = filtered.filter(d => {
        const exp = new Date(d.expirationDate);
        const diffMs = exp.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (windowFilter === 'within_30_days') {
          return diffDays >= 0 && diffDays <= 30;
        }
        if (windowFilter === 'within_60_days') {
          return diffDays >= 0 && diffDays <= 60;
        }
        if (windowFilter === 'expired') {
          return diffDays < 0;
        }
        return true;
      });
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'domain_name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'expiration_date') {
        cmp = new Date(a.expirationDate) - new Date(b.expirationDate);
      } else if (sortField === 'registration_date') {
        cmp = new Date(a.registrationDate) - new Date(b.registrationDate);
      }
      return direction === 'asc' ? cmp : -cmp;
    });

    const totalCount = filtered.length;
    const start = (currentPage - 1) * size;
    const pageDomains = filtered.slice(start, start + size);

    const result = pageDomains.map(d => {
      let badgeLabel = 'Verify Contact';
      if (d.contactVerificationStatus === 'suspended' || d.domainStatus === 'suspended') {
        badgeLabel = 'Suspended - Verify Contact';
      } else if (d.contactVerificationStatus === 'unverified' || d.contactVerificationStatus === 'pending_verification') {
        badgeLabel = 'Contact Verification Required';
      } else if (d.contactVerificationStatus === 'pending_review') {
        badgeLabel = 'Pending Review';
      } else if (d.contactVerificationStatus === 'verified') {
        badgeLabel = 'Contact Verified';
      }
      const domainWithCP = this._attachContactProfileToDomain(d, contactProfiles);
      return {
        domain: domainWithCP,
        verificationBadgeLabel: badgeLabel
      };
    });

    return {
      domains: result,
      totalCount: totalCount
    };
  }

  // getDomainDetails(domainId)
  getDomainDetails(domainId) {
    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const domain = domains.find(d => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        contactProfileSummary: null
      };
    }
    const contactProfile = contactProfiles.find(cp => cp.id === domain.contactProfileId) || null;
    const domainWithCP = this._attachContactProfileToDomain(domain, contactProfiles);
    const contactProfileSummary = contactProfile
      ? {
          contactProfileId: contactProfile.id,
          displayName: contactProfile.displayName,
          contactType: contactProfile.contactType,
          verificationStatus: contactProfile.verificationStatus
        }
      : null;

    return {
      domain: domainWithCP,
      contactProfileSummary: contactProfileSummary
    };
  }

  // getDomainContactInformation(domainId)
  getDomainContactInformation(domainId) {
    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const domain = domains.find(d => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        contactProfile: null
      };
    }
    const contactProfile = contactProfiles.find(cp => cp.id === domain.contactProfileId) || null;
    const domainWithCP = this._attachContactProfileToDomain(domain, contactProfiles);
    return {
      domain: domainWithCP,
      contactProfile: contactProfile
    };
  }

  // getContactProfilesForSelection(showVerifiedOnly, contactType)
  getContactProfilesForSelection(showVerifiedOnly, contactType) {
    const profiles = this._getFromStorage('contact_profiles');
    const showVerified = !!showVerifiedOnly;
    const typeFilter = contactType || null;
    return profiles.filter(p => {
      if (showVerified && p.verificationStatus !== 'verified') return false;
      if (typeFilter && p.contactType !== typeFilter) return false;
      return true;
    });
  }

  // changeDomainContactProfile(domainId, contactProfileId)
  changeDomainContactProfile(domainId, contactProfileId) {
    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const dIdx = domains.findIndex(d => d.id === domainId);
    if (dIdx === -1) {
      return {
        success: false,
        message: 'Domain not found.',
        domain: null,
        contactProfile: null
      };
    }
    const contactProfile = contactProfiles.find(cp => cp.id === contactProfileId) || null;
    if (!contactProfile) {
      return {
        success: false,
        message: 'Contact profile not found.',
        domain: null,
        contactProfile: null
      };
    }
    const now = this._getCurrentDateTime();
    domains[dIdx].contactProfileId = contactProfileId;
    domains[dIdx].contactType = contactProfile.contactType;
    // Optionally align verification status with profile
    domains[dIdx].contactVerificationStatus = contactProfile.verificationStatus;
    domains[dIdx].updatedAt = now;
    this._saveToStorage('domains', domains);

    this._createVerificationEvent(domainId, contactProfileId, 'status_changed', 'system', 'Domain contact profile changed', {
      newContactProfileId: contactProfileId
    });

    const updatedDomainWithCP = this._attachContactProfileToDomain(domains[dIdx], contactProfiles);

    return {
      success: true,
      message: 'Contact profile updated successfully.',
      domain: updatedDomainWithCP,
      contactProfile: contactProfile
    };
  }

  // getContactVerificationCenterOptions()
  getContactVerificationCenterOptions() {
    return {
      statusFilterOptions: [
        { value: 'all', label: 'All Statuses' },
        { value: 'unverified_only', label: 'Unverified Only' },
        { value: 'verified_only', label: 'Verified Only' },
        { value: 'pending_verification', label: 'Pending Verification' },
        { value: 'pending_review', label: 'Pending Review' },
        { value: 'suspended_only', label: 'Suspended Only' }
      ],
      dateFilterOptions: [
        { value: 'all', label: 'All Dates' },
        { value: 'reminders_sent_today', label: 'Reminders Sent Today' },
        { value: 'verification_sent_today', label: 'Verification Emails Sent Today' }
      ],
      sortOptions: [
        { value: 'registration_date_newest_first', label: 'Registration Date - Newest First' },
        { value: 'registration_date_oldest_first', label: 'Registration Date - Oldest First' },
        { value: 'domain_name_asc', label: 'Domain Name A-Z' },
        { value: 'domain_name_desc', label: 'Domain Name Z-A' }
      ]
    };
  }

  // getContactVerificationDomains(statusFilter, dateFilter, sortBy, searchQuery, page, pageSize)
  getContactVerificationDomains(statusFilter, dateFilter, sortBy, searchQuery, page, pageSize) {
    const status = statusFilter || 'all';
    const dateF = dateFilter || 'all';
    const sort = sortBy || 'registration_date_newest_first';
    const query = (searchQuery || '').toLowerCase().trim();
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const domainsRaw = this._getFromStorage('domains');
    const events = this._getFromStorage('verification_events');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const todayIso = this._getCurrentDateTime();

    let filtered = domainsRaw.slice();

    if (query) {
      filtered = filtered.filter(d => d.name.toLowerCase().includes(query));
    }

    if (status === 'unverified_only') {
      filtered = filtered.filter(d => d.contactVerificationStatus === 'unverified');
    } else if (status === 'verified_only') {
      filtered = filtered.filter(d => d.contactVerificationStatus === 'verified');
    } else if (status === 'pending_verification') {
      filtered = filtered.filter(d => d.contactVerificationStatus === 'pending_verification');
    } else if (status === 'pending_review') {
      filtered = filtered.filter(d => d.contactVerificationStatus === 'pending_review');
    } else if (status === 'suspended_only') {
      filtered = filtered.filter(d => d.contactVerificationStatus === 'suspended');
    }

    if (dateF === 'reminders_sent_today') {
      filtered = filtered.filter(d => this._sameDay(d.lastVerificationReminderSentAt, todayIso));
    } else if (dateF === 'verification_sent_today') {
      filtered = filtered.filter(d => this._sameDay(d.lastVerificationEmailSentAt, todayIso));
    }

    filtered.sort((a, b) => {
      if (sort === 'registration_date_newest_first') {
        return new Date(b.registrationDate) - new Date(a.registrationDate);
      }
      if (sort === 'registration_date_oldest_first') {
        return new Date(a.registrationDate) - new Date(b.registrationDate);
      }
      if (sort === 'domain_name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'domain_name_desc') {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });

    const totalCount = filtered.length;
    const start = (currentPage - 1) * size;
    const pageDomains = filtered.slice(start, start + size);

    const items = pageDomains.map(d => {
      const domainEvents = events.filter(e => e.domainId === d.id);
      let latestEvent = null;
      if (domainEvents.length > 0) {
        latestEvent = domainEvents.reduce((acc, cur) => {
          if (!acc) return cur;
          return new Date(cur.createdAt) > new Date(acc.createdAt) ? cur : acc;
        }, null);
      }
      const domainWithCP = this._attachContactProfileToDomain(d, contactProfiles);
      const latestEventWithRefs = latestEvent ? this._attachRefsToEvent(latestEvent, domainsRaw, contactProfiles) : null;
      return {
        domain: domainWithCP,
        latestVerificationEvent: latestEventWithRefs
      };
    });

    return {
      domains: items,
      totalCount: totalCount
    };
  }

  // resendVerificationNoticesBulk(domainIds)
  resendVerificationNoticesBulk(domainIds) {
    const domainIdList = Array.isArray(domainIds) ? domainIds.slice() : [];
    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const now = this._getCurrentDateTime();

    const job = this._createBulkVerificationJob(domainIdList, 'resend_verification_notice');

    const perDomainResults = [];
    const updatedDomains = domains.slice();

    for (const id of domainIdList) {
      const idx = updatedDomains.findIndex(d => d.id === id);
      if (idx === -1) {
        perDomainResults.push({
          domainId: id,
          success: false,
          message: 'Domain not found.',
          lastVerificationReminderSentAt: null
        });
        continue;
      }
      updatedDomains[idx].lastVerificationReminderSentAt = now;
      updatedDomains[idx].updatedAt = now;
      this._createVerificationEvent(id, updatedDomains[idx].contactProfileId, 'verification_reminder_sent', 'email', 'Verification reminder sent (bulk)', {
        bulkJobId: job.id
      });
      perDomainResults.push({
        domainId: id,
        success: true,
        message: 'Verification reminder sent.',
        lastVerificationReminderSentAt: now
      });
    }

    this._saveToStorage('domains', updatedDomains);

    // Mark job completed
    const jobs = this._getFromStorage('bulk_verification_jobs');
    const jIdx = jobs.findIndex(j => j.id === job.id);
    if (jIdx !== -1) {
      jobs[jIdx].status = 'completed';
      jobs[jIdx].completedAt = now;
      this._saveToStorage('bulk_verification_jobs', jobs);
    }

    const jobDomains = domainIdList.map(id => domains.find(d => d.id === id) || null).filter(Boolean);
    const jobWithRefs = Object.assign({}, job, {
      domains: jobDomains.map(d => this._attachContactProfileToDomain(d, contactProfiles))
    });

    return {
      job: jobWithRefs,
      perDomainResults: perDomainResults
    };
  }

  // getContactVerificationNotice(domainId)
  getContactVerificationNotice(domainId) {
    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const domain = domains.find(d => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        contactProfile: null,
        requiredActions: [],
        validationErrors: []
      };
    }
    const contactProfile = contactProfiles.find(cp => cp.id === domain.contactProfileId) || null;

    const requiredActions = [];
    const validationErrors = [];

    if (!contactProfile || !contactProfile.email || contactProfile.email.indexOf('@') === -1) {
      requiredActions.push('Provide a valid contact email address.');
      validationErrors.push({ field: 'email', message: 'A valid email address is required.' });
    }

    if (contactProfile && contactProfile.phoneNumber && !contactProfile.phoneCountry) {
      requiredActions.push('Select a country for the provided phone number.');
      validationErrors.push({ field: 'phoneCountry', message: 'Phone country is required when phone number is provided.' });
    }

    if (contactProfile && contactProfile.contactType === 'business_organization' && !contactProfile.organizationName) {
      requiredActions.push('Enter an organization name for the business contact.');
      validationErrors.push({ field: 'organizationName', message: 'Organization name is required for business contacts.' });
    }

    if (domain.contactVerificationStatus === 'suspended') {
      requiredActions.push('Resolve the suspension by correcting contact details and submitting for review.');
    }

    const domainWithCP = this._attachContactProfileToDomain(domain, contactProfiles);

    return {
      domain: domainWithCP,
      contactProfile: contactProfile,
      requiredActions: requiredActions,
      validationErrors: validationErrors
    };
  }

  // updateContactEmailOnNotice(domainId, newEmail)
  updateContactEmailOnNotice(domainId, newEmail) {
    const email = (newEmail || '').trim();
    if (!email || email.indexOf('@') === -1) {
      return {
        success: false,
        message: 'Invalid email address.',
        contactProfile: null
      };
    }
    const contactProfiles = this._getFromStorage('contact_profiles');
    const domains = this._getFromStorage('domains');
    const domain = domains.find(d => d.id === domainId) || null;
    if (!domain) {
      return {
        success: false,
        message: 'Domain not found.',
        contactProfile: null
      };
    }
    const idx = contactProfiles.findIndex(cp => cp.id === domain.contactProfileId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Contact profile not found.',
        contactProfile: null
      };
    }
    const now = this._getCurrentDateTime();
    const oldEmail = contactProfiles[idx].email;
    contactProfiles[idx].email = email;
    contactProfiles[idx].updatedAt = now;
    this._saveToStorage('contact_profiles', contactProfiles);

    this._createVerificationEvent(domainId, contactProfiles[idx].id, 'contact_email_updated', 'ui', 'Contact email updated on verification notice', {
      oldEmail: oldEmail || null,
      newEmail: email
    });

    return {
      success: true,
      message: 'Contact email updated successfully.',
      contactProfile: contactProfiles[idx]
    };
  }

  // sendVerificationEmail(domainId)
  sendVerificationEmail(domainId) {
    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const dIdx = domains.findIndex(d => d.id === domainId);
    if (dIdx === -1) {
      return {
        success: false,
        message: 'Domain not found.',
        verificationEmailSentAt: null,
        domain: null
      };
    }
    const domain = domains[dIdx];
    const contactProfile = contactProfiles.find(cp => cp.id === domain.contactProfileId) || null;
    if (!contactProfile || !contactProfile.email || contactProfile.email.indexOf('@') === -1) {
      return {
        success: false,
        message: 'Valid contact email is required before sending verification.',
        verificationEmailSentAt: null,
        domain: this._attachContactProfileToDomain(domain, contactProfiles)
      };
    }

    const now = this._getCurrentDateTime();
    domains[dIdx].lastVerificationEmailSentAt = now;
    domains[dIdx].updatedAt = now;
    if (domains[dIdx].contactVerificationStatus === 'suspended') {
      domains[dIdx].contactVerificationStatus = 'pending_verification';
    }
    this._saveToStorage('domains', domains);

    this._createVerificationEvent(domainId, contactProfile.id, 'verification_email_sent', 'email', 'Verification Email Sent', {
      email: contactProfile.email
    });

    const updatedDomainWithCP = this._attachContactProfileToDomain(domains[dIdx], contactProfiles);

    return {
      success: true,
      message: 'Verification email sent.',
      verificationEmailSentAt: now,
      domain: updatedDomainWithCP
    };
  }

  // updateContactPhoneOnNotice(domainId, phoneNumber, phoneCountry)
  updateContactPhoneOnNotice(domainId, phoneNumber, phoneCountry) {
    const phone = (phoneNumber || '').trim();
    const country = (phoneCountry || '').trim();
    if (!phone) {
      return {
        success: false,
        message: 'Phone number is required.',
        contactProfile: null
      };
    }
    if (!country) {
      return {
        success: false,
        message: 'Phone country is required.',
        contactProfile: null
      };
    }

    const contactProfiles = this._getFromStorage('contact_profiles');
    const domains = this._getFromStorage('domains');
    const domain = domains.find(d => d.id === domainId) || null;
    if (!domain) {
      return {
        success: false,
        message: 'Domain not found.',
        contactProfile: null
      };
    }
    const idx = contactProfiles.findIndex(cp => cp.id === domain.contactProfileId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Contact profile not found.',
        contactProfile: null
      };
    }

    const now = this._getCurrentDateTime();
    contactProfiles[idx].phoneNumber = phone;
    contactProfiles[idx].phoneCountry = country;
    contactProfiles[idx].updatedAt = now;
    this._saveToStorage('contact_profiles', contactProfiles);

    this._createVerificationEvent(domainId, contactProfiles[idx].id, 'contact_phone_updated', 'ui', 'Contact phone updated on verification notice', {
      phoneNumber: phone,
      phoneCountry: country
    });

    return {
      success: true,
      message: 'Contact phone updated successfully.',
      contactProfile: contactProfiles[idx]
    };
  }

  // submitContactVerificationForReview(domainId)
  submitContactVerificationForReview(domainId) {
    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const dIdx = domains.findIndex(d => d.id === domainId);
    if (dIdx === -1) {
      return {
        success: false,
        message: 'Domain not found.',
        domain: null,
        contactProfile: null
      };
    }
    const domain = domains[dIdx];
    const cpIdx = contactProfiles.findIndex(cp => cp.id === domain.contactProfileId);
    if (cpIdx === -1) {
      return {
        success: false,
        message: 'Contact profile not found.',
        domain: null,
        contactProfile: null
      };
    }

    const now = this._getCurrentDateTime();
    domains[dIdx].contactVerificationStatus = 'pending_review';
    domains[dIdx].updatedAt = now;
    contactProfiles[cpIdx].verificationStatus = 'pending_review';
    contactProfiles[cpIdx].updatedAt = now;
    this._saveToStorage('domains', domains);
    this._saveToStorage('contact_profiles', contactProfiles);

    this._createVerificationEvent(domainId, contactProfiles[cpIdx].id, 'verification_submitted', 'ui', 'Contact verification submitted for review', null);

    const updatedDomainWithCP = this._attachContactProfileToDomain(domains[dIdx], contactProfiles);

    return {
      success: true,
      message: 'Contact information submitted for review.',
      domain: updatedDomainWithCP,
      contactProfile: contactProfiles[cpIdx]
    };
  }

  // updateContactTypeOnNotice(domainId, contactType, organizationName, jobTitle)
  updateContactTypeOnNotice(domainId, contactType, organizationName, jobTitle) {
    const type = contactType;
    if (type !== 'individual' && type !== 'business_organization') {
      return {
        success: false,
        message: 'Invalid contact type.',
        domain: null,
        contactProfile: null
      };
    }

    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const dIdx = domains.findIndex(d => d.id === domainId);
    if (dIdx === -1) {
      return {
        success: false,
        message: 'Domain not found.',
        domain: null,
        contactProfile: null
      };
    }
    const domain = domains[dIdx];
    const cpIdx = contactProfiles.findIndex(cp => cp.id === domain.contactProfileId);
    if (cpIdx === -1) {
      return {
        success: false,
        message: 'Contact profile not found.',
        domain: null,
        contactProfile: null
      };
    }

    const now = this._getCurrentDateTime();
    contactProfiles[cpIdx].contactType = type;
    contactProfiles[cpIdx].organizationName = type === 'business_organization' ? (organizationName || '').trim() : null;
    contactProfiles[cpIdx].jobTitle = jobTitle ? jobTitle.trim() : contactProfiles[cpIdx].jobTitle;
    contactProfiles[cpIdx].updatedAt = now;

    domains[dIdx].contactType = type;
    domains[dIdx].updatedAt = now;

    this._saveToStorage('contact_profiles', contactProfiles);
    this._saveToStorage('domains', domains);

    this._createVerificationEvent(domainId, contactProfiles[cpIdx].id, 'contact_type_changed', 'ui', 'Contact type updated on verification notice', {
      contactType: type,
      organizationName: contactProfiles[cpIdx].organizationName,
      jobTitle: contactProfiles[cpIdx].jobTitle
    });

    const updatedDomainWithCP = this._attachContactProfileToDomain(domains[dIdx], contactProfiles);

    return {
      success: true,
      message: 'Contact type updated successfully.',
      domain: updatedDomainWithCP,
      contactProfile: contactProfiles[cpIdx]
    };
  }

  // getVerificationStatusDetail(domainId)
  getVerificationStatusDetail(domainId) {
    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const events = this._getFromStorage('verification_events');

    const domain = domains.find(d => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        contactProfile: null,
        overview: null,
        history: []
      };
    }
    const contactProfile = contactProfiles.find(cp => cp.id === domain.contactProfileId) || null;
    const domainWithCP = this._attachContactProfileToDomain(domain, contactProfiles);

    const overview = {
      currentStatus: domain.contactVerificationStatus,
      lastVerificationEmailSentAt: domain.lastVerificationEmailSentAt || null,
      lastVerificationReminderSentAt: domain.lastVerificationReminderSentAt || null
    };

    const historyRaw = events.filter(e => e.domainId === domainId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const history = historyRaw.map(e => this._attachRefsToEvent(e, domains, contactProfiles));

    return {
      domain: domainWithCP,
      contactProfile: contactProfile,
      overview: overview,
      history: history
    };
  }

  // resendVerificationNotice(domainId, sendMode)
  resendVerificationNotice(domainId, sendMode) {
    const mode = sendMode || 'current_email_only';
    if (mode !== 'current_email_only') {
      return {
        allowed: false,
        success: false,
        message: 'Unsupported send mode.',
        verificationEmailSentAt: null,
        newHistoryEvent: null
      };
    }

    const domains = this._getFromStorage('domains');
    const contactProfiles = this._getFromStorage('contact_profiles');
    const events = this._getFromStorage('verification_events');

    const dIdx = domains.findIndex(d => d.id === domainId);
    if (dIdx === -1) {
      return {
        allowed: false,
        success: false,
        message: 'Domain not found.',
        verificationEmailSentAt: null,
        newHistoryEvent: null
      };
    }

    const domain = domains[dIdx];
    const contactProfile = contactProfiles.find(cp => cp.id === domain.contactProfileId) || null;
    // Determine email to use for resend (if available)
    let emailForSend = null;
    if (contactProfile && contactProfile.email && contactProfile.email.indexOf('@') !== -1) {
      emailForSend = contactProfile.email;
    } else {
      // Fall back to last known email from previous verification_email_sent events (if any)
      const domainEmailEvents = events.filter(e => e.domainId === domainId && e.eventType === 'verification_email_sent');
      if (domainEmailEvents.length > 0) {
        const latestEmailEvent = domainEmailEvents.reduce((acc, cur) => {
          if (!acc) return cur;
          return new Date(cur.createdAt) > new Date(acc.createdAt) ? cur : acc;
        }, null);
        if (latestEmailEvent && typeof latestEmailEvent.metadata === 'string') {
          const match = latestEmailEvent.metadata.match(/email=([^;]+)/);
          if (match && match[1]) {
            emailForSend = match[1];
          }
        }
      }
    }

    // Find latest verification_email_sent or verification_reminder_sent event
    const domainEvents = events.filter(e => e.domainId === domainId && (e.eventType === 'verification_email_sent' || e.eventType === 'verification_reminder_sent'));
    let lastAttemptAt = null;
    if (domainEvents.length > 0) {
      lastAttemptAt = domainEvents.reduce((acc, cur) => {
        if (!acc) return cur.createdAt;
        return new Date(cur.createdAt) > new Date(acc) ? cur.createdAt : acc;
      }, null);
    }

    const nowIso = this._getCurrentDateTime();
    if (lastAttemptAt) {
      const lastDate = new Date(lastAttemptAt);
      const now = new Date(nowIso);
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const MIN_INTERVAL_DAYS = 7;
      if (diffDays < MIN_INTERVAL_DAYS) {
        return {
          allowed: false,
          success: false,
          message: 'Verification email was sent less than 7 days ago.',
          verificationEmailSentAt: lastAttemptAt,
          newHistoryEvent: null
        };
      }
    }

    // Allowed to resend
    domains[dIdx].lastVerificationEmailSentAt = nowIso;
    domains[dIdx].updatedAt = nowIso;
    if (domains[dIdx].contactVerificationStatus === 'unverified' || domains[dIdx].contactVerificationStatus === 'suspended') {
      domains[dIdx].contactVerificationStatus = 'pending_verification';
    }
    this._saveToStorage('domains', domains);

    const newEvent = this._createVerificationEvent(domainId, contactProfile ? contactProfile.id : null, 'verification_email_sent', 'email', 'Verification Email Resent', {
      email: emailForSend,
      resend: true
    });

    const newEventWithRefs = this._attachRefsToEvent(newEvent, domains, contactProfiles);

    return {
      allowed: true,
      success: true,
      message: 'Verification email resent.',
      verificationEmailSentAt: nowIso,
      newHistoryEvent: newEventWithRefs
    };
  }

  // getContactVerificationNotificationPreferences()
  getContactVerificationNotificationPreferences() {
    const preference = this._getOrCreateNotificationPreference();

    const frequencyOptions = [
      { value: 'off', label: 'Off' },
      { value: 'instant', label: 'Instant' },
      { value: 'daily_summary', label: 'Daily Summary' },
      { value: 'weekly_summary', label: 'Weekly Summary' }
    ];

    const deliveryChannelOptions = [
      { value: 'email', label: 'Email' },
      { value: 'sms', label: 'SMS' },
      { value: 'in_app', label: 'In-app' }
    ];

    const applyToScopeOptions = [
      { value: 'all_domains', label: 'All Domains' },
      { value: 'pending_verification_only', label: 'Domains with Pending Verification Only' },
      { value: 'unverified_only', label: 'Unverified Domains Only' }
    ];

    return {
      preference: preference,
      frequencyOptions: frequencyOptions,
      deliveryChannelOptions: deliveryChannelOptions,
      applyToScopeOptions: applyToScopeOptions
    };
  }

  // updateContactVerificationNotificationPreferences(frequency, deliveryChannels, applyToScope)
  updateContactVerificationNotificationPreferences(frequency, deliveryChannels, applyToScope) {
    const allowedFrequencies = ['off', 'instant', 'daily_summary', 'weekly_summary'];
    const allowedChannels = ['email', 'sms', 'in_app'];
    const allowedScopes = ['all_domains', 'pending_verification_only', 'unverified_only'];

    if (allowedFrequencies.indexOf(frequency) === -1) {
      return {
        success: false,
        message: 'Invalid frequency.',
        preference: null
      };
    }
    if (allowedScopes.indexOf(applyToScope) === -1) {
      return {
        success: false,
        message: 'Invalid applyToScope value.',
        preference: null
      };
    }

    const uniqueChannels = Array.isArray(deliveryChannels) ? Array.from(new Set(deliveryChannels)) : [];
    const filteredChannels = uniqueChannels.filter(c => allowedChannels.indexOf(c) !== -1);

    const prefs = this._getFromStorage('notification_preferences');
    let pref = prefs.find(p => p.category === 'contact_verification');
    const now = this._getCurrentDateTime();

    if (!pref) {
      pref = {
        id: this._generateId('notification_pref'),
        category: 'contact_verification',
        frequency: frequency,
        deliveryChannels: filteredChannels,
        applyToScope: applyToScope,
        createdAt: now,
        updatedAt: now
      };
      prefs.push(pref);
    } else {
      pref.frequency = frequency;
      pref.deliveryChannels = filteredChannels;
      pref.applyToScope = applyToScope;
      pref.updatedAt = now;
    }

    this._saveToStorage('notification_preferences', prefs);

    return {
      success: true,
      message: 'Notification preferences updated.',
      preference: pref
    };
  }

  // getCollaborators()
  getCollaborators() {
    const collaborators = this._getFromStorage('collaborators');
    return collaborators;
  }

  // getCollaboratorPermissionOptions()
  getCollaboratorPermissionOptions() {
    return [
      {
        value: 'view_domains',
        label: 'View Domains',
        description: 'Allows viewing domain lists and details.'
      },
      {
        value: 'manage_contact_verification_notices',
        label: 'Manage Contact Verification Notices',
        description: 'Allows managing contact verification notices and actions.'
      },
      {
        value: 'manage_dns',
        label: 'Manage DNS',
        description: 'Allows editing DNS records.'
      },
      {
        value: 'transfer_domains',
        label: 'Transfer Domains',
        description: 'Allows initiating and approving domain transfers.'
      },
      {
        value: 'billing_and_payments',
        label: 'Billing & Payments',
        description: 'Allows access to billing and payment settings.'
      }
    ];
  }

  // inviteCollaborator(email, roleLabel, permissions)
  inviteCollaborator(email, roleLabel, permissions) {
    const addr = (email || '').trim();
    const label = (roleLabel || '').trim();
    if (!addr || addr.indexOf('@') === -1) {
      return {
        success: false,
        message: 'Invalid collaborator email.',
        collaborator: null
      };
    }
    if (!label) {
      return {
        success: false,
        message: 'Role label is required.',
        collaborator: null
      };
    }

    const allowedPermissions = ['view_domains', 'manage_contact_verification_notices', 'manage_dns', 'transfer_domains', 'billing_and_payments'];
    const uniquePermissions = Array.isArray(permissions) ? Array.from(new Set(permissions)) : [];
    const filteredPermissions = uniquePermissions.filter(p => allowedPermissions.indexOf(p) !== -1);
    if (filteredPermissions.length === 0) {
      return {
        success: false,
        message: 'At least one valid permission is required.',
        collaborator: null
      };
    }

    const collaborators = this._getFromStorage('collaborators');
    const now = this._getCurrentDateTime();

    const collaborator = {
      id: this._generateId('collaborator'),
      email: addr,
      roleLabel: label,
      permissions: filteredPermissions,
      status: 'invited',
      invitedAt: now,
      acceptedAt: null,
      createdAt: now,
      updatedAt: now
    };

    collaborators.push(collaborator);
    this._saveToStorage('collaborators', collaborators);

    return {
      success: true,
      message: 'Collaborator invited successfully.',
      collaborator: collaborator
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const key = (pageKey || '').trim();
    const pages = this._getFromStorage('static_pages', {});
    if (pages[key]) {
      return pages[key];
    }
    const now = this._getCurrentDateTime();
    const page = {
      title: key || 'Page',
      bodyHtml: '<p>Content not available.</p>',
      lastUpdatedAt: now
    };
    pages[key] = page;
    this._saveToStorage('static_pages', pages);
    return page;
  }

  // getHelpSupportContent()
  getHelpSupportContent() {
    const content = this._getFromStorage('help_support_content', { faqSections: [] });
    return content;
  }

  // getContactUsInfo()
  getContactUsInfo() {
    const info = this._getFromStorage('contact_us_info', {
      supportEmail: '',
      supportPhone: '',
      businessHours: '',
      hasSupportForm: false,
      topicOptions: []
    });
    return info;
  }

  // submitSupportRequest(subject, message, topicKey, preferredContactMethod, relatedDomainName)
  submitSupportRequest(subject, message, topicKey, preferredContactMethod, relatedDomainName) {
    const subj = (subject || '').trim();
    const msg = (message || '').trim();
    if (!subj || !msg) {
      return {
        success: false,
        message: 'Subject and message are required.',
        caseId: null
      };
    }

    const requests = this._getFromStorage('support_requests');
    const now = this._getCurrentDateTime();

    const request = {
      id: this._generateId('support_request'),
      subject: subj,
      message: msg,
      topicKey: topicKey || null,
      preferredContactMethod: preferredContactMethod || null,
      relatedDomainName: relatedDomainName || null,
      createdAt: now
    };

    requests.push(request);
    this._saveToStorage('support_requests', requests);

    return {
      success: true,
      message: 'Support request submitted.',
      caseId: request.id
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
