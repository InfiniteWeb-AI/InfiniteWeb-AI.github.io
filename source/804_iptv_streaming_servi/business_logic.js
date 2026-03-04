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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'subscription_plans',
      'current_subscriptions',
      'subscription_change_sessions',
      'addons',
      'channels',
      'favorite_channels',
      'programs',
      'recordings',
      'profiles',
      'devices',
      'content_items',
      'watchlist_items',
      'playback_settings',
      'notification_settings'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    if (!localStorage.getItem('current_playback_session')) {
      localStorage.setItem('current_playback_session', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      if (typeof defaultValue !== 'undefined') {
        return defaultValue;
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') {
        return defaultValue;
      }
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

  _titleCase(str) {
    if (!str) return '';
    return str
      .split('_')
      .join(' ')
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _parseDate(dateStr) {
    return new Date(dateStr);
  }

  // -------------------- Domain helpers --------------------

  _getCurrentSubscriptionRecord() {
    const subs = this._getFromStorage('current_subscriptions', []);
    let index = subs.findIndex((s) => s.status === 'active');
    if (index === -1 && subs.length > 0) {
      index = 0;
    }
    const subscription = index >= 0 ? subs[index] : null;
    return { subscription, subscriptions: subs, index };
  }

  _getCurrentSubscriptionRaw() {
    return this._getCurrentSubscriptionRecord().subscription;
  }

  _getPlanById(planId) {
    if (!planId) return null;
    const plans = this._getFromStorage('subscription_plans', []);
    return plans.find((p) => p.id === planId) || null;
  }

  _getAddonsByIds(ids) {
    const all = this._getFromStorage('addons', []);
    const idSet = new Set(ids || []);
    return all.filter((a) => idSet.has(a.id));
  }

  _getChannelsByIds(ids) {
    const all = this._getFromStorage('channels', []);
    const idSet = new Set(ids || []);
    return all.filter((c) => idSet.has(c.id));
  }

  _getContentByIds(ids) {
    const all = this._getFromStorage('content_items', []);
    const idSet = new Set(ids || []);
    return all.filter((c) => idSet.has(c.id));
  }

  // ---- Helper: subscription change session ----

  _getOrCreateSubscriptionChangeSession(changeType) {
    const sessions = this._getFromStorage('subscription_change_sessions', []);
    let session = sessions.find((s) => s.status === 'in_progress') || null;
    const now = this._nowIso();
    const currentSub = this._getCurrentSubscriptionRaw();

    if (!session) {
      session = {
        id: this._generateId('scs'),
        changeType: changeType || 'mixed',
        oldPlanId: currentSub ? currentSub.planId : null,
        selectedPlanId: null,
        oldAddonIds: currentSub ? (currentSub.activeAddonIds || []).slice() : [],
        addedAddonIds: [],
        removedAddonIds: [],
        newBaseMonthlyPrice: currentSub ? currentSub.baseMonthlyPrice : 0,
        newAddonsMonthlyPrice: currentSub ? currentSub.addonsMonthlyPrice : 0,
        newTotalMonthlyPrice: currentSub ? currentSub.totalMonthlyPrice : 0,
        status: 'in_progress',
        createdAt: now,
        confirmedAt: null
      };
      sessions.push(session);
      this._saveToStorage('subscription_change_sessions', sessions);
      return session;
    }

    if (changeType && session.changeType !== changeType) {
      if (
        (session.changeType === 'plan_change' && (changeType === 'addon_add' || changeType === 'addon_remove')) ||
        ((session.changeType === 'addon_add' || session.changeType === 'addon_remove') && changeType === 'plan_change')
      ) {
        session.changeType = 'mixed';
      } else {
        session.changeType = changeType;
      }
      this._saveToStorage('subscription_change_sessions', sessions);
    }

    return session;
  }

  _recalculateSessionPrices(session) {
    const sessions = this._getFromStorage('subscription_change_sessions', []);
    const idx = sessions.findIndex((s) => s.id === session.id);

    const currentSub = this._getCurrentSubscriptionRaw();
    const plans = this._getFromStorage('subscription_plans', []);
    const addons = this._getFromStorage('addons', []);

    const planId = session.selectedPlanId || (currentSub ? currentSub.planId : null);
    const plan = plans.find((p) => p.id === planId) || null;
    const basePrice = plan ? plan.monthlyPrice : 0;

    // Final addon set: (current active + added) - removed
    const baseAddonIds = currentSub ? (currentSub.activeAddonIds || []).slice() : [];
    const finalSet = new Set(baseAddonIds);
    (session.removedAddonIds || []).forEach((id) => {
      if (finalSet.has(id)) finalSet.delete(id);
    });
    (session.addedAddonIds || []).forEach((id) => {
      finalSet.add(id);
    });

    let addonsPrice = 0;
    const addonMap = new Map(addons.map((a) => [a.id, a]));
    finalSet.forEach((id) => {
      const a = addonMap.get(id);
      if (a && a.status !== 'deprecated') {
        addonsPrice += a.monthlyPrice;
      }
    });

    session.newBaseMonthlyPrice = basePrice;
    session.newAddonsMonthlyPrice = addonsPrice;
    session.newTotalMonthlyPrice = basePrice + addonsPrice;

    if (idx >= 0) {
      sessions[idx] = session;
      this._saveToStorage('subscription_change_sessions', sessions);
    }
    return session;
  }

  // ---- Helper: favorites ----

  _persistFavorites(favorites) {
    this._saveToStorage('favorite_channels', favorites || []);
  }

  // ---- Helper: watchlist ----

  _getOrCreateWatchlist() {
    const items = this._getFromStorage('watchlist_items', []);
    return items;
  }

  // ---- Helper: playback settings ----

  _getOrCreatePlaybackSettings() {
    const list = this._getFromStorage('playback_settings', []);
    if (list.length > 0) return list[0];

    const now = this._nowIso();
    const settings = {
      id: this._generateId('pbs'),
      defaultAudioLanguage: 'english',
      defaultSubtitleLanguage: 'english',
      subtitlesEnabled: true,
      createdAt: now,
      updatedAt: now
    };
    this._saveToStorage('playback_settings', [settings]);
    return settings;
  }

  _savePlaybackSettings(settings) {
    this._saveToStorage('playback_settings', [settings]);
  }

  // ---- Helper: notification settings ----

  _getOrCreateNotificationSettings() {
    const list = this._getFromStorage('notification_settings', []);
    if (list.length > 0) return list[0];
    const now = this._nowIso();
    const settings = {
      id: this._generateId('ntf'),
      promotionsEmailEnabled: false,
      promotionsInAppEnabled: false,
      promotionsSmsEnabled: false,
      billingEmailEnabled: true,
      billingInAppEnabled: true,
      billingSmsEnabled: false,
      systemEmailEnabled: true,
      systemInAppEnabled: true,
      systemSmsEnabled: false,
      smsPhoneNumber: null,
      lastUpdatedAt: now
    };
    this._persistNotificationSettings(settings);
    return settings;
  }

  _persistNotificationSettings(settings) {
    this._saveToStorage('notification_settings', [settings]);
  }

  // ---- Helper: devices ----

  _updateDeviceRegistry(devices) {
    this._saveToStorage('devices', devices || []);
  }

  // -------------------- Interface implementations --------------------
  // 1) getHomeOverview

  getHomeOverview() {
    const channels = this._getFromStorage('channels', []).filter((c) => c.status === 'available');
    const content = this._getFromStorage('content_items', []).filter((c) => c.isAvailable);

    const featuredLiveChannels = channels
      .slice()
      .sort((a, b) => a.number - b.number)
      .slice(0, 10);

    const movies = content.filter((c) => c.contentType === 'movie');
    const series = content.filter((c) => c.contentType === 'series');

    const featuredMovies = movies
      .slice()
      .sort((a, b) => {
        if (b.starRating !== a.starRating) return b.starRating - a.starRating;
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, 10);

    const featuredSeries = series
      .slice()
      .sort((a, b) => {
        if (b.starRating !== a.starRating) return b.starRating - a.starRating;
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, 10);

    const { subscription } = this._getCurrentSubscriptionRecord();
    const plan = subscription ? this._getPlanById(subscription.planId) : null;

    const currentPlanSummary = plan
      ? {
          planName: plan.name,
          monthlyPrice: plan.monthlyPrice,
          currency: plan.currency,
          maxSimultaneousStreams: plan.maxSimultaneousStreams
        }
      : null;

    const shortcuts = {
      hasLiveTv: channels.length > 0,
      hasTvGuide: this._getFromStorage('programs', []).length > 0,
      hasOnDemand: content.length > 0,
      hasAddons: this._getFromStorage('addons', []).length > 0,
      hasRecordings: this._getFromStorage('recordings', []).length > 0,
      hasProfiles: this._getFromStorage('profiles', []).length > 0,
      hasSettings: true
    };

    return {
      featuredLiveChannels,
      featuredMovies,
      featuredSeries,
      currentPlanSummary,
      shortcuts
    };
  }

  // 2) getLiveChannelFilterOptions

  getLiveChannelFilterOptions() {
    const channels = this._getFromStorage('channels', []);
    const categorySet = new Set();
    const qualitySet = new Set();

    channels.forEach((c) => {
      if (c.category) categorySet.add(c.category);
      if (c.quality) qualitySet.add(c.quality);
    });

    const categories = Array.from(categorySet).map((value) => ({
      value,
      label: this._titleCase(value)
    }));

    const qualities = Array.from(qualitySet).map((value) => ({
      value,
      label: value.toUpperCase()
    }));

    const sortOptions = [
      { value: 'a_to_z', label: 'A–Z' },
      { value: 'channel_number', label: 'Channel Number' },
      { value: 'recently_watched', label: 'Recently Watched' }
    ];

    return { categories, qualities, sortOptions };
  }

  // 3) listLiveChannels(filters, sortBy)

  listLiveChannels(filters, sortBy) {
    const f = filters || {};
    const sort = sortBy || 'a_to_z';
    let channels = this._getFromStorage('channels', []).filter((c) => c.status === 'available');

    if (f.category) {
      channels = channels.filter((c) => c.category === f.category);
    }
    if (f.quality) {
      channels = channels.filter((c) => c.quality === f.quality);
    }
    if (f.searchQuery) {
      const q = f.searchQuery.toLowerCase();
      channels = channels.filter((c) => {
        const name = (c.name || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (sort === 'channel_number') {
      channels.sort((a, b) => a.number - b.number);
    } else {
      // a_to_z or recently_watched fallback
      channels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const favorites = this._getFromStorage('favorite_channels', []);
    const favSet = new Set(favorites.map((fItem) => fItem.channelId));

    return channels.map((channel) => ({
      channel,
      isFavorite: favSet.has(channel.id)
    }));
  }

  // 4) setChannelFavorite(channelId, isFavorite)

  setChannelFavorite(channelId, isFavorite) {
    const channels = this._getFromStorage('channels', []);
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) {
      return { success: false, message: 'Channel not found', totalFavorites: this._getFromStorage('favorite_channels', []).length };
    }

    let favorites = this._getFromStorage('favorite_channels', []);
    const existingIndex = favorites.findIndex((f) => f.channelId === channelId);

    if (isFavorite) {
      if (existingIndex === -1) {
        favorites.push({
          id: this._generateId('fav'),
          channelId,
          addedAt: this._nowIso()
        });
      }
    } else {
      if (existingIndex !== -1) {
        favorites.splice(existingIndex, 1);
      }
    }

    this._persistFavorites(favorites);

    return {
      success: true,
      message: isFavorite ? 'Channel marked as favorite' : 'Channel removed from favorites',
      totalFavorites: favorites.length
    };
  }

  // 5) getFavoriteChannels(groupByCategory)

  getFavoriteChannels(groupByCategory) {
    const group = typeof groupByCategory === 'boolean' ? groupByCategory : true;
    const favorites = this._getFromStorage('favorite_channels', []);
    const channels = this._getFromStorage('channels', []);
    const channelMap = new Map(channels.map((c) => [c.id, c]));

    const favChannels = favorites
      .map((f) => channelMap.get(f.channelId))
      .filter((c) => !!c);

    if (!group) {
      return {
        groups: [
          {
            category: 'all',
            channels: favChannels
          }
        ]
      };
    }

    const groupsMap = new Map();
    favChannels.forEach((c) => {
      const cat = c.category || 'other';
      if (!groupsMap.has(cat)) {
        groupsMap.set(cat, []);
      }
      groupsMap.get(cat).push(c);
    });

    const groups = Array.from(groupsMap.entries()).map(([category, chans]) => ({ category, channels: chans }));
    return { groups };
  }

  // 6) getChannelDetails(channelId)

  getChannelDetails(channelId) {
    const channels = this._getFromStorage('channels', []);
    const programs = this._getFromStorage('programs', []);
    const favorites = this._getFromStorage('favorite_channels', []);

    const channel = channels.find((c) => c.id === channelId) || null;
    if (!channel) {
      return { channel: null, currentProgram: null, isFavorite: false };
    }

    const now = new Date();
    let currentProgram = programs.find((p) => {
      if (p.channelId !== channelId) return false;
      if (p.isLive) return true;
      const start = this._parseDate(p.startTime);
      const end = this._parseDate(p.endTime);
      return start <= now && now < end;
    }) || null;

    if (currentProgram) {
      currentProgram = Object.assign({}, currentProgram, { channel });
    }

    const favSet = new Set(favorites.map((f) => f.channelId));

    return {
      channel,
      currentProgram,
      isFavorite: favSet.has(channelId)
    };
  }

  // 7) startLiveChannelPlayback(channelId)

  startLiveChannelPlayback(channelId) {
    const channels = this._getFromStorage('channels', []);
    const channel = channels.find((c) => c.id === channelId && c.status === 'available');
    if (!channel) {
      return { success: false, streamUrl: null, message: 'Channel not available' };
    }

    const streamUrl = 'https://streaming.example.com/live/' + encodeURIComponent(channelId) + '.m3u8';

    const session = {
      type: 'live',
      channelId,
      contentId: null,
      recordingId: null,
      audioLanguage: null,
      subtitleLanguage: null,
      subtitlesEnabled: false,
      startedAt: this._nowIso()
    };
    this._saveToStorage('current_playback_session', session);

    return { success: true, streamUrl, message: 'Live playback started' };
  }

  // 8) getTvGuideFilterOptions

  getTvGuideFilterOptions() {
    const programs = this._getFromStorage('programs', []);
    let minDateStr;
    let maxDateStr;

    if (programs.length > 0) {
      const dates = programs.map((p) => this._parseDate(p.startTime));
      const minDate = new Date(Math.min.apply(null, dates));
      const maxDate = new Date(Math.max.apply(null, dates));
      minDateStr = minDate.toISOString().slice(0, 10);
      maxDateStr = maxDate.toISOString().slice(0, 10);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      minDateStr = today;
      maxDateStr = today;
    }

    const categorySet = new Set();
    programs.forEach((p) => {
      if (p.category) categorySet.add(p.category);
    });
    const categories = Array.from(categorySet).map((value) => ({
      value,
      label: this._titleCase(value)
    }));

    const timeSlotSet = new Set();
    programs.forEach((p) => {
      const t = this._parseDate(p.startTime);
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      timeSlotSet.add(hh + ':' + mm);
    });
    let timeSlots = Array.from(timeSlotSet).sort();
    if (timeSlots.length === 0) {
      timeSlots = ['18:00', '19:00', '20:00', '21:00'];
    }

    return {
      dateRange: {
        minDate: minDateStr,
        maxDate: maxDateStr
      },
      categories,
      timeSlots
    };
  }

  // 9) getTvGuideGrid(date, startTime, endTime, category)

  getTvGuideGrid(date, startTime, endTime, category) {
    const programs = this._getFromStorage('programs', []);
    const channels = this._getFromStorage('channels', []);
    const start = this._parseDate(date + 'T' + startTime + ':00Z');
    let end;
    if (endTime) {
      end = this._parseDate(date + 'T' + endTime + ':00Z');
    } else {
      end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    }

    let filtered = programs.filter((p) => {
      const st = this._parseDate(p.startTime);
      const et = this._parseDate(p.endTime);
      const overlaps = st < end && et > start;
      if (!overlaps) return false;
      if (category && p.category !== category) return false;
      return true;
    });

    const channelMap = new Map(channels.map((c) => [c.id, c]));
    const grouped = new Map();

    filtered.forEach((p) => {
      let ch = channelMap.get(p.channelId);
      // If channel metadata is missing (e.g., movie channels not in the channel list),
      // create a minimal stub so that programs are still exposed in the guide.
      if (!ch) {
        ch = { id: p.channelId };
      }
      if (!grouped.has(p.channelId)) {
        grouped.set(p.channelId, {
          channel: ch,
          programs: []
        });
      }
      const progWithChannel = Object.assign({}, p, { channel: ch });
      grouped.get(p.channelId).programs.push(progWithChannel);
    });

    const resultChannels = Array.from(grouped.values()).sort((a, b) => a.channel.number - b.channel.number);

    return {
      date,
      channels: resultChannels
    };
  }

  // 10) getProgramDetails(programId)

  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs', []);
    const channels = this._getFromStorage('channels', []);
    const recordings = this._getFromStorage('recordings', []);

    let program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return { program: null, channel: null, isRecordScheduled: false };
    }
    const channel = channels.find((c) => c.id === program.channelId) || null;
    program = Object.assign({}, program, { channel });

    const rec = recordings.find((r) => r.programId === programId && (r.status === 'scheduled' || r.status === 'recording')) || null;

    return {
      program,
      channel,
      isRecordScheduled: !!rec,
      recordingId: rec ? rec.id : null
    };
  }

  // 11) scheduleRecording(programId, recordSeries)

  scheduleRecording(programId, recordSeries) {
    const recordSeriesFlag = typeof recordSeries === 'boolean' ? recordSeries : false;
    const programs = this._getFromStorage('programs', []);
    const channels = this._getFromStorage('channels', []);
    const recordings = this._getFromStorage('recordings', []);

    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return { success: false, message: 'Program not found', recording: null };
    }
    if (!program.isRecordable) {
      return { success: false, message: 'Program is not recordable', recording: null };
    }

    const existing = recordings.find((r) => r.programId === programId && r.status === 'scheduled');
    if (existing) {
      const ch = channels.find((c) => c.id === existing.channelId) || null;
      const recWithRelations = Object.assign({}, existing, { program, channel: ch });
      return { success: true, message: 'Recording already scheduled', recording: recWithRelations };
    }

    const channel = channels.find((c) => c.id === program.channelId) || null;
    const now = this._nowIso();
    const recording = {
      id: this._generateId('rec'),
      programId: program.id,
      channelId: program.channelId,
      title: program.title,
      startTime: program.startTime,
      endTime: program.endTime,
      scheduledAt: now,
      status: 'scheduled',
      recordSeries: !!recordSeriesFlag,
      storageDurationDays: null,
      playbackUrl: null,
      thumbnailImage: null
    };

    recordings.push(recording);
    this._saveToStorage('recordings', recordings);

    const recordingWithRelations = Object.assign({}, recording, { program, channel });

    return { success: true, message: 'Recording scheduled', recording: recordingWithRelations };
  }

  // 12) cancelRecording(recordingId)

  cancelRecording(recordingId) {
    const recordings = this._getFromStorage('recordings', []);
    const idx = recordings.findIndex((r) => r.id === recordingId);
    if (idx === -1) {
      return { success: false, message: 'Recording not found' };
    }
    const rec = recordings[idx];
    if (rec.status !== 'scheduled' && rec.status !== 'recording') {
      return { success: false, message: 'Recording cannot be canceled in its current state' };
    }
    recordings[idx] = Object.assign({}, rec, { status: 'canceled' });
    this._saveToStorage('recordings', recordings);
    return { success: true, message: 'Recording canceled' };
  }

  // 13) getRecordingsOverview(statusFilter, sortBy)

  getRecordingsOverview(statusFilter, sortBy) {
    const filter = statusFilter || 'all';
    const sort = sortBy || 'start_time_asc';
    const recordings = this._getFromStorage('recordings', []);
    const programs = this._getFromStorage('programs', []);
    const channels = this._getFromStorage('channels', []);

    let filtered = recordings.slice();
    if (filter !== 'all') {
      filtered = filtered.filter((r) => r.status === filter);
    }

    const programMap = new Map(programs.map((p) => [p.id, p]));
    const channelMap = new Map(channels.map((c) => [c.id, c]));

    const withRelations = filtered.map((r) => {
      const program = programMap.get(r.programId) || null;
      const channel = channelMap.get(r.channelId) || null;
      return Object.assign({}, r, { program, channel });
    });

    const sortFn = (a, b) => {
      if (sort === 'start_time_desc') {
        return this._parseDate(b.startTime) - this._parseDate(a.startTime);
      }
      if (sort === 'title_a_to_z') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // default start_time_asc
      return this._parseDate(a.startTime) - this._parseDate(b.startTime);
    };

    withRelations.sort(sortFn);

    const scheduled = withRelations.filter((r) => r.status === 'scheduled' || r.status === 'recording');
    const completed = withRelations.filter((r) => r.status === 'completed');

    return { scheduled, completed };
  }

  // 14) deleteRecording(recordingId)

  deleteRecording(recordingId) {
    const recordings = this._getFromStorage('recordings', []);
    const idx = recordings.findIndex((r) => r.id === recordingId);
    if (idx === -1) {
      return { success: false, message: 'Recording not found' };
    }
    const rec = recordings[idx];
    if (rec.status !== 'completed' && rec.status !== 'failed' && rec.status !== 'canceled') {
      return { success: false, message: 'Only completed, failed, or canceled recordings can be deleted' };
    }
    recordings.splice(idx, 1);
    this._saveToStorage('recordings', recordings);
    return { success: true, message: 'Recording deleted' };
  }

  // 15) playRecording(recordingId)

  playRecording(recordingId) {
    const recordings = this._getFromStorage('recordings', []);
    const idx = recordings.findIndex((r) => r.id === recordingId);
    if (idx === -1) {
      return { success: false, playbackUrl: null, message: 'Recording not found' };
    }
    const rec = recordings[idx];
    if (rec.status !== 'completed' && rec.status !== 'recording') {
      return { success: false, playbackUrl: null, message: 'Recording not ready for playback' };
    }

    let playbackUrl = rec.playbackUrl;
    if (!playbackUrl) {
      playbackUrl = 'https://streaming.example.com/recordings/' + encodeURIComponent(recordingId) + '.m3u8';
      recordings[idx] = Object.assign({}, rec, { playbackUrl });
      this._saveToStorage('recordings', recordings);
    }

    const settings = this._getOrCreatePlaybackSettings();

    const session = {
      type: 'recording',
      channelId: null,
      contentId: null,
      recordingId,
      audioLanguage: settings.defaultAudioLanguage,
      subtitleLanguage: settings.defaultSubtitleLanguage,
      subtitlesEnabled: settings.subtitlesEnabled,
      startedAt: this._nowIso()
    };
    this._saveToStorage('current_playback_session', session);

    return { success: true, playbackUrl, message: 'Recording playback started' };
  }

  // 16) getOnDemandFilterOptions

  getOnDemandFilterOptions() {
    const content = this._getFromStorage('content_items', []);
    let minYear = null;
    let maxYear = null;
    content.forEach((c) => {
      if (typeof c.year === 'number') {
        if (minYear === null || c.year < minYear) minYear = c.year;
        if (maxYear === null || c.year > maxYear) maxYear = c.year;
      }
    });
    if (minYear === null) {
      const year = new Date().getFullYear();
      minYear = year;
      maxYear = year;
    }

    const contentTypes = [
      { value: 'all', label: 'All' },
      { value: 'movie', label: 'Movies' },
      { value: 'series', label: 'Series' }
    ];

    const ratingOptions = [
      { minRating: 0, label: 'All ratings' },
      { minRating: 3, label: '3+ stars' },
      { minRating: 4, label: '4+ stars' },
      { minRating: 4.5, label: '4.5+ stars' }
    ];

    const sortOptions = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'a_to_z', label: 'A–Z' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'highest_rated', label: 'Highest Rated' }
    ];

    return {
      contentTypes,
      ratingOptions,
      yearRange: { minYear, maxYear },
      sortOptions
    };
  }

  // 17) listOnDemandContent(filters, sortBy)

  listOnDemandContent(filters, sortBy) {
    const f = filters || {};
    const sort = sortBy || 'most_popular';
    let items = this._getFromStorage('content_items', []).filter((c) => c.isAvailable);

    const contentType = f.contentType || 'all';
    if (contentType !== 'all') {
      items = items.filter((c) => c.contentType === contentType);
    }

    if (typeof f.minStarRating === 'number') {
      items = items.filter((c) => c.starRating >= f.minStarRating);
    }
    if (typeof f.minYear === 'number') {
      items = items.filter((c) => c.year >= f.minYear);
    }
    if (typeof f.maxYear === 'number') {
      items = items.filter((c) => c.year <= f.maxYear);
    }
    if (f.genre) {
      items = items.filter((c) => Array.isArray(c.genres) && c.genres.includes(f.genre));
    }
    if (f.searchQuery) {
      const q = f.searchQuery.toLowerCase();
      items = items.filter((c) => {
        const title = (c.title || '').toLowerCase();
        const syn = (c.synopsis || '').toLowerCase();
        return title.includes(q) || syn.includes(q);
      });
    }

    items.sort((a, b) => {
      if (sort === 'a_to_z') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sort === 'newest_first') {
        return (b.year || 0) - (a.year || 0);
      }
      if (sort === 'highest_rated') {
        if (b.starRating !== a.starRating) return b.starRating - a.starRating;
        return (b.year || 0) - (a.year || 0);
      }
      // most_popular fallback: use rating then year
      if (b.starRating !== a.starRating) return b.starRating - a.starRating;
      return (b.year || 0) - (a.year || 0);
    });

    const watchlist = this._getOrCreateWatchlist();
    const watchSet = new Set(watchlist.map((w) => w.contentId));

    return items.map((content) => ({
      content,
      isInWatchlist: watchSet.has(content.id)
    }));
  }

  // 18) getContentDetails(contentId)

  getContentDetails(contentId) {
    const items = this._getFromStorage('content_items', []);
    const content = items.find((c) => c.id === contentId) || null;
    const watchlist = this._getFromStorage('watchlist_items', []);
    const isInWatchlist = watchlist.some((w) => w.contentId === contentId);
    return { content, isInWatchlist };
  }

  // 19) addToWatchlist(contentId)

  addToWatchlist(contentId) {
    const contents = this._getFromStorage('content_items', []);
    const content = contents.find((c) => c.id === contentId);
    if (!content) {
      return { success: false, message: 'Content not found', watchlistCount: this._getFromStorage('watchlist_items', []).length };
    }

    const watchlist = this._getOrCreateWatchlist();
    const existing = watchlist.find((w) => w.contentId === contentId);
    if (!existing) {
      watchlist.push({
        id: this._generateId('wli'),
        contentId,
        addedAt: this._nowIso()
      });
      this._saveToStorage('watchlist_items', watchlist);
    }

    return { success: true, message: 'Added to watchlist', watchlistCount: watchlist.length };
  }

  // 20) removeFromWatchlist(contentId)

  removeFromWatchlist(contentId) {
    const watchlist = this._getOrCreateWatchlist();
    const initialLen = watchlist.length;
    const newList = watchlist.filter((w) => w.contentId !== contentId);
    if (newList.length === initialLen) {
      return { success: false, message: 'Item not found in watchlist' };
    }
    this._saveToStorage('watchlist_items', newList);
    return { success: true, message: 'Removed from watchlist' };
  }

  // 21) getWatchlist(contentType, sortBy)

  getWatchlist(contentType, sortBy) {
    const type = contentType || 'all';
    const sort = sortBy || 'recently_added';
    const watchlist = this._getOrCreateWatchlist();
    const contents = this._getFromStorage('content_items', []);
    const contentMap = new Map(contents.map((c) => [c.id, c]));

    let items = watchlist
      .map((w) => {
        const content = contentMap.get(w.contentId) || null;
        return { watchlistItem: w, content };
      })
      .filter((item) => {
        if (!item.content) return false;
        if (type === 'all') return true;
        return item.content.contentType === type;
      });

    if (sort === 'a_to_z') {
      items.sort((a, b) => (a.content.title || '').localeCompare(b.content.title || ''));
    } else {
      // recently_added
      items.sort((a, b) => new Date(b.watchlistItem.addedAt) - new Date(a.watchlistItem.addedAt));
    }

    return { items };
  }

  // 22) startContentPlayback(contentId)

  startContentPlayback(contentId) {
    const contents = this._getFromStorage('content_items', []);
    const content = contents.find((c) => c.id === contentId && c.isAvailable);
    if (!content) {
      return { success: false, playbackUrl: null, appliedAudioLanguage: null, appliedSubtitleLanguage: null, subtitlesEnabled: false };
    }

    const settings = this._getOrCreatePlaybackSettings();

    let audioLang = null;
    if (Array.isArray(content.availableAudioLanguages) && content.availableAudioLanguages.length > 0) {
      if (content.availableAudioLanguages.includes(settings.defaultAudioLanguage)) {
        audioLang = settings.defaultAudioLanguage;
      } else {
        audioLang = content.availableAudioLanguages[0];
      }
    }

    let subtitleLang = null;
    let subtitlesEnabled = settings.subtitlesEnabled;
    if (subtitlesEnabled && Array.isArray(content.availableSubtitleLanguages) && content.availableSubtitleLanguages.length > 0) {
      if (content.availableSubtitleLanguages.includes(settings.defaultSubtitleLanguage)) {
        subtitleLang = settings.defaultSubtitleLanguage;
      } else {
        subtitleLang = content.availableSubtitleLanguages[0];
      }
    } else {
      subtitlesEnabled = false;
      subtitleLang = null;
    }

    const playbackUrl = 'https://streaming.example.com/vod/' + encodeURIComponent(contentId) + '.mp4';

    const session = {
      type: 'vod',
      channelId: null,
      contentId,
      recordingId: null,
      audioLanguage: audioLang,
      subtitleLanguage: subtitleLang,
      subtitlesEnabled,
      startedAt: this._nowIso()
    };
    this._saveToStorage('current_playback_session', session);

    return {
      success: true,
      playbackUrl,
      appliedAudioLanguage: audioLang,
      appliedSubtitleLanguage: subtitleLang,
      subtitlesEnabled
    };
  }

  // 23) updateCurrentPlaybackLanguages(audioLanguage, subtitleLanguage, subtitlesEnabled)

  updateCurrentPlaybackLanguages(audioLanguage, subtitleLanguage, subtitlesEnabled) {
    let session = this._getFromStorage('current_playback_session', null);
    if (!session || typeof session !== 'object') {
      session = {
        type: null,
        channelId: null,
        contentId: null,
        recordingId: null,
        audioLanguage: null,
        subtitleLanguage: null,
        subtitlesEnabled: false,
        startedAt: this._nowIso()
      };
    }

    if (typeof audioLanguage === 'string') {
      session.audioLanguage = audioLanguage;
    }
    if (typeof subtitleLanguage === 'string') {
      session.subtitleLanguage = subtitleLanguage;
    }
    if (typeof subtitlesEnabled === 'boolean') {
      session.subtitlesEnabled = subtitlesEnabled;
    }

    this._saveToStorage('current_playback_session', session);
    return { success: true, message: 'Playback languages updated' };
  }

  // 24) getPlaybackSettings

  getPlaybackSettings() {
    return this._getOrCreatePlaybackSettings();
  }

  // 25) updatePlaybackSettings(defaultAudioLanguage, defaultSubtitleLanguage, subtitlesEnabled)

  updatePlaybackSettings(defaultAudioLanguage, defaultSubtitleLanguage, subtitlesEnabled) {
    let settings = this._getOrCreatePlaybackSettings();
    if (typeof defaultAudioLanguage === 'string') {
      settings.defaultAudioLanguage = defaultAudioLanguage;
    }
    if (typeof defaultSubtitleLanguage === 'string') {
      settings.defaultSubtitleLanguage = defaultSubtitleLanguage;
    }
    if (typeof subtitlesEnabled === 'boolean') {
      settings.subtitlesEnabled = subtitlesEnabled;
    }
    settings.updatedAt = this._nowIso();
    this._savePlaybackSettings(settings);
    return { success: true, settings };
  }

  // 26) getCurrentSubscriptionOverview

  getCurrentSubscriptionOverview() {
    const { subscription, subscriptions } = this._getCurrentSubscriptionRecord();
    let currentSubscription = subscription;
    let currentPlan = null;
    let activeAddons = [];

    if (subscription) {
      currentPlan = this._getPlanById(subscription.planId);
      activeAddons = this._getAddonsByIds(subscription.activeAddonIds || []);
      currentSubscription = Object.assign({}, subscription, {
        plan: currentPlan,
        addons: activeAddons
      });
    }

    // Ensure we keep storage untouched
    if (!subscription && subscriptions.length > 0) {
      this._saveToStorage('current_subscriptions', subscriptions);
    }

    return {
      currentSubscription,
      currentPlan,
      activeAddons
    };
  }

  // 27) getPlanFilterOptions

  getPlanFilterOptions() {
    const plans = this._getFromStorage('subscription_plans', []);
    const streamsSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    plans.forEach((p) => {
      streamsSet.add(p.maxSimultaneousStreams);
      if (minPrice === null || p.monthlyPrice < minPrice) minPrice = p.monthlyPrice;
      if (maxPrice === null || p.monthlyPrice > maxPrice) maxPrice = p.monthlyPrice;
    });

    const maxStreamsOptions = Array.from(streamsSet)
      .sort((a, b) => a - b)
      .map((value) => ({ value, label: String(value) + ' streams' }));

    if (minPrice === null) {
      minPrice = 0;
      maxPrice = 0;
    }

    const priceRange = { min: minPrice, max: maxPrice, step: 1 };

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'streams_high_to_low', label: 'Streams: High to Low' }
    ];

    return { maxStreamsOptions, priceRange, sortOptions };
  }

  // 28) listAvailablePlans(filters, sortBy)

  listAvailablePlans(filters, sortBy) {
    const f = filters || {};
    const sort = sortBy || 'price_low_to_high';
    let plans = this._getFromStorage('subscription_plans', []);

    if (!f.includeDeprecated) {
      plans = plans.filter((p) => p.status !== 'deprecated');
    }

    if (typeof f.minSimultaneousStreams === 'number') {
      plans = plans.filter((p) => p.maxSimultaneousStreams >= f.minSimultaneousStreams);
    }

    if (typeof f.maxMonthlyPrice === 'number') {
      plans = plans.filter((p) => p.monthlyPrice <= f.maxMonthlyPrice);
    }

    if (Array.isArray(f.planTypes) && f.planTypes.length > 0) {
      const typeSet = new Set(f.planTypes);
      plans = plans.filter((p) => typeSet.has(p.planType));
    }

    plans.sort((a, b) => {
      if (sort === 'price_high_to_low') {
        return b.monthlyPrice - a.monthlyPrice;
      }
      if (sort === 'streams_high_to_low') {
        return b.maxSimultaneousStreams - a.maxSimultaneousStreams;
      }
      // price_low_to_high
      return a.monthlyPrice - b.monthlyPrice;
    });

    return plans;
  }

  // 29) selectSubscriptionPlan(planId)

  selectSubscriptionPlan(planId) {
    const plans = this._getFromStorage('subscription_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, message: 'Plan not found', pendingChangeSummary: null };
    }

    let session = this._getOrCreateSubscriptionChangeSession('plan_change');
    session.selectedPlanId = planId;

    session = this._recalculateSessionPrices(session);

    const pendingChangeSummary = {
      changeType: session.changeType,
      newPlan: plan,
      newBaseMonthlyPrice: session.newBaseMonthlyPrice,
      newTotalMonthlyPrice: session.newTotalMonthlyPrice
    };

    return { success: true, message: 'Plan selected', pendingChangeSummary };
  }

  // 30) getAddonCategories

  getAddonCategories() {
    const addons = this._getFromStorage('addons', []).filter((a) => a.status === 'available');
    const map = new Map();
    addons.forEach((a) => {
      const cat = a.category || 'other';
      if (!map.has(cat)) map.set(cat, 0);
      map.set(cat, map.get(cat) + 1);
    });

    return Array.from(map.entries()).map(([category, count]) => ({
      category,
      label: this._titleCase(category),
      addonCount: count
    }));
  }

  // 31) getAddonFilterOptions

  getAddonFilterOptions() {
    const addons = this._getFromStorage('addons', []);
    const categorySet = new Set();
    let minPrice = null;
    let maxPrice = null;

    addons.forEach((a) => {
      if (a.category) categorySet.add(a.category);
      if (minPrice === null || a.monthlyPrice < minPrice) minPrice = a.monthlyPrice;
      if (maxPrice === null || a.monthlyPrice > maxPrice) maxPrice = a.monthlyPrice;
    });

    const categories = Array.from(categorySet).map((value) => ({
      value,
      label: this._titleCase(value)
    }));

    if (minPrice === null) {
      minPrice = 0;
      maxPrice = 0;
    }

    const priceRange = { min: minPrice, max: maxPrice, step: 1 };

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return { categories, priceRange, sortOptions };
  }

  // 32) listAddons(filters, sortBy)

  listAddons(filters, sortBy) {
    const f = filters || {};
    const sort = sortBy || 'price_low_to_high';
    let addons = this._getFromStorage('addons', []).filter((a) => a.status === 'available');

    if (f.category) {
      addons = addons.filter((a) => a.category === f.category);
    }
    if (typeof f.maxMonthlyPrice === 'number') {
      addons = addons.filter((a) => a.monthlyPrice <= f.maxMonthlyPrice);
    }
    if (f.keyword) {
      const kw = f.keyword.toLowerCase();
      addons = addons.filter((a) => {
        const name = (a.name || '').toLowerCase();
        const sd = (a.shortDescription || '').toLowerCase();
        const fd = (a.fullDescription || '').toLowerCase();
        const inKeywords = Array.isArray(a.keywords) && a.keywords.some((k) => (k || '').toLowerCase().includes(kw));
        return name.includes(kw) || sd.includes(kw) || fd.includes(kw) || inKeywords;
      });
    }

    addons.sort((a, b) => {
      if (sort === 'price_high_to_low') return b.monthlyPrice - a.monthlyPrice;
      return a.monthlyPrice - b.monthlyPrice;
    });

    const channels = this._getFromStorage('channels', []);
    const channelMap = new Map(channels.map((c) => [c.id, c]));

    return addons.map((addon) => {
      const includedChannelIds = addon.includedChannelIds || [];
      const includedChannels = includedChannelIds.map((id) => channelMap.get(id)).filter((c) => !!c);
      return Object.assign({}, addon, { includedChannels });
    });
  }

  // 33) getAddonDetail(addonId)

  getAddonDetail(addonId) {
    const addons = this._getFromStorage('addons', []);
    const addon = addons.find((a) => a.id === addonId) || null;
    if (!addon) {
      return { addon: null, includedChannels: [], isActive: false };
    }

    const channels = this._getFromStorage('channels', []);
    const channelMap = new Map(channels.map((c) => [c.id, c]));
    const includedChannelIds = addon.includedChannelIds || [];
    const includedChannels = includedChannelIds.map((id) => channelMap.get(id)).filter((c) => !!c);

    const currentSub = this._getCurrentSubscriptionRaw();
    const isActive = currentSub ? (currentSub.activeAddonIds || []).includes(addonId) : false;

    return { addon, includedChannels, isActive };
  }

  // 34) selectAddonForSubscription(addonId, action)

  selectAddonForSubscription(addonId, action) {
    const act = action || '';
    if (act !== 'add' && act !== 'remove') {
      return { success: false, message: 'Invalid action', pendingChangeSummary: null };
    }

    const addons = this._getFromStorage('addons', []);
    const addon = addons.find((a) => a.id === addonId && a.status === 'available');
    if (!addon) {
      return { success: false, message: 'Addon not found or unavailable', pendingChangeSummary: null };
    }

    const currentSub = this._getCurrentSubscriptionRaw();
    const currentlyActive = currentSub ? (currentSub.activeAddonIds || []).includes(addonId) : false;

    let session = this._getOrCreateSubscriptionChangeSession(act === 'add' ? 'addon_add' : 'addon_remove');
    if (!session.addedAddonIds) session.addedAddonIds = [];
    if (!session.removedAddonIds) session.removedAddonIds = [];

    const addedSet = new Set(session.addedAddonIds);
    const removedSet = new Set(session.removedAddonIds);

    if (act === 'add') {
      if (!currentlyActive) {
        removedSet.delete(addonId);
        addedSet.add(addonId);
      } else {
        // was active and add requested: treat as no-op
      }
    } else if (act === 'remove') {
      if (currentlyActive) {
        addedSet.delete(addonId);
        removedSet.add(addonId);
      } else {
        // not active and remove requested: treat as no-op
      }
    }

    session.addedAddonIds = Array.from(addedSet);
    session.removedAddonIds = Array.from(removedSet);

    if (session.selectedPlanId && (session.addedAddonIds.length > 0 || session.removedAddonIds.length > 0)) {
      session.changeType = 'mixed';
    } else if (session.addedAddonIds.length > 0 && session.removedAddonIds.length > 0) {
      session.changeType = 'mixed';
    } else if (session.addedAddonIds.length > 0) {
      session.changeType = 'addon_add';
    } else if (session.removedAddonIds.length > 0) {
      session.changeType = 'addon_remove';
    }

    session = this._recalculateSessionPrices(session);

    const addedAddons = this._getAddonsByIds(session.addedAddonIds);
    const removedAddons = this._getAddonsByIds(session.removedAddonIds);

    const pendingChangeSummary = {
      changeType: session.changeType,
      addedAddons,
      removedAddons,
      newAddonsMonthlyPrice: session.newAddonsMonthlyPrice,
      newTotalMonthlyPrice: session.newTotalMonthlyPrice
    };

    return { success: true, message: 'Addon selection updated', pendingChangeSummary };
  }

  // 35) getSubscriptionChangeSummary

  getSubscriptionChangeSummary() {
    const sessions = this._getFromStorage('subscription_change_sessions', []);
    let session = sessions.find((s) => s.status === 'in_progress') || null;
    if (!session && sessions.length > 0) {
      session = sessions[sessions.length - 1];
    }

    if (!session) {
      const { currentSubscription } = this.getCurrentSubscriptionOverview();
      return {
        hasPendingChange: false,
        changeSession: null,
        currentSubscription,
        selectedPlan: null,
        addedAddons: [],
        removedAddons: []
      };
    }

    const currentSubOverview = this.getCurrentSubscriptionOverview();

    const selectedPlan = this._getPlanById(session.selectedPlanId);
    const addedAddons = this._getAddonsByIds(session.addedAddonIds || []);
    const removedAddons = this._getAddonsByIds(session.removedAddonIds || []);

    const oldPlan = this._getPlanById(session.oldPlanId);
    const changeSession = Object.assign({}, session, {
      oldPlan,
      selectedPlan,
      addedAddons,
      removedAddons
    });

    return {
      hasPendingChange: session.status === 'in_progress',
      changeSession,
      currentSubscription: currentSubOverview.currentSubscription,
      selectedPlan,
      addedAddons,
      removedAddons
    };
  }

  // 36) confirmSubscriptionChange

  confirmSubscriptionChange() {
    const sessions = this._getFromStorage('subscription_change_sessions', []);
    const idx = sessions.findIndex((s) => s.status === 'in_progress');
    if (idx === -1) {
      return { success: false, message: 'No pending subscription changes', updatedSubscription: null };
    }

    const session = sessions[idx];
    const { subscription, subscriptions, index } = this._getCurrentSubscriptionRecord();
    const now = this._nowIso();

    const plans = this._getFromStorage('subscription_plans', []);
    const addons = this._getFromStorage('addons', []);
    const plan = plans.find((p) => p.id === (session.selectedPlanId || (subscription && subscription.planId))) || null;

    let newSub = subscription || {
      id: this._generateId('sub'),
      planId: plan ? plan.id : null,
      activeAddonIds: [],
      baseMonthlyPrice: plan ? plan.monthlyPrice : 0,
      addonsMonthlyPrice: 0,
      totalMonthlyPrice: plan ? plan.monthlyPrice : 0,
      billingCycle: 'monthly',
      nextBillingDate: null,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    if (plan) {
      newSub.planId = plan.id;
      newSub.baseMonthlyPrice = plan.monthlyPrice;
    }

    const baseAddonIds = subscription ? (subscription.activeAddonIds || []).slice() : [];
    const finalSet = new Set(baseAddonIds);
    (session.removedAddonIds || []).forEach((id) => {
      if (finalSet.has(id)) finalSet.delete(id);
    });
    (session.addedAddonIds || []).forEach((id) => {
      finalSet.add(id);
    });

    const addonMap = new Map(addons.map((a) => [a.id, a]));
    let addonsPrice = 0;
    finalSet.forEach((id) => {
      const a = addonMap.get(id);
      if (a && a.status !== 'deprecated') {
        addonsPrice += a.monthlyPrice;
      }
    });

    newSub.activeAddonIds = Array.from(finalSet);
    newSub.addonsMonthlyPrice = addonsPrice;
    newSub.totalMonthlyPrice = newSub.baseMonthlyPrice + addonsPrice;
    newSub.updatedAt = now;
    if (!newSub.status) newSub.status = 'active';

    if (index >= 0) {
      subscriptions[index] = newSub;
    } else {
      subscriptions.push(newSub);
    }
    this._saveToStorage('current_subscriptions', subscriptions);

    sessions[idx] = Object.assign({}, session, { status: 'confirmed', confirmedAt: now });
    this._saveToStorage('subscription_change_sessions', sessions);

    const updatedSubscription = Object.assign({}, newSub, {
      plan,
      addons: this._getAddonsByIds(newSub.activeAddonIds)
    });

    return { success: true, message: 'Subscription updated', updatedSubscription };
  }

  // 37) cancelSubscriptionChange

  cancelSubscriptionChange() {
    const sessions = this._getFromStorage('subscription_change_sessions', []);
    let changed = false;
    sessions.forEach((s) => {
      if (s.status === 'in_progress') {
        s.status = 'canceled';
        changed = true;
      }
    });
    if (changed) {
      this._saveToStorage('subscription_change_sessions', sessions);
      return { success: true, message: 'Pending subscription changes canceled' };
    }
    return { success: false, message: 'No pending subscription changes' };
  }

  // 38) getProfilesOverview

  getProfilesOverview() {
    return this._getFromStorage('profiles', []);
  }

  // 39) getParentalControlOptions

  getParentalControlOptions() {
    const maxContentRatings = [
      { value: 'g', label: 'G' },
      { value: 'pg', label: 'PG' },
      { value: 'pg_13', label: 'PG-13' },
      { value: 'r', label: 'R' },
      { value: 'nc_17', label: 'NC-17' },
      { value: 'unrated', label: 'Unrated' }
    ];

    const blockedCategoryOptions = [
      { value: 'adult', label: 'Adult' },
      { value: 'violence', label: 'Violence' },
      { value: 'explicit', label: 'Explicit' }
    ];

    const pinRequiredLength = 4;

    return { maxContentRatings, blockedCategoryOptions, pinRequiredLength };
  }

  // 40) createProfile(name, profileType, isDefault, maxContentRating, blockedContentCategories, pinEnabled, pinCode)

  createProfile(name, profileType, isDefault, maxContentRating, blockedContentCategories, pinEnabled, pinCode) {
    const profiles = this._getFromStorage('profiles', []);
    const now = this._nowIso();

    const pinRequiredLength = 4;
    const pinOn = !!pinEnabled;
    let pinValue = null;
    if (pinOn) {
      if (!pinCode || String(pinCode).length !== pinRequiredLength) {
        return { success: false, message: 'PIN must be a 4-digit code', profile: null };
      }
      pinValue = String(pinCode);
    }

    const newProfile = {
      id: this._generateId('prof'),
      name,
      profileType,
      avatarImage: null,
      isDefault: !!isDefault,
      maxContentRating,
      blockedContentCategories: Array.isArray(blockedContentCategories) ? blockedContentCategories : [],
      pinEnabled: pinOn,
      pinCode: pinValue,
      createdAt: now,
      updatedAt: now
    };

    if (newProfile.isDefault) {
      profiles.forEach((p) => {
        p.isDefault = false;
      });
    }

    profiles.push(newProfile);
    this._saveToStorage('profiles', profiles);

    return { success: true, message: 'Profile created', profile: newProfile };
  }

  // 41) updateProfileSettings(profileId, settings)

  updateProfileSettings(profileId, settings) {
    const profiles = this._getFromStorage('profiles', []);
    const idx = profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) {
      return { success: false, message: 'Profile not found', profile: null };
    }

    const existing = profiles[idx];
    const updated = Object.assign({}, existing);

    if (Object.prototype.hasOwnProperty.call(settings, 'name')) {
      updated.name = settings.name;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'profileType')) {
      updated.profileType = settings.profileType;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'maxContentRating')) {
      updated.maxContentRating = settings.maxContentRating;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'blockedContentCategories')) {
      updated.blockedContentCategories = Array.isArray(settings.blockedContentCategories)
        ? settings.blockedContentCategories
        : [];
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'pinEnabled')) {
      updated.pinEnabled = !!settings.pinEnabled;
      if (!updated.pinEnabled) {
        updated.pinCode = null;
      }
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'pinCode')) {
      if (updated.pinEnabled) {
        const code = String(settings.pinCode || '');
        if (code.length !== 4) {
          return { success: false, message: 'PIN must be a 4-digit code', profile: null };
        }
        updated.pinCode = code;
      }
    }

    updated.updatedAt = this._nowIso();
    profiles[idx] = updated;
    this._saveToStorage('profiles', profiles);

    return { success: true, message: 'Profile updated', profile: updated };
  }

  // 42) getDevices(sortBy)

  getDevices(sortBy) {
    const sort = sortBy || 'last_active_newest_first';
    const devices = this._getFromStorage('devices', []).slice();

    devices.sort((a, b) => {
      if (sort === 'last_active_oldest_first') {
        return this._parseDate(a.lastActiveAt) - this._parseDate(b.lastActiveAt);
      }
      if (sort === 'name_a_to_z') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // last_active_newest_first
      return this._parseDate(b.lastActiveAt) - this._parseDate(a.lastActiveAt);
    });

    return devices;
  }

  // 43) removeDevice(deviceId)

  removeDevice(deviceId) {
    const devices = this._getFromStorage('devices', []);
    const idx = devices.findIndex((d) => d.id === deviceId);
    if (idx === -1) {
      return { success: false, message: 'Device not found' };
    }
    devices.splice(idx, 1);
    this._updateDeviceRegistry(devices);
    return { success: true, message: 'Device removed' };
  }

  // 44) updateDeviceName(deviceId, newName)

  updateDeviceName(deviceId, newName) {
    if (!newName || !String(newName).trim()) {
      return { success: false, message: 'New name is required', device: null };
    }
    const devices = this._getFromStorage('devices', []);
    const idx = devices.findIndex((d) => d.id === deviceId);
    if (idx === -1) {
      return { success: false, message: 'Device not found', device: null };
    }
    const updated = Object.assign({}, devices[idx], { name: String(newName).trim() });
    devices[idx] = updated;
    this._updateDeviceRegistry(devices);
    return { success: true, message: 'Device name updated', device: updated };
  }

  // 45) getNotificationSettings

  getNotificationSettings() {
    return this._getOrCreateNotificationSettings();
  }

  // 46) updateNotificationSettings(settings)

  updateNotificationSettings(settings) {
    let current = this._getOrCreateNotificationSettings();

    const fields = [
      'promotionsEmailEnabled',
      'promotionsInAppEnabled',
      'promotionsSmsEnabled',
      'billingEmailEnabled',
      'billingInAppEnabled',
      'billingSmsEnabled',
      'systemEmailEnabled',
      'systemInAppEnabled',
      'systemSmsEnabled',
      'smsPhoneNumber'
    ];

    fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(settings, field)) {
        current[field] = settings[field];
      }
    });

    current.lastUpdatedAt = this._nowIso();
    this._persistNotificationSettings(current);

    return { success: true, message: 'Notification settings updated', settings: current };
  }

  // 47) getHelpAndSupportOverview

  getHelpAndSupportOverview() {
    const faqs = [
      {
        id: 'faq_1',
        question: 'How do I change my subscription plan?',
        shortAnswer: 'Go to your account subscription section to view and change available plans.'
      },
      {
        id: 'faq_2',
        question: 'How do I schedule a recording?',
        shortAnswer: 'Open the TV Guide, select a program, and choose the record option.'
      }
    ];

    const guides = [
      {
        id: 'guide_1',
        title: 'Managing Subscription & Plans',
        summary: 'Learn how to view, change, and manage your IPTV subscription and add-ons.',
        relatedPageKey: 'subscription_and_plans'
      },
      {
        id: 'guide_2',
        title: 'Using Recordings',
        summary: 'How to schedule, manage, and play your DVR recordings.',
        relatedPageKey: 'recordings'
      },
      {
        id: 'guide_3',
        title: 'Profiles & Parental Controls',
        summary: 'Set up kids profiles and configure parental control PINs and ratings.',
        relatedPageKey: 'profiles'
      }
    ];

    const contactOptions = {
      supportEmail: 'support@example.com',
      supportPhone: '+1-555-000-0000',
      chatAvailable: false
    };

    return { faqs, guides, contactOptions };
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
