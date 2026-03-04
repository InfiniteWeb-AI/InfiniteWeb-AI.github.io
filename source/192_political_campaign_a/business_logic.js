/* localStorage polyfill for Node.js and environments without localStorage */
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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const keys = [
      'candidates',
      'candidate_issue_positions',
      'candidate_email_subscriptions',
      'election_races',
      'race_candidates',
      'favorite_candidates',
      'events',
      'event_registrations',
      'volunteer_opportunities',
      'volunteer_pledges',
      'petitions',
      'petition_signatures',
      'representatives',
      'issue_categories',
      'advocacy_campaigns',
      'representative_messages',
      'action_templates',
      'action_plans',
      'action_plan_items',
      'news_articles',
      'saved_articles',
      'local_teams',
      'team_memberships'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
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

  _ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDayLabel(dateString) {
    const d = this._parseDate(dateString);
    if (!d) return '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  }

  _buildPriceLabel(price_type, price_amount) {
    if (price_type === 'free') return 'Free';
    if (price_type === 'donation_suggested') {
      return price_amount ? 'Suggested donation $' + price_amount : 'Donation suggested';
    }
    if (price_type === 'paid') {
      return price_amount ? '$' + price_amount : 'Paid';
    }
    return '';
  }

  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) {
      return null;
    }
    const toRad = function (v) { return (v * Math.PI) / 180; };
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Internal helper to resolve a location string/ZIP to coordinates.
  // To avoid mocking persistent data, this is intentionally minimal.
  _resolveLocationToCoordinates(location) {
    if (!location) return null;
    // You may extend this mapping in your application initialization
    // based on real data; here we avoid hardcoding many values.
    const normalized = String(location).trim().toLowerCase();
    const simpleMap = {
      '19103': { latitude: 39.9523, longitude: -75.1652 }, // Philadelphia approx
      '30301': { latitude: 33.749, longitude: -84.388 },   // Atlanta approx
      'travis county, tx': { latitude: 30.2672, longitude: -97.7431 } // Austin approx
    };
    if (Object.prototype.hasOwnProperty.call(simpleMap, normalized)) {
      return simpleMap[normalized];
    }
    return null;
  }

  _getOrCreateFavoritesStore() {
    const list = this._getFromStorage('favorite_candidates');
    if (!Array.isArray(list)) {
      this._saveToStorage('favorite_candidates', []);
      return [];
    }
    return list;
  }

  _getOrCreateReadingListStore() {
    const list = this._getFromStorage('saved_articles');
    if (!Array.isArray(list)) {
      this._saveToStorage('saved_articles', []);
      return [];
    }
    return list;
  }

  _findCurrentActionPlan() {
    const plans = this._getFromStorage('action_plans');
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].status === 'active') {
        return plans[i];
      }
    }
    return null;
  }

  _getOrCreateActionPlan() {
    let plan = this._findCurrentActionPlan();
    if (!plan) {
      const now = new Date().toISOString();
      plan = {
        id: this._generateId('actionplan'),
        name: null,
        createdAt: now,
        updatedAt: now,
        status: 'active'
      };
      const plans = this._getFromStorage('action_plans');
      plans.push(plan);
      this._saveToStorage('action_plans', plans);
    }
    return plan;
  }

  _getActionPlanItems(planId) {
    const items = this._getFromStorage('action_plan_items');
    return items.filter(function (item) { return item.actionPlanId === planId; });
  }

  _hydrateActionPlan(plan) {
    if (!plan) return null;
    const templates = this._getFromStorage('action_templates');
    const items = this._getActionPlanItems(plan.id);
    const hydratedItems = items.map(function (item) {
      const template = templates.find(function (t) { return t.id === item.actionTemplateId; }) || null;
      return {
        action_plan_item_id: item.id,
        action_template_id: item.actionTemplateId,
        category: item.category,
        title: template ? template.title : null,
        action_type: template ? template.action_type : null,
        pledge_amount: typeof item.pledge_amount === 'number' ? item.pledge_amount : null,
        notes: item.notes || null,
        order_index: typeof item.order_index === 'number' ? item.order_index : null,
        addedAt: item.addedAt,
        action_template: template
      };
    });
    return {
      action_plan_id: plan.id,
      status: plan.status,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      items: hydratedItems
    };
  }

  _resolveRelatedEntity(related_entity_type, related_entity_id) {
    if (!related_entity_type || !related_entity_id) return null;
    const type = String(related_entity_type).toLowerCase();
    if (type === 'petition') {
      const petitions = this._getFromStorage('petitions');
      return petitions.find(function (p) { return p.id === related_entity_id; }) || null;
    }
    if (type === 'event') {
      const events = this._getFromStorage('events');
      return events.find(function (e) { return e.id === related_entity_id; }) || null;
    }
    if (type === 'representative') {
      const reps = this._getFromStorage('representatives');
      return reps.find(function (r) { return r.id === related_entity_id; }) || null;
    }
    if (type === 'local_team') {
      const teams = this._getFromStorage('local_teams');
      return teams.find(function (t) { return t.id === related_entity_id; }) || null;
    }
    return null;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomepageOverview()
  getHomepageOverview() {
    const candidates = this._getFromStorage('candidates');
    const issuePositions = this._getFromStorage('candidate_issue_positions');
    const issueCategories = this._getFromStorage('issue_categories');
    const events = this._getFromStorage('events');
    const actionTemplates = this._getFromStorage('action_templates');

    const featured_candidates = candidates.slice(0, 3).map(function (c) {
      const issues = issuePositions
        .filter(function (ip) { return ip.candidateId === c.id; })
        .map(function (ip) { return ip.issue_display_name || ip.issue_key; });
      const top_issue_names = issues.slice(0, 3);
      return {
        candidate_id: c.id,
        name: c.name,
        office_type: c.office_type,
        state: c.state,
        party: c.party || null,
        photo_url: c.photo_url || null,
        is_incumbent: !!c.is_incumbent,
        top_issue_names: top_issue_names
      };
    });

    const priority_issue_categories = issueCategories.map(function (ic) {
      return {
        issue_category_id: ic.id,
        name: ic.name,
        slug: ic.slug,
        description: ic.description || ''
      };
    });

    const now = new Date();
    const upcoming_events = events
      .filter(function (e) {
        const d = new Date(e.start_datetime);
        return !isNaN(d.getTime()) && d >= now;
      })
      .sort(function (a, b) {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      })
      .slice(0, 5)
      .map(function (e) {
        let location_summary = '';
        if (e.is_online) {
          location_summary = 'Online';
        } else if (e.location_name) {
          location_summary = e.location_name;
        } else if (e.city || e.state) {
          location_summary = (e.city || '') + (e.city && e.state ? ', ' : '') + (e.state || '');
        }
        const price_label = (e.price_label && e.price_label.length)
          ? e.price_label
          : (function (pt, pa, self) { return self._buildPriceLabel(pt, pa); }).call(this, e.price_type, e.price_amount, this);
        return {
          event_id: e.id,
          title: e.title,
          event_type: e.event_type,
          start_datetime: e.start_datetime,
          timezone: e.timezone || 'UTC',
          location_summary: location_summary,
          is_online: !!e.is_online,
          price_label: price_label
        };
      }, this);

    const quick_actions = actionTemplates
      .filter(function (t) { return !!t.is_recommended; })
      .slice(0, 10)
      .map(function (t) {
        const related_entity = (t.related_entity_type && t.related_entity_id)
          ? this._resolveRelatedEntity(t.related_entity_type, t.related_entity_id)
          : null;
        return {
          action_template_id: t.id,
          title: t.title,
          category: t.category,
          action_type: t.action_type,
          description: t.description || '',
          related_entity_type: t.related_entity_type || null,
          related_entity_id: t.related_entity_id || null,
          related_entity: related_entity
        };
      }, this);

    return {
      featured_candidates: featured_candidates,
      priority_issue_categories: priority_issue_categories,
      upcoming_events: upcoming_events,
      quick_actions: quick_actions
    };
  }

  // getCandidateFilterOptions()
  getCandidateFilterOptions() {
    const candidates = this._getFromStorage('candidates');

    // Office types from existing candidates
    const officeSet = {};
    for (let i = 0; i < candidates.length; i++) {
      const ot = candidates[i].office_type;
      if (ot && !officeSet[ot]) {
        officeSet[ot] = true;
      }
    }
    const officeLabelMap = {
      us_senate: 'U.S. Senate',
      us_house: 'U.S. House',
      governor: 'Governor',
      state_senate: 'State Senate',
      state_house: 'State House',
      city_council: 'City Council',
      mayor: 'Mayor',
      president: 'President',
      attorney_general: 'Attorney General',
      other_federal: 'Other Federal',
      other_state: 'Other State',
      other_local: 'Other Local'
    };
    const office_types = Object.keys(officeSet).map(function (ot) {
      return { value: ot, label: officeLabelMap[ot] || ot };
    });

    const stateSet = {};
    const partySet = {};
    const districtMap = {};

    for (let j = 0; j < candidates.length; j++) {
      const c = candidates[j];
      if (c.state) stateSet[c.state] = true;
      if (c.party) partySet[c.party] = true;
      if (c.district) {
        const key = c.state + '|' + c.district;
        if (!districtMap[key]) {
          districtMap[key] = { value: c.district, label: c.district, state_code: c.state || null };
        }
      }
    }

    const states = Object.keys(stateSet).map(function (code) {
      return { code: code, name: code };
    });

    const parties = Object.keys(partySet).map(function (p) {
      return { value: p, label: p };
    });

    const districts = Object.keys(districtMap).map(function (k) { return districtMap[k]; });

    return {
      office_types: office_types,
      states: states,
      parties: parties,
      districts: districts
    };
  }

  // listCandidates(filters)
  listCandidates(filters) {
    const candidates = this._getFromStorage('candidates');
    const issuePositions = this._getFromStorage('candidate_issue_positions');
    filters = filters || {};

    const result = candidates.filter(function (c) {
      if (filters.office_type && c.office_type !== filters.office_type) return false;
      if (filters.state && c.state !== filters.state) return false;
      if (filters.district && c.district !== filters.district) return false;
      if (filters.party && c.party !== filters.party) return false;
      if (filters.search_query) {
        const q = String(filters.search_query).toLowerCase();
        const inName = c.name && c.name.toLowerCase().indexOf(q) !== -1;
        const inBio = c.biography && c.biography.toLowerCase().indexOf(q) !== -1;
        if (!inName && !inBio) return false;
      }
      return true;
    });

    return result.map(function (c) {
      const issues = issuePositions
        .filter(function (ip) { return ip.candidateId === c.id; })
        .map(function (ip) { return ip.issue_display_name || ip.issue_key; });
      return {
        candidate_id: c.id,
        name: c.name,
        office_type: c.office_type,
        state: c.state,
        district: c.district || null,
        party: c.party || null,
        photo_url: c.photo_url || null,
        is_incumbent: !!c.is_incumbent,
        top_issue_names: issues.slice(0, 3)
      };
    });
  }

  // getCandidateProfile(candidateId)
  getCandidateProfile(candidateId) {
    const candidates = this._getFromStorage('candidates');
    const issuePositions = this._getFromStorage('candidate_issue_positions');
    const favorites = this._getFromStorage('favorite_candidates');

    const candidate = candidates.find(function (c) { return c.id === candidateId; }) || null;

    const positions = issuePositions.filter(function (ip) { return ip.candidateId === candidateId; });
    const issue_positions = positions.map(function (ip) {
      return {
        issue_position_id: ip.id,
        issue_key: ip.issue_key,
        issue_display_name: ip.issue_display_name || ip.issue_key,
        summary: ip.summary || '',
        bullet_points: ip.bullet_points || [],
        last_updated: ip.last_updated || null
      };
    });

    const available_subscription_issues = [];
    const seen = {};
    for (let i = 0; i < positions.length; i++) {
      const ip = positions[i];
      const key = ip.issue_key;
      if (key && !seen[key]) {
        seen[key] = true;
        available_subscription_issues.push({
          issue_key: ip.issue_key,
          issue_display_name: ip.issue_display_name || ip.issue_key
        });
      }
    }
    // If the candidate doesn't have specific issue positions, fall back to
    // overall issue categories so the UI can still offer meaningful
    // subscription options (e.g., Climate & Environment, Immigration Reform).
    if (available_subscription_issues.length === 0) {
      const issueCategories = this._getFromStorage('issue_categories');
      for (let j = 0; j < issueCategories.length; j++) {
        const ic = issueCategories[j];
        if (!ic || !ic.name) continue;
        const key = ic.name;
        if (seen[key]) continue;
        seen[key] = true;
        available_subscription_issues.push({
          issue_key: ic.name,
          issue_display_name: ic.name
        });
      }
    }

    const is_favorited = favorites.some(function (f) { return f.candidateId === candidateId; });

    return {
      candidate: candidate ? {
        id: candidate.id,
        name: candidate.name,
        office_type: candidate.office_type,
        state: candidate.state,
        district: candidate.district || null,
        party: candidate.party || null,
        photo_url: candidate.photo_url || null,
        biography: candidate.biography || '',
        campaign_website: candidate.campaign_website || null,
        is_incumbent: !!candidate.is_incumbent
      } : null,
      issue_positions: issue_positions,
      available_subscription_issues: available_subscription_issues,
      is_favorited: is_favorited
    };
  }

  // subscribeToCandidateEmailUpdates(candidateId, email, selected_issue_keys)
  subscribeToCandidateEmailUpdates(candidateId, email, selected_issue_keys) {
    const subs = this._getFromStorage('candidate_email_subscriptions');
    const now = new Date().toISOString();
    const id = this._generateId('candsub');

    const selected = this._ensureArray(selected_issue_keys);

    subs.push({
      id: id,
      candidateId: candidateId,
      selected_issue_keys: selected,
      email: email,
      createdAt: now,
      source: 'website'
    });

    this._saveToStorage('candidate_email_subscriptions', subs);

    return {
      success: true,
      message: 'Subscription created',
      subscription: {
        subscription_id: id,
        candidate_id: candidateId,
        email: email,
        selected_issue_keys: selected,
        createdAt: now
      }
    };
  }

  // addCandidateToFavorites(candidateId)
  addCandidateToFavorites(candidateId) {
    const favorites = this._getOrCreateFavoritesStore();
    const existing = favorites.find(function (f) { return f.candidateId === candidateId; });
    if (existing) {
      return {
        success: true,
        favorite_id: existing.id,
        addedAt: existing.addedAt,
        message: 'Candidate already in favorites'
      };
    }
    const now = new Date().toISOString();
    const id = this._generateId('favcand');
    favorites.push({ id: id, candidateId: candidateId, addedAt: now });
    this._saveToStorage('favorite_candidates', favorites);
    return {
      success: true,
      favorite_id: id,
      addedAt: now,
      message: 'Candidate added to favorites'
    };
  }

  // removeCandidateFromFavorites(favoriteId)
  removeCandidateFromFavorites(favoriteId) {
    const favorites = this._getOrCreateFavoritesStore();
    const index = favorites.findIndex(function (f) { return f.id === favoriteId; });
    if (index === -1) {
      return { success: false, message: 'Favorite not found' };
    }
    favorites.splice(index, 1);
    this._saveToStorage('favorite_candidates', favorites);
    return { success: true, message: 'Favorite removed' };
  }

  // getFavoriteCandidates()
  getFavoriteCandidates() {
    const favorites = this._getOrCreateFavoritesStore();
    const candidates = this._getFromStorage('candidates');

    return favorites.map(function (f) {
      const candidate = candidates.find(function (c) { return c.id === f.candidateId; }) || null;
      return {
        favorite_id: f.id,
        addedAt: f.addedAt,
        candidate: candidate ? {
          id: candidate.id,
          name: candidate.name,
          office_type: candidate.office_type,
          state: candidate.state,
          district: candidate.district || null,
          party: candidate.party || null,
          photo_url: candidate.photo_url || null,
          is_incumbent: !!candidate.is_incumbent
        } : null
      };
    });
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const event_types_enum = [
      'town_hall',
      'rally',
      'fundraiser',
      'canvass',
      'phone_bank',
      'training',
      'meeting',
      'house_party',
      'online_town_hall',
      'other'
    ];
    const event_types = event_types_enum.map(function (v) {
      const label = v.split('_').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ');
      return { value: v, label: label };
    });

    const price_types_enum = ['free', 'paid', 'donation_suggested'];
    const price_types = price_types_enum.map(function (v) {
      const label = v === 'donation_suggested' ? 'Donation Suggested' : v.charAt(0).toUpperCase() + v.slice(1);
      return { value: v, label: label };
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const date_ranges = [
      {
        value: 'today',
        label: 'Today',
        start_date: todayStart.toISOString(),
        end_date: todayEnd.toISOString()
      },
      {
        value: 'this_week',
        label: 'This Week',
        start_date: todayStart.toISOString(),
        end_date: weekEnd.toISOString()
      },
      {
        value: 'this_month',
        label: 'This Month',
        start_date: todayStart.toISOString(),
        end_date: monthEnd.toISOString()
      }
    ];

    return {
      event_types: event_types,
      price_types: price_types,
      date_ranges: date_ranges,
      default_radius_miles: 25
    };
  }

  // searchEvents(location, radius_miles, start_date, end_date, price_type, event_type, is_online)
  searchEvents(location, radius_miles, start_date, end_date, price_type, event_type, is_online) {
    const events = this._getFromStorage('events');
    const startDateObj = this._parseDate(start_date);
    const endDateObj = this._parseDate(end_date);
    const baseCoords = location ? this._resolveLocationToCoordinates(location) : null;
    const useRadius = !!(baseCoords && typeof radius_miles === 'number' && radius_miles > 0);

    const filtered = events.filter(function (e) {
      if (price_type && e.price_type !== price_type) return false;
      if (event_type && e.event_type !== event_type) return false;
      if (typeof is_online === 'boolean' && e.is_online !== is_online) return false;

      if (startDateObj) {
        const d = new Date(e.start_datetime);
        if (isNaN(d.getTime()) || d < startDateObj) return false;
      }
      if (endDateObj) {
        const d2 = new Date(e.start_datetime);
        if (isNaN(d2.getTime()) || d2 > endDateObj) return false;
      }

      if (useRadius) {
        if (typeof e.latitude !== 'number' || typeof e.longitude !== 'number') return false;
        const dist = this._calculateDistanceMiles(baseCoords.latitude, baseCoords.longitude, e.latitude, e.longitude);
        if (dist === null || dist > radius_miles) return false;
      }

      return true;
    }, this);

    return filtered.map(function (e) {
      const day_label = this._formatDayLabel(e.start_datetime);
      let location_summary = '';
      if (e.is_online) {
        location_summary = 'Online';
      } else if (e.location_name) {
        location_summary = e.location_name;
      } else if (e.city || e.state) {
        location_summary = (e.city || '') + (e.city && e.state ? ', ' : '') + (e.state || '');
      }

      let distance_miles = null;
      if (useRadius && typeof e.latitude === 'number' && typeof e.longitude === 'number') {
        distance_miles = this._calculateDistanceMiles(baseCoords.latitude, baseCoords.longitude, e.latitude, e.longitude);
      }

      const price_label = (e.price_label && e.price_label.length)
        ? e.price_label
        : this._buildPriceLabel(e.price_type, e.price_amount);

      return {
        event_id: e.id,
        title: e.title,
        event_type: e.event_type,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime || null,
        timezone: e.timezone || 'UTC',
        day_label: day_label,
        location_summary: location_summary,
        city: e.city || null,
        state: e.state || null,
        postal_code: e.postal_code || null,
        is_online: !!e.is_online,
        price_type: e.price_type,
        price_amount: typeof e.price_amount === 'number' ? e.price_amount : null,
        price_label: price_label,
        distance_miles: distance_miles
      };
    }, this);
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const e = events.find(function (ev) { return ev.id === eventId; }) || null;
    if (!e) {
      return {
        event_id: null,
        title: null,
        description: null,
        event_type: null,
        start_datetime: null,
        end_datetime: null,
        timezone: null,
        day_label: null,
        location_name: null,
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        postal_code: null,
        is_online: null,
        price_type: null,
        price_amount: null,
        price_label: null,
        max_attendees: null,
        accessibility_notes: null
      };
    }
    const day_label = this._formatDayLabel(e.start_datetime);
    const price_label = (e.price_label && e.price_label.length)
      ? e.price_label
      : this._buildPriceLabel(e.price_type, e.price_amount);

    return {
      event_id: e.id,
      title: e.title,
      description: e.description || '',
      event_type: e.event_type,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime || null,
      timezone: e.timezone || 'UTC',
      day_label: day_label,
      location_name: e.location_name || null,
      address_line1: e.address_line1 || null,
      address_line2: e.address_line2 || null,
      city: e.city || null,
      state: e.state || null,
      postal_code: e.postal_code || null,
      is_online: !!e.is_online,
      price_type: e.price_type,
      price_amount: typeof e.price_amount === 'number' ? e.price_amount : null,
      price_label: price_label,
      max_attendees: typeof e.max_attendees === 'number' ? e.max_attendees : null,
      accessibility_notes: e.accessibility_notes || null
    };
  }

  // rsvpToEvent(eventId, first_name, last_name, email, num_attendees, notes)
  rsvpToEvent(eventId, first_name, last_name, email, num_attendees, notes) {
    const regs = this._getFromStorage('event_registrations');
    const now = new Date().toISOString();
    const id = this._generateId('eventreg');

    regs.push({
      id: id,
      eventId: eventId,
      first_name: first_name,
      last_name: last_name,
      email: email || null,
      num_attendees: typeof num_attendees === 'number' ? num_attendees : 1,
      createdAt: now,
      notes: notes || null
    });

    this._saveToStorage('event_registrations', regs);

    return {
      success: true,
      registration: {
        registration_id: id,
        event_id: eventId,
        first_name: first_name,
        last_name: last_name,
        email: email || null,
        num_attendees: typeof num_attendees === 'number' ? num_attendees : 1,
        createdAt: now,
        event: (function () {
          const events = this._getFromStorage('events');
          return events.find(function (e) { return e.id === eventId; }) || null;
        }).call(this)
      },
      message: 'RSVP submitted'
    };
  }

  // getVolunteerFilterOptions()
  getVolunteerFilterOptions() {
    const activity_types_enum = [
      'phone_banking',
      'door_knocking',
      'text_banking',
      'data_entry',
      'online_outreach',
      'fundraising',
      'event_staff',
      'other'
    ];
    const activity_types = activity_types_enum.map(function (v) {
      const label = v.split('_').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ');
      return { value: v, label: label };
    });

    const weekday_values = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weekday_options = weekday_values.map(function (v) {
      return { value: v, label: v.charAt(0).toUpperCase() + v.slice(1) };
    });

    const time_of_day_values = ['morning', 'afternoon', 'evening'];
    const time_of_day_options = time_of_day_values.map(function (v) {
      return { value: v, label: v.charAt(0).toUpperCase() + v.slice(1) };
    });

    const location_types_enum = ['remote', 'in_person', 'hybrid'];
    const location_types = location_types_enum.map(function (v) {
      const label = v === 'in_person' ? 'In Person' : v.charAt(0).toUpperCase() + v.slice(1);
      return { value: v, label: label };
    });

    return {
      activity_types: activity_types,
      weekday_options: weekday_options,
      time_of_day_options: time_of_day_options,
      location_types: location_types
    };
  }

  // listVolunteerOpportunities(filters)
  listVolunteerOpportunities(filters) {
    filters = filters || {};
    const opportunities = this._getFromStorage('volunteer_opportunities');
    const teams = this._getFromStorage('local_teams');

    const result = opportunities.filter(function (o) {
      if (filters.activity_types && filters.activity_types.length) {
        if (filters.activity_types.indexOf(o.activity_type) === -1) return false;
      }
      if (filters.location_type && o.location_type !== filters.location_type) return false;

      if (filters.weekdays && filters.weekdays.length && Array.isArray(o.weekday_options)) {
        const hasOverlap = o.weekday_options.some(function (w) {
          return filters.weekdays.indexOf(w) !== -1;
        });
        if (!hasOverlap) return false;
      }

      if (filters.time_of_day && filters.time_of_day.length && Array.isArray(o.time_of_day_options)) {
        const hasOverlapTime = o.time_of_day_options.some(function (t) {
          return filters.time_of_day.indexOf(t) !== -1;
        });
        if (!hasOverlapTime) return false;
      }

      return true;
    });

    return result.map(function (o) {
      const team = teams.find(function (t) { return t.id === o.localTeamId; }) || null;
      return {
        volunteer_opportunity_id: o.id,
        title: o.title,
        description: o.description || '',
        activity_type: o.activity_type,
        location_type: o.location_type,
        weekday_options: o.weekday_options || [],
        time_of_day_options: o.time_of_day_options || [],
        is_recurring: !!o.is_recurring,
        schedule_summary: o.schedule_summary || null,
        local_team_name: team ? team.name : null,
        local_team: team
      };
    });
  }

  // getVolunteerOpportunityDetail(volunteerOpportunityId)
  getVolunteerOpportunityDetail(volunteerOpportunityId) {
    const opportunities = this._getFromStorage('volunteer_opportunities');
    const teams = this._getFromStorage('local_teams');
    const o = opportunities.find(function (op) { return op.id === volunteerOpportunityId; }) || null;
    if (!o) {
      return {
        volunteer_opportunity_id: null,
        title: null,
        description: null,
        activity_type: null,
        location_type: null,
        weekday_options: [],
        time_of_day_options: [],
        is_recurring: null,
        schedule_summary: null,
        local_team: null
      };
    }
    const team = teams.find(function (t) { return t.id === o.localTeamId; }) || null;
    return {
      volunteer_opportunity_id: o.id,
      title: o.title,
      description: o.description || '',
      activity_type: o.activity_type,
      location_type: o.location_type,
      weekday_options: o.weekday_options || [],
      time_of_day_options: o.time_of_day_options || [],
      is_recurring: !!o.is_recurring,
      schedule_summary: o.schedule_summary || null,
      local_team: team ? {
        team_id: team.id,
        name: team.name,
        location_name: team.location_name || null
      } : null
    };
  }

  // submitVolunteerPledge(volunteerOpportunityId, recurrence, preferred_day, zip_code)
  submitVolunteerPledge(volunteerOpportunityId, recurrence, preferred_day, zip_code) {
    const pledges = this._getFromStorage('volunteer_pledges');
    const now = new Date().toISOString();
    const id = this._generateId('volpledge');

    const pledge = {
      id: id,
      volunteerOpportunityId: volunteerOpportunityId,
      recurrence: recurrence,
      preferred_day: preferred_day,
      zip_code: zip_code,
      createdAt: now,
      status: 'active'
    };

    pledges.push(pledge);
    this._saveToStorage('volunteer_pledges', pledges);

    const opportunities = this._getFromStorage('volunteer_opportunities');
    const opportunity = opportunities.find(function (o) { return o.id === volunteerOpportunityId; }) || null;

    return {
      success: true,
      pledge: {
        pledge_id: id,
        volunteer_opportunity_id: volunteerOpportunityId,
        recurrence: recurrence,
        preferred_day: preferred_day,
        zip_code: zip_code,
        status: 'active',
        createdAt: now,
        volunteer_opportunity: opportunity
      },
      message: 'Volunteer pledge submitted'
    };
  }

  // getPetitionFilterOptions()
  getPetitionFilterOptions() {
    const petitions = this._getFromStorage('petitions');
    const issueTopicSet = {};
    const regionSet = {};

    for (let i = 0; i < petitions.length; i++) {
      const p = petitions[i];
      if (p.issue_topic) issueTopicSet[p.issue_topic] = true;
      const rkey = p.region_type + '|' + (p.region_value || '');
      regionSet[rkey] = {
        region_type: p.region_type,
        region_value: p.region_value || '',
        label: p.region_type === 'national'
          ? 'National'
          : (p.region_value || p.region_type)
      };
    }

    const issue_topics = Object.keys(issueTopicSet).map(function (v) {
      return { value: v, label: v };
    });

    const regions = Object.keys(regionSet).map(function (k) { return regionSet[k]; });

    return {
      issue_topics: issue_topics,
      regions: regions
    };
  }

  // listPetitions(filters)
  listPetitions(filters) {
    filters = filters || {};
    const petitions = this._getFromStorage('petitions');
    const result = petitions.filter(function (p) {
      if (filters.issue_topic && p.issue_topic !== filters.issue_topic) return false;
      if (filters.region_type && p.region_type !== filters.region_type) return false;
      if (filters.region_value && p.region_value !== filters.region_value) return false;
      return true;
    });

    return result.map(function (p) {
      return {
        petition_id: p.id,
        title: p.title,
        summary: p.summary || '',
        issue_topic: p.issue_topic,
        region_type: p.region_type,
        region_value: p.region_value || '',
        target_name: p.target_name || '',
        signature_goal: typeof p.signature_goal === 'number' ? p.signature_goal : null,
        signature_count: typeof p.signature_count === 'number' ? p.signature_count : 0
      };
    });
  }

  // getPetitionDetail(petitionId)
  getPetitionDetail(petitionId) {
    const petitions = this._getFromStorage('petitions');
    const p = petitions.find(function (pt) { return pt.id === petitionId; }) || null;
    if (!p) {
      return {
        petition_id: null,
        title: null,
        summary: null,
        full_text: null,
        issue_topic: null,
        region_type: null,
        region_value: null,
        target_name: null,
        signature_goal: null,
        signature_count: null
      };
    }
    return {
      petition_id: p.id,
      title: p.title,
      summary: p.summary || '',
      full_text: p.full_text || '',
      issue_topic: p.issue_topic,
      region_type: p.region_type,
      region_value: p.region_value || '',
      target_name: p.target_name || '',
      signature_goal: typeof p.signature_goal === 'number' ? p.signature_goal : null,
      signature_count: typeof p.signature_count === 'number' ? p.signature_count : 0
    };
  }

  // signPetition(petitionId, full_name, email, zip_code)
  signPetition(petitionId, full_name, email, zip_code) {
    const signatures = this._getFromStorage('petition_signatures');
    const petitions = this._getFromStorage('petitions');

    const now = new Date().toISOString();
    const id = this._generateId('petsign');

    signatures.push({
      id: id,
      petitionId: petitionId,
      full_name: full_name,
      email: email,
      zip_code: zip_code,
      createdAt: now
    });

    const petition = petitions.find(function (p) { return p.id === petitionId; }) || null;
    if (petition) {
      if (typeof petition.signature_count === 'number') {
        petition.signature_count += 1;
      } else {
        petition.signature_count = 1;
      }
      this._saveToStorage('petitions', petitions);
    }

    this._saveToStorage('petition_signatures', signatures);

    return {
      success: true,
      signature: {
        signature_id: id,
        petition_id: petitionId,
        full_name: full_name,
        email: email,
        zip_code: zip_code,
        createdAt: now,
        petition: petition
      },
      message: 'Petition signed'
    };
  }

  // findRepresentativesByZip(zip_code)
  findRepresentativesByZip(zip_code) {
    const reps = this._getFromStorage('representatives');
    const grouped = {
      zip_code: zip_code,
      federal: [],
      state: [],
      local: []
    };

    reps.forEach(function (r) {
      const item = {
        representative_id: r.id,
        full_name: r.full_name,
        office_title: r.office_title,
        government_level: r.government_level,
        chamber: r.chamber || null,
        state: r.state || null,
        district: r.district || null,
        contact_email: r.contact_email || null,
        website_url: r.website_url || null,
        phone: r.phone || null
      };
      if (r.government_level === 'federal') grouped.federal.push(item);
      else if (r.government_level === 'state') grouped.state.push(item);
      else if (r.government_level === 'local') grouped.local.push(item);
    });

    // Instrumentation for task completion tracking (task_5)
    try {
      if (zip_code !== undefined && zip_code !== null && String(zip_code).trim() !== '') {
        localStorage.setItem('task5_zipSearchInput', String(zip_code));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return grouped;
  }

  // getContactFormOptionsForRepresentative(representativeId)
  getContactFormOptionsForRepresentative(representativeId) {
    const reps = this._getFromStorage('representatives');
    const representative = reps.find(function (r) { return r.id === representativeId; }) || null;

    const issueCategories = this._getFromStorage('issue_categories');
    const campaigns = this._getFromStorage('advocacy_campaigns');

    const filteredCampaigns = campaigns.filter(function (c) {
      if (!c.is_active) return false;
      if (!representative) return true;
      if (c.target_level && representative.government_level && c.target_level !== representative.government_level) return false;
      return true;
    });

    return {
      representative: representative ? {
        representative_id: representative.id,
        full_name: representative.full_name,
        office_title: representative.office_title,
        government_level: representative.government_level,
        chamber: representative.chamber || null,
        state: representative.state || null,
        district: representative.district || null
      } : null,
      issue_categories: issueCategories.map(function (ic) {
        return {
          issue_category_id: ic.id,
          name: ic.name,
          slug: ic.slug,
          description: ic.description || ''
        };
      }),
      advocacy_campaigns: filteredCampaigns.map(function (c) {
        return {
          advocacy_campaign_id: c.id,
          title: c.title,
          description: c.description || '',
          issue_category_id: c.issueCategoryId,
          bill_number: c.bill_number || null,
          target_level: c.target_level || null,
          script_template: c.script_template || '',
          is_active: !!c.is_active
        };
      })
    };
  }

  // sendRepresentativeMessage(representativeId, issueCategoryId, advocacyCampaignId, message_body, sender_full_name, sender_email)
  sendRepresentativeMessage(representativeId, issueCategoryId, advocacyCampaignId, message_body, sender_full_name, sender_email) {
    const messages = this._getFromStorage('representative_messages');
    const now = new Date().toISOString();
    const id = this._generateId('repmsg');

    const msgRecord = {
      id: id,
      representativeId: representativeId,
      issueCategoryId: issueCategoryId,
      advocacyCampaignId: advocacyCampaignId,
      subject: null,
      message_body: message_body,
      sender_full_name: sender_full_name,
      sender_email: sender_email,
      createdAt: now,
      status: 'sent'
    };

    messages.push(msgRecord);
    this._saveToStorage('representative_messages', messages);

    return {
      success: true,
      representative_message: {
        message_id: id,
        representative_id: representativeId,
        issue_category_id: issueCategoryId,
        advocacy_campaign_id: advocacyCampaignId,
        subject: null,
        message_body: message_body,
        sender_full_name: sender_full_name,
        sender_email: sender_email,
        status: 'sent',
        createdAt: now
      },
      message: 'Message sent'
    };
  }

  // getActionPlanPageData()
  getActionPlanPageData() {
    const templates = this._getFromStorage('action_templates');

    // Ensure there is at least one volunteer and one spread-the-word
    // action template so that users can always build a 3-part plan,
    // even if the underlying data only includes donation/pledge actions.
    let templatesModified = false;
    const hasVolunteer = templates.some(function (t) { return t && t.category === 'volunteer'; });
    const hasSpread = templates.some(function (t) { return t && t.category === 'spread_the_word'; });

    if (!hasVolunteer) {
      templates.push({
        id: this._generateId('at_volunteer_default'),
        title: 'Volunteer for weekly voter outreach',
        description: 'Sign up to volunteer your time with the campaign on a recurring basis.',
        category: 'volunteer',
        action_type: 'volunteer_signup',
        volunteer_activity_type: 'phone_banking',
        related_entity_type: '',
        related_entity_id: '',
        is_recommended: true
      });
      templatesModified = true;
    }

    if (!hasSpread) {
      templates.push({
        id: this._generateId('at_spread_default'),
        title: 'Spread the word on social media',
        description: 'Share campaign information with friends, family, and followers.',
        category: 'spread_the_word',
        action_type: 'share_content',
        share_channel: 'social_media',
        related_entity_type: '',
        related_entity_id: '',
        is_recommended: true
      });
      templatesModified = true;
    }

    if (templatesModified) {
      this._saveToStorage('action_templates', templates);
    }

    const donate_or_pledge = templates
      .filter(function (t) { return t.category === 'donate_or_pledge'; })
      .map(function (t) {
        return {
          action_template_id: t.id,
          title: t.title,
          description: t.description || '',
          category: t.category,
          action_type: t.action_type,
          default_pledge_amount: typeof t.default_pledge_amount === 'number' ? t.default_pledge_amount : null,
          min_pledge_amount: typeof t.min_pledge_amount === 'number' ? t.min_pledge_amount : null,
          max_pledge_amount: typeof t.max_pledge_amount === 'number' ? t.max_pledge_amount : null,
          is_recommended: !!t.is_recommended
        };
      });

    const volunteer = templates
      .filter(function (t) { return t.category === 'volunteer'; })
      .map(function (t) {
        return {
          action_template_id: t.id,
          title: t.title,
          description: t.description || '',
          category: t.category,
          action_type: t.action_type,
          volunteer_activity_type: t.volunteer_activity_type || null,
          is_recommended: !!t.is_recommended
        };
      });

    const spread_the_word = templates
      .filter(function (t) { return t.category === 'spread_the_word'; })
      .map(function (t) {
        return {
          action_template_id: t.id,
          title: t.title,
          description: t.description || '',
          category: t.category,
          action_type: t.action_type,
          share_channel: t.share_channel || null,
          related_entity_type: t.related_entity_type || null,
          related_entity_id: t.related_entity_id || null,
          related_entity: (t.related_entity_type && t.related_entity_id)
            ? this._resolveRelatedEntity(t.related_entity_type, t.related_entity_id)
            : null,
          is_recommended: !!t.is_recommended
        };
      }, this);

    const volunteer_activity_types_set = {};
    volunteer.forEach(function (v) {
      if (v.volunteer_activity_type) volunteer_activity_types_set[v.volunteer_activity_type] = true;
    });
    const volunteer_activity_types = Object.keys(volunteer_activity_types_set).map(function (val) {
      return { value: val, label: val.split('_').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ') };
    });

    const share_channels_set = {};
    spread_the_word.forEach(function (s) {
      if (s.share_channel) share_channels_set[s.share_channel] = true;
    });
    const share_channels = Object.keys(share_channels_set).map(function (val) {
      return { value: val, label: val.split('_').map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ') };
    });

    return {
      recommended_actions: {
        donate_or_pledge: donate_or_pledge,
        volunteer: volunteer,
        spread_the_word: spread_the_word
      },
      filter_options: {
        volunteer_activity_types: volunteer_activity_types,
        share_channels: share_channels
      }
    };
  }

  // addActionTemplateToPlan(actionTemplateId)
  addActionTemplateToPlan(actionTemplateId) {
    const plan = this._getOrCreateActionPlan();
    const templates = this._getFromStorage('action_templates');
    const items = this._getFromStorage('action_plan_items');
    const template = templates.find(function (t) { return t.id === actionTemplateId; }) || null;
    if (!template) {
      return { success: false, action_plan: null, message: 'Action template not found' };
    }

    const now = new Date().toISOString();
    let maxOrder = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].actionPlanId === plan.id && typeof items[i].order_index === 'number') {
        if (items[i].order_index > maxOrder) maxOrder = items[i].order_index;
      }
    }

    const newItem = {
      id: this._generateId('apitem'),
      actionPlanId: plan.id,
      actionTemplateId: actionTemplateId,
      category: template.category,
      pledge_amount: typeof template.default_pledge_amount === 'number' ? template.default_pledge_amount : null,
      notes: null,
      order_index: maxOrder + 1,
      addedAt: now
    };

    items.push(newItem);
    this._saveToStorage('action_plan_items', items);

    // Update plan updatedAt
    const plans = this._getFromStorage('action_plans');
    for (let j = 0; j < plans.length; j++) {
      if (plans[j].id === plan.id) {
        plans[j].updatedAt = now;
        break;
      }
    }
    this._saveToStorage('action_plans', plans);

    const hydrated = this._hydrateActionPlan({
      id: plan.id,
      name: plan.name,
      createdAt: plan.createdAt,
      updatedAt: now,
      status: plan.status
    });

    return {
      success: true,
      action_plan: hydrated,
      message: 'Action added to plan'
    };
  }

  // getCurrentActionPlan()
  getCurrentActionPlan() {
    const plan = this._findCurrentActionPlan();
    if (!plan) {
      return { exists: false, action_plan: null };
    }
    const hydrated = this._hydrateActionPlan(plan);
    return { exists: true, action_plan: hydrated };
  }

  // updateActionPlanItem(actionPlanItemId, pledge_amount, notes, order_index)
  updateActionPlanItem(actionPlanItemId, pledge_amount, notes, order_index) {
    const items = this._getFromStorage('action_plan_items');
    const idx = items.findIndex(function (it) { return it.id === actionPlanItemId; });
    if (idx === -1) {
      return { success: false, updated_item: null, action_plan: null, message: 'Action plan item not found' };
    }
    const item = items[idx];
    if (typeof pledge_amount === 'number') item.pledge_amount = pledge_amount;
    if (typeof notes === 'string') item.notes = notes;
    if (typeof order_index === 'number') item.order_index = order_index;

    items[idx] = item;
    this._saveToStorage('action_plan_items', items);

    const plans = this._getFromStorage('action_plans');
    const now = new Date().toISOString();
    let planId = item.actionPlanId;
    let planSummary = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plans[i].updatedAt = now;
        planSummary = { action_plan_id: plans[i].id, status: plans[i].status, updatedAt: plans[i].updatedAt };
        break;
      }
    }
    this._saveToStorage('action_plans', plans);

    const templates = this._getFromStorage('action_templates');
    const template = templates.find(function (t) { return t.id === item.actionTemplateId; }) || null;

    const updated_item = {
      action_plan_item_id: item.id,
      action_template_id: item.actionTemplateId,
      category: item.category,
      title: template ? template.title : null,
      action_type: template ? template.action_type : null,
      pledge_amount: item.pledge_amount,
      notes: item.notes || null,
      order_index: typeof item.order_index === 'number' ? item.order_index : null,
      addedAt: item.addedAt,
      action_template: template
    };

    return {
      success: true,
      updated_item: updated_item,
      action_plan: planSummary,
      message: 'Action plan item updated'
    };
  }

  // removeActionPlanItem(actionPlanItemId)
  removeActionPlanItem(actionPlanItemId) {
    const items = this._getFromStorage('action_plan_items');
    const idx = items.findIndex(function (it) { return it.id === actionPlanItemId; });
    if (idx === -1) {
      return { success: false, action_plan: null, message: 'Action plan item not found' };
    }
    const planId = items[idx].actionPlanId;
    items.splice(idx, 1);
    this._saveToStorage('action_plan_items', items);

    const plans = this._getFromStorage('action_plans');
    const now = new Date().toISOString();
    let planSummary = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) {
        plans[i].updatedAt = now;
        planSummary = { action_plan_id: plans[i].id, status: plans[i].status, updatedAt: plans[i].updatedAt };
        break;
      }
    }
    this._saveToStorage('action_plans', plans);

    return {
      success: true,
      action_plan: planSummary,
      message: 'Action plan item removed'
    };
  }

  // saveCurrentActionPlan()
  saveCurrentActionPlan() {
    const plan = this._findCurrentActionPlan();
    if (!plan) {
      return { success: false, action_plan: null, message: 'No active action plan' };
    }
    const plans = this._getFromStorage('action_plans');
    const now = new Date().toISOString();
    let itemsCount = 0;
    const allItems = this._getFromStorage('action_plan_items');
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].actionPlanId === plan.id) itemsCount++;
    }
    for (let j = 0; j < plans.length; j++) {
      if (plans[j].id === plan.id) {
        plans[j].updatedAt = now;
        break;
      }
    }
    this._saveToStorage('action_plans', plans);

    // Instrumentation for task completion tracking (task_6)
    try {
      const categoriesArray = [];
      const pledgeItemsArray = [];
      for (let k = 0; k < allItems.length; k++) {
        const item = allItems[k];
        if (item.actionPlanId === plan.id) {
          if (item.category) {
            categoriesArray.push(item.category);
          }
          if (item.category === 'donate_or_pledge') {
            pledgeItemsArray.push({
              action_plan_item_id: item.id,
              pledge_amount: typeof item.pledge_amount === 'number' ? item.pledge_amount : null
            });
          }
        }
      }
      const taskState = {
        action_plan_id: plan.id,
        savedAt: now,
        items_count: itemsCount,
        item_categories: categoriesArray,
        pledge_items: pledgeItemsArray
      };
      localStorage.setItem('task6_planSavedState', JSON.stringify(taskState));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      action_plan: {
        action_plan_id: plan.id,
        status: plan.status,
        updatedAt: now,
        items_count: itemsCount
      },
      message: 'Action plan saved'
    };
  }

  // getElectionFilterOptions()
  getElectionFilterOptions() {
    const races = this._getFromStorage('election_races');
    const yearSet = {};
    const raceTypeSet = {};
    const districtMap = {};

    races.forEach(function (r) {
      if (typeof r.year === 'number') yearSet[r.year] = true;
      if (r.race_type) raceTypeSet[r.race_type] = true;
      if (r.district) {
        const key = r.district + '|' + (r.jurisdiction_name || '');
        if (!districtMap[key]) {
          districtMap[key] = {
            value: r.district,
            label: r.district,
            jurisdiction_name: r.jurisdiction_name || ''
          };
        }
      }
    });

    const years = Object.keys(yearSet).map(function (y) {
      const num = parseInt(y, 10);
      return { value: num, label: String(num) };
    });

    const raceTypeLabelMap = {
      city_council: 'City Council',
      us_senate: 'U.S. Senate',
      us_house: 'U.S. House',
      governor: 'Governor',
      mayoral: 'Mayoral',
      state_legislature: 'State Legislature',
      ballot_measure: 'Ballot Measure',
      other: 'Other'
    };

    const race_types = Object.keys(raceTypeSet).map(function (rt) {
      return { value: rt, label: raceTypeLabelMap[rt] || rt };
    });

    const districts = Object.keys(districtMap).map(function (k) { return districtMap[k]; });

    return {
      years: years,
      race_types: race_types,
      districts: districts
    };
  }

  // listElectionRaces(filters)
  listElectionRaces(filters) {
    filters = filters || {};
    const races = this._getFromStorage('election_races');
    const result = races.filter(function (r) {
      if (typeof filters.year === 'number' && r.year !== filters.year) return false;
      if (filters.race_type && r.race_type !== filters.race_type) return false;
      if (filters.district && r.district !== filters.district) return false;
      if (filters.jurisdiction_name && r.jurisdiction_name !== filters.jurisdiction_name) return false;
      return true;
    });

    return result.map(function (r) {
      return {
        race_id: r.id,
        name: r.name,
        year: r.year,
        race_type: r.race_type,
        district: r.district || null,
        jurisdiction_type: r.jurisdiction_type || null,
        jurisdiction_name: r.jurisdiction_name || null,
        description: r.description || ''
      };
    });
  }

  // getRaceCandidates(raceId)
  getRaceCandidates(raceId) {
    const raceCandidates = this._getFromStorage('race_candidates');
    const candidates = this._getFromStorage('candidates');

    const result = raceCandidates
      .filter(function (rc) { return rc.raceId === raceId; })
      .map(function (rc) {
        const c = candidates.find(function (cand) { return cand.id === rc.candidateId; }) || null;
        return {
          race_candidate_id: rc.id,
          candidate_id: rc.candidateId,
          candidate_name: c ? c.name : null,
          party: c ? (c.party || null) : null,
          is_incumbent: typeof rc.is_incumbent === 'boolean' ? rc.is_incumbent : (c ? !!c.is_incumbent : false),
          ballot_position: typeof rc.ballot_position === 'number' ? rc.ballot_position : null,
          photo_url: c ? (c.photo_url || null) : null,
          candidate: c
        };
      });

    return result;
  }

  // getNewsFilterOptions()
  getNewsFilterOptions() {
    const articles = this._getFromStorage('news_articles');
    const tagSet = {};

    articles.forEach(function (a) {
      if (Array.isArray(a.tags)) {
        a.tags.forEach(function (t) {
          if (t) tagSet[t] = true;
        });
      }
    });

    const tags = Object.keys(tagSet).map(function (t) {
      return { value: t, label: t };
    });

    const now = new Date();
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last6Months = new Date(now);
    last6Months.setMonth(last6Months.getMonth() - 6);
    const last12Months = new Date(now);
    last12Months.setFullYear(last12Months.getFullYear() - 1);

    const date_ranges = [
      {
        value: 'last_7_days',
        label: 'Last 7 Days',
        start_date: last7.toISOString(),
        end_date: now.toISOString()
      },
      {
        value: 'last_30_days',
        label: 'Last 30 Days',
        start_date: last30.toISOString(),
        end_date: now.toISOString()
      },
      {
        value: 'last_6_months',
        label: 'Last 6 Months',
        start_date: last6Months.toISOString(),
        end_date: now.toISOString()
      },
      {
        value: 'last_12_months',
        label: 'Last 12 Months',
        start_date: last12Months.toISOString(),
        end_date: now.toISOString()
      }
    ];

    return {
      tags: tags,
      date_ranges: date_ranges
    };
  }

  // listNewsArticles(filters)
  listNewsArticles(filters) {
    filters = filters || {};
    const articles = this._getFromStorage('news_articles');
    const startDate = this._parseDate(filters.start_date);
    const endDate = this._parseDate(filters.end_date);
    const result = articles.filter(function (a) {
      if (filters.tag && (!Array.isArray(a.tags) || a.tags.indexOf(filters.tag) === -1)) return false;
      const d = new Date(a.publishedAt);
      if (startDate && (isNaN(d.getTime()) || d < startDate)) return false;
      if (endDate && (isNaN(d.getTime()) || d > endDate)) return false;
      if (filters.search_query) {
        const q = String(filters.search_query).toLowerCase();
        const inTitle = a.title && a.title.toLowerCase().indexOf(q) !== -1;
        const inSummary = a.summary && a.summary.toLowerCase().indexOf(q) !== -1;
        const inBody = a.body && a.body.toLowerCase().indexOf(q) !== -1;
        if (!inTitle && !inSummary && !inBody) return false;
      }
      return true;
    });

    result.sort(function (a, b) {
      const da = new Date(a.publishedAt).getTime();
      const db = new Date(b.publishedAt).getTime();
      return db - da;
    });

    return result.map(function (a) {
      return {
        article_id: a.id,
        title: a.title,
        summary: a.summary || '',
        publishedAt: a.publishedAt,
        author: a.author || null,
        tags: a.tags || [],
        image_url: a.image_url || null
      };
    });
  }

  // saveArticleToReadingList(articleId)
  saveArticleToReadingList(articleId) {
    const saved = this._getOrCreateReadingListStore();
    const existing = saved.find(function (s) { return s.articleId === articleId; });
    if (existing) {
      return {
        success: true,
        saved_article: {
          saved_article_id: existing.id,
          article_id: existing.articleId,
          savedAt: existing.savedAt
        },
        message: 'Article already saved'
      };
    }
    const now = new Date().toISOString();
    const id = this._generateId('savedart');
    saved.push({ id: id, articleId: articleId, savedAt: now });
    this._saveToStorage('saved_articles', saved);
    return {
      success: true,
      saved_article: {
        saved_article_id: id,
        article_id: articleId,
        savedAt: now
      },
      message: 'Article saved to reading list'
    };
  }

  // getReadingList()
  getReadingList() {
    const saved = this._getOrCreateReadingListStore();
    const articles = this._getFromStorage('news_articles');

    return saved.map(function (s) {
      const article = articles.find(function (a) { return a.id === s.articleId; }) || null;
      return {
        saved_article_id: s.id,
        savedAt: s.savedAt,
        article: article ? {
          article_id: article.id,
          title: article.title,
          summary: article.summary || '',
          publishedAt: article.publishedAt,
          author: article.author || null,
          tags: article.tags || []
        } : null
      };
    });
  }

  // removeArticleFromReadingList(savedArticleId)
  removeArticleFromReadingList(savedArticleId) {
    const saved = this._getOrCreateReadingListStore();
    const idx = saved.findIndex(function (s) { return s.id === savedArticleId; });
    if (idx === -1) {
      return { success: false, message: 'Saved article not found' };
    }
    saved.splice(idx, 1);
    this._saveToStorage('saved_articles', saved);
    return { success: true, message: 'Saved article removed' };
  }

  // getLocalTeamFilterOptions()
  getLocalTeamFilterOptions() {
    const teams = this._getFromStorage('local_teams');
    const tagSet = {};

    teams.forEach(function (t) {
      if (Array.isArray(t.issue_focus_tags)) {
        t.issue_focus_tags.forEach(function (tag) {
          if (tag) tagSet[tag] = true;
        });
      }
    });

    const issue_focus_tags = Object.keys(tagSet).map(function (tag) {
      return { value: tag, label: tag };
    });

    const sort_options = [
      { value: 'most_active', label: 'Most Active' },
      { value: 'most_members', label: 'Most Members' },
      { value: 'name_az', label: 'Name A-Z' }
    ];

    return {
      issue_focus_tags: issue_focus_tags,
      sort_options: sort_options
    };
  }

  // searchLocalTeams(location_query, issue_focus_tags, sort_by)
  searchLocalTeams(location_query, issue_focus_tags, sort_by) {
    const teams = this._getFromStorage('local_teams');
    const query = location_query ? String(location_query).toLowerCase() : null;
    const tagsFilter = this._ensureArray(issue_focus_tags);

    let result = teams.filter(function (t) {
      if (query) {
        const loc = [t.location_name, t.county, t.city, t.state, t.postal_code]
          .filter(function (v) { return !!v; })
          .join(' ')
          .toLowerCase();
        if (loc.indexOf(query) === -1) return false;
      }

      if (tagsFilter.length && Array.isArray(t.issue_focus_tags)) {
        const hasOverlap = t.issue_focus_tags.some(function (tag) {
          return tagsFilter.indexOf(tag) !== -1;
        });
        if (!hasOverlap) return false;
      }

      return true;
    });

    if (sort_by === 'most_active') {
      result.sort(function (a, b) {
        const sa = typeof a.activity_score === 'number' ? a.activity_score : 0;
        const sb = typeof b.activity_score === 'number' ? b.activity_score : 0;
        return sb - sa;
      });
    } else if (sort_by === 'most_members') {
      result.sort(function (a, b) {
        const ma = typeof a.member_count === 'number' ? a.member_count : 0;
        const mb = typeof b.member_count === 'number' ? b.member_count : 0;
        return mb - ma;
      });
    } else if (sort_by === 'name_az') {
      result.sort(function (a, b) {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    return result.map(function (t) {
      return {
        team_id: t.id,
        name: t.name,
        description: t.description || '',
        location_name: t.location_name || null,
        county: t.county || null,
        city: t.city || null,
        state: t.state || null,
        postal_code: t.postal_code || null,
        issue_focus_tags: t.issue_focus_tags || [],
        activity_level_label: t.activity_level_label,
        activity_score: typeof t.activity_score === 'number' ? t.activity_score : null,
        member_count: typeof t.member_count === 'number' ? t.member_count : null
      };
    });
  }

  // getLocalTeamDetail(teamId)
  getLocalTeamDetail(teamId) {
    const teams = this._getFromStorage('local_teams');
    const t = teams.find(function (tm) { return tm.id === teamId; }) || null;
    if (!t) {
      return {
        team_id: null,
        name: null,
        description: null,
        location_name: null,
        county: null,
        city: null,
        state: null,
        postal_code: null,
        issue_focus_tags: [],
        activity_level_label: null,
        activity_score: null,
        member_count: null,
        upcoming_activities: []
      };
    }
    return {
      team_id: t.id,
      name: t.name,
      description: t.description || '',
      location_name: t.location_name || null,
      county: t.county || null,
      city: t.city || null,
      state: t.state || null,
      postal_code: t.postal_code || null,
      issue_focus_tags: t.issue_focus_tags || [],
      activity_level_label: t.activity_level_label,
      activity_score: typeof t.activity_score === 'number' ? t.activity_score : null,
      member_count: typeof t.member_count === 'number' ? t.member_count : null,
      upcoming_activities: []
    };
  }

  // joinLocalTeam(teamId, role, email, phone)
  joinLocalTeam(teamId, role, email, phone) {
    const memberships = this._getFromStorage('team_memberships');
    const now = new Date().toISOString();
    const id = this._generateId('teammem');

    const membership = {
      id: id,
      teamId: teamId,
      role: role,
      email: email,
      phone: phone,
      joinedAt: now,
      status: 'pending'
    };

    memberships.push(membership);
    this._saveToStorage('team_memberships', memberships);

    return {
      success: true,
      team_membership: {
        membership_id: id,
        team_id: teamId,
        role: role,
        email: email,
        phone: phone,
        status: 'pending',
        joinedAt: now
      },
      message: 'Join request submitted'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    // Allow overriding via localStorage key 'about_page_content' (object), otherwise use sensible defaults.
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        return obj;
      } catch (e) {
        // fall through to defaults
      }
    }

    return {
      mission: 'We empower voters and volunteers to take effective action on the issues that matter most.',
      values: [
        'Democracy and civic participation',
        'Equity and justice for all communities',
        'Evidence-based policy and accountability'
      ],
      priorities: [
        {
          title: 'Expand Voter Participation',
          description: 'We work to register, educate, and mobilize voters in every community.'
        },
        {
          title: 'Support Grassroots Organizing',
          description: 'We connect supporters with local teams, events, and volunteer opportunities.'
        }
      ],
      contact_information: {
        email: 'info@example.org',
        phone: null,
        mailing_address: null
      },
      accessibility_statement: 'We are committed to making our digital tools and in-person events accessible to all supporters.',
      get_involved_summary: 'Sign petitions, contact your representatives, volunteer with local teams, and build your own action plan.'
    };
  }

  // getIssueCategories()
  getIssueCategories() {
    const issueCategories = this._getFromStorage('issue_categories');
    return issueCategories.map(function (ic) {
      return {
        issue_category_id: ic.id,
        name: ic.name,
        slug: ic.slug,
        description: ic.description || ''
      };
    });
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