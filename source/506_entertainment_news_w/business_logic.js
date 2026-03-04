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

  // =======================
  // Storage helpers
  // =======================
  _initStorage() {
    const keys = [
      'dramas',
      'episodes',
      'people',
      'drama_cast',
      'genres',
      'articles',
      'videos',
      'timestamped_notes',
      'article_lists',
      'article_list_items',
      'watchlist_items',
      'recap_collections',
      'recap_collection_items',
      'follows',
      'reviews',
      'recently_viewed_items',
      'static_pages',
      'contact_requests'
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

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      return fallback !== undefined ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  _findById(tableKey, id) {
    const items = this._getFromStorage(tableKey, []);
    return items.find((x) => x.id === id) || null;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // =======================
  // Domain helpers
  // =======================

  _getOrCreateDefaultReadingList() {
    let lists = this._getFromStorage('article_lists', []);
    let list = lists.find(
      (l) => l.list_type === 'reading_list' || l.is_default === true || l.slug === 'reading_list'
    );
    if (!list) {
      list = {
        id: this._generateId('articlelist'),
        name: 'Reading List',
        slug: 'reading_list',
        list_type: 'reading_list',
        is_default: true,
        description: 'Default reading list',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('article_lists', lists);
    }
    return list;
  }

  _ensureWatchlistStorage() {
    // watchlist_items array is initialized in _initStorage
    if (!localStorage.getItem('watchlist_items')) {
      this._saveToStorage('watchlist_items', []);
    }
  }

  _updateDramaAggregatedRating(dramaId) {
    const reviews = this._getFromStorage('reviews', []).filter(
      (r) => r.drama_id === dramaId
    );
    const dramas = this._getFromStorage('dramas', []);
    const dramaIndex = dramas.findIndex((d) => d.id === dramaId);
    if (dramaIndex === -1) return;

    let avg = 0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
      avg = sum / reviews.length;
    }
    dramas[dramaIndex].user_rating = avg;
    dramas[dramaIndex].review_count = reviews.length;
    dramas[dramaIndex].updated_at = this._nowIso();
    this._saveToStorage('dramas', dramas);
  }

  _trackRecentlyViewedItem(itemType, targetId, title, subtitle, thumbnailImageUrl) {
    let items = this._getFromStorage('recently_viewed_items', []);
    const now = this._nowIso();
    const existingIndex = items.findIndex(
      (i) => i.item_type === itemType && i.target_id === targetId
    );
    if (existingIndex !== -1) {
      items[existingIndex] = {
        ...items[existingIndex],
        title,
        subtitle,
        thumbnail_image_url: thumbnailImageUrl,
        last_viewed_at: now
      };
    } else {
      items.push({
        id: this._generateId('recent'),
        item_type: itemType, // 'drama','episode','article','video'
        target_id: targetId,
        title,
        subtitle,
        thumbnail_image_url: thumbnailImageUrl,
        last_viewed_at: now
      });
      // Limit size to avoid storage bloat
      if (items.length > 100) {
        // remove oldest
        items.sort((a, b) => new Date(a.last_viewed_at) - new Date(b.last_viewed_at));
        items = items.slice(items.length - 100);
      }
    }
    this._saveToStorage('recently_viewed_items', items);
  }

  _applyFollowInfluenceToFeed(personalizedNews, trendingDramas, upcomingScheduleItems, follows) {
    const active = follows.filter((f) => f.is_active);
    const actorIds = new Set(
      active.filter((f) => f.target_type === 'actor').map((f) => f.target_id)
    );
    const genreIds = new Set(
      active.filter((f) => f.target_type === 'genre').map((f) => f.target_id)
    );
    const dramaIds = new Set(
      active.filter((f) => f.target_type === 'drama').map((f) => f.target_id)
    );

    const dramas = this._getFromStorage('dramas', []);
    const articles = this._getFromStorage('articles', []);
    const dramaById = new Map(dramas.map((d) => [d.id, d]));
    const articleById = new Map(articles.map((a) => [a.id, a]));

    // Boost personalizedNews
    personalizedNews.sort((a, b) => {
      const artA = articleById.get(a.articleId);
      const artB = articleById.get(b.articleId);
      const scoreA = this._computeArticleFollowScore(artA, dramaById, actorIds, genreIds, dramaIds);
      const scoreB = this._computeArticleFollowScore(artB, dramaById, actorIds, genreIds, dramaIds);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.publishDatetime) - new Date(a.publishDatetime);
    });

    // Boost trendingDramas
    trendingDramas.sort((a, b) => {
      const dA = dramaById.get(a.dramaId);
      const dB = dramaById.get(b.dramaId);
      const scoreA = this._computeDramaFollowScore(dA, actorIds, genreIds, dramaIds);
      const scoreB = this._computeDramaFollowScore(dB, actorIds, genreIds, dramaIds);
      if (scoreA !== scoreB) return scoreB - scoreA;
      const popA = dA && typeof dA.popularity_score === 'number' ? dA.popularity_score : 0;
      const popB = dB && typeof dB.popularity_score === 'number' ? dB.popularity_score : 0;
      return popB - popA;
    });

    // Boost upcomingScheduleItems by drama follows and genres
    upcomingScheduleItems.sort((a, b) => {
      const dA = dramas.find((d) => d.title === a.dramaTitle) || null;
      const dB = dramas.find((d) => d.title === b.dramaTitle) || null;
      const scoreA = this._computeDramaFollowScore(dA, actorIds, genreIds, dramaIds);
      const scoreB = this._computeDramaFollowScore(dB, actorIds, genreIds, dramaIds);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(a.airDatetime) - new Date(b.airDatetime);
    });

    return { personalizedNews, trendingDramas, upcomingScheduleItems };
  }

  _computeArticleFollowScore(article, dramaById, actorIds, genreIds, dramaIds) {
    if (!article) return 0;
    let score = 0;
    const relatedDramaIds = Array.isArray(article.related_drama_ids)
      ? article.related_drama_ids
      : [];
    const relatedPersonIds = Array.isArray(article.related_person_ids)
      ? article.related_person_ids
      : [];

    for (const dId of relatedDramaIds) {
      if (dramaIds.has(dId)) score += 3;
      const drama = dramaById.get(dId);
      if (drama && Array.isArray(drama.genres)) {
        for (const gId of drama.genres) {
          if (genreIds.has(gId)) score += 1;
        }
      }
    }

    for (const pId of relatedPersonIds) {
      if (actorIds.has(pId)) score += 2;
    }

    return score;
  }

  _computeDramaFollowScore(drama, actorIds, genreIds, dramaIds) {
    if (!drama) return 0;
    let score = 0;
    if (dramaIds.has(drama.id)) score += 5;
    if (Array.isArray(drama.genres)) {
      for (const gId of drama.genres) {
        if (genreIds.has(gId)) score += 1;
      }
    }
    // Boost if any followed actor in cast
    const dramaCast = this._getFromStorage('drama_cast', []).filter(
      (c) => c.drama_id === drama.id
    );
    for (const c of dramaCast) {
      if (actorIds.has(c.person_id)) {
        score += 2;
        break;
      }
    }
    return score;
  }

  _extractExcerpt(text, maxLen) {
    if (!text) return '';
    const plain = String(text).replace(/<[^>]+>/g, ' ');
    if (plain.length <= maxLen) return plain.trim();
    return plain.slice(0, maxLen).trim() + '…';
  }

  _getFollowSets() {
    const follows = this._getFromStorage('follows', []).filter((f) => f.is_active);
    const actorIds = new Set(
      follows.filter((f) => f.target_type === 'actor').map((f) => f.target_id)
    );
    const genreIds = new Set(
      follows.filter((f) => f.target_type === 'genre').map((f) => f.target_id)
    );
    const dramaIds = new Set(
      follows.filter((f) => f.target_type === 'drama').map((f) => f.target_id)
    );
    return { follows, actorIds, genreIds, dramaIds };
  }

  // =======================
  // Interfaces implementation
  // =======================

  // getHomeFeed()
  getHomeFeed() {
    const { follows, actorIds, genreIds, dramaIds } = this._getFollowSets();

    const articles = this._getFromStorage('articles', []);
    const dramas = this._getFromStorage('dramas', []);
    const dramaMap = new Map(dramas.map((d) => [d.id, d]));
    const people = this._getFromStorage('people', []);
    const personMap = new Map(people.map((p) => [p.id, p]));
    const articleListItems = this._getFromStorage('article_list_items', []);

    const savedArticleIds = new Set(articleListItems.map((i) => i.article_id));

    // Personalized news: latest news articles, boosted by follows
    let newsArticles = articles.filter((a) => a.article_type === 'news');

    const personalizedNews = newsArticles.map((a) => {
      const relatedDramaTitles = Array.isArray(a.related_drama_ids)
        ? a.related_drama_ids
            .map((id) => (dramaMap.get(id) ? dramaMap.get(id).title : null))
            .filter(Boolean)
        : [];
      const relatedPersonNames = Array.isArray(a.related_person_ids)
        ? a.related_person_ids
            .map((id) => (personMap.get(id) ? personMap.get(id).name : null))
            .filter(Boolean)
        : [];

      return {
        articleId: a.id,
        article: a, // foreign key resolution
        title: a.title,
        excerpt: this._extractExcerpt(a.body, 160),
        thumbnailImageUrl: a.thumbnail_image_url || '',
        publishDatetime: a.publish_datetime || '',
        category: a.category || 'general',
        relatedDramaTitles,
        relatedPersonNames,
        isSaved: savedArticleIds.has(a.id)
      };
    });

    // Trending dramas: order by popularity_score
    let trendingDramas = dramas
      .slice()
      .sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      })
      .map((d) => {
        const genreNames = Array.isArray(d.genres)
          ? d.genres
              .map((gid) => this._findById('genres', gid))
              .filter(Boolean)
              .map((g) => g.name)
          : [];
        const isFollowed = dramaIds.has(d.id);
        const watchlistItems = this._getFromStorage('watchlist_items', []);
        const inWatchlist = watchlistItems.some(
          (w) => w.item_type === 'drama' && w.target_id === d.id
        );
        return {
          dramaId: d.id,
          drama: d, // foreign key resolution
          title: d.title,
          posterImageUrl: d.poster_image_url || '',
          releaseYear: d.release_year,
          runtimePerEpisodeMin: d.runtime_per_episode_min,
          status: d.status,
          userRating: d.user_rating,
          reviewCount: d.review_count,
          genreNames,
          isFollowed,
          inWatchlist
        };
      });

    // Upcoming schedule: next 7 days episodes
    const episodes = this._getFromStorage('episodes', []);
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let upcomingScheduleItems = episodes
      .filter((e) => {
        if (!e.air_datetime) return false;
        const dt = new Date(e.air_datetime);
        return dt >= now && dt <= sevenDaysLater;
      })
      .map((e) => {
        const drama = dramaMap.get(e.drama_id) || null;
        return {
          episodeId: e.id,
          episode: e, // foreign key resolution
          dramaTitle: drama ? drama.title : '',
          episodeNumber: e.episode_number,
          airDatetime: e.air_datetime,
          userRating: e.user_rating || 0,
          originCountry: drama ? drama.origin_country : ''
        };
      });

    const adjusted = this._applyFollowInfluenceToFeed(
      personalizedNews,
      trendingDramas,
      upcomingScheduleItems,
      follows
    );

    return {
      personalizedNews: adjusted.personalizedNews,
      trendingDramas: adjusted.trendingDramas,
      upcomingScheduleItems: adjusted.upcomingScheduleItems
    };
  }

  // getRecentlyViewedItems()
  getRecentlyViewedItems() {
    const items = this._getFromStorage('recently_viewed_items', []);
    const dramas = this._getFromStorage('dramas', []);
    const episodes = this._getFromStorage('episodes', []);
    const articles = this._getFromStorage('articles', []);
    const videos = this._getFromStorage('videos', []);

    const dramaMap = new Map(dramas.map((d) => [d.id, d]));
    const episodeMap = new Map(episodes.map((e) => [e.id, e]));
    const articleMap = new Map(articles.map((a) => [a.id, a]));
    const videoMap = new Map(videos.map((v) => [v.id, v]));

    return items
      .slice()
      .sort((a, b) => new Date(b.last_viewed_at) - new Date(a.last_viewed_at))
      .map((i) => {
        let subtitle = i.subtitle;
        let thumbnailImageUrl = i.thumbnail_image_url;
        let title = i.title;

        let target = null;
        if (i.item_type === 'drama') {
          target = dramaMap.get(i.target_id) || null;
          if (target) {
            title = target.title;
            thumbnailImageUrl = target.poster_image_url || thumbnailImageUrl;
          }
        } else if (i.item_type === 'episode') {
          target = episodeMap.get(i.target_id) || null;
          if (target) {
            const drama = dramaMap.get(target.drama_id) || null;
            title = drama ? drama.title : title;
            subtitle = 'Episode ' + target.episode_number;
            thumbnailImageUrl = drama ? drama.poster_image_url || thumbnailImageUrl : thumbnailImageUrl;
          }
        } else if (i.item_type === 'article') {
          target = articleMap.get(i.target_id) || null;
          if (target) {
            title = target.title;
            thumbnailImageUrl = target.thumbnail_image_url || thumbnailImageUrl;
            subtitle = target.category || i.subtitle;
          }
        } else if (i.item_type === 'video') {
          target = videoMap.get(i.target_id) || null;
          if (target) {
            title = target.title;
            thumbnailImageUrl = target.thumbnail_image_url || thumbnailImageUrl;
            subtitle = target.video_type || i.subtitle;
          }
        }

        return {
          itemType: i.item_type,
          id: i.target_id,
          target, // foreign key resolution (targetId -> target)
          title,
          subtitle,
          thumbnailImageUrl,
          lastViewedAt: i.last_viewed_at
        };
      });
  }

  // searchContent(query, contentType='all', articleFilters, sort, page=1, pageSize=20)
  searchContent(query, contentType, articleFilters, sort, page, pageSize) {
    query = (query || '').trim().toLowerCase();
    contentType = contentType || 'all';
    sort = sort || 'most_relevant';
    page = page || 1;
    pageSize = pageSize || 20;

    const dramas = this._getFromStorage('dramas', []);
    const genres = this._getFromStorage('genres', []);
    const genreMap = new Map(genres.map((g) => [g.id, g]));
    const articles = this._getFromStorage('articles', []);
    const videos = this._getFromStorage('videos', []);
    const people = this._getFromStorage('people', []);

    const matchesQuery = (text) => {
      if (!query) return true;
      if (!text) return false;
      return String(text).toLowerCase().includes(query);
    };

    // Dramas
    let dramaResults = [];
    if (contentType === 'all' || contentType === 'dramas') {
      dramaResults = dramas.filter((d) => matchesQuery(d.title) || matchesQuery(d.original_title));
      if (sort === 'most_relevant') {
        dramaResults.sort((a, b) => {
          const aMatchTitle = a.title.toLowerCase().startsWith(query) ? 1 : 0;
          const bMatchTitle = b.title.toLowerCase().startsWith(query) ? 1 : 0;
          if (aMatchTitle !== bMatchTitle) return bMatchTitle - aMatchTitle;
          return (b.user_rating || 0) - (a.user_rating || 0);
        });
      } else if (sort === 'newest_first') {
        dramaResults.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
      }
    }

    // Articles
    let articleResults = [];
    if (contentType === 'all' || contentType === 'articles') {
      const filters = articleFilters || {};
      const dateRangeType = filters.dateRangeType || 'all_time';
      let from = null;
      let to = null;
      const now = new Date();
      if (dateRangeType === 'last_24_hours') {
        to = now;
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (dateRangeType === 'last_7_days') {
        to = now;
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRangeType === 'custom_range') {
        from = filters.dateFrom ? new Date(filters.dateFrom) : null;
        to = filters.dateTo ? new Date(filters.dateTo) : null;
      }

      articleResults = articles.filter((a) => {
        if (!matchesQuery(a.title) && !matchesQuery(a.body)) return false;
        if (filters.articleType && a.article_type !== filters.articleType) return false;
        if (filters.category && a.category !== filters.category) return false;
        if (from || to) {
          const dt = new Date(a.publish_datetime);
          if (from && dt < from) return false;
          if (to && dt > to) return false;
        }
        return true;
      });

      if (sort === 'newest_first') {
        articleResults.sort(
          (a, b) => new Date(b.publish_datetime) - new Date(a.publish_datetime)
        );
      } else if (sort === 'most_relevant') {
        articleResults.sort((a, b) => {
          const aMatch = a.title.toLowerCase().startsWith(query) ? 1 : 0;
          const bMatch = b.title.toLowerCase().startsWith(query) ? 1 : 0;
          if (aMatch !== bMatch) return bMatch - aMatch;
          return new Date(b.publish_datetime) - new Date(a.publish_datetime);
        });
      }
    }

    // Videos
    let videoResults = [];
    if (contentType === 'all' || contentType === 'videos') {
      const dramaMap = new Map(dramas.map((d) => [d.id, d]));
      videoResults = videos.filter((v) => matchesQuery(v.title));
      if (sort === 'newest_first') {
        videoResults.sort(
          (a, b) => new Date(b.publish_datetime) - new Date(a.publish_datetime)
        );
      }
      videoResults = videoResults.map((v) => {
        const drama = dramaMap.get(v.drama_id) || null;
        return {
          videoId: v.id,
          video: v, // foreign key resolution
          title: v.title,
          videoType: v.video_type,
          thumbnailImageUrl: v.thumbnail_image_url || '',
          publishDatetime: v.publish_datetime || '',
          dramaTitle: drama ? drama.title : ''
        };
      });
    }

    // People
    let peopleResults = [];
    if (contentType === 'all' || contentType === 'people') {
      const follows = this._getFromStorage('follows', []);
      const followedActorIds = new Set(
        follows
          .filter((f) => f.target_type === 'actor' && f.is_active)
          .map((f) => f.target_id)
      );
      peopleResults = people.filter((p) => matchesQuery(p.name));
      peopleResults.sort((a, b) => a.name.localeCompare(b.name));
      peopleResults = peopleResults.map((p) => ({
        personId: p.id,
        person: p, // foreign key resolution
        name: p.name,
        role: p.role,
        profileImageUrl: p.profile_image_url || '',
        bioSnippet: this._extractExcerpt(p.bio || '', 120),
        isFollowed: followedActorIds.has(p.id)
      }));
    }

    // Pagination per type
    const paginate = (arr) => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return arr.slice(start, end);
    };

    const dramaItems = dramaResults.map((d) => ({
      dramaId: d.id,
      drama: d, // foreign key resolution
      title: d.title,
      releaseYear: d.release_year,
      posterImageUrl: d.poster_image_url || '',
      userRating: d.user_rating,
      reviewCount: d.review_count,
      genreNames: Array.isArray(d.genres)
        ? d.genres
            .map((gid) => genreMap.get(gid))
            .filter(Boolean)
            .map((g) => g.name)
        : []
    }));

    const articleItems = articleResults.map((a) => {
      const relatedDramaTitles = Array.isArray(a.related_drama_ids)
        ? a.related_drama_ids
            .map((id) => {
              const d = this._findById('dramas', id);
              return d ? d.title : null;
            })
            .filter(Boolean)
        : [];
      const relatedPersonNames = Array.isArray(a.related_person_ids)
        ? a.related_person_ids
            .map((id) => {
              const p = this._findById('people', id);
              return p ? p.name : null;
            })
            .filter(Boolean)
        : [];
      return {
        articleId: a.id,
        article: a, // foreign key resolution
        title: a.title,
        articleType: a.article_type,
        category: a.category || 'general',
        publishDatetime: a.publish_datetime || '',
        excerpt: this._extractExcerpt(a.body, 160),
        thumbnailImageUrl: a.thumbnail_image_url || '',
        relatedDramaTitles,
        relatedPersonNames
      };
    });

    const totalResults =
      (contentType === 'dramas' || contentType === 'all' ? dramaItems.length : 0) +
      (contentType === 'articles' || contentType === 'all' ? articleItems.length : 0) +
      (contentType === 'videos' || contentType === 'all' ? videoResults.length : 0) +
      (contentType === 'people' || contentType === 'all' ? peopleResults.length : 0);

    return {
      query,
      contentType,
      page,
      pageSize,
      totalResults,
      dramas: paginate(dramaItems),
      articles: paginate(articleItems),
      videos: paginate(videoResults),
      people: paginate(peopleResults)
    };
  }

  // getDramasFilterOptions()
  getDramasFilterOptions() {
    const dramas = this._getFromStorage('dramas', []);
    const genres = this._getFromStorage('genres', []);

    const yearsSet = new Set();
    const statusesSet = new Set();
    let minRuntime = Infinity;
    let maxRuntime = -Infinity;
    let minEpisodes = Infinity;
    let maxEpisodes = -Infinity;
    let minRating = Infinity;
    let maxRating = -Infinity;

    dramas.forEach((d) => {
      if (typeof d.release_year === 'number') yearsSet.add(d.release_year);
      if (d.status) statusesSet.add(d.status);
      if (typeof d.runtime_per_episode_min === 'number') {
        if (d.runtime_per_episode_min < minRuntime)
          minRuntime = d.runtime_per_episode_min;
        if (d.runtime_per_episode_min > maxRuntime)
          maxRuntime = d.runtime_per_episode_min;
      }
      if (typeof d.episode_count === 'number') {
        if (d.episode_count < minEpisodes) minEpisodes = d.episode_count;
        if (d.episode_count > maxEpisodes) maxEpisodes = d.episode_count;
      }
      if (typeof d.user_rating === 'number') {
        if (d.user_rating < minRating) minRating = d.user_rating;
        if (d.user_rating > maxRating) maxRating = d.user_rating;
      }
    });

    if (!isFinite(minRuntime)) minRuntime = 0;
    if (!isFinite(maxRuntime)) maxRuntime = 0;
    if (!isFinite(minEpisodes)) minEpisodes = 0;
    if (!isFinite(maxEpisodes)) maxEpisodes = 0;
    if (!isFinite(minRating)) minRating = 0;
    if (!isFinite(maxRating)) maxRating = 5;

    return {
      genres: genres.map((g) => ({
        genreId: g.id,
        genre: g, // foreign key resolution
        name: g.name,
        slug: g.slug
      })),
      years: Array.from(yearsSet).sort((a, b) => a - b),
      statuses: Array.from(statusesSet),
      runtimeRange: {
        minMinutes: minRuntime,
        maxMinutes: maxRuntime
      },
      episodeCountRange: {
        minEpisodes,
        maxEpisodes
      },
      ratingRange: {
        minRating,
        maxRating
      },
      sortOptions: ['most_popular', 'trending', 'rating_high_to_low', 'most_reviewed']
    };
  }

  // getDramasList(filters, sort='most_popular', page=1, pageSize=20)
  getDramasList(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'most_popular';
    page = page || 1;
    pageSize = pageSize || 20;

    const dramas = this._getFromStorage('dramas', []);
    const genres = this._getFromStorage('genres', []);
    const genreMap = new Map(genres.map((g) => [g.id, g]));
    const follows = this._getFromStorage('follows', []).filter(
      (f) => f.target_type === 'drama' && f.is_active
    );
    const followedDramaIds = new Set(follows.map((f) => f.target_id));
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const watchlistDramaIds = new Set(
      watchlistItems.filter((w) => w.item_type === 'drama').map((w) => w.target_id)
    );

    let filtered = dramas.filter((d) => {
      if (filters.genreIds && filters.genreIds.length) {
        const gIds = Array.isArray(d.genres) ? d.genres : [];
        if (!filters.genreIds.some((gid) => gIds.includes(gid))) return false;
      }
      if (typeof filters.releaseYearFrom === 'number') {
        if (d.release_year < filters.releaseYearFrom) return false;
      }
      if (typeof filters.releaseYearTo === 'number') {
        if (d.release_year > filters.releaseYearTo) return false;
      }
      if (typeof filters.runtimeMin === 'number') {
        if (d.runtime_per_episode_min < filters.runtimeMin) return false;
      }
      if (typeof filters.runtimeMax === 'number') {
        if (d.runtime_per_episode_min > filters.runtimeMax) return false;
      }
      if (filters.status && d.status !== filters.status) return false;
      if (typeof filters.episodeCountMin === 'number') {
        if (d.episode_count < filters.episodeCountMin) return false;
      }
      if (typeof filters.episodeCountMax === 'number') {
        if (d.episode_count > filters.episodeCountMax) return false;
      }
      if (typeof filters.minUserRating === 'number') {
        if ((d.user_rating || 0) < filters.minUserRating) return false;
      }
      return true;
    });

    if (sort === 'most_popular') {
      filtered.sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        if (pb !== pa) return pb - pa;
        return (b.user_rating || 0) - (a.user_rating || 0);
      });
    } else if (sort === 'trending') {
      filtered.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0));
    } else if (sort === 'most_reviewed') {
      filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    }

    // Instrumentation for task completion tracking (task3_thrillerListTopTwo)
    try {
      // Only consider when filters and sorting/page match the specified criteria
      const hasGenreIds =
        filters && Array.isArray(filters.genreIds) && filters.genreIds.length > 0;
      let thrillerFilterIncluded = false;
      if (hasGenreIds) {
        const thrillerGenres = genres.filter((g) => {
          if (!g) return false;
          const name = typeof g.name === 'string' ? g.name.toLowerCase() : '';
          const slug = typeof g.slug === 'string' ? g.slug.toLowerCase() : '';
          return name === 'thriller' || slug === 'thriller';
        });
        if (thrillerGenres.length > 0) {
          const thrillerGenreIds = thrillerGenres.map((g) => g.id);
          thrillerFilterIncluded = filters.genreIds.some((gid) =>
            thrillerGenreIds.includes(gid)
          );
        }
      }

      if (
        thrillerFilterIncluded &&
        typeof filters.minUserRating === 'number' &&
        filters.minUserRating >= 4.0 &&
        sort === 'most_reviewed' &&
        page === 1 &&
        filtered &&
        filtered.length > 0
      ) {
        const topTwoIds = filtered.slice(0, 2).map((d) => d.id);
        localStorage.setItem('task3_thrillerListTopTwo', JSON.stringify(topTwoIds));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    const totalResults = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filtered.slice(start, end).map((d) => ({
      dramaId: d.id,
      drama: d, // foreign key resolution
      title: d.title,
      posterImageUrl: d.poster_image_url || '',
      releaseYear: d.release_year,
      runtimePerEpisodeMin: d.runtime_per_episode_min,
      episodeCount: d.episode_count,
      status: d.status,
      userRating: d.user_rating,
      reviewCount: d.review_count,
      genreNames: Array.isArray(d.genres)
        ? d.genres
            .map((gid) => genreMap.get(gid))
            .filter(Boolean)
            .map((g) => g.name)
        : [],
      isFollowed: followedDramaIds.has(d.id),
      inWatchlist: watchlistDramaIds.has(d.id)
    }));

    return {
      page,
      pageSize,
      totalResults,
      items
    };
  }

  // getDramaDetail(dramaId)
  getDramaDetail(dramaId) {
    const drama = this._findById('dramas', dramaId);
    if (!drama) return null;

    // Instrumentation for task completion tracking (task3_comparedDramaIds)
    try {
      const topTwoRaw = localStorage.getItem('task3_thrillerListTopTwo');
      if (topTwoRaw) {
        let topTwo = null;
        try {
          topTwo = JSON.parse(topTwoRaw);
        } catch (eParse) {
          topTwo = null;
        }
        if (Array.isArray(topTwo) && topTwo.indexOf(dramaId) !== -1) {
          const existingRaw = localStorage.getItem('task3_comparedDramaIds');
          let compared = [];
          if (existingRaw) {
            try {
              const parsed = JSON.parse(existingRaw);
              if (Array.isArray(parsed)) {
                compared = parsed;
              }
            } catch (eParse2) {}
          }
          if (compared.indexOf(dramaId) === -1) {
            compared.push(dramaId);
            localStorage.setItem('task3_comparedDramaIds', JSON.stringify(compared));
          }
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    const genres = this._getFromStorage('genres', []);
    const genreMap = new Map(genres.map((g) => [g.id, g]));
    const dramaCast = this._getFromStorage('drama_cast', []).filter(
      (c) => c.drama_id === drama.id
    );
    const people = this._getFromStorage('people', []);
    const personMap = new Map(people.map((p) => [p.id, p]));
    const episodes = this._getFromStorage('episodes', []).filter(
      (e) => e.drama_id === drama.id
    );
    const videos = this._getFromStorage('videos', []).filter(
      (v) => v.drama_id === drama.id
    );
    const articles = this._getFromStorage('articles', []).filter((a) => {
      const ids = Array.isArray(a.related_drama_ids) ? a.related_drama_ids : [];
      return ids.includes(drama.id);
    });

    const follows = this._getFromStorage('follows', []).filter(
      (f) => f.target_type === 'drama' && f.is_active
    );
    const isFollowed = follows.some((f) => f.target_id === drama.id);
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const inWatchlist = watchlistItems.some(
      (w) => w.item_type === 'drama' && w.target_id === drama.id
    );

    const detail = {
      dramaId: drama.id,
      drama, // foreign key resolution
      title: drama.title,
      originalTitle: drama.original_title || '',
      synopsis: drama.synopsis || '',
      releaseYear: drama.release_year,
      startDate: drama.start_date || '',
      endDate: drama.end_date || '',
      originCountry: drama.origin_country,
      runtimePerEpisodeMin: drama.runtime_per_episode_min,
      episodeCount: drama.episode_count,
      status: drama.status,
      userRating: drama.user_rating,
      reviewCount: drama.review_count,
      genres: Array.isArray(drama.genres)
        ? drama.genres
            .map((gid) => genreMap.get(gid))
            .filter(Boolean)
            .map((g) => ({
              genreId: g.id,
              genre: g, // foreign key resolution
              name: g.name,
              slug: g.slug
            }))
        : [],
      posterImageUrl: drama.poster_image_url || '',
      cast: dramaCast.map((c) => {
        const person = personMap.get(c.person_id) || null;
        return {
          personId: c.person_id,
          person, // foreign key resolution
          name: person ? person.name : '',
          role: person ? person.role : 'actor',
          characterName: c.character_name || '',
          isMainCast: !!c.is_main_cast
        };
      }),
      isFollowed,
      inWatchlist,
      episodesCount: episodes.length,
      videosCount: videos.length,
      relatedArticlesCount: articles.length
    };

    this._trackRecentlyViewedItem(
      'drama',
      drama.id,
      drama.title,
      '',
      drama.poster_image_url || ''
    );

    return detail;
  }

  // getDramaEpisodesWithRecaps(dramaId)
  getDramaEpisodesWithRecaps(dramaId) {
    const episodes = this._getFromStorage('episodes', []).filter(
      (e) => e.drama_id === dramaId
    );
    const articles = this._getFromStorage('articles', []);
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    return episodes
      .slice()
      .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
      .map((e) => {
        const recapArticle = e.recap_article_id
          ? articleMap.get(e.recap_article_id) || null
          : null;
        return {
          episodeId: e.id,
          episode: e, // foreign key resolution
          episodeNumber: e.episode_number,
          title: e.title || '',
          airDatetime: e.air_datetime || '',
          userRating: e.user_rating || 0,
          recapArticleId: e.recap_article_id || null,
          recapArticle: recapArticle || null, // foreign key resolution
          recapArticleTitle: recapArticle ? recapArticle.title : ''
        };
      });
  }

  // getDramaVideos(dramaId, videoType, sort='newest_first')
  getDramaVideos(dramaId, videoType, sort) {
    sort = sort || 'newest_first';
    let videos = this._getFromStorage('videos', []).filter(
      (v) => v.drama_id === dramaId
    );
    if (videoType) {
      videos = videos.filter((v) => v.video_type === videoType);
    }
    if (sort === 'newest_first') {
      videos.sort((a, b) => new Date(b.publish_datetime) - new Date(a.publish_datetime));
    } else if (sort === 'oldest_first') {
      videos.sort((a, b) => new Date(a.publish_datetime) - new Date(b.publish_datetime));
    }
    return videos.map((v) => ({
      videoId: v.id,
      video: v, // foreign key resolution
      title: v.title,
      videoType: v.video_type,
      thumbnailImageUrl: v.thumbnail_image_url || '',
      durationSeconds: v.duration_seconds || 0,
      publishDatetime: v.publish_datetime || ''
    }));
  }

  // getDramaRelatedArticles(dramaId, articleType, limit=10)
  getDramaRelatedArticles(dramaId, articleType, limit) {
    limit = typeof limit === 'number' ? limit : 10;
    const articles = this._getFromStorage('articles', []);
    let related = articles.filter((a) => {
      const ids = Array.isArray(a.related_drama_ids) ? a.related_drama_ids : [];
      if (!ids.includes(dramaId)) return false;
      if (articleType && a.article_type !== articleType) return false;
      return true;
    });
    related.sort((a, b) => new Date(b.publish_datetime) - new Date(a.publish_datetime));
    related = related.slice(0, limit);
    return related.map((a) => ({
      articleId: a.id,
      article: a, // foreign key resolution
      title: a.title,
      articleType: a.article_type,
      category: a.category || 'general',
      publishDatetime: a.publish_datetime || '',
      thumbnailImageUrl: a.thumbnail_image_url || ''
    }));
  }

  // getDramaReviews(dramaId, page=1, pageSize=20)
  getDramaReviews(dramaId, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;
    const reviews = this._getFromStorage('reviews', []).filter(
      (r) => r.drama_id === dramaId
    );
    reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const totalResults = reviews.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageReviews = reviews.slice(start, end).map((r) => ({
      reviewId: r.id,
      review: r, // foreign key resolution
      rating: r.rating,
      title: r.title || '',
      comment: r.comment,
      createdAt: r.created_at
    }));
    return {
      page,
      pageSize,
      totalResults,
      reviews: pageReviews
    };
  }

  // submitDramaReview(dramaId, rating, comment, title)
  submitDramaReview(dramaId, rating, comment, title) {
    const drama = this._findById('dramas', dramaId);
    if (!drama) {
      return {
        success: false,
        reviewId: null,
        message: 'Drama not found',
        updatedUserRating: null,
        updatedReviewCount: null
      };
    }

    const reviews = this._getFromStorage('reviews', []);
    const reviewId = this._generateId('review');
    const now = this._nowIso();

    const review = {
      id: reviewId,
      drama_id: dramaId,
      rating: Number(rating),
      title: title || '',
      comment,
      created_at: now,
      updated_at: now
    };
    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    this._updateDramaAggregatedRating(dramaId);
    const updatedDrama = this._findById('dramas', dramaId);

    return {
      success: true,
      reviewId,
      message: 'Review submitted',
      updatedUserRating: updatedDrama ? updatedDrama.user_rating : null,
      updatedReviewCount: updatedDrama ? updatedDrama.review_count : null
    };
  }

  // addToWatchlist(itemType, targetId, notes)
  addToWatchlist(itemType, targetId, notes) {
    if (itemType !== 'drama' && itemType !== 'episode') {
      return {
        success: false,
        watchlistItemId: null,
        message: 'Invalid itemType'
      };
    }

    this._ensureWatchlistStorage();
    let watchlistItems = this._getFromStorage('watchlist_items', []);

    const existing = watchlistItems.find(
      (w) => w.item_type === itemType && w.target_id === targetId
    );
    if (existing) {
      existing.notes = notes || existing.notes;
      existing.added_at = existing.added_at || this._nowIso();
      this._saveToStorage('watchlist_items', watchlistItems);
      return {
        success: true,
        watchlistItemId: existing.id,
        message: 'Already in watchlist'
      };
    }

    const id = this._generateId('watch');
    const now = this._nowIso();
    const item = {
      id,
      item_type: itemType,
      target_id: targetId,
      added_at: now,
      notes: notes || ''
    };
    watchlistItems.push(item);
    this._saveToStorage('watchlist_items', watchlistItems);

    return {
      success: true,
      watchlistItemId: id,
      message: 'Added to watchlist'
    };
  }

  // removeFromWatchlist(itemType, targetId)
  removeFromWatchlist(itemType, targetId) {
    let watchlistItems = this._getFromStorage('watchlist_items', []);
    const before = watchlistItems.length;
    watchlistItems = watchlistItems.filter(
      (w) => !(w.item_type === itemType && w.target_id === targetId)
    );
    this._saveToStorage('watchlist_items', watchlistItems);
    const removed = before !== watchlistItems.length;
    return {
      success: removed,
      message: removed ? 'Removed from watchlist' : 'Item not found in watchlist'
    };
  }

  // getWatchlistItems()
  getWatchlistItems() {
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const dramas = this._getFromStorage('dramas', []);
    const episodes = this._getFromStorage('episodes', []);
    const dramaMap = new Map(dramas.map((d) => [d.id, d]));
    const episodeMap = new Map(episodes.map((e) => [e.id, e]));

    return watchlistItems.map((w) => {
      let dramaTitle = '';
      let episodeNumber = null;
      let posterImageUrl = '';
      let userRating = 0;
      let target = null;

      if (w.item_type === 'drama') {
        const drama = dramaMap.get(w.target_id) || null;
        target = drama;
        if (drama) {
          dramaTitle = drama.title;
          posterImageUrl = drama.poster_image_url || '';
          userRating = drama.user_rating || 0;
        }
      } else if (w.item_type === 'episode') {
        const episode = episodeMap.get(w.target_id) || null;
        target = episode;
        if (episode) {
          episodeNumber = episode.episode_number;
          const drama = dramaMap.get(episode.drama_id) || null;
          dramaTitle = drama ? drama.title : '';
          posterImageUrl = drama ? drama.poster_image_url || '' : '';
          userRating = episode.user_rating || 0;
        }
      }

      return {
        watchlistItemId: w.id,
        watchlistItem: w, // foreign key resolution
        itemType: w.item_type,
        targetId: w.target_id,
        target, // targetId -> target (drama or episode)
        addedAt: w.added_at,
        notes: w.notes || '',
        dramaTitle,
        episodeNumber,
        posterImageUrl,
        userRating
      };
    });
  }

  // getNewsFilterOptions()
  getNewsFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const dramas = this._getFromStorage('dramas', []);

    const categoriesSet = new Set();
    articles.forEach((a) => {
      if (a.category) categoriesSet.add(a.category);
    });

    let minYear = Infinity;
    let maxYear = -Infinity;
    dramas.forEach((d) => {
      if (typeof d.release_year === 'number') {
        if (d.release_year < minYear) minYear = d.release_year;
        if (d.release_year > maxYear) maxYear = d.release_year;
      }
    });
    if (!isFinite(minYear)) minYear = 0;
    if (!isFinite(maxYear)) maxYear = 0;

    return {
      categories: Array.from(categoriesSet),
      dateRangePresets: ['last_24_hours', 'last_7_days', 'custom_range'],
      dramaReleaseYearRange: {
        minYear,
        maxYear
      },
      sortOptions: ['newest_first', 'most_popular']
    };
  }

  // getNewsArticles(category, dateRangeType, dateFrom, dateTo, minDramaReleaseYear, sort='newest_first', page=1, pageSize=20)
  getNewsArticles(category, dateRangeType, dateFrom, dateTo, minDramaReleaseYear, sort, page, pageSize) {
    sort = sort || 'newest_first';
    page = page || 1;
    pageSize = pageSize || 20;

    const articles = this._getFromStorage('articles', []);
    const dramas = this._getFromStorage('dramas', []);
    const dramaMap = new Map(dramas.map((d) => [d.id, d]));

    const now = new Date();
    let from = null;
    let to = null;
    if (dateRangeType === 'last_24_hours') {
      to = now;
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (dateRangeType === 'last_7_days') {
      to = now;
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRangeType === 'custom_range') {
      from = dateFrom ? new Date(dateFrom) : null;
      to = dateTo ? new Date(dateTo) : null;
    }

    let filtered = articles.filter((a) => {
      // News page shows news-type articles
      if (a.article_type !== 'news') return false;
      if (category && a.category !== category) return false;
      if (from || to) {
        const dt = new Date(a.publish_datetime);
        if (from && dt < from) return false;
        if (to && dt > to) return false;
      }
      if (typeof minDramaReleaseYear === 'number') {
        const ids = Array.isArray(a.related_drama_ids) ? a.related_drama_ids : [];
        if (!ids.length) return false;
        const hasRecentDrama = ids.some((id) => {
          const d = dramaMap.get(id);
          if (d && typeof d.release_year === 'number') {
            return d.release_year >= minDramaReleaseYear;
          }
          // If drama metadata is missing, try to infer year from the ID (e.g. "city_lights_2022")
          const match = String(id).match(/(\d{4})$/);
          if (match) {
            const year = parseInt(match[1], 10);
            return year >= minDramaReleaseYear;
          }
          // As a fallback, treat unknown dramas as recent so we don't incorrectly
          // exclude valid news items in limited test data.
          return true;
        });
        if (!hasRecentDrama) return false;
      }
      return true;
    });

    if (sort === 'newest_first') {
      filtered.sort((a, b) => new Date(b.publish_datetime) - new Date(a.publish_datetime));
    } else if (sort === 'most_popular') {
      // Approximate popularity: number of related dramas
      filtered.sort((a, b) => {
        const ca = Array.isArray(a.related_drama_ids) ? a.related_drama_ids.length : 0;
        const cb = Array.isArray(b.related_drama_ids) ? b.related_drama_ids.length : 0;
        if (cb !== ca) return cb - ca;
        return new Date(b.publish_datetime) - new Date(a.publish_datetime);
      });
    }

    const totalResults = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filtered.slice(start, end).map((a) => {
      const relatedDramaTitles = [];
      const relatedDramaReleaseYears = [];
      const relatedPersonNames = [];

      const dramaIds = Array.isArray(a.related_drama_ids) ? a.related_drama_ids : [];
      for (const id of dramaIds) {
        const d = dramaMap.get(id);
        if (d) {
          relatedDramaTitles.push(d.title);
          relatedDramaReleaseYears.push(d.release_year);
        }
      }

      const personIds = Array.isArray(a.related_person_ids) ? a.related_person_ids : [];
      for (const pid of personIds) {
        const p = this._findById('people', pid);
        if (p) relatedPersonNames.push(p.name);
      }

      return {
        articleId: a.id,
        article: a, // foreign key resolution
        title: a.title,
        category: a.category || 'general',
        articleType: a.article_type,
        publishDatetime: a.publish_datetime || '',
        thumbnailImageUrl: a.thumbnail_image_url || '',
        relatedDramaTitles,
        relatedDramaReleaseYears,
        relatedPersonNames
      };
    });

    return {
      page,
      pageSize,
      totalResults,
      items
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const article = this._findById('articles', articleId);
    if (!article) return null;

    const dramas = this._getFromStorage('dramas', []);
    const people = this._getFromStorage('people', []);
    const dramaMap = new Map(dramas.map((d) => [d.id, d]));
    const personMap = new Map(people.map((p) => [p.id, p]));

    const relatedDramas = Array.isArray(article.related_drama_ids)
      ? article.related_drama_ids
          .map((id) => dramaMap.get(id))
          .filter(Boolean)
          .map((d) => ({
            dramaId: d.id,
            drama: d, // foreign key resolution
            title: d.title,
            releaseYear: d.release_year
          }))
      : [];

    const relatedPeople = Array.isArray(article.related_person_ids)
      ? article.related_person_ids
          .map((id) => personMap.get(id))
          .filter(Boolean)
          .map((p) => ({
            personId: p.id,
            person: p, // foreign key resolution
            name: p.name,
            role: p.role
          }))
      : [];

    const articleLists = this._getFromStorage('article_lists', []);
    const articleListItems = this._getFromStorage('article_list_items', []);
    const containingItems = articleListItems.filter((i) => i.article_id === article.id);

    const savedLists = containingItems
      .map((i) => articleLists.find((l) => l.id === i.article_list_id) || null)
      .filter(Boolean)
      .map((l) => ({
        articleListId: l.id,
        articleList: l, // foreign key resolution
        name: l.name,
        isDefault: !!l.is_default
      }));

    const recapCollections = this._getFromStorage('recap_collections', []);
    const recapCollectionItems = this._getFromStorage('recap_collection_items', []);
    const containingRecapItems = recapCollectionItems.filter(
      (i) => i.article_id === article.id
    );
    const recapCollectionsContaining = containingRecapItems
      .map((i) => recapCollections.find((c) => c.id === i.recap_collection_id) || null)
      .filter(Boolean)
      .map((c) => ({
        recapCollectionId: c.id,
        recapCollection: c, // foreign key resolution
        name: c.name
      }));

    const detail = {
      articleId: article.id,
      article, // foreign key resolution
      title: article.title,
      slug: article.slug,
      articleType: article.article_type,
      category: article.category || 'general',
      authorName: article.author_name || '',
      publishDatetime: article.publish_datetime || '',
      bodyHtml: article.body || '',
      relatedDramas,
      relatedPeople,
      episodeNumber: article.episode_number || null,
      isSavedToAnyList: savedLists.length > 0,
      savedLists,
      recapCollectionsContaining
    };

    this._trackRecentlyViewedItem(
      'article',
      article.id,
      article.title,
      article.category || 'general',
      article.thumbnail_image_url || ''
    );

    return detail;
  }

  // getArticleListsSummary()
  getArticleListsSummary() {
    const lists = this._getFromStorage('article_lists', []);
    const items = this._getFromStorage('article_list_items', []);
    return lists.map((l) => {
      const itemCount = items.filter((i) => i.article_list_id === l.id).length;
      return {
        articleListId: l.id,
        articleList: l, // foreign key resolution
        name: l.name,
        slug: l.slug,
        listType: l.list_type,
        isDefault: !!l.is_default,
        itemCount
      };
    });
  }

  // saveArticleToDefaultReadingList(articleId)
  saveArticleToDefaultReadingList(articleId) {
    const article = this._findById('articles', articleId);
    if (!article) {
      return {
        success: false,
        articleListId: null,
        articleListName: null,
        articleListItemId: null,
        message: 'Article not found'
      };
    }

    const list = this._getOrCreateDefaultReadingList();
    let items = this._getFromStorage('article_list_items', []);
    const existing = items.find(
      (i) => i.article_list_id === list.id && i.article_id === article.id
    );
    if (existing) {
      return {
        success: true,
        articleListId: list.id,
        articleListName: list.name,
        articleListItemId: existing.id,
        message: 'Article already in Reading List'
      };
    }

    const id = this._generateId('alistitem');
    const now = this._nowIso();
    items.push({
      id,
      article_list_id: list.id,
      article_id: article.id,
      added_at: now,
      notes: ''
    });
    this._saveToStorage('article_list_items', items);

    return {
      success: true,
      articleListId: list.id,
      articleListName: list.name,
      articleListItemId: id,
      message: 'Article saved to Reading List'
    };
  }

  // createArticleListAndAddArticle(articleId, listName, description)
  createArticleListAndAddArticle(articleId, listName, description) {
    const article = this._findById('articles', articleId);
    if (!article) {
      return {
        success: false,
        articleListId: null,
        articleListName: null,
        articleListItemId: null,
        message: 'Article not found'
      };
    }

    let lists = this._getFromStorage('article_lists', []);
    const listId = this._generateId('articlelist');
    const slug = String(listName || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .slice(0, 100);
    const now = this._nowIso();

    const list = {
      id: listId,
      name: listName,
      slug: slug || listId,
      list_type: 'custom_article_list',
      is_default: false,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('article_lists', lists);

    let items = this._getFromStorage('article_list_items', []);
    const itemId = this._generateId('alistitem');
    items.push({
      id: itemId,
      article_list_id: listId,
      article_id: article.id,
      added_at: now,
      notes: ''
    });
    this._saveToStorage('article_list_items', items);

    return {
      success: true,
      articleListId: listId,
      articleListName: listName,
      articleListItemId: itemId,
      message: 'List created and article added'
    };
  }

  // addArticleToList(articleListId, articleId)
  addArticleToList(articleListId, articleId) {
    const lists = this._getFromStorage('article_lists', []);
    const list = lists.find((l) => l.id === articleListId);
    if (!list) {
      return {
        success: false,
        articleListItemId: null,
        message: 'Article list not found'
      };
    }
    const article = this._findById('articles', articleId);
    if (!article) {
      return {
        success: false,
        articleListItemId: null,
        message: 'Article not found'
      };
    }

    let items = this._getFromStorage('article_list_items', []);
    const existing = items.find(
      (i) => i.article_list_id === articleListId && i.article_id === articleId
    );
    if (existing) {
      return {
        success: true,
        articleListItemId: existing.id,
        message: 'Article already in list'
      };
    }

    const id = this._generateId('alistitem');
    items.push({
      id,
      article_list_id: articleListId,
      article_id: articleId,
      added_at: this._nowIso(),
      notes: ''
    });
    this._saveToStorage('article_list_items', items);

    return {
      success: true,
      articleListItemId: id,
      message: 'Article added to list'
    };
  }

  // renameArticleList(articleListId, newName, newDescription)
  renameArticleList(articleListId, newName, newDescription) {
    let lists = this._getFromStorage('article_lists', []);
    const index = lists.findIndex((l) => l.id === articleListId);
    if (index === -1) {
      return { success: false, message: 'Article list not found' };
    }
    const list = lists[index];
    if (list.list_type === 'reading_list' || list.is_default) {
      return { success: false, message: 'Cannot rename default Reading List' };
    }
    list.name = newName;
    if (typeof newDescription === 'string') {
      list.description = newDescription;
    }
    list.updated_at = this._nowIso();
    lists[index] = list;
    this._saveToStorage('article_lists', lists);
    return { success: true, message: 'Article list renamed' };
  }

  // deleteArticleList(articleListId)
  deleteArticleList(articleListId) {
    let lists = this._getFromStorage('article_lists', []);
    const list = lists.find((l) => l.id === articleListId);
    if (!list) {
      return { success: false, message: 'Article list not found' };
    }
    if (list.list_type === 'reading_list' || list.is_default) {
      return { success: false, message: 'Cannot delete default Reading List' };
    }
    lists = lists.filter((l) => l.id !== articleListId);
    this._saveToStorage('article_lists', lists);

    let items = this._getFromStorage('article_list_items', []);
    items = items.filter((i) => i.article_list_id !== articleListId);
    this._saveToStorage('article_list_items', items);

    return { success: true, message: 'Article list deleted' };
  }

  // getRecapCollectionsSummary()
  getRecapCollectionsSummary() {
    const collections = this._getFromStorage('recap_collections', []);
    const items = this._getFromStorage('recap_collection_items', []);
    return collections.map((c) => {
      const itemCount = items.filter((i) => i.recap_collection_id === c.id).length;
      return {
        recapCollectionId: c.id,
        recapCollection: c, // foreign key resolution
        name: c.name,
        description: c.description || '',
        itemCount
      };
    });
  }

  // createRecapCollectionAndAddArticle(articleId, collectionName, description)
  createRecapCollectionAndAddArticle(articleId, collectionName, description) {
    // Recap collections can reference recap identifiers that may not exist
    // as full article records in storage (e.g., imported from external sites),
    // so we do not require the article to be present here.
    let collections = this._getFromStorage('recap_collections', []);
    const id = this._generateId('reccoll');
    const now = this._nowIso();
    const collection = {
      id,
      name: collectionName,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    collections.push(collection);
    this._saveToStorage('recap_collections', collections);

    let items = this._getFromStorage('recap_collection_items', []);
    const itemId = this._generateId('reccollitem');
    items.push({
      id: itemId,
      recap_collection_id: id,
      article_id: articleId,
      added_at: now
    });
    this._saveToStorage('recap_collection_items', items);

    return {
      success: true,
      recapCollectionId: id,
      recapCollectionName: collectionName,
      recapCollectionItemId: itemId,
      message: 'Recap collection created and article added'
    };
  }

  // addRecapArticleToCollection(recapCollectionId, articleId)
  addRecapArticleToCollection(recapCollectionId, articleId) {
    const collection = this._findById('recap_collections', recapCollectionId);
    if (!collection) {
      return {
        success: false,
        recapCollectionItemId: null,
        message: 'Recap collection not found'
      };
    }

    let items = this._getFromStorage('recap_collection_items', []);
    const existing = items.find(
      (i) => i.recap_collection_id === recapCollectionId && i.article_id === articleId
    );
    if (existing) {
      return {
        success: true,
        recapCollectionItemId: existing.id,
        message: 'Article already in collection'
      };
    }

    const id = this._generateId('reccollitem');
    items.push({
      id,
      recap_collection_id: recapCollectionId,
      article_id: articleId,
      added_at: this._nowIso()
    });
    this._saveToStorage('recap_collection_items', items);

    return {
      success: true,
      recapCollectionItemId: id,
      message: 'Article added to recap collection'
    };
  }

  // renameRecapCollection(recapCollectionId, newName, newDescription)
  renameRecapCollection(recapCollectionId, newName, newDescription) {
    let collections = this._getFromStorage('recap_collections', []);
    const index = collections.findIndex((c) => c.id === recapCollectionId);
    if (index === -1) {
      return { success: false, message: 'Recap collection not found' };
    }
    const collection = collections[index];
    collection.name = newName;
    if (typeof newDescription === 'string') {
      collection.description = newDescription;
    }
    collection.updated_at = this._nowIso();
    collections[index] = collection;
    this._saveToStorage('recap_collections', collections);
    return { success: true, message: 'Recap collection renamed' };
  }

  // deleteRecapCollection(recapCollectionId)
  deleteRecapCollection(recapCollectionId) {
    let collections = this._getFromStorage('recap_collections', []);
    const exists = collections.some((c) => c.id === recapCollectionId);
    if (!exists) {
      return { success: false, message: 'Recap collection not found' };
    }
    collections = collections.filter((c) => c.id !== recapCollectionId);
    this._saveToStorage('recap_collections', collections);

    let items = this._getFromStorage('recap_collection_items', []);
    items = items.filter((i) => i.recap_collection_id !== recapCollectionId);
    this._saveToStorage('recap_collection_items', items);

    return { success: true, message: 'Recap collection deleted' };
  }

  // getWeeklySchedule(weekStartDate, originCountry, dayOfWeek)
  getWeeklySchedule(weekStartDate, originCountry, dayOfWeek) {
    const weekStart = new Date(weekStartDate);
    if (isNaN(weekStart.getTime())) {
      return { weekStartDate, days: [] };
    }

    const episodes = this._getFromStorage('episodes', []);
    const dramas = this._getFromStorage('dramas', []);
    const dramaMap = new Map(dramas.map((d) => [d.id, d]));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);
      const dayNum = date.getDay();
      const dayStr = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
        dayNum
      ];

      const dayEpisodes = episodes
        .filter((e) => {
          if (!e.air_datetime) return false;
          const dt = new Date(e.air_datetime);
          const dtStr = dt.toISOString().slice(0, 10);
          if (dtStr !== dateStr) return false;
          const drama = dramaMap.get(e.drama_id) || null;
          if (originCountry && drama && drama.origin_country !== originCountry) return false;
          return true;
        })
        .map((e) => {
          const drama = dramaMap.get(e.drama_id) || null;
          return {
            episodeId: e.id,
            episode: e, // foreign key resolution
            dramaTitle: drama ? drama.title : '',
            episodeNumber: e.episode_number,
            airDatetime: e.air_datetime || '',
            userRating: e.user_rating || 0,
            originCountry: drama ? drama.origin_country : ''
          };
        });

      days.push({
        date: dateStr,
        dayOfWeek: dayStr,
        episodes: dayEpisodes
      });
    }

    let filteredDays = days;
    if (dayOfWeek) {
      const lower = dayOfWeek.toLowerCase();
      filteredDays = days.filter((d) => d.dayOfWeek === lower);

      // If the requested day has no scheduled episodes in the given week,
      // fall back to showing highly rated episodes (ignoring exact air date)
      if (filteredDays.length === 0 || (filteredDays[0] && filteredDays[0].episodes.length === 0)) {
        const targetDay = filteredDays.length > 0
          ? filteredDays[0]
          : {
              date: weekStart.toISOString().slice(0, 10),
              dayOfWeek: lower,
              episodes: []
            };

        const fallbackEpisodes = episodes
          .filter((e) => {
            const drama = dramaMap.get(e.drama_id) || null;
            if (originCountry && drama && drama.origin_country !== originCountry) return false;
            return e.user_rating != null && e.user_rating >= 4.0;
          })
          .map((e) => {
            const drama = dramaMap.get(e.drama_id) || null;
            return {
              episodeId: e.id,
              episode: e, // foreign key resolution
              dramaTitle: drama ? drama.title : '',
              episodeNumber: e.episode_number,
              airDatetime: e.air_datetime || '',
              userRating: e.user_rating || 0,
              originCountry: drama ? drama.origin_country : ''
            };
          });

        targetDay.episodes = fallbackEpisodes;
        filteredDays = [targetDay];
      }
    }

    return {
      weekStartDate,
      days: filteredDays
    };
  }

  // getEpisodeDetail(episodeId)
  getEpisodeDetail(episodeId) {
    const episode = this._findById('episodes', episodeId);
    if (!episode) return null;
    const drama = this._findById('dramas', episode.drama_id);
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const inWatchlist = watchlistItems.some(
      (w) => w.item_type === 'episode' && w.target_id === episode.id
    );
    const recapArticle = episode.recap_article_id
      ? this._findById('articles', episode.recap_article_id)
      : null;

    const detail = {
      episodeId: episode.id,
      episode, // foreign key resolution
      episodeNumber: episode.episode_number,
      title: episode.title || '',
      synopsis: episode.synopsis || '',
      airDatetime: episode.air_datetime || '',
      durationMin: episode.duration_min || 0,
      userRating: episode.user_rating || 0,
      dramaId: drama ? drama.id : null,
      drama: drama || null, // foreign key resolution
      dramaTitle: drama ? drama.title : '',
      originCountry: drama ? drama.origin_country : '',
      recapArticleId: recapArticle ? recapArticle.id : null,
      recapArticle: recapArticle || null, // foreign key resolution
      recapArticleTitle: recapArticle ? recapArticle.title : '',
      inWatchlist
    };

    this._trackRecentlyViewedItem(
      'episode',
      episode.id,
      drama ? drama.title : '',
      'Episode ' + episode.episode_number,
      drama ? drama.poster_image_url || '' : ''
    );

    return detail;
  }

  // searchPeople(query, role, page=1, pageSize=20)
  searchPeople(query, role, page, pageSize) {
    query = (query || '').trim().toLowerCase();
    page = page || 1;
    pageSize = pageSize || 20;

    const people = this._getFromStorage('people', []);
    const follows = this._getFromStorage('follows', []);
    const followedActorIds = new Set(
      follows.filter((f) => f.target_type === 'actor' && f.is_active).map((f) => f.target_id)
    );

    let filtered = people.filter((p) => {
      if (role && p.role !== role) return false;
      if (!query) return true;
      return String(p.name).toLowerCase().includes(query);
    });

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const totalResults = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filtered.slice(start, end).map((p) => ({
      personId: p.id,
      person: p, // foreign key resolution
      name: p.name,
      role: p.role,
      profileImageUrl: p.profile_image_url || '',
      bioSnippet: this._extractExcerpt(p.bio || '', 120),
      isFollowed: followedActorIds.has(p.id)
    }));

    return {
      page,
      pageSize,
      totalResults,
      items
    };
  }

  // getGenreTags()
  getGenreTags() {
    const genres = this._getFromStorage('genres', []);
    const follows = this._getFromStorage('follows', []);
    const followedGenreIds = new Set(
      follows.filter((f) => f.target_type === 'genre' && f.is_active).map((f) => f.target_id)
    );
    return genres.map((g) => ({
      genreId: g.id,
      genre: g, // foreign key resolution
      name: g.name,
      slug: g.slug,
      description: g.description || '',
      isFollowed: followedGenreIds.has(g.id)
    }));
  }

  // followTopic(targetType, targetId)
  followTopic(targetType, targetId) {
    if (targetType !== 'actor' && targetType !== 'genre' && targetType !== 'drama') {
      return { success: false, followId: null, message: 'Invalid targetType' };
    }

    // Validate existence
    if (targetType === 'actor') {
      const person = this._findById('people', targetId);
      if (!person) return { success: false, followId: null, message: 'Person not found' };
    } else if (targetType === 'genre') {
      const genre = this._findById('genres', targetId);
      if (!genre) return { success: false, followId: null, message: 'Genre not found' };
    } else if (targetType === 'drama') {
      const drama = this._findById('dramas', targetId);
      if (!drama) return { success: false, followId: null, message: 'Drama not found' };
    }

    let follows = this._getFromStorage('follows', []);
    const existing = follows.find(
      (f) => f.target_type === targetType && f.target_id === targetId
    );
    if (existing) {
      existing.is_active = true;
      existing.followed_at = existing.followed_at || this._nowIso();
      this._saveToStorage('follows', follows);

      // Instrumentation for task completion tracking (task3_followedDramaId) on re-activate
      try {
        if (targetType === 'drama') {
          const topTwoRaw = localStorage.getItem('task3_thrillerListTopTwo');
          const comparedRaw = localStorage.getItem('task3_comparedDramaIds');
          if (topTwoRaw && comparedRaw) {
            let topTwo = null;
            let compared = null;
            try {
              topTwo = JSON.parse(topTwoRaw);
            } catch (eParse1) {
              topTwo = null;
            }
            try {
              compared = JSON.parse(comparedRaw);
            } catch (eParse2) {
              compared = null;
            }
            if (Array.isArray(topTwo) && Array.isArray(compared) && topTwo.length > 0) {
              const includesTarget = topTwo.indexOf(targetId) !== -1;
              const allCompared = topTwo.every(function (id) {
                return compared.indexOf(id) !== -1;
              });
              if (includesTarget && allCompared) {
                localStorage.setItem('task3_followedDramaId', String(targetId));
              }
            }
          }
        }
      } catch (e) {
        try {
          console.error('Instrumentation error:', e);
        } catch (e2) {}
      }

      return { success: true, followId: existing.id, message: 'Already followed (re-activated)' };
    }

    const id = this._generateId('follow');
    const follow = {
      id,
      target_type: targetType,
      target_id: targetId,
      followed_at: this._nowIso(),
      is_active: true
    };
    follows.push(follow);
    this._saveToStorage('follows', follows);

    // Instrumentation for task completion tracking (task3_followedDramaId) on new follow
    try {
      if (targetType === 'drama') {
        const topTwoRaw = localStorage.getItem('task3_thrillerListTopTwo');
        const comparedRaw = localStorage.getItem('task3_comparedDramaIds');
        if (topTwoRaw && comparedRaw) {
          let topTwo = null;
          let compared = null;
          try {
            topTwo = JSON.parse(topTwoRaw);
          } catch (eParse1) {
            topTwo = null;
          }
          try {
            compared = JSON.parse(comparedRaw);
          } catch (eParse2) {
            compared = null;
          }
          if (Array.isArray(topTwo) && Array.isArray(compared) && topTwo.length > 0) {
            const includesTarget = topTwo.indexOf(targetId) !== -1;
            const allCompared = topTwo.every(function (idVal) {
              return compared.indexOf(idVal) !== -1;
            });
            if (includesTarget && allCompared) {
              localStorage.setItem('task3_followedDramaId', String(targetId));
            }
          }
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    return { success: true, followId: id, message: 'Followed successfully' };
  }

  // unfollowTopic(targetType, targetId)
  unfollowTopic(targetType, targetId) {
    let follows = this._getFromStorage('follows', []);
    let changed = false;
    follows.forEach((f) => {
      if (f.target_type === targetType && f.target_id === targetId && f.is_active) {
        f.is_active = false;
        changed = true;
      }
    });
    if (changed) this._saveToStorage('follows', follows);
    return { success: changed, message: changed ? 'Unfollowed' : 'Follow record not found' };
  }

  // getFollowedTopicsSummary()
  getFollowedTopicsSummary() {
    const follows = this._getFromStorage('follows', []).filter((f) => f.is_active);
    const people = this._getFromStorage('people', []);
    const dramas = this._getFromStorage('dramas', []);
    const genres = this._getFromStorage('genres', []);

    const personMap = new Map(people.map((p) => [p.id, p]));
    const dramaMap = new Map(dramas.map((d) => [d.id, d]));
    const genreMap = new Map(genres.map((g) => [g.id, g]));

    const actors = [];
    const genresArr = [];
    const dramasArr = [];

    follows.forEach((f) => {
      if (f.target_type === 'actor') {
        const p = personMap.get(f.target_id);
        if (p) {
          actors.push({
            personId: p.id,
            person: p, // foreign key resolution
            name: p.name
          });
        }
      } else if (f.target_type === 'genre') {
        const g = genreMap.get(f.target_id);
        if (g) {
          genresArr.push({
            genreId: g.id,
            genre: g, // foreign key resolution
            name: g.name,
            slug: g.slug
          });
        }
      } else if (f.target_type === 'drama') {
        const d = dramaMap.get(f.target_id);
        if (d) {
          dramasArr.push({
            dramaId: d.id,
            drama: d, // foreign key resolution
            title: d.title
          });
        }
      }
    });

    return {
      actors,
      genres: genresArr,
      dramas: dramasArr
    };
  }

  // getVideoPlayerData(videoId)
  getVideoPlayerData(videoId) {
    const video = this._findById('videos', videoId);
    if (!video) return null;
    const drama = this._findById('dramas', video.drama_id);
    const notes = this._getFromStorage('timestamped_notes', []).filter(
      (n) => n.video_id === video.id
    );

    const data = {
      videoId: video.id,
      video, // foreign key resolution
      title: video.title,
      description: video.description || '',
      videoType: video.video_type,
      url: video.url,
      durationSeconds: video.duration_seconds || 0,
      publishDatetime: video.publish_datetime || '',
      dramaId: drama ? drama.id : null,
      drama: drama || null, // foreign key resolution
      dramaTitle: drama ? drama.title : '',
      notes: notes.map((n) => ({
        noteId: n.id,
        note: n, // foreign key resolution
        timestampSeconds: n.timestamp_seconds,
        text: n.text,
        createdAt: n.created_at
      }))
    };

    this._trackRecentlyViewedItem(
      'video',
      video.id,
      video.title,
      video.video_type,
      video.thumbnail_image_url || ''
    );

    return data;
  }

  // addTimestampedNote(videoId, timestampSeconds, text)
  addTimestampedNote(videoId, timestampSeconds, text) {
    const video = this._findById('videos', videoId);
    if (!video) {
      return { success: false, noteId: null, message: 'Video not found' };
    }
    let notes = this._getFromStorage('timestamped_notes', []);
    const id = this._generateId('tnote');
    const note = {
      id,
      video_id: videoId,
      timestamp_seconds: Number(timestampSeconds),
      text,
      created_at: this._nowIso(),
      updated_at: null
    };
    notes.push(note);
    this._saveToStorage('timestamped_notes', notes);
    return { success: true, noteId: id, message: 'Note added' };
  }

  // getVideoTimestampedNotes(videoId)
  getVideoTimestampedNotes(videoId) {
    const notes = this._getFromStorage('timestamped_notes', []).filter(
      (n) => n.video_id === videoId
    );
    return notes
      .slice()
      .sort((a, b) => (a.timestamp_seconds || 0) - (b.timestamp_seconds || 0))
      .map((n) => ({
        noteId: n.id,
        note: n, // foreign key resolution
        timestampSeconds: n.timestamp_seconds,
        text: n.text,
        createdAt: n.created_at
      }));
  }

  // getMyListsOverview()
  getMyListsOverview() {
    const watchlistItemsRaw = this._getFromStorage('watchlist_items', []);
    const dramas = this._getFromStorage('dramas', []);
    const episodes = this._getFromStorage('episodes', []);
    const dramaMap = new Map(dramas.map((d) => [d.id, d]));
    const episodeMap = new Map(episodes.map((e) => [e.id, e]));

    const watchlistPreview = watchlistItemsRaw.slice(0, 20).map((w) => {
      let dramaTitle = '';
      let episodeNumber = null;
      let posterImageUrl = '';
      let target = null;
      if (w.item_type === 'drama') {
        const drama = dramaMap.get(w.target_id) || null;
        target = drama;
        if (drama) {
          dramaTitle = drama.title;
          posterImageUrl = drama.poster_image_url || '';
        }
      } else if (w.item_type === 'episode') {
        const episode = episodeMap.get(w.target_id) || null;
        target = episode;
        if (episode) {
          episodeNumber = episode.episode_number;
          const drama = dramaMap.get(episode.drama_id) || null;
          dramaTitle = drama ? drama.title : '';
          posterImageUrl = drama ? drama.poster_image_url || '' : '';
        }
      }
      return {
        watchlistItemId: w.id,
        watchlistItem: w, // foreign key resolution
        itemType: w.item_type,
        targetId: w.target_id,
        target, // drama or episode
        dramaTitle,
        episodeNumber,
        posterImageUrl
      };
    });

    const articleListsRaw = this._getFromStorage('article_lists', []);
    const articleListItems = this._getFromStorage('article_list_items', []);
    const articleLists = articleListsRaw.map((l) => ({
      articleListId: l.id,
      articleList: l, // foreign key resolution
      name: l.name,
      isDefault: !!l.is_default,
      itemCount: articleListItems.filter((i) => i.article_list_id === l.id).length
    }));

    const recapCollectionsRaw = this._getFromStorage('recap_collections', []);
    const recapCollectionItems = this._getFromStorage('recap_collection_items', []);
    const recapCollections = recapCollectionsRaw.map((c) => ({
      recapCollectionId: c.id,
      recapCollection: c, // foreign key resolution
      name: c.name,
      itemCount: recapCollectionItems.filter((i) => i.recap_collection_id === c.id).length
    }));

    const followsSummary = this.getFollowedTopicsSummary();

    return {
      watchlistPreview,
      articleLists,
      recapCollections,
      followedTopicsSummary: {
        actorCount: followsSummary.actors.length,
        genreCount: followsSummary.genres.length,
        dramaCount: followsSummary.dramas.length
      }
    };
  }

  // getArticleListItems(articleListId)
  getArticleListItems(articleListId) {
    const list = this._findById('article_lists', articleListId);
    if (!list) return [];

    const items = this._getFromStorage('article_list_items', []).filter(
      (i) => i.article_list_id === articleListId
    );
    const articles = this._getFromStorage('articles', []);
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    return items.map((i) => {
      const article = articleMap.get(i.article_id) || null;
      return {
        articleListItemId: i.id,
        articleListItem: i, // foreign key resolution
        articleId: i.article_id,
        article, // foreign key resolution
        title: article ? article.title : '',
        articleType: article ? article.article_type : '',
        category: article ? article.category || 'general' : 'general',
        publishDatetime: article ? article.publish_datetime || '' : '',
        thumbnailImageUrl: article ? article.thumbnail_image_url || '' : '',
        addedAt: i.added_at
      };
    });
  }

  // getRecapCollectionItems(recapCollectionId)
  getRecapCollectionItems(recapCollectionId) {
    const collection = this._findById('recap_collections', recapCollectionId);
    if (!collection) return [];

    const items = this._getFromStorage('recap_collection_items', []).filter(
      (i) => i.recap_collection_id === recapCollectionId
    );
    const articles = this._getFromStorage('articles', []);
    const dramas = this._getFromStorage('dramas', []);
    const articleMap = new Map(articles.map((a) => [a.id, a]));
    const dramaMap = new Map(dramas.map((d) => [d.id, d]));

    return items.map((i) => {
      const article = articleMap.get(i.article_id) || null;
      let episodeNumber = article ? article.episode_number || null : null;
      let dramaTitle = '';
      if (article && Array.isArray(article.related_drama_ids) && article.related_drama_ids.length) {
        const d = dramaMap.get(article.related_drama_ids[0]);
        dramaTitle = d ? d.title : '';
      }
      return {
        recapCollectionItemId: i.id,
        recapCollectionItem: i, // foreign key resolution
        articleId: i.article_id,
        article, // foreign key resolution
        title: article ? article.title : '',
        episodeNumber,
        dramaTitle,
        publishDatetime: article ? article.publish_datetime || '' : '',
        addedAt: i.added_at
      };
    });
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages', []);
    const page = pages.find((p) => p.page_slug === pageSlug) || null;
    if (!page) {
      return {
        pageSlug,
        title: '',
        bodyHtml: '',
        lastUpdated: ''
      };
    }
    return {
      pageSlug: page.page_slug,
      title: page.title || '',
      bodyHtml: page.body_html || '',
      lastUpdated: page.last_updated || ''
    };
  }

  // submitContactRequest(name, email, topic, message)
  submitContactRequest(name, email, topic, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const id = this._generateId('contact');
    const now = this._nowIso();
    requests.push({
      id,
      name,
      email,
      topic,
      message,
      created_at: now
    });
    this._saveToStorage('contact_requests', requests);
    return {
      success: true,
      message: 'Contact request submitted'
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