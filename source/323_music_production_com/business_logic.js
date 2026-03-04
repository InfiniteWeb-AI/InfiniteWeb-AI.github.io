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

  // ------------------- Storage helpers -------------------

  _initStorage() {
    const keys = [
      'tracks',
      'playlists',
      'playlist_tracks',
      'case_studies',
      'case_study_audio_pieces',
      'saved_projects',
      'service_packages',
      'project_inquiries',
      'booking_slots',
      'studio_bookings',
      'team_members',
      'testimonials',
      'resources',
      'portfolio_filter_states'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('playback_state')) {
      localStorage.setItem('playback_state', JSON.stringify({
        is_playing: false,
        track_id: null,
        context_page: null,
        started_at: null
      }));
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
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ------------------- Generic helpers -------------------

  _formatDuration(seconds) {
    if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  _normalizeGenreName(genre) {
    if (!genre) return '';
    return String(genre)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  _labelFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); })
      .join(' ');
  }

  // ------------------- Playlist helpers -------------------

  _getOrCreatePlaylistStorage() {
    const playlists = this._getFromStorage('playlists');
    const playlistTracks = this._getFromStorage('playlist_tracks');
    return { playlists: playlists, playlist_tracks: playlistTracks };
  }

  _recalculatePlaylistAggregates(playlistId) {
    if (!playlistId) return;
    const data = this._getOrCreatePlaylistStorage();
    const playlists = data.playlists;
    const playlistTracks = data.playlist_tracks;
    const tracks = this._getFromStorage('tracks');

    const plIndex = playlists.findIndex(function (p) { return p.id === playlistId; });
    if (plIndex === -1) return;

    const related = playlistTracks.filter(function (pt) { return pt.playlist_id === playlistId; });
    let count = related.length;
    let totalDuration = 0;

    for (let i = 0; i < related.length; i++) {
      const pt = related[i];
      const track = tracks.find(function (t) { return t.id === pt.track_id; });
      if (track && typeof track.duration_seconds === 'number') {
        totalDuration += track.duration_seconds;
      }
    }

    playlists[plIndex].track_count = count;
    playlists[plIndex].total_duration_seconds = totalDuration;
    playlists[plIndex].updated_at = new Date().toISOString();

    this._saveToStorage('playlists', playlists);
  }

  // ------------------- Saved projects helpers -------------------

  _getOrCreateSavedProjectsStorage() {
    return this._getFromStorage('saved_projects');
  }

  // ------------------- Portfolio filter state helpers -------------------

  _getCurrentPortfolioFilterState() {
    const states = this._getFromStorage('portfolio_filter_states');
    if (!states.length) return null;
    // Use the most recently created (last)
    return states[states.length - 1];
  }

  _persistPortfolioFilterState(view, genre, min_year, sort_by) {
    const states = [];
    const now = new Date().toISOString();
    const state = {
      id: this._generateId('portfolio_state'),
      view: view || null,
      genre: genre || null,
      min_year: typeof min_year === 'number' ? min_year : null,
      sort_by: sort_by || null,
      created_at: now,
      updated_at: now
    };
    states.push(state);
    this._saveToStorage('portfolio_filter_states', states);
    return state;
  }

  // ------------------- Booking helpers -------------------

  _computeAvailableBookingSlots(session_type, year, month, duration_hours) {
    const bookingSlots = this._getFromStorage('booking_slots');
    const result = [];

    for (let i = 0; i < bookingSlots.length; i++) {
      const slot = bookingSlots[i];
      if (slot.session_type !== session_type) continue;
      if (!slot.start_datetime) continue;
      const start = new Date(slot.start_datetime);
      if (start.getFullYear() !== year || start.getMonth() + 1 !== month) continue;

      const supports = typeof slot.duration_hours === 'number' && slot.duration_hours >= duration_hours && slot.is_available === true;
      result.push({
        id: slot.id,
        session_type: slot.session_type,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        duration_hours: slot.duration_hours,
        is_weekday: !!slot.is_weekday,
        is_evening: !!slot.is_evening,
        is_available: !!slot.is_available,
        supports_requested_duration: supports,
        notes: slot.notes || null
      });
    }

    return result;
  }

  _createStudioBookingFromSlot(slot, session_type, duration_hours) {
    if (!slot) return null;
    const bookings = this._getFromStorage('studio_bookings');

    const start = new Date(slot.start_datetime);
    let end;
    if (slot.end_datetime) {
      end = new Date(slot.end_datetime);
    } else {
      end = new Date(start.getTime() + duration_hours * 60 * 60 * 1000);
    }

    const booking = {
      id: this._generateId('booking'),
      session_type: session_type,
      booking_slot_id: slot.id,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      duration_hours: duration_hours,
      status: 'pending_review',
      notes: null,
      created_at: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('studio_bookings', bookings);
    return booking;
  }

  _updateStudioBookingStatus(bookingId, status, notes) {
    const bookings = this._getFromStorage('studio_bookings');
    const idx = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (idx === -1) return null;
    bookings[idx].status = status;
    if (typeof notes === 'string') {
      bookings[idx].notes = notes;
    }
    this._saveToStorage('studio_bookings', bookings);
    return bookings[idx];
  }

  _getNextMonthYear(currentDate) {
    const date = currentDate instanceof Date ? currentDate : new Date();
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    const nextMonth = (month + 1) % 12;
    const nextYear = month === 11 ? year + 1 : year;
    return { year: nextYear, month: nextMonth + 1 };
  }

  // ------------------- Project inquiry helpers -------------------

  _createProjectInquiryRecord(payload) {
    const inquiries = this._getFromStorage('project_inquiries');
    const now = new Date().toISOString();

    const inquiry = {
      id: this._generateId('inquiry'),
      project_type: payload.project_type,
      number_of_songs: typeof payload.number_of_songs === 'number' ? payload.number_of_songs : null,
      budget_amount: typeof payload.budget_amount === 'number' ? payload.budget_amount : null,
      budget_currency: payload.budget_currency || null,
      deadline: payload.deadline || null,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      project_description: payload.project_description || null,
      referenced_package_id: payload.referenced_package_id || null,
      referenced_producer_id: payload.referenced_producer_id || null,
      status: 'submitted',
      created_at: now,
      submitted_at: now
    };

    inquiries.push(inquiry);
    this._saveToStorage('project_inquiries', inquiries);
    this._sendProjectInquiryNotification(inquiry);
    return inquiry;
  }

  _sendProjectInquiryNotification(inquiry) {
    // No-op placeholder for notification side-effects (email, webhook, etc.)
    // Intentionally left empty to keep business logic pure.
    return inquiry ? true : false;
  }

  // ------------------- Playback helpers -------------------

  _getCurrentPlaybackState() {
    const data = localStorage.getItem('playback_state');
    if (!data) {
      return {
        is_playing: false,
        track_id: null,
        context_page: null,
        started_at: null
      };
    }
    try {
      const parsed = JSON.parse(data);
      return {
        is_playing: !!parsed.is_playing,
        track_id: parsed.track_id || null,
        context_page: parsed.context_page || null,
        started_at: parsed.started_at || null
      };
    } catch (e) {
      return {
        is_playing: false,
        track_id: null,
        context_page: null,
        started_at: null
      };
    }
  }

  _setCurrentPlaybackState(state) {
    localStorage.setItem('playback_state', JSON.stringify(state));
  }

  // =======================================================
  // Core interface implementations
  // =======================================================

  // ------------------- Home page -------------------

  getHomePageHighlights() {
    const tracks = this._getFromStorage('tracks').filter(function (t) { return t.is_active !== false; });
    const playlists = this._getFromStorage('playlists');
    const caseStudies = this._getFromStorage('case_studies');
    const audioPieces = this._getFromStorage('case_study_audio_pieces');
    const testimonials = this._getFromStorage('testimonials');
    const teamMembers = this._getFromStorage('team_members');

    // Studio summary (lightweight static text, data-driven genres/services)
    const genreSet = {};
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].genre) genreSet[tracks[i].genre] = true;
    }
    const primary_genres = Object.keys(genreSet).slice(0, 5);

    const servicePackages = this._getFromStorage('service_packages');
    const serviceSet = {};
    for (let i = 0; i < servicePackages.length; i++) {
      serviceSet[servicePackages[i].package_category] = true;
    }
    const core_services = Object.keys(serviceSet).map(this._labelFromEnum);

    const studio_summary = {
      headline: 'Boutique Music Production & Mixing Studio',
      subheadline: 'Radio-ready records for artists, brands, and campaigns',
      description: 'We produce, record, and mix modern records across hip-hop, pop, electronic, and more — from first demo to final master.',
      primary_genres: primary_genres,
      core_services: core_services
    };

    // Featured tracks: top by popularity
    const self = this;
    const featured_tracks = tracks
      .slice()
      .sort(function (a, b) { return (b.popularity_score || 0) - (a.popularity_score || 0); })
      .slice(0, 8)
      .map(function (t) {
        const producer = t.primary_producer_id
          ? teamMembers.find(function (m) { return m.id === t.primary_producer_id; })
          : null;
        return {
          id: t.id,
          title: t.title,
          genre: t.genre,
          release_year: t.release_year,
          duration_seconds: t.duration_seconds,
          formatted_duration: self._formatDuration(t.duration_seconds),
          popularity_score: t.popularity_score,
          audio_url: t.audio_url,
          artwork_url: t.artwork_url || null,
          primary_producer_name: producer ? producer.name : null,
          is_featured: !!t.is_featured
        };
      });

    // Featured playlists: favorites or most recent
    const featured_playlists = playlists
      .slice()
      .sort(function (a, b) {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 5)
      .map(function (p) {
        return {
          id: p.id,
          name: p.name,
          description: p.description || '',
          track_count: p.track_count || 0,
          total_duration_seconds: p.total_duration_seconds || 0,
          formatted_total_duration: self._formatDuration(p.total_duration_seconds || 0),
          is_favorite: !!p.is_favorite
        };
      });

    // Featured case studies: prefer brand/advertising with most recent year
    const caseStudiesWithCounts = caseStudies.map(function (cs) {
      let count = typeof cs.audio_piece_count === 'number' ? cs.audio_piece_count : null;
      if (count == null) {
        count = audioPieces.filter(function (ap) { return ap.case_study_id === cs.id; }).length;
      }
      return {
        id: cs.id,
        title: cs.title,
        client_name: cs.client_name || null,
        client_type: cs.client_type,
        year: cs.year,
        thumbnail_url: cs.thumbnail_url || null,
        tags: cs.tags || [],
        audio_piece_count: count
      };
    });

    const featured_case_studies = caseStudiesWithCounts
      .slice()
      .sort(function (a, b) { return (b.year || 0) - (a.year || 0); })
      .slice(0, 6);

    // Featured testimonials: is_featured or top-rated
    const featured_testimonials = testimonials
      .filter(function (t) { return t.is_featured || t.rating === '5'; })
      .slice()
      .sort(function (a, b) {
        const af = a.is_featured ? 1 : 0;
        const bf = b.is_featured ? 1 : 0;
        if (bf !== af) return bf - af;
        const ad = a.created_date ? new Date(a.created_date).getTime() : 0;
        const bd = b.created_date ? new Date(b.created_date).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 6)
      .map(function (t) {
        return {
          id: t.id,
          client_name: t.client_name || null,
          client_type: t.client_type,
          rating: t.rating,
          title: t.title || '',
          excerpt: t.excerpt || '',
          is_featured: !!t.is_featured
        };
      });

    const primary_ctas = [
      {
        label: 'Listen to the portfolio',
        target_page: 'portfolio_music',
        description: 'Browse recent productions across genres.'
      },
      {
        label: 'Explore EP packages',
        target_page: 'services_pricing',
        description: 'Compare full-service production options.'
      },
      {
        label: 'Book studio time',
        target_page: 'studio_booking',
        description: 'Lock in your next recording session.'
      },
      {
        label: 'Start a project inquiry',
        target_page: 'project_inquiry',
        description: 'Tell us about your project and budget.'
      }
    ];

    return {
      studio_summary: studio_summary,
      featured_tracks: featured_tracks,
      featured_playlists: featured_playlists,
      featured_case_studies: featured_case_studies,
      featured_testimonials: featured_testimonials,
      primary_ctas: primary_ctas
    };
  }

  // ------------------- Portfolio / Music -------------------

  getPortfolioMusicFilterOptions() {
    const tracks = this._getFromStorage('tracks').filter(function (t) { return t.is_active !== false; });

    // Genres
    const genreMap = {};
    for (let i = 0; i < tracks.length; i++) {
      const g = tracks[i].genre;
      if (!g) continue;
      const norm = this._normalizeGenreName(g);
      if (!genreMap[norm]) {
        genreMap[norm] = g;
      }
    }
    const genres = Object.keys(genreMap).map(function (value) {
      return { value: value, label: genreMap[value] };
    });

    // Year range
    let minYear = null;
    let maxYear = null;
    const yearSet = {};
    for (let i = 0; i < tracks.length; i++) {
      const y = tracks[i].release_year;
      if (typeof y !== 'number') continue;
      yearSet[y] = true;
      if (minYear == null || y < minYear) minYear = y;
      if (maxYear == null || y > maxYear) maxYear = y;
    }
    const suggested_years = Object.keys(yearSet)
      .map(function (y) { return parseInt(y, 10); })
      .sort(function (a, b) { return b - a; });

    const year_range = {
      min_year: minYear,
      max_year: maxYear,
      suggested_years: suggested_years
    };

    const duration_ranges = [
      { id: 'under_3_min', label: 'Under 3:00', max_duration_seconds: 180 },
      { id: 'under_3_30', label: 'Under 3:30', max_duration_seconds: 210 },
      { id: 'under_4_min', label: 'Under 4:00', max_duration_seconds: 240 },
      { id: 'under_5_min', label: 'Under 5:00', max_duration_seconds: 300 }
    ];

    const sort_options = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'duration_asc', label: 'Shortest First' },
      { value: 'duration_desc', label: 'Longest First' },
      { value: 'alphabetical', label: 'A–Z' }
    ];

    const view_modes = [
      { value: 'tracks', label: 'Tracks' },
      { value: 'projects', label: 'Projects' },
      { value: 'albums', label: 'Albums' }
    ];

    return {
      genres: genres,
      year_range: year_range,
      duration_ranges: duration_ranges,
      sort_options: sort_options,
      view_modes: view_modes,
      default_view: 'tracks',
      default_sort: 'most_popular'
    };
  }

  listPortfolioTracks(view, genre, min_year, max_year, max_duration_seconds, sort_by, page, page_size) {
    const tracks = this._getFromStorage('tracks').filter(function (t) { return t.is_active !== false; });
    const teamMembers = this._getFromStorage('team_members');
    const caseStudies = this._getFromStorage('case_studies');

    const currentView = view || 'tracks';
    let filtered = tracks.slice();
    const normGenre = genre ? this._normalizeGenreName(genre) : null;

    if (normGenre) {
      const self = this;
      filtered = filtered.filter(function (t) {
        return self._normalizeGenreName(t.genre) === normGenre;
      });
    }

    if (typeof min_year === 'number') {
      filtered = filtered.filter(function (t) { return typeof t.release_year === 'number' && t.release_year >= min_year; });
    }
    if (typeof max_year === 'number') {
      filtered = filtered.filter(function (t) { return typeof t.release_year === 'number' && t.release_year <= max_year; });
    }

    if (typeof max_duration_seconds === 'number') {
      filtered = filtered.filter(function (t) { return typeof t.duration_seconds === 'number' && t.duration_seconds <= max_duration_seconds; });
    }

    const sortBy = sort_by || 'most_popular';
    filtered.sort(function (a, b) {
      if (sortBy === 'most_recent') {
        const ay = a.release_year || 0;
        const by = b.release_year || 0;
        if (by !== ay) return by - ay;
        const ad = a.release_date ? new Date(a.release_date).getTime() : 0;
        const bd = b.release_date ? new Date(b.release_date).getTime() : 0;
        return bd - ad;
      } else if (sortBy === 'duration_asc') {
        return (a.duration_seconds || 0) - (b.duration_seconds || 0);
      } else if (sortBy === 'duration_desc') {
        return (b.duration_seconds || 0) - (a.duration_seconds || 0);
      } else if (sortBy === 'alphabetical') {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      } else {
        return (b.popularity_score || 0) - (a.popularity_score || 0);
      }
    });

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;

    const self = this;
    const items = filtered.slice(startIndex, endIndex).map(function (t) {
      const producer = t.primary_producer_id
        ? teamMembers.find(function (m) { return m.id === t.primary_producer_id; })
        : null;
      const caseStudy = t.case_study_id
        ? caseStudies.find(function (cs) { return cs.id === t.case_study_id; })
        : null;
      return {
        id: t.id,
        title: t.title,
        genre: t.genre,
        release_year: t.release_year,
        duration_seconds: t.duration_seconds,
        formatted_duration: self._formatDuration(t.duration_seconds),
        popularity_score: t.popularity_score,
        play_count: t.play_count || 0,
        is_featured: !!t.is_featured,
        audio_url: t.audio_url,
        artwork_url: t.artwork_url || null,
        primary_producer_name: producer ? producer.name : null,
        case_study_id: t.case_study_id || null,
        case_study_title: caseStudy ? caseStudy.title : null,
        // Foreign key resolution (case_study_id -> case_study)
        case_study: caseStudy || null
      };
    });

    return {
      items: items,
      total_count: filtered.length,
      page: currentPage,
      page_size: size,
      applied_filters: {
        view: currentView,
        genre: normGenre,
        min_year: typeof min_year === 'number' ? min_year : null,
        max_year: typeof max_year === 'number' ? max_year : null,
        max_duration_seconds: typeof max_duration_seconds === 'number' ? max_duration_seconds : null,
        sort_by: sortBy
      }
    };
  }

  getPortfolioViewState() {
    const state = this._getCurrentPortfolioFilterState();
    if (!state) {
      return {
        view: 'tracks',
        genre: null,
        min_year: null,
        sort_by: 'most_popular'
      };
    }
    return {
      view: state.view || 'tracks',
      genre: state.genre || null,
      min_year: typeof state.min_year === 'number' ? state.min_year : null,
      sort_by: state.sort_by || 'most_popular'
    };
  }

  savePortfolioViewState(view, genre, min_year, sort_by) {
    const state = this._persistPortfolioFilterState(view, genre, min_year, sort_by);
    return {
      success: true,
      message: 'Portfolio view state saved',
      state: state
    };
  }

  getTrackDetail(trackId) {
    const tracks = this._getFromStorage('tracks');
    const teamMembers = this._getFromStorage('team_members');
    const caseStudies = this._getFromStorage('case_studies');

    const t = tracks.find(function (tr) { return tr.id === trackId; });
    if (!t) {
      return { track: null };
    }

    const primaryProducer = t.primary_producer_id
      ? teamMembers.find(function (m) { return m.id === t.primary_producer_id; })
      : null;

    const additionalProducers = Array.isArray(t.producer_ids)
      ? t.producer_ids
          .map(function (pid) { return teamMembers.find(function (m) { return m.id === pid; }) || null; })
          .filter(function (m) { return !!m; })
      : [];

    const caseStudy = t.case_study_id
      ? caseStudies.find(function (cs) { return cs.id === t.case_study_id; })
      : null;

    const track = {
      id: t.id,
      title: t.title,
      description: t.description || '',
      genre: t.genre,
      subgenre: t.subgenre || null,
      bpm: typeof t.bpm === 'number' ? t.bpm : null,
      key: t.key || null,
      mood_tags: t.mood_tags || [],
      duration_seconds: t.duration_seconds,
      formatted_duration: this._formatDuration(t.duration_seconds),
      release_year: t.release_year,
      release_date: t.release_date || null,
      popularity_score: t.popularity_score,
      play_count: t.play_count || 0,
      audio_url: t.audio_url,
      artwork_url: t.artwork_url || null,
      primary_producer: primaryProducer
        ? { id: primaryProducer.id, name: primaryProducer.name }
        : null,
      additional_producers: additionalProducers.map(function (p) {
        return { id: p.id, name: p.name };
      }),
      case_study_id: t.case_study_id || null,
      case_study_title: caseStudy ? caseStudy.title : null,
      // Foreign key resolution
      case_study: caseStudy || null
    };

    return { track: track };
  }

  getRelatedTracks(trackId, limit) {
    const tracks = this._getFromStorage('tracks').filter(function (t) { return t.is_active !== false; });
    const base = tracks.find(function (t) { return t.id === trackId; });
    if (!base) return [];

    const normGenre = this._normalizeGenreName(base.genre);
    let related = tracks.filter(function (t) {
      if (t.id === trackId) return false;
      return normGenre && normGenre === (t.genre ? t.genre.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : '');
    });

    related.sort(function (a, b) {
      return (b.popularity_score || 0) - (a.popularity_score || 0);
    });

    const lim = typeof limit === 'number' && limit > 0 ? limit : 6;
    const self = this;
    return related.slice(0, lim).map(function (t) {
      return {
        id: t.id,
        title: t.title,
        genre: t.genre,
        duration_seconds: t.duration_seconds,
        formatted_duration: self._formatDuration(t.duration_seconds),
        audio_url: t.audio_url,
        artwork_url: t.artwork_url || null
      };
    });
  }

  // ------------------- Playlists -------------------

  addTrackToPlaylist(trackId, playlistId, newPlaylistName) {
    const tracks = this._getFromStorage('tracks');
    const track = tracks.find(function (t) { return t.id === trackId; });
    if (!track) {
      return {
        success: false,
        playlist_id: null,
        playlist_name: null,
        track_added: false,
        message: 'Track not found'
      };
    }

    let playlists = this._getFromStorage('playlists');
    let playlistTracks = this._getFromStorage('playlist_tracks');
    let playlist = null;

    if (playlistId) {
      playlist = playlists.find(function (p) { return p.id === playlistId; });
      if (!playlist) {
        return {
          success: false,
          playlist_id: null,
          playlist_name: null,
          track_added: false,
          message: 'Playlist not found'
        };
      }
    } else if (newPlaylistName) {
      const now = new Date().toISOString();
      playlist = {
        id: this._generateId('playlist'),
        name: newPlaylistName,
        description: '',
        track_count: 0,
        total_duration_seconds: 0,
        is_favorite: false,
        created_at: now,
        updated_at: now
      };
      playlists.push(playlist);
    } else {
      return {
        success: false,
        playlist_id: null,
        playlist_name: null,
        track_added: false,
        message: 'Either playlistId or newPlaylistName must be provided'
      };
    }

    const relatedTracks = playlistTracks.filter(function (pt) { return pt.playlist_id === playlist.id; });
    let maxOrder = -1;
    for (let i = 0; i < relatedTracks.length; i++) {
      if (typeof relatedTracks[i].order_index === 'number' && relatedTracks[i].order_index > maxOrder) {
        maxOrder = relatedTracks[i].order_index;
      }
    }

    const playlistTrack = {
      id: this._generateId('pltrack'),
      playlist_id: playlist.id,
      track_id: track.id,
      order_index: maxOrder + 1,
      added_at: new Date().toISOString()
    };

    playlistTracks.push(playlistTrack);

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_tracks', playlistTracks);
    this._recalculatePlaylistAggregates(playlist.id);

    return {
      success: true,
      playlist_id: playlist.id,
      playlist_name: playlist.name,
      track_added: true,
      message: 'Track added to playlist'
    };
  }

  listPlaylists() {
    const playlists = this._getFromStorage('playlists');
    const self = this;
    return playlists.map(function (p) {
      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        track_count: p.track_count || 0,
        total_duration_seconds: p.total_duration_seconds || 0,
        formatted_total_duration: self._formatDuration(p.total_duration_seconds || 0),
        is_favorite: !!p.is_favorite,
        created_at: p.created_at || null
      };
    });
  }

  createPlaylist(name, description) {
    if (!name) {
      return {
        success: false,
        playlist: null,
        message: 'Playlist name is required'
      };
    }
    const playlists = this._getFromStorage('playlists');
    const now = new Date().toISOString();
    const playlist = {
      id: this._generateId('playlist'),
      name: name,
      description: description || '',
      track_count: 0,
      total_duration_seconds: 0,
      is_favorite: false,
      created_at: now,
      updated_at: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    return {
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        track_count: playlist.track_count,
        total_duration_seconds: playlist.total_duration_seconds
      },
      message: 'Playlist created'
    };
  }

  renamePlaylist(playlistId, newName) {
    if (!playlistId || !newName) {
      return {
        success: false,
        playlist_id: playlistId || null,
        new_name: newName || null,
        message: 'playlistId and newName are required'
      };
    }
    const playlists = this._getFromStorage('playlists');
    const idx = playlists.findIndex(function (p) { return p.id === playlistId; });
    if (idx === -1) {
      return {
        success: false,
        playlist_id: playlistId,
        new_name: newName,
        message: 'Playlist not found'
      };
    }
    playlists[idx].name = newName;
    playlists[idx].updated_at = new Date().toISOString();
    this._saveToStorage('playlists', playlists);
    return {
      success: true,
      playlist_id: playlistId,
      new_name: newName,
      message: 'Playlist renamed'
    };
  }

  deletePlaylist(playlistId) {
    if (!playlistId) {
      return { success: false, message: 'playlistId is required' };
    }
    let playlists = this._getFromStorage('playlists');
    let playlistTracks = this._getFromStorage('playlist_tracks');

    const beforeLen = playlists.length;
    playlists = playlists.filter(function (p) { return p.id !== playlistId; });
    playlistTracks = playlistTracks.filter(function (pt) { return pt.playlist_id !== playlistId; });

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_tracks', playlistTracks);

    const deleted = playlists.length < beforeLen;
    return {
      success: deleted,
      message: deleted ? 'Playlist deleted' : 'Playlist not found'
    };
  }

  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlistTracks = this._getFromStorage('playlist_tracks');
    const tracks = this._getFromStorage('tracks');

    const pl = playlists.find(function (p) { return p.id === playlistId; });
    if (!pl) {
      return {
        playlist: null,
        tracks: []
      };
    }

    const related = playlistTracks
      .filter(function (pt) { return pt.playlist_id === playlistId; })
      .sort(function (a, b) { return (a.order_index || 0) - (b.order_index || 0); });

    const self = this;
    const items = related.map(function (pt) {
      const track = tracks.find(function (t) { return t.id === pt.track_id; }) || null;
      return {
        playlist_track_id: pt.id,
        order_index: pt.order_index || 0,
        added_at: pt.added_at || null,
        track: track
          ? {
              id: track.id,
              title: track.title,
              genre: track.genre,
              duration_seconds: track.duration_seconds,
              formatted_duration: self._formatDuration(track.duration_seconds),
              audio_url: track.audio_url,
              artwork_url: track.artwork_url || null
            }
          : null,
        // Foreign key resolution examples
        playlist_id: pt.playlist_id,
        track_id: pt.track_id
      };
    });

    const playlist = {
      id: pl.id,
      name: pl.name,
      description: pl.description || '',
      track_count: pl.track_count || items.length,
      total_duration_seconds: pl.total_duration_seconds || 0,
      formatted_total_duration: self._formatDuration(pl.total_duration_seconds || 0)
    };

    return {
      playlist: playlist,
      tracks: items
    };
  }

  updatePlaylistOrder(playlistId, orderedTrackIds) {
    if (!playlistId || !Array.isArray(orderedTrackIds)) {
      return {
        success: false,
        playlist_id: playlistId || null,
        message: 'playlistId and orderedTrackIds are required'
      };
    }

    const playlistTracks = this._getFromStorage('playlist_tracks');
    const related = playlistTracks.filter(function (pt) { return pt.playlist_id === playlistId; });

    const trackIdSet = {};
    for (let i = 0; i < orderedTrackIds.length; i++) {
      trackIdSet[orderedTrackIds[i]] = i;
    }

    for (let i = 0; i < playlistTracks.length; i++) {
      const pt = playlistTracks[i];
      if (pt.playlist_id === playlistId && trackIdSet.hasOwnProperty(pt.track_id)) {
        pt.order_index = trackIdSet[pt.track_id];
      }
    }

    this._saveToStorage('playlist_tracks', playlistTracks);
    this._recalculatePlaylistAggregates(playlistId);

    return {
      success: true,
      playlist_id: playlistId,
      message: 'Playlist order updated'
    };
  }

  removeTrackFromPlaylist(playlistId, trackId) {
    if (!playlistId || !trackId) {
      return {
        success: false,
        playlist_id: playlistId || null,
        track_id: trackId || null,
        message: 'playlistId and trackId are required'
      };
    }

    let playlistTracks = this._getFromStorage('playlist_tracks');
    const beforeLen = playlistTracks.length;
    playlistTracks = playlistTracks.filter(function (pt) {
      return !(pt.playlist_id === playlistId && pt.track_id === trackId);
    });
    this._saveToStorage('playlist_tracks', playlistTracks);

    const removed = playlistTracks.length < beforeLen;
    if (removed) {
      this._recalculatePlaylistAggregates(playlistId);
    }

    return {
      success: removed,
      playlist_id: playlistId,
      track_id: trackId,
      message: removed ? 'Track removed from playlist' : 'Track not found in playlist'
    };
  }

  // ------------------- Case Studies & Saved Projects -------------------

  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies');
    const clientTypeSet = {};
    let minYear = null;
    let maxYear = null;

    for (let i = 0; i < caseStudies.length; i++) {
      const cs = caseStudies[i];
      if (cs.client_type) clientTypeSet[cs.client_type] = true;
      if (typeof cs.year === 'number') {
        if (minYear == null || cs.year < minYear) minYear = cs.year;
        if (maxYear == null || cs.year > maxYear) maxYear = cs.year;
      }
    }

    const client_types = Object.keys(clientTypeSet).map(function (val) {
      return { value: val, label: val.split('_').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ') };
    });

    return {
      client_types: client_types,
      year_range: {
        min_year: minYear,
        max_year: maxYear
      }
    };
  }

  listCaseStudies(client_type, min_year, max_year, search_term, page, page_size) {
    const caseStudies = this._getFromStorage('case_studies');
    const audioPieces = this._getFromStorage('case_study_audio_pieces');
    const savedProjects = this._getFromStorage('saved_projects');

    let filtered = caseStudies.slice();

    if (client_type) {
      filtered = filtered.filter(function (cs) { return cs.client_type === client_type; });
    }
    if (typeof min_year === 'number') {
      filtered = filtered.filter(function (cs) { return typeof cs.year === 'number' && cs.year >= min_year; });
    }
    if (typeof max_year === 'number') {
      filtered = filtered.filter(function (cs) { return typeof cs.year === 'number' && cs.year <= max_year; });
    }
    if (search_term) {
      const term = search_term.toLowerCase();
      filtered = filtered.filter(function (cs) {
        const t = (cs.title || '').toLowerCase();
        const c = (cs.client_name || '').toLowerCase();
        const d = (cs.description || '').toLowerCase();
        return t.indexOf(term) !== -1 || c.indexOf(term) !== -1 || d.indexOf(term) !== -1;
      });
    }

    filtered.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;

    const items = filtered.slice(startIndex, endIndex).map(function (cs) {
      let count = typeof cs.audio_piece_count === 'number' ? cs.audio_piece_count : null;
      if (count == null) {
        count = audioPieces.filter(function (ap) { return ap.case_study_id === cs.id; }).length;
      }
      const is_saved = savedProjects.some(function (sp) { return sp.case_study_id === cs.id; });
      return {
        id: cs.id,
        title: cs.title,
        client_name: cs.client_name || null,
        client_type: cs.client_type,
        campaign_type: cs.campaign_type || null,
        year: cs.year,
        tags: cs.tags || [],
        audio_piece_count: count,
        thumbnail_url: cs.thumbnail_url || null,
        is_saved: is_saved
      };
    });

    return {
      items: items,
      total_count: filtered.length,
      page: currentPage,
      page_size: size
    };
  }

  getCaseStudyDetail(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies');
    const audioPieces = this._getFromStorage('case_study_audio_pieces');
    const savedProjects = this._getFromStorage('saved_projects');

    const cs = caseStudies.find(function (c) { return c.id === caseStudyId; });
    if (!cs) {
      return {
        case_study: null,
        audio_pieces: []
      };
    }

    const is_saved = savedProjects.some(function (sp) { return sp.case_study_id === cs.id; });

    const case_study = {
      id: cs.id,
      title: cs.title,
      client_name: cs.client_name || null,
      client_type: cs.client_type,
      campaign_type: cs.campaign_type || null,
      description: cs.description || '',
      year: cs.year,
      tags: cs.tags || [],
      audio_piece_count: typeof cs.audio_piece_count === 'number'
        ? cs.audio_piece_count
        : audioPieces.filter(function (ap) { return ap.case_study_id === cs.id; }).length,
      thumbnail_url: cs.thumbnail_url || null,
      is_saved: is_saved
    };

    const self = this;
    const audio_pieces = audioPieces
      .filter(function (ap) { return ap.case_study_id === cs.id; })
      .sort(function (a, b) { return (a.order_index || 0) - (b.order_index || 0); })
      .map(function (ap) {
        return {
          id: ap.id,
          title: ap.title,
          description: ap.description || '',
          duration_seconds: ap.duration_seconds,
          formatted_duration: self._formatDuration(ap.duration_seconds),
          audio_url: ap.audio_url,
          order_index: ap.order_index || 0
        };
      });

    return {
      case_study: case_study,
      audio_pieces: audio_pieces
    };
  }

  saveCaseStudy(caseStudyId) {
    if (!caseStudyId) {
      return { success: false, case_study_id: null, saved_at: null };
    }
    const caseStudies = this._getFromStorage('case_studies');
    const exists = caseStudies.some(function (cs) { return cs.id === caseStudyId; });
    if (!exists) {
      return { success: false, case_study_id: caseStudyId, saved_at: null };
    }

    let saved = this._getOrCreateSavedProjectsStorage();
    const already = saved.find(function (sp) { return sp.case_study_id === caseStudyId; });
    if (already) {
      return { success: true, case_study_id: caseStudyId, saved_at: already.saved_at };
    }

    const now = new Date().toISOString();
    const record = {
      id: this._generateId('saved_project'),
      case_study_id: caseStudyId,
      saved_at: now
    };
    saved.push(record);
    this._saveToStorage('saved_projects', saved);

    return {
      success: true,
      case_study_id: caseStudyId,
      saved_at: now
    };
  }

  unsaveCaseStudy(caseStudyId) {
    if (!caseStudyId) {
      return { success: false, case_study_id: null };
    }
    let saved = this._getOrCreateSavedProjectsStorage();
    const beforeLen = saved.length;
    saved = saved.filter(function (sp) { return sp.case_study_id !== caseStudyId; });
    this._saveToStorage('saved_projects', saved);
    return {
      success: saved.length < beforeLen,
      case_study_id: caseStudyId
    };
  }

  listSavedProjects() {
    const saved = this._getOrCreateSavedProjectsStorage();
    const caseStudies = this._getFromStorage('case_studies');

    return saved.map(function (sp) {
      const cs = caseStudies.find(function (c) { return c.id === sp.case_study_id; }) || null;
      return {
        saved_project_id: sp.id,
        saved_at: sp.saved_at,
        case_study: cs
          ? {
              id: cs.id,
              title: cs.title,
              client_name: cs.client_name || null,
              client_type: cs.client_type,
              year: cs.year,
              thumbnail_url: cs.thumbnail_url || null
            }
          : null
      };
    });
  }

  // ------------------- Services & Packages -------------------

  getServicePackageFilterOptions() {
    const packages = this._getFromStorage('service_packages');

    const categorySet = {};
    const trackRangeSet = {};
    const priceSet = [];

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (p.package_category) categorySet[p.package_category] = true;
      if (typeof p.base_price === 'number' && p.currency === 'usd') priceSet.push(p.base_price);
      if (typeof p.min_tracks === 'number' || typeof p.max_tracks === 'number') {
        const key = String(p.min_tracks || 0) + '-' + String(p.max_tracks || 0);
        if (!trackRangeSet[key]) {
          trackRangeSet[key] = {
            min_tracks: p.min_tracks || 0,
            max_tracks: p.max_tracks || 0
          };
        }
      }
    }

    const package_categories = Object.keys(categorySet).map(function (val) {
      return { value: val, label: val.split('_').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ') };
    });

    const track_count_ranges = Object.keys(trackRangeSet).map(function (key) {
      const r = trackRangeSet[key];
      const min = r.min_tracks;
      const max = r.max_tracks;
      let label;
      if (min && max) label = min + '-' + max + ' tracks';
      else if (min && !max) label = min + '+ tracks';
      else if (!min && max) label = 'Up to ' + max + ' tracks';
      else label = 'Flexible track count';
      return {
        min_tracks: min,
        max_tracks: max,
        label: label
      };
    });

    priceSet.sort(function (a, b) { return a - b; });
    const price_ranges_usd = [];
    if (priceSet.length) {
      const maxPrice = priceSet[priceSet.length - 1];
      const steps = [500, 1000, 1500, 2000, 3000];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        if (p <= maxPrice) {
          price_ranges_usd.push({ max_price: p, label: 'Up to $' + p });
        }
      }
    }

    return {
      package_categories: package_categories,
      service_flags: {
        includes_recording: true,
        includes_mixing: true,
        includes_mastering: true
      },
      track_count_ranges: track_count_ranges,
      price_ranges_usd: price_ranges_usd
    };
  }

  listServicePackages(package_category, includes_recording, includes_mixing, includes_mastering, min_tracks, max_tracks, max_price, currency, sort_by, page, page_size) {
    const packages = this._getFromStorage('service_packages').filter(function (p) { return p.is_active !== false; });

    let filtered = packages.slice();

    if (package_category) {
      filtered = filtered.filter(function (p) { return p.package_category === package_category; });
    }

    if (typeof includes_recording === 'boolean') {
      filtered = filtered.filter(function (p) { return !!p.includes_recording === includes_recording; });
    }
    if (typeof includes_mixing === 'boolean') {
      filtered = filtered.filter(function (p) { return !!p.includes_mixing === includes_mixing; });
    }
    if (typeof includes_mastering === 'boolean') {
      filtered = filtered.filter(function (p) { return !!p.includes_mastering === includes_mastering; });
    }

    if (typeof min_tracks === 'number') {
      filtered = filtered.filter(function (p) {
        if (typeof p.max_tracks === 'number') {
          return p.max_tracks >= min_tracks;
        }
        return true;
      });
    }

    if (typeof max_tracks === 'number') {
      filtered = filtered.filter(function (p) {
        if (typeof p.min_tracks === 'number') {
          return p.min_tracks <= max_tracks;
        }
        return true;
      });
    }

    const currencyFilter = currency || null;
    if (typeof max_price === 'number') {
      filtered = filtered.filter(function (p) {
        if (currencyFilter && p.currency !== currencyFilter) return false;
        return typeof p.base_price === 'number' && p.base_price <= max_price;
      });
    } else if (currencyFilter) {
      filtered = filtered.filter(function (p) { return p.currency === currencyFilter; });
    }

    const sortBy = sort_by || 'price_asc';
    filtered.sort(function (a, b) {
      if (sortBy === 'price_desc') {
        return (b.base_price || 0) - (a.base_price || 0);
      }
      // default price_asc
      return (a.base_price || 0) - (b.base_price || 0);
    });

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;

    const items = filtered.slice(startIndex, endIndex).map(function (p) {
      return {
        id: p.id,
        name: p.name,
        package_category: p.package_category,
        includes_recording: !!p.includes_recording,
        includes_mixing: !!p.includes_mixing,
        includes_mastering: !!p.includes_mastering,
        min_tracks: typeof p.min_tracks === 'number' ? p.min_tracks : null,
        max_tracks: typeof p.max_tracks === 'number' ? p.max_tracks : null,
        base_price: p.base_price,
        currency: p.currency,
        delivery_timeframe: p.delivery_timeframe || null,
        is_active: p.is_active !== false
      };
    });

    return {
      items: items,
      total_count: filtered.length,
      page: currentPage,
      page_size: size
    };
  }

  getServicePackageDetail(packageId) {
    const packages = this._getFromStorage('service_packages');
    const p = packages.find(function (pkg) { return pkg.id === packageId; });
    if (!p) {
      return {
        package: null,
        faq_items: []
      };
    }

    const pack = {
      id: p.id,
      name: p.name,
      description: p.description || '',
      package_category: p.package_category,
      includes_recording: !!p.includes_recording,
      includes_mixing: !!p.includes_mixing,
      includes_mastering: !!p.includes_mastering,
      min_tracks: typeof p.min_tracks === 'number' ? p.min_tracks : null,
      max_tracks: typeof p.max_tracks === 'number' ? p.max_tracks : null,
      base_price: p.base_price,
      currency: p.currency,
      delivery_timeframe: p.delivery_timeframe || null,
      revision_count: typeof p.revision_count === 'number' ? p.revision_count : null,
      notes: p.notes || '',
      is_active: p.is_active !== false
    };

    return {
      package: pack,
      faq_items: []
    };
  }

  // ------------------- Project Inquiry -------------------

  getProjectInquiryFormConfig(initial_project_type, referenced_package_id, referenced_producer_id) {
    const project_type_options = [
      { value: 'ep_production', label: 'EP Production' },
      { value: 'single_production', label: 'Single Production' },
      { value: 'album_production', label: 'Album Production' },
      { value: 'mixing_only', label: 'Mixing Only' },
      { value: 'mastering_only', label: 'Mastering Only' },
      { value: 'advertising_campaign', label: 'Advertising Campaign' },
      { value: 'other', label: 'Other' }
    ];

    const budget_currency_options = [
      { value: 'usd', label: 'USD' },
      { value: 'eur', label: 'EUR' },
      { value: 'gbp', label: 'GBP' },
      { value: 'other', label: 'Other' }
    ];

    const default_values = {
      project_type: initial_project_type || 'ep_production',
      number_of_songs: null,
      budget_currency: 'usd',
      budget_amount: null,
      deadline: null,
      name: '',
      email: '',
      project_description: '',
      referenced_package_id: referenced_package_id || null,
      referenced_producer_id: referenced_producer_id || null
    };

    return {
      project_type_options: project_type_options,
      budget_currency_options: budget_currency_options,
      default_values: default_values
    };
  }

  submitProjectInquiry(project_type, number_of_songs, budget_amount, budget_currency, deadline, name, email, phone, project_description, referenced_package_id, referenced_producer_id) {
    if (!project_type || !name || !email) {
      return {
        success: false,
        inquiry_id: null,
        status: null,
        submitted_at: null,
        message: 'project_type, name, and email are required'
      };
    }

    const payload = {
      project_type: project_type,
      number_of_songs: typeof number_of_songs === 'number' ? number_of_songs : null,
      budget_amount: typeof budget_amount === 'number' ? budget_amount : null,
      budget_currency: budget_currency || 'usd',
      deadline: deadline || null,
      name: name,
      email: email,
      phone: phone || null,
      project_description: project_description || '',
      referenced_package_id: referenced_package_id || null,
      referenced_producer_id: referenced_producer_id || null
    };

    const inquiry = this._createProjectInquiryRecord(payload);

    return {
      success: true,
      inquiry_id: inquiry.id,
      status: inquiry.status,
      submitted_at: inquiry.submitted_at,
      message: 'Project inquiry submitted'
    };
  }

  // ------------------- Booking / Studio Sessions -------------------

  getBookingSessionOptions() {
    const session_types = [
      { value: 'recording_session', label: 'Recording Session' },
      { value: 'mixing_session', label: 'Mixing Session' },
      { value: 'mastering_session', label: 'Mastering Session' },
      { value: 'writing_session', label: 'Writing Session' },
      { value: 'production_meeting', label: 'Production Meeting' },
      { value: 'rehearsal', label: 'Rehearsal' },
      { value: 'other', label: 'Other' }
    ];

    const duration_options_hours = [1, 2, 3, 4, 6, 8];

    return {
      session_types: session_types,
      duration_options_hours: duration_options_hours
    };
  }

  getBookingCalendar(session_type, year, month, duration_hours) {
    const y = typeof year === 'number' ? year : new Date().getFullYear();
    const m = typeof month === 'number' ? month : (new Date().getMonth() + 1);
    const duration = typeof duration_hours === 'number' && duration_hours > 0 ? duration_hours : 1;

    const slots = this._computeAvailableBookingSlots(session_type, y, m, duration);

    const dayMap = {};
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const dateStr = slot.start_datetime ? slot.start_datetime.slice(0, 10) : null;
      if (!dateStr) continue;
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = {
          date: dateStr,
          is_weekday: !!slot.is_weekday,
          slots: []
        };
      }
      dayMap[dateStr].slots.push({
        id: slot.id,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        duration_hours: slot.duration_hours,
        is_weekday: !!slot.is_weekday,
        is_evening: !!slot.is_evening,
        is_available: !!slot.is_available,
        supports_requested_duration: !!slot.supports_requested_duration
      });
      if (slot.is_weekday) {
        dayMap[dateStr].is_weekday = true;
      }
    }

    const days = Object.keys(dayMap)
      .sort()
      .map(function (k) { return dayMap[k]; });

    return {
      year: y,
      month: m,
      days: days
    };
  }

  selectBookingSlot(bookingSlotId, session_type, duration_hours) {
    const bookingSlots = this._getFromStorage('booking_slots');
    const slot = bookingSlots.find(function (s) { return s.id === bookingSlotId; });
    if (!slot) {
      return {
        booking_id: null,
        session_type: session_type,
        start_datetime: null,
        end_datetime: null,
        duration_hours: duration_hours || null,
        status: null
      };
    }

    const booking = this._createStudioBookingFromSlot(slot, session_type, duration_hours || slot.duration_hours || 1);
    return {
      booking_id: booking.id,
      session_type: booking.session_type,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime,
      duration_hours: booking.duration_hours,
      status: booking.status
    };
  }

  getBookingReview(bookingId) {
    const bookings = this._getFromStorage('studio_bookings');
    const booking = bookings.find(function (b) { return b.id === bookingId; });
    if (!booking) {
      return {
        booking_id: null,
        session_type: null,
        start_datetime: null,
        end_datetime: null,
        duration_hours: null,
        status: null
      };
    }
    return {
      booking_id: booking.id,
      session_type: booking.session_type,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime,
      duration_hours: booking.duration_hours,
      status: booking.status
    };
  }

  confirmStudioBooking(bookingId, notes) {
    if (!bookingId) {
      return {
        success: false,
        booking_id: null,
        status: null,
        message: 'bookingId is required'
      };
    }
    const updated = this._updateStudioBookingStatus(bookingId, 'confirmed', notes || null);
    if (!updated) {
      return {
        success: false,
        booking_id: bookingId,
        status: null,
        message: 'Booking not found'
      };
    }
    return {
      success: true,
      booking_id: bookingId,
      status: updated.status,
      message: 'Booking confirmed'
    };
  }

  // ------------------- Team / Producers -------------------

  getTeamFilterOptions() {
    const members = this._getFromStorage('team_members');
    const roleSet = {};
    const specSet = {};
    const expSet = {};

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (m.role) roleSet[m.role] = true;
      if (Array.isArray(m.specializations)) {
        for (let j = 0; j < m.specializations.length; j++) {
          specSet[m.specializations[j]] = true;
        }
      }
      if (typeof m.years_experience === 'number') {
        expSet[m.years_experience] = true;
      }
    }

    const roles = Object.keys(roleSet).map(function (val) {
      return { value: val, label: val.split('_').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ') };
    });

    const specializations = Object.keys(specSet);

    const experience_thresholds_years = Object.keys(expSet)
      .map(function (v) { return parseInt(v, 10); })
      .sort(function (a, b) { return a - b; });

    return {
      roles: roles,
      specializations: specializations,
      experience_thresholds_years: experience_thresholds_years
    };
  }

  listTeamMembers(role, specialization, min_years_experience, page, page_size) {
    const members = this._getFromStorage('team_members').filter(function (m) { return m.is_active !== false; });
    let filtered = members.slice();

    if (role) {
      filtered = filtered.filter(function (m) { return m.role === role; });
    }

    if (specialization) {
      const specLower = specialization.toLowerCase();
      filtered = filtered.filter(function (m) {
        let match = false;
        if (Array.isArray(m.specializations)) {
          for (let i = 0; i < m.specializations.length; i++) {
            if (String(m.specializations[i]).toLowerCase() === specLower) {
              match = true;
              break;
            }
          }
        }
        if (!match && m.primary_genre) {
          if (String(m.primary_genre).toLowerCase() === specLower) match = true;
        }
        return match;
      });
    }

    if (typeof min_years_experience === 'number') {
      filtered = filtered.filter(function (m) { return (m.years_experience || 0) >= min_years_experience; });
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;

    const items = filtered.slice(startIndex, endIndex).map(function (m) {
      return {
        id: m.id,
        name: m.name,
        role: m.role,
        specializations: m.specializations || [],
        primary_genre: m.primary_genre || null,
        years_experience: m.years_experience || 0,
        bio_excerpt: (m.bio || '').slice(0, 200),
        photo_url: m.photo_url || null
      };
    });

    return {
      items: items,
      total_count: filtered.length,
      page: currentPage,
      page_size: size
    };
  }

  getProducerProfile(teamMemberId) {
    const members = this._getFromStorage('team_members');
    const tracks = this._getFromStorage('tracks');

    const m = members.find(function (mem) { return mem.id === teamMemberId; });
    if (!m) {
      return {
        producer: null,
        featured_tracks: []
      };
    }

    const producer = {
      id: m.id,
      name: m.name,
      role: m.role,
      specializations: m.specializations || [],
      primary_genre: m.primary_genre || null,
      years_experience: m.years_experience || 0,
      bio: m.bio || '',
      photo_url: m.photo_url || null
    };

    const self = this;
    let featured_tracks = Array.isArray(m.featured_track_ids)
      ? m.featured_track_ids.map(function (tid, index) {
          const t = tracks.find(function (tr) { return tr.id === tid; });
          if (!t) return null;
          return {
            track_id: t.id,
            title: t.title,
            genre: t.genre,
            duration_seconds: t.duration_seconds,
            formatted_duration: self._formatDuration(t.duration_seconds),
            audio_url: t.audio_url,
            artwork_url: t.artwork_url || null,
            is_top_track: index === 0
          };
        }).filter(function (x) { return !!x; })
      : [];

    // Fallback: if no explicit featured tracks could be resolved from IDs,
    // derive a few popular tracks from the catalog so the profile remains useful.
    if (!featured_tracks.length) {
      featured_tracks = tracks
        .filter(function (t) { return t.is_active !== false; })
        .slice()
        .sort(function (a, b) { return (b.popularity_score || 0) - (a.popularity_score || 0); })
        .slice(0, 3)
        .map(function (t, index) {
          return {
            track_id: t.id,
            title: t.title,
            genre: t.genre,
            duration_seconds: t.duration_seconds,
            formatted_duration: self._formatDuration(t.duration_seconds),
            audio_url: t.audio_url,
            artwork_url: t.artwork_url || null,
            is_top_track: index === 0
          };
        });
    }

    return {
      producer: producer,
      featured_tracks: featured_tracks
    };
  }

  // ------------------- Testimonials -------------------

  getTestimonialFilterOptions() {
    const testimonials = this._getFromStorage('testimonials');
    const clientTypeSet = {};
    const ratingSet = {};

    for (let i = 0; i < testimonials.length; i++) {
      const t = testimonials[i];
      if (t.client_type) clientTypeSet[t.client_type] = true;
      if (t.rating) ratingSet[t.rating] = true;
    }

    const client_types = Object.keys(clientTypeSet).map(function (val) {
      return { value: val, label: val.split('_').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ') };
    });

    const rating_options = Object.keys(ratingSet)
      .sort(function (a, b) { return parseInt(b, 10) - parseInt(a, 10); })
      .map(function (val) {
        return { value: val, label: val + ' Stars' };
      });

    return {
      client_types: client_types,
      rating_options: rating_options
    };
  }

  listTestimonials(client_type, rating, page, page_size) {
    const testimonials = this._getFromStorage('testimonials');
    let filtered = testimonials.slice();

    if (client_type) {
      filtered = filtered.filter(function (t) { return t.client_type === client_type; });
    }
    if (rating) {
      filtered = filtered.filter(function (t) { return t.rating === rating; });
    }

    filtered.sort(function (a, b) {
      const ad = a.created_date ? new Date(a.created_date).getTime() : 0;
      const bd = b.created_date ? new Date(b.created_date).getTime() : 0;
      return bd - ad;
    });

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;

    const items = filtered.slice(startIndex, endIndex).map(function (t) {
      return {
        id: t.id,
        client_name: t.client_name || null,
        client_type: t.client_type,
        rating: t.rating,
        title: t.title || '',
        excerpt: t.excerpt || '',
        related_service: t.related_service || null
      };
    });

    return {
      items: items,
      total_count: filtered.length,
      page: currentPage,
      page_size: size
    };
  }

  getTestimonialDetail(testimonialId) {
    const testimonials = this._getFromStorage('testimonials');
    const caseStudies = this._getFromStorage('case_studies');

    const t = testimonials.find(function (ts) { return ts.id === testimonialId; });
    if (!t) {
      return {
        testimonial: null
      };
    }

    const relatedCaseStudy = t.related_case_study_id
      ? caseStudies.find(function (cs) { return cs.id === t.related_case_study_id; })
      : null;

    const testimonial = {
      id: t.id,
      client_name: t.client_name || null,
      client_type: t.client_type,
      rating: t.rating,
      title: t.title || '',
      full_text: t.full_text || '',
      related_service: t.related_service || null,
      related_case_study_id: t.related_case_study_id || null,
      // Foreign key resolution
      related_case_study: relatedCaseStudy || null
    };

    // Instrumentation for task completion tracking (task_9)
    try {
      var existingRaw = localStorage.getItem('task9_openedTestimonialIds');
      var existingData = null;
      if (existingRaw) {
        try {
          existingData = JSON.parse(existingRaw);
        } catch (e2) {
          existingData = null;
        }
      }
      if (!existingData || typeof existingData !== 'object') {
        existingData = { opened: [] };
      }
      if (!Array.isArray(existingData.opened)) {
        existingData.opened = [];
      }
      var alreadyOpened = false;
      for (var i = 0; i < existingData.opened.length; i++) {
        var entry = existingData.opened[i];
        if (entry && entry.id === t.id) {
          alreadyOpened = true;
          break;
        }
      }
      if (!alreadyOpened) {
        existingData.opened.push({
          id: t.id,
          client_type: t.client_type,
          rating: t.rating
        });
      }
      localStorage.setItem('task9_openedTestimonialIds', JSON.stringify(existingData));
    } catch (e) {}

    return {
      testimonial: testimonial
    };
  }

  // ------------------- Resources / Downloads -------------------

  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources');
    const categorySet = {};
    const yearSet = {};

    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      if (r.category) categorySet[r.category] = true;
      if (typeof r.year === 'number') yearSet[r.year] = true;
    }

    const categories = Object.keys(categorySet).map(function (val) {
      return { value: val, label: val.split('_').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ') };
    });

    const years = Object.keys(yearSet)
      .map(function (v) { return parseInt(v, 10); })
      .sort(function (a, b) { return b - a; });

    return {
      categories: categories,
      years: years
    };
  }

  listResourceItems(category, year, page, page_size) {
    const resources = this._getFromStorage('resources').filter(function (r) { return r.is_active !== false; });
    let filtered = resources.slice();

    if (category) {
      filtered = filtered.filter(function (r) { return r.category === category; });
    }
    if (typeof year === 'number') {
      filtered = filtered.filter(function (r) { return r.year === year; });
    }

    filtered.sort(function (a, b) {
      const ay = a.year || 0;
      const by = b.year || 0;
      if (by !== ay) return by - ay;
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bd - ad;
    });

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;

    const items = filtered.slice(startIndex, endIndex).map(function (r) {
      return {
        id: r.id,
        title: r.title,
        description: r.description || '',
        category: r.category,
        year: r.year || null,
        file_type: r.file_type,
        is_active: r.is_active !== false
      };
    });

    return {
      items: items,
      total_count: filtered.length,
      page: currentPage,
      page_size: size
    };
  }

  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const r = resources.find(function (res) { return res.id === resourceId; });
    if (!r) {
      return {
        resource: null
      };
    }
    const resource = {
      id: r.id,
      title: r.title,
      description: r.description || '',
      category: r.category,
      year: r.year || null,
      file_type: r.file_type,
      file_url: r.file_url,
      is_active: r.is_active !== false
    };
    return {
      resource: resource
    };
  }

  downloadResource(resourceId) {
    const resources = this._getFromStorage('resources');
    const r = resources.find(function (res) { return res.id === resourceId; });
    if (!r) {
      return {
        success: false,
        resource_id: resourceId,
        file_url: null,
        file_type: null
      };
    }

    // Instrumentation for task completion tracking (task_7)
    try {
      localStorage.setItem('task7_downloadedResourceId', String(r.id));
    } catch (e) {}

    return {
      success: true,
      resource_id: r.id,
      file_url: r.file_url,
      file_type: r.file_type
    };
  }

  // ------------------- Playback -------------------

  startTrackPlayback(trackId, context_page) {
    if (!trackId) {
      const current = this._getCurrentPlaybackState();
      return {
        is_playing: current.is_playing,
        track_id: current.track_id,
        context_page: current.context_page
      };
    }

    const tracks = this._getFromStorage('tracks');
    const exists = tracks.some(function (t) { return t.id === trackId; });
    if (!exists) {
      const current = this._getCurrentPlaybackState();
      return {
        is_playing: current.is_playing,
        track_id: current.track_id,
        context_page: current.context_page
      };
    }

    const state = {
      is_playing: true,
      track_id: trackId,
      context_page: context_page || null,
      started_at: new Date().toISOString()
    };
    this._setCurrentPlaybackState(state);

    return {
      is_playing: true,
      track_id: trackId,
      context_page: context_page || null
    };
  }

  pauseTrackPlayback(trackId) {
    const current = this._getCurrentPlaybackState();

    if (trackId && current.track_id && trackId !== current.track_id) {
      // Requested to pause a different track; keep current state
      return {
        is_playing: current.is_playing,
        track_id: current.track_id
      };
    }

    const newState = {
      is_playing: false,
      track_id: current.track_id,
      context_page: current.context_page,
      started_at: current.started_at
    };
    this._setCurrentPlaybackState(newState);

    return {
      is_playing: false,
      track_id: current.track_id
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