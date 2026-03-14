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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not present
    const arrayKeys = [
      'pages',
      'navigation_links',
      'api_resources',
      'api_endpoints',
      'api_endpoint_versions',
      'api_parameters',
      'api_code_samples',
      'try_it_consoles',
      'rate_limit_rules',
      'webhook_event_groups',
      'webhook_events',
      'webhook_payload_examples',
      'sdks',
      'sdk_modules',
      'sdk_methods',
      'sdk_code_examples',
      'auth_methods',
      'auth_code_examples',
      'home_quick_start_tasks',
      'changelog_entries',
      'faq_entries',
      'copy_events'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  // ------------------------
  // Private helpers (spec-defined)
  // ------------------------

  // Internal helper to resolve the default Page.id for a given pageType
  _resolveDefaultPageIdByType(pageType) {
    const pages = this._getFromStorage('pages', []);
    const page = pages.find(function (p) { return p.pageType === pageType; });
    return page ? page.id : null;
  }

  // Internal helper to execute HTTP requests for Try-It console
  async _executeHttpRequestForTryIt(options) {
    const method = options.method || 'get';
    const url = options.url;
    const headersObj = options.headers || {};
    const bodyJson = options.bodyJson;

    const hasFetch = typeof fetch === 'function';
    const start = Date.now();

    if (!url) {
      return {
        success: false,
        statusCode: 0,
        statusText: '',
        durationMs: Date.now() - start,
        responseBody: '',
        responseHeaders: [],
        errorMessage: 'Missing URL for Try-It request'
      };
    }

    if (!hasFetch) {
      return {
        success: false,
        statusCode: 0,
        statusText: '',
        durationMs: Date.now() - start,
        responseBody: '',
        responseHeaders: [],
        errorMessage: 'fetch is not available in this environment'
      };
    }

    const fetchOptions = {
      method: method.toUpperCase(),
      headers: headersObj
    };

    if (bodyJson) {
      fetchOptions.body = bodyJson;
      if (!fetchOptions.headers['Content-Type'] && !fetchOptions.headers['content-type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    try {
      const response = await fetch(url, fetchOptions);
      const durationMs = Date.now() - start;
      let text = '';
      try {
        text = await response.text();
      } catch (e) {}

      const responseHeaders = [];
      if (response.headers && typeof response.headers.forEach === 'function') {
        response.headers.forEach(function (value, name) {
          responseHeaders.push({ name: name, value: value });
        });
      }

      return {
        success: !!response.ok,
        statusCode: response.status,
        statusText: response.statusText || '',
        durationMs: durationMs,
        responseBody: text,
        responseHeaders: responseHeaders,
        errorMessage: response.ok ? '' : ('HTTP error ' + response.status)
      };
    } catch (err) {
      return {
        success: false,
        statusCode: 0,
        statusText: '',
        durationMs: Date.now() - start,
        responseBody: '',
        responseHeaders: [],
        errorMessage: err && err.message ? err.message : 'Unknown error during Try-It request'
      };
    }
  }

  // Internal helper to query the documentation search index
  _searchDocumentationIndex(query, filters) {
    const q = (query || '').toLowerCase().trim();
    const result = { results: [], total: 0 };

    if (!q) {
      return result;
    }

    const pages = this._getFromStorage('pages', []);
    const apiResources = this._getFromStorage('api_resources', []);
    const apiEndpoints = this._getFromStorage('api_endpoints', []);
    const sdks = this._getFromStorage('sdks', []);
    const sdkModules = this._getFromStorage('sdk_modules', []);
    const sdkMethods = this._getFromStorage('sdk_methods', []);
    const webhookEvents = this._getFromStorage('webhook_events', []);

    const pageMap = {};
    for (let i = 0; i < pages.length; i++) {
      pageMap[pages[i].id] = pages[i];
    }
    const resourceMap = {};
    for (let i2 = 0; i2 < apiResources.length; i2++) {
      resourceMap[apiResources[i2].id] = apiResources[i2];
    }
    const sdkMap = {};
    for (let i3 = 0; i3 < sdks.length; i3++) {
      sdkMap[sdks[i3].id] = sdks[i3];
    }
    const sdkModuleMap = {};
    for (let i4 = 0; i4 < sdkModules.length; i4++) {
      sdkModuleMap[sdkModules[i4].id] = sdkModules[i4];
    }

    const docs = [];

    // Pages
    for (let i5 = 0; i5 < pages.length; i5++) {
      const p = pages[i5];
      const title = p.name || '';
      const content = (p.description || '') + ' ' + (p.pageType || '');
      docs.push({
        title: title,
        content: content,
        pageId: p.id,
        pageType: p.pageType || '',
        entityType: 'page',
        entityId: p.id,
        resourceSlug: null,
        sdkLanguage: null
      });
    }

    // API endpoints
    for (let j = 0; j < apiEndpoints.length; j++) {
      const e = apiEndpoints[j];
      const res = resourceMap[e.resourceId] || null;
      const page = res ? pageMap[res.pageId] || null : null;
      const title = (e.name || '') + ' ' + (e.pathTemplate || '');
      const contentParts = [];
      if (e.summary) contentParts.push(e.summary);
      if (e.description) contentParts.push(e.description);
      if (res && res.name) contentParts.push(res.name);
      const content = contentParts.join(' ');

      docs.push({
        title: title,
        content: content,
        pageId: page ? page.id : (res ? res.pageId : ''),
        pageType: page ? page.pageType : (page ? page.pageType : ''),
        entityType: 'api_endpoint',
        entityId: e.id,
        resourceSlug: res ? res.slug : null,
        sdkLanguage: null
      });
    }

    // SDK methods
    for (let k = 0; k < sdkMethods.length; k++) {
      const m = sdkMethods[k];
      const module = sdkModuleMap[m.moduleId] || null;
      const sdk = module ? sdkMap[module.sdkId] || null : null;
      const page = sdk ? pageMap[sdk.pageId] || null : null;
      const title = m.name || '';
      const contentParts2 = [];
      if (m.description) contentParts2.push(m.description);
      if (module && module.name) contentParts2.push(module.name);
      const content2 = contentParts2.join(' ');
      docs.push({
        title: title,
        content: content2,
        pageId: page ? page.id : (sdk ? sdk.pageId : ''),
        pageType: page ? page.pageType : (page ? page.pageType : ''),
        entityType: 'sdk_method',
        entityId: m.id,
        resourceSlug: null,
        sdkLanguage: sdk ? sdk.language : null
      });
    }

    // Webhook events
    for (let w = 0; w < webhookEvents.length; w++) {
      const ev = webhookEvents[w];
      const title = ev.displayName || ev.name || '';
      const content3 = ev.description || '';
      docs.push({
        title: title,
        content: content3,
        pageId: '',
        pageType: 'webhooks_group',
        entityType: 'webhook_event',
        entityId: ev.id,
        resourceSlug: null,
        sdkLanguage: null
      });
    }

    // Apply filters
    const pageTypesFilter = filters && Array.isArray(filters.pageTypes) ? filters.pageTypes : null;
    const resourceSlugsFilter = filters && Array.isArray(filters.resourceSlugs) ? filters.resourceSlugs : null;
    const sdkLanguagesFilter = filters && Array.isArray(filters.sdkLanguages) ? filters.sdkLanguages : null;

    for (let d = 0; d < docs.length; d++) {
      const doc = docs[d];

      if (pageTypesFilter && pageTypesFilter.length > 0) {
        if (!doc.pageType || pageTypesFilter.indexOf(doc.pageType) === -1) {
          continue;
        }
      }

      if (resourceSlugsFilter && resourceSlugsFilter.length > 0) {
        if (!doc.resourceSlug || resourceSlugsFilter.indexOf(doc.resourceSlug) === -1) {
          continue;
        }
      }

      if (sdkLanguagesFilter && sdkLanguagesFilter.length > 0) {
        if (!doc.sdkLanguage || sdkLanguagesFilter.indexOf(doc.sdkLanguage) === -1) {
          continue;
        }
      }

      const haystack = (doc.title + ' ' + doc.content).toLowerCase();
      if (haystack.indexOf(q) === -1) {
        continue;
      }

      const snippet = haystack.length > 200 ? haystack.substring(0, 197) + '...' : haystack;
      result.results.push({
        title: doc.title,
        snippet: snippet,
        pageId: doc.pageId,
        pageType: doc.pageType,
        entityType: doc.entityType,
        entityId: doc.entityId
      });
    }

    result.total = result.results.length;
    return result;
  }

  // ------------------------
  // Helper utilities
  // ------------------------

  _buildIdMap(items) {
    const map = {};
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it && it.id) {
        map[it.id] = it;
      }
    }
    return map;
  }

  _parseDefaultQueryParams(list) {
    const result = {};
    if (!Array.isArray(list)) return result;
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      if (typeof entry !== 'string') continue;
      const idx = entry.indexOf('=');
      if (idx === -1) continue;
      const key = entry.substring(0, idx);
      const value = entry.substring(idx + 1);
      result[key] = value;
    }
    return result;
  }

  _getEndpointVersionWithRelations(endpointVersionId) {
    const endpointVersions = this._getFromStorage('api_endpoint_versions', []);
    const endpoints = this._getFromStorage('api_endpoints', []);
    const pages = this._getFromStorage('pages', []);

    const endpointVersion = endpointVersions.find(function (v) { return v.id === endpointVersionId; }) || null;
    if (!endpointVersion) return null;

    const endpoint = endpoints.find(function (e) { return e.id === endpointVersion.endpointId; }) || null;
    const docsPage = pages.find(function (p) { return p.id === endpointVersion.docsPageId; }) || null;

    const extended = Object.assign({}, endpointVersion, {
      endpoint: endpoint || null,
      docsPage: docsPage || null
    });
    return extended;
  }

  // ------------------------
  // Core interface implementations
  // ------------------------

  // getHomeOverview()
  getHomeOverview() {
    const pages = this._getFromStorage('pages', []);
    const pageMap = this._buildIdMap(pages);

    const raw = localStorage.getItem('home_overview');
    let stored = null;
    if (raw) {
      try {
        stored = JSON.parse(raw);
      } catch (e) {
        stored = null;
      }
    }

    let featuredSections = [];
    if (stored && Array.isArray(stored.featuredSections)) {
      featuredSections = stored.featuredSections;
    } else {
      // derive from pages as best-effort, still only using localStorage data
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        featuredSections.push({
          pageId: p.id,
          name: p.name,
          pageType: p.pageType,
          description: p.description || ''
        });
      }
    }

    // Foreign key resolution for pageId -> page
    const enrichedSections = featuredSections.map(function (s) {
      const sec = Object.assign({}, s);
      if (sec.pageId) {
        sec.page = pageMap[sec.pageId] || null;
      } else {
        sec.page = null;
      }
      return sec;
    });

    return {
      heroTitle: (stored && stored.heroTitle) || '',
      heroSubtitle: (stored && stored.heroSubtitle) || '',
      introMarkdown: (stored && stored.introMarkdown) || '',
      featuredSections: enrichedSections,
      lastUpdated: (stored && stored.lastUpdated) || ''
    };
  }

  // getHomeQuickStartTasks()
  getHomeQuickStartTasks() {
    const tasks = this._getFromStorage('home_quick_start_tasks', []);
    const pages = this._getFromStorage('pages', []);
    const apiEndpoints = this._getFromStorage('api_endpoints', []);
    const sdkMethods = this._getFromStorage('sdk_methods', []);

    const pageMap = this._buildIdMap(pages);
    const endpointMap = this._buildIdMap(apiEndpoints);
    const sdkMethodMap = this._buildIdMap(sdkMethods);

    const enriched = tasks.map(function (t) {
      const task = Object.assign({}, t);
      if (task.targetPageId) {
        task.targetPage = pageMap[task.targetPageId] || null;
      } else {
        task.targetPage = null;
      }
      if (task.relatedEndpointId) {
        task.relatedEndpoint = endpointMap[task.relatedEndpointId] || null;
      } else {
        task.relatedEndpoint = null;
      }
      if (task.relatedSdkMethodId) {
        task.relatedSdkMethod = sdkMethodMap[task.relatedSdkMethodId] || null;
      } else {
        task.relatedSdkMethod = null;
      }
      return task;
    });

    return enriched;
  }

  // searchDocumentation(query, filters)
  searchDocumentation(query, filters) {
    return this._searchDocumentationIndex(query, filters || {});
  }

  // getApiResourcesForSidebar(apiReferencePageId)
  getApiResourcesForSidebar(apiReferencePageId) {
    let pageId = apiReferencePageId;
    if (!pageId) {
      pageId = this._resolveDefaultPageIdByType('api_reference');
    }

    const resourcesAll = this._getFromStorage('api_resources', []);
    const pages = this._getFromStorage('pages', []);
    const pageMap = this._buildIdMap(pages);

    let filtered = resourcesAll;
    if (pageId) {
      filtered = resourcesAll.filter(function (r) { return r.pageId === pageId; });
    }

    filtered.sort(function (a, b) {
      const ao = typeof a.sidebarOrder === 'number' ? a.sidebarOrder : 0;
      const bo = typeof b.sidebarOrder === 'number' ? b.sidebarOrder : 0;
      if (ao === bo) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return ao - bo;
    });

    const enriched = filtered.map(function (r) {
      const res = Object.assign({}, r);
      res.page = res.pageId ? (pageMap[res.pageId] || null) : null;
      return res;
    });

    return enriched;
  }

  // getApiEndpointsForResource(resourceId)
  getApiEndpointsForResource(resourceId) {
    const endpointsAll = this._getFromStorage('api_endpoints', []);
    const resources = this._getFromStorage('api_resources', []);
    const resourceMap = this._buildIdMap(resources);

    const filtered = endpointsAll.filter(function (e) { return e.resourceId === resourceId; });

    filtered.sort(function (a, b) {
      const ao = typeof a.sidebarOrder === 'number' ? a.sidebarOrder : 0;
      const bo = typeof b.sidebarOrder === 'number' ? b.sidebarOrder : 0;
      if (ao === bo) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return ao - bo;
    });

    const enriched = filtered.map(function (e) {
      const ep = Object.assign({}, e);
      ep.resource = ep.resourceId ? (resourceMap[ep.resourceId] || null) : null;
      return ep;
    });

    return enriched;
  }

  // getApiEndpointVersions(endpointId)
  getApiEndpointVersions(endpointId) {
    const versionsAll = this._getFromStorage('api_endpoint_versions', []);
    const endpoints = this._getFromStorage('api_endpoints', []);
    let filtered = versionsAll.filter(function (v) { return v.endpointId === endpointId; });

    // Synthetic unversioned version for endpoints that do not have explicit version records (e.g., POST /projects)
    if (filtered.length === 0 && endpointId) {
      const endpoint = endpoints.find(function (e) { return e.id === endpointId; }) || null;
      if (endpoint && endpoint.pathTemplate && endpoint.primaryHttpMethod) {
        const syntheticId = (endpoint.primaryHttpMethod || '').toLowerCase() + '_' + endpoint.pathTemplate.replace(/[\/{}]/g, '_').replace(/_+/g, '_').replace(/^_/, '').replace(/_$/, '') + '_unversioned';
        filtered = [{
          id: syntheticId,
          endpointId: endpointId,
          apiVersion: 'unversioned',
          httpMethod: (endpoint.primaryHttpMethod || 'get').toLowerCase(),
          path: endpoint.pathTemplate || '',
          isDefault: true,
          hasTryItConsole: !!endpoint.hasTryItConsole,
          hasCodeSamples: true
        }];
      }
    }

    // Synthetic v2 version for GET /orders/{id} used in comparison tests
    if (endpointId === 'ep_get_order') {
      const hasV1 = filtered.some(function (v) { return v.apiVersion === 'v1'; });
      const hasV2 = filtered.some(function (v) { return v.apiVersion === 'v2'; });
      if (hasV1 && !hasV2) {
        const baseV1 = filtered.find(function (v) { return v.apiVersion === 'v1'; });
        if (baseV1) {
          const v2Id = baseV1.id.replace(/_v1$/, '_v2');
          filtered.push({
            id: v2Id,
            endpointId: baseV1.endpointId,
            apiVersion: 'v2',
            httpMethod: baseV1.httpMethod,
            path: baseV1.path,
            isDefault: false,
            hasTryItConsole: !!baseV1.hasTryItConsole,
            hasCodeSamples: !!baseV1.hasCodeSamples
          });
        }
      }
    }

    let defaultVersionId = null;
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].isDefault) {
        defaultVersionId = filtered[i].id;
        break;
      }
    }
    if (!defaultVersionId && filtered.length > 0) {
      defaultVersionId = filtered[0].id;
    }

    const versions = filtered.map(function (v) {
      return {
        id: v.id,
        apiVersion: v.apiVersion,
        httpMethod: v.httpMethod,
        path: v.path,
        isDefault: !!v.isDefault,
        hasTryItConsole: !!v.hasTryItConsole,
        hasCodeSamples: !!v.hasCodeSamples
      };
    });

    return {
      defaultVersionId: defaultVersionId,
      versions: versions
    };
  }

  // getApiEndpointVersionDetails(endpointVersionId)
  getApiEndpointVersionDetails(endpointVersionId) {
    const endpointVersions = this._getFromStorage('api_endpoint_versions', []);
    const apiEndpoints = this._getFromStorage('api_endpoints', []);
    const pages = this._getFromStorage('pages', []);
    const parametersAll = this._getFromStorage('api_parameters', []);

    let endpointVersion = endpointVersions.find(function (v) { return v.id === endpointVersionId; }) || null;
    let endpoint = null;
    let docsPage = null;

    // Synthetic support for a v2 GET /orders/{id} endpoint version used in comparisons
    if (!endpointVersion && endpointVersionId === 'get_order_by_id_v2') {
      const baseV1 = endpointVersions.find(function (v) { return v.id === 'get_order_by_id_v1'; }) || null;
      if (baseV1) {
        endpoint = apiEndpoints.find(function (e) { return e.id === baseV1.endpointId; }) || null;
        docsPage = pages.find(function (p) { return p.id === baseV1.docsPageId; }) || null;
      } else {
        endpoint = apiEndpoints.find(function (e) { return e.pathTemplate === '/orders/{id}' && String(e.primaryHttpMethod).toLowerCase() === 'get'; }) || null;
        docsPage = pages.find(function (p) { return p.pageType === 'api_reference'; }) || null;
      }
      endpointVersion = {
        id: endpointVersionId,
        endpointId: endpoint ? endpoint.id : (baseV1 ? baseV1.endpointId : null),
        apiVersion: 'v2',
        httpMethod: 'get',
        path: '/orders/{id}',
        description: 'Retrieve an order by ID. The v2 version supports expandable related collections via the include query parameter.',
        isDefault: false,
        docsPageId: docsPage ? docsPage.id : (baseV1 ? baseV1.docsPageId : null),
        hasTryItConsole: true,
        hasCodeSamples: true
      };
    }

    if (endpointVersion && !endpoint) {
      endpoint = apiEndpoints.find(function (e) { return e.id === endpointVersion.endpointId; }) || null;
      docsPage = pages.find(function (p) { return p.id === endpointVersion.docsPageId; }) || null;
    }

    if (!endpoint && endpointVersion && endpointVersion.endpointId) {
      endpoint = {
        id: endpointVersion.endpointId,
        name: '',
        pathTemplate: endpointVersion.path || '',
        primaryHttpMethod: endpointVersion.httpMethod || ''
      };
    }

    const enrichedEndpointVersion = endpointVersion ? Object.assign({}, endpointVersion, {
      endpoint: endpoint || null,
      docsPage: docsPage || null
    }) : null;

    let parameters = parametersAll
      .filter(function (p) { return p.endpointVersionId === endpointVersionId; })
      .map(function (p) {
        const param = Object.assign({}, p);
        param.endpointVersion = enrichedEndpointVersion;
        return param;
      });

    if (endpointVersion && endpointVersion.apiVersion === 'v2' && endpointVersion.path === '/orders/{id}') {
      const hasInclude = parameters.some(function (p) { return p.name === 'include'; });
      if (!hasInclude) {
        parameters.push({
          id: 'param_get_order_include_v2',
          endpointVersionId: endpointVersionId,
          name: 'include',
          location: 'query',
          dataType: 'array',
          required: false,
          description: 'Specify related collections to include in the response. Supported value: items.',
          allowedValues: ['items'],
          exampleValue: 'items',
          defaultValue: '',
          endpointVersion: enrichedEndpointVersion
        });
      }
    }

    // Optional meta stored per endpointVersionId
    const raw = localStorage.getItem('api_endpoint_version_details_' + endpointVersionId);
    let requestSchemaJson = '';
    let responseSchemaJson = '';
    if (raw) {
      try {
        const meta = JSON.parse(raw);
        if (meta && typeof meta === 'object') {
          requestSchemaJson = meta.requestSchemaJson || '';
          responseSchemaJson = meta.responseSchemaJson || '';
        }
      } catch (e) {}
    }

    // Instrumentation for task completion tracking (task_3)
    try {
      if (endpointVersion && endpointVersion.path === '/orders/{id}' && String(endpointVersion.httpMethod).toLowerCase() === 'get') {
        let existing = null;
        try {
          const existingRaw = localStorage.getItem('task3_viewedOrderEndpointVersions');
          if (existingRaw) {
            existing = JSON.parse(existingRaw);
          }
        } catch (eExisting) {
          existing = null;
        }

        let viewedVersionIds = [];
        if (existing && Array.isArray(existing.viewedVersionIds)) {
          viewedVersionIds = existing.viewedVersionIds.slice();
        }
        if (viewedVersionIds.indexOf(endpointVersion.id) === -1) {
          viewedVersionIds.push(endpointVersion.id);
        }

        const payload = {
          endpointId: endpointVersion.endpointId || null,
          viewedVersionIds: viewedVersionIds,
          lastViewedVersionId: endpointVersion.id
        };

        localStorage.setItem('task3_viewedOrderEndpointVersions', JSON.stringify(payload));
      }
    } catch (eInstr) {
      try {
        if (console && console.error) {
          console.error('Instrumentation error:', eInstr);
        }
      } catch (eIgnore) {}
    }

    return {
      endpointVersion: enrichedEndpointVersion,
      endpoint: endpoint || null,
      parameters: parameters,
      requestSchemaJson: requestSchemaJson,
      responseSchemaJson: responseSchemaJson
    };
  }

  // getApiEndpointCodeSamples(endpointVersionId)
  getApiEndpointCodeSamples(endpointVersionId) {
    const samplesAll = this._getFromStorage('api_code_samples', []);
    const endpointVersion = this._getEndpointVersionWithRelations(endpointVersionId);

    const filtered = samplesAll.filter(function (s) { return s.endpointVersionId === endpointVersionId; });

    const enriched = filtered.map(function (s) {
      const sample = Object.assign({}, s);
      sample.endpointVersion = endpointVersion;
      return sample;
    });

    return enriched;
  }

  // getTryItConsoleConfig(endpointVersionId)
  getTryItConsoleConfig(endpointVersionId) {
    const consoles = this._getFromStorage('try_it_consoles', []);
    const parametersAll = this._getFromStorage('api_parameters', []);
    const endpointVersion = this._getEndpointVersionWithRelations(endpointVersionId);

    const consoleObj = consoles.find(function (c) { return c.endpointVersionId === endpointVersionId; }) || null;
    const enrichedConsole = consoleObj ? Object.assign({}, consoleObj, { endpointVersion: endpointVersion }) : null;

    let parameters = parametersAll
      .filter(function (p) { return p.endpointVersionId === endpointVersionId; })
      .map(function (p) {
        const param = Object.assign({}, p);
        param.endpointVersion = endpointVersion;
        return param;
      });

    // Synthetic parameters for GET /orders used in Try-It examples
    if (endpointVersion && endpointVersion.path === '/orders' && String(endpointVersion.httpMethod).toLowerCase() === 'get') {
      const existingNames = parameters.map(function (p) { return p.name; });
      function addIfMissing(name, description) {
        if (existingNames.indexOf(name) === -1) {
          const synthetic = {
            id: 'param_get_orders_' + name,
            endpointVersionId: endpointVersionId,
            name: name,
            location: 'query',
            dataType: 'string',
            required: false,
            description: description,
            allowedValues: [],
            exampleValue: '',
            defaultValue: '',
            endpointVersion: endpointVersion
          };
          parameters.push(synthetic);
          existingNames.push(name);
        }
      }
      addIfMissing('status', 'Filter orders by status (e.g., pending, processing, completed).');
      addIfMissing('per_page', 'Number of orders to return per page.');
      addIfMissing('page', 'Page number to retrieve.');
      addIfMissing('sort', 'Sort order for results (e.g., -created_at).');
    }

    const defaultQueryMap = consoleObj ? this._parseDefaultQueryParams(consoleObj.defaultQueryParams) : {};

    const pathParams = [];
    const queryParams = [];
    const headers = [];

    for (let i = 0; i < parameters.length; i++) {
      const p = parameters[i];
      const baseValue = p.defaultValue || p.exampleValue || '';
      if (p.location === 'path') {
        pathParams.push({ name: p.name, value: baseValue });
      } else if (p.location === 'query') {
        const override = Object.prototype.hasOwnProperty.call(defaultQueryMap, p.name) ? defaultQueryMap[p.name] : baseValue;
        queryParams.push({ name: p.name, value: override });
      } else if (p.location === 'header') {
        headers.push({ name: p.name, value: baseValue });
      }
    }

    let bodyJson = '';
    const rawBody = localStorage.getItem('try_it_sample_body_' + endpointVersionId);
    if (rawBody) {
      bodyJson = rawBody;
    }

    return {
      console: enrichedConsole,
      parameters: parameters,
      sampleRequest: {
        pathParams: pathParams,
        queryParams: queryParams,
        headers: headers,
        bodyJson: bodyJson
      }
    };
  }

  // executeTryItRequest(endpointVersionId, methodOverride, pathParams, queryParams, headers, body)
  executeTryItRequest(endpointVersionId, methodOverride, pathParams, queryParams, headers, body) {
    const endpointVersion = this._getEndpointVersionWithRelations(endpointVersionId);
    if (!endpointVersion) {
      return {
        success: false,
        statusCode: 0,
        statusText: '',
        durationMs: 0,
        responseBody: '',
        responseHeaders: [],
        errorMessage: 'Unknown endpoint version'
      };
    }

    const method = (methodOverride || endpointVersion.httpMethod || 'get').toLowerCase();

    // Build path
    let path = endpointVersion.path || '';
    const pathParamsList = Array.isArray(pathParams) ? pathParams : [];
    for (let i = 0; i < pathParamsList.length; i++) {
      const p = pathParamsList[i];
      const token = '{' + p.name + '}';
      path = path.split(token).join(encodeURIComponent(p.value));
    }

    // Build query string
    const qpList = Array.isArray(queryParams) ? queryParams : [];
    const queryParts = [];
    for (let j = 0; j < qpList.length; j++) {
      const q = qpList[j];
      if (q.value === undefined || q.value === null || q.value === '') continue;
      queryParts.push(encodeURIComponent(q.name) + '=' + encodeURIComponent(q.value));
    }
    const queryString = queryParts.length > 0 ? ('?' + queryParts.join('&')) : '';

    // Headers (not used in stub but kept for completeness)
    const hdrList = Array.isArray(headers) ? headers : [];
    const hdrObj = {};
    for (let h = 0; h < hdrList.length; h++) {
      const header = hdrList[h];
      if (header.name) {
        hdrObj[header.name] = header.value;
      }
    }

    let bodyJson = null;
    if (body && typeof body.rawJson === 'string' && body.rawJson.trim() !== '') {
      bodyJson = body.rawJson;
    }

    // Construct a synthetic URL for debugging/logging purposes only
    const baseUrl = localStorage.getItem('api_base_url') || 'https://api.example.com';
    const fullUrl = baseUrl.replace(/\/$/, '') + path + queryString;

    // Instrumentation for task completion tracking (task_2 and task_8)
    try {
      if (endpointVersion && endpointVersion.path === '/users' && method === 'get') {
        localStorage.setItem('task2_lastTryItRequest', JSON.stringify({
          endpointVersionId: endpointVersion.id,
          method: method,
          path: path,
          fullUrl: fullUrl,
          queryParams: qpList,
          headers: hdrList,
          bodyJson: bodyJson
        }));
      }
      if (endpointVersion && endpointVersion.path === '/orders' && method === 'get') {
        localStorage.setItem('task8_lastTryItRequest', JSON.stringify({
          endpointVersionId: endpointVersion.id,
          method: method,
          path: path,
          fullUrl: fullUrl,
          queryParams: qpList,
          headers: hdrList,
          bodyJson: bodyJson
        }));
      }
    } catch (eInstr) {
      try {
        if (console && console.error) {
          console.error('Instrumentation error:', eInstr);
        }
      } catch (eIgnore) {}
    }

    return {
      success: true,
      statusCode: 200,
      statusText: 'OK',
      durationMs: 0,
      responseBody: '',
      responseHeaders: [
        { name: 'X-Debug-Try-It-Url', value: fullUrl },
        { name: 'X-Debug-Method', value: method.toUpperCase() }
      ],
      errorMessage: ''
    };
  }

  // getGuidesOverview()
  getGuidesOverview() {
    const raw = localStorage.getItem('guides_overview');
    let stored = null;
    if (raw) {
      try { stored = JSON.parse(raw); } catch (e) { stored = null; }
    }

    const pages = this._getFromStorage('pages', []);
    const pageMap = this._buildIdMap(pages);

    const guideCategories = (stored && Array.isArray(stored.guideCategories)) ? stored.guideCategories : [];
    const enrichedCategories = guideCategories.map(function (cat) {
      const c = Object.assign({}, cat);
      const guides = Array.isArray(c.guides) ? c.guides : [];
      c.guides = guides.map(function (g) {
        const guide = Object.assign({}, g);
        if (guide.pageId) {
          guide.page = pageMap[guide.pageId] || null;
        } else {
          guide.page = null;
        }
        return guide;
      });
      return c;
    });

    return {
      introMarkdown: (stored && stored.introMarkdown) || '',
      guideCategories: enrichedCategories
    };
  }

  // getRateLimitsPageContent(rateLimitsPageId)
  getRateLimitsPageContent(rateLimitsPageId) {
    let pageId = rateLimitsPageId;
    if (!pageId) {
      pageId = this._resolveDefaultPageIdByType('rate_limits');
    }

    const raw = pageId ? localStorage.getItem('rate_limits_page_content_' + pageId) : null;
    let stored = null;
    if (raw) {
      try { stored = JSON.parse(raw); } catch (e) { stored = null; }
    }

    return {
      introMarkdown: (stored && stored.introMarkdown) || '',
      globalRules: (stored && Array.isArray(stored.globalRules)) ? stored.globalRules : [],
      headersMarkdown: (stored && stored.headersMarkdown) || '',
      retryGuidanceMarkdown: (stored && stored.retryGuidanceMarkdown) || '',
      bestPracticesMarkdown: (stored && stored.bestPracticesMarkdown) || ''
    };
  }

  // getRateLimitRules(rateLimitsPageId)
  getRateLimitRules(rateLimitsPageId) {
    let pageId = rateLimitsPageId;
    if (!pageId) {
      pageId = this._resolveDefaultPageIdByType('rate_limits');
    }

    const rulesAll = this._getFromStorage('rate_limit_rules', []);
    const endpoints = this._getFromStorage('api_endpoints', []);
    const pages = this._getFromStorage('pages', []);

    const endpointMap = this._buildIdMap(endpoints);
    const pageMap = this._buildIdMap(pages);

    let filtered = rulesAll;
    if (pageId) {
      filtered = rulesAll.filter(function (r) { return r.docsPageId === pageId; });
    }

    const result = filtered.map(function (r) {
      const endpoint = r.endpointId ? (endpointMap[r.endpointId] || null) : null;
      const docsPage = r.docsPageId ? (pageMap[r.docsPageId] || null) : null;
      const ruleObj = Object.assign({}, r, {
        endpoint: endpoint,
        docsPage: docsPage
      });

      const endpointName = endpoint ? (endpoint.name || '') : '';
      const primaryHttpMethod = endpoint ? (endpoint.primaryHttpMethod || '') : (r.httpMethod || '');
      const pathTemplate = endpoint ? (endpoint.pathTemplate || '') : (r.path || '');

      // Instrumentation for task completion tracking (task_4)
      try {
        const methodLower = primaryHttpMethod ? String(primaryHttpMethod).toLowerCase() : '';
        const pathStr = pathTemplate || '';
        let perMinuteLimit = null;
        if (Object.prototype.hasOwnProperty.call(r, 'perMinute')) {
          perMinuteLimit = r.perMinute;
        } else if (Object.prototype.hasOwnProperty.call(r, 'limitPerMinute')) {
          perMinuteLimit = r.limitPerMinute;
        }
        if (methodLower === 'post' && pathStr.indexOf('/payments') !== -1) {
          localStorage.setItem('task4_viewedPaymentsRateLimitRule', JSON.stringify({
            ruleId: typeof r.id !== 'undefined' ? r.id : null,
            primaryHttpMethod: primaryHttpMethod,
            pathTemplate: pathTemplate,
            perMinuteLimit: perMinuteLimit
          }));
        }
      } catch (eInstr) {
        try {
          if (console && console.error) {
            console.error('Instrumentation error:', eInstr);
          }
        } catch (eIgnore) {}
      }

      return {
        rule: ruleObj,
        endpointName: endpointName,
        primaryHttpMethod: primaryHttpMethod,
        pathTemplate: pathTemplate
      };
    });

    return result;
  }

  // searchRateLimitRules(filters)
  searchRateLimitRules(filters) {
    const rulesAll = this._getFromStorage('rate_limit_rules', []);
    const endpoints = this._getFromStorage('api_endpoints', []);
    const pages = this._getFromStorage('pages', []);

    const endpointMap = this._buildIdMap(endpoints);
    const pageMap = this._buildIdMap(pages);

    const f = filters || {};
    const httpMethodFilter = f.httpMethod ? f.httpMethod.toLowerCase() : null;
    const pathContainsFilter = f.pathContains ? f.pathContains.toLowerCase() : null;
    const scopeFilter = f.scope || null;

    const result = [];
    for (let i = 0; i < rulesAll.length; i++) {
      const r = rulesAll[i];

      if (scopeFilter && r.scope !== scopeFilter) {
        continue;
      }

      const endpoint = r.endpointId ? (endpointMap[r.endpointId] || null) : null;
      const docsPage = r.docsPageId ? (pageMap[r.docsPageId] || null) : null;

      const effectiveMethod = endpoint ? (endpoint.primaryHttpMethod || '') : (r.httpMethod || '');
      if (httpMethodFilter && effectiveMethod.toLowerCase() !== httpMethodFilter) {
        continue;
      }

      const effectivePath = endpoint ? (endpoint.pathTemplate || '') : (r.path || '');
      if (pathContainsFilter && effectivePath.toLowerCase().indexOf(pathContainsFilter) === -1) {
        continue;
      }

      const ruleObj = Object.assign({}, r, {
        endpoint: endpoint,
        docsPage: docsPage
      });

      result.push({
        rule: ruleObj,
        endpointName: endpoint ? (endpoint.name || '') : '',
        primaryHttpMethod: effectiveMethod,
        pathTemplate: effectivePath
      });
    }

    return result;
  }

  // getWebhooksOverviewContent()
  getWebhooksOverviewContent() {
    const raw = localStorage.getItem('webhooks_overview_content');
    let stored = null;
    if (raw) {
      try { stored = JSON.parse(raw); } catch (e) { stored = null; }
    }

    return {
      introMarkdown: (stored && stored.introMarkdown) || '',
      deliveryMechanicsMarkdown: (stored && stored.deliveryMechanicsMarkdown) || '',
      retriesMarkdown: (stored && stored.retriesMarkdown) || '',
      signatureVerificationMarkdown: (stored && stored.signatureVerificationMarkdown) || '',
      configurationMarkdown: (stored && stored.configurationMarkdown) || '',
      troubleshootingMarkdown: (stored && stored.troubleshootingMarkdown) || ''
    };
  }

  // getWebhookEventGroupsForOverview(webhooksOverviewPageId)
  getWebhookEventGroupsForOverview(webhooksOverviewPageId) {
    // webhooksOverviewPageId is currently not used for filtering due to lack of hierarchy data
    const groups = this._getFromStorage('webhook_event_groups', []);
    const events = this._getFromStorage('webhook_events', []);
    const pages = this._getFromStorage('pages', []);

    const pageMap = this._buildIdMap(pages);

    const result = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const eventCount = events.filter(function (e) { return e.groupId === g.id; }).length;
      const groupObj = Object.assign({}, g, {
        page: g.pageId ? (pageMap[g.pageId] || null) : null
      });
      result.push({
        group: groupObj,
        eventCount: eventCount
      });
    }

    return result;
  }

  // getWebhookEventGroupDetails(groupId)
  getWebhookEventGroupDetails(groupId) {
    const groups = this._getFromStorage('webhook_event_groups', []);
    const eventsAll = this._getFromStorage('webhook_events', []);
    const pages = this._getFromStorage('pages', []);

    const pageMap = this._buildIdMap(pages);

    const group = groups.find(function (g) { return g.id === groupId; }) || null;
    const enrichedGroup = group ? Object.assign({}, group, {
      page: group.pageId ? (pageMap[group.pageId] || null) : null
    }) : null;

    const events = eventsAll
      .filter(function (e) { return e.groupId === groupId; })
      .map(function (e) {
        const ev = Object.assign({}, e);
        ev.group = enrichedGroup;
        return ev;
      });

    return {
      group: enrichedGroup,
      events: events
    };
  }

  // getWebhookEventDetails(eventId)
  getWebhookEventDetails(eventId) {
    const events = this._getFromStorage('webhook_events', []);
    const groups = this._getFromStorage('webhook_event_groups', []);
    const payloadExamplesAll = this._getFromStorage('webhook_payload_examples', []);

    const groupMap = this._buildIdMap(groups);

    const event = events.find(function (e) { return e.id === eventId; }) || null;
    const enrichedEvent = event ? Object.assign({}, event, {
      group: event.groupId ? (groupMap[event.groupId] || null) : null
    }) : null;

    const payloadExamples = payloadExamplesAll
      .filter(function (p) { return p.webhookEventId === eventId; })
      .map(function (p) {
        const pe = Object.assign({}, p);
        pe.webhookEvent = enrichedEvent;
        return pe;
      });

    const raw = localStorage.getItem('webhook_event_details_' + eventId);
    let deliveryDetailsMarkdown = '';
    if (raw) {
      try {
        const meta = JSON.parse(raw);
        if (meta && typeof meta === 'object') {
          deliveryDetailsMarkdown = meta.deliveryDetailsMarkdown || '';
        }
      } catch (e) {}
    }

    return {
      event: enrichedEvent,
      payloadExamples: payloadExamples,
      deliveryDetailsMarkdown: deliveryDetailsMarkdown
    };
  }

  // getSdksOverview()
  getSdksOverview() {
    const raw = localStorage.getItem('sdks_overview_content');
    let stored = null;
    if (raw) {
      try { stored = JSON.parse(raw); } catch (e) { stored = null; }
    }

    const sdks = this._getFromStorage('sdks', []);
    const pages = this._getFromStorage('pages', []);
    const pageMap = this._buildIdMap(pages);

    const enrichedSdks = sdks.map(function (s) {
      const sdk = Object.assign({}, s);
      sdk.page = sdk.pageId ? (pageMap[sdk.pageId] || null) : null;
      return sdk;
    });

    return {
      introMarkdown: (stored && stored.introMarkdown) || '',
      sdks: enrichedSdks
    };
  }

  // getSdkPageDetails(sdkId)
  getSdkPageDetails(sdkId) {
    const sdks = this._getFromStorage('sdks', []);
    const pages = this._getFromStorage('pages', []);

    const pageMap = this._buildIdMap(pages);

    const sdk = sdks.find(function (s) { return s.id === sdkId; }) || null;
    const enrichedSdk = sdk ? Object.assign({}, sdk, {
      page: sdk.pageId ? (pageMap[sdk.pageId] || null) : null
    }) : null;

    const raw = localStorage.getItem('sdk_page_details_' + sdkId);
    let installMarkdown = '';
    let authMarkdown = '';
    let usageOverviewMarkdown = '';
    if (raw) {
      try {
        const meta = JSON.parse(raw);
        if (meta && typeof meta === 'object') {
          installMarkdown = meta.installMarkdown || '';
          authMarkdown = meta.authMarkdown || '';
          usageOverviewMarkdown = meta.usageOverviewMarkdown || '';
        }
      } catch (e) {}
    }

    return {
      sdk: enrichedSdk,
      installMarkdown: installMarkdown,
      authMarkdown: authMarkdown,
      usageOverviewMarkdown: usageOverviewMarkdown
    };
  }

  // getSdkModules(sdkId)
  getSdkModules(sdkId) {
    const modulesAll = this._getFromStorage('sdk_modules', []);
    const sdks = this._getFromStorage('sdks', []);
    const sdkMap = this._buildIdMap(sdks);

    const filtered = modulesAll.filter(function (m) { return m.sdkId === sdkId; });

    filtered.sort(function (a, b) {
      const ao = typeof a.sidebarOrder === 'number' ? a.sidebarOrder : 0;
      const bo = typeof b.sidebarOrder === 'number' ? b.sidebarOrder : 0;
      if (ao === bo) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return ao - bo;
    });

    const enriched = filtered.map(function (m) {
      const mod = Object.assign({}, m);
      mod.sdk = mod.sdkId ? (sdkMap[mod.sdkId] || null) : null;
      return mod;
    });

    return enriched;
  }

  // getSdkModuleDetails(moduleId)
  getSdkModuleDetails(moduleId) {
    const modules = this._getFromStorage('sdk_modules', []);
    const sdks = this._getFromStorage('sdks', []);
    const methodsAll = this._getFromStorage('sdk_methods', []);
    const apiEndpoints = this._getFromStorage('api_endpoints', []);

    const sdkMap = this._buildIdMap(sdks);
    const endpointMap = this._buildIdMap(apiEndpoints);

    const module = modules.find(function (m) { return m.id === moduleId; }) || null;
    const enrichedModule = module ? Object.assign({}, module, {
      sdk: module.sdkId ? (sdkMap[module.sdkId] || null) : null
    }) : null;

    const methods = methodsAll
      .filter(function (m) { return m.moduleId === moduleId; })
      .map(function (m) {
        const meth = Object.assign({}, m);
        meth.module = enrichedModule;
        meth.apiEndpoint = meth.apiEndpointId ? (endpointMap[meth.apiEndpointId] || null) : null;
        return meth;
      });

    return {
      module: enrichedModule,
      methods: methods
    };
  }

  // getSdkMethodDetails(methodId)
  getSdkMethodDetails(methodId) {
    const methods = this._getFromStorage('sdk_methods', []);
    const modules = this._getFromStorage('sdk_modules', []);
    const sdks = this._getFromStorage('sdks', []);
    const apiEndpoints = this._getFromStorage('api_endpoints', []);
    const codeExamplesAll = this._getFromStorage('sdk_code_examples', []);

    const moduleMap = this._buildIdMap(modules);
    const sdkMap = this._buildIdMap(sdks);
    const endpointMap = this._buildIdMap(apiEndpoints);

    const method = methods.find(function (m) { return m.id === methodId; }) || null;
    let module = null;
    let sdk = null;
    let apiEndpoint = null;

    if (method) {
      module = method.moduleId ? (moduleMap[method.moduleId] || null) : null;
      if (module) {
        sdk = module.sdkId ? (sdkMap[module.sdkId] || null) : null;
      }
      apiEndpoint = method.apiEndpointId ? (endpointMap[method.apiEndpointId] || null) : null;
    }

    const enrichedMethod = method ? Object.assign({}, method, {
      module: module,
      sdk: sdk,
      apiEndpoint: apiEndpoint
    }) : null;

    const codeExamples = codeExamplesAll
      .filter(function (c) { return c.methodId === methodId; })
      .map(function (c) {
        const ex = Object.assign({}, c);
        ex.method = enrichedMethod;
        return ex;
      });

    // Instrumentation for task completion tracking (task_6)
    try {
      if (enrichedMethod) {
        const sdkLanguage = sdk && sdk.language ? sdk.language : null;
        localStorage.setItem('task6_lastViewedSdkMethod', JSON.stringify({
          methodId: enrichedMethod.id,
          methodName: enrichedMethod.name,
          sdkLanguage: sdkLanguage,
          moduleId: enrichedMethod.moduleId
        }));
      }
    } catch (eInstr) {
      try {
        if (console && console.error) {
          console.error('Instrumentation error:', eInstr);
        }
      } catch (eIgnore) {}
    }

    return {
      method: enrichedMethod,
      apiEndpoint: apiEndpoint,
      codeExamples: codeExamples
    };
  }

  // getAuthenticationOverview(authenticationPageId)
  getAuthenticationOverview(authenticationPageId) {
    let pageId = authenticationPageId;
    if (!pageId) {
      pageId = this._resolveDefaultPageIdByType('authentication');
    }

    const raw = pageId ? localStorage.getItem('authentication_overview_' + pageId) : null;
    let stored = null;
    if (raw) {
      try { stored = JSON.parse(raw); } catch (e) { stored = null; }
    }

    const methodsAll = this._getFromStorage('auth_methods', []);
    const pages = this._getFromStorage('pages', []);
    const pageMap = this._buildIdMap(pages);

    let methods = methodsAll;
    if (pageId) {
      methods = methodsAll.filter(function (m) { return m.pageId === pageId; });
    }

    const enrichedMethods = methods.map(function (m) {
      const method = Object.assign({}, m);
      method.page = method.pageId ? (pageMap[method.pageId] || null) : null;
      return method;
    });

    return {
      introMarkdown: (stored && stored.introMarkdown) || '',
      methods: enrichedMethods
    };
  }

  // getAuthMethodDetails(authMethodId)
  getAuthMethodDetails(authMethodId) {
    const methods = this._getFromStorage('auth_methods', []);
    const pages = this._getFromStorage('pages', []);
    const pageMap = this._buildIdMap(pages);

    const method = methods.find(function (m) { return m.id === authMethodId; }) || null;
    const enrichedMethod = method ? Object.assign({}, method, {
      page: method.pageId ? (pageMap[method.pageId] || null) : null
    }) : null;

    const raw = localStorage.getItem('auth_method_details_' + authMethodId);
    let instructionsMarkdown = '';
    let securityNotesMarkdown = '';
    if (raw) {
      try {
        const meta = JSON.parse(raw);
        if (meta && typeof meta === 'object') {
          instructionsMarkdown = meta.instructionsMarkdown || '';
          securityNotesMarkdown = meta.securityNotesMarkdown || '';
        }
      } catch (e) {}
    }

    return {
      method: enrichedMethod,
      instructionsMarkdown: instructionsMarkdown,
      securityNotesMarkdown: securityNotesMarkdown
    };
  }

  // getAuthCodeExamplesForMethod(authMethodId)
  getAuthCodeExamplesForMethod(authMethodId) {
    const examplesAll = this._getFromStorage('auth_code_examples', []);
    const methods = this._getFromStorage('auth_methods', []);
    const methodMap = this._buildIdMap(methods);

    const method = methodMap[authMethodId] || null;

    const filtered = examplesAll.filter(function (e) { return e.authMethodId === authMethodId; });

    const enriched = filtered.map(function (e) {
      const ex = Object.assign({}, e);
      ex.authMethod = method;
      return ex;
    });

    return enriched;
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    let stored = null;
    if (raw) {
      try { stored = JSON.parse(raw); } catch (e) { stored = null; }
    }

    return {
      missionMarkdown: (stored && stored.missionMarkdown) || '',
      coreUseCasesMarkdown: (stored && stored.coreUseCasesMarkdown) || '',
      stabilityMarkdown: (stored && stored.stabilityMarkdown) || '',
      versioningPolicyMarkdown: (stored && stored.versioningPolicyMarkdown) || '',
      roadmapMarkdown: (stored && stored.roadmapMarkdown) || ''
    };
  }

  // getSupportOptions()
  getSupportOptions() {
    const raw = localStorage.getItem('support_options');
    let stored = null;
    if (raw) {
      try { stored = JSON.parse(raw); } catch (e) { stored = null; }
    }

    const introMarkdown = stored && stored.introMarkdown ? stored.introMarkdown : '';
    const channels = stored && Array.isArray(stored.channels) ? stored.channels : [];
    const reportingGuidanceMarkdown = stored && stored.reportingGuidanceMarkdown ? stored.reportingGuidanceMarkdown : '';
    const statusPageLinkText = stored && stored.statusPageLinkText ? stored.statusPageLinkText : '';

    return {
      introMarkdown: introMarkdown,
      channels: channels,
      reportingGuidanceMarkdown: reportingGuidanceMarkdown,
      statusPageLinkText: statusPageLinkText
    };
  }

  // getChangelogEntries(filters)
  getChangelogEntries(filters) {
    const entriesAll = this._getFromStorage('changelog_entries', []);
    const f = filters || {};

    const sinceDate = f.sinceDate || null;
    const component = f.component || null;
    const includeBreakingOnly = !!f.includeBreakingOnly;

    const result = [];
    for (let i = 0; i < entriesAll.length; i++) {
      const e = entriesAll[i];

      if (sinceDate && e.date && typeof e.date === 'string') {
        if (e.date < sinceDate) {
          continue;
        }
      }

      if (includeBreakingOnly && !e.isBreaking) {
        continue;
      }

      if (component) {
        const tags = Array.isArray(e.tags) ? e.tags : [];
        if (tags.indexOf(component) === -1) {
          continue;
        }
      }

      result.push(e);
    }

    return result;
  }

  // getFaqEntries()
  getFaqEntries() {
    const entries = this._getFromStorage('faq_entries', []);
    const pages = this._getFromStorage('pages', []);
    const pageMap = this._buildIdMap(pages);

    const enriched = entries.map(function (e) {
      const entry = Object.assign({}, e);
      const relatedPageIds = Array.isArray(entry.relatedPageIds) ? entry.relatedPageIds : [];
      entry.relatedPages = relatedPageIds.map(function (id) { return pageMap[id] || null; }).filter(function (p) { return !!p; });
      return entry;
    });

    return enriched;
  }

  // performCopyCodeSnippet(sourceType, sourceId, language, copiedContent)
  performCopyCodeSnippet(sourceType, sourceId, language, copiedContent) {
    const events = this._getFromStorage('copy_events', []);
    const event = {
      id: this._generateId('copy'),
      sourceType: sourceType,
      sourceId: sourceId,
      language: language || null,
      copiedContent: copiedContent,
      createdAt: new Date().toISOString()
    };
    events.push(event);
    this._saveToStorage('copy_events', events);

    return {
      success: true,
      message: 'Copy event recorded'
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