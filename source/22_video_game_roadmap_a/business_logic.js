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

  // ----------------------
  // Initialization & Helpers
  // ----------------------

  _initStorage() {
    const tableKeys = [
      'roadmap_features',
      'watchlist_items',
      'community_posts',
      'comments',
      'bug_report_follows',
      'polls',
      'poll_options',
      'dev_updates',
      'reading_list_items'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('user_state')) {
      const defaultState = {
        upvoted_feature_ids: [],
        watchlist_feature_ids: [],
        followed_bug_report_ids: [],
        poll_votes: {}, // { [pollId]: pollOptionId }
        reading_list_update_ids: []
      };
      localStorage.setItem('user_state', JSON.stringify(defaultState));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      // If parsing fails, reset to defaultValue
      this._saveToStorage(key, defaultValue);
      return defaultValue;
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

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _loadUserState() {
    const raw = this._getFromStorage('user_state', null);
    let state = raw && typeof raw === 'object' ? raw : {};
    if (!Array.isArray(state.upvoted_feature_ids)) state.upvoted_feature_ids = [];
    if (!Array.isArray(state.watchlist_feature_ids)) state.watchlist_feature_ids = [];
    if (!Array.isArray(state.followed_bug_report_ids)) state.followed_bug_report_ids = [];
    if (!state.poll_votes || typeof state.poll_votes !== 'object') state.poll_votes = {};
    if (!Array.isArray(state.reading_list_update_ids)) state.reading_list_update_ids = [];
    return state;
  }

  _saveUserState(state) {
    this._saveToStorage('user_state', state);
  }

  _getOrCreateWatchlist() {
    const items = this._getFromStorage('watchlist_items', []);
    return items;
  }

  _getOrCreateReadingList() {
    const items = this._getFromStorage('reading_list_items', []);
    return items;
  }

  _toggleIdInList(list, id) {
    const idx = list.indexOf(id);
    if (idx === -1) {
      list.push(id);
      return true;
    } else {
      list.splice(idx, 1);
      return false;
    }
  }

  _resolveComments(commentsSubset) {
    const allComments = this._getFromStorage('comments', []);
    const features = this._getFromStorage('roadmap_features', []);
    const posts = this._getFromStorage('community_posts', []);

    return commentsSubset.map((c) => {
      const rc = { ...c };
      if (c.roadmap_feature_id) {
        rc.roadmap_feature =
          features.find((f) => f.id === c.roadmap_feature_id) || null;
      } else {
        rc.roadmap_feature = null;
      }
      if (c.community_post_id) {
        rc.community_post =
          posts.find((p) => p.id === c.community_post_id) || null;
      } else {
        rc.community_post = null;
      }
      if (c.parent_comment_id) {
        rc.parent_comment =
          allComments.find((pc) => pc.id === c.parent_comment_id) || null;
      } else {
        rc.parent_comment = null;
      }
      return rc;
    });
  }

  _applyPagination(items, page = 1, page_size = 20) {
    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * size;
    const end = start + size;
    return items.slice(start, end);
  }

  _getReleaseWindowPreset(presetId) {
    const presets = {
      q4_2025: {
        id: 'q4_2025',
        label: 'Q4 2025 (Oct–Dec 2025)',
        start_date: '2025-10-01',
        end_date: '2025-12-31'
      },
      spring_2026: {
        id: 'spring_2026',
        label: 'Spring 2026 (Mar 1 – Jun 30, 2026)',
        start_date: '2026-03-01',
        end_date: '2026-06-30'
      }
    };
    return presets[presetId] || null;
  }

  _resolvePollOptionsForPoll(poll, allOptions) {
    const options = allOptions.filter((o) => o.poll_id === poll.id);
    return options.map((opt) => ({ ...opt, poll }));
  }

  // ----------------------
  // Home Page Interfaces
  // ----------------------

  // getHomePageOverview(): static fallback with optional override from storage
  getHomePageOverview() {
    const stored = this._getFromStorage('home_page_overview', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    // Fallback default content (not persisted)
    return {
      game_title: 'Untitled Co-op RPG',
      tagline: 'Track the journey from prototype to legendary raid boss slayer.',
      hero_message:
        'Follow the evolving roadmap of our co-op action RPG, see what is coming next, and help shape development with your feedback.',
      roadmap_blurb:
        'The roadmap shows planned, in-progress, and released features across all platforms. Filter by platform, feature type, and release window to see what matters most to you.',
      community_blurb:
        'Community feedback, discussions, and bug reports directly influence our priorities. Upvote features, share your experiences, and follow updates in one place.'
    };
  }

  // getHomeFeaturedRoadmapFeatures(limit?)
  getHomeFeaturedRoadmapFeatures(limit) {
    const effectiveLimit = typeof limit === 'number' && limit > 0 ? limit : 4;
    const features = this._getFromStorage('roadmap_features', []);
    const userState = this._loadUserState();

    // Sort by release_date soonest first, fallback to created_at
    const sorted = features
      .slice()
      .sort((a, b) => {
        const ad = this._parseDate(a.release_date) || this._parseDate(a.created_at);
        const bd = this._parseDate(b.release_date) || this._parseDate(b.created_at);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad - bd;
      })
      .slice(0, effectiveLimit)
      .map((f) => ({
        ...f,
        user_has_upvoted: userState.upvoted_feature_ids.includes(f.id)
      }));

    const watchlistItems = this._getOrCreateWatchlist();
    const watchlist_feature_ids = watchlistItems.map((w) => w.roadmap_feature_id);

    return {
      items: sorted,
      watchlist_feature_ids
    };
  }

  // getHomeFeaturedDevUpdates(limit?)
  getHomeFeaturedDevUpdates(limit) {
    const effectiveLimit = typeof limit === 'number' && limit > 0 ? limit : 3;
    const updates = this._getFromStorage('dev_updates', []);
    const published = updates
      .filter((u) => u.is_published)
      .slice()
      .sort((a, b) => {
        const ad = this._parseDate(a.published_at);
        const bd = this._parseDate(b.published_at);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return bd - ad; // newest first
      });

    return published.slice(0, effectiveLimit);
  }

  // getHomeCommunityHighlights(limit?)
  getHomeCommunityHighlights(limit) {
    const effectiveLimit = typeof limit === 'number' && limit > 0 ? limit : 3;
    const posts = this._getFromStorage('community_posts', []);

    const sorted = posts
      .slice()
      .sort((a, b) => {
        // prioritize higher comment_count, then newer created_at
        if (b.comment_count !== a.comment_count) {
          return b.comment_count - a.comment_count;
        }
        const ad = this._parseDate(a.created_at);
        const bd = this._parseDate(b.created_at);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return bd - ad;
      })
      .slice(0, effectiveLimit)
      .map((post) => {
        let highlight_type = 'top_discussion';
        if (post.post_type === 'feedback') highlight_type = 'recent_feedback';
        else if (post.post_type === 'bug_report') highlight_type = 'notable_bug_report';
        return { post, highlight_type };
      });

    return sorted;
  }

  // ----------------------
  // Roadmap Interfaces
  // ----------------------

  // getRoadmapFilterOptions()
  getRoadmapFilterOptions() {
    const features = this._getFromStorage('roadmap_features', []);

    const statuses = [
      { value: 'under_review', label: 'Under Review' },
      { value: 'planned', label: 'Planned' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'released', label: 'Released' },
      { value: 'backlog', label: 'Backlog' },
      { value: 'cancelled', label: 'Cancelled' }
    ];

    const platforms = [
      { value: 'pc', label: 'PC' },
      { value: 'ps5', label: 'PS5' },
      { value: 'xbox_series_xs', label: 'Xbox Series X|S' },
      { value: 'xbox_one', label: 'Xbox One' },
      { value: 'switch', label: 'Nintendo Switch' },
      { value: 'other', label: 'Other' }
    ];

    const feature_types = [
      { value: 'combat', label: 'Combat' },
      { value: 'co_op', label: 'Co-op' },
      { value: 'crafting', label: 'Crafting' },
      { value: 'quality_of_life', label: 'Quality of Life' },
      { value: 'performance', label: 'Performance' },
      { value: 'ui_ux', label: 'UI/UX' },
      { value: 'other', label: 'Other' }
    ];

    const tagSet = new Set();
    features.forEach((f) => {
      if (Array.isArray(f.tags)) {
        f.tags.forEach((t) => tagSet.add(t));
      }
    });
    const tag_suggestions = Array.from(tagSet).sort();

    const yearSet = new Set();
    features.forEach((f) => {
      if (typeof f.release_year === 'number') {
        yearSet.add(f.release_year);
      } else if (f.release_date) {
        const d = this._parseDate(f.release_date);
        if (d) yearSet.add(d.getFullYear());
      }
    });
    const release_years = Array.from(yearSet).sort();

    const release_window_presets = [
      {
        id: 'q4_2025',
        label: 'Q4 2025 (Oct–Dec 2025)',
        start_date: '2025-10-01',
        end_date: '2025-12-31'
      },
      {
        id: 'spring_2026',
        label: 'Spring 2026 (Mar 1 – Jun 30, 2026)',
        start_date: '2026-03-01',
        end_date: '2026-06-30'
      }
    ];

    const sort_options = [
      {
        value: 'release_date_soonest_first',
        label: 'Release date – Soonest first'
      },
      {
        value: 'release_date_latest_first',
        label: 'Release date – Latest first'
      },
      { value: 'upvotes_high_to_low', label: 'Upvotes – High to Low' },
      { value: 'upvotes_low_to_high', label: 'Upvotes – Low to High' },
      {
        value: 'comment_count_high_to_low',
        label: 'Comments – High to Low'
      }
    ];

    return {
      statuses,
      platforms,
      feature_types,
      tag_suggestions,
      release_years,
      release_window_presets,
      sort_options
    };
  }

  // getRoadmapFeatures(status, platforms, feature_types, tags, release_year, release_date_from, release_date_to, release_window_preset, sort, page, page_size)
  getRoadmapFeatures(
    status,
    platforms,
    feature_types,
    tags,
    release_year,
    release_date_from,
    release_date_to,
    release_window_preset,
    sort = 'release_date_soonest_first',
    page = 1,
    page_size = 20
  ) {
    const features = this._getFromStorage('roadmap_features', []);
    const userState = this._loadUserState();
    const comments = this._getFromStorage('comments', []);

    let items = features.slice();

    // Precompute instrumentation conditions based on input arguments
    const task1PlatformsIncludesPc =
      Array.isArray(platforms) && platforms.includes('pc');
    const task1FeatureTypesIncludesCoop =
      Array.isArray(feature_types) && feature_types.includes('co_op');
    const task1TagsIncludesCoop = Array.isArray(tags) && tags.includes('co_op');
    const task1HasQ4Preset = release_window_preset === 'q4_2025';
    const task1HasQ4Dates =
      release_date_from &&
      release_date_to &&
      release_date_from >= '2025-10-01' &&
      release_date_to <= '2025-12-31';
    const task1MatchesInstrumentation =
      task1PlatformsIncludesPc &&
      (task1FeatureTypesIncludesCoop || task1TagsIncludesCoop) &&
      (task1HasQ4Preset || task1HasQ4Dates) &&
      sort === 'release_date_soonest_first';

    const task2MatchesInstrumentation =
      status === 'under_review' &&
      Array.isArray(platforms) &&
      platforms.includes('xbox_series_xs') &&
      sort === 'upvotes_low_to_high';

    const task6MatchesInstrumentation =
      Array.isArray(feature_types) &&
      feature_types.includes('combat') &&
      release_year === 2025 &&
      sort === 'comment_count_high_to_low';

    const task7PlatformsIncludesPcPs5 =
      Array.isArray(platforms) &&
      platforms.includes('pc') &&
      platforms.includes('ps5');
    const task7HasSpringPreset = release_window_preset === 'spring_2026';
    const task7HasSpringDates =
      release_date_from &&
      release_date_to &&
      release_date_from >= '2026-03-01' &&
      release_date_to <= '2026-06-30';
    const task7MatchesInstrumentation =
      status === 'planned' &&
      task7PlatformsIncludesPcPs5 &&
      (task7HasSpringPreset || task7HasSpringDates) &&
      sort === 'upvotes_high_to_low';

    // Filters
    if (status) {
      items = items.filter((f) => f.status === status);
    }

    if (Array.isArray(platforms) && platforms.length > 0) {
      items = items.filter((f) => {
        if (!Array.isArray(f.platforms)) return false;
        return f.platforms.some((p) => platforms.includes(p));
      });
    }

    if (Array.isArray(feature_types) && feature_types.length > 0) {
      items = items.filter((f) => feature_types.includes(f.feature_type));
    }

    if (Array.isArray(tags) && tags.length > 0) {
      items = items.filter((f) => {
        if (!Array.isArray(f.tags)) return false;
        return tags.every((t) => f.tags.includes(t));
      });
    }

    // Release year filter
    if (typeof release_year === 'number') {
      items = items.filter((f) => {
        if (typeof f.release_year === 'number') {
          return f.release_year === release_year;
        }
        if (f.release_date) {
          const d = this._parseDate(f.release_date);
          return d && d.getFullYear() === release_year;
        }
        return false;
      });
    }

    // Release date range or preset
    let fromDate = release_date_from ? this._parseDate(release_date_from) : null;
    let toDate = release_date_to ? this._parseDate(release_date_to) : null;

    if (release_window_preset && (!fromDate || !toDate)) {
      const preset = this._getReleaseWindowPreset(release_window_preset);
      if (preset) {
        if (!fromDate) fromDate = this._parseDate(preset.start_date);
        if (!toDate) toDate = this._parseDate(preset.end_date);
      }
    }

    if (fromDate || toDate) {
      items = items.filter((f) => {
        const d = this._parseDate(f.release_date);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    // Sort
    const sortMode = sort || 'release_date_soonest_first';
    items.sort((a, b) => {
      if (sortMode === 'release_date_latest_first' || sortMode === 'release_date_soonest_first') {
        const ad = this._parseDate(a.release_date);
        const bd = this._parseDate(b.release_date);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return sortMode === 'release_date_soonest_first' ? ad - bd : bd - ad;
      }
      if (sortMode === 'upvotes_high_to_low') {
        return (b.upvote_count || 0) - (a.upvote_count || 0);
      }
      if (sortMode === 'upvotes_low_to_high') {
        return (a.upvote_count || 0) - (b.upvote_count || 0);
      }
      if (sortMode === 'comment_count_high_to_low') {
        return (b.comment_count || 0) - (a.comment_count || 0);
      }
      // Default fallback
      const ad = this._parseDate(a.release_date);
      const bd = this._parseDate(b.release_date);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return ad - bd;
    });

    // Enhance with user_has_upvoted and ensure comment_count at least matches stored comments
    const roadmapIdToCommentCount = {};
    comments.forEach((c) => {
      if (c.roadmap_feature_id) {
        roadmapIdToCommentCount[c.roadmap_feature_id] =
          (roadmapIdToCommentCount[c.roadmap_feature_id] || 0) + 1;
      }
    });

    items = items.map((f) => ({
      ...f,
      user_has_upvoted: userState.upvoted_feature_ids.includes(f.id),
      comment_count: Math.max(f.comment_count || 0, roadmapIdToCommentCount[f.id] || 0)
    }));

    // Instrumentation for task completion tracking
    try {
      if (task1MatchesInstrumentation) {
        localStorage.setItem(
          'task1_roadmapFilter',
          JSON.stringify({
            platforms,
            feature_types,
            tags,
            release_window_preset,
            release_date_from,
            release_date_to,
            sort,
            timestamp: this._nowISO()
          })
        );
        if (items && items.length >= 3) {
          const candidateIds = items.slice(0, 3).map((f) => f.id);
          localStorage.setItem(
            'task1_candidateFeatureIds',
            JSON.stringify(candidateIds)
          );
        }
      }

      if (task2MatchesInstrumentation) {
        localStorage.setItem(
          'task2_roadmapFilter',
          JSON.stringify({
            status,
            platforms,
            feature_types,
            tags,
            sort,
            timestamp: this._nowISO()
          })
        );
        if (items && items.length >= 2) {
          const candidateIds2 = items.slice(0, 2).map((f) => f.id);
          localStorage.setItem(
            'task2_candidateFeatureIds',
            JSON.stringify(candidateIds2)
          );
        }
      }

      if (task6MatchesInstrumentation) {
        localStorage.setItem(
          'task6_roadmapFilter',
          JSON.stringify({
            feature_types,
            release_year,
            sort,
            timestamp: this._nowISO()
          })
        );
        if (items && items.length >= 2) {
          const candidateIds6 = items.slice(0, 2).map((f) => f.id);
          localStorage.setItem(
            'task6_candidateFeatureIds',
            JSON.stringify(candidateIds6)
          );
        }
      }

      if (task7MatchesInstrumentation) {
        localStorage.setItem(
          'task7_roadmapFilter',
          JSON.stringify({
            status,
            platforms,
            release_window_preset,
            release_date_from,
            release_date_to,
            sort,
            timestamp: this._nowISO()
          })
        );
        if (items && items.length >= 5) {
          const candidateIds7 = items.slice(0, 5).map((f) => f.id);
          localStorage.setItem(
            'task7_candidateFeatureIds',
            JSON.stringify(candidateIds7)
          );
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in getRoadmapFeatures:', e);
      } catch (e2) {}
    }

    const total_count = items.length;
    const paged = this._applyPagination(items, page, page_size);

    const watchlistItems = this._getOrCreateWatchlist();
    const watchlist_feature_ids = watchlistItems.map((w) => w.roadmap_feature_id);

    return {
      items: paged,
      total_count,
      watchlist_feature_ids
    };
  }

  // getRoadmapFeatureDetail(roadmapFeatureId)
  getRoadmapFeatureDetail(roadmapFeatureId) {
    const features = this._getFromStorage('roadmap_features', []);
    const watchlistItems = this._getOrCreateWatchlist();
    const allComments = this._getFromStorage('comments', []);
    const userState = this._loadUserState();

    const feature = features.find((f) => f.id === roadmapFeatureId) || null;
    if (!feature) {
      return {
        feature: null,
        is_in_watchlist: false,
        comments: [],
        comments_total: 0
      };
    }

    const is_in_watchlist = watchlistItems.some(
      (w) => w.roadmap_feature_id === roadmapFeatureId
    );

    const featureCommentsRaw = allComments.filter(
      (c) => c.roadmap_feature_id === roadmapFeatureId
    );
    const comments = this._resolveComments(featureCommentsRaw);
    const comments_total = comments.length;

    const enrichedFeature = {
      ...feature,
      user_has_upvoted: userState.upvoted_feature_ids.includes(feature.id),
      comment_count: Math.max(feature.comment_count || 0, comments_total)
    };

    // Instrumentation for task completion tracking
    try {
      // Task 2: detail views for candidate features
      const task2CandidatesRaw = localStorage.getItem('task2_candidateFeatureIds');
      const task2Candidates = task2CandidatesRaw
        ? JSON.parse(task2CandidatesRaw)
        : null;
      if (
        Array.isArray(task2Candidates) &&
        task2Candidates.includes(roadmapFeatureId)
      ) {
        const viewedRaw = localStorage.getItem('task2_detailViewedFeatureIds');
        let viewedIds = [];
        if (viewedRaw) {
          const parsed = JSON.parse(viewedRaw);
          if (Array.isArray(parsed)) {
            viewedIds = parsed;
          }
        }
        if (!viewedIds.includes(roadmapFeatureId)) {
          viewedIds.push(roadmapFeatureId);
          localStorage.setItem(
            'task2_detailViewedFeatureIds',
            JSON.stringify(viewedIds)
          );
        }
      }

      // Task 6: record comment counts at view time for candidate features
      const task6CandidatesRaw = localStorage.getItem('task6_candidateFeatureIds');
      const task6Candidates = task6CandidatesRaw
        ? JSON.parse(task6CandidatesRaw)
        : null;
      if (
        Array.isArray(task6Candidates) &&
        task6Candidates.includes(roadmapFeatureId)
      ) {
        const existingCountsRaw = localStorage.getItem(
          'task6_featureCommentCountsAtView'
        );
        let existingCounts = {};
        if (existingCountsRaw) {
          const parsedCounts = JSON.parse(existingCountsRaw);
          if (parsedCounts && typeof parsedCounts === 'object') {
            existingCounts = parsedCounts;
          }
        }
        existingCounts[feature.id] = enrichedFeature.comment_count;
        localStorage.setItem(
          'task6_featureCommentCountsAtView',
          JSON.stringify(existingCounts)
        );
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in getRoadmapFeatureDetail:', e);
      } catch (e2) {}
    }

    return {
      feature: enrichedFeature,
      is_in_watchlist,
      comments,
      comments_total
    };
  }

  // toggleRoadmapFeatureUpvote(roadmapFeatureId)
  toggleRoadmapFeatureUpvote(roadmapFeatureId) {
    const features = this._getFromStorage('roadmap_features', []);
    const userState = this._loadUserState();

    const featureIndex = features.findIndex((f) => f.id === roadmapFeatureId);
    if (featureIndex === -1) {
      return {
        roadmap_feature_id: roadmapFeatureId,
        user_has_upvoted: false,
        upvote_count: 0,
        success: false,
        message: 'Roadmap feature not found.'
      };
    }

    const feature = features[featureIndex];
    const alreadyUpvoted = userState.upvoted_feature_ids.includes(roadmapFeatureId);

    let upvote_count = feature.upvote_count || 0;
    let user_has_upvoted;

    if (alreadyUpvoted) {
      // remove upvote
      userState.upvoted_feature_ids = userState.upvoted_feature_ids.filter(
        (id) => id !== roadmapFeatureId
      );
      upvote_count = Math.max(0, upvote_count - 1);
      user_has_upvoted = false;
    } else {
      // add upvote
      userState.upvoted_feature_ids.push(roadmapFeatureId);
      upvote_count += 1;
      user_has_upvoted = true;
    }

    features[featureIndex] = {
      ...feature,
      upvote_count,
      user_has_upvoted
    };

    this._saveToStorage('roadmap_features', features);
    this._saveUserState(userState);

    return {
      roadmap_feature_id: roadmapFeatureId,
      user_has_upvoted,
      upvote_count,
      success: true,
      message: user_has_upvoted ? 'Upvoted feature.' : 'Removed upvote.'
    };
  }

  // addRoadmapFeatureToWatchlist(roadmapFeatureId)
  addRoadmapFeatureToWatchlist(roadmapFeatureId) {
    let watchlistItems = this._getOrCreateWatchlist();
    const features = this._getFromStorage('roadmap_features', []);
    const userState = this._loadUserState();

    const featureExists = features.some((f) => f.id === roadmapFeatureId);
    if (!featureExists) {
      return {
        roadmap_feature_id: roadmapFeatureId,
        success: false,
        watchlist_count: watchlistItems.length,
        message: 'Roadmap feature not found.'
      };
    }

    const already = watchlistItems.some(
      (w) => w.roadmap_feature_id === roadmapFeatureId
    );
    if (!already) {
      const item = {
        id: this._generateId('watchlist_item'),
        roadmap_feature_id: roadmapFeatureId,
        added_at: this._nowISO()
      };
      watchlistItems.push(item);
      if (!userState.watchlist_feature_ids.includes(roadmapFeatureId)) {
        userState.watchlist_feature_ids.push(roadmapFeatureId);
      }
      this._saveToStorage('watchlist_items', watchlistItems);
      this._saveUserState(userState);
    }

    return {
      roadmap_feature_id: roadmapFeatureId,
      success: true,
      watchlist_count: watchlistItems.length,
      message: already ? 'Already in watchlist.' : 'Added to watchlist.'
    };
  }

  // removeRoadmapFeatureFromWatchlist(roadmapFeatureId)
  removeRoadmapFeatureFromWatchlist(roadmapFeatureId) {
    let watchlistItems = this._getOrCreateWatchlist();
    const userState = this._loadUserState();

    const beforeCount = watchlistItems.length;
    watchlistItems = watchlistItems.filter(
      (w) => w.roadmap_feature_id !== roadmapFeatureId
    );
    const afterCount = watchlistItems.length;

    userState.watchlist_feature_ids = userState.watchlist_feature_ids.filter(
      (id) => id !== roadmapFeatureId
    );

    this._saveToStorage('watchlist_items', watchlistItems);
    this._saveUserState(userState);

    return {
      roadmap_feature_id: roadmapFeatureId,
      success: true,
      watchlist_count: afterCount,
      message:
        afterCount < beforeCount
          ? 'Removed from watchlist.'
          : 'Feature was not in watchlist.'
    };
  }

  // addRoadmapFeatureComment(roadmapFeatureId, body, parentCommentId?)
  addRoadmapFeatureComment(roadmapFeatureId, body, parentCommentId) {
    const features = this._getFromStorage('roadmap_features', []);
    const featureIndex = features.findIndex((f) => f.id === roadmapFeatureId);
    if (featureIndex === -1) {
      return {
        comment: null,
        comments_total: 0,
        success: false
      };
    }

    const comments = this._getFromStorage('comments', []);

    const comment = {
      id: this._generateId('comment'),
      roadmap_feature_id: roadmapFeatureId,
      community_post_id: null,
      parent_comment_id: parentCommentId || null,
      body,
      created_at: this._nowISO(),
      updated_at: null
    };

    comments.push(comment);

    // Update feature comment_count
    const featureCommentsCount = comments.filter(
      (c) => c.roadmap_feature_id === roadmapFeatureId
    ).length;

    features[featureIndex] = {
      ...features[featureIndex],
      comment_count: featureCommentsCount
    };

    this._saveToStorage('comments', comments);
    this._saveToStorage('roadmap_features', features);

    const resolvedComment = this._resolveComments([comment])[0];

    // Instrumentation for task completion tracking (task 6)
    try {
      const candidateRaw = localStorage.getItem('task6_candidateFeatureIds');
      const candidateIds = candidateRaw ? JSON.parse(candidateRaw) : null;
      const countsRaw = localStorage.getItem('task6_featureCommentCountsAtView');
      const counts = countsRaw ? JSON.parse(countsRaw) : null;

      if (
        Array.isArray(candidateIds) &&
        candidateIds.includes(roadmapFeatureId) &&
        counts &&
        typeof counts === 'object'
      ) {
        const candidateIdsWithCounts = candidateIds.filter(
          (id) => typeof counts[id] === 'number'
        );
        if (candidateIdsWithCounts.length >= 2) {
          const otherIds = candidateIdsWithCounts.filter(
            (id) => id !== roadmapFeatureId
          );
          if (otherIds.length > 0) {
            const otherId = otherIds[0];
            const thisCount = counts[roadmapFeatureId];
            const otherCount = counts[otherId];

            if (
              typeof thisCount === 'number' &&
              typeof otherCount === 'number' &&
              thisCount >= otherCount
            ) {
              localStorage.setItem(
                'task6_correctFeatureCommented',
                JSON.stringify(true)
              );
            }
          }
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in addRoadmapFeatureComment:', e);
      } catch (e2) {}
    }

    return {
      comment: resolvedComment,
      comments_total: featureCommentsCount,
      success: true
    };
  }

  // getWatchlistItems(status?, platforms?, release_date_from?, release_date_to?, sort?)
  getWatchlistItems(
    status,
    platforms,
    release_date_from,
    release_date_to,
    sort = 'release_date_soonest_first'
  ) {
    const watchlistItems = this._getOrCreateWatchlist();
    const features = this._getFromStorage('roadmap_features', []);

    let items = watchlistItems
      .map((w) => features.find((f) => f.id === w.roadmap_feature_id) || null)
      .filter((f) => !!f);

    if (status) {
      items = items.filter((f) => f.status === status);
    }

    if (Array.isArray(platforms) && platforms.length > 0) {
      items = items.filter((f) => {
        if (!Array.isArray(f.platforms)) return false;
        return f.platforms.some((p) => platforms.includes(p));
      });
    }

    let fromDate = release_date_from ? this._parseDate(release_date_from) : null;
    let toDate = release_date_to ? this._parseDate(release_date_to) : null;

    if (fromDate || toDate) {
      items = items.filter((f) => {
        const d = this._parseDate(f.release_date);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    const sortMode = sort || 'release_date_soonest_first';
    items.sort((a, b) => {
      const ad = this._parseDate(a.release_date);
      const bd = this._parseDate(b.release_date);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      if (sortMode === 'release_date_latest_first') return bd - ad;
      return ad - bd; // default soonest first
    });

    // Instrumentation for task completion tracking (tasks 1 and 7)
    try {
      const userState = this._loadUserState();
      const watchlistFeatureIds = Array.isArray(userState.watchlist_feature_ids)
        ? userState.watchlist_feature_ids
        : [];

      // Task 1 watchlist viewed
      const t1Raw = localStorage.getItem('task1_candidateFeatureIds');
      const t1Ids = t1Raw ? JSON.parse(t1Raw) : null;
      if (
        Array.isArray(t1Ids) &&
        t1Ids.length > 0 &&
        t1Ids.every((id) => watchlistFeatureIds.includes(id))
      ) {
        localStorage.setItem('task1_watchlistViewed', JSON.stringify(true));
      }

      // Task 7 watchlist viewed
      const t7Raw = localStorage.getItem('task7_candidateFeatureIds');
      const t7Ids = t7Raw ? JSON.parse(t7Raw) : null;
      if (
        Array.isArray(t7Ids) &&
        t7Ids.length > 0 &&
        t7Ids.every((id) => watchlistFeatureIds.includes(id))
      ) {
        localStorage.setItem('task7_watchlistViewed', JSON.stringify(true));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in getWatchlistItems:', e);
      } catch (e2) {}
    }

    return {
      items,
      total_count: items.length
    };
  }

  // ----------------------
  // Community - Feedback
  // ----------------------

  // getCommunityFeedbackFilterOptions()
  getCommunityFeedbackFilterOptions() {
    const posts = this._getFromStorage('community_posts', []);
    const feedbackPosts = posts.filter((p) => p.post_type === 'feedback');

    const categories = [
      { value: 'gameplay_balance', label: 'Gameplay Balance' },
      { value: 'general', label: 'General' },
      { value: 'general_discussion', label: 'General Discussion' },
      { value: 'bug_reports', label: 'Bug Reports' },
      { value: 'performance', label: 'Performance' },
      { value: 'crafting', label: 'Crafting' },
      { value: 'support', label: 'Support' },
      { value: 'announcements', label: 'Announcements' }
    ];

    const tagSet = new Set();
    feedbackPosts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t));
      }
    });

    return {
      categories,
      tag_suggestions: Array.from(tagSet).sort()
    };
  }

  // getFeedbackPosts(category?, tags?, search_query?, sort?, page?, page_size?)
  getFeedbackPosts(
    category,
    tags,
    search_query,
    sort = 'newest',
    page = 1,
    page_size = 20
  ) {
    const posts = this._getFromStorage('community_posts', []);

    let items = posts.filter((p) => p.post_type === 'feedback');

    if (category) {
      items = items.filter((p) => p.category === category);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      items = items.filter((p) => {
        if (!Array.isArray(p.tags)) return false;
        return tags.every((t) => p.tags.includes(t));
      });
    }

    if (search_query && search_query.trim()) {
      const q = search_query.toLowerCase();
      items = items.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const body = (p.body || '').toLowerCase();
        return title.includes(q) || body.includes(q);
      });
    }

    const sortMode = sort || 'newest';
    items.sort((a, b) => {
      if (sortMode === 'most_comments') {
        return (b.comment_count || 0) - (a.comment_count || 0);
      }
      if (sortMode === 'top_this_week') {
        return (b.score_this_week || 0) - (a.score_this_week || 0);
      }
      // newest by created_at
      const ad = this._parseDate(a.created_at);
      const bd = this._parseDate(b.created_at);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return bd - ad;
    });

    const total_count = items.length;
    const paged = this._applyPagination(items, page, page_size);

    return {
      items: paged,
      total_count
    };
  }

  // createFeedbackPost(title, body, category, tags?)
  createFeedbackPost(title, body, category, tags) {
    const posts = this._getFromStorage('community_posts', []);

    const now = this._nowISO();
    const post = {
      id: this._generateId('community_post'),
      post_type: 'feedback',
      title,
      body,
      category,
      tags: Array.isArray(tags) ? tags : [],
      platform: null,
      comment_count: 0,
      score_this_week: 0,
      created_at: now,
      updated_at: null,
      is_pinned: false,
      is_locked: false
    };

    posts.push(post);
    this._saveToStorage('community_posts', posts);

    return {
      post,
      success: true
    };
  }

  // ----------------------
  // Community - Discussions
  // ----------------------

  // getDiscussionFilterOptions()
  getDiscussionFilterOptions() {
    const posts = this._getFromStorage('community_posts', []);
    const discussionPosts = posts.filter((p) => p.post_type === 'discussion');

    const categories = [
      { value: 'general', label: 'General' },
      { value: 'general_discussion', label: 'General Discussion' },
      { value: 'crafting', label: 'Crafting' },
      { value: 'gameplay_balance', label: 'Gameplay Balance' },
      { value: 'performance', label: 'Performance' },
      { value: 'support', label: 'Support' },
      { value: 'announcements', label: 'Announcements' }
    ];

    const tagSet = new Set();
    discussionPosts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t));
      }
    });

    const sort_options = [
      { value: 'top_this_week', label: 'Top – This Week' },
      { value: 'newest', label: 'Newest' },
      { value: 'most_comments', label: 'Most Comments' }
    ];

    return {
      categories,
      tag_suggestions: Array.from(tagSet).sort(),
      sort_options
    };
  }

  // getDiscussionThreads(category?, tags?, search_query?, sort?, page?, page_size?)
  getDiscussionThreads(
    category,
    tags,
    search_query,
    sort = 'newest',
    page = 1,
    page_size = 20
  ) {
    const posts = this._getFromStorage('community_posts', []);

    let items = posts.filter((p) => p.post_type === 'discussion');

    if (category) {
      items = items.filter((p) => p.category === category);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      items = items.filter((p) => {
        if (!Array.isArray(p.tags)) return false;
        return tags.every((t) => p.tags.includes(t));
      });
    }

    if (search_query && search_query.trim()) {
      const q = search_query.toLowerCase();
      items = items.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const body = (p.body || '').toLowerCase();
        return title.includes(q) || body.includes(q);
      });
    }

    const sortMode = sort || 'newest';
    items.sort((a, b) => {
      if (sortMode === 'top_this_week') {
        return (b.score_this_week || 0) - (a.score_this_week || 0);
      }
      if (sortMode === 'most_comments') {
        return (b.comment_count || 0) - (a.comment_count || 0);
      }
      // newest
      const ad = this._parseDate(a.created_at);
      const bd = this._parseDate(b.created_at);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return bd - ad;
    });

    // Instrumentation for task completion tracking (task 4)
    try {
      const task4MatchesInstrumentation =
        sort === 'top_this_week' &&
        (category === 'crafting' ||
          (Array.isArray(tags) && tags.includes('crafting')));

      if (task4MatchesInstrumentation) {
        localStorage.setItem(
          'task4_discussionFilter',
          JSON.stringify({
            category,
            tags,
            sort,
            timestamp: this._nowISO()
          })
        );
        if (items && items.length > 0) {
          localStorage.setItem('task4_topThreadId', String(items[0].id));
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in getDiscussionThreads:', e);
      } catch (e2) {}
    }

    const total_count = items.length;
    const paged = this._applyPagination(items, page, page_size);

    return {
      items: paged,
      total_count
    };
  }

  // createDiscussionPost(title, body, category, tags?)
  createDiscussionPost(title, body, category, tags) {
    const posts = this._getFromStorage('community_posts', []);

    const now = this._nowISO();
    const post = {
      id: this._generateId('community_post'),
      post_type: 'discussion',
      title,
      body,
      category,
      tags: Array.isArray(tags) ? tags : [],
      platform: null,
      comment_count: 0,
      score_this_week: 0,
      created_at: now,
      updated_at: null,
      is_pinned: false,
      is_locked: false
    };

    posts.push(post);
    this._saveToStorage('community_posts', posts);

    // Instrumentation for task completion tracking (task 9)
    try {
      const firstResultId = localStorage.getItem('task9_firstResultDevUpdateId');
      if (
        firstResultId &&
        (category === 'general' || category === 'general_discussion') &&
        typeof body === 'string' &&
        body.includes(firstResultId)
      ) {
        localStorage.setItem('task9_sharedDevUpdatePostId', post.id);
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in createDiscussionPost:', e);
      } catch (e2) {}
    }

    return {
      post,
      success: true
    };
  }

  // ----------------------
  // Community - Bug Reports
  // ----------------------

  // getBugReportFilterOptions()
  getBugReportFilterOptions() {
    const posts = this._getFromStorage('community_posts', []);
    const bugPosts = posts.filter((p) => p.post_type === 'bug_report');

    const platforms = [
      { value: 'pc', label: 'PC' },
      { value: 'ps5', label: 'PS5' },
      { value: 'xbox_series_xs', label: 'Xbox Series X|S' },
      { value: 'xbox_one', label: 'Xbox One' },
      { value: 'switch', label: 'Nintendo Switch' },
      { value: 'other', label: 'Other' }
    ];

    const tagSet = new Set();
    bugPosts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t));
      }
    });

    const sort_options = [
      { value: 'most_comments', label: 'Most Comments' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      platforms,
      tag_suggestions: Array.from(tagSet).sort(),
      sort_options
    };
  }

  // getBugReports(platform?, tags?, date_from?, date_to?, search_query?, sort?, page?, page_size?)
  getBugReports(
    platform,
    tags,
    date_from,
    date_to,
    search_query,
    sort = 'newest',
    page = 1,
    page_size = 20
  ) {
    const posts = this._getFromStorage('community_posts', []);
    const follows = this._getFromStorage('bug_report_follows', []);

    let items = posts.filter((p) => p.post_type === 'bug_report');

    if (platform) {
      items = items.filter((p) => p.platform === platform);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      items = items.filter((p) => {
        if (!Array.isArray(p.tags)) return false;
        return tags.every((t) => p.tags.includes(t));
      });
    }

    let fromDate = date_from ? this._parseDate(date_from) : null;
    let toDate = date_to ? this._parseDate(date_to) : null;

    if (fromDate || toDate) {
      items = items.filter((p) => {
        const d = this._parseDate(p.created_at);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    if (search_query && search_query.trim()) {
      const q = search_query.toLowerCase();
      items = items.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const body = (p.body || '').toLowerCase();
        return title.includes(q) || body.includes(q);
      });
    }

    const sortMode = sort || 'newest';
    items.sort((a, b) => {
      if (sortMode === 'most_comments') {
        return (b.comment_count || 0) - (a.comment_count || 0);
      }
      // newest
      const ad = this._parseDate(a.created_at);
      const bd = this._parseDate(b.created_at);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return bd - ad;
    });

    // Instrumentation for task completion tracking (task 5)
    try {
      const task5MatchesInstrumentation =
        platform === 'ps5' &&
        Array.isArray(tags) &&
        tags.includes('crash') &&
        sort === 'most_comments' &&
        !!date_from &&
        !!date_to;

      if (task5MatchesInstrumentation) {
        localStorage.setItem(
          'task5_bugReportFilter',
          JSON.stringify({
            platform,
            tags,
            date_from,
            date_to,
            sort,
            timestamp: this._nowISO()
          })
        );
        if (items && items.length >= 3) {
          const bugIds = items.slice(0, 3).map((p) => p.id);
          localStorage.setItem(
            'task5_candidateBugReportIds',
            JSON.stringify(bugIds)
          );
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in getBugReports:', e);
      } catch (e2) {}
    }

    const total_count = items.length;
    const paged = this._applyPagination(items, page, page_size);

    const followed_post_ids = follows.map((f) => f.community_post_id);

    return {
      items: paged,
      total_count,
      followed_post_ids
    };
  }

  // createBugReportPost(title, body, platform?, tags?)
  createBugReportPost(title, body, platform, tags) {
    const posts = this._getFromStorage('community_posts', []);
    const now = this._nowISO();

    const post = {
      id: this._generateId('community_post'),
      post_type: 'bug_report',
      title,
      body,
      category: 'bug_reports',
      tags: Array.isArray(tags) ? tags : [],
      platform: platform || null,
      comment_count: 0,
      score_this_week: 0,
      created_at: now,
      updated_at: null,
      is_pinned: false,
      is_locked: false
    };

    posts.push(post);
    this._saveToStorage('community_posts', posts);

    return {
      post,
      success: true
    };
  }

  // ----------------------
  // Community - Polls
  // ----------------------

  // getPollsList(category?, sort?, page?, page_size?)
  getPollsList(category, sort = 'newest', page = 1, page_size = 20) {
    const polls = this._getFromStorage('polls', []);

    let items = polls.slice();

    if (category) {
      items = items.filter((p) => p.category === category);
    }

    // Refresh is_closed based on expires_at
    const now = new Date();
    items = items.map((p) => {
      const exp = this._parseDate(p.expires_at);
      const is_closed = exp ? exp <= now : !!p.is_closed;
      return { ...p, is_closed };
    });

    const sortMode = sort || 'newest';
    items.sort((a, b) => {
      if (sortMode === 'most_votes') {
        return (b.total_votes || 0) - (a.total_votes || 0);
      }
      // newest by created_at
      const ad = this._parseDate(a.created_at);
      const bd = this._parseDate(b.created_at);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return bd - ad;
    });

    const total_count = items.length;
    const paged = this._applyPagination(items, page, page_size);

    return {
      items: paged,
      total_count
    };
  }

  // createPoll(question, description?, category, duration_days, options[])
  createPoll(question, description, category, duration_days, options) {
    const polls = this._getFromStorage('polls', []);
    const pollOptions = this._getFromStorage('poll_options', []);
    const userState = this._loadUserState();

    const nowISO = this._nowISO();
    const now = this._parseDate(nowISO) || new Date();
    const expires = new Date(now.getTime() + duration_days * 24 * 60 * 60 * 1000);

    const poll = {
      id: this._generateId('poll'),
      question,
      description: description || '',
      category,
      duration_days,
      created_at: nowISO,
      expires_at: expires.toISOString(),
      is_closed: false,
      total_votes: 0,
      user_has_voted: false,
      user_vote_option_id: null
    };

    polls.push(poll);

    const createdOptions = [];
    if (Array.isArray(options)) {
      options.forEach((text) => {
        const opt = {
          id: this._generateId('poll_option'),
          poll_id: poll.id,
          text,
          vote_count: 0,
          created_at: nowISO
        };
        pollOptions.push(opt);
        createdOptions.push({ ...opt, poll });
      });
    }

    this._saveToStorage('polls', polls);
    this._saveToStorage('poll_options', pollOptions);
    this._saveUserState(userState);

    return {
      poll,
      poll_options: createdOptions,
      success: true
    };
  }

  // getPollDetail(pollId)
  getPollDetail(pollId) {
    const polls = this._getFromStorage('polls', []);
    const pollOptions = this._getFromStorage('poll_options', []);
    const userState = this._loadUserState();

    let poll = polls.find((p) => p.id === pollId) || null;
    if (!poll) {
      return {
        poll: null,
        options: []
      };
    }

    // Refresh user vote info from userState
    const userOptionId = userState.poll_votes[pollId] || null;
    poll = {
      ...poll,
      user_has_voted: !!userOptionId,
      user_vote_option_id: userOptionId
    };

    const options = this._resolvePollOptionsForPoll(poll, pollOptions);

    return {
      poll,
      options
    };
  }

  // voteInPoll(pollId, pollOptionId)
  voteInPoll(pollId, pollOptionId) {
    const polls = this._getFromStorage('polls', []);
    const pollOptions = this._getFromStorage('poll_options', []);
    const userState = this._loadUserState();

    const pollIndex = polls.findIndex((p) => p.id === pollId);
    if (pollIndex === -1) {
      return {
        poll: null,
        options: [],
        success: false,
        message: 'Poll not found.'
      };
    }

    let poll = polls[pollIndex];
    const now = new Date();
    const exp = this._parseDate(poll.expires_at);
    if (exp && exp <= now) {
      poll = { ...poll, is_closed: true };
      polls[pollIndex] = poll;
      this._saveToStorage('polls', polls);
      return {
        poll,
        options: this._resolvePollOptionsForPoll(poll, pollOptions),
        success: false,
        message: 'Poll is closed.'
      };
    }

    const optionsForPoll = pollOptions.filter((o) => o.poll_id === pollId);
    const optionIndex = optionsForPoll.findIndex((o) => o.id === pollOptionId);
    if (optionIndex === -1) {
      return {
        poll,
        options: this._resolvePollOptionsForPoll(poll, pollOptions),
        success: false,
        message: 'Poll option not found.'
      };
    }

    const globalOptionIndex = pollOptions.findIndex((o) => o.id === pollOptionId);

    const previousOptionId = userState.poll_votes[pollId] || null;

    if (previousOptionId === pollOptionId) {
      // No change
      poll = {
        ...poll,
        user_has_voted: true,
        user_vote_option_id: pollOptionId
      };
      polls[pollIndex] = poll;
      this._saveToStorage('polls', polls);
      this._saveUserState(userState);
      return {
        poll,
        options: this._resolvePollOptionsForPoll(poll, pollOptions),
        success: true,
        message: 'Vote unchanged.'
      };
    }

    // Adjust votes
    if (previousOptionId) {
      const prevIndex = pollOptions.findIndex((o) => o.id === previousOptionId);
      if (prevIndex !== -1) {
        pollOptions[prevIndex] = {
          ...pollOptions[prevIndex],
          vote_count: Math.max(0, (pollOptions[prevIndex].vote_count || 0) - 1)
        };
      }
    } else {
      // New vote increments total_votes
      poll.total_votes = (poll.total_votes || 0) + 1;
    }

    // Increment new option
    pollOptions[globalOptionIndex] = {
      ...pollOptions[globalOptionIndex],
      vote_count: (pollOptions[globalOptionIndex].vote_count || 0) + 1
    };

    // Update user state & poll
    userState.poll_votes[pollId] = pollOptionId;

    poll = {
      ...poll,
      user_has_voted: true,
      user_vote_option_id: pollOptionId
    };

    polls[pollIndex] = poll;

    this._saveToStorage('polls', polls);
    this._saveToStorage('poll_options', pollOptions);
    this._saveUserState(userState);

    return {
      poll,
      options: this._resolvePollOptionsForPoll(poll, pollOptions),
      success: true,
      message: 'Vote recorded.'
    };
  }

  // ----------------------
  // Community - Post Detail & Comments
  // ----------------------

  // getCommunityPostDetail(communityPostId)
  getCommunityPostDetail(communityPostId) {
    const posts = this._getFromStorage('community_posts', []);
    const allComments = this._getFromStorage('comments', []);
    const follows = this._getFromStorage('bug_report_follows', []);

    const post = posts.find((p) => p.id === communityPostId) || null;
    if (!post) {
      return {
        post: null,
        comments: [],
        comments_total: 0,
        is_following_bug_report: false
      };
    }

    const postCommentsRaw = allComments.filter(
      (c) => c.community_post_id === communityPostId
    );
    const comments = this._resolveComments(postCommentsRaw);
    const comments_total = comments.length;

    const is_following_bug_report =
      post.post_type === 'bug_report' &&
      follows.some((f) => f.community_post_id === communityPostId);

    return {
      post: {
        ...post,
        comment_count: Math.max(post.comment_count || 0, comments_total)
      },
      comments,
      comments_total,
      is_following_bug_report
    };
  }

  // addCommunityPostComment(communityPostId, body, parentCommentId?)
  addCommunityPostComment(communityPostId, body, parentCommentId) {
    const posts = this._getFromStorage('community_posts', []);
    const postIndex = posts.findIndex((p) => p.id === communityPostId);

    if (postIndex === -1) {
      return {
        comment: null,
        comments_total: 0,
        success: false
      };
    }

    const comments = this._getFromStorage('comments', []);

    const comment = {
      id: this._generateId('comment'),
      roadmap_feature_id: null,
      community_post_id: communityPostId,
      parent_comment_id: parentCommentId || null,
      body,
      created_at: this._nowISO(),
      updated_at: null
    };

    comments.push(comment);

    const postCommentsCount = comments.filter(
      (c) => c.community_post_id === communityPostId
    ).length;

    posts[postIndex] = {
      ...posts[postIndex],
      comment_count: postCommentsCount
    };

    this._saveToStorage('comments', comments);
    this._saveToStorage('community_posts', posts);

    const resolvedComment = this._resolveComments([comment])[0];

    // Instrumentation for task completion tracking (task 4)
    try {
      const topThreadId = localStorage.getItem('task4_topThreadId');
      if (topThreadId && communityPostId === topThreadId) {
        localStorage.setItem('task4_repliedThreadId', communityPostId);
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in addCommunityPostComment:', e);
      } catch (e2) {}
    }

    return {
      comment: resolvedComment,
      comments_total: postCommentsCount,
      success: true
    };
  }

  // followBugReport(communityPostId)
  followBugReport(communityPostId) {
    const posts = this._getFromStorage('community_posts', []);
    const follows = this._getFromStorage('bug_report_follows', []);
    const userState = this._loadUserState();

    const post = posts.find((p) => p.id === communityPostId) || null;
    if (!post || post.post_type !== 'bug_report') {
      return {
        community_post_id: communityPostId,
        success: false,
        is_following: false,
        message: 'Bug report not found.'
      };
    }

    const already = follows.some((f) => f.community_post_id === communityPostId);
    if (!already) {
      const follow = {
        id: this._generateId('bug_report_follow'),
        community_post_id: communityPostId,
        created_at: this._nowISO()
      };
      follows.push(follow);
      if (!userState.followed_bug_report_ids.includes(communityPostId)) {
        userState.followed_bug_report_ids.push(communityPostId);
      }
      this._saveToStorage('bug_report_follows', follows);
      this._saveUserState(userState);
    }

    return {
      community_post_id: communityPostId,
      success: true,
      is_following: true,
      message: already ? 'Already following bug report.' : 'Now following bug report.'
    };
  }

  // unfollowBugReport(communityPostId)
  unfollowBugReport(communityPostId) {
    let follows = this._getFromStorage('bug_report_follows', []);
    const userState = this._loadUserState();

    const beforeCount = follows.length;
    follows = follows.filter((f) => f.community_post_id !== communityPostId);
    const afterCount = follows.length;

    userState.followed_bug_report_ids = userState.followed_bug_report_ids.filter(
      (id) => id !== communityPostId
    );

    this._saveToStorage('bug_report_follows', follows);
    this._saveUserState(userState);

    return {
      community_post_id: communityPostId,
      success: true,
      is_following: false,
      message:
        afterCount < beforeCount
          ? 'Unfollowed bug report.'
          : 'Bug report was not followed.'
    };
  }

  // ----------------------
  // Dev Updates & Reading List
  // ----------------------

  // searchDevUpdates(search_query?, tags?, date_from?, date_to?, sort?, page?, page_size?)
  searchDevUpdates(
    search_query,
    tags,
    date_from,
    date_to,
    sort = 'newest_first',
    page = 1,
    page_size = 20
  ) {
    const updates = this._getFromStorage('dev_updates', []);
    const readingListItems = this._getOrCreateReadingList();

    let items = updates.filter((u) => u.is_published);

    if (search_query && search_query.trim()) {
      const q = search_query.toLowerCase();
      items = items.filter((u) => {
        const title = (u.title || '').toLowerCase();
        const body = (u.body || '').toLowerCase();
        const summary = (u.summary || '').toLowerCase();
        return title.includes(q) || body.includes(q) || summary.includes(q);
      });
    }

    if (Array.isArray(tags) && tags.length > 0) {
      items = items.filter((u) => {
        if (!Array.isArray(u.tags)) return false;
        return tags.every((t) => u.tags.includes(t));
      });
    }

    let fromDate = date_from ? this._parseDate(date_from) : null;
    let toDate = date_to ? this._parseDate(date_to) : null;

    if (fromDate || toDate) {
      items = items.filter((u) => {
        const d = this._parseDate(u.published_at);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    const sortMode = sort || 'newest_first';
    items.sort((a, b) => {
      const ad = this._parseDate(a.published_at);
      const bd = this._parseDate(b.published_at);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      if (sortMode === 'oldest_first') return ad - bd;
      return bd - ad; // newest_first
    });

    // Instrumentation for task completion tracking (task 9)
    try {
      const task9MatchesInstrumentation =
        typeof search_query === 'string' &&
        search_query.toLowerCase().includes('performance') &&
        date_from &&
        date_from >= '2026-01-01' &&
        sort === 'newest_first';

      if (task9MatchesInstrumentation) {
        localStorage.setItem(
          'task9_searchParams',
          JSON.stringify({
            search_query,
            tags,
            date_from,
            date_to,
            sort,
            timestamp: this._nowISO()
          })
        );
        if (items && items.length > 0) {
          localStorage.setItem(
            'task9_firstResultDevUpdateId',
            String(items[0].id)
          );
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in searchDevUpdates:', e);
      } catch (e2) {}
    }

    const total_count = items.length;
    const paged = this._applyPagination(items, page, page_size);

    const reading_list_update_ids = readingListItems.map((r) => r.dev_update_id);

    return {
      items: paged,
      total_count,
      reading_list_update_ids
    };
  }

  // getDevUpdateDetail(devUpdateId)
  getDevUpdateDetail(devUpdateId) {
    const updates = this._getFromStorage('dev_updates', []);
    const readingListItems = this._getOrCreateReadingList();

    const dev_update = updates.find((u) => u.id === devUpdateId) || null;
    if (!dev_update) {
      return {
        dev_update: null,
        is_in_reading_list: false
      };
    }

    const is_in_reading_list = readingListItems.some(
      (r) => r.dev_update_id === devUpdateId
    );

    return {
      dev_update,
      is_in_reading_list
    };
  }

  // addDevUpdateToReadingList(devUpdateId)
  addDevUpdateToReadingList(devUpdateId) {
    let readingListItems = this._getOrCreateReadingList();
    const updates = this._getFromStorage('dev_updates', []);
    const userState = this._loadUserState();

    const exists = updates.some((u) => u.id === devUpdateId);
    if (!exists) {
      return {
        dev_update_id: devUpdateId,
        success: false,
        reading_list_count: readingListItems.length,
        message: 'Dev update not found.'
      };
    }

    const already = readingListItems.some((r) => r.dev_update_id === devUpdateId);
    if (!already) {
      const item = {
        id: this._generateId('reading_list_item'),
        dev_update_id: devUpdateId,
        added_at: this._nowISO()
      };
      readingListItems.push(item);
      if (!userState.reading_list_update_ids.includes(devUpdateId)) {
        userState.reading_list_update_ids.push(devUpdateId);
      }
      this._saveToStorage('reading_list_items', readingListItems);
      this._saveUserState(userState);
    }

    // Instrumentation for task completion tracking (task 9)
    try {
      const firstResultId = localStorage.getItem('task9_firstResultDevUpdateId');
      if (firstResultId && devUpdateId === firstResultId) {
        localStorage.setItem('task9_savedDevUpdateId', devUpdateId);
      }
    } catch (e) {
      try {
        console.error('Instrumentation error in addDevUpdateToReadingList:', e);
      } catch (e2) {}
    }

    return {
      dev_update_id: devUpdateId,
      success: true,
      reading_list_count: readingListItems.length,
      message: already ? 'Already in reading list.' : 'Added to reading list.'
    };
  }

  // removeDevUpdateFromReadingList(devUpdateId)
  removeDevUpdateFromReadingList(devUpdateId) {
    let readingListItems = this._getOrCreateReadingList();
    const userState = this._loadUserState();

    const beforeCount = readingListItems.length;
    readingListItems = readingListItems.filter(
      (r) => r.dev_update_id !== devUpdateId
    );
    const afterCount = readingListItems.length;

    userState.reading_list_update_ids = userState.reading_list_update_ids.filter(
      (id) => id !== devUpdateId
    );

    this._saveToStorage('reading_list_items', readingListItems);
    this._saveUserState(userState);

    return {
      dev_update_id: devUpdateId,
      success: true,
      reading_list_count: afterCount,
      message:
        afterCount < beforeCount
          ? 'Removed from reading list.'
          : 'Dev update was not in reading list.'
    };
  }

  // getReadingListItems(search_query?, date_from?, date_to?, sort?, page?, page_size?)
  getReadingListItems(
    search_query,
    date_from,
    date_to,
    sort = 'most_recent_added',
    page = 1,
    page_size = 20
  ) {
    const readingListItems = this._getOrCreateReadingList();
    const updates = this._getFromStorage('dev_updates', []);

    // Join reading list with dev updates
    let joined = readingListItems
      .map((r) => {
        const dev = updates.find((u) => u.id === r.dev_update_id) || null;
        if (!dev) return null;
        return { dev_update: dev, added_at: r.added_at };
      })
      .filter((x) => !!x);

    if (search_query && search_query.trim()) {
      const q = search_query.toLowerCase();
      joined = joined.filter(({ dev_update }) => {
        const title = (dev_update.title || '').toLowerCase();
        const body = (dev_update.body || '').toLowerCase();
        const summary = (dev_update.summary || '').toLowerCase();
        return title.includes(q) || body.includes(q) || summary.includes(q);
      });
    }

    let fromDate = date_from ? this._parseDate(date_from) : null;
    let toDate = date_to ? this._parseDate(date_to) : null;

    if (fromDate || toDate) {
      joined = joined.filter((item) => {
        const d = this._parseDate(item.added_at);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    const sortMode = sort || 'most_recent_added';
    joined.sort((a, b) => {
      if (sortMode === 'oldest_added') {
        const ad = this._parseDate(a.added_at);
        const bd = this._parseDate(b.added_at);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad - bd;
      }
      if (sortMode === 'published_newest_first') {
        const ad = this._parseDate(a.dev_update.published_at);
        const bd = this._parseDate(b.dev_update.published_at);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return bd - ad;
      }
      // most_recent_added
      const ad = this._parseDate(a.added_at);
      const bd = this._parseDate(b.added_at);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return bd - ad;
    });

    const total_count = joined.length;
    const pagedJoined = this._applyPagination(joined, page, page_size);
    const items = pagedJoined.map((j) => j.dev_update);

    return {
      items,
      total_count
    };
  }

  // ----------------------
  // Static Pages: About, Help/FAQ, Policies
  // ----------------------

  // getAboutPageContent()
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      sections: [
        {
          id: 'about-game',
          title: 'About the Game',
          body_html:
            '<p>This site tracks the development of our co-op action RPG across PC, consoles, and beyond. Explore upcoming features, follow your favorites, and see how community feedback shapes the roadmap.</p>'
        },
        {
          id: 'roadmap-philosophy',
          title: 'Roadmap Philosophy',
          body_html:
            '<p>The roadmap is a living document. Items can move between Under Review, Planned, In Progress, Released, Backlog, and Cancelled as we learn from player feedback and internal playtests.</p>'
        },
        {
          id: 'team',
          title: 'The Team',
          body_html:
            '<p>We are a small, remote-first team of developers who rely heavily on community input. Thank you for helping us make the best possible game.</p>'
        }
      ]
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    const stored = this._getFromStorage('help_faq_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      faq_sections: [
        {
          id: 'roadmap',
          title: 'Roadmap & Watchlist',
          items: [
            {
              question: 'How do I filter the roadmap?',
              answer_html:
                '<p>Use the status, platform, feature type, tags, year, and release window filters to narrow down the list of roadmap items. You can also sort by release date, upvotes, or comments.</p>'
            },
            {
              question: 'What is the watchlist?',
              answer_html:
                '<p>The watchlist lets you bookmark roadmap features you care about. Click the star icon on a feature card to add or remove it from your watchlist.</p>'
            }
          ]
        },
        {
          id: 'community',
          title: 'Community Posts & Comments',
          items: [
            {
              question: 'What types of posts can I create?',
              answer_html:
                '<p>You can create feedback posts, discussion threads, bug reports, and polls. Each type appears under its own tab in the Community section.</p>'
            },
            {
              question: 'How do comments work?',
              answer_html:
                '<p>You can reply to roadmap features and community posts. Replies are stored as comments and may be threaded when replying to another comment.</p>'
            }
          ]
        },
        {
          id: 'bug-reports',
          title: 'Bug Reports & Follows',
          items: [
            {
              question: 'How do I follow a bug report?',
              answer_html:
                '<p>Open any bug report and click the Follow button to add it to your followed list. You can unfollow at any time.</p>'
            }
          ]
        },
        {
          id: 'reading-list',
          title: 'Dev Updates & Reading List',
          items: [
            {
              question: 'What is the reading list?',
              answer_html:
                '<p>You can save developer updates to a personal reading list so you can find them again quickly. Use the Save button on any dev update.</p>'
            }
          ]
        }
      ],
      contact_info_html:
        '<p>If you have questions or need support, please contact us through the in-game support tools or via the official support email listed on the main website.</p>'
    };
  }

  // getPoliciesGuidelinesContent()
  getPoliciesGuidelinesContent() {
    const stored = this._getFromStorage('policies_guidelines_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      sections: [
        {
          id: 'terms-of-use',
          title: 'Terms of Use',
          body_html:
            '<p>By using this site you agree to follow the community guidelines and to use the roadmap and feedback tools in good faith. Do not share personal information or violate the terms of the game.</p>'
        },
        {
          id: 'privacy',
          title: 'Privacy',
          body_html:
            '<p>This site stores your preferences, watchlist, followed bug reports, and reading list in local storage on your device. No personal data is transmitted by this SDK.</p>'
        },
        {
          id: 'community-guidelines',
          title: 'Community Guidelines',
          body_html:
            '<p>Be respectful, avoid harassment, hate speech, and spoilers without warnings. Bug reports and feedback should be constructive and focused on improving the game.</p>'
        }
      ],
      related_links: [
        { label: 'About', page: 'about' },
        { label: 'Help & FAQ', page: 'help_faq' }
      ]
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
