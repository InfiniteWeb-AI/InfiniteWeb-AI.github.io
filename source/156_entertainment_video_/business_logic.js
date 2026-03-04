/*
  BusinessLogic implementation for kids entertainment video sharing website.
  - Uses localStorage (with Node-safe polyfill) for persistence
  - No DOM/window/document usage except localStorage access via globalThis
  - All interfaces implemented as specified
*/

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

    // Static label maps
    this._categoryLabels = {
      singing: 'Singing',
      dance: 'Dance',
      comedy: 'Comedy',
      music: 'Music',
      magic: 'Magic',
      prank: 'Prank',
      tutorial: 'Tutorial',
      talent_show: 'Talent Show',
      other: 'Other'
    };

    this._ageGroupLabels = {
      '0_3_years': '0–3 years',
      '4_6_years': '4–6 years',
      '7_9_years': '7–9 years',
      '10_and_under': '10 and under',
      '11_13_years': '11–13 years',
      all_ages: 'All ages'
    };

    // Relative order for age groups (for potential comparisons)
    this._ageGroupOrder = {
      '0_3_years': 1,
      '4_6_years': 2,
      '7_9_years': 3,
      '10_and_under': 4,
      '11_13_years': 5,
      all_ages: 6
    };
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tableKeys = [
      'videos',
      'creators',
      'playlists',
      'playlist_items',
      'series',
      'series_episodes',
      'watch_later_items',
      'video_likes',
      'creator_follows',
      'comments',
      'video_user_ratings',
      'parental_control_settings',
      'user_settings',
      'content_reports',
      'contact_form_submissions'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Informational pages config (static-like content, persisted in localStorage)
    if (!localStorage.getItem('informational_pages')) {
      const informationalPages = {
        about: {
          title: 'About',
          sections: [
            {
              heading: 'About Our Kids Talent Platform',
              body_html: '<p>This platform is dedicated to safe, fun kids talent videos including singing, dancing, comedy, and more.</p>'
            }
          ]
        },
        safety: {
          title: 'Safety',
          sections: [
            {
              heading: 'Safety First',
              body_html: '<p>We provide parental controls and content ratings to help families enjoy age-appropriate entertainment.</p>'
            }
          ]
        },
        help_faq: {
          title: 'Help & FAQ',
          sections: []
        },
        terms_of_use: {
          title: 'Terms of Use',
          sections: []
        },
        privacy_policy: {
          title: 'Privacy Policy',
          sections: []
        }
      };
      localStorage.setItem('informational_pages', JSON.stringify(informationalPages));
    }

    // Contact page config
    if (!localStorage.getItem('contact_page_config')) {
      const contactConfig = {
        support_email: 'support@example.com',
        support_address: '123 Kids Talent Street, Fun City',
        form_intro_text: 'Have questions or feedback? Send us a message and we will get back to you.'
      };
      localStorage.setItem('contact_page_config', JSON.stringify(contactConfig));
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

  _nowIso() {
    return new Date().toISOString();
  }

  _getCategoryLabel(category) {
    return this._categoryLabels[category] || category || '';
  }

  _getAgeGroupLabel(ageGroup) {
    return this._ageGroupLabels[ageGroup] || ageGroup || '';
  }

  _getCoreCategories() {
    return [
      { category_key: 'singing', display_name: 'Singing', description: 'Kids singing performances and covers.' },
      { category_key: 'dance', display_name: 'Dance', description: 'Kids dance performances in various styles.' },
      { category_key: 'comedy', display_name: 'Comedy', description: 'Funny kids sketches and stand-up acts.' },
      { category_key: 'music', display_name: 'Music', description: 'Instrumental performances and music-focused content.' },
      { category_key: 'magic', display_name: 'Magic', description: 'Kids magic tricks and illusions.' },
      { category_key: 'prank', display_name: 'Prank', description: 'Light-hearted prank videos.' },
      { category_key: 'tutorial', display_name: 'Tutorials', description: 'How-to and learning-focused videos.' },
      { category_key: 'talent_show', display_name: 'Talent Shows', description: 'Multi-episode kids talent competitions.' },
      { category_key: 'other', display_name: 'Other', description: 'Other fun kids content.' }
    ];
  }

  // ----------------------
  // Internal helpers specific to domain
  // ----------------------

  _applyVideoFilters(videos, filters) {
    if (!filters) return videos.slice();
    let result = videos.slice();

    if (filters.age_group) {
      result = result.filter(function (v) {
        return v.age_group === filters.age_group;
      });
    }

    if (typeof filters.min_duration_seconds === 'number') {
      result = result.filter(function (v) {
        return v.duration_seconds >= filters.min_duration_seconds;
      });
    }

    if (typeof filters.max_duration_seconds === 'number') {
      result = result.filter(function (v) {
        return v.duration_seconds <= filters.max_duration_seconds;
      });
    }

    if (typeof filters.min_average_rating === 'number') {
      result = result.filter(function (v) {
        return v.average_rating >= filters.min_average_rating;
      });
    }

    if (typeof filters.max_average_rating === 'number') {
      result = result.filter(function (v) {
        return v.average_rating <= filters.max_average_rating;
      });
    }

    if (typeof filters.max_views_count === 'number') {
      result = result.filter(function (v) {
        return v.views_count <= filters.max_views_count;
      });
    }

    if (typeof filters.min_views_count === 'number') {
      result = result.filter(function (v) {
        return v.views_count >= filters.min_views_count;
      });
    }

    if (typeof filters.min_likes_count === 'number') {
      result = result.filter(function (v) {
        return v.likes_count >= filters.min_likes_count;
      });
    }

    if (typeof filters.min_rating_count === 'number') {
      result = result.filter(function (v) {
        return v.rating_count >= filters.min_rating_count;
      });
    }

    if (typeof filters.is_music === 'boolean') {
      result = result.filter(function (v) {
        return v.is_music === filters.is_music;
      });
    }

    if (filters.dance_style) {
      result = result.filter(function (v) {
        return v.dance_style === filters.dance_style;
      });
    }

    return result;
  }

  _sortVideos(videos, sort_by) {
    const sortKey = sort_by || 'relevance';
    const arr = videos.slice();

    if (sortKey === 'most_viewed') {
      arr.sort(function (a, b) { return (b.views_count || 0) - (a.views_count || 0); });
    } else if (sortKey === 'most_liked') {
      arr.sort(function (a, b) { return (b.likes_count || 0) - (a.likes_count || 0); });
    } else if (sortKey === 'highest_rated') {
      arr.sort(function (a, b) { return (b.average_rating || 0) - (a.average_rating || 0); });
    } else if (sortKey === 'most_rated') {
      arr.sort(function (a, b) { return (b.rating_count || 0) - (a.rating_count || 0); });
    } else if (sortKey === 'newest') {
      arr.sort(function (a, b) {
        const ad = a.created_at || a.updated_at || '';
        const bd = b.created_at || b.updated_at || '';
        return (bd > ad ? 1 : bd < ad ? -1 : 0);
      });
    } else {
      // 'relevance' or unknown: leave as-is
    }

    return arr;
  }

  _getOrCreateWatchLaterList() {
    let items = this._getFromStorage('watch_later_items');
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('watch_later_items', items);
    }
    return items;
  }

  _getOrCreateParentalSettingsRecord() {
    let records = this._getFromStorage('parental_control_settings');
    if (!Array.isArray(records)) {
      records = [];
    }
    let record = records.find(function (r) { return r.id === 'default'; });
    const now = this._nowIso();
    if (!record) {
      record = {
        id: 'default',
        max_allowed_age_group: 'all_ages',
        are_comments_hidden: false,
        is_enabled: false,
        pin_code: null,
        is_pin_required_for_changes: false,
        pin_set_at: null,
        last_updated_at: now
      };
      records.push(record);
      this._saveToStorage('parental_control_settings', records);
    }
    return record;
  }

  _getOrCreateUserSettingsRecord() {
    let settingsArr = this._getFromStorage('user_settings');
    if (!Array.isArray(settingsArr)) {
      settingsArr = [];
    }
    let record = settingsArr.find(function (r) { return r.id === 'default'; });
    const now = this._nowIso();
    if (!record) {
      record = {
        id: 'default',
        autoplay_enabled: true,
        default_quality: 'auto',
        ui_language: 'en',
        created_at: now,
        updated_at: now
      };
      settingsArr.push(record);
      this._saveToStorage('user_settings', settingsArr);
    }
    return record;
  }

  _persistUserSettings(settingsRecord) {
    let settingsArr = this._getFromStorage('user_settings');
    if (!Array.isArray(settingsArr)) {
      settingsArr = [];
    }
    const idx = settingsArr.findIndex(function (r) { return r.id === settingsRecord.id; });
    if (idx >= 0) {
      settingsArr[idx] = settingsRecord;
    } else {
      settingsArr.push(settingsRecord);
    }
    this._saveToStorage('user_settings', settingsArr);
  }

  _isVideoInWatchLater(videoId, watchLaterItems) {
    return !!watchLaterItems.find(function (item) { return item.video_id === videoId; });
  }

  _isVideoLiked(videoId, videoLikes) {
    return !!videoLikes.find(function (item) { return item.video_id === videoId; });
  }

  _resolveCreatorForVideo(video, creators) {
    if (!video) return null;
    return creators.find(function (c) { return c.id === video.creator_id; }) || null;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomePageOverview()
  getHomePageOverview() {
    const videos = this._getFromStorage('videos');
    const seriesArr = this._getFromStorage('series');
    const playlists = this._getFromStorage('playlists');
    const watchLaterItems = this._getOrCreateWatchLaterList();
    const videoLikes = this._getFromStorage('video_likes');
    const creators = this._getFromStorage('creators');

    // Featured videos: top by views_count
    const sortedByViews = videos.slice().sort(function (a, b) {
      return (b.views_count || 0) - (a.views_count || 0);
    });
    const featuredVideosRaw = sortedByViews.slice(0, 10);

    const featured_videos = featuredVideosRaw.map(function (v) {
      const creator = creators.find(function (c) { return c.id === v.creator_id; }) || null;
      return {
        video_id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url || null,
        duration_seconds: v.duration_seconds,
        category: v.category,
        category_label: this._getCategoryLabel(v.category),
        age_group: v.age_group,
        age_group_label: this._getAgeGroupLabel(v.age_group),
        views_count: v.views_count,
        likes_count: v.likes_count,
        average_rating: v.average_rating,
        rating_count: v.rating_count,
        creator_name: creator ? creator.name : null,
        is_trending_this_week: !!v.is_trending_this_week,
        is_trending_this_month: !!v.is_trending_this_month,
        is_liked_by_user: this._isVideoLiked(v.id, videoLikes),
        is_in_watch_later: this._isVideoInWatchLater(v.id, watchLaterItems),
        // Foreign key resolution: include creator object
        creator: creator
      };
    }, this);

    // Recommended videos: simple heuristic - highest rating then likes
    const recommendedSorted = videos.slice().sort(function (a, b) {
      if ((b.average_rating || 0) !== (a.average_rating || 0)) {
        return (b.average_rating || 0) - (a.average_rating || 0);
      }
      return (b.likes_count || 0) - (a.likes_count || 0);
    });
    const recommendedRaw = recommendedSorted.slice(0, 20);

    const recommended_videos = recommendedRaw.map(function (v) {
      const creator = creators.find(function (c) { return c.id === v.creator_id; }) || null;
      return {
        video_id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url || null,
        duration_seconds: v.duration_seconds,
        category: v.category,
        category_label: this._getCategoryLabel(v.category),
        age_group: v.age_group,
        age_group_label: this._getAgeGroupLabel(v.age_group),
        views_count: v.views_count,
        likes_count: v.likes_count,
        average_rating: v.average_rating,
        creator_name: creator ? creator.name : null,
        is_liked_by_user: this._isVideoLiked(v.id, videoLikes),
        is_in_watch_later: this._isVideoInWatchLater(v.id, watchLaterItems),
        creator: creator
      };
    }, this);

    const featured_series = seriesArr.slice(0, 10).map(function (s) {
      return {
        series_id: s.id,
        title: s.title,
        description: s.description || '',
        cover_image_url: s.cover_image_url || null,
        category: s.category,
        category_label: this._getCategoryLabel(s.category),
        age_group: s.age_group,
        age_group_label: this._getAgeGroupLabel(s.age_group),
        total_episodes: typeof s.total_episodes === 'number' ? s.total_episodes : 0
      };
    }, this);

    const core_categories = this._getCoreCategories();

    const user_shortcuts = {
      has_playlists: playlists.length > 0,
      playlist_count: playlists.length,
      watch_later_count: watchLaterItems.length
    };

    return {
      featured_videos: featured_videos,
      recommended_videos: recommended_videos,
      featured_series: featured_series,
      core_categories: core_categories,
      user_shortcuts: user_shortcuts
    };
  }

  // getBrowseCategories()
  getBrowseCategories() {
    return this._getCoreCategories().map(function (c) {
      return {
        category_key: c.category_key,
        display_name: c.display_name,
        description: c.description
      };
    });
  }

  // getVideoFilterOptions(context, category)
  getVideoFilterOptions(context, category) { // context and category kept for future specialization
    const age_groups = Object.keys(this._ageGroupLabels).map(function (key) {
      return { value: key, label: this._getAgeGroupLabel(key) };
    }, this);

    const duration_ranges_seconds = [
      { min: 0, max: 240, label: 'Under 4 minutes' },
      { min: 0, max: 300, label: 'Under 5 minutes' },
      { min: 300, max: 600, label: '5–10 minutes' },
      { min: 600, max: 1200, label: '10–20 minutes' },
      { min: 1200, max: 3600, label: '20–60 minutes' }
    ];

    const rating_thresholds = [
      { min_average_rating: 4.5, label: '4.5 stars & up' },
      { min_average_rating: 4.0, label: '4 stars & up' },
      { min_average_rating: 3.0, label: '3 stars & up' },
      { min_average_rating: 0, label: 'All ratings' }
    ];

    const view_count_ranges = [
      { max_views_count: 50000, label: 'Under 50,000 views' },
      { max_views_count: 100000, label: 'Under 100,000 views' },
      { max_views_count: 500000, label: 'Under 500,000 views' }
    ];

    const dance_styles = [
      { value: 'hip_hop', label: 'Hip Hop' },
      { value: 'ballet', label: 'Ballet' },
      { value: 'contemporary', label: 'Contemporary' },
      { value: 'jazz', label: 'Jazz' },
      { value: 'tap', label: 'Tap' },
      { value: 'other', label: 'Other' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Most Relevant' },
      { value: 'most_viewed', label: 'Most Viewed' },
      { value: 'most_liked', label: 'Most Liked' },
      { value: 'highest_rated', label: 'Highest Rated' },
      { value: 'most_rated', label: 'Most Rated' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      age_groups: age_groups,
      duration_ranges_seconds: duration_ranges_seconds,
      rating_thresholds: rating_thresholds,
      view_count_ranges: view_count_ranges,
      dance_styles: dance_styles,
      sort_options: sort_options
    };
  }

  // getCategoryVideos(category, filters, sort_by, page, page_size)
  getCategoryVideos(category, filters, sort_by, page, page_size) {
    const allVideos = this._getFromStorage('videos');
    const creators = this._getFromStorage('creators');
    const watchLaterItems = this._getOrCreateWatchLaterList();
    const videoLikes = this._getFromStorage('video_likes');

    const categoryFiltered = allVideos.filter(function (v) {
      return v.category === category;
    });

    const filtered = this._applyVideoFilters(categoryFiltered, filters || {});
    const sorted = this._sortVideos(filtered, sort_by);

    const actualPage = page && page > 0 ? page : 1;
    const actualPageSize = page_size && page_size > 0 ? page_size : 20;
    const start = (actualPage - 1) * actualPageSize;
    const end = start + actualPageSize;
    const pageItems = sorted.slice(start, end);

    const videos = pageItems.map(function (v) {
      const creator = creators.find(function (c) { return c.id === v.creator_id; }) || null;
      return {
        video_id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url || null,
        duration_seconds: v.duration_seconds,
        category: v.category,
        category_label: this._getCategoryLabel(v.category),
        age_group: v.age_group,
        age_group_label: this._getAgeGroupLabel(v.age_group),
        views_count: v.views_count,
        likes_count: v.likes_count,
        average_rating: v.average_rating,
        rating_count: v.rating_count,
        creator_id: v.creator_id,
        creator_name: creator ? creator.name : null,
        dance_style: v.dance_style || null,
        is_music: !!v.is_music,
        is_liked_by_user: this._isVideoLiked(v.id, videoLikes),
        is_in_watch_later: this._isVideoInWatchLater(v.id, watchLaterItems),
        // Foreign key resolution
        creator: creator
      };
    }, this);

    return {
      videos: videos,
      page: actualPage,
      page_size: actualPageSize,
      total_results: sorted.length
    };
  }

  // getTrendingVideos(time_range, filters, sort_by, page, page_size)
  getTrendingVideos(time_range, filters, sort_by, page, page_size) {
    const allVideos = this._getFromStorage('videos');
    const creators = this._getFromStorage('creators');
    const watchLaterItems = this._getOrCreateWatchLaterList();
    const videoLikes = this._getFromStorage('video_likes');

    let trending = allVideos.filter(function (v) {
      if (time_range === 'this_week') {
        return !!v.is_trending_this_week;
      }
      if (time_range === 'this_month') {
        return !!v.is_trending_this_month;
      }
      return false;
    });

    const f = filters || {};

    if (f.category) {
      trending = trending.filter(function (v) { return v.category === f.category; });
    }

    // Apply the rest of the filters (age_group, duration, is_music, dance_style, etc.)
    const filtered = this._applyVideoFilters(trending, f);

    const sorted = this._sortVideos(filtered, sort_by || 'most_viewed');

    const actualPage = page && page > 0 ? page : 1;
    const actualPageSize = page_size && page_size > 0 ? page_size : 20;
    const start = (actualPage - 1) * actualPageSize;
    const end = start + actualPageSize;
    const pageItems = sorted.slice(start, end);

    const videos = pageItems.map(function (v) {
      const creator = creators.find(function (c) { return c.id === v.creator_id; }) || null;
      return {
        video_id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url || null,
        duration_seconds: v.duration_seconds,
        category: v.category,
        category_label: this._getCategoryLabel(v.category),
        age_group: v.age_group,
        age_group_label: this._getAgeGroupLabel(v.age_group),
        views_count: v.views_count,
        likes_count: v.likes_count,
        average_rating: v.average_rating,
        rating_count: v.rating_count,
        creator_id: v.creator_id,
        creator_name: creator ? creator.name : null,
        is_music: !!v.is_music,
        is_trending_this_week: !!v.is_trending_this_week,
        is_trending_this_month: !!v.is_trending_this_month,
        is_liked_by_user: this._isVideoLiked(v.id, videoLikes),
        is_in_watch_later: this._isVideoInWatchLater(v.id, watchLaterItems),
        creator: creator
      };
    }, this);

    return {
      videos: videos,
      page: actualPage,
      page_size: actualPageSize,
      total_results: sorted.length
    };
  }

  // searchContent(query, filters, sort_by, page, page_size)
  searchContent(query, filters, sort_by, page, page_size) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sortKey = sort_by || 'most_relevant';

    const contentTypes = Array.isArray(f.content_types) && f.content_types.length > 0
      ? f.content_types
      : ['video'];

    const videosTable = this._getFromStorage('videos');
    const seriesTable = this._getFromStorage('series');
    const playlistsTable = this._getFromStorage('playlists');
    const creators = this._getFromStorage('creators');
    const watchLaterItems = this._getOrCreateWatchLaterList();
    const videoLikes = this._getFromStorage('video_likes');

    const results = [];

    if (contentTypes.indexOf('video') !== -1) {
      let vids = videosTable.filter(function (v) {
        const text = (v.title || '') + ' ' + (v.description || '') + ' ' + (Array.isArray(v.tags) ? v.tags.join(' ') : '');
        return q === '' || text.toLowerCase().indexOf(q) !== -1;
      });

      // Apply video-specific filters using _applyVideoFilters
      vids = this._applyVideoFilters(vids, f);

      // Additional category filter for search context
      if (f.category) {
        vids = vids.filter(function (v) { return v.category === f.category; });
      }

      let sortedVids = vids.slice();
      if (sortKey === 'most_viewed') {
        sortedVids = this._sortVideos(vids, 'most_viewed');
      } else if (sortKey === 'most_liked') {
        sortedVids = this._sortVideos(vids, 'most_liked');
      } else if (sortKey === 'most_rated') {
        sortedVids = this._sortVideos(vids, 'most_rated');
      } else if (sortKey === 'highest_rated') {
        sortedVids = this._sortVideos(vids, 'highest_rated');
      } else if (sortKey === 'newest') {
        sortedVids = this._sortVideos(vids, 'newest');
      } else {
        // 'most_relevant': rough relevance by views
        sortedVids = this._sortVideos(vids, 'most_viewed');
      }

      sortedVids.forEach(function (v) {
        const creator = creators.find(function (c) { return c.id === v.creator_id; }) || null;
        results.push({
          content_type: 'video',
          video: {
            video_id: v.id,
            title: v.title,
            thumbnail_url: v.thumbnail_url || null,
            duration_seconds: v.duration_seconds,
            category: v.category,
            category_label: this._getCategoryLabel(v.category),
            age_group: v.age_group,
            age_group_label: this._getAgeGroupLabel(v.age_group),
            views_count: v.views_count,
            likes_count: v.likes_count,
            average_rating: v.average_rating,
            rating_count: v.rating_count,
            creator_id: v.creator_id,
            creator_name: creator ? creator.name : null,
            is_liked_by_user: this._isVideoLiked(v.id, videoLikes),
            is_in_watch_later: this._isVideoInWatchLater(v.id, watchLaterItems),
            // Foreign key resolution: embed creator
            creator: creator
          },
          series: null,
          playlist: null
        });
      }, this);
    }

    if (contentTypes.indexOf('series') !== -1) {
      const seriesFiltered = seriesTable.filter(function (s) {
        const text = (s.title || '') + ' ' + (s.description || '');
        if (q && text.toLowerCase().indexOf(q) === -1) return false;
        if (f.category && s.category !== f.category) return false;
        if (f.age_group && s.age_group !== f.age_group) return false;
        return true;
      });

      seriesFiltered.forEach(function (s) {
        results.push({
          content_type: 'series',
          video: null,
          series: {
            series_id: s.id,
            title: s.title,
            description: s.description || '',
            cover_image_url: s.cover_image_url || null,
            category: s.category,
            category_label: this._getCategoryLabel(s.category),
            age_group: s.age_group,
            age_group_label: this._getAgeGroupLabel(s.age_group),
            total_episodes: typeof s.total_episodes === 'number' ? s.total_episodes : 0
          },
          playlist: null
        });
      }, this);
    }

    if (contentTypes.indexOf('playlist') !== -1) {
      const playlistsFiltered = playlistsTable.filter(function (p) {
        const text = (p.name || '') + ' ' + (p.description || '');
        return q === '' || text.toLowerCase().indexOf(q) !== -1;
      });

      playlistsFiltered.forEach(function (p) {
        results.push({
          content_type: 'playlist',
          video: null,
          series: null,
          playlist: {
            playlist_id: p.id,
            name: p.name,
            description: p.description || '',
            cover_image_url: p.cover_image_url || null,
            video_count: typeof p.video_count === 'number' ? p.video_count : 0
          }
        });
      });
    }

    // Basic cross-type sorting by "relevance" using video views when available
    let sortedResults = results.slice();
    if (sortKey === 'newest') {
      sortedResults.sort(function (a, b) {
        const aDate = (a.video && a.video.created_at) || (a.series && a.series.created_at) || '';
        const bDate = (b.video && b.video.created_at) || (b.series && b.series.created_at) || '';
        return bDate > aDate ? 1 : bDate < aDate ? -1 : 0;
      });
    } else {
      sortedResults.sort(function (a, b) {
        const av = a.video ? (a.video.views_count || 0) : 0;
        const bv = b.video ? (b.video.views_count || 0) : 0;
        return bv - av;
      });
    }

    const actualPage = page && page > 0 ? page : 1;
    const actualPageSize = page_size && page_size > 0 ? page_size : 20;
    const start = (actualPage - 1) * actualPageSize;
    const end = start + actualPageSize;
    const pageItems = sortedResults.slice(start, end);

    return {
      results: pageItems,
      page: actualPage,
      page_size: actualPageSize,
      total_results: sortedResults.length
    };
  }

  // getVideoDetail(videoId)
  getVideoDetail(videoId) {
    const videos = this._getFromStorage('videos');
    const creators = this._getFromStorage('creators');
    const videoLikes = this._getFromStorage('video_likes');
    const watchLaterItems = this._getOrCreateWatchLaterList();
    const userRatings = this._getFromStorage('video_user_ratings');
    const creatorFollows = this._getFromStorage('creator_follows');

    const v = videos.find(function (item) { return item.id === videoId; });
    if (!v) {
      return null;
    }

    const creator = creators.find(function (c) { return c.id === v.creator_id; }) || null;

    const userRatingRec = userRatings.find(function (r) { return r.video_id === videoId; });
    const isLiked = this._isVideoLiked(videoId, videoLikes);
    const inWatchLater = this._isVideoInWatchLater(videoId, watchLaterItems);
    const isFollowingCreator = creator ? !!creatorFollows.find(function (f) { return f.creator_id === creator.id; }) : false;

    const parentalRecord = this._getOrCreateParentalSettingsRecord();
    const commentsVisibleByParental = !parentalRecord.is_enabled || !parentalRecord.are_comments_hidden;
    const canUserComment = commentsVisibleByParental && v.is_commenting_enabled;

    const video = {
      video_id: v.id,
      title: v.title,
      description: v.description || '',
      video_url: v.video_url || null,
      thumbnail_url: v.thumbnail_url || null,
      category: v.category,
      category_label: this._getCategoryLabel(v.category),
      age_group: v.age_group,
      age_group_label: this._getAgeGroupLabel(v.age_group),
      duration_seconds: v.duration_seconds,
      views_count: v.views_count,
      likes_count: v.likes_count,
      average_rating: v.average_rating,
      rating_count: v.rating_count,
      is_music: !!v.is_music,
      dance_style: v.dance_style || null,
      tags: Array.isArray(v.tags) ? v.tags : [],
      created_at: v.created_at
    };

    const creatorObj = creator
      ? {
          creator_id: creator.id,
          name: creator.name,
          avatar_url: creator.avatar_url || null,
          description: creator.description || '',
          followers_count: creator.followers_count || 0,
          total_videos: creator.total_videos || 0
        }
      : null;

    const user_state = {
      is_liked_by_user: isLiked,
      is_in_watch_later: inWatchLater,
      user_rating_value: userRatingRec ? userRatingRec.rating_value : null,
      is_following_creator: isFollowingCreator
    };

    const parental_controls_effective = {
      comments_visible: commentsVisibleByParental,
      can_user_comment: canUserComment
    };

    // Simple recommended videos: other videos in same category
    const recommendedVideos = videos
      .filter(function (item) { return item.id !== v.id && item.category === v.category; })
      .slice(0, 10)
      .map(function (rv) {
        const c = creators.find(function (cr) { return cr.id === rv.creator_id; }) || null;
        return {
          video_id: rv.id,
          title: rv.title,
          thumbnail_url: rv.thumbnail_url || null,
          duration_seconds: rv.duration_seconds,
          category: rv.category,
          age_group: rv.age_group,
          views_count: rv.views_count,
          likes_count: rv.likes_count,
          average_rating: rv.average_rating,
          creator_name: c ? c.name : null
        };
      });

    return {
      video: video,
      creator: creatorObj,
      user_state: user_state,
      parental_controls_effective: parental_controls_effective,
      recommended_videos: recommendedVideos
    };
  }

  // getVideoComments(videoId, page, page_size)
  getVideoComments(videoId, page, page_size) {
    const videos = this._getFromStorage('videos');
    const commentsTable = this._getFromStorage('comments');
    const v = videos.find(function (item) { return item.id === videoId; });
    const parentalRecord = this._getOrCreateParentalSettingsRecord();

    const commentsVisibleByParental = !parentalRecord.is_enabled || !parentalRecord.are_comments_hidden;
    const commentsVisible = commentsVisibleByParental && v && v.is_commenting_enabled;

    const actualPage = page && page > 0 ? page : 1;
    const actualPageSize = page_size && page_size > 0 ? page_size : 20;

    if (!commentsVisible) {
      return {
        comments_visible: false,
        comments: [],
        page: actualPage,
        page_size: actualPageSize,
        total_results: 0
      };
    }

    const filteredComments = commentsTable.filter(function (c) { return c.video_id === videoId; });

    // Sort by created_at ascending
    filteredComments.sort(function (a, b) {
      const ad = a.created_at || '';
      const bd = b.created_at || '';
      return ad > bd ? 1 : ad < bd ? -1 : 0;
    });

    const start = (actualPage - 1) * actualPageSize;
    const end = start + actualPageSize;
    const pageItems = filteredComments.slice(start, end);

    // Foreign key resolution: include video object
    const comments = pageItems.map(function (c) {
      return {
        id: c.id,
        video_id: c.video_id,
        text: c.text,
        created_at: c.created_at,
        author_display_name: c.author_display_name || null,
        is_by_current_user: !!c.is_by_current_user,
        video: v || null
      };
    });

    return {
      comments_visible: true,
      comments: comments,
      page: actualPage,
      page_size: actualPageSize,
      total_results: filteredComments.length
    };
  }

  // addCommentToVideo(videoId, text)
  addCommentToVideo(videoId, text) {
    const videos = this._getFromStorage('videos');
    const commentsTable = this._getFromStorage('comments');
    const v = videos.find(function (item) { return item.id === videoId; });
    const parentalRecord = this._getOrCreateParentalSettingsRecord();

    if (!v) {
      return {
        success: false,
        comments_visible: false,
        comment: null,
        message: 'Video not found.'
      };
    }

    const commentsVisibleByParental = !parentalRecord.is_enabled || !parentalRecord.are_comments_hidden;
    const commentsVisible = commentsVisibleByParental && v.is_commenting_enabled;

    if (!commentsVisible) {
      return {
        success: false,
        comments_visible: false,
        comment: null,
        message: 'Comments are disabled for this video.'
      };
    }

    const trimmed = String(text || '').trim();
    if (!trimmed) {
      return {
        success: false,
        comments_visible: true,
        comment: null,
        message: 'Comment text is required.'
      };
    }

    const newComment = {
      id: this._generateId('comment'),
      video_id: videoId,
      text: trimmed,
      created_at: this._nowIso(),
      author_display_name: 'You',
      is_by_current_user: true
    };

    commentsTable.push(newComment);
    this._saveToStorage('comments', commentsTable);

    return {
      success: true,
      comments_visible: true,
      comment: newComment,
      message: ''
    };
  }

  // toggleVideoLike(videoId, like)
  toggleVideoLike(videoId, like) {
    const videos = this._getFromStorage('videos');
    const videoLikes = this._getFromStorage('video_likes');
    const v = videos.find(function (item) { return item.id === videoId; });
    if (!v) {
      return {
        video_id: videoId,
        is_liked_by_user: false,
        likes_count: 0
      };
    }

    const existingIndex = videoLikes.findIndex(function (item) { return item.video_id === videoId; });

    if (like) {
      if (existingIndex === -1) {
        const newLike = {
          id: this._generateId('videolike'),
          video_id: videoId,
          liked_at: this._nowIso()
        };
        videoLikes.push(newLike);
        v.likes_count = (v.likes_count || 0) + 1;
      }
    } else {
      if (existingIndex !== -1) {
        videoLikes.splice(existingIndex, 1);
        v.likes_count = Math.max(0, (v.likes_count || 0) - 1);
      }
    }

    this._saveToStorage('video_likes', videoLikes);
    this._saveToStorage('videos', videos);

    return {
      video_id: videoId,
      is_liked_by_user: like && this._isVideoLiked(videoId, videoLikes),
      likes_count: v.likes_count || 0
    };
  }

  // rateVideo(videoId, ratingValue)
  rateVideo(videoId, ratingValue) {
    const videos = this._getFromStorage('videos');
    const userRatings = this._getFromStorage('video_user_ratings');
    const v = videos.find(function (item) { return item.id === videoId; });
    if (!v) {
      return {
        video_id: videoId,
        user_rating_value: null,
        average_rating: null,
        rating_count: null
      };
    }

    let value = Number(ratingValue);
    if (isNaN(value)) value = 0;
    if (value < 1) value = 1;
    if (value > 5) value = 5;

    const existingIndex = userRatings.findIndex(function (r) { return r.video_id === videoId; });
    const now = this._nowIso();

    let previousValue = null;
    if (existingIndex !== -1) {
      previousValue = userRatings[existingIndex].rating_value;
      userRatings[existingIndex].rating_value = value;
      userRatings[existingIndex].rated_at = now;
    } else {
      userRatings.push({
        id: this._generateId('videorating'),
        video_id: videoId,
        rating_value: value,
        rated_at: now
      });
    }

    // Update aggregate rating on Video using incremental formula
    const currentCount = v.rating_count || 0;
    const currentAvg = v.average_rating || 0;
    let newCount = currentCount;
    let newAvg = currentAvg;

    if (currentCount <= 0) {
      // No previous aggregation
      newCount = 1;
      newAvg = value;
    } else if (previousValue === null) {
      // New rating
      newCount = currentCount + 1;
      newAvg = (currentAvg * currentCount + value) / newCount;
    } else {
      // Rating update by same user, keep count but adjust sum
      const totalBefore = currentAvg * currentCount;
      const totalAfter = totalBefore - previousValue + value;
      newCount = currentCount;
      newAvg = newCount > 0 ? totalAfter / newCount : 0;
    }

    v.rating_count = newCount;
    v.average_rating = newAvg;

    this._saveToStorage('video_user_ratings', userRatings);
    this._saveToStorage('videos', videos);

    return {
      video_id: videoId,
      user_rating_value: value,
      average_rating: v.average_rating,
      rating_count: v.rating_count
    };
  }

  // addVideoToWatchLater(videoId)
  addVideoToWatchLater(videoId) {
    const videos = this._getFromStorage('videos');
    const v = videos.find(function (item) { return item.id === videoId; });
    if (!v) {
      return {
        video_id: videoId,
        is_in_watch_later: false,
        watch_later_count: this._getOrCreateWatchLaterList().length
      };
    }

    const watchLaterItems = this._getOrCreateWatchLaterList();
    const existing = watchLaterItems.find(function (item) { return item.video_id === videoId; });

    if (!existing) {
      const newItem = {
        id: this._generateId('watchlater'),
        video_id: videoId,
        added_at: this._nowIso(),
        position: watchLaterItems.length + 1
      };
      watchLaterItems.push(newItem);
      this._saveToStorage('watch_later_items', watchLaterItems);
    }

    return {
      video_id: videoId,
      is_in_watch_later: true,
      watch_later_count: watchLaterItems.length
    };
  }

  // removeVideoFromWatchLater(videoId)
  removeVideoFromWatchLater(videoId) {
    let watchLaterItems = this._getOrCreateWatchLaterList();
    const beforeLength = watchLaterItems.length;
    watchLaterItems = watchLaterItems.filter(function (item) { return item.video_id !== videoId; });

    // Recalculate positions
    watchLaterItems.forEach(function (item, index) {
      item.position = index + 1;
    });

    this._saveToStorage('watch_later_items', watchLaterItems);

    return {
      video_id: videoId,
      is_in_watch_later: false,
      watch_later_count: watchLaterItems.length
    };
  }

  // getWatchLaterItems()
  getWatchLaterItems() {
    const watchLaterItems = this._getOrCreateWatchLaterList();
    const videos = this._getFromStorage('videos');
    const creators = this._getFromStorage('creators');

    // Sort by position then added_at
    const sorted = watchLaterItems.slice().sort(function (a, b) {
      if ((a.position || 0) !== (b.position || 0)) {
        return (a.position || 0) - (b.position || 0);
      }
      const ad = a.added_at || '';
      const bd = b.added_at || '';
      return ad > bd ? 1 : ad < bd ? -1 : 0;
    });

    const items = sorted.map(function (item) {
      const v = videos.find(function (vv) { return vv.id === item.video_id; }) || null;
      let videoObj = null;
      if (v) {
        const creator = creators.find(function (c) { return c.id === v.creator_id; }) || null;
        videoObj = {
          video_id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url || null,
          duration_seconds: v.duration_seconds,
          age_group: v.age_group,
          age_group_label: this._getAgeGroupLabel(v.age_group),
          average_rating: v.average_rating,
          category: v.category,
          creator_name: creator ? creator.name : null,
          creator: creator
        };
      }
      return {
        watch_later_item_id: item.id,
        position: item.position,
        added_at: item.added_at,
        video: videoObj
      };
    }, this);

    return { items: items };
  }

  // reorderWatchLaterItems(orderedWatchLaterItemIds)
  reorderWatchLaterItems(orderedWatchLaterItemIds) {
    const ids = Array.isArray(orderedWatchLaterItemIds) ? orderedWatchLaterItemIds : [];
    const watchLaterItems = this._getOrCreateWatchLaterList();

    const idToItem = {};
    watchLaterItems.forEach(function (item) {
      idToItem[item.id] = item;
    });

    ids.forEach(function (id, index) {
      const item = idToItem[id];
      if (item) {
        item.position = index + 1;
      }
    });

    this._saveToStorage('watch_later_items', watchLaterItems);
    return { success: true };
  }

  // followCreator(creatorId)
  followCreator(creatorId) {
    const creators = this._getFromStorage('creators');
    const creatorFollows = this._getFromStorage('creator_follows');

    const creator = creators.find(function (c) { return c.id === creatorId; });
    if (!creator) {
      return {
        creator_id: creatorId,
        is_following: false,
        followers_count: 0
      };
    }

    const existing = creatorFollows.find(function (f) { return f.creator_id === creatorId; });
    if (!existing) {
      creatorFollows.push({
        id: this._generateId('creatorfollow'),
        creator_id: creatorId,
        followed_at: this._nowIso()
      });
      creator.followers_count = (creator.followers_count || 0) + 1;

      this._saveToStorage('creator_follows', creatorFollows);
      this._saveToStorage('creators', creators);
    }

    return {
      creator_id: creatorId,
      is_following: true,
      followers_count: creator.followers_count || 0
    };
  }

  // unfollowCreator(creatorId)
  unfollowCreator(creatorId) {
    const creators = this._getFromStorage('creators');
    let creatorFollows = this._getFromStorage('creator_follows');

    const creator = creators.find(function (c) { return c.id === creatorId; });

    const beforeLength = creatorFollows.length;
    creatorFollows = creatorFollows.filter(function (f) { return f.creator_id !== creatorId; });

    if (creator && creatorFollows.length < beforeLength) {
      creator.followers_count = Math.max(0, (creator.followers_count || 0) - 1);
    }

    this._saveToStorage('creator_follows', creatorFollows);
    this._saveToStorage('creators', creators);

    return {
      creator_id: creatorId,
      is_following: false,
      followers_count: creator ? creator.followers_count || 0 : 0
    };
  }

  // getUserPlaylistsSummary()
  getUserPlaylistsSummary() {
    const playlists = this._getFromStorage('playlists');

    return playlists.map(function (p) {
      return {
        playlist_id: p.id,
        name: p.name,
        description: p.description || '',
        cover_image_url: p.cover_image_url || null,
        video_count: typeof p.video_count === 'number' ? p.video_count : 0,
        last_updated_at: p.updated_at || p.created_at || null
      };
    });
  }

  // getPlaylistDetail(playlistId)
  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');
    const videos = this._getFromStorage('videos');
    const creators = this._getFromStorage('creators');

    const playlist = playlists.find(function (p) { return p.id === playlistId; });
    if (!playlist) {
      return null;
    }

    const itemsForPlaylist = playlistItems
      .filter(function (item) { return item.playlist_id === playlistId; })
      .sort(function (a, b) { return (a.position || 0) - (b.position || 0); });

    const items = itemsForPlaylist.map(function (item) {
      const v = videos.find(function (vv) { return vv.id === item.video_id; }) || null;
      let videoObj = null;
      if (v) {
        const creator = creators.find(function (c) { return c.id === v.creator_id; }) || null;
        videoObj = {
          video_id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url || null,
          duration_seconds: v.duration_seconds,
          age_group: v.age_group,
          age_group_label: this._getAgeGroupLabel(v.age_group),
          average_rating: v.average_rating,
          category: v.category,
          creator_name: creator ? creator.name : null,
          creator: creator
        };
      }
      return {
        playlist_item_id: item.id,
        position: item.position,
        added_at: item.added_at,
        video: videoObj
      };
    }, this);

    return {
      playlist_id: playlist.id,
      name: playlist.name,
      description: playlist.description || '',
      cover_image_url: playlist.cover_image_url || null,
      video_count: items.length,
      created_at: playlist.created_at || null,
      updated_at: playlist.updated_at || null,
      items: items
    };
  }

  // createPlaylist(name, description)
  createPlaylist(name, description) {
    const playlists = this._getFromStorage('playlists');
    const now = this._nowIso();
    const playlist = {
      id: this._generateId('playlist'),
      name: String(name || '').trim(),
      description: description ? String(description) : '',
      cover_image_url: null,
      video_count: 0,
      created_at: now,
      updated_at: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    return {
      playlist_id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      cover_image_url: playlist.cover_image_url,
      video_count: playlist.video_count,
      created_at: playlist.created_at
    };
  }

  // renamePlaylist(playlistId, newName, newDescription)
  renamePlaylist(playlistId, newName, newDescription) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find(function (p) { return p.id === playlistId; });
    if (!playlist) {
      return null;
    }

    playlist.name = String(newName || '').trim();
    if (typeof newDescription !== 'undefined') {
      playlist.description = newDescription ? String(newDescription) : '';
    }
    playlist.updated_at = this._nowIso();

    this._saveToStorage('playlists', playlists);

    return {
      playlist_id: playlist.id,
      name: playlist.name,
      description: playlist.description
    };
  }

  // deletePlaylist(playlistId)
  deletePlaylist(playlistId) {
    let playlists = this._getFromStorage('playlists');
    let playlistItems = this._getFromStorage('playlist_items');

    const beforeLength = playlists.length;
    playlists = playlists.filter(function (p) { return p.id !== playlistId; });

    playlistItems = playlistItems.filter(function (item) { return item.playlist_id !== playlistId; });

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_items', playlistItems);

    return {
      success: playlists.length < beforeLength
    };
  }

  // createPlaylistAndAddVideo(name, description, videoId)
  createPlaylistAndAddVideo(name, description, videoId) {
    const videos = this._getFromStorage('videos');
    const v = videos.find(function (item) { return item.id === videoId; });
    if (!v) {
      return null;
    }

    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');

    const now = this._nowIso();
    const playlistId = this._generateId('playlist');
    const playlist = {
      id: playlistId,
      name: String(name || '').trim(),
      description: description ? String(description) : '',
      cover_image_url: null,
      video_count: 1,
      created_at: now,
      updated_at: now
    };
    playlists.push(playlist);

    const playlistItemId = this._generateId('playlistitem');
    const playlistItem = {
      id: playlistItemId,
      playlist_id: playlistId,
      video_id: videoId,
      position: 1,
      added_at: now
    };
    playlistItems.push(playlistItem);

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_items', playlistItems);

    return {
      playlist_id: playlistId,
      name: playlist.name,
      video_count: playlist.video_count,
      created_item: {
        playlist_item_id: playlistItemId,
        position: 1,
        video_id: videoId
      }
    };
  }

  // addVideoToExistingPlaylist(videoId, playlistId)
  addVideoToExistingPlaylist(videoId, playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');
    const videos = this._getFromStorage('videos');

    const playlist = playlists.find(function (p) { return p.id === playlistId; });
    const video = videos.find(function (v) { return v.id === videoId; });

    if (!playlist || !video) {
      return null;
    }

    const itemsForPlaylist = playlistItems.filter(function (item) { return item.playlist_id === playlistId; });
    const newPosition = itemsForPlaylist.length + 1;

    const playlistItemId = this._generateId('playlistitem');
    const playlistItem = {
      id: playlistItemId,
      playlist_id: playlistId,
      video_id: videoId,
      position: newPosition,
      added_at: this._nowIso()
    };

    playlistItems.push(playlistItem);
    playlist.video_count = (playlist.video_count || 0) + 1;
    playlist.updated_at = this._nowIso();

    this._saveToStorage('playlist_items', playlistItems);
    this._saveToStorage('playlists', playlists);

    return {
      playlist_id: playlistId,
      playlist_item_id: playlistItemId,
      position: newPosition,
      video_id: videoId,
      video_count: playlist.video_count
    };
  }

  // removeVideoFromPlaylist(playlistItemId)
  removeVideoFromPlaylist(playlistItemId) {
    const playlists = this._getFromStorage('playlists');
    let playlistItems = this._getFromStorage('playlist_items');

    const targetItem = playlistItems.find(function (item) { return item.id === playlistItemId; });
    if (!targetItem) {
      return {
        success: false,
        playlist_item_id: playlistItemId
      };
    }

    const playlist = playlists.find(function (p) { return p.id === targetItem.playlist_id; });

    playlistItems = playlistItems.filter(function (item) { return item.id !== playlistItemId; });

    const itemsSamePlaylist = playlistItems
      .filter(function (item) { return item.playlist_id === (playlist ? playlist.id : null); })
      .sort(function (a, b) { return (a.position || 0) - (b.position || 0); });

    itemsSamePlaylist.forEach(function (item, index) {
      item.position = index + 1;
    });

    if (playlist) {
      playlist.video_count = Math.max(0, (playlist.video_count || 0) - 1);
      playlist.updated_at = this._nowIso();
    }

    this._saveToStorage('playlist_items', playlistItems);
    this._saveToStorage('playlists', playlists);

    return {
      success: true,
      playlist_item_id: playlistItemId
    };
  }

  // reorderPlaylistItems(playlistId, orderedPlaylistItemIds)
  reorderPlaylistItems(playlistId, orderedPlaylistItemIds) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');

    const playlist = playlists.find(function (p) { return p.id === playlistId; });
    if (!playlist) {
      return { success: false };
    }

    const ids = Array.isArray(orderedPlaylistItemIds) ? orderedPlaylistItemIds : [];

    const itemsMap = {};
    playlistItems.forEach(function (item) {
      if (item.playlist_id === playlistId) {
        itemsMap[item.id] = item;
      }
    });

    ids.forEach(function (id, index) {
      const item = itemsMap[id];
      if (item) {
        item.position = index + 1;
      }
    });

    this._saveToStorage('playlist_items', playlistItems);
    return { success: true };
  }

  // getSeriesDetail(seriesId)
  getSeriesDetail(seriesId) {
    const seriesTable = this._getFromStorage('series');
    const seriesEpisodes = this._getFromStorage('series_episodes');
    const videos = this._getFromStorage('videos');

    const seriesObj = seriesTable.find(function (s) { return s.id === seriesId; });
    if (!seriesObj) {
      return null;
    }

    const episodesForSeries = seriesEpisodes
      .filter(function (se) { return se.series_id === seriesId; })
      .sort(function (a, b) { return (a.episode_number || 0) - (b.episode_number || 0); });

    const episodes = episodesForSeries.map(function (se) {
      let v = videos.find(function (vv) { return vv.id === se.video_id; }) || null;
      // If the referenced video does not exist in the videos table, create a minimal stub
      if (!v) {
        v = {
          id: se.video_id,
          title: se.title || seriesObj.title || '',
          description: se.description || seriesObj.description || '',
          category: seriesObj.category,
          age_group: seriesObj.age_group,
          duration_seconds: 0,
          thumbnail_url: seriesObj.cover_image_url || null,
          video_url: null,
          views_count: 0,
          creator_id: null,
          is_music: false,
          dance_style: null,
          tags: [],
          is_trending_this_week: false,
          is_trending_this_month: false,
          is_commenting_enabled: true,
          created_at: se.created_at || seriesObj.created_at || this._nowIso(),
          updated_at: seriesObj.updated_at || seriesObj.created_at || se.created_at || this._nowIso(),
          likes_count: 0,
          rating_count: 0,
          average_rating: 0
        };
        videos.push(v);
      }
      const videoObj = {
        video_id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url || null,
        duration_seconds: v.duration_seconds,
        views_count: v.views_count,
        likes_count: v.likes_count,
        average_rating: v.average_rating
      };
      return {
        series_episode_id: se.id,
        episode_number: se.episode_number,
        title: se.title || '',
        description: se.description || '',
        video: videoObj
      };
    }, this);

    // Persist any stub videos that may have been created for episodes
    this._saveToStorage('videos', videos);

    return {
      series_id: seriesObj.id,
      title: seriesObj.title,
      description: seriesObj.description || '',
      cover_image_url: seriesObj.cover_image_url || null,
      category: seriesObj.category,
      category_label: this._getCategoryLabel(seriesObj.category),
      age_group: seriesObj.age_group,
      age_group_label: this._getAgeGroupLabel(seriesObj.age_group),
      total_episodes: typeof seriesObj.total_episodes === 'number' ? seriesObj.total_episodes : episodes.length,
      episodes: episodes
    };
  }

  // getUserSettings()
  getUserSettings() {
    const settings = this._getOrCreateUserSettingsRecord();
    const parental = this._getOrCreateParentalSettingsRecord();

    const parentalSummary = {
      is_enabled: !!parental.is_enabled,
      max_allowed_age_group: parental.max_allowed_age_group,
      max_allowed_age_group_label: this._getAgeGroupLabel(parental.max_allowed_age_group),
      are_comments_hidden: !!parental.are_comments_hidden
    };

    return {
      autoplay_enabled: settings.autoplay_enabled,
      default_quality: settings.default_quality,
      ui_language: settings.ui_language,
      created_at: settings.created_at,
      updated_at: settings.updated_at,
      parental_control_summary: parentalSummary
    };
  }

  // updateUserSettings(autoplayEnabled, defaultQuality, uiLanguage)
  updateUserSettings(autoplayEnabled, defaultQuality, uiLanguage) {
    const settings = this._getOrCreateUserSettingsRecord();

    if (typeof autoplayEnabled === 'boolean') {
      settings.autoplay_enabled = autoplayEnabled;
    }
    if (typeof defaultQuality !== 'undefined' && defaultQuality) {
      settings.default_quality = defaultQuality;
    }
    if (typeof uiLanguage !== 'undefined' && uiLanguage) {
      settings.ui_language = uiLanguage;
    }
    settings.updated_at = this._nowIso();

    this._persistUserSettings(settings);

    return {
      autoplay_enabled: settings.autoplay_enabled,
      default_quality: settings.default_quality,
      ui_language: settings.ui_language,
      updated_at: settings.updated_at
    };
  }

  // getParentalControlSettings()
  getParentalControlSettings() {
    const parental = this._getOrCreateParentalSettingsRecord();

    return {
      is_enabled: !!parental.is_enabled,
      max_allowed_age_group: parental.max_allowed_age_group,
      max_allowed_age_group_label: this._getAgeGroupLabel(parental.max_allowed_age_group),
      are_comments_hidden: !!parental.are_comments_hidden,
      is_pin_required_for_changes: !!parental.is_pin_required_for_changes,
      pin_set: !!parental.pin_code,
      last_updated_at: parental.last_updated_at
    };
  }

  // updateParentalControlSettings(isEnabled, maxAllowedAgeGroup, areCommentsHidden, pinCode, isPinRequiredForChanges)
  updateParentalControlSettings(isEnabled, maxAllowedAgeGroup, areCommentsHidden, pinCode, isPinRequiredForChanges) {
    const parentalRecords = this._getFromStorage('parental_control_settings');
    let record = parentalRecords.find(function (r) { return r.id === 'default'; });
    const now = this._nowIso();
    if (!record) {
      record = {
        id: 'default',
        max_allowed_age_group: 'all_ages',
        are_comments_hidden: false,
        is_enabled: false,
        pin_code: null,
        is_pin_required_for_changes: false,
        pin_set_at: null,
        last_updated_at: now
      };
      parentalRecords.push(record);
    }

    record.is_enabled = !!isEnabled;
    record.max_allowed_age_group = maxAllowedAgeGroup || record.max_allowed_age_group;
    record.are_comments_hidden = !!areCommentsHidden;

    if (typeof pinCode !== 'undefined' && pinCode !== null) {
      const pinStr = String(pinCode);
      if (/^\d{4}$/.test(pinStr)) {
        record.pin_code = pinStr;
        record.pin_set_at = now;
      }
    }

    if (typeof isPinRequiredForChanges === 'boolean') {
      record.is_pin_required_for_changes = isPinRequiredForChanges;
    }

    record.last_updated_at = now;

    this._saveToStorage('parental_control_settings', parentalRecords);

    return {
      is_enabled: record.is_enabled,
      max_allowed_age_group: record.max_allowed_age_group,
      are_comments_hidden: record.are_comments_hidden,
      pin_set: !!record.pin_code,
      is_pin_required_for_changes: record.is_pin_required_for_changes,
      last_updated_at: record.last_updated_at,
      message: 'Parental controls updated.'
    };
  }

  // reportVideo(videoId, reason, message)
  reportVideo(videoId, reason, message) {
    const contentReports = this._getFromStorage('content_reports');

    const reportId = this._generateId('contentreport');
    const now = this._nowIso();

    const report = {
      id: reportId,
      video_id: videoId,
      reason: reason,
      message: typeof message === 'string' ? message : null,
      created_at: now,
      status: 'submitted'
    };

    contentReports.push(report);
    this._saveToStorage('content_reports', contentReports);

    return {
      report_id: reportId,
      status: report.status,
      created_at: report.created_at
    };
  }

  // getInformationalPageContent(pageSlug)
  getInformationalPageContent(pageSlug) {
    const raw = localStorage.getItem('informational_pages');
    const pages = raw ? JSON.parse(raw) : {};
    const page = pages[pageSlug] || { title: '', sections: [] };
    return {
      title: page.title || '',
      sections: Array.isArray(page.sections) ? page.sections : []
    };
  }

  // getContactPageConfig()
  getContactPageConfig() {
    const raw = localStorage.getItem('contact_page_config');
    const config = raw ? JSON.parse(raw) : {
      support_email: '',
      support_address: '',
      form_intro_text: ''
    };
    return config;
  }

  // submitContactForm(name, email, subject, message, category)
  submitContactForm(name, email, subject, message, category) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const submission = {
      id: this._generateId('contact'),
      name: String(name || '').trim(),
      email: String(email || '').trim(),
      subject: String(subject || '').trim(),
      message: String(message || '').trim(),
      category: category ? String(category) : null,
      created_at: this._nowIso()
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been submitted.'
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
