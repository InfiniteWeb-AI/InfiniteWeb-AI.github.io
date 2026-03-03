// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    // BusinessLogic is provided by the runtime environment
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for a clean test environment
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided for initial localStorage population
    const generatedData = {
      api_groups: [
        {
          id: 'evaluations',
          name: 'Evaluations',
          description:
            'Endpoints for creating, listing, and managing evaluation runs, including batch evaluations and comparison runs.',
          order: 1,
        },
        {
          id: 'datasets',
          name: 'Datasets',
          description:
            'Endpoints for creating, importing, and managing datasets used in evaluations.',
          order: 2,
        },
        {
          id: 'projects',
          name: 'Projects',
          description:
            'Endpoints for managing projects, which group datasets, evaluations, and configurations.',
          order: 3,
        },
      ],
      projects: [
        {
          id: 'proj_123',
          name: 'Demo Text Classification Project',
          description:
            'Sample project used throughout the docs for quickstarts and API examples, including batch evaluation runs.',
          createdAt: '2025-10-01T14:22:10Z',
        },
        {
          id: 'proj_qa_benchmark',
          name: 'QA Benchmark Suite',
          description:
            'Project containing large-scale QA and summarization benchmarks used in advanced examples.',
          createdAt: '2025-08-12T09:05:33Z',
        },
        {
          id: 'proj_js_sdk_samples',
          name: 'JavaScript SDK Samples',
          description:
            'Project backing the JavaScript SDK examples, including runBatchEvaluation helper snippets.',
          createdAt: '2025-12-03T16:48:00Z',
        },
      ],
      site_settings: [
        {
          id: 'site',
          currentDocsVersionId: 'v1',
        },
      ],
      datasets: [
        {
          id: 'ds_tc_reviews_small',
          projectId: 'proj_123',
          name: 'Text Classification - Product Reviews (Small)',
          description:
            'Sample product review classification dataset used in the Python quickstart, balanced between positive and negative labels.',
          size: 500,
          createdAt: '2025-10-05T10:12:00Z',
          apiVersion: 'v1',
        },
        {
          id: 'ds_tc_reviews_medium',
          projectId: 'proj_123',
          name: 'Text Classification - Product Reviews (Medium)',
          description:
            'Medium-sized product review dataset for evaluating accuracy and F1 on sentiment classification tasks.',
          size: 2000,
          createdAt: '2025-10-10T09:30:45Z',
          apiVersion: 'v1',
        },
        {
          id: 'ds_tc_support_tickets',
          projectId: 'proj_123',
          name: 'Support Ticket Categorization',
          description:
            'Customer support tickets labeled by issue type, ideal for multi-class text classification evaluations.',
          size: 1500,
          createdAt: '2025-11-02T13:05:20Z',
          apiVersion: 'v1',
        },
      ],
      docs_versions: [
        {
          id: 'v1',
          label: 'v1 (Stable)',
          isDefault: true,
          defaultApiBaseUrl: 'https://api.aievaldocs.com/v1',
          isCurrent: true,
        },
        {
          id: 'v2',
          label: 'v2 (Beta)',
          isDefault: false,
          defaultApiBaseUrl: 'https://api.aievaldocs.com/v2',
          isCurrent: false,
        },
      ],
      sidebar_items: [
        {
          id: 'sb_getting_started_overview',
          parentPageId: 'getting_started',
          text: 'Getting started overview',
          targetPageId: 'getting_started',
          section: 'getting_started',
          order: 1,
        },
        {
          id: 'sb_quickstart_text_classification',
          parentPageId: 'getting_started',
          text: 'Quickstart: Text classification',
          targetPageId: 'quickstart_text_classification',
          section: 'getting_started',
          order: 2,
        },
        {
          id: 'sb_quickstart_js_batch',
          parentPageId: 'getting_started',
          text: 'Quickstart: JavaScript batch evaluations',
          targetPageId: 'quickstart_js_batch',
          section: 'getting_started',
          order: 3,
        },
      ],
      doc_pages: [
        {
          id: 'getting_started',
          name: 'Getting started',
          filename: 'getting_started.html',
          description:
            'Overview of how to get started with the AI evaluation platform, including environment setup and first evaluations.',
          category: 'getting_started',
          primaryFunctions: ['overview', 'onboarding', 'first_steps'],
          isApiVersioned: false,
          hasSidebar: true,
          hasHeaderLinks: true,
          hasFooterLinks: false,
        },
        {
          id: 'quickstart_text_classification',
          name: 'Quickstart: Text classification',
          filename: 'quickstart_text_classification.html',
          description:
            'Language-specific quickstart guide for running your first text classification evaluation, including Python examples.',
          category: 'getting_started',
          primaryFunctions: ['quickstart', 'text_classification', 'python_example'],
          isApiVersioned: true,
          hasSidebar: false,
          hasHeaderLinks: false,
          hasFooterLinks: false,
        },
        {
          id: 'quickstart_js_batch',
          name: 'Quickstart: JavaScript batch evaluations',
          filename: 'quickstart_js_batch.html',
          description:
            'JavaScript-focused quickstart for running batch evaluations using the REST API and JS SDK helpers.',
          category: 'getting_started',
          primaryFunctions: ['quickstart', 'javascript', 'batch_evaluation'],
          isApiVersioned: true,
          hasSidebar: false,
          hasHeaderLinks: false,
          hasFooterLinks: false,
        },
      ],
      api_endpoints: [
        {
          id: 'eval_create_batch_v1',
          groupId: 'evaluations',
          name: 'Create batch evaluation run (v1)',
          description:
            'Create a new batch evaluation run for a given project, processing a dataset asynchronously.',
          httpMethod: 'post',
          apiVersion: 'v1',
          pathTemplate: '/v1/projects/{project_id}/evaluations:batch',
          hasPathParams: true,
          pathParams: ['project_id'],
          queryParams: ['limit', 'cursor'],
          requiresRequestBody: true,
          docPageId: 'api_evaluations_create_batch',
        },
        {
          id: 'eval_create_batch_v2',
          groupId: 'evaluations',
          name: 'Create batch evaluation run (v2)',
          description:
            'Create a new batch evaluation run using the v2 API, supporting additional options.',
          httpMethod: 'post',
          apiVersion: 'v2',
          pathTemplate: '/v2/projects/{project_id}/evaluations:batch',
          hasPathParams: true,
          pathParams: ['project_id'],
          queryParams: ['limit', 'cursor'],
          requiresRequestBody: true,
          docPageId: 'api_evaluations_create_batch',
        },
        {
          id: 'eval_get_v1',
          groupId: 'evaluations',
          name: 'Get evaluation run (v1)',
          description:
            'Retrieve the details and metrics for a single evaluation run.',
          httpMethod: 'get',
          apiVersion: 'v1',
          pathTemplate: '/v1/projects/{project_id}/evaluations/{evaluation_id}',
          hasPathParams: true,
          pathParams: ['project_id', 'evaluation_id'],
          queryParams: [],
          requiresRequestBody: false,
          docPageId: 'api_evaluations_overview',
        },
      ],
      evaluation_examples: [
        {
          id: 'ex_tc_accuracy_f1_200',
          title: 'Sentiment classification with accuracy and F1 (200 samples)',
          summary:
            'Runs a text classification evaluation on product reviews using accuracy and F1 metrics with a 200-sample subset.',
          taskType: 'text_classification',
          metricIds: ['accuracy', 'f1'],
          datasetId: 'ds_tc_reviews_small',
          exampleDetailPageId: 'examples_gallery',
          endpointPath: '/v1/projects/proj_123/evaluations/sentiment_accuracy_f1_200',
          datasetSize: 500,
        },
        {
          id: 'ex_tc_support_latency',
          title: 'Support ticket routing with accuracy and latency',
          summary:
            'Evaluates routing models on labeled support tickets, focusing on accuracy and end-to-end latency.',
          taskType: 'text_classification',
          metricIds: ['accuracy', 'latency'],
          datasetId: 'ds_tc_support_tickets',
          exampleDetailPageId: 'examples_gallery',
          endpointPath:
            '/v1/projects/proj_123/evaluations/support_routing_latency',
          datasetSize: 1500,
        },
        {
          id: 'ex_bleu_news_summarization',
          title: 'News summarization with BLEU',
          summary:
            'Uses BLEU to evaluate news article summarization quality against reference summaries.',
          taskType: 'text_generation',
          metricIds: ['bleu'],
          datasetId: 'ds_summarization_news_bleu',
          exampleDetailPageId: 'examples_bleu_collection',
          endpointPath:
            '/v1/projects/proj_qa_benchmark/evaluations/news_summ_bleu_run_01',
          datasetSize: 3500,
        },
      ],
      metrics: [
        {
          id: 'accuracy',
          displayName: 'Accuracy',
          shortDescription:
            'Proportion of correctly predicted labels for classification tasks.',
          category: 'classification',
          supportsWeight: true,
          isTokenBillingRelated: false,
          metricDetailPageId: 'concepts_metrics',
        },
        {
          id: 'f1',
          displayName: 'F1 score',
          shortDescription:
            'Harmonic mean of precision and recall, suitable for imbalanced classification datasets.',
          category: 'classification',
          supportsWeight: true,
          isTokenBillingRelated: false,
          metricDetailPageId: 'concepts_metrics',
        },
        {
          id: 'latency',
          displayName: 'Latency',
          shortDescription:
            'Measures end-to-end response time for model inferences.',
          category: 'latency',
          supportsWeight: true,
          isTokenBillingRelated: false,
          metricDetailPageId: 'concepts_metrics',
        },
      ],
      navigation_links: [
        {
          id: 'nav_header_home',
          text: 'Home',
          url: 'index.html',
          description: 'Documentation homepage',
          location: 'header',
          order: 1,
          targetPageId: 'getting_started',
        },
        {
          id: 'nav_header_getting_started',
          text: 'Getting started',
          url: 'getting_started.html',
          description: 'Introductory guides and quickstarts',
          location: 'header',
          order: 2,
          targetPageId: 'getting_started',
        },
        {
          id: 'nav_header_api_reference',
          text: 'API Reference',
          url: 'api_reference.html',
          description: 'REST API endpoints and reference details',
          location: 'header',
          order: 3,
          targetPageId: 'api_reference',
        },
      ],
      search_index_entries: [
        {
          id: 'search_runbatchevaluation_js_sdk',
          term: 'runBatchEvaluation',
          docPageId: 'sdk_js_batch_evaluation',
          sectionType: 'javascript_sdk',
          snippet:
            'Use the runBatchEvaluation helper from the JavaScript SDK to submit batch evaluations with configurable concurrency.',
        },
        {
          id: 'search_js_sdk_batch_evaluations',
          term: 'JavaScript SDK batch evaluations',
          docPageId: 'sdk_js_batch_evaluation',
          sectionType: 'javascript_sdk',
          snippet:
            'This section shows how to run batch evaluations from Node.js using the JavaScript SDK.',
        },
        {
          id: 'search_create_batch_evaluation_endpoint',
          term: 'Create batch evaluation',
          docPageId: 'api_evaluations_create_batch',
          sectionType: 'api_reference',
          snippet:
            'The Create batch evaluation run endpoint lets you submit a dataset for asynchronous evaluation.',
        },
      ],
      api_examples: [
        {
          id: 'api_example_eval_batch_v1_curl_request',
          apiEndpointId: 'eval_create_batch_v1',
          language: 'curl',
          exampleType: 'request',
          code:
            `curl https://api.aievaldocs.com/v1/projects/{project_id}/evaluations:batch \\\n  -H "Authorization: Bearer $AIEVAL_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "dataset_id": "ds_batch_eval_demo",\n    "display_name": "batch_run_01",\n    "config": {\n      "task_type": "text_generation",\n      "model": "gpt-4.1-mini",\n      "metrics": ["accuracy", "latency"],\n      "max_samples": 100\n    }\n  }'`,
          isEditable: true,
          hasCopyButton: true,
        },
        {
          id: 'api_example_eval_batch_v1_json_response',
          apiEndpointId: 'eval_create_batch_v1',
          language: 'json',
          exampleType: 'response',
          code:
            '{\n  "id": "eval_batch_001",\n  "project_id": "proj_123",\n  "status": "running",\n  "dataset_id": "ds_batch_eval_demo",\n  "created_at": "2026-02-28T12:34:56Z",\n  "config": {\n    "task_type": "text_generation",\n    "model": "gpt-4.1-mini",\n    "metrics": ["accuracy", "latency"],\n    "max_samples": 100\n  }\n}',
          isEditable: false,
          hasCopyButton: true,
        },
        {
          id: 'api_example_eval_batch_v2_curl_request',
          apiEndpointId: 'eval_create_batch_v2',
          language: 'curl',
          exampleType: 'request',
          code:
            `curl https://api.aievaldocs.com/v2/projects/{project_id}/evaluations:batch \\\n  -H "Authorization: Bearer $AIEVAL_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "dataset_id": "ds_v2_large_bleu_mt",\n    "display_name": "mt_en_de_bleu_v2_run",\n    "config": {\n      "task_type": "text_generation",\n      "model": "gpt-4.1-mini",\n      "metrics": ["bleu"],\n      "max_samples": 1000\n    }\n  }'`,
          isEditable: true,
          hasCopyButton: true,
        },
      ],
      code_snippets: [
        {
          id: 'code_qs_tc_python_main',
          docPageId: 'quickstart_text_classification',
          sectionId: 'run_first_evaluation',
          language: 'python',
          snippetType: 'quickstart_evaluation',
          code:
            'import os\nfrom aieval import EvaluationClient\n\nclient = EvaluationClient(api_key=os.environ.get("AIEVAL_API_KEY"))\n\nconfig = {\n    "project_id": "proj_123",\n    "dataset_id": "ds_tc_reviews_small",\n    "task_type": "text_classification",\n    "model": "gpt-4.1",\n    "metrics": ["accuracy"],\n    "max_samples": 100,\n}\n\nrun = client.create_batch_evaluation(config)\nprint("Created evaluation run:", run["id"])',
          relatedEntityId: 'ex_tc_accuracy_f1_200',
          hasCopyButton: true,
          isEditable: true,
        },
        {
          id: 'code_qs_tc_curl_batch',
          docPageId: 'quickstart_text_classification',
          sectionId: 'run_first_evaluation_curl',
          language: 'curl',
          snippetType: 'quickstart_evaluation',
          code:
            `curl https://api.aievaldocs.com/v1/projects/proj_123/evaluations:batch \\\n  -H "Authorization: Bearer $AIEVAL_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "dataset_id": "ds_tc_reviews_small",\n    "task_type": "text_classification",\n    "model": "gpt-4.1",\n    "metrics": ["accuracy"],\n    "max_samples": 100\n  }'`,
          relatedEntityId: 'accuracy',
          hasCopyButton: true,
          isEditable: false,
        },
        {
          id: 'code_metric_cost_config_json',
          docPageId: 'metric_cost',
          sectionId: 'configuration_example',
          language: 'json',
          snippetType: 'metric_config',
          code:
            '{\n  "metric": "cost",\n  "price_per_1k_tokens": 0.0015,\n  "currency": "USD",\n  "unit": "tokens",\n  "billing_mode": "token_based"\n}',
          relatedEntityId: 'cost',
          hasCopyButton: true,
          isEditable: true,
        },
      ],
      evaluation_config_snippets: [
        {
          id: 'eval_cfg_qs_tc_python_main',
          codeSnippetId: 'code_qs_tc_python_main',
          format: 'python',
          taskType: 'text_classification',
          metrics: ['accuracy'],
          maxSamples: 100,
          modelId: 'gpt-4.1',
          isQuickstartDefault: true,
        },
        {
          id: 'eval_cfg_qs_js_batch_fetch',
          codeSnippetId: 'code_qs_js_batch_fetch',
          format: 'javascript',
          taskType: 'text_generation',
          metrics: ['accuracy', 'latency'],
          maxSamples: 100,
          modelId: 'gpt-4.1-mini',
          isQuickstartDefault: true,
        },
        {
          id: 'eval_cfg_config_builder_output',
          codeSnippetId: 'code_config_builder_output_json',
          format: 'json',
          taskType: 'text_generation',
          metrics: ['accuracy', 'latency'],
          maxSamples: 50,
          modelId: 'candidate_a',
          isQuickstartDefault: false,
        },
      ],
      sdk_methods: [
        {
          id: 'sdk_js_runBatchEvaluation',
          sdkName: 'javascript_sdk',
          methodName: 'runBatchEvaluation',
          description:
            'Helper function in the JavaScript SDK that submits a batch evaluation for a dataset with configurable options such as concurrency.',
          docPageId: 'sdk_js_batch_evaluation',
          exampleSnippetId: 'code_sdk_js_run_batch_evaluation',
        },
        {
          id: 'sdk_js_EvaluationClient',
          sdkName: 'javascript_sdk',
          methodName: 'EvaluationClient',
          description:
            'Main JavaScript SDK client used to authenticate and send evaluation requests to the API.',
          docPageId: 'sdk_javascript',
          exampleSnippetId: 'code_sdk_js_init_client',
        },
        {
          id: 'sdk_py_create_batch_evaluation',
          sdkName: 'python_sdk',
          methodName: 'create_batch_evaluation',
          description:
            'Python SDK method on EvaluationClient that creates a new batch evaluation run using the provided configuration dictionary.',
          docPageId: 'quickstart_text_classification',
          exampleSnippetId: 'code_qs_tc_python_main',
        },
      ],
    };

    // Persist generated data into localStorage using storage keys
    const set = (key, value) => {
      localStorage.setItem(key, JSON.stringify(value));
    };

    set('api_groups', generatedData.api_groups || []);
    set('projects', generatedData.projects || []);
    set('site_settings', generatedData.site_settings || []);
    set('datasets', generatedData.datasets || []);
    set('docs_versions', generatedData.docs_versions || []);
    set('sidebar_items', generatedData.sidebar_items || []);
    set('doc_pages', generatedData.doc_pages || []);
    set('api_endpoints', generatedData.api_endpoints || []);
    set('evaluation_examples', generatedData.evaluation_examples || []);
    set('metrics', generatedData.metrics || []);
    set('navigation_links', generatedData.navigation_links || []);
    set('search_index_entries', generatedData.search_index_entries || []);
    set('api_examples', generatedData.api_examples || []);
    set('code_snippets', generatedData.code_snippets || []);
    set('evaluation_config_snippets', generatedData.evaluation_config_snippets || []);
    set('sdk_methods', generatedData.sdk_methods || []);
    // Other collections will have been initialized by _initStorage
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CreatePythonQuickstartEvaluationWithAccuracyAndF1();
    this.testTask2_BuildCurlCommandForBatchEvaluationWithLimitAndCursor();
    this.testTask3_SelectCostMetricAndCopyJsonConfig();
    this.testTask4_ConfigureComparisonEvaluationWithConfigBuilder();
    this.testTask5_FindJsSdkBatchEvaluationAndSetConcurrency();
    this.testTask6_FindBleuExampleAndCopyEndpointPath();
    this.testTask7_SwitchDocsToV2AndCopyDatasetCreationCurl();
    this.testTask8_RunPlaygroundEvaluationWithWeightedMetrics();

    return this.results;
  }

  // Task 1: Python quickstart evaluation with accuracy+F1, max_samples=200, model=gpt-4.1-mini
  testTask1_CreatePythonQuickstartEvaluationWithAccuracyAndF1() {
    const testName =
      'Task 1: Configure Python text classification quickstart with accuracy+F1 and 200 samples';
    console.log('Testing:', testName);

    try {
      // 1) Docs home overview
      const homeOverview = this.logic.getDocsHomeOverview();
      this.assert(!!homeOverview, 'Home overview response should exist');
      this.assert(
        !!homeOverview.siteSettings,
        'Home overview should contain siteSettings'
      );

      // 2) Navigate to Getting started
      const gettingStarted = this.logic.getGettingStartedPageContent();
      this.assert(
        !!gettingStarted && !!gettingStarted.docPage,
        'Getting started page content should be returned'
      );

      // 3) From sidebar, find Text classification quickstart
      const sidebarItems = gettingStarted.sidebarItems || [];
      const textClassQuickstartItem = sidebarItems.find((item) => {
        return (
          typeof item.text === 'string' &&
          item.text.toLowerCase().indexOf('text classification') !== -1
        );
      });
      this.assert(
        !!textClassQuickstartItem,
        'Sidebar should contain a Text classification quickstart link'
      );
      const quickstartPageId = textClassQuickstartItem.targetPageId;
      this.assert(
        !!quickstartPageId,
        'Quickstart sidebar item should have a target page id'
      );

      // 4) Load Quickstart: Text classification page
      const quickstartPage = this.logic.getQuickstartTextClassificationPage();
      this.assert(
        !!quickstartPage && !!quickstartPage.docPage,
        'Quickstart text classification page should be returned'
      );

      // 5) Select Python language tab
      const languageTabs = quickstartPage.languageTabs || [];
      const pythonTab = languageTabs.find((tab) => tab.language === 'python');
      this.assert(!!pythonTab, 'Python language tab should be available');
      const pythonSnippetId = pythonTab.codeSnippetId;
      this.assert(
        !!pythonSnippetId,
        'Python language tab should reference a code snippet id'
      );

      // 6) Locate the Python code snippet and its structured config
      const quickstartSnippets = quickstartPage.codeSnippets || [];
      const pythonSnippet = quickstartSnippets.find(
        (snip) => snip.id === pythonSnippetId
      );
      this.assert(!!pythonSnippet, 'Python quickstart code snippet should exist');

      const evalConfigs = quickstartPage.evaluationConfigSnippets || [];
      const pythonEvalConfig = evalConfigs.find(
        (cfg) => cfg.codeSnippetId === pythonSnippetId
      );
      this.assert(
        !!pythonEvalConfig,
        'EvaluationConfigSnippet for Python quickstart should exist'
      );

      // 7) Configure evaluation: metrics=[accuracy, f1], maxSamples=200, model=gpt-4.1-mini
      const desiredMetrics = ['accuracy', 'f1'];
      const desiredMaxSamples = 200;
      const desiredModelId = 'gpt-4.1-mini';

      const configResult = this.logic.configureQuickstartEvaluation(
        pythonSnippetId,
        desiredMetrics,
        desiredMaxSamples,
        desiredModelId
      );

      this.assert(
        !!configResult && !!configResult.updatedCodeSnippet,
        'configureQuickstartEvaluation should return updatedCodeSnippet'
      );
      this.assert(
        !!configResult.updatedEvaluationConfigSnippet,
        'configureQuickstartEvaluation should return updatedEvaluationConfigSnippet'
      );

      const updatedConfig = configResult.updatedEvaluationConfigSnippet;

      // Validate that the structured config reflects the values we passed in
      this.assert(
        Array.isArray(updatedConfig.metrics) &&
          updatedConfig.metrics.length === desiredMetrics.length,
        'Updated metrics length should match input metrics length'
      );
      this.assert(
        updatedConfig.metrics[0] === desiredMetrics[0] &&
          updatedConfig.metrics[1] === desiredMetrics[1],
        'Updated metrics should match input metrics order'
      );
      this.assert(
        updatedConfig.maxSamples === desiredMaxSamples,
        'Updated maxSamples should match input value'
      );
      this.assert(
        updatedConfig.modelId === desiredModelId,
        'Updated modelId should match input model id'
      );
      this.assert(
        updatedConfig.taskType === pythonEvalConfig.taskType,
        'Task type should remain the same as original'
      );

      // 8) Copy updated Python script via copyCodeSnippet
      const copyResult = this.logic.copyCodeSnippet(
        configResult.updatedCodeSnippet.id
      );
      this.assert(
        !!copyResult && copyResult.success === true,
        'copyCodeSnippet should indicate success'
      );
      this.assert(
        typeof copyResult.code === 'string' && copyResult.code.length > 0,
        'Copied Python code should be non-empty'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Build curl command for batch evaluation endpoint with limit=50 and cursor="cursor_abc"
  testTask2_BuildCurlCommandForBatchEvaluationWithLimitAndCursor() {
    const testName =
      'Task 2: Configure batch evaluation curl example with project, limit, and cursor';
    console.log('Testing:', testName);

    try {
      // 1) API Reference overview (from navigation)
      const apiOverview = this.logic.getApiReferenceOverview();
      this.assert(!!apiOverview && !!apiOverview.docPage, 'API overview should exist');
      const currentVersionId = apiOverview.currentDocsVersionId;
      this.assert(
        !!currentVersionId,
        'API overview should indicate current docs version'
      );

      // 2) API sidebar data
      const sidebarData = this.logic.getApiReferenceSidebarData();
      this.assert(Array.isArray(sidebarData), 'API sidebar data should be an array');

      // Find Evaluations group
      const evalGroupEntry = sidebarData.find((entry) => {
        return (
          entry &&
          entry.group &&
          typeof entry.group.name === 'string' &&
          entry.group.name.toLowerCase().indexOf('evaluation') !== -1
        );
      });
      this.assert(
        !!evalGroupEntry,
        'API sidebar should contain an Evaluations group'
      );

      // Within Evaluations, find Create batch evaluation endpoint for current version
      const evalEndpoints = evalGroupEntry.endpoints || [];
      const batchEndpoint = evalEndpoints.find((ep) => {
        return (
          ep &&
          typeof ep.name === 'string' &&
          ep.name.toLowerCase().indexOf('create batch') !== -1 &&
          (!currentVersionId || ep.apiVersion === currentVersionId)
        );
      });
      this.assert(
        !!batchEndpoint,
        'Evaluations group should include a Create batch evaluation endpoint'
      );

      const batchDocPageId = batchEndpoint.docPageId;
      this.assert(
        !!batchDocPageId,
        'Batch endpoint should reference a documentation page id'
      );

      // 3) Load endpoint page details
      const endpointDetails = this.logic.getApiEndpointPageDetails(batchDocPageId);
      this.assert(
        !!endpointDetails && !!endpointDetails.apiEndpoint,
        'Endpoint details should be returned for batch evaluation'
      );

      const examples = endpointDetails.examples || [];
      const curlExample = examples.find(
        (ex) => ex.language === 'curl' && ex.exampleType === 'request'
      );
      this.assert(
        !!curlExample,
        'Endpoint page should expose a curl request example'
      );

      // 4) Configure curl example with project_id, limit, and cursor
      const projectIdToUse = 'proj_123';
      const limitToUse = 50;
      const cursorToUse = 'cursor_abc';

      const updatedCurlResult = this.logic.configureBatchEvaluationCurlExample(
        curlExample.id,
        projectIdToUse,
        limitToUse,
        cursorToUse
      );

      this.assert(
        !!updatedCurlResult && !!updatedCurlResult.updatedApiExample,
        'configureBatchEvaluationCurlExample should return updatedApiExample'
      );

      const updatedCurl = updatedCurlResult.updatedApiExample;
      this.assert(
        updatedCurl.language === 'curl',
        'Updated API example should still be curl'
      );
      this.assert(
        typeof updatedCurl.code === 'string' && updatedCurl.code.length > 0,
        'Updated curl code should be non-empty'
      );

      // Validate that the updated code includes the parameters we passed in
      this.assert(
        updatedCurl.code.indexOf(projectIdToUse) !== -1,
        'Updated curl code should include the concrete project id used in configuration'
      );
      this.assert(
        updatedCurl.code.indexOf('limit=' + String(limitToUse)) !== -1,
        'Updated curl code should include the limit query parameter that was configured'
      );
      this.assert(
        updatedCurl.code.indexOf('cursor=' + cursorToUse) !== -1,
        'Updated curl code should include the cursor query parameter that was configured'
      );

      // 5) Copy final curl command
      const copyResult = this.logic.copyApiExample(updatedCurl.id);
      this.assert(
        !!copyResult && copyResult.success === true,
        'copyApiExample should indicate success'
      );
      this.assert(
        typeof copyResult.code === 'string' && copyResult.code.length > 0,
        'Copied curl command should be non-empty'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Select cost metric (token-based billing) and copy JSON configuration
  testTask3_SelectCostMetricAndCopyJsonConfig() {
    const testName =
      'Task 3: Configure cost metric JSON example with price_per_1k_tokens and copy it';
    console.log('Testing:', testName);

    try {
      // 1) Concepts overview page (navigation step)
      const conceptsOverview = this.logic.getConceptsOverviewPage();
      this.assert(
        !!conceptsOverview && !!conceptsOverview.docPage,
        'Concepts overview page should be available'
      );

      // 2) Metrics overview page
      const metricsOverview = this.logic.getMetricsOverviewPage();
      this.assert(
        !!metricsOverview && !!metricsOverview.docPage,
        'Metrics overview page should be available'
      );

      const metricsList = metricsOverview.metrics || [];
      const billingMetricIds = metricsOverview.billingMetricIds || [];

      // Determine the cost metric id from billingMetricIds or token-billing flag
      let costMetricId = null;
      if (billingMetricIds.length > 0) {
        costMetricId = billingMetricIds[0];
      } else {
        const costMetric = metricsList.find((m) => m.isTokenBillingRelated);
        if (costMetric) {
          costMetricId = costMetric.id;
        }
      }

      this.assert(
        !!costMetricId,
        'Metrics overview should expose a billing-related (cost) metric id'
      );

      // 3) Load cost metric detail page
      const metricDetail = this.logic.getMetricDetailPage(costMetricId);
      this.assert(
        !!metricDetail && !!metricDetail.metric,
        'Metric detail should be returned for the cost metric'
      );

      const configSnippets = metricDetail.configSnippets || [];
      const jsonConfigSnippet = configSnippets.find((snip) => snip.language === 'json');
      const selectedSnippet =
        jsonConfigSnippet || configSnippets[0] || null;

      this.assert(
        !!selectedSnippet,
        'Cost metric detail page should expose at least one configuration snippet'
      );

      // 4) Configure JSON example via configureCostMetricJsonConfig
      const pricePer1k = 0.002;
      const currency = 'USD';
      const unit = 'tokens';

      const updatedResult = this.logic.configureCostMetricJsonConfig(
        selectedSnippet.id,
        pricePer1k,
        currency,
        unit
      );

      this.assert(
        !!updatedResult && !!updatedResult.updatedCodeSnippet,
        'configureCostMetricJsonConfig should return updatedCodeSnippet'
      );

      const updatedSnippet = updatedResult.updatedCodeSnippet;
      this.assert(
        updatedSnippet.language === 'json',
        'Updated cost metric config snippet should be JSON'
      );
      this.assert(
        typeof updatedSnippet.code === 'string' &&
          updatedSnippet.code.length > 0,
        'Updated cost metric JSON code should be non-empty'
      );

      // Verify that the JSON example reflects the configuration values supplied
      this.assert(
        updatedSnippet.code.indexOf(String(pricePer1k)) !== -1,
        'Updated JSON should include the configured price_per_1k_tokens value'
      );
      this.assert(
        updatedSnippet.code.indexOf(currency) !== -1,
        'Updated JSON should include the configured currency value'
      );
      this.assert(
        updatedSnippet.code.indexOf(unit) !== -1,
        'Updated JSON should include the configured unit value'
      );

      // 5) Copy JSON configuration
      const copyResult = this.logic.copyCodeSnippet(updatedSnippet.id);
      this.assert(
        !!copyResult && copyResult.success === true,
        'copyCodeSnippet for cost metric JSON should indicate success'
      );
      this.assert(
        typeof copyResult.code === 'string' && copyResult.code.length > 0,
        'Copied cost metric JSON configuration should be non-empty'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Configure a comparison evaluation with two candidates and a baseline using the config builder
  testTask4_ConfigureComparisonEvaluationWithConfigBuilder() {
    const testName =
      'Task 4: Use Config Builder to configure comparison evaluation and generate config';
    console.log('Testing:', testName);

    try {
      // 1) Guides overview page (navigation step)
      const guidesOverview = this.logic.getGuidesOverviewPage();
      this.assert(
        !!guidesOverview && !!guidesOverview.docPage,
        'Guides overview page should be available'
      );

      // 2) Initial Config Builder state
      const builderStateResponse = this.logic.getConfigBuilderState();
      this.assert(
        !!builderStateResponse && !!builderStateResponse.configBuilderState,
        'Initial Config Builder state should be returned'
      );

      // 3) Set task type to text_generation
      const taskTypeToUse = 'text_generation';
      const updatedTaskState = this.logic.updateConfigBuilderTaskType(taskTypeToUse);
      this.assert(
        !!updatedTaskState && !!updatedTaskState.configBuilderState,
        'updateConfigBuilderTaskType should return updated ConfigBuilderState'
      );
      this.assert(
        updatedTaskState.configBuilderState.taskType === taskTypeToUse,
        'Config Builder task type should match the value that was set'
      );

      // 4) Configure candidate and baseline models with temperatures
      const modelsConfig = [
        { modelId: 'candidate_a', role: 'candidate', temperature: 0.2 },
        { modelId: 'candidate_b', role: 'candidate', temperature: 0.7 },
        { modelId: 'baseline_v1', role: 'baseline', temperature: 0.0 },
      ];

      const modelVariantsResp = this.logic.setConfigBuilderModels(modelsConfig);
      this.assert(
        !!modelVariantsResp && Array.isArray(modelVariantsResp.modelVariants),
        'setConfigBuilderModels should return an array of ModelVariants'
      );

      const modelVariants = modelVariantsResp.modelVariants;
      const candidateCount = modelVariants.filter(
        (v) => v.role === 'candidate'
      ).length;
      const baselineCount = modelVariants.filter(
        (v) => v.role === 'baseline'
      ).length;

      this.assert(
        candidateCount >= 2,
        'Config Builder should contain at least two candidate variants after configuration'
      );
      this.assert(
        baselineCount >= 1,
        'Config Builder should contain at least one baseline variant after configuration'
      );

      // Ensure that the variants reflect the passed-in temperatures for the specific model ids
      const candidateA = modelVariants.find((v) => v.modelId === 'candidate_a');
      const candidateB = modelVariants.find((v) => v.modelId === 'candidate_b');
      const baseline = modelVariants.find((v) => v.modelId === 'baseline_v1');

      this.assert(
        !!candidateA && candidateA.temperature === 0.2,
        'candidate_a should have the configured temperature value'
      );
      this.assert(
        !!candidateB && candidateB.temperature === 0.7,
        'candidate_b should have the configured temperature value'
      );
      this.assert(
        !!baseline && baseline.temperature === 0.0,
        'baseline_v1 should have the configured temperature value'
      );

      // 5) Update evaluation-wide settings: max_samples=50, metrics=[accuracy, latency]
      const metricsToUse = ['accuracy', 'latency'];
      const maxSamplesToUse = 50;

      const updatedEvalSettings =
        this.logic.updateConfigBuilderEvaluationSettings(
          maxSamplesToUse,
          metricsToUse
        );

      this.assert(
        !!updatedEvalSettings && !!updatedEvalSettings.configBuilderState,
        'updateConfigBuilderEvaluationSettings should return updated ConfigBuilderState'
      );

      const updatedState = updatedEvalSettings.configBuilderState;
      this.assert(
        updatedState.maxSamples === maxSamplesToUse,
        'Config Builder maxSamples should match the value that was configured'
      );
      this.assert(
        Array.isArray(updatedState.selectedMetricIds),
        'Config Builder should track selected metric ids as an array'
      );
      this.assert(
        updatedState.selectedMetricIds.indexOf(metricsToUse[0]) !== -1 &&
          updatedState.selectedMetricIds.indexOf(metricsToUse[1]) !== -1,
        'Config Builder should include the metrics that were selected'
      );

      // 6) Generate configuration from builder
      const generatedResult = this.logic.generateConfigFromBuilder();
      this.assert(
        !!generatedResult && !!generatedResult.generatedConfigSnippet,
        'generateConfigFromBuilder should return a generatedConfigSnippet'
      );

      const generatedSnippet = generatedResult.generatedConfigSnippet;
      this.assert(
        typeof generatedSnippet.code === 'string' &&
          generatedSnippet.code.length > 0,
        'Generated config code should be non-empty'
      );

      // 7) Copy generated configuration
      const copyResult = this.logic.copyCodeSnippet(generatedSnippet.id);
      this.assert(
        !!copyResult && copyResult.success === true,
        'copyCodeSnippet for generated config should indicate success'
      );
      this.assert(
        typeof copyResult.code === 'string' && copyResult.code.length > 0,
        'Copied generated configuration should be non-empty'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Find JS SDK batch evaluation example and set concurrency to 10
  testTask5_FindJsSdkBatchEvaluationAndSetConcurrency() {
    const testName =
      'Task 5: Configure JavaScript runBatchEvaluation example with concurrency=10';
    console.log('Testing:', testName);

    try {
      const searchQuery = 'runBatchEvaluation';

      // 1) Execute docs search
      const searchResult = this.logic.searchDocs(searchQuery);
      this.assert(
        !!searchResult && Array.isArray(searchResult.results),
        'searchDocs should return a results array'
      );
      this.assert(
        searchResult.query === searchQuery,
        'searchDocs should echo back the original search query'
      );

      // 2) Pick a JavaScript SDK search result
      const jsResult = searchResult.results.find(
        (r) => r.sectionType === 'javascript_sdk'
      );
      this.assert(
        !!jsResult,
        'Search results should contain a JavaScript SDK entry for runBatchEvaluation'
      );

      const jsDocPageId = jsResult.docPageId;
      this.assert(
        !!jsDocPageId,
        'JavaScript SDK search result should reference a doc page id'
      );

      // 3) Load JavaScript SDK page
      const jsSdkPage = this.logic.getJavascriptSdkPage();
      this.assert(
        !!jsSdkPage && !!jsSdkPage.docPage,
        'JavaScript SDK page should be available'
      );

      // 4) Locate runBatchEvaluation method and its example snippet
      const sdkMethods = jsSdkPage.sdkMethods || [];
      const runBatchMethod = sdkMethods.find(
        (m) => m.methodName === 'runBatchEvaluation'
      );
      this.assert(
        !!runBatchMethod,
        'JavaScript SDK methods should include runBatchEvaluation'
      );

      const exampleSnippetId = runBatchMethod.exampleSnippetId;
      this.assert(
        !!exampleSnippetId,
        'runBatchEvaluation method should reference an example snippet id'
      );

      const codeSnippets = jsSdkPage.codeSnippets || [];
      const jsExampleSnippet = codeSnippets.find(
        (snip) => snip.id === exampleSnippetId
      );
      this.assert(
        !!jsExampleSnippet,
        'JavaScript SDK page should expose the runBatchEvaluation example snippet'
      );

      // 5) Configure concurrency=10 using configureRunBatchEvaluationExample
      const concurrencyToUse = 10;
      const updatedResult = this.logic.configureRunBatchEvaluationExample(
        jsExampleSnippet.id,
        concurrencyToUse
      );

      this.assert(
        !!updatedResult && !!updatedResult.updatedCodeSnippet,
        'configureRunBatchEvaluationExample should return updatedCodeSnippet'
      );

      const updatedSnippet = updatedResult.updatedCodeSnippet;
      this.assert(
        updatedSnippet.language === 'javascript',
        'Updated runBatchEvaluation snippet should be JavaScript'
      );
      this.assert(
        typeof updatedSnippet.code === 'string' &&
          updatedSnippet.code.length > 0,
        'Updated runBatchEvaluation code should be non-empty'
      );

      // Validate that concurrency value from input is reflected in code (loosely)
      this.assert(
        updatedSnippet.code.indexOf('10') !== -1,
        'Updated JavaScript snippet should contain the configured concurrency value'
      );

      // 6) Copy updated JavaScript snippet
      const copyResult = this.logic.copyCodeSnippet(updatedSnippet.id);
      this.assert(
        !!copyResult && copyResult.success === true,
        'copyCodeSnippet for runBatchEvaluation should indicate success'
      );
      this.assert(
        typeof copyResult.code === 'string' && copyResult.code.length > 0,
        'Copied runBatchEvaluation example should be non-empty'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Locate BLEU-based evaluation example with at least 1000 samples and copy endpoint path
  testTask6_FindBleuExampleAndCopyEndpointPath() {
    const testName =
      'Task 6: Filter examples gallery for BLEU metric and copy example endpoint path';
    console.log('Testing:', testName);

    try {
      // 1) Load Examples gallery page
      const galleryPage = this.logic.getExamplesGalleryPage();
      this.assert(
        !!galleryPage && !!galleryPage.docPage,
        'Examples gallery page should be available'
      );

      const availableMetrics = galleryPage.availableMetrics || [];

      // 2) Find BLEU metric in the gallery's metric list
      let bleuMetric = availableMetrics.find(
        (m) => m.id === 'bleu'
      );
      if (!bleuMetric) {
        bleuMetric = availableMetrics.find((m) => {
          return (
            m.displayName &&
            typeof m.displayName === 'string' &&
            m.displayName.toLowerCase().indexOf('bleu') !== -1
          );
        });
      }

      // If BLEU is not present for some reason, fall back to the first available metric
      const metricIdToUse = bleuMetric
        ? bleuMetric.id
        : availableMetrics[0] && availableMetrics[0].id;

      this.assert(
        !!metricIdToUse,
        'Examples gallery should expose at least one metric to filter by'
      );

      // 3) Apply filters: metric=metricIdToUse, minDatasetSize=1000
      const minSize = 1000;
      const filterUpdate = this.logic.updateExamplesGalleryFilters(
        metricIdToUse,
        minSize
      );

      this.assert(
        !!filterUpdate && !!filterUpdate.filterState,
        'updateExamplesGalleryFilters should return updated filterState'
      );
      this.assert(
        filterUpdate.filterState.selectedMetricId === metricIdToUse,
        'Filter state should use the selected metric id'
      );
      this.assert(
        filterUpdate.filterState.minDatasetSize === minSize,
        'Filter state should use the configured minimum dataset size'
      );

      // 4) Retrieve filtered examples
      const filteredExamples = this.logic.getFilteredEvaluationExamples();
      this.assert(
        Array.isArray(filteredExamples) && filteredExamples.length > 0,
        'Filtered examples list should contain at least one example after applying filters'
      );

      // Select third matching example if it exists; otherwise fall back to the first
      const indexToSelect = filteredExamples[2] ? 2 : 0;
      const selectedExample = filteredExamples[indexToSelect];
      this.assert(
        !!selectedExample && !!selectedExample.id,
        'A matching evaluation example should be selectable from the filtered list'
      );

      // 5) Load example detail (for completeness)
      const detail = this.logic.getEvaluationExampleDetail(
        selectedExample.id
      );
      this.assert(
        !!detail && !!detail.evaluationExample,
        'Evaluation example detail view should be available'
      );

      const endpointPathFromDetail = detail.evaluationExample.endpointPath;
      this.assert(
        typeof endpointPathFromDetail === 'string' &&
          endpointPathFromDetail.length > 0,
        'Example detail should include a non-empty REST API endpoint path'
      );

      // 6) Copy endpoint path using dedicated helper
      const copyResult = this.logic.copyEvaluationExampleEndpointPath(
        selectedExample.id
      );
      this.assert(
        !!copyResult && copyResult.success === true,
        'copyEvaluationExampleEndpointPath should indicate success'
      );
      this.assert(
        typeof copyResult.endpointPath === 'string' &&
          copyResult.endpointPath.length > 0,
        'Copied endpoint path should be non-empty'
      );

      // Validate consistency between detail view and copy helper
      this.assert(
        copyResult.endpointPath === endpointPathFromDetail,
        'Copied endpoint path should match endpoint path from example detail'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Switch docs to API version v2 and copy dataset creation endpoint curl example
  testTask7_SwitchDocsToV2AndCopyDatasetCreationCurl() {
    const testName =
      'Task 7: Switch docs to v2 and copy dataset creation curl example';
    console.log('Testing:', testName);

    try {
      // 1) Home overview with current docs version
      const homeOverview = this.logic.getDocsHomeOverview();
      this.assert(
        !!homeOverview && !!homeOverview.siteSettings,
        'Docs home overview should include siteSettings'
      );

      const initialVersionId = homeOverview.siteSettings.currentDocsVersionId;
      this.assert(
        !!initialVersionId,
        'Current docs version id should be specified before switching'
      );

      // 2) Switch docs version to v2
      const targetVersionId = 'v2';
      const switchResult = this.logic.switchDocsVersion(targetVersionId);

      this.assert(
        !!switchResult && switchResult.currentDocsVersionId === targetVersionId,
        'switchDocsVersion should update the current docs version to v2'
      );

      // 3) API Reference overview for new version
      const apiOverview = this.logic.getApiReferenceOverview();
      this.assert(
        !!apiOverview && apiOverview.currentDocsVersionId === targetVersionId,
        'API overview should reflect the updated docs version'
      );

      // 4) API sidebar for v2
      const sidebarData = this.logic.getApiReferenceSidebarData();
      this.assert(Array.isArray(sidebarData), 'API sidebar data should be an array');

      // Find Datasets group
      const datasetsGroupEntry = sidebarData.find((entry) => {
        return (
          entry &&
          entry.group &&
          typeof entry.group.name === 'string' &&
          entry.group.name.toLowerCase().indexOf('dataset') !== -1
        );
      });

      this.assert(
        !!datasetsGroupEntry,
        'API sidebar should include a Datasets group for v2'
      );

      // Within Datasets, locate the v2 Create dataset endpoint
      const datasetsEndpoints = datasetsGroupEntry.endpoints || [];
      const createDatasetEndpoint = datasetsEndpoints.find((ep) => {
        return (
          ep &&
          typeof ep.name === 'string' &&
          ep.name.toLowerCase().indexOf('create dataset') !== -1 &&
          ep.apiVersion === targetVersionId
        );
      });

      this.assert(
        !!createDatasetEndpoint,
        'Datasets group should expose a v2 Create dataset endpoint'
      );

      const datasetDocPageId = createDatasetEndpoint.docPageId;
      this.assert(
        !!datasetDocPageId,
        'Create dataset endpoint should reference an API doc page id'
      );

      // 5) Load v2 Create dataset endpoint page
      const endpointDetails = this.logic.getApiEndpointPageDetails(
        datasetDocPageId
      );
      this.assert(
        !!endpointDetails && !!endpointDetails.apiEndpoint,
        'Create dataset endpoint details should be available for v2'
      );

      const examples = endpointDetails.examples || [];
      const curlExample = examples.find(
        (ex) => ex.language === 'curl' && ex.exampleType === 'request'
      );
      this.assert(
        !!curlExample,
        'Create dataset endpoint should expose a curl request example'
      );

      this.assert(
        typeof curlExample.code === 'string' && curlExample.code.length > 0,
        'v2 dataset creation curl example should be non-empty before copying'
      );

      // Basic sanity check that the path includes /v2/
      this.assert(
        curlExample.code.indexOf('/v2/') !== -1,
        'v2 dataset creation curl example should target a v2 path'
      );

      // 6) Copy the curl example
      const copyResult = this.logic.copyApiExample(curlExample.id);
      this.assert(
        !!copyResult && copyResult.success === true,
        'copyApiExample for v2 dataset creation should indicate success'
      );
      this.assert(
        typeof copyResult.code === 'string' && copyResult.code.length > 0,
        'Copied v2 dataset creation curl command should be non-empty'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Run a playground evaluation with weighted accuracy (0.7) and latency (0.3)
  testTask8_RunPlaygroundEvaluationWithWeightedMetrics() {
    const testName =
      'Task 8: Run Playground text classification evaluation with weighted accuracy and latency';
    console.log('Testing:', testName);

    try {
      // 1) Playground page configuration
      const playgroundConfig = this.logic.getPlaygroundPageConfig();
      this.assert(
        !!playgroundConfig && !!playgroundConfig.docPage,
        'Playground page configuration should be available'
      );

      const availableTaskTypes = playgroundConfig.availableTaskTypes || [];
      const taskTypeToUse =
        availableTaskTypes.find((t) => t === 'text_classification') ||
        availableTaskTypes[0];

      this.assert(
        !!taskTypeToUse,
        'Playground should expose at least one task type to run evaluations with'
      );

      // 2) Choose metrics: accuracy and latency
      const availableMetrics = playgroundConfig.availableMetrics || [];
      const accuracyMetric = availableMetrics.find((m) => m.id === 'accuracy');
      const latencyMetric = availableMetrics.find((m) => m.id === 'latency');

      this.assert(
        !!accuracyMetric && !!latencyMetric,
        'Playground metrics should include accuracy and latency'
      );

      const metricIdsToUse = [accuracyMetric.id, latencyMetric.id];

      // 3) Build evaluation request for Playground
      const prompt = 'Classify this review as positive or negative.';
      const accuracyWeight = 0.7;
      const latencyWeight = 0.3;
      const sampleSize = 10;
      const evaluationName = 'weighted_test_01';

      // Do not explicitly set modelId to let Playground use default if it chooses
      const runResult = this.logic.createPlaygroundEvaluationRun(
        taskTypeToUse,
        prompt,
        accuracyWeight,
        latencyWeight,
        metricIdsToUse,
        sampleSize,
        evaluationName
      );

      this.assert(
        !!runResult && !!runResult.playgroundEvaluationRun,
        'createPlaygroundEvaluationRun should return a PlaygroundEvaluationRun'
      );

      const run = runResult.playgroundEvaluationRun;

      // Validate that run reflects the configuration we supplied
      this.assert(
        run.taskType === taskTypeToUse,
        'Playground run taskType should match the selected task type'
      );
      this.assert(
        run.prompt === prompt,
        'Playground run prompt should match the original prompt'
      );
      this.assert(
        run.accuracyWeight === accuracyWeight,
        'Playground run should store the configured accuracy weight'
      );
      this.assert(
        run.latencyWeight === latencyWeight,
        'Playground run should store the configured latency weight'
      );
      this.assert(
        Array.isArray(run.metricIds) && run.metricIds.length === 2,
        'Playground run should contain two metric ids'
      );
      this.assert(
        run.metricIds.indexOf(metricIdsToUse[0]) !== -1 &&
          run.metricIds.indexOf(metricIdsToUse[1]) !== -1,
        'Playground run metric ids should match the selected metrics'
      );
      this.assert(
        run.sampleSize === sampleSize,
        'Playground run sampleSize should match the configured sample size'
      );
      this.assert(
        run.evaluationName === evaluationName,
        'Playground run evaluationName should match the configured name'
      );
      this.assert(
        !!run.id,
        'Playground run should have a generated id'
      );
      this.assert(
        !!run.status,
        'Playground run should have a status field set'
      );

      // Optionally verify that the run was persisted to localStorage using its id
      const storedRunsRaw = localStorage.getItem('playground_evaluation_runs');
      if (storedRunsRaw) {
        const storedRuns = JSON.parse(storedRunsRaw || '[]');
        const storedRun = storedRuns.find((r) => r.id === run.id);
        this.assert(
          !!storedRun,
          'New Playground run should be persisted in playground_evaluation_runs storage'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Assertion helper
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
