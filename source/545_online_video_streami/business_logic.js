// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

    // rating order for parental controls
    this._ratingOrder = {
      g: 1,
      pg: 2,
      pg_13: 3,
      r: 4,
      nc_17: 5,
      tv_y: 1,
      tv_y7: 2,
      tv_g: 3,
      tv_pg: 4,
      tv_14: 5,
      tv_ma: 6,
      unrated: 999
    };

    this._qualityOrder = ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'];
  }

  _initStorage() {
    const keys = [
      'videos',
      'channels',
      'playlists',
      'playlist_items',
      'watchlists',
      'watchlist_items',
      'watch_later_lists',
      'watch_later_items',
      'history_entries',
      'playback_settings',
      'parental_controls_settings',
      'profiles',
      'subscription_plans',
      'subscriptions',
      'checkout_sessions',
      'payment_details',
      'payment_transactions',
      'playback_sessions',
      'recommendation_feedback',
      'browse_preferences',
      'support_tickets' // for contact form
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

  _now() {
    return new Date().toISOString();
  }

  _findVideoById(videoId) {
    const videos = this._getFromStorage('videos');
    return videos.find((v) => v.id === videoId) || null;
  }

  _findChannelById(channelId) {
    const channels = this._getFromStorage('channels');
    return channels.find((c) => c.id === channelId) || null;
  }

  _ensureWatchLaterList() {
    const lists = this._getFromStorage('watch_later_lists');
    if (lists.length > 0) {
      return lists[0];
    }
    const now = this._now();
    const list = {
      id: this._generateId('watch_later_list'),
      name: 'Watch Later',
      createdAt: now
    };
    const updated = [list];
    this._saveToStorage('watch_later_lists', updated);
    return list;
  }

  _createOrGetPlaylistByName(name, description, visibility) {
    const playlists = this._getFromStorage('playlists');
    let playlist = playlists.find((p) => p.name === name);
    if (playlist) return playlist;
    const now = this._now();
    playlist = {
      id: this._generateId('playlist'),
      name,
      description: description || '',
      visibility: visibility || 'private',
      createdAt: now,
      updatedAt: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);
    return playlist;
  }

  _createOrGetWatchlistByName(name, description) {
    const watchlists = this._getFromStorage('watchlists');
    let watchlist = watchlists.find((w) => w.name === name);
    if (watchlist) return watchlist;
    const now = this._now();
    watchlist = {
      id: this._generateId('watchlist'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    watchlists.push(watchlist);
    this._saveToStorage('watchlists', watchlists);
    return watchlist;
  }

  _ensurePlaybackSettingsRecord() {
    const list = this._getFromStorage('playback_settings');
    if (list.length > 0) return list[0];
    const now = this._now();
    const record = {
      id: this._generateId('playback_settings'),
      defaultVideoQuality: '720p',
      subtitleBehavior: 'auto',
      subtitleLanguage: 'English',
      autoplayNextVideo: true,
      updatedAt: now
    };
    const updated = [record];
    this._saveToStorage('playback_settings', updated);
    return record;
  }

  _createPlaybackSessionFromSettings(videoId) {
    const videos = this._getFromStorage('videos');
    const video = videos.find((v) => v.id === videoId);
    const settings = this._ensurePlaybackSettingsRecord();

    let effectiveQuality = settings.defaultVideoQuality;
    if (video && Array.isArray(video.availableQualities) && video.availableQualities.length > 0) {
      if (!video.availableQualities.includes(effectiveQuality)) {
        // choose highest available quality
        const available = video.availableQualities.slice();
        available.sort((a, b) => this._qualityOrder.indexOf(a) - this._qualityOrder.indexOf(b));
        effectiveQuality = available[available.length - 1];
      }
    }

    const subtitlesEnabled = settings.subtitleBehavior === 'always_on';
    const subtitleLanguage = settings.subtitleLanguage || 'English';

    const playbackSessions = this._getFromStorage('playback_sessions');
    const now = this._now();
    const session = {
      id: this._generateId('playback_session'),
      videoId,
      startedAt: now,
      lastPositionSeconds: 0,
      isCompleted: false,
      quality: effectiveQuality,
      subtitlesEnabled,
      subtitleLanguage
    };
    playbackSessions.push(session);
    this._saveToStorage('playback_sessions', playbackSessions);

    // also create a history entry
    if (video) {
      const historyEntries = this._getFromStorage('history_entries');
      const historyEntry = {
        id: this._generateId('history_entry'),
        videoId: video.id,
        watchedAt: now,
        contentCategory: video.contentCategory || 'other',
        isRemoved: false
      };
      historyEntries.push(historyEntry);
      this._saveToStorage('history_entries', historyEntries);
    }

    return {
      playbackSessionId: session.id,
      videoId: session.videoId,
      startedAt: session.startedAt,
      effectiveQuality,
      subtitlesEnabled,
      subtitleLanguage,
      autoplayNextVideo: !!settings.autoplayNextVideo
    };
  }

  _applyVideoFiltersAndSorting(videos, filters, sortOption, viewMode) {
    let result = Array.isArray(videos) ? videos.slice() : [];
    const f = filters || {};

    if (viewMode === 'live' || f.isLiveOnly) {
      result = result.filter((v) => v.isLive === true || v.contentType === 'live_stream');
    }

    if (f.genre) {
      result = result.filter((v) => v.genre === f.genre);
    }
    if (f.contentType) {
      result = result.filter((v) => v.contentType === f.contentType);
    }
    if (typeof f.releaseYearMin === 'number') {
      result = result.filter((v) => typeof v.releaseYear === 'number' && v.releaseYear >= f.releaseYearMin);
    }
    if (typeof f.releaseYearMax === 'number') {
      result = result.filter((v) => typeof v.releaseYear === 'number' && v.releaseYear <= f.releaseYearMax);
    }
    if (typeof f.durationMinMinutes === 'number') {
      result = result.filter((v) => typeof v.durationMinutes === 'number' && v.durationMinutes >= f.durationMinMinutes);
    }
    if (typeof f.durationMaxMinutes === 'number') {
      result = result.filter((v) => typeof v.durationMinutes === 'number' && v.durationMinutes <= f.durationMaxMinutes);
    }
    if (typeof f.ratingMin === 'number') {
      result = result.filter((v) => typeof v.ratingAverage === 'number' && v.ratingAverage >= f.ratingMin);
    }
    if (typeof f.viewCountMin === 'number') {
      result = result.filter((v) => typeof v.viewCount === 'number' && v.viewCount >= f.viewCountMin);
    }
    if (typeof f.liveViewerCountMin === 'number') {
      result = result.filter((v) => typeof v.liveViewerCount === 'number' && v.liveViewerCount >= f.liveViewerCountMin);
    }

    const s = sortOption || (viewMode === 'live' ? 'viewer_count_high_to_low' : 'upload_date_newest');
    result.sort((a, b) => {
      switch (s) {
        case 'rating_high_to_low':
          return (b.ratingAverage || 0) - (a.ratingAverage || 0);
        case 'rating_low_to_high':
          return (a.ratingAverage || 0) - (b.ratingAverage || 0);
        case 'views_high_to_low':
          return (b.viewCount || 0) - (a.viewCount || 0);
        case 'views_low_to_high':
          return (a.viewCount || 0) - (b.viewCount || 0);
        case 'upload_date_newest': {
          const bd = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
          const ad = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
          return bd - ad;
        }
        case 'upload_date_oldest': {
          const bd2 = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
          const ad2 = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
          return ad2 - bd2;
        }
        case 'viewer_count_high_to_low':
          return (b.liveViewerCount || 0) - (a.liveViewerCount || 0);
        case 'viewer_count_low_to_high':
          return (a.liveViewerCount || 0) - (b.liveViewerCount || 0);
        default:
          return 0;
      }
    });

    return result;
  }

  _mapVideoToCardSummary(video, channel) {
    if (!video) return null;
    const ch = channel || null;
    return {
      videoId: video.id,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl || '',
      durationMinutes: video.durationMinutes || 0,
      releaseYear: video.releaseYear || null,
      ratingAverage: video.ratingAverage || 0,
      ratingCount: video.ratingCount || 0,
      viewCount: video.viewCount || 0,
      uploadDate: video.uploadDate || null,
      contentCategory: video.contentCategory || 'other',
      contentType: video.contentType || 'other',
      genre: video.genre || 'other',
      isLive: !!video.isLive,
      liveViewerCount: video.liveViewerCount || 0,
      channelId: ch ? ch.id : video.channelId || null,
      channelName: ch ? ch.name : null,
      channelAvatarUrl: ch ? ch.avatarUrl : null,
      video,
      channel: ch
    };
  }

  _processSubscriptionPayment(planId, cardHolderName, cardNumber, cardExpiryMonth, cardExpiryYear, cardSecurityCode) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === planId && p.isActive !== false);
    if (!plan) {
      return {
        success: false,
        subscription: null,
        paymentTransaction: null,
        message: 'Subscription plan not found or inactive.'
      };
    }

    const paymentDetailsList = this._getFromStorage('payment_details');
    const checkoutSessions = this._getFromStorage('checkout_sessions');
    const paymentTransactions = this._getFromStorage('payment_transactions');
    const subscriptions = this._getFromStorage('subscriptions');

    const now = this._now();

    const paymentDetails = {
      id: this._generateId('payment_details'),
      paymentMethodType: 'card',
      cardHolderName,
      cardNumber,
      cardExpiryMonth,
      cardExpiryYear,
      cardSecurityCode,
      createdAt: now
    };
    paymentDetailsList.push(paymentDetails);

    const checkoutSession = {
      id: this._generateId('checkout_session'),
      planId: plan.id,
      totalAmount: plan.pricePerMonth,
      currency: 'USD',
      paymentMethodType: 'card',
      paymentDetailsId: paymentDetails.id,
      status: 'pending',
      createdAt: now,
      completedAt: null
    };
    checkoutSessions.push(checkoutSession);

    // simple simulated payment rule
    const isTestCard = cardNumber === '4111111111111111';
    const paymentStatus = isTestCard ? 'succeeded' : 'failed';

    const paymentTransaction = {
      id: this._generateId('payment_transaction'),
      checkoutSessionId: checkoutSession.id,
      amount: plan.pricePerMonth,
      currency: 'USD',
      status: paymentStatus,
      processedAt: now,
      failureReason: isTestCard ? null : 'Card declined in test environment.'
    };
    paymentTransactions.push(paymentTransaction);

    let subscriptionRecord = null;
    if (paymentStatus === 'succeeded') {
      checkoutSession.status = 'completed';
      checkoutSession.completedAt = now;

      // cancel previous active subscriptions
      subscriptions.forEach((s) => {
        if (s.status === 'active' || s.status === 'trial') {
          s.status = 'canceled';
          s.updatedAt = now;
        }
      });

      const startDate = now;
      const nextBillingDate = new Date(now);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      subscriptionRecord = {
        id: this._generateId('subscription'),
        planId: plan.id,
        status: 'active',
        startDate,
        endDate: null,
        nextBillingDate: nextBillingDate.toISOString(),
        createdAt: now,
        updatedAt: now
      };
      subscriptions.push(subscriptionRecord);
    } else {
      checkoutSession.status = 'failed';
      checkoutSession.completedAt = now;
    }

    this._saveToStorage('payment_details', paymentDetailsList);
    this._saveToStorage('checkout_sessions', checkoutSessions);
    this._saveToStorage('payment_transactions', paymentTransactions);
    this._saveToStorage('subscriptions', subscriptions);

    return {
      success: paymentStatus === 'succeeded',
      subscription: subscriptionRecord,
      paymentTransaction,
      message: paymentStatus === 'succeeded' ? 'Subscription activated.' : paymentTransaction.failureReason
    };
  }

  _enforceParentalControlsOnProfile(profile, settings) {
    if (!settings || !settings.enabled) return profile;
    const globalRating = settings.maxContentRatingAllowed;
    if (!profile.maxContentRatingAllowed) {
      profile.maxContentRatingAllowed = globalRating;
    } else {
      const globalRank = this._ratingOrder[globalRating] || 9999;
      const profileRank = this._ratingOrder[profile.maxContentRatingAllowed] || 9999;
      if (profileRank > globalRank) {
        profile.maxContentRatingAllowed = globalRating;
      }
    }
    if (profile.isKidsProfile && profile.ageRestrictionType === 'no_restriction') {
      profile.ageRestrictionType = 'under_13';
    }
    return profile;
  }

  _upsertBrowsePreferences(selectedCategoryId, viewMode, sortOption) {
    const list = this._getFromStorage('browse_preferences');
    const now = this._now();
    if (list.length === 0) {
      const pref = {
        id: this._generateId('browse_pref'),
        selectedCategoryId,
        viewMode,
        sortOption,
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage('browse_preferences', [pref]);
      return pref;
    }
    const pref = list[0];
    pref.selectedCategoryId = selectedCategoryId;
    pref.viewMode = viewMode;
    pref.sortOption = sortOption;
    pref.updatedAt = now;
    this._saveToStorage('browse_preferences', list);
    return pref;
  }

  // ---------------------- Core interface implementations ----------------------

  // getHomeOverview
  getHomeOverview() {
    const videos = this._getFromStorage('videos');
    const channels = this._getFromStorage('channels');

    const channelsById = {};
    channels.forEach((c) => { channelsById[c.id] = c; });

    const nonLive = videos.filter((v) => !v.isLive);
    const live = videos.filter((v) => v.isLive);

    const trendingVideos = nonLive
      .slice()
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 20);

    const topRatedVideos = nonLive
      .slice()
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0))
      .slice(0, 20);

    const liveNowVideos = live
      .slice()
      .sort((a, b) => (b.liveViewerCount || 0) - (a.liveViewerCount || 0))
      .slice(0, 20);

    const documentaryVideos = videos
      .filter((v) => v.contentCategory === 'documentaries')
      .slice(0, 20);

    const recommendedVideos = videos
      .slice()
      .sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0))
      .slice(0, 20);

    const mapHomeCard = (video) => {
      const channel = channelsById[video.channelId] || null;
      return {
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl || '',
        durationMinutes: video.durationMinutes || 0,
        releaseYear: video.releaseYear || null,
        ratingAverage: video.ratingAverage || 0,
        ratingCount: video.ratingCount || 0,
        viewCount: video.viewCount || 0,
        contentCategory: video.contentCategory || 'other',
        contentType: video.contentType || 'other',
        genre: video.genre || 'other',
        isLive: !!video.isLive,
        liveViewerCount: video.liveViewerCount || 0,
        channelId: video.channelId || (channel ? channel.id : null),
        channelName: channel ? channel.name : null,
        channelAvatarUrl: channel ? channel.avatarUrl : null,
        isInWatchLater: false,
        video,
        channel
      };
    };

    const trending = trendingVideos.map(mapHomeCard);

    const topRated = topRatedVideos.map((video) => {
      const channel = channelsById[video.channelId] || null;
      return {
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl || '',
        durationMinutes: video.durationMinutes || 0,
        releaseYear: video.releaseYear || null,
        ratingAverage: video.ratingAverage || 0,
        ratingCount: video.ratingCount || 0,
        viewCount: video.viewCount || 0,
        contentCategory: video.contentCategory || 'other',
        genre: video.genre || 'other',
        channelId: video.channelId || (channel ? channel.id : null),
        channelName: channel ? channel.name : null,
        video,
        channel
      };
    });

    const liveNow = liveNowVideos.map((video) => {
      const channel = channelsById[video.channelId] || null;
      return {
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl || '',
        contentCategory: video.contentCategory || 'live',
        genre: video.genre || 'other',
        isLive: !!video.isLive,
        liveViewerCount: video.liveViewerCount || 0,
        channelId: video.channelId || (channel ? channel.id : null),
        channelName: channel ? channel.name : null,
        video,
        channel
      };
    });

    const documentaries = documentaryVideos.map((video) => {
      const channel = channelsById[video.channelId] || null;
      return {
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl || '',
        durationMinutes: video.durationMinutes || 0,
        releaseYear: video.releaseYear || null,
        ratingAverage: video.ratingAverage || 0,
        genre: video.genre || 'documentary',
        channelId: video.channelId || (channel ? channel.id : null),
        channelName: channel ? channel.name : null,
        video,
        channel
      };
    });

    const watchLaterItems = this._getFromStorage('watch_later_items');
    const watchLaterSet = new Set(watchLaterItems.map((i) => i.videoId));

    const recommendedForYou = recommendedVideos.map((video) => {
      const channel = channelsById[video.channelId] || null;
      return {
        videoId: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl || '',
        durationMinutes: video.durationMinutes || 0,
        ratingAverage: video.ratingAverage || 0,
        viewCount: video.viewCount || 0,
        contentCategory: video.contentCategory || 'other',
        genre: video.genre || 'other',
        isLive: !!video.isLive,
        liveViewerCount: video.liveViewerCount || 0,
        channelId: video.channelId || (channel ? channel.id : null),
        channelName: channel ? channel.name : null,
        isInWatchLater: watchLaterSet.has(video.id),
        video,
        channel
      };
    });

    return { trending, topRated, liveNow, documentaries, recommendedForYou };
  }

  // markRecommendationNotInterested
  markRecommendationNotInterested(videoId, source) {
    const feedbackList = this._getFromStorage('recommendation_feedback');
    const now = this._now();
    const feedback = {
      id: this._generateId('recommendation_feedback'),
      videoId,
      reason: 'not_interested',
      source,
      createdAt: now
    };
    feedbackList.push(feedback);
    this._saveToStorage('recommendation_feedback', feedbackList);
    return { success: true, feedbackId: feedback.id, message: 'Feedback recorded.' };
  }

  // getSearchFilterOptions
  getSearchFilterOptions() {
    const videos = this._getFromStorage('videos');
    const channels = this._getFromStorage('channels');

    const numericRange = (arr, key) => {
      let min = null;
      let max = null;
      arr.forEach((item) => {
        const v = item[key];
        if (typeof v === 'number' && !isNaN(v)) {
          if (min === null || v < min) min = v;
          if (max === null || v > max) max = v;
        }
      });
      if (min === null || max === null) return { min: 0, max: 0 };
      return { min, max };
    };

    const releaseYearRange = numericRange(videos, 'releaseYear');
    const durationMinutesRange = numericRange(videos, 'durationMinutes');
    const ratingRange = numericRange(videos, 'ratingAverage');
    const viewCountRange = numericRange(videos, 'viewCount');
    const subscriberCountRange = numericRange(channels, 'subscriberCount');

    const genresEnum = [
      'comedy',
      'science',
      'drama',
      'action',
      'horror',
      'romance',
      'thriller',
      'documentary',
      'kids',
      'cooking',
      'gaming',
      'esports',
      'educational',
      'other'
    ];
    const contentCategoriesEnum = ['movies', 'music', 'documentaries', 'gaming', 'live', 'other'];
    const contentTypesEnum = ['movie', 'music_video', 'documentary', 'episode', 'live_stream', 'clip', 'other'];

    const videoFilters = {
      genres: genresEnum.map((g) => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1).replace('_', ' ') })),
      contentCategories: contentCategoriesEnum.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
      contentTypes: contentTypesEnum.map((t) => ({ value: t, label: t.replace('_', ' ') })),
      releaseYearRange,
      durationMinutesRange,
      ratingRange,
      viewCountRange
    };

    const channelCategoriesEnum = ['gaming', 'esports', 'cooking', 'music', 'movies', 'documentaries', 'education', 'other'];
    const channelFilters = {
      categories: channelCategoriesEnum.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
      subscriberCountRange
    };

    return { videoFilters, channelFilters };
  }

  // searchVideos(query, filters, sortOption, page, pageSize)
  searchVideos(query, filters, sortOption, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const videos = this._getFromStorage('videos');
    const channels = this._getFromStorage('channels');
    const channelsById = {};
    channels.forEach((c) => { channelsById[c.id] = c; });

    let results = videos.filter((v) => {
      if (!q) return true;
      const title = (v.title || '').toLowerCase();
      const desc = (v.description || '').toLowerCase();
      return title.includes(q) || desc.includes(q);
    });

    if (f.contentCategory) {
      if (f.contentCategory === 'live') {
        results = results.filter((v) => v.isLive === true || v.contentCategory === 'live');
      } else {
        results = results.filter((v) => v.contentCategory === f.contentCategory);
      }
    }
    if (f.contentType) {
      results = results.filter((v) => v.contentType === f.contentType);
    }
    if (f.genre) {
      results = results.filter((v) => v.genre === f.genre);
    }
    if (typeof f.releaseYearMin === 'number') {
      results = results.filter((v) => typeof v.releaseYear === 'number' && v.releaseYear >= f.releaseYearMin);
    }
    if (typeof f.releaseYearMax === 'number') {
      results = results.filter((v) => typeof v.releaseYear === 'number' && v.releaseYear <= f.releaseYearMax);
    }
    if (typeof f.durationMinMinutes === 'number') {
      results = results.filter((v) => typeof v.durationMinutes === 'number' && v.durationMinutes >= f.durationMinMinutes);
    }
    if (typeof f.durationMaxMinutes === 'number') {
      results = results.filter((v) => typeof v.durationMinutes === 'number' && v.durationMinutes <= f.durationMaxMinutes);
    }
    if (typeof f.ratingMin === 'number') {
      results = results.filter((v) => typeof v.ratingAverage === 'number' && v.ratingAverage >= f.ratingMin);
    }
    if (typeof f.viewCountMin === 'number') {
      results = results.filter((v) => typeof v.viewCount === 'number' && v.viewCount >= f.viewCountMin);
    }

    const s = sortOption || 'upload_date_newest';
    results.sort((a, b) => {
      switch (s) {
        case 'rating_high_to_low':
          return (b.ratingAverage || 0) - (a.ratingAverage || 0);
        case 'rating_low_to_high':
          return (a.ratingAverage || 0) - (b.ratingAverage || 0);
        case 'views_high_to_low':
          return (b.viewCount || 0) - (a.viewCount || 0);
        case 'views_low_to_high':
          return (a.viewCount || 0) - (b.viewCount || 0);
        case 'upload_date_newest': {
          const bd = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
          const ad = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
          return bd - ad;
        }
        case 'upload_date_oldest': {
          const bd2 = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
          const ad2 = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
          return ad2 - bd2;
        }
        default:
          return 0;
      }
    });

    const totalResults = results.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = results.slice(start, end);

    const mapped = pageItems.map((video) => {
      const channel = channelsById[video.channelId] || null;
      const description = video.description || '';
      const descriptionSnippet = description.length > 160 ? description.slice(0, 157) + '...' : description;
      return {
        videoId: video.id,
        title: video.title,
        descriptionSnippet,
        thumbnailUrl: video.thumbnailUrl || '',
        durationMinutes: video.durationMinutes || 0,
        releaseYear: video.releaseYear || null,
        ratingAverage: video.ratingAverage || 0,
        ratingCount: video.ratingCount || 0,
        viewCount: video.viewCount || 0,
        uploadDate: video.uploadDate || null,
        contentCategory: video.contentCategory || 'other',
        contentType: video.contentType || 'other',
        genre: video.genre || 'other',
        isLive: !!video.isLive,
        liveViewerCount: video.liveViewerCount || 0,
        channelId: video.channelId || (channel ? channel.id : null),
        channelName: channel ? channel.name : null,
        channelAvatarUrl: channel ? channel.avatarUrl : null,
        video,
        channel
      };
    });

    return {
      query,
      page: pg,
      pageSize: size,
      totalResults,
      results: mapped
    };
  }

  // searchChannels(query, filters, sortOption, page, pageSize)
  searchChannels(query, filters, sortOption, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const channels = this._getFromStorage('channels');
    let results = channels.filter((c) => {
      if (!q) return true;
      const name = (c.name || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });

    if (typeof f.minSubscriberCount === 'number') {
      results = results.filter((c) => typeof c.subscriberCount === 'number' && c.subscriberCount >= f.minSubscriberCount);
    }
    if (f.category) {
      results = results.filter((c) => c.category === f.category);
    }

    const s = sortOption || 'subscriber_count_high_to_low';
    results.sort((a, b) => {
      switch (s) {
        case 'subscriber_count_high_to_low':
          return (b.subscriberCount || 0) - (a.subscriberCount || 0);
        case 'subscriber_count_low_to_high':
          return (a.subscriberCount || 0) - (b.subscriberCount || 0);
        case 'upload_date_newest': {
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return bd - ad;
        }
        case 'upload_date_oldest': {
          const bd2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const ad2 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return ad2 - bd2;
        }
        default:
          return 0;
      }
    });

    const totalResults = results.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = results.slice(start, end);

    const mapped = pageItems.map((c) => ({
      channelId: c.id,
      name: c.name,
      descriptionSnippet: (c.description || '').slice(0, 160),
      avatarUrl: c.avatarUrl || '',
      bannerUrl: c.bannerUrl || '',
      subscriberCount: c.subscriberCount || 0,
      category: c.category || 'other',
      isFollowed: !!c.isFollowed,
      channel: c
    }));

    return {
      query,
      page: pg,
      pageSize: size,
      totalResults,
      results: mapped
    };
  }

  // getVideoDetails(videoId)
  getVideoDetails(videoId) {
    const videos = this._getFromStorage('videos');
    const channels = this._getFromStorage('channels');
    const watchlists = this._getFromStorage('watchlists');
    const watchlistItems = this._getFromStorage('watchlist_items');
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');
    const watchLaterItems = this._getFromStorage('watch_later_items');

    const video = videos.find((v) => v.id === videoId) || null;
    const channel = video ? channels.find((c) => c.id === video.channelId) || null : null;

    const watchLaterSet = new Set(watchLaterItems.map((i) => i.videoId));

    const watchlistsContainingVideo = watchlistItems
      .filter((wi) => wi.videoId === videoId)
      .map((wi) => {
        const w = watchlists.find((x) => x.id === wi.watchlistId);
        if (!w) return null;
        return {
          watchlistId: w.id,
          name: w.name,
          watchlist: w
        };
      })
      .filter(Boolean);

    const playlistsContainingVideo = playlistItems
      .filter((pi) => pi.videoId === videoId)
      .map((pi) => {
        const p = playlists.find((x) => x.id === pi.playlistId);
        if (!p) return null;
        return {
          playlistId: p.id,
          name: p.name,
          visibility: p.visibility,
          playlist: p
        };
      })
      .filter(Boolean);

    const videoObj = video
      ? {
          id: video.id,
          title: video.title,
          description: video.description || '',
          contentCategory: video.contentCategory || 'other',
          contentType: video.contentType || 'other',
          genre: video.genre || 'other',
          durationMinutes: video.durationMinutes || 0,
          releaseYear: video.releaseYear || null,
          uploadDate: video.uploadDate || null,
          ratingAverage: video.ratingAverage || 0,
          ratingCount: video.ratingCount || 0,
          viewCount: video.viewCount || 0,
          thumbnailUrl: video.thumbnailUrl || '',
          contentRating: video.contentRating || 'unrated',
          availableQualities: Array.isArray(video.availableQualities) ? video.availableQualities : [],
          isLive: !!video.isLive,
          liveViewerCount: video.liveViewerCount || 0,
          isFeatured: !!video.isFeatured
        }
      : null;

    const channelObj = channel
      ? {
          id: channel.id,
          name: channel.name,
          description: channel.description || '',
          avatarUrl: channel.avatarUrl || '',
          bannerUrl: channel.bannerUrl || '',
          subscriberCount: channel.subscriberCount || 0,
          category: channel.category || 'other',
          isFollowed: !!channel.isFollowed,
          notificationPreference: channel.notificationPreference || 'none'
        }
      : null;

    const userContext = {
      isInWatchLater: watchLaterSet.has(videoId),
      watchlistsContainingVideo,
      playlistsContainingVideo
    };

    return { video: videoObj, channel: channelObj, userContext };
  }

  // addVideoToWatchlist(videoId, existingWatchlistId, newWatchlistName, newWatchlistDescription)
  addVideoToWatchlist(videoId, existingWatchlistId, newWatchlistName, newWatchlistDescription) {
    const videos = this._getFromStorage('videos');
    const video = videos.find((v) => v.id === videoId);
    if (!video) {
      return { success: false, watchlist: null, message: 'Video not found.' };
    }

    let watchlist = null;
    let watchlists = this._getFromStorage('watchlists');
    if (existingWatchlistId) {
      watchlist = watchlists.find((w) => w.id === existingWatchlistId) || null;
    }
    if (!watchlist) {
      if (!newWatchlistName) {
        return { success: false, watchlist: null, message: 'No watchlist specified.' };
      }
      watchlist = this._createOrGetWatchlistByName(newWatchlistName, newWatchlistDescription || '');
      // Refresh local list so it includes the newly created watchlist
      watchlists = this._getFromStorage('watchlists');
    }

    const watchlistItems = this._getFromStorage('watchlist_items');
    const existing = watchlistItems.find((wi) => wi.watchlistId === watchlist.id && wi.videoId === videoId);
    if (!existing) {
      const now = this._now();
      const maxPos = watchlistItems
        .filter((wi) => wi.watchlistId === watchlist.id && typeof wi.position === 'number')
        .reduce((acc, wi) => (wi.position > acc ? wi.position : acc), 0);
      const item = {
        id: this._generateId('watchlist_item'),
        watchlistId: watchlist.id,
        videoId,
        position: maxPos + 1,
        addedAt: now
      };
      watchlistItems.push(item);
      this._saveToStorage('watchlist_items', watchlistItems);
    }

    watchlist.updatedAt = this._now();
    const wIdx = watchlists.findIndex((w) => w.id === watchlist.id);
    if (wIdx !== -1) {
      watchlists[wIdx] = watchlist;
    } else {
      watchlists.push(watchlist);
    }
    this._saveToStorage('watchlists', watchlists);

    return {
      success: true,
      watchlist,
      message: 'Video added to watchlist.'
    };
  }

  // addVideoToPlaylist(videoId, existingPlaylistId, newPlaylistName, newPlaylistDescription, visibility)
  addVideoToPlaylist(videoId, existingPlaylistId, newPlaylistName, newPlaylistDescription, visibility) {
    const videos = this._getFromStorage('videos');
    const video = videos.find((v) => v.id === videoId);
    if (!video) {
      return { success: false, playlist: null, message: 'Video not found.' };
    }

    let playlist = null;
    let playlists = this._getFromStorage('playlists');
    if (existingPlaylistId) {
      playlist = playlists.find((p) => p.id === existingPlaylistId) || null;
    }
    if (!playlist) {
      if (!newPlaylistName) {
        return { success: false, playlist: null, message: 'No playlist specified.' };
      }
      playlist = this._createOrGetPlaylistByName(newPlaylistName, newPlaylistDescription || '', visibility || 'public');
      // Refresh local list so it includes the newly created playlist
      playlists = this._getFromStorage('playlists');
    }

    const playlistItems = this._getFromStorage('playlist_items');
    const exists = playlistItems.find((pi) => pi.playlistId === playlist.id && pi.videoId === videoId);
    if (!exists) {
      const now = this._now();
      const maxPos = playlistItems
        .filter((pi) => pi.playlistId === playlist.id && typeof pi.position === 'number')
        .reduce((acc, pi) => (pi.position > acc ? pi.position : acc), 0);
      const item = {
        id: this._generateId('playlist_item'),
        playlistId: playlist.id,
        videoId,
        position: maxPos + 1,
        addedAt: now
      };
      playlistItems.push(item);
      this._saveToStorage('playlist_items', playlistItems);
    }

    const now2 = this._now();
    playlist.updatedAt = now2;
    const pIdx = playlists.findIndex((p) => p.id === playlist.id);
    if (pIdx !== -1) {
      playlists[pIdx] = playlist;
    } else {
      playlists.push(playlist);
    }
    this._saveToStorage('playlists', playlists);

    const videoCount = playlistItems.filter((pi) => pi.playlistId === playlist.id).length;

    return {
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        visibility: playlist.visibility || 'private',
        videoCount,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt
      },
      message: 'Video added to playlist.'
    };
  }

  // saveVideoToWatchLater(videoId)
  saveVideoToWatchLater(videoId) {
    const videos = this._getFromStorage('videos');
    const video = videos.find((v) => v.id === videoId);
    if (!video) {
      return { success: false, watchLaterItem: null, message: 'Video not found.' };
    }

    const watchLaterList = this._ensureWatchLaterList();
    const items = this._getFromStorage('watch_later_items');

    const existing = items.find((i) => i.watchLaterListId === watchLaterList.id && i.videoId === videoId);
    if (existing) {
      return {
        success: true,
        watchLaterItem: {
          id: existing.id,
          position: existing.position,
          addedAt: existing.addedAt
        },
        message: 'Video already in Watch Later.'
      };
    }

    const now = this._now();
    const maxPos = items
      .filter((i) => i.watchLaterListId === watchLaterList.id && typeof i.position === 'number')
      .reduce((acc, i) => (i.position > acc ? i.position : acc), 0);

    const item = {
      id: this._generateId('watch_later_item'),
      watchLaterListId: watchLaterList.id,
      videoId,
      position: maxPos + 1,
      addedAt: now
    };
    items.push(item);
    this._saveToStorage('watch_later_items', items);

    return {
      success: true,
      watchLaterItem: {
        id: item.id,
        position: item.position,
        addedAt: item.addedAt
      },
      message: 'Video saved to Watch Later.'
    };
  }

  // followChannel(channelId)
  followChannel(channelId) {
    const channels = this._getFromStorage('channels');
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) {
      return { success: false, channelId, isFollowed: false, subscriberCount: 0, message: 'Channel not found.' };
    }
    channel.isFollowed = true;
    if (typeof channel.subscriberCount === 'number') {
      channel.subscriberCount += 1;
    } else {
      channel.subscriberCount = 1;
    }
    this._saveToStorage('channels', channels);
    return {
      success: true,
      channelId: channel.id,
      isFollowed: true,
      subscriberCount: channel.subscriberCount,
      message: 'Channel followed.'
    };
  }

  // startVideoPlayback(videoId)
  startVideoPlayback(videoId) {
    return this._createPlaybackSessionFromSettings(videoId);
  }

  // getChannelOverview(channelId)
  getChannelOverview(channelId) {
    const channels = this._getFromStorage('channels');
    const videos = this._getFromStorage('videos');

    const channel = channels.find((c) => c.id === channelId) || null;
    if (!channel) {
      return { channel: null, stats: { totalVideos: 0, totalViews: 0, liveStreamCount: 0 }, liveNow: [] };
    }

    const channelVideos = videos.filter((v) => v.channelId === channelId);
    const totalVideos = channelVideos.length;
    const totalViews = channelVideos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
    const liveNowVideos = channelVideos.filter((v) => v.isLive === true || v.contentType === 'live_stream');

    const liveNow = liveNowVideos.map((video) => ({
      videoId: video.id,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl || '',
      liveViewerCount: video.liveViewerCount || 0,
      video
    }));

    return {
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description || '',
        avatarUrl: channel.avatarUrl || '',
        bannerUrl: channel.bannerUrl || '',
        subscriberCount: channel.subscriberCount || 0,
        category: channel.category || 'other',
        isFollowed: !!channel.isFollowed,
        notificationPreference: channel.notificationPreference || 'none',
        createdAt: channel.createdAt || null
      },
      stats: {
        totalVideos,
        totalViews,
        liveStreamCount: liveNowVideos.length
      },
      liveNow
    };
  }

  // getChannelVideos(channelId, filters, sortOption, page, pageSize)
  getChannelVideos(channelId, filters, sortOption, page, pageSize) {
    const videos = this._getFromStorage('videos');
    const channelVideos = videos.filter((v) => v.channelId === channelId);
    const f = filters || {};
    let results = channelVideos.slice();

    if (typeof f.durationMinMinutes === 'number') {
      results = results.filter((v) => typeof v.durationMinutes === 'number' && v.durationMinutes >= f.durationMinMinutes);
    }
    if (typeof f.durationMaxMinutes === 'number') {
      results = results.filter((v) => typeof v.durationMinutes === 'number' && v.durationMinutes <= f.durationMaxMinutes);
    }
    if (f.contentType) {
      results = results.filter((v) => v.contentType === f.contentType);
    }
    if (f.includeLiveStreams === false) {
      results = results.filter((v) => !v.isLive && v.contentType !== 'live_stream');
    }

    const s = sortOption || 'upload_date_newest';
    results.sort((a, b) => {
      switch (s) {
        case 'upload_date_newest': {
          const bd = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
          const ad = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
          return bd - ad;
        }
        case 'upload_date_oldest': {
          const bd2 = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
          const ad2 = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
          return ad2 - bd2;
        }
        case 'views_high_to_low':
          return (b.viewCount || 0) - (a.viewCount || 0);
        case 'views_low_to_high':
          return (a.viewCount || 0) - (b.viewCount || 0);
        default:
          return 0;
      }
    });

    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = results.slice(start, end);

    const mapped = pageItems.map((v) => ({
      videoId: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl || '',
      durationMinutes: v.durationMinutes || 0,
      uploadDate: v.uploadDate || null,
      viewCount: v.viewCount || 0,
      isLive: !!v.isLive,
      liveViewerCount: v.liveViewerCount || 0,
      video: v
    }));

    return {
      channelId,
      page: pg,
      pageSize: size,
      totalResults,
      results: mapped
    };
  }

  // updateChannelNotificationPreference(channelId, notificationPreference)
  updateChannelNotificationPreference(channelId, notificationPreference) {
    const channels = this._getFromStorage('channels');
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) {
      return { success: false, channelId, notificationPreference, message: 'Channel not found.' };
    }
    channel.notificationPreference = notificationPreference;
    this._saveToStorage('channels', channels);
    return {
      success: true,
      channelId: channel.id,
      notificationPreference,
      message: 'Notification preference updated.'
    };
  }

  // getBrowseCategories()
  getBrowseCategories() {
    return [
      { id: 'all', name: 'All', description: 'All content' },
      { id: 'movies', name: 'Movies', description: 'Movies' },
      { id: 'music', name: 'Music', description: 'Music videos' },
      { id: 'documentaries', name: 'Documentaries', description: 'Documentary content' },
      { id: 'gaming', name: 'Gaming', description: 'Gaming and esports' },
      { id: 'live', name: 'Live', description: 'Live streams' }
    ];
  }

  // getBrowseFilterOptions(categoryId, viewMode)
  getBrowseFilterOptions(categoryId, viewMode) {
    const videos = this._getFromStorage('videos');

    let filtered = videos.slice();
    if (categoryId && categoryId !== 'all') {
      if (categoryId === 'live') {
        filtered = filtered.filter((v) => v.isLive === true || v.contentCategory === 'live' || v.contentType === 'live_stream');
      } else {
        filtered = filtered.filter((v) => v.contentCategory === categoryId);
      }
    }
    if (viewMode === 'live') {
      filtered = filtered.filter((v) => v.isLive === true || v.contentType === 'live_stream');
    }

    const genresSet = new Set();
    const contentTypesSet = new Set();
    filtered.forEach((v) => {
      if (v.genre) genresSet.add(v.genre);
      if (v.contentType) contentTypesSet.add(v.contentType);
    });

    const genres = Array.from(genresSet).map((g) => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }));
    const contentTypes = Array.from(contentTypesSet).map((t) => ({ value: t, label: t.replace('_', ' ') }));

    const numericRange = (arr, key) => {
      let min = null;
      let max = null;
      arr.forEach((item) => {
        const v = item[key];
        if (typeof v === 'number' && !isNaN(v)) {
          if (min === null || v < min) min = v;
          if (max === null || v > max) max = v;
        }
      });
      if (min === null || max === null) return { min: 0, max: 0 };
      return { min, max };
    };

    const releaseYearRange = numericRange(filtered, 'releaseYear');
    const durationMinutesRange = numericRange(filtered, 'durationMinutes');
    const ratingRange = numericRange(filtered, 'ratingAverage');
    const liveViewerCountRange = numericRange(filtered.filter((v) => v.isLive === true || v.contentType === 'live_stream'), 'liveViewerCount');

    return {
      genres,
      contentTypes,
      releaseYearRange,
      durationMinutesRange,
      ratingRange,
      liveViewerCountRange
    };
  }

  // browseVideos(categoryId, viewMode, filters, sortOption, page, pageSize)
  browseVideos(categoryId, viewMode, filters, sortOption, page, pageSize) {
    const videos = this._getFromStorage('videos');
    const channels = this._getFromStorage('channels');
    const channelsById = {};
    channels.forEach((c) => { channelsById[c.id] = c; });

    let base = videos.slice();
    const cat = categoryId || 'all';
    const vm = viewMode || 'default';

    if (cat !== 'all') {
      if (cat === 'live') {
        base = base.filter((v) => v.isLive === true || v.contentCategory === 'live' || v.contentType === 'live_stream');
      } else {
        base = base.filter((v) => v.contentCategory === cat);
      }
    }

    const filtered = this._applyVideoFiltersAndSorting(base, filters || {}, sortOption, vm);

    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = filtered.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    const results = pageItems.map((v) => {
      const channel = channelsById[v.channelId] || null;
      return {
        videoId: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl || '',
        durationMinutes: v.durationMinutes || 0,
        releaseYear: v.releaseYear || null,
        ratingAverage: v.ratingAverage || 0,
        viewCount: v.viewCount || 0,
        contentCategory: v.contentCategory || 'other',
        contentType: v.contentType || 'other',
        genre: v.genre || 'other',
        isLive: !!v.isLive,
        liveViewerCount: v.liveViewerCount || 0,
        channelId: v.channelId || (channel ? channel.id : null),
        channelName: channel ? channel.name : null,
        video: v,
        channel
      };
    });

    return {
      categoryId: cat,
      viewMode: vm,
      page: pg,
      pageSize: size,
      totalResults,
      results
    };
  }

  // getLibraryOverview()
  getLibraryOverview() {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');
    const watchlists = this._getFromStorage('watchlists');
    const watchlistItems = this._getFromStorage('watchlist_items');
    const watchLaterList = this._ensureWatchLaterList();
    const watchLaterItems = this._getFromStorage('watch_later_items');
    const videos = this._getFromStorage('videos');

    const playlistSummaries = playlists.map((p) => {
      const videoCount = playlistItems.filter((pi) => pi.playlistId === p.id).length;
      return {
        playlistId: p.id,
        name: p.name,
        description: p.description || '',
        visibility: p.visibility || 'private',
        videoCount,
        updatedAt: p.updatedAt || p.createdAt || null,
        playlist: p
      };
    });

    const watchlistSummaries = watchlists.map((w) => {
      const videoCount = watchlistItems.filter((wi) => wi.watchlistId === w.id).length;
      return {
        watchlistId: w.id,
        name: w.name,
        description: w.description || '',
        videoCount,
        updatedAt: w.updatedAt || w.createdAt || null,
        watchlist: w
      };
    });

    const watchLaterForList = watchLaterItems.filter((i) => i.watchLaterListId === watchLaterList.id);
    const totalCount = watchLaterForList.length;
    const sortedWatchLater = watchLaterForList
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const previewItems = sortedWatchLater.slice(0, 10).map((item) => {
      const video = videos.find((v) => v.id === item.videoId) || null;
      return {
        itemId: item.id,
        position: item.position || 0,
        videoId: item.videoId,
        title: video ? video.title : null,
        thumbnailUrl: video ? video.thumbnailUrl || '' : '',
        video
      };
    });

    return {
      playlists: playlistSummaries,
      watchlists: watchlistSummaries,
      watchLater: {
        totalCount,
        previewItems
      }
    };
  }

  // createPlaylist(name, description, visibility)
  createPlaylist(name, description, visibility) {
    if (!name) {
      return { success: false, playlist: null, message: 'Name is required.' };
    }
    const playlists = this._getFromStorage('playlists');
    const now = this._now();
    const playlist = {
      id: this._generateId('playlist'),
      name,
      description: description || '',
      visibility: visibility || 'private',
      createdAt: now,
      updatedAt: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);
    return {
      success: true,
      playlist,
      message: 'Playlist created.'
    };
  }

  // createWatchlist(name, description)
  createWatchlist(name, description) {
    if (!name) {
      return { success: false, watchlist: null, message: 'Name is required.' };
    }
    const watchlists = this._getFromStorage('watchlists');
    const now = this._now();
    const watchlist = {
      id: this._generateId('watchlist'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    watchlists.push(watchlist);
    this._saveToStorage('watchlists', watchlists);
    return {
      success: true,
      watchlist,
      message: 'Watchlist created.'
    };
  }

  // getCollectionDetails(collectionType, collectionId)
  getCollectionDetails(collectionType, collectionId) {
    const videos = this._getFromStorage('videos');
    let collection = null;
    let itemsRaw = [];

    if (collectionType === 'playlist') {
      const playlists = this._getFromStorage('playlists');
      const playlistItems = this._getFromStorage('playlist_items');
      const p = playlists.find((pl) => pl.id === collectionId) || null;
      if (!p) {
        return { collection: null, items: [] };
      }
      collection = {
        id: p.id,
        collectionType: 'playlist',
        name: p.name,
        description: p.description || '',
        visibility: p.visibility || 'private',
        totalItems: playlistItems.filter((pi) => pi.playlistId === p.id).length,
        updatedAt: p.updatedAt || p.createdAt || null,
        playlist: p
      };
      itemsRaw = playlistItems.filter((pi) => pi.playlistId === p.id);
    } else if (collectionType === 'watchlist') {
      const watchlists = this._getFromStorage('watchlists');
      const watchlistItems = this._getFromStorage('watchlist_items');
      const w = watchlists.find((wl) => wl.id === collectionId) || null;
      if (!w) {
        return { collection: null, items: [] };
      }
      collection = {
        id: w.id,
        collectionType: 'watchlist',
        name: w.name,
        description: w.description || '',
        visibility: null,
        totalItems: watchlistItems.filter((wi) => wi.watchlistId === w.id).length,
        updatedAt: w.updatedAt || w.createdAt || null,
        watchlist: w
      };
      itemsRaw = watchlistItems.filter((wi) => wi.watchlistId === w.id);
    } else if (collectionType === 'watch_later') {
      const watchLaterList = this._ensureWatchLaterList();
      const watchLaterItems = this._getFromStorage('watch_later_items');
      const itemsForList = watchLaterItems.filter((i) => i.watchLaterListId === watchLaterList.id);
      collection = {
        id: watchLaterList.id,
        collectionType: 'watch_later',
        name: watchLaterList.name,
        description: '',
        visibility: null,
        totalItems: itemsForList.length,
        updatedAt: itemsForList.reduce((acc, i) => (!acc || i.addedAt > acc ? i.addedAt : acc), null),
        watchLaterList
      };
      itemsRaw = itemsForList;
    } else {
      return { collection: null, items: [] };
    }

    const items = itemsRaw
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((item) => {
        const video = videos.find((v) => v.id === item.videoId) || null;
        return {
          itemId: item.id,
          position: item.position || 0,
          addedAt: item.addedAt || null,
          videoId: item.videoId,
          title: video ? video.title : null,
          thumbnailUrl: video ? video.thumbnailUrl || '' : '',
          durationMinutes: video ? video.durationMinutes || 0 : 0,
          viewCount: video ? video.viewCount || 0 : 0,
          ratingAverage: video ? video.ratingAverage || 0 : 0,
          channelName: null,
          video
        };
      });

    return { collection, items };
  }

  // reorderCollectionItems(collectionType, collectionId, orderedItemIds)
  reorderCollectionItems(collectionType, collectionId, orderedItemIds) {
    if (!Array.isArray(orderedItemIds)) {
      return { success: false, collectionId: collectionId || null, collectionType, message: 'orderedItemIds must be an array.' };
    }

    if (collectionType === 'playlist') {
      const playlistItems = this._getFromStorage('playlist_items');
      let position = 1;
      orderedItemIds.forEach((id) => {
        const item = playlistItems.find((pi) => pi.id === id && (!collectionId || pi.playlistId === collectionId));
        if (item) {
          item.position = position++;
        }
      });
      this._saveToStorage('playlist_items', playlistItems);
      return { success: true, collectionId, collectionType: 'playlist', message: 'Playlist items reordered.' };
    }

    if (collectionType === 'watchlist') {
      const watchlistItems = this._getFromStorage('watchlist_items');
      let position = 1;
      orderedItemIds.forEach((id) => {
        const item = watchlistItems.find((wi) => wi.id === id && (!collectionId || wi.watchlistId === collectionId));
        if (item) {
          item.position = position++;
        }
      });
      this._saveToStorage('watchlist_items', watchlistItems);
      return { success: true, collectionId, collectionType: 'watchlist', message: 'Watchlist items reordered.' };
    }

    if (collectionType === 'watch_later') {
      const watchLaterList = this._ensureWatchLaterList();
      const watchLaterItems = this._getFromStorage('watch_later_items');
      let position = 1;
      orderedItemIds.forEach((id) => {
        const item = watchLaterItems.find((i) => i.id === id && i.watchLaterListId === watchLaterList.id);
        if (item) {
          item.position = position++;
        }
      });
      this._saveToStorage('watch_later_items', watchLaterItems);
      return { success: true, collectionId: watchLaterList.id, collectionType: 'watch_later', message: 'Watch Later items reordered.' };
    }

    return { success: false, collectionId: collectionId || null, collectionType, message: 'Unknown collection type.' };
  }

  // removeItemFromCollection(collectionType, collectionId, itemId)
  removeItemFromCollection(collectionType, collectionId, itemId) {
    let remainingCount = 0;
    if (collectionType === 'playlist') {
      let playlistItems = this._getFromStorage('playlist_items');
      const item = playlistItems.find((pi) => pi.id === itemId);
      if (!item) {
        return { success: false, remainingItemCount: 0, message: 'Item not found.' };
      }
      const pid = collectionId || item.playlistId;
      playlistItems = playlistItems.filter((pi) => pi.id !== itemId);
      remainingCount = playlistItems.filter((pi) => pi.playlistId === pid).length;
      this._saveToStorage('playlist_items', playlistItems);
      return { success: true, remainingItemCount: remainingCount, message: 'Item removed from playlist.' };
    }

    if (collectionType === 'watchlist') {
      let watchlistItems = this._getFromStorage('watchlist_items');
      const item = watchlistItems.find((wi) => wi.id === itemId);
      if (!item) {
        return { success: false, remainingItemCount: 0, message: 'Item not found.' };
      }
      const wid = collectionId || item.watchlistId;
      watchlistItems = watchlistItems.filter((wi) => wi.id !== itemId);
      remainingCount = watchlistItems.filter((wi) => wi.watchlistId === wid).length;
      this._saveToStorage('watchlist_items', watchlistItems);
      return { success: true, remainingItemCount: remainingCount, message: 'Item removed from watchlist.' };
    }

    if (collectionType === 'watch_later') {
      const watchLaterList = this._ensureWatchLaterList();
      let watchLaterItems = this._getFromStorage('watch_later_items');
      const item = watchLaterItems.find((i) => i.id === itemId && i.watchLaterListId === watchLaterList.id);
      if (!item) {
        return { success: false, remainingItemCount: 0, message: 'Item not found.' };
      }
      watchLaterItems = watchLaterItems.filter((i) => i.id !== itemId);
      remainingCount = watchLaterItems.filter((i) => i.watchLaterListId === watchLaterList.id).length;
      this._saveToStorage('watch_later_items', watchLaterItems);
      return { success: true, remainingItemCount: remainingCount, message: 'Item removed from Watch Later.' };
    }

    return { success: false, remainingItemCount: 0, message: 'Unknown collection type.' };
  }

  // renameCollection(collectionType, collectionId, newName)
  renameCollection(collectionType, collectionId, newName) {
    if (!newName) {
      return { success: false, collectionId, collectionType, newName, message: 'newName is required.' };
    }
    const now = this._now();
    if (collectionType === 'playlist') {
      const playlists = this._getFromStorage('playlists');
      const playlist = playlists.find((p) => p.id === collectionId);
      if (!playlist) {
        return { success: false, collectionId, collectionType, newName, message: 'Playlist not found.' };
      }
      playlist.name = newName;
      playlist.updatedAt = now;
      this._saveToStorage('playlists', playlists);
      return { success: true, collectionId, collectionType, newName, message: 'Playlist renamed.' };
    }

    if (collectionType === 'watchlist') {
      const watchlists = this._getFromStorage('watchlists');
      const watchlist = watchlists.find((w) => w.id === collectionId);
      if (!watchlist) {
        return { success: false, collectionId, collectionType, newName, message: 'Watchlist not found.' };
      }
      watchlist.name = newName;
      watchlist.updatedAt = now;
      this._saveToStorage('watchlists', watchlists);
      return { success: true, collectionId, collectionType, newName, message: 'Watchlist renamed.' };
    }

    return { success: false, collectionId, collectionType, newName, message: 'Unknown collection type.' };
  }

  // updatePlaylistVisibility(playlistId, visibility)
  updatePlaylistVisibility(playlistId, visibility) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      return { success: false, playlistId, visibility, message: 'Playlist not found.' };
    }
    playlist.visibility = visibility;
    playlist.updatedAt = this._now();
    this._saveToStorage('playlists', playlists);
    return { success: true, playlistId, visibility, message: 'Playlist visibility updated.' };
  }

  // deletePlaylist(playlistId)
  deletePlaylist(playlistId) {
    let playlists = this._getFromStorage('playlists');
    const exists = playlists.some((p) => p.id === playlistId);
    playlists = playlists.filter((p) => p.id !== playlistId);
    this._saveToStorage('playlists', playlists);

    let playlistItems = this._getFromStorage('playlist_items');
    playlistItems = playlistItems.filter((pi) => pi.playlistId !== playlistId);
    this._saveToStorage('playlist_items', playlistItems);

    return { success: exists, message: exists ? 'Playlist deleted.' : 'Playlist not found.' };
  }

  // deleteWatchlist(watchlistId)
  deleteWatchlist(watchlistId) {
    let watchlists = this._getFromStorage('watchlists');
    const exists = watchlists.some((w) => w.id === watchlistId);
    watchlists = watchlists.filter((w) => w.id !== watchlistId);
    this._saveToStorage('watchlists', watchlists);

    let watchlistItems = this._getFromStorage('watchlist_items');
    watchlistItems = watchlistItems.filter((wi) => wi.watchlistId !== watchlistId);
    this._saveToStorage('watchlist_items', watchlistItems);

    return { success: exists, message: exists ? 'Watchlist deleted.' : 'Watchlist not found.' };
  }

  // getWatchHistory(contentCategoryFilter, includeRemoved, page, pageSize)
  getWatchHistory(contentCategoryFilter, includeRemoved, page, pageSize) {
    const entries = this._getFromStorage('history_entries');
    const videos = this._getFromStorage('videos');
    const channels = this._getFromStorage('channels');

    const channelsById = {};
    channels.forEach((c) => { channelsById[c.id] = c; });

    const catFilter = contentCategoryFilter || 'all';
    const inclRemoved = !!includeRemoved;

    let filtered = entries.slice();
    if (catFilter && catFilter !== 'all') {
      filtered = filtered.filter((e) => e.contentCategory === catFilter);
    }
    if (!inclRemoved) {
      filtered = filtered.filter((e) => !e.isRemoved);
    }

    filtered.sort((a, b) => {
      const bd = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
      const ad = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
      return bd - ad;
    });

    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = filtered.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageEntries = filtered.slice(start, end);

    const mapped = pageEntries.map((e) => {
      const video = videos.find((v) => v.id === e.videoId) || null;
      const channel = video ? channelsById[video.channelId] || null : null;
      return {
        historyEntryId: e.id,
        watchedAt: e.watchedAt,
        contentCategory: e.contentCategory || 'other',
        isRemoved: !!e.isRemoved,
        videoId: e.videoId,
        title: video ? video.title : null,
        thumbnailUrl: video ? video.thumbnailUrl || '' : '',
        durationMinutes: video ? video.durationMinutes || 0 : 0,
        channelName: channel ? channel.name : null,
        video,
        channel
      };
    });

    return {
      page: pg,
      pageSize: size,
      totalResults,
      entries: mapped
    };
  }

  // removeHistoryEntry(historyEntryId)
  removeHistoryEntry(historyEntryId) {
    const entries = this._getFromStorage('history_entries');
    const entry = entries.find((e) => e.id === historyEntryId);
    if (!entry) {
      return { success: false, historyEntryId, message: 'History entry not found.' };
    }
    entry.isRemoved = true;
    this._saveToStorage('history_entries', entries);
    return { success: true, historyEntryId, message: 'History entry removed.' };
  }

  // clearWatchHistory()
  clearWatchHistory() {
    const entries = this._getFromStorage('history_entries');
    const total = entries.length;
    const cleared = entries.map((e) => ({ ...e, isRemoved: true }));
    this._saveToStorage('history_entries', cleared);
    return { success: true, totalEntriesCleared: total };
  }

  // getPlaybackSettings()
  getPlaybackSettings() {
    const record = this._ensurePlaybackSettingsRecord();
    return {
      defaultVideoQuality: record.defaultVideoQuality,
      subtitleBehavior: record.subtitleBehavior,
      subtitleLanguage: record.subtitleLanguage,
      autoplayNextVideo: !!record.autoplayNextVideo,
      updatedAt: record.updatedAt
    };
  }

  // updatePlaybackSettings(defaultVideoQuality, subtitleBehavior, subtitleLanguage, autoplayNextVideo)
  updatePlaybackSettings(defaultVideoQuality, subtitleBehavior, subtitleLanguage, autoplayNextVideo) {
    const list = this._getFromStorage('playback_settings');
    const now = this._now();
    let record;
    if (list.length === 0) {
      record = {
        id: this._generateId('playback_settings'),
        defaultVideoQuality,
        subtitleBehavior,
        subtitleLanguage,
        autoplayNextVideo: !!autoplayNextVideo,
        updatedAt: now
      };
      this._saveToStorage('playback_settings', [record]);
    } else {
      record = list[0];
      record.defaultVideoQuality = defaultVideoQuality;
      record.subtitleBehavior = subtitleBehavior;
      record.subtitleLanguage = subtitleLanguage;
      record.autoplayNextVideo = !!autoplayNextVideo;
      record.updatedAt = now;
      this._saveToStorage('playback_settings', list);
    }

    return {
      success: true,
      settings: {
        defaultVideoQuality: record.defaultVideoQuality,
        subtitleBehavior: record.subtitleBehavior,
        subtitleLanguage: record.subtitleLanguage,
        autoplayNextVideo: !!record.autoplayNextVideo,
        updatedAt: record.updatedAt
      },
      message: 'Playback settings updated.'
    };
  }

  // getParentalControlsSettings()
  getParentalControlsSettings() {
    let list = this._getFromStorage('parental_controls_settings');
    if (list.length === 0) {
      const now = this._now();
      const settings = {
        id: this._generateId('parental_settings'),
        enabled: false,
        maxContentRatingAllowed: 'nc_17',
        pin: '',
        createdAt: now,
        updatedAt: now
      };
      list = [settings];
      this._saveToStorage('parental_controls_settings', list);
    }
    const s = list[0];
    return {
      enabled: !!s.enabled,
      maxContentRatingAllowed: s.maxContentRatingAllowed || 'nc_17',
      pinSet: !!(s.pin && String(s.pin).length > 0),
      updatedAt: s.updatedAt
    };
  }

  // updateParentalControlsSettings(enabled, maxContentRatingAllowed, pin)
  updateParentalControlsSettings(enabled, maxContentRatingAllowed, pin) {
    if (typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return {
        success: false,
        settings: null,
        message: 'PIN must be a 4-digit string.'
      };
    }
    let list = this._getFromStorage('parental_controls_settings');
    const now = this._now();
    let settings;
    if (list.length === 0) {
      settings = {
        id: this._generateId('parental_settings'),
        enabled: !!enabled,
        maxContentRatingAllowed,
        pin,
        createdAt: now,
        updatedAt: now
      };
      list = [settings];
    } else {
      settings = list[0];
      settings.enabled = !!enabled;
      settings.maxContentRatingAllowed = maxContentRatingAllowed;
      settings.pin = pin;
      settings.updatedAt = now;
    }
    this._saveToStorage('parental_controls_settings', list);

    // enforce on existing profiles
    const profiles = this._getFromStorage('profiles');
    profiles.forEach((p) => this._enforceParentalControlsOnProfile(p, settings));
    this._saveToStorage('profiles', profiles);

    return {
      success: true,
      settings: {
        enabled: !!settings.enabled,
        maxContentRatingAllowed: settings.maxContentRatingAllowed,
        pinSet: !!(settings.pin && String(settings.pin).length > 0),
        updatedAt: settings.updatedAt
      },
      message: 'Parental controls updated.'
    };
  }

  // getProfiles()
  getProfiles() {
    const profiles = this._getFromStorage('profiles');
    return profiles.map((p) => ({
      profileId: p.id,
      name: p.name,
      isKidsProfile: !!p.isKidsProfile,
      ageRestrictionType: p.ageRestrictionType || 'no_restriction',
      maxAllowedAge: typeof p.maxAllowedAge === 'number' ? p.maxAllowedAge : null,
      maxContentRatingAllowed: p.maxContentRatingAllowed || 'nc_17',
      createdAt: p.createdAt || null,
      updatedAt: p.updatedAt || null
    }));
  }

  // createProfile(name, isKidsProfile, ageRestrictionType, maxAllowedAge, maxContentRatingAllowed)
  createProfile(name, isKidsProfile, ageRestrictionType, maxAllowedAge, maxContentRatingAllowed) {
    if (!name) {
      return { success: false, profile: null, message: 'Name is required.' };
    }
    const profiles = this._getFromStorage('profiles');
    const now = this._now();
    const profile = {
      id: this._generateId('profile'),
      name,
      isKidsProfile: !!isKidsProfile,
      ageRestrictionType: ageRestrictionType || 'no_restriction',
      maxAllowedAge: typeof maxAllowedAge === 'number' ? maxAllowedAge : null,
      maxContentRatingAllowed: maxContentRatingAllowed || null,
      createdAt: now,
      updatedAt: now
    };

    const parentalList = this._getFromStorage('parental_controls_settings');
    const parentalSettings = parentalList[0] || null;
    this._enforceParentalControlsOnProfile(profile, parentalSettings);

    profiles.push(profile);
    this._saveToStorage('profiles', profiles);

    return {
      success: true,
      profile: {
        profileId: profile.id,
        name: profile.name,
        isKidsProfile: profile.isKidsProfile,
        ageRestrictionType: profile.ageRestrictionType,
        maxAllowedAge: profile.maxAllowedAge,
        maxContentRatingAllowed: profile.maxContentRatingAllowed || 'nc_17',
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      },
      message: 'Profile created.'
    };
  }

  // updateProfile(profileId, name, isKidsProfile, ageRestrictionType, maxAllowedAge, maxContentRatingAllowed)
  updateProfile(profileId, name, isKidsProfile, ageRestrictionType, maxAllowedAge, maxContentRatingAllowed) {
    const profiles = this._getFromStorage('profiles');
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) {
      return { success: false, profile: null, message: 'Profile not found.' };
    }

    if (typeof name === 'string' && name.length > 0) profile.name = name;
    if (typeof isKidsProfile === 'boolean') profile.isKidsProfile = isKidsProfile;
    if (typeof ageRestrictionType === 'string' && ageRestrictionType) profile.ageRestrictionType = ageRestrictionType;
    if (typeof maxAllowedAge === 'number') profile.maxAllowedAge = maxAllowedAge;
    if (typeof maxContentRatingAllowed === 'string' && maxContentRatingAllowed) {
      profile.maxContentRatingAllowed = maxContentRatingAllowed;
    }
    profile.updatedAt = this._now();

    const parentalList = this._getFromStorage('parental_controls_settings');
    const parentalSettings = parentalList[0] || null;
    this._enforceParentalControlsOnProfile(profile, parentalSettings);

    this._saveToStorage('profiles', profiles);

    return {
      success: true,
      profile: {
        profileId: profile.id,
        name: profile.name,
        isKidsProfile: profile.isKidsProfile,
        ageRestrictionType: profile.ageRestrictionType,
        maxAllowedAge: profile.maxAllowedAge,
        maxContentRatingAllowed: profile.maxContentRatingAllowed || 'nc_17',
        updatedAt: profile.updatedAt
      },
      message: 'Profile updated.'
    };
  }

  // deleteProfile(profileId)
  deleteProfile(profileId) {
    let profiles = this._getFromStorage('profiles');
    const exists = profiles.some((p) => p.id === profileId);
    profiles = profiles.filter((p) => p.id !== profileId);
    this._saveToStorage('profiles', profiles);
    return { success: exists, message: exists ? 'Profile deleted.' : 'Profile not found.' };
  }

  // getSubscriptionPlans(filters, sortOption)
  getSubscriptionPlans(filters, sortOption) {
    const plans = this._getFromStorage('subscription_plans');
    const subscriptions = this._getFromStorage('subscriptions');

    let activeSub = null;
    const candidates = subscriptions.filter((s) => s.status === 'active' || s.status === 'trial');
    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        return bd - ad;
      });
      activeSub = candidates[0];
    }

    const f = filters || {};
    let results = plans.filter((p) => p.isActive !== false);

    if (f.billingCycle) {
      results = results.filter((p) => p.billingCycle === f.billingCycle);
    }
    if (Array.isArray(f.requiredFeatures) && f.requiredFeatures.length > 0) {
      results = results.filter((p) => {
        const features = Array.isArray(p.features) ? p.features : [];
        return f.requiredFeatures.every((rf) => features.includes(rf));
      });
    }
    if (typeof f.maxPricePerMonth === 'number') {
      results = results.filter((p) => typeof p.pricePerMonth === 'number' && p.pricePerMonth <= f.maxPricePerMonth);
    }

    const s = sortOption || 'price_per_month_low_to_high';
    results.sort((a, b) => {
      switch (s) {
        case 'price_per_month_low_to_high':
          return (a.pricePerMonth || 0) - (b.pricePerMonth || 0);
        case 'price_per_month_high_to_low':
          return (b.pricePerMonth || 0) - (a.pricePerMonth || 0);
        default:
          return 0;
      }
    });

    const mapped = results.map((p) => ({
      planId: p.id,
      name: p.name,
      description: p.description || '',
      pricePerMonth: p.pricePerMonth || 0,
      billingCycle: p.billingCycle || 'monthly',
      features: Array.isArray(p.features) ? p.features : [],
      maxResolution: p.maxResolution || 'hd',
      isActive: p.isActive !== false,
      isCurrentPlan: !!(activeSub && activeSub.planId === p.id),
      plan: p
    }));

    return { plans: mapped };
  }

  // getCurrentSubscription()
  getCurrentSubscription() {
    const subscriptions = this._getFromStorage('subscriptions');
    const plans = this._getFromStorage('subscription_plans');

    const candidates = subscriptions.filter((s) => s.status === 'active' || s.status === 'trial' || s.status === 'past_due');
    if (candidates.length === 0) {
      return {
        status: 'none',
        plan: null,
        startDate: null,
        endDate: null,
        nextBillingDate: null
      };
    }

    candidates.sort((a, b) => {
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      return bd - ad;
    });
    const sub = candidates[0];
    const plan = plans.find((p) => p.id === sub.planId) || null;

    return {
      status: sub.status,
      plan: plan
        ? {
            planId: plan.id,
            name: plan.name,
            pricePerMonth: plan.pricePerMonth || 0,
            billingCycle: plan.billingCycle || 'monthly',
            features: Array.isArray(plan.features) ? plan.features : [],
            maxResolution: plan.maxResolution || 'hd'
          }
        : null,
      startDate: sub.startDate || null,
      endDate: sub.endDate || null,
      nextBillingDate: sub.nextBillingDate || null
    };
  }

  // checkoutSubscription(planId, cardHolderName, cardNumber, cardExpiryMonth, cardExpiryYear, cardSecurityCode)
  checkoutSubscription(planId, cardHolderName, cardNumber, cardExpiryMonth, cardExpiryYear, cardSecurityCode) {
    const result = this._processSubscriptionPayment(
      planId,
      cardHolderName,
      cardNumber,
      cardExpiryMonth,
      cardExpiryYear,
      cardSecurityCode
    );

    if (!result.success) {
      return {
        success: false,
        subscription: null,
        paymentTransaction: result.paymentTransaction
          ? {
              transactionId: result.paymentTransaction.id,
              amount: result.paymentTransaction.amount,
              currency: result.paymentTransaction.currency,
              status: result.paymentTransaction.status,
              processedAt: result.paymentTransaction.processedAt,
              failureReason: result.paymentTransaction.failureReason
            }
          : null,
        message: result.message
      };
    }

    const sub = result.subscription;
    const tx = result.paymentTransaction;

    return {
      success: true,
      subscription: {
        subscriptionId: sub.id,
        planId: sub.planId,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        nextBillingDate: sub.nextBillingDate
      },
      paymentTransaction: {
        transactionId: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        processedAt: tx.processedAt,
        failureReason: tx.failureReason
      },
      message: result.message
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      headline: 'About Our Streaming Platform',
      bodySections: [
        {
          title: 'Our Mission',
          content: 'We provide video streaming across movies, music, gaming, documentaries and more.'
        },
        {
          title: 'Features',
          content: 'Enjoy personalized recommendations, watchlists, playlists, live streams and parental controls.'
        }
      ],
      highlights: [
        {
          iconKey: 'library',
          title: 'Vast Library',
          description: 'Thousands of videos across genres and categories.'
        },
        {
          iconKey: 'devices',
          title: 'Multi-device',
          description: 'Watch on desktop, mobile and TV.'
        }
      ]
    };
  }

  // getHelpCenterContent()
  getHelpCenterContent() {
    return {
      faqs: [
        {
          question: 'How do I change playback quality?',
          answer: 'Go to Settings > Playback and choose your default video quality.',
          category: 'playback'
        },
        {
          question: 'How do I manage my subscription?',
          answer: 'Open your profile menu and select Subscription to view and change your plan.',
          category: 'billing'
        }
      ],
      guides: [
        {
          guideId: 'getting_started',
          title: 'Getting Started',
          summary: 'Learn how to find videos, follow channels and create playlists.'
        }
      ],
      troubleshootingTopics: [
        {
          topicId: 'playback_issues',
          title: 'Playback Issues',
          summary: 'If videos buffer or do not start, check your connection and playback settings.'
        }
      ]
    };
  }

  // getContactOptions()
  getContactOptions() {
    return {
      supportEmail: 'support@example.com',
      supportHours: '24/7',
      socialLinks: [
        { platform: 'twitter', url: 'https://twitter.com/example' },
        { platform: 'facebook', url: 'https://facebook.com/example' }
      ],
      contactReasons: ['Technical issue', 'Billing', 'Feedback', 'Other']
    };
  }

  // submitContactForm(name, email, subject, category, message)
  submitContactForm(name, email, subject, category, message) {
    if (!name || !email || !subject || !category || !message) {
      return { success: false, ticketId: null, message: 'All fields are required.' };
    }
    const tickets = this._getFromStorage('support_tickets');
    const now = this._now();
    const ticket = {
      id: this._generateId('ticket'),
      name,
      email,
      subject,
      category,
      message,
      createdAt: now
    };
    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);
    return { success: true, ticketId: ticket.id, message: 'Support request submitted.' };
  }

  // getTermsOfServiceContent()
  getTermsOfServiceContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          sectionId: 'introduction',
          title: 'Introduction',
          content: 'These terms govern your use of the streaming service.'
        },
        {
          sectionId: 'acceptable_use',
          title: 'Acceptable Use',
          content: 'Do not misuse the service or violate any applicable laws.'
        }
      ]
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          sectionId: 'data_collection',
          title: 'Data Collection',
          content: 'We collect limited data to provide and improve the service.'
        },
        {
          sectionId: 'cookies',
          title: 'Cookies',
          content: 'We use cookies to remember your preferences and measure usage.'
        }
      ]
    };
  }

  // getBrowsePreferences()
  getBrowsePreferences() {
    let list = this._getFromStorage('browse_preferences');
    if (list.length === 0) {
      const pref = this._upsertBrowsePreferences('all', 'default', 'rating_high_to_low');
      return {
        selectedCategoryId: pref.selectedCategoryId,
        viewMode: pref.viewMode,
        sortOption: pref.sortOption,
        updatedAt: pref.updatedAt
      };
    }
    const pref = list[0];
    return {
      selectedCategoryId: pref.selectedCategoryId,
      viewMode: pref.viewMode,
      sortOption: pref.sortOption,
      updatedAt: pref.updatedAt
    };
  }

  // updateBrowsePreferences(selectedCategoryId, viewMode, sortOption)
  updateBrowsePreferences(selectedCategoryId, viewMode, sortOption) {
    const pref = this._upsertBrowsePreferences(selectedCategoryId, viewMode, sortOption);
    return {
      success: true,
      preferences: {
        selectedCategoryId: pref.selectedCategoryId,
        viewMode: pref.viewMode,
        sortOption: pref.sortOption,
        updatedAt: pref.updatedAt
      },
      message: 'Browse preferences updated.'
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