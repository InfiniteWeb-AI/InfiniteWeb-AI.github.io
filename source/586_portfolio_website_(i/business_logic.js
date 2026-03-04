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

  // ---------- Initialization & Storage Helpers ----------

  _initStorage() {
    const arrayKeys = [
      'projects',
      'favorite_projects',
      'service_packages',
      'project_briefs',
      'consultation_requests',
      'call_requests',
      'contact_messages',
      'blog_articles',
      'reading_list_items',
      'newsletter_subscriptions',
      'testimonials',
      'faq_items',
      'service_shortlists',
      'service_shortlist_items',
      'shortlist_shares',
      'project_comparisons',
      'project_comparison_items',
      'inspiration_images',
      'inspiration_boards',
      'inspiration_board_items'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify({}));
    }
    if (!localStorage.getItem('contact_page_content')) {
      localStorage.setItem('contact_page_content', JSON.stringify({}));
    }
    if (!localStorage.getItem('policies_content')) {
      localStorage.setItem('policies_content', JSON.stringify({}));
    }
    if (!localStorage.getItem('single_user_state')) {
      localStorage.setItem('single_user_state', JSON.stringify({}));
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      if (typeof defaultValue !== 'undefined') {
        // Deep clone default to avoid external mutation
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue ? JSON.parse(JSON.stringify(defaultValue)) : {};
    }
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : (defaultValue || {});
    } catch (e) {
      return defaultValue ? JSON.parse(JSON.stringify(defaultValue)) : {};
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

  _getSingleUserState() {
    return this._getObjectFromStorage('single_user_state', {});
  }

  _setSingleUserState(state) {
    this._saveToStorage('single_user_state', state || {});
  }

  // Internal helper to persist single-user state
  _persistSingleUserState() {
    // Currently state is stored immediately in helpers, so nothing extra is needed.
    // This method exists to satisfy the interface and for future extension.
  }

  // ---------- Single-user helper entities ----------

  // Favorites use the favorite_projects table directly. This helper just ensures it exists.
  _getOrCreateFavoritesStore() {
    const favorites = this._getFromStorage('favorite_projects', []);
    if (!Array.isArray(favorites)) {
      this._saveToStorage('favorite_projects', []);
      return [];
    }
    return favorites;
  }

  _getActiveServiceShortlist() {
    const state = this._getSingleUserState();
    const shortlists = this._getFromStorage('service_shortlists', []);
    let shortlist = null;

    if (state.activeServiceShortlistId) {
      shortlist = shortlists.find((s) => s.id === state.activeServiceShortlistId) || null;
    }

    if (!shortlist && shortlists.length > 0) {
      shortlist = shortlists[0];
      state.activeServiceShortlistId = shortlist.id;
      this._setSingleUserState(state);
    }

    return shortlist;
  }

  _getOrCreateServiceShortlist() {
    const state = this._getSingleUserState();
    let shortlists = this._getFromStorage('service_shortlists', []);
    let shortlist = null;

    if (state.activeServiceShortlistId) {
      shortlist = shortlists.find((s) => s.id === state.activeServiceShortlistId) || null;
    }

    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        name: 'My shortlist',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      shortlists.push(shortlist);
      this._saveToStorage('service_shortlists', shortlists);
      state.activeServiceShortlistId = shortlist.id;
      this._setSingleUserState(state);
      this._persistSingleUserState();
    }

    return shortlist;
  }

  _getActiveProjectComparison() {
    const state = this._getSingleUserState();
    const comparisons = this._getFromStorage('project_comparisons', []);
    let comparison = null;

    if (state.activeProjectComparisonId) {
      comparison = comparisons.find((c) => c.id === state.activeProjectComparisonId) || null;
    }

    if (!comparison) {
      comparison = comparisons.find((c) => c.status === 'active') || null;
      if (comparison) {
        state.activeProjectComparisonId = comparison.id;
        this._setSingleUserState(state);
      }
    }

    return comparison;
  }

  _getOrCreateProjectComparison() {
    const state = this._getSingleUserState();
    let comparisons = this._getFromStorage('project_comparisons', []);
    let comparison = null;

    if (state.activeProjectComparisonId) {
      comparison = comparisons.find((c) => c.id === state.activeProjectComparisonId) || null;
    }

    if (!comparison) {
      comparison = comparisons.find((c) => c.status === 'active') || null;
    }

    if (!comparison) {
      comparison = {
        id: this._generateId('comparison'),
        name: 'Active comparison',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      comparisons.push(comparison);
      this._saveToStorage('project_comparisons', comparisons);
    }

    state.activeProjectComparisonId = comparison.id;
    this._setSingleUserState(state);
    this._persistSingleUserState();

    return comparison;
  }

  _getActiveInspirationBoard() {
    const state = this._getSingleUserState();
    const boards = this._getFromStorage('inspiration_boards', []);
    let board = null;

    if (state.activeInspirationBoardId) {
      board = boards.find((b) => b.id === state.activeInspirationBoardId) || null;
    }

    if (!board && boards.length > 0) {
      board = boards[0];
      state.activeInspirationBoardId = board.id;
      this._setSingleUserState(state);
    }

    return board;
  }

  _getOrCreateInspirationBoard() {
    const state = this._getSingleUserState();
    let boards = this._getFromStorage('inspiration_boards', []);
    let board = null;

    if (state.activeInspirationBoardId) {
      board = boards.find((b) => b.id === state.activeInspirationBoardId) || null;
    }

    if (!board) {
      board = {
        id: this._generateId('board'),
        name: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      boards.push(board);
      this._saveToStorage('inspiration_boards', boards);
      state.activeInspirationBoardId = board.id;
      this._setSingleUserState(state);
      this._persistSingleUserState();
    }

    return board;
  }

  // ---------- Utility helpers ----------

  _labelForRoomType(value) {
    const map = {
      living_room: 'Living Room',
      bedroom: 'Bedroom',
      office: 'Office',
      kitchen: 'Kitchen',
      bathroom: 'Bathroom',
      dining_room: 'Dining Room',
      multi_room: 'Multi-room',
      other: 'Other'
    };
    return map[value] || value;
  }

  _labelForPropertyType(value) {
    const map = {
      apartment: 'Apartment',
      house: 'House',
      studio: 'Studio',
      commercial: 'Commercial',
      other: 'Other'
    };
    return map[value] || value;
  }

  _labelForStyle(value) {
    const map = {
      scandinavian: 'Scandinavian',
      minimalist: 'Minimalist',
      industrial: 'Industrial',
      modern: 'Modern',
      bohemian: 'Bohemian',
      traditional: 'Traditional',
      contemporary: 'Contemporary',
      eclectic: 'Eclectic',
      other: 'Other'
    };
    return map[value] || value;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ---------- Interface Implementations ----------

  // 1) getHomePageHighlights
  getHomePageHighlights() {
    const projects = this._getFromStorage('projects', []);
    const servicePackages = this._getFromStorage('service_packages', []);
    const blogArticles = this._getFromStorage('blog_articles', []);
    const inspirationImages = this._getFromStorage('inspiration_images', []);

    const featuredProjects = (projects.filter((p) => p.isFeatured) || projects).slice(0, 4);
    const featuredServicePackages = (servicePackages.filter((s) => s.isPopular) || servicePackages).slice(0, 4);

    const recentBlogArticles = blogArticles
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.publishedAt);
        const db = this._parseDate(b.publishedAt);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      })
      .slice(0, 3);

    const highlightInspirationImages = inspirationImages
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.createdAt);
        const db = this._parseDate(b.createdAt);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      })
      .slice(0, 6);

    return {
      featuredProjects,
      featuredServicePackages,
      recentBlogArticles,
      highlightInspirationImages
    };
  }

  // 2) createConsultationRequest (general)
  createConsultationRequest(propertyType, projectDescription, preferredTimeline, name, email, phone) {
    const consultationRequests = this._getFromStorage('consultation_requests', []);

    const now = new Date().toISOString();
    const request = {
      id: this._generateId('consultation'),
      projectId: null,
      sourceType: 'other',
      propertyType: propertyType || 'other',
      projectDescription: projectDescription,
      preferredTimeline: preferredTimeline || 'unspecified',
      name,
      email,
      phone: phone || null,
      createdAt: now
    };

    consultationRequests.push(request);
    this._saveToStorage('consultation_requests', consultationRequests);

    return {
      success: true,
      consultationRequest: request,
      message: 'Consultation request submitted.'
    };
  }

  // 3) getProjectFilterOptions
  getProjectFilterOptions() {
    const roomTypesEnum = ['living_room', 'bedroom', 'office', 'kitchen', 'bathroom', 'dining_room', 'multi_room', 'other'];
    const propertyTypesEnum = ['apartment', 'house', 'studio', 'commercial', 'other'];
    const stylesEnum = ['scandinavian', 'minimalist', 'industrial', 'modern', 'bohemian', 'traditional', 'contemporary', 'eclectic', 'other'];
    const timelineEnum = ['less_than_1_month', 'one_to_three_months', 'three_to_six_months', 'more_than_six_months'];

    const roomTypes = roomTypesEnum.map((value) => ({ value, label: this._labelForRoomType(value) }));
    const propertyTypes = propertyTypesEnum.map((value) => ({ value, label: this._labelForPropertyType(value) }));
    const styles = stylesEnum.map((value) => ({ value, label: this._labelForStyle(value) }));
    const timelineCategories = [
      { value: 'less_than_1_month', label: 'Less than 1 month' },
      { value: 'one_to_three_months', label: '1–3 months' },
      { value: 'three_to_six_months', label: '3–6 months' },
      { value: 'more_than_six_months', label: 'More than 6 months' }
    ];

    const sortOptions = [
      { value: 'budget_total_asc', label: 'Budget: Low to High' },
      { value: 'budget_total_desc', label: 'Budget: High to Low' },
      { value: 'size_sq_ft_asc', label: 'Size: Smallest first' },
      { value: 'size_sq_ft_desc', label: 'Size: Largest first' },
      { value: 'date_desc', label: 'Newest first' },
      { value: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return {
      roomTypes,
      propertyTypes,
      styles,
      timelineCategories,
      sortOptions
    };
  }

  // 4) listProjects
  listProjects(filters, sort, pagination) {
    let projects = this._getFromStorage('projects', []);
    const f = filters || {};

    projects = projects.filter((p) => {
      if (f.roomType && p.roomType !== f.roomType) return false;
      if (f.propertyType && p.propertyType !== f.propertyType) return false;
      if (f.style && p.style !== f.style) return false;
      if (typeof f.minBudgetTotal === 'number' && p.budgetTotal < f.minBudgetTotal) return false;
      if (typeof f.maxBudgetTotal === 'number' && p.budgetTotal > f.maxBudgetTotal) return false;
      if (f.timelineCategory && p.timelineCategory !== f.timelineCategory) return false;
      if (typeof f.minSizeSqFt === 'number' && (typeof p.sizeSqFt !== 'number' || p.sizeSqFt < f.minSizeSqFt)) return false;
      if (typeof f.maxSizeSqFt === 'number' && (typeof p.sizeSqFt !== 'number' || p.sizeSqFt > f.maxSizeSqFt)) return false;
      if (typeof f.numberOfRooms === 'number' && p.numberOfRooms !== f.numberOfRooms) return false;
      if (f.hasSizeSqFt && typeof p.sizeSqFt !== 'number') return false;
      return true;
    });

    if (sort && sort.field) {
      const dir = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      projects = projects.slice().sort((a, b) => {
        let av;
        let bv;
        switch (sort.field) {
          case 'budget_total':
            av = a.budgetTotal;
            bv = b.budgetTotal;
            break;
          case 'size_sq_ft':
            av = a.sizeSqFt;
            bv = b.sizeSqFt;
            break;
          case 'date':
            av = this._parseDate(a.completionDate || a.createdAt);
            bv = this._parseDate(b.completionDate || b.createdAt);
            av = av ? av.getTime() : 0;
            bv = bv ? bv.getTime() : 0;
            break;
          case 'rating':
            av = typeof a.rating === 'number' ? a.rating : 0;
            bv = typeof b.rating === 'number' ? b.rating : 0;
            break;
          default:
            av = 0;
            bv = 0;
        }
        if (av === undefined || av === null) av = 0;
        if (bv === undefined || bv === null) bv = 0;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    const totalCount = projects.length;
    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.pageSize) || 20;
    const start = (page - 1) * pageSize;
    const paginatedProjects = projects.slice(start, start + pageSize);

    const roomTypeLabels = {};
    const propertyTypeLabels = {};
    const styleLabels = {};

    paginatedProjects.forEach((p) => {
      if (p.roomType && !roomTypeLabels[p.roomType]) {
        roomTypeLabels[p.roomType] = this._labelForRoomType(p.roomType);
      }
      if (p.propertyType && !propertyTypeLabels[p.propertyType]) {
        propertyTypeLabels[p.propertyType] = this._labelForPropertyType(p.propertyType);
      }
      if (p.style && !styleLabels[p.style]) {
        styleLabels[p.style] = this._labelForStyle(p.style);
      }
    });

    return {
      projects: paginatedProjects,
      totalCount,
      page,
      pageSize,
      displayMetadata: {
        roomTypeLabels,
        styleLabels,
        propertyTypeLabels
      }
    };
  }

  // 5) getProjectDetail
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects', []);
    const favorites = this._getFromStorage('favorite_projects', []);
    const comparison = this._getActiveProjectComparison();
    const comparisonItems = this._getFromStorage('project_comparison_items', []);

    const project = projects.find((p) => p.id === projectId) || null;
    const isFavorited = !!favorites.find((f) => f.projectId === projectId);

    let isInActiveComparison = false;
    if (comparison) {
      isInActiveComparison = !!comparisonItems.find(
        (item) => item.comparisonId === comparison.id && item.projectId === projectId
      );
    }

    return {
      project,
      isFavorited,
      isInActiveComparison
    };
  }

  // 6) addProjectToFavorites
  addProjectToFavorites(projectId) {
    const favorites = this._getOrCreateFavoritesStore();

    let favorite = favorites.find((f) => f.projectId === projectId) || null;
    if (!favorite) {
      favorite = {
        id: this._generateId('favproj'),
        projectId,
        addedAt: new Date().toISOString()
      };
      favorites.push(favorite);
      this._saveToStorage('favorite_projects', favorites);
    }

    return {
      success: true,
      favorite,
      totalFavorites: favorites.length,
      message: 'Project added to favorites.'
    };
  }

  // 7) removeFavoriteProject
  removeFavoriteProject(projectId) {
    const favorites = this._getFromStorage('favorite_projects', []);
    const filtered = favorites.filter((f) => f.projectId !== projectId);
    const removed = favorites.length !== filtered.length;
    if (removed) {
      this._saveToStorage('favorite_projects', filtered);
    }
    return {
      success: removed,
      totalFavorites: filtered.length
    };
  }

  // 8) getFavoriteProjects (with FK resolution)
  getFavoriteProjects() {
    const favorites = this._getFromStorage('favorite_projects', []);
    const projects = this._getFromStorage('projects', []);

    const result = favorites.map((favorite) => {
      const project = projects.find((p) => p.id === favorite.projectId) || null;
      return {
        favorite,
        project
      };
    });

    return { favorites: result };
  }

  // 9) addProjectToComparison
  addProjectToComparison(projectId) {
    const comparison = this._getOrCreateProjectComparison();
    let items = this._getFromStorage('project_comparison_items', []);

    const existing = items.find(
      (item) => item.comparisonId === comparison.id && item.projectId === projectId
    );

    const relatedItems = items.filter((item) => item.comparisonId === comparison.id);

    if (!existing && relatedItems.length >= 3) {
      return {
        success: false,
        comparison,
        items: relatedItems,
        totalCompared: relatedItems.length,
        message: 'Comparison already has 3 projects.'
      };
    }

    if (!existing) {
      const positionIndex = relatedItems.length; // 0-based
      const newItem = {
        id: this._generateId('cmpitem'),
        comparisonId: comparison.id,
        projectId,
        positionIndex,
        addedAt: new Date().toISOString()
      };
      items.push(newItem);
      this._saveToStorage('project_comparison_items', items);

      // Update comparison updatedAt
      const comparisons = this._getFromStorage('project_comparisons', []);
      const idx = comparisons.findIndex((c) => c.id === comparison.id);
      if (idx !== -1) {
        comparisons[idx].updatedAt = new Date().toISOString();
        this._saveToStorage('project_comparisons', comparisons);
      }
    }

    const finalItems = items.filter((item) => item.comparisonId === comparison.id);

    return {
      success: true,
      comparison,
      items: finalItems,
      totalCompared: finalItems.length,
      message: 'Project added to comparison.'
    };
  }

  // 10) getActiveProjectComparisonSummary
  getActiveProjectComparisonSummary() {
    const comparison = this._getActiveProjectComparison();
    if (!comparison) {
      return {
        comparison: null,
        totalCompared: 0
      };
    }
    const items = this._getFromStorage('project_comparison_items', []);
    const totalCompared = items.filter((i) => i.comparisonId === comparison.id).length;
    return {
      comparison,
      totalCompared
    };
  }

  // 11) getActiveProjectComparisonDetail (FK resolution)
  getActiveProjectComparisonDetail() {
    const comparison = this._getActiveProjectComparison();
    if (!comparison) {
      return {
        comparison: null,
        items: []
      };
    }
    const items = this._getFromStorage('project_comparison_items', []);
    const projects = this._getFromStorage('projects', []);

    const relatedItems = items
      .filter((item) => item.comparisonId === comparison.id)
      .sort((a, b) => {
        const ai = typeof a.positionIndex === 'number' ? a.positionIndex : 0;
        const bi = typeof b.positionIndex === 'number' ? b.positionIndex : 0;
        return ai - bi;
      })
      .map((comparisonItem) => {
        const project = projects.find((p) => p.id === comparisonItem.projectId) || null;
        return { comparisonItem, project };
      });

    return {
      comparison,
      items: relatedItems
    };
  }

  // 12) createConsultationRequestFromProject
  createConsultationRequestFromProject(projectId, propertyType, projectDescription, preferredTimeline, name, email, phone) {
    const consultationRequests = this._getFromStorage('consultation_requests', []);
    const now = new Date().toISOString();

    const request = {
      id: this._generateId('consultation'),
      projectId,
      sourceType: 'project_detail',
      propertyType: propertyType || 'other',
      projectDescription,
      preferredTimeline: preferredTimeline || 'unspecified',
      name,
      email,
      phone: phone || null,
      createdAt: now
    };

    consultationRequests.push(request);
    this._saveToStorage('consultation_requests', consultationRequests);

    return {
      success: true,
      consultationRequest: request,
      message: 'Consultation request submitted from project.'
    };
  }

  // 13) createCallRequestForProject
  createCallRequestForProject(projectId, consultationType, requestedDate) {
    const callRequests = this._getFromStorage('call_requests', []);

    const isoRequested = this._parseDate(requestedDate)
      ? new Date(requestedDate).toISOString()
      : new Date().toISOString();

    const callRequest = {
      id: this._generateId('call'),
      projectId,
      consultationType, // 'video_call', 'phone_call', 'in_person'
      requestedDate: isoRequested,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    callRequests.push(callRequest);
    this._saveToStorage('call_requests', callRequests);

    return {
      success: true,
      callRequest,
      message: 'Call request created.'
    };
  }

  // 14) createKitchenProjectContact
  createKitchenProjectContact(projectId, name, email, message) {
    const contactMessages = this._getFromStorage('contact_messages', []);

    const contactMessage = {
      id: this._generateId('contact'),
      sourceType: 'project_kitchen_like_this',
      projectId,
      name,
      email,
      subject: null,
      message,
      createdAt: new Date().toISOString()
    };

    contactMessages.push(contactMessage);
    this._saveToStorage('contact_messages', contactMessages);

    return {
      success: true,
      contactMessage,
      message: 'Contact message submitted.'
    };
  }

  // 15) getAvailableEDesignPackagesForProject
  getAvailableEDesignPackagesForProject(projectId) {
    const projects = this._getFromStorage('projects', []);
    const servicePackages = this._getFromStorage('service_packages', []);

    const project = projects.find((p) => p.id === projectId) || null;
    let eDesignPackages = servicePackages.filter((sp) => sp.packageType === 'e_design');

    // Fallback: if no dedicated e-design packages exist, offer all service packages
    if (!eDesignPackages || eDesignPackages.length === 0) {
      eDesignPackages = servicePackages.slice();
    }

    return {
      project,
      eDesignPackages
    };
  }

  // 16) startEDesignBriefForProject
  startEDesignBriefForProject(projectId, servicePackageId, title, numberOfRooms, budgetPerRoom, notes) {
    const projectBriefs = this._getFromStorage('project_briefs', []);

    const numRooms = typeof numberOfRooms === 'number' ? numberOfRooms : null;
    const budPerRoom = typeof budgetPerRoom === 'number' ? budgetPerRoom : null;
    const estimatedTotalBudget = numRooms && budPerRoom ? numRooms * budPerRoom : null;

    const projectBrief = {
      id: this._generateId('brief'),
      sourceType: 'project',
      servicePackageId,
      projectId,
      briefType: 'e_design_brief',
      title,
      numberOfRooms: numRooms,
      budgetPerRoom: budPerRoom,
      estimatedTotalBudget,
      currency: budPerRoom ? 'usd' : null,
      notes: notes || null,
      createdAt: new Date().toISOString()
    };

    projectBriefs.push(projectBrief);
    this._saveToStorage('project_briefs', projectBriefs);

    return {
      success: true,
      projectBrief,
      message: 'E-design brief created.'
    };
  }

  // 17) getServiceFilterOptions
  getServiceFilterOptions() {
    const packageTypesEnum = ['full_service_design', 'e_design', 'consultation', 'styling', 'other'];

    const packageTypes = packageTypesEnum.map((value) => ({
      value,
      label:
        value === 'full_service_design'
          ? 'Full-Service Design'
          : value === 'e_design'
          ? 'E-Design'
          : value === 'consultation'
          ? 'Consultation'
          : value === 'styling'
          ? 'Styling'
          : 'Other'
    }));

    const featureOptions = [
      { featureKey: '3d_renderings', label: '3D Renderings' },
      { featureKey: 'floor_plan', label: 'Floor Plan' },
      { featureKey: 'shopping_list', label: 'Shopping List' }
    ];

    const sortOptions = [
      { value: 'price_per_room_asc', label: 'Price per Room: Low to High' },
      { value: 'price_per_room_desc', label: 'Price per Room: High to Low' },
      { value: 'total_price_asc', label: 'Total Price: Low to High' },
      { value: 'total_price_desc', label: 'Total Price: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' }
    ];

    return {
      packageTypes,
      featureOptions,
      sortOptions
    };
  }

  // 18) listServicePackages
  listServicePackages(filters, sort, pagination) {
    let servicePackages = this._getFromStorage('service_packages', []);
    const f = filters || {};

    servicePackages = servicePackages.filter((sp) => {
      if (f.packageType && sp.packageType !== f.packageType) return false;
      if (typeof f.includes3DRenderings === 'boolean') {
        const includes = !!sp.includes3DRenderings;
        if (includes !== f.includes3DRenderings) return false;
      }
      if (Array.isArray(f.requiredFeatures) && f.requiredFeatures.length > 0) {
        const features = Array.isArray(sp.features) ? sp.features : [];
        const missing = f.requiredFeatures.some((req) => !features.includes(req));
        if (missing) return false;
      }
      if (typeof f.minPricePerRoom === 'number') {
        if (typeof sp.pricePerRoom !== 'number' || sp.pricePerRoom < f.minPricePerRoom) return false;
      }
      if (typeof f.maxPricePerRoom === 'number') {
        if (typeof sp.pricePerRoom !== 'number' || sp.pricePerRoom > f.maxPricePerRoom) return false;
      }
      if (typeof f.minTotalPrice === 'number') {
        if (typeof sp.totalPrice !== 'number' || sp.totalPrice < f.minTotalPrice) return false;
      }
      if (typeof f.maxTotalPrice === 'number') {
        if (typeof sp.totalPrice !== 'number' || sp.totalPrice > f.maxTotalPrice) return false;
      }
      return true;
    });

    if (sort && sort.field) {
      const dir = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      servicePackages = servicePackages.slice().sort((a, b) => {
        let av;
        let bv;
        switch (sort.field) {
          case 'price_per_room':
            av = typeof a.pricePerRoom === 'number' ? a.pricePerRoom : 0;
            bv = typeof b.pricePerRoom === 'number' ? b.pricePerRoom : 0;
            break;
          case 'total_price':
            av = typeof a.totalPrice === 'number' ? a.totalPrice : 0;
            bv = typeof b.totalPrice === 'number' ? b.totalPrice : 0;
            break;
          case 'popularity':
            av = a.isPopular ? 1 : 0;
            bv = b.isPopular ? 1 : 0;
            break;
          default:
            av = 0;
            bv = 0;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    const totalCount = servicePackages.length;
    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.pageSize) || 20;
    const start = (page - 1) * pageSize;
    const paginated = servicePackages.slice(start, start + pageSize);

    return {
      servicePackages: paginated,
      totalCount,
      page,
      pageSize
    };
  }

  // 19) getServicePackageDetail
  getServicePackageDetail(servicePackageId) {
    const servicePackages = this._getFromStorage('service_packages', []);
    const projects = this._getFromStorage('projects', []);

    const servicePackage = servicePackages.find((sp) => sp.id === servicePackageId) || null;

    let exampleProjects = [];
    if (servicePackage) {
      // Simple heuristic: featured projects as examples
      exampleProjects = projects.filter((p) => p.isFeatured).slice(0, 3);
    }

    return {
      servicePackage,
      exampleProjects
    };
  }

  // 20) createProjectBriefFromServicePackage
  createProjectBriefFromServicePackage(servicePackageId, title, numberOfRooms, budgetPerRoom, notes) {
    const projectBriefs = this._getFromStorage('project_briefs', []);
    const servicePackages = this._getFromStorage('service_packages', []);

    const servicePackage = servicePackages.find((sp) => sp.id === servicePackageId) || null;
    let briefType = 'other';
    if (servicePackage) {
      if (servicePackage.packageType === 'full_service_design') {
        briefType = 'full_service_design_brief';
      } else if (servicePackage.packageType === 'e_design') {
        briefType = 'e_design_brief';
      }
    }

    const numRooms = typeof numberOfRooms === 'number' ? numberOfRooms : null;
    const budPerRoom = typeof budgetPerRoom === 'number' ? budgetPerRoom : null;
    const estimatedTotalBudget = numRooms && budPerRoom ? numRooms * budPerRoom : null;

    const projectBrief = {
      id: this._generateId('brief'),
      sourceType: 'service_package',
      servicePackageId,
      projectId: null,
      briefType,
      title,
      numberOfRooms: numRooms,
      budgetPerRoom: budPerRoom,
      estimatedTotalBudget,
      currency: budPerRoom ? 'usd' : null,
      notes: notes || null,
      createdAt: new Date().toISOString()
    };

    projectBriefs.push(projectBrief);
    this._saveToStorage('project_briefs', projectBriefs);

    return {
      success: true,
      projectBrief,
      message: 'Project brief created from service package.'
    };
  }

  // 21) addServicePackageToShortlist
  addServicePackageToShortlist(servicePackageId) {
    const shortlist = this._getOrCreateServiceShortlist();
    let items = this._getFromStorage('service_shortlist_items', []);

    const existing = items.find(
      (item) => item.shortlistId === shortlist.id && item.servicePackageId === servicePackageId
    );

    if (!existing) {
      const newItem = {
        id: this._generateId('slitem'),
        shortlistId: shortlist.id,
        servicePackageId,
        addedAt: new Date().toISOString()
      };
      items.push(newItem);
      this._saveToStorage('service_shortlist_items', items);

      // Update shortlist updatedAt
      const shortlists = this._getFromStorage('service_shortlists', []);
      const idx = shortlists.findIndex((s) => s.id === shortlist.id);
      if (idx !== -1) {
        shortlists[idx].updatedAt = new Date().toISOString();
        this._saveToStorage('service_shortlists', shortlists);
      }
    }

    const finalItems = items.filter((item) => item.shortlistId === shortlist.id);

    return {
      success: true,
      shortlist,
      items: finalItems,
      totalShortlisted: finalItems.length,
      message: 'Service package added to shortlist.'
    };
  }

  // 22) removeServicePackageFromShortlist
  removeServicePackageFromShortlist(servicePackageId) {
    const shortlist = this._getActiveServiceShortlist();
    if (!shortlist) {
      return {
        success: false,
        totalShortlisted: 0
      };
    }

    const items = this._getFromStorage('service_shortlist_items', []);
    const filtered = items.filter(
      (item) => !(item.shortlistId === shortlist.id && item.servicePackageId === servicePackageId)
    );

    const removed = items.length !== filtered.length;
    if (removed) {
      this._saveToStorage('service_shortlist_items', filtered);
    }

    const remainingCount = filtered.filter((item) => item.shortlistId === shortlist.id).length;

    return {
      success: removed,
      totalShortlisted: remainingCount
    };
  }

  // 23) getServiceShortlistSummary
  getServiceShortlistSummary() {
    const shortlist = this._getActiveServiceShortlist();
    if (!shortlist) {
      return {
        shortlist: null,
        totalShortlisted: 0
      };
    }

    const items = this._getFromStorage('service_shortlist_items', []);
    const totalShortlisted = items.filter((item) => item.shortlistId === shortlist.id).length;

    return {
      shortlist,
      totalShortlisted
    };
  }

  // 24) getServiceShortlistDetail (FK resolution)
  getServiceShortlistDetail() {
    const shortlist = this._getActiveServiceShortlist();
    if (!shortlist) {
      return {
        shortlist: null,
        items: []
      };
    }

    const items = this._getFromStorage('service_shortlist_items', []);
    const servicePackages = this._getFromStorage('service_packages', []);

    const relatedItems = items
      .filter((item) => item.shortlistId === shortlist.id)
      .map((shortlistItem) => {
        const servicePackage = servicePackages.find(
          (sp) => sp.id === shortlistItem.servicePackageId
        ) || null;
        return { shortlistItem, servicePackage };
      });

    return {
      shortlist,
      items: relatedItems
    };
  }

  // 25) shareServiceShortlistByEmail
  shareServiceShortlistByEmail(email) {
    const shortlist = this._getOrCreateServiceShortlist();
    const shortlistShares = this._getFromStorage('shortlist_shares', []);

    const shortlistShare = {
      id: this._generateId('slshare'),
      shortlistId: shortlist.id,
      email,
      sentAt: new Date().toISOString()
    };

    shortlistShares.push(shortlistShare);
    this._saveToStorage('shortlist_shares', shortlistShares);

    return {
      success: true,
      shortlistShare,
      message: 'Shortlist shared via email.'
    };
  }

  // 26) getBlogFilterOptions
  getBlogFilterOptions() {
    const dateRanges = [
      { value: 'all', label: 'All time' },
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_12_months', label: 'Last 12 months' }
    ];

    const sortOptions = [
      { value: 'published_at_desc', label: 'Newest first' },
      { value: 'published_at_asc', label: 'Oldest first' },
      { value: 'reading_time_asc', label: 'Reading time: Shortest first' },
      { value: 'reading_time_desc', label: 'Reading time: Longest first' }
    ];

    return {
      dateRanges,
      sortOptions
    };
  }

  // 27) listBlogArticles
  listBlogArticles(filters, sort, pagination) {
    let articles = this._getFromStorage('blog_articles', []);
    const f = filters || {};

    if (f.query && f.query.trim()) {
      const q = f.query.trim().toLowerCase();
      articles = articles.filter((a) => {
        const inTitle = a.title && a.title.toLowerCase().includes(q);
        const inExcerpt = a.excerpt && a.excerpt.toLowerCase().includes(q);
        const inContent = a.content && a.content.toLowerCase().includes(q);
        const inTags = Array.isArray(a.tags) && a.tags.join(' ').toLowerCase().includes(q);
        return inTitle || inExcerpt || inContent || inTags;
      });
    }

    if (f.publishedFrom) {
      const fromDate = this._parseDate(f.publishedFrom);
      if (fromDate) {
        articles = articles.filter((a) => {
          const d = this._parseDate(a.publishedAt);
          return d && d.getTime() >= fromDate.getTime();
        });
      }
    }

    if (f.publishedTo) {
      const toDate = this._parseDate(f.publishedTo);
      if (toDate) {
        articles = articles.filter((a) => {
          const d = this._parseDate(a.publishedAt);
          return d && d.getTime() <= toDate.getTime();
        });
      }
    }

    if (sort && sort.field) {
      const dir = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      articles = articles.slice().sort((a, b) => {
        let av;
        let bv;
        switch (sort.field) {
          case 'published_at':
            av = this._parseDate(a.publishedAt);
            bv = this._parseDate(b.publishedAt);
            av = av ? av.getTime() : 0;
            bv = bv ? bv.getTime() : 0;
            break;
          case 'reading_time':
            av = typeof a.readingTimeMinutes === 'number' ? a.readingTimeMinutes : 0;
            bv = typeof b.readingTimeMinutes === 'number' ? b.readingTimeMinutes : 0;
            break;
          default:
            av = 0;
            bv = 0;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    const totalCount = articles.length;
    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.pageSize) || 20;
    const start = (page - 1) * pageSize;
    const paginated = articles.slice(start, start + pageSize);

    return {
      articles: paginated,
      totalCount,
      page,
      pageSize
    };
  }

  // 28) getBlogArticleDetail
  getBlogArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const article = articles.find((a) => a.id === articleId) || null;
    const isInReadingList = !!readingListItems.find((item) => item.articleId === articleId);

    return {
      article,
      isInReadingList
    };
  }

  // 29) addArticleToReadingList
  addArticleToReadingList(articleId) {
    let items = this._getFromStorage('reading_list_items', []);

    let readingListItem = items.find((i) => i.articleId === articleId) || null;
    if (!readingListItem) {
      readingListItem = {
        id: this._generateId('rlist'),
        articleId,
        addedAt: new Date().toISOString()
      };
      items.push(readingListItem);
      this._saveToStorage('reading_list_items', items);
    }

    return {
      success: true,
      readingListItem,
      totalReadingListItems: items.length,
      message: 'Article added to reading list.'
    };
  }

  // 30) removeReadingListItem
  removeReadingListItem(articleId) {
    const items = this._getFromStorage('reading_list_items', []);
    const filtered = items.filter((i) => i.articleId !== articleId);
    const removed = items.length !== filtered.length;
    if (removed) {
      this._saveToStorage('reading_list_items', filtered);
    }
    return {
      success: removed,
      totalReadingListItems: filtered.length
    };
  }

  // 31) getReadingListItems (FK resolution)
  getReadingListItems() {
    const items = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('blog_articles', []);

    const result = items.map((readingListItem) => {
      const article = articles.find((a) => a.id === readingListItem.articleId) || null;
      return { readingListItem, article };
    });

    return { items: result };
  }

  // 32) subscribeToNewsletterFromArticle
  subscribeToNewsletterFromArticle(articleId, email) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);

    const subscription = {
      id: this._generateId('sub'),
      email,
      source: 'article_page',
      articleId,
      createdAt: new Date().toISOString(),
      confirmed: false
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription,
      message: 'Subscribed to newsletter from article.'
    };
  }

  // 33) getTestimonialFilterOptions
  getTestimonialFilterOptions() {
    const projectRoomTypesEnum = ['kitchen', 'living_room', 'bedroom', 'office', 'bathroom', 'dining_room', 'other'];

    const projectRoomTypes = projectRoomTypesEnum.map((value) => ({
      value,
      label: this._labelForRoomType(value)
    }));

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'rating_asc', label: 'Rating: Low to High' },
      { value: 'created_at_desc', label: 'Newest first' },
      { value: 'created_at_asc', label: 'Oldest first' }
    ];

    return {
      projectRoomTypes,
      sortOptions
    };
  }

  // 34) listTestimonials
  listTestimonials(filters, sort, pagination) {
    let testimonials = this._getFromStorage('testimonials', []);
    const f = filters || {};

    if (f.projectRoomType) {
      testimonials = testimonials.filter((t) => t.projectRoomType === f.projectRoomType);
    }

    if (sort && sort.field) {
      const dir = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      testimonials = testimonials.slice().sort((a, b) => {
        let av;
        let bv;
        switch (sort.field) {
          case 'rating':
            av = typeof a.rating === 'number' ? a.rating : 0;
            bv = typeof b.rating === 'number' ? b.rating : 0;
            break;
          case 'created_at':
            av = this._parseDate(a.createdAt);
            bv = this._parseDate(b.createdAt);
            av = av ? av.getTime() : 0;
            bv = bv ? bv.getTime() : 0;
            break;
          default:
            av = 0;
            bv = 0;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    const totalCount = testimonials.length;
    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.pageSize) || 20;
    const start = (page - 1) * pageSize;
    const paginated = testimonials.slice(start, start + pageSize);

    return {
      testimonials: paginated,
      totalCount,
      page,
      pageSize
    };
  }

  // 35) getTestimonialDetail (FK resolution for project)
  getTestimonialDetail(testimonialId) {
    const testimonials = this._getFromStorage('testimonials', []);
    const projects = this._getFromStorage('projects', []);

    const testimonial = testimonials.find((t) => t.id === testimonialId) || null;
    let project = null;
    if (testimonial && testimonial.projectId) {
      project = projects.find((p) => p.id === testimonial.projectId) || null;
    }

    return {
      testimonial,
      project
    };
  }

  // 36) getFAQCategories
  getFAQCategories() {
    const categoriesEnum = ['pricing_payments', 'process', 'services', 'technical', 'general', 'other'];

    return categoriesEnum.map((value) => ({
      value,
      label:
        value === 'pricing_payments'
          ? 'Pricing & Payments'
          : value.charAt(0).toUpperCase() + value.replace('_', ' ').slice(1)
    }));
  }

  // 37) listFAQItems
  listFAQItems(filters) {
    let faqItems = this._getFromStorage('faq_items', []);
    const f = filters || {};

    if (f.query && f.query.trim()) {
      const q = f.query.trim().toLowerCase();
      faqItems = faqItems.filter((item) => {
        const inQuestion = item.question && item.question.toLowerCase().includes(q);
        const inAnswer = item.answerHtml && item.answerHtml.toLowerCase().includes(q);
        const inKeywords = Array.isArray(item.keywords) && item.keywords.join(' ').toLowerCase().includes(q);
        return inQuestion || inAnswer || inKeywords;
      });
    }

    if (f.category) {
      faqItems = faqItems.filter((item) => item.category === f.category);
    }

    return {
      faqItems,
      totalCount: faqItems.length
    };
  }

  // 38) getInspirationFilterOptions
  getInspirationFilterOptions() {
    const stylesEnum = ['modern', 'bohemian', 'scandinavian', 'minimalist', 'industrial', 'traditional', 'eclectic', 'other'];

    return stylesEnum.map((value) => ({
      value,
      label: this._labelForStyle(value)
    }));
  }

  // 39) listInspirationImages
  listInspirationImages(filters, pagination) {
    let images = this._getFromStorage('inspiration_images', []);
    const f = filters || {};

    if (f.style) {
      images = images.filter((img) => img.style === f.style);
    }

    // Sort newest first by createdAt if available
    images = images.slice().sort((a, b) => {
      const da = this._parseDate(a.createdAt);
      const db = this._parseDate(b.createdAt);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

    const totalCount = images.length;
    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.pageSize) || 20;
    const start = (page - 1) * pageSize;
    const paginated = images.slice(start, start + pageSize);

    return {
      images: paginated,
      totalCount,
      page,
      pageSize
    };
  }

  // 40) addInspirationImageToBoard
  addInspirationImageToBoard(inspirationImageId) {
    const board = this._getOrCreateInspirationBoard();
    let items = this._getFromStorage('inspiration_board_items', []);

    const existing = items.find(
      (item) => item.boardId === board.id && item.inspirationImageId === inspirationImageId
    );

    if (!existing) {
      const positionIndex = items.filter((item) => item.boardId === board.id).length;
      const newItem = {
        id: this._generateId('bitem'),
        boardId: board.id,
        inspirationImageId,
        positionIndex,
        addedAt: new Date().toISOString()
      };
      items.push(newItem);
      this._saveToStorage('inspiration_board_items', items);

      const boards = this._getFromStorage('inspiration_boards', []);
      const idx = boards.findIndex((b) => b.id === board.id);
      if (idx !== -1) {
        boards[idx].updatedAt = new Date().toISOString();
        this._saveToStorage('inspiration_boards', boards);
      }
    }

    const finalItems = items.filter((item) => item.boardId === board.id);

    return {
      success: true,
      board,
      items: finalItems,
      totalItems: finalItems.length,
      message: 'Image added to inspiration board.'
    };
  }

  // 41) getActiveInspirationBoardSummary
  getActiveInspirationBoardSummary() {
    const board = this._getActiveInspirationBoard();
    if (!board) {
      return {
        board: null,
        totalItems: 0
      };
    }

    const items = this._getFromStorage('inspiration_board_items', []);
    const totalItems = items.filter((item) => item.boardId === board.id).length;

    return {
      board,
      totalItems
    };
  }

  // 42) getInspirationBoardDetail (FK resolution)
  getInspirationBoardDetail() {
    const board = this._getActiveInspirationBoard();
    if (!board) {
      return {
        board: null,
        items: []
      };
    }

    const items = this._getFromStorage('inspiration_board_items', []);
    const images = this._getFromStorage('inspiration_images', []);

    const relatedItems = items
      .filter((item) => item.boardId === board.id)
      .sort((a, b) => {
        const ai = typeof a.positionIndex === 'number' ? a.positionIndex : 0;
        const bi = typeof b.positionIndex === 'number' ? b.positionIndex : 0;
        return ai - bi;
      })
      .map((boardItem) => {
        const image = images.find((img) => img.id === boardItem.inspirationImageId) || null;
        return { boardItem, image };
      });

    return {
      board,
      items: relatedItems
    };
  }

  // 43) saveInspirationBoard
  saveInspirationBoard(name) {
    const board = this._getOrCreateInspirationBoard();
    const boards = this._getFromStorage('inspiration_boards', []);
    const idx = boards.findIndex((b) => b.id === board.id);
    if (idx !== -1) {
      boards[idx].name = name;
      boards[idx].updatedAt = new Date().toISOString();
      this._saveToStorage('inspiration_boards', boards);
    }

    const updatedBoard = idx !== -1 ? boards[idx] : board;

    return {
      success: true,
      board: updatedBoard,
      message: 'Inspiration board saved.'
    };
  }

  // 44) getAboutPageContent
  getAboutPageContent() {
    const defaultContent = {
      studioStoryHtml: '',
      missionHtml: '',
      teamMembers: [],
      awards: [],
      pressMentions: []
    };
    const content = this._getObjectFromStorage('about_page_content', defaultContent);

    return {
      studioStoryHtml: content.studioStoryHtml || '',
      missionHtml: content.missionHtml || '',
      teamMembers: Array.isArray(content.teamMembers) ? content.teamMembers : [],
      awards: Array.isArray(content.awards) ? content.awards : [],
      pressMentions: Array.isArray(content.pressMentions) ? content.pressMentions : []
    };
  }

  // 45) getContactPageContent
  getContactPageContent() {
    const defaultContent = {
      email: '',
      phone: '',
      addressHtml: '',
      serviceAreaHtml: ''
    };
    const content = this._getObjectFromStorage('contact_page_content', defaultContent);

    return {
      email: content.email || '',
      phone: content.phone || '',
      addressHtml: content.addressHtml || '',
      serviceAreaHtml: content.serviceAreaHtml || ''
    };
  }

  // 46) createGeneralContactMessage
  createGeneralContactMessage(name, email, subject, message) {
    const contactMessages = this._getFromStorage('contact_messages', []);

    const contactMessage = {
      id: this._generateId('contact'),
      sourceType: 'general_contact_page',
      projectId: null,
      name,
      email,
      subject: subject || null,
      message,
      createdAt: new Date().toISOString()
    };

    contactMessages.push(contactMessage);
    this._saveToStorage('contact_messages', contactMessages);

    return {
      success: true,
      contactMessage,
      message: 'Contact message submitted.'
    };
  }

  // 47) getSavedItemsOverview (FK resolution via helpers)
  getSavedItemsOverview() {
    const favoritesRaw = this._getFromStorage('favorite_projects', []);
    const projects = this._getFromStorage('projects', []);
    const readingListRaw = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('blog_articles', []);

    const favorites = favoritesRaw.map((favorite) => {
      const project = projects.find((p) => p.id === favorite.projectId) || null;
      return { favorite, project };
    });

    const readingListItems = readingListRaw.map((readingListItem) => {
      const article = articles.find((a) => a.id === readingListItem.articleId) || null;
      return { readingListItem, article };
    });

    return {
      favorites,
      readingListItems
    };
  }

  // 48) getPoliciesContent
  getPoliciesContent() {
    const defaultContent = {
      termsOfUseHtml: '',
      privacyPolicyHtml: ''
    };
    const content = this._getObjectFromStorage('policies_content', defaultContent);

    return {
      termsOfUseHtml: content.termsOfUseHtml || '',
      privacyPolicyHtml: content.privacyPolicyHtml || ''
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
