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
    const keys = [
      'photos',
      'albums',
      'album_photos',
      'collections',
      'collection_photos',
      'trips',
      'trip_days',
      'trip_day_photos',
      'slideshows',
      'slideshow_photos',
      'people',
      'photo_person_tags',
      'tags',
      'photo_tags',
      'album_comments',
      'about_content',
      'help_content'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        // about_content and help_content will be objects, others arrays
        if (key === 'about_content') {
          localStorage.setItem(key, JSON.stringify({
            title: 'About This Travel Gallery',
            bodyHtml: '<p>Welcome to my personal travel photo gallery. This default about text can be edited by the site owner in a real application.</p>',
            contactEmail: 'me@example.com',
            socialLinks: []
          }));
        } else if (key === 'help_content') {
          localStorage.setItem(key, JSON.stringify({
            sections: [],
            faq: []
          }));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _dateOnlyString(value) {
    const d = this._parseDate(value);
    if (!d) return null;
    return d.toISOString().slice(0, 10);
  }

  _compareByDate(a, b, field, direction) {
    const da = this._parseDate(a[field]);
    const db = this._parseDate(b[field]);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    if (ta === tb) return 0;
    return direction === 'asc' ? (ta - tb) : (tb - ta);
  }

  // -------------------------
  // Helper functions required
  // -------------------------

  // Internal helper to translate filter and sort parameters into a database query for photos.
  _applyPhotoFiltersAndSort(photos, filters, sort) {
    let result = Array.isArray(photos) ? photos.slice() : [];

    const allPhotoTags = this._getFromStorage('photo_tags');
    const allTags = this._getFromStorage('tags');
    const allPersonTags = this._getFromStorage('photo_person_tags');

    filters = filters || {};

    if (filters.region) {
      result = result.filter(p => p.region === filters.region);
    }

    if (filters.country) {
      result = result.filter(p => p.country === filters.country);
    }

    if (filters.city) {
      result = result.filter(p => p.city === filters.city);
    }

    if (filters.dateFrom) {
      const from = this._parseDate(filters.dateFrom);
      if (from) {
        const ft = from.getTime();
        result = result.filter(p => {
          const d = this._parseDate(p.captureDate);
          return d && d.getTime() >= ft;
        });
      }
    }

    if (filters.dateTo) {
      const to = this._parseDate(filters.dateTo);
      if (to) {
        const tt = to.getTime();
        result = result.filter(p => {
          const d = this._parseDate(p.captureDate);
          return d && d.getTime() <= tt;
        });
      }
    }

    if (typeof filters.favoritesOnly === 'boolean' && filters.favoritesOnly) {
      result = result.filter(p => !!p.isFavorite);
    }

    if (typeof filters.minRating === 'number') {
      result = result.filter(p => typeof p.rating === 'number' && p.rating >= filters.minRating);
    }

    if (filters.tagIds && Array.isArray(filters.tagIds) && filters.tagIds.length > 0) {
      const tagIdSet = new Set(filters.tagIds);
      const photoToTagIds = new Map();
      for (let i = 0; i < allPhotoTags.length; i++) {
        const pt = allPhotoTags[i];
        if (!photoToTagIds.has(pt.photoId)) {
          photoToTagIds.set(pt.photoId, []);
        }
        photoToTagIds.get(pt.photoId).push(pt.tagId);
      }
      result = result.filter(p => {
        const tagIdsForPhoto = photoToTagIds.get(p.id) || [];
        for (let j = 0; j < tagIdsForPhoto.length; j++) {
          if (tagIdSet.has(tagIdsForPhoto[j])) {
            return true;
          }
        }
        return false;
      });
    }

    if (filters.personIds && Array.isArray(filters.personIds) && filters.personIds.length > 0) {
      const personIdSet = new Set(filters.personIds);
      const photoToPersonIds = new Map();
      for (let i = 0; i < allPersonTags.length; i++) {
        const pt = allPersonTags[i];
        if (!photoToPersonIds.has(pt.photoId)) {
          photoToPersonIds.set(pt.photoId, []);
        }
        photoToPersonIds.get(pt.photoId).push(pt.personId);
      }
      result = result.filter(p => {
        const personsForPhoto = photoToPersonIds.get(p.id) || [];
        for (let j = 0; j < personsForPhoto.length; j++) {
          if (personIdSet.has(personsForPhoto[j])) {
            return true;
          }
        }
        return false;
      });
    }

    // Sorting
    switch (sort) {
      case 'date_taken_oldest':
        result.sort((a, b) => this._compareByDate(a, b, 'captureDate', 'asc'));
        break;
      case 'date_taken_newest':
        result.sort((a, b) => this._compareByDate(a, b, 'captureDate', 'desc'));
        break;
      case 'likes_high_to_low': {
        result.sort((a, b) => {
          const la = typeof a.likesCount === 'number' ? a.likesCount : 0;
          const lb = typeof b.likesCount === 'number' ? b.likesCount : 0;
          return lb - la;
        });
        break;
      }
      case 'rating_high_to_low':
        result.sort((a, b) => {
          const ra = typeof a.rating === 'number' ? a.rating : 0;
          const rb = typeof b.rating === 'number' ? b.rating : 0;
          if (rb === ra) {
            return this._compareByDate(a, b, 'captureDate', 'desc');
          }
          return rb - ra;
        });
        break;
      default:
        // default: newest captureDate first
        result.sort((a, b) => this._compareByDate(a, b, 'captureDate', 'desc'));
        break;
    }

    return result;
  }

  // Internal helper to apply privacy, showOnProfile, and showOnHomepage flags consistently to albums.
  _updateAlbumVisibilityFlags(album, options) {
    if (!album || !options) return album;
    if (typeof options.privacy === 'string') {
      album.privacy = options.privacy; // 'public' or 'private'
    }
    if (typeof options.showOnProfile === 'boolean') {
      album.showOnProfile = options.showOnProfile;
    }
    if (typeof options.showOnHomepage === 'boolean') {
      album.showOnHomepage = options.showOnHomepage;
    }
    album.updatedAt = new Date().toISOString();
    return album;
  }

  // Internal helper to pick a reasonable cover photo for a collection when photos change.
  _recalculateCollectionCoverPhoto(collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionPhotos = this._getFromStorage('collection_photos');

    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return null;

    const related = collectionPhotos.filter(cp => cp.collectionId === collectionId);
    if (related.length === 0) {
      collection.coverPhotoId = undefined;
    } else {
      // sort by position asc, fallback by dateAdded
      related.sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        if (pa !== pb) return pa - pb;
        const da = this._parseDate(a.dateAdded);
        const db = this._parseDate(b.dateAdded);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return ta - tb;
      });
      collection.coverPhotoId = related[0].photoId;
    }

    collection.updatedAt = new Date().toISOString();
    this._saveToStorage('collections', collections);
    return collection;
  }

  // Internal helper to update TripDay.position fields based on a provided ordering.
  _resequenceTripDays(tripId, dayOrder) {
    const tripDays = this._getFromStorage('trip_days');
    const idToDesiredPos = new Map();
    if (Array.isArray(dayOrder)) {
      for (let i = 0; i < dayOrder.length; i++) {
        idToDesiredPos.set(dayOrder[i], i + 1);
      }
    }

    let changed = false;
    const relevant = [];

    for (let i = 0; i < tripDays.length; i++) {
      const day = tripDays[i];
      if (day.tripId !== tripId) continue;
      if (idToDesiredPos.has(day.id)) {
        const newPos = idToDesiredPos.get(day.id);
        if (day.position !== newPos) {
          day.position = newPos;
          changed = true;
        }
      }
      relevant.push(day);
    }

    if (changed) {
      this._saveToStorage('trip_days', tripDays);
    }

    relevant.sort((a, b) => {
      const pa = typeof a.position === 'number' ? a.position : 0;
      const pb = typeof b.position === 'number' ? b.position : 0;
      return pa - pb;
    });

    return relevant;
  }

  // Helper: resolve album coverPhotoId to coverPhoto
  _augmentAlbumWithCoverPhoto(album, photos) {
    if (!album) return null;
    const photosArr = photos || this._getFromStorage('photos');
    const cover = album.coverPhotoId ? photosArr.find(p => p.id === album.coverPhotoId) : null;
    return Object.assign({}, album, { coverPhoto: cover || null });
  }

  // Helper: resolve collection coverPhotoId to coverPhoto
  _augmentCollectionWithCoverPhoto(collection, photos) {
    if (!collection) return null;
    const photosArr = photos || this._getFromStorage('photos');
    const cover = collection.coverPhotoId ? photosArr.find(p => p.id === collection.coverPhotoId) : null;
    return Object.assign({}, collection, { coverPhoto: cover || null });
  }

  // Helper: resolve trip coverPhotoId to coverPhoto
  _augmentTripWithCoverPhoto(trip, photos) {
    if (!trip) return null;
    const photosArr = photos || this._getFromStorage('photos');
    const cover = trip.coverPhotoId ? photosArr.find(p => p.id === trip.coverPhotoId) : null;
    return Object.assign({}, trip, { coverPhoto: cover || null });
  }

  // Helper: augment Person with avatarPhoto
  _augmentPersonWithAvatar(person, photos) {
    if (!person) return null;
    const photosArr = photos || this._getFromStorage('photos');
    const avatar = person.avatarPhotoId ? photosArr.find(p => p.id === person.avatarPhotoId) : null;
    return Object.assign({}, person, { avatarPhoto: avatar || null });
  }

  // -------------------------
  // Core interface implementations
  // -------------------------

  // getHomeOverview(): { recentAlbums, favoritePhotos, pinnedTrips }
  getHomeOverview() {
    const albums = this._getFromStorage('albums');
    const photos = this._getFromStorage('photos');
    const trips = this._getFromStorage('trips');

    const recentAlbumsRaw = albums.slice().sort((a, b) => this._compareByDate(a, b, 'createdAt', 'desc')).slice(0, 6);
    const recentAlbums = recentAlbumsRaw.map(a => this._augmentAlbumWithCoverPhoto(a, photos));

    const favoritePhotos = photos
      .filter(p => !!p.isFavorite)
      .sort((a, b) => this._compareByDate(a, b, 'uploadDate', 'desc'))
      .slice(0, 12);

    const pinnedTripsRaw = trips.filter(t => !!t.pinnedToProfile)
      .sort((a, b) => this._compareByDate(a, b, 'updatedAt', 'desc'));
    const pinnedTrips = pinnedTripsRaw.map(t => this._augmentTripWithCoverPhoto(t, photos));

    return {
      recentAlbums: recentAlbums,
      favoritePhotos: favoritePhotos,
      pinnedTrips: pinnedTrips
    };
  }

  // createAlbum(title, description, year, startDate, endDate, mainCountry, mainCity, privacy, showOnProfile, showOnHomepage)
  createAlbum(title, description, year, startDate, endDate, mainCountry, mainCity, privacy, showOnProfile, showOnHomepage) {
    const now = new Date().toISOString();
    if (!title || typeof title !== 'string') {
      return { album: null, success: false, message: 'Album title is required.' };
    }

    const albums = this._getFromStorage('albums');

    const album = {
      id: this._generateId('alb'),
      title: title,
      description: description || '',
      coverPhotoId: undefined,
      createdAt: now,
      updatedAt: now,
      year: typeof year === 'number' ? year : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      mainCountry: mainCountry || undefined,
      mainCity: mainCity || undefined,
      privacy: privacy || 'public',
      showOnProfile: typeof showOnProfile === 'boolean' ? showOnProfile : true,
      showOnHomepage: typeof showOnHomepage === 'boolean' ? showOnHomepage : true
    };

    albums.push(album);
    this._saveToStorage('albums', albums);

    return { album: this._augmentAlbumWithCoverPhoto(album), success: true, message: 'Album created.' };
  }

  // getAlbumFilterOptions()
  getAlbumFilterOptions() {
    const albums = this._getFromStorage('albums');

    const yearsSet = new Set();
    const countriesSet = new Set();

    for (let i = 0; i < albums.length; i++) {
      const a = albums[i];
      if (typeof a.year === 'number') yearsSet.add(a.year);
      if (a.mainCountry) countriesSet.add(a.mainCountry);
    }

    const years = Array.from(yearsSet).sort((a, b) => a - b);
    const countries = Array.from(countriesSet).sort();

    const privacyOptions = [
      { value: 'public', label: 'Public' },
      { value: 'private', label: 'Private' }
    ];

    return {
      years: years,
      countries: countries,
      privacyOptions: privacyOptions
    };
  }

  // getAlbums(filters, sort, page, pageSize)
  getAlbums(filters, sort, page, pageSize) {
    const albums = this._getFromStorage('albums');
    const photos = this._getFromStorage('photos');

    filters = filters || {};
    let result = albums.slice();

    // Year filtering
    if (typeof filters.yearFrom === 'number' || typeof filters.yearTo === 'number') {
      const yearMode = filters.yearMode || 'range';
      const from = typeof filters.yearFrom === 'number' ? filters.yearFrom : undefined;
      const to = typeof filters.yearTo === 'number' ? filters.yearTo : undefined;

      result = result.filter(a => {
        if (typeof a.year !== 'number') return false;
        if (yearMode === 'exact') {
          if (typeof from === 'number') return a.year === from;
          if (typeof to === 'number') return a.year === to;
          return true;
        } else if (yearMode === 'and_earlier') {
          if (typeof to === 'number') return a.year <= to;
          if (typeof from === 'number') return a.year <= from;
          return true;
        } else if (yearMode === 'and_later') {
          if (typeof from === 'number') return a.year >= from;
          if (typeof to === 'number') return a.year >= to;
          return true;
        } else {
          // 'range'
          if (typeof from === 'number' && a.year < from) return false;
          if (typeof to === 'number' && a.year > to) return false;
          return true;
        }
      });
    }

    if (filters.mainCountry) {
      result = result.filter(a => a.mainCountry === filters.mainCountry);
    }

    if (filters.privacy) {
      result = result.filter(a => a.privacy === filters.privacy);
    }

    if (filters.titleQuery && typeof filters.titleQuery === 'string') {
      const q = filters.titleQuery.toLowerCase();
      result = result.filter(a => (a.title || '').toLowerCase().indexOf(q) !== -1);
    }

    // Sorting
    switch (sort) {
      case 'created_at_newest':
        result.sort((a, b) => this._compareByDate(a, b, 'createdAt', 'desc'));
        break;
      case 'created_at_oldest':
        result.sort((a, b) => this._compareByDate(a, b, 'createdAt', 'asc'));
        break;
      case 'title_az':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title_za':
        result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      default:
        result.sort((a, b) => this._compareByDate(a, b, 'createdAt', 'desc'));
        break;
    }

    const totalCount = result.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 24;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const paged = result.slice(start, end).map(a => this._augmentAlbumWithCoverPhoto(a, photos));

    return { albums: paged, totalCount: totalCount };
  }

  // bulkUpdateAlbumPrivacy(albumIds, privacy, showOnProfile, showOnHomepage)
  bulkUpdateAlbumPrivacy(albumIds, privacy, showOnProfile, showOnHomepage) {
    if (!Array.isArray(albumIds) || albumIds.length === 0) {
      return { updatedAlbums: [], success: false, updatedCount: 0 };
    }

    const albums = this._getFromStorage('albums');
    const photos = this._getFromStorage('photos');

    // Instrumentation for task completion tracking (task_4)
    try {
      if (
        albumIds.length === 3 &&
        privacy === 'private' &&
        showOnProfile === false &&
        showOnHomepage === false
      ) {
        const candidates = albums.filter(a =>
          a &&
          typeof a.year === 'number' &&
          a.year <= 2019 &&
          a.privacy === 'public'
        );

        candidates.sort((a, b) => this._compareByDate(a, b, 'createdAt', 'asc'));

        const expectedOldestThreePublicPre2020AlbumIds = candidates.slice(0, 3).map(a => a.id);

        let isMatch = false;
        if (expectedOldestThreePublicPre2020AlbumIds.length === albumIds.length) {
          const selectedSet = new Set(albumIds);
          const expectedSet = new Set(expectedOldestThreePublicPre2020AlbumIds);
          if (selectedSet.size === expectedSet.size) {
            isMatch = true;
            expectedSet.forEach(id => {
              if (!selectedSet.has(id)) {
                isMatch = false;
              }
            });
          }
        }

        const instrumentationValue = {
          selectedAlbumIds: albumIds.slice(),
          targetPrivacy: privacy,
          targetShowOnProfile: showOnProfile,
          targetShowOnHomepage: showOnHomepage,
          expectedOldestThreePublicPre2020AlbumIds: expectedOldestThreePublicPre2020AlbumIds,
          isMatch: isMatch,
          timestamp: new Date().toISOString()
        };

        localStorage.setItem('task4_privacyChangeVerification', JSON.stringify(instrumentationValue));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task4_privacyChangeVerification):', e);
      } catch (e2) {}
    }

    const idSet = new Set(albumIds);
    const options = {
      privacy: privacy,
      showOnProfile: showOnProfile,
      showOnHomepage: showOnHomepage
    };

    const updatedAlbumsRaw = [];

    for (let i = 0; i < albums.length; i++) {
      const a = albums[i];
      if (idSet.has(a.id)) {
        this._updateAlbumVisibilityFlags(a, options);
        updatedAlbumsRaw.push(a);
      }
    }

    this._saveToStorage('albums', albums);

    const updatedAlbums = updatedAlbumsRaw.map(a => this._augmentAlbumWithCoverPhoto(a, photos));
    return { updatedAlbums: updatedAlbums, success: true, updatedCount: updatedAlbums.length };
  }

  // getAlbumDetail(albumId)
  getAlbumDetail(albumId) {
    const albums = this._getFromStorage('albums');
    const albumPhotos = this._getFromStorage('album_photos');
    const photos = this._getFromStorage('photos');

    const album = albums.find(a => a.id === albumId) || null;
    if (!album) {
      return {
        album: null,
        coverPhoto: null,
        photoCount: 0,
        dateRange: { startDate: null, endDate: null },
        locationSummary: ''
      };
    }

    const related = albumPhotos.filter(ap => ap.albumId === albumId);
    const photoCount = related.length;

    let startDate = album.startDate || null;
    let endDate = album.endDate || null;

    if (!startDate || !endDate) {
      let minTime = null;
      let maxTime = null;
      for (let i = 0; i < related.length; i++) {
        const ap = related[i];
        const p = photos.find(ph => ph.id === ap.photoId);
        if (!p) continue;
        const d = this._parseDate(p.captureDate);
        if (!d) continue;
        const t = d.getTime();
        if (minTime === null || t < minTime) minTime = t;
        if (maxTime === null || t > maxTime) maxTime = t;
      }
      if (minTime !== null) startDate = new Date(minTime).toISOString();
      if (maxTime !== null) endDate = new Date(maxTime).toISOString();
    }

    let locationSummary = '';
    if (album.mainCity && album.mainCountry) {
      locationSummary = album.mainCity + ', ' + album.mainCountry;
    } else if (album.mainCountry) {
      locationSummary = album.mainCountry;
    }

    const coverPhoto = album.coverPhotoId ? photos.find(p => p.id === album.coverPhotoId) || null : null;
    const augmentedAlbum = this._augmentAlbumWithCoverPhoto(album, photos);

    return {
      album: augmentedAlbum,
      coverPhoto: coverPhoto,
      photoCount: photoCount,
      dateRange: { startDate: startDate, endDate: endDate },
      locationSummary: locationSummary
    };
  }

  // getAlbumPhotoFilterOptions(albumId)
  getAlbumPhotoFilterOptions(albumId) {
    const albumPhotos = this._getFromStorage('album_photos');
    const photos = this._getFromStorage('photos');
    const people = this._getFromStorage('people');
    const photoPersonTags = this._getFromStorage('photo_person_tags');
    const tags = this._getFromStorage('tags');
    const photoTags = this._getFromStorage('photo_tags');

    const relatedAlbumPhotos = albumPhotos.filter(ap => ap.albumId === albumId);

    const photoIdSet = new Set();
    for (let i = 0; i < relatedAlbumPhotos.length; i++) {
      photoIdSet.add(relatedAlbumPhotos[i].photoId);
    }

    const dateCountsMap = new Map();
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (!photoIdSet.has(p.id)) continue;
      const dateOnly = this._dateOnlyString(p.captureDate);
      if (!dateOnly) continue;
      const prev = dateCountsMap.get(dateOnly) || 0;
      dateCountsMap.set(dateOnly, prev + 1);
    }

    const availableDates = Array.from(dateCountsMap.keys())
      .sort()
      .map(d => ({ date: d, photoCount: dateCountsMap.get(d) }));

    const peopleIdSet = new Set();
    for (let i = 0; i < photoPersonTags.length; i++) {
      const pt = photoPersonTags[i];
      if (photoIdSet.has(pt.photoId)) {
        peopleIdSet.add(pt.personId);
      }
    }
    const peopleFiltered = people
      .filter(p => peopleIdSet.has(p.id))
      .map(p => this._augmentPersonWithAvatar(p, photos));

    const tagIdSet = new Set();
    for (let i = 0; i < photoTags.length; i++) {
      const pt = photoTags[i];
      if (photoIdSet.has(pt.photoId)) {
        tagIdSet.add(pt.tagId);
      }
    }
    const tagsFiltered = tags.filter(t => tagIdSet.has(t.id));

    return {
      availableDates: availableDates,
      people: peopleFiltered,
      tags: tagsFiltered
    };
  }

  // getAlbumPhotos(albumId, filters, sort, page, pageSize)
  getAlbumPhotos(albumId, filters, sort, page, pageSize) {
    const albumPhotos = this._getFromStorage('album_photos');
    const photos = this._getFromStorage('photos');
    const photoPersonTags = this._getFromStorage('photo_person_tags');

    const relatedAlbumPhotos = albumPhotos.filter(ap => ap.albumId === albumId);
    const photoIdToAlbumPhoto = new Map();
    for (let i = 0; i < relatedAlbumPhotos.length; i++) {
      const ap = relatedAlbumPhotos[i];
      photoIdToAlbumPhoto.set(ap.photoId, ap);
    }

    let result = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (photoIdToAlbumPhoto.has(p.id)) {
        result.push(p);
      }
    }

    filters = filters || {};

    if (filters.specificDate) {
      const target = filters.specificDate;
      result = result.filter(p => this._dateOnlyString(p.captureDate) === target);
    } else {
      if (filters.dateFrom) {
        const from = this._parseDate(filters.dateFrom);
        if (from) {
          const ft = from.getTime();
          result = result.filter(p => {
            const d = this._parseDate(p.captureDate);
            return d && d.getTime() >= ft;
          });
        }
      }
      if (filters.dateTo) {
        const to = this._parseDate(filters.dateTo);
        if (to) {
          const tt = to.getTime();
          result = result.filter(p => {
            const d = this._parseDate(p.captureDate);
            return d && d.getTime() <= tt;
          });
        }
      }
    }

    if (typeof filters.favoritesOnly === 'boolean' && filters.favoritesOnly) {
      result = result.filter(p => !!p.isFavorite);
    }

    const photoToPersonIds = new Map();
    for (let i = 0; i < photoPersonTags.length; i++) {
      const pt = photoPersonTags[i];
      if (!photoToPersonIds.has(pt.photoId)) {
        photoToPersonIds.set(pt.photoId, []);
      }
      photoToPersonIds.get(pt.photoId).push(pt.personId);
    }

    if (filters.peopleFilterMode === 'untagged') {
      result = result.filter(p => {
        const arr = photoToPersonIds.get(p.id) || [];
        return arr.length === 0;
      });
    } else if (filters.personIds && Array.isArray(filters.personIds) && filters.personIds.length > 0) {
      const targetSet = new Set(filters.personIds);
      const mode = filters.peopleFilterMode || 'any';
      result = result.filter(p => {
        const arr = photoToPersonIds.get(p.id) || [];
        if (mode === 'all') {
          for (let id of targetSet) {
            if (arr.indexOf(id) === -1) return false;
          }
          return true;
        } else {
          // any
          for (let i = 0; i < arr.length; i++) {
            if (targetSet.has(arr[i])) return true;
          }
          return false;
        }
      });
    }

    // Sorting
    if (sort === 'date_taken_newest') {
      result.sort((a, b) => this._compareByDate(a, b, 'captureDate', 'desc'));
    } else if (sort === 'date_taken_oldest') {
      result.sort((a, b) => this._compareByDate(a, b, 'captureDate', 'asc'));
    } else if (sort === 'likes_high_to_low') {
      result.sort((a, b) => {
        const la = typeof a.likesCount === 'number' ? a.likesCount : 0;
        const lb = typeof b.likesCount === 'number' ? b.likesCount : 0;
        return lb - la;
      });
    } else {
      // default: by AlbumPhoto.position asc
      result.sort((a, b) => {
        const apA = photoIdToAlbumPhoto.get(a.id);
        const apB = photoIdToAlbumPhoto.get(b.id);
        const pa = apA && typeof apA.position === 'number' ? apA.position : 0;
        const pb = apB && typeof apB.position === 'number' ? apB.position : 0;
        return pa - pb;
      });
    }

    const totalCount = result.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 48;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const paged = result.slice(start, end);

    return { photos: paged, totalCount: totalCount };
  }

  // addPhotosToAlbum(albumId, photoIds)
  addPhotosToAlbum(albumId, photoIds) {
    const albums = this._getFromStorage('albums');
    const albumPhotos = this._getFromStorage('album_photos');

    const album = albums.find(a => a.id === albumId) || null;
    if (!album) {
      return { addedCount: 0, album: null, success: false };
    }

    const now = new Date().toISOString();
    const existingSet = new Set();
    for (let i = 0; i < albumPhotos.length; i++) {
      const ap = albumPhotos[i];
      if (ap.albumId === albumId) {
        existingSet.add(ap.photoId);
      }
    }

    let maxPosition = 0;
    for (let i = 0; i < albumPhotos.length; i++) {
      const ap = albumPhotos[i];
      if (ap.albumId === albumId && typeof ap.position === 'number') {
        if (ap.position > maxPosition) maxPosition = ap.position;
      }
    }

    let addedCount = 0;
    if (Array.isArray(photoIds)) {
      for (let i = 0; i < photoIds.length; i++) {
        const pid = photoIds[i];
        if (existingSet.has(pid)) continue;
        maxPosition += 1;
        const ap = {
          id: this._generateId('albph'),
          albumId: albumId,
          photoId: pid,
          position: maxPosition,
          dateAdded: now
        };
        albumPhotos.push(ap);
        addedCount += 1;
      }
    }

    album.updatedAt = now;
    this._saveToStorage('album_photos', albumPhotos);
    this._saveToStorage('albums', albums);

    return { addedCount: addedCount, album: this._augmentAlbumWithCoverPhoto(album), success: true };
  }

  // bulkRemovePhotosFromAlbum(albumId, photoIds)
  bulkRemovePhotosFromAlbum(albumId, photoIds) {
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return { removedCount: 0, success: false };
    }

    let albumPhotos = this._getFromStorage('album_photos');
    const idSet = new Set(photoIds);
    const before = albumPhotos.length;
    albumPhotos = albumPhotos.filter(ap => !(ap.albumId === albumId && idSet.has(ap.photoId)));
    const removedCount = before - albumPhotos.length;

    this._saveToStorage('album_photos', albumPhotos);

    return { removedCount: removedCount, success: true };
  }

  // bulkTagPeopleOnPhotos(photoIds, personId)
  bulkTagPeopleOnPhotos(photoIds, personId) {
    if (!Array.isArray(photoIds) || photoIds.length === 0 || !personId) {
      return { updatedCount: 0, person: null, success: false };
    }

    const people = this._getFromStorage('people');
    const photoPersonTags = this._getFromStorage('photo_person_tags');
    const now = new Date().toISOString();

    // Instrumentation for task completion tracking (task_3)
    try {
      // Resolve Alex and proceed only if this call is tagging Alex
      const alexPerson = people.find(p => p && p.name === 'Alex');
      if (alexPerson && personId === alexPerson.id && Array.isArray(photoIds) && photoIds.length > 0) {
        const albums = this._getFromStorage('albums');
        const newYorkAlbum = albums.find(a => a && a.title === 'New York 2022');

        if (newYorkAlbum) {
          const albumPhotos = this._getFromStorage('album_photos');
          const related = albumPhotos.filter(ap => ap.albumId === newYorkAlbum.id);

          if (related.length > 0) {
            // Ordered list of all photos in the album by position
            related.sort((a, b) => {
              const pa = typeof a.position === 'number' ? a.position : 0;
              const pb = typeof b.position === 'number' ? b.position : 0;
              return pa - pb;
            });
            const orderedAlbumPhotoIds = related.map(ap => ap.photoId);

            // Ensure at least one of the selected photoIds belongs to this album
            const selectedInAlbum = photoIds.filter(pid => orderedAlbumPhotoIds.indexOf(pid) !== -1);
            if (selectedInAlbum.length > 0) {
              // Determine which photos in this album are currently tagged (by anyone)
              const taggedPhotoIds = new Set();
              for (let i = 0; i < photoPersonTags.length; i++) {
                const pt = photoPersonTags[i];
                if (orderedAlbumPhotoIds.indexOf(pt.photoId) !== -1) {
                  taggedPhotoIds.add(pt.photoId);
                }
              }

              // Ordered list of currently untagged photoIds in that album
              const untaggedOrdered = [];
              for (let i = 0; i < orderedAlbumPhotoIds.length; i++) {
                const pid = orderedAlbumPhotoIds[i];
                if (!taggedPhotoIds.has(pid)) {
                  untaggedOrdered.push(pid);
                }
              }

              // Last 5 of the untagged list
              const startIdx = Math.max(untaggedOrdered.length - 5, 0);
              const expectedLast5 = untaggedOrdered.slice(startIdx);

              const selectedPhotoIdsCopy = photoIds.slice();
              let isMatch = false;
              if (selectedPhotoIdsCopy.length === 5 && expectedLast5.length === 5) {
                const expectedSet = new Set(expectedLast5);
                isMatch =
                  selectedPhotoIdsCopy.every(id => expectedSet.has(id)) &&
                  expectedLast5.every(id => selectedPhotoIdsCopy.indexOf(id) !== -1);
              }

              const instrumentationValue = {
                albumId: newYorkAlbum.id,
                personId: alexPerson.id,
                expectedLast5UntaggedPhotoIds: expectedLast5,
                selectedPhotoIds: selectedPhotoIdsCopy,
                isMatch: isMatch,
                timestamp: new Date().toISOString()
              };

              localStorage.setItem('task3_alexTaggingVerification', JSON.stringify(instrumentationValue));
            }
          }
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task3_alexTaggingVerification):', e);
      } catch (e2) {}
    }

    const person = people.find(p => p.id === personId) || null;

    const existing = new Set();
    for (let i = 0; i < photoPersonTags.length; i++) {
      const pt = photoPersonTags[i];
      if (pt.personId === personId) {
        existing.add(pt.photoId);
      }
    }

    let updatedCount = 0;
    for (let i = 0; i < photoIds.length; i++) {
      const pid = photoIds[i];
      if (existing.has(pid)) continue;
      const pt = {
        id: this._generateId('ppt'),
        photoId: pid,
        personId: personId,
        createdAt: now,
        isPrimary: false
      };
      photoPersonTags.push(pt);
      updatedCount += 1;
    }

    this._saveToStorage('photo_person_tags', photoPersonTags);

    return { updatedCount: updatedCount, person: person, success: true };
  }

  // bulkLikePhotos(photoIds, like)
  bulkLikePhotos(photoIds, like) {
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return { updatedCount: 0, success: false };
    }

    const photos = this._getFromStorage('photos');
    const idSet = new Set(photoIds);
    let updatedCount = 0;

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (!idSet.has(p.id)) continue;
      const currentLiked = !!p.likedByOwner;
      const newLiked = typeof like === 'boolean' ? like : !currentLiked;
      if (newLiked === currentLiked) continue;
      p.likedByOwner = newLiked;
      const currentLikes = typeof p.likesCount === 'number' ? p.likesCount : 0;
      p.likesCount = newLiked ? currentLikes + 1 : Math.max(currentLikes - 1, 0);
      updatedCount += 1;
    }

    this._saveToStorage('photos', photos);

    return { updatedCount: updatedCount, success: true };
  }

  // bulkMarkPhotosToPrint(photoIds, toPrint)
  bulkMarkPhotosToPrint(photoIds, toPrint) {
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return { updatedCount: 0, success: false };
    }

    const photos = this._getFromStorage('photos');
    const idSet = new Set(photoIds);
    const flag = !!toPrint;
    let updatedCount = 0;

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (!idSet.has(p.id)) continue;
      if (!!p.toPrint === flag) continue;
      p.toPrint = flag;
      updatedCount += 1;
    }

    this._saveToStorage('photos', photos);

    return { updatedCount: updatedCount, success: true };
  }

  // bulkAddPhotosToCollection(collectionId, photoIds)
  bulkAddPhotosToCollection(collectionId, photoIds) {
    if (!collectionId || !Array.isArray(photoIds) || photoIds.length === 0) {
      return { addedCount: 0, collection: null, success: false };
    }

    const collections = this._getFromStorage('collections');
    const collectionPhotos = this._getFromStorage('collection_photos');

    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return { addedCount: 0, collection: null, success: false };
    }

    const now = new Date().toISOString();
    const existingSet = new Set();
    let maxPosition = 0;

    for (let i = 0; i < collectionPhotos.length; i++) {
      const cp = collectionPhotos[i];
      if (cp.collectionId === collectionId) {
        existingSet.add(cp.photoId);
        if (typeof cp.position === 'number' && cp.position > maxPosition) {
          maxPosition = cp.position;
        }
      }
    }

    let addedCount = 0;
    for (let i = 0; i < photoIds.length; i++) {
      const pid = photoIds[i];
      if (existingSet.has(pid)) continue;
      maxPosition += 1;
      const cp = {
        id: this._generateId('cph'),
        collectionId: collectionId,
        photoId: pid,
        position: maxPosition,
        dateAdded: now
      };
      collectionPhotos.push(cp);
      addedCount += 1;
    }

    collection.updatedAt = now;
    this._saveToStorage('collection_photos', collectionPhotos);
    this._saveToStorage('collections', collections);

    const photos = this._getFromStorage('photos');
    const augmentedCollection = this._augmentCollectionWithCoverPhoto(collection, photos);

    return { addedCount: addedCount, collection: augmentedCollection, success: true };
  }

  // setAlbumCoverPhoto(albumId, photoId)
  setAlbumCoverPhoto(albumId, photoId) {
    const albums = this._getFromStorage('albums');
    const album = albums.find(a => a.id === albumId) || null;
    if (!album) {
      return { album: null, success: false };
    }

    album.coverPhotoId = photoId;
    album.updatedAt = new Date().toISOString();
    this._saveToStorage('albums', albums);

    const photos = this._getFromStorage('photos');
    const augmentedAlbum = this._augmentAlbumWithCoverPhoto(album, photos);

    return { album: augmentedAlbum, success: true };
  }

  // getAlbumComments(albumId, page, pageSize)
  getAlbumComments(albumId, page, pageSize) {
    const comments = this._getFromStorage('album_comments');
    const albums = this._getFromStorage('albums');

    const filtered = comments.filter(c => c.albumId === albumId)
      .sort((a, b) => this._compareByDate(a, b, 'createdAt', 'asc'));

    const totalCount = filtered.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const album = albums.find(a => a.id === albumId) || null;

    const paged = filtered.slice(start, end).map(c => Object.assign({}, c, { album: album }));

    return { comments: paged, totalCount: totalCount };
  }

  // addAlbumComment(albumId, text)
  addAlbumComment(albumId, text) {
    if (!albumId || !text) {
      return { comment: null, success: false };
    }

    const albums = this._getFromStorage('albums');
    const album = albums.find(a => a.id === albumId) || null;
    if (!album) {
      return { comment: null, success: false };
    }

    const comments = this._getFromStorage('album_comments');
    const now = new Date().toISOString();

    const comment = {
      id: this._generateId('acm'),
      albumId: albumId,
      text: text,
      createdAt: now
    };

    comments.push(comment);
    this._saveToStorage('album_comments', comments);

    const augmentedComment = Object.assign({}, comment, { album: album });

    return { comment: augmentedComment, success: true };
  }

  // getAllPhotoFilterOptions()
  getAllPhotoFilterOptions() {
    const tags = this._getFromStorage('tags');
    const peopleRaw = this._getFromStorage('people');
    const photos = this._getFromStorage('photos');

    const regionValues = [
      'africa',
      'antarctica',
      'asia',
      'europe',
      'north_america',
      'south_america',
      'oceania',
      'middle_east',
      'central_america',
      'caribbean',
      'other'
    ];

    const regions = regionValues.map(v => ({
      value: v,
      label: v.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    }));

    const countriesSet = new Set();
    for (let i = 0; i < photos.length; i++) {
      const c = photos[i].country;
      if (c) countriesSet.add(c);
    }
    const countries = Array.from(countriesSet).sort();

    const people = peopleRaw.map(p => this._augmentPersonWithAvatar(p, photos));

    const ratingValues = [1, 2, 3, 4, 5];

    return {
      regions: regions,
      countries: countries,
      tags: tags,
      people: people,
      ratingValues: ratingValues
    };
  }

  // getAllPhotos(filters, sort, page, pageSize)
  getAllPhotos(filters, sort, page, pageSize) {
    const photos = this._getFromStorage('photos');
    const filtered = this._applyPhotoFiltersAndSort(photos, filters || {}, sort);

    const totalCount = filtered.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 60;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const paged = filtered.slice(start, end);

    return { photos: paged, totalCount: totalCount };
  }

  // initSlideshowEditor(photoIds)
  initSlideshowEditor(photoIds) {
    const photos = this._getFromStorage('photos');
    const photoById = new Map();
    for (let i = 0; i < photos.length; i++) {
      photoById.set(photos[i].id, photos[i]);
    }

    const selectedPhotos = [];
    if (Array.isArray(photoIds)) {
      for (let i = 0; i < photoIds.length; i++) {
        const p = photoById.get(photoIds[i]);
        if (p) selectedPhotos.push(p);
      }
    }

    return {
      photos: selectedPhotos,
      defaultSettings: {
        slideDurationSeconds: 3,
        shuffleEnabled: false
      }
    };
  }

  // saveSlideshow(title, slideDurationSeconds, shuffleEnabled, photoIds, slideshowId)
  saveSlideshow(title, slideDurationSeconds, shuffleEnabled, photoIds, slideshowId) {
    const slideshows = this._getFromStorage('slideshows');
    let slideshow = null;
    const now = new Date().toISOString();

    if (slideshowId) {
      slideshow = slideshows.find(s => s.id === slideshowId) || null;
      if (!slideshow) {
        return { slideshow: null, success: false };
      }
      slideshow.title = title;
      slideshow.slideDurationSeconds = slideDurationSeconds;
      slideshow.shuffleEnabled = !!shuffleEnabled;
      slideshow.updatedAt = now;
    } else {
      slideshow = {
        id: this._generateId('ss'),
        title: title,
        slideDurationSeconds: slideDurationSeconds,
        shuffleEnabled: !!shuffleEnabled,
        createdAt: now,
        updatedAt: now
      };
      slideshows.push(slideshow);
    }

    const slideshowPhotos = this._getFromStorage('slideshow_photos');
    const filtered = slideshowPhotos.filter(sp => sp.slideshowId !== slideshow.id);

    let position = 0;
    if (Array.isArray(photoIds)) {
      for (let i = 0; i < photoIds.length; i++) {
        position += 1;
        filtered.push({
          id: this._generateId('ssp'),
          slideshowId: slideshow.id,
          photoId: photoIds[i],
          position: position
        });
      }
    }

    this._saveToStorage('slideshows', slideshows);
    this._saveToStorage('slideshow_photos', filtered);

    return { slideshow: slideshow, success: true };
  }

  // getPhotoDetail(photoId, context)
  getPhotoDetail(photoId, context) {
    const photos = this._getFromStorage('photos');
    const albums = this._getFromStorage('albums');
    const collections = this._getFromStorage('collections');
    const albumPhotos = this._getFromStorage('album_photos');
    const collectionPhotos = this._getFromStorage('collection_photos');
    const people = this._getFromStorage('people');
    const tags = this._getFromStorage('tags');
    const photoPersonTags = this._getFromStorage('photo_person_tags');
    const photoTags = this._getFromStorage('photo_tags');
    const tripDayPhotos = this._getFromStorage('trip_day_photos');

    const photo = photos.find(p => p.id === photoId) || null;
    if (!photo) {
      return {
        photo: null,
        albums: [],
        collections: [],
        peopleTags: [],
        keywordTags: [],
        exif: {},
        location: {},
        navigation: { previousPhotoId: null, nextPhotoId: null }
      };
    }

    const albumIds = new Set();
    for (let i = 0; i < albumPhotos.length; i++) {
      const ap = albumPhotos[i];
      if (ap.photoId === photoId) albumIds.add(ap.albumId);
    }
    const relatedAlbumsRaw = albums.filter(a => albumIds.has(a.id));
    const relatedAlbums = relatedAlbumsRaw.map(a => this._augmentAlbumWithCoverPhoto(a, photos));

    const collectionIds = new Set();
    for (let i = 0; i < collectionPhotos.length; i++) {
      const cp = collectionPhotos[i];
      if (cp.photoId === photoId) collectionIds.add(cp.collectionId);
    }
    const relatedCollectionsRaw = collections.filter(c => collectionIds.has(c.id));
    const relatedCollections = relatedCollectionsRaw.map(c => this._augmentCollectionWithCoverPhoto(c, photos));

    const peopleIdsForPhoto = [];
    for (let i = 0; i < photoPersonTags.length; i++) {
      const pt = photoPersonTags[i];
      if (pt.photoId === photoId) {
        peopleIdsForPhoto.push(pt.personId);
      }
    }
    const peopleTagsList = people
      .filter(p => peopleIdsForPhoto.indexOf(p.id) !== -1)
      .map(p => this._augmentPersonWithAvatar(p, photos));

    const tagIdsForPhoto = [];
    for (let i = 0; i < photoTags.length; i++) {
      const pt = photoTags[i];
      if (pt.photoId === photoId) tagIdsForPhoto.push(pt.tagId);
    }
    const keywordTagsList = tags.filter(t => tagIdsForPhoto.indexOf(t.id) !== -1);

    const exif = {
      cameraMake: photo.cameraMake || null,
      cameraModel: photo.cameraModel || null,
      lens: photo.lens || null,
      focalLength: photo.focalLength || null,
      exposureTime: photo.exposureTime || null,
      aperture: photo.aperture || null,
      iso: photo.iso || null
    };

    const location = {
      country: photo.country || null,
      stateOrProvince: photo.stateOrProvince || null,
      city: photo.city || null,
      placeName: photo.placeName || null,
      latitude: typeof photo.latitude === 'number' ? photo.latitude : null,
      longitude: typeof photo.longitude === 'number' ? photo.longitude : null
    };

    let previousPhotoId = null;
    let nextPhotoId = null;

    if (context && typeof context === 'object' && context.type && context.id) {
      const ctxType = context.type;
      const ctxId = context.id;

      if (ctxType === 'album') {
        const ctxAlbumPhotos = albumPhotos
          .filter(ap => ap.albumId === ctxId)
          .sort((a, b) => {
            const pa = typeof a.position === 'number' ? a.position : 0;
            const pb = typeof b.position === 'number' ? b.position : 0;
            return pa - pb;
          });
        const ids = ctxAlbumPhotos.map(ap => ap.photoId);
        const idx = ids.indexOf(photoId);
        if (idx > 0) previousPhotoId = ids[idx - 1];
        if (idx >= 0 && idx < ids.length - 1) nextPhotoId = ids[idx + 1];
      } else if (ctxType === 'collection') {
        const ctxCollectionPhotos = collectionPhotos
          .filter(cp => cp.collectionId === ctxId)
          .sort((a, b) => {
            const pa = typeof a.position === 'number' ? a.position : 0;
            const pb = typeof b.position === 'number' ? b.position : 0;
            return pa - pb;
          });
        const ids = ctxCollectionPhotos.map(cp => cp.photoId);
        const idx = ids.indexOf(photoId);
        if (idx > 0) previousPhotoId = ids[idx - 1];
        if (idx >= 0 && idx < ids.length - 1) nextPhotoId = ids[idx + 1];
      } else if (ctxType === 'trip_day') {
        const ctxTripDayPhotos = tripDayPhotos
          .filter(tdp => tdp.tripDayId === ctxId)
          .sort((a, b) => {
            const pa = typeof a.position === 'number' ? a.position : 0;
            const pb = typeof b.position === 'number' ? b.position : 0;
            return pa - pb;
          });
        const ids = ctxTripDayPhotos.map(tdp => tdp.photoId);
        const idx = ids.indexOf(photoId);
        if (idx > 0) previousPhotoId = ids[idx - 1];
        if (idx >= 0 && idx < ids.length - 1) nextPhotoId = ids[idx + 1];
      } else if (ctxType === 'all_photos') {
        let filters = null;
        let sort = null;
        if (context.filterHash) {
          try {
            const parsed = JSON.parse(context.filterHash);
            filters = parsed.filters || null;
            sort = parsed.sort || null;
          } catch (e) {
            filters = null;
            sort = null;
          }
        }
        const sorted = this._applyPhotoFiltersAndSort(photos, filters || {}, sort || 'date_taken_newest');
        const ids = sorted.map(p => p.id);
        const idx = ids.indexOf(photoId);
        if (idx > 0) previousPhotoId = ids[idx - 1];
        if (idx >= 0 && idx < ids.length - 1) nextPhotoId = ids[idx + 1];
      }
    }

    return {
      photo: photo,
      albums: relatedAlbums,
      collections: relatedCollections,
      peopleTags: peopleTagsList,
      keywordTags: keywordTagsList,
      exif: exif,
      location: location,
      navigation: {
        previousPhotoId: previousPhotoId,
        nextPhotoId: nextPhotoId
      }
    };
  }

  // updatePhotoCaption(photoId, caption)
  updatePhotoCaption(photoId, caption) {
    const photos = this._getFromStorage('photos');
    const photo = photos.find(p => p.id === photoId) || null;
    if (!photo) {
      return { photo: null, success: false };
    }

    photo.caption = caption;
    this._saveToStorage('photos', photos);

    return { photo: photo, success: true };
  }

  // togglePhotoToPrintFlag(photoId, toPrint)
  togglePhotoToPrintFlag(photoId, toPrint) {
    const photos = this._getFromStorage('photos');
    const photo = photos.find(p => p.id === photoId) || null;
    if (!photo) {
      return { photo: null, success: false };
    }

    const newFlag = typeof toPrint === 'boolean' ? toPrint : !photo.toPrint;
    photo.toPrint = newFlag;
    this._saveToStorage('photos', photos);

    return { photo: photo, success: true };
  }

  // togglePhotoLike(photoId, like)
  togglePhotoLike(photoId, like) {
    const photos = this._getFromStorage('photos');
    const photo = photos.find(p => p.id === photoId) || null;
    if (!photo) {
      return { photo: null, success: false };
    }

    const currentLiked = !!photo.likedByOwner;
    const newLiked = typeof like === 'boolean' ? like : !currentLiked;
    if (currentLiked !== newLiked) {
      photo.likedByOwner = newLiked;
      const currentLikes = typeof photo.likesCount === 'number' ? photo.likesCount : 0;
      photo.likesCount = newLiked ? currentLikes + 1 : Math.max(currentLikes - 1, 0);
      this._saveToStorage('photos', photos);
    }

    return { photo: photo, success: true };
  }

  // togglePhotoFavorite(photoId, favorite)
  togglePhotoFavorite(photoId, favorite) {
    const photos = this._getFromStorage('photos');
    const photo = photos.find(p => p.id === photoId) || null;
    if (!photo) {
      return { photo: null, success: false };
    }

    const newFavorite = typeof favorite === 'boolean' ? favorite : !photo.isFavorite;
    photo.isFavorite = newFavorite;
    this._saveToStorage('photos', photos);

    return { photo: photo, success: true };
  }

  // updatePhotoPeopleTags(photoId, personIds)
  updatePhotoPeopleTags(photoId, personIds) {
    if (!Array.isArray(personIds)) {
      return { peopleTags: [], success: false };
    }

    let photoPersonTags = this._getFromStorage('photo_person_tags');
    const people = this._getFromStorage('people');
    const now = new Date().toISOString();

    photoPersonTags = photoPersonTags.filter(pt => pt.photoId !== photoId);

    for (let i = 0; i < personIds.length; i++) {
      const pid = personIds[i];
      photoPersonTags.push({
        id: this._generateId('ppt'),
        photoId: photoId,
        personId: pid,
        createdAt: now,
        isPrimary: false
      });
    }

    this._saveToStorage('photo_person_tags', photoPersonTags);

    const photos = this._getFromStorage('photos');
    const peopleTags = people
      .filter(p => personIds.indexOf(p.id) !== -1)
      .map(p => this._augmentPersonWithAvatar(p, photos));

    return { peopleTags: peopleTags, success: true };
  }

  // updatePhotoKeywordTags(photoId, tagIds)
  updatePhotoKeywordTags(photoId, tagIds) {
    if (!Array.isArray(tagIds)) {
      return { keywordTags: [], success: false };
    }

    let photoTags = this._getFromStorage('photo_tags');
    const tags = this._getFromStorage('tags');
    const now = new Date().toISOString();

    photoTags = photoTags.filter(pt => pt.photoId !== photoId);

    for (let i = 0; i < tagIds.length; i++) {
      const tid = tagIds[i];
      photoTags.push({
        id: this._generateId('ptg'),
        photoId: photoId,
        tagId: tid,
        createdAt: now
      });
    }

    this._saveToStorage('photo_tags', photoTags);

    const keywordTags = tags.filter(t => tagIds.indexOf(t.id) !== -1);

    return { keywordTags: keywordTags, success: true };
  }

  // getCollections(filters, sort, page, pageSize)
  getCollections(filters, sort, page, pageSize) {
    const collections = this._getFromStorage('collections');
    const photos = this._getFromStorage('photos');

    filters = filters || {};
    let result = collections.slice();

    if (filters.nameQuery && typeof filters.nameQuery === 'string') {
      const q = filters.nameQuery.toLowerCase();
      result = result.filter(c => (c.name || '').toLowerCase().indexOf(q) !== -1);
    }

    if (typeof filters.mapEnabled === 'boolean') {
      result = result.filter(c => !!c.mapEnabled === filters.mapEnabled);
    }

    if (filters.quickAccessType === 'sunsets') {
      result = result.filter(c => (c.name || '').toLowerCase().indexOf('sunset') !== -1);
    }

    switch (sort) {
      case 'created_at_newest':
        result.sort((a, b) => this._compareByDate(a, b, 'createdAt', 'desc'));
        break;
      case 'created_at_oldest':
        result.sort((a, b) => this._compareByDate(a, b, 'createdAt', 'asc'));
        break;
      case 'name_az':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_za':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      default:
        result.sort((a, b) => this._compareByDate(a, b, 'createdAt', 'desc'));
        break;
    }

    const totalCount = result.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 24;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const paged = result.slice(start, end).map(c => this._augmentCollectionWithCoverPhoto(c, photos));

    return { collections: paged, totalCount: totalCount };
  }

  // createCollection(name, description, collectionType, ruleDefinition, mapEnabled)
  createCollection(name, description, collectionType, ruleDefinition, mapEnabled) {
    if (!name || !collectionType) {
      return { collection: null, success: false };
    }

    const collections = this._getFromStorage('collections');
    const now = new Date().toISOString();

    const collection = {
      id: this._generateId('col'),
      name: name,
      description: description || '',
      coverPhotoId: undefined,
      createdAt: now,
      updatedAt: now,
      collectionType: collectionType,
      ruleDefinition: ruleDefinition || undefined,
      mapEnabled: typeof mapEnabled === 'boolean' ? mapEnabled : false
    };

    collections.push(collection);
    this._saveToStorage('collections', collections);

    const photos = this._getFromStorage('photos');
    const augmented = this._augmentCollectionWithCoverPhoto(collection, photos);

    return { collection: augmented, success: true };
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionPhotos = this._getFromStorage('collection_photos');
    const photos = this._getFromStorage('photos');

    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null, photos: [] };
    }

    const related = collectionPhotos
      .filter(cp => cp.collectionId === collectionId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    const photoById = new Map();
    for (let i = 0; i < photos.length; i++) {
      photoById.set(photos[i].id, photos[i]);
    }

    const resultPhotos = [];
    for (let i = 0; i < related.length; i++) {
      const p = photoById.get(related[i].photoId);
      if (p) resultPhotos.push(p);
    }

    const augmentedCollection = this._augmentCollectionWithCoverPhoto(collection, photos);

    return { collection: augmentedCollection, photos: resultPhotos };
  }

  // updateCollectionSettings(collectionId, name, description, mapEnabled, coverPhotoId)
  updateCollectionSettings(collectionId, name, description, mapEnabled, coverPhotoId) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null, success: false };
    }

    if (typeof name === 'string') collection.name = name;
    if (typeof description === 'string') collection.description = description;
    if (typeof mapEnabled === 'boolean') collection.mapEnabled = mapEnabled;
    if (typeof coverPhotoId === 'string') collection.coverPhotoId = coverPhotoId;
    collection.updatedAt = new Date().toISOString();

    this._saveToStorage('collections', collections);

    const photos = this._getFromStorage('photos');
    const augmented = this._augmentCollectionWithCoverPhoto(collection, photos);

    return { collection: augmented, success: true };
  }

  // reorderCollectionPhotos(collectionId, orderedPhotoIds)
  reorderCollectionPhotos(collectionId, orderedPhotoIds) {
    if (!collectionId || !Array.isArray(orderedPhotoIds)) {
      return { success: false };
    }

    const collectionPhotos = this._getFromStorage('collection_photos');
    const orderMap = new Map();
    for (let i = 0; i < orderedPhotoIds.length; i++) {
      orderMap.set(orderedPhotoIds[i], i + 1);
    }

    for (let i = 0; i < collectionPhotos.length; i++) {
      const cp = collectionPhotos[i];
      if (cp.collectionId !== collectionId) continue;
      if (orderMap.has(cp.photoId)) {
        cp.position = orderMap.get(cp.photoId);
      }
    }

    this._saveToStorage('collection_photos', collectionPhotos);

    return { success: true };
  }

  // removePhotosFromCollection(collectionId, photoIds)
  removePhotosFromCollection(collectionId, photoIds) {
    if (!collectionId || !Array.isArray(photoIds) || photoIds.length === 0) {
      return { removedCount: 0, success: false };
    }

    let collectionPhotos = this._getFromStorage('collection_photos');
    const idSet = new Set(photoIds);
    const before = collectionPhotos.length;
    collectionPhotos = collectionPhotos.filter(cp => !(cp.collectionId === collectionId && idSet.has(cp.photoId)));
    const removedCount = before - collectionPhotos.length;

    this._saveToStorage('collection_photos', collectionPhotos);
    this._recalculateCollectionCoverPhoto(collectionId);

    return { removedCount: removedCount, success: true };
  }

  // getTrips(filters, sort, page, pageSize)
  getTrips(filters, sort, page, pageSize) {
    const trips = this._getFromStorage('trips');
    const photos = this._getFromStorage('photos');

    filters = filters || {};
    let result = trips.slice();

    if (filters.titleQuery && typeof filters.titleQuery === 'string') {
      const q = filters.titleQuery.toLowerCase();
      result = result.filter(t => (t.title || '').toLowerCase().indexOf(q) !== -1);
    }

    if (filters.dateFrom) {
      const from = this._parseDate(filters.dateFrom);
      if (from) {
        const ft = from.getTime();
        result = result.filter(t => {
          const d = this._parseDate(t.startDate);
          return d && d.getTime() >= ft;
        });
      }
    }

    if (filters.dateTo) {
      const to = this._parseDate(filters.dateTo);
      if (to) {
        const tt = to.getTime();
        result = result.filter(t => {
          const d = this._parseDate(t.startDate);
          return d && d.getTime() <= tt;
        });
      }
    }

    if (typeof filters.pinnedOnly === 'boolean' && filters.pinnedOnly) {
      result = result.filter(t => !!t.pinnedToProfile);
    }

    switch (sort) {
      case 'start_date_newest':
        result.sort((a, b) => this._compareByDate(a, b, 'startDate', 'desc'));
        break;
      case 'start_date_oldest':
        result.sort((a, b) => this._compareByDate(a, b, 'startDate', 'asc'));
        break;
      case 'created_at_newest':
        result.sort((a, b) => this._compareByDate(a, b, 'createdAt', 'desc'));
        break;
      default:
        result.sort((a, b) => this._compareByDate(a, b, 'startDate', 'desc'));
        break;
    }

    const totalCount = result.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const paged = result.slice(start, end).map(t => this._augmentTripWithCoverPhoto(t, photos));

    return { trips: paged, totalCount: totalCount };
  }

  // createTrip(title, summary, locationOverview, startDate, endDate)
  createTrip(title, summary, locationOverview, startDate, endDate) {
    if (!title) {
      return { trip: null, success: false };
    }

    const trips = this._getFromStorage('trips');
    const now = new Date().toISOString();

    const trip = {
      id: this._generateId('trip'),
      title: title,
      summary: summary || '',
      coverPhotoId: undefined,
      locationOverview: locationOverview || '',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      createdAt: now,
      updatedAt: now,
      pinnedToProfile: false
    };

    trips.push(trip);
    this._saveToStorage('trips', trips);

    const photos = this._getFromStorage('photos');
    const augmented = this._augmentTripWithCoverPhoto(trip, photos);

    return { trip: augmented, success: true };
  }

  // getTripDetail(tripId)
  getTripDetail(tripId) {
    const trips = this._getFromStorage('trips');
    const tripDays = this._getFromStorage('trip_days');
    const tripDayPhotos = this._getFromStorage('trip_day_photos');
    const photos = this._getFromStorage('photos');

    const trip = trips.find(t => t.id === tripId) || null;
    if (!trip) {
      return { trip: null, days: [] };
    }

    const daysForTrip = tripDays
      .filter(d => d.tripId === tripId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    const photoById = new Map();
    for (let i = 0; i < photos.length; i++) {
      photoById.set(photos[i].id, photos[i]);
    }

    const dayItems = [];
    for (let i = 0; i < daysForTrip.length; i++) {
      const day = daysForTrip[i];
      const tdpForDay = tripDayPhotos
        .filter(tdp => tdp.tripDayId === day.id)
        .sort((a, b) => {
          const pa = typeof a.position === 'number' ? a.position : 0;
          const pb = typeof b.position === 'number' ? b.position : 0;
          return pa - pb;
        });
      const dayPhotos = [];
      for (let j = 0; j < tdpForDay.length; j++) {
        const p = photoById.get(tdpForDay[j].photoId);
        if (p) dayPhotos.push(p);
      }
      dayItems.push({ day: day, photos: dayPhotos });
    }

    const augmentedTrip = this._augmentTripWithCoverPhoto(trip, photos);

    return { trip: augmentedTrip, days: dayItems };
  }

  // updateTripStory(tripId, summary, pinnedToProfile, dayOrder)
  updateTripStory(tripId, summary, pinnedToProfile, dayOrder) {
    const trips = this._getFromStorage('trips');
    const trip = trips.find(t => t.id === tripId) || null;
    if (!trip) {
      return { trip: null, days: [], success: false };
    }

    if (typeof summary === 'string') {
      trip.summary = summary;
    }
    if (typeof pinnedToProfile === 'boolean') {
      trip.pinnedToProfile = pinnedToProfile;
    }
    trip.updatedAt = new Date().toISOString();

    this._saveToStorage('trips', trips);

    let reorderedDays = [];
    if (Array.isArray(dayOrder) && dayOrder.length > 0) {
      reorderedDays = this._resequenceTripDays(tripId, dayOrder);
    } else {
      const tripDays = this._getFromStorage('trip_days');
      reorderedDays = tripDays
        .filter(d => d.tripId === tripId)
        .sort((a, b) => {
          const pa = typeof a.position === 'number' ? a.position : 0;
          const pb = typeof b.position === 'number' ? b.position : 0;
          return pa - pb;
        });
    }

    const photos = this._getFromStorage('photos');
    const augmentedTrip = this._augmentTripWithCoverPhoto(trip, photos);

    return { trip: augmentedTrip, days: reorderedDays, success: true };
  }

  // getPeopleOptions(query)
  getPeopleOptions(query) {
    const people = this._getFromStorage('people');
    const photos = this._getFromStorage('photos');

    let result = people.slice();
    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      result = result.filter(p => (p.name || '').toLowerCase().indexOf(q) !== -1);
    }

    result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    result = result.map(p => this._augmentPersonWithAvatar(p, photos));

    return result;
  }

  // getAboutContent()
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    return raw ? JSON.parse(raw) : { title: '', bodyHtml: '', contactEmail: '', socialLinks: [] };
  }

  // getHelpContent()
  getHelpContent() {
    const raw = localStorage.getItem('help_content');
    return raw ? JSON.parse(raw) : { sections: [], faq: [] };
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