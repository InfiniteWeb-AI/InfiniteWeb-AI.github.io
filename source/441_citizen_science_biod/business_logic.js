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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensureKey('species', []);
    ensureKey('observations', []);
    ensureKey('places', []);
    ensureKey('projects', []);
    ensureKey('project_memberships', []);
    ensureKey('observation_projects', []);
    ensureKey('bookmarks', []);
    ensureKey('watchlists', []);
    ensureKey('watchlist_items', []);
    ensureKey('species_follows', []);
    ensureKey('hotspots', []);
    ensureKey('hotspot_subscriptions', []);
    ensureKey('explore_states', []);
    ensureKey('observation_form_states', []);

    // Content / config tables
    ensureKey('about_content', {});
    ensureKey('help_faq_content', {});
    ensureKey('contact_config', {});
    ensureKey('contact_messages', []);
    ensureKey('terms_of_use_content', {});
    ensureKey('privacy_policy_content', {});

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _enumToLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) {
      return Infinity;
    }
    const toRad = d => (d * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _getObservationTaxonGroup(observation, speciesMap) {
    if (!observation) return 'unknown';
    if (observation.taxon_group) return observation.taxon_group;
    const species = observation.species_id ? speciesMap[observation.species_id] : null;
    return (species && species.taxon_group) || 'unknown';
  }

  // ---------------------- Internal Helpers (from spec) ----------------------

  _getOrCreateExploreState(view) {
    const states = this._getFromStorage('explore_states', []);
    let state = states.find(s => s.view === view);
    if (!state) {
      state = {
        id: this._generateId('explore_state'),
        view: view,
        selected_place_id: null,
        date_from: null,
        date_to: null,
        species_group: null,
        min_count: null,
        radius_km: null
      };
      states.push(state);
      this._saveToStorage('explore_states', states);
    }
    return state;
  }

  _applyProjectDefaultsToObservationForm(observationDraft, projectMembership) {
    if (!observationDraft || !projectMembership) return observationDraft;
    if (!observationDraft.geoprivacy && projectMembership.default_geoprivacy) {
      observationDraft.geoprivacy = projectMembership.default_geoprivacy;
    }
    if (!observationDraft.habitat_type && projectMembership.default_habitat_type) {
      observationDraft.habitat_type = projectMembership.default_habitat_type;
    }
    return observationDraft;
  }

  _mapObservationToSummary(observation, speciesMap) {
    const species = observation.species_id ? speciesMap[observation.species_id] : null;
    const taxonGroup = this._getObservationTaxonGroup(observation, speciesMap);
    return {
      observation_id: observation.id,
      species_common_name: species ? species.common_name : null,
      species_scientific_name: species ? species.scientific_name : null,
      taxon_group: taxonGroup,
      observation_datetime: observation.observation_datetime,
      location_name: observation.location_name || null,
      individual_count: typeof observation.individual_count === 'number' ? observation.individual_count : null,
      abundance_category: observation.abundance_category || null,
      status: observation.status || 'unreviewed'
    };
  }

  _computeHotspotSpeciesTotalForDateRange(hotspot, date_from, date_to) {
    if (!hotspot || !Array.isArray(hotspot.yearly_species_counts)) {
      return { total: 0, breakdown: [] };
    }
    if (!date_from && !date_to) {
      const total = hotspot.yearly_species_counts.reduce(
        (sum, y) => sum + (typeof y.total_species === 'number' ? y.total_species : 0),
        0
      );
      return { total, breakdown: hotspot.yearly_species_counts.slice() };
    }
    const fromYear = date_from ? new Date(date_from).getFullYear() : null;
    const toYear = date_to ? new Date(date_to).getFullYear() : null;
    const breakdown = hotspot.yearly_species_counts.filter(y => {
      if (typeof y.year !== 'number') return false;
      if (fromYear !== null && y.year < fromYear) return false;
      if (toYear !== null && y.year > toYear) return false;
      return true;
    });
    const total = breakdown.reduce(
      (sum, y) => sum + (typeof y.total_species === 'number' ? y.total_species : 0),
      0
    );
    return { total, breakdown };
  }

  // ---------------------- Core Interface Implementations ----------------------

  // 1. getHomePageSummary
  getHomePageSummary() {
    const observations = this._getFromStorage('observations', []);
    const projects = this._getFromStorage('projects', []);
    const places = this._getFromStorage('places', []);

    const total_observations = observations.length;
    const speciesIds = new Set();
    observations.forEach(o => {
      if (o.species_id) speciesIds.add(o.species_id);
    });
    const total_species = speciesIds.size;

    const now = new Date();
    const active_projects = projects.filter(p => {
      const startOk = !p.start_date || new Date(p.start_date) <= now;
      const endOk = !p.end_date || new Date(p.end_date) >= now;
      return startOk && endOk;
    });
    const active_projects_count = active_projects.length;

    const featured_projects_raw = projects.filter(p => p.is_featured);
    const placeMap = {};
    places.forEach(pl => {
      placeMap[pl.id] = pl;
    });
    const featured_projects = featured_projects_raw.map(p => ({
      ...p,
      place: p.place_id ? placeMap[p.place_id] || null : null
    }));

    return {
      stats: {
        total_observations,
        total_species,
        active_projects_count
      },
      featured_projects
    };
  }

  // 2. initObservationForm
  initObservationForm(mode, entry_mode, observation_id) {
    const normalizedMode = mode === 'edit' ? 'edit' : 'new';
    const normalizedEntryMode = entry_mode === 'map' ? 'map' : 'form';

    const observations = this._getFromStorage('observations', []);
    let observation = null;
    if (normalizedMode === 'edit' && observation_id) {
      observation = observations.find(o => o.id === observation_id) || null;
    }

    const abundanceValues = [
      'single_individual',
      'two_to_nine_individuals',
      'ten_to_fifty_individuals',
      'over_fifty_individuals',
      'present_but_not_counted'
    ];
    const habitatValues = [
      'urban_lawn',
      'urban_garden',
      'forest',
      'grassland',
      'wetland',
      'street_side',
      'park',
      'other'
    ];
    const taxonValues = [
      'birds',
      'plants',
      'insects',
      'flowering_plants',
      'mammals',
      'reptiles',
      'amphibians',
      'fish',
      'fungi',
      'mollusks',
      'other_invertebrates',
      'other_plants',
      'unknown'
    ];
    const populationValues = [
      'unknown',
      'casual',
      'established_population',
      'increasing',
      'decreasing',
      'eradicated',
      'managed_population'
    ];
    const geoprivacyValues = ['open', 'obscured', 'private'];

    const projects = this._getFromStorage('projects', []);
    const memberships = this._getFromStorage('project_memberships', []);
    const project_options = projects.map(p => {
      const membership = memberships.find(m => m.project_id === p.id && m.is_active);
      return {
        project_id: p.id,
        project_name: p.name,
        is_member: !!membership,
        default_geoprivacy: membership ? membership.default_geoprivacy || null : null,
        default_habitat_type: membership ? membership.default_habitat_type || null : null
      };
    });

    const dropdown_options = {
      abundance_categories: abundanceValues.map(v => ({ value: v, label: this._enumToLabel(v) })),
      habitat_types: habitatValues.map(v => ({ value: v, label: this._enumToLabel(v) })),
      taxon_groups: taxonValues.map(v => ({ value: v, label: this._enumToLabel(v) })),
      population_statuses: populationValues.map(v => ({ value: v, label: this._enumToLabel(v) })),
      geoprivacy_options: geoprivacyValues.map(v => ({ value: v, label: this._enumToLabel(v) })),
      project_options
    };

    // Track form state (simple implementation)
    const formStates = this._getFromStorage('observation_form_states', []);
    const state = {
      id: this._generateId('obs_form_state'),
      mode: normalizedMode,
      observation_id: observation ? observation.id : null
    };
    formStates.push(state);
    this._saveToStorage('observation_form_states', formStates);

    return {
      mode: normalizedMode,
      entry_mode: normalizedEntryMode,
      observation,
      dropdown_options
    };
  }

  // 3. searchSpeciesAutocomplete
  searchSpeciesAutocomplete(query, taxon_group) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    const species = this._getFromStorage('species', []);
    return species.filter(s => {
      if (taxon_group && s.taxon_group !== taxon_group) return false;
      const nameMatch = (s.common_name || '').toLowerCase().includes(q);
      const sciMatch = (s.scientific_name || '').toLowerCase().includes(q);
      return nameMatch || sciMatch;
    });
  }

  // 4. searchPlacesAutocomplete
  searchPlacesAutocomplete(query, place_types) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    const places = this._getFromStorage('places', []);
    const filterByTypes = Array.isArray(place_types) && place_types.length > 0;
    return places.filter(p => {
      if (filterByTypes && !place_types.includes(p.place_type)) return false;
      return (p.name || '').toLowerCase().includes(q);
    });
  }

  // 5. saveObservation
  saveObservation(observation) {
    const input = observation || {};
    const observations = this._getFromStorage('observations', []);
    const observationProjects = this._getFromStorage('observation_projects', []);
    const memberships = this._getFromStorage('project_memberships', []);

    const nowIso = new Date().toISOString();
    const isUpdate = !!input.id;

    let existingIndex = -1;
    let existing = null;
    if (isUpdate) {
      existingIndex = observations.findIndex(o => o.id === input.id);
      if (existingIndex === -1) {
        return { success: false, message: 'Observation not found', observation: null };
      }
      existing = observations[existingIndex];
    }

    if (!isUpdate && !input.observation_datetime) {
      return { success: false, message: 'observation_datetime is required', observation: null };
    }

    let newObservation = isUpdate ? { ...existing } : { id: this._generateId('obs') };

    const assignIfDefined = (field) => {
      if (Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined) {
        newObservation[field] = input[field];
      }
    };

    assignIfDefined('species_id');
    if (input.observation_datetime) {
      newObservation.observation_datetime = input.observation_datetime;
    } else if (!isUpdate) {
      newObservation.observation_datetime = nowIso;
    }
    assignIfDefined('location_name');
    assignIfDefined('place_id');
    assignIfDefined('latitude');
    assignIfDefined('longitude');
    assignIfDefined('location_accuracy_meters');
    assignIfDefined('geoprivacy');
    assignIfDefined('individual_count');
    assignIfDefined('abundance_category');
    assignIfDefined('habitat_type');
    assignIfDefined('taxon_group');
    assignIfDefined('tags');
    assignIfDefined('population_status');

    if (Object.prototype.hasOwnProperty.call(input, 'requires_urgent_review')) {
      newObservation.requires_urgent_review = !!input.requires_urgent_review;
    } else if (!isUpdate) {
      newObservation.requires_urgent_review = false;
    }

    if (!isUpdate) {
      newObservation.created_at = nowIso;
    } else if (!newObservation.created_at) {
      newObservation.created_at = existing.created_at || nowIso;
    }
    newObservation.updated_at = nowIso;

    // Status logic
    if (!isUpdate) {
      if (newObservation.species_id) {
        newObservation.status = 'identified';
      } else {
        newObservation.status = 'needs_id';
      }
    } else {
      const prevStatus = existing.status || 'unreviewed';
      if (!existing.species_id && newObservation.species_id && prevStatus === 'needs_id') {
        newObservation.status = 'identified';
      } else if (!prevStatus) {
        newObservation.status = newObservation.species_id ? 'identified' : 'needs_id';
      } else {
        newObservation.status = prevStatus;
      }
    }

    // Apply project defaults for new observation if applicable
    const project_ids = Array.isArray(input.project_ids) ? input.project_ids : [];
    if (!isUpdate && project_ids.length > 0) {
      const firstProjectId = project_ids[0];
      const membership = memberships.find(m => m.project_id === firstProjectId && m.is_active);
      this._applyProjectDefaultsToObservationForm(newObservation, membership);
    }

    // Persist observation
    if (isUpdate) {
      observations[existingIndex] = newObservation;
    } else {
      observations.push(newObservation);
    }
    this._saveToStorage('observations', observations);

    // Manage ObservationProject join records
    const updatedObservationProjects = observationProjects.filter(op => op.observation_id !== newObservation.id);
    project_ids.forEach(pid => {
      if (!pid) return;
      const join = {
        id: this._generateId('obsproj'),
        observation_id: newObservation.id,
        project_id: pid,
        added_at: nowIso
      };
      updatedObservationProjects.push(join);
    });
    this._saveToStorage('observation_projects', updatedObservationProjects);

    return {
      success: true,
      message: isUpdate ? 'Observation updated' : 'Observation created',
      observation: newObservation
    };
  }

  // 6. getSpeciesIdentificationSuggestions
  getSpeciesIdentificationSuggestions(observation_id) {
    const observations = this._getFromStorage('observations', []);
    const species = this._getFromStorage('species', []);
    const observation = observations.find(o => o.id === observation_id);
    if (!observation) return [];

    const taxonGroup = observation.taxon_group || null;
    let candidates = species;
    if (taxonGroup) {
      candidates = species.filter(s => s.taxon_group === taxonGroup);
      if (candidates.length === 0) {
        candidates = species;
      }
    }

    candidates.sort((a, b) => (b.total_observations_count || 0) - (a.total_observations_count || 0));

    const top = candidates.slice(0, 10);
    const maxCount = top.reduce((m, s) => Math.max(m, s.total_observations_count || 0), 0) || 1;

    return top.map((s, index) => ({
      species: s,
      confidence_score: (s.total_observations_count || 0) / maxCount,
      rank: index + 1
    }));
  }

  // 7. getExploreFilterOptions
  getExploreFilterOptions(view) {
    const v = view === 'species' || view === 'hotspots' ? view : 'observations';
    this._getOrCreateExploreState(v);

    const taxonValues = [
      'birds',
      'plants',
      'insects',
      'flowering_plants',
      'mammals',
      'reptiles',
      'amphibians',
      'fish',
      'fungi',
      'mollusks',
      'other_invertebrates',
      'other_plants',
      'unknown'
    ];

    const species_group_options = taxonValues.map(val => ({
      value: val,
      label: this._enumToLabel(val)
    }));

    const taxon_group_options = taxonValues.map(val => ({
      value: val,
      label: this._enumToLabel(val)
    }));

    const radius_options_km = [1, 5, 10, 25, 50];

    const today = new Date();
    const last7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const date_range_presets = [
      {
        id: 'last_7_days',
        label: 'Last 7 days',
        start_date: this._formatDate(last7),
        end_date: this._formatDate(today)
      },
      {
        id: 'last_30_days',
        label: 'Last 30 days',
        start_date: this._formatDate(last30),
        end_date: this._formatDate(today)
      },
      {
        id: 'this_year',
        label: 'This year',
        start_date: this._formatDate(startOfYear),
        end_date: this._formatDate(today)
      }
    ];

    return {
      species_group_options,
      taxon_group_options,
      radius_options_km,
      date_range_presets
    };
  }

  // 8. getExploreObservationResults
  getExploreObservationResults(filters) {
    const f = filters || {};
    const observations = this._getFromStorage('observations', []);
    const species = this._getFromStorage('species', []);
    const places = this._getFromStorage('places', []);

    const speciesMap = {};
    species.forEach(s => {
      speciesMap[s.id] = s;
    });

    const placeMap = {};
    places.forEach(p => {
      placeMap[p.id] = p;
    });

    const dateFrom = f.date_from ? new Date(f.date_from) : null;
    const dateTo = f.date_to ? new Date(f.date_to) : null;
    const selectedPlace = f.selected_place_id ? placeMap[f.selected_place_id] : null;
    const radiusKm = typeof f.radius_km === 'number' ? f.radius_km : null;
    const minCount = typeof f.min_count === 'number' ? f.min_count : null;
    const speciesGroupFilter = f.species_group || null;

    let filtered = observations.filter(o => {
      // Date filter
      if (dateFrom || dateTo) {
        const od = new Date(o.observation_datetime);
        if (dateFrom && od < dateFrom) return false;
        if (dateTo && od > dateTo) return false;
      }

      // Place / radius filter
      if (selectedPlace) {
        if (radiusKm && radiusKm > 0) {
          const dist = this._calculateDistanceKm(
            selectedPlace.latitude,
            selectedPlace.longitude,
            o.latitude,
            o.longitude
          );
          const inPlaceById = o.place_id && o.place_id === selectedPlace.id;
          if (!inPlaceById && dist > radiusKm) return false;
        } else {
          if (!o.place_id || o.place_id !== selectedPlace.id) return false;
        }
      }

      // Min count filter
      if (minCount !== null) {
        if (typeof o.individual_count !== 'number' || o.individual_count < minCount) {
          return false;
        }
      }

      // Species group / taxon group filter
      if (speciesGroupFilter) {
        const tg = this._getObservationTaxonGroup(o, speciesMap);
        if (tg !== speciesGroupFilter) return false;
      }

      return true;
    });

    const summaries = filtered.map(o => this._mapObservationToSummary(o, speciesMap));

    const total_count = summaries.length;
    const page = f.page && f.page > 0 ? f.page : 1;
    const page_size = f.page_size && f.page_size > 0 ? f.page_size : 20;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const results = summaries.slice(start, end);

    return {
      results,
      total_count,
      page,
      page_size,
      has_more: end < total_count
    };
  }

  // 9. getObservationDetail
  getObservationDetail(observation_id) {
    const observations = this._getFromStorage('observations', []);
    const species = this._getFromStorage('species', []);
    const places = this._getFromStorage('places', []);
    const observationProjects = this._getFromStorage('observation_projects', []);
    const projects = this._getFromStorage('projects', []);
    const bookmarks = this._getFromStorage('bookmarks', []);

    const observation = observations.find(o => o.id === observation_id);
    if (!observation) {
      return { observation: null, is_bookmarked: false };
    }

    const speciesMap = {};
    species.forEach(s => {
      speciesMap[s.id] = s;
    });
    const placeMap = {};
    places.forEach(p => {
      placeMap[p.id] = p;
    });
    const projectMap = {};
    projects.forEach(p => {
      projectMap[p.id] = p;
    });

    const obsSpecies = observation.species_id ? speciesMap[observation.species_id] || null : null;
    const obsPlace = observation.place_id ? placeMap[observation.place_id] || null : null;

    const projectLinks = observationProjects.filter(op => op.observation_id === observation.id);
    const projArray = projectLinks.map(link => {
      const proj = projectMap[link.project_id] || null;
      return {
        project_id: link.project_id,
        project_name: proj ? proj.name : null,
        project: proj
      };
    });

    const is_bookmarked = bookmarks.some(b => b.observation_id === observation.id);

    return {
      observation: {
        id: observation.id,
        species: obsSpecies,
        observation_datetime: observation.observation_datetime,
        location_name: observation.location_name || null,
        place: obsPlace,
        latitude: observation.latitude,
        longitude: observation.longitude,
        location_accuracy_meters: observation.location_accuracy_meters,
        geoprivacy: observation.geoprivacy || null,
        individual_count: observation.individual_count,
        abundance_category: observation.abundance_category || null,
        habitat_type: observation.habitat_type || null,
        taxon_group: observation.taxon_group || (obsSpecies ? obsSpecies.taxon_group : 'unknown'),
        tags: Array.isArray(observation.tags) ? observation.tags : [],
        population_status: observation.population_status || 'unknown',
        requires_urgent_review: !!observation.requires_urgent_review,
        status: observation.status || 'unreviewed',
        projects: projArray
      },
      is_bookmarked
    };
  }

  // 10. setObservationBookmarkStatus
  setObservationBookmarkStatus(observation_id, bookmarked) {
    const observations = this._getFromStorage('observations', []);
    const obs = observations.find(o => o.id === observation_id);
    if (!obs) {
      return { success: false, is_bookmarked: false, bookmark: null, message: 'Observation not found' };
    }

    const bookmarks = this._getFromStorage('bookmarks', []);
    const existingIndex = bookmarks.findIndex(b => b.observation_id === observation_id);
    const nowIso = new Date().toISOString();

    if (bookmarked) {
      if (existingIndex !== -1) {
        const existing = bookmarks[existingIndex];
        const enriched = { ...existing, observation: obs };
        return { success: true, is_bookmarked: true, bookmark: enriched, message: 'Already bookmarked' };
      }
      const bookmark = {
        id: this._generateId('bookmark'),
        observation_id,
        bookmarked_at: nowIso
      };
      bookmarks.push(bookmark);
      this._saveToStorage('bookmarks', bookmarks);
      const enriched = { ...bookmark, observation: obs };
      return { success: true, is_bookmarked: true, bookmark: enriched, message: 'Bookmarked' };
    } else {
      if (existingIndex !== -1) {
        bookmarks.splice(existingIndex, 1);
        this._saveToStorage('bookmarks', bookmarks);
      }
      return { success: true, is_bookmarked: false, bookmark: null, message: 'Bookmark removed' };
    }
  }

  // 11. getMyObservationFilterOptions
  getMyObservationFilterOptions() {
    const statusValues = ['needs_id', 'identified', 'research_grade', 'unreviewed', 'flagged'];
    const taxonValues = [
      'birds',
      'plants',
      'insects',
      'flowering_plants',
      'mammals',
      'reptiles',
      'amphibians',
      'fish',
      'fungi',
      'mollusks',
      'other_invertebrates',
      'other_plants',
      'unknown'
    ];

    const projects = this._getFromStorage('projects', []);
    const memberships = this._getFromStorage('project_memberships', []);
    const project_options = projects.map(p => {
      const membership = memberships.find(m => m.project_id === p.id && m.is_active);
      return {
        project_id: p.id,
        project_name: p.name,
        is_member: !!membership
      };
    });

    return {
      status_options: statusValues.map(v => ({ value: v, label: this._enumToLabel(v) })),
      taxon_group_options: taxonValues.map(v => ({ value: v, label: this._enumToLabel(v) })),
      project_options
    };
  }

  // 12. getMyObservations
  getMyObservations(filters) {
    const f = filters || {};
    const observations = this._getFromStorage('observations', []);
    const species = this._getFromStorage('species', []);
    const observationProjects = this._getFromStorage('observation_projects', []);

    const speciesMap = {};
    species.forEach(s => {
      speciesMap[s.id] = s;
    });

    const projectId = f.project_id || null;
    let obsIdsForProject = null;
    if (projectId) {
      obsIdsForProject = new Set(
        observationProjects
          .filter(op => op.project_id === projectId)
          .map(op => op.observation_id)
      );
    }

    const dateFrom = f.date_from ? new Date(f.date_from) : null;
    const dateTo = f.date_to ? new Date(f.date_to) : null;
    const statusFilter = f.status || null;
    const taxonFilter = f.taxon_group || null;

    let filtered = observations.filter(o => {
      if (statusFilter && o.status !== statusFilter) return false;

      if (dateFrom || dateTo) {
        const od = new Date(o.observation_datetime);
        if (dateFrom && od < dateFrom) return false;
        if (dateTo && od > dateTo) return false;
      }

      if (projectId && obsIdsForProject && !obsIdsForProject.has(o.id)) {
        return false;
      }

      if (taxonFilter) {
        const tg = this._getObservationTaxonGroup(o, speciesMap);
        if (tg !== taxonFilter) return false;
      }

      return true;
    });

    const summaries = filtered.map(o => {
      const sp = o.species_id ? speciesMap[o.species_id] || null : null;
      return {
        observation_id: o.id,
        species_common_name: sp ? sp.common_name : null,
        species_scientific_name: sp ? sp.scientific_name : null,
        taxon_group: this._getObservationTaxonGroup(o, speciesMap),
        observation_datetime: o.observation_datetime,
        location_name: o.location_name || null,
        status: o.status || 'unreviewed'
      };
    });

    const total_count = summaries.length;
    const page = f.page && f.page > 0 ? f.page : 1;
    const page_size = f.page_size && f.page_size > 0 ? f.page_size : 20;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const results = summaries.slice(start, end);

    return {
      results,
      total_count,
      page,
      page_size,
      has_more: end < total_count
    };
  }

  // 13. searchProjectsDirectory
  searchProjectsDirectory(filters) {
    const f = filters || {};
    const projects = this._getFromStorage('projects', []);
    const memberships = this._getFromStorage('project_memberships', []);
    const places = this._getFromStorage('places', []);

    const placeMap = {};
    places.forEach(p => {
      placeMap[p.id] = p;
    });

    const query = (f.query || '').trim().toLowerCase();
    const locationPlaceId = f.location_place_id || null;
    const isFeaturedOnly = !!f.is_featured_only;

    let filtered = projects.filter(p => {
      if (query) {
        const inName = (p.name || '').toLowerCase().includes(query);
        const inDesc = (p.description || '').toLowerCase().includes(query);
        if (!inName && !inDesc) return false;
      }
      if (locationPlaceId && p.place_id !== locationPlaceId) return false;
      if (isFeaturedOnly && !p.is_featured) return false;
      return true;
    });

    const page = f.page && f.page > 0 ? f.page : 1;
    const page_size = f.page_size && f.page_size > 0 ? f.page_size : 20;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const results = filtered.slice(start, end).map(p => {
      const membership = memberships.find(m => m.project_id === p.id && m.is_active);
      const place = p.place_id ? placeMap[p.place_id] || null : null;
      return {
        project_id: p.id,
        name: p.name,
        description: p.description || '',
        location_name: p.location_name || (place ? place.name : null),
        start_date: p.start_date || null,
        end_date: p.end_date || null,
        is_featured: !!p.is_featured,
        is_member: !!membership,
        project: p,
        membership: membership || null
      };
    });

    return {
      results,
      total_count: filtered.length,
      page,
      page_size
    };
  }

  // 14. getProjectDetail
  getProjectDetail(project_id) {
    const projects = this._getFromStorage('projects', []);
    const memberships = this._getFromStorage('project_memberships', []);
    const observationProjects = this._getFromStorage('observation_projects', []);

    const project = projects.find(p => p.id === project_id) || null;
    if (!project) {
      return {
        project: null,
        membership: null,
        stats: { total_observations: 0, total_participants: 0 }
      };
    }

    const membershipRaw = memberships.find(m => m.project_id === project_id && m.is_active) || null;
    const membership = membershipRaw
      ? { ...membershipRaw, project }
      : null;

    const total_observations = observationProjects.filter(op => op.project_id === project_id).length;
    const total_participants = membershipRaw && membershipRaw.is_active ? 1 : 0;

    return {
      project,
      membership,
      stats: {
        total_observations,
        total_participants
      }
    };
  }

  // 15. joinProject
  joinProject(project_id) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find(p => p.id === project_id);
    if (!project) {
      return { success: false, membership: null, message: 'Project not found' };
    }

    const memberships = this._getFromStorage('project_memberships', []);
    let membership = memberships.find(m => m.project_id === project_id);
    const nowIso = new Date().toISOString();

    if (membership) {
      membership.is_active = true;
      membership.joined_at = membership.joined_at || nowIso;
    } else {
      membership = {
        id: this._generateId('projmem'),
        project_id,
        joined_at: nowIso,
        default_geoprivacy: null,
        default_habitat_type: null,
        is_active: true
      };
      memberships.push(membership);
    }

    this._saveToStorage('project_memberships', memberships);
    const enriched = { ...membership, project };

    return { success: true, membership: enriched, message: 'Joined project' };
  }

  // 16. leaveProject
  leaveProject(project_id) {
    const memberships = this._getFromStorage('project_memberships', []);
    const membership = memberships.find(m => m.project_id === project_id && m.is_active);
    if (!membership) {
      return { success: false, message: 'Not a member of this project' };
    }
    membership.is_active = false;
    this._saveToStorage('project_memberships', memberships);
    return { success: true, message: 'Left project' };
  }

  // 17. updateProjectObservationSettings
  updateProjectObservationSettings(project_id, default_geoprivacy, default_habitat_type) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find(p => p.id === project_id);
    if (!project) {
      return { success: false, membership: null, message: 'Project not found' };
    }

    const memberships = this._getFromStorage('project_memberships', []);
    let membership = memberships.find(m => m.project_id === project_id);
    const nowIso = new Date().toISOString();

    if (!membership) {
      membership = {
        id: this._generateId('projmem'),
        project_id,
        joined_at: nowIso,
        default_geoprivacy: null,
        default_habitat_type: null,
        is_active: true
      };
      memberships.push(membership);
    }

    if (default_geoprivacy !== undefined) {
      membership.default_geoprivacy = default_geoprivacy;
    }
    if (default_habitat_type !== undefined) {
      membership.default_habitat_type = default_habitat_type;
    }

    this._saveToStorage('project_memberships', memberships);
    const enriched = { ...membership, project };

    return { success: true, membership: enriched, message: 'Project settings updated' };
  }

  // 18. getExploreSpeciesResults
  getExploreSpeciesResults(filters) {
    const f = filters || {};
    const species = this._getFromStorage('species', []);
    const observations = this._getFromStorage('observations', []);
    const places = this._getFromStorage('places', []);

    const placeMap = {};
    places.forEach(p => {
      placeMap[p.id] = p;
    });

    const dateFrom = f.date_from ? new Date(f.date_from) : null;
    const dateTo = f.date_to ? new Date(f.date_to) : null;
    const selectedPlace = f.selected_place_id ? placeMap[f.selected_place_id] : null;
    const taxonGroupFilter = f.taxon_group || null;

    const speciesMap = {};
    species.forEach(s => {
      speciesMap[s.id] = s;
    });

    // Filter observations according to date and place
    const filteredObs = observations.filter(o => {
      if (!o.species_id) return false;

      if (dateFrom || dateTo) {
        const od = new Date(o.observation_datetime);
        if (dateFrom && od < dateFrom) return false;
        if (dateTo && od > dateTo) return false;
      }

      if (selectedPlace) {
        const radiusKm = null; // species explore interface doesn't have radius; location is within-place
        if (radiusKm && radiusKm > 0) {
          const dist = this._calculateDistanceKm(
            selectedPlace.latitude,
            selectedPlace.longitude,
            o.latitude,
            o.longitude
          );
          const inPlaceById = o.place_id && o.place_id === selectedPlace.id;
          if (!inPlaceById && dist > radiusKm) return false;
        } else {
          if (!o.place_id || o.place_id !== selectedPlace.id) return false;
        }
      }

      if (taxonGroupFilter) {
        const tg = this._getObservationTaxonGroup(o, speciesMap);
        if (tg !== taxonGroupFilter) return false;
      }

      return true;
    });

    const counts = {};
    filteredObs.forEach(o => {
      if (!o.species_id) return;
      if (!counts[o.species_id]) counts[o.species_id] = 0;
      counts[o.species_id] += 1;
    });

    const resultsRaw = Object.keys(counts).map(speciesId => {
      const s = speciesMap[speciesId];
      if (!s) return null;
      return {
        species_id: s.id,
        common_name: s.common_name,
        scientific_name: s.scientific_name,
        taxon_group: s.taxon_group,
        is_invasive: !!s.is_invasive,
        total_observations_count: s.total_observations_count || 0,
        identification_guides_count: s.identification_guides_count || 0,
        observation_count_in_range: counts[speciesId]
      };
    }).filter(Boolean);

    const sortBy = f.sort_by || 'most_observations';
    if (sortBy === 'alphabetical') {
      resultsRaw.sort((a, b) => {
        const aName = (a.common_name || '').toLowerCase();
        const bName = (b.common_name || '').toLowerCase();
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
      });
    } else {
      resultsRaw.sort((a, b) => b.observation_count_in_range - a.observation_count_in_range);
    }

    const total_count = resultsRaw.length;
    const page = f.page && f.page > 0 ? f.page : 1;
    const page_size = f.page_size && f.page_size > 0 ? f.page_size : 20;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const results = resultsRaw.slice(start, end);

    return {
      results,
      total_count,
      page,
      page_size
    };
  }

  // 19. getSpeciesDetail
  getSpeciesDetail(species_id) {
    const species = this._getFromStorage('species', []);
    const follows = this._getFromStorage('species_follows', []);

    const sp = species.find(s => s.id === species_id) || null;
    if (!sp) {
      return { species: null, is_followed: false };
    }

    const follow = follows.find(f => f.species_id === species_id) || null;
    return { species: sp, is_followed: !!follow };
  }

  // 20. setSpeciesFollowStatus
  setSpeciesFollowStatus(species_id, follow) {
    const species = this._getFromStorage('species', []);
    const sp = species.find(s => s.id === species_id);
    if (!sp) {
      return { success: false, is_followed: false, follow_record: null, message: 'Species not found' };
    }

    const follows = this._getFromStorage('species_follows', []);
    const index = follows.findIndex(f => f.species_id === species_id);
    const nowIso = new Date().toISOString();

    if (follow) {
      if (index !== -1) {
        const existing = follows[index];
        return { success: true, is_followed: true, follow_record: existing, message: 'Already following' };
      }
      const record = {
        id: this._generateId('spfollow'),
        species_id,
        followed_at: nowIso
      };
      follows.push(record);
      this._saveToStorage('species_follows', follows);
      return { success: true, is_followed: true, follow_record: record, message: 'Following species' };
    } else {
      if (index !== -1) {
        const record = follows[index];
        follows.splice(index, 1);
        this._saveToStorage('species_follows', follows);
        return { success: true, is_followed: false, follow_record: record, message: 'Unfollowed species' };
      }
      return { success: true, is_followed: false, follow_record: null, message: 'Not following species' };
    }
  }

  // 21. getWatchlists
  getWatchlists() {
    const watchlists = this._getFromStorage('watchlists', []);
    const items = this._getFromStorage('watchlist_items', []);

    return watchlists.map(w => {
      const species_count = items.filter(i => i.watchlist_id === w.id).length;
      return {
        watchlist_id: w.id,
        name: w.name,
        description: w.description || '',
        created_at: w.created_at,
        species_count
      };
    });
  }

  // 22. getWatchlistDetail
  getWatchlistDetail(watchlist_id) {
    const watchlists = this._getFromStorage('watchlists', []);
    const items = this._getFromStorage('watchlist_items', []);
    const species = this._getFromStorage('species', []);

    const watchlist = watchlists.find(w => w.id === watchlist_id) || null;
    if (!watchlist) {
      return { watchlist: null, species_items: [] };
    }

    const speciesMap = {};
    species.forEach(s => {
      speciesMap[s.id] = s;
    });

    const species_items = items
      .filter(i => i.watchlist_id === watchlist_id)
      .map(i => {
        const s = speciesMap[i.species_id] || null;
        return {
          species_id: i.species_id,
          common_name: s ? s.common_name : null,
          scientific_name: s ? s.scientific_name : null,
          taxon_group: s ? s.taxon_group : null,
          total_observations_count: s ? s.total_observations_count || 0 : 0,
          identification_guides_count: s ? s.identification_guides_count || 0 : 0,
          added_at: i.added_at,
          species: s
        };
      });

    return { watchlist, species_items };
  }

  // 23. createWatchlist
  createWatchlist(name, description) {
    const watchlists = this._getFromStorage('watchlists', []);
    const nowIso = new Date().toISOString();

    const watchlist = {
      id: this._generateId('watchlist'),
      name,
      description: description || '',
      created_at: nowIso
    };

    watchlists.push(watchlist);
    this._saveToStorage('watchlists', watchlists);

    return { success: true, watchlist, message: 'Watchlist created' };
  }

  // 24. renameWatchlist
  renameWatchlist(watchlist_id, name, description) {
    const watchlists = this._getFromStorage('watchlists', []);
    const wl = watchlists.find(w => w.id === watchlist_id);
    if (!wl) {
      return { success: false, watchlist: null, message: 'Watchlist not found' };
    }

    wl.name = name;
    if (description !== undefined) {
      wl.description = description;
    }

    this._saveToStorage('watchlists', watchlists);
    return { success: true, watchlist: wl, message: 'Watchlist updated' };
  }

  // 25. deleteWatchlist
  deleteWatchlist(watchlist_id) {
    const watchlists = this._getFromStorage('watchlists', []);
    const items = this._getFromStorage('watchlist_items', []);

    const index = watchlists.findIndex(w => w.id === watchlist_id);
    if (index === -1) {
      return { success: false, message: 'Watchlist not found' };
    }

    watchlists.splice(index, 1);
    const remainingItems = items.filter(i => i.watchlist_id !== watchlist_id);

    this._saveToStorage('watchlists', watchlists);
    this._saveToStorage('watchlist_items', remainingItems);

    return { success: true, message: 'Watchlist deleted' };
  }

  // 26. addSpeciesToWatchlist
  addSpeciesToWatchlist(watchlist_id, species_id) {
    const watchlists = this._getFromStorage('watchlists', []);
    const species = this._getFromStorage('species', []);
    const items = this._getFromStorage('watchlist_items', []);

    const wl = watchlists.find(w => w.id === watchlist_id);
    if (!wl) {
      return { success: false, item: null, message: 'Watchlist not found' };
    }
    const sp = species.find(s => s.id === species_id);
    if (!sp) {
      return { success: false, item: null, message: 'Species not found' };
    }

    const existing = items.find(i => i.watchlist_id === watchlist_id && i.species_id === species_id);
    if (existing) {
      return { success: true, item: existing, message: 'Species already in watchlist' };
    }

    const nowIso = new Date().toISOString();
    const item = {
      id: this._generateId('witem'),
      watchlist_id,
      species_id,
      added_at: nowIso
    };
    items.push(item);
    this._saveToStorage('watchlist_items', items);

    return { success: true, item, message: 'Species added to watchlist' };
  }

  // 27. removeSpeciesFromWatchlist
  removeSpeciesFromWatchlist(watchlist_id, species_id) {
    const items = this._getFromStorage('watchlist_items', []);
    const remaining = items.filter(i => !(i.watchlist_id === watchlist_id && i.species_id === species_id));

    const removed = remaining.length !== items.length;
    this._saveToStorage('watchlist_items', remaining);

    return { success: removed };
  }

  // 28. getBookmarkedObservations
  getBookmarkedObservations(filters) {
    const f = filters || {};
    const bookmarks = this._getFromStorage('bookmarks', []);
    const observations = this._getFromStorage('observations', []);
    const species = this._getFromStorage('species', []);

    const speciesMap = {};
    species.forEach(s => {
      speciesMap[s.id] = s;
    });

    const obsMap = {};
    observations.forEach(o => {
      obsMap[o.id] = o;
    });

    const taxonGroupFilter = f.taxon_group || null;

    let joined = bookmarks
      .map(b => {
        const o = obsMap[b.observation_id];
        if (!o) return null;
        const sp = o.species_id ? speciesMap[o.species_id] || null : null;
        const tg = this._getObservationTaxonGroup(o, speciesMap);
        return {
          bookmark: b,
          observation: o,
          species: sp,
          taxon_group: tg
        };
      })
      .filter(Boolean);

    if (taxonGroupFilter) {
      joined = joined.filter(j => j.taxon_group === taxonGroupFilter);
    }

    const sortBy = f.sort_by || 'date_bookmarked_desc';
    if (sortBy === 'date_observed_desc') {
      joined.sort((a, b) => new Date(b.observation.observation_datetime) - new Date(a.observation.observation_datetime));
    } else if (sortBy === 'species_name_asc') {
      joined.sort((a, b) => {
        const aName = (a.species ? a.species.common_name : '').toLowerCase();
        const bName = (b.species ? b.species.common_name : '').toLowerCase();
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
      });
    } else {
      joined.sort((a, b) => new Date(b.bookmark.bookmarked_at) - new Date(a.bookmark.bookmarked_at));
    }

    const page = f.page && f.page > 0 ? f.page : 1;
    const page_size = f.page_size && f.page_size > 0 ? f.page_size : 20;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const slice = joined.slice(start, end);

    const results = slice.map(j => ({
      observation_id: j.observation.id,
      species_common_name: j.species ? j.species.common_name : null,
      species_scientific_name: j.species ? j.species.scientific_name : null,
      taxon_group: j.taxon_group,
      observation_datetime: j.observation.observation_datetime,
      location_name: j.observation.location_name || null,
      bookmarked_at: j.bookmark.bookmarked_at
    }));

    return {
      results,
      total_count: joined.length,
      page,
      page_size
    };
  }

  // 29. searchHotspots
  searchHotspots(query, selected_place_id) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const hotspots = this._getFromStorage('hotspots', []);

    return hotspots.filter(h => {
      if ((h.name || '').toLowerCase().includes(q)) {
        if (selected_place_id && h.place_id && h.place_id !== selected_place_id) {
          return false;
        }
        return true;
      }
      return false;
    });
  }

  // 30. getHotspotSummary
  getHotspotSummary(hotspot_id, date_from, date_to) {
    const hotspots = this._getFromStorage('hotspots', []);
    const subscriptions = this._getFromStorage('hotspot_subscriptions', []);

    const hotspot = hotspots.find(h => h.id === hotspot_id) || null;
    if (!hotspot) {
      return {
        hotspot: null,
        total_species: 0,
        yearly_breakdown: [],
        is_subscribed: false,
        subscription: null
      };
    }

    const range = this._computeHotspotSpeciesTotalForDateRange(hotspot, date_from, date_to);

    const subscription = subscriptions.find(s => s.hotspot_id === hotspot_id) || null;
    const is_subscribed = !!(subscription && subscription.notification_frequency && subscription.notification_frequency !== 'none');

    return {
      hotspot,
      total_species: range.total,
      yearly_breakdown: range.breakdown,
      is_subscribed,
      subscription
    };
  }

  // 31. setHotspotSubscription
  setHotspotSubscription(hotspot_id, notification_frequency) {
    const hotspots = this._getFromStorage('hotspots', []);
    const hotspot = hotspots.find(h => h.id === hotspot_id);
    if (!hotspot) {
      return { success: false, subscription: null, message: 'Hotspot not found' };
    }

    const subscriptions = this._getFromStorage('hotspot_subscriptions', []);
    const index = subscriptions.findIndex(s => s.hotspot_id === hotspot_id);

    if (notification_frequency === 'none') {
      if (index !== -1) {
        subscriptions.splice(index, 1);
        this._saveToStorage('hotspot_subscriptions', subscriptions);
      }
      return { success: true, subscription: null, message: 'Unsubscribed from hotspot' };
    }

    const nowIso = new Date().toISOString();
    let subscription;
    if (index !== -1) {
      subscription = subscriptions[index];
      subscription.notification_frequency = notification_frequency;
    } else {
      subscription = {
        id: this._generateId('hotsub'),
        hotspot_id,
        notification_frequency,
        subscribed_at: nowIso
      };
      subscriptions.push(subscription);
    }

    this._saveToStorage('hotspot_subscriptions', subscriptions);

    return { success: true, subscription, message: 'Hotspot subscription updated' };
  }

  // 32. getAboutContent
  getAboutContent() {
    const stored = this._getFromStorage('about_content', {});
    return {
      title: stored.title || '',
      body: stored.body || '',
      sections: Array.isArray(stored.sections) ? stored.sections : []
    };
  }

  // 33. getHelpFaqContent
  getHelpFaqContent() {
    const stored = this._getFromStorage('help_faq_content', {});
    return {
      faqs: Array.isArray(stored.faqs) ? stored.faqs : [],
      guides: Array.isArray(stored.guides) ? stored.guides : []
    };
  }

  // 34. getContactConfig
  getContactConfig() {
    const stored = this._getFromStorage('contact_config', {});
    return {
      contact_email: stored.contact_email || '',
      mailing_address: stored.mailing_address || '',
      response_time_description: stored.response_time_description || '',
      topics: Array.isArray(stored.topics) ? stored.topics : []
    };
  }

  // 35. sendContactMessage
  sendContactMessage(name, email, topic_id, subject, message_body) {
    const messages = this._getFromStorage('contact_messages', []);
    const nowIso = new Date().toISOString();

    const message = {
      id: this._generateId('contactmsg'),
      name,
      email,
      topic_id: topic_id || null,
      subject,
      message_body,
      created_at: nowIso
    };

    messages.push(message);
    this._saveToStorage('contact_messages', messages);

    return { success: true, message: 'Message submitted' };
  }

  // 36. getTermsOfUseContent
  getTermsOfUseContent() {
    const stored = this._getFromStorage('terms_of_use_content', {});
    return {
      version: stored.version || '',
      last_updated: stored.last_updated || '',
      sections: Array.isArray(stored.sections) ? stored.sections : []
    };
  }

  // 37. getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy_content', {});
    return {
      version: stored.version || '',
      last_updated: stored.last_updated || '',
      sections: Array.isArray(stored.sections) ? stored.sections : []
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
