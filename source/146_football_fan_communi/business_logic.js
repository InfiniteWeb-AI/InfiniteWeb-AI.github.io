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

  _initStorage() {
    // Core entity tables (arrays)
    const arrayKeys = [
      'users',
      'teams',
      'competitions',
      'venues',
      'matches',
      'watch_parties',
      'watch_party_rsvps',
      'fan_groups',
      'fan_group_memberships',
      'forum_categories',
      'forum_threads',
      'forum_comments',
      'comment_likes',
      'tags',
      'thread_tags',
      'polls',
      'poll_options',
      'thread_subscriptions',
      'notification_settings',
      'product_categories',
      'products',
      'carts',
      'cart_items',
      'players',
      'favorites',
      'predictions',
      'my_schedule_items'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // About content: store a minimal empty structure (no domain mock data)
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem(
        'about_content',
        JSON.stringify({
          missionText: '',
          features: [],
          contactEmail: '',
          supportLinks: []
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue !== undefined ? defaultValue : [];
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

  _now() {
    return new Date().toISOString();
  }

  _toLowerSafe(str) {
    return (str || '').toString().toLowerCase();
  }

  _datePart(dateTimeString) {
    if (!dateTimeString || typeof dateTimeString !== 'string') return null;
    return dateTimeString.slice(0, 10); // 'YYYY-MM-DD'
  }

  _ensureArray(val) {
    return Array.isArray(val) ? val : [];
  }

  // ===== Helper functions required by spec =====

  // Internal helper to get or create the current cart (single-user assumption)
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    if (carts.length === 0) {
      const cart = {
        id: this._generateId('cart'),
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      return cart;
    }
    return carts[0];
  }

  // Internal helper to get or create notification settings
  _getOrCreateNotificationSettings() {
    let settingsArr = this._getFromStorage('notification_settings', []);
    if (settingsArr.length === 0) {
      const settings = {
        id: this._generateId('notif'),
        favoriteTeamId: null,
        favoriteGoalsEnabled: false,
        favoriteKickoffEnabled: false,
        favoriteHalftimeEnabled: false,
        favoriteFulltimeEnabled: false,
        otherTeamsAlertsEnabled: true,
        updatedAt: this._now()
      };
      settingsArr.push(settings);
      this._saveToStorage('notification_settings', settingsArr);
      return settings;
    }
    return settingsArr[0];
  }

  // Internal helper to get My Schedule items (container is implicit)
  _getOrCreateMySchedule() {
    return this._getFromStorage('my_schedule_items', []);
  }

  // Internal helper for favorites add/remove
  _updateFavoriteInternal(itemType, itemId, isFavorite) {
    let favorites = this._getFromStorage('favorites', []);
    const idx = favorites.findIndex(
      (f) => f.itemType === itemType && f.itemId === itemId
    );

    if (isFavorite) {
      if (idx === -1) {
        favorites.push({
          id: this._generateId('fav'),
          itemType: itemType,
          itemId: itemId,
          createdAt: this._now()
        });
      }
    } else {
      if (idx !== -1) {
        favorites.splice(idx, 1);
      }
    }

    this._saveToStorage('favorites', favorites);
  }

  // Utility: compute totals for a cart
  _computeCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    let totalItems = 0;
    let subtotal = 0;
    let currency = 'usd';

    cartItems.forEach((item) => {
      if (item.cartId === cartId) {
        totalItems += item.quantity || 0;
        subtotal += item.totalPrice || 0;
        if (currency === 'usd') {
          const product = products.find((p) => p.id === item.productId);
          if (product && product.currency) {
            currency = product.currency;
          }
        }
      }
    });

    return { totalItems, subtotal, currency };
  }

  // ====== Core interface implementations ======

  // getHomeHighlights(highlightTeamId?, maxItemsPerSection?)
  getHomeHighlights(highlightTeamId, maxItemsPerSection) {
    const maxItems = typeof maxItemsPerSection === 'number' && maxItemsPerSection > 0
      ? maxItemsPerSection
      : 5;

    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const matches = this._getFromStorage('matches', []);
    const forumThreads = this._getFromStorage('forum_threads', []);
    const forumCategories = this._getFromStorage('forum_categories', []);
    const fanGroups = this._getFromStorage('fan_groups', []);
    const products = this._getFromStorage('products', []);

    const notificationSettings = this._getOrCreateNotificationSettings();
    const favoriteTeamId = highlightTeamId || notificationSettings.favoriteTeamId || null;

    // Upcoming key matches
    const nowISO = this._now();
    let upcomingMatches = matches
      .filter((m) => m.status === 'not_started' && (!m.matchDate || m.matchDate >= nowISO))
      .map((m) => {
        const homeTeam = teams.find((t) => t.id === m.homeTeamId) || null;
        const awayTeam = teams.find((t) => t.id === m.awayTeamId) || null;
        const competition = competitions.find((c) => c.id === m.competitionId) || null;
        const isFavMatch = !!(
          favoriteTeamId && (m.homeTeamId === favoriteTeamId || m.awayTeamId === favoriteTeamId)
        );
        const isFavHome = !!(
          favoriteTeamId && m.homeTeamId === favoriteTeamId
        );
        return {
          matchId: m.id,
          matchDate: m.matchDate,
          status: m.status,
          competitionName: competition ? competition.name : '',
          competitionType: competition ? competition.type : null,
          homeTeamName: homeTeam ? homeTeam.name : '',
          awayTeamName: awayTeam ? awayTeam.name : '',
          isFavoriteTeamMatch: isFavMatch,
          isHomeMatchForFavoriteTeam: isFavHome,
          // Foreign key resolutions
          match: m,
          competition: competition,
          homeTeam: homeTeam,
          awayTeam: awayTeam
        };
      });

    // Prioritize favorite/highlight team matches first, then by date
    upcomingMatches.sort((a, b) => {
      if (a.isFavoriteTeamMatch && !b.isFavoriteTeamMatch) return -1;
      if (!a.isFavoriteTeamMatch && b.isFavoriteTeamMatch) return 1;
      if (a.matchDate && b.matchDate) {
        return a.matchDate.localeCompare(b.matchDate);
      }
      return 0;
    });

    upcomingMatches = upcomingMatches.slice(0, maxItems);

    // Popular threads (by likeCount, then replyCount, then last activity)
    const popularThreads = forumThreads
      .map((t) => {
        const category = forumCategories.find((c) => c.id === t.categoryId) || null;
        const lastActivityAt = t.updatedAt || t.createdAt;
        return {
          threadId: t.id,
          title: t.title,
          categoryName: category ? category.name : '',
          replyCount: t.replyCount || 0,
          likeCount: t.likeCount || 0,
          lastActivityAt: lastActivityAt,
          // Foreign key resolutions
          thread: t,
          category: category
        };
      })
      .sort((a, b) => {
        if ((b.likeCount || 0) !== (a.likeCount || 0)) {
          return (b.likeCount || 0) - (a.likeCount || 0);
        }
        if ((b.replyCount || 0) !== (a.replyCount || 0)) {
          return (b.replyCount || 0) - (a.replyCount || 0);
        }
        if (a.lastActivityAt && b.lastActivityAt) {
          return b.lastActivityAt.localeCompare(a.lastActivityAt);
        }
        return 0;
      })
      .slice(0, maxItems);

    // Popular fan groups (by postsThisWeek)
    const popularFanGroups = fanGroups
      .map((g) => {
        const team = teams.find((t) => t.id === g.teamId) || null;
        return {
          fanGroupId: g.id,
          name: g.name,
          teamName: team ? team.name : '',
          memberCount: g.memberCount || 0,
          postsThisWeek: g.postsThisWeek || 0,
          // Foreign key resolutions
          fanGroup: g,
          team: team
        };
      })
      .sort((a, b) => (b.postsThisWeek || 0) - (a.postsThisWeek || 0))
      .slice(0, maxItems);

    // Shop promotions (prefer free shipping, recent first)
    const shopPromotions = products
      .map((p) => {
        const team = teams.find((t) => t.id === p.teamId) || null;
        return {
          productId: p.id,
          productName: p.name,
          teamName: team ? team.name : '',
          price: p.price,
          currency: p.currency,
          hasFreeShipping: !!p.hasFreeShipping,
          imageUrl: p.imageUrl || '',
          // Foreign key resolutions
          product: p,
          team: team
        };
      })
      .sort((a, b) => {
        // Free shipping first
        if (a.hasFreeShipping && !b.hasFreeShipping) return -1;
        if (!a.hasFreeShipping && b.hasFreeShipping) return 1;
        // Newest first if createdAt exists
        const prodA = a.product;
        const prodB = b.product;
        if (prodA && prodB && prodA.createdAt && prodB.createdAt) {
          return prodB.createdAt.localeCompare(prodA.createdAt);
        }
        return 0;
      })
      .slice(0, maxItems);

    return {
      upcomingKeyMatches: upcomingMatches,
      popularThreads: popularThreads,
      popularFanGroups: popularFanGroups,
      shopPromotions: shopPromotions
    };
  }

  // getMatchScheduleFilterOptions()
  getMatchScheduleFilterOptions() {
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);

    const statuses = [
      { value: 'not_started', label: 'Not started' },
      { value: 'live', label: 'Live' },
      { value: 'finished', label: 'Finished' },
      { value: 'postponed', label: 'Postponed' },
      { value: 'cancelled', label: 'Cancelled' }
    ];

    const matchTypes = [
      { value: 'all', label: 'All' },
      { value: 'home', label: 'Home' },
      { value: 'away', label: 'Away' }
    ];

    return {
      teams: teams,
      competitions: competitions,
      statuses: statuses,
      matchTypes: matchTypes
    };
  }

  // getMatches(teamId?, competitionTypes?, competitionId?, matchType?, status?, dateFrom?, dateTo?, searchText?, sortBy?, limit?, offset?)
  getMatches(
    teamId,
    competitionTypes,
    competitionId,
    matchType,
    status,
    dateFrom,
    dateTo,
    searchText,
    sortBy,
    limit,
    offset
  ) {
    const matches = this._getFromStorage('matches', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const venues = this._getFromStorage('venues', []);
    const myScheduleItems = this._getFromStorage('my_schedule_items', []);

    const compTypesArray = this._ensureArray(competitionTypes).filter(Boolean);
    const searchLower = this._toLowerSafe(searchText);

    let filtered = matches.filter((m) => {
      // team filter
      if (teamId) {
        if (m.homeTeamId !== teamId && m.awayTeamId !== teamId) return false;
      }

      // competitionTypes filter
      if (compTypesArray.length > 0) {
        const comp = competitions.find((c) => c.id === m.competitionId);
        if (!comp || !compTypesArray.includes(comp.type)) return false;
      }

      // competitionId filter
      if (competitionId && m.competitionId !== competitionId) return false;

      // matchType filter (relative to teamId)
      if (matchType && matchType !== 'all') {
        if (!teamId) {
          // If matchType specified but no teamId, we cannot apply; treat as no-op
        } else if (matchType === 'home') {
          if (m.homeTeamId !== teamId) return false;
        } else if (matchType === 'away') {
          if (m.awayTeamId !== teamId) return false;
        }
      }

      // status filter
      if (status && m.status !== status) return false;

      // date range filter using date parts
      const datePart = this._datePart(m.matchDate);
      if (dateFrom && datePart && datePart < dateFrom) return false;
      if (dateTo && datePart && datePart > dateTo) return false;

      // search text filter
      if (searchLower) {
        const homeTeam = teams.find((t) => t.id === m.homeTeamId);
        const awayTeam = teams.find((t) => t.id === m.awayTeamId);
        const comp = competitions.find((c) => c.id === m.competitionId);
        const haystack = this._toLowerSafe(
          [
            homeTeam ? homeTeam.name : '',
            'vs',
            awayTeam ? awayTeam.name : '',
            comp ? comp.name : '',
            m.matchDate || ''
          ].join(' ')
        );
        if (!haystack.includes(searchLower)) return false;
      }

      return true;
    });

    // sort
    const sortKey = sortBy || 'date_asc';
    filtered.sort((a, b) => {
      const da = a.matchDate || '';
      const db = b.matchDate || '';
      if (sortKey === 'date_desc') {
        return db.localeCompare(da);
      }
      // default: date_asc
      return da.localeCompare(db);
    });

    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : filtered.length;
    const sliced = filtered.slice(off, off + lim);

    const result = sliced.map((m) => {
      const homeTeam = teams.find((t) => t.id === m.homeTeamId) || null;
      const awayTeam = teams.find((t) => t.id === m.awayTeamId) || null;
      const competition = competitions.find((c) => c.id === m.competitionId) || null;
      const venue = venues.find((v) => v.id === m.venueId) || null;
      const myItem = myScheduleItems.find((i) => i.matchId === m.id) || null;

      return {
        matchId: m.id,
        matchDate: m.matchDate,
        status: m.status,
        competitionId: m.competitionId || null,
        competitionName: competition ? competition.name : '',
        competitionType: competition ? competition.type : null,
        homeTeamId: m.homeTeamId,
        homeTeamName: homeTeam ? homeTeam.name : '',
        awayTeamId: m.awayTeamId,
        awayTeamName: awayTeam ? awayTeam.name : '',
        venueId: m.venueId || null,
        venueName: venue ? venue.name : '',
        predictionsEnabled: !!m.predictionsEnabled,
        isInMySchedule: !!myItem,
        // Foreign key resolutions
        match: m,
        competition: competition,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        venue: venue,
        myScheduleItem: myItem
      };
    });

    return result;
  }

  // getMatchDetail(matchId)
  getMatchDetail(matchId) {
    const matches = this._getFromStorage('matches', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const venues = this._getFromStorage('venues', []);
    const myScheduleItems = this._getFromStorage('my_schedule_items', []);
    const predictions = this._getFromStorage('predictions', []);

    const match = matches.find((m) => m.id === matchId) || null;
    if (!match) {
      return {
        match: null,
        homeTeam: null,
        awayTeam: null,
        competition: null,
        venue: null,
        isInMySchedule: false,
        predictionsEnabled: false,
        relatedForumThreads: [],
        hasUserPrediction: false
      };
    }

    const homeTeam = teams.find((t) => t.id === match.homeTeamId) || null;
    const awayTeam = teams.find((t) => t.id === match.awayTeamId) || null;
    const competition = competitions.find((c) => c.id === match.competitionId) || null;
    const venue = venues.find((v) => v.id === match.venueId) || null;
    const isInMySchedule = !!myScheduleItems.find((i) => i.matchId === match.id);
    const hasUserPrediction = !!predictions.find((p) => p.matchId === match.id);

    // Heuristic: related threads whose titles mention both teams
    const forumThreads = this._getFromStorage('forum_threads', []);
    const forumCategories = this._getFromStorage('forum_categories', []);
    const homeNameLower = this._toLowerSafe(homeTeam ? homeTeam.name : '');
    const awayNameLower = this._toLowerSafe(awayTeam ? awayTeam.name : '');

    const relatedForumThreads = forumThreads
      .filter((t) => {
        const titleLower = this._toLowerSafe(t.title);
        return titleLower.includes(homeNameLower) && titleLower.includes(awayNameLower);
      })
      .map((t) => {
        const category = forumCategories.find((c) => c.id === t.categoryId) || null;
        const lastActivityAt = t.updatedAt || t.createdAt;
        return {
          threadId: t.id,
          title: t.title,
          categoryName: category ? category.name : '',
          replyCount: t.replyCount || 0,
          likeCount: t.likeCount || 0,
          lastActivityAt: lastActivityAt,
          // Foreign key resolutions
          thread: t,
          category: category
        };
      });

    return {
      match: match,
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      competition: competition,
      venue: venue,
      isInMySchedule: isInMySchedule,
      predictionsEnabled: !!match.predictionsEnabled,
      relatedForumThreads: relatedForumThreads,
      hasUserPrediction: hasUserPrediction
    };
  }

  // getMatchWatchParties(matchId, minAttendees?, sortBy?)
  getMatchWatchParties(matchId, minAttendees, sortBy) {
    const watchParties = this._getFromStorage('watch_parties', []);
    const watchPartyRsvps = this._getFromStorage('watch_party_rsvps', []);
    const matches = this._getFromStorage('matches', []);

    const minAtt = typeof minAttendees === 'number' ? minAttendees : 0;
    const sortKey = sortBy || 'start_time_asc';

    const match = matches.find((m) => m.id === matchId) || null;

    let filtered = watchParties.filter(
      (wp) => wp.matchId === matchId && (wp.attendeeCount || 0) >= minAtt
    );

    filtered.sort((a, b) => {
      if (sortKey === 'start_time_desc') {
        return (b.startTime || '').localeCompare(a.startTime || '');
      }
      if (sortKey === 'attendees_desc') {
        return (b.attendeeCount || 0) - (a.attendeeCount || 0);
      }
      // default: start_time_asc
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return filtered.map((wp) => {
      const rsvp = watchPartyRsvps
        .filter((r) => r.watchPartyId === wp.id)
        .sort((r1, r2) => (r2.updatedAt || r2.createdAt || '').localeCompare(r1.updatedAt || r1.createdAt || ''))[0] || null;

      return {
        watchPartyId: wp.id,
        title: wp.title,
        description: wp.description || '',
        startTime: wp.startTime,
        endTime: wp.endTime || null,
        locationType: wp.locationType,
        locationName: wp.locationName || '',
        address: wp.address || '',
        attendeeCount: wp.attendeeCount || 0,
        capacity: wp.capacity || null,
        userRsvpStatus: rsvp ? rsvp.status : null,
        // Foreign key resolutions
        watchParty: wp,
        match: match
      };
    });
  }

  // joinWatchParty(watchPartyId, status?)
  joinWatchParty(watchPartyId, status) {
    const desiredStatus = status || 'joined'; // 'joined', 'interested', 'cancelled'
    let watchParties = this._getFromStorage('watch_parties', []);
    let rsvps = this._getFromStorage('watch_party_rsvps', []);

    const wp = watchParties.find((w) => w.id === watchPartyId) || null;
    if (!wp) {
      return {
        success: false,
        watchPartyId: watchPartyId,
        userRsvpStatus: null,
        attendeeCount: 0,
        message: 'Watch party not found.'
      };
    }

    let rsvp = rsvps
      .filter((r) => r.watchPartyId === watchPartyId)
      .sort((r1, r2) => (r2.updatedAt || r2.createdAt || '').localeCompare(r1.updatedAt || r1.createdAt || ''))[0] || null;

    const now = this._now();

    if (!rsvp) {
      rsvp = {
        id: this._generateId('wprsvp'),
        watchPartyId: watchPartyId,
        status: desiredStatus,
        createdAt: now,
        updatedAt: now
      };
      rsvps.push(rsvp);
      if (desiredStatus === 'joined') {
        wp.attendeeCount = (wp.attendeeCount || 0) + 1;
      }
    } else {
      // adjust attendee counts if moving to/from 'joined'
      const prevStatus = rsvp.status;
      rsvp.status = desiredStatus;
      rsvp.updatedAt = now;
      if (prevStatus !== 'joined' && desiredStatus === 'joined') {
        wp.attendeeCount = (wp.attendeeCount || 0) + 1;
      } else if (prevStatus === 'joined' && desiredStatus !== 'joined') {
        wp.attendeeCount = Math.max(0, (wp.attendeeCount || 0) - 1);
      }
    }

    this._saveToStorage('watch_party_rsvps', rsvps);
    this._saveToStorage('watch_parties', watchParties);

    return {
      success: true,
      watchPartyId: watchPartyId,
      userRsvpStatus: desiredStatus,
      attendeeCount: wp.attendeeCount || 0,
      message: 'RSVP updated.'
    };
  }

  // addMatchToSchedule(matchId, source?)
  addMatchToSchedule(matchId, source) {
    let myScheduleItems = this._getFromStorage('my_schedule_items', []);
    const existing = myScheduleItems.find((i) => i.matchId === matchId) || null;
    if (existing) {
      return {
        success: true,
        matchId: matchId,
        isInMySchedule: true,
        myScheduleItemId: existing.id,
        message: 'Match already in schedule.'
      };
    }

    const item = {
      id: this._generateId('mysched'),
      matchId: matchId,
      source: source || 'other',
      addedAt: this._now()
    };
    myScheduleItems.push(item);
    this._saveToStorage('my_schedule_items', myScheduleItems);

    return {
      success: true,
      matchId: matchId,
      isInMySchedule: true,
      myScheduleItemId: item.id,
      message: 'Match added to schedule.'
    };
  }

  // removeMatchFromSchedule(matchId)
  removeMatchFromSchedule(matchId) {
    let myScheduleItems = this._getFromStorage('my_schedule_items', []);
    const initialLength = myScheduleItems.length;
    myScheduleItems = myScheduleItems.filter((i) => i.matchId !== matchId);
    const removed = myScheduleItems.length !== initialLength;
    this._saveToStorage('my_schedule_items', myScheduleItems);

    return {
      success: removed,
      matchId: matchId,
      message: removed ? 'Match removed from schedule.' : 'Match was not in schedule.'
    };
  }

  // searchFanGroups(query?, teamId?, sortBy?, limit?, offset?)
  searchFanGroups(query, teamId, sortBy, limit, offset) {
    const fanGroups = this._getFromStorage('fan_groups', []);
    const teams = this._getFromStorage('teams', []);

    const qLower = this._toLowerSafe(query);
    const sortKey = sortBy || 'most_active';

    let filtered = fanGroups.filter((g) => {
      if (qLower) {
        if (!this._toLowerSafe(g.name).includes(qLower)) return false;
      }
      if (teamId && g.teamId !== teamId) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortKey === 'most_members') {
        return (b.memberCount || 0) - (a.memberCount || 0);
      }
      if (sortKey === 'newest') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      // default: most_active
      return (b.postsThisWeek || 0) - (a.postsThisWeek || 0);
    });

    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : filtered.length;
    const sliced = filtered.slice(off, off + lim);

    return sliced.map((g) => {
      const team = teams.find((t) => t.id === g.teamId) || null;
      return {
        fanGroupId: g.id,
        name: g.name,
        teamId: g.teamId || null,
        teamName: team ? team.name : '',
        description: g.description || '',
        memberCount: g.memberCount || 0,
        postsThisWeek: g.postsThisWeek || 0,
        totalPosts: g.totalPosts || 0,
        createdAt: g.createdAt || null,
        // Foreign key resolutions
        fanGroup: g,
        team: team
      };
    });
  }

  // getFanGroupDetail(fanGroupId)
  getFanGroupDetail(fanGroupId) {
    const fanGroups = this._getFromStorage('fan_groups', []);
    const memberships = this._getFromStorage('fan_group_memberships', []);
    const teams = this._getFromStorage('teams', []);
    const forumThreads = this._getFromStorage('forum_threads', []);

    const group = fanGroups.find((g) => g.id === fanGroupId) || null;
    if (!group) {
      return {
        fanGroup: null,
        userMembership: { isMember: false, notificationLevel: 'none', joinedAt: null },
        recentActivity: []
      };
    }

    const team = teams.find((t) => t.id === group.teamId) || null;
    const membership = memberships.find((m) => m.fanGroupId === fanGroupId) || null;

    // Heuristic: threads that mention group name in title
    const nameLower = this._toLowerSafe(group.name);
    const recentActivity = forumThreads
      .filter((t) => this._toLowerSafe(t.title).includes(nameLower))
      .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))
      .slice(0, 10)
      .map((t) => ({
        threadId: t.id,
        title: t.title,
        lastActivityAt: t.updatedAt || t.createdAt
      }));

    return {
      fanGroup: {
        fanGroupId: group.id,
        name: group.name,
        teamId: group.teamId || null,
        teamName: team ? team.name : '',
        description: group.description || '',
        memberCount: group.memberCount || 0,
        postsThisWeek: group.postsThisWeek || 0,
        totalPosts: group.totalPosts || 0,
        createdAt: group.createdAt || null,
        // Foreign key resolution
        team: team
      },
      userMembership: {
        isMember: !!membership,
        notificationLevel: membership ? membership.notificationLevel : 'none',
        joinedAt: membership ? membership.joinedAt : null
      },
      recentActivity: recentActivity
    };
  }

  // joinFanGroup(fanGroupId, notificationLevel?)
  joinFanGroup(fanGroupId, notificationLevel) {
    const level = notificationLevel || 'highlights_only';
    let memberships = this._getFromStorage('fan_group_memberships', []);
    let fanGroups = this._getFromStorage('fan_groups', []);

    const group = fanGroups.find((g) => g.id === fanGroupId) || null;
    if (!group) {
      return {
        success: false,
        fanGroupId: fanGroupId,
        notificationLevel: 'none',
        joinedAt: null,
        message: 'Fan group not found.'
      };
    }

    let membership = memberships.find((m) => m.fanGroupId === fanGroupId) || null;
    const now = this._now();

    if (!membership) {
      membership = {
        id: this._generateId('fgm'),
        fanGroupId: fanGroupId,
        notificationLevel: level,
        joinedAt: now
      };
      memberships.push(membership);
      group.memberCount = (group.memberCount || 0) + 1;
    } else {
      membership.notificationLevel = level;
    }

    this._saveToStorage('fan_group_memberships', memberships);
    this._saveToStorage('fan_groups', fanGroups);

    return {
      success: true,
      fanGroupId: fanGroupId,
      notificationLevel: level,
      joinedAt: membership.joinedAt,
      message: 'Joined fan group.'
    };
  }

  // updateFanGroupNotificationSettings(fanGroupId, notificationLevel)
  updateFanGroupNotificationSettings(fanGroupId, notificationLevel) {
    let memberships = this._getFromStorage('fan_group_memberships', []);
    const membership = memberships.find((m) => m.fanGroupId === fanGroupId) || null;
    if (!membership) {
      return {
        success: false,
        fanGroupId: fanGroupId,
        notificationLevel: 'none',
        message: 'Not a member of this fan group.'
      };
    }

    membership.notificationLevel = notificationLevel;
    this._saveToStorage('fan_group_memberships', memberships);

    return {
      success: true,
      fanGroupId: fanGroupId,
      notificationLevel: notificationLevel,
      message: 'Notification settings updated.'
    };
  }

  // leaveFanGroup(fanGroupId)
  leaveFanGroup(fanGroupId) {
    let memberships = this._getFromStorage('fan_group_memberships', []);
    let fanGroups = this._getFromStorage('fan_groups', []);
    const initialLength = memberships.length;
    memberships = memberships.filter((m) => m.fanGroupId !== fanGroupId);
    const left = memberships.length !== initialLength;

    if (left) {
      const group = fanGroups.find((g) => g.id === fanGroupId) || null;
      if (group) {
        group.memberCount = Math.max(0, (group.memberCount || 0) - 1);
        this._saveToStorage('fan_groups', fanGroups);
      }
      this._saveToStorage('fan_group_memberships', memberships);
    }

    return {
      success: left,
      fanGroupId: fanGroupId,
      message: left ? 'Left fan group.' : 'Not a member of this fan group.'
    };
  }

  // getForumCategories()
  getForumCategories() {
    const categories = this._getFromStorage('forum_categories', []);
    const threads = this._getFromStorage('forum_threads', []);

    return categories.map((c) => {
      const threadCount = threads.filter((t) => t.categoryId === c.id).length;
      return {
        categoryId: c.id,
        name: c.name,
        slug: c.slug || '',
        description: c.description || '',
        position: typeof c.position === 'number' ? c.position : null,
        threadCount: threadCount,
        // Foreign key resolution self (for consistency)
        category: c
      };
    });
  }

  // getForumCategoryThreads(categoryId, sortBy?, searchText?, limit?, offset?)
  getForumCategoryThreads(categoryId, sortBy, searchText, limit, offset) {
    const threads = this._getFromStorage('forum_threads', []);
    const categories = this._getFromStorage('forum_categories', []);
    const subscriptions = this._getFromStorage('thread_subscriptions', []);

    const category = categories.find((c) => c.id === categoryId) || null;
    const qLower = this._toLowerSafe(searchText);
    const sortKey = sortBy || 'most_recent';

    let filtered = threads.filter((t) => {
      if (t.categoryId !== categoryId) return false;
      if (qLower) {
        const haystack = this._toLowerSafe(t.title + ' ' + t.body);
        if (!haystack.includes(qLower)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortKey === 'most_replied') {
        return (b.replyCount || 0) - (a.replyCount || 0);
      }
      if (sortKey === 'most_liked') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      // default: most_recent by lastActivityAt
      const la = a.updatedAt || a.createdAt || '';
      const lb = b.updatedAt || b.createdAt || '';
      return lb.localeCompare(la);
    });

    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : filtered.length;
    const sliced = filtered.slice(off, off + lim);

    return sliced.map((t) => {
      const cat = category || categories.find((c) => c.id === t.categoryId) || null;
      const lastActivityAt = t.updatedAt || t.createdAt;
      const subscription = subscriptions.find((s) => s.threadId === t.id) || null;

      return {
        threadId: t.id,
        title: t.title,
        bodyPreview: (t.body || '').slice(0, 200),
        categoryId: t.categoryId,
        categoryName: cat ? cat.name : '',
        competition: t.competition || null,
        createdAt: t.createdAt,
        replyCount: t.replyCount || 0,
        viewCount: t.viewCount || 0,
        likeCount: t.likeCount || 0,
        hasPoll: !!t.hasPoll,
        lastActivityAt: lastActivityAt,
        isSubscribed: subscription ? !!subscription.subscribed : false,
        // Foreign key resolutions
        thread: t,
        category: cat
      };
    });
  }

  // searchForumThreads(query, limit?, offset?)
  searchForumThreads(query, limit, offset) {
    const threads = this._getFromStorage('forum_threads', []);
    const categories = this._getFromStorage('forum_categories', []);

    const qLower = this._toLowerSafe(query);

    let filtered = threads.filter((t) => {
      const haystack = this._toLowerSafe(t.title + ' ' + t.body);
      return haystack.includes(qLower);
    });

    filtered.sort((a, b) => {
      const la = a.updatedAt || a.createdAt || '';
      const lb = b.updatedAt || b.createdAt || '';
      return lb.localeCompare(la);
    });

    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : filtered.length;
    const sliced = filtered.slice(off, off + lim);

    return sliced.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId) || null;
      const lastActivityAt = t.updatedAt || t.createdAt;
      return {
        threadId: t.id,
        title: t.title,
        categoryId: t.categoryId,
        categoryName: cat ? cat.name : '',
        createdAt: t.createdAt,
        replyCount: t.replyCount || 0,
        likeCount: t.likeCount || 0,
        lastActivityAt: lastActivityAt,
        // Foreign key resolutions
        thread: t,
        category: cat
      };
    });
  }

  // getForumThread(threadId)
  getForumThread(threadId) {
    const threads = this._getFromStorage('forum_threads', []);
    const categories = this._getFromStorage('forum_categories', []);
    const threadTags = this._getFromStorage('thread_tags', []);
    const tags = this._getFromStorage('tags', []);
    const polls = this._getFromStorage('polls', []);
    const pollOptions = this._getFromStorage('poll_options', []);
    const subscriptions = this._getFromStorage('thread_subscriptions', []);

    const t = threads.find((th) => th.id === threadId) || null;
    if (!t) {
      return {
        thread: null,
        tags: [],
        poll: null
      };
    }

    const category = categories.find((c) => c.id === t.categoryId) || null;
    const subscription = subscriptions.find((s) => s.threadId === threadId) || null;

    const resultThread = {
      threadId: t.id,
      categoryId: t.categoryId,
      categoryName: category ? category.name : '',
      title: t.title,
      body: t.body,
      competition: t.competition || null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt || t.createdAt,
      replyCount: t.replyCount || 0,
      viewCount: t.viewCount || 0,
      likeCount: t.likeCount || 0,
      hasPoll: !!t.hasPoll,
      isSubscribed: subscription ? !!subscription.subscribed : false,
      // Foreign key resolutions
      category: category
    };

    const tagLinks = threadTags.filter((tt) => tt.threadId === threadId);
    const resultTags = tagLinks.map((tt) => {
      const tag = tags.find((tg) => tg.id === tt.tagId) || null;
      return {
        tagId: tag ? tag.id : tt.tagId,
        name: tag ? tag.name : '',
        // Foreign key resolution
        tag: tag
      };
    });

    const poll = polls.find((p) => p.threadId === threadId) || null;
    let resultPoll = null;
    if (poll) {
      const options = pollOptions.filter((o) => o.pollId === poll.id);
      const totalVotes = options.reduce((sum, o) => sum + (o.voteCount || 0), 0);
      const resultOptions = options.map((o) => ({
        optionId: o.id,
        text: o.text,
        voteCount: o.voteCount || 0,
        votePercentage: totalVotes > 0 ? (o.voteCount || 0) * 100 / totalVotes : 0,
        userHasVotedForOption: false,
        // Foreign key resolution
        pollOption: o
      }));

      resultPoll = {
        pollId: poll.id,
        question: poll.question,
        allowMultiple: !!poll.allowMultiple,
        createdAt: poll.createdAt,
        closesAt: poll.closesAt || null,
        totalVotes: totalVotes,
        options: resultOptions,
        // Foreign key resolution
        poll: poll
      };
    }

    return {
      thread: resultThread,
      tags: resultTags,
      poll: resultPoll
    };
  }

  // getThreadComments(threadId, sortBy?, limit?, offset?)
  getThreadComments(threadId, sortBy, limit, offset) {
    const comments = this._getFromStorage('forum_comments', []);
    const likes = this._getFromStorage('comment_likes', []);
    const threads = this._getFromStorage('forum_threads', []);

    const thread = threads.find((t) => t.id === threadId) || null;
    const sortKey = sortBy || 'newest';

    let filtered = comments.filter((c) => c.threadId === threadId);

    filtered.sort((a, b) => {
      if (sortKey === 'most_liked') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      if (sortKey === 'oldest') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      // default: newest
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : filtered.length;
    const sliced = filtered.slice(off, off + lim);

    return sliced.map((c) => {
      const isLiked = !!likes.find((l) => l.commentId === c.id);
      const parent = c.parentCommentId
        ? comments.find((pc) => pc.id === c.parentCommentId) || null
        : null;
      return {
        commentId: c.id,
        threadId: c.threadId,
        parentCommentId: c.parentCommentId || null,
        body: c.body,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt || c.createdAt,
        likeCount: c.likeCount || 0,
        isLikedByUser: isLiked,
        // Foreign key resolutions
        thread: thread,
        parentComment: parent
      };
    });
  }

  // likeComment(commentId, like?)
  likeComment(commentId, like) {
    const doLike = typeof like === 'boolean' ? like : true;
    let comments = this._getFromStorage('forum_comments', []);
    let likes = this._getFromStorage('comment_likes', []);

    const comment = comments.find((c) => c.id === commentId) || null;
    if (!comment) {
      return {
        success: false,
        commentId: commentId,
        isLikedByUser: false,
        likeCount: 0,
        message: 'Comment not found.'
      };
    }

    const existingIdx = likes.findIndex((l) => l.commentId === commentId);

    if (doLike) {
      if (existingIdx === -1) {
        likes.push({
          id: this._generateId('clike'),
          commentId: commentId,
          createdAt: this._now()
        });
        comment.likeCount = (comment.likeCount || 0) + 1;
      }
    } else {
      if (existingIdx !== -1) {
        likes.splice(existingIdx, 1);
        comment.likeCount = Math.max(0, (comment.likeCount || 0) - 1);
      }
    }

    this._saveToStorage('comment_likes', likes);
    this._saveToStorage('forum_comments', comments);

    return {
      success: true,
      commentId: commentId,
      isLikedByUser: doLike && likes.some((l) => l.commentId === commentId),
      likeCount: comment.likeCount || 0,
      message: doLike ? 'Comment liked.' : 'Comment unliked.'
    };
  }

  // createForumThread(categoryId, title, body, competition?, tagIds?, poll?, subscribe?)
  createForumThread(categoryId, title, body, competition, tagIds, poll, subscribe) {
    const threads = this._getFromStorage('forum_threads', []);
    const categories = this._getFromStorage('forum_categories', []);
    let threadTags = this._getFromStorage('thread_tags', []);
    const tags = this._getFromStorage('tags', []);
    let polls = this._getFromStorage('polls', []);
    let pollOptions = this._getFromStorage('poll_options', []);
    let subscriptions = this._getFromStorage('thread_subscriptions', []);

    const category = categories.find((c) => c.id === categoryId) || null;
    if (!category) {
      return {
        success: false,
        threadId: null,
        message: 'Category not found.',
        isSubscribed: false
      };
    }

    if (!title || !body) {
      return {
        success: false,
        threadId: null,
        message: 'Title and body are required.',
        isSubscribed: false
      };
    }

    const now = this._now();
    const threadId = this._generateId('thread');

    const thread = {
      id: threadId,
      categoryId: categoryId,
      title: title,
      body: body,
      competition: competition || null,
      createdAt: now,
      updatedAt: now,
      replyCount: 0,
      viewCount: 0,
      likeCount: 0,
      hasPoll: !!poll
    };

    threads.push(thread);

    // Tags
    const ids = this._ensureArray(tagIds).filter(Boolean);
    ids.forEach((tagId) => {
      const tagExists = tags.find((tg) => tg.id === tagId);
      if (tagExists) {
        threadTags.push({
          id: this._generateId('threadtag'),
          threadId: threadId,
          tagId: tagId
        });
      }
    });

    // Poll
    if (poll && poll.question && Array.isArray(poll.options) && poll.options.length > 0) {
      const pollId = this._generateId('poll');
      const newPoll = {
        id: pollId,
        threadId: threadId,
        question: poll.question,
        allowMultiple: !!poll.allowMultiple,
        createdAt: now,
        closesAt: null
      };
      polls.push(newPoll);

      poll.options.forEach((optText) => {
        pollOptions.push({
          id: this._generateId('pollopt'),
          pollId: pollId,
          text: optText,
          voteCount: 0
        });
      });
    }

    // Subscription
    let isSubscribed = false;
    if (subscribe) {
      let existing = subscriptions.find((s) => s.threadId === threadId) || null;
      if (!existing) {
        existing = {
          id: this._generateId('tsub'),
          threadId: threadId,
          subscribed: true,
          createdAt: now
        };
        subscriptions.push(existing);
      } else {
        existing.subscribed = true;
      }
      isSubscribed = true;
    }

    this._saveToStorage('forum_threads', threads);
    this._saveToStorage('thread_tags', threadTags);
    this._saveToStorage('polls', polls);
    this._saveToStorage('poll_options', pollOptions);
    this._saveToStorage('thread_subscriptions', subscriptions);

    return {
      success: true,
      threadId: threadId,
      message: 'Thread created successfully.',
      isSubscribed: isSubscribed
    };
  }

  // getTagSuggestions(query, limit?)
  getTagSuggestions(query, limit) {
    const tags = this._getFromStorage('tags', []);
    const qLower = this._toLowerSafe(query);

    let filtered = tags.filter((t) => this._toLowerSafe(t.name).includes(qLower));
    const lim = typeof limit === 'number' && limit > 0 ? limit : filtered.length;
    return filtered.slice(0, lim);
  }

  // updateThreadSubscription(threadId, subscribed)
  updateThreadSubscription(threadId, subscribed) {
    let subscriptions = this._getFromStorage('thread_subscriptions', []);
    let subscription = subscriptions.find((s) => s.threadId === threadId) || null;

    if (!subscription) {
      subscription = {
        id: this._generateId('tsub'),
        threadId: threadId,
        subscribed: !!subscribed,
        createdAt: this._now()
      };
      subscriptions.push(subscription);
    } else {
      subscription.subscribed = !!subscribed;
    }

    this._saveToStorage('thread_subscriptions', subscriptions);

    return {
      success: true,
      threadId: threadId,
      subscribed: !!subscribed,
      message: subscribed ? 'Subscribed to thread.' : 'Unsubscribed from thread.'
    };
  }

  // postCommentOnThread(threadId, parentCommentId?, body)
  postCommentOnThread(threadId, parentCommentId, body) {
    if (!body) {
      return {
        success: false,
        comment: null,
        message: 'Comment body is required.'
      };
    }

    const threads = this._getFromStorage('forum_threads', []);
    let comments = this._getFromStorage('forum_comments', []);

    const thread = threads.find((t) => t.id === threadId) || null;
    if (!thread) {
      return {
        success: false,
        comment: null,
        message: 'Thread not found.'
      };
    }

    const now = this._now();
    const commentId = this._generateId('comment');
    const comment = {
      id: commentId,
      threadId: threadId,
      parentCommentId: parentCommentId || null,
      body: body,
      createdAt: now,
      updatedAt: now,
      likeCount: 0
    };

    comments.push(comment);
    thread.replyCount = (thread.replyCount || 0) + 1;
    thread.updatedAt = now;

    this._saveToStorage('forum_comments', comments);
    this._saveToStorage('forum_threads', threads);

    return {
      success: true,
      comment: {
        commentId: comment.id,
        threadId: comment.threadId,
        parentCommentId: comment.parentCommentId,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        likeCount: comment.likeCount,
        isLikedByUser: false
      },
      message: 'Comment posted.'
    };
  }

  // getShopFilterOptions()
  getShopFilterOptions() {
    const teams = this._getFromStorage('teams', []);
    const categories = this._getFromStorage('product_categories', []);

    const sizes = [
      { value: 'xs', label: 'XS' },
      { value: 's', label: 'S' },
      { value: 'm', label: 'M' },
      { value: 'l', label: 'L' },
      { value: 'xl', label: 'XL' }
    ];

    const shippingOptions = [
      { value: 'free_shipping', label: 'Free shipping' },
      { value: 'standard', label: 'Standard' }
    ];

    return {
      teams: teams,
      categories: categories,
      sizes: sizes,
      shippingOptions: shippingOptions
    };
  }

  // searchProducts(teamId?, categoryId?, maxPrice?, size?, hasFreeShipping?, isHomeJersey?, sortBy?, limit?, offset?)
  searchProducts(
    teamId,
    categoryId,
    maxPrice,
    size,
    hasFreeShipping,
    isHomeJersey,
    sortBy,
    limit,
    offset
  ) {
    const products = this._getFromStorage('products', []);
    const teams = this._getFromStorage('teams', []);
    const categories = this._getFromStorage('product_categories', []);

    const sizeLower = this._toLowerSafe(size);
    const sortKey = sortBy || 'price_low_to_high';

    let filtered = products.filter((p) => {
      if (teamId && p.teamId !== teamId) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (typeof maxPrice === 'number' && p.price > maxPrice) return false;
      if (sizeLower) {
        const options = Array.isArray(p.sizeOptions) ? p.sizeOptions : [];
        const hasSize = options.some((s) => this._toLowerSafe(s) === sizeLower);
        if (!hasSize) return false;
      }
      if (typeof hasFreeShipping === 'boolean') {
        if (!!p.hasFreeShipping !== hasFreeShipping) return false;
      }
      if (typeof isHomeJersey === 'boolean') {
        if (!!p.isHomeJersey !== isHomeJersey) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortKey === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortKey === 'newest') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      // default: price_low_to_high
      return (a.price || 0) - (b.price || 0);
    });

    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : filtered.length;
    const sliced = filtered.slice(off, off + lim);

    return sliced.map((p) => {
      const team = teams.find((t) => t.id === p.teamId) || null;
      const cat = categories.find((c) => c.id === p.categoryId) || null;
      return {
        productId: p.id,
        name: p.name,
        description: p.description || '',
        categoryId: p.categoryId,
        categoryName: cat ? cat.name : '',
        teamId: p.teamId || null,
        teamName: team ? team.name : '',
        price: p.price,
        currency: p.currency,
        hasFreeShipping: !!p.hasFreeShipping,
        shippingPrice: p.shippingPrice || 0,
        isHomeJersey: !!p.isHomeJersey,
        sizeOptions: Array.isArray(p.sizeOptions) ? p.sizeOptions : [],
        imageUrl: p.imageUrl || '',
        // Foreign key resolutions
        product: p,
        category: cat,
        team: team
      };
    });
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const teams = this._getFromStorage('teams', []);
    const categories = this._getFromStorage('product_categories', []);

    const p = products.find((prod) => prod.id === productId) || null;
    if (!p) {
      return { product: null };
    }

    const team = teams.find((t) => t.id === p.teamId) || null;
    const cat = categories.find((c) => c.id === p.categoryId) || null;

    return {
      product: {
        productId: p.id,
        name: p.name,
        description: p.description || '',
        categoryId: p.categoryId,
        categoryName: cat ? cat.name : '',
        teamId: p.teamId || null,
        teamName: team ? team.name : '',
        price: p.price,
        currency: p.currency,
        hasFreeShipping: !!p.hasFreeShipping,
        shippingPrice: p.shippingPrice || 0,
        sizeOptions: Array.isArray(p.sizeOptions) ? p.sizeOptions : [],
        isHomeJersey: !!p.isHomeJersey,
        imageUrl: p.imageUrl || '',
        // Foreign key resolutions
        category: cat,
        team: team,
        productEntity: p
      }
    };
  }

  // addToCart(productId, quantity, selectedSize?)
  addToCart(productId, quantity, selectedSize) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    let cartItems = this._getFromStorage('cart_items', []);
    let carts = this._getFromStorage('carts', []);

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        cartId: null,
        totalItems: 0,
        subtotal: 0,
        currency: 'usd',
        message: 'Product not found.'
      };
    }

    const cart = this._getOrCreateCart();
    // refresh carts reference (might have been created)
    carts = this._getFromStorage('carts', []);

    const unitPrice = product.price;
    const sizeVal = selectedSize || null;

    let item = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.productId === productId && (ci.selectedSize || null) === sizeVal
    ) || null;

    if (!item) {
      item = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        productId: productId,
        quantity: qty,
        selectedSize: sizeVal,
        unitPrice: unitPrice,
        totalPrice: unitPrice * qty,
        addedAt: this._now()
      };
      cartItems.push(item);
    } else {
      item.quantity += qty;
      item.totalPrice = item.unitPrice * item.quantity;
    }

    // Update cart updatedAt
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].updatedAt = this._now();
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);

    const totals = this._computeCartTotals(cart.id);

    return {
      success: true,
      cartId: cart.id,
      totalItems: totals.totalItems,
      subtotal: totals.subtotal,
      currency: totals.currency || product.currency || 'usd',
      message: 'Product added to cart.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage('carts', []);
    if (carts.length === 0) {
      return {
        cartId: null,
        totalItems: 0,
        subtotal: 0,
        currency: 'usd',
        cart: null
      };
    }

    const cart = carts[0];
    const totals = this._computeCartTotals(cart.id);

    return {
      cartId: cart.id,
      totalItems: totals.totalItems,
      subtotal: totals.subtotal,
      currency: totals.currency,
      // Foreign key resolution
      cart: cart
    };
  }

  // getScorePredictionMatches(dateFrom, dateTo, status?, limit?, offset?)
  getScorePredictionMatches(dateFrom, dateTo, status, limit, offset) {
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const predictions = this._getFromStorage('predictions', []);

    const statusFilter = status || 'not_started';

    let filtered = matches.filter((m) => {
      if (!m.predictionsEnabled) return false;
      if (statusFilter && m.status !== statusFilter) return false;
      const datePart = this._datePart(m.matchDate);
      if (dateFrom && datePart && datePart < dateFrom) return false;
      if (dateTo && datePart && datePart > dateTo) return false;
      return true;
    });

    filtered.sort((a, b) => (a.matchDate || '').localeCompare(b.matchDate || ''));

    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : filtered.length;
    const sliced = filtered.slice(off, off + lim);

    return sliced.map((m) => {
      const competition = competitions.find((c) => c.id === m.competitionId) || null;
      const homeTeam = teams.find((t) => t.id === m.homeTeamId) || null;
      const awayTeam = teams.find((t) => t.id === m.awayTeamId) || null;
      const prediction = predictions.find((p) => p.matchId === m.id) || null;

      return {
        matchId: m.id,
        matchDate: m.matchDate,
        status: m.status,
        competitionName: competition ? competition.name : '',
        homeTeamName: homeTeam ? homeTeam.name : '',
        awayTeamName: awayTeam ? awayTeam.name : '',
        predictionsEnabled: !!m.predictionsEnabled,
        existingPrediction: prediction
          ? {
              predictionId: prediction.id,
              homeGoals: prediction.homeGoals,
              awayGoals: prediction.awayGoals,
              status: prediction.status
            }
          : null,
        // Foreign key resolutions
        match: m,
        competition: competition,
        homeTeam: homeTeam,
        awayTeam: awayTeam
      };
    });
  }

  // saveMatchPrediction(matchId, homeGoals, awayGoals)
  saveMatchPrediction(matchId, homeGoals, awayGoals) {
    let predictions = this._getFromStorage('predictions', []);
    const now = this._now();

    let prediction = predictions.find((p) => p.matchId === matchId) || null;
    if (!prediction) {
      prediction = {
        id: this._generateId('pred'),
        matchId: matchId,
        homeGoals: homeGoals,
        awayGoals: awayGoals,
        status: 'saved',
        createdAt: now,
        updatedAt: now
      };
      predictions.push(prediction);
    } else {
      prediction.homeGoals = homeGoals;
      prediction.awayGoals = awayGoals;
      prediction.status = 'saved';
      prediction.updatedAt = now;
    }

    this._saveToStorage('predictions', predictions);

    return {
      success: true,
      prediction: {
        predictionId: prediction.id,
        matchId: prediction.matchId,
        homeGoals: prediction.homeGoals,
        awayGoals: prediction.awayGoals,
        status: prediction.status
      },
      message: 'Prediction saved.'
    };
  }

  // submitPredictions(matchIds)
  submitPredictions(matchIds) {
    const ids = this._ensureArray(matchIds).filter(Boolean);
    let predictions = this._getFromStorage('predictions', []);
    const now = this._now();
    const updated = [];

    ids.forEach((matchId) => {
      const prediction = predictions.find((p) => p.matchId === matchId) || null;
      if (prediction) {
        prediction.status = 'submitted';
        prediction.updatedAt = now;
        updated.push({
          predictionId: prediction.id,
          matchId: prediction.matchId,
          status: prediction.status
        });
      }
    });

    this._saveToStorage('predictions', predictions);

    return {
      success: true,
      updatedPredictions: updated,
      message: 'Predictions submitted.'
    };
  }

  // searchPlayers(query?, teamId?, position?, limit?, offset?)
  searchPlayers(query, teamId, position, limit, offset) {
    const players = this._getFromStorage('players', []);
    const teams = this._getFromStorage('teams', []);

    const qLower = this._toLowerSafe(query);
    const posLower = this._toLowerSafe(position);

    let filtered = players.filter((p) => {
      if (qLower && !this._toLowerSafe(p.name).includes(qLower)) return false;
      if (teamId && p.teamId !== teamId) return false;
      if (posLower && this._toLowerSafe(p.position) !== posLower) return false;
      return true;
    });

    filtered.sort((a, b) => this._toLowerSafe(a.name).localeCompare(this._toLowerSafe(b.name)));

    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : filtered.length;
    const sliced = filtered.slice(off, off + lim);

    return sliced.map((p) => {
      const team = teams.find((t) => t.id === p.teamId) || null;
      return {
        playerId: p.id,
        name: p.name,
        position: p.position || '',
        teamId: p.teamId || null,
        teamName: team ? team.name : '',
        age: p.age,
        leagueGoalsThisSeason: p.leagueGoalsThisSeason,
        photoUrl: p.photoUrl || '',
        // Foreign key resolutions
        player: p,
        team: team
      };
    });
  }

  // getPlayerDetail(playerId)
  getPlayerDetail(playerId) {
    const players = this._getFromStorage('players', []);
    const teams = this._getFromStorage('teams', []);
    const favorites = this._getFromStorage('favorites', []);

    const p = players.find((pl) => pl.id === playerId) || null;
    if (!p) {
      return { player: null };
    }

    const team = teams.find((t) => t.id === p.teamId) || null;
    const isFavorite = !!favorites.find(
      (f) => f.itemType === 'player' && f.itemId === playerId
    );

    return {
      player: {
        playerId: p.id,
        name: p.name,
        teamId: p.teamId || null,
        teamName: team ? team.name : '',
        position: p.position || '',
        age: p.age,
        leagueGoalsThisSeason: typeof p.leagueGoalsThisSeason === 'number' ? p.leagueGoalsThisSeason : 0,
        nationality: p.nationality || '',
        photoUrl: p.photoUrl || '',
        isFavorite: isFavorite,
        // Foreign key resolution
        team: team,
        playerEntity: p
      }
    };
  }

  // updateFavoriteItem(itemType, itemId, isFavorite)
  updateFavoriteItem(itemType, itemId, isFavorite) {
    this._updateFavoriteInternal(itemType, itemId, !!isFavorite);
    return {
      success: true,
      itemType: itemType,
      itemId: itemId,
      isFavorite: !!isFavorite,
      message: isFavorite ? 'Added to favorites.' : 'Removed from favorites.'
    };
  }

  // getFavoritesOverview()
  getFavoritesOverview() {
    const favorites = this._getFromStorage('favorites', []);
    const players = this._getFromStorage('players', []);
    const teams = this._getFromStorage('teams', []);
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const fanGroups = this._getFromStorage('fan_groups', []);
    const products = this._getFromStorage('products', []);

    const playerFavs = favorites.filter((f) => f.itemType === 'player');
    const matchFavs = favorites.filter((f) => f.itemType === 'match');
    const fanGroupFavs = favorites.filter((f) => f.itemType === 'fan_group');
    const productFavs = favorites.filter((f) => f.itemType === 'product');

    const playersRes = playerFavs
      .map((f) => {
        const p = players.find((pl) => pl.id === f.itemId) || null;
        if (!p) return null;
        const team = teams.find((t) => t.id === p.teamId) || null;
        return {
          playerId: p.id,
          name: p.name,
          teamName: team ? team.name : '',
          position: p.position || '',
          age: p.age,
          leagueGoalsThisSeason: p.leagueGoalsThisSeason,
          // Foreign key resolutions
          player: p,
          team: team
        };
      })
      .filter(Boolean);

    const matchesRes = matchFavs
      .map((f) => {
        const m = matches.find((mt) => mt.id === f.itemId) || null;
        if (!m) return null;
        const comp = competitions.find((c) => c.id === m.competitionId) || null;
        const homeTeam = teams.find((t) => t.id === m.homeTeamId) || null;
        const awayTeam = teams.find((t) => t.id === m.awayTeamId) || null;
        return {
          matchId: m.id,
          matchDate: m.matchDate,
          competitionName: comp ? comp.name : '',
          homeTeamName: homeTeam ? homeTeam.name : '',
          awayTeamName: awayTeam ? awayTeam.name : '',
          // Foreign key resolutions
          match: m,
          competition: comp,
          homeTeam: homeTeam,
          awayTeam: awayTeam
        };
      })
      .filter(Boolean);

    const fanGroupsRes = fanGroupFavs
      .map((f) => {
        const g = fanGroups.find((fg) => fg.id === f.itemId) || null;
        if (!g) return null;
        const team = teams.find((t) => t.id === g.teamId) || null;
        return {
          fanGroupId: g.id,
          name: g.name,
          teamName: team ? team.name : '',
          memberCount: g.memberCount || 0,
          postsThisWeek: g.postsThisWeek || 0,
          // Foreign key resolutions
          fanGroup: g,
          team: team
        };
      })
      .filter(Boolean);

    const productsRes = productFavs
      .map((f) => {
        const p = products.find((pr) => pr.id === f.itemId) || null;
        if (!p) return null;
        const team = teams.find((t) => t.id === p.teamId) || null;
        return {
          productId: p.id,
          name: p.name,
          teamName: team ? team.name : '',
          price: p.price,
          currency: p.currency,
          // Foreign key resolutions
          product: p,
          team: team
        };
      })
      .filter(Boolean);

    return {
      players: playersRes,
      matches: matchesRes,
      fanGroups: fanGroupsRes,
      products: productsRes
    };
  }

  // getNotificationSettings()
  getNotificationSettings() {
    const settings = this._getOrCreateNotificationSettings();
    const teams = this._getFromStorage('teams', []);
    const favoriteTeam = settings.favoriteTeamId
      ? teams.find((t) => t.id === settings.favoriteTeamId) || null
      : null;

    return {
      favoriteTeamId: settings.favoriteTeamId,
      favoriteTeamName: favoriteTeam ? favoriteTeam.name : null,
      favoriteGoalsEnabled: !!settings.favoriteGoalsEnabled,
      favoriteKickoffEnabled: !!settings.favoriteKickoffEnabled,
      favoriteHalftimeEnabled: !!settings.favoriteHalftimeEnabled,
      favoriteFulltimeEnabled: !!settings.favoriteFulltimeEnabled,
      otherTeamsAlertsEnabled: !!settings.otherTeamsAlertsEnabled,
      updatedAt: settings.updatedAt || null,
      // Foreign key resolution
      favoriteTeam: favoriteTeam
    };
  }

  // updateNotificationSettings(favoriteTeamId?, favoriteGoalsEnabled, favoriteKickoffEnabled, favoriteHalftimeEnabled, favoriteFulltimeEnabled, otherTeamsAlertsEnabled)
  updateNotificationSettings(
    favoriteTeamId,
    favoriteGoalsEnabled,
    favoriteKickoffEnabled,
    favoriteHalftimeEnabled,
    favoriteFulltimeEnabled,
    otherTeamsAlertsEnabled
  ) {
    let settingsArr = this._getFromStorage('notification_settings', []);
    let settings;

    if (settingsArr.length === 0) {
      settings = {
        id: this._generateId('notif'),
        favoriteTeamId: null,
        favoriteGoalsEnabled: false,
        favoriteKickoffEnabled: false,
        favoriteHalftimeEnabled: false,
        favoriteFulltimeEnabled: false,
        otherTeamsAlertsEnabled: true,
        updatedAt: this._now()
      };
      settingsArr.push(settings);
    } else {
      settings = settingsArr[0];
    }

    if (favoriteTeamId !== undefined) {
      settings.favoriteTeamId = favoriteTeamId;
    }
    settings.favoriteGoalsEnabled = !!favoriteGoalsEnabled;
    settings.favoriteKickoffEnabled = !!favoriteKickoffEnabled;
    settings.favoriteHalftimeEnabled = !!favoriteHalftimeEnabled;
    settings.favoriteFulltimeEnabled = !!favoriteFulltimeEnabled;
    settings.otherTeamsAlertsEnabled = !!otherTeamsAlertsEnabled;
    settings.updatedAt = this._now();

    this._saveToStorage('notification_settings', settingsArr);

    const teams = this._getFromStorage('teams', []);
    const favoriteTeam = settings.favoriteTeamId
      ? teams.find((t) => t.id === settings.favoriteTeamId) || null
      : null;

    return {
      success: true,
      favoriteTeamId: settings.favoriteTeamId,
      favoriteTeamName: favoriteTeam ? favoriteTeam.name : null,
      favoriteGoalsEnabled: settings.favoriteGoalsEnabled,
      favoriteKickoffEnabled: settings.favoriteKickoffEnabled,
      favoriteHalftimeEnabled: settings.favoriteHalftimeEnabled,
      favoriteFulltimeEnabled: settings.favoriteFulltimeEnabled,
      otherTeamsAlertsEnabled: settings.otherTeamsAlertsEnabled,
      updatedAt: settings.updatedAt,
      message: 'Notification settings updated.',
      // Foreign key resolution
      favoriteTeam: favoriteTeam
    };
  }

  // getMySchedule(teamId?, competitionTypes?, dateFrom?, dateTo?)
  getMySchedule(teamId, competitionTypes, dateFrom, dateTo) {
    const myScheduleItems = this._getFromStorage('my_schedule_items', []);
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);

    const compTypesArray = this._ensureArray(competitionTypes).filter(Boolean);

    let joined = myScheduleItems
      .map((item) => {
        const match = matches.find((m) => m.id === item.matchId) || null;
        if (!match) return null;
        const competition = competitions.find((c) => c.id === match.competitionId) || null;
        const homeTeam = teams.find((t) => t.id === match.homeTeamId) || null;
        const awayTeam = teams.find((t) => t.id === match.awayTeamId) || null;
        return {
          myScheduleItem: item,
          match: match,
          competition: competition,
          homeTeam: homeTeam,
          awayTeam: awayTeam
        };
      })
      .filter(Boolean);

    joined = joined.filter((row) => {
      const match = row.match;
      const competition = row.competition;

      if (teamId) {
        if (match.homeTeamId !== teamId && match.awayTeamId !== teamId) return false;
      }

      if (compTypesArray.length > 0) {
        if (!competition || !compTypesArray.includes(competition.type)) return false;
      }

      const datePart = this._datePart(match.matchDate);
      if (dateFrom && datePart && datePart < dateFrom) return false;
      if (dateTo && datePart && datePart > dateTo) return false;

      return true;
    });

    joined.sort((a, b) => (a.match.matchDate || '').localeCompare(b.match.matchDate || ''));

    return joined.map((row) => ({
      myScheduleItemId: row.myScheduleItem.id,
      matchId: row.match.id,
      source: row.myScheduleItem.source,
      addedAt: row.myScheduleItem.addedAt,
      matchDate: row.match.matchDate,
      competitionName: row.competition ? row.competition.name : '',
      competitionType: row.competition ? row.competition.type : null,
      homeTeamName: row.homeTeam ? row.homeTeam.name : '',
      awayTeamName: row.awayTeam ? row.awayTeam.name : '',
      // Foreign key resolutions
      myScheduleItem: row.myScheduleItem,
      match: row.match,
      competition: row.competition,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam
    }));
  }

  // getAboutContent()
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    if (!raw) {
      return {
        missionText: '',
        features: [],
        contactEmail: '',
        supportLinks: []
      };
    }
    try {
      const data = JSON.parse(raw);
      return {
        missionText: data.missionText || '',
        features: Array.isArray(data.features) ? data.features : [],
        contactEmail: data.contactEmail || '',
        supportLinks: Array.isArray(data.supportLinks) ? data.supportLinks : []
      };
    } catch (e) {
      return {
        missionText: '',
        features: [],
        contactEmail: '',
        supportLinks: []
      };
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
