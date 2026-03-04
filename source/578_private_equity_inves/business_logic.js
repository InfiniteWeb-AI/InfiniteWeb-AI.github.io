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
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'funds',
      'strategies',
      'portfolio_companies',
      'team_members',
      'events',
      'articles',
      'watchlists',
      'watchlist_items',
      'collections',
      'collection_items',
      'notes',
      'contacts',
      'contact_groups',
      'contact_group_memberships',
      'reading_lists',
      'reading_list_items',
      'firm_calendar_entries',
      'event_registrations',
      'contact_inquiries',
      'newsletter_subscriptions',
      'investor_accounts'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // About & Legal content as single objects
    if (!localStorage.getItem('about_page_content')) {
      const about = {
        mission: 'To partner with leading businesses through disciplined private markets investing.',
        history: 'Firm history content not yet provided.',
        investmentPhilosophy: 'Long-term, value-oriented investing across private markets.',
        assetsUnderManagementUsd: 0,
        teamSize: 0,
        offices: [],
        coreStrategies: [],
        milestones: [],
        awards: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('legal_and_privacy_content')) {
      const legal = {
        termsOfUseHtml: '<p>Terms of use content not yet provided.</p>',
        privacyPolicyHtml: '<p>Privacy policy content not yet provided.</p>',
        cookiePolicyHtml: '<p>Cookie policy content not yet provided.</p>',
        regulatoryDisclosuresHtml: '<p>Regulatory disclosures not yet provided.</p>',
        complianceContacts: []
      };
      localStorage.setItem('legal_and_privacy_content', JSON.stringify(legal));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // -------------------- Generic Helpers --------------------

  _compareStrings(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  _filterByDateRange(items, fieldName, fromDate, toDate) {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    return items.filter((item) => {
      const d = this._parseDate(item[fieldName]);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }

  // -------------------- Private helpers specified in Interfaces --------------------

  _getOrCreateDefaultWatchlist() {
    let watchlists = this._getFromStorage('watchlists');
    let defaultWatchlist = watchlists.find((w) => w.is_default === true);
    if (!defaultWatchlist) {
      defaultWatchlist = {
        id: this._generateId('watchlist'),
        name: 'My Watchlist',
        description: 'Default watchlist',
        is_default: true,
        created_at: this._getCurrentTimestamp()
      };
      watchlists.push(defaultWatchlist);
      this._saveToStorage('watchlists', watchlists);
    }
    return defaultWatchlist;
  }

  _getOrCreateCollectionByName(name, description) {
    let collections = this._getFromStorage('collections');
    let existing = collections.find((c) => c.name === name);
    if (existing) return existing;
    const collection = {
      id: this._generateId('collection'),
      name,
      description: description || '',
      created_at: this._getCurrentTimestamp()
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);
    return collection;
  }

  _getOrCreateReadingListByName(name, description) {
    let readingLists = this._getFromStorage('reading_lists');
    let existing = readingLists.find((c) => c.name === name);
    if (existing) return existing;
    const list = {
      id: this._generateId('reading_list'),
      name,
      description: description || '',
      created_at: this._getCurrentTimestamp()
    };
    readingLists.push(list);
    this._saveToStorage('reading_lists', readingLists);
    return list;
  }

  _getOrCreateContactGroupByName(name) {
    let groups = this._getFromStorage('contact_groups');
    let existing = groups.find((g) => g.name === name);
    if (existing) return existing;
    const group = {
      id: this._generateId('contact_group'),
      name,
      description: '',
      is_default: true,
      created_at: this._getCurrentTimestamp()
    };
    groups.push(group);
    this._saveToStorage('contact_groups', groups);
    return group;
  }

  _getOrCreateContactFromTeamMember(teamMemberId) {
    const teamMembers = this._getFromStorage('team_members');
    let contacts = this._getFromStorage('contacts');
    const member = teamMembers.find((m) => m.id === teamMemberId);
    if (!member) return null;
    let contact = contacts.find((c) => c.team_member_id === teamMemberId);
    if (contact) return contact;
    contact = {
      id: this._generateId('contact'),
      team_member_id: member.id,
      full_name: member.full_name,
      role: member.role || '',
      organization: 'Firm',
      email: member.email || '',
      phone: member.phone || '',
      notes: '',
      created_at: this._getCurrentTimestamp()
    };
    contacts.push(contact);
    this._saveToStorage('contacts', contacts);
    return contact;
  }

  _createFirmCalendarEntry(eventId, note) {
    let entries = this._getFromStorage('firm_calendar_entries');
    const entry = {
      id: this._generateId('firm_calendar_entry'),
      event_id: eventId,
      added_at: this._getCurrentTimestamp(),
      note: note || ''
    };
    entries.push(entry);
    this._saveToStorage('firm_calendar_entries', entries);
    return entry;
  }

  // -------------------- Home Overview --------------------

  // getHomeOverview()
  getHomeOverview() {
    const funds = this._getFromStorage('funds');
    const strategies = this._getFromStorage('strategies');
    const companies = this._getFromStorage('portfolio_companies');
    const events = this._getFromStorage('events');

    const strategyById = {};
    strategies.forEach((s) => {
      strategyById[s.id] = s;
    });

    const featuredFunds = funds.slice(0, 5).map((f) => {
      const s = strategyById[f.strategy_id] || {};
      return {
        id: f.id,
        name: f.name,
        strategy_name: s.name || '',
        strategy_slug: s.slug || '',
        status: f.status,
        target_fund_size_millions: f.target_fund_size_millions,
        vintage_year: f.vintage_year,
        geography_focus: f.geography_focus || null
      };
    });

    const now = new Date();
    const upcomingEvents = events
      .filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime);
        const db = this._parseDate(b.start_datetime);
        return da - db;
      })
      .slice(0, 5);

    return {
      featuredFunds,
      featuredStrategies: strategies.filter((s) => s.is_active).slice(0, 5),
      featuredPortfolioCompanies: companies.slice(0, 5),
      upcomingEvents,
      primaryCallsToAction: {
        exploreFunds: {
          title: 'Explore Funds',
          subtitle: 'Review our current and historical funds.'
        },
        contactFirm: {
          title: 'Contact Us',
          subtitle: 'Discuss co-investments or LP opportunities.'
        },
        subscribeNewsletter: {
          title: 'Subscribe to Insights',
          subtitle: 'Receive our latest market perspectives.'
        },
        investorPortal: {
          title: 'Investor Login',
          subtitle: 'Access the LP reporting portal.'
        }
      }
    };
  }

  // -------------------- Funds & Watchlists --------------------

  // getFundFilterOptions()
  getFundFilterOptions() {
    const strategies = this._getFromStorage('strategies');
    const funds = this._getFromStorage('funds');

    const vintageSet = new Set();
    let minSize = null;
    let maxSize = null;

    funds.forEach((f) => {
      if (typeof f.vintage_year === 'number') vintageSet.add(f.vintage_year);
      if (typeof f.target_fund_size_millions === 'number') {
        if (minSize === null || f.target_fund_size_millions < minSize) {
          minSize = f.target_fund_size_millions;
        }
        if (maxSize === null || f.target_fund_size_millions > maxSize) {
          maxSize = f.target_fund_size_millions;
        }
      }
    });

    const vintageYears = Array.from(vintageSet)
      .sort((a, b) => b - a)
      .map((year) => ({ year }));

    const fundSizeRangeMillions = {
      min: minSize !== null ? minSize : 0,
      max: maxSize !== null ? maxSize : 0,
      step: 50
    };

    const statuses = [
      'fundraising',
      'investing',
      'harvesting',
      'realized',
      'closed'
    ].map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const geographyOptions = [
      'north_america',
      'europe',
      'asia_pacific',
      'latin_america',
      'middle_east_africa',
      'global'
    ].map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const sortOptions = [
      { value: 'target_fund_size', label: 'Target Fund Size' },
      { value: 'vintage_year', label: 'Vintage Year' },
      { value: 'status', label: 'Status' }
    ];

    return {
      strategies: strategies.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
      statuses,
      vintageYears,
      fundSizeRangeMillions,
      geographyOptions,
      sortOptions
    };
  }

  // searchFunds(strategyIds, minTargetFundSizeMillions, maxTargetFundSizeMillions, vintageYears, status, geographyFocus, textSearch, sortBy, sortDirection, page, pageSize)
  searchFunds(strategyIds, minTargetFundSizeMillions, maxTargetFundSizeMillions, vintageYears, status, geographyFocus, textSearch, sortBy, sortDirection, page, pageSize) {
    const strategies = this._getFromStorage('strategies');
    let funds = this._getFromStorage('funds');

    // Filters
    if (Array.isArray(strategyIds) && strategyIds.length > 0) {
      const set = new Set(strategyIds);
      funds = funds.filter((f) => set.has(f.strategy_id));
    }

    if (typeof minTargetFundSizeMillions === 'number') {
      funds = funds.filter((f) => typeof f.target_fund_size_millions === 'number' && f.target_fund_size_millions >= minTargetFundSizeMillions);
    }

    if (typeof maxTargetFundSizeMillions === 'number') {
      funds = funds.filter((f) => typeof f.target_fund_size_millions === 'number' && f.target_fund_size_millions <= maxTargetFundSizeMillions);
    }

    if (Array.isArray(vintageYears) && vintageYears.length > 0) {
      const vSet = new Set(vintageYears);
      funds = funds.filter((f) => vSet.has(f.vintage_year));
    }

    if (status) {
      funds = funds.filter((f) => f.status === status);
    }

    if (Array.isArray(geographyFocus) && geographyFocus.length > 0) {
      const gSet = new Set(geographyFocus);
      funds = funds.filter((f) => f.geography_focus && gSet.has(f.geography_focus));
    }

    if (textSearch) {
      const q = textSearch.toLowerCase();
      funds = funds.filter((f) => {
        const name = (f.name || '').toLowerCase();
        const desc = (f.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    // Sorting
    const sortField = sortBy || 'vintage_year';
    const direction = sortDirection === 'desc' ? -1 : 1;
    funds.sort((a, b) => {
      let av, bv;
      if (sortField === 'target_fund_size') {
        av = a.target_fund_size_millions || 0;
        bv = b.target_fund_size_millions || 0;
        return (av - bv) * direction;
      }
      if (sortField === 'status') {
        av = a.status || '';
        bv = b.status || '';
        return this._compareStrings(av, bv) * direction;
      }
      // default vintage_year
      av = a.vintage_year || 0;
      bv = b.vintage_year || 0;
      return (av - bv) * direction;
    });

    // Pagination
    const totalCount = funds.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const pagedFunds = funds.slice(start, start + ps);

    const strategyById = {};
    strategies.forEach((s) => {
      strategyById[s.id] = s;
    });

    const resultFunds = pagedFunds.map((f) => {
      const s = strategyById[f.strategy_id] || {};
      return {
        id: f.id,
        name: f.name,
        strategy_name: s.name || '',
        strategy_slug: s.slug || '',
        status: f.status,
        target_fund_size_millions: f.target_fund_size_millions,
        vintage_year: f.vintage_year,
        currency: f.currency,
        geography_focus: f.geography_focus || null,
        sector_focus: Array.isArray(f.sector_focus) ? f.sector_focus : []
      };
    });

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      funds: resultFunds
    };
  }

  // getFundDetail(fundId)
  getFundDetail(fundId) {
    const funds = this._getFromStorage('funds');
    const strategies = this._getFromStorage('strategies');
    const companies = this._getFromStorage('portfolio_companies');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('events');

    const fund = funds.find((f) => f.id === fundId) || null;
    if (!fund) {
      return {
        fund: null,
        strategy: null,
        relatedPortfolioCompanies: [],
        relatedArticles: [],
        relatedEvents: []
      };
    }

    const strategy = strategies.find((s) => s.id === fund.strategy_id) || null;

    // Hierarchical/heuristic relationships
    const relatedPortfolioCompanies = companies.filter((c) => {
      if (fund.geography_focus && c.region && c.region !== fund.geography_focus) return false;
      if (Array.isArray(fund.sector_focus) && fund.sector_focus.length > 0) {
        return fund.sector_focus.includes(c.sector);
      }
      return true;
    }).slice(0, 10);

    const topicFromStrategy = strategy && strategy.slug
      ? strategy.slug.replace(/-/g, '_')
      : null;

    const relatedArticles = articles.filter((a) => {
      if (!topicFromStrategy) return false;
      return a.topic === topicFromStrategy;
    }).slice(0, 10);

    const relatedEvents = events.filter((e) => {
      if (!topicFromStrategy) return false;
      return e.topic === topicFromStrategy;
    }).slice(0, 10);

    return {
      fund,
      strategy,
      relatedPortfolioCompanies,
      relatedArticles,
      relatedEvents
    };
  }

  // getWatchlistsForSelection()
  getWatchlistsForSelection() {
    return this._getFromStorage('watchlists');
  }

  // addFundToWatchlist(fundId, watchlistId)
  addFundToWatchlist(fundId, watchlistId) {
    const funds = this._getFromStorage('funds');
    const fund = funds.find((f) => f.id === fundId);
    if (!fund) {
      return { success: false, message: 'Fund not found', watchlist: null, watchlistItem: null };
    }

    let watchlists = this._getFromStorage('watchlists');
    let watchlist = null;

    if (watchlistId) {
      watchlist = watchlists.find((w) => w.id === watchlistId) || null;
      if (!watchlist) {
        return { success: false, message: 'Watchlist not found', watchlist: null, watchlistItem: null };
      }
    } else {
      watchlist = this._getOrCreateDefaultWatchlist();
      watchlists = this._getFromStorage('watchlists');
    }

    let watchlistItems = this._getFromStorage('watchlist_items');
    const existing = watchlistItems.find((wi) => wi.watchlist_id === watchlist.id && wi.fund_id === fund.id);
    if (existing) {
      return {
        success: true,
        message: 'Fund already in watchlist',
        watchlist,
        watchlistItem: {
          ...existing,
          watchlist,
          fund
        }
      };
    }

    const item = {
      id: this._generateId('watchlist_item'),
      watchlist_id: watchlist.id,
      fund_id: fund.id,
      added_at: this._getCurrentTimestamp()
    };
    watchlistItems.push(item);
    this._saveToStorage('watchlist_items', watchlistItems);

    return {
      success: true,
      message: 'Fund added to watchlist',
      watchlist,
      watchlistItem: {
        ...item,
        watchlist,
        fund
      }
    };
  }

  // -------------------- Strategies & Notes --------------------

  // getStrategiesOverview()
  getStrategiesOverview() {
    return this._getFromStorage('strategies');
  }

  // getStrategyDetail(strategySlug)
  getStrategyDetail(strategySlug) {
    const strategies = this._getFromStorage('strategies');
    const funds = this._getFromStorage('funds');
    const companies = this._getFromStorage('portfolio_companies');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('events');

    const strategy = strategies.find((s) => s.slug === strategySlug) || null;
    if (!strategy) {
      return {
        strategy: null,
        performanceSummary: null,
        relatedFunds: [],
        relatedPortfolioCompanies: [],
        relatedArticles: [],
        relatedEvents: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      const viewedSlugs = JSON.parse(localStorage.getItem('task2_viewedStrategySlugs') || '[]');
      if (Array.isArray(viewedSlugs)) {
        if (!viewedSlugs.includes(strategy.slug)) {
          viewedSlugs.push(strategy.slug);
          localStorage.setItem('task2_viewedStrategySlugs', JSON.stringify(viewedSlugs));
        }
      } else {
        // If the stored value is not an array, reset it to a new array with the current slug
        localStorage.setItem('task2_viewedStrategySlugs', JSON.stringify([strategy.slug]));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const performanceSummary = {
      gross_irr_since_inception_percent: strategy.gross_irr_since_inception_percent,
      gross_moic: strategy.gross_moic || null,
      benchmark_label: 'Custom Benchmark',
      benchmark_irr_percent: null
    };

    const relatedFunds = funds.filter((f) => f.strategy_id === strategy.id);

    const sectorSet = new Set(Array.isArray(strategy.primary_sectors) ? strategy.primary_sectors : []);
    const relatedPortfolioCompanies = companies.filter((c) => {
      if (sectorSet.size === 0) return false;
      return sectorSet.has(c.sector);
    }).slice(0, 20);

    const topicFromStrategy = strategy.slug.replace(/-/g, '_');
    const relatedArticles = articles.filter((a) => a.topic === topicFromStrategy).slice(0, 20);
    const relatedEvents = events.filter((e) => e.topic === topicFromStrategy).slice(0, 20);

    return {
      strategy,
      performanceSummary,
      relatedFunds,
      relatedPortfolioCompanies,
      relatedArticles,
      relatedEvents
    };
  }

  // getNotesList()
  getNotesList() {
    const notes = this._getFromStorage('notes');

    // Foreign key resolution for related_entity_id
    const strategies = this._getFromStorage('strategies');
    const funds = this._getFromStorage('funds');
    const companies = this._getFromStorage('portfolio_companies');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('events');
    const teamMembers = this._getFromStorage('team_members');

    return notes.map((n) => {
      let related_entity = null;
      if (n.related_entity_type && n.related_entity_id) {
        switch (n.related_entity_type) {
          case 'strategy':
            related_entity = strategies.find((s) => s.id === n.related_entity_id) || null;
            break;
          case 'fund':
            related_entity = funds.find((f) => f.id === n.related_entity_id) || null;
            break;
          case 'portfolio_company':
            related_entity = companies.find((c) => c.id === n.related_entity_id) || null;
            break;
          case 'article':
            related_entity = articles.find((a) => a.id === n.related_entity_id) || null;
            break;
          case 'event':
            related_entity = events.find((e) => e.id === n.related_entity_id) || null;
            break;
          case 'team_member':
            related_entity = teamMembers.find((t) => t.id === n.related_entity_id) || null;
            break;
          default:
            related_entity = null;
        }
      }
      return {
        ...n,
        related_entity
      };
    });
  }

  // createNote(title, body, relatedEntityType, relatedEntityId)
  createNote(title, body, relatedEntityType, relatedEntityId) {
    if (!title || !body) {
      return { success: false, message: 'Title and body are required', note: null };
    }
    const notes = this._getFromStorage('notes');
    const now = this._getCurrentTimestamp();
    const note = {
      id: this._generateId('note'),
      title,
      body,
      created_at: now,
      updated_at: null,
      related_entity_type: relatedEntityType || 'none',
      related_entity_id: relatedEntityId || null
    };
    notes.push(note);
    this._saveToStorage('notes', notes);

    // Reuse getNotesList resolution for this single note
    const createdList = this.getNotesList();
    const createdNote = createdList.find((n) => n.id === note.id) || note;

    return { success: true, message: 'Note created', note: createdNote };
  }

  // updateNote(noteId, title, body)
  updateNote(noteId, title, body) {
    const notes = this._getFromStorage('notes');
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) {
      return { success: false, message: 'Note not found', note: null };
    }
    if (typeof title === 'string' && title.length > 0) {
      notes[idx].title = title;
    }
    if (typeof body === 'string' && body.length > 0) {
      notes[idx].body = body;
    }
    notes[idx].updated_at = this._getCurrentTimestamp();
    this._saveToStorage('notes', notes);

    const updatedList = this.getNotesList();
    const updatedNote = updatedList.find((n) => n.id === noteId) || notes[idx];

    return { success: true, message: 'Note updated', note: updatedNote };
  }

  // deleteNote(noteId)
  deleteNote(noteId) {
    const notes = this._getFromStorage('notes');
    const newNotes = notes.filter((n) => n.id !== noteId);
    const deleted = newNotes.length !== notes.length;
    this._saveToStorage('notes', newNotes);
    return { success: deleted, message: deleted ? 'Note deleted' : 'Note not found' };
  }

  // -------------------- Portfolio & Collections --------------------

  // getPortfolioFilterOptions()
  getPortfolioFilterOptions() {
    const companies = this._getFromStorage('portfolio_companies');

    const regionsEnum = [
      'north_america',
      'europe',
      'asia_pacific',
      'latin_america',
      'middle_east_africa',
      'global'
    ];

    const sectorsEnum = [
      'technology',
      'healthcare',
      'financial_services',
      'industrial',
      'infrastructure',
      'consumer',
      'business_services',
      'other'
    ];

    const regions = regionsEnum.map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const sectors = sectorsEnum.map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const revenueBands = [
      { min_usd: 0, max_usd: 10000000, label: 'Under $10M annual revenue' },
      { min_usd: 10000000, max_usd: 50000000, label: '$10M–$50M annual revenue' },
      { min_usd: 50000000, max_usd: 100000000, label: '$50M–$100M annual revenue' },
      { min_usd: 100000000, max_usd: null, label: '$100M+ annual revenue' }
    ];

    const yearSet = new Set();
    companies.forEach((c) => {
      if (typeof c.investment_year === 'number') yearSet.add(c.investment_year);
    });
    const investmentYears = Array.from(yearSet)
      .sort((a, b) => b - a)
      .map((year) => ({ year }));

    const sortOptions = [
      { value: 'revenue', label: 'Revenue' },
      { value: 'name', label: 'Name' },
      { value: 'investment_year', label: 'Investment Year' }
    ];

    return {
      regions,
      sectors,
      revenueBands,
      investmentYears,
      sortOptions
    };
  }

  // searchPortfolioCompanies(region, sector, revenueMinUsd, revenueMaxUsd, investmentYearFrom, investmentYearTo, sortBy, sortDirection, page, pageSize)
  searchPortfolioCompanies(region, sector, revenueMinUsd, revenueMaxUsd, investmentYearFrom, investmentYearTo, sortBy, sortDirection, page, pageSize) {
    let companies = this._getFromStorage('portfolio_companies');

    if (region) {
      companies = companies.filter((c) => c.region === region);
    }

    if (sector) {
      companies = companies.filter((c) => c.sector === sector);
    }

    if (typeof revenueMinUsd === 'number') {
      companies = companies.filter((c) => typeof c.annual_revenue_usd === 'number' && c.annual_revenue_usd >= revenueMinUsd);
    }

    if (typeof revenueMaxUsd === 'number') {
      companies = companies.filter((c) => typeof c.annual_revenue_usd === 'number' && c.annual_revenue_usd <= revenueMaxUsd);
    }

    if (typeof investmentYearFrom === 'number') {
      companies = companies.filter((c) => typeof c.investment_year === 'number' && c.investment_year >= investmentYearFrom);
    }

    if (typeof investmentYearTo === 'number') {
      companies = companies.filter((c) => typeof c.investment_year === 'number' && c.investment_year <= investmentYearTo);
    }

    const sortField = sortBy || 'name';
    const direction = sortDirection === 'desc' ? -1 : 1;

    companies.sort((a, b) => {
      if (sortField === 'revenue') {
        const av = a.annual_revenue_usd || 0;
        const bv = b.annual_revenue_usd || 0;
        return (av - bv) * direction;
      }
      if (sortField === 'investment_year') {
        const av = a.investment_year || 0;
        const bv = b.investment_year || 0;
        return (av - bv) * direction;
      }
      const av = (a.name || '').toLowerCase();
      const bv = (b.name || '').toLowerCase();
      return this._compareStrings(av, bv) * direction;
    });

    const totalCount = companies.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = companies.slice(start, start + ps);

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      companies: paged
    };
  }

  // getPortfolioCompanyDetail(companyId)
  getPortfolioCompanyDetail(companyId) {
    const companies = this._getFromStorage('portfolio_companies');
    const funds = this._getFromStorage('funds');
    const strategies = this._getFromStorage('strategies');
    const articles = this._getFromStorage('articles');

    const company = companies.find((c) => c.id === companyId) || null;
    if (!company) {
      return { company: null, relatedFunds: [], relatedStrategies: [], relatedArticles: [] };
    }

    const relatedFunds = funds.filter((f) => {
      if (f.geography_focus && company.region && f.geography_focus !== company.region) return false;
      if (Array.isArray(f.sector_focus) && f.sector_focus.length > 0) {
        return f.sector_focus.includes(company.sector);
      }
      return true;
    }).slice(0, 10);

    const strategySet = new Set(relatedFunds.map((f) => f.strategy_id));
    const relatedStrategies = strategies.filter((s) => strategySet.has(s.id));

    const topicGuess = company.sector === 'technology'
      ? 'growth_equity'
      : company.sector === 'infrastructure'
        ? 'infrastructure'
        : company.sector === 'financial_services'
          ? 'market_insights'
          : 'other';

    const relatedArticles = articles.filter((a) => a.topic === topicGuess).slice(0, 10);

    return {
      company,
      relatedFunds,
      relatedStrategies,
      relatedArticles
    };
  }

  // getCollectionsForSelection()
  getCollectionsForSelection() {
    return this._getFromStorage('collections');
  }

  // createCollectionAndAddCompany(collectionName, companyId, description)
  createCollectionAndAddCompany(collectionName, companyId, description) {
    if (!collectionName || !companyId) {
      return { success: false, message: 'Collection name and companyId are required', collection: null, collectionItem: null };
    }

    const companies = this._getFromStorage('portfolio_companies');
    const company = companies.find((c) => c.id === companyId);
    if (!company) {
      return { success: false, message: 'Company not found', collection: null, collectionItem: null };
    }

    const collection = this._getOrCreateCollectionByName(collectionName, description);

    let items = this._getFromStorage('collection_items');
    const existing = items.find((i) => i.collection_id === collection.id && i.company_id === companyId);
    if (existing) {
      return {
        success: true,
        message: 'Company already in collection',
        collection,
        collectionItem: {
          ...existing,
          collection,
          company
        }
      };
    }

    const item = {
      id: this._generateId('collection_item'),
      collection_id: collection.id,
      company_id: company.id,
      added_at: this._getCurrentTimestamp()
    };
    items.push(item);
    this._saveToStorage('collection_items', items);

    return {
      success: true,
      message: 'Collection updated',
      collection,
      collectionItem: {
        ...item,
        collection,
        company
      }
    };
  }

  // addCompanyToCollection(collectionId, companyId)
  addCompanyToCollection(collectionId, companyId) {
    if (!collectionId || !companyId) {
      return { success: false, message: 'collectionId and companyId are required', collectionItem: null };
    }

    const collections = this._getFromStorage('collections');
    const companies = this._getFromStorage('portfolio_companies');
    let items = this._getFromStorage('collection_items');

    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      return { success: false, message: 'Collection not found', collectionItem: null };
    }

    const company = companies.find((c) => c.id === companyId);
    if (!company) {
      return { success: false, message: 'Company not found', collectionItem: null };
    }

    const existing = items.find((i) => i.collection_id === collectionId && i.company_id === companyId);
    if (existing) {
      return {
        success: true,
        message: 'Company already in collection',
        collectionItem: {
          ...existing,
          collection,
          company
        }
      };
    }

    const item = {
      id: this._generateId('collection_item'),
      collection_id: collectionId,
      company_id: companyId,
      added_at: this._getCurrentTimestamp()
    };
    items.push(item);
    this._saveToStorage('collection_items', items);

    return {
      success: true,
      message: 'Company added to collection',
      collectionItem: {
        ...item,
        collection,
        company
      }
    };
  }

  // -------------------- Contact Form & Inquiries --------------------

  // getContactFormOptions()
  getContactFormOptions() {
    const inquiryTypes = [
      'general',
      'co_investment_opportunity',
      'investor_relations',
      'media',
      'careers',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const organizationTypes = [
      'institutional_investor',
      'high_net_worth_individual',
      'family_office',
      'consultant_advisor',
      'corporate',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const preferredContactMethods = [
      'phone',
      'email',
      'either'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    return { inquiryTypes, organizationTypes, preferredContactMethods };
  }

  // submitContactInquiry(inquiryType, fullName, organizationType, organizationName, estimatedTicketSizeUsd, message, preferredContactMethod, phoneNumber, email)
  submitContactInquiry(inquiryType, fullName, organizationType, organizationName, estimatedTicketSizeUsd, message, preferredContactMethod, phoneNumber, email) {
    if (!inquiryType || !fullName || !organizationType || !message || !preferredContactMethod) {
      return { success: false, message: 'Missing required fields', contactInquiry: null };
    }

    let inquiries = this._getFromStorage('contact_inquiries');
    const inquiry = {
      id: this._generateId('contact_inquiry'),
      inquiry_type: inquiryType,
      full_name: fullName,
      organization_type: organizationType,
      organization_name: organizationName || '',
      estimated_ticket_size_usd: typeof estimatedTicketSizeUsd === 'number' ? estimatedTicketSizeUsd : null,
      message,
      preferred_contact_method: preferredContactMethod,
      phone_number: phoneNumber || '',
      email: email || '',
      submitted_at: this._getCurrentTimestamp()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return { success: true, message: 'Inquiry submitted', contactInquiry: inquiry };
  }

  // -------------------- Newsletter Subscriptions --------------------

  // getNewsletterSubscriptionOptions()
  getNewsletterSubscriptionOptions() {
    const newsletterTypes = [
      { value: 'quarterly_market_insights', label: 'Quarterly Market Insights' },
      { value: 'monthly_newsletter', label: 'Monthly Newsletter' },
      { value: 'deal_alerts', label: 'Deal Alerts' },
      { value: 'events_only', label: 'Events Only' },
      { value: 'other', label: 'Other' }
    ];

    const sectorOptions = [
      'technology',
      'healthcare',
      'financial_services',
      'industrial',
      'infrastructure',
      'consumer',
      'business_services',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const contentPreferences = [
      { value: 'deal_announcements', label: 'Deal Announcements' },
      { value: 'macroeconomic_commentary', label: 'Macroeconomic Commentary' },
      { value: 'strategy_spotlights', label: 'Strategy Spotlights' },
      { value: 'portfolio_company_news', label: 'Portfolio Company News' }
    ];

    const defaultDealSizeRangeUsd = { min: 0, max: 500000000 };

    return { newsletterTypes, sectorOptions, contentPreferences, defaultDealSizeRangeUsd };
  }

  // createNewsletterSubscription(email, newsletterType, sectorPreferences, minDealSizeUsd, maxDealSizeUsd, contentPreferences)
  createNewsletterSubscription(email, newsletterType, sectorPreferences, minDealSizeUsd, maxDealSizeUsd, contentPreferences) {
    if (!email || !newsletterType) {
      return { success: false, message: 'Email and newsletterType are required', subscription: null };
    }

    let subs = this._getFromStorage('newsletter_subscriptions');
    let existing = subs.find((s) => s.email === email && s.newsletter_type === newsletterType);
    const now = this._getCurrentTimestamp();

    if (existing) {
      existing.sector_preferences = Array.isArray(sectorPreferences) ? sectorPreferences : existing.sector_preferences;
      existing.min_deal_size_usd = typeof minDealSizeUsd === 'number' ? minDealSizeUsd : existing.min_deal_size_usd;
      existing.max_deal_size_usd = typeof maxDealSizeUsd === 'number' ? maxDealSizeUsd : existing.max_deal_size_usd;
      existing.content_preferences = Array.isArray(contentPreferences) ? contentPreferences : existing.content_preferences;
      existing.is_active = true;
    } else {
      existing = {
        id: this._generateId('newsletter_subscription'),
        email,
        newsletter_type: newsletterType,
        sector_preferences: Array.isArray(sectorPreferences) ? sectorPreferences : [],
        min_deal_size_usd: typeof minDealSizeUsd === 'number' ? minDealSizeUsd : null,
        max_deal_size_usd: typeof maxDealSizeUsd === 'number' ? maxDealSizeUsd : null,
        content_preferences: Array.isArray(contentPreferences) ? contentPreferences : [],
        subscribed_at: now,
        is_active: true
      };
      subs.push(existing);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return { success: true, message: 'Subscription saved', subscription: existing };
  }

  // -------------------- Team & Contacts --------------------

  // getTeamFilterOptions()
  getTeamFilterOptions() {
    const roles = [
      'partner',
      'principal',
      'managing_director',
      'director',
      'vice_president',
      'associate',
      'analyst',
      'operating_partner',
      'advisor',
      'staff',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const regions = [
      'north_america',
      'europe',
      'asia_pacific',
      'latin_america',
      'middle_east_africa',
      'global'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const sectorExpertiseOptions = [
      'technology',
      'healthcare',
      'financial_services',
      'industrial',
      'infrastructure',
      'consumer',
      'business_services',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const sortOptions = [
      { value: 'seniority', label: 'Seniority' },
      { value: 'name', label: 'Name' },
      { value: 'region', label: 'Region' }
    ];

    return { roles, regions, sectorExpertiseOptions, sortOptions };
  }

  // searchTeamMembers(role, region, sectorExpertise, minYearsAtFirm, isInvestmentTeam, sortBy, sortDirection, page, pageSize)
  searchTeamMembers(role, region, sectorExpertise, minYearsAtFirm, isInvestmentTeam, sortBy, sortDirection, page, pageSize) {
    let members = this._getFromStorage('team_members');

    if (role) {
      members = members.filter((m) => m.role === role);
    }

    if (region) {
      members = members.filter((m) => m.region === region);
    }

    if (sectorExpertise) {
      members = members.filter((m) => Array.isArray(m.sector_expertise) && m.sector_expertise.includes(sectorExpertise));
    }

    if (typeof minYearsAtFirm === 'number') {
      members = members.filter((m) => typeof m.years_at_firm === 'number' && m.years_at_firm >= minYearsAtFirm);
    }

    if (typeof isInvestmentTeam === 'boolean') {
      members = members.filter((m) => !!m.is_investment_team === isInvestmentTeam);
    }

    const sortField = sortBy || 'name';
    const direction = sortDirection === 'desc' ? -1 : 1;

    members.sort((a, b) => {
      if (sortField === 'region') {
        const av = (a.region || '').toLowerCase();
        const bv = (b.region || '').toLowerCase();
        return this._compareStrings(av, bv) * direction;
      }
      if (sortField === 'seniority') {
        const av = a.years_at_firm || 0;
        const bv = b.years_at_firm || 0;
        return (bv - av) * direction; // more years = more senior
      }
      const av = (a.full_name || '').toLowerCase();
      const bv = (b.full_name || '').toLowerCase();
      return this._compareStrings(av, bv) * direction;
    });

    const totalCount = members.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = members.slice(start, start + ps);

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      teamMembers: paged
    };
  }

  // getTeamMemberDetail(teamMemberId)
  getTeamMemberDetail(teamMemberId) {
    const members = this._getFromStorage('team_members');
    return members.find((m) => m.id === teamMemberId) || null;
  }

  // getContactGroupsForSelection()
  getContactGroupsForSelection() {
    return this._getFromStorage('contact_groups');
  }

  // saveTeamMemberToContacts(teamMemberId, contactGroupId, notes)
  saveTeamMemberToContacts(teamMemberId, contactGroupId, notes) {
    const contact = this._getOrCreateContactFromTeamMember(teamMemberId);
    if (!contact) {
      return { success: false, message: 'Team member not found', contact: null, contactGroupMembership: null };
    }

    let membership = null;
    let group = null;

    if (contactGroupId) {
      const groups = this._getFromStorage('contact_groups');
      group = groups.find((g) => g.id === contactGroupId) || null;
      if (!group) {
        return { success: false, message: 'Contact group not found', contact, contactGroupMembership: null };
      }
    }

    if (!group && !contactGroupId) {
      group = this._getOrCreateContactGroupByName('Key Relationships');
    }

    if (group) {
      let memberships = this._getFromStorage('contact_group_memberships');
      const existing = memberships.find((m) => m.contact_id === contact.id && m.contact_group_id === group.id);
      if (existing) {
        membership = existing;
      } else {
        membership = {
          id: this._generateId('contact_group_membership'),
          contact_id: contact.id,
          contact_group_id: group.id,
          added_at: this._getCurrentTimestamp()
        };
        memberships.push(membership);
        this._saveToStorage('contact_group_memberships', memberships);
      }
    }

    // Optionally update notes on contact
    if (typeof notes === 'string' && notes.length > 0) {
      const contacts = this._getFromStorage('contacts');
      const idx = contacts.findIndex((c) => c.id === contact.id);
      if (idx !== -1) {
        contacts[idx].notes = notes;
        this._saveToStorage('contacts', contacts);
      }
    }

    const contactGroupMembership = membership
      ? { ...membership, contact, contact_group: group || null }
      : null;

    return {
      success: true,
      message: 'Contact saved',
      contact,
      contactGroupMembership
    };
  }

  // -------------------- Insights: Articles & Reading Lists --------------------

  // getInsightsArticleFilterOptions()
  getInsightsArticleFilterOptions() {
    const topics = [
      'private_credit',
      'growth_equity',
      'buyout',
      'infrastructure',
      'macroeconomics',
      'market_insights',
      'firm_news',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const dateRangePresets = [
      { value: 'last_30_days', label: 'Last 30 Days' },
      { value: 'last_12_months', label: 'Last 12 Months' },
      { value: 'year_to_date', label: 'Year to Date' },
      { value: 'all_time', label: 'All Time' }
    ];

    const readingTimeOptions = [
      { maxMinutes: 5, label: 'Under 5 minutes' },
      { maxMinutes: 10, label: 'Under 10 minutes' },
      { maxMinutes: 20, label: 'Under 20 minutes' }
    ];

    return { topics, dateRangePresets, readingTimeOptions };
  }

  // searchArticles(topic, dateRangePreset, customDateFrom, customDateTo, readingTimeMaxMinutes, sortBy, sortDirection, page, pageSize)
  searchArticles(topic, dateRangePreset, customDateFrom, customDateTo, readingTimeMaxMinutes, sortBy, sortDirection, page, pageSize) {
    let articles = this._getFromStorage('articles');

    if (topic) {
      articles = articles.filter((a) => a.topic === topic);
    }

    let from = null;
    let to = null;
    const now = new Date();

    if (dateRangePreset === 'last_30_days') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRangePreset === 'last_12_months') {
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    } else if (dateRangePreset === 'year_to_date') {
      from = new Date(now.getFullYear(), 0, 1);
    } else if (dateRangePreset === 'all_time') {
      from = null;
      to = null;
    }

    if (customDateFrom) {
      from = new Date(customDateFrom);
    }
    if (customDateTo) {
      to = new Date(customDateTo);
    }

    if (from || to) {
      articles = this._filterByDateRange(articles, 'publication_date', from, to);
    }

    if (typeof readingTimeMaxMinutes === 'number') {
      articles = articles.filter((a) => typeof a.reading_time_minutes === 'number' && a.reading_time_minutes <= readingTimeMaxMinutes);
    }

    const sortField = sortBy || 'publication_date';
    const direction = sortDirection === 'asc' ? 1 : -1;

    articles.sort((a, b) => {
      if (sortField === 'reading_time') {
        const av = a.reading_time_minutes || 0;
        const bv = b.reading_time_minutes || 0;
        return (av - bv) * direction;
      }
      const av = this._parseDate(a.publication_date) || new Date(0);
      const bv = this._parseDate(b.publication_date) || new Date(0);
      return (av - bv) * direction;
    });

    const totalCount = articles.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = articles.slice(start, start + ps);

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      articles: paged
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    return articles.find((a) => a.id === articleId) || null;
  }

  // getReadingListsForSelection()
  getReadingListsForSelection() {
    return this._getFromStorage('reading_lists');
  }

  // createReadingListAndAddArticle(listName, articleId, description)
  createReadingListAndAddArticle(listName, articleId, description) {
    if (!listName || !articleId) {
      return { success: false, message: 'listName and articleId are required', readingList: null, readingListItem: null };
    }

    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, message: 'Article not found', readingList: null, readingListItem: null };
    }

    const list = this._getOrCreateReadingListByName(listName, description);

    let items = this._getFromStorage('reading_list_items');
    const existing = items.find((i) => i.reading_list_id === list.id && i.article_id === articleId);
    if (existing) {
      return {
        success: true,
        message: 'Article already in list',
        readingList: list,
        readingListItem: {
          ...existing,
          reading_list: list,
          article
        }
      };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: list.id,
      article_id: article.id,
      added_at: this._getCurrentTimestamp()
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      message: 'Article added to reading list',
      readingList: list,
      readingListItem: {
        ...item,
        reading_list: list,
        article
      }
    };
  }

  // saveArticleToReadingList(readingListId, articleId)
  saveArticleToReadingList(readingListId, articleId) {
    if (!readingListId || !articleId) {
      return { success: false, message: 'readingListId and articleId are required', readingListItem: null };
    }

    const lists = this._getFromStorage('reading_lists');
    const articles = this._getFromStorage('articles');
    let items = this._getFromStorage('reading_list_items');

    const list = lists.find((l) => l.id === readingListId);
    if (!list) {
      return { success: false, message: 'Reading list not found', readingListItem: null };
    }

    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, message: 'Article not found', readingListItem: null };
    }

    const existing = items.find((i) => i.reading_list_id === readingListId && i.article_id === articleId);
    if (existing) {
      return {
        success: true,
        message: 'Article already in list',
        readingListItem: {
          ...existing,
          reading_list: list,
          article
        }
      };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingListId,
      article_id: articleId,
      added_at: this._getCurrentTimestamp()
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      message: 'Article added to reading list',
      readingListItem: {
        ...item,
        reading_list: list,
        article
      }
    };
  }

  // -------------------- Insights: Events, Registrations, Firm Calendar --------------------

  // getInsightsEventFilterOptions()
  getInsightsEventFilterOptions() {
    const eventTypes = [
      'webinar',
      'conference',
      'roundtable',
      'seminar',
      'panel',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const topics = [
      'private_credit',
      'growth_equity',
      'buyout',
      'infrastructure',
      'macroeconomics',
      'market_insights',
      'firm_news',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const dateRangePresets = [
      { value: 'upcoming', label: 'Upcoming' },
      { value: 'this_month', label: 'This Month' },
      { value: 'custom', label: 'Custom Range' }
    ];

    const locationTypes = [
      'virtual',
      'in_person',
      'hybrid'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    return { eventTypes, topics, dateRangePresets, locationTypes };
  }

  // searchEvents(eventType, topic, dateFrom, dateTo, dateRangePreset, upcomingOnly, sortBy, sortDirection, page, pageSize)
  searchEvents(eventType, topic, dateFrom, dateTo, dateRangePreset, upcomingOnly, sortBy, sortDirection, page, pageSize) {
    let events = this._getFromStorage('events');

    if (eventType) {
      events = events.filter((e) => e.event_type === eventType);
    }

    if (topic) {
      events = events.filter((e) => e.topic === topic);
    }

    const now = new Date();
    let from = dateFrom ? new Date(dateFrom) : null;
    let to = dateTo ? new Date(dateTo) : null;

    if (dateRangePreset === 'upcoming') {
      from = now;
      to = null;
    } else if (dateRangePreset === 'this_month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    if (from || to) {
      events = this._filterByDateRange(events, 'start_datetime', from, to);
    }

    if (upcomingOnly) {
      const cutoff = from || now;
      events = events.filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= cutoff;
      });
    }

    const sortField = sortBy || 'start_datetime';
    const direction = sortDirection === 'desc' ? -1 : 1;

    events.sort((a, b) => {
      const av = this._parseDate(a[sortField]) || new Date(0);
      const bv = this._parseDate(b[sortField]) || new Date(0);
      return (av - bv) * direction;
    });

    const totalCount = events.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = events.slice(start, start + ps);

    return {
      totalCount,
      page: pg,
      pageSize: ps,
      events: paged
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    return events.find((e) => e.id === eventId) || null;
  }

  // registerForEvent(eventId, fullName, businessEmail, organizationName)
  registerForEvent(eventId, fullName, businessEmail, organizationName) {
    if (!eventId || !fullName || !businessEmail) {
      return { success: false, message: 'Missing required fields', eventRegistration: null };
    }

    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', eventRegistration: null };
    }

    if (event.registration_open === false) {
      return { success: false, message: 'Registration is closed', eventRegistration: null };
    }

    let registrations = this._getFromStorage('event_registrations');
    const registration = {
      id: this._generateId('event_registration'),
      event_id: eventId,
      full_name: fullName,
      business_email: businessEmail,
      organization_name: organizationName || '',
      registered_at: this._getCurrentTimestamp(),
      registration_status: 'confirmed',
      source: 'website'
    };
    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      message: 'Registration confirmed',
      eventRegistration: {
        ...registration,
        event
      }
    };
  }

  // addEventToFirmCalendar(eventId, note)
  addEventToFirmCalendar(eventId, note) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found', firmCalendarEntry: null };
    }

    const entry = this._createFirmCalendarEntry(eventId, note);

    return {
      success: true,
      message: 'Event added to firm calendar',
      firmCalendarEntry: {
        ...entry,
        event
      }
    };
  }

  // -------------------- Investor Accounts (LP Portal) --------------------

  // getInvestorRegistrationOptions()
  getInvestorRegistrationOptions() {
    const investorTypes = [
      'institutional_investor',
      'high_net_worth_individual',
      'family_office',
      'fund_of_funds',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const regions = [
      'north_america',
      'europe',
      'asia_pacific',
      'latin_america',
      'middle_east_africa',
      'global'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const sectorOptions = [
      'technology',
      'healthcare',
      'financial_services',
      'industrial',
      'infrastructure',
      'consumer',
      'business_services',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const twoFactorMethods = [
      'authenticator_app',
      'sms',
      'email',
      'none'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    return { investorTypes, regions, sectorOptions, twoFactorMethods };
  }

  // registerInvestorAccount(investorType, region, intendedCommitmentMinUsd, intendedCommitmentMaxUsd, sectorInterests, email, password, preferredTwoFactorMethod)
  registerInvestorAccount(investorType, region, intendedCommitmentMinUsd, intendedCommitmentMaxUsd, sectorInterests, email, password, preferredTwoFactorMethod) {
    if (!investorType || !region || typeof intendedCommitmentMinUsd !== 'number' || typeof intendedCommitmentMaxUsd !== 'number' || !email || !password || !preferredTwoFactorMethod) {
      return { success: false, message: 'Missing required fields', investorAccount: null };
    }

    // Simple password complexity check
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (!(hasUpper && hasLower && hasNumber && hasSymbol)) {
      return { success: false, message: 'Password does not meet complexity requirements', investorAccount: null };
    }

    let accounts = this._getFromStorage('investor_accounts');
    const existing = accounts.find((a) => a.email === email);
    if (existing) {
      return { success: false, message: 'An account with this email already exists', investorAccount: null };
    }

    const account = {
      id: this._generateId('investor_account'),
      investor_type: investorType,
      region,
      intended_commitment_min_usd: intendedCommitmentMinUsd,
      intended_commitment_max_usd: intendedCommitmentMaxUsd,
      sector_interests: Array.isArray(sectorInterests) ? sectorInterests : [],
      email,
      password, // NOTE: in a real system this would be hashed
      preferred_two_factor_method: preferredTwoFactorMethod,
      created_at: this._getCurrentTimestamp()
    };

    accounts.push(account);
    this._saveToStorage('investor_accounts', accounts);

    return {
      success: true,
      message: 'Investor account registered',
      investorAccount: account
    };
  }

  // -------------------- About & Legal Content --------------------

  // getAboutPageContent()
  getAboutPageContent() {
    return this._getObjectFromStorage('about_page_content', {
      mission: '',
      history: '',
      investmentPhilosophy: '',
      assetsUnderManagementUsd: 0,
      teamSize: 0,
      offices: [],
      coreStrategies: [],
      milestones: [],
      awards: []
    });
  }

  // getLegalAndPrivacyContent()
  getLegalAndPrivacyContent() {
    return this._getObjectFromStorage('legal_and_privacy_content', {
      termsOfUseHtml: '',
      privacyPolicyHtml: '',
      cookiePolicyHtml: '',
      regulatoryDisclosuresHtml: '',
      complianceContacts: []
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