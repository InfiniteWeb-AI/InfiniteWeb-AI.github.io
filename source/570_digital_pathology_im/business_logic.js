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

  // ---------------------------
  // Storage helpers
  // ---------------------------
  _initStorage() {
    const tables = [
      'cases',
      'studies',
      'slides',
      'projects',
      'projectslides',
      'algorithms',
      'algorithmconfigurations',
      'projectalgorithmconfigs',
      'slidealgorithmresults',
      'visualizationpresets',
      'annotations',
      'collections',
      'collectionslides',
      'cohorts',
      'cohortmembers',
      'cohortPreviews',
      'exportFiles'
    ];
    for (const key of tables) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
    if (localStorage.getItem('idCounter') === null) {
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

  _findById(list, id) {
    return list.find(item => item.id === id) || null;
  }

  // ---------------------------
  // Hydration helpers (FK resolution)
  // ---------------------------

  _hydrateSlide(slide) {
    if (!slide) return null;
    const cases = this._getFromStorage('cases');
    const studies = this._getFromStorage('studies');
    const caseObj = slide.caseId ? this._findById(cases, slide.caseId) : null;
    const studyObj = slide.studyId ? this._findById(studies, slide.studyId) : null;
    return Object.assign({}, slide, {
      case: caseObj || null,
      study: studyObj || null
    });
  }

  _hydrateAlgorithmResult(result) {
    if (!result) return null;
    const slides = this._getFromStorage('slides');
    const algorithms = this._getFromStorage('algorithms');
    const configs = this._getFromStorage('algorithmconfigurations');
    const slide = this._findById(slides, result.slideId);
    const algorithm = this._findById(algorithms, result.algorithmId);
    const config = result.configurationId ? this._findById(configs, result.configurationId) : null;
    return Object.assign({}, result, {
      slide: slide ? this._hydrateSlide(slide) : null,
      algorithm: algorithm || null,
      configuration: config || null
    });
  }

  _hydrateAnnotation(annotation) {
    if (!annotation) return null;
    const slides = this._getFromStorage('slides');
    const slide = this._findById(slides, annotation.slideId);
    return Object.assign({}, annotation, {
      slide: slide ? this._hydrateSlide(slide) : null
    });
  }

  _hydrateVisualizationPreset(preset) {
    if (!preset) return null;
    const algorithms = this._getFromStorage('algorithms');
    const algorithm = this._findById(algorithms, preset.algorithmId);
    const hydrated = Object.assign({}, preset, {
      algorithm: algorithm || null
    });
    // Optionally expose parsed settings
    if (preset.settingsJson) {
      try {
        hydrated.settings = JSON.parse(preset.settingsJson);
      } catch (e) {
        hydrated.settings = null;
      }
    } else {
      hydrated.settings = null;
    }
    return hydrated;
  }

  _hydrateProjectAlgorithmConfig(pac) {
    if (!pac) return null;
    const projects = this._getFromStorage('projects');
    const algorithms = this._getFromStorage('algorithms');
    const configs = this._getFromStorage('algorithmconfigurations');
    return Object.assign({}, pac, {
      project: this._findById(projects, pac.projectId) || null,
      algorithm: this._findById(algorithms, pac.algorithmId) || null,
      configuration: this._findById(configs, pac.configurationId) || null
    });
  }

  _hydrateCohortMember(member) {
    if (!member) return null;
    const slides = this._getFromStorage('slides');
    const cases = this._getFromStorage('cases');
    const slide = this._findById(slides, member.slideId);
    const caseObj = slide && slide.caseId ? this._findById(cases, slide.caseId) : null;
    const base = {
      slideId: member.slideId,
      caseIdentifier: caseObj ? caseObj.caseIdentifier : null,
      organ: slide ? slide.organ : null,
      stage: caseObj ? caseObj.stage : null,
      stain: slide ? slide.stain : null,
      defaultTumorAreaMm2: slide ? slide.defaultTumorAreaMm2 : null,
      excluded: !!member.excluded,
      exclusionReason: member.exclusionReason || null,
      slide: slide ? this._hydrateSlide(slide) : null
    };
    return base;
  }

  // ---------------------------
  // Private helpers specified in schema
  // ---------------------------

  // Cohort preview state helper
  _getOrCreateCohortPreviewState(previewId, filters, members) {
    const previews = this._getFromStorage('cohortPreviews');
    if (previewId) {
      return previews.find(p => p.previewId === previewId) || null;
    }
    const newPreview = {
      previewId: this._generateId('cohortpreview'),
      filtersApplied: filters,
      members: members || [],
      createdAt: this._nowIso()
    };
    previews.push(newPreview);
    this._saveToStorage('cohortPreviews', previews);
    return newPreview;
  }

  // Simulate starting an algorithm run job and immediately complete it
  _startAlgorithmRunJob(slideId, algorithmId, configurationId) {
    const results = this._getFromStorage('slidealgorithmresults');
    const algorithms = this._getFromStorage('algorithms');
    const slides = this._getFromStorage('slides');

    const algorithm = this._findById(algorithms, algorithmId);
    const slide = this._findById(slides, slideId);

    let tumorAreaMm2 = null;
    let nucleiCount = null;
    let tilMaxDensityCellsPerMm2 = null;
    let pdL1Percentage = null;

    // For tumor segmentation algorithms, derive a deterministic tumor area in mm²
    // so that results are comparable and always numeric.
    if (algorithm && algorithm.algorithmType === 'tumor_segmentation') {
      let maxArea = 0;

      if (slide && typeof slide.defaultTumorAreaMm2 === 'number') {
        maxArea = Math.max(maxArea, slide.defaultTumorAreaMm2);
      }

      // Also consider existing tumor segmentation results for this slide
      for (const r of results) {
        if (r.slideId === slideId) {
          const alg = this._findById(algorithms, r.algorithmId);
          if (alg && alg.algorithmType === 'tumor_segmentation' && typeof r.tumorAreaMm2 === 'number') {
            if (r.tumorAreaMm2 > maxArea) {
              maxArea = r.tumorAreaMm2;
            }
          }
        }
      }

      // Fallback to a reasonable positive default if no prior information exists
      if (maxArea <= 0) {
        maxArea = 50;
      }

      tumorAreaMm2 = maxArea;
    }

    const newResult = {
      id: this._generateId('slidealgoresult'),
      slideId: slideId,
      algorithmId: algorithmId,
      configurationId: configurationId || null,
      runDate: this._nowIso(),
      status: 'completed',
      tumorAreaMm2: tumorAreaMm2,
      nucleiCount: nucleiCount,
      tilMaxDensityCellsPerMm2: tilMaxDensityCellsPerMm2,
      pdL1Percentage: pdL1Percentage,
      isDefaultForAlgorithmType: false,
      resultSummary: ''
    };
    results.push(newResult);
    this._saveToStorage('slidealgorithmresults', results);
    return newResult;
  }

  // Ensure only one SlideAlgorithmResult per algorithm_type is default for a slide
  _updateDefaultAlgorithmFlags(slideAlgorithmResultId) {
    const results = this._getFromStorage('slidealgorithmresults');
    const algorithms = this._getFromStorage('algorithms');
    const slides = this._getFromStorage('slides');

    const target = results.find(r => r.id === slideAlgorithmResultId);
    if (!target) return null;

    const algorithm = this._findById(algorithms, target.algorithmId);
    if (!algorithm) return null;

    const algoType = algorithm.algorithmType;
    const slideId = target.slideId;

    for (const r of results) {
      if (r.slideId === slideId) {
        const alg = this._findById(algorithms, r.algorithmId);
        if (alg && alg.algorithmType === algoType) {
          r.isDefaultForAlgorithmType = (r.id === slideAlgorithmResultId);
        }
      }
    }

    // If tumor_segmentation default is set, update slide.defaultTumorAreaMm2
    if (algoType === 'tumor_segmentation') {
      const slide = this._findById(slides, slideId);
      if (slide) {
        slide.defaultTumorAreaMm2 = target.tumorAreaMm2 || null;
        this._saveToStorage('slides', slides);
      }
    }

    this._saveToStorage('slidealgorithmresults', results);
    return target;
  }

  // Compute polygon area using shoelace formula; treat coordinate units as mm
  _computeAnnotationAreaMm2(slide, coordinates) {
    if (!coordinates || coordinates.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
      const j = (i + 1) % coordinates.length;
      const xi = coordinates[i].x;
      const yi = coordinates[i].y;
      const xj = coordinates[j].x;
      const yj = coordinates[j].y;
      area += xi * yj - xj * yi;
    }
    area = Math.abs(area) / 2.0;
    return area; // already in mm^2 if coordinates are in mm
  }

  // Create export file metadata and store CSV content
  _createExportFile(filename, content, rowCount) {
    const exportsArr = this._getFromStorage('exportFiles');
    const fileId = this._generateId('export');
    const fileRecord = {
      id: fileId,
      filename: filename,
      content: content,
      rowCount: rowCount,
      createdAt: this._nowIso()
    };
    exportsArr.push(fileRecord);
    this._saveToStorage('exportFiles', exportsArr);
    return fileRecord;
  }

  // ---------------------------
  // Utility helpers
  // ---------------------------

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _stageLabel(stageValue) {
    const map = {
      stage_0: 'Stage 0',
      stage_i: 'Stage I',
      stage_ii: 'Stage II',
      stage_iii: 'Stage III',
      stage_iv: 'Stage IV',
      unknown: 'Unknown'
    };
    return map[stageValue] || stageValue;
  }

  // ---------------------------
  // Interface implementations
  // ---------------------------

  // getDashboardOverview()
  getDashboardOverview() {
    const projects = this._getFromStorage('projects');
    const slides = this._getFromStorage('slides');
    const algoResults = this._getFromStorage('slidealgorithmresults');

    const recentProjects = projects
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      })
      .slice(0, 5);

    const recentSlidesRaw = slides
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      })
      .slice(0, 5);

    const recentSlides = recentSlidesRaw.map(s => this._hydrateSlide(s));

    const alerts = [];
    const excludedCount = slides.filter(s => s.qcStatus === 'excluded').length;
    if (excludedCount > 0) {
      alerts.push({
        id: this._generateId('alert'),
        type: 'qc_excluded_slides',
        message: excludedCount + ' slide(s) are excluded from analysis based on QC.',
        createdAt: this._nowIso()
      });
    }
    const completedCount = algoResults.filter(r => r.status === 'completed').length;
    if (completedCount > 0) {
      alerts.push({
        id: this._generateId('alert'),
        type: 'analysis_completed',
        message: 'Analysis completed for ' + completedCount + ' slide-algorithm run(s).',
        createdAt: this._nowIso()
      });
    }

    return {
      recentProjects: recentProjects,
      recentSlides: recentSlides,
      alerts: alerts
    };
  }

  // getProjectsList(filters, page, pageSize, sort)
  getProjectsList(filters, page, pageSize, sort) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 25;
    sort = sort || { field: 'name', direction: 'asc' };

    const projects = this._getFromStorage('projects');
    let items = projects.slice();

    if (filters.nameSearch) {
      const q = filters.nameSearch.toLowerCase();
      items = items.filter(p => (p.name || '').toLowerCase().includes(q));
    }
    if (filters.type) {
      items = items.filter(p => p.type === filters.type);
    }
    if (filters.organFocus) {
      items = items.filter(p => p.organFocus === filters.organFocus);
    }
    if (filters.createdFrom) {
      const from = this._parseDate(filters.createdFrom);
      if (from) {
        items = items.filter(p => {
          const d = this._parseDate(p.createdAt);
          return d && d >= from;
        });
      }
    }
    if (filters.createdTo) {
      const to = this._parseDate(filters.createdTo);
      if (to) {
        items = items.filter(p => {
          const d = this._parseDate(p.createdAt);
          return d && d <= to;
        });
      }
    }

    const direction = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    const field = sort.field || 'name';
    items.sort((a, b) => {
      let va;
      let vb;
      if (field === 'created_at') {
        va = this._parseDate(a.createdAt) || new Date(0);
        vb = this._parseDate(b.createdAt) || new Date(0);
      } else {
        va = (a[field] || '').toString().toLowerCase();
        vb = (b[field] || '').toString().toLowerCase();
      }
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = items.slice(start, end);

    return { items: paged, totalCount: totalCount };
  }

  // createProject(name, type, organFocus, description)
  createProject(name, type, organFocus, description) {
    const projects = this._getFromStorage('projects');
    const newProject = {
      id: this._generateId('project'),
      name: name,
      type: type,
      organFocus: organFocus || null,
      description: description || null,
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };
    projects.push(newProject);
    this._saveToStorage('projects', projects);
    return {
      success: true,
      project: newProject,
      message: 'Project created'
    };
  }

  // getProjectDetail(projectId)
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects');
    const project = this._findById(projects, projectId);
    if (!project) {
      return {
        project: null,
        slideCount: 0,
        lastUpdatedAt: null,
        overviewStats: {
          totalSlides: 0,
          highPrioritySlides: 0,
          completedAnalyses: 0
        }
      };
    }
    const projectSlides = this._getFromStorage('projectslides').filter(ps => ps.projectId === projectId);
    const slideIds = projectSlides.map(ps => ps.slideId);
    const algoResults = this._getFromStorage('slidealgorithmresults').filter(r => slideIds.includes(r.slideId) && r.status === 'completed');

    const highPrioritySlides = projectSlides.filter(ps => ps.priority === 'high').length;

    return {
      project: project,
      slideCount: projectSlides.length,
      lastUpdatedAt: project.updatedAt || project.createdAt || null,
      overviewStats: {
        totalSlides: projectSlides.length,
        highPrioritySlides: highPrioritySlides,
        completedAnalyses: algoResults.length
      }
    };
  }

  // getProjectSlides(projectId, filters, page, pageSize, sort)
  getProjectSlides(projectId, filters, page, pageSize, sort) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 50;
    sort = sort || { field: 'case_identifier', direction: 'asc' };

    const projectSlides = this._getFromStorage('projectslides').filter(ps => ps.projectId === projectId);
    const slides = this._getFromStorage('slides');
    const cases = this._getFromStorage('cases');

    let items = projectSlides.map(ps => {
      const slide = this._findById(slides, ps.slideId);
      const caseObj = slide && slide.caseId ? this._findById(cases, slide.caseId) : null;
      return {
        slide: slide ? this._hydrateSlide(slide) : null,
        caseIdentifier: caseObj ? caseObj.caseIdentifier : null,
        projectSlideId: ps.id,
        priority: ps.priority,
        projectSlide: ps
      };
    });

    if (filters.priority) {
      items = items.filter(i => i.priority === filters.priority);
    }
    if (filters.organ) {
      items = items.filter(i => i.slide && i.slide.organ === filters.organ);
    }
    if (filters.stain) {
      items = items.filter(i => i.slide && i.slide.stain === filters.stain);
    }

    const direction = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    const field = sort.field || 'case_identifier';
    items.sort((a, b) => {
      let va;
      let vb;
      if (field === 'case_identifier') {
        va = (a.caseIdentifier || '').toLowerCase();
        vb = (b.caseIdentifier || '').toLowerCase();
      } else if (field === 'scan_date') {
        const da = this._parseDate(a.slide && a.slide.scanDate);
        const db = this._parseDate(b.slide && b.slide.scanDate);
        va = da || new Date(0);
        vb = db || new Date(0);
      } else if (field === 'priority') {
        va = a.priority || 'none';
        vb = b.priority || 'none';
      } else {
        va = (a[field] || '').toString().toLowerCase();
        vb = (b[field] || '').toString().toLowerCase();
      }
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = items.slice(start, end);

    return { items: paged, totalCount: totalCount };
  }

  // updateProjectSlidePriority(projectId, updates)
  updateProjectSlidePriority(projectId, updates) {
    updates = updates || [];
    const projectSlides = this._getFromStorage('projectslides');
    const updated = [];

    for (const upd of updates) {
      const ps = projectSlides.find(p => p.projectId === projectId && p.slideId === upd.slideId);
      if (ps) {
        ps.priority = upd.priority;
        updated.push({ slideId: ps.slideId, priority: ps.priority });
      }
    }
    this._saveToStorage('projectslides', projectSlides);

    const slides = this._getFromStorage('slides');
    const hydratedUpdated = updated.map(u => {
      const slide = this._findById(slides, u.slideId);
      return Object.assign({}, u, { slide: slide ? this._hydrateSlide(slide) : null });
    });

    return {
      success: true,
      updated: hydratedUpdated,
      message: 'Priorities updated'
    };
  }

  // addSlidesToProject(projectId, slideIds)
  addSlidesToProject(projectId, slideIds) {
    slideIds = slideIds || [];
    const projects = this._getFromStorage('projects');
    const project = this._findById(projects, projectId);
    if (!project) {
      return { success: false, addedCount: 0, alreadyInProjectCount: 0, project: null };
    }
    const projectSlides = this._getFromStorage('projectslides');
    let addedCount = 0;
    let alreadyInProjectCount = 0;

    for (const slideId of slideIds) {
      const exists = projectSlides.some(ps => ps.projectId === projectId && ps.slideId === slideId);
      if (exists) {
        alreadyInProjectCount++;
      } else {
        projectSlides.push({
          id: this._generateId('projectslide'),
          projectId: projectId,
          slideId: slideId,
          priority: 'none',
          addedAt: this._nowIso()
        });
        addedCount++;
      }
    }
    this._saveToStorage('projectslides', projectSlides);
    return { success: true, addedCount: addedCount, alreadyInProjectCount: alreadyInProjectCount, project: project };
  }

  // removeSlidesFromProject(projectId, slideIds)
  removeSlidesFromProject(projectId, slideIds) {
    slideIds = slideIds || [];
    const projectSlides = this._getFromStorage('projectslides');
    const before = projectSlides.length;
    const remaining = projectSlides.filter(ps => !(ps.projectId === projectId && slideIds.includes(ps.slideId)));
    const removedCount = before - remaining.length;
    this._saveToStorage('projectslides', remaining);
    return { success: true, removedCount: removedCount, message: 'Slides removed from project' };
  }

  // Internal shared metrics row builder
  _buildProjectMetricsRows(projectId, filters) {
    filters = filters || {};
    const projectSlides = this._getFromStorage('projectslides').filter(ps => ps.projectId === projectId);
    const slideIds = projectSlides.map(ps => ps.slideId);
    const slides = this._getFromStorage('slides');
    const cases = this._getFromStorage('cases');
    const algorithms = this._getFromStorage('algorithms');
    const algoResults = this._getFromStorage('slidealgorithmresults');

    let results = algoResults.filter(r => slideIds.includes(r.slideId) && r.status === 'completed');
    if (filters.algorithmId) {
      results = results.filter(r => r.algorithmId === filters.algorithmId);
    }

    const rows = [];
    for (const r of results) {
      const slide = this._findById(slides, r.slideId);
      if (!slide) continue;
      if (filters.organ && slide.organ !== filters.organ) continue;
      if (filters.stain && slide.stain !== filters.stain) continue;
      const caseObj = slide.caseId ? this._findById(cases, slide.caseId) : null;
      const algorithm = this._findById(algorithms, r.algorithmId);
      rows.push({
        slideId: slide.id,
        caseIdentifier: caseObj ? caseObj.caseIdentifier : null,
        algorithmName: algorithm ? algorithm.name : null,
        tumorAreaMm2: r.tumorAreaMm2 != null ? r.tumorAreaMm2 : null,
        nucleiCount: r.nucleiCount != null ? r.nucleiCount : null,
        pdL1Percentage: r.pdL1Percentage != null ? r.pdL1Percentage : slide.pdL1Percentage || null,
        slide: this._hydrateSlide(slide)
      });
    }
    return rows;
  }

  // getProjectMetricsTable(projectId, filters, page, pageSize, sort)
  getProjectMetricsTable(projectId, filters, page, pageSize, sort) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 50;
    sort = sort || { field: 'case_id', direction: 'asc' };

    let rows = this._buildProjectMetricsRows(projectId, filters);

    const direction = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    const field = sort.field || 'case_id';

    rows.sort((a, b) => {
      let va;
      let vb;
      if (field === 'case_id') {
        va = (a.caseIdentifier || '').toLowerCase();
        vb = (b.caseIdentifier || '').toLowerCase();
      } else if (field === 'tumor_area_mm2') {
        va = a.tumorAreaMm2 != null ? a.tumorAreaMm2 : -Infinity;
        vb = b.tumorAreaMm2 != null ? b.tumorAreaMm2 : -Infinity;
      } else if (field === 'nuclei_count') {
        va = a.nucleiCount != null ? a.nucleiCount : -Infinity;
        vb = b.nucleiCount != null ? b.nucleiCount : -Infinity;
      } else if (field === 'pd_l1_percentage') {
        va = a.pdL1Percentage != null ? a.pdL1Percentage : -Infinity;
        vb = b.pdL1Percentage != null ? b.pdL1Percentage : -Infinity;
      } else {
        va = (a[field] || '').toString().toLowerCase();
        vb = (b[field] || '').toString().toLowerCase();
      }
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });

    const totalCount = rows.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = rows.slice(start, end);

    return { items: paged, totalCount: totalCount };
  }

  // exportProjectMetricsCsv(projectId, filters, columns, filename)
  exportProjectMetricsCsv(projectId, filters, columns, filename) {
    filters = filters || {};
    columns = columns || [];
    const rows = this._buildProjectMetricsRows(projectId, filters);

    const colMap = {
      case_id: 'caseIdentifier',
      tumor_area_mm2: 'tumorAreaMm2',
      nuclei_count: 'nucleiCount',
      pd_l1_percentage: 'pdL1Percentage'
    };

    const header = columns.join(',');
    const lines = [header];

    for (const row of rows) {
      const values = columns.map(colKey => {
        const prop = colMap[colKey];
        const v = prop ? row[prop] : null;
        if (v === null || v === undefined) return '';
        if (typeof v === 'number') return String(v);
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      });
      lines.push(values.join(','));
    }

    const csv = lines.join('\n');
    const effectiveFilename = filename || 'project_metrics.csv';
    const fileRecord = this._createExportFile(effectiveFilename, csv, rows.length);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_lastExportParams',
        JSON.stringify({
          projectId: projectId,
          filters: filters || {},
          columns: columns || [],
          fileId: fileRecord.id,
          filename: fileRecord.filename
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      fileId: fileRecord.id,
      filename: fileRecord.filename,
      rowCount: fileRecord.rowCount
    };
  }

  // getProjectAlgorithms(projectId)
  getProjectAlgorithms(projectId) {
    const pacs = this._getFromStorage('projectalgorithmconfigs').filter(p => p.projectId === projectId);
    const algorithms = this._getFromStorage('algorithms');
    const configs = this._getFromStorage('algorithmconfigurations');

    const algoIds = Array.from(new Set(pacs.map(p => p.algorithmId)));
    const items = [];

    for (const algoId of algoIds) {
      const algorithm = this._findById(algorithms, algoId);
      if (!algorithm) continue;
      const algoConfigs = configs.filter(c => c.algorithmId === algoId);
      const activePac = pacs.find(p => p.algorithmId === algoId && p.isActive);
      const activeConfig = activePac ? this._findById(configs, activePac.configurationId) : null;
      const hydratedConfigs = algoConfigs.map(c => Object.assign({}, c, { algorithm: algorithm }));
      const hydratedActiveConfig = activeConfig ? Object.assign({}, activeConfig, { algorithm: algorithm }) : null;
      items.push({
        algorithm: algorithm,
        activeConfiguration: hydratedActiveConfig,
        allConfigurations: hydratedConfigs
      });
    }

    return { items: items };
  }

  // setProjectAlgorithmActiveConfiguration(projectId, algorithmId, configurationId)
  setProjectAlgorithmActiveConfiguration(projectId, algorithmId, configurationId) {
    const pacs = this._getFromStorage('projectalgorithmconfigs');
    const configs = this._getFromStorage('algorithmconfigurations');
    const config = this._findById(configs, configurationId);
    if (!config) {
      return { success: false, projectAlgorithmConfig: null };
    }

    let pac = pacs.find(p => p.projectId === projectId && p.algorithmId === algorithmId && p.configurationId === configurationId);
    if (!pac) {
      pac = {
        id: this._generateId('projectalgoconfig'),
        projectId: projectId,
        algorithmId: algorithmId,
        configurationId: configurationId,
        isActive: true,
        assignedAt: this._nowIso()
      };
      pacs.push(pac);
    }

    // Deactivate other configs for same project & algorithm
    for (const p of pacs) {
      if (p.projectId === projectId && p.algorithmId === algorithmId) {
        p.isActive = (p.id === pac.id);
      }
    }
    this._saveToStorage('projectalgorithmconfigs', pacs);

    return {
      success: true,
      projectAlgorithmConfig: this._hydrateProjectAlgorithmConfig(pac)
    };
  }

  // getSlideFilterOptions()
  getSlideFilterOptions() {
    const slides = this._getFromStorage('slides');
    const organsSet = new Set();
    const stainsSet = new Set();
    const diagnosesSet = new Set();
    const diseasesSet = new Set();

    let minDate = null;
    let maxDate = null;

    for (const s of slides) {
      if (s.organ) organsSet.add(s.organ);
      if (s.stain) stainsSet.add(s.stain);
      if (s.diagnosis) diagnosesSet.add(s.diagnosis);
      if (s.disease) diseasesSet.add(s.disease);
      const d = this._parseDate(s.scanDate);
      if (d) {
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    }

    const organs = Array.from(organsSet).map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }));
    const stains = Array.from(stainsSet);
    const diagnoses = Array.from(diagnosesSet);
    const diseases = Array.from(diseasesSet);

    return {
      organs: organs,
      stains: stains,
      diagnoses: diagnoses,
      diseases: diseases,
      defaultScanDateRange: {
        from: minDate ? minDate.toISOString() : null,
        to: maxDate ? maxDate.toISOString() : null
      }
    };
  }

  // searchSlides(filters, page, pageSize, sort)
  searchSlides(filters, page, pageSize, sort) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 50;
    sort = sort || { field: 'scan_date', direction: 'desc' };

    const slides = this._getFromStorage('slides');
    const cases = this._getFromStorage('cases');

    let items = slides.slice();

    if (filters.organ) items = items.filter(s => s.organ === filters.organ);
    if (filters.stain) items = items.filter(s => s.stain === filters.stain);
    if (filters.diagnosis) items = items.filter(s => s.diagnosis === filters.diagnosis);
    if (filters.disease) items = items.filter(s => s.disease === filters.disease);
    if (filters.studyId) items = items.filter(s => s.studyId === filters.studyId);

    if (filters.scanDateFrom) {
      const from = this._parseDate(filters.scanDateFrom);
      if (from) items = items.filter(s => {
        const d = this._parseDate(s.scanDate);
        return d && d >= from;
      });
    }
    if (filters.scanDateTo) {
      const to = this._parseDate(filters.scanDateTo);
      if (to) items = items.filter(s => {
        const d = this._parseDate(s.scanDate);
        return d && d <= to;
      });
    }

    if (filters.stage) {
      items = items.filter(s => {
        const caseObj = s.caseId ? this._findById(cases, s.caseId) : null;
        return caseObj && caseObj.stage === filters.stage;
      });
    }

    const direction = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    const field = sort.field || 'scan_date';

    items.sort((a, b) => {
      const caseA = a.caseId ? this._findById(cases, a.caseId) : null;
      const caseB = b.caseId ? this._findById(cases, b.caseId) : null;
      let va;
      let vb;
      if (field === 'case_id') {
        va = (caseA && caseA.caseIdentifier || '').toLowerCase();
        vb = (caseB && caseB.caseIdentifier || '').toLowerCase();
      } else if (field === 'scan_date') {
        const da = this._parseDate(a.scanDate) || new Date(0);
        const db = this._parseDate(b.scanDate) || new Date(0);
        va = da;
        vb = db;
      } else if (field === 'pd_l1_percentage') {
        va = a.pdL1Percentage != null ? a.pdL1Percentage : -Infinity;
        vb = b.pdL1Percentage != null ? b.pdL1Percentage : -Infinity;
      } else {
        va = (a[field] || '').toString().toLowerCase();
        vb = (b[field] || '').toString().toLowerCase();
      }
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end).map(s => {
      const caseObj = s.caseId ? this._findById(cases, s.caseId) : null;
      return {
        slideId: s.id,
        label: s.label,
        thumbnailUrl: s.thumbnailUrl || null,
        caseIdentifier: caseObj ? caseObj.caseIdentifier : null,
        organ: s.organ,
        disease: s.disease || null,
        diagnosis: s.diagnosis || null,
        stain: s.stain,
        scanDate: s.scanDate,
        pdL1Percentage: s.pdL1Percentage != null ? s.pdL1Percentage : null,
        focusScore: s.focusScore != null ? s.focusScore : null,
        qcStatus: s.qcStatus,
        defaultTumorAreaMm2: s.defaultTumorAreaMm2 != null ? s.defaultTumorAreaMm2 : null,
        slide: this._hydrateSlide(s)
      };
    });

    return { items: pageItems, totalCount: totalCount };
  }

  // getSlideViewerContext(slideId)
  getSlideViewerContext(slideId) {
    const slides = this._getFromStorage('slides');
    const cases = this._getFromStorage('cases');
    const algorithms = this._getFromStorage('algorithms');
    const results = this._getFromStorage('slidealgorithmresults');
    const annotations = this._getFromStorage('annotations');
    const presets = this._getFromStorage('visualizationpresets');

    const slide = this._findById(slides, slideId);
    const caseObj = slide && slide.caseId ? this._findById(cases, slide.caseId) : null;

    const slideResults = results.filter(r => r.slideId === slideId).map(r => this._hydrateAlgorithmResult(r));
    const slideAnnotations = annotations.filter(a => a.slideId === slideId).map(a => this._hydrateAnnotation(a));
    const hydratedPresets = presets.map(p => this._hydrateVisualizationPreset(p));

    return {
      slide: slide ? this._hydrateSlide(slide) : null,
      case: caseObj || null,
      availableAlgorithms: algorithms,
      algorithmResults: slideResults,
      annotations: slideAnnotations,
      visualizationPresets: hydratedPresets
    };
  }

  // runAlgorithmOnSlide(slideId, algorithmId, configurationId)
  runAlgorithmOnSlide(slideId, algorithmId, configurationId) {
    const result = this._startAlgorithmRunJob(slideId, algorithmId, configurationId);
    return {
      result: this._hydrateAlgorithmResult(result),
      message: 'Algorithm run completed (simulated).'
    };
  }

  // getSlideAlgorithmResults(slideId, algorithmId)
  getSlideAlgorithmResults(slideId, algorithmId) {
    const results = this._getFromStorage('slidealgorithmresults');
    const filtered = results.filter(r => r.slideId === slideId && (!algorithmId || r.algorithmId === algorithmId));
    return filtered.map(r => this._hydrateAlgorithmResult(r));
  }

  // setDefaultAlgorithmResultForSlide(slideAlgorithmResultId)
  setDefaultAlgorithmResultForSlide(slideAlgorithmResultId) {
    const updated = this._updateDefaultAlgorithmFlags(slideAlgorithmResultId);
    if (!updated) {
      return { success: false, updatedDefaultResult: null, message: 'Result not found' };
    }
    return {
      success: true,
      updatedDefaultResult: this._hydrateAlgorithmResult(updated),
      message: 'Default algorithm result updated'
    };
  }

  // createVisualizationPreset(algorithmId, name, maxDensityCellsPerMm2, settings)
  createVisualizationPreset(algorithmId, name, maxDensityCellsPerMm2, settings) {
    const presets = this._getFromStorage('visualizationpresets');
    const preset = {
      id: this._generateId('vizpreset'),
      name: name,
      algorithmId: algorithmId,
      maxDensityCellsPerMm2: maxDensityCellsPerMm2 != null ? maxDensityCellsPerMm2 : null,
      settingsJson: settings ? JSON.stringify(settings) : null,
      createdAt: this._nowIso()
    };
    presets.push(preset);
    this._saveToStorage('visualizationpresets', presets);
    return {
      preset: this._hydrateVisualizationPreset(preset),
      success: true
    };
  }

  // getVisualizationPresetsForAlgorithm(algorithmId)
  getVisualizationPresetsForAlgorithm(algorithmId) {
    const presets = this._getFromStorage('visualizationpresets').filter(p => p.algorithmId === algorithmId);
    return presets.map(p => this._hydrateVisualizationPreset(p));
  }

  // createPolygonAnnotation(slideId, name, category, coordinates)
  createPolygonAnnotation(slideId, name, category, coordinates) {
    coordinates = coordinates || [];
    const slides = this._getFromStorage('slides');
    const slide = this._findById(slides, slideId);
    const annotations = this._getFromStorage('annotations');

    const area = this._computeAnnotationAreaMm2(slide, coordinates);
    const annotation = {
      id: this._generateId('annotation'),
      slideId: slideId,
      name: name,
      category: category,
      annotationType: 'polygon',
      coordinates: coordinates.map(c => ({ x: c.x, y: c.y })),
      areaMm2: area,
      createdAt: this._nowIso()
    };
    annotations.push(annotation);
    this._saveToStorage('annotations', annotations);
    return {
      annotation: this._hydrateAnnotation(annotation),
      success: true,
      message: 'Annotation created'
    };
  }

  // updateAnnotationProperties(annotationId, name, category)
  updateAnnotationProperties(annotationId, name, category) {
    const annotations = this._getFromStorage('annotations');
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation) {
      return { annotation: null, success: false };
    }
    if (typeof name === 'string') annotation.name = name;
    if (typeof category === 'string') annotation.category = category;
    this._saveToStorage('annotations', annotations);
    return { annotation: this._hydrateAnnotation(annotation), success: true };
  }

  // listAnnotationsForSlide(slideId)
  listAnnotationsForSlide(slideId) {
    const annotations = this._getFromStorage('annotations').filter(a => a.slideId === slideId);
    return annotations.map(a => this._hydrateAnnotation(a));
  }

  // deleteAnnotation(annotationId)
  deleteAnnotation(annotationId) {
    const annotations = this._getFromStorage('annotations');
    const remaining = annotations.filter(a => a.id !== annotationId);
    this._saveToStorage('annotations', remaining);
    return { success: true };
  }

  // getBiomarkerFilterOptions()
  getBiomarkerFilterOptions() {
    const slides = this._getFromStorage('slides');
    const diseasesSet = new Set();
    const stainsSet = new Set();
    for (const s of slides) {
      if (s.disease) diseasesSet.add(s.disease);
      if (s.stain) stainsSet.add(s.stain);
    }
    return {
      diseases: Array.from(diseasesSet),
      stains: Array.from(stainsSet),
      biomarkers: ['pd_l1']
    };
  }

  // searchBiomarkerSlides(filters, page, pageSize, sort)
  searchBiomarkerSlides(filters, page, pageSize, sort) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 50;
    sort = sort || { field: 'pd_l1_percentage', direction: 'desc' };

    const slides = this._getFromStorage('slides');
    const cases = this._getFromStorage('cases');

    let items = slides.slice();

    if (filters.disease) items = items.filter(s => s.disease === filters.disease);
    if (filters.stain) items = items.filter(s => s.stain === filters.stain);

    if (filters.biomarker === 'pd_l1') {
      if (filters.minPercentage != null) {
        items = items.filter(s => s.pdL1Percentage != null && s.pdL1Percentage >= filters.minPercentage);
      }
      if (filters.maxPercentage != null) {
        items = items.filter(s => s.pdL1Percentage != null && s.pdL1Percentage <= filters.maxPercentage);
      }
    }

    const direction = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    const field = sort.field || 'pd_l1_percentage';

    items.sort((a, b) => {
      const caseA = a.caseId ? this._findById(cases, a.caseId) : null;
      const caseB = b.caseId ? this._findById(cases, b.caseId) : null;
      let va;
      let vb;
      if (field === 'pd_l1_percentage') {
        va = a.pdL1Percentage != null ? a.pdL1Percentage : -Infinity;
        vb = b.pdL1Percentage != null ? b.pdL1Percentage : -Infinity;
      } else if (field === 'case_id') {
        va = (caseA && caseA.caseIdentifier || '').toLowerCase();
        vb = (caseB && caseB.caseIdentifier || '').toLowerCase();
      } else {
        va = (a[field] || '').toString().toLowerCase();
        vb = (b[field] || '').toString().toLowerCase();
      }
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end).map(s => {
      const caseObj = s.caseId ? this._findById(cases, s.caseId) : null;
      return {
        slideId: s.id,
        caseIdentifier: caseObj ? caseObj.caseIdentifier : null,
        organ: s.organ,
        disease: s.disease || null,
        diagnosis: s.diagnosis || null,
        stain: s.stain,
        pdL1Percentage: s.pdL1Percentage != null ? s.pdL1Percentage : null,
        thumbnailUrl: s.thumbnailUrl || null,
        slide: this._hydrateSlide(s)
      };
    });

    return { items: pageItems, totalCount: totalCount };
  }

  // createCollectionFromSlides(name, source, slideIds)
  createCollectionFromSlides(name, source, slideIds) {
    slideIds = slideIds || [];
    const collections = this._getFromStorage('collections');
    const collectionSlides = this._getFromStorage('collectionslides');

    const collection = {
      id: this._generateId('collection'),
      name: name,
      source: source,
      description: null,
      createdAt: this._nowIso()
    };
    collections.push(collection);

    let addedCount = 0;
    for (const slideId of slideIds) {
      const exists = collectionSlides.some(cs => cs.collectionId === collection.id && cs.slideId === slideId);
      if (!exists) {
        collectionSlides.push({
          id: this._generateId('collectionslide'),
          collectionId: collection.id,
          slideId: slideId,
          addedAt: this._nowIso()
        });
        addedCount++;
      }
    }

    this._saveToStorage('collections', collections);
    this._saveToStorage('collectionslides', collectionSlides);

    return { collection: collection, addedCount: addedCount, success: true };
  }

  // addSlidesToCollection(collectionId, slideIds)
  addSlidesToCollection(collectionId, slideIds) {
    slideIds = slideIds || [];
    const collections = this._getFromStorage('collections');
    const collection = this._findById(collections, collectionId);
    if (!collection) return { collection: null, addedCount: 0, success: false };

    const collectionSlides = this._getFromStorage('collectionslides');
    let addedCount = 0;
    for (const slideId of slideIds) {
      const exists = collectionSlides.some(cs => cs.collectionId === collectionId && cs.slideId === slideId);
      if (!exists) {
        collectionSlides.push({
          id: this._generateId('collectionslide'),
          collectionId: collectionId,
          slideId: slideId,
          addedAt: this._nowIso()
        });
        addedCount++;
      }
    }
    this._saveToStorage('collectionslides', collectionSlides);
    return { collection: collection, addedCount: addedCount, success: true };
  }

  // getCollectionsList(searchName, page, pageSize)
  getCollectionsList(searchName, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 25;
    const collections = this._getFromStorage('collections');
    let items = collections.slice();
    if (searchName) {
      const q = searchName.toLowerCase();
      items = items.filter(c => (c.name || '').toLowerCase().includes(q));
    }
    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = items.slice(start, end);
    return { items: paged, totalCount: totalCount };
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = this._findById(collections, collectionId);
    if (!collection) {
      return { collection: null, slides: [] };
    }
    const collectionSlides = this._getFromStorage('collectionslides').filter(cs => cs.collectionId === collectionId);
    const slides = this._getFromStorage('slides');
    const cases = this._getFromStorage('cases');

    const slideItems = collectionSlides.map(cs => {
      const slide = this._findById(slides, cs.slideId);
      const caseObj = slide && slide.caseId ? this._findById(cases, slide.caseId) : null;
      return {
        slide: slide ? this._hydrateSlide(slide) : null,
        caseIdentifier: caseObj ? caseObj.caseIdentifier : null
      };
    });

    return { collection: collection, slides: slideItems };
  }

  // renameCollection(collectionId, name)
  renameCollection(collectionId, name) {
    const collections = this._getFromStorage('collections');
    const collection = this._findById(collections, collectionId);
    if (!collection) return { collection: null, success: false };
    collection.name = name;
    this._saveToStorage('collections', collections);
    return { collection: collection, success: true };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionSlides = this._getFromStorage('collectionslides');

    const remainingCollections = collections.filter(c => c.id !== collectionId);
    const remainingSlides = collectionSlides.filter(cs => cs.collectionId !== collectionId);

    this._saveToStorage('collections', remainingCollections);
    this._saveToStorage('collectionslides', remainingSlides);

    return { success: true };
  }

  // removeSlidesFromCollection(collectionId, slideIds)
  removeSlidesFromCollection(collectionId, slideIds) {
    slideIds = slideIds || [];
    const collectionSlides = this._getFromStorage('collectionslides');
    const before = collectionSlides.length;
    const remaining = collectionSlides.filter(cs => !(cs.collectionId === collectionId && slideIds.includes(cs.slideId)));
    const removedCount = before - remaining.length;
    this._saveToStorage('collectionslides', remaining);
    return { removedCount: removedCount, success: true };
  }

  // reorderCollectionSlides(collectionId, orderedSlideIds)
  reorderCollectionSlides(collectionId, orderedSlideIds) {
    orderedSlideIds = orderedSlideIds || [];
    const collectionSlides = this._getFromStorage('collectionslides');
    const current = collectionSlides.filter(cs => cs.collectionId === collectionId);
    const others = collectionSlides.filter(cs => cs.collectionId !== collectionId);

    const mapBySlide = {};
    for (const cs of current) {
      mapBySlide[cs.slideId] = cs;
    }

    const reordered = [];
    for (const slideId of orderedSlideIds) {
      if (mapBySlide[slideId]) {
        reordered.push(mapBySlide[slideId]);
        delete mapBySlide[slideId];
      }
    }
    // append any not specified in orderedSlideIds at the end in their existing order
    for (const cs of current) {
      if (mapBySlide[cs.slideId]) {
        reordered.push(cs);
      }
    }

    const newAll = others.concat(reordered);
    this._saveToStorage('collectionslides', newAll);
    return { success: true };
  }

  // getCohortFilterOptions()
  getCohortFilterOptions() {
    const slides = this._getFromStorage('slides');
    const organsSet = new Set(['breast', 'colon', 'lung', 'other']);
    for (const s of slides) {
      if (s.organ) organsSet.add(s.organ);
    }
    const organs = Array.from(organsSet);

    const stages = [
      'stage_0',
      'stage_i',
      'stage_ii',
      'stage_iii',
      'stage_iv',
      'unknown'
    ].map(v => ({ value: v, label: this._stageLabel(v) }));

    const stainsSet = new Set();
    for (const s of slides) {
      if (s.stain) stainsSet.add(s.stain);
    }

    return {
      organs: organs,
      stages: stages,
      stains: Array.from(stainsSet)
    };
  }

  // generateCohortPreview(filters)
  generateCohortPreview(filters) {
    filters = filters || {};
    const slides = this._getFromStorage('slides');
    const cases = this._getFromStorage('cases');

    let candidates = slides.slice();

    if (filters.organFilter) candidates = candidates.filter(s => s.organ === filters.organFilter);

    if (filters.stainFilter) candidates = candidates.filter(s => s.stain === filters.stainFilter);

    if (filters.tumorAreaMinMm2 != null) {
      candidates = candidates.filter(s => s.defaultTumorAreaMm2 != null && s.defaultTumorAreaMm2 >= filters.tumorAreaMinMm2);
    }
    if (filters.tumorAreaMaxMm2 != null) {
      candidates = candidates.filter(s => s.defaultTumorAreaMm2 != null && s.defaultTumorAreaMm2 <= filters.tumorAreaMaxMm2);
    }

    if (filters.stageFilters && filters.stageFilters.length > 0) {
      candidates = candidates.filter(s => {
        const caseObj = s.caseId ? this._findById(cases, s.caseId) : null;
        return caseObj && filters.stageFilters.includes(caseObj.stage);
      });
    }

    const members = candidates.map(s => {
      const caseObj = s.caseId ? this._findById(cases, s.caseId) : null;
      return {
        slideId: s.id,
        caseIdentifier: caseObj ? caseObj.caseIdentifier : null,
        organ: s.organ,
        stage: caseObj ? caseObj.stage : null,
        stain: s.stain,
        defaultTumorAreaMm2: s.defaultTumorAreaMm2 != null ? s.defaultTumorAreaMm2 : null,
        excluded: false,
        exclusionReason: null,
        slide: this._hydrateSlide(s)
      };
    });

    const preview = this._getOrCreateCohortPreviewState(null, filters, members);

    return {
      previewId: preview.previewId,
      filtersApplied: preview.filtersApplied,
      members: preview.members,
      totalCount: preview.members.length
    };
  }

  // updateCohortPreviewExclusions(previewId, slideId, excluded, exclusionReason)
  updateCohortPreviewExclusions(previewId, slideId, excluded, exclusionReason) {
    const previews = this._getFromStorage('cohortPreviews');
    const preview = previews.find(p => p.previewId === previewId);
    if (!preview) {
      return { previewId: previewId, updatedMember: null, excludedCount: 0 };
    }
    let updatedMember = null;
    for (const m of preview.members) {
      if (m.slideId === slideId) {
        m.excluded = !!excluded;
        m.exclusionReason = exclusionReason || null;
        updatedMember = m;
        break;
      }
    }
    const excludedCount = preview.members.filter(m => m.excluded).length;
    this._saveToStorage('cohortPreviews', previews);

    return {
      previewId: previewId,
      updatedMember: updatedMember,
      excludedCount: excludedCount
    };
  }

  // saveCohortFromPreview(previewId, name, description)
  saveCohortFromPreview(previewId, name, description) {
    const previews = this._getFromStorage('cohortPreviews');
    const preview = previews.find(p => p.previewId === previewId);
    if (!preview) {
      return { cohort: null, memberCount: 0, success: false };
    }

    const cohorts = this._getFromStorage('cohorts');
    const cohortMembers = this._getFromStorage('cohortmembers');

    const filters = preview.filtersApplied || {};

    const cohort = {
      id: this._generateId('cohort'),
      name: name,
      description: description || null,
      organFilter: filters.organFilter || null,
      stageFilters: filters.stageFilters || [],
      tumorAreaMinMm2: filters.tumorAreaMinMm2 != null ? filters.tumorAreaMinMm2 : null,
      tumorAreaMaxMm2: filters.tumorAreaMaxMm2 != null ? filters.tumorAreaMaxMm2 : null,
      stainFilter: filters.stainFilter || null,
      filtersJson: JSON.stringify(filters),
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };
    cohorts.push(cohort);

    for (const m of preview.members) {
      cohortMembers.push({
        id: this._generateId('cohortmember'),
        cohortId: cohort.id,
        slideId: m.slideId,
        excluded: !!m.excluded,
        exclusionReason: m.exclusionReason || null
      });
    }

    this._saveToStorage('cohorts', cohorts);
    this._saveToStorage('cohortmembers', cohortMembers);

    return { cohort: cohort, memberCount: preview.members.length, success: true };
  }

  // getCohortsList(filters, page, pageSize)
  getCohortsList(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 25;

    const cohorts = this._getFromStorage('cohorts');
    let items = cohorts.slice();

    if (filters.organFilter) items = items.filter(c => c.organFilter === filters.organFilter);
    if (filters.nameSearch) {
      const q = filters.nameSearch.toLowerCase();
      items = items.filter(c => (c.name || '').toLowerCase().includes(q));
    }

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = items.slice(start, end);

    return { items: paged, totalCount: totalCount };
  }

  // getCohortDetail(cohortId)
  getCohortDetail(cohortId) {
    const cohorts = this._getFromStorage('cohorts');
    const cohortMembers = this._getFromStorage('cohortmembers');
    const cohort = this._findById(cohorts, cohortId);
    if (!cohort) {
      return {
        cohort: null,
        definitionSummary: {
          organFilter: null,
          stageFilters: [],
          tumorAreaMinMm2: null,
          tumorAreaMaxMm2: null,
          stainFilter: null
        },
        members: []
      };
    }

    const membersRaw = cohortMembers.filter(cm => cm.cohortId === cohortId);
    const members = membersRaw.map(cm => this._hydrateCohortMember(cm));

    const definitionSummary = {
      organFilter: cohort.organFilter || null,
      stageFilters: cohort.stageFilters || [],
      tumorAreaMinMm2: cohort.tumorAreaMinMm2 != null ? cohort.tumorAreaMinMm2 : null,
      tumorAreaMaxMm2: cohort.tumorAreaMaxMm2 != null ? cohort.tumorAreaMaxMm2 : null,
      stainFilter: cohort.stainFilter || null
    };

    return {
      cohort: cohort,
      definitionSummary: definitionSummary,
      members: members
    };
  }

  // updateCohortDefinition(cohortId, filters)
  updateCohortDefinition(cohortId, filters) {
    filters = filters || {};
    const cohorts = this._getFromStorage('cohorts');
    const cohort = this._findById(cohorts, cohortId);
    if (!cohort) {
      return { cohort: null, success: false };
    }
    if (filters.organFilter !== undefined) cohort.organFilter = filters.organFilter;
    if (filters.stageFilters !== undefined) cohort.stageFilters = filters.stageFilters;
    if (filters.tumorAreaMinMm2 !== undefined) cohort.tumorAreaMinMm2 = filters.tumorAreaMinMm2;
    if (filters.tumorAreaMaxMm2 !== undefined) cohort.tumorAreaMaxMm2 = filters.tumorAreaMaxMm2;
    if (filters.stainFilter !== undefined) cohort.stainFilter = filters.stainFilter;
    cohort.filtersJson = JSON.stringify(filters);
    cohort.updatedAt = this._nowIso();
    this._saveToStorage('cohorts', cohorts);
    return { cohort: cohort, success: true };
  }

  // refreshCohortMembers(cohortId)
  refreshCohortMembers(cohortId) {
    const cohorts = this._getFromStorage('cohorts');
    const cohortMembers = this._getFromStorage('cohortmembers');
    const cohort = this._findById(cohorts, cohortId);
    if (!cohort) {
      return { updatedMemberCount: 0, success: false };
    }

    const filters = {
      organFilter: cohort.organFilter,
      stageFilters: cohort.stageFilters || [],
      tumorAreaMinMm2: cohort.tumorAreaMinMm2,
      tumorAreaMaxMm2: cohort.tumorAreaMaxMm2,
      stainFilter: cohort.stainFilter
    };

    const slides = this._getFromStorage('slides');
    const cases = this._getFromStorage('cases');

    let candidates = slides.slice();
    if (filters.organFilter) candidates = candidates.filter(s => s.organ === filters.organFilter);
    if (filters.stainFilter) candidates = candidates.filter(s => s.stain === filters.stainFilter);
    if (filters.tumorAreaMinMm2 != null) candidates = candidates.filter(s => s.defaultTumorAreaMm2 != null && s.defaultTumorAreaMm2 >= filters.tumorAreaMinMm2);
    if (filters.tumorAreaMaxMm2 != null) candidates = candidates.filter(s => s.defaultTumorAreaMm2 != null && s.defaultTumorAreaMm2 <= filters.tumorAreaMaxMm2);
    if (filters.stageFilters && filters.stageFilters.length > 0) {
      candidates = candidates.filter(s => {
        const caseObj = s.caseId ? this._findById(cases, s.caseId) : null;
        return caseObj && filters.stageFilters.includes(caseObj.stage);
      });
    }

    const remainingMembers = cohortMembers.filter(cm => cm.cohortId !== cohortId);
    for (const s of candidates) {
      remainingMembers.push({
        id: this._generateId('cohortmember'),
        cohortId: cohortId,
        slideId: s.id,
        excluded: false,
        exclusionReason: null
      });
    }

    this._saveToStorage('cohortmembers', remainingMembers);
    return { updatedMemberCount: candidates.length, success: true };
  }

  // getAlgorithmFilterOptions()
  getAlgorithmFilterOptions() {
    const algorithmTypes = [
      { value: 'tumor_segmentation', label: 'Tumor segmentation' },
      { value: 'nuclei_detection', label: 'Nuclei detection' },
      { value: 'til_density_map', label: 'TIL density map' },
      { value: 'biomarker_quantification', label: 'Biomarker quantification' },
      { value: 'other', label: 'Other' }
    ];
    const organScopes = ['breast', 'colon', 'lung', 'other'];
    return { algorithmTypes: algorithmTypes, organScopes: organScopes };
  }

  // getAlgorithmsCatalog(filters, page, pageSize)
  getAlgorithmsCatalog(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 25;
    const algorithms = this._getFromStorage('algorithms');
    let items = algorithms.slice();
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      items = items.filter(a => (a.name || '').toLowerCase().includes(q));
    }
    if (filters.algorithmType) items = items.filter(a => a.algorithmType === filters.algorithmType);
    if (filters.organScope) items = items.filter(a => a.organScope === filters.organScope);

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = items.slice(start, end);

    return { items: paged, totalCount: totalCount };
  }

  // getAlgorithmDetail(algorithmId)
  getAlgorithmDetail(algorithmId) {
    const algorithms = this._getFromStorage('algorithms');
    const configs = this._getFromStorage('algorithmconfigurations');
    const algorithm = this._findById(algorithms, algorithmId);
    const algoConfigs = configs.filter(c => c.algorithmId === algorithmId);
    const defaultConfiguration = algoConfigs.find(c => c.isDefault) || null;
    const hydratedConfigs = algoConfigs.map(c => Object.assign({}, c, { algorithm: algorithm }));
    const hydratedDefault = defaultConfiguration ? Object.assign({}, defaultConfiguration, { algorithm: algorithm }) : null;
    return {
      algorithm: algorithm,
      defaultConfiguration: hydratedDefault,
      configurations: hydratedConfigs
    };
  }

  // createAlgorithmConfiguration(algorithmId, name, minNucleusSizeUm2, intensityThreshold, parametersJson)
  createAlgorithmConfiguration(algorithmId, name, minNucleusSizeUm2, intensityThreshold, parametersJson) {
    const configs = this._getFromStorage('algorithmconfigurations');
    const config = {
      id: this._generateId('algoconfig'),
      algorithmId: algorithmId,
      name: name,
      isDefault: false,
      minNucleusSizeUm2: minNucleusSizeUm2 != null ? minNucleusSizeUm2 : null,
      intensityThreshold: intensityThreshold != null ? intensityThreshold : null,
      parametersJson: parametersJson || null,
      createdAt: this._nowIso()
    };
    configs.push(config);
    this._saveToStorage('algorithmconfigurations', configs);

    const algorithms = this._getFromStorage('algorithms');
    const algorithm = this._findById(algorithms, algorithmId);

    return {
      configuration: Object.assign({}, config, { algorithm: algorithm || null }),
      success: true
    };
  }

  // updateAlgorithmConfiguration(configurationId, name, minNucleusSizeUm2, intensityThreshold, parametersJson)
  updateAlgorithmConfiguration(configurationId, name, minNucleusSizeUm2, intensityThreshold, parametersJson) {
    const configs = this._getFromStorage('algorithmconfigurations');
    const config = configs.find(c => c.id === configurationId);
    if (!config) {
      return { configuration: null, success: false };
    }
    if (name !== undefined) config.name = name;
    if (minNucleusSizeUm2 !== undefined) config.minNucleusSizeUm2 = minNucleusSizeUm2;
    if (intensityThreshold !== undefined) config.intensityThreshold = intensityThreshold;
    if (parametersJson !== undefined) config.parametersJson = parametersJson;
    this._saveToStorage('algorithmconfigurations', configs);

    const algorithms = this._getFromStorage('algorithms');
    const algorithm = this._findById(algorithms, config.algorithmId);

    return { configuration: Object.assign({}, config, { algorithm: algorithm || null }), success: true };
  }

  // assignAlgorithmConfigToProject(configurationId, projectId)
  assignAlgorithmConfigToProject(configurationId, projectId) {
    const configs = this._getFromStorage('algorithmconfigurations');
    const config = this._findById(configs, configurationId);
    if (!config) return { projectAlgorithmConfig: null, success: false };

    const pacs = this._getFromStorage('projectalgorithmconfigs');
    let pac = pacs.find(p => p.projectId === projectId && p.configurationId === configurationId);
    if (!pac) {
      pac = {
        id: this._generateId('projectalgoconfig'),
        projectId: projectId,
        algorithmId: config.algorithmId,
        configurationId: configurationId,
        isActive: true,
        assignedAt: this._nowIso()
      };
      pacs.push(pac);
    }

    // Deactivate others for same algorithm in this project
    for (const p of pacs) {
      if (p.projectId === projectId && p.algorithmId === config.algorithmId) {
        p.isActive = (p.id === pac.id);
      }
    }

    this._saveToStorage('projectalgorithmconfigs', pacs);

    return { projectAlgorithmConfig: this._hydrateProjectAlgorithmConfig(pac), success: true };
  }

  // getProjectsUsingAlgorithmConfiguration(configurationId)
  getProjectsUsingAlgorithmConfiguration(configurationId) {
    const pacs = this._getFromStorage('projectalgorithmconfigs').filter(p => p.configurationId === configurationId);
    const projects = this._getFromStorage('projects');
    const projectIds = Array.from(new Set(pacs.map(p => p.projectId)));
    return projects.filter(p => projectIds.includes(p.id));
  }

  // getQcFilterOptions()
  getQcFilterOptions() {
    const studies = this._getFromStorage('studies');
    const qcStatuses = [
      { value: 'not_reviewed', label: 'Not reviewed' },
      { value: 'included', label: 'Included' },
      { value: 'excluded', label: 'Excluded' }
    ];
    return { studies: studies, qcStatuses: qcStatuses };
  }

  // getQcSlidesForStudy(studyId, filters, sort, page, pageSize)
  getQcSlidesForStudy(studyId, filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || { field: 'focus_score', direction: 'asc' };
    page = page || 1;
    pageSize = pageSize || 50;

    const slides = this._getFromStorage('slides').filter(s => s.studyId === studyId);
    const cases = this._getFromStorage('cases');
    const studies = this._getFromStorage('studies');
    const study = this._findById(studies, studyId);

    let items = slides.slice();

    if (filters.qcStatus) items = items.filter(s => s.qcStatus === filters.qcStatus);
    if (filters.minFocusScore != null) items = items.filter(s => s.focusScore != null && s.focusScore >= filters.minFocusScore);
    if (filters.maxFocusScore != null) items = items.filter(s => s.focusScore != null && s.focusScore <= filters.maxFocusScore);

    const direction = (sort.direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    const field = sort.field || 'focus_score';

    items.sort((a, b) => {
      const caseA = a.caseId ? this._findById(cases, a.caseId) : null;
      const caseB = b.caseId ? this._findById(cases, b.caseId) : null;
      let va;
      let vb;
      if (field === 'focus_score') {
        va = a.focusScore != null ? a.focusScore : -Infinity;
        vb = b.focusScore != null ? b.focusScore : -Infinity;
      } else if (field === 'case_id') {
        va = (caseA && caseA.caseIdentifier || '').toLowerCase();
        vb = (caseB && caseB.caseIdentifier || '').toLowerCase();
      } else {
        va = (a[field] || '').toString().toLowerCase();
        vb = (b[field] || '').toString().toLowerCase();
      }
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pageItems = items.slice(start, end).map(s => {
      const caseObj = s.caseId ? this._findById(cases, s.caseId) : null;
      return {
        slideId: s.id,
        label: s.label,
        caseIdentifier: caseObj ? caseObj.caseIdentifier : null,
        focusScore: s.focusScore != null ? s.focusScore : null,
        qcStatus: s.qcStatus,
        studyName: study ? study.name : null,
        organ: s.organ,
        stain: s.stain,
        slide: this._hydrateSlide(s)
      };
    });

    return { items: pageItems, totalCount: totalCount };
  }

  // bulkUpdateQcStatus(slideIds, qcStatus)
  bulkUpdateQcStatus(slideIds, qcStatus) {
    slideIds = slideIds || [];
    const slides = this._getFromStorage('slides');
    let updatedCount = 0;
    for (const s of slides) {
      if (slideIds.includes(s.id)) {
        s.qcStatus = qcStatus;
        updatedCount++;
      }
    }
    this._saveToStorage('slides', slides);
    return { updatedCount: updatedCount, newStatus: qcStatus, success: true };
  }

  // getAboutContent()
  getAboutContent() {
    return {
      sections: [
        {
          id: 'overview',
          title: 'Digital pathology image analysis platform',
          body: 'This platform manages projects, cohorts, QC, and algorithmic analysis for whole-slide images using localStorage-backed persistence.'
        },
        {
          id: 'data_handling',
          title: 'Data handling',
          body: 'All business state is stored as JSON-serializable records in localStorage or an in-memory polyfill. No image binaries are stored by this logic layer.'
        }
      ],
      versionInfo: '1.0.0'
    };
  }

  // getHelpTopics()
  getHelpTopics() {
    return {
      topics: [
        { id: 'projects_overview', title: 'Working with projects', category: 'projects' },
        { id: 'slide_viewer_usage', title: 'Using the slide viewer', category: 'slide_viewer' },
        { id: 'qc_dashboard', title: 'Quality control dashboard', category: 'qc' },
        { id: 'cohorts_guide', title: 'Building cohorts', category: 'cohorts' },
        { id: 'exports_metrics', title: 'Exporting metrics', category: 'exports' }
      ]
    };
  }

  // getHelpArticle(articleId)
  getHelpArticle(articleId) {
    const articles = {
      projects_overview: {
        id: 'projects_overview',
        title: 'Working with projects',
        body: 'Projects group slides, algorithms, and metrics. Use the Projects section to create and manage them.',
        relatedTopicIds: []
      },
      slide_viewer_usage: {
        id: 'slide_viewer_usage',
        title: 'Using the slide viewer',
        body: 'The slide viewer lets you run algorithms, inspect results, and create annotations.',
        relatedTopicIds: []
      },
      qc_dashboard: {
        id: 'qc_dashboard',
        title: 'Quality control dashboard',
        body: 'Use the QC dashboard to inspect focus scores and exclude low-quality slides.',
        relatedTopicIds: []
      },
      cohorts_guide: {
        id: 'cohorts_guide',
        title: 'Building cohorts',
        body: 'Cohorts are defined by organ, stage, stain, and tumor area filters.',
        relatedTopicIds: []
      },
      exports_metrics: {
        id: 'exports_metrics',
        title: 'Exporting metrics',
        body: 'Use the Metrics tab in a project to export selected metrics as CSV.',
        relatedTopicIds: []
      }
    };
    return articles[articleId] || {
      id: articleId,
      title: 'Help',
      body: 'No content available for this article.',
      relatedTopicIds: []
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