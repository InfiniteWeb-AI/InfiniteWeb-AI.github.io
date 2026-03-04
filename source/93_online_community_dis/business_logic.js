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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const tables = [
      'categories',
      'discussions',
      'posts',
      'reactions',
      'tags',
      'discussion_tags',
      'member_profiles',
      'private_messages',
      'content_reports',
      'polls',
      'poll_options',
      'poll_responses'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // account_settings is handled lazily by _getOrCreateAccountSettings
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _indexById(items) {
    const map = {};
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _paginate(items, page, pageSize) {
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const totalCount = items.length;
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;
    return {
      items: items.slice(start, end),
      totalCount: totalCount,
      page: safePage,
      pageSize: safePageSize
    };
  }

  _detectLinks(text) {
    if (!text || typeof text !== 'string') {
      return { containsLink: false, links: [] };
    }
    const tokens = text.split(' ');
    const links = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.startsWith('http://') || t.startsWith('https://')) {
        links.push(t);
      }
    }
    return { containsLink: links.length > 0, links: links };
  }

  _computeTrendingScore(discussion) {
    if (!discussion) return 0;
    const score = discussion.score || 0;
    const replies = discussion.replyCount || 0;
    const views = discussion.viewCount || 0;
    return score * 2 + replies + views * 0.1;
  }

  _latestActivityDate(discussion) {
    return this._parseDate(discussion.lastReplyAt || discussion.createdAt || this._now()) || new Date();
  }

  _isWithinDateRange(date, range) {
    if (!date) return false;
    if (!range || range === 'any_time') return true;
    const now = new Date();
    let earliest = null;
    if (range === 'last_24_hours') {
      earliest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range === 'last_7_days') {
      earliest = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'last_30_days') {
      earliest = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'last_6_months') {
      earliest = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);
    } else if (range === 'last_12_months') {
      earliest = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
    if (!earliest) return true;
    return date >= earliest;
  }

  _buildSnippet(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    const limit = maxLength || 160;
    if (text.length <= limit) return text;
    return text.substring(0, limit - 3) + '...';
  }

  _getOrCreateAccountSettings() {
    const raw = localStorage.getItem('account_settings');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Treat non-object values (e.g., an empty array) as invalid and recreate defaults
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {}
    }
    const now = this._now();
    const settings = {
      id: 'account_settings_1',
      displayName: 'sample_user',
      bio: '',
      timezone: 'utc',
      dailySummaryEnabled: false,
      createdAt: now,
      updatedAt: now
    };
    localStorage.setItem('account_settings', JSON.stringify(settings));
    return settings;
  }

  _getCurrentDisplayName() {
    const settings = this._getOrCreateAccountSettings();
    return settings.displayName || 'Anonymous';
  }

  _ensureTagsExist(tagNames) {
    const result = [];
    if (!tagNames || !Array.isArray(tagNames) || tagNames.length === 0) {
      return result;
    }
    let tags = this._getFromStorage('tags');
    const now = this._now();
    for (let i = 0; i < tagNames.length; i++) {
      const rawName = tagNames[i];
      if (!rawName || typeof rawName !== 'string') continue;
      const name = rawName.trim();
      if (!name) continue;
      let existing = null;
      for (let j = 0; j < tags.length; j++) {
        if (tags[j].name && tags[j].name.toLowerCase() === name.toLowerCase()) {
          existing = tags[j];
          break;
        }
      }
      if (!existing) {
        existing = {
          id: this._generateId('tag'),
          name: name,
          description: '',
          followerCount: 0,
          isFollowed: false,
          createdAt: now
        };
        tags.push(existing);
      }
      result.push(existing);
    }
    this._saveToStorage('tags', tags);
    return result;
  }

  _getCategoryBySlug(categorySlug, createIfMissing) {
    let categories = this._getFromStorage('categories');
    let found = null;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].slug === categorySlug) {
        found = categories[i];
        break;
      }
    }
    if (found || !createIfMissing) {
      return found;
    }
    const slugToName = {
      web_development: 'Web Development',
      product_feedback: 'Product Feedback',
      design: 'Design',
      career: 'Career',
      general_discussion: 'General Discussion'
    };
    const now = this._now();
    const name = slugToName[categorySlug] || categorySlug;
    const category = {
      id: this._generateId('cat'),
      slug: categorySlug,
      name: name,
      description: '',
      discussionCount: 0,
      lastActivityAt: null,
      createdAt: now,
      position: categories.length
    };
    categories.push(category);
    this._saveToStorage('categories', categories);
    return category;
  }

  _augmentDiscussion(discussion, categoriesById, tagsById) {
    if (!discussion) return null;
    const category = categoriesById[discussion.categoryId] || null;
    const tagObjs = [];
    if (discussion.tagIds && Array.isArray(discussion.tagIds)) {
      for (let i = 0; i < discussion.tagIds.length; i++) {
        const t = tagsById[discussion.tagIds[i]];
        if (t) tagObjs.push(t);
      }
    }
    return Object.assign({}, discussion, {
      category: category || null,
      tags: tagObjs
    });
  }

  _augmentPost(post, discussion, allPosts, memberProfilesById) {
    if (!post) return null;
    const parentPost = post.parentPostId
      ? allPosts.find(function (p) { return p.id === post.parentPostId; }) || null
      : null;
    const authorProfile = post.authorProfileId
      ? memberProfilesById[post.authorProfileId] || null
      : null;
    return Object.assign({}, post, {
      discussion: discussion || null,
      parentPost: parentPost,
      authorProfile: authorProfile
    });
  }

  _applyDiscussionSearchAndFilters(query, filters, sortBy, page, pageSize) {
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');
    const posts = this._getFromStorage('posts');

    const categoriesById = this._indexById(categories);
    const tagsById = this._indexById(tags);

    const normalizedQuery = query && typeof query === 'string' ? query.toLowerCase().trim() : '';

    const filtered = [];
    for (let i = 0; i < discussions.length; i++) {
      const d = discussions[i];
      if (!d) continue;

      if (normalizedQuery) {
        const titleMatch = (d.title || '').toLowerCase().indexOf(normalizedQuery) !== -1;
        const bodyMatch = (d.body || '').toLowerCase().indexOf(normalizedQuery) !== -1;
        let tagMatch = false;
        if (d.tagIds && Array.isArray(d.tagIds)) {
          for (let j = 0; j < d.tagIds.length; j++) {
            const tag = tagsById[d.tagIds[j]];
            if (tag && tag.name && tag.name.toLowerCase().indexOf(normalizedQuery) !== -1) {
              tagMatch = true;
              break;
            }
          }
        }
        if (!titleMatch && !bodyMatch && !tagMatch) {
          continue;
        }
      }

      if (filters && filters.categorySlug) {
        const cat = categoriesById[d.categoryId];
        if (!cat || cat.slug !== filters.categorySlug) {
          continue;
        }
      }

      if (filters && typeof filters.minReplies === 'number') {
        const rc = d.replyCount || 0;
        if (rc < filters.minReplies) continue;
      }

      if (filters && filters.dateRange && filters.dateRange !== 'any_time') {
        const date = this._parseDate(d.lastReplyAt || d.createdAt);
        if (!this._isWithinDateRange(date, filters.dateRange)) continue;
      }

      filtered.push(d);
    }

    const self = this;
    filtered.sort(function (a, b) {
      if (sortBy === 'newest') {
        const da = self._latestActivityDate(a);
        const db = self._latestActivityDate(b);
        return db - da;
      }
      if (sortBy === 'oldest') {
        const da = self._latestActivityDate(a);
        const db = self._latestActivityDate(b);
        return da - db;
      }
      if (sortBy === 'most_replied') {
        const ra = a.replyCount || 0;
        const rb = b.replyCount || 0;
        return rb - ra;
      }
      if (sortBy === 'most_upvoted') {
        const sa = a.score || 0;
        const sb = b.score || 0;
        return sb - sa;
      }
      // relevance (default)
      const qa = self._computeRelevanceScore(a, normalizedQuery, tagsById);
      const qb = self._computeRelevanceScore(b, normalizedQuery, tagsById);
      return qb - qa;
    });

    const paged = this._paginate(filtered, page, pageSize);
    const results = [];

    for (let k = 0; k < paged.items.length; k++) {
      const d = paged.items[k];
      const category = categoriesById[d.categoryId] || null;
      const discussionTags = [];
      if (d.tagIds && Array.isArray(d.tagIds)) {
        for (let t = 0; t < d.tagIds.length; t++) {
          const tagObj = tagsById[d.tagIds[t]];
          if (tagObj) discussionTags.push(tagObj);
        }
      }
      const tagNames = discussionTags.map(function (t) { return t.name; });
      const originalPost = posts.find(function (p) {
        return p.discussionId === d.id && p.isOriginalPost;
      }) || null;
      const snippetSource = d.body || (originalPost ? originalPost.body : '');
      const augmentedDiscussion = this._augmentDiscussion(d, categoriesById, tagsById);
      results.push({
        discussion: augmentedDiscussion,
        categoryName: category ? category.name : null,
        tagNames: tagNames,
        originalAuthorDisplayName: originalPost ? originalPost.authorDisplayName : null,
        snippet: this._buildSnippet(snippetSource, 160)
      });
    }

    return {
      results: results,
      totalCount: paged.totalCount,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  _computeRelevanceScore(discussion, normalizedQuery, tagsById) {
    if (!normalizedQuery) return 0;
    let score = 0;
    const title = (discussion.title || '').toLowerCase();
    const body = (discussion.body || '').toLowerCase();
    if (title.indexOf(normalizedQuery) !== -1) score += 10;
    if (body.indexOf(normalizedQuery) !== -1) score += 5;
    if (discussion.tagIds && Array.isArray(discussion.tagIds)) {
      for (let i = 0; i < discussion.tagIds.length; i++) {
        const tag = tagsById[discussion.tagIds[i]];
        if (tag && tag.name && tag.name.toLowerCase().indexOf(normalizedQuery) !== -1) {
          score += 3;
          break;
        }
      }
    }
    score += (discussion.score || 0);
    score += (discussion.replyCount || 0) * 0.5;
    return score;
  }

  _createPollWithOptions(discussionId, pollConfig) {
    if (!pollConfig || !pollConfig.question || !pollConfig.options || pollConfig.options.length === 0) {
      return null;
    }
    let polls = this._getFromStorage('polls');
    let pollOptions = this._getFromStorage('poll_options');

    const now = new Date();
    const durationDays = pollConfig.durationDays && pollConfig.durationDays > 0 ? pollConfig.durationDays : 7;
    const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const poll = {
      id: this._generateId('poll'),
      discussionId: discussionId,
      question: pollConfig.question,
      multipleChoiceAllowed: !!pollConfig.multipleChoiceAllowed,
      startAt: now.toISOString(),
      endAt: end.toISOString(),
      isClosed: false
    };
    polls.push(poll);

    const options = [];
    for (let i = 0; i < pollConfig.options.length; i++) {
      const text = pollConfig.options[i];
      if (!text || typeof text !== 'string') continue;
      const opt = {
        id: this._generateId('pollopt'),
        pollId: poll.id,
        optionText: text,
        voteCount: 0
      };
      pollOptions.push(opt);
      options.push(opt);
    }

    this._saveToStorage('polls', polls);
    this._saveToStorage('poll_options', pollOptions);

    return {
      poll: poll,
      options: options
    };
  }

  _enforceSingleChoicePollResponse(poll, option, pollResponses, pollOptions) {
    const now = this._now();
    let existing = null;
    for (let i = 0; i < pollResponses.length; i++) {
      if (pollResponses[i].pollId === poll.id) {
        existing = pollResponses[i];
        break;
      }
    }

    const optionsById = this._indexById(pollOptions);
    if (!existing) {
      const response = {
        id: this._generateId('pollresp'),
        pollId: poll.id,
        optionId: option.id,
        createdAt: now
      };
      pollResponses.push(response);
      const opt = optionsById[option.id];
      if (opt) {
        opt.voteCount = (opt.voteCount || 0) + 1;
      }
      return response;
    }

    if (existing.optionId === option.id) {
      return existing;
    }

    const oldOpt = optionsById[existing.optionId];
    if (oldOpt && oldOpt.voteCount && oldOpt.voteCount > 0) {
      oldOpt.voteCount = oldOpt.voteCount - 1;
    }
    const newOpt = optionsById[option.id];
    if (newOpt) {
      newOpt.voteCount = (newOpt.voteCount || 0) + 1;
    }
    existing.optionId = option.id;
    existing.createdAt = now;
    return existing;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomeFeed(trendingLimit, popularLimit, latestLimit)
  getHomeFeed(trendingLimit, popularLimit, latestLimit) {
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');
    const posts = this._getFromStorage('posts');

    const categoriesById = this._indexById(categories);
    const tagsById = this._indexById(tags);

    const originalPostByDiscussion = {};
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      if (p.isOriginalPost && !originalPostByDiscussion[p.discussionId]) {
        originalPostByDiscussion[p.discussionId] = p;
      }
    }

    const self = this;
    const trendingSorted = discussions.slice().sort(function (a, b) {
      return self._computeTrendingScore(b) - self._computeTrendingScore(a);
    });
    const popularSorted = discussions.slice().sort(function (a, b) {
      const sa = a.score || 0;
      const sb = b.score || 0;
      if (sb !== sa) return sb - sa;
      const ra = a.replyCount || 0;
      const rb = b.replyCount || 0;
      return rb - ra;
    });
    const latestSorted = discussions.slice().sort(function (a, b) {
      const da = self._latestActivityDate(a);
      const db = self._latestActivityDate(b);
      return db - da;
    });

    const tLimit = typeof trendingLimit === 'number' ? trendingLimit : 5;
    const pLimit = typeof popularLimit === 'number' ? popularLimit : 5;
    const lLimit = typeof latestLimit === 'number' ? latestLimit : 10;

    function mapEntry(d) {
      const augmentedDiscussion = self._augmentDiscussion(d, categoriesById, tagsById);
      const category = categoriesById[d.categoryId] || null;
      const discTags = [];
      if (d.tagIds && Array.isArray(d.tagIds)) {
        for (let i = 0; i < d.tagIds.length; i++) {
          const t = tagsById[d.tagIds[i]];
          if (t) discTags.push(t);
        }
      }
      const tagNames = discTags.map(function (t) { return t.name; });
      const op = originalPostByDiscussion[d.id] || null;
      return {
        discussion: augmentedDiscussion,
        categoryName: category ? category.name : null,
        tagNames: tagNames,
        originalAuthorDisplayName: op ? op.authorDisplayName : null,
        lastReplyAt: d.lastReplyAt || d.createdAt || null
      };
    }

    const trending = trendingSorted.slice(0, tLimit).map(mapEntry);
    const popular = popularSorted.slice(0, pLimit).map(mapEntry);
    const latest = latestSorted.slice(0, lLimit).map(mapEntry);

    return {
      trending: trending,
      popular: popular,
      latest: latest
    };
  }

  // searchDiscussions(query, filters, sortBy, page, pageSize)
  searchDiscussions(query, filters, sortBy, page, pageSize) {
    const effectiveFilters = filters || {};
    const effectiveSort = sortBy || 'relevance';
    const effectivePage = page || 1;
    const effectivePageSize = pageSize || 20;

    // Instrumentation for task completion tracking (task_2 search params)
    try {
      localStorage.setItem(
        'task2_searchParams',
        JSON.stringify({ query: query, filters: effectiveFilters, sortBy: effectiveSort })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return this._applyDiscussionSearchAndFilters(query, effectiveFilters, effectiveSort, effectivePage, effectivePageSize);
  }

  // getSearchFilterOptions()
  getSearchFilterOptions() {
    return {
      dateRanges: [
        { id: 'any_time', label: 'Any time' },
        { id: 'last_24_hours', label: 'Last 24 hours' },
        { id: 'last_7_days', label: 'Last 7 days' },
        { id: 'last_30_days', label: 'Last 30 days' },
        { id: 'last_6_months', label: 'Last 6 months' },
        { id: 'last_12_months', label: 'Last 12 months' }
      ],
      replyCountPresets: [
        { minReplies: 0, label: 'Any' },
        { minReplies: 1, label: '1+' },
        { minReplies: 5, label: '5+' },
        { minReplies: 10, label: '10+' },
        { minReplies: 20, label: '20+' }
      ]
    };
  }

  // getCategoriesOverview()
  getCategoriesOverview() {
    const categories = this._getFromStorage('categories');
    return categories;
  }

  // getCategoryDiscussions(categorySlug, sortBy, filters, page, pageSize)
  getCategoryDiscussions(categorySlug, sortBy, filters, page, pageSize) {
    const categories = this._getFromStorage('categories');
    const discussions = this._getFromStorage('discussions');
    const tags = this._getFromStorage('tags');
    const posts = this._getFromStorage('posts');

    const categoriesById = this._indexById(categories);
    const tagsById = this._indexById(tags);

    let category = null;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].slug === categorySlug) {
        category = categories[i];
        break;
      }
    }

    if (!category) {
      return {
        category: null,
        discussions: [],
        page: page || 1,
        pageSize: pageSize || 20,
        totalCount: 0
      };
    }

    const effectiveFilters = filters || {};
    const effectiveSort = sortBy || 'latest_activity';
    const filtered = [];
    for (let i = 0; i < discussions.length; i++) {
      const d = discussions[i];
      if (d.categoryId !== category.id) continue;

      if (effectiveFilters && typeof effectiveFilters.minReplies === 'number') {
        const rc = d.replyCount || 0;
        if (rc < effectiveFilters.minReplies) continue;
      }

      if (effectiveFilters && effectiveFilters.dateRange && effectiveFilters.dateRange !== 'any_time') {
        const date = this._parseDate(d.lastReplyAt || d.createdAt);
        if (!this._isWithinDateRange(date, effectiveFilters.dateRange)) continue;
      }

      if (effectiveFilters && typeof effectiveFilters.hasPoll === 'boolean') {
        const flag = !!d.hasPoll;
        if (flag !== effectiveFilters.hasPoll) continue;
      }

      filtered.push(d);
    }

    const self = this;
    filtered.sort(function (a, b) {
      if (effectiveSort === 'latest_activity') {
        const da = self._latestActivityDate(a);
        const db = self._latestActivityDate(b);
        return db - da;
      }
      if (effectiveSort === 'newest') {
        const da = self._parseDate(a.createdAt) || new Date();
        const db = self._parseDate(b.createdAt) || new Date();
        return db - da;
      }
      if (effectiveSort === 'oldest') {
        const da = self._parseDate(a.createdAt) || new Date();
        const db = self._parseDate(b.createdAt) || new Date();
        return da - db;
      }
      if (effectiveSort === 'most_replied') {
        const ra = a.replyCount || 0;
        const rb = b.replyCount || 0;
        return rb - ra;
      }
      if (effectiveSort === 'most_upvoted') {
        const sa = a.score || 0;
        const sb = b.score || 0;
        return sb - sa;
      }
      const da = self._latestActivityDate(a);
      const db = self._latestActivityDate(b);
      return db - da;
    });

    const paged = this._paginate(filtered, page || 1, pageSize || 20);
    const list = [];
    for (let i = 0; i < paged.items.length; i++) {
      const d = paged.items[i];
      const augmentedDiscussion = this._augmentDiscussion(d, categoriesById, tagsById);
      const discussionTags = [];
      if (d.tagIds && Array.isArray(d.tagIds)) {
        for (let j = 0; j < d.tagIds.length; j++) {
          const t = tagsById[d.tagIds[j]];
          if (t) discussionTags.push(t);
        }
      }
      const tagNames = discussionTags.map(function (t) { return t.name; });
      const originalPost = posts.find(function (p) {
        return p.discussionId === d.id && p.isOriginalPost;
      }) || null;
      list.push({
        discussion: augmentedDiscussion,
        tagNames: tagNames,
        originalAuthorDisplayName: originalPost ? originalPost.authorDisplayName : null
      });
    }

    return {
      category: category,
      discussions: list,
      page: paged.page,
      pageSize: paged.pageSize,
      totalCount: paged.totalCount
    };
  }

  // createDiscussion(categorySlug, title, body, tagNames, subscribe, pollConfig)
  createDiscussion(categorySlug, title, body, tagNames, subscribe, pollConfig) {
    const category = this._getCategoryBySlug(categorySlug, true);
    const now = this._now();

    const tags = this._ensureTagsExist(tagNames || []);
    const tagIds = tags.map(function (t) { return t.id; });

    let discussions = this._getFromStorage('discussions');
    let posts = this._getFromStorage('posts');
    let discussionTags = this._getFromStorage('discussion_tags');
    let categories = this._getFromStorage('categories');

    const discussion = {
      id: this._generateId('disc'),
      categoryId: category.id,
      title: title,
      body: body,
      tagIds: tagIds,
      createdAt: now,
      updatedAt: now,
      replyCount: 0,
      viewCount: 0,
      score: 0,
      lastReplyAt: null,
      trendingScore: 0,
      isSubscribed: !!subscribe,
      isBookmarked: false,
      hasPoll: !!pollConfig
    };
    discussions.push(discussion);

    const displayName = this._getCurrentDisplayName();
    const linkInfo = this._detectLinks(body);

    const originalPost = {
      id: this._generateId('post'),
      discussionId: discussion.id,
      parentPostId: null,
      isOriginalPost: true,
      authorDisplayName: displayName,
      authorProfileId: null,
      body: body,
      createdAt: now,
      updatedAt: null,
      upvoteCount: 0,
      likeCount: 0,
      replyCount: 0,
      containsLink: linkInfo.containsLink,
      links: linkInfo.links
    };
    posts.push(originalPost);

    for (let i = 0; i < tags.length; i++) {
      const dt = {
        id: this._generateId('dt'),
        discussionId: discussion.id,
        tagId: tags[i].id,
        createdAt: now
      };
      discussionTags.push(dt);
    }

    for (let c = 0; c < categories.length; c++) {
      if (categories[c].id === category.id) {
        categories[c].discussionCount = (categories[c].discussionCount || 0) + 1;
        categories[c].lastActivityAt = now;
        break;
      }
    }

    this._saveToStorage('discussions', discussions);
    this._saveToStorage('posts', posts);
    this._saveToStorage('discussion_tags', discussionTags);
    this._saveToStorage('categories', categories);

    let pollResult = null;
    if (pollConfig && pollConfig.question && pollConfig.options && pollConfig.options.length > 0) {
      pollResult = this._createPollWithOptions(discussion.id, pollConfig);
      // mark discussion as having a poll
      discussions = this._getFromStorage('discussions');
      for (let i = 0; i < discussions.length; i++) {
        if (discussions[i].id === discussion.id) {
          discussions[i].hasPoll = true;
          break;
        }
      }
      this._saveToStorage('discussions', discussions);
    }

    return {
      discussion: discussion,
      originalPost: originalPost,
      tags: tags,
      poll: pollResult,
      message: 'Discussion created'
    };
  }

  // getDiscussionThread(discussionId)
  getDiscussionThread(discussionId) {
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');
    const posts = this._getFromStorage('posts');
    const polls = this._getFromStorage('polls');
    const pollOptions = this._getFromStorage('poll_options');
    const pollResponses = this._getFromStorage('poll_responses');
    const memberProfiles = this._getFromStorage('member_profiles');

    const categoriesById = this._indexById(categories);
    const tagsById = this._indexById(tags);
    const memberProfilesById = this._indexById(memberProfiles);

    const discussion = discussions.find(function (d) { return d.id === discussionId; }) || null;
    if (!discussion) {
      return {
        discussion: null,
        category: null,
        tags: [],
        originalPost: null,
        replies: [],
        poll: null,
        pollOptions: [],
        pollResponse: null
      };
    }

    const category = categoriesById[discussion.categoryId] || null;
    const discussionTags = [];
    if (discussion.tagIds && Array.isArray(discussion.tagIds)) {
      for (let i = 0; i < discussion.tagIds.length; i++) {
        const t = tagsById[discussion.tagIds[i]];
        if (t) discussionTags.push(t);
      }
    }

    const augmentedDiscussion = this._augmentDiscussion(discussion, categoriesById, tagsById);

    const threadPosts = posts.filter(function (p) { return p.discussionId === discussion.id; });
    let originalPost = null;
    const replies = [];
    for (let i = 0; i < threadPosts.length; i++) {
      const p = threadPosts[i];
      const augmentedPost = this._augmentPost(p, augmentedDiscussion, threadPosts, memberProfilesById);
      if (p.isOriginalPost) {
        originalPost = augmentedPost;
      } else {
        replies.push(augmentedPost);
      }
    }

    const poll = polls.find(function (pl) { return pl.discussionId === discussion.id; }) || null;
    const pollOpts = poll
      ? pollOptions.filter(function (po) { return po.pollId === poll.id; })
      : [];
    const pollResp = poll
      ? pollResponses.find(function (pr) { return pr.pollId === poll.id; }) || null
      : null;

    return {
      discussion: augmentedDiscussion,
      category: category,
      tags: discussionTags,
      originalPost: originalPost,
      replies: replies,
      poll: poll,
      pollOptions: pollOpts,
      pollResponse: pollResp
    };
  }

  // replyToDiscussion(discussionId, body)
  replyToDiscussion(discussionId, body) {
    let discussions = this._getFromStorage('discussions');
    let posts = this._getFromStorage('posts');
    let categories = this._getFromStorage('categories');

    const discussion = discussions.find(function (d) { return d.id === discussionId; }) || null;
    if (!discussion) {
      return {
        newPost: null,
        updatedReplyCount: null,
        message: 'Discussion not found'
      };
    }

    const now = this._now();
    const displayName = this._getCurrentDisplayName();
    const linkInfo = this._detectLinks(body);

    const newPost = {
      id: this._generateId('post'),
      discussionId: discussionId,
      parentPostId: null,
      isOriginalPost: false,
      authorDisplayName: displayName,
      authorProfileId: null,
      body: body,
      createdAt: now,
      updatedAt: null,
      upvoteCount: 0,
      likeCount: 0,
      replyCount: 0,
      containsLink: linkInfo.containsLink,
      links: linkInfo.links
    };
    posts.push(newPost);

    discussion.replyCount = (discussion.replyCount || 0) + 1;
    discussion.lastReplyAt = now;
    discussion.updatedAt = now;

    for (let c = 0; c < categories.length; c++) {
      if (categories[c].id === discussion.categoryId) {
        categories[c].lastActivityAt = now;
        break;
      }
    }

    this._saveToStorage('discussions', discussions);
    this._saveToStorage('posts', posts);
    this._saveToStorage('categories', categories);

    return {
      newPost: newPost,
      updatedReplyCount: discussion.replyCount,
      message: 'Reply posted'
    };
  }

  // replyToPost(parentPostId, body)
  replyToPost(parentPostId, body) {
    let posts = this._getFromStorage('posts');
    let discussions = this._getFromStorage('discussions');
    let categories = this._getFromStorage('categories');

    const parentPost = posts.find(function (p) { return p.id === parentPostId; }) || null;
    if (!parentPost) {
      return {
        newPost: null,
        updatedParentReplyCount: null,
        message: 'Parent post not found'
      };
    }

    const discussion = discussions.find(function (d) { return d.id === parentPost.discussionId; }) || null;
    if (!discussion) {
      return {
        newPost: null,
        updatedParentReplyCount: null,
        message: 'Discussion not found'
      };
    }

    const now = this._now();
    const displayName = this._getCurrentDisplayName();
    const linkInfo = this._detectLinks(body);

    const newPost = {
      id: this._generateId('post'),
      discussionId: parentPost.discussionId,
      parentPostId: parentPost.id,
      isOriginalPost: false,
      authorDisplayName: displayName,
      authorProfileId: null,
      body: body,
      createdAt: now,
      updatedAt: null,
      upvoteCount: 0,
      likeCount: 0,
      replyCount: 0,
      containsLink: linkInfo.containsLink,
      links: linkInfo.links
    };
    posts.push(newPost);

    parentPost.replyCount = (parentPost.replyCount || 0) + 1;
    discussion.replyCount = (discussion.replyCount || 0) + 1;
    discussion.lastReplyAt = now;
    discussion.updatedAt = now;

    for (let c = 0; c < categories.length; c++) {
      if (categories[c].id === discussion.categoryId) {
        categories[c].lastActivityAt = now;
        break;
      }
    }

    this._saveToStorage('posts', posts);
    this._saveToStorage('discussions', discussions);
    this._saveToStorage('categories', categories);

    return {
      newPost: newPost,
      updatedParentReplyCount: parentPost.replyCount,
      message: 'Reply posted'
    };
  }

  // upvotePost(postId, upvote)
  upvotePost(postId, upvote) {
    let posts = this._getFromStorage('posts');
    let reactions = this._getFromStorage('reactions');
    let discussions = this._getFromStorage('discussions');

    const post = posts.find(function (p) { return p.id === postId; }) || null;
    if (!post) {
      return {
        success: false,
        newUpvoteCount: null,
        userHasUpvoted: false
      };
    }

    const shouldUpvote = typeof upvote === 'boolean' ? upvote : true;
    const existingIndex = reactions.findIndex(function (r) {
      return r.postId === postId && r.reactionType === 'upvote';
    });

    if (shouldUpvote) {
      // Always record a new upvote reaction and increment the counter.
      // Existing reactions may represent other users and should not prevent
      // the current upvote from being counted.
      const reaction = {
        id: this._generateId('react'),
        postId: postId,
        reactionType: 'upvote',
        createdAt: this._now()
      };
      reactions.push(reaction);
      post.upvoteCount = (post.upvoteCount || 0) + 1;
    } else {
      if (existingIndex !== -1) {
        reactions.splice(existingIndex, 1);
        if (post.upvoteCount && post.upvoteCount > 0) {
          post.upvoteCount = post.upvoteCount - 1;
        }
      }
    }

    if (post.isOriginalPost) {
      const discussion = discussions.find(function (d) { return d.id === post.discussionId; }) || null;
      if (discussion) {
        discussion.score = post.upvoteCount || 0;
      }
    }

    this._saveToStorage('posts', posts);
    this._saveToStorage('reactions', reactions);
    this._saveToStorage('discussions', discussions);

    return {
      success: true,
      newUpvoteCount: post.upvoteCount || 0,
      userHasUpvoted: shouldUpvote
    };
  }

  // likePost(postId, like)
  likePost(postId, like) {
    let posts = this._getFromStorage('posts');
    let reactions = this._getFromStorage('reactions');

    const post = posts.find(function (p) { return p.id === postId; }) || null;
    if (!post) {
      return {
        success: false,
        newLikeCount: null,
        userHasLiked: false
      };
    }

    const shouldLike = typeof like === 'boolean' ? like : true;
    const existingIndex = reactions.findIndex(function (r) {
      return r.postId === postId && r.reactionType === 'like';
    });

    if (shouldLike) {
      if (existingIndex === -1) {
        const reaction = {
          id: this._generateId('react'),
          postId: postId,
          reactionType: 'like',
          createdAt: this._now()
        };
        reactions.push(reaction);
        post.likeCount = (post.likeCount || 0) + 1;
      }
    } else {
      if (existingIndex !== -1) {
        reactions.splice(existingIndex, 1);
        if (post.likeCount && post.likeCount > 0) {
          post.likeCount = post.likeCount - 1;
        }
      }
    }

    this._saveToStorage('posts', posts);
    this._saveToStorage('reactions', reactions);

    return {
      success: true,
      newLikeCount: post.likeCount || 0,
      userHasLiked: shouldLike
    };
  }

  // setDiscussionSubscription(discussionId, subscribed)
  setDiscussionSubscription(discussionId, subscribed) {
    let discussions = this._getFromStorage('discussions');
    const discussion = discussions.find(function (d) { return d.id === discussionId; }) || null;
    if (!discussion) {
      return {
        discussion: null,
        message: 'Discussion not found'
      };
    }
    discussion.isSubscribed = !!subscribed;
    this._saveToStorage('discussions', discussions);
    return {
      discussion: discussion,
      message: subscribed ? 'Subscribed to discussion' : 'Unsubscribed from discussion'
    };
  }

  // setDiscussionBookmark(discussionId, bookmarked)
  setDiscussionBookmark(discussionId, bookmarked) {
    let discussions = this._getFromStorage('discussions');
    const discussion = discussions.find(function (d) { return d.id === discussionId; }) || null;
    if (!discussion) {
      return {
        discussion: null,
        message: 'Discussion not found'
      };
    }
    discussion.isBookmarked = !!bookmarked;
    this._saveToStorage('discussions', discussions);

    // Instrumentation for task completion tracking (task_2 selected discussion)
    try {
      if (bookmarked === true && discussion && discussion.isBookmarked) {
        localStorage.setItem('task2_selectedDiscussionId', discussion.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      discussion: discussion,
      message: bookmarked ? 'Discussion bookmarked' : 'Bookmark removed'
    };
  }

  // reportPost(postId, reason, note)
  reportPost(postId, reason, note) {
    const allowedReasons = ['spam', 'harassment', 'offensive', 'off_topic', 'other'];
    if (allowedReasons.indexOf(reason) === -1) {
      return {
        report: null,
        message: 'Invalid report reason'
      };
    }

    const posts = this._getFromStorage('posts');
    const discussions = this._getFromStorage('discussions');
    const memberProfiles = this._getFromStorage('member_profiles');
    const memberProfilesById = this._indexById(memberProfiles);

    const post = posts.find(function (p) { return p.id === postId; }) || null;
    if (!post) {
      return {
        report: null,
        message: 'Post not found'
      };
    }

    let contentReports = this._getFromStorage('content_reports');
    const report = {
      id: this._generateId('report'),
      postId: postId,
      reason: reason,
      note: note || '',
      createdAt: this._now(),
      status: 'submitted'
    };
    contentReports.push(report);
    this._saveToStorage('content_reports', contentReports);

    const discussion = discussions.find(function (d) { return d.id === post.discussionId; }) || null;
    const augmentedPost = this._augmentPost(post, discussion, posts, memberProfilesById);

    return {
      report: Object.assign({}, report, { post: augmentedPost }),
      message: 'Report submitted'
    };
  }

  // voteInPoll(pollId, optionId)
  voteInPoll(pollId, optionId) {
    let polls = this._getFromStorage('polls');
    let pollOptions = this._getFromStorage('poll_options');
    let pollResponses = this._getFromStorage('poll_responses');

    const poll = polls.find(function (pl) { return pl.id === pollId; }) || null;
    if (!poll) {
      return {
        pollResponse: null,
        options: [],
        message: 'Poll not found'
      };
    }

    const optionsForPoll = pollOptions.filter(function (opt) { return opt.pollId === poll.id; });
    const option = optionsForPoll.find(function (opt) { return opt.id === optionId; }) || null;
    if (!option) {
      return {
        pollResponse: null,
        options: optionsForPoll,
        message: 'Option not found for this poll'
      };
    }

    let response;
    if (!poll.multipleChoiceAllowed) {
      response = this._enforceSingleChoicePollResponse(poll, option, pollResponses, pollOptions);
    } else {
      const now = this._now();
      const existing = pollResponses.find(function (r) { return r.pollId === poll.id && r.optionId === option.id; }) || null;
      if (!existing) {
        response = {
          id: this._generateId('pollresp'),
          pollId: poll.id,
          optionId: option.id,
          createdAt: now
        };
        pollResponses.push(response);
        option.voteCount = (option.voteCount || 0) + 1;
      } else {
        response = existing;
      }
    }

    this._saveToStorage('poll_responses', pollResponses);
    this._saveToStorage('poll_options', pollOptions);

    return {
      pollResponse: response,
      options: pollOptions.filter(function (opt) { return opt.pollId === poll.id; }),
      message: 'Vote recorded'
    };
  }

  // searchTopics(query, minFollowers)
  searchTopics(query, minFollowers) {
    const tags = this._getFromStorage('tags');
    const normalizedQuery = query && typeof query === 'string' ? query.toLowerCase().trim() : '';
    const min = typeof minFollowers === 'number' ? minFollowers : 0;
    const result = [];
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const followers = tag.followerCount || 0;
      if (followers < min) continue;
      if (normalizedQuery) {
        const name = (tag.name || '').toLowerCase();
        if (name.indexOf(normalizedQuery) === -1) continue;
      }
      result.push(tag);
    }
    return result;
  }

  // followTopic(tagId)
  followTopic(tagId) {
    let tags = this._getFromStorage('tags');
    const tag = tags.find(function (t) { return t.id === tagId; }) || null;
    if (!tag) {
      return {
        tag: null,
        message: 'Topic not found'
      };
    }
    if (!tag.isFollowed) {
      tag.isFollowed = true;
      tag.followerCount = (tag.followerCount || 0) + 1;
      this._saveToStorage('tags', tags);
    }
    return {
      tag: tag,
      message: 'Topic followed'
    };
  }

  // unfollowTopic(tagId)
  unfollowTopic(tagId) {
    let tags = this._getFromStorage('tags');
    const tag = tags.find(function (t) { return t.id === tagId; }) || null;
    if (!tag) {
      return {
        tag: null,
        message: 'Topic not found'
      };
    }
    if (tag.isFollowed) {
      tag.isFollowed = false;
      if (tag.followerCount && tag.followerCount > 0) {
        tag.followerCount = tag.followerCount - 1;
      }
      this._saveToStorage('tags', tags);
    }
    return {
      tag: tag,
      message: 'Topic unfollowed'
    };
  }

  // getFollowedTopics()
  getFollowedTopics() {
    const tags = this._getFromStorage('tags');
    return tags.filter(function (t) { return !!t.isFollowed; });
  }

  // getTopicDetail(tagId, sortBy)
  getTopicDetail(tagId, sortBy) {
    const tags = this._getFromStorage('tags');
    const discussions = this._getFromStorage('discussions');
    const discussionTags = this._getFromStorage('discussion_tags');
    const categories = this._getFromStorage('categories');
    const posts = this._getFromStorage('posts');

    const tag = tags.find(function (t) { return t.id === tagId; }) || null;
    if (!tag) {
      return {
        tag: null,
        discussions: []
      };
    }

    const categoriesById = this._indexById(categories);

    const discussionIds = [];
    for (let i = 0; i < discussionTags.length; i++) {
      const dt = discussionTags[i];
      if (dt.tagId === tagId) {
        discussionIds.push(dt.discussionId);
      }
    }

    const related = discussions.filter(function (d) { return discussionIds.indexOf(d.id) !== -1; });

    const self = this;
    const effectiveSort = sortBy || 'latest_activity';
    related.sort(function (a, b) {
      if (effectiveSort === 'latest_activity') {
        const da = self._latestActivityDate(a);
        const db = self._latestActivityDate(b);
        return db - da;
      }
      if (effectiveSort === 'newest') {
        const da = self._parseDate(a.createdAt) || new Date();
        const db = self._parseDate(b.createdAt) || new Date();
        return db - da;
      }
      if (effectiveSort === 'most_replied') {
        const ra = a.replyCount || 0;
        const rb = b.replyCount || 0;
        return rb - ra;
      }
      if (effectiveSort === 'most_upvoted') {
        const sa = a.score || 0;
        const sb = b.score || 0;
        return sb - sa;
      }
      const da2 = self._latestActivityDate(a);
      const db2 = self._latestActivityDate(b);
      return db2 - da2;
    });

    const list = [];
    for (let i = 0; i < related.length; i++) {
      const d = related[i];
      const category = categoriesById[d.categoryId] || null;
      const augmentedDiscussion = this._augmentDiscussion(d, categoriesById, this._indexById(tags));
      const originalPost = posts.find(function (p) { return p.discussionId === d.id && p.isOriginalPost; }) || null;
      list.push({
        discussion: augmentedDiscussion,
        categoryName: category ? category.name : null,
        originalAuthorDisplayName: originalPost ? originalPost.authorDisplayName : null
      });
    }

    return {
      tag: tag,
      discussions: list
    };
  }

  // getBookmarkedDiscussions()
  getBookmarkedDiscussions() {
    const discussions = this._getFromStorage('discussions');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');

    const categoriesById = this._indexById(categories);
    const tagsById = this._indexById(tags);

    const bookmarked = discussions.filter(function (d) { return !!d.isBookmarked; });

    const result = [];
    for (let i = 0; i < bookmarked.length; i++) {
      const d = bookmarked[i];
      const category = categoriesById[d.categoryId] || null;
      const discussionTags = [];
      if (d.tagIds && Array.isArray(d.tagIds)) {
        for (let j = 0; j < d.tagIds.length; j++) {
          const t = tagsById[d.tagIds[j]];
          if (t) discussionTags.push(t);
        }
      }
      const tagNames = discussionTags.map(function (t) { return t.name; });
      const augmentedDiscussion = this._augmentDiscussion(d, categoriesById, tagsById);
      result.push({
        discussion: augmentedDiscussion,
        categoryName: category ? category.name : null,
        tagNames: tagNames
      });
    }
    return result;
  }

  // getMemberProfile(memberProfileId)
  getMemberProfile(memberProfileId) {
    const memberProfiles = this._getFromStorage('member_profiles');
    const discussions = this._getFromStorage('discussions');
    const posts = this._getFromStorage('posts');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');

    const profile = memberProfiles.find(function (m) { return m.id === memberProfileId; }) || null;
    if (!profile) {
      return {
        profile: null,
        recentDiscussions: [],
        recentReplies: []
      };
    }

    const categoriesById = this._indexById(categories);
    const tagsById = this._indexById(tags);

    const authoredOriginalPosts = posts.filter(function (p) {
      return p.isOriginalPost && p.authorProfileId === memberProfileId;
    });
    const authoredDiscussionIds = authoredOriginalPosts.map(function (p) { return p.discussionId; });
    const recentDiscussionsRaw = discussions.filter(function (d) {
      return authoredDiscussionIds.indexOf(d.id) !== -1;
    });

    recentDiscussionsRaw.sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date();
      const db = this._parseDate(b.createdAt) || new Date();
      return db - da;
    });

    const recentDiscussions = recentDiscussionsRaw.map(function (d) {
      return Object.assign({}, d, {
        category: categoriesById[d.categoryId] || null,
        tags: (d.tagIds || []).map(function (id) { return tagsById[id]; }).filter(function (t) { return !!t; })
      });
    });

    const repliesRaw = posts.filter(function (p) {
      return !p.isOriginalPost && p.authorProfileId === memberProfileId;
    });
    repliesRaw.sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date();
      const db = this._parseDate(b.createdAt) || new Date();
      return db - da;
    });

    const memberProfilesById = this._indexById(memberProfiles);
    const recentReplies = repliesRaw.map(function (p) {
      const discussion = discussions.find(function (d) { return d.id === p.discussionId; }) || null;
      return this._augmentPost(p, discussion, posts, memberProfilesById);
    }, this);

    return {
      profile: profile,
      recentDiscussions: recentDiscussions,
      recentReplies: recentReplies
    };
  }

  // sendPrivateMessage(recipientProfileId, subject, body)
  sendPrivateMessage(recipientProfileId, subject, body) {
    const memberProfiles = this._getFromStorage('member_profiles');
    const recipient = memberProfiles.find(function (m) { return m.id === recipientProfileId; }) || null;
    if (!recipient) {
      return {
        message: null,
        statusMessage: 'Recipient not found'
      };
    }

    let privateMessages = this._getFromStorage('private_messages');
    const now = this._now();

    const msg = {
      id: this._generateId('pm'),
      recipientProfileId: recipientProfileId,
      recipientDisplayName: recipient.displayName,
      subject: subject,
      body: body,
      createdAt: now,
      isRead: false
    };
    privateMessages.push(msg);
    this._saveToStorage('private_messages', privateMessages);

    return {
      message: Object.assign({}, msg, { recipientProfile: recipient }),
      statusMessage: 'Message sent'
    };
  }

  // getSentMessages(page, pageSize)
  getSentMessages(page, pageSize) {
    const privateMessages = this._getFromStorage('private_messages');
    const memberProfiles = this._getFromStorage('member_profiles');
    const memberProfilesById = this._indexById(memberProfiles);

    const sorted = privateMessages.slice().sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date();
      const db = this._parseDate(b.createdAt) || new Date();
      return db - da;
    });

    const paged = this._paginate(sorted, page || 1, pageSize || 20);
    const messages = paged.items.map(function (m) {
      return Object.assign({}, m, {
        recipientProfile: memberProfilesById[m.recipientProfileId] || null
      });
    });

    return {
      messages: messages,
      totalCount: paged.totalCount,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // getAccountSettings()
  getAccountSettings() {
    const settings = this._getOrCreateAccountSettings();
    return {
      settings: settings
    };
  }

  // updateAccountSettings(displayName, bio, timezone, dailySummaryEnabled)
  updateAccountSettings(displayName, bio, timezone, dailySummaryEnabled) {
    const allowedTimezones = ['utc_minus_5', 'utc', 'utc_plus_1', 'utc_plus_2'];
    let settings = this._getOrCreateAccountSettings();

    if (typeof displayName === 'string') {
      settings.displayName = displayName;
    }
    if (typeof bio === 'string') {
      settings.bio = bio;
    }
    if (timezone && allowedTimezones.indexOf(timezone) !== -1) {
      settings.timezone = timezone;
    }
    if (typeof dailySummaryEnabled === 'boolean') {
      settings.dailySummaryEnabled = dailySummaryEnabled;
    }
    settings.updatedAt = this._now();

    localStorage.setItem('account_settings', JSON.stringify(settings));

    return {
      settings: settings,
      message: 'Account settings updated'
    };
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    if (pageSlug === 'about') {
      return {
        title: 'About',
        body: 'This community forum helps designers and developers discuss topics, share knowledge, and collaborate on projects.'
      };
    }
    if (pageSlug === 'help_support') {
      return {
        title: 'Help & Support',
        body: 'For help, review our FAQ or contact the moderators via the support channels listed on this page.'
      };
    }
    if (pageSlug === 'terms_of_service') {
      return {
        title: 'Terms of Service',
        body: 'By using this forum you agree to follow our community guidelines, respect other members, and comply with applicable laws.'
      };
    }
    if (pageSlug === 'privacy_policy') {
      return {
        title: 'Privacy Policy',
        body: 'We store only the data necessary to operate this forum and do not sell your personal information to third parties.'
      };
    }
    return {
      title: '',
      body: ''
    };
  }
}

// Global + Node.js export (no direct window/document usage)
if (typeof globalThis !== 'undefined') {
  if (!globalThis.BusinessLogic) {
    globalThis.BusinessLogic = BusinessLogic;
  }
  if (!globalThis.WebsiteSDK) {
    globalThis.WebsiteSDK = new BusinessLogic();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}