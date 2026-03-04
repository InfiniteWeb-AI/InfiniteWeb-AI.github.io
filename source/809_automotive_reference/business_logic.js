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
      'makes',
      'models',
      'generations',
      'safety_features',
      'generation_safety_features',
      'vehicles',
      'vehicle_safety_features',
      'recalls',
      'list_items',
      'comparisons',
      'comparison_items',
      'browse_mode_preferences'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Optional content keys
    if (!localStorage.getItem('about_page_content')) {
      const about = {
        mission: 'Provide structured reference data and history for automotive models and generations.',
        scope: 'Covers makes, models, generations, and trims with specs, safety, and production information.',
        dataSources: [],
        coverage: {
          marketsCovered: 'Varies by dataset in localStorage.',
          yearsCovered: 'Depends on available data.',
          bodyStylesCovered: 'Sedans, hatchbacks, wagons/estates, SUVs/crossovers, coupes, convertibles, and more.'
        },
        legal: 'All data is provided as-is from the stored dataset.'
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('help_page_content')) {
      const help = {
        intro: 'This site lets you browse automotive models by make, body style, category, performance, and more.',
        sections: [],
        faqs: []
      };
      localStorage.setItem('help_page_content', JSON.stringify(help));
    }

    if (!localStorage.getItem('idCounter')) {
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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // -------------------- Entity lookup / FK helpers --------------------

  _indexById(items) {
    const map = {};
    for (const item of items) {
      if (item && item.id != null) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _attachRelationsToGeneration(gen, modelsById, makesById) {
    if (!gen) return null;
    const cloned = { ...gen };
    const model = modelsById[cloned.modelId] || null;
    cloned.model = model || null;
    if (model) {
      cloned.make = makesById[model.makeId] || null;
    } else {
      cloned.make = null;
    }
    return cloned;
  }

  _attachRelationsToVehicle(vehicle, modelsById, makesById, generationsById) {
    if (!vehicle) return null;
    const cloned = { ...vehicle };
    const model = modelsById[cloned.modelId] || null;
    cloned.model = model || null;
    if (model) {
      cloned.make = makesById[model.makeId] || null;
    } else if (cloned.makeId && makesById[cloned.makeId]) {
      cloned.make = makesById[cloned.makeId];
    } else {
      cloned.make = null;
    }
    cloned.generation = cloned.generationId ? (generationsById[cloned.generationId] || null) : null;
    return cloned;
  }

  _attachRelationsToListItem(item, vehiclesById, generationsById, comparisonsById, modelsById, makesById) {
    if (!item) return null;
    const cloned = { ...item };
    const gen = item.generationId ? generationsById[item.generationId] || null : null;
    const veh = item.vehicleId ? vehiclesById[item.vehicleId] || null : null;
    const comp = item.sourceComparisonId ? comparisonsById[item.sourceComparisonId] || null : null;

    // Attach deeper relations for generation and vehicle
    const makesIndex = makesById;
    const modelsIndex = modelsById;
    const gensIndex = generationsById;

    cloned.generation = gen
      ? this._attachRelationsToGeneration(gen, modelsIndex, makesIndex)
      : null;

    cloned.vehicle = veh
      ? this._attachRelationsToVehicle(veh, modelsIndex, makesIndex, gensIndex)
      : null;

    cloned.comparison = comp || null;
    return cloned;
  }

  _attachRelationsToComparisonItem(item, comparison, vehiclesById, generationsById, modelsById, makesById) {
    if (!item) return null;
    const cloned = { ...item };
    cloned.comparison = comparison || null;
    const makesIndex = makesById;
    const modelsIndex = modelsById;
    const gensIndex = generationsById;

    if (item.itemType === 'generation' && item.generationId) {
      const gen = generationsById[item.generationId] || null;
      cloned.generation = gen
        ? this._attachRelationsToGeneration(gen, modelsIndex, makesIndex)
        : null;
      cloned.vehicle = null;
    } else if (item.itemType === 'vehicle' && item.vehicleId) {
      const veh = vehiclesById[item.vehicleId] || null;
      cloned.vehicle = veh
        ? this._attachRelationsToVehicle(veh, modelsIndex, makesIndex, gensIndex)
        : null;
      cloned.generation = null;
    } else {
      cloned.generation = null;
      cloned.vehicle = null;
    }
    return cloned;
  }

  _computeProductionSpanYears(gen) {
    if (!gen) return 0;
    if (typeof gen.productionSpanYears === 'number') return gen.productionSpanYears;
    const endYear = gen.productionEndYear != null ? gen.productionEndYear : gen.firstModelYear || gen.productionStartYear;
    const startYear = gen.productionStartYear;
    if (typeof startYear !== 'number' || typeof endYear !== 'number') return 0;
    const span = endYear - startYear + 1;
    return span > 0 ? span : 0;
  }

  _mapCategoryLabel(category) {
    const map = {
      compact_cars: 'Compact cars',
      midsize_cars: 'Midsize cars',
      fullsize_cars: 'Full-size cars',
      sports_cars: 'Sports cars',
      luxury_cars: 'Luxury cars',
      suvs_crossovers: 'SUVs / Crossovers',
      trucks: 'Trucks',
      minivans: 'Minivans',
      wagons_estates: 'Wagons / Estates',
      electric_vehicles: 'Electric vehicles',
      other: 'Other'
    };
    return map[category] || null;
  }

  _mapBodyStyleLabel(bodyStyle) {
    const map = {
      suv_crossover: 'SUV / Crossover',
      wagon_estate: 'Wagon / Estate',
      coupe: 'Coupe',
      convertible: 'Convertible',
      sedan: 'Sedan',
      hatchback: 'Hatchback',
      minivan: 'Minivan',
      pickup_truck: 'Pickup truck',
      other: 'Other'
    };
    return map[bodyStyle] || null;
  }

  _sortVehicles(vehicles, sortBy) {
    if (!sortBy) return vehicles;
    const arr = [...vehicles];
    const numDesc = (a, b) => (b - a);
    const numAsc = (a, b) => (a - b);

    const get = (v, field) => (typeof v[field] === 'number' ? v[field] : null);

    arr.sort((a, b) => {
      let av; let bv;
      switch (sortBy) {
        case 'range_desc':
          av = get(a, 'electricRangeMiles');
          bv = get(b, 'electricRangeMiles');
          break;
        case 'base_price_asc':
          av = get(a, 'basePrice');
          bv = get(b, 'basePrice');
          if (av == null) return 1;
          if (bv == null) return -1;
          return numAsc(av, bv);
        case 'base_price_desc':
          av = get(a, 'basePrice');
          bv = get(b, 'basePrice');
          if (av == null) return 1;
          if (bv == null) return -1;
          return numDesc(av, bv);
        case 'horsepower_desc':
          av = get(a, 'horsepower');
          bv = get(b, 'horsepower');
          break;
        case 'cargo_volume_desc':
          av = get(a, 'cargoVolumeLiters');
          bv = get(b, 'cargoVolumeLiters');
          break;
        case 'reliability_rating_desc':
          av = get(a, 'reliabilityRating');
          bv = get(b, 'reliabilityRating');
          break;
        case 'zero_to_sixty_asc':
          av = get(a, 'zeroToSixtyMphSeconds');
          bv = get(b, 'zeroToSixtyMphSeconds');
          if (av == null) return 1;
          if (bv == null) return -1;
          return numAsc(av, bv);
        case 'highway_mpg_desc':
          av = get(a, 'highwayMpg');
          bv = get(b, 'highwayMpg');
          break;
        case 'combined_mpg_desc':
          av = get(a, 'combinedMpg');
          bv = get(b, 'combinedMpg');
          break;
        default:
          return 0;
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      // Default numeric desc for those sorts that reach here
      return numDesc(av, bv);
    });
    return arr;
  }

  _sortGenerations(generations, sortBy) {
    if (!sortBy) return generations;
    const arr = [...generations];
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'first_model_year_asc': {
          const av = typeof a.firstModelYear === 'number' ? a.firstModelYear : Infinity;
          const bv = typeof b.firstModelYear === 'number' ? b.firstModelYear : Infinity;
          return av - bv;
        }
        case 'first_model_year_desc': {
          const av = typeof a.firstModelYear === 'number' ? a.firstModelYear : -Infinity;
          const bv = typeof b.firstModelYear === 'number' ? b.firstModelYear : -Infinity;
          return bv - av;
        }
        case 'production_length_desc': {
          const av = this._computeProductionSpanYears(a);
          const bv = this._computeProductionSpanYears(b);
          return bv - av;
        }
        default:
          return 0;
      }
    });
    return arr;
  }

  _computeSafetyRecallCountForVehicle(vehicleId, recalls) {
    if (!vehicleId) return 0;
    const list = recalls.filter((r) => r.vehicleId === vehicleId && r.isSafetyRecall === true);
    return list.length;
  }

  // -------------------- Helper functions from spec --------------------

  _getOrCreateLocalComparisonSession(comparisonId) {
    // This helper wraps access to the persisted comparisons table.
    const comparisons = this._getFromStorage('comparisons');
    const comparisonItems = this._getFromStorage('comparison_items');
    let comparison = null;
    let items = [];
    if (comparisonId) {
      comparison = comparisons.find((c) => c.id === comparisonId) || null;
      if (comparison) {
        items = comparisonItems.filter((ci) => ci.comparisonId === comparison.id);
      }
    }
    return { comparison, items };
  }

  _persistBrowseModePreference(pref) {
    const prefs = this._getFromStorage('browse_mode_preferences');
    const idx = prefs.findIndex((p) => p.id === pref.id);
    if (idx >= 0) {
      prefs[idx] = pref;
    } else {
      prefs.push(pref);
    }
    this._saveToStorage('browse_mode_preferences', prefs);
    return pref;
  }

  // -------------------- Core interface implementations --------------------

  // getHomeSummary
  getHomeSummary() {
    const entryPoints = [
      {
        id: 'search_by_make',
        label: 'Search by Make',
        description: 'Browse all models from a specific manufacturer.',
        targetPage: 'search',
        browseMode: 'make'
      },
      {
        id: 'search_by_model',
        label: 'Search by Model',
        description: 'Jump directly to a model line timeline and generations.',
        targetPage: 'search',
        browseMode: 'model'
      },
      {
        id: 'browse_body_style',
        label: 'Browse by body style',
        description: 'Find SUVs, wagons/estates, coupes, and more.',
        targetPage: 'advanced_search',
        browseMode: 'body_style'
      },
      {
        id: 'advanced_search',
        label: 'Advanced search',
        description: 'Filter by fuel type, range, performance, and safety.',
        targetPage: 'advanced_search',
        browseMode: 'general'
      },
      {
        id: 'performance_browse',
        label: 'Performance models',
        description: 'Explore sports and performance-focused models.',
        targetPage: 'advanced_search',
        browseMode: 'performance'
      },
      {
        id: 'special_editions',
        label: 'Special editions & limited runs',
        description: 'Discover rare, limited-production variants.',
        targetPage: 'advanced_search',
        browseMode: 'special_editions'
      }
    ];

    const listSummary = this.getMyListsSummary();
    const totalLists =
      (listSummary.bookmarkedGenerationsCount || 0) +
      (listSummary.favoritesCount || 0) +
      (listSummary.watchlistCount || 0) +
      (listSummary.specialInterestCount || 0) +
      (listSummary.preferredCount || 0);

    return {
      entryPoints,
      heroText: 'Explore automotive model history, generations, specs, and special editions.',
      showMyListsLink: totalLists > 0
    };
  }

  // searchQuickNavigation
  searchQuickNavigation(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return { suggestions: [] };
    }

    const makes = this._getFromStorage('makes');
    const models = this._getFromStorage('models');
    const vehicles = this._getFromStorage('vehicles');
    const makesById = this._indexById(makes);

    const suggestions = [];

    // Makes
    for (const make of makes) {
      if (!make.name) continue;
      if (make.name.toLowerCase().includes(q)) {
        suggestions.push({
          type: 'make',
          id: make.id,
          label: make.name,
          subtitle: 'Make'
        });
      }
    }

    // Models
    for (const model of models) {
      if (!model.name) continue;
      const make = makesById[model.makeId];
      const fullName = (make ? make.name + ' ' : '') + model.name;
      if (fullName.toLowerCase().includes(q)) {
        const categoryLabel = this._mapCategoryLabel(model.primaryCategory) || 'Model';
        suggestions.push({
          type: 'model',
          id: model.id,
          label: fullName,
          subtitle: 'Model  b7 ' + categoryLabel
        });
      }
    }

    // Vehicles
    for (const vehicle of vehicles) {
      const model = models.find((m) => m.id === vehicle.modelId) || null;
      const make = model ? makesById[model.makeId] || null : null;
      const parts = [];
      if (make && make.name) parts.push(make.name);
      if (model && model.name) parts.push(model.name);
      if (vehicle.trimName) parts.push(vehicle.trimName);
      const full = parts.join(' ');
      if (!full) continue;
      if (full.toLowerCase().includes(q)) {
        const bodyLabel = this._mapBodyStyleLabel(vehicle.bodyStyle) || 'Vehicle';
        suggestions.push({
          type: 'vehicle',
          id: vehicle.id,
          label: full,
          subtitle: 'Vehicle  b7 ' + bodyLabel
        });
      }
    }

    // Basic dedupe by id+type
    const seen = new Set();
    const deduped = [];
    for (const s of suggestions) {
      const key = s.type + ':' + s.id;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(s);
    }

    return { suggestions: deduped.slice(0, 20) };
  }

  // getMyListsSummary
  getMyListsSummary() {
    const listItems = this._getFromStorage('list_items');
    let bookmarkedGenerationsCount = 0;
    let favoritesCount = 0;
    let watchlistCount = 0;
    let specialInterestCount = 0;
    let preferredCount = 0;

    for (const item of listItems) {
      switch (item.listType) {
        case 'bookmark_generation':
          bookmarkedGenerationsCount += 1;
          break;
        case 'favorite':
          favoritesCount += 1;
          break;
        case 'watchlist':
          watchlistCount += 1;
          break;
        case 'special_interest':
          specialInterestCount += 1;
          break;
        case 'preferred':
          preferredCount += 1;
          break;
        default:
          break;
      }
    }

    return {
      bookmarkedGenerationsCount,
      favoritesCount,
      watchlistCount,
      specialInterestCount,
      preferredCount
    };
  }

  // getMakes
  getMakes(activeOnly) {
    const makes = this._getFromStorage('makes');
    if (activeOnly) {
      return makes.filter((m) => m.isActive === true);
    }
    return makes;
  }

  // getModelsByMake
  getModelsByMake(makeId) {
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const makesById = this._indexById(makes);
    const filtered = models.filter((m) => m.makeId === makeId);
    return filtered.map((m) => ({
      ...m,
      make: makesById[m.makeId] || null
    }));
  }

  // getModelSearchSuggestions
  getModelSearchSuggestions(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const makesById = this._indexById(makes);
    const result = [];
    for (const model of models) {
      if (!model.name) continue;
      if (model.name.toLowerCase().includes(q)) {
        result.push({
          ...model,
          make: makesById[model.makeId] || null
        });
      }
    }
    return result.slice(0, 20);
  }

  // getModelOverview
  getModelOverview(modelId) {
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const generations = this._getFromStorage('generations');

    const model = models.find((m) => m.id === modelId) || null;
    const make = model ? makes.find((mk) => mk.id === model.makeId) || null : null;

    let heroGeneration = null;
    if (model) {
      const gens = generations.filter((g) => g.modelId === model.id);
      if (gens.length > 0) {
        gens.sort((a, b) => {
          const av = typeof a.firstModelYear === 'number' ? a.firstModelYear : -Infinity;
          const bv = typeof b.firstModelYear === 'number' ? b.firstModelYear : -Infinity;
          return bv - av;
        });
        heroGeneration = {
          generation: gens[0],
          tagline: (make && model)
            ? 'Key generation of the ' + make.name + ' ' + model.name
            : 'Highlighted generation'
        };
      }
    }

    const primaryCategoryLabel = model ? this._mapCategoryLabel(model.primaryCategory) : null;
    const availableBodyStylesLabels = [];
    if (model && Array.isArray(model.availableBodyStyles)) {
      for (const bs of model.availableBodyStyles) {
        const label = this._mapBodyStyleLabel(bs);
        if (label) availableBodyStylesLabels.push(label);
      }
    }

    let productionYearsText = '';
    if (model) {
      if (typeof model.firstModelYear === 'number' && typeof model.lastModelYear === 'number') {
        productionYearsText = model.firstModelYear + '–' + model.lastModelYear;
      } else if (typeof model.firstModelYear === 'number') {
        productionYearsText = model.firstModelYear + '–present';
      }
    }

    let marketRegionsText = '';
    if (model && Array.isArray(model.marketRegions) && model.marketRegions.length > 0) {
      marketRegionsText = model.marketRegions.join(', ');
    }

    return {
      model,
      make,
      keyStats: {
        primaryCategoryLabel,
        availableBodyStylesLabels,
        productionYearsText,
        marketRegionsText
      },
      heroGeneration
    };
  }

  // getModelGenerations
  getModelGenerations(modelId, viewMode, filters = {}, sortBy) {
    filters = filters || {};
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const generations = this._getFromStorage('generations');
    const genSafety = this._getFromStorage('generation_safety_features');
    const safetyFeatures = this._getFromStorage('safety_features');

    const model = models.find((m) => m.id === modelId) || null;
    const make = model ? makes.find((mk) => mk.id === model.makeId) || null : null;

    let gens = generations.filter((g) => g.modelId === modelId);

    // Apply filters depending on viewMode
    if (viewMode === 'specs') {
      if (typeof filters.productionYearMin === 'number') {
        gens = gens.filter((g) => typeof g.productionStartYear === 'number' && g.productionStartYear >= filters.productionYearMin);
      }
      if (typeof filters.productionYearMax === 'number') {
        gens = gens.filter((g) => typeof g.productionStartYear === 'number' && g.productionStartYear <= filters.productionYearMax);
      }
    } else if (viewMode === 'timeline') {
      const start = typeof filters.timelineStartYear === 'number' ? filters.timelineStartYear : null;
      const end = typeof filters.timelineEndYear === 'number' ? filters.timelineEndYear : null;
      if (start != null || end != null) {
        gens = gens.filter((g) => {
          const gs = g.productionStartYear;
          const ge = g.productionEndYear != null ? g.productionEndYear : g.lastModelYear || g.productionStartYear;
          if (start != null && ge < start) return false;
          if (end != null && gs > end) return false;
          return true;
        });
      }
    } else if (viewMode === 'years') {
      if (Array.isArray(filters.safetyFeatureIds) && filters.safetyFeatureIds.length > 0) {
        const standardOnly = !!filters.safetyFeaturesStandardOnly;
        const byGen = {};
        for (const rel of genSafety) {
          if (!byGen[rel.generationId]) byGen[rel.generationId] = [];
          byGen[rel.generationId].push(rel);
        }
        gens = gens.filter((g) => {
          const rels = byGen[g.id] || [];
          for (const sfId of filters.safetyFeatureIds) {
            const match = rels.find((r) => r.safetyFeatureId === sfId && (!standardOnly || r.isStandard === true));
            if (!match) return false;
          }
          return true;
        });
      }
    }

    // Sort generations
    let effectiveSortBy = sortBy;
    if (!effectiveSortBy) {
      if (viewMode === 'timeline') {
        effectiveSortBy = 'production_length_desc';
      } else {
        effectiveSortBy = 'first_model_year_asc';
      }
    }
    gens = this._sortGenerations(gens, effectiveSortBy);

    // availableSafetyFeatures for this model
    const genIds = gens.map((g) => g.id);
    const safetyFeatureIdSet = new Set();
    for (const rel of genSafety) {
      if (genIds.includes(rel.generationId)) {
        safetyFeatureIdSet.add(rel.safetyFeatureId);
      }
    }
    const availableSafetyFeatures = safetyFeatures.filter((sf) => safetyFeatureIdSet.has(sf.id));

    const makesById = this._indexById(makes);
    const modelsById = this._indexById(models);

    const enrichedGenerations = gens.map((g) => this._attachRelationsToGeneration(g, modelsById, makesById));

    const sortOptions = [
      { id: 'first_model_year_asc', label: 'First model year (oldest first)' },
      { id: 'first_model_year_desc', label: 'First model year (newest first)' },
      { id: 'production_length_desc', label: 'Production length (longest first)' }
    ];

    return {
      generations: enrichedGenerations,
      model,
      make,
      availableSafetyFeatures,
      sortOptions
    };
  }

  // getGenerationDetail
  getGenerationDetail(generationId) {
    const generations = this._getFromStorage('generations');
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const genSafety = this._getFromStorage('generation_safety_features');
    const safetyFeatures = this._getFromStorage('safety_features');
    const vehicles = this._getFromStorage('vehicles');
    const listItems = this._getFromStorage('list_items');

    const generation = generations.find((g) => g.id === generationId) || null;
    const model = generation ? models.find((m) => m.id === generation.modelId) || null : null;
    const make = model ? makes.find((mk) => mk.id === model.makeId) || null : null;

    const safetyFeaturesList = [];
    const rels = genSafety.filter((r) => r.generationId === generationId);
    for (const rel of rels) {
      const sf = safetyFeatures.find((s) => s.id === rel.safetyFeatureId) || null;
      if (sf) {
        safetyFeaturesList.push({
          safetyFeature: sf,
          isStandard: rel.isStandard === true
        });
      }
    }

    const representativeVehiclesRaw = vehicles.filter((v) => v.generationId === generationId).slice(0, 10);

    const makesById = this._indexById(makes);
    const modelsById = this._indexById(models);
    const gensById = this._indexById(generations);

    const representativeVehicles = representativeVehiclesRaw.map((v) =>
      this._attachRelationsToVehicle(v, modelsById, makesById, gensById)
    );

    const bookmarkEntry = listItems.find((li) => li.listType === 'bookmark_generation' && li.generationId === generationId) || null;

    const otherGenerationsRaw = generations.filter((g) => g.modelId === (generation ? generation.modelId : null) && g.id !== generationId);
    const otherGenerations = otherGenerationsRaw.map((g) => this._attachRelationsToGeneration(g, modelsById, makesById));

    return {
      generation,
      model,
      make,
      safetyFeatures: safetyFeaturesList,
      representativeVehicles,
      bookmarkInfo: {
        isBookmarked: !!bookmarkEntry,
        existingNote: bookmarkEntry ? bookmarkEntry.note || '' : '',
        listItemId: bookmarkEntry ? bookmarkEntry.id : null
      },
      otherGenerations
    };
  }

  // bookmarkGeneration
  bookmarkGeneration(generationId, source = 'manual', note) {
    let listItems = this._getFromStorage('list_items');
    const existing = listItems.find((li) => li.listType === 'bookmark_generation' && li.generationId === generationId) || null;
    let listItem;

    // If an existing bookmark is found, optionally update its note
    if (existing && typeof note === 'string') {
      const updatedExisting = { ...existing, note };
      listItems = listItems.map((li) => (li.id === updatedExisting.id ? updatedExisting : li));
    }

    // Always create a new bookmark entry so counts reflect each action
    listItem = {
      id: this._generateId('li'),
      listType: 'bookmark_generation',
      itemType: 'generation',
      generationId,
      vehicleId: null,
      note: typeof note === 'string' ? note : '',
      source: source || 'manual',
      sourceComparisonId: null,
      createdAt: new Date().toISOString(),
      sortOrder: listItems.length
    };
    listItems.push(listItem);

    this._saveToStorage('list_items', listItems);
    const bookmarkedGenerationsCount = listItems.filter((li) => li.listType === 'bookmark_generation').length;

    return {
      success: true,
      message: 'Generation bookmarked successfully.',
      listItem,
      bookmarkedGenerationsCount
    };
  }

  // updateGenerationBookmarkNote
  updateGenerationBookmarkNote(generationId, note) {
    let listItems = this._getFromStorage('list_items');
    const idx = listItems.findIndex((li) => li.listType === 'bookmark_generation' && li.generationId === generationId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Bookmark for this generation was not found.',
        listItem: null
      };
    }
    const updated = { ...listItems[idx], note };
    listItems[idx] = updated;
    this._saveToStorage('list_items', listItems);
    return {
      success: true,
      message: 'Bookmark note updated.',
      listItem: updated
    };
  }

  // getVehicleDetail
  getVehicleDetail(vehicleId) {
    const vehicles = this._getFromStorage('vehicles');
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const generations = this._getFromStorage('generations');
    const vsafety = this._getFromStorage('vehicle_safety_features');
    const safetyFeatures = this._getFromStorage('safety_features');
    const recalls = this._getFromStorage('recalls');
    const listItems = this._getFromStorage('list_items');

    const vehicle = vehicles.find((v) => v.id === vehicleId) || null;

    let model = null;
    let make = null;
    let generation = null;

    if (vehicle) {
      model = models.find((m) => m.id === vehicle.modelId) || null;
      if (model) {
        make = makes.find((mk) => mk.id === model.makeId) || null;
      } else if (vehicle.makeId) {
        make = makes.find((mk) => mk.id === vehicle.makeId) || null;
      }
      if (vehicle.generationId) {
        generation = generations.find((g) => g.id === vehicle.generationId) || null;
      }
    }

    const safetyFeaturesList = [];
    if (vehicle) {
      const rels = vsafety.filter((r) => r.vehicleId === vehicle.id);
      for (const rel of rels) {
        const sf = safetyFeatures.find((s) => s.id === rel.safetyFeatureId) || null;
        if (sf) {
          safetyFeaturesList.push({
            safetyFeature: sf,
            isStandard: rel.isStandard === true
          });
        }
      }
    }

    let reliabilityRating = vehicle ? vehicle.reliabilityRating : null;
    let ownerRating = vehicle ? vehicle.ownerRating : null;
    const recallRecords = vehicle
      ? recalls.filter((r) => r.vehicleId === vehicle.id && r.isSafetyRecall === true)
      : [];
    const safetyRecallCount = recallRecords.length;

    const listStatus = {
      isFavorite: false,
      isWatchlisted: false,
      isInSpecialInterest: false
    };
    if (vehicle) {
      for (const li of listItems) {
        if (li.vehicleId === vehicle.id) {
          if (li.listType === 'favorite') listStatus.isFavorite = true;
          if (li.listType === 'watchlist') listStatus.isWatchlisted = true;
          if (li.listType === 'special_interest') listStatus.isInSpecialInterest = true;
        }
      }
    }

    return {
      vehicle,
      make,
      model,
      generation,
      safetyFeatures: safetyFeaturesList,
      reliability: {
        reliabilityRating,
        ownerRating,
        safetyRecallCount,
        recalls: recallRecords
      },
      listStatus
    };
  }

  // addVehicleToFavorites
  addVehicleToFavorites(vehicleId, source = 'manual') {
    let listItems = this._getFromStorage('list_items');
    const listItem = {
      id: this._generateId('li'),
      listType: 'favorite',
      itemType: 'vehicle',
      generationId: null,
      vehicleId,
      note: '',
      source: source || 'manual',
      sourceComparisonId: null,
      createdAt: new Date().toISOString(),
      sortOrder: listItems.length
    };
    listItems.push(listItem);
    this._saveToStorage('list_items', listItems);
    const favoritesCount = listItems.filter((li) => li.listType === 'favorite').length;
    return {
      success: true,
      message: 'Vehicle added to favorites.',
      listItem,
      favoritesCount
    };
  }

  // addVehicleToWatchlist
  addVehicleToWatchlist(vehicleId, source = 'manual') {
    let listItems = this._getFromStorage('list_items');
    let existing = listItems.find((li) => li.listType === 'watchlist' && li.vehicleId === vehicleId) || null;
    if (!existing) {
      existing = {
        id: this._generateId('li'),
        listType: 'watchlist',
        itemType: 'vehicle',
        generationId: null,
        vehicleId,
        note: '',
        source: source || 'manual',
        sourceComparisonId: null,
        createdAt: new Date().toISOString(),
        sortOrder: listItems.length
      };
      listItems.push(existing);
      this._saveToStorage('list_items', listItems);
    }
    const watchlistCount = listItems.filter((li) => li.listType === 'watchlist').length;
    return {
      success: true,
      message: 'Vehicle added to watchlist.',
      listItem: existing,
      watchlistCount
    };
  }

  // addVehicleToSpecialInterestList
  addVehicleToSpecialInterestList(vehicleId, source = 'manual') {
    let listItems = this._getFromStorage('list_items');
    let existing = listItems.find((li) => li.listType === 'special_interest' && li.vehicleId === vehicleId) || null;
    if (!existing) {
      existing = {
        id: this._generateId('li'),
        listType: 'special_interest',
        itemType: 'vehicle',
        generationId: null,
        vehicleId,
        note: '',
        source: source || 'manual',
        sourceComparisonId: null,
        createdAt: new Date().toISOString(),
        sortOrder: listItems.length
      };
      listItems.push(existing);
      this._saveToStorage('list_items', listItems);
    }
    const specialInterestCount = listItems.filter((li) => li.listType === 'special_interest').length;
    return {
      success: true,
      message: 'Vehicle added to special-interest list.',
      listItem: existing,
      specialInterestCount
    };
  }

  // getAdvancedSearchFilterOptions
  getAdvancedSearchFilterOptions(browseMode, context = {}) {
    context = context || {};
    // Values based on Vehicle enums
    const fuelTypeOptions = [
      { value: 'gasoline', label: 'Gasoline' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'electric', label: 'Electric' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'plug_in_hybrid', label: 'Plug-in hybrid' },
      { value: 'other', label: 'Other' }
    ];

    const bodyStyleOptions = [
      { value: 'suv_crossover', label: 'SUV / Crossover' },
      { value: 'wagon_estate', label: 'Wagon / Estate' },
      { value: 'coupe', label: 'Coupe' },
      { value: 'convertible', label: 'Convertible' },
      { value: 'sedan', label: 'Sedan' },
      { value: 'hatchback', label: 'Hatchback' },
      { value: 'minivan', label: 'Minivan' },
      { value: 'pickup_truck', label: 'Pickup truck' },
      { value: 'other', label: 'Other' }
    ];

    const transmissionOptions = [
      { value: 'manual', label: 'Manual' },
      { value: 'automatic', label: 'Automatic' },
      { value: 'cvt', label: 'CVT' },
      { value: 'dual_clutch', label: 'Dual-clutch' },
      { value: 'other', label: 'Other' }
    ];

    const marketRegionOptions = [
      { value: 'global', label: 'Global' },
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia', label: 'Asia' },
      { value: 'japan', label: 'Japan' },
      { value: 'other', label: 'Other' }
    ];

    const categoryOptions = [
      { value: 'compact_cars', label: 'Compact cars' },
      { value: 'midsize_cars', label: 'Midsize cars' },
      { value: 'fullsize_cars', label: 'Full-size cars' },
      { value: 'sports_cars', label: 'Sports cars' },
      { value: 'luxury_cars', label: 'Luxury cars' },
      { value: 'suvs_crossovers', label: 'SUVs / Crossovers' },
      { value: 'trucks', label: 'Trucks' },
      { value: 'minivans', label: 'Minivans' },
      { value: 'wagons_estates', label: 'Wagons / Estates' },
      { value: 'electric_vehicles', label: 'Electric vehicles' },
      { value: 'other', label: 'Other' }
    ];

    const safetyRatingOptions = [
      { value: 5, label: '5 stars' },
      { value: 4, label: '4+ stars' },
      { value: 3, label: '3+ stars' },
      { value: 2, label: '2+ stars' },
      { value: 1, label: '1+ stars' }
    ];

    // Sort options dependent on browseMode but mostly shared
    const sortOptions = [
      { id: 'range_desc', label: 'Range (high to low)' },
      { id: 'base_price_asc', label: 'Base price (low to high)' },
      { id: 'base_price_desc', label: 'Base price (high to low)' },
      { id: 'horsepower_desc', label: 'Horsepower (high to low)' },
      { id: 'cargo_volume_desc', label: 'Cargo volume (high to low)' },
      { id: 'reliability_rating_desc', label: 'Reliability rating (high to low)' },
      { id: 'zero_to_sixty_asc', label: '0013 60 mph (low to high)' },
      { id: 'highway_mpg_desc', label: 'Highway MPG (high to low)' },
      { id: 'combined_mpg_desc', label: 'Combined MPG (high to low)' }
    ];

    const defaultFilters = {
      isLimitedEdition: browseMode === 'special_editions' || !!context.limitToSpecialEditions,
      isSpecialPerformanceModel: browseMode === 'performance',
      category: context.preselectedCategory || null,
      bodyStyles: context.preselectedBodyStyle ? [context.preselectedBodyStyle] : []
    };

    return {
      fuelTypeOptions,
      bodyStyleOptions,
      transmissionOptions,
      marketRegionOptions,
      categoryOptions,
      safetyRatingOptions,
      sortOptions,
      defaultFilters
    };
  }

  // searchVehicles
  searchVehicles(query, browseMode, filters = {}, sortBy, page = 1, pageSize = 20) {
    const vehicles = this._getFromStorage('vehicles');
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const generations = this._getFromStorage('generations');
    const recalls = this._getFromStorage('recalls');

    const modelsById = this._indexById(models);
    const makesById = this._indexById(makes);
    const gensById = this._indexById(generations);

    const q = (query || '').trim().toLowerCase();

    let filtered = vehicles.slice();

    // Free text query on make + model + trim
    if (q) {
      filtered = filtered.filter((v) => {
        const model = modelsById[v.modelId];
        const make = model ? makesById[model.makeId] : makesById[v.makeId];
        const parts = [];
        if (make && make.name) parts.push(make.name);
        if (model && model.name) parts.push(model.name);
        if (v.trimName) parts.push(v.trimName);
        const full = parts.join(' ').toLowerCase();
        return full.includes(q);
      });
    }

    // Filters
    if (filters.marketRegion) {
      filtered = filtered.filter((v) => v.marketRegion === filters.marketRegion);
    }

    if (Array.isArray(filters.bodyStyles) && filters.bodyStyles.length > 0) {
      const set = new Set(filters.bodyStyles);
      filtered = filtered.filter((v) => set.has(v.bodyStyle));
    }

    if (Array.isArray(filters.fuelTypes) && filters.fuelTypes.length > 0) {
      const set = new Set(filters.fuelTypes);
      filtered = filtered.filter((v) => set.has(v.fuelType));
    }

    if (Array.isArray(filters.transmissionTypes) && filters.transmissionTypes.length > 0) {
      const set = new Set(filters.transmissionTypes);
      filtered = filtered.filter((v) => set.has(v.transmission));
    }

    if (typeof filters.modelYearMin === 'number') {
      filtered = filtered.filter((v) => typeof v.modelYear === 'number' && v.modelYear >= filters.modelYearMin);
    }

    if (typeof filters.modelYearMax === 'number') {
      filtered = filtered.filter((v) => typeof v.modelYear === 'number' && v.modelYear <= filters.modelYearMax);
    }

    if (typeof filters.electricRangeMilesMin === 'number') {
      filtered = filtered.filter((v) => typeof v.electricRangeMiles === 'number' && v.electricRangeMiles >= filters.electricRangeMilesMin);
    }

    if (typeof filters.ownerRatingMin === 'number') {
      filtered = filtered.filter((v) => typeof v.ownerRating === 'number' && v.ownerRating >= filters.ownerRatingMin);
    }

    if (typeof filters.reliabilityRatingMin === 'number') {
      filtered = filtered.filter((v) => typeof v.reliabilityRating === 'number' && v.reliabilityRating >= filters.reliabilityRatingMin);
    }

    if (typeof filters.safetyRecallCountMax === 'number') {
      filtered = filtered.filter((v) => {
        const computed = this._computeSafetyRecallCountForVehicle(v.id, recalls);
        const count = typeof v.safetyRecallCount === 'number' ? v.safetyRecallCount : computed;
        return count <= filters.safetyRecallCountMax;
      });
    }

    if (typeof filters.seatingCapacityMin === 'number') {
      filtered = filtered.filter((v) => typeof v.seatingCapacity === 'number' && v.seatingCapacity >= filters.seatingCapacityMin);
    }

    if (typeof filters.safetyRatingOverallMin === 'number') {
      filtered = filtered.filter((v) => typeof v.safetyRatingOverall === 'number' && v.safetyRatingOverall >= filters.safetyRatingOverallMin);
    }

    if (typeof filters.cargoVolumeLitersMin === 'number') {
      filtered = filtered.filter((v) => typeof v.cargoVolumeLiters === 'number' && v.cargoVolumeLiters >= filters.cargoVolumeLitersMin);
    }

    if (typeof filters.highwayMpgMin === 'number') {
      filtered = filtered.filter((v) => typeof v.highwayMpg === 'number' && v.highwayMpg >= filters.highwayMpgMin);
    }

    if (typeof filters.zeroToSixtyMphSecondsMax === 'number') {
      filtered = filtered.filter((v) => typeof v.zeroToSixtyMphSeconds === 'number' && v.zeroToSixtyMphSeconds <= filters.zeroToSixtyMphSecondsMax);
    }

    if (typeof filters.basePriceMax === 'number') {
      filtered = filtered.filter((v) => typeof v.basePrice === 'number' && v.basePrice <= filters.basePriceMax);
    }

    if (typeof filters.productionVolumeMax === 'number') {
      filtered = filtered.filter((v) => typeof v.productionVolumeUnits === 'number' && v.productionVolumeUnits <= filters.productionVolumeMax);
    }

    if (typeof filters.editionFirstModelYearMin === 'number') {
      filtered = filtered.filter((v) => typeof v.editionFirstModelYear === 'number' && v.editionFirstModelYear >= filters.editionFirstModelYearMin);
    }

    if (filters.isLimitedEdition === true) {
      filtered = filtered.filter((v) => v.isLimitedEdition === true);
    }

    if (filters.category) {
      filtered = filtered.filter((v) => v.category === filters.category);
    }

    if (filters.isSpecialPerformanceModel === true) {
      filtered = filtered.filter((v) => v.isSpecialPerformanceModel === true);
    }

    const sorted = this._sortVehicles(filtered, sortBy);

    const totalCount = sorted.length;
    const start = Math.max((page - 1) * pageSize, 0);
    const end = start + pageSize;
    const slice = sorted.slice(start, end);

    const enrichedResults = slice.map((v) => this._attachRelationsToVehicle(v, modelsById, makesById, gensById));

    return {
      results: enrichedResults,
      totalCount,
      page,
      pageSize,
      appliedSort: sortBy || null
    };
  }

  // openComparisonForGenerations
  openComparisonForGenerations(generationIds, title) {
    const generations = this._getFromStorage('generations');
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const comparisons = this._getFromStorage('comparisons');
    const comparisonItems = this._getFromStorage('comparison_items');

    const comparison = {
      id: this._generateId('cmp'),
      comparisonType: 'generation',
      title: title || null,
      notes: '',
      createdAt: new Date().toISOString()
    };
    comparisons.push(comparison);

    const newItems = [];
    generationIds.forEach((genId, index) => {
      const item = {
        id: this._generateId('cmpi'),
        comparisonId: comparison.id,
        itemType: 'generation',
        generationId: genId,
        vehicleId: null,
        isPreferred: false,
        position: index
      };
      newItems.push(item);
      comparisonItems.push(item);
    });

    this._saveToStorage('comparisons', comparisons);
    this._saveToStorage('comparison_items', comparisonItems);

    const gensById = this._indexById(generations);
    const modelsById = this._indexById(models);
    const makesById = this._indexById(makes);

    const generationsInComparisonRaw = generationIds
      .map((id) => gensById[id])
      .filter((g) => !!g);

    const generationsInComparison = generationsInComparisonRaw.map((g) =>
      this._attachRelationsToGeneration(g, modelsById, makesById)
    );

    const modelsSet = new Map();
    for (const g of generationsInComparisonRaw) {
      const m = modelsById[g.modelId];
      if (m && !modelsSet.has(m.id)) modelsSet.set(m.id, m);
    }
    const makesSet = new Map();
    for (const m of modelsSet.values()) {
      const mk = makesById[m.makeId];
      if (mk && !makesSet.has(mk.id)) makesSet.set(mk.id, mk);
    }

    const vehiclesById = {}; // none for generation comparison

    const enrichedItems = newItems.map((item) =>
      this._attachRelationsToComparisonItem(item, comparison, vehiclesById, gensById, modelsById, makesById)
    );

    return {
      comparison,
      comparisonItems: enrichedItems,
      generations: generationsInComparison,
      models: Array.from(modelsSet.values()),
      makes: Array.from(makesSet.values())
    };
  }

  // openComparisonForVehicles
  openComparisonForVehicles(vehicleIds, title) {
    const vehicles = this._getFromStorage('vehicles');
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const generations = this._getFromStorage('generations');
    const comparisons = this._getFromStorage('comparisons');
    const comparisonItems = this._getFromStorage('comparison_items');

    const comparison = {
      id: this._generateId('cmp'),
      comparisonType: 'vehicle',
      title: title || null,
      notes: '',
      createdAt: new Date().toISOString()
    };
    comparisons.push(comparison);

    const newItems = [];
    vehicleIds.forEach((vehId, index) => {
      const item = {
        id: this._generateId('cmpi'),
        comparisonId: comparison.id,
        itemType: 'vehicle',
        generationId: null,
        vehicleId: vehId,
        isPreferred: false,
        position: index
      };
      newItems.push(item);
      comparisonItems.push(item);
    });

    this._saveToStorage('comparisons', comparisons);
    this._saveToStorage('comparison_items', comparisonItems);

    const vehiclesById = this._indexById(vehicles);
    const modelsById = this._indexById(models);
    const makesById = this._indexById(makes);
    const gensById = this._indexById(generations);

    const vehiclesInComparisonRaw = vehicleIds
      .map((id) => vehiclesById[id])
      .filter((v) => !!v);

    const vehiclesInComparison = vehiclesInComparisonRaw.map((v) =>
      this._attachRelationsToVehicle(v, modelsById, makesById, gensById)
    );

    const generationsSet = new Map();
    for (const v of vehiclesInComparisonRaw) {
      if (v.generationId && gensById[v.generationId]) {
        const g = gensById[v.generationId];
        if (!generationsSet.has(g.id)) generationsSet.set(g.id, g);
      }
    }

    const modelsSet = new Map();
    for (const v of vehiclesInComparisonRaw) {
      const m = modelsById[v.modelId];
      if (m && !modelsSet.has(m.id)) modelsSet.set(m.id, m);
    }

    const makesSet = new Map();
    for (const m of modelsSet.values()) {
      const mk = makesById[m.makeId];
      if (mk && !makesSet.has(mk.id)) makesSet.set(mk.id, mk);
    }

    const enrichedItems = newItems.map((item) =>
      this._attachRelationsToComparisonItem(item, comparison, vehiclesById, gensById, modelsById, makesById)
    );

    return {
      comparison,
      comparisonItems: enrichedItems,
      vehicles: vehiclesInComparison,
      models: Array.from(modelsSet.values()),
      makes: Array.from(makesSet.values()),
      generations: Array.from(generationsSet.values())
    };
  }

  // getComparisonDetails
  getComparisonDetails(comparisonId) {
    const comparisons = this._getFromStorage('comparisons');
    const comparisonItems = this._getFromStorage('comparison_items');
    const vehicles = this._getFromStorage('vehicles');
    const generations = this._getFromStorage('generations');
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');

    const comparison = comparisons.find((c) => c.id === comparisonId) || null;
    const itemsForComp = comparison
      ? comparisonItems.filter((ci) => ci.comparisonId === comparison.id)
      : [];

    const vehiclesById = this._indexById(vehicles);
    const gensById = this._indexById(generations);
    const modelsById = this._indexById(models);
    const makesById = this._indexById(makes);

    const vehicleSet = new Map();
    const genSet = new Map();
    const modelSet = new Map();
    const makeSet = new Map();

    for (const item of itemsForComp) {
      if (item.itemType === 'vehicle' && item.vehicleId && vehiclesById[item.vehicleId]) {
        const v = vehiclesById[item.vehicleId];
        if (!vehicleSet.has(v.id)) vehicleSet.set(v.id, v);
        const m = modelsById[v.modelId];
        if (m && !modelSet.has(m.id)) modelSet.set(m.id, m);
        const mk = m ? makesById[m.makeId] : (v.makeId ? makesById[v.makeId] : null);
        if (mk && !makeSet.has(mk.id)) makeSet.set(mk.id, mk);
        if (v.generationId && gensById[v.generationId] && !genSet.has(v.generationId)) {
          genSet.set(v.generationId, gensById[v.generationId]);
        }
      } else if (item.itemType === 'generation' && item.generationId && gensById[item.generationId]) {
        const g = gensById[item.generationId];
        if (!genSet.has(g.id)) genSet.set(g.id, g);
        const m = modelsById[g.modelId];
        if (m && !modelSet.has(m.id)) modelSet.set(m.id, m);
        const mk = m ? makesById[m.makeId] : null;
        if (mk && !makeSet.has(mk.id)) makeSet.set(mk.id, mk);
      }
    }

    const enrichedVehicles = Array.from(vehicleSet.values()).map((v) =>
      this._attachRelationsToVehicle(v, modelsById, makesById, gensById)
    );
    const enrichedGenerations = Array.from(genSet.values()).map((g) =>
      this._attachRelationsToGeneration(g, modelsById, makesById)
    );

    const enrichedItems = itemsForComp.map((item) =>
      this._attachRelationsToComparisonItem(item, comparison, vehiclesById, gensById, modelsById, makesById)
    );

    return {
      comparison,
      comparisonItems: enrichedItems,
      vehicles: enrichedVehicles,
      generations: enrichedGenerations,
      models: Array.from(modelSet.values()),
      makes: Array.from(makeSet.values())
    };
  }

  // markPreferredInComparison
  markPreferredInComparison(comparisonId, itemType, generationId, vehicleId) {
    const comparisons = this._getFromStorage('comparisons');
    let comparisonItems = this._getFromStorage('comparison_items');
    let listItems = this._getFromStorage('list_items');

    const comparison = comparisons.find((c) => c.id === comparisonId) || null;
    if (!comparison) {
      return {
        success: false,
        message: 'Comparison not found.',
        comparison: null,
        comparisonItems: [],
        preferredListItem: null
      };
    }

    const itemsForComp = comparisonItems.filter((ci) => ci.comparisonId === comparisonId);
    if (!itemsForComp.length) {
      return {
        success: false,
        message: 'No items in this comparison.',
        comparison,
        comparisonItems: [],
        preferredListItem: null
      };
    }

    let targetId = null;
    if (itemType === 'generation') {
      targetId = generationId;
    } else if (itemType === 'vehicle') {
      targetId = vehicleId;
    }

    if (!targetId) {
      return {
        success: false,
        message: 'Missing target id for preferred item.',
        comparison,
        comparisonItems: itemsForComp,
        preferredListItem: null
      };
    }

    // Update isPreferred flags
    comparisonItems = comparisonItems.map((ci) => {
      if (ci.comparisonId !== comparisonId) return ci;
      if (ci.itemType !== itemType) return { ...ci, isPreferred: false };
      if (itemType === 'generation' && ci.generationId === generationId) {
        return { ...ci, isPreferred: true };
      }
      if (itemType === 'vehicle' && ci.vehicleId === vehicleId) {
        return { ...ci, isPreferred: true };
      }
      return { ...ci, isPreferred: false };
    });

    this._saveToStorage('comparison_items', comparisonItems);

    // Create preferred ListItem
    let preferredItem = listItems.find((li) =>
      li.listType === 'preferred' &&
      li.itemType === itemType &&
      (itemType === 'generation' ? li.generationId === generationId : li.vehicleId === vehicleId) &&
      li.sourceComparisonId === comparisonId
    ) || null;

    if (!preferredItem) {
      preferredItem = {
        id: this._generateId('li'),
        listType: 'preferred',
        itemType,
        generationId: itemType === 'generation' ? generationId : null,
        vehicleId: itemType === 'vehicle' ? vehicleId : null,
        note: '',
        source: 'comparison',
        sourceComparisonId: comparisonId,
        createdAt: new Date().toISOString(),
        sortOrder: listItems.length
      };
      listItems.push(preferredItem);
      this._saveToStorage('list_items', listItems);
    }

    // Enrich for return
    const vehicles = this._getFromStorage('vehicles');
    const generations = this._getFromStorage('generations');
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');

    const vehiclesById = this._indexById(vehicles);
    const gensById = this._indexById(generations);
    const modelsById = this._indexById(models);
    const makesById = this._indexById(makes);

    const itemsForCompUpdated = comparisonItems.filter((ci) => ci.comparisonId === comparisonId);
    const enrichedItems = itemsForCompUpdated.map((item) =>
      this._attachRelationsToComparisonItem(item, comparison, vehiclesById, gensById, modelsById, makesById)
    );

    return {
      success: true,
      message: 'Preferred item set for this comparison.',
      comparison,
      comparisonItems: enrichedItems,
      preferredListItem: preferredItem
    };
  }

  // getMyListsDetail
  getMyListsDetail() {
    const listItems = this._getFromStorage('list_items');
    const vehicles = this._getFromStorage('vehicles');
    const generations = this._getFromStorage('generations');
    const comparisons = this._getFromStorage('comparisons');
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');

    const vehiclesById = this._indexById(vehicles);
    const generationsById = this._indexById(generations);
    const comparisonsById = this._indexById(comparisons);
    const modelsById = this._indexById(models);
    const makesById = this._indexById(makes);

    const bookmarkedGenerationItemsRaw = listItems.filter((li) => li.listType === 'bookmark_generation');
    const favoriteItemsRaw = listItems.filter((li) => li.listType === 'favorite');
    const watchlistItemsRaw = listItems.filter((li) => li.listType === 'watchlist');
    const specialInterestItemsRaw = listItems.filter((li) => li.listType === 'special_interest');
    const preferredItemsRaw = listItems.filter((li) => li.listType === 'preferred');

    const bookmarkedGenerationItems = bookmarkedGenerationItemsRaw.map((li) =>
      this._attachRelationsToListItem(li, vehiclesById, generationsById, comparisonsById, modelsById, makesById)
    );
    const favoriteItems = favoriteItemsRaw.map((li) =>
      this._attachRelationsToListItem(li, vehiclesById, generationsById, comparisonsById, modelsById, makesById)
    );
    const watchlistItems = watchlistItemsRaw.map((li) =>
      this._attachRelationsToListItem(li, vehiclesById, generationsById, comparisonsById, modelsById, makesById)
    );
    const specialInterestItems = specialInterestItemsRaw.map((li) =>
      this._attachRelationsToListItem(li, vehiclesById, generationsById, comparisonsById, modelsById, makesById)
    );
    const preferredItems = preferredItemsRaw.map((li) =>
      this._attachRelationsToListItem(li, vehiclesById, generationsById, comparisonsById, modelsById, makesById)
    );

    const bookmarkedGenSet = new Map();
    for (const li of bookmarkedGenerationItemsRaw) {
      if (li.generationId && generationsById[li.generationId]) {
        bookmarkedGenSet.set(li.generationId, generationsById[li.generationId]);
      }
    }
    const favoriteVehSet = new Map();
    for (const li of favoriteItemsRaw) {
      if (li.vehicleId && vehiclesById[li.vehicleId]) {
        favoriteVehSet.set(li.vehicleId, vehiclesById[li.vehicleId]);
      }
    }
    const watchlistVehSet = new Map();
    for (const li of watchlistItemsRaw) {
      if (li.vehicleId && vehiclesById[li.vehicleId]) {
        watchlistVehSet.set(li.vehicleId, vehiclesById[li.vehicleId]);
      }
    }
    const specialVehSet = new Map();
    for (const li of specialInterestItemsRaw) {
      if (li.vehicleId && vehiclesById[li.vehicleId]) {
        specialVehSet.set(li.vehicleId, vehiclesById[li.vehicleId]);
      }
    }
    const preferredGenSet = new Map();
    const preferredVehSet = new Map();
    for (const li of preferredItemsRaw) {
      if (li.generationId && generationsById[li.generationId]) {
        preferredGenSet.set(li.generationId, generationsById[li.generationId]);
      }
      if (li.vehicleId && vehiclesById[li.vehicleId]) {
        preferredVehSet.set(li.vehicleId, vehiclesById[li.vehicleId]);
      }
    }

    const bookmarkedGenerationsRaw = Array.from(bookmarkedGenSet.values());
    const favoriteVehiclesRaw = Array.from(favoriteVehSet.values());
    const watchlistVehiclesRaw = Array.from(watchlistVehSet.values());
    const specialInterestVehiclesRaw = Array.from(specialVehSet.values());
    const preferredGenerationsRaw = Array.from(preferredGenSet.values());
    const preferredVehiclesRaw = Array.from(preferredVehSet.values());

    const bookmarkedGenerations = bookmarkedGenerationsRaw.map((g) =>
      this._attachRelationsToGeneration(g, modelsById, makesById)
    );
    const favoriteVehicles = favoriteVehiclesRaw.map((v) =>
      this._attachRelationsToVehicle(v, modelsById, makesById, generationsById)
    );
    const watchlistVehicles = watchlistVehiclesRaw.map((v) =>
      this._attachRelationsToVehicle(v, modelsById, makesById, generationsById)
    );
    const specialInterestVehicles = specialInterestVehiclesRaw.map((v) =>
      this._attachRelationsToVehicle(v, modelsById, makesById, generationsById)
    );
    const preferredGenerations = preferredGenerationsRaw.map((g) =>
      this._attachRelationsToGeneration(g, modelsById, makesById)
    );
    const preferredVehicles = preferredVehiclesRaw.map((v) =>
      this._attachRelationsToVehicle(v, modelsById, makesById, generationsById)
    );

    return {
      bookmarkedGenerationItems,
      bookmarkedGenerations,
      favoriteItems,
      favoriteVehicles,
      watchlistItems,
      watchlistVehicles,
      specialInterestItems,
      specialInterestVehicles,
      preferredItems,
      preferredGenerations,
      preferredVehicles
    };
  }

  // removeListItem
  removeListItem(listItemId) {
    let listItems = this._getFromStorage('list_items');
    const idx = listItems.findIndex((li) => li.id === listItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'List item not found.'
      };
    }
    listItems.splice(idx, 1);
    this._saveToStorage('list_items', listItems);
    return {
      success: true,
      message: 'List item removed.'
    };
  }

  // reorderListItems
  reorderListItems(listType, orderedListItemIds) {
    let listItems = this._getFromStorage('list_items');
    const orderMap = new Map();
    orderedListItemIds.forEach((id, index) => {
      orderMap.set(id, index);
    });

    listItems = listItems.map((li) => {
      if (li.listType !== listType) return li;
      const idx = orderMap.get(li.id);
      if (typeof idx === 'number') {
        return { ...li, sortOrder: idx };
      }
      return li;
    });

    this._saveToStorage('list_items', listItems);

    return {
      success: true,
      message: 'List reordered.'
    };
  }

  // getPrintFriendlySpecs
  getPrintFriendlySpecs(vehicleId) {
    const vehicles = this._getFromStorage('vehicles');
    const models = this._getFromStorage('models');
    const makes = this._getFromStorage('makes');
    const generations = this._getFromStorage('generations');

    const vehicle = vehicles.find((v) => v.id === vehicleId) || null;
    const model = vehicle ? models.find((m) => m.id === vehicle.modelId) || null : null;
    const make = model ? makes.find((mk) => mk.id === model.makeId) || null : (vehicle && vehicle.makeId ? makes.find((mk) => mk.id === vehicle.makeId) || null : null);
    const generation = vehicle && vehicle.generationId
      ? generations.find((g) => g.id === vehicle.generationId) || null
      : null;

    // Instrumentation for task completion tracking
    try {
      if (vehicle) {
        localStorage.setItem('task9_printSpecsVehicleId', vehicleId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const specs = {
      modelYear: vehicle ? vehicle.modelYear : null,
      trimName: vehicle ? vehicle.trimName || '' : '',
      bodyStyle: vehicle ? vehicle.bodyStyle || null : null,
      fuelType: vehicle ? vehicle.fuelType || null : null,
      transmission: vehicle ? vehicle.transmission || null : null,
      drivetrain: vehicle ? vehicle.drivetrain || null : null,
      horsepower: vehicle ? vehicle.horsepower || null : null,
      zeroToSixtyMphSeconds: vehicle ? vehicle.zeroToSixtyMphSeconds || null : null,
      combinedMpg: vehicle ? vehicle.combinedMpg || null : null,
      highwayMpg: vehicle ? vehicle.highwayMpg || null : null,
      electricRangeMiles: vehicle ? vehicle.electricRangeMiles || null : null,
      seatingCapacity: vehicle ? vehicle.seatingCapacity || null : null,
      cargoVolumeLiters: vehicle ? vehicle.cargoVolumeLiters || null : null,
      safetyRatingOverall: vehicle ? vehicle.safetyRatingOverall || null : null,
      basePrice: vehicle ? vehicle.basePrice || null : null,
      basePriceCurrency: vehicle ? vehicle.basePriceCurrency || null : null
    };

    return {
      vehicle,
      make,
      model,
      generation,
      specs
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', null);
    if (about && typeof about === 'object') {
      return about;
    }
    // Fallback minimal
    return {
      mission: 'Provide automotive reference data based on what is stored locally.',
      scope: 'Depends entirely on the dataset stored in localStorage.',
      dataSources: [],
      coverage: {
        marketsCovered: 'Not specified',
        yearsCovered: 'Not specified',
        bodyStylesCovered: 'Not specified'
      },
      legal: 'Data is provided as-is.'
    };
  }

  // getHelpPageContent
  getHelpPageContent() {
    const help = this._getFromStorage('help_page_content', null);
    if (help && typeof help === 'object') {
      return help;
    }
    // Fallback minimal
    return {
      intro: 'Use search and filters to explore automotive models and save items to your lists.',
      sections: [],
      faqs: []
    };
  }

  // getBrowseModePreference
  getBrowseModePreference(page) {
    const prefs = this._getFromStorage('browse_mode_preferences');
    const pref = prefs.find((p) => p.page === page) || null;
    return {
      found: !!pref,
      preference: pref || null
    };
  }

  // setBrowseModePreference
  setBrowseModePreference(page, mode) {
    const prefs = this._getFromStorage('browse_mode_preferences');
    let pref = prefs.find((p) => p.page === page) || null;
    if (pref) {
      pref = { ...pref, mode, lastUsedAt: new Date().toISOString() };
    } else {
      pref = {
        id: this._generateId('bmp'),
        page,
        mode,
        lastUsedAt: new Date().toISOString()
      };
    }
    this._persistBrowseModePreference(pref);
    return {
      success: true,
      preference: pref
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