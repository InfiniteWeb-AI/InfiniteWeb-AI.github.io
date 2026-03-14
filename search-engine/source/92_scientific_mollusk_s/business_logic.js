// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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
    this.DEFAULT_PAGE_SIZE = 20;
    this._initStorage();
    this._getNextIdCounter(); // initialize counter
  }

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const tables = [
      'species',
      'taxa',
      'regions',
      'species_distributions',
      'teaching_resources',
      'favorite_resources',
      'collections',
      'collection_items',
      'comparison_sets',
      'comparison_items',
      'bookmarked_species'
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

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  _ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  // Load user-related tables (collections, comparisons, favorites, bookmarks)
  _loadUserStateFromStorage() {
    return {
      collections: this._getFromStorage('collections'),
      collection_items: this._getFromStorage('collection_items'),
      comparison_sets: this._getFromStorage('comparison_sets'),
      comparison_items: this._getFromStorage('comparison_items'),
      favorite_resources: this._getFromStorage('favorite_resources'),
      bookmarked_species: this._getFromStorage('bookmarked_species')
    };
  }

  // Helper: map species_id -> array of distribution records
  _getSpeciesDistributionsMap() {
    const distributions = this._getFromStorage('species_distributions');
    const map = new Map();
    for (const d of distributions) {
      if (!d || !d.species_id) continue;
      if (!map.has(d.species_id)) map.set(d.species_id, []);
      map.get(d.species_id).push(d);
    }
    return map;
  }

  // Helper: get region by id
  _getRegionById(id) {
    const regions = this._getFromStorage('regions');
    return regions.find(r => r.id === id) || null;
  }

  // Helper: conservation status severity map
  _getConservationSeverity(status) {
    const map = {
      cr: 7,
      en: 6,
      vu: 5,
      nt: 4,
      lc: 3,
      dd: 2,
      ne: 1
    };
    return status && map[status] ? map[status] : 0;
  }

  // Helper: find or create collection by name (case-insensitive)
  _getOrCreateNamedCollection(name, description) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) return null;

    const collections = this._getFromStorage('collections');
    const lower = trimmedName.toLowerCase();
    let collection = collections.find(c => (c.name || '').toLowerCase() === lower) || null;

    const now = this._getCurrentTimestamp();

    if (!collection) {
      collection = {
        id: this._generateId('collection'),
        name: trimmedName,
        description: description || '',
        created_at: now,
        updated_at: now
      };
      collections.push(collection);
      this._saveToStorage('collections', collections);
    } else {
      // Optionally update description
      if (typeof description === 'string' && description !== collection.description) {
        collection.description = description;
        collection.updated_at = now;
        this._saveToStorage('collections', collections);
      }
    }

    return collection;
  }

  // Helper: find or create comparison set by name (case-insensitive)
  _getOrCreateNamedComparisonSet(name, description) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) return null;

    const comparisonSets = this._getFromStorage('comparison_sets');
    const lower = trimmedName.toLowerCase();
    let comparisonSet = comparisonSets.find(c => (c.name || '').toLowerCase() === lower) || null;

    const now = this._getCurrentTimestamp();

    if (!comparisonSet) {
      comparisonSet = {
        id: this._generateId('comparison'),
        name: trimmedName,
        description: description || '',
        created_at: now,
        updated_at: now
      };
      comparisonSets.push(comparisonSet);
      this._saveToStorage('comparison_sets', comparisonSets);
    } else {
      if (typeof description === 'string' && description !== comparisonSet.description) {
        comparisonSet.description = description;
        comparisonSet.updated_at = now;
        this._saveToStorage('comparison_sets', comparisonSets);
      }
    }

    return comparisonSet;
  }

  // -------------------- Core Interfaces --------------------

  // getHomepageSummary()
  getHomepageSummary() {
    const species = this._getFromStorage('species');
    const teachingResources = this._getFromStorage('teaching_resources');
    const regions = this._getFromStorage('regions');

    // Featured species: pick up to 3 species with an image, or just first 3
    let featuredSpecies = species.filter(s => !!s.image_url);
    if (featuredSpecies.length === 0) featuredSpecies = species;
    featuredSpecies = featuredSpecies.slice(0, 3).map(s => ({
      species_id: s.id,
      scientific_name: s.scientific_name,
      common_name: s.common_name || '',
      image_url: s.image_url || '',
      highlight_text: this._buildSpeciesHighlightText(s)
    }));

    // Featured teaching resources: latest 3 by publication_year
    const sortedResources = [...teachingResources].sort((a, b) => {
      const ay = a && typeof a.publication_year === 'number' ? a.publication_year : 0;
      const by = b && typeof b.publication_year === 'number' ? b.publication_year : 0;
      return by - ay;
    });

    const featuredTeaching = sortedResources.slice(0, 3).map(r => ({
      resource_id: r.id,
      title: r.title,
      summary: r.description || '',
      target_age_group: r.target_age_group || '',
      publication_year: r.publication_year
    }));

    return {
      intro_html:
        '<h1>Mollusk Species Explorer</h1>' +
        '<p>Explore global diversity, ecology, and conservation of mollusks, with tools for research, teaching, and comparative studies.</p>',
      total_species_count: species.length,
      total_regions_count: regions.length,
      featured_species: featuredSpecies,
      featured_teaching_resources: featuredTeaching
    };
  }

  _buildSpeciesHighlightText(s) {
    const parts = [];
    if (typeof s.max_length_cm === 'number') {
      parts.push(`up to ${s.max_length_cm} cm`);
    }
    if (typeof s.max_depth_m === 'number') {
      parts.push(`recorded to ${s.max_depth_m} m`);
    }
    return parts.length ? parts.join(', ') : 'Click to view full details.';
  }

  // getUserToolsSummary()
  getUserToolsSummary() {
    const { collections, comparison_sets, favorite_resources, bookmarked_species } =
      this._loadUserStateFromStorage();

    return {
      collections_count: collections.length,
      comparison_sets_count: comparison_sets.length,
      favorite_resources_count: favorite_resources.length,
      bookmarked_species_count: bookmarked_species.length
    };
  }

  // getSpeciesSearchFilterOptions()
  getSpeciesSearchFilterOptions() {
    const regions = this._getFromStorage('regions');
    const taxa = this._getFromStorage('taxa');

    const taxonomic_classes = taxa.filter(
      t => t.rank === 'class' && t.is_mollusk_group === true
    );
    const taxonomic_families = taxa.filter(
      t => t.rank === 'family' && t.is_mollusk_group === true
    );

    return {
      habitat_types: [
        { value: 'marine', label: 'Marine' },
        { value: 'freshwater', label: 'Freshwater' },
        { value: 'terrestrial', label: 'Terrestrial' },
        { value: 'brackish', label: 'Brackish' },
        { value: 'unknown', label: 'Unknown' }
      ],
      conservation_statuses: [
        { value: 'cr', label: 'Critically Endangered (CR)' },
        { value: 'en', label: 'Endangered (EN)' },
        { value: 'vu', label: 'Vulnerable (VU)' },
        { value: 'nt', label: 'Near Threatened (NT)' },
        { value: 'lc', label: 'Least Concern (LC)' },
        { value: 'dd', label: 'Data Deficient (DD)' },
        { value: 'ne', label: 'Not Evaluated (NE)' }
      ],
      radula_types: [
        { value: 'none', label: 'None' },
        { value: 'toxoglossan', label: 'Toxoglossan' },
        { value: 'rachiglossan', label: 'Rachiglossan' },
        { value: 'taenioglossan', label: 'Taenioglossan' },
        { value: 'rhipidoglossan', label: 'Rhipidoglossan' },
        { value: 'docoglossan', label: 'Docoglossan' },
        { value: 'unknown', label: 'Unknown' }
      ],
      regions: regions,
      taxonomic_classes,
      taxonomic_families,
      sort_options: [
        { value: 'scientific_name_asc', label: 'Scientific name – A to Z' },
        { value: 'max_depth_desc', label: 'Maximum recorded depth – deepest first' },
        { value: 'max_length_desc', label: 'Maximum length – largest first' },
        {
          value: 'conservation_status_severity_desc',
          label: 'Conservation status – most threatened first'
        },
        { value: 'year_described_asc', label: 'Year described – oldest first' }
      ],
      default_page_size: this.DEFAULT_PAGE_SIZE
    };
  }

  // searchSpecies(query, filters, sort_by, page, page_size)
  searchSpecies(query, filters, sort_by, page, page_size) {
    const species = this._getFromStorage('species');
    const taxa = this._getFromStorage('taxa');
    const regions = this._getFromStorage('regions');
    const distributions = this._getFromStorage('species_distributions');

    const regionMap = new Map();
    for (const r of regions) {
      regionMap.set(r.id, r);
    }

    // Build distributions map for faster lookups
    const distBySpecies = new Map();
    for (const d of distributions) {
      if (!d || !d.species_id) continue;
      if (!distBySpecies.has(d.species_id)) distBySpecies.set(d.species_id, []);
      distBySpecies.get(d.species_id).push(d);
    }

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : this.DEFAULT_PAGE_SIZE;

    let results = species.filter(s => {
      if (!s) return false;

      // Keyword search
      if (q) {
        const sci = (s.scientific_name || '').toLowerCase();
        const common = (s.common_name || '').toLowerCase();
        if (!sci.includes(q) && !common.includes(q)) return false;
      }

      // Habitat filter
      if (Array.isArray(f.habitat_types) && f.habitat_types.length > 0) {
        if (!f.habitat_types.includes(s.habitat_type)) return false;
      }

      // Depth filters
      if (typeof f.min_depth_m === 'number') {
        if (typeof s.min_depth_m !== 'number' || s.min_depth_m < f.min_depth_m) {
          return false;
        }
      }
      if (typeof f.max_depth_m === 'number') {
        if (typeof s.max_depth_m !== 'number' || s.max_depth_m > f.max_depth_m) {
          return false;
        }
      }

      // Size filters
      if (typeof f.min_shell_body_length_cm === 'number') {
        if (typeof s.min_length_cm !== 'number' || s.min_length_cm < f.min_shell_body_length_cm) {
          return false;
        }
      }
      if (typeof f.min_max_length_cm === 'number') {
        if (typeof s.max_length_cm !== 'number' || s.max_length_cm < f.min_max_length_cm) {
          return false;
        }
      }

      const speciesDists = distBySpecies.get(s.id) || [];

      // Region filters (present in at least one region)
      if (Array.isArray(f.region_ids) && f.region_ids.length > 0) {
        const hasRegion = speciesDists.some(
          d => d.is_present && f.region_ids.includes(d.region_id)
        );
        if (!hasRegion) return false;
      }

      // Invasive / introduced filter
      if (f.require_invasive_in_any_region) {
        let invasiveMatch = false;
        if (Array.isArray(f.region_ids) && f.region_ids.length > 0) {
          invasiveMatch = speciesDists.some(d => {
            if (!d.is_present) return false;
            if (!f.region_ids.includes(d.region_id)) return false;
            const status = d.occurrence_status;
            return (
              d.is_invasive === true ||
              d.is_introduced === true ||
              status === 'invasive' ||
              status === 'introduced'
            );
          });
        } else {
          invasiveMatch = speciesDists.some(d => {
            if (!d.is_present) return false;
            const status = d.occurrence_status;
            return (
              d.is_invasive === true ||
              d.is_introduced === true ||
              status === 'invasive' ||
              status === 'introduced'
            );
          });
          if (!invasiveMatch && s.has_invasive_populations) invasiveMatch = true;
        }

        if (!invasiveMatch) return false;
      }

      // First record year minimum
      if (typeof f.first_record_year_min === 'number') {
        let match = false;
        if (Array.isArray(f.region_ids) && f.region_ids.length > 0) {
          match = speciesDists.some(d => {
            if (!d.is_present) return false;
            if (!f.region_ids.includes(d.region_id)) return false;
            return (
              typeof d.first_record_year === 'number' &&
              d.first_record_year >= f.first_record_year_min
            );
          });
        } else {
          match = speciesDists.some(d => {
            if (!d.is_present) return false;
            return (
              typeof d.first_record_year === 'number' &&
              d.first_record_year >= f.first_record_year_min
            );
          });
        }
        if (!match) return false;
      }

      // Conservation status filter
      if (Array.isArray(f.conservation_statuses) && f.conservation_statuses.length > 0) {
        if (!f.conservation_statuses.includes(s.conservation_status)) return false;
      }

      // Year described filters
      if (typeof f.year_described_min === 'number') {
        if (typeof s.year_described !== 'number' || s.year_described < f.year_described_min) {
          return false;
        }
      }
      if (typeof f.year_described_max === 'number') {
        if (typeof s.year_described !== 'number' || s.year_described > f.year_described_max) {
          return false;
        }
      }

      // Taxonomic filters
      if (f.class_id && s.class_id && s.class_id !== f.class_id) return false;
      if (f.family_id && s.family_id && s.family_id !== f.family_id) return false;
      if (f.genus_id && s.genus_id && s.genus_id !== f.genus_id) return false;

      // Radula type
      if (f.radula_type && s.radula_type && s.radula_type !== f.radula_type) return false;

      return true;
    });

    // Sorting
    const sortMode = sort_by || 'scientific_name_asc';
    results.sort((a, b) => {
      if (sortMode === 'max_depth_desc') {
        const av = typeof a.max_depth_m === 'number' ? a.max_depth_m : -Infinity;
        const bv = typeof b.max_depth_m === 'number' ? b.max_depth_m : -Infinity;
        if (bv !== av) return bv - av;
      } else if (sortMode === 'max_length_desc') {
        const av = typeof a.max_length_cm === 'number' ? a.max_length_cm : -Infinity;
        const bv = typeof b.max_length_cm === 'number' ? b.max_length_cm : -Infinity;
        if (bv !== av) return bv - av;
      } else if (sortMode === 'conservation_status_severity_desc') {
        const av = this._getConservationSeverity(a.conservation_status);
        const bv = this._getConservationSeverity(b.conservation_status);
        if (bv !== av) return bv - av;
      } else if (sortMode === 'year_described_asc') {
        const av = typeof a.year_described === 'number' ? a.year_described : Infinity;
        const bv = typeof b.year_described === 'number' ? b.year_described : Infinity;
        if (av !== bv) return av - bv;
      }

      // Default / tie-breaker: scientific name asc
      const an = (a.scientific_name || '').toLowerCase();
      const bn = (b.scientific_name || '').toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });

    const total_count = results.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageResults = results.slice(start, end).map(s => {
      const classTaxon = taxa.find(t => t.id === s.class_id) || null;
      const familyTaxon = taxa.find(t => t.id === s.family_id) || null;
      const genusTaxon = taxa.find(t => t.id === s.genus_id) || null;

      const speciesDists = distBySpecies.get(s.id) || [];
      const keyRegionNames = [];
      for (const d of speciesDists) {
        if (!d.is_present) continue;
        const region = regionMap.get(d.region_id);
        if (region && !keyRegionNames.includes(region.name)) {
          keyRegionNames.push(region.name);
          if (keyRegionNames.length >= 3) break;
        }
      }

      const isInvasiveAnywhere = speciesDists.some(d => {
        if (!d.is_present) return false;
        const status = d.occurrence_status;
        return (
          d.is_invasive === true ||
          d.is_introduced === true ||
          status === 'invasive' ||
          status === 'introduced'
        );
      }) || s.has_invasive_populations === true;

      return {
        species_id: s.id,
        scientific_name: s.scientific_name,
        common_name: s.common_name || '',
        class_name: classTaxon ? classTaxon.name : '',
        family_name: familyTaxon ? familyTaxon.name : '',
        genus_name: genusTaxon ? genusTaxon.name : '',
        habitat_type: s.habitat_type,
        min_depth_m: s.min_depth_m,
        max_depth_m: s.max_depth_m,
        min_length_cm: s.min_length_cm,
        max_length_cm: s.max_length_cm,
        size_measurement_type: s.size_measurement_type,
        conservation_status: s.conservation_status,
        year_described: s.year_described,
        key_regions: keyRegionNames,
        is_invasive_anywhere: isInvasiveAnywhere,
        image_url: s.image_url || ''
      };
    });

    return {
      total_count,
      page: pageNum,
      page_size: size,
      results: pageResults
    };
  }

  // getSpeciesDetail(speciesId)
  getSpeciesDetail(speciesId) {
    const speciesList = this._getFromStorage('species');
    const taxa = this._getFromStorage('taxa');
    const regions = this._getFromStorage('regions');
    const distributions = this._getFromStorage('species_distributions');
    const { collections, collection_items, comparison_sets, comparison_items, bookmarked_species } =
      this._loadUserStateFromStorage();

    const s = speciesList.find(sp => sp.id === speciesId) || null;
    if (!s) {
      return {
        species: null,
        taxonomy: null,
        distributions: [],
        user_state: {
          is_bookmarked: false,
          collections: [],
          comparison_sets: []
        }
      };
    }

    const classTaxon = taxa.find(t => t.id === s.class_id) || null;
    const familyTaxon = taxa.find(t => t.id === s.family_id) || null;
    const genusTaxon = taxa.find(t => t.id === s.genus_id) || null;

    const regionMap = new Map();
    for (const r of regions) regionMap.set(r.id, r);

    const speciesDists = distributions.filter(d => d.species_id === s.id);
    const distOutput = speciesDists.map(d => {
      const region = regionMap.get(d.region_id) || null;
      return {
        region_id: d.region_id,
        region_name: region ? region.name : '',
        is_present: d.is_present,
        is_native: d.is_native,
        is_introduced: d.is_introduced,
        is_invasive: d.is_invasive,
        occurrence_status: d.occurrence_status,
        first_record_year: d.first_record_year,
        // foreign key resolution
        region: region
      };
    });

    const isBookmarked = bookmarked_species.some(b => b.species_id === s.id);

    const collectionMembership = collection_items
      .filter(ci => ci.species_id === s.id)
      .map(ci => {
        const collection = collections.find(c => c.id === ci.collection_id) || null;
        return {
          collection_id: ci.collection_id,
          collection_name: collection ? collection.name : '',
          collection
        };
      });

    const comparisonMembership = comparison_items
      .filter(ci => ci.species_id === s.id)
      .map(ci => {
        const comparisonSet = comparison_sets.find(c => c.id === ci.comparison_set_id) || null;
        return {
          comparison_set_id: ci.comparison_set_id,
          comparison_set_name: comparisonSet ? comparisonSet.name : '',
          comparison_set: comparisonSet
        };
      });

    return {
      species: {
        id: s.id,
        scientific_name: s.scientific_name,
        common_name: s.common_name || '',
        habitat_type: s.habitat_type,
        min_depth_m: s.min_depth_m,
        max_depth_m: s.max_depth_m,
        min_length_cm: s.min_length_cm,
        max_length_cm: s.max_length_cm,
        size_measurement_type: s.size_measurement_type,
        conservation_status: s.conservation_status,
        year_described: s.year_described,
        authority: s.authority || '',
        radula_type: s.radula_type,
        distribution_summary: s.distribution_summary || '',
        has_invasive_populations: s.has_invasive_populations === true,
        image_url: s.image_url || ''
      },
      taxonomy: {
        class_id: s.class_id || null,
        class_name: classTaxon ? classTaxon.name : '',
        family_id: s.family_id || null,
        family_name: familyTaxon ? familyTaxon.name : '',
        genus_id: s.genus_id || null,
        genus_name: genusTaxon ? genusTaxon.name : '',
        // foreign key resolution
        class: classTaxon,
        family: familyTaxon,
        genus: genusTaxon
      },
      distributions: distOutput,
      user_state: {
        is_bookmarked: isBookmarked,
        collections: collectionMembership,
        comparison_sets: comparisonMembership
      }
    };
  }

  // addSpeciesToCollection(speciesId, collectionId, new_collection_name, new_collection_description)
  addSpeciesToCollection(speciesId, collectionId, new_collection_name, new_collection_description) {
    const speciesList = this._getFromStorage('species');
    let collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const speciesExists = speciesList.some(s => s.id === speciesId);
    if (!speciesExists) {
      return {
        success: false,
        collection: null,
        message: 'Species not found.'
      };
    }

    let collection = null;

    if (collectionId) {
      collection = collections.find(c => c.id === collectionId) || null;
      if (!collection) {
        return {
          success: false,
          collection: null,
          message: 'Collection not found.'
        };
      }
    } else if (new_collection_name) {
      collection = this._getOrCreateNamedCollection(new_collection_name, new_collection_description);
      // Reload collections from storage to include any newly created collection
      collections = this._getFromStorage('collections');
    } else {
      return {
        success: false,
        collection: null,
        message: 'Either collectionId or new_collection_name must be provided.'
      };
    }

    const now = this._getCurrentTimestamp();

    const already = collectionItems.some(
      ci => ci.collection_id === collection.id && ci.species_id === speciesId
    );

    if (!already) {
      const newItem = {
        id: this._generateId('collection_item'),
        collection_id: collection.id,
        species_id: speciesId,
        added_at: now
      };
      collectionItems.push(newItem);
      collection.updated_at = now;
      this._saveToStorage('collection_items', collectionItems);
      this._saveToStorage('collections', collections);
    }

    const speciesCount = collectionItems.filter(ci => ci.collection_id === collection.id).length;

    return {
      success: true,
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        species_count: speciesCount
      },
      message: already ? 'Species already in collection.' : 'Species added to collection.'
    };
  }

  // addSpeciesToComparison(speciesId, comparisonSetId, new_comparison_name, new_comparison_description)
  addSpeciesToComparison(
    speciesId,
    comparisonSetId,
    new_comparison_name,
    new_comparison_description
  ) {
    const speciesList = this._getFromStorage('species');
    let comparisonSets = this._getFromStorage('comparison_sets');
    const comparisonItems = this._getFromStorage('comparison_items');

    const speciesExists = speciesList.some(s => s.id === speciesId);
    if (!speciesExists) {
      return {
        success: false,
        comparison_set: null,
        message: 'Species not found.'
      };
    }

    let comparisonSet = null;

    if (comparisonSetId) {
      comparisonSet = comparisonSets.find(c => c.id === comparisonSetId) || null;
      if (!comparisonSet) {
        return {
          success: false,
          comparison_set: null,
          message: 'Comparison set not found.'
        };
      }
    } else if (new_comparison_name) {
      comparisonSet = this._getOrCreateNamedComparisonSet(
        new_comparison_name,
        new_comparison_description
      );
      // Reload comparison sets from storage to include any newly created set
      comparisonSets = this._getFromStorage('comparison_sets');
    } else {
      return {
        success: false,
        comparison_set: null,
        message: 'Either comparisonSetId or new_comparison_name must be provided.'
      };
    }

    const now = this._getCurrentTimestamp();

    const already = comparisonItems.some(
      ci => ci.comparison_set_id === comparisonSet.id && ci.species_id === speciesId
    );

    if (!already) {
      const newItem = {
        id: this._generateId('comparison_item'),
        comparison_set_id: comparisonSet.id,
        species_id: speciesId,
        added_at: now
      };
      comparisonItems.push(newItem);
      comparisonSet.updated_at = now;
      this._saveToStorage('comparison_items', comparisonItems);
      this._saveToStorage('comparison_sets', comparisonSets);
    }

    const speciesCount = comparisonItems.filter(
      ci => ci.comparison_set_id === comparisonSet.id
    ).length;

    return {
      success: true,
      comparison_set: {
        id: comparisonSet.id,
        name: comparisonSet.name,
        description: comparisonSet.description || '',
        species_count: speciesCount
      },
      message: already ? 'Species already in comparison set.' : 'Species added to comparison set.'
    };
  }

  // setSpeciesBookmarkStatus(speciesId, isBookmarked)
  setSpeciesBookmarkStatus(speciesId, isBookmarked) {
    const speciesList = this._getFromStorage('species');
    const bookmarks = this._getFromStorage('bookmarked_species');

    const speciesExists = speciesList.some(s => s.id === speciesId);
    if (!speciesExists) {
      return {
        success: false,
        is_bookmarked: false,
        total_bookmarks: bookmarks.length
      };
    }

    let updatedBookmarks = bookmarks;

    if (isBookmarked) {
      const already = bookmarks.some(b => b.species_id === speciesId);
      if (!already) {
        const now = this._getCurrentTimestamp();
        const newBookmark = {
          id: this._generateId('bookmark'),
          species_id: speciesId,
          created_at: now
        };
        updatedBookmarks = [...bookmarks, newBookmark];
      }
    } else {
      updatedBookmarks = bookmarks.filter(b => b.species_id !== speciesId);
    }

    this._saveToStorage('bookmarked_species', updatedBookmarks);

    return {
      success: true,
      is_bookmarked: isBookmarked,
      total_bookmarks: updatedBookmarks.length
    };
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    return collections.map(c => {
      const count = collectionItems.filter(ci => ci.collection_id === c.id).length;
      return {
        collection_id: c.id,
        name: c.name,
        description: c.description || '',
        species_count: count,
        created_at: c.created_at,
        updated_at: c.updated_at
      };
    });
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const species = this._getFromStorage('species');
    const taxa = this._getFromStorage('taxa');
    const regions = this._getFromStorage('regions');
    const distributions = this._getFromStorage('species_distributions');

    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return {
        collection: null,
        species: []
      };
    }

    const distBySpecies = new Map();
    for (const d of distributions) {
      if (!d || !d.species_id) continue;
      if (!distBySpecies.has(d.species_id)) distBySpecies.set(d.species_id, []);
      distBySpecies.get(d.species_id).push(d);
    }

    const regionMap = new Map();
    for (const r of regions) regionMap.set(r.id, r);

    const items = collectionItems.filter(ci => ci.collection_id === collection.id);

    const speciesEntries = items.map(ci => {
      const s = species.find(sp => sp.id === ci.species_id) || null;
      if (!s) {
        return null;
      }
      const classTaxon = taxa.find(t => t.id === s.class_id) || null;
      const familyTaxon = taxa.find(t => t.id === s.family_id) || null;
      const speciesDists = distBySpecies.get(s.id) || [];
      const keyRegionNames = [];
      for (const d of speciesDists) {
        if (!d.is_present) continue;
        const region = regionMap.get(d.region_id);
        if (region && !keyRegionNames.includes(region.name)) {
          keyRegionNames.push(region.name);
          if (keyRegionNames.length >= 3) break;
        }
      }

      return {
        species_id: s.id,
        scientific_name: s.scientific_name,
        common_name: s.common_name || '',
        class_name: classTaxon ? classTaxon.name : '',
        family_name: familyTaxon ? familyTaxon.name : '',
        max_length_cm: s.max_length_cm,
        max_depth_m: s.max_depth_m,
        key_regions: keyRegionNames,
        // foreign key resolution
        species: s
      };
    }).filter(Boolean);

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        created_at: collection.created_at,
        updated_at: collection.updated_at
      },
      species: speciesEntries
    };
  }

  // updateCollection(collectionId, name, description)
  updateCollection(collectionId, name, description) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId) || null;

    if (!collection) {
      return {
        success: false,
        collection: null
      };
    }

    const now = this._getCurrentTimestamp();

    if (typeof name === 'string' && name.trim()) {
      collection.name = name.trim();
    }
    if (typeof description === 'string') {
      collection.description = description;
    }
    collection.updated_at = now;

    this._saveToStorage('collections', collections);

    return {
      success: true,
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        updated_at: collection.updated_at
      }
    };
  }

  // removeSpeciesFromCollection(collectionId, speciesId)
  removeSpeciesFromCollection(collectionId, speciesId) {
    const collectionItems = this._getFromStorage('collection_items');
    const remaining = collectionItems.filter(
      ci => !(ci.collection_id === collectionId && ci.species_id === speciesId)
    );

    this._saveToStorage('collection_items', remaining);

    const remainingCount = remaining.filter(ci => ci.collection_id === collectionId).length;

    return {
      success: true,
      remaining_species_count: remainingCount
    };
  }

  // deleteCollection(collectionId, confirm)
  deleteCollection(collectionId, confirm) {
    if (!confirm) {
      return { success: false };
    }

    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const remainingCollections = collections.filter(c => c.id !== collectionId);
    const remainingItems = collectionItems.filter(ci => ci.collection_id !== collectionId);

    this._saveToStorage('collections', remainingCollections);
    this._saveToStorage('collection_items', remainingItems);

    return { success: true };
  }

  // getComparisonSetsOverview()
  getComparisonSetsOverview() {
    const comparisonSets = this._getFromStorage('comparison_sets');
    const comparisonItems = this._getFromStorage('comparison_items');

    return comparisonSets.map(c => {
      const count = comparisonItems.filter(ci => ci.comparison_set_id === c.id).length;
      return {
        comparison_set_id: c.id,
        name: c.name,
        description: c.description || '',
        species_count: count,
        created_at: c.created_at,
        updated_at: c.updated_at
      };
    });
  }

  // getComparisonSetDetail(comparisonSetId)
  getComparisonSetDetail(comparisonSetId) {
    const comparisonSets = this._getFromStorage('comparison_sets');
    const comparisonItems = this._getFromStorage('comparison_items');
    const species = this._getFromStorage('species');

    const comparisonSet = comparisonSets.find(c => c.id === comparisonSetId) || null;
    if (!comparisonSet) {
      return {
        comparison_set: null,
        species: []
      };
    }

    const items = comparisonItems.filter(ci => ci.comparison_set_id === comparisonSet.id);

    const speciesEntries = items
      .map(ci => {
        const s = species.find(sp => sp.id === ci.species_id) || null;
        if (!s) return null;
        return {
          species_id: s.id,
          scientific_name: s.scientific_name,
          common_name: s.common_name || '',
          max_length_cm: s.max_length_cm,
          min_depth_m: s.min_depth_m,
          max_depth_m: s.max_depth_m,
          conservation_status: s.conservation_status,
          distribution_summary: s.distribution_summary || '',
          // foreign key resolution
          species: s
        };
      })
      .filter(Boolean);

    return {
      comparison_set: {
        id: comparisonSet.id,
        name: comparisonSet.name,
        description: comparisonSet.description || '',
        created_at: comparisonSet.created_at,
        updated_at: comparisonSet.updated_at
      },
      species: speciesEntries
    };
  }

  // updateComparisonSet(comparisonSetId, name, description)
  updateComparisonSet(comparisonSetId, name, description) {
    const comparisonSets = this._getFromStorage('comparison_sets');
    const comparisonSet = comparisonSets.find(c => c.id === comparisonSetId) || null;

    if (!comparisonSet) {
      return {
        success: false,
        comparison_set: null
      };
    }

    const now = this._getCurrentTimestamp();

    if (typeof name === 'string' && name.trim()) {
      comparisonSet.name = name.trim();
    }
    if (typeof description === 'string') {
      comparisonSet.description = description;
    }
    comparisonSet.updated_at = now;

    this._saveToStorage('comparison_sets', comparisonSets);

    return {
      success: true,
      comparison_set: {
        id: comparisonSet.id,
        name: comparisonSet.name,
        description: comparisonSet.description || '',
        updated_at: comparisonSet.updated_at
      }
    };
  }

  // removeSpeciesFromComparison(comparisonSetId, speciesId)
  removeSpeciesFromComparison(comparisonSetId, speciesId) {
    const comparisonItems = this._getFromStorage('comparison_items');
    const remaining = comparisonItems.filter(
      ci => !(ci.comparison_set_id === comparisonSetId && ci.species_id === speciesId)
    );

    this._saveToStorage('comparison_items', remaining);

    const remainingCount = remaining.filter(ci => ci.comparison_set_id === comparisonSetId)
      .length;

    return {
      success: true,
      remaining_species_count: remainingCount
    };
  }

  // deleteComparisonSet(comparisonSetId, confirm)
  deleteComparisonSet(comparisonSetId, confirm) {
    if (!confirm) {
      return { success: false };
    }

    const comparisonSets = this._getFromStorage('comparison_sets');
    const comparisonItems = this._getFromStorage('comparison_items');

    const remainingSets = comparisonSets.filter(c => c.id !== comparisonSetId);
    const remainingItems = comparisonItems.filter(ci => ci.comparison_set_id !== comparisonSetId);

    this._saveToStorage('comparison_sets', remainingSets);
    this._saveToStorage('comparison_items', remainingItems);

    return { success: true };
  }

  // getTeachingResourceFilterOptions()
  getTeachingResourceFilterOptions() {
    const resources = this._getFromStorage('teaching_resources');

    let minYear = null;
    let maxYear = null;
    for (const r of resources) {
      if (typeof r.publication_year === 'number') {
        if (minYear === null || r.publication_year < minYear) minYear = r.publication_year;
        if (maxYear === null || r.publication_year > maxYear) maxYear = r.publication_year;
      }
    }

    return {
      target_age_groups: [
        { value: 'ages_8_11', label: 'Ages 8–11' },
        { value: 'ages_12_14', label: 'Ages 12–14' },
        { value: 'ages_15_18', label: 'Ages 15–18' },
        { value: 'adult', label: 'Adult learners' },
        { value: 'mixed', label: 'Mixed ages' },
        { value: 'all_ages', label: 'All ages' }
      ],
      publication_year_min: minYear,
      publication_year_max: maxYear
    };
  }

  // searchTeachingResources(query, filters, page, page_size)
  searchTeachingResources(query, filters, page, page_size) {
    const resources = this._getFromStorage('teaching_resources');

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : this.DEFAULT_PAGE_SIZE;

    let results = resources.filter(r => {
      if (!r) return false;

      if (q) {
        const inTitle = (r.title || '').toLowerCase().includes(q);
        const inDesc = (r.description || '').toLowerCase().includes(q);
        const topics = Array.isArray(r.topics) ? r.topics.join(' ').toLowerCase() : '';
        const keywords = Array.isArray(r.keywords) ? r.keywords.join(' ').toLowerCase() : '';
        if (!inTitle && !inDesc && !topics.includes(q) && !keywords.includes(q)) {
          return false;
        }
      }

      if (f.target_age_group && r.target_age_group && r.target_age_group !== f.target_age_group) {
        return false;
      }

      if (typeof f.target_age_min === 'number') {
        if (typeof r.target_age_min === 'number' && r.target_age_min < f.target_age_min) {
          return false;
        }
      }

      if (typeof f.target_age_max === 'number') {
        if (typeof r.target_age_max === 'number' && r.target_age_max > f.target_age_max) {
          return false;
        }
      }

      if (typeof f.publication_year_start === 'number') {
        if (
          typeof r.publication_year !== 'number' ||
          r.publication_year < f.publication_year_start
        ) {
          return false;
        }
      }

      if (typeof f.publication_year_end === 'number') {
        if (
          typeof r.publication_year !== 'number' ||
          r.publication_year > f.publication_year_end
        ) {
          return false;
        }
      }

      return true;
    });

    // Default sort: newest first
    results.sort((a, b) => {
      const ay = typeof a.publication_year === 'number' ? a.publication_year : 0;
      const by = typeof b.publication_year === 'number' ? b.publication_year : 0;
      if (by !== ay) return by - ay;
      const at = (a.title || '').toLowerCase();
      const bt = (b.title || '').toLowerCase();
      if (at < bt) return -1;
      if (at > bt) return 1;
      return 0;
    });

    const total_count = results.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageResults = results.slice(start, end).map(r => ({
      resource_id: r.id,
      title: r.title,
      description: r.description || '',
      target_age_min: r.target_age_min,
      target_age_max: r.target_age_max,
      target_age_group: r.target_age_group || '',
      publication_year: r.publication_year
    }));

    return {
      total_count,
      page: pageNum,
      page_size: size,
      results: pageResults
    };
  }

  // getTeachingResourceDetail(resourceId)
  getTeachingResourceDetail(resourceId) {
    const resources = this._getFromStorage('teaching_resources');
    const favorites = this._getFromStorage('favorite_resources');

    const r = resources.find(res => res.id === resourceId) || null;
    if (!r) {
      return {
        resource: null,
        is_favorited: false
      };
    }

    const isFavorited = favorites.some(f => f.resource_id === r.id);

    return {
      resource: {
        id: r.id,
        title: r.title,
        description: r.description || '',
        target_age_min: r.target_age_min,
        target_age_max: r.target_age_max,
        target_age_group: r.target_age_group || '',
        publication_year: r.publication_year,
        authors: this._ensureArray(r.authors),
        topics: this._ensureArray(r.topics),
        keywords: this._ensureArray(r.keywords),
        resource_url: r.resource_url || '',
        download_url: r.download_url || ''
      },
      is_favorited: isFavorited
    };
  }

  // setResourceFavoriteStatus(resourceId, isFavorite)
  setResourceFavoriteStatus(resourceId, isFavorite) {
    const resources = this._getFromStorage('teaching_resources');
    const favorites = this._getFromStorage('favorite_resources');

    const resourceExists = resources.some(r => r.id === resourceId);
    if (!resourceExists) {
      return {
        success: false,
        is_favorited: false,
        total_favorites: favorites.length
      };
    }

    let updatedFavorites = favorites;

    if (isFavorite) {
      const already = favorites.some(f => f.resource_id === resourceId);
      if (!already) {
        const now = this._getCurrentTimestamp();
        const newFav = {
          id: this._generateId('favorite_resource'),
          resource_id: resourceId,
          created_at: now
        };
        updatedFavorites = [...favorites, newFav];
      }
    } else {
      updatedFavorites = favorites.filter(f => f.resource_id !== resourceId);
    }

    this._saveToStorage('favorite_resources', updatedFavorites);

    return {
      success: true,
      is_favorited: isFavorite,
      total_favorites: updatedFavorites.length
    };
  }

  // getFavoriteResourcesList()
  getFavoriteResourcesList() {
    const favorites = this._getFromStorage('favorite_resources');
    const resources = this._getFromStorage('teaching_resources');

    // Sort favorites by created_at desc
    const sortedFavs = [...favorites].sort((a, b) => {
      const at = a.created_at || '';
      const bt = b.created_at || '';
      if (at < bt) return 1;
      if (at > bt) return -1;
      return 0;
    });

    return sortedFavs
      .map(f => {
        const r = resources.find(res => res.id === f.resource_id) || null;
        if (!r) return null;
        return {
          resource_id: r.id,
          title: r.title,
          target_age_min: r.target_age_min,
          target_age_max: r.target_age_max,
          target_age_group: r.target_age_group || '',
          publication_year: r.publication_year,
          // foreign key resolution
          resource: r
        };
      })
      .filter(Boolean);
  }

  // getBookmarkedSpeciesList()
  getBookmarkedSpeciesList() {
    const bookmarks = this._getFromStorage('bookmarked_species');
    const species = this._getFromStorage('species');
    const taxa = this._getFromStorage('taxa');
    const regions = this._getFromStorage('regions');
    const distributions = this._getFromStorage('species_distributions');

    const distBySpecies = new Map();
    for (const d of distributions) {
      if (!d || !d.species_id) continue;
      if (!distBySpecies.has(d.species_id)) distBySpecies.set(d.species_id, []);
      distBySpecies.get(d.species_id).push(d);
    }

    const regionMap = new Map();
    for (const r of regions) regionMap.set(r.id, r);

    const sortedBookmarks = [...bookmarks].sort((a, b) => {
      const at = a.created_at || '';
      const bt = b.created_at || '';
      if (at < bt) return 1;
      if (at > bt) return -1;
      return 0;
    });

    return sortedBookmarks
      .map(b => {
        const s = species.find(sp => sp.id === b.species_id) || null;
        if (!s) return null;
        const classTaxon = taxa.find(t => t.id === s.class_id) || null;
        const familyTaxon = taxa.find(t => t.id === s.family_id) || null;
        const speciesDists = distBySpecies.get(s.id) || [];
        const keyRegionNames = [];
        for (const d of speciesDists) {
          if (!d.is_present) continue;
          const region = regionMap.get(d.region_id);
          if (region && !keyRegionNames.includes(region.name)) {
            keyRegionNames.push(region.name);
            if (keyRegionNames.length >= 3) break;
          }
        }
        return {
          species_id: s.id,
          scientific_name: s.scientific_name,
          common_name: s.common_name || '',
          class_name: classTaxon ? classTaxon.name : '',
          family_name: familyTaxon ? familyTaxon.name : '',
          key_regions: keyRegionNames,
          conservation_status: s.conservation_status,
          // foreign key resolution
          species: s
        };
      })
      .filter(Boolean);
  }

  // getDistributionRegionsFilterOptions()
  getDistributionRegionsFilterOptions() {
    const regions = this._getFromStorage('regions');
    return regions;
  }

  // getSpeciesForDistributionMap(selectedRegionIds, presence_mode, excludedRegionIds)
  getSpeciesForDistributionMap(selectedRegionIds, presence_mode, excludedRegionIds) {
    const species = this._getFromStorage('species');
    const distributions = this._getFromStorage('species_distributions');

    const selected = Array.isArray(selectedRegionIds) ? selectedRegionIds : [];
    const excluded = Array.isArray(excludedRegionIds) ? excludedRegionIds : [];
    const mode = presence_mode === 'all_selected' ? 'all_selected' : 'any_selected';

    if (selected.length === 0) {
      return { species: [] };
    }

    const distBySpecies = new Map();
    for (const d of distributions) {
      if (!d || !d.species_id || !d.is_present) continue;
      if (!distBySpecies.has(d.species_id)) distBySpecies.set(d.species_id, []);
      distBySpecies.get(d.species_id).push(d);
    }

    const results = [];

    for (const s of species) {
      const dists = distBySpecies.get(s.id) || [];
      if (dists.length === 0) continue;

      const presentRegionIds = dists.map(d => d.region_id);

      // Excluded regions: if species present in any excluded, skip
      const hasExcluded = excluded.some(regId => presentRegionIds.includes(regId));
      if (hasExcluded) continue;

      let include = false;
      if (mode === 'any_selected') {
        include = selected.some(regId => presentRegionIds.includes(regId));
      } else {
        // all_selected
        include = selected.every(regId => presentRegionIds.includes(regId));
      }

      if (!include) continue;

      results.push({
        species_id: s.id,
        scientific_name: s.scientific_name,
        common_name: s.common_name || '',
        present_in_region_ids: presentRegionIds,
        key_distribution_summary: this._buildDistributionSummaryFromRegions(presentRegionIds),
        // foreign key resolution
        species: s
      });
    }

    return { species: results };
  }

  _buildDistributionSummaryFromRegions(regionIds) {
    const regions = this._getFromStorage('regions');
    const names = [];
    for (const id of regionIds) {
      const r = regions.find(reg => reg.id === id);
      if (r && !names.includes(r.name)) names.push(r.name);
      if (names.length >= 3) break;
    }
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(' & ');
    return `${names[0]}, ${names[1]} & others`;
  }

  // getSpeciesDistributionForMap(speciesId)
  getSpeciesDistributionForMap(speciesId) {
    const distributions = this._getFromStorage('species_distributions');
    const regions = this._getFromStorage('regions');

    const regionMap = new Map();
    for (const r of regions) regionMap.set(r.id, r);

    return distributions
      .filter(d => d.species_id === speciesId)
      .map(d => {
        const region = regionMap.get(d.region_id) || null;
        return {
          region_id: d.region_id,
          region_name: region ? region.name : '',
          is_present: d.is_present,
          is_native: d.is_native,
          is_introduced: d.is_introduced,
          is_invasive: d.is_invasive,
          occurrence_status: d.occurrence_status,
          first_record_year: d.first_record_year,
          // foreign key resolution
          region: region
        };
      });
  }

  // searchTaxa(query, rank)
  searchTaxa(query, rank) {
    const taxa = this._getFromStorage('taxa');
    const q = (query || '').trim().toLowerCase();
    const r = (rank || '').trim();

    return taxa.filter(t => {
      if (!t) return false;
      if (t.is_mollusk_group !== true) return false;
      if (r && t.rank !== r) return false;
      if (q) {
        const name = (t.name || '').toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }

  // getTaxaForBrowse(rank, parentTaxonId)
  getTaxaForBrowse(rank, parentTaxonId) {
    const taxa = this._getFromStorage('taxa');
    const r = (rank || '').trim();

    return taxa.filter(t => {
      if (!t) return false;
      if (t.is_mollusk_group !== true) return false;
      if (r && t.rank !== r) return false;
      if (parentTaxonId && t.parent_id !== parentTaxonId) return false;
      return true;
    });
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const content = [
      '# About This Site',
      '',
      'This website provides structured information on mollusk species worldwide, including taxonomy, morphology, ecology, conservation status, and geographic distribution.',
      '',
      'Data are stored locally in your browser (or local environment) using JSON structures and can be filtered, compared, and grouped into thematic collections for research and teaching.'
    ].join('\n');

    return { content_html: content };
  }

  // getHelpPageContent()
  getHelpPageContent() {
    const guides = [
      '# How to Use the Mollusk Species Explorer',
      '',
      '## Species search and advanced filters',
      '- Use habitat, depth, size, region, and trait filters to focus on specific ecological groups.',
      '- Sort results by depth, size, conservation status, or year described.',
      '',
      '## Collections and lists',
      '- From any species detail page, use **Add to collection** to create named collections (e.g., deep-sea species, invasive freshwater species).',
      '',
      '## Comparisons',
      '- Use **Add to comparison** on species detail pages to build comparison sets and view traits side by side.',
      '',
      '## Distribution map',
      '- Use region filters (countries and marine regions) to list species present in selected areas, and compare distributions between species.',
      '',
      '## Teaching resources',
      '- Filter by topic, age range, and publication year to find classroom-ready materials, then favorite them for quick access.'
    ].join('\n');

    const faqs = [
      '# FAQs',
      '',
      '### Where is my data stored?',
      'All user-specific data (collections, comparisons, favorites, bookmarks) are stored in your local storage only.',
      '',
      '### What do depth and size values represent?',
      '- **Depth** values are minimum and maximum recorded depths in meters.',
      '- **Size** values are recorded shell or body lengths in centimeters; the measurement type is indicated where known.',
      '',
      '### How is conservation status ordered?',
      'Conservation severity is ordered as: CR > EN > VU > NT > LC > DD > NE.'
    ].join('\n');

    return {
      guides_html: guides,
      faqs_html: faqs
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
