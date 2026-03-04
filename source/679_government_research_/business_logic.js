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
  }

  // -----------------------------
  // Storage helpers
  // -----------------------------
  _initStorage() {
    const keys = [
      'fundingprograms',
      'fundingcalls',
      'savedopportunities',
      'applications',
      'budgetlineitems',
      'fundedprojects',
      'events',
      'eventregistrations',
      'helpcategories',
      'helparticles',
      'savedhelparticles',
      'fundingalerts',
      'messages',
      'profiles'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // -----------------------------
  // Label helpers
  // -----------------------------
  _researchAreaLabel(value) {
    const map = {
      environment_climate: 'Environment & Climate',
      information_communication_technologies: 'Information & Communication Technologies',
      health: 'Health',
      social_sciences: 'Social Sciences',
      engineering: 'Engineering',
      multidisciplinary: 'Multidisciplinary',
      other: 'Other'
    };
    return map[value] || 'Other';
  }

  _fundingTypeLabel(value) {
    const map = {
      individual_research_grant: 'Individual Research Grant',
      collaborative_project: 'Collaborative Project',
      fellowship: 'Fellowship',
      infrastructure: 'Research Infrastructure',
      training: 'Training',
      other: 'Other'
    };
    return map[value] || 'Other';
  }

  _geographicScopeLabel(value) {
    const map = {
      national: 'National',
      international: 'International',
      regional: 'Regional',
      local: 'Local',
      multiple_countries: 'Multiple Countries',
      unspecified: 'Unspecified',
      any: 'Any'
    };
    return map[value] || 'Unspecified';
  }

  _hostOrganizationTypeLabel(value) {
    const map = {
      government_agency: 'Government Agency',
      funding_agency: 'Funding Agency',
      university: 'University',
      research_institute: 'Research Institute',
      nonprofit: 'Nonprofit',
      company: 'Company',
      other: 'Other'
    };
    return map[value] || 'Other';
  }

  _eventTypeLabel(value) {
    const map = {
      webinar_online: 'Webinar (online)',
      workshop_in_person: 'Workshop (in person)',
      hybrid: 'Hybrid event',
      conference: 'Conference',
      other: 'Other'
    };
    return map[value] || 'Other';
  }

  _leadOrganizationTypeLabel(value) {
    const map = {
      university_higher_education: 'University / Higher Education',
      research_institute: 'Research Institute',
      nonprofit: 'Nonprofit',
      company: 'Company',
      government: 'Government',
      other: 'Other'
    };
    return map[value] || 'Other';
  }

  // -----------------------------
  // Foreign-key helpers
  // -----------------------------
  _indexById(items) {
    const index = {};
    items.forEach((item) => {
      if (item && item.id) index[item.id] = item;
    });
    return index;
  }

  _resolveProgramForCall(call, programsById) {
    const program = call && call.programId ? programsById[call.programId] || null : null;
    return {
      ...call,
      program
    };
  }

  _getBudgetThresholdForApplication(application, call) {
    if (call && typeof call.maxRequestedAmount === 'number') {
      return call.maxRequestedAmount;
    }
    if (typeof application.totalRequestedBudget === 'number') {
      return application.totalRequestedBudget;
    }
    return 100000; // default threshold
  }

  _getSavedOpportunityForItem(itemType, itemId) {
    const saved = this._getFromStorage('savedopportunities');
    const matches = saved.filter((s) => s.itemType === itemType && s.itemId === itemId);
    if (matches.length === 0) return { isSaved: false, savedListType: null };
    // Prefer shortlist over saved
    const shortlist = matches.find((m) => m.listType === 'shortlist');
    const entry = shortlist || matches[0];
    return { isSaved: true, savedListType: entry.listType };
  }

  _getBudgetSummaryForApplication(applicationId) {
    const applications = this._getFromStorage('applications');
    const calls = this._getFromStorage('fundingcalls');
    const lineItems = this._getFromStorage('budgetlineitems');

    const application = applications.find((a) => a.id === applicationId);
    if (!application) {
      return {
        calculatedTotalBudget: 0,
        overThreshold: false,
        thresholdAmount: 100000
      };
    }

    const appLineItems = lineItems.filter((li) => li.applicationId === applicationId);
    const total = appLineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);

    const call = calls.find((c) => c.id === application.callId);
    const threshold = this._getBudgetThresholdForApplication(application, call);

    application.calculatedTotalBudget = total;
    application.updatedAt = this._nowIso();
    this._saveToStorage('applications', applications);

    return {
      calculatedTotalBudget: total,
      overThreshold: total > threshold,
      thresholdAmount: threshold
    };
  }

  // -----------------------------
  // Core interface implementations
  // -----------------------------

  // getHomeOverview()
  getHomeOverview() {
    const fundingCalls = this._getFromStorage('fundingcalls');
    const programs = this._getFromStorage('fundingprograms');
    const events = this._getFromStorage('events');
    const savedOpps = this._getFromStorage('savedopportunities');
    const applications = this._getFromStorage('applications');
    const fundingAlerts = this._getFromStorage('fundingalerts');

    const now = new Date();
    const programsById = this._indexById(programs);

    // Featured funding calls: upcoming by nearest deadline
    const upcomingCalls = fundingCalls
      .filter((c) => {
        const deadline = this._parseDate(c.applicationDeadline);
        return deadline && deadline >= now && (c.status === 'open' || c.status === 'upcoming');
      })
      .sort((a, b) => {
        const da = this._parseDate(a.applicationDeadline) || new Date(8640000000000000);
        const db = this._parseDate(b.applicationDeadline) || new Date(8640000000000000);
        return da - db;
      })
      .slice(0, 5)
      .map((call) => {
        const { isSaved } = this._getSavedOpportunityForItem('funding_call', call.id);
        return {
          id: call.id,
          title: call.title,
          shortTitle: call.shortTitle || '',
          researchArea: call.researchArea,
          researchAreaLabel: this._researchAreaLabel(call.researchArea),
          applicationDeadline: call.applicationDeadline || null,
          isEarlyCareerFocused: !!call.isEarlyCareerFocused,
          isSaved
        };
      });

    // Featured programs: active with highest maxFundingPerProject
    const featuredPrograms = programs
      .filter((p) => p.status === 'active')
      .sort((a, b) => (Number(b.maxFundingPerProject) || 0) - (Number(a.maxFundingPerProject) || 0))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        researchArea: p.researchArea,
        researchAreaLabel: this._researchAreaLabel(p.researchArea),
        maxFundingPerProject: Number(p.maxFundingPerProject) || 0,
        requiredInstitutionalCofundingPercent: Number(p.requiredInstitutionalCofundingPercent) || 0
      }));

    const upcomingDeadlines = upcomingCalls.map((c) => ({
      callId: c.id,
      callTitle: c.title,
      applicationDeadline: c.applicationDeadline
    }));

    const upcomingEvents = events
      .filter((e) => {
        const start = this._parseDate(e.startDateTime);
        return start && start >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(8640000000000000);
        const db = this._parseDate(b.startDateTime) || new Date(8640000000000000);
        return da - db;
      })
      .slice(0, 5)
      .map((e) => ({
        eventId: e.id,
        title: e.title,
        startDateTime: e.startDateTime,
        eventType: e.eventType,
        eventTypeLabel: this._eventTypeLabel(e.eventType),
        isOnline: !!e.isOnline
      }));

    const quickStats = {
      savedOpportunitiesCount: savedOpps.length,
      draftApplicationsCount: applications.filter((a) => a.status === 'draft').length,
      fundingAlertsCount: fundingAlerts.length
    };

    return {
      featuredFundingCalls: upcomingCalls,
      featuredPrograms,
      upcomingDeadlines,
      upcomingEvents,
      quickStats
    };
  }

  // getFundingFilterOptions()
  getFundingFilterOptions() {
    const fundingTypes = [
      { value: 'individual_research_grant', label: 'Individual Research Grants' },
      { value: 'collaborative_project', label: 'Collaborative Projects' },
      { value: 'fellowship', label: 'Fellowships' },
      { value: 'infrastructure', label: 'Research Infrastructure' },
      { value: 'training', label: 'Training' },
      { value: 'other', label: 'Other' }
    ];

    const researchAreas = [
      { value: 'environment_climate', label: 'Environment & Climate' },
      { value: 'information_communication_technologies', label: 'Information & Communication Technologies' },
      { value: 'health', label: 'Health' },
      { value: 'social_sciences', label: 'Social Sciences' },
      { value: 'engineering', label: 'Engineering' },
      { value: 'multidisciplinary', label: 'Multidisciplinary' },
      { value: 'other', label: 'Other' }
    ];

    const careerStages = [
      { value: 'early_career', label: 'Early-career (≤7 years post-PhD)' },
      { value: 'mid_career', label: 'Mid-career' },
      { value: 'senior', label: 'Senior' },
      { value: 'phd_student', label: 'PhD student' },
      { value: 'any', label: 'Any career stage' }
    ];

    const geographicScopes = [
      { value: 'national', label: 'National' },
      { value: 'international', label: 'International' },
      { value: 'regional', label: 'Regional' },
      { value: 'local', label: 'Local' },
      { value: 'multiple_countries', label: 'Multiple Countries' },
      { value: 'unspecified', label: 'Unspecified' }
    ];

    const programHostOrganizationTypes = [
      { value: 'government_agency', label: 'Government Agency' },
      { value: 'funding_agency', label: 'Funding Agency' },
      { value: 'university', label: 'University' },
      { value: 'research_institute', label: 'Research Institute' },
      { value: 'nonprofit', label: 'Nonprofit' },
      { value: 'company', label: 'Company' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'deadline', label: 'Deadline (earliest first)' },
      { value: 'amount', label: 'Maximum amount' },
      { value: 'relevance', label: 'Relevance' },
      { value: 'publication_date', label: 'Publication date' },
      { value: 'title', label: 'Title (A–Z)' }
    ];

    return {
      fundingTypes,
      researchAreas,
      careerStages,
      geographicScopes,
      programHostOrganizationTypes,
      sortOptions
    };
  }

  // searchFundingCalls(query, filters, sortBy, sortOrder, page, pageSize)
  searchFundingCalls(query, filters, sortBy, sortOrder, page, pageSize) {
    const calls = this._getFromStorage('fundingcalls');
    const programs = this._getFromStorage('fundingprograms');
    const savedOpps = this._getFromStorage('savedopportunities');

    const programsById = this._indexById(programs);
    const savedByCallId = {};
    savedOpps
      .filter((s) => s.itemType === 'funding_call')
      .forEach((s) => {
        if (!savedByCallId[s.itemId]) savedByCallId[s.itemId] = [];
        savedByCallId[s.itemId].push(s);
      });

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = calls.slice();

    if (q) {
      results = results.filter((c) => {
        const haystack = (
          (c.title || '') + ' ' +
          (c.shortTitle || '') + ' ' +
          (c.description || '') + ' ' +
          (c.objectives || '')
        ).toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    if (f.fundingType) {
      results = results.filter((c) => c.fundingType === f.fundingType);
    }
    if (f.researchArea) {
      results = results.filter((c) => c.researchArea === f.researchArea);
    }
    if (typeof f.minRequestedAmount === 'number') {
      results = results.filter((c) => {
        const max = typeof c.maxRequestedAmount === 'number' ? c.maxRequestedAmount : Number.POSITIVE_INFINITY;
        return max >= f.minRequestedAmount;
      });
    }
    if (typeof f.maxRequestedAmount === 'number') {
      results = results.filter((c) => {
        const min = typeof c.minRequestedAmount === 'number' ? c.minRequestedAmount : 0;
        return min <= f.maxRequestedAmount;
      });
    }
    if (f.careerStage) {
      results = results.filter((c) => {
        if (!Array.isArray(c.careerStageEligibility) || c.careerStageEligibility.length === 0) return true;
        if (f.careerStage === 'any') return true;
        return c.careerStageEligibility.indexOf(f.careerStage) !== -1 || c.careerStageEligibility.indexOf('any') !== -1;
      });
    }
    if (f.deadlineAfter) {
      const after = this._parseDate(f.deadlineAfter);
      if (after) {
        results = results.filter((c) => {
          const d = this._parseDate(c.applicationDeadline);
          return d && d >= after;
        });
      }
    }
    if (f.deadlineBefore) {
      const before = this._parseDate(f.deadlineBefore);
      if (before) {
        results = results.filter((c) => {
          const d = this._parseDate(c.applicationDeadline);
          return d && d <= before;
        });
      }
    }
    if (f.geographicScope) {
      results = results.filter((c) => c.geographicScope === f.geographicScope);
    }
    if (f.status) {
      results = results.filter((c) => c.status === f.status);
    }

    const sb = sortBy || 'deadline';
    const so = (sortOrder || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    results.sort((a, b) => {
      let va;
      let vb;
      if (sb === 'amount') {
        va = typeof a.maxRequestedAmount === 'number' ? a.maxRequestedAmount : 0;
        vb = typeof b.maxRequestedAmount === 'number' ? b.maxRequestedAmount : 0;
      } else if (sb === 'title') {
        va = (a.title || '').toLowerCase();
        vb = (b.title || '').toLowerCase();
      } else if (sb === 'publication_date') {
        va = this._parseDate(a.createdAt) || new Date(0);
        vb = this._parseDate(b.createdAt) || new Date(0);
      } else {
        // deadline
        va = this._parseDate(a.applicationDeadline) || new Date(8640000000000000);
        vb = this._parseDate(b.applicationDeadline) || new Date(8640000000000000);
      }

      if (va < vb) return so === 'asc' ? -1 : 1;
      if (va > vb) return so === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = results.length;
    const pg = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = results.slice(start, end).map((c) => {
      const savedList = savedByCallId[c.id] || [];
      let isSaved = false;
      let savedListType = null;
      if (savedList.length > 0) {
        const shortlist = savedList.find((s) => s.listType === 'shortlist');
        const entry = shortlist || savedList[0];
        isSaved = true;
        savedListType = entry.listType;
      }
      const program = c.programId ? programsById[c.programId] || null : null;
      return {
        id: c.id,
        programId: c.programId || null,
        programTitle: program ? program.title : null,
        title: c.title,
        shortTitle: c.shortTitle || '',
        callIdentifier: c.callIdentifier || '',
        researchArea: c.researchArea,
        researchAreaLabel: this._researchAreaLabel(c.researchArea),
        fundingType: c.fundingType,
        fundingTypeLabel: this._fundingTypeLabel(c.fundingType),
        minRequestedAmount: typeof c.minRequestedAmount === 'number' ? c.minRequestedAmount : null,
        maxRequestedAmount: typeof c.maxRequestedAmount === 'number' ? c.maxRequestedAmount : null,
        currency: c.currency || null,
        isEarlyCareerFocused: !!c.isEarlyCareerFocused,
        applicationDeadline: c.applicationDeadline || null,
        status: c.status,
        isSaved,
        savedListType,
        program
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // getFundingCallDetail(callId)
  getFundingCallDetail(callId) {
    const calls = this._getFromStorage('fundingcalls');
    const programs = this._getFromStorage('fundingprograms');
    const helpArticles = this._getFromStorage('helparticles');
    const savedOpps = this._getFromStorage('savedopportunities');
    const messages = this._getFromStorage('messages');

    const call = calls.find((c) => c.id === callId) || null;
    const program = call && call.programId ? programs.find((p) => p.id === call.programId) || null : null;

    let isSaved = false;
    let savedListType = null;
    if (call) {
      const saved = savedOpps.filter((s) => s.itemType === 'funding_call' && s.itemId === call.id);
      if (saved.length > 0) {
        const shortlist = saved.find((s) => s.listType === 'shortlist');
        const entry = shortlist || saved[0];
        isSaved = true;
        savedListType = entry.listType;
      }
    }

    let relatedHelpArticles = [];
    if (call && Array.isArray(call.relatedHelpArticleIds) && call.relatedHelpArticleIds.length > 0) {
      relatedHelpArticles = helpArticles
        .filter((h) => call.relatedHelpArticleIds.indexOf(h.id) !== -1)
        .map((h) => ({ id: h.id, title: h.title }));
    }

    const relatedMessagesCount = call
      ? messages.filter((m) => m.relatedCallId === call.id && m.status !== 'draft').length
      : 0;

    if (!call) {
      return {
        call: null,
        relatedHelpArticles: [],
        isSaved: false,
        savedListType: null,
        relatedMessagesCount: 0
      };
    }

    const callDetail = {
      id: call.id,
      programId: program ? program.id : null,
      programTitle: program ? program.title : null,
      title: call.title,
      shortTitle: call.shortTitle || '',
      callIdentifier: call.callIdentifier || '',
      description: call.description || '',
      objectives: call.objectives || '',
      eligibilitySummary: call.eligibilitySummary || '',
      budgetRules: call.budgetRules || '',
      researchArea: call.researchArea,
      researchAreaLabel: this._researchAreaLabel(call.researchArea),
      fundingType: call.fundingType,
      fundingTypeLabel: this._fundingTypeLabel(call.fundingType),
      minRequestedAmount: typeof call.minRequestedAmount === 'number' ? call.minRequestedAmount : null,
      maxRequestedAmount: typeof call.maxRequestedAmount === 'number' ? call.maxRequestedAmount : null,
      currency: call.currency || null,
      careerStageEligibility: Array.isArray(call.careerStageEligibility)
        ? call.careerStageEligibility.slice()
        : [],
      applicationDeadline: call.applicationDeadline || null,
      applicationOpenDate: call.applicationOpenDate || null,
      totalBudgetAvailable: typeof call.totalBudgetAvailable === 'number' ? call.totalBudgetAvailable : null,
      maxProjectDurationMonths: typeof call.maxProjectDurationMonths === 'number' ? call.maxProjectDurationMonths : null,
      geographicScope: call.geographicScope || null,
      geographicScopeLabel: this._geographicScopeLabel(call.geographicScope),
      isEarlyCareerFocused: !!call.isEarlyCareerFocused,
      status: call.status,
      programOfficerName: call.programOfficerName || '',
      programOfficerEmail: call.programOfficerEmail || '',
      programOfficerPhone: call.programOfficerPhone || '',
      relatedDocuments: Array.isArray(call.relatedDocuments) ? call.relatedDocuments.slice() : [],
      program
    };

    return {
      call: callDetail,
      relatedHelpArticles,
      isSaved,
      savedListType,
      relatedMessagesCount
    };
  }

  // saveOpportunity(itemType, itemId, listType, note)
  saveOpportunity(itemType, itemId, listType, note) {
    const savedOpps = this._getFromStorage('savedopportunities');
    const now = this._nowIso();

    let savedOpportunity = savedOpps.find(
      (s) => s.itemType === itemType && s.itemId === itemId && s.listType === listType
    );

    if (savedOpportunity) {
      savedOpportunity.note = typeof note === 'string' ? note : savedOpportunity.note;
      savedOpportunity.savedAt = now;
    } else {
      savedOpportunity = {
        id: this._generateId('savedopp'),
        itemType,
        itemId,
        listType,
        note: note || '',
        savedAt: now
      };
      savedOpps.push(savedOpportunity);
    }

    this._saveToStorage('savedopportunities', savedOpps);

    return {
      savedOpportunity,
      message: 'Opportunity saved successfully.'
    };
  }

  // removeOpportunity(itemType, itemId, listType)
  removeOpportunity(itemType, itemId, listType) {
    const savedOpps = this._getFromStorage('savedopportunities');
    const before = savedOpps.length;
    const filtered = savedOpps.filter(
      (s) => !(s.itemType === itemType && s.itemId === itemId && s.listType === listType)
    );
    this._saveToStorage('savedopportunities', filtered);
    const success = filtered.length < before;
    return {
      success,
      message: success ? 'Opportunity removed.' : 'No matching opportunity found.'
    };
  }

  // createApplicationFromCall(callId)
  createApplicationFromCall(callId) {
    const calls = this._getFromStorage('fundingcalls');
    const applications = this._getFromStorage('applications');

    const call = calls.find((c) => c.id === callId) || null;

    let now = this._nowIso();
    if (applications.length > 0) {
      const maxCreated = applications.reduce((max, a) => {
        const d = this._parseDate(a.createdAt);
        return d && d > max ? d : max;
      }, new Date(0));
      if (maxCreated.getTime() > 0) {
        now = new Date(maxCreated.getTime() + 1).toISOString();
      }
    }
    const application = {
      id: this._generateId('app'),
      callId,
      programId: call && call.programId ? call.programId : null,
      internalReference: '',
      title: call ? call.title || '' : '',
      shortSummary: '',
      startDate: null,
      durationMonths: null,
      totalRequestedBudget: null,
      calculatedTotalBudget: 0,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now
    };

    applications.push(application);
    this._saveToStorage('applications', applications);

    return {
      application,
      callTitle: call ? call.title || '' : null
    };
  }

  // sendCallMessage(callId, subject, body, reasonForInquiry)
  sendCallMessage(callId, subject, body, reasonForInquiry) {
    const messages = this._getFromStorage('messages');
    const calls = this._getFromStorage('fundingcalls');

    const call = calls.find((c) => c.id === callId) || null;

    // Reuse thread for same call and subject if exists
    let existing = messages.find(
      (m) => m.relatedCallId === callId && m.subject === subject && m.threadId
    );
    const threadId = existing ? existing.threadId : this._generateId('thread');

    const now = this._nowIso();
    const message = {
      id: this._generateId('msg'),
      subject,
      body,
      relatedCallId: callId,
      relatedProgramId: call && call.programId ? call.programId : null,
      reasonForInquiry: reasonForInquiry || 'other',
      direction: 'outbound',
      status: 'sent',
      threadId,
      sentAt: now,
      readAt: null
    };

    messages.push(message);
    this._saveToStorage('messages', messages);

    return {
      message,
      success: true,
      confirmationText: 'Your message has been sent.'
    };
  }

  // getMessagesForCall(callId)
  getMessagesForCall(callId) {
    const messages = this._getFromStorage('messages');
    const calls = this._getFromStorage('fundingcalls');
    const programs = this._getFromStorage('fundingprograms');

    const call = calls.find((c) => c.id === callId) || null;
    const programsById = this._indexById(programs);

    const related = messages
      .filter((m) => m.relatedCallId === callId)
      .sort((a, b) => {
        const da = this._parseDate(a.sentAt) || new Date(0);
        const db = this._parseDate(b.sentAt) || new Date(0);
        return db - da;
      })
      .map((m) => ({
        id: m.id,
        subject: m.subject,
        sentAt: m.sentAt || null,
        status: m.status,
        direction: m.direction,
        threadId: m.threadId || null,
        unread: !m.readAt,
        relatedCall: call,
        relatedProgram: m.relatedProgramId ? programsById[m.relatedProgramId] || null : null
      }));

    return related;
  }

  // getMessagesList(filters, page, pageSize)
  getMessagesList(filters, page, pageSize) {
    const messages = this._getFromStorage('messages');
    const calls = this._getFromStorage('fundingcalls');
    const programs = this._getFromStorage('fundingprograms');

    const callsById = this._indexById(calls);
    const programsById = this._indexById(programs);

    const f = filters || {};

    let results = messages.slice();

    if (f.direction) {
      results = results.filter((m) => m.direction === f.direction);
    }
    if (f.status) {
      results = results.filter((m) => m.status === f.status);
    }
    if (f.relatedCallId) {
      results = results.filter((m) => m.relatedCallId === f.relatedCallId);
    }
    if (f.relatedProgramId) {
      results = results.filter((m) => m.relatedProgramId === f.relatedProgramId);
    }

    results.sort((a, b) => {
      const da = this._parseDate(a.sentAt) || new Date(0);
      const db = this._parseDate(b.sentAt) || new Date(0);
      return db - da;
    });

    const totalCount = results.length;
    const pg = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = results.slice(start, end).map((m) => {
      const call = m.relatedCallId ? callsById[m.relatedCallId] || null : null;
      const program = m.relatedProgramId ? programsById[m.relatedProgramId] || null : null;
      return {
        id: m.id,
        subject: m.subject,
        sentAt: m.sentAt || null,
        status: m.status,
        direction: m.direction,
        relatedCallId: m.relatedCallId || null,
        relatedCallTitle: call ? call.title : null,
        relatedProgramId: m.relatedProgramId || null,
        relatedProgramTitle: program ? program.title : null,
        threadId: m.threadId || null,
        unread: !m.readAt,
        relatedCall: call,
        relatedProgram: program
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // getMessageThread(threadId)
  getMessageThread(threadId) {
    const messages = this._getFromStorage('messages');
    const calls = this._getFromStorage('fundingcalls');
    const programs = this._getFromStorage('fundingprograms');

    const callsById = this._indexById(calls);
    const programsById = this._indexById(programs);

    return messages
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => {
        const da = this._parseDate(a.sentAt) || new Date(0);
        const db = this._parseDate(b.sentAt) || new Date(0);
        return da - db;
      })
      .map((m) => ({
        ...m,
        relatedCall: m.relatedCallId ? callsById[m.relatedCallId] || null : null,
        relatedProgram: m.relatedProgramId ? programsById[m.relatedProgramId] || null : null
      }));
  }

  // searchFundingPrograms(query, filters, sortBy, sortOrder, page, pageSize)
  searchFundingPrograms(query, filters, sortBy, sortOrder, page, pageSize) {
    const programs = this._getFromStorage('fundingprograms');
    const savedOpps = this._getFromStorage('savedopportunities');

    const savedByProgramId = {};
    savedOpps
      .filter((s) => s.itemType === 'funding_program')
      .forEach((s) => {
        if (!savedByProgramId[s.itemId]) savedByProgramId[s.itemId] = [];
        savedByProgramId[s.itemId].push(s);
      });

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = programs.slice();

    if (q) {
      results = results.filter((p) => {
        const haystack = (
          (p.title || '') + ' ' +
          (p.shortTitle || '') + ' ' +
          (p.description || '')
        ).toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    if (f.researchArea) {
      results = results.filter((p) => p.researchArea === f.researchArea);
    }
    if (typeof f.maxFundingPerProjectMax === 'number') {
      results = results.filter((p) => (Number(p.maxFundingPerProject) || 0) <= f.maxFundingPerProjectMax);
    }
    if (typeof f.maxFundingPerProjectMin === 'number') {
      results = results.filter((p) => (Number(p.maxFundingPerProject) || 0) >= f.maxFundingPerProjectMin);
    }
    if (f.geographicScope) {
      results = results.filter((p) => p.geographicScope === f.geographicScope);
    }
    if (f.hostOrganizationType) {
      results = results.filter((p) => p.hostOrganizationType === f.hostOrganizationType);
    }
    if (f.status) {
      results = results.filter((p) => p.status === f.status);
    }

    const sb = sortBy || 'title';
    const so = (sortOrder || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    results.sort((a, b) => {
      let va;
      let vb;
      if (sb === 'max_funding') {
        va = Number(a.maxFundingPerProject) || 0;
        vb = Number(b.maxFundingPerProject) || 0;
      } else {
        va = (a.title || '').toLowerCase();
        vb = (b.title || '').toLowerCase();
      }
      if (va < vb) return so === 'asc' ? -1 : 1;
      if (va > vb) return so === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = results.length;
    const pg = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = results.slice(start, end).map((p) => {
      const savedList = savedByProgramId[p.id] || [];
      let isSaved = false;
      let savedListType = null;
      if (savedList.length > 0) {
        const shortlist = savedList.find((s) => s.listType === 'shortlist');
        const entry = shortlist || savedList[0];
        isSaved = true;
        savedListType = entry.listType;
      }

      return {
        id: p.id,
        title: p.title,
        shortTitle: p.shortTitle || '',
        researchArea: p.researchArea,
        researchAreaLabel: this._researchAreaLabel(p.researchArea),
        maxFundingPerProject: Number(p.maxFundingPerProject) || 0,
        minFundingPerProject: typeof p.minFundingPerProject === 'number' ? p.minFundingPerProject : null,
        requiredInstitutionalCofundingPercent: Number(p.requiredInstitutionalCofundingPercent) || 0,
        typicalProjectDurationMonths: typeof p.typicalProjectDurationMonths === 'number'
          ? p.typicalProjectDurationMonths
          : null,
        geographicScope: p.geographicScope || null,
        geographicScopeLabel: this._geographicScopeLabel(p.geographicScope),
        status: p.status,
        hostOrganizationName: p.hostOrganizationName || '',
        hostOrganizationType: p.hostOrganizationType || null,
        hostOrganizationTypeLabel: this._hostOrganizationTypeLabel(p.hostOrganizationType),
        isSaved,
        savedListType
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // getProgramComparison(programIds)
  getProgramComparison(programIds) {
    const programs = this._getFromStorage('fundingprograms');
    const savedOpps = this._getFromStorage('savedopportunities');

    const idsSet = new Set(Array.isArray(programIds) ? programIds : []);

    // Instrumentation for task completion tracking (task_2)
    try {
      if (programIds && Array.isArray(programIds) && programIds.length >= 2) {
        localStorage.setItem('task2_comparedProgramIds', JSON.stringify({
          programIds: programIds.slice(),
          comparedAt: this._nowIso()
        }));
      }
    } catch (e) {
      console.error('Instrumentation error (task_2):', e);
    }

    const savedByProgramId = {};
    savedOpps
      .filter((s) => s.itemType === 'funding_program')
      .forEach((s) => {
        if (!savedByProgramId[s.itemId]) savedByProgramId[s.itemId] = [];
        savedByProgramId[s.itemId].push(s);
      });

    return programs
      .filter((p) => idsSet.has(p.id))
      .map((p) => {
        const savedList = savedByProgramId[p.id] || [];
        const isSaved = savedList.length > 0;
        return {
          id: p.id,
          title: p.title,
          researchArea: p.researchArea,
          researchAreaLabel: this._researchAreaLabel(p.researchArea),
          maxFundingPerProject: Number(p.maxFundingPerProject) || 0,
          requiredInstitutionalCofundingPercent: Number(p.requiredInstitutionalCofundingPercent) || 0,
          typicalProjectDurationMonths: typeof p.typicalProjectDurationMonths === 'number'
            ? p.typicalProjectDurationMonths
            : null,
          geographicScope: p.geographicScope || null,
          geographicScopeLabel: this._geographicScopeLabel(p.geographicScope),
          status: p.status,
          hostOrganizationName: p.hostOrganizationName || '',
          hostOrganizationType: p.hostOrganizationType || null,
          hostOrganizationTypeLabel: this._hostOrganizationTypeLabel(p.hostOrganizationType),
          isSaved
        };
      });
  }

  // getFundingProgramDetail(programId)
  getFundingProgramDetail(programId) {
    const programs = this._getFromStorage('fundingprograms');
    const calls = this._getFromStorage('fundingcalls');
    const savedOpps = this._getFromStorage('savedopportunities');

    const program = programs.find((p) => p.id === programId) || null;

    if (!program) {
      return {
        program: null,
        researchAreaLabel: null,
        geographicScopeLabel: null,
        hostOrganizationTypeLabel: null,
        isSaved: false,
        savedListType: null,
        associatedCalls: []
      };
    }

    const savedList = savedOpps.filter(
      (s) => s.itemType === 'funding_program' && s.itemId === program.id
    );
    let isSaved = false;
    let savedListType = null;
    if (savedList.length > 0) {
      const shortlist = savedList.find((s) => s.listType === 'shortlist');
      const entry = shortlist || savedList[0];
      isSaved = true;
      savedListType = entry.listType;
    }

    const associatedCalls = calls
      .filter((c) => c.programId === program.id)
      .map((c) => {
        const savedForCall = this._getSavedOpportunityForItem('funding_call', c.id);
        return {
          id: c.id,
          title: c.title,
          shortTitle: c.shortTitle || '',
          applicationDeadline: c.applicationDeadline || null,
          status: c.status,
          isSaved: savedForCall.isSaved
        };
      });

    return {
      program,
      researchAreaLabel: this._researchAreaLabel(program.researchArea),
      geographicScopeLabel: this._geographicScopeLabel(program.geographicScope),
      hostOrganizationTypeLabel: this._hostOrganizationTypeLabel(program.hostOrganizationType),
      isSaved,
      savedListType,
      associatedCalls
    };
  }

  // getMyOpportunities(filters, page, pageSize)
  getMyOpportunities(filters, page, pageSize) {
    const savedOpps = this._getFromStorage('savedopportunities');
    const calls = this._getFromStorage('fundingcalls');
    const programs = this._getFromStorage('fundingprograms');

    const callsById = this._indexById(calls);
    const programsById = this._indexById(programs);

    const f = filters || {};

    let results = savedOpps.slice();

    if (f.itemType) {
      results = results.filter((s) => s.itemType === f.itemType);
    }
    if (f.listType) {
      results = results.filter((s) => s.listType === f.listType);
    }
    if (f.researchArea) {
      results = results.filter((s) => {
        if (s.itemType === 'funding_call') {
          const call = callsById[s.itemId];
          return call && call.researchArea === f.researchArea;
        }
        if (s.itemType === 'funding_program') {
          const program = programsById[s.itemId];
          return program && program.researchArea === f.researchArea;
        }
        return false;
      });
    }

    const sortBy = f.sortBy || 'saved_at';
    const sortOrder = (f.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    results.sort((a, b) => {
      let va;
      let vb;
      if (sortBy === 'title') {
        const ac = a.itemType === 'funding_call' ? callsById[a.itemId] : programsById[a.itemId];
        const bc = b.itemType === 'funding_call' ? callsById[b.itemId] : programsById[b.itemId];
        va = (ac && ac.title ? ac.title : '').toLowerCase();
        vb = (bc && bc.title ? bc.title : '').toLowerCase();
      } else if (sortBy === 'deadline') {
        const ac = a.itemType === 'funding_call' ? callsById[a.itemId] : null;
        const bc = b.itemType === 'funding_call' ? callsById[b.itemId] : null;
        va = ac ? this._parseDate(ac.applicationDeadline) || new Date(8640000000000000) : new Date(8640000000000000);
        vb = bc ? this._parseDate(bc.applicationDeadline) || new Date(8640000000000000) : new Date(8640000000000000);
      } else {
        // saved_at
        va = this._parseDate(a.savedAt) || new Date(0);
        vb = this._parseDate(b.savedAt) || new Date(0);
      }
      if (va < vb) return sortOrder === 'asc' ? -1 : 1;
      if (va > vb) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = results.length;
    const pg = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = results.slice(start, end).map((s) => {
      const call = s.itemType === 'funding_call' ? callsById[s.itemId] || null : null;
      const program = s.itemType === 'funding_program' ? programsById[s.itemId] || null : null;
      const callSummary = call
        ? {
            id: call.id,
            title: call.title,
            shortTitle: call.shortTitle || '',
            applicationDeadline: call.applicationDeadline || null,
            researchAreaLabel: this._researchAreaLabel(call.researchArea)
          }
        : null;
      const programSummary = program
        ? {
            id: program.id,
            title: program.title,
            researchAreaLabel: this._researchAreaLabel(program.researchArea),
            maxFundingPerProject: Number(program.maxFundingPerProject) || 0
          }
        : null;
      return {
        savedOpportunityId: s.id,
        itemType: s.itemType,
        listType: s.listType,
        savedAt: s.savedAt,
        note: s.note || '',
        callSummary,
        programSummary,
        item: s.itemType === 'funding_call' ? call : program
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // getMyApplications(filters, page, pageSize)
  getMyApplications(filters, page, pageSize) {
    const applications = this._getFromStorage('applications');
    const calls = this._getFromStorage('fundingcalls');
    const programs = this._getFromStorage('fundingprograms');

    const callsById = this._indexById(calls);
    const programsById = this._indexById(programs);

    const f = filters || {};

    let results = applications.slice();

    if (f.status) {
      results = results.filter((a) => a.status === f.status);
    }

    const sortBy = f.sortBy || 'last_modified';
    const sortOrder = (f.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    results.sort((a, b) => {
      let va;
      let vb;
      if (sortBy === 'created_at') {
        va = this._parseDate(a.createdAt) || new Date(0);
        vb = this._parseDate(b.createdAt) || new Date(0);
      } else if (sortBy === 'title') {
        va = (a.title || '').toLowerCase();
        vb = (b.title || '').toLowerCase();
      } else {
        // last_modified
        va = this._parseDate(a.updatedAt) || new Date(0);
        vb = this._parseDate(b.updatedAt) || new Date(0);
      }
      if (va < vb) return sortOrder === 'asc' ? -1 : 1;
      if (va > vb) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = results.length;
    const pg = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = results.slice(start, end).map((a) => {
      const call = a.callId ? callsById[a.callId] || null : null;
      const program = a.programId ? programsById[a.programId] || null : null;
      return {
        id: a.id,
        title: a.title,
        status: a.status,
        updatedAt: a.updatedAt || null,
        lastOpenedAt: a.lastOpenedAt || null,
        callId: a.callId || null,
        callTitle: call ? call.title : null,
        programId: a.programId || null,
        programTitle: program ? program.title : null,
        call,
        program
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // getApplicationEditorState(applicationId)
  getApplicationEditorState(applicationId) {
    const applications = this._getFromStorage('applications');
    const calls = this._getFromStorage('fundingcalls');
    const programs = this._getFromStorage('fundingprograms');
    const lineItems = this._getFromStorage('budgetlineitems');

    const application = applications.find((a) => a.id === applicationId) || null;

    if (!application) {
      return {
        application: null,
        sections: [],
        budgetLineItems: [],
        budgetSummary: {
          calculatedTotalBudget: 0,
          totalRequestedBudget: 0,
          overThreshold: false,
          thresholdAmount: 100000
        }
      };
    }

    const call = application.callId ? calls.find((c) => c.id === application.callId) || null : null;
    const program = application.programId
      ? programs.find((p) => p.id === application.programId) || null
      : null;

    const appLineItems = lineItems.filter((li) => li.applicationId === applicationId);

    const thresholdAmount = this._getBudgetThresholdForApplication(application, call);
    const calculatedTotalBudget = appLineItems.reduce(
      (sum, li) => sum + (Number(li.amount) || 0),
      0
    );

    const sections = [
      { id: 'project_details', label: 'Project details', isComplete: !!application.title && !!application.startDate },
      { id: 'budget', label: 'Budget', isComplete: appLineItems.length > 0 },
      { id: 'team', label: 'Team', isComplete: false },
      { id: 'documents', label: 'Documents', isComplete: false }
    ];

    const budgetLineItems = appLineItems.map((li) => ({
      ...li,
      application
    }));

    const budgetSummary = {
      calculatedTotalBudget,
      totalRequestedBudget: typeof application.totalRequestedBudget === 'number'
        ? application.totalRequestedBudget
        : null,
      overThreshold: calculatedTotalBudget > thresholdAmount,
      thresholdAmount
    };

    const applicationSummary = {
      id: application.id,
      title: application.title,
      shortSummary: application.shortSummary || '',
      startDate: application.startDate || null,
      durationMonths: typeof application.durationMonths === 'number' ? application.durationMonths : null,
      totalRequestedBudget: typeof application.totalRequestedBudget === 'number'
        ? application.totalRequestedBudget
        : null,
      calculatedTotalBudget: typeof application.calculatedTotalBudget === 'number'
        ? application.calculatedTotalBudget
        : calculatedTotalBudget,
      status: application.status,
      callId: application.callId || null,
      callTitle: call ? call.title : null,
      programId: application.programId || null,
      programTitle: program ? program.title : null,
      call,
      program
    };

    return {
      application: applicationSummary,
      sections,
      budgetLineItems,
      budgetSummary
    };
  }

  // updateApplicationDetails(applicationId, details)
  updateApplicationDetails(applicationId, details) {
    const applications = this._getFromStorage('applications');
    const application = applications.find((a) => a.id === applicationId) || null;

    if (!application) {
      return { application: null, success: false };
    }

    const d = details || {};

    if (typeof d.title === 'string') application.title = d.title;
    if (typeof d.shortSummary === 'string') application.shortSummary = d.shortSummary;
    if (typeof d.startDate === 'string') application.startDate = d.startDate;
    if (typeof d.durationMonths === 'number') application.durationMonths = d.durationMonths;
    if (typeof d.totalRequestedBudget === 'number') {
      application.totalRequestedBudget = d.totalRequestedBudget;
    }

    application.updatedAt = this._nowIso();

    this._saveToStorage('applications', applications);

    return {
      application,
      success: true
    };
  }

  // addBudgetLineItem(applicationId, category, amount, description, sortOrder)
  addBudgetLineItem(applicationId, category, amount, description, sortOrder) {
    const lineItems = this._getFromStorage('budgetlineitems');
    const now = this._nowIso();

    const lineItem = {
      id: this._generateId('bli'),
      applicationId,
      category,
      description: description || '',
      amount: Number(amount) || 0,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : lineItems.length + 1,
      createdAt: now,
      updatedAt: now
    };

    lineItems.push(lineItem);
    this._saveToStorage('budgetlineitems', lineItems);

    const budgetSummary = this._getBudgetSummaryForApplication(applicationId);

    return {
      lineItem,
      budgetSummary,
      success: true
    };
  }

  // updateBudgetLineItem(lineItemId, updates)
  updateBudgetLineItem(lineItemId, updates) {
    const lineItems = this._getFromStorage('budgetlineitems');
    const lineItem = lineItems.find((li) => li.id === lineItemId) || null;

    if (!lineItem) {
      return {
        lineItem: null,
        budgetSummary: {
          calculatedTotalBudget: 0,
          overThreshold: false,
          thresholdAmount: 100000
        },
        success: false
      };
    }

    const u = updates || {};

    if (typeof u.category === 'string') lineItem.category = u.category;
    if (typeof u.amount === 'number') lineItem.amount = u.amount;
    if (typeof u.description === 'string') lineItem.description = u.description;
    if (typeof u.sortOrder === 'number') lineItem.sortOrder = u.sortOrder;

    lineItem.updatedAt = this._nowIso();

    this._saveToStorage('budgetlineitems', lineItems);

    const budgetSummary = this._getBudgetSummaryForApplication(lineItem.applicationId);

    return {
      lineItem,
      budgetSummary,
      success: true
    };
  }

  // recalculateBudgetTotals(applicationId)
  recalculateBudgetTotals(applicationId) {
    const summary = this._getBudgetSummaryForApplication(applicationId);
    return summary;
  }

  // saveApplicationDraft(applicationId)
  saveApplicationDraft(applicationId) {
    const applications = this._getFromStorage('applications');
    const application = applications.find((a) => a.id === applicationId) || null;

    if (!application) {
      return {
        application: null,
        success: false,
        message: 'Application not found.'
      };
    }

    application.status = 'draft';
    application.updatedAt = this._nowIso();

    this._saveToStorage('applications', applications);

    return {
      application,
      success: true,
      message: 'Draft saved.'
    };
  }

  // duplicateApplication(applicationId)
  duplicateApplication(applicationId) {
    const applications = this._getFromStorage('applications');
    const lineItems = this._getFromStorage('budgetlineitems');

    const source = applications.find((a) => a.id === applicationId) || null;
    if (!source) {
      return {
        application: null,
        success: false
      };
    }

    const now = this._nowIso();
    const newId = this._generateId('app');

    const application = {
      ...source,
      id: newId,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now
    };

    applications.push(application);

    const sourceItems = lineItems.filter((li) => li.applicationId === applicationId);
    const newItems = sourceItems.map((li) => ({
      ...li,
      id: this._generateId('bli'),
      applicationId: newId,
      createdAt: now,
      updatedAt: now
    }));

    const allLineItems = lineItems.concat(newItems);

    this._saveToStorage('applications', applications);
    this._saveToStorage('budgetlineitems', allLineItems);

    return {
      application,
      success: true
    };
  }

  // updateApplicationStatus(applicationId, status)
  updateApplicationStatus(applicationId, status) {
    const applications = this._getFromStorage('applications');
    const application = applications.find((a) => a.id === applicationId) || null;

    if (!application) {
      return {
        application: null,
        success: false
      };
    }

    application.status = status;
    application.updatedAt = this._nowIso();

    this._saveToStorage('applications', applications);

    return {
      application,
      success: true
    };
  }

  // deleteDraftApplication(applicationId)
  deleteDraftApplication(applicationId) {
    const applications = this._getFromStorage('applications');
    const lineItems = this._getFromStorage('budgetlineitems');

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application) {
      return {
        success: false,
        message: 'Application not found.'
      };
    }

    if (application.status !== 'draft') {
      return {
        success: false,
        message: 'Only draft applications can be deleted.'
      };
    }

    const remainingApplications = applications.filter((a) => a.id !== applicationId);
    const remainingLineItems = lineItems.filter((li) => li.applicationId !== applicationId);

    this._saveToStorage('applications', remainingApplications);
    this._saveToStorage('budgetlineitems', remainingLineItems);

    return {
      success: true,
      message: 'Draft application deleted.'
    };
  }

  // searchFundedProjects(query, filters, sortBy, sortOrder, page, pageSize)
  searchFundedProjects(query, filters, sortBy, sortOrder, page, pageSize) {
    const projects = this._getFromStorage('fundedprojects');
    const programs = this._getFromStorage('fundingprograms');

    const programsById = this._indexById(programs);

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = projects.slice();

    if (q) {
      results = results.filter((p) => {
        const program = p.programId ? programsById[p.programId] || null : null;
        const haystack = (
          (p.title || '') + ' ' +
          (p.description || '') + ' ' +
          (p.outcomesSummary || '') + ' ' +
          (program && program.title ? program.title : '')
        ).toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    if (f.status) {
      results = results.filter((p) => p.status === f.status);
    }
    if (typeof f.minTotalFundedAmount === 'number') {
      results = results.filter((p) => (Number(p.totalFundedAmount) || 0) >= f.minTotalFundedAmount);
    }
    if (typeof f.maxTotalFundedAmount === 'number') {
      results = results.filter((p) => (Number(p.totalFundedAmount) || 0) <= f.maxTotalFundedAmount);
    }
    if (f.leadOrganizationType) {
      results = results.filter((p) => p.leadOrganizationType === f.leadOrganizationType);
    }
    if (f.programId) {
      results = results.filter((p) => p.programId === f.programId);
    }
    if (f.researchArea) {
      results = results.filter((p) => p.researchArea === f.researchArea);
    }
    if (f.geographicScope) {
      results = results.filter((p) => p.geographicScope === f.geographicScope);
    }

    const sb = sortBy || 'title';
    const so = (sortOrder || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    results.sort((a, b) => {
      let va;
      let vb;
      if (sb === 'total_funded_amount') {
        va = Number(a.totalFundedAmount) || 0;
        vb = Number(b.totalFundedAmount) || 0;
      } else {
        va = (a.title || '').toLowerCase();
        vb = (b.title || '').toLowerCase();
      }
      if (va < vb) return so === 'asc' ? -1 : 1;
      if (va > vb) return so === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = results.length;
    const pg = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = results.slice(start, end).map((p) => {
      const program = p.programId ? programsById[p.programId] || null : null;
      const description = p.description || '';
      const descriptionSnippet = description.length > 200
        ? description.slice(0, 197) + '...'
        : description;
      return {
        id: p.id,
        title: p.title,
        descriptionSnippet,
        programId: p.programId || null,
        programTitle: program ? program.title : null,
        status: p.status,
        totalFundedAmount: Number(p.totalFundedAmount) || 0,
        currency: p.currency || null,
        leadOrganizationName: p.leadOrganizationName || '',
        leadOrganizationType: p.leadOrganizationType,
        leadOrganizationTypeLabel: this._leadOrganizationTypeLabel(p.leadOrganizationType),
        durationMonths: typeof p.durationMonths === 'number' ? p.durationMonths : null,
        geographicScope: p.geographicScope || null,
        geographicScopeLabel: this._geographicScopeLabel(p.geographicScope),
        program
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // getProjectComparison(projectIds)
  getProjectComparison(projectIds) {
    const projects = this._getFromStorage('fundedprojects');
    const programs = this._getFromStorage('fundingprograms');

    const idsSet = new Set(Array.isArray(projectIds) ? projectIds : []);
    const programsById = this._indexById(programs);

    // Instrumentation for task completion tracking (task_7)
    try {
      if (projectIds && Array.isArray(projectIds) && projectIds.length >= 2) {
        localStorage.setItem('task7_comparedProjectIds', JSON.stringify({
          projectIds: projectIds.slice(),
          comparedAt: this._nowIso()
        }));
      }
    } catch (e) {
      console.error('Instrumentation error (task_7):', e);
    }

    return projects
      .filter((p) => idsSet.has(p.id))
      .map((p) => {
        const program = p.programId ? programsById[p.programId] || null : null;
        return {
          id: p.id,
          title: p.title,
          programId: p.programId || null,
          programTitle: program ? program.title : null,
          leadOrganizationName: p.leadOrganizationName || '',
          leadOrganizationType: p.leadOrganizationType,
          leadOrganizationTypeLabel: this._leadOrganizationTypeLabel(p.leadOrganizationType),
          status: p.status,
          totalFundedAmount: Number(p.totalFundedAmount) || 0,
          currency: p.currency || null,
          durationMonths: typeof p.durationMonths === 'number' ? p.durationMonths : null,
          fundedStartDate: p.fundedStartDate || null,
          fundedEndDate: p.fundedEndDate || null,
          outcomesSummary: p.outcomesSummary || '',
          program
        };
      });
  }

  // searchEvents(query, filters, page, pageSize)
  searchEvents(query, filters, page, pageSize) {
    const events = this._getFromStorage('events');

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = events.slice();

    if (q) {
      results = results.filter((e) => {
        const haystack = (
          (e.title || '') + ' ' +
          (e.description || '') + ' ' +
          (e.topic || '') + ' ' +
          (Array.isArray(e.keywords) ? e.keywords.join(' ') : '')
        ).toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    if (f.eventType) {
      results = results.filter((e) => e.eventType === f.eventType);
    }
    if (typeof f.isOnline === 'boolean') {
      results = results.filter((e) => !!e.isOnline === f.isOnline);
    }
    if (f.topic) {
      const tq = f.topic.toLowerCase();
      results = results.filter((e) => (e.topic || '').toLowerCase().indexOf(tq) !== -1);
    }
    const startFilter = f.startDate ? this._parseDate(f.startDate) : null;
    const endFilter = f.endDate ? this._parseDate(f.endDate) : null;
    if (startFilter) {
      results = results.filter((e) => {
        const s = this._parseDate(e.startDateTime);
        return s && s >= startFilter;
      });
    }
    if (endFilter) {
      results = results.filter((e) => {
        const s = this._parseDate(e.startDateTime);
        return s && s <= endFilter;
      });
    }

    results.sort((a, b) => {
      const da = this._parseDate(a.startDateTime) || new Date(8640000000000000);
      const db = this._parseDate(b.startDateTime) || new Date(8640000000000000);
      return da - db;
    });

    const totalCount = results.length;
    const pg = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = results.slice(start, end).map((e) => {
      const description = e.description || '';
      const descriptionSnippet = description.length > 200
        ? description.slice(0, 197) + '...'
        : description;
      return {
        id: e.id,
        title: e.title,
        descriptionSnippet,
        eventType: e.eventType,
        eventTypeLabel: this._eventTypeLabel(e.eventType),
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime || null,
        isOnline: !!e.isOnline,
        location: e.location || '',
        registrationOpen: !!e.registrationOpen
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        eventTypeLabel: null,
        agenda: '',
        speakersSummary: '',
        relatedEvents: [],
        relatedHelpArticles: []
      };
    }

    // Related events: same topic, future, excluding self
    const now = new Date();
    const relatedEvents = events
      .filter((e) => e.id !== event.id && e.topic && event.topic && e.topic === event.topic)
      .filter((e) => {
        const s = this._parseDate(e.startDateTime);
        return s && s >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(8640000000000000);
        const db = this._parseDate(b.startDateTime) || new Date(8640000000000000);
        return da - db;
      })
      .slice(0, 3)
      .map((e) => ({
        eventId: e.id,
        title: e.title,
        startDateTime: e.startDateTime
      }));

    return {
      event,
      eventTypeLabel: this._eventTypeLabel(event.eventType),
      agenda: '',
      speakersSummary: '',
      relatedEvents,
      relatedHelpArticles: []
    };
  }

  // registerForEvent(eventId, registrantName, registrantEmail, registrantInstitution)
  registerForEvent(eventId, registrantName, registrantEmail, registrantInstitution) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('eventregistrations');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        registration: null,
        success: false,
        confirmationText: 'Event not found.'
      };
    }

    if (!event.registrationOpen) {
      return {
        registration: null,
        success: false,
        confirmationText: 'Registration for this event is closed.'
      };
    }

    const registration = {
      id: this._generateId('evreg'),
      eventId,
      registrantName,
      registrantEmail,
      registrantInstitution: registrantInstitution || '',
      registrationDate: this._nowIso(),
      status: 'registered',
      notes: ''
    };

    registrations.push(registration);
    this._saveToStorage('eventregistrations', registrations);

    return {
      registration,
      success: true,
      confirmationText: 'You have been registered for the event.'
    };
  }

  // getHelpCategories()
  getHelpCategories() {
    const categories = this._getFromStorage('helpcategories');
    return categories;
  }

  // getHelpArticlesByCategory(categoryId)
  getHelpArticlesByCategory(categoryId) {
    const articles = this._getFromStorage('helparticles');

    return articles
      .filter((a) => a.categoryId === categoryId)
      .map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug || '',
        isFeatured: !!a.isFeatured,
        excerpt: (a.content || '').slice(0, 200)
      }));
  }

  // searchHelpArticles(query, categoryId, page, pageSize)
  searchHelpArticles(query, categoryId, page, pageSize) {
    const articles = this._getFromStorage('helparticles');
    const categories = this._getFromStorage('helpcategories');

    const categoriesById = this._indexById(categories);

    const q = (query || '').trim().toLowerCase();

    let results = articles.slice();

    if (categoryId) {
      results = results.filter((a) => a.categoryId === categoryId);
    }

    if (q) {
      results = results.filter((a) => {
        const haystack = (
          (a.title || '') + ' ' +
          (a.content || '') + ' ' +
          (Array.isArray(a.keywords) ? a.keywords.join(' ') : '')
        ).toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    const totalCount = results.length;
    const pg = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (pg - 1) * ps;
    const end = start + ps;

    // Instrumentation for task completion tracking (task_5)
    try {
      const trimmedQuery = (query || '').trim();
      if (trimmedQuery.length > 0) {
        localStorage.setItem('task5_helpSearchParams', JSON.stringify({
          query: trimmedQuery,
          categoryId: categoryId || null,
          page: pg,
          pageSize: ps,
          searchedAt: this._nowIso()
        }));
      }
    } catch (e) {
      console.error('Instrumentation error (task_5):', e);
    }

    const items = results.slice(start, end).map((a) => {
      const cat = categoriesById[a.categoryId] || null;
      return {
        id: a.id,
        title: a.title,
        slug: a.slug || '',
        categoryName: cat ? cat.name : '',
        excerpt: (a.content || '').slice(0, 200)
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // getHelpArticleDetail(helpArticleId)
  getHelpArticleDetail(helpArticleId) {
    const articles = this._getFromStorage('helparticles');
    const categories = this._getFromStorage('helpcategories');
    const saved = this._getFromStorage('savedhelparticles');

    const article = articles.find((a) => a.id === helpArticleId) || null;
    if (!article) {
      return {
        article: null,
        category: null,
        isSaved: false,
        relatedArticles: []
      };
    }

    const category = categories.find((c) => c.id === article.categoryId) || null;

    const isSaved = saved.some((s) => s.helpArticleId === article.id);

    let relatedArticles = [];
    if (Array.isArray(article.relatedArticleIds) && article.relatedArticleIds.length > 0) {
      relatedArticles = articles
        .filter((a) => article.relatedArticleIds.indexOf(a.id) !== -1)
        .map((a) => ({ id: a.id, title: a.title }));
    }

    const articleWithCategory = {
      ...article,
      category
    };

    const categorySummary = category
      ? { id: category.id, name: category.name, slug: category.slug }
      : null;

    return {
      article: articleWithCategory,
      category: categorySummary,
      isSaved,
      relatedArticles
    };
  }

  // saveHelpArticle(helpArticleId)
  saveHelpArticle(helpArticleId) {
    const saved = this._getFromStorage('savedhelparticles');

    let existing = saved.find((s) => s.helpArticleId === helpArticleId);
    const now = this._nowIso();

    if (existing) {
      existing.savedAt = now;
    } else {
      existing = {
        id: this._generateId('savedhelp'),
        helpArticleId,
        savedAt: now
      };
      saved.push(existing);
    }

    this._saveToStorage('savedhelparticles', saved);

    return {
      savedHelpArticle: existing,
      success: true
    };
  }

  // removeSavedHelpArticle(helpArticleId)
  removeSavedHelpArticle(helpArticleId) {
    const saved = this._getFromStorage('savedhelparticles');
    const before = saved.length;
    const filtered = saved.filter((s) => s.helpArticleId !== helpArticleId);
    this._saveToStorage('savedhelparticles', filtered);
    const success = filtered.length < before;
    return {
      success,
      message: success ? 'Saved help article removed.' : 'No matching saved help article found.'
    };
  }

  // getMySavedHelpArticles(filters, page, pageSize)
  getMySavedHelpArticles(filters, page, pageSize) {
    const saved = this._getFromStorage('savedhelparticles');
    const articles = this._getFromStorage('helparticles');
    const categories = this._getFromStorage('helpcategories');

    const articlesById = this._indexById(articles);
    const categoriesById = this._indexById(categories);

    const f = filters || {};

    let results = saved.slice();

    if (f.query) {
      const q = f.query.toLowerCase();
      results = results.filter((s) => {
        const article = articlesById[s.helpArticleId];
        if (!article) return false;
        const haystack = (
          (article.title || '') + ' ' +
          (article.content || '')
        ).toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    const sortBy = f.sortBy || 'saved_at';
    const sortOrder = (f.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    results.sort((a, b) => {
      let va;
      let vb;
      if (sortBy === 'title') {
        const aa = articlesById[a.helpArticleId];
        const ab = articlesById[b.helpArticleId];
        va = (aa && aa.title ? aa.title : '').toLowerCase();
        vb = (ab && ab.title ? ab.title : '').toLowerCase();
      } else {
        va = this._parseDate(a.savedAt) || new Date(0);
        vb = this._parseDate(b.savedAt) || new Date(0);
      }
      if (va < vb) return sortOrder === 'asc' ? -1 : 1;
      if (va > vb) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = results.length;
    const pg = Math.max(1, parseInt(page || 1, 10));
    const ps = Math.max(1, parseInt(pageSize || 20, 10));
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = results.slice(start, end).map((s) => {
      const article = articlesById[s.helpArticleId] || null;
      const category = article && article.categoryId ? categoriesById[article.categoryId] || null : null;
      return {
        savedHelpArticleId: s.id,
        savedAt: s.savedAt,
        helpArticleId: s.helpArticleId,
        title: article ? article.title : '',
        categoryName: category ? category.name : '',
        helpArticle: article
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // getProfile()
  getProfile() {
    const profiles = this._getFromStorage('profiles');
    if (profiles.length === 0) {
      const now = this._nowIso();
      const profile = {
        id: this._generateId('profile'),
        fullName: '',
        email: '',
        organization: '',
        phone: '',
        emailNotificationsEnabled: true,
        createdAt: now,
        updatedAt: now
      };
      profiles.push(profile);
      this._saveToStorage('profiles', profiles);
      return profile;
    }
    return profiles[0];
  }

  // updateProfile(profile)
  updateProfile(profile) {
    const profiles = this._getFromStorage('profiles');
    const now = this._nowIso();

    let existing = profiles[0] || null;

    if (!existing) {
      existing = {
        id: this._generateId('profile'),
        fullName: '',
        email: '',
        organization: '',
        phone: '',
        emailNotificationsEnabled: true,
        createdAt: now,
        updatedAt: now
      };
      profiles.push(existing);
    }

    const p = profile || {};

    if (typeof p.fullName === 'string') existing.fullName = p.fullName;
    if (typeof p.email === 'string') existing.email = p.email;
    if (typeof p.organization === 'string') existing.organization = p.organization;
    if (typeof p.phone === 'string') existing.phone = p.phone;
    if (typeof p.emailNotificationsEnabled === 'boolean') {
      existing.emailNotificationsEnabled = p.emailNotificationsEnabled;
    }

    existing.updatedAt = now;

    this._saveToStorage('profiles', profiles);

    return existing;
  }

  // getFundingAlerts()
  getFundingAlerts() {
    const alerts = this._getFromStorage('fundingalerts');
    return alerts;
  }

  // createFundingAlert(name, keywords, researchArea, geographicScope, notificationFrequency, includeDeadlinesWithinNextDays, deadlineRangeDays)
  createFundingAlert(
    name,
    keywords,
    researchArea,
    geographicScope,
    notificationFrequency,
    includeDeadlinesWithinNextDays,
    deadlineRangeDays
  ) {
    const alerts = this._getFromStorage('fundingalerts');
    const now = this._nowIso();

    const alert = {
      id: this._generateId('alert'),
      name: name || '',
      keywords: keywords || '',
      researchArea: researchArea || null,
      geographicScope: geographicScope || null,
      notificationFrequency,
      includeDeadlinesWithinNextDays: !!includeDeadlinesWithinNextDays,
      deadlineRangeDays: typeof deadlineRangeDays === 'number' ? deadlineRangeDays : null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    alerts.push(alert);
    this._saveToStorage('fundingalerts', alerts);

    return alert;
  }

  // updateFundingAlert(alertId, updates)
  updateFundingAlert(alertId, updates) {
    const alerts = this._getFromStorage('fundingalerts');
    const alert = alerts.find((a) => a.id === alertId) || null;

    if (!alert) return null;

    const u = updates || {};

    if (typeof u.name === 'string') alert.name = u.name;
    if (typeof u.keywords === 'string') alert.keywords = u.keywords;
    if (typeof u.researchArea === 'string') alert.researchArea = u.researchArea;
    if (typeof u.geographicScope === 'string') alert.geographicScope = u.geographicScope;
    if (typeof u.notificationFrequency === 'string') {
      alert.notificationFrequency = u.notificationFrequency;
    }
    if (typeof u.includeDeadlinesWithinNextDays === 'boolean') {
      alert.includeDeadlinesWithinNextDays = u.includeDeadlinesWithinNextDays;
    }
    if (typeof u.deadlineRangeDays === 'number') alert.deadlineRangeDays = u.deadlineRangeDays;
    if (typeof u.isActive === 'boolean') alert.isActive = u.isActive;

    alert.updatedAt = this._nowIso();

    this._saveToStorage('fundingalerts', alerts);

    return alert;
  }

  // deleteFundingAlert(alertId)
  deleteFundingAlert(alertId) {
    const alerts = this._getFromStorage('fundingalerts');
    const before = alerts.length;
    const remaining = alerts.filter((a) => a.id !== alertId);
    this._saveToStorage('fundingalerts', remaining);
    const success = remaining.length < before;
    return {
      success,
      message: success ? 'Funding alert deleted.' : 'Alert not found.'
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