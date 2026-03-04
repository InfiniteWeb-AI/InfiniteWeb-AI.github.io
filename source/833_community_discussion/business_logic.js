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
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------- Storage Helpers --------------------
  _initStorage() {
    const keys = [
      'memberprofiles',
      'hobbycategories',
      'discussions',
      'posts',
      'polls',
      'polloptions',
      'bookmarks',
      'collections',
      'collectionitems',
      'feedsettings',
      'messagethreads',
      'messages',
      'postreports',
      'events',
      'eventrsvps',
      'authusers',
      'staticpages',
      'contactTickets'
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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _findById(arr, id) {
    return arr.find((item) => item.id === id) || null;
  }

  _caseInsensitiveIncludes(haystack, needle) {
    if (!haystack || !needle) return false;
    return haystack.toLowerCase().includes(needle.toLowerCase());
  }

  _isWithinDateRange(dateStr, dateRange) {
    if (!dateRange || dateRange === 'all_time') return true;
    const created = new Date(dateStr);
    if (Number.isNaN(created.getTime())) return false;
    const now = new Date();
    let diffMs = now.getTime() - created.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    switch (dateRange) {
      case 'last_7_days':
        return diffMs <= 7 * dayMs;
      case 'last_30_days':
        return diffMs <= 30 * dayMs;
      case 'last_12_months':
        return diffMs <= 365 * dayMs;
      default:
        return true;
    }
  }

  // -------------------- Auth Helpers --------------------
  _getCurrentUserProfileRecord() {
    const currentUserId = localStorage.getItem('currentUserId');
    const profiles = this._getFromStorage('memberprofiles');
    let profile = null;
    if (currentUserId) {
      profile = profiles.find((p) => p.id === currentUserId) || null;
    }
    if (!profile) {
      profile = profiles.find((p) => p.isCurrentUser) || null;
      if (profile) {
        localStorage.setItem('currentUserId', profile.id);
      }
    }
    return profile;
  }

  _saveCurrentUserProfileRecord(updatedProfile) {
    const profiles = this._getFromStorage('memberprofiles');
    const idx = profiles.findIndex((p) => p.id === updatedProfile.id);
    if (idx !== -1) {
      profiles[idx] = updatedProfile;
      this._saveToStorage('memberprofiles', profiles);
    }
  }

  // -------------------- Helper Functions From Spec --------------------
  // Internal helper to load or initialize single current user's FeedSettings
  _getOrCreateFeedSettings() {
    let feedsettings = this._getFromStorage('feedsettings');
    let feedSettings = feedsettings[0] || null;
    if (!feedSettings) {
      const now = this._now();
      feedSettings = {
        id: this._generateId('feedsettings'),
        followedCategoryIds: [],
        pinnedCategoryIds: [],
        pinTopN: false,
        pinTopNCount: 3,
        createdAt: now,
        updatedAt: now
      };
      feedsettings.push(feedSettings);
      this._saveToStorage('feedsettings', feedsettings);
    }
    return feedSettings;
  }

  _saveFeedSettings(feedSettings) {
    let feedsettings = this._getFromStorage('feedsettings');
    if (feedsettings.length === 0) {
      feedsettings = [feedSettings];
    } else {
      feedsettings[0] = feedSettings;
    }
    this._saveToStorage('feedsettings', feedsettings);

    // Keep current user's followedCategoriesCount in sync
    const profile = this._getCurrentUserProfileRecord();
    if (profile) {
      profile.followedCategoriesCount = Array.isArray(feedSettings.followedCategoryIds)
        ? feedSettings.followedCategoryIds.length
        : 0;
      profile.updatedAt = this._now();
      this._saveCurrentUserProfileRecord(profile);
    }
  }

  // Internal helper to atomically update counts on Discussion
  _updateDiscussionEngagementCounts(discussionId, deltas) {
    const { replyDelta = 0, likeDelta = 0, bookmarkDelta = 0, viewDelta = 0 } = deltas || {};
    const discussions = this._getFromStorage('discussions');
    const idx = discussions.findIndex((d) => d.id === discussionId);
    if (idx === -1) return;
    const discussion = discussions[idx];
    const now = this._now();

    if (typeof replyDelta === 'number' && replyDelta !== 0) {
      discussion.replyCount = Math.max(0, (discussion.replyCount || 0) + replyDelta);
      discussion.lastActivityAt = now;
    }
    if (typeof likeDelta === 'number' && likeDelta !== 0) {
      discussion.likeCount = Math.max(0, (discussion.likeCount || 0) + likeDelta);
      discussion.lastActivityAt = now;
    }
    if (typeof bookmarkDelta === 'number' && bookmarkDelta !== 0) {
      discussion.bookmarkCount = Math.max(0, (discussion.bookmarkCount || 0) + bookmarkDelta);
    }
    if (typeof viewDelta === 'number' && viewDelta !== 0) {
      discussion.viewCount = Math.max(0, (discussion.viewCount || 0) + viewDelta);
    }
    discussion.updatedAt = now;

    discussions[idx] = discussion;
    this._saveToStorage('discussions', discussions);
  }

  // Validate collection and return it (single-user, so just existence check)
  _ensureCollectionForUser(collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find((c) => c.id === collectionId) || null;
    return collection;
  }

  // Enrich discussions/posts with category and author display data
  _resolveCategoryAndProfileNames(items, options) {
    const { type } = options || {}; // 'discussion' or 'post'
    if (!Array.isArray(items) || !type) return items || [];
    const categories = this._getFromStorage('hobbycategories');
    const profiles = this._getFromStorage('memberprofiles');

    if (type === 'discussion') {
      return items.map((d) => {
        const category = categories.find((c) => c.id === d.categoryId) || null;
        const author = profiles.find((p) => p.id === d.authorProfileId) || null;
        return {
          ...d,
          categoryName: category ? category.name : null,
          authorUsername: author ? author.username : null,
          authorAvatarUrl: author ? author.avatarUrl || null : null
        };
      });
    }

    if (type === 'post') {
      return items.map((p) => {
        const author = profiles.find((m) => m.id === p.authorProfileId) || null;
        return {
          ...p,
          author: author
            ? {
                id: author.id,
                username: author.username,
                avatarUrl: author.avatarUrl || null
              }
            : null
        };
      });
    }

    return items;
  }

  // Get or create one-to-one MessageThread with a participant
  _getOrCreateMessageThread(participantProfileId, subject) {
    const now = this._now();
    const threads = this._getFromStorage('messagethreads');
    let thread = threads.find((t) => t.participantProfileId === participantProfileId) || null;

    if (!thread) {
      thread = {
        id: this._generateId('thread'),
        participantProfileId,
        subject: subject || '',
        lastMessageSnippet: '',
        lastMessageAt: null,
        unreadCount: 0
      };
      threads.push(thread);
      this._saveToStorage('messagethreads', threads);
    } else if (subject && !thread.subject) {
      // Optionally update subject for an existing thread if it was empty
      thread.subject = subject;
      thread.lastMessageAt = thread.lastMessageAt || now;
      const idx = threads.findIndex((t) => t.id === thread.id);
      if (idx !== -1) {
        threads[idx] = thread;
        this._saveToStorage('messagethreads', threads);
      }
    }

    return thread;
  }

  _updateCurrentUserCollectionsCount() {
    const collections = this._getFromStorage('collections');
    const profile = this._getCurrentUserProfileRecord();
    if (profile) {
      profile.collectionsCount = collections.length;
      profile.updatedAt = this._now();
      this._saveCurrentUserProfileRecord(profile);
    }
  }

  // -------------------- Interface Implementations --------------------
  // getAuthStatus()
  getAuthStatus() {
    const profile = this._getCurrentUserProfileRecord();
    if (!profile) {
      return { isAuthenticated: false, currentUser: null };
    }
    return {
      isAuthenticated: true,
      currentUser: {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatarUrl || null
      }
    };
  }

  // signUp(username, email, password)
  signUp(username, email, password) {
    const now = this._now();
    const authusers = this._getFromStorage('authusers');
    const memberprofiles = this._getFromStorage('memberprofiles');

    if (!username || !email || !password) {
      return { success: false, message: 'Missing required fields', profile: null };
    }

    const existingUser = authusers.find(
      (u) => u.email === email || u.username === username
    );
    if (existingUser) {
      return { success: false, message: 'User already exists', profile: null };
    }

    const id = this._generateId('member');

    // Update previous profiles' isCurrentUser flag
    for (const p of memberprofiles) {
      p.isCurrentUser = false;
    }

    const newProfile = {
      id,
      username,
      avatarUrl: null,
      bio: '',
      location: '',
      primaryHobbyCategoryId: null,
      discussionCount: 0,
      replyCount: 0,
      likeReceivedCount: 0,
      collectionsCount: 0,
      followedCategoriesCount: 0,
      isCurrentUser: true,
      createdAt: now,
      updatedAt: now
    };

    memberprofiles.push(newProfile);
    this._saveToStorage('memberprofiles', memberprofiles);

    authusers.push({
      id,
      username,
      email,
      password,
      createdAt: now
    });
    this._saveToStorage('authusers', authusers);

    localStorage.setItem('currentUserId', id);

    // Initialize feed settings for this user
    this._getOrCreateFeedSettings();

    return {
      success: true,
      message: 'Account created',
      profile: {
        id: newProfile.id,
        username: newProfile.username,
        avatarUrl: newProfile.avatarUrl,
        bio: newProfile.bio,
        location: newProfile.location,
        primaryHobbyCategoryId: newProfile.primaryHobbyCategoryId,
        primaryHobbyCategoryName: null,
        discussionCount: newProfile.discussionCount,
        replyCount: newProfile.replyCount,
        likeReceivedCount: newProfile.likeReceivedCount,
        collectionsCount: newProfile.collectionsCount,
        followedCategoriesCount: newProfile.followedCategoriesCount,
        createdAt: newProfile.createdAt,
        updatedAt: newProfile.updatedAt
      }
    };
  }

  // getHomeDashboardData()
  getHomeDashboardData() {
    const profile = this._getCurrentUserProfileRecord();
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('hobbycategories');
    const collections = this._getFromStorage('collections');
    const bookmarks = this._getFromStorage('bookmarks');
    const events = this._getFromStorage('events');
    const messages = this._getFromStorage('messages');

    const feedSettings = this._getOrCreateFeedSettings();

    // Pinned categories
    const pinnedCategories = (feedSettings.pinnedCategoryIds || [])
      .map((cid) => categories.find((c) => c.id === cid) || null)
      .filter(Boolean)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        isFollowed: !!c.isFollowed,
        discussionCount: c.discussionCount || 0,
        lastActivityAt: c.lastActivityAt || null
      }));

    // Feed discussions: from followed categories
    const followedIds = feedSettings.followedCategoryIds || [];
    const feedDiscussionsRaw = discussions
      .filter((d) => followedIds.includes(d.categoryId))
      .sort((a, b) => {
        const aTime = a.lastActivityAt || a.createdAt || '';
        const bTime = b.lastActivityAt || b.createdAt || '';
        return (bTime || '').localeCompare(aTime || '');
      })
      .slice(0, 50);

    const feedDiscussions = feedDiscussionsRaw.map((d) => {
      const category = categories.find((c) => c.id === d.categoryId) || null;
      const authorProfile = profile
        ? this._getFromStorage('memberprofiles').find((p) => p.id === d.authorProfileId) || null
        : this._getFromStorage('memberprofiles').find((p) => p.id === d.authorProfileId) || null;

      return {
        id: d.id,
        title: d.title,
        excerpt: (d.body || '').slice(0, 200),
        categoryId: d.categoryId,
        categoryName: category ? category.name : null,
        category,
        tags: d.tags || [],
        replyCount: d.replyCount || 0,
        likeCount: d.likeCount || 0,
        hasPoll: !!d.hasPoll,
        isBookmarkedByCurrentUser: !!d.isBookmarkedByCurrentUser,
        isLikedByCurrentUser: !!d.isLikedByCurrentUser,
        isFollowedByCurrentUser: !!d.isFollowedByCurrentUser,
        createdAt: d.createdAt,
        lastActivityAt: d.lastActivityAt || d.createdAt,
        authorUsername: authorProfile ? authorProfile.username : null,
        authorAvatarUrl: authorProfile ? authorProfile.avatarUrl || null : null
      };
    });

    // Counts
    const unreadMessagesCount = messages.filter(
      (m) => m.direction === 'inbound' && !m.isRead
    ).length;
    const collectionsCount = collections.length;
    const bookmarkedDiscussionsCount = bookmarks.length;

    const now = new Date();
    const upcomingEventsCount = events.filter((e) => {
      const start = new Date(e.startDateTime);
      return !Number.isNaN(start.getTime()) && start >= now;
    }).length;

    return {
      pinnedCategories,
      feedDiscussions,
      counts: {
        unreadMessagesCount,
        collectionsCount,
        bookmarkedDiscussionsCount,
        upcomingEventsCount
      },
      feedSettings: {
        followedCategoryIds: feedSettings.followedCategoryIds || [],
        pinnedCategoryIds: feedSettings.pinnedCategoryIds || [],
        pinTopN: !!feedSettings.pinTopN,
        pinTopNCount: feedSettings.pinTopNCount || 3
      }
    };
  }

  // getCategoriesOverview(query, onlyFollowed = false)
  getCategoriesOverview(query, onlyFollowed) {
    const categories = this._getFromStorage('hobbycategories');
    const feedSettings = this._getOrCreateFeedSettings();
    const followedIds = feedSettings.followedCategoryIds || [];
    const only = !!onlyFollowed;

    let result = categories.slice();

    if (query) {
      result = result.filter(
        (c) =>
          this._caseInsensitiveIncludes(c.name || '', query) ||
          this._caseInsensitiveIncludes(c.slug || '', query)
      );
    }

    if (only) {
      result = result.filter((c) => c.isFollowed || followedIds.includes(c.id));
    }

    return result.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      isFollowed: !!c.isFollowed,
      followerCount: c.followerCount || 0,
      discussionCount: c.discussionCount || 0,
      lastActivityAt: c.lastActivityAt || null
    }));
  }

  // followCategory(categoryId)
  followCategory(categoryId) {
    const categories = this._getFromStorage('hobbycategories');
    const idx = categories.findIndex((c) => c.id === categoryId);
    if (idx === -1) {
      return { success: false, message: 'Category not found', category: null, feedSettings: null };
    }

    const now = this._now();
    const category = categories[idx];
    if (!category.isFollowed) {
      category.isFollowed = true;
      category.followerCount = (category.followerCount || 0) + 1;
      categories[idx] = category;
      this._saveToStorage('hobbycategories', categories);
    }

    const feedSettings = this._getOrCreateFeedSettings();
    if (!feedSettings.followedCategoryIds.includes(categoryId)) {
      feedSettings.followedCategoryIds.push(categoryId);
    }
    if (feedSettings.pinTopN) {
      const n = feedSettings.pinTopNCount || 3;
      // Maintain order: followedCategoryIds already contains this id.
      feedSettings.pinnedCategoryIds = feedSettings.followedCategoryIds.slice(0, n);
    }
    feedSettings.updatedAt = now;
    this._saveFeedSettings(feedSettings);

    return {
      success: true,
      message: 'Category followed',
      category: {
        id: category.id,
        name: category.name,
        isFollowed: !!category.isFollowed
      },
      feedSettings: {
        followedCategoryIds: feedSettings.followedCategoryIds,
        pinnedCategoryIds: feedSettings.pinnedCategoryIds
      }
    };
  }

  // unfollowCategory(categoryId)
  unfollowCategory(categoryId) {
    const categories = this._getFromStorage('hobbycategories');
    const idx = categories.findIndex((c) => c.id === categoryId);
    if (idx === -1) {
      return { success: false, message: 'Category not found', category: null, feedSettings: null };
    }

    const now = this._now();
    const category = categories[idx];

    if (category.isFollowed) {
      category.isFollowed = false;
      category.followerCount = Math.max(0, (category.followerCount || 0) - 1);
      categories[idx] = category;
      this._saveToStorage('hobbycategories', categories);
    }

    const feedSettings = this._getOrCreateFeedSettings();

    feedSettings.followedCategoryIds = (feedSettings.followedCategoryIds || []).filter(
      (id) => id !== categoryId
    );
    feedSettings.pinnedCategoryIds = (feedSettings.pinnedCategoryIds || []).filter(
      (id) => id !== categoryId
    );

    if (feedSettings.pinTopN) {
      const n = feedSettings.pinTopNCount || 3;
      feedSettings.pinnedCategoryIds = feedSettings.followedCategoryIds.slice(0, n);
    }

    feedSettings.updatedAt = now;
    this._saveFeedSettings(feedSettings);

    return {
      success: true,
      message: 'Category unfollowed',
      category: {
        id: category.id,
        name: category.name,
        isFollowed: !!category.isFollowed
      },
      feedSettings: {
        followedCategoryIds: feedSettings.followedCategoryIds,
        pinnedCategoryIds: feedSettings.pinnedCategoryIds
      }
    };
  }

  // getFeedSettings()
  getFeedSettings() {
    const feedSettings = this._getOrCreateFeedSettings();
    const categories = this._getFromStorage('hobbycategories');

    const followedCategoriesDetailed = (feedSettings.followedCategoryIds || [])
      .map((cid) => categories.find((c) => c.id === cid) || null)
      .filter(Boolean)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        discussionCount: c.discussionCount || 0,
        lastActivityAt: c.lastActivityAt || null
      }));

    return {
      followedCategoryIds: feedSettings.followedCategoryIds || [],
      pinnedCategoryIds: feedSettings.pinnedCategoryIds || [],
      pinTopN: !!feedSettings.pinTopN,
      pinTopNCount: feedSettings.pinTopNCount || 3,
      followedCategoriesDetailed
    };
  }

  // updateFeedSettings(followedCategoryIds, pinnedCategoryIds, pinTopN, pinTopNCount)
  updateFeedSettings(followedCategoryIds, pinnedCategoryIds, pinTopN, pinTopNCount) {
    const now = this._now();
    const feedSettings = this._getOrCreateFeedSettings();

    const followed = Array.isArray(followedCategoryIds) ? followedCategoryIds.slice() : [];
    let pinned = Array.isArray(pinnedCategoryIds) ? pinnedCategoryIds.slice() : [];

    // Ensure pinned is subset of followed
    pinned = pinned.filter((id) => followed.includes(id));

    feedSettings.followedCategoryIds = followed;
    feedSettings.pinTopN = !!pinTopN;
    feedSettings.pinTopNCount = typeof pinTopNCount === 'number' ? pinTopNCount : 3;

    if (feedSettings.pinTopN) {
      const n = feedSettings.pinTopNCount || 3;
      feedSettings.pinnedCategoryIds = followed.slice(0, n);
    } else {
      feedSettings.pinnedCategoryIds = pinned;
    }

    feedSettings.updatedAt = now;
    this._saveFeedSettings(feedSettings);

    // Sync HobbyCategory.isFollowed flags
    const categories = this._getFromStorage('hobbycategories');
    let changed = false;
    for (const c of categories) {
      const shouldFollow = followed.includes(c.id);
      if (!!c.isFollowed !== shouldFollow) {
        c.isFollowed = shouldFollow;
        changed = true;
      }
    }
    if (changed) {
      this._saveToStorage('hobbycategories', categories);
    }

    return {
      success: true,
      message: 'Feed settings updated',
      feedSettings: {
        followedCategoryIds: feedSettings.followedCategoryIds,
        pinnedCategoryIds: feedSettings.pinnedCategoryIds,
        pinTopN: feedSettings.pinTopN,
        pinTopNCount: feedSettings.pinTopNCount
      }
    };
  }

  // getCategoryDiscussions(categoryId, query, filters, sort, page = 1, pageSize = 20)
  getCategoryDiscussions(categoryId, query, filters, sort, page, pageSize) {
    const pageNum = page || 1;
    const size = pageSize || 20;

    const categories = this._getFromStorage('hobbycategories');
    const category = categories.find((c) => c.id === categoryId) || null;
    const discussions = this._getFromStorage('discussions');

    let filtered = discussions.filter((d) => d.categoryId === categoryId);

    if (query) {
      filtered = filtered.filter(
        (d) =>
          this._caseInsensitiveIncludes(d.title || '', query) ||
          this._caseInsensitiveIncludes(d.body || '', query)
      );
    }

    const f = filters || {};
    if (f.dateRange) {
      filtered = filtered.filter((d) => this._isWithinDateRange(d.createdAt, f.dateRange));
    }
    if (typeof f.minReplies === 'number') {
      filtered = filtered.filter((d) => (d.replyCount || 0) >= f.minReplies);
    }
    if (typeof f.maxReplies === 'number') {
      filtered = filtered.filter((d) => (d.replyCount || 0) <= f.maxReplies);
    }
    if (typeof f.minLikes === 'number') {
      filtered = filtered.filter((d) => (d.likeCount || 0) >= f.minLikes);
    }
    if (typeof f.hasPoll === 'boolean') {
      filtered = filtered.filter((d) => !!d.hasPoll === f.hasPoll);
    }

    const sortKey = sort || 'most_recent';
    filtered.sort((a, b) => {
      if (sortKey === 'replies_desc') {
        return (b.replyCount || 0) - (a.replyCount || 0);
      }
      if (sortKey === 'likes_desc') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      if (sortKey === 'activity_desc') {
        const aTime = a.lastActivityAt || a.createdAt || '';
        const bTime = b.lastActivityAt || b.createdAt || '';
        return bTime.localeCompare(aTime);
      }
      // most_recent or default
      const aTime = a.createdAt || '';
      const bTime = b.createdAt || '';
      return bTime.localeCompare(aTime);
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / size) || 1;
    const start = (pageNum - 1) * size;
    const items = filtered.slice(start, start + size);

    const memberprofiles = this._getFromStorage('memberprofiles');

    const discussionsResult = items.map((d) => {
      const author = memberprofiles.find((p) => p.id === d.authorProfileId) || null;
      return {
        id: d.id,
        title: d.title,
        excerpt: (d.body || '').slice(0, 200),
        replyCount: d.replyCount || 0,
        likeCount: d.likeCount || 0,
        hasPoll: !!d.hasPoll,
        createdAt: d.createdAt,
        lastActivityAt: d.lastActivityAt || d.createdAt,
        isBookmarkedByCurrentUser: !!d.isBookmarkedByCurrentUser,
        isLikedByCurrentUser: !!d.isLikedByCurrentUser,
        isFollowedByCurrentUser: !!d.isFollowedByCurrentUser,
        authorUsername: author ? author.username : null,
        authorAvatarUrl: author ? author.avatarUrl || null : null
      };
    });

    return {
      category: category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description || '',
            isFollowed: !!category.isFollowed,
            followerCount: category.followerCount || 0,
            discussionCount: category.discussionCount || 0
          }
        : null,
      discussions: discussionsResult,
      pagination: {
        page: pageNum,
        pageSize: size,
        totalItems,
        totalPages
      }
    };
  }

  // getDiscussionThread(discussionId)
  getDiscussionThread(discussionId) {
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('hobbycategories');
    const memberprofiles = this._getFromStorage('memberprofiles');
    const postsAll = this._getFromStorage('posts');
    const polls = this._getFromStorage('polls');
    const polloptions = this._getFromStorage('polloptions');

    const discussion = discussions.find((d) => d.id === discussionId) || null;
    if (!discussion) {
      return { discussion: null, poll: null, posts: [] };
    }

    const category = categories.find((c) => c.id === discussion.categoryId) || null;
    const author = memberprofiles.find((p) => p.id === discussion.authorProfileId) || null;

    const discussionObj = {
      id: discussion.id,
      title: discussion.title,
      body: discussion.body,
      categoryId: discussion.categoryId,
      categoryName: category ? category.name : null,
      category,
      tags: discussion.tags || [],
      replyCount: discussion.replyCount || 0,
      likeCount: discussion.likeCount || 0,
      viewCount: discussion.viewCount || 0,
      bookmarkCount: discussion.bookmarkCount || 0,
      hasPoll: !!discussion.hasPoll,
      isBookmarkedByCurrentUser: !!discussion.isBookmarkedByCurrentUser,
      isLikedByCurrentUser: !!discussion.isLikedByCurrentUser,
      isFollowedByCurrentUser: !!discussion.isFollowedByCurrentUser,
      createdAt: discussion.createdAt,
      updatedAt: discussion.updatedAt,
      lastActivityAt: discussion.lastActivityAt || discussion.createdAt,
      author: author
        ? {
            id: author.id,
            username: author.username,
            avatarUrl: author.avatarUrl || null,
            primaryHobbyCategoryName: null
          }
        : null
    };

    // Poll
    let poll = null;
    const pollRecord = polls.find((p) => p.discussionId === discussionId) || null;
    if (pollRecord) {
      const now = new Date();
      const expires = new Date(pollRecord.expiresAt);
      const isExpired = !Number.isNaN(expires.getTime()) && now > expires;
      const options = polloptions
        .filter((o) => o.pollId === pollRecord.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const totalVotes = pollRecord.totalVotes || options.reduce((sum, o) => sum + (o.voteCount || 0), 0);

      poll = {
        id: pollRecord.id,
        question: pollRecord.question,
        allowMultipleSelection: !!pollRecord.allowMultipleSelection,
        totalVotes,
        expiresAt: pollRecord.expiresAt,
        isExpired,
        options: options.map((o) => ({
          id: o.id,
          label: o.label,
          voteCount: o.voteCount || 0,
          order: o.order || 0,
          votePercentage:
            totalVotes > 0 ? ((o.voteCount || 0) / totalVotes) * 100 : 0,
          isSelectedByCurrentUser: (pollRecord.selectedOptionIds || []).includes(o.id)
        }))
      };
    }

    const posts = postsAll
      .filter((p) => p.discussionId === discussionId)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      .map((p) => {
        const postAuthor = memberprofiles.find((m) => m.id === p.authorProfileId) || null;
        const effectiveAuthor = postAuthor || author;
        const parentPost = p.parentPostId
          ? postsAll.find((pp) => pp.id === p.parentPostId) || null
          : null;
        return {
          id: p.id,
          discussionId: p.discussionId,
          parentPostId: p.parentPostId || null,
          discussion: discussionObj,
          parentPost,
          isOriginalPost: !!p.isOriginalPost,
          author: effectiveAuthor
            ? {
                id: effectiveAuthor.id,
                username: effectiveAuthor.username,
                avatarUrl: effectiveAuthor.avatarUrl || null
              }
            : null,
          content: p.content,
          likeCount: p.likeCount || 0,
          isLikedByCurrentUser: !!p.isLikedByCurrentUser,
          isReportedByCurrentUser: !!p.isReportedByCurrentUser,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        };
      });

    return {
      discussion: discussionObj,
      poll,
      posts
    };
  }

  // createDiscussionReply(discussionId, parentPostId, content)
  createDiscussionReply(discussionId, parentPostId, content) {
    if (!content) {
      return { success: false, message: 'Content is required', post: null, newReplyCount: null };
    }

    const profile = this._getCurrentUserProfileRecord();
    if (!profile) {
      return { success: false, message: 'Not authenticated', post: null, newReplyCount: null };
    }

    const discussions = this._getFromStorage('discussions');
    const discussion = discussions.find((d) => d.id === discussionId) || null;
    if (!discussion) {
      return { success: false, message: 'Discussion not found', post: null, newReplyCount: null };
    }

    const posts = this._getFromStorage('posts');
    const now = this._now();

    const newPost = {
      id: this._generateId('post'),
      discussionId,
      parentPostId: parentPostId || null,
      authorProfileId: profile.id,
      content,
      likeCount: 0,
      isLikedByCurrentUser: false,
      isOriginalPost: false,
      isReportedByCurrentUser: false,
      createdAt: now,
      updatedAt: now
    };

    posts.push(newPost);
    this._saveToStorage('posts', posts);

    // Update discussion counts
    this._updateDiscussionEngagementCounts(discussionId, { replyDelta: 1 });

    // Update user replyCount
    profile.replyCount = (profile.replyCount || 0) + 1;
    profile.updatedAt = now;
    this._saveCurrentUserProfileRecord(profile);

    const updatedDiscussion = this._getFromStorage('discussions').find(
      (d) => d.id === discussionId
    );

    return {
      success: true,
      message: 'Reply posted',
      post: {
        id: newPost.id,
        discussionId: newPost.discussionId,
        parentPostId: newPost.parentPostId,
        isOriginalPost: newPost.isOriginalPost,
        content: newPost.content,
        likeCount: newPost.likeCount,
        isLikedByCurrentUser: newPost.isLikedByCurrentUser,
        createdAt: newPost.createdAt
      },
      newReplyCount: updatedDiscussion ? updatedDiscussion.replyCount || 0 : null
    };
  }

  // toggleLikeDiscussion(discussionId)
  toggleLikeDiscussion(discussionId) {
    const discussions = this._getFromStorage('discussions');
    const idx = discussions.findIndex((d) => d.id === discussionId);
    if (idx === -1) {
      return { isLikedByCurrentUser: false, likeCount: 0 };
    }

    const discussion = discussions[idx];
    const now = this._now();

    const currentlyLiked = !!discussion.isLikedByCurrentUser;
    const newLiked = !currentlyLiked;
    const delta = newLiked ? 1 : -1;

    discussion.isLikedByCurrentUser = newLiked;
    discussion.likeCount = Math.max(0, (discussion.likeCount || 0) + delta);
    discussion.updatedAt = now;
    discussion.lastActivityAt = now;

    discussions[idx] = discussion;
    this._saveToStorage('discussions', discussions);

    return {
      isLikedByCurrentUser: discussion.isLikedByCurrentUser,
      likeCount: discussion.likeCount || 0
    };
  }

  // toggleBookmarkDiscussion(discussionId)
  toggleBookmarkDiscussion(discussionId) {
    const discussions = this._getFromStorage('discussions');
    const dIdx = discussions.findIndex((d) => d.id === discussionId);
    if (dIdx === -1) {
      return { isBookmarkedByCurrentUser: false, bookmarkCount: 0 };
    }

    const bookmarks = this._getFromStorage('bookmarks');
    const now = this._now();

    const existingIdx = bookmarks.findIndex((b) => b.discussionId === discussionId);
    let isBookmarked;
    let bookmarkCountDelta;

    if (existingIdx !== -1) {
      // Remove bookmark
      bookmarks.splice(existingIdx, 1);
      isBookmarked = false;
      bookmarkCountDelta = -1;
    } else {
      // Add bookmark
      bookmarks.push({
        id: this._generateId('bookmark'),
        discussionId,
        createdAt: now
      });
      isBookmarked = true;
      bookmarkCountDelta = 1;
    }

    this._saveToStorage('bookmarks', bookmarks);

    const discussion = discussions[dIdx];
    discussion.isBookmarkedByCurrentUser = isBookmarked;
    discussion.bookmarkCount = Math.max(
      0,
      (discussion.bookmarkCount || 0) + bookmarkCountDelta
    );
    discussion.updatedAt = now;

    discussions[dIdx] = discussion;
    this._saveToStorage('discussions', discussions);

    return {
      isBookmarkedByCurrentUser: discussion.isBookmarkedByCurrentUser,
      bookmarkCount: discussion.bookmarkCount || 0
    };
  }

  // toggleFollowDiscussion(discussionId)
  toggleFollowDiscussion(discussionId) {
    const discussions = this._getFromStorage('discussions');
    const idx = discussions.findIndex((d) => d.id === discussionId);
    if (idx === -1) {
      return { isFollowedByCurrentUser: false };
    }

    const discussion = discussions[idx];
    discussion.isFollowedByCurrentUser = !discussion.isFollowedByCurrentUser;
    discussion.updatedAt = this._now();
    discussions[idx] = discussion;
    this._saveToStorage('discussions', discussions);

    return {
      isFollowedByCurrentUser: discussion.isFollowedByCurrentUser
    };
  }

  // toggleLikePost(postId)
  toggleLikePost(postId) {
    const posts = this._getFromStorage('posts');
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx === -1) {
      return { isLikedByCurrentUser: false, likeCount: 0 };
    }

    const post = posts[idx];
    const now = this._now();

    const currentlyLiked = !!post.isLikedByCurrentUser;
    const newLiked = !currentlyLiked;
    const delta = newLiked ? 1 : -1;

    post.isLikedByCurrentUser = newLiked;
    post.likeCount = Math.max(0, (post.likeCount || 0) + delta);
    post.updatedAt = now;

    posts[idx] = post;
    this._saveToStorage('posts', posts);

    return {
      isLikedByCurrentUser: post.isLikedByCurrentUser,
      likeCount: post.likeCount || 0
    };
  }

  // reportPost(postId, reason, description)
  reportPost(postId, reason, description) {
    const validReasons = ['spam_advertising', 'abuse_harassment', 'off_topic', 'other'];
    const normalizedReason = validReasons.includes(reason) ? reason : 'other';

    const posts = this._getFromStorage('posts');
    const postIdx = posts.findIndex((p) => p.id === postId);
    if (postIdx === -1) {
      return { success: false, message: 'Post not found', report: null };
    }

    const now = this._now();
    const postreports = this._getFromStorage('postreports');

    const report = {
      id: this._generateId('postreport'),
      postId,
      reason: normalizedReason,
      description: description || '',
      status: 'submitted',
      createdAt: now,
      resolvedAt: null
    };

    postreports.push(report);
    this._saveToStorage('postreports', postreports);

    const post = posts[postIdx];
    post.isReportedByCurrentUser = true;
    post.updatedAt = now;
    posts[postIdx] = post;
    this._saveToStorage('posts', posts);

    return {
      success: true,
      message: 'Report submitted',
      report: {
        id: report.id,
        postId: report.postId,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt
      }
    };
  }

  // globalSearchDiscussions(query, filters, sort, page = 1, pageSize = 20)
  globalSearchDiscussions(query, filters, sort, page, pageSize) {
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('hobbycategories');

    if (!query) {
      return {
        results: [],
        page: page || 1,
        pageSize: pageSize || 20,
        totalItems: 0,
        totalPages: 1
      };
    }

    const f = filters || {};

    const qLower = query.toLowerCase();
    const qTokens = qLower.split(/\s+/).filter(Boolean);

    let result = discussions.filter((d) => {
      const title = d.title || '';
      const body = d.body || '';

      // Direct substring match on full query in title or body
      if (
        this._caseInsensitiveIncludes(title, query) ||
        this._caseInsensitiveIncludes(body, query)
      ) {
        return true;
      }

      // Fallback: require that all whitespace-separated query tokens appear
      // somewhere in the combined title/body text (order-agnostic)
      const haystack = (title + ' ' + body).toLowerCase();
      return qTokens.every((token) => haystack.includes(token));
    });

    if (f.categoryId) {
      result = result.filter((d) => d.categoryId === f.categoryId);
    }
    if (f.dateRange) {
      result = result.filter((d) => this._isWithinDateRange(d.createdAt, f.dateRange));
    }
    if (typeof f.minReplies === 'number') {
      result = result.filter((d) => (d.replyCount || 0) >= f.minReplies);
    }
    if (typeof f.minLikes === 'number') {
      result = result.filter((d) => (d.likeCount || 0) >= f.minLikes);
    }

    const sortKey = sort || 'relevance';
    result.sort((a, b) => {
      if (sortKey === 'replies_desc') {
        return (b.replyCount || 0) - (a.replyCount || 0);
      }
      if (sortKey === 'likes_desc') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      if (sortKey === 'most_recent') {
        const aTime = a.createdAt || '';
        const bTime = b.createdAt || '';
        return bTime.localeCompare(aTime);
      }
      // relevance: simple combination of likes + replies
      const aScore = (a.likeCount || 0) + (a.replyCount || 0);
      const bScore = (b.likeCount || 0) + (b.replyCount || 0);
      return bScore - aScore;
    });

    const pageNum = page || 1;
    const size = pageSize || 20;
    const totalItems = result.length;
    const totalPages = Math.ceil(totalItems / size) || 1;
    const start = (pageNum - 1) * size;
    const items = result.slice(start, start + size);

    const results = items.map((d) => {
      const category = categories.find((c) => c.id === d.categoryId) || null;
      return {
        id: d.id,
        title: d.title,
        excerpt: (d.body || '').slice(0, 200),
        categoryId: d.categoryId,
        categoryName: category ? category.name : null,
        category,
        replyCount: d.replyCount || 0,
        likeCount: d.likeCount || 0,
        hasPoll: !!d.hasPoll,
        createdAt: d.createdAt,
        lastActivityAt: d.lastActivityAt || d.createdAt,
        isBookmarkedByCurrentUser: !!d.isBookmarkedByCurrentUser,
        isLikedByCurrentUser: !!d.isLikedByCurrentUser
      };
    });

    return {
      results,
      page: pageNum,
      pageSize: size,
      totalItems,
      totalPages
    };
  }

  // getNewDiscussionConfig(categoryId)
  getNewDiscussionConfig(categoryId) {
    const categories = this._getFromStorage('hobbycategories');
    const availableCategories = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug
    }));

    const defaultCategoryId = categoryId || (categories[0] ? categories[0].id : null);

    const discussions = this._getFromStorage('discussions');
    const tagSet = new Set();
    for (const d of discussions) {
      if (Array.isArray(d.tags)) {
        for (const t of d.tags) tagSet.add(t);
      }
    }

    return {
      availableCategories,
      defaultCategoryId,
      tagSuggestions: Array.from(tagSet),
      pollConfig: {
        maxOptions: 10,
        maxQuestionLength: 200,
        maxOptionLabelLength: 100,
        maxDurationDays: 30
      }
    };
  }

  // createDiscussion(title, body, categoryId, tags, poll)
  createDiscussion(title, body, categoryId, tags, poll) {
    const profile = this._getCurrentUserProfileRecord();
    if (!profile) {
      return { success: false, message: 'Not authenticated', discussion: null };
    }

    if (!title || !body || !categoryId) {
      return { success: false, message: 'Missing required fields', discussion: null };
    }

    const categories = this._getFromStorage('hobbycategories');
    const category = categories.find((c) => c.id === categoryId) || null;
    if (!category) {
      return { success: false, message: 'Category not found', discussion: null };
    }

    const discussions = this._getFromStorage('discussions');
    const now = this._now();

    const discussionId = this._generateId('discussion');

    const discussionRecord = {
      id: discussionId,
      title,
      body,
      categoryId,
      authorProfileId: profile.id,
      tags: Array.isArray(tags) ? tags : [],
      replyCount: 0,
      likeCount: 0,
      viewCount: 0,
      bookmarkCount: 0,
      hasPoll: !!poll,
      isBookmarkedByCurrentUser: false,
      isLikedByCurrentUser: false,
      isFollowedByCurrentUser: false,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now
    };

    discussions.push(discussionRecord);
    this._saveToStorage('discussions', discussions);

    // Update category discussion count
    const catIdx = categories.findIndex((c) => c.id === categoryId);
    if (catIdx !== -1) {
      categories[catIdx].discussionCount = (categories[catIdx].discussionCount || 0) + 1;
      categories[catIdx].lastActivityAt = now;
      this._saveToStorage('hobbycategories', categories);
    }

    // Update user discussion count
    profile.discussionCount = (profile.discussionCount || 0) + 1;
    profile.updatedAt = now;
    this._saveCurrentUserProfileRecord(profile);

    // Poll creation
    if (poll && Array.isArray(poll.options) && poll.options.length > 0) {
      const polls = this._getFromStorage('polls');
      const polloptions = this._getFromStorage('polloptions');

      const pollId = this._generateId('poll');
      const durationDays = Math.max(1, Math.min(poll.durationDays || 7, 30));
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const pollRecord = {
        id: pollId,
        discussionId: discussionId,
        question: poll.question || '',
        allowMultipleSelection: !!poll.allowMultipleSelection,
        totalVotes: 0,
        selectedOptionIds: [],
        createdAt: now,
        expiresAt
      };

      polls.push(pollRecord);

      poll.options.forEach((label, index) => {
        const optionRecord = {
          id: this._generateId('polloption'),
          pollId,
          label,
          voteCount: 0,
          order: index
        };
        polloptions.push(optionRecord);
      });

      this._saveToStorage('polls', polls);
      this._saveToStorage('polloptions', polloptions);
    }

    return {
      success: true,
      message: 'Discussion created',
      discussion: {
        id: discussionRecord.id,
        title: discussionRecord.title,
        categoryId: discussionRecord.categoryId,
        categoryName: category.name,
        hasPoll: discussionRecord.hasPoll,
        createdAt: discussionRecord.createdAt
      }
    };
  }

  // voteInPoll(pollId, optionIds)
  voteInPoll(pollId, optionIds) {
    const polls = this._getFromStorage('polls');
    const pollIdx = polls.findIndex((p) => p.id === pollId);
    if (pollIdx === -1) {
      return { success: false, message: 'Poll not found', totalVotes: 0, options: [] };
    }

    const poll = polls[pollIdx];
    const now = new Date();
    const expires = new Date(poll.expiresAt);
    if (!Number.isNaN(expires.getTime()) && now > expires) {
      return { success: false, message: 'Poll has expired', totalVotes: poll.totalVotes || 0, options: [] };
    }

    let newOptionIds = Array.isArray(optionIds) ? optionIds.slice() : [];
    if (!poll.allowMultipleSelection && newOptionIds.length > 1) {
      newOptionIds = [newOptionIds[0]];
    }

    const polloptions = this._getFromStorage('polloptions');
    const options = polloptions.filter((o) => o.pollId === pollId);

    const oldSelected = poll.selectedOptionIds || [];
    const oldSet = new Set(oldSelected);
    const newSet = new Set(newOptionIds);

    for (const o of options) {
      const wasSelected = oldSet.has(o.id);
      const isSelected = newSet.has(o.id);
      if (wasSelected && !isSelected) {
        o.voteCount = Math.max(0, (o.voteCount || 0) - 1);
      } else if (!wasSelected && isSelected) {
        o.voteCount = (o.voteCount || 0) + 1;
      }
    }

    let totalVotes = 0;
    for (const o of options) {
      totalVotes += o.voteCount || 0;
    }
    poll.totalVotes = totalVotes;
    poll.selectedOptionIds = newOptionIds;

    // Persist
    const updatedPolloptions = polloptions.map((o) => (o.pollId === pollId ? options.find((p) => p.id === o.id) || o : o));
    polls[pollIdx] = poll;

    this._saveToStorage('polls', polls);
    this._saveToStorage('polloptions', updatedPolloptions);

    return {
      success: true,
      message: 'Vote recorded',
      totalVotes,
      options: options.map((o) => ({
        id: o.id,
        voteCount: o.voteCount || 0,
        votePercentage: totalVotes > 0 ? ((o.voteCount || 0) / totalVotes) * 100 : 0
      }))
    };
  }

  // getCurrentUserProfile()
  getCurrentUserProfile() {
    const profile = this._getCurrentUserProfileRecord();
    if (!profile) {
      return { profile: null, followedCategories: [], topCollections: [], bookmarkedDiscussionsPreview: [] };
    }

    const categories = this._getFromStorage('hobbycategories');
    const collections = this._getFromStorage('collections');
    const bookmarks = this._getFromStorage('bookmarks');
    const discussions = this._getFromStorage('discussions');

    const primaryCategory = profile.primaryHobbyCategoryId
      ? categories.find((c) => c.id === profile.primaryHobbyCategoryId) || null
      : null;

    const followedCategories = categories
      .filter((c) => c.isFollowed)
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));

    const topCollections = collections
      .slice()
      .sort((a, b) => (b.itemCount || 0) - (a.itemCount || 0))
      .slice(0, 3)
      .map((c) => ({ id: c.id, name: c.name, itemCount: c.itemCount || 0 }));

    const bookmarkedPreview = bookmarks
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 3)
      .map((b) => {
        const d = discussions.find((dd) => dd.id === b.discussionId) || null;
        const category = d ? categories.find((c) => c.id === d.categoryId) || null : null;
        return d
          ? {
              id: d.id,
              title: d.title,
              categoryName: category ? category.name : null
            }
          : null;
      })
      .filter(Boolean);

    return {
      profile: {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatarUrl || null,
        bio: profile.bio || '',
        location: profile.location || '',
        primaryHobbyCategoryId: profile.primaryHobbyCategoryId || null,
        primaryHobbyCategoryName: primaryCategory ? primaryCategory.name : null,
        discussionCount: profile.discussionCount || 0,
        replyCount: profile.replyCount || 0,
        likeReceivedCount: profile.likeReceivedCount || 0,
        collectionsCount: profile.collectionsCount || 0,
        followedCategoriesCount: profile.followedCategoriesCount || 0,
        createdAt: profile.createdAt
      },
      followedCategories,
      topCollections,
      bookmarkedDiscussionsPreview: bookmarkedPreview
    };
  }

  // updateCurrentUserProfile(bio, location, primaryHobbyCategoryId)
  updateCurrentUserProfile(bio, location, primaryHobbyCategoryId) {
    const profile = this._getCurrentUserProfileRecord();
    if (!profile) {
      return { success: false, message: 'Not authenticated', profile: null };
    }

    const categories = this._getFromStorage('hobbycategories');
    const now = this._now();

    if (typeof bio === 'string') profile.bio = bio;
    if (typeof location === 'string') profile.location = location;

    let primaryCategory = null;
    if (primaryHobbyCategoryId) {
      primaryCategory = categories.find((c) => c.id === primaryHobbyCategoryId) || null;
      if (primaryCategory) {
        profile.primaryHobbyCategoryId = primaryHobbyCategoryId;
      }
    }

    profile.updatedAt = now;
    this._saveCurrentUserProfileRecord(profile);

    return {
      success: true,
      message: 'Profile updated',
      profile: {
        id: profile.id,
        bio: profile.bio || '',
        location: profile.location || '',
        primaryHobbyCategoryId: profile.primaryHobbyCategoryId || null,
        primaryHobbyCategoryName: primaryCategory ? primaryCategory.name : null
      }
    };
  }

  // getMemberProfile(profileId)
  getMemberProfile(profileId) {
    const profiles = this._getFromStorage('memberprofiles');
    const profile = profiles.find((p) => p.id === profileId) || null;
    const current = this._getCurrentUserProfileRecord();

    if (!profile) {
      return { profile: null };
    }

    const categories = this._getFromStorage('hobbycategories');
    const primaryCategory = profile.primaryHobbyCategoryId
      ? categories.find((c) => c.id === profile.primaryHobbyCategoryId) || null
      : null;

    return {
      profile: {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatarUrl || null,
        bio: profile.bio || '',
        location: profile.location || '',
        primaryHobbyCategoryName: primaryCategory ? primaryCategory.name : null,
        discussionCount: profile.discussionCount || 0,
        replyCount: profile.replyCount || 0,
        likeReceivedCount: profile.likeReceivedCount || 0,
        isCurrentUser: current ? current.id === profile.id : false
      }
    };
  }

  // getCollectionsList()
  getCollectionsList() {
    const collections = this._getFromStorage('collections');
    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      itemCount: c.itemCount || 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));
  }

  // getCollectionDetails(collectionId)
  getCollectionDetails(collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null, items: [] };
    }

    const collectionitems = this._getFromStorage('collectionitems');
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('hobbycategories');

    const itemsForCollection = collectionitems
      .filter((ci) => ci.collectionId === collectionId)
      .sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
      .map((ci) => {
        const d = discussions.find((dd) => dd.id === ci.discussionId) || null;
        if (!d) return null;
        const category = categories.find((c) => c.id === d.categoryId) || null;
        return {
          collectionItemId: ci.id,
          addedAt: ci.addedAt,
          discussion: {
            id: d.id,
            title: d.title,
            categoryName: category ? category.name : null,
            replyCount: d.replyCount || 0,
            likeCount: d.likeCount || 0,
            hasPoll: !!d.hasPoll
          }
        };
      })
      .filter(Boolean);

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        itemCount: collection.itemCount || 0,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt
      },
      items: itemsForCollection
    };
  }

  // createCollection(name, description)
  createCollection(name, description) {
    if (!name) {
      return { success: false, message: 'Name is required', collection: null };
    }

    const collections = this._getFromStorage('collections');
    const now = this._now();

    const collection = {
      id: this._generateId('collection'),
      name,
      description: description || '',
      itemCount: 0,
      createdAt: now,
      updatedAt: now
    };

    collections.push(collection);
    this._saveToStorage('collections', collections);
    this._updateCurrentUserCollectionsCount();

    return {
      success: true,
      message: 'Collection created',
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        itemCount: collection.itemCount
      }
    };
  }

  // addDiscussionToCollection(collectionId, discussionId)
  addDiscussionToCollection(collectionId, discussionId) {
    const collection = this._ensureCollectionForUser(collectionId);
    if (!collection) {
      return { success: false, message: 'Collection not found', collectionItem: null, collectionSummary: null };
    }

    const discussions = this._getFromStorage('discussions');
    const discussion = discussions.find((d) => d.id === discussionId) || null;
    if (!discussion) {
      return { success: false, message: 'Discussion not found', collectionItem: null, collectionSummary: null };
    }

    const collectionitems = this._getFromStorage('collectionitems');
    const existing = collectionitems.find(
      (ci) => ci.collectionId === collectionId && ci.discussionId === discussionId
    );
    if (existing) {
      return {
        success: true,
        message: 'Discussion already in collection',
        collectionItem: {
          id: existing.id,
          collectionId: existing.collectionId,
          discussionId: existing.discussionId,
          addedAt: existing.addedAt
        },
        collectionSummary: {
          id: collection.id,
          name: collection.name,
          itemCount: collection.itemCount || 0
        }
      };
    }

    const now = this._now();
    const item = {
      id: this._generateId('collectionitem'),
      collectionId,
      discussionId,
      addedAt: now
    };

    collectionitems.push(item);
    this._saveToStorage('collectionitems', collectionitems);

    // Update collection count
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx !== -1) {
      collections[idx].itemCount = (collections[idx].itemCount || 0) + 1;
      collections[idx].updatedAt = now;
      this._saveToStorage('collections', collections);
      this._updateCurrentUserCollectionsCount();
    }

    const updatedCollection = idx !== -1 ? collections[idx] : collection;

    return {
      success: true,
      message: 'Discussion added to collection',
      collectionItem: {
        id: item.id,
        collectionId: item.collectionId,
        discussionId: item.discussionId,
        addedAt: item.addedAt
      },
      collectionSummary: {
        id: updatedCollection.id,
        name: updatedCollection.name,
        itemCount: updatedCollection.itemCount || 0
      }
    };
  }

  // removeDiscussionFromCollection(collectionItemId)
  removeDiscussionFromCollection(collectionItemId) {
    const collectionitems = this._getFromStorage('collectionitems');
    const idx = collectionitems.findIndex((ci) => ci.id === collectionItemId);
    if (idx === -1) {
      return { success: false, message: 'Collection item not found' };
    }

    const item = collectionitems[idx];
    collectionitems.splice(idx, 1);
    this._saveToStorage('collectionitems', collectionitems);

    const collections = this._getFromStorage('collections');
    const cIdx = collections.findIndex((c) => c.id === item.collectionId);
    if (cIdx !== -1) {
      collections[cIdx].itemCount = Math.max(0, (collections[cIdx].itemCount || 0) - 1);
      collections[cIdx].updatedAt = this._now();
      this._saveToStorage('collections', collections);
      this._updateCurrentUserCollectionsCount();
    }

    return { success: true, message: 'Discussion removed from collection' };
  }

  // updateCollection(collectionId, name, description)
  updateCollection(collectionId, name, description) {
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) {
      return { success: false, message: 'Collection not found' };
    }

    const collection = collections[idx];
    if (typeof name === 'string' && name) collection.name = name;
    if (typeof description === 'string') collection.description = description;
    collection.updatedAt = this._now();

    collections[idx] = collection;
    this._saveToStorage('collections', collections);

    return { success: true, message: 'Collection updated' };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) {
      return { success: false, message: 'Collection not found' };
    }

    collections.splice(idx, 1);
    this._saveToStorage('collections', collections);

    let collectionitems = this._getFromStorage('collectionitems');
    collectionitems = collectionitems.filter((ci) => ci.collectionId !== collectionId);
    this._saveToStorage('collectionitems', collectionitems);

    this._updateCurrentUserCollectionsCount();

    return { success: true, message: 'Collection deleted' };
  }

  // getMessageThreads(page = 1, pageSize = 20)
  getMessageThreads(page, pageSize) {
    const threads = this._getFromStorage('messagethreads');
    const profiles = this._getFromStorage('memberprofiles');

    const sorted = threads.slice().sort((a, b) => {
      const aTime = a.lastMessageAt || '';
      const bTime = b.lastMessageAt || '';
      return bTime.localeCompare(aTime);
    });

    const pageNum = page || 1;
    const size = pageSize || 20;
    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / size) || 1;
    const start = (pageNum - 1) * size;
    const items = sorted.slice(start, start + size);

    const threadsResult = items.map((t) => {
      const participant = profiles.find((p) => p.id === t.participantProfileId) || null;
      return {
        id: t.id,
        subject: t.subject || '',
        lastMessageSnippet: t.lastMessageSnippet || '',
        lastMessageAt: t.lastMessageAt || null,
        unreadCount: t.unreadCount || 0,
        participant: participant
          ? {
              id: participant.id,
              username: participant.username,
              avatarUrl: participant.avatarUrl || null
            }
          : null
      };
    });

    return {
      threads: threadsResult,
      page: pageNum,
      pageSize: size,
      totalItems,
      totalPages
    };
  }

  // getMessageThread(threadId)
  getMessageThread(threadId) {
    const threads = this._getFromStorage('messagethreads');
    const thread = threads.find((t) => t.id === threadId) || null;
    if (!thread) {
      return { thread: null, messages: [] };
    }

    const profiles = this._getFromStorage('memberprofiles');
    const participant = profiles.find((p) => p.id === thread.participantProfileId) || null;

    const messages = this._getFromStorage('messages')
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      .map((m) => ({
        id: m.id,
        body: m.body,
        direction: m.direction,
        isRead: !!m.isRead,
        createdAt: m.createdAt
      }));

    return {
      thread: {
        id: thread.id,
        subject: thread.subject || '',
        unreadCount: thread.unreadCount || 0,
        participant: participant
          ? {
              id: participant.id,
              username: participant.username,
              avatarUrl: participant.avatarUrl || null
            }
          : null
      },
      messages
    };
  }

  // sendPrivateMessage(participantProfileId, subject, body)
  sendPrivateMessage(participantProfileId, subject, body) {
    const profile = this._getCurrentUserProfileRecord();
    if (!profile) {
      return { success: false, message: 'Not authenticated', thread: null, sentMessage: null };
    }

    if (!participantProfileId || !body) {
      return { success: false, message: 'Missing required fields', thread: null, sentMessage: null };
    }

    const memberprofiles = this._getFromStorage('memberprofiles');
    const participant = memberprofiles.find((p) => p.id === participantProfileId) || null;
    if (!participant) {
      return { success: false, message: 'Participant not found', thread: null, sentMessage: null };
    }

    const thread = this._getOrCreateMessageThread(participantProfileId, subject);
    const messages = this._getFromStorage('messages');
    const now = this._now();

    const message = {
      id: this._generateId('message'),
      threadId: thread.id,
      body,
      direction: 'outbound',
      isRead: true,
      createdAt: now
    };

    messages.push(message);
    this._saveToStorage('messages', messages);

    const threads = this._getFromStorage('messagethreads');
    const idx = threads.findIndex((t) => t.id === thread.id);
    if (idx !== -1) {
      threads[idx].lastMessageSnippet = body.slice(0, 200);
      threads[idx].lastMessageAt = now;
      // unreadCount remains unchanged for current user when sending
      this._saveToStorage('messagethreads', threads);
    }

    return {
      success: true,
      message: 'Message sent',
      thread: {
        id: thread.id,
        subject: thread.subject || subject || ''
      },
      sentMessage: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt
      }
    };
  }

  // replyToMessageThread(threadId, body)
  replyToMessageThread(threadId, body) {
    const profile = this._getCurrentUserProfileRecord();
    if (!profile) {
      return { success: false, message: 'Not authenticated', replyMessage: null };
    }

    if (!body) {
      return { success: false, message: 'Body is required', replyMessage: null };
    }

    const threads = this._getFromStorage('messagethreads');
    const thread = threads.find((t) => t.id === threadId) || null;
    if (!thread) {
      return { success: false, message: 'Thread not found', replyMessage: null };
    }

    const messages = this._getFromStorage('messages');
    const now = this._now();

    const message = {
      id: this._generateId('message'),
      threadId: thread.id,
      body,
      direction: 'outbound',
      isRead: true,
      createdAt: now
    };

    messages.push(message);
    this._saveToStorage('messages', messages);

    const idx = threads.findIndex((t) => t.id === thread.id);
    if (idx !== -1) {
      threads[idx].lastMessageSnippet = body.slice(0, 200);
      threads[idx].lastMessageAt = now;
      this._saveToStorage('messagethreads', threads);
    }

    return {
      success: true,
      message: 'Reply sent',
      replyMessage: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt
      }
    };
  }

  // searchMembers(query)
  searchMembers(query) {
    if (!query) return [];
    const profiles = this._getFromStorage('memberprofiles');
    const categories = this._getFromStorage('hobbycategories');

    return profiles
      .filter(
        (p) =>
          this._caseInsensitiveIncludes(p.username || '', query) ||
          this._caseInsensitiveIncludes(p.bio || '', query)
      )
      .map((p) => {
        const primaryCategory = p.primaryHobbyCategoryId
          ? categories.find((c) => c.id === p.primaryHobbyCategoryId) || null
          : null;
        const bioSnippet = (p.bio || '').slice(0, 160);
        return {
          id: p.id,
          username: p.username,
          avatarUrl: p.avatarUrl || null,
          bioSnippet,
          primaryHobbyCategoryName: primaryCategory ? primaryCategory.name : null
        };
      });
  }

  // searchExploreDiscussions(categoryId, dateRange, sort, page = 1, pageSize = 20)
  searchExploreDiscussions(categoryId, dateRange, sort, page, pageSize) {
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('hobbycategories');

    let filtered = discussions.slice();

    if (categoryId) {
      filtered = filtered.filter((d) => d.categoryId === categoryId);
    }
    if (dateRange) {
      filtered = filtered.filter((d) => this._isWithinDateRange(d.createdAt, dateRange));
    }

    const sortKey = sort || 'most_recent';
    filtered.sort((a, b) => {
      if (sortKey === 'replies_desc') {
        return (b.replyCount || 0) - (a.replyCount || 0);
      }
      if (sortKey === 'likes_desc') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      // most_recent default
      const aTime = a.createdAt || '';
      const bTime = b.createdAt || '';
      return bTime.localeCompare(aTime);
    });

    const pageNum = page || 1;
    const size = pageSize || 20;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / size) || 1;
    const start = (pageNum - 1) * size;
    const items = filtered.slice(start, start + size);

    const discussionsResult = items.map((d) => {
      const category = categories.find((c) => c.id === d.categoryId) || null;
      return {
        id: d.id,
        title: d.title,
        excerpt: (d.body || '').slice(0, 200),
        categoryName: category ? category.name : null,
        replyCount: d.replyCount || 0,
        likeCount: d.likeCount || 0,
        createdAt: d.createdAt
      };
    });

    return {
      discussions: discussionsResult,
      page: pageNum,
      pageSize: size,
      totalItems,
      totalPages
    };
  }

  // getBookmarkedDiscussions(page = 1, pageSize = 20)
  getBookmarkedDiscussions(page, pageSize) {
    const bookmarks = this._getFromStorage('bookmarks');
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('hobbycategories');

    const sortedBookmarks = bookmarks
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const pageNum = page || 1;
    const size = pageSize || 20;
    const totalItems = sortedBookmarks.length;
    const totalPages = Math.ceil(totalItems / size) || 1;
    const start = (pageNum - 1) * size;
    const pageBookmarks = sortedBookmarks.slice(start, start + size);

    const discussionsResult = pageBookmarks
      .map((b) => {
        const d = discussions.find((dd) => dd.id === b.discussionId) || null;
        if (!d) return null;
        const category = categories.find((c) => c.id === d.categoryId) || null;
        return {
          id: d.id,
          title: d.title,
          categoryName: category ? category.name : null,
          replyCount: d.replyCount || 0,
          likeCount: d.likeCount || 0,
          createdAt: d.createdAt
        };
      })
      .filter(Boolean);

    return {
      discussions: discussionsResult,
      page: pageNum,
      pageSize: size,
      totalItems,
      totalPages
    };
  }

  // searchEvents(locationCity, month, year, categoryId, tags, sort, page, pageSize)
  searchEvents(locationCity, month, year, categoryId, tags, sort, page, pageSize) {
    const events = this._getFromStorage('events');
    const categories = this._getFromStorage('hobbycategories');
    const rsvps = this._getFromStorage('eventrsvps');

    let filtered = events.slice();

    if (locationCity) {
      const cityLower = locationCity.toLowerCase();
      filtered = filtered.filter(
        (e) => (e.locationCity || '').toLowerCase() === cityLower
      );
    }

    if (month || year) {
      filtered = filtered.filter((e) => {
        const start = new Date(e.startDateTime);
        if (Number.isNaN(start.getTime())) return false;
        if (year && start.getFullYear() !== year) return false;
        if (month && start.getMonth() + 1 !== month) return false;
        return true;
      });
    }

    if (categoryId) {
      filtered = filtered.filter((e) => e.categoryId === categoryId);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const tagSet = new Set(tags.map((t) => t.toLowerCase()));
      filtered = filtered.filter((e) => {
        if (!Array.isArray(e.tags)) return false;
        return e.tags.some((t) => tagSet.has(String(t).toLowerCase()));
      });
    }

    const sortKey = sort || 'date_soonest_first';
    filtered.sort((a, b) => {
      const aTime = new Date(a.startDateTime).getTime();
      const bTime = new Date(b.startDateTime).getTime();
      if (sortKey === 'date_latest_first') {
        return bTime - aTime;
      }
      return aTime - bTime; // soonest first
    });

    const pageNum = page || 1;
    const size = pageSize || 20;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / size) || 1;
    const start = (pageNum - 1) * size;
    const items = filtered.slice(start, start + size);

    const eventsResult = items.map((e) => {
      const category = e.categoryId
        ? categories.find((c) => c.id === e.categoryId) || null
        : null;
      const rsvp = rsvps.find((r) => r.eventId === e.id) || null;
      return {
        id: e.id,
        title: e.title,
        categoryName: category ? category.name : null,
        locationName: e.locationName || '',
        locationCity: e.locationCity || '',
        locationState: e.locationState || '',
        locationCountry: e.locationCountry || '',
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime || null,
        tags: e.tags || [],
        rsvpStatus: rsvp ? rsvp.status : null
      };
    });

    return {
      events: eventsResult,
      page: pageNum,
      pageSize: size,
      totalItems,
      totalPages
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { event: null, rsvp: null };
    }

    const categories = this._getFromStorage('hobbycategories');
    const rsvps = this._getFromStorage('eventrsvps');

    const category = event.categoryId
      ? categories.find((c) => c.id === event.categoryId) || null
      : null;
    const rsvp = rsvps.find((r) => r.eventId === event.id) || null;

    return {
      event: {
        id: event.id,
        title: event.title,
        description: event.description || '',
        categoryName: category ? category.name : null,
        locationName: event.locationName || '',
        locationCity: event.locationCity || '',
        locationState: event.locationState || '',
        locationCountry: event.locationCountry || '',
        address: event.address || '',
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime || null,
        tags: event.tags || [],
        rsvpCountGoing: event.rsvpCountGoing || 0,
        rsvpCountInterested: event.rsvpCountInterested || 0,
        rsvpCountNotGoing: event.rsvpCountNotGoing || 0
      },
      rsvp: rsvp
        ? {
            status: rsvp.status,
            note: rsvp.note || '',
            respondedAt: rsvp.respondedAt
          }
        : null
    };
  }

  // rsvpToEvent(eventId, status, note)
  rsvpToEvent(eventId, status, note) {
    const validStatuses = ['going', 'interested', 'not_going'];
    const normalizedStatus = validStatuses.includes(status) ? status : 'interested';

    const events = this._getFromStorage('events');
    const idx = events.findIndex((e) => e.id === eventId);
    if (idx === -1) {
      return { success: false, message: 'Event not found', rsvp: null };
    }

    const rsvps = this._getFromStorage('eventrsvps');
    const now = this._now();

    let rsvp = rsvps.find((r) => r.eventId === eventId) || null;
    const event = events[idx];

    // Adjust counts based on old status
    const decCount = (oldStatus) => {
      if (!oldStatus) return;
      if (oldStatus === 'going') event.rsvpCountGoing = Math.max(0, (event.rsvpCountGoing || 0) - 1);
      if (oldStatus === 'interested') event.rsvpCountInterested = Math.max(0, (event.rsvpCountInterested || 0) - 1);
      if (oldStatus === 'not_going') event.rsvpCountNotGoing = Math.max(0, (event.rsvpCountNotGoing || 0) - 1);
    };

    const incCount = (newStatus) => {
      if (newStatus === 'going') event.rsvpCountGoing = (event.rsvpCountGoing || 0) + 1;
      if (newStatus === 'interested') event.rsvpCountInterested = (event.rsvpCountInterested || 0) + 1;
      if (newStatus === 'not_going') event.rsvpCountNotGoing = (event.rsvpCountNotGoing || 0) + 1;
    };

    if (!rsvp) {
      rsvp = {
        id: this._generateId('eventrsvp'),
        eventId,
        status: normalizedStatus,
        note: note || '',
        respondedAt: now
      };
      rsvps.push(rsvp);
      incCount(normalizedStatus);
    } else {
      decCount(rsvp.status);
      rsvp.status = normalizedStatus;
      rsvp.note = note || rsvp.note || '';
      rsvp.respondedAt = now;
      incCount(normalizedStatus);
    }

    events[idx] = event;
    this._saveToStorage('events', events);
    this._saveToStorage('eventrsvps', rsvps);

    return {
      success: true,
      message: 'RSVP updated',
      rsvp: {
        status: rsvp.status,
        note: rsvp.note,
        respondedAt: rsvp.respondedAt
      }
    };
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const staticpages = this._getFromStorage('staticpages');
    const page = staticpages.find((p) => p.slug === pageSlug) || null;
    if (!page) {
      return {
        title: '',
        bodyHtml: '',
        lastUpdatedAt: null
      };
    }

    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      lastUpdatedAt: page.lastUpdatedAt || null
    };
  }

  // getContactFormConfig()
  getContactFormConfig() {
    const stored = localStorage.getItem('contactFormConfig');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }

    const config = {
      reasonOptions: [
        {
          value: 'technical_issue',
          label: 'Technical issue',
          description: 'Report a bug or problem with the site.'
        },
        {
          value: 'abuse_report',
          label: 'Abuse / harassment',
          description: 'Report abusive or harassing behavior.'
        },
        {
          value: 'general_feedback',
          label: 'General feedback',
          description: 'Suggestions or feedback about the community.'
        },
        {
          value: 'account_question',
          label: 'Account question',
          description: 'Help with your account or profile.'
        },
        {
          value: 'other',
          label: 'Other',
          description: 'Anything else you want to contact us about.'
        }
      ],
      expectedResponseTimeText: 'We typically reply within 2 business days.'
    };

    localStorage.setItem('contactFormConfig', JSON.stringify(config));
    return config;
  }

  // submitContactForm(reason, subject, message, includeScreenshot)
  submitContactForm(reason, subject, message, includeScreenshot) {
    if (!reason || !subject || !message) {
      return { success: false, message: 'Missing required fields', ticketId: null };
    }

    const tickets = this._getFromStorage('contactTickets');
    const now = this._now();

    const ticket = {
      id: this._generateId('ticket'),
      reason,
      subject,
      message,
      includeScreenshot: !!includeScreenshot,
      createdAt: now
    };

    tickets.push(ticket);
    this._saveToStorage('contactTickets', tickets);

    return {
      success: true,
      message: 'Contact form submitted',
      ticketId: ticket.id
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