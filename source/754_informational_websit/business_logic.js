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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keysWithDefaults = {
      tomato_varieties: [],
      diseases: [],
      traits: [],
      locations: [],
      planting_calendar_states: [],
      garden_plan_entries: [],
      favorite_items: [],
      comparison_items: [],
      reviews: [],
      quizzes: [],
      quiz_questions: [],
      quiz_options: [],
      quiz_sessions: [],
      home_page_content: null,
      guides_overview_content: null,
      tools_overview_content: null,
      about_page_content: null,
      help_faq_content: null,
      contact_messages: []
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(keysWithDefaults[key]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : null;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : null;
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

  _normalizeString(value) {
    return (value || '').toString().toLowerCase();
  }

  _dateAddDays(isoDate, days) {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // -------------------- Private entity store helpers --------------------

  _getOrInitializeFavoritesStore() {
    let favorites = this._getFromStorage('favorite_items', null);
    if (!Array.isArray(favorites)) {
      favorites = [];
      this._saveToStorage('favorite_items', favorites);
    }
    return favorites;
  }

  _getOrInitializeComparisonStore() {
    let items = this._getFromStorage('comparison_items', null);
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('comparison_items', items);
    }
    return items;
  }

  _getOrInitializeGardenPlanStore() {
    let entries = this._getFromStorage('garden_plan_entries', null);
    if (!Array.isArray(entries)) {
      entries = [];
      this._saveToStorage('garden_plan_entries', entries);
    }
    return entries;
  }

  _getOrInitializePlantingCalendarState() {
    let states = this._getFromStorage('planting_calendar_states', null);
    if (!Array.isArray(states)) {
      states = [];
    }
    let state = states[0] || null;
    if (!state) {
      state = {
        id: this._generateId('plantcal'),
        zip_code: null,
        location_id: null,
        season: null,
        selected_variety_id: null,
        generated_at: null
      };
      states.push(state);
      this._saveToStorage('planting_calendar_states', states);
    }
    return state;
  }

  _recalculateVarietyAverageRating(varietyId) {
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const reviews = this._getFromStorage('reviews', []);
    const variety = tomatoVarieties.find((v) => v.id === varietyId);
    if (!variety) return { averageRating: 0, ratingCount: 0 };

    const relatedReviews = reviews.filter((r) => r.variety_id === varietyId);
    const ratingCount = relatedReviews.length;
    let averageRating = 0;
    if (ratingCount > 0) {
      const sum = relatedReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
      averageRating = sum / ratingCount;
    }

    variety.average_rating = averageRating;
    variety.rating_count = ratingCount;
    this._saveToStorage('tomato_varieties', tomatoVarieties);

    return { averageRating, ratingCount };
  }

  _runTomatoFinderRecommendationEngine(optionValueCodes) {
    const codes = Array.isArray(optionValueCodes) ? optionValueCodes : [];
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);

    if (tomatoVarieties.length === 0) {
      return [];
    }

    const hasCode = (code) => codes.indexOf(code) !== -1;

    const results = tomatoVarieties.map((v) => {
      let score = 0;

      const uses = Array.isArray(v.recommended_uses) ? v.recommended_uses : [];
      const traits = Array.isArray(v.trait_codes) ? v.trait_codes : [];
      const growth = v.growth_habit;
      const dMin = Number(v.days_to_maturity_min) || 0;
      const dMax = Number(v.days_to_maturity_max) || dMin;

      if (hasCode('use_sauce_canning')) {
        if (uses.indexOf('sauce_canning') !== -1 || uses.indexOf('canning') !== -1) {
          score += 2;
        }
      }

      if (hasCode('use_fresh_salads') || hasCode('use_fresh_eating')) {
        if (uses.indexOf('salads') !== -1 || uses.indexOf('fresh_salads') !== -1 || uses.indexOf('fresh_eating') !== -1) {
          score += 2;
        }
        if (traits.indexOf('salad_specialty') !== -1) {
          score += 1;
        }
      }

      if (hasCode('space_small_balcony_patio') || hasCode('space_containers_only')) {
        if (growth === 'dwarf_compact' || growth === 'container') {
          score += 2;
        }
        if (traits.indexOf('container_suitable') !== -1) {
          score += 1;
        }
      }

      if (hasCode('harvest_early')) {
        if (traits.indexOf('early_harvest') !== -1 || dMax <= 65) {
          score += 2;
        }
      }
      if (hasCode('harvest_main_season')) {
        if (dMin >= 70 && dMax <= 80) {
          score += 1;
        }
      }
      if (hasCode('harvest_late')) {
        if (dMin > 80 || dMax > 80) {
          score += 1;
        }
      }

      if (hasCode('flavor_sweet') && v.fruit_type === 'cherry') {
        score += 1;
      }

      const rating = Number(v.average_rating) || 0;

      return {
        varietyId: v.id,
        score,
        rating
      };
    });

    let filtered = results.filter((r) => r.score > 0);
    if (filtered.length === 0) {
      filtered = results;
    }

    filtered.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.rating - a.rating;
    });

    return filtered;
  }

  // -------------------- Interface implementations --------------------

  // getHomePageContent
  getHomePageContent() {
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const quizzes = this._getFromStorage('quizzes', []);
    const homeConfig = this._getFromStorage('home_page_content', null) || {};

    let featuredVarieties = [];
    if (Array.isArray(homeConfig.featuredVarietyIds)) {
      featuredVarieties = homeConfig.featuredVarietyIds
        .map((id) => tomatoVarieties.find((v) => v.id === id))
        .filter((v) => !!v);
    } else {
      featuredVarieties = tomatoVarieties
        .slice()
        .sort((a, b) => (Number(b.average_rating || 0) - Number(a.average_rating || 0)))
        .slice(0, 6);
    }

    const popularGuides = Array.isArray(homeConfig.popularGuides) ? homeConfig.popularGuides : [];

    let quizHighlight = null;
    if (homeConfig.quizHighlight) {
      quizHighlight = homeConfig.quizHighlight;
    } else {
      const quiz = quizzes.find((q) => q.slug === 'tomato_finder_quiz' && q.status === 'active');
      if (quiz) {
        quizHighlight = {
          quizId: quiz.id,
          slug: quiz.slug,
          title: quiz.title,
          description: quiz.description || ''
        };
      }
    }

    const toolShortcuts = homeConfig.toolShortcuts || {
      showPlantingCalendarShortcut: true,
      showGardenPlannerShortcut: true
    };

    return {
      featuredVarieties,
      popularGuides,
      quizHighlight,
      toolShortcuts
    };
  }

  // searchVarietiesGlobal(query, sortBy?)
  searchVarietiesGlobal(query, sortBy) {
    const q = this._normalizeString(query || '');
    const sortMode = sortBy || 'relevance';

    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const diseases = this._getFromStorage('diseases', []);
    const traits = this._getFromStorage('traits', []);
    const favorites = this._getOrInitializeFavoritesStore();
    const comparisons = this._getOrInitializeComparisonStore();

    const matches = tomatoVarieties.filter((v) => {
      if (!q) return true;
      const name = this._normalizeString(v.name);
      const slug = this._normalizeString(v.slug);
      const desc = this._normalizeString(v.description);
      const summary = this._normalizeString(v.summary);
      return (
        name.indexOf(q) !== -1 ||
        slug.indexOf(q) !== -1 ||
        desc.indexOf(q) !== -1 ||
        summary.indexOf(q) !== -1
      );
    });

    const scored = matches.map((v) => {
      let relevance = 0;
      if (q) {
        const name = this._normalizeString(v.name);
        if (name === q) relevance += 3;
        else if (name.startsWith(q)) relevance += 2;
        else if (name.indexOf(q) !== -1) relevance += 1;
      }
      const rating = Number(v.average_rating) || 0;
      return { variety: v, relevance, rating };
    });

    scored.sort((a, b) => {
      if (sortMode === 'rating_high_to_low') {
        return b.rating - a.rating;
      }
      if (sortMode === 'name_a_to_z') {
        return a.variety.name.localeCompare(b.variety.name);
      }
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.variety.name.localeCompare(b.variety.name);
    });

    const results = scored.map((item) => {
      const v = item.variety;
      const diseaseResistances = (Array.isArray(v.disease_resistance_ids) ? v.disease_resistance_ids : [])
        .map((id) => diseases.find((d) => d.id === id))
        .filter((d) => !!d);
      const traitObjs = (Array.isArray(v.trait_codes) ? v.trait_codes : [])
        .map((code) => traits.find((t) => t.code === code))
        .filter((t) => !!t);
      const isFavorite = !!favorites.find((f) => f.variety_id === v.id);
      const isInComparison = !!comparisons.find((c) => c.variety_id === v.id);
      return {
        variety: v,
        diseaseResistances,
        traits: traitObjs,
        isFavorite,
        isInComparison
      };
    });

    return {
      query: query || '',
      totalResults: results.length,
      results
    };
  }

  // getVarietyFilterOptions()
  getVarietyFilterOptions() {
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const diseases = this._getFromStorage('diseases', []);
    const traits = this._getFromStorage('traits', []);

    const fruitTypeValues = [
      'cherry',
      'paste_plum',
      'roma',
      'beefsteak',
      'saladette',
      'grape',
      'currant',
      'slicer',
      'other'
    ];
    const heritageTypeValues = ['heirloom', 'hybrid', 'open_pollinated', 'unspecified'];
    const colorValues = [
      'red',
      'yellow',
      'orange',
      'pink',
      'purple',
      'black',
      'green',
      'striped',
      'bicolor',
      'other'
    ];
    const growthHabitValues = [
      'indeterminate',
      'determinate',
      'dwarf_compact',
      'container',
      'bush',
      'vine',
      'unspecified'
    ];

    const labelize = (code) => code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

    const fruitTypes = fruitTypeValues.map((code) => ({ code, label: labelize(code) }));
    const heritageTypes = heritageTypeValues.map((code) => ({ code, label: labelize(code) }));
    const colors = colorValues.map((code) => ({ code, label: labelize(code) }));
    const growthHabits = growthHabitValues.map((code) => ({ code, label: labelize(code) }));

    const recommendedUsesCodesSet = new Set();
    tomatoVarieties.forEach((v) => {
      (Array.isArray(v.recommended_uses) ? v.recommended_uses : []).forEach((u) => {
        if (u) recommendedUsesCodesSet.add(u);
      });
    });
    const recommendedUses = Array.from(recommendedUsesCodesSet).map((code) => ({
      code,
      label: labelize(code)
    }));

    let daysMin = null;
    let daysMax = null;
    let heightMin = null;
    let heightMax = null;
    tomatoVarieties.forEach((v) => {
      const dMin = Number(v.days_to_maturity_min);
      const dMax = Number(v.days_to_maturity_max);
      if (!Number.isNaN(dMin)) {
        if (daysMin === null || dMin < daysMin) daysMin = dMin;
      }
      if (!Number.isNaN(dMax)) {
        if (daysMax === null || dMax > daysMax) daysMax = dMax;
      }
      const hMin = v.plant_height_min_inches != null ? Number(v.plant_height_min_inches) : null;
      const hMax = v.plant_height_max_inches != null ? Number(v.plant_height_max_inches) : null;
      if (hMin != null && !Number.isNaN(hMin)) {
        if (heightMin === null || hMin < heightMin) heightMin = hMin;
      }
      if (hMax != null && !Number.isNaN(hMax)) {
        if (heightMax === null || hMax > heightMax) heightMax = hMax;
      }
    });

    const ratingOptions = [
      { minRating: 0, label: 'Any rating' },
      { minRating: 3, label: '3.0 stars & up' },
      { minRating: 4, label: '4.0 stars & up' }
    ];

    const sortOptions = [
      { code: 'relevance', label: 'Relevance' },
      { code: 'rating_high_to_low', label: 'Rating: High to Low' },
      { code: 'name_a_to_z', label: 'Name: A to Z' },
      { code: 'days_to_maturity_low_to_high', label: 'Days to maturity: Low to High' },
      { code: 'days_to_maturity_high_to_low', label: 'Days to maturity: High to Low' }
    ];

    return {
      fruitTypes,
      heritageTypes,
      colors,
      recommendedUses,
      growthHabits,
      daysToMaturityRange: {
        min: daysMin,
        max: daysMax
      },
      plantHeightRangeInches: {
        min: heightMin,
        max: heightMax
      },
      ratingOptions,
      diseases,
      traits,
      sortOptions
    };
  }

  // searchVarieties(query?, filters?, sortBy?, page?, pageSize?)
  searchVarieties(query, filters, sortBy, page, pageSize) {
    const q = this._normalizeString(query || '');
    const f = filters || {};
    const sortMode = sortBy || 'relevance';
    const currentPage = page || 1;
    const size = pageSize || 20;

    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const diseases = this._getFromStorage('diseases', []);
    const traitsRef = this._getFromStorage('traits', []);
    const favorites = this._getOrInitializeFavoritesStore();
    const comparisons = this._getOrInitializeComparisonStore();

    const matchesQuery = (v) => {
      if (!q) return true;
      const name = this._normalizeString(v.name);
      const slug = this._normalizeString(v.slug);
      const desc = this._normalizeString(v.description);
      const summary = this._normalizeString(v.summary);
      return (
        name.indexOf(q) !== -1 ||
        slug.indexOf(q) !== -1 ||
        desc.indexOf(q) !== -1 ||
        summary.indexOf(q) !== -1
      );
    };

    const growthMatchesContainerTrait = (vGrowth, vTraits, targetGrowths) => {
      if (!Array.isArray(targetGrowths) || targetGrowths.length === 0) return true;
      if (targetGrowths.indexOf(vGrowth) !== -1) return true;
      if (targetGrowths.indexOf('container') !== -1 && Array.isArray(vTraits) && vTraits.indexOf('container_suitable') !== -1) {
        return true;
      }
      return false;
    };

    const resultsAll = tomatoVarieties.filter((v) => {
      if (!matchesQuery(v)) return false;

      if (f.fruitType && v.fruit_type !== f.fruitType) return false;
      if (f.heritageType && v.heritage_type !== f.heritageType) return false;
      if (f.color && v.color !== f.color) return false;

      const usesFilter = Array.isArray(f.recommendedUsesAnyOf) ? f.recommendedUsesAnyOf : [];
      if (usesFilter.length > 0) {
        const uses = Array.isArray(v.recommended_uses) ? v.recommended_uses : [];
        const traitsCodes = Array.isArray(v.trait_codes) ? v.trait_codes : [];
        const intersects = usesFilter.some((code) => uses.indexOf(code) !== -1);
        const saladRequested = usesFilter.indexOf('salads') !== -1 || usesFilter.indexOf('fresh_salads') !== -1;
        const saladTraitMatch = saladRequested && traitsCodes.indexOf('salad_specialty') !== -1;
        if (!intersects && !saladTraitMatch) return false;
      }

      const growthFilter = Array.isArray(f.growthHabitsAnyOf) ? f.growthHabitsAnyOf : [];
      if (growthFilter.length > 0) {
        const traitsCodes = Array.isArray(v.trait_codes) ? v.trait_codes : [];
        if (!growthMatchesContainerTrait(v.growth_habit, traitsCodes, growthFilter)) return false;
      }

      const dMinFilter = f.daysToMaturityMin != null ? Number(f.daysToMaturityMin) : null;
      const dMaxFilter = f.daysToMaturityMax != null ? Number(f.daysToMaturityMax) : null;
      const vMin = Number(v.days_to_maturity_min);
      const vMax = Number(v.days_to_maturity_max);
      if (dMinFilter != null && !Number.isNaN(vMin) && vMin < dMinFilter) return false;
      if (dMaxFilter != null && !Number.isNaN(vMax) && vMax > dMaxFilter) return false;

      const hMaxFilter = f.plantHeightMaxInches != null ? Number(f.plantHeightMaxInches) : null;
      if (hMaxFilter != null) {
        if (v.plant_height_max_inches == null) return false;
        const vHMax = Number(v.plant_height_max_inches);
        if (Number.isNaN(vHMax) || vHMax > hMaxFilter) return false;
      }

      const minRating = f.minAverageRating != null ? Number(f.minAverageRating) : null;
      if (minRating != null) {
        const rating = Number(v.average_rating) || 0;
        if (rating < minRating) return false;
      }

      const diseaseFilter = Array.isArray(f.diseaseResistanceIdsAnyOf) ? f.diseaseResistanceIdsAnyOf : [];
      if (diseaseFilter.length > 0) {
        const resIds = Array.isArray(v.disease_resistance_ids) ? v.disease_resistance_ids : [];
        const intersects = diseaseFilter.some((id) => resIds.indexOf(id) !== -1);
        if (!intersects) return false;
      }

      const traitFilter = Array.isArray(f.traitCodesAnyOf) ? f.traitCodesAnyOf : [];
      if (traitFilter.length > 0) {
        const vTraits = Array.isArray(v.trait_codes) ? v.trait_codes : [];
        const intersects = traitFilter.some((code) => vTraits.indexOf(code) !== -1);
        if (!intersects) return false;
      }

      return true;
    });

    const scored = resultsAll.map((v) => {
      let relevance = 0;
      if (q) {
        const name = this._normalizeString(v.name);
        if (name === q) relevance += 3;
        else if (name.startsWith(q)) relevance += 2;
        else if (name.indexOf(q) !== -1) relevance += 1;
      }
      const rating = Number(v.average_rating) || 0;
      const dMin = Number(v.days_to_maturity_min) || 0;
      const dMax = Number(v.days_to_maturity_max) || 0;
      return { variety: v, relevance, rating, dMin, dMax };
    });

    scored.sort((a, b) => {
      if (sortMode === 'rating_high_to_low') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.variety.name.localeCompare(b.variety.name);
      }
      if (sortMode === 'name_a_to_z') {
        return a.variety.name.localeCompare(b.variety.name);
      }
      if (sortMode === 'days_to_maturity_low_to_high') {
        if (a.dMin !== b.dMin) return a.dMin - b.dMin;
        return a.variety.name.localeCompare(b.variety.name);
      }
      if (sortMode === 'days_to_maturity_high_to_low') {
        if (b.dMax !== a.dMax) return b.dMax - a.dMax;
        return a.variety.name.localeCompare(b.variety.name);
      }
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.variety.name.localeCompare(b.variety.name);
    });

    const totalResults = scored.length;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = scored.slice(start, end);

    const results = pageItems.map((item) => {
      const v = item.variety;
      const diseaseResistances = (Array.isArray(v.disease_resistance_ids) ? v.disease_resistance_ids : [])
        .map((id) => diseases.find((d) => d.id === id))
        .filter((d) => !!d);
      const traitObjs = (Array.isArray(v.trait_codes) ? v.trait_codes : [])
        .map((code) => traitsRef.find((t) => t.code === code))
        .filter((t) => !!t);
      const isFavorite = !!favorites.find((fItem) => fItem.variety_id === v.id);
      const isInComparison = !!comparisons.find((cItem) => cItem.variety_id === v.id);
      return {
        variety: v,
        diseaseResistances,
        traits: traitObjs,
        isFavorite,
        isInComparison
      };
    });

    return {
      page: currentPage,
      pageSize: size,
      totalResults,
      results
    };
  }

  // getVarietyDetails(varietyId)
  getVarietyDetails(varietyId) {
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const diseases = this._getFromStorage('diseases', []);
    const traitsRef = this._getFromStorage('traits', []);
    const favorites = this._getOrInitializeFavoritesStore();
    const comparisons = this._getOrInitializeComparisonStore();

    const variety = tomatoVarieties.find((v) => v.id === varietyId) || null;
    if (!variety) {
      return {
        variety: null,
        diseaseResistances: [],
        traits: [],
        isFavorite: false,
        isInComparison: false,
        ratingSummary: {
          averageRating: 0,
          ratingCount: 0
        }
      };
    }

    const diseaseResistances = (Array.isArray(variety.disease_resistance_ids) ? variety.disease_resistance_ids : [])
      .map((id) => diseases.find((d) => d.id === id))
      .filter((d) => !!d);

    const traitObjs = (Array.isArray(variety.trait_codes) ? variety.trait_codes : [])
      .map((code) => traitsRef.find((t) => t.code === code))
      .filter((t) => !!t);

    const isFavorite = !!favorites.find((f) => f.variety_id === variety.id);
    const isInComparison = !!comparisons.find((c) => c.variety_id === variety.id);

    const ratingSummary = {
      averageRating: Number(variety.average_rating) || 0,
      ratingCount: Number(variety.rating_count) || 0
    };

    return {
      variety,
      diseaseResistances,
      traits: traitObjs,
      isFavorite,
      isInComparison,
      ratingSummary
    };
  }

  // getVarietyReviews(varietyId, page?, pageSize?)
  getVarietyReviews(varietyId, page, pageSize) {
    const currentPage = page || 1;
    const size = pageSize || 10;

    const reviews = this._getFromStorage('reviews', []);
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const variety = tomatoVarieties.find((v) => v.id === varietyId) || null;

    const filtered = reviews
      .filter((r) => r.variety_id === varietyId)
      .slice()
      .sort((a, b) => {
        const da = a.created_at || '';
        const db = b.created_at || '';
        if (db > da) return 1;
        if (db < da) return -1;
        return 0;
      });

    const totalResults = filtered.length;
    const start = (currentPage - 1) * size;
    const pageItems = filtered.slice(start, start + size);

    const reviewsWithVariety = pageItems.map((r) => ({
      ...r,
      variety
    }));

    return {
      page: currentPage,
      pageSize: size,
      totalResults,
      reviews: reviewsWithVariety
    };
  }

  // submitVarietyReview(varietyId, reviewerName, rating, title, comment)
  submitVarietyReview(varietyId, reviewerName, rating, title, comment) {
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const variety = tomatoVarieties.find((v) => v.id === varietyId);
    if (!variety) {
      return {
        success: false,
        review: null,
        updatedRatingSummary: {
          averageRating: 0,
          ratingCount: 0
        },
        message: 'Variety not found.'
      };
    }

    const reviews = this._getFromStorage('reviews', []);
    let safeRating = Number(rating);
    if (Number.isNaN(safeRating)) safeRating = 0;
    if (safeRating < 1) safeRating = 1;
    if (safeRating > 5) safeRating = 5;

    const review = {
      id: this._generateId('rev'),
      variety_id: varietyId,
      reviewer_name: reviewerName,
      rating: safeRating,
      title,
      comment,
      created_at: this._nowIso()
    };

    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    const updatedRatingSummary = this._recalculateVarietyAverageRating(varietyId);

    return {
      success: true,
      review,
      updatedRatingSummary,
      message: 'Review submitted.'
    };
  }

  // toggleFavoriteVariety(varietyId)
  toggleFavoriteVariety(varietyId) {
    let favorites = this._getOrInitializeFavoritesStore();
    const existingIndex = favorites.findIndex((f) => f.variety_id === varietyId);
    let isFavorite = false;
    let favoriteItem = null;

    if (existingIndex !== -1) {
      // Item is already a favorite; keep it and return isFavorite = true for idempotent add behavior
      favoriteItem = favorites[existingIndex];
      isFavorite = true;
    } else {
      favoriteItem = {
        id: this._generateId('fav'),
        variety_id: varietyId,
        added_at: this._nowIso()
      };
      favorites.push(favoriteItem);
      isFavorite = true;
    }

    this._saveToStorage('favorite_items', favorites);

    return {
      isFavorite,
      favoriteItem: isFavorite ? favoriteItem : null
    };
  }

  // getFavoriteVarieties()
  getFavoriteVarieties() {
    const favorites = this._getOrInitializeFavoritesStore();
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const diseases = this._getFromStorage('diseases', []);
    const traitsRef = this._getFromStorage('traits', []);
    const comparisons = this._getOrInitializeComparisonStore();

    const items = favorites.map((fav) => {
      const variety = tomatoVarieties.find((v) => v.id === fav.variety_id) || null;
      const diseaseResistances = variety
        ? (Array.isArray(variety.disease_resistance_ids) ? variety.disease_resistance_ids : [])
            .map((id) => diseases.find((d) => d.id === id))
            .filter((d) => !!d)
        : [];
      const traitObjs = variety
        ? (Array.isArray(variety.trait_codes) ? variety.trait_codes : [])
            .map((code) => traitsRef.find((t) => t.code === code))
            .filter((t) => !!t)
        : [];
      const isInComparison = variety ? !!comparisons.find((c) => c.variety_id === variety.id) : false;
      const favoriteItem = {
        ...fav,
        variety
      };
      return {
        favoriteItem,
        variety,
        diseaseResistances,
        traits: traitObjs,
        isInComparison
      };
    });

    return {
      favorites: items
    };
  }

  // toggleComparisonVariety(varietyId)
  toggleComparisonVariety(varietyId) {
    let comparisons = this._getOrInitializeComparisonStore();
    const index = comparisons.findIndex((c) => c.variety_id === varietyId);
    let isInComparison = false;
    let comparisonItem = null;

    if (index !== -1) {
      comparisons.splice(index, 1);
      isInComparison = false;
    } else {
      comparisonItem = {
        id: this._generateId('cmp'),
        variety_id: varietyId,
        added_at: this._nowIso()
      };
      comparisons.push(comparisonItem);
      isInComparison = true;
    }

    this._saveToStorage('comparison_items', comparisons);

    return {
      isInComparison,
      comparisonItem: isInComparison ? comparisonItem : null,
      comparisonCount: comparisons.length
    };
  }

  // getComparisonVarieties()
  getComparisonVarieties() {
    const comparisons = this._getOrInitializeComparisonStore();
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const diseases = this._getFromStorage('diseases', []);
    const traitsRef = this._getFromStorage('traits', []);

    const items = comparisons.map((cmp) => {
      const variety = tomatoVarieties.find((v) => v.id === cmp.variety_id) || null;
      const diseaseResistances = variety
        ? (Array.isArray(variety.disease_resistance_ids) ? variety.disease_resistance_ids : [])
            .map((id) => diseases.find((d) => d.id === id))
            .filter((d) => !!d)
        : [];
      const traitObjs = variety
        ? (Array.isArray(variety.trait_codes) ? variety.trait_codes : [])
            .map((code) => traitsRef.find((t) => t.code === code))
            .filter((t) => !!t)
        : [];
      const comparisonItem = {
        ...cmp,
        variety
      };
      return {
        comparisonItem,
        variety,
        diseaseResistances,
        traits: traitObjs
      };
    });

    return {
      items
    };
  }

  // addVarietyToGardenPlan(varietyId, numberOfPlants, plantingDate, plantingMethod?, season?, notes?)
  addVarietyToGardenPlan(varietyId, numberOfPlants, plantingDate, plantingMethod, season, notes) {
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const variety = tomatoVarieties.find((v) => v.id === varietyId);
    if (!variety) {
      return {
        entry: null,
        message: 'Variety not found.'
      };
    }

    const entries = this._getOrInitializeGardenPlanStore();

    const entry = {
      id: this._generateId('gp'),
      variety_id: varietyId,
      source: 'variety_detail',
      planting_method: plantingMethod || 'unspecified',
      number_of_plants: Number(numberOfPlants) || 0,
      planting_date: plantingDate,
      season: season || null,
      location_zip: null,
      notes: notes || null,
      created_at: this._nowIso(),
      updated_at: null
    };

    entries.push(entry);
    this._saveToStorage('garden_plan_entries', entries);

    return {
      entry,
      message: 'Garden plan entry created.'
    };
  }

  // getGardenPlanOverview()
  getGardenPlanOverview() {
    const entries = this._getOrInitializeGardenPlanStore();
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const locations = this._getFromStorage('locations', []);

    const items = entries.map((e) => {
      const variety = tomatoVarieties.find((v) => v.id === e.variety_id) || null;
      const location = e.location_zip
        ? locations.find((loc) => loc.zip_code === e.location_zip) || null
        : null;
      const entry = {
        ...e,
        variety,
        location
      };
      return {
        entry,
        variety,
        location
      };
    });

    return {
      entries: items
    };
  }

  // addGardenPlanEntry(varietyId, numberOfPlants, plantingDate, plantingMethod?, season?, locationZip?, notes?)
  addGardenPlanEntry(varietyId, numberOfPlants, plantingDate, plantingMethod, season, locationZip, notes) {
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const variety = tomatoVarieties.find((v) => v.id === varietyId);
    if (!variety) {
      return {
        entry: null,
        message: 'Variety not found.'
      };
    }

    const entries = this._getOrInitializeGardenPlanStore();

    const entry = {
      id: this._generateId('gp'),
      variety_id: varietyId,
      source: 'garden_planner',
      planting_method: plantingMethod || 'unspecified',
      number_of_plants: Number(numberOfPlants) || 0,
      planting_date: plantingDate,
      season: season || null,
      location_zip: locationZip || null,
      notes: notes || null,
      created_at: this._nowIso(),
      updated_at: null
    };

    entries.push(entry);
    this._saveToStorage('garden_plan_entries', entries);

    return {
      entry,
      message: 'Garden plan entry created.'
    };
  }

  // updateGardenPlanEntry(entryId, numberOfPlants?, plantingDate?, plantingMethod?, season?, notes?)
  updateGardenPlanEntry(entryId, numberOfPlants, plantingDate, plantingMethod, season, notes) {
    const entries = this._getOrInitializeGardenPlanStore();
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) {
      return {
        entry: null,
        message: 'Garden plan entry not found.'
      };
    }

    if (numberOfPlants != null) {
      entry.number_of_plants = Number(numberOfPlants) || 0;
    }
    if (plantingDate != null) {
      entry.planting_date = plantingDate;
    }
    if (plantingMethod != null) {
      entry.planting_method = plantingMethod;
    }
    if (season != null) {
      entry.season = season;
    }
    if (notes != null) {
      entry.notes = notes;
    }
    entry.updated_at = this._nowIso();

    this._saveToStorage('garden_plan_entries', entries);

    return {
      entry,
      message: 'Garden plan entry updated.'
    };
  }

  // deleteGardenPlanEntry(entryId)
  deleteGardenPlanEntry(entryId) {
    let entries = this._getOrInitializeGardenPlanStore();
    const before = entries.length;
    entries = entries.filter((e) => e.id !== entryId);
    this._saveToStorage('garden_plan_entries', entries);

    const success = entries.length < before;
    return {
      success,
      message: success ? 'Garden plan entry deleted.' : 'Garden plan entry not found.'
    };
  }

  // getToolsOverviewContent()
  getToolsOverviewContent() {
    const content = this._getFromStorage('tools_overview_content', null);
    if (!content) {
      return {
        introText: '',
        tools: []
      };
    }
    return {
      introText: content.introText || '',
      tools: Array.isArray(content.tools) ? content.tools : []
    };
  }

  // getPlantingCalendarState()
  getPlantingCalendarState() {
    const state = this._getOrInitializePlantingCalendarState();
    const locations = this._getFromStorage('locations', []);
    const location = state.location_id
      ? locations.find((loc) => loc.id === state.location_id) || null
      : null;

    return {
      state,
      location
    };
  }

  // setPlantingCalendarLocation(zipCode)
  setPlantingCalendarLocation(zipCode) {
    const zip = (zipCode || '').toString();
    const state = this._getOrInitializePlantingCalendarState();
    const locations = this._getFromStorage('locations', []);

    let location = locations.find((loc) => loc.zip_code === zip) || null;
    if (!location) {
      location = {
        id: this._generateId('loc'),
        zip_code: zip,
        city: null,
        state: null,
        latitude: null,
        longitude: null,
        average_last_frost_date_spring: null,
        average_first_frost_date_fall: null
      };
      locations.push(location);
      this._saveToStorage('locations', locations);
    }

    state.zip_code = zip;
    state.location_id = location.id;
    state.generated_at = null;

    const states = [state];
    this._saveToStorage('planting_calendar_states', states);

    return {
      state,
      location,
      message: 'Location set.'
    };
  }

  // updatePlantingCalendarSelection(season?, selectedVarietyId?)
  updatePlantingCalendarSelection(season, selectedVarietyId) {
    const state = this._getOrInitializePlantingCalendarState();
    if (season != null) {
      state.season = season;
    }
    if (selectedVarietyId != null) {
      state.selected_variety_id = selectedVarietyId;
    }
    state.generated_at = null;

    const states = [state];
    this._saveToStorage('planting_calendar_states', states);

    return {
      state
    };
  }

  // getPlantingCalendarVarietySuggestions(query?, season?)
  getPlantingCalendarVarietySuggestions(query, season) {
    const q = this._normalizeString(query || '');
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);

    let list = tomatoVarieties;
    if (q) {
      list = tomatoVarieties.filter((v) => {
        const name = this._normalizeString(v.name);
        const slug = this._normalizeString(v.slug);
        return name.indexOf(q) !== -1 || slug.indexOf(q) !== -1;
      });
    }

    if (season === 'spring') {
      list = list.slice().sort((a, b) => {
        const aEarly = (Array.isArray(a.trait_codes) && a.trait_codes.indexOf('early_harvest') !== -1) ||
          ((Number(a.days_to_maturity_max) || 0) <= 65);
        const bEarly = (Array.isArray(b.trait_codes) && b.trait_codes.indexOf('early_harvest') !== -1) ||
          ((Number(b.days_to_maturity_max) || 0) <= 65);
        if (aEarly && !bEarly) return -1;
        if (!aEarly && bEarly) return 1;
        return (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0);
      });
    } else {
      list = list.slice().sort((a, b) => (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0));
    }

    const results = list.map((v) => ({ variety: v }));

    return { results };
  }

  // generatePlantingCalendarDates()
  generatePlantingCalendarDates() {
    const state = this._getOrInitializePlantingCalendarState();
    const locations = this._getFromStorage('locations', []);
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);

    const location = state.location_id
      ? locations.find((loc) => loc.id === state.location_id) || null
      : null;
    const variety = state.selected_variety_id
      ? tomatoVarieties.find((v) => v.id === state.selected_variety_id) || null
      : null;

    const season = state.season || null;
    const recommendedWindows = [];

    if (season && location && variety) {
      if (season === 'spring' && location.average_last_frost_date_spring) {
        const base = location.average_last_frost_date_spring;
        const startDate = this._dateAddDays(base, 7);
        const endDate = this._dateAddDays(base, 21);
        recommendedWindows.push({
          windowId: this._generateId('pcw'),
          label: 'Spring transplant window',
          startDate,
          endDate
        });
      } else if (season === 'fall' && location.average_first_frost_date_fall) {
        const base = location.average_first_frost_date_fall;
        const startDate = this._dateAddDays(base, -70);
        const endDate = this._dateAddDays(base, -50);
        recommendedWindows.push({
          windowId: this._generateId('pcw'),
          label: 'Fall planting window',
          startDate,
          endDate
        });
      }
    }

    state.generated_at = this._nowIso();
    const states = [state];
    this._saveToStorage('planting_calendar_states', states);

    return {
      state,
      location,
      season,
      variety,
      recommendedWindows
    };
  }

  // addPlantingFromCalendar(windowId?, varietyId, numberOfPlants, plantingDate)
  addPlantingFromCalendar(windowId, varietyId, numberOfPlants, plantingDate) {
    const state = this._getOrInitializePlantingCalendarState();
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const variety = tomatoVarieties.find((v) => v.id === varietyId);
    if (!variety) {
      return {
        entry: null,
        message: 'Variety not found.'
      };
    }

    const entries = this._getOrInitializeGardenPlanStore();

    const entry = {
      id: this._generateId('gp'),
      variety_id: varietyId,
      source: 'planting_calendar',
      planting_method: 'unspecified',
      number_of_plants: Number(numberOfPlants) || 0,
      planting_date: plantingDate,
      season: state.season || null,
      location_zip: state.zip_code || null,
      notes: windowId ? 'Calendar window: ' + windowId : null,
      created_at: this._nowIso(),
      updated_at: null
    };

    entries.push(entry);
    this._saveToStorage('garden_plan_entries', entries);

    return {
      entry,
      message: 'Garden plan entry created from calendar.'
    };
  }

  // getGuidesOverviewContent()
  getGuidesOverviewContent() {
    const content = this._getFromStorage('guides_overview_content', null);
    if (!content) {
      return {
        introText: '',
        guides: []
      };
    }
    return {
      introText: content.introText || '',
      guides: Array.isArray(content.guides) ? content.guides : []
    };
  }

  // getQuizWithQuestions(quizSlug)
  getQuizWithQuestions(quizSlug) {
    const quizzes = this._getFromStorage('quizzes', []);
    const quizQuestions = this._getFromStorage('quiz_questions', []);
    const quizOptions = this._getFromStorage('quiz_options', []);

    const quiz = quizzes.find((q) => q.slug === quizSlug) || null;
    if (!quiz) {
      return {
        quiz: null,
        questions: []
      };
    }

    const questions = quizQuestions
      .filter((qq) => qq.quiz_id === quiz.id)
      .slice()
      .sort((a, b) => Number(a.order) - Number(b.order))
      .map((question) => {
        const options = quizOptions
          .filter((opt) => opt.question_id === question.id)
          .slice()
          .sort((a, b) => Number(a.order) - Number(b.order));
        return { question, options };
      });

    return {
      quiz,
      questions
    };
  }

  // startQuizSession(quizId)
  startQuizSession(quizId) {
    const quizzes = this._getFromStorage('quizzes', []);
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) {
      return {
        quizSession: null
      };
    }

    const sessions = this._getFromStorage('quiz_sessions', []);
    const quizSession = {
      id: this._generateId('quizsess'),
      quiz_id: quizId,
      started_at: this._nowIso(),
      completed_at: null,
      selected_option_ids: [],
      recommended_variety_ids: []
    };

    sessions.push(quizSession);
    this._saveToStorage('quiz_sessions', sessions);

    return {
      quizSession
    };
  }

  // completeQuizSession(quizSessionId, selectedOptionIds)
  completeQuizSession(quizSessionId, selectedOptionIds) {
    const sessions = this._getFromStorage('quiz_sessions', []);
    const quizOptions = this._getFromStorage('quiz_options', []);
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const diseases = this._getFromStorage('diseases', []);
    const traitsRef = this._getFromStorage('traits', []);
    const favorites = this._getOrInitializeFavoritesStore();
    const comparisons = this._getOrInitializeComparisonStore();

    const quizSession = sessions.find((s) => s.id === quizSessionId) || null;
    if (!quizSession) {
      return {
        quizSession: null,
        recommendedVarieties: []
      };
    }

    const selectedIds = Array.isArray(selectedOptionIds) ? selectedOptionIds : [];
    quizSession.selected_option_ids = selectedIds;

    const valueCodes = selectedIds
      .map((id) => quizOptions.find((opt) => opt.id === id))
      .filter((opt) => !!opt && !!opt.value_code)
      .map((opt) => opt.value_code);

    const engineResults = this._runTomatoFinderRecommendationEngine(valueCodes);
    const recommendedVarietyIds = engineResults.map((res) => res.varietyId);

    quizSession.recommended_variety_ids = recommendedVarietyIds;
    quizSession.completed_at = this._nowIso();

    this._saveToStorage('quiz_sessions', sessions);

    const recommendedVarieties = engineResults.map((res) => {
      const variety = tomatoVarieties.find((v) => v.id === res.varietyId) || null;
      const diseaseResistances = variety
        ? (Array.isArray(variety.disease_resistance_ids) ? variety.disease_resistance_ids : [])
            .map((id) => diseases.find((d) => d.id === id))
            .filter((d) => !!d)
        : [];
      const traitObjs = variety
        ? (Array.isArray(variety.trait_codes) ? variety.trait_codes : [])
            .map((code) => traitsRef.find((t) => t.code === code))
            .filter((t) => !!t)
        : [];
      const isFavorite = variety ? !!favorites.find((f) => f.variety_id === variety.id) : false;
      const isInComparison = variety ? !!comparisons.find((c) => c.variety_id === variety.id) : false;

      return {
        variety,
        matchScore: res.score,
        diseaseResistances,
        traits: traitObjs,
        isFavorite,
        isInComparison
      };
    });

    return {
      quizSession,
      recommendedVarieties
    };
  }

  // getQuizResults(quizSessionId)
  getQuizResults(quizSessionId) {
    const sessions = this._getFromStorage('quiz_sessions', []);
    const quizOptions = this._getFromStorage('quiz_options', []);
    const tomatoVarieties = this._getFromStorage('tomato_varieties', []);
    const diseases = this._getFromStorage('diseases', []);
    const traitsRef = this._getFromStorage('traits', []);
    const favorites = this._getOrInitializeFavoritesStore();
    const comparisons = this._getOrInitializeComparisonStore();

    const quizSession = sessions.find((s) => s.id === quizSessionId) || null;
    if (!quizSession) {
      return {
        quizSession: null,
        recommendedVarieties: []
      };
    }

    const selectedIds = Array.isArray(quizSession.selected_option_ids) ? quizSession.selected_option_ids : [];
    const valueCodes = selectedIds
      .map((id) => quizOptions.find((opt) => opt.id === id))
      .filter((opt) => !!opt && !!opt.value_code)
      .map((opt) => opt.value_code);

    const engineResults = this._runTomatoFinderRecommendationEngine(valueCodes);
    const scoreById = {};
    engineResults.forEach((res) => {
      scoreById[res.varietyId] = res.score;
    });

    const recommendedVarietyIds = Array.isArray(quizSession.recommended_variety_ids)
      ? quizSession.recommended_variety_ids
      : [];

    const recommendedVarieties = recommendedVarietyIds.map((id) => {
      const variety = tomatoVarieties.find((v) => v.id === id) || null;
      const diseaseResistances = variety
        ? (Array.isArray(variety.disease_resistance_ids) ? variety.disease_resistance_ids : [])
            .map((did) => diseases.find((d) => d.id === did))
            .filter((d) => !!d)
        : [];
      const traitObjs = variety
        ? (Array.isArray(variety.trait_codes) ? variety.trait_codes : [])
            .map((code) => traitsRef.find((t) => t.code === code))
            .filter((t) => !!t)
        : [];
      const isFavorite = variety ? !!favorites.find((f) => f.variety_id === variety.id) : false;
      const isInComparison = variety ? !!comparisons.find((c) => c.variety_id === variety.id) : false;

      return {
        variety,
        matchScore: scoreById[id] != null ? scoreById[id] : 0,
        diseaseResistances,
        traits: traitObjs,
        isFavorite,
        isInComparison
      };
    });

    return {
      quizSession,
      recommendedVarieties
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', null);
    if (!content) {
      return {
        title: '',
        body: '',
        dataSources: [],
        disclaimers: []
      };
    }
    return {
      title: content.title || '',
      body: content.body || '',
      dataSources: Array.isArray(content.dataSources) ? content.dataSources : [],
      disclaimers: Array.isArray(content.disclaimers) ? content.disclaimers : []
    };
  }

  // submitContactMessage(name, email, topic?, subject, message)
  submitContactMessage(name, email, topic, subject, message) {
    const messages = this._getFromStorage('contact_messages', []);

    const entry = {
      id: this._generateId('contact'),
      name,
      email,
      topic: topic || null,
      subject,
      message,
      created_at: this._nowIso()
    };

    messages.push(entry);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted.'
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    const content = this._getFromStorage('help_faq_content', null);
    if (!content) {
      return {
        sections: []
      };
    }
    return {
      sections: Array.isArray(content.sections) ? content.sections : []
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
