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

  // --- Initialization & generic storage helpers ---

  _initStorage() {
    const arrayKeys = [
      'songs',
      'translations',
      'artists',
      'albums',
      'playlists',
      'playlist_songs',
      'library_items',
      'vocabulary_lists',
      'vocabulary_entries',
      'annotations',
      'help_articles',
      'faq_entries',
      'contact_messages',
      'legal_content'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    // settings and about_content are singular objects; let helpers create defaults when needed
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
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

  _buildIndex(array, key) {
    const index = {};
    if (Array.isArray(array)) {
      for (let i = 0; i < array.length; i++) {
        const item = array[i];
        if (item && item[key] != null) {
          index[item[key]] = item;
        }
      }
    }
    return index;
  }

  // --- Required private helper functions from spec ---

  _getOrCreateSettingsRecord() {
    const raw = localStorage.getItem('settings');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to re-create
      }
    }
    const now = new Date().toISOString();
    const settings = {
      id: 'settings_1',
      showExplicitLyrics: true,
      defaultOriginalLanguage: 'english',
      defaultTranslationLanguage: 'english',
      defaultDisplayMode: 'original_only',
      defaultTextSize: 'medium',
      createdAt: now,
      updatedAt: now
    };
    localStorage.setItem('settings', JSON.stringify(settings));
    return settings;
  }

  _saveSettingsRecord(settings) {
    localStorage.setItem('settings', JSON.stringify(settings));
  }

  _getOrCreateLibraryStore() {
    let items = this._getFromStorage('library_items');
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('library_items', items);
    }
    return items;
  }

  _getOrCreatePlaylistsStore() {
    let playlists = this._getFromStorage('playlists');
    if (!Array.isArray(playlists)) {
      playlists = [];
      this._saveToStorage('playlists', playlists);
    }
    let playlistSongs = this._getFromStorage('playlist_songs');
    if (!Array.isArray(playlistSongs)) {
      playlistSongs = [];
      this._saveToStorage('playlist_songs', playlistSongs);
    }
    return { playlists, playlistSongs };
  }

  _getOrCreateVocabularyStore() {
    let lists = this._getFromStorage('vocabulary_lists');
    if (!Array.isArray(lists)) {
      lists = [];
      this._saveToStorage('vocabulary_lists', lists);
    }
    let entries = this._getFromStorage('vocabulary_entries');
    if (!Array.isArray(entries)) {
      entries = [];
      this._saveToStorage('vocabulary_entries', entries);
    }
    return { lists, entries };
  }

  _getOrCreateAnnotationsStore() {
    let annotations = this._getFromStorage('annotations');
    if (!Array.isArray(annotations)) {
      annotations = [];
      this._saveToStorage('annotations', annotations);
    }
    return annotations;
  }

  // --- Relation resolution helpers (foreign key expansion) ---

  _resolveSongRelations(song, artistsById, albumsById, translationsById) {
    if (!song) return null;
    const resolved = Object.assign({}, song);
    if (song.primaryArtistId && artistsById) {
      resolved.artist = artistsById[song.primaryArtistId] || null;
    } else {
      resolved.artist = null;
    }
    if (song.albumId && albumsById) {
      resolved.album = albumsById[song.albumId] || null;
    } else {
      resolved.album = null;
    }
    if (song.defaultTranslationId && translationsById) {
      resolved.defaultTranslation = translationsById[song.defaultTranslationId] || null;
    } else {
      resolved.defaultTranslation = null;
    }
    return resolved;
  }

  _resolveTranslationRelations(translation, songsById, artistsById, albumsById, translationsById) {
    if (!translation) return null;
    const resolved = Object.assign({}, translation);
    const song = songsById ? songsById[translation.songId] : null;
    if (song) {
      resolved.song = this._resolveSongRelations(song, artistsById, albumsById, translationsById);
    } else {
      resolved.song = null;
    }
    return resolved;
  }

  // --- Interface implementations ---

  // getHomePageFeaturedContent
  getHomePageFeaturedContent() {
    const settings = this._getOrCreateSettingsRecord();
    const songsRaw = this._getFromStorage('songs');
    const playlists = this._getFromStorage('playlists');
    const translationsRaw = this._getFromStorage('translations');
    const vocabularyLists = this._getFromStorage('vocabulary_lists');
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');

    const artistsById = this._buildIndex(artists, 'id');
    const albumsById = this._buildIndex(albums, 'id');
    const translationsById = this._buildIndex(translationsRaw, 'id');
    const songsById = this._buildIndex(songsRaw, 'id');

    // Featured songs: by popularity, respecting explicit settings
    let songs = songsRaw.slice();
    if (!settings.showExplicitLyrics) {
      songs = songs.filter((s) => !s.isExplicit);
    }
    songs.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    const featuredSongs = songs
      .slice(0, 10)
      .map((s) => this._resolveSongRelations(s, artistsById, albumsById, translationsById));

    // Featured playlists: most recently updated
    const featuredPlaylists = playlists
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, 10);

    // Featured translations: highest-rated, respecting explicit settings via parent song
    let translations = translationsRaw.filter((t) => {
      const parentSong = songsById[t.songId];
      if (!parentSong) return false;
      if (!settings.showExplicitLyrics && parentSong.isExplicit) return false;
      return true;
    });
    translations.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const featuredTranslations = translations
      .slice(0, 10)
      .map((t) => this._resolveTranslationRelations(t, songsById, artistsById, albumsById, translationsById));

    // Featured vocabulary lists: most recently updated
    const featuredVocabularyLists = vocabularyLists
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, 10);

    return {
      featuredSongs,
      featuredPlaylists,
      featuredTranslations,
      featuredVocabularyLists
    };
  }

  // getSongSearchFilterOptions()
  getSongSearchFilterOptions() {
    const songs = this._getFromStorage('songs');
    const originalLanguagesSet = new Set();
    const genresSet = new Set();
    const difficultyLevelsSet = new Set();
    let minReleaseYear = null;
    let maxReleaseYear = null;

    for (let i = 0; i < songs.length; i++) {
      const s = songs[i];
      if (s.originalLanguage) originalLanguagesSet.add(s.originalLanguage);
      if (s.genre) genresSet.add(s.genre);
      if (s.difficultyLevel) difficultyLevelsSet.add(s.difficultyLevel);
      if (typeof s.releaseYear === 'number') {
        if (minReleaseYear === null || s.releaseYear < minReleaseYear) {
          minReleaseYear = s.releaseYear;
        }
        if (maxReleaseYear === null || s.releaseYear > maxReleaseYear) {
          maxReleaseYear = s.releaseYear;
        }
      }
    }

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'popularity_desc', label: 'Popularity  High to Low' },
      { value: 'song_rating_desc', label: 'Song Rating  High to Low' },
      { value: 'translation_rating_desc', label: 'Translation Rating  High to Low' },
      { value: 'duration_asc', label: 'Duration  Shortest First' },
      { value: 'duration_desc', label: 'Duration  Longest First' }
    ];

    return {
      originalLanguages: Array.from(originalLanguagesSet),
      genres: Array.from(genresSet),
      difficultyLevels: Array.from(difficultyLevelsSet),
      minReleaseYear: minReleaseYear || 0,
      maxReleaseYear: maxReleaseYear || 0,
      sortOptions
    };
  }

  // searchSongs(query, filters, sort, page, pageSize)
  searchSongs(query, filters, sort, page, pageSize) {
    query = typeof query === 'string' ? query.trim() : '';
    filters = filters || {};
    sort = sort || 'relevance';
    page = page && page > 0 ? page : 1;
    pageSize = pageSize && pageSize > 0 ? pageSize : 20;

    const settings = this._getOrCreateSettingsRecord();
    const songsRaw = this._getFromStorage('songs');
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');
    const translations = this._getFromStorage('translations');

    const artistsById = this._buildIndex(artists, 'id');
    const albumsById = this._buildIndex(albums, 'id');
    const translationsById = this._buildIndex(translations, 'id');

    let songs = songsRaw.slice();

    // Global explicit filter
    if (!settings.showExplicitLyrics) {
      songs = songs.filter((s) => !s.isExplicit);
    }

    // Explicit filter from parameters (further constrain)
    if (typeof filters.isExplicit === 'boolean') {
      songs = songs.filter((s) => s.isExplicit === filters.isExplicit);
    }

    // Basic field filters
    if (filters.originalLanguage) {
      songs = songs.filter((s) => s.originalLanguage === filters.originalLanguage);
    }
    if (filters.genre) {
      songs = songs.filter((s) => s.genre === filters.genre);
    }
    if (typeof filters.minReleaseYear === 'number') {
      songs = songs.filter((s) => typeof s.releaseYear === 'number' && s.releaseYear >= filters.minReleaseYear);
    }
    if (typeof filters.maxReleaseYear === 'number') {
      songs = songs.filter((s) => typeof s.releaseYear === 'number' && s.releaseYear <= filters.maxReleaseYear);
    }
    if (filters.difficultyLevel) {
      songs = songs.filter((s) => s.difficultyLevel === filters.difficultyLevel);
    }
    if (typeof filters.maxDurationSeconds === 'number') {
      songs = songs.filter((s) => typeof s.durationSeconds === 'number' && s.durationSeconds <= filters.maxDurationSeconds);
    }

    if (filters.hasTranslations === true) {
      songs = songs.filter((s) => !!s.hasTranslations);
    }

    // Translation-related filters: requiredTranslationLanguage, minTranslationRating, minTranslationVotes
    if (
      filters.requiredTranslationLanguage ||
      typeof filters.minTranslationRating === 'number' ||
      typeof filters.minTranslationVotes === 'number'
    ) {
      const songsFiltered = [];
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const songTranslations = translations.filter((t) => t.songId === song.id);
        let matches = false;
        for (let j = 0; j < songTranslations.length; j++) {
          const t = songTranslations[j];
          if (filters.requiredTranslationLanguage && t.translationLanguage !== filters.requiredTranslationLanguage) {
            continue;
          }
          if (typeof filters.minTranslationRating === 'number' && (t.rating || 0) < filters.minTranslationRating) {
            continue;
          }
          if (typeof filters.minTranslationVotes === 'number' && (t.ratingVotes || 0) < filters.minTranslationVotes) {
            continue;
          }
          matches = true;
          break;
        }
        if (matches) songsFiltered.push(song);
      }
      songs = songsFiltered;
    }

    // Text query filtering (title, artist name, album title, genre, language)
    if (query) {
      const q = query.toLowerCase();
      songs = songs.filter((s) => {
        const artist = artistsById[s.primaryArtistId];
        const album = albumsById[s.albumId];
        const haystackParts = [
          s.title || '',
          (artist && artist.name) || '',
          (album && album.title) || '',
          s.genre || '',
          s.originalLanguage || ''
        ];
        const haystack = haystackParts.join(' ').toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    // Sorting
    if (sort === 'popularity_desc') {
      songs.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    } else if (sort === 'song_rating_desc') {
      songs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'translation_rating_desc') {
      // Use the highest translation rating per song (optionally considering requiredTranslationLanguage)
      const requiredLang = filters.requiredTranslationLanguage || null;
      songs.sort((a, b) => {
        const aMax = this._getMaxTranslationRatingForSong(a.id, translations, requiredLang);
        const bMax = this._getMaxTranslationRatingForSong(b.id, translations, requiredLang);
        return bMax - aMax;
      });
    } else if (sort === 'duration_asc') {
      songs.sort((a, b) => (a.durationSeconds || 0) - (b.durationSeconds || 0));
    } else if (sort === 'duration_desc') {
      songs.sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0));
    } else if (sort === 'relevance') {
      if (query) {
        const q = query.toLowerCase();
        songs.sort((a, b) => {
          const aScore = this._computeSongRelevanceScore(a, q, artistsById, albumsById);
          const bScore = this._computeSongRelevanceScore(b, q, artistsById, albumsById);
          return bScore - aScore;
        });
      }
    }

    const totalCount = songs.length;
    const start = (page - 1) * pageSize;
    const paged = songs.slice(start, start + pageSize);

    const results = paged.map((s) => this._resolveSongRelations(s, artistsById, albumsById, translationsById));

    return {
      results,
      totalCount,
      page,
      pageSize,
      appliedSort: sort
    };
  }

  _getMaxTranslationRatingForSong(songId, translations, requiredLang) {
    let max = 0;
    for (let i = 0; i < translations.length; i++) {
      const t = translations[i];
      if (t.songId !== songId) continue;
      if (requiredLang && t.translationLanguage !== requiredLang) continue;
      const r = t.rating || 0;
      if (r > max) max = r;
    }
    return max;
  }

  _computeSongRelevanceScore(song, queryLower, artistsById, albumsById) {
    let score = 0;
    const title = (song.title || '').toLowerCase();
    const artist = artistsById[song.primaryArtistId];
    const artistName = ((artist && artist.name) || '').toLowerCase();
    const album = albumsById[song.albumId];
    const albumTitle = ((album && album.title) || '').toLowerCase();
    const genre = (song.genre || '').toLowerCase();

    if (title.indexOf(queryLower) !== -1) score += 3;
    if (artistName.indexOf(queryLower) !== -1) score += 2;
    if (albumTitle.indexOf(queryLower) !== -1) score += 2;
    if (genre.indexOf(queryLower) !== -1) score += 1;

    return score;
  }

  // searchLyricsByPhrase(phrase, filters, sort, page, pageSize)
  searchLyricsByPhrase(phrase, filters, sort, page, pageSize) {
    if (!phrase || typeof phrase !== 'string') {
      return { results: [], totalCount: 0, page: 1, pageSize: pageSize || 20 };
    }

    filters = filters || {};
    sort = sort || 'duration_asc';
    page = page && page > 0 ? page : 1;
    pageSize = pageSize && pageSize > 0 ? pageSize : 20;

    const settings = this._getOrCreateSettingsRecord();
    const songsRaw = this._getFromStorage('songs');
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');

    const artistsById = this._buildIndex(artists, 'id');
    const albumsById = this._buildIndex(albums, 'id');

    let songs = songsRaw.slice();

    // Global explicit filter
    if (!settings.showExplicitLyrics) {
      songs = songs.filter((s) => !s.isExplicit);
    }

    // Filter params
    if (filters.originalLanguage) {
      songs = songs.filter((s) => s.originalLanguage === filters.originalLanguage);
    }
    if (filters.genre) {
      songs = songs.filter((s) => s.genre === filters.genre);
    }
    if (typeof filters.isExplicit === 'boolean') {
      songs = songs.filter((s) => s.isExplicit === filters.isExplicit);
    }

    const phraseLower = phrase.toLowerCase();
    const matched = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const lyrics = (song.lyricsPlainText || '').toLowerCase();
      const index = lyrics.indexOf(phraseLower);
      if (index !== -1) {
        const originalLyrics = song.lyricsPlainText || '';
        const snippet = this._buildSnippet(originalLyrics, index, phrase.length);
        matched.push({ song, matchedSnippet: snippet, matchIndex: index });
      }
    }

    // Sorting
    if (sort === 'duration_desc') {
      matched.sort((a, b) => (b.song.durationSeconds || 0) - (a.song.durationSeconds || 0));
    } else if (sort === 'relevance') {
      matched.sort((a, b) => a.matchIndex - b.matchIndex);
    } else {
      // duration_asc (default)
      matched.sort((a, b) => (a.song.durationSeconds || 0) - (b.song.durationSeconds || 0));
    }

    const totalCount = matched.length;
    const start = (page - 1) * pageSize;
    const paged = matched.slice(start, start + pageSize);

    const results = paged.map((item) => ({
      song: this._resolveSongRelations(item.song, artistsById, albumsById, null),
      matchedSnippet: item.matchedSnippet
    }));

    return { results, totalCount, page, pageSize };
  }

  _buildSnippet(fullText, index, phraseLength) {
    const radius = 40;
    const start = Math.max(0, index - radius);
    const end = Math.min(fullText.length, index + phraseLength + radius);
    let snippet = fullText.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < fullText.length) snippet = snippet + '...';
    return snippet;
  }

  // getSongDetail(songId)
  getSongDetail(songId) {
    const songs = this._getFromStorage('songs');
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');

    const song = songs.find((s) => s.id === songId) || null;
    const artist = song ? artists.find((a) => a.id === song.primaryArtistId) || null : null;
    const album = song && song.albumId ? albums.find((al) => al.id === song.albumId) || null : null;

    let sections = [];
    if (song && Array.isArray(song.lyricsStructure)) {
      sections = song.lyricsStructure.map((sec, index) => ({
        sectionType: sec.sectionType || sec.type || 'other',
        sectionIndex: typeof sec.sectionIndex === 'number' ? sec.sectionIndex : index,
        lines: Array.isArray(sec.lines) ? sec.lines : []
      }));
    }

    // Instrumentation for task completion tracking
    try {
      // Task 6: third track on a 2020 album
      if (
        song &&
        song.trackNumber === 3 &&
        song.albumId &&
        album &&
        album.releaseYear === 2020
      ) {
        localStorage.setItem('task6_thirdTrack2020SongId', String(songId));
      }

      // Task 7: opened top non-explicit English song from 2018
      if (
        song &&
        song.originalLanguage === 'english' &&
        song.releaseYear === 2018 &&
        song.isExplicit === false
      ) {
        let topSong = null;
        for (let i = 0; i < songs.length; i++) {
          const s = songs[i];
          if (
            s &&
            s.originalLanguage === 'english' &&
            s.releaseYear === 2018 &&
            s.isExplicit === false
          ) {
            if (
              !topSong ||
              (s.popularityScore || 0) > (topSong.popularityScore || 0)
            ) {
              topSong = s;
            }
          }
        }
        if (topSong && topSong.id === song.id) {
          localStorage.setItem(
            'task7_openedTop2018CleanEnglishSongId',
            String(songId)
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { song, artist, album, sections };
  }

  // getSongTranslations(songId, filters, sort)
  getSongTranslations(songId, filters, sort) {
    filters = filters || {};
    sort = sort || 'rating_desc';

    const translations = this._getFromStorage('translations');
    const songs = this._getFromStorage('songs');
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');

    const songsById = this._buildIndex(songs, 'id');
    const artistsById = this._buildIndex(artists, 'id');
    const albumsById = this._buildIndex(albums, 'id');
    const translationsById = this._buildIndex(translations, 'id');

    let list = translations.filter((t) => t.songId === songId);

    if (filters.translationLanguage) {
      list = list.filter((t) => t.translationLanguage === filters.translationLanguage);
    }
    if (typeof filters.minRating === 'number') {
      list = list.filter((t) => (t.rating || 0) >= filters.minRating);
    }
    if (typeof filters.minVotes === 'number') {
      list = list.filter((t) => (t.ratingVotes || 0) >= filters.minVotes);
    }

    if (sort === 'upvotes_desc') {
      list.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
    } else if (sort === 'created_at_desc') {
      list.sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
    } else {
      // rating_desc default
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const resolvedTranslations = list.map((t) =>
      this._resolveTranslationRelations(t, songsById, artistsById, albumsById, translationsById)
    );

    return {
      songId,
      translations: resolvedTranslations
    };
  }

  // getTranslationDetail(translationId)
  getTranslationDetail(translationId) {
    const translations = this._getFromStorage('translations');
    const songs = this._getFromStorage('songs');

    const translation = translations.find((t) => t.id === translationId) || null;
    const song = translation ? songs.find((s) => s.id === translation.songId) || null : null;

    let alignedSections = [];
    if (translation && song && Array.isArray(song.lyricsStructure)) {
      const originalLines = [];
      for (let i = 0; i < song.lyricsStructure.length; i++) {
        const sec = song.lyricsStructure[i];
        if (Array.isArray(sec.lines)) {
          for (let j = 0; j < sec.lines.length; j++) {
            originalLines.push(sec.lines[j]);
          }
        }
      }
      const translatedLines = (translation.text || '').split(/\r?\n/);
      alignedSections = [{
        sectionType: 'other',
        sectionIndex: 1,
        originalLines,
        translatedLines
      }];
    }

    return { translation, song, alignedSections };
  }

  // addTranslationToFavorites(translationId)
  addTranslationToFavorites(translationId) {
    const translations = this._getFromStorage('translations');
    const translation = translations.find((t) => t.id === translationId);
    if (!translation) {
      return { success: false, libraryItemId: null, message: 'Translation not found' };
    }

    let libraryItems = this._getOrCreateLibraryStore();

    const existing = libraryItems.find(
      (li) => li.itemType === 'favorite_translation' && li.translationId === translationId
    );
    if (existing) {
      return { success: true, libraryItemId: existing.id, message: 'Already in favorites' };
    }

    const now = new Date().toISOString();
    const libraryItemId = this._generateId('lib');
    const newItem = {
      id: libraryItemId,
      itemType: 'favorite_translation',
      songId: null,
      translationId,
      createdAt: now
    };

    libraryItems.push(newItem);
    this._saveToStorage('library_items', libraryItems);

    return { success: true, libraryItemId, message: 'Translation added to favorites' };
  }

  // removeFavoriteTranslation(translationId)
  removeFavoriteTranslation(translationId) {
    let libraryItems = this._getOrCreateLibraryStore();
    const before = libraryItems.length;
    libraryItems = libraryItems.filter(
      (li) => !(li.itemType === 'favorite_translation' && li.translationId === translationId)
    );
    this._saveToStorage('library_items', libraryItems);
    const removed = before !== libraryItems.length;
    return {
      success: removed,
      message: removed ? 'Favorite translation removed' : 'Favorite translation not found'
    };
  }

  // setTranslationAsDefault(translationId)
  setTranslationAsDefault(translationId) {
    const translations = this._getFromStorage('translations');
    const songs = this._getFromStorage('songs');

    const translation = translations.find((t) => t.id === translationId);
    if (!translation) {
      return { success: false, song: null, message: 'Translation not found' };
    }

    const songIndex = songs.findIndex((s) => s.id === translation.songId);
    if (songIndex === -1) {
      return { success: false, song: null, message: 'Parent song not found' };
    }

    const song = songs[songIndex];
    song.defaultTranslationId = translationId;
    songs[songIndex] = song;
    this._saveToStorage('songs', songs);

    return { success: true, song, message: 'Default translation updated' };
  }

  // getPlaylistsOverview()
  getPlaylistsOverview() {
    const playlists = this._getFromStorage('playlists');
    const playlistSongs = this._getFromStorage('playlist_songs');

    const counts = {};
    for (let i = 0; i < playlistSongs.length; i++) {
      const ps = playlistSongs[i];
      counts[ps.playlistId] = (counts[ps.playlistId] || 0) + 1;
    }

    const updatedPlaylists = playlists.map((pl) => {
      const updated = Object.assign({}, pl);
      updated.songCount = counts[pl.id] || 0;
      return updated;
    });

    // Also persist corrected counts
    this._saveToStorage('playlists', updatedPlaylists);

    return updatedPlaylists;
  }

  // createPlaylist(name, description)
  createPlaylist(name, description) {
    if (!name || typeof name !== 'string') {
      return { playlist: null, message: 'Playlist name is required' };
    }

    const { playlists } = this._getOrCreatePlaylistsStore();
    const now = new Date().toISOString();
    const playlist = {
      id: this._generateId('pl'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now,
      songCount: 0
    };

    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    return { playlist, message: 'Playlist created' };
  }

  // renamePlaylist(playlistId, newName)
  renamePlaylist(playlistId, newName) {
    const playlists = this._getFromStorage('playlists');
    const idx = playlists.findIndex((pl) => pl.id === playlistId);
    if (idx === -1) {
      return { playlist: null, success: false, message: 'Playlist not found' };
    }
    if (!newName || typeof newName !== 'string') {
      return { playlist: playlists[idx], success: false, message: 'New name is required' };
    }

    playlists[idx].name = newName;
    playlists[idx].updatedAt = new Date().toISOString();
    this._saveToStorage('playlists', playlists);

    return { playlist: playlists[idx], success: true, message: 'Playlist renamed' };
  }

  // deletePlaylist(playlistId)
  deletePlaylist(playlistId) {
    let playlists = this._getFromStorage('playlists');
    let playlistSongs = this._getFromStorage('playlist_songs');

    const before = playlists.length;
    playlists = playlists.filter((pl) => pl.id !== playlistId);
    playlistSongs = playlistSongs.filter((ps) => ps.playlistId !== playlistId);

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_songs', playlistSongs);

    const removed = playlists.length !== before;
    return {
      success: removed,
      message: removed ? 'Playlist deleted' : 'Playlist not found'
    };
  }

  // getPlaylistDetail(playlistId)
  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlistSongs = this._getFromStorage('playlist_songs');
    const songs = this._getFromStorage('songs');
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');
    const translations = this._getFromStorage('translations');

    const playlist = playlists.find((pl) => pl.id === playlistId) || null;
    if (!playlist) {
      return { playlist: null, songs: [] };
    }

    const artistsById = this._buildIndex(artists, 'id');
    const albumsById = this._buildIndex(albums, 'id');
    const translationsById = this._buildIndex(translations, 'id');
    const songsById = this._buildIndex(songs, 'id');

    const items = playlistSongs
      .filter((ps) => ps.playlistId === playlistId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      .map((ps) => ({
        playlistSongId: ps.id,
        orderIndex: ps.orderIndex,
        addedAt: ps.addedAt,
        song: this._resolveSongRelations(songsById[ps.songId], artistsById, albumsById, translationsById)
      }));

    return { playlist, songs: items };
  }

  // addSongToPlaylist(songId, playlistId)
  addSongToPlaylist(songId, playlistId) {
    const playlists = this._getFromStorage('playlists');
    const songs = this._getFromStorage('songs');
    let playlistSongs = this._getFromStorage('playlist_songs');

    const playlist = playlists.find((pl) => pl.id === playlistId) || null;
    if (!playlist) {
      return { playlistSong: null, playlist: null, success: false, message: 'Playlist not found' };
    }

    const song = songs.find((s) => s.id === songId) || null;
    if (!song) {
      return { playlistSong: null, playlist, success: false, message: 'Song not found' };
    }

    const existingForPlaylist = playlistSongs.filter((ps) => ps.playlistId === playlistId);
    const orderIndex = existingForPlaylist.length;
    const now = new Date().toISOString();

    const playlistSong = {
      id: this._generateId('pls'),
      playlistId,
      songId,
      orderIndex,
      addedAt: now
    };

    playlistSongs.push(playlistSong);

    // Update playlist songCount and updatedAt
    const plIndex = playlists.findIndex((pl) => pl.id === playlistId);
    if (plIndex !== -1) {
      playlists[plIndex].songCount = (playlists[plIndex].songCount || 0) + 1;
      playlists[plIndex].updatedAt = now;
    }

    this._saveToStorage('playlist_songs', playlistSongs);
    this._saveToStorage('playlists', playlists);

    return { playlistSong, playlist: playlists[plIndex], success: true, message: 'Song added to playlist' };
  }

  // removeSongFromPlaylist(playlistSongId)
  removeSongFromPlaylist(playlistSongId) {
    const playlists = this._getFromStorage('playlists');
    let playlistSongs = this._getFromStorage('playlist_songs');

    const psIndex = playlistSongs.findIndex((ps) => ps.id === playlistSongId);
    if (psIndex === -1) {
      return { success: false, playlist: null, message: 'Playlist-song relation not found' };
    }

    const playlistId = playlistSongs[psIndex].playlistId;
    playlistSongs.splice(psIndex, 1);

    // Reindex order for this playlist
    const related = playlistSongs
      .filter((ps) => ps.playlistId === playlistId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    for (let i = 0; i < related.length; i++) {
      related[i].orderIndex = i;
    }

    // Merge back updated related items
    playlistSongs = playlistSongs.map((ps) => {
      if (ps.playlistId !== playlistId) return ps;
      const updated = related.find((r) => r.id === ps.id);
      return updated || ps;
    });

    const now = new Date().toISOString();
    const plIndex = playlists.findIndex((pl) => pl.id === playlistId);
    if (plIndex !== -1) {
      const count = playlistSongs.filter((ps) => ps.playlistId === playlistId).length;
      playlists[plIndex].songCount = count;
      playlists[plIndex].updatedAt = now;
    }

    this._saveToStorage('playlist_songs', playlistSongs);
    this._saveToStorage('playlists', playlists);

    return {
      success: true,
      playlist: plIndex !== -1 ? playlists[plIndex] : null,
      message: 'Song removed from playlist'
    };
  }

  // reorderPlaylistSongs(playlistId, orderedPlaylistSongIds)
  reorderPlaylistSongs(playlistId, orderedPlaylistSongIds) {
    let playlistSongs = this._getFromStorage('playlist_songs');
    const playlists = this._getFromStorage('playlists');

    const playlist = playlists.find((pl) => pl.id === playlistId) || null;
    if (!playlist) {
      return { playlist: null, songs: [], success: false };
    }

    const idSet = new Set(orderedPlaylistSongIds || []);
    const related = playlistSongs.filter((ps) => ps.playlistId === playlistId);

    if (related.length !== idSet.size) {
      // IDs mismatch; do not modify
      return { playlist, songs: related, success: false };
    }

    const byId = this._buildIndex(related, 'id');
    const reordered = [];
    for (let i = 0; i < orderedPlaylistSongIds.length; i++) {
      const id = orderedPlaylistSongIds[i];
      const ps = byId[id];
      if (!ps) {
        return { playlist, songs: related, success: false };
      }
      ps.orderIndex = i;
      reordered.push(ps);
    }

    playlistSongs = playlistSongs.map((ps) => {
      if (ps.playlistId !== playlistId) return ps;
      const updated = byId[ps.id];
      return updated || ps;
    });

    this._saveToStorage('playlist_songs', playlistSongs);

    return { playlist, songs: reordered, success: true };
  }

  // clearPlaylist(playlistId)
  clearPlaylist(playlistId) {
    const playlists = this._getFromStorage('playlists');
    let playlistSongs = this._getFromStorage('playlist_songs');

    const plIndex = playlists.findIndex((pl) => pl.id === playlistId);
    if (plIndex === -1) {
      return { playlist: null, success: false, message: 'Playlist not found' };
    }

    playlistSongs = playlistSongs.filter((ps) => ps.playlistId !== playlistId);
    playlists[plIndex].songCount = 0;
    playlists[plIndex].updatedAt = new Date().toISOString();

    this._saveToStorage('playlist_songs', playlistSongs);
    this._saveToStorage('playlists', playlists);

    return { playlist: playlists[plIndex], success: true, message: 'Playlist cleared' };
  }

  // bookmarkSong(songId)
  bookmarkSong(songId) {
    const songs = this._getFromStorage('songs');
    const song = songs.find((s) => s.id === songId) || null;
    if (!song) {
      return { libraryItemId: null, success: false, message: 'Song not found' };
    }

    let libraryItems = this._getOrCreateLibraryStore();

    const existing = libraryItems.find(
      (li) => li.itemType === 'bookmarked_song' && li.songId === songId
    );
    if (existing) {
      return {
        libraryItemId: existing.id,
        success: true,
        message: 'Song already bookmarked'
      };
    }

    const now = new Date().toISOString();
    const id = this._generateId('lib');
    const item = {
      id,
      itemType: 'bookmarked_song',
      songId,
      translationId: null,
      createdAt: now
    };

    libraryItems.push(item);
    this._saveToStorage('library_items', libraryItems);

    return { libraryItemId: id, success: true, message: 'Song bookmarked' };
  }

  // unbookmarkSong(songId)
  unbookmarkSong(songId) {
    let libraryItems = this._getOrCreateLibraryStore();
    const before = libraryItems.length;
    libraryItems = libraryItems.filter(
      (li) => !(li.itemType === 'bookmarked_song' && li.songId === songId)
    );
    this._saveToStorage('library_items', libraryItems);
    const removed = before !== libraryItems.length;
    return {
      success: removed,
      message: removed ? 'Bookmark removed' : 'Bookmark not found'
    };
  }

  // getLibraryItems(filters)
  getLibraryItems(filters) {
    filters = filters || {};
    const items = this._getOrCreateLibraryStore();
    const songs = this._getFromStorage('songs');
    const translations = this._getFromStorage('translations');
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');

    const songsById = this._buildIndex(songs, 'id');
    const translationsById = this._buildIndex(translations, 'id');
    const artistsById = this._buildIndex(artists, 'id');
    const albumsById = this._buildIndex(albums, 'id');

    const settings = this._getOrCreateSettingsRecord();

    let resultItems = items.slice();

    if (filters.itemType) {
      resultItems = resultItems.filter((li) => li.itemType === filters.itemType);
    }

    const enriched = [];
    for (let i = 0; i < resultItems.length; i++) {
      const li = resultItems[i];
      let song = null;
      let translation = null;

      if (li.songId) {
        song = songsById[li.songId] || null;
      }
      if (li.translationId) {
        translation = translationsById[li.translationId] || null;
        if (translation && translation.songId) {
          song = songsById[translation.songId] || song;
        }
      }

      // Global explicit filter on songs
      if (song && !settings.showExplicitLyrics && song.isExplicit) {
        continue; // skip this item entirely
      }

      // Additional filters
      if (filters.originalLanguage && song && song.originalLanguage !== filters.originalLanguage) {
        continue;
      }
      if (filters.genre && song && song.genre !== filters.genre) {
        continue;
      }
      if (filters.translationLanguage && translation && translation.translationLanguage !== filters.translationLanguage) {
        continue;
      }
      if (filters.translationLanguage && !translation && li.itemType === 'favorite_translation') {
        continue;
      }

      const resolvedSong = song
        ? this._resolveSongRelations(song, artistsById, albumsById, translationsById)
        : null;

      const resolvedTranslation = translation
        ? this._resolveTranslationRelations(translation, songsById, artistsById, albumsById, translationsById)
        : null;

      enriched.push({
        libraryItemId: li.id,
        itemType: li.itemType,
        createdAt: li.createdAt,
        song: resolvedSong,
        translation: resolvedTranslation
      });
    }

    return { items: enriched };
  }

  // getVocabularyListsOverview()
  getVocabularyListsOverview() {
    const { lists, entries } = this._getOrCreateVocabularyStore();

    // Ensure wordCount is consistent
    const counts = {};
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      counts[e.listId] = (counts[e.listId] || 0) + 1;
    }

    const updatedLists = lists.map((l) => {
      const updated = Object.assign({}, l);
      updated.wordCount = counts[l.id] || 0;
      return updated;
    });

    this._saveToStorage('vocabulary_lists', updatedLists);

    return updatedLists;
  }

  // getVocabularyListDetail(listId)
  getVocabularyListDetail(listId) {
    const { lists, entries } = this._getOrCreateVocabularyStore();
    const songs = this._getFromStorage('songs');
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');
    const translations = this._getFromStorage('translations');

    const list = lists.find((l) => l.id === listId) || null;
    if (!list) {
      return { list: null, entries: [] };
    }

    const songsById = this._buildIndex(songs, 'id');
    const artistsById = this._buildIndex(artists, 'id');
    const albumsById = this._buildIndex(albums, 'id');
    const translationsById = this._buildIndex(translations, 'id');

    const listEntries = entries.filter((e) => e.listId === listId).map((e) => {
      const song = songsById[e.songId] || null;
      const resolvedSong = song
        ? this._resolveSongRelations(song, artistsById, albumsById, translationsById)
        : null;
      const entry = Object.assign({}, e);
      entry.song = resolvedSong;
      return entry;
    });

    return { list, entries: listEntries };
  }

  // createVocabularyList(name, language, description)
  createVocabularyList(name, language, description) {
    if (!name || !language) {
      return { list: null, message: 'Name and language are required' };
    }

    const { lists } = this._getOrCreateVocabularyStore();
    const now = new Date().toISOString();
    const list = {
      id: this._generateId('vlist'),
      name,
      language,
      description: description || '',
      createdAt: now,
      updatedAt: now,
      wordCount: 0
    };

    lists.push(list);
    this._saveToStorage('vocabulary_lists', lists);

    return { list, message: 'Vocabulary list created' };
  }

  // renameVocabularyList(listId, newName)
  renameVocabularyList(listId, newName) {
    const { lists } = this._getOrCreateVocabularyStore();
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx === -1) {
      return { list: null, success: false, message: 'List not found' };
    }
    if (!newName) {
      return { list: lists[idx], success: false, message: 'New name is required' };
    }

    lists[idx].name = newName;
    lists[idx].updatedAt = new Date().toISOString();
    this._saveToStorage('vocabulary_lists', lists);

    return { list: lists[idx], success: true, message: 'List renamed' };
  }

  // deleteVocabularyList(listId)
  deleteVocabularyList(listId) {
    let { lists, entries } = this._getOrCreateVocabularyStore();

    const before = lists.length;
    lists = lists.filter((l) => l.id !== listId);
    entries = entries.filter((e) => e.listId !== listId);

    this._saveToStorage('vocabulary_lists', lists);
    this._saveToStorage('vocabulary_entries', entries);

    const removed = before !== lists.length;
    return { success: removed, message: removed ? 'List deleted' : 'List not found' };
  }

  // addWordToVocabularyList(listId, songId, wordText, translationText, notes, sectionType, sectionIndex, lineIndex, wordIndex)
  addWordToVocabularyList(listId, songId, wordText, translationText, notes, sectionType, sectionIndex, lineIndex, wordIndex) {
    const { lists, entries } = this._getOrCreateVocabularyStore();
    const songs = this._getFromStorage('songs');

    const list = lists.find((l) => l.id === listId) || null;
    if (!list) {
      return { entry: null, list: null, success: false };
    }

    const song = songs.find((s) => s.id === songId) || null;
    if (!song) {
      return { entry: null, list, success: false };
    }

    if (!wordText) {
      return { entry: null, list, success: false };
    }

    const now = new Date().toISOString();
    const entry = {
      id: this._generateId('ventry'),
      listId,
      songId,
      wordText,
      translationText: translationText || '',
      notes: notes || '',
      sectionType: sectionType || null,
      sectionIndex: typeof sectionIndex === 'number' ? sectionIndex : null,
      lineIndex: typeof lineIndex === 'number' ? lineIndex : null,
      wordIndex: typeof wordIndex === 'number' ? wordIndex : null,
      addedAt: now
    };

    entries.push(entry);

    const listIndex = lists.findIndex((l) => l.id === listId);
    if (listIndex !== -1) {
      lists[listIndex].wordCount = (lists[listIndex].wordCount || 0) + 1;
      lists[listIndex].updatedAt = now;
    }

    this._saveToStorage('vocabulary_entries', entries);
    this._saveToStorage('vocabulary_lists', lists);

    return { entry, list: lists[listIndex], success: true };
  }

  // removeVocabularyEntry(entryId)
  removeVocabularyEntry(entryId) {
    const { lists, entries } = this._getOrCreateVocabularyStore();

    const entryIndex = entries.findIndex((e) => e.id === entryId);
    if (entryIndex === -1) {
      return { success: false, message: 'Entry not found' };
    }

    const entry = entries[entryIndex];
    entries.splice(entryIndex, 1);

    const listIndex = lists.findIndex((l) => l.id === entry.listId);
    if (listIndex !== -1) {
      lists[listIndex].wordCount = Math.max(0, (lists[listIndex].wordCount || 0) - 1);
      lists[listIndex].updatedAt = new Date().toISOString();
    }

    this._saveToStorage('vocabulary_entries', entries);
    this._saveToStorage('vocabulary_lists', lists);

    return { success: true, message: 'Entry removed' };
  }

  // markVocabularyEntryReviewed(entryId)
  markVocabularyEntryReviewed(entryId) {
    const { lists, entries } = this._getOrCreateVocabularyStore();

    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) {
      return { entry: null, success: false };
    }

    const now = new Date().toISOString();
    const entry = entries[idx];
    entry.reviewedAt = now; // extra field for study tracking
    entries[idx] = entry;

    this._saveToStorage('vocabulary_entries', entries);
    this._saveToStorage('vocabulary_lists', lists);

    return { entry, success: true };
  }

  // listArtists(searchTerm, filters, sort, page, pageSize)
  listArtists(searchTerm, filters, sort, page, pageSize) {
    searchTerm = typeof searchTerm === 'string' ? searchTerm.trim() : '';
    filters = filters || {};
    sort = sort || 'name_asc';
    page = page && page > 0 ? page : 1;
    pageSize = pageSize && pageSize > 0 ? pageSize : 50;

    const artists = this._getFromStorage('artists');

    let results = artists.slice();

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      results = results.filter((a) => (a.name || '').toLowerCase().indexOf(q) !== -1);
    }

    if (filters.primaryLanguage) {
      results = results.filter((a) => a.primaryLanguage === filters.primaryLanguage);
    }

    if (sort === 'popularity_desc') {
      results.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    } else {
      // name_asc
      results.sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    const totalCount = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return { results: paged, totalCount };
  }

  // getArtistDetail(artistId)
  getArtistDetail(artistId) {
    const artists = this._getFromStorage('artists');
    const albums = this._getFromStorage('albums');
    const songs = this._getFromStorage('songs');

    const artist = artists.find((a) => a.id === artistId) || null;
    if (!artist) {
      return { artist: null, albums: [], topSongs: [] };
    }

    const artistAlbums = albums.filter((al) => al.artistId === artist.id);
    const artistSongs = songs.filter((s) => s.primaryArtistId === artist.id);
    artistSongs.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    const topSongs = artistSongs.slice(0, 20);

    return { artist, albums: artistAlbums, topSongs };
  }

  // getAlbumDetail(albumId)
  getAlbumDetail(albumId) {
    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');
    const songs = this._getFromStorage('songs');

    const album = albums.find((al) => al.id === albumId) || null;
    if (!album) {
      return { album: null, artist: null, tracks: [] };
    }

    const artist = artists.find((a) => a.id === album.artistId) || null;
    const tracks = songs
      .filter((s) => s.albumId === album.id)
      .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

    return { album, artist, tracks };
  }

  // searchAlbums(query, page, pageSize)
  searchAlbums(query, page, pageSize) {
    query = typeof query === 'string' ? query.trim() : '';
    page = page && page > 0 ? page : 1;
    pageSize = pageSize && pageSize > 0 ? pageSize : 20;

    const albums = this._getFromStorage('albums');
    const artists = this._getFromStorage('artists');
    const artistsById = this._buildIndex(artists, 'id');

    let results = albums.slice();

    if (query) {
      const q = query.toLowerCase();
      results = results.filter((al) => {
        const artist = artistsById[al.artistId];
        const albumTitle = (al.title || '').toLowerCase();
        const artistName = ((artist && artist.name) || '').toLowerCase();
        return albumTitle.indexOf(q) !== -1 || artistName.indexOf(q) !== -1;
      });
    }

    results.sort((a, b) => {
      const ta = (a.title || '').toLowerCase();
      const tb = (b.title || '').toLowerCase();
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });

    const totalCount = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return { results: paged, totalCount };
  }

  // getSettings()
  getSettings() {
    return this._getOrCreateSettingsRecord();
  }

  // updateSettings(settingsPatch)
  updateSettings(settingsPatch) {
    settingsPatch = settingsPatch || {};
    const settings = this._getOrCreateSettingsRecord();

    if (typeof settingsPatch.showExplicitLyrics === 'boolean') {
      settings.showExplicitLyrics = settingsPatch.showExplicitLyrics;
    }
    if (typeof settingsPatch.defaultOriginalLanguage === 'string') {
      settings.defaultOriginalLanguage = settingsPatch.defaultOriginalLanguage;
    }
    if (typeof settingsPatch.defaultTranslationLanguage === 'string') {
      settings.defaultTranslationLanguage = settingsPatch.defaultTranslationLanguage;
    }
    if (typeof settingsPatch.defaultDisplayMode === 'string') {
      settings.defaultDisplayMode = settingsPatch.defaultDisplayMode;
    }
    if (typeof settingsPatch.defaultTextSize === 'string') {
      settings.defaultTextSize = settingsPatch.defaultTextSize;
    }

    settings.updatedAt = new Date().toISOString();
    this._saveSettingsRecord(settings);

    return settings;
  }

  // getSongAnnotations(songId)
  getSongAnnotations(songId) {
    const annotations = this._getOrCreateAnnotationsStore();
    const songs = this._getFromStorage('songs');
    const song = songs.find((s) => s.id === songId) || null;

    const results = annotations.filter((a) => a.songId === songId).map((a) => {
      const ann = Object.assign({}, a);
      ann.song = song || null;
      return ann;
    });

    return results;
  }

  // addAnnotation(songId, sectionType, sectionIndex, lineIndex, text)
  addAnnotation(songId, sectionType, sectionIndex, lineIndex, text) {
    if (!songId || !sectionType || typeof sectionIndex !== 'number' || typeof lineIndex !== 'number' || !text) {
      return { annotation: null, success: false };
    }

    const songs = this._getFromStorage('songs');
    const song = songs.find((s) => s.id === songId) || null;
    if (!song) {
      return { annotation: null, success: false };
    }

    const annotations = this._getOrCreateAnnotationsStore();
    const now = new Date().toISOString();
    const annotation = {
      id: this._generateId('ann'),
      songId,
      sectionType,
      sectionIndex,
      lineIndex,
      text,
      createdAt: now
    };

    annotations.push(annotation);
    this._saveToStorage('annotations', annotations);

    return { annotation, success: true };
  }

  // getAboutContent()
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        return {
          html: obj.html || '',
          lastUpdated: obj.lastUpdated || ''
        };
      } catch (e) {}
    }
    // Default empty content if none in storage
    return { html: '', lastUpdated: '' };
  }

  // getHelpArticles()
  getHelpArticles() {
    const articles = this._getFromStorage('help_articles');
    return { articles: Array.isArray(articles) ? articles : [] };
  }

  // getHelpArticleDetail(slug)
  getHelpArticleDetail(slug) {
    const articles = this._getFromStorage('help_articles');
    const article = articles.find((a) => a.slug === slug || a.id === slug) || null;
    if (!article) {
      return { id: '', slug, title: '', html: '' };
    }
    return {
      id: article.id || '',
      slug: article.slug || slug,
      title: article.title || '',
      html: article.html || ''
    };
  }

  // getFaqEntries()
  getFaqEntries() {
    const entries = this._getFromStorage('faq_entries');
    return Array.isArray(entries) ? entries : [];
  }

  // submitContactMessage(name, email, messageType, messageBody)
  submitContactMessage(name, email, messageType, messageBody) {
    if (!name || !email || !messageType || !messageBody) {
      return { success: false, messageId: null, message: 'All fields are required' };
    }

    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('msg');
    const now = new Date().toISOString();
    const msg = {
      id,
      name,
      email,
      messageType,
      messageBody,
      createdAt: now
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return { success: true, messageId: id, message: 'Message submitted' };
  }

  // getLegalContent(documentType)
  getLegalContent(documentType) {
    const docs = this._getFromStorage('legal_content');
    const doc = docs.find((d) => d.documentType === documentType) || null;
    if (!doc) {
      return {
        documentType,
        html: '',
        lastUpdated: ''
      };
    }
    return {
      documentType: doc.documentType,
      html: doc.html || '',
      lastUpdated: doc.lastUpdated || ''
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
