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

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      'pages',
      'navigation_links',
      'profiles',
      'profile_appearances',
      'theme_presets',
      'links',
      'sections',
      'section_items',
      'youtube_videos',
      'youtube_playlists',
      'link_analytics_daily',
      'qr_codes'
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
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
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

  _nowIso() {
    return new Date().toISOString();
  }

  _findProfileById(profileId) {
    const profiles = this._getFromStorage('profiles');
    return profiles.find(function (p) { return p.id === profileId; }) || null;
  }

  _findThemePresetById(themePresetId) {
    const presets = this._getFromStorage('theme_presets');
    return presets.find(function (t) { return t.id === themePresetId; }) || null;
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _isWithinRange(dateStr, startDate, endDate) {
    const d = this._parseDate(dateStr);
    if (!d) return false;
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  }

  _isLinkVisibleForPublic(link, now) {
    if (!link) return false;
    if (link.status === 'archived') return false;
    if (!link.is_visible) return false;
    if (link.schedule_visibility_rule === 'scheduled') {
      const start = this._parseDate(link.schedule_start);
      const end = this._parseDate(link.schedule_end);
      if (start && now < start) return false;
      if (end && now > end) return false;
    }
    return true;
  }

  // Internal helper to aggregate click counts from LinkAnalyticsDaily over a date range for each link.
  _aggregateLinkClicks(linkIds, startDate, endDate) {
    const analytics = this._getFromStorage('link_analytics_daily');
    const idSet = {};
    for (let i = 0; i < linkIds.length; i++) {
      idSet[linkIds[i]] = true;
    }
    const resultMap = {};
    for (let j = 0; j < analytics.length; j++) {
      const row = analytics[j];
      if (!idSet[row.link_id]) continue;
      if (!this._isWithinRange(row.date, startDate, endDate)) continue;
      if (!resultMap[row.link_id]) {
        resultMap[row.link_id] = {
          total_clicks: 0,
          total_impressions: 0,
          per_day: {}
        };
      }
      const entry = resultMap[row.link_id];
      const clicks = typeof row.clicks === 'number' ? row.clicks : 0;
      const imps = typeof row.impressions === 'number' ? row.impressions : 0;
      entry.total_clicks += clicks;
      entry.total_impressions += imps;
      const dayKey = row.date;
      if (!entry.per_day[dayKey]) {
        entry.per_day[dayKey] = 0;
      }
      entry.per_day[dayKey] += clicks;
    }
    // Convert per_day maps to sorted arrays
    const linkIdsArr = Object.keys(resultMap);
    for (let k = 0; k < linkIdsArr.length; k++) {
      const lid = linkIdsArr[k];
      const perDayMap = resultMap[lid].per_day;
      const dates = Object.keys(perDayMap).sort();
      const clicksPerDay = [];
      for (let d = 0; d < dates.length; d++) {
        clicksPerDay.push({ date: dates[d], clicks: perDayMap[dates[d]] });
      }
      resultMap[lid].clicks_per_day = clicksPerDay;
      delete resultMap[lid].per_day;
    }
    return resultMap;
  }

  // Internal helper to order and filter links for a profile or section.
  _applyProfileOrderingAndVisibility(links, mode, options) {
    const opts = options || {};
    const respectVisibility = !!opts.respect_visibility;
    const respectSchedule = !!opts.respect_schedule;
    const excludeArchived = !!opts.exclude_archived;
    const now = new Date();

    let filtered = links.slice();
    if (excludeArchived || respectVisibility || respectSchedule) {
      filtered = [];
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        if (excludeArchived && l.status === 'archived') continue;
        if (respectVisibility && !l.is_visible) continue;
        if (respectSchedule) {
          if (l.schedule_visibility_rule === 'scheduled') {
            const start = this._parseDate(l.schedule_start);
            const end = this._parseDate(l.schedule_end);
            if (start && now < start) continue;
            if (end && now > end) continue;
          }
        }
        filtered.push(l);
      }
    }

    const youtubeVideos = this._getFromStorage('youtube_videos');
    const videoMap = {};
    for (let v = 0; v < youtubeVideos.length; v++) {
      videoMap[youtubeVideos[v].id] = youtubeVideos[v];
    }

    const m = mode || 'manual';

    filtered.sort(function (a, b) {
      function parseDateSafe(str) {
        const d = new Date(str || 0);
        if (isNaN(d.getTime())) return 0;
        return d.getTime();
      }
      function posVal(x) {
        return typeof x.position === 'number' ? x.position : Number.MAX_SAFE_INTEGER;
      }
      if (m === 'duration_short_to_long') {
        const va = a.youtube_video_id ? videoMap[a.youtube_video_id] : null;
        const vb = b.youtube_video_id ? videoMap[b.youtube_video_id] : null;
        const da = va ? va.duration_seconds : Number.MAX_SAFE_INTEGER;
        const db = vb ? vb.duration_seconds : Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        return parseDateSafe(a.created_at) - parseDateSafe(b.created_at);
      }
      if (m === 'pinned_first_then_newest') {
        const pa = a.is_pinned ? 1 : 0;
        const pb = b.is_pinned ? 1 : 0;
        if (pa !== pb) return pb - pa; // pinned first
        const ca = parseDateSafe(a.created_at);
        const cb = parseDateSafe(b.created_at);
        return cb - ca; // newest first
      }
      if (m === 'newest_first') {
        const ca = parseDateSafe(a.created_at);
        const cb = parseDateSafe(b.created_at);
        return cb - ca;
      }
      if (m === 'oldest_first') {
        const ca = parseDateSafe(a.created_at);
        const cb = parseDateSafe(b.created_at);
        return ca - cb;
      }
      if (m === 'title_a_z') {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      // default manual/custom: position then created_at asc
      const pa = posVal(a);
      const pb = posVal(b);
      if (pa !== pb) return pa - pb;
      const ca = parseDateSafe(a.created_at);
      const cb = parseDateSafe(b.created_at);
      return ca - cb;
    });

    return filtered;
  }

  // Internal helper to fetch or initialize ProfileAppearance for a profile before updates.
  _getOrCreateProfileAppearance(profileId) {
    let appearances = this._getFromStorage('profile_appearances');
    let appearance = appearances.find(function (a) { return a.profile_id === profileId; }) || null;
    if (!appearance) {
      appearance = {
        id: this._generateId('appearance'),
        profile_id: profileId,
        theme_preset_id: null,
        background_color: null,
        is_dark: false,
        accent_color: null,
        button_style: 'square',
        layout: 'one_column',
        show_youtube_thumbnails: true,
        updated_at: this._nowIso()
      };
      appearances.push(appearance);
      this._saveToStorage('profile_appearances', appearances);
    }
    return appearance;
  }

  // ===================== Core Interfaces =====================

  // getHomePageInfo()
  getHomePageInfo() {
    const profiles = this._getFromStorage('profiles');
    const publishedProfiles = profiles.filter(function (p) { return p.status === 'published'; });
    const exampleProfiles = profiles.slice(0, 3).map(function (p) {
      return {
        id: p.id,
        name: p.name,
        username: p.username,
        status: p.status
      };
    });

    return {
      headline: 'Your personal YouTube link hub in one profile',
      subheadline: 'Collect videos, playlists, and announcements into a single sharable page.',
      feature_highlights: [
        {
          title: 'Profiles for every channel or project',
          description: 'Create multiple profiles like My YouTube Hub, Travel Vlogs, or Creator Hub.'
        },
        {
          title: 'Smart link ordering and pinning',
          description: 'Sort links by duration, clicks, newest, or pin important announcements to the top.'
        },
        {
          title: 'Analytics and scheduling',
          description: 'See which links perform best and schedule time-bound announcement links.'
        }
      ],
      profile_summary: {
        total_profiles: profiles.length,
        published_profiles: publishedProfiles.length,
        example_profiles: exampleProfiles
      },
      primary_ctas: {
        start_profile_label: 'Start a new profile',
        dashboard_label: 'Go to dashboard'
      }
    };
  }

  // createProfileDraft(name, username, bio)
  createProfileDraft(name, username, bio) {
    if (!name || !username) {
      return {
        success: false,
        profile: null,
        message: 'Name and username are required.'
      };
    }
    const profiles = this._getFromStorage('profiles');
    const existing = profiles.find(function (p) { return p.username === username; });
    if (existing) {
      return {
        success: false,
        profile: null,
        message: 'Username already exists.'
      };
    }
    const now = this._nowIso();
    const profile = {
      id: this._generateId('profile'),
      name: name,
      username: username,
      bio: bio || '',
      status: 'draft',
      public_url: '/' + username,
      default_link_order_mode: 'manual',
      show_archive_on_public_profile: true,
      created_at: now,
      updated_at: now,
      published_at: null
    };
    profiles.push(profile);
    this._saveToStorage('profiles', profiles);

    return {
      success: true,
      profile: profile,
      message: 'Profile draft created.'
    };
  }

  // getDashboardProfiles(search_query, status_filter)
  getDashboardProfiles(search_query, status_filter) {
    const profiles = this._getFromStorage('profiles');
    const links = this._getFromStorage('links');
    const query = (search_query || '').toLowerCase();
    const statusFilter = status_filter || 'all';

    const filtered = profiles.filter(function (p) {
      if (statusFilter !== 'all' && statusFilter && p.status !== statusFilter) return false;
      if (query) {
        const nameMatch = (p.name || '').toLowerCase().indexOf(query) !== -1;
        const userMatch = (p.username || '').toLowerCase().indexOf(query) !== -1;
        if (!nameMatch && !userMatch) return false;
      }
      return true;
    });

    const result = [];
    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      const linkCount = links.filter(function (l) { return l.profile_id === p.id; }).length;
      result.push({
        id: p.id,
        name: p.name,
        username: p.username,
        status: p.status,
        public_url: p.public_url,
        link_count: linkCount,
        created_at: p.created_at,
        updated_at: p.updated_at,
        published_at: p.published_at
      });
    }
    return result;
  }

  // duplicateProfile(sourceProfileId, name, username)
  duplicateProfile(sourceProfileId, name, username) {
    const profiles = this._getFromStorage('profiles');
    const source = profiles.find(function (p) { return p.id === sourceProfileId; }) || null;
    if (!source) {
      return {
        success: false,
        profile: null,
        message: 'Source profile not found.'
      };
    }
    if (!name || !username) {
      return {
        success: false,
        profile: null,
        message: 'Name and username are required.'
      };
    }
    const existingUsername = profiles.find(function (p) { return p.username === username; });
    if (existingUsername) {
      return {
        success: false,
        profile: null,
        message: 'Username already exists.'
      };
    }

    const now = this._nowIso();
    const newProfile = {
      id: this._generateId('profile'),
      name: name,
      username: username,
      bio: source.bio || '',
      status: 'draft',
      public_url: '/' + username,
      default_link_order_mode: source.default_link_order_mode || 'manual',
      show_archive_on_public_profile: source.show_archive_on_public_profile,
      created_at: now,
      updated_at: now,
      published_at: null
    };
    profiles.push(newProfile);
    this._saveToStorage('profiles', profiles);

    // Duplicate links
    let links = this._getFromStorage('links');
    const linkMap = {}; // oldId -> newId
    const newLinks = [];
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      if (l.profile_id !== source.id) continue;
      const newLink = {
        id: this._generateId('link'),
        profile_id: newProfile.id,
        type: l.type,
        title: l.title,
        url: l.url,
        youtube_video_id: l.youtube_video_id || null,
        youtube_playlist_id: l.youtube_playlist_id || null,
        language: l.language || null,
        is_pinned: l.is_pinned,
        is_visible: l.is_visible,
        status: l.status,
        schedule_visibility_rule: l.schedule_visibility_rule,
        schedule_start: l.schedule_start || null,
        schedule_end: l.schedule_end || null,
        is_announcement: !!l.is_announcement,
        source: l.source || null,
        position: typeof l.position === 'number' ? l.position : null,
        created_at: now,
        updated_at: now
      };
      linkMap[l.id] = newLink.id;
      newLinks.push(newLink);
    }
    links = links.concat(newLinks);
    this._saveToStorage('links', links);

    // Duplicate sections
    let sections = this._getFromStorage('sections');
    const sectionMap = {}; // oldId -> newId
    const newSections = [];
    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      if (sec.profile_id !== source.id) continue;
      const newSec = {
        id: this._generateId('section'),
        profile_id: newProfile.id,
        title: sec.title,
        type: sec.type,
        sort_mode: sec.sort_mode,
        layout_style: sec.layout_style,
        show_at_top_of_profile: sec.show_at_top_of_profile,
        position: typeof sec.position === 'number' ? sec.position : null,
        created_at: now,
        updated_at: now
      };
      sectionMap[sec.id] = newSec.id;
      newSections.push(newSec);
    }
    sections = sections.concat(newSections);
    this._saveToStorage('sections', sections);

    // Duplicate section_items
    let sectionItems = this._getFromStorage('section_items');
    const newSectionItems = [];
    for (let si = 0; si < sectionItems.length; si++) {
      const item = sectionItems[si];
      const newSectionId = sectionMap[item.section_id];
      const newLinkId = linkMap[item.link_id];
      if (!newSectionId || !newLinkId) continue;
      const newItem = {
        id: this._generateId('section_item'),
        section_id: newSectionId,
        link_id: newLinkId,
        position: item.position
      };
      newSectionItems.push(newItem);
    }
    sectionItems = sectionItems.concat(newSectionItems);
    this._saveToStorage('section_items', sectionItems);

    // Duplicate appearance if exists
    let appearances = this._getFromStorage('profile_appearances');
    const srcApp = appearances.find(function (a) { return a.profile_id === source.id; }) || null;
    if (srcApp) {
      const newApp = {
        id: this._generateId('appearance'),
        profile_id: newProfile.id,
        theme_preset_id: srcApp.theme_preset_id || null,
        background_color: srcApp.background_color || null,
        is_dark: !!srcApp.is_dark,
        accent_color: srcApp.accent_color || null,
        button_style: srcApp.button_style,
        layout: srcApp.layout,
        show_youtube_thumbnails: !!srcApp.show_youtube_thumbnails,
        updated_at: now
      };
      appearances.push(newApp);
      this._saveToStorage('profile_appearances', appearances);
    }

    return {
      success: true,
      profile: {
        id: newProfile.id,
        name: newProfile.name,
        username: newProfile.username,
        status: newProfile.status,
        public_url: newProfile.public_url
      },
      message: 'Profile duplicated.'
    };
  }

  // getProfileEditorOverview(profileId)
  getProfileEditorOverview(profileId) {
    const profile = this._findProfileById(profileId);
    if (!profile) {
      return {
        profile: null,
        stats: {
          total_links: 0,
          active_links: 0,
          archived_links: 0,
          sections_count: 0
        }
      };
    }
    const links = this._getFromStorage('links');
    const sections = this._getFromStorage('sections');
    let totalLinks = 0;
    let activeLinks = 0;
    let archivedLinks = 0;
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      if (l.profile_id !== profile.id) continue;
      totalLinks++;
      if (l.status === 'archived') archivedLinks++; else activeLinks++;
    }
    const sectionsCount = sections.filter(function (s) { return s.profile_id === profile.id; }).length;
    return {
      profile: profile,
      stats: {
        total_links: totalLinks,
        active_links: activeLinks,
        archived_links: archivedLinks,
        sections_count: sectionsCount
      }
    };
  }

  // publishProfile(profileId)
  publishProfile(profileId) {
    const profiles = this._getFromStorage('profiles');
    const idx = profiles.findIndex(function (p) { return p.id === profileId; });
    if (idx === -1) {
      return {
        success: false,
        profile: null,
        message: 'Profile not found.'
      };
    }
    const now = this._nowIso();
    const profile = profiles[idx];
    profile.status = 'published';
    profile.published_at = profile.published_at || now;
    profile.updated_at = now;
    if (!profile.public_url) {
      profile.public_url = '/' + profile.username;
    }
    profiles[idx] = profile;
    this._saveToStorage('profiles', profiles);
    return {
      success: true,
      profile: profile,
      message: 'Profile published.'
    };
  }

  // updateProfileDefaultLinkOrder(profileId, default_link_order_mode)
  updateProfileDefaultLinkOrder(profileId, default_link_order_mode) {
    const allowed = ['manual', 'duration_short_to_long', 'pinned_first_then_newest', 'newest_first', 'oldest_first'];
    if (allowed.indexOf(default_link_order_mode) === -1) {
      return {
        success: false,
        profile: null,
        message: 'Invalid default_link_order_mode.'
      };
    }
    const profiles = this._getFromStorage('profiles');
    const idx = profiles.findIndex(function (p) { return p.id === profileId; });
    if (idx === -1) {
      return {
        success: false,
        profile: null,
        message: 'Profile not found.'
      };
    }
    const now = this._nowIso();
    profiles[idx].default_link_order_mode = default_link_order_mode;
    profiles[idx].updated_at = now;
    this._saveToStorage('profiles', profiles);
    return {
      success: true,
      profile: profiles[idx],
      message: 'Default link order updated.'
    };
  }

  // updateProfileArchiveVisibility(profileId, show_archive_on_public_profile)
  updateProfileArchiveVisibility(profileId, show_archive_on_public_profile) {
    const profiles = this._getFromStorage('profiles');
    const idx = profiles.findIndex(function (p) { return p.id === profileId; });
    if (idx === -1) {
      return {
        success: false,
        profile: null,
        message: 'Profile not found.'
      };
    }
    const now = this._nowIso();
    profiles[idx].show_archive_on_public_profile = !!show_archive_on_public_profile;
    profiles[idx].updated_at = now;
    this._saveToStorage('profiles', profiles);
    return {
      success: true,
      profile: profiles[idx],
      message: 'Archive visibility updated.'
    };
  }

  // getProfileLinksForEditor(profileId, filters, order_mode)
  getProfileLinksForEditor(profileId, filters, order_mode) {
    const profile = this._findProfileById(profileId);
    if (!profile) return [];

    const allLinks = this._getFromStorage('links');
    const youtubeVideos = this._getFromStorage('youtube_videos');
    const youtubePlaylists = this._getFromStorage('youtube_playlists');
    const profiles = this._getFromStorage('profiles');

    const videoMap = {};
    for (let v = 0; v < youtubeVideos.length; v++) {
      videoMap[youtubeVideos[v].id] = youtubeVideos[v];
    }
    const playlistMap = {};
    for (let p = 0; p < youtubePlaylists.length; p++) {
      playlistMap[youtubePlaylists[p].id] = youtubePlaylists[p];
    }
    const profileMap = {};
    for (let pr = 0; pr < profiles.length; pr++) {
      profileMap[profiles[pr].id] = profiles[pr];
    }

    const f = filters || {};
    const statusFilter = f.status || 'all';
    const languageFilter = f.language || null;
    const visibleOnly = !!f.visible_only;

    let links = allLinks.filter(function (l) { return l.profile_id === profileId; });

    if (statusFilter && statusFilter !== 'all') {
      links = links.filter(function (l) { return l.status === statusFilter; });
    }
    if (languageFilter) {
      links = links.filter(function (l) { return l.language === languageFilter; });
    }
    if (visibleOnly) {
      links = links.filter(function (l) { return l.is_visible; });
    }

    // Ordering
    const mode = order_mode || profile.default_link_order_mode || 'manual';
    links = this._applyProfileOrderingAndVisibility(links, mode, {
      respect_visibility: false,
      respect_schedule: false,
      exclude_archived: false
    });

    const now = new Date();
    const start7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const linkIds = links.map(function (l) { return l.id; });
    const clicks7Map = this._aggregateLinkClicks(linkIds, start7, now);
    const clicks30Map = this._aggregateLinkClicks(linkIds, start30, now);

    const result = [];
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const c7 = clicks7Map[l.id] ? clicks7Map[l.id].total_clicks : 0;
      const c30 = clicks30Map[l.id] ? clicks30Map[l.id].total_clicks : 0;
      const smallLabel = c7 + ' clicks';

      const expandedLink = Object.assign({}, l, {
        profile: profileMap[l.profile_id] || null,
        youtube_video: l.youtube_video_id ? (videoMap[l.youtube_video_id] || null) : null,
        youtube_playlist: l.youtube_playlist_id ? (playlistMap[l.youtube_playlist_id] || null) : null
      });

      result.push({
        link: expandedLink,
        small_click_metric_label: smallLabel,
        clicks_last_7_days: c7,
        clicks_last_30_days: c30
      });
    }
    return result;
  }

  // searchYouTubeVideos(query, filters, sort_by)
  searchYouTubeVideos(query, filters, sort_by) {
    const videos = this._getFromStorage('youtube_videos');
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const sourceMode = f.source_mode || 'any';
    const yearFilter = f.year || null;
    const durationMax = typeof f.duration_max_seconds === 'number' ? f.duration_max_seconds : null;
    const languageFilter = f.language || null;
    const publicOnly = !!f.is_public_only;

    let results = videos.filter(function (v) {
      if (sourceMode === 'my_uploads_only' && !v.is_from_my_uploads) return false;
      if (publicOnly && !v.is_public) return false;
      if (languageFilter && v.language && v.language !== languageFilter) return false;
      if (yearFilter && v.uploaded_at) {
        const d = new Date(v.uploaded_at);
        const y = d.getUTCFullYear().toString();
        if (y !== yearFilter) return false;
      }
      if (durationMax !== null && typeof v.duration_seconds === 'number' && v.duration_seconds > durationMax) return false;
      if (q && q !== 'podcast' && q !== 'music' && q !== 'travel') {
        const titleMatch = (v.title || '').toLowerCase().indexOf(q) !== -1;
        const channelMatch = (v.channel_name || '').toLowerCase().indexOf(q) !== -1;
        if (!titleMatch && !channelMatch) return false;
      }
      return true;
    });

    const sortBy = sort_by || 'relevance';
    results.sort(function (a, b) {
      if (sortBy === 'newest_first') {
        const da = new Date(a.uploaded_at || 0).getTime();
        const db = new Date(b.uploaded_at || 0).getTime();
        return db - da;
      }
      if (sortBy === 'duration_short_to_long') {
        const da = typeof a.duration_seconds === 'number' ? a.duration_seconds : Number.MAX_SAFE_INTEGER;
        const db = typeof b.duration_seconds === 'number' ? b.duration_seconds : Number.MAX_SAFE_INTEGER;
        return da - db;
      }
      // relevance: leave as-is
      return 0;
    });

    function formatDuration(seconds) {
      if (typeof seconds !== 'number' || isNaN(seconds)) return '';
      const s = Math.floor(seconds % 60);
      const m = Math.floor((seconds / 60) % 60);
      const h = Math.floor(seconds / 3600);
      function pad(n) { return n < 10 ? '0' + n : '' + n; }
      if (h > 0) {
        return h + ':' + pad(m) + ':' + pad(s);
      }
      return m + ':' + pad(s);
    }

    return results.map(function (v) {
      return {
        video: v,
        duration_label: formatDuration(v.duration_seconds)
      };
    });
  }

  // searchYouTubePlaylists(query, filters, sort_by)
  searchYouTubePlaylists(query, filters, sort_by) {
    const playlists = this._getFromStorage('youtube_playlists');
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const minVideoCount = typeof f.min_video_count === 'number' ? f.min_video_count : null;
    const languageFilter = f.language || null;
    const publicOnly = !!f.is_public_only;
    const fromMyUploads = typeof f.is_from_my_uploads === 'boolean' ? f.is_from_my_uploads : null;

    let results = playlists.filter(function (p) {
      if (minVideoCount !== null && typeof p.video_count === 'number' && p.video_count < minVideoCount) return false;
      if (publicOnly && !p.is_public) return false;
      if (languageFilter && p.language && p.language !== languageFilter) return false;
      if (fromMyUploads !== null) {
        if (!!p.is_from_my_uploads !== fromMyUploads) return false;
      }
      if (q && q !== 'music' && q !== 'travel') {
        const titleMatch = (p.title || '').toLowerCase().indexOf(q) !== -1;
        if (!titleMatch) return false;
      }
      return true;
    });

    const sortBy = sort_by || 'title_a_z';
    results.sort(function (a, b) {
      const ta = (a.title || '').toLowerCase();
      const tb = (b.title || '').toLowerCase();
      if (sortBy === 'title_a_z') {
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      if (sortBy === 'title_z_a') {
        if (ta < tb) return 1;
        if (ta > tb) return -1;
        return 0;
      }
      if (sortBy === 'newest_first') {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      }
      return 0;
    });

    return results.map(function (p) {
      return { playlist: p };
    });
  }

  // addYoutubeLinksToProfile(profileId, youtubeVideoIds, source)
  addYoutubeLinksToProfile(profileId, youtubeVideoIds, source) {
    const profile = this._findProfileById(profileId);
    if (!profile) {
      return { success: false, added_links: [], message: 'Profile not found.' };
    }
    const videos = this._getFromStorage('youtube_videos');
    let links = this._getFromStorage('links');

    const now = this._nowIso();
    const videoMap = {};
    for (let i = 0; i < videos.length; i++) {
      videoMap[videos[i].id] = videos[i];
    }

    const currentProfileLinks = links.filter(function (l) { return l.profile_id === profileId; });
    let maxPos = -1;
    for (let j = 0; j < currentProfileLinks.length; j++) {
      if (typeof currentProfileLinks[j].position === 'number' && currentProfileLinks[j].position > maxPos) {
        maxPos = currentProfileLinks[j].position;
      }
    }

    const addedLinks = [];
    for (let k = 0; k < youtubeVideoIds.length; k++) {
      const vidId = youtubeVideoIds[k];
      const video = videoMap[vidId];
      if (!video) continue;
      maxPos++;
      const link = {
        id: this._generateId('link'),
        profile_id: profileId,
        type: 'youtube_video',
        title: video.title,
        url: video.url,
        youtube_video_id: video.id,
        youtube_playlist_id: null,
        language: video.language || null,
        is_pinned: false,
        is_visible: true,
        status: 'active',
        schedule_visibility_rule: 'always',
        schedule_start: null,
        schedule_end: null,
        is_announcement: false,
        source: source || 'youtube_search',
        position: maxPos,
        created_at: now,
        updated_at: now
      };
      links.push(link);
      addedLinks.push(link);
    }

    this._saveToStorage('links', links);
    return {
      success: true,
      added_links: addedLinks,
      message: 'YouTube links added to profile.'
    };
  }

  // addCustomLinkToProfile(profileId, title, url, is_pinned, is_visible, schedule_visibility_rule, schedule_start, schedule_end, is_announcement)
  addCustomLinkToProfile(profileId, title, url, is_pinned, is_visible, schedule_visibility_rule, schedule_start, schedule_end, is_announcement) {
    const profile = this._findProfileById(profileId);
    if (!profile) {
      return { success: false, link: null, message: 'Profile not found.' };
    }
    if (!title || !url) {
      return { success: false, link: null, message: 'Title and URL are required.' };
    }
    let links = this._getFromStorage('links');
    const now = this._nowIso();

    const profileLinks = links.filter(function (l) { return l.profile_id === profileId; });
    let maxPos = -1;
    for (let i = 0; i < profileLinks.length; i++) {
      if (typeof profileLinks[i].position === 'number' && profileLinks[i].position > maxPos) {
        maxPos = profileLinks[i].position;
      }
    }
    maxPos++;

    const isPinnedVal = typeof is_pinned === 'boolean' ? is_pinned : false;
    const isVisibleVal = typeof is_visible === 'boolean' ? is_visible : true;
    const scheduleRule = schedule_visibility_rule || 'always';

    const link = {
      id: this._generateId('link'),
      profile_id: profileId,
      type: 'custom_external',
      title: title,
      url: url,
      youtube_video_id: null,
      youtube_playlist_id: null,
      language: null,
      is_pinned: isPinnedVal,
      is_visible: isVisibleVal,
      status: 'active',
      schedule_visibility_rule: scheduleRule,
      schedule_start: scheduleRule === 'scheduled' ? (schedule_start || null) : null,
      schedule_end: scheduleRule === 'scheduled' ? (schedule_end || null) : null,
      is_announcement: !!is_announcement,
      source: 'manual',
      position: maxPos,
      created_at: now,
      updated_at: now
    };

    links.push(link);
    this._saveToStorage('links', links);

    return {
      success: true,
      link: link,
      message: 'Custom link added.'
    };
  }

  // updateLinkSettings(linkId, is_pinned, is_visible, status, schedule_visibility_rule, schedule_start, schedule_end, is_announcement, position)
  updateLinkSettings(linkId, is_pinned, is_visible, status, schedule_visibility_rule, schedule_start, schedule_end, is_announcement, position) {
    let links = this._getFromStorage('links');
    const idx = links.findIndex(function (l) { return l.id === linkId; });
    if (idx === -1) {
      return { success: false, link: null, message: 'Link not found.' };
    }
    const link = links[idx];
    const now = this._nowIso();

    if (typeof is_pinned === 'boolean') {
      link.is_pinned = is_pinned;
    }
    if (typeof is_visible === 'boolean') {
      link.is_visible = is_visible;
    }
    if (status) {
      if (status === 'active' || status === 'archived') {
        link.status = status;
      }
    }
    if (schedule_visibility_rule) {
      link.schedule_visibility_rule = schedule_visibility_rule;
    }
    if (typeof schedule_start !== 'undefined') {
      link.schedule_start = schedule_start;
    }
    if (typeof schedule_end !== 'undefined') {
      link.schedule_end = schedule_end;
    }
    if (typeof is_announcement === 'boolean') {
      link.is_announcement = is_announcement;
    }
    if (typeof position === 'number') {
      link.position = position;
    }
    link.updated_at = now;
    links[idx] = link;
    this._saveToStorage('links', links);

    return {
      success: true,
      link: link,
      message: 'Link settings updated.'
    };
  }

  // bulkRemoveLinksFromProfile(linkIds)
  bulkRemoveLinksFromProfile(linkIds) {
    if (!Array.isArray(linkIds) || linkIds.length === 0) {
      return { success: true, removed_count: 0, message: 'No links specified.' };
    }
    const idSet = {};
    for (let i = 0; i < linkIds.length; i++) {
      idSet[linkIds[i]] = true;
    }

    let links = this._getFromStorage('links');
    const beforeCount = links.length;
    links = links.filter(function (l) { return !idSet[l.id]; });
    const removedCount = beforeCount - links.length;
    this._saveToStorage('links', links);

    // Remove related section_items
    let sectionItems = this._getFromStorage('section_items');
    sectionItems = sectionItems.filter(function (si) { return !idSet[si.link_id]; });
    this._saveToStorage('section_items', sectionItems);

    // Remove related analytics to keep storage clean
    let analytics = this._getFromStorage('link_analytics_daily');
    analytics = analytics.filter(function (a) { return !idSet[a.link_id]; });
    this._saveToStorage('link_analytics_daily', analytics);

    return {
      success: true,
      removed_count: removedCount,
      message: 'Links removed from profile.'
    };
  }

  // getProfileLinkAnalyticsTable(profileId, date_range, custom_start, custom_end, sort_by, sort_direction)
  getProfileLinkAnalyticsTable(profileId, date_range, custom_start, custom_end, sort_by, sort_direction) {
    const profile = this._findProfileById(profileId);
    if (!profile) return [];

    const links = this._getFromStorage('links').filter(function (l) { return l.profile_id === profileId; });
    const youtubeVideos = this._getFromStorage('youtube_videos');
    const youtubePlaylists = this._getFromStorage('youtube_playlists');
    const profiles = this._getFromStorage('profiles');

    const videoMap = {};
    for (let v = 0; v < youtubeVideos.length; v++) {
      videoMap[youtubeVideos[v].id] = youtubeVideos[v];
    }
    const playlistMap = {};
    for (let p = 0; p < youtubePlaylists.length; p++) {
      playlistMap[youtubePlaylists[p].id] = youtubePlaylists[p];
    }
    const profileMap = {};
    for (let pr = 0; pr < profiles.length; pr++) {
      profileMap[profiles[pr].id] = profiles[pr];
    }

    if (links.length === 0) return [];

    const now = new Date();
    let start = null;
    let end = null;
    if (date_range === 'last_7_days') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = now;
    } else if (date_range === 'last_30_days') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = now;
    } else if (date_range === 'custom') {
      start = this._parseDate(custom_start);
      end = this._parseDate(custom_end);
      if (!start || !end) return [];
    } else {
      // default last_7_days
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = now;
    }

    const linkIds = links.map(function (l) { return l.id; });
    const agg = this._aggregateLinkClicks(linkIds, start, end);

    const rows = [];
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const stats = agg[l.id] || { total_clicks: 0, total_impressions: 0, clicks_per_day: [] };
      const expandedLink = Object.assign({}, l, {
        profile: profileMap[l.profile_id] || null,
        youtube_video: l.youtube_video_id ? (videoMap[l.youtube_video_id] || null) : null,
        youtube_playlist: l.youtube_playlist_id ? (playlistMap[l.youtube_playlist_id] || null) : null
      });
      rows.push({
        link: expandedLink,
        total_clicks: stats.total_clicks,
        total_impressions: stats.total_impressions,
        clicks_per_day: stats.clicks_per_day || []
      });
    }

    const sortBy = sort_by || 'clicks';
    const dir = (sort_direction || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    rows.sort(function (a, b) {
      function cmp(valA, valB) {
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
      }
      if (sortBy === 'clicks') {
        return cmp(a.total_clicks, b.total_clicks);
      }
      if (sortBy === 'title') {
        const ta = (a.link.title || '').toLowerCase();
        const tb = (b.link.title || '').toLowerCase();
        return cmp(ta, tb);
      }
      if (sortBy === 'created_at') {
        const da = new Date(a.link.created_at || 0).getTime();
        const db = new Date(b.link.created_at || 0).getTime();
        return cmp(da, db);
      }
      return 0;
    });

    return rows;
  }

  // getProfileSections(profileId)
  getProfileSections(profileId) {
    const sections = this._getFromStorage('sections');
    const profiles = this._getFromStorage('profiles');
    const profileMap = {};
    for (let i = 0; i < profiles.length; i++) {
      profileMap[profiles[i].id] = profiles[i];
    }
    const filtered = sections.filter(function (s) { return s.profile_id === profileId; });
    return filtered.map(function (s) {
      return Object.assign({}, s, { profile: profileMap[s.profile_id] || null });
    });
  }

  // createSection(profileId, title, type, sort_mode, layout_style, show_at_top_of_profile)
  createSection(profileId, title, type, sort_mode, layout_style, show_at_top_of_profile) {
    const profile = this._findProfileById(profileId);
    if (!profile) {
      return { success: false, section: null, message: 'Profile not found.' };
    }
    if (!title || !type || !sort_mode || !layout_style) {
      return { success: false, section: null, message: 'Missing required fields.' };
    }
    let sections = this._getFromStorage('sections');
    const profileSections = sections.filter(function (s) { return s.profile_id === profileId; });
    let maxPos = -1;
    for (let i = 0; i < profileSections.length; i++) {
      if (typeof profileSections[i].position === 'number' && profileSections[i].position > maxPos) {
        maxPos = profileSections[i].position;
      }
    }
    maxPos++;
    const now = this._nowIso();
    const section = {
      id: this._generateId('section'),
      profile_id: profileId,
      title: title,
      type: type,
      sort_mode: sort_mode,
      layout_style: layout_style,
      show_at_top_of_profile: !!show_at_top_of_profile,
      position: maxPos,
      created_at: now,
      updated_at: now
    };
    sections.push(section);
    this._saveToStorage('sections', sections);
    return {
      success: true,
      section: section,
      message: 'Section created.'
    };
  }

  // bulkCreateLinksFromVideosAndAttachToSection(sectionId, youtubeVideoIds)
  bulkCreateLinksFromVideosAndAttachToSection(sectionId, youtubeVideoIds) {
    const sections = this._getFromStorage('sections');
    const section = sections.find(function (s) { return s.id === sectionId; }) || null;
    if (!section) {
      return { success: false, created_links: [], section_items: [], message: 'Section not found.' };
    }
    const profileId = section.profile_id;
    const videos = this._getFromStorage('youtube_videos');
    let links = this._getFromStorage('links');
    let sectionItems = this._getFromStorage('section_items');

    const videoMap = {};
    for (let i = 0; i < videos.length; i++) {
      videoMap[videos[i].id] = videos[i];
    }

    const now = this._nowIso();

    const currentProfileLinks = links.filter(function (l) { return l.profile_id === profileId; });
    let maxLinkPos = -1;
    for (let j = 0; j < currentProfileLinks.length; j++) {
      if (typeof currentProfileLinks[j].position === 'number' && currentProfileLinks[j].position > maxLinkPos) {
        maxLinkPos = currentProfileLinks[j].position;
      }
    }

    const currentSectionItems = sectionItems.filter(function (si) { return si.section_id === sectionId; });
    let maxSectionPos = -1;
    for (let k = 0; k < currentSectionItems.length; k++) {
      if (typeof currentSectionItems[k].position === 'number' && currentSectionItems[k].position > maxSectionPos) {
        maxSectionPos = currentSectionItems[k].position;
      }
    }

    const createdLinks = [];
    const createdItems = [];

    for (let m = 0; m < youtubeVideoIds.length; m++) {
      const vidId = youtubeVideoIds[m];
      const video = videoMap[vidId];
      if (!video) continue;
      maxLinkPos++;
      const link = {
        id: this._generateId('link'),
        profile_id: profileId,
        type: 'youtube_video',
        title: video.title,
        url: video.url,
        youtube_video_id: video.id,
        youtube_playlist_id: null,
        language: video.language || null,
        is_pinned: false,
        is_visible: true,
        status: 'active',
        schedule_visibility_rule: 'always',
        schedule_start: null,
        schedule_end: null,
        is_announcement: false,
        source: video.is_from_my_uploads ? 'youtube_my_uploads' : 'youtube_search',
        position: maxLinkPos,
        created_at: now,
        updated_at: now
      };
      links.push(link);
      createdLinks.push(link);

      maxSectionPos++;
      const item = {
        id: this._generateId('section_item'),
        section_id: sectionId,
        link_id: link.id,
        position: maxSectionPos
      };
      sectionItems.push(item);
      createdItems.push(item);
    }

    this._saveToStorage('links', links);
    this._saveToStorage('section_items', sectionItems);

    return {
      success: true,
      created_links: createdLinks,
      section_items: createdItems,
      message: 'Links created and attached to section.'
    };
  }

  // bulkCreateLinksFromPlaylistsAndAttachToSection(sectionId, youtubePlaylistIds)
  bulkCreateLinksFromPlaylistsAndAttachToSection(sectionId, youtubePlaylistIds) {
    const sections = this._getFromStorage('sections');
    const section = sections.find(function (s) { return s.id === sectionId; }) || null;
    if (!section) {
      return { success: false, created_links: [], section_items: [], message: 'Section not found.' };
    }
    const profileId = section.profile_id;
    const playlists = this._getFromStorage('youtube_playlists');
    let links = this._getFromStorage('links');
    let sectionItems = this._getFromStorage('section_items');

    const playlistMap = {};
    for (let i = 0; i < playlists.length; i++) {
      playlistMap[playlists[i].id] = playlists[i];
    }

    const now = this._nowIso();

    const currentProfileLinks = links.filter(function (l) { return l.profile_id === profileId; });
    let maxLinkPos = -1;
    for (let j = 0; j < currentProfileLinks.length; j++) {
      if (typeof currentProfileLinks[j].position === 'number' && currentProfileLinks[j].position > maxLinkPos) {
        maxLinkPos = currentProfileLinks[j].position;
      }
    }

    const currentSectionItems = sectionItems.filter(function (si) { return si.section_id === sectionId; });
    let maxSectionPos = -1;
    for (let k = 0; k < currentSectionItems.length; k++) {
      if (typeof currentSectionItems[k].position === 'number' && currentSectionItems[k].position > maxSectionPos) {
        maxSectionPos = currentSectionItems[k].position;
      }
    }

    const createdLinks = [];
    const createdItems = [];

    for (let m = 0; m < youtubePlaylistIds.length; m++) {
      const plId = youtubePlaylistIds[m];
      const playlist = playlistMap[plId];
      if (!playlist) continue;
      maxLinkPos++;
      const link = {
        id: this._generateId('link'),
        profile_id: profileId,
        type: 'youtube_playlist',
        title: playlist.title,
        url: playlist.url,
        youtube_video_id: null,
        youtube_playlist_id: playlist.id,
        language: playlist.language || null,
        is_pinned: false,
        is_visible: true,
        status: 'active',
        schedule_visibility_rule: 'always',
        schedule_start: null,
        schedule_end: null,
        is_announcement: false,
        source: playlist.is_from_my_uploads ? 'youtube_my_uploads' : 'youtube_search',
        position: maxLinkPos,
        created_at: now,
        updated_at: now
      };
      links.push(link);
      createdLinks.push(link);

      maxSectionPos++;
      const item = {
        id: this._generateId('section_item'),
        section_id: sectionId,
        link_id: link.id,
        position: maxSectionPos
      };
      sectionItems.push(item);
      createdItems.push(item);
    }

    this._saveToStorage('links', links);
    this._saveToStorage('section_items', sectionItems);

    return {
      success: true,
      created_links: createdLinks,
      section_items: createdItems,
      message: 'Playlist links created and attached to section.'
    };
  }

  // updateSectionSettings(sectionId, sort_mode, layout_style, show_at_top_of_profile, position)
  updateSectionSettings(sectionId, sort_mode, layout_style, show_at_top_of_profile, position) {
    let sections = this._getFromStorage('sections');
    const idx = sections.findIndex(function (s) { return s.id === sectionId; });
    if (idx === -1) {
      return { success: false, section: null, message: 'Section not found.' };
    }
    const sec = sections[idx];
    const now = this._nowIso();
    if (sort_mode) sec.sort_mode = sort_mode;
    if (layout_style) sec.layout_style = layout_style;
    if (typeof show_at_top_of_profile === 'boolean') sec.show_at_top_of_profile = show_at_top_of_profile;
    if (typeof position === 'number') sec.position = position;
    sec.updated_at = now;
    sections[idx] = sec;
    this._saveToStorage('sections', sections);
    return {
      success: true,
      section: sec,
      message: 'Section settings updated.'
    };
  }

  // getProfileAppearanceSettings(profileId)
  getProfileAppearanceSettings(profileId) {
    const profile = this._findProfileById(profileId);
    const appearance = this._getOrCreateProfileAppearance(profileId);
    const themePresets = this._getFromStorage('theme_presets');
    const themePreset = appearance.theme_preset_id ? (themePresets.find(function (t) { return t.id === appearance.theme_preset_id; }) || null) : null;

    const appearanceWithFK = Object.assign({}, appearance, {
      profile: profile || null,
      theme_preset: themePreset || null
    });

    return {
      appearance: appearanceWithFK,
      theme_preset: themePreset || null,
      available_theme_presets: themePresets
    };
  }

  // updateProfileAppearanceSettings(profileId, theme_preset_id, background_color, is_dark, accent_color, button_style, layout, show_youtube_thumbnails)
  updateProfileAppearanceSettings(profileId, theme_preset_id, background_color, is_dark, accent_color, button_style, layout, show_youtube_thumbnails) {
    const profile = this._findProfileById(profileId);
    if (!profile) {
      return { success: false, appearance: null, message: 'Profile not found.' };
    }
    let appearances = this._getFromStorage('profile_appearances');
    let appearance = appearances.find(function (a) { return a.profile_id === profileId; }) || null;
    if (!appearance) {
      appearance = this._getOrCreateProfileAppearance(profileId);
      appearances = this._getFromStorage('profile_appearances');
    }
    const now = this._nowIso();

    if (typeof theme_preset_id !== 'undefined') {
      appearance.theme_preset_id = theme_preset_id;
    }
    if (typeof background_color !== 'undefined') {
      appearance.background_color = background_color;
    }
    if (typeof is_dark === 'boolean') {
      appearance.is_dark = is_dark;
    }
    if (typeof accent_color !== 'undefined') {
      appearance.accent_color = accent_color;
    }
    if (typeof button_style !== 'undefined') {
      appearance.button_style = button_style;
    }
    if (typeof layout !== 'undefined') {
      appearance.layout = layout;
    }
    if (typeof show_youtube_thumbnails === 'boolean') {
      appearance.show_youtube_thumbnails = show_youtube_thumbnails;
    }
    appearance.updated_at = now;

    const idx = appearances.findIndex(function (a) { return a.id === appearance.id; });
    if (idx === -1) {
      appearances.push(appearance);
    } else {
      appearances[idx] = appearance;
    }
    this._saveToStorage('profile_appearances', appearances);

    return {
      success: true,
      appearance: appearance,
      message: 'Appearance updated.'
    };
  }

  // generateProfileQrCode(profileId, style, size)
  generateProfileQrCode(profileId, style, size) {
    const profile = this._findProfileById(profileId);
    if (!profile) {
      return { qr_code: null, success: false, message: 'Profile not found.' };
    }
    const allowedStyles = ['black_on_white', 'white_on_black', 'custom_colors'];
    const allowedSizes = ['small_256_px', 'medium_512_px', 'large_1024_px'];
    if (allowedStyles.indexOf(style) === -1 || allowedSizes.indexOf(size) === -1) {
      return { qr_code: null, success: false, message: 'Invalid style or size.' };
    }
    let qrCodes = this._getFromStorage('qr_codes');
    const now = this._nowIso();
    const id = this._generateId('qr');
    const imageUrl = 'https://qr.local/' + encodeURIComponent(profileId) + '/' + style + '/' + size + '/' + encodeURIComponent(id) + '.png';
    const qr = {
      id: id,
      profile_id: profileId,
      style: style,
      size: size,
      image_url: imageUrl,
      created_at: now
    };
    qrCodes.push(qr);
    this._saveToStorage('qr_codes', qrCodes);

    const qrWithProfile = Object.assign({}, qr, { profile: profile });

    return {
      qr_code: qrWithProfile,
      success: true,
      message: 'QR code generated.'
    };
  }

  // getPublicProfileView(username)
  getPublicProfileView(username) {
    const profiles = this._getFromStorage('profiles');
    const profile = profiles.find(function (p) { return p.username === username; }) || null;
    if (!profile) {
      return null;
    }

    const appearanceData = this.getProfileAppearanceSettings(profile.id);
    const appearance = appearanceData.appearance;

    const sectionsAll = this._getFromStorage('sections').filter(function (s) { return s.profile_id === profile.id; });
    const sectionItemsAll = this._getFromStorage('section_items');
    const linksAll = this._getFromStorage('links').filter(function (l) { return l.profile_id === profile.id; });
    const youtubeVideos = this._getFromStorage('youtube_videos');
    const youtubePlaylists = this._getFromStorage('youtube_playlists');

    const videoMap = {};
    for (let v = 0; v < youtubeVideos.length; v++) {
      videoMap[youtubeVideos[v].id] = youtubeVideos[v];
    }
    const playlistMap = {};
    for (let p = 0; p < youtubePlaylists.length; p++) {
      playlistMap[youtubePlaylists[p].id] = youtubePlaylists[p];
    }

    // Determine links that belong to sections
    const linkInSectionSet = {};
    for (let si = 0; si < sectionItemsAll.length; si++) {
      const item = sectionItemsAll[si];
      const sec = sectionsAll.find(function (s) { return s.id === item.section_id; });
      if (sec && sec.profile_id === profile.id) {
        linkInSectionSet[item.link_id] = true;
      }
    }

    // Build sections with links
    const now = new Date();
    const sectionObjects = [];
    const sortedSections = sectionsAll.slice().sort(function (a, b) {
      const atop = a.show_at_top_of_profile ? 1 : 0;
      const btop = b.show_at_top_of_profile ? 1 : 0;
      if (atop !== btop) return btop - atop; // show_at_top true first
      const pa = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
      const pb = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
      return pa - pb;
    });

    for (let s = 0; s < sortedSections.length; s++) {
      const section = sortedSections[s];
      const items = sectionItemsAll.filter(function (si) { return si.section_id === section.id; });
      // Sort items by position
      items.sort(function (a, b) { return a.position - b.position; });
      let sectionLinks = [];
      for (let i = 0; i < items.length; i++) {
        const link = linksAll.find(function (l) { return l.id === items[i].link_id; });
        if (!link) continue;
        if (!this._isLinkVisibleForPublic(link, now)) continue;
        sectionLinks.push(link);
      }
      // Apply section sort_mode
      let mode = 'manual';
      if (section.sort_mode === 'newest_at_top') mode = 'newest_first';
      else if (section.sort_mode === 'oldest_at_top') mode = 'oldest_first';
      else if (section.sort_mode === 'title_a_z') mode = 'title_a_z';
      else mode = 'manual';

      sectionLinks = this._applyProfileOrderingAndVisibility(sectionLinks, mode, {
        respect_visibility: false,
        respect_schedule: false,
        exclude_archived: false
      });

      const linksWithMeta = [];
      for (let j = 0; j < sectionLinks.length; j++) {
        const l = sectionLinks[j];
        const expandedLink = Object.assign({}, l, {
          youtube_video: l.youtube_video_id ? (videoMap[l.youtube_video_id] || null) : null,
          youtube_playlist: l.youtube_playlist_id ? (playlistMap[l.youtube_playlist_id] || null) : null,
          profile: profile
        });
        linksWithMeta.push({ link: expandedLink, youtube_video: expandedLink.youtube_video, youtube_playlist: expandedLink.youtube_playlist });
      }

      sectionObjects.push({ section: section, links: linksWithMeta });
    }

    // Top-level links (not in any section)
    const topLevelLinksRaw = [];
    for (let i = 0; i < linksAll.length; i++) {
      const l = linksAll[i];
      if (linkInSectionSet[l.id]) continue;
      if (!this._isLinkVisibleForPublic(l, now)) continue;
      topLevelLinksRaw.push(l);
    }

    const orderedTopLevel = this._applyProfileOrderingAndVisibility(topLevelLinksRaw, profile.default_link_order_mode || 'manual', {
      respect_visibility: false,
      respect_schedule: false,
      exclude_archived: false
    });

    const topLevelLinks = [];
    for (let t = 0; t < orderedTopLevel.length; t++) {
      const l = orderedTopLevel[t];
      const expandedLink = Object.assign({}, l, {
        youtube_video: l.youtube_video_id ? (videoMap[l.youtube_video_id] || null) : null,
        youtube_playlist: l.youtube_playlist_id ? (playlistMap[l.youtube_playlist_id] || null) : null,
        profile: profile
      });
      topLevelLinks.push({ link: expandedLink });
    }

    return {
      profile_header: {
        name: profile.name,
        username: profile.username,
        bio: profile.bio
      },
      appearance: appearance,
      sections: sectionObjects,
      top_level_links: topLevelLinks
    };
  }

  // getHelpOverview()
  getHelpOverview() {
    return {
      concepts: [
        {
          key: 'profiles',
          title: 'Profiles',
          summary: 'A profile is a public page that groups your YouTube videos, playlists, and external links under a single URL.'
        },
        {
          key: 'links',
          title: 'Links',
          summary: 'Links can be YouTube videos, playlists, or custom URLs. They support pinning, scheduling, visibility, and analytics.'
        },
        {
          key: 'sections',
          title: 'Sections',
          summary: 'Sections group links into logical blocks like Podcast Episodes or Top 5 Playlists for better organization.'
        },
        {
          key: 'analytics',
          title: 'Analytics',
          summary: 'Analytics aggregate clicks and impressions for each link over time, helping you optimize what to surface.'
        }
      ],
      task_guides: [
        {
          key: 'create_profile',
          title: 'Create a new profile and add YouTube links',
          related_tasks: ['task_1'],
          steps: [
            'Create a draft profile with a name, username, and bio.',
            'Search for YouTube videos and add them as links to the profile.',
            'Adjust ordering mode if desired and publish the profile.'
          ]
        },
        {
          key: 'pin_links_by_clicks',
          title: 'Pin high-performing links and hide low-performing ones',
          related_tasks: ['task_2', 'task_6'],
          steps: [
            'Open the Analytics tab for a profile.',
            'Sort links by clicks to identify best and worst performers.',
            'Pin the top links and hide or archive low-performing ones.'
          ]
        },
        {
          key: 'sections_and_groups',
          title: 'Organize content into sections',
          related_tasks: ['task_3', 'task_8'],
          steps: [
            'Create sections such as Podcast Episodes or Top 5 Playlists.',
            'Attach relevant video or playlist links to each section.',
            'Control sorting (newest first, A–Z) inside each section.'
          ]
        },
        {
          key: 'localized_profiles',
          title: 'Create localized versions of a profile',
          related_tasks: ['task_7'],
          steps: [
            'Duplicate an existing profile.',
            'Remove links that are not in the target language.',
            'Publish the new localized profile with its own URL.'
          ]
        }
      ],
      faqs: [
        {
          question: 'How do I change the order of links on my profile?',
          answer: 'Use the default link order mode in the profile settings (e.g., manual, pinned first, duration short to long) or drag links in the editor if manual ordering is enabled.'
        },
        {
          question: 'What counts as a click in analytics?',
          answer: 'A click is recorded whenever a visitor selects a link from your public profile. Clicks are aggregated per link per day.'
        },
        {
          question: 'Can I schedule announcement links for specific dates?',
          answer: 'Yes. When creating or editing a custom link, set the visibility rule to scheduled and choose a start and end date. The link will only be visible between those dates.'
        }
      ]
    };
  }

  // getAboutPageInfo()
  getAboutPageInfo() {
    return {
      description: 'This tool lets creators build personal profiles that aggregate YouTube videos, playlists, and external links into a single, sharable hub.',
      supported_profile_types: [
        'Personal creator hubs',
        'Channel-specific link pages',
        'Conference or event landing pages',
        'Podcast episode directories'
      ],
      credits: 'Built as a lightweight, client-side tool with localStorage-based persistence.',
      contact_info: {
        email: 'support@example.com',
        website: 'https://example.com'
      },
      help_link_label: 'View help & guides'
    };
  }

  // createSpanishOnlyProfileFromDuplicate(profileId)
  createSpanishOnlyProfileFromDuplicate(profileId) {
    const profile = this._findProfileById(profileId);
    if (!profile) {
      return {
        removed_links_count: 0,
        remaining_spanish_links_count: 0,
        success: false,
        message: 'Profile not found.'
      };
    }
    const links = this._getFromStorage('links');
    const nonSpanishIds = [];
    const spanishIds = [];
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      if (l.profile_id !== profileId) continue;
      if (l.language === 'es') {
        spanishIds.push(l.id);
      } else {
        nonSpanishIds.push(l.id);
      }
    }

    const removeResult = this.bulkRemoveLinksFromProfile(nonSpanishIds);

    return {
      removed_links_count: removeResult.removed_count,
      remaining_spanish_links_count: spanishIds.length,
      success: true,
      message: 'Non-Spanish links removed from profile.'
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