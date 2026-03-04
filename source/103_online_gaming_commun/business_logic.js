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
  }

  _initStorage() {
    // Core data tables based on data models
    if (!localStorage.getItem('games')) {
      localStorage.setItem('games', JSON.stringify([]));
    }
    if (!localStorage.getItem('forums')) {
      localStorage.setItem('forums', JSON.stringify([]));
    }
    if (!localStorage.getItem('communities')) {
      localStorage.setItem('communities', JSON.stringify([]));
    }
    if (!localStorage.getItem('threads')) {
      localStorage.setItem('threads', JSON.stringify([]));
    }
    if (!localStorage.getItem('replies')) {
      localStorage.setItem('replies', JSON.stringify([]));
    }
    if (!localStorage.getItem('tags')) {
      localStorage.setItem('tags', JSON.stringify([]));
    }
    if (!localStorage.getItem('thread_tags')) {
      localStorage.setItem('thread_tags', JSON.stringify([]));
    }
    if (!localStorage.getItem('help_articles')) {
      localStorage.setItem('help_articles', JSON.stringify([]));
    }
    if (!localStorage.getItem('reports')) {
      localStorage.setItem('reports', JSON.stringify([]));
    }
    if (!localStorage.getItem('contact_submissions')) {
      localStorage.setItem('contact_submissions', JSON.stringify([]));
    }
    if (!localStorage.getItem('post_reactions')) {
      localStorage.setItem('post_reactions', JSON.stringify([]));
    }

    // Singleton-ish configs/content can be lazily created, so no default values here

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

  _getNowIso() {
    return new Date().toISOString();
  }

  _getTime(value) {
    if (!value) return 0;
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }

  // ========= Helper: current user context (single-user, local-only) =========
  _getCurrentUserContext() {
    // Single-user environment; we infer ownership from entity flags like is_owned_by_current_user
    const profileRaw = localStorage.getItem('current_user_profile');
    let profile = null;
    if (profileRaw) {
      try {
        profile = JSON.parse(profileRaw);
      } catch (e) {
        profile = null;
      }
    }
    return {
      displayName: profile && profile.displayName ? profile.displayName : 'Player',
      isAuthenticated: true
    };
  }

  // ========= Helper: foreign key resolvers =========

  _resolveForum(forum, games, forums, options) {
    if (!forum) return null;
    const opts = options || {};
    const game = forum.game_id ? games.find(g => g.id === forum.game_id) || null : null;
    let parentForum = null;
    if (opts.includeParent && forum.parent_forum_id) {
      const parent = forums.find(f => f.id === forum.parent_forum_id) || null;
      if (parent) {
        // Shallow copy without recursively resolving its own parent
        parentForum = {
          ...parent,
          game: parent.game_id ? games.find(g => g.id === parent.game_id) || null : null
        };
      }
    }
    const result = { ...forum, game };
    if (opts.includeParent) {
      result.parent_forum = parentForum;
    }
    return result;
  }

  _resolveThread(thread, games, forums, tags) {
    if (!thread) return null;
    const game = thread.game_id ? games.find(g => g.id === thread.game_id) || null : null;
    const forum = forums.find(f => f.id === thread.forum_id) || null;
    const threadTags = Array.isArray(thread.tag_ids)
      ? thread.tag_ids
          .map(tagId => (tags || []).find(t => t.id === tagId) || null)
          .filter(Boolean)
      : [];
    return {
      ...thread,
      game,
      forum: this._resolveForum(forum, games, forums, { includeParent: false }),
      tags: threadTags
    };
  }

  _resolveReply(reply, games, forums, tags, threads) {
    if (!reply) return null;
    const thread = (threads || []).find(t => t.id === reply.thread_id) || null;
    const resolvedThread = thread ? this._resolveThread(thread, games, forums, tags) : null;
    return {
      ...reply,
      thread: resolvedThread
    };
  }

  _resolveCommunity(community, forums, games) {
    if (!community) return null;
    const forum = forums.find(f => f.id === community.forum_id) || null;
    return {
      ...community,
      forum: this._resolveForum(forum, games, forums, { includeParent: true })
    };
  }

  // ========= Helper: search implementation =========

  _searchThreadsInternal(query, filters, sortBy) {
    const threads = this._getFromStorage('threads');
    const forums = this._getFromStorage('forums');
    let tags = this._getFromStorage('tags');
    const threadTags = this._getFromStorage('thread_tags');

    const q = query && String(query).trim().toLowerCase();
    const f = filters || {};

    let results = threads.slice();

    // Text query
    if (q) {
      results = results.filter(t => {
        const title = (t.title || '').toLowerCase();
        const body = (t.body || '').toLowerCase();
        return title.includes(q) || body.includes(q);
      });
    }

    // Game filter: consider threads directly linked to game or via game-specific forums
    if (f.gameId) {
      const gameForums = forums.filter(fo => fo.game_id === f.gameId).map(fo => fo.id);
      results = results.filter(t => {
        return t.game_id === f.gameId || gameForums.indexOf(t.forum_id) !== -1;
      });
    }

    // Platform filter
    if (f.platform) {
      results = results.filter(t => t.platform === f.platform);
    }

    // Status filter
    if (f.status) {
      results = results.filter(t => t.status === f.status);
    }

    // Thread type filter
    if (f.threadType) {
      results = results.filter(t => t.thread_type === f.threadType);
    }

    // Tag filter (by slugs): require all specified tag slugs to be present on thread
    if (Array.isArray(f.tagSlugs) && f.tagSlugs.length > 0) {
      const tagById = {};
      tags.forEach(tag => {
        tagById[tag.id] = tag;
      });

      // Build mapping from thread_id -> Set of tag slugs
      const threadIdToTagSlugs = {};
      threadTags.forEach(tt => {
        const tag = tagById[tt.tag_id];
        if (!tag) return;
        if (!threadIdToTagSlugs[tt.thread_id]) {
          threadIdToTagSlugs[tt.thread_id] = new Set();
        }
        threadIdToTagSlugs[tt.thread_id].add(tag.slug);
      });

      const requiredSlugs = new Set(f.tagSlugs);
      results = results.filter(t => {
        const set = threadIdToTagSlugs[t.id];
        if (!set) return false;
        for (const slug of requiredSlugs) {
          if (!set.has(slug)) return false;
        }
        return true;
      });
    }

    // Date range filter
    if (f.dateRange && f.dateRange !== 'any') {
      const now = Date.now();
      let cutoffMs = 0;
      if (f.dateRange === 'last_24_hours') {
        cutoffMs = now - 24 * 60 * 60 * 1000;
      } else if (f.dateRange === 'last_3_days') {
        cutoffMs = now - 3 * 24 * 60 * 60 * 1000;
      } else if (f.dateRange === 'last_7_days') {
        cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
      } else if (f.dateRange === 'last_30_days') {
        cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
      }
      if (cutoffMs > 0) {
        results = results.filter(t => this._getTime(t.createdAt) >= cutoffMs);
      }
    }

    // Unanswered-only filter
    if (f.unansweredOnly) {
      results = results.filter(t => Number(t.reply_count || 0) === 0);
    }

    // Sorting
    const s = sortBy || 'relevance';
    if (s === 'most_upvoted') {
      results.sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0));
    } else if (s === 'newest') {
      results.sort((a, b) => this._getTime(b.createdAt) - this._getTime(a.createdAt));
    } else if (s === 'oldest') {
      results.sort((a, b) => this._getTime(a.createdAt) - this._getTime(b.createdAt));
    } else if (s === 'most_recent_activity') {
      results.sort((a, b) => {
        const at = this._getTime(a.last_activity_at || a.createdAt);
        const bt = this._getTime(b.last_activity_at || b.createdAt);
        return bt - at;
      });
    } else {
      // 'relevance' – simple heuristic: newest + upvotes
      results.sort((a, b) => {
        const scoreA = (a.upvote_count || 0) * 10 + this._getTime(a.createdAt);
        const scoreB = (b.upvote_count || 0) * 10 + this._getTime(b.createdAt);
        return scoreB - scoreA;
      });
    }

    return results;
  }

  // ========= Helper: notification + help article helpers =========

  _saveNotificationSettingsToStore(settings) {
    const updated = { ...settings, updatedAt: this._getNowIso() };
    localStorage.setItem('notification_settings', JSON.stringify(updated));
    return updated;
  }

  _applyThreadMoveSideEffects(thread, oldForumId, newForumId) {
    if (!thread || !oldForumId || !newForumId || oldForumId === newForumId) return;
    const forums = this._getFromStorage('forums');
    const updatedForums = forums.map(f => {
      if (f.id === oldForumId) {
        const count = Number(f.thread_count || 0);
        return { ...f, thread_count: count > 0 ? count - 1 : 0, updatedAt: this._getNowIso() };
      }
      if (f.id === newForumId) {
        const count = Number(f.thread_count || 0);
        return { ...f, thread_count: count + 1, updatedAt: this._getNowIso() };
      }
      return f;
    });
    this._saveToStorage('forums', updatedForums);
  }

  _updateHelpArticleFeedbackStats(article, isHelpful) {
    if (!article) return null;
    const updated = { ...article };
    const helpful = Number(updated.helpful_vote_count || 0);
    const notHelpful = Number(updated.not_helpful_vote_count || 0);
    const ratingCount = Number(updated.rating_count || 0);
    const ratingAverage = Number(updated.rating_average || 0);

    const newRating = isHelpful ? 5 : 1;
    const newRatingCount = ratingCount + 1;
    const newRatingAverage = newRatingCount > 0
      ? (ratingAverage * ratingCount + newRating) / newRatingCount
      : 0;

    updated.rating_count = newRatingCount;
    updated.rating_average = newRatingAverage;
    if (isHelpful) {
      updated.helpful_vote_count = helpful + 1;
    } else {
      updated.not_helpful_vote_count = notHelpful + 1;
    }

    return updated;
  }

  // ========================= CORE INTERFACES =========================

  // ---------- searchThreads ----------
  searchThreads(query, filters, sortBy, page, pageSize) {
    const threadsRaw = this._searchThreadsInternal(query, filters, sortBy || 'relevance');
    const games = this._getFromStorage('games');
    const forums = this._getFromStorage('forums');
    const tags = this._getFromStorage('tags');

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const paged = threadsRaw.slice(start, end).map(t => this._resolveThread(t, games, forums, tags));

    return {
      results: paged,
      totalCount: threadsRaw.length,
      page: p,
      pageSize: ps
    };
  }

  // ---------- getSearchFilterOptions ----------
  getSearchFilterOptions() {
    const games = this._getFromStorage('games');
    const tags = this._getFromStorage('tags');

    const platforms = [
      { value: 'pc', label: 'PC' },
      { value: 'ps5', label: 'PlayStation 5' },
      { value: 'xbox', label: 'Xbox' },
      { value: 'switch', label: 'Nintendo Switch' },
      { value: 'mobile', label: 'Mobile' },
      { value: 'other', label: 'Other' },
      { value: 'unspecified', label: 'Unspecified' }
    ];

    const statuses = [
      { value: 'open', label: 'Open' },
      { value: 'solved', label: 'Solved' },
      { value: 'unanswered', label: 'Unanswered' },
      { value: 'closed', label: 'Closed' }
    ];

    const dateRanges = [
      { value: 'any', label: 'Any time' },
      { value: 'last_24_hours', label: 'Last 24 hours' },
      { value: 'last_3_days', label: 'Last 3 days' },
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' }
    ];

    return {
      games,
      platforms,
      statuses,
      tags,
      dateRanges
    };
  }

  // ---------- getHomepageFeaturedContent ----------
  getHomepageFeaturedContent() {
    const games = this._getFromStorage('games');
    const forumsRaw = this._getFromStorage('forums');
    const threadsRaw = this._getFromStorage('threads');
    const tags = this._getFromStorage('tags');

    const featuredGames = games.filter(g => g.is_featured);

    const supportForums = forumsRaw.filter(f => f.forum_type === 'support_subforum');
    supportForums.sort((a, b) => (b.thread_count || 0) - (a.thread_count || 0));
    const popularSupportForums = supportForums.slice(0, 5).map(f =>
      this._resolveForum(f, games, forumsRaw, { includeParent: true })
    );

    const threadsSorted = threadsRaw.slice().sort((a, b) => {
      const scoreA = (a.upvote_count || 0) * 10 + (a.view_count || 0);
      const scoreB = (b.upvote_count || 0) * 10 + (b.view_count || 0);
      return scoreB - scoreA;
    });
    const trendingThreads = threadsSorted.slice(0, 10).map(t =>
      this._resolveThread(t, games, forumsRaw, tags)
    );

    return {
      featuredGames,
      popularSupportForums,
      trendingThreads
    };
  }

  // ---------- getThreadDetail ----------
  getThreadDetail(threadId, replySortBy, repliesPage, repliesPageSize) {
    const threads = this._getFromStorage('threads');
    const forums = this._getFromStorage('forums');
    const games = this._getFromStorage('games');
    const repliesAll = this._getFromStorage('replies');
    const tags = this._getFromStorage('tags');

    const baseThread = threads.find(t => t.id === threadId) || null;
    if (!baseThread) {
      return {
        thread: null,
        forum: null,
        game: null,
        replies: [],
        replySortBy: replySortBy || 'newest',
        repliesPage: repliesPage || 1,
        repliesPageSize: repliesPageSize || 25,
        totalReplies: 0,
        canMarkSolution: false
      };
    }

    const resolvedThread = this._resolveThread(baseThread, games, forums, tags);
    const forum = resolvedThread.forum;
    const game = resolvedThread.game;

    let threadReplies = repliesAll.filter(r => r.thread_id === threadId);

    const sort = replySortBy || 'newest';
    if (sort === 'newest') {
      threadReplies.sort((a, b) => this._getTime(b.createdAt) - this._getTime(a.createdAt));
    } else if (sort === 'oldest') {
      threadReplies.sort((a, b) => this._getTime(a.createdAt) - this._getTime(b.createdAt));
    } else if (sort === 'most_upvoted') {
      threadReplies.sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0));
    }

    const p = repliesPage && repliesPage > 0 ? repliesPage : 1;
    const ps = repliesPageSize && repliesPageSize > 0 ? repliesPageSize : 25;
    const start = (p - 1) * ps;
    const end = start + ps;

    const pageReplies = threadReplies.slice(start, end).map(r =>
      this._resolveReply(r, games, forums, tags, threads)
    );

    const canMarkSolution = !!resolvedThread.is_owned_by_current_user;

    return {
      thread: resolvedThread,
      forum,
      game,
      replies: pageReplies,
      replySortBy: sort,
      repliesPage: p,
      repliesPageSize: ps,
      totalReplies: threadReplies.length,
      canMarkSolution
    };
  }

  // ---------- postThreadReply ----------
  postThreadReply(threadId, body) {
    const threads = this._getFromStorage('threads');
    const replies = this._getFromStorage('replies');

    const threadIndex = threads.findIndex(t => t.id === threadId);
    if (threadIndex === -1) {
      return {
        success: false,
        message: 'Thread not found',
        reply: null,
        thread: null
      };
    }

    const now = this._getNowIso();
    const existingReplies = replies.filter(r => r.thread_id === threadId);
    const maxPosition = existingReplies.reduce((max, r) => {
      const pos = Number(r.position || 0);
      return pos > max ? pos : max;
    }, 0);

    const newReply = {
      id: this._generateId('reply'),
      thread_id: threadId,
      body: body || '',
      createdAt: now,
      updatedAt: null,
      position: maxPosition + 1,
      upvote_count: 0,
      like_count: 0,
      is_accepted_solution: false
    };

    const updatedReplies = replies.concat(newReply);

    const thread = { ...threads[threadIndex] };
    thread.reply_count = Number(thread.reply_count || 0) + 1;
    thread.last_activity_at = now;
    thread.updatedAt = now;
    threads[threadIndex] = thread;

    this._saveToStorage('replies', updatedReplies);
    this._saveToStorage('threads', threads);

    const games = this._getFromStorage('games');
    const forums = this._getFromStorage('forums');
    const tags = this._getFromStorage('tags');
    const resolvedThread = this._resolveThread(thread, games, forums, tags);
    const resolvedReply = this._resolveReply(newReply, games, forums, tags, threads);

    return {
      success: true,
      message: 'Reply posted',
      reply: resolvedReply,
      thread: resolvedThread
    };
  }

  // ---------- toggleBookmarkThread ----------
  toggleBookmarkThread(threadId, isBookmarked) {
    const threads = this._getFromStorage('threads');
    const index = threads.findIndex(t => t.id === threadId);
    if (index === -1) {
      return { success: false, thread: null };
    }
    const now = this._getNowIso();
    const updated = { ...threads[index], is_bookmarked: !!isBookmarked, updatedAt: now };
    threads[index] = updated;
    this._saveToStorage('threads', threads);

    const games = this._getFromStorage('games');
    const forums = this._getFromStorage('forums');
    const tags = this._getFromStorage('tags');
    const resolvedThread = this._resolveThread(updated, games, forums, tags);

    return { success: true, thread: resolvedThread };
  }

  // ---------- toggleFollowThread ----------
  toggleFollowThread(threadId, isFollowed) {
    const threads = this._getFromStorage('threads');
    const index = threads.findIndex(t => t.id === threadId);
    if (index === -1) {
      return { success: false, thread: null };
    }
    const now = this._getNowIso();
    const updated = { ...threads[index], is_followed: !!isFollowed, updatedAt: now };
    threads[index] = updated;
    this._saveToStorage('threads', threads);

    const games = this._getFromStorage('games');
    const forums = this._getFromStorage('forums');
    const tags = this._getFromStorage('tags');
    const resolvedThread = this._resolveThread(updated, games, forums, tags);

    return { success: true, thread: resolvedThread };
  }

  // ---------- markReplyAsSolution ----------
  markReplyAsSolution(threadId, replyId) {
    const threads = this._getFromStorage('threads');
    const replies = this._getFromStorage('replies');

    const threadIndex = threads.findIndex(t => t.id === threadId);
    if (threadIndex === -1) {
      return { success: false, thread: null, updatedReply: null };
    }

    const thread = { ...threads[threadIndex] };
    if (!thread.is_owned_by_current_user) {
      return { success: false, thread: null, updatedReply: null };
    }

    let updatedReply = null;
    const now = this._getNowIso();

    const updatedReplies = replies.map(r => {
      if (r.thread_id !== threadId) return r;
      if (r.id === replyId) {
        const nr = { ...r, is_accepted_solution: true, updatedAt: now };
        updatedReply = nr;
        return nr;
      }
      // Unmark any previous solution
      if (r.is_accepted_solution) {
        return { ...r, is_accepted_solution: false, updatedAt: now };
      }
      return r;
    });

    thread.accepted_reply_id = replyId;
    thread.status = 'solved';
    thread.updatedAt = now;
    threads[threadIndex] = thread;

    this._saveToStorage('replies', updatedReplies);
    this._saveToStorage('threads', threads);

    const games = this._getFromStorage('games');
    const forums = this._getFromStorage('forums');
    const tags = this._getFromStorage('tags');
    const resolvedThread = this._resolveThread(thread, games, forums, tags);
    const resolvedReply = updatedReply
      ? this._resolveReply(updatedReply, games, forums, tags, threads)
      : null;

    return {
      success: !!updatedReply,
      thread: resolvedThread,
      updatedReply: resolvedReply
    };
  }

  // ---------- reportReply ----------
  reportReply(replyId, reason, explanation) {
    if (reason === 'harassment_abuse') {
      if (!explanation || String(explanation).trim().length < 20) {
        throw new Error('Explanation must be at least 20 characters for harassment/abuse reports.');
      }
    }

    const replies = this._getFromStorage('replies');
    const threads = this._getFromStorage('threads');

    const reply = replies.find(r => r.id === replyId) || null;
    const thread = reply ? threads.find(t => t.id === reply.thread_id) || null : null;

    const reports = this._getFromStorage('reports');

    const now = this._getNowIso();
    const newReport = {
      id: this._generateId('report'),
      target_type: 'reply',
      target_thread_id: thread ? thread.id : null,
      target_reply_id: replyId,
      reason,
      explanation: explanation || '',
      createdAt: now,
      status: 'pending'
    };

    const updatedReports = reports.concat(newReport);
    this._saveToStorage('reports', updatedReports);

    // Resolve foreign keys for return
    const reportWithTargets = {
      ...newReport,
      target_thread: thread || null,
      target_reply: reply || null
    };

    return reportWithTargets;
  }

  // ---------- reactToPost ----------
  reactToPost(targetType, targetThreadId, targetReplyId, reactionType, isAdding) {
    const reactions = this._getFromStorage('post_reactions');
    const now = this._getNowIso();

    let updatedThread = null;
    let updatedReply = null;

    if (targetType === 'thread') {
      const threads = this._getFromStorage('threads');
      const index = threads.findIndex(t => t.id === targetThreadId);
      if (index === -1) {
        return { success: false, updatedThread: null, updatedReply: null };
      }
      const thread = { ...threads[index] };

      // Simple like_count support; other reaction types do not affect counts here
      if (reactionType === 'like') {
        const current = Number(thread.like_count || 0);
        thread.like_count = isAdding ? current + 1 : Math.max(0, current - 1);
      }
      thread.updatedAt = now;
      threads[index] = thread;
      this._saveToStorage('threads', threads);

      updatedThread = thread;
    } else if (targetType === 'reply') {
      const replies = this._getFromStorage('replies');
      const index = replies.findIndex(r => r.id === targetReplyId);
      if (index === -1) {
        return { success: false, updatedThread: null, updatedReply: null };
      }
      const reply = { ...replies[index] };
      if (reactionType === 'like') {
        const current = Number(reply.like_count || 0);
        reply.like_count = isAdding ? current + 1 : Math.max(0, current - 1);
      }
      reply.updatedAt = now;
      replies[index] = reply;
      this._saveToStorage('replies', replies);
      updatedReply = reply;
    }

    // Track reaction metadata per post (not strictly required by data model, but persisted)
    const newReactions = reactions.filter(r => {
      if (r.targetType !== targetType) return true;
      if (targetType === 'thread' && r.targetThreadId === targetThreadId && r.reactionType === reactionType) {
        return !isAdding; // keep only if we are removing and want to drop existing
      }
      if (targetType === 'reply' && r.targetReplyId === targetReplyId && r.reactionType === reactionType) {
        return !isAdding;
      }
      return true;
    });

    if (isAdding) {
      newReactions.push({
        id: this._generateId('reaction'),
        targetType,
        targetThreadId: targetThreadId || null,
        targetReplyId: targetReplyId || null,
        reactionType,
        createdAt: now
      });
    }

    this._saveToStorage('post_reactions', newReactions);

    const games = this._getFromStorage('games');
    const forums = this._getFromStorage('forums');
    const tags = this._getFromStorage('tags');
    const threads = this._getFromStorage('threads');

    const resolvedThread = updatedThread
      ? this._resolveThread(updatedThread, games, forums, tags)
      : null;
    const resolvedReply = updatedReply
      ? this._resolveReply(updatedReply, games, forums, tags, threads)
      : null;

    return {
      success: true,
      updatedThread: resolvedThread,
      updatedReply: resolvedReply
    };
  }

  // ---------- getSupportedGames ----------
  getSupportedGames() {
    const games = this._getFromStorage('games');
    return games;
  }

  // ---------- getGameSupportHub ----------
  getGameSupportHub(gameId) {
    const games = this._getFromStorage('games');
    const forums = this._getFromStorage('forums');
    const threads = this._getFromStorage('threads');
    const tags = this._getFromStorage('tags');

    const game = games.find(g => g.id === gameId) || null;

    const supportForumsRaw = forums.filter(f => f.game_id === gameId && f.forum_type === 'support_subforum');
    const supportForums = supportForumsRaw.map(f =>
      this._resolveForum(f, games, forums, { includeParent: true })
    );

    const gameThreads = threads.filter(t => t.game_id === gameId);

    const pinnedThreads = gameThreads
      .filter(t => !!t.is_pinned)
      .sort((a, b) => this._getTime(b.createdAt) - this._getTime(a.createdAt))
      .slice(0, 10)
      .map(t => this._resolveThread(t, games, forums, tags));

    const popularThreads = gameThreads
      .slice()
      .sort((a, b) => (b.reply_count || 0) - (a.reply_count || 0))
      .slice(0, 10)
      .map(t => this._resolveThread(t, games, forums, tags));

    return {
      game,
      supportForums,
      pinnedThreads,
      popularThreads
    };
  }

  // ---------- getForumThreads ----------
  getForumThreads(forumId, page, pageSize, sortBy, statusFilter) {
    const forums = this._getFromStorage('forums');
    const games = this._getFromStorage('games');
    const threads = this._getFromStorage('threads');
    const tags = this._getFromStorage('tags');

    const forumBase = forums.find(f => f.id === forumId) || null;
    const forum = this._resolveForum(forumBase, games, forums, { includeParent: true });

    let forumThreads = threads.filter(t => t.forum_id === forumId);

    const status = statusFilter || 'all';
    if (status !== 'all') {
      forumThreads = forumThreads.filter(t => t.status === status);
    }

    const sort = sortBy || 'most_recent_activity';
    if (sort === 'newest') {
      forumThreads.sort((a, b) => this._getTime(b.createdAt) - this._getTime(a.createdAt));
    } else if (sort === 'oldest') {
      forumThreads.sort((a, b) => this._getTime(a.createdAt) - this._getTime(b.createdAt));
    } else if (sort === 'most_replied') {
      forumThreads.sort((a, b) => (b.reply_count || 0) - (a.reply_count || 0));
    } else {
      // most_recent_activity
      forumThreads.sort((a, b) => {
        const at = this._getTime(a.last_activity_at || a.createdAt);
        const bt = this._getTime(b.last_activity_at || b.createdAt);
        return bt - at;
      });
    }

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const pageThreads = forumThreads.slice(start, end).map(t =>
      this._resolveThread(t, games, forums, tags)
    );

    return {
      forum,
      threads: pageThreads,
      page: p,
      pageSize: ps,
      totalCount: forumThreads.length
    };
  }

  // ---------- getNewTopicFormContext ----------
  getNewTopicFormContext(forumId) {
    const forums = this._getFromStorage('forums');
    const games = this._getFromStorage('games');
    const tags = this._getFromStorage('tags');

    const forumBase = forums.find(f => f.id === forumId) || null;
    const forum = this._resolveForum(forumBase, games, forums, { includeParent: true });
    const game = forum ? forum.game : null;

    const allowedThreadTypes = [
      'bug_report',
      'question',
      'discussion',
      'announcement',
      'server_status',
      'rules',
      'general'
    ];

    const platformOptions = [
      { value: 'pc', label: 'PC' },
      { value: 'ps5', label: 'PlayStation 5' },
      { value: 'xbox', label: 'Xbox' },
      { value: 'switch', label: 'Nintendo Switch' },
      { value: 'mobile', label: 'Mobile' },
      { value: 'other', label: 'Other' },
      { value: 'unspecified', label: 'Unspecified' }
    ];

    const severityOptions = [
      { value: 'none', label: 'None' },
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' }
    ];

    const suggestedTags = tags;

    return {
      forum,
      game,
      allowedThreadTypes,
      platformOptions,
      severityOptions,
      suggestedTags
    };
  }

  // ---------- getTagSuggestions ----------
  getTagSuggestions(query, limit) {
    const tags = this._getFromStorage('tags');
    const q = query && String(query).trim().toLowerCase();
    const max = limit && limit > 0 ? limit : 10;

    let results = tags;
    if (q) {
      results = tags.filter(t => {
        const name = (t.name || '').toLowerCase();
        const slug = (t.slug || '').toLowerCase();
        return name.includes(q) || slug.includes(q);
      });
    }

    return results.slice(0, max);
  }

  // ---------- createThread ----------
  createThread(forumId, gameId, threadType, platform, severity, title, body, tagSlugs) {
    const forums = this._getFromStorage('forums');
    const threads = this._getFromStorage('threads');
    let tags = this._getFromStorage('tags');
    const threadTags = this._getFromStorage('thread_tags');

    const forumIndex = forums.findIndex(f => f.id === forumId);
    if (forumIndex === -1) {
      return { success: false, message: 'Forum not found', thread: null };
    }

    const now = this._getNowIso();

    const newThread = {
      id: this._generateId('thread'),
      forum_id: forumId,
      game_id: gameId || null,
      title: title || '',
      body: body || '',
      createdAt: now,
      updatedAt: now,
      status: 'open',
      thread_type: threadType,
      platform: platform || 'unspecified',
      severity: severity || 'none',
      tag_ids: [],
      reply_count: 0,
      view_count: 0,
      upvote_count: 0,
      like_count: 0,
      last_activity_at: now,
      accepted_reply_id: null,
      is_pinned: false,
      is_bookmarked: false,
      is_followed: false,
      is_owned_by_current_user: true
    };

    // Resolve tags by slug and populate ThreadTag join table
    if (Array.isArray(tagSlugs) && tagSlugs.length > 0) {
      const allTags = Array.isArray(tags) ? tags.slice() : [];
      const selectedTags = [];
      const now = this._getNowIso();

      tagSlugs.forEach(slug => {
        let tag = allTags.find(t => t.slug === slug);
        if (!tag) {
          tag = {
            id: this._generateId('tag'),
            name: slug,
            slug,
            description: '',
            createdAt: now,
            updatedAt: now
          };
          allTags.push(tag);
        }
        selectedTags.push(tag);
      });

      newThread.tag_ids = selectedTags.map(t => t.id);

      const newThreadTags = selectedTags.map(t => ({
        id: this._generateId('threadtag'),
        thread_id: newThread.id,
        tag_id: t.id
      }));

      this._saveToStorage('thread_tags', threadTags.concat(newThreadTags));
      tags = allTags;
      this._saveToStorage('tags', tags);
    }

    const updatedThreads = threads.concat(newThread);

    const forum = { ...forums[forumIndex] };
    forum.thread_count = Number(forum.thread_count || 0) + 1;
    forum.updatedAt = now;
    forums[forumIndex] = forum;

    this._saveToStorage('threads', updatedThreads);
    this._saveToStorage('forums', forums);

    const games = this._getFromStorage('games');
    const resolvedThread = this._resolveThread(newThread, games, forums, tags);

    return {
      success: true,
      message: 'Thread created',
      thread: resolvedThread
    };
  }

  // ---------- getNotificationSettings ----------
  getNotificationSettings() {
    const raw = localStorage.getItem('notification_settings');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    const now = this._getNowIso();
    const defaultSettings = {
      id: 'notification_settings_1',
      email_new_replies: false,
      email_mentions: false,
      email_private_messages: false,
      email_announcements: false,
      onsite_mentions: true,
      onsite_replies_to_my_threads: true,
      onsite_private_messages: true,
      onsite_announcements: true,
      digest_frequency: 'never',
      updatedAt: now
    };

    localStorage.setItem('notification_settings', JSON.stringify(defaultSettings));
    return defaultSettings;
  }

  // ---------- updateNotificationSettings ----------
  updateNotificationSettings(
    emailNewReplies,
    emailMentions,
    emailPrivateMessages,
    emailAnnouncements,
    onsiteMentions,
    onsiteRepliesToMyThreads,
    onsitePrivateMessages,
    onsiteAnnouncements,
    digestFrequency
  ) {
    const current = this.getNotificationSettings();
    const updated = {
      ...current,
      email_new_replies: !!emailNewReplies,
      email_mentions: !!emailMentions,
      email_private_messages: !!emailPrivateMessages,
      email_announcements: !!emailAnnouncements,
      onsite_mentions: !!onsiteMentions,
      onsite_replies_to_my_threads: !!onsiteRepliesToMyThreads,
      onsite_private_messages: !!onsitePrivateMessages,
      onsite_announcements: !!onsiteAnnouncements,
      digest_frequency: digestFrequency
    };

    return this._saveNotificationSettingsToStore(updated);
  }

  // ---------- getUserProfileOverview ----------
  getUserProfileOverview() {
    const ctx = this._getCurrentUserContext();
    const threads = this._getFromStorage('threads');
    const replies = this._getFromStorage('replies');

    const myThreads = threads.filter(t => t.is_owned_by_current_user);

    let earliestDate = null;
    myThreads.forEach(t => {
      const tTime = this._getTime(t.createdAt);
      if (tTime > 0 && (earliestDate === null || tTime < earliestDate)) {
        earliestDate = tTime;
      }
    });

    replies.forEach(r => {
      const rTime = this._getTime(r.createdAt);
      if (rTime > 0 && (earliestDate === null || rTime < earliestDate)) {
        earliestDate = rTime;
      }
    });

    const joinDate = earliestDate ? new Date(earliestDate).toISOString() : this._getNowIso();

    return {
      displayName: ctx.displayName,
      joinDate,
      totalThreads: myThreads.length,
      totalReplies: replies.length
    };
  }

  // ---------- getMyThreads ----------
  getMyThreads(page, pageSize, sortBy) {
    const threads = this._getFromStorage('threads');
    const games = this._getFromStorage('games');
    const forums = this._getFromStorage('forums');
    const tags = this._getFromStorage('tags');

    let myThreads = threads.filter(t => t.is_owned_by_current_user);

    const sort = sortBy || 'most_recent_activity';
    if (sort === 'newest') {
      myThreads.sort((a, b) => this._getTime(b.createdAt) - this._getTime(a.createdAt));
    } else if (sort === 'oldest') {
      myThreads.sort((a, b) => this._getTime(a.createdAt) - this._getTime(b.createdAt));
    } else {
      myThreads.sort((a, b) => {
        const at = this._getTime(a.last_activity_at || a.createdAt);
        const bt = this._getTime(b.last_activity_at || b.createdAt);
        return bt - at;
      });
    }

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const pageThreads = myThreads.slice(start, end).map(t =>
      this._resolveThread(t, games, forums, tags)
    );

    return {
      threads: pageThreads,
      page: p,
      pageSize: ps,
      totalCount: myThreads.length
    };
  }

  // ---------- getBookmarkedThreads ----------
  getBookmarkedThreads() {
    const threads = this._getFromStorage('threads');
    const games = this._getFromStorage('games');
    const forums = this._getFromStorage('forums');
    const tags = this._getFromStorage('tags');

    const bookmarked = threads.filter(t => !!t.is_bookmarked);
    return bookmarked.map(t => this._resolveThread(t, games, forums, tags));
  }

  // ---------- moveThreadToForum ----------
  moveThreadToForum(threadId, destinationForumId) {
    const threads = this._getFromStorage('threads');
    const forums = this._getFromStorage('forums');

    const threadIndex = threads.findIndex(t => t.id === threadId);
    if (threadIndex === -1) {
      return { success: false, thread: null, newForum: null };
    }

    const destForum = forums.find(f => f.id === destinationForumId) || null;
    if (!destForum) {
      return { success: false, thread: null, newForum: null };
    }

    const now = this._getNowIso();
    const existing = threads[threadIndex];
    const oldForumId = existing.forum_id;
    const updatedThread = {
      ...existing,
      forum_id: destinationForumId,
      updatedAt: now
    };

    threads[threadIndex] = updatedThread;
    this._saveToStorage('threads', threads);

    this._applyThreadMoveSideEffects(updatedThread, oldForumId, destinationForumId);

    const games = this._getFromStorage('games');
    const tags = this._getFromStorage('tags');
    const resolvedThread = this._resolveThread(updatedThread, games, forums, tags);
    const resolvedForum = this._resolveForum(destForum, games, forums, { includeParent: true });

    return {
      success: true,
      thread: resolvedThread,
      newForum: resolvedForum
    };
  }

  // ---------- getForumHierarchyForSelection ----------
  getForumHierarchyForSelection() {
    const forums = this._getFromStorage('forums');
    const games = this._getFromStorage('games');

    // Return forums with resolved game and parent_forum
    return forums.map(f => this._resolveForum(f, games, forums, { includeParent: true }));
  }

  // ---------- getCommunitiesDirectory ----------
  getCommunitiesDirectory(query) {
    const communities = this._getFromStorage('communities');
    const forums = this._getFromStorage('forums');
    const games = this._getFromStorage('games');

    const q = query && String(query).trim().toLowerCase();

    let filtered = communities;
    if (q) {
      filtered = communities.filter(c => {
        const name = (c.name || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    const resolvedCommunities = filtered.map(c => this._resolveCommunity(c, forums, games));

    const forumIds = Array.from(new Set(filtered.map(c => c.forum_id).filter(Boolean)));
    const communityForumsBase = forums.filter(f => forumIds.indexOf(f.id) !== -1);
    const communityForums = communityForumsBase.map(f =>
      this._resolveForum(f, games, forums, { includeParent: true })
    );

    return {
      communities: resolvedCommunities,
      communityForums
    };
  }

  // ---------- getCommunityDetail ----------
  getCommunityDetail(communityId) {
    const communities = this._getFromStorage('communities');
    const forums = this._getFromStorage('forums');
    const games = this._getFromStorage('games');
    const threads = this._getFromStorage('threads');
    const tags = this._getFromStorage('tags');

    const communityBase = communities.find(c => c.id === communityId) || null;
    if (!communityBase) {
      return {
        community: null,
        forum: null,
        pinnedThreads: [],
        recentThreads: []
      };
    }

    const community = this._resolveCommunity(communityBase, forums, games);
    let forum = community.forum;
    const forumId = communityBase.forum_id;

    // Lazily create a backing forum if the community references a forum_id that does not exist yet
    if (!forum && forumId) {
      const now = this._getNowIso();
      const relatedGame =
        games.find(g => g.slug === communityBase.slug) ||
        games.find(g => g.name === communityBase.name) ||
        null;

      const newForum = {
        id: forumId,
        name: communityBase.name + ' Community',
        slug: communityBase.slug || forumId,
        forum_type: 'support_subforum',
        game_id: relatedGame ? relatedGame.id : null,
        parent_forum_id: null,
        description: communityBase.description || '',
        url: 'forum.html?forumId=' + forumId,
        createdAt: now,
        updatedAt: now,
        thread_count: 0
      };

      forums.push(newForum);
      this._saveToStorage('forums', forums);
      forum = this._resolveForum(newForum, games, forums, { includeParent: true });
    }

    const forumThreads = threads.filter(t => t.forum_id === forumId);

    const pinnedThreads = forumThreads
      .filter(t => !!t.is_pinned)
      .sort((a, b) => this._getTime(b.createdAt) - this._getTime(a.createdAt))
      .slice(0, 10)
      .map(t => this._resolveThread(t, games, forums, tags));

    const recentThreads = forumThreads
      .slice()
      .sort((a, b) => {
        const at = this._getTime(a.last_activity_at || a.createdAt);
        const bt = this._getTime(b.last_activity_at || b.createdAt);
        return bt - at;
      })
      .slice(0, 20)
      .map(t => this._resolveThread(t, games, forums, tags));

    return {
      community,
      forum,
      pinnedThreads,
      recentThreads
    };
  }

  // ---------- joinCommunity ----------
  joinCommunity(communityId) {
    const communities = this._getFromStorage('communities');
    const index = communities.findIndex(c => c.id === communityId);
    if (index === -1) {
      return null;
    }

    const now = this._getNowIso();
    const community = { ...communities[index] };
    community.is_joined = true;
    community.member_count = Number(community.member_count || 0) + 1;
    community.updatedAt = now;
    communities[index] = community;
    this._saveToStorage('communities', communities);

    const forums = this._getFromStorage('forums');
    const games = this._getFromStorage('games');

    return this._resolveCommunity(community, forums, games);
  }

  // ---------- leaveCommunity ----------
  leaveCommunity(communityId) {
    const communities = this._getFromStorage('communities');
    const index = communities.findIndex(c => c.id === communityId);
    if (index === -1) {
      return null;
    }

    const now = this._getNowIso();
    const community = { ...communities[index] };
    community.is_joined = false;
    const count = Number(community.member_count || 0);
    community.member_count = count > 0 ? count - 1 : 0;
    community.updatedAt = now;
    communities[index] = community;
    this._saveToStorage('communities', communities);

    const forums = this._getFromStorage('forums');
    const games = this._getFromStorage('games');

    return this._resolveCommunity(community, forums, games);
  }

  // ---------- toggleFollowCommunity ----------
  toggleFollowCommunity(communityId, isFollowed) {
    const communities = this._getFromStorage('communities');
    const index = communities.findIndex(c => c.id === communityId);
    if (index === -1) {
      return null;
    }

    const now = this._getNowIso();
    const community = { ...communities[index] };
    community.is_followed = !!isFollowed;
    community.updatedAt = now;
    communities[index] = community;
    this._saveToStorage('communities', communities);

    const forums = this._getFromStorage('forums');
    const games = this._getFromStorage('games');

    return this._resolveCommunity(community, forums, games);
  }

  // ---------- searchHelpArticles ----------
  searchHelpArticles(query, category, sortBy, page, pageSize) {
    const articles = this._getFromStorage('help_articles');

    const q = query && String(query).trim().toLowerCase();
    let results = articles.slice();

    if (q) {
      results = results.filter(a => {
        const title = (a.title || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        return title.includes(q) || body.includes(q);
      });
    }

    if (category) {
      results = results.filter(a => a.category === category);
    }

    const sort = sortBy || 'relevance';
    if (sort === 'rating_highest_first') {
      results.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    } else if (sort === 'newest') {
      results.sort((a, b) => this._getTime(b.createdAt) - this._getTime(a.createdAt));
    } else if (sort === 'most_viewed') {
      results.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else {
      // relevance – simple: rating then views
      results.sort((a, b) => {
        const scoreA = (a.rating_average || 0) * 10 + (a.view_count || 0);
        const scoreB = (b.rating_average || 0) * 10 + (b.view_count || 0);
        return scoreB - scoreA;
      });
    }

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const paged = results.slice(start, end);

    return {
      articles: paged,
      totalCount: results.length,
      page: p,
      pageSize: ps
    };
  }

  // ---------- getHelpCenterFilterOptions ----------
  getHelpCenterFilterOptions() {
    const categories = [
      { value: 'account_login', label: 'Account & Login' },
      { value: 'gameplay', label: 'Gameplay' },
      { value: 'technical_support', label: 'Technical Support' },
      { value: 'billing', label: 'Billing' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'rating_highest_first', label: 'Rating (highest first)' },
      { value: 'newest', label: 'Newest' },
      { value: 'most_viewed', label: 'Most viewed' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      categories,
      sortOptions
    };
  }

  // ---------- getHelpCenterOverview ----------
  getHelpCenterOverview() {
    const articles = this._getFromStorage('help_articles');

    const popularArticles = articles
      .slice()
      .sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0))
      .slice(0, 10);

    const recentArticles = articles
      .slice()
      .sort((a, b) => this._getTime(b.createdAt) - this._getTime(a.createdAt))
      .slice(0, 10);

    return {
      popularArticles,
      recentArticles
    };
  }

  // ---------- getHelpArticleDetail ----------
  getHelpArticleDetail(helpArticleId) {
    const articles = this._getFromStorage('help_articles');
    return articles.find(a => a.id === helpArticleId) || null;
  }

  // ---------- toggleSaveHelpArticle ----------
  toggleSaveHelpArticle(helpArticleId, isSaved) {
    const articles = this._getFromStorage('help_articles');
    const index = articles.findIndex(a => a.id === helpArticleId);
    if (index === -1) return null;

    const updated = {
      ...articles[index],
      is_saved: !!isSaved,
      updatedAt: this._getNowIso()
    };
    articles[index] = updated;
    this._saveToStorage('help_articles', articles);

    return updated;
  }

  // ---------- markHelpArticleHelpful ----------
  markHelpArticleHelpful(helpArticleId, isHelpful) {
    const articles = this._getFromStorage('help_articles');
    const index = articles.findIndex(a => a.id === helpArticleId);
    if (index === -1) return null;

    let updated = this._updateHelpArticleFeedbackStats(articles[index], !!isHelpful);
    updated.is_marked_helpful = !!isHelpful;
    updated.updatedAt = this._getNowIso();

    articles[index] = updated;
    this._saveToStorage('help_articles', articles);

    return updated;
  }

  // ---------- getAboutContent ----------
  getAboutContent() {
    const key = 'about_content';
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    const content = {
      title: 'About Our Gaming Community',
      body:
        'Welcome to the community support forum. This space is dedicated to helping players troubleshoot issues, share knowledge, and connect with other fans of our games.'
    };
    localStorage.setItem(key, JSON.stringify(content));
    return content;
  }

  // ---------- getContactOptions ----------
  getContactOptions() {
    const key = 'contact_options';
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    const options = {
      contactTypes: [
        { value: 'account_issue', label: 'Account issue' },
        { value: 'technical_issue', label: 'Technical issue' },
        { value: 'billing_issue', label: 'Billing issue' },
        { value: 'feedback', label: 'Feedback' },
        { value: 'other', label: 'Other' }
      ],
      supportEmail: 'support@example.com'
    };
    localStorage.setItem(key, JSON.stringify(options));
    return options;
  }

  // ---------- submitContactForm ----------
  submitContactForm(contactType, email, subject, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const now = this._getNowIso();

    const submission = {
      id: this._generateId('contact'),
      contactType,
      email,
      subject,
      message,
      createdAt: now
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  // ---------- getTermsOfServiceContent ----------
  getTermsOfServiceContent() {
    const key = 'terms_of_service_content';
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    const now = this._getNowIso();
    const content = {
      title: 'Terms of Service',
      body:
        'By using this forum, you agree to follow our community guidelines, respect other players, and comply with all applicable laws. Moderators may remove content or restrict access at their discretion.',
      lastUpdatedAt: now
    };
    localStorage.setItem(key, JSON.stringify(content));
    return content;
  }

  // ---------- getPrivacyPolicyContent ----------
  getPrivacyPolicyContent() {
    const key = 'privacy_policy_content';
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    const now = this._getNowIso();
    const content = {
      title: 'Privacy Policy',
      body:
        'We store only the data necessary to operate this forum using local storage in your browser. We do not process or transmit personal data to external services from this business logic layer.',
      lastUpdatedAt: now
    };
    localStorage.setItem(key, JSON.stringify(content));
    return content;
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
