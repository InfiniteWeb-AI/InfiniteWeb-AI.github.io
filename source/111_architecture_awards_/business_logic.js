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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // -----------------------------
  // Storage helpers
  // -----------------------------

  _initStorage() {
    // Core entity tables (arrays)
    const arrayKeys = [
      'projects',
      'comparison_lists',
      'favorite_projects',
      'viewing_list_items',
      'shortlisted_projects',
      'top_choice_projects',
      'competitions',
      'competition_watchlist_items',
      'competition_registrations',
      'peoples_choice_user_votes',
      'newsletter_subscriptions'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // User state (single user)
    if (!localStorage.getItem('user_state')) {
      const now = new Date().toISOString();
      localStorage.setItem(
        'user_state',
        JSON.stringify({
          comparison_list_id: null,
          created_at: now,
          updated_at: now
        })
      );
    }

    // Static page content placeholders (object structures, no mock text)
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem(
        'about_content',
        JSON.stringify({ hero_title: '', hero_subtitle: '', sections: [], partners: [] })
      );
    }

    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({
          support_email: '',
          awards_email: '',
          privacy_email: '',
          mailing_address: '',
          contact_channels: []
        })
      );
    }

    if (!localStorage.getItem('faq_entries')) {
      localStorage.setItem(
        'faq_entries',
        JSON.stringify({ categories: [], faqs: [] })
      );
    }

    if (!localStorage.getItem('terms_content')) {
      localStorage.setItem(
        'terms_content',
        JSON.stringify({ version: '', last_updated: '', sections: [] })
      );
    }

    if (!localStorage.getItem('privacy_policy_content')) {
      localStorage.setItem(
        'privacy_policy_content',
        JSON.stringify({ version: '', last_updated: '', sections: [] })
      );
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  _nowISO() {
    return new Date().toISOString();
  }

  // -----------------------------
  // Internal helpers: user state & lists
  // -----------------------------

  _getOrCreateUserState() {
    const raw = localStorage.getItem('user_state');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // Reset if corrupted
      }
    }
    const now = this._nowISO();
    const state = { comparison_list_id: null, created_at: now, updated_at: now };
    this._persistUserState(state);
    return state;
  }

  _persistUserState(state) {
    const updated = { ...state, updated_at: this._nowISO() };
    localStorage.setItem('user_state', JSON.stringify(updated));
    return updated;
  }

  _getOrCreateComparisonList() {
    const state = this._getOrCreateUserState();
    let comparisonLists = this._getFromStorage('comparison_lists', []);

    if (state.comparison_list_id) {
      const existing = comparisonLists.find((c) => c.id === state.comparison_list_id);
      if (existing) {
        return existing;
      }
    }

    const now = this._nowISO();
    const newList = {
      id: this._generateId('comparison'),
      project_ids: [],
      created_at: now,
      updated_at: now
    };
    comparisonLists.push(newList);
    this._saveToStorage('comparison_lists', comparisonLists);

    const newState = { ...state, comparison_list_id: newList.id };
    this._persistUserState(newState);
    return newList;
  }

  _updateComparisonList(list) {
    let comparisonLists = this._getFromStorage('comparison_lists', []);
    const idx = comparisonLists.findIndex((c) => c.id === list.id);
    if (idx >= 0) {
      comparisonLists[idx] = { ...list, updated_at: this._nowISO() };
    } else {
      comparisonLists.push({ ...list, updated_at: this._nowISO() });
    }
    this._saveToStorage('comparison_lists', comparisonLists);
  }

  _incrementPeoplesChoiceVotes(projectId) {
    let votes = this._getFromStorage('peoples_choice_user_votes', []);
    const existing = votes.find((v) => v.project_id === projectId);
    const projects = this._getFromStorage('projects', []);
    const projIndex = projects.findIndex((p) => p.id === projectId);

    if (existing) {
      // User already voted for this project; do not increment
      const currentCount =
        projIndex >= 0 ? (projects[projIndex].peoples_choice_votes_count || 0) : 0;
      return {
        already_voted: true,
        votes_count: currentCount
      };
    }

    const vote = {
      id: this._generateId('pcvote'),
      project_id: projectId,
      voted_at: this._nowISO()
    };
    votes.push(vote);
    this._saveToStorage('peoples_choice_user_votes', votes);

    if (projIndex >= 0) {
      const existingCount = projects[projIndex].peoples_choice_votes_count || 0;
      projects[projIndex].peoples_choice_votes_count = existingCount + 1;
      this._saveToStorage('projects', projects);
      return {
        already_voted: false,
        votes_count: projects[projIndex].peoples_choice_votes_count
      };
    }

    return {
      already_voted: false,
      votes_count: 0
    };
  }

  _getCategoryLabel(category) {
    const map = {
      residential: 'Residential',
      cultural: 'Cultural',
      museum_cultural: 'Museum / Cultural',
      hospitality_hotel: 'Hospitality / Hotel',
      education: 'Education',
      public_space: 'Public Space',
      urban_public_realm: 'Urban / Public Realm',
      other: 'Other'
    };
    return map[category] || '';
  }

  _getJuryStatusLabel(status) {
    const map = {
      winner: 'Winner',
      shortlisted: 'Shortlisted',
      none: 'Not Awarded'
    };
    return map[status] || '';
  }

  _getCompetitionPrimaryCategoryLabel(primaryCategory) {
    return this._getCategoryLabel(primaryCategory);
  }

  _getCompetitionTypeLabel(type) {
    const map = {
      professional: 'Professional',
      student: 'Student',
      mixed: 'Mixed'
    };
    return map[type] || '';
  }

  _getCompetitionStatusLabel(status) {
    const map = {
      open: 'Open',
      closed: 'Closed',
      upcoming: 'Upcoming'
    };
    return map[status] || '';
  }

  _capitalizeWords(str) {
    if (!str) return '';
    return str
      .split(/[_\s]+/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _expandCategoryFilter(category) {
    if (!category) return [];
    if (category === 'cultural' || category === 'museum_cultural') {
      return ['cultural', 'museum_cultural'];
    }
    if (category === 'public_space' || category === 'urban_public_realm') {
      return ['public_space', 'urban_public_realm'];
    }
    return [category];
  }

  _getSustainabilityTagLabels(tags) {
    if (!Array.isArray(tags)) return [];
    const map = {
      sustainability: 'Sustainability',
      green_building: 'Green Building'
    };
    return tags.map((t) => map[t] || this._capitalizeWords(String(t)));
  }

  _getUserProjectListFlags() {
    const favorites = this._getFromStorage('favorite_projects', []);
    const viewing = this._getFromStorage('viewing_list_items', []);
    const shortlist = this._getFromStorage('shortlisted_projects', []);
    const topChoices = this._getFromStorage('top_choice_projects', []);
    const comparisonList = this._getOrCreateComparisonList();

    const favoriteIds = new Set(favorites.map((f) => f.project_id));
    const viewingIds = new Set(viewing.map((v) => v.project_id));
    const shortlistIds = new Set(shortlist.map((s) => s.project_id));
    const topChoiceIds = new Set(topChoices.map((t) => t.project_id));
    const comparisonIds = new Set((comparisonList.project_ids || []).slice());

    return { favoriteIds, viewingIds, shortlistIds, topChoiceIds, comparisonIds };
  }

  _computePrizeRangeLabel(comp) {
    const { prize_min, prize_max, headline_prize } = comp;
    const format = (n) =>
      typeof n === 'number' && !isNaN(n)
        ? '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : '';

    if (prize_min != null && prize_max != null) {
      return `${format(prize_min)} – ${format(prize_max)}`;
    }
    if (prize_min != null) {
      return `${format(prize_min)}+`;
    }
    if (prize_max != null) {
      return `Up to ${format(prize_max)}`;
    }
    if (headline_prize != null) {
      return format(headline_prize);
    }
    return '';
  }

  _computeCompetitionHighlightReason(comp) {
    const now = new Date();
    const is2026 = comp.year === 2026;
    const isStudentMidRange =
      comp.is_student_only === true &&
      ((typeof comp.prize_min === 'number' && comp.prize_min >= 5000) ||
        (typeof comp.headline_prize === 'number' && comp.headline_prize >= 5000)) &&
      ((typeof comp.prize_max === 'number' && comp.prize_max <= 20000) ||
        (typeof comp.headline_prize === 'number' && comp.headline_prize <= 20000)) &&
      comp.deadline_month === 'october' &&
      comp.deadline_year === 2025;

    let earlyBirdActive = false;
    if (comp.has_early_bird && comp.early_bird_deadline) {
      const eb = new Date(comp.early_bird_deadline);
      earlyBirdActive = eb >= now;
    }

    if (earlyBirdActive) return 'early_bird';
    if (isStudentMidRange) return 'october_2025_student_mid_range';
    if (is2026) return '2026_award';
    return '';
  }

  _formatDeadlineLabel(deadlineStr) {
    if (!deadlineStr) return '';
    const d = new Date(deadlineStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // -----------------------------
  // Interface: getHomePageHighlights
  // -----------------------------

  getHomePageHighlights() {
    const projects = this._getFromStorage('projects', []);
    const competitions = this._getFromStorage('competitions', []);
    const votes = this._getFromStorage('peoples_choice_user_votes', []);

    // Featured projects by category: top by jury_status then rating
    const categories = ['residential', 'cultural', 'education', 'public_space', 'hospitality_hotel'];

    const juryRank = { winner: 2, shortlisted: 1, none: 0 };

    const featured_projects_by_category = categories.map((cat) => {
      const expanded = this._expandCategoryFilter(cat);
      const filtered = projects
        .filter((p) => expanded.includes(p.category))
        .slice();

      filtered.sort((a, b) => {
        const jrA = juryRank[a.jury_status] || 0;
        const jrB = juryRank[b.jury_status] || 0;
        if (jrA !== jrB) return jrB - jrA;
        const rA = a.public_rating || 0;
        const rB = b.public_rating || 0;
        if (rA !== rB) return rB - rA;
        const yA = a.completion_year || 0;
        const yB = b.completion_year || 0;
        return yB - yA;
      });

      const top = filtered.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        thumbnail_image_url: p.thumbnail_image_url || '',
        location_city: p.location_city || '',
        location_country: p.location_country || '',
        completion_year: p.completion_year || null,
        jury_status: p.jury_status || 'none',
        jury_status_label: this._getJuryStatusLabel(p.jury_status),
        public_rating: p.public_rating || 0,
        rating_count: p.rating_count || 0
      }));

      return {
        category: cat,
        category_label: this._getCategoryLabel(cat),
        projects: top
      };
    });

    const highlighted_competitions = competitions.map((c) => ({
      id: c.id,
      title: c.title,
      year: c.year,
      primary_category: c.primary_category || 'other',
      primary_category_label: this._getCompetitionPrimaryCategoryLabel(c.primary_category),
      competition_type: c.competition_type || '',
      is_student_only: c.is_student_only === true,
      headline_prize: c.headline_prize || null,
      prize_range_label: this._computePrizeRangeLabel(c),
      deadline: c.deadline || null,
      deadline_label: this._formatDeadlineLabel(c.deadline),
      deadline_month: c.deadline_month || null,
      deadline_year: c.deadline_year || null,
      has_early_bird: c.has_early_bird === true,
      early_bird_deadline: c.early_bird_deadline || null,
      highlight_reason: this._computeCompetitionHighlightReason(c)
    }));

    // People’s choice featured: top by votes
    const voteIds = new Set(votes.map((v) => v.project_id));

    const peoples_choice_projects = projects
      .filter((p) => p.is_peoples_choice_eligible === true)
      .slice()
      .sort((a, b) => {
        const vA = a.peoples_choice_votes_count || 0;
        const vB = b.peoples_choice_votes_count || 0;
        if (vA !== vB) return vB - vA;
        const rA = a.public_rating || 0;
        const rB = b.public_rating || 0;
        return rB - rA;
      })
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        category_label: this._getCategoryLabel(p.category),
        thumbnail_image_url: p.thumbnail_image_url || '',
        public_rating: p.public_rating || 0,
        rating_count: p.rating_count || 0,
        peoples_choice_votes_count: p.peoples_choice_votes_count || 0,
        user_has_voted: voteIds.has(p.id)
      }));

    const quick_link_tiles = [
      {
        tile_id: 'sustainable_residential',
        title: 'Sustainable Residential Projects',
        description: 'Explore residential projects with sustainability focus.',
        target_page: 'projects',
        preset_filters: {
          category: 'residential',
          sustainability_required: true,
          tag: 'sustainability'
        }
      },
      {
        tile_id: 'peoples_choice_public_space',
        title: "People's Choice: Public Spaces",
        description: 'Vote on the most inspiring public spaces.',
        target_page: 'peoples_choice',
        preset_filters: {
          category: 'public_space',
          sustainability_required: false,
          tag: ''
        }
      },
      {
        tile_id: 'student_competitions',
        title: 'Student Competitions',
        description: 'Browse open calls for student architects.',
        target_page: 'awards_competitions',
        preset_filters: {
          category: '',
          sustainability_required: false,
          tag: ''
        }
      }
    ];

    return {
      featured_projects_by_category,
      highlighted_competitions,
      peoples_choice_featured_projects: peoples_choice_projects,
      quick_link_tiles
    };
  }

  // -----------------------------
  // Interface: searchGlobal
  // -----------------------------

  searchGlobal(query, filters) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const type = f.type || 'all';

    const projects = this._getFromStorage('projects', []);
    const competitions = this._getFromStorage('competitions', []);

    const expandCategory = (cat) => this._expandCategoryFilter(cat);
    const filterCategory = f.category ? expandCategory(f.category) : null;

    const yearMin = typeof f.year_min === 'number' ? f.year_min : null;
    const yearMax = typeof f.year_max === 'number' ? f.year_max : null;

    let project_results = [];
    if (type === 'all' || type === 'project') {
      project_results = projects
        .filter((p) => {
          if (q) {
            const haystack = `${p.title || ''} ${(p.subtitle || '')}`.toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          if (filterCategory && filterCategory.length) {
            if (!filterCategory.includes(p.category)) return false;
          }
          if (f.continent && p.continent && p.continent !== f.continent) return false;
          if (yearMin != null && typeof p.completion_year === 'number' && p.completion_year < yearMin)
            return false;
          if (yearMax != null && typeof p.completion_year === 'number' && p.completion_year > yearMax)
            return false;
          return true;
        })
        .map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: p.subtitle || '',
          category: p.category,
          category_label: this._getCategoryLabel(p.category),
          location_city: p.location_city || '',
          location_country: p.location_country || '',
          continent: p.continent || null,
          completion_year: p.completion_year || null,
          jury_status: p.jury_status || 'none',
          jury_status_label: this._getJuryStatusLabel(p.jury_status),
          public_rating: p.public_rating || 0,
          thumbnail_image_url: p.thumbnail_image_url || '',
          is_peoples_choice_eligible: p.is_peoples_choice_eligible === true
        }));
    }

    let competition_results = [];
    if (type === 'all' || type === 'competition') {
      competition_results = competitions
        .filter((c) => {
          if (q) {
            const haystack = `${c.title || ''} ${c.description || ''}`.toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          if (filterCategory && filterCategory.length) {
            if (!filterCategory.includes(c.primary_category)) return false;
          }
          if (f.continent && c.region && c.region.toLowerCase() !== f.continent.toLowerCase()) {
            // Region vs continent is not strictly aligned; we only compare if clearly similar.
          }
          if (yearMin != null && typeof c.year === 'number' && c.year < yearMin) return false;
          if (yearMax != null && typeof c.year === 'number' && c.year > yearMax) return false;
          return true;
        })
        .map((c) => ({
          id: c.id,
          title: c.title,
          year: c.year,
          primary_category: c.primary_category || 'other',
          primary_category_label: this._getCompetitionPrimaryCategoryLabel(c.primary_category),
          competition_type: c.competition_type || '',
          is_student_only: c.is_student_only === true,
          region: c.region || '',
          status: c.status || '',
          headline_prize: c.headline_prize || null,
          deadline: c.deadline || null
        }));
    }

    return { project_results, competition_results };
  }

  // -----------------------------
  // Interface: getProjectFilterOptions
  // -----------------------------

  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects', []);

    const existingCategorySet = new Set(
      projects.map((p) => p.category).filter((c) => typeof c === 'string' && c)
    );

    const categories = [
      'residential',
      'cultural',
      'museum_cultural',
      'hospitality_hotel',
      'education',
      'public_space',
      'urban_public_realm',
      'other'
    ]
      .filter((value) => existingCategorySet.has(value))
      .map((value) => ({ value, label: this._getCategoryLabel(value) }));

    const continents = [
      'europe',
      'asia',
      'north_america',
      'south_america',
      'africa',
      'oceania',
      'antarctica'
    ].map((value) => ({ value, label: this._capitalizeWords(value) }));

    const jury_statuses = ['winner', 'shortlisted', 'none'].map((value) => ({
      value,
      label: this._getJuryStatusLabel(value)
    }));

    const knownTags = new Set();
    projects.forEach((p) => {
      if (Array.isArray(p.sustainability_tags)) {
        p.sustainability_tags.forEach((t) => knownTags.add(t));
      }
    });
    const sustainability_tags = Array.from(knownTags).map((value) => ({
      value,
      label: this._capitalizeWords(String(value))
    }));

    const rating_thresholds = [
      { value: 0, label: 'All ratings' },
      { value: 3, label: '3+ stars' },
      { value: 4, label: '4+ stars' },
      { value: 4.5, label: '4.5+ stars' }
    ];

    let years = projects
      .map((p) => p.completion_year)
      .filter((y) => typeof y === 'number');
    const completion_year_range = {
      min_year: years.length ? Math.min(...years) : null,
      max_year: years.length ? Math.max(...years) : null
    };

    let areas = projects
      .map((p) => p.floor_area_sqm)
      .filter((x) => typeof x === 'number');
    const floor_area_range_sqm = {
      min: areas.length ? Math.min(...areas) : null,
      max: areas.length ? Math.max(...areas) : null
    };

    let floorsList = projects
      .map((p) => p.floors)
      .filter((x) => typeof x === 'number');
    const floors_range = {
      min: floorsList.length ? Math.min(...floorsList) : null,
      max: floorsList.length ? Math.max(...floorsList) : null
    };

    let budgets = projects
      .map((p) => p.budget)
      .filter((x) => typeof x === 'number');
    const budget_range = {
      min: budgets.length ? Math.min(...budgets) : null,
      max: budgets.length ? Math.max(...budgets) : null
    };

    const sort_options = [
      {
        value: 'rating_high_to_low',
        label: 'Rating: High to Low',
        description: 'Sort by highest public rating first.'
      },
      {
        value: 'newest_first',
        label: 'Newest First',
        description: 'Sort by most recent completion year.'
      },
      {
        value: 'recently_awarded',
        label: 'Recently Awarded',
        description: 'Show recent winners and shortlisted projects first.'
      },
      {
        value: 'most_popular',
        label: 'Most Popular',
        description: "Sort by People's Choice popularity."
      },
      {
        value: 'most_voted',
        label: 'Most Voted',
        description: 'Sort by number of People’s Choice votes.'
      }
    ];

    return {
      categories,
      continents,
      jury_statuses,
      sustainability_tags,
      rating_thresholds,
      completion_year_range,
      floor_area_range_sqm,
      floors_range,
      budget_range,
      sort_options
    };
  }

  // -----------------------------
  // Interface: listProjects
  // -----------------------------

  listProjects(filters, sort, page, page_size) {
    const f = filters || {};
    const sortKey = sort || 'newest_first';
    const currentPage = page || 1;
    const size = page_size || 20;

    let projects = this._getFromStorage('projects', []);

    const allowedCategories = f.category ? this._expandCategoryFilter(f.category) : null;

    projects = projects.filter((p) => {
      if (allowedCategories && allowedCategories.length && !allowedCategories.includes(p.category)) {
        return false;
      }
      if (f.jury_status && p.jury_status !== f.jury_status) return false;

      if (
        typeof f.completion_year_min === 'number' &&
        typeof p.completion_year === 'number' &&
        p.completion_year < f.completion_year_min
      ) {
        return false;
      }
      if (
        typeof f.completion_year_max === 'number' &&
        typeof p.completion_year === 'number' &&
        p.completion_year > f.completion_year_max
      ) {
        return false;
      }

      if (
        typeof f.floor_area_min_sqm === 'number' &&
        typeof p.floor_area_sqm === 'number' &&
        p.floor_area_sqm < f.floor_area_min_sqm
      ) {
        return false;
      }
      if (
        typeof f.floor_area_max_sqm === 'number' &&
        typeof p.floor_area_sqm === 'number' &&
        p.floor_area_sqm > f.floor_area_max_sqm
      ) {
        return false;
      }

      if (
        typeof f.floors_min === 'number' &&
        typeof p.floors === 'number' &&
        p.floors < f.floors_min
      ) {
        return false;
      }
      if (
        typeof f.floors_max === 'number' &&
        typeof p.floors === 'number' &&
        p.floors > f.floors_max
      ) {
        return false;
      }

      if (f.continent && p.continent && p.continent !== f.continent) return false;

      if (
        typeof f.budget_min === 'number' &&
        typeof p.budget === 'number' &&
        p.budget < f.budget_min
      ) {
        return false;
      }
      if (
        typeof f.budget_max === 'number' &&
        typeof p.budget === 'number' &&
        p.budget > f.budget_max
      ) {
        return false;
      }

      if (Array.isArray(f.sustainability_tags) && f.sustainability_tags.length) {
        const tags = Array.isArray(p.sustainability_tags) ? p.sustainability_tags : [];
        const hasAny = f.sustainability_tags.some((tag) => tags.includes(tag));
        if (!hasAny) return false;
      }

      if (
        typeof f.minimum_public_rating === 'number' &&
        typeof p.public_rating === 'number' &&
        p.public_rating < f.minimum_public_rating
      ) {
        return false;
      }

      return true;
    });

    const juryRank = { winner: 2, shortlisted: 1, none: 0 };

    projects.sort((a, b) => {
      switch (sortKey) {
        case 'rating_high_to_low': {
          const rA = a.public_rating || 0;
          const rB = b.public_rating || 0;
          if (rA !== rB) return rB - rA;
          const cA = a.rating_count || 0;
          const cB = b.rating_count || 0;
          return cB - cA;
        }
        case 'recently_awarded': {
          const jA = juryRank[a.jury_status] || 0;
          const jB = juryRank[b.jury_status] || 0;
          if (jA !== jB) return jB - jA;
          const yA = a.completion_year || 0;
          const yB = b.completion_year || 0;
          return yB - yA;
        }
        case 'most_popular':
        case 'most_voted': {
          const vA = a.peoples_choice_votes_count || 0;
          const vB = b.peoples_choice_votes_count || 0;
          if (vA !== vB) return vB - vA;
          const rA = a.public_rating || 0;
          const rB = b.public_rating || 0;
          return rB - rA;
        }
        case 'newest_first':
        default: {
          const yA = a.completion_year || 0;
          const yB = b.completion_year || 0;
          if (yA !== yB) return yB - yA;
          const cA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return cB - cA;
        }
      }
    });

    const total_count = projects.length;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageProjects = projects.slice(start, end);

    const { favoriteIds, viewingIds, shortlistIds, topChoiceIds, comparisonIds } =
      this._getUserProjectListFlags();

    const mapped = pageProjects.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle || '',
      category: p.category,
      category_label: this._getCategoryLabel(p.category),
      location_city: p.location_city || '',
      location_country: p.location_country || '',
      continent: p.continent || null,
      completion_year: p.completion_year || null,
      floor_area_sqm: p.floor_area_sqm || null,
      floors: p.floors || null,
      budget: p.budget || null,
      sustainability_tags: Array.isArray(p.sustainability_tags) ? p.sustainability_tags : [],
      sustainability_tag_labels: this._getSustainabilityTagLabels(p.sustainability_tags),
      jury_status: p.jury_status || 'none',
      jury_status_label: this._getJuryStatusLabel(p.jury_status),
      jury_awards_count: p.jury_awards_count || 0,
      public_rating: p.public_rating || 0,
      rating_count: p.rating_count || 0,
      peoples_choice_votes_count: p.peoples_choice_votes_count || 0,
      is_peoples_choice_eligible: p.is_peoples_choice_eligible === true,
      thumbnail_image_url: p.thumbnail_image_url || '',
      is_in_comparison: comparisonIds.has(p.id),
      is_favorite: favoriteIds.has(p.id),
      is_in_viewing_list: viewingIds.has(p.id),
      is_in_shortlist: shortlistIds.has(p.id),
      is_top_choice: topChoiceIds.has(p.id)
    }));

    return {
      page: currentPage,
      page_size: size,
      total_count,
      projects: mapped
    };
  }

  // -----------------------------
  // Interface: getProjectDetailsForDisplay
  // -----------------------------

  getProjectDetailsForDisplay(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId) || null;
    const anyPcEligible = projects.some((p) => p.is_peoples_choice_eligible === true);
    if (!project) {
      return {
        project: null,
        category_label: '',
        jury_status_label: '',
        location_display: '',
        sustainability_tag_labels: [],
        awards_detail: [],
        peoples_choice: {
          is_eligible: false,
          public_rating: 0,
          rating_count: 0,
          votes_count: 0,
          user_has_voted: false
        },
        user_lists_status: {
          is_favorite: false,
          is_in_viewing_list: false,
          is_in_shortlist: false,
          is_in_comparison: false,
          is_top_choice: false
        }
      };
    }

    const city = project.location_city || '';
    const country = project.location_country || '';
    const location_display = city && country ? `${city}, ${country}` : city || country || '';

    const votes = this._getFromStorage('peoples_choice_user_votes', []);
    const user_has_voted = votes.some((v) => v.project_id === project.id);

    const { favoriteIds, viewingIds, shortlistIds, topChoiceIds, comparisonIds } =
      this._getUserProjectListFlags();

    return {
      project,
      category_label: this._getCategoryLabel(project.category),
      jury_status_label: this._getJuryStatusLabel(project.jury_status),
      location_display,
      sustainability_tag_labels: this._getSustainabilityTagLabels(project.sustainability_tags),
      awards_detail: Array.isArray(project.awards_detail) ? project.awards_detail : [],
      peoples_choice: {
        is_eligible: anyPcEligible ? project.is_peoples_choice_eligible === true : true,
        public_rating: project.public_rating || 0,
        rating_count: project.rating_count || 0,
        votes_count: project.peoples_choice_votes_count || 0,
        user_has_voted
      },
      user_lists_status: {
        is_favorite: favoriteIds.has(project.id),
        is_in_viewing_list: viewingIds.has(project.id),
        is_in_shortlist: shortlistIds.has(project.id),
        is_in_comparison: comparisonIds.has(project.id),
        is_top_choice: topChoiceIds.has(project.id)
      }
    };
  }

  // -----------------------------
  // Favorites
  // -----------------------------

  addProjectToFavorites(projectId) {
    let favorites = this._getFromStorage('favorite_projects', []);
    const existing = favorites.find((f) => f.project_id === projectId);
    if (existing) {
      return {
        success: true,
        favorite_item_id: existing.id,
        already_in_favorites: true,
        favorites_count: favorites.length,
        message: 'Project is already in favorites.'
      };
    }

    const item = {
      id: this._generateId('fav'),
      project_id: projectId,
      added_at: this._nowISO()
    };
    favorites.push(item);
    this._saveToStorage('favorite_projects', favorites);

    return {
      success: true,
      favorite_item_id: item.id,
      already_in_favorites: false,
      favorites_count: favorites.length,
      message: 'Project added to favorites.'
    };
  }

  removeProjectFromFavorites(projectId) {
    let favorites = this._getFromStorage('favorite_projects', []);
    const before = favorites.length;
    favorites = favorites.filter((f) => f.project_id !== projectId);
    this._saveToStorage('favorite_projects', favorites);

    return {
      success: true,
      favorites_count: favorites.length,
      message:
        favorites.length < before
          ? 'Project removed from favorites.'
          : 'Project was not in favorites.'
    };
  }

  // -----------------------------
  // Viewing List
  // -----------------------------

  addProjectToViewingList(projectId, note) {
    let list = this._getFromStorage('viewing_list_items', []);
    const existing = list.find((v) => v.project_id === projectId);
    if (existing) {
      return {
        success: true,
        viewing_list_item_id: existing.id,
        already_in_viewing_list: true,
        viewing_list_count: list.length,
        message: 'Project is already in viewing list.'
      };
    }

    const item = {
      id: this._generateId('view'),
      project_id: projectId,
      note: note || '',
      added_at: this._nowISO()
    };
    list.push(item);
    this._saveToStorage('viewing_list_items', list);

    return {
      success: true,
      viewing_list_item_id: item.id,
      already_in_viewing_list: false,
      viewing_list_count: list.length,
      message: 'Project added to viewing list.'
    };
  }

  removeProjectFromViewingList(projectId) {
    let list = this._getFromStorage('viewing_list_items', []);
    const before = list.length;
    list = list.filter((v) => v.project_id !== projectId);
    this._saveToStorage('viewing_list_items', list);

    return {
      success: true,
      viewing_list_count: list.length,
      message:
        list.length < before
          ? 'Project removed from viewing list.'
          : 'Project was not in viewing list.'
    };
  }

  // -----------------------------
  // Shortlist
  // -----------------------------

  addProjectToShortlist(projectId, note) {
    let list = this._getFromStorage('shortlisted_projects', []);
    const existing = list.find((s) => s.project_id === projectId);
    if (existing) {
      return {
        success: true,
        shortlisted_item_id: existing.id,
        already_in_shortlist: true,
        shortlist_count: list.length,
        message: 'Project is already in shortlist.'
      };
    }

    const item = {
      id: this._generateId('short'),
      project_id: projectId,
      note: note || '',
      added_at: this._nowISO()
    };
    list.push(item);
    this._saveToStorage('shortlisted_projects', list);

    return {
      success: true,
      shortlisted_item_id: item.id,
      already_in_shortlist: false,
      shortlist_count: list.length,
      message: 'Project added to shortlist.'
    };
  }

  removeProjectFromShortlist(projectId) {
    let list = this._getFromStorage('shortlisted_projects', []);
    const before = list.length;
    list = list.filter((s) => s.project_id !== projectId);
    this._saveToStorage('shortlisted_projects', list);

    return {
      success: true,
      shortlist_count: list.length,
      message:
        list.length < before
          ? 'Project removed from shortlist.'
          : 'Project was not in shortlist.'
    };
  }

  // -----------------------------
  // Comparison
  // -----------------------------

  addProjectToComparison(projectId) {
    const maxItems = 4;
    const list = this._getOrCreateComparisonList();
    const ids = list.project_ids || [];

    if (ids.includes(projectId)) {
      return {
        success: true,
        comparison_list_id: list.id,
        comparison_count: ids.length,
        already_in_comparison: true,
        limit_reached: false,
        max_items: maxItems,
        message: 'Project is already in comparison list.'
      };
    }

    if (ids.length >= maxItems) {
      return {
        success: false,
        comparison_list_id: list.id,
        comparison_count: ids.length,
        already_in_comparison: false,
        limit_reached: true,
        max_items: maxItems,
        message: 'Comparison list is full.'
      };
    }

    const updated = { ...list, project_ids: [...ids, projectId] };
    this._updateComparisonList(updated);

    return {
      success: true,
      comparison_list_id: updated.id,
      comparison_count: updated.project_ids.length,
      already_in_comparison: false,
      limit_reached: false,
      max_items: maxItems,
      message: 'Project added to comparison list.'
    };
  }

  removeProjectFromComparison(projectId) {
    const list = this._getOrCreateComparisonList();
    const ids = list.project_ids || [];
    const filtered = ids.filter((id) => id !== projectId);
    const updated = { ...list, project_ids: filtered };
    this._updateComparisonList(updated);

    return {
      success: true,
      comparison_list_id: updated.id,
      comparison_count: filtered.length,
      message:
        filtered.length < ids.length
          ? 'Project removed from comparison list.'
          : 'Project was not in comparison list.'
    };
  }

  getComparisonView() {
    const maxItems = 4;
    const list = this._getOrCreateComparisonList();
    const ids = list.project_ids || [];
    const projectsData = this._getFromStorage('projects', []);
    const topChoices = this._getFromStorage('top_choice_projects', []);
    const topChoiceIds = new Set(topChoices.map((t) => t.project_id));

    const projects = ids.map((id) => {
      const p = projectsData.find((pr) => pr.id === id);
      if (!p) {
        return {
          project_id: id,
          title: '',
          subtitle: '',
          category: '',
          category_label: '',
          location_city: '',
          location_country: '',
          continent: null,
          completion_year: null,
          floor_area_sqm: null,
          floors: null,
          budget: null,
          sustainability_tags: [],
          sustainability_tag_labels: [],
          public_rating: 0,
          rating_count: 0,
          jury_status: 'none',
          jury_status_label: '',
          jury_awards_count: 0,
          awards_detail: [],
          thumbnail_image_url: '',
          is_top_choice: topChoiceIds.has(id)
        };
      }
      return {
        project_id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        category: p.category,
        category_label: this._getCategoryLabel(p.category),
        location_city: p.location_city || '',
        location_country: p.location_country || '',
        continent: p.continent || null,
        completion_year: p.completion_year || null,
        floor_area_sqm: p.floor_area_sqm || null,
        floors: p.floors || null,
        budget: p.budget || null,
        sustainability_tags: Array.isArray(p.sustainability_tags) ? p.sustainability_tags : [],
        sustainability_tag_labels: this._getSustainabilityTagLabels(p.sustainability_tags),
        public_rating: p.public_rating || 0,
        rating_count: p.rating_count || 0,
        jury_status: p.jury_status || 'none',
        jury_status_label: this._getJuryStatusLabel(p.jury_status),
        jury_awards_count: p.jury_awards_count || 0,
        awards_detail: Array.isArray(p.awards_detail) ? p.awards_detail : [],
        thumbnail_image_url: p.thumbnail_image_url || '',
        is_top_choice: topChoiceIds.has(p.id)
      };
    });

    return {
      comparison_list_id: list.id,
      comparison_count: ids.length,
      max_items: maxItems,
      projects
    };
  }

  markProjectAsTopChoice(projectId, context_label) {
    let topChoices = this._getFromStorage('top_choice_projects', []);

    // Ensure only one top choice per context_label if provided
    if (context_label) {
      topChoices = topChoices.filter((t) => t.context_label !== context_label);
    }

    const item = {
      id: this._generateId('top'),
      project_id: projectId,
      context_label: context_label || '',
      marked_at: this._nowISO()
    };

    topChoices.push(item);
    this._saveToStorage('top_choice_projects', topChoices);

    return {
      success: true,
      top_choice_id: item.id,
      context_label: item.context_label,
      message: 'Project marked as top choice.'
    };
  }

  // -----------------------------
  // People’s Choice
  // -----------------------------

  voteForPeoplesChoice(projectId) {
    const result = this._incrementPeoplesChoiceVotes(projectId);
    return {
      success: true,
      user_has_voted: true,
      peoples_choice_votes_count: result.votes_count,
      message: result.already_voted
        ? 'You have already voted for this project.'
        : 'Your vote has been recorded.'
    };
  }

  getPeoplesChoiceFilterOptions() {
    const projects = this._getFromStorage('projects', []);

    const eligibleProjects = projects.filter((p) => p.is_peoples_choice_eligible === true);
    const existingPcCategories = new Set(
      eligibleProjects.map((p) => p.category).filter((c) => typeof c === 'string' && c)
    );

    const categories = [
      'public_space',
      'urban_public_realm',
      'residential',
      'cultural',
      'education',
      'hospitality_hotel',
      'other'
    ]
      .filter((value) => existingPcCategories.has(value))
      .map((value) => ({ value, label: this._getCategoryLabel(value) }));

    const continents = [
      'europe',
      'asia',
      'north_america',
      'south_america',
      'africa',
      'oceania',
      'antarctica'
    ].map((value) => ({ value, label: this._capitalizeWords(value) }));

    let budgets = projects
      .map((p) => p.budget)
      .filter((x) => typeof x === 'number');
    const budget_range = {
      min: budgets.length ? Math.min(...budgets) : null,
      max: budgets.length ? Math.max(...budgets) : null
    };

    const rating_thresholds = [
      { value: 0, label: 'All ratings' },
      { value: 3, label: '3+ stars' },
      { value: 4, label: '4+ stars' },
      { value: 4.5, label: '4.5+ stars' }
    ];

    const sort_options = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'most_voted', label: 'Most Voted' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'newest_first', label: 'Newest First' }
    ];

    return { categories, continents, budget_range, rating_thresholds, sort_options };
  }

  listPeoplesChoiceProjects(filters, sort, page, page_size) {
    const f = filters || {};
    const sortKey = sort || 'most_popular';
    const currentPage = page || 1;
    const size = page_size || 20;

    const projects = this._getFromStorage('projects', []);
    const votes = this._getFromStorage('peoples_choice_user_votes', []);
    const votedIds = new Set(votes.map((v) => v.project_id));

    const allowedCategories = f.category ? this._expandCategoryFilter(f.category) : null;

    let base = projects.filter((p) => p.is_peoples_choice_eligible === true);
    if (base.length === 0) {
      base = projects.slice();
    }

    let filtered = base.filter((p) => {
      if (allowedCategories && allowedCategories.length && !allowedCategories.includes(p.category)) {
        return false;
      }
      if (f.continent && p.continent && p.continent !== f.continent) return false;
      if (
        typeof f.budget_min === 'number' &&
        typeof p.budget === 'number' &&
        p.budget < f.budget_min
      ) {
        return false;
      }
      if (
        typeof f.budget_max === 'number' &&
        typeof p.budget === 'number' &&
        p.budget > f.budget_max
      ) {
        return false;
      }
      if (
        typeof f.minimum_public_rating === 'number' &&
        typeof p.public_rating === 'number' &&
        p.public_rating < f.minimum_public_rating
      ) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      // Relax budget constraints if no projects match all filters
      filtered = base.filter((p) => {
        if (allowedCategories && allowedCategories.length && !allowedCategories.includes(p.category)) {
          return false;
        }
        if (f.continent && p.continent && p.continent !== f.continent) return false;
        if (
          typeof f.minimum_public_rating === 'number' &&
          typeof p.public_rating === 'number' &&
          p.public_rating < f.minimum_public_rating
        ) {
          return false;
        }
        return true;
      });
    }

    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'rating_high_to_low': {
          const rA = a.public_rating || 0;
          const rB = b.public_rating || 0;
          if (rA !== rB) return rB - rA;
          const cA = a.rating_count || 0;
          const cB = b.rating_count || 0;
          return cB - cA;
        }
        case 'newest_first': {
          const yA = a.completion_year || 0;
          const yB = b.completion_year || 0;
          return yB - yA;
        }
        case 'most_voted':
        case 'most_popular':
        default: {
          const vA = a.peoples_choice_votes_count || 0;
          const vB = b.peoples_choice_votes_count || 0;
          if (vA !== vB) return vB - vA;
          const rA = a.public_rating || 0;
          const rB = b.public_rating || 0;
          return rB - rA;
        }
      }
    });

    const total_count = filtered.length;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageProjects = filtered.slice(start, end);

    const mapped = pageProjects.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      category_label: this._getCategoryLabel(p.category),
      location_city: p.location_city || '',
      location_country: p.location_country || '',
      continent: p.continent || null,
      budget: p.budget || null,
      public_rating: p.public_rating || 0,
      rating_count: p.rating_count || 0,
      peoples_choice_votes_count: p.peoples_choice_votes_count || 0,
      thumbnail_image_url: p.thumbnail_image_url || '',
      user_has_voted: votedIds.has(p.id)
    }));

    return {
      page: currentPage,
      page_size: size,
      total_count,
      projects: mapped
    };
  }

  // -----------------------------
  // Competitions filter options & listing
  // -----------------------------

  getCompetitionFilterOptions() {
    const competitions = this._getFromStorage('competitions', []);

    const yearsSet = new Set(competitions.map((c) => c.year).filter((y) => typeof y === 'number'));
    const years = Array.from(yearsSet).sort();

    const primary_categories = [
      'residential',
      'cultural',
      'museum_cultural',
      'hospitality_hotel',
      'education',
      'public_space',
      'urban_public_realm',
      'other'
    ].map((value) => ({ value, label: this._getCompetitionPrimaryCategoryLabel(value) }));

    const competition_types = ['professional', 'student', 'mixed'].map((value) => ({
      value,
      label: this._getCompetitionTypeLabel(value)
    }));

    const regionsSet = new Set(
      competitions.map((c) => c.region).filter((r) => typeof r === 'string' && r.trim())
    );
    const regions = Array.from(regionsSet);

    const statuses = ['open', 'closed', 'upcoming'].map((value) => ({
      value,
      label: this._getCompetitionStatusLabel(value)
    }));

    const deadline_months = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ].map((value) => ({ value, label: this._capitalizeWords(value) }));

    const prize_range_suggestions = [
      { min: 0, max: 5000, label: 'low_range_0_5000' },
      { min: 5000, max: 20000, label: 'mid_range_5000_20000' },
      { min: 20000, max: 1000000, label: 'high_range_20000_plus' }
    ];

    const sort_options = [
      {
        value: 'deadline_soonest_first',
        label: 'Deadline: Soonest First',
        description: 'Sort competitions by the closest deadline.'
      },
      {
        value: 'newest_first',
        label: 'Newest First',
        description: 'Sort by most recent competition year.'
      },
      {
        value: 'prize_high_to_low',
        label: 'Prize: High to Low',
        description: 'Sort by highest advertised prize.'
      }
    ];

    return {
      years,
      primary_categories,
      competition_types,
      regions,
      statuses,
      deadline_months,
      prize_range_suggestions,
      sort_options
    };
  }

  listCompetitions(filters, sort, page, page_size) {
    const f = filters || {};
    const sortKey = sort || 'deadline_soonest_first';
    const currentPage = page || 1;
    const size = page_size || 20;

    let competitions = this._getFromStorage('competitions', []);
    const watchlist = this._getFromStorage('competition_watchlist_items', []);
    const registrations = this._getFromStorage('competition_registrations', []);

    const watchIds = new Set(watchlist.map((w) => w.competition_id));
    const regIds = new Set(registrations.map((r) => r.competition_id));

    const allowedCategories = f.primary_category
      ? this._expandCategoryFilter(f.primary_category)
      : null;

    competitions = competitions.filter((c) => {
      if (f.year != null && typeof c.year === 'number' && c.year !== f.year) return false;
      if (allowedCategories && allowedCategories.length && !allowedCategories.includes(c.primary_category))
        return false;
      if (f.competition_type && c.competition_type !== f.competition_type) return false;
      if (typeof f.is_student_only === 'boolean' && c.is_student_only !== f.is_student_only)
        return false;

      const effectiveMin = typeof c.prize_min === 'number' ? c.prize_min : c.headline_prize;
      const effectiveMax =
        typeof c.prize_max === 'number'
          ? c.prize_max
          : typeof c.prize_min === 'number'
          ? c.prize_min
          : c.headline_prize;

      if (typeof f.prize_min === 'number' && typeof effectiveMax === 'number' && effectiveMax < f.prize_min)
        return false;
      if (typeof f.prize_max === 'number' && typeof effectiveMin === 'number' && effectiveMin > f.prize_max)
        return false;

      if (f.deadline_month && c.deadline_month !== f.deadline_month) return false;
      if (f.deadline_year && c.deadline_year !== f.deadline_year) return false;

      if (f.region && c.region && c.region !== f.region) return false;
      if (f.status && c.status && c.status !== f.status) return false;

      return true;
    });

    competitions.sort((a, b) => {
      switch (sortKey) {
        case 'newest_first': {
          const yA = a.year || 0;
          const yB = b.year || 0;
          return yB - yA;
        }
        case 'prize_high_to_low': {
          const pA =
            typeof a.headline_prize === 'number'
              ? a.headline_prize
              : typeof a.prize_max === 'number'
              ? a.prize_max
              : a.prize_min || 0;
          const pB =
            typeof b.headline_prize === 'number'
              ? b.headline_prize
              : typeof b.prize_max === 'number'
              ? b.prize_max
              : b.prize_min || 0;
          return pB - pA;
        }
        case 'deadline_soonest_first':
        default: {
          const dA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const dB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          return dA - dB;
        }
      }
    });

    const total_count = competitions.length;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageComps = competitions.slice(start, end);

    const mapped = pageComps.map((c) => ({
      id: c.id,
      title: c.title,
      year: c.year,
      primary_category: c.primary_category || 'other',
      primary_category_label: this._getCompetitionPrimaryCategoryLabel(c.primary_category),
      competition_type: c.competition_type || '',
      is_student_only: c.is_student_only === true,
      region: c.region || '',
      status: c.status || '',
      prize_min: c.prize_min || null,
      prize_max: c.prize_max || null,
      headline_prize: c.headline_prize || null,
      prize_range_label: this._computePrizeRangeLabel(c),
      deadline: c.deadline || null,
      deadline_month: c.deadline_month || null,
      deadline_year: c.deadline_year || null,
      has_early_bird: c.has_early_bird === true,
      early_bird_deadline: c.early_bird_deadline || null,
      registration_open: c.registration_open === true,
      is_in_watchlist: watchIds.has(c.id),
      has_active_registration: regIds.has(c.id),
      highlight_reason: this._computeCompetitionHighlightReason(c)
    }));

    return {
      page: currentPage,
      page_size: size,
      total_count,
      competitions: mapped
    };
  }

  getCompetitionDetailsForDisplay(competitionId) {
    const competitions = this._getFromStorage('competitions', []);
    const comp = competitions.find((c) => c.id === competitionId) || null;
    const watchlist = this._getFromStorage('competition_watchlist_items', []);
    const registrations = this._getFromStorage('competition_registrations', []);

    if (!comp) {
      return {
        competition: null,
        primary_category_label: '',
        competition_type_label: '',
        status_label: '',
        region_label: '',
        prize_summary: {
          headline_prize: null,
          prize_min: null,
          prize_max: null,
          prize_range_label: ''
        },
        key_dates: {
          deadline: null,
          deadline_label: '',
          deadline_month: null,
          deadline_year: null,
          has_early_bird: false,
          early_bird_deadline: null,
          early_bird_label: ''
        },
        terms_highlights: '',
        user_status: {
          is_in_watchlist: false,
          has_active_registration: false,
          latest_registration_summary: null
        },
        registration_form_options: {
          entry_types: [],
          default_entry_type: 'regular',
          max_project_entries: 10,
          phone_required: false
        }
      };
    }

    const is_in_watchlist = watchlist.some((w) => w.competition_id === comp.id);
    const compRegs = registrations.filter((r) => r.competition_id === comp.id);
    const has_active_registration = compRegs.length > 0;

    let latestReg = null;
    if (compRegs.length) {
      compRegs.sort((a, b) => {
        const tA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const tB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return tB - tA;
      });
      latestReg = compRegs[0];
    }

    const prize_summary = {
      headline_prize: comp.headline_prize || null,
      prize_min: comp.prize_min || null,
      prize_max: comp.prize_max || null,
      prize_range_label: this._computePrizeRangeLabel(comp)
    };

    const key_dates = {
      deadline: comp.deadline || null,
      deadline_label: this._formatDeadlineLabel(comp.deadline),
      deadline_month: comp.deadline_month || null,
      deadline_year: comp.deadline_year || null,
      has_early_bird: comp.has_early_bird === true,
      early_bird_deadline: comp.early_bird_deadline || null,
      early_bird_label: comp.early_bird_deadline
        ? `Early-bird until ${this._formatDeadlineLabel(comp.early_bird_deadline)}`
        : ''
    };

    const registration_form_options = {
      entry_types: [
        {
          value: 'early_bird',
          label: 'Early-bird',
          fee_label: 'Early-bird fee',
          is_early_bird: true
        },
        {
          value: 'regular',
          label: 'Regular',
          fee_label: 'Standard fee',
          is_early_bird: false
        },
        {
          value: 'late',
          label: 'Late',
          fee_label: 'Late fee',
          is_early_bird: false
        }
      ],
      default_entry_type: comp.has_early_bird ? 'early_bird' : 'regular',
      max_project_entries: 10,
      phone_required: false
    };

    const latest_registration_summary = latestReg
      ? {
          registration_id: latestReg.id,
          firm_name: latestReg.firm_name,
          contact_person: latestReg.contact_person,
          email: latestReg.email,
          phone: latestReg.phone || '',
          entry_type: latestReg.entry_type,
          number_of_project_entries: latestReg.number_of_project_entries,
          submitted_at: latestReg.submitted_at || null
        }
      : null;

    return {
      competition: comp,
      primary_category_label: this._getCompetitionPrimaryCategoryLabel(comp.primary_category),
      competition_type_label: this._getCompetitionTypeLabel(comp.competition_type),
      status_label: this._getCompetitionStatusLabel(comp.status),
      region_label: comp.region || '',
      prize_summary,
      key_dates,
      terms_highlights: comp.terms_summary || '',
      user_status: {
        is_in_watchlist,
        has_active_registration,
        latest_registration_summary
      },
      registration_form_options
    };
  }

  addCompetitionToWatchlist(competitionId) {
    let watchlist = this._getFromStorage('competition_watchlist_items', []);
    const existing = watchlist.find((w) => w.competition_id === competitionId);
    if (existing) {
      return {
        success: true,
        watchlist_item_id: existing.id,
        already_in_watchlist: true,
        watchlist_count: watchlist.length,
        message: 'Competition is already in watchlist.'
      };
    }

    const item = {
      id: this._generateId('cw'),
      competition_id: competitionId,
      added_at: this._nowISO()
    };
    watchlist.push(item);
    this._saveToStorage('competition_watchlist_items', watchlist);

    return {
      success: true,
      watchlist_item_id: item.id,
      already_in_watchlist: false,
      watchlist_count: watchlist.length,
      message: 'Competition added to watchlist.'
    };
  }

  removeCompetitionFromWatchlist(competitionId) {
    let watchlist = this._getFromStorage('competition_watchlist_items', []);
    const before = watchlist.length;
    watchlist = watchlist.filter((w) => w.competition_id !== competitionId);
    this._saveToStorage('competition_watchlist_items', watchlist);

    return {
      success: true,
      watchlist_count: watchlist.length,
      message:
        watchlist.length < before
          ? 'Competition removed from watchlist.'
          : 'Competition was not in watchlist.'
    };
  }

  submitCompetitionRegistration(
    competitionId,
    firm_name,
    contact_person,
    email,
    phone,
    entry_type,
    number_of_project_entries,
    agreed_to_terms
  ) {
    const allowedTypes = ['early_bird', 'regular', 'late'];
    if (!allowedTypes.includes(entry_type)) {
      return {
        success: false,
        registration_id: null,
        message: 'Invalid entry type.',
        summary: null
      };
    }

    if (!agreed_to_terms) {
      return {
        success: false,
        registration_id: null,
        message: 'You must agree to the terms and conditions.',
        summary: null
      };
    }

    const competitions = this._getFromStorage('competitions', []);
    const comp = competitions.find((c) => c.id === competitionId);
    if (!comp) {
      return {
        success: false,
        registration_id: null,
        message: 'Competition not found.',
        summary: null
      };
    }

    const registrations = this._getFromStorage('competition_registrations', []);
    const registration_id = this._generateId('reg');
    const submitted_at = this._nowISO();

    const reg = {
      id: registration_id,
      competition_id: competitionId,
      firm_name,
      contact_person,
      email,
      phone: phone || '',
      entry_type,
      number_of_project_entries,
      agreed_to_terms: !!agreed_to_terms,
      submitted_at
    };

    registrations.push(reg);
    this._saveToStorage('competition_registrations', registrations);

    const summary = {
      competition_id: competitionId,
      competition_title: comp.title,
      firm_name,
      contact_person,
      email,
      phone: phone || '',
      entry_type,
      number_of_project_entries,
      agreed_to_terms: !!agreed_to_terms,
      submitted_at
    };

    return {
      success: true,
      registration_id,
      message: 'Registration submitted successfully.',
      summary
    };
  }

  // -----------------------------
  // My Lists Overview
  // -----------------------------

  getMyListsOverview() {
    const favorites = this._getFromStorage('favorite_projects', []);
    const viewing_list_items = this._getFromStorage('viewing_list_items', []);
    const shortlisted_projects = this._getFromStorage('shortlisted_projects', []);
    const top_choice_projects = this._getFromStorage('top_choice_projects', []);
    const competition_watchlist_items = this._getFromStorage('competition_watchlist_items', []);
    const registrations = this._getFromStorage('competition_registrations', []);

    const projects = this._getFromStorage('projects', []);
    const competitions = this._getFromStorage('competitions', []);

    const findProject = (id) => projects.find((p) => p.id === id) || null;
    const findCompetition = (id) => competitions.find((c) => c.id === id) || null;

    const favoritesOut = favorites.map((f) => {
      const p = findProject(f.project_id);
      return {
        favorite_item_id: f.id,
        added_at: f.added_at || null,
        project: p
          ? {
              id: p.id,
              title: p.title,
              category: p.category,
              category_label: this._getCategoryLabel(p.category),
              location_city: p.location_city || '',
              location_country: p.location_country || '',
              thumbnail_image_url: p.thumbnail_image_url || '',
              jury_status_label: this._getJuryStatusLabel(p.jury_status)
            }
          : null
      };
    });

    const viewingOut = viewing_list_items.map((v) => {
      const p = findProject(v.project_id);
      return {
        viewing_list_item_id: v.id,
        note: v.note || '',
        added_at: v.added_at || null,
        project: p
          ? {
              id: p.id,
              title: p.title,
              category: p.category,
              category_label: this._getCategoryLabel(p.category),
              continent: p.continent || null,
              location_city: p.location_city || '',
              location_country: p.location_country || '',
              thumbnail_image_url: p.thumbnail_image_url || ''
            }
          : null
      };
    });

    const shortlistedOut = shortlisted_projects.map((s) => {
      const p = findProject(s.project_id);
      return {
        shortlisted_item_id: s.id,
        note: s.note || '',
        added_at: s.added_at || null,
        project: p
          ? {
              id: p.id,
              title: p.title,
              category: p.category,
              category_label: this._getCategoryLabel(p.category),
              continent: p.continent || null,
              location_city: p.location_city || '',
              location_country: p.location_country || '',
              completion_year: p.completion_year || null,
              floors: typeof p.floors === 'number' ? p.floors : null,
              jury_status: p.jury_status || 'none',
              thumbnail_image_url: p.thumbnail_image_url || ''
            }
          : null
      };
    });

    const topChoicesOut = top_choice_projects.map((t) => {
      const p = findProject(t.project_id);
      return {
        top_choice_id: t.id,
        context_label: t.context_label || '',
        marked_at: t.marked_at || null,
        project: p
          ? {
              id: p.id,
              title: p.title,
              category: p.category,
              category_label: this._getCategoryLabel(p.category),
              thumbnail_image_url: p.thumbnail_image_url || '',
              jury_awards_count: p.jury_awards_count || 0
            }
          : null
      };
    });

    const competitionWatchOut = competition_watchlist_items.map((w) => {
      const c = findCompetition(w.competition_id);
      return {
        watchlist_item_id: w.id,
        added_at: w.added_at || null,
        competition: c
          ? {
              id: c.id,
              title: c.title,
              year: c.year,
              primary_category: c.primary_category || 'other',
              primary_category_label: this._getCompetitionPrimaryCategoryLabel(
                c.primary_category
              ),
              competition_type: c.competition_type || '',
              is_student_only: c.is_student_only === true,
              headline_prize: c.headline_prize || null,
              deadline: c.deadline || null,
              status: c.status || ''
            }
          : null
      };
    });

    const registrationsOut = registrations.map((r) => {
      const c = findCompetition(r.competition_id);
      return {
        registration_id: r.id,
        submitted_at: r.submitted_at || null,
        competition: c
          ? {
              id: c.id,
              title: c.title,
              year: c.year,
              primary_category_label: this._getCompetitionPrimaryCategoryLabel(
                c.primary_category
              )
            }
          : null,
        firm_name: r.firm_name,
        entry_type: r.entry_type,
        number_of_project_entries: r.number_of_project_entries
      };
    });

    return {
      favorites: favoritesOut,
      viewing_list: viewingOut,
      shortlisted_projects: shortlistedOut,
      top_choices: topChoicesOut,
      competition_watchlist: competitionWatchOut,
      registrations: registrationsOut
    };
  }

  // -----------------------------
  // Newsletter
  // -----------------------------

  getNewsletterTopicsAndFrequencies() {
    const frequencies = [
      {
        value: 'monthly',
        label: 'Monthly',
        description: 'Receive a curated digest once a month.'
      },
      {
        value: 'weekly',
        label: 'Weekly',
        description: 'Stay closely updated with weekly highlights.'
      },
      {
        value: 'quarterly',
        label: 'Quarterly',
        description: 'A broader overview every quarter.'
      }
    ];

    const topics = [
      {
        value: 'sustainability',
        label: 'Sustainability',
        description: 'Green building, low-carbon design, and sustainable practice.',
        recommended: true
      },
      {
        value: 'residential',
        label: 'Residential',
        description: 'Housing, apartments, and residential awards.',
        recommended: true
      },
      {
        value: 'public_space',
        label: 'Public Space',
        description: 'Parks, plazas, and the urban public realm.',
        recommended: false
      },
      {
        value: 'education',
        label: 'Education',
        description: 'Schools, universities, and educational facilities.',
        recommended: false
      },
      {
        value: 'competitions',
        label: 'Competitions & Awards',
        description: 'New calls for entries and deadlines.',
        recommended: false
      }
    ];

    const delivery_preferences = [
      {
        value: 'email_only',
        label: 'Email only',
        description: 'All newsletters delivered via email.'
      },
      {
        value: 'email_and_sms',
        label: 'Email and SMS',
        description: 'Receive key alerts via SMS as well as email.'
      },
      {
        value: 'email_and_postal',
        label: 'Email and postal',
        description: 'Email newsletters plus occasional printed mailings.'
      }
    ];

    return { frequencies, topics, delivery_preferences };
  }

  submitNewsletterSubscription(full_name, email, frequency, topics, delivery_preference) {
    const allowedFreq = ['monthly', 'weekly', 'quarterly'];
    const freq = frequency || 'monthly';

    if (!allowedFreq.includes(freq)) {
      return {
        success: false,
        subscription_id: null,
        active: false,
        message: 'Invalid frequency.',
        summary: null
      };
    }

    if (!full_name || !email) {
      return {
        success: false,
        subscription_id: null,
        active: false,
        message: 'Name and email are required.',
        summary: null
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const id = this._generateId('nl');
    const subscribed_at = this._nowISO();
    const dp = delivery_preference || 'email_only';

    const sub = {
      id,
      full_name,
      email,
      frequency: freq,
      topics: Array.isArray(topics) ? topics : [],
      delivery_preference: dp,
      subscribed_at,
      active: true
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    const summary = {
      full_name,
      email,
      frequency: freq,
      topics: Array.isArray(topics) ? topics : [],
      delivery_preference: dp,
      subscribed_at
    };

    return {
      success: true,
      subscription_id: id,
      active: true,
      message: 'Subscription saved.',
      summary
    };
  }

  // -----------------------------
  // Static content & contact
  // -----------------------------

  getAboutContent() {
    return this._getFromStorage('about_content', {
      hero_title: '',
      hero_subtitle: '',
      sections: [],
      partners: []
    });
  }

  getContactInfo() {
    return this._getFromStorage('contact_info', {
      support_email: '',
      awards_email: '',
      privacy_email: '',
      mailing_address: '',
      contact_channels: []
    });
  }

  submitContactInquiry(full_name, email, subject, message, topic) {
    // This implementation only simulates ticket creation; no separate storage is defined.
    const ticket_id = this._generateId('ct');
    const success = !!(full_name && email && subject && message);

    return {
      success,
      ticket_id: success ? ticket_id : null,
      message: success ? 'Inquiry submitted.' : 'All fields are required.'
    };
  }

  getFaqEntries() {
    return this._getFromStorage('faq_entries', { categories: [], faqs: [] });
  }

  getTermsContent() {
    return this._getFromStorage('terms_content', {
      version: '',
      last_updated: '',
      sections: []
    });
  }

  getPrivacyPolicyContent() {
    return this._getFromStorage('privacy_policy_content', {
      version: '',
      last_updated: '',
      sections: []
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
