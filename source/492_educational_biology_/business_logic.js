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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keys = [
      'species',
      'species_photos',
      'study_lists',
      'study_list_items',
      'species_collections',
      'species_collection_items',
      'insect_orders',
      'order_comparisons',
      'quiz_questions',
      'quizzes',
      'quiz_items',
      'resources',
      'lesson_plans',
      'lesson_plan_items',
      'reading_paths',
      'reading_path_items',
      'distribution_maps',
      'map_notes_lists',
      'map_note_items',
      'glossary_terms',
      'glossary_lists',
      'glossary_list_items',
      'glossary_selections',
      'metamorphosis_charts',
      'metamorphosis_chart_items'
    ];
    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Config / helper keys
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_order_comparison_id')) {
      localStorage.setItem('current_order_comparison_id', '');
    }
    if (!localStorage.getItem('current_glossary_selection_id')) {
      localStorage.setItem('current_glossary_selection_id', '');
    }
    if (!localStorage.getItem('current_species_search_context')) {
      localStorage.setItem(
        'current_species_search_context',
        JSON.stringify({ speciesIds: [], updatedAt: null })
      );
    }
    if (!localStorage.getItem('about_page_content')) {
      const about = {
        title: 'About This Site',
        body: '',
        dataSources: [],
        educationalFrameworks: [],
        contactEmail: '',
        relatedLinks: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
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

  // --- Helper: default study list ---
  _getOrCreateDefaultStudyList() {
    let studyLists = this._getFromStorage('study_lists');
    let studyList = studyLists.find((l) => l.name === 'My Study List');
    if (!studyList) {
      studyList = {
        id: this._generateId('studylist'),
        name: 'My Study List',
        description: '',
        sortMode: 'manual',
        createdAt: this._nowIso()
      };
      studyLists.push(studyList);
      this._saveToStorage('study_lists', studyLists);
    }
    return studyList;
  }

  // --- Helper: species search context for navigation ---
  _updateCurrentSpeciesSearchContext(speciesIds) {
    const context = {
      speciesIds: Array.isArray(speciesIds) ? speciesIds : [],
      updatedAt: this._nowIso()
    };
    this._saveToStorage('current_species_search_context', context);
  }

  _getCurrentSpeciesSearchContext() {
    const data = localStorage.getItem('current_species_search_context');
    if (!data) {
      return { speciesIds: [], updatedAt: null };
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return { speciesIds: [], updatedAt: null };
    }
  }

  // --- Helper: glossary selection ---
  _getOrCreateGlossarySelection() {
    let selections = this._getFromStorage('glossary_selections');
    let currentId = localStorage.getItem('current_glossary_selection_id') || '';
    let selection = currentId ? selections.find((s) => s.id === currentId) : null;
    if (!selection) {
      selection = {
        id: this._generateId('gsel'),
        selectedTermIds: [],
        createdAt: this._nowIso()
      };
      selections.push(selection);
      this._saveToStorage('glossary_selections', selections);
      localStorage.setItem('current_glossary_selection_id', selection.id);
    }
    return selection;
  }

  // --- Helper: default Map Notes list ---
  _getOrCreateDefaultMapNotesList(defaultName = 'Map Notes') {
    let lists = this._getFromStorage('map_notes_lists');
    let list =
      lists.find((l) => l.name === defaultName) ||
      lists.find((l) => l.name === 'Map Notes');
    if (!list) {
      list = {
        id: this._generateId('mapnoteslist'),
        name: defaultName,
        description: '',
        createdAt: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('map_notes_lists', lists);
    }
    return list;
  }

  // --- Helper: reading path order ---
  _calculateReadingPathItemOrder(readingPathId) {
    const items = this._getFromStorage('reading_path_items').filter(
      (i) => i.readingPathId === readingPathId
    );
    if (!items.length) return 0;
    return (
      items.reduce(
        (max, item) =>
          typeof item.orderIndex === 'number' ? Math.max(max, item.orderIndex) : max,
        0
      ) + 1
    );
  }

  // --- Helper: get current order comparison config ---
  _getCurrentOrderComparisonConfig() {
    const id = localStorage.getItem('current_order_comparison_id') || '';
    const configs = this._getFromStorage('order_comparisons');
    if (!id) return null;
    return configs.find((c) => c.id === id) || null;
  }

  _saveOrderComparisonConfig(config) {
    let configs = this._getFromStorage('order_comparisons');
    const index = configs.findIndex((c) => c.id === config.id);
    if (index >= 0) {
      configs[index] = config;
    } else {
      configs.push(config);
    }
    this._saveToStorage('order_comparisons', configs);
    localStorage.setItem('current_order_comparison_id', config.id);
  }

  // =========================
  // Core interface implementations
  // =========================

  // --- Home & About ---

  getHomeOverview() {
    const species = this._getFromStorage('species');
    const lessons = this._getFromStorage('lesson_plans');
    const quizzes = this._getFromStorage('quizzes');
    const resources = this._getFromStorage('resources');

    const featuredSpecies = species.slice(0, 8).map((s) => ({
      speciesId: s.id,
      scientificName: s.scientificName,
      commonName: s.commonName || '',
      difficulty: s.difficulty,
      thumbnailImageUrl: s.thumbnailImageUrl || '',
      habitats: Array.isArray(s.habitats) ? s.habitats : [],
      regions: Array.isArray(s.regions) ? s.regions : []
    }));

    const featuredLessons = lessons.slice(0, 5);
    const featuredQuizzes = quizzes.slice(0, 5);
    const featuredResources = resources.slice(0, 5);

    const quickLinks = [
      { label: 'Species Explorer', targetPage: 'species_explorer' },
      { label: 'Order Comparison', targetPage: 'order_comparison' },
      { label: 'Quizzes', targetPage: 'quizzes' },
      { label: 'Lesson Builder', targetPage: 'lesson_builder' },
      { label: 'Articles & Resources', targetPage: 'articles' },
      { label: 'Maps', targetPage: 'maps' },
      { label: 'Glossary', targetPage: 'glossary' },
      { label: 'Taxonomy', targetPage: 'taxonomy' }
    ];

    const aboutRaw = localStorage.getItem('about_page_content');
    let introText = '';
    if (aboutRaw) {
      try {
        const about = JSON.parse(aboutRaw);
        introText = about.body || '';
      } catch (e) {
        introText = '';
      }
    }

    return {
      introText,
      featuredSpecies,
      featuredLessons,
      featuredQuizzes,
      featuredResources,
      quickLinks
    };
  }

  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (!raw) {
      const about = {
        title: 'About This Site',
        body: '',
        dataSources: [],
        educationalFrameworks: [],
        contactEmail: '',
        relatedLinks: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
      return about;
    }
    try {
      const about = JSON.parse(raw);
      return {
        title: about.title || '',
        body: about.body || '',
        dataSources: Array.isArray(about.dataSources) ? about.dataSources : [],
        educationalFrameworks: Array.isArray(about.educationalFrameworks)
          ? about.educationalFrameworks
          : [],
        contactEmail: about.contactEmail || '',
        relatedLinks: Array.isArray(about.relatedLinks) ? about.relatedLinks : []
      };
    } catch (e) {
      return {
        title: 'About This Site',
        body: '',
        dataSources: [],
        educationalFrameworks: [],
        contactEmail: '',
        relatedLinks: []
      };
    }
  }

  // --- Species filter & search ---

  getSpeciesFilterOptions() {
    const habitats = [
      { value: 'rivers_streams', label: 'Rivers/Streams' },
      { value: 'streams', label: 'Streams' },
      { value: 'ponds_lakes', label: 'Ponds/Lakes' }
    ];
    const regions = [
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia', label: 'Asia' }
    ];
    const difficulties = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];
    const pollutionTolerance = { min: 0, max: 10, step: 1 };
    return { habitats, regions, difficulties, pollutionTolerance };
  }

  searchSpecies(
    textQuery,
    habitats,
    regions,
    difficultyLevels,
    pollutionToleranceMax,
    page,
    pageSize,
    sortBy
  ) {
    const allSpecies = this._getFromStorage('species');
    const allPhotos = this._getFromStorage('species_photos');

    const photosBySpeciesId = allPhotos.reduce((acc, p) => {
      if (!acc[p.speciesId]) acc[p.speciesId] = [];
      acc[p.speciesId].push(p);
      return acc;
    }, {});

    const query = (textQuery || '').trim().toLowerCase();
    const habitatsFilter = Array.isArray(habitats) ? habitats : [];
    const regionsFilter = Array.isArray(regions) ? regions : [];
    const difficultyFilter = Array.isArray(difficultyLevels) ? difficultyLevels : [];
    const hasPollutionMax =
      typeof pollutionToleranceMax === 'number' && !Number.isNaN(pollutionToleranceMax);

    let filtered = allSpecies.filter((s) => {
      if (query) {
        const sci = (s.scientificName || '').toLowerCase();
        const common = (s.commonName || '').toLowerCase();
        if (!sci.includes(query) && !common.includes(query)) {
          return false;
        }
      }

      if (habitatsFilter.length) {
        const sh = Array.isArray(s.habitats) ? s.habitats : [];
        const match = sh.some((h) => habitatsFilter.includes(h));
        if (!match) return false;
      }

      if (regionsFilter.length) {
        const sr = Array.isArray(s.regions) ? s.regions : [];
        const match = sr.some((r) => regionsFilter.includes(r));
        if (!match) return false;
      }

      if (difficultyFilter.length) {
        if (!difficultyFilter.includes(s.difficulty)) return false;
      }

      if (hasPollutionMax) {
        const score = s.pollutionToleranceScore;
        if (typeof score !== 'number') return false;
        if (score > pollutionToleranceMax) return false;
      }

      return true;
    });

    const sortKey = sortBy || 'scientific_name';
    filtered.sort((a, b) => {
      if (sortKey === 'common_name') {
        const an = (a.commonName || '').toLowerCase();
        const bn = (b.commonName || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      }
      if (sortKey === 'pollution_tolerance') {
        const av =
          typeof a.pollutionToleranceScore === 'number'
            ? a.pollutionToleranceScore
            : Number.POSITIVE_INFINITY;
        const bv =
          typeof b.pollutionToleranceScore === 'number'
            ? b.pollutionToleranceScore
            : Number.POSITIVE_INFINITY;
        return av - bv;
      }
      const an = (a.scientificName || '').toLowerCase();
      const bn = (b.scientificName || '').toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });

    const allIdsInOrder = filtered.map((s) => s.id);
    this._updateCurrentSpeciesSearchContext(allIdsInOrder);

    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 25;
    const totalCount = filtered.length;
    const start = (pageNum - 1) * size;
    const pageItems = filtered.slice(start, start + size);

    const results = pageItems.map((s) => {
      const photos = photosBySpeciesId[s.id] || [];
      const primary = photos.find((p) => p.isPrimary) || photos[0] || null;
      const thumb = s.thumbnailImageUrl || (primary ? primary.imageUrl : '');
      const hasPhoto = !!thumb;
      return {
        speciesId: s.id,
        scientificName: s.scientificName,
        commonName: s.commonName || '',
        difficulty: s.difficulty,
        habitats: Array.isArray(s.habitats) ? s.habitats : [],
        regions: Array.isArray(s.regions) ? s.regions : [],
        pollutionToleranceScore:
          typeof s.pollutionToleranceScore === 'number'
            ? s.pollutionToleranceScore
            : null,
        thumbnailImageUrl: thumb,
        hasPhoto
      };
    });

    return { results, totalCount };
  }

  getSpeciesDetailsWithPhotos(speciesId) {
    const species = this._getFromStorage('species');
    const photos = this._getFromStorage('species_photos');
    const orders = this._getFromStorage('insect_orders');
    const maps = this._getFromStorage('distribution_maps');

    const s = species.find((sp) => sp.id === speciesId) || null;

    let order = null;
    if (s && s.orderId) {
      order = orders.find((o) => o.id === s.orderId) || null;
    }

    const speciesPhotos = photos.filter((p) => p.speciesId === speciesId);

    const map = maps.find((m) => m.speciesId === speciesId) || null;
    const distributionMapId = map ? map.id : null;

    const context = this._getCurrentSpeciesSearchContext();
    const ids = Array.isArray(context.speciesIds) ? context.speciesIds : [];
    const index = ids.indexOf(speciesId);
    const navigation = {
      previousSpeciesId: index > 0 ? ids[index - 1] : null,
      nextSpeciesId: index >= 0 && index < ids.length - 1 ? ids[index + 1] : null
    };

    return {
      species: s
        ? {
            id: s.id,
            scientificName: s.scientificName,
            commonName: s.commonName || '',
            difficulty: s.difficulty,
            habitats: Array.isArray(s.habitats) ? s.habitats : [],
            regions: Array.isArray(s.regions) ? s.regions : [],
            pollutionToleranceScore:
              typeof s.pollutionToleranceScore === 'number'
                ? s.pollutionToleranceScore
                : null,
            description: s.description || '',
            distributionSummary: s.distributionSummary || '',
            taxonGroup: s.taxonGroup || null,
            order: order
              ? {
                  id: order.id,
                  scientificName: order.scientificName,
                  commonName: order.commonName || '',
                  metamorphosisType: order.metamorphosisType
                }
              : null
          }
        : null,
      photos: speciesPhotos,
      distributionMapId,
      navigation
    };
  }

  // --- Study List ---

  addSpeciesToStudyList(speciesId) {
    const studyList = this._getOrCreateDefaultStudyList();
    const studyListId = studyList.id;

    let items = this._getFromStorage('study_list_items');
    const exists = items.find(
      (i) => i.studyListId === studyListId && i.speciesId === speciesId
    );
    if (!exists) {
      const positions = items
        .filter((i) => i.studyListId === studyListId)
        .map((i) => (typeof i.position === 'number' ? i.position : 0));
      const nextPos = positions.length ? Math.max.apply(null, positions) + 1 : 0;
      const newItem = {
        id: this._generateId('studylistitem'),
        studyListId,
        speciesId,
        position: nextPos,
        addedAt: this._nowIso()
      };
      items.push(newItem);
      this._saveToStorage('study_list_items', items);
    }

    const count = items.filter((i) => i.studyListId === studyListId).length;
    return {
      success: true,
      message: 'Species added to study list.',
      studyListItemCount: count
    };
  }

  getStudyList() {
    const studyList = this._getOrCreateDefaultStudyList();
    const species = this._getFromStorage('species');
    const itemsRaw = this._getFromStorage('study_list_items').filter(
      (i) => i.studyListId === studyList.id
    );

    let itemsEnriched = itemsRaw.map((item) => {
      const s = species.find((sp) => sp.id === item.speciesId) || null;
      return {
        speciesId: item.speciesId,
        scientificName: s ? s.scientificName : '',
        commonName: s && s.commonName ? s.commonName : '',
        thumbnailImageUrl: s && s.thumbnailImageUrl ? s.thumbnailImageUrl : '',
        difficulty: s ? s.difficulty : null,
        habitats: s && Array.isArray(s.habitats) ? s.habitats : [],
        regions: s && Array.isArray(s.regions) ? s.regions : [],
        position: item.position,
        species: s
      };
    });

    if (studyList.sortMode === 'alphabetical_species_name') {
      itemsEnriched.sort((a, b) => {
        const an = (a.scientificName || '').toLowerCase();
        const bn = (b.scientificName || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else {
      itemsEnriched.sort((a, b) => {
        const ap = typeof a.position === 'number' ? a.position : 0;
        const bp = typeof b.position === 'number' ? b.position : 0;
        return ap - bp;
      });
    }

    return { studyList, items: itemsEnriched };
  }

  setStudyListSortMode(sortMode) {
    let studyLists = this._getFromStorage('study_lists');
    let studyList = this._getOrCreateDefaultStudyList();
    const index = studyLists.findIndex((l) => l.id === studyList.id);
    if (index >= 0) {
      studyList.sortMode = sortMode;
      studyLists[index] = studyList;
      this._saveToStorage('study_lists', studyLists);
    }

    const species = this._getFromStorage('species');
    let itemsRaw = this._getFromStorage('study_list_items').filter(
      (i) => i.studyListId === studyList.id
    );

    let itemsEnriched = itemsRaw.map((item) => {
      const s = species.find((sp) => sp.id === item.speciesId) || null;
      return {
        speciesId: item.speciesId,
        scientificName: s ? s.scientificName : '',
        commonName: s && s.commonName ? s.commonName : '',
        thumbnailImageUrl: s && s.thumbnailImageUrl ? s.thumbnailImageUrl : '',
        difficulty: s ? s.difficulty : null,
        position: item.position,
        species: s
      };
    });

    if (sortMode === 'alphabetical_species_name') {
      itemsEnriched.sort((a, b) => {
        const an = (a.scientificName || '').toLowerCase();
        const bn = (b.scientificName || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else {
      itemsEnriched.sort((a, b) => {
        const ap = typeof a.position === 'number' ? a.position : 0;
        const bp = typeof b.position === 'number' ? b.position : 0;
        return ap - bp;
      });
    }

    // update positions to match current order in storage
    let itemsStorage = this._getFromStorage('study_list_items');
    const listItems = itemsStorage.filter((i) => i.studyListId === studyList.id);
    listItems
      .sort((a, b) => {
        const ap = typeof a.position === 'number' ? a.position : 0;
        const bp = typeof b.position === 'number' ? b.position : 0;
        return ap - bp;
      })
      .forEach((item, idx) => {
        const storageIndex = itemsStorage.findIndex((i) => i.id === item.id);
        if (storageIndex >= 0) {
          itemsStorage[storageIndex].position = idx;
        }
      });
    this._saveToStorage('study_list_items', itemsStorage);

    return { studyList, items: itemsEnriched };
  }

  removeSpeciesFromStudyList(speciesId) {
    const studyList = this._getOrCreateDefaultStudyList();
    let items = this._getFromStorage('study_list_items');
    const before = items.length;
    items = items.filter(
      (i) => !(i.studyListId === studyList.id && i.speciesId === speciesId)
    );
    this._saveToStorage('study_list_items', items);
    const after = items.length;
    const count = items.filter((i) => i.studyListId === studyList.id).length;
    return { success: before !== after, studyListItemCount: count };
  }

  // --- Species Collections ---

  createSpeciesCollection(name, description) {
    let collections = this._getFromStorage('species_collections');
    const collection = {
      id: this._generateId('speccollection'),
      name,
      description: description || '',
      createdAt: this._nowIso()
    };
    collections.push(collection);
    this._saveToStorage('species_collections', collections);
    return { collection };
  }

  getSpeciesCollectionsSummary() {
    const collections = this._getFromStorage('species_collections');
    const items = this._getFromStorage('species_collection_items');
    return collections.map((collection) => {
      const speciesCount = items.filter((i) => i.collectionId === collection.id)
        .length;
      return { collection, speciesCount };
    });
  }

  getSpeciesCollectionDetails(collectionId) {
    const collections = this._getFromStorage('species_collections');
    const itemsAll = this._getFromStorage('species_collection_items');
    const speciesAll = this._getFromStorage('species');

    const collection = collections.find((c) => c.id === collectionId) || null;

    const items = itemsAll
      .filter((i) => i.collectionId === collectionId)
      .map((i) => {
        const s = speciesAll.find((sp) => sp.id === i.speciesId) || null;
        return {
          collectionItemId: i.id,
          speciesId: i.speciesId,
          scientificName: s ? s.scientificName : '',
          commonName: s && s.commonName ? s.commonName : '',
          thumbnailImageUrl: s && s.thumbnailImageUrl ? s.thumbnailImageUrl : '',
          pollutionToleranceScore:
            s && typeof s.pollutionToleranceScore === 'number'
              ? s.pollutionToleranceScore
              : null,
          species: s
        };
      });

    return { collection, items };
  }

  addSpeciesToCollection(collectionId, speciesId) {
    const collections = this._getFromStorage('species_collections');
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      return { success: false, message: 'Collection not found.' };
    }

    let items = this._getFromStorage('species_collection_items');
    const exists = items.find(
      (i) => i.collectionId === collectionId && i.speciesId === speciesId
    );
    if (!exists) {
      const positions = items
        .filter((i) => i.collectionId === collectionId)
        .map((i) => (typeof i.position === 'number' ? i.position : 0));
      const nextPos = positions.length ? Math.max.apply(null, positions) + 1 : 0;
      const newItem = {
        id: this._generateId('speccolitem'),
        collectionId,
        speciesId,
        position: nextPos,
        addedAt: this._nowIso()
      };
      items.push(newItem);
      this._saveToStorage('species_collection_items', items);
    }

    return { success: true, message: 'Species added to collection.' };
  }

  removeSpeciesFromCollection(collectionId, speciesId) {
    let items = this._getFromStorage('species_collection_items');
    const before = items.length;
    items = items.filter(
      (i) => !(i.collectionId === collectionId && i.speciesId === speciesId)
    );
    this._saveToStorage('species_collection_items', items);
    const after = items.length;
    return { success: before !== after };
  }

  renameSpeciesCollection(collectionId, newName) {
    let collections = this._getFromStorage('species_collections');
    const index = collections.findIndex((c) => c.id === collectionId);
    if (index === -1) {
      return { collection: null };
    }
    collections[index].name = newName;
    this._saveToStorage('species_collections', collections);
    return { collection: collections[index] };
  }

  deleteSpeciesCollection(collectionId) {
    let collections = this._getFromStorage('species_collections');
    const before = collections.length;
    collections = collections.filter((c) => c.id !== collectionId);
    this._saveToStorage('species_collections', collections);

    let items = this._getFromStorage('species_collection_items');
    items = items.filter((i) => i.collectionId !== collectionId);
    this._saveToStorage('species_collection_items', items);

    const after = collections.length;
    return { success: before !== after };
  }

  // --- Insect Orders & Comparison ---

  searchInsectOrders(query, metamorphosisType, isAquaticOnly) {
    const orders = this._getFromStorage('insect_orders');
    const q = (query || '').trim().toLowerCase();
    const aquaticOnly = isAquaticOnly !== false; // default true

    return orders.filter((o) => {
      if (aquaticOnly && !o.isAquatic) return false;
      if (metamorphosisType && o.metamorphosisType !== metamorphosisType) {
        return false;
      }
      if (q) {
        const sci = (o.scientificName || '').toLowerCase();
        const common = (o.commonName || '').toLowerCase();
        if (!sci.includes(q) && !common.includes(q)) return false;
      }
      return true;
    });
  }

  createOrUpdateOrderComparison(selectedOrderIds, name) {
    const ordersAll = this._getFromStorage('insect_orders');
    const ids = Array.isArray(selectedOrderIds) ? selectedOrderIds : [];

    let config = this._getCurrentOrderComparisonConfig();
    if (!config) {
      config = {
        id: this._generateId('ordercomp'),
        name: name || '',
        selectedOrderIds: ids,
        pinnedOrderId: null,
        showPinnedAsFocus: false,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
    } else {
      config.selectedOrderIds = ids;
      if (typeof name === 'string' && name.length) {
        config.name = name;
      }
      config.updatedAt = this._nowIso();
    }

    this._saveOrderComparisonConfig(config);

    const orders = ordersAll.filter((o) => ids.includes(o.id));

    const comparisonRows = [
      {
        key: 'typical_number_larval_instars',
        label: 'Typical number of larval instars',
        orderValues: orders.map((o) => ({
          orderId: o.id,
          value:
            typeof o.typicalNumberLarvalInstars === 'number'
              ? String(o.typicalNumberLarvalInstars)
              : ''
        }))
      }
    ];

    const pinned =
      config.pinnedOrderId && orders.find((o) => o.id === config.pinnedOrderId);
    const configWithPinned = Object.assign({}, config, {
      pinnedOrder: pinned || null
    });

    return {
      config: configWithPinned,
      orders,
      comparisonRows
    };
  }

  getCurrentOrderComparison() {
    const ordersAll = this._getFromStorage('insect_orders');
    const config = this._getCurrentOrderComparisonConfig();
    if (!config) {
      return {
        config: null,
        orders: [],
        comparisonRows: []
      };
    }
    const orders = ordersAll.filter((o) => config.selectedOrderIds.includes(o.id));

    const comparisonRows = [
      {
        key: 'typical_number_larval_instars',
        label: 'Typical number of larval instars',
        orderValues: orders.map((o) => ({
          orderId: o.id,
          value:
            typeof o.typicalNumberLarvalInstars === 'number'
              ? String(o.typicalNumberLarvalInstars)
              : ''
        }))
      }
    ];

    const pinned =
      config.pinnedOrderId && orders.find((o) => o.id === config.pinnedOrderId);
    const configWithPinned = Object.assign({}, config, {
      pinnedOrder: pinned || null
    });

    return {
      config: configWithPinned,
      orders,
      comparisonRows
    };
  }

  pinOrderInComparison(orderId) {
    const ordersAll = this._getFromStorage('insect_orders');
    let config = this._getCurrentOrderComparisonConfig();
    if (!config) {
      config = {
        id: this._generateId('ordercomp'),
        name: '',
        selectedOrderIds: [orderId],
        pinnedOrderId: orderId,
        showPinnedAsFocus: false,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
    } else {
      config.pinnedOrderId = orderId;
      if (!config.selectedOrderIds.includes(orderId)) {
        config.selectedOrderIds.push(orderId);
      }
      config.updatedAt = this._nowIso();
    }
    this._saveOrderComparisonConfig(config);

    const orders = ordersAll.filter((o) => config.selectedOrderIds.includes(o.id));
    const pinned =
      config.pinnedOrderId && orders.find((o) => o.id === config.pinnedOrderId);
    const configWithPinned = Object.assign({}, config, {
      pinnedOrder: pinned || null
    });

    return { config: configWithPinned };
  }

  setOrderComparisonFocusMode(showPinnedAsFocus) {
    let config = this._getCurrentOrderComparisonConfig();
    if (!config) {
      return { config: null };
    }
    config.showPinnedAsFocus = !!showPinnedAsFocus;
    config.updatedAt = this._nowIso();
    this._saveOrderComparisonConfig(config);

    const ordersAll = this._getFromStorage('insect_orders');
    const orders = ordersAll.filter((o) => config.selectedOrderIds.includes(o.id));
    const pinned =
      config.pinnedOrderId && orders.find((o) => o.id === config.pinnedOrderId);
    const configWithPinned = Object.assign({}, config, {
      pinnedOrder: pinned || null
    });

    return { config: configWithPinned };
  }

  resetOrderComparison() {
    localStorage.setItem('current_order_comparison_id', '');
    return { success: true };
  }

  // --- Quizzes ---

  getQuizzesOverview() {
    const quizzes = this._getFromStorage('quizzes');
    const quizItems = this._getFromStorage('quiz_items');
    const overview = quizzes.map((quiz) => {
      const count = quizItems.filter((i) => i.quizId === quiz.id).length;
      return { quiz, questionCount: count };
    });
    return { quizzes: overview };
  }

  getQuizDetails(quizId) {
    const quizzes = this._getFromStorage('quizzes');
    const quizItems = this._getFromStorage('quiz_items');
    const questions = this._getFromStorage('quiz_questions');

    const quiz = quizzes.find((q) => q.id === quizId) || null;
    const itemsForQuiz = quizItems
      .filter((i) => i.quizId === quizId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const items = itemsForQuiz.map((i) => {
      const question = questions.find((q) => q.id === i.questionId) || null;
      return {
        orderIndex: i.orderIndex,
        question
      };
    });

    return { quiz, items };
  }

  getQuizForTaking(quizId) {
    const quizzes = this._getFromStorage('quizzes');
    const quizItems = this._getFromStorage('quiz_items');
    const questionsAll = this._getFromStorage('quiz_questions');

    const quiz = quizzes.find((q) => q.id === quizId) || null;
    if (!quiz) {
      return { quizTitle: '', difficulty: null, questions: [] };
    }

    const itemsForQuiz = quizItems
      .filter((i) => i.quizId === quizId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const questions = itemsForQuiz
      .map((i) => questionsAll.find((q) => q.id === i.questionId))
      .filter((q) => !!q);

    return {
      quizTitle: quiz.title,
      difficulty: quiz.difficulty || null,
      questions
    };
  }

  getQuizFilterOptions() {
    const insectGroups = [
      { value: 'beetles_coleoptera', label: 'Beetles (Coleoptera)' },
      { value: 'caddisflies_trichoptera', label: 'Caddisflies (Trichoptera)' },
      { value: 'mayflies_ephemeroptera', label: 'Mayflies (Ephemeroptera)' },
      { value: 'dragonflies_odonata', label: 'Dragonflies (Odonata)' },
      { value: 'stoneflies_plecoptera', label: 'Stoneflies (Plecoptera)' },
      { value: 'true_flies_diptera', label: 'True flies (Diptera)' },
      { value: 'other', label: 'Other' }
    ];
    const difficulties = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];
    const feedingTypes = [
      { value: 'predator', label: 'Predator' },
      { value: 'herbivore', label: 'Herbivore' },
      { value: 'detritivore', label: 'Detritivore' },
      { value: 'omnivore', label: 'Omnivore' },
      { value: 'parasite', label: 'Parasite' },
      { value: 'other', label: 'Other' }
    ];
    return { insectGroups, difficulties, feedingTypes };
  }

  searchQuizQuestions(
    textQuery,
    insectGroup,
    difficulties,
    feedingTypes,
    limit
  ) {
    const questions = this._getFromStorage('quiz_questions');
    const q = (textQuery || '').trim().toLowerCase();
    const difficultyFilter = Array.isArray(difficulties) ? difficulties : [];
    const feedingFilter = Array.isArray(feedingTypes) ? feedingTypes : [];
    const max = limit && limit > 0 ? limit : 50;

    let filtered = questions.filter((qq) => {
      if (q) {
        const prompt = (qq.prompt || '').toLowerCase();
        const expl = (qq.explanation || '').toLowerCase();
        const choices = Array.isArray(qq.choices)
          ? qq.choices.join(' ').toLowerCase()
          : '';
        if (!prompt.includes(q) && !expl.includes(q) && !choices.includes(q)) {
          return false;
        }
      }
      if (insectGroup && qq.insectGroup !== insectGroup) {
        return false;
      }
      if (difficultyFilter.length) {
        if (!difficultyFilter.includes(qq.difficulty)) return false;
      }
      if (feedingFilter.length) {
        if (!feedingFilter.includes(qq.feedingType)) return false;
      }
      if (!qq.isActive) return false;
      return true;
    });

    return filtered.slice(0, max);
  }

  saveCustomQuiz(title, description, questionIds, difficulty) {
    const quizzes = this._getFromStorage('quizzes');
    const quizItems = this._getFromStorage('quiz_items');

    const qIds = Array.isArray(questionIds) ? questionIds : [];
    if (!qIds.length) {
      return {
        success: false,
        quizId: null,
        message: 'No questions selected.'
      };
    }

    const quiz = {
      id: this._generateId('quiz'),
      title,
      description: description || '',
      difficulty: difficulty || null,
      isCustom: true,
      createdAt: this._nowIso()
    };
    quizzes.push(quiz);
    this._saveToStorage('quizzes', quizzes);

    const newItems = qIds.map((qid, index) => ({
      id: this._generateId('quizitem'),
      quizId: quiz.id,
      questionId: qid,
      orderIndex: index
    }));
    quizItems.push.apply(quizItems, newItems);
    this._saveToStorage('quiz_items', quizItems);

    return {
      success: true,
      quizId: quiz.id,
      message: 'Quiz saved.'
    };
  }

  // --- Lesson Plans ---

  getLessonPlansList() {
    return this._getFromStorage('lesson_plans');
  }

  startNewLessonPlan() {
    const lessonPlans = this._getFromStorage('lesson_plans');
    const lessonPlan = {
      id: this._generateId('lessonplan'),
      title: '',
      description: '',
      totalDurationMinutes: 0,
      createdAt: this._nowIso()
    };
    lessonPlans.push(lessonPlan);
    this._saveToStorage('lesson_plans', lessonPlans);
    return { lessonPlan };
  }

  addResourceToLessonPlan(
    lessonPlanId,
    resourceId,
    plannedDurationMinutes,
    orderIndex
  ) {
    const lessonPlans = this._getFromStorage('lesson_plans');
    let items = this._getFromStorage('lesson_plan_items');

    const existingForPlan = items.filter((i) => i.lessonPlanId === lessonPlanId);
    let index;
    if (typeof orderIndex === 'number') {
      index = orderIndex;
      // Optionally shift existing indexes
      existingForPlan
        .filter((i) => i.orderIndex >= index)
        .forEach((i) => {
          i.orderIndex += 1;
        });
    } else {
      const maxIndex = existingForPlan.reduce(
        (max, i) =>
          typeof i.orderIndex === 'number' ? Math.max(max, i.orderIndex) : max,
        -1
      );
      index = maxIndex + 1;
    }

    const newItem = {
      id: this._generateId('lessonitem'),
      lessonPlanId,
      resourceId,
      orderIndex: index,
      plannedDurationMinutes:
        typeof plannedDurationMinutes === 'number' ? plannedDurationMinutes : null
    };
    items.push(newItem);
    this._saveToStorage('lesson_plan_items', items);

    const lessonPlan = lessonPlans.find((lp) => lp.id === lessonPlanId) || null;
    const itemsForPlan = items.filter((i) => i.lessonPlanId === lessonPlanId);

    return { lessonPlan, items: itemsForPlan };
  }

  updateLessonPlanDetails(
    lessonPlanId,
    title,
    description,
    totalDurationMinutes
  ) {
    let lessonPlans = this._getFromStorage('lesson_plans');
    const index = lessonPlans.findIndex((lp) => lp.id === lessonPlanId);
    if (index === -1) {
      return { lessonPlan: null };
    }
    if (typeof title === 'string') {
      lessonPlans[index].title = title;
    }
    if (typeof description === 'string') {
      lessonPlans[index].description = description;
    }
    if (typeof totalDurationMinutes === 'number') {
      lessonPlans[index].totalDurationMinutes = totalDurationMinutes;
    }
    this._saveToStorage('lesson_plans', lessonPlans);
    return { lessonPlan: lessonPlans[index] };
  }

  getLessonPlanDetails(lessonPlanId) {
    const lessonPlans = this._getFromStorage('lesson_plans');
    const items = this._getFromStorage('lesson_plan_items');
    const resources = this._getFromStorage('resources');

    const lessonPlan = lessonPlans.find((lp) => lp.id === lessonPlanId) || null;
    const itemsForPlan = items
      .filter((i) => i.lessonPlanId === lessonPlanId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const joined = itemsForPlan.map((i) => {
      const resource = resources.find((r) => r.id === i.resourceId) || null;
      return { lessonPlanItem: i, resource };
    });

    return { lessonPlan, items: joined };
  }

  // --- Resources & Reading Paths ---

  getResourceFilterOptions() {
    const resourceTypes = [
      { value: 'video', label: 'Videos' },
      { value: 'article', label: 'Articles' },
      { value: 'interactive', label: 'Interactive' },
      { value: 'other', label: 'Other' }
    ];
    const difficulties = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];
    const habitats = [
      { value: 'streams', label: 'Streams' },
      { value: 'rivers_streams', label: 'Rivers/Streams' },
      { value: 'ponds_lakes', label: 'Ponds/Lakes' }
    ];
    return { resourceTypes, difficulties, habitats };
  }

  searchResources(
    keyword,
    topicKeyword,
    resourceTypes,
    difficulties,
    habitatTags,
    page,
    pageSize,
    sortBy
  ) {
    const all = this._getFromStorage('resources');
    const kw = (keyword || '').trim().toLowerCase();
    const topic = (topicKeyword || '').trim().toLowerCase();
    const typeFilter = Array.isArray(resourceTypes) ? resourceTypes : [];
    const difficultyFilter = Array.isArray(difficulties) ? difficulties : [];
    const habitatFilter = Array.isArray(habitatTags) ? habitatTags : [];

    let filtered = all.filter((r) => {
      if (kw) {
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        if (!title.includes(kw) && !desc.includes(kw)) {
          return false;
        }
      }
      if (topic) {
        const tags = Array.isArray(r.topicKeywords)
          ? r.topicKeywords.map((t) => String(t).toLowerCase())
          : [];
        if (!tags.some((t) => t.includes(topic))) {
          return false;
        }
      }
      if (typeFilter.length) {
        if (!typeFilter.includes(r.resourceType)) return false;
      }
      if (difficultyFilter.length) {
        if (!difficultyFilter.includes(r.difficulty)) return false;
      }
      if (habitatFilter.length) {
        const rh = Array.isArray(r.habitatTags) ? r.habitatTags : [];
        const match = rh.some((h) => habitatFilter.includes(h));
        if (!match) return false;
      }
      return true;
    });

    const sort = sortBy || 'relevance';
    if (sort === 'newest') {
      filtered.sort((a, b) => {
        const ad = a.publicationDate ? new Date(a.publicationDate) : 0;
        const bd = b.publicationDate ? new Date(b.publicationDate) : 0;
        return bd - ad;
      });
    } else {
      filtered.sort((a, b) => {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    }

    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 25;
    const totalCount = filtered.length;
    const start = (pageNum - 1) * size;
    const results = filtered.slice(start, start + size);

    return { results, totalCount };
  }

  addResourceToNewReadingPath(resourceId, readingPathName, description) {
    const paths = this._getFromStorage('reading_paths');
    const items = this._getFromStorage('reading_path_items');

    const readingPath = {
      id: this._generateId('rpath'),
      name: readingPathName,
      description: description || '',
      createdAt: this._nowIso()
    };
    paths.push(readingPath);
    this._saveToStorage('reading_paths', paths);

    const orderIndex = this._calculateReadingPathItemOrder(readingPath.id);
    const item = {
      id: this._generateId('rpathitem'),
      readingPathId: readingPath.id,
      resourceId,
      orderIndex,
      targetDate: null
    };
    items.push(item);
    this._saveToStorage('reading_path_items', items);

    return { readingPath, items: [item] };
  }

  addResourceToExistingReadingPath(
    readingPathId,
    resourceId,
    orderIndex
  ) {
    const paths = this._getFromStorage('reading_paths');
    let items = this._getFromStorage('reading_path_items');

    const readingPath = paths.find((p) => p.id === readingPathId) || null;
    if (!readingPath) {
      return { readingPath: null, items: [] };
    }

    let index;
    if (typeof orderIndex === 'number') {
      index = orderIndex;
    } else {
      index = this._calculateReadingPathItemOrder(readingPathId);
    }

    const item = {
      id: this._generateId('rpathitem'),
      readingPathId,
      resourceId,
      orderIndex: index,
      targetDate: null
    };
    items.push(item);
    this._saveToStorage('reading_path_items', items);

    const itemsForPath = items.filter((i) => i.readingPathId === readingPathId);
    return { readingPath, items: itemsForPath };
  }

  getReadingPathsList() {
    return this._getFromStorage('reading_paths');
  }

  getReadingPathDetails(readingPathId) {
    const paths = this._getFromStorage('reading_paths');
    const items = this._getFromStorage('reading_path_items');
    const resources = this._getFromStorage('resources');

    const readingPath = paths.find((p) => p.id === readingPathId) || null;
    const itemsForPath = items
      .filter((i) => i.readingPathId === readingPathId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const joined = itemsForPath.map((i) => {
      const resource = resources.find((r) => r.id === i.resourceId) || null;
      return { readingPathItem: i, resource };
    });

    return { readingPath, items: joined };
  }

  updateReadingPathScheduleAndOrder(readingPathId, items) {
    const paths = this._getFromStorage('reading_paths');
    let itemsAll = this._getFromStorage('reading_path_items');

    const readingPath = paths.find((p) => p.id === readingPathId) || null;
    if (!readingPath) {
      return { readingPath: null, items: [] };
    }

    const updates = Array.isArray(items) ? items : [];

    itemsAll = itemsAll.map((existing) => {
      if (existing.readingPathId !== readingPathId) return existing;
      const update = updates.find((u) => u.resourceId === existing.resourceId);
      if (!update) return existing;
      if (typeof update.orderIndex === 'number') {
        existing.orderIndex = update.orderIndex;
      }
      if (typeof update.targetDate === 'string') {
        existing.targetDate = update.targetDate;
      }
      return existing;
    });

    this._saveToStorage('reading_path_items', itemsAll);

    const itemsForPath = itemsAll.filter((i) => i.readingPathId === readingPathId);
    return { readingPath, items: itemsForPath };
  }

  // --- Distribution Maps & Map Notes ---

  getDistributionMapFilterOptions() {
    const taxonGroups = [
      { value: 'caddisflies_trichoptera', label: 'Caddisflies (Trichoptera)' },
      { value: 'mayflies_ephemeroptera', label: 'Mayflies (Ephemeroptera)' },
      { value: 'dragonflies_odonata', label: 'Dragonflies (Odonata)' },
      { value: 'stoneflies_plecoptera', label: 'Stoneflies (Plecoptera)' },
      { value: 'beetles_coleoptera', label: 'Beetles (Coleoptera)' },
      { value: 'true_flies_diptera', label: 'True flies (Diptera)' },
      { value: 'other', label: 'Other' }
    ];
    const regions = [
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia', label: 'Asia' }
    ];
    return { taxonGroups, regions };
  }

  searchDistributionMapsByTaxonAndRegion(taxonGroup, regions) {
    const maps = this._getFromStorage('distribution_maps');
    const species = this._getFromStorage('species');

    const regionFilter = Array.isArray(regions) ? regions : [];

    const results = maps
      .filter((m) => {
        if (regionFilter.length) {
          const mr = Array.isArray(m.regionTags) ? m.regionTags : [];
          const match = mr.some((r) => regionFilter.includes(r));
          if (!match) return false;
        }
        if (taxonGroup) {
          const s = species.find((sp) => sp.id === m.speciesId) || null;
          if (!s || s.taxonGroup !== taxonGroup) {
            return false;
          }
        }
        return true;
      })
      .map((m) => {
        const s = species.find((sp) => sp.id === m.speciesId) || null;
        return {
          distributionMapId: m.id,
          speciesId: m.speciesId,
          scientificName: s ? s.scientificName : '',
          commonName: s && s.commonName ? s.commonName : '',
          regionTags: Array.isArray(m.regionTags) ? m.regionTags : []
        };
      });

    return { results, totalCount: results.length };
  }

  getDistributionMapDetails(distributionMapId) {
    const maps = this._getFromStorage('distribution_maps');
    const species = this._getFromStorage('species');

    const distributionMap = maps.find((m) => m.id === distributionMapId) || null;
    const s = distributionMap && species.find((sp) => sp.id === distributionMap.speciesId);
    const speciesObj = s || null;

    return { distributionMap, species: speciesObj };
  }

  getDistributionMapForSpecies(speciesId) {
    const maps = this._getFromStorage('distribution_maps');
    const distributionMap = maps.find((m) => m.speciesId === speciesId) || null;
    return { distributionMap };
  }

  saveMapToNotesList(distributionMapId, mapNotesListId, listName) {
    const maps = this._getFromStorage('distribution_maps');
    const map = maps.find((m) => m.id === distributionMapId);
    if (!map) {
      return {
        success: false,
        mapNotesListId: null,
        mapNoteItemId: null,
        message: 'Distribution map not found.'
      };
    }

    let list = null;
    if (mapNotesListId) {
      const lists = this._getFromStorage('map_notes_lists');
      list = lists.find((l) => l.id === mapNotesListId) || null;
    } else if (listName) {
      let lists = this._getFromStorage('map_notes_lists');
      list = lists.find((l) => l.name === listName) || null;
      if (!list) {
        list = {
          id: this._generateId('mapnoteslist'),
          name: listName,
          description: '',
          createdAt: this._nowIso()
        };
        lists.push(list);
        this._saveToStorage('map_notes_lists', lists);
      }
    } else {
      list = this._getOrCreateDefaultMapNotesList('Map Notes');
    }

    if (!list) {
      return {
        success: false,
        mapNotesListId: null,
        mapNoteItemId: null,
        message: 'Unable to determine Map Notes list.'
      };
    }

    let items = this._getFromStorage('map_note_items');
    const newItem = {
      id: this._generateId('mapnoteitem'),
      mapNotesListId: list.id,
      distributionMapId,
      addedAt: this._nowIso(),
      tags: [],
      note: ''
    };
    items.push(newItem);
    this._saveToStorage('map_note_items', items);

    return {
      success: true,
      mapNotesListId: list.id,
      mapNoteItemId: newItem.id,
      message: 'Map saved to notes list.'
    };
  }

  getMapNotesLists() {
    return this._getFromStorage('map_notes_lists');
  }

  getMapNotesListDetails(mapNotesListId) {
    const lists = this._getFromStorage('map_notes_lists');
    const items = this._getFromStorage('map_note_items');
    const maps = this._getFromStorage('distribution_maps');
    const species = this._getFromStorage('species');

    const mapNotesList = lists.find((l) => l.id === mapNotesListId) || null;

    const itemsForList = items
      .filter((i) => i.mapNotesListId === mapNotesListId)
      .map((i) => {
        const map = maps.find((m) => m.id === i.distributionMapId) || null;
        const s = map && species.find((sp) => sp.id === map.speciesId);
        return {
          mapNoteItemId: i.id,
          distributionMap: map,
          species: s || null,
          tags: Array.isArray(i.tags) ? i.tags : [],
          note: i.note || '',
          addedAt: i.addedAt || null
        };
      });

    return { mapNotesList, items: itemsForList };
  }

  removeMapFromNotesList(mapNoteItemId) {
    let items = this._getFromStorage('map_note_items');
    const before = items.length;
    items = items.filter((i) => i.id !== mapNoteItemId);
    this._saveToStorage('map_note_items', items);
    const after = items.length;
    return { success: before !== after };
  }

  updateMapNoteItem(mapNoteItemId, tags, note) {
    let items = this._getFromStorage('map_note_items');
    const index = items.findIndex((i) => i.id === mapNoteItemId);
    if (index === -1) {
      return { mapNoteItem: null };
    }
    if (Array.isArray(tags)) {
      items[index].tags = tags;
    }
    if (typeof note === 'string') {
      items[index].note = note;
    }
    this._saveToStorage('map_note_items', items);
    return { mapNoteItem: items[index] };
  }

  // --- Glossary & Practice Lists ---

  searchGlossaryTerms(textQuery, category) {
    const terms = this._getFromStorage('glossary_terms');
    const q = (textQuery || '').trim().toLowerCase();
    return terms.filter((t) => {
      if (category && t.category !== category) return false;
      if (q) {
        const term = (t.term || '').toLowerCase();
        const def = (t.definition || '').toLowerCase();
        if (!term.includes(q) && !def.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }

  getOrCreateCurrentGlossarySelection() {
    const selection = this._getOrCreateGlossarySelection();
    const termsAll = this._getFromStorage('glossary_terms');
    const terms = termsAll.filter((t) => selection.selectedTermIds.includes(t.id));
    return { selection, terms };
  }

  addTermToGlossarySelection(glossaryTermId) {
    let selections = this._getFromStorage('glossary_selections');
    let selection = this._getOrCreateGlossarySelection();
    if (!selection.selectedTermIds.includes(glossaryTermId)) {
      selection.selectedTermIds.push(glossaryTermId);
    }
    selections = selections.map((s) => (s.id === selection.id ? selection : s));
    this._saveToStorage('glossary_selections', selections);
    return { selection };
  }

  removeTermFromGlossarySelection(glossaryTermId) {
    let selections = this._getFromStorage('glossary_selections');
    let selection = this._getOrCreateGlossarySelection();
    selection.selectedTermIds = selection.selectedTermIds.filter(
      (id) => id !== glossaryTermId
    );
    selections = selections.map((s) => (s.id === selection.id ? selection : s));
    this._saveToStorage('glossary_selections', selections);
    return { selection };
  }

  clearGlossarySelection() {
    let selections = this._getFromStorage('glossary_selections');
    const currentId = localStorage.getItem('current_glossary_selection_id');
    if (currentId) {
      selections = selections.map((s) => {
        if (s.id === currentId) {
          s.selectedTermIds = [];
        }
        return s;
      });
      this._saveToStorage('glossary_selections', selections);
    }
    return { success: true };
  }

  getGlossaryPracticeLists() {
    return this._getFromStorage('glossary_lists');
  }

  createGlossaryPracticeList(name, description) {
    const lists = this._getFromStorage('glossary_lists');
    const newList = {
      id: this._generateId('glist'),
      name,
      description: description || '',
      createdAt: this._nowIso()
    };
    lists.push(newList);
    this._saveToStorage('glossary_lists', lists);
    return { glossaryList: newList };
  }

  assignSelectedTermsToGlossaryList(glossaryListId) {
    const lists = this._getFromStorage('glossary_lists');
    const list = lists.find((l) => l.id === glossaryListId) || null;
    if (!list) {
      return { glossaryList: null, termCount: 0 };
    }

    const selection = this._getOrCreateGlossarySelection();
    const termIds = selection.selectedTermIds;

    let items = this._getFromStorage('glossary_list_items');
    const existingForList = items.filter((i) => i.glossaryListId === glossaryListId);
    let nextIndex = existingForList.reduce(
      (max, i) => (typeof i.orderIndex === 'number' ? Math.max(max, i.orderIndex) : max),
      -1
    );
    const existingTermIds = new Set(existingForList.map((i) => i.glossaryTermId));

    termIds.forEach((termId) => {
      if (existingTermIds.has(termId)) return;
      nextIndex += 1;
      const newItem = {
        id: this._generateId('glistitem'),
        glossaryListId,
        glossaryTermId: termId,
        orderIndex: nextIndex,
        addedAt: this._nowIso()
      };
      items.push(newItem);
    });

    this._saveToStorage('glossary_list_items', items);

    const totalForList = items.filter((i) => i.glossaryListId === glossaryListId)
      .length;

    return { glossaryList: list, termCount: totalForList };
  }

  getGlossaryPracticeListDetails(glossaryListId) {
    const lists = this._getFromStorage('glossary_lists');
    const items = this._getFromStorage('glossary_list_items');
    const terms = this._getFromStorage('glossary_terms');

    const glossaryList = lists.find((l) => l.id === glossaryListId) || null;
    const itemsForList = items
      .filter((i) => i.glossaryListId === glossaryListId)
      .sort((a, b) => {
        const ao = typeof a.orderIndex === 'number' ? a.orderIndex : 0;
        const bo = typeof b.orderIndex === 'number' ? b.orderIndex : 0;
        return ao - bo;
      });

    const joined = itemsForList.map((i) => {
      const term = terms.find((t) => t.id === i.glossaryTermId) || null;
      return { glossaryListItem: i, term };
    });

    return { glossaryList, items: joined };
  }

  removeTermFromGlossaryPracticeList(glossaryListItemId) {
    let items = this._getFromStorage('glossary_list_items');
    const before = items.length;
    items = items.filter((i) => i.id !== glossaryListItemId);
    this._saveToStorage('glossary_list_items', items);
    const after = items.length;
    return { success: before !== after };
  }

  getGlossaryPracticeFlashcards(glossaryListId) {
    const items = this._getFromStorage('glossary_list_items');
    const terms = this._getFromStorage('glossary_terms');

    const itemsForList = items
      .filter((i) => i.glossaryListId === glossaryListId)
      .sort((a, b) => {
        const ao = typeof a.orderIndex === 'number' ? a.orderIndex : 0;
        const bo = typeof b.orderIndex === 'number' ? b.orderIndex : 0;
        return ao - bo;
      });

    const termObjs = itemsForList
      .map((i) => terms.find((t) => t.id === i.glossaryTermId))
      .filter((t) => !!t);

    // Instrumentation for task completion tracking
    try {
      const lists = this._getFromStorage('glossary_lists');
      const glossaryList = lists.find((l) => l.id === glossaryListId) || null;

      if (
        glossaryList &&
        glossaryList.name === 'Larval adaptations' &&
        termObjs &&
        termObjs.length === 6
      ) {
        const termIds = itemsForList.map((i) => i.glossaryTermId);
        const session = {
          glossaryListId,
          termIds,
          startedAt: this._nowIso()
        };
        localStorage.setItem('task7_practiceSession', JSON.stringify(session));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { glossaryListId, terms: termObjs };
  }

  // --- Insect Orders list & Metamorphosis Charts ---

  getInsectOrders(metamorphosisType, isAquaticOnly, searchQuery) {
    const orders = this._getFromStorage('insect_orders');
    const q = (searchQuery || '').trim().toLowerCase();
    const aquaticOnly = isAquaticOnly !== false; // default true

    return orders.filter((o) => {
      if (aquaticOnly && !o.isAquatic) return false;
      if (metamorphosisType && o.metamorphosisType !== metamorphosisType) {
        return false;
      }
      if (q) {
        const sci = (o.scientificName || '').toLowerCase();
        const common = (o.commonName || '').toLowerCase();
        if (!sci.includes(q) && !common.includes(q)) return false;
      }
      return true;
    });
  }

  buildMetamorphosisChartPreview(insectOrderIds) {
    const ordersAll = this._getFromStorage('insect_orders');
    const ids = Array.isArray(insectOrderIds) ? insectOrderIds : [];
    const orders = ordersAll.filter((o) => ids.includes(o.id));

    const columns = {
      complete: [],
      incomplete: []
    };

    orders.forEach((o) => {
      if (o.metamorphosisType === 'complete_holometabolous') {
        columns.complete.push(o.id);
      } else if (o.metamorphosisType === 'incomplete_hemimetabolous') {
        columns.incomplete.push(o.id);
      }
    });

    return { orders, columns };
  }

  createMetamorphosisChart(title, description, items) {
    const charts = this._getFromStorage('metamorphosis_charts');
    const chartItems = this._getFromStorage('metamorphosis_chart_items');

    const chart = {
      id: this._generateId('metachart'),
      title,
      description: description || '',
      createdAt: this._nowIso()
    };
    charts.push(chart);
    this._saveToStorage('metamorphosis_charts', charts);

    const newItems = (Array.isArray(items) ? items : []).map((item, idx) => ({
      id: this._generateId('metachartitem'),
      chartId: chart.id,
      insectOrderId: item.insectOrderId,
      column: item.column,
      orderIndex: typeof item.orderIndex === 'number' ? item.orderIndex : idx
    }));

    chartItems.push.apply(chartItems, newItems);
    this._saveToStorage('metamorphosis_chart_items', chartItems);

    return { chart, items: newItems };
  }

  getMetamorphosisChartsList() {
    return this._getFromStorage('metamorphosis_charts');
  }

  getMetamorphosisChartDetails(chartId) {
    const charts = this._getFromStorage('metamorphosis_charts');
    const chartItems = this._getFromStorage('metamorphosis_chart_items');
    const orders = this._getFromStorage('insect_orders');

    const chart = charts.find((c) => c.id === chartId) || null;
    const itemsForChart = chartItems
      .filter((i) => i.chartId === chartId)
      .sort((a, b) => {
        if (a.column === b.column) {
          const ao = typeof a.orderIndex === 'number' ? a.orderIndex : 0;
          const bo = typeof b.orderIndex === 'number' ? b.orderIndex : 0;
          return ao - bo;
        }
        if (a.column === 'complete') return -1;
        if (b.column === 'complete') return 1;
        return 0;
      });

    const joined = itemsForChart.map((i) => {
      const order = orders.find((o) => o.id === i.insectOrderId) || null;
      return { chartItem: i, insectOrder: order };
    });

    return { chart, items: joined };
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