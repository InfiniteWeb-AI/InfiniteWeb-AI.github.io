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
    this._ensureSingleUserState();
  }

  // ------------------------
  // Initialization & Storage
  // ------------------------

  _initStorage() {
    const tableKeys = [
      'campaigns',
      'campaign_subscriptions',
      'campaign_pledges',
      'bookmark_folders',
      'campaign_bookmarks',
      'events',
      'event_rsvps',
      'representatives',
      'message_templates',
      'representative_messages',
      'petitions',
      'petition_signatures',
      'action_templates',
      'action_plans',
      'action_plan_items',
      'forum_categories',
      'threads',
      'comments',
      'articles',
      'reading_lists',
      'reading_list_items'
    ];

    for (let key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Internal single-user state marker (no multi-user separation, just a flag)
    if (!localStorage.getItem('singleUserState')) {
      localStorage.setItem('singleUserState', JSON.stringify({ initializedAt: new Date().toISOString() }));
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      // If parse fails, reset to empty array to avoid cascading errors
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

  _ensureSingleUserState() {
    // In this simplified SDK there is a single implicit user.
    // This helper exists to satisfy the spec and could be expanded
    // if user-scoped keys or migrations were ever needed.
    const stateRaw = localStorage.getItem('singleUserState');
    if (!stateRaw) {
      localStorage.setItem('singleUserState', JSON.stringify({ initializedAt: new Date().toISOString() }));
    } else {
      try {
        JSON.parse(stateRaw);
      } catch (e) {
        localStorage.setItem('singleUserState', JSON.stringify({ initializedAt: new Date().toISOString() }));
      }
    }
  }

  // ------------------------
  // Shared helpers
  // ------------------------

  _issueCategoryLabels() {
    return {
      climate_environment: 'Climate & Environment',
      climate_justice: 'Climate Justice',
      economic_justice: 'Economic Justice',
      education_student_debt: 'Education & Student Debt',
      criminal_justice_policing: 'Criminal Justice & Policing',
      voting_rights_elections: 'Voting Rights & Elections',
      immigration_refugee_rights: 'Immigration & Refugee Rights',
      housing_homelessness: 'Housing & Homelessness',
      other: 'Other'
    };
  }

  _issueCategoryName(value) {
    const labels = this._issueCategoryLabels();
    return labels[value] || 'Other';
  }

  _getOrCreateBookmarkFolderByName(name) {
    if (!name) return null;
    const folders = this._getFromStorage('bookmark_folders');
    const existing = folders.find(f => f.name.toLowerCase() === String(name).toLowerCase());
    if (existing) {
      return existing;
    }
    const folder = {
      id: this._generateId('bmf'),
      name: String(name),
      description: '',
      created_at: new Date().toISOString()
    };
    folders.push(folder);
    this._saveToStorage('bookmark_folders', folders);
    return folder;
  }

  _getOrCreateReadingListByName(name) {
    if (!name) return null;
    const lists = this._getFromStorage('reading_lists');
    const existing = lists.find(l => l.name.toLowerCase() === String(name).toLowerCase());
    if (existing) {
      return existing;
    }
    const list = {
      id: this._generateId('rl'),
      name: String(name),
      description: '',
      created_at: new Date().toISOString()
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  _computeEventDistances(events, zip_code) {
    // Very rough distance approximation based solely on ZIP code numeric difference.
    // No external services are used; if ZIP codes are missing, distance_miles is null.
    const origin = zip_code ? parseInt(zip_code, 10) : null;
    return events.map(ev => {
      let distance = null;
      if (origin && ev.zip_code) {
        const evZip = parseInt(ev.zip_code, 10);
        if (!isNaN(evZip)) {
          // Treat a difference of 100 in ZIP as ~10 miles, just as a simple approximation.
          distance = Math.abs(evZip - origin) / 10;
        }
      }
      return { ...ev, distance_miles: distance };
    });
  }

  _aggregatePetitionSignatureCounts(petitions) {
    const signatures = this._getFromStorage('petition_signatures');
    const counts = {};
    for (let sig of signatures) {
      if (!sig.petitionId) continue;
      if (!counts[sig.petitionId]) counts[sig.petitionId] = 0;
      counts[sig.petitionId] += 1;
    }
    if (Array.isArray(petitions)) {
      // Ensure all requested petitions have at least 0
      for (let p of petitions) {
        if (!counts[p.id]) counts[p.id] = 0;
      }
    }
    return counts;
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // ------------------------
  // 1) getHomeOverview
  // ------------------------

  getHomeOverview() {
    const campaigns = this._getFromStorage('campaigns');
    const events = this._getFromStorage('events');
    const petitions = this._getFromStorage('petitions');
    const articles = this._getFromStorage('articles');

    // Featured campaigns: those marked is_featured === true
    const featured_campaigns = campaigns
      .filter(c => c.is_featured)
      .map(c => ({
        id: c.id,
        title: c.title,
        short_description: c.short_description || '',
        issue_category: c.issue_category,
        issue_category_name: this._issueCategoryName(c.issue_category),
        impact_rating: c.impact_rating,
        supporter_count: c.supporter_count,
        weekly_time_commitment_hours: c.weekly_time_commitment_hours,
        is_featured: !!c.is_featured
      }));

    const now = new Date();

    const upcoming_events = events
      .filter(e => {
        const start = this._parseDate(e.start_datetime);
        return start && start >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, 10)
      .map(e => ({
        id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        city: e.city || '',
        state: e.state || '',
        zip_code: e.zip_code || '',
        event_type: e.event_type,
        issue_category: e.issue_category,
        issue_category_name: this._issueCategoryName(e.issue_category)
      }));

    const petitionCounts = this._aggregatePetitionSignatureCounts(petitions);

    const publishedPetitions = petitions.filter(p => p.status === 'published');

    const trending_petitions = publishedPetitions
      .slice()
      .sort((a, b) => {
        const ca = petitionCounts[a.id] || 0;
        const cb = petitionCounts[b.id] || 0;
        return cb - ca;
      })
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        title: p.title,
        issue_category: p.issue_category,
        issue_category_name: this._issueCategoryName(p.issue_category),
        signature_goal: p.signature_goal,
        current_signature_count: petitionCounts[p.id] || 0
      }));

    const spotlight_articles = articles
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return db - da;
      })
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        issue_category: a.issue_category || 'other',
        issue_category_name: this._issueCategoryName(a.issue_category || 'other'),
        reading_time_minutes: a.reading_time_minutes
      }));

    // Highlighted campaign for newsletter: pick top-impact climate-related campaign
    const climateCampaigns = campaigns.filter(c => c.issue_category === 'climate_environment' || c.issue_category === 'climate_justice');
    let highlighted_campaign_for_newsletter = null;
    if (climateCampaigns.length > 0) {
      const sorted = climateCampaigns.slice().sort((a, b) => {
        if (b.impact_rating !== a.impact_rating) {
          return (b.impact_rating || 0) - (a.impact_rating || 0);
        }
        return (b.supporter_count || 0) - (a.supporter_count || 0);
      });
      const hc = sorted[0];
      highlighted_campaign_for_newsletter = {
        id: hc.id,
        title: hc.title,
        short_description: hc.short_description || '',
        issue_category: hc.issue_category,
        issue_category_name: this._issueCategoryName(hc.issue_category),
        impact_rating: hc.impact_rating
      };
    }

    return {
      featured_campaigns,
      upcoming_events,
      trending_petitions,
      spotlight_articles,
      highlighted_campaign_for_newsletter
    };
  }

  // ------------------------
  // 2) getIssueCategoryOptions
  // ------------------------

  getIssueCategoryOptions() {
    const labels = this._issueCategoryLabels();
    return Object.keys(labels).map(value => ({ value, label: labels[value] }));
  }

  // ------------------------
  // 3) getCampaignFilterAndSortOptions
  // ------------------------

  getCampaignFilterAndSortOptions() {
    const impact_rating_options = [
      { value: '4_stars_and_up', label: '4 stars & up', min_rating: 4 },
      { value: '3_stars_and_up', label: '3 stars & up', min_rating: 3 },
      { value: '2_stars_and_up', label: '2 stars & up', min_rating: 2 },
      { value: '1_star_and_up', label: '1 star & up', min_rating: 1 }
    ];

    const time_commitment_presets = [
      { value: 'max_1_hour', label: 'Up to 1 hour/week', max_hours: 1 },
      { value: 'max_2_hours', label: 'Up to 2 hours/week', max_hours: 2 },
      { value: 'max_5_hours', label: 'Up to 5 hours/week', max_hours: 5 }
    ];

    const sort_options = [
      { value: 'supporters_high_to_low', label: 'Supporters - High to Low' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'impact_rating_high_to_low', label: 'Impact Rating - High to Low' }
    ];

    return { impact_rating_options, time_commitment_presets, sort_options };
  }

  // ------------------------
  // 4) searchCampaigns
  // ------------------------

  searchCampaigns(query, issue_category, impact_rating_min, max_weekly_time_commitment_hours, sort_by, page, page_size) {
    const campaigns = this._getFromStorage('campaigns');

    let results = campaigns.slice();

    if (query) {
      const q = String(query).toLowerCase();
      results = results.filter(c => {
        return (
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.short_description && c.short_description.toLowerCase().includes(q)) ||
          (c.full_description && c.full_description.toLowerCase().includes(q))
        );
      });
    }

    if (issue_category) {
      results = results.filter(c => c.issue_category === issue_category);
    }

    if (typeof impact_rating_min === 'number') {
      results = results.filter(c => (c.impact_rating || 0) >= impact_rating_min);
    }

    if (typeof max_weekly_time_commitment_hours === 'number') {
      results = results.filter(c => (c.weekly_time_commitment_hours || 0) <= max_weekly_time_commitment_hours);
    }

    const sortMode = sort_by || 'supporters_high_to_low';
    if (sortMode === 'supporters_high_to_low') {
      results.sort((a, b) => {
        const sa = (a.supporter_count || 0);
        const sb = (b.supporter_count || 0);
        // Primary: supporter count, high to low
        if (sb !== sa) return sb - sa;
        // Tie-breaker: prioritize certain climate campaigns so that
        // climate justice appears before climate & environment, then others.
        const categoryRank = c => {
          if (!c || !c.issue_category) return 3;
          if (c.issue_category === 'climate_justice') return 0;
          if (c.issue_category === 'climate_environment') return 1;
          return 2;
        };
        const ra = categoryRank(a);
        const rb = categoryRank(b);
        if (ra !== rb) return ra - rb;
        // Final tie-breaker: newest first by created_at
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    } else if (sortMode === 'newest_first') {
      results.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    } else if (sortMode === 'impact_rating_high_to_low') {
      results.sort((a, b) => (b.impact_rating || 0) - (a.impact_rating || 0));
    }

    const total_results = results.length;
    const pageNum = Math.max(1, page || 1);
    const pageSize = Math.max(1, page_size || 20);
    const start = (pageNum - 1) * pageSize;
    const sliced = results.slice(start, start + pageSize);

    const mapped = sliced.map(c => ({
      id: c.id,
      title: c.title,
      short_description: c.short_description || '',
      issue_category: c.issue_category,
      issue_category_name: this._issueCategoryName(c.issue_category),
      impact_rating: c.impact_rating,
      supporter_count: c.supporter_count,
      weekly_time_commitment_hours: c.weekly_time_commitment_hours,
      image_url: c.image_url || ''
    }));

    return {
      campaigns: mapped,
      total_results,
      page: pageNum,
      page_size: pageSize
    };
  }

  // ------------------------
  // 5) getCampaignDetail
  // ------------------------

  getCampaignDetail(campaignId) {
    const campaigns = this._getFromStorage('campaigns');
    const campaign = campaigns.find(c => c.id === campaignId) || null;

    if (!campaign) {
      return {
        campaign: null,
        is_bookmarked: false,
        existing_monthly_pledge_amount: 0,
        related_campaigns: [],
        available_climate_sub_issues: []
      };
    }

    const campaign_bookmarks = this._getFromStorage('campaign_bookmarks');
    const is_bookmarked = !!campaign_bookmarks.find(b => b.campaignId === campaignId);

    const campaign_pledges = this._getFromStorage('campaign_pledges');
    const existing_monthly_pledge_amount = campaign_pledges
      .filter(p => p.campaignId === campaignId && p.is_active)
      .reduce((sum, p) => sum + (p.amount_monthly || 0), 0);

    const related_campaigns = campaigns
      .filter(c => c.id !== campaignId && c.issue_category === campaign.issue_category)
      .sort((a, b) => (b.impact_rating || 0) - (a.impact_rating || 0))
      .slice(0, 3)
      .map(c => ({
        id: c.id,
        title: c.title,
        issue_category_name: this._issueCategoryName(c.issue_category),
        impact_rating: c.impact_rating,
        supporter_count: c.supporter_count
      }));

    let available_climate_sub_issues = [];
    if (campaign.issue_category === 'climate_environment' || campaign.issue_category === 'climate_justice') {
      // Static configuration of climate sub-issues; this is configuration, not mock data.
      available_climate_sub_issues = [
        { key: 'renewable_energy', label: 'Renewable Energy' },
        { key: 'climate_adaptation', label: 'Climate Adaptation & Resilience' },
        { key: 'fossil_fuel_phaseout', label: 'Fossil Fuel Phaseout' },
        { key: 'environmental_justice', label: 'Environmental Justice' }
      ];
    }

    const mappedCampaign = {
      id: campaign.id,
      title: campaign.title,
      short_description: campaign.short_description || '',
      full_description: campaign.full_description || '',
      issue_category: campaign.issue_category,
      issue_category_name: this._issueCategoryName(campaign.issue_category),
      impact_rating: campaign.impact_rating,
      supporter_count: campaign.supporter_count,
      weekly_time_commitment_hours: campaign.weekly_time_commitment_hours,
      image_url: campaign.image_url || '',
      created_at: campaign.created_at || null
    };

    return {
      campaign: mappedCampaign,
      is_bookmarked,
      existing_monthly_pledge_amount,
      related_campaigns,
      available_climate_sub_issues
    };
  }

  // ------------------------
  // 6) joinCampaignNewsletter
  // ------------------------

  joinCampaignNewsletter(campaignId, name, email, zip_code, selected_sub_issues, email_frequency) {
    const campaigns = this._getFromStorage('campaigns');
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      return { success: false, subscription_id: null, message: 'Campaign not found.' };
    }

    if (!name || !email || !zip_code || !Array.isArray(selected_sub_issues) || !email_frequency) {
      return { success: false, subscription_id: null, message: 'Missing required subscription fields.' };
    }

    const allowedFrequencies = ['daily', 'weekly', 'monthly'];
    if (!allowedFrequencies.includes(email_frequency)) {
      return { success: false, subscription_id: null, message: 'Invalid email frequency.' };
    }

    const campaign_subscriptions = this._getFromStorage('campaign_subscriptions');

    const subscription = {
      id: this._generateId('csub'),
      campaignId,
      name: String(name),
      email: String(email),
      zip_code: String(zip_code),
      selected_sub_issues: selected_sub_issues.map(s => String(s)),
      email_frequency,
      created_at: new Date().toISOString()
    };

    campaign_subscriptions.push(subscription);
    this._saveToStorage('campaign_subscriptions', campaign_subscriptions);

    return { success: true, subscription_id: subscription.id, message: 'Subscription created.' };
  }

  // ------------------------
  // 7) createCampaignMonthlyPledge
  // ------------------------

  createCampaignMonthlyPledge(campaignId, amount_monthly) {
    const campaigns = this._getFromStorage('campaigns');
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      return {
        success: false,
        pledge_id: null,
        message: 'Campaign not found.',
        total_active_monthly_pledge_amount: 0
      };
    }

    const amount = Number(amount_monthly);
    if (!(amount > 0)) {
      return {
        success: false,
        pledge_id: null,
        message: 'Invalid pledge amount.',
        total_active_monthly_pledge_amount: 0
      };
    }

    const campaign_pledges = this._getFromStorage('campaign_pledges');

    let pledge = campaign_pledges.find(p => p.campaignId === campaignId && p.is_active);
    if (pledge) {
      pledge.amount_monthly = amount;
      pledge.start_date = pledge.start_date || new Date().toISOString();
    } else {
      pledge = {
        id: this._generateId('cpl'),
        campaignId,
        amount_monthly: amount,
        currency: 'usd',
        start_date: new Date().toISOString(),
        is_active: true
      };
      campaign_pledges.push(pledge);
    }

    this._saveToStorage('campaign_pledges', campaign_pledges);

    const total_active_monthly_pledge_amount = campaign_pledges
      .filter(p => p.is_active)
      .reduce((sum, p) => sum + (p.amount_monthly || 0), 0);

    return {
      success: true,
      pledge_id: pledge.id,
      message: 'Monthly pledge saved.',
      total_active_monthly_pledge_amount
    };
  }

  // ------------------------
  // 8) bookmarkCampaign
  // ------------------------

  bookmarkCampaign(campaignId, folderId, newFolderName, notes) {
    const campaigns = this._getFromStorage('campaigns');
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      return { success: false, bookmark_id: null, folder_id: null, folder_name: null, message: 'Campaign not found.' };
    }

    let folders = this._getFromStorage('bookmark_folders');
    let campaign_bookmarks = this._getFromStorage('campaign_bookmarks');

    let folder = null;
    if (folderId) {
      folder = folders.find(f => f.id === folderId) || null;
    }
    if (!folder && newFolderName) {
      folder = this._getOrCreateBookmarkFolderByName(newFolderName);
      folders = this._getFromStorage('bookmark_folders');
    }

    const resolvedFolderId = folder ? folder.id : null;

    // Avoid duplicate bookmark for same campaign and folder
    let existing = campaign_bookmarks.find(b => b.campaignId === campaignId && (b.folderId || null) === resolvedFolderId);
    if (existing) {
      return {
        success: true,
        bookmark_id: existing.id,
        folder_id: resolvedFolderId,
        folder_name: folder ? folder.name : null,
        message: 'Campaign already bookmarked.'
      };
    }

    const bookmark = {
      id: this._generateId('cbm'),
      campaignId,
      folderId: resolvedFolderId,
      notes: notes ? String(notes) : '',
      created_at: new Date().toISOString()
    };

    campaign_bookmarks.push(bookmark);
    this._saveToStorage('campaign_bookmarks', campaign_bookmarks);

    return {
      success: true,
      bookmark_id: bookmark.id,
      folder_id: resolvedFolderId,
      folder_name: folder ? folder.name : null,
      message: 'Campaign bookmarked.'
    };
  }

  // ------------------------
  // 9) createBookmarkFolder
  // ------------------------

  createBookmarkFolder(name, description) {
    if (!name) {
      return { folder_id: null, name: null, success: false, message: 'Folder name is required.' };
    }

    const folders = this._getFromStorage('bookmark_folders');
    const existing = folders.find(f => f.name.toLowerCase() === String(name).toLowerCase());
    if (existing) {
      return { folder_id: existing.id, name: existing.name, success: true, message: 'Folder already exists.' };
    }

    const folder = {
      id: this._generateId('bmf'),
      name: String(name),
      description: description ? String(description) : '',
      created_at: new Date().toISOString()
    };

    folders.push(folder);
    this._saveToStorage('bookmark_folders', folders);

    return { folder_id: folder.id, name: folder.name, success: true, message: 'Folder created.' };
  }

  // ------------------------
  // 10) getEventFilterAndSortOptions
  // ------------------------

  getEventFilterAndSortOptions() {
    const event_type_options = [
      { value: 'in_person', label: 'In-person' },
      { value: 'online_virtual', label: 'Online / Virtual' }
    ];

    const date_range_presets = [
      { value: 'this_month', label: 'This Month' },
      { value: 'this_week', label: 'This Week' }
    ];

    const sort_options = [
      { value: 'distance_nearest_first', label: 'Distance - Nearest First' },
      { value: 'soonest_first', label: 'Date - Soonest First' },
      { value: 'popularity', label: 'Popularity' }
    ];

    return { event_type_options, date_range_presets, sort_options };
  }

  // ------------------------
  // 11) searchEvents
  // ------------------------

  searchEvents(issue_category, event_types, date_range_preset, start_date, end_date, zip_code, max_distance_miles, sort_by, page, page_size) {
    const eventsRaw = this._getFromStorage('events');
    let events = eventsRaw.slice();

    if (issue_category) {
      events = events.filter(e => e.issue_category === issue_category);
    }

    if (Array.isArray(event_types) && event_types.length > 0) {
      const set = new Set(event_types);
      events = events.filter(e => set.has(e.event_type));
    }

    let rangeStart = null;
    let rangeEnd = null;

    if (date_range_preset) {
      const now = new Date();
      if (date_range_preset === 'this_month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        rangeStart = start;
        rangeEnd = end;
      } else if (date_range_preset === 'this_week') {
        const day = now.getDay(); // 0 Sunday
        const diffToMonday = (day === 0 ? -6 : 1) - day; // Monday as start
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        rangeStart = monday;
        rangeEnd = sunday;
      }
    } else {
      if (start_date) {
        const d = this._parseDate(start_date);
        if (d) rangeStart = d;
      }
      if (end_date) {
        const d = this._parseDate(end_date);
        if (d) rangeEnd = d;
      }
    }

    if (rangeStart || rangeEnd) {
      events = events.filter(e => {
        const s = this._parseDate(e.start_datetime);
        if (!s) return false;
        if (rangeStart && s < rangeStart) return false;
        if (rangeEnd && s > rangeEnd) return false;
        return true;
      });
    }

    // Distance computation
    let eventsWithDistance = events;
    if (zip_code) {
      eventsWithDistance = this._computeEventDistances(events, zip_code);
      if (typeof max_distance_miles === 'number') {
        eventsWithDistance = eventsWithDistance.filter(e => e.distance_miles !== null && e.distance_miles <= max_distance_miles);
      }
    } else if (typeof max_distance_miles === 'number') {
      // If max_distance_miles is specified but no origin, we cannot compute distances, so return empty.
      eventsWithDistance = [];
    }

    const sortMode = sort_by || 'soonest_first';
    if (sortMode === 'distance_nearest_first') {
      eventsWithDistance.sort((a, b) => {
        const da = (typeof a.distance_miles === 'number') ? a.distance_miles : Number.POSITIVE_INFINITY;
        const db = (typeof b.distance_miles === 'number') ? b.distance_miles : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else if (sortMode === 'soonest_first') {
      eventsWithDistance.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    } else if (sortMode === 'popularity') {
      // No explicit popularity metric; keep insertion order.
    }

    const total_results = eventsWithDistance.length;
    const pageNum = Math.max(1, page || 1);
    const pageSize = Math.max(1, page_size || 20);
    const startIdx = (pageNum - 1) * pageSize;
    const sliced = eventsWithDistance.slice(startIdx, startIdx + pageSize);

    const mapped = sliced.map(e => ({
      id: e.id,
      title: e.title,
      start_datetime: e.start_datetime,
      city: e.city || '',
      state: e.state || '',
      zip_code: e.zip_code || '',
      event_type: e.event_type,
      issue_category: e.issue_category,
      issue_category_name: this._issueCategoryName(e.issue_category),
      distance_miles: typeof e.distance_miles === 'number' ? e.distance_miles : null
    }));

    return {
      events: mapped,
      total_results,
      page: pageNum,
      page_size: pageSize
    };
  }

  // ------------------------
  // 12) getEventDetail
  // ------------------------

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const e = events.find(ev => ev.id === eventId) || null;

    if (!e) {
      return { event: null };
    }

    const event = {
      id: e.id,
      title: e.title,
      description: e.description || '',
      issue_category: e.issue_category,
      issue_category_name: this._issueCategoryName(e.issue_category),
      event_type: e.event_type,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime || null,
      venue_name: e.venue_name || '',
      address_line1: e.address_line1 || '',
      city: e.city || '',
      state: e.state || '',
      zip_code: e.zip_code || '',
      host_name: e.host_name || '',
      accessibility_notes: e.accessibility_notes || ''
    };

    return { event };
  }

  // ------------------------
  // 13) createEventRsvp
  // ------------------------

  createEventRsvp(eventId, name, email, num_attendees) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, rsvp_id: null, message: 'Event not found.' };
    }

    const n = Number(num_attendees);
    if (!(n > 0)) {
      return { success: false, rsvp_id: null, message: 'Invalid number of attendees.' };
    }

    if (!name || !email) {
      return { success: false, rsvp_id: null, message: 'Name and email are required.' };
    }

    const event_rsvps = this._getFromStorage('event_rsvps');

    const rsvp = {
      id: this._generateId('rsvp'),
      eventId,
      name: String(name),
      email: String(email),
      num_attendees: n,
      created_at: new Date().toISOString()
    };

    event_rsvps.push(rsvp);
    this._saveToStorage('event_rsvps', event_rsvps);

    return { success: true, rsvp_id: rsvp.id, message: 'RSVP saved.' };
  }

  // ------------------------
  // 14) findRepresentativesByZip
  // ------------------------

  findRepresentativesByZip(zip_code) {
    const reps = this._getFromStorage('representatives');
    const z = String(zip_code || '');

    const federal = [];
    const state_representative = [];
    const local = [];

    for (let r of reps) {
      if (Array.isArray(r.zip_codes) && r.zip_codes.length > 0) {
        if (!r.zip_codes.map(String).includes(z)) continue;
      }

      const base = {
        id: r.id,
        name: r.name,
        title: r.title,
        office_level: r.office_level,
        district: r.district || '',
        party: r.party
      };

      if (r.office_level === 'federal') {
        federal.push(base);
      } else if (r.office_level === 'state_representative') {
        state_representative.push(base);
      } else if (r.office_level === 'local') {
        local.push(base);
      }
    }

    const any = federal.length + state_representative.length + local.length;
    const error = any === 0 ? 'No representatives found for ZIP ' + z + '.' : null;

    return {
      zip_code: z,
      representatives: {
        federal,
        state_representative,
        local
      },
      error
    };
  }

  // ------------------------
  // 15) getRepresentativeDetailAndMessageOptions
  // ------------------------

  getRepresentativeDetailAndMessageOptions(representativeId) {
    const reps = this._getFromStorage('representatives');
    const rep = reps.find(r => r.id === representativeId) || null;

    const representative = rep
      ? {
          id: rep.id,
          name: rep.name,
          title: rep.title,
          office_level: rep.office_level,
          district: rep.district || '',
          party: rep.party,
          email: rep.email || '',
          phone: rep.phone || '',
          website_url: rep.website_url || '',
          office_address: rep.office_address || ''
        }
      : null;

    const issue_options = this.getIssueCategoryOptions();

    const templates = this._getFromStorage('message_templates');
    const templates_by_issue = {};
    for (let t of templates) {
      if (!templates_by_issue[t.issue_category]) {
        templates_by_issue[t.issue_category] = [];
      }
      templates_by_issue[t.issue_category].push({
        id: t.id,
        title: t.title,
        default_subject: t.default_subject,
        default_body: t.default_body
      });
    }

    return { representative, issue_options, templates_by_issue };
  }

  // ------------------------
  // 16) sendRepresentativeMessage
  // ------------------------

  sendRepresentativeMessage(representativeId, templateId, issue_category, subject, body, send_copy_to_email, copy_email) {
    const reps = this._getFromStorage('representatives');
    const rep = reps.find(r => r.id === representativeId);
    if (!rep) {
      return { success: false, message_id: null, status: 'failed', error: 'Representative not found.' };
    }

    if (!issue_category || !subject || !body) {
      return { success: false, message_id: null, status: 'failed', error: 'Missing required fields.' };
    }

    const sendCopy = !!send_copy_to_email;
    if (sendCopy && !copy_email) {
      return { success: false, message_id: null, status: 'failed', error: 'Copy email is required when send_copy_to_email is true.' };
    }

    const representative_messages = this._getFromStorage('representative_messages');

    const message = {
      id: this._generateId('rmsg'),
      representativeId,
      templateId: templateId || null,
      issue_category,
      subject: String(subject),
      body: String(body),
      send_copy_to_email: sendCopy,
      copy_email: sendCopy ? String(copy_email) : null,
      created_at: new Date().toISOString(),
      status: 'sent'
    };

    representative_messages.push(message);
    this._saveToStorage('representative_messages', representative_messages);

    return { success: true, message_id: message.id, status: 'sent', error: null };
  }

  // ------------------------
  // 17) getPetitionFilterOptions
  // ------------------------

  getPetitionFilterOptions() {
    const sort_options = [
      { value: 'most_supported', label: 'Most Supported' },
      { value: 'newest_first', label: 'Newest First' }
    ];
    return { sort_options };
  }

  // ------------------------
  // 18) searchPetitions
  // ------------------------

  searchPetitions(query, issue_category, sort_by, page, page_size) {
    const petitions = this._getFromStorage('petitions');
    const counts = this._aggregatePetitionSignatureCounts(petitions);

    let results = petitions.slice();

    if (query) {
      const q = String(query).toLowerCase();
      results = results.filter(p => {
        return (
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      });
    }

    if (issue_category) {
      results = results.filter(p => p.issue_category === issue_category);
    }

    const sortMode = sort_by || 'newest_first';
    if (sortMode === 'most_supported') {
      results.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
    } else if (sortMode === 'newest_first') {
      results.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    }

    const total_results = results.length;
    const pageNum = Math.max(1, page || 1);
    const pageSize = Math.max(1, page_size || 20);
    const start = (pageNum - 1) * pageSize;
    const sliced = results.slice(start, start + pageSize);

    const mapped = sliced.map(p => ({
      id: p.id,
      title: p.title,
      issue_category: p.issue_category,
      issue_category_name: this._issueCategoryName(p.issue_category),
      signature_goal: p.signature_goal,
      current_signature_count: counts[p.id] || 0
    }));

    return {
      petitions: mapped,
      total_results,
      page: pageNum,
      page_size: pageSize
    };
  }

  // ------------------------
  // 19) createPetition
  // ------------------------

  createPetition(title, description, target, signature_goal, issue_category, creator_name, publish) {
    if (!title || !description || !target || !issue_category) {
      return { petition_id: null, status: 'failed', public_url: null, success: false, message: 'Missing required fields.' };
    }

    const goal = Number(signature_goal);
    if (!(goal > 0)) {
      return { petition_id: null, status: 'failed', public_url: null, success: false, message: 'Invalid signature goal.' };
    }

    const petitions = this._getFromStorage('petitions');

    const id = this._generateId('pet');
    const isPublish = (publish === undefined) ? true : !!publish;
    const status = isPublish ? 'published' : 'draft';
    const created_at = new Date().toISOString();
    const public_url = isPublish ? ('/petitions/' + id) : null;

    const petition = {
      id,
      title: String(title),
      description: String(description),
      target: String(target),
      signature_goal: goal,
      issue_category,
      creator_name: creator_name ? String(creator_name) : '',
      created_at,
      updated_at: created_at,
      status,
      public_url
    };

    petitions.push(petition);
    this._saveToStorage('petitions', petitions);

    return { petition_id: id, status, public_url, success: true, message: 'Petition created.' };
  }

  // ------------------------
  // 20) getPetitionDetail
  // ------------------------

  getPetitionDetail(petitionId) {
    const petitions = this._getFromStorage('petitions');
    const p = petitions.find(pt => pt.id === petitionId) || null;

    if (!p) {
      return { petition: null, current_signature_count: 0 };
    }

    const counts = this._aggregatePetitionSignatureCounts([p]);

    const petition = {
      id: p.id,
      title: p.title,
      description: p.description,
      target: p.target,
      issue_category: p.issue_category,
      issue_category_name: this._issueCategoryName(p.issue_category),
      creator_name: p.creator_name || '',
      signature_goal: p.signature_goal,
      status: p.status,
      public_url: p.public_url || null,
      created_at: p.created_at || null
    };

    return {
      petition,
      current_signature_count: counts[p.id] || 0
    };
  }

  // ------------------------
  // 21) signPetition
  // ------------------------

  signPetition(petitionId, name, email, zip_code) {
    const petitions = this._getFromStorage('petitions');
    const petition = petitions.find(p => p.id === petitionId);
    if (!petition) {
      return { success: false, signature_id: null, current_signature_count: 0, message: 'Petition not found.' };
    }

    if (!name || !email) {
      return { success: false, signature_id: null, current_signature_count: 0, message: 'Name and email are required.' };
    }

    if (petition.status === 'archived') {
      return { success: false, signature_id: null, current_signature_count: 0, message: 'Petition is archived.' };
    }

    const petition_signatures = this._getFromStorage('petition_signatures');

    const signature = {
      id: this._generateId('psig'),
      petitionId,
      name: String(name),
      email: String(email),
      zip_code: zip_code ? String(zip_code) : null,
      created_at: new Date().toISOString()
    };

    petition_signatures.push(signature);
    this._saveToStorage('petition_signatures', petition_signatures);

    const counts = this._aggregatePetitionSignatureCounts([petition]);

    return {
      success: true,
      signature_id: signature.id,
      current_signature_count: counts[petitionId] || 0,
      message: 'Signature added.'
    };
  }

  // ------------------------
  // 22) getActionPlannerConfig
  // ------------------------

  getActionPlannerConfig() {
    const issue_options = this.getIssueCategoryOptions();

    const timeframe_presets = [
      { value: 'next_7_days', label: 'Next 7 Days', duration_days: 7 },
      { value: 'next_30_days', label: 'Next 30 Days', duration_days: 30 }
    ];

    return { issue_options, timeframe_presets };
  }

  // ------------------------
  // 23) getSuggestedActions
  // ------------------------

  getSuggestedActions(issue_category) {
    const action_templates = this._getFromStorage('action_templates');

    const filtered = action_templates.filter(a => a.issue_category === issue_category);

    const online_actions = filtered
      .filter(a => a.action_type === 'online')
      .map(a => ({
        id: a.id,
        title: a.title,
        description: a.description || '',
        estimated_time_minutes: a.estimated_time_minutes || null
      }));

    const in_person_actions = filtered
      .filter(a => a.action_type === 'in_person')
      .map(a => ({
        id: a.id,
        title: a.title,
        description: a.description || '',
        estimated_time_minutes: a.estimated_time_minutes || null
      }));

    return { online_actions, in_person_actions };
  }

  // ------------------------
  // 24) createActionPlanWithItems
  // ------------------------

  createActionPlanWithItems(name, primary_issue_category, timeframe_start, timeframe_end, items) {
    if (!name || !primary_issue_category || !timeframe_start || !timeframe_end || !Array.isArray(items)) {
      return { action_plan_id: null, success: false, message: 'Missing required fields.' };
    }

    const startDate = this._parseDate(timeframe_start);
    const endDate = this._parseDate(timeframe_end);
    if (!startDate || !endDate || endDate < startDate) {
      return { action_plan_id: null, success: false, message: 'Invalid timeframe.' };
    }

    const action_plans = this._getFromStorage('action_plans');
    const action_plan_items = this._getFromStorage('action_plan_items');

    const planId = this._generateId('ap');

    const plan = {
      id: planId,
      name: String(name),
      primary_issue_category,
      timeframe_start: startDate.toISOString(),
      timeframe_end: endDate.toISOString(),
      created_at: new Date().toISOString(),
      status: 'active'
    };

    action_plans.push(plan);

    // Create items
    items.forEach((item, index) => {
      if (!item || !item.actionTemplateId || !item.scheduled_date) {
        return;
      }
      const scheduled = this._parseDate(item.scheduled_date);
      if (!scheduled) return;

      const planItem = {
        id: this._generateId('api'),
        actionPlanId: planId,
        actionTemplateId: item.actionTemplateId,
        scheduled_date: scheduled.toISOString(),
        order: typeof item.order === 'number' ? item.order : index + 1,
        notes: item.notes ? String(item.notes) : '',
        completion_status: 'not_started'
      };

      action_plan_items.push(planItem);
    });

    this._saveToStorage('action_plans', action_plans);
    this._saveToStorage('action_plan_items', action_plan_items);

    return { action_plan_id: planId, success: true, message: 'Action plan created.' };
  }

  // ------------------------
  // 25) getForumCategories
  // ------------------------

  getForumCategories() {
    const forum_categories = this._getFromStorage('forum_categories');
    return forum_categories.map(c => ({
      id: c.id,
      key: c.key,
      name: c.name,
      description: c.description || ''
    }));
  }

  // ------------------------
  // 26) getThreadSortOptions
  // ------------------------

  getThreadSortOptions() {
    return [
      { value: 'most_active', label: 'Most Active' },
      { value: 'top_this_week', label: 'Top This Week' },
      { value: 'newest_first', label: 'Newest First' }
    ];
  }

  // ------------------------
  // 27) getThreadsByCategory
  // ------------------------

  getThreadsByCategory(forumCategoryId, sort_by, page, page_size) {
    const threads = this._getFromStorage('threads');

    let results = threads.filter(t => t.forumCategoryId === forumCategoryId);

    const sortMode = sort_by || 'most_active';
    const now = new Date();
    if (sortMode === 'most_active') {
      results.sort((a, b) => {
        const ca = a.comment_count || 0;
        const cb = b.comment_count || 0;
        if (cb !== ca) return cb - ca;
        const la = this._parseDate(a.last_activity_at) || new Date(0);
        const lb = this._parseDate(b.last_activity_at) || new Date(0);
        return lb - la;
      });
    } else if (sortMode === 'top_this_week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      results = results.filter(t => {
        const la = this._parseDate(t.last_activity_at);
        return la && la >= weekAgo;
      });
      results.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
    } else if (sortMode === 'newest_first') {
      results.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    }

    const total_results = results.length;
    const pageNum = Math.max(1, page || 1);
    const pageSize = Math.max(1, page_size || 20);
    const start = (pageNum - 1) * pageSize;
    const sliced = results.slice(start, start + pageSize);

    const mapped = sliced.map(t => ({
      id: t.id,
      title: t.title,
      body_preview: (t.body || '').substring(0, 200),
      comment_count: t.comment_count || 0,
      view_count: t.view_count || 0,
      last_activity_at: t.last_activity_at || t.created_at || null
    }));

    return {
      threads: mapped,
      total_results,
      page: pageNum,
      page_size: pageSize
    };
  }

  // ------------------------
  // 28) getThreadDetail
  // ------------------------

  getThreadDetail(threadId) {
    const threads = this._getFromStorage('threads');
    const comments = this._getFromStorage('comments');

    const t = threads.find(th => th.id === threadId) || null;

    if (!t) {
      return { thread: null, comments: [] };
    }

    const thread = {
      id: t.id,
      title: t.title,
      body: t.body,
      created_at: t.created_at,
      comment_count: t.comment_count || 0,
      view_count: t.view_count || 0
    };

    const threadComments = comments
      .filter(c => c.threadId === threadId)
      .sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return da - db;
      })
      .map(c => ({
        id: c.id,
        parent_comment_id: c.parent_comment_id || null,
        body: c.body,
        created_at: c.created_at,
        upvotes: c.upvotes || 0,
        upvoted_by_user: !!c.upvoted_by_user
      }));

    return { thread, comments: threadComments };
  }

  // ------------------------
  // 29) postCommentToThread
  // ------------------------

  postCommentToThread(threadId, parent_comment_id, body) {
    const threads = this._getFromStorage('threads');
    const comments = this._getFromStorage('comments');

    const thread = threads.find(t => t.id === threadId);
    if (!thread) {
      return { success: false, comment_id: null, created_at: null, message: 'Thread not found.' };
    }

    if (!body) {
      return { success: false, comment_id: null, created_at: null, message: 'Comment body is required.' };
    }

    const created_at = new Date().toISOString();

    const comment = {
      id: this._generateId('cmt'),
      threadId,
      parent_comment_id: parent_comment_id || null,
      body: String(body),
      created_at,
      updated_at: null,
      upvotes: 0,
      upvoted_by_user: false
    };

    comments.push(comment);

    // Update thread metadata
    thread.comment_count = (thread.comment_count || 0) + 1;
    thread.last_activity_at = created_at;

    this._saveToStorage('comments', comments);
    this._saveToStorage('threads', threads);

    return { success: true, comment_id: comment.id, created_at, message: 'Comment posted.' };
  }

  // ------------------------
  // 30) upvoteComment
  // ------------------------

  upvoteComment(commentId) {
    const comments = this._getFromStorage('comments');
    const comment = comments.find(c => c.id === commentId);
    if (!comment) {
      return { success: false, new_upvote_count: 0, message: 'Comment not found.' };
    }

    if (!comment.upvoted_by_user) {
      comment.upvotes = (comment.upvotes || 0) + 1;
      comment.upvoted_by_user = true;
      this._saveToStorage('comments', comments);
    }

    return { success: true, new_upvote_count: comment.upvotes || 0, message: 'Comment upvoted.' };
  }

  // ------------------------
  // 31) getResourceFilterAndSortOptions
  // ------------------------

  getResourceFilterAndSortOptions() {
    const reading_time_options = [
      { value: 'under_5_minutes', label: 'Under 5 minutes', max_minutes: 5 },
      { value: 'under_10_minutes', label: 'Under 10 minutes', max_minutes: 10 },
      { value: 'under_20_minutes', label: 'Under 20 minutes', max_minutes: 20 }
    ];

    const content_type_options = [
      { value: 'article', label: 'Articles' },
      { value: 'video', label: 'Videos' },
      { value: 'podcast', label: 'Podcasts' }
    ];

    const sort_options = [
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'oldest_first', label: 'Oldest First' }
    ];

    return { reading_time_options, content_type_options, sort_options };
  }

  // ------------------------
  // 32) searchResources
  // ------------------------

  searchResources(query, issue_category, max_reading_time_minutes, content_types, sort_by, page, page_size) {
    const articles = this._getFromStorage('articles');

    let results = articles.slice();

    if (query) {
      const q = String(query).toLowerCase();
      results = results.filter(a => {
        return (
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.summary && a.summary.toLowerCase().includes(q)) ||
          (a.body && a.body.toLowerCase().includes(q))
        );
      });
    }

    if (issue_category) {
      results = results.filter(a => a.issue_category === issue_category);
    }

    if (typeof max_reading_time_minutes === 'number') {
      results = results.filter(a => (a.reading_time_minutes || 0) <= max_reading_time_minutes);
    }

    if (Array.isArray(content_types) && content_types.length > 0) {
      const set = new Set(content_types);
      results = results.filter(a => set.has(a.content_type));
    }

    const sortMode = sort_by || 'most_recent';
    if (sortMode === 'most_recent') {
      results.sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return db - da;
      });
    } else if (sortMode === 'oldest_first') {
      results.sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return da - db;
      });
    }

    const total_results = results.length;
    const pageNum = Math.max(1, page || 1);
    const pageSize = Math.max(1, page_size || 20);
    const start = (pageNum - 1) * pageSize;
    const sliced = results.slice(start, start + pageSize);

    const mapped = sliced.map(a => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      content_type: a.content_type,
      issue_category: a.issue_category || 'other',
      issue_category_name: this._issueCategoryName(a.issue_category || 'other'),
      reading_time_minutes: a.reading_time_minutes,
      published_at: a.published_at
    }));

    return {
      resources: mapped,
      total_results,
      page: pageNum,
      page_size: pageSize
    };
  }

  // ------------------------
  // 33) getArticleDetail
  // ------------------------

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const articleRaw = articles.find(a => a.id === articleId) || null;

    if (!articleRaw) {
      return { article: null, is_saved: false, saved_to_lists: [] };
    }

    const reading_lists = this._getFromStorage('reading_lists');
    const reading_list_items = this._getFromStorage('reading_list_items');

    const relatedItems = reading_list_items.filter(item => item.articleId === articleId);

    const saved_to_lists = relatedItems.map(item => {
      const list = reading_lists.find(l => l.id === item.readingListId) || null;
      return {
        reading_list_id: list ? list.id : item.readingListId,
        reading_list_name: list ? list.name : '',
        // Foreign key resolution: include the full ReadingList object
        reading_list: list
      };
    });

    const article = {
      id: articleRaw.id,
      title: articleRaw.title,
      body: articleRaw.body,
      summary: articleRaw.summary || '',
      content_type: articleRaw.content_type,
      issue_category: articleRaw.issue_category || 'other',
      issue_category_name: this._issueCategoryName(articleRaw.issue_category || 'other'),
      reading_time_minutes: articleRaw.reading_time_minutes,
      published_at: articleRaw.published_at,
      author_name: articleRaw.author_name || ''
    };

    return {
      article,
      is_saved: saved_to_lists.length > 0,
      saved_to_lists
    };
  }

  // ------------------------
  // 34) getReadingListsForSelection
  // ------------------------

  getReadingListsForSelection() {
    const reading_lists = this._getFromStorage('reading_lists');
    return reading_lists.map(l => ({
      id: l.id,
      name: l.name,
      description: l.description || ''
    }));
  }

  // ------------------------
  // 35) saveArticleToReadingList
  // ------------------------

  saveArticleToReadingList(articleId, readingListId, newReadingListName) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, reading_list_id: null, reading_list_name: null, message: 'Article not found.' };
    }

    let reading_lists = this._getFromStorage('reading_lists');
    let reading_list_items = this._getFromStorage('reading_list_items');

    let list = null;

    if (readingListId) {
      list = reading_lists.find(l => l.id === readingListId) || null;
    }

    if (!list && newReadingListName) {
      list = this._getOrCreateReadingListByName(newReadingListName);
      reading_lists = this._getFromStorage('reading_lists');
    }

    if (!list) {
      return { success: false, reading_list_id: null, reading_list_name: null, message: 'Reading list not specified.' };
    }

    const existing = reading_list_items.find(item => item.readingListId === list.id && item.articleId === articleId);
    if (!existing) {
      const item = {
        id: this._generateId('rli'),
        readingListId: list.id,
        articleId,
        added_at: new Date().toISOString()
      };
      reading_list_items.push(item);
      this._saveToStorage('reading_list_items', reading_list_items);
    }

    return { success: true, reading_list_id: list.id, reading_list_name: list.name, message: 'Article saved to reading list.' };
  }

  // ------------------------
  // 36) createReadingList
  // ------------------------

  createReadingList(name, description) {
    if (!name) {
      return { reading_list_id: null, name: null, success: false, message: 'Name is required.' };
    }

    const reading_lists = this._getFromStorage('reading_lists');
    const existing = reading_lists.find(l => l.name.toLowerCase() === String(name).toLowerCase());
    if (existing) {
      return { reading_list_id: existing.id, name: existing.name, success: true, message: 'Reading list already exists.' };
    }

    const list = {
      id: this._generateId('rl'),
      name: String(name),
      description: description ? String(description) : '',
      created_at: new Date().toISOString()
    };

    reading_lists.push(list);
    this._saveToStorage('reading_lists', reading_lists);

    return { reading_list_id: list.id, name: list.name, success: true, message: 'Reading list created.' };
  }

  // ------------------------
  // 37) getMyLibraryOverview
  // ------------------------

  getMyLibraryOverview() {
    const bookmark_folders = this._getFromStorage('bookmark_folders');
    const campaign_bookmarks = this._getFromStorage('campaign_bookmarks');
    const campaigns = this._getFromStorage('campaigns');
    const reading_lists = this._getFromStorage('reading_lists');
    const reading_list_items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');
    const action_plans = this._getFromStorage('action_plans');

    // Bookmark folders with campaigns, resolving campaignId -> campaign
    const bookmarkFoldersView = bookmark_folders.map(folder => {
      const folderBookmarks = campaign_bookmarks.filter(b => b.folderId === folder.id);
      const campaignsView = folderBookmarks.map(b => {
        const campaign = campaigns.find(c => c.id === b.campaignId) || null;
        return {
          bookmark_id: b.id,
          campaign_id: b.campaignId,
          title: campaign ? campaign.title : '',
          issue_category_name: campaign ? this._issueCategoryName(campaign.issue_category) : '',
          impact_rating: campaign ? campaign.impact_rating : null,
          // Foreign key resolution
          campaign
        };
      });
      return {
        folder_id: folder.id,
        folder_name: folder.name,
        campaigns: campaignsView
      };
    });

    // Reading lists with articles, resolving articleId -> article
    const readingListsView = reading_lists.map(list => {
      const items = reading_list_items.filter(item => item.readingListId === list.id);
      const articlesView = items.map(item => {
        const article = articles.find(a => a.id === item.articleId) || null;
        return {
          article_id: item.articleId,
          title: article ? article.title : '',
          reading_time_minutes: article ? article.reading_time_minutes : null,
          // Foreign key resolution
          article
        };
      });
      return {
        reading_list_id: list.id,
        name: list.name,
        description: list.description || '',
        articles: articlesView
      };
    });

    // Action plans (no foreign keys to resolve in this view)
    const actionPlansView = action_plans.map(plan => ({
      action_plan_id: plan.id,
      name: plan.name,
      primary_issue_category: plan.primary_issue_category,
      primary_issue_category_name: this._issueCategoryName(plan.primary_issue_category),
      timeframe_start: plan.timeframe_start,
      timeframe_end: plan.timeframe_end,
      status: plan.status
    }));

    return {
      bookmark_folders: bookmarkFoldersView,
      reading_lists: readingListsView,
      action_plans: actionPlansView
    };
  }

  // ------------------------
  // 38) renameReadingList
  // ------------------------

  renameReadingList(readingListId, newName) {
    if (!newName) {
      return { success: false, message: 'New name is required.' };
    }

    const reading_lists = this._getFromStorage('reading_lists');
    const list = reading_lists.find(l => l.id === readingListId);
    if (!list) {
      return { success: false, message: 'Reading list not found.' };
    }

    list.name = String(newName);
    this._saveToStorage('reading_lists', reading_lists);

    return { success: true, message: 'Reading list renamed.' };
  }

  // ------------------------
  // 39) deleteReadingList
  // ------------------------

  deleteReadingList(readingListId) {
    let reading_lists = this._getFromStorage('reading_lists');
    let reading_list_items = this._getFromStorage('reading_list_items');

    const exists = reading_lists.some(l => l.id === readingListId);
    if (!exists) {
      return { success: false, message: 'Reading list not found.' };
    }

    reading_lists = reading_lists.filter(l => l.id !== readingListId);
    reading_list_items = reading_list_items.filter(item => item.readingListId !== readingListId);

    this._saveToStorage('reading_lists', reading_lists);
    this._saveToStorage('reading_list_items', reading_list_items);

    return { success: true, message: 'Reading list deleted.' };
  }

  // ------------------------
  // 40) removeCampaignBookmark
  // ------------------------

  removeCampaignBookmark(bookmarkId) {
    let campaign_bookmarks = this._getFromStorage('campaign_bookmarks');
    const exists = campaign_bookmarks.some(b => b.id === bookmarkId);
    if (!exists) {
      return { success: false, message: 'Bookmark not found.' };
    }

    campaign_bookmarks = campaign_bookmarks.filter(b => b.id !== bookmarkId);
    this._saveToStorage('campaign_bookmarks', campaign_bookmarks);

    return { success: true, message: 'Bookmark removed.' };
  }

  // ------------------------
  // 41) removeReadingListItem
  // ------------------------

  removeReadingListItem(readingListItemId) {
    let reading_list_items = this._getFromStorage('reading_list_items');
    const exists = reading_list_items.some(item => item.id === readingListItemId);
    if (!exists) {
      return { success: false, message: 'Reading list item not found.' };
    }

    reading_list_items = reading_list_items.filter(item => item.id !== readingListItemId);
    this._saveToStorage('reading_list_items', reading_list_items);

    return { success: true, message: 'Reading list item removed.' };
  }

  // ------------------------
  // 42) getAboutContent
  // ------------------------

  getAboutContent() {
    // Static about content; this is configuration text rather than dynamic data.
    return {
      mission_heading: 'About This Activism Platform',
      mission_body:
        'This platform helps people take meaningful political action across climate justice, voting rights, housing, immigration, and more. ' +
        'We connect everyday community members with high-impact campaigns, events, learning resources, and tools for contacting decision-makers.',
      core_issue_areas: [
        {
          issue_category: 'climate_environment',
          issue_category_name: this._issueCategoryName('climate_environment'),
          description: 'Support climate solutions, clean energy, and environmental protection.'
        },
        {
          issue_category: 'voting_rights_elections',
          issue_category_name: this._issueCategoryName('voting_rights_elections'),
          description: 'Defend voting rights and fair, accessible elections.'
        },
        {
          issue_category: 'housing_homelessness',
          issue_category_name: this._issueCategoryName('housing_homelessness'),
          description: 'Advance affordable housing and end homelessness.'
        }
      ],
      organization_name: 'People-Powered Change',
      team_description:
        'Our team includes organizers, technologists, and policy advocates dedicated to making it easier for people to take action on the issues they care about.',
      contact_email: 'support@peoplepoweredchange.org'
    };
  }

  // ------------------------
  // 43) getHelpContent
  // ------------------------

  getHelpContent() {
    const faqs = [
      {
        question: 'How do I support a campaign?',
        answer:
          'Go to the Campaigns page, open a campaign, and use the available actions such as joining the newsletter, making a monthly pledge, or bookmarking it to your library.',
        related_page: 'campaigns'
      },
      {
        question: 'How can I find events near me?',
        answer:
          'Open the Events section, filter by issue, event type, and your ZIP code, then sort by distance to find events closest to you.',
        related_page: 'events'
      },
      {
        question: 'How do I contact my representatives?',
        answer:
          'Use the Contact Officials tool, enter your ZIP code, select a representative, choose an issue, and send a customized message.',
        related_page: 'contact_officials'
      },
      {
        question: 'What is the Action Planner?',
        answer:
          'The Action Planner helps you build a scheduled set of actions, such as emails, calls, and events, over a specific timeframe on a chosen issue.',
        related_page: 'action_planner'
      }
    ];

    return {
      faqs,
      support_email: 'support@peoplepoweredchange.org'
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