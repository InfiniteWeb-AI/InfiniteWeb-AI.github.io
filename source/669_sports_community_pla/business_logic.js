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
  }

  // ==========================
  // Storage helpers
  // ==========================

  _initStorage() {
    const keys = [
      'current_player_profiles',
      'clubs',
      'groups',
      'group_schedules',
      'group_memberships',
      'match_events',
      'match_occurrences',
      'match_bookings',
      'coaches',
      'coach_availability_slots',
      'coach_session_bookings',
      'player_directory_entries',
      'player_match_invites',
      'tournaments',
      'tournament_registrations',
      'forum_categories',
      'forum_threads',
      'forum_posts',
      'thread_bookmarks',
      'marketplace_sellers',
      'marketplace_items',
      'marketplace_messages',
      'marketplace_reservations',
      'notification_preferences',
      'quiet_hours_settings',
      'matches_page_view_preferences'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
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

  // ==========================
  // Generic helpers
  // ==========================

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDateOnly(dateStr) {
    // 'YYYY-MM-DD' -> Date at midnight
    const parts = dateStr.split('-').map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  _sameDate(dateTimeIso, dateOnlyStr) {
    if (!dateTimeIso || !dateOnlyStr) return false;
    const d = new Date(dateTimeIso);
    const parts = dateOnlyStr.split('-').map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
    return (
      d.getUTCFullYear() === parts[0] &&
      d.getUTCMonth() === parts[1] - 1 &&
      d.getUTCDate() === parts[2]
    );
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map((x) => parseInt(x, 10));
    if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
    return parts[0] * 60 + parts[1];
  }

  _getTimeFromDateTime(dateTimeIso) {
    if (!dateTimeIso) return null;
    const d = new Date(dateTimeIso);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }

  _compareTimes(a, b) {
    const ma = this._parseTimeToMinutes(a) || 0;
    const mb = this._parseTimeToMinutes(b) || 0;
    return ma - mb;
  }

  _withinDateRange(dateTimeIso, startDateStr, endDateStr) {
    const d = new Date(dateTimeIso);
    if (startDateStr) {
      const start = this._parseDateOnly(startDateStr);
      if (start && d < start) return false;
    }
    if (endDateStr) {
      const end = this._parseDateOnly(endDateStr);
      if (end) {
        const endPlusOne = new Date(end.getTime());
        endPlusOne.setDate(endPlusOne.getDate() + 1);
        if (d >= endPlusOne) return false;
      }
    }
    return true;
  }

  _applyListSortingAndPaging(items, sortBy, mapping) {
    // mapping is optional, not used for paging here
    const arr = items.slice();
    switch (sortBy) {
      case 'rating_desc':
        arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'member_count_desc':
        arr.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
        break;
      case 'distance_asc':
        arr.sort((a, b) => {
          const da = a.distanceFromHomeKm;
          const db = b.distanceFromHomeKm;
          if (da == null && db == null) return 0;
          if (da == null) return 1;
          if (db == null) return -1;
          return da - db;
        });
        break;
      case 'start_time_asc':
        arr.sort((a, b) => {
          const ta = new Date(a.matchOccurrence ? a.matchOccurrence.startDateTime : a.startDateTime || a.createdAt || 0).getTime();
          const tb = new Date(b.matchOccurrence ? b.matchOccurrence.startDateTime : b.startDateTime || b.createdAt || 0).getTime();
          return ta - tb;
        });
        break;
      case 'price_asc':
        arr.sort((a, b) => {
          const pa = a.pricePerPlayer != null ? a.pricePerPlayer : a.item && a.item.price;
          const pb = b.pricePerPlayer != null ? b.pricePerPlayer : b.item && b.item.price;
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return pa - pb;
        });
        break;
      case 'matches_played_desc':
        arr.sort((a, b) => (b.matchesPlayed || 0) - (a.matchesPlayed || 0));
        break;
      case 'start_date_asc':
        arr.sort((a, b) => {
          const da = new Date(a.tournament ? a.tournament.startDate : a.startDate).getTime();
          const db = new Date(b.tournament ? b.tournament.startDate : b.startDate).getTime();
          return da - db;
        });
        break;
      case 'most_replies':
        arr.sort((a, b) => (b.repliesCount || 0) - (a.repliesCount || 0));
        break;
      case 'most_active':
        arr.sort((a, b) => {
          const la = new Date(a.lastActivityAt || a.createdAt || 0).getTime();
          const lb = new Date(b.lastActivityAt || b.createdAt || 0).getTime();
          return lb - la;
        });
        break;
      case 'newest':
        arr.sort((a, b) => {
          const ca = new Date(a.createdAt || 0).getTime();
          const cb = new Date(b.createdAt || 0).getTime();
          return cb - ca;
        });
        break;
      case 'seller_rating_desc':
        arr.sort((a, b) => {
          const ra = a.seller ? a.seller.rating || 0 : 0;
          const rb = b.seller ? b.seller.rating || 0 : 0;
          return rb - ra;
        });
        break;
      default:
        break;
    }
    return arr;
  }

  _deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  _calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (
      lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
      Number.isNaN(lat1) || Number.isNaN(lon1) || Number.isNaN(lat2) || Number.isNaN(lon2)
    ) {
      return null;
    }
    const R = 6371; // km
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(lat1)) *
        Math.cos(this._deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _getOrCreateCurrentPlayerProfile() {
    const profiles = this._getFromStorage('current_player_profiles');
    if (profiles.length > 0) return profiles[0];
    return null; // Do not auto-mock profile data
  }

  _calculateDistanceFromHomeForClub(club) {
    if (!club) return null;
    const profile = this._getOrCreateCurrentPlayerProfile();
    if (!profile || profile.homeLatitude == null || profile.homeLongitude == null) {
      return club.distanceFromHomeKm != null ? club.distanceFromHomeKm : null;
    }
    if (club.latitude == null || club.longitude == null) {
      return club.distanceFromHomeKm != null ? club.distanceFromHomeKm : null;
    }
    return this._calculateDistanceKm(
      profile.homeLatitude,
      profile.homeLongitude,
      club.latitude,
      club.longitude
    );
  }

  _generateMatchOccurrencesForEvent(matchEvent) {
    const occurrences = this._getFromStorage('match_occurrences');
    const clubs = this._getFromStorage('clubs');
    const club = clubs.find((c) => c.id === matchEvent.clubId) || null;

    const freq = matchEvent.recurrenceFrequency || 'none';
    const interval = matchEvent.recurrenceInterval || 1;
    const count = matchEvent.recurrenceCount || 1;

    const generated = [];
    let currentStart = new Date(matchEvent.startTime);

    for (let i = 0; i < count; i++) {
      const startIso = currentStart.toISOString();
      const end = new Date(currentStart.getTime() + matchEvent.durationMinutes * 60000);
      const endIso = end.toISOString();

      const distanceFromHomeKm = this._calculateDistanceFromHomeForClub(club);

      const occ = {
        id: this._generateId('match_occurrence'),
        matchEventId: matchEvent.id,
        startDateTime: startIso,
        endDateTime: endIso,
        distanceFromHomeKm: distanceFromHomeKm,
        availableSlots: matchEvent.maxPlayers,
        totalSlots: matchEvent.maxPlayers,
        pricePerPlayer: matchEvent.pricePerPlayer != null ? matchEvent.pricePerPlayer : 0,
        currency: matchEvent.currency || 'eur',
        skillMinLevel: matchEvent.skillMinLevel,
        skillMaxLevel: matchEvent.skillMaxLevel,
        status: 'scheduled'
      };
      occurrences.push(occ);
      generated.push(occ);

      if (freq === 'weekly') {
        currentStart = new Date(currentStart.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
      } else if (freq === 'monthly') {
        const next = new Date(currentStart.getTime());
        next.setMonth(next.getMonth() + interval);
        currentStart = next;
      } else {
        break;
      }
    }

    this._saveToStorage('match_occurrences', occurrences);
    return generated;
  }

  _getOrCreateNotificationPreferences() {
    let preferences = this._getFromStorage('notification_preferences');
    let quietHoursArr = this._getFromStorage('quiet_hours_settings');

    const categories = ['match_invitations', 'tournaments', 'messages', 'community'];

    if (!preferences || !Array.isArray(preferences)) {
      preferences = [];
    }

    for (const cat of categories) {
      if (!preferences.find((p) => p.category === cat)) {
        preferences.push({
          id: this._generateId('notif_pref'),
          category: cat,
          emailEnabled: false,
          smsEnabled: false,
          inSiteEnabled: false
        });
      }
    }

    if (!quietHoursArr || !Array.isArray(quietHoursArr) || quietHoursArr.length === 0) {
      const qh = {
        id: this._generateId('quiet_hours'),
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
        timezone: undefined,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      quietHoursArr = [qh];
    }

    this._saveToStorage('notification_preferences', preferences);
    this._saveToStorage('quiet_hours_settings', quietHoursArr);

    return { preferences, quietHours: quietHoursArr[0] };
  }

  // ==========================
  // Interface implementations
  // ==========================

  // 1. getHomeHighlights
  getHomeHighlights() {
    const profile = this._getOrCreateCurrentPlayerProfile();
    const hasProfile = !!profile;

    const groups = this._getFromStorage('groups');
    const clubs = this._getFromStorage('clubs');
    const matchOccurrences = this._getFromStorage('match_occurrences');
    const matchEvents = this._getFromStorage('match_events');
    const coaches = this._getFromStorage('coaches');
    const tournaments = this._getFromStorage('tournaments');
    const forumThreads = this._getFromStorage('forum_threads');
    const forumCategories = this._getFromStorage('forum_categories');
    const marketplaceItems = this._getFromStorage('marketplace_items');
    const marketplaceSellers = this._getFromStorage('marketplace_sellers');

    const profileCompletionHint = hasProfile
      ? ''
      : 'Create your player profile to join groups and book matches.';

    // popularGroups: top rated
    const popularGroupsBase = groups.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
    const popularGroups = popularGroupsBase.map((g) => {
      const club = clubs.find((c) => c.id === g.clubId) || null;
      return {
        ...g,
        club
      };
    });

    // upcomingMatchOccurrences: next few scheduled
    const upcomingMatchOccurrences = matchOccurrences
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
      .slice(0, 5)
      .map((occ) => {
        const event = matchEvents.find((e) => e.id === occ.matchEventId) || null;
        const club = event ? clubs.find((c) => c.id === event.clubId) || null : null;
        return {
          ...occ,
          matchEvent: event,
          club
        };
      });

    // topCoaches: by rating
    const topCoaches = coaches
      .filter((c) => c.isActive)
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);

    // upcomingTournaments: by start date
    const upcomingTournaments = tournaments
      .filter((t) => t.isActive)
      .slice()
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5)
      .map((t) => {
        const club = clubs.find((c) => c.id === t.clubId) || null;
        return {
          ...t,
          club
        };
      });

    // activeForumThreads: most active
    const activeForumThreads = forumThreads
      .slice()
      .sort((a, b) => new Date(b.lastActivityAt || b.createdAt || 0).getTime() - new Date(a.lastActivityAt || a.createdAt || 0).getTime())
      .slice(0, 5)
      .map((thread) => {
        const category = forumCategories.find((c) => c.id === thread.categoryId) || null;
        return {
          ...thread,
          category
        };
      });

    // featuredMarketplaceItems: newest items
    const featuredMarketplaceItems = marketplaceItems
      .filter((i) => i.status === 'active')
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((item) => {
        const seller = marketplaceSellers.find((s) => s.id === item.sellerId) || null;
        return {
          ...item,
          seller
        };
      });

    return {
      hasProfile,
      profileCompletionHint,
      popularGroups,
      upcomingMatchOccurrences,
      topCoaches,
      upcomingTournaments,
      activeForumThreads,
      featuredMarketplaceItems
    };
  }

  // 2. getCurrentPlayerProfileSummary
  getCurrentPlayerProfileSummary() {
    const profiles = this._getFromStorage('current_player_profiles');
    const profile = profiles.length > 0 ? profiles[0] : null;

    const groupMembershipsRaw = this._getFromStorage('group_memberships');
    const groups = this._getFromStorage('groups');

    const groupMemberships = groupMembershipsRaw.map((m) => ({
      membership: m,
      group: groups.find((g) => g.id === m.groupId) || null
    }));

    const matchBookings = this._getFromStorage('match_bookings');
    const matchOccurrences = this._getFromStorage('match_occurrences');
    const matchEvents = this._getFromStorage('match_events');
    const clubs = this._getFromStorage('clubs');

    const now = new Date();
    const upcomingMatches = matchBookings
      .filter((b) => b.status === 'booked')
      .map((b) => {
        const occ = matchOccurrences.find((o) => o.id === b.matchOccurrenceId);
        if (!occ) return null;
        if (new Date(occ.startDateTime) < now) return null;
        const event = matchEvents.find((e) => e.id === occ.matchEventId) || null;
        const club = event ? clubs.find((c) => c.id === event.clubId) || null : null;
        return {
          matchOccurrence: occ,
          matchEvent: event,
          club
        };
      })
      .filter((x) => x !== null)
      .sort((a, b) => new Date(a.matchOccurrence.startDateTime).getTime() - new Date(b.matchOccurrence.startDateTime).getTime());

    const tournamentRegistrationsRaw = this._getFromStorage('tournament_registrations');
    const tournaments = this._getFromStorage('tournaments');

    const tournamentRegistrations = tournamentRegistrationsRaw
      .filter((r) => r.status === 'registered')
      .map((r) => {
        const t = tournaments.find((tt) => tt.id === r.tournamentId) || null;
        const club = t ? clubs.find((c) => c.id === t.clubId) || null : null;
        return {
          registration: r,
          tournament: t,
          club
        };
      });

    return {
      profile,
      groupMemberships,
      upcomingMatches,
      tournamentRegistrations
    };
  }

  // 3. saveCurrentPlayerProfile
  saveCurrentPlayerProfile(username, password, city, homeLatitude, homeLongitude, homeRadiusKm, skillLevel, skillLevelLabel) {
    let profiles = this._getFromStorage('current_player_profiles');
    const nowIso = this._nowIso();
    let isNewProfile = false;
    let profile;

    if (profiles.length === 0) {
      profile = {
        id: this._generateId('profile'),
        username,
        password,
        city,
        homeLatitude,
        homeLongitude,
        homeRadiusKm,
        skillLevel,
        skillLevelLabel,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      profiles = [profile];
      isNewProfile = true;
    } else {
      profile = {
        ...profiles[0],
        username,
        password,
        city,
        homeLatitude,
        homeLongitude,
        homeRadiusKm,
        skillLevel,
        skillLevelLabel,
        updatedAt: nowIso
      };
      profiles[0] = profile;
    }

    this._saveToStorage('current_player_profiles', profiles);

    return {
      success: true,
      isNewProfile,
      profile,
      message: isNewProfile ? 'Profile created.' : 'Profile updated.'
    };
  }

  // 4. getGroupsFilterOptions
  getGroupsFilterOptions() {
    const skillLevels = [1, 2, 3, 4, 5].map((level) => ({
      level,
      label: 'Level ' + level
    }));

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const timeRanges = [
      { code: 'evening', label: 'Evening (18:00-22:00)', startTime: '18:00', endTime: '22:00' }
    ];

    const distanceOptionsKm = [5, 10, 25, 50];

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'member_count_desc', label: 'Members: High to Low' },
      { value: 'distance_asc', label: 'Distance: Near to Far' }
    ];

    return {
      skillLevels,
      daysOfWeek,
      timeRanges,
      distanceOptionsKm,
      sortOptions
    };
  }

  // 5. searchGroups
  searchGroups(query, maxDistanceKm, dayOfWeek, timeFrom, timeTo, skillMinLevel, skillMaxLevel, minRating, minMemberCount, sortBy) {
    const groups = this._getFromStorage('groups');
    const groupSchedules = this._getFromStorage('group_schedules');
    const clubs = this._getFromStorage('clubs');

    const timeFromMin = timeFrom ? this._parseTimeToMinutes(timeFrom) : null;
    const timeToMin = timeTo ? this._parseTimeToMinutes(timeTo) : null;

    let results = [];

    for (const g of groups) {
      // query filter (name/description)
      if (query) {
        const q = query.toLowerCase();
        const inName = (g.name || '').toLowerCase().includes(q);
        const inDesc = (g.description || '').toLowerCase().includes(q);
        if (!inName && !inDesc) continue;
      }

      const club = clubs.find((c) => c.id === g.clubId) || null;
      const distanceFromHomeKm = this._calculateDistanceFromHomeForClub(club);

      if (maxDistanceKm != null && distanceFromHomeKm != null && distanceFromHomeKm > maxDistanceKm) {
        continue;
      }

      if (minRating != null && (g.rating == null || g.rating < minRating)) {
        continue;
      }

      if (minMemberCount != null && (g.memberCount == null || g.memberCount < minMemberCount)) {
        continue;
      }

      if (skillMinLevel != null || skillMaxLevel != null) {
        const gMin = g.typicalSkillMinLevel != null ? g.typicalSkillMinLevel : 1;
        const gMax = g.typicalSkillMaxLevel != null ? g.typicalSkillMaxLevel : 10;
        const minL = skillMinLevel != null ? skillMinLevel : gMin;
        const maxL = skillMaxLevel != null ? skillMaxLevel : gMax;
        if (gMax < minL || gMin > maxL) continue; // no overlap
      }

      // Schedules / recurring day & time filters
      let matchingSchedule = null;
      const schedules = groupSchedules.filter((s) => s.groupId === g.id);

      if (dayOfWeek || timeFromMin != null || timeToMin != null) {
        for (const s of schedules) {
          if (dayOfWeek && s.dayOfWeek !== dayOfWeek) continue;
          const startMin = this._parseTimeToMinutes(s.startTime);
          if (timeFromMin != null && startMin != null && startMin < timeFromMin) continue;
          if (timeToMin != null && startMin != null && startMin > timeToMin) continue;
          matchingSchedule = s;
          break;
        }
        if (!matchingSchedule) continue;
      } else {
        matchingSchedule = schedules[0] || null;
      }

      const nextSession = matchingSchedule
        ? {
            dayOfWeek: matchingSchedule.dayOfWeek,
            startTime: matchingSchedule.startTime,
            endTime: matchingSchedule.endTime
          }
        : null;

      results.push({
        group: g,
        club,
        nextSession,
        distanceFromHomeKm
      });
    }

    // apply sorting
    if (sortBy) {
      if (sortBy === 'rating_desc') {
        results.sort((a, b) => (b.group.rating || 0) - (a.group.rating || 0));
      } else if (sortBy === 'member_count_desc') {
        results.sort((a, b) => (b.group.memberCount || 0) - (a.group.memberCount || 0));
      } else if (sortBy === 'distance_asc') {
        results.sort((a, b) => {
          const da = a.distanceFromHomeKm;
          const db = b.distanceFromHomeKm;
          if (da == null && db == null) return 0;
          if (da == null) return 1;
          if (db == null) return -1;
          return da - db;
        });
      }
    }

    return results;
  }

  // 6. getGroupDetails
  getGroupDetails(groupId) {
    const groups = this._getFromStorage('groups');
    const groupSchedules = this._getFromStorage('group_schedules');
    const groupMemberships = this._getFromStorage('group_memberships');
    const clubs = this._getFromStorage('clubs');

    const group = groups.find((g) => g.id === groupId) || null;
    const club = group ? clubs.find((c) => c.id === group.clubId) || null : null;
    const schedules = groupSchedules.filter((s) => s.groupId === groupId);
    const membership = groupMemberships.find((m) => m.groupId === groupId && m.status === 'active') || null;

    return {
      group,
      club,
      schedules,
      isMember: !!membership,
      membership
    };
  }

  // 7. joinGroup
  joinGroup(groupId) {
    const groups = this._getFromStorage('groups');
    let memberships = this._getFromStorage('group_memberships');
    const group = groups.find((g) => g.id === groupId) || null;

    if (!group) {
      return { success: false, membership: null, group: null, message: 'Group not found.' };
    }

    let membership = memberships.find((m) => m.groupId === groupId && m.status === 'active');

    if (membership) {
      return { success: true, membership, group, message: 'Already a member of this group.' };
    }

    membership = {
      id: this._generateId('group_membership'),
      groupId,
      joinedAt: this._nowIso(),
      status: 'active'
    };

    memberships.push(membership);
    this._saveToStorage('group_memberships', memberships);

    return {
      success: true,
      membership,
      group,
      message: 'Joined group successfully.'
    };
  }

  // 8. leaveGroup
  leaveGroup(groupId) {
    let memberships = this._getFromStorage('group_memberships');
    const membership = memberships.find((m) => m.groupId === groupId && m.status === 'active');

    if (!membership) {
      return { success: false, membership: null, message: 'Not a member of this group.' };
    }

    membership.status = 'left';
    this._saveToStorage('group_memberships', memberships);

    return { success: true, membership, message: 'Left group.' };
  }

  // 9. getMatchesPageViewPreference
  getMatchesPageViewPreference() {
    let prefs = this._getFromStorage('matches_page_view_preferences');
    if (!prefs || prefs.length === 0) {
      const pref = {
        id: this._generateId('matches_view_pref'),
        view: 'find_matches',
        updatedAt: this._nowIso()
      };
      prefs = [pref];
      this._saveToStorage('matches_page_view_preferences', prefs);
      return pref;
    }
    return prefs[0];
  }

  // 10. setMatchesPageViewPreference
  setMatchesPageViewPreference(view) {
    if (view !== 'find_matches' && view !== 'create_event') {
      // invalid view, keep existing
      return this.getMatchesPageViewPreference();
    }
    let prefs = this._getFromStorage('matches_page_view_preferences');
    const nowIso = this._nowIso();
    if (!prefs || prefs.length === 0) {
      const pref = {
        id: this._generateId('matches_view_pref'),
        view,
        updatedAt: nowIso
      };
      prefs = [pref];
      this._saveToStorage('matches_page_view_preferences', prefs);
      return pref;
    }
    prefs[0].view = view;
    prefs[0].updatedAt = nowIso;
    this._saveToStorage('matches_page_view_preferences', prefs);
    return prefs[0];
  }

  // 11. getMatchesFilterOptions
  getMatchesFilterOptions() {
    const matchTypes = [
      { value: 'singles', label: 'Singles' },
      { value: 'doubles', label: 'Doubles' }
    ];

    const distanceOptionsKm = [2, 5, 10, 20];

    const priceRanges = [
      { maxPricePerPlayer: 10, currency: 'eur', label: 'Up to €10' },
      { maxPricePerPlayer: 15, currency: 'eur', label: 'Up to €15' },
      { maxPricePerPlayer: 20, currency: 'eur', label: 'Up to €20' }
    ];

    const skillLevels = [1, 2, 3, 4, 5].map((level) => ({
      level,
      label: 'Level ' + level
    }));

    const sortOptions = [
      { value: 'start_time_asc', label: 'Start Time: Earliest First' },
      { value: 'price_asc', label: 'Price: Low to High' }
    ];

    return {
      matchTypes,
      distanceOptionsKm,
      priceRanges,
      skillLevels,
      sortOptions
    };
  }

  // 12. searchMatches
  searchMatches(date, timeFrom, timeTo, maxDistanceKm, matchType, maxPricePerPlayer, currency, skillMinLevel, skillMaxLevel, sortBy) {
    const occurrences = this._getFromStorage('match_occurrences');
    const events = this._getFromStorage('match_events');
    const clubs = this._getFromStorage('clubs');

    const timeFromMin = timeFrom ? this._parseTimeToMinutes(timeFrom) : null;
    const timeToMin = timeTo ? this._parseTimeToMinutes(timeTo) : null;

    let results = [];

    for (const occ of occurrences) {
      if (occ.status !== 'scheduled') continue;

      if (!this._sameDate(occ.startDateTime, date)) continue;

      const startTimeStr = this._getTimeFromDateTime(occ.startDateTime);
      const startMin = this._parseTimeToMinutes(startTimeStr);

      if (timeFromMin != null && startMin != null && startMin < timeFromMin) continue;
      if (timeToMin != null && startMin != null && startMin > timeToMin) continue;

      const event = events.find((e) => e.id === occ.matchEventId) || null;
      if (!event) continue;

      if (matchType && event.matchType !== matchType) continue;

      const price = occ.pricePerPlayer != null ? occ.pricePerPlayer : event.pricePerPlayer;
      const curr = occ.currency || event.currency;

      if (maxPricePerPlayer != null && price != null && price > maxPricePerPlayer) continue;
      if (currency && curr && curr !== currency) continue;

      if (skillMinLevel != null || skillMaxLevel != null) {
        const oMin = occ.skillMinLevel != null ? occ.skillMinLevel : event.skillMinLevel != null ? event.skillMinLevel : 1;
        const oMax = occ.skillMaxLevel != null ? occ.skillMaxLevel : event.skillMaxLevel != null ? event.skillMaxLevel : 10;
        const minL = skillMinLevel != null ? skillMinLevel : oMin;
        const maxL = skillMaxLevel != null ? skillMaxLevel : oMax;
        if (oMax < minL || oMin > maxL) continue;
      }

      const club = clubs.find((c) => c.id === event.clubId) || null;

      let distanceFromHomeKm = occ.distanceFromHomeKm;
      if (distanceFromHomeKm == null) {
        distanceFromHomeKm = this._calculateDistanceFromHomeForClub(club);
      }

      if (maxDistanceKm != null && distanceFromHomeKm != null && distanceFromHomeKm > maxDistanceKm) continue;

      results.push({
        matchOccurrence: occ,
        matchEvent: event,
        club
      });
    }

    if (sortBy === 'start_time_asc') {
      results.sort((a, b) => new Date(a.matchOccurrence.startDateTime).getTime() - new Date(b.matchOccurrence.startDateTime).getTime());
    } else if (sortBy === 'price_asc') {
      results.sort((a, b) => {
        const pa = a.matchOccurrence.pricePerPlayer != null
          ? a.matchOccurrence.pricePerPlayer
          : (a.matchEvent.pricePerPlayer || 0);
        const pb = b.matchOccurrence.pricePerPlayer != null
          ? b.matchOccurrence.pricePerPlayer
          : (b.matchEvent.pricePerPlayer || 0);
        return pa - pb;
      });
    }

    return results;
  }

  // 13. getMatchDetails
  getMatchDetails(matchOccurrenceId) {
    const occurrences = this._getFromStorage('match_occurrences');
    const events = this._getFromStorage('match_events');
    const clubs = this._getFromStorage('clubs');

    const matchOccurrence = occurrences.find((o) => o.id === matchOccurrenceId) || null;
    if (!matchOccurrence) {
      return {
        matchOccurrence: null,
        matchEvent: null,
        club: null,
        attendees: [],
        canBook: false
      };
    }

    const matchEvent = events.find((e) => e.id === matchOccurrence.matchEventId) || null;
    const club = matchEvent ? clubs.find((c) => c.id === matchEvent.clubId) || null : null;

    const canBook = matchOccurrence.status === 'scheduled' && matchOccurrence.availableSlots > 0;

    return {
      matchOccurrence,
      matchEvent,
      club,
      attendees: [], // no separate attendee data; do not mock
      canBook
    };
  }

  // 14. bookMatch
  bookMatch(matchOccurrenceId) {
    const occurrences = this._getFromStorage('match_occurrences');
    let bookings = this._getFromStorage('match_bookings');

    const occ = occurrences.find((o) => o.id === matchOccurrenceId);
    if (!occ) {
      return { success: false, booking: null, matchOccurrence: null, message: 'Match not found.' };
    }

    if (occ.status !== 'scheduled') {
      return { success: false, booking: null, matchOccurrence: occ, message: 'Match is not bookable.' };
    }

    if (occ.availableSlots <= 0) {
      return { success: false, booking: null, matchOccurrence: occ, message: 'No available slots.' };
    }

    const booking = {
      id: this._generateId('match_booking'),
      matchOccurrenceId,
      bookedAt: this._nowIso(),
      status: 'booked'
    };

    bookings.push(booking);

    occ.availableSlots = (occ.availableSlots || 0) - 1;
    this._saveToStorage('match_occurrences', occurrences);
    this._saveToStorage('match_bookings', bookings);

    return {
      success: true,
      booking,
      matchOccurrence: occ,
      message: 'Match booked.'
    };
  }

  // 15. createMatchEvent
  createMatchEvent(
    name,
    clubId,
    visibility,
    matchType,
    pricePerPlayer,
    currency,
    skillMinLevel,
    skillMaxLevel,
    maxPlayers,
    startDateTime,
    durationMinutes,
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceCount
  ) {
    const events = this._getFromStorage('match_events');

    const event = {
      id: this._generateId('match_event'),
      name,
      description: undefined,
      clubId,
      visibility,
      matchType,
      pricePerPlayer,
      currency,
      skillMinLevel,
      skillMaxLevel,
      maxPlayers,
      startTime: startDateTime,
      durationMinutes,
      recurrenceFrequency,
      recurrenceInterval,
      recurrenceCount,
      createdAt: this._nowIso()
    };

    events.push(event);
    this._saveToStorage('match_events', events);

    const generatedOccurrences = this._generateMatchOccurrencesForEvent(event);

    return {
      success: true,
      matchEvent: event,
      generatedOccurrences,
      message: 'Match event created.'
    };
  }

  // 16. getCoachesFilterOptions
  getCoachesFilterOptions() {
    const clubs = this._getFromStorage('clubs');

    const ratingThresholds = [3.0, 4.0, 4.5];

    const priceRanges = [
      { maxRate: 30, currency: 'eur', label: 'Up to €30/h' },
      { maxRate: 40, currency: 'eur', label: 'Up to €40/h' },
      { maxRate: 50, currency: 'eur', label: 'Up to €50/h' }
    ];

    const specialties = ['volleys', 'smash', 'strategy', 'beginner', 'fitness'];

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' }
    ];

    return {
      clubs,
      ratingThresholds,
      priceRanges,
      specialties,
      sortOptions
    };
  }

  // 17. searchCoaches
  searchCoaches(clubId, minRating, maxHourlyRate, currency, specialties, sortBy) {
    let coaches = this._getFromStorage('coaches');

    coaches = coaches.filter((c) => c.isActive);

    if (clubId) {
      coaches = coaches.filter((c) => Array.isArray(c.clubIds) && c.clubIds.includes(clubId));
    }

    if (minRating != null) {
      coaches = coaches.filter((c) => c.rating != null && c.rating >= minRating);
    }

    if (maxHourlyRate != null) {
      coaches = coaches.filter((c) => c.hourlyRate != null && c.hourlyRate <= maxHourlyRate);
    }

    if (currency) {
      coaches = coaches.filter((c) => !c.currency || c.currency === currency);
    }

    if (specialties && specialties.length > 0) {
      const specsLower = specialties.map((s) => s.toLowerCase());
      coaches = coaches.filter((c) => {
        if (!Array.isArray(c.specialties) || c.specialties.length === 0) return false;
        return c.specialties.some((sp) => specsLower.includes(String(sp).toLowerCase()));
      });
    }

    if (sortBy === 'rating_desc') {
      coaches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price_asc') {
      coaches.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
    }

    return coaches;
  }

  // 18. getCoachDetails
  getCoachDetails(coachId) {
    const coaches = this._getFromStorage('coaches');
    const clubs = this._getFromStorage('clubs');

    const coach = coaches.find((c) => c.id === coachId) || null;
    if (!coach) {
      return {
        coach: null,
        clubs: [],
        reviewsSummary: { averageRating: 0, totalReviews: 0 },
        specialties: []
      };
    }

    const coachClubs = Array.isArray(coach.clubIds)
      ? coach.clubIds.map((cid) => clubs.find((c) => c.id === cid)).filter((c) => !!c)
      : [];

    const reviewsSummary = {
      averageRating: coach.rating || 0,
      totalReviews: coach.ratingCount || 0
    };

    const specialties = coach.specialties || [];

    return {
      coach,
      clubs: coachClubs,
      reviewsSummary,
      specialties
    };
  }

  // 19. getCoachAvailability
  getCoachAvailability(coachId, startDate, endDate, clubId) {
    const slots = this._getFromStorage('coach_availability_slots');
    const clubs = this._getFromStorage('clubs');
    const coaches = this._getFromStorage('coaches');

    const coach = coaches.find((c) => c.id === coachId) || null;

    const filtered = slots.filter((s) => {
      if (s.coachId !== coachId) return false;
      if (clubId && s.clubId !== clubId) return false;
      if (!s.isAvailable) return false;
      if (!this._withinDateRange(s.startDateTime, startDate, endDate)) return false;
      return true;
    });

    return filtered.map((s) => ({
      ...s,
      coach,
      club: clubs.find((c) => c.id === s.clubId) || null
    }));
  }

  // 20. requestCoachSession
  requestCoachSession(availabilitySlotId, message) {
    const slots = this._getFromStorage('coach_availability_slots');
    const bookings = this._getFromStorage('coach_session_bookings');
    const coaches = this._getFromStorage('coaches');
    const clubs = this._getFromStorage('clubs');

    const slot = slots.find((s) => s.id === availabilitySlotId) || null;
    if (!slot || !slot.isAvailable) {
      return { success: false, booking: null, coach: null, club: null, message: 'Slot not available.' };
    }

    const coach = coaches.find((c) => c.id === slot.coachId) || null;
    const club = clubs.find((c) => c.id === slot.clubId) || null;

    const booking = {
      id: this._generateId('coach_session_booking'),
      coachId: slot.coachId,
      clubId: slot.clubId,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      message,
      status: 'requested',
      createdAt: this._nowIso()
    };

    bookings.push(booking);

    // mark slot as no longer available
    slot.isAvailable = false;
    this._saveToStorage('coach_availability_slots', slots);
    this._saveToStorage('coach_session_bookings', bookings);

    return {
      success: true,
      booking,
      coach,
      club,
      message: 'Session requested.'
    };
  }

  // 21. getPlayersFilterOptions
  getPlayersFilterOptions() {
    const skillLevels = [1, 2, 3, 4, 5].map((level) => ({
      level,
      label: 'Level ' + level
    }));

    const distanceOptionsKm = [5, 10, 20, 50];

    const minMatchesPlayedOptions = [0, 5, 10, 20, 50];

    const sortOptions = [
      { value: 'matches_played_desc', label: 'Most Active (Matches Played)' },
      { value: 'distance_asc', label: 'Distance: Near to Far' }
    ];

    return {
      skillLevels,
      distanceOptionsKm,
      minMatchesPlayedOptions,
      sortOptions
    };
  }

  // 22. searchPlayers
  searchPlayers(maxDistanceKm, skillLevels, minMatchesPlayed, availableForInvites, sortBy) {
    let players = this._getFromStorage('player_directory_entries');

    if (maxDistanceKm != null) {
      players = players.filter((p) => p.distanceFromHomeKm != null && p.distanceFromHomeKm <= maxDistanceKm);
    }

    if (skillLevels && skillLevels.length > 0) {
      const set = new Set(skillLevels.map((l) => Number(l)));
      players = players.filter((p) => set.has(Number(p.skillLevel)));
    }

    if (minMatchesPlayed != null) {
      players = players.filter((p) => p.matchesPlayed != null && p.matchesPlayed >= minMatchesPlayed);
    }

    if (availableForInvites != null) {
      players = players.filter((p) => !!p.availableForInvites === !!availableForInvites);
    }

    if (sortBy === 'matches_played_desc') {
      players.sort((a, b) => (b.matchesPlayed || 0) - (a.matchesPlayed || 0));
    } else if (sortBy === 'distance_asc') {
      players.sort((a, b) => {
        const da = a.distanceFromHomeKm;
        const db = b.distanceFromHomeKm;
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }

    return players;
  }

  // 23. getPlayerDetails
  getPlayerDetails(playerDirectoryEntryId) {
    const players = this._getFromStorage('player_directory_entries');
    const player = players.find((p) => p.id === playerDirectoryEntryId) || null;

    if (!player) {
      return {
        player: null,
        recentStats: { matchesPlayed: 0, lastActiveAt: null },
        isAvailableForInvites: false
      };
    }

    return {
      player,
      recentStats: {
        matchesPlayed: player.matchesPlayed || 0,
        lastActiveAt: player.lastActiveAt || null
      },
      isAvailableForInvites: !!player.availableForInvites
    };
  }

  // 24. sendMatchInvite
  sendMatchInvite(playerDirectoryEntryId, proposedDateTime, message) {
    const players = this._getFromStorage('player_directory_entries');
    let invites = this._getFromStorage('player_match_invites');

    const player = players.find((p) => p.id === playerDirectoryEntryId) || null;
    if (!player) {
      return { success: false, invite: null, player: null, message: 'Player not found.' };
    }

    const invite = {
      id: this._generateId('player_match_invite'),
      playerDirectoryEntryId,
      sentAt: this._nowIso(),
      proposedDateTime: proposedDateTime || null,
      message: message || null,
      status: 'sent'
    };

    invites.push(invite);
    this._saveToStorage('player_match_invites', invites);

    return {
      success: true,
      invite,
      player,
      message: 'Match invite sent.'
    };
  }

  // 25. getTournamentsFilterOptions
  getTournamentsFilterOptions() {
    const formats = ['singles', 'doubles', 'mixed_doubles'];

    const levels = [
      { value: 'amateur', label: 'Amateur' },
      { value: 'competitive', label: 'Competitive' }
    ];

    const dateRanges = [];

    const today = new Date();
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    const pad = (n) => String(n).padStart(2, '0');
    const formatDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

    dateRanges.push({
      code: 'next_month',
      label: 'Next Month',
      startDate: formatDate(nextMonthStart),
      endDate: formatDate(nextMonthEnd)
    });

    const maxEntryFeeSuggestions = [10, 20, 25, 30, 50];

    const sortOptions = [
      { value: 'start_date_asc', label: 'Soonest Start Date' }
    ];

    return {
      formats,
      levels,
      dateRanges,
      maxEntryFeeSuggestions,
      sortOptions
    };
  }

  // 26. searchTournaments
  searchTournaments(startDate, endDate, format, minSkillLevel, maxEntryFeePerPlayer, currency, level, sortBy) {
    const tournaments = this._getFromStorage('tournaments');
    const clubs = this._getFromStorage('clubs');

    let results = [];

    for (const t of tournaments) {
      if (!t.isActive) continue;

      if (!this._withinDateRange(t.startDate, startDate, endDate)) continue;

      if (format && t.format !== format) continue;

      if (minSkillLevel != null && t.minSkillLevel != null && t.minSkillLevel < minSkillLevel) continue;

      if (maxEntryFeePerPlayer != null && t.entryFeePerPlayer != null && t.entryFeePerPlayer > maxEntryFeePerPlayer) continue;

      if (currency && t.currency && t.currency !== currency) continue;

      if (level && t.level !== level) continue;

      const club = clubs.find((c) => c.id === t.clubId) || null;
      results.push({
        tournament: t,
        club
      });
    }

    if (sortBy === 'start_date_asc') {
      results.sort((a, b) => new Date(a.tournament.startDate).getTime() - new Date(b.tournament.startDate).getTime());
    }

    return results;
  }

  // 27. getTournamentDetails
  getTournamentDetails(tournamentId) {
    const tournaments = this._getFromStorage('tournaments');
    const clubs = this._getFromStorage('clubs');
    const regs = this._getFromStorage('tournament_registrations');

    const tournament = tournaments.find((t) => t.id === tournamentId) || null;
    const club = tournament ? clubs.find((c) => c.id === tournament.clubId) || null : null;

    const registration = regs.find((r) => r.tournamentId === tournamentId && r.status === 'registered') || null;

    return {
      tournament,
      club,
      isRegistered: !!registration,
      registration
    };
  }

  // 28. registerTournamentTeam
  registerTournamentTeam(tournamentId, teamName, player1Name, player2Name) {
    const tournaments = this._getFromStorage('tournaments');
    let regs = this._getFromStorage('tournament_registrations');

    const tournament = tournaments.find((t) => t.id === tournamentId) || null;
    if (!tournament) {
      return { success: false, registration: null, tournament: null, message: 'Tournament not found.' };
    }

    const registration = {
      id: this._generateId('tournament_registration'),
      tournamentId,
      teamName,
      player1Name,
      player2Name: player2Name || null,
      status: 'registered',
      createdAt: this._nowIso()
    };

    regs.push(registration);
    this._saveToStorage('tournament_registrations', regs);

    return {
      success: true,
      registration,
      tournament,
      message: 'Tournament registration completed.'
    };
  }

  // 29. getForumCategories
  getForumCategories() {
    const cats = this._getFromStorage('forum_categories');
    return cats;
  }

  // 30. searchForumThreads
  searchForumThreads(categoryCode, query, sortBy) {
    const categories = this._getFromStorage('forum_categories');
    const threads = this._getFromStorage('forum_threads');

    let selectedCategoryIds;
    if (categoryCode === 'all') {
      selectedCategoryIds = categories.map((c) => c.id);
    } else {
      const cat = categories.find((c) => c.code === categoryCode);
      if (!cat) selectedCategoryIds = [];
      else selectedCategoryIds = [cat.id];
    }

    let filtered = threads.filter((t) => selectedCategoryIds.includes(t.categoryId));

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter((t) => {
        const title = (t.title || '').toLowerCase();
        const subtitle = (t.subtitle || '').toLowerCase();
        const content = (t.content || '').toLowerCase();
        const tagMatch = Array.isArray(t.tags) && t.tags.some((tag) => String(tag).toLowerCase().includes(q));
        return title.includes(q) || subtitle.includes(q) || content.includes(q) || tagMatch;
      });
    }

    if (sortBy === 'most_replies') {
      filtered.sort((a, b) => (b.repliesCount || 0) - (a.repliesCount || 0));
    } else if (sortBy === 'most_active') {
      filtered.sort((a, b) => new Date(b.lastActivityAt || b.createdAt || 0).getTime() - new Date(a.lastActivityAt || a.createdAt || 0).getTime());
    } else if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return filtered.map((thread) => {
      const category = categories.find((c) => c.id === thread.categoryId) || null;
      return {
        ...thread,
        category
      };
    });
  }

  // 31. getThreadDetails
  getThreadDetails(threadId) {
    const threads = this._getFromStorage('forum_threads');
    const posts = this._getFromStorage('forum_posts');
    const bookmarks = this._getFromStorage('thread_bookmarks');

    const thread = threads.find((t) => t.id === threadId) || null;
    const threadPosts = posts
      .filter((p) => p.threadId === threadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const isBookmarked = bookmarks.some((b) => b.threadId === threadId);

    return {
      thread,
      posts: threadPosts,
      isBookmarked
    };
  }

  // 32. postThreadReply
  postThreadReply(threadId, content) {
    const threads = this._getFromStorage('forum_threads');
    let posts = this._getFromStorage('forum_posts');

    const thread = threads.find((t) => t.id === threadId) || null;
    if (!thread) {
      return { success: false, post: null, thread: null, message: 'Thread not found.' };
    }

    const nowIso = this._nowIso();
    const post = {
      id: this._generateId('forum_post'),
      threadId,
      content,
      createdAt: nowIso,
      postType: 'reply'
    };

    posts.push(post);
    this._saveToStorage('forum_posts', posts);

    thread.repliesCount = (thread.repliesCount || 0) + 1;
    thread.lastActivityAt = nowIso;
    this._saveToStorage('forum_threads', threads);

    return {
      success: true,
      post,
      thread,
      message: 'Reply posted.'
    };
  }

  // 33. bookmarkThread
  bookmarkThread(threadId) {
    const threads = this._getFromStorage('forum_threads');
    let bookmarks = this._getFromStorage('thread_bookmarks');

    const thread = threads.find((t) => t.id === threadId) || null;
    if (!thread) {
      return { success: false, bookmark: null, thread: null, message: 'Thread not found.' };
    }

    let bookmark = bookmarks.find((b) => b.threadId === threadId) || null;
    if (bookmark) {
      return { success: true, bookmark, thread, message: 'Thread already bookmarked.' };
    }

    bookmark = {
      id: this._generateId('thread_bookmark'),
      threadId,
      createdAt: this._nowIso()
    };

    bookmarks.push(bookmark);
    this._saveToStorage('thread_bookmarks', bookmarks);

    return {
      success: true,
      bookmark,
      thread,
      message: 'Thread bookmarked.'
    };
  }

  // 34. getMarketplaceFilterOptions
  getMarketplaceFilterOptions() {
    const conditions = [
      { value: 'new', label: 'New' },
      { value: 'like_new', label: 'Like New' },
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' },
      { value: 'poor', label: 'Poor' }
    ];

    const priceSuggestions = [
      { currency: 'usd', maxPrice: 50, label: 'Up to $50' },
      { currency: 'usd', maxPrice: 80, label: 'Up to $80' },
      { currency: 'eur', maxPrice: 50, label: 'Up to €50' }
    ];

    const sellerRatingThresholds = [3.5, 4.0, 4.5];

    const deliveryOptions = [
      { code: 'free_local_pickup', label: 'Free local pickup' }
    ];

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'seller_rating_desc', label: 'Seller Rating: High to Low' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      conditions,
      priceSuggestions,
      sellerRatingThresholds,
      deliveryOptions,
      sortOptions
    };
  }

  // 35. searchMarketplaceItems
  searchMarketplaceItems(query, isUsed, minCondition, maxPrice, currency, minSellerRating, requireFreeLocalPickup, maxPickupDistanceKm, sortBy) {
    const items = this._getFromStorage('marketplace_items');
    const sellers = this._getFromStorage('marketplace_sellers');

    const conditionRank = {
      new: 1,
      like_new: 2,
      good: 3,
      fair: 4,
      poor: 5
    };

    let results = [];

    for (const item of items) {
      if (item.status !== 'active') continue;

      if (query) {
        const q = query.toLowerCase();
        const title = (item.title || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q)) continue;
      }

      if (isUsed != null && !!item.isUsed !== !!isUsed) continue;

      if (minCondition) {
        const itemRank = conditionRank[item.condition];
        const minRank = conditionRank[minCondition];
        if (itemRank == null || minRank == null) continue;
        if (itemRank > minRank) continue; // worse condition than allowed
      }

      if (maxPrice != null && item.price != null && item.price > maxPrice) continue;

      if (currency && item.currency && item.currency !== currency) continue;

      const seller = sellers.find((s) => s.id === item.sellerId) || null;
      if (minSellerRating != null) {
        if (!seller || seller.rating == null || seller.rating < minSellerRating) continue;
      }

      if (requireFreeLocalPickup) {
        if (!item.hasFreeLocalPickup) continue;
        if (maxPickupDistanceKm != null) {
          const dist = item.distanceFromHomeKm != null ? item.distanceFromHomeKm : seller && seller.distanceFromHomeKm;
          if (dist == null || dist > maxPickupDistanceKm) continue;
        }
      }

      results.push({ item, seller });
    }

    if (sortBy === 'price_asc') {
      results.sort((a, b) => (a.item.price || 0) - (b.item.price || 0));
    } else if (sortBy === 'seller_rating_desc') {
      results.sort((a, b) => {
        const ra = a.seller ? a.seller.rating || 0 : 0;
        const rb = b.seller ? b.seller.rating || 0 : 0;
        return rb - ra;
      });
    } else if (sortBy === 'newest') {
      results.sort((a, b) => new Date(b.item.createdAt || 0).getTime() - new Date(a.item.createdAt || 0).getTime());
    }

    return results;
  }

  // 36. getMarketplaceItemDetails
  getMarketplaceItemDetails(marketplaceItemId) {
    const items = this._getFromStorage('marketplace_items');
    const sellers = this._getFromStorage('marketplace_sellers');

    const item = items.find((i) => i.id === marketplaceItemId) || null;
    const seller = item ? sellers.find((s) => s.id === item.sellerId) || null : null;

    return {
      item,
      seller
    };
  }

  // 37. sendMarketplaceMessage
  sendMarketplaceMessage(marketplaceItemId, content) {
    const items = this._getFromStorage('marketplace_items');
    const sellers = this._getFromStorage('marketplace_sellers');
    let messages = this._getFromStorage('marketplace_messages');

    const item = items.find((i) => i.id === marketplaceItemId) || null;
    if (!item) {
      return { success: false, messageRecord: null, item: null, seller: null, message: 'Item not found.' };
    }

    const seller = sellers.find((s) => s.id === item.sellerId) || null;

    const msgRecord = {
      id: this._generateId('marketplace_message'),
      marketplaceItemId,
      sellerId: item.sellerId,
      content,
      sentAt: this._nowIso()
    };

    messages.push(msgRecord);
    this._saveToStorage('marketplace_messages', messages);

    return {
      success: true,
      messageRecord: msgRecord,
      item,
      seller,
      message: 'Message sent to seller.'
    };
  }

  // 38. reserveMarketplaceItem
  reserveMarketplaceItem(marketplaceItemId) {
    const items = this._getFromStorage('marketplace_items');
    let reservations = this._getFromStorage('marketplace_reservations');

    const item = items.find((i) => i.id === marketplaceItemId) || null;
    if (!item) {
      return { success: false, reservation: null, item: null, message: 'Item not found.' };
    }

    if (item.status !== 'active') {
      return { success: false, reservation: null, item, message: 'Item is not available for reservation.' };
    }

    const reservation = {
      id: this._generateId('marketplace_reservation'),
      marketplaceItemId,
      reservedAt: this._nowIso(),
      status: 'reserved'
    };

    reservations.push(reservation);

    item.status = 'reserved';
    this._saveToStorage('marketplace_items', items);
    this._saveToStorage('marketplace_reservations', reservations);

    return {
      success: true,
      reservation,
      item,
      message: 'Item reserved.'
    };
  }

  // 39. getNotificationSettings
  getNotificationSettings() {
    const { preferences, quietHours } = this._getOrCreateNotificationPreferences();
    return {
      preferences,
      quietHours
    };
  }

  // 40. updateNotificationPreferences
  updateNotificationPreferences(preferences) {
    const existing = this._getOrCreateNotificationPreferences().preferences;

    for (const update of preferences || []) {
      const cat = update.category;
      if (!cat) continue;
      let pref = existing.find((p) => p.category === cat);
      if (!pref) {
        pref = {
          id: this._generateId('notif_pref'),
          category: cat,
          emailEnabled: false,
          smsEnabled: false,
          inSiteEnabled: false
        };
        existing.push(pref);
      }
      if (typeof update.emailEnabled === 'boolean') pref.emailEnabled = update.emailEnabled;
      if (typeof update.smsEnabled === 'boolean') pref.smsEnabled = update.smsEnabled;
      if (typeof update.inSiteEnabled === 'boolean') pref.inSiteEnabled = update.inSiteEnabled;
    }

    this._saveToStorage('notification_preferences', existing);

    return {
      success: true,
      preferences: existing,
      message: 'Notification preferences updated.'
    };
  }

  // 41. updateQuietHoursSettings
  updateQuietHoursSettings(enabled, startTime, endTime, timezone) {
    let quietHoursArr = this._getFromStorage('quiet_hours_settings');
    const nowIso = this._nowIso();

    if (!quietHoursArr || quietHoursArr.length === 0) {
      const qh = {
        id: this._generateId('quiet_hours'),
        enabled: !!enabled,
        startTime,
        endTime,
        timezone,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      quietHoursArr = [qh];
    } else {
      const qh = quietHoursArr[0];
      qh.enabled = !!enabled;
      qh.startTime = startTime;
      qh.endTime = endTime;
      qh.timezone = timezone;
      qh.updatedAt = nowIso;
    }

    this._saveToStorage('quiet_hours_settings', quietHoursArr);

    return {
      success: true,
      quietHours: quietHoursArr[0],
      message: 'Quiet hours updated.'
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