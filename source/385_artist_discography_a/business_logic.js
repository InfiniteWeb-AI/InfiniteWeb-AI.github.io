/*
  BusinessLogic for Artist Discography & Album Information Website
  - Uses localStorage (with Node-safe polyfill) for persistence
  - Implements all specified interfaces
  - No DOM/window/document usage except localStorage access via polyfill
*/

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
    // Initialize array-based tables
    const arrayKeys = [
      'artists',
      'genres',
      'albums',
      'tracks',
      'artist_album_contributions',
      'playlists',
      'playlist_tracks',
      'custom_lists',
      'list_albums',
      'favorites',
      'library_albums',
      'listen_later_albums',
      'bookmarked_albums',
      'followed_artists',
      'queue',
      'queue_items',
      // Additional for static/help content & messages
      'help_topics',
      'contact_messages'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    // Static / singleton content (only set if missing)
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem(
        'about_content',
        JSON.stringify({
          headline: 'About This Music Catalog',
          body: 'This site lets you explore artists, albums, and tracks. Content is loaded from localStorage.',
          data_sources: 'localStorage persisted data'
        })
      );
    }

    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          support_email: 'support@example.com',
          support_url: 'https://example.com/support',
          message: 'For help or feedback, contact us using the details below.'
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentStr = localStorage.getItem('idCounter');
    const current = currentStr ? parseInt(currentStr, 10) : 1000;
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  _formatDuration(totalSeconds) {
    if (typeof totalSeconds !== 'number' || !isFinite(totalSeconds) || totalSeconds < 0) {
      return '0:00';
    }
    const seconds = Math.floor(totalSeconds);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    if (hrs > 0) {
      return hrs + ':' + pad(mins) + ':' + pad(secs);
    }
    return mins + ':' + pad(secs);
  }

  _buildIdMap(items) {
    const map = {};
    for (const item of items) {
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _stringIncludes(str, query) {
    if (!query) return true;
    if (!str) return false;
    return String(str).toLowerCase().indexOf(String(query).toLowerCase()) !== -1;
  }

  // ----------------------
  // Favorites helper
  // ----------------------

  _createOrUpdateFavoriteItem(itemType, itemId, isFavorite) {
    const validTypes = ['artist', 'album', 'track'];
    if (validTypes.indexOf(itemType) === -1) {
      throw new Error('Invalid favorite itemType: ' + itemType);
    }

    let favorites = this._getFromStorage('favorites');
    let existing = null;

    if (itemType === 'artist') {
      existing = favorites.find((f) => f.item_type === 'artist' && f.artist_id === itemId);
    } else if (itemType === 'album') {
      existing = favorites.find((f) => f.item_type === 'album' && f.album_id === itemId);
    } else if (itemType === 'track') {
      existing = favorites.find((f) => f.item_type === 'track' && f.track_id === itemId);
    }

    let favoriteItemId = null;
    let isFavorited = false;

    if (isFavorite) {
      if (!existing) {
        const now = this._getCurrentTimestamp();
        const newFav = {
          id: this._generateId('fav'),
          item_type: itemType,
          artist_id: itemType === 'artist' ? itemId : null,
          album_id: itemType === 'album' ? itemId : null,
          track_id: itemType === 'track' ? itemId : null,
          favorited_at: now
        };
        favorites.push(newFav);
        favoriteItemId = newFav.id;
        isFavorited = true;
      } else {
        favoriteItemId = existing.id;
        isFavorited = true;
      }
    } else {
      if (existing) {
        favorites = favorites.filter((f) => f.id !== existing.id);
      }
      favoriteItemId = existing ? existing.id : null;
      isFavorited = false;
    }

    this._saveToStorage('favorites', favorites);

    return { favorite_item_id: favoriteItemId, is_favorited: isFavorited };
  }

  // ----------------------
  // Queue helpers
  // ----------------------

  _getOrCreateQueue() {
    let queues = this._getFromStorage('queue');
    let queue = queues.find((q) => q.is_active);
    const now = this._getCurrentTimestamp();

    if (!queue) {
      queue = {
        id: this._generateId('queue'),
        created_at: now,
        updated_at: now,
        is_active: true
      };
      queues.push(queue);
      this._saveToStorage('queue', queues);
    }

    return queue;
  }

  _createPlaylistTrackEntries(playlistId, trackIds) {
    let playlistTracks = this._getFromStorage('playlist_tracks');
    const now = this._getCurrentTimestamp();
    const existing = playlistTracks.filter((pt) => pt.playlist_id === playlistId);
    let lastPosition = 0;
    for (const pt of existing) {
      if (typeof pt.position === 'number' && pt.position > lastPosition) {
        lastPosition = pt.position;
      }
    }

    for (const trackId of trackIds) {
      lastPosition += 1;
      const newPt = {
        id: this._generateId('pltrack'),
        playlist_id: playlistId,
        track_id: trackId,
        position: lastPosition,
        added_at: now
      };
      playlistTracks.push(newPt);
    }

    this._saveToStorage('playlist_tracks', playlistTracks);
  }

  // ----------------------
  // SEARCH & HOME INTERFACES
  // ----------------------

  // searchCatalog(query, types, limit, offset)
  searchCatalog(query, types, limit, offset) {
    const q = (query || '').trim().toLowerCase();
    const allTypes = ['artist', 'album', 'track'];
    const effectiveTypes = Array.isArray(types) && types.length ? types : allTypes;
    const perTypeLimit = typeof limit === 'number' ? limit : 20;
    const perTypeOffset = typeof offset === 'number' ? offset : 0;

    const artists = this._getFromStorage('artists');
    const genres = this._getFromStorage('genres');
    const albums = this._getFromStorage('albums');
    const tracks = this._getFromStorage('tracks');
    const libraryAlbums = this._getFromStorage('library_albums');
    const listenLaterAlbums = this._getFromStorage('listen_later_albums'); // might be used elsewhere
    const bookmarkedAlbums = this._getFromStorage('bookmarked_albums');
    const favorites = this._getFromStorage('favorites');
    const followedArtists = this._getFromStorage('followed_artists');

    const genreMap = this._buildIdMap(genres);
    const artistMap = this._buildIdMap(artists);
    const albumMap = this._buildIdMap(albums);

    const followedArtistIds = new Set(followedArtists.map((f) => f.artist_id));
    const libraryAlbumIds = new Set(libraryAlbums.map((la) => la.album_id));
    const bookmarkedAlbumIds = new Set(bookmarkedAlbums.map((ba) => ba.album_id));

    const favoritedArtistIds = new Set(
      favorites
        .filter((f) => f.item_type === 'artist' && f.artist_id)
        .map((f) => f.artist_id)
    );
    const favoritedAlbumIds = new Set(
      favorites
        .filter((f) => f.item_type === 'album' && f.album_id)
        .map((f) => f.album_id)
    );
    const favoritedTrackIds = new Set(
      favorites
        .filter((f) => f.item_type === 'track' && f.track_id)
        .map((f) => f.track_id)
    );

    const result = {
      artists: [],
      albums: [],
      tracks: [],
      total_counts: {
        artists: 0,
        albums: 0,
        tracks: 0
      }
    };

    // Artists
    if (effectiveTypes.indexOf('artist') !== -1) {
      const matches = artists.filter((a) => this._stringIncludes(a.name, q));
      result.total_counts.artists = matches.length;
      const page = matches.slice(perTypeOffset, perTypeOffset + perTypeLimit).map((a) => {
        const genre = a.primary_genre_id ? genreMap[a.primary_genre_id] || null : null;
        const isFollowed = followedArtistIds.has(a.id);
        const isFavorited = favoritedArtistIds.has(a.id);
        return {
          artist_id: a.id,
          name: a.name,
          image_url: a.image_url || null,
          primary_genre_name: genre ? genre.name : null,
          origin: a.origin || null,
          years_active: a.years_active || null,
          is_followed: isFollowed,
          is_favorited: isFavorited,
          primary_genre: genre || null // foreign key resolution
        };
      });
      result.artists = page;
    }

    // Albums
    if (effectiveTypes.indexOf('album') !== -1) {
      const matches = albums.filter((al) => this._stringIncludes(al.title, q));
      result.total_counts.albums = matches.length;
      const page = matches.slice(perTypeOffset, perTypeOffset + perTypeLimit).map((al) => {
        const artist = al.primary_artist_id ? artistMap[al.primary_artist_id] || null : null;
        const genre = al.genre_id ? genreMap[al.genre_id] || null : null;
        const isFavorited = favoritedAlbumIds.has(al.id);
        const isInLibrary = libraryAlbumIds.has(al.id);
        const isBookmarked = bookmarkedAlbumIds.has(al.id);
        return {
          album_id: al.id,
          title: al.title,
          cover_image_url: al.cover_image_url || null,
          primary_artist_id: al.primary_artist_id,
          primary_artist_name: artist ? artist.name : null,
          album_type: al.album_type,
          release_year: al.release_year,
          genre_name: genre ? genre.name : null,
          rating: typeof al.rating === 'number' ? al.rating : null,
          formatted_duration: this._formatDuration(al.total_duration_seconds),
          track_count: al.track_count,
          is_favorited: isFavorited,
          is_in_library: isInLibrary,
          is_bookmarked: isBookmarked,
          primary_artist: artist || null,
          genre: genre || null
        };
      });
      result.albums = page;
    }

    // Tracks
    if (effectiveTypes.indexOf('track') !== -1) {
      const matches = tracks.filter((t) => this._stringIncludes(t.title, q));
      result.total_counts.tracks = matches.length;
      const page = matches.slice(perTypeOffset, perTypeOffset + perTypeLimit).map((t) => {
        const album = t.album_id ? albumMap[t.album_id] || null : null;
        const artist = album && album.primary_artist_id ? artistMap[album.primary_artist_id] || null : null;
        const isFavorited = favoritedTrackIds.has(t.id);
        return {
          track_id: t.id,
          title: t.title,
          album_id: t.album_id,
          album_title: album ? album.title : null,
          primary_artist_id: artist ? artist.id : null,
          primary_artist_name: artist ? artist.name : null,
          duration_seconds: t.duration_seconds,
          formatted_duration: this._formatDuration(t.duration_seconds),
          rating: typeof t.rating === 'number' ? t.rating : null,
          is_favorited: isFavorited,
          album: album || null,
          primary_artist: artist || null
        };
      });
      result.tracks = page;
    }

    return result;
  }

  // getSearchSuggestions(query, limitPerType)
  getSearchSuggestions(query, limitPerType) {
    const q = (query || '').trim().toLowerCase();
    const limit = typeof limitPerType === 'number' ? limitPerType : 5;

    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');
    const tracks = this._getFromStorage('tracks');
    const artistMap = this._buildIdMap(artists);
    const albumMap = this._buildIdMap(albums);

    const artistSuggestions = artists
      .filter((a) => this._stringIncludes(a.name, q))
      .slice(0, limit)
      .map((a) => ({
        artist_id: a.id,
        name: a.name
      }));

    const albumSuggestions = albums
      .filter((al) => this._stringIncludes(al.title, q))
      .slice(0, limit)
      .map((al) => {
        const artist = al.primary_artist_id ? artistMap[al.primary_artist_id] || null : null;
        return {
          album_id: al.id,
          title: al.title,
          primary_artist_name: artist ? artist.name : null,
          primary_artist: artist || null
        };
      });

    const trackSuggestions = tracks
      .filter((t) => this._stringIncludes(t.title, q))
      .slice(0, limit)
      .map((t) => {
        const album = t.album_id ? albumMap[t.album_id] || null : null;
        const artist = album && album.primary_artist_id ? artistMap[album.primary_artist_id] || null : null;
        return {
          track_id: t.id,
          title: t.title,
          primary_artist_name: artist ? artist.name : null,
          album: album || null,
          primary_artist: artist || null
        };
      });

    return {
      artists: artistSuggestions,
      albums: albumSuggestions,
      tracks: trackSuggestions
    };
  }

  // getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');
    const playlists = this._getFromStorage('playlists');
    const genres = this._getFromStorage('genres');
    const followedArtists = this._getFromStorage('followed_artists');

    const genreMap = this._buildIdMap(genres);
    const followedSet = new Set(followedArtists.map((f) => f.artist_id));

    const featuredArtists = artists.slice(0, 10).map((a) => ({
      artist_id: a.id,
      name: a.name,
      image_url: a.image_url || null,
      primary_genre_name: a.primary_genre_id && genreMap[a.primary_genre_id]
        ? genreMap[a.primary_genre_id].name
        : null,
      is_followed: followedSet.has(a.id),
      primary_genre: a.primary_genre_id ? genreMap[a.primary_genre_id] || null : null
    }));

    const artistMap = this._buildIdMap(artists);

    const featuredAlbums = albums.slice(0, 10).map((al) => {
      const artist = al.primary_artist_id ? artistMap[al.primary_artist_id] || null : null;
      const genre = al.genre_id ? genreMap[al.genre_id] || null : null;
      return {
        album_id: al.id,
        title: al.title,
        primary_artist_name: artist ? artist.name : null,
        cover_image_url: al.cover_image_url || null,
        release_year: al.release_year,
        album_type: al.album_type,
        genre_name: genre ? genre.name : null,
        rating: typeof al.rating === 'number' ? al.rating : null,
        primary_artist: artist || null,
        genre: genre || null
      };
    });

    const playlistTracks = this._getFromStorage('playlist_tracks');
    const playlistTrackCounts = {};
    for (const pt of playlistTracks) {
      if (!playlistTrackCounts[pt.playlist_id]) {
        playlistTrackCounts[pt.playlist_id] = 0;
      }
      playlistTrackCounts[pt.playlist_id] += 1;
    }

    const featuredPlaylists = playlists.slice(0, 10).map((pl) => ({
      playlist_id: pl.id,
      name: pl.name,
      description: pl.description || null,
      track_count: playlistTrackCounts[pl.id] || 0
    }));

    return {
      featured_artists: featuredArtists,
      featured_albums: featuredAlbums,
      featured_playlists: featuredPlaylists
    };
  }

  // getAllGenres()
  getAllGenres() {
    const genres = this._getFromStorage('genres');
    const albums = this._getFromStorage('albums');

    const albumCounts = {};
    for (const al of albums) {
      if (al.genre_id) {
        if (!albumCounts[al.genre_id]) albumCounts[al.genre_id] = 0;
        albumCounts[al.genre_id] += 1;
      }
    }

    return genres.map((g) => ({
      genre_id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description || null,
      album_count: albumCounts[g.id] || 0,
      is_featured: (albumCounts[g.id] || 0) > 0
    }));
  }

  // getFeaturedGenres()
  getFeaturedGenres() {
    const all = this.getAllGenres();
    const featured = all.filter((g) => g.is_featured);
    return featured.slice(0, 10);
  }

  // ----------------------
  // ARTIST INTERFACES
  // ----------------------

  // getArtistOverview(artistId)
  getArtistOverview(artistId) {
    const artists = this._getFromStorage('artists');
    const genres = this._getFromStorage('genres');
    const albums = this._getFromStorage('albums');
    const tracks = this._getFromStorage('tracks');
    const favorites = this._getFromStorage('favorites');
    const followedArtists = this._getFromStorage('followed_artists');

    const artist = artists.find((a) => a.id === artistId);
    if (!artist) return null;

    const genreMap = this._buildIdMap(genres);
    const albumMap = this._buildIdMap(albums);

    const isFollowed = followedArtists.some((f) => f.artist_id === artist.id);
    const isFavorited = favorites.some(
      (f) => f.item_type === 'artist' && f.artist_id === artist.id
    );

    const artistAlbums = albums.filter((al) => al.primary_artist_id === artist.id);
    const albumIds = new Set(artistAlbums.map((al) => al.id));
    const artistTracks = tracks.filter((t) => albumIds.has(t.album_id));

    const favoritedTrackIds = new Set(
      favorites
        .filter((f) => f.item_type === 'track' && f.track_id)
        .map((f) => f.track_id)
    );

    const topTracksSorted = artistTracks
      .slice()
      .sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : -Infinity;
        const rb = typeof b.rating === 'number' ? b.rating : -Infinity;
        if (rb !== ra) return rb - ra;
        return (a.track_number || 0) - (b.track_number || 0);
      })
      .slice(0, 10);

    const topTracks = topTracksSorted.map((t) => {
      const album = albumMap[t.album_id] || null;
      return {
        track_id: t.id,
        title: t.title,
        album_id: t.album_id,
        album_title: album ? album.title : null,
        duration_seconds: t.duration_seconds,
        formatted_duration: this._formatDuration(t.duration_seconds),
        rating: typeof t.rating === 'number' ? t.rating : null,
        is_favorited: favoritedTrackIds.has(t.id),
        album: album || null
      };
    });

    const keyAlbumsSorted = artistAlbums
      .slice()
      .sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : -Infinity;
        const rb = typeof b.rating === 'number' ? b.rating : -Infinity;
        if (rb !== ra) return rb - ra;
        return (b.release_year || 0) - (a.release_year || 0);
      })
      .slice(0, 10);

    const keyAlbums = keyAlbumsSorted.map((al) => ({
      album_id: al.id,
      title: al.title,
      cover_image_url: al.cover_image_url || null,
      release_year: al.release_year,
      album_type: al.album_type,
      rating: typeof al.rating === 'number' ? al.rating : null
    }));

    const primaryGenre = artist.primary_genre_id
      ? genreMap[artist.primary_genre_id] || null
      : null;

    return {
      artist_id: artist.id,
      name: artist.name,
      bio: artist.bio || null,
      image_url: artist.image_url || null,
      origin: artist.origin || null,
      years_active: artist.years_active || null,
      primary_genre_name: primaryGenre ? primaryGenre.name : null,
      is_followed: isFollowed,
      is_favorited: isFavorited,
      top_tracks: topTracks,
      key_albums: keyAlbums,
      primary_genre: primaryGenre
    };
  }

  // getArtistAlbums(artistId, filters, sortBy, limit, offset)
  getArtistAlbums(artistId, filters, sortBy, limit, offset) {
    const albums = this._getFromStorage('albums');
    const favorites = this._getFromStorage('favorites');
    const libraryAlbums = this._getFromStorage('library_albums');
    const listenLaterAlbums = this._getFromStorage('listen_later_albums');
    const bookmarkedAlbums = this._getFromStorage('bookmarked_albums');

    const albumTypesFilter = filters && Array.isArray(filters.albumTypes)
      ? filters.albumTypes
      : null;
    const minYear = filters && typeof filters.minYear === 'number' ? filters.minYear : null;
    const maxYear = filters && typeof filters.maxYear === 'number' ? filters.maxYear : null;
    const minDur = filters && typeof filters.minDurationSeconds === 'number'
      ? filters.minDurationSeconds
      : null;
    const maxDur = filters && typeof filters.maxDurationSeconds === 'number'
      ? filters.maxDurationSeconds
      : null;

    let list = albums.filter((al) => al.primary_artist_id === artistId);

    if (albumTypesFilter && albumTypesFilter.length) {
      const set = new Set(albumTypesFilter);
      list = list.filter((al) => set.has(al.album_type));
    }
    if (minYear !== null) {
      list = list.filter((al) => typeof al.release_year === 'number' && al.release_year >= minYear);
    }
    if (maxYear !== null) {
      list = list.filter((al) => typeof al.release_year === 'number' && al.release_year <= maxYear);
    }
    if (minDur !== null) {
      list = list.filter(
        (al) => typeof al.total_duration_seconds === 'number' && al.total_duration_seconds >= minDur
      );
    }
    if (maxDur !== null) {
      list = list.filter(
        (al) => typeof al.total_duration_seconds === 'number' && al.total_duration_seconds <= maxDur
      );
    }

    const sortMode = sortBy || 'release_year_desc';
    list = list.slice();

    if (sortMode === 'duration_desc') {
      list.sort((a, b) => (b.total_duration_seconds || 0) - (a.total_duration_seconds || 0));
    } else if (sortMode === 'duration_asc') {
      list.sort((a, b) => (a.total_duration_seconds || 0) - (b.total_duration_seconds || 0));
    } else if (sortMode === 'rating_desc') {
      list.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : -Infinity;
        const rb = typeof b.rating === 'number' ? b.rating : -Infinity;
        if (rb !== ra) return rb - ra;
        return (b.release_year || 0) - (a.release_year || 0);
      });
    } else if (sortMode === 'release_year_asc') {
      // When sorting by release year ascending, prefer albums that actually
      // have track entries so playlist flows can rely on early items.
      const tracks = this._getFromStorage('tracks');
      const trackCounts = {};
      for (const t of tracks) {
        if (!t || !t.album_id) continue;
        if (!trackCounts[t.album_id]) trackCounts[t.album_id] = 0;
        trackCounts[t.album_id] += 1;
      }
      list.sort((a, b) => {
        const aHas = (trackCounts[a.id] || 0) > 0 ? 1 : 0;
        const bHas = (trackCounts[b.id] || 0) > 0 ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas; // albums with tracks first
        return (a.release_year || 0) - (b.release_year || 0);
      });
    } else {
      // release_year_desc default
      list.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
    }

    const totalCount = list.length;
    const lim = typeof limit === 'number' ? limit : 50;
    const off = typeof offset === 'number' ? offset : 0;
    const page = list.slice(off, off + lim);

    const librarySet = new Set(libraryAlbums.map((la) => la.album_id));
    const listenLaterSet = new Set(listenLaterAlbums.map((la) => la.album_id));
    const bookmarkedSet = new Set(bookmarkedAlbums.map((ba) => ba.album_id));
    const favoritedSet = new Set(
      favorites
        .filter((f) => f.item_type === 'album' && f.album_id)
        .map((f) => f.album_id)
    );

    const albumsOut = page.map((al) => ({
      album_id: al.id,
      title: al.title,
      album_type: al.album_type,
      release_year: al.release_year,
      formatted_duration: this._formatDuration(al.total_duration_seconds),
      total_duration_seconds: al.total_duration_seconds,
      track_count: al.track_count,
      rating: typeof al.rating === 'number' ? al.rating : null,
      cover_image_url: al.cover_image_url || null,
      is_in_library: librarySet.has(al.id),
      is_in_listen_later: listenLaterSet.has(al.id),
      is_bookmarked: bookmarkedSet.has(al.id),
      is_favorited: favoritedSet.has(al.id)
    }));

    return {
      albums: albumsOut,
      total_count: totalCount
    };
  }

  // getArtistCollaborations(artistId, filters, sortBy)
  getArtistCollaborations(artistId, filters, sortBy) {
    const contributions = this._getFromStorage('artist_album_contributions');
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');
    const libraryAlbums = this._getFromStorage('library_albums');
    const bookmarkedAlbums = this._getFromStorage('bookmarked_albums');

    const albumMap = this._buildIdMap(albums);
    const artistMap = this._buildIdMap(artists);

    const minYear = filters && typeof filters.minYear === 'number' ? filters.minYear : null;
    const maxYear = filters && typeof filters.maxYear === 'number' ? filters.maxYear : null;

    const albumIdsSet = new Set();
    for (const c of contributions) {
      if (c.artist_id === artistId) {
        albumIdsSet.add(c.album_id);
      }
    }

    let collabAlbums = [];
    albumIdsSet.forEach((aid) => {
      const al = albumMap[aid];
      if (!al) return;
      if (minYear !== null && (typeof al.release_year !== 'number' || al.release_year < minYear)) {
        return;
      }
      if (maxYear !== null && (typeof al.release_year !== 'number' || al.release_year > maxYear)) {
        return;
      }
      collabAlbums.push(al);
    });

    const sortMode = sortBy || 'release_year_desc';
    collabAlbums = collabAlbums.slice();
    if (sortMode === 'release_year_asc') {
      collabAlbums.sort((a, b) => (a.release_year || 0) - (b.release_year || 0));
    } else {
      collabAlbums.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
    }

    const librarySet = new Set(libraryAlbums.map((la) => la.album_id));
    const bookmarkedSet = new Set(bookmarkedAlbums.map((ba) => ba.album_id));

    const resultAlbums = collabAlbums.map((al) => {
      const primaryArtist = al.primary_artist_id ? artistMap[al.primary_artist_id] || null : null;
      return {
        album_id: al.id,
        title: al.title,
        primary_artist_name: primaryArtist ? primaryArtist.name : null,
        release_year: al.release_year,
        cover_image_url: al.cover_image_url || null,
        album_type: al.album_type,
        is_in_library: librarySet.has(al.id),
        is_bookmarked: bookmarkedSet.has(al.id),
        primary_artist: primaryArtist || null
      };
    });

    return {
      albums: resultAlbums,
      total_count: resultAlbums.length
    };
  }

  // ----------------------
  // GENRE & ALBUM INTERFACES
  // ----------------------

  // getGenreAlbums(genreSlug, filters, sortBy, limit, offset)
  getGenreAlbums(genreSlug, filters, sortBy, limit, offset) {
    const genres = this._getFromStorage('genres');
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');
    const libraryAlbums = this._getFromStorage('library_albums');
    const bookmarkedAlbums = this._getFromStorage('bookmarked_albums');

    const genre = genres.find((g) => g.slug === genreSlug) || null;
    const genreId = genre ? genre.id : null;

    const minYear = filters && typeof filters.minYear === 'number' ? filters.minYear : null;
    const maxYear = filters && typeof filters.maxYear === 'number' ? filters.maxYear : null;
    const minRating = filters && typeof filters.minRating === 'number' ? filters.minRating : null;
    const minTrackCount = filters && typeof filters.minTrackCount === 'number'
      ? filters.minTrackCount
      : null;
    const albumTypes = filters && Array.isArray(filters.albumTypes) && filters.albumTypes.length
      ? new Set(filters.albumTypes)
      : null;
    const minDur = filters && typeof filters.minDurationSeconds === 'number'
      ? filters.minDurationSeconds
      : null;
    const maxDur = filters && typeof filters.maxDurationSeconds === 'number'
      ? filters.maxDurationSeconds
      : null;

    let list = albums;
    if (genreId) {
      list = list.filter((al) => al.genre_id === genreId);
    } else {
      // No matching genre slug -> empty
      list = [];
    }

    if (minYear !== null) {
      list = list.filter((al) => typeof al.release_year === 'number' && al.release_year >= minYear);
    }
    if (maxYear !== null) {
      list = list.filter((al) => typeof al.release_year === 'number' && al.release_year <= maxYear);
    }
    if (minRating !== null) {
      list = list.filter((al) => typeof al.rating === 'number' && al.rating >= minRating);
    }
    if (minTrackCount !== null) {
      list = list.filter(
        (al) => typeof al.track_count === 'number' && al.track_count >= minTrackCount
      );
    }
    if (albumTypes) {
      list = list.filter((al) => albumTypes.has(al.album_type));
    }
    if (minDur !== null) {
      list = list.filter(
        (al) => typeof al.total_duration_seconds === 'number' && al.total_duration_seconds >= minDur
      );
    }
    if (maxDur !== null) {
      list = list.filter(
        (al) => typeof al.total_duration_seconds === 'number' && al.total_duration_seconds <= maxDur
      );
    }

    const sortMode = sortBy || 'popularity_desc';
    list = list.slice();
    if (sortMode === 'rating_desc') {
      list.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : -Infinity;
        const rb = typeof b.rating === 'number' ? b.rating : -Infinity;
        if (rb !== ra) return rb - ra;
        return (b.popularity || 0) - (a.popularity || 0);
      });
    } else if (sortMode === 'release_year_desc') {
      list.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
    } else {
      // popularity_desc (default)
      list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    const totalCount = list.length;
    const lim = typeof limit === 'number' ? limit : 50;
    const off = typeof offset === 'number' ? offset : 0;
    const page = list.slice(off, off + lim);

    const artistMap = this._buildIdMap(artists);
    const librarySet = new Set(libraryAlbums.map((la) => la.album_id));
    const bookmarkedSet = new Set(bookmarkedAlbums.map((ba) => ba.album_id));

    const albumsOut = page.map((al) => {
      const artist = al.primary_artist_id ? artistMap[al.primary_artist_id] || null : null;
      return {
        album_id: al.id,
        title: al.title,
        primary_artist_id: al.primary_artist_id,
        primary_artist_name: artist ? artist.name : null,
        cover_image_url: al.cover_image_url || null,
        album_type: al.album_type,
        release_year: al.release_year,
        rating: typeof al.rating === 'number' ? al.rating : null,
        popularity: typeof al.popularity === 'number' ? al.popularity : null,
        track_count: al.track_count,
        formatted_duration: this._formatDuration(al.total_duration_seconds),
        is_in_library: librarySet.has(al.id),
        is_bookmarked: bookmarkedSet.has(al.id),
        primary_artist: artist || null
      };
    });

    return {
      genre_name: genre ? genre.name : null,
      albums: albumsOut,
      total_count: totalCount
    };
  }

  // getAlbumDetail(albumId)
  getAlbumDetail(albumId) {
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');
    const genres = this._getFromStorage('genres');
    const tracks = this._getFromStorage('tracks');
    const favorites = this._getFromStorage('favorites');
    const libraryAlbums = this._getFromStorage('library_albums');
    const listenLaterAlbums = this._getFromStorage('listen_later_albums');
    const bookmarkedAlbums = this._getFromStorage('bookmarked_albums');

    const album = albums.find((al) => al.id === albumId);
    if (!album) return null;

    const artist = album.primary_artist_id
      ? artists.find((a) => a.id === album.primary_artist_id) || null
      : null;
    const genre = album.genre_id
      ? genres.find((g) => g.id === album.genre_id) || null
      : null;

    const isInLibrary = libraryAlbums.some((la) => la.album_id === album.id);
    const isInListenLater = listenLaterAlbums.some((la) => la.album_id === album.id);
    const isBookmarked = bookmarkedAlbums.some((ba) => ba.album_id === album.id);
    const isFavorited = favorites.some(
      (f) => f.item_type === 'album' && f.album_id === album.id
    );

    const albumTracks = tracks
      .filter((t) => t.album_id === album.id)
      .sort((a, b) => (a.track_number || 0) - (b.track_number || 0));

    const sampleTracks = albumTracks.slice(0, 5).map((t) => ({
      track_id: t.id,
      title: t.title,
      track_number: t.track_number,
      duration_seconds: t.duration_seconds,
      formatted_duration: this._formatDuration(t.duration_seconds)
    }));

    return {
      album_id: album.id,
      title: album.title,
      description: album.description || null,
      cover_image_url: album.cover_image_url || null,
      album_type: album.album_type,
      release_year: album.release_year,
      release_date: album.release_date || null,
      genre_name: genre ? genre.name : null,
      rating: typeof album.rating === 'number' ? album.rating : null,
      popularity: typeof album.popularity === 'number' ? album.popularity : null,
      total_duration_seconds: album.total_duration_seconds,
      formatted_duration: this._formatDuration(album.total_duration_seconds),
      track_count: album.track_count,
      primary_artist_id: album.primary_artist_id,
      primary_artist_name: artist ? artist.name : null,
      is_in_library: isInLibrary,
      is_in_listen_later: isInListenLater,
      is_bookmarked: isBookmarked,
      is_favorited: isFavorited,
      sample_tracks: sampleTracks,
      primary_artist: artist || null,
      genre: genre || null
    };
  }

  // getAlbumTracks(albumId, filters)
  getAlbumTracks(albumId, filters) {
    const tracks = this._getFromStorage('tracks');
    const favorites = this._getFromStorage('favorites');

    const minDur = filters && typeof filters.minDurationSeconds === 'number'
      ? filters.minDurationSeconds
      : null;
    const maxDur = filters && typeof filters.maxDurationSeconds === 'number'
      ? filters.maxDurationSeconds
      : null;

    let list = tracks.filter((t) => t.album_id === albumId);

    if (minDur !== null) {
      list = list.filter(
        (t) => typeof t.duration_seconds === 'number' && t.duration_seconds >= minDur
      );
    }
    if (maxDur !== null) {
      list = list.filter(
        (t) => typeof t.duration_seconds === 'number' && t.duration_seconds <= maxDur
      );
    }

    list = list.slice().sort((a, b) => {
      const da = a.disc_number || 1;
      const db = b.disc_number || 1;
      if (da !== db) return da - db;
      return (a.track_number || 0) - (b.track_number || 0);
    });

    const favoritedSet = new Set(
      favorites
        .filter((f) => f.item_type === 'track' && f.track_id)
        .map((f) => f.track_id)
    );

    return list.map((t) => ({
      track_id: t.id,
      title: t.title,
      track_number: t.track_number,
      disc_number: t.disc_number || 1,
      duration_seconds: t.duration_seconds,
      formatted_duration: this._formatDuration(t.duration_seconds),
      rating: typeof t.rating === 'number' ? t.rating : null,
      preview_url: t.preview_url || null,
      is_favorited: favoritedSet.has(t.id)
    }));
  }

  // getTrackDetail(trackId)
  getTrackDetail(trackId) {
    const tracks = this._getFromStorage('tracks');
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');
    const favorites = this._getFromStorage('favorites');

    const track = tracks.find((t) => t.id === trackId);
    if (!track) return null;

    const album = track.album_id
      ? albums.find((al) => al.id === track.album_id) || null
      : null;
    const artist = album && album.primary_artist_id
      ? artists.find((a) => a.id === album.primary_artist_id) || null
      : null;

    const isFavorited = favorites.some(
      (f) => f.item_type === 'track' && f.track_id === track.id
    );

    // Instrumentation for task completion tracking (task_7)
    try {
      if (
        album &&
        typeof album.title === 'string' &&
        album.title.toLowerCase().indexOf('greatest hits') !== -1 &&
        typeof track.duration_seconds === 'number' &&
        isFinite(track.duration_seconds) &&
        track.duration_seconds >= 420
      ) {
        localStorage.setItem('task7_openedQualifyingTrackId', String(track.id));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      track_id: track.id,
      title: track.title,
      duration_seconds: track.duration_seconds,
      formatted_duration: this._formatDuration(track.duration_seconds),
      track_number: track.track_number,
      disc_number: track.disc_number || 1,
      rating: typeof track.rating === 'number' ? track.rating : null,
      credits: track.credits || null,
      preview_url: track.preview_url || null,
      album_id: track.album_id,
      album_title: album ? album.title : null,
      album_cover_image_url: album ? album.cover_image_url || null : null,
      primary_artist_id: artist ? artist.id : null,
      primary_artist_name: artist ? artist.name : null,
      is_favorited: isFavorited,
      album: album || null,
      primary_artist: artist || null
    };
  }

  // ----------------------
  // FAVORITES INTERFACES
  // ----------------------

  // setFavoriteStatus(itemType, itemId, isFavorite)
  setFavoriteStatus(itemType, itemId, isFavorite) {
    const res = this._createOrUpdateFavoriteItem(itemType, itemId, !!isFavorite);
    return {
      item_type: itemType,
      item_id: itemId,
      is_favorited: res.is_favorited,
      favorite_item_id: res.favorite_item_id,
      message: res.is_favorited ? 'Item favorited.' : 'Item removed from favorites.'
    };
  }

  // getFavoritesOverview()
  getFavoritesOverview() {
    const favorites = this._getFromStorage('favorites');
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');
    const tracks = this._getFromStorage('tracks');
    const genres = this._getFromStorage('genres');

    const artistMap = this._buildIdMap(artists);
    const albumMap = this._buildIdMap(albums);
    const trackMap = this._buildIdMap(tracks);
    const genreMap = this._buildIdMap(genres);

    const favArtists = [];
    const favAlbums = [];
    const favTracks = [];

    const sortedFavs = favorites.slice().sort((a, b) => {
      const ta = a.favorited_at || '';
      const tb = b.favorited_at || '';
      if (ta < tb) return 1;
      if (ta > tb) return -1;
      return 0;
    });

    for (const f of sortedFavs) {
      if (f.item_type === 'artist' && f.artist_id) {
        const artist = artistMap[f.artist_id];
        if (!artist) continue;
        const genre = artist.primary_genre_id
          ? genreMap[artist.primary_genre_id] || null
          : null;
        favArtists.push({
          artist_id: artist.id,
          name: artist.name,
          image_url: artist.image_url || null,
          primary_genre_name: genre ? genre.name : null,
          artist,
          primary_genre: genre || null
        });
      } else if (f.item_type === 'album' && f.album_id) {
        const album = albumMap[f.album_id];
        if (!album) continue;
        const artist = album.primary_artist_id
          ? artistMap[album.primary_artist_id] || null
          : null;
        favAlbums.push({
          album_id: album.id,
          title: album.title,
          primary_artist_name: artist ? artist.name : null,
          cover_image_url: album.cover_image_url || null,
          release_year: album.release_year,
          album_type: album.album_type,
          album,
          primary_artist: artist || null
        });
      } else if (f.item_type === 'track' && f.track_id) {
        const track = trackMap[f.track_id];
        if (!track) continue;
        const album = track.album_id ? albumMap[track.album_id] || null : null;
        const artist = album && album.primary_artist_id
          ? artistMap[album.primary_artist_id] || null
          : null;
        favTracks.push({
          track_id: track.id,
          title: track.title,
          primary_artist_name: artist ? artist.name : null,
          album_title: album ? album.title : null,
          formatted_duration: this._formatDuration(track.duration_seconds),
          track,
          album: album || null,
          primary_artist: artist || null
        });
      }
    }

    return {
      artists: favArtists,
      albums: favAlbums,
      tracks: favTracks
    };
  }

  // ----------------------
  // LIBRARY & LISTEN LATER
  // ----------------------

  // addAlbumToLibrary(albumId)
  addAlbumToLibrary(albumId) {
    let libraryAlbums = this._getFromStorage('library_albums');
    const existing = libraryAlbums.find((la) => la.album_id === albumId);
    if (!existing) {
      const now = this._getCurrentTimestamp();
      const newEntry = {
        id: this._generateId('libalb'),
        album_id: albumId,
        added_at: now
      };
      libraryAlbums.push(newEntry);
      this._saveToStorage('library_albums', libraryAlbums);
      return {
        album_id: albumId,
        is_in_library: true,
        message: 'Album added to library.'
      };
    }
    return {
      album_id: albumId,
      is_in_library: true,
      message: 'Album already in library.'
    };
  }

  // removeAlbumFromLibrary(albumId)
  removeAlbumFromLibrary(albumId) {
    let libraryAlbums = this._getFromStorage('library_albums');
    const beforeLen = libraryAlbums.length;
    libraryAlbums = libraryAlbums.filter((la) => la.album_id !== albumId);
    this._saveToStorage('library_albums', libraryAlbums);
    const removed = libraryAlbums.length < beforeLen;
    return {
      album_id: albumId,
      is_in_library: !removed,
      message: removed ? 'Album removed from library.' : 'Album was not in library.'
    };
  }

  // getLibraryOverview()
  getLibraryOverview() {
    const libraryAlbums = this._getFromStorage('library_albums');
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');
    const playlists = this._getFromStorage('playlists');
    const playlistTracks = this._getFromStorage('playlist_tracks');

    const albumMap = this._buildIdMap(albums);
    const artistMap = this._buildIdMap(artists);

    const albumsOut = libraryAlbums.map((la) => {
      const album = albumMap[la.album_id] || null;
      const artist = album && album.primary_artist_id
        ? artistMap[album.primary_artist_id] || null
        : null;
      return {
        album_id: la.album_id,
        title: album ? album.title : null,
        primary_artist_name: artist ? artist.name : null,
        cover_image_url: album ? album.cover_image_url || null : null,
        release_year: album ? album.release_year : null,
        album_type: album ? album.album_type : null,
        added_at: la.added_at,
        album,
        primary_artist: artist || null
      };
    });

    const playlistTrackCounts = {};
    for (const pt of playlistTracks) {
      if (!playlistTrackCounts[pt.playlist_id]) playlistTrackCounts[pt.playlist_id] = 0;
      playlistTrackCounts[pt.playlist_id] += 1;
    }

    const playlistsOut = playlists.map((pl) => ({
      playlist_id: pl.id,
      name: pl.name,
      description: pl.description || null,
      track_count: playlistTrackCounts[pl.id] || 0,
      created_at: pl.created_at,
      updated_at: pl.updated_at
    }));

    return {
      albums: albumsOut,
      playlists: playlistsOut
    };
  }

  // addAlbumToListenLater(albumId)
  addAlbumToListenLater(albumId) {
    let listenLater = this._getFromStorage('listen_later_albums');
    const existing = listenLater.find((la) => la.album_id === albumId);
    if (!existing) {
      const now = this._getCurrentTimestamp();
      const newEntry = {
        id: this._generateId('llalb'),
        album_id: albumId,
        added_at: now
      };
      listenLater.push(newEntry);
      this._saveToStorage('listen_later_albums', listenLater);
      return {
        album_id: albumId,
        is_in_listen_later: true,
        message: 'Album added to Listen Later.'
      };
    }
    return {
      album_id: albumId,
      is_in_listen_later: true,
      message: 'Album already in Listen Later.'
    };
  }

  // removeAlbumFromListenLater(albumId)
  removeAlbumFromListenLater(albumId) {
    let listenLater = this._getFromStorage('listen_later_albums');
    const beforeLen = listenLater.length;
    listenLater = listenLater.filter((la) => la.album_id !== albumId);
    this._saveToStorage('listen_later_albums', listenLater);
    const removed = listenLater.length < beforeLen;
    return {
      album_id: albumId,
      is_in_listen_later: !removed,
      message: removed ? 'Album removed from Listen Later.' : 'Album was not in Listen Later.'
    };
  }

  // getListenLaterAlbums()
  getListenLaterAlbums() {
    const listenLater = this._getFromStorage('listen_later_albums');
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');

    const albumMap = this._buildIdMap(albums);
    const artistMap = this._buildIdMap(artists);

    return listenLater.map((la) => {
      const album = albumMap[la.album_id] || null;
      const artist = album && album.primary_artist_id
        ? artistMap[album.primary_artist_id] || null
        : null;
      return {
        album_id: la.album_id,
        title: album ? album.title : null,
        primary_artist_name: artist ? artist.name : null,
        cover_image_url: album ? album.cover_image_url || null : null,
        release_year: album ? album.release_year : null,
        added_at: la.added_at,
        album,
        primary_artist: artist || null
      };
    });
  }

  // ----------------------
  // BOOKMARKS INTERFACES
  // ----------------------

  // bookmarkAlbum(albumId)
  bookmarkAlbum(albumId) {
    let bookmarks = this._getFromStorage('bookmarked_albums');
    const existing = bookmarks.find((b) => b.album_id === albumId);
    if (!existing) {
      const now = this._getCurrentTimestamp();
      const entry = {
        id: this._generateId('bmkalb'),
        album_id: albumId,
        bookmarked_at: now
      };
      bookmarks.push(entry);
      this._saveToStorage('bookmarked_albums', bookmarks);
      return {
        album_id: albumId,
        is_bookmarked: true,
        message: 'Album bookmarked.'
      };
    }
    return {
      album_id: albumId,
      is_bookmarked: true,
      message: 'Album already bookmarked.'
    };
  }

  // unbookmarkAlbum(albumId)
  unbookmarkAlbum(albumId) {
    let bookmarks = this._getFromStorage('bookmarked_albums');
    const beforeLen = bookmarks.length;
    bookmarks = bookmarks.filter((b) => b.album_id !== albumId);
    this._saveToStorage('bookmarked_albums', bookmarks);
    const removed = bookmarks.length < beforeLen;
    return {
      album_id: albumId,
      is_bookmarked: !removed,
      message: removed ? 'Album removed from bookmarks.' : 'Album was not bookmarked.'
    };
  }

  // getBookmarkedAlbums()
  getBookmarkedAlbums() {
    const bookmarks = this._getFromStorage('bookmarked_albums');
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');

    const albumMap = this._buildIdMap(albums);
    const artistMap = this._buildIdMap(artists);

    return bookmarks.map((b) => {
      const album = albumMap[b.album_id] || null;
      const artist = album && album.primary_artist_id
        ? artistMap[album.primary_artist_id] || null
        : null;
      return {
        album_id: b.album_id,
        title: album ? album.title : null,
        primary_artist_name: artist ? artist.name : null,
        cover_image_url: album ? album.cover_image_url || null : null,
        release_year: album ? album.release_year : null,
        album_type: album ? album.album_type : null,
        bookmarked_at: b.bookmarked_at,
        album,
        primary_artist: artist || null
      };
    });
  }

  // ----------------------
  // FOLLOWED ARTISTS
  // ----------------------

  // setFollowStatus(artistId, isFollowed)
  setFollowStatus(artistId, isFollowed) {
    let followed = this._getFromStorage('followed_artists');
    const existing = followed.find((f) => f.artist_id === artistId);
    const shouldFollow = !!isFollowed;

    if (shouldFollow) {
      if (!existing) {
        const now = this._getCurrentTimestamp();
        const entry = {
          id: this._generateId('follow'),
          artist_id: artistId,
          followed_at: now
        };
        followed.push(entry);
        this._saveToStorage('followed_artists', followed);
      }
      return {
        artist_id: artistId,
        is_followed: true,
        message: 'Artist followed.'
      };
    } else {
      if (existing) {
        followed = followed.filter((f) => f.artist_id !== artistId);
        this._saveToStorage('followed_artists', followed);
      }
      return {
        artist_id: artistId,
        is_followed: false,
        message: 'Artist unfollowed.'
      };
    }
  }

  // getFollowedArtists()
  getFollowedArtists() {
    const followed = this._getFromStorage('followed_artists');
    const artists = this._getFromStorage('artists');
    const genres = this._getFromStorage('genres');

    const artistMap = this._buildIdMap(artists);
    const genreMap = this._buildIdMap(genres);

    return followed.map((f) => {
      const artist = artistMap[f.artist_id] || null;
      const genre = artist && artist.primary_genre_id
        ? genreMap[artist.primary_genre_id] || null
        : null;
      return {
        artist_id: f.artist_id,
        name: artist ? artist.name : null,
        image_url: artist ? artist.image_url || null : null,
        primary_genre_name: genre ? genre.name : null,
        followed_at: f.followed_at,
        artist,
        primary_genre: genre || null
      };
    });
  }

  // ----------------------
  // PLAYLISTS INTERFACES
  // ----------------------

  // getPlaylistsOverview()
  getPlaylistsOverview() {
    const playlists = this._getFromStorage('playlists');
    const playlistTracks = this._getFromStorage('playlist_tracks');

    const trackCounts = {};
    for (const pt of playlistTracks) {
      if (!trackCounts[pt.playlist_id]) trackCounts[pt.playlist_id] = 0;
      trackCounts[pt.playlist_id] += 1;
    }

    return playlists.map((pl) => ({
      playlist_id: pl.id,
      name: pl.name,
      description: pl.description || null,
      track_count: trackCounts[pl.id] || 0,
      created_at: pl.created_at,
      updated_at: pl.updated_at
    }));
  }

  // createPlaylist(name, description)
  createPlaylist(name, description) {
    const playlists = this._getFromStorage('playlists');
    const now = this._getCurrentTimestamp();
    const playlist = {
      id: this._generateId('playlist'),
      name: name,
      description: description || null,
      created_at: now,
      updated_at: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);
    return {
      playlist_id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      track_count: 0
    };
  }

  // createPlaylistWithTracks(name, description, trackIds)
  createPlaylistWithTracks(name, description, trackIds) {
    const playlists = this._getFromStorage('playlists');
    const now = this._getCurrentTimestamp();
    const playlist = {
      id: this._generateId('playlist'),
      name: name,
      description: description || null,
      created_at: now,
      updated_at: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    const idsArray = Array.isArray(trackIds) ? trackIds : [];
    if (idsArray.length > 0) {
      this._createPlaylistTrackEntries(playlist.id, idsArray);
    }

    return {
      playlist_id: playlist.id,
      name: playlist.name,
      track_count: idsArray.length,
      message: 'Playlist created.'
    };
  }

  // renamePlaylist(playlistId, newName)
  renamePlaylist(playlistId, newName) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (!playlist) {
      return {
        playlist_id: playlistId,
        name: null
      };
    }
    playlist.name = newName;
    playlist.updated_at = this._getCurrentTimestamp();
    this._saveToStorage('playlists', playlists);
    return {
      playlist_id: playlist.id,
      name: playlist.name
    };
  }

  // deletePlaylist(playlistId)
  deletePlaylist(playlistId) {
    let playlists = this._getFromStorage('playlists');
    let playlistTracks = this._getFromStorage('playlist_tracks');

    const beforeLen = playlists.length;
    playlists = playlists.filter((pl) => pl.id !== playlistId);
    playlistTracks = playlistTracks.filter((pt) => pt.playlist_id !== playlistId);

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_tracks', playlistTracks);

    const deleted = playlists.length < beforeLen;
    return {
      playlist_id: playlistId,
      deleted: deleted,
      message: deleted ? 'Playlist deleted.' : 'Playlist not found.'
    };
  }

  // getPlaylistDetail(playlistId)
  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlistTracks = this._getFromStorage('playlist_tracks');
    const tracks = this._getFromStorage('tracks');
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');

    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (!playlist) return null;

    const trackMap = this._buildIdMap(tracks);
    const albumMap = this._buildIdMap(albums);
    const artistMap = this._buildIdMap(artists);

    const pts = playlistTracks
      .filter((pt) => pt.playlist_id === playlistId)
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const tracksOut = pts.map((pt) => {
      const track = trackMap[pt.track_id] || null;
      const album = track && track.album_id ? albumMap[track.album_id] || null : null;
      const artist = album && album.primary_artist_id
        ? artistMap[album.primary_artist_id] || null
        : null;
      return {
        playlist_track_id: pt.id,
        position: pt.position,
        track_id: pt.track_id,
        track_title: track ? track.title : null,
        formatted_duration: track ? this._formatDuration(track.duration_seconds) : null,
        album_id: album ? album.id : null,
        album_title: album ? album.title : null,
        primary_artist_id: artist ? artist.id : null,
        primary_artist_name: artist ? artist.name : null,
        track: track || null,
        album: album || null,
        primary_artist: artist || null
      };
    });

    return {
      playlist_id: playlist.id,
      name: playlist.name,
      description: playlist.description || null,
      track_count: tracksOut.length,
      tracks: tracksOut
    };
  }

  // addTrackToPlaylist(playlistId, trackId)
  addTrackToPlaylist(playlistId, trackId) {
    const playlists = this._getFromStorage('playlists');
    let playlistTracks = this._getFromStorage('playlist_tracks');

    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (!playlist) {
      return {
        playlist_id: playlistId,
        track_id: trackId,
        position: null,
        message: 'Playlist not found.'
      };
    }

    const existing = playlistTracks.filter((pt) => pt.playlist_id === playlistId);
    let lastPosition = 0;
    for (const pt of existing) {
      if (typeof pt.position === 'number' && pt.position > lastPosition) {
        lastPosition = pt.position;
      }
    }

    const now = this._getCurrentTimestamp();
    const newPt = {
      id: this._generateId('pltrack'),
      playlist_id: playlistId,
      track_id: trackId,
      position: lastPosition + 1,
      added_at: now
    };
    playlistTracks.push(newPt);
    this._saveToStorage('playlist_tracks', playlistTracks);

    playlist.updated_at = now;
    this._saveToStorage('playlists', playlists);

    return {
      playlist_id: playlistId,
      track_id: trackId,
      position: newPt.position,
      message: 'Track added to playlist.'
    };
  }

  // removeTrackFromPlaylist(playlistTrackId)
  removeTrackFromPlaylist(playlistTrackId) {
    let playlistTracks = this._getFromStorage('playlist_tracks');
    const target = playlistTracks.find((pt) => pt.id === playlistTrackId);
    if (!target) {
      return {
        playlist_track_id: playlistTrackId,
        removed: false,
        message: 'Playlist track not found.'
      };
    }

    const playlistId = target.playlist_id;
    playlistTracks = playlistTracks.filter((pt) => pt.id !== playlistTrackId);

    // Renumber positions for that playlist
    const ptsForPlaylist = playlistTracks
      .filter((pt) => pt.playlist_id === playlistId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    let pos = 1;
    for (const pt of ptsForPlaylist) {
      pt.position = pos++;
    }

    this._saveToStorage('playlist_tracks', playlistTracks);

    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (playlist) {
      playlist.updated_at = this._getCurrentTimestamp();
      this._saveToStorage('playlists', playlists);
    }

    return {
      playlist_track_id: playlistTrackId,
      removed: true,
      message: 'Track removed from playlist.'
    };
  }

  // reorderPlaylistTracks(reorderedItems)
  reorderPlaylistTracks(reorderedItems) {
    if (!Array.isArray(reorderedItems)) {
      return {
        updated: false,
        message: 'Invalid input.'
      };
    }
    const playlistTracks = this._getFromStorage('playlist_tracks');
    const ptMap = {};
    for (const pt of playlistTracks) {
      ptMap[pt.id] = pt;
    }

    const touchedPlaylists = new Set();

    for (const item of reorderedItems) {
      if (!item || !item.playlistTrackId) continue;
      const pt = ptMap[item.playlistTrackId];
      if (!pt) continue;
      if (typeof item.position === 'number') {
        pt.position = item.position;
        touchedPlaylists.add(pt.playlist_id);
      }
    }

    this._saveToStorage('playlist_tracks', playlistTracks);

    if (touchedPlaylists.size > 0) {
      const playlists = this._getFromStorage('playlists');
      const now = this._getCurrentTimestamp();
      for (const pl of playlists) {
        if (touchedPlaylists.has(pl.id)) {
          pl.updated_at = now;
        }
      }
      this._saveToStorage('playlists', playlists);
    }

    return {
      updated: true,
      message: 'Playlist tracks reordered.'
    };
  }

  // addPlaylistToQueue(playlistId, playNext)
  addPlaylistToQueue(playlistId, playNext) {
    const queue = this._getOrCreateQueue();
    let queueItems = this._getFromStorage('queue_items');
    const playlistTracks = this._getFromStorage('playlist_tracks');

    const pts = playlistTracks
      .filter((pt) => pt.playlist_id === playlistId)
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    if (pts.length === 0) {
      return {
        queue_id: queue.id,
        added_item_count: 0,
        message: 'Playlist has no tracks.'
      };
    }

    let lastPosition = 0;
    for (const qi of queueItems) {
      if (qi.queue_id === queue.id && typeof qi.position === 'number' && qi.position > lastPosition) {
        lastPosition = qi.position;
      }
    }

    // playNext flag is accepted but we do not implement complex insertion logic; we append
    const now = this._getCurrentTimestamp();
    let addedCount = 0;

    for (const pt of pts) {
      lastPosition += 1;
      const qi = {
        id: this._generateId('queueitem'),
        queue_id: queue.id,
        item_type: 'track',
        album_id: null,
        track_id: pt.track_id,
        playlist_id: playlistId,
        position: lastPosition,
        added_at: now
      };
      queueItems.push(qi);
      addedCount += 1;
    }

    this._saveToStorage('queue_items', queueItems);

    const queues = this._getFromStorage('queue');
    const q = queues.find((qq) => qq.id === queue.id);
    if (q) {
      q.updated_at = now;
      this._saveToStorage('queue', queues);
    }

    return {
      queue_id: queue.id,
      added_item_count: addedCount,
      message: 'Playlist added to queue.'
    };
  }

  // ----------------------
  // CUSTOM LISTS (ALBUM LISTS)
  // ----------------------

  // getCustomListsOverview()
  getCustomListsOverview() {
    const lists = this._getFromStorage('custom_lists');
    const listAlbums = this._getFromStorage('list_albums');

    const counts = {};
    for (const la of listAlbums) {
      if (!counts[la.list_id]) counts[la.list_id] = 0;
      counts[la.list_id] += 1;
    }

    return lists.map((l) => ({
      list_id: l.id,
      name: l.name,
      description: l.description || null,
      album_count: counts[l.id] || 0,
      created_at: l.created_at,
      updated_at: l.updated_at
    }));
  }

  // createCustomList(name, description)
  createCustomList(name, description) {
    const lists = this._getFromStorage('custom_lists');
    const now = this._getCurrentTimestamp();
    const list = {
      id: this._generateId('list'),
      name: name,
      description: description || null,
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('custom_lists', lists);
    return {
      list_id: list.id,
      name: list.name,
      description: list.description
    };
  }

  // renameCustomList(listId, newName)
  renameCustomList(listId, newName) {
    const lists = this._getFromStorage('custom_lists');
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return {
        list_id: listId,
        name: null
      };
    }
    list.name = newName;
    list.updated_at = this._getCurrentTimestamp();
    this._saveToStorage('custom_lists', lists);
    return {
      list_id: list.id,
      name: list.name
    };
  }

  // deleteCustomList(listId)
  deleteCustomList(listId) {
    let lists = this._getFromStorage('custom_lists');
    let listAlbums = this._getFromStorage('list_albums');

    const beforeLen = lists.length;
    lists = lists.filter((l) => l.id !== listId);
    listAlbums = listAlbums.filter((la) => la.list_id !== listId);

    this._saveToStorage('custom_lists', lists);
    this._saveToStorage('list_albums', listAlbums);

    const deleted = lists.length < beforeLen;
    return {
      list_id: listId,
      deleted: deleted,
      message: deleted ? 'List deleted.' : 'List not found.'
    };
  }

  // getCustomListDetail(listId)
  getCustomListDetail(listId) {
    const lists = this._getFromStorage('custom_lists');
    const listAlbums = this._getFromStorage('list_albums');
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');

    const list = lists.find((l) => l.id === listId);
    if (!list) return null;

    const albumMap = this._buildIdMap(albums);
    const artistMap = this._buildIdMap(artists);

    const las = listAlbums
      .filter((la) => la.list_id === listId)
      .slice()
      .sort((a, b) => {
        const ta = a.added_at || '';
        const tb = b.added_at || '';
        if (ta < tb) return 1;
        if (ta > tb) return -1;
        return 0;
      });

    const albumsOut = las.map((la) => {
      const album = albumMap[la.album_id] || null;
      const artist = album && album.primary_artist_id
        ? artistMap[album.primary_artist_id] || null
        : null;
      return {
        list_album_id: la.id,
        album_id: la.album_id,
        title: album ? album.title : null,
        primary_artist_name: artist ? artist.name : null,
        cover_image_url: album ? album.cover_image_url || null : null,
        release_year: album ? album.release_year : null,
        album_type: album ? album.album_type : null,
        added_at: la.added_at,
        album,
        primary_artist: artist || null
      };
    });

    return {
      list_id: list.id,
      name: list.name,
      description: list.description || null,
      albums: albumsOut
    };
  }

  // addAlbumToCustomList(listId, albumId, note)
  addAlbumToCustomList(listId, albumId, note) {
    const lists = this._getFromStorage('custom_lists');
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return {
        list_id: listId,
        album_id: albumId,
        list_album_id: null,
        message: 'List not found.'
      };
    }

    const listAlbums = this._getFromStorage('list_albums');
    const now = this._getCurrentTimestamp();
    const la = {
      id: this._generateId('listalb'),
      list_id: listId,
      album_id: albumId,
      added_at: now,
      note: note || null
    };
    listAlbums.push(la);
    this._saveToStorage('list_albums', listAlbums);

    list.updated_at = now;
    this._saveToStorage('custom_lists', lists);

    return {
      list_id: listId,
      album_id: albumId,
      list_album_id: la.id,
      message: 'Album added to list.'
    };
  }

  // removeAlbumFromCustomList(listAlbumId)
  removeAlbumFromCustomList(listAlbumId) {
    let listAlbums = this._getFromStorage('list_albums');
    const target = listAlbums.find((la) => la.id === listAlbumId);
    if (!target) {
      return {
        list_album_id: listAlbumId,
        removed: false,
        message: 'List album entry not found.'
      };
    }

    listAlbums = listAlbums.filter((la) => la.id !== listAlbumId);
    this._saveToStorage('list_albums', listAlbums);

    const lists = this._getFromStorage('custom_lists');
    const list = lists.find((l) => l.id === target.list_id);
    if (list) {
      list.updated_at = this._getCurrentTimestamp();
      this._saveToStorage('custom_lists', lists);
    }

    return {
      list_album_id: listAlbumId,
      removed: true,
      message: 'Album removed from list.'
    };
  }

  // ----------------------
  // QUEUE INTERFACES
  // ----------------------

  // getQueue()
  getQueue() {
    const queue = this._getOrCreateQueue();
    const queueItems = this._getFromStorage('queue_items');
    const albums = this._getFromStorage('albums');
    const tracks = this._getFromStorage('tracks');
    const playlists = this._getFromStorage('playlists');
    const artists = this._getFromStorage('artists');

    const albumMap = this._buildIdMap(albums);
    const trackMap = this._buildIdMap(tracks);
    const playlistMap = this._buildIdMap(playlists);
    const artistMap = this._buildIdMap(artists);

    const items = queueItems
      .filter((qi) => qi.queue_id === queue.id)
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((qi) => {
        let album = null;
        let track = null;
        let playlist = null;
        let primaryArtistName = null;
        let formattedDuration = null;

        if (qi.item_type === 'album' && qi.album_id) {
          album = albumMap[qi.album_id] || null;
          if (album) {
            formattedDuration = this._formatDuration(album.total_duration_seconds);
            if (album.primary_artist_id) {
              const artist = artistMap[album.primary_artist_id] || null;
              primaryArtistName = artist ? artist.name : null;
            }
          }
        } else if (qi.item_type === 'track' && qi.track_id) {
          track = trackMap[qi.track_id] || null;
          if (track) {
            formattedDuration = this._formatDuration(track.duration_seconds);
            album = track.album_id ? albumMap[track.album_id] || null : null;
            if (album && album.primary_artist_id) {
              const artist = artistMap[album.primary_artist_id] || null;
              primaryArtistName = artist ? artist.name : null;
            }
          }
        } else if (qi.item_type === 'playlist' && qi.playlist_id) {
          playlist = playlistMap[qi.playlist_id] || null;
          if (playlist) {
            // approximate playlist duration by summing track durations
            const pts = this._getFromStorage('playlist_tracks').filter(
              (pt) => pt.playlist_id === playlist.id
            );
            let totalSeconds = 0;
            for (const pt of pts) {
              const t = trackMap[pt.track_id];
              if (t && typeof t.duration_seconds === 'number') {
                totalSeconds += t.duration_seconds;
              }
            }
            formattedDuration = this._formatDuration(totalSeconds);
          }
        }

        return {
          queue_item_id: qi.id,
          position: qi.position,
          item_type: qi.item_type,
          album_id: qi.album_id || null,
          album_title: album ? album.title : null,
          track_id: qi.track_id || null,
          track_title: track ? track.title : null,
          playlist_id: qi.playlist_id || null,
          playlist_name: playlist ? playlist.name : null,
          primary_artist_name: primaryArtistName,
          formatted_duration: formattedDuration,
          added_at: qi.added_at,
          album: album || null,
          track: track || null,
          playlist: playlist || null
        };
      });

    return {
      queue_id: queue.id,
      items: items
    };
  }

  // addAlbumToQueue(albumId, playNext)
  addAlbumToQueue(albumId, playNext) {
    const queue = this._getOrCreateQueue();
    let queueItems = this._getFromStorage('queue_items');

    let lastPosition = 0;
    for (const qi of queueItems) {
      if (qi.queue_id === queue.id && typeof qi.position === 'number' && qi.position > lastPosition) {
        lastPosition = qi.position;
      }
    }

    const now = this._getCurrentTimestamp();
    const qi = {
      id: this._generateId('queueitem'),
      queue_id: queue.id,
      item_type: 'album',
      album_id: albumId,
      track_id: null,
      playlist_id: null,
      position: lastPosition + 1,
      added_at: now
    };
    queueItems.push(qi);
    this._saveToStorage('queue_items', queueItems);

    const queues = this._getFromStorage('queue');
    const q = queues.find((qq) => qq.id === queue.id);
    if (q) {
      q.updated_at = now;
      this._saveToStorage('queue', queues);
    }

    return {
      queue_id: queue.id,
      queue_item_id: qi.id,
      position: qi.position,
      message: 'Album added to queue.'
    };
  }

  // addTrackToQueue(trackId, playNext)
  addTrackToQueue(trackId, playNext) {
    const queue = this._getOrCreateQueue();
    let queueItems = this._getFromStorage('queue_items');

    let lastPosition = 0;
    for (const qi of queueItems) {
      if (qi.queue_id === queue.id && typeof qi.position === 'number' && qi.position > lastPosition) {
        lastPosition = qi.position;
      }
    }

    const now = this._getCurrentTimestamp();
    const qi = {
      id: this._generateId('queueitem'),
      queue_id: queue.id,
      item_type: 'track',
      album_id: null,
      track_id: trackId,
      playlist_id: null,
      position: lastPosition + 1,
      added_at: now
    };
    queueItems.push(qi);
    this._saveToStorage('queue_items', queueItems);

    const queues = this._getFromStorage('queue');
    const q = queues.find((qq) => qq.id === queue.id);
    if (q) {
      q.updated_at = now;
      this._saveToStorage('queue', queues);
    }

    return {
      queue_id: queue.id,
      queue_item_id: qi.id,
      position: qi.position,
      message: 'Track added to queue.'
    };
  }

  // removeQueueItem(queueItemId)
  removeQueueItem(queueItemId) {
    let queueItems = this._getFromStorage('queue_items');
    const target = queueItems.find((qi) => qi.id === queueItemId);
    if (!target) {
      return {
        queue_item_id: queueItemId,
        removed: false,
        message: 'Queue item not found.'
      };
    }

    const queueId = target.queue_id;
    queueItems = queueItems.filter((qi) => qi.id !== queueItemId);

    // Renumber positions for the same queue
    const forQueue = queueItems
      .filter((qi) => qi.queue_id === queueId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    let pos = 1;
    for (const qi of forQueue) {
      qi.position = pos++;
    }

    this._saveToStorage('queue_items', queueItems);

    const queues = this._getFromStorage('queue');
    const q = queues.find((qq) => qq.id === queueId);
    if (q) {
      q.updated_at = this._getCurrentTimestamp();
      this._saveToStorage('queue', queues);
    }

    return {
      queue_item_id: queueItemId,
      removed: true,
      message: 'Queue item removed.'
    };
  }

  // reorderQueueItems(reorderedItems)
  reorderQueueItems(reorderedItems) {
    if (!Array.isArray(reorderedItems)) {
      return {
        updated: false,
        message: 'Invalid input.'
      };
    }

    const queueItems = this._getFromStorage('queue_items');
    const qiMap = {};
    for (const qi of queueItems) {
      qiMap[qi.id] = qi;
    }

    const touchedQueues = new Set();

    for (const item of reorderedItems) {
      if (!item || !item.queueItemId || typeof item.position !== 'number') continue;
      const qi = qiMap[item.queueItemId];
      if (!qi) continue;
      qi.position = item.position;
      touchedQueues.add(qi.queue_id);
    }

    this._saveToStorage('queue_items', queueItems);

    if (touchedQueues.size > 0) {
      const queues = this._getFromStorage('queue');
      const now = this._getCurrentTimestamp();
      for (const q of queues) {
        if (touchedQueues.has(q.id)) {
          q.updated_at = now;
        }
      }
      this._saveToStorage('queue', queues);
    }

    return {
      updated: true,
      message: 'Queue items reordered.'
    };
  }

  // clearQueue()
  clearQueue() {
    const queue = this._getOrCreateQueue();
    let queueItems = this._getFromStorage('queue_items');
    queueItems = queueItems.filter((qi) => qi.queue_id !== queue.id);
    this._saveToStorage('queue_items', queueItems);

    const queues = this._getFromStorage('queue');
    const q = queues.find((qq) => qq.id === queue.id);
    if (q) {
      q.updated_at = this._getCurrentTimestamp();
      this._saveToStorage('queue', queues);
    }

    return {
      queue_id: queue.id,
      cleared: true,
      message: 'Queue cleared.'
    };
  }

  // ----------------------
  // STATIC / CMS-LIKE CONTENT
  // ----------------------

  // getAboutContent()
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    if (!raw) {
      return {
        headline: '',
        body: '',
        data_sources: ''
      };
    }
    try {
      const obj = JSON.parse(raw) || {};
      return {
        headline: obj.headline || '',
        body: obj.body || '',
        data_sources: obj.data_sources || ''
      };
    } catch (e) {
      return {
        headline: '',
        body: '',
        data_sources: ''
      };
    }
  }

  // getHelpTopics()
  getHelpTopics() {
    const topics = this._getFromStorage('help_topics');
    return topics.map((t) => ({
      topic_id: t.topic_id || t.id || null,
      question: t.question || '',
      answer: t.answer || '',
      category: t.category || ''
    }));
  }

  // getContactInfo()
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    if (!raw) {
      return {
        support_email: '',
        support_url: '',
        message: ''
      };
    }
    try {
      const obj = JSON.parse(raw) || {};
      return {
        support_email: obj.support_email || '',
        support_url: obj.support_url || '',
        message: obj.message || ''
      };
    } catch (e) {
      return {
        support_email: '',
        support_url: '',
        message: ''
      };
    }
  }

  // submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    const msgs = this._getFromStorage('contact_messages');
    const entry = {
      id: this._generateId('contactmsg'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      submitted_at: this._getCurrentTimestamp()
    };
    msgs.push(entry);
    this._saveToStorage('contact_messages', msgs);
    return {
      submitted: true,
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
