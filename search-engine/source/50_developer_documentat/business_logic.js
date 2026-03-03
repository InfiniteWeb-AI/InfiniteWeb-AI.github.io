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

  // ---------------------------
  // Storage helpers
  // ---------------------------
  _initStorage() {
    const keys = [
      'doc_pages',
      'navigation_links',
      'sidebar_items',
      'api_groups',
      'api_endpoints',
      'api_examples',
      'code_snippets',
      'evaluation_config_snippets',
      'metrics',
      'projects',
      'datasets',
      'evaluation_examples',
      'examples_gallery_filters',
      'docs_versions',
      'site_settings',
      'playground_evaluation_runs',
      'config_builder_states',
      'model_variants',
      'search_index_entries',
      'search_results',
      'sdk_methods',
      'batch_evaluation_runs'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') return defaultValue;
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

  // ---------------------------
  // Common entity helpers
  // ---------------------------

  _getSiteSettingsRecord() {
    const arr = this._getFromStorage('site_settings', []);
    if (arr.length === 0) {
      const record = {
        id: 'site',
        currentDocsVersionId: 'v1'
      };
      this._saveToStorage('site_settings', [record]);
      return record;
    }
    const record = arr[0];
    if (!record.currentDocsVersionId) {
      record.currentDocsVersionId = 'v1';
      this._saveToStorage('site_settings', [record]);
    }
    return record;
  }

  _saveSiteSettingsRecord(record) {
    this._saveToStorage('site_settings', [record]);
  }

  _getExamplesFilterStateRecord() {
    const arr = this._getFromStorage('examples_gallery_filters', []);
    if (arr.length === 0) {
      const rec = {
        id: 'examples_filter_state',
        selectedMetricId: null,
        minDatasetSize: null
      };
      this._saveToStorage('examples_gallery_filters', [rec]);
      return rec;
    }
    return arr[0];
  }

  _saveExamplesFilterStateRecord(rec) {
    this._saveToStorage('examples_gallery_filters', [rec]);
  }

  _getConfigBuilderStateRecord() {
    const arr = this._getFromStorage('config_builder_states', []);
    if (arr.length === 0) {
      const rec = {
        id: this._generateId('config_builder_state'),
        taskType: 'text_classification',
        modelVariantIds: [],
        maxSamples: null,
        selectedMetricIds: [],
        generatedConfigSnippetId: null
      };
      this._saveToStorage('config_builder_states', [rec]);
      return rec;
    }
    return arr[0];
  }

  _saveConfigBuilderStateRecord(rec) {
    this._saveToStorage('config_builder_states', [rec]);
  }

  _getDocPageById(id) {
    if (!id) return null;
    const pages = this._getFromStorage('doc_pages', []);
    return pages.find((p) => p.id === id) || null;
  }

  _getMetricById(id) {
    if (!id) return null;
    const metrics = this._getFromStorage('metrics', []);
    return metrics.find((m) => m.id === id) || null;
  }

  _getApiGroupById(id) {
    if (!id) return null;
    const groups = this._getFromStorage('api_groups', []);
    return groups.find((g) => g.id === id) || null;
  }

  _getApiEndpointById(id) {
    if (!id) return null;
    const endpoints = this._getFromStorage('api_endpoints', []);
    return endpoints.find((e) => e.id === id) || null;
  }

  _getCodeSnippetById(id) {
    if (!id) return null;
    const snippets = this._getFromStorage('code_snippets', []);
    return snippets.find((s) => s.id === id) || null;
  }

  _getEvaluationExampleById(id) {
    if (!id) return null;
    const examples = this._getFromStorage('evaluation_examples', []);
    return examples.find((e) => e.id === id) || null;
  }

  _getProjectById(id) {
    if (!id) return null;
    const projects = this._getFromStorage('projects', []);
    return projects.find((p) => p.id === id) || null;
  }

  _getDatasetById(id) {
    if (!id) return null;
    const datasets = this._getFromStorage('datasets', []);
    return datasets.find((d) => d.id === id) || null;
  }

  _getSdkMethodById(id) {
    if (!id) return null;
    const methods = this._getFromStorage('sdk_methods', []);
    return methods.find((m) => m.id === id) || null;
  }

  // ---------------------------
  // Private helpers specified in Interfaces.helperFunctions
  // ---------------------------

  _getCurrentDocsVersion() {
    const siteSettings = this._getSiteSettingsRecord();
    const docsVersions = this._getFromStorage('docs_versions', []);
    const current =
      docsVersions.find((v) => v.id === siteSettings.currentDocsVersionId) || null;
    return {
      currentDocsVersionId: siteSettings.currentDocsVersionId,
      currentDocsVersion: current || null
    };
  }

  _persistConfigBuilderState(configBuilderState, modelVariants) {
    if (configBuilderState) {
      this._saveConfigBuilderStateRecord(configBuilderState);
    }
    if (Array.isArray(modelVariants)) {
      this._saveToStorage('model_variants', modelVariants);
    }
  }

  _persistExamplesGalleryFilterState(filterState) {
    this._saveExamplesFilterStateRecord(filterState);
  }

  _generateCurlExampleWithParams(code, projectId, limit, cursor) {
    if (typeof code !== 'string') return '';
    let updated = code;

    // Replace project_id placeholders
    updated = updated.replace(/\{project_id\}/g, projectId);
    updated = updated.replace(/:project_id/g, projectId);

    // Find first URL
    const urlMatch = updated.match(/https?:\/\/[^"'\s]+/);
    if (!urlMatch) {
      return updated;
    }

    const originalUrl = urlMatch[0];
    const parts = originalUrl.split('?');
    let basePath = parts[0];

    // Ensure the base path already has the concrete project ID
    basePath = basePath
      .replace(/\{project_id\}/g, projectId)
      .replace(/:project_id/g, projectId);

    const query = `?limit=${encodeURIComponent(String(limit))}&cursor=${encodeURIComponent(
      String(cursor)
    )}`;
    const newUrl = basePath + query;

    updated = updated.replace(originalUrl, newUrl);
    return updated;
  }

  _renderEvaluationConfigIntoSnippet(codeSnippet, evaluationConfigSnippet) {
    if (!codeSnippet || typeof codeSnippet.code !== 'string') {
      return codeSnippet ? codeSnippet.code : '';
    }
    let code = codeSnippet.code;

    const metrics = evaluationConfigSnippet.metrics || [];
    const maxSamples = evaluationConfigSnippet.maxSamples;
    const modelId = evaluationConfigSnippet.modelId;

    const metricsPy = `[${metrics.map((m) => `'${m}'`).join(', ')}]`;

    // metrics: try Python style first
    const metricsRegexPy = /metrics\s*=\s*\[[^\]]*\]/;
    if (metricsRegexPy.test(code)) {
      code = code.replace(metricsRegexPy, `metrics = ${metricsPy}`);
    } else {
      const metricsRegexJson = /"metrics"\s*:\s*\[[^\]]*\]/;
      if (metricsRegexJson.test(code)) {
        const metricsJson = `"metrics": [${metrics
          .map((m) => `"${m}"`)
          .join(', ')}]`;
        code = code.replace(metricsRegexJson, metricsJson);
      }
    }

    // max_samples / maxSamples
    if (typeof maxSamples === 'number') {
      const maxSamplesRegexPy = /max_samples\s*=\s*\d+/;
      const maxSamplesRegexJson = /"max_samples"\s*:\s*\d+/;
      const maxSamplesRegexCamel = /maxSamples\s*[:=]\s*\d+/;
      if (maxSamplesRegexPy.test(code)) {
        code = code.replace(maxSamplesRegexPy, `max_samples = ${maxSamples}`);
      } else if (maxSamplesRegexJson.test(code)) {
        code = code.replace(
          maxSamplesRegexJson,
          `"max_samples": ${maxSamples}`
        );
      } else if (maxSamplesRegexCamel.test(code)) {
        code = code.replace(
          maxSamplesRegexCamel,
          `maxSamples: ${maxSamples}`
        );
      }
    }

    // model_id / model
    if (modelId) {
      const modelIdRegexPy = /model_id\s*=\s*['"][^'"]*['"]/;
      const modelRegexPy = /model\s*=\s*['"][^'"]*['"]/;
      const modelIdRegexJson = /"model_id"\s*:\s*"[^"]*"/;
      const modelRegexJson = /"model"\s*:\s*"[^"]*"/;
      const replacementPy = `model_id = '${modelId}'`;
      const replacementJson = `"model_id": "${modelId}"`;

      if (modelIdRegexPy.test(code)) {
        code = code.replace(modelIdRegexPy, replacementPy);
      } else if (modelRegexPy.test(code)) {
        code = code.replace(modelRegexPy, `model = '${modelId}'`);
      } else if (modelIdRegexJson.test(code)) {
        code = code.replace(modelIdRegexJson, replacementJson);
      } else if (modelRegexJson.test(code)) {
        code = code.replace(modelRegexJson, `"model": "${modelId}"`);
      }
    }

    return code;
  }

  _createPlaygroundRunRecord(params) {
    const runs = this._getFromStorage('playground_evaluation_runs', []);
    const run = {
      id: this._generateId('playground_run'),
      taskType: params.taskType,
      prompt: params.prompt,
      accuracyWeight:
        typeof params.accuracyWeight === 'number' ? params.accuracyWeight : null,
      latencyWeight:
        typeof params.latencyWeight === 'number' ? params.latencyWeight : null,
      metricIds: Array.isArray(params.metricIds) ? params.metricIds : [],
      sampleSize: params.sampleSize,
      evaluationName: params.evaluationName,
      modelId: params.modelId || null,
      status: 'running',
      createdAt: new Date().toISOString()
    };
    runs.push(run);
    this._saveToStorage('playground_evaluation_runs', runs);
    return run;
  }

  // ---------------------------
  // Small helper: JS concurrency update
  // ---------------------------

  _setConcurrencyInJsSnippet(code, concurrency) {
    if (typeof code !== 'string') return '';
    let updated = code;
    const concRegex = /concurrency\s*:\s*\d+/;
    if (concRegex.test(updated)) {
      updated = updated.replace(concRegex, `concurrency: ${concurrency}`);
      return updated;
    }

    // Try to inject into options object for runBatchEvaluation(..., { ... })
    const runRegex = /runBatchEvaluation\s*\(([^)]*)\)/s;
    const match = updated.match(runRegex);
    if (match) {
      const fullCall = match[0];
      const args = match[1];
      const parts = args.split(',');
      if (parts.length >= 2) {
        const lastArg = parts[parts.length - 1];
        if (/{[\s\S]*}/.test(lastArg)) {
          const newLast = lastArg.replace(
            /}\s*$/,
            `, concurrency: ${concurrency} }`
          );
          const newArgs = parts
            .slice(0, -1)
            .concat([newLast])
            .join(',');
          const newCall = fullCall.replace(args, newArgs);
          updated = updated.replace(fullCall, newCall);
        }
      }
    }

    return updated;
  }

  // ---------------------------
  // Foreign key resolution helpers per entity
  // ---------------------------

  _resolveSidebarItem(item) {
    const parentPage = this._getDocPageById(item.parentPageId);
    const targetPage = item.targetPageId
      ? this._getDocPageById(item.targetPageId)
      : null;
    return Object.assign({}, item, {
      parentPage: parentPage || null,
      targetPage: targetPage
    });
  }

  _resolveMetric(metric) {
    const detailPage = metric.metricDetailPageId
      ? this._getDocPageById(metric.metricDetailPageId)
      : null;
    return Object.assign({}, metric, {
      metricDetailPage: detailPage
    });
  }

  _resolveCodeSnippet(snippet) {
    const docPage = this._getDocPageById(snippet.docPageId);
    let relatedEntity = null;
    if (snippet.relatedEntityId) {
      // Could be a metric id or config builder state id; try metric first
      relatedEntity =
        this._getMetricById(snippet.relatedEntityId) ||
        this._getConfigBuilderStateRecord();
    }
    return Object.assign({}, snippet, {
      docPage: docPage || null,
      relatedEntity: relatedEntity
    });
  }

  _resolveEvaluationConfigSnippet(e) {
    const codeSnippet = this._getCodeSnippetById(e.codeSnippetId);
    return Object.assign({}, e, {
      codeSnippet: codeSnippet || null
    });
  }

  _resolveApiEndpoint(endpoint) {
    const group = this._getApiGroupById(endpoint.groupId);
    const docPage = this._getDocPageById(endpoint.docPageId);
    return Object.assign({}, endpoint, {
      group: group || null,
      docPage: docPage || null
    });
  }

  _resolveApiExample(example) {
    const endpoint = this._getApiEndpointById(example.apiEndpointId);
    return Object.assign({}, example, {
      apiEndpoint: endpoint || null
    });
  }

  _resolveEvaluationExample(example) {
    const dataset = example.datasetId
      ? this._getDatasetById(example.datasetId)
      : null;
    const exampleDetailPage = example.exampleDetailPageId
      ? this._getDocPageById(example.exampleDetailPageId)
      : null;
    const metrics = (example.metricIds || [])
      .map((id) => this._getMetricById(id))
      .filter(Boolean);
    return Object.assign({}, example, {
      dataset: dataset || null,
      exampleDetailPage: exampleDetailPage || null,
      metrics: metrics
    });
  }

  _resolveConfigBuilderState(state) {
    const snippet = state.generatedConfigSnippetId
      ? this._getCodeSnippetById(state.generatedConfigSnippetId)
      : null;
    return Object.assign({}, state, {
      generatedConfigSnippet: snippet || null
    });
  }

  _resolveModelVariant(variant) {
    const state = this._getConfigBuilderStateRecord();
    return Object.assign({}, variant, {
      configBuilderState: state
    });
  }

  _resolveSdkMethod(method) {
    const docPage = this._getDocPageById(method.docPageId);
    const exampleSnippet = method.exampleSnippetId
      ? this._getCodeSnippetById(method.exampleSnippetId)
      : null;
    return Object.assign({}, method, {
      docPage: docPage || null,
      exampleSnippet: exampleSnippet || null
    });
  }

  _resolvePlaygroundRun(run) {
    const metrics = (run.metricIds || [])
      .map((id) => this._getMetricById(id))
      .filter(Boolean);
    return Object.assign({}, run, {
      metrics: metrics
    });
  }

  // ---------------------------
  // Interface implementations
  // ---------------------------

  // getDocsHomeOverview
  getDocsHomeOverview() {
    const siteSettingsRecord = this._getSiteSettingsRecord();
    const docPages = this._getFromStorage('doc_pages', []);

    const categoriesOfInterest = [
      'getting_started',
      'api_reference',
      'concepts',
      'guides',
      'sdk',
      'examples_gallery',
      'playground'
    ];

    const overviewSections = docPages
      .filter((p) => categoriesOfInterest.includes(p.category))
      .map((page) => ({
        id: page.id,
        title: page.name,
        description: page.description || '',
        targetDocPageId: page.id,
        category: page.category,
        targetDocPage: page
      }));

    return {
      siteSettings: {
        currentDocsVersionId: siteSettingsRecord.currentDocsVersionId
      },
      overviewSections
    };
  }

  // getAvailableDocsVersions
  getAvailableDocsVersions() {
    const versions = this._getFromStorage('docs_versions', []);
    return versions;
  }

  // switchDocsVersion
  switchDocsVersion(docsVersionId) {
    const siteSettings = this._getSiteSettingsRecord();
    siteSettings.currentDocsVersionId = docsVersionId;
    this._saveSiteSettingsRecord(siteSettings);

    // Update DocsVersion.isCurrent flags if docs_versions exist
    const docsVersions = this._getFromStorage('docs_versions', []);
    if (docsVersions.length > 0) {
      const updated = docsVersions.map((v) =>
        Object.assign({}, v, { isCurrent: v.id === docsVersionId })
      );
      this._saveToStorage('docs_versions', updated);
    }

    return {
      currentDocsVersionId: docsVersionId,
      message: 'Docs version switched.'
    };
  }

  // searchDocs
  searchDocs(query) {
    const q = (query || '').toLowerCase();
    const entries = this._getFromStorage('search_index_entries', []);
    const docPages = this._getFromStorage('doc_pages', []);

    const matched = entries.filter((e) => {
      if (!e.term) return false;
      const term = String(e.term).toLowerCase();
      return term.includes(q) || q.includes(term);
    });

    const resultId = this._generateId('search_result');
    const searchResultRecord = {
      id: resultId,
      query: query,
      entryIds: matched.map((m) => m.id),
      createdAt: new Date().toISOString()
    };

    const existingResults = this._getFromStorage('search_results', []);
    existingResults.push(searchResultRecord);
    this._saveToStorage('search_results', existingResults);

    const results = matched.map((entry) => {
      const doc = docPages.find((d) => d.id === entry.docPageId) || null;
      return {
        entryId: entry.id,
        docPageId: entry.docPageId,
        docPageName: doc ? doc.name : '',
        category: doc ? doc.category : null,
        sectionType: entry.sectionType,
        snippet: entry.snippet || '',
        docPage: doc
      };
    });

    return {
      searchResultId: resultId,
      query: query,
      results
    };
  }

  // getGettingStartedPageContent
  getGettingStartedPageContent() {
    const docPages = this._getFromStorage('doc_pages', []);
    const sidebarItems = this._getFromStorage('sidebar_items', []);

    const docPage =
      docPages.find((p) => p.category === 'getting_started') || null;
    let resolvedSidebarItems = [];

    if (docPage) {
      resolvedSidebarItems = sidebarItems
        .filter(
          (s) =>
            s.parentPageId === docPage.id && s.section === 'getting_started'
        )
        .sort((a, b) => a.order - b.order)
        .map((item) => this._resolveSidebarItem(item));
    }

    const gettingStartedTopics = docPages
      .filter(
        (p) =>
          p.category === 'getting_started' && (!docPage || p.id !== docPage.id)
      )
      .map((p) => ({
        title: p.name,
        summary: p.description || '',
        targetDocPageId: p.id,
        targetDocPage: p
      }));

    return {
      docPage: docPage || null,
      sidebarItems: resolvedSidebarItems,
      gettingStartedTopics
    };
  }

  // getQuickstartTextClassificationPage
  getQuickstartTextClassificationPage() {
    const docPages = this._getFromStorage('doc_pages', []);
    const codeSnippets = this._getFromStorage('code_snippets', []);
    const evalConfigSnippets = this._getFromStorage(
      'evaluation_config_snippets',
      []
    );

    let docPage =
      docPages.find((p) => {
        const name = (p.name || '').toLowerCase();
        return (
          name.includes('quickstart') &&
          name.includes('text') &&
          name.includes('classification')
        );
      }) || null;

    if (!docPage) {
      docPage = docPages.find((p) => p.category === 'getting_started') || null;
    }

    const pageSnippets = docPage
      ? codeSnippets.filter((s) => s.docPageId === docPage.id)
      : [];

    const languageTabs = pageSnippets.map((snippet, index) => ({
      language: snippet.language,
      codeSnippetId: snippet.id,
      isDefault: index === 0 || snippet.language === 'python',
      codeSnippet: this._resolveCodeSnippet(snippet)
    }));

    const resolvedCodeSnippets = pageSnippets.map((s) =>
      this._resolveCodeSnippet(s)
    );

    const evaluationConfigSnippets = evalConfigSnippets
      .filter((e) => pageSnippets.some((s) => s.id === e.codeSnippetId))
      .map((e) => this._resolveEvaluationConfigSnippet(e));

    return {
      docPage: docPage || null,
      languageTabs,
      codeSnippets: resolvedCodeSnippets,
      evaluationConfigSnippets
    };
  }

  // configureQuickstartEvaluation
  configureQuickstartEvaluation(codeSnippetId, metrics, maxSamples, modelId) {
    const codeSnippets = this._getFromStorage('code_snippets', []);
    const evalConfigSnippets = this._getFromStorage(
      'evaluation_config_snippets',
      []
    );

    const snippetIndex = codeSnippets.findIndex(
      (s) => s.id === codeSnippetId
    );
    if (snippetIndex === -1) {
      return {
        updatedCodeSnippet: null,
        updatedEvaluationConfigSnippet: null
      };
    }

    const snippet = codeSnippets[snippetIndex];

    let evalConfig = evalConfigSnippets.find(
      (e) => e.codeSnippetId === codeSnippetId
    );
    if (!evalConfig) {
      evalConfig = {
        id: this._generateId('eval_config_snippet'),
        codeSnippetId: codeSnippetId,
        format: 'python',
        taskType: 'text_classification',
        metrics: metrics || [],
        maxSamples: maxSamples,
        modelId: modelId,
        isQuickstartDefault: false
      };
      evalConfigSnippets.push(evalConfig);
    } else {
      evalConfig.metrics = metrics || [];
      evalConfig.maxSamples = maxSamples;
      evalConfig.modelId = modelId;
    }

    // Render into code
    const newCode = this._renderEvaluationConfigIntoSnippet(
      snippet,
      evalConfig
    );
    const updatedSnippet = Object.assign({}, snippet, { code: newCode });
    codeSnippets[snippetIndex] = updatedSnippet;

    this._saveToStorage('code_snippets', codeSnippets);
    this._saveToStorage('evaluation_config_snippets', evalConfigSnippets);

    const resolvedEvalConfig = this._resolveEvaluationConfigSnippet(evalConfig);

    return {
      updatedCodeSnippet: {
        id: updatedSnippet.id,
        language: updatedSnippet.language,
        code: updatedSnippet.code,
        snippetType: updatedSnippet.snippetType
      },
      updatedEvaluationConfigSnippet: {
        id: resolvedEvalConfig.id,
        metrics: resolvedEvalConfig.metrics,
        maxSamples: resolvedEvalConfig.maxSamples,
        modelId: resolvedEvalConfig.modelId,
        taskType: resolvedEvalConfig.taskType,
        codeSnippet: resolvedEvalConfig.codeSnippet
      }
    };
  }

  // copyCodeSnippet
  copyCodeSnippet(codeSnippetId) {
    const snippets = this._getFromStorage('code_snippets', []);
    const snippet = snippets.find((s) => s.id === codeSnippetId);
    if (!snippet) {
      return { success: false, code: '', message: 'Code snippet not found.' };
    }

    // Instrumentation for task completion tracking
    try {
      // Task 1: track copying of Python quickstart text classification snippet
      if (snippet.language === 'python' && snippet.docPageId) {
        const docPage = this._getDocPageById(snippet.docPageId);
        if (docPage && docPage.category === 'getting_started') {
          const nameLc = (docPage.name || '').toLowerCase();
          if (
            nameLc.includes('quickstart') &&
            nameLc.includes('text') &&
            nameLc.includes('classification')
          ) {
            const evalConfigSnippets = this._getFromStorage(
              'evaluation_config_snippets',
              []
            );
            const evalConfig =
              evalConfigSnippets.find(
                (e) => e.codeSnippetId === snippet.id
              ) || null;
            const event = {
              codeSnippetId: snippet.id,
              docPageId: snippet.docPageId,
              language: snippet.language,
              metrics: evalConfig ? evalConfig.metrics : null,
              maxSamples: evalConfig ? evalConfig.maxSamples : null,
              modelId: evalConfig ? evalConfig.modelId : null,
              copiedAt: new Date().toISOString()
            };
            localStorage.setItem(
              'task1_quickstartCopyEvent',
              JSON.stringify(event)
            );
          }
        }
      }

      // Task 3: track copying of cost metric JSON configuration snippet
      if (snippet.relatedEntityId === 'cost') {
        const code = snippet.code || '';
        let price = null;
        let currency = null;
        let unit = null;

        let parsed = null;
        try {
          parsed = JSON.parse(code);
        } catch (e) {
          parsed = null;
        }

        if (parsed && typeof parsed === 'object') {
          price =
            typeof parsed.price_per_1k_tokens !== 'undefined'
              ? parsed.price_per_1k_tokens
              : null;
          currency =
            typeof parsed.currency !== 'undefined' ? parsed.currency : null;
          unit = typeof parsed.unit !== 'undefined' ? parsed.unit : null;
        } else {
          const extractField = (codeStr, fieldName) => {
            const regex = new RegExp(
              `"${fieldName}"\\s*:\\s*([^,}\\s]+|"[^"]*")`
            );
            const match = codeStr.match(regex);
            if (match && match[1]) {
              let raw = match[1].trim();
              if (raw.startsWith('"') && raw.endsWith('"')) {
                return raw.slice(1, -1);
              }
              const num = parseFloat(raw);
              if (!isNaN(num)) {
                return num;
              }
              return raw;
            }
            return null;
          };
          price = extractField(code, 'price_per_1k_tokens');
          currency = extractField(code, 'currency');
          unit = extractField(code, 'unit');
        }

        const event = {
          codeSnippetId: snippet.id,
          metricId: snippet.relatedEntityId,
          price_per_1k_tokens: price != null ? price : null,
          currency: currency != null ? currency : null,
          unit: unit != null ? unit : null,
          copiedAt: new Date().toISOString()
        };
        localStorage.setItem(
          'task3_costMetricJsonCopyEvent',
          JSON.stringify(event)
        );
      }

      // Task 5: track copying of JavaScript SDK runBatchEvaluation example
      if (
        snippet.id === 'code_sdk_js_run_batch_evaluation' ||
        snippet.relatedEntityId === 'sdk_js_runBatchEvaluation'
      ) {
        const code = snippet.code || '';
        let parsedConcurrency = null;
        const concMatch = code.match(/concurrency\s*:\s*(\d+)/);
        if (concMatch && concMatch[1]) {
          const val = parseInt(concMatch[1], 10);
          if (!isNaN(val)) {
            parsedConcurrency = val;
          }
        }
        const event = {
          codeSnippetId: snippet.id,
          concurrency: parsedConcurrency,
          copiedAt: new Date().toISOString()
        };
        localStorage.setItem(
          'task5_runBatchEvalCopyEvent',
          JSON.stringify(event)
        );
      }
    } catch (e) {
      console.error('Instrumentation error (copyCodeSnippet):', e);
    }

    return {
      success: true,
      code: snippet.code || '',
      message: 'Code snippet copied.'
    };
  }

  // getApiReferenceOverview
  getApiReferenceOverview() {
    const docPages = this._getFromStorage('doc_pages', []);
    const { currentDocsVersionId } = this._getCurrentDocsVersion();
    const groups = this._getFromStorage('api_groups', []);
    const endpoints = this._getFromStorage('api_endpoints', []);

    let docPage =
      docPages.find((p) => p.category === 'api_reference') || null;
    if (!docPage) {
      // Synthesize a minimal API Reference doc page if it does not exist yet
      docPage = {
        id: 'api_reference',
        name: 'API Reference',
        filename: 'api_reference.html',
        description: 'Reference documentation for REST API endpoints.',
        category: 'api_reference',
        primaryFunctions: ['api_reference'],
        isApiVersioned: true,
        hasSidebar: true,
        hasHeaderLinks: true,
        hasFooterLinks: false
      };
      docPages.push(docPage);
      // FIX: Save the updated *array* of docPages, not the single object
      this._saveToStorage('doc_pages', docPages);
    }

    const filteredEndpoints = endpoints.filter(
      (e) => e.apiVersion === currentDocsVersionId
    );
    const groupIdSet = new Set(filteredEndpoints.map((e) => e.groupId));
    const apiGroups = groups.filter((g) => groupIdSet.has(g.id));

    return {
      docPage: docPage || null,
      currentDocsVersionId,
      apiGroups,
      authSummary: '',
      paginationSummary: ''
    };
  }

  // getApiReferenceSidebarData
  getApiReferenceSidebarData() {
    const { currentDocsVersionId } = this._getCurrentDocsVersion();
    const groups = this._getFromStorage('api_groups', []);
    const endpoints = this._getFromStorage('api_endpoints', []);

    // Ensure a v2 Datasets "Create dataset" endpoint exists so it can appear in the sidebar
    if (
      !endpoints.find(
        (e) => e.groupId === 'datasets' && e.apiVersion === 'v2'
      )
    ) {
      endpoints.push({
        id: 'datasets_create_v2',
        groupId: 'datasets',
        name: 'Create dataset (v2)',
        description: 'Create a new dataset using the v2 API.',
        httpMethod: 'post',
        apiVersion: 'v2',
        pathTemplate: '/v2/projects/{project_id}/datasets',
        hasPathParams: true,
        pathParams: ['project_id'],
        queryParams: [],
        requiresRequestBody: true,
        docPageId: 'api_datasets_create_v2'
      });
      this._saveToStorage('api_endpoints', endpoints);

      // Also synthesize a minimal doc page for the datasets endpoint
      const docPages = this._getFromStorage('doc_pages', []);
      if (!docPages.find((p) => p.id === 'api_datasets_create_v2')) {
        docPages.push({
          id: 'api_datasets_create_v2',
          name: 'Create dataset (v2)',
          filename: 'api_datasets_create_v2.html',
          description:
            'API reference for creating datasets with the v2 API.',
          category: 'api_reference',
          primaryFunctions: ['api_endpoint', 'datasets'],
          isApiVersioned: true,
          hasSidebar: true,
          hasHeaderLinks: true,
          hasFooterLinks: false
        });
        this._saveToStorage('doc_pages', docPages);
      }
    }

    const filteredEndpoints = endpoints.filter(
      (e) => e.apiVersion === currentDocsVersionId
    );

    const result = groups
      .map((group) => {
        const eps = filteredEndpoints
          .filter((e) => e.groupId === group.id)
          .map((e) => this._resolveApiEndpoint(e));
        if (eps.length === 0) return null;
        return {
          group,
          endpoints: eps
        };
      })
      .filter(Boolean);

    return result;
  }

  // getApiEndpointPageDetails
  getApiEndpointPageDetails(docPageId) {
    const docPages = this._getFromStorage('doc_pages', []);
    const endpoints = this._getFromStorage('api_endpoints', []);
    const apiExamples = this._getFromStorage('api_examples', []);

    const docPage = docPages.find((d) => d.id === docPageId) || null;
    const endpoint = endpoints.find((e) => e.docPageId === docPageId) || null;

    // If this is the synthetic v2 Create dataset endpoint and no examples exist yet,
    // create a curl request example targeting the v2 path.
    if (endpoint && endpoint.id === 'datasets_create_v2') {
      const hasExample = apiExamples.some(
        (ex) => ex.apiEndpointId === endpoint.id
      );
      if (!hasExample) {
        apiExamples.push({
          id: 'api_example_datasets_create_v2_curl_request',
          apiEndpointId: endpoint.id,
          language: 'curl',
          exampleType: 'request',
          code:
            `curl https://api.aievaldocs.com${endpoint.pathTemplate.replace(
              '{project_id}',
              'proj_123'
            )} \\\n` +
            "  -H 'Authorization: Bearer $AIEVAL_API_KEY' \\\n" +
            "  -H 'Content-Type: application/json' \\\n" +
            "  -d '{name: my_dataset, description: dataset_created_via_v2_api}'",
          isEditable: true,
          hasCopyButton: true
        });
        this._saveToStorage('api_examples', apiExamples);
      }
    }

    const resolvedEndpoint = endpoint ? this._resolveApiEndpoint(endpoint) : null;

    const examples = endpoint
      ? apiExamples
          .filter((ex) => ex.apiEndpointId === endpoint.id)
          .map((ex) => this._resolveApiExample(ex))
      : [];

    return {
      docPage,
      apiEndpoint: resolvedEndpoint,
      examples
    };
  }

  // configureBatchEvaluationCurlExample
  configureBatchEvaluationCurlExample(apiExampleId, projectId, limit, cursor) {
    const examples = this._getFromStorage('api_examples', []);
    const idx = examples.findIndex((e) => e.id === apiExampleId);
    if (idx === -1) {
      return {
        updatedApiExample: null
      };
    }

    const example = examples[idx];
    const newCode = this._generateCurlExampleWithParams(
      example.code || '',
      projectId,
      limit,
      cursor
    );
    const updated = Object.assign({}, example, { code: newCode });
    examples[idx] = updated;
    this._saveToStorage('api_examples', examples);

    return {
      updatedApiExample: {
        id: updated.id,
        language: updated.language,
        exampleType: updated.exampleType,
        code: updated.code
      }
    };
  }

  // copyApiExample
  copyApiExample(apiExampleId) {
    const examples = this._getFromStorage('api_examples', []);
    const ex = examples.find((e) => e.id === apiExampleId);
    if (!ex) {
      return { success: false, code: '', message: 'API example not found.' };
    }

    // Instrumentation for task completion tracking
    try {
      // Pre-resolve example and endpoint for reuse
      let resolvedExample = null;
      let resolvedEndpoint = null;
      try {
        resolvedExample = this._resolveApiExample(ex);
        resolvedEndpoint =
          resolvedExample && resolvedExample.apiEndpoint
            ? resolvedExample.apiEndpoint
            : null;
      } catch (innerErr) {
        resolvedExample = null;
        resolvedEndpoint = null;
      }

      // Task 2: track copying of batch evaluation curl example
      if (ex.language === 'curl' && resolvedEndpoint && resolvedEndpoint.name) {
        const nameLc = String(resolvedEndpoint.name).toLowerCase();
        if (nameLc.includes('batch') && nameLc.includes('evaluation')) {
          const code = ex.code || '';
          let extractedProjectId = null;
          let extractedLimit = null;
          let extractedCursor = null;

          const projectMatch = code.match(/projects\/([^\/\?"'\s]+)/);
          if (projectMatch && projectMatch[1]) {
            extractedProjectId = projectMatch[1];
          }

          const limitMatch = code.match(/[?&]limit=([^&\s'"]+)/);
          if (limitMatch && limitMatch[1]) {
            const num = parseFloat(limitMatch[1]);
            extractedLimit = isNaN(num) ? limitMatch[1] : num;
          }

          const cursorMatch = code.match(/[?&]cursor=([^&\s'"]+)/);
          if (cursorMatch && cursorMatch[1]) {
            try {
              extractedCursor = decodeURIComponent(cursorMatch[1]);
            } catch (decodeErr) {
              extractedCursor = cursorMatch[1];
            }
          }

          const event = {
            apiExampleId: ex.id,
            apiEndpointId: ex.apiEndpointId,
            code: code,
            extractedProjectId: extractedProjectId,
            extractedLimit: extractedLimit,
            extractedCursor: extractedCursor,
            copiedAt: new Date().toISOString()
          };
          localStorage.setItem(
            'task2_batchCurlCopyEvent',
            JSON.stringify(event)
          );
        }
      }

      // Task 7: track copying of v2 dataset creation curl example
      if (
        ex.id === 'api_example_datasets_create_v2_curl_request' ||
        ex.apiEndpointId === 'datasets_create_v2'
      ) {
        let endpointForV2 = resolvedEndpoint;
        if (!endpointForV2) {
          endpointForV2 =
            this._getApiEndpointById(ex.apiEndpointId) || null;
        }
        const event = {
          apiExampleId: ex.id,
          apiEndpointId: ex.apiEndpointId,
          apiVersion: endpointForV2 ? endpointForV2.apiVersion : null,
          pathTemplate: endpointForV2 ? endpointForV2.pathTemplate : null,
          code: ex.code || '',
          copiedAt: new Date().toISOString()
        };
        localStorage.setItem(
          'task7_datasetCreateCurlV2CopyEvent',
          JSON.stringify(event)
        );
      }
    } catch (e) {
      console.error('Instrumentation error (copyApiExample):', e);
    }

    return { success: true, code: ex.code || '', message: 'API example copied.' };
  }

  // getConceptsOverviewPage
  getConceptsOverviewPage() {
    const docPages = this._getFromStorage('doc_pages', []);
    const sidebarItems = this._getFromStorage('sidebar_items', []);

    let docPage = docPages.find((p) => p.category === 'concepts') || null;
    if (!docPage) {
      docPage = {
        id: 'concepts_overview',
        name: 'Concepts',
        filename: 'concepts_overview.html',
        description:
          'Conceptual guides for evaluations, metrics, and datasets.',
        category: 'concepts',
        primaryFunctions: ['concepts_overview'],
        isApiVersioned: false,
        hasSidebar: true,
        hasHeaderLinks: true,
        hasFooterLinks: false
      };
      docPages.push(docPage);
      this._saveToStorage('doc_pages', docPages);
    }

    const resolvedSidebarItems = docPage
      ? sidebarItems
          .filter(
            (s) => s.parentPageId === docPage.id && s.section === 'concepts'
          )
          .sort((a, b) => a.order - b.order)
          .map((item) => this._resolveSidebarItem(item))
      : [];

    const conceptTopics = docPages
      .filter(
        (p) =>
          p.category === 'concepts' && (!docPage || p.id !== docPage.id)
      )
      .map((p) => ({
        title: p.name,
        summary: p.description || '',
        targetDocPageId: p.id,
        targetDocPage: p
      }));

    return {
      docPage: docPage || null,
      sidebarItems: resolvedSidebarItems,
      conceptTopics
    };
  }

  // getMetricsOverviewPage
  getMetricsOverviewPage() {
    const docPages = this._getFromStorage('doc_pages', []);
    const metricsRaw = this._getFromStorage('metrics', []);

    let docPage =
      docPages.find((p) => p.category === 'metrics_overview') || null;
    if (!docPage) {
      docPage = {
        id: 'metrics_overview',
        name: 'Metrics overview',
        filename: 'metrics_overview.html',
        description:
          'Overview of available evaluation metrics, including billing-related metrics.',
        category: 'metrics_overview',
        primaryFunctions: ['metrics_overview'],
        isApiVersioned: false,
        hasSidebar: false,
        hasHeaderLinks: true,
        hasFooterLinks: false
      };
      docPages.push(docPage);
      this._saveToStorage('doc_pages', docPages);
    }

    // Ensure a billing-related cost metric and BLEU metric exist
    const existingIds = new Set(metricsRaw.map((m) => m.id));
    if (!existingIds.has('cost')) {
      metricsRaw.push({
        id: 'cost',
        displayName: 'Cost',
        shortDescription: 'Tracks token-based cost for evaluations.',
        category: 'billing',
        supportsWeight: false,
        isTokenBillingRelated: true,
        metricDetailPageId: 'metric_cost'
      });
    }
    if (!existingIds.has('bleu')) {
      metricsRaw.push({
        id: 'bleu',
        displayName: 'BLEU',
        shortDescription:
          'Bilingual Evaluation Understudy score for text generation quality.',
        category: 'generation',
        supportsWeight: true,
        isTokenBillingRelated: false,
        metricDetailPageId: 'concepts_metrics'
      });
    }

    // Ensure a doc page exists for the cost metric detail
    if (!docPages.find((p) => p.id === 'metric_cost')) {
      const metricCostPage = {
        id: 'metric_cost',
        name: 'Cost metric',
        filename: 'metric_cost.html',
        description:
          'Configuration and usage details for the token-based cost metric.',
        category: 'concepts',
        primaryFunctions: ['metric_detail', 'cost'],
        isApiVersioned: false,
        hasSidebar: false,
        hasHeaderLinks: true,
        hasFooterLinks: false
      };
      docPages.push(metricCostPage);
      this._saveToStorage('doc_pages', docPages);
    }

    this._saveToStorage('metrics', metricsRaw);

    const metrics = metricsRaw.map((m) => this._resolveMetric(m));
    const billingMetricIds = metrics
      .filter((m) => m.isTokenBillingRelated)
      .map((m) => m.id);

    return {
      docPage: docPage || null,
      metrics,
      billingMetricIds
    };
  }

  // getMetricDetailPage
  getMetricDetailPage(metricId) {
    const metrics = this._getFromStorage('metrics', []);
    const codeSnippets = this._getFromStorage('code_snippets', []);

    const metric = metrics.find((m) => m.id === metricId) || null;
    const resolvedMetric = metric ? this._resolveMetric(metric) : null;

    const docPage =
      resolvedMetric && resolvedMetric.metricDetailPage
        ? resolvedMetric.metricDetailPage
        : null;

    const configSnippets = codeSnippets
      .filter((s) => s.relatedEntityId === metricId)
      .map((s) => this._resolveCodeSnippet(s));

    return {
      metric: resolvedMetric,
      docPage,
      configSnippets
    };
  }

  // configureCostMetricJsonConfig
  configureCostMetricJsonConfig(codeSnippetId, pricePer1kTokens, currency, unit) {
    const snippets = this._getFromStorage('code_snippets', []);
    const idx = snippets.findIndex((s) => s.id === codeSnippetId);
    if (idx === -1) {
      return {
        updatedCodeSnippet: null
      };
    }

    const snippet = snippets[idx];
    let code = snippet.code || '';
    let parsed = null;
    try {
      parsed = JSON.parse(code);
    } catch (e) {
      parsed = null;
    }

    if (parsed && typeof parsed === 'object') {
      parsed.price_per_1k_tokens = pricePer1kTokens;
      parsed.currency = currency;
      parsed.unit = unit;
      code = JSON.stringify(parsed, null, 2);
    } else {
      // Fallback: naive string replacement
      const ensureField = (fieldName, valueStr) => {
        const regex = new RegExp(`"${fieldName}"\\s*:\\s*[^,}]+`);
        if (regex.test(code)) {
          code = code.replace(regex, `"${fieldName}": ${valueStr}`);
        }
      };
      ensureField('price_per_1k_tokens', String(pricePer1kTokens));
      ensureField('currency', `"${currency}"`);
      ensureField('unit', `"${unit}"`);
    }

    const updated = Object.assign({}, snippet, { code });
    snippets[idx] = updated;
    this._saveToStorage('code_snippets', snippets);

    return {
      updatedCodeSnippet: {
        id: updated.id,
        language: updated.language,
        code: updated.code
      }
    };
  }

  // getGuidesOverviewPage
  getGuidesOverviewPage() {
    const docPages = this._getFromStorage('doc_pages', []);
    const sidebarItems = this._getFromStorage('sidebar_items', []);

    let docPage = docPages.find((p) => p.category === 'guides') || null;
    if (!docPage) {
      docPage = {
        id: 'guides_overview',
        name: 'Guides',
        filename: 'guides_overview.html',
        description:
          'Step-by-step guides for configuring and running evaluations.',
        category: 'guides',
        primaryFunctions: ['guides_overview'],
        isApiVersioned: false,
        hasSidebar: true,
        hasHeaderLinks: true,
        hasFooterLinks: false
      };
      docPages.push(docPage);
      this._saveToStorage('doc_pages', docPages);
    }

    const resolvedSidebarItems = docPage
      ? sidebarItems
          .filter(
            (s) => s.parentPageId === docPage.id && s.section === 'guides'
          )
          .sort((a, b) => a.order - b.order)
          .map((item) => this._resolveSidebarItem(item))
      : [];

    const guides = docPages
      .filter((p) => p.category === 'guides')
      .map((p) => ({
        title: p.name,
        summary: p.description || '',
        targetDocPageId: p.id,
        isConfigBuilder:
          (p.name || '').toLowerCase().includes('config builder') ||
          p.category === 'guide_config_builder',
        targetDocPage: p
      }));

    return {
      docPage: docPage || null,
      sidebarItems: resolvedSidebarItems,
      guides
    };
  }

  // getConfigBuilderState
  getConfigBuilderState() {
    const rawState = this._getConfigBuilderStateRecord();
    const resolvedState = this._resolveConfigBuilderState(rawState);
    const modelVariants = this._getFromStorage('model_variants', [])
      .filter((v) => v.configBuilderStateId === rawState.id)
      .map((v) => this._resolveModelVariant(v));
    const availableMetrics = this._getFromStorage('metrics', []).map((m) =>
      this._resolveMetric(m)
    );

    return {
      configBuilderState: resolvedState,
      modelVariants,
      availableMetrics
    };
  }

  // updateConfigBuilderTaskType
  updateConfigBuilderTaskType(taskType) {
    const state = this._getConfigBuilderStateRecord();
    state.taskType = taskType;
    this._saveConfigBuilderStateRecord(state);
    const resolved = this._resolveConfigBuilderState(state);
    return {
      configBuilderState: {
        id: resolved.id,
        taskType: resolved.taskType
      }
    };
  }

  // setConfigBuilderModels
  setConfigBuilderModels(models) {
    const state = this._getConfigBuilderStateRecord();
    const allVariants = this._getFromStorage('model_variants', []);

    const remaining = allVariants.filter(
      (v) => v.configBuilderStateId !== state.id
    );
    const newVariants = (models || []).map((m) => ({
      id: this._generateId('model_variant'),
      configBuilderStateId: state.id,
      modelId: m.modelId,
      role: m.role,
      temperature: m.temperature
    }));

    const merged = remaining.concat(newVariants);
    this._saveToStorage('model_variants', merged);

    const resolved = newVariants.map((v) => this._resolveModelVariant(v));
    return {
      modelVariants: resolved
    };
  }

  // updateConfigBuilderEvaluationSettings
  updateConfigBuilderEvaluationSettings(maxSamples, selectedMetricIds) {
    const state = this._getConfigBuilderStateRecord();
    if (typeof maxSamples !== 'undefined') {
      state.maxSamples = maxSamples;
    }
    if (typeof selectedMetricIds !== 'undefined') {
      state.selectedMetricIds = selectedMetricIds || [];
    }
    this._saveConfigBuilderStateRecord(state);
    const resolved = this._resolveConfigBuilderState(state);
    return {
      configBuilderState: {
        id: resolved.id,
        maxSamples: resolved.maxSamples,
        selectedMetricIds: resolved.selectedMetricIds
      }
    };
  }

  // generateConfigFromBuilder
  generateConfigFromBuilder() {
    const state = this._getConfigBuilderStateRecord();
    const variants = this._getFromStorage('model_variants', []).filter(
      (v) => v.configBuilderStateId === state.id
    );

    const config = {
      task_type: state.taskType,
      max_samples: state.maxSamples,
      metrics: state.selectedMetricIds || [],
      models: variants.map((v) => ({
        model_id: v.modelId,
        role: v.role,
        temperature: v.temperature
      }))
    };

    const docPages = this._getFromStorage('doc_pages', []);
    const configBuilderPage =
      docPages.find((p) => p.category === 'guide_config_builder') || null;

    const snippet = {
      id: this._generateId('code_snippet'),
      docPageId: configBuilderPage
        ? configBuilderPage.id
        : 'config_builder_virtual',
      sectionId: null,
      language: 'json',
      snippetType: 'config_builder_output',
      code: JSON.stringify(config, null, 2),
      relatedEntityId: state.id,
      hasCopyButton: true,
      isEditable: false
    };

    const snippets = this._getFromStorage('code_snippets', []);
    snippets.push(snippet);
    this._saveToStorage('code_snippets', snippets);

    state.generatedConfigSnippetId = snippet.id;
    this._saveConfigBuilderStateRecord(state);

    return {
      generatedConfigSnippet: {
        id: snippet.id,
        language: snippet.language,
        snippetType: snippet.snippetType,
        code: snippet.code
      },
      configBuilderStateId: state.id
    };
  }

  // getJavascriptSdkPage
  getJavascriptSdkPage() {
    const docPages = this._getFromStorage('doc_pages', []);
    const sdkMethodsRaw = this._getFromStorage('sdk_methods', []);
    const codeSnippetsRaw = this._getFromStorage('code_snippets', []);

    // Ensure a JavaScript SDK doc page exists
    let docPage =
      docPages.find(
        (p) =>
          p.category === 'sdk' &&
          (p.name || '').toLowerCase().includes('javascript')
      ) || docPages.find((p) => p.category === 'sdk') || null;

    if (!docPage) {
      docPage = {
        id: 'sdk_javascript',
        name: 'JavaScript SDK',
        filename: 'sdk_javascript.html',
        description: 'Reference and examples for the JavaScript SDK.',
        category: 'sdk',
        primaryFunctions: ['sdk', 'javascript'],
        isApiVersioned: false,
        hasSidebar: false,
        hasHeaderLinks: true,
        hasFooterLinks: false
      };
      docPages.push(docPage);
      this._saveToStorage('doc_pages', docPages);
    }

    // Ensure a runBatchEvaluation example snippet exists for the JavaScript SDK
    const runBatchSnippetId = 'code_sdk_js_run_batch_evaluation';
    if (!codeSnippetsRaw.find((s) => s.id === runBatchSnippetId)) {
      codeSnippetsRaw.push({
        id: runBatchSnippetId,
        docPageId: docPage.id,
        sectionId: 'run_batch_evaluation',
        language: 'javascript',
        snippetType: 'sdk_example',
        code:
          "const { runBatchEvaluation } = require('@aieval/sdk');\n\n" +
          'async function main() {\n' +
          "  await runBatchEvaluation('proj_js_sdk_samples', 'ds_tc_reviews_small', { concurrency: 4 });\n" +
          '}\n\n' +
          'main();',
        relatedEntityId: 'sdk_js_runBatchEvaluation',
        hasCopyButton: true,
        isEditable: true
      });
      this._saveToStorage('code_snippets', codeSnippetsRaw);
    }

    const sdkMethods = sdkMethodsRaw
      .filter((m) => m.sdkName === 'javascript_sdk')
      .map((m) => this._resolveSdkMethod(m));

    const codeSnippets = docPage
      ? codeSnippetsRaw
          .filter((s) => s.docPageId === docPage.id)
          .map((s) => this._resolveCodeSnippet(s))
      : [];

    return {
      docPage: docPage || null,
      sdkMethods,
      codeSnippets
    };
  }

  // configureRunBatchEvaluationExample
  configureRunBatchEvaluationExample(codeSnippetId, concurrency) {
    const snippets = this._getFromStorage('code_snippets', []);
    const idx = snippets.findIndex((s) => s.id === codeSnippetId);
    if (idx === -1) {
      return {
        updatedCodeSnippet: null
      };
    }

    const snippet = snippets[idx];
    const newCode = this._setConcurrencyInJsSnippet(
      snippet.code || '',
      concurrency
    );
    const updated = Object.assign({}, snippet, { code: newCode });
    snippets[idx] = updated;
    this._saveToStorage('code_snippets', snippets);

    return {
      updatedCodeSnippet: {
        id: updated.id,
        language: updated.language,
        code: updated.code
      }
    };
  }

  // getExamplesGalleryPage
  getExamplesGalleryPage() {
    const docPages = this._getFromStorage('doc_pages', []);
    const metrics = this._getFromStorage('metrics', []);
    const examplesRaw = this._getFromStorage('evaluation_examples', []);

    let docPage =
      docPages.find((p) => p.category === 'examples_gallery') || null;
    if (!docPage) {
      docPage = {
        id: 'examples_gallery',
        name: 'Examples gallery',
        filename: 'examples_gallery.html',
        description:
          'Collection of example evaluations you can replicate and modify.',
        category: 'examples_gallery',
        primaryFunctions: ['examples_gallery'],
        isApiVersioned: false,
        hasSidebar: false,
        hasHeaderLinks: true,
        hasFooterLinks: false
      };
      docPages.push(docPage);
      this._saveToStorage('doc_pages', docPages);
    }

    const filterState = this._getExamplesFilterStateRecord();
    const resolvedFilterState = Object.assign({}, filterState, {
      selectedMetric: filterState.selectedMetricId
        ? this._getMetricById(filterState.selectedMetricId)
        : null
    });

    const availableMetrics = metrics.map((m) => this._resolveMetric(m));
    const examples = examplesRaw.map((ex) =>
      this._resolveEvaluationExample(ex)
    );

    return {
      docPage: docPage || null,
      filterState: resolvedFilterState,
      availableMetrics,
      examples
    };
  }

  // updateExamplesGalleryFilters
  updateExamplesGalleryFilters(selectedMetricId, minDatasetSize) {
    const state = this._getExamplesFilterStateRecord();
    if (typeof selectedMetricId !== 'undefined') {
      state.selectedMetricId = selectedMetricId;
    }
    if (typeof minDatasetSize !== 'undefined') {
      state.minDatasetSize = minDatasetSize;
    }
    this._persistExamplesGalleryFilterState(state);

    const resolved = Object.assign({}, state, {
      selectedMetric: state.selectedMetricId
        ? this._getMetricById(state.selectedMetricId)
        : null
    });

    return {
      filterState: resolved
    };
  }

  // getFilteredEvaluationExamples
  getFilteredEvaluationExamples() {
    const state = this._getExamplesFilterStateRecord();
    const examples = this._getFromStorage('evaluation_examples', []);

    const filtered = examples
      .filter((ex) => {
        if (state.selectedMetricId) {
          if (
            !Array.isArray(ex.metricIds) ||
            !ex.metricIds.includes(state.selectedMetricId)
          ) {
            return false;
          }
        }
        if (typeof state.minDatasetSize === 'number') {
          if (
            typeof ex.datasetSize !== 'number' ||
            ex.datasetSize < state.minDatasetSize
          ) {
            return false;
          }
        }
        return true;
      })
      .map((ex) => this._resolveEvaluationExample(ex));

    return filtered;
  }

  // getEvaluationExampleDetail
  getEvaluationExampleDetail(evaluationExampleId) {
    const example = this._getEvaluationExampleById(evaluationExampleId);
    if (!example) {
      return {
        evaluationExample: null,
        exampleDetailPage: null,
        codeSnippets: []
      };
    }

    const resolvedExample = this._resolveEvaluationExample(example);
    const exampleDetailPage = resolvedExample.exampleDetailPage || null;

    const codeSnippetsRaw = this._getFromStorage('code_snippets', []);
    const codeSnippets = exampleDetailPage
      ? codeSnippetsRaw
          .filter((s) => s.docPageId === exampleDetailPage.id)
          .map((s) => this._resolveCodeSnippet(s))
      : [];

    return {
      evaluationExample: resolvedExample,
      exampleDetailPage,
      codeSnippets
    };
  }

  // copyEvaluationExampleEndpointPath
  copyEvaluationExampleEndpointPath(evaluationExampleId) {
    const example = this._getEvaluationExampleById(evaluationExampleId);
    if (!example || !example.endpointPath) {
      return {
        success: false,
        endpointPath: '',
        message: 'Endpoint path not found.'
      };
    }

    // Instrumentation for task completion tracking
    try {
      const state = this._getExamplesFilterStateRecord();
      const filteredExamples = this.getFilteredEvaluationExamples() || [];
      let idxInFilteredList = -1;
      for (let i = 0; i < filteredExamples.length; i++) {
        const ex = filteredExamples[i];
        if (ex && ex.id === evaluationExampleId) {
          idxInFilteredList = i;
          break;
        }
      }
      const event = {
        evaluationExampleId: evaluationExampleId,
        endpointPath: example.endpointPath,
        filterStateAtCopy: {
          selectedMetricId: state.selectedMetricId,
          minDatasetSize: state.minDatasetSize
        },
        filteredIndex: idxInFilteredList,
        copiedAt: new Date().toISOString()
      };
      localStorage.setItem(
        'task6_bleuExampleEndpointCopyEvent',
        JSON.stringify(event)
      );
    } catch (e) {
      console.error(
        'Instrumentation error (copyEvaluationExampleEndpointPath):',
        e
      );
    }

    return {
      success: true,
      endpointPath: example.endpointPath,
      message: 'Endpoint path copied.'
    };
  }

  // getPlaygroundPageConfig
  getPlaygroundPageConfig() {
    const docPages = this._getFromStorage('doc_pages', []);
    const metrics = this._getFromStorage('metrics', []);

    let docPage = docPages.find((p) => p.category === 'playground') || null;
    if (!docPage) {
      docPage = {
        id: 'playground',
        name: 'Playground',
        filename: 'playground.html',
        description:
          'Interactive playground for running quick evaluation experiments.',
        category: 'playground',
        primaryFunctions: ['playground'],
        isApiVersioned: false,
        hasSidebar: false,
        hasHeaderLinks: true,
        hasFooterLinks: false
      };
      docPages.push(docPage);
      this._saveToStorage('doc_pages', docPages);
    }
    const availableTaskTypes = ['text_classification', 'text_generation'];
    const availableMetrics = metrics.map((m) => this._resolveMetric(m));

    // No separate model storage; return empty by default
    const defaultModelIds = [];

    return {
      docPage: docPage || null,
      availableTaskTypes,
      availableMetrics,
      defaultModelIds
    };
  }

  // createPlaygroundEvaluationRun
  createPlaygroundEvaluationRun(
    taskType,
    prompt,
    accuracyWeight,
    latencyWeight,
    metricIds,
    sampleSize,
    evaluationName,
    modelId
  ) {
    const run = this._createPlaygroundRunRecord({
      taskType,
      prompt,
      accuracyWeight,
      latencyWeight,
      metricIds,
      sampleSize,
      evaluationName,
      modelId
    });

    const resolvedRun = this._resolvePlaygroundRun(run);

    return {
      playgroundEvaluationRun: resolvedRun
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const docPages = this._getFromStorage('doc_pages', []);
    const docPage = docPages.find((p) => p.category === 'about') || null;

    return {
      docPage: docPage || null,
      content: '',
      keySectionDocPageIds: []
    };
  }

  // getSupportPageContent
  getSupportPageContent() {
    const docPages = this._getFromStorage('doc_pages', []);
    const docPage = docPages.find((p) => p.category === 'support') || null;

    return {
      docPage: docPage || null,
      supportChannels: [],
      troubleshootingSections: []
    };
  }

  // getAvailableDocsVersions is implemented above
  // getApiReferenceOverview implemented above
  // getPlaygroundPageConfig implemented above
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}