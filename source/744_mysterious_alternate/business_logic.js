/*
  BusinessLogic implementation for the ARG teaser site.
  - Uses localStorage (with Node.js polyfill) for all persistence
  - No DOM/window/document access except exporting BusinessLogic/WebsiteSDK
*/

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
    this.idCounter = this._getNextIdCounter(); // initialize counter
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tables = [
      'transmission_logs',
      'code_panel_states',
      'phase_gates',
      'timeline_events',
      'watchlist_states',
      'characters',
      'character_compare_states',
      'anomaly_locations',
      'case_files',
      'case_file_location_links',
      'videos',
      'playlists',
      'playlist_items',
      'video_comments',
      'recruitment_profiles',
      'incident_logs',
      'reading_queue_states',
      'signals',
      'ciphers',
      'board_clues',
      'theories',
      'artifacts'
    ];

    for (const key of tables) {
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

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  _uniqueArray(arr) {
    return Array.from(new Set(arr));
  }

  _humanizeEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  // ----------------------
  // Internal helper functions (as specified)
  // ----------------------

  _getOrCreateCodePanelState() {
    let states = this._getFromStorage('code_panel_states');
    if (!states.length) {
      const state = {
        id: 'code_panel_default',
        collected_words: [],
        passphrase_submitted: false,
        last_submitted_passphrase: null,
        last_submission_valid: null,
        updated_at: this._nowIso()
      };
      states.push(state);
      this._saveToStorage('code_panel_states', states);
      return state;
    }
    return states[0];
  }

  _saveCodePanelState(state) {
    let states = this._getFromStorage('code_panel_states');
    if (!states.length) {
      states = [state];
    } else {
      states[0] = state;
    }
    this._saveToStorage('code_panel_states', states);
  }

  _getOrCreatePhaseGate(phase) {
    let gates = this._getFromStorage('phase_gates');
    let gate = gates.find(g => g.phase === phase);
    if (!gate) {
      // Minimal placeholder; real content should be seeded externally.
      gate = {
        id: this._generateId('phase_gate'),
        name: phase,
        phase: phase,
        status: 'locked',
        required_word_count: 4,
        unlock_passphrase: [],
        unlocked_at: null,
        unlocked_content_ref: null
      };
      gates.push(gate);
      this._saveToStorage('phase_gates', gates);
    }
    return gate;
  }

  _savePhaseGate(gate) {
    const gates = this._getFromStorage('phase_gates');
    const idx = gates.findIndex(g => g.id === gate.id);
    if (idx === -1) {
      gates.push(gate);
    } else {
      gates[idx] = gate;
    }
    this._saveToStorage('phase_gates', gates);
  }

  _getOrCreateWatchlistState() {
    let states = this._getFromStorage('watchlist_states');
    if (!states.length) {
      const state = {
        id: 'watchlist_default',
        event_ids: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      states.push(state);
      this._saveToStorage('watchlist_states', states);
      return state;
    }
    return states[0];
  }

  _saveWatchlistState(state) {
    let states = this._getFromStorage('watchlist_states');
    if (!states.length) states = [state]; else states[0] = state;
    this._saveToStorage('watchlist_states', states);
  }

  _getOrCreateCharacterCompareState() {
    let states = this._getFromStorage('character_compare_states');
    if (!states.length) {
      const state = {
        id: 'character_compare_default',
        character_ids: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      states.push(state);
      this._saveToStorage('character_compare_states', states);
      return state;
    }
    return states[0];
  }

  _saveCharacterCompareState(state) {
    let states = this._getFromStorage('character_compare_states');
    if (!states.length) states = [state]; else states[0] = state;
    this._saveToStorage('character_compare_states', states);
  }

  _getOrCreateReadingQueueState() {
    let states = this._getFromStorage('reading_queue_states');
    if (!states.length) {
      const state = {
        id: 'reading_queue_default',
        incident_log_ids: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      states.push(state);
      this._saveToStorage('reading_queue_states', states);
      return state;
    }
    return states[0];
  }

  _saveReadingQueueState(state) {
    let states = this._getFromStorage('reading_queue_states');
    if (!states.length) states = [state]; else states[0] = state;
    this._saveToStorage('reading_queue_states', states);
  }

  _getOrCreateTheoryBoardState() {
    const board_clues = this._getFromStorage('board_clues');
    const theories = this._getFromStorage('theories');
    return { board_clues, theories };
  }

  _saveTheoryBoardState(board_clues, theories) {
    this._saveToStorage('board_clues', board_clues || []);
    this._saveToStorage('theories', theories || []);
  }

  _getOrCreatePlaylistBySystemType(system_type) {
    let playlists = this._getFromStorage('playlists');
    let playlist = playlists.find(p => p.system_type === system_type);
    if (!playlist) {
      const name = system_type === 'watch_later' ? 'Watch Later' : this._humanizeEnum(system_type);
      playlist = {
        id: this._generateId('playlist'),
        name,
        system_type,
        created_at: this._nowIso()
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    }
    return playlist;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeContent
  getHomeContent() {
    // Static atmospheric content (not entity data)
    return {
      hero_title: 'THE SIGNAL IS ALREADY INSIDE THE ROOM',
      hero_subtitle: 'Fragments of transmission leak through the noise. Assemble them before they assemble you.',
      hero_cta_label: 'Begin Transmission',
      background_theme: 'dark_signal_static',
      sections: [
        {
          section_id: 'premise',
          title: 'You Were Not Meant To See This',
          body: 'This channel was designed for internal Initiative traffic only. Something on your side tuned in by mistake. We suggest you pretend you did not notice. We suspect you will not.'
        },
        {
          section_id: 'instructions',
          title: 'How To Listen Without Being Heard',
          body: 'Explore Transmission Logs, Timeline artifacts, and unstable Anomaly sites. Collect what does not belong. Patterns will emerge. They always do.'
        },
        {
          section_id: 'warning',
          title: 'Do Not Stare At The Static',
          body: 'This is a single-user, fictional investigation. Nothing here can harm you—unless you let it live rent-free in your thoughts.'
        }
      ]
    };
  }

  // getHomeQuickExploreSections
  getHomeQuickExploreSections() {
    return [
      {
        page_key: 'timeline',
        label: 'Timeline',
        description: 'Walk the years of interference: glitches, breaches, and near-forgotten anomalies.'
      },
      {
        page_key: 'signals',
        label: 'Signals',
        description: 'Monitor live and recent transmissions. The loudest signals are rarely the most important.'
      },
      {
        page_key: 'artifacts',
        label: 'Artifacts',
        description: 'Review recovered objects of uncertain origin. Some refuse to stay cataloged.'
      },
      {
        page_key: 'recruitment',
        label: 'Join the Initiative',
        description: 'Offer your eyes to the dark between transmissions. Field or desk—the work finds you either way.'
      }
    ];
  }

  // getTransmissionLogFilterOptions
  getTransmissionLogFilterOptions() {
    const logs = this._getFromStorage('transmission_logs');
    const tags = [];
    for (const log of logs) {
      if (Array.isArray(log.tags)) {
        for (const t of log.tags) tags.push(t);
      }
    }
    const available_tags = this._uniqueArray(tags);
    return {
      available_tags,
      default_sort: 'date_newest_first',
      sort_options: [
        { key: 'date_newest_first', label: 'Date  Newest First' },
        { key: 'date_oldest_first', label: 'Date  Oldest First' }
      ]
    };
  }

  // searchTransmissionLogs(filters, sort, page, pageSize)
  searchTransmissionLogs(filters, sort, page, pageSize) {
    let logs = this._getFromStorage('transmission_logs');

    if (filters && Array.isArray(filters.tags) && filters.tags.length) {
      const filterTags = filters.tags;
      logs = logs.filter(log => Array.isArray(log.tags) && log.tags.some(t => filterTags.includes(t)));
    }

    if (filters && filters.is_prelude_only) {
      logs = logs.filter(log => log.is_prelude === true);
    }

    const sortKey = sort || 'date_newest_first';
    logs.sort((a, b) => {
      const da = this._parseDate(a.created_at);
      const db = this._parseDate(b.created_at);
      if (sortKey === 'date_oldest_first') {
        return da - db;
      }
      // default newest first
      return db - da;
    });

    const total = logs.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const items = logs.slice(start, start + ps);

    return { items, total, page: pg, pageSize: ps };
  }

  // getTransmissionLogDetail(logId)
  getTransmissionLogDetail(logId) {
    const logs = this._getFromStorage('transmission_logs');
    return logs.find(l => l.id === logId) || null;
  }

  // getCodePanelState
  getCodePanelState() {
    return this._getOrCreateCodePanelState();
  }

  // addCodePanelWordFromLog(logId, wordIndex)
  addCodePanelWordFromLog(logId, wordIndex) {
    const logs = this._getFromStorage('transmission_logs');
    const log = logs.find(l => l.id === logId);
    const state = this._getOrCreateCodePanelState();

    if (!log || !Array.isArray(log.green_highlighted_words)) {
      return { code_panel_state: state, added_word: null };
    }

    const idx = typeof wordIndex === 'number' ? wordIndex : 0;
    if (idx < 0 || idx >= log.green_highlighted_words.length) {
      return { code_panel_state: state, added_word: null };
    }

    const word = log.green_highlighted_words[idx];
    const order_index = state.collected_words.length;
    const added_word = { log_id: logId, word, order_index };

    state.collected_words.push(added_word);
    state.updated_at = this._nowIso();
    this._saveCodePanelState(state);

    return { code_panel_state: state, added_word };
  }

  // removeCodePanelWord(orderIndex)
  removeCodePanelWord(orderIndex) {
    const state = this._getOrCreateCodePanelState();
    const idx = state.collected_words.findIndex(w => w.order_index === orderIndex);
    if (idx !== -1) {
      state.collected_words.splice(idx, 1);
      // Re-normalize order_index
      state.collected_words = state.collected_words.map((w, i) => ({
        log_id: w.log_id,
        word: w.word,
        order_index: i
      }));
      state.updated_at = this._nowIso();
      this._saveCodePanelState(state);
    }
    return state;
  }

  // clearCodePanelWords()
  clearCodePanelWords() {
    const state = this._getOrCreateCodePanelState();
    state.collected_words = [];
    state.updated_at = this._nowIso();
    this._saveCodePanelState(state);
    return state;
  }

  // submitPhaseGatePassphrase(phase)
  submitPhaseGatePassphrase(phase) {
    const codePanel = this._getOrCreateCodePanelState();
    const gate = this._getOrCreatePhaseGate(phase);

    const required = gate.required_word_count || 0;
    const sortedWords = (codePanel.collected_words || [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map(w => w.word);

    const submitted = sortedWords.slice(0, required);

    codePanel.passphrase_submitted = true;
    codePanel.last_submitted_passphrase = submitted;

    let success = false;
    let message = '';

    if (!required || submitted.length !== required) {
      codePanel.last_submission_valid = false;
      message = `Passphrase incomplete. ${required} words required.`;
    } else if (Array.isArray(gate.unlock_passphrase) && gate.unlock_passphrase.length === required) {
      const expected = gate.unlock_passphrase.map(w => String(w).toLowerCase());
      const candidate = submitted.map(w => String(w).toLowerCase());
      const matches = expected.every((w, i) => w === candidate[i]);
      if (matches) {
        success = true;
        codePanel.last_submission_valid = true;
        gate.status = 'unlocked';
        gate.unlocked_at = this._nowIso();
        message = 'Transmission gate unlocked.';
      } else {
        codePanel.last_submission_valid = false;
        message = 'Passphrase rejected. The signal disagrees.';
      }
    } else {
      // No configured passphrase; treat as not unlockable
      codePanel.last_submission_valid = false;
      message = 'Passphrase cannot be validated yet.';
    }

    codePanel.updated_at = this._nowIso();
    this._saveCodePanelState(codePanel);
    this._savePhaseGate(gate);

    return { success, message, phase_gate: gate, code_panel_state: codePanel };
  }

  // getPhaseGateStatus(phase)
  getPhaseGateStatus(phase) {
    return this._getOrCreatePhaseGate(phase);
  }

  // getTimelineFilterOptions
  getTimelineFilterOptions() {
    const events = this._getFromStorage('timeline_events');
    const years = events.map(e => e.year).filter(y => typeof y === 'number');
    const severities = events.map(e => e.severity).filter(s => typeof s === 'number');

    const min_year = years.length ? Math.min(...years) : null;
    const max_year = years.length ? Math.max(...years) : null;
    const severity_min = severities.length ? Math.min(...severities) : null;
    const severity_max = severities.length ? Math.max(...severities) : null;

    const event_types = [
      { key: 'glitch', label: 'Glitch' },
      { key: 'anomaly', label: 'Anomaly' },
      { key: 'briefing', label: 'Briefing' },
      { key: 'discovery', label: 'Discovery' },
      { key: 'other', label: 'Other' }
    ];

    const sort_options = [
      { key: 'date_oldest_first', label: 'Date  Oldest First' },
      { key: 'date_newest_first', label: 'Date  Newest First' },
      { key: 'severity_low_to_high', label: 'Severity  Low to High' },
      { key: 'severity_high_to_low', label: 'Severity  High to Low' }
    ];

    return { min_year, max_year, event_types, severity_min, severity_max, sort_options };
  }

  // searchTimelineEvents(filters, sort, page, pageSize)
  searchTimelineEvents(filters, sort, page, pageSize) {
    let events = this._getFromStorage('timeline_events');

    if (filters) {
      if (typeof filters.start_year === 'number') {
        events = events.filter(e => typeof e.year === 'number' && e.year >= filters.start_year);
      }
      if (typeof filters.end_year === 'number') {
        events = events.filter(e => typeof e.year === 'number' && e.year <= filters.end_year);
      }
      if (Array.isArray(filters.event_types) && filters.event_types.length) {
        const types = filters.event_types;
        events = events.filter(e => types.includes(e.event_type));
      }
      if (typeof filters.min_severity === 'number') {
        events = events.filter(e => typeof e.severity === 'number' && e.severity >= filters.min_severity);
      }
      if (typeof filters.max_severity === 'number') {
        events = events.filter(e => typeof e.severity === 'number' && e.severity <= filters.max_severity);
      }
    }

    const sortKey = sort || 'date_newest_first';
    events.sort((a, b) => {
      const da = this._parseDate(a.date);
      const db = this._parseDate(b.date);
      switch (sortKey) {
        case 'date_oldest_first':
          return da - db;
        case 'severity_low_to_high':
          return (a.severity || 0) - (b.severity || 0);
        case 'severity_high_to_low':
          return (b.severity || 0) - (a.severity || 0);
        case 'date_newest_first':
        default:
          return db - da;
      }
    });

    const total = events.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const items = events.slice(start, start + ps);

    return { items, total, page: pg, pageSize: ps };
  }

  // getTimelineEventDetail(eventId)
  getTimelineEventDetail(eventId) {
    const events = this._getFromStorage('timeline_events');
    return events.find(e => e.id === eventId) || null;
  }

  // addTimelineEventToWatchlist(eventId)
  addTimelineEventToWatchlist(eventId) {
    const events = this._getFromStorage('timeline_events');
    const event = events.find(e => e.id === eventId) || null;
    const state = this._getOrCreateWatchlistState();

    if (event && !state.event_ids.includes(eventId)) {
      state.event_ids.push(eventId);
      state.updated_at = this._nowIso();
      this._saveWatchlistState(state);
    }

    return { watchlist_state: state, added_event: event };
  }

  // getWatchlistEvents
  getWatchlistEvents() {
    const state = this._getOrCreateWatchlistState();
    const eventsAll = this._getFromStorage('timeline_events');
    const events = state.event_ids
      .map(id => eventsAll.find(e => e.id === id) || null)
      .filter(e => !!e);
    return { watchlist_state: state, events };
  }

  // getCharacterFilterOptions
  getCharacterFilterOptions() {
    const characters = this._getFromStorage('characters');
    const projectSet = new Set();
    for (const c of characters) {
      if (Array.isArray(c.project_affiliations)) {
        for (const p of c.project_affiliations) projectSet.add(p);
      }
    }
    const projects = Array.from(projectSet);
    const sort_options = [
      { key: 'name_a_to_z', label: 'Name  A to Z' },
      { key: 'name_z_to_a', label: 'Name  Z to A' }
    ];
    return { projects, sort_options };
  }

  // searchCharacters(filters, sort, page, pageSize)
  searchCharacters(filters, sort, page, pageSize) {
    let characters = this._getFromStorage('characters');

    if (filters && Array.isArray(filters.project_affiliations) && filters.project_affiliations.length) {
      const projFilter = filters.project_affiliations;
      characters = characters.filter(c =>
        Array.isArray(c.project_affiliations) && c.project_affiliations.some(p => projFilter.includes(p))
      );
    }

    const sortKey = sort || 'name_a_to_z';
    characters.sort((a, b) => {
      const na = (a.name || '').toLowerCase();
      const nb = (b.name || '').toLowerCase();
      if (sortKey === 'name_z_to_a') {
        if (na < nb) return 1;
        if (na > nb) return -1;
        return 0;
      }
      // default A-Z
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });

    const total = characters.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const items = characters.slice(start, start + ps);

    return { items, total, page: pg, pageSize: ps };
  }

  // getCharacterCompareState
  getCharacterCompareState() {
    const state = this._getOrCreateCharacterCompareState();
    const charactersAll = this._getFromStorage('characters');
    const characters = state.character_ids
      .map(id => charactersAll.find(c => c.id === id) || null)
      .filter(c => !!c);
    return { compare_state: state, characters };
  }

  // updateCharacterCompareSelection(characterId, operation)
  updateCharacterCompareSelection(characterId, operation) {
    const state = this._getOrCreateCharacterCompareState();
    let ids = state.character_ids || [];

    if (operation === 'clear_all') {
      ids = [];
    } else if (operation === 'add' && characterId) {
      if (!ids.includes(characterId)) {
        if (ids.length < 2) {
          ids.push(characterId);
        } else {
          // Keep first, replace second to maintain 2-slot behavior
          ids[1] = characterId;
        }
      }
    } else if (operation === 'remove' && characterId) {
      ids = ids.filter(id => id !== characterId);
    }

    state.character_ids = ids;
    state.updated_at = this._nowIso();
    this._saveCharacterCompareState(state);

    const charactersAll = this._getFromStorage('characters');
    const characters = ids
      .map(id => charactersAll.find(c => c.id === id) || null)
      .filter(c => !!c);

    return { compare_state: state, characters };
  }

  // getCharacterProfile(characterId)
  getCharacterProfile(characterId) {
    const characters = this._getFromStorage('characters');
    return characters.find(c => c.id === characterId) || null;
  }

  // setPrimaryContactCharacter(characterId)
  setPrimaryContactCharacter(characterId) {
    const characters = this._getFromStorage('characters');
    const updated_characters = [];
    let primary_contact = null;

    for (const c of characters) {
      if (c.id === characterId) {
        if (!c.is_primary_contact) {
          c.is_primary_contact = true;
          updated_characters.push(c);
        }
        primary_contact = c;
      } else if (c.is_primary_contact) {
        c.is_primary_contact = false;
        updated_characters.push(c);
      }
    }

    this._saveToStorage('characters', characters);
    return { primary_contact, updated_characters };
  }

  // getAnomalyMapFilterOptions
  getAnomalyMapFilterOptions() {
    const locations = this._getFromStorage('anomaly_locations');
    const levels = locations.map(l => l.anomaly_level).filter(v => typeof v === 'number');
    const anomaly_level_min = levels.length ? Math.min(...levels) : null;
    const anomaly_level_max = levels.length ? Math.max(...levels) : null;

    const regions = [
      { key: 'europe', label: 'Europe' },
      { key: 'north_america', label: 'North America' },
      { key: 'south_america', label: 'South America' },
      { key: 'asia', label: 'Asia' },
      { key: 'africa', label: 'Africa' },
      { key: 'oceania', label: 'Oceania' },
      { key: 'antarctica', label: 'Antarctica' },
      { key: 'other', label: 'Other' }
    ];

    const sort_options = [
      { key: 'anomaly_level_high_to_low', label: 'Anomaly Level  High to Low' },
      { key: 'anomaly_level_low_to_high', label: 'Anomaly Level  Low to High' }
    ];

    return {
      regions,
      anomaly_level_min,
      anomaly_level_max,
      supports_stabilized_filter: true,
      sort_options
    };
  }

  // searchAnomalyLocations(filters, sort, page, pageSize)
  searchAnomalyLocations(filters, sort, page, pageSize) {
    let locations = this._getFromStorage('anomaly_locations');

    if (filters) {
      if (filters.region) {
        locations = locations.filter(l => l.region === filters.region);
      }
      if (typeof filters.min_anomaly_level === 'number') {
        locations = locations.filter(l => typeof l.anomaly_level === 'number' && l.anomaly_level >= filters.min_anomaly_level);
      }
      if (typeof filters.max_anomaly_level === 'number') {
        locations = locations.filter(l => typeof l.anomaly_level === 'number' && l.anomaly_level <= filters.max_anomaly_level);
      }
      if (filters.include_stabilized === false) {
        locations = locations.filter(l => l.is_stabilized !== true);
      }
      if (filters.status) {
        locations = locations.filter(l => l.status === filters.status);
      }
    }

    const sortKey = sort || 'anomaly_level_high_to_low';
    locations.sort((a, b) => {
      const la = a.anomaly_level || 0;
      const lb = b.anomaly_level || 0;
      if (sortKey === 'anomaly_level_low_to_high') return la - lb;
      return lb - la;
    });

    const total = locations.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 50;
    const start = (pg - 1) * ps;
    const items = locations.slice(start, start + ps);

    return { items, total, page: pg, pageSize: ps };
  }

  // getAnomalyLocationDetail(locationId)
  getAnomalyLocationDetail(locationId) {
    const locations = this._getFromStorage('anomaly_locations');
    return locations.find(l => l.id === locationId) || null;
  }

  // getCaseFilesList
  getCaseFilesList() {
    return this._getFromStorage('case_files');
  }

  // createCaseFileAndAddLocation(name, description, locationId)
  createCaseFileAndAddLocation(name, description, locationId) {
    const case_files = this._getFromStorage('case_files');
    const links = this._getFromStorage('case_file_location_links');

    const case_file = {
      id: this._generateId('case_file'),
      name,
      description: description || '',
      created_at: this._nowIso(),
      notes: null
    };
    case_files.push(case_file);
    this._saveToStorage('case_files', case_files);

    const link = {
      id: this._generateId('case_file_location_link'),
      case_file_id: case_file.id,
      anomaly_location_id: locationId,
      added_at: this._nowIso()
    };
    links.push(link);
    this._saveToStorage('case_file_location_links', links);

    return { case_file, link };
  }

  // addLocationToCaseFile(caseFileId, locationId)
  addLocationToCaseFile(caseFileId, locationId) {
    const links = this._getFromStorage('case_file_location_links');
    const link = {
      id: this._generateId('case_file_location_link'),
      case_file_id: caseFileId,
      anomaly_location_id: locationId,
      added_at: this._nowIso()
    };
    links.push(link);
    this._saveToStorage('case_file_location_links', links);
    return link;
  }

  // getVideoFilterOptions
  getVideoFilterOptions() {
    const videos = this._getFromStorage('videos');
    const tags = [];
    const durations = [];

    for (const v of videos) {
      if (Array.isArray(v.tags)) {
        for (const t of v.tags) tags.push(t);
      }
      if (typeof v.duration_seconds === 'number') durations.push(v.duration_seconds);
    }

    const min_duration_seconds = durations.length ? Math.min(...durations) : null;
    const max_duration_seconds = durations.length ? Math.max(...durations) : null;

    const sort_options = [
      { key: 'published_newest_first', label: 'Published  Newest First' },
      { key: 'published_oldest_first', label: 'Published  Oldest First' },
      { key: 'duration_short_to_long', label: 'Duration  Short to Long' },
      { key: 'duration_long_to_short', label: 'Duration  Long to Short' }
    ];

    return { tags: this._uniqueArray(tags), min_duration_seconds, max_duration_seconds, sort_options };
  }

  // searchVideos(filters, sort, page, pageSize)
  searchVideos(filters, sort, page, pageSize) {
    let videos = this._getFromStorage('videos');

    if (filters) {
      if (Array.isArray(filters.tags) && filters.tags.length) {
        const tFilter = filters.tags;
        videos = videos.filter(v => Array.isArray(v.tags) && v.tags.some(t => tFilter.includes(t)));
      }
      if (typeof filters.max_duration_seconds === 'number') {
        videos = videos.filter(v => typeof v.duration_seconds === 'number' && v.duration_seconds <= filters.max_duration_seconds);
      }
    }

    const sortKey = sort || 'published_newest_first';
    videos.sort((a, b) => {
      const da = this._parseDate(a.published_at);
      const db = this._parseDate(b.published_at);
      switch (sortKey) {
        case 'published_oldest_first':
          return da - db;
        case 'duration_short_to_long':
          return (a.duration_seconds || 0) - (b.duration_seconds || 0);
        case 'duration_long_to_short':
          return (b.duration_seconds || 0) - (a.duration_seconds || 0);
        case 'published_newest_first':
        default:
          return db - da;
      }
    });

    const total = videos.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const items = videos.slice(start, start + ps);

    return { items, total, page: pg, pageSize: ps };
  }

  // getVideoDetail(videoId)
  getVideoDetail(videoId) {
    const videos = this._getFromStorage('videos');
    return videos.find(v => v.id === videoId) || null;
  }

  // getUserPlaylists
  getUserPlaylists() {
    return this._getFromStorage('playlists');
  }

  // addVideoToPlaylist(playlistId, videoId)
  addVideoToPlaylist(playlistId, videoId) {
    const playlist_items = this._getFromStorage('playlist_items');
    const item = {
      id: this._generateId('playlist_item'),
      playlist_id: playlistId,
      video_id: videoId,
      added_at: this._nowIso()
    };
    playlist_items.push(item);
    this._saveToStorage('playlist_items', playlist_items);
    return item;
  }

  // addVideoToWatchLater(videoId)
  addVideoToWatchLater(videoId) {
    const playlist = this._getOrCreatePlaylistBySystemType('watch_later');
    const playlist_items = this._getFromStorage('playlist_items');

    const playlist_item = {
      id: this._generateId('playlist_item'),
      playlist_id: playlist.id,
      video_id: videoId,
      added_at: this._nowIso()
    };

    playlist_items.push(playlist_item);
    this._saveToStorage('playlist_items', playlist_items);

    return { playlist, playlist_item };
  }

  // getVideoComments(videoId)
  getVideoComments(videoId) {
    const comments = this._getFromStorage('video_comments').filter(c => c.video_id === videoId);
    const videos = this._getFromStorage('videos');
    return comments.map(c => ({
      ...c,
      video: videos.find(v => v.id === c.video_id) || null
    }));
  }

  // postVideoComment(videoId, text)
  postVideoComment(videoId, text) {
    const comments = this._getFromStorage('video_comments');
    const comment = {
      id: this._generateId('video_comment'),
      video_id: videoId,
      text,
      created_at: this._nowIso()
    };
    comments.push(comment);
    this._saveToStorage('video_comments', comments);
    return comment;
  }

  // getRecruitmentContent
  getRecruitmentContent() {
    return {
      intro_title: 'Your Curiosity Is Already On File',
      intro_body:
        'The Initiative is not hiring. It is recruiting those who have already demonstrated an unhealthy interest in the impossible. The form below determines where to point you when things go wrong.',
      preferred_roles: [
        { value: 'field_investigator', label: 'Field Investigator' },
        { value: 'analyst', label: 'Signal Analyst' },
        { value: 'handler', label: 'Handler' },
        { value: 'operative', label: 'Operative' },
        { value: 'other', label: 'Other / Undefined' }
      ],
      primary_regions: [
        { value: 'north_america', label: 'North America' },
        { value: 'europe', label: 'Europe' },
        { value: 'south_america', label: 'South America' },
        { value: 'asia', label: 'Asia' },
        { value: 'africa', label: 'Africa' },
        { value: 'oceania', label: 'Oceania' },
        { value: 'antarctica', label: 'Antarctica' },
        { value: 'other', label: 'Other' }
      ],
      risk_tolerance_options: [
        { value: 'low', label: 'Low', slider_position: 0 },
        { value: 'medium', label: 'Medium', slider_position: 1 },
        { value: 'high', label: 'High', slider_position: 2 }
      ],
      contact_frequency_options: [
        { value: 'once_per_week', label: 'Once per week' },
        { value: 'daily', label: 'Daily' },
        { value: 'twice_per_week', label: 'Twice per week' },
        { value: 'once_per_month', label: 'Once per month' },
        { value: 'never', label: 'Never (we will ignore this)' }
      ]
    };
  }

  // submitRecruitmentProfile(codename, preferred_role, primary_region, risk_tolerance, contact_frequency, email)
  submitRecruitmentProfile(codename, preferred_role, primary_region, risk_tolerance, contact_frequency, email) {
    const profiles = this._getFromStorage('recruitment_profiles');
    const profile = {
      id: this._generateId('recruitment_profile'),
      codename,
      preferred_role,
      primary_region,
      risk_tolerance,
      contact_frequency,
      email,
      status: 'submitted',
      created_at: this._nowIso()
    };
    profiles.push(profile);
    this._saveToStorage('recruitment_profiles', profiles);

    return {
      profile,
      message: 'Profile submitted. The Initiative will contact you if and when you are already involved.'
    };
  }

  // getIncidentLogFilterOptions
  getIncidentLogFilterOptions() {
    const logs = this._getFromStorage('incident_logs');
    const threatSet = new Set();
    const dates = [];

    for (const l of logs) {
      if (typeof l.threat_level === 'number') threatSet.add(l.threat_level);
      if (l.date) dates.push(l.date);
    }

    const threat_levels = Array.from(threatSet).sort((a, b) => a - b);

    let min_date = null;
    let max_date = null;
    if (dates.length) {
      const parsed = dates.map(d => this._parseDate(d));
      const min = new Date(Math.min.apply(null, parsed));
      const max = new Date(Math.max.apply(null, parsed));
      min_date = min.toISOString();
      max_date = max.toISOString();
    }

    const sort_options = [
      { key: 'threat_level_low_to_high', label: 'Threat Level  Low to High' },
      { key: 'threat_level_high_to_low', label: 'Threat Level  High to Low' },
      { key: 'date_newest_first', label: 'Date  Newest First' },
      { key: 'date_oldest_first', label: 'Date  Oldest First' }
    ];

    return { threat_levels, min_date, max_date, sort_options };
  }

  // searchIncidentLogs(query, filters, sort, page, pageSize)
  searchIncidentLogs(query, filters, sort, page, pageSize) {
    let logs = this._getFromStorage('incident_logs');

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      logs = logs.filter(l => {
        const inTitle = (l.title || '').toLowerCase().includes(q);
        const inContent = (l.content || '').toLowerCase().includes(q);
        const inTags = Array.isArray(l.tags) && l.tags.some(t => String(t).toLowerCase().includes(q));
        const inSearch = Array.isArray(l.search_terms) && l.search_terms.some(t => String(t).toLowerCase().includes(q));
        return inTitle || inContent || inTags || inSearch;
      });
    }

    if (filters) {
      if (Array.isArray(filters.threat_levels) && filters.threat_levels.length) {
        const allowed = filters.threat_levels;
        logs = logs.filter(l => allowed.includes(l.threat_level));
      }
      if (filters.start_date) {
        const start = new Date(filters.start_date + 'T00:00:00Z');
        logs = logs.filter(l => this._parseDate(l.date) >= start);
      }
      if (filters.end_date) {
        const end = new Date(filters.end_date + 'T23:59:59Z');
        logs = logs.filter(l => this._parseDate(l.date) <= end);
      }
    }

    const sortKey = sort || 'date_newest_first';
    logs.sort((a, b) => {
      const da = this._parseDate(a.date);
      const db = this._parseDate(b.date);
      switch (sortKey) {
        case 'threat_level_low_to_high':
          return (a.threat_level || 0) - (b.threat_level || 0);
        case 'threat_level_high_to_low':
          return (b.threat_level || 0) - (a.threat_level || 0);
        case 'date_oldest_first':
          return da - db;
        case 'date_newest_first':
        default:
          return db - da;
      }
    });

    const total = logs.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const items = logs.slice(start, start + ps);

    return { items, total, page: pg, pageSize: ps };
  }

  // getIncidentLogDetail(incidentLogId)
  getIncidentLogDetail(incidentLogId) {
    const logs = this._getFromStorage('incident_logs');
    return logs.find(l => l.id === incidentLogId) || null;
  }

  // addIncidentLogToReadingQueue(incidentLogId)
  addIncidentLogToReadingQueue(incidentLogId) {
    const logs = this._getFromStorage('incident_logs');
    const log = logs.find(l => l.id === incidentLogId) || null;
    const state = this._getOrCreateReadingQueueState();

    if (log && !state.incident_log_ids.includes(incidentLogId)) {
      state.incident_log_ids.push(incidentLogId);
      state.updated_at = this._nowIso();
      this._saveReadingQueueState(state);
    }

    return { reading_queue_state: state, added_log: log };
  }

  // getReadingQueueState
  getReadingQueueState() {
    const state = this._getOrCreateReadingQueueState();
    const logsAll = this._getFromStorage('incident_logs');
    const incident_logs = state.incident_log_ids
      .map(id => logsAll.find(l => l.id === id) || null)
      .filter(l => !!l);
    return { reading_queue_state: state, incident_logs };
  }

  // getSignalFilterOptions
  getSignalFilterOptions() {
    const timeframe_options = [
      { key: 'last_24_hours', label: 'Last 24 hours' },
      { key: 'last_7_days', label: 'Last 7 days' },
      { key: 'last_30_days', label: 'Last 30 days' }
    ];

    const sort_options = [
      { key: 'top', label: 'Top' },
      { key: 'newest_first', label: 'Newest First' }
    ];

    return { timeframe_options, sort_options };
  }

  // searchSignals(filters, sort, page, pageSize)
  searchSignals(filters, sort, page, pageSize) {
    let signals = this._getFromStorage('signals');

    if (filters) {
      if (filters.timeframe) {
        const now = Date.now();
        let deltaMs = null;
        if (filters.timeframe === 'last_24_hours') deltaMs = 24 * 60 * 60 * 1000;
        else if (filters.timeframe === 'last_7_days') deltaMs = 7 * 24 * 60 * 60 * 1000;
        else if (filters.timeframe === 'last_30_days') deltaMs = 30 * 24 * 60 * 60 * 1000;

        if (deltaMs != null) {
          const cutoff = now - deltaMs;
          signals = signals.filter(s => {
            const d = this._parseDate(s.created_at);
            return d && d.getTime() >= cutoff && d.getTime() <= now;
          });
        }
      }
      if (Array.isArray(filters.tags) && filters.tags.length) {
        const tFilter = filters.tags;
        signals = signals.filter(s => Array.isArray(s.tags) && s.tags.some(t => tFilter.includes(t)));
      }
    }

    const sortKey = sort || 'newest_first';
    signals.sort((a, b) => {
      switch (sortKey) {
        case 'top':
          return (b.score || 0) - (a.score || 0);
        case 'newest_first':
        default: {
          const da = this._parseDate(a.created_at);
          const db = this._parseDate(b.created_at);
          return db - da;
        }
      }
    });

    const total = signals.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const items = signals.slice(start, start + ps);

    return { items, total, page: pg, pageSize: ps };
  }

  // getClueDetail(clue_type, clueId)
  getClueDetail(clue_type, clueId) {
    if (clue_type === 'signal') {
      const signals = this._getFromStorage('signals');
      const signal = signals.find(s => s.id === clueId) || null;
      return { clue_type: 'signal', signal, cipher: null };
    }
    if (clue_type === 'cipher') {
      const ciphers = this._getFromStorage('ciphers');
      const cipher = ciphers.find(c => c.id === clueId) || null;
      return { clue_type: 'cipher', signal: null, cipher };
    }
    return { clue_type, signal: null, cipher: null };
  }

  // getCipherFilterOptions
  getCipherFilterOptions() {
    const difficulty_options = [
      { value: 'easy', label: 'Easy' },
      { value: 'medium', label: 'Medium' },
      { value: 'hard', label: 'Hard' }
    ];

    const sort_options = [
      { key: 'created_newest_first', label: 'Created  Newest First' },
      { key: 'created_oldest_first', label: 'Created  Oldest First' }
    ];

    return { difficulty_options, sort_options };
  }

  // searchCiphers(filters, sort, page, pageSize)
  searchCiphers(filters, sort, page, pageSize) {
    let ciphers = this._getFromStorage('ciphers');

    if (filters && filters.difficulty) {
      ciphers = ciphers.filter(c => c.difficulty === filters.difficulty);
    }

    const sortKey = sort || 'created_newest_first';
    ciphers.sort((a, b) => {
      const da = this._parseDate(a.created_at);
      const db = this._parseDate(b.created_at);
      if (sortKey === 'created_oldest_first') return da - db;
      return db - da;
    });

    const total = ciphers.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const items = ciphers.slice(start, start + ps);

    return { items, total, page: pg, pageSize: ps };
  }

  // addClueToTheoryBoard(clue_type, clueId)
  addClueToTheoryBoard(clue_type, clueId) {
    const board_clues = this._getFromStorage('board_clues');
    const clue = {
      id: this._generateId('board_clue'),
      clue_type,
      clue_id: clueId,
      added_at: this._nowIso()
    };
    board_clues.push(clue);
    this._saveToStorage('board_clues', board_clues);
    return clue;
  }

  // getTheoryBoardState
  getTheoryBoardState() {
    const { board_clues, theories } = this._getOrCreateTheoryBoardState();
    const signalsAll = this._getFromStorage('signals');
    const ciphersAll = this._getFromStorage('ciphers');

    const signalIds = this._uniqueArray(
      board_clues.filter(b => b.clue_type === 'signal').map(b => b.clue_id)
    );
    const cipherIds = this._uniqueArray(
      board_clues.filter(b => b.clue_type === 'cipher').map(b => b.clue_id)
    );

    const resolved_signals = signalsAll.filter(s => signalIds.includes(s.id));
    const resolved_ciphers = ciphersAll.filter(c => cipherIds.includes(c.id));

    return { board_clues, resolved_signals, resolved_ciphers, theories };
  }

  // createTheory(title, description, clueIds)
  createTheory(title, description, clueIds) {
    const theories = this._getFromStorage('theories');
    const theory = {
      id: this._generateId('theory'),
      title,
      description: description || '',
      clue_ids: Array.isArray(clueIds) ? clueIds : [],
      created_at: this._nowIso()
    };
    theories.push(theory);
    this._saveToStorage('theories', theories);
    return theory;
  }

  // getTheoryList
  getTheoryList() {
    return this._getFromStorage('theories');
  }

  // getTheoryDetail(theoryId)
  getTheoryDetail(theoryId) {
    const theories = this._getFromStorage('theories');
    const board_clues_all = this._getFromStorage('board_clues');
    const signalsAll = this._getFromStorage('signals');
    const ciphersAll = this._getFromStorage('ciphers');

    const theory = theories.find(t => t.id === theoryId) || null;
    if (!theory) {
      return { theory: null, board_clues: [], signals: [], ciphers: [] };
    }

    const board_clues = board_clues_all.filter(b => theory.clue_ids.includes(b.id));
    const signalIds = this._uniqueArray(
      board_clues.filter(b => b.clue_type === 'signal').map(b => b.clue_id)
    );
    const cipherIds = this._uniqueArray(
      board_clues.filter(b => b.clue_type === 'cipher').map(b => b.clue_id)
    );

    const signals = signalsAll.filter(s => signalIds.includes(s.id));
    const ciphers = ciphersAll.filter(c => cipherIds.includes(c.id));

    return { theory, board_clues, signals, ciphers };
  }

  // getArtifactFilterOptions
  getArtifactFilterOptions() {
    const artifacts = this._getFromStorage('artifacts');
    const originSet = new Set();
    const risks = [];

    for (const a of artifacts) {
      if (a.origin) originSet.add(a.origin);
      if (typeof a.corruption_risk === 'number') risks.push(a.corruption_risk);
    }

    const origin_options = Array.from(originSet).map(o => ({
      value: o,
      label: this._humanizeEnum(o)
    }));

    const min_corruption_risk = risks.length ? Math.min(...risks) : null;
    const max_corruption_risk = risks.length ? Math.max(...risks) : null;

    const sort_options = [
      { key: 'risk_high_to_low', label: 'Risk  High to Low' },
      { key: 'risk_low_to_high', label: 'Risk  Low to High' },
      { key: 'discovered_newest_first', label: 'Discovered  Newest First' },
      { key: 'discovered_oldest_first', label: 'Discovered  Oldest First' }
    ];

    return { origin_options, min_corruption_risk, max_corruption_risk, sort_options };
  }

  // searchArtifacts(filters, sort, view_mode, page, pageSize)
  searchArtifacts(filters, sort, view_mode, page, pageSize) {
    let artifacts = this._getFromStorage('artifacts');

    if (filters) {
      if (filters.origin) {
        artifacts = artifacts.filter(a => a.origin === filters.origin);
      }
      if (typeof filters.max_corruption_risk === 'number') {
        artifacts = artifacts.filter(
          a => typeof a.corruption_risk === 'number' && a.corruption_risk <= filters.max_corruption_risk
        );
      }
    }

    const sortKey = sort || 'risk_high_to_low';
    artifacts.sort((a, b) => {
      switch (sortKey) {
        case 'risk_low_to_high':
          return (a.corruption_risk || 0) - (b.corruption_risk || 0);
        case 'discovered_newest_first': {
          const da = this._parseDate(a.discovered_at);
          const db = this._parseDate(b.discovered_at);
          return db - da;
        }
        case 'discovered_oldest_first': {
          const da = this._parseDate(a.discovered_at);
          const db = this._parseDate(b.discovered_at);
          return da - db;
        }
        case 'risk_high_to_low':
        default:
          return (b.corruption_risk || 0) - (a.corruption_risk || 0);
      }
    });

    const total = artifacts.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 50;
    const start = (pg - 1) * ps;
    const items = artifacts.slice(start, start + ps);

    // view_mode is not stored; it is for UI only, so we ignore it here.

    return { items, total, page: pg, pageSize: ps };
  }

  // bulkUpdateArtifactPriority(artifactIds, priority)
  bulkUpdateArtifactPriority(artifactIds, priority) {
    const artifacts = this._getFromStorage('artifacts');
    const updated = [];

    if (Array.isArray(artifactIds)) {
      for (const id of artifactIds) {
        const art = artifacts.find(a => a.id === id);
        if (art && art.priority !== priority) {
          art.priority = priority;
          updated.push(art);
        }
      }
      this._saveToStorage('artifacts', artifacts);
    }

    return updated;
  }

  // getAboutContent
  getAboutContent() {
    return {
      title: 'ABOUT THE INITIATIVE',
      sections: [
        {
          heading: 'This Is Not Real. It Will Still Follow You.',
          body:
            'The Initiative is a fictional organization monitoring impossible phenomena across a fractured timeline. This site is a teaser for an alternate reality game: a story told through interfaces, logs, and your own paranoia.'
        },
        {
          heading: 'How To Read The Static',
          body:
            'Every section of this site is a surface for clues: Transmission Logs hide passphrases, the Timeline buries glitch events, the Anomaly Map pins unstable sites, and the Theory Board lets you connect what no one else has noticed.'
        },
        {
          heading: 'Who Built This?',
          body:
            'Writers, developers, and strange collaborators who enjoy building haunted interfaces. Any resemblance to real agencies, organizations, or events is a coincidence produced by pattern-seeking human brains.'
        }
      ],
      safety_notes:
        'This experience is single-user, browser-based, and entirely fictional. It does not access your real-world systems, microphones, cameras, or accounts. You are encouraged to take breaks, close the tab, and remember that the only thing looking back at you from the screen is reflected light.'
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
