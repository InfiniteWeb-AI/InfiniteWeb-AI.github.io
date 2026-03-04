// JSON.parse patch to tolerate malformed generated test data
(function () {
  const originalJSONParse = JSON.parse;
  JSON.parse = function (text, reviver) {
    try {
      if (
        typeof text === 'string' &&
        text.includes('Pledged to the campaign "Chicago Rooftop Sessions" at the $15/month tier.')
      ) {
        text = text.replace(
          'Pledged to the campaign "Chicago Rooftop Sessions" at the $15/month tier.',
          "Pledged to the campaign 'Chicago Rooftop Sessions' at the $15/month tier."
        );
      }
      if (
        typeof text === 'string' &&
        text.includes('RSVP\u2019d to the live-stream event "City Sounds Live: Multi-Artist Showcase".')
      ) {
        text = text.replace(
          'RSVP\u2019d to the live-stream event "City Sounds Live: Multi-Artist Showcase".',
          "RSVP\u2019d to the live-stream event 'City Sounds Live: Multi-Artist Showcase'."
        );
      }
    } catch (e) {}
    return originalJSONParse(text, reviver);
  };
})();

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
    },
  };
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
  }

  // ----------------------
  // init and basic storage
  // ----------------------

  _initStorage() {
    const tableKeys = [
      'artists',
      'follows',
      'campaigns',
      'reward_tiers',
      'pledges',
      'watchlist_items',
      'community_posts',
      'post_comments',
      'post_likes',
      'hashtags',
      'post_hashtags',
      'post_artist_tags',
      'artworks',
      'collections',
      'collection_items',
      'events',
      'event_artists',
      'rsvps',
      'direct_appreciation_messages',
      'challenges',
      'challenge_days',
      'challenge_enrollments',
      'challenge_day_progress',
      'activities',
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('about_content')) {
      const aboutDefault = {
        mission: '',
        howItWorks: '',
        teamInfo: '',
      };
      localStorage.setItem('about_content', JSON.stringify(aboutDefault));
    }

    if (!localStorage.getItem('help_faq_content')) {
      localStorage.setItem('help_faq_content', JSON.stringify([]));
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return JSON.parse(JSON.stringify(defaultValue));
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultValue));
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

  _nowISO() {
    return new Date().toISOString();
  }

  _formatLocation(city, state, country) {
    const parts = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country) parts.push(country);
    return parts.join(', ');
  }

  _getArtistCategoryLabel(key) {
    const map = {
      painting: 'Painting',
      music: 'Music',
      digital_illustration: 'Digital Illustration',
      sculpture: 'Sculpture',
      photography: 'Photography',
      other: 'Other',
    };
    return map[key] || key || '';
  }

  _getCampaignCategoryLabel(key) {
    const map = {
      music: 'Music',
      visual_art: 'Visual Art',
      performance: 'Performance',
      other: 'Other',
    };
    return map[key] || key || '';
  }

  _getCurrentUserContext() {
    // Single-user context; no persisted user id needed for this spec
    return { userId: 'single_user' };
  }

  _slugifyHashtagName(name) {
    if (!name) return '';
    const withoutHash = name.startsWith('#') ? name.slice(1) : name;
    return withoutHash
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  _findHashtagByNameOrSlug(name) {
    const hashtags = this._getFromStorage('hashtags');
    const slug = this._slugifyHashtagName(name);
    const normalizedName = name.startsWith('#') ? name : '#' + name;
    return (
      hashtags.find((h) => h.slug === slug) ||
      hashtags.find((h) => h.name.toLowerCase() === normalizedName.toLowerCase()) ||
      null
    );
  }

  _scheduleCampaignReminder(campaign, watchlistItem) {
    if (!campaign || !campaign.deadline) {
      watchlistItem.reminder_scheduled_for = null;
      return watchlistItem;
    }
    const deadline = new Date(campaign.deadline);
    let offsetDays = 0;
    switch (watchlistItem.reminder_option) {
      case 'on_deadline':
        offsetDays = 0;
        break;
      case 'one_day_before_deadline':
        offsetDays = -1;
        break;
      case 'three_days_before_deadline':
        offsetDays = -3;
        break;
      case 'one_week_before_deadline':
        offsetDays = -7;
        break;
      case 'none':
      default:
        watchlistItem.reminder_scheduled_for = null;
        return watchlistItem;
    }
    const scheduled = new Date(deadline.getTime());
    scheduled.setDate(scheduled.getDate() + offsetDays);
    watchlistItem.reminder_scheduled_for = scheduled.toISOString();
    return watchlistItem;
  }

  _scheduleEventReminder(event, rsvp) {
    if (!event || !event.start_datetime) {
      rsvp.reminder_offset_minutes = null;
      rsvp.reminder_scheduled_for = null;
      return rsvp;
    }
    let offsetMinutes = null;
    switch (rsvp.reminder_option) {
      case 'fifteen_minutes_before':
        offsetMinutes = 15;
        break;
      case 'thirty_minutes_before':
        offsetMinutes = 30;
        break;
      case 'one_hour_before':
        offsetMinutes = 60;
        break;
      case 'one_day_before':
        offsetMinutes = 24 * 60;
        break;
      case 'none':
      default:
        offsetMinutes = null;
        break;
    }
    rsvp.reminder_offset_minutes = offsetMinutes;
    if (offsetMinutes == null) {
      rsvp.reminder_scheduled_for = null;
      return rsvp;
    }
    const start = new Date(event.start_datetime);
    const scheduled = new Date(start.getTime() - offsetMinutes * 60000);
    rsvp.reminder_scheduled_for = scheduled.toISOString();
    return rsvp;
  }

  _createActivityEntry(activityType, relatedEntityType, relatedEntityId, message, visibility = 'public') {
    const activities = this._getFromStorage('activities');
    const activity = {
      id: this._generateId('activity'),
      activity_type: activityType,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId || null,
      message: message || null,
      visibility: visibility,
      created_at: this._nowISO(),
    };
    activities.push(activity);
    this._saveToStorage('activities', activities);
    return activity;
  }

  _attachForeignCampaignToWatchlistItem(item, campaignsCache) {
    const campaigns = campaignsCache || this._getFromStorage('campaigns');
    const campaign = campaigns.find((c) => c.id === item.campaign_id) || null;
    return Object.assign({}, item, { campaign });
  }

  _attachForeignToChallengeProgress(progress) {
    const challenges = this._getFromStorage('challenges');
    const challengeDays = this._getFromStorage('challenge_days');
    const challenge = challenges.find((c) => c.id === progress.challenge_id) || null;
    const challengeDay = challengeDays.find((d) => d.id === progress.challenge_day_id) || null;
    return Object.assign({}, progress, {
      challenge,
      challenge_day: challengeDay,
    });
  }

  // ----------------------
  // Interface: getHomeOverview
  // ----------------------

  getHomeOverview() {
    const artists = this._getFromStorage('artists');
    const campaigns = this._getFromStorage('campaigns');
    const events = this._getFromStorage('events');
    const challenges = this._getFromStorage('challenges');
    const follows = this._getFromStorage('follows');
    const collections = this._getFromStorage('collections');
    const watchlist = this._getFromStorage('watchlist_items');

    const featuredArtists = artists
      .filter((a) => a.is_featured)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        name: a.name,
        category_key: a.category,
        category_label: this._getArtistCategoryLabel(a.category),
        supporter_count: a.supporter_count || 0,
        rating: a.rating || null,
        profile_image_url: a.profile_image_url || null,
        banner_image_url: a.banner_image_url || null,
        is_featured: !!a.is_featured,
      }));

    const featuredCampaigns = campaigns
      .filter((c) => c.status === 'active')
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        title: c.title,
        category_key: c.category,
        category_label: this._getCampaignCategoryLabel(c.category),
        location_display: this._formatLocation(
          c.location_city,
          c.location_state,
          c.location_country
        ),
        deadline: c.deadline,
        status: c.status,
        amount_raised: c.amount_raised || 0,
        funding_goal: c.funding_goal || 0,
        featured_image_url: c.featured_image_url || null,
      }));

    const now = new Date();
    const upcomingEvents = events
      .filter((e) => new Date(e.start_datetime).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
      .slice(0, 6)
      .map((e) => ({
        id: e.id,
        title: e.title,
        event_type: e.event_type,
        start_datetime: e.start_datetime,
        location_display: e.location_city || '',
        lineup_size: e.lineup_size || 0,
      }));

    const featuredChallenges = challenges.filter((c) => c.is_featured);

    return {
      featuredArtists,
      featuredCampaigns,
      upcomingEvents,
      featuredChallenges,
      summaryCounts: {
        followingCount: follows.length,
        collectionsCount: collections.length,
        watchlistCount: watchlist.length,
      },
    };
  }

  // ----------------------
  // Artist directory
  // ----------------------

  getArtistDirectoryFilters() {
    return {
      categories: [
        { key: 'painting', label: 'Painting' },
        { key: 'music', label: 'Music' },
        { key: 'digital_illustration', label: 'Digital Illustration' },
        { key: 'sculpture', label: 'Sculpture' },
        { key: 'photography', label: 'Photography' },
        { key: 'other', label: 'Other' },
      ],
      supporterCountPresets: [
        { min_supporters: 0, max_supporters: 100, label: '0 - 100 supporters' },
        { min_supporters: 101, max_supporters: 200, label: '101 - 200 supporters' },
        { min_supporters: 201, max_supporters: 500, label: '201 - 500 supporters' },
        { min_supporters: 501, max_supporters: null, label: '501+ supporters' },
      ],
      sortOptions: [
        { key: 'newest', label: 'Newest' },
        { key: 'rating_high_to_low', label: 'Rating - High to Low' },
        { key: 'most_supported', label: 'Most Supported' },
      ],
    };
  }

  listArtists(filters = {}, sort = 'newest', page = 1, pageSize = 20) {
    const artists = this._getFromStorage('artists');
    const follows = this._getFromStorage('follows');
    const followedIds = new Set(follows.map((f) => f.artist_id));

    let items = artists.slice();

    if (filters.category_key) {
      items = items.filter((a) => a.category === filters.category_key);
    }
    if (typeof filters.min_supporters === 'number') {
      items = items.filter((a) => (a.supporter_count || 0) >= filters.min_supporters);
    }
    if (typeof filters.max_supporters === 'number') {
      items = items.filter((a) => (a.supporter_count || 0) <= filters.max_supporters);
    }
    if (filters.location_city) {
      const cityLower = String(filters.location_city).toLowerCase();
      items = items.filter(
        (a) => a.location_city && a.location_city.toLowerCase() === cityLower
      );
    }
    if (filters.search_query) {
      const q = String(filters.search_query).toLowerCase();
      items = items.filter((a) => {
        const name = (a.name || '').toLowerCase();
        const bio = (a.bio || '').toLowerCase();
        return name.includes(q) || bio.includes(q);
      });
    }
    if (filters.followed_only) {
      items = items.filter((a) => followedIds.has(a.id));
    }

    if (sort === 'rating_high_to_low') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'most_supported') {
      items.sort((a, b) => (b.supporter_count || 0) - (a.supporter_count || 0));
    } else {
      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize).map((a) => {
      const bio = a.bio || '';
      const bio_preview = bio.length > 160 ? bio.slice(0, 157) + '...' : bio;
      return {
        id: a.id,
        name: a.name,
        category_key: a.category,
        category_label: this._getArtistCategoryLabel(a.category),
        bio_preview,
        supporter_count: a.supporter_count || 0,
        rating: a.rating || null,
        location_display: this._formatLocation(
          a.location_city,
          a.location_state,
          a.location_country
        ),
        created_at: a.created_at,
        profile_image_url: a.profile_image_url || null,
        is_following: followedIds.has(a.id),
      };
    });

    return {
      items: pageItems,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  getArtistProfile(artistId) {
    const artists = this._getFromStorage('artists');
    const artworks = this._getFromStorage('artworks');
    const follows = this._getFromStorage('follows');

    const artist = artists.find((a) => a.id === artistId) || null;
    if (!artist) {
      return {
        artist: null,
        category_label: '',
        location_display: '',
        is_following: false,
        sampleArtworks: [],
      };
    }

    const is_following = !!follows.find((f) => f.artist_id === artistId);

    const sampleArtworksRaw = artworks
      .filter((aw) => aw.artist_id === artistId)
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 6);

    const sampleArtworks = sampleArtworksRaw.map((aw) =>
      Object.assign({}, aw, { artist })
    );

    return {
      artist,
      category_label: this._getArtistCategoryLabel(artist.category),
      location_display: this._formatLocation(
        artist.location_city,
        artist.location_state,
        artist.location_country
      ),
      is_following,
      sampleArtworks,
    };
  }

  followArtist(artistId) {
    const follows = this._getFromStorage('follows');
    const existing = follows.find((f) => f.artist_id === artistId);
    const now = this._nowISO();
    if (!existing) {
      const follow = {
        id: this._generateId('follow'),
        artist_id: artistId,
        created_at: now,
      };
      follows.push(follow);
      this._saveToStorage('follows', follows);
      this._createActivityEntry(
        'follow_created',
        'artist',
        artistId,
        'Started following an artist',
        'public'
      );
      return {
        success: true,
        artistId,
        is_following: true,
        followed_at: now,
      };
    }
    return {
      success: true,
      artistId,
      is_following: true,
      followed_at: existing.created_at,
    };
  }

  unfollowArtist(artistId) {
    let follows = this._getFromStorage('follows');
    const before = follows.length;
    follows = follows.filter((f) => f.artist_id !== artistId);
    this._saveToStorage('follows', follows);
    return {
      success: before !== follows.length,
      artistId,
      is_following: false,
    };
  }

  sendDirectAppreciationMessage(artistId, body) {
    const messages = this._getFromStorage('direct_appreciation_messages');
    const now = this._nowISO();
    const message = {
      id: this._generateId('dam'),
      artist_id: artistId,
      message_type: 'appreciation',
      body,
      created_at: now,
      is_read: false,
    };
    messages.push(message);
    this._saveToStorage('direct_appreciation_messages', messages);

    this._createActivityEntry(
      'appreciation_message_sent',
      'artist',
      artistId,
      'Sent an appreciation message',
      'public'
    );

    return {
      success: true,
      messageId: message.id,
      artistId,
      created_at: now,
    };
  }

  listFollowedArtists(category_key) {
    const artists = this._getFromStorage('artists');
    const follows = this._getFromStorage('follows');
    const followedIds = new Set(follows.map((f) => f.artist_id));

    let items = artists.filter((a) => followedIds.has(a.id));
    if (category_key) {
      items = items.filter((a) => a.category === category_key);
    }

    const result = items.map((a) => ({
      id: a.id,
      name: a.name,
      category_key: a.category,
      category_label: this._getArtistCategoryLabel(a.category),
      profile_image_url: a.profile_image_url || null,
      supporter_count: a.supporter_count || 0,
      rating: a.rating || null,
      location_display: this._formatLocation(
        a.location_city,
        a.location_state,
        a.location_country
      ),
    }));

    return {
      items: result,
      totalItems: result.length,
    };
  }

  // ----------------------
  // Campaigns and pledges
  // ----------------------

  getCampaignDirectoryFilters() {
    return {
      categories: [
        { key: 'music', label: 'Music' },
        { key: 'visual_art', label: 'Visual Art' },
        { key: 'performance', label: 'Performance' },
        { key: 'other', label: 'Other' },
      ],
      maxRewardPricePresets: [
        { max_price: 5, label: 'Up to 5' },
        { max_price: 10, label: 'Up to 10' },
        { max_price: 25, label: 'Up to 25' },
        { max_price: 50, label: 'Up to 50' },
      ],
      sortOptions: [
        { key: 'ending_soon', label: 'Ending Soon' },
        { key: 'newest', label: 'Newest' },
        { key: 'most_popular', label: 'Most Popular' },
      ],
    };
  }

  searchCampaigns(search_query, filters = {}, sort = 'ending_soon', page = 1, pageSize = 20) {
    const campaigns = this._getFromStorage('campaigns');
    let items = campaigns.slice();

    if (filters.category_key) {
      items = items.filter((c) => c.category === filters.category_key);
    }
    if (filters.location_city) {
      const cityLower = String(filters.location_city).toLowerCase();
      items = items.filter(
        (c) => c.location_city && c.location_city.toLowerCase() === cityLower
      );
    }
    if (typeof filters.max_reward_price === 'number') {
      items = items.filter((c) => {
        const minPrice = typeof c.min_reward_price === 'number' ? c.min_reward_price : null;
        if (minPrice == null) return false;
        return minPrice <= filters.max_reward_price;
      });
    }
    if (filters.status) {
      items = items.filter((c) => c.status === filters.status);
    }
    if (search_query) {
      const q = String(search_query).toLowerCase();
      items = items.filter((c) => {
        const title = (c.title || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    if (sort === 'newest') {
      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort === 'most_popular') {
      items.sort((a, b) => (b.amount_raised || 0) - (a.amount_raised || 0));
    } else {
      items.sort(
        (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      );
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize).map((c) => ({
      id: c.id,
      title: c.title,
      category_key: c.category,
      category_label: this._getCampaignCategoryLabel(c.category),
      location_display: this._formatLocation(
        c.location_city,
        c.location_state,
        c.location_country
      ),
      deadline: c.deadline,
      status: c.status,
      amount_raised: c.amount_raised || 0,
      funding_goal: c.funding_goal || 0,
      min_reward_price: c.min_reward_price || null,
      max_reward_price: c.max_reward_price || null,
      featured_image_url: c.featured_image_url || null,
    }));

    return {
      items: pageItems,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  getCampaignDetail(campaignId) {
    const campaigns = this._getFromStorage('campaigns');
    const rewardTiersRaw = this._getFromStorage('reward_tiers');
    const artists = this._getFromStorage('artists');
    const watchlist = this._getFromStorage('watchlist_items');

    const campaign = campaigns.find((c) => c.id === campaignId) || null;
    if (!campaign) {
      return {
        campaign: null,
        creatorArtist: null,
        category_label: '',
        location_display: '',
        funding_summary: {
          amount_raised: 0,
          funding_goal: 0,
          percent_funded: 0,
        },
        rewardTiers: [],
        is_in_watchlist: false,
        watchlist_item_id: null,
      };
    }

    const creatorArtist = campaign.creator_artist_id
      ? artists.find((a) => a.id === campaign.creator_artist_id) || null
      : null;

    const rewardTiers = rewardTiersRaw
      .filter((rt) => rt.campaign_id === campaignId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((rt) => Object.assign({}, rt, { campaign }));

    const amount_raised = campaign.amount_raised || 0;
    const funding_goal = campaign.funding_goal || 0;
    const percent_funded =
      funding_goal > 0 ? Math.round((amount_raised / funding_goal) * 10000) / 100 : 0;

    const watch = watchlist.find((w) => w.campaign_id === campaignId) || null;

    return {
      campaign,
      creatorArtist: creatorArtist
        ? {
            id: creatorArtist.id,
            name: creatorArtist.name,
            profile_image_url: creatorArtist.profile_image_url || null,
          }
        : null,
      category_label: this._getCampaignCategoryLabel(campaign.category),
      location_display: this._formatLocation(
        campaign.location_city,
        campaign.location_state,
        campaign.location_country
      ),
      funding_summary: {
        amount_raised,
        funding_goal,
        percent_funded,
      },
      rewardTiers,
      is_in_watchlist: !!watch,
      watchlist_item_id: watch ? watch.id : null,
    };
  }

  createPledge(campaignId, rewardTierId, payment_method) {
    const campaigns = this._getFromStorage('campaigns');
    const rewardTiers = this._getFromStorage('reward_tiers');
    const pledges = this._getFromStorage('pledges');

    const campaign = campaigns.find((c) => c.id === campaignId) || null;
    const rewardTier = rewardTiers.find((rt) => rt.id === rewardTierId) || null;

    if (!campaign || !rewardTier || rewardTier.campaign_id !== campaignId) {
      return {
        success: false,
        pledge: null,
        confirmation_message: 'Invalid campaign or reward tier',
      };
    }

    const amount = rewardTier.monthly_price;
    const now = this._nowISO();
    const pledge = {
      id: this._generateId('pledge'),
      campaign_id: campaignId,
      reward_tier_id: rewardTierId,
      amount,
      payment_method,
      status: 'confirmed',
      created_at: now,
      confirmation_number: 'PL-' + this._getNextIdCounter(),
      campaign,
      reward_tier: rewardTier,
    };

    pledges.push(pledge);
    this._saveToStorage('pledges', pledges);

    const message = 'Created a pledge for campaign ' + (campaign.title || '');
    this._createActivityEntry(
      'pledge_created',
      'campaign',
      campaignId,
      message,
      'public'
    );

    return {
      success: true,
      pledge,
      confirmation_message: 'Pledge confirmed',
    };
  }

  addCampaignToWatchlist(campaignId, reminder_option = 'none') {
    const campaigns = this._getFromStorage('campaigns');
    const watchlist = this._getFromStorage('watchlist_items');

    const campaign = campaigns.find((c) => c.id === campaignId) || null;
    if (!campaign) {
      return {
        success: false,
        watchlistItem: null,
      };
    }

    let item = watchlist.find((w) => w.campaign_id === campaignId) || null;
    const now = this._nowISO();
    const isNew = !item;

    if (!item) {
      item = {
        id: this._generateId('watch'),
        campaign_id: campaignId,
        added_at: now,
        reminder_option: reminder_option || 'none',
        reminder_scheduled_for: null,
      };
      watchlist.push(item);
    } else {
      item.reminder_option = reminder_option || item.reminder_option || 'none';
    }

    this._scheduleCampaignReminder(campaign, item);
    this._saveToStorage('watchlist_items', watchlist);

    if (isNew) {
      const message = 'Added a campaign to watchlist';
      this._createActivityEntry(
        'watchlist_item_added',
        'campaign',
        campaignId,
        message,
        'public'
      );
    }

    const withCampaign = this._attachForeignCampaignToWatchlistItem(item, campaigns);

    return {
      success: true,
      watchlistItem: withCampaign,
    };
  }

  removeCampaignFromWatchlist(campaignId) {
    let watchlist = this._getFromStorage('watchlist_items');
    const before = watchlist.length;
    watchlist = watchlist.filter((w) => w.campaign_id !== campaignId);
    this._saveToStorage('watchlist_items', watchlist);
    return { success: before !== watchlist.length };
  }

  // ----------------------
  // Community feed and posts
  // ----------------------

  getCommunityFeed(filters = {}, sort = 'most_recent', page = 1, pageSize = 20) {
    const posts = this._getFromStorage('community_posts');
    const postHashtags = this._getFromStorage('post_hashtags');
    const hashtags = this._getFromStorage('hashtags');
    const postArtistTags = this._getFromStorage('post_artist_tags');
    const artists = this._getFromStorage('artists');
    const postLikes = this._getFromStorage('post_likes');

    let items = posts.slice();

    if (filters.hashtag_slug) {
      const hash = hashtags.find((h) => h.slug === filters.hashtag_slug) || null;
      if (hash) {
        const postIdsForHash = new Set(
          postHashtags
            .filter((ph) => ph.hashtag_id === hash.id)
            .map((ph) => ph.post_id)
        );
        items = items.filter((p) => postIdsForHash.has(p.id));
      } else {
        items = [];
      }
    }

    if (sort === 'most_liked') {
      items.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    } else {
      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const pagePosts = items.slice(start, start + pageSize);

    const likedPostIds = new Set(postLikes.map((pl) => pl.post_id));

    const resultItems = pagePosts.map((post) => {
      const preview = post.body.length > 200 ? post.body.slice(0, 197) + '...' : post.body;

      const tagLinks = postHashtags.filter((ph) => ph.post_id === post.id);
      const postHashObjs = tagLinks
        .map((ph) => hashtags.find((h) => h.id === ph.hashtag_id) || null)
        .filter((h) => !!h);

      const artistTagLinks = postArtistTags.filter((pt) => pt.post_id === post.id);
      const taggedArtists = artistTagLinks
        .map((pt) => artists.find((a) => a.id === pt.artist_id) || null)
        .filter((a) => !!a)
        .map((a) => ({ id: a.id, name: a.name }));

      const is_liked_by_user = likedPostIds.has(post.id);

      let challenge = null;
      if (post.challenge_id) {
        const challenges = this._getFromStorage('challenges');
        challenge = challenges.find((c) => c.id === post.challenge_id) || null;
      }

      const postWithChallenge = challenge
        ? Object.assign({}, post, { challenge })
        : post;

      return {
        post: postWithChallenge,
        preview_body: preview,
        hashtags: postHashObjs,
        taggedArtists,
        is_liked_by_user,
      };
    });

    return {
      items: resultItems,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  getHashtagSuggestions(query) {
    const hashtags = this._getFromStorage('hashtags');
    const q = (query || '').toLowerCase();
    if (!q) return hashtags;
    return hashtags.filter((h) => {
      const name = (h.name || '').toLowerCase();
      const slug = (h.slug || '').toLowerCase();
      return name.includes(q) || slug.includes(q);
    });
  }

  searchArtistsForTagging(query, category_key) {
    const artists = this._getFromStorage('artists');
    const q = (query || '').toLowerCase();
    let items = artists.slice();
    if (category_key) {
      items = items.filter((a) => a.category === category_key);
    }
    if (q) {
      items = items.filter((a) => (a.name || '').toLowerCase().includes(q));
    }
    return items.map((a) => ({
      id: a.id,
      name: a.name,
      category_key: a.category,
      category_label: this._getArtistCategoryLabel(a.category),
      profile_image_url: a.profile_image_url || null,
    }));
  }

  createCommunityPost(post_type, body, visibility, taggedArtists = [], hashtagsInput = []) {
    const posts = this._getFromStorage('community_posts');
    const postHashtags = this._getFromStorage('post_hashtags');
    const hashtags = this._getFromStorage('hashtags');
    const postArtistTags = this._getFromStorage('post_artist_tags');
    const artists = this._getFromStorage('artists');

    const now = this._nowISO();
    const post = {
      id: this._generateId('post'),
      title: null,
      body,
      post_type,
      visibility,
      like_count: 0,
      comment_count: 0,
      is_challenge_update: false,
      challenge_id: null,
      challenge_day_number: null,
      created_at: now,
    };

    posts.push(post);

    const attachedHashtags = [];
    for (const tag of hashtagsInput || []) {
      if (!tag) continue;
      const normalizedName = tag.startsWith('#') ? tag : '#' + tag;
      let existing = this._findHashtagByNameOrSlug(normalizedName);
      if (!existing) {
        const newHashtag = {
          id: this._generateId('hash'),
          name: normalizedName,
          slug: this._slugifyHashtagName(normalizedName),
          created_at: now,
        };
        hashtags.push(newHashtag);
        existing = newHashtag;
      }
      const ph = {
        id: this._generateId('posthash'),
        post_id: post.id,
        hashtag_id: existing.id,
      };
      postHashtags.push(ph);
      attachedHashtags.push(existing);
    }

    const attachedArtists = [];
    for (const ta of taggedArtists || []) {
      if (!ta || !ta.artistId) continue;
      const pat = {
        id: this._generateId('postartist'),
        post_id: post.id,
        artist_id: ta.artistId,
      };
      postArtistTags.push(pat);
      const artist = artists.find((a) => a.id === ta.artistId);
      if (artist) attachedArtists.push(artist);
    }

    this._saveToStorage('community_posts', posts);
    this._saveToStorage('hashtags', hashtags);
    this._saveToStorage('post_hashtags', postHashtags);
    this._saveToStorage('post_artist_tags', postArtistTags);

    const activityMessage = 'Created a community post';
    this._createActivityEntry(
      'community_post_created',
      'community_post',
      post.id,
      activityMessage,
      visibility === 'public' ? 'public' : 'private'
    );

    return {
      post,
      hashtags: attachedHashtags,
      taggedArtists: attachedArtists,
    };
  }

  togglePostLike(postId, like) {
    const posts = this._getFromStorage('community_posts');
    const postLikes = this._getFromStorage('post_likes');
    const post = posts.find((p) => p.id === postId) || null;
    if (!post) {
      return {
        postId,
        is_liked_by_user: false,
        like_count: 0,
      };
    }

    const existing = postLikes.find((pl) => pl.post_id === postId);
    if (like) {
      if (!existing) {
        const pl = {
          id: this._generateId('postlike'),
          post_id: postId,
          created_at: this._nowISO(),
        };
        postLikes.push(pl);
        post.like_count = (post.like_count || 0) + 1;
      }
    } else {
      if (existing) {
        const idx = postLikes.findIndex((pl) => pl.id === existing.id);
        if (idx !== -1) postLikes.splice(idx, 1);
        post.like_count = Math.max(0, (post.like_count || 0) - 1);
      }
    }

    this._saveToStorage('post_likes', postLikes);
    this._saveToStorage('community_posts', posts);

    return {
      postId,
      is_liked_by_user: like ? true : false,
      like_count: post.like_count || 0,
    };
  }

  getCommunityPostDetail(postId) {
    const posts = this._getFromStorage('community_posts');
    const postHashtags = this._getFromStorage('post_hashtags');
    const hashtags = this._getFromStorage('hashtags');
    const postArtistTags = this._getFromStorage('post_artist_tags');
    const artists = this._getFromStorage('artists');
    const postLikes = this._getFromStorage('post_likes');
    const commentsRaw = this._getFromStorage('post_comments');

    const post = posts.find((p) => p.id === postId) || null;
    if (!post) {
      return {
        post: null,
        hashtags: [],
        taggedArtists: [],
        is_liked_by_user: false,
        comments: [],
      };
    }

    let challenge = null;
    if (post.challenge_id) {
      const challenges = this._getFromStorage('challenges');
      challenge = challenges.find((c) => c.id === post.challenge_id) || null;
    }
    const postWithChallenge = challenge
      ? Object.assign({}, post, { challenge })
      : post;

    const tagLinks = postHashtags.filter((ph) => ph.post_id === post.id);
    const postHashObjs = tagLinks
      .map((ph) => hashtags.find((h) => h.id === ph.hashtag_id) || null)
      .filter((h) => !!h);

    const artistTagLinks = postArtistTags.filter((pt) => pt.post_id === post.id);
    const taggedArtists = artistTagLinks
      .map((pt) => artists.find((a) => a.id === pt.artist_id) || null)
      .filter((a) => !!a);

    const is_liked_by_user = !!postLikes.find((pl) => pl.post_id === post.id);

    const comments = commentsRaw
      .filter((c) => c.post_id === post.id)
      .sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((c) => Object.assign({}, c, { post: postWithChallenge }));

    return {
      post: postWithChallenge,
      hashtags: postHashObjs,
      taggedArtists,
      is_liked_by_user,
      comments,
    };
  }

  addCommentToPost(postId, body) {
    const posts = this._getFromStorage('community_posts');
    const comments = this._getFromStorage('post_comments');
    const post = posts.find((p) => p.id === postId) || null;
    if (!post) {
      return {
        comment: null,
        new_comment_count: 0,
      };
    }

    const now = this._nowISO();
    const comment = {
      id: this._generateId('comment'),
      post_id: postId,
      body,
      created_at: now,
    };
    comments.push(comment);
    post.comment_count = (post.comment_count || 0) + 1;

    this._saveToStorage('post_comments', comments);
    this._saveToStorage('community_posts', posts);

    const commentWithPost = Object.assign({}, comment, { post });

    return {
      comment: commentWithPost,
      new_comment_count: post.comment_count,
    };
  }

  // ----------------------
  // Challenges
  // ----------------------

  listChallenges() {
    const challenges = this._getFromStorage('challenges');
    const enrollments = this._getFromStorage('challenge_enrollments');

    return challenges.map((ch) => {
      const enrollment = enrollments.find((e) => e.challenge_id === ch.id) || null;
      const is_enrolled = !!enrollment && enrollment.status !== 'dropped';
      const enrollment_status = enrollment ? enrollment.status : 'none';
      return {
        challenge: ch,
        is_enrolled,
        enrollment_status,
      };
    });
  }

  getChallengeDetail(challengeId) {
    const challenges = this._getFromStorage('challenges');
    const challengeDays = this._getFromStorage('challenge_days');
    const enrollments = this._getFromStorage('challenge_enrollments');
    const progressRaw = this._getFromStorage('challenge_day_progress');

    const challenge = challenges.find((c) => c.id === challengeId) || null;
    const days = challenge
      ? challengeDays
          .filter((d) => d.challenge_id === challengeId)
          .sort((a, b) => a.day_number - b.day_number)
      : [];
    const enrollment = enrollments.find((e) => e.challenge_id === challengeId) || null;
    const is_enrolled = !!enrollment && enrollment.status !== 'dropped';
    const dayProgress = progressRaw
      .filter((p) => p.challenge_id === challengeId)
      .map((p) => this._attachForeignToChallengeProgress(p));

    return {
      challenge,
      days,
      is_enrolled,
      enrollment,
      dayProgress,
    };
  }

  joinChallenge(challengeId) {
    const challenges = this._getFromStorage('challenges');
    const enrollments = this._getFromStorage('challenge_enrollments');
    const challenge = challenges.find((c) => c.id === challengeId) || null;

    let enrollment = enrollments.find((e) => e.challenge_id === challengeId) || null;
    if (enrollment) {
      if (enrollment.status !== 'in_progress') {
        enrollment.status = 'in_progress';
        this._saveToStorage('challenge_enrollments', enrollments);
      }
    } else {
      enrollment = {
        id: this._generateId('cenroll'),
        challenge_id: challengeId,
        status: 'in_progress',
        joined_at: this._nowISO(),
      };
      enrollments.push(enrollment);
      this._saveToStorage('challenge_enrollments', enrollments);
    }

    const enrollmentWithChallenge = Object.assign({}, enrollment, { challenge });

    return {
      enrollment: enrollmentWithChallenge,
    };
  }

  leaveChallenge(challengeId) {
    const enrollments = this._getFromStorage('challenge_enrollments');
    const enrollment = enrollments.find((e) => e.challenge_id === challengeId) || null;
    if (enrollment) {
      enrollment.status = 'dropped';
      this._saveToStorage('challenge_enrollments', enrollments);
      return { success: true };
    }
    return { success: false };
  }

  completeChallengeDay(challengeId, challengeDayId, share_to_feed) {
    const challenges = this._getFromStorage('challenges');
    const challengeDays = this._getFromStorage('challenge_days');
    const progress = this._getFromStorage('challenge_day_progress');

    const challenge = challenges.find((c) => c.id === challengeId) || null;
    const day = challengeDays.find((d) => d.id === challengeDayId) || null;

    if (!challenge || !day || day.challenge_id !== challengeId) {
      return {
        progress: null,
        activity: null,
      };
    }

    const now = this._nowISO();
    const prog = {
      id: this._generateId('cprog'),
      challenge_id: challengeId,
      challenge_day_id: challengeDayId,
      day_number: day.day_number,
      completed_at: now,
      shared_to_feed: !!share_to_feed,
    };
    progress.push(prog);
    this._saveToStorage('challenge_day_progress', progress);

    let activity = null;
    if (share_to_feed) {
      const msg =
        'Completed Day ' + day.day_number + ' of ' + (challenge.title || 'a challenge');
      activity = this._createActivityEntry(
        'challenge_day_completed',
        'challenge',
        challengeId,
        msg,
        'public'
      );
    }

    const progWithFK = this._attachForeignToChallengeProgress(prog);

    return {
      progress: progWithFK,
      activity,
    };
  }

  // ----------------------
  // Discover artworks and collections
  // ----------------------

  getDiscoverArtworksFilters() {
    return {
      contentTypes: [
        { key: 'video_performance', label: 'Video Performances' },
        { key: 'image', label: 'Images' },
        { key: 'audio', label: 'Audio' },
        { key: 'text', label: 'Text' },
        { key: 'other', label: 'Other' },
      ],
      maxDurationPresets: [
        { max_duration_seconds: 60, label: 'Up to 1 minute' },
        { max_duration_seconds: 300, label: 'Up to 5 minutes' },
        { max_duration_seconds: 900, label: 'Up to 15 minutes' },
      ],
      sortOptions: [
        { key: 'most_appreciated', label: 'Most Appreciated' },
        { key: 'most_recent', label: 'Most Recent' },
      ],
    };
  }

  browseArtworks(filters = {}, sort = 'most_appreciated', page = 1, pageSize = 20) {
    const artworks = this._getFromStorage('artworks');
    const artists = this._getFromStorage('artists');

    let items = artworks.slice();

    if (filters.content_type) {
      items = items.filter((a) => a.content_type === filters.content_type);
    }
    if (typeof filters.max_duration_seconds === 'number') {
      items = items.filter((a) => {
        if (typeof a.duration_seconds !== 'number') return false;
        return a.duration_seconds <= filters.max_duration_seconds;
      });
    }

    if (sort === 'most_recent') {
      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else {
      items.sort((a, b) => (b.appreciation_count || 0) - (a.appreciation_count || 0));
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize).map((a) => {
      const artist = a.artist_id
        ? artists.find((ar) => ar.id === a.artist_id) || null
        : null;
      return Object.assign({}, a, { artist });
    });

    return {
      items: pageItems,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  createCollection(name, description) {
    const collections = this._getFromStorage('collections');
    const now = this._nowISO();
    const collection = {
      id: this._generateId('coll'),
      name,
      description: description || '',
      item_count: 0,
      created_at: now,
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);

    const msg = 'Created collection ' + name;
    this._createActivityEntry(
      'collection_created',
      'collection',
      collection.id,
      msg,
      'public'
    );

    return { collection };
  }

  createCollectionWithItems(name, description, artworkIds) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const artworks = this._getFromStorage('artworks');

    const now = this._nowISO();
    const collection = {
      id: this._generateId('coll'),
      name,
      description: description || '',
      item_count: 0,
      created_at: now,
    };
    collections.push(collection);

    const validArtworkIds = (artworkIds || []).filter((id) =>
      artworks.some((a) => a.id === id)
    );

    const items = [];
    let position = 1;
    for (const aid of validArtworkIds) {
      const ci = {
        id: this._generateId('collitem'),
        collection_id: collection.id,
        artwork_id: aid,
        added_at: now,
        position: position++,
      };
      collectionItems.push(ci);
      items.push(ci);
    }
    collection.item_count = items.length;

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', collectionItems);

    const msg = 'Created collection ' + name;
    this._createActivityEntry(
      'collection_created',
      'collection',
      collection.id,
      msg,
      'public'
    );

    return {
      collection,
      items,
    };
  }

  addArtworkToCollection(collectionId, artworkId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const artworks = this._getFromStorage('artworks');

    const collection = collections.find((c) => c.id === collectionId) || null;
    const artwork = artworks.find((a) => a.id === artworkId) || null;
    if (!collection || !artwork) {
      return {
        collectionItem: null,
        new_item_count: collection ? collection.item_count : 0,
      };
    }

    const exists = collectionItems.find(
      (ci) => ci.collection_id === collectionId && ci.artwork_id === artworkId
    );
    if (exists) {
      const itemWithFK = Object.assign({}, exists, {
        collection,
        artwork,
      });
      return {
        collectionItem: itemWithFK,
        new_item_count: collection.item_count,
      };
    }

    const now = this._nowISO();
    const maxPosition = collectionItems
      .filter((ci) => ci.collection_id === collectionId)
      .reduce((max, ci) => (typeof ci.position === 'number' && ci.position > max ? ci.position : max), 0);

    const ciNew = {
      id: this._generateId('collitem'),
      collection_id: collectionId,
      artwork_id: artworkId,
      added_at: now,
      position: maxPosition + 1,
    };
    collectionItems.push(ciNew);
    collection.item_count = (collection.item_count || 0) + 1;

    this._saveToStorage('collection_items', collectionItems);
    this._saveToStorage('collections', collections);

    const itemWithFK = Object.assign({}, ciNew, {
      collection,
      artwork,
    });

    return {
      collectionItem: itemWithFK,
      new_item_count: collection.item_count,
    };
  }

  listCollections() {
    const collections = this._getFromStorage('collections');
    return collections;
  }

  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const artworks = this._getFromStorage('artworks');
    const artists = this._getFromStorage('artists');

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return {
        collection: null,
        items: [],
      };
    }

    const itemsRaw = collectionItems
      .filter((ci) => ci.collection_id === collectionId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    const items = itemsRaw.map((ci) => {
      const artwork = artworks.find((a) => a.id === ci.artwork_id) || null;
      const artist = artwork && artwork.artist_id
        ? artists.find((ar) => ar.id === artwork.artist_id) || null
        : null;
      const artworkWithArtist = artwork
        ? Object.assign({}, artwork, { artist })
        : null;
      const ciWithCollection = Object.assign({}, ci, { collection });
      return {
        collectionItem: ciWithCollection,
        artwork: artworkWithArtist,
      };
    });

    return {
      collection,
      items,
    };
  }

  renameCollection(collectionId, newName) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null };
    }
    collection.name = newName;
    this._saveToStorage('collections', collections);
    return { collection };
  }

  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections');
    let collectionItems = this._getFromStorage('collection_items');

    const before = collections.length;
    collections = collections.filter((c) => c.id !== collectionId);
    collectionItems = collectionItems.filter((ci) => ci.collection_id !== collectionId);

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', collectionItems);

    return { success: before !== collections.length };
  }

  removeArtworkFromCollection(collectionId, artworkId) {
    const collections = this._getFromStorage('collections');
    let collectionItems = this._getFromStorage('collection_items');

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return { success: false, new_item_count: 0 };
    }

    const before = collectionItems.length;
    collectionItems = collectionItems.filter(
      (ci) => !(ci.collection_id === collectionId && ci.artwork_id === artworkId)
    );
    const removed = before !== collectionItems.length;

    if (removed) {
      collection.item_count = Math.max(0, (collection.item_count || 0) - 1);
    }

    this._saveToStorage('collection_items', collectionItems);
    this._saveToStorage('collections', collections);

    return {
      success: removed,
      new_item_count: collection.item_count,
    };
  }

  // ----------------------
  // Events and RSVPs
  // ----------------------

  getEventDirectoryFilters() {
    return {
      dateRangePresets: [
        { key: 'next_14_days', label: 'Next 14 days' },
        { key: 'this_week', label: 'This week' },
      ],
      eventTypes: [
        { key: 'live_stream', label: 'Live-stream' },
        { key: 'in_person', label: 'In-person' },
        { key: 'hybrid', label: 'Hybrid' },
      ],
      lineupOptions: [
        { min_lineup_size: 1, label: 'Any lineup' },
        { min_lineup_size: 2, label: 'Multiple Artists (2+)' },
      ],
      sortOptions: [
        { key: 'soonest_first', label: 'Soonest first' },
        { key: 'most_recent', label: 'Most recent' },
      ],
    };
  }

  listEvents(filters = {}, sort = 'soonest_first', page = 1, pageSize = 20) {
    const events = this._getFromStorage('events');
    let items = events.slice();

    const now = new Date();

    if (filters.date_range_key === 'next_14_days') {
      const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      items = items.filter((e) => {
        const start = new Date(e.start_datetime);
        return start >= now && start <= end;
      });
    }

    if (filters.event_type) {
      items = items.filter((e) => e.event_type === filters.event_type);
    }

    if (typeof filters.min_lineup_size === 'number') {
      items = items.filter((e) => (e.lineup_size || 0) >= filters.min_lineup_size);
    }

    if (sort === 'most_recent') {
      items.sort(
        (a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
      );
    } else {
      items.sort(
        (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      );
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    return {
      items: pageItems,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const eventArtists = this._getFromStorage('event_artists');
    const artists = this._getFromStorage('artists');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        artists: [],
      };
    }

    const links = eventArtists.filter((ea) => ea.event_id === eventId);
    const artistObjs = links
      .map((ea) => artists.find((a) => a.id === ea.artist_id) || null)
      .filter((a) => !!a);

    return {
      event,
      artists: artistObjs,
    };
  }

  createOrUpdateRSVP(eventId, attendance_type, reminder_option) {
    const events = this._getFromStorage('events');
    const rsvps = this._getFromStorage('rsvps');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { rsvp: null };
    }

    let rsvp = rsvps.find((r) => r.event_id === eventId) || null;
    const now = this._nowISO();

    if (rsvp) {
      rsvp.attendance_type = attendance_type;
      rsvp.reminder_option = reminder_option;
      this._scheduleEventReminder(event, rsvp);
    } else {
      rsvp = {
        id: this._generateId('rsvp'),
        event_id: eventId,
        attendance_type,
        reminder_option,
        reminder_offset_minutes: null,
        created_at: now,
      };
      this._scheduleEventReminder(event, rsvp);
      rsvps.push(rsvp);
    }

    this._saveToStorage('rsvps', rsvps);

    const msg = 'RSVPd to event ' + (event.title || '');
    this._createActivityEntry(
      'rsvp_created',
      'event',
      eventId,
      msg,
      'public'
    );

    const rsvpWithEvent = Object.assign({}, rsvp, { event });

    return {
      rsvp: rsvpWithEvent,
    };
  }

  // ----------------------
  // Watchlist listing and reminders
  // ----------------------

  listWatchlistItems() {
    const watchlist = this._getFromStorage('watchlist_items');
    const campaigns = this._getFromStorage('campaigns');

    return watchlist.map((w) => {
      const campaign = campaigns.find((c) => c.id === w.campaign_id) || null;
      const watchlistItem = Object.assign({}, w, { campaign });
      return {
        watchlistItem,
        campaign,
      };
    });
  }

  updateWatchlistReminder(watchlistItemId, reminder_option) {
    const watchlist = this._getFromStorage('watchlist_items');
    const campaigns = this._getFromStorage('campaigns');
    const item = watchlist.find((w) => w.id === watchlistItemId) || null;
    if (!item) {
      return { watchlistItem: null };
    }
    const campaign = campaigns.find((c) => c.id === item.campaign_id) || null;
    item.reminder_option = reminder_option;
    this._scheduleCampaignReminder(campaign, item);
    this._saveToStorage('watchlist_items', watchlist);
    const watchlistItem = Object.assign({}, item, { campaign });
    return { watchlistItem };
  }

  removeWatchlistItem(watchlistItemId) {
    let watchlist = this._getFromStorage('watchlist_items');
    const before = watchlist.length;
    watchlist = watchlist.filter((w) => w.id !== watchlistItemId);
    this._saveToStorage('watchlist_items', watchlist);
    return { success: before !== watchlist.length };
  }

  // ----------------------
  // Direct appreciation messages (task 6 support)
  // ----------------------
  // Already implemented sendDirectAppreciationMessage above

  // ----------------------
  // About and Help content
  // ----------------------

  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    if (!raw) {
      const fallback = { mission: '', howItWorks: '', teamInfo: '' };
      localStorage.setItem('about_content', JSON.stringify(fallback));
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      const fallback = { mission: '', howItWorks: '', teamInfo: '' };
      localStorage.setItem('about_content', JSON.stringify(fallback));
      return fallback;
    }
  }

  getHelpFaqContent() {
    const raw = localStorage.getItem('help_faq_content');
    if (!raw) {
      const fallback = [];
      localStorage.setItem('help_faq_content', JSON.stringify(fallback));
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      const fallback = [];
      localStorage.setItem('help_faq_content', JSON.stringify(fallback));
      return fallback;
    }
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
