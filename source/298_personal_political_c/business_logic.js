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

  // ---------- Storage helpers ----------
  _initStorage() {
    const arrayKeys = [
      'issues',
      'candidates',
      'candidate_issue_positions',
      'blog_posts',
      'events',
      'event_rsvps',
      'donations',
      'volunteer_signups',
      'contact_messages',
      'voter_survey_responses',
      'email_preferences',
      'media_items',
      'media_comments',
      'reading_list_items'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  // ---------- Common label helpers ----------
  _getIssueCategoryLabel(category) {
    const map = {
      climate: 'Climate',
      environment: 'Environment',
      healthcare: 'Healthcare',
      education: 'Education',
      economy: 'Economy',
      security: 'Security',
      immigration: 'Immigration',
      justice: 'Justice',
      voting_rights: 'Voting Rights',
      jobs: 'Jobs',
      taxes: 'Taxes',
      infrastructure: 'Infrastructure',
      other: 'Other'
    };
    return map[category] || (category || '');
  }

  _getBlogCategoryLabel(category) {
    const map = {
      environment: 'Environment',
      education: 'Education',
      healthcare: 'Healthcare',
      economy: 'Economy',
      security: 'Security',
      campaign: 'Campaign',
      announcement: 'Announcement',
      opinion: 'Opinion',
      endorsement: 'Endorsement',
      other: 'Other'
    };
    return map[category] || (category || '');
  }

  _getEventTypeLabel(eventType) {
    const map = {
      town_hall: 'Town Hall',
      rally: 'Rally',
      fundraiser: 'Fundraiser',
      debate: 'Debate',
      meet_and_greet: 'Meet & Greet',
      canvassing: 'Canvassing',
      phone_banking_event: 'Phone Banking',
      training: 'Training',
      other: 'Other'
    };
    return map[eventType] || (eventType || '');
  }

  _getLocationTypeLabel(locationType) {
    const map = {
      in_person: 'In Person',
      virtual: 'Virtual',
      hybrid: 'Hybrid'
    };
    return map[locationType] || (locationType || '');
  }

  _getMediaTypeLabel(mediaType) {
    const map = {
      speech: 'Speech',
      ad: 'Ad',
      interview: 'Interview',
      debate: 'Debate',
      town_hall_clip: 'Town Hall Clip',
      rally_clip: 'Rally Clip',
      other: 'Other'
    };
    return map[mediaType] || (mediaType || '');
  }

  _getStanceLabel(stance) {
    const map = {
      strongly_support: 'Strongly Support',
      support: 'Support',
      neutral: 'Neutral',
      oppose: 'Oppose',
      strongly_oppose: 'Strongly Oppose',
      not_stated: 'Not Stated'
    };
    return map[stance] || 'Not Stated';
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ---------- Reading list helpers ----------
  _getOrCreateReadingListStore() {
    let list = this._getFromStorage('reading_list_items', []);
    if (!Array.isArray(list)) {
      list = [];
      this._saveToStorage('reading_list_items', list);
    }
    return list;
  }

  _persistReadingList(list) {
    this._saveToStorage('reading_list_items', list || []);
  }

  // ---------- Donation validation helper ----------
  _validateDonationRequest(amount, frequency, donorName, email, addressLine1, city, postalCode, paymentMethod) {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return { valid: false, message: 'Invalid donation amount' };
    }
    const allowedFrequencies = ['one_time', 'monthly', 'weekly', 'quarterly', 'annually'];
    if (!allowedFrequencies.includes(frequency)) {
      return { valid: false, message: 'Invalid donation frequency' };
    }
    const allowedPaymentMethods = ['credit_debit_card', 'bank_transfer', 'paypal', 'apple_pay', 'google_pay', 'other'];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return { valid: false, message: 'Invalid payment method' };
    }
    if (!donorName || !email || !addressLine1 || !city || !postalCode) {
      return { valid: false, message: 'Missing required donor information' };
    }
    return { valid: true, message: 'OK' };
  }

  // ---------- Email preference helper ----------
  _getOrCreateEmailPreferenceRecord(email) {
    const prefs = this._getFromStorage('email_preferences', []);
    let existing = prefs.find((p) => p.email === email);
    const now = new Date().toISOString();
    if (!existing) {
      existing = {
        id: this._generateId('emailpref'),
        email: email,
        category_environment: false,
        category_education: false,
        category_economy: false,
        category_security: false,
        category_healthcare: false,
        category_campaign: false,
        frequency: 'off',
        include_blog_posts: true,
        include_event_reminders: false,
        include_campaign_announcements: false,
        pause_all_emails: false,
        created_at: now,
        updated_at: now
      };
      prefs.push(existing);
      this._saveToStorage('email_preferences', prefs);
    }
    return existing;
  }

  // ---------- Events filter helper ----------
  _filterEventsByMonthAndType(year, month, eventType) {
    const events = this._getFromStorage('events', []);
    return events.filter((evt) => {
      const d = this._parseDate(evt.start_datetime);
      if (!d) return false;
      const matchesMonth = d.getUTCFullYear() === year && (d.getUTCMonth() + 1) === month;
      const matchesType = !eventType || evt.event_type === eventType;
      return matchesMonth && matchesType;
    });
  }

  // ---------- Core interfaces ----------
  // getHomePageHighlights
  getHomePageHighlights() {
    const issues = this._getFromStorage('issues', []);
    const blogPosts = this._getFromStorage('blog_posts', []);
    const events = this._getFromStorage('events', []);
    const mediaItems = this._getFromStorage('media_items', []);

    const heroConfig = this._getFromStorage('homepage_config', null) || {};
    const hero = {
      headline: heroConfig.headline || 'A Campaign for the Future',
      subheadline: heroConfig.subheadline || 'Join our movement for better communities.',
      primary_cta_label: heroConfig.primary_cta_label || 'Donate',
      primary_cta_target: heroConfig.primary_cta_target || 'donate',
      secondary_cta_label: heroConfig.secondary_cta_label || 'Volunteer',
      secondary_cta_target: heroConfig.secondary_cta_target || 'volunteer'
    };

    // Priority issues: flagship first, then newest
    const sortedIssues = issues
      .slice()
      .sort((a, b) => {
        const af = a.is_flagship ? 1 : 0;
        const bf = b.is_flagship ? 1 : 0;
        if (af !== bf) return bf - af;
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return bd.getTime() - ad.getTime();
      });

    const priority_issues = sortedIssues.slice(0, 5).map((issue) => ({
      issue_id: issue.id,
      title: issue.title,
      category: issue.category,
      category_label: this._getIssueCategoryLabel(issue.category),
      summary: issue.summary || '',
      url: issue.url || '',
      is_flagship: !!issue.is_flagship
    }));

    // Latest blog posts (published only)
    const publishedPosts = blogPosts.filter((p) => p.status === 'published');
    publishedPosts.sort((a, b) => {
      const ad = this._parseDate(a.published_at) || new Date(0);
      const bd = this._parseDate(b.published_at) || new Date(0);
      return bd.getTime() - ad.getTime();
    });

    const latest_blog_posts = publishedPosts.slice(0, 5).map((post) => ({
      post_id: post.id,
      title: post.title,
      url: post.url || '',
      published_at: post.published_at || '',
      category: post.category,
      category_label: this._getBlogCategoryLabel(post.category),
      excerpt: post.excerpt || '',
      read_time_minutes: post.read_time_minutes || null
    }));

    // Upcoming events (start in future)
    const now = new Date();
    const upcoming = events
      .filter((evt) => {
        const d = this._parseDate(evt.start_datetime);
        return d && d.getTime() >= now.getTime();
      })
      .sort((a, b) => {
        const ad = this._parseDate(a.start_datetime) || new Date(0);
        const bd = this._parseDate(b.start_datetime) || new Date(0);
        return ad.getTime() - bd.getTime();
      });

    const upcoming_events = upcoming.slice(0, 5).map((evt) => ({
      event_id: evt.id,
      title: evt.title,
      url: evt.url || '',
      start_datetime: evt.start_datetime || '',
      event_type: evt.event_type,
      event_type_label: this._getEventTypeLabel(evt.event_type),
      city: evt.city || '',
      state: evt.state || ''
    }));

    // Featured media: highest view_count published item
    const publishedMedia = mediaItems.filter((m) => m.status === 'published');
    let featured = null;
    if (publishedMedia.length > 0) {
      featured = publishedMedia
        .slice()
        .sort((a, b) => {
          const av = typeof a.view_count === 'number' ? a.view_count : 0;
          const bv = typeof b.view_count === 'number' ? b.view_count : 0;
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return bv - av;
        })[0];
    }

    const featured_media = featured
      ? {
          media_item_id: featured.id,
          title: featured.title,
          thumbnail_url: featured.thumbnail_url || '',
          video_url: featured.video_url || '',
          year: featured.year,
          view_count: featured.view_count
        }
      : {
          media_item_id: '',
          title: '',
          thumbnail_url: '',
          video_url: '',
          year: null,
          view_count: 0
        };

    return {
      hero,
      priority_issues,
      latest_blog_posts,
      upcoming_events,
      featured_media
    };
  }

  // getIssuesOverview
  getIssuesOverview() {
    const issues = this._getFromStorage('issues', []);
    const candidateIssuePositions = this._getFromStorage('candidate_issue_positions', []);

    const overviewIssues = issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      slug: issue.slug,
      url: issue.url || '',
      category: issue.category,
      category_label: this._getIssueCategoryLabel(issue.category),
      summary: issue.summary || '',
      hero_image_url: issue.hero_image_url || '',
      is_flagship: !!issue.is_flagship,
      created_at: issue.created_at || ''
    }));

    const has_comparison_tool = candidateIssuePositions.length > 0;

    return {
      issues: overviewIssues,
      has_comparison_tool
    };
  }

  // getIssueDetail(issueId)
  getIssueDetail(issueId) {
    const issues = this._getFromStorage('issues', []);
    const blogPosts = this._getFromStorage('blog_posts', []);
    const readingList = this._getOrCreateReadingListStore();

    const issue = issues.find((i) => i.id === issueId) || null;

    let issueObj = null;
    if (issue) {
      issueObj = {
        id: issue.id,
        title: issue.title,
        slug: issue.slug,
        url: issue.url || '',
        category: issue.category,
        category_label: this._getIssueCategoryLabel(issue.category),
        summary: issue.summary || '',
        body: issue.body || '',
        hero_image_url: issue.hero_image_url || '',
        is_flagship: !!issue.is_flagship,
        created_at: issue.created_at || '',
        updated_at: issue.updated_at || ''
      };
    }

    // Related blog posts: by primary_issue_id or matching issue.category
    const related_blog_posts = issue
      ? blogPosts
          .filter((post) => {
            if (post.status !== 'published') return false;
            const byPrimary = post.primary_issue_id && post.primary_issue_id === issue.id;
            const byCategory = post.category && issue.category && post.category === issue.category;
            const byIssueRelation = Array.isArray(issue.related_blog_post_ids)
              ? issue.related_blog_post_ids.includes(post.id)
              : false;
            return byPrimary || byCategory || byIssueRelation;
          })
          .sort((a, b) => {
            const ad = this._parseDate(a.published_at) || new Date(0);
            const bd = this._parseDate(b.published_at) || new Date(0);
            return bd.getTime() - ad.getTime();
          })
          .slice(0, 10)
          .map((post) => ({
            post_id: post.id,
            title: post.title,
            url: post.url || '',
            published_at: post.published_at || '',
            category: post.category,
            category_label: this._getBlogCategoryLabel(post.category),
            excerpt: post.excerpt || ''
          }))
      : [];

    // No structured relation for events -> return empty array for now
    const related_events = [];

    // Reading list status
    let savedItem = null;
    if (issue) {
      savedItem = readingList.find(
        (item) => item.saved_item_type === 'issue' && item.issue_id === issue.id
      ) || null;
    }

    const reading_list_status = {
      saved: !!savedItem,
      reading_list_item_id: savedItem ? savedItem.id : '',
      reading_list_item: savedItem ? this._clone(savedItem) : null
    };

    return {
      issue: issueObj,
      related_blog_posts,
      related_events,
      reading_list_status
    };
  }

  // saveToReadingList(savedItemType, issueId, blogPostId, eventId, mediaItemId, notes)
  saveToReadingList(savedItemType, issueId, blogPostId, eventId, mediaItemId, notes) {
    const allowedTypes = ['issue', 'blog_post', 'event', 'media_item', 'other_page'];
    if (!allowedTypes.includes(savedItemType)) {
      return { success: false, message: 'Invalid saved item type', reading_list_item: null };
    }

    const readingList = this._getOrCreateReadingListStore();
    const issues = this._getFromStorage('issues', []);
    const posts = this._getFromStorage('blog_posts', []);
    const events = this._getFromStorage('events', []);
    const mediaItems = this._getFromStorage('media_items', []);

    let pageTitle = '';
    let pageUrl = '';
    let savedFromPage = 'other';
    let existing = null;

    if (savedItemType === 'issue') {
      const issue = issues.find((i) => i.id === issueId);
      if (!issue) {
        return { success: false, message: 'Issue not found', reading_list_item: null };
      }
      pageTitle = issue.title;
      pageUrl = issue.url || '';
      savedFromPage = 'issue_detail';
      existing = readingList.find(
        (item) => item.saved_item_type === 'issue' && item.issue_id === issueId
      );
    } else if (savedItemType === 'blog_post') {
      const post = posts.find((p) => p.id === blogPostId);
      if (!post) {
        return { success: false, message: 'Blog post not found', reading_list_item: null };
      }
      pageTitle = post.title;
      pageUrl = post.url || '';
      savedFromPage = 'blog_post_detail';
      existing = readingList.find(
        (item) => item.saved_item_type === 'blog_post' && item.blog_post_id === blogPostId
      );
    } else if (savedItemType === 'event') {
      const evt = events.find((e) => e.id === eventId);
      if (!evt) {
        return { success: false, message: 'Event not found', reading_list_item: null };
      }
      pageTitle = evt.title;
      pageUrl = evt.url || '';
      savedFromPage = 'event_detail';
      existing = readingList.find(
        (item) => item.saved_item_type === 'event' && item.event_id === eventId
      );
    } else if (savedItemType === 'media_item') {
      const media = mediaItems.find((m) => m.id === mediaItemId);
      if (!media) {
        return { success: false, message: 'Media item not found', reading_list_item: null };
      }
      pageTitle = media.title;
      pageUrl = media.url || '';
      savedFromPage = 'media_detail';
      existing = readingList.find(
        (item) => item.saved_item_type === 'media_item' && item.media_item_id === mediaItemId
      );
    } else if (savedItemType === 'other_page') {
      // No associated entity; store minimal metadata
      savedFromPage = 'other';
    }

    if (existing) {
      if (typeof notes === 'string') {
        existing.notes = notes;
        this._persistReadingList(readingList);
      }
      return {
        success: true,
        message: 'Item already in reading list',
        reading_list_item: this._clone(existing)
      };
    }

    const now = new Date().toISOString();
    const item = {
      id: this._generateId('readinglist'),
      saved_item_type: savedItemType,
      issue_id: savedItemType === 'issue' ? issueId : null,
      blog_post_id: savedItemType === 'blog_post' ? blogPostId : null,
      event_id: savedItemType === 'event' ? eventId : null,
      media_item_id: savedItemType === 'media_item' ? mediaItemId : null,
      page_title: pageTitle,
      page_url: pageUrl,
      saved_from_page: savedFromPage,
      saved_at: now,
      notes: typeof notes === 'string' ? notes : ''
    };

    readingList.push(item);
    this._persistReadingList(readingList);

    return { success: true, message: 'Saved to reading list', reading_list_item: this._clone(item) };
  }

  // getReadingListItems
  getReadingListItems() {
    const readingList = this._getOrCreateReadingListStore();
    const issues = this._getFromStorage('issues', []);
    const posts = this._getFromStorage('blog_posts', []);
    const events = this._getFromStorage('events', []);
    const mediaItems = this._getFromStorage('media_items', []);

    return readingList.map((item) => {
      const result = this._clone(item);
      if (item.issue_id) {
        result.issue = issues.find((i) => i.id === item.issue_id) || null;
      } else {
        result.issue = null;
      }
      if (item.blog_post_id) {
        result.blog_post = posts.find((p) => p.id === item.blog_post_id) || null;
      } else {
        result.blog_post = null;
      }
      if (item.event_id) {
        result.event = events.find((e) => e.id === item.event_id) || null;
      } else {
        result.event = null;
      }
      if (item.media_item_id) {
        result.media_item = mediaItems.find((m) => m.id === item.media_item_id) || null;
      } else {
        result.media_item = null;
      }
      return result;
    });
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    const readingList = this._getOrCreateReadingListStore();
    const originalLength = readingList.length;
    const updated = readingList.filter((item) => item.id !== readingListItemId);
    this._persistReadingList(updated);
    const success = updated.length < originalLength;
    return {
      success,
      message: success ? 'Reading list item removed' : 'Reading list item not found'
    };
  }

  // getCandidateComparisonOptions
  getCandidateComparisonOptions() {
    const issues = this._getFromStorage('issues', []);
    const candidates = this._getFromStorage('candidates', []);
    const candidateIssuePositions = this._getFromStorage('candidate_issue_positions', []);

    const issueIdsWithPositions = new Set(candidateIssuePositions.map((p) => p.issue_id));

    const issueOptions = issues
      .filter((issue) => issueIdsWithPositions.size === 0 || issueIdsWithPositions.has(issue.id))
      .map((issue) => ({
        id: issue.id,
        title: issue.title,
        category: issue.category,
        category_label: this._getIssueCategoryLabel(issue.category)
      }));

    const opponents = candidates
      .filter((c) => c.role === 'opponent')
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        party: c.party || '',
        photo_url: c.photo_url || '',
        is_incumbent: !!c.is_incumbent
      }));

    let default_issue_id = '';
    const healthcareIssue = issueOptions.find((i) => i.category === 'healthcare' || i.title.toLowerCase().indexOf('health') !== -1);
    if (healthcareIssue) {
      default_issue_id = healthcareIssue.id;
    } else if (issueOptions.length > 0) {
      default_issue_id = issueOptions[0].id;
    }

    const default_opponent_id = opponents.length > 0 ? opponents[0].id : '';

    return {
      issues: issueOptions,
      opponents,
      default_issue_id,
      default_opponent_id
    };
  }

  // getCandidateComparison(issueId, opponentCandidateId)
  getCandidateComparison(issueId, opponentCandidateId) {
    const issues = this._getFromStorage('issues', []);
    const candidates = this._getFromStorage('candidates', []);
    const positions = this._getFromStorage('candidate_issue_positions', []);

    const issue = issues.find((i) => i.id === issueId) || null;
    const issueObj = issue
      ? {
          id: issue.id,
          title: issue.title,
          category: issue.category,
          category_label: this._getIssueCategoryLabel(issue.category),
          summary: issue.summary || ''
        }
      : null;

    const campaignCandidate = candidates.find((c) => c.role === 'campaign_candidate') || null;
    const opponentCandidate = candidates.find((c) => c.id === opponentCandidateId) || null;

    const campaignPosition = campaignCandidate
      ? positions.find((p) => p.candidate_id === campaignCandidate.id && p.issue_id === issueId) || null
      : null;

    const opponentPosition = opponentCandidate
      ? positions.find((p) => p.candidate_id === opponentCandidate.id && p.issue_id === issueId) || null
      : null;

    const campaign_candidate = campaignCandidate
      ? {
          candidate_id: campaignCandidate.id,
          name: campaignCandidate.name,
          photo_url: campaignCandidate.photo_url || '',
          party: campaignCandidate.party || '',
          position_summary: campaignPosition ? campaignPosition.position_summary : '',
          key_points: (campaignPosition && Array.isArray(campaignPosition.key_points))
            ? campaignPosition.key_points
            : [],
          stance: campaignPosition && campaignPosition.stance ? campaignPosition.stance : 'not_stated',
          stance_label: this._getStanceLabel(
            campaignPosition && campaignPosition.stance ? campaignPosition.stance : 'not_stated'
          ),
          candidate: this._clone(campaignCandidate)
        }
      : null;

    const opponent = opponentCandidate
      ? {
          candidate_id: opponentCandidate.id,
          name: opponentCandidate.name,
          photo_url: opponentCandidate.photo_url || '',
          party: opponentCandidate.party || '',
          position_summary: opponentPosition ? opponentPosition.position_summary : '',
          key_points: (opponentPosition && Array.isArray(opponentPosition.key_points))
            ? opponentPosition.key_points
            : [],
          stance: opponentPosition && opponentPosition.stance ? opponentPosition.stance : 'not_stated',
          stance_label: this._getStanceLabel(
            opponentPosition && opponentPosition.stance ? opponentPosition.stance : 'not_stated'
          ),
          candidate: this._clone(opponentCandidate)
        }
      : null;

    const comparison_highlights = [];
    if (campaign_candidate && opponent) {
      if (campaign_candidate.position_summary || opponent.position_summary) {
        comparison_highlights.push(
          'Compare healthcare positions between ' + campaign_candidate.name + ' and ' + opponent.name + '.'
        );
      }
    }

    // Instrumentation for task completion tracking (task_6)
    try {
      if (campaign_candidate && opponent) {
        localStorage.setItem(
          'task6_lastComparisonViewed',
          JSON.stringify({ issueId: issueId, opponentCandidateId: opponentCandidateId })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const related_issue_url = issue && issue.url ? issue.url : '';
    const contact_page_recommended = true;

    return {
      issue: issueObj,
      campaign_candidate,
      opponent,
      comparison_highlights,
      related_issue_url,
      contact_page_recommended
    };
  }

  // getBlogFilterOptions
  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts', []);

    const categoriesMap = new Map();
    const tagsMap = new Map();
    let minDate = null;
    let maxDate = null;

    posts.forEach((post) => {
      if (post.status !== 'published') return;
      if (post.category && !categoriesMap.has(post.category)) {
        categoriesMap.set(post.category, this._getBlogCategoryLabel(post.category));
      }
      if (Array.isArray(post.tags)) {
        post.tags.forEach((tag) => {
          if (tag && !tagsMap.has(tag)) {
            tagsMap.set(tag, tag);
          }
        });
      }
      const d = this._parseDate(post.published_at);
      if (d) {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    });

    const categories = Array.from(categoriesMap.entries()).map(([value, label]) => ({ value, label }));
    const tags = Array.from(tagsMap.entries()).map(([value, label]) => ({ value, label }));

    const sort_options = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' },
      { value: 'most_viewed', label: 'Most viewed' },
      { value: 'featured_first', label: 'Featured first' }
    ];

    const date_range = {
      min_date: minDate ? minDate.toISOString().slice(0, 10) : '',
      max_date: maxDate ? maxDate.toISOString().slice(0, 10) : ''
    };

    return { categories, tags, sort_options, date_range };
  }

  // searchBlogPosts(query, filters, sortBy)
  searchBlogPosts(query, filters, sortBy) {
    const posts = this._getFromStorage('blog_posts', []);
    const issues = this._getFromStorage('issues', []);

    const q = (query || '').toLowerCase().trim();
    const appliedFilters = filters || {};
    const categoryFilter = appliedFilters.category || null;
    const fromDateStr = appliedFilters.fromDate || null;
    const toDateStr = appliedFilters.toDate || null;
    const tagsFilter = Array.isArray(appliedFilters.tags) ? appliedFilters.tags : [];

    const fromDate = fromDateStr ? new Date(fromDateStr) : null;
    const toDate = toDateStr ? new Date(toDateStr) : null;

    const issuesById = new Map();
    issues.forEach((i) => issuesById.set(i.id, i));

    let results = posts.filter((post) => {
      if (post.status !== 'published') return false;

      if (q) {
        const inTitle = (post.title || '').toLowerCase().indexOf(q) !== -1;
        const inBody = (post.body || '').toLowerCase().indexOf(q) !== -1;
        const inTags = Array.isArray(post.tags)
          ? post.tags.some((t) => (t || '').toLowerCase().indexOf(q) !== -1)
          : false;
        if (!inTitle && !inBody && !inTags) return false;
      }

      if (categoryFilter) {
        let matchesCategory = post.category === categoryFilter;
        if (!matchesCategory && post.primary_issue_id) {
          const issue = issuesById.get(post.primary_issue_id);
          if (issue && issue.category === categoryFilter) {
            matchesCategory = true;
          }
        }
        if (!matchesCategory) return false;
      }

      const d = this._parseDate(post.published_at);
      if (fromDate && (!d || d < fromDate)) return false;
      if (toDate) {
        if (!d) return false;
        const endOfToDate = new Date(toDate.getTime());
        endOfToDate.setHours(23, 59, 59, 999);
        if (d > endOfToDate) return false;
      }

      if (tagsFilter.length > 0) {
        const postTags = Array.isArray(post.tags) ? post.tags : [];
        const hasAny = tagsFilter.some((tag) => postTags.includes(tag));
        if (!hasAny) return false;
      }

      return true;
    });

    const sort = sortBy || 'newest_first';
    if (sort === 'oldest_first') {
      results.sort((a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return ad.getTime() - bd.getTime();
      });
    } else if (sort === 'featured_first') {
      results.sort((a, b) => {
        const af = a.is_featured ? 1 : 0;
        const bf = b.is_featured ? 1 : 0;
        if (af !== bf) return bf - af;
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd.getTime() - ad.getTime();
      });
    } else if (sort === 'most_viewed') {
      results.sort((a, b) => {
        const av = typeof a.view_count === 'number' ? a.view_count : 0;
        const bv = typeof b.view_count === 'number' ? b.view_count : 0;
        if (av !== bv) return bv - av;
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd.getTime() - ad.getTime();
      });
    } else {
      // newest_first default
      results.sort((a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd.getTime() - ad.getTime();
      });
    }

    const mappedResults = results.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      url: post.url || '',
      published_at: post.published_at || '',
      category: post.category,
      category_label: this._getBlogCategoryLabel(post.category),
      tags: Array.isArray(post.tags) ? post.tags : [],
      excerpt: post.excerpt || '',
      read_time_minutes: post.read_time_minutes || null,
      is_featured: !!post.is_featured
    }));

    return {
      results: mappedResults,
      total_count: mappedResults.length,
      applied_filters: {
        category: categoryFilter,
        fromDate: fromDateStr,
        toDate: toDateStr,
        tags: tagsFilter,
        sortBy: sort
      }
    };
  }

  // getBlogPostDetail(blogPostId)
  getBlogPostDetail(blogPostId) {
    const posts = this._getFromStorage('blog_posts', []);
    const readingList = this._getOrCreateReadingListStore();

    const post = posts.find((p) => p.id === blogPostId) || null;
    let postObj = null;
    if (post) {
      postObj = {
        id: post.id,
        title: post.title,
        slug: post.slug,
        url: post.url || '',
        published_at: post.published_at || '',
        last_updated: post.last_updated || '',
        author_name: post.author_name || '',
        category: post.category,
        category_label: this._getBlogCategoryLabel(post.category),
        tags: Array.isArray(post.tags) ? post.tags : [],
        body: post.body || '',
        hero_image_url: post.hero_image_url || '',
        read_time_minutes: post.read_time_minutes || null
      };
    }

    let savedItem = null;
    if (post) {
      savedItem = readingList.find(
        (item) => item.saved_item_type === 'blog_post' && item.blog_post_id === post.id
      ) || null;
    }

    const reading_list_status = {
      saved: !!savedItem,
      reading_list_item_id: savedItem ? savedItem.id : '',
      reading_list_item: savedItem ? this._clone(savedItem) : null
    };

    const related_posts = post
      ? posts
          .filter((other) => {
            if (other.id === post.id) return false;
            if (other.status !== 'published') return false;
            const sameCategory = other.category && other.category === post.category;
            const samePrimaryIssue =
              other.primary_issue_id && post.primary_issue_id && other.primary_issue_id === post.primary_issue_id;
            return sameCategory || samePrimaryIssue;
          })
          .sort((a, b) => {
            const ad = this._parseDate(a.published_at) || new Date(0);
            const bd = this._parseDate(b.published_at) || new Date(0);
            return bd.getTime() - ad.getTime();
          })
          .slice(0, 5)
          .map((p) => ({
            post_id: p.id,
            title: p.title,
            url: p.url || '',
            published_at: p.published_at || '',
            category: p.category,
            category_label: this._getBlogCategoryLabel(p.category),
            excerpt: p.excerpt || ''
          }))
      : [];

    return {
      post: postObj,
      reading_list_status,
      related_posts
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const eventTypeMap = new Map();
    const monthSet = new Set();

    events.forEach((evt) => {
      if (evt.event_type && !eventTypeMap.has(evt.event_type)) {
        eventTypeMap.set(evt.event_type, this._getEventTypeLabel(evt.event_type));
      }
      const d = this._parseDate(evt.start_datetime);
      if (d) {
        const key = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1);
        monthSet.add(key);
      }
    });

    const event_types = Array.from(eventTypeMap.entries()).map(([value, label]) => ({ value, label }));

    const months_with_events = Array.from(monthSet.values()).map((key) => {
      const parts = key.split('-');
      return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
    });

    return { event_types, months_with_events };
  }

  // getEventsForMonth(year, month, eventType)
  getEventsForMonth(year, month, eventType) {
    const filteredEvents = this._filterEventsByMonthAndType(year, month, eventType);

    const events = filteredEvents.map((evt) => ({
      id: evt.id,
      title: evt.title,
      slug: evt.slug,
      url: evt.url || '',
      description: evt.description || '',
      event_type: evt.event_type,
      event_type_label: this._getEventTypeLabel(evt.event_type),
      start_datetime: evt.start_datetime || '',
      end_datetime: evt.end_datetime || '',
      timezone: evt.timezone || '',
      location_name: evt.location_name || '',
      city: evt.city || '',
      state: evt.state || '',
      postal_code: evt.postal_code || '',
      location_type: evt.location_type || '',
      registration_required: !!evt.registration_required,
      is_featured: !!evt.is_featured
    }));

    return { year, month, events };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const evt = events.find((e) => e.id === eventId) || null;

    let eventObj = null;
    if (evt) {
      eventObj = {
        id: evt.id,
        title: evt.title,
        slug: evt.slug,
        url: evt.url || '',
        description: evt.description || '',
        event_type: evt.event_type,
        event_type_label: this._getEventTypeLabel(evt.event_type),
        start_datetime: evt.start_datetime || '',
        end_datetime: evt.end_datetime || '',
        timezone: evt.timezone || '',
        location_name: evt.location_name || '',
        address_line1: evt.address_line1 || '',
        address_line2: evt.address_line2 || '',
        city: evt.city || '',
        state: evt.state || '',
        postal_code: evt.postal_code || '',
        location_type: evt.location_type || '',
        location_type_label: this._getLocationTypeLabel(evt.location_type),
        registration_required: !!evt.registration_required,
        max_attendees: typeof evt.max_attendees === 'number' ? evt.max_attendees : null,
        is_featured: !!evt.is_featured
      };
    }

    const attendance_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_event', label: 'Full event' },
      { value: 'virtual', label: 'Virtual' }
    ];

    const rsvp_config = {
      enabled: !!(evt && evt.registration_required),
      max_attendees: evt && typeof evt.max_attendees === 'number' ? evt.max_attendees : null,
      attendance_options,
      default_attendance_option: 'full_event'
    };

    const user_rsvp_status = {
      has_rsvped: false,
      status: '',
      guests_count: 0
    };

    return {
      event: eventObj,
      rsvp_config,
      user_rsvp_status
    };
  }

  // submitEventRSVP(eventId, name, email, guestsCount, attendanceOption, comments)
  submitEventRSVP(eventId, name, email, guestsCount, attendanceOption, comments) {
    const events = this._getFromStorage('events', []);
    const evt = events.find((e) => e.id === eventId);
    if (!evt) {
      return { success: false, message: 'Event not found', rsvp: null };
    }
    if (!name || !email) {
      return { success: false, message: 'Name and email are required', rsvp: null };
    }
    const guests = typeof guestsCount === 'number' && guestsCount > 0 ? guestsCount : 1;
    const now = new Date().toISOString();

    const rsvps = this._getFromStorage('event_rsvps', []);
    const rsvp = {
      id: this._generateId('rsvp'),
      event_id: eventId,
      name,
      email,
      guests_count: guests,
      attendance_option: attendanceOption || null,
      comments: comments || '',
      created_at: now,
      status: 'confirmed'
    };

    rsvps.push(rsvp);
    this._saveToStorage('event_rsvps', rsvps);

    return { success: true, message: 'RSVP submitted', rsvp: this._clone(rsvp) };
  }

  // getDonationPageConfig
  getDonationPageConfig() {
    const stored = this._getFromStorage('donation_page_config', null) || {};
    const currency = stored.currency || 'USD';
    const preset_amounts = Array.isArray(stored.preset_amounts)
      ? stored.preset_amounts
      : [10, 25, 50, 100];
    const min_amount = typeof stored.min_amount === 'number' ? stored.min_amount : 1;
    const max_amount = typeof stored.max_amount === 'number' ? stored.max_amount : 10000;

    const frequency_options = stored.frequency_options || [
      { value: 'one_time', label: 'One-time' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annually', label: 'Annually' }
    ];

    const default_frequency = stored.default_frequency || 'one_time';

    const payment_methods = stored.payment_methods || [
      { value: 'credit_debit_card', label: 'Credit/Debit Card' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'paypal', label: 'PayPal' },
      { value: 'apple_pay', label: 'Apple Pay' },
      { value: 'google_pay', label: 'Google Pay' },
      { value: 'other', label: 'Other' }
    ];

    const email_opt_in_default = typeof stored.email_opt_in_default === 'boolean'
      ? stored.email_opt_in_default
      : true;

    const legal_disclaimer_text = stored.legal_disclaimer_text || '';

    return {
      currency,
      preset_amounts,
      min_amount,
      max_amount,
      frequency_options,
      default_frequency,
      payment_methods,
      email_opt_in_default,
      legal_disclaimer_text
    };
  }

  // submitDonation(amount, frequency, donorName, email, addressLine1, addressLine2, city, state, postalCode, country, paymentMethod, paymentToken, emailOptIn, donationSource, notes)
  submitDonation(
    amount,
    frequency,
    donorName,
    email,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    paymentMethod,
    paymentToken,
    emailOptIn,
    donationSource,
    notes
  ) {
    const validation = this._validateDonationRequest(
      amount,
      frequency,
      donorName,
      email,
      addressLine1,
      city,
      postalCode,
      paymentMethod
    );
    if (!validation.valid) {
      return { success: false, message: validation.message, donation: null };
    }

    const config = this.getDonationPageConfig();
    const now = new Date().toISOString();

    const donations = this._getFromStorage('donations', []);
    const donation = {
      id: this._generateId('donation'),
      amount,
      currency: config.currency,
      frequency,
      is_recurring: frequency !== 'one_time',
      start_date: now,
      donation_source: donationSource || 'website',
      donor_name: donorName,
      email,
      address_line1: addressLine1,
      address_line2: addressLine2 || '',
      city,
      state: state || '',
      postal_code: postalCode,
      country: country || '',
      payment_method: paymentMethod,
      card_last4: null,
      card_brand: null,
      email_opt_in: !!emailOptIn,
      created_at: now,
      status: 'completed',
      notes: notes || ''
    };

    // paymentToken is intentionally not persisted to keep storage small and secure

    donations.push(donation);
    this._saveToStorage('donations', donations);

    return {
      success: true,
      message: 'Donation submitted',
      donation: this._clone(donation)
    };
  }

  // getVolunteerSignupConfig
  getVolunteerSignupConfig() {
    const areas_of_interest = [
      { code: 'door_knocking', label: 'Door Knocking' },
      { code: 'phone_banking', label: 'Phone Banking' },
      { code: 'text_banking', label: 'Text Banking' },
      { code: 'hosting_events', label: 'Hosting Events' },
      { code: 'data_entry', label: 'Data Entry' },
      { code: 'other', label: 'Other' }
    ];

    const availability_options = [
      { value: 'weekdays_only', label: 'Weekdays only' },
      { value: 'weekends_only', label: 'Weekends only' },
      { value: 'both', label: 'Weekdays and weekends' },
      { value: 'evenings_only', label: 'Evenings only' },
      { value: 'flexible', label: 'Flexible' }
    ];

    const preferred_contact_methods = [
      { value: 'email', label: 'Email' },
      { value: 'phone_call', label: 'Phone call' },
      { value: 'text_message', label: 'Text message' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'telegram', label: 'Telegram' },
      { value: 'none', label: 'No contact' }
    ];

    return { areas_of_interest, availability_options, preferred_contact_methods };
  }

  // submitVolunteerSignup(name, email, phone, postalCode, interests, availability, hoursPerWeek, preferredContactMethod, notes)
  submitVolunteerSignup(
    name,
    email,
    phone,
    postalCode,
    interests,
    availability,
    hoursPerWeek,
    preferredContactMethod,
    notes
  ) {
    if (!name || !postalCode || !availability || typeof hoursPerWeek !== 'number') {
      return { success: false, message: 'Missing required volunteer fields', volunteer_signup: null };
    }

    const now = new Date().toISOString();
    const signups = this._getFromStorage('volunteer_signups', []);

    const safeInterests = interests || {};

    const signup = {
      id: this._generateId('volunteer'),
      name,
      email: email || '',
      phone: phone || '',
      postal_code: postalCode,
      interested_door_knocking: !!safeInterests.door_knocking,
      interested_phone_banking: !!safeInterests.phone_banking,
      interested_text_banking: !!safeInterests.text_banking,
      interested_hosting_events: !!safeInterests.hosting_events,
      interested_data_entry: !!safeInterests.data_entry,
      interested_other: !!safeInterests.other,
      availability,
      hours_per_week: hoursPerWeek,
      preferred_contact_method: preferredContactMethod,
      created_at: now,
      notes: notes || ''
    };

    signups.push(signup);
    this._saveToStorage('volunteer_signups', signups);

    return {
      success: true,
      message: 'Volunteer signup submitted',
      volunteer_signup: { id: signup.id, created_at: signup.created_at }
    };
  }

  // getContactTopics
  getContactTopics() {
    const stored = this._getFromStorage('contact_topics', null) || {};
    let topics = stored.topics;
    if (!Array.isArray(topics)) {
      topics = [
        { value: 'policy_question', label: 'Policy Question', description: 'Ask about specific policies or plans.' },
        { value: 'volunteering', label: 'Volunteering', description: 'Get involved as a volunteer.' },
        { value: 'donation', label: 'Donation', description: 'Questions about donations.' },
        { value: 'events', label: 'Events', description: 'Ask about campaign events.' },
        { value: 'media_request', label: 'Media Request', description: 'Requests from journalists or media.' },
        { value: 'technical_issue', label: 'Technical Issue', description: 'Problems using the website.' },
        { value: 'press', label: 'Press', description: 'Press-related inquiries.' },
        { value: 'general_feedback', label: 'General Feedback', description: 'Share your thoughts or suggestions.' },
        { value: 'other', label: 'Other', description: 'Anything else.' }
      ];
    }

    const max_message_length = typeof stored.max_message_length === 'number'
      ? stored.max_message_length
      : 5000;

    return { topics, max_message_length };
  }

  // submitContactMessage(name, email, subject, messageBody, topic, referencedIssueId, referencedCandidateId)
  submitContactMessage(
    name,
    email,
    subject,
    messageBody,
    topic,
    referencedIssueId,
    referencedCandidateId
  ) {
    if (!name || !email || !subject || !messageBody || !topic) {
      return { success: false, message: 'Missing required contact fields', contact_message: null };
    }

    const allowedTopics = [
      'policy_question',
      'volunteering',
      'donation',
      'events',
      'media_request',
      'technical_issue',
      'press',
      'general_feedback',
      'other'
    ];
    if (!allowedTopics.includes(topic)) {
      return { success: false, message: 'Invalid topic', contact_message: null };
    }

    const now = new Date().toISOString();
    const messages = this._getFromStorage('contact_messages', []);

    const msg = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message_body: messageBody,
      topic,
      referenced_issue_id: referencedIssueId || null,
      referenced_candidate_id: referencedCandidateId || null,
      created_at: now,
      status: 'received'
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message sent',
      contact_message: { id: msg.id, status: msg.status, created_at: msg.created_at }
    };
  }

  // getVoterSurveyDefinition
  getVoterSurveyDefinition() {
    const stored = this._getFromStorage('voter_survey_definition', null) || {};

    let issue_options = stored.issue_options;
    if (!Array.isArray(issue_options)) {
      issue_options = [
        { code: 'climate', label: 'Climate' },
        { code: 'healthcare', label: 'Healthcare' },
        { code: 'education', label: 'Education' },
        { code: 'economy', label: 'Economy' },
        { code: 'security', label: 'Security' },
        { code: 'immigration', label: 'Immigration' },
        { code: 'jobs', label: 'Jobs' },
        { code: 'other', label: 'Other' }
      ];
    }

    let age_range_options = stored.age_range_options;
    if (!Array.isArray(age_range_options)) {
      age_range_options = [
        { value: 'age_18_24', label: '18–24' },
        { value: 'age_25_34', label: '25–34' },
        { value: 'age_35_44', label: '35–44' },
        { value: 'age_45_54', label: '45–54' },
        { value: 'age_55_64', label: '55–64' },
        { value: 'age_65_plus', label: '65+' },
        { value: 'prefer_not_to_say', label: 'Prefer not to say' }
      ];
    }

    let vote_likelihood_options = stored.vote_likelihood_options;
    if (!Array.isArray(vote_likelihood_options)) {
      vote_likelihood_options = [
        { value: 'very_likely', label: 'Very likely' },
        { value: 'somewhat_likely', label: 'Somewhat likely' },
        { value: 'not_sure', label: 'Not sure' },
        { value: 'somewhat_unlikely', label: 'Somewhat unlikely' },
        { value: 'very_unlikely', label: 'Very unlikely' },
        { value: 'not_eligible', label: 'Not eligible to vote' }
      ];
    }

    let party_affiliation_options = stored.party_affiliation_options;
    if (!Array.isArray(party_affiliation_options)) {
      party_affiliation_options = [
        { value: 'democrat', label: 'Democrat' },
        { value: 'republican', label: 'Republican' },
        { value: 'independent', label: 'Independent' },
        { value: 'green', label: 'Green' },
        { value: 'libertarian', label: 'Libertarian' },
        { value: 'other', label: 'Other' },
        { value: 'prefer_not_to_say', label: 'Prefer not to say' }
      ];
    }

    let communication_preference_options = stored.communication_preference_options;
    if (!Array.isArray(communication_preference_options)) {
      communication_preference_options = [
        { value: 'email_updates', label: 'Email updates' },
        { value: 'text_updates', label: 'Text updates' },
        { value: 'phone_calls', label: 'Phone calls' },
        { value: 'mail_updates', label: 'Mail updates' },
        { value: 'no_updates', label: 'No updates' }
      ];
    }

    return {
      issue_options,
      age_range_options,
      vote_likelihood_options,
      party_affiliation_options,
      communication_preference_options
    };
  }

  // submitVoterSurveyResponse(topIssues, ageRange, voteLikelihood, partyAffiliation, postalCode, communicationPreference, email, name)
  submitVoterSurveyResponse(
    topIssues,
    ageRange,
    voteLikelihood,
    partyAffiliation,
    postalCode,
    communicationPreference,
    email,
    name
  ) {
    if (!Array.isArray(topIssues) || !ageRange || !voteLikelihood || !partyAffiliation || !postalCode || !communicationPreference) {
      return { success: false, message: 'Missing required survey fields', response: null };
    }

    const normalized = topIssues.map((t) => String(t));
    const now = new Date().toISOString();

    const responses = this._getFromStorage('voter_survey_responses', []);

    const response = {
      id: this._generateId('survey'),
      created_at: now,
      top_issue_climate: normalized.includes('climate'),
      top_issue_healthcare: normalized.includes('healthcare'),
      top_issue_education: normalized.includes('education'),
      top_issue_economy: normalized.includes('economy'),
      top_issue_security: normalized.includes('security'),
      top_issue_immigration: normalized.includes('immigration'),
      top_issue_jobs: normalized.includes('jobs'),
      top_issue_other: normalized.includes('other'),
      age_range: ageRange,
      vote_likelihood: voteLikelihood,
      party_affiliation: partyAffiliation,
      postal_code: postalCode,
      communication_preference: communicationPreference,
      email: email || null,
      name: name || null
    };

    responses.push(response);
    this._saveToStorage('voter_survey_responses', responses);

    return {
      success: true,
      message: 'Survey response submitted',
      response: { id: response.id, created_at: response.created_at }
    };
  }

  // getEmailPreference(email)
  getEmailPreference(email) {
    if (!email) {
      return null;
    }
    const pref = this._getOrCreateEmailPreferenceRecord(email);
    return this._clone(pref);
  }

  // updateEmailPreference(email, category_environment, category_education, category_economy, category_security, category_healthcare, category_campaign, frequency, include_blog_posts, include_event_reminders, include_campaign_announcements, pause_all_emails)
  updateEmailPreference(
    email,
    category_environment,
    category_education,
    category_economy,
    category_security,
    category_healthcare,
    category_campaign,
    frequency,
    include_blog_posts,
    include_event_reminders,
    include_campaign_announcements,
    pause_all_emails
  ) {
    if (!email) {
      return { success: false, message: 'Email is required', preference: null };
    }

    const allowedFrequencies = ['immediate', 'daily_digest', 'weekly_digest', 'monthly_digest', 'off'];
    if (!allowedFrequencies.includes(frequency)) {
      return { success: false, message: 'Invalid frequency', preference: null };
    }

    const prefs = this._getFromStorage('email_preferences', []);
    let pref = prefs.find((p) => p.email === email);
    const now = new Date().toISOString();

    if (!pref) {
      pref = {
        id: this._generateId('emailpref'),
        email,
        category_environment: !!category_environment,
        category_education: !!category_education,
        category_economy: !!category_economy,
        category_security: !!category_security,
        category_healthcare: !!category_healthcare,
        category_campaign: !!category_campaign,
        frequency,
        include_blog_posts: !!include_blog_posts,
        include_event_reminders: !!include_event_reminders,
        include_campaign_announcements: !!include_campaign_announcements,
        pause_all_emails: !!pause_all_emails,
        created_at: now,
        updated_at: now
      };
      prefs.push(pref);
    } else {
      pref.category_environment = !!category_environment;
      pref.category_education = !!category_education;
      pref.category_economy = !!category_economy;
      pref.category_security = !!category_security;
      pref.category_healthcare = !!category_healthcare;
      pref.category_campaign = !!category_campaign;
      pref.frequency = frequency;
      pref.include_blog_posts = !!include_blog_posts;
      pref.include_event_reminders = !!include_event_reminders;
      pref.include_campaign_announcements = !!include_campaign_announcements;
      pref.pause_all_emails = !!pause_all_emails;
      pref.updated_at = now;
    }

    this._saveToStorage('email_preferences', prefs);

    return {
      success: true,
      message: 'Email preferences updated',
      preference: this._clone(pref)
    };
  }

  // getMediaFilterOptions
  getMediaFilterOptions() {
    const mediaItems = this._getFromStorage('media_items', []);

    const mediaTypeMap = new Map();
    const yearsSet = new Set();

    mediaItems.forEach((item) => {
      if (item.media_type && !mediaTypeMap.has(item.media_type)) {
        mediaTypeMap.set(item.media_type, this._getMediaTypeLabel(item.media_type));
      }
      if (typeof item.year === 'number') {
        yearsSet.add(item.year);
      }
    });

    const media_types = Array.from(mediaTypeMap.entries()).map(([value, label]) => ({ value, label }));
    const years = Array.from(yearsSet.values()).sort((a, b) => b - a);

    const sort_options = [
      { value: 'most_viewed', label: 'Most viewed' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' }
    ];

    return { media_types, years, sort_options };
  }

  // searchMediaItems(mediaType, year, sortBy)
  searchMediaItems(mediaType, year, sortBy) {
    const mediaItems = this._getFromStorage('media_items', []);

    let results = mediaItems.filter((item) => item.status === 'published');

    if (mediaType) {
      results = results.filter((item) => item.media_type === mediaType);
    }
    if (typeof year === 'number') {
      results = results.filter((item) => item.year === year);
    }

    const sort = sortBy || 'newest_first';
    if (sort === 'most_viewed') {
      results.sort((a, b) => {
        const av = typeof a.view_count === 'number' ? a.view_count : 0;
        const bv = typeof b.view_count === 'number' ? b.view_count : 0;
        if (av !== bv) return bv - av;
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd.getTime() - ad.getTime();
      });
    } else if (sort === 'oldest_first') {
      results.sort((a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return ad.getTime() - bd.getTime();
      });
    } else {
      // newest_first default
      results.sort((a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd.getTime() - ad.getTime();
      });
    }

    const mapped = results.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      url: item.url || '',
      description: item.description || '',
      media_type: item.media_type,
      published_at: item.published_at || '',
      year: item.year,
      duration_seconds: item.duration_seconds || null,
      view_count: item.view_count,
      thumbnail_url: item.thumbnail_url || '',
      is_featured: !!item.is_featured
    }));

    return {
      results: mapped,
      total_count: mapped.length
    };
  }

  // getMediaItemDetail(mediaItemId)
  getMediaItemDetail(mediaItemId) {
    const mediaItems = this._getFromStorage('media_items', []);
    const comments = this._getFromStorage('media_comments', []);

    const item = mediaItems.find((m) => m.id === mediaItemId) || null;

    let media_item = null;
    if (item) {
      media_item = {
        id: item.id,
        title: item.title,
        slug: item.slug,
        url: item.url || '',
        description: item.description || '',
        media_type: item.media_type,
        published_at: item.published_at || '',
        year: item.year,
        duration_seconds: item.duration_seconds || null,
        view_count: item.view_count,
        thumbnail_url: item.thumbnail_url || '',
        video_url: item.video_url || '',
        transcript: item.transcript || ''
      };
    }

    const visibleComments = comments
      .filter((c) => c.media_item_id === mediaItemId && c.status === 'visible')
      .sort((a, b) => {
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return bd.getTime() - ad.getTime();
      });

    const latest_comments = visibleComments.slice(0, 10).map((c) => ({
      comment_id: c.id,
      comment_text: c.comment_text,
      created_at: c.created_at,
      commenter_name: c.commenter_name || ''
    }));

    const comments_summary = {
      total_visible: visibleComments.length,
      latest_comments
    };

    return { media_item, comments_summary };
  }

  // submitMediaComment(mediaItemId, commentText, commenterName)
  submitMediaComment(mediaItemId, commentText, commenterName) {
    if (!mediaItemId || !commentText) {
      return { success: false, message: 'Media item and comment text are required', comment: null };
    }

    const mediaItems = this._getFromStorage('media_items', []);
    const item = mediaItems.find((m) => m.id === mediaItemId);
    if (!item) {
      return { success: false, message: 'Media item not found', comment: null };
    }

    const comments = this._getFromStorage('media_comments', []);
    const now = new Date().toISOString();

    const comment = {
      id: this._generateId('mediacomment'),
      media_item_id: mediaItemId,
      comment_text: commentText,
      created_at: now,
      commenter_name: commenterName || '',
      status: 'visible'
    };

    comments.push(comment);
    this._saveToStorage('media_comments', comments);

    return {
      success: true,
      message: 'Comment submitted',
      comment: this._clone(comment)
    };
  }

  // getShareInfoForContent(contentType, issueId, blogPostId, eventId, mediaItemId)
  getShareInfoForContent(contentType, issueId, blogPostId, eventId, mediaItemId) {
    const type = contentType;
    let page_url = '';
    let share_title = '';
    let share_description = '';

    if (type === 'issue') {
      const issues = this._getFromStorage('issues', []);
      const issue = issues.find((i) => i.id === issueId);
      if (issue) {
        page_url = issue.url || '';
        share_title = issue.title;
        share_description = issue.summary || '';

        // Instrumentation for task completion tracking (task_1)
        try {
          localStorage.setItem(
            'task1_issueShareUsed',
            JSON.stringify({ issueId: issueId, page_url: page_url })
          );
        } catch (e) {
          console.error('Instrumentation error:', e);
        }
      }
    } else if (type === 'blog_post') {
      const posts = this._getFromStorage('blog_posts', []);
      const post = posts.find((p) => p.id === blogPostId);
      if (post) {
        page_url = post.url || '';
        share_title = post.title;
        share_description = post.excerpt || '';
      }
    } else if (type === 'event') {
      const events = this._getFromStorage('events', []);
      const evt = events.find((e) => e.id === eventId);
      if (evt) {
        page_url = evt.url || '';
        share_title = evt.title;
        share_description = (evt.description || '').slice(0, 200);
      }
    } else if (type === 'media_item') {
      const mediaItems = this._getFromStorage('media_items', []);
      const item = mediaItems.find((m) => m.id === mediaItemId);
      if (item) {
        page_url = item.url || '';
        share_title = item.title;
        share_description = (item.description || '').slice(0, 200);
      }
    }

    return { page_url, share_title, share_description };
  }

  // getCampaignCandidateProfile
  getCampaignCandidateProfile() {
    const candidates = this._getFromStorage('candidates', []);
    const candidate = candidates.find((c) => c.role === 'campaign_candidate') || null;

    const extras = this._getFromStorage('campaign_candidate_profile', null) || {};

    const biography_sections = Array.isArray(extras.biography_sections)
      ? extras.biography_sections
      : [];
    const endorsements = Array.isArray(extras.endorsements) ? extras.endorsements : [];
    const achievements = Array.isArray(extras.achievements) ? extras.achievements : [];

    const candidateObj = candidate
      ? {
          id: candidate.id,
          name: candidate.name,
          slug: candidate.slug,
          role: candidate.role,
          party: candidate.party || '',
          short_bio: candidate.short_bio || '',
          photo_url: candidate.photo_url || '',
          website_url: candidate.website_url || '',
          is_incumbent: !!candidate.is_incumbent
        }
      : null;

    return {
      candidate: candidateObj,
      biography_sections,
      endorsements,
      achievements
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy', null) || {};
    const last_updated = stored.last_updated || '';
    const sections = Array.isArray(stored.sections) ? stored.sections : [];
    return { last_updated, sections };
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const stored = this._getFromStorage('terms_and_conditions', null) || {};
    const last_updated = stored.last_updated || '';
    const sections = Array.isArray(stored.sections) ? stored.sections : [];
    return { last_updated, sections };
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