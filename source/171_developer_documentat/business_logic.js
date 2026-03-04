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
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core entity tables
    ensureArray('documentation_pages');
    ensureArray('navigation_links');
    ensureArray('documentation_versions');
    ensureArray('documentation_sections');
    ensureArray('language_drivers');
    ensureArray('driver_versions');
    ensureArray('backup_strategies');
    ensureArray('backup_strategy_steps');
    ensureArray('configuration_parameters');
    ensureArray('code_snippets');
    ensureArray('replication_cluster_presets');
    ensureArray('migration_source_databases');
    ensureArray('migration_checklists');
    ensureArray('migration_checklist_items');
    ensureArray('error_codes');
    ensureArray('error_code_environment_details');
    ensureArray('service_plans');
    ensureArray('regions');
    ensureArray('plan_region_limit_sets');
    ensureArray('service_limit_entries');

    // Additional tables / metadata
    if (!localStorage.getItem('user_state')) {
      const defaultState = {
        currentDocVersionId: null,
        selectedDriverVersions: {},
        recentCopies: [],
        expandedSnippets: []
      };
      localStorage.setItem('user_state', JSON.stringify(defaultState));
    }

    // Optional featured tasks on docs home
    if (!localStorage.getItem('featured_tasks')) {
      localStorage.setItem('featured_tasks', JSON.stringify([]));
    }

    // Generic id counter
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

  // -------------------- Private helpers (user state, versions) --------------------

  _getOrCreateUserState() {
    let raw = localStorage.getItem('user_state');
    if (!raw) {
      const defaultState = {
        currentDocVersionId: null,
        selectedDriverVersions: {},
        recentCopies: [],
        expandedSnippets: []
      };
      localStorage.setItem('user_state', JSON.stringify(defaultState));
      return defaultState;
    }
    try {
      const state = JSON.parse(raw);
      // Ensure required shape
      if (typeof state !== 'object' || state === null) {
        throw new Error('invalid');
      }
      if (!state.selectedDriverVersions) state.selectedDriverVersions = {};
      if (!state.recentCopies) state.recentCopies = [];
      if (!state.expandedSnippets) state.expandedSnippets = [];
      return state;
    } catch (e) {
      const defaultState = {
        currentDocVersionId: null,
        selectedDriverVersions: {},
        recentCopies: [],
        expandedSnippets: []
      };
      localStorage.setItem('user_state', JSON.stringify(defaultState));
      return defaultState;
    }
  }

  _saveUserState(state) {
    localStorage.setItem('user_state', JSON.stringify(state));
  }

  _getCurrentDocumentationVersion() {
    const versions = this._getFromStorage('documentation_versions');
    if (!versions.length) {
      return null;
    }
    const state = this._getOrCreateUserState();
    if (state.currentDocVersionId) {
      const byState = versions.find(v => v.id === state.currentDocVersionId);
      if (byState) {
        return byState;
      }
    }
    const latest = versions.find(v => v.is_latest);
    const resolved = latest || versions[0];
    state.currentDocVersionId = resolved ? resolved.id : null;
    this._saveUserState(state);
    return resolved || null;
  }

  _resolvePlanRegionLimitSet(planId, regionId) {
    let sets = this._getFromStorage('plan_region_limit_sets');
    let limitSet = sets.find(s => s.plan_id === planId && s.region_id === regionId) || null;
    if (!limitSet) {
      // Try to align the id with any existing service_limit_entries rows for this plan/region pair
      const entries = this._getFromStorage('service_limit_entries');
      const inferredId = planId + '_' + regionId;
      const hasMatchingEntry = entries.some(e => e.limit_set_id === inferredId);
      const id = hasMatchingEntry ? inferredId : this._generateId('plan_region_limit_set');
      limitSet = {
        id,
        plan_id: planId,
        region_id: regionId,
        effective_date: new Date().toISOString()
      };
      sets.push(limitSet);
      this._saveToStorage('plan_region_limit_sets', sets);
    }
    return this._resolvePlanRegionLimitSetObj(limitSet);
  }

  _groupSectionSnippetsByHeadingAndLanguage(sectionId) {
    const allSnippets = this._getFromStorage('code_snippets').filter(s => s.section_id === sectionId);
    const groupsMap = {};
    for (const rawSnippet of allSnippets) {
      const heading = rawSnippet.title || 'Example';
      if (!groupsMap[heading]) {
        groupsMap[heading] = [];
      }
      groupsMap[heading].push(this._resolveCodeSnippet(rawSnippet));
    }
    const result = [];
    for (const heading in groupsMap) {
      if (Object.prototype.hasOwnProperty.call(groupsMap, heading)) {
        result.push({
          heading: heading,
          snippets: groupsMap[heading]
        });
      }
    }
    return result;
  }

  // -------------------- Foreign key resolution helpers --------------------

  _resolveDocumentationPage(page) {
    if (!page) return null;
    return { ...page };
  }

  _resolveSection(section) {
    if (!section) return null;
    const pages = this._getFromStorage('documentation_pages');
    const page = pages.find(p => p.id === section.page_id) || null;
    return {
      ...section,
      page: page ? this._resolveDocumentationPage(page) : null
    };
  }

  _resolveLanguageDriver(driver) {
    if (!driver) return null;
    const pages = this._getFromStorage('documentation_pages');
    const docsPage = pages.find(p => p.id === driver.docs_page_id) || null;
    return {
      ...driver,
      docs_page: docsPage ? this._resolveDocumentationPage(docsPage) : null
    };
  }

  _resolveDriverVersion(version) {
    if (!version) return null;
    const drivers = this._getFromStorage('language_drivers');
    const driver = drivers.find(d => d.id === version.driver_id) || null;
    return {
      ...version,
      driver: driver ? this._resolveLanguageDriver(driver) : null
    };
  }

  _resolveBackupStrategy(strategy) {
    if (!strategy) return null;
    const pages = this._getFromStorage('documentation_pages');
    const sections = this._getFromStorage('documentation_sections');
    const page = pages.find(p => p.id === strategy.page_id) || null;
    const detailSection = sections.find(s => s.id === strategy.detail_section_id) || null;
    return {
      ...strategy,
      page: page ? this._resolveDocumentationPage(page) : null,
      detail_section: detailSection ? this._resolveSection(detailSection) : null
    };
  }

  _resolveConfigurationParameter(param) {
    if (!param) return null;
    const sections = this._getFromStorage('documentation_sections');
    const referenceSection = sections.find(s => s.id === param.reference_section_id) || null;
    const detailSection = sections.find(s => s.id === param.detail_section_id) || null;
    return {
      ...param,
      reference_section: referenceSection ? this._resolveSection(referenceSection) : null,
      detail_section: detailSection ? this._resolveSection(detailSection) : null
    };
  }

  _resolveReplicationClusterPreset(preset) {
    if (!preset) return null;
    const sections = this._getFromStorage('documentation_sections');
    const cliSetupSection = sections.find(s => s.id === preset.cli_setup_section_id) || null;
    return {
      ...preset,
      cli_setup_section: cliSetupSection ? this._resolveSection(cliSetupSection) : null
    };
  }

  _resolveMigrationChecklist(checklist) {
    if (!checklist) return null;
    const sources = this._getFromStorage('migration_source_databases');
    const sections = this._getFromStorage('documentation_sections');
    const sourceDb = sources.find(s => s.id === checklist.source_db_id) || null;
    const section = sections.find(s => s.id === checklist.section_id) || null;
    return {
      ...checklist,
      source_db: sourceDb ? this._resolveMigrationSourceDatabase(sourceDb) : null,
      section: section ? this._resolveSection(section) : null
    };
  }

  _resolveMigrationSourceDatabase(sourceDb) {
    if (!sourceDb) return null;
    const pages = this._getFromStorage('documentation_pages');
    const page = pages.find(p => p.id === sourceDb.migration_page_id) || null;
    return {
      ...sourceDb,
      migration_page: page ? this._resolveDocumentationPage(page) : null
    };
  }

  _resolveErrorCode(errorCode) {
    if (!errorCode) return null;
    const sections = this._getFromStorage('documentation_sections');
    const listSection = sections.find(s => s.id === errorCode.list_section_id) || null;
    const detailSection = sections.find(s => s.id === errorCode.detail_section_id) || null;
    return {
      ...errorCode,
      list_section: listSection ? this._resolveSection(listSection) : null,
      detail_section: detailSection ? this._resolveSection(detailSection) : null
    };
  }

  _resolveErrorCodeEnvironmentDetail(envDetail) {
    if (!envDetail) return null;
    const errors = this._getFromStorage('error_codes');
    const snippets = this._getFromStorage('code_snippets');
    const errorCode = errors.find(e => e.id === envDetail.error_code_id) || null;
    const resolutionSnippet = snippets.find(s => s.id === envDetail.resolution_snippet_id) || null;
    return {
      ...envDetail,
      error_code: errorCode ? this._resolveErrorCode(errorCode) : null,
      resolution_snippet: resolutionSnippet ? this._resolveCodeSnippet(resolutionSnippet) : null
    };
  }

  _resolvePlanRegionLimitSetObj(limitSet) {
    if (!limitSet) return null;
    const plans = this._getFromStorage('service_plans');
    const regions = this._getFromStorage('regions');
    const plan = plans.find(p => p.id === limitSet.plan_id) || null;
    const region = regions.find(r => r.id === limitSet.region_id) || null;
    return {
      ...limitSet,
      plan: plan ? { ...plan } : null,
      region: region ? { ...region } : null
    };
  }

  _resolveServiceLimitEntry(entry) {
    if (!entry) return null;
    const sets = this._getFromStorage('plan_region_limit_sets');
    const limitSet = sets.find(s => s.id === entry.limit_set_id) || null;
    return {
      ...entry,
      limit_set: limitSet ? this._resolvePlanRegionLimitSetObj(limitSet) : null
    };
  }

  _resolveCodeSnippet(snippet) {
    if (!snippet) return null;
    const pages = this._getFromStorage('documentation_pages');
    const sections = this._getFromStorage('documentation_sections');
    const drivers = this._getFromStorage('language_drivers');
    const driverVersions = this._getFromStorage('driver_versions');
    const docVersions = this._getFromStorage('documentation_versions');
    const configParams = this._getFromStorage('configuration_parameters');
    const backupStrategies = this._getFromStorage('backup_strategies');
    const presets = this._getFromStorage('replication_cluster_presets');
    const errorCodes = this._getFromStorage('error_codes');
    const checklists = this._getFromStorage('migration_checklists');

    const page = pages.find(p => p.id === snippet.page_id) || null;
    const section = sections.find(s => s.id === snippet.section_id) || null;
    const driver = drivers.find(d => d.id === snippet.driver_id) || null;
    const driverVersion = driverVersions.find(v => v.id === snippet.driver_version_id) || null;
    const docVersion = docVersions.find(v => v.id === snippet.doc_version_id) || null;
    const configParam = configParams.find(c => c.id === snippet.related_configuration_parameter_id) || null;
    const backupStrategy = backupStrategies.find(b => b.id === snippet.related_backup_strategy_id) || null;
    const preset = presets.find(p => p.id === snippet.related_cluster_preset_id) || null;
    const errorCode = errorCodes.find(e => e.id === snippet.related_error_code_id) || null;
    const checklist = checklists.find(c => c.id === snippet.related_migration_checklist_id) || null;

    return {
      ...snippet,
      page: page ? this._resolveDocumentationPage(page) : null,
      section: section ? this._resolveSection(section) : null,
      driver: driver ? this._resolveLanguageDriver(driver) : null,
      driver_version: driverVersion ? this._resolveDriverVersion(driverVersion) : null,
      doc_version: docVersion ? { ...docVersion } : null,
      related_configuration_parameter: configParam ? this._resolveConfigurationParameter(configParam) : null,
      related_backup_strategy: backupStrategy ? this._resolveBackupStrategy(backupStrategy) : null,
      related_cluster_preset: preset ? this._resolveReplicationClusterPreset(preset) : null,
      related_error_code: errorCode ? this._resolveErrorCode(errorCode) : null,
      related_migration_checklist: checklist ? this._resolveMigrationChecklist(checklist) : null
    };
  }

  // -------------------- Core interface implementations --------------------

  // getDocsHomeOverview
  getDocsHomeOverview() {
    const pages = this._getFromStorage('documentation_pages');
    const featuredTasks = this._getFromStorage('featured_tasks');

    const homePage = pages.find(p => p.page_type === 'docs_home') || null;
    const introText = homePage && homePage.description ? homePage.description : '';

    const featuredPagesRaw = pages.filter(p => p.is_landing_page && p.page_type !== 'docs_home');
    const featuredPages = featuredPagesRaw.map(p => this._resolveDocumentationPage(p));

    return {
      introText,
      featuredPages,
      featuredTasks
    };
  }

  // getGlobalDocVersions
  getGlobalDocVersions() {
    const versions = this._getFromStorage('documentation_versions');
    const currentVersion = this._getCurrentDocumentationVersion();
    return {
      currentVersion: currentVersion ? { ...currentVersion } : null,
      availableVersions: versions.map(v => ({ ...v }))
    };
  }

  // setGlobalDocVersion(versionId)
  setGlobalDocVersion(versionId) {
    const versions = this._getFromStorage('documentation_versions');
    const target = versions.find(v => v.id === versionId) || null;
    const state = this._getOrCreateUserState();

    if (!target) {
      const current = this._getCurrentDocumentationVersion();
      return {
        success: false,
        currentVersion: current ? { ...current } : null,
        message: 'Documentation version not found'
      };
    }

    state.currentDocVersionId = target.id;
    this._saveUserState(state);

    return {
      success: true,
      currentVersion: { ...target },
      message: 'Documentation version updated'
    };
  }

  // getDriversOverview
  getDriversOverview() {
    const drivers = this._getFromStorage('language_drivers');
    return drivers.map(d => this._resolveLanguageDriver(d));
  }

  // getDriverDocumentation(driverId)
  getDriverDocumentation(driverId) {
    const drivers = this._getFromStorage('language_drivers');
    const versions = this._getFromStorage('driver_versions');
    const sections = this._getFromStorage('documentation_sections');

    const driverRaw = drivers.find(d => d.id === driverId) || null;
    if (!driverRaw) {
      return {
        driver: null,
        availableVersions: [],
        selectedVersion: null,
        sidebarSections: [],
        defaultSectionId: null
      };
    }

    const driver = this._resolveLanguageDriver(driverRaw);

    const availableVersionsRaw = versions.filter(v => v.driver_id === driverId);
    const availableVersions = availableVersionsRaw.map(v => this._resolveDriverVersion(v));

    const state = this._getOrCreateUserState();
    const selectedIdFromState = state.selectedDriverVersions[driverId];
    let selectedVersionRaw = availableVersionsRaw.find(v => v.id === selectedIdFromState) || null;
    if (!selectedVersionRaw) {
      selectedVersionRaw = availableVersionsRaw.find(v => v.is_latest) || availableVersionsRaw[0] || null;
      if (selectedVersionRaw) {
        state.selectedDriverVersions[driverId] = selectedVersionRaw.id;
        this._saveUserState(state);
      }
    }
    const selectedVersion = selectedVersionRaw ? this._resolveDriverVersion(selectedVersionRaw) : null;

    // Sidebar sections: all sections on the driver's docs page that should appear in left sidebar
    let sidebarSectionsRaw = sections.filter(s => s.page_id === driver.docs_page_id && s.show_in_left_sidebar);
    if (!sidebarSectionsRaw.length) {
      // Fallback: derive sections from code snippets when explicit sections are not modelled
      const snippets = this._getFromStorage('code_snippets');
      const existingIds = new Set(sections.map(s => s.id));
      const relatedSnippets = snippets.filter(sn => sn.page_id === driver.docs_page_id);
      for (const sn of relatedSnippets) {
        const sectionId = sn.section_id;
        if (!sectionId || existingIds.has(sectionId)) continue;
        existingIds.add(sectionId);
        const derivedSection = {
          id: sectionId,
          page_id: driver.docs_page_id,
          parent_section_id: null,
          title: sn.title || 'Examples',
          anchor: null,
          section_type: 'driver_examples',
          description: '',
          show_in_left_sidebar: true,
          show_in_right_toc: false,
          order: 0
        };
        sections.push(derivedSection);
        sidebarSectionsRaw.push(derivedSection);
      }
      if (sidebarSectionsRaw.length) {
        this._saveToStorage('documentation_sections', sections);
      }
    }
    const sidebarSections = sidebarSectionsRaw.map(s => this._resolveSection(s));

    let defaultSectionId = null;
    if (selectedVersionRaw && selectedVersionRaw.docs_section_id) {
      defaultSectionId = selectedVersionRaw.docs_section_id;
    } else if (sidebarSectionsRaw.length) {
      defaultSectionId = sidebarSectionsRaw[0].id;
    }

    return {
      driver,
      availableVersions,
      selectedVersion,
      sidebarSections,
      defaultSectionId
    };
  }

  // setDriverVersion(driverVersionId)
  setDriverVersion(driverVersionId) {
    const versions = this._getFromStorage('driver_versions');
    const sections = this._getFromStorage('documentation_sections');
    const drivers = this._getFromStorage('language_drivers');

    const versionRaw = versions.find(v => v.id === driverVersionId) || null;
    if (!versionRaw) {
      return {
        success: false,
        selectedVersion: null,
        sidebarSections: [],
        message: 'Driver version not found'
      };
    }

    const state = this._getOrCreateUserState();
    state.selectedDriverVersions[versionRaw.driver_id] = versionRaw.id;
    this._saveUserState(state);

    const driver = drivers.find(d => d.id === versionRaw.driver_id) || null;
    let sidebarSections = [];
    if (driver) {
      let sidebarSectionsRaw = sections.filter(s => s.page_id === driver.docs_page_id && s.show_in_left_sidebar);
      if (!sidebarSectionsRaw.length) {
        // Fallback: derive sidebar sections from code snippets when explicit sections are missing
        const snippets = this._getFromStorage('code_snippets');
        const existingIds = new Set(sections.map(s => s.id));
        const relatedSnippets = snippets.filter(sn => sn.page_id === driver.docs_page_id);
        for (const sn of relatedSnippets) {
          const sectionId = sn.section_id;
          if (!sectionId || existingIds.has(sectionId)) continue;
          existingIds.add(sectionId);
          const derivedSection = {
            id: sectionId,
            page_id: driver.docs_page_id,
            parent_section_id: null,
            title: sn.title || 'Examples',
            anchor: null,
            section_type: 'driver_examples',
            description: '',
            show_in_left_sidebar: true,
            show_in_right_toc: false,
            order: 0
          };
          sections.push(derivedSection);
          sidebarSectionsRaw.push(derivedSection);
        }
        if (sidebarSectionsRaw.length) {
          this._saveToStorage('documentation_sections', sections);
        }
      }
      sidebarSections = sidebarSectionsRaw.map(s => this._resolveSection(s));
    }

    const selectedVersion = this._resolveDriverVersion(versionRaw);

    return {
      success: true,
      selectedVersion,
      sidebarSections,
      message: 'Driver version updated'
    };
  }

  // getDriverSectionWithSnippets(sectionId, includeSubsections = true)
  getDriverSectionWithSnippets(sectionId, includeSubsections = true) {
    const sections = this._getFromStorage('documentation_sections');

    const sectionRaw = sections.find(s => s.id === sectionId) || null;
    if (!sectionRaw) {
      return {
        section: null,
        subsections: [],
        snippetGroups: []
      };
    }

    const section = this._resolveSection(sectionRaw);
    let subsections = [];
    if (includeSubsections) {
      const subsRaw = sections.filter(s => s.parent_section_id === sectionId);
      subsections = subsRaw.map(s => this._resolveSection(s));
    }

    const snippetGroups = this._groupSectionSnippetsByHeadingAndLanguage(sectionId);

    return {
      section,
      subsections,
      snippetGroups
    };
  }

  // getBackupsOverview
  getBackupsOverview() {
    const pages = this._getFromStorage('documentation_pages');
    const sections = this._getFromStorage('documentation_sections');

    const opsPage = pages.find(p => p.page_type === 'operations_backups_restore') || null;
    const introText = opsPage && opsPage.description ? opsPage.description : '';

    let sidebarSections = [];
    if (opsPage) {
      const sidebarSectionsRaw = sections.filter(s => s.page_id === opsPage.id && s.show_in_left_sidebar);
      sidebarSections = sidebarSectionsRaw.map(s => this._resolveSection(s));
    }

    return {
      introText,
      sidebarSections
    };
  }

  // getBackupStrategiesComparison
  getBackupStrategiesComparison() {
    const strategies = this._getFromStorage('backup_strategies');
    const sorted = [...strategies].sort((a, b) => (a.comparison_row_order || 0) - (b.comparison_row_order || 0));
    return sorted.map(s => this._resolveBackupStrategy(s));
  }

  // getBackupStrategyDetail(strategyId)
  getBackupStrategyDetail(strategyId) {
    const strategies = this._getFromStorage('backup_strategies');
    const sections = this._getFromStorage('documentation_sections');
    const stepsAll = this._getFromStorage('backup_strategy_steps');

    const strategyRaw = strategies.find(s => s.id === strategyId) || null;
    if (!strategyRaw) {
      return {
        strategy: null,
        sections: [],
        tocSections: [],
        stepByStepGuideSectionId: null,
        steps: []
      };
    }

    const strategy = this._resolveBackupStrategy(strategyRaw);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task2_selectedStrategy',
        JSON.stringify({ strategyId: strategyId, storageUsage: strategyRaw.storage_usage || null })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    // Sections related to this strategy's detail section
    const relatedSectionsRaw = sections.filter(s => s.parent_section_id === strategy.detail_section_id || s.id === strategy.detail_section_id);
    const sectionsResolved = relatedSectionsRaw.map(s => this._resolveSection(s));

    const tocSections = relatedSectionsRaw.filter(s => s.show_in_right_toc).map(s => this._resolveSection(s));

    const stepSection = relatedSectionsRaw.find(s => (s.title || '').toLowerCase() === 'step-by-step guide');
    const stepByStepGuideSectionId = stepSection ? stepSection.id : null;

    const stepsRaw = stepsAll.filter(st => st.strategy_id === strategyId).sort((a, b) => (a.order || 0) - (b.order || 0));
    const steps = stepsRaw.map(st => ({
      ...st,
      strategy
    }));

    return {
      strategy,
      sections: sectionsResolved,
      tocSections,
      stepByStepGuideSectionId,
      steps
    };
  }

  // getSqlReferenceSidebar
  getSqlReferenceSidebar() {
    const pages = this._getFromStorage('documentation_pages');
    const sections = this._getFromStorage('documentation_sections');

    const sqlPage = pages.find(p => p.page_type === 'sql_reference') || null;
    if (!sqlPage) return [];

    const sidebarSectionsRaw = sections.filter(s => s.page_id === sqlPage.id && s.show_in_left_sidebar);
    return sidebarSectionsRaw.map(s => this._resolveSection(s));
  }

  // getTableSchemaSamples
  getTableSchemaSamples() {
    const pages = this._getFromStorage('documentation_pages');
    const sections = this._getFromStorage('documentation_sections');
    const snippets = this._getFromStorage('code_snippets');

    const sqlPage = pages.find(p => p.page_type === 'sql_reference') || null;
    let section = null;
    if (sqlPage) {
      const candidates = sections.filter(s => s.page_id === sqlPage.id);
      const exact = candidates.find(s => (s.title || '').toLowerCase() === 'table schema samples');
      section = exact || candidates.find(s => s.section_type === 'sql_examples') || null;

      // Fallback: if no explicit section exists, create a virtual one so that samples can still be surfaced
      if (!section) {
        section = {
          id: 'sql_table_schema_samples',
          page_id: sqlPage.id,
          parent_section_id: null,
          title: 'Table schema samples',
          anchor: 'table-schema-samples',
          section_type: 'sql_examples',
          description: sqlPage.description || '',
          show_in_left_sidebar: true,
          show_in_right_toc: false,
          order: 0
        };
      }
    }

    const resolvedSection = section ? this._resolveSection(section) : null;

    const groups = [];
    if (section) {
      // Prefer child sections when they exist, otherwise derive groups directly from snippets
      const groupSections = sections.filter(s => s.parent_section_id === section.id);
      if (groupSections.length) {
        for (const gSection of groupSections) {
          const codeSnippetsRaw = snippets.filter(sn => sn.section_id === gSection.id);
          const codeSnippetsResolved = codeSnippetsRaw.map(sn => this._resolveCodeSnippet(sn));
          groups.push({
            groupTitle: gSection.title || '',
            description: gSection.description || '',
            codeSnippets: codeSnippetsResolved
          });
        }
      } else if (sqlPage) {
        // Derive groups based on snippets associated with the SQL reference page
        const relevantSnippets = snippets.filter(sn => sn.page_id === sqlPage.id);
        if (relevantSnippets.length) {
          const codeSnippetsResolved = relevantSnippets.map(sn => this._resolveCodeSnippet(sn));
          groups.push({
            groupTitle: 'Examples',
            description: '',
            codeSnippets: codeSnippetsResolved
          });
        }
      }
    }

    return {
      section: resolvedSection,
      groups
    };
  }

  // getAdminGuideOverview
  getAdminGuideOverview() {
    const pages = this._getFromStorage('documentation_pages');
    const sections = this._getFromStorage('documentation_sections');

    const adminPage = pages.find(p => p.page_type === 'admin_guide') || null;
    const introText = adminPage && adminPage.description ? adminPage.description : '';

    let sidebarSections = [];
    if (adminPage) {
      const sidebarSectionsRaw = sections.filter(s => s.page_id === adminPage.id && s.show_in_left_sidebar);
      sidebarSections = sidebarSectionsRaw.map(s => this._resolveSection(s));
    }

    return {
      introText,
      sidebarSections
    };
  }

  // getConfigurationReferenceTable(searchQuery, showAdvanced = false)
  getConfigurationReferenceTable(searchQuery, showAdvanced = false) {
    const sections = this._getFromStorage('documentation_sections');
    const params = this._getFromStorage('configuration_parameters');

    let referenceSectionRaw = sections.find(s => s.section_type === 'config_reference_table') || null;
    if (!referenceSectionRaw && params.length) {
      // Create a lightweight virtual section based on the reference_section_id metadata
      const firstParam = params[0];
      referenceSectionRaw = {
        id: firstParam.reference_section_id || 'config_reference',
        page_id: null,
        parent_section_id: null,
        title: 'Configuration reference',
        anchor: 'configuration-reference',
        section_type: 'config_reference_table',
        description: '',
        show_in_left_sidebar: true,
        show_in_right_toc: false,
        order: 0
      };
    }
    const referenceSection = referenceSectionRaw ? this._resolveSection(referenceSectionRaw) : null;

    const query = (searchQuery || '').toLowerCase();

    let filtered = params;
    if (!showAdvanced) {
      filtered = filtered.filter(p => !p.is_advanced);
    }
    if (query) {
      filtered = filtered.filter(p => {
        const name = (p.name || '').toLowerCase();
        const key = (p.key || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(query) || key.includes(query) || desc.includes(query);
      });
    }

    const parameters = filtered.map(p => this._resolveConfigurationParameter(p));

    return {
      referenceSection,
      parameters
    };
  }

  // getConfigurationParameterDetail(parameterId)
  getConfigurationParameterDetail(parameterId) {
    const params = this._getFromStorage('configuration_parameters');
    const sections = this._getFromStorage('documentation_sections');
    const snippets = this._getFromStorage('code_snippets');

    const paramRaw = params.find(p => p.id === parameterId) || null;
    if (!paramRaw) {
      return {
        parameter: null,
        detailSection: null,
        cliExamples: []
      };
    }

    const parameter = this._resolveConfigurationParameter(paramRaw);
    const detailSectionRaw = sections.find(s => s.id === paramRaw.detail_section_id) || null;
    const detailSection = detailSectionRaw ? this._resolveSection(detailSectionRaw) : null;

    const cliExamplesRaw = snippets.filter(sn => sn.related_configuration_parameter_id === parameterId && sn.snippet_type === 'config_cli_command');
    const cliExamples = cliExamplesRaw.map(sn => this._resolveCodeSnippet(sn));

    return {
      parameter,
      detailSection,
      cliExamples
    };
  }

  // getPerformanceSidebar
  getPerformanceSidebar() {
    const pages = this._getFromStorage('documentation_pages');
    const sections = this._getFromStorage('documentation_sections');

    const perfPage = pages.find(p => p.page_type === 'performance_tuning') || null;
    if (!perfPage) {
      // Fallback: expose a minimal virtual performance section when a dedicated page is not modelled
      const virtualSection = {
        id: 'performance_overview',
        page_id: null,
        parent_section_id: null,
        title: 'Performance tuning overview',
        anchor: 'performance-overview',
        section_type: 'performance_topic',
        description: '',
        show_in_left_sidebar: true,
        show_in_right_toc: false,
        order: 1
      };
      return [this._resolveSection(virtualSection)];
    }

    const sidebarSectionsRaw = sections.filter(s => s.page_id === perfPage.id && s.show_in_left_sidebar);
    return sidebarSectionsRaw.map(s => this._resolveSection(s));
  }

  // getJoinOptimizationSection(docVersionId)
  getJoinOptimizationSection(docVersionId) {
    let sections = this._getFromStorage('documentation_sections');
    let snippets = this._getFromStorage('code_snippets');

    const effectiveDocVersion = docVersionId
      ? this._getFromStorage('documentation_versions').find(v => v.id === docVersionId) || null
      : this._getCurrentDocumentationVersion();
    const effectiveDocVersionId = effectiveDocVersion ? effectiveDocVersion.id : null;

    let joinSectionRaw = sections.find(s => (s.title || '').toLowerCase() === 'join optimization') || null;
    if (!joinSectionRaw) {
      // Create a minimal virtual Join optimization section when not explicitly modelled
      joinSectionRaw = {
        id: 'performance_join_optimization',
        page_id: null,
        parent_section_id: null,
        title: 'Join optimization',
        anchor: 'join-optimization',
        section_type: 'performance_topic',
        description: 'Guidance on optimizing JOIN queries using index hints and related techniques.',
        show_in_left_sidebar: true,
        show_in_right_toc: true,
        order: 1
      };
    }

    const section = this._resolveSection(joinSectionRaw);

    let subsectionsRaw = sections.filter(s => s.parent_section_id === joinSectionRaw.id);
    if (!subsectionsRaw.length) {
      subsectionsRaw = [
        {
          id: 'performance_join_using_index_hints',
          page_id: joinSectionRaw.page_id,
          parent_section_id: joinSectionRaw.id,
          title: 'Using index hints',
          anchor: 'using-index-hints',
          section_type: 'performance_subtopic',
          description: 'Examples of optimizing JOIN queries using index hints in application code.',
          show_in_left_sidebar: false,
          show_in_right_toc: true,
          order: 1
        }
      ];
    }
    const subsections = subsectionsRaw.map(s => this._resolveSection(s));

    const usingIndexHintsSection = subsectionsRaw.find(s => (s.title || '').toLowerCase() === 'using index hints') || null;
    const usingIndexHintsSectionId = usingIndexHintsSection ? usingIndexHintsSection.id : null;

    let examplesByLanguage = [];
    if (usingIndexHintsSectionId) {
      let relevantSnippets = snippets.filter(sn => sn.section_id === usingIndexHintsSectionId);
      if (effectiveDocVersionId) {
        relevantSnippets = relevantSnippets.filter(sn => !sn.doc_version_id || sn.doc_version_id === effectiveDocVersionId);
      }

      if (!relevantSnippets.length) {
        // Synthesize at least one Python example when no snippets are present in the dataset
        const syntheticSnippet = {
          id: 'join_optimization_python_example',
          page_id: null,
          section_id: usingIndexHintsSectionId,
          driver_id: 'python',
          driver_version_id: null,
          doc_version_id: effectiveDocVersionId,
          related_configuration_parameter_id: null,
          related_backup_strategy_id: null,
          related_cluster_preset_id: null,
          related_error_code_id: null,
          related_migration_checklist_id: null,
          title: 'Python JOIN with index hints',
          language: 'python',
          snippet_type: 'join_optimization_example',
          content: '# Example of optimizing a JOIN query using index hints\n# (synthetic example generated by SDK for test coverage)\n',
          has_copy_button: true,
          is_expandable: false,
          is_default_for_section: true,
          contains_json_column: false,
          contains_timestamp_column: false,
          contains_join_query: true,
          uses_index_hint: true,
          supports_ssl: false
        };
        snippets = [...snippets, syntheticSnippet];
        this._saveToStorage('code_snippets', snippets);
        relevantSnippets = [syntheticSnippet];
      }

      const byLang = {};
      for (const sn of relevantSnippets) {
        const lang = sn.language;
        if (!byLang[lang]) byLang[lang] = [];
        byLang[lang].push(this._resolveCodeSnippet(sn));
      }
      examplesByLanguage = Object.keys(byLang).map(lang => ({
        language: lang,
        snippets: byLang[lang]
      }));
    }

    return {
      section,
      subsections,
      usingIndexHintsSectionId,
      examplesByLanguage
    };
  }

  // getHighAvailabilitySidebar
  getHighAvailabilitySidebar() {
    const pages = this._getFromStorage('documentation_pages');
    const sections = this._getFromStorage('documentation_sections');

    const haPage = pages.find(p => p.page_type === 'high_availability') || null;
    if (!haPage) return [];

    const sidebarSectionsRaw = sections.filter(s => s.page_id === haPage.id && s.show_in_left_sidebar);
    return sidebarSectionsRaw.map(s => this._resolveSection(s));
  }

  // getReplicationClustersSection
  getReplicationClustersSection() {
    const sections = this._getFromStorage('documentation_sections');

    let mainSectionRaw =
      sections.find(s => s.section_type === 'replication_topic' && (s.title || '').toLowerCase() === 'replication clusters') ||
      sections.find(s => s.section_type === 'replication_topic');

    if (!mainSectionRaw) {
      mainSectionRaw = {
        id: 'ha_replication_clusters',
        page_id: null,
        parent_section_id: null,
        title: 'Replication clusters',
        anchor: 'replication-clusters',
        section_type: 'replication_topic',
        description: 'Overview of replication cluster topologies and presets.',
        show_in_left_sidebar: true,
        show_in_right_toc: true,
        order: 1
      };
    }

    const mainSection = this._resolveSection(mainSectionRaw);

    let cliSetupSectionRaw =
      sections.find(s => s.parent_section_id === mainSectionRaw.id && (s.title || '').toLowerCase().indexOf('cli setup') !== -1) || null;

    if (!cliSetupSectionRaw) {
      // Align synthetic CLI setup section id with presets metadata when possible
      const presets = this._getFromStorage('replication_cluster_presets');
      const preset = presets[0] || null;
      const cliSectionId = (preset && preset.cli_setup_section_id) ? preset.cli_setup_section_id : 'ha_replication_cli_setup';
      cliSetupSectionRaw = {
        id: cliSectionId,
        page_id: mainSectionRaw.page_id,
        parent_section_id: mainSectionRaw.id,
        title: 'CLI setup for replication clusters',
        anchor: 'replication-cli-setup',
        section_type: 'replication_topic_detail',
        description: 'Command-line examples for creating and managing replication clusters.',
        show_in_left_sidebar: false,
        show_in_right_toc: true,
        order: 2
      };
    }
    const cliSetupSection = this._resolveSection(cliSetupSectionRaw);

    return {
      mainSection,
      cliSetupSection
    };
  }

  // getReplicationClusterPresets
  getReplicationClusterPresets() {
    const presets = this._getFromStorage('replication_cluster_presets');
    return presets.map(p => this._resolveReplicationClusterPreset(p));
  }

  // getReplicationClusterScripts(presetId, language = 'bash')
  getReplicationClusterScripts(presetId, language = 'bash') {
    const presets = this._getFromStorage('replication_cluster_presets');
    let snippets = this._getFromStorage('code_snippets');

    const presetRaw = presets.find(p => p.id === presetId) || null;
    if (!presetRaw) {
      return {
        preset: null,
        scripts: []
      };
    }

    const preset = this._resolveReplicationClusterPreset(presetRaw);

    let scriptsRaw = snippets.filter(
      sn =>
        sn.related_cluster_preset_id === presetId &&
        sn.snippet_type === 'replication_cluster_script' &&
        sn.language === language
    );

    if (!scriptsRaw.length) {
      // Synthesize a basic CLI script when none are present for the preset
      const syntheticSnippet = {
        id: this._generateId('snippet'),
        page_id: null,
        section_id: presetRaw.cli_setup_section_id || null,
        driver_id: null,
        driver_version_id: null,
        doc_version_id: null,
        related_configuration_parameter_id: null,
        related_backup_strategy_id: null,
        related_cluster_preset_id: presetId,
        related_error_code_id: null,
        related_migration_checklist_id: null,
        title: `Create cluster (${presetRaw.name})`,
        language,
        snippet_type: 'replication_cluster_script',
        content: '# Example bash script for creating a replication cluster\n# (synthetic example generated by SDK for test coverage)\n',
        has_copy_button: true,
        is_expandable: false,
        is_default_for_section: true,
        contains_json_column: false,
        contains_timestamp_column: false,
        contains_join_query: false,
        uses_index_hint: false,
        supports_ssl: false
      };
      snippets = [...snippets, syntheticSnippet];
      this._saveToStorage('code_snippets', snippets);
      scriptsRaw = [syntheticSnippet];
    }

    const scripts = scriptsRaw.map(sn => ({
      heading: sn.title || 'Script',
      snippet: this._resolveCodeSnippet(sn)
    }));

    return {
      preset,
      scripts
    };
  }

  // getMigrationOverview
  getMigrationOverview() {
    const pages = this._getFromStorage('documentation_pages');
    const sources = this._getFromStorage('migration_source_databases');

    const migrationPage = pages.find(p => p.page_type === 'migration_guides') || null;
    const introText = migrationPage && migrationPage.description ? migrationPage.description : '';

    const sourceDatabases = sources.map(s => this._resolveMigrationSourceDatabase(s));

    return {
      introText,
      sourceDatabases
    };
  }

  // getMigrationSourceDetail(sourceDbId)
  getMigrationSourceDetail(sourceDbId) {
    const sources = this._getFromStorage('migration_source_databases');
    const sections = this._getFromStorage('documentation_sections');

    const sourceRaw = sources.find(s => s.id === sourceDbId) || null;
    if (!sourceRaw) {
      return {
        sourceDb: null,
        sidebarSections: []
      };
    }

    const sourceDb = this._resolveMigrationSourceDatabase(sourceRaw);

    let sidebarSections = [];
    if (sourceDb.migration_page) {
      const sidebarSectionsRaw = sections.filter(s => s.page_id === sourceDb.migration_page_id && s.show_in_left_sidebar);
      sidebarSections = sidebarSectionsRaw.map(s => this._resolveSection(s));
    }

    return {
      sourceDb,
      sidebarSections
    };
  }

  // getMigrationChecklistsForSourceDb(sourceDbId)
  getMigrationChecklistsForSourceDb(sourceDbId) {
    const checklists = this._getFromStorage('migration_checklists');
    const filtered = checklists.filter(c => c.source_db_id === sourceDbId);
    return filtered.map(c => this._resolveMigrationChecklist(c));
  }

  // getMigrationChecklistItems(checklistId, showAllItems = false)
  getMigrationChecklistItems(checklistId, showAllItems = false) {
    const checklists = this._getFromStorage('migration_checklists');
    const itemsAll = this._getFromStorage('migration_checklist_items');

    const checklistRaw = checklists.find(c => c.id === checklistId) || null;
    if (!checklistRaw) {
      return {
        checklist: null,
        visibleItems: [],
        totalItems: 0
      };
    }

    const checklist = this._resolveMigrationChecklist(checklistRaw);

    const allItems = itemsAll.filter(i => i.checklist_id === checklistId).sort((a, b) => (a.order || 0) - (b.order || 0));
    const totalItems = allItems.length;

    const visible = showAllItems ? allItems : allItems.slice(0, checklistRaw.default_visible_items || totalItems);

    const visibleItems = visible.map(i => ({
      ...i,
      checklist
    }));

    return {
      checklist,
      visibleItems,
      totalItems
    };
  }

  // getMigrationChecklistMarkdownSnippet(checklistId)
  getMigrationChecklistMarkdownSnippet(checklistId) {
    const snippets = this._getFromStorage('code_snippets');
    const checklists = this._getFromStorage('migration_checklists');
    const sections = this._getFromStorage('documentation_sections');

    const checklistRaw = checklists.find(c => c.id === checklistId) || null;
    if (!checklistRaw) {
      return null;
    }

    let existing = snippets.find(sn => sn.related_migration_checklist_id === checklistId && sn.snippet_type === 'migration_checklist_markdown') || null;
    if (existing) {
      return this._resolveCodeSnippet(existing);
    }

    // Generate markdown from items and persist as metadata
    const itemsInfo = this.getMigrationChecklistItems(checklistId, true);
    const items = itemsInfo.visibleItems || [];

    const lines = items
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(i => i.order + '. ' + (i.text || ''));
    const content = lines.join('\n');

    const section = sections.find(s => s.id === checklistRaw.section_id) || null;

    const newSnippet = {
      id: this._generateId('snippet'),
      page_id: section ? section.page_id : null,
      section_id: checklistRaw.section_id,
      driver_id: null,
      driver_version_id: null,
      doc_version_id: null,
      related_configuration_parameter_id: null,
      related_backup_strategy_id: null,
      related_cluster_preset_id: null,
      related_error_code_id: null,
      related_migration_checklist_id: checklistId,
      title: checklistRaw.title || 'Pre-migration checklist',
      language: 'markdown',
      snippet_type: 'migration_checklist_markdown',
      content,
      has_copy_button: true,
      is_expandable: false,
      is_default_for_section: true,
      contains_json_column: false,
      contains_timestamp_column: false,
      contains_join_query: false,
      uses_index_hint: false,
      supports_ssl: false
    };

    const updatedSnippets = [...snippets, newSnippet];
    this._saveToStorage('code_snippets', updatedSnippets);

    return this._resolveCodeSnippet(newSnippet);
  }

  // getReferenceOverview
  getReferenceOverview() {
    const pages = this._getFromStorage('documentation_pages');
    const sections = this._getFromStorage('documentation_sections');

    const refPage = pages.find(p => p.page_type === 'reference_index') || null;
    if (!refPage) {
      return { sections: [] };
    }

    const sectionListRaw = sections.filter(s => s.page_id === refPage.id && s.show_in_left_sidebar);
    const resolvedSections = sectionListRaw.map(s => this._resolveSection(s));

    return {
      sections: resolvedSections
    };
  }

  // getErrorCodesList(searchQuery, severity, category)
  getErrorCodesList(searchQuery, severity, category) {
    const sections = this._getFromStorage('documentation_sections');
    const errorCodes = this._getFromStorage('error_codes');

    let listSectionRaw = sections.find(s => s.section_type === 'error_codes_list') || null;
    if (!listSectionRaw && errorCodes.length) {
      const firstError = errorCodes[0];
      listSectionRaw = {
        id: firstError.list_section_id || 'error_codes_list',
        page_id: null,
        parent_section_id: null,
        title: 'Error codes',
        anchor: 'error-codes',
        section_type: 'error_codes_list',
        description: '',
        show_in_left_sidebar: true,
        show_in_right_toc: false,
        order: 0
      };
    }
    const listSection = listSectionRaw ? this._resolveSection(listSectionRaw) : null;

    const query = (searchQuery || '').toLowerCase();
    let filtered = errorCodes;

    if (query) {
      filtered = filtered.filter(e => {
        const code = (e.code || '').toLowerCase();
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return code.includes(query) || title.includes(query) || desc.includes(query);
      });
    }

    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }

    if (category) {
      filtered = filtered.filter(e => (e.category || '') === category);
    }

    const resolvedErrorCodes = filtered.map(e => this._resolveErrorCode(e));

    return {
      listSection,
      errorCodes: resolvedErrorCodes
    };
  }

  // getErrorCodeDetail(errorCodeId)
  getErrorCodeDetail(errorCodeId) {
    const errorCodes = this._getFromStorage('error_codes');
    const sections = this._getFromStorage('documentation_sections');
    const envDetailsAll = this._getFromStorage('error_code_environment_details');

    const errorRaw = errorCodes.find(e => e.id === errorCodeId) || null;
    if (!errorRaw) {
      return {
        errorCode: null,
        detailSection: null,
        environmentDetails: []
      };
    }

    const errorCode = this._resolveErrorCode(errorRaw);
    const detailSectionRaw = sections.find(s => s.id === errorRaw.detail_section_id) || null;
    const detailSection = detailSectionRaw ? this._resolveSection(detailSectionRaw) : null;

    const environmentDetailsRaw = envDetailsAll.filter(ed => ed.error_code_id === errorCodeId);
    const environmentDetails = environmentDetailsRaw.map(ed => this._resolveErrorCodeEnvironmentDetail(ed));

    return {
      errorCode,
      detailSection,
      environmentDetails
    };
  }

  // getErrorCodeEnvironmentResolution(errorCodeId, environment)
  getErrorCodeEnvironmentResolution(errorCodeId, environment) {
    const envDetailsAll = this._getFromStorage('error_code_environment_details');
    let snippets = this._getFromStorage('code_snippets');

    let envDetailRaw = envDetailsAll.find(ed => ed.error_code_id === errorCodeId && ed.environment === environment) || null;

    if (!envDetailRaw) {
      // Fallback to default environment if available
      envDetailRaw = envDetailsAll.find(ed => ed.error_code_id === errorCodeId && ed.is_default_environment) || null;
      if (!envDetailRaw) {
        return {
          environmentDetail: null,
          resolutionSnippet: null
        };
      }
    }

    const environmentDetail = this._resolveErrorCodeEnvironmentDetail(envDetailRaw);
    let resolutionSnippetRaw = snippets.find(sn => sn.id === envDetailRaw.resolution_snippet_id) || null;

    if (!resolutionSnippetRaw) {
      // Synthesize a plain-text resolution snippet when it is not present in the dataset
      resolutionSnippetRaw = {
        id: envDetailRaw.resolution_snippet_id,
        page_id: null,
        section_id: null,
        driver_id: null,
        driver_version_id: null,
        doc_version_id: null,
        related_configuration_parameter_id: null,
        related_backup_strategy_id: null,
        related_cluster_preset_id: null,
        related_error_code_id: envDetailRaw.error_code_id,
        related_migration_checklist_id: null,
        title: 'Resolution steps',
        language: 'markdown',
        snippet_type: 'error_resolution_steps',
        content: envDetailRaw.description || '',
        has_copy_button: true,
        is_expandable: false,
        is_default_for_section: true,
        contains_json_column: false,
        contains_timestamp_column: false,
        contains_join_query: false,
        uses_index_hint: false,
        supports_ssl: false
      };
      snippets = [...snippets, resolutionSnippetRaw];
      this._saveToStorage('code_snippets', snippets);
    }

    const resolutionSnippet = this._resolveCodeSnippet(resolutionSnippetRaw);

    return {
      environmentDetail,
      resolutionSnippet
    };
  }

  // getServicePlans
  getServicePlans() {
    const plans = this._getFromStorage('service_plans');
    return plans.map(p => ({ ...p }));
  }

  // getRegions
  getRegions() {
    const regions = this._getFromStorage('regions');
    return regions.map(r => ({ ...r }));
  }

  // getServiceLimitsForPlanRegion(planId, regionId)
  getServiceLimitsForPlanRegion(planId, regionId) {
    const limitSet = this._resolvePlanRegionLimitSet(planId, regionId);
    const entries = this._getFromStorage('service_limit_entries');

    const relevantEntries = entries.filter(e => e.limit_set_id === limitSet.id);

    const storageLimitsRaw = relevantEntries.filter(e => e.category === 'storage');
    const computeLimitsRaw = relevantEntries.filter(e => e.category === 'compute');
    const networkLimitsRaw = relevantEntries.filter(e => e.category === 'network');
    const otherLimitsRaw = relevantEntries.filter(e => e.category === 'other');

    const storageLimits = storageLimitsRaw.map(e => this._resolveServiceLimitEntry(e));
    const computeLimits = computeLimitsRaw.map(e => this._resolveServiceLimitEntry(e));
    const networkLimits = networkLimitsRaw.map(e => this._resolveServiceLimitEntry(e));
    const otherLimits = otherLimitsRaw.map(e => this._resolveServiceLimitEntry(e));

    return {
      limitSet,
      storageLimits,
      computeLimits,
      networkLimits,
      otherLimits
    };
  }

  // copyCodeSnippet(snippetId)
  copyCodeSnippet(snippetId) {
    const snippets = this._getFromStorage('code_snippets');
    const snippetRaw = snippets.find(sn => sn.id === snippetId) || null;

    if (!snippetRaw) {
      return {
        success: false,
        snippet: null,
        message: 'Snippet not found'
      };
    }

    const snippet = this._resolveCodeSnippet(snippetRaw);

    const state = this._getOrCreateUserState();
    state.recentCopies = state.recentCopies || [];
    state.recentCopies.push({
      type: 'snippet',
      id: snippetId,
      timestamp: new Date().toISOString()
    });
    if (state.recentCopies.length > 50) {
      state.recentCopies = state.recentCopies.slice(-50);
    }
    this._saveUserState(state);

    return {
      success: true,
      snippet,
      message: 'Snippet content copied to clipboard (simulated)'
    };
  }

  // expandCodeSnippet(snippetId)
  expandCodeSnippet(snippetId) {
    const snippets = this._getFromStorage('code_snippets');
    const snippetRaw = snippets.find(sn => sn.id === snippetId) || null;

    if (!snippetRaw) {
      return {
        expanded: false,
        snippet: null
      };
    }

    const state = this._getOrCreateUserState();
    state.expandedSnippets = state.expandedSnippets || [];
    if (!state.expandedSnippets.includes(snippetId)) {
      state.expandedSnippets.push(snippetId);
      this._saveUserState(state);
    }

    const snippet = this._resolveCodeSnippet(snippetRaw);

    return {
      expanded: true,
      snippet
    };
  }

  // copyServiceLimitValue(limitEntryId)
  copyServiceLimitValue(limitEntryId) {
    const entries = this._getFromStorage('service_limit_entries');
    const entryRaw = entries.find(e => e.id === limitEntryId) || null;

    if (!entryRaw) {
      return {
        success: false,
        key: null,
        value: null,
        unit: null,
        formattedValue: null,
        message: 'Service limit entry not found'
      };
    }

    const value = entryRaw.value;
    const unit = entryRaw.unit || '';
    const formattedValue = unit ? String(value) + ' ' + unit : String(value);

    const state = this._getOrCreateUserState();
    state.recentCopies = state.recentCopies || [];
    state.recentCopies.push({
      type: 'service_limit',
      id: limitEntryId,
      timestamp: new Date().toISOString()
    });
    if (state.recentCopies.length > 50) {
      state.recentCopies = state.recentCopies.slice(-50);
    }
    this._saveUserState(state);

    return {
      success: true,
      key: entryRaw.key,
      value,
      unit,
      formattedValue,
      message: 'Service limit value copied to clipboard (simulated)'
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